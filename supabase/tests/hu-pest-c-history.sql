begin;
set local lock_timeout='15s';
set local statement_timeout='180s';
select private_reviewed_existing_history.require((select count(*) from private_reviewed_existing_history.report_targets('hu-pe-u19-c') where cid=637 and mid=616508 and rid=35547 and home_id=7676 and away_id=6814 and appearances=25 and goals=8)=1,'exact approved Pest C target registered');
-- All synthetic rows and every test mutation are rolled back. IDs match the native tuple.
create temporary table pest_teams(idx int,tid bigint) on commit drop;
create temporary table pest_players(idx int,n int,pid bigint,tid bigint) on commit drop;
do $$
declare i int;j int;tid bigint;pid bigint;rid bigint;mid bigint;ht bigint;at bigint;sn text;day date;
begin
 if exists(select 1 from rounds where competition_id=637) or exists(select 1 from players where competition_id=637) or exists(select 1 from fantasy_teams where competition_id=637) or exists(select 1 from teams where id in(7676,6814)) or exists(select 1 from matches where id=616508) then raise exception 'Pest fixture IDs must be free of native history/user rows';end if;
 update competitions set slug='pest-displaced-'||id where slug='hu-pe-u19-c' and id<>637;
 update competitions set slug='hu-pe-u19-c',name='Pest fixture',short_name='Pest',source='mlsz',source_league_code='67/14/34250',source_policy=null,country_id=(select id from countries where code='HU'),active=false,sezona_koledarska=false,prvi_fantasy_krog=2 where id=637;
 for i in 1..9 loop
  tid:=case i when 1 then 7676 when 2 then 6814 else 637000000+i end;
  insert into teams(id,name,short_name,country_id)overriding system value values(tid,case i when 1 then 'Abonyi KID FC' when 2 then 'Albertirsai SE' else 'Pest fixture club '||i end,'Pest-'||i,(select id from countries where code='HU'));
  insert into pest_teams values(i,tid);
  for j in 1..17 loop
   insert into players(first_name,last_name,full_name,team_id,competition_id,position,position_source,active,value,value_start)
    values('Pest','Fixture '||i||'-'||j,'Pest Fixture '||i||'-'||j,tid,637,case when j in(1,12) then 'GK' when j between 2 and 5 or j=13 then 'DEF' when j between 6 and 9 or j=14 then 'MID' else 'FWD' end,'zapisnik',true,6,6)returning id into pid;
   insert into pest_players values(i,j,pid,tid);
  end loop;
 end loop;
 for i in 1..47 loop
  sn:=case when i<=28 then '2025/26' else '2026/27' end;
  rid:=case when i=2 then 35547 else 63700000+i end;mid:=case when i=2 then 616508 else 63700000000+i end;
  day:=case when i=2 then date '2025-09-13' when i<=28 then date '2025-08-01'+i else current_date-80+(i-28)*3 end;
  insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(rid,sn,case when i<=28 then i else i-28 end,day,case when i>28 then clock_timestamp()-interval '1 day' else null end,637);
  if i=2 then ht:=7676;at:=6814;else select t.tid into ht from pest_teams t where idx=((i-1)%9)+1;select t.tid into at from pest_teams t where idx=(i%9)+1;end if;
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at)overriding system value values(mid,rid,ht,at,case when i=2 then 3 else 0 end,0,day,case when i=2 then '2120218' else (990000000+i)::text end,case when i=2 then 'https://adatbank.mlsz.hu/match/65/14/32327/2/2120218.html' else 'https://fixture.invalid/pest/'||i end,clock_timestamp()-interval '1 day');
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
   select mid,p.pid,p.tid,true,0,90,90,p.n=1 from pest_players p where p.tid in(ht,at) and p.n<=11;
 end loop;
 update appearances a set minute_off=60,minutes_played=60 from pest_players p,matches m where m.id=63700000047 and a.match_id=m.id and p.pid=a.player_id and p.tid=m.home_team_id and p.n=11;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper) select 63700000047,p.pid,p.tid,false,60,90,30,false from pest_players p join matches m on m.id=63700000047 and m.home_team_id=p.tid where p.n=14;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)select 616508,p.pid,p.tid,false,60,90,30,false from pest_players p where p.tid=6814 and p.n between 12 and 14;
 insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)select 616508,p.pid,p.tid,p.n*5,false from pest_players p where p.tid=6814 and p.n between 2 and 9;
 insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(63700099,'2026/27',20,current_date+10,clock_timestamp()+interval '2 days',637);
 insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on)overriding system value values(63700000999,63700099,7676,6814,0,0,current_date+10);
