-- Trigger-level regression only; complete canonical/helper coverage remains in
-- vklop-dfb-regije.sql for strict manifest versions 1 and 2. All changes roll back.
begin;
set local statement_timeout='15s';
create function pg_temp.strict_policy_refuses(command text)returns void language plpgsql as $$
begin
 begin execute command;exception when others then
  if sqlerrm like 'HISTORICAL_POLICY:%'then return;end if;
  raise;
 end;
 raise exception 'STRICT_POLICY_TEST: historical activation unexpectedly allowed: %',command;
end$$;
do $$
declare c competitions%rowtype;p private_historical_statistics.policies%rowtype;e jsonb;f jsonb;region text;n int:=0;rid bigint;
begin
 for region in select unnest(array['nord','west'])loop
  n:=n+1;
  select * into c from competitions where slug='de-regionalliga-'||region;
  select * into p from private_historical_statistics.policies where document->>'competitionSlug'=c.slug;
  if c.id is null or c.active or c.source_policy is not null or p.id is null or exists(select 1 from rounds where competition_id=c.id)then raise exception 'STRICT_POLICY_TEST: fresh migrated inactive ordinary target required';end if;
  -- Registering a possible historical policy must not change this old tuple.
  begin
   update competitions set active=true where id=c.id;
   raise exception 'STRICT_POLICY_TEST: empty ordinary target bypassed common activation guard';
  exception when others then
   if sqlerrm<>'Lige ni mogoče vklopiti: tekoča sezona nima krogov.'then raise;end if;
  end;
  raise notice 'PASS ordinary % defers to unchanged common readiness guard',region;
  begin
   update competitions set source_policy=p.document->>'sourcePolicy'where id=c.id;
   perform pg_temp.strict_policy_refuses(format('update competitions set source_policy=null,active=true where id=%s',c.id));
   raise exception using errcode='P9998',message='rollback old opt-in mutation';
  exception when sqlstate 'P9998'then null;end;
  begin
   insert into private_historical_statistics.installed_policies values(c.id,p.id,p.policy_sha256,current_date+7,now());
   perform pg_temp.strict_policy_refuses(format('update competitions set source_policy=null,active=true where id=%s',c.id));
   -- Even a real unavailable row may never enter the ordinary route.
   e:=p.document->'entries'->0;f:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',p.document->>'season');rid:=-9911000-n;
   insert into teams(id,name,short_name,country_id)overriding system value values(-9912000-n*2,'STRICT TEST home '||region,'STH',c.country_id),(-9912001-n*2,'STRICT TEST away '||region,'STA',c.country_id);
   insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value values(rid,c.id,p.document->>'season',(e->>'sourceRound')::int,(e->>'playedOn')::date,now()-interval'1 day');
   insert into private_historical_statistics.markers values(c.id,e->>'sourceMatchId','de-dfb-'||(e->>'sourceMatchId'),f,e->>'rawSha256',rid,-9912000-n*2,-9912001-n*2);
   insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,home_goals,away_goals,statistics_status,statistics_reason,source_phase,source_round)overriding system value
   values(-9913000-n,rid,-9912000-n*2,-9912001-n*2,(e->>'playedOn')::date,'de-dfb-'||(e->>'sourceMatchId'),e->>'sourceUrl',(e->>'observedHomeScore')::int,(e->>'observedAwayScore')::int,'unavailable_historical',e->>'reasonCode',e->>'sourcePhase',(e->>'sourceRound')::int);
   perform pg_temp.strict_policy_refuses(format('update competitions set source_policy=null,active=true where id=%s',c.id));
   raise exception using errcode='P9998',message='rollback installed marker mutation';
  exception when sqlstate 'P9998'then null;end;
  perform pg_temp.strict_policy_refuses(format('update competitions set source=%L,active=true where id=%s','hns',c.id));
  perform pg_temp.strict_policy_refuses(format('update competitions set source_league_code=%L,active=true where id=%s','regionalliga-suedwest/2026-2027',c.id));
  perform pg_temp.strict_policy_refuses(format('update competitions set country_id=(select id from countries where code=%L),active=true where id=%s','HR',c.id));
  raise notice 'PASS % old opt-in, installed policy, exact unavailable marker, foreign source/code/country refusals',region;
 end loop;
end$$;
rollback;
