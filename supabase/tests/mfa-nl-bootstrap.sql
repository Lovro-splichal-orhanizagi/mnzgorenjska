-- Explicit fresh owned DB only; included synthetic fixture always rolls back.
begin;
set local jit=off;
create function pg_temp.nl_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'MFA NL TEST: %',message;end if;end$$;
create function pg_temp.nl_refuses(q text,expected text default 'MFA_NL_BOOTSTRAP:|HISTORICAL_POLICY:')returns void language plpgsql as $$begin begin execute q;exception when others then if sqlerrm !~ expected then raise exception 'MFA NL TEST: wrong refusal %',sqlerrm;end if;return;end;raise exception 'MFA NL TEST: expected refusal';end$$;
select pg_temp.nl_assert(to_regprocedure('public.prepare_mfa_nl_reviewed_bootstrap(bigint,text,text)')is not null,'closed native prepare API missing');
\ir mfa-nl-bootstrap-fixture.sql
select pg_temp.nl_assert(not has_schema_privilege('service_role','private_mfa_nl_history','USAGE'),'private schema exposed');
select pg_temp.nl_assert(not has_function_privilege('service_role','private_mfa_nl_history.prepare_core(bigint,text,text,timestamptz)','EXECUTE'),'private clock core exposed');
select pg_temp.nl_assert(not has_function_privilege('anon','public.prepare_mfa_nl_reviewed_bootstrap(bigint,text,text)','EXECUTE')and not has_function_privilege('authenticated','public.apply_mfa_nl_reviewed_bootstrap(bigint,text,text,text,text)','EXECUTE'),'public wrappers exposed');
select pg_temp.nl_assert(has_function_privilege('service_role','public.apply_mfa_nl_reviewed_bootstrap(bigint,text,text,text,text)','EXECUTE'),'service install wrapper missing');
select pg_temp.nl_assert(to_regprocedure('public.prepare_mfa_nl_reviewed_bootstrap(bigint,text,text,timestamptz)')is null,'caller clock accepted');
do $$begin if not exists(select 1 from private_historical_statistics.policies where id='mt-nl1-reviewed-history-2026-10-21-v1')then perform pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(973,repeat(''e'',40),repeat(''a'',64))');end if;end$$;
insert into private_historical_statistics.policies select id,sha,document from nl_test_policies on conflict(id)do nothing;
do $$declare role_name text;begin
 foreach role_name in array array['anon','authenticated']loop
  execute format('set local role %I',role_name);
  begin perform public.prepare_mfa_nl_reviewed_bootstrap(974,repeat('e',40),pg_temp.nl_sha(974));raise exception 'MFA NL TEST: public role reached restricted wrapper';exception when insufficient_privilege then null;end;
  execute 'reset role';
 end loop;
 execute 'set local role service_role';
 begin perform private_mfa_nl_history.prepare_core(974,repeat('e',40),pg_temp.nl_sha(974),now());raise exception 'MFA NL TEST: service reached private clock core';exception when insufficient_privilege then null;end;
 execute 'reset role';
end$$;

create temporary table nl_prepared(cid bigint primary key,body jsonb);
insert into nl_prepared select cid,public.prepare_mfa_nl_reviewed_bootstrap(cid,repeat('e',40),pg_temp.nl_sha(cid))from(values(973),(974))v(cid);
select pg_temp.nl_assert(not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(973,974))and not exists(select 1 from rounds where competition_id in(973,974)and season='2025/26'),'prepare mutated native state');
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(972,repeat(''e'',40),pg_temp.nl_sha(974))');
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,''wrong'',pg_temp.nl_sha(974))');
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),repeat(''0'',64))');
select pg_temp.nl_refuses('select private_mfa_nl_history.prepare_core(974,repeat(''e'',40),pg_temp.nl_sha(974),''2027-05-01T10:00Z'')');
-- Deleted votes are activity even if no current vote row remains.
savepoint fantasy_activity;
insert into auth.users(id,email,raw_user_meta_data,created_at)values('f0000000-0000-0000-0000-000000000974','bootstrap974@example.test','{"display_name":"Bootstrap fixture"}',now());
insert into fantasy_teams(owner_id,name,competition_id)values('f0000000-0000-0000-0000-000000000974','Bootstrap dependency',974);
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint fantasy_activity;
savepoint player_owned_dependency;
insert into profil_igralca_plus(player_id,opis)select min(id),'Fixture owned profile'from players where competition_id=974;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint player_owned_dependency;
savepoint deleted_vote;
insert into position_votes_deleted(id,player_id)select 9900001,min(id)from players where competition_id=974;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint deleted_vote;
savepoint deleted_assist;
insert into assist_votes_deleted(id,player_id)select 9900002,min(id)from players where competition_id=974;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint deleted_assist;
savepoint bad_tuple;
update competitions set source_league_code='6234492/2028'where id=974;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint bad_tuple;
savepoint bad_policy;
do $$begin if exists(select 1 from private_historical_statistics.policies where id='mt-nl1-reviewed-history-2026-10-21-v1'and document->>'approvalReference'='SYNTHETIC rollback test only')then
 update private_historical_statistics.policies set document=jsonb_set(document,'{sourcePolicy}','"unknown"')where id='mt-nl1-reviewed-history-2026-10-21-v1';
 perform pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(973,repeat(''e'',40),pg_temp.nl_sha(973))');
