-- Disposable fresh database only. Exercise the native SFL calendar exception
-- and normal readiness trigger; all fixtures roll back.
begin;
set local statement_timeout='60s';

create function pg_temp.sfl_assert(ok boolean, message text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'SFL CALENDAR TEST: %',message; end if;
end $$;

select pg_temp.sfl_assert(
  (select count(*)=2 and bool_and(not active and source='isthmian' and
     ((slug='gb-sfl-d1-central' and source_league_code='sfl/69d0be24b616bafb97331d42/2026-27') or
      (slug='gb-sfl-d1-south' and source_league_code='sfl/69d0bdf9b616bafb97331d41/2026-27')))
   from competitions where slug in ('gb-sfl-d1-central','gb-sfl-d1-south'))
  and has_function_privilege('service_role','public.vklopi_ligo_sredi_sezone(text)','EXECUTE')
  and not has_function_privilege('anon','public.vklopi_ligo_sredi_sezone(text)','EXECUTE')
  and not has_function_privilege('authenticated','public.vklopi_ligo_sredi_sezone(text)','EXECUTE'),
  'exact inactive tuples exist and native activation remains service-role only');

-- These seed rows have generated IDs. Bind only exact, inactive SFL tuples.
select pg_temp.sfl_assert(not exists (
  select 1 from rounds r join competitions c on c.id=r.competition_id
  where c.slug in ('gb-sfl-d1-central','gb-sfl-d1-south'))
  and not exists(select 1 from players p join competitions c on c.id=p.competition_id
    where c.slug in ('gb-sfl-d1-central','gb-sfl-d1-south')),
  'target seed rows are empty on the disposable fresh database');

create temporary table sfl_test_competitions(slug text primary key, id bigint, top_round int, gap_round int);
insert into sfl_test_competitions
select slug,id,case slug when 'gb-sfl-d1-central' then 32 else 41 end,
       case slug when 'gb-sfl-d1-central' then 14 else 15 end
from competitions where slug in ('gb-sfl-d1-central','gb-sfl-d1-south');
select pg_temp.sfl_assert((select count(*)=2 from sfl_test_competitions),'dynamic competition IDs captured');

-- Seed enough ordinary player/report data for the existing activation trigger
-- to pass on the positive path: an affordable positional squad, one bench
-- appearance, goals matching every imported score, and no scorer gaps.
create temporary table sfl_test_clubs(slug text,club_no int,team_id bigint,primary key(slug,club_no));
insert into teams(id,name,short_name,country_id) overriding system value
select -916000-(cnum*10+n), 'SFL calendar fixture '||cnum||' club '||n,
       'SC'||cnum||n,(select id from countries where code='GB')
from generate_series(1,2)cnum cross join generate_series(1,6)n;
insert into sfl_test_clubs
select c.slug,n,t.id from sfl_test_competitions c cross join generate_series(1,6)n
join teams t on t.id=-916000-(case c.slug when 'gb-sfl-d1-central' then 10 else 20 end)-n;

insert into players(team_id,competition_id,first_name,last_name,full_name,position,position_source,value,value_start,active)
select tc.team_id,c.id,'Fixture','Player '||((tc.club_no-1)*5+n),'SFL Fixture Player '||((tc.club_no-1)*5+n),
       case when (tc.club_no-1)*5+n<=4 then 'GK'
            when (tc.club_no-1)*5+n<=14 then 'DEF'
            when (tc.club_no-1)*5+n<=24 then 'MID' else 'FWD' end,
       'admin',case when (tc.club_no-1)*5+n<=20 then 4.5 when (tc.club_no-1)*5+n=30 then 8 else 5.5 end,4.5,true
from sfl_test_competitions c join sfl_test_clubs tc on tc.slug=c.slug
cross join generate_series(1,5)n;

insert into rounds(competition_id,season,number,played_on,deadline_at)
select c.id,sezona_lige(c.id),n,
       case when n in (1,2,3,c.top_round-3,c.top_round-2,c.top_round-1) then current_date-5 else current_date+20 end,
       case when n in (1,2,3,c.top_round-3,c.top_round-2,c.top_round-1) then now()-interval '5 days'+n*interval '1 minute'
            when n<c.gap_round then now()-interval '1 day'+n*interval '1 minute'
            else now()+n*interval '1 minute' end
from sfl_test_competitions c cross join lateral generate_series(1,c.top_round)n;

insert into matches(round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,zapisnik_id,imported_at)
select r.id,home.team_id,away.team_id,r.played_on,0,0,
       'sfl-calendar-'||c.id||'-'||r.number,now()
from sfl_test_competitions c join rounds r on r.competition_id=c.id
join sfl_test_clubs home on home.slug=c.slug and home.club_no=1
join sfl_test_clubs away on away.slug=c.slug and away.club_no=2
where r.number in (1,2,3,c.top_round-3,c.top_round-2,c.top_round-1);
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off)
select m.id,p.id,p.team_id,(club.club_no=1),case when club.club_no=1 then 90 else 15 end,
       case when club.club_no=1 then 0 else 75 end,90
