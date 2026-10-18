-- Behavioral tests run against the production SQL helpers on disposable migrated
-- data, with every ordinary trigger enabled. Fixture statistics are synthetic.
create function pg_temp.g13_test_snapshot() returns jsonb language sql as $$
 select jsonb_build_object(
  'competitions',(select jsonb_agg(to_jsonb(t) order by id) from competitions t),
  'teams',(select jsonb_agg(to_jsonb(t) order by id) from teams t),
  'players',(select jsonb_agg(to_jsonb(t) order by id) from players t),
  'rounds',(select jsonb_agg(to_jsonb(t) order by id) from rounds t),
  'matches',(select jsonb_agg(to_jsonb(t) order by id) from matches t),
  'appearances',(select jsonb_agg(to_jsonb(t) order by id) from appearances t),
  'goals',(select jsonb_agg(to_jsonb(t) order by id) from goals t),
  'scores',(select jsonb_agg(to_jsonb(t) order by round_id,player_id) from player_scores t),
  'stats',(select jsonb_agg(to_jsonb(t) order by player_id,competition_id,season) from statistika_igralcev t),
  'assistVotes',(select jsonb_agg(to_jsonb(t) order by id) from assist_votes t),
  'profiles',(select jsonb_agg(to_jsonb(t) order by player_id) from profil_igralca_plus t),
  'absences',(select jsonb_agg(to_jsonb(t) order by id) from uradne_odsotnosti t),
  'points',(select jsonb_agg(to_jsonb(t) order by round_id,fantasy_team_id) from tocke_krogov t));
$$;
create function pg_temp.g13_reject(label text, mutation text, approved text default null, strategy text default 'preflight') returns void language plpgsql as $$
declare old jsonb; mutated jsonb; failed boolean:=false; digest text;
begin
 old:=pg_temp.g13_test_snapshot();
 digest:=coalesce(approved,pg_temp.fcf_g13_repair(false,null)->>'sha256');
 begin
  execute mutation;
  mutated:=pg_temp.g13_test_snapshot();
  begin
   if approved is null and strategy='preflight' then
    perform pg_temp.fcf_g13_repair(false,null);
   else
    if strategy='apply' then digest:=pg_temp.fcf_g13_repair(false,null)->>'sha256';end if;
    perform pg_temp.fcf_g13_repair(true,digest);
   end if;
  exception when others then
   if sqlerrm not like 'G13:%' then raise; end if;
   failed:=true;
  end;
  if not failed then raise exception 'Accepted unsafe repair: %',label; end if;
  if pg_temp.g13_test_snapshot()<>mutated then raise exception 'Partial writes: %',label; end if;
  raise exception using errcode='P9998',message='rollback test mutation';
 exception when sqlstate 'P9998' then null;
 end;
 if old<>pg_temp.g13_test_snapshot() then raise exception 'Fixture changed: %',label; end if;
 raise notice 'PASS %',label;
end;
$$;
do $$ declare old jsonb; a jsonb; b jsonb; begin
 if (select count(*) from assist_votes v join goals g on g.id=v.goal_id
     where v.voter_id='00000000-0000-4000-8000-000000000013'
       and g.match_id=427263 and g.team_id=10388 and g.minute=12
       and not g.is_penalty and not g.is_own_goal
       and g.assist_player_id is null and g.assist_none_confirmed_at is null)<>1
 then raise exception 'Fixture requires one vote on an eligible ordinary R5 goal';end if;
 old:=pg_temp.g13_test_snapshot();
 a:=pg_temp.fcf_g13_repair(false,null); b:=pg_temp.fcf_g13_repair(false,null);
 if old<>pg_temp.g13_test_snapshot() or a->>'sha256'<>b->>'sha256' then raise exception 'Preview changed data or unstable hash'; end if;
 if jsonb_array_length(a->'deletions')<>32 or jsonb_array_length(a->'survivors')<>240 then raise exception 'Incomplete preview'; end if;
 raise notice 'PASS deterministic preview without production DML';
