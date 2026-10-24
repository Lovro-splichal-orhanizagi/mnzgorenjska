select set_config('slff.test_slug', :'regional_slug', false);
-- Run only on a disposable fresh database. Every fixture/change rolls back.
begin;
set local statement_timeout='90s';
do $$ begin
 if not exists(select 1 from competitions where slug=current_setting('slff.test_slug') and not active)
    or exists(select 1 from rounds r join competitions c on c.id=r.competition_id where c.slug=current_setting('slff.test_slug')) then
   raise exception 'Fresh inactive Germany seed required';
 end if;
 if has_function_privilege('anon','varen_vklop_dfb_regije(text,text,boolean)','EXECUTE')
    or has_function_privilege('authenticated','varen_vklop_dfb_regije(text,text,boolean)','EXECUTE')
    or not has_function_privilege('service_role','varen_vklop_dfb_regije(text,text,boolean)','EXECUTE') then
   raise exception 'RPC service-only grants failed';
 end if;
end $$;
create temporary table de_clubs as
 select n,(-923000-n)::bigint id,'DE fixture club '||n name from generate_series(0,20)n;
insert into teams(id,name,short_name,country_id) overriding system value
 select id,name,'DE'||n,(select id from countries where code='DE') from de_clubs;
insert into players(id,team_id,competition_id,first_name,last_name,full_name,position,position_source,value,value_start,active) overriding system value
 select -924000-t.n*20-p.n,t.id,c.id,'Player',p.n::text,t.name||' Player '||p.n,
   case when p.n=0 or p.n=11 then 'GK' when p.n<5 then 'DEF' when p.n<9 then 'MID' else 'FWD' end,
   'zapisnik',case when t.n=0 and p.n=0 then 8 else 4 end,4,t.n<:current_clubs
 from de_clubs t cross join generate_series(0,15)p(n) cross join competitions c where c.slug=current_setting('slff.test_slug');
insert into rounds(id,competition_id,season,number,deadline_at,played_on) overriding system value
 select -925000-s.n*100-r.n,c.id,case s.n when 0 then '2025/26' else '2026/27' end,r.n,
   (case when s.n=0 then timestamp '2025-10-01 18:00' when r.n<=2 then (current_date-3+r.n)+time '18:00' else (current_date+r.n)+time '18:00' end at time zone 'Europe/Berlin')-interval '6 hours',
   case when s.n=0 then date '2025-10-01' when r.n<=2 then current_date-3+r.n else current_date+r.n end
 from generate_series(0,1)s(n) cross join lateral generate_series(1,case s.n when 0 then 34 else :current_rounds end)r(n) cross join competitions c where c.slug=current_setting('slff.test_slug');
-- Circle method: each club plays every other club at home and away.
create temporary table de_fixtures as
 with sizes as(select s,case when s=0 then 18 else :current_clubs end n from generate_series(0,1)s), pair as (
  select s,n,r,slot,case when slot=0 then n+n%2-1 else (r+slot)%(n+n%2-1) end a,
    case when slot=0 then r else (r-slot+n+n%2-1)%(n+n%2-1) end b
  from sizes cross join lateral generate_series(0,n+n%2-2)r cross join lateral generate_series(0,(n+n%2)/2-1)slot
 ) select s,leg*(n+n%2-1)+r+1 round,slot,
   (-926000-s*1000-(leg*(n+n%2-1)+r+1)*10-slot)::bigint id,
   'de-dfb-'||(8000000+s*1000+(leg*(n+n%2-1)+r+1)*10+slot) report,
   (case leg when 0 then a else b end)+case s when 0 then 2 else 0 end home,
   (case leg when 0 then b else a end)+case s when 0 then 2 else 0 end away,
   (s=0 or leg*(n+n%2-1)+r+1<=2) played
 from pair cross join generate_series(0,1)leg where a<n and b<n;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at) overriding system value
 select f.id,r.id,h.id,a.id,r.played_on,case when f.played then f.report end,
   case when f.played then 'https://datencenter.dfb.de/datencenter/'||substring(current_setting('slff.test_slug') from 4)||'/'||case f.s when 0 then '2025-2026' else '2026-2027' end||'/test-'||f.report end,
   case when f.played then now() end
 from de_fixtures f join rounds r on r.id=-925000-f.s*100-f.round join de_clubs h on h.n=f.home join de_clubs a on a.n=f.away;
