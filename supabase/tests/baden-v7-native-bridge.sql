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
  h:=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season',season,'name','TSG 1862/09 Weinheim'));
  a:=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season',season,'name','GU-Türk. SV Pforzheim zg.'));
  day:=case when k=4 then opening when k=3 then date'2026-03-31'else old_day end;url:='https://www.fussball.de/spiel/-/spiel/'||sid;
  score:=case when k=1 then '{"domaci":2,"gostje":1}'::jsonb when k=5 then '{"domaci":3,"gostje":2}'::jsonb else 'null'::jsonb end;
  admin:=case when k=3 then '{"schemaVersion":1,"kind":"confirmed-sports-court-decision","marker":"U","displayedScores":[{"domaci":4,"gostje":1},{"domaci":1,"gostje":4}]}'::jsonb when k=2 then '{"schemaVersion":1,"kind":"confirmed-administrative-decision","marker":"V","displayedScores":[{"domaci":0,"gostje":3},{"domaci":3,"gostje":0}]}'::jsonb else 'null'::jsonb end;
  f:=jsonb_build_object('sourceCompetitionId',code,'season',season,'sourceMatchId',sid,'reportId','de-fussball-'||sid,'sourceUrl',url,'round',case when k=4 then 12 when k=3 then 21 else k end,'date',day,'time','14:30','homeName','TSG 1862/09 Weinheim','awayName','GU-Türk. SV Pforzheim zg.','homeSourceClubId',h,'awaySourceClubId',a,'score',score,'administrativeResult',admin,'unavailable',k<=3);fixtures:=fixtures||jsonb_build_array(f);
  if k<=3 then
   raw:=case when k=1 then repeat('a',64)else null end;
   e:=jsonb_build_object('sourceCompetitionId',code,'season',season,'sourceMatchId',sid,'sourcePhase',null,'sourceRound',case when k=3 then 21 else k end,'playedOn',day,'homeSourceClubId',h,'awaySourceClubId',a,'sourceUrl',url,'rawSha256',raw,'observedHomeScore',case when k=1 then 2 end,'observedAwayScore',case when k=1 then 1 end,'reasonCode','TEST_ONLY_reviewed_missingness','resultKnown',k=1,'retainedBundleSha256',repeat('b',64),'defect',jsonb_build_object('kind','TEST_ONLY_reviewed_missingness'),'documents','[]'::jsonb,'observedFontIds','[]'::jsonb,'missingObservedFonts','[]'::jsonb,'administrativeResult',admin,'approvalReference','call_e8c944e47b7c42a38afa4f08fda48c23');entries:=entries||jsonb_build_array(e);
  end if;
 end loop;

 -- TEST ONLY four more current club pairs and one complete archive report.
 for k in 6..10 loop
  code:=case when k=10 then '02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'else '03188V27L800000JVS5489BTVU7GTVLE-G:2026/27'end;season:=split_part(code,':',2);sid:=lpad(upper(to_hex(100+k)),32,'0');
  h:=case when k=10 then 'TSG 1862/09 Weinheim'else 'TEST ONLY Baden Club '||((k-6)*2+3)end;
  a:=case when k=10 then 'GU-Türk. SV Pforzheim zg.'else 'TEST ONLY Baden Club '||((k-6)*2+4)end;
  f:=jsonb_build_object('sourceCompetitionId',code,'season',season,'sourceMatchId',sid,'reportId','de-fussball-'||sid,'sourceUrl','https://www.fussball.de/spiel/-/spiel/'||sid,'round',k,'date',old_day,'time','14:30','homeName',h,'awayName',a,'homeSourceClubId',private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season',season,'name',h)),'awaySourceClubId',private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season',season,'name',a)),'score',jsonb_build_object('domaci',0,'gostje',0),'administrativeResult',null,'unavailable',false);fixtures:=fixtures||jsonb_build_array(f);
 end loop;
 -- Extra TEST ONLY W native header; source tuple/pairs are actual retained facts.
 code:='02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26';sid:='02TNBSVEEG000000VS5489BUVSSD35NB';day:=date'2026-05-25';
 h:=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season','2025/26','name','TSG 1862/09 Weinheim'));a:=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',code,'season','2025/26','name','GU-Türk. SV Pforzheim zg.'));
 admin:='{"schemaVersion":1,"kind":"confirmed-match-authority-decision","marker":"W","rawMarker":"w","displayedScores":[{"domaci":3,"gostje":0},{"domaci":0,"gostje":3}]}'::jsonb;
 f:=jsonb_build_object('sourceCompetitionId',code,'season','2025/26','sourceMatchId',sid,'reportId','de-fussball-'||sid,'sourceUrl','https://www.fussball.de/spiel/-/spiel/'||sid,'round',29,'date',day,'time','17:00','homeName','TSG 1862/09 Weinheim','awayName','GU-Türk. SV Pforzheim zg.','homeSourceClubId',h,'awaySourceClubId',a,'score',null,'administrativeResult',admin,'unavailable',true);fixtures:=fixtures||jsonb_build_array(f);
 e:=jsonb_build_object('sourceCompetitionId',code,'season','2025/26','sourceMatchId',sid,'sourcePhase',null,'sourceRound',29,'sourceTime','17:00','playedOn',day,'homeSourceClubId',h,'awaySourceClubId',a,'sourceUrl',f->>'sourceUrl','rawSha256',null,'observedHomeScore',null,'observedAwayScore',null,'reasonCode','TEST_ONLY_reviewed_missingness','resultKnown',false,'retainedBundleSha256',repeat('b',64),'defect',jsonb_build_object('kind','TEST_ONLY_reviewed_missingness'),'documents','[]'::jsonb,'observedFontIds','[]'::jsonb,'missingObservedFonts','[]'::jsonb,'administrativeResult',admin,'approvalReference','call_e8c944e47b7c42a38afa4f08fda48c23');entries:=entries||jsonb_build_array(e);
 p:=jsonb_build_object('id','de-fussball-baden-mixed-history-v1','provider','fussball-public','competitionSlug','de-verbandsliga-baden','sourcePolicy','fussball-community-cards-v1','sourceLeagueCode','03188V27L800000JVS5489BTVU7GTVLE-G:2026/27','season','2026/27','approvalReference','call_e8c944e47b7c42a38afa4f08fda48c23','permissionTimestamp',null,'entries',entries);
 v:=jsonb_build_object('version',1,'kind','baden-atomic-history-cards-preparation','slug','de-verbandsliga-baden','currentCode','03188V27L800000JVS5489BTVU7GTVLE-G:2026/27','archiveCode','02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26','catalogSha256',repeat('c',64),'derivedPackSha256',repeat('d',64),'sourceCertificateSha256',repeat('e',64),'currentFreshUntil',to_char(clock_timestamp()+interval '2 hours','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'firstFantasyPlayedOn',opening,'openingRound',12,'deadlineOffsetHours',0,'policy',p,'fixtures',fixtures);
 body:=private_fussball.canonical_json(v);insert into private_baden_history.catalog values(true,v,private_baden_history.sha(v));
 perform public.prepare_fussball_historical_statistics(body,private_baden_history.sha(v));
end$$;
-- Wrong W pair order/time/round must never mutate its immutable installed header.
do $$declare k private_historical_statistics.markers;i private_historical_statistics.installed_policies;h jsonb;mutated jsonb;label text;accepted boolean;
begin
 select *into strict k from private_historical_statistics.markers where source_match_id='02TNBSVEEG000000VS5489BUVSSD35NB';select *into strict i from private_historical_statistics.installed_policies where competition_id=k.competition_id;
 h:=jsonb_build_object('fixture',k.fixture,'roundId',k.round_id,'homeTeamId',k.home_team_id,'awayTeamId',k.away_team_id);
 foreach label in array array['pairs','time','round']loop
  mutated:=case label when 'pairs'then jsonb_set(h,'{fixture,administrativeResult,displayedScores}','[{"domaci":0,"gostje":3},{"domaci":3,"gostje":0}]')when 'time'then jsonb_set(h,'{fixture,sourceTime}','"17:01"')else jsonb_set(h,'{fixture,sourceRound}','28')end;accepted:=false;
  begin perform public.upsert_unavailable_historical_match(k.competition_id,k.source_match_id,i.policy_id,i.policy_sha256,null,mutated);accepted:=true;exception when others then raise notice 'BADEN_W_IMMUTABLE_REJECT %: %',label,sqlerrm;end;
  if accepted then raise exception 'TEST: wrong W % admitted',label;end if;
 end loop;
 if not private_baden_history.unknown_result_allowed(k.round_id,k.home_team_id,k.away_team_id,k.source_report_id,k.fixture->>'sourceUrl',(k.fixture->>'playedOn')::date,'unavailable_historical','TEST_ONLY_reviewed_missingness',null,29)or private_baden_history.unknown_result_allowed(k.round_id,k.home_team_id,k.away_team_id,k.source_report_id,k.fixture->>'sourceUrl',(k.fixture->>'playedOn')::date,'unavailable_historical','TEST_ONLY_reviewed_missingness',null,28)then raise exception 'TEST: exact W NULL tuple gate failed';end if;
end$$;
create temporary table baden_launch_players(team_id bigint,idx int,player_id bigint,source_id text,reg_st bigint);
create temporary table baden_launch_manifest(doc jsonb,sha256 text);
do $$
declare cid bigint;club record;n int;pid bigint;sid text;reg bigint;b jsonb;f jsonb;m matches;apps jsonb;roster jsonb;candidates jsonb;cards jsonb;bundle jsonb;revision text;envelope jsonb;x record;pos text;first_pid bigint;next_app bigint;next_goal bigint;goals_body jsonb;
begin
 select id into strict cid from competitions where slug='de-verbandsliga-baden';
 select coalesce(max(id),0)+100 into pid from players;select coalesce(max(id),0)+100 into next_app from appearances;select coalesce(max(id),0)+100 into next_goal from goals;
 for club in select distinct team_id from private_baden_history.club_bindings where competition_id=cid order by team_id loop
  for n in 1..12 loop
   pid:=pid+1;sid:='de-fussball-player-id-'||lpad(upper(to_hex(pid)),32,'0');select reg_st into reg from public.fussball_reserve_player_ids(array[sid]);
   pos:=case when n=1 then 'GK'when n<=5 then 'DEF'when n<=9 then 'MID'else 'FWD'end;
   insert into players(id,first_name,last_name,full_name,team_id,competition_id,reg_st,position,position_source,active,value,value_start)overriding system value values(pid,'TEST ONLY','Launch '||pid,'TEST ONLY Launch '||pid,club.team_id,cid,reg,pos,'zapisnik',true,case when n=12 then 8 else 5 end,5);
   insert into baden_launch_players values(club.team_id,n,pid,sid,reg);
  end loop;
 end loop;
 bundle:=jsonb_build_object('report',jsonb_build_object('base64',encode(convert_to('TEST ONLY synthetic report','UTF8'),'base64'),'sha256',private_fussball.sha('TEST ONLY synthetic report')),'lineup',jsonb_build_object('base64',encode(convert_to('TEST ONLY synthetic lineup','UTF8'),'base64'),'sha256',private_fussball.sha('TEST ONLY synthetic lineup')),'fonts',jsonb_build_array(jsonb_build_object('fontId','abc123ef','base64',encode(convert_to('TEST ONLY synthetic font','UTF8'),'base64'),'sha256',private_fussball.sha('TEST ONLY synthetic font'))));
 revision:=private_fussball.sha((bundle#>>'{report,sha256}')||E'\n'||(bundle#>>'{lineup,sha256}')||E'\nabc123ef:'||(bundle#>>'{fonts,0,sha256}'));
 for b in select value from jsonb_array_elements((select bindings from private_baden_history.prepared where competition_id=cid))loop
  f:=b->'fixture';if(f->>'unavailable')::boolean or f->'score'='null'::jsonb then continue;end if;
  select *into strict m from matches where id=(b->>'matchId')::bigint;apps:='[]';roster:='[]';candidates:='[]';goals_body:='[]';
  for x in select p.*,case when p.team_id=m.home_team_id then 0 else 1 end side from baden_launch_players p where team_id in(m.home_team_id,m.away_team_id)order by team_id,idx loop
   roster:=roster||jsonb_build_array(jsonb_build_object('sourceId',x.source_id,'regSt',x.reg_st,'side',x.side,'name','TEST ONLY Launch '||x.player_id,'shirt',x.idx,'starter',x.idx<=11,'goalkeeper',x.idx=1));
   candidates:=candidates||jsonb_build_array(jsonb_build_object('source_id',x.source_id,'player_id',x.player_id,'team_id',x.team_id));
   if(f->>'round')::int in(5,10)then
    next_app:=next_app+1;
    insert into appearances(id,match_id,player_id,team_id,started,is_goalkeeper,minutes_played,minute_on,minute_off)overriding system value values(next_app,m.id,x.player_id,x.team_id,x.idx<=11,x.idx=1,case when x.idx<=11 then 90 else 0 end,case when x.idx<=11 then 0 else 90 end,90);
   end if;
  end loop;
  cards:='[]';
  if(f->>'round')::int in(5,10)then
   -- The current ordinary source has 3:2; preserve every scorer ledger row.
   for n in 1..coalesce((f#>>'{score,domaci}')::int,0)+coalesce((f#>>'{score,gostje}')::int,0)loop
    select player_id into first_pid from baden_launch_players where team_id=case when n<=(f#>>'{score,domaci}')::int then m.home_team_id else m.away_team_id end and idx=2;
    next_goal:=next_goal+1;
    insert into goals(id,match_id,team_id,scorer_id,minute,is_own_goal,is_penalty)overriding system value values(next_goal,m.id,case when n<=(f#>>'{score,domaci}')::int then m.home_team_id else m.away_team_id end,first_pid,n*10,false,false);
   end loop;
   update matches set imported_at=clock_timestamp(),vir_brez_izida=false where id=m.id;
  else
   cards:=jsonb_build_array(jsonb_build_object('eventKey',private_fussball.sha((f->>'reportId')||':'||revision||':0:'||repeat('f',64)),'ordinal',0,'eventSha256',repeat('f',64),'type','red','side',0,'minute',60,'base',60,'added',0,'half',2,'officialSourceId',null));
  end if;
  envelope:=jsonb_build_object('version',1,'reportId',f->>'reportId','matchId',f->>'sourceMatchId','sourceUrl',f->>'sourceUrl','season',f->>'season','round',(f->>'round')::int,'date',f->>'date','time',f->>'time','homeName',f->>'homeName','awayName',f->>'awayName','score',f->'score','revisionSha256',revision,'cards',cards,'roster',roster,'bundle',bundle);
  perform public.register_fussball_card_report(cid,f->>'sourceCompetitionId',m.id,envelope,candidates);
 end loop;
end$$;
-- A real, complete synthetic native state now exists. Construct the service
-- manifest using actual SQL readback; no write protections have been bypassed.
do $$
declare cid bigint;v jsonb;headers jsonb;unknowns jsonb;counts jsonb;ready jsonb;played jsonb;doc jsonb;opening bigint;
begin
 select id into strict cid from competitions where slug='de-verbandsliga-baden';v:=public.get_fussball_historical_runtime(cid);headers:=private_baden_history.launch_headers(cid);counts:=private_baden_history.launch_counts(cid);ready:=public.check_fussball_card_readiness(cid,v#>>'{manifest,currentCode}');
 select jsonb_agg(x order by(x->>'matchId')::bigint)into unknowns from jsonb_array_elements(headers)x where x#>>'{fixture,resultKnown}'='false';
 select jsonb_agg(jsonb_build_object('matchId',(x->>'match_id')::bigint,'reportId',x->>'report_id','revisionSha256',x->>'revision_sha256')order by(x->>'match_id')::bigint)into played from jsonb_array_elements(ready->'registered_reports')x;
 doc:=jsonb_build_object('version',2,'currentCode',v#>>'{manifest,currentCode}','archiveCodes',jsonb_build_array(v#>>'{manifest,archiveCode}'),'historicalPolicySha256',v->>'policySha256','historicalInventorySha256',v->>'markerInventorySha256','historicalHeaders',headers,'unknownResultHeaders',unknowns,'partitionCounts',counts,'compositionProofSha256',private_baden_history.sha(jsonb_build_object('derivedPackSha256',v#>'{manifest,derivedPackSha256}','bindingSha256',v->'bindingSha256','historicalPolicySha256',v->'policySha256','historicalInventorySha256',v->'markerInventorySha256','headers',headers,'partitionCounts',counts)),'sourceProofSha256',repeat('a',64),'nightlyCacheSha256',repeat('b',64),'pendingInventorySha256',ready->>'pending_inventory_sha256','playedReports',played,'openingRoundId',v->'openingRoundId');
 insert into baden_launch_manifest values(doc,private_baden_history.sha(doc));
 perform private_baden_history.check_launch(cid,doc);
end$$;
do $$
declare cid bigint;doc jsonb;changed jsonb;label text;accepted boolean;res jsonb;before_state text;owner uuid;marker bigint;pending bigint;opening bigint;baseline jsonb;
begin
 select id into strict cid from competitions where slug='de-verbandsliga-baden';select lm.doc into strict doc from baden_launch_manifest lm;
 baseline:=public.get_fussball_historical_runtime(cid);opening:=(baseline->>'openingRoundId')::bigint;
 select min((x->>'matchId')::bigint)into marker from jsonb_array_elements(baseline#>'{history,markers}')x;
 select min(m.id)into pending from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.statistics_status='pending_cards';
 before_state:=private_fussball.admission_state(cid);
 foreach label in array array['version1','policy-hash','inventory-hash','partition','unknown-header','extra-fixture','missing-fixture','goalkeeper','illegal15','budget','default-share','maximum-price','past-opening','locked-opening','card-gate','history-gate','unknown-zero','card-inventory','cache-hash']loop
  accepted:=false;changed:=doc;
  begin
   case label
    when 'version1'then changed:=jsonb_set(doc,'{version}','1');
    when 'policy-hash'then changed:=jsonb_set(doc,'{historicalPolicySha256}',to_jsonb(repeat('0',64)));
    when 'inventory-hash'then changed:=jsonb_set(doc,'{historicalInventorySha256}',to_jsonb(repeat('0',64)));
    when 'partition'then changed:=jsonb_set(doc,'{partitionCounts,0,complete}','999');
    when 'unknown-header'then changed:=jsonb_set(doc,'{unknownResultHeaders}','[]');
    when 'extra-fixture'then insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on)select opening,m.away_team_id,m.home_team_id,0,0,current_date+7 from matches m where id=marker;
    when 'missing-fixture'then delete from matches where round_id=opening;
    when 'goalkeeper'then update players set position='DEF'where competition_id=cid and position='GK';
    when 'illegal15'then update players set position='GK'where competition_id=cid;
    when 'budget'then update players set value=100 where competition_id=cid;
    when 'default-share'then update players set value=4.5 where competition_id=cid and position<>'GK';
    when 'maximum-price'then update players set value=5 where competition_id=cid;
    when 'past-opening'then update rounds set deadline_at=clock_timestamp()-interval'1 hour'where id=opening;
    when 'locked-opening'then update rounds set lineups_locked_at=clock_timestamp()where id=opening;
    when 'card-gate'then update competition_settings set value='0'where competition_id=cid and key='fussball_card_voting_enabled';
    when 'history-gate'then delete from private_historical_statistics.installed_policies where competition_id=cid;
    when 'unknown-zero'then update matches set home_goals=0,away_goals=3 where id=(select(x->>'matchId')::bigint from jsonb_array_elements(baseline#>'{history,markers}')x where x#>>'{fixture,resultKnown}'='false'limit 1);
    when 'card-inventory'then changed:=jsonb_set(doc,'{playedReports}',(doc->'playedReports')-0);
    when 'cache-hash'then changed:=jsonb_set(doc,'{nightlyCacheSha256}','"UNSET"');
   end case;
   perform public.record_fussball_card_admission(cid,doc->>'currentCode',changed,private_baden_history.sha(changed));accepted:=true;
   raise exception 'TEST_ONLY_ACCEPTED_ROLLBACK'using errcode='P0002';
  exception when sqlstate 'P0002'then null;when others then raise notice 'BADEN_COMPOSED_REFUSED %: %',label,sqlerrm;end;
  if accepted then raise exception 'TEST: composed admission accepted %',label;end if;
  if exists(select 1 from private_fussball.card_admissions where competition_id=cid)or(select active from competitions where id=cid)or private_fussball.admission_state(cid)<>before_state then raise exception 'TEST: refused composed admission leaked mutation %',label;end if;
 end loop;
 -- The public registration/voting/replay path cannot revive unavailable cards.
 accepted:=false;
 begin
  select cr.envelope into changed from private_fussball.card_reports cr where cr.competition_id=cid and cr.source_code=doc->>'currentCode'and cr.envelope->>'round'='5';
  changed:=changed||jsonb_build_object('reportId',(select zapisnik_id from matches where id=marker),'matchId',(select substring(zapisnik_id from 13)from matches where id=marker),'sourceUrl',(select source_url from matches where id=marker),'round',1,'score',jsonb_build_object('domaci',2,'gostje',1));
  perform public.register_fussball_card_report(cid,doc->>'currentCode',marker,changed,(select candidates from private_fussball.card_reports where competition_id=cid and envelope->>'round'='5'));
  accepted:=true;raise exception 'TEST_ONLY_ACCEPTED_ROLLBACK'using errcode='P0002';
 exception when sqlstate 'P0002'then null;when others then raise notice 'BADEN_COMPOSED_UNAVAILABLE_CARD_REFUSED: %',sqlerrm;end;
 if accepted or jsonb_array_length(public.match_fussball_card_votes(marker)->'events')<>0 or exists(select 1 from private_fussball.card_reports where match_id=marker)then raise exception 'TEST: unavailable match acquired card registration/voting';end if;
 -- Both policy gates are required again at activation in the SAME transaction.
 res:=public.record_fussball_card_admission(cid,doc->>'currentCode',doc,private_baden_history.sha(doc));
 if res->>'registered'<>'true' then raise exception 'TEST: genuine composed admission failed';end if;
 foreach label in array array['card-gate','history-gate','pricing-drift','header-drift','direct-update']loop
  accepted:=false;
  begin
   case label
    when 'card-gate'then update competition_settings set value='0'where competition_id=cid and key='fussball_card_voting_enabled';
    when 'history-gate'then update private_fussball.card_admissions set manifest=jsonb_set(manifest,'{historicalPolicySha256}',to_jsonb(repeat('0',64)))where competition_id=cid;
    when 'pricing-drift'then update players set value=value+0.1 where competition_id=cid;
    when 'header-drift'then update matches set played_on=played_on+1 where id=pending;
    when 'direct-update'then update competitions set active=true where id=cid;
   end case;
   perform public.vklopi_ligo_sredi_sezone('de-verbandsliga-baden');accepted:=true;
   raise exception 'TEST_ONLY_ACCEPTED_ROLLBACK'using errcode='P0002';
  exception when sqlstate 'P0002'then null;when others then raise notice 'BADEN_COMPOSED_ACTIVATION_ROLLBACK %: %',label,sqlerrm;end;
  if accepted or(select active from competitions where id=cid)or exists(select 1 from private_historical_statistics.release_authorizations where competition_id=cid)or exists(select 1 from private_fussball.card_activation_context where competition_id=cid)or private_fussball.admission_state(cid)<>before_state then raise exception 'TEST: composed activation refusal leaked mutation %',label;end if;
 end loop;
 res:=public.vklopi_ligo_sredi_sezone('de-verbandsliga-baden');
 if res->>'vklopljena'<>'true' or res->>'historical_policy_sha256'<>baseline->>'policySha256' or not(select active from competitions where id=cid)then raise exception 'TEST: legitimately admitted composed activation failed';end if;
 -- Public results include known headers/pending cards; NULL U/V never win.
 if (select sum(tekme)from public.lestvica_lige(cid,'2026/27'))<>12 or(select sum(tekme)from public.lestvica_lige(cid,'2025/26'))<>2 then raise exception 'TEST: standings lost official known/pending result or counted NULL administration';end if;
 if exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.home_goals is null and public.baden_known_native_result(m.id))then raise exception 'TEST: unknown result projected as known';end if;
 -- The exact U tuple is allowed only with both ordered displayed pairs intact.
 if not exists(select 1 from private_historical_statistics.markers k where k.competition_id=cid and k.source_match_id='02TNBSVIMS000000VS5489BUVSSD35NB' and k.fixture#>>'{administrativeResult,marker}'='U' and k.fixture#>'{administrativeResult,displayedScores}'='[{"domaci":4,"gostje":1},{"domaci":1,"gostje":4}]'::jsonb and private_baden_history.unknown_result_allowed(k.round_id,k.home_team_id,k.away_team_id,k.source_report_id,k.fixture->>'sourceUrl',(k.fixture->>'playedOn')::date,'unavailable_historical','TEST_ONLY_reviewed_missingness',null,21) and not private_baden_history.unknown_result_allowed(k.round_id,k.home_team_id,k.away_team_id,k.source_report_id,k.fixture->>'sourceUrl',(k.fixture->>'playedOn')::date,'unavailable_historical','TEST_ONLY_reviewed_missingness',null,20))then raise exception 'TEST: narrow exact U tuple permission failed';end if;
 -- Close Task3's active/user fixture gap through actual admission and guards.
 select min(id::text)::uuid into owner from profiles;
 if owner is null then raise exception 'TEST: owned clone lacks a test profile';end if;
 insert into fantasy_teams(id,competition_id,owner_id,name)overriding system value values((select coalesce(max(id),0)+100 from fantasy_teams),cid,owner,'TEST ONLY legitimately admitted Baden');
 baseline:=public.get_fussball_historical_runtime(cid);
 if baseline->>'active'<>'true' or jsonb_array_length(baseline#>'{history,markers}')<>4 then raise exception 'TEST: active users lost bound runtime';end if;
 if exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.statistics_status='unavailable_historical' and(m.imported_at is not null or exists(select 1 from appearances where match_id=m.id)or exists(select 1 from goals where match_id=m.id)or exists(select 1 from private_fussball.card_reports where match_id=m.id)))then raise exception 'TEST: unavailable fixture acquired individual/card data';end if;
 if exists(select 1 from jsonb_array_elements(baseline#>'{history,markers}')x join matches m on m.id=(x->>'matchId')::bigint where x#>>'{fixture,resultKnown}'='false'and(m.home_goals is not null or m.away_goals is not null))then raise exception 'TEST: administrative decision acquired winner';end if;
end$$;
select 'BADEN_COMPOSED_NATIVE_ACTIVE_USERS_PASS';

-- The Spanish source-specific NULL marker was installed before Baden DDL and
-- must remain admitted by its original pure disjunct and original guards.
do $$begin
 if not exists(select 1 from matches where id=970000001 and zapisnik_id='es4109409'and home_goals is null and away_goals is null)then raise exception 'TEST: Baden DDL dropped existing Spanish G1 NULL source';end if;
 if not exists(select 1 from private_fcf_g1_supplement.markers where match_id=970000001)then raise exception 'TEST: original installed Spanish G1 marker lost';end if;
end$$;
-- Stored CHECK OIDs need EXECUTE, never private schema lookup. Assert ACLs as
-- the trusted fixture owner before switching into either legitimate writer.
do $$declare writer text;ns text;helper oid;mutator oid;begin
 foreach writer in array array['service_role','authenticated']loop
  foreach ns in array array['private_baden_history','private_fcf_six_history','private_fcf_g1_supplement']loop
   if has_schema_privilege(writer,ns,'USAGE')then raise exception 'TEST: private schema widened for %: %',writer,ns;end if;
   select p.oid into strict helper from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=ns and p.proname='unknown_result_allowed';
   if not has_function_privilege(writer,helper,'EXECUTE')or has_function_privilege('anon',helper,'EXECUTE')then raise exception 'TEST: exact predicate ACL differs for %: %',writer,ns;end if;
  end loop;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where(n.nspname='private_baden_history'and c.relname='catalog'or n.nspname='private_historical_statistics'and c.relname='markers')and has_table_privilege(writer,c.oid,'INSERT'))then raise exception 'TEST: private table mutation widened';end if;
  select 'private_baden_history.check_launch(bigint,jsonb)'::regprocedure::oid into mutator;if has_function_privilege(writer,mutator,'EXECUTE')then raise exception 'TEST: private mutator widened';end if;
 end loop;
end$$;
-- TEST ONLY identity uses ordinary signup/profile provisioning, existing admin
-- RLS and actual auth.uid(). No policy, table role or trigger is bypassed.
insert into auth.users(id,email)values('ba000000-0000-4000-8000-000000000007','baden-role-fixture@example.invalid');
update profiles set is_admin=true where id='ba000000-0000-4000-8000-000000000007';
insert into competitions(id,slug,name,short_name,source,source_league_code,country_id,active)overriding system value values(975000001,'zz-baden-service-write-probe','TEST ONLY service probe','TEST ONLY','fcf','TEST_ONLY',(select id from countries where code='DE'),false);
insert into rounds(id,competition_id,season,number,played_on)overriding system value values(975000001,975000001,'2026/27',1,current_date+7),(975000002,975000001,'2026/27',2,current_date+7);
set local role service_role;
set local request.jwt.claim.role='service_role';
do $$declare accepted boolean;begin
 if current_user<>'service_role'then raise exception 'TEST: actual importer SQL role required';end if;
 insert into public.matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals)overriding system value values(975000001,975000001,970000001,970000002,current_date+7,0,0);
 update public.matches set home_goals=2,away_goals=1 where id=975000001;
 accepted:=false;begin update public.matches set home_goals=null where id=975000001;accepted:=true;exception when check_violation then null;end;if accepted then raise exception 'TEST: one-null importer write accepted';end if;
 accepted:=false;begin update public.matches set home_goals=null,away_goals=null where id=975000001;accepted:=true;exception when check_violation then null;end;if accepted then raise exception 'TEST: unreviewed both-null importer write accepted';end if;
end$$;
reset role;
set local request.jwt.claim.sub='ba000000-0000-4000-8000-000000000007';
set local request.jwt.claim.role='authenticated';
set local role authenticated;
do $$declare accepted boolean;begin
 if current_user<>'authenticated'or auth.uid()<>'ba000000-0000-4000-8000-000000000007'::uuid or not public.is_admin()then raise exception 'TEST: existing authenticated admin RLS required';end if;
 insert into public.matches(id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals)overriding system value values(975000002,975000002,970000001,970000002,current_date+7,0,0);
 update public.matches set home_goals=3,away_goals=1 where id=975000002;
 if not exists(select 1 from public.matches where id=975000002 and home_goals=3 and away_goals=1)then raise exception 'TEST: authenticated ordinary INSERT/UPDATE failed';end if;
 accepted:=false;begin update public.matches set home_goals=null where id=975000002;accepted:=true;exception when check_violation then null;end;if accepted then raise exception 'TEST: authenticated one-null write accepted';end if;
 accepted:=false;begin update public.matches set home_goals=null,away_goals=null where id=975000002;accepted:=true;exception when check_violation then null;end;if accepted then raise exception 'TEST: authenticated foreign both-null write accepted';end if;
end$$;
reset role;
select 'BADEN_V7_TWO_ROLES_CLOSED_SCHEMAS_AND_G1_COEXISTENCE_PASS';
