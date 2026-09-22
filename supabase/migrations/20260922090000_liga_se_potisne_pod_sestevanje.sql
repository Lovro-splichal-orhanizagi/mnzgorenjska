-- Filter lige naj se potisne pod seštevanje nastopov.
--
-- `player_season_stats` je od migracije 20260921220000 naprej dobil
-- `competition_id`, a ga nihče ni uporabil: `player_overview` se nanj veže
-- samo po `player_id`, `player_season_standings` prav tako. Postgres zato
-- filtra na ligo ni imel kam potisniti in je za vsako poizvedbo — tudi tako,
-- ki vrne 282 igralcev ene lige — prebral cel `appearances`:
--
--   Seq Scan on appearances  (rows=182833)
--   Seq Scan on players      (rows=13924)
--
-- Cena torej ni bila odvisna od velikosti lige, ampak od tega, koliko lig je
-- v bazi skupaj: liga z eno samo fantasy ekipo se je nalagala enako dolgo kot
-- liga s sto dvanajstimi. Z vsako novo ligo je bilo počasneje povsod.
--
-- Vezava dobi še ligo. Ker je `competition_id` med `group by` stolpci
-- seštevka, gre pogoj pod agregat in prebere se samo ta liga:
--
--   player_overview ⨝ player_season_stats, ena liga:  2266 ms -> 14 ms
--
-- Pomenske spremembe ni. Igralec pripada natanko eni ligi (član in mladinec
-- sta dve vrstici) in nastop pride do lige prek kroga svoje tekme, zato sta
-- `players.competition_id` in `rounds.competition_id` pri istem igralcu vedno
-- ista. Preverjeno na produkciji: nobeden od 13.934 igralcev nima nastopa v
-- drugi ligi, in oba pogleda vrneta identične vrstice pred spremembo in po
-- njej (`except` v obe smeri, 0 razlik).
--
-- Stolpci ostanejo isti in v istem vrstnem redu, zato `create or replace`
-- zadošča — pogledov ni treba spustiti in pravice ostanejo nedotaknjene.

create or replace view player_overview as
select
  p.id,
  p.full_name,
  p.first_name,
  p.last_name,
  p.position,
  p.position_source,
  p.shirt_number,
  p.value,
  p.team_id,
  t.name as team_name,
  t.short_name as team_short,
  coalesce(s.matches, 0) as matches,
  coalesce(s.minutes, 0) as minutes,
  coalesce(s.goals, 0) as goals,
  coalesce(s.clean_sheets, 0) as clean_sheets,
  coalesce(s.points, 0) as points,
  coalesce(pv.votes, 0) as position_votes,
  t.logo_url as team_logo,
  p.competition_id,
  p.active,
  coalesce(s.assists, 0) as assists
from players p
join teams t on t.id = p.team_id
left join lateral (
  select sum(ss.matches)::int as matches, sum(ss.minutes)::int as minutes,
         sum(ss.goals)::int as goals, sum(ss.clean_sheets)::int as clean_sheets,
         sum(ss.points) as points, sum(ss.assists)::int as assists
  from player_season_stats ss
  where ss.player_id = p.id
    and ss.competition_id = p.competition_id
) s on true
left join lateral (
  select count(*)::int as votes from position_votes where player_id = p.id
) pv on true;

create or replace view player_season_standings as
select
  po.id,
  po.full_name,
  po.position,
  po.position_source,
  po.team_id,
  po.team_name,
  po.team_short,
  po.team_logo,
  po.value,
  ss.season,
  ss.matches,
  ss.minutes,
  ss.goals,
  ss.clean_sheets,
  ss.points,
  case when ss.matches > 0 then round(ss.points / ss.matches::numeric, 2)
       else 0::numeric end as points_per_match,
  case when po.value > 0::numeric then round(ss.points / po.value, 2)
       else 0::numeric end as points_per_value,
  coalesce(z.points, 0::numeric) as last_round,
  coalesce(f.points, 0::numeric) as form,
  case when zk.id is null then null::integer else coalesce(l.owners, 0) end as owners,
  rank() over (partition by po.competition_id, ss.season order by ss.points desc) as rank,
  po.competition_id,
  ss.assists
from player_overview po
  join player_season_stats ss
    on ss.player_id = po.id
   and ss.competition_id = po.competition_id
  left join lateral (
    select ps.points
    from player_scores ps
      join rounds r on r.id = ps.round_id
    where ps.player_id = po.id and r.season = ss.season
    order by r.number desc
    limit 1
  ) z on true
  left join lateral (
    select sum(zadnji.points) as points
    from (
      select ps.points
      from player_scores ps
        join rounds r on r.id = ps.round_id
      where ps.player_id = po.id and r.season = ss.season
      order by r.number desc
      limit 3
    ) zadnji
  ) f on true
  left join lateral (
    select r.id
    from rounds r
    where r.competition_id = po.competition_id
      and r.lineups_locked_at is not null
    order by r.season desc, r.number desc
    limit 1
  ) zk on true
  left join lateral (
    select count(*)::int as owners
    from fantasy_lineups fl
    where fl.player_id = po.id and fl.round_id = zk.id
  ) l on true;
