-- Owned disposable database only. Every fixture and mutation is rolled back.
begin;
create function pg_temp.fcf_assert(ok boolean, message text) returns void language plpgsql as $$begin
 if ok is distinct from true then raise exception 'FCF TEST: %',message;end if;
end$$;
create function pg_temp.fcf_refuses(command text, message text) returns void language plpgsql as $$begin
 begin execute command;
 exception when others then
  if sqlerrm not like 'FCF_HISTORY:%' then raise exception 'FCF TEST: wrong refusal for %: %',message,sqlerrm;end if;
  return;
 end;
 raise exception 'FCF TEST: expected refusal: %',message;
end$$;
select pg_temp.fcf_assert(to_regprocedure('public.prepare_fcf_historical_cleanup(text,jsonb)') is not null,'bounded prepare primitive exists');
select pg_temp.fcf_assert(to_regprocedure('public.apply_fcf_historical_cleanup(text,jsonb,text,jsonb)') is not null,'bounded apply primitive exists');
select pg_temp.fcf_assert(not has_function_privilege('authenticated','public.prepare_fcf_historical_cleanup(text,jsonb)','EXECUTE'),'user cannot read restricted beforeimage');
select pg_temp.fcf_assert(not has_function_privilege('service_role','private_fcf_history.cleanup_targets()','EXECUTE'),'service cannot access private cleanup internals');

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
(306171,797,27617,2,8301,8298,'2026-09-26',0,3,'4118358',30,1);
insert into teams(id,name,short_name,country_id)overriding system value values
(8574,'SANT JAUME OLOT B, C.F','SJ',(select id from countries where code='ES')),
(8575,'BEGUR, C.F.','BE',(select id from countries where code='ES')),
(8195,'PALAFOLLS, C.D.','PA',(select id from countries where code='ES')),
(8188,'MONTESSORI-PALAU, C.C.E.','MP',(select id from countries where code='ES')),
(8304,'Pª BARC. ANGUERA','BA',(select id from countries where code='ES')),
(8305,'LA SALUT PERE GOL AE.','SP',(select id from countries where code='ES')),
(8301,'DEPORTIVO PARAGUAY, F.C.','DP',(select id from countries where code='ES')),
(8298,'TRINIDAD, C.D.','TR',(select id from countries where code='ES'));
insert into rounds(id,competition_id,season,number,played_on)overriding system value select rid,cid,'2026/27',rn,played from fcf_fixture;
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
-- Independent ordinary report in the same target round: retain its complete
-- performances and goals, and recompute its points without changing their value.
insert into teams(id,name,short_name,country_id)overriding system value values
(999001,'FCF normal home','NH',(select id from countries where code='ES')),
(999002,'FCF normal away','NA',(select id from countries where code='ES'));
insert into matches(round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at)
values(28706,999001,999002,'2026-09-20',1,0,'es4109389','https://www.fcf.cat/ca/competicio/acta/4109389',now());
do $$declare mid bigint;pid bigint;i int;begin
 select id into mid from matches where zapisnik_id='es4109389';
 for i in 1..22 loop
  insert into players(competition_id,team_id,first_name,last_name,position)values(783,case when i<=11 then 999001 else 999002 end,'Normal',i::text,case when i in(1,12)then 'GK'else 'MID'end)returning id into pid;
  insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_off,goals,is_goalkeeper)values(mid,pid,case when i<=11 then 999001 else 999002 end,true,90,90,case when i=2 then 1 else 0 end,i in(1,12));
  if i=2 then insert into goals(match_id,scorer_id,team_id,minute,score_home,score_away)values(mid,pid,999001,10,1,0);end if;
 end loop;
 perform recompute_round_scores(28706);
