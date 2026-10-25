-- Plačljivo ponovno vrednotenje cene igralca (le splet, Stripe), s potrditvijo admina.
--
-- Uporabnik plača enkratni znesek (Stripe lookup_key `slff_ponovna_cena`,
-- privzeto 4,99 €). Cena se izračuna znova z ISTIM algoritmom in ISTIMI
-- pravili kot tedenski zagon (`ovrednoti-igralce.mjs --tedensko`): največ 1.0
-- na teden, sidro borze potuje z njo, igralec z borzno zgodovino ostane borzi.
-- Izid je lahko višji, nižji ali enak; plačilo kupi izračun, ne smeri. Cena se
-- NIKOLI ne spremeni sama: izračun je le predlog, ki ga admin potrdi ali zavrne.
--
-- Pot:
--   1. `ponovna_cena_pripravi` (JWT kupca, edge `ponovna-cena`) → 'caka_placilo'
--   2. Checkout (metadata app=slff-cena) → stripe-webhook `ponovna_cena_iz_placila`
--      → 'placano' (+ Discord)
--   3. delovni tok *Ponovne cene* (vsakih 15 min) požene ovrednoti-igralce za
--      tega igralca brez pisanja → `ponovna_cena_predlog` → 'v_pregledu' (+ Discord)
--   4. admin v Administraciji: `admin_ponovna_cena_potrdi` (cena se premakne,
--      → 'potrjeno') ali `admin_ponovna_cena_zavrni` (cena ostane, → 'zavrnjeno';
--      vračilo opravi v Stripe ročno, opomba ga zabeleži). `admin_ponovna_cena_znova`
--      vrne zastarel predlog v izračun.
--   'za_vracilo': po plačilu ni bilo mogoče (kdo drug je plačal hkrati,
--   igralec je prišel na borzo ...), Discord "vrni denar".
--
-- Potrditev zavrne: ceno, ki ni več stara cena predloga; igralca na borzi ali
-- ta teden že prevrednotenega (tedenska meja velja za oba skupaj); in čas med
-- rokom −24 h in zaklepom kroga ("potrdi po zaklepu").
--
-- Kdo sme kupiti (vse preveri baza): stikalo `ponovna_cena` (0 nihče, 1 admin
-- in testerji, 2 vsi), prijavljen in ne omejen, vklopljena liga, ne mladinska,
-- igralec aktiven, ne anonimiziran, ne zaklenjen, brez borzne zgodovine, ta
-- ISO teden še ne prevrednoten, za igralca nobenega odprtega zahtevka in
-- največ en plačan v 7 dneh (od kogarkoli), ne med rokom −24 h in zaklepom.

insert into public.settings (key, value) values ('ponovna_cena', '0'), ('ponovna_cena_centi', '499')
on conflict (key) do nothing;

create table public.ponovne_cene (
  id                bigint generated always as identity primary key,
  player_id         bigint not null references public.players on delete cascade,
  competition_id    bigint not null references public.competitions on delete cascade,
  user_id           uuid references public.profiles on delete set null,
  stanje            text not null default 'caka_placilo'
                    check (stanje in ('caka_placilo', 'placano', 'v_pregledu', 'potrjeno', 'zavrnjeno', 'za_vracilo')),
  -- Izid izračuna: premaknjena, brez_spremembe ali razlog, zakaj ni bilo mogoče.
  izid              text,
  stara_cena        numeric(4,1),
  nova_cena         numeric(4,1),
  -- Podlaga izračuna za admina (minute, ciljna cena, meja premika, višja liga ...).
  podlaga           jsonb,
  opomba            text check (char_length(opomba) <= 300),
  stripe_seja       text unique,
  stripe_placilo    text,
  created_at        timestamptz not null default now(),
  placano_at        timestamptz,
  predlog_at        timestamptz,
  odlocil           uuid references public.profiles on delete set null,
  odloceno_at       timestamptz
);
create index ponovne_cene_igralec on public.ponovne_cene (player_id, placano_at desc);
create index ponovne_cene_odprte on public.ponovne_cene (stanje) where stanje in ('placano', 'v_pregledu', 'za_vracilo');
alter table public.ponovne_cene enable row level security;
revoke all on public.ponovne_cene from anon, authenticated;