end if;end$$;
rollback to savepoint bad_policy;
savepoint missing_current_identity;
update matches set zapisnik_id=null,source_url=null where id=9740001;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint missing_current_identity;
savepoint invalid_current_minutes;
update appearances set minutes_played=89 where match_id=9740001 and player_id=(select min(player_id)from appearances where match_id=9740001);
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint invalid_current_minutes;
savepoint no_current_reports;
update matches set imported_at=null where id=9740001;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint no_current_reports;
-- Binding mutations exercise synthetic approval data only. Real reviewed rows stay intact.
do $$begin if exists(select 1 from nl_test_policies where id='mt-nl1-reviewed-history-2026-10-21-v1'and document->>'approvalReference'='SYNTHETIC rollback test only')then
 begin
  delete from private_historical_statistics.source_club_bindings where provider='mfa'and source_club_id='98001';
  perform pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(973,repeat(''e'',40),pg_temp.nl_sha(973))');
  raise exception using errcode='P9001',message='rollback synthetic missing binding';
 exception when sqlstate 'P9001'then null;end;
 begin
  update private_historical_statistics.source_club_bindings set canonical_names=array['NLI bootstrap home','NLI bootstrap away']where provider='mfa'and source_club_id='98001';
  perform pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(973,repeat(''e'',40),pg_temp.nl_sha(973))');
  raise exception using errcode='P9001',message='rollback synthetic ambiguous binding';
 exception when sqlstate 'P9001'then null;end;
 begin
  update private_historical_statistics.source_club_bindings set country_code='SI'where provider='mfa'and source_club_id='98001';
  perform pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(973,repeat(''e'',40),pg_temp.nl_sha(973))');
  raise exception using errcode='P9001',message='rollback synthetic wrong country';
 exception when sqlstate 'P9001'then null;end;