end$$;
-- Calonge remains outside deletion authority: authentic report identity and
-- correction clocks, with explicitly synthetic player rows and unchanged prices.
insert into teams(id,name,short_name,country_id)overriding system value values
(8199,'Calonge preservation fixture','CA',(select id from countries where code='ES')),
(8196,'Vilablareix preservation fixture','VI',(select id from countries where code='ES'));
insert into rounds(id,competition_id,season,number,played_on)overriding system value values(27225,790,'2026/27',2,'2026-09-26');
insert into matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,source_url,imported_at)
overriding system value values(297185,27225,8199,8196,'2026-09-26',2,2,'es4116202','https://www.fcf.cat/ca/competicio/acta/4116202',now());
do $$declare pid bigint;i int;team bigint;begin
 for i in 1..5 loop
  team:=case when i in(1,2,3)then 8199 else 8196 end;
  insert into players(competition_id,team_id,first_name,last_name,position,value,reg_st)values(790,team,'Calonge fixture',i::text,'MID',8+i*0.1,case i when 1 then 48680949::bigint when 2 then 31287135::bigint else 90000000+i end)returning id into pid;
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,goals)values(297185,pid,team,i<>2,case when i=2 then 75 else 0 end,case when i=1 then 75 else 90 end,case when i=1 then 75 when i=2 then 15 else 90 end,case when i=1 then 0 else 1 end);
  if i>1 then insert into goals(match_id,scorer_id,team_id,minute)values(297185,pid,team,case i when 2 then 87 when 3 then 13 when 4 then 38 else 79 end);end if;
 end loop;
 perform recompute_round_scores(27225);
end$$;
create temporary table fcf_private_before as select jsonb_agg(to_jsonb(b)order by provider,source_club_id,source_category_id)bindings from private_historical_statistics.source_club_bindings b;
create temporary table fcf_proof as select repeat('a',40) as main_sha,
 (select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'provider'='fcf')hashes,
 null::jsonb prepared;
update fcf_proof set prepared=public.prepare_fcf_historical_cleanup(main_sha,hashes);
select pg_temp.fcf_assert((select jsonb_agg(to_jsonb(b)order by provider,source_club_id,source_category_id)from private_historical_statistics.source_club_bindings b)=(select bindings from fcf_private_before),'prepare does not bind or mutate private source identities');
select pg_temp.fcf_assert((select jsonb_array_length(prepared->'beforeImage'->'appearances')=126 and jsonb_array_length(prepared->'beforeImage'->'goals')=14 from fcf_proof),'full 126/14 beforeimage retained');

-- Mutations run in subtransactions: each refusal must preserve all then-visible
-- football rows, then the mutation itself is rolled back for the next case.
create function pg_temp.fcf_mutant(command text,message text)returns void language plpgsql as $$
declare p fcf_proof%rowtype;mutated jsonb;
begin
 select *into p from fcf_proof;
 begin
  execute command;
  mutated:=private_fcf_history.capture();
  perform pg_temp.fcf_refuses(format('select public.apply_fcf_historical_cleanup(%L,%L::jsonb,%L,%L::jsonb)',p.main_sha,p.hashes::text,p.prepared->>'beforeSha256',(p.prepared->'beforeImage')::text),message);
  perform pg_temp.fcf_assert(private_fcf_history.capture()=mutated,'failed cleanup preserves every current football row: '||message);
  perform pg_temp.fcf_assert(not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(783,790,797)),'no partial policy install: '||message);
  raise exception using errcode='ZX001',message='roll back only this mutation';
 exception when sqlstate 'ZX001'then null;
 end;
 perform pg_temp.fcf_assert(private_fcf_history.capture()=(p.prepared->'beforeImage')-array['schemaVersion','mainCommit','policyHashes'],'mutation rolled back: '||message);
 raise notice 'FCF TEST: refusal passed: %',message;
end$$;
-- Independent synthetic profile/foreign team only; no target fantasy activity.
insert into auth.users(id,email)values('fa000000-0000-4000-8000-000000000001','fcf-test@example.invalid');
insert into profiles(id,display_name)values('fa000000-0000-4000-8000-000000000001','FCF fixture')on conflict(id)do nothing;
insert into auth.users(id,email)values('fa000000-0000-4000-8000-000000000002','fcf-house-test@example.invalid');
insert into profiles(id,display_name)values('fa000000-0000-4000-8000-000000000002','FCF house fixture')on conflict(id)do nothing;
insert into fantasy_teams(owner_id,name,competition_id)values('fa000000-0000-4000-8000-000000000001','FCF foreign fixture',1);

select pg_temp.fcf_mutant('update appearances set minutes_played=89 where id=(select min(id)from appearances where match_id=321646)','changed individual field');
select pg_temp.fcf_mutant('update appearances set shirt_number=88 where match_id=(select id from matches where zapisnik_id=''es4109389'')and is_goalkeeper','changed ordinary appearance in protected round');
select pg_temp.fcf_mutant('delete from appearances where id=(select min(id)from appearances where match_id=321646)','changed 126-row count');
select pg_temp.fcf_mutant('delete from goals where id=(select min(id)from goals where match_id=297199)','changed 14-row count');
-- Shared activation guard prevents this drift before cleanup can even see it.
do $$begin
 begin update competitions set active=true where id=783;
 exception when others then
  if sqlerrm not like 'HISTORICAL_POLICY:%'then raise;end if;
  return;
 end;
 raise exception 'FCF TEST: direct activation unexpectedly succeeded';
