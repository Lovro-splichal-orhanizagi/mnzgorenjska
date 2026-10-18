import {execFileSync}from'node:child_process'
import{createHash}from'node:crypto'
import{syntheticHnsWomenManifest}from'./hr-zenske-test-fixture.mjs'
const container=process.env.SUPABASE_DB_CONTAINER
if(!container||process.env.HISTORICAL_STATISTICS_DISPOSABLE_TEST!=='1')throw Error('Explicit owned disposable DB required')
const v=syntheticHnsWomenManifest(),raw=JSON.stringify(v),sha=createHash('sha256').update(raw).digest('hex')
if(raw.includes('$hns_test_json$'))throw Error('Unexpected test delimiter')
const sql=`begin;
create function pg_temp.hns_fail_marker()returns trigger language plpgsql as $$begin raise exception 'HNS TEST injected late marker failure';end $$;
create function pg_temp.hns_refuses(q text, expected text default 'HNS_RELEASE|HISTORICAL_POLICY')returns void language plpgsql as $$begin begin execute q;exception when others then if sqlerrm !~ expected then raise exception 'HNS TEST wrong refusal: %',sqlerrm;end if;return;end;raise exception 'HNS TEST expected refusal';end $$;
do $test$declare v text:=$hns_test_json$${raw}$hns_test_json$;sha text:='${sha}';r jsonb;cid bigint;bindings jsonb;bound_id bigint;changed jsonb;original_count int;begin
 if exists(select 1 from competitions where slug='hr-prva-hnlz')then raise exception 'HNS TEST clean owned baseline required';end if;
 select count(*)into original_count from teams;
 perform pg_temp.hns_refuses(format('select public.prepare_hns_women_release(%L,%L)',v,repeat('0',64)),'reviewed manifest SHA');
 perform pg_temp.hns_refuses('select public.get_hns_women_import_context(999999)','complete prepared native context');
 create trigger hns_test_late_failure before insert on matches for each row execute function pg_temp.hns_fail_marker();
 perform pg_temp.hns_refuses(format('select public.prepare_hns_women_release(%L,%L)',v,sha),'HNS TEST injected late marker failure');
 drop trigger hns_test_late_failure on matches;
 if exists(select 1 from competitions where slug='hr-prva-hnlz')or(select count(*)from teams)<>original_count or exists(select 1 from private_hns_women_release.club_bindings)or exists(select 1 from private_hns_women_release.bootstrap_state)or exists(select 1 from private_hns_women_release.prepared_packets)then raise exception 'HNS TEST late failure left partial bootstrap';end if;
 r:=public.prepare_hns_women_release(v,sha);cid:=(r->>'competitionId')::bigint;
 if r->'prepared'<>'true'::jsonb or(select active from competitions where id=cid)or(select count(*)from rounds where competition_id=cid)<>40 or(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid)<>3 or exists(select 1 from players where competition_id=cid)or exists(select 1 from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=cid)or exists(select 1 from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=cid)then raise exception 'HNS TEST atomic bootstrap/zero observations failed';end if;
 if jsonb_array_length(public.get_installed_historical_statistics_markers(cid)->'markers')<>3 then raise exception 'HNS TEST incomplete markers';end if;
 bindings:=public.get_hns_women_import_context(cid);if jsonb_array_length(bindings->'clubs')<>8 then raise exception 'HNS TEST incomplete native clubs';end if;
 r:=public.prepare_hns_women_release(v,sha);if(r->>'competitionId')::bigint<>cid or(select count(*)from private_hns_women_release.prepared_packets where competition_id=cid)<>1 then raise exception 'HNS TEST retry duplicated target';end if;
 select team_id into bound_id from private_hns_women_release.club_bindings where competition_id=cid and source_club_id='171';
 update teams set name='TEST ONLY renamed display'where teams.id=bound_id;
 r:=public.prepare_hns_women_release(v,sha);
 if not exists(select 1 from jsonb_array_elements(public.get_hns_women_import_context(cid)->'clubs')x where(x->>'teamId')::bigint=bound_id and x->>'canonicalName'='ŽNK Osijek')then raise exception 'HNS TEST display rename changed native identity';end if;
 perform pg_temp.hns_refuses(format('update teams set country_id=(select id from countries where code=''SI'')where id=%s',bound_id));
 perform pg_temp.hns_refuses(format('delete from teams where id=%s',bound_id));
 foreach changed in array array[jsonb_set(v::jsonb,'{releaseReady}','false'),jsonb_set(v::jsonb,'{sourcePolicy}','"unknown"'),jsonb_set(v::jsonb,'{sourceBudget,total}','999'),jsonb_set(v::jsonb,'{persistedFixtures,0,appearances,0,is_goalkeeper}','false'),jsonb_set(v::jsonb,'{persistedFixtures,0,sourceRound}','99'),jsonb_set(v::jsonb,'{schedules,1,fixtures,0,domaciId}','"unknown"'),jsonb_set(v::jsonb,'{schedules,1,fixtures,0,krog}','99'),jsonb_set(v::jsonb,'{schedules,0,fixtures,0,sourcePhase}','"unknown"')]loop
  perform pg_temp.hns_refuses(format('select public.prepare_hns_women_release(%L,%L)',changed::text,encode(sha256(convert_to(changed::text,'UTF8')),'hex')));
 end loop;
 if has_function_privilege('anon','public.prepare_hns_women_release(text,text)','execute')or has_function_privilege('authenticated','public.prepare_hns_women_release(text,text)','execute')or has_function_privilege('anon','public.get_hns_women_import_context(bigint)','execute')or has_function_privilege('authenticated','public.get_hns_women_import_context(bigint)','execute')or not has_function_privilege('service_role','public.prepare_hns_women_release(text,text)','execute')or not has_function_privilege('service_role','public.get_hns_women_import_context(bigint)','execute')or has_schema_privilege('service_role','private_hns_women_release','usage')or has_table_privilege('service_role','private_hns_women_release.club_bindings','insert')then raise exception 'HNS TEST public bootstrap/context exposed';end if;
 raise notice 'HNS bootstrap atomic103normal+3unavailable synthetic source surface PASS';
end $test$;
rollback;`
execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','inherit','inherit']})
