-- Izložba preverjenega igralca (player showcase): video posnetki na profilu.
--
-- Preverjen (plačan), polnoleten igralec na svoj profil naloži do 6 kratkih
-- posnetkov (do 3 minute, do 200 MB). Posnetki živijo v Cloudflare Stream,
-- ne na našem strežniku: robna funkcija `posnetki-igralca` ustvari enkratni
-- naslov za nalaganje (Direct Creator Upload), sprejme webhook Streama in
-- izda kratkožive podpisane žetone za ogled (requireSignedURLs) — le za
-- posnetke, ki jih klicatelj sme videti. Baza hrani le uid, naslov in stanje.
--
-- Pravilo prikaza je eno, v SQL: `izlozba_dovoljena(igralec)` =
--   stikalo `posnetki_igralcev` (vidi_posnetke) AND je_preverjen(igralec)
--   AND izlozba_odrasla_oseba(igralec).
-- Odrasla oseba: potrjen profil, nobena vrstica osebe (glavna in povezane)
-- ni v mladinski ligi (`je_mladinski_slug`) ali anonimizirana (tudi po
-- ključih `anonimizirani_igralci`), in v državi ni mladinske vrstice z istim
-- imenom ali šifro (Scoutovo izločanje po ključu osebe; izjema kot v Scoutu:
-- polnoletna letnica na privolitvi lastnika odpre ujemanje po ključu, nikoli
-- lastne mladinske vrstice).
--
-- Moderacija: vsak nov posnetek je `caka`; javno in klubom (SLFF Club) se
-- pokaže šele `odobren` in `pripravljen` (Stream ga je obdelal). Discord
-- dobi obvestilo, ko je posnetek pripravljen za pregled, in ob prijavi.
--
-- Brisanje: izbris vrstice (lastnik, admin, prevzem_odstrani_predstavitev
-- ob preklicu profila, anonimizaciji in izbrisu računa, kaskada igralca)
-- uid vpiše v vrsto `posnetki_brisanje`, ki jo funkcija izprazni v Streamu
-- (takoj ob izbrisu iz vmesnika, sicer delovni tok vsako uro). Potek
-- pravice posnetke takoj skrije (pravilo zgoraj), izbriše pa jih
-- `posnetki_pocisti()` po 30 dneh; preklicana pravica (vračilo, spor,
-- odvzem) jih izbriše ob naslednjem čiščenju.

insert into settings (key, value) values ('posnetki_igralcev', '0')
on conflict (key) do nothing;

-- Stikalo kot `preverjeni_racuni`: 0 nihče, 1 admin in preizkuševalci, 2 vsi.
create or replace function public.vidi_posnetke()
returns boolean language sql stable security definer set search_path = public
as $$
  select case coalesce(nastavitev_int('posnetki_igralcev', 0), 0)
           when 2 then true
           when 1 then is_admin() or exists (select 1 from testerji where user_id = auth.uid())
           else false
         end
$$;
revoke all on function public.vidi_posnetke() from public;
grant execute on function public.vidi_posnetke() to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Pravilo: polnoletna oseba (brez stikala in pravice)
-- --------------------------------------------------------------------------
create or replace function public.izlozba_odrasla_oseba(p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  with z as (
    select z.id, z.player_id as glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id)
  ), v as (
    select p.id, p.full_name, p.reg_st, p.anonimiziran_at, c.country_id, c.slug
      from players p join competitions c on c.id = p.competition_id
     where p.id in (select glavni from z
                    union all
                    select pi.player_id from povezani_igralci pi join z on pi.zahtevek_id = z.id)
  )
  select exists (select 1 from z)
     -- lastne vrstice: nikoli mladinska liga, nikoli anonimizirana
     and not exists (select 1 from v where v.anonimiziran_at is not null or je_mladinski_slug(v.slug))
     and not exists (
       select 1 from v join anonimizirani_igralci a
         on a.kljuc = any (array[anonimizacijski_kljuc(v.country_id || '|' || nullif(v.full_name, '')),
                                 anonimizacijski_kljuc(v.country_id || '|reg|' || v.reg_st)]))
     -- ista oseba brez povezave (ime ali šifra v državi) v mladinski ligi
     and (exists (select 1 from z join scout.privolitve s on s.player_id = z.glavni
                   where s.letnik <= extract(year from current_date)::int - 19)
          or not exists (
            select 1 from v
              join competitions c2 on c2.country_id = v.country_id and je_mladinski_slug(c2.slug)
              join players p2 on p2.competition_id = c2.id
             where p2.full_name = v.full_name or p2.reg_st = v.reg_st))
$$;
revoke all on function public.izlozba_odrasla_oseba(bigint) from public, anon, authenticated;
grant execute on function public.izlozba_odrasla_oseba(bigint) to service_role;

