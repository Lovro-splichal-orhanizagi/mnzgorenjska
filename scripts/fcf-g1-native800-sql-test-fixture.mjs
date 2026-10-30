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
DO $points$declare f record;app jsonb;pid bigint;begin select *into f from g1_fixture where doc->>'statisticsStatus'='available'order by id limit 1;app:=f.doc#>'{appearances,0}';insert into players(competition_id,team_id,reg_st,full_name,position,position_source)values(783,case when app->>'ekipaIdx'='0'then f.home else f.away end,(app->>'regSt')::bigint,app->>'ime','GK','zapisnik')on conflict(competition_id,reg_st)where reg_st is not null do update set position='GK',position_source='zapisnik'returning id into pid;insert into appearances(match_id,player_id,team_id,minutes_played,minute_on,minute_off,started,is_goalkeeper,clean_sheet,goals_conceded)values(f.mid,pid,case when app->>'ekipaIdx'='0'then f.home else f.away end,90,0,90,true,true,true,0);perform recompute_round_scores(f.rid);end$points$;
insert into position_priors(player_id,position,score)select min(id),'MID',0.5 from players where competition_id=797 having count(*)>0 on conflict(player_id,position)do nothing;
-- Deliberately noncanonical OFFTARGET G9 score remains full exact beforeimage DATA.
insert into player_scores(round_id,player_id,points,computed_at)select(select min(id)from rounds where competition_id=797),(select min(id)from players where competition_id=797),6.5,'2026-10-01T12:00Z'where exists(select 1 from players where competition_id=797)on conflict(round_id,player_id)do update set points=6.5,computed_at='2026-10-01T12:00Z';

-- TEST ONLY actual lower-level release authorization creates an already-active
-- off-target G9 state; it is not a claim of genuine G9 launch/readiness.
select private_historical_statistics.authorize_release(797,(select policy_id from private_historical_statistics.installed_policies where competition_id=797),(select policy_sha256 from private_historical_statistics.installed_policies where competition_id=797),repeat('d',64));update competitions set active=true where id=797;
insert into auth.users(id,raw_user_meta_data)values('00000000-0000-4000-8000-000000007971','{"display_name":"TEST ONLY existing G9 user"}'::jsonb);
insert into fantasy_teams(owner_id,name,competition_id)values('00000000-0000-4000-8000-000000007971','TEST ONLY G9 existing team',797);
insert into position_votes(player_id,voter_id,position)select min(id),'00000000-0000-4000-8000-000000007971','MID'from players where competition_id=797 having count(*)>0;
`}
