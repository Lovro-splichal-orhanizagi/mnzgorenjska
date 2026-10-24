begin;
set local lock_timeout='15s';
set local statement_timeout='180s';
select private_reviewed_existing_history.require((select count(*)from private_reviewed_existing_history.report_targets('hu-ba-u19-2')where cid=615 and mid=624245 and appearances=21 and goals=0)=1,'only exact Baranya scorer omission registered');
create temporary table baranya_players(idx int,n int,pid bigint,tid bigint) on commit drop;
do $$declare i int;j int;tid bigint;pid bigint;rid bigint;mid bigint;ht bigint;at bigint;rno int;code text;day date;
begin
 if exists(select 1 from rounds where competition_id=615)or exists(select 1 from players where competition_id=615)or exists(select 1 from fantasy_teams where competition_id=615)or exists(select 1 from teams where id in(2093,2089,5870,5879))or exists(select 1 from matches where id in(624245,624230))then raise exception 'Baranya fixture IDs must be free';end if;
 update competitions set slug='baranya-displaced-'||id where slug='hu-ba-u19-2'and id<>615;
 update competitions set slug='hu-ba-u19-2',name='Baranya fixture',short_name='Baranya',source='mlsz',source_league_code='67/2/33847',source_policy=null,country_id=(select id from countries cc where cc.code='HU'),active=false,sezona_koledarska=false,prvi_fantasy_krog=2 where id=615;
 for i in 1..10 loop
  tid:=case i when 1 then 2093 when 2 then 2089 when 3 then 5870 when 4 then 5879 else 615000000+i end;
  insert into teams(id,name,short_name,country_id)overriding system value values(tid,case i when 1 then 'SZEDERKÉNYI SE'when 2 then 'BEREMENDI ÉPÍTŐK'when 3 then 'EGERÁG SE'when 4 then 'SÁSD VSK'else 'Baranya fixture club '||i end,'BA-'||i,(select id from countries cc where cc.code='HU'));
  for j in 1..17 loop
   insert into players(first_name,last_name,full_name,team_id,competition_id,position,position_source,active,value,value_start)values('Baranya','Fixture '||i||'-'||j,'BA Fixture '||i||'-'||j,tid,615,case when j in(1,12)then 'GK'when j between 2 and 5 or j=13 then 'DEF'when j between 6 and 9 or j=14 then 'MID'else 'FWD'end,'zapisnik',true,6,6)returning id into pid;
   insert into baranya_players values(i,j,pid,tid);
  end loop;
 end loop;
 for i in 1..28 loop
  insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(35692+i,'2025/26',i,date '2025-08-01'+i,null,615);
 end loop;
 for i in 1..56 loop
  rno:=case when i<=28 then i else i-28 end;rid:=35692+rno;mid:=case i when 1 then 624245 when 33 then 624230 else 61500000000+i end;
  code:=case when i<=28 then '65/2/32200'else '65/2/32199'end;
  day:=case i when 1 then date '2025-09-13'when 33 then date '2025-10-25'else date '2025-08-01'+rno end;
  if i=1 then ht:=5870;at:=5879;elsif i=33 then ht:=2093;at:=2089;else select p.tid into ht from baranya_players p where p.idx=((i-1)%10)+1 and p.n=1;select p.tid into at from baranya_players p where p.idx=(i%10)+1 and p.n=1;end if;
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at)overriding system value values(mid,rid,ht,at,case i when 1 then 3 when 33 then 2 else 0 end,case when i=33 then 4 else 0 end,day,case i when 1 then '2111703'when 33 then '2111691'else(992000000+i)::text end,case i when 1 then 'https://adatbank.mlsz.hu/match/65/2/32200/1/2111703.html'when 33 then 'https://adatbank.mlsz.hu/match/65/2/32199/5/2111691.html'else 'https://adatbank.mlsz.hu/match/'||code||'/'||rno||'/'||(992000000+i)||'.html'end,clock_timestamp()-interval '1day');
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)select mid,p.pid,p.tid,true,0,90,90,p.n=1 from baranya_players p where p.tid in(ht,at)and p.n<=case when i=1 and p.tid=ht then 10 else 11 end;
 end loop;
 -- Ordinary source-proven report2111691 stays imported:30apps,6goals, substitution85/red90.
 update appearances a set minute_off=85,minutes_played=85,red_cards=1,red_card_minute=90 from baranya_players p where a.match_id=624230 and a.player_id=p.pid and p.idx=2 and p.n=8;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
  select 624230,p.pid,p.tid,false,case when p.idx=2 and p.n=14 then 85 else 0 end,case when p.idx=2 and p.n=14 then 90 else 0 end,case when p.idx=2 and p.n=14 then 5 else 0 end,false from baranya_players p where p.idx in(1,2)and p.n between 12 and 15;
 insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)select 624230,p.pid,p.tid,p.n*5,false from baranya_players p where(p.idx=1 and p.n between 2 and 3)or(p.idx=2 and p.n between 2 and 5);
 for i in 1..29 loop
  rid:=61500000+i;mid:=61510000000+i;select p.tid into ht from baranya_players p where p.idx=((i-1)%10)+1 and p.n=1;select p.tid into at from baranya_players p where p.idx=(i%10)+1 and p.n=1;
  insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(rid,'2026/27',i,current_date-100+i*2,clock_timestamp()-interval '1day',615);
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at)overriding system value values(mid,rid,ht,at,0,0,current_date-100+i*2,(993000000+i)::text,'https://fixture.invalid/baranya/current/'||i,clock_timestamp()-interval '1day');
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)select mid,p.pid,p.tid,true,0,90,90,p.n=1 from baranya_players p where p.tid in(ht,at)and p.n<=11;
 end loop;
 update appearances a set minute_off=60,minutes_played=60 from baranya_players p,matches m where m.id=61510000029 and a.match_id=m.id and p.pid=a.player_id and p.tid=m.home_team_id and p.n=11;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)select 61510000029,p.pid,p.tid,false,60,90,30,false from baranya_players p join matches m on m.id=61510000029 and m.home_team_id=p.tid where p.n=14;
 insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(61500999,'2026/27',30,current_date+10,clock_timestamp()+interval '2days',615);
 insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on)overriding system value values(61500000999,61500999,5870,5879,0,0,current_date+10);