create trigger zavrni_omejenega before insert on public.ponovne_cene
  for each row execute function public.zavrni_omejenega();

-- Kupci in Stripe id-ji niso za agente.
insert into agent.zaprte_tabele (tabela, zakaj) values ('public.ponovne_cene', 'kupci in Stripe id-ji ponovnih cen')
on conflict (tabela) do nothing;

create or replace function public.vidi_ponovno_ceno()
returns boolean language sql stable security definer set search_path = public
as $$
  select case coalesce(nastavitev_int('ponovna_cena', 0), 0)
           when 2 then true
           when 1 then is_admin() or exists (select 1 from testerji where user_id = auth.uid())
           else false
         end
$$;
revoke all on function public.vidi_ponovno_ceno() from public;
grant execute on function public.vidi_ponovno_ceno() to anon, authenticated;

-- Med rokom −24 h in zaklepom kroga se cena ne sme premakniti (isto okno kot odhod igralca).
create or replace function public.ponovna_cena_v_roku(p_competition_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from rounds r
      join competitions c on c.id = r.competition_id
     where r.competition_id = p_competition_id
       and r.lineups_locked_at is null
       and r.deadline_at is not null
       and r.number >= coalesce(c.prvi_fantasy_krog, 1)
       and r.deadline_at <= now() + interval '24 hours'
       and r.deadline_at > now() - interval '7 days')
$$;
revoke all on function public.ponovna_cena_v_roku(bigint) from public, anon, authenticated;

-- Lastnosti igralca, ki izračun onemogočijo (NULL = mogoč). Isto preverja potrditev.
create or replace function public.ponovna_cena_ovira_igralca(p_player_id bigint)
returns text language plpgsql stable security definer set search_path = public
as $$
declare
  p record;
begin
  select pl.active, pl.anonimiziran_at, pl.izstopil_at, pl.value_locked, pl.repriced_week,
         c.active liga_aktivna, c.slug
    into p
    from players pl join competitions c on c.id = pl.competition_id
   where pl.id = p_player_id;
  if not found then return 'ni_igralca'; end if;
  if not p.liga_aktivna then return 'liga'; end if;
  if je_mladinski_slug(p.slug) then return 'mladinska'; end if;
  if p.anonimiziran_at is not null or not coalesce(p.active, false) or p.izstopil_at is not null then return 'igralec'; end if;
  if p.value_locked then return 'zaklenjena'; end if;
  if exists (select 1 from price_changes where player_id = p_player_id) then return 'borza'; end if;
  if p.repriced_week = to_char(now() at time zone 'UTC', 'IYYY-"W"IW') then return 'ta_teden'; end if;
  return null;
end;
$$;
revoke all on function public.ponovna_cena_ovira_igralca(bigint) from public, anon, authenticated;

-- Ali je nakup zdaj mogoč (NULL) ali zakaj ne. `p_razen` = lastni zahtevek, ki ga ne štejemo.
create or replace function public.ponovna_cena_ovira(p_player_id bigint, p_razen bigint default null)
returns text language plpgsql stable security definer set search_path = public
as $$
declare
  v text := ponovna_cena_ovira_igralca(p_player_id);
begin
  if v is not null then return v; end if;
  if exists (select 1 from ponovne_cene z
              where z.player_id = p_player_id and z.id is distinct from p_razen
                and (z.stanje in ('placano', 'v_pregledu')
                     or z.placano_at > now() - interval '7 days'
                     or (z.stanje = 'caka_placilo' and z.created_at > now() - interval '35 minutes'))) then
    return 'nedavno';
  end if;
  if ponovna_cena_v_roku((select competition_id from players where id = p_player_id)) then return 'rok'; end if;
  return null;
end;
$$;
revoke all on function public.ponovna_cena_ovira(bigint, bigint) from public, anon, authenticated;

