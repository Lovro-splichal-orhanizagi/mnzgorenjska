-- Owned disposable database only. No production clock input is exposed.
begin;
create function pg_temp.mfa_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'MFA TEST: %',message;end if;end$$;
create function pg_temp.mfa_refuses(command text,message text)returns void language plpgsql as $$begin begin execute command;exception when others then if sqlerrm not like 'MFA_HISTORY:%'and sqlerrm not like 'HISTORICAL_POLICY:%'then raise exception 'MFA TEST: wrong refusal %: %',message,sqlerrm;end if;return;end;raise exception 'MFA TEST: expected refusal %',message;end$$;
select pg_temp.mfa_assert(not has_function_privilege('anon','public.prepare_mfa_reviewed_cleanup(text,text)','EXECUTE')and not has_function_privilege('authenticated','public.apply_mfa_reviewed_cleanup(text,text,text,text)','EXECUTE'),'public cannot read/write restricted originals');
select pg_temp.mfa_assert(not has_function_privilege('service_role','private_mfa_history.prepare_core(text,text,timestamptz)','EXECUTE')and not has_schema_privilege('service_role','private_mfa_history','USAGE'),'service has no private clock core/schema authority');
select pg_temp.mfa_assert(has_function_privilege('service_role','public.check_mfa_reviewed_release(text,text,boolean)','EXECUTE'),'service release wrapper explicitly granted');
-- Synthetic football rows with production-approved target identities only.
delete from competitions where id=971 or slug='mt-premier';
insert into competitions(id,slug,name,short_name,source,source_league_code,sezona_koledarska,country_id,federation_id,active,prvi_fantasy_krog)overriding system value values(971,'mt-premier','MFA fixture','MFA','mfa','58539/2027',false,(select id from countries where code='MT'),(select id from federations where code='mfa'),false,1);
insert into teams(id,name,short_name,country_id)overriding system value values
(10678,'Tarxien Rainbows','TR',(select id from countries where code='MT')),
(10679,'Birzebbuga St.Peter''s','BS',(select id from countries where code='MT')),
(10680,'Marsaxlokk','MA',(select id from countries where code='MT')),
(10681,'Birkirkara','BI',(select id from countries where code='MT')),
(10683,'Floriana','FL',(select id from countries where code='MT')),
(10684,'Hamrun Spartans','HS',(select id from countries where code='MT')),
(10685,'Balzan','BA',(select id from countries where code='MT')),
(10686,'Hibernians','HI',(select id from countries where code='MT')),
(10687,'Gzira United','GU',(select id from countries where code='MT')),
(10688,'Zabbar St.Patrick','ZS',(select id from countries where code='MT')),
(10689,'Mosta','MO',(select id from countries where code='MT')),
(10690,'Valletta','VA',(select id from countries where code='MT')),
(10691,'Sliema Wanderers','SW',(select id from countries where code='MT'));
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select 100000+n,971,'2025/26',n,'2026-04-11','2026-04-11T10:00Z'from generate_series(1,32)n;
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select 34811+n,971,'2026/27',n,case when n=9 then'2026-10-21'::date else'2026-08-17'::date end,case when n=9 then'2026-10-21T10:00Z'::timestamptz else'2026-08-17T10:00Z'::timestamptz end from generate_series(1,10)n;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at)overriding system value values
(517066,100028,10678,10689,'2026-04-11',2,2,'mt52581524','https://matchcentre.mfa.com.mt/match/52581524',now()),
(517098,34812,10681,10687,'2026-08-17',4,0,'mt53142122','https://matchcentre.mfa.com.mt/match/53142122',now());
-- Opening pairs/dates are exact source-reviewed identities. Other current
-- player/fixture rows below are explicit synthetic test data, never a source replay.
insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value values
(517142,34820,10679,10680,'2026-10-21'),(517143,34820,10689,10690,'2026-10-21'),(517144,34820,10684,10685,'2026-10-21'),(517145,34820,10688,10691,'2026-10-21'),(517146,34820,10681,10683,'2026-10-22'),(517147,34820,10686,10687,'2026-10-22');
insert into matches(round_id,home_team_id,away_team_id,played_on)select 34821,10679,10680,'2026-10-30'from generate_series(1,6);
do $$declare t record;i int;pid bigint;tid bigint;home bigint;away bigint;mid bigint;n int;team_ids bigint[]:=array[10679,10680,10681,10683,10684,10685,10686,10687,10688,10691,10689,10690];begin
 for tid in select id from teams where id between 10678 and 10691 loop
  for i in 1..16 loop
   insert into players(competition_id,team_id,reg_st,first_name,last_name,full_name,position,position_source,value,value_start,active)values(971,tid,(tid*100+i)::text,'Fixture',tid||'-'||i,'Fixture '||tid||'-'||i,case when i=1 then'GK'when i<=5 then'DEF'when i<=10 then'MID'else'FWD'end,case when i=1 then'zapisnik'else'ugibanje'end,case when i=2 then 12 else 4 end,case when i=2 then 12 else 4 end,true)returning id into pid;
  end loop;
 end loop;
 for t in select *from private_mfa_history.targets()loop
  for tid in select t.home_id union all select t.away_id loop
   i:=0;for pid in select id from players where competition_id=971 and team_id=tid order by id limit 16 loop i:=i+1;insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)values(t.match_id,pid,tid,i<=11,case when i<=11 then 90 else 0 end,0,case when i<=11 then 90 else 0 end,i=1);if tid=t.home_id and i<=4 then insert into goals(match_id,scorer_id,team_id,minute)values(t.match_id,pid,tid,i*10);end if;end loop;
  end loop;
 end loop;
 for n in 1..238 loop
  i:=(n-1)%6+1;home:=team_ids[2*i-1];away:=team_ids[2*i];
  insert into matches(round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at)values(case when n<=191 then 100001+(n-1)%32 else 34812+(n-192)%8 end,home,away,case when n<=191 then'2026-04-11'::date else'2026-08-17'::date end,0,0,'mt'||(70000000+n),'https://matchcentre.mfa.com.mt/match/'||(70000000+n),now())returning id into mid;
  for tid in select home union all select away loop
   for pid in select id from players where competition_id=971 and team_id=tid order by id limit 11 loop insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)select mid,pid,tid,true,90,0,90,position='GK'from players where id=pid;end loop;
  end loop;
  if n=192 then
   -- Retained current report: one outfield starter leaves at60 and a reserve
   -- enters for30. Both sides still have11 starters and990 total minutes.
   select id into pid from players where competition_id=971 and team_id=home order by id offset 10 limit 1;
   update appearances set minutes_played=60,minute_off=60 where match_id=mid and player_id=pid;
   select id into pid from players where competition_id=971 and team_id=home order by id offset 11 limit 1;
   insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)values(mid,pid,home,false,30,60,90,false);
  end if;
 end loop;
 for i in select distinct round_id from matches m join rounds r on r.id=m.round_id where r.competition_id=971 loop perform recompute_round_scores(i);end loop;
