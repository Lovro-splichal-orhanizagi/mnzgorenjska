-- Owner-only fixture, always inside the exact disposable wrapper's transaction.
-- Rollback suite restores live contracts; the owned race DB is discarded afterward.
do $$begin if current_setting('slff.mfa_nl_owned_fixture',true)is distinct from 'transaction'then raise exception 'MFA NL TEST: explicit owned fixture transaction required';end if;end$$;
create temporary table nl_original_source_contracts as select *from private_mfa_nl_history.source_contract;
truncate table private_mfa_nl_history.source_contract,private_mfa_nl_history.import_receipt,private_mfa_nl_history.price_receipt,private_mfa_nl_history.release_receipt,private_mfa_nl_history.bootstrap_receipt cascade;
-- Synthetic six-club launch contracts only; never live fixture/count approvals.
\ir mfa-nl-bootstrap-fixture.sql
-- Authenticate the actual immutable JSONB documents after establishing only test native tuples.
-- Each temporary insert is rolled back; real contracts are restored by the outer suite rollback.
do $$declare c record;got jsonb;begin for c in select *from nl_original_source_contracts loop
 begin
  insert into private_mfa_nl_history.source_contract values(c.competition_id,c.contract_sha256,c.document);
  got:=public.get_mfa_nl_reviewed_source_contract(c.competition_id,c.contract_sha256);
  if got->'contractDocument'<>c.document or got->>'contractSha256'<>c.contract_sha256 then raise exception 'MFA NL TEST: original source-contract JSONB accessor roundtrip differs';end if;
  raise exception using errcode='P9001',message='rollback original contract accessor probe';
 exception when sqlstate 'P9001'then null;end;
end loop;end$$;
insert into private_historical_statistics.policies select id,sha,document from nl_test_policies on conflict(id)do nothing;
insert into teams(id,name,country_id)overriding system value
select 9900000+cid*10+n,'Release fixture '||cid||' club '||n,(select id from countries where code='MT')from(values(973),(974))v(cid)cross join generate_series(3,6)n;
insert into players(competition_id,team_id,reg_st,first_name,last_name,full_name,position,position_source,active)
select cid,t.id,t.id*100+n,'Fixture',n::text,'Fixture '||t.id||' '||n,case n when 1 then'GK'else'DEF'end,'zapisnik',true
from(values(973),(974))v(cid)join teams t on t.id between 9900000+cid*10+1 and 9900000+cid*10+6 cross join generate_series(1,16)n
where not exists(select 1 from players p where p.competition_id=cid and p.reg_st=t.id*100+n);
insert into matches(round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at)
select cid*10000+rn,9900000+cid*10+n,9900000+cid*10+n+1,case rn when 1 then'2026-10-10'::date else'2026-11-01'::date end,
case rn when 1 then'mt'||(92000000+cid*10+n)end,case rn when 1 then'https://matchcentre.mfa.com.mt/match/'||(92000000+cid*10+n)end,case rn when 1 then now()end
from(values(973),(974))v(cid)cross join(values(3),(5))x(n)cross join generate_series(1,2)rn;
analyze players;analyze matches;
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)
select m.id,p.id,p.team_id,true,90,0,90,p.reg_st%100=1 from matches m join rounds r on r.id=m.round_id join players p on p.competition_id=r.competition_id and p.team_id in(m.home_team_id,m.away_team_id)and p.reg_st%100<=11
where r.competition_id in(973,974)and m.imported_at is not null and not exists(select 1 from appearances a where a.match_id=m.id);
update appearances set minutes_played=60,minute_off=60 where match_id in(9730001,9740001)and player_id in(select id from players where reg_st%100=11 and team_id in(9909731,9909741));
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)
select p.competition_id*10000+1,p.id,p.team_id,false,30,60,90,false from players p where p.reg_st%100=12 and p.team_id in(9909731,9909741);
-- The source contract accessor must work before an installed bootstrap exists.
do $$declare doc jsonb;sha text;begin
 doc:=jsonb_build_object('schemaVersion',1,'competitionId',973,'policyId','mt-nl1-reviewed-history-2026-10-21-v1','policySha256',pg_temp.nl_sha(973),'archiveSeason','2025/26','currentSeason','2026/27','expectedArchiveRounds',4,'expectedCurrentFixtureCount',1,'expectedCurrentClubCount',2,
 'opening',jsonb_build_object('round',2,'playedOn','2026-11-01','deadlineAt','2026-11-01T10:00:00Z'),
 'sourceArtifact',jsonb_build_object('runId','1','artifactId','2','digest','sha256:'||repeat('f',64),'commit',repeat('e',40),'workflow','.github/workflows/synthetic-fixture.yml','branch','synthetic-not-approval','name','synthetic-not-approval'),
 'reports',jsonb_build_array(jsonb_build_object('reportId','mt90000973','season','2025/26','round',3,'playedOn','2025-11-01','homeName','NLI bootstrap home','awayName','NLI bootstrap away','homeGoals',2,'awayGoals',1,'statisticsStatus','unavailable_historical')),
 'currentFixtures',jsonb_build_array(jsonb_build_object('sourceMatchId','94009731','round',2,'playedOn','2026-11-01','homeName','NLI bootstrap home','awayName','NLI bootstrap away','played',false)));
 sha:=encode(sha256(convert_to(private_mfa_nl_history.canonical_json(doc),'UTF8')),'hex');
 begin
  insert into private_mfa_nl_history.source_contract values(973,sha,doc);
  if public.get_mfa_nl_reviewed_source_contract(973,sha)->'contractDocument'<>doc or exists(select 1 from private_mfa_nl_history.bootstrap_receipt where competition_id=973)then raise exception 'pre-bootstrap contract accessor failed';end if;
  raise exception using errcode='P9001',message='rollback prebootstrap synthetic contract';
 exception when sqlstate 'P9001'then null;end;
