begin;
insert into competitions(id,slug,name,short_name,active,country_id,source) overriding system value
values(-917001,'test-zlite-keep','Test keep','TK',false,(select id from countries where code='ME'),'fscg');
insert into teams(id,name,short_name,country_id) overriding system value
select -917000-n,'Test keep club '||n,'TK'||n,(select id from countries where code='ME') from generate_series(1,3)n;
insert into rounds(id,season,number,deadline_at,competition_id,played_on) overriding system value
values(-917001,'2099/00',1,now()-interval '1 day',-917001,current_date-2),
      (-917002,'2099/00',2,now()-interval '1 day',-917001,current_date-1);
insert into matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,imported_at) overriding system value
values(-917011,-917001,-917001,-917003,current_date-2,0,0,now()),
      (-917012,-917001,-917002,-917003,current_date-2,1,0,now()),
      (-917013,-917002,-917002,-917003,current_date-1,0,0,now());
insert into players(id,team_id,competition_id,first_name,last_name,full_name,position_source,active) overriding system value
values(-917001,-917002,-917001,'Stefan','Test','Stefan Test','neznano',true),
      (-917002,-917002,-917001,'Stefan','Test','Stefan Test','neznano',true);
insert into appearances(match_id,player_id,team_id,started,minutes_played,goals)
values(-917011,-917001,-917001,true,90,0),(-917012,-917001,-917002,true,90,1);
insert into appearances(match_id,player_id,team_id,started,minutes_played)
values(-917013,-917002,-917002,true,90);
insert into goals(id,match_id,scorer_id,team_id,minute) overriding system value
values(-917001,-917012,-917001,-917002,10);

create function pg_temp.zlite_assert(p_label text, p_ok boolean) returns void language plpgsql as $$
begin if not coalesce(p_ok,false) then raise exception 'ZLITE_TEST: %',p_label; end if; end$$;
create function pg_temp.zlite_reject(p_label text, p_call text) returns void language plpgsql as $$
begin
  begin
    execute p_call;
    raise exception 'ZLITE_TEST: unexpectedly accepted %',p_label;
  exception when others then
    if sqlerrm like 'ZLITI_KEEP:%' then return; end if;
    if sqlerrm like 'ZLITE_TEST:%' then raise; end if;
    raise exception 'ZLITE_TEST: % failed for an unexpected reason: %',p_label,sqlerrm;
  end;
end$$;

insert into auth.users(id,email,raw_user_meta_data,created_at)
values('b8a06635-2322-4444-8c42-44e419f912ab','zlite-keep-test@example.invalid','{"display_name":"Zlite test"}',now());
select pg_temp.zlite_assert('new function ACL is service-only',
 not has_function_privilege('anon','public.razdeli_zlitega_igralca(bigint,boolean,bigint)','execute')
 and not has_function_privilege('authenticated','public.razdeli_zlitega_igralca(bigint,boolean,bigint)','execute')
 and has_function_privilege('service_role','public.razdeli_zlitega_igralca(bigint,boolean,bigint)','execute'));
alter table competitions disable trigger varovalo_vklopa_lige;
update competitions set active=true where id=-917001;
select pg_temp.zlite_reject('active competition override', $$select razdeli_zlitega_igralca(-917001,false,-917001)$$);
update competitions set active=false where id=-917001;
alter table competitions enable trigger varovalo_vklopa_lige;
update players set reg_st=917001 where id=-917001;
select pg_temp.zlite_assert('registered player override remains skipped',
 (razdeli_zlitega_igralca(-917001,false,-917001)->>'stanje')='sifra');
update players set reg_st=null where id=-917001;
insert into fantasy_teams(id,owner_id,name,competition_id) overriding system value
values(-917001,'b8a06635-2322-4444-8c42-44e419f912ab','Keep test',-917001);
insert into fantasy_roster(fantasy_team_id,player_id,is_starter,buy_position,buy_value)
values(-917001,-917001,true,'MID',6);
select pg_temp.zlite_reject('fantasy-owned player override', $$select razdeli_zlitega_igralca(-917001,false,-917001)$$);
delete from fantasy_roster where fantasy_team_id=-917001;
delete from fantasy_teams where id=-917001;
insert into fantasy_teams(id,owner_id,name,competition_id) overriding system value
values(-917001,'b8a06635-2322-4444-8c42-44e419f912ab','Empty team test',-917001);
select pg_temp.zlite_reject('competition fantasy team without player roster', $$select razdeli_zlitega_igralca(-917001,false,-917001)$$);
delete from fantasy_teams where id=-917001;
insert into fantasy_teams(id,owner_id,name,competition_id) overriding system value
values(-917001,'b8a06635-2322-4444-8c42-44e419f912ab','Lineup team test',-917001);
insert into fantasy_lineups(round_id,fantasy_team_id,player_id,is_starter)
values(-917002,-917001,-917002,true);
select pg_temp.zlite_reject('competition lineup for destination peer', $$select razdeli_zlitega_igralca(-917001,false,-917001)$$);
delete from fantasy_lineups where round_id=-917002 and fantasy_team_id=-917001;
delete from fantasy_teams where id=-917001;
select pg_temp.zlite_reject('non-conflicting keep club', $$select razdeli_zlitega_igralca(-917001,false,-917003)$$);
update players set reg_st=917002 where id=-917002;
select pg_temp.zlite_reject('no eligible destination namesake', $$select razdeli_zlitega_igralca(-917001,true,-917001)$$);
update players set reg_st=null where id=-917002;
select pg_temp.zlite_assert('failed apply does not create a third namesake',
 (select count(*)=2 from players where competition_id=-917001 and full_name='Stefan Test'));
insert into appearances(match_id,player_id,team_id,started,minutes_played) values(-917012,-917002,-917002,true,1);
select pg_temp.zlite_reject('same-match destination overlap', $$select razdeli_zlitega_igralca(-917001,false,-917001)$$);
delete from appearances where match_id=-917012 and player_id=-917002;
insert into players(id,team_id,competition_id,first_name,last_name,full_name,position_source,active) overriding system value
values(-917003,-917002,-917001,'Stefan','Test','Stefan Test','neznano',true);
select pg_temp.zlite_reject('ambiguous namesake destination', $$select razdeli_zlitega_igralca(-917001,false,-917001)$$);
delete from players where id=-917003;

select pg_temp.zlite_assert('dry run selects requested club without writes',
 (razdeli_zlitega_igralca(-917001,false,-917001)->'ohrani'->>'klub')='-917001'
 and (select count(*)=2 from appearances where player_id=-917001));
select pg_temp.zlite_assert('legacy two-argument route still chooses players.team_id',
 (razdeli_zlitega_igralca(-917001,false)->'ohrani'->>'klub')='-917002'
 and (select count(*)=2 from appearances where player_id=-917001));
select pg_temp.zlite_assert('apply reuses sole existing peer and preserves target club id',
 (razdeli_zlitega_igralca(-917001,true,-917001)->>'stanje')='razdeljen'
 and (select count(*)=1 from appearances where player_id=-917001 and team_id=-917001)
 and (select count(*)=2 from appearances where player_id=-917002 and team_id=-917002)
 and (select scorer_id=-917002 from goals where id=-917001)
 and (select count(*)=3 from appearances)
 and (select count(*)=1 from goals));
select pg_temp.zlite_assert('statistics remain split by club',
 (select count(*)=1 from statistika_igralcev where player_id=-917001 and matches=1)
 and (select count(*)=1 from statistika_igralcev where player_id=-917002 and matches=2));

rollback;