end if;end$$;
savepoint archive_not_empty;
insert into rounds(competition_id,season,number)values(974,'2025/26',1);
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint archive_not_empty;
savepoint opening_locked;
update rounds set lineups_locked_at=now()where id=9740002;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint opening_locked;
savepoint opening_outside_season;
update rounds set played_on='2099-11-01',deadline_at='2099-11-01T10:00Z'where id=9740002;
update matches set played_on='2099-11-01'where id=9740002;
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),pg_temp.nl_sha(974))');
rollback to savepoint opening_outside_season;
savepoint current_drift;
update players set full_name='Changed after prepare'where id=(select min(id)from players where competition_id=974);
select pg_temp.nl_refuses(format('select public.apply_mfa_nl_reviewed_bootstrap(974,%L,%L,%L,%L)',repeat('e',40),pg_temp.nl_sha(974),body->>'beforeSha256',body->>'beforeImageText'))from nl_prepared where cid=974;
rollback to savepoint current_drift;
-- Inject a failure after partial install to prove atomic rollback without disabling guards.
create function pg_temp.nl_late_failure()returns trigger language plpgsql as $$begin if new.competition_id=974 then raise exception 'MFA_NL_BOOTSTRAP: injected late marker failure';end if;return new;end$$;
create trigger nl_test_late_failure before insert on private_historical_statistics.markers for each row execute function pg_temp.nl_late_failure();
select pg_temp.nl_refuses(format('select public.apply_mfa_nl_reviewed_bootstrap(974,%L,%L,%L,%L)',repeat('e',40),pg_temp.nl_sha(974),body->>'beforeSha256',body->>'beforeImageText'))from nl_prepared where cid=974;
drop trigger nl_test_late_failure on private_historical_statistics.markers;
select pg_temp.nl_assert(not exists(select 1 from private_historical_statistics.installed_policies where competition_id=974)and not exists(select 1 from rounds where competition_id=974 and season='2025/26')and(select source_policy is null from competitions where id=974),'late failure left partial binding/header');
create temporary table nl_installed as select cid,public.apply_mfa_nl_reviewed_bootstrap(cid,repeat('e',40),pg_temp.nl_sha(cid),body->>'beforeSha256',body->>'beforeImageText')as result from nl_prepared;
select pg_temp.nl_assert(not exists(select 1 from(values(973),(974))v(cid)where jsonb_array_length(public.get_installed_historical_statistics_markers(cid)->'markers')<>(select jsonb_array_length(document->'entries')from nl_test_policies where id='mt-nl'||(cid-972)||'-reviewed-history-2026-10-21-v1')),'exact complete marker sets required');
select pg_temp.nl_assert((select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id in(973,974)and r.season='2025/26'and m.statistics_status='unavailable_historical'and m.imported_at is null)=(select sum(jsonb_array_length(document->'entries'))from nl_test_policies),'exact unavailable archive headers required');
select pg_temp.nl_assert(not exists(select 1 from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id in(973,974)and r.season='2025/26'),'bad individual rows must never be bootstrapped');
select pg_temp.nl_assert(not exists(select 1 from matches where zapisnik_id='mt50920555'),'abandoned header forbidden');
select pg_temp.nl_assert(exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=974 and r.number=4 and r.season='2025/26'and m.zapisnik_id='mt51962893'and m.played_on='2026-01-13'and m.home_goals=1 and m.away_goals=1),'canonical final archive fixture required');
select pg_temp.nl_assert((select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=974 and r.season='2025/26'and m.statistics_status='unavailable_historical')=3,'all3 approved NLII headers required');
select pg_temp.nl_assert(exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=974 and r.number=7 and m.zapisnik_id='mt50920572'and m.played_on='2025-12-14'and m.home_goals=0 and m.away_goals=0)and exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=974 and r.number=15 and m.zapisnik_id='mt50920621'and m.played_on='2026-02-14'and m.home_goals=2 and m.away_goals=1),'exact newly approved R7/R15 source headers required');
select pg_temp.nl_refuses('select public.prepare_mfa_nl_reviewed_bootstrap(974,repeat(''e'',40),''944fe3cc732dff9fdd7990a9620e9fccf3c1c6751e082b993754f168e01a4ad6'')');
select pg_temp.nl_assert((select count(*)from appearances a join players p on p.id=a.player_id where p.competition_id in(973,974))=44,'current appearances changed');
select pg_temp.nl_assert(not exists(select 1 from nl_installed i where(public.get_mfa_nl_reviewed_bootstrap_receipt(i.cid)->'bootstrap'->>'before_sha')is distinct from(select body->>'beforeSha256'from nl_prepared p where p.cid=i.cid)),'persistent recovery receipt differs');
select pg_temp.nl_refuses(format('select public.apply_mfa_nl_reviewed_bootstrap(974,%L,%L,%L,%L)',repeat('e',40),pg_temp.nl_sha(974),body->>'beforeSha256',body->>'beforeImageText'))from nl_prepared where cid=974;
select pg_temp.nl_refuses('update competitions set active=true where id=974');
select pg_temp.nl_refuses('update matches set statistics_status=''available'',statistics_reason=null where zapisnik_id=''mt51962893''');
select pg_temp.nl_refuses('select public.apply_historical_statistics_policy(974,''mt-nl2-reviewed-history-2026-10-21-v1'',pg_temp.nl_sha(974),(select document->''entries''from nl_test_policies where id like''mt-nl2%''))');
rollback;
