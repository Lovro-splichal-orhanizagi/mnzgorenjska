-- Synthetic CI only. Parent transaction rolls back every row, DDL and marker.
-- Setup comes from the existing full240 G1 observer fixture in the test runner.
insert into players(id,competition_id,team_id,first_name,last_name,position)overriding system value
select -935000-i,783,-931000,'TEST ONLY','SCORE '||i,'MID'from generate_series(1,924)i;
insert into appearances(match_id,player_id,team_id,minutes_played,minute_off)
select -933001,-935000-i,-931000,90,90 from generate_series(1,924)i;
select recompute_round_scores(-932001);
create temporary table score_data as select private_fcf_g1_scores.score_before()b;
create temporary table score_envelope as select jsonb_build_object('kind','fcf-g1-derived-score-before','count',924,'strictZeroAffectedUsersObserved',false,'roundCounts',(select jsonb_agg(jsonb_build_object('roundId',r.id,'userRows',(select count(*)from player_scores s where s.round_id=r.id))order by r.id)from rounds r where r.competition_id=783))||b b from score_data;
select private_fcf_g1_scores.assert_scores(b,false)from score_envelope;
select pg_temp.observer_assert(jsonb_array_length((b->>'beforeImageText')::jsonb)=924 and jsonb_array_length((b->>'expectedBeforeText')::jsonb)=924,'actual924 independently rederived synthetic score rows')from score_data;
select pg_temp.observer_assert(pg_temp.capture()#>>'{native,dependencies,competitionUserRows}'='0'and exists(select 1 from jsonb_array_elements(pg_temp.capture()#>'{native,dependencies,rounds}')r where r->>'userRows'='924'),'924 remains strict round userRows and is never zeroed');
select pg_temp.reject('select private_fcf_g1_scores.assert_scores(b,true)from score_envelope','exact original924');
select pg_temp.reject('select private_fcf_g1_scores.assert_scores(jsonb_set(b,''{count}'',''0''),false)from score_envelope','beforeimage hashes/count');
select pg_temp.reject('select private_fcf_g1_scores.assert_scores(jsonb_set(b,''{strictZeroAffectedUsersObserved}'',''true''),false)from score_envelope','unchanged SQL scoring rules');
select pg_temp.reject('select private_fcf_g1_scores.assert_scores(jsonb_set(b,''{roundCounts}'',''[]''),false)from score_envelope','round counters');
-- Wrong points and an orphan score row are refused, each in a rolled-back subtransaction.
do $$begin begin update player_scores set points=points+1 where player_id=-935001;perform pg_temp.reject('select private_fcf_g1_scores.assert_scores(b,false)from score_envelope','every actual score');raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;
do $$begin begin delete from appearances where player_id=-935001;perform pg_temp.reject('select private_fcf_g1_scores.assert_scores(b,false)from score_envelope','canonical semantic beforeimage|every actual score');raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;
select pg_temp.reject('select public.fcf_g1_derived_scores_prepare(array[]::text[])','explicit readonly transaction required');
select pg_temp.observer_assert(not has_schema_privilege('service_role','private_fcf_g1_scores','usage')and not has_function_privilege('service_role','private_fcf_g1_scores.assert_scores(jsonb,boolean)','execute')and has_function_privilege('service_role','public.fcf_g1_derived_scores_prepare(text[])','execute')and not has_function_privilege('anon','public.fcf_g1_derived_scores_prepare(text[])','execute')and not has_function_privilege('authenticated','public.fcf_g1_derived_scores_prepare(text[])','execute'),'service-only readonly preparation and closed private helpers');
-- Synthetic marker writes exercise durable guards only; they grant no source admission.
update matches set played_on='2026-10-04'where id=-933022;
create temporary table supplement_fixture as select m.id,jsonb_build_object('policySha256','7e72c15684c02ce7556921224971bc0f302acc19c786852f92920832f318eaac','fixture',private_fcf_g1_9410.policy()->'fixture','sourceCommit',repeat('b',40),'sourceFingerprintSha256',repeat('c',64))binding,jsonb_build_object('match',to_jsonb(m))::text before_text from matches m where id=-933022;
insert into private_fcf_g1_9410.markers(match_id,round_id,home_team_id,away_team_id,binding,before_image_text,before_sha256,authorized_xid)
select m.id,m.round_id,m.home_team_id,m.away_team_id,f.binding,f.before_text,encode(sha256(convert_to(f.before_text,'UTF8')),'hex'),txid_current()from matches m join supplement_fixture f on f.id=m.id;
update matches set home_goals=null,away_goals=null,statistics_status='unavailable_historical',statistics_reason='closed_official_result_and_individual_statistics_unavailable',vir_brez_izida=false where id=-933022;
insert into private_fcf_g1_9410.receipts
select m.id,to_jsonb(m),jsonb_build_object('schemaVersion',1,'kind','fcf-g1-supplement-4109410-installed','sourceCommit',f.binding->>'sourceCommit','sourceFingerprintSha256',f.binding->>'sourceFingerprintSha256','policySha256',f.binding->>'policySha256','beforeSha256',s.before_sha256,'afterSha256',encode(sha256(convert_to(to_jsonb(m)::text,'UTF8')),'hex'))from matches m join supplement_fixture f on f.id=m.id join private_fcf_g1_9410.markers s on s.match_id=m.id;
select pg_temp.observer_assert(public.get_installed_fcf_g1_4109410_supplement()#>'{afterImage,home_goals}'='null'::jsonb and public.get_installed_fcf_g1_4109410_supplement()#>'{afterImage,away_goals}'='null'::jsonb,'durable getter preserves literal NULL');
select pg_temp.reject('update matches set home_goals=0,away_goals=0 where id=-933022','installed match immutable');
select pg_temp.reject('delete from matches where id=-933022','installed match immutable');
select pg_temp.reject('update private_fcf_g1_9410.markers set authorized_xid=0','immutable marker/receipt');
select pg_temp.reject('delete from private_fcf_g1_9410.receipts','immutable marker/receipt');
select pg_temp.reject('insert into appearances(match_id,player_id,team_id)values(-933022,-935001,-931000)','individual statistics unavailable');
select pg_temp.reject('insert into goals(match_id,team_id)values(-933022,-931000)','individual statistics unavailable');
select pg_temp.observer_assert((select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=783)=240 and(select count(*)from player_scores s join rounds r on r.id=s.round_id where r.competition_id=783)=924,'all240 calendar and924 scores remain');
set local transaction_read_only=on;
set local role service_role;
with observed as materialized(select public.fcf_g1_derived_scores_prepare(array[]::text[])p)
select current_user='service_role'and current_setting('transaction_read_only')='on'and jsonb_array_length((p#>>'{derivedScoresBefore,beforeImageText}')::jsonb)=924 and exists(select 1 from jsonb_array_elements(p#>'{projection,native,dependencies,rounds}')r where r->>'userRows'='924') as scores_service_pass from observed \gset
\if :scores_service_pass
\echo FCF_G1_SCORES_9410_SERVICE_PASS
\else
\quit 1
\endif
reset role;
