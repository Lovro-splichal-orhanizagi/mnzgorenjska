-- Disposable-database regression for the actual PostgREST importer role.
begin;
do $$declare helper regprocedure:='private_fcf_six_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)'::regprocedure;begin
 if not has_function_privilege('service_role',helper,'EXECUTE')or not has_function_privilege('authenticated',helper,'EXECUTE')then raise exception 'Result CHECK helper must support the existing writer roles';end if;
 if has_function_privilege('anon',helper,'EXECUTE')or has_schema_privilege('service_role','private_fcf_six_history','USAGE')or has_schema_privilege('authenticated','private_fcf_six_history','USAGE')then raise exception 'Private result helper privileges expanded beyond stored CHECK execution';end if;
 if exists(select 1 from pg_proc p where p.pronamespace='private_fcf_six_history'::regnamespace and p.oid<>helper::oid and(has_function_privilege('service_role',p.oid,'EXECUTE')or has_function_privilege('authenticated',p.oid,'EXECUTE')))then raise exception 'A private mutation helper became callable';end if;
end$$;
create temporary table acl_fixture(round_id bigint,home_id bigint,away_id bigint);
do $$declare cid bigint;rid bigint;h bigint;a bigint;begin
 insert into competitions(slug,name,short_name,source,source_league_code,country_id,active)values('test-match-result-acl','Result ACL fixture','ACL','eps','epsip.gr:328',(select id from countries where code='GR'),false)returning id into cid;
 insert into teams(name,short_name,country_id)values('ACL fixture home','ACL-H',(select id from countries where code='GR'))returning id into h;
 insert into teams(name,short_name,country_id)values('ACL fixture away','ACL-A',(select id from countries where code='GR'))returning id into a;
 insert into rounds(competition_id,season,number,played_on)values(cid,'2026/27',1,'2026-10-18')returning id into rid;
 insert into acl_fixture values(rid,h,a);
end$$;
grant select on acl_fixture to service_role,authenticated;
-- Reproduce the pre-fix ACL, including the short-circuiting normal-score case.
revoke execute on function private_fcf_six_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)from service_role,authenticated;
set local role service_role;
set local request.jwt.claim.role='service_role';
do $$begin
 begin
  insert into public.matches(round_id,home_team_id,away_team_id,home_goals,away_goals,zapisnik_id)select round_id,home_id,away_id,0,0,'acl-normal-report'from acl_fixture;
  raise exception 'Pre-fix CHECK ACL unexpectedly allowed an ordinary write';
 exception when insufficient_privilege then
  if sqlerrm not like '%unknown_result_allowed%'then raise;end if;
 end;
end$$;
reset role;
grant execute on function private_fcf_six_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)to service_role,authenticated;
set local role service_role;
set local request.jwt.claim.role='service_role';
insert into public.matches(round_id,home_team_id,away_team_id,home_goals,away_goals,zapisnik_id)select round_id,home_id,away_id,0,0,'acl-normal-report'from acl_fixture;
update public.matches set home_goals=1 where zapisnik_id='acl-normal-report';
insert into public.matches(round_id,home_team_id,away_team_id,home_goals,away_goals,zapisnik_id)select round_id,home_id,away_id,3,1,'acl-normal-report'from acl_fixture on conflict(zapisnik_id)do update set home_goals=excluded.home_goals,away_goals=excluded.away_goals;
do $$begin
 if not exists(select 1 from public.matches where zapisnik_id='acl-normal-report'and home_goals=3 and away_goals=1)then raise exception 'Service-role ordinary INSERT/UPDATE/upsert failed';end if;
 begin
  update public.matches set home_goals=null,away_goals=null where zapisnik_id='acl-normal-report';
  raise exception 'Unreviewed NULL result was accepted';
 exception when check_violation then null;
 end;
end$$;
reset role;
rollback;
