// TEST ONLY synthetic source/private-reader replay and native fixture SQL.
// No real source proof, current history, provider call or production authority.
import{execFileSync}from'node:child_process'
import{isolatedNative800Tree,native800Documents}from'./fcf-g1-native800-test-fixture.mjs'
const literal=x=>"'"+String(x).replaceAll("'","''")+"'"
export function syntheticG1Native800SQLSource(t){const root=isolatedNative800Tree(t),raw=execFileSync(process.execPath,['scripts/fcf-g1-native800-fixture-runner.mjs'],{cwd:root,input:JSON.stringify({documents:native800Documents(),variant:'good',mode:'sql-data'}),encoding:'utf8',maxBuffer:33554432,timeout:120000});const out=JSON.parse(raw.trim().split('\n').findLast(x=>x.startsWith('{')));if(!out.ok||out.actualHistoryAuthority!==false||out.actualProviderRequests!==0||out.sourceData?.fixtures?.length!==240)throw Error('TEST ONLY G1 SQL fixture requires complete synthetic private-reader source DATA');return out.sourceData}
export function g1Native800SetupSQL(source){return `-- TEST ONLY complete synthetic source; SQL timestamps below are fixture clocks, never actual source authority.
create temporary table g1_source(d jsonb);insert into g1_source values(${literal(JSON.stringify(source))}::jsonb);
create temporary table g1_clubs(club text,category text,team bigint,source_name text,canonical_name text,primary key(club,category));
create temporary table g1_fixture(id text primary key,doc jsonb,mid bigint,rid bigint,home bigint,away bigint);
DO $seed$declare c jsonb;f jsonb;r bigint;h bigint;a bigint;m bigint;k bigint;row_native matches;name_native text;begin
 for c in select value from g1_source cross join lateral jsonb_array_elements(d->'clubs')loop
  select (x->>case when x#>>'{fixture,homeSourceClubId}'=c->>'sourceClubId'and x#>>'{fixture,homeSourceCategoryId}'=c->>'sourceCategoryId'then 'homeTeamId'else 'awayTeamId'end)::bigint into k from jsonb_array_elements(public.get_installed_historical_statistics_markers(783)->'markers')x where(x#>>'{fixture,homeSourceClubId}'=c->>'sourceClubId'and x#>>'{fixture,homeSourceCategoryId}'=c->>'sourceCategoryId')or(x#>>'{fixture,awaySourceClubId}'=c->>'sourceClubId'and x#>>'{fixture,awaySourceCategoryId}'=c->>'sourceCategoryId')limit 1;
  if k is null then k:=991000000+(select count(*)from g1_clubs)+1;insert into teams(id,name,short_name,country_id)overriding system value values(k,c->>'name','TEST',(select country_id from competitions where id=783));end if;select name into name_native from teams where id=k;insert into g1_clubs values(c->>'sourceClubId',c->>'sourceCategoryId',k,c->>'name',name_native);
 end loop;
 for f in select value from g1_source cross join lateral jsonb_array_elements(d->'fixtures')order by value->>'id'loop
  select id into r from rounds where competition_id=783 and season='2026/27'and number=(f->>'round')::int;
  if r is null then r:=992000000+(f->>'round')::int;insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value values(r,783,'2026/27',(f->>'round')::int,(f->>'date')::date,((f->>'date')::date+(f->>'time')::time)at time zone'Europe/Madrid');end if;
  -- Historical-only fixture prerequisites, never a production deadline repair.
  update rounds set deadline_at=coalesce(deadline_at,((f->>'date')::date+(f->>'time')::time)at time zone'Europe/Madrid')where id=r;
  select team into h from g1_clubs where club=f#>>'{clubs,0,sourceClubId}'and category=f#>>'{clubs,0,sourceCategoryId}';select team into a from g1_clubs where club=f#>>'{clubs,1,sourceClubId}'and category=f#>>'{clubs,1,sourceCategoryId}';
  select id into m from matches where zapisnik_id=f->>'id';
  if m is null then m:=993000000+substring(f->>'id'from 3)::bigint-4109388;insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,home_goals,away_goals,vir_brez_izida)overriding system value values(m,r,h,a,(f->>'date')::date,case when f->>'id'not in('es4109409','es4109410')then f->>'id'end,case when f->>'id'in('es4109409','es4109410')then'https://www.fcf.cat/ca/competicio/acta/4109388'else f#>>'{source,sourceUrl}'end,0,0,f->>'id'in('es4109409','es4109410'));end if;
  insert into g1_fixture values(f->>'id',f,m,r,h,a);
 end loop;
 if(select count(*)from g1_clubs)<>16 or(select count(*)from g1_fixture)<>240 then raise exception 'TEST ONLY incomplete native G1 fixture';end if;
end$seed$;
-- Seed nonzero selected derived rows under the real unchanged score rules.
DO $points$declare f record;app jsonb;pid bigint;begin select *into f from g1_fixture where doc->>'statisticsStatus'='available'order by id limit 1;app:=f.doc#>'{appearances,0}';insert into players(competition_id,team_id,reg_st,full_name,first_name,last_name,position,position_source)values(783,case when app->>'ekipaIdx'='0'then f.home else f.away end,(app->>'regSt')::bigint,app->>'ime',split_part(app->>'ime',' ',1),coalesce(nullif(substring(app->>'ime' from position(' ' in (app->>'ime'))+1),''),app->>'ime'),'GK','zapisnik')on conflict(competition_id,reg_st)where reg_st is not null do update set position='GK',position_source='zapisnik'returning id into pid;insert into appearances(match_id,player_id,team_id,minutes_played,minute_on,minute_off,started,is_goalkeeper,clean_sheet,goals_conceded)values(f.mid,pid,case when app->>'ekipaIdx'='0'then f.home else f.away end,90,0,90,true,true,true,0);perform recompute_round_scores(f.rid);end$points$;
-- Deliberately noncanonical OFFTARGET G9 score remains full exact beforeimage DATA.
insert into player_scores(round_id,player_id,points,computed_at)select(select min(id)from rounds where competition_id=797),(select min(id)from players where competition_id=797),6.5,'2026-10-01T12:00Z'where exists(select 1 from players where competition_id=797)on conflict(round_id,player_id)do update set points=6.5,computed_at='2026-10-01T12:00Z';

-- TEST ONLY: the unchanged G9 competition activation trigger requires an
-- ordinary legal squad, pricing spread, substitute appearance and scorer link.
-- Construct these disposable G9 prerequisites before the actual G1 writer
-- runs; they are fixture data and are rolled back with this hosted test.
create temporary table g9_synthetic_roster(slot int primary key,player_id bigint,team_id bigint,position text,value numeric);
create temporary table g9_existing_players as select id,to_jsonb(p) as row from players p where competition_id=797;
create temporary table g9_existing_scores as select ps.id,to_jsonb(ps) as row from player_scores ps join players p on p.id=ps.player_id where p.competition_id=797;
DO $g9_roster$declare ts bigint[];q record;tid bigint;pid bigint;bench bigint;g9match bigint;home bigint;away bigint;goal_team bigint;home_score int;away_score int;begin
 select array_agg(team_id order by team_id)into ts from(select distinct team_id from(select m.home_team_id team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=797 and r.season='2026/27' union select m.away_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=797 and r.season='2026/27')x)y;
 if coalesce(cardinality(ts),0)<5 then raise exception 'G1 TEST: five existing G9 fixture clubs required for ordinary synthetic legal15';end if;
 for q in select *from(values(1,'GK',8::numeric),(2,'DEF',7),(3,'FWD',8),(4,'GK',6),(5,'DEF',4.5),(6,'FWD',4.5),(7,'DEF',7),(8,'MID',4.5),(9,'FWD',4.5),(10,'DEF',4.5),(11,'MID',9),(12,'MID',4.5),(13,'DEF',4.5),(14,'MID',6),(15,'MID',4.5),(16,'MID',4.5))v(slot,position,value)order by slot loop
  tid:=ts[case when q.slot=16 then 1 else ceil(q.slot/3.0)::int end];
  insert into players(competition_id,team_id,first_name,last_name,full_name,position,position_source,active,value,value_start)
   values(797,tid,'TEST ONLY','G9 roster '||q.slot,'TEST ONLY G9 roster '||q.slot,q.position,'zapisnik',true,q.value,q.value)returning id into pid;
  insert into g9_synthetic_roster values(q.slot,pid,tid,q.position,q.value);
 end loop;
 insert into position_priors(player_id,position,score)select player_id,'MID',0.5 from g9_synthetic_roster where slot=1 on conflict(player_id,position)do nothing;
 if(select count(*)from g9_synthetic_roster where slot<=15 and position='GK')<>2 or(select count(*)from g9_synthetic_roster where slot<=15 and position='DEF')<>5 or(select count(*)from g9_synthetic_roster where slot<=15 and position='MID')<>5 or(select count(*)from g9_synthetic_roster where slot<=15 and position='FWD')<>3 then raise exception 'G1 TEST: synthetic G9 roster is not legal 15';end if;
 if(select count(*)from g9_synthetic_roster)<>16 or exists(select 1 from g9_synthetic_roster s join g9_existing_players e on e.id=s.player_id)or(select count(*)from players where competition_id=797)<>(select count(*)from g9_existing_players)+16 or exists(select 1 from g9_existing_players e left join players p on p.id=e.id where p.id is null or to_jsonb(p) is distinct from e.row)then raise exception 'G1 TEST: append-only synthetic G9 roster changed existing players';end if;
 if(select count(*)from g9_synthetic_roster where value=4.5)<>10 or(select max(value)from g9_synthetic_roster)<8 then raise exception 'G1 TEST: synthetic G9 pricing spread is invalid';end if;
 if(select (st->>'klubov')::int from(select public.stanje_lige(797)st)x)<>16 or public.najcenejsi_kader(public.stanje_lige(797)->'igralci')is null or public.najcenejsi_kader(public.stanje_lige(797)->'igralci')>100 or(select (st->>'najvisja_cena')::numeric from(select public.stanje_lige(797)st)x)<8 or coalesce((select (st->>'privzetih')::numeric/nullif((st->>'aktivnih')::numeric,0)from(select public.stanje_lige(797)st)x),1)>0.7 or(select (st->>'golov_brez_nastopa')::int from(select public.stanje_lige(797)st)x)<>0 then raise exception 'G1 TEST: append-only G9 seed does not satisfy actual legal15 price preconditions';end if;
 select player_id,team_id into bench,tid from g9_synthetic_roster where slot=16;
 select m.id,m.home_team_id,m.away_team_id,m.home_goals,m.away_goals into g9match,home,away,home_score,away_score from matches m join rounds r on r.id=m.round_id where r.competition_id=797 and r.season='2026/27'and( m.home_team_id=tid or m.away_team_id=tid)and not exists(select 1 from appearances a join players p on p.id=a.player_id where a.match_id=m.id and p.competition_id=797)and not exists(select 1 from player_scores ps join players p on p.id=ps.player_id where ps.round_id=r.id and p.competition_id=797)order by m.id limit 1;
 if g9match is null then raise exception 'G1 TEST: synthetic G9 substitute match unavailable';end if;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,is_goalkeeper,clean_sheet,goals_conceded)
  values(g9match,bench,tid,false,60,90,30,false,false,0);
 goal_team:=case when home=tid then home else away end;
 insert into goals(match_id,scorer_id,team_id,minute,is_own_goal,is_penalty,score_home,score_away)
  values(g9match,bench,goal_team,75,false,false,home_score+case when goal_team=home then 1 else 0 end,away_score+case when goal_team=away then 1 else 0 end);
 update matches set home_goals=home_score+case when home=goal_team then 1 else 0 end,away_goals=away_score+case when away=goal_team then 1 else 0 end where id=g9match;
 if not exists(select 1 from appearances a join goals g on g.match_id=a.match_id and g.scorer_id=a.player_id where a.match_id=g9match and a.player_id=bench and not a.started)then raise exception 'G1 TEST: synthetic G9 scorer/substitute link missing';end if;
 if exists(select 1 from g9_existing_scores e left join player_scores ps on ps.id=e.id where ps.id is null or to_jsonb(ps) is distinct from e.row)then raise exception 'G1 TEST: synthetic G9 preexisting scores changed';end if;
end$g9_roster$;

-- TEST ONLY actual lower-level release authorization creates an already-active
-- off-target G9 state; it is not a claim of genuine G9 launch/readiness.
select private_historical_statistics.authorize_release(797,(select policy_id from private_historical_statistics.installed_policies where competition_id=797),(select policy_sha256 from private_historical_statistics.installed_policies where competition_id=797),repeat('d',64));update competitions set active=true where id=797;
insert into auth.users(id,raw_user_meta_data)values('00000000-0000-4000-8000-000000007971','{"display_name":"TEST ONLY existing G9 user"}'::jsonb);
insert into fantasy_teams(owner_id,name,competition_id)values('00000000-0000-4000-8000-000000007971','TEST ONLY G9 existing team',797);
insert into position_votes(player_id,voter_id,position)select min(id),'00000000-0000-4000-8000-000000007971','MID'from players where competition_id=797 having count(*)>0;
`}