end$$;
-- No bypassed/disabled triggers: service_role is the ordinary PostgREST importer.
set local role service_role;
set local request.jwt.claims='{"role":"service_role"}';
do $$
declare main text:=repeat('a',40);sha text:='f3925f7cdc5ad93c7001eea587e75f88cd9b486dcc7788b5f2eb7c0a2d5aaed2';prepared jsonb;applied jsonb;preview jsonb;active_result jsonb;before_other jsonb;after_other jsonb;markers jsonb;sig text;
begin
 if has_schema_privilege('service_role','private_historical_statistics','USAGE') or has_schema_privilege('service_role','private_reviewed_existing_history','USAGE') then raise exception 'service role may use only public maintenance wrappers';end if;
 if current_user<>'service_role' then raise exception 'native test must run as service importer';end if;
 foreach sig in array array['public.prepare_reviewed_existing_cleanup(text,text,text)','public.apply_reviewed_existing_cleanup(text,text,text,text,text)','public.get_reviewed_existing_cleanup_receipt(text)','public.begin_reviewed_existing_prices(text,text,text)','public.record_reviewed_existing_prices(text,text,text)','public.check_reviewed_existing_release(text,text,text,text,boolean)'] loop
  if not has_function_privilege('service_role',sig,'EXECUTE') or has_function_privilege('anon',sig,'EXECUTE') or has_function_privilege('authenticated',sig,'EXECUTE') then raise exception 'service-only ACL violation: %',sig;end if;
 end loop;
 begin perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-b',main,sha);raise exception 'foreign target accepted';exception when others then if sqlerrm='foreign target accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: unknown slug' then raise;end if;end;
 begin perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-c',main,repeat('b',64));raise exception 'foreign policy hash accepted';exception when others then if sqlerrm='foreign policy hash accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact canonical policy SHA required' then raise;end if;end;
 begin update matches set away_goals=8 where id=616508;perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-c',main,sha);raise exception 'tampered official result accepted';exception when others then if sqlerrm='tampered official result accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin update matches set source_url=source_url||'?foreign' where id=616508;perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-c',main,sha);raise exception 'tampered source accepted';exception when others then if sqlerrm='tampered source accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin delete from appearances where id=(select min(id) from appearances where match_id=616508);perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-c',main,sha);raise exception 'tampered rows accepted';exception when others then if sqlerrm='tampered rows accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin update rounds set deadline_at=clock_timestamp()-interval '1 minute' where id=63700099;perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-c',main,sha);raise exception 'stale opening accepted';exception when others then if sqlerrm='stale opening accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: no future unlocked first round' then raise;end if;end;
 begin delete from appearances where match_id=63700000001;delete from matches where id=63700000001;perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-c',main,sha);raise exception 'archive count drift accepted';exception when others then if sqlerrm='archive count drift accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: NPL 2025/26 archive must retain all 462 approved imported reports' then raise;end if;end;
 prepared:=public.prepare_reviewed_existing_cleanup('hu-pe-u19-c',main,sha);
 if prepared->'targetMatchIds'<>'[616508]'::jsonb then raise exception 'foreign target set';end if;
 before_other:=jsonb_build_object('matches',(select jsonb_agg(to_jsonb(m) order by m.id) from matches m join rounds r on r.id=m.round_id where r.competition_id=637 and m.id<>616508),'apps',(select jsonb_agg(to_jsonb(a) order by a.id) from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=637 and m.id<>616508),'goals',(select jsonb_agg(to_jsonb(g) order by g.id)from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=637 and m.id<>616508));
 begin perform public.apply_reviewed_existing_cleanup('hu-pe-u19-c',main,sha,repeat('b',64),prepared->>'beforeImageText');raise exception 'tampered before SHA accepted';exception when others then if sqlerrm='tampered before SHA accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: before image changed or not byte-identical' then raise;end if;end;
 applied:=public.apply_reviewed_existing_cleanup('hu-pe-u19-c',main,sha,prepared->>'beforeSha256',prepared->>'beforeImageText');
 if (select count(*) from matches m join rounds r on r.id=m.round_id where r.competition_id=637 and r.season='2025/26' and m.imported_at is not null)<>27 or (select count(*) from matches m join rounds r on r.id=m.round_id where r.competition_id=637 and r.season='2026/27' and m.imported_at is not null)<>19 then raise exception 'exact27 archive plus19 current imported reports required';end if;
 if applied->>'removedAppearances'<>'25' or applied->>'removedGoals'<>'8' or applied->>'unavailableMatches'<>'1' then raise exception 'cleanup counts differ';end if;
 if not exists(select 1 from matches where id=616508 and home_goals=3 and away_goals=0 and not kontumacija and statistics_status='unavailable_historical' and imported_at is null and zapisnik_id='2120218') or exists(select 1 from appearances where match_id=616508) or exists(select 1 from goals where match_id=616508) then raise exception 'official header or empty individual state differs';end if;
 after_other:=jsonb_build_object('matches',(select jsonb_agg(to_jsonb(m) order by m.id) from matches m join rounds r on r.id=m.round_id where r.competition_id=637 and m.id<>616508),'apps',(select jsonb_agg(to_jsonb(a) order by a.id) from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=637 and m.id<>616508),'goals',(select jsonb_agg(to_jsonb(g) order by g.id)from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=637 and m.id<>616508));
 if after_other is distinct from before_other then raise exception 'ordinary matches or individual rows changed';end if;
 -- The same ordinary writer remains usable for another report (subtransaction restores its row IDs).
 begin perform public.zamenjaj_nastope_tekme(63700000047,(select jsonb_agg(to_jsonb(a)) from appearances a where match_id=63700000047),null);raise exception 'ordinary writer pass';exception when others then if sqlerrm<>'ordinary writer pass' then raise;end if;end;
 markers:=public.get_installed_historical_statistics_markers(637);
 begin perform public.upsert_unavailable_historical_match(637,'2120219','hu-pe-u19-c-historical-unavailable-2026-10-24-v1',sha,'4e54028d642fd71865a44017ddef28ffdcdbea3e22ad2bb669bb18527ba75efe','{}'::jsonb);raise exception 'foreign historical report accepted';exception when others then if sqlerrm='foreign historical report accepted' then raise;elsif sqlerrm<>'HISTORICAL_POLICY: unapproved match or raw hash' then raise;end if;end;
 begin perform public.upsert_unavailable_historical_match(637,'2120218','hu-pe-u19-c-historical-unavailable-2026-10-24-v1',sha,repeat('b',64),'{}'::jsonb);raise exception 'tampered raw hash accepted';exception when others then if sqlerrm='tampered raw hash accepted' then raise;elsif sqlerrm<>'HISTORICAL_POLICY: unapproved match or raw hash' then raise;end if;end;
 if markers->>'policySha256'<>sha or jsonb_array_length(markers->'markers')<>1 or markers#>>'{markers,0,matchId}'<>'616508' then raise exception 'runtime marker binding failed';end if;
 begin update matches set imported_at=clock_timestamp() where id=616508;raise exception 'normal importer restored excluded header';exception when others then if sqlerrm='normal importer restored excluded header' then raise;end if;end;
 begin perform public.zamenjaj_nastope_tekme(616508,jsonb_build_array(jsonb_build_object('player_id',(select id from players where competition_id=637 limit 1),'team_id',7676)),null);raise exception 'normal importer restored excluded appearance';exception when others then if sqlerrm='normal importer restored excluded appearance' then raise;end if;end;
 begin perform public.apply_reviewed_existing_cleanup('hu-pe-u19-c',main,sha,prepared->>'beforeSha256',prepared->>'beforeImageText');raise exception 'cleanup repeated';exception when others then if sqlerrm='cleanup repeated' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: cleanup receipt exists; inspect it, never retry' then raise;end if;end;
 preview:=public.check_reviewed_existing_release('hu-pe-u19-c',main,sha);
 if preview->>'ready'<>'false' then raise exception 'unpriced release accepted';end if;
 perform public.begin_reviewed_existing_prices('hu-pe-u19-c',main,sha);
 update players set value=case when id%7=0 then 9 when id%3=0 then 5 when id%3=1 then 6 else 7 end,value_start=case when id%7=0 then 9 when id%3=0 then 5 when id%3=1 then 6 else 7 end where competition_id=637;
 begin
  update players set value=12,value_start=12 where competition_id=637;
  perform public.record_reviewed_existing_prices('hu-pe-u19-c',main,sha);
  preview:=public.check_reviewed_existing_release('hu-pe-u19-c',main,sha);
  if preview->>'ready'<>'false' or preview->>'reason' not like 'REVIEWED_EXISTING: fresh prices: legal15 <=100%' then raise exception 'native legal squad budget gate failed: %',preview;end if;
  raise exception 'legal budget gate pass';
 exception when others then if sqlerrm<>'legal budget gate pass' then raise;end if;end;
 perform public.record_reviewed_existing_prices('hu-pe-u19-c',main,sha);
 preview:=public.check_reviewed_existing_release('hu-pe-u19-c',main,sha);
 if preview->>'ready'<>'true' or (preview->>'cheapestLegal15')::numeric>100 then raise exception 'fresh priced/legal release must pass: %',preview;end if;
 -- A retained preview never authorizes a stale deadline or invalid future fixture.
 begin update rounds set deadline_at=clock_timestamp()-interval '1 minute' where id=63700099;perform public.check_reviewed_existing_release('hu-pe-u19-c',main,sha,preview->>'previewSha256',true);raise exception 'stale preview activated';exception when others then if sqlerrm='stale preview activated' then raise;end if;end;
 begin update matches set played_on=current_date-1 where id=63700000999;perform public.check_reviewed_existing_release('hu-pe-u19-c',main,sha,preview->>'previewSha256',true);raise exception 'past future fixture activated';exception when others then if sqlerrm='past future fixture activated' then raise;end if;end;
 begin update players set value=12,value_start=12 where competition_id=637;perform public.check_reviewed_existing_release('hu-pe-u19-c',main,sha,preview->>'previewSha256',true);raise exception 'unaffordable price vector activated';exception when others then if sqlerrm='unaffordable price vector activated' then raise;end if;end;
 begin perform public.check_reviewed_existing_release('hu-pe-u19-c',main,sha,repeat('b',64),true);raise exception 'foreign preview activated';exception when others then if sqlerrm='foreign preview activated' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: expected preview SHA required for activation and must match the exact preview' then raise;end if;end;
 active_result:=public.check_reviewed_existing_release('hu-pe-u19-c',main,sha,preview->>'previewSha256',true);
 if active_result->>'active'<>'true' then raise exception 'guarded service activation failed';end if;
 raise notice 'Pest service native 25/8 cleanup, markers, ordinary-row preservation, repricing, legal15 and fresh activation gates passed';
end$$;
reset role;
-- Owner paths cannot edit the immutable approved source policy or one-time receipt.
do $$begin
 begin update private_historical_statistics.policies set document=document||'{"tampered":true}'::jsonb where id='hu-pe-u19-c-historical-unavailable-2026-10-24-v1';raise exception 'policy mutation accepted';exception when others then if sqlerrm='policy mutation accepted' then raise;elsif sqlerrm<>'MLSZ_HISTORY: immutable reviewed policy' then raise;end if;end;
 begin update private_historical_statistics.source_club_bindings set canonical_names=array['Foreign'] where provider='mlsz' and source_club_id='317012';raise exception 'club mutation accepted';exception when others then if sqlerrm='club mutation accepted' then raise;elsif sqlerrm<>'MLSZ_HISTORY: immutable reviewed club binding' then raise;end if;end;
 begin delete from private_reviewed_existing_history.cleanup_receipts where slug='hu-pe-u19-c';raise exception 'receipt deletion accepted';exception when others then if sqlerrm='receipt deletion accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: immutable receipt' then raise;end if;end;
end$$;
rollback;
