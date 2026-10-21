-- Owned disposable database only. No production clock input is exposed.
begin;
create function pg_temp.mfa_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'MFA TEST: %',message;end if;end$$;
create function pg_temp.mfa_refuses(command text,message text)returns void language plpgsql as $$begin begin execute command;exception when others then if sqlerrm not like 'MFA_CHALLENGE_HISTORY:%'and sqlerrm not like 'HISTORICAL_POLICY:%'then raise exception 'MFA TEST: wrong refusal %: %',message,sqlerrm;end if;return;end;raise exception 'MFA TEST: expected refusal %',message;end$$;
select pg_temp.mfa_assert(not has_function_privilege('anon','public.prepare_mfa_challenge_reviewed_cleanup(text,text)','EXECUTE')and not has_function_privilege('authenticated','public.apply_mfa_challenge_reviewed_cleanup(text,text,text,text)','EXECUTE'),'public cannot read/write restricted originals');
select pg_temp.mfa_assert(not has_function_privilege('service_role','private_mfa_challenge_history.prepare_core(text,text,timestamptz)','EXECUTE')and not has_schema_privilege('service_role','private_mfa_challenge_history','USAGE'),'service has no private clock core/schema authority');
select pg_temp.mfa_assert(has_function_privilege('service_role','public.check_mfa_challenge_reviewed_release(text,text,boolean)','EXECUTE'),'service release wrapper explicitly granted');
-- Synthetic owned rollback fixture; only excluded and opening native identities are source-reviewed.
delete from competitions where id=972 or slug='mt-challenge';
insert into competitions(id,slug,name,short_name,source,source_league_code,sezona_koledarska,country_id,federation_id,active,prvi_fantasy_krog)overriding system value values(972,'mt-challenge','MFA Challenge fixture','MFA','mfa','2601248/2027',false,(select id from countries where code='MT'),(select id from federations where code='mfa'),false,1);
insert into teams(id,name,short_name,country_id)overriding system value values
(10678,'Challenge fixture 10678','CF',(select id from countries where code='MT')),
(10682,'Challenge fixture 10682','CF',(select id from countries where code='MT')),
(10691,'Balzan','CF',(select id from countries where code='MT')),
(10703,'St. Andrews','CF',(select id from countries where code='MT')),
(10704,'Mgarr United','CF',(select id from countries where code='MT')),
(10705,'Melita','CF',(select id from countries where code='MT')),
(10706,'Challenge fixture 10706','CF',(select id from countries where code='MT')),
(10707,'Challenge fixture 10707','CF',(select id from countries where code='MT')),
(10708,'Marsa','CF',(select id from countries where code='MT')),
(10709,'Challenge fixture 10709','CF',(select id from countries where code='MT')),
(10710,'Challenge fixture 10710','CF',(select id from countries where code='MT')),
(10711,'Sirens','CF',(select id from countries where code='MT')),
(10712,'Challenge fixture 10712','CF',(select id from countries where code='MT')),
(10714,'Challenge fixture 10714','CF',(select id from countries where code='MT')),
(10715,'Challenge fixture 10715','CF',(select id from countries where code='MT')),
(10716,'Fgura United','CF',(select id from countries where code='MT')),
(10717,'Challenge fixture 10717','CF',(select id from countries where code='MT')),
(10718,'Challenge fixture 10718','CF',(select id from countries where code='MT'));
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select 34876+n,972,'2025/26',n,'2026-04-06','2026-04-06T10:00Z'from generate_series(1,22)n;
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select 34898+n,972,'2026/27',n,case when n>=5 then'2026-10-23'::date else'2026-09-01'::date end,case when n>=5 then'2026-10-23T10:15Z'::timestamptz else'2026-09-01T10:00Z'::timestamptz end from generate_series(1,11)n;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at)overriding system value values
(517571,34881,10703,10716,'2025-11-02',1,2,'mt50903309','https://matchcentre.mfa.com.mt/match/50903309',now()),
(517590,34883,10708,10704,'2025-11-29',2,3,'mt50903328','https://matchcentre.mfa.com.mt/match/50903328',now()),
(517620,34887,10705,10708,'2026-01-11',3,2,'mt50903358','https://matchcentre.mfa.com.mt/match/50903358',now()),
(517703,34896,10711,10691,'2026-04-06',0,1,'mt52353213','https://matchcentre.mfa.com.mt/match/52353213',now());
insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value values
(517745,34903,10707,10710,'2026-10-25'),
(517751,34903,10714,10716,'2026-10-24'),
(517747,34903,10717,10703,'2026-10-23'),
(517748,34903,10718,10706,'2026-10-25'),
(517746,34903,10711,10678,'2026-10-24'),
(517749,34903,10704,10709,'2026-10-25'),
(517744,34903,10715,10705,'2026-10-23'),
(517750,34903,10712,10682,'2026-10-24');
insert into matches(round_id,home_team_id,away_team_id,played_on)select 34898+n,v.home,v.away,'2026-10-30'from generate_series(6,11)n cross join(values(10707,10710),(10714,10716),(10717,10703),(10718,10706),(10711,10678),(10704,10709),(10715,10705),(10712,10682))v(home,away);
do $$declare t record;i int;pid bigint;tid bigint;home bigint;away bigint;mid bigint;n int;rn int;side_count int;begin
 for tid in select id from teams where id in(10678,10682,10691,10703,10704,10705,10706,10707,10708,10709,10710,10711,10712,10714,10715,10716,10717,10718)loop
  for i in 1..16 loop
   insert into players(competition_id,team_id,reg_st,first_name,last_name,full_name,position,position_source,value,value_start,active)values(972,tid,tid*100+i,'Fixture',tid||'-'||i,'Fixture '||tid||'-'||i,case when i=1 then'GK'when i<=5 then'DEF'when i<=10 then'MID'else'FWD'end,case when i=1 then'zapisnik'else'ugibanje'end,case when i=2 then 12 else 4 end,case when i=2 then 12 else 4 end,tid in(10678,10682,10703,10704,10705,10706,10707,10709,10710,10711,10712,10714,10715,10716,10717,10718))returning id into pid;
  end loop;
 end loop;
 for t in select *from private_mfa_challenge_history.targets()loop
  for tid in select t.home_id union all select t.away_id loop
   side_count:=case when tid=t.home_id then 16 else t.appearance_count-16 end;
   i:=0;for pid in select id from players where competition_id=972 and team_id=tid order by id limit side_count loop i:=i+1;insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)values(t.match_id,pid,tid,i<=11,case when i<=11 then 90 else 0 end,0,case when i<=11 then 90 else 0 end,i=1);if tid=t.home_id and i<=t.goal_count then insert into goals(match_id,scorer_id,team_id,minute)values(t.match_id,pid,tid,i*10);end if;end loop;
  end loop;
 end loop;
 n:=0;
 for rn in 1..26 loop
  for home,away in select v.home,v.away from(values(10707::bigint,10710::bigint),(10714::bigint,10716::bigint),(10717::bigint,10703::bigint),(10718::bigint,10706::bigint),(10711::bigint,10678::bigint),(10704::bigint,10709::bigint),(10715::bigint,10705::bigint),(10712::bigint,10682::bigint))v(home,away)loop
   if rn<=22 and exists(select 1 from private_mfa_challenge_history.targets()tg where tg.round_number=rn and tg.home_id=home and tg.away_id=away)then continue;end if;
   if rn<=22 and(select count(*)from matches where round_id=34876+rn)>=8 then continue;end if;
   n:=n+1;
   insert into matches(round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at)values(case when rn<=22 then 34876+rn else 34898+rn-22 end,home,away,case when rn<=22 then'2026-04-06'::date else'2026-09-01'::date end,0,0,'mt'||(70000000+n),'https://matchcentre.mfa.com.mt/match/'||(70000000+n),now())returning id into mid;
   for tid in select home union all select away loop
    for pid in select id from players where competition_id=972 and team_id=tid order by id limit 11 loop insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)select mid,pid,tid,true,90,0,90,position='GK'from players where id=pid;end loop;
   end loop;
   if n=173 then
    select id into pid from players where competition_id=972 and team_id=home order by id offset 10 limit 1;
    update appearances set minutes_played=60,minute_off=60 where match_id=mid and player_id=pid;
    select id into pid from players where competition_id=972 and team_id=home order by id offset 11 limit 1;
    insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)values(mid,pid,home,false,30,60,90,false);
   end if;
  end loop;
 end loop;
 for i in select distinct round_id from matches m join rounds r on r.id=m.round_id where r.competition_id=972 loop perform recompute_round_scores(i);end loop;
