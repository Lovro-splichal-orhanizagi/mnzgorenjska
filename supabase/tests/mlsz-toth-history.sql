begin;
set local lock_timeout='15s';
set local statement_timeout='180s';
select private_reviewed_existing_history.require((select count(*)from private_reviewed_existing_history.report_targets('hu-cs-u19-toth')where cid=625 and mid in(622735,622772))=2,'exact two approved Toth targets registered');
create temporary table toth_players(idx int,n int,pid bigint,tid bigint) on commit drop;
do $$
declare i int;j int;tid bigint;pid bigint;rid bigint;mid bigint;ht bigint;at bigint;sn text;day date;
begin
 if exists(select 1 from rounds where competition_id=625) or exists(select 1 from players where competition_id=625) or exists(select 1 from fantasy_teams where competition_id=625) or exists(select 1 from teams where id in(10928,2448,10926,6471)) or exists(select 1 from matches where id in(622735,622772)) then raise exception 'Toth fixture IDs must be free of native history/user rows';end if;
 update competitions set slug='toth-displaced-'||id where slug='hu-cs-u19-toth' and id<>625;
 update competitions set slug='hu-cs-u19-toth',name='Toth fixture',short_name='Toth',source='mlsz',source_league_code='67/6/34102',source_policy=null,country_id=(select id from countries where code='HU'),active=false,sezona_koledarska=false,prvi_fantasy_krog=2 where id=625;
 for i in 1..10 loop
  tid:=case i when 1 then 10928 when 2 then 2448 when 3 then 10926 when 4 then 6471 else 625000000+i end;
  insert into teams(id,name,short_name,country_id)overriding system value values(tid,case i when 1 then 'NagyLog-St.Mihály FC' when 2 then 'UTC 1913 Labdarúgó Kft' when 3 then 'Szőreg RSE' when 4 then 'ESK Kiskundorozsma' else 'Toth fixture club '||i end,'Toth-'||i,(select id from countries where code='HU'));
  for j in 1..17 loop
   insert into players(first_name,last_name,full_name,team_id,competition_id,position,position_source,active,value,value_start)
    values('Toth','Fixture '||i||'-'||j,'Toth Fixture '||i||'-'||j,tid,625,case when j in(1,12) then 'GK' when j between 2 and 5 or j=13 then 'DEF' when j between 6 and 9 or j=14 then 'MID' else 'FWD' end,'zapisnik',true,6,6)returning id into pid;
   insert into toth_players values(i,j,pid,tid);
  end loop;
 end loop;
 for i in 1..110 loop
  sn:=case when i<=87 then '2025/26' else '2026/27' end;
  rid:=case i when 10 then 35640 when 16 then 35646 else 62500000+i end;mid:=case i when 10 then 622735 when 16 then 622772 else 62500000000+i end;
  day:=case i when 10 then date '2025-11-16' when 16 then date '2026-04-25' else case when i<=87 then date '2025-08-01'+i else current_date-100+(i-87)*3 end end;
  insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(rid,sn,case when i<=87 then i else i-87 end,day,case when i>87 then clock_timestamp()-interval '1 day' else null end,625);
  if i=10 then ht:=10928;at:=2448;elsif i=16 then ht:=10926;at:=6471;else select p.tid into ht from toth_players p where p.idx=((i-1)%10)+1 and p.n=1;select p.tid into at from toth_players p where p.idx=(i%10)+1 and p.n=1;end if;
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at)overriding system value values(mid,rid,ht,at,case when i=10 then 3 else 0 end,case when i=16 then 3 else 0 end,day,case i when 10 then '2079402' when 16 then '2079433' else (991000000+i)::text end,case i when 10 then 'https://adatbank.mlsz.hu/match/65/6/31904/10/2079402.html' when 16 then 'https://adatbank.mlsz.hu/match/65/6/31904/16/2079433.html' else 'https://fixture.invalid/toth/'||i end,clock_timestamp()-interval '1 day');
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
   select mid,p.pid,p.tid,true,0,90,90,p.n=1 from toth_players p where p.tid in(ht,at) and p.n<=case when i=16 and p.tid=ht then 8 else 11 end;
  -- The first complete match seeds statistics for the remaining fixture writes.
  -- Empty-table CI estimates otherwise repeatedly expand appearance_points.
  if i=1 then
   analyze public.players,public.rounds,public.matches,public.appearances,public.goals,public.player_scores,public.statistika_igralcev;
  end if;
 end loop;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
  select 622735,p.pid,p.tid,false,0,0,0,false from toth_players p where (p.idx=1 and p.n between 12 and 16) or (p.idx=2 and p.n between 12 and 17);
 insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)
  select 622735,p.pid,p.tid,p.n*5,false from toth_players p where (p.idx=1 and p.n=2) or (p.idx=2 and p.n between 2 and 9);
 insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)
  select 622772,p.pid,p.tid,p.n*5,false from toth_players p where p.idx=4 and p.n between 2 and 3;
 update appearances a set minute_off=60,minutes_played=60 from toth_players p,matches m where m.id=62500000110 and a.match_id=m.id and p.pid=a.player_id and p.tid=m.home_team_id and p.n=11;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
  select 62500000110,p.pid,p.tid,false,60,90,30,false from toth_players p join matches m on m.id=62500000110 and m.home_team_id=p.tid where p.n=14;
 insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(62500999,'2026/27',24,current_date+10,clock_timestamp()+interval '2 days',625);
 insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on)overriding system value values(62500000999,62500999,10928,2448,0,0,current_date+10);