-- Rolled-back bulk fixtures can leave empty planner statistics. Seed one
-- played match before analyzing so the real statistics triggers get useful
-- relation estimates while loading the rest of this complete fixture.
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)
 select f.id,p.id,p.team_id,i<11,case when i<11 then 90 else 15 end,case when i<11 then 0 else 75 end,90,i=0
 from de_fixtures f cross join generate_series(0,1)side cross join generate_series(0,11)i
 join de_clubs t on t.n=case side when 0 then f.home else f.away end
 join players p on p.id=-924000-t.n*20-i where f.played and f.id=(select min(id)from de_fixtures where played);
analyze public.players, public.rounds, public.matches, public.appearances,
  public.goals, public.player_scores, public.statistika_igralcev;
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)
 select f.id,p.id,p.team_id,i<11,case when i<11 then 90 else 15 end,case when i<11 then 0 else 75 end,90,i=0
 from de_fixtures f cross join generate_series(0,1)side cross join generate_series(0,11)i
 join de_clubs t on t.n=case side when 0 then f.home else f.away end
 join players p on p.id=-924000-t.n*20-i where f.played and f.id<>(select min(id)from de_fixtures where played);
analyze public.players, public.rounds, public.matches, public.appearances,
  public.goals, public.player_scores, public.statistika_igralcev;
-- Synthetic source packets retain the DFB parser contract: no MLSZ clock field.
-- One end-of-play red allows a clock-only extra-metadata refusal below.
update appearances set red_cards=1 where id=(select ap.id from appearances ap join matches m on m.id=ap.match_id join rounds r on r.id=m.round_id where m.id in(select id from de_fixtures)and r.season='2026/27'and ap.started and not ap.is_goalkeeper and ap.minute_off=90 order by ap.player_id,ap.id limit 1);
create temporary table de_manifest(raw text);
insert into de_manifest
select jsonb_build_object('version',1,'slug',current_setting('slff.test_slug'),'sourceCommit',repeat('a',40),'parserSha256',repeat('b',64),
 'seasons',(select jsonb_agg(jsonb_build_object('season',season,'code',code,'capturedAt',now(),'runId','12345','jobId','6789','documentsSha256',repeat('c',64),'fixtures',fixtures) order by season)
 from (select case f.s when 0 then '2025/26' else '2026/27' end season,
  substring(current_setting('slff.test_slug') from 4)||'/'||case f.s when 0 then '2025-2026' else '2026-2027' end code,
  jsonb_agg(jsonb_build_object('id',f.report,'round',f.round,'date',m.played_on,'time','18:00','home',h.name,'away',a.name,'played',f.played,
   'homeGoals',case when f.played then 0 end,'awayGoals',case when f.played then 0 end,'url',m.source_url,'warnings','[]'::jsonb,'goals','[]'::jsonb,
   'appearances',coalesce((select jsonb_agg((to_jsonb(ap)-array['id','match_id','player_id','team_id','penalties_saved','red_card_minute'])||jsonb_build_object('side',case when ap.team_id=m.home_team_id then 0 else 1 end,'name',p.full_name)) from appearances ap join players p on p.id=ap.player_id where ap.match_id=m.id),'[]'::jsonb),
   'starters',case when f.played then (select jsonb_agg(jsonb_build_object('side',side,'name',t.name||' Player '||i,'keeper',i=0,'proof',case when i=0 then 'oznaka-T' end) order by side,i)
     from generate_series(0,1)side cross join generate_series(0,10)i join de_clubs t on t.n=case side when 0 then f.home else f.away end) else '[]'::jsonb end) order by f.round,f.slot) fixtures
 from de_fixtures f join matches m on m.id=f.id join de_clubs h on h.n=f.home join de_clubs a on a.n=f.away group by f.s) x))::text;
create function pg_temp.de_check(activate boolean default false) returns jsonb language sql as $$
 select varen_vklop_dfb_regije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),activate) from de_manifest;
