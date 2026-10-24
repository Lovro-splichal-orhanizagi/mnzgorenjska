begin;
set local lock_timeout='30s';
-- NPL_RECOVERY_TEST_FUNCTION
set local statement_timeout='240s';
select private_reviewed_existing_history.require((select count(*) from private_reviewed_existing_history.report_targets('ro-ab-l5-s2') where mid=202541 and cid=499)=1,'exact Alba L5 S2 SQL admission required');
create temporary table _reviewed_existing_routes(slug text primary key,cid bigint,provider text,code text,country_code text,policy_id text,policy_sha text,mid bigint,report_id text,rid bigint,rno int,home_id bigint,away_id bigint,played_on date,home_goals int,away_goals int,appearance_count int,goal_count int,current_reports int,games_per_round int,round_count int,team_count int) on commit drop;
insert into _reviewed_existing_routes values
 ('gb-npl-midlands',979,'isthmian','npl/67d7c7bb74247876e6dae40c/2026-27','GB','gb-npl-midlands-historical-unavailable-2026-10-23-v1','5f88bd981434a2d1bb8097a71d4b62974601b0eb01758509b345c8eb6b0c6924',562344,'gb6a590670ce9ef452b61f386d',35365,3,10869,10864,'2026-08-18',1,1,29,2,150,10,15,20),
 ('gb-sfl-d1-south',984,'isthmian','sfl/69d0bdf9b616bafb97331d41/2026-27','GB','gb-sfl-d1-south-historical-unavailable-2026-10-23-v1','682dbaa0e1acfb0a4a03da9da93cdc706eb0d16dc4a8df180e994f6980369a30',509795,'gb6a5a1b79ce9ef452b61f4398',34273,11,10535,10517,'2026-10-14',1,2,29,3,132,11,12,22),
 ('ba-wwin-liga-bih',998,'nfsbih','wwin-liga-bih/54152223','BA','ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1','fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366',576391,'ba54152295',35409,5,10876,10872,'2026-09-02',1,2,32,3,49,5,10,10),
 ('ro-ab-l5-s2',499,'hlf','judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2','RO','ro-ab-l5-s2-historical-unavailable-2026-10-24-v1','c13732fdacafd49ef60bd13ec20999d9d64f7a5894a21c43f7e74526ee7a0f26',202541,'86feb0be-2e6f-4c2e-9fd3-f26aba19fb91',18053,6,5083,5079,'2026-10-18',2,3,27,0,30,5,6,10),
 ('ro-liga3-s1',497,'hlf','national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1','RO','ro-liga3-s1-historical-unavailable-2026-10-23-v1','b6686671855dfa9a6f96fa8cf67d530aa4fc4208f859e783929cb36140169329',133334,'f43d55c1-6530-49dc-a02e-4d7e578d6205',10663,1,3016,3017,'2026-08-29',2,1,33,3,54,9,6,18);
create temporary table _reviewed_existing_targets on commit drop as select * from private_reviewed_existing_history.report_targets('gb-npl-midlands') where false;
insert into _reviewed_existing_targets select * from private_reviewed_existing_history.report_targets('gb-npl-midlands');
insert into _reviewed_existing_targets select * from private_reviewed_existing_history.report_targets('gb-sfl-d1-south');
insert into _reviewed_existing_targets select * from private_reviewed_existing_history.report_targets('ro-liga3-s1');
insert into _reviewed_existing_targets select * from private_reviewed_existing_history.report_targets('ro-ab-l5-s2');
insert into _reviewed_existing_targets select * from private_reviewed_existing_history.report_targets('ba-wwin-liga-bih');
create temporary table _reviewed_existing_teams(slug text,idx int,team_id bigint,primary key(slug,idx)) on commit drop;
create temporary table _reviewed_existing_players(slug text,team_idx int,player_idx int,player_id bigint,primary key(slug,team_idx,player_idx)) on commit drop;
create temporary table _reviewed_existing_rounds(slug text,rno int,round_id bigint,primary key(slug,rno)) on commit drop;
create temporary table _reviewed_existing_matches(slug text,seq int,round_id bigint,match_id bigint,home_team_id bigint,away_team_id bigint,is_target boolean,primary key(slug,seq)) on commit drop;

