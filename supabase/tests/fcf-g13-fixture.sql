-- TEST ONLY. Exact football identity shape; invented names/statistics/values for
-- all synthetic participants. No source import or copied private/user rows.
-- The harness only runs in an explicitly disposable migrated CI database.
do $$ begin
 if exists(select 1 from rounds where competition_id=801) or exists(select 1 from players where competition_id=801) then raise exception 'Fresh disposable fixture required';end if;
end $$;
delete from competitions where id=801 or slug='es-ct-tercera-g13';
insert into competitions(id,slug,name,short_name,country_id,source,source_league_code,prvi_fantasy_krog,active) overriding system value
values(801,'es-ct-tercera-g13','G13 TEST ONLY','G13 TEST',(select id from countries where code='ES'),'fcf','4119076-4119315',6,false);
insert into teams(id,name,short_name,country_id,logo_url) overriding system value
select (j->>'id')::bigint,j->>'name','TEST',(select id from countries where code='ES'),'https://example.invalid/test.svg' from g13_input,jsonb_array_elements(plan->'teams')j;
insert into rounds(id,competition_id,season,number,deadline_at,played_on) overriding system value
select (j->>'id')::bigint,801,'2026/27',(j->>'number')::int,'2030-01-01T12:00Z'::timestamptz+(j->>'number')::int*interval '7 days','2030-01-01'::date+(j->>'number')::int*7 from g13_input,jsonb_array_elements(plan->'rounds')j;
insert into players(id,team_id,competition_id,reg_st,first_name,last_name,full_name,position,position_source,value,value_start,active) overriding system value
select (j->>'id')::bigint,(j->>'team_id')::bigint,801,(j->>'reg_st')::bigint,'Test',j->>'id','TEST ONLY '||(j->>'id'),
 case when (j->>'id')::bigint in(313532,313955) then 'GK' else 'MID' end,'admin',7,5,true from g13_input,jsonb_array_elements(plan->'players')j;
insert into players(id,team_id,competition_id,first_name,last_name,full_name,position,value,value_start) overriding system value
select -600000-t.id*100-i,t.id,801,'Test',i::text,'TEST ONLY opponent '||t.id||' '||i,case when i=1 then 'GK' else 'DEF' end,6,4.5 from teams t cross join generate_series(1,20)i where t.id between 8372 and 8386;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,imported_at) overriding system value
select (j->>'id')::bigint,(j->>'round_id')::bigint,(j->>'home_team_id')::bigint,(j->>'away_team_id')::bigint,(j->>'played_on')::date,
 case (j->>'id')::bigint when 309307 then 0 when 309324 then 2 when 309335 then 4 when 309352 then 7 when 427263 then 2 else 0 end,
 case (j->>'id')::bigint when 309307 then 2 when 309324 then 1 when 309335 then 0 when 309352 then 0 when 427263 then 1 else 0 end,
 case when (j->>'id')::bigint in(309307,309324,309335,309352,427263) then j->>'report' end,
 case when (j->>'id')::bigint in(309307,309324,309335,309352,427263) then '2026-10-18T00:00Z'::timestamptz end
from g13_input,jsonb_array_elements((plan->'retained')||(plan->'drop'))j;
create temporary table g13_played(id bigint,club_count int,other_count int,club_goals int) on commit drop;
insert into g13_played values(309307,16,16,0),(309324,17,17,1),(309335,16,15,4),(309352,16,18,7),(427263,15,14,2);
-- R5 uses its exact current-team 15, older reports rotate among all 21.
insert into appearances(match_id,player_id,team_id,shirt_number,started,minutes_played,minute_on,minute_off,is_goalkeeper)
select f.id,p.id,case when f.id=427263 then 10388 else 8371 end,p.i,p.i<=11,case when p.i<=11 then 90 else 15 end,case when p.i<=11 then 0 else 75 end,90,p.position='GK'
from g13_played f cross join lateral(select p.*,row_number() over(order by p.id) i from players p where p.team_id in(8371,10388) and (f.id<>427263 or p.team_id=10388))p where p.i<=f.club_count;
insert into appearances(match_id,player_id,team_id,shirt_number,started,minutes_played,minute_on,minute_off,is_goalkeeper)
select f.id,p.id,p.team_id,p.i,p.i<=11,case when p.i<=11 then 90 else 15 end,case when p.i<=11 then 0 else 75 end,90,p.position='GK'
from g13_played f join matches m on m.id=f.id cross join lateral(select p.*,row_number() over(order by p.id) i from players p where p.team_id=case when m.home_team_id in(8371,10388) then m.away_team_id else m.home_team_id end)p where p.i<=f.other_count;
insert into goals(match_id,team_id,scorer_id,minute,is_penalty)
select f.id,case when f.id=427263 then 10388 else 8371 end,313535,10+i,i=1 from g13_played f cross join lateral generate_series(1,f.club_goals)i;
update appearances a set goals=(select count(*) from goals g where g.match_id=a.match_id and g.scorer_id=a.player_id);
select recompute_round_scores(id) from rounds where competition_id=801;
-- Fake local auth fixture only; no outbound secrets exist in disposable CI.
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000013','g13-test@example.invalid','{"display_name":"G13 TEST ONLY"}');
-- Existing unrelated child for the concurrent FK-retarget probe.
insert into klub_predstavitev(team_id,opis) values(8372,'TEST ONLY');

-- Vote on the ordinary R5 goal whose team will be remapped; never on the
-- first generated goal (a penalty). STRICT makes absent/ambiguous setup fail.
do $$ declare eligible_goal bigint; begin
 select id into strict eligible_goal from goals
 where match_id=427263 and team_id=10388 and minute=12
   and not is_penalty and not is_own_goal
   and assist_player_id is null and assist_none_confirmed_at is null;
 insert into assist_votes(goal_id,voter_id,player_id)
 values(eligible_goal,'00000000-0000-4000-8000-000000000013',null);
end $$;
insert into profil_igralca_plus(player_id,tekma_id) values(313535,309307);
insert into zahtevki_igralca(id,player_id,user_id,status) overriding system value values(-613,313535,'00000000-0000-4000-8000-000000000013','zavrnjen');
insert into uradne_odsotnosti(player_id,zahtevek_id,user_id,vrsta,od,sezona,status,zaprto_at,ni_drzalo_datum,ni_drzalo_match_id)
 values(313535,-613,'00000000-0000-4000-8000-000000000013','drugo','2026-09-01','2026/27','ni_drzalo',now(),'2026-09-19',309307);
