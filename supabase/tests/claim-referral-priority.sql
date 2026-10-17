-- Catches count-based ranking, repeat-team boosts, forged timestamps, and
-- discrepancies between the claimant and administrator views. Real RPCs,
-- role checks and inserts; all fixtures and side effects are rolled back.
begin;
set local statement_timeout = '15s';
create temporary table claim_results (description text, success boolean);
grant select, insert on claim_results to authenticated, anon;
create function pg_temp.check_claim(description text, success boolean) returns void
language plpgsql as $$
begin
  insert into claim_results values (description, coalesce(success, false));
  raise notice '% %', case when success then 'PASS' else 'FAIL' end, description;
end $$;
create function pg_temp.claim_user(n int) returns uuid language sql immutable as $$
  select ('a9410000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid;
$$;
create function pg_temp.claim_denied(description text, command text) returns void
language plpgsql as $$
declare denied boolean := false;
begin
  begin
    execute command;
    raise exception using errcode='P9998';
  exception
    when insufficient_privilege then denied := true;
    when sqlstate 'P9998' then null;
  end;
  perform pg_temp.check_claim(description, denied);
end $$;

grant execute on function pg_temp.check_claim(text, boolean), pg_temp.claim_user(int), pg_temp.claim_denied(text,text) to authenticated, anon;

insert into competitions(id,slug,name,short_name,active,country_id,source) overriding system value
select -941000-n, 'test-claim-'||n, 'Claim test '||n, 'TEST',false,
 (select id from countries where code='SI'),'mnzg' from generate_series(1,3) n;
insert into teams(id,name,short_name,country_id) overriding system value
values(-941001,'Claim test','TEST',(select id from countries where code='SI'));
insert into players(id,team_id,competition_id,first_name,last_name,position,value,value_start) overriding system value
select -941000-n,-941001,-941001,'Claim',n::text,'MID',6,6 from generate_series(1,5) n;
insert into auth.users(id,email,raw_user_meta_data,created_at)
select pg_temp.claim_user(n),'claim-'||n||'@example.invalid','{"display_name":"Claim test"}',now()
from unnest(array[1,2,3,4,5,11,12,13,21,31,41,51,61,99]) n;
update profiles set is_admin=true where id=pg_temp.claim_user(99);
insert into zahtevki_igralca(id,player_id,user_id,created_at) overriding system value
select -941000-n,-941000-n,pg_temp.claim_user(n),now()-make_interval(days=>5-n)
from generate_series(1,4) n;
-- A resolved request remains outside the pending rank.
insert into zahtevki_igralca(id,player_id,user_id,status,potrdil,decided_at) overriding system value
values(-941005,-941005,pg_temp.claim_user(5),'potrjen','admin',now());
insert into kode_vabil(user_id,koda) select pg_temp.claim_user(n),'claim00'||n from generate_series(1,4) n;

-- Literal expected claimant numbers; query each public RPC as authenticated.
create function pg_temp.claim_order(description text, expected int[]) returns void
language plpgsql as $$
declare actual bigint[]; n int; pos int := 0; own_ok boolean := true;
begin
  perform set_config('request.jwt.claim.sub',pg_temp.claim_user(99)::text,true);
  set local role authenticated;
  select array_agg(id) into actual from public.admin_zahtevki_igralcev() where status='cakajoc';
  perform pg_temp.check_claim(description || ' (admin)',
    actual = array(select -941000-x::bigint from unnest(expected) x));
  foreach n in array expected loop
    pos := pos+1;
    perform set_config('request.jwt.claim.sub',pg_temp.claim_user(n)::text,true);
    own_ok := own_ok and (select count(*)=1 and bool_and(zahtevek_id=-941000-n and mesto=pos and v_vrsti=4)
      from public.moje_mesto_v_vrsti());
  end loop;
  perform pg_temp.check_claim(description || ' (own position/visibility)', own_ok);
  reset role;
end $$;
select pg_temp.claim_order('non-referrals are FIFO',array[1,2,3,4]);

-- Signup through the real referral endpoint, before creating a team.
select set_config('request.jwt.claim.sub',pg_temp.claim_user(11)::text,true);
set local role authenticated;
select pg_temp.check_claim('link registration succeeds',zabelezi_povabilo('claim001'));
reset role;
insert into povabila(povabljeni,povabil) values(pg_temp.claim_user(12),pg_temp.claim_user(1)),
 (pg_temp.claim_user(13),pg_temp.claim_user(1)),(pg_temp.claim_user(21),pg_temp.claim_user(2)),
 (pg_temp.claim_user(31),pg_temp.claim_user(3)),(pg_temp.claim_user(61),pg_temp.claim_user(3));
insert into fantasy_teams(owner_id,name,competition_id,hisna)
values(pg_temp.claim_user(31),'House',-941001,true);
select pg_temp.claim_order('signups and house teams do not qualify',array[1,2,3,4]);
insert into fantasy_teams(owner_id,name,competition_id)
values(pg_temp.claim_user(11),'First friend',-941001);
insert into fantasy_teams(owner_id,name,competition_id)
values(pg_temp.claim_user(12),'Second friend',-941001);
select pg_temp.claim_order('older claimant has two qualifying friends',array[1,2,3,4]);
insert into fantasy_teams(owner_id,name,competition_id)
values(pg_temp.claim_user(21),'New friend',-941001);
select pg_temp.claim_order('one new friend beats two older friends',array[2,1,3,4]);
insert into fantasy_teams(owner_id,name,competition_id)
values(pg_temp.claim_user(11),'Extra team',-941002);
select pg_temp.claim_order('extra team cannot reboost the same friend',array[2,1,3,4]);
-- Service-only timestamp/house changes cannot become a new priority event.
update fantasy_teams set created_at=now()+interval '10 years' where owner_id=pg_temp.claim_user(11);
-- House flag changes are already prohibited by varuj_hisno_ekipo.
insert into fantasy_teams(owner_id,name,competition_id) values(pg_temp.claim_user(51),'Transferred',-941001);
update fantasy_teams set owner_id=pg_temp.claim_user(61) where owner_id=pg_temp.claim_user(51);
select pg_temp.claim_order('service edits do not manufacture a fresh event',array[2,1,3,4]);
-- Last human team deletion removes current qualification, but keeps history.
delete from fantasy_teams where owner_id=pg_temp.claim_user(21);
select pg_temp.claim_order('deleted team removes qualification',array[1,2,3,4]);
insert into fantasy_teams(owner_id,name,competition_id)
values(pg_temp.claim_user(21),'Restored original friend',-941001);
select pg_temp.claim_order('restored qualification retains its position',array[2,1,3,4]);
insert into fantasy_teams(owner_id,name,competition_id,created_at)
values(pg_temp.claim_user(13),'Third distinct friend',-941001,now()+interval '10 years');
select pg_temp.claim_order('another distinct friend reboosts claimant',array[1,2,3,4]);
delete from fantasy_teams where owner_id=pg_temp.claim_user(21);
insert into fantasy_teams(owner_id,name,competition_id)
values(pg_temp.claim_user(21),'Recreated team',-941001);
select pg_temp.claim_order('recreated team retains original priority',array[1,2,3,4]);
-- Team-first registration is supported too.
insert into fantasy_teams(owner_id,name,competition_id) values(pg_temp.claim_user(41),'Team first',-941001);
select pg_temp.claim_order('team without referral cannot qualify',array[1,2,3,4]);
select set_config('request.jwt.claim.sub',pg_temp.claim_user(41)::text,true);
set local role authenticated;
select pg_temp.check_claim('link registration after team succeeds',zabelezi_povabilo('claim004'));
reset role;
select pg_temp.claim_order('team-first referral takes first place',array[4,1,2,3]);

select set_config('request.jwt.claim.sub',pg_temp.claim_user(1)::text,true);
set local role authenticated;
select pg_temp.claim_denied('non-admin cannot list claims','select * from admin_zahtevki_igralcev()');
select pg_temp.claim_denied('cannot forge team creation time',
 $$insert into fantasy_teams(owner_id,name,competition_id,created_at) values(auth.uid(),'Forged',-941003,now()+interval '10 years')$$);
select pg_temp.claim_denied('cannot rewrite referrals',
 $$update povabila set created_at=now()+interval '10 years' where povabil=auth.uid()$$);
select pg_temp.claim_denied('referral table stays private','select * from povabila');
reset role;
select set_config('request.jwt.claim.sub',pg_temp.claim_user(5)::text,true);
set local role authenticated;
select pg_temp.check_claim('resolved request has no pending position',not exists(select 1 from moje_mesto_v_vrsti()));
reset role;
set local role anon;
select pg_temp.claim_denied('anonymous queue access rejected','select * from moje_mesto_v_vrsti()');
reset role;

-- Exact priority ties fall back to the original request time, then id.
update povabila set kvalificiran_at=now() where povabljeni in (pg_temp.claim_user(11),pg_temp.claim_user(21),pg_temp.claim_user(41));
update povabila set kvalificiran_at=now()-interval '1 day' where povabljeni in (pg_temp.claim_user(12),pg_temp.claim_user(13));
select pg_temp.claim_order('equal priority uses original claim time',array[1,2,4,3]);
update zahtevki_igralca set created_at=now() where id in (-941001,-941002,-941004);
select pg_temp.claim_order('equal priority and claim time uses id',array[4,2,1,3]);
select set_config('request.jwt.claim.sub',pg_temp.claim_user(1)::text,true);
set local role authenticated;
select pg_temp.claim_denied('cannot forge qualification time',
 $$update povabila set kvalificiran_at=now()+interval '10 years' where povabil=auth.uid()$$);
select pg_temp.claim_denied('private queue helper cannot expose other requests','select * from vrsta_zahtevkov_igralca()');
reset role;

-- Remove referrals to isolate exact claim-time ties (insert order differs from id order).
delete from povabila;
update zahtevki_igralca set created_at=now() where id between -941004 and -941001;
select pg_temp.claim_order('equal claim times break ties by id',array[4,3,2,1]);
do $$ begin
 if exists(select 1 from claim_results where not success) then
   raise exception 'Claim referral regressions: %',(select string_agg(description, '; ') from claim_results where not success);
 end if;
 raise notice 'ALL CLAIM CHECKS PASSED: %',(select count(*) from claim_results);
end $$;
rollback;