$$;
create function pg_temp.de_reject(label text,mutation text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
 begin
  execute mutation;
  begin perform pg_temp.de_check(); exception when others then
    if sqlerrm not like 'DE_RELEASE:%' then raise; end if;
    rejected:=true;
  end;
  if not rejected then raise exception 'Unexpected accepted release: %',label; end if;
  raise exception using errcode='P9998',message='rollback intentional mutation';
 exception when sqlstate 'P9998' then null;
 end;
 raise notice 'PASS rejected %',label;
end $$;
do $$ declare r jsonb; begin
 r:=pg_temp.de_check();
 if (r->>'preverjeno')::boolean is distinct from true or (r->>'prvi_krog')::int<>3
    or r->>'manifestSha256' is distinct from (select encode(sha256(convert_to(raw,'UTF8')),'hex') from de_manifest)
    or exists(select 1 from competitions where slug=current_setting('slff.test_slug') and active) then raise exception 'Nonmutating preflight failed: %',r; end if;
 raise notice 'PASS complete manifest preflight; inactive state retained';
end $$;
select pg_temp.de_reject('unexpected nonnull MLSZ clock metadata', $$update appearances set red_card_minute=90 where id=(select min(id)from appearances where match_id in(select id from de_fixtures)and red_cards=1)$$);
-- REPLAY_MUTATIONS
select pg_temp.de_reject('missing archive report', $$update matches set imported_at=null where id=-926010$$);
select pg_temp.de_reject('wrong report identity', $$update matches set zapisnik_id='de-dfb-99999999' where id=-926010$$);
select pg_temp.de_reject('score without goal', $$update matches set home_goals=1 where id=-926010$$);
select pg_temp.de_reject('unplayed fixture must remain a 0-0 placeholder', $$update matches set home_goals=1 where id=-927031$$);
select pg_temp.de_reject('missing starter', $$delete from appearances where match_id=-926010 and player_id=(select min(player_id) from appearances where match_id=-926010 and started)$$);
select pg_temp.de_reject('wrong keeper role', $$update appearances set is_goalkeeper=false where match_id=-926010 and is_goalkeeper$$);
select pg_temp.de_reject('archive club cannot replace a current selectable club even with 18 active clubs', $$update players set team_id=-923020 where team_id=-923000 and active$$);
select pg_temp.de_reject('current official keeper must be priced as a keeper', $$update players set position='MID' where team_id=-923000 and id=-924000$$);
select pg_temp.de_reject('unreviewed warnings', $$update matches set import_warnings=array['unexpected'] where id=-926010$$);
select pg_temp.de_reject('unaffordable roster', $$update players set value=15 where competition_id=(select id from competitions where slug=current_setting('slff.test_slug'))$$);
select pg_temp.de_reject('no future deadline', $$update rounds set deadline_at=now()-interval '1 day' where competition_id=(select id from competitions where slug=current_setting('slff.test_slug'))$$);
select pg_temp.de_reject('locked eligible round', $$update rounds set lineups_locked_at=now() where id=-925103$$);
select pg_temp.de_reject('stale source capture', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,capturedAt}',to_jsonb(now()-interval '13 hours'))::text$$);
select pg_temp.de_reject('wrong league scope', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{slug}','"some-other-league"')::text$$);

select pg_temp.de_reject('changed substitute minutes', $$update appearances set minutes_played=14 where match_id=-926010 and not started$$);
select pg_temp.de_reject('changed card recipient', $$update appearances set yellow_cards=1 where match_id=-926010 and player_id=(select min(player_id) from appearances where match_id=-926010)$$);
select pg_temp.de_reject('changed source URL', $$update matches set source_url='https://example.com' where id=-926010$$);
select pg_temp.de_reject('unknown first-day kickoff', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,fixtures,18,time}','null')::text$$);
select pg_temp.de_reject('incorrect six-hour deadline', $$update rounds set deadline_at=deadline_at+interval '1 minute' where id=-925103$$);
select pg_temp.de_reject('false keeper proof', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,0,fixtures,0,starters,0,proof}','"guessed"')::text$$);
select pg_temp.de_reject('wrong source season', $$update competitions set source_league_code='regionalliga-west/2026-2027' where slug=current_setting('slff.test_slug')$$);
select pg_temp.de_reject('stale archive', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,0,capturedAt}',to_jsonb(now()-interval '8 days'))::text$$);
select pg_temp.de_reject('all default prices', $$update players set value=4.5 where competition_id=(select id from competitions where slug=current_setting('slff.test_slug'))$$);
select pg_temp.de_reject('changed own goal count', $$update appearances set own_goals=1 where match_id=-926010$$);
select pg_temp.de_reject('changed conceded goals', $$update appearances set goals_conceded=1 where match_id=-926010$$);
select pg_temp.de_reject('changed clean sheet', $$update appearances set clean_sheet=not clean_sheet where match_id=-926010$$);
select pg_temp.de_reject('changed substitution boundary', $$update appearances set minute_on=74 where match_id=-926010 and not started$$);
select pg_temp.de_reject('changed penalty statistics', $$update appearances set penalties_missed=1 where match_id=-926010$$);
select pg_temp.de_reject('changed shirt number', $$update appearances set shirt_number=99 where match_id=-926010$$);
select pg_temp.de_reject('future round already played', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,fixtures,18,played}','true')::text$$);
-- A transferred archive player still compares by historical appearance side.
do $$ begin
 begin
  update players set team_id=-923001 where id=-924380;
  perform pg_temp.de_check();
  raise exception using errcode='P9998',message='rollback historical transfer';
 exception when sqlstate 'P9998' then null;
 end;
end $$;
-- Exact goal identity and intermediate score, not only totals.
do $$ declare own boolean; m matches%rowtype; target bigint; begin
 foreach own in array array[false,true] loop
  begin
   select * into m from matches where id=-926010;
   select id into target from players where team_id=case when own then m.away_team_id else m.home_team_id end and last_name='1' and competition_id=(select id from competitions where slug=current_setting('slff.test_slug'));
   update matches set home_goals=1 where id=m.id;
   insert into goals(match_id,team_id,scorer_id,minute,is_own_goal,is_penalty,score_home,score_away)
    values(m.id,case when own then m.away_team_id else m.home_team_id end,target,31,own,false,1,0);
   update appearances set goals=case when own then 0 else 1 end,own_goals=case when own then 1 else 0 end where match_id=m.id and player_id=target;
   update de_manifest set raw=jsonb_set(jsonb_set(jsonb_set(raw::jsonb,'{seasons,0,fixtures,0,homeGoals}','1'),'{seasons,0,fixtures,0,goals}',
     (select jsonb_agg((to_jsonb(g)-array['id','match_id','scorer_id','team_id','assist_player_id','assist_confirmed_at','assist_none_confirmed_at'])||jsonb_build_object('side',case when g.team_id=m.home_team_id then 0 else 1 end,'name',p.full_name)) from goals g join players p on p.id=g.scorer_id where g.match_id=m.id)),
     '{seasons,0,fixtures,0,appearances}',(select jsonb_agg((to_jsonb(ap)-array['id','match_id','player_id','team_id','penalties_saved','red_card_minute'])||jsonb_build_object('side',case when ap.team_id=m.home_team_id then 0 else 1 end,'name',p.full_name)) from appearances ap join players p on p.id=ap.player_id where ap.match_id=m.id))::text;
   perform pg_temp.de_check();
   perform pg_temp.de_reject('wrong scorer same historical side',format('update goals set scorer_id=%s where match_id=-926010',target-1));
   perform pg_temp.de_reject('changed goal minute','update goals set minute=32 where match_id=-926010');
   perform pg_temp.de_reject('changed penalty flag','update goals set is_penalty=true where match_id=-926010');
   perform pg_temp.de_reject('changed intermediate score','update goals set score_home=2 where match_id=-926010');
   perform pg_temp.de_reject('duplicate attributed goal','insert into goals(match_id,scorer_id,team_id,minute,is_own_goal,is_penalty,score_home,score_away) select match_id,scorer_id,team_id,minute,is_own_goal,is_penalty,score_home,score_away from goals where match_id=-926010');
   raise exception using errcode='P9998',message='rollback attributed goals';
  exception when sqlstate 'P9998' then null;
  end;
 end loop;
end $$;
do $$ declare r jsonb; begin
 r:=pg_temp.de_check(true);
 if (r->>'vklopljena')::boolean is distinct from true or (r->>'prvi_krog')::int<>3 then raise exception 'Activation failed %',r; end if;
 perform pg_temp.de_reject('already active', 'select 1');
end $$;
rollback;