end$$;
-- No bypassed/disabled triggers: service_role is the ordinary PostgREST importer.
set local role service_role;
set local request.jwt.claims='{"role":"service_role"}';
do $$
declare main text:=repeat('a',40);sha text:='e6a60a710be2da291be450cec66b57998b25a4484f092eb27a41da47389bbf34';prepared jsonb;applied jsonb;preview jsonb;active_result jsonb;before_other jsonb;after_other jsonb;markers jsonb;sig text;
begin
 if has_schema_privilege('service_role','private_historical_statistics','USAGE') or has_schema_privilege('service_role','private_reviewed_existing_history','USAGE') then raise exception 'service role may use only public maintenance wrappers';end if;
 if current_user<>'service_role' then raise exception 'native test must run as service importer';end if;
 foreach sig in array array['public.prepare_reviewed_existing_cleanup(text,text,text)','public.apply_reviewed_existing_cleanup(text,text,text,text,text)','public.get_reviewed_existing_cleanup_receipt(text)','public.begin_reviewed_existing_prices(text,text,text)','public.record_reviewed_existing_prices(text,text,text)','public.check_reviewed_existing_release(text,text,text,text,boolean)'] loop
  if not has_function_privilege('service_role',sig,'EXECUTE') or has_function_privilege('anon',sig,'EXECUTE') or has_function_privilege('authenticated',sig,'EXECUTE') then raise exception 'service-only ACL violation: %',sig;end if;
 end loop;
 begin perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-b',main,sha);raise exception 'foreign target accepted';exception when others then if sqlerrm='foreign target accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: unknown slug' then raise;end if;end;
 begin perform public.prepare_reviewed_existing_cleanup('hu-cs-u19-toth',main,repeat('b',64));raise exception 'foreign policy hash accepted';exception when others then if sqlerrm='foreign policy hash accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact canonical policy SHA required' then raise;end if;end;
 begin update matches set away_goals=8 where id=622735;perform public.prepare_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha);raise exception 'tampered official result accepted';exception when others then if sqlerrm='tampered official result accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin update matches set source_url=source_url||'?foreign' where id=622735;perform public.prepare_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha);raise exception 'tampered source accepted';exception when others then if sqlerrm='tampered source accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin delete from appearances where id=(select min(id) from appearances where match_id=622735);perform public.prepare_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha);raise exception 'tampered rows accepted';exception when others then if sqlerrm='tampered rows accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin update rounds set deadline_at=clock_timestamp()-interval '1 minute' where id=62500999;perform public.prepare_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha);raise exception 'stale opening accepted';exception when others then if sqlerrm='stale opening accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: no future unlocked first round' then raise;end if;end;
 begin delete from appearances where match_id=62500000001;delete from matches where id=62500000001;perform public.prepare_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha);raise exception 'archive count drift accepted';exception when others then if sqlerrm='archive count drift accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: NPL 2025/26 archive must retain all 462 approved imported reports' then raise;end if;end;
 prepared:=public.prepare_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha);
 if prepared->'targetMatchIds'<>'[622735,622772]'::jsonb then raise exception 'foreign target set';end if;
 before_other:=jsonb_build_object('matches',(select jsonb_agg(to_jsonb(m) order by m.id) from matches m join rounds r on r.id=m.round_id where r.competition_id=625 and m.id not in(622735,622772)),'apps',(select jsonb_agg(to_jsonb(a) order by a.id) from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=625 and m.id not in(622735,622772)),'goals',(select jsonb_agg(to_jsonb(g) order by g.id)from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=625 and m.id not in(622735,622772)));
 begin perform public.apply_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha,repeat('b',64),prepared->>'beforeImageText');raise exception 'tampered before SHA accepted';exception when others then if sqlerrm='tampered before SHA accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: before image changed or not byte-identical' then raise;end if;end;
 applied:=public.apply_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha,prepared->>'beforeSha256',prepared->>'beforeImageText');
 if (select count(*) from matches m join rounds r on r.id=m.round_id where r.competition_id=625 and r.season='2025/26' and m.imported_at is not null)<>85 or (select count(*) from matches m join rounds r on r.id=m.round_id where r.competition_id=625 and r.season='2026/27' and m.imported_at is not null)<>23 then raise exception 'exact85 archive plus23 current imported reports required';end if;
 if applied->>'removedAppearances'<>'52' or applied->>'removedGoals'<>'11' or applied->>'unavailableMatches'<>'2' then raise exception 'cleanup counts differ';end if;
 if not exists(select 1 from matches where id=622735 and home_goals=3 and away_goals=0 and not kontumacija and statistics_status='unavailable_historical' and imported_at is null and zapisnik_id='2079402') or exists(select 1 from appearances where match_id=622735) or exists(select 1 from goals where match_id=622735) then raise exception 'official header or empty individual state differs';end if;
 if not exists(select 1 from matches where id=622772 and home_goals=0 and away_goals=3 and not kontumacija and statistics_status='unavailable_historical' and imported_at is null and zapisnik_id='2079433') or exists(select 1 from appearances where match_id in(622735,622772)) or exists(select 1 from goals where match_id in(622735,622772)) then raise exception 'both exact target headers and empty individual rows must survive';end if;
 after_other:=jsonb_build_object('matches',(select jsonb_agg(to_jsonb(m) order by m.id) from matches m join rounds r on r.id=m.round_id where r.competition_id=625 and m.id not in(622735,622772)),'apps',(select jsonb_agg(to_jsonb(a) order by a.id) from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=625 and m.id not in(622735,622772)),'goals',(select jsonb_agg(to_jsonb(g) order by g.id)from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=625 and m.id not in(622735,622772)));
 if after_other is distinct from before_other then raise exception 'ordinary matches or individual rows changed';end if;
 -- The same ordinary writer remains usable for another report (subtransaction restores its row IDs).
 begin perform public.zamenjaj_nastope_tekme(62500000110,(select jsonb_agg(to_jsonb(a)) from appearances a where match_id=62500000110),null);raise exception 'ordinary writer pass';exception when others then if sqlerrm<>'ordinary writer pass' then raise;end if;end;
 markers:=public.get_installed_historical_statistics_markers(625);
 begin perform public.upsert_unavailable_historical_match(625,'2079403','hu-cs-u19-toth-historical-unavailable-2026-10-24-v1',sha,'f233a3f56df2c829c4e1d4909d1e7bcbb033b5fc1fedff38f6f39892b2f2b991','{}'::jsonb);raise exception 'foreign historical report accepted';exception when others then if sqlerrm='foreign historical report accepted' then raise;elsif sqlerrm<>'HISTORICAL_POLICY: unapproved match or raw hash' then raise;end if;end;
 begin perform public.upsert_unavailable_historical_match(625,'2079402','hu-cs-u19-toth-historical-unavailable-2026-10-24-v1',sha,repeat('b',64),'{}'::jsonb);raise exception 'tampered raw hash accepted';exception when others then if sqlerrm='tampered raw hash accepted' then raise;elsif sqlerrm<>'HISTORICAL_POLICY: unapproved match or raw hash' then raise;end if;end;
 if markers->>'policySha256'<>sha or jsonb_array_length(markers->'markers')<>2 or markers#>>'{markers,0,matchId}'<>'622735' then raise exception 'runtime marker binding failed';end if;
 begin update matches set imported_at=clock_timestamp() where id=622735;raise exception 'normal importer restored excluded header';exception when others then if sqlerrm='normal importer restored excluded header' then raise;end if;end;
 begin perform public.zamenjaj_nastope_tekme(622735,jsonb_build_array(jsonb_build_object('player_id',(select id from players where competition_id=625 limit 1),'team_id',10928)),null);raise exception 'normal importer restored excluded appearance';exception when others then if sqlerrm='normal importer restored excluded appearance' then raise;end if;end;
 begin perform public.apply_reviewed_existing_cleanup('hu-cs-u19-toth',main,sha,prepared->>'beforeSha256',prepared->>'beforeImageText');raise exception 'cleanup repeated';exception when others then if sqlerrm='cleanup repeated' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: cleanup receipt exists; inspect it, never retry' then raise;end if;end;
 preview:=public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha);
 if preview->>'ready'<>'false' then raise exception 'unpriced release accepted';end if;
 perform public.begin_reviewed_existing_prices('hu-cs-u19-toth',main,sha);
 update players set value=case when id%7=0 then 9 when id%3=0 then 5 when id%3=1 then 6 else 7 end,value_start=case when id%7=0 then 9 when id%3=0 then 5 when id%3=1 then 6 else 7 end where competition_id=625;
 begin
  update players set value=12,value_start=12 where competition_id=625;
  perform public.record_reviewed_existing_prices('hu-cs-u19-toth',main,sha);
  preview:=public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha);
  if preview->>'ready'<>'false' or preview->>'reason' not like 'REVIEWED_EXISTING: fresh prices: legal15 <=100%' then raise exception 'native legal squad budget gate failed: %',preview;end if;
  raise exception 'legal budget gate pass';
 exception when others then if sqlerrm<>'legal budget gate pass' then raise;end if;end;
 perform public.record_reviewed_existing_prices('hu-cs-u19-toth',main,sha);
 preview:=public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha);
 if preview->>'ready'<>'true' or (preview->>'cheapestLegal15')::numeric>100 then raise exception 'fresh priced/legal release must pass: %',preview;end if;
 -- A retained preview never authorizes a stale deadline or invalid future fixture.
 begin update rounds set deadline_at=clock_timestamp()-interval '1 minute' where id=62500999;perform public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha,preview->>'previewSha256',true);raise exception 'stale preview activated';exception when others then if sqlerrm='stale preview activated' then raise;end if;end;
 begin update matches set played_on=current_date-1 where id=62500000999;perform public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha,preview->>'previewSha256',true);raise exception 'past future fixture activated';exception when others then if sqlerrm='past future fixture activated' then raise;end if;end;
 begin update players set value=12,value_start=12 where competition_id=625;perform public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha,preview->>'previewSha256',true);raise exception 'unaffordable price vector activated';exception when others then if sqlerrm='unaffordable price vector activated' then raise;end if;end;
 begin perform public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha,repeat('b',64),true);raise exception 'foreign preview activated';exception when others then if sqlerrm='foreign preview activated' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: expected preview SHA required for activation and must match the exact preview' then raise;end if;end;
 active_result:=public.check_reviewed_existing_release('hu-cs-u19-toth',main,sha,preview->>'previewSha256',true);
 if active_result->>'active'<>'true' then raise exception 'guarded service activation failed';end if;
 raise notice 'Toth service native 52/11 cleanup, markers, ordinary-row preservation, repricing, legal15 and fresh activation gates passed';
end$$;
reset role;
-- Owner paths cannot edit the immutable approved source policy or one-time receipt.
do $$begin
 begin update private_historical_statistics.policies set document=document||'{"tampered":true}'::jsonb where id='hu-cs-u19-toth-historical-unavailable-2026-10-24-v1';raise exception 'policy mutation accepted';exception when others then if sqlerrm='policy mutation accepted' then raise;elsif sqlerrm<>'MLSZ_HISTORY: immutable reviewed policy' then raise;end if;end;
 begin update private_historical_statistics.source_club_bindings set canonical_names=array['Foreign'] where provider='mlsz' and source_club_id='317012';raise exception 'club mutation accepted';exception when others then if sqlerrm='club mutation accepted' then raise;elsif sqlerrm<>'MLSZ_HISTORY: immutable reviewed club binding' then raise;end if;end;
 begin delete from private_reviewed_existing_history.cleanup_receipts where slug='hu-cs-u19-toth';raise exception 'receipt deletion accepted';exception when others then if sqlerrm='receipt deletion accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: immutable receipt' then raise;end if;end;
end$$;
rollback;