end$$;
-- Tarxien is archive-only and must not enter the current selectable-club check.
update players set active=false where competition_id=971 and team_id=10678;
-- The shared marker reader/triggers support MFA, but its generic installer
-- remains intentionally closed. The dedicated native cleanup is the only writer.
savepoint generic_mfa_refusal;
update competitions set source_policy='mt-mfa-reviewed-history-v1',prvi_fantasy_krog=9 where id=971;
do $$declare p record;begin
 select *into p from private_historical_statistics.policies where id='mt-premier-reviewed-history-2026-10-20-v1';
 begin
  perform public.apply_historical_statistics_policy(971,p.id,p.policy_sha256,p.document->'entries');
 exception when others then
  if sqlerrm='HISTORICAL_POLICY: source country differs'then return;end if;
  raise;
 end;
 raise exception 'MFA TEST: generic MFA policy installer unexpectedly accepted';
end$$;
select pg_temp.mfa_assert(not exists(select 1 from private_historical_statistics.installed_policies where competition_id=971)and not exists(select 1 from private_historical_statistics.markers where competition_id=971),'generic refusal left no partial MFA binding');
rollback to generic_mfa_refusal;

-- Exercise preview's own bench gate, not just the final generic activation
-- trigger. Capture/cleanup the no-bench variant canonically, then roll it back.
savepoint no_retained_bench;
delete from appearances a using matches m where m.id=a.match_id and m.zapisnik_id='mt70000192'and not a.started;
update appearances a set minutes_played=90,minute_off=90 from matches m where m.id=a.match_id and m.zapisnik_id='mt70000192'and a.started and a.minute_off=60;
do $$declare sha text;proof jsonb;begin
 select policy_sha256 into sha from private_historical_statistics.policies where id='mt-premier-reviewed-history-2026-10-20-v1';
 proof:=private_mfa_history.prepare_core(repeat('a',40),sha,'2026-10-20T22:00Z');
 perform private_mfa_history.apply_core(repeat('a',40),sha,proof->>'beforeSha256',proof->>'beforeImageText','2026-10-20T22:00Z');
 perform public.record_mfa_reviewed_prices(repeat('a',40));
 begin
  perform private_mfa_history.release_core(repeat('a',40),null,false,'2026-10-20T22:00Z');
 exception when others then
  if sqlerrm='MFA_HISTORY: retained substitute appearance required before preview or activation'then return;end if;
  raise;
 end;
 raise exception 'MFA TEST: no-bench preview unexpectedly passed';