from matches m join rounds r on r.id=m.round_id join sfl_test_competitions c on c.id=r.competition_id
join sfl_test_clubs club on club.slug=c.slug and club.team_id in (m.home_team_id,m.away_team_id)
join lateral (select p0.id,p0.team_id from players p0 where p0.competition_id=c.id and p0.team_id=club.team_id order by p0.id limit 1) p on true;

-- The selected gap and final rounds need real, clean future fixtures. Insert
-- these after historical appearances so they remain empty and unplayed.
insert into matches(round_id,home_team_id,away_team_id,played_on)
select r.id,home.team_id,away.team_id,r.played_on
from sfl_test_competitions c join rounds r on r.competition_id=c.id
join sfl_test_clubs home on home.slug=c.slug and home.club_no=1
join sfl_test_clubs away on away.slug=c.slug and away.club_no=2
where r.number in (c.gap_round,c.top_round);

create function pg_temp.sfl_expect(p_slug text,p_activate boolean,p_round int,p_reason text default null)
returns void language plpgsql as $$
declare result jsonb;
begin
 result:=public.vklopi_ligo_sredi_sezone(p_slug);
 if (result->>'vklopljena')::boolean is distinct from p_activate
    or (p_round is not null and (result->>'prvi_krog')::int is distinct from p_round)
    or (p_reason is not null and result->>'razlog' not like p_reason) then
   raise exception 'SFL CALENDAR TEST: unexpected native RPC result for %: %',p_slug,result;
 end if;
 if (select active from competitions where slug=p_slug) is distinct from p_activate then
   raise exception 'SFL CALENDAR TEST: RPC persisted unexpected active state for %',p_slug;
 end if;
end $$;

-- Both exact tuples activate through the actual service-only native RPC.
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',true,14);
select pg_temp.sfl_expect('gb-sfl-d1-south',true,15);
reset role;

-- Each selected first round must have an unlocked, clean future fixture.
update competitions set active=false where slug='gb-sfl-d1-central';
update rounds set lineups_locked_at=now()
where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=14;
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,14,'%unlocked, empty future fixture round.%');
reset role;
update rounds set lineups_locked_at=null
where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=14;

delete from matches where round_id=(select id from rounds where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=14);
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,14,'%unlocked, empty future fixture round.%');
reset role;
insert into matches(round_id,home_team_id,away_team_id,played_on,zapisnik_id)
select r.id,h.team_id,a.team_id,r.played_on,'sfl-calendar-future-'||c.id||'-14'
from sfl_test_competitions c join rounds r on r.competition_id=c.id and r.number=14
join sfl_test_clubs h on h.slug=c.slug and h.club_no=1
join sfl_test_clubs a on a.slug=c.slug and a.club_no=2
where c.slug='gb-sfl-d1-central';
update matches set home_goals=1 where round_id=(select id from rounds where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=14);
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,14,'%unlocked, empty future fixture round.%');
reset role;
update matches set home_goals=0,imported_at=now()
where round_id=(select id from rounds where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=14);
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,14,'%unlocked, empty future fixture round.%');
reset role;
update matches set imported_at=null
where round_id=(select id from rounds where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=14);

-- Repeated variants leave the legacy >2 played-round rule intact.
update competitions set active=false,slug='sfl-calendar-generic-test',source='isthmian',
  source_league_code='sfl/69d0be24b616bafb97331d42/2026-27'
