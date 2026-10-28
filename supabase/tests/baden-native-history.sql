-- TEST ONLY synthetic compiled catalog, headers and source authority. No actual
-- source/native readiness claim. The harness wraps ALL DDL/DML in BEGIN/ROLLBACK.
select set_config('request.jwt.claim.role','service_role',true);
-- This bounded clone deliberately omits production sequences. Temporary IDs
-- model DB-generated identities; no IDs are supplied to the production RPC.
create temporary sequence baden_test_team_ids;
create temporary sequence baden_test_round_ids;
create temporary sequence baden_test_match_ids;
select setval('baden_test_team_ids',coalesce((select max(id)from teams),0)+100);
select setval('baden_test_round_ids',coalesce((select max(id)from rounds),0)+100);
select setval('baden_test_match_ids',coalesce((select max(id)from matches),0)+100);
alter table teams alter column id drop identity if exists;
alter table rounds alter column id drop identity if exists;
alter table matches alter column id drop identity if exists;
alter table teams alter column id set default nextval('baden_test_team_ids');
alter table rounds alter column id set default nextval('baden_test_round_ids');
alter table matches alter column id set default nextval('baden_test_match_ids');
create temporary table baden_test_hashes(evidence jsonb);
do $$
declare cid bigint;de bigint;v jsonb;p jsonb;e jsonb;f jsonb;fixtures jsonb:='[]';entries jsonb:='[]';body text;result jsonb;again jsonb;h text;a text;code text;season text;sid text;url text;score jsonb;admin jsonb;k int;mid bigint;err boolean;day date;test_rid bigint;opening date:=current_date+7;old_day date:=current_date-20;raw text;branch int;conflict int;accepted boolean;failure_labels text[]:=array[]::text[];foreign_phase text;foreign_round int;test_hid bigint;test_aid bigint;foreign_player bigint;mutation text;
begin
 if exists(select 1 from competitions where slug='de-verbandsliga-baden')then raise exception 'TEST ONLY fixture requires absent Baden target';end if;
 select id into strict de from countries d where d.code='DE';select coalesce(max(id),0)+100 into cid from competitions;
 insert into competitions(id,slug,name,short_name,source,source_league_code,country_id,active,prvi_fantasy_krog,rok_pomak_ur)overriding system value values(cid,'de-verbandsliga-baden','TEST ONLY Baden','TEST ONLY','fussball-public','03188V27L800000JVS5489BTVU7GTVLE-G:2026/27',de,false,1,0);
 -- First verify an unfinalized catalog holds before any source/native mutation.
 err:=false;begin perform public.prepare_fussball_historical_statistics('{}',repeat('0',64));exception when others then err:=true;end;
 if not err or exists(select 1 from private_fussball.card_policies where competition_id=cid)then raise exception 'TEST: empty catalog did not hold atomically';end if;
 for k in 1..5 loop
  code:=case when k in(1,4,5) then '03188V27L800000JVS5489BTVU7GTVLE-G:2026/27'else '02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'end;season:=case when k in(1,4,5) then '2026/27'else '2025/26'end;
  sid:=case k when 1 then repeat('A',32)when 2 then '02TNBSVDG0000000VS5489BUVSSD35NB'when 3 then '02TNBSVIMS000000VS5489BUVSSD35NB'when 4 then repeat('B',32)else repeat('C',32)end;
  h:=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season',season,'name','TEST ONLY Baden Home'));
  a:=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season',season,'name','TEST ONLY Baden Away'));
  day:=case when k=4 then opening else old_day end;url:='https://www.fussball.de/spiel/-/spiel/'||sid;
  score:=case when k=1 then '{"domaci":2,"gostje":1}'::jsonb when k=5 then '{"domaci":3,"gostje":2}'::jsonb else 'null'::jsonb end;
  admin:=case when k in(2,3)then '{"schemaVersion":1,"kind":"confirmed-administrative-decision","marker":"V","displayedScores":[{"domaci":0,"gostje":3},{"domaci":3,"gostje":0}]}'::jsonb else 'null'::jsonb end;
  f:=jsonb_build_object('sourceCompetitionId',code,'season',season,'sourceMatchId',sid,'reportId','de-fussball-'||sid,'sourceUrl',url,'round',case when k=4 then 12 else k end,'date',day,'time','14:30','homeName','TEST ONLY Baden Home','awayName','TEST ONLY Baden Away','homeSourceClubId',h,'awaySourceClubId',a,'score',score,'administrativeResult',admin,'unavailable',k<=3);fixtures:=fixtures||jsonb_build_array(f);
  if k<=3 then
   raw:=case when k=1 then repeat('a',64)else null end;
   e:=jsonb_build_object('sourceCompetitionId',code,'season',season,'sourceMatchId',sid,'sourcePhase',null,'sourceRound',k,'playedOn',day,'homeSourceClubId',h,'awaySourceClubId',a,'sourceUrl',url,'rawSha256',raw,'observedHomeScore',case when k=1 then 2 end,'observedAwayScore',case when k=1 then 1 end,'reasonCode','TEST_ONLY_reviewed_missingness','resultKnown',k=1,'retainedBundleSha256',repeat('b',64),'defect',jsonb_build_object('kind','TEST_ONLY_reviewed_missingness'),'documents','[]'::jsonb,'observedFontIds','[]'::jsonb,'missingObservedFonts','[]'::jsonb,'administrativeResult',admin,'approvalReference','call_e8c944e47b7c42a38afa4f08fda48c23');entries:=entries||jsonb_build_array(e);
  end if;
 end loop;
 p:=jsonb_build_object('id','de-fussball-baden-mixed-history-v1','provider','fussball-public','competitionSlug','de-verbandsliga-baden','sourcePolicy','fussball-community-cards-v1','sourceLeagueCode','03188V27L800000JVS5489BTVU7GTVLE-G:2026/27','season','2026/27','approvalReference','call_e8c944e47b7c42a38afa4f08fda48c23','permissionTimestamp',null,'entries',entries);
 v:=jsonb_build_object('version',1,'kind','baden-atomic-history-cards-preparation','slug','de-verbandsliga-baden','currentCode','03188V27L800000JVS5489BTVU7GTVLE-G:2026/27','archiveCode','02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26','catalogSha256',repeat('c',64),'derivedPackSha256',repeat('d',64),'sourceCertificateSha256',repeat('e',64),'currentFreshUntil',to_char(clock_timestamp()+interval '2 hours','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'firstFantasyPlayedOn',opening,'openingRound',12,'deadlineOffsetHours',0,'policy',p,'fixtures',fixtures);
 body:=private_fussball.canonical_json(v);insert into private_baden_history.catalog values(true,v,private_baden_history.sha(v));
 -- Review regression: exact headers and empty placeholders must not have a
 -- foreign non-NULL phase/round silently overwritten. Each setup and RPC is a
 -- subtransaction; the sentinel rolls back even an incorrectly accepted RPC.
 for branch in 1..2 loop for conflict in 1..2 loop
  accepted:=false;foreign_phase:=case when conflict=1 then 'TEST_ONLY_FOREIGN_PHASE'else null end;foreign_round:=case when conflict=2 then 999 else null end;
  begin
   insert into teams(name,country_id)values('TEST ONLY Baden Home',de)returning id into test_hid;
   insert into teams(name,country_id)values('TEST ONLY Baden Away',de)returning id into test_aid;
   insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,'2026/27',1,old_day,(old_day+time '14:30')at time zone 'Europe/Berlin')returning id into test_rid;
   insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,source_phase,source_round)
   values(test_rid,test_hid,test_aid,case when branch=1 then 2 else 0 end,case when branch=1 then 1 else 0 end,old_day,case when branch=1 then 'de-fussball-'||repeat('A',32)end,case when branch=1 then 'https://www.fussball.de/spiel/-/spiel/'||repeat('A',32)end,foreign_phase,foreign_round);
   perform public.prepare_fussball_historical_statistics(body,private_baden_history.sha(v));accepted:=true;
   raise exception 'TEST_ONLY_ROLLBACK_ACCEPTED'using errcode='P0002';
  exception when sqlstate 'P0002'then null;when others then
   if sqlerrm<>'BADEN_HISTORY: foreign or populated row; no cleanup'then raise;end if;
  end;
  if accepted then failure_labels:=array_append(failure_labels,'foreign header branch '||branch||' conflict '||conflict);end if;
  if exists(select 1 from private_fussball.card_policies where competition_id=cid)or exists(select 1 from private_historical_statistics.installed_policies where competition_id=cid)or exists(select 1 from private_baden_history.club_bindings where competition_id=cid)or exists(select 1 from rounds where competition_id=cid)or exists(select 1 from private_baden_history.prepared where competition_id=cid)then raise exception 'TEST: foreign tuple refusal leaked policy/native metadata';end if;
 end loop;end loop;
 -- A failure late in preparation rolls back club/round/header/policy effects.
 err:=false;begin update competitions set rok_pomak_ur=1 where id=cid;perform public.prepare_fussball_historical_statistics(body,private_baden_history.sha(v));exception when others then err:=true;end;
 if not err or exists(select 1 from private_fussball.card_policies where competition_id=cid)or exists(select 1 from private_baden_history.club_bindings where competition_id=cid)or exists(select 1 from rounds where competition_id=cid)then raise exception 'TEST: late failure leaked preparation writes';end if;
 -- An active or populated target cannot become a preparation capability.
 err:=false;begin update competitions set active=true where id=cid;perform public.prepare_fussball_historical_statistics(body,private_baden_history.sha(v));exception when others then err:=true;end;if not err then raise exception 'TEST: active target accepted';end if;
 err:=false;begin
  insert into rounds(competition_id,season,number,played_on)values(cid,'2026/27',999,current_date-1)returning id into test_rid;
  insert into teams(name,country_id)values('TEST ONLY populated home',de)returning id into mid;
  insert into teams(name,country_id)values('TEST ONLY populated away',de)returning id into k;
  insert into matches(round_id,home_team_id,away_team_id,imported_at)values(test_rid,mid,k,clock_timestamp());
  perform public.prepare_fussball_historical_statistics(body,private_baden_history.sha(v));
 exception when others then err:=true;end;
 if not err or exists(select 1 from rounds where competition_id=cid)then raise exception 'TEST: populated preparation did not roll back';end if;
 result:=public.prepare_fussball_historical_statistics(body,private_baden_history.sha(v));again:=public.prepare_fussball_historical_statistics(body,private_baden_history.sha(v));
 if result<>again or result->>'prepared'<>'true'or result->>'competitionId'<>cid::text or jsonb_array_length(result->'bindings')<>5 or jsonb_array_length(result#>'{history,markers}')<>3 or result->>'bindingSha256'<>private_baden_history.sha(result->'bindings')or result->>'markerInventorySha256'<>private_baden_history.sha(result#>'{history,markers}')or result->>'policySha256'<>private_baden_history.sha(p)then raise exception 'TEST: full native receipt/idempotence/hash readback failed';end if;
 -- Review regression: a committed ordinary played binding can be populated
 -- without changing policy/fixture hashes. The COLD getter must then HOLD.
 select m.id,m.round_id,m.home_team_id into strict mid,test_rid,test_hid from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.zapisnik_id='de-fussball-'||repeat('C',32);
 select min(id)into foreign_player from players where competition_id<>cid;
 if foreign_player is null then raise exception 'TEST ONLY clone requires an existing foreign player';end if;
 foreach mutation in array array['imported','player','appearance','goal','playerScore']loop
  accepted:=false;
  begin
   case mutation
    when 'imported'then update matches set imported_at=clock_timestamp()where id=mid;
    when 'player'then insert into players(id,competition_id,team_id,first_name,last_name)overriding system value values((select max(id)+100 from players),cid,test_hid,'TEST ONLY','Cold race');
    when 'appearance'then insert into appearances(id,match_id,player_id,team_id)overriding system value values((select max(id)+100 from appearances),mid,foreign_player,test_hid);
    when 'goal'then insert into goals(id,match_id,team_id)overriding system value values((select max(id)+100 from goals),mid,test_hid);
    when 'playerScore'then insert into player_scores(round_id,player_id,points)values(test_rid,foreign_player,7);
   end case;
   perform public.get_fussball_historical_preparation(cid);accepted:=true;
   raise exception 'TEST_ONLY_ROLLBACK_ACCEPTED'using errcode='P0002';
  exception when sqlstate 'P0002'then null;when others then
   if sqlerrm<>'BADEN_HISTORY: cold pre-import preparation contains players/imported matches/individual statistics or points'then raise;end if;
  end;
  if accepted then failure_labels:=array_append(failure_labels,'cold getter '||mutation);end if;
  if public.get_fussball_historical_preparation(cid)<>result then raise exception 'TEST: cold-state mutation rollback changed receipt';end if;
 end loop;
 if(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.statistics_status='unavailable_historical'and m.home_goals is null and m.away_goals is null and m.imported_at is null)<>2 then raise exception 'TEST: both administrative results must be NULL';end if;
 select m.id into strict mid from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.zapisnik_id='de-fussball-02TNBSVDG0000000VS5489BUVSSD35NB';
 err:=false;begin update matches set home_goals=0 where id=mid;exception when others then err:=true;end;if not err then raise exception 'TEST: one NULL pair accepted';end if;
 err:=false;begin update matches set home_goals=0,away_goals=3 where id=mid;exception when others then err:=true;end;if not err then raise exception 'TEST: displayed pair substituted as official result';end if;
 err:=false;begin update matches set imported_at=clock_timestamp()where id=mid;exception when others then err:=true;end;if not err then raise exception 'TEST: imported marker accepted';end if;
 err:=false;begin delete from matches where id=mid;exception when others then err:=true;end;if not err then raise exception 'TEST: marker delete accepted';end if;
 err:=false;begin update private_historical_statistics.markers set fixture=fixture||'{"sourceRound":999}'::jsonb where competition_id=cid;exception when others then err:=true;end;if not err then raise exception 'TEST: marker tuple edit accepted';end if;
 err:=false;begin perform public.prepare_fussball_historical_statistics(body,repeat('0',64));exception when others then err:=true;end;if not err then raise exception 'TEST: wrong compiled hash accepted';end if;
 err:=false;begin perform public.upsert_unavailable_historical_match(cid,'02TNBSVDG0000000VS5489BUVSSD35NB',p->>'id',private_baden_history.sha(p),null,jsonb_build_object('fixture',(entries->1)-array['rawSha256','reasonCode'],'roundId',(result#>>'{bindings,0,roundId}')::bigint,'homeTeamId',(result#>>'{bindings,0,awayTeamId}')::bigint,'awayTeamId',(result#>>'{bindings,0,homeTeamId}')::bigint));exception when others then err:=true;end;if not err then raise exception 'TEST: foreign full tuple accepted';end if;
 err:=false;begin update private_historical_statistics.policies set document=document||'{"season":"2024/25"}'::jsonb where id=p->>'id';exception when others then err:=true;end;if not err then raise exception 'TEST: immutable policy edit accepted';end if;
 insert into baden_test_hashes values(jsonb_build_object('policy',p,'policySha256',result->>'policySha256','markers',result#>'{history,markers}','markerInventorySha256',result->>'markerInventorySha256','bindings',result->'bindings','bindingSha256',result->>'bindingSha256'));
 if public.get_fussball_historical_preparation(cid)<>result then raise exception 'TEST: negative cases altered prepared receipt';end if;
 if cardinality(failure_labels)>0 then raise exception 'TEST regression accepted: %',array_to_string(failure_labels,', ');end if;
end$$;
select 'BADEN_TEST_POSITIVE_AND_NEGATIVE_PASS';

select 'BADEN_HASH_JSON:'||evidence::text from baden_test_hashes;