-- Edino pravilo prikaza (javno, SLFF Club, nalaganje, žetoni).
create or replace function public.izlozba_dovoljena(p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select vidi_posnetke() and je_preverjen(p_player_id) and izlozba_odrasla_oseba(p_player_id)
$$;
revoke all on function public.izlozba_dovoljena(bigint) from public;
grant execute on function public.izlozba_dovoljena(bigint) to anon, authenticated, service_role;

-- Ali pravica velja ne glede na stikalo (čiščenje): potrjen zahtevek in
-- aktivna, nepotekla pravica istega uporabnika.
create or replace function public.posnetki_pravica_velja(p_glavni bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from zahtevki_igralca z
      join preverjeni_racuni r on r.player_id = z.player_id and r.user_id = z.user_id
     where z.player_id = p_glavni and z.status = 'potrjen'
       and r.status = 'aktiven' and (r.velja_do is null or r.velja_do > now()))
$$;
revoke all on function public.posnetki_pravica_velja(bigint) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Tabele (vse zaprte: brskalnik bere in piše le prek funkcij spodaj)
-- --------------------------------------------------------------------------
create table public.posnetki_igralca (
  id            bigint generated always as identity primary key,
  -- Glavna vrstica potrjenega zahtevka (kot profil_igralca). Ime ni
  -- `player_id` in ni tujega ključa na players: izdaje FCF preverjajo točen
  -- katalog relacij na igralce (zaklenjene migracije); posnetki visijo na
  -- potrjenem zahtevku, ki ga FCF pozna.
  -- Izbris igralca kaskadno izbriše zahtevek, sprožilec
  -- prevzem_izbris_zahtevka pa prek prevzem_odstrani_predstavitev posnetke;
  -- osirotele vrstice pobere še posnetki_pocisti().
  igralec       bigint not null,
  user_id       uuid references public.profiles on delete set null,
  -- Cloudflare Stream uid (v preizkusnem načinu "test-…"); null do nalaganja.
  stream_uid    text unique check (stream_uid is null or stream_uid ~ '^[A-Za-z0-9_-]{8,64}$'),
  naslov        text not null check (char_length(naslov) between 1 and 60),
  vrstni_red    int not null default 0,
  izpostavljen  boolean not null default false,
  stanje        text not null default 'nalaganje'
                check (stanje in ('nalaganje', 'obdelava', 'pripravljen', 'napaka')),
  pregled       text not null default 'caka' check (pregled in ('caka', 'odobren', 'zavrnjen')),
  razlog        text check (razlog is null or char_length(razlog) <= 300),
  trajanje      numeric(6, 1),
  pregledal     uuid references public.profiles on delete set null,
  pregledan_at  timestamptz,
  -- Prvič opaženo brez veljavne pravice (čiščenje); po 30 dneh izbris.
  brez_pravice_od timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.posnetki_igralca is
  'Video posnetki izložbe preverjenega igralca (Cloudflare Stream uid). Zaprto; vse prek funkcij izlozba_*/posnetki_*.';
create unique index posnetki_igralca_en_izpostavljen on public.posnetki_igralca (igralec) where izpostavljen;
create index posnetki_igralca_igralec on public.posnetki_igralca (igralec, vrstni_red);
create index posnetki_igralca_caka on public.posnetki_igralca (created_at) where pregled = 'caka';

-- Uid-ji, ki jih je treba izbrisati v Streamu (vrstica posnetka je že proč).
create table public.posnetki_brisanje (
  stream_uid  text primary key,
  izbrisi_po  timestamptz not null default now(),
  poskusov    int not null default 0,
  created_at  timestamptz not null default now()
);
comment on table public.posnetki_brisanje is
  'Vrsta brisanja posnetkov v Cloudflare Stream. Prazni jo funkcija posnetki-igralca (akcija pocisti).';

-- Prijave posnetkov (obiskovalec → admin).
create table public.prijave_posnetkov (
  id          bigint generated always as identity primary key,
  posnetek_id bigint not null references public.posnetki_igralca on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  razlog      text check (razlog is null or char_length(razlog) <= 500),
  created_at  timestamptz not null default now(),
  resena_at   timestamptz,
  resil       uuid references public.profiles on delete set null
);
create unique index prijave_posnetkov_ena_odprta on public.prijave_posnetkov (posnetek_id, user_id) where resena_at is null;

-- Dnevna meja nalaganj (izbris posnetka mesta v meji ne vrne).
create table public.posnetki_nalaganja (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);
create index posnetki_nalaganja_uporabnik on public.posnetki_nalaganja (user_id, created_at);

alter table public.posnetki_igralca enable row level security;
alter table public.posnetki_brisanje enable row level security;
alter table public.prijave_posnetkov enable row level security;
alter table public.posnetki_nalaganja enable row level security;
revoke all on public.posnetki_igralca, public.posnetki_brisanje, public.prijave_posnetkov,
  public.posnetki_nalaganja from anon, authenticated;

insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.posnetki_igralca', 'posnetki osebe (Stream uid, naslovi, moderacija)'),
  ('public.posnetki_brisanje', 'Stream uid-ji posnetkov za brisanje'),
  ('public.prijave_posnetkov', 'prijave posnetkov z uporabniki in razlogi'),
  ('public.posnetki_nalaganja', 'nalaganja posnetkov po uporabnikih')
on conflict (tabela) do nothing;

-- Naslov: brez žaljivk in rezerviranih besed, presledki strnjeni.
create or replace function public.varuj_posnetek_igralca()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_napaka text;
begin
  new.naslov := btrim(regexp_replace(coalesce(new.naslov, ''), '\s+', ' ', 'g'));
  v_napaka := prepovedane_besede(new.naslov);
  if v_napaka = 'znaki' then
    raise exception 'Besedilo vsebuje nedovoljene znake.' using hint = 'plus-znaki';
  elsif v_napaka is not null then
    raise exception 'To besedilo ni dovoljeno.' using hint = 'plus-' || v_napaka;
  end if;
  if new.naslov = '' then
    raise exception 'Posnetek potrebuje naslov.' using hint = 'posnetki-naslov';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.varuj_posnetek_igralca() from public, anon, authenticated;
create trigger posnetki_igralca_varuj before insert or update of naslov on public.posnetki_igralca
  for each row execute function public.varuj_posnetek_igralca();

-- Izbris vrstice → uid v vrsto brisanja (velja tudi za kaskado igralca).
create or replace function public.posnetki_ob_izbrisu()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into posnetki_brisanje (stream_uid) values (old.stream_uid)
  on conflict (stream_uid) do update set izbrisi_po = least(posnetki_brisanje.izbrisi_po, now());
  return null;
end;
$$;
revoke all on function public.posnetki_ob_izbrisu() from public, anon, authenticated;
create trigger posnetki_igralca_izbris after delete on public.posnetki_igralca
  for each row when (old.stream_uid is not null) execute function public.posnetki_ob_izbrisu();

-- Discord: posnetek čaka na pregled (ko ga je Stream obdelal) in prijava.
-- Isti vzorec kot trg_prevzem_na_discord: webhook iz Vaulta, brez njega tiho nič.
create or replace function public.trg_posnetki_na_discord()
returns trigger language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_url text;
  v_player bigint;
  v_naslov text;
  v_igralec text;
  v_klub text;
  v_liga text;
  v_besedilo text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
  if v_url is null then
    return new;
  end if;
  if tg_table_name = 'posnetki_igralca' then
    v_player := new.igralec;
    v_naslov := new.naslov;
  else
    select p.igralec, p.naslov into v_player, v_naslov from posnetki_igralca p where p.id = new.posnetek_id;
  end if;
  select coalesce(p.first_name || ' ' || p.last_name, p.full_name), t.name, c.name
    into v_igralec, v_klub, v_liga
    from players p left join teams t on t.id = p.team_id left join competitions c on c.id = p.competition_id
   where p.id = v_player;
  if tg_table_name = 'posnetki_igralca' then
    v_besedilo := '🎬 **Nov posnetek za pregled**' || E'\n' ||
      coalesce(v_igralec, '?') || ' · ' || coalesce(v_klub, '') || ' · ' || coalesce(v_liga, '') ||
      E'\n> ' || left(coalesce(v_naslov, ''), 60) || E'\nhttps://slff.eu/admin#posnetki';
  else
    v_besedilo := '🚩 **Prijava posnetka**' || E'\n' ||
      coalesce(v_igralec, '?') || ' · ' || coalesce(v_klub, '') || ' · ' || coalesce(v_liga, '') ||
      E'\n> ' || left(coalesce(v_naslov, ''), 60) ||
      case when new.razlog is not null then E'\n> ' || left(new.razlog, 300) else '' end ||
      E'\nhttps://slff.eu/admin#posnetki';
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('content', v_besedilo, 'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.trg_posnetki_na_discord() from public, anon, authenticated;
create trigger posnetki_igralca_discord after update of stanje on public.posnetki_igralca
  for each row when (new.stanje = 'pripravljen' and old.stanje <> 'pripravljen' and new.pregled = 'caka')
  execute function public.trg_posnetki_na_discord();
create trigger prijave_posnetkov_discord after insert on public.prijave_posnetkov
  for each row execute function public.trg_posnetki_na_discord();

-- --------------------------------------------------------------------------
-- Javno branje: izložba igralca
-- --------------------------------------------------------------------------

-- Vrstice osebe (glavna in povezane) za katerokoli vrstico.
create or replace function public.izlozba_vrstice(p_player_id bigint)
returns bigint[] language sql stable security definer set search_path = public
as $$
  select array_agg(id) from (
    select z.player_id as id from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id)
    union
    select pi.player_id from povezani_igralci pi where pi.zahtevek_id = prevzem_zahtevek_igralca(p_player_id)) v
$$;
revoke all on function public.izlozba_vrstice(bigint) from public, anon, authenticated;

-- Za katerokoli vrstico igralca. Tujec dobi le, če pravilo velja (sicer
-- null); lastnik vedno, z `dovoljena`, `odrasla` in stanjem svojih posnetkov.
-- Posnetki brez uid (žetone da funkcija posnetki-igralca, akcija ogled).
create or replace function public.izlozba_igralca(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_z bigint := prevzem_zahtevek_igralca(p_player_id);
  v_glavni bigint;
  v_lastnik boolean;
  v_dovoljena boolean;
  v_vrstice bigint[];
  v_drzava bigint;
  v_posnetki jsonb;
  v_privolitev jsonb;
  v_scout jsonb;
  v_mreza boolean := false;
  v_ogledi jsonb;
begin
  if v_z is null then
    return null;
  end if;
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = v_z;
  v_lastnik := je_lastnik_profila(v_glavni);
  v_dovoljena := izlozba_dovoljena(v_glavni);
  if not v_dovoljena and not v_lastnik then
    return null;
  end if;
  if not v_dovoljena then
    -- Lastnik brez izložbe: dovolj za ponudbo (stikalo, polnoletnost).
    return jsonb_build_object('glavni', v_glavni, 'lastnik', true, 'dovoljena', false,
      'vidi', vidi_posnetke(), 'odrasla', izlozba_odrasla_oseba(v_glavni));
  end if;

  v_vrstice := izlozba_vrstice(v_glavni);
  select c.country_id into v_drzava from players p join competitions c on c.id = p.competition_id where p.id = v_glavni;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'naslov', x.naslov, 'izpostavljen', x.izpostavljen, 'vrstni_red', x.vrstni_red,
           'trajanje', x.trajanje, 'stanje', x.stanje, 'pregled', x.pregled,
           'razlog', case when v_lastnik then x.razlog end)
           order by x.izpostavljen desc, x.vrstni_red, x.id), '[]'::jsonb)
    into v_posnetki
    from posnetki_igralca x
   where x.igralec = v_glavni
     and (v_lastnik or (x.stanje = 'pripravljen' and x.pregled = 'odobren'));

  -- Privolitev iz SLFF Club le pri "odprt za prestop" (kot klubom).
  select jsonb_build_object('letnik', s.letnik,
           'regije', (select coalesce(jsonb_agg(f.name order by f.name), '[]'::jsonb)
                        from federations f where f.id = any (s.regije)))
    into v_privolitev
    from scout.privolitve s where s.player_id = v_glavni and s.odprt_za_prestop;

  -- SLFF Club: država odprta in brez ugovora.
  v_mreza := coalesce((select d.stanje <> 'zaprto' from scout.drzave d where d.country_id = v_drzava), false)
             and not scout.je_skrit(v_vrstice);

  -- Kazalnik iz zadnjega objavljenega modela, le pozitiven (vrh četrtine).
  if v_mreza then
    select jsonb_build_object('skupina', x.skupina, 'percentil', round(x.percentil))
      into v_scout
      from scout.vidni(scout.zadnji_model(), v_drzava) x
     where x.player_id = any (v_vrstice) and x.percentil >= 75 and x.zaupanje >= 0.5
     order by x.percentil desc
     limit 1;
  end if;

  -- Lastniku: odpiranja profila v SLFF Club zadnjih 30 dni (le števila,
  -- brez lastnega kluba; kdo je gledal, ostane v dnevniku).
  if v_lastnik then
    select jsonb_build_object('ogledov', count(*), 'klubov', count(distinct d.team_id))
      into v_ogledi
      from scout.dnevnik d
     where d.vrsta = 'igralec' and d.player_id = any (v_vrstice)
       and d.created_at > now() - interval '30 days'
       and d.team_id not in (select p.team_id from players p where p.id = any (v_vrstice) and p.team_id is not null);
  end if;

  return jsonb_build_object(
    'glavni', v_glavni, 'lastnik', v_lastnik, 'dovoljena', true, 'vidi', true, 'odrasla', true,
    'posnetki', v_posnetki, 'privolitev', v_privolitev, 'scout', v_scout, 'mreza', v_mreza,
    'ogledi', v_ogledi, 'najvec', 6);