do $$
declare r record;vteam bigint;vplayer bigint;vround bigint;vmatch bigint;vhome bigint;vaway bigint;round_no int;slot_no int;fixture_no int;seq_no int;target_seq int;target_extras int;target_home_extra int;target_team_idx int;side record;player record;app_total int;src text;url text;hg int;ag int;match_day date;target_apps int;target_goals int;target_found boolean;tr record;anon_match_id bigint;anon_team_id bigint;anon_goal_id bigint;
begin
 -- The owned SQL-test database deliberately holds unrelated fixtures in these IDs.
 -- They are renamed/reconfigured only within this transaction; the runner checks the
 -- complete football catalog digest before and after rollback.
 update competitions set slug='REX-displaced-'||id||'-'||slug where slug in('gb-npl-midlands','gb-sfl-d1-south','ro-liga3-s1','ro-ab-l5-s2','ba-wwin-liga-bih') and id not in(979,984,497,499,998);
 for r in select * from _reviewed_existing_routes order by cid loop
  if r.cid=979 then perform private_reviewed_existing_history.require(not exists(select 1 from matches where id in(561922,562344)) and not exists(select 1 from rounds where id in(35329,35365)),'NPL target fixture IDs must be free');end if;
  if r.cid=998 then perform private_reviewed_existing_history.require(not exists(select 1 from matches where id in(576391,576399)) and not exists(select 1 from rounds where id in(35409,35410)),'BiH target fixture IDs must be free');end if;
  perform private_reviewed_existing_history.require(not exists(select 1 from rounds where competition_id=r.cid) and not exists(select 1 from players where competition_id=r.cid) and not exists(select 1 from fantasy_teams where competition_id=r.cid),'fixture target IDs must be free of round/player/user data');
  perform private_reviewed_existing_history.require(not exists(select 1 from teams where id in(r.home_id,r.away_id)) and not exists(select 1 from teams where id between r.cid::bigint*1000000+1 and r.cid::bigint*1000000+r.team_count),'fixture native and deterministic synthetic team IDs must be free');
  update competitions set slug=r.slug,name=r.slug,short_name=r.slug,country_id=(select id from countries where code=r.country_code),source=r.provider,source_league_code=r.code,source_policy=null,active=false,sezona_koledarska=false,prvi_fantasy_krog=1 where id=r.cid;
  insert into teams(id,name,short_name,country_id)overriding system value values(r.home_id,case when r.cid=497 then 'Club Sportiv USV-CSM Iași 2020' else (select canonical_names[1] from private_historical_statistics.source_club_bindings where provider=r.provider and source_club_id=(select value->>'homeSourceClubId' from private_historical_statistics.policies p cross join lateral jsonb_array_elements(p.document->'entries')where p.id=r.policy_id and value->>'sourceMatchId'=(select source_match_id from _reviewed_existing_targets where mid=r.mid))) end,r.slug,(select id from countries where code=r.country_code));
  insert into teams(id,name,short_name,country_id)overriding system value values(r.away_id,(select canonical_names[1] from private_historical_statistics.source_club_bindings where provider=r.provider and source_club_id=(select value->>'awaySourceClubId' from private_historical_statistics.policies p cross join lateral jsonb_array_elements(p.document->'entries')where p.id=r.policy_id and value->>'sourceMatchId'=(select source_match_id from _reviewed_existing_targets where mid=r.mid))),r.slug||'-A',(select id from countries where code=r.country_code));
  insert into _reviewed_existing_teams values(r.slug,1,r.home_id),(r.slug,2,r.away_id);
  target_team_idx:=2;
  for side in
   select tid,source_id,b.canonical_names[1] team_name from (
    select rt.home_id tid,e->>'homeSourceClubId' source_id from _reviewed_existing_targets rt join private_historical_statistics.policies p on p.id=r.policy_id cross join lateral jsonb_array_elements(p.document->'entries')e where rt.slug=r.slug and e->>'sourceMatchId'=rt.source_match_id
    union all
    select rt.away_id,e->>'awaySourceClubId' from _reviewed_existing_targets rt join private_historical_statistics.policies p on p.id=r.policy_id cross join lateral jsonb_array_elements(p.document->'entries')e where rt.slug=r.slug and e->>'sourceMatchId'=rt.source_match_id
   ) targets join private_historical_statistics.source_club_bindings b on b.provider=r.provider and b.source_club_id=targets.source_id
   where tid not in(r.home_id,r.away_id) group by tid,source_id,b.canonical_names order by tid
  loop
   target_team_idx:=target_team_idx+1;
   insert into teams(id,name,short_name,country_id)overriding system value values(side.tid,side.team_name,r.slug||'-'||target_team_idx,(select id from countries where code=r.country_code));
   insert into _reviewed_existing_teams values(r.slug,target_team_idx,side.tid);
  end loop;
  for slot_no in target_team_idx+1..r.team_count loop
   insert into teams(id,name,short_name,country_id)overriding system value values(r.cid::bigint*1000000+slot_no,'REX-'||r.slug||'-'||slot_no,'REX-'||slot_no,(select id from countries where code=r.country_code))returning id into vteam;
   insert into _reviewed_existing_teams values(r.slug,slot_no,vteam);
  end loop;
  for side in select * from _reviewed_existing_teams where slug=r.slug order by idx loop
   for slot_no in 1..17 loop
    insert into players(first_name,last_name,full_name,team_id,competition_id,position,position_source,active,value,value_start)
    values('Fixture','Player '||side.idx||'-'||slot_no,'REX-'||r.slug||'-P-'||side.idx||'-'||slot_no,side.team_id,r.cid,
     case when slot_no in(1,12) then 'GK' when slot_no between 2 and 5 or slot_no=13 then 'DEF' when slot_no between 6 and 9 or slot_no=14 then 'MID' else 'FWD' end,'zapisnik',true,4.5,null) returning id into vplayer;
    insert into _reviewed_existing_players values(r.slug,side.idx,slot_no,vplayer);
   end loop;
  end loop;
  if r.cid=979 then
   insert into players(first_name,last_name,full_name,team_id,competition_id,position,position_source,active,value,value_start,value_locked,reg_st)
    select 'Recovery','Fixture '||n,'REX-NPL-RECOVERY-'||n,10862,979,'MID','zapisnik',true,4.5,null,false,null from generate_series(1,678)n;
   insert into players(id,first_name,last_name,full_name,team_id,competition_id,position,position_source,active,value,value_start,value_locked,reg_st)overriding system value values
    (401885,'Recovery','Player 401885','REX-NPL-401885',10862,979,'MID','ugibanje',true,4.5,null,false,1051545820393105),
    (401972,'Recovery','Player 401972','REX-NPL-401972',10862,979,'MID','ugibanje',true,4.5,null,false,1051558049934993),
    (402068,'Recovery','Player 402068','REX-NPL-402068',10862,979,'MID','ugibanje',true,4.5,null,false,2675064277047137);
   update players set value=case when id%3=0 then 9 else 4.5 end,value_start=case when id%3=0 then 9 else 4.5 end where competition_id=979 and id not in(401885,401972,402068);
  end if;
  for slot_no in 1..r.round_count loop
   select * into tr from _reviewed_existing_targets where slug=r.slug and season='2026/27' and rno=slot_no;
   if tr.rid is not null then vround:=tr.rid;insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(vround,'2026/27',slot_no,case when r.cid=497 and tr.rid=10663 then date '2026-08-28' else tr.played_on end,clock_timestamp()-interval '1 day',r.cid);
   else vround:=r.cid::bigint*100000+slot_no;insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(vround,'2026/27',slot_no,current_date-80+slot_no*3,clock_timestamp()-interval '1 day',r.cid);end if;
   insert into _reviewed_existing_rounds values(r.slug,slot_no,vround);
  end loop;
  vround:=r.cid::bigint*100000+r.round_count+1;insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(vround,'2026/27',r.round_count+1,current_date+7,clock_timestamp()+interval '2 days',r.cid);
  insert into _reviewed_existing_rounds values(r.slug,r.round_count+1,vround);
  target_seq:=(r.rno-1)*r.games_per_round+1;
  for seq_no in 1..r.current_reports loop
   round_no:=((seq_no-1)/r.games_per_round)+1;fixture_no:=((seq_no-1)%r.games_per_round)+1;
   select _reviewed_existing_teams.team_id into vhome from _reviewed_existing_teams where slug=r.slug and idx=(fixture_no*2)-1;
   select _reviewed_existing_teams.team_id into vaway from _reviewed_existing_teams where slug=r.slug and idx=fixture_no*2;
   select * into tr from _reviewed_existing_targets where slug=r.slug and season='2026/27' and rno=round_no and fixture_no=1;
   if tr.mid is not null then target_found:=true;vmatch:=tr.mid;vhome:=tr.home_id;vaway:=tr.away_id;hg:=tr.home_goals;ag:=tr.away_goals;match_day:=tr.played_on;src:=tr.report_id;
    url:=case when tr.mid=133334 then 'https://hailafotbal.ro/rezultate/national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1/etapa-1/club-sportiv-usv-csm-iasi-2020-kse-targu-secuiesc' else (select value->>'sourceUrl' from private_historical_statistics.policies p cross join lateral jsonb_array_elements(p.document->'entries')where p.id=r.policy_id and value->>'sourceMatchId'=tr.source_match_id) end;
   else target_found:=false;vmatch:=r.cid::bigint*10000000+seq_no;hg:=0;ag:=0;match_day:=current_date-80+round_no*3;url:='https://fixture.invalid/'||r.slug||'/'||seq_no;src:=case when r.provider='isthmian'then 'gbfixture'||lpad((r.cid*1000+seq_no)::text,12,'0') when r.provider='nfsbih'then 'bafixture'||lpad((r.cid*1000+seq_no)::text,12,'0')else '00000000-0000-0000-0000-'||lpad((r.cid*1000+seq_no)::text,12,'0')end;end if;
   if target_found then insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at,source_phase,source_round)overriding system value
    values(vmatch,tr.rid,vhome,vaway,hg,ag,match_day,src,url,clock_timestamp()-interval '1 day',null,null);
   else insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at,source_round)overriding system value
    values(vmatch,(select rr.round_id from _reviewed_existing_rounds rr where rr.slug=r.slug and rr.rno=round_no),vhome,vaway,0,0,match_day,src,url,clock_timestamp()-interval '1 day',round_no);
   end if;
   insert into _reviewed_existing_matches values(r.slug,seq_no,(select rr.round_id from _reviewed_existing_rounds rr where rr.slug=r.slug and rr.rno=round_no),vmatch,vhome,vaway,exists(select 1 from _reviewed_existing_targets x where x.mid=vmatch));
  end loop;
  -- A single unlocked opening fixture, dated relative to execution time.
  select _reviewed_existing_teams.team_id into vhome from _reviewed_existing_teams where slug=r.slug and idx=1;select _reviewed_existing_teams.team_id into vaway from _reviewed_existing_teams where slug=r.slug and idx=2;
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,statistics_status)overriding system value
   values(r.cid::bigint*10000000+r.current_reports+100,(select rr.round_id from _reviewed_existing_rounds rr where rr.slug=r.slug and rr.rno=r.round_count+1),vhome,vaway,0,0,current_date+7,'available');
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,statistics_status)overriding system value
   values(r.cid::bigint*10000000+r.current_reports+101,(select rr.round_id from _reviewed_existing_rounds rr where rr.slug=r.slug and rr.rno=r.round_count),
     (select team_id from _reviewed_existing_teams where slug=r.slug and idx=4),(select team_id from _reviewed_existing_teams where slug=r.slug and idx=3),0,0,current_date+20,'available');
  -- Use statement inserts so the native season-statistics triggers recompute once
  -- per competition, while preserving complete starter/bench fixture counts.
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
   select fm.match_id,fp.player_id,fs.team_id,fp.player_idx<=11,case when fp.player_idx<=11 then 0 else 60 end,case when fp.player_idx=2 then 60 else 90 end,case when fp.player_idx=2 then 60 when fp.player_idx<=11 then 90 else 30 end,fp.player_idx in(1,12)
   from _reviewed_existing_matches fm
   cross join lateral(values(fm.home_team_id,true),(fm.away_team_id,false))fs(team_id,is_home)
   join _reviewed_existing_teams ft on ft.slug=r.slug and ft.team_id=fs.team_id
   join _reviewed_existing_players fp on fp.slug=ft.slug and fp.team_idx=ft.idx
   left join _reviewed_existing_targets target_fixture on target_fixture.slug=fm.slug and target_fixture.mid=fm.match_id
   where fm.slug=r.slug and fp.player_idx<=case when not fm.is_target then 12 when fs.is_home then 11+(target_fixture.appearances-22+1)/2 else 11+(target_fixture.appearances-22)-((target_fixture.appearances-22+1)/2) end;
  insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)
   select fm.match_id,fp.player_id,fs.team_id,n*15,false
   from _reviewed_existing_matches fm
   join _reviewed_existing_targets target_fixture on target_fixture.slug=fm.slug and target_fixture.mid=fm.match_id
   cross join lateral generate_series(1,target_fixture.goals)gs(n)
   cross join lateral(values(case when n<=target_fixture.home_goals then fm.home_team_id else fm.away_team_id end))fs(team_id)
   join _reviewed_existing_teams ft on ft.slug=r.slug and ft.team_id=fs.team_id
   join _reviewed_existing_players fp on fp.slug=ft.slug and fp.team_idx=ft.idx and fp.player_idx=3+(n%4)
   where fm.slug=r.slug and fm.is_target;
  if r.cid=497 then
   insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper,red_cards)
    select m.id,fp.player_id,m.home_team_id,false,0,0,0,false,1 from matches m join _reviewed_existing_players fp on fp.slug=r.slug and fp.team_idx=1 and fp.player_idx=17 where m.round_id=(select round_id from _reviewed_existing_rounds where slug=r.slug and rno=2) and m.id<>all(select mid from _reviewed_existing_targets where slug=r.slug) order by m.id limit 1;
  end if;
  if r.cid=979 then
   perform private_reviewed_existing_history.require(not exists(select 1 from rounds where id=35329 and competition_id<>979),'NPL archive target round ID collision');
   insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value
    select 97910000+n,'2025/26',n,current_date-400+n,clock_timestamp()-interval '180 days',r.cid from generate_series(1,24)n where n<>7;
   insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(35329,'2025/26',7,'2025-09-13',clock_timestamp()-interval '180 days',r.cid);
   with seq as(select n,((n/20)+1)::int round_no,((n%20)+1)::int game_no from generate_series(0,460)n),fixtures as(
    select s.n,rr.id round_id,((s.game_no+s.round_no-2)%20+1)::int home_idx,(((s.game_no+s.round_no-2)%20+10)%20+1)::int away_idx
    from seq s join rounds rr on rr.competition_id=r.cid and rr.season='2025/26' and rr.number=s.round_no
   )
   insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at,statistics_status)overriding system value
    select 9900000000+f.n,f.round_id,ht.team_id,at.team_id,0,0,current_date-400+(f.n%300), 'gbarchive'||lpad((f.n+1)::text,12,'0'), 'https://fixture.invalid/npl-archive/'||(f.n+1),clock_timestamp()-interval '200 days','available'
    from fixtures f join _reviewed_existing_teams ht on ht.slug=r.slug and ht.idx=f.home_idx join _reviewed_existing_teams at on at.slug=r.slug and at.idx=f.away_idx;
   insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at,source_phase,source_round)overriding system value
    select rt.mid,rt.rid,rt.home_id,rt.away_id,rt.home_goals,rt.away_goals,rt.played_on,rt.report_id,e->>'sourceUrl',clock_timestamp()-interval '200 days',null,null
    from _reviewed_existing_targets rt join private_historical_statistics.policies p on p.id=r.policy_id cross join lateral jsonb_array_elements(p.document->'entries')e
    where rt.slug=r.slug and rt.season='2025/26' and e->>'sourceMatchId'=rt.source_match_id;
   insert into _reviewed_existing_matches values(r.slug,999,(select rid from _reviewed_existing_targets where mid=561922),561922,10862,10847,true);
   insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
    select m.id,fp.player_id,msides.team_id,true,0,90,90,fp.player_idx=1
    from matches m join rounds rr on rr.id=m.round_id cross join lateral(values(m.home_team_id),(m.away_team_id))msides(team_id)
    join _reviewed_existing_teams ft on ft.slug=r.slug and ft.team_id=msides.team_id
    join _reviewed_existing_players fp on fp.slug=r.slug and fp.team_idx=ft.idx and fp.player_idx between 1 and 11
    where rr.competition_id=r.cid and rr.season='2025/26' and m.source_url like 'https://fixture.invalid/npl-archive/%';
   insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
    select 561922,fp.player_id,teamside.team_id,true,0,90,90,fp.player_idx=1 from (values(10862),(10847))teamside(team_id) join _reviewed_existing_teams ft on ft.slug=r.slug and ft.team_id=teamside.team_id join _reviewed_existing_players fp on fp.slug=r.slug and fp.team_idx=ft.idx and fp.player_idx between 1 and 11;
   insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
    select 561922,fp.player_id,ft.team_id,false,60,90,30,false from _reviewed_existing_teams ft join _reviewed_existing_players fp on fp.slug=ft.slug and fp.team_idx=ft.idx where ft.slug=r.slug and ft.team_id=10862 and fp.player_idx=12;
   insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
    select 561922,fp.player_id,ft.team_id,false,60,90,30,false from _reviewed_existing_teams ft join _reviewed_existing_players fp on fp.slug=ft.slug and fp.team_idx=ft.idx where ft.slug=r.slug and ft.team_id=10847 and fp.player_idx in(12,13,14,15);
   insert into goals(id,match_id,scorer_id,team_id,minute,is_own_goal,is_penalty)overriding system value values
    (652686,561922,null,10862,75,false,false),(652688,561922,null,10847,33,false,false);
   insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)
    select 561922,fp.player_id,ft.team_id,case when n=1 then 15 when n=2 then 45 else 60 end,false from generate_series(1,3)n join _reviewed_existing_teams ft on ft.slug=r.slug and ft.team_id=case when n=1 then 10862 else 10847 end join _reviewed_existing_players fp on fp.slug=ft.slug and fp.team_idx=ft.idx and fp.player_idx=3+(n%4);
  end if;
  if r.cid=984 then
   select match_id,home_team_id into anon_match_id,anon_team_id from _reviewed_existing_matches where slug=r.slug and seq=2;
   update matches set home_goals=1,away_goals=0 where id=anon_match_id;
   select player_id into vplayer from _reviewed_existing_players where slug=r.slug and team_idx=(select idx from _reviewed_existing_teams where slug=r.slug and team_id=anon_team_id) and player_idx=3;
   insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)values(anon_match_id,null,anon_team_id,37,false) returning id into anon_goal_id;
  end if;
 end loop;
 perform private_reviewed_existing_history.bind_ro_native_home_if_present();
