-- player_season_stats dobi competition_id.
--
-- ovrednoti-igralce bere ta pogled po straneh in brez filtra na ligo: pogled
-- nima stolpca za tekmovanje. Vsaka stran torej znova sešteje VSE nastope
-- vseh 24 lig (prek appearance_points), samo da vrne tisoč vrstic — pri
-- današnjem obsegu je to padlo na statement timeout (Ptuj, LJ mladinci 2).
--
-- Krog nosi ligo, zato jo pogled lahko izpostavi; ker je v group by, Postgres
-- filter potisne pod seštevanje in ostane samo ena liga. Stolpec je dodan na
-- koncu, zato `create or replace` zadošča; pogledi, ki se vežejo po player_id,
-- ostanejo.

create or replace view player_season_stats as
select
  a.player_id,
  r.season,
  count(distinct a.match_id)::int as matches,
  sum(a.minutes_played)::int as minutes,
  sum(a.goals)::int as goals,
  sum(a.own_goals)::int as own_goals,
  sum(a.yellow_cards)::int as yellow_cards,
  sum(a.red_cards)::int as red_cards,
  sum(case when a.clean_sheet and a.minutes_played >= 60 then 1 else 0 end)::int
    as clean_sheets,
  coalesce(sum(ap.points), 0) as points,
  coalesce(sum(ap.assists), 0)::int as assists,
  r.competition_id
from appearances a
join matches m on m.id = a.match_id
join rounds r on r.id = m.round_id
left join appearance_points ap on ap.appearance_id = a.id
group by a.player_id, r.season, r.competition_id;
