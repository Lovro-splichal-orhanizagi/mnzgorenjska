import {execFileSync} from 'node:child_process'
import {syntheticHnsWomenManifest} from './hr-zenske-test-fixture.mjs'
import {hnsWomenReleaseSeedSql} from './hr-zenske-release-fixture.mjs'
const container=process.env.SUPABASE_DB_CONTAINER,database=process.env.SUPABASE_TEST_DB
if(!container||!database||database==='postgres'||process.env.HISTORICAL_STATISTICS_DISPOSABLE_TEST!=='1')throw Error('Explicit owned removable clone required')
const run=sql=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','inherit','inherit']})
run(`begin;${hnsWomenReleaseSeedSql(syntheticHnsWomenManifest())}
create function pg_temp.hns_reject_after(change text,expected text)returns void language plpgsql as $$begin begin execute change;perform public.check_hns_women_release(current_setting('hns.test.manifest'),current_setting('hns.test.sha'),true);exception when others then if sqlerrm !~ expected then raise exception 'HNS TEST wrong refusal: %; change: %',sqlerrm,change;end if;return;end;raise exception 'HNS TEST accepted bad state: %',change;end $$;
do $test$declare c bigint;first_round bigint;first_deadline timestamptz;r jsonb;app bigint;goal bigint;person bigint;uid uuid;other bigint;changed jsonb;begin
 select id into c from competitions where slug='hr-prva-hnlz';select id,deadline_at into first_round,first_deadline from rounds where competition_id=c and season='2026/27'and number=9;
 set local timezone='Europe/Zagreb';
 r:=public.check_hns_women_release(current_setting('hns.test.manifest'),current_setting('hns.test.sha'));
 set local timezone='UTC';
 if r->'verified'<>'true'::jsonb or r->'active'<>'false'::jsonb or r->>'fixtures'<>'131'or r->>'unavailableHistorical'<>'3'or(r->>'cheapestLegal15')::numeric>100 or exists(select 1 from private_historical_statistics.release_authorizations where competition_id=c)or(select active from competitions where id=c)then raise exception 'HNS TEST nonmutating successful check failed';end if;
 if r->>'statisticsPolicySha256'is distinct from current_setting('hns.test.manifest')::jsonb#>>'{statisticsPolicy,sha256}'or r->'sourceBudget'is distinct from current_setting('hns.test.manifest')::jsonb->'sourceBudget'or jsonb_array_length(r->'originalCaptures')is distinct from 2 or r->>'deadlineReason'is distinct from 'fantasy_midnight_date_only'then raise exception 'HNS TEST policy/original receipt/cutoff proof absent';end if;
 if(select sum(a.minutes_played)from appearances a join matches m on m.id=a.match_id join rounds ro on ro.id=m.round_id where ro.competition_id=c and m.zapisnik_id='100511758'and a.team_id=m.away_team_id and a.is_goalkeeper)<>89 then raise exception 'HNS TEST published89keeperminutes changed';end if;
 insert into competitions(slug,name,short_name,country_id,source,active)values('hns-test-other','TEST ONLY other','TEST ONLY',(select country_id from competitions where id=c),'hns',false)returning id into other;
 select a.id,a.player_id into app,person from appearances a join matches m on m.id=a.match_id join rounds ro on ro.id=m.round_id where ro.competition_id=c and a.started and not a.is_goalkeeper limit 1;
 select g.id into goal from goals g join matches m on m.id=g.match_id join rounds ro on ro.id=m.round_id where ro.competition_id=c limit 1;
 perform pg_temp.hns_reject_after(format('insert into players(competition_id,team_id,first_name,last_name,full_name,reg_st,position,position_source,active,value)select %s,team_id,first_name,last_name,full_name,reg_st,position,position_source,active,value from players where id=%s;update appearances set player_id=(select id from players where competition_id=%s)where id=%s',other,person,other,app),'appearance multiset');
 perform pg_temp.hns_reject_after(format('insert into rounds(competition_id,season,number,played_on)values(%s,''2026/27'',1,current_date);insert into matches(round_id,home_team_id,away_team_id,played_on)select r.id,b.team_id,a.team_id,current_date from rounds r join private_hns_women_release.club_bindings b on b.competition_id=%s and b.source_club_id=''171''join private_hns_women_release.club_bindings a on a.competition_id=%s and a.source_club_id=''649''where r.competition_id=%s;insert into appearances(match_id,player_id,team_id,shirt_number,started,minute_on,minute_off,minutes_played,is_goalkeeper)select m.id,a.player_id,a.team_id,a.shirt_number,a.started,a.minute_on,a.minute_off,a.minutes_played,a.is_goalkeeper from matches m join rounds r on r.id=m.round_id cross join appearances a where r.competition_id=%s and a.id=%s',other,c,c,other,other,app),'cross-competition');
 perform pg_temp.hns_reject_after(format('update appearances set goals=goals+1 where id=%s',app),'appearance multiset');
 perform pg_temp.hns_reject_after(format('update appearances set penalties_saved=1 where id=%s',app),'penalty-save');
 perform pg_temp.hns_reject_after(format('delete from appearances where id=%s',app),'appearance multiset');
 perform pg_temp.hns_reject_after(format('update players set reg_st=reg_st+1000000000 where id=%s',person),'appearance multiset');
 perform pg_temp.hns_reject_after(format('update goals set minute=minute+1 where id=%s',goal),'goal multiset');
 perform pg_temp.hns_reject_after(format('delete from goals where id=%s',goal),'goal multiset');
 perform pg_temp.hns_reject_after(format('update matches set imported_at=null where id=(select m.id from matches m join rounds r on r.id=m.round_id where r.competition_id=%s and m.zapisnik_id=''100511726'')',c),'fixture/header/completeness');
 perform pg_temp.hns_reject_after(format('update matches set imported_at=clock_timestamp()where id=(select m.id from matches m join rounds r on r.id=m.round_id where r.competition_id=%s and m.zapisnik_id=''114471646'')',c),'fixture/header/completeness');
 perform pg_temp.hns_reject_after(format('update matches set source_round=99 where id=(select m.id from matches m join rounds r on r.id=m.round_id where r.competition_id=%s and m.zapisnik_id=''100511726'')',c),'fixture/header/completeness');
 perform pg_temp.hns_reject_after(format('update players set active=false where id=%s',person),'player identity/club/role/pool');
 perform pg_temp.hns_reject_after(format('update players set position=''DEF''where competition_id=%s and position=''GK''',c),'player identity/club/role/pool');
 perform pg_temp.hns_reject_after(format('update players set value=4.5 where competition_id=%s',c),'pricing/affordable');
 perform pg_temp.hns_reject_after(format('update players set value=12 where competition_id=%s',c),'pricing/affordable');
 perform pg_temp.hns_reject_after(format('update players set position=''DEF''where competition_id=%s and position<>''GK'';select public.recompute_round_scores(id)from rounds where competition_id=%s;select public.osvezi_statistiko_igralcev(array(select id from players where competition_id=%s))',c,c,c),'pricing/affordable');
 perform pg_temp.hns_reject_after(format('update player_scores set points=points+1 where round_id=(select min(id)from rounds where competition_id=%s)',c),'round-score cache');
 perform pg_temp.hns_reject_after(format('update statistika_igralcev set minutes=minutes+1 where competition_id=%s',c),'season/form cache');
 perform pg_temp.hns_reject_after(format('update rounds set lineups_locked_at=clock_timestamp()where id=%s',first_round),'future complete unlocked');
 perform pg_temp.hns_reject_after(format('insert into private_hns_women_release.round_authorizations select competition_id,season,number,txid_current(),played_on,clock_timestamp()-interval ''1 second''from rounds where id=%s on conflict(competition_id,season,number,authorized_xid)do update set deadline_at=excluded.deadline_at;update rounds set deadline_at=(select deadline_at from private_hns_women_release.round_authorizations where competition_id=%s and season=''2026/27''and number=9 and authorized_xid=txid_current())where id=%s',first_round,c,first_round),'future complete unlocked|deadline/receipt');
 foreach changed in array array[jsonb_set(current_setting('hns.test.manifest')::jsonb,'{releaseReady}','false'),jsonb_set(current_setting('hns.test.manifest')::jsonb,'{schedules,1,capturedAt}',to_jsonb((clock_timestamp()-interval '13 hours')::text)),jsonb_set(current_setting('hns.test.manifest')::jsonb,'{persistedFixtures,0,statisticsStatus}','"unavailable_historical"')]loop
  perform pg_temp.hns_reject_after(format('select public.check_hns_women_release(%L,%L,false)',changed::text,encode(sha256(convert_to(changed::text,'UTF8')),'hex')),'elapsed prelaunch|capture freshness|exact3historical');
 end loop;
 -- Neither a spoofable GUC nor the generic activation helper can mint authority.
 perform set_config('hns.release.authorized','true',true);
 perform pg_temp.hns_reject_after(format('update competitions set active=true where id=%s',c),'HISTORICAL_POLICY');
 r:=public.vklopi_ligo_sredi_sezone('hr-prva-hnlz');if r->>'vklopljena'is distinct from 'false'or coalesce(r->>'razlog','')!~'HISTORICAL_POLICY'or(select active from competitions where id=c)then raise exception 'HNS TEST generic activation bypassed authority: %',r;end if;
 -- One synthetic user row is created inside a subtransaction and rolled back.
 uid:=gen_random_uuid();insert into auth.users(id,email)values(uid,'hns-test-only@example.invalid');
 insert into profiles(id,display_name)values(uid,'HNS TEST ONLY')on conflict(id)do nothing;
 perform pg_temp.hns_reject_after(format('insert into fantasy_teams(owner_id,name,competition_id)values(%L,''HNS TEST ONLY'',%s)',uid,c),'user-owned activity');
 delete from profiles where id=uid;delete from auth.users where id=uid;
 if has_function_privilege('anon','public.check_hns_women_release(text,text,boolean)','execute')or has_function_privilege('authenticated','public.check_hns_women_release(text,text,boolean)','execute')or not has_function_privilege('service_role','public.check_hns_women_release(text,text,boolean)','execute')or has_schema_privilege('service_role','private_historical_statistics','usage')then raise exception 'HNS TEST service/private authority ACL failed';end if;
 -- The complete HNS gate is also exercised as its intended service caller.
 set local role service_role;
 r:=public.check_hns_women_release(current_setting('hns.test.manifest'),current_setting('hns.test.sha'),true);
 reset role;
 if(select active from competitions where id=other)then raise exception 'HNS TEST activated another competition';end if;
 if r->'active'<>'true'::jsonb or not(select active from competitions where id=c)or not exists(select 1 from private_historical_statistics.release_authorizations where competition_id=c and authorized_xid=txid_current())or not exists(select 1 from rounds where id=first_round and deadline_at=first_deadline and lineups_locked_at is null)then raise exception 'HNS TEST same-TX guarded activation failed';end if;
 raise notice 'HNS full131canonical gate, native observations,89GK,prices/legal15,refusals,service activation PASS';
end $test$;rollback;`)
for(const isolation of ['repeatable read','serializable']) {
 let refused=false
 try{execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-v','ON_ERROR_STOP=1'],{input:`begin isolation level ${isolation};select public.check_hns_women_release('{}',repeat('a',64),false);`,stdio:['pipe','pipe','pipe']})}
 catch(error){if(!error.stderr?.toString().includes('READ COMMITTED required'))throw error;refused=true}
 if(!refused)throw Error(`HNS TEST ${isolation} accepted`)
 console.log(`PASS ${isolation} refuses before state reads`)
}
for(const role of ['anon','authenticated','service_role']) {
 const query=role==='service_role'?"select private_historical_statistics.authorize_release(0,'test',repeat('a',64),repeat('b',64));":"select public.check_hns_women_release('{}',repeat('a',64),true);"
 let refused=false
 try{execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-v','ON_ERROR_STOP=1'],{input:`set role ${role};${query}`,stdio:['pipe','pipe','pipe']})}
 catch(error){if(!error.stderr?.toString().includes('permission denied'))throw error;refused=true}
 if(!refused)throw Error(`HNS TEST ${role} crossed private/service authority`)
 console.log(`PASS ${role} cannot cross the release authority boundary`)
}
