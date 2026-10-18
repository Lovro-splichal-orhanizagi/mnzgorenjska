begin;
create function pg_temp.hs_assert(ok boolean, message text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'HISTORICAL TEST: %',message; end if;
end $$;
create function pg_temp.hs_refuses(command text, message text) returns void language plpgsql as $$ begin
 begin execute command; exception when others then
  if sqlerrm like 'HISTORICAL TEST:%' then raise; end if;
  if sqlerrm not like 'HISTORICAL_POLICY:%' then raise exception 'HISTORICAL TEST: wrong refusal for %: %',message,sqlerrm;end if;
  return;
 end;
 raise exception 'HISTORICAL TEST: expected refusal: %',message;
end $$;
select pg_temp.hs_assert(to_regprocedure('public.apply_historical_statistics_policy(bigint,text,text,jsonb)') is not null,'bigint policy primitive exists');
select pg_temp.hs_assert(not has_schema_privilege('service_role','private_historical_statistics','USAGE'),'service cannot write/read private registry directly');
select pg_temp.hs_assert(not has_function_privilege('anon','public.apply_historical_statistics_policy(bigint,text,text,jsonb)','EXECUTE'),'anon cannot install policy');
select pg_temp.hs_assert(not has_function_privilege('authenticated','public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)','EXECUTE'),'user cannot write unavailable marker');
select pg_temp.hs_assert(not has_function_privilege('service_role','private_historical_statistics.authorize_release(bigint,text,text,text)','EXECUTE'),'service cannot authorize generic activation directly');

do $$
declare c bigint; home_id bigint; away_id bigint; rid bigint; pid text; sha text; doc jsonb; e jsonb; f jsonb; h jsonb; result jsonb; mid bigint; normal_mid bigint; v_player_id bigint; n int;
begin
 select id,policy_sha256,document into pid,sha,doc from private_historical_statistics.policies where id='hr-hnlz-history-2026-10-18-v1';
 perform pg_temp.hs_assert(jsonb_array_length(doc->'entries')=3,'exact3 HNS entries');
 insert into competitions(slug,name,short_name,source,source_policy,date_only_deadline_policy,country_id,active,prvi_fantasy_krog)
 values('hr-prva-hnlz','Historical test','HR hist','hns','hr-hnlz-v1','midnight-local-v1',(select id from countries where code='HR'),false,9) returning id into c;
 insert into rounds(competition_id,season,number,played_on,deadline_at) values(c,sezona_lige(c),9,current_date+7,now()+interval '7 days');
 perform pg_temp.hs_refuses(format('select public.apply_historical_statistics_policy(%s,%L,%L,%L::jsonb)',c,pid,repeat('0',64),(doc->'entries')::text),'wrong policy hash');
 perform public.apply_historical_statistics_policy(c,pid,sha,doc->'entries');
 perform public.apply_historical_statistics_policy(c,pid,sha,doc->'entries');
 insert into teams(name,short_name,country_id) values('HISTORICAL HOME','HH',(select id from countries where code='HR')) returning id into home_id;
 insert into teams(name,short_name,country_id) values('HISTORICAL AWAY','HA',(select id from countries where code='HR')) returning id into away_id;
 for e in select value from jsonb_array_elements(doc->'entries') loop
  select id into rid from rounds where competition_id=c and season=doc->>'season' and number=(e->>'sourceRound')::int;
  if rid is null then insert into rounds(competition_id,season,number,played_on) values(c,doc->>'season',(e->>'sourceRound')::int,(e->>'playedOn')::date) returning id into rid; end if;
  -- R4 has two different real fixtures: use distinct test teams for the second.
  if exists(select 1 from matches where round_id=rid and home_team_id=home_id and away_team_id=away_id) then
   insert into teams(name,short_name,country_id) values('HISTORICAL HOME2','H2',(select id from countries where code='HR')) returning id into home_id;
  end if;
  f:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',doc->>'season');
  h:=jsonb_build_object('roundId',rid,'homeTeamId',home_id,'awayTeamId',away_id,'fixture',f);
  perform pg_temp.hs_refuses(format('select public.upsert_unavailable_historical_match(%s,%L,%L,%L,%L,%L::jsonb)',c,e->>'sourceMatchId',pid,sha,repeat('0',64),h::text),'different raw bytes');
  perform pg_temp.hs_refuses(format('select public.upsert_unavailable_historical_match(%s,%L,%L,%L,%L,%L::jsonb)',c,e->>'sourceMatchId',pid,sha,e->>'rawSha256',jsonb_set(h,'{fixture,observedHomeScore}','99')::text),'changed official score');
  result:=public.upsert_unavailable_historical_match(c,e->>'sourceMatchId',pid,sha,e->>'rawSha256',h);
  mid:=(result->>'matchId')::bigint;
  perform pg_temp.hs_assert(mid=(public.upsert_unavailable_historical_match(c,e->>'sourceMatchId',pid,sha,e->>'rawSha256',h)->>'matchId')::bigint,'identical marker idempotent');
  perform pg_temp.hs_assert((select imported_at is null and statistics_status='unavailable_historical' from matches where id=mid),'unavailable is not fully imported');
  perform pg_temp.hs_assert((select home_goals=(e->>'observedHomeScore')::int and away_goals=(e->>'observedAwayScore')::int from matches where id=mid),'published result retained');
  perform pg_temp.hs_assert((select golov is null and brez_asistence is null and not glasovanje_odprto from match_assist_status where match_id=mid),'public result reachable but individual counters unavailable');
  perform pg_temp.hs_refuses(format('update matches set imported_at=now() where id=%s',mid),'no fake successful import');
  perform pg_temp.hs_refuses(format('update matches set statistics_status=''available'',statistics_reason=null where id=%s',mid),'cannot clear installed marker');
 end loop;
 result:=public.get_installed_historical_statistics_markers(c);
 perform pg_temp.hs_assert(jsonb_array_length(result->'markers')=3,'all3 bound DB markers exposed to service loader');
 perform pg_temp.hs_assert((select odigranih=3 and statistics_complete_matches=0 and statistics_unavailable_matches=3 from sezone where competition_id=c and season=doc->>'season'),'played versus complete coverage separate');
 insert into players(competition_id,team_id,first_name,last_name,position) values(c,home_id,'Verified','Player','GK') returning id into v_player_id;
 perform pg_temp.hs_refuses(format('insert into appearances(match_id,player_id,team_id) values(%s,%s,%s)',mid,v_player_id,home_id),'no invented individual appearance');
 perform pg_temp.hs_refuses(format('insert into goals(match_id,scorer_id,team_id,minute) values(%s,%s,%s,1)',mid,v_player_id,home_id),'no invented individual goal');
 perform pg_temp.hs_assert(not exists(select 1 from appearances where match_id in(select id from matches where statistics_status='unavailable_historical')),'zero individual rows, not fabricated zero stats');
 -- No policy authorization exists: generic RPC and direct service update must refuse.
 perform set_config('slff.historical_release_authorized','true',true);
 perform pg_temp.hs_refuses(format('update competitions set active=true where id=%s',c),'direct activation cannot spoof a GUC');
 perform pg_temp.hs_refuses(format('update competitions set source_policy=null,active=true where id=%s',c),'clearing policy cannot bypass activation guard');
 result:=vklopi_ligo_sredi_sezone('hr-prva-hnlz');
 perform pg_temp.hs_assert((result->>'vklopljena')::boolean=false and result->>'razlog' like 'HISTORICAL_POLICY:%' and (select not active from competitions where id=c),'generic RPC cannot activate opt-in league');
 -- Unavailable rows leave normal appearance/statistic calculations untouched.
 insert into rounds(competition_id,season,number,played_on) values(c,doc->>'season',8,current_date-1) returning id into rid;
 insert into matches(round_id,home_team_id,away_team_id,played_on,zapisnik_id,imported_at) values(rid,home_id,away_id,current_date-1,'historical-test-normal',now()) returning id into normal_mid;
 insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_off,is_goalkeeper) values(normal_mid,v_player_id,home_id,true,90,90,true);
 perform pg_temp.hs_assert((select matches=1 and minutes=90 from player_season_stats where player_season_stats.player_id=v_player_id and season=doc->>'season'),'season totals contain only verified observation');
 perform pg_temp.hs_assert((select statistics_status='available' from matches where id=normal_mid),'normal ingestion unchanged');
 perform private_historical_statistics.authorize_release(c,pid,sha,repeat('a',64));
 update players set value=value+0.1 where id=v_player_id;
 perform pg_temp.hs_refuses(format('update competitions set active=true where id=%s',c),'authorization snapshot cannot survive changed prices');
 raise notice 'HISTORICAL TEST: common policy/header/missingness/activation checks passed';
end $$;
set local role anon;
do $$begin
 if(select count(*)from public.match_assist_status where statistics_status='unavailable_historical')<>3 then raise exception 'HISTORICAL TEST: public unavailable results missing';end if;
 begin perform 1 from private_historical_statistics.policies;raise exception 'HISTORICAL TEST: private approval registry leaked';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role service_role;
select public.get_installed_historical_statistics_markers((select id from public.competitions where slug='hr-prva-hnlz'))->>'installed' as service_marker_binding;
reset role;
rollback;