end$$;
-- Ordinary schedule imports preserve their exact official standings provenance.
update matches m set source_url='https://api.mfa.com.mt/api/competitions/'||split_part(c.source_league_code,'/',1)||'/standings?season=2027'from rounds r join competitions c on c.id=r.competition_id where m.round_id=r.id and c.id in(973,974)and m.zapisnik_id is null;
create temporary table nl_release_bootstrap as select cid,public.prepare_mfa_nl_reviewed_bootstrap(cid,repeat('e',40),pg_temp.nl_sha(cid))as image from(values(973),(974))v(cid);
select public.apply_mfa_nl_reviewed_bootstrap(cid,repeat('e',40),pg_temp.nl_sha(cid),image->>'beforeSha256',image->>'beforeImageText')from nl_release_bootstrap;
-- The contract deliberately describes a small synthetic archive, not real NL totals.
insert into rounds(competition_id,season,number,played_on)select cid,'2025/26',rn,('2025-10-01'::date+rn-1)from(values(973),(974))v(cid)cross join lateral generate_series(1,greatest(4,(select max((e->>'sourceRound')::int)from nl_test_policies n cross join lateral jsonb_array_elements(n.document->'entries')e where n.id='mt-nl'||(cid-972)||'-reviewed-history-2026-10-21-v1')))rn where not exists(select 1 from rounds r where r.competition_id=cid and r.season='2025/26'and r.number=rn);
insert into matches(round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at)
select r.id,9900000+r.competition_id*10+1,9900000+r.competition_id*10+2,r.played_on,'mt'||(930000000+r.competition_id*1000+r.number),'https://matchcentre.mfa.com.mt/match/'||(930000000+r.competition_id*1000+r.number),now()
from rounds r where r.competition_id in(973,974)and r.season='2025/26'and not exists(select 1 from matches m where m.round_id=r.id);
analyze matches;
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)
select m.id,p.id,p.team_id,true,90,0,90,p.reg_st%100=1 from matches m join rounds r on r.id=m.round_id join players p on p.competition_id=r.competition_id and p.team_id in(m.home_team_id,m.away_team_id)and p.reg_st%100<=11
where r.competition_id in(973,974)and r.season='2025/26'and m.imported_at is not null;
analyze appearances;analyze goals;
create temporary table nl_release_contracts as
select cid,jsonb_build_object('schemaVersion',1,'competitionId',cid,'policyId','mt-nl'||(cid-972)||'-reviewed-history-2026-10-21-v1','policySha256',pg_temp.nl_sha(cid),'archiveSeason','2025/26','currentSeason','2026/27',
'expectedArchiveRounds',(select count(*)from rounds where competition_id=cid and season='2025/26'),'expectedCurrentFixtureCount',6,'expectedCurrentClubCount',6,
'opening',jsonb_build_object('round',2,'playedOn','2026-11-01','deadlineAt','2026-11-01T10:00:00Z'),
'sourceArtifact',jsonb_build_object('runId','1','artifactId','2','digest','sha256:'||repeat('f',64),'commit',repeat('e',40),'workflow','.github/workflows/synthetic-fixture.yml','branch','synthetic-not-approval','name','synthetic-not-approval'),
'reports',(select jsonb_agg(jsonb_build_object('reportId',m.zapisnik_id,'season',r.season,'round',r.number,'playedOn',m.played_on,'homeName',h.name,'awayName',a.name,'homeGoals',m.home_goals,'awayGoals',m.away_goals,'statisticsStatus',m.statistics_status)order by r.season,r.number,m.zapisnik_id)from matches m join rounds r on r.id=m.round_id join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id where r.competition_id=cid and m.zapisnik_id is not null),
'currentFixtures',(select jsonb_agg(jsonb_build_object('sourceMatchId',coalesce(substring(m.zapisnik_id from 3),(94000000+cid*10+m.home_team_id%10)::text),'round',r.number,'playedOn',m.played_on,'homeName',h.name,'awayName',a.name,'played',m.imported_at is not null)order by r.number,m.id)from matches m join rounds r on r.id=m.round_id join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id where r.competition_id=cid and r.season='2026/27'))as document from(values(973),(974))v(cid);
create function pg_temp.nl_contract_sha(p_cid bigint)returns text language sql as $$select encode(sha256(convert_to(private_mfa_nl_history.canonical_json(document),'UTF8')),'hex')from pg_temp.nl_release_contracts where cid=p_cid$$;