end $$;
select pg_temp.g13_reject('wrong digest','select 1',repeat('0',64));
select pg_temp.g13_reject('nonzero home score on drop','update matches set home_goals=1 where id=427258');
select pg_temp.g13_reject('nonzero away score on drop','update matches set away_goals=1 where id=427258');
select pg_temp.g13_reject('imported reported 0:0 on drop', $$update matches set home_goals=0,away_goals=0,zapisnik_id='es999999998',imported_at=now() where id=427258$$);
select pg_temp.g13_reject('warning on drop', $$update matches set import_warnings=array['test warning'] where id=427258$$);
select pg_temp.g13_reject('awarded drop','update matches set kontumacija=true where id=427258');
select pg_temp.g13_reject('new report on drop', $$update matches set zapisnik_id='es999999999' where id=427258$$);
select pg_temp.g13_reject('new import on drop','update matches set imported_at=now() where id=427258');
select pg_temp.g13_reject('dependent appearance','insert into appearances(match_id,team_id,player_id) values(427258,10388,313535)');
select pg_temp.g13_reject('dependent goal','insert into goals(match_id,team_id,scorer_id) values(427258,10388,313535)');
select pg_temp.g13_reject('dependent highlighted profile', $$insert into appearances(match_id,team_id,player_id) values(427258,10388,313535); update profil_igralca_plus set tekma_id=427258 where player_id=313535; delete from appearances where match_id=427258$$);
select pg_temp.g13_reject('dependent absence', 'update uradne_odsotnosti set ni_drzalo_match_id=427258 where player_id=313535');
select pg_temp.g13_reject('nonfootball club dependency', $$insert into klub_predstavitev(team_id,opis) values(8371,'Test only')$$);
select pg_temp.g13_reject('new fantasy team', $$insert into fantasy_teams(owner_id,name,competition_id) values('00000000-0000-4000-8000-000000000013','G13 TEST ONLY',801)$$);
select pg_temp.g13_reject('extra active club', $$insert into teams(id,name,country_id) overriding system value values(-613,'G13 TEST EXTRA',(select id from countries where code='ES')); insert into players(team_id,competition_id,first_name,last_name,position,value) values(-613,801,'TEST','EXTRA','MID',4.5)$$);
select pg_temp.g13_reject('foreign competition player', 'update players set competition_id=(select min(id) from competitions where id<>801) where id=313535');
select pg_temp.g13_reject('foreign season', $$update rounds set season='2025/26' where id=27943$$);
select pg_temp.g13_reject('club appearance linked to foreign player','update appearances set player_id=(select min(id) from players where team_id=8373) where id=(select min(id) from appearances where team_id=10388)');
select pg_temp.g13_reject('changed registration', 'update players set reg_st=999999999 where id=313535');
select pg_temp.g13_reject('changed price digest', 'update players set value=value+0.5 where id=313535',null,'drift');
select pg_temp.g13_reject('changed opponent appearance digest', 'update appearances set yellow_cards=yellow_cards+1 where id=(select min(id) from appearances where team_id=8372)',null,'drift');
select pg_temp.g13_reject('changed derived statistics digest','update statistika_igralcev set points=points+1 where player_id=313535',null,'drift');
select pg_temp.g13_reject('changed fixture date', $$update matches set played_on=played_on+1 where id=427267$$);
-- This wrong opponent is FK-valid, non-self and unique within R8. Reversing
-- the pair would collide with the still-present surplus match309381.
select pg_temp.g13_reject('invalid calendar opponent', 'update matches set home_team_id=8372 where id=427267');
select pg_temp.g13_reject('unrecognized foreign key', 'create table public.g13_unknown_dependency(id int, team_id bigint references teams)');
select pg_temp.g13_reject('installed historical policy', $$insert into private_historical_statistics.installed_policies(competition_id,policy_id,policy_sha256,first_fantasy_played_on) select 801,id,policy_sha256,current_date+7 from private_historical_statistics.policies where id='es-fcf-segona-g1-history-2026-10-18-v1'$$);
select pg_temp.g13_reject('bound historical club', $$update private_historical_statistics.source_club_bindings set bound_team_id=8371 where provider='fcf' and source_club_id='5042'$$);
select pg_temp.g13_reject('target release receipt', $$insert into private_fcf_target_release.receipts(competition_id,inventory_key,packet_sha256,packet_text,rollout_text,rollout_sha256,source_fingerprint,cleanup_before_sha256,imported_state_sha256,stage)values(801,'test','test','{}','{}','test','test','test','test','imported')$$);
select pg_temp.g13_reject('target native club binding', $$insert into private_fcf_target_release.club_bindings(competition_id,club_id,category_id,team_id,country_id,source_fingerprint)values(801,'test','test',8371,(select country_id from competitions where id=801),'test')$$);
select pg_temp.g13_reject('Scout non-FK dependency', $$insert into scout.dnevnik(team_id,vrsta) values(10388,'isci')$$);
-- A trigger is allowed to run, but not silently corrupt a protected field.
create function pg_temp.g13_corrupt_test() returns trigger language plpgsql as $$
begin new.value:=new.value+1;return new;end $$;
select pg_temp.g13_reject('trigger semantic side effect', $$create trigger g13_test_corruption before update of team_id on players for each row execute function pg_temp.g13_corrupt_test()$$,null,'apply');
do $$ declare a jsonb; old jsonb; expected jsonb; after_state jsonb; kind text; removed bigint[]; begin
 old:=pg_temp.g13_test_snapshot();
 a:=pg_temp.fcf_g13_repair(false,null);
 a:=pg_temp.fcf_g13_repair(true,a->>'sha256');
 if a->>'mode'<>'apply' or a->>'protectedEqual'<>'true' or a->'changes'<>'{"matchesDeleted":32,"players":15,"matches":1,"appearances":15,"goals":2,"teamsDeleted":1}'::jsonb then raise exception 'Incorrect apply artifact';end if;
 if (select count(*) from matches where round_id in(select id from rounds where competition_id=801))<>240
  or exists(select 1 from teams where id=10388)
  or (select count(*) from appearances where match_id in(309307,309324,309335,309352,427263))<>160
  or (select count(*) from appearances where team_id=8371)<>80
  or (select count(*) from goals where team_id=8371)<>14
  or (select count(*) from players where team_id=8371)<>21 then raise exception 'Incorrect result';end if;
 if not exists(select 1 from matches where id=427267 and home_team_id=8385 and away_team_id=8378)
  or not exists(select 1 from matches where id=427282 and home_team_id=8378 and away_team_id=8385) then raise exception 'Lost proven orientations';end if;
 if (select count(*) from assist_votes v join goals g on g.id=v.goal_id
     where v.voter_id='00000000-0000-4000-8000-000000000013'
       and g.match_id=427263 and g.team_id=8371 and g.minute=12
       and not g.is_penalty and not g.is_own_goal)<>1
 then raise exception 'Vote lost its retained ordinary goal after team repair';end if;
 -- Independently compare every player field, not merely counts or repair's flag.
 select jsonb_agg(case when (p->>'team_id')::bigint=10388 then p||'{"team_id":8371}'::jsonb else p end order by (p->>'id')::bigint) into expected from jsonb_array_elements(old->'players')p;
 after_state:=pg_temp.g13_test_snapshot();
 if expected<>(after_state->'players') then raise exception 'Player fields changed';end if;
 foreach kind in array array['appearances','goals'] loop
  select jsonb_agg(case when (j->>'team_id')::bigint=10388 then j||'{"team_id":8371}'::jsonb else j end order by (j->>'id')::bigint) into expected from jsonb_array_elements(old->kind)j;
  if expected<>after_state->kind then raise exception 'Protected % changed',kind;end if;
 end loop;
 foreach kind in array array['competitions','rounds','scores','stats','points','assistVotes','profiles','absences'] loop
  if old->kind is distinct from after_state->kind then raise exception 'Protected % changed',kind;end if;
 end loop;
 select array_agg((j->>'id')::bigint order by (j->>'id')::bigint) into removed from jsonb_array_elements(old->'matches')j where not exists(select 1 from matches m where m.id=(j->>'id')::bigint);
 if removed<>array[309356,309381,309527,427258,427259,427261,427262,427264,427265,427266,427268,427269,427270,427271,427272,427273,427274,427275,427276,427277,427278,427279,427280,427281,427283,427284,427285,427286,427288,427289,427290,427291]::bigint[] then raise exception 'Wrong exact deletions';end if;
 select jsonb_agg(j||jsonb_build_object('home_team_id',case when j->>'home_team_id'='10388' then 8371 else (j->>'home_team_id')::bigint end,'away_team_id',case when j->>'away_team_id'='10388' then 8371 else (j->>'away_team_id')::bigint end) order by (j->>'id')::bigint) into expected from jsonb_array_elements(old->'matches')j where not (j->>'id')::bigint=any(removed);
 if expected<>after_state->'matches' then raise exception 'Retained match fields changed';end if;
 begin perform pg_temp.fcf_g13_repair(false,null);raise exception 'Replay accepted';
 exception when others then if sqlerrm not like 'G13:%' then raise;end if;end;
 raise notice 'PASS exact atomic apply, protected values, both inversions and replay rejection';
end $$;