end$$;
-- No bypassed/disabled triggers: service_role is the ordinary PostgREST importer.
set local role service_role;
set local request.jwt.claims='{"role":"service_role"}';
do $$
declare main text:=repeat('a',40);sha text:='5d06726e54a2ac2feff95d0aa39302fc89d9bfc16a6a8b40b28b724997b80c62';prepared jsonb;applied jsonb;preview jsonb;active_result jsonb;before_other jsonb;after_other jsonb;markers jsonb;sig text;
begin
 if has_schema_privilege('service_role','private_historical_statistics','USAGE') or has_schema_privilege('service_role','private_reviewed_existing_history','USAGE') then raise exception 'service role may use only public maintenance wrappers';end if;
 if current_user<>'service_role' then raise exception 'native test must run as service importer';end if;
 foreach sig in array array['public.prepare_reviewed_existing_cleanup(text,text,text)','public.apply_reviewed_existing_cleanup(text,text,text,text,text)','public.get_reviewed_existing_cleanup_receipt(text)','public.begin_reviewed_existing_prices(text,text,text)','public.record_reviewed_existing_prices(text,text,text)','public.check_reviewed_existing_release(text,text,text,text,boolean)'] loop
  if not has_function_privilege('service_role',sig,'EXECUTE') or has_function_privilege('anon',sig,'EXECUTE') or has_function_privilege('authenticated',sig,'EXECUTE') then raise exception 'service-only ACL violation: %',sig;end if;
 end loop;
 begin perform public.prepare_reviewed_existing_cleanup('hu-pe-u19-b',main,sha);raise exception 'foreign target accepted';exception when others then if sqlerrm='foreign target accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: unknown slug' then raise;end if;end;
 begin perform public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,repeat('b',64));raise exception 'foreign policy hash accepted';exception when others then if sqlerrm='foreign policy hash accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact canonical policy SHA required' then raise;end if;end;
 begin update matches set away_goals=8 where id=624245;perform public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,sha);raise exception 'tampered official result accepted';exception when others then if sqlerrm='tampered official result accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin update matches set source_url=source_url||'?foreign' where id=624245;perform public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,sha);raise exception 'tampered source accepted';exception when others then if sqlerrm='tampered source accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin delete from appearances where id=(select min(id) from appearances where match_id=624245);perform public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,sha);raise exception 'tampered rows accepted';exception when others then if sqlerrm='tampered rows accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
 begin update rounds set deadline_at=clock_timestamp()-interval '1 minute' where id=61500999;perform public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,sha);raise exception 'stale opening accepted';exception when others then if sqlerrm='stale opening accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: no future unlocked first round' then raise;end if;end;
 begin delete from appearances where match_id=61500000002;delete from matches where id=61500000002;perform public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,sha);raise exception 'archive count drift accepted';exception when others then if sqlerrm='archive count drift accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: NPL 2025/26 archive must retain all 462 approved imported reports' then raise;end if;end;
 begin update matches set source_url='https://adatbank.mlsz.hu/match/65/2/32200/5/2111691.html'where id=624230;perform public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,sha);raise exception 'cross-archive count tamper accepted';exception when others then if sqlerrm='cross-archive count tamper accepted'then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact Baranya separate archive inventories28/28 required'then raise;end if;end;
 prepared:=public.prepare_reviewed_existing_cleanup('hu-ba-u19-2',main,sha);
 if prepared->'targetMatchIds'<>'[624245]'::jsonb then raise exception 'foreign target set';end if;
 before_other:=jsonb_build_object('matches',(select jsonb_agg(to_jsonb(m) order by m.id) from matches m join rounds r on r.id=m.round_id where r.competition_id=615 and m.id<>624245),'apps',(select jsonb_agg(to_jsonb(a) order by a.id) from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=615 and m.id<>624245),'goals',(select jsonb_agg(to_jsonb(g) order by g.id)from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=615 and m.id<>624245));
 begin perform public.apply_reviewed_existing_cleanup('hu-ba-u19-2',main,sha,repeat('b',64),prepared->>'beforeImageText');raise exception 'tampered before SHA accepted';exception when others then if sqlerrm='tampered before SHA accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: before image changed or not byte-identical' then raise;end if;end;
 applied:=public.apply_reviewed_existing_cleanup('hu-ba-u19-2',main,sha,prepared->>'beforeSha256',prepared->>'beforeImageText');
 if (select count(*) from matches m join rounds r on r.id=m.round_id where r.competition_id=615 and r.season='2025/26' and m.imported_at is not null)<>55 or (select count(*) from matches m join rounds r on r.id=m.round_id where r.competition_id=615 and r.season='2026/27' and m.imported_at is not null)<>29 then raise exception 'exact55 archive plus29 current imported reports required';end if;
 if applied->>'removedAppearances'<>'21' or applied->>'removedGoals'<>'0' or applied->>'unavailableMatches'<>'1' then raise exception 'cleanup counts differ';end if;
 if not exists(select 1 from matches where id=624245 and home_goals=3 and away_goals=0 and not kontumacija and statistics_status='unavailable_historical' and imported_at is null and zapisnik_id='2111703') or exists(select 1 from appearances where match_id=624245) or exists(select 1 from goals where match_id=624245) then raise exception 'official header or empty individual state differs';end if;
 after_other:=jsonb_build_object('matches',(select jsonb_agg(to_jsonb(m) order by m.id) from matches m join rounds r on r.id=m.round_id where r.competition_id=615 and m.id<>624245),'apps',(select jsonb_agg(to_jsonb(a) order by a.id) from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=615 and m.id<>624245),'goals',(select jsonb_agg(to_jsonb(g) order by g.id)from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=615 and m.id<>624245));
 if after_other is distinct from before_other then raise exception 'ordinary matches or individual rows changed';end if;
 -- The same ordinary writer remains usable for another report (subtransaction restores its row IDs).
 begin perform public.zamenjaj_nastope_tekme(61510000029,(select jsonb_agg(to_jsonb(a)) from appearances a where match_id=61510000029),null);raise exception 'ordinary writer pass';exception when others then if sqlerrm<>'ordinary writer pass' then raise;end if;end;
 if not exists(select 1 from matches where id=624230 and home_goals=2 and away_goals=4 and imported_at is not null and statistics_status='available')or(select count(*)from appearances where match_id=624230)<>30 or(select count(*)from goals where match_id=624230)<>6 or not exists(select 1 from appearances where match_id=624230 and minute_off=85 and red_cards=1 and red_card_minute=90)then raise exception 'valid ordinary2111691 must retain all30apps/6goals and authoritative clock';end if;
 markers:=public.get_installed_historical_statistics_markers(615);
 begin perform public.upsert_unavailable_historical_match(615,'2111704','hu-ba-u19-2-historical-unavailable-2026-10-24-v1',sha,'8d658e612d7be17b447076737c5a4157f83d0a9a0c0dd174c979e5ce7232ab9e','{}'::jsonb);raise exception 'foreign historical report accepted';exception when others then if sqlerrm='foreign historical report accepted' then raise;elsif sqlerrm<>'HISTORICAL_POLICY: unapproved match or raw hash' then raise;end if;end;
 begin perform public.upsert_unavailable_historical_match(615,'2111703','hu-ba-u19-2-historical-unavailable-2026-10-24-v1',sha,repeat('b',64),'{}'::jsonb);raise exception 'tampered raw hash accepted';exception when others then if sqlerrm='tampered raw hash accepted' then raise;elsif sqlerrm<>'HISTORICAL_POLICY: unapproved match or raw hash' then raise;end if;end;
 if markers->>'policySha256'<>sha or jsonb_array_length(markers->'markers')<>1 or markers#>>'{markers,0,matchId}'<>'624245' then raise exception 'runtime marker binding failed';end if;
 begin update matches set imported_at=clock_timestamp() where id=624245;raise exception 'normal importer restored excluded header';exception when others then if sqlerrm='normal importer restored excluded header' then raise;end if;end;
 begin perform public.zamenjaj_nastope_tekme(624245,jsonb_build_array(jsonb_build_object('player_id',(select id from players where competition_id=615 limit 1),'team_id',5870)),null);raise exception 'normal importer restored excluded appearance';exception when others then if sqlerrm='normal importer restored excluded appearance' then raise;end if;end;
 begin perform public.apply_reviewed_existing_cleanup('hu-ba-u19-2',main,sha,prepared->>'beforeSha256',prepared->>'beforeImageText');raise exception 'cleanup repeated';exception when others then if sqlerrm='cleanup repeated' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: cleanup receipt exists; inspect it, never retry' then raise;end if;end;
 preview:=public.check_reviewed_existing_release('hu-ba-u19-2',main,sha);
 if preview->>'ready'<>'false' then raise exception 'unpriced release accepted';end if;
 perform public.begin_reviewed_existing_prices('hu-ba-u19-2',main,sha);
 update players set value=case when id%7=0 then 9 when id%3=0 then 5 when id%3=1 then 6 else 7 end,value_start=case when id%7=0 then 9 when id%3=0 then 5 when id%3=1 then 6 else 7 end where competition_id=615;
 begin
  update players set value=12,value_start=12 where competition_id=615;
  perform public.record_reviewed_existing_prices('hu-ba-u19-2',main,sha);
  preview:=public.check_reviewed_existing_release('hu-ba-u19-2',main,sha);
  if preview->>'ready'<>'false' or preview->>'reason' not like 'REVIEWED_EXISTING: fresh prices: legal15 <=100%' then raise exception 'native legal squad budget gate failed: %',preview;end if;
  raise exception 'legal budget gate pass';
 exception when others then if sqlerrm<>'legal budget gate pass' then raise;end if;end;
 perform public.record_reviewed_existing_prices('hu-ba-u19-2',main,sha);
 preview:=public.check_reviewed_existing_release('hu-ba-u19-2',main,sha);
 if preview->>'ready'<>'true' or (preview->>'cheapestLegal15')::numeric>100 then raise exception 'fresh priced/legal release must pass: %',preview;end if;
 -- A retained preview never authorizes a stale deadline or invalid future fixture.
 begin update rounds set deadline_at=clock_timestamp()-interval '1 minute' where id=61500999;perform public.check_reviewed_existing_release('hu-ba-u19-2',main,sha,preview->>'previewSha256',true);raise exception 'stale preview activated';exception when others then if sqlerrm='stale preview activated' then raise;end if;end;
 begin update matches set played_on=current_date-1 where id=61500000999;perform public.check_reviewed_existing_release('hu-ba-u19-2',main,sha,preview->>'previewSha256',true);raise exception 'past future fixture activated';exception when others then if sqlerrm='past future fixture activated' then raise;end if;end;
 begin update players set value=12,value_start=12 where competition_id=615;perform public.check_reviewed_existing_release('hu-ba-u19-2',main,sha,preview->>'previewSha256',true);raise exception 'unaffordable price vector activated';exception when others then if sqlerrm='unaffordable price vector activated' then raise;end if;end;
 begin perform public.check_reviewed_existing_release('hu-ba-u19-2',main,sha,repeat('b',64),true);raise exception 'foreign preview activated';exception when others then if sqlerrm='foreign preview activated' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: expected preview SHA required for activation and must match the exact preview' then raise;end if;end;
 active_result:=public.check_reviewed_existing_release('hu-ba-u19-2',main,sha,preview->>'previewSha256',true);
 if active_result->>'active'<>'true' then raise exception 'guarded service activation failed';end if;
 raise notice 'Baranya service native 21/0 cleanup, markers, ordinary-row preservation, repricing, legal15 and fresh activation gates passed';
end$$;
reset role;
-- Owner paths cannot edit the immutable approved source policy or one-time receipt.
do $$begin
 begin update private_historical_statistics.policies set document=document||'{"tampered":true}'::jsonb where id='hu-ba-u19-2-historical-unavailable-2026-10-24-v1';raise exception 'policy mutation accepted';exception when others then if sqlerrm='policy mutation accepted' then raise;elsif sqlerrm<>'MLSZ_HISTORY: immutable reviewed policy' then raise;end if;end;
 begin update private_historical_statistics.source_club_bindings set canonical_names=array['Foreign'] where provider='mlsz' and source_club_id='315796';raise exception 'club mutation accepted';exception when others then if sqlerrm='club mutation accepted' then raise;elsif sqlerrm<>'MLSZ_HISTORY: immutable reviewed club binding' then raise;end if;end;
 begin delete from private_reviewed_existing_history.cleanup_receipts where slug='hu-ba-u19-2';raise exception 'receipt deletion accepted';exception when others then if sqlerrm='receipt deletion accepted' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: immutable receipt' then raise;end if;end;
end$$;
rollback;