end$$;
-- The shared marker reader/triggers support MFA, but its generic installer
-- remains intentionally closed. The dedicated native cleanup is the only writer.
savepoint generic_mfa_refusal;
update competitions set source_policy='mt-mfa-challenge-reviewed-history-v1',prvi_fantasy_krog=5 where id=972;
do $$declare p record;begin
 select *into p from private_historical_statistics.policies where id='mt-challenge-reviewed-history-2026-10-21-v1';
 begin
  perform public.apply_historical_statistics_policy(972,p.id,p.policy_sha256,p.document->'entries');
 exception when others then
  if sqlerrm='HISTORICAL_POLICY: source country differs'then return;end if;
  raise;
 end;
 raise exception 'MFA TEST: generic MFA policy installer unexpectedly accepted';
end$$;
select pg_temp.mfa_assert(not exists(select 1 from private_historical_statistics.installed_policies where competition_id=972)and not exists(select 1 from private_historical_statistics.markers where competition_id=972),'generic refusal left no partial MFA binding');
rollback to generic_mfa_refusal;

-- Exercise preview's own bench gate, not just the final generic activation
-- trigger. Capture/cleanup the no-bench variant canonically, then roll it back.
savepoint no_retained_bench;
delete from appearances a using matches m where m.id=a.match_id and m.zapisnik_id='mt70000173'and not a.started;
update appearances a set minutes_played=90,minute_off=90 from matches m where m.id=a.match_id and m.zapisnik_id='mt70000173'and a.started and a.minute_off=60;
do $$declare sha text;proof jsonb;begin
 select policy_sha256 into sha from private_historical_statistics.policies where id='mt-challenge-reviewed-history-2026-10-21-v1';
 proof:=private_mfa_challenge_history.prepare_core(repeat('a',40),sha,'2026-10-21T08:00Z');
 perform private_mfa_challenge_history.apply_core(repeat('a',40),sha,proof->>'beforeSha256',proof->>'beforeImageText','2026-10-21T08:00Z');
 perform public.record_mfa_challenge_reviewed_prices(repeat('a',40));
 begin
  perform private_mfa_challenge_history.release_core(repeat('a',40),null,false,'2026-10-21T08:00Z');
 exception when others then
  if sqlerrm='MFA_CHALLENGE_HISTORY: retained substitute appearance required before preview or activation'then return;end if;
  raise;
 end;
 raise exception 'MFA TEST: no-bench preview unexpectedly passed';
