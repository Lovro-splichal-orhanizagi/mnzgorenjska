-- FUSSBALL pot B: odvezava native Badena, prazen arhiv kartonske politike in
-- vklop samo s tekočo sezono. Sintetično; transakcija se vedno razveljavi.
begin;
set local lock_timeout='20s';
create function pg_temp.ok(v boolean,m text)returns void language plpgsql as $$begin if v is distinct from true then raise exception 'PATH_B_TEST: %',m;end if;end$$;
create function pg_temp.zavrni(q text,expected text)returns void language plpgsql as $$begin
 begin execute q;exception when others then if sqlerrm like '%'||expected||'%' then return;else raise;end if;end;
 raise exception 'PATH_B_TEST: unexpectedly accepted %',q;
end$$;
create temporary table fx(key text primary key,value bigint);

-- 1. Odvezava: sintetična pripravljena native liga z eno označbo.
do $$
declare de bigint:=(select id from countries where code='DE');cid bigint;home bigint;away bigint;rid bigint;rid2 bigint;mid bigint;r jsonb;
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 insert into competitions(slug,name,short_name,country_id,source,source_league_code,active)values('de-path-b-detach','Detach fixture','Detach',de,'fussball-public',repeat('F',32)||'-G:2026/27',false)returning id into cid;
 perform public.install_fussball_card_policy(cid,repeat('F',32)||'-G:2026/27',array[repeat('G',32)||'-G:2025/26']);
 insert into teams(name,country_id)values('PATH B DETACH HOME',de)returning id into home;
 insert into teams(name,country_id)values('PATH B DETACH AWAY',de)returning id into away;
 insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',1,current_date-7,clock_timestamp()-interval'7 days')returning id into rid;
 insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',2,current_date+7,clock_timestamp()+interval'7 days')returning id into rid2;
 insert into private_historical_statistics.policies(id,policy_sha256,document)values('de-fussball-baden-mixed-history-v1',repeat('a',64),'{"competitionSlug":"de-path-b-other"}')on conflict(id)do nothing;
 insert into private_historical_statistics.installed_policies(competition_id,policy_id,policy_sha256,first_fantasy_played_on)values(cid,'de-fussball-baden-mixed-history-v1',repeat('a',64),current_date+7);
 insert into private_historical_statistics.markers(competition_id,source_match_id,source_report_id,fixture,raw_sha256,round_id,home_team_id,away_team_id)values(cid,repeat('H',32),'de-fussball-'||repeat('H',32),'{}',repeat('b',64),rid,home,away);
 alter table public.matches disable trigger protect_historical_statistics_match;
 insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,statistics_status,statistics_reason)values(rid,home,away,2,1,current_date-7,'de-fussball-'||repeat('H',32),'unavailable_historical','anonymous-starter')returning id into mid;
 alter table public.matches enable trigger protect_historical_statistics_match;
 insert into private_baden_history.prepared values(cid,repeat('c',64),'[]',rid2);
 perform pg_temp.zavrni(format('delete from private_baden_history.prepared where competition_id=%s',cid),'immutable');
 perform pg_temp.zavrni(format('delete from private_historical_statistics.markers where competition_id=%s',cid),'immutable marker');
 r:=private_fussball.detach_native_current_only('de-path-b-detach');
 perform pg_temp.ok(r->>'detached'='true' and (r->>'markers')::int=1 and (r->>'matches')::int=1,'detach summary '||r::text);
 perform pg_temp.ok(not exists(select 1 from private_baden_history.prepared where competition_id=cid) and not exists(select 1 from private_historical_statistics.installed_policies where competition_id=cid) and not exists(select 1 from private_historical_statistics.markers where competition_id=cid),'native state removed');
 perform pg_temp.ok((select statistics_status='available' and statistics_reason is null and home_goals=2 and imported_at is null from matches where id=mid),'match kept as unimported official fixture');
 perform pg_temp.ok((select archive_codes='{}' from private_fussball.card_policies where competition_id=cid),'current-only card policy');
 perform pg_temp.ok((select jsonb_array_length(state->'markers')=1 and state->'prepared'->>'opening_round_id'=rid2::text from private_fussball.detached_native_state where tekmovanje=cid),'dropped state retained');
 perform pg_temp.ok((select bool_and(tgenabled='O') from pg_trigger where tgname in('baden_prepared_immutable','baden_installed_immutable','baden_history_marker_guard','protect_historical_statistics_match')),'guards re-enabled');
 perform pg_temp.ok(private_fussball.detach_native_current_only('de-path-b-detach')->>'detached'='false','second detach is a no-op');
