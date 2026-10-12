-- Preverjeni igralci, faza 2: plačilo s Stripe Checkout (najprej testni način).
--
-- Funkcija `preverjen-placilo` (JWT uporabnika) ustvari sejo Checkout po
-- `preverjen_pripravi_nakup` (preveri stikalo, lastništvo profila, pravico in
-- ime na znački). Funkcija `stripe-webhook` (podpis Stripe, brez JWT) zapiše
-- dogodek v `stripe_dogodki` in kliče servisne funkcije spodaj; te edine
-- pišejo plačljive pravice (`preverjeni_racuni`) in naročila značk.
--
-- Vsak preklic letne pravice (preklic profila, anonimizacija, izbris računa,
-- admin, dodelitev drugemu, sumljivo plačilo, vračilo, spor) mora ustaviti
-- tudi naročnino v Stripe: sprožilec označi vrstico `stripe_preklic = 'caka'`,
-- webhook (ob vsakem dogodku, ob ukazu admina in vsako uro iz delovnega toka
-- *Preverjeni: preklici naročnin*) naročnino prekliče in označi 'opravljen'.
--
-- Naslovi naročil so zaprti (le admin prek RPC); 90 dni po pošiljanju ali
-- preklicu ostane le država (pg_cron).

-- --------------------------------------------------------------------------
-- Pravica: stolpci plačila
-- --------------------------------------------------------------------------
alter table public.preverjeni_racuni
  add column odpoved_pravici boolean,
  add column stripe_checkout_id text unique,
  add column stripe_payment_intent text,
  -- Znesek pravice v centih (brez značke in poštnine), za delna vračila.
  add column znesek_pravice int,
  -- 'caka': naročnino je treba preklicati v Stripe; 'opravljen': preklicana.
  add column stripe_preklic text check (stripe_preklic in ('caka', 'opravljen'));
-- Plačljiv vir zahteva tudi soglasje o takojšnji zagotovitvi (izguba pravice do odstopa).
alter table public.preverjeni_racuni
  add constraint preverjeni_racuni_odpoved check (vir = 'rocno' or odpoved_pravici is true) not valid;
create index preverjeni_racuni_narocnina on public.preverjeni_racuni (stripe_subscription_id) where stripe_subscription_id is not null;
create index preverjeni_racuni_pi on public.preverjeni_racuni (stripe_payment_intent) where stripe_payment_intent is not null;
create index preverjeni_racuni_preklic on public.preverjeni_racuni (id) where stripe_preklic = 'caka';

-- Preklicana letna pravica z naročnino → naročnino preklicati.
create or replace function public.preverjeni_oznaci_preklic()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.status = 'preklican' and new.vir = 'letna' and new.stripe_subscription_id is not null
     and new.stripe_preklic is null and (tg_op = 'INSERT' or old.status <> 'preklican') then
    new.stripe_preklic := 'caka';
  end if;
  return new;
end;
$$;
revoke all on function public.preverjeni_oznaci_preklic() from public, anon, authenticated;
create trigger preverjeni_racuni_preklic before insert or update of status on public.preverjeni_racuni
  for each row execute function public.preverjeni_oznaci_preklic();

-- --------------------------------------------------------------------------
-- Dogodki Stripe (idempotenca webhooka)
-- --------------------------------------------------------------------------
create table public.stripe_dogodki (
  id          text primary key,
  tip         text not null,
  prejeto_at  timestamptz not null default now(),
  -- Prazno: dogodek ni (do konca) obdelan; ponovitev ga obdela znova.
  obdelano_at timestamptz
);
comment on table public.stripe_dogodki is
  'Prejeti dogodki Stripe (id evt_…); z obdelano_at se ponovljen ne obdela znova. Le servis.';
alter table public.stripe_dogodki enable row level security;
revoke all on public.stripe_dogodki from anon, authenticated;
grant select, insert, update on public.stripe_dogodki to service_role;

