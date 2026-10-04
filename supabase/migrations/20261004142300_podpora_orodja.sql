-- Orodja klepeta za podporo (HelpStack SERVER_SIDE).
--
-- Agent v klepetu jih pokliče neposredno prek PostgREST
-- (POST /rest/v1/rpc/<ime>, javni ključ), ko vprašanje zahteva podatke:
-- "zakaj igralca X ni na trgu", "zakaj tekma še ni vpisana", "kdaj je rok".
-- Imena argumentov so tista, ki jih pošlje agent (ime, liga, klub).
--
-- Vračajo le, kar je že na javni strani (igralci, klubi, tekme, lige), v
-- obliki, ki jo agent prebere brez razlage: kratki ključi, slovenske besede,
-- povezava na stran. Iskanje je brez šumnikov in velikih črk ("sefara" najde
-- "Šefara"), vrstni red besed je poljuben ("Jan Bohar" = "Bohar Denko Jan").

create extension if not exists unaccent with schema extensions;

-- Nespremenljiva ovojnica: unaccent sam ni IMMUTABLE.
create or replace function public.podpora_brez_sumnikov(t text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$ select lower(extensions.unaccent('extensions.unaccent', coalesce(t, ''))) $$;

-- Ali se vse besede iskanja pojavijo v besedilu.
create or replace function public.podpora_ujema(besedilo text, iskanje text)
returns boolean
language sql
immutable
parallel safe
set search_path = public
as $$
  select coalesce(bool_and(podpora_brez_sumnikov(besedilo) like '%' || b || '%'), false)
    from unnest(regexp_split_to_array(trim(podpora_brez_sumnikov(iskanje)), '\s+')) b
   where b <> ''
$$;

-- Liga po šifri ali delu imena; null = vse.
create or replace function public.podpora_lige(liga text)
returns setof bigint
language sql
stable
set search_path = public
as $$
  select c.id from competitions_view c
   where liga is null or trim(liga) = ''
      or c.slug = lower(trim(liga))
      or podpora_ujema(c.name || ' ' || coalesce(c.short_name, '') || ' ' || coalesce(c.federation_name, ''), liga)
$$;

-- --------------------------------------------------------------------------
-- najdi_igralca(ime, liga)
-- --------------------------------------------------------------------------
create or replace function public.najdi_igralca(ime text, liga text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with kandidati as (
    select p.id, p.full_name, p.position, p.position_source, p.value, p.active,
           p.izstopil_at, t.name as klub, c.slug, c.name as liga_ime, c.active as liga_aktivna
      from players p
      join teams t on t.id = p.team_id
      join competitions c on c.id = p.competition_id
     where length(trim(coalesce(ime, ''))) >= 3
       and podpora_ujema(p.full_name, ime)
       and p.competition_id in (select podpora_lige(liga))
     order by c.active desc, p.active desc, p.value desc
     limit 8
  )
  select jsonb_build_object(
    'najdenih', (select count(*) from kandidati),
    'igralci', coalesce(jsonb_agg(jsonb_build_object(
      'ime', k.full_name,
      'klub', k.klub,
      'liga', k.liga_ime,
      'pozicija', k.position,
      'pozicija_iz', k.position_source,
      'cena_mio', k.value,
      'na_trgu', k.active and k.izstopil_at is null and k.liga_aktivna,
      'zakaj_ni_na_trgu', case
        when not k.liga_aktivna then 'liga ni vklopljena v SLFF'
        when k.izstopil_at is not null then 'klub je med sezono izstopil iz lige; kdor ga ima, ga obdrži'
        when not k.active then 'ni v letošnjih zapisnikih tega kluba v tej ligi (lanska sezona, druga selekcija ali prestop); doda se, ko prvič zaigra'
      end,
      'sezona', s.season,
      'tock', s.points,
      'tekem', s.matches,
      'minut', s.minutes,
      'golov', s.goals,
      'povezava', 'https://slff.eu/player/' || k.id || '?t=' || k.slug
    ) order by k.liga_aktivna desc, k.active desc, k.value desc), '[]'::jsonb),
    'opomba', case when (select count(*) from kandidati) = 0 then
      'Igralca s tem imenom ni. Igralec se doda samodejno, ko prvič zaigra (z minutami) na tekmi, ki je v uradnem zapisniku.' end
  )
  from kandidati k
  left join lateral (
    select si.season, si.points, si.matches, si.minutes, si.goals
      from statistika_igralcev si
     where si.player_id = k.id
     order by si.season desc
     limit 1
  ) s on true
$$;

-- --------------------------------------------------------------------------
-- tekme_kluba(klub, liga)
-- --------------------------------------------------------------------------
create or replace function public.tekme_kluba(klub text, liga text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with klubi as (
    select t.id from teams t
     where length(trim(coalesce(klub, ''))) >= 3 and podpora_ujema(t.name || ' ' || coalesce(t.short_name, ''), klub)
  ),
  tekme as (
    select m.id, m.played_on, r.number as krog, c.name as liga_ime, c.slug,
           th.name as doma, ta.name as gost, m.home_goals, m.away_goals,
           m.imported_at, m.kontumacija
      from matches m
      join rounds r on r.id = m.round_id
      join competitions c on c.id = r.competition_id
      join teams th on th.id = m.home_team_id
      join teams ta on ta.id = m.away_team_id
     where c.active
       and (m.home_team_id in (select id from klubi) or m.away_team_id in (select id from klubi))
       and c.id in (select podpora_lige(liga))
       and m.played_on between current_date - 21 and current_date + 14
     order by m.played_on, m.id
     limit 12
  )
  select jsonb_build_object(
    'tekme', coalesce(jsonb_agg(jsonb_build_object(
      'datum', t.played_on,
      'liga', t.liga_ime,
      'krog', t.krog,
      'tekma', t.doma || ' – ' || t.gost,
      'izid', case when t.imported_at is not null or t.kontumacija
                   then t.home_goals || ':' || t.away_goals end,
      'stanje', case
        when t.kontumacija then 'brez borbe (izid dodeljen, zapisnika ni)'
        when t.imported_at is not null then 'zapisnik uvožen, točke so štete'
        when t.played_on > current_date then 'še ni odigrana'
        else 'odigrana, zapisnik še ni objavljen ali uvožen'
      end,
      'povezava', 'https://slff.eu/match/' || t.id
    ) order by t.played_on), '[]'::jsonb),
    'opomba', 'Zapisnike uvažamo večkrat na dan (ob vikendih vsako uro). Tekma se vpiše, ko zveza objavi zapisnik; nekatere zveze ga objavijo šele po nekaj dneh.'
  )
  from tekme t
$$;

-- --------------------------------------------------------------------------
-- liga(liga)
-- --------------------------------------------------------------------------
create or replace function public.liga(liga text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with l as (
    select c.* from competitions_view c
     where c.id in (select podpora_lige(liga)) and liga is not null and trim(liga) <> ''
     order by c.active desc, c.sort_order
     limit 5
  )
  select jsonb_build_object('lige', coalesce(jsonb_agg(jsonb_build_object(
    'ime', l.name,
    'sifra', l.slug,
    'drzava', l.country_name,
    'aktivna', l.active,
    'vir_podatkov', coalesce(l.vir_ime, l.federation_name),
    'naslednji_krog', nk.number,
    'rok_za_postavo', nk.deadline_at,
    'ekip', (select count(*) from fantasy_teams ft where ft.competition_id = l.id and not ft.hisna),
    'lestvica', 'https://slff.eu/standings?t=' || l.slug
  )), '[]'::jsonb))
  from l
  left join naslednji_krog nk on nk.competition_id = l.id
$$;

revoke all on function public.najdi_igralca(text, text) from public;
revoke all on function public.tekme_kluba(text, text) from public;
revoke all on function public.liga(text) from public;
grant execute on function public.najdi_igralca(text, text) to anon, authenticated;
grant execute on function public.tekme_kluba(text, text) to anon, authenticated;
grant execute on function public.liga(text) to anon, authenticated;
