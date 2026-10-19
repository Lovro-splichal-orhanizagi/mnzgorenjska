-- Exact production fixture identities, with synthetic public football rows only.
delete from competitions where id in(783,790,797) or slug in('es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9');
insert into competitions(id,slug,name,short_name,source,source_league_code,sezona_koledarska,country_id,active,prvi_fantasy_krog)
overriding system value values
(783,'es-ct-segona-g1','FCF test G1','G1','fcf','4109388-4109627',false,(select id from countries where code='ES'),false,6),
(790,'es-ct-tercera-g2','FCF test G2','G2','fcf','4116188-4116427',false,(select id from countries where code='ES'),false,6),
(797,'es-ct-tercera-g9','FCF test G9','G9','fcf','4118349-4118588',false,(select id from countries where code='ES'),false,6);
create temporary table fcf_fixture(mid bigint,cid bigint,rid bigint,rn int,home bigint,away bigint,played date,hg int,ag int,source text,apps int,goals int);
insert into fcf_fixture values
(321646,783,28706,1,8574,8575,'2026-09-20',0,3,'4109388',31,4),
(297199,790,27227,4,8195,8188,'2026-10-10',5,0,'4116215',33,4),
(306164,797,27616,1,8304,8305,'2026-09-19',3,0,'4118352',32,5),
(306166,797,27616,1,7566,8308,'2026-09-19',3,1,'4118354',31,4),
(306171,797,27617,2,8301,8298,'2026-09-26',0,3,'4118358',30,1);
insert into teams(id,name,short_name,country_id)overriding system value values
(7566,'CAN VIDALET, C.F.','CA',(select id from countries where code='ES')),
(8308,'ONA SANT ADRIA, F.C.','ON',(select id from countries where code='ES')),
(8576,'BESCANO, C.D.','BS',(select id from countries where code='ES')),
(8574,'SANT JAUME OLOT B, C.F','SJ',(select id from countries where code='ES')),
(8575,'BEGUR, C.F.','BE',(select id from countries where code='ES')),
(8195,'PALAFOLLS, C.D.','PA',(select id from countries where code='ES')),
(8188,'MONTESSORI-PALAU, C.C.E.','MP',(select id from countries where code='ES')),
(8304,'Pª BARC. ANGUERA','BA',(select id from countries where code='ES')),
(8305,'LA SALUT PERE GOL AE.','SP',(select id from countries where code='ES')),
(8301,'DEPORTIVO PARAGUAY, F.C.','DP',(select id from countries where code='ES')),
(8298,'TRINIDAD, C.D.','TR',(select id from countries where code='ES'));
insert into rounds(id,competition_id,season,number,played_on)overriding system value select distinct rid,cid,'2026/27',rn,played from fcf_fixture;
insert into rounds(competition_id,season,number,played_on,deadline_at)select id,'2026/27',6,'2026-10-24',now()+interval '7 days' from competitions where id in(783,790,797);
insert into matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at,source_round)
overriding system value select mid,rid,home,away,played,hg,ag,'es'||source,'https://www.fcf.cat/ca/competicio/acta/'||source,now(),rn from fcf_fixture;
do $$declare f record;pid bigint;i int;begin
 for f in select * from fcf_fixture loop
  for i in 1..f.apps loop
   insert into players(competition_id,team_id,first_name,last_name,position)values(f.cid,case when i%2=0 then f.home else f.away end,'Fixture',f.mid||'-'||i,'MID')returning id into pid;
   insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_off)values(f.mid,pid,case when i%2=0 then f.home else f.away end,true,90,90);
   if i<=f.goals then insert into goals(match_id,scorer_id,team_id,minute)values(f.mid,pid,case when i%2=0 then f.home else f.away end,i);end if;
  end loop;
  perform recompute_round_scores(f.rid);
 end loop;
end$$;