end;
$$;
revoke all on function public.izlozba_igralca(bigint) from public;
grant execute on function public.izlozba_igralca(bigint) to anon, authenticated;

-- Uid-ji za podpisane žetone (kliče jih funkcija posnetki-igralca z
-- glavo klicatelja). Lastnik: vsi svoji (tudi v pregledu, za stanje
-- nalaganja); admin: vsi; ostali: odobreni in obdelani, če pravilo velja.
-- `urejanje` pove, ali je klicatelj lastnik ali admin (stanje iz Streama).
create or replace function public.posnetki_za_ogled(p_ids bigint[])
returns table (id bigint, stream_uid text, urejanje boolean)
language sql stable security definer set search_path = public
as $$
  -- Pravilo enkrat na igralca (mladinsko preverjanje je najdražji del).
  with x as materialized (
    select * from posnetki_igralca where id = any (p_ids[1:12]) and stream_uid is not null
  ), o as materialized (
    select g.player_id, is_admin() as admin, je_lastnik_profila(g.player_id) as lastnik,
           izlozba_dovoljena(g.player_id) as dovoljena
      from (select distinct igralec as player_id from x) g
  )
  select x.id, x.stream_uid, o.admin or o.lastnik
    from x join o on o.player_id = x.igralec
   where o.admin
      or o.lastnik
      or (o.dovoljena and x.stanje = 'pripravljen' and x.pregled = 'odobren')