end$$;

-- 2. Nameščanje politike brez arhiva in vklop samo s tekočo sezono.
do $$
declare de bigint:=(select id from countries where code='DE');cid bigint;home bigint;away bigint;r1 bigint;r2 bigint;r3 bigint;m1 bigint;m2 bigint;pid bigint;i integer;apps jsonb:='[]';goal jsonb;
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 insert into competitions(slug,name,short_name,country_id,source,source_league_code,active,prvi_fantasy_krog)values('de-path-b-fixture','Path B fixture','PathB',de,'fussball-public',repeat('E',32)||'-G:2026/27',false,1)returning id into cid;
 perform pg_temp.zavrni(format('select public.install_fussball_card_policy(%s,%L,array[%L])',cid,repeat('E',32)||'-G:2026/27',repeat('E',32)||'-G:2026/27'),'inactive exact German');
 perform public.install_fussball_card_policy(cid,repeat('E',32)||'-G:2026/27','{}');
 perform pg_temp.ok((select source_policy='fussball-community-cards-v1' from competitions where id=cid),'policy installed without archive');
 perform pg_temp.ok(public.install_fussball_card_policy(cid,repeat('E',32)||'-G:2026/27','{}')->>'installed'='true','idempotent install');
 perform pg_temp.zavrni(format('select public.install_fussball_card_policy(%s,%L,array[%L])',cid,repeat('E',32)||'-G:2026/27',repeat('K',32)||'-G:2025/26'),'cannot be rebound');
 insert into teams(name,country_id)values('PATH B HOME',de)returning id into home;
 insert into teams(name,country_id)values('PATH B AWAY',de)returning id into away;
 insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',1,current_date-14,clock_timestamp()-interval'14 days')returning id into r1;
 insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',2,current_date-7,clock_timestamp()-interval'7 days')returning id into r2;
 insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',3,current_date+6,clock_timestamp()+interval'6 days')returning id into r3;
 insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id)values(r1,home,away,1,0,current_date-14,'de-fussball-'||repeat('M',32))returning id into m1;
 insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on)values(r2,away,home,0,0,current_date-7)returning id into m2;
 insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id)values(r3,home,away,0,0,current_date+6,'de-fussball-'||repeat('O',32));
 for i in 1..24 loop
  insert into players(first_name,last_name,full_name,team_id,competition_id,reg_st,position,position_source,active,value,value_start)
  values('Path','B '||i,'Path B '||i,case when i<=12 then home else away end,cid,9000000000+i,case when i in(1,13)then'GK'else'DEF'end,'zapisnik',true,6,6)returning id into pid;
  if i not in(12,24) then apps:=apps||jsonb_build_array(jsonb_build_object('player_id',pid,'team_id',case when i<=12 then home else away end,'shirt_number',i,'started',true,'minute_on',0,'minute_off',90,'minutes_played',90,'goals',case when i=2 then 1 else 0 end,'own_goals',0,'penalties_scored',0,'penalties_missed',0,'penalties_saved',0,'yellow_cards',0,'red_cards',0,'red_card_minute',null,'goals_conceded',case when i>12 then 1 else 0 end,'clean_sheet',i<=12,'is_goalkeeper',i in(1,13)));end if;
  if i=2 then goal:=jsonb_build_array(jsonb_build_object('scorer_id',pid,'team_id',home,'minute',35,'is_own_goal',false,'is_penalty',false,'score_home',1,'score_away',0));end if;
 end loop;
 perform public.zamenjaj_nastope_tekme(m1,apps,goal);
 update matches set imported_at=clock_timestamp() where id=m1;
 insert into fx values('cid',cid),('m2',m2),('r3',r3),('home',home);
