-- Lestvica lige je seštevala točke vseh ekip vseh lig (39 000 vrstic
-- `fantasy_round_points`) in šele nato obdržala izbrano ligo: 0,5 s na klic,
-- do 2,3 s ob obremenitvi (anon ima 3 s). `fantasy_round_points` nosi
-- `competition_id`, zato ga pogoj stika poda naprej in filter lige pride do
-- vira. Vrstice so iste (točke ekipe so vedno iz njene lige), stolpci tudi.
create or replace view public.fantasy_team_standings as
 SELECT ft.id AS fantasy_team_id,
    ft.name AS team_name,
        CASE
            WHEN ft.hisna THEN ft.display_name
            ELSE pr.display_name
        END AS owner_name,
    pr.created_at AS owner_registered_at,
    ft.created_at AS team_created_at,
    COALESCE(sum(frp.points), 0::numeric) AS total_points,
    COALESCE(max(frp.points), 0::numeric) AS best_round,
    count(*) FILTER (WHERE frp.points > 0::numeric) AS rounds_played,
    ft.competition_id,
    ft.hisna,
        CASE
            WHEN ft.hisna THEN NULL::uuid
            ELSE ft.owner_id
        END AS owner_id,
    COALESCE(bool_or(frp.statistics_pending), false) AS statistics_pending
   FROM fantasy_teams ft
     JOIN profiles pr ON pr.id = ft.owner_id
     LEFT JOIN fantasy_round_points frp
       ON frp.fantasy_team_id = ft.id AND frp.competition_id = ft.competition_id
  GROUP BY ft.id, ft.name, pr.display_name, pr.created_at, ft.created_at, ft.competition_id, ft.hisna, ft.owner_id;
