-- Najboljši igralci vseh lig ene države (stran Slovenija, zavihek Igralci).
--
-- `player_season_standings` je za eno ligo najdražji pogled v aplikaciji
-- (~1.2 s); brskalnik bi ga za državo moral brati za vsako ligo posebej in
-- prenesti vse igralce, da bi pokazal deset. Funkcija sešteje samo tekočo
-- sezono aktivnih lig države in vrne le vrh vsake lestvice.
--
-- Bere tabele, ne pogleda `appearance_points`: prek pogleda je ista poizvedba
-- na produkciji trajala 10 s (anonimnim obiskovalcem jo Supabase prekine
-- prej), iz tabel 70–190 ms. Točke so iz `player_scores` — iste, ki štejejo
-- za fantasy ekipe — asistence iz potrjenih golov, čiste mreže kakor na
-- naslovnici (`player_season_stats`).
--
-- Tekoča sezona je zadnja sezona, ki jo ima katerakoli aktivna liga države;
-- liga, ki te sezone še nima uvožene, ne prispeva ničesar (ne pa lanske
-- statistike).

create or replace function vrh_drzave(p_drzava text, p_koliko int default 10)
returns table (
  kategorija text,
  mesto int,
  player_id bigint,
  full_name text,
  "position" text,
  team_name text,
  team_short text,
  team_logo text,
  competition_slug text,
  competition_short text,
  vrednost numeric,
  minutes int,
  season text
)
language sql
stable
set search_path = public
as $$
  with lige as (
    select c.id, c.slug, c.short_name
      from competitions c
      join countries d on d.id = c.country_id
     where c.active and d.code = p_drzava
  ),
  sezona as (
    select max(r.season) as s
      from rounds r
      join lige l on l.id = r.competition_id
  ),
  krogi as (
    select r.id
      from rounds r
      join lige l on l.id = r.competition_id
     where r.season = (select s from sezona)
  ),
  nastopi as (
    select a.player_id,
           sum(a.minutes_played)::int as minutes,
           sum(a.goals) as goli,
           sum(case when a.clean_sheet and a.minutes_played >= 60 then 1 else 0 end) as ciste_mreze
      from appearances a
      join matches m on m.id = a.match_id
      join krogi k on k.id = m.round_id
     group by a.player_id
  ),
  tocke as (
    select ps.player_id, sum(ps.points) as tocke
      from player_scores ps
      join krogi k on k.id = ps.round_id
     group by ps.player_id
  ),
  asistence as (
    select g.assist_player_id as player_id, count(*) as asistence
      from goals g
      join matches m on m.id = g.match_id
      join krogi k on k.id = m.round_id
     where g.assist_player_id is not null
     group by g.assist_player_id
  ),
  stat as (
    select n.player_id, n.minutes, n.goli, n.ciste_mreze,
           coalesce(t.tocke, 0) as tocke,
           coalesce(a.asistence, 0) as asistence
      from nastopi n
      left join tocke t on t.player_id = n.player_id
      left join asistence a on a.player_id = n.player_id
  ),
  kategorije as (
    select 'tocke' as kategorija, s.player_id, s.minutes, s.tocke::numeric as vrednost from stat s
    union all
    select 'goli', s.player_id, s.minutes, s.goli from stat s
    union all
    select 'asistence', s.player_id, s.minutes, s.asistence from stat s
    union all
    -- čista mreža je dosežek vratarja; branilci jo imajo le zraven
    select 'ciste_mreze', s.player_id, s.minutes, s.ciste_mreze
      from stat s join players p on p.id = s.player_id
     where p.position = 'GK'
  ),
  razvrsceni as (
    select k.*,
           -- enako kot na naslovnici: ob izenačenju odloča več minut
           row_number() over (partition by k.kategorija
                              order by k.vrednost desc, k.minutes desc, k.player_id) as mesto
      from kategorije k
     where k.vrednost > 0
  )
  select x.kategorija, x.mesto::int, p.id, p.full_name, p.position,
         t.name, t.short_name, t.logo_url,
         l.slug, l.short_name,
         x.vrednost, x.minutes, (select s from sezona)
    from razvrsceni x
    join players p on p.id = x.player_id
    join lige l on l.id = p.competition_id
    left join teams t on t.id = p.team_id
   where x.mesto <= least(greatest(coalesce(p_koliko, 10), 1), 50)
   order by x.kategorija, x.mesto;
$$;

comment on function vrh_drzave(text, int) is
  'Vrh igralcev tekoče sezone vseh aktivnih lig države: tocke, goli, asistence, ciste_mreze (vratarji).';

-- Javni RPC: privzeto funkcije niso odprte (migracija 20260923090000).
grant execute on function vrh_drzave(text, int) to anon, authenticated;
