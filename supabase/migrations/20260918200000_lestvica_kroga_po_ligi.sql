-- Lestvica kroga: filter po ligi se ni prebil skozi okno.
--
-- `fantasy_round_standings` racuna rank() OVER (PARTITION BY round_id). Ker
-- filter `competition_id = X` ne omenja particijskega stolpca, ga Postgres ne
-- sme potisniti pod okno — zato se je za VSAK ogled lestvice izracunala
-- celotna Slovenija (612 ekip-krogov, 612 klicev ucinkovita_postava) in nato
-- 96 % zavrglo. ~1 s pri toplem cachu, s krogi raste linearno; pod obremenitvijo
-- je padlo v statement timeout ("canceling statement due to statement timeout").
--
-- Krog pripada natanko eni ligi, zato PARTITION BY (competition_id, round_id)
-- da enake range, filter pa se zdaj potisne do fantasy_teams.

create or replace view public.fantasy_round_standings
as
select
  frp.round_id,
  frp.season,
  frp.round_number,
  frp.fantasy_team_id,
  ft.name as team_name,
  pr.display_name as owner_name,
  frp.points,
  frp.transfers,
  frp.penalty,
  rank() over (partition by frp.competition_id, frp.round_id order by frp.points desc) as rank,
  frp.competition_id
from public.fantasy_round_points frp
join public.fantasy_teams ft on ft.id = frp.fantasy_team_id
join public.profiles pr on pr.id = ft.owner_id
where exists (select 1 from public.player_scores ps where ps.round_id = frp.round_id);
