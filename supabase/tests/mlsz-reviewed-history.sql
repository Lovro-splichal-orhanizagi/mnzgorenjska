-- Synthetic football only; exact reviewed identities, production constraints and triggers.
begin;
set local jit=off;
create function pg_temp.hu_assert(ok boolean,msg text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'HU TEST: %',msg;end if;end$$;
create function pg_temp.hu_refuses(cmd text,msg text)returns void language plpgsql as $$begin begin execute cmd;exception when others then if sqlerrm not like 'MLSZ_HISTORY:%'and sqlerrm not like 'HISTORICAL_POLICY:%'then raise exception 'HU TEST wrong refusal %: %',msg,sqlerrm;end if;return;end;raise exception 'HU TEST expected refusal: %',msg;end$$;
select pg_temp.hu_assert(not has_function_privilege('anon','public.prepare_mlsz_historical_cleanup(text,jsonb)','EXECUTE')and not has_function_privilege('authenticated','public.release_mlsz_reviewed_history(bigint,text,boolean)','EXECUTE'),'public cannot access maintenance APIs');
select pg_temp.hu_assert(has_function_privilege('service_role','public.release_mlsz_reviewed_history(bigint,text,boolean)','EXECUTE')and not has_schema_privilege('service_role','private_mlsz_history','USAGE'),'service only has public wrappers');
delete from competitions where id in(463,619)or slug in('hu-to-3-nyugat','hu-baz-u19-2-kozep');
insert into competitions(id,slug,name,short_name,source,source_league_code,country_id,active,prvi_fantasy_krog)overriding system value values
(463,'hu-to-3-nyugat','HU Tolna fixture','HU T','mlsz','67/17/34465',(select id from countries where code='HU'),false,1),
(619,'hu-baz-u19-2-kozep','HU U19 fixture','HU U','mlsz','67/4/34094',(select id from countries where code='HU'),false,2);
create temporary table hu_teams(cid bigint,tid bigint,ord int,name text);
insert into hu_teams values(463,7115,0,'TAMÁSI 2009 FC');
insert into hu_teams values(463,7121,1,'BONYHÁD-BÖRZSÖNY SE');
insert into hu_teams values(463,7131,2,'KSE ZOMBA');
insert into hu_teams values(463,7119,3,'PÁLFAI SE');
insert into hu_teams values(463,7124,4,'GYÖNKI SE');
insert into hu_teams values(463,7118,5,'NAGYMÁNYOK-MAJOS');
insert into hu_teams values(463,7129,6,'IREGSZEMCSEI SE');
insert into hu_teams values(463,7122,7,'DOMBÓVÁRI LABDARÚGÓ KLUB');
insert into hu_teams values(463,7127,8,'DÖBRÖKÖZI KSE');
insert into hu_teams values(463,7126,9,'APARHANTI SE');
insert into hu_teams values(463,7116,10,'TEVELI MEDOSZ SE');
insert into hu_teams values(463,10747,-1,'NAGYDOROG KSE');
insert into hu_teams values(463,10746,-2,'NÉMETKÉRI SE');
insert into hu_teams values(619,2410,0,'Hejőpapi SE');
insert into hu_teams values(619,7945,1,'Mályi FC II.');
insert into hu_teams values(619,1765,2,'Termálfürdő Mezőcsát RSE');
insert into hu_teams values(619,2377,3,'Miskolc Népkert VSE');
insert into hu_teams values(619,2419,4,'Tiszakeszi KÜSE');
insert into hu_teams values(619,2416,5,'Borsodivánka SE');
insert into hu_teams values(619,2365,-1,'Onga SE');
insert into teams(id,name,short_name,country_id)overriding system value select tid,name,'HU',(select id from countries where code='HU')from hu_teams;
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value values
(35013,463,'2025/26',12,'2026-03-21','2026-03-21T07:00Z'),(34986,619,'2025/26',2,'2025-09-13','2025-09-13T07:00Z'),(34995,619,'2025/26',11,'2026-04-04','2026-04-04T07:00Z'),
(22000,463,'2026/27',8,'2026-10-24','2026-10-24T07:00Z'),(25174,619,'2026/27',7,'2026-10-24','2026-10-24T07:00Z');
create temporary table hu_targets(mid bigint,rid bigint,home bigint,away bigint,day date,hg int,ag int,report text,url text,apps int,gs int);
insert into hu_targets values
(545453,35013,10747,10746,'2026-03-21',3,0,'2175016','https://adatbank.mlsz.hu/match/65/17/31528/12/2175016.html',30,8),
(545353,34986,2365,2416,'2025-09-13',0,3,'2078392','https://adatbank.mlsz.hu/match/65/4/31796/2/2078392.html',24,4),
(545385,34995,2416,2365,'2026-04-04',3,0,'2078437','https://adatbank.mlsz.hu/match/65/4/31796/11/2078437.html',23,6);
insert into matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at)overriding system value select mid,rid,home,away,day,hg,ag,report,url,now()from hu_targets;
insert into players(competition_id,team_id,reg_st,first_name,last_name,full_name,position,position_source,value,value_start,active)
select cid,tid,tid*100+i,'Synthetic',tid||'-'||i,'Synthetic '||tid||'-'||i,case when i in(1,16)then'GK'when i<=6 then'DEF'when i<=11 then'MID'else'FWD'end,case when i in(1,16)then'zapisnik'else'ugibanje'end,case when i=2 then 9 else 4 end,case when i=2 then 9 else 4 end,ord>=0 from hu_teams cross join generate_series(1,16)i;
do $$declare t record;pid bigint;i int;tid bigint;begin for t in select *from hu_targets loop
 for i in 1..t.apps loop
 tid:=case when i<=16 then t.home else t.away end;
 select id into pid from players where team_id=tid and reg_st=tid*100+(case when i<=16 then i else i-16 end);
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)values(t.mid,pid,tid,true,0,90,90,i in(1,17));
 if i<=t.gs then insert into goals(match_id,scorer_id,team_id,minute)values(t.mid,pid,tid,i);end if;
 end loop;perform recompute_round_scores(t.rid);end loop;end$$;