end$$;
select pg_temp.fcf_mutant('update competitions set source_policy=''unreviewed''where id=783','foreign source policy');
select pg_temp.fcf_mutant('update matches set home_goals=7 where id=321646','changed published result');
select pg_temp.fcf_mutant('update matches set played_on=played_on+1 where id=321646','changed fixture date');
select pg_temp.fcf_mutant('update matches set source_url=''https://example.invalid/foreign''where id=321646','foreign source URL');
select pg_temp.fcf_mutant('update matches set zapisnik_id=''es9999999''where id=321646','foreign native report');
select pg_temp.fcf_mutant('update rounds set number=3 where id=28706','changed native round');
select pg_temp.fcf_mutant('update player_scores set points=points+1 where round_id=28706','changed derived cache');
select pg_temp.fcf_mutant('update players set value=value+0.1 where id=(select min(id)from players where competition_id=783)','changed protected player');
select pg_temp.fcf_mutant('insert into fantasy_teams(owner_id,name,competition_id)values(''fa000000-0000-4000-8000-000000000001'',''new target human'',783)','new human fantasy team');
select pg_temp.fcf_mutant('insert into fantasy_teams(owner_id,name,competition_id,hisna)values(''fa000000-0000-4000-8000-000000000002'',''new target house'',783,true)','new house fantasy team');
select pg_temp.fcf_mutant('insert into fantasy_roster(fantasy_team_id,player_id,is_starter)select(select id from fantasy_teams where competition_id=1 and owner_id=''fa000000-0000-4000-8000-000000000001''),min(id),true from players where competition_id=783','new roster reference');
select pg_temp.fcf_mutant('insert into fantasy_lineups(round_id,fantasy_team_id,player_id,is_starter)select 28706,(select id from fantasy_teams where competition_id=1 and owner_id=''fa000000-0000-4000-8000-000000000001''),min(id),true from players where competition_id=783','new lineup snapshot');
select pg_temp.fcf_mutant('insert into position_votes(player_id,voter_id,position)select min(id),''fa000000-0000-4000-8000-000000000001'',''MID''from players where competition_id=783','new position vote');
select pg_temp.fcf_mutant('insert into position_votes_deleted(id,player_id)select 990001,min(id)from players where competition_id=783','new deleted position vote');
select pg_temp.fcf_mutant('insert into assist_votes(goal_id,voter_id)select min(id),''fa000000-0000-4000-8000-000000000001''from goals where match_id=321646','new assist vote');
select pg_temp.fcf_mutant('insert into assist_votes_deleted(id,goal_id)select 990001,min(id)from goals where match_id=321646','new deleted assist vote');
select pg_temp.fcf_mutant('update goals set assist_confirmed_at=now()where id=(select min(id)from goals where match_id=321646)','new confirmed assist');
select pg_temp.fcf_mutant('update goals set assist_none_confirmed_at=now()where id=(select min(id)from goals where match_id=321646)','new confirmed-none assist');
select pg_temp.fcf_mutant('create table public.fcf_unreviewed_dependency(id bigint primary key,goal_id bigint references public.goals(id)on delete cascade)','unexpected empty foreign key');
select pg_temp.fcf_mutant('create table scout.fcf_unreviewed_dependency(appearance_id bigint)','unexpected non-FK individual reference');

-- Wrong commit/hash/image cannot be promoted by the service-only writer.
do $$declare p fcf_proof%rowtype;begin
 select *into p from fcf_proof;
 perform pg_temp.fcf_refuses(format('select public.apply_fcf_historical_cleanup(%L,%L::jsonb,%L,%L::jsonb)',repeat('b',40),p.hashes::text,p.prepared->>'beforeSha256',(p.prepared->'beforeImage')::text),'different reviewed commit');
 perform pg_temp.fcf_refuses(format('select public.apply_fcf_historical_cleanup(%L,%L::jsonb,%L,%L::jsonb)',p.main_sha,(p.hashes||jsonb_build_object('foreign',repeat('0',64)))::text,p.prepared->>'beforeSha256',(p.prepared->'beforeImage')::text),'foreign policy hash');
 perform pg_temp.fcf_refuses(format('select public.apply_fcf_historical_cleanup(%L,%L::jsonb,%L,%L::jsonb)',p.main_sha,p.hashes::text,repeat('0',64),(p.prepared->'beforeImage')::text),'unapproved beforeimage hash');
 perform pg_temp.fcf_refuses(format('select public.apply_fcf_historical_cleanup(%L,%L::jsonb,%L,%L::jsonb)',p.main_sha,p.hashes::text,p.prepared->>'beforeSha256',jsonb_set(p.prepared->'beforeImage','{appearances}','[]')::text),'truncated backup');