where id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central');
set local role service_role;
select pg_temp.sfl_expect('sfl-calendar-generic-test',true,32);
reset role;
update competitions set active=false,slug='gb-sfl-d1-central',source='wrong-source',
  source_league_code='sfl/69d0be24b616bafb97331d42/2026-27'
where id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central');
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',true,32);
reset role;
update competitions set active=false,source='isthmian',source_league_code='wrong-code'
where id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central');
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',true,32);
reset role;
update competitions set active=false,source='isthmian',source_league_code=null
where id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central');
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',true,32);
reset role;
update competitions set active=false,source='isthmian',source_league_code='sfl/69d0be24b616bafb97331d42/2026-27'
where id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central');
update competitions set active=false,source_league_code='wrong-code'
where id=(select id from sfl_test_competitions where slug='gb-sfl-d1-south');
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-south',true,41);
reset role;
update competitions set active=false,source_league_code='sfl/69d0bdf9b616bafb97331d41/2026-27'
where id=(select id from sfl_test_competitions where slug='gb-sfl-d1-south');

-- A played higher round with a future or unknown deadline is an explicit HOLD.
update rounds set deadline_at=now()+interval '1 day'
where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=31;
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,null,'Played higher round still has a future deadline.%');
reset role;
update rounds set deadline_at=null
where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=31;
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,null,'Played higher round still has a future deadline.%');
reset role;
update rounds set deadline_at=now()-interval '5 days'+31*interval '1 minute'
where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central') and number=31;

-- An existing fantasy team blocks the calendar exception.
insert into auth.users(id,email,raw_user_meta_data,created_at)
values('b8a06635-2322-4444-8c42-44e419f912ae','sfl-calendar@example.invalid','{"display_name":"SFL Calendar"}',now());
insert into fantasy_teams(owner_id,competition_id,name)
select 'b8a06635-2322-4444-8c42-44e419f912ae',id,'SFL calendar existing team'
from competitions where slug='gb-sfl-d1-central';
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,null,'%requires no existing fantasy teams or lineups.%');
reset role;
delete from fantasy_teams where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central');
-- The schema does not enforce a competition match between lineup.round_id and
-- lineup.fantasy_team_id. A cross-competition row isolates the lineup branch
-- while leaving the target competition with no fantasy team of its own.
insert into fantasy_teams(owner_id,competition_id,name)
select 'b8a06635-2322-4444-8c42-44e419f912ae',id,'SFL calendar lineup team'
from competitions where slug='gb-sfl-d1-south';
insert into fantasy_lineups(round_id,fantasy_team_id,player_id,is_starter)
select r.id,ft.id,p.id,true from rounds r join competitions c on c.id=r.competition_id
join competitions owner_comp on owner_comp.slug='gb-sfl-d1-south'
join fantasy_teams ft on ft.competition_id=owner_comp.id
join players p on p.competition_id=c.id
where c.slug='gb-sfl-d1-central' and r.number=14 order by p.id limit 1;
select pg_temp.sfl_assert(not exists(select 1 from fantasy_teams where competition_id=(select id from sfl_test_competitions where slug='gb-sfl-d1-central')),
  'lineup-only case has no fantasy team in target competition');
set local role service_role;
select pg_temp.sfl_expect('gb-sfl-d1-central',false,null,'%requires no existing fantasy teams or lineups.%');
reset role;

-- Exercise the old readiness trigger directly on a separate invalid inactive
-- competition. The normal activation RPC above also traversed it successfully.
insert into competitions(slug,name,short_name,country_id,source)
values('sfl-calendar-invalid-readiness','SFL invalid readiness','SFL invalid',
       (select id from countries where code='GB'),'isthmian');
do $$
declare rejected boolean:=false;
begin
 begin
  update competitions set active=true where slug='sfl-calendar-invalid-readiness';
 exception when others then
  if sqlerrm not like 'Lige ni mogoče vklopiti:%' then raise; end if;
  rejected:=true;
 end;
 perform pg_temp.sfl_assert(rejected,'existing readiness trigger rejects a direct activation with no rounds or roster');
 perform pg_temp.sfl_assert(not (select active from competitions where slug='sfl-calendar-invalid-readiness'),
   'failed direct activation leaves competition inactive');
end $$;

rollback;
