begin;
set local lock_timeout='30s';
set local statement_timeout='240s';
create temporary table _ro_md_routes(slug text primary key,cid bigint,provider text,code text,country text,policy_id text,policy_sha text,current_reports int,team_count int,games_per_round int,round_count int) on commit drop;
insert into _ro_md_routes values
 ('ro-ab-l4-s2',501,'hlf','judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2','RO','ro-ab-l4-s2-historical-unavailable-2026-10-23-v1','0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b',23,9,4,6),
 ('md-liga-2',1107,'fmf','liga-2-1782306996/877','MD','md-liga-2-historical-unavailable-2026-10-23-v1','95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e',95,15,7,30);
create temporary table _ro_md_targets on commit drop as
 select * from private_reviewed_existing_history.report_targets('ro-ab-l4-s2') where false;
insert into _ro_md_targets select * from private_reviewed_existing_history.report_targets('ro-ab-l4-s2');
insert into _ro_md_targets select * from private_reviewed_existing_history.report_targets('md-liga-2');
  update competitions c set slug='fixture-rename-'||c.id||'-'||c.slug,name='fixture-rename-'||c.id,short_name='fixture-'||c.id
   where c.slug in('ro-ab-l4-s2','md-liga-2') and c.id not in(501,1107);
create temporary table _ro_md_teams(slug text,idx int,team_id bigint,primary key(slug,idx)) on commit drop;
create temporary table _ro_md_players(slug text,team_idx int,player_idx int,player_id bigint,primary key(slug,team_idx,player_idx)) on commit drop;
create temporary table _ro_md_rounds(slug text,rno int,round_id bigint,primary key(slug,rno)) on commit drop;
create temporary table _ro_md_matches(slug text,seq int,round_id bigint,match_id bigint,home_team_id bigint,away_team_id bigint,primary key(slug,seq)) on commit drop;
  insert into competitions(id,slug,name,short_name,country_id,source,source_league_code,source_policy,active,sezona_koledarska,prvi_fantasy_krog)
   overriding system value
   select r.cid,r.slug,r.slug,r.slug,(select id from countries where code=r.country),r.provider,r.code,null,false,false,1
   from _ro_md_routes r where not exists(select 1 from competitions c where c.id=r.cid);

