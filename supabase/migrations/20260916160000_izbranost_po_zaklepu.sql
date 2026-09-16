-- Izbranost se meri po zadnjem zaklenjenem krogu, ne po zivih kadrih.
--
-- `owners` je stel vrstice v `fantasy_roster`, torej TRENUTNE izbire. V ligi
-- z dvema ekipama to tujo ekipo izda v celoti: `owners = 2` pomeni, da ga
-- imata oba, `owners = 1` in jaz ga nimam pomeni, da ga ima nasprotnik. Tudi
-- v veliki ligi je opazovanje, kako se stevilka premakne, potem ko nasprotnik
-- shrani ekipo, dovolj natancen signal.
--
-- Migracija 20260916090000 je zaprla neposredno branje `fantasy_roster`, ta
-- pogled pa tece s pravicami lastnika in je RLS obsel. Odslej steje posnetek
-- zadnjega zaklenjenega kroga — to je ista meja kot pri tuji postavi: kar je
-- zaklenjeno, je javno, kar je zivo, ni.
--
-- Dokler v ligi ni zaklenjenega kroga, izbranost ni `0`, ampak NULL: nic ni
-- isto kot "se ne vemo", in `0` bi pomenilo, da igralca ni izbral nihce.


create or replace view public.player_standings as
SELECT po.id,
    po.full_name,
    po."position",
    po.position_source,
    po.team_id,
    po.team_name,
    po.team_short,
    po.value,
    po.matches,
    po.minutes,
    po.goals,
    po.clean_sheets,
    COALESCE(t.points, 0::numeric) AS points,
    COALESCE(f.points, 0::numeric) AS form,
    COALESCE(z.points, 0::numeric) AS last_round,
        CASE
            WHEN po.matches > 0 THEN round(COALESCE(t.points, 0::numeric) / po.matches::numeric, 2)
            ELSE 0::numeric
        END AS points_per_match,
        CASE
            WHEN po.value > 0::numeric THEN round(COALESCE(t.points, 0::numeric) / po.value, 2)
            ELSE 0::numeric
        END AS points_per_value,
    CASE WHEN zk.id IS NULL THEN NULL::integer ELSE COALESCE(l.owners, 0) END AS owners,
    rank() OVER (PARTITION BY po.competition_id ORDER BY (COALESCE(t.points, 0::numeric)) DESC) AS rank,
    po.team_logo,
    po.competition_id,
    po.assists
   FROM player_overview po
     LEFT JOIN LATERAL ( SELECT sum(ps.points) AS points
           FROM player_scores ps
          WHERE ps.player_id = po.id) t ON true
     LEFT JOIN LATERAL ( SELECT sum(zadnji.points) AS points
           FROM ( SELECT ps.points
                   FROM player_scores ps
                     JOIN rounds r ON r.id = ps.round_id
                  WHERE ps.player_id = po.id
                  ORDER BY r.number DESC
                 LIMIT 3) zadnji) f ON true
     LEFT JOIN LATERAL ( SELECT ps.points
           FROM player_scores ps
             JOIN rounds r ON r.id = ps.round_id
          WHERE ps.player_id = po.id
          ORDER BY r.number DESC
         LIMIT 1) z ON true
     LEFT JOIN LATERAL ( SELECT r.id
           FROM rounds r
          WHERE r.competition_id = po.competition_id
            AND r.lineups_locked_at IS NOT NULL
          ORDER BY r.season DESC, r.number DESC
         LIMIT 1) zk ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS owners
           FROM fantasy_lineups fl
          WHERE fl.player_id = po.id AND fl.round_id = zk.id) l ON true;

create or replace view public.player_season_standings as
SELECT po.id,
    po.full_name,
    po."position",
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
        CASE
            WHEN ss.matches > 0 THEN round(ss.points / ss.matches::numeric, 2)
            ELSE 0::numeric
        END AS points_per_match,
        CASE
            WHEN po.value > 0::numeric THEN round(ss.points / po.value, 2)
            ELSE 0::numeric
        END AS points_per_value,
    COALESCE(z.points, 0::numeric) AS last_round,
    COALESCE(f.points, 0::numeric) AS form,
    CASE WHEN zk.id IS NULL THEN NULL::integer ELSE COALESCE(l.owners, 0) END AS owners,
    rank() OVER (PARTITION BY po.competition_id, ss.season ORDER BY ss.points DESC) AS rank,
    po.competition_id,
    ss.assists
   FROM player_overview po
     JOIN player_season_stats ss ON ss.player_id = po.id
     LEFT JOIN LATERAL ( SELECT ps.points
           FROM player_scores ps
             JOIN rounds r ON r.id = ps.round_id
          WHERE ps.player_id = po.id AND r.season = ss.season
          ORDER BY r.number DESC
         LIMIT 1) z ON true
     LEFT JOIN LATERAL ( SELECT sum(zadnji.points) AS points
           FROM ( SELECT ps.points
                   FROM player_scores ps
                     JOIN rounds r ON r.id = ps.round_id
                  WHERE ps.player_id = po.id AND r.season = ss.season
                  ORDER BY r.number DESC
                 LIMIT 3) zadnji) f ON true
     LEFT JOIN LATERAL ( SELECT r.id
           FROM rounds r
          WHERE r.competition_id = po.competition_id
            AND r.lineups_locked_at IS NOT NULL
          ORDER BY r.season DESC, r.number DESC
         LIMIT 1) zk ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS owners
           FROM fantasy_lineups fl
          WHERE fl.player_id = po.id AND fl.round_id = zk.id) l ON true;

-- Vrednost in proracun zive ekipe sta bila prav tako javna: oba sta sestevek
-- trenutnega kadra. Pogled odslej tece s pravicami klicatelja, zato zanju
-- velja ista politika kot za kader — lastnik vidi svojo ekipo, admin vse,
-- neprijavljeni nic.
alter view public.fantasy_team_wealth set (security_invoker = on);
alter view public.fantasy_team_budget set (security_invoker = on);
