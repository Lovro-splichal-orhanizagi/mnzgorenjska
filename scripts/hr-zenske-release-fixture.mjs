// TEST ONLY: seed one owned disposable database from synthetic observations.
// Never imported by operational code; no actual source claim or authority.
import {createHash} from 'node:crypto'
export function hnsWomenReleaseSeedSql(manifest) {
 const raw=JSON.stringify(manifest),sha=createHash('sha256').update(raw).digest('hex')
 if(raw.includes('$hns_seed_json$'))throw Error('Unexpected fixture delimiter')
 return `do $seed$
 declare v jsonb:=$hns_seed_json$${raw}$hns_seed_json$;cid bigint;entry jsonb;sid record;begin
 cid:=(public.prepare_hns_women_release(v::text,encode(sha256(convert_to(v::text,'UTF8')),'hex'))->>'competitionId')::bigint;
 create temporary table _hns_seed_people on commit drop as
 select distinct (a->>'sourcePersonId')::bigint person_id,a->>'fullName'full_name,b.team_id,(a->>'shirt_number')::int shirt,(a->>'is_goalkeeper')::boolean keeper
 from jsonb_array_elements(v->'persistedFixtures')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else '[]'::jsonb end)a join private_hns_women_release.club_bindings b on b.competition_id=cid and b.source_club_id=case a->>'side'when '0'then f->>'homeSourceClubId'else f->>'awaySourceClubId'end;
 insert into players(competition_id,reg_st,team_id,first_name,last_name,full_name,shirt_number,position,position_source,active,value)
 select cid,p.person_id,p.team_id,'TEST ONLY',p.full_name,p.full_name,p.shirt,
 case when keeper then 'GK'when shirt<=5 then 'DEF'when shirt<=9 then 'MID'else 'FWD'end,case when keeper then 'zapisnik'else 'ugibanje'end,
 exists(select 1 from jsonb_array_elements(v->'persistedFixtures')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else '[]'::jsonb end)a where f->>'season'='2026/27'and(a->>'sourcePersonId')::bigint=p.person_id),case when keeper then 4.5 when shirt=3 then 12 else 5 end
 from _hns_seed_people p;
 insert into matches(round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,home_goals,away_goals,source_round,source_phase,statistics_status,imported_at,import_warnings,kontumacija,vir_brez_izida)
 select r.id,h.team_id,a.team_id,(f->>'playedOn')::date,f->>'sourceMatchId',f->>'sourceUrl',coalesce((f->>'homeGoals')::int,0),coalesce((f->>'awayGoals')::int,0),(f->>'sourceRound')::int,f->>'sourcePhase','available',case when f->>'played'='true'then clock_timestamp()end,case when f->>'played'='true'then array(select jsonb_array_elements_text(f->'warnings'))else array[]::text[]end,false,false
 from jsonb_array_elements(v->'persistedFixtures')f join rounds r on r.competition_id=cid and r.season=f->>'season'and r.number=(f->>'internalRound')::int join private_hns_women_release.club_bindings h on h.competition_id=cid and h.source_club_id=f->>'homeSourceClubId'join private_hns_women_release.club_bindings a on a.competition_id=cid and a.source_club_id=f->>'awaySourceClubId'where f->>'statisticsStatus'='available';
 insert into appearances(match_id,player_id,team_id,shirt_number,started,minute_on,minute_off,minutes_played,goals,own_goals,penalties_scored,penalties_missed,yellow_cards,red_cards,goals_conceded,clean_sheet,is_goalkeeper)
 select m.id,p.id,case a->>'side'when '0'then m.home_team_id else m.away_team_id end,(a->>'shirt_number')::int,(a->>'started')::boolean,(a->>'minute_on')::int,(a->>'minute_off')::int,(a->>'minutes_played')::int,(a->>'goals')::int,(a->>'own_goals')::int,(a->>'penalties_scored')::int,(a->>'penalties_missed')::int,(a->>'yellow_cards')::int,(a->>'red_cards')::int,(a->>'goals_conceded')::int,(a->>'clean_sheet')::boolean,(a->>'is_goalkeeper')::boolean
 from jsonb_array_elements(v->'persistedFixtures')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else '[]'::jsonb end)a join matches m on m.zapisnik_id=f->>'sourceMatchId'join rounds r on r.id=m.round_id and r.competition_id=cid join players p on p.competition_id=cid and p.reg_st=(a->>'sourcePersonId')::bigint;
 insert into goals(match_id,scorer_id,team_id,minute,is_own_goal,is_penalty,score_home,score_away)
 select m.id,p.id,case g->>'side'when '0'then m.home_team_id else m.away_team_id end,(g->>'minute')::int,(g->>'is_own_goal')::boolean,(g->>'is_penalty')::boolean,(g->>'score_home')::int,(g->>'score_away')::int
 from jsonb_array_elements(v->'persistedFixtures')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'goals'else '[]'::jsonb end)g join matches m on m.zapisnik_id=f->>'sourceMatchId'join rounds r on r.id=m.round_id and r.competition_id=cid join players p on p.competition_id=cid and p.reg_st=(g->>'sourcePersonId')::bigint;
 for sid in select id from rounds where competition_id=cid loop perform public.recompute_round_scores(sid.id);end loop;
 perform public.osvezi_statistiko_igralcev(array(select id from players where competition_id=cid));
 perform set_config('hns.test.manifest',v::text,false);perform set_config('hns.test.sha',encode(sha256(convert_to(v::text,'UTF8')),'hex'),false);
 end $seed$;`
}