end$$;
rollback to no_retained_bench;
select pg_temp.mfa_assert((select count(*)from appearances a join matches m on m.id=a.match_id where m.zapisnik_id='mt70000173'and not a.started and a.minute_on=60 and a.minute_off=90 and a.minutes_played=30)=1,'retained current substitute fixture');
select pg_temp.mfa_assert(not exists(select a.team_id from appearances a join matches m on m.id=a.match_id where m.zapisnik_id='mt70000173'group by a.team_id having sum(a.minutes_played)<>990 or count(*)filter(where a.started)<>11),'retained substitution preserves both11/990 sides');
create temporary table mfa_proof as select repeat('a',40)main_sha,policy_sha256 policy_sha,private_mfa_challenge_history.prepare_core(repeat('a',40),policy_sha256,'2026-10-21T08:00Z')prepared from private_historical_statistics.policies where id='mt-challenge-reviewed-history-2026-10-21-v1';
select pg_temp.mfa_assert(not exists(select 1 from private_historical_statistics.source_club_bindings where provider='mfa'and source_club_id in('39647','39626','39641','39632','39631','40411','39612')and bound_team_id is not null),'prepare has no binding mutation');
create function pg_temp.mfa_mutant(command text,message text)returns void language plpgsql as $$declare p mfa_proof%rowtype;image jsonb;begin select *into p from mfa_proof;begin execute command;image:=private_mfa_challenge_history.capture();perform pg_temp.mfa_refuses(format('select private_mfa_challenge_history.apply_core(%L,%L,%L,%L,%L::timestamptz)',p.main_sha,p.policy_sha,p.prepared->>'beforeSha256',p.prepared->>'beforeImageText','2026-10-21T08:00Z'),message);perform pg_temp.mfa_assert(private_mfa_challenge_history.capture()=image,'failed cleanup rolls back all effects');raise exception using errcode='ZX001',message='rollback mutant';exception when sqlstate'ZX001'then null;end;end$$;
insert into auth.users(id,email)values('fb000000-0000-4000-8000-000000000001','mfa-fixture@example.invalid');
insert into profiles(id,display_name)values('fb000000-0000-4000-8000-000000000001','MFA fixture')on conflict(id)do nothing;
-- DB-owner insert has no inactive-league trigger: existing team triggers only
-- protect house-owner/name consistency and referral qualification. This reaches
-- the MFA lock_scope no-user-activity refusal without disabling any trigger.
select pg_temp.mfa_mutant('insert into fantasy_teams(owner_id,name,competition_id)values(''fb000000-0000-4000-8000-000000000001'',''MFA target'',972)','new fantasy team');
select pg_temp.mfa_mutant('update appearances set minutes_played=89 where id=(select min(id)from appearances where match_id=517571)','individual drift');
select pg_temp.mfa_mutant('update matches set home_goals=7 where id=517571','official score drift');
select pg_temp.mfa_mutant('update rounds set number=33 where id=34881','round drift');
select pg_temp.mfa_mutant('insert into position_votes_deleted(id,player_id)select 999001,min(id)from players where competition_id=972','deleted position vote');
select pg_temp.mfa_mutant('insert into assist_votes_deleted(id,goal_id)select 999001,min(id)from goals where match_id=517571','deleted assist vote');
select pg_temp.mfa_mutant('create table public.mfa_unreviewed_dependency(id bigint primary key,goal_id bigint references public.goals(id)on delete cascade)','new dependency');
select pg_temp.mfa_refuses(format('select private_mfa_challenge_history.apply_core(%L,%L,%L,%L,%L::timestamptz)',main_sha,policy_sha,repeat('0',64),prepared->>'beforeImageText','2026-10-21T08:00Z'),'wrong beforeimage SHA')from mfa_proof;
select private_mfa_challenge_history.apply_core(main_sha,policy_sha,prepared->>'beforeSha256',prepared->>'beforeImageText','2026-10-21T08:00Z')from mfa_proof;
select pg_temp.mfa_assert((select count(*)from appearances where match_id in(517571,517590,517620,517703))=0 and(select count(*)from goals where match_id in(517571,517590,517620,517703))=0,'exact118/14 removed');
select pg_temp.mfa_assert((select count(*)from matches where id in(517571,517590,517620,517703)and statistics_status='unavailable_historical'and imported_at is null)=4 and exists(select 1 from matches where id=517571 and home_goals=1 and away_goals=2)and exists(select 1 from matches where id=517703 and home_goals=0 and away_goals=1),'four official scores preserved');
select pg_temp.mfa_assert(jsonb_array_length(public.get_installed_historical_statistics_markers(972)->'markers')=4,'complete canonical archive markers');
select pg_temp.mfa_refuses('update competitions set active=true where id=972','generic active update cannot bypass release');
select pg_temp.mfa_refuses('update matches set imported_at=now()where id=517571','ordinary importer cannot resurrect unavailable report');
select pg_temp.mfa_refuses('insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_off)select 517571,min(id),10703,true,90,90 from players where competition_id=972 and team_id=10703','ordinary importer cannot recreate appearances');
select pg_temp.mfa_refuses(format('select private_mfa_challenge_history.release_core(%L,null,false,%L::timestamptz)',main_sha,'2026-10-21T08:00Z'),'fresh price receipt required')from mfa_proof;
-- Record after the same existing DB-only price computation stage; fixture prices
-- are deliberately synthetic. Main may advance since immutable cleanup.
savepoint replaced_report;
update matches set imported_at=now()+interval '1 minute'where zapisnik_id='mt70000001';
select pg_temp.mfa_refuses('select public.record_mfa_challenge_reviewed_prices(repeat(''b'',40))','repricing cannot bless changed source reports');
rollback to replaced_report;
select public.record_mfa_challenge_reviewed_prices(repeat('b',40));
create temporary table mfa_preview as select private_mfa_challenge_history.release_core(repeat('b',40),null,false,'2026-10-21T08:00Z')preview;
select pg_temp.mfa_assert((select(preview#>>'{preview,sourceFixtureCount}')::int =208 from mfa_preview),'source208/count gate');
select pg_temp.mfa_refuses('select private_mfa_challenge_history.release_core(repeat(''b'',40),repeat(''0'',64),true,''2026-10-21T08:00Z'')','wrong reviewed preview');
savepoint stale_price;
update players set value=value+0.5 where id=(select min(id)from players where competition_id=972);
select pg_temp.mfa_refuses('select private_mfa_challenge_history.release_core(repeat(''b'',40),null,false,''2026-10-21T08:00Z'')','price/native drift requires new reprice');
rollback to stale_price;
savepoint missing_keeper;
update players set position='DEF'where competition_id=972 and team_id=10707 and position='GK';
select public.record_mfa_challenge_reviewed_prices(repeat('b',40));
select pg_temp.mfa_refuses('select private_mfa_challenge_history.release_core(repeat(''b'',40),null,false,''2026-10-21T08:00Z'')','missing actual trusted goalkeeper');
rollback to missing_keeper;
savepoint flat_prices;
update players set value=4.5 where competition_id=972;
select public.record_mfa_challenge_reviewed_prices(repeat('b',40));
select pg_temp.mfa_refuses('select private_mfa_challenge_history.release_core(repeat(''b'',40),null,false,''2026-10-21T08:00Z'')','flat fresh prices still fail');
rollback to flat_prices;
select pg_temp.mfa_refuses('select private_mfa_challenge_history.release_core(repeat(''b'',40),null,false,''2026-10-23T10:15Z'')','past exact deadline must fail');
select private_mfa_challenge_history.release_core(repeat('b',40),preview->>'previewSha256',true,'2026-10-21T08:00Z')from mfa_preview;
select pg_temp.mfa_assert(exists(select 1 from competitions where id=972 and active and prvi_fantasy_krog=5),'dedicated same-transaction activation authorized');
rollback;
