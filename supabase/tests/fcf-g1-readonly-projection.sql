-- CI synthetic-only, parent BEGIN/ROLLBACK. No source/native admission evidence.
create function pg_temp.observer_assert(ok boolean,label text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'G1 OBSERVER TEST: %',label;end if;end$$;
-- A disposable reset has only empty target headers; refuse populated fixtures.
select pg_temp.observer_assert(not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id in(783,797))and not exists(select 1 from rounds where competition_id in(783,797)),'empty fresh-CI target headers required');
insert into competitions(id,slug,name,short_name,source,source_league_code,sezona_koledarska,country_id,active,prvi_fantasy_krog,source_policy,rok_pomak_ur,date_only_deadline_policy)overriding system value
values(783,'es-ct-segona-g1','TEST OBSERVER G1','TEST','fcf','4109388-4109627',false,(select id from countries where code='ES'),false,1,'es-fcf-six-reviewed-history-v1',6,null),
(797,'es-ct-tercera-g9','TEST OBSERVER G9','TEST','fcf','4118349-4118588',false,(select id from countries where code='ES'),false,1,'es-fcf-six-reviewed-history-v1',6,null)
on conflict(id)do update set slug=excluded.slug,name=excluded.name,short_name=excluded.short_name,source=excluded.source,source_league_code=excluded.source_league_code,sezona_koledarska=excluded.sezona_koledarska,country_id=excluded.country_id,active=excluded.active,prvi_fantasy_krog=excluded.prvi_fantasy_krog,source_policy=excluded.source_policy,rok_pomak_ur=excluded.rok_pomak_ur,date_only_deadline_policy=excluded.date_only_deadline_policy;
insert into teams(id,name,short_name,country_id)overriding system value select -931000-i,'TEST observer club '||i,'TEST',(select id from countries where code='ES')from generate_series(0,17)i;
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select -932000-i,783,'2026/27',i,'2026-09-19'::date+7*(i-1),'2030-01-01T12:00Z'::timestamptz+interval'7days'*(i-1)from generate_series(1,30)i;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,source_round)overriding system value select -933000-i,-932001-i/8,-931000-2*(i%8),-931001-2*(i%8),'2026-09-19'::date+7*(i/8),'es'||(4109388+i),'https://www.fcf.cat/ca/competicio/acta/'||(4109388+i),1+i/8 from generate_series(0,239)i;
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value values(-934000,797,'2026/27',1,'2026-09-19','2030-01-01T12:00Z');
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,source_round,imported_at,home_goals,away_goals)overriding system value values(-934001,-934000,-931016,-931017,'2026-09-19','es4118349','https://www.fcf.cat/ca/competicio/acta/4118349',1,now(),1,0);
create function pg_temp.reject(command text,pattern text)returns void language plpgsql as $$begin begin execute command;raise exception 'G1 OBSERVER TEST: accepted invalid operation';exception when others then if SQLERRM!~pattern then raise;end if;end;end$$;
select pg_temp.reject('select private_fcf_future_projection.capture(''es-ct-segona-g1'',array[]::text[])','inactive quiet G9');
create function pg_temp.capture()returns jsonb language sql stable as $$select private_fcf_g1_readonly.capture('es-ct-segona-g1',array[]::text[])$$;
create temporary table immutable_before as select
 (select jsonb_agg(to_jsonb(m)order by id)from matches m)matches,
 (select jsonb_agg(to_jsonb(r)order by id)from rounds r)rounds,
 (select jsonb_agg(to_jsonb(x)order by match_id)from private_fcf_g1_supplement.markers x)markers,
 (select jsonb_agg(to_jsonb(x)order by match_id)from private_fcf_g1_supplement.receipts x)receipts,
 pg_get_functiondef('private_fcf_future_projection.capture(text,text[])'::regprocedure)old_definition;
create temporary table observed as select pg_temp.capture()p;
select pg_temp.observer_assert(p#>>'{native,competition,id}'='783'and jsonb_array_length(p#>'{native,rounds}')=30 and jsonb_array_length(p#>'{native,matches}')=240 and p#>>'{native,dependencies,complete}'='true','complete G1 observer succeeds with imported G9')from observed;
select pg_temp.observer_assert(not has_schema_privilege('service_role','private_fcf_g1_readonly','usage')and not has_function_privilege('service_role','private_fcf_g1_readonly.capture(text,text[])','execute')and has_function_privilege('service_role','public.fcf_g1_readonly_projection(text[])','execute')and not has_function_privilege('authenticated','public.fcf_g1_readonly_projection(text[])','execute')and not has_function_privilege('anon','public.fcf_g1_readonly_projection(text[])','execute'),'service-only wrapper and closed private copy');
select pg_temp.reject('select public.fcf_g1_readonly_projection(array[]::text[])','explicit readonly transaction required');
select pg_temp.observer_assert((select jsonb_agg(to_jsonb(m)order by id)from matches m)is not distinct from b.matches and(select jsonb_agg(to_jsonb(r)order by id)from rounds r)is not distinct from b.rounds and(select jsonb_agg(to_jsonb(x)order by match_id)from private_fcf_g1_supplement.markers x)is not distinct from b.markers and(select jsonb_agg(to_jsonb(x)order by match_id)from private_fcf_g1_supplement.receipts x)is not distinct from b.receipts and pg_get_functiondef('private_fcf_future_projection.capture(text,text[])'::regprocedure)=b.old_definition,'all native rows/markers/receipts and old projection unchanged')from immutable_before b;
-- Each corrupt schema exists only inside a subtransaction which rolls back.
create function pg_temp.schema_hold(command text,pattern text)returns void language plpgsql as $$begin begin execute command;perform pg_temp.reject('select pg_temp.capture()',pattern);raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if SQLERRM<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;
select pg_temp.schema_hold('create table public.observer_unknown(player_id bigint references players(id))','unknown/missing relevant FK');
select pg_temp.schema_hold('create table public.observer_unknown(round_id bigint)','unknown');
select pg_temp.schema_hold('alter table public.fantasy_roster add column unknown_dependency bigint','shape');
select pg_temp.reject('select private_fcf_g1_readonly.capture(''es-ct-segona-g1'',array[null]::text[])','privacy');
select 'FCF_G1_READONLY_OBSERVER_PASS';

-- Observe real nonzero dependency rows rather than guessing all users are zero.
do $$declare p jsonb;b jsonb;begin begin
 b:=pg_temp.capture();
 -- Real user:true audit relation. Nullable user_id is FK-valid by the retained
 -- schema; the explicit competition JSON binds this row to target783.
 insert into scout.dnevnik(team_id,vrsta,parametri)values(-931000,'igralec','{"competition_id":783}'::jsonb);
 p:=pg_temp.capture();
 perform pg_temp.observer_assert((p#>>'{native,dependencies,competitionUserRows}')::bigint=(b#>>'{native,dependencies,competitionUserRows}')::bigint+1,'actual G1 Scout audit increments the user counter');
 perform pg_temp.observer_assert((p->>'dependencySnapshotText')::jsonb#>>'{relations,scout.dnevnik,globalUser}'='true'and((p->>'dependencySnapshotText')::jsonb#>>'{relations,scout.dnevnik,count}')::bigint=((b->>'dependencySnapshotText')::jsonb#>>'{relations,scout.dnevnik,count}')::bigint+1,'actual G1 Scout audit relation is counted');
 raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if SQLERRM<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;
