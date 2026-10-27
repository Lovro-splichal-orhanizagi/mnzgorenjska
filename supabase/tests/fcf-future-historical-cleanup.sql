-- TEST ONLY synthetic football rows: no live source or activation proof.
update competitions set prvi_fantasy_krog=1 where id in(783,790,797);
update rounds set deadline_at='2026-10-23T12:00:00Z' where competition_id in(783,790,797) and number=6;
create temporary table future_proof as select repeat('a',40)main,(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1')hashes,public.fcf_future_historical_six_prepare(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'))proof;
select pg_temp.six_assert(proof#>>'{beforeImage,schemaVersion}'='3' and jsonb_array_length(proof#>'{beforeImage,appearances}')=157 and jsonb_array_length(proof#>'{beforeImage,goals}')=18,'future exact schema3 image')from future_proof;
-- These are real database subtransactions: each rejected mutation rolls back.
create function pg_temp.future_reject(command text,label text)returns void language plpgsql as $$begin
 begin execute command;raise exception 'FUTURE TEST: accepted %',label;exception when others then if sqlerrm like 'FUTURE TEST:%'then raise;end if;end;
end$$;
create function pg_temp.future_mutant(command text,label text)returns void language plpgsql as $$declare changed boolean:=false;begin
 begin execute command;changed:=true;perform public.fcf_future_historical_six_apply(main,hashes,proof->>'beforeSha256',proof->>'beforeImageText')from future_proof;raise exception 'FUTURE TEST: accepted mutant %',label;
 exception when others then if not changed or sqlerrm like 'FUTURE TEST:%'then raise;end if;end;
end$$;
select pg_temp.future_reject('select public.fcf_historical_six_prepare(main,hashes)from future_proof','old R6 prepare still refuses seed1');
select pg_temp.future_reject('select public.fcf_future_historical_six_apply(main,hashes,repeat(''0'',64),proof->>''beforeImageText'')from future_proof','wrong before hash');
select pg_temp.future_reject('select public.fcf_future_historical_six_apply(repeat(''b'',40),hashes,proof->>''beforeSha256'',proof->>''beforeImageText'')from future_proof','wrong reviewed commit');
select pg_temp.future_reject('select public.fcf_future_historical_six_prepare(main,hashes||''{"extra":"x"}''::jsonb)from future_proof','expanded policy registry');
select pg_temp.future_mutant('update competitions set prvi_fantasy_krog=6 where id=797','future RPC exact untouched seed1');
select pg_temp.future_reject('update competitions set active=true where id=797','active target');
select pg_temp.future_mutant('update competitions set source_league_code=''wrong'' where id=797','source block');
select pg_temp.future_mutant('update appearances set minutes_played=89,minute_off=89 where id=(select min(id)from appearances)','same count complete row drift');
select pg_temp.future_mutant('delete from appearances where id=(select min(id)from appearances)','appearance count');
select pg_temp.future_mutant('delete from goals where id=(select min(id)from goals)','goal count');
select pg_temp.future_mutant('update players set anonimiziran_at=clock_timestamp()where id=(select min(id)from players where competition_id=783)','privacy suppression');
select pg_temp.future_mutant('insert into auth.users(id,email)values(''11111111-1111-4111-8111-111111111111'',''future-six@example.invalid'');insert into fantasy_teams(owner_id,name,competition_id)values(''11111111-1111-4111-8111-111111111111'',''Synthetic future user'',797)','fantasy users');
select pg_temp.future_mutant('update matches set source_url=''wrong''where zapisnik_id=''es4109389''','missing fixture retained anchor');
select pg_temp.future_mutant('delete from matches where id=321663','missing exact placeholder');
select pg_temp.future_mutant('update matches set vir_brez_izida=false where id=321663','placeholder flag');
select pg_temp.future_mutant('create table public.future_unknown_dependency(appearance_id bigint)','unknown public reference');
select pg_temp.future_mutant('create table scout.future_unknown_dependency(goal_id bigint)','unknown Scout reference');
select pg_temp.future_mutant('create table public.future_unknown_fk(id bigint references appearances(id))','unknown FK even empty');
select pg_temp.future_mutant('update private_historical_statistics.policies set document=jsonb_set(document,''{entries,0,rawSha256}'',to_jsonb(repeat(''0'',64)))where id=''es-ct-tercera-g9-six-reviewed-2026-10-19-v1''','original report hash drift');
select pg_temp.future_mutant('update rounds set lineups_locked_at=clock_timestamp()where id=27616','complete native round before-image drift');
-- Non-FK Scout references and reverse similarity cannot survive deleting stats.
select pg_temp.future_mutant('insert into scout.modeli(leto,backtest,parametri)values(2026,''{}'',''{}'');insert into scout.indeks(model_id,player_id,skupina,indeks,percentil,zaupanje)select max(m.id),min(p.id),''MID'',1,1,1 from scout.modeli m cross join players p where p.competition_id=797','Scout cached player');
select pg_temp.future_mutant('insert into scout.modeli(leto,backtest,parametri)values(2026,''{}'',''{}'');insert into scout.vektorji(model_id,player_id,skupina,vektor,podobni,podobnost)select max(m.id),999999999,''MID'',array[1.0],array[min(p.id)],array[1.0] from scout.modeli m cross join players p where p.competition_id=797','Scout reverse similarity');
select pg_temp.six_assert(not exists(select 1 from future_legacy_contracts where pg_get_functiondef(oid)<>definition),'all old RPC/helper function definitions unchanged');
select pg_temp.six_assert(not has_function_privilege('anon','public.fcf_future_historical_six_apply(text,jsonb,text,text)','execute')and not has_function_privilege('authenticated','public.fcf_future_historical_six_prepare(text,jsonb)','execute')and has_function_privilege('service_role','public.fcf_future_historical_six_apply(text,jsonb,text,text)','execute'),'future maintenance ACL');
select pg_temp.six_assert(not has_schema_privilege('service_role','private_fcf_future_history','usage')and not has_function_privilege('service_role','private_fcf_future_history.apply_core(text,jsonb,text,text)','execute'),'no direct core bypass');
create temporary table future_result as select public.fcf_future_historical_six_apply(main,hashes,proof->>'beforeSha256',proof->>'beforeImageText')result from future_proof;
select pg_temp.six_assert(result->>'schemaVersion'='3' and result->>'removedAppearances'='157' and result->>'removedGoals'='18' and result->>'unavailableMatches'='6','future applied receipt')from future_result;
select pg_temp.six_assert(not exists(select 1 from competitions where id in(783,790,797)and(active or prvi_fantasy_krog<>1)),'cleanup keeps inactive seed1');
select pg_temp.six_assert((select count(*)from private_historical_statistics.installed_policies where competition_id in(783,790,797) and first_fantasy_played_on='2026-10-24')=3,'historical cutline retained independently');

select pg_temp.six_assert(public.fcf_future_historical_six_apply(main,hashes,proof->>'beforeSha256',proof->>'beforeImageText')=(select result from future_result),'idempotent saved schema3 receipt')from future_proof;
select pg_temp.six_assert((select count(*)from private_fcf_future_history.cleanup_receipt)=1 and not exists(select 1 from private_fcf_six_target_release.cleanup_receipt),'versioned receipt isolation');
select pg_temp.six_assert((select count(*)from matches where statistics_status='unavailable_historical')=6 and not exists(select 1 from appearances)and not exists(select 1 from goals),'exact six and157/18 removed');
select pg_temp.six_assert((select home_goals is null and away_goals is null and not vir_brez_izida from matches where id=321663)and(select home_goals=3 and away_goals=1 from matches where id=306166),'unknown result honest; known result retained');
select pg_temp.six_assert(not exists(select 1 from private_historical_statistics.release_authorizations),'cleanup grants no activation authority');
select pg_temp.six_assert((select count(*)from rounds where competition_id in(783,790,797)and number=6 and deadline_at='2026-10-23T12:00:00Z')=3,'expired R6 untouched');
select pg_temp.future_reject('select public.fcf_historical_six_apply(main,hashes,proof->>''beforeSha256'',proof->>''beforeImageText'')from future_proof','legacy apply cannot adopt schema3');
select pg_temp.future_reject('select public.fcf_historical_six_restore(proof->>''beforeSha256'')from future_proof','legacy restore cannot adopt future receipt');
select public.fcf_future_historical_six_restore(proof->>'beforeSha256')from future_proof;
select pg_temp.six_assert(private_fcf_six_history.capture()=(proof->'beforeImage')-array['schemaVersion','mainCommit','policyHashes'],'restore exact complete seed1 before-image')from future_proof;
select pg_temp.six_assert(public.fcf_future_historical_six_restore(proof->>'beforeSha256')->>'noOp'='true','restore replay no-op')from future_proof;
select pg_temp.future_reject('select public.fcf_future_historical_six_apply(main,hashes,proof->>''beforeSha256'',proof->>''beforeImageText'')from future_proof','restored receipt cannot replay cleanup');