$$;
revoke all on function public.posnetki_za_ogled(bigint[]) from public;
grant execute on function public.posnetki_za_ogled(bigint[]) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Lastnik: priprava nalaganja, naslov, vrstni red, izpostavljen, izbris
-- --------------------------------------------------------------------------
create or replace function public.posnetki_pripravi(p_player_id bigint, p_naslov text)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_glavni bigint;
  v_id bigint;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Za nalaganje se je treba prijaviti.';
  end if;
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null or not je_lastnik_profila(v_glavni) then
    raise insufficient_privilege using message = 'Posnetke nalaga le lastnik profila.';
  end if;
  if not izlozba_dovoljena(v_glavni) then
    raise exception 'Posnetke lahko nalaga le preverjen polnoleten igralec.' using hint = 'posnetki-pravica';
  end if;
  -- En lastnik naenkrat (dva zavihka): zaklep vrstic posnetkov igralca.
  perform 1 from zahtevki_igralca where player_id = v_glavni and status = 'potrjen' for update;
  if (select count(*) from posnetki_igralca where igralec = v_glavni) >= 6 then
    raise exception 'Največ 6 posnetkov.' using hint = 'posnetki-polno';
  end if;
  if (select count(*) from posnetki_nalaganja where user_id = auth.uid() and created_at > now() - interval '24 hours') >= 12 then
    raise exception 'Danes si naložil že dovolj posnetkov.' using hint = 'posnetki-meja';
  end if;
  insert into posnetki_igralca (igralec, user_id, naslov, vrstni_red, izpostavljen)
  values (v_glavni, auth.uid(), coalesce(p_naslov, ''),
          coalesce((select max(vrstni_red) + 1 from posnetki_igralca where igralec = v_glavni), 0),
          not exists (select 1 from posnetki_igralca where igralec = v_glavni and izpostavljen))
  returning id into v_id;
  insert into posnetki_nalaganja (user_id) values (auth.uid());
  return v_id;
