-- Profili uporabnikov: nastavitve na /account in javna stran /u/:id.
--
-- Kaj prinese:
--   * prikazno ime si uporabnik spremeni sam: 3–24 znakov, brez imen, ki bi
--     se izdajala za ekipo SLFF ("admin", "slff", "moderator" …) ali bila
--     žaljiva, enolično brez razlike med velikimi in malimi črkami, največ
--     enkrat na 7 dni (`display_name_changed_at`, piše ga le sprožilec);
--   * avatar brez nalaganja slik (moderacija): barva iz palete in začetnice
--     ali ena od nogometnih ikon — dva majhna stolpca;
--   * `javni_profil` (privzeto vklopljen): izklopljen profil na javni strani
--     pokaže le prikazno ime;
--   * `javni_profil(id)` — SECURITY DEFINER, vrne SAMO javna polja;
--   * `isci_klube(iskanje)` — izbirnik kluba, za katerega navijaš;
--   * `owner_id` na koncu lestvičnih pogledov, da ime lastnika vodi na profil
--     (hišne ekipe ga nimajo — sistemski lastnik ni človek).
--
-- Enoličnost imena: 2297 profilov ima 153 podvojenih imen iz registracije
-- (Googlovo `given_name`: "Luka", "Matej"). Registracija mora uspeti tudi
-- z že zasedenim imenom, zato enolični indeks velja za imena, ki si jih je
-- uporabnik izbral sam (`display_name_changed_at is not null`), sprožilec pa
-- novo ime primerja z VSEMI profili. Tako nihče ne more vzeti imena, ki ga
-- že nosi kdo drug, obstoječih podvojenih imen pa ne preimenujemo.

-- ---------------------------------------------------------------------------
-- 1. Stolpci
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_barva smallint,
  add column if not exists avatar_ikona text,
  add column if not exists javni_profil boolean not null default true,
  add column if not exists display_name_changed_at timestamptz;

alter table public.profiles
  add constraint profiles_avatar_barva_paleta
    check (avatar_barva is null or avatar_barva between 0 and 11),
  add constraint profiles_avatar_ikona_nabor
    check (avatar_ikona is null or avatar_ikona in
      ('zoga', 'gol', 'pokal', 'copat', 'rokavice', 'dres', 'zastavica', 'navijac'));

comment on column public.profiles.avatar_barva is
  'Barva avatarja: indeks palete 0–11 (src/lib/profil.ts). NULL = barva iz id-ja.';
comment on column public.profiles.avatar_ikona is
  'Nogometna ikona avatarja (zoga, gol, pokal, copat, rokavice, dres, zastavica, navijac). NULL = začetnice imena.';
comment on column public.profiles.javni_profil is
  'Javna stran /u/:id pokaže ekipe, klub in dosežke. Izklopljen: le prikazno ime.';
comment on column public.profiles.display_name_changed_at is
  'Zadnja sprememba prikaznega imena, ki jo je naredil uporabnik sam (omejitev 7 dni). Piše jo le sprožilec.';

create index if not exists profiles_prikazno_ime_lower
  on public.profiles (lower(display_name));
-- Dva hkratna preimenovanja v isto ime: sprožilec ju ne vidi drug drugega,
-- indeks ju ujame (23505).
create unique index if not exists profiles_prikazno_ime_izbrano
  on public.profiles (lower(display_name))
  where display_name_changed_at is not null;