-- Ordinary observed history/current statistics. Distinct rounds make every fixture unique.
create temporary table hu_normal_apps(mid bigint,pid bigint,tid bigint,i int);
do $$declare fixture_cid bigint;n int;rn int;rid bigint;mid bigint;h bigint;a bigint;sz text;code text;pid bigint;tid bigint;i int;begin
 for fixture_cid in select unnest(array[463,619])loop
 for n in 1..(case when fixture_cid=463 then 118 else 76 end)loop
 sz:=case when n<=(case when fixture_cid=463 then 86 else 63 end)then'2025/26'else'2026/27'end;
 rn:=100+n;select hu_teams.tid into h from hu_teams where hu_teams.cid=fixture_cid and ord=(n%(case when fixture_cid=463 then 11 else 6 end));select hu_teams.tid into a from hu_teams where hu_teams.cid=fixture_cid and ord=((n+1)%(case when fixture_cid=463 then 11 else 6 end));
 code:=case when fixture_cid=463 and sz='2025/26'then'65/17/31528'when fixture_cid=463 then'67/17/34465'when sz='2025/26'then'65/4/31796'else'67/4/34094'end;
 insert into rounds(competition_id,season,number,played_on,deadline_at)values(fixture_cid,sz,rn,case when sz='2025/26'then'2026-05-01'::date else'2026-10-10'::date end,'2026-10-10T07:00Z')returning id into rid;
 insert into matches(round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at)values(rid,h,a,case when sz='2025/26'then'2026-05-01'::date else'2026-10-10'::date end,(8000000+fixture_cid*1000+n)::text,'https://adatbank.mlsz.hu/match/'||code||'/'||rn||'/'||(8000000+fixture_cid*1000+n)||'.html',now())returning id into mid;
 for tid in select h union all select a loop
 for i in 1..12 loop select id into pid from players where team_id=tid and competition_id=fixture_cid and reg_st=tid*100+i;
 insert into hu_normal_apps values(mid,pid,tid,i);
 end loop;end loop;end loop;

 end loop;end$$;
insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value values
(246410,22000,7129,7119,'2026-10-25'),
(246403,22000,7115,7131,'2026-10-24'),
(246405,22000,7121,7126,'2026-10-25'),
(246407,22000,7127,7124,'2026-10-25'),
(246409,22000,7116,7122,'2026-10-25'),
(279555,25174,2410,1765,'2026-10-25'),
(279554,25174,2416,2419,'2026-10-25'),
(279553,25174,7945,2377,'2026-10-24');
analyze players;analyze matches;analyze rounds;
-- Fixture players have no departure flag. Suppress only their irrelevant per-row
-- reactivation UPDATE during setup; all maintenance and guard tests run with it enabled.
alter table appearances disable trigger appearances_obudi_igralca;
insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)select mid,pid,tid,i<=11,case when i=12 then 60 else 0 end,case when i=11 then 60 else 90 end,case when i=11 then 60 when i=12 then 30 else 90 end,i=1 from hu_normal_apps;
alter table appearances enable trigger appearances_obudi_igralca;
analyze players;analyze appearances;analyze matches;analyze rounds;
-- Fresh ordinary import route uses common HU country/numeric report namespace.
savepoint fresh_import;
delete from goals where match_id in(545453,545353,545385);
delete from appearances where match_id in(545453,545353,545385);
update matches set imported_at=null where id in(545453,545353,545385);
update competitions set source_policy='hu-mlsz-reviewed-history-v1',prvi_fantasy_krog=case id when 463 then 8 else 7 end where id in(463,619);
do $$declare p record;t record;e jsonb;begin
 for p in select pp.*,c.id cid from private_historical_statistics.policies pp join competitions c on c.slug=pp.document->>'competitionSlug'where c.id in(463,619)loop
 perform public.apply_historical_statistics_policy(p.cid,p.id,p.policy_sha256,p.document->'entries');
 for t in select m.*from matches m join rounds r on r.id=m.round_id where r.competition_id=p.cid and m.id in(545453,545353,545385)loop
 select value into e from jsonb_array_elements(p.document->'entries')where value->>'sourceMatchId'=t.zapisnik_id;
 perform public.upsert_unavailable_historical_match(p.cid,t.zapisnik_id,p.id,p.policy_sha256,e->>'rawSha256',jsonb_build_object('roundId',t.round_id,'homeTeamId',t.home_team_id,'awayTeamId',t.away_team_id,'fixture',(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',p.document->>'season')));
 end loop;end loop;end$$;
select pg_temp.hu_assert(not exists(select 1 from private_mlsz_history.cleanup_receipt)and(public.release_mlsz_reviewed_history(463,repeat('a',40),false)->>'ready')::boolean,'fresh import can release only exact reviewed markers');
create temporary table hu_ordinary as select m.*from matches m join rounds r on r.id=m.round_id where r.competition_id=463 and m.imported_at is not null order by m.id limit 1;
insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)select o.id,(select min(a.player_id)from appearances a where a.match_id=o.id and a.team_id=o.home_team_id),o.home_team_id,10,true from hu_ordinary o;
update matches set away_goals=1 where id=(select id from hu_ordinary);
select pg_temp.hu_assert((public.release_mlsz_reviewed_history(463,repeat('a',40),false)->>'ready')::boolean,'own goal credited to opposing official score');
create function pg_temp.hu_release_mutant(cmd text,msg text)returns void language plpgsql as $$declare result jsonb;begin begin execute cmd;result:=public.release_mlsz_reviewed_history(463,repeat('a',40),false);perform pg_temp.hu_assert(result->>'ready'='false','release refused '||msg);perform pg_temp.hu_assert(not(select active from competitions where id=463),'failed preview leaves inactive');raise exception using errcode='ZX001';exception when sqlstate'ZX001'then null;end;end$$;
select pg_temp.hu_release_mutant('update goals set is_own_goal=false where match_id=(select id from hu_ordinary)','wrong own-goal side');
select pg_temp.hu_release_mutant('update appearances set minutes_played=89 where match_id=(select id from hu_ordinary)','inconsistent native minutes without receipt');
select pg_temp.hu_release_mutant('update appearances set is_goalkeeper=false where match_id=(select id from hu_ordinary)','ordinary keeper missing without receipt');
select pg_temp.hu_release_mutant('update matches set imported_at=null where id=(select id from hu_ordinary)','past current report missing without receipt');
rollback to fresh_import;
create function pg_temp.hu_release_mutant(cmd text,msg text)returns void language plpgsql as $$declare result jsonb;begin begin execute cmd;result:=public.release_mlsz_reviewed_history(463,repeat('a',40),false);perform pg_temp.hu_assert(result->>'ready'='false','release refused '||msg);perform pg_temp.hu_assert(not(select active from competitions where id=463),'failed preview leaves inactive');raise exception using errcode='ZX001';exception when sqlstate'ZX001'then null;end;end$$;
create temporary table hu_proof as select repeat('a',40)main_sha,(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'provider'='mlsz' and document->>'sourcePolicy'='hu-mlsz-reviewed-history-v1')hashes,null::jsonb prepared;
select pg_temp.hu_refuses('select public.prepare_mlsz_historical_cleanup(''invalid'',''{}''::jsonb)','invalid main SHA');
select pg_temp.hu_refuses('select public.prepare_mlsz_historical_cleanup(repeat(''a'',40),''{}''::jsonb)','wrong policy hashes');
update hu_proof set prepared=public.prepare_mlsz_historical_cleanup(main_sha,hashes);
select pg_temp.hu_assert((select jsonb_array_length(prepared->'beforeImage'->'appearances')=77 and jsonb_array_length(prepared->'beforeImage'->'goals')=18 from hu_proof),'complete77/18 original rows captured');
select pg_temp.hu_assert(not exists(select 1 from private_historical_statistics.source_club_bindings where provider='mlsz'and bound_team_id is not null),'prepare has no binding side effects');
create function pg_temp.hu_mutant(cmd text,msg text)returns void language plpgsql as $$declare p hu_proof%rowtype;image jsonb;begin select *into p from hu_proof;begin execute cmd;image:=private_mlsz_history.capture();perform pg_temp.hu_refuses(format('select public.apply_mlsz_historical_cleanup(%L,%L::jsonb,%L,%L)',p.main_sha,p.hashes,p.prepared->>'beforeSha256',p.prepared->>'beforeImageText'),msg);perform pg_temp.hu_assert(image=private_mlsz_history.capture(),'failed cleanup atomic '||msg);raise exception using errcode='ZX001';exception when sqlstate'ZX001'then null;end;end$$;
insert into auth.users(id,email)values('fe000000-0000-4000-8000-000000000001','hu-disposable@example.invalid');
insert into profiles(id,display_name)values('fe000000-0000-4000-8000-000000000001','HU fixture')on conflict(id)do nothing;
select pg_temp.hu_mutant('insert into fantasy_teams(owner_id,name,competition_id)values(''fe000000-0000-4000-8000-000000000001'',''HU user'',463)','new user team');
select pg_temp.hu_mutant('update appearances set shirt_number=777 where match_id=545453','individual drift');
select pg_temp.hu_mutant('update matches set home_goals=99 where id=545453','official score drift');
select pg_temp.hu_mutant('update competitions set source_league_code=''67/17/34466''where id=463','wrong league tuple');
select pg_temp.hu_mutant('update rounds set number=13 where id=35013','round drift');
select pg_temp.hu_mutant('insert into position_votes_deleted(id,player_id)select 987654,min(id)from players where competition_id=463','deleted vote audit activity');
select pg_temp.hu_mutant('create table public.hu_unknown_dependency(goal_id bigint references goals(id)on delete cascade)','unknown FK');
select pg_temp.hu_mutant('update appearances set shirt_number=888 where match_id=(select min(id)from matches where id not in(545453,545353,545385)and imported_at is not null)','ordinary football drift');
select pg_temp.hu_refuses('update competitions set active=true where id=463','ordinary direct activation');
-- Force a failure after both deletes: a trigger refuses the marker update.
savepoint late_cleanup_failure;
create function pg_temp.hu_late_failure()returns trigger language plpgsql as $$begin if new.statistics_status='unavailable_historical'then raise exception 'MLSZ_HISTORY: synthetic late failure';end if;return new;end$$;
create trigger hu_late before update on matches for each row execute function pg_temp.hu_late_failure();
select pg_temp.hu_mutant('select 1','late marker failure rolls back deletions');
rollback to late_cleanup_failure;
create temporary table hu_result as select public.apply_mlsz_historical_cleanup(main_sha,hashes,prepared->>'beforeSha256',prepared->>'beforeImageText')result from hu_proof;
select pg_temp.hu_assert((public.get_mlsz_reviewed_history_receipt()->'cleanup'->>'before_sha')=(select prepared->>'beforeSha256'from hu_proof),'read-only recovery receipt retains reviewed beforeimage hash');
select pg_temp.hu_assert((select(result->>'removedAppearances')::int=77 and(result->>'removedGoals')::int=18 and(result->>'unavailableMatches')::int=3 from hu_result),'exact bounded delete receipt');
select pg_temp.hu_assert(not exists(select 1 from matches where id in(545453,545353,545385)and(statistics_status<>'unavailable_historical'or imported_at is not null)),'exact3 unavailable markers');
select pg_temp.hu_assert((select sum(home_goals+away_goals)=9 from matches where id in(545453,545353,545385)),'all official3:0/0:3/3:0 preserved');
select pg_temp.hu_assert(not exists(select 1 from player_scores where round_id in(35013,34986,34995)),'stale exception player scores removed');
select pg_temp.hu_refuses('update matches set imported_at=now()where id=545453','ordinary marker write protected');
select pg_temp.hu_refuses('delete from matches where id=545453','ordinary marker deletion protected');
select pg_temp.hu_refuses('update rounds set number=99 where id=35013','ordinary round identity protected');
select pg_temp.hu_refuses('insert into appearances(match_id,player_id,team_id)select 545453,min(id),10747 from players where team_id=10747','individual stats protected');
select pg_temp.hu_refuses((select format('select public.prepare_mlsz_historical_cleanup(%L,%L::jsonb)',main_sha,hashes)from hu_proof),'cleanup one use');
select pg_temp.hu_assert((public.release_mlsz_reviewed_history(463,repeat('a',40),false)->>'ready')::boolean,'Tolna preview ready');
select pg_temp.hu_assert((public.release_mlsz_reviewed_history(619,repeat('a',40),false)->>'ready')::boolean,'U19 preview ready');
select pg_temp.hu_assert(not(public.release_mlsz_reviewed_history(1,repeat('a',40),false)->>'ready')::boolean,'unreviewed league release refused');

select pg_temp.hu_release_mutant('update players set value=4.5 where competition_id=463','all-default prices');
select pg_temp.hu_release_mutant('update rounds set deadline_at=now()-interval ''1hour''where id=22000','expired opening');
select pg_temp.hu_release_mutant('update appearances set is_goalkeeper=false where match_id in(select m.id from matches m join rounds r on r.id=m.round_id where r.competition_id=463 and r.season=''2026/27'')','current goalkeeper loss');
select pg_temp.hu_release_mutant('update appearances set minutes_played=89 where match_id=(select min(m.id)from matches m join rounds r on r.id=m.round_id where r.competition_id=463 and m.imported_at is not null)','ordinary minute drift');
select pg_temp.hu_refuses('update private_historical_statistics.policies set policy_sha256=repeat(''b'',64)where id=''hu-mlsz-tolna-reviewed-history-20261022-v1''','policy digest drift');
select pg_temp.hu_refuses('delete from private_historical_statistics.markers where competition_id=463','marker drift');
select pg_temp.hu_assert((public.release_mlsz_reviewed_history(463,repeat('a',40),true)->>'active')::boolean,'authorized Tolna activation');
select pg_temp.hu_assert((select active and prvi_fantasy_krog=8 from competitions where id=463),'only active toggle after configuring first round');
select pg_temp.hu_assert((public.release_mlsz_reviewed_history(619,repeat('a',40),true)->>'active')::boolean,'authorized U19 activation');
rollback;
