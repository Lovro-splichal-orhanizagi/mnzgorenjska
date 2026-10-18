begin;
-- TEST ONLY: rollback-only temporal scenarios against native reviewed fixture IDs.
do $$declare cid bigint;rid bigint;f jsonb;g jsonb;result jsonb;due timestamptz;was_future boolean;captured timestamptz:=clock_timestamp();sha text:=repeat('a',64);begin
 select coalesce(max(id),0)+1000 into cid from public.competitions;
 insert into public.competitions(id,slug,name,short_name,country_id,source,source_league_code,source_policy,date_only_deadline_policy,prvi_fantasy_krog)
 overriding system value values(cid,'hr-prva-hnlz','TEST ONLY HNS women','TEST ONLY',(select id from countries where code='HR'),'hns','114471579','hr-hnlz-v1','midnight-local-v1',9);
 select jsonb_agg(document||jsonb_build_object('datum','2026-10-25','ura',null,'postponed',false)) into f from private_hns_women_release.fixture_catalog where source_competition_id='114471579'and internal_round=9;
 result:=public.update_hns_women_round(cid,'114471579',9,f,sha,captured);
 if (result->>'deadlineAt')::timestamptz is distinct from '2026-10-24 22:00Z'::timestamptz then raise exception 'date-only Zagreb DST cutoff differs:%',result;end if;
 rid:=(result->>'roundId')::bigint;was_future:=(result->>'deadlineAt')::timestamptz>clock_timestamp();
 if exists(select 1 from private_hns_women_release.round_sources where round_id=rid and effective_document#>>'{candidates,0,sourceKickoff}'is not null)then raise exception 'invented kickoff';end if;
 select jsonb_agg(x||jsonb_build_object('ura','15:00'))into g from jsonb_array_elements(f)x;
 result:=public.update_hns_women_round(cid,'114471579',9,g,sha,captured);
 if(result->>'deadlineAt')::timestamptz is distinct from '2026-10-24 22:00Z'::timestamptz then raise exception 'later published kickoff reopened cutoff';end if;
 select jsonb_agg(x||jsonb_build_object('datum','2026-10-24'))into g from jsonb_array_elements(f)x;
 result:=public.update_hns_women_round(cid,'114471579',9,g,sha,captured);
 if was_future and(result->>'deadlineAt')::timestamptz is distinct from '2026-10-23 22:00Z'::timestamptz then raise exception 'earlier legitimate candidate not applied';end if;
 begin delete from rounds where id=rid;raise exception 'protected round deleted';exception when raise_exception then if sqlerrm='protected round deleted'then raise;end if;end;
 begin update rounds set deadline_at=deadline_at+interval '1 hour'where id=rid;raise exception 'direct update accepted';exception when raise_exception then if sqlerrm='direct update accepted'then raise;end if;end;
 update rounds set lineups_locked_at=clock_timestamp()where id=rid;
 begin update rounds set lineups_locked_at=null where id=rid;raise exception 'lineups reopened';exception when raise_exception then if sqlerrm='lineups reopened'then raise;end if;end;
 select jsonb_agg(x||jsonb_build_object('datum','2026-10-23'))into g from jsonb_array_elements(f)x;
 result:=public.update_hns_women_round(cid,'114471579',9,g,sha,captured);
 if result->>'retained'is distinct from 'locked_or_expired'then raise exception 'locked round changed';end if;
 select jsonb_agg(document||jsonb_build_object('datum','2026-10-17','ura',null,'postponed',false))into f from private_hns_women_release.fixture_catalog where source_competition_id='114471579'and internal_round=10;
 result:=public.update_hns_women_round(cid,'114471579',10,f,sha,captured);rid:=(result->>'roundId')::bigint;due:=(result->>'deadlineAt')::timestamptz;
 select jsonb_agg(x||jsonb_build_object('datum','2026-11-01'))into g from jsonb_array_elements(f)x;
 result:=public.update_hns_women_round(cid,'114471579',10,g,sha,captured);
 if(result->>'deadlineAt')::timestamptz is distinct from due or result->>'retained'is distinct from 'locked_or_expired'then raise exception 'expired-but-unlocked round reopened';end if;
 -- Full fixture identities, source age and real local clocks remain mandatory.
 foreach g in array array[f-0,jsonb_set(f,'{0,domaciId}','"foreign"'),jsonb_set(f,'{0,sourceRound}','99'),jsonb_set(f,'{0,datum}','null'),jsonb_set(f,'{0,ura}','"25:00"')]loop
  begin perform public.update_hns_women_round(cid,'114471579',10,g,sha,captured);raise exception 'invalid fixture accepted';exception when raise_exception then if sqlerrm='invalid fixture accepted'then raise;end if;end;
 end loop;
 begin perform public.update_hns_women_round(cid,'114471579',10,f,sha,captured-interval '13 hours');raise exception 'stale source accepted';exception when raise_exception then if sqlerrm='stale source accepted'then raise;end if;end;
 begin perform public.update_hns_women_round(cid,'unknown',10,f,sha,captured);raise exception 'unknown phase accepted';exception when raise_exception then if sqlerrm='unknown phase accepted'then raise;end if;end;
 select jsonb_agg(x||jsonb_build_object('datum','2026-10-25','ura','02:30'))into g from jsonb_array_elements(f)x;
 begin perform public.update_hns_women_round(cid,'114471579',10,g,sha,captured);raise exception 'ambiguous source time accepted';exception when raise_exception then if sqlerrm='ambiguous source time accepted'then raise;end if;end;
 if has_function_privilege('anon','public.update_hns_women_round(bigint,text,integer,jsonb,text,timestamp with time zone)','execute')or has_function_privilege('authenticated','public.update_hns_women_round(bigint,text,integer,jsonb,text,timestamp with time zone)','execute')then raise exception 'public deadline writer';end if;
 raise notice 'HNS women deadline invariants PASS';
end $$;
rollback;
