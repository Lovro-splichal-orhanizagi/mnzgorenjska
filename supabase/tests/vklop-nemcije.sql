-- Run only on a disposable fresh database. Every fixture/change rolls back.
begin;
set local statement_timeout='90s';
do $$ begin
 if not exists(select 1 from competitions where slug='de-regionalliga-nordost' and not active)
    or exists(select 1 from rounds r join competitions c on c.id=r.competition_id where c.slug='de-regionalliga-nordost') then
   raise exception 'Fresh inactive Germany seed required';
 end if;
 if has_function_privilege('anon','varen_vklop_nemcije(text,text,boolean)','EXECUTE')
    or has_function_privilege('authenticated','varen_vklop_nemcije(text,text,boolean)','EXECUTE')
    or not has_function_privilege('service_role','varen_vklop_nemcije(text,text,boolean)','EXECUTE') then
   raise exception 'RPC service-only grants failed';
 end if;
end $$;
create temporary table de_clubs as
 select n,(-923000-n)::bigint id,'DE fixture club '||n name from generate_series(0,19)n;
insert into teams(id,name,short_name,country_id) overriding system value
 select id,name,'DE'||n,(select id from countries where code='DE') from de_clubs;
insert into players(id,team_id,competition_id,first_name,last_name,full_name,position,position_source,value,value_start,active) overriding system value
 select -924000-t.n*20-p.n,t.id,c.id,'Player',p.n::text,t.name||' Player '||p.n,
   case when p.n=0 or p.n=11 then 'GK' when p.n<5 then 'DEF' when p.n<9 then 'MID' else 'FWD' end,
   'zapisnik',case when t.n=0 and p.n=0 then 8 else 4 end,4,t.n<18
 from de_clubs t cross join generate_series(0,15)p(n) cross join competitions c where c.slug='de-regionalliga-nordost';
insert into rounds(id,competition_id,season,number,deadline_at,played_on) overriding system value
 select -925000-s.n*100-r.n,c.id,case s.n when 0 then '2025/26' else '2026/27' end,r.n,
   case when s.n=0 then now()-interval '400 days' when r.n=1 then now()-interval '1 day' else now()+r.n*interval '1 day' end,
   case s.n when 0 then date '2025-10-01' else date '2026-10-01' end
 from generate_series(0,1)s(n) cross join generate_series(1,34)r(n) cross join competitions c where c.slug='de-regionalliga-nordost';
-- Circle method: each club plays every other club at home and away.
create temporary table de_fixtures as
 with pair as (
  select r,slot,case when slot=0 then 17 else (r+slot)%17 end a,
    case when slot=0 then r else (r-slot+17)%17 end b
  from generate_series(0,16)r cross join generate_series(0,8)slot
 ) select s,leg*17+r+1 round,slot,
   (-926000-s*1000-(leg*17+r+1)*10-slot)::bigint id,
   'de-dfb-'||(8000000+s*1000+(leg*17+r+1)*10+slot) report,
   (case leg when 0 then a else b end)+case s when 0 then 2 else 0 end home,
   (case leg when 0 then b else a end)+case s when 0 then 2 else 0 end away,
   (s=0 or leg*17+r+1=1) played
 from pair cross join generate_series(0,1)leg cross join generate_series(0,1)s;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at) overriding system value
 select f.id,r.id,h.id,a.id,r.played_on,case when f.played then f.report end,
   case when f.played then 'https://datencenter.dfb.de/datencenter/regionalliga-nordost/'||case f.s when 0 then '2025-2026' else '2026-2027' end||'/test-'||f.report end,
   case when f.played then now() end
 from de_fixtures f join rounds r on r.id=-925000-f.s*100-f.round join de_clubs h on h.n=f.home join de_clubs a on a.n=f.away;
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)
 select f.id,p.id,p.team_id,i<11,case when i<11 then 90 else 15 end,case when i<11 then 0 else 75 end,90,i=0
 from de_fixtures f cross join generate_series(0,1)side cross join generate_series(0,11)i
 join de_clubs t on t.n=case side when 0 then f.home else f.away end
 join players p on p.id=-924000-t.n*20-i where f.played;
