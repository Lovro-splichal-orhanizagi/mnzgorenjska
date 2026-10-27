-- Synthetic native-contract fixture. Source/parser tests separately replay genuine
-- retained FUSSBALL bytes. This transaction never survives a passing or failed run.
begin;
set local lock_timeout='20s';
set local statement_timeout='240s';
create function pg_temp.card_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'CARD_TEST: %',message;end if;end$$;
create function pg_temp.card_reject(query text,expected text)returns void language plpgsql as $$begin
 begin execute query;exception when others then
  if sqlerrm like '%'||expected||'%'then return;else raise;end if;
 end;raise exception 'CARD_TEST: unexpectedly accepted %',query;
end$$;
grant execute on function pg_temp.card_assert(boolean,text),pg_temp.card_reject(text,text)to anon,authenticated,service_role;
create temporary table card_fixture(key text primary key,value jsonb);
grant select on card_fixture to anon,authenticated,service_role;
create temporary table card_players(idx integer primary key,player_id bigint,team_id bigint,source_id text,reg_st bigint);
grant select on card_players to anon,authenticated,service_role;
do $$
declare cid bigint;other_cid bigint;home bigint;away bigint;rid bigint;mid bigint;pid bigint;idx integer;sid text;reg bigint;roster jsonb:='[]';candidates jsonb:='[]';apps jsonb:='[]';cards jsonb;envelope jsonb;bundle jsonb;revision text;v text;uid uuid;users uuid[]:=array['bca00000-0000-4000-8000-000000000001','bca00000-0000-4000-8000-000000000002','bca00000-0000-4000-8000-000000000003','bca00000-0000-4000-8000-000000000004','bca00000-0000-4000-8000-000000000005']::uuid[];goal jsonb;
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 insert into competitions(slug,name,short_name,country_id,source,source_league_code,active)values('de-card-native-fixture','Card native fixture','Cards',(select id from countries where code='DE'),'fussball-public',repeat('A',32)||'-G:2026/27',false)returning id into cid;
 insert into competitions(slug,name,short_name,country_id,source,source_league_code,active)values('de-card-foreign-fixture','Card foreign fixture','Foreign',(select id from countries where code='DE'),'fussball-public',repeat('C',32)||'-G:2026/27',false)returning id into other_cid;
 insert into teams(name,country_id)values('CARD SYNTHETIC HOME',(select id from countries where code='DE'))returning id into home;
 insert into teams(name,country_id)values('CARD SYNTHETIC AWAY',(select id from countries where code='DE'))returning id into away;
 insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',1,current_date-3,clock_timestamp()-interval'3 days')returning id into rid;
 insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on)values(rid,home,away,1,0,current_date-3)returning id into mid;
 foreach uid in array users loop
  insert into auth.users(id,email,raw_user_meta_data)values(uid,'card-synthetic-'||uid||'@example.invalid','{}');
  insert into profiles(id,display_name)values(uid,'Cardfixture '||right(uid::text,4))on conflict(id)do nothing;
 end loop;
 update profiles set insider_competition_id=other_cid where id=users[4];
 update profiles set insider_competition_id=cid where id=users[5];
 for idx in 1..24 loop
  sid:='de-fussball-player-id-'||lpad(upper(to_hex(idx)),32,'0');
  select reg_st into reg from public.fussball_reserve_player_ids(array[sid]);
  insert into players(first_name,last_name,full_name,team_id,competition_id,reg_st,position,position_source,active,value,value_start)
  values('Synthetic','Card '||idx,'Synthetic Card '||idx,case when idx<=12 then home else away end,cid,reg,case when idx in(1,13)then'GK'else'DEF'end,'zapisnik',true,6,6)returning id into pid;
  insert into card_players values(idx,pid,case when idx<=12 then home else away end,sid,reg);
  roster:=roster||jsonb_build_array(jsonb_build_object('sourceId',sid,'regSt',reg,'side',case when idx<=12 then 0 else 1 end,'name','Synthetic Card '||idx,'shirt',((idx-1)%12)+1,'starter',idx not in(12,24),'goalkeeper',idx in(1,13)));
  candidates:=candidates||jsonb_build_array(jsonb_build_object('source_id',sid,'player_id',pid,'team_id',case when idx<=12 then home else away end));
  if idx not in(12,24)then
   apps:=apps||jsonb_build_array(jsonb_build_object('player_id',pid,'team_id',case when idx<=12 then home else away end,'shirt_number',((idx-1)%12)+1,'started',true,'minute_on',0,'minute_off',90,'minutes_played',90,'goals',case when idx=2 then 1 else 0 end,'own_goals',0,'penalties_scored',0,'penalties_missed',0,'penalties_saved',0,'yellow_cards',0,'red_cards',0,'red_card_minute',null,'goals_conceded',case when idx>12 then 1 else 0 end,'clean_sheet',idx<=12,'is_goalkeeper',idx in(1,13)));
  end if;
 end loop;
 goal:=jsonb_build_array(jsonb_build_object('scorer_id',(select player_id from card_players cp where cp.idx=2),'team_id',home,'minute',35,'is_own_goal',false,'is_penalty',false,'score_home',1,'score_away',0));
 perform public.zamenjaj_nastope_tekme(mid,apps,goal);
 update goals set assist_player_id=(select player_id from card_players cp where cp.idx=3),assist_confirmed_at=clock_timestamp()where match_id=mid;
 update matches set imported_at=clock_timestamp()where id=mid;
 perform public.recompute_round_scores(rid);
 bundle:=jsonb_build_object('report',jsonb_build_object('base64',encode(convert_to('synthetic report','UTF8'),'base64'),'sha256',private_fussball.sha('synthetic report')),'lineup',jsonb_build_object('base64',encode(convert_to('synthetic lineup','UTF8'),'base64'),'sha256',private_fussball.sha('synthetic lineup')),'fonts',jsonb_build_array(jsonb_build_object('fontId','abc123ef','base64',encode(convert_to('synthetic font','UTF8'),'base64'),'sha256',private_fussball.sha('synthetic font'))));
 revision:=private_fussball.sha((bundle#>>'{report,sha256}')||E'\n'||(bundle#>>'{lineup,sha256}')||E'\nabc123ef:'||(bundle#>>'{fonts,0,sha256}'));
 cards:=jsonb_build_array(jsonb_build_object('eventKey',private_fussball.sha('de-fussball-'||repeat('D',32)||':'||revision||':0:'||repeat('e',64)),'ordinal',0,'eventSha256',repeat('e',64),'type','red','side',0,'minute',60,'base',60,'added',0,'half',2,'officialSourceId',null));
 envelope:=jsonb_build_object('version',1,'reportId','de-fussball-'||repeat('D',32),'matchId',repeat('D',32),'sourceUrl','https://www.fussball.de/spiel/-/spiel/'||repeat('D',32),'season','2026/27','round',1,'date',(current_date-3)::text,'time','15:00','homeName','CARD SYNTHETIC HOME','awayName','CARD SYNTHETIC AWAY','score',jsonb_build_object('domaci',1,'gostje',0),'revisionSha256',revision,'cards',cards,'roster',roster,'bundle',bundle);
 insert into card_fixture values('cid',to_jsonb(cid)),('other_cid',to_jsonb(other_cid)),('mid',to_jsonb(mid)),('rid',to_jsonb(rid)),('envelope',envelope),('candidates',candidates),('apps',apps),('goals',goal),('users',to_jsonb(users));
 perform public.install_fussball_card_policy(cid,repeat('A',32)||'-G:2026/27',array[repeat('B',32)||'-G:2025/26']);
end$$;
-- Ordinary owner/service-granted internal release callers do not set a REST
-- JWT. The new policy must not change their existing activation contract.
do $$declare res jsonb;begin
 perform set_config('request.jwt.claim.role','',true);
 res:=public.vklopi_ligo_sredi_sezone('community-test-missing-ordinary-league');
 perform pg_temp.card_assert(res->>'vklopljena'='false'and res->>'razlog'='Lige ni.','ordinary activation delegates before community-only JWT check');
 perform set_config('request.jwt.claim.role','service_role',true);
end$$;
-- No private originals, mappings, voter identities or service mutation RPC leaks.
set local role anon;
select pg_temp.card_reject('select * from private_fussball.card_reports','permission denied');
select pg_temp.card_reject('select * from private_fussball.card_votes','permission denied');
select pg_temp.card_reject('select public.get_fussball_card_policy(1)','permission denied');
reset role;
set local role authenticated;
select pg_temp.card_reject('select * from private_fussball.card_reports','permission denied');
select pg_temp.card_reject('select public.register_fussball_card_report(1,null,1,null,null)','permission denied');
reset role;
-- Same revision cannot accept modified bytes, fixture or source roster/mapping.
do $$declare cid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='cid');mid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='mid');e jsonb:=(select value from card_fixture where key='envelope');c jsonb:=(select value from card_fixture where key='candidates');res jsonb;
begin
 perform pg_temp.card_reject(format('select public.register_fussball_card_report(%s,%L,%s,%L,%L)',cid,repeat('A',32)||'-G:2026/27',mid,jsonb_set(e,'{bundle,report,base64}',to_jsonb(encode(convert_to('tamper','UTF8'),'base64'))),c),'hash');
 perform pg_temp.card_reject(format('select public.register_fussball_card_report(%s,%L,%s,%L,%L)',cid,repeat('A',32)||'-G:2026/27',mid,jsonb_set(e,'{round}','2'),c),'fixture');
 perform pg_temp.card_reject(format('select public.register_fussball_card_report(%s,%L,%s,%L,%L)',cid,repeat('A',32)||'-G:2026/27',mid,e,jsonb_set(c,'{0,player_id}',c#>'{13,player_id}')),'candidate');
 res:=public.register_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,e,c);
 perform pg_temp.card_assert(res->>'statistics_pending'='true','anonymous red stays pending');
 perform pg_temp.card_assert((select home_goals=1 and away_goals=0 and imported_at is null and statistics_status='pending_cards'from matches where id=mid),'source score retained');
 perform pg_temp.card_assert(not exists(select 1 from appearances where match_id=mid)and not exists(select 1 from goals where match_id=mid)and not exists(select 1 from player_scores where round_id=(select(value#>>'{}')::bigint from card_fixture where key='rid')),'pending revision clears individual rows and old score exposure');
 perform pg_temp.card_assert((select golov is null and brez_asistence is null and not glasovanje_odprto from match_assist_status where match_id=mid),'pending public counters unavailable');
 perform pg_temp.card_assert(public.dfb_round_has_pending((select(value#>>'{}')::bigint from card_fixture where key='rid')),'completion/email persistent pending predicate');
 perform pg_temp.card_assert(public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27')='[]','red without threshold not replayable');
 perform pg_temp.card_reject('select public.vklopi_ligo_sredi_sezone(''de-card-native-fixture'')','admission required');
 perform pg_temp.card_reject(format('update competitions set active=true where id=%s',cid),'dedicated activation');
 insert into card_fixture values('event',to_jsonb((select ce.id from private_fussball.card_events ce join private_fussball.card_heads h on h.report_id=ce.report_id where h.match_id=mid)));
 perform pg_temp.card_reject(format('select public.register_fussball_card_report(%s,%L,%s,%L,%L)',cid,repeat('A',32)||'-G:2026/27',mid,jsonb_set(e,'{roster,0,name}','"Different"'),c),'immutable');
 perform pg_temp.card_reject(format('update matches set statistics_status=''available'',statistics_reason=null,imported_at=now()where id=%s',mid),'verified');
 -- Even a full admission receipt cannot bypass native price/affordability gates.
 declare archive_round bigint;archive_match bigint;opening_round bigint;opening_match bigint;manifest jsonb;ready jsonb;receipt jsonb;fid bigint;
 begin
  insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2025/26',1,current_date-400,clock_timestamp()-interval'400 days')returning id into archive_round;
  insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at)
  select archive_round,m.home_team_id,m.away_team_id,1,0,current_date-400,'de-fussball-'||repeat('E',32),'https://www.fussball.de/spiel/-/spiel/'||repeat('E',32),clock_timestamp()from matches m where m.id=mid returning id into archive_match;
  perform public.zamenjaj_nastope_tekme(archive_match,(select value from card_fixture where key='apps'),(select value from card_fixture where key='goals'));
  insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',2,current_date+10,clock_timestamp()+interval'9 days')returning id into opening_round;
  insert into matches(round_id,home_team_id,away_team_id,played_on)select opening_round,m.home_team_id,m.away_team_id,current_date+10 from matches m where m.id=mid returning id into opening_match;
  ready:=public.check_fussball_card_readiness(cid,repeat('A',32)||'-G:2026/27');
  manifest:=jsonb_build_object('version',1,'currentCode',repeat('A',32)||'-G:2026/27','archiveCodes',jsonb_build_array(repeat('B',32)||'-G:2025/26'),'sourceProofSha256',repeat('1',64),'nightlyCacheSha256',repeat('2',64),'pendingInventorySha256',ready->>'pending_inventory_sha256','openingRoundId',opening_round,'playedReports',jsonb_build_array(jsonb_build_object('matchId',mid,'reportId',e->>'reportId','revisionSha256',e->>'revisionSha256'),jsonb_build_object('matchId',archive_match,'reportId','de-fussball-'||repeat('E',32))));
  receipt:=public.record_fussball_card_admission(cid,repeat('A',32)||'-G:2026/27',manifest,private_fussball.sha(private_fussball.canonical_json(manifest)));
  perform pg_temp.card_assert(receipt->>'registered'='true','exact pending current plus complete archive source inventory can be admitted');
  perform pg_temp.card_reject('select public.vklopi_ligo_sredi_sezone(''de-card-native-fixture'')','veljavnega kadra');
  perform pg_temp.card_assert((select not active from competitions where id=cid),'full source admission preserves normal native readiness gates');
  insert into fantasy_teams(owner_id,name,competition_id)values('bca00000-0000-4000-8000-000000000001','Synthetic card fantasy',cid)returning id into fid;
  insert into fantasy_lineups(round_id,fantasy_team_id,player_id,is_starter,is_captain)values((select(value#>>'{}')::bigint from card_fixture where key='rid'),fid,(select player_id from card_players cp where cp.idx=2),true,true);
  perform public.osvezi_tocke_krogov(array[(select(value#>>'{}')::bigint from card_fixture where key='rid')]);
  perform pg_temp.card_assert(not exists(select 1 from tocke_krogov where fantasy_team_id=fid),'pending fantasy autosub/zero result is not cached');
  perform pg_temp.card_assert((select points is null and statistics_pending from fantasy_round_points where fantasy_team_id=fid),'pending public fantasy result is explicitly unavailable');
  perform pg_temp.card_assert((select rank is null and statistics_pending from fantasy_round_standings where fantasy_team_id=fid),'pending round rank unavailable');
  perform pg_temp.card_assert((select statistics_pending from fantasy_team_standings where fantasy_team_id=fid),'cumulative fantasy result marked provisional');
 end;

end$$;
-- Real auth roles: wrong side and unauthenticated/restricted users cannot vote.
set local role authenticated;
select set_config('request.jwt.claim.sub','bca00000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select pg_temp.card_reject(format('select public.vote_fussball_card(%s,%s)',(select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=13)),'historical candidate');
select public.vote_fussball_card((select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=2));
select public.vote_fussball_card((select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=2));
select pg_temp.card_assert((public.match_fussball_card_votes((select(value#>>'{}')::bigint from card_fixture where key='mid'))#>>'{events,0,status}')='pending','duplicate ordinary vote stays one');
reset role;
do $$begin insert into omejitve_uporabnikov(user_id,velja_do,razlog)values('bca00000-0000-4000-8000-000000000002',clock_timestamp()+interval'1 day','Synthetic restriction');end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','bca00000-0000-4000-8000-000000000002',true);
select pg_temp.card_reject(format('select public.vote_fussball_card(%s,%s)',(select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=2)),'omejen');
select set_config('request.jwt.claim.sub','bca00000-0000-4000-8000-000000000004',true);
select public.vote_fussball_card((select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=2));
select pg_temp.card_assert((public.match_fussball_card_votes((select(value#>>'{}')::bigint from card_fixture where key='mid'))#>>'{events,0,status}')='pending','foreign league insider counts one');
select set_config('request.jwt.claim.sub','bca00000-0000-4000-8000-000000000005',true);
select public.vote_fussball_card((select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=2));
select pg_temp.card_assert((public.match_fussball_card_votes((select(value#>>'{}')::bigint from card_fixture where key='mid'))#>>'{events,0,status}')='queued','same league insider queues alone');
reset role;
select set_config('request.jwt.claim.role','service_role',true);
do $$declare job jsonb;cid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='cid');begin
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27')->0;
 perform pg_temp.card_assert(job->'resolutions' is not null and job->>'resolution_sha256'~'^[a-f0-9]{64}$','service job includes exact digest');
 insert into card_fixture values('job',job);
end$$;
-- Contradictory parser output and missing numeric keys roll back every row/flag.
do $$declare cid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='cid');mid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='mid');job jsonb:=(select value from card_fixture where key='job');apps jsonb:=(select value from card_fixture where key='apps');goals jsonb:=(select value from card_fixture where key='goals');begin
 perform pg_temp.card_reject(format('select public.apply_fussball_card_report(%s,%L,%s,%L,%L,%L,%L,array[]::text[])',cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps,goals),'card recipient');
 perform pg_temp.card_reject(format('select public.apply_fussball_card_report(%s,%L,%s,%L,%L,%L,%L,array[]::text[])',cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',jsonb_set(apps,'{0}',(apps->0)-'minute_off'),goals),'defaults forbidden');
 perform pg_temp.card_assert((select statistics_status='pending_cards'and imported_at is null from matches where id=mid)and not exists(select 1 from appearances where match_id=mid),'invalid apply rolls back pending and rows');
end$$;
-- A competing vote invalidates an in-flight resolution even if winner unchanged.
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','bca00000-0000-4000-8000-000000000001',true);
select public.vote_fussball_card((select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=3));
reset role;
select set_config('request.jwt.claim.role','service_role',true);
do $$declare cid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='cid');mid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='mid');job jsonb:=(select value from card_fixture where key='job');apps jsonb:=(select value from card_fixture where key='apps');goals jsonb:=(select value from card_fixture where key='goals');begin
 perform pg_temp.card_reject(format('select public.apply_fussball_card_report(%s,%L,%s,%L,%L,%L,%L,array[]::text[])',cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps,goals),'consensus changed');
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27')->0;
 apps:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(apps,'{1,red_cards}','1'),'{1,red_card_minute}','60'),'{1,minute_off}','60'),'{1,minutes_played}','60');
 update card_fixture set value=apps where key='resolved_apps';
 insert into card_fixture values('resolved_apps',apps)on conflict(key)do update set value=excluded.value;
 -- Inject a late score failure after rows would be written; complete rollback.
 insert into card_fixture values('job_latest',job);
end$$;
create function pg_temp.fail_card_score()returns trigger language plpgsql as $$begin raise exception 'synthetic late score failure';end$$;
create trigger card_test_score_failure before insert or update on public.player_scores for each statement execute function pg_temp.fail_card_score();
do $$declare cid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='cid');mid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='mid');job jsonb:=(select value from card_fixture where key='job_latest');begin
 perform pg_temp.card_reject(format('select public.apply_fussball_card_report(%s,%L,%s,%L,%L,%L,%L,array[]::text[])',cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',(select value from card_fixture where key='resolved_apps'),(select value from card_fixture where key='goals')),'synthetic late score failure');
 perform pg_temp.card_assert((select statistics_status='pending_cards'from matches where id=mid)and not exists(select 1 from appearances where match_id=mid)and not exists(select 1 from private_fussball.card_events where confirmed_player_id is not null),'late recompute failure rolls back rows, confirmation and pending');
end$$;
drop trigger card_test_score_failure on public.player_scores;
do $$declare cid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='cid');mid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='mid');job jsonb:=(select value from card_fixture where key='job_latest');res jsonb;begin
 res:=public.apply_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',(select value from card_fixture where key='resolved_apps'),(select value from card_fixture where key='goals'),array[]::text[]);
 perform pg_temp.card_assert(res->>'applied'='true'and(select statistics_status='available'and imported_at is not null and home_goals=1 and away_goals=0 from matches where id=mid),'successful native apply clears pending and preserves score');
 perform pg_temp.card_assert((select count(*)from appearances where match_id=mid)=22 and exists(select 1 from player_scores where round_id=(select(value#>>'{}')::bigint from card_fixture where key='rid')),'scores recomputed from verified appearances');
 perform pg_temp.card_assert((select assist_player_id=(select player_id from card_players cp where cp.idx=3)and assist_confirmed_at is not null from goals where match_id=mid),'confirmed assists survive pending and replacement');
 perform pg_temp.card_assert(not public.dfb_round_has_pending((select(value#>>'{}')::bigint from card_fixture where key='rid')),'successful apply clears persistent completion guard');
end$$;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','bca00000-0000-4000-8000-000000000001',true);
select pg_temp.card_reject(format('select public.vote_fussball_card(%s,%s)',(select(value#>>'{}')::bigint from card_fixture where key='event'),(select player_id from card_players cp where cp.idx=3)),'locked');
reset role;
select set_config('request.jwt.claim.role','service_role',true);
-- Source revisions supersede decisions without deleting votes. Synthetic bench
-- second yellow tests exercise validation independently of the source parser.
do $$declare cid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='cid');mid bigint:=(select(value#>>'{}')::bigint from card_fixture where key='mid');e jsonb:=(select value from card_fixture where key='envelope');c jsonb:=(select value from card_fixture where key='candidates');oldjob jsonb:=(select value from card_fixture where key='job_latest');revision text;first_event bigint;red_event bigint;job jsonb;apps jsonb;reserve jsonb;bench jsonb;
begin
 e:=jsonb_set(jsonb_set(e,'{bundle,report,base64}',to_jsonb(encode(convert_to('synthetic revised report','UTF8'),'base64'))),'{bundle,report,sha256}',to_jsonb(private_fussball.sha('synthetic revised report')));
 revision:=private_fussball.sha((e#>>'{bundle,report,sha256}')||E'\n'||(e#>>'{bundle,lineup,sha256}')||E'\nabc123ef:'||(e#>>'{bundle,fonts,0,sha256}'));
 e:=jsonb_set(e,'{revisionSha256}',to_jsonb(revision));
 e:=jsonb_set(e,'{cards}',jsonb_build_array(jsonb_build_object('eventKey',private_fussball.sha((e->>'reportId')||':'||revision||':0:'||repeat('f',64)),'ordinal',0,'eventSha256',repeat('f',64),'type','yellow','side',0,'minute',50,'base',50,'added',0,'half',2,'officialSourceId',null),jsonb_build_object('eventKey',private_fussball.sha((e->>'reportId')||':'||revision||':1:'||repeat('a',64)),'ordinal',1,'eventSha256',repeat('a',64),'type','second_yellow','side',0,'minute',60,'base',60,'added',0,'half',2,'officialSourceId',null)));
 perform public.register_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,e,c);
 perform pg_temp.card_assert((select count(*)from private_fussball.card_reports where match_id=mid)=2 and(select count(*)from private_fussball.card_votes v join private_fussball.card_events ce on ce.id=v.event_id join private_fussball.card_reports cr on cr.id=ce.report_id where cr.match_id=mid)=3,'changed source retains old revisions/votes');
 perform pg_temp.card_reject(format('select public.apply_fussball_card_report(%s,%L,%s,%L,%L,%L,%L,array[]::text[])',cid,repeat('A',32)||'-G:2026/27',mid,oldjob->>'revision_sha256',oldjob->>'resolution_sha256',(select value from card_fixture where key='resolved_apps'),(select value from card_fixture where key='goals')),'consensus changed');
 select ce.id into first_event from private_fussball.card_heads h join private_fussball.card_events ce on ce.report_id=h.report_id where h.match_id=mid and ce.event_type='yellow';
 select ce.id into red_event from private_fussball.card_heads h join private_fussball.card_events ce on ce.report_id=h.report_id where h.match_id=mid and ce.event_type='second_yellow';
 perform set_config('request.jwt.claim.sub','bca00000-0000-4000-8000-000000000005',true);
 perform public.vote_fussball_card(red_event,(select player_id from card_players cp where cp.idx=12));
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27',10,mid)->0;
 apps:=(select value from card_fixture where key='apps');
 reserve:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(apps->1,'{player_id}',to_jsonb((select player_id from card_players cp where cp.idx=12))),'{shirt_number}','12'),'{started}','false'),'{minute_off}','0'),'{minutes_played}','0'),'{goals}','0'),'{red_cards}','1'),'{red_card_minute}','60'),'{yellow_cards}','0');
 apps:=apps||jsonb_build_array(reserve);
 perform pg_temp.card_reject(format('select public.apply_fussball_card_report(%s,%L,%s,%L,%L,%L,%L,array[]::text[])',cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps,(select value from card_fixture where key='goals')),'preceding first yellow');
 perform public.defer_fussball_card_replay(cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256','synthetic incompatible second yellow');
 perform pg_temp.card_assert(public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27',10,mid)='[]','invalid unchanged consensus deferred');
 perform public.vote_fussball_card(first_event,(select player_id from card_players cp where cp.idx=12));
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27',10,mid)->0;
 perform pg_temp.card_assert(job is not null,'changed editable consensus immediately bypasses deferral');
 apps:=jsonb_set(apps,'{22,yellow_cards}','1');
 perform public.apply_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps,(select value from card_fixture where key='goals'),array[]::text[]);
 perform pg_temp.card_assert((select minutes_played=0 and red_cards=1 and yellow_cards=1 and not started from appearances where match_id=mid and player_id=(select player_id from card_players cp where cp.idx=12)),'bench discipline never invents an appearance interval');
 -- Authoritative names or removal of a red must not publish an empty interval
 -- between source registration and the final atomic verified replacement.
 e:=jsonb_set(jsonb_set(e,'{bundle,report,base64}',to_jsonb(encode(convert_to('synthetic authoritative report','UTF8'),'base64'))),'{bundle,report,sha256}',to_jsonb(private_fussball.sha('synthetic authoritative report')));
 revision:=private_fussball.sha((e#>>'{bundle,report,sha256}')||E'\n'||(e#>>'{bundle,lineup,sha256}')||E'\nabc123ef:'||(e#>>'{bundle,fonts,0,sha256}'));
 e:=jsonb_set(e,'{revisionSha256}',to_jsonb(revision));
 e:=jsonb_set(e,'{cards}',(select jsonb_agg(jsonb_set(jsonb_set(x,'{officialSourceId}',to_jsonb((select source_id from card_players cp where cp.idx=12))),'{eventKey}',to_jsonb(private_fussball.sha((e->>'reportId')||':'||revision||':'||(x->>'ordinal')||':'||(x->>'eventSha256')))))from jsonb_array_elements(e->'cards')x));
 perform public.register_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,e,c);
 perform pg_temp.card_assert(public.fussball_round_has_pending((select(value#>>'{}')::bigint from card_fixture where key='rid'))and(select imported_at is null and statistics_status='pending_cards'from matches where id=mid),'source-authoritative revision stays pending until successful apply');
 perform pg_temp.card_assert((select points is null and statistics_pending from fantasy_round_points where round_id=(select(value#>>'{}')::bigint from card_fixture where key='rid'))and not exists(select 1 from tocke_krogov where round_id=(select(value#>>'{}')::bigint from card_fixture where key='rid')),'staged source-authoritative revision cannot reopen fantasy results');
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27',10,mid)->0;
 perform pg_temp.card_assert(job->'resolutions'='{}'::jsonb,'published authoritative recipients never become community overlay');
 perform public.apply_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps,(select value from card_fixture where key='goals'),array[]::text[]);
 e:=jsonb_set(jsonb_set(e,'{bundle,report,base64}',to_jsonb(encode(convert_to('synthetic removed cards report','UTF8'),'base64'))),'{bundle,report,sha256}',to_jsonb(private_fussball.sha('synthetic removed cards report')));
 revision:=private_fussball.sha((e#>>'{bundle,report,sha256}')||E'\n'||(e#>>'{bundle,lineup,sha256}')||E'\nabc123ef:'||(e#>>'{bundle,fonts,0,sha256}'));
 e:=jsonb_set(jsonb_set(e,'{revisionSha256}',to_jsonb(revision)),'{cards}','[]');
 perform public.register_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,e,c);
 perform pg_temp.card_assert((select statistics_status='pending_cards'and imported_at is null from matches where id=mid)and public.dfb_round_has_pending((select(value#>>'{}')::bigint from card_fixture where key='rid')),'source red removal remains blocked before apply');
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27',10,mid)->0;
 perform public.apply_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',(select value from card_fixture where key='apps'),(select value from card_fixture where key='goals'),array[]::text[]);
 perform pg_temp.card_assert(not public.fussball_round_has_pending((select(value#>>'{}')::bigint from card_fixture where key='rid')),'red removal clears only after successful verified apply');
 -- Two accepted assists at the same official minute/scorer retain their exact
 -- score-state goal identity across another source revision and replacement.
 e:=jsonb_set(jsonb_set(e,'{bundle,report,base64}',to_jsonb(encode(convert_to('synthetic duplicate minute report','UTF8'),'base64'))),'{bundle,report,sha256}',to_jsonb(private_fussball.sha('synthetic duplicate minute report')));
 revision:=private_fussball.sha((e#>>'{bundle,report,sha256}')||E'\n'||(e#>>'{bundle,lineup,sha256}')||E'\nabc123ef:'||(e#>>'{bundle,fonts,0,sha256}'));
 e:=jsonb_set(jsonb_set(e,'{revisionSha256}',to_jsonb(revision)),'{score,domaci}','2');
 apps:=jsonb_set((select value from card_fixture where key='apps'),'{1,goals}','2');
 apps:=(select jsonb_agg(case when(a->>'goals_conceded')::int=1 then jsonb_set(a,'{goals_conceded}','2')else a end order by ord)from jsonb_array_elements(apps)with ordinality q(a,ord));
 reserve:=(select value from card_fixture where key='goals');
 reserve:=reserve||jsonb_build_array(jsonb_set(reserve->0,'{score_home}','2'));
 bench:=(apps->12)||jsonb_build_object('player_id',(select player_id from card_players cp where cp.idx=24),'shirt_number',12,'started',false,'minute_on',90,'minute_off',90,'minutes_played',0);

 perform public.register_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,e,c);
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27',10,mid)->0;
 perform pg_temp.card_reject(format('select public.apply_fussball_card_report(%s,%L,%s,%L,%L,%L,%L,array[]::text[])',cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps||jsonb_build_array(bench||jsonb_build_object('minute_on',0,'minute_off',0)),reserve),'unused player');
 apps:=apps||jsonb_build_array(bench);
 perform public.apply_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps,reserve,array[]::text[]);
 perform pg_temp.card_assert((select minute_on=90 and minute_off=90 and minutes_played=0 and not started from appearances where match_id=mid and player_id=(select player_id from card_players cp where cp.idx=24)),'strict replay may retain a real90-minute substitute without inventing minutes');
 update goals set assist_player_id=(select player_id from card_players cp where cp.idx=3),assist_confirmed_at=clock_timestamp()where match_id=mid and score_home=1;
 update goals set assist_player_id=(select player_id from card_players cp where cp.idx=4),assist_confirmed_at=clock_timestamp()where match_id=mid and score_home=2;
 e:=jsonb_set(jsonb_set(e,'{bundle,report,base64}',to_jsonb(encode(convert_to('synthetic duplicate minute revised report','UTF8'),'base64'))),'{bundle,report,sha256}',to_jsonb(private_fussball.sha('synthetic duplicate minute revised report')));
 revision:=private_fussball.sha((e#>>'{bundle,report,sha256}')||E'\n'||(e#>>'{bundle,lineup,sha256}')||E'\nabc123ef:'||(e#>>'{bundle,fonts,0,sha256}'));
 e:=jsonb_set(e,'{revisionSha256}',to_jsonb(revision));
 perform public.register_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,e,c);
 job:=public.get_fussball_card_replay_jobs(cid,repeat('A',32)||'-G:2026/27',10,mid)->0;
 perform public.apply_fussball_card_report(cid,repeat('A',32)||'-G:2026/27',mid,job->>'revision_sha256',job->>'resolution_sha256',apps,reserve,array[]::text[]);
 perform pg_temp.card_assert((select assist_player_id=(select player_id from card_players cp where cp.idx=3)from goals where match_id=mid and score_home=1)and(select assist_player_id=(select player_id from card_players cp where cp.idx=4)from goals where match_id=mid and score_home=2),'same-minute scorer goals preserve distinct accepted assists by exact score state');


end$$;
rollback;