-- Lastnik sme pisati le te stolpce (poleg že odprtih display_name,
-- insider_team_id, navijam_team_id, brez_opomnikov, brez_push).
-- display_name_changed_at, is_admin in insider_competition_id ostanejo zaprti.
grant update (avatar_barva, avatar_ikona, javni_profil) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Pravila za prikazno ime
-- ---------------------------------------------------------------------------
-- Vrne kodo napake (za prevod v vmesniku, `hint`) ali NULL, če je ime dovoljeno.
-- Isto pravilo je v `src/lib/profil.ts` (preverImeProfila), da obrazec napako
-- pove pred klicem; odloči baza.
create or replace function public.napaka_prikaznega_imena(p_ime text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  v text := btrim(regexp_replace(coalesce(p_ime, ''), '\s+', ' ', 'g'));
  v_cisto text;
begin
  if char_length(v) < 3 or char_length(v) > 24 then
    return 'ime-dolzina';
  end if;
  -- Kontrolni in nevidni znaki ter znaki, ki jih v imenu ni treba.
  if v ~ '[[:cntrl:]<>{}\[\]|\\/@#$%^*=+~`"]'
     or v ~ '[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]' then
    return 'ime-znaki';
  end if;
  -- Brez šumnikov, malih črk, števke kot črke (4dm1n), brez ločil vmes (s.l.f.f).
  v_cisto := translate(podpora_brez_sumnikov(v), '0134578@$!|', 'oieastbasii');
  v_cisto := regexp_replace(v_cisto, '[^a-z]', '', 'g');
  if v_cisto ~ '(admin|slff|moderat|support|podpora|helpstack|sysop|official|uradn|ekipaslff)' then
    return 'ime-rezervirano';
  end if;
  if v_cisto ~ '(fuck|shit|cunt|nigg|hitler|kurac|pizd|picka|jebem|jebi|kurva|faggot|retard|fotze|kokot)' then
    return 'ime-neprimerno';
  end if;
  return null;
end;
$$;

revoke all on function public.napaka_prikaznega_imena(text) from public;
-- Kliče jo le sprožilec (SECURITY DEFINER); vmesnik ima isto pravilo v src/lib/profil.ts.

create or replace function public.varuj_prikazno_ime()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_napaka text;
begin
  if new.display_name is not distinct from old.display_name then
    return new;
  end if;
  -- Pravila veljajo, ko ime spremeni lastnik sam. Admin (Administracija →
  -- Uporabniki) in servis popravljata imena drugih brez omejitev.
  if auth.uid() is distinct from old.id or is_admin() then
    return new;
  end if;

  new.display_name := btrim(regexp_replace(coalesce(new.display_name, ''), '\s+', ' ', 'g'));
  if new.display_name is not distinct from old.display_name then
    return new;
  end if;

  v_napaka := napaka_prikaznega_imena(new.display_name);
  if v_napaka = 'ime-dolzina' then
    raise exception 'Prikazno ime mora imeti od 3 do 24 znakov.' using hint = v_napaka;
  elsif v_napaka = 'ime-znaki' then
    raise exception 'Prikazno ime vsebuje nedovoljene znake.' using hint = v_napaka;
  elsif v_napaka is not null then
    raise exception 'To prikazno ime ni dovoljeno.' using hint = v_napaka;
  end if;

  if old.display_name_changed_at > now() - interval '7 days' then
    raise exception 'Prikazno ime lahko spremeniš enkrat na 7 dni.' using hint = 'ime-prepogosto';
  end if;

  -- Velike in male črke niso razlika ("luka" proti "Luka"); sprememba le
  -- velikosti črk lastnega imena je dovoljena.
  if exists (
    select 1 from profiles p
     where lower(p.display_name) = lower(new.display_name)
       and p.id <> old.id
  ) then
    raise exception 'To prikazno ime je že zasedeno.' using hint = 'ime-zasedeno';
  end if;

  new.display_name_changed_at := now();
  return new;
end;
$$;

revoke all on function public.varuj_prikazno_ime() from public, anon, authenticated;

drop trigger if exists profiles_varuj_prikazno_ime on public.profiles;
create trigger profiles_varuj_prikazno_ime
  before update of display_name on public.profiles
  for each row execute function public.varuj_prikazno_ime();

-- ---------------------------------------------------------------------------
-- 3. Lestvice: lastnik ekipe (za povezavo na profil)
-- ---------------------------------------------------------------------------
-- Nov stolpec gre NA KONEC, da `create or replace` ne podira odvisnih pogledov.
-- Hišna ekipa nima lastnika-človeka: owner_id je NULL.
-- (fantasy_teams.owner_id je že javno berljiv; nič novega se ne razkrije.)
create or replace view public.fantasy_team_standings as
 SELECT ft.id AS fantasy_team_id,
    ft.name AS team_name,
    case when ft.hisna then ft.display_name else pr.display_name end AS owner_name,
    pr.created_at AS owner_registered_at,
    ft.created_at AS team_created_at,
    COALESCE(sum(frp.points), (0)::numeric) AS total_points,
    COALESCE(max(frp.points), (0)::numeric) AS best_round,
    count(*) FILTER (WHERE (frp.points > (0)::numeric)) AS rounds_played,
    ft.competition_id,
    ft.hisna,
    case when ft.hisna then null else ft.owner_id end AS owner_id
   FROM ((public.fantasy_teams ft
     JOIN public.profiles pr ON ((pr.id = ft.owner_id)))
     LEFT JOIN public.fantasy_round_points frp ON ((frp.fantasy_team_id = ft.id)))
  GROUP BY ft.id, ft.name, pr.display_name, pr.created_at, ft.created_at, ft.competition_id, ft.hisna, ft.owner_id;

create or replace view public.fantasy_round_standings
as
select
  frp.round_id,
  frp.season,
  frp.round_number,
  frp.fantasy_team_id,
  ft.name as team_name,
  case when ft.hisna then ft.display_name else pr.display_name end as owner_name,
  frp.points,
  frp.transfers,
  frp.penalty,
  rank() over (partition by frp.competition_id, frp.round_id order by frp.points desc) as rank,
  frp.competition_id,
  case when ft.hisna then null else ft.owner_id end as owner_id
from public.fantasy_round_points frp
join public.fantasy_teams ft on ft.id = frp.fantasy_team_id
join public.profiles pr on pr.id = ft.owner_id
where exists (select 1 from public.player_scores ps where ps.round_id = frp.round_id);

create or replace view public.lestvica_drzavna as
 SELECT s.fantasy_team_id,
    s.team_name,
    s.owner_name,
    s.total_points,
    s.rounds_played,
        CASE
            WHEN (s.rounds_played > 0) THEN round((s.total_points / (s.rounds_played)::numeric), 2)
            ELSE (0)::numeric
        END AS points_per_round,
    s.best_round,
    c.id AS competition_id,
    c.slug AS competition_slug,
    c.short_name AS competition_short,
    c.name AS competition_name,
    c.federation_short,
    c.federation_name,
    s.owner_id
   FROM (public.fantasy_team_standings s
     JOIN public.competitions_view c ON ((c.id = s.competition_id)))
  WHERE c.active AND NOT s.hisna;

-- security_invoker (20260916120000) mora ostati: brez njega bi pogled obšel
-- RLS zasebnih mini lig. `create or replace` brez WITH bi ga ponastavil.
create or replace view public.mini_liga_lestvica with (security_invoker = on) as
  select c.mini_liga_id,
         s.fantasy_team_id,
         s.team_name,
         s.owner_name,
         s.total_points,
         s.rounds_played,
         case when s.rounds_played > 0
              then round(s.total_points / s.rounds_played, 2)
              else 0 end as points_per_round,
         k.slug  as competition_slug,
         k.short_name as competition_short,
         k.federation_short,
         c.joined_at,
         s.owner_id
    from mini_liga_clani c
    join fantasy_team_standings s on s.fantasy_team_id = c.fantasy_team_id
    join competitions_view k on k.id = s.competition_id;

-- ---------------------------------------------------------------------------
-- 4. Javni profil
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER, ker zbere podatke več tabel v enem klicu; vrne SAMO javna
-- polja (nikoli e-pošte, is_admin, insider_*, nastavitev obvestil). Pravila:
--   * profila ni (izbrisan račun) ali je sistemski lastnik hišnih ekip → NULL;
--   * profil ni javen in ga ne gleda lastnik → le id, ime in javen=false;
--   * ekipe le v aktivnih ligah (neaktivne so skrite povsod), brez hišnih;
--   * mini lige so zasebne: le tiste, v katerih je tudi gledalec
--     (`sem_v_mini_ligi`), lastnik vidi vse svoje.
create or replace function public.javni_profil(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  v_jaz boolean := auth.uid() is not null and auth.uid() = p_id;
  v jsonb;
begin
  select * into p from profiles where id = p_id;
  if not found then
    return null;
  end if;
  if exists (select 1 from fantasy_teams where owner_id = p_id and hisna) then
    return null;
  end if;

  v := jsonb_build_object(
    'id', p.id,
    'ime', p.display_name,
    'javen', p.javni_profil,
    'jaz', v_jaz
  );
  if not p.javni_profil and not v_jaz then
    return v;
  end if;

  v := v || jsonb_build_object(
    'avatar_barva', p.avatar_barva,
    'avatar_ikona', p.avatar_ikona,
    'clan_od', p.created_at,
    'navijam', (
      select jsonb_build_object('id', t.id, 'ime', t.name, 'kratko', t.short_name, 'grb', t.logo_url)
        from teams t where t.id = p.navijam_team_id
    ),
    'ekipe', coalesce((
      with moje as (
        select ft.id, ft.competition_id
          from fantasy_teams ft
          join competitions c on c.id = ft.competition_id
         where ft.owner_id = p_id and not ft.hisna and c.active
      ),
      lestvica as (
        -- Mesto kot na lestvici lige: vse ekipe lige, tudi hišne.
        select s.fantasy_team_id, s.team_name, s.total_points, s.rounds_played,
               s.best_round, s.competition_id,
               rank() over (partition by s.competition_id order by s.total_points desc) as mesto,
               count(*) over (partition by s.competition_id) as ekip
          from fantasy_team_standings s
         where s.competition_id in (select competition_id from moje)
      )
      select jsonb_agg(jsonb_build_object(
               'id', l.fantasy_team_id,
               'ime', l.team_name,
               'tocke', l.total_points,
               'mesto', l.mesto,
               'ekip', l.ekip,
               'krogov', l.rounds_played,
               'liga', k.slug,
               'liga_ime', k.name,
               'liga_kratko', k.short_name,
               'drzava', k.country_code
             ) order by l.total_points desc, k.sort_order)
        from lestvica l
        join moje m on m.id = l.fantasy_team_id
        join competitions_view k on k.id = l.competition_id
    ), '[]'::jsonb),
    'mini_lige', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ml.id,
               'ime', ml.name,
               'clanov', (select count(*) from mini_liga_clani c2 where c2.mini_liga_id = ml.id)
             ) order by ml.name)
        from mini_lige ml
       where auth.uid() is not null
         and exists (
               select 1 from mini_liga_clani c
                 join fantasy_teams ft on ft.id = c.fantasy_team_id
                where c.mini_liga_id = ml.id and ft.owner_id = p_id
             )
         and sem_v_mini_ligi(ml.id)
    ), '[]'::jsonb),
    -- Dosežki iz obstoječih točk: poceni seštevki ene osebe.
    'dosezki', (
      with krogi as (
        select frp.season, frp.round_number, frp.points, k.short_name as liga
          from fantasy_round_points frp
          join fantasy_teams ft on ft.id = frp.fantasy_team_id
          join competitions k on k.id = ft.competition_id
         where ft.owner_id = p_id and not ft.hisna
      )
      select jsonb_build_object(
        'sezon', (select count(distinct season) from krogi where points > 0),
        'krogov', (select count(*) from krogi where points > 0),
        'najboljsi', (
          select jsonb_build_object('tocke', points, 'krog', round_number, 'sezona', season, 'liga', liga)
            from krogi where points > 0
           order by points desc, season desc, round_number desc
           limit 1
        )
      )
    )
  );
  return v;