end$$;

create function pg_temp.reviewed_existing_insert_foreign_match() returns trigger language plpgsql as $$
begin
 if old.imported_at is not null and new.imported_at is null and old.id in(561922,562344,509795,133334,576391,576399) then
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,statistics_status)overriding system value
   values(1000000000000+new.id,new.round_id,new.away_team_id,new.home_team_id,0,0,current_date+90,'available');
 end if;
 return new;
end$$;
create trigger reviewed_existing_insert_foreign_match after update of imported_at on public.matches for each row execute function pg_temp.reviewed_existing_insert_foreign_match();

do $$
declare r record;vslug text;main_sha text;prepared jsonb;applied jsonb;claim jsonb;price jsonb;preview jsonb;active_result jsonb;bad jsonb;team_owner uuid;team_row bigint;drift_player bigint;opening_match bigint;original_played date;boundary_clock timestamptz;boundary_utc_date date;anon_goal_id bigint;anon_match_id bigint;anon_team_id bigint;foreign_scorer bigint;
begin
 if to_regprocedure('public.begin_reviewed_existing_prices(text,text,text)') is null then raise exception 'missing one-use price claim RPC';end if;
 if has_function_privilege('service_role','public.begin_reviewed_existing_prices(text,text,text)','EXECUTE') is not true or has_function_privilege('anon','public.begin_reviewed_existing_prices(text,text,text)','EXECUTE') or has_function_privilege('authenticated','public.begin_reviewed_existing_prices(text,text,text)','EXECUTE') then raise exception 'price claim service-only ACL failed';end if;
 team_owner:=gen_random_uuid();insert into auth.users(id,email)values(team_owner,'reviewed-existing-sql-fixture@example.invalid');
 for vslug in select rt.slug from _reviewed_existing_routes rt order by rt.cid loop
  select * into r from _reviewed_existing_routes rt where rt.slug=vslug;
  main_sha:=case when r.cid=979 then 'ac1cc5a2dd363088a3e7f309cba67214ddcc5187' else repeat('a',40) end;
  if r.cid=497 then
   boundary_clock:=((clock_timestamp() at time zone 'UTC')::date+time '22:30') at time zone 'UTC';boundary_utc_date:=(boundary_clock at time zone 'UTC')::date;
   select id,played_on into opening_match,original_played from matches where round_id=(select round_id from _reviewed_existing_rounds where slug=r.slug and rno=r.round_count+1) order by id limit 1;
   update matches set played_on=null where id=opening_match;
   begin perform private_reviewed_existing_history.opening(r.slug,clock_timestamp());raise exception 'null-dated opening fixture unexpectedly passed';exception when others then if sqlerrm='null-dated opening fixture unexpectedly passed'then raise;elsif sqlerrm<>'REVIEWED_EXISTING: first future round must remain future, unlocked and empty'then raise;end if;end;
   update matches set played_on=original_played where id=opening_match;
   update matches set played_on=boundary_utc_date where id=opening_match;
   begin perform private_reviewed_existing_history.opening(r.slug,boundary_clock);raise exception 'UTC/Ljubljana midnight boundary accepted prior local-day kickoff';exception when others then if sqlerrm='UTC/Ljubljana midnight boundary accepted prior local-day kickoff'then raise;elsif sqlerrm<>'REVIEWED_EXISTING: first future round must remain future, unlocked and empty'then raise;end if;end;
   update matches set played_on=original_played where id=opening_match;
  end if;
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,statistics_status)overriding system value
   values(r.cid::bigint*10000000+r.current_reports+200,(select rr.round_id from _reviewed_existing_rounds rr where rr.slug=r.slug and rr.rno=1),
     (select team_id from _reviewed_existing_teams where slug=r.slug and idx=4),(select team_id from _reviewed_existing_teams where slug=r.slug and idx=3),0,0,current_date-1,'available') returning id into team_row;
  begin perform public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);raise exception 'past unreported fixture unexpectedly passed preflight';exception when others then if sqlerrm='past unreported fixture unexpectedly passed preflight'then raise;end if;end;
  delete from matches where id=team_row;
  begin perform public.prepare_reviewed_existing_cleanup(r.slug,'bad',r.policy_sha);raise exception 'wrong main SHA accepted';exception when others then if sqlerrm='wrong main SHA accepted'then raise;end if;end;
  if r.cid=979 then
   if (select count(*) from goals where id in(652686,652688) and match_id=561922 and scorer_id is null and is_penalty=false and is_own_goal=false and ((id=652686 and team_id=10862 and minute=75) or (id=652688 and team_id=10847 and minute=33)))<>2 then raise exception 'fixture must preserve the two exact NPL anonymous goals';end if;
   update goals set minute=76 where id=652686;
   begin perform public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);raise exception 'unapproved unattributed NPL goal accepted';exception when others then if sqlerrm='unapproved unattributed NPL goal accepted'then raise;elsif sqlerrm<>'REVIEWED_EXISTING: no foreign scorer/team relation on exact cleanup target'then raise;end if;end;
   update goals set minute=75 where id=652686;
   update goals set minute=null where id=652686;
   begin perform public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);raise exception 'null-minute unattributed NPL goal accepted';exception when others then if sqlerrm='null-minute unattributed NPL goal accepted'then raise;elsif sqlerrm<>'REVIEWED_EXISTING: no foreign scorer/team relation on exact cleanup target'then raise;end if;end;
   update goals set minute=75 where id=652686;
  end if;
  if r.cid=497 then
   if (select name from teams where id=3016)<>'Club Sportiv USV-CSM Iași 2020' then raise exception 'RO native club name must match retained native facts';end if;
   update matches set source_url=source_url||'?unapproved' where id=133334;
   begin perform public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);raise exception 'unknown RO target URI accepted';exception when others then if sqlerrm='unknown RO target URI accepted'then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required'then raise;end if;end;
   update matches set source_url='https://hailafotbal.ro/rezultate/national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1/etapa-1/club-sportiv-usv-csm-iasi-2020-kse-targu-secuiesc' where id=133334;
  end if;
  if r.cid=984 then
   select id,match_id,team_id into anon_goal_id,anon_match_id,anon_team_id from goals where match_id=(select match_id from _reviewed_existing_matches where slug=r.slug and seq=2) and scorer_id is null;
   if anon_goal_id is null or not private_reviewed_existing_history.active_goal_identity_valid(r.cid) then raise exception 'known-team/minute anonymous SFL goal should remain valid';end if;
   select player_id into foreign_scorer from _reviewed_existing_players where slug=r.slug and team_idx=(select idx from _reviewed_existing_teams where slug=r.slug and team_id<>anon_team_id order by idx limit 1) and player_idx=3;
   update goals set scorer_id=foreign_scorer where id=anon_goal_id;
   if private_reviewed_existing_history.active_goal_identity_valid(r.cid) then raise exception 'foreign nonnull SFL scorer unexpectedly valid';end if;
   update goals set scorer_id=null where id=anon_goal_id;
  end if;
  if r.cid=499 then
   -- The exception never makes any other played report or future header admissible.
   begin update matches set home_goals=3 where id=202541;perform public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);raise exception 'Alba score drift passed';exception when others then if sqlerrm='Alba score drift passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
   begin update matches set source_url=source_url||'?other' where id=202541;perform public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);raise exception 'Alba source URL drift passed';exception when others then if sqlerrm='Alba source URL drift passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
   begin delete from appearances where match_id=202541 and player_id=(select min(player_id) from appearances where match_id=202541);perform public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);raise exception 'Alba individual row drift passed';exception when others then if sqlerrm='Alba individual row drift passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
   begin update private_historical_statistics.policies set document=document||'{"drift":true}'::jsonb where id=r.policy_id;raise exception 'Alba policy mutation passed';exception when others then if sqlerrm='Alba policy mutation passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: immutable approved policy' then raise;end if;end;
   begin update private_historical_statistics.source_club_bindings set canonical_names=array['Foreign'] where provider='hlf' and source_club_id='d0a838cf-6c6f-4b82-9cd0-c6d8cead047a';raise exception 'Alba club mutation passed';exception when others then if sqlerrm='Alba club mutation passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: immutable reviewed source-club binding' then raise;end if;end;
  end if;
  prepared:=public.prepare_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha);
  if r.cid=497 and ((select count(*) from private_historical_statistics.source_club_bindings where provider='hlf' and source_club_id='a91ef983-185f-4a35-b5cc-6421c820bd97' and bound_team_id=3016)<>1 or not exists(select 1 from private_reviewed_existing_history.native_binding_audits where audit_id='ro-home-club-binding-v1' and before_binding->>'bound_team_id' is null and after_binding->>'bound_team_id'='3016')) then raise exception 'RO native binding lacks immutable before/after audit';end if;
  if prepared->>'beforeSha256' is null or prepared->'targetMatchIds' is distinct from (select jsonb_agg(mid order by mid) from _reviewed_existing_targets where slug=r.slug) or prepared->>'firstFantasyPlayedOn' is null then raise exception 'prepare response lacks full beforeimage/opening binding';end if;
  begin perform public.apply_reviewed_existing_cleanup(r.slug,main_sha,repeat('b',64),prepared->>'beforeSha256',prepared->>'beforeImageText');raise exception 'wrong policy SHA accepted';exception when others then if sqlerrm='wrong policy SHA accepted'then raise;end if;end;
  if r.cid=497 then
   begin perform public.apply_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha,prepared->>'beforeSha256',prepared->>'beforeImageText');raise exception 'foreign match trigger was not detected';exception when others then if sqlerrm='foreign match trigger was not detected'then raise;elsif sqlerrm<>'REVIEWED_EXISTING: unrelated match collection changed during cleanup'then raise;end if;end;
   execute 'drop trigger reviewed_existing_insert_foreign_match on public.matches';
  end if;
  applied:=public.apply_reviewed_existing_cleanup(r.slug,main_sha,r.policy_sha,prepared->>'beforeSha256',prepared->>'beforeImageText');
  if applied->>'removedAppearances'<>(select sum(appearances)::text from _reviewed_existing_targets where slug=r.slug) or applied->>'removedGoals'<>(select sum(goals)::text from _reviewed_existing_targets where slug=r.slug) or applied->>'unavailableMatches'<>(select count(*)::text from _reviewed_existing_targets where slug=r.slug) then raise exception 'cleanup did not remove the exact approved report rows';end if;
  if exists(select 1 from appearances where match_id in(select mid from _reviewed_existing_targets where slug=r.slug)) or exists(select 1 from goals where match_id in(select mid from _reviewed_existing_targets where slug=r.slug)) then raise exception 'individual rows remain on unavailable target';end if;
  if exists(select 1 from _reviewed_existing_targets tr join matches m on m.id=tr.mid where tr.slug=r.slug and (m.home_goals is distinct from tr.home_goals or m.away_goals is distinct from tr.away_goals)) then raise exception 'cleanup changed an approved report official score';end if;
  if exists(select 1 from _reviewed_existing_targets tr left join matches m on m.id=tr.mid where tr.slug=r.slug and (m.id is null or m.imported_at is not null or m.statistics_status<>'unavailable_historical')) then raise exception 'cleanup did not install every approved unavailable marker';end if;
  if exists(select 1 from matches m join rounds rr on rr.id=m.round_id where rr.competition_id=r.cid and m.statistics_status='unavailable_historical' and not exists(select 1 from _reviewed_existing_targets tr where tr.slug=r.slug and tr.mid=m.id)) then raise exception 'cleanup installed an unapproved unavailable marker';end if;
  if (select count(*) from matches m join rounds rr on rr.id=m.round_id where rr.competition_id=r.cid and rr.season='2026/27' and m.imported_at is not null and m.statistics_status='available')<>(case r.cid when 979 then 149 when 984 then 131 when 497 then 53 when 499 then 29 when 998 then 47 end) then raise exception 'post-cleanup current report inventory is not exact';end if;
  if r.cid=979 and (select count(*) from matches m join rounds rr on rr.id=m.round_id where rr.competition_id=979 and rr.season='2025/26' and m.imported_at is not null and m.statistics_status='available')<>461 then raise exception 'post-cleanup NPL archive must retain exactly 461 reports';end if;
  if public.get_reviewed_existing_cleanup_receipt(r.slug)->'cleanup'->>'beforeSha256' is distinct from prepared->>'beforeSha256' then raise exception 'cleanup receipt readback differs';end if;
  if r.cid=979 then
   insert into statistika_igralcev(player_id,competition_id,season,matches,minutes,goals,own_goals,yellow_cards,red_cards,clean_sheets,points,assists)
    values(401885,979,'2025/26',2,13,0,0,0,0,0,2,0),(401972,979,'2025/26',3,45,0,0,0,0,0,3,0),(402068,979,'2025/26',4,191,0,0,0,0,0,5,0);
  end if;
  claim:=public.begin_reviewed_existing_prices(r.slug,main_sha,r.policy_sha);
  if claim->>'footballStateSha256' is null or public.get_reviewed_existing_cleanup_receipt(r.slug)->'priceClaim'->>'claimedAt' is null then raise exception 'price claim receipt missing';end if;
  begin perform public.begin_reviewed_existing_prices(r.slug,main_sha,r.policy_sha);raise exception 'second price claim unexpectedly accepted';exception when others then if sqlerrm='second price claim unexpectedly accepted'then raise;end if;end;
  if r.cid=979 then
   perform set_config('slff.test.expected_cleanup',(select before_sha from private_reviewed_existing_history.cleanup_receipts where slug=r.slug),true);
   perform set_config('slff.test.expected_state',(select football_state_sha from private_reviewed_existing_history.price_attempts where slug=r.slug),true);
   perform set_config('slff.test.expected_prices',private_reviewed_existing_history.price_sha(r.slug),true);
   begin
    perform set_config('slff.test.expected_cleanup',repeat('0',64),true);
    perform pg_temp.run_npl_noop_recovery();
    raise exception 'claim drift unexpectedly passed NPL recovery';
   exception when others then
    if sqlerrm='claim drift unexpectedly passed NPL recovery' then raise; end if;
    if sqlerrm<>'REVIEWED_EXISTING: original failed-run cleanup and one-use claim must match exactly' then raise; end if;
   end;
   perform set_config('slff.test.expected_cleanup',(select before_sha from private_reviewed_existing_history.cleanup_receipts where slug=r.slug),true);
   begin
    update players set value=value+1 where id=(select min(id) from players where competition_id=979);
    perform pg_temp.run_npl_noop_recovery();
    raise exception 'price-vector drift unexpectedly passed NPL recovery';
   exception when others then
    if sqlerrm='price-vector drift unexpectedly passed NPL recovery' then raise; end if;
    if sqlerrm<>'REVIEWED_EXISTING: current football state or full 1,021-player price vector drifted' then raise; end if;
   end;
   begin
    insert into position_votes(player_id,voter_id,position) select min(id),team_owner,'MID' from players where competition_id=979;
    perform pg_temp.run_npl_noop_recovery();
    raise exception 'post-claim user activity unexpectedly passed NPL recovery';
   exception when others then
    if sqlerrm='post-claim user activity unexpectedly passed NPL recovery' then raise; end if;
    if sqlerrm<>'REVIEWED_EXISTING: no post-claim user activity required' then raise; end if;
   end;
   perform pg_temp.run_npl_noop_recovery();
   price:=public.get_reviewed_existing_cleanup_receipt(r.slug)->'prices';
   perform pg_temp.run_npl_noop_recovery();
   if (select count(*) from private_reviewed_existing_history.price_receipts where slug=r.slug)<>1 or private_reviewed_existing_history.price_sha(r.slug)<>price->>'priceSha256' then raise exception 'NPL recovery must record once without changing prices'; end if;
  else
   update players set position='MID',position_source='admin' where competition_id=r.cid and id=(select min(id) from players where competition_id=r.cid and position='DEF');
   update players set value=case when id%3=0 then 9 else 4.5 end,value_start=case when id%3=0 then 9 else 4.5 end where competition_id=r.cid;
   price:=public.record_reviewed_existing_prices(r.slug,main_sha,r.policy_sha);
  end if;
  if price->>'priceSha256' is null or price->>'footballStateSha256' is distinct from claim->>'footballStateSha256' then raise exception 'price receipt is not pinned to the claimed state/vector';end if;
  preview:=public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,null,false);
  if (preview->>'ready')::boolean is not true or preview->>'previewSha256' is null or preview->>'priceSha256' is distinct from price->>'priceSha256' then raise exception 'full release preview did not validate';end if;
  update players set value=8 where competition_id=r.cid and id=(select min(id) from players where competition_id=r.cid);
  bad:=public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,preview->>'previewSha256',false);
  if (bad->>'ready')::boolean is not false then raise exception 'stale full price vector preview unexpectedly ready';end if;
  update players set value=coalesce(value_start,4.5) where competition_id=r.cid;
  select min(id) into drift_player from players where competition_id=r.cid and position_source='admin';
  update players set position='FWD' where id=drift_player;
  bad:=public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,preview->>'previewSha256',false);
  if (bad->>'ready')::boolean is not false then raise exception 'post-price position drift unexpectedly ready';end if;
  update players set position='MID' where id=drift_player;
  begin update players set value_locked=not value_locked where competition_id=r.cid and id=(select min(id) from players where competition_id=r.cid);bad:=public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,preview->>'previewSha256',false);if (bad->>'ready')::boolean is not false then raise exception 'price-lock drift unexpectedly ready';end if;exception when others then if sqlerrm='price-lock drift unexpectedly ready'then raise;end if;end;
  update players set value_locked=false where competition_id=r.cid;
  begin perform public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,null,true);raise exception 'activation without reviewed preview accepted';exception when others then if sqlerrm='activation without reviewed preview accepted'then raise;end if;end;
  begin perform public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,'',true);raise exception 'activation with empty preview accepted';exception when others then if sqlerrm='activation with empty preview accepted'then raise;end if;end;
  begin perform public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,repeat('0',64),true);raise exception 'activation with wrong preview accepted';exception when others then if sqlerrm='activation with wrong preview accepted'then raise;end if;end;
  begin insert into position_votes(player_id,voter_id,position)select min(id),team_owner,'MID' from players where competition_id=r.cid;perform public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,preview->>'previewSha256',true);raise exception 'activation with newly created position vote accepted';exception when others then if sqlerrm='activation with newly created position vote accepted'then raise;end if;end;
  insert into fantasy_teams(owner_id,name,competition_id)values(team_owner,'Reviewed SQL fixture team',r.cid)returning id into team_row;
  begin perform public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,preview->>'previewSha256',true);raise exception 'activation with newly created fantasy team accepted';exception when others then if sqlerrm='activation with newly created fantasy team accepted'then raise;end if;end;
  delete from fantasy_teams where id=team_row;
  active_result:=public.check_reviewed_existing_release(r.slug,main_sha,r.policy_sha,preview->>'previewSha256',true);
  if (active_result->>'active')::boolean is not true then raise exception 'guarded transactional activation failed';end if;
 end loop;
 delete from profiles where id=team_owner;
 delete from auth.users where id=team_owner;
end$$;
rollback;