end;
$$;

-- Vrstica posnetka, ki ga sme urejati klicatelj (lastnik profila).
create or replace function public.posnetek_lastnika(p_id bigint)
returns public.posnetki_igralca language plpgsql stable security definer set search_path = public
as $$
declare
  x posnetki_igralca;
begin
  select * into x from posnetki_igralca where id = p_id;
  if not found or not je_lastnik_profila(x.igralec) then
    raise insufficient_privilege using message = 'Posnetek ni tvoj.';
  end if;
  return x;
end;
$$;
revoke all on function public.posnetek_lastnika(bigint) from public, anon, authenticated;

create or replace function public.posnetki_uredi(p_id bigint, p_naslov text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform posnetek_lastnika(p_id);
  update posnetki_igralca set naslov = coalesce(p_naslov, '') where id = p_id;
end;
$$;

create or replace function public.posnetki_izpostavi(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  x posnetki_igralca := posnetek_lastnika(p_id);
begin
  update posnetki_igralca set izpostavljen = false, updated_at = now()
   where igralec = x.igralec and izpostavljen and id <> p_id;
  update posnetki_igralca set izpostavljen = true, updated_at = now() where id = p_id;
end;
$$;

-- Vrstni red po seznamu id-jev (vsi morajo biti istega igralca).
create or replace function public.posnetki_razvrsti(p_ids bigint[])
returns void language plpgsql security definer set search_path = public
as $$
declare
  x posnetki_igralca;
begin
  if coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 6 then
    raise exception 'Neveljaven vrstni red.';
  end if;
  x := posnetek_lastnika(p_ids[1]);
  if exists (select 1 from posnetki_igralca y where y.id = any (p_ids) and y.igralec <> x.igralec)
     or (select count(*) from posnetki_igralca y where y.id = any (p_ids)) <> cardinality(p_ids) then
    raise insufficient_privilege using message = 'Posnetek ni tvoj.';
  end if;
  update posnetki_igralca y set vrstni_red = o.n - 1, updated_at = now()
    from unnest(p_ids) with ordinality o(id, n)
   where y.id = o.id;
end;
$$;

-- Lastnik ali admin. Vrne uid (funkcija ga takoj izbriše v Streamu; sicer
-- ga izbriše vrsta brisanja). Izpostavljen posnetek preide na naslednjega.
create or replace function public.posnetki_izbrisi(p_id bigint)
returns text language plpgsql security definer set search_path = public
as $$
declare
  x posnetki_igralca;
begin
  if is_admin() then
    select * into x from posnetki_igralca where id = p_id;
    if not found then
      raise exception 'Posnetka ni.';
    end if;
  else
    x := posnetek_lastnika(p_id);
  end if;
  delete from posnetki_igralca where id = p_id;
  if x.izpostavljen then
    update posnetki_igralca set izpostavljen = true, updated_at = now()
     where id = (select id from posnetki_igralca where igralec = x.igralec
                  order by (pregled = 'odobren') desc, vrstni_red, id limit 1);
  end if;
  return x.stream_uid;
end;
$$;

revoke all on function public.posnetki_pripravi(bigint, text), public.posnetki_uredi(bigint, text),
  public.posnetki_izpostavi(bigint), public.posnetki_razvrsti(bigint[]), public.posnetki_izbrisi(bigint)
  from public, anon;
grant execute on function public.posnetki_pripravi(bigint, text), public.posnetki_uredi(bigint, text),
  public.posnetki_izpostavi(bigint), public.posnetki_razvrsti(bigint[]), public.posnetki_izbrisi(bigint)
  to authenticated;

-- Prijava posnetka (prijavljen obiskovalec, ne lastnik). Tri odprte prijave
-- različnih ljudi posnetek vrnejo v pregled (skrit, dokler admin ne odloči).
create or replace function public.prijavi_posnetek(p_id bigint, p_razlog text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  x posnetki_igralca;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Za prijavo se je treba prijaviti.';
  end if;
  select * into x from posnetki_igralca where id = p_id;
  if not found or x.pregled <> 'odobren' or x.stanje <> 'pripravljen' or not izlozba_dovoljena(x.igralec) then
    raise exception 'Posnetka ni.';
  end if;
  if je_lastnik_profila(x.igralec) then
    raise exception 'Svojega posnetka ne moreš prijaviti.';
  end if;
  if exists (select 1 from prijave_posnetkov where posnetek_id = p_id and user_id = auth.uid() and resena_at is null) then
    raise exception 'Ta posnetek si že prijavil.';
  end if;
  if (select count(*) from prijave_posnetkov where user_id = auth.uid() and resena_at is null) >= 10 then
    raise exception 'Preveč odprtih prijav.';
  end if;
  insert into prijave_posnetkov (posnetek_id, user_id, razlog)
  values (p_id, auth.uid(), nullif(left(btrim(coalesce(p_razlog, '')), 500), ''));
  if (select count(*) from prijave_posnetkov where posnetek_id = p_id and resena_at is null) >= 3 then
    update posnetki_igralca set pregled = 'caka', updated_at = now() where id = p_id;
  end if;
end;
$$;
revoke all on function public.prijavi_posnetek(bigint, text) from public, anon;
grant execute on function public.prijavi_posnetek(bigint, text) to authenticated;

-- --------------------------------------------------------------------------
-- Servis (funkcija posnetki-igralca s servisnim ključem)
-- --------------------------------------------------------------------------
create or replace function public.posnetki_nastavi_uid(p_id bigint, p_uid text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update posnetki_igralca set stream_uid = p_uid, updated_at = now()
   where id = p_id and stream_uid is null;
  if not found then
    raise exception 'Posnetek že ima uid ali ga ni.';
  end if;
end;
$$;

-- Stanje iz Streama (webhook ali poizvedba). Pripravljen ne pade nazaj.
create or replace function public.posnetki_stream_stanje(p_uid text, p_stanje text, p_trajanje numeric default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_stanje not in ('obdelava', 'pripravljen', 'napaka') then
    raise exception 'Neznano stanje.';
  end if;
  update posnetki_igralca
     set stanje = case when stanje = 'pripravljen' then stanje else p_stanje end,
         trajanje = coalesce(round(p_trajanje, 1), trajanje),
         updated_at = now()
   where stream_uid = p_uid;
end;
$$;

-- Čiščenje (vsako uro): nedokončana nalaganja, napake, zavrnjeni, posnetki
-- brez pravice. Vrne število izbrisanih vrstic; uid-ji gredo v vrsto.
create or replace function public.posnetki_pocisti()
returns int language plpgsql security definer set search_path = public
as $$
declare
  v_n int := 0;
  v_k int;
begin
  delete from posnetki_igralca x where not exists (select 1 from players p where p.id = x.igralec);
  get diagnostics v_k = row_count; v_n := v_n + v_k;
  delete from posnetki_igralca where stanje = 'nalaganje' and created_at < now() - interval '3 hours';
  get diagnostics v_k = row_count; v_n := v_n + v_k;
  delete from posnetki_igralca where stanje = 'napaka' and updated_at < now() - interval '7 days';
  get diagnostics v_k = row_count; v_n := v_n + v_k;
  delete from posnetki_igralca where pregled = 'zavrnjen' and pregledan_at < now() - interval '14 days';
  get diagnostics v_k = row_count; v_n := v_n + v_k;

  -- Pravica spet velja: števec 30 dni se ustavi.
  update posnetki_igralca x set brez_pravice_od = null
   where x.brez_pravice_od is not null and posnetki_pravica_velja(x.igralec);
  -- Zadnja pravica preklicana (vračilo, spor, odvzem, preklic profila): takoj.
  -- (Zadnja vrstica `potekel` ali aktivna s preteklim rokom je potek.)
  delete from posnetki_igralca x
   where not posnetki_pravica_velja(x.igralec)
     and coalesce((select r.status from preverjeni_racuni r where r.player_id = x.igralec
                    order by r.updated_at desc, r.id desc limit 1), 'preklican') = 'preklican';
  get diagnostics v_k = row_count; v_n := v_n + v_k;
  -- Potekla pravica: skrit takoj (pravilo), izbris po 30 dneh.
  update posnetki_igralca x set brez_pravice_od = now()
   where x.brez_pravice_od is null and not posnetki_pravica_velja(x.igralec);
  delete from posnetki_igralca where brez_pravice_od < now() - interval '30 days';
  get diagnostics v_k = row_count; v_n := v_n + v_k;

  delete from posnetki_nalaganja where created_at < now() - interval '2 days';
  return v_n;
end;
$$;

create or replace function public.posnetki_za_brisanje(p_najvec int default 50)
returns setof text language sql security definer set search_path = public
as $$
  select stream_uid from posnetki_brisanje where izbrisi_po <= now()
   order by izbrisi_po limit least(greatest(p_najvec, 1), 200)
$$;

-- Uspeh: vrstica gre. Napaka: znova čez uro, po 48 poskusih obstane (admin).
create or replace function public.posnetki_brisanje_izid(p_uid text, p_uspeh boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_uspeh then
    delete from posnetki_brisanje where stream_uid = p_uid;
  else
    update posnetki_brisanje
       set poskusov = poskusov + 1,
           izbrisi_po = case when poskusov + 1 >= 48 then 'infinity'::timestamptz else now() + interval '1 hour' end
     where stream_uid = p_uid;
  end if;
end;
$$;

revoke all on function public.posnetki_nastavi_uid(bigint, text), public.posnetki_stream_stanje(text, text, numeric),
  public.posnetki_pocisti(), public.posnetki_za_brisanje(int), public.posnetki_brisanje_izid(text, boolean)
  from public, anon, authenticated;
grant execute on function public.posnetki_nastavi_uid(bigint, text), public.posnetki_stream_stanje(text, text, numeric),
  public.posnetki_pocisti(), public.posnetki_za_brisanje(int), public.posnetki_brisanje_izid(text, boolean)
  to service_role;

-- --------------------------------------------------------------------------
-- Admin: pregled in odločitev
-- --------------------------------------------------------------------------
create or replace function public.admin_posnetki()
returns table (
  id bigint, player_id bigint, player_name text, team_name text, liga text, lastnik text,
  naslov text, stanje text, pregled text, razlog text, trajanje numeric, created_at timestamptz,
  pregledan_at timestamptz, prijav int, razlogi_prijav text[], pravica boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select x.id, x.igralec, p.full_name::text, t.name::text, c.name::text, pf.display_name::text,
         x.naslov, x.stanje, x.pregled, x.razlog, x.trajanje, x.created_at, x.pregledan_at,
         coalesce(pr.n, 0)::int, coalesce(pr.razlogi, '{}'), posnetki_pravica_velja(x.igralec)
    from posnetki_igralca x
    join players p on p.id = x.igralec
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = x.user_id
    left join lateral (select count(*) as n, array_agg(r.razlog) filter (where r.razlog is not null) as razlogi
                         from prijave_posnetkov r where r.posnetek_id = x.id and r.resena_at is null) pr on true
   where x.pregled = 'caka' or coalesce(pr.n, 0) > 0 or x.pregledan_at > now() - interval '30 days'
   order by (coalesce(pr.n, 0) > 0) desc, (x.pregled = 'caka') desc, x.created_at desc
   limit 200;
end;
$$;

create or replace function public.admin_odloci_posnetek(p_id bigint, p_odobri boolean, p_razlog text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  if not p_odobri and nullif(btrim(coalesce(p_razlog, '')), '') is null then
    raise exception 'Zavrnitev potrebuje razlog.';
  end if;
  update posnetki_igralca
     set pregled = case when p_odobri then 'odobren' else 'zavrnjen' end,
         razlog = case when p_odobri then null else left(btrim(p_razlog), 300) end,
         izpostavljen = case when p_odobri then izpostavljen else false end,
         pregledal = auth.uid(), pregledan_at = now(), updated_at = now()
   where id = p_id;
  if not found then
    raise exception 'Posnetka ni.';
  end if;
  update prijave_posnetkov set resena_at = now(), resil = auth.uid()
   where posnetek_id = p_id and resena_at is null;
end;
$$;

revoke all on function public.admin_posnetki(), public.admin_odloci_posnetek(bigint, boolean, text) from public, anon;
grant execute on function public.admin_posnetki(), public.admin_odloci_posnetek(bigint, boolean, text) to authenticated;

-- --------------------------------------------------------------------------
-- SLFF Club: posnetki na strani igralca (skozi scout.dostop in scout.vidni)
-- --------------------------------------------------------------------------
alter table scout.dnevnik drop constraint dnevnik_vrsta_check;
alter table scout.dnevnik add constraint dnevnik_vrsta_check check (vrsta = any (array[
  'isci', 'igralec', 'podobni', 'vrzeli', 'opazuj', 'opazovani', 'klub', 'koledar', 'dogodek', 'ekipa', 'posnetki']));

-- Odobreni posnetki igralca, ki ga klub vidi v zadnjem objavljenem modelu.
-- Vsak klic gre v dnevnik (vrsta 'posnetki', meja drugih klicev).
create or replace function public.scout_posnetki(p_player_id bigint)
returns table (id bigint, naslov text, izpostavljen boolean, trajanje numeric, stream_uid text)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_glavni bigint;
begin
  select * into d from scout.dostop('posnetki', p_player_id, '{}'::jsonb);
  if not exists (select 1 from scout.vidni(d.model_id, d.country_id) v where v.player_id = p_player_id) then
    return;
  end if;
  if not izlozba_dovoljena(p_player_id) then
    return;
  end if;
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  return query
  select x.id, x.naslov, x.izpostavljen, x.trajanje, x.stream_uid
    from posnetki_igralca x
   where x.igralec = v_glavni and x.stanje = 'pripravljen' and x.pregled = 'odobren' and x.stream_uid is not null
   order by x.izpostavljen desc, x.vrstni_red, x.id;
end;
$$;
revoke all on function public.scout_posnetki(bigint) from public, anon;
grant execute on function public.scout_posnetki(bigint) to authenticated;

-- Profil v SLFF Club pove, ali ima igralec posnetke (aplikacija jih naloži
-- le takrat; vsak klic je vrstica dnevnika). Jedro ostane isto.
create or replace function public.scout_igralec(p_player_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_j jsonb;
begin
  select * into d from scout.dostop('igralec', p_player_id, '{}'::jsonb);
  v_j := scout.igralec_jedro(d.model_id, d.country_id, d.team_id, p_player_id);
  if v_j is not null and izlozba_dovoljena(p_player_id) then
    v_j := v_j || jsonb_build_object('posnetkov', (
      select count(*) from posnetki_igralca x
       where x.igralec = (select z.player_id from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id))
         and x.stanje = 'pripravljen' and x.pregled = 'odobren' and x.stream_uid is not null));
  end if;
  return v_j;
end;
$$;

-- --------------------------------------------------------------------------
-- Brisanje ob preklicu profila, anonimizaciji in izbrisu računa
-- --------------------------------------------------------------------------
-- Ista funkcija kot v 20261016160100, z eno vrstico več: posnetki gredo
-- (uid-ji v vrsto brisanja Streama).
create or replace function public.prevzem_odstrani_predstavitev(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from profil_igralca where player_id = p_player_id;
  delete from profil_igralca_plus where player_id = p_player_id;
  delete from posnetki_igralca where igralec = p_player_id;
  delete from scout.privolitve where player_id = p_player_id;
  update preverjeni_racuni set status = 'preklican', updated_at = now()
   where player_id = p_player_id and status = 'aktiven';
  perform prevzem_odstrani_fotografije(p_player_id);
end;
$$;
revoke all on function public.prevzem_odstrani_predstavitev(bigint) from public, anon, authenticated;