end;
$$;

revoke all on function public.javni_profil(uuid) from public;
grant execute on function public.javni_profil(uuid) to anon, authenticated;

comment on function public.javni_profil(uuid) is
  'Javna stran profila /u/:id. Vrne le javna polja; zasebni profil le ime, izbrisan ali sistemski NULL.';

-- ---------------------------------------------------------------------------
-- 5. Iskanje kluba (navijam)
-- ---------------------------------------------------------------------------
-- Klubi, ki igrajo v vsaj eni aktivni ligi, po imenu brez šumnikov (vse
-- besede iskanja, od dveh znakov). `players.team_id` nima kazala, zato je
-- nabor klubov aktivnih lig en prehod čez igralce (hash semi join), ne
-- iskanje po klubu. SECURITY DEFINER zaradi `podpora_brez_sumnikov` (zaprta
-- vlogama anon/authenticated); bere le javne podatke (klubi, lige).
create or replace function public.isci_klube(iskanje text, omejitev int default 10)
returns table (id bigint, ime text, kratko text, grb text, drzava text, liga text)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select trim(regexp_replace(podpora_brez_sumnikov(iskanje), '[%_\\]+', ' ', 'g')) as cisto
  ),
  zadetki as (
    select t.id, t.name, t.short_name, t.logo_url, t.country_id
      from teams t, q
     where char_length(q.cisto) >= 2
       and podpora_ujema(t.name, q.cisto)
  ),
  v_ligi as (
    select distinct on (p.team_id) p.team_id, c.short_name
      from players p
      join competitions c on c.id = p.competition_id
     where p.active and c.active
       and p.team_id in (select z.id from zadetki z)
     order by p.team_id, c.sort_order, c.id
  )
  select z.id, z.name, z.short_name, z.logo_url, d.code, l.short_name
    from zadetki z
    join v_ligi l on l.team_id = z.id
    left join countries d on d.id = z.country_id
    cross join q
   order by (podpora_brez_sumnikov(z.name) like q.cisto || '%') desc, z.name, z.id
   limit least(greatest(coalesce(omejitev, 10), 1), 25);