-- --------------------------------------------------------------------------
-- Naročila natisnjenih značk
-- --------------------------------------------------------------------------
create table public.narocila_znack (
  id                   bigint generated always as identity primary key,
  preverjeni_racun_id  bigint references public.preverjeni_racuni on delete set null,
  user_id              uuid references public.profiles on delete set null,
  player_id            bigint references public.players on delete set null,
  ime_na_znacki        text not null check (char_length(ime_na_znacki) between 1 and 30),
  -- {name, line1, line2, postal_code, city, country} iz Checkout; po 90 dneh le {country}.
  naslov               jsonb not null,
  -- Ključ poštnine (postnina_si, postnina_eu).
  postnina             text,
  status               text not null default 'za_tisk' check (status in ('za_tisk', 'natisnjeno', 'poslano', 'preklicano')),
  stripe_checkout_id   text not null unique,
  created_at           timestamptz not null default now(),
  poslano_at           timestamptz,
  opomba               text check (opomba is null or char_length(opomba) <= 500)
);
comment on table public.narocila_znack is
  'Naročila natisnjene značke (le z doživljenjsko pravico). Naslovi niso javni: bere in ureja le admin prek RPC.';
alter table public.narocila_znack enable row level security;
revoke all on public.narocila_znack from anon, authenticated;

-- --------------------------------------------------------------------------
-- Pomožno
-- --------------------------------------------------------------------------
-- Discord (Vault `discord_webhook`, brez e-naslovov; napaka tiho nič).
create or replace function public.preverjeni_na_discord(p_besedilo text)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_url text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
  if v_url is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('content', left(p_besedilo, 1900), 'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  return;
end;
$$;

-- Ime na znački: 1–30 znakov, pravilo daljših besedil (`prepovedane_besede`).
create or replace function public.preverjen_ime_znacke(p_ime text)
returns text language plpgsql immutable set search_path = public
as $$
declare
  v_ime text := nullif(btrim(regexp_replace(coalesce(p_ime, ''), '\s+', ' ', 'g')), '');
  v_napaka text;
begin
  if v_ime is null or char_length(v_ime) > 30 then
    raise exception 'Ime na znački ima lahko od 1 do 30 znakov.' using hint = 'plus-znacka';
  end if;
  v_napaka := prepovedane_besede(v_ime);
  if v_napaka = 'znaki' or v_ime ~ '\n' then
    raise exception 'Besedilo vsebuje nedovoljene znake.' using hint = 'plus-znaki';
  elsif v_napaka is not null then
    raise exception 'To besedilo ni dovoljeno.' using hint = 'plus-' || v_napaka;
  end if;
  return v_ime;
end;
$$;
revoke all on function public.preverjen_ime_znacke(text) from public, anon, authenticated;

-- Ali lahko pravica uporabnika za igralca (spet) velja: potrjen profil istega
-- uporabnika, ime ni skrito, nihče drug nima aktivne pravice.
create or replace function public.preverjen_lahko_velja(p_user_id uuid, p_glavni bigint, p_razen bigint default null)
returns boolean language sql stable security definer set search_path = public
as $$
  select p_user_id is not null
     and exists (select 1 from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_glavni) and z.user_id = p_user_id)
     and not exists (select 1 from players p where p.id = p_glavni and p.anonimiziran_at is not null)
     and not exists (select 1 from preverjeni_racuni r
                      where r.player_id = p_glavni and r.status = 'aktiven' and r.id is distinct from p_razen
                        and (r.velja_do is null or r.velja_do > now()))
$$;
revoke all on function public.preverjen_lahko_velja(uuid, bigint, bigint) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Pred nakupom (kliče funkcija preverjen-placilo z JWT kupca)
-- --------------------------------------------------------------------------
create or replace function public.preverjen_pripravi_nakup(p_player_id bigint, p_ime_na_znacki text default null)
returns table (glavni bigint, liga text, stripe_customer_id text, email text, ime_na_znacki text)
language plpgsql stable security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
begin
  if auth.uid() is null then
    raise exception 'Za nakup se je treba prijaviti.';
  end if;
  if not vidi_preverjene() then
    raise exception 'Plačilo trenutno ni na voljo.';
  end if;
  select * into z from zahtevki_igralca where id = prevzem_zahtevek_igralca(p_player_id);
  if not found or z.user_id is distinct from auth.uid() then
    raise exception 'Preveriš lahko le svoj potrjen profil.';
  end if;
  if exists (select 1 from players p where p.id in (z.player_id, p_player_id) and p.anonimiziran_at is not null) then
    raise exception 'Ime tega igralca je skrito.';
  end if;
  if exists (select 1 from preverjeni_racuni r
              where r.player_id = z.player_id and r.user_id = auth.uid() and r.status = 'aktiven'
                and (r.velja_do is null or r.velja_do > now())) then
    raise exception 'Profil je že preverjen.';
  end if;
  return query
  select z.player_id, c.slug,
         (select r.stripe_customer_id from preverjeni_racuni r
           where r.user_id = auth.uid() and r.stripe_customer_id is not null
           order by r.created_at desc limit 1),
         (select u.email::text from auth.users u where u.id = auth.uid()),
         case when p_ime_na_znacki is null then null else preverjen_ime_znacke(p_ime_na_znacki) end
    from players p left join competitions c on c.id = p.competition_id
   where p.id = z.player_id;
