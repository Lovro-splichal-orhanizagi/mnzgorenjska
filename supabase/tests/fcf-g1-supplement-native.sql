-- All IDs below are explicitly synthetic TEST ONLY, not native fixture guesses.
create function pg_temp.reject(q text,pattern text default '(FCF_G1_SUPPLEMENT|HISTORICAL_POLICY|paired_result_availability)')returns void language plpgsql as $$begin
 begin execute q;exception when others then if SQLERRM!~pattern then raise exception 'TEST: unexpected rejection: %',SQLERRM;end if;return;end;raise exception 'TEST: expected rejection: %',q;
end$$;
create temporary table baseline as select (select jsonb_agg(to_jsonb(p))from private_historical_statistics.installed_policies p)policies,(select jsonb_agg(to_jsonb(m))from private_historical_statistics.markers m)markers,(select to_jsonb(c)from private_fcf_future_history.cleanup_receipt c where singleton)cleanup;
insert into countries(id,name,code)overriding system value values(970000001,'TEST supplement','ZT');
insert into teams(id,name,short_name,country_id)overriding system value values(970000001,'TEST home','HOME',970000001),(970000002,'TEST away','AWAY',970000001);
-- Target competition remains the genuine schema target tuple; the fixture is synthetic.
insert into competitions(id,name,short_name,slug,country_id,source,source_league_code,sezona_koledarska,active)overriding system value values(783,'TEST G1','TEST','es-ct-segona-g1',970000001,'fcf','4109388-4109627',false,false)on conflict(id)do nothing;
insert into rounds(id,competition_id,season,number,played_on)overriding system value values(970000001,783,'2026/27',3,'2026-10-04');
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url)overriding system value values(970000001,970000001,970000001,970000002,'2026-10-04','es4109409','https://www.fcf.cat/ca/competicio/acta/4109409');
-- Restore-shaped CHECK probe: LIKE copies the real CHECK/NOT NULL constraints,
-- without operational triggers. Load the exact row before any private marker;
-- no production trigger, privilege or constraint is disabled or bypassed.
create temporary table restore_shape(like public.matches including constraints);
select private_fcf_six_target_release.require(not exists(select 1 from private_fcf_g1_supplement.markers),'restore probe starts before marker insertion');
insert into restore_shape(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,home_goals,away_goals,imported_at,kontumacija,vir_brez_izida,import_warnings,statistics_status,statistics_reason,source_phase,source_round)
values(970000001,970000001,970000001,970000002,'2026-10-04','es4109409','https://www.fcf.cat/ca/competicio/acta/4109409',null,null,null,false,false,array[]::text[],'unavailable_historical','closed_official_result_and_individual_statistics_unavailable',null,3);
select private_fcf_six_target_release.require((select provolatile='i'from pg_proc where oid='private_fcf_g1_supplement.unknown_result_allowed(text,text,date,text,text,text,integer,integer,integer,timestamp with time zone,boolean,boolean,text[])'::regprocedure),'supplement CHECK predicate is IMMUTABLE');
select pg_temp.reject($q$update restore_shape set zapisnik_id='es4109410'$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set home_goals=0$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set away_goals=0$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set source_url='https://www.fcf.cat/ca/competicio/acta/4109410'$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set played_on='2026-10-05'$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set source_round=4$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set source_phase='foreign'$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set statistics_status='available'$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set statistics_reason=null$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set imported_at=clock_timestamp()$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set kontumacija=true$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set vir_brez_izida=true$q$,'(paired_result_availability|historical_statistics_missingness)');
select pg_temp.reject($q$update restore_shape set import_warnings=array['guessed']$q$,'(paired_result_availability|historical_statistics_missingness)');
-- Independently assert every mutated tuple fails the pure predicate, even if
-- another copied CHECK happens to reject that malformed tuple first.
select private_fcf_six_target_release.require(not exists(
 select 1 from restore_shape base cross join lateral jsonb_array_elements('[{"zapisnik_id":"es4109410"},{"home_goals":0},{"away_goals":0},{"source_url":"https://www.fcf.cat/ca/competicio/acta/4109410"},{"played_on":"2026-10-05"},{"source_round":4},{"source_phase":"foreign"},{"statistics_status":"available"},{"statistics_reason":null},{"imported_at":"2026-10-28T00:00:00Z"},{"kontumacija":true},{"vir_brez_izida":true},{"import_warnings":["guessed"]}]'::jsonb)delta
 cross join lateral jsonb_populate_record(null::public.matches,to_jsonb(base)||delta)m
 where private_fcf_g1_supplement.unknown_result_allowed(m.zapisnik_id,m.source_url,m.played_on,m.statistics_status,m.statistics_reason,m.source_phase,m.source_round,m.home_goals,m.away_goals,m.imported_at,m.kontumacija,m.vir_brez_izida,m.import_warnings)is distinct from false),'pure predicate rejects every malformed source/score/flag tuple without marker lookup');
