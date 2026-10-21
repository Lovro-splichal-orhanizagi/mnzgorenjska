-- Synthetic owned-database fixture only. These NLI IDs are NOT real approvals.
set local jit=off;
delete from competitions where id in(973,974)or slug in('mt-nl1','mt-nl2');
insert into competitions(id,slug,name,short_name,source,source_league_code,country_id,federation_id,active,prvi_fantasy_krog)
overriding system value select id,slug,'NL bootstrap test','NL test','mfa',code,
(select id from countries where code='MT'),(select id from federations where code='mfa'),false,1
from(values(973,'mt-nl1','2601267/2027'),(974,'mt-nl2','6234492/2027'))v(id,slug,code);
insert into teams(id,name,country_id)overriding system value
select id,name,(select id from countries where code='MT')from(values
(9909731,'NLI bootstrap home'),(9909732,'NLI bootstrap away'),(9909741,'NLII bootstrap home'),(9909742,'NLII bootstrap away'))v(id,name);
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value
select cid*10000+n,cid,'2026/27',n,case n when 1 then'2026-10-10'::date else'2026-11-01'::date end,
case n when 1 then'2026-10-10T10:00Z'::timestamptz else'2026-11-01T10:00Z'::timestamptz end
from(values(973),(974))v(cid)cross join generate_series(1,2)n;
insert into players(competition_id,team_id,reg_st,first_name,last_name,full_name,position,position_source,active)
select cid,t.id,t.id*100+n,'Fixture',n::text,'Fixture '||t.id||' '||n,case n when 1 then'GK'else'DEF'end,'zapisnik',true
from(values(973),(974))v(cid)join teams t on t.id between 9900000+cid*10+1 and 9900000+cid*10+2 cross join generate_series(1,11)n;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,imported_at)overriding system value
select cid*10000+n,cid*10000+n,9900000+cid*10+1,9900000+cid*10+2,
case n when 1 then'2026-10-10'::date else'2026-11-01'::date end,
case n when 1 then'mt'||(91000000+cid)end,
case n when 1 then'https://matchcentre.mfa.com.mt/match/'||(91000000+cid)end,
case n when 1 then now()end from(values(973),(974))v(cid)cross join generate_series(1,2)n;
analyze players;analyze rounds;analyze matches;
insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_on,minute_off,is_goalkeeper)
select p.competition_id*10000+1,p.id,p.team_id,true,90,0,90,p.position='GK'from players p where p.competition_id in(973,974);
analyze appearances;
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,country_code,canonical_names,proofs)
values('mfa','98001','MT',array['NLI bootstrap home'],'[]'),('mfa','98002','MT',array['NLI bootstrap away'],'[]'),
('mfa','98003','MT',array['NLI archive-only club'],'[]'),('mfa','39633','MT',array['Msida St.Joseph'],'[]'),('mfa','39613','MT',array['Dingli Swallows'],'[]');
-- Kept in a temporary table until the test explicitly authorizes synthetic policy seed.
create temporary table nl_test_policies as
select 'mt-nl'||n||'-reviewed-history-2026-10-21-v1' as id,repeat(case n when 1 then'a'else'b'end,64) as sha,
jsonb_build_object('id','mt-nl'||n||'-reviewed-history-2026-10-21-v1','provider','mfa','sourcePolicy','mt-mfa-nl'||n||'-reviewed-history-v1','competitionSlug','mt-nl'||n,'season','2026/27','approvalReference','SYNTHETIC rollback test only','recordedAt','2026-10-21T12:00:00Z',
'entries',case n when 1 then jsonb_build_array(
 jsonb_build_object('sourceMatchId','90000973','sourceCompetitionId','50921000','sourcePhase',null,'sourceRound',3,'season','2025/26','playedOn','2025-11-01','homeSourceClubId','98001','awaySourceClubId','98002','sourceUrl','https://matchcentre.mfa.com.mt/match/90000973','rawSha256',repeat('c',64),'observedHomeScore',2,'observedAwayScore',1,'reasonCode','synthetic_clock_missing'),
 jsonb_build_object('sourceMatchId','90001973','sourceCompetitionId','50921000','sourcePhase',null,'sourceRound',4,'season','2025/26','playedOn','2025-11-08','homeSourceClubId','98003','awaySourceClubId','98002','sourceUrl','https://matchcentre.mfa.com.mt/match/90001973','rawSha256',repeat('d',64),'observedHomeScore',0,'observedAwayScore',0,'reasonCode','synthetic_clock_missing'))
else jsonb_build_array(jsonb_build_object('sourceMatchId','51962893','sourceCompetitionId','50920420','sourcePhase',null,'sourceRound',4,'season','2025/26','playedOn','2026-01-13','homeSourceClubId','39633','awaySourceClubId','39613','sourceUrl','https://matchcentre.mfa.com.mt/match/51962893','rawSha256','87bae2121282e371e0784cfde1c96fdfd03148e9c5849fa57bc5ef3770ac3338','observedHomeScore',1,'observedAwayScore',1,'reasonCode','unresolved_continuation_lineup'))end) as document
from generate_series(1,2)n;