end$$;
-- Readiness of prices/squads is the pre-existing preveri_vklop_lige guard, tested
-- elsewhere; isolate only the current-only admission here.
alter table public.competitions disable trigger varovalo_vklopa_lige;
do $$
declare cid bigint:=(select value from fx where key='cid');m jsonb;res jsonb;
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 m:=jsonb_build_object('version',1,'kind','fussball-current-only','currentCode',repeat('E',32)||'-G:2026/27','sourceResultSha256',repeat('d',64),'unknownReports','[]'::jsonb);
 perform pg_temp.zavrni(format('select public.vklopi_fussball_tekoco(%L,%L)','de-path-b-fixture',m),'every past current fixture');
 perform pg_temp.zavrni(format('select public.vklopi_fussball_tekoco(%L,%L)','de-path-b-fixture',m||jsonb_build_object('unknownReports',jsonb_build_array(jsonb_build_object('reportId','de-fussball-'||repeat('O',32),'round',3,'date',current_date+6,'home','PATH B HOME','away','PATH B AWAY','score',null)))),'unknown reports must be past');
 perform pg_temp.zavrni(format('select public.vklopi_fussball_tekoco(%L,%L)','de-path-b-fixture',m-'sourceResultSha256'),'activation manifest');
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform pg_temp.zavrni(format('select public.vklopi_fussball_tekoco(%L,%L)','de-path-b-fixture',m),'service only');
 perform set_config('request.jwt.claim.role','service_role',true);
 perform pg_temp.zavrni(format('select public.vklopi_fussball_tekoco(%L,%L)','de-path-b-fixture',m||jsonb_build_object('unknownReports',jsonb_build_array(jsonb_build_object('reportId','de-fussball-'||repeat('N',32),'round',2,'date',current_date-7,'home','PATH B HOME','away','PATH B AWAY','score',null)))),'unknown reports must be past');
 m:=m||jsonb_build_object('unknownReports',jsonb_build_array(jsonb_build_object('reportId','de-fussball-'||repeat('N',32),'round',2,'date',current_date-7,'home','PATH B AWAY','away','PATH B HOME','score',jsonb_build_object('domaci',3,'gostje',3),'reason','FUSSBALL_REPORT_INVALID')));
 res:=public.vklopi_fussball_tekoco('de-path-b-fixture',m);
 perform pg_temp.ok(res->>'vklopljena'='true' and (res->>'prvi_krog')::int=3 and (res->>'neznanih')::int=1,'activation result '||res::text);
 perform pg_temp.ok((select active and prvi_fantasy_krog=3 from competitions where id=cid),'active with fresh opening');
 perform pg_temp.ok((select imported_at is null and statistics_status='available' and zapisnik_id='de-fussball-'||repeat('N',32) and home_goals=3 and away_goals=3 and not vir_brez_izida and not exists(select 1 from appearances where match_id=matches.id) from matches where id=(select value from fx where key='m2')),'unknown report keeps only its official header');
 perform pg_temp.zavrni(format('select public.vklopi_fussball_tekoco(%L,%L)','de-path-b-fixture',m),'inactive current-only');
end$$;
alter table public.competitions enable trigger varovalo_vklopa_lige;
-- A started opening round or archive-bound policy never qualifies.
do $$
declare de bigint:=(select id from countries where code='DE');cid bigint;home bigint:=(select value from fx where key='home');r bigint;
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 insert into competitions(slug,name,short_name,country_id,source,source_league_code,active)values('de-path-b-archive','Archive fixture','Arch',de,'fussball-public',repeat('P',32)||'-G:2026/27',false)returning id into cid;
 perform public.install_fussball_card_policy(cid,repeat('P',32)||'-G:2026/27',array[repeat('Q',32)||'-G:2025/26']);
 perform pg_temp.zavrni(format('select public.vklopi_fussball_tekoco(%L,%L)','de-path-b-archive',jsonb_build_object('version',1,'kind','fussball-current-only','currentCode',repeat('P',32)||'-G:2026/27','sourceResultSha256',repeat('d',64),'unknownReports','[]'::jsonb)),'inactive current-only');
end$$;
rollback;