-- The same exact tuple remains forbidden by the actual normal-write marker guard.
select pg_temp.reject($q$update matches set home_goals=null,away_goals=null where id=970000001$q$);
select pg_temp.reject($q$update matches set home_goals=null where id=970000001$q$);
select pg_temp.reject($q$update matches set statistics_status='unavailable_historical',statistics_reason='closed_official_result_and_individual_statistics_unavailable',source_round=3,home_goals=null,away_goals=null where id=970000001$q$,'FCF_G1_SUPPLEMENT: exact empty installed native marker required');
insert into private_fcf_g1_supplement.markers(match_id,round_id,home_team_id,away_team_id,binding,before_image_text,before_sha256,authorized_xid)
select 970000001,970000001,970000001,970000002,jsonb_build_object('policySha256','a9141400858c80322b6cb12b13c54a5dde45e93f080b4fe0b644dce513657ee7','fixture',private_fcf_g1_supplement.policy()->'fixture'),'TEST ONLY beforeimage',encode(sha256(convert_to('TEST ONLY beforeimage','UTF8')),'hex'),txid_current();
select private_fcf_six_target_release.require((select count(*)=1 from restore_shape),'pure CHECK accepted row before marker insertion');
update matches set home_goals=null,away_goals=null,statistics_status='unavailable_historical',statistics_reason='closed_official_result_and_individual_statistics_unavailable',source_round=3 where id=970000001;
select pg_temp.reject($q$update matches set home_goals=0,away_goals=0 where id=970000001$q$);
select pg_temp.reject($q$update matches set source_url='https://example.test/foreign'where id=970000001$q$);
select pg_temp.reject($q$delete from matches where id=970000001$q$);
select pg_temp.reject($q$update private_fcf_g1_supplement.markers set home_team_id=970000002$q$);
select pg_temp.reject($q$delete from private_fcf_g1_supplement.markers$q$);
select pg_temp.reject($q$insert into appearances(match_id,player_id,team_id)values(970000001,1,970000001)$q$);
select pg_temp.reject($q$insert into goals(match_id,team_id)values(970000001,970000001)$q$);
-- Original immutable score exception remains a separate exact predicate.
select private_fcf_six_target_release.require(private_fcf_six_history.unknown_result_allowed(28708,8575,8576,'es4109404','https://www.fcf.cat/ca/competicio/acta/4109404','2026-10-04','unavailable_historical','closed_official_result_and_individual_statistics_unavailable',null,3)is true,'original4109404 exact predicate unchanged');
select private_fcf_six_target_release.require(private_fcf_six_history.unknown_result_allowed(28708,8575,8576,'es4109409','https://www.fcf.cat/ca/competicio/acta/4109409','2026-10-04','unavailable_historical','closed_official_result_and_individual_statistics_unavailable',null,3)is false,'supplement never enters original six predicate');
select private_fcf_six_target_release.require((select policies is not distinct from(select jsonb_agg(to_jsonb(p))from private_historical_statistics.installed_policies p)and markers is not distinct from(select jsonb_agg(to_jsonb(m))from private_historical_statistics.markers m)and cleanup is not distinct from(select to_jsonb(c)from private_fcf_future_history.cleanup_receipt c where singleton)from baseline),'all original policies/markers/cleanup bytes unchanged');
select 'SUPPLEMENT_FOCUSED_SQL_PASS';