end$$;

-- Reconstruct the deleted rows from the actual full beforeimage, preserving all
-- generated IDs/fields. This rehearsal is separate from transaction rollback.
savepoint fcf_restore_rehearsal;
delete from goals where match_id in(321646,297199,306164,306171);
delete from appearances where match_id in(321646,297199,306164,306171);
insert into appearances overriding system value select r.*from fcf_proof p cross join lateral jsonb_populate_recordset(null::public.appearances,p.prepared->'beforeImage'->'appearances')r;
insert into goals overriding system value select r.*from fcf_proof p cross join lateral jsonb_populate_recordset(null::public.goals,p.prepared->'beforeImage'->'goals')r;
do $$declare rid bigint;begin for rid in select distinct f.rid from fcf_fixture f loop perform recompute_round_scores(rid);end loop;end$$;
select pg_temp.fcf_assert((select private_fcf_history.capture()=(prepared->'beforeImage')-array['schemaVersion','mainCommit','policyHashes']from fcf_proof),'full beforeimage reconstruction restores exact canonical bytes');
rollback to fcf_restore_rehearsal;

-- Successful apply is then rolled back for restoration rehearsal.
savepoint fcf_before_apply;
select public.apply_fcf_historical_cleanup(main_sha,hashes,prepared->>'beforeSha256',prepared->'beforeImage')from fcf_proof;
select pg_temp.fcf_assert(not exists(select 1 from appearances where match_id in(select mid from fcf_fixture)),'exact target appearances removed');
select pg_temp.fcf_assert(not exists(select 1 from goals where match_id in(select mid from fcf_fixture)),'exact target goals removed');
select pg_temp.fcf_assert((select count(*)from matches m join fcf_fixture f on f.mid=m.id where m.statistics_status='unavailable_historical' and m.imported_at is null and m.home_goals=f.hg and m.away_goals=f.ag)=4,'exact IDs/results retained with unavailable markers');
select pg_temp.fcf_assert(not exists(select 1 from player_scores ps where ps.round_id in(select rid from fcf_fixture)and not exists(select 1 from appearance_points ap where ap.round_id=ps.round_id and ap.player_id=ps.player_id)),'no stale player scores');
select pg_temp.fcf_assert(exists(select 1 from matches where zapisnik_id='es4109389'and home_goals=1 and imported_at is not null),'unrelated match preserved');
select pg_temp.fcf_assert((select count(*)from appearances a join matches m on m.id=a.match_id where m.zapisnik_id='es4109389')=22 and(select count(*)from goals g join matches m on m.id=g.match_id where m.zapisnik_id='es4109389')=1,'all unrelated individuals preserved');
select pg_temp.fcf_assert(not exists(select 1 from jsonb_array_elements((select prepared->'beforeImage'->'player_scores'from fcf_proof))b join players p on p.id=(b->>'player_id')::bigint where p.team_id in(999001,999002)and not exists(select 1 from player_scores ps where ps.player_id=p.id and ps.round_id=(b->>'round_id')::bigint and ps.points=(b->>'points')::numeric)),'unrelated actual score values preserved');
select pg_temp.fcf_assert((select count(*)from goals where match_id=297185)=4 and exists(select 1 from appearances a join players p on p.id=a.player_id where a.match_id=297185 and p.reg_st='48680949'and a.minute_on=0 and a.minute_off=75 and a.minutes_played=75)and exists(select 1 from appearances a join players p on p.id=a.player_id where a.match_id=297185 and p.reg_st='31287135'and a.minute_on=75 and a.minute_off=90 and a.minutes_played=15),'Calonge correction clocks and four goals preserved');
rollback to fcf_before_apply;
select pg_temp.fcf_assert((select count(*)from appearances where match_id in(select mid from fcf_fixture))=126 and(select count(*)from goals where match_id in(select mid from fcf_fixture))=14,'rollback restores every approved individual row');
select pg_temp.fcf_assert(not exists(select 1 from matches where id in(select mid from fcf_fixture)and statistics_status='unavailable_historical'),'rollback restores ordinary state');
rollback;