create temporary table de_manifest(raw text);
insert into de_manifest
select jsonb_build_object('version',1,'slug','de-regionalliga-nordost','sourceCommit',repeat('a',40),'parserSha256',repeat('b',64),
 'seasons',(select jsonb_agg(jsonb_build_object('season',season,'code',code,'capturedAt',now(),'runId','12345','documentsSha256',repeat('c',64),'fixtures',fixtures) order by season)
 from (select case f.s when 0 then '2025/26' else '2026/27' end season,
  'regionalliga-nordost/'||case f.s when 0 then '2025-2026' else '2026-2027' end code,
  jsonb_agg(jsonb_build_object('id',f.report,'round',f.round,'date',m.played_on,'home',h.name,'away',a.name,'played',f.played,
   'homeGoals',case when f.played then 0 end,'awayGoals',case when f.played then 0 end,'url',m.source_url,'warnings','[]'::jsonb,
   'starters',case when f.played then (select jsonb_agg(jsonb_build_object('side',side,'name',t.name||' Player '||i,'keeper',i=0,'proof',case when i=0 then 'oznaka-T' end) order by side,i)
     from generate_series(0,1)side cross join generate_series(0,10)i join de_clubs t on t.n=case side when 0 then f.home else f.away end) else '[]'::jsonb end) order by f.round,f.slot) fixtures
 from de_fixtures f join matches m on m.id=f.id join de_clubs h on h.n=f.home join de_clubs a on a.n=f.away group by f.s) x))::text;
create function pg_temp.de_check(activate boolean default false) returns jsonb language sql as $$
 select varen_vklop_nemcije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),activate) from de_manifest;
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
 if (r->>'preverjeno')::boolean is distinct from true or (r->>'prvi_krog')::int<>2
    or exists(select 1 from competitions where slug='de-regionalliga-nordost' and active) then raise exception 'Nonmutating preflight failed: %',r; end if;
 raise notice 'PASS complete manifest preflight; inactive state retained';
end $$;
select pg_temp.de_reject('missing archive report', $$update matches set imported_at=null where id=-926010$$);
select pg_temp.de_reject('wrong report identity', $$update matches set zapisnik_id='de-dfb-99999999' where id=-926010$$);
select pg_temp.de_reject('score without goal', $$update matches set home_goals=1 where id=-926010$$);
select pg_temp.de_reject('unplayed fixture must remain a 0-0 placeholder', $$update matches set home_goals=1 where id=-927020$$);
select pg_temp.de_reject('missing starter', $$delete from appearances where match_id=-926010 and player_id=(select min(player_id) from appearances where match_id=-926010 and started)$$);
select pg_temp.de_reject('wrong keeper role', $$update appearances set is_goalkeeper=false where match_id=-926010 and is_goalkeeper$$);
select pg_temp.de_reject('archive club cannot replace a current selectable club even with 18 active clubs', $$update players set team_id=-923018 where team_id=-923000 and active$$);
select pg_temp.de_reject('current official keeper must be priced as a keeper', $$update players set position='MID' where team_id=-923000 and id=-924000$$);
select pg_temp.de_reject('unreviewed warnings', $$update matches set import_warnings=array['unexpected'] where id=-926010$$);
select pg_temp.de_reject('unaffordable roster', $$update players set value=15 where competition_id=(select id from competitions where slug='de-regionalliga-nordost')$$);
select pg_temp.de_reject('no future deadline', $$update rounds set deadline_at=now()-interval '1 day' where competition_id=(select id from competitions where slug='de-regionalliga-nordost')$$);
select pg_temp.de_reject('locked eligible round', $$update rounds set lineups_locked_at=now() where id=-925102$$);
select pg_temp.de_reject('stale source capture', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,capturedAt}',to_jsonb(now()-interval '13 hours'))::text$$);
select pg_temp.de_reject('wrong league scope', $$update de_manifest set raw=jsonb_set(raw::jsonb,'{slug}','"some-other-league"')::text$$);
-- A valid normal goal and valid own goal both pass. Moving the scorer and
-- team to the other valid side, keeping the same total, must fail.
do $$ declare own boolean; m matches%rowtype; rejected boolean; begin
 foreach own in array array[false,true] loop
  begin
   select * into strict m from matches where id=-926010;
   update matches set home_goals=1 where id=m.id;
   update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,0,fixtures,0,homeGoals}','1')::text;
   insert into goals(match_id,team_id,scorer_id,is_own_goal)
    select m.id,case when own then m.away_team_id else m.home_team_id end,p.id,own
     from players p where p.team_id=case when own then m.away_team_id else m.home_team_id end and p.last_name='0';
   perform pg_temp.de_check();
   update goals g set team_id=case when own then m.home_team_id else m.away_team_id end,
     scorer_id=(select p.id from players p where p.team_id=case when own then m.home_team_id else m.away_team_id end and p.last_name='0')
    where g.match_id=m.id;
   rejected:=false;
   begin perform pg_temp.de_check(); exception when others then
    if sqlerrm not like 'DE_RELEASE: per-match goals%' then raise; end if;
    rejected:=true;
   end;
   if not rejected then raise exception 'Opposite-side goal accepted (own=%)',own; end if;
   raise exception using errcode='P9998',message='rollback goal mutation';
  exception when sqlstate 'P9998' then null;
  end;
  raise notice 'PASS per-side goal accounting (own=%)',own;
 end loop;
