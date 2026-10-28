-- Actual ordinary importer role; all mutations enclosed by caller BEGIN/ROLLBACK.
do $$declare helper regprocedure:='private_fcf_g1_supplement.unknown_result_allowed(text,text,date,text,text,text,integer,integer,integer,timestamp with time zone,boolean,boolean,text[])'::regprocedure;begin
 if not has_function_privilege('service_role',helper,'EXECUTE')or not has_function_privilege('authenticated',helper,'EXECUTE')then raise exception 'CHECK pure predicate writer EXECUTE required';end if;
 if has_function_privilege('anon',helper,'EXECUTE')or has_schema_privilege('service_role','private_fcf_g1_supplement','USAGE')or has_schema_privilege('authenticated','private_fcf_g1_supplement','USAGE')then raise exception 'private supplement privileges expanded';end if;
 if exists(select 1 from pg_proc p where p.pronamespace='private_fcf_g1_supplement'::regnamespace and p.oid<>helper::oid and(has_function_privilege('service_role',p.oid,'EXECUTE')or has_function_privilege('authenticated',p.oid,'EXECUTE')))then raise exception 'private mutation helper exposed';end if;
end$$;
create temporary table acl_fixture(round_id bigint,home_id bigint,away_id bigint);
do $$declare cid bigint;rid bigint;h bigint;a bigint;begin
 insert into competitions(slug,name,short_name,source,source_league_code,country_id,active)values('test-g1-placeholder-acl','Result ACL fixture','ACL','eps','epsip.gr:328',(select id from countries where code='GR'),false)returning id into cid;
 insert into teams(name,short_name,country_id)values('ACL fixture home','ACL-H',(select id from countries where code='GR'))returning id into h;
 insert into teams(name,short_name,country_id)values('ACL fixture away','ACL-A',(select id from countries where code='GR'))returning id into a;
 insert into rounds(competition_id,season,number,played_on)values(cid,'2026/27',1,'2026-10-18')returning id into rid;
 insert into acl_fixture values(rid,h,a);
end$$;
grant select on acl_fixture to service_role;
set local role service_role;
set local request.jwt.claim.role='service_role';
insert into public.matches(round_id,home_team_id,away_team_id,home_goals,away_goals,zapisnik_id)select round_id,home_id,away_id,0,0,'g1-acl-normal-report'from acl_fixture;
update public.matches set home_goals=1 where zapisnik_id='g1-acl-normal-report';
insert into public.matches(round_id,home_team_id,away_team_id,home_goals,away_goals,zapisnik_id)select round_id,home_id,away_id,3,1,'g1-acl-normal-report'from acl_fixture on conflict(zapisnik_id)do update set home_goals=excluded.home_goals,away_goals=excluded.away_goals;
do $$begin
 if not exists(select 1 from public.matches where zapisnik_id='g1-acl-normal-report'and home_goals=3 and away_goals=1)then raise exception 'ordinary INSERT/UPDATE/upsert failed';end if;
 begin update public.matches set home_goals=null,away_goals=null where zapisnik_id='g1-acl-normal-report';raise exception 'unapproved NULL accepted';exception when check_violation then null;end;
end$$;
reset role;
select 'SUPPLEMENT_ACL_PASS';
