// One explicitly owned disposable database, sequential regions, all rows ROLLBACK.
import {execFileSync}from'node:child_process'
import {nordWestPolicyFixture}from'./dfb-nord-west-historical-test-fixture.mjs'
import {preveriOdobritev,sha}from'./vklopi-dfb-regijo.mjs'
const container=process.env.SUPABASE_DB_CONTAINER,db=process.env.SUPABASE_TEST_DB
if(!container||!db)throw Error('Explicit disposable container AND database required')
const regions=process.env.DFB_TEST_REGION?[process.env.DFB_TEST_REGION]:['nord','west']
if(regions.some(r=>!['nord','west'].includes(r)))throw Error('Unknown disposable DFB test region')
for(const region of regions){
 const m=nordWestPolicyFixture(region),raw=JSON.stringify(m)+'\n';preveriOdobritev(raw,sha(raw))
 const unavailable=m.seasons.flatMap(s=>s.fixtures).filter(f=>f.statisticsStatus==='unavailable_historical').length
 const firstRound=Math.min(...m.seasons[1].fixtures.filter(f=>!f.played&&f.date===m.statisticsPolicy.firstFantasyPlayedOn).map(f=>f.round))
 const minimumSafeDate=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
 if(m.statisticsPolicy.firstFantasyPlayedOn<minimumSafeDate)throw Error(`TEST ONLY: ${region} launch candidate date must remain at least three days in the future`)
 const currentException=m.seasons[1].fixtures.findIndex(f=>f.statisticsStatus==='unavailable_historical')
 const sql=`begin;
set local statement_timeout='120s';
select set_config('slff.test_slug','${m.slug}',true);
create temporary table nw_packet(raw text);
insert into nw_packet values(convert_from(decode('${Buffer.from(raw).toString('base64')}','base64'),'UTF8'));
create temporary table nw_fixtures as select s->>'season'season,f from nw_packet cross join lateral jsonb_array_elements(raw::jsonb->'seasons')s cross join lateral jsonb_array_elements(s->'fixtures')f;
create function pg_temp.nw_prepare()returns jsonb language sql as $$select public.prepare_dfb_historical_statistics(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'))from nw_packet$$;
create function pg_temp.nw_check(activate boolean default false)returns jsonb language sql as $$select public.varen_vklop_dfb_regije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),activate)from nw_packet$$;
do $$declare c competitions%rowtype;r jsonb;begin
 select * into c from competitions where slug=current_setting('slff.test_slug');
 if c.id is null or c.active or c.source_policy is not null or exists(select 1 from rounds where competition_id=c.id)then raise exception 'Fresh inactive disposable target required';end if;
 if has_function_privilege('anon','public.prepare_dfb_historical_statistics(text,text)','EXECUTE')or has_function_privilege('authenticated','public.varen_vklop_dfb_regije(text,text,boolean)','EXECUTE')or has_function_privilege('service_role','private_dfb_release.varen_vklop_dfb_regije_policy_v4(text,text,boolean)','EXECUTE')then raise exception 'Private/service grants failed';end if;
 r:=pg_temp.nw_prepare();
 if r->>'prepared'is distinct from 'true'or(r->>'unavailableHistoricalCount')::int<>${unavailable} or(select count(*)from players where competition_id=c.id)<>0 or(select count(*)from matches m join rounds rr on rr.id=m.round_id where rr.competition_id=c.id)<>${unavailable} then raise exception 'Bootstrap invented statistics or omitted exact markers';end if;
 raise notice 'PASS exact ${region} empty bootstrap, no players';
end$$;
insert into teams(name,short_name,country_id)
 select names.name,names.name,c.country_id from(select f->>'home'name from nw_fixtures union select f->>'away'from nw_fixtures)names cross join competitions c
 where c.slug=current_setting('slff.test_slug')and not exists(select 1 from teams where country_id=c.country_id and name=names.name);
insert into rounds(competition_id,season,number,played_on,deadline_at)
 select c.id,ff.season,(ff.f->>'round')::int,min((ff.f->>'date')::date),min(((ff.f->>'date')::date+(ff.f->>'time')::time)at time zone'Europe/Berlin')-interval'6 hours'
 from nw_fixtures ff cross join competitions c where c.slug=current_setting('slff.test_slug')and not exists(select 1 from rounds r where r.competition_id=c.id and r.season=ff.season and r.number=(ff.f->>'round')::int)group by c.id,ff.season,ff.f->>'round';
create temporary table nw_people as select distinct a->>'name'name,case a->>'side'when'0'then f->>'home'else f->>'away'end club,(substring(a->>'name'from'([0-9]+)$'))::int n from nw_fixtures cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else'[]'::jsonb end)a;
insert into players(team_id,competition_id,first_name,last_name,full_name,position,position_source,value,value_start,active)
 select t.id,c.id,'TEST','ONLY',p.name,case when p.n=0 then'GK'when p.n<5 then'DEF'when p.n<9 then'MID'else'FWD'end,'zapisnik',case when p.n=0 then 8 else 4 end,case when p.n=0 then 8 else 4 end,
 exists(select 1 from nw_fixtures x where x.season='2026/27'and p.club in(x.f->>'home',x.f->>'away'))
 from nw_people p cross join competitions c join teams t on t.country_id=c.country_id where c.slug=current_setting('slff.test_slug')and t.name=p.club;
insert into matches(round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at,home_goals,away_goals,vir_brez_izida)
 select r.id,h.id,a.id,(f->>'date')::date,case when(f->>'played')::boolean then f->>'id'end,f->>'url',case when(f->>'played')::boolean then now()end,coalesce((f->>'homeGoals')::int,0),coalesce((f->>'awayGoals')::int,0),f->>'id' in('de-dfb-2423176','de-dfb-2423187','de-dfb-2423188')
 from nw_fixtures ff cross join competitions c join rounds r on r.competition_id=c.id join teams h on h.country_id=c.country_id join teams a on a.country_id=c.country_id
 where c.slug=current_setting('slff.test_slug')and r.season=ff.season and r.number=(f->>'round')::int and h.name=f->>'home'and a.name=f->>'away'and f->>'statisticsStatus'='available';
create temporary table nw_apps as select m.id match_id,p.id player_id,t.id team_id,a
 from nw_fixtures ff cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else'[]'::jsonb end)a
 cross join competitions c join rounds r on r.competition_id=c.id join matches m on m.round_id=r.id join teams t on t.country_id=c.country_id join players p on p.competition_id=c.id and p.team_id=t.id
 where c.slug=current_setting('slff.test_slug')and r.season=ff.season and r.number=(f->>'round')::int and m.zapisnik_id=f->>'id'and t.name=case a->>'side'when'0'then f->>'home'else f->>'away'end and p.full_name=a->>'name';
create function pg_temp.nw_insert_apps(seed boolean)returns void language sql as $$
 insert into appearances(match_id,player_id,team_id,shirt_number,started,minute_on,minute_off,minutes_played,goals,own_goals,penalties_scored,penalties_missed,yellow_cards,red_cards,goals_conceded,clean_sheet,is_goalkeeper)
 select match_id,player_id,team_id,(a->>'shirt_number')::int,(a->>'started')::boolean,(a->>'minute_on')::int,(a->>'minute_off')::int,(a->>'minutes_played')::int,(a->>'goals')::int,(a->>'own_goals')::int,(a->>'penalties_scored')::int,(a->>'penalties_missed')::int,(a->>'yellow_cards')::int,(a->>'red_cards')::int,(a->>'goals_conceded')::int,(a->>'clean_sheet')::boolean,(a->>'is_goalkeeper')::boolean
 from nw_apps where(match_id=(select min(match_id)from nw_apps))=seed;
$$;
select pg_temp.nw_insert_apps(true);
analyze public.players,public.rounds,public.matches,public.appearances,public.goals,public.player_scores,public.statistika_igralcev;
select pg_temp.nw_insert_apps(false);
insert into goals(match_id,scorer_id,team_id,minute,is_own_goal,is_penalty,score_home,score_away)
 select m.id,p.id,t.id,(g->>'minute')::int,(g->>'is_own_goal')::boolean,(g->>'is_penalty')::boolean,(g->>'score_home')::int,(g->>'score_away')::int
 from nw_fixtures ff cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'goals'else'[]'::jsonb end)g
 cross join competitions c join rounds r on r.competition_id=c.id join matches m on m.round_id=r.id join teams t on t.country_id=c.country_id join players p on p.competition_id=c.id and p.team_id=t.id
 where c.slug=current_setting('slff.test_slug')and r.season=ff.season and r.number=(f->>'round')::int and m.zapisnik_id=f->>'id'and t.name=case g->>'side'when'0'then f->>'home'else f->>'away'end and p.full_name=g->>'name';
analyze public.players,public.rounds,public.matches,public.appearances,public.goals,public.player_scores,public.statistika_igralcev;
do $$declare postponed_ids text[]:=array['de-dfb-2423176','de-dfb-2423187','de-dfb-2423188'];begin
 if current_setting('slff.test_slug')<>'de-regionalliga-nord' then return;end if;
 if (select count(*)from nw_fixtures where f->>'id'=any(postponed_ids)and season='2026/27'and(f->>'played')::boolean=false)<>3
  or (select count(*)from matches m join rounds r on r.id=m.round_id join competitions c on c.id=r.competition_id where c.slug=current_setting('slff.test_slug')and r.season='2026/27'and m.source_url like any(array['%2423176','%2423187','%2423188'])and m.vir_brez_izida and m.imported_at is null and m.zapisnik_id is null and m.home_goals=0 and m.away_goals=0)<>3
  or exists(select 1 from appearances ap join matches m on m.id=ap.match_id where m.source_url like any(array['%2423176','%2423187','%2423188']))
  or exists(select 1 from goals g join matches m on m.id=g.match_id where m.source_url like any(array['%2423176','%2423187','%2423188'])) then raise exception 'Source-confirmed postponed fixture test setup differs';end if;
end$$;
grant select on nw_packet to service_role;
set local role service_role;
select public.prepare_dfb_historical_statistics(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'))from nw_packet;
select public.varen_vklop_dfb_regije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),false)from nw_packet;
reset role;
create function pg_temp.nw_reject(label text,mutation text)returns void language plpgsql as $$declare rejected boolean:=false;begin
 begin execute mutation;begin perform pg_temp.nw_check();exception when others then if sqlerrm not like'DE_RELEASE:%'and sqlerrm not like'HISTORICAL_POLICY:%'and sqlstate<>'23505'then raise;end if;rejected:=true;end;if not rejected then raise exception'MUTANT ACCEPTED: %',label;end if;raise exception'EXPECTED_MUTANT_REJECTION';exception when raise_exception then if sqlerrm<>'EXPECTED_MUTANT_REJECTION'then raise;end if;end;
 raise notice'PASS %',label;
end$$;
do $$begin if current_setting('slff.test_slug')='de-regionalliga-nord' then
 perform pg_temp.nw_reject('played fixture marked source without result',$x$update matches set vir_brez_izida=true where id=(select id from matches where source_url like '%TEST-ONLY%' and imported_at is not null limit 1)$x$);
 perform pg_temp.nw_reject('unplayed fixture with imported timestamp','update matches set imported_at=now() where source_url like ''%2423176''');
 perform pg_temp.nw_reject('unplayed fixture with report ID','update matches set zapisnik_id=''de-dfb-2423176'' where source_url like ''%2423176''');
 perform pg_temp.nw_reject('unplayed fixture with score','update matches set home_goals=1 where source_url like ''%2423176''');
 perform pg_temp.nw_reject('unplayed fixture with appearance',$x$insert into appearances(match_id,player_id,team_id,shirt_number,started,minute_on,minute_off,minutes_played,goals,own_goals,penalties_scored,penalties_missed,yellow_cards,red_cards,goals_conceded,clean_sheet,is_goalkeeper) select m.id,p.id,m.home_team_id,99,false,0,1,1,0,0,0,0,0,0,0,false,false from matches m join players p on p.team_id=m.home_team_id where m.source_url like '%2423176'limit 1$x$);
 perform pg_temp.nw_reject('unplayed fixture with goal',$x$insert into goals(match_id,scorer_id,team_id,minute,is_own_goal,is_penalty,score_home,score_away) select m.id,p.id,m.home_team_id,1,false,false,1,0 from matches m join players p on p.team_id=m.home_team_id where m.source_url like '%2423176'limit 1$x$);
 perform pg_temp.nw_reject('wrong unplayed fixture date','update matches set played_on=played_on+1 where source_url like ''%2423176''');
 perform pg_temp.nw_reject('unplayed fixture marked forfait','update matches set kontumacija=true where source_url like ''%2423176''');
end if;end$$;
select pg_temp.nw_reject('changed normal appearance','update appearances set minutes_played=89 where id=(select min(ap.id)from appearances ap join players p on p.id=ap.player_id where p.competition_id=(select id from competitions where slug=current_setting(''slff.test_slug'')))');
select pg_temp.nw_reject('wrong policy hash',$x$update nw_packet set raw=jsonb_set(raw::jsonb,'{statisticsPolicy,sha256}',to_jsonb(repeat('0',64)))::text$x$);
select pg_temp.nw_reject('wrong current parent conclusion',$x$update nw_packet set raw=jsonb_set(raw::jsonb,'{seasons,1,lineage,capture,conclusion}','"${region==='west'?'success':'failure'}"')::text$x$);
select pg_temp.nw_reject('guessed unavailable arrays',$x$update nw_packet set raw=replace(raw,'"starters":null','"starters":[]')$x$);
select pg_temp.nw_reject('all default prices','update players set value=4.5 where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))');
select pg_temp.nw_reject('wrong official GK position','update players set position=''MID''where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and position=''GK''');
select pg_temp.nw_reject('wrong future deadline','update rounds set deadline_at=deadline_at+interval''1 hour''where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and season=''2026/27''and number=${firstRound}');
select pg_temp.nw_reject('changed raw exception hash',$x$update nw_packet set raw=replace(raw,'${m.seasons[0].fixtures.find(f=>f.statisticsStatus==='unavailable_historical').sourceRawSha256}',repeat('0',64))$x$);
${currentException<0?'':`select pg_temp.nw_reject('current unavailable wrong season',$x$update nw_packet set raw=jsonb_set(raw::jsonb,'{seasons,1,fixtures,${currentException},sourceFixture,season}','"2025/26"')::text$x$);
select pg_temp.nw_reject('current exclusion reaches launch',$x$update nw_packet set raw=jsonb_set(raw::jsonb,'{statisticsPolicy,firstFantasyPlayedOn}','"2026-10-20"')::text$x$);`}
do $$begin begin update competitions set active=true where slug=current_setting('slff.test_slug');raise exception'direct activation accepted';exception when others then if sqlerrm='direct activation accepted'then raise;end if;end;end$$;
set local role service_role;
select public.varen_vklop_dfb_regije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),true)from nw_packet;
reset role;
do $$begin if not exists(select 1 from competitions where slug=current_setting('slff.test_slug')and active and prvi_fantasy_krog=${firstRound})then raise exception'atomic policy v4 activation failed';end if;end$$;
rollback;
`
 execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','inherit','inherit']})
}