insert into rounds(id,competition_id,season,number,played_on)overriding system value values(28707,783,'2026/27',2,'2026-09-27'),(28708,783,'2026/27',3,'2026-10-04');
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url)overriding system value values
(321655,28707,8575,8574,'2026-09-27','es4109396','https://www.fcf.cat/ca/competicio/acta/4109396'),
(321647,28706,8574,8576,'2026-09-19','es4109389','https://www.fcf.cat/ca/competicio/acta/4109389');
insert into matches(id,round_id,home_team_id,away_team_id,played_on,source_url,vir_brez_izida)overriding system value values(321663,28708,8575,8576,'2026-10-04','https://www.fcf.cat/ca/competicio/acta/4109388',true);
create function pg_temp.six_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'SIX TEST: %',message;end if;end$$;
create temporary table six_proof as select repeat('a',40)main,(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1')hashes,null::jsonb proof;
update six_proof set proof=public.fcf_historical_six_prepare(main,hashes);
select pg_temp.six_assert(jsonb_array_length(proof#>'{beforeImage,appearances}')=157 and jsonb_array_length(proof#>'{beforeImage,goals}')=18 and proof#>>'{beforeImage,missing4109404}'='true'and proof#>>'{beforeImage,empty4109404Placeholder}'='true','exact six native image157/18 and empty placeholder')from six_proof;
create function pg_temp.six_reject(command text,label text)returns void language plpgsql as $$begin
 begin execute command;raise exception 'SIX TEST: accepted %',label;exception when others then if sqlerrm like 'SIX TEST:%'then raise;end if;end;
end$$;
select pg_temp.six_reject('select public.prepare_fcf_historical_cleanup(main,hashes)from six_proof','old4 rejects six hashes');
select pg_temp.six_reject('update matches set home_goals=null where id=321646','partial NULL');
select pg_temp.six_reject('update matches set home_goals=null,away_goals=null where id=321646','normal paired NULL');
select pg_temp.six_assert((select provolatile='i'from pg_proc where oid='private_fcf_six_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)'::regprocedure),'pure immutable restore-safe row constraint');
select pg_temp.six_assert(private_fcf_six_history.unknown_result_allowed(28708,8575,8576,'es4109404','https://www.fcf.cat/ca/competicio/acta/4109404','2026-10-04','unavailable_historical','closed_official_result_and_individual_statistics_unavailable',null,3)and not private_fcf_six_history.unknown_result_allowed(28707,8575,8576,'es4109404','https://www.fcf.cat/ca/competicio/acta/4109404','2026-10-04','unavailable_historical','closed_official_result_and_individual_statistics_unavailable',null,3)and not private_fcf_six_history.unknown_result_allowed(28708,8576,8575,'es4109404','https://www.fcf.cat/ca/competicio/acta/4109404','2026-10-04','unavailable_historical','closed_official_result_and_individual_statistics_unavailable',null,3),'only exact unknown row tuple independent of marker restore order');
select pg_temp.six_reject('update matches set home_goals=null,away_goals=null,statistics_status=''unavailable_historical'',statistics_reason=''closed_official_result_and_individual_statistics_unavailable'',vir_brez_izida=false,source_url=''https://www.fcf.cat/ca/competicio/acta/4109404'',zapisnik_id=''es4109404'',source_round=3 where id=321663','exact tuple still needs installed marker trigger');
select pg_temp.six_reject('select public.fcf_six_current_target_check(''{"schemaVersion":1,"targetSlug":"es-ct-tercera-g9"}'',repeat(''a'',64),false)','old rollout rejected by6');
create function pg_temp.six_mutant(command text,label text)returns void language plpgsql as $$begin
 begin execute command;perform public.fcf_historical_six_apply(main,hashes,proof->>'beforeSha256',proof->>'beforeImageText')from six_proof;raise exception 'SIX TEST: accepted mutant %',label;
 exception when others then if sqlerrm like 'SIX TEST:%'then raise;end if;end;
end$$;
select pg_temp.six_mutant('update appearances set minutes_played=89,minute_off=89 where id=(select min(id)from appearances)','same-count row drift');
select pg_temp.six_mutant('update competitions set active=true where id=797','active target');
select pg_temp.six_mutant('update players set anonimiziran_at=clock_timestamp()where id=(select min(id)from players where competition_id=783)','privacy suppression beforecleanup');
select pg_temp.six_mutant('insert into auth.users(id,email)values(''11111111-1111-4111-8111-111111111111'',''six-native@example.invalid'');insert into fantasy_teams(owner_id,name,competition_id)values(''11111111-1111-4111-8111-111111111111'',''Synthetic six user'',797)','new fantasy user');
select pg_temp.six_mutant('update matches set source_url=''wrong''where zapisnik_id=''es4109389''','missing fixture binding anchor drift');
select pg_temp.six_mutant('delete from matches where id=321663','missing native placeholder');
select pg_temp.six_mutant('update matches set vir_brez_izida=false where id=321663','placeholder flag drift');
select pg_temp.six_mutant('update matches set source_url=null where id=321663','placeholder URL drift');
select pg_temp.six_mutant('create table public.six_unexpected_dependency(appearance_id bigint)','unknown dependency');
select pg_temp.six_mutant('update rounds set deadline_at=now()-interval''1 hour''where competition_id=797 and number=6','expired first fantasy deadline');
create temporary table six_result as select public.fcf_historical_six_apply(main,hashes,proof->>'beforeSha256',proof->>'beforeImageText')result from six_proof;
select pg_temp.six_assert(result->>'removedAppearances'='157'and result->>'removedGoals'='18'and result->>'unavailableMatches'='6','six atomic applied receipt')from six_result;
select pg_temp.six_assert(public.fcf_historical_six_apply(main,hashes,proof->>'beforeSha256',proof->>'beforeImageText')=(select result from six_result),'idempotent saved receipt')from six_proof;
select pg_temp.six_assert((select count(*)from matches where statistics_status='unavailable_historical')=6,'six installed');
select pg_temp.six_assert((select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id in(783,790,797))=jsonb_array_length(proof#>'{beforeImage,matches}'),'no added native fixture')from six_proof;
select pg_temp.six_assert((select id=321663 and home_goals is null and away_goals is null and not vir_brez_izida from matches where zapisnik_id='es4109404'),'unknown retains honest NULL pair');
select pg_temp.six_assert((select home_goals=3 and away_goals=1 from matches where id=306166),'known4118354 keeps3:1');
select pg_temp.six_assert(jsonb_array_length(public.get_installed_fcf_six_statistics_markers(783)->'markers')=2,'null-aware installed getter retains unknown');
select pg_temp.six_assert(exists(select 1 from match_assist_status where match_id=(select id from matches where zapisnik_id='es4109404')and home_goals is null and golov is null),'unknown result visible in assist view');
select pg_temp.six_assert((select odigranih=1 and statistics_unavailable_matches=2 from sezone where competition_id=783 and season='2026/27'),'unknown excluded from known played season count');
select pg_temp.six_assert((select tekme=1 and zmage=1 and remiji=0 and dani=3 and prejeti=0 from lestvica_lige(783,'2026/27')where team_id=8575),'unknown absent from numeric standings games/draws/goals');
select pg_temp.six_reject('update matches set home_goals=0,away_goals=0 where zapisnik_id=''es4109404''','unknown immutable');
select pg_temp.six_reject('select public.upsert_unavailable_historical_match(783,''4109404'',''es-ct-segona-g1-six-reviewed-2026-10-19-v1'',repeat(''a'',64),repeat(''b'',64),''{}'')','legacy upsert rejects six');
select pg_temp.six_assert(not has_function_privilege('anon','public.fcf_historical_six_apply(text,jsonb,text,text)','execute')and not has_function_privilege('authenticated','public.fcf_historical_six_restore(text)','execute'),'private maintenance ACL');
select pg_temp.six_assert(not has_schema_privilege('service_role','private_fcf_six_history','usage')and not has_function_privilege('service_role','private_fcf_six_history.apply_core(text,jsonb,text,text)','execute'),'no direct core bypass');
select public.fcf_historical_six_restore(proof->>'beforeSha256')from six_proof;
select pg_temp.six_assert(not exists(select 1 from matches where zapisnik_id='es4109404')and(select count(*)from appearances)=157 and(select count(*)from goals)=18,'rollback restores report absence and original placeholder/statistics');
select pg_temp.six_assert((select home_goals=0 and away_goals=0 and vir_brez_izida and source_url='https://www.fcf.cat/ca/competicio/acta/4109388'and zapisnik_id is null from matches where id=321663),'rollback restores exact original placeholder');
select pg_temp.six_assert(public.fcf_historical_six_restore(proof->>'beforeSha256')->>'noOp'='true','rollback replay receipt')from six_proof;