end $$;
-- Explicit pre-launch history gap. All other fixture, keeper and price checks
-- remain identical; the missing match can never acquire fabricated statistics.
do $$ declare f de_fixtures%rowtype; h text; a text; r jsonb; p jsonb; rejected boolean; begin
 begin
  select * into strict f from de_fixtures where s=1 and round=13 and slot=0;
  select name into h from teams where id=(select home_team_id from matches where id=f.id);
  select name into a from teams where id=(select away_team_id from matches where id=f.id);
  update teams set name=case name when h then 'Hertha BSC II' else 'RSV Eintracht 1949' end where name in(h,a);
  update players set full_name=replace(replace(full_name,h,'Hertha BSC II'),a,'RSV Eintracht 1949') where team_id in(select id from teams where name in('Hertha BSC II','RSV Eintracht 1949'));
  update de_manifest set raw=replace(replace(raw,h,'Hertha BSC II'),a,'RSV Eintracht 1949');
  select raw::jsonb#>'{seasons,1,fixtures,108}' into p from de_manifest;
  p:=p||jsonb_build_object('id','de-dfb-2426099','date','2026-10-16','played',true,'pending',true,'pendingReason','official-report-unpublished','homeGoals',0,'awayGoals',1,'starters','[]'::jsonb,'url','https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/13-spieltag/hertha-bsc-ii-rsv-eintracht-1949-2426099');
  update de_manifest set raw=jsonb_set(raw::jsonb||jsonb_build_object('version',2,'launchPolicy','future-round-with-pending-history'),'{seasons,1,fixtures,108}',p)::text;
  update matches set played_on='2026-10-16' where id=f.id;
  update rounds set deadline_at=now()-interval '1 day' where competition_id=(select id from competitions where slug='de-regionalliga-nordost') and season='2026/27' and number between 2 and 13;
  r:=pg_temp.de_check();
  if (r->>'preverjeno')::boolean is distinct from true or (r->>'prvi_krog')::int<>14 then raise exception 'Pending history future-round preflight failed: %',r; end if;
  perform pg_temp.de_reject('unapproved pending identity',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,fixtures,108,id}','"de-dfb-2426098"')::text$m$);
  perform pg_temp.de_reject('pending match cannot have an imported report',format('update matches set imported_at=now() where id=%s',f.id));
  perform pg_temp.de_reject('pending match cannot contain appearances',format('insert into appearances(match_id,player_id,team_id,started,minutes_played) select %s,p.id,p.team_id,true,90 from players p where p.team_id=(select home_team_id from matches where id=%s) limit 1',f.id,f.id));
  perform pg_temp.de_reject('pending match cannot contain goals',format('insert into goals(match_id,team_id,scorer_id) select %s,p.team_id,p.id from players p where p.team_id=(select home_team_id from matches where id=%s) limit 1',f.id,f.id));
  perform pg_temp.de_reject('pending history cannot overlap first fantasy round',$m$update rounds set deadline_at=now()+interval '1 day' where competition_id=(select id from competitions where slug='de-regionalliga-nordost') and season='2026/27' and number=13$m$);
  perform pg_temp.de_reject('pending final score cannot drift',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,fixtures,108,awayGoals}','2')::text$m$);
  r:=pg_temp.de_check(true);
  if (r->>'vklopljena')::boolean is distinct from true or (r->>'prvi_krog')::int<>14 then raise exception 'Pending history activation failed: %',r; end if;
  raise exception using errcode='P9998',message='rollback pending fixture and activation';
 exception when sqlstate 'P9998' then null;
 end;
 raise notice 'PASS one explicit pending historical match permits only future round 14';
end $$;
do $$ declare r jsonb; begin
 begin
  perform varen_vklop_nemcije((select raw from de_manifest),repeat('0',64),false);
  raise exception 'SHA mismatch accepted';
 exception when others then if sqlerrm not like 'DE_RELEASE: reviewed manifest SHA256 mismatch%' then raise; end if; end;
 r:=pg_temp.de_check(true);
 if (r->>'vklopljena')::boolean is distinct from true or not exists(select 1 from competitions where slug='de-regionalliga-nordost' and active and prvi_fantasy_krog=2) then
  raise exception 'Final atomic activation failed: %',r;
 end if;
 raise notice 'PASS reviewed release activates exactly future round 2';
end $$;
rollback;