$$;

revoke all on function public.isci_klube(text, int) from public;
grant execute on function public.isci_klube(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Štetje obiska nove strani (src/lib/obiski.ts: '/u/' → 'profil')
-- ---------------------------------------------------------------------------
create or replace function public.zabelezi_obisk(p_stran text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ustvarjen timestamptz;
  v_skupina text;
begin
  if p_stran not in (
    'domov', 'vstop_drzave', 'moja_ekipa', 'igralci', 'igralec', 'lestvica',
    'slovenija', 'mini_lige', 'vstop_v_mini_ligo', 'ekipa', 'klub', 'rezultati',
    'tekma', 'glasovanje', 'pozicije', 'odsotnosti', 'racun', 'opomniki',
    'pravno', 'prijava', 'potrditev', 'tabela', 'profil'
  ) then
    return;
  end if;

  -- Neprijavljen nima vrstice; `auth.uid()` je takrat null.
  select created_at into v_ustvarjen from auth.users where id = auth.uid();

  v_skupina := case
    when v_ustvarjen is null then 'neprijavljen'
    when v_ustvarjen > now() - interval '7 days' then 'nov'
    else 'star'
  end;

  insert into obiski_dnevno (dan, stran, skupina, stevilo)
  values (current_date, p_stran, v_skupina, 1)
  on conflict (dan, stran, skupina) do update
    set stevilo = obiski_dnevno.stevilo + 1;
end;
$$;

revoke all on function public.zabelezi_obisk(text) from public;
grant execute on function public.zabelezi_obisk(text) to anon, authenticated;