-- Za stran igralca: ali je gumb viden, ali je mogoč, cena, odprt zahtevek in zadnji potrjeni izid.
create or replace function public.ponovna_cena_stanje(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_zadnja record;
begin
  if not vidi_ponovno_ceno() then
    return jsonb_build_object('vidno', false);
  end if;
  select z.odloceno_at, z.stara_cena, z.nova_cena
    into v_zadnja
    from ponovne_cene z
   where z.player_id = p_player_id and z.stanje = 'potrjeno'
   order by z.odloceno_at desc
   limit 1;
  return jsonb_build_object(
    'vidno', true,
    'ovira', ponovna_cena_ovira(p_player_id),
    'v_pregledu', exists (select 1 from ponovne_cene where player_id = p_player_id and stanje in ('placano', 'v_pregledu')),
    'centi', coalesce(nastavitev_int('ponovna_cena_centi', 499), 499),
    'zadnja', case when v_zadnja.odloceno_at is null then null else jsonb_build_object(
      'kdaj', v_zadnja.odloceno_at, 'stara', v_zadnja.stara_cena, 'nova', v_zadnja.nova_cena) end);
end;
$$;
revoke all on function public.ponovna_cena_stanje(bigint) from public;
grant execute on function public.ponovna_cena_stanje(bigint) to anon, authenticated;

-- Kliče edge `ponovna-cena` z JWT kupca, tik pred Checkout.
create or replace function public.ponovna_cena_pripravi(p_player_id bigint)
returns table (zahtevek bigint, liga text, email text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ovira text;
  v_liga bigint;
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'Za nakup se je treba prijaviti.' using errcode = '42501';
  end if;
  if not vidi_ponovno_ceno() then
    raise exception 'Plačilo trenutno ni na voljo.';
  end if;
  -- Isti igralec ne sme v dve hkratni seji.
  perform pg_advisory_xact_lock(hashtext('ponovna_cena:' || p_player_id));
  -- Kupčeva prekinjena seja (preklic na Checkout) ne zapre ponovnega poskusa.
  delete from ponovne_cene where player_id = p_player_id and user_id = v_uid and stanje = 'caka_placilo';
  v_ovira := ponovna_cena_ovira(p_player_id);
  if v_ovira is not null then
    raise exception 'Ponovno vrednotenje cene zdaj ni mogoče (%).', v_ovira;
  end if;
  select competition_id into v_liga from players where id = p_player_id;
  insert into ponovne_cene (player_id, competition_id, user_id)
  values (p_player_id, v_liga, v_uid)
  returning id into v_id;
  return query
    select v_id, (select slug from competitions where id = v_liga), (select u.email::text from auth.users u where u.id = v_uid);
end;
$$;
revoke all on function public.ponovna_cena_pripravi(bigint) from public, anon;
grant execute on function public.ponovna_cena_pripravi(bigint) to authenticated;

-- Kliče stripe-webhook (servisni ključ) po plačani seji. Idempotentno.
-- Vrne 'placano', 'ze' ali 'za_vracilo:<razlog>'.
create or replace function public.ponovna_cena_iz_placila(
  p_zahtevek bigint, p_user_id uuid, p_seja text, p_placilo text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  z ponovne_cene;
  v_ovira text;
  v_ime text;
begin
  select * into z from ponovne_cene where id = p_zahtevek for update;
  if not found or z.user_id is distinct from p_user_id then
    perform preverjeni_na_discord(format('⚠️ Ponovna cena: plačana seja %s brez zahtevka #%s. Vrni denar v Stripe.', p_seja, p_zahtevek));
    return 'za_vracilo:neznan';
  end if;
  if z.stanje <> 'caka_placilo' then
    return 'ze';
  end if;
  -- Med sejo je lahko kdo drug plačal za istega igralca ali je igralec prišel
  -- na borzo. Bližnji rok ne ovira: plačan zahtevek počaka na pregled.
  v_ovira := ponovna_cena_ovira(z.player_id, z.id);
  if v_ovira = 'rok' then
    v_ovira := null;
  end if;
  select full_name into v_ime from players where id = z.player_id;
  if v_ovira is not null then
    update ponovne_cene
       set stanje = 'za_vracilo', izid = v_ovira, placano_at = now(), stripe_seja = p_seja, stripe_placilo = p_placilo
     where id = z.id;
    perform preverjeni_na_discord(format('⚠️ Ponovna cena #%s (%s): plačano, a ni mogoče (%s). Vrni denar v Stripe.', z.id, v_ime, v_ovira));
    return 'za_vracilo:' || v_ovira;
  end if;
  update ponovne_cene
     set stanje = 'placano', placano_at = now(), stripe_seja = p_seja, stripe_placilo = p_placilo
   where id = z.id;
  perform preverjeni_na_discord(format('💶 Ponovna cena #%s: %s, plačano. Predlog pride v Administracijo v 15 minutah.', z.id, v_ime));
  return 'placano';
end;
$$;
revoke all on function public.ponovna_cena_iz_placila(bigint, uuid, text, text) from public, anon, authenticated;

-- Za delovni tok: plačani zahtevki brez predloga.
create or replace function public.ponovne_cene_za_izracun()
returns table (zahtevek bigint, player_id bigint, liga text)
language sql stable security definer set search_path = public
as $$
  select z.id, z.player_id, c.slug
    from ponovne_cene z join competitions c on c.id = z.competition_id
   where z.stanje = 'placano'
   order by z.placano_at
$$;
revoke all on function public.ponovne_cene_za_izracun() from public, anon, authenticated;

-- Za delovni tok: predlog izračuna (cene ne spremeni). `p_izid`: premaknjena |
-- brez_spremembe → v pregled; razlog iz ovrednoti-igralce (borza, ta_teden,
-- zaklenjena, ni_igralca) → za vračilo.
create or replace function public.ponovna_cena_predlog(
  p_zahtevek bigint, p_izid text, p_stara numeric, p_nova numeric, p_podlaga jsonb default null)
returns text language plpgsql security definer set search_path = public
as $$
declare
  z ponovne_cene;
  v_ime text;
begin
  select * into z from ponovne_cene where id = p_zahtevek for update;
  if not found or z.stanje <> 'placano' then
    return 'ze';
  end if;
  select full_name into v_ime from players where id = z.player_id;
  if p_izid in ('premaknjena', 'brez_spremembe') then
    update ponovne_cene
       set stanje = 'v_pregledu', izid = p_izid, stara_cena = p_stara, nova_cena = p_nova,
           podlaga = p_podlaga, predlog_at = now()
     where id = z.id;
    perform preverjeni_na_discord(format('💶 Ponovna cena #%s: %s, predlog %s → %s. Potrdi ali zavrni v Administraciji.',
                                         z.id, v_ime, p_stara, p_nova));
    return 'v_pregledu';
  end if;
  update ponovne_cene
     set stanje = 'za_vracilo', izid = p_izid, stara_cena = p_stara, predlog_at = now()
   where id = z.id;
  perform preverjeni_na_discord(format('⚠️ Ponovna cena #%s (%s): izračun ni bil mogoč (%s). Zavrni in vrni denar v Stripe.', z.id, v_ime, p_izid));
  return 'za_vracilo';
end;
$$;
revoke all on function public.ponovna_cena_predlog(bigint, text, numeric, numeric, jsonb) from public, anon, authenticated;

-- Admin potrdi predlog: cena se premakne natanko tako kot ob tedenskem zagonu
-- (value, sidro value_start z isto razliko, žig repriced_week/at).
create or replace function public.admin_ponovna_cena_potrdi(p_id bigint)
returns text language plpgsql security definer set search_path = public
as $$
declare
  z ponovne_cene;
  p players;
  v_ovira text;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Le za administratorje.';
  end if;
  select * into z from ponovne_cene where id = p_id for update;
  if not found or z.stanje <> 'v_pregledu' then
    raise exception 'Zahtevek ni v pregledu.';
  end if;
  select * into p from players where id = z.player_id for update;
  if p.value is distinct from z.stara_cena then
    raise exception 'Cena se je od predloga spremenila (zdaj %): izračunaj znova.', p.value;
  end if;
  if ponovna_cena_v_roku(z.competition_id) then
    raise exception 'Rok kroga je manj kot 24 ur stran: potrdi po zaklepu kroga.';
  end if;
  v_ovira := ponovna_cena_ovira_igralca(z.player_id);
  if v_ovira is not null then
    raise exception 'Potrditev zdaj ni mogoča (%).', v_ovira;
  end if;
  if z.nova_cena is distinct from z.stara_cena then
    update players
       set value = z.nova_cena,
           value_start = case when value_start is null then null
                              else round(value_start + (z.nova_cena - z.stara_cena), 1) end,
           repriced_week = to_char(now() at time zone 'UTC', 'IYYY-"W"IW'),
           repriced_at = now()
     where id = z.player_id;
  end if;
  update ponovne_cene set stanje = 'potrjeno', odlocil = auth.uid(), odloceno_at = now() where id = z.id;
  return 'potrjeno';
end;
$$;
revoke all on function public.admin_ponovna_cena_potrdi(bigint) from public, anon;
grant execute on function public.admin_ponovna_cena_potrdi(bigint) to authenticated;

-- Admin zavrne (cena ostane); vračilo v Stripe je ročno, opomba ga zabeleži.
create or replace function public.admin_ponovna_cena_zavrni(p_id bigint, p_opomba text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Le za administratorje.';
  end if;
  update ponovne_cene
     set stanje = 'zavrnjeno', opomba = left(nullif(btrim(coalesce(p_opomba, '')), ''), 300),
         odlocil = auth.uid(), odloceno_at = now()
   where id = p_id and stanje in ('placano', 'v_pregledu', 'za_vracilo');
  if not found then
    raise exception 'Zahtevek ni odprt.';
  end if;
end;
$$;
revoke all on function public.admin_ponovna_cena_zavrni(bigint, text) from public, anon;
grant execute on function public.admin_ponovna_cena_zavrni(bigint, text) to authenticated;

-- Admin vrne zastarel predlog v izračun (delovni tok ga izračuna znova).
create or replace function public.admin_ponovna_cena_znova(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Le za administratorje.';
  end if;
  update ponovne_cene
     set stanje = 'placano', izid = null, stara_cena = null, nova_cena = null, podlaga = null, predlog_at = null
   where id = p_id and stanje = 'v_pregledu';
  if not found then
    raise exception 'Zahtevek ni v pregledu.';
  end if;
end;
$$;
revoke all on function public.admin_ponovna_cena_znova(bigint) from public, anon;
grant execute on function public.admin_ponovna_cena_znova(bigint) to authenticated;

-- Administracija: zahtevki (brez nedokončanih sej, starejših od dneva).
create or replace function public.admin_ponovne_cene()
returns table (id bigint, kdaj timestamptz, igralec text, player_id bigint, liga text, kupec text,
               stanje text, izid text, stara numeric, nova numeric, podlaga jsonb, opomba text,
               stripe_placilo text, v_roku boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Le za administratorje.';
  end if;
  return query
    select z.id, coalesce(z.placano_at, z.created_at), p.full_name, z.player_id, c.name,
           pr.display_name, z.stanje, z.izid, z.stara_cena, z.nova_cena, z.podlaga, z.opomba,
           z.stripe_placilo, ponovna_cena_v_roku(z.competition_id)
      from ponovne_cene z
      join players p on p.id = z.player_id
      join competitions c on c.id = z.competition_id
      left join profiles pr on pr.id = z.user_id
     where z.stanje <> 'caka_placilo' or z.created_at > now() - interval '1 day'
     order by (z.stanje in ('v_pregledu', 'za_vracilo', 'placano')) desc, coalesce(z.placano_at, z.created_at) desc
     limit 200;
end;
$$;
revoke all on function public.admin_ponovne_cene() from public, anon;
grant execute on function public.admin_ponovne_cene() to authenticated;