do $$
declare r record;target record;tid bigint;rid bigint;mid bigint;round_no int;slot_no int;fixture_no int;home_idx int;away_idx int;source_id text;report_id text;day date;url text;seq int;main_sha text:=repeat('a',40);prepared jsonb;applied jsonb;claim jsonb;prices jsonb;preview jsonb;activation jsonb;negative jsonb;team record;player record;price_value numeric;
begin
 for r in select * from _ro_md_routes order by cid loop
  perform private_reviewed_existing_history.require(not exists(select 1 from rounds where competition_id=r.cid) and not exists(select 1 from players where competition_id=r.cid) and not exists(select 1 from fantasy_teams where competition_id=r.cid),'fixture competition must have no prior native user/history rows');
  update competitions set slug=r.slug,name=r.slug,short_name=r.slug,country_id=(select id from countries where code=r.country),source=r.provider,source_league_code=r.code,source_policy=null,active=false,sezona_koledarska=false,prvi_fantasy_krog=1 where id=r.cid;
  for slot_no in 1..r.team_count loop
   select case when slot_no=1 then case r.cid when 501 then 5068 else 10842 end
               when slot_no=2 then case r.cid when 501 then 5069 else 10836 end
               when slot_no=3 and r.cid=1107 then 10833
               else r.cid::bigint*1000000+slot_no end into tid;
   if exists(select 1 from teams where id=tid) then raise exception 'synthetic RO/MD test team ID collision: %',tid;end if;
   if slot_no=1 then
    select canonical_names[1] into url from private_historical_statistics.source_club_bindings where provider=r.provider and source_club_id=(select e->>'homeSourceClubId' from _ro_md_targets t join private_historical_statistics.policies p on p.id=r.policy_id cross join lateral jsonb_array_elements(p.document->'entries')e where t.slug=r.slug and (e->>'sourceMatchId')=t.source_match_id limit 1);
   elsif slot_no=2 then
    select canonical_names[1] into url from private_historical_statistics.source_club_bindings where provider=r.provider and source_club_id=(select e->>'awaySourceClubId' from _ro_md_targets t join private_historical_statistics.policies p on p.id=r.policy_id cross join lateral jsonb_array_elements(p.document->'entries')e where t.slug=r.slug and (e->>'sourceMatchId')=t.source_match_id limit 1);
   elsif slot_no=3 and r.cid=1107 then url:='CMF Cahul';
   else url:='REX-'||r.slug||'-TEAM-'||slot_no;end if;
   insert into teams(id,name,short_name,country_id)overriding system value values(tid,url,r.slug||'-'||slot_no,(select id from countries where code=r.country));
   insert into _ro_md_teams values(r.slug,slot_no,tid);
  end loop;
  for team in select * from _ro_md_teams where slug=r.slug order by idx loop
   for slot_no in 1..17 loop
    insert into players(first_name,last_name,full_name,team_id,competition_id,position,position_source,active,value,value_start)
    values('Fixture','Player '||team.idx||'-'||slot_no,'REX-'||r.slug||'-P-'||team.idx||'-'||slot_no,team.team_id,r.cid,
      case when slot_no in(1,12) then 'GK' when slot_no between 2 and 5 or slot_no=13 then 'DEF' when slot_no between 6 and 9 or slot_no=14 then 'MID' else 'FWD' end,
      'zapisnik',true,6,6) returning id into tid;
    insert into _ro_md_players values(r.slug,team.idx,slot_no,tid);
   end loop;
  end loop;
  for round_no in 1..r.round_count loop
   select * into target from _ro_md_targets where slug=r.slug and rno=round_no limit 1;
   if target.rid is not null then
    rid:=target.rid;day:=case when r.cid=501 then target.played_on-1 else target.played_on end;
   else rid:=r.cid::bigint*100000+round_no;day:=current_date-100+round_no*3;end if;
   if exists(select 1 from rounds where id=rid or (competition_id=r.cid and season='2026/27' and number=round_no)) then raise exception 'RO/MD round ID or number collision';end if;
   insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(rid,'2026/27',round_no,day,clock_timestamp()-interval '1 day',r.cid);
   insert into _ro_md_rounds values(r.slug,round_no,rid);
  end loop;
  rid:=r.cid::bigint*100000+r.round_count+1;
  insert into rounds(id,season,number,played_on,deadline_at,competition_id)overriding system value values(rid,'2026/27',r.round_count+1,current_date+10,clock_timestamp()+interval '2 days',r.cid);
  insert into _ro_md_rounds values(r.slug,r.round_count+1,rid);
  insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,statistics_status)
   overriding system value
   select r.cid::bigint*1000000000000+900000,rid,h.team_id,a.team_id,0,0,current_date+10,'available'
   from _ro_md_teams h join _ro_md_teams a on a.slug=h.slug and a.idx=2
   where h.slug=r.slug and h.idx=1;

  for seq in 1..r.current_reports loop
   if r.cid=501 then
    if seq<=3 then round_no:=1;fixture_no:=seq+1;else round_no:=2+((seq-4)/4);fixture_no:=((seq-4)%4)+1;end if;
    home_idx:=((fixture_no+round_no-2)%8)+1;away_idx:=((home_idx-1+4)%8)+1;
   else
    slot_no:=(seq-1)/7;fixture_no:=((seq-1)%7)+1;
    round_no:=1+slot_no+case when slot_no>=3 then 1 else 0 end+case when slot_no>=10 then 1 else 0 end;
    home_idx:=((fixture_no+round_no-2)%14)+1;away_idx:=((home_idx-1+7)%14)+1;
   end if;
   select team_id into tid from _ro_md_teams where slug=r.slug and idx=home_idx;
   select team_id into mid from _ro_md_teams where slug=r.slug and idx=away_idx;
   select round_id into rid from _ro_md_rounds where slug=r.slug and rno=round_no;
   day:=current_date-100+round_no*3;
   source_id:=lpad(seq::text,12,'0');report_id:=case when r.provider='fmf' then 'mdfixture'||source_id else '00000000-0000-0000-0000-'||source_id end;
   url:='https://fixture.invalid/'||r.slug||'/'||seq;
   insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at,statistics_status,source_phase,source_round)overriding system value
   values(r.cid::bigint*1000000000000+seq,rid,tid,mid,0,0,day,report_id,url,clock_timestamp()-interval '1 day','available',null,round_no);
   insert into _ro_md_matches values(r.slug,seq,rid,r.cid::bigint*1000000000000+seq,tid,mid);
  end loop;

  for target in select * from _ro_md_targets t where t.slug=r.slug order by t.mid loop
   select target_row.initialSourceUrl into url from (select private_reviewed_existing_history.target_admission(r.slug,target.source_match_id) as info) q cross join lateral (select q.info->>'initialSourceUrl' as initialSourceUrl) target_row;
   insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at,statistics_status,source_phase,source_round)overriding system value
   values(target.mid,target.rid,target.home_id,target.away_id,case r.cid when 501 then 3 else 0 end,case r.cid when 501 then 0 else 0 end,target.played_on,
     case when r.cid=501 then target.report_id else null end,url,null,'available',null,null);
  end loop;

  perform private_reviewed_existing_history.require(not exists(
   select m.match_id,p.player_id from _ro_md_matches m cross join lateral(values(m.home_team_id),(m.away_team_id))s(team_id)
   join _ro_md_teams t on t.slug=m.slug and t.team_id=s.team_id
   join _ro_md_players p on p.slug=t.slug and p.team_idx=t.idx and p.player_idx between 1 and 11
   group by m.match_id,p.player_id having count(*)>1),'synthetic imported fixture query must not duplicate player appearances');
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
  select m.match_id,p.player_id,s.team_id,true,0,90,90,p.player_idx=1
   from _ro_md_matches m cross join lateral(values(m.home_team_id),(m.away_team_id))s(team_id)
   join _ro_md_teams t on t.slug=m.slug and t.team_id=s.team_id
   join _ro_md_players p on p.slug=t.slug and p.team_idx=t.idx and p.player_idx between 1 and 11
   on conflict(match_id,player_id) do nothing;
  update appearances a set minute_off=20,minutes_played=20
   from _ro_md_matches m join _ro_md_teams t on t.slug=m.slug and t.team_id=m.home_team_id
   join _ro_md_players p on p.slug=t.slug and p.team_idx=t.idx and p.player_idx=11
   where m.slug=r.slug and m.seq=1 and a.match_id=m.match_id and a.player_id=p.player_id;
  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
   select m.match_id,p.player_id,t.team_id,false,20,90,70,false
   from _ro_md_matches m join _ro_md_teams t on t.slug=m.slug and t.team_id=m.home_team_id
   join _ro_md_players p on p.slug=t.slug and p.team_idx=t.idx and p.player_idx=15
   where m.slug=r.slug and m.seq=1;

  insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper)
   select 202353,p.player_id,side.team_id,true,0,90,90,p.player_idx=1
   from (values(5068),(5069))side(team_id) join _ro_md_teams t on t.slug=r.slug and t.team_id=side.team_id
   join _ro_md_players p on p.slug=t.slug and p.team_idx=t.idx and p.player_idx between 1 and case when side.team_id=5068 then 11 else 2 end
   where r.cid=501;
  insert into goals(match_id,scorer_id,team_id,minute,is_own_goal)
   select 202353,p.player_id,5068,15*n,false from generate_series(1,3)n join _ro_md_players p on p.slug='ro-ab-l4-s2' and p.team_idx=1 and p.player_idx=n+2 where r.cid=501;
  if r.cid=501 then perform private_reviewed_existing_history.require(private_reviewed_existing_history.is_exact_ro_alba_partial(501,r.policy_id,r.policy_sha,'8b7af269-2420-4534-9af2-f3cd51852f15',(select m from matches m where id=202353)),'exact RO501 partial helper rejected fixture');
  else
   perform private_reviewed_existing_history.require(private_reviewed_existing_history.is_exact_md_schedule_placeholder(1107,r.policy_id,r.policy_sha,'50422',(select m from matches m where id=560748)) and private_reviewed_existing_history.is_exact_md_schedule_placeholder(1107,r.policy_id,r.policy_sha,'50481',(select m from matches m where id=560803)),'exact MD schedule helper rejected fixture');
  end if;
 end loop;

 for r in select * from _ro_md_routes order by cid loop
  perform private_reviewed_existing_history.require((select count(*) from appearances a join matches m on m.id=a.match_id join rounds rr on rr.id=m.round_id where rr.competition_id=r.cid and m.imported_at is not null)=r.current_reports*22+1,'fixture imported reports must have 22 starters plus one valid bench entry');
  if r.cid=501 then
   begin update matches set source_url=source_url||'?unapproved' where id=202353;perform public.prepare_reviewed_existing_cleanup(r.slug,repeat('a',40),r.policy_sha);raise exception 'RO detail URL drift passed';exception when others then if sqlerrm='RO detail URL drift passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
   update matches set source_url='https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2/etapa-1/recolta-craciunel-cso-ariesul-apuseni-baia-de-aries' where id=202353;
  else
   begin update matches set home_goals=1 where id=560748;perform public.prepare_reviewed_existing_cleanup(r.slug,repeat('a',40),r.policy_sha);raise exception 'MD non-placeholder score passed';exception when others then if sqlerrm='MD non-placeholder score passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
   update matches set home_goals=0 where id=560748;
  end if;
  begin perform public.prepare_reviewed_existing_cleanup(r.slug,'bad',r.policy_sha);raise exception 'bad main SHA passed';exception when others then if sqlerrm='bad main SHA passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: READ COMMITTED and exact main SHA required' then raise;end if;end;
  begin perform public.prepare_reviewed_existing_cleanup(r.slug,repeat('a',40),'wrong-policy');raise exception 'wrong policy SHA passed';exception when others then if sqlerrm='wrong policy SHA passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact canonical policy SHA required' then raise;end if;end;
  prepared:=public.prepare_reviewed_existing_cleanup(r.slug,repeat('a',40),r.policy_sha);
  perform private_reviewed_existing_history.require(prepared->>'beforeSha256' is not null and prepared->'targetMatchIds'=(select jsonb_agg(t.mid order by t.mid) from _ro_md_targets t where t.slug=r.slug),'preflight did not bind exact approved targets');
  begin
   update matches set source_url=source_url||'?after-prepare' where id=(select t.mid from _ro_md_targets t where t.slug=r.slug order by t.mid limit 1);
   perform public.apply_reviewed_existing_cleanup(r.slug,repeat('a',40),r.policy_sha,prepared->>'beforeSha256',prepared->>'beforeImageText');
   raise exception 'post-prepare target drift passed';
  exception when others then if sqlerrm='post-prepare target drift passed' then raise;elsif sqlerrm<>'REVIEWED_EXISTING: exact approved existing report header and individual row counts required' then raise;end if;end;
  perform private_reviewed_existing_history.require(not exists(select 1 from private_reviewed_existing_history.cleanup_receipts where slug=r.slug),'preflight drift created a cleanup receipt');
  applied:=public.apply_reviewed_existing_cleanup(r.slug,repeat('a',40),r.policy_sha,prepared->>'beforeSha256',prepared->>'beforeImageText');
  perform private_reviewed_existing_history.require(applied->>'unavailableMatches'=(select count(*)::text from _ro_md_targets where slug=r.slug) and applied->>'removedAppearances'=(select sum(appearances)::text from _ro_md_targets where slug=r.slug) and applied->>'removedGoals'=(select sum(goals)::text from _ro_md_targets where slug=r.slug),'cleanup receipt row counts differ from fixed target set');
  perform private_reviewed_existing_history.require(not exists(select 1 from _ro_md_targets t join matches m on m.id=t.mid where t.slug=r.slug and (m.home_goals is distinct from t.home_goals or m.away_goals is distinct from t.away_goals or m.imported_at is not null or m.statistics_status<>'unavailable_historical')),'cleanup did not preserve official target scores and mark all targets');
  perform private_reviewed_existing_history.require(not exists(select 1 from appearances a where a.match_id in(select t.mid from _ro_md_targets t where t.slug=r.slug)) and not exists(select 1 from goals g where g.match_id in(select t.mid from _ro_md_targets t where t.slug=r.slug)),'approved unavailable target still has individual rows');
  perform private_reviewed_existing_history.require((select count(*) from private_historical_statistics.markers mk where mk.competition_id=r.cid)=(select count(*) from _ro_md_targets t where t.slug=r.slug) and (select count(*) from matches m where m.id in(select t.mid from _ro_md_targets t where t.slug=r.slug))=(select count(*) from _ro_md_targets t where t.slug=r.slug),'same native target IDs and exact marker set must remain after cleanup');
  claim:=public.begin_reviewed_existing_prices(r.slug,repeat('a',40),r.policy_sha);
  perform private_reviewed_existing_history.require(claim->>'footballStateSha256' is not null,'missing one-use price claim');
  update players set value=case when id%7=0 then 9 else 6 end,value_start=case when id%7=0 then 9 else 6 end where competition_id=r.cid;
  prices:=public.record_reviewed_existing_prices(r.slug,repeat('a',40),r.policy_sha);
  preview:=public.check_reviewed_existing_release(r.slug,repeat('a',40),r.policy_sha,null,false);
  if coalesce((preview->>'ready')::boolean,false) is not true then raise exception 'RO/MD preview failed for %: %',r.slug,preview->>'reason';end if;
  activation:=public.check_reviewed_existing_release(r.slug,repeat('a',40),r.policy_sha,preview->>'previewSha256',true);
  perform private_reviewed_existing_history.require((activation->>'active')::boolean is true,'guarded rollback activation failed');
 end loop;
end$$;
rollback;
