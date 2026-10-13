-- Hitrejša branja (pregled pg_stat_statements, 13. 10. 2026).
--
-- 1. players(team_id): pogled competition_teams (stran kluba, izbirnik, zemljevid
--    strani) je po klubu bral vseh 320 000 igralcev — 40–60 ms na klic, ~45 000
--    klicev na teden.
-- 2. fantasy_teams(owner_id): edini kazali na lastnika sta delni (hisna / ne
--    hisna), zato je `owner_id = auth.uid()` (stanje_mojih_ekip, RLS) bral vso
--    tabelo — 5 milijonov prehodov na teden.
-- 3. player_season_standings: zadnji zaklenjeni krog lige in število ekip v njem
--    se je računal za vsakega igralca lige posebej (321 × 1770 vrstic posnetkov
--    pri članih), ker je odvečen pogoj ss.competition_id = po.competition_id
--    planerju pokvaril oceno. Statistika igralca je vedno iz njegove lige
--    (igralec je vrstica na ligo; 0 odstopanj v produkciji), zato zadošča
--    player_id. Igralec: 158 → 16 ms, lestvica lige: 142 → 14 ms.

create index if not exists players_team_idx on public.players (team_id);
create index if not exists fantasy_teams_owner_idx on public.fantasy_teams (owner_id);

create or replace view public.player_season_standings as
select po.id,
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
       ss.last_round,
       ss.form,
       case when zk.id is null or zk.ekip < 5 then null::integer
            else coalesce(l.owners, 0) end as owners,
       rank() over (partition by po.competition_id, ss.season order by ss.points desc) as rank,
       po.competition_id,
       ss.assists
  from public.player_overview po
  join public.statistika_igralcev ss
    on ss.player_id = po.id
  -- Zadnji zaklenjeni krog lige in število človeških ekip v njem: enkrat na
  -- ligo, ne na igralca (lateral na vrstico je bil 10× počasnejši).
  left join (
    select z.competition_id, z.id,
           (select count(distinct fl.fantasy_team_id)::integer
              from public.fantasy_lineups fl
             where fl.round_id = z.id
               and not exists (select 1 from public.fantasy_teams h
                                where h.id = fl.fantasy_team_id and h.hisna)) as ekip
      from (select distinct on (r.competition_id) r.competition_id, r.id
              from public.rounds r
             where r.lineups_locked_at is not null
             order by r.competition_id, r.season desc, r.number desc) z
  ) zk on zk.competition_id = po.competition_id
  left join lateral (
    select count(*)::integer as owners
      from public.fantasy_lineups fl
     where fl.player_id = po.id and fl.round_id = zk.id
       and not exists (select 1 from public.fantasy_teams h
                        where h.id = fl.fantasy_team_id and h.hisna)
  ) l on true;