end;
$$;
revoke all on function public.preverjen_pripravi_nakup(bigint, text) from public, anon;
grant execute on function public.preverjen_pripravi_nakup(bigint, text) to authenticated;

-- Lastnikova aktivna pravica za igralca (vir za prikaz na profilu).
create or replace function public.preverjen_moja_pravica(p_player_id bigint)
returns table (vir text, velja_do timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.vir, r.velja_do
    from zahtevki_igralca z
    join preverjeni_racuni r on r.player_id = z.player_id and r.user_id = z.user_id
   where z.id = prevzem_zahtevek_igralca(p_player_id)
     and z.user_id = auth.uid()
     and vidi_preverjene()
     and r.status = 'aktiven' and (r.velja_do is null or r.velja_do > now())
   limit 1
$$;
revoke all on function public.preverjen_moja_pravica(bigint) from public, anon;
grant execute on function public.preverjen_moja_pravica(bigint) to authenticated;

-- Kupčeve naročnine, ne glede na stikalo in profil: preklicati jih mora
-- vedno moči (portal Stripe, stran Račun).
create or replace function public.preverjen_moje_narocnine()
returns table (stripe_customer_id text, velja_do timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.stripe_customer_id, r.velja_do
    from preverjeni_racuni r
   where r.user_id = auth.uid() and r.vir = 'letna' and r.status = 'aktiven'
     and r.stripe_customer_id is not null and r.stripe_subscription_id is not null
   order by r.created_at desc
$$;
revoke all on function public.preverjen_moje_narocnine() from public, anon;
grant execute on function public.preverjen_moje_narocnine() to authenticated;

-- --------------------------------------------------------------------------
-- Servis (webhook)
-- --------------------------------------------------------------------------

-- Plačilo uspelo (checkout.session.completed): pravica in po želji naročilo
-- značke. Vrne 'aktiven', 'preklican' (profil ni več kupčev, ime skrito,
-- račun ali igralec izbrisan, dvojno plačilo: vrni denar, Discord) ali 'ze'.
create or replace function public.preverjen_iz_placila(
  p_user_id uuid, p_player_id bigint, p_vir text, p_velja_do timestamptz,
  p_customer text, p_subscription text, p_checkout text, p_payment_intent text,
  p_star_vsaj_18 boolean, p_odpoved boolean, p_znesek int default null,
  p_ime_na_znacki text default null, p_naslov jsonb default null, p_postnina text default null)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_glavni bigint := p_player_id;
  v_user uuid := p_user_id;
  v_status text := 'aktiven';
  v_razlog text;
  v_id bigint;
  v_ime text;
begin
  if p_vir not in ('letna', 'dozivljenjska') then
    raise exception 'Neznan vir plačila: %', p_vir;
  end if;
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  v_glavni := coalesce(v_glavni, p_player_id);
  -- En aktiven na igralca: hkratni dogodki istega igralca se vrstijo.
  perform pg_advisory_xact_lock(hashtext('preverjen:' || v_glavni));
  if exists (select 1 from preverjeni_racuni where stripe_checkout_id = p_checkout) then
    return 'ze';
  end if;

  if not exists (select 1 from players where id = v_glavni) then
    perform preverjeni_na_discord('⚠️ **Plačilo brez pravice** (igralec izbrisan, vrni denar v Stripe): checkout ' || p_checkout);
    return 'preklican';
  end if;
  if not exists (select 1 from profiles where id = v_user) then
    v_user := null; v_status := 'preklican'; v_razlog := 'račun kupca izbrisan';
  elsif not exists (select 1 from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id) and z.user_id = v_user) then
    v_status := 'preklican'; v_razlog := 'profil ni več potrjen pri kupcu';
  elsif exists (select 1 from players p where p.id in (v_glavni, p_player_id) and p.anonimiziran_at is not null) then
    v_status := 'preklican'; v_razlog := 'ime igralca je skrito';
  elsif exists (select 1 from preverjeni_racuni r
                 where r.player_id = v_glavni and r.user_id = v_user and r.status = 'aktiven'
                   and r.vir <> 'rocno' and (r.velja_do is null or r.velja_do > now())) then
    v_status := 'preklican'; v_razlog := 'kupec že ima plačano pravico (dvojno plačilo)';
  end if;

  if v_status = 'aktiven' then
    -- Potekla, ročna in tuja aktivna pravica mesta ne držijo več.
    update preverjeni_racuni set status = 'potekel', updated_at = now()
     where player_id = v_glavni and status = 'aktiven' and velja_do <= now();
    update preverjeni_racuni set status = 'preklican', updated_at = now()
     where player_id = v_glavni and status = 'aktiven' and (vir = 'rocno' or user_id is distinct from v_user);
  end if;

  insert into preverjeni_racuni (user_id, player_id, vir, status, velja_do, star_vsaj_18, odpoved_pravici, znesek_pravice,
                                 stripe_customer_id, stripe_subscription_id, stripe_checkout_id, stripe_payment_intent)
  values (v_user, v_glavni, p_vir, v_status, case when p_vir = 'letna' then p_velja_do end,
          p_star_vsaj_18, p_odpoved, p_znesek, p_customer, p_subscription, p_checkout, p_payment_intent)
  returning id into v_id;

  if v_status = 'aktiven' and p_vir = 'dozivljenjska' and p_naslov is not null then
    -- Ime je preverila priprava nakupa; metapodatki pridejo od zunaj, zato še enkrat.
    begin
      v_ime := preverjen_ime_znacke(p_ime_na_znacki);
    exception when others then
      v_ime := left(coalesce(nullif(btrim(p_ime_na_znacki), ''), '?'), 30);
      perform preverjeni_na_discord('⚠️ Značka: ime ni prestalo preverbe, preveri naročilo (checkout ' || p_checkout || ').');
    end;
    insert into narocila_znack (preverjeni_racun_id, user_id, player_id, ime_na_znacki, naslov, postnina, stripe_checkout_id)
    values (v_id, v_user, v_glavni, v_ime, p_naslov, p_postnina, p_checkout);
  end if;

  perform preverjeni_na_discord(
    case when v_status = 'aktiven'
      then '✅ **Preverjen igralec** (' || p_vir || case when p_naslov is not null and p_vir = 'dozivljenjska' then ' + značka' else '' end || '): '
      else '⚠️ **Plačilo brez pravice** (' || v_razlog || ', vrni denar v Stripe): '
    end
    || coalesce((select full_name from players where id = v_glavni), '?') || ' · https://slff.eu/player/' || v_glavni);
  return v_status;
end;
$$;

-- Obnova naročnine (invoice.paid, subscription.updated): rok le naprej.
-- Potekla vrstica iste naročnine oživi, če pravica spet lahko velja.
-- Vrne 'podaljsano', 'obnovljeno', 'neznano' (naročnine ne poznamo: ni naša
-- ali seja še ni obdelana) ali 'brez_pravice' (naša naročnina brez veljavne
-- pravice: webhook jo prekliče).
create or replace function public.preverjen_podaljsaj(p_subscription text, p_velja_do timestamptz)
returns text language plpgsql security definer set search_path = public
as $$
declare
  r preverjeni_racuni;
begin
  select * into r from preverjeni_racuni where stripe_subscription_id = p_subscription order by id desc limit 1;
  if not found then
    return 'neznano';
  end if;
  perform pg_advisory_xact_lock(hashtext('preverjen:' || r.player_id));
  update preverjeni_racuni
     set velja_do = greatest(coalesce(velja_do, p_velja_do), p_velja_do), updated_at = now()
   where stripe_subscription_id = p_subscription and status = 'aktiven' and vir = 'letna';
  if found then
    return 'podaljsano';
  end if;
  if r.status = 'potekel' and p_velja_do > now() and preverjen_lahko_velja(r.user_id, r.player_id, r.id) then
    update preverjeni_racuni set status = 'aktiven', velja_do = p_velja_do, updated_at = now() where id = r.id;
    return 'obnovljeno';
  end if;
  return 'brez_pravice';
end;
$$;

-- Konec naročnine (customer.subscription.deleted): pravica poteče ob koncu.
create or replace function public.preverjen_narocnina_konec(p_subscription text, p_konec timestamptz)
returns int language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  update preverjeni_racuni
     set velja_do = least(coalesce(velja_do, p_konec), p_konec),
         status = case when least(coalesce(velja_do, p_konec), p_konec) <= now() then 'potekel' else status end,
         updated_at = now()
   where stripe_subscription_id = p_subscription and status = 'aktiven';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Vrstica plačila: po payment_intent (doživljenjska) ali naročnini (letna).
create or replace function public.preverjen_vrstica_placila(p_payment_intent text, p_subscription text)
returns preverjeni_racuni language sql stable security definer set search_path = public
as $$
  select * from preverjeni_racuni
   where (p_payment_intent is not null and stripe_payment_intent = p_payment_intent)
      or (p_subscription is not null and stripe_subscription_id = p_subscription)
   order by id desc limit 1
$$;

-- Vračilo ali spor (charge.refunded, charge.dispute.created). Polno vračilo,
-- spor ali vračilo, ki seže v znesek pravice → pravica preklicana (letna:
-- naročnina se prekliče). Delno pri doživljenjski z odprtim naročilom →
-- le značka. Sicer le Discord. Vrne 'preklican', 'znacka', 'delno' ali
-- 'neznano' (ni naše plačilo).
create or replace function public.preverjen_vracilo(
  p_payment_intent text, p_subscription text, p_vrnjeno int, p_znesek int, p_spor boolean)
returns text language plpgsql security definer set search_path = public
as $$
declare
  r preverjeni_racuni;
  v_odprto boolean;
begin
  r := preverjen_vrstica_placila(p_payment_intent, p_subscription);
  if r.id is null then
    return 'neznano';
  end if;
  perform pg_advisory_xact_lock(hashtext('preverjen:' || r.player_id));
  v_odprto := exists (select 1 from narocila_znack where preverjeni_racun_id = r.id and status in ('za_tisk', 'natisnjeno'));
  if p_spor or p_vrnjeno >= p_znesek
     or (r.vir = 'dozivljenjska' and r.znesek_pravice is not null and p_znesek - p_vrnjeno < r.znesek_pravice) then
    update preverjeni_racuni set status = 'preklican', updated_at = now() where id = r.id and status = 'aktiven';
    update narocila_znack set status = 'preklicano', opomba = coalesce(opomba || ' · ', '') || case when p_spor then 'spor' else 'vračilo' end
     where preverjeni_racun_id = r.id and status in ('za_tisk', 'natisnjeno');
    perform preverjeni_na_discord('↩️ Pravica preklicana (' || case when p_spor then 'spor' else 'vračilo' end
      || case when v_odprto then ', tudi značka' else '' end || '): https://slff.eu/player/' || r.player_id);
    return 'preklican';
  end if;
  if v_odprto then
    update narocila_znack set status = 'preklicano', opomba = coalesce(opomba || ' · ', '') || 'delno vračilo'
     where preverjeni_racun_id = r.id and status in ('za_tisk', 'natisnjeno');
    perform preverjeni_na_discord('↩️ Značka preklicana (delno vračilo): https://slff.eu/player/' || r.player_id);
    return 'znacka';
  end if;
  perform preverjeni_na_discord('ℹ️ Delno vračilo (' || p_vrnjeno || ' od ' || p_znesek || ' centov), pravica ostane: https://slff.eu/player/' || r.player_id);
  return 'delno';
end;
$$;

-- Spor dobljen (charge.dispute.closed, won): pravica se vrne, če še lahko velja.
-- Vrne 'obnovljen', 'nespremenjeno', 'ne' (Discord) ali 'neznano'.
create or replace function public.preverjen_spor_dobljen(p_payment_intent text, p_subscription text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  r preverjeni_racuni;
begin
  r := preverjen_vrstica_placila(p_payment_intent, p_subscription);
  if r.id is null then
    return 'neznano';
  end if;
  perform pg_advisory_xact_lock(hashtext('preverjen:' || r.player_id));
  if r.status <> 'preklican' then
    return 'nespremenjeno';
  end if;
  if (r.velja_do is null or r.velja_do > now()) and preverjen_lahko_velja(r.user_id, r.player_id, r.id) then
    update preverjeni_racuni
       set status = 'aktiven', updated_at = now(),
           stripe_preklic = case when stripe_preklic = 'caka' then null else stripe_preklic end
     where id = r.id;
    perform preverjeni_na_discord('✅ Spor dobljen, pravica vrnjena: https://slff.eu/player/' || r.player_id);
    return 'obnovljen';
  end if;
  perform preverjeni_na_discord('ℹ️ Spor dobljen, pravice ni mogoče vrniti (profil, ime ali rok), preveri ročno: https://slff.eu/player/' || r.player_id);
  return 'ne';
end;
$$;

-- Vrsta preklicev naročnin (webhook) in potrditev.
create or replace function public.preverjen_cakajoci_preklici()
returns setof text language sql stable security definer set search_path = public
as $$ select distinct stripe_subscription_id from preverjeni_racuni where stripe_preklic = 'caka' $$;

create or replace function public.preverjen_preklic_opravljen(p_subscription text)
returns void language sql security definer set search_path = public
as $$
  update preverjeni_racuni set stripe_preklic = 'opravljen', updated_at = now()
   where stripe_subscription_id = p_subscription and stripe_preklic = 'caka'
$$;

-- Naslovi naročil: 90 dni po pošiljanju ali preklicu ostane le država.
create or replace function public.preverjen_pocisti_naslove()
returns int language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  update narocila_znack
     set naslov = jsonb_build_object('country', naslov->>'country')
   where status in ('poslano', 'preklicano')
     and coalesce(poslano_at, created_at) < now() - interval '90 days'
     and naslov ?| array['name', 'line1', 'line2', 'postal_code', 'city'];
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function
  public.preverjeni_na_discord(text),
  public.preverjen_iz_placila(uuid, bigint, text, timestamptz, text, text, text, text, boolean, boolean, int, text, jsonb, text),
  public.preverjen_podaljsaj(text, timestamptz),
  public.preverjen_narocnina_konec(text, timestamptz),
  public.preverjen_vrstica_placila(text, text),
  public.preverjen_vracilo(text, text, int, int, boolean),
  public.preverjen_spor_dobljen(text, text),
  public.preverjen_cakajoci_preklici(),
  public.preverjen_preklic_opravljen(text),
  public.preverjen_pocisti_naslove()
  from public, anon, authenticated;
grant execute on function
  public.preverjeni_na_discord(text),
  public.preverjen_iz_placila(uuid, bigint, text, timestamptz, text, text, text, text, boolean, boolean, int, text, jsonb, text),
  public.preverjen_podaljsaj(text, timestamptz),
  public.preverjen_narocnina_konec(text, timestamptz),
  public.preverjen_vracilo(text, text, int, int, boolean),
  public.preverjen_spor_dobljen(text, text),
  public.preverjen_cakajoci_preklici(),
  public.preverjen_preklic_opravljen(text),
  public.preverjen_pocisti_naslove()
  to service_role;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('preverjeni-naslovi', '23 4 * * *', $urnik$select public.preverjen_pocisti_naslove()$urnik$);
exception
  when others then
    raise notice 'pg_cron ni na voljo: čiščenje naslovov naročil ni načrtovano.';
end;
$$;

-- --------------------------------------------------------------------------
-- Admin: naročila značk
-- --------------------------------------------------------------------------
create or replace function public.admin_narocila_znack()
returns table (id bigint, created_at timestamptz, status text, ime_na_znacki text, naslov jsonb, postnina text,
               poslano_at timestamptz, opomba text, player_id bigint, player_name text, kupec text, pravica_status text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select n.id, n.created_at, n.status, n.ime_na_znacki, n.naslov, n.postnina, n.poslano_at, n.opomba,
         n.player_id, p.full_name, pf.display_name, r.status
    from narocila_znack n
    left join players p on p.id = n.player_id
    left join profiles pf on pf.id = n.user_id
    left join preverjeni_racuni r on r.id = n.preverjeni_racun_id
   order by (n.status = 'za_tisk') desc, (n.status = 'natisnjeno') desc, n.created_at desc
   limit 500;
end;
$$;

create or replace function public.admin_nastavi_narocilo_znacke(p_id bigint, p_status text, p_opomba text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  update narocila_znack
     set status = p_status,
         poslano_at = case when p_status = 'poslano' then coalesce(poslano_at, now()) else poslano_at end,
         opomba = coalesce(nullif(btrim(p_opomba), ''), opomba)
   where id = p_id;
  if not found then
    raise exception 'Naročila s tem id ni.';
  end if;
end;
$$;

revoke all on function public.admin_narocila_znack(), public.admin_nastavi_narocilo_znacke(bigint, text, text) from public, anon;
grant execute on function public.admin_narocila_znack(), public.admin_nastavi_narocilo_znacke(bigint, text, text) to authenticated;