end$$;
rollback to no_retained_bench;
select pg_temp.mfa_assert((select count(*)from appearances a join matches m on m.id=a.match_id where m.zapisnik_id='mt70000192'and not a.started and a.minute_on=60 and a.minute_off=90 and a.minutes_played=30)=1,'retained current substitute fixture');
select pg_temp.mfa_assert(not exists(select a.team_id from appearances a join matches m on m.id=a.match_id where m.zapisnik_id='mt70000192'group by a.team_id having sum(a.minutes_played)<>990 or count(*)filter(where a.started)<>11),'retained substitution preserves both11/990 sides');
create temporary table mfa_proof as select repeat('a',40)main_sha,policy_sha256 policy_sha,private_mfa_history.prepare_core(repeat('a',40),policy_sha256,'2026-10-20T22:00Z')prepared from private_historical_statistics.policies where id='mt-premier-reviewed-history-2026-10-20-v1';
select pg_temp.mfa_assert(not exists(select 1 from private_historical_statistics.source_club_bindings where provider='mfa'and bound_team_id is not null),'prepare has no binding mutation');
create function pg_temp.mfa_mutant(command text,message text)returns void language plpgsql as $$declare p mfa_proof%rowtype;image jsonb;begin select *into p from mfa_proof;begin execute command;image:=private_mfa_history.capture();perform pg_temp.mfa_refuses(format('select private_mfa_history.apply_core(%L,%L,%L,%L,%L::timestamptz)',p.main_sha,p.policy_sha,p.prepared->>'beforeSha256',p.prepared->>'beforeImageText','2026-10-20T22:00Z'),message);perform pg_temp.mfa_assert(private_mfa_history.capture()=image,'failed cleanup rolls back all effects');raise exception using errcode='ZX001',message='rollback mutant';exception when sqlstate'ZX001'then null;end;end$$;
insert into auth.users(id,email)values('fb000000-0000-4000-8000-000000000001','mfa-fixture@example.invalid');
insert into profiles(id,display_name)values('fb000000-0000-4000-8000-000000000001','MFA fixture')on conflict(id)do nothing;
-- DB-owner insert has no inactive-league trigger: existing team triggers only
-- protect house-owner/name consistency and referral qualification. This reaches
-- the MFA lock_scope no-user-activity refusal without disabling any trigger.
select pg_temp.mfa_mutant('insert into fantasy_teams(owner_id,name,competition_id)values(''fb000000-0000-4000-8000-000000000001'',''MFA target'',971)','new fantasy team');
select pg_temp.mfa_mutant('update appearances set minutes_played=89 where id=(select min(id)from appearances where match_id=517066)','individual drift');
select pg_temp.mfa_mutant('update matches set home_goals=7 where id=517066','official score drift');
select pg_temp.mfa_mutant('update rounds set number=33 where id=100028','round drift');
select pg_temp.mfa_mutant('insert into position_votes_deleted(id,player_id)select 999001,min(id)from players where competition_id=971','deleted position vote');
select pg_temp.mfa_mutant('insert into assist_votes_deleted(id,goal_id)select 999001,min(id)from goals where match_id=517066','deleted assist vote');
select pg_temp.mfa_mutant('create table public.mfa_unreviewed_dependency(id bigint primary key,goal_id bigint references public.goals(id)on delete cascade)','new dependency');
select pg_temp.mfa_refuses(format('select private_mfa_history.apply_core(%L,%L,%L,%L,%L::timestamptz)',main_sha,policy_sha,repeat('0',64),prepared->>'beforeImageText','2026-10-20T22:00Z'),'wrong beforeimage SHA')from mfa_proof;
select private_mfa_history.apply_core(main_sha,policy_sha,prepared->>'beforeSha256',prepared->>'beforeImageText','2026-10-20T22:00Z')from mfa_proof;
select pg_temp.mfa_assert((select count(*)from appearances where match_id in(517066,517098))=0 and(select count(*)from goals where match_id in(517066,517098))=0,'exact64/8 removed');
select pg_temp.mfa_assert((select count(*)from matches where id in(517066,517098)and statistics_status='unavailable_historical'and imported_at is null)=2 and exists(select 1 from matches where id=517066 and home_goals=2 and away_goals=2)and exists(select 1 from matches where id=517098 and home_goals=4 and away_goals=0),'two official scores preserved');
select pg_temp.mfa_assert(jsonb_array_length(public.get_installed_historical_statistics_markers(971)->'markers')=2,'complete canonical mixed-season markers');
select pg_temp.mfa_refuses('update competitions set active=true where id=971','generic active update cannot bypass release');
select pg_temp.mfa_refuses('update matches set imported_at=now()where id=517066','ordinary importer cannot resurrect unavailable report');
select pg_temp.mfa_refuses('insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_off)select 517066,min(id),10678,true,90,90 from players where competition_id=971 and team_id=10678','ordinary importer cannot recreate appearances');
select pg_temp.mfa_refuses(format('select private_mfa_history.release_core(%L,null,false,%L::timestamptz)',main_sha,'2026-10-20T22:00Z'),'fresh price receipt required')from mfa_proof;
-- Record after the same existing DB-only price computation stage; fixture prices
-- are deliberately synthetic. Main may advance since immutable cleanup.
savepoint replaced_report;
update matches set imported_at=now()+interval '1 minute'where zapisnik_id='mt70000001';
select pg_temp.mfa_refuses('select public.record_mfa_reviewed_prices(repeat(''b'',40))','repricing cannot bless changed source reports');
rollback to replaced_report;
select public.record_mfa_reviewed_prices(repeat('b',40));
create temporary table mfa_preview as select private_mfa_history.release_core(repeat('b',40),null,false,'2026-10-20T22:00Z')preview;
select pg_temp.mfa_assert((select(preview#>>'{preview,sourceFixtureCount}')::int=240 from mfa_preview),'source240/count gate');
select pg_temp.mfa_refuses('select private_mfa_history.release_core(repeat(''b'',40),repeat(''0'',64),true,''2026-10-20T22:00Z'')','wrong reviewed preview');
savepoint stale_price;
update players set value=value+0.5 where id=(select min(id)from players where competition_id=971);
select pg_temp.mfa_refuses('select private_mfa_history.release_core(repeat(''b'',40),null,false,''2026-10-20T22:00Z'')','price/native drift requires new reprice');
rollback to stale_price;
savepoint missing_keeper;
update players set position='DEF'where competition_id=971 and team_id=10679 and position='GK';
select public.record_mfa_reviewed_prices(repeat('b',40));
select pg_temp.mfa_refuses('select private_mfa_history.release_core(repeat(''b'',40),null,false,''2026-10-20T22:00Z'')','missing actual trusted goalkeeper');
rollback to missing_keeper;
savepoint flat_prices;
update players set value=4.5 where competition_id=971;
select public.record_mfa_reviewed_prices(repeat('b',40));
select pg_temp.mfa_refuses('select private_mfa_history.release_core(repeat(''b'',40),null,false,''2026-10-20T22:00Z'')','flat fresh prices still fail');
rollback to flat_prices;
select pg_temp.mfa_refuses('select private_mfa_history.release_core(repeat(''b'',40),null,false,''2026-10-21T10:00Z'')','past exact deadline must fail');
select private_mfa_history.release_core(repeat('b',40),preview->>'previewSha256',true,'2026-10-20T22:00Z')from mfa_preview;
select pg_temp.mfa_assert(exists(select 1 from competitions where id=971 and active and prvi_fantasy_krog=9),'dedicated same-transaction activation authorized');
rollback;
