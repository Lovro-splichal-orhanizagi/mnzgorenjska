-- Baden's mixed history requires BOTH installed policy gates. Original card-only
-- admission/activation and all other countries retain their existing functions.
-- No catalog entries or launch facts are introduced by this migration.

-- Ordinary imported pending headers are part of the reviewed card route. The
-- full original source/native joins and immutable-marker checks remain intact.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('public.get_fussball_historical_runtime(bigint)'::regprocedure);
 changed:=replace(d,'m.statistics_status=''available'',''ordinary fixture cannot acquire historical exclusion''','m.statistics_status in(''available'',''pending_cards''),''ordinary fixture cannot acquire historical exclusion''');
 if changed=d then raise exception 'BADEN_HISTORY: runtime ordinary status anchor missing';end if;execute changed;
end$$;

-- The already observed court decision U retains both ordered displayed pairs.
-- NULL result permission remains limited to its exact installed archive tuple.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('private_baden_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)'::regprocedure);
 changed:=replace(d,$q$k.fixture->'administrativeResult'->>'marker'='V'$q$,$q$(k.fixture->'administrativeResult'->>'marker'='V' or(k.fixture->'administrativeResult'->>'marker'='U' and k.fixture#>>'{administrativeResult,kind}'='confirmed-sports-court-decision' and k.source_match_id='02TNBSVIMS000000VS5489BUVSSD35NB' and rn=21 and day=date'2026-03-31' and k.fixture#>'{administrativeResult,displayedScores}'='[{"domaci":4,"gostje":1},{"domaci":1,"gostje":4}]'::jsonb))$q$);
 if changed=d then raise exception 'BADEN_HISTORY: unknown administrative marker anchor missing';end if;execute changed;
end$$;

do $$declare d text;changed text;begin
 d:=pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$e#>>'{administrativeResult,kind}'='confirmed-administrative-decision'$q$,$q$(e#>>'{administrativeResult,kind}'='confirmed-administrative-decision' or(e#>>'{administrativeResult,kind}'='confirmed-sports-court-decision' and e#>>'{administrativeResult,marker}'='U' and p_source_match_id='02TNBSVIMS000000VS5489BUVSSD35NB' and e->>'sourceRound'='21' and e->>'playedOn'='2026-03-31' and e#>'{administrativeResult,displayedScores}'='[{"domaci":4,"gostje":1},{"domaci":1,"gostje":4}]'::jsonb))$q$);
 if changed=d then raise exception 'BADEN_HISTORY: upsert court-decision anchor missing';end if;execute changed;
end$$;

-- W is a separately reviewed exact source tuple, never a selected winner.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('private_baden_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)'::regprocedure);
 changed:=replace(d,$q$k.source_match_id in('02TNBSVDG0000000VS5489BUVSSD35NB','02TNBSVIMS000000VS5489BUVSSD35NB')$q$,$q$k.source_match_id in('02TNBSVDG0000000VS5489BUVSSD35NB','02TNBSVIMS000000VS5489BUVSSD35NB','02TNBSVEEG000000VS5489BUVSSD35NB')$q$);
 changed:=replace(changed,$q$k.fixture->'administrativeResult'->>'marker'='V'$q$,$q$(k.fixture->'administrativeResult'->>'marker'='V' or(k.fixture#>>'{administrativeResult,marker}'='W' and k.fixture#>>'{administrativeResult,kind}'='confirmed-match-authority-decision' and k.fixture#>>'{administrativeResult,rawMarker}'in('w','W') and k.source_match_id='02TNBSVEEG000000VS5489BUVSSD35NB' and rn=29 and day=date'2026-05-25' and k.fixture->>'sourceTime'='17:00' and k.fixture#>'{administrativeResult,displayedScores}'='[{"domaci":3,"gostje":0},{"domaci":0,"gostje":3}]'::jsonb and k.fixture->>'homeSourceClubId'=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId','02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26','season','2025/26','name','TSG 1862/09 Weinheim')) and k.fixture->>'awaySourceClubId'=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId','02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26','season','2025/26','name','GU-Türk. SV Pforzheim zg.'))))$q$);
 if changed=d then raise exception 'BADEN_HISTORY: exact W allowance anchor missing';end if;execute changed;
 d:=pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$p_source_match_id in('02TNBSVDG0000000VS5489BUVSSD35NB','02TNBSVIMS000000VS5489BUVSSD35NB')$q$,$q$p_source_match_id in('02TNBSVDG0000000VS5489BUVSSD35NB','02TNBSVIMS000000VS5489BUVSSD35NB','02TNBSVEEG000000VS5489BUVSSD35NB')$q$);
 changed:=replace(changed,$q$e#>>'{administrativeResult,kind}'='confirmed-administrative-decision'$q$,$q$(e#>>'{administrativeResult,kind}'='confirmed-administrative-decision' or(e#>>'{administrativeResult,kind}'='confirmed-match-authority-decision' and e#>>'{administrativeResult,marker}'='W' and e#>>'{administrativeResult,rawMarker}'in('w','W') and p_source_match_id='02TNBSVEEG000000VS5489BUVSSD35NB' and e->>'sourceRound'='29' and e->>'playedOn'='2026-05-25' and e->>'sourceTime'='17:00' and e#>'{administrativeResult,displayedScores}'='[{"domaci":3,"gostje":0},{"domaci":0,"gostje":3}]'::jsonb))$q$);
 if changed=d then raise exception 'BADEN_HISTORY: exact W upsert anchor missing';end if;execute changed;
end$$;

create function private_baden_history.launch_headers(cid bigint)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('matchId',x->'matchId','reportId',x->'reportId','sourceMatchId',x->'sourceMatchId','sourceCompetitionId',x#>'{fixture,sourceCompetitionId}','roundId',x->'roundId','homeTeamId',x->'homeTeamId','awayTeamId',x->'awayTeamId','fixture',x->'fixture','rawSha256',x->'rawSha256')order by(x->>'matchId')::bigint),'[]')from jsonb_array_elements(public.get_installed_historical_statistics_markers(cid)->'markers')x
$$;
create function private_baden_history.launch_counts(cid bigint)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_agg(jsonb_build_object('code',scope.code,'season',split_part(scope.code,':',2),'unplayed',n.unplayed,'complete',n.complete,'community-pending',n.pending,'reviewed-known-result-unavailable',n.known,'reviewed-unknown-administrative-result',n.unknown)order by scope.ord)
 from private_baden_history.prepared p join private_baden_history.catalog cat on cat.manifest_sha256=p.manifest_sha256
 cross join lateral(values(cat.manifest->>'currentCode',1),(cat.manifest->>'archiveCode',2))scope(code,ord)
 cross join lateral(select count(*)filter(where b#>'{fixture,score}'='null'::jsonb and not(b#>>'{fixture,unavailable}')::boolean)unplayed,
 count(*)filter(where not(b#>>'{fixture,unavailable}')::boolean and b#>'{fixture,score}'<>'null'::jsonb and m.statistics_status='available')complete,
 count(*)filter(where m.statistics_status='pending_cards')pending,
 count(*)filter(where(b#>>'{fixture,unavailable}')::boolean and b#>'{fixture,score}'<>'null'::jsonb)known,
 count(*)filter(where(b#>>'{fixture,unavailable}')::boolean and b#>'{fixture,score}'='null'::jsonb)unknown
 from jsonb_array_elements(p.bindings)b join matches m on m.id=(b->>'matchId')::bigint where b->>'sourceCompetitionId'=scope.code)n
 where p.competition_id=cid
$$;
create function private_baden_history.check_launch(cid bigint,doc jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare v jsonb;headers jsonb;unknowns jsonb;counts jsonb;ready jsonb;prices jsonb;cost numeric;clubs int;opening rounds;f jsonb;b jsonb;m matches;rr rounds;x jsonb;expected int;
begin
 v:=public.get_fussball_historical_runtime(cid);headers:=private_baden_history.launch_headers(cid);counts:=private_baden_history.launch_counts(cid);
 select coalesce(jsonb_agg(x order by(x->>'matchId')::bigint),'[]')into unknowns from jsonb_array_elements(headers)x where x#>>'{fixture,resultKnown}'='false';
 ready:=public.check_fussball_card_readiness(cid,v#>>'{manifest,currentCode}');
 perform private_baden_history.require(doc->>'version'='2' and doc->>'currentCode'=v#>>'{manifest,currentCode}' and doc->'archiveCodes'=jsonb_build_array(v#>>'{manifest,archiveCode}') and (v#>>'{manifest,currentFreshUntil}')::timestamptz>clock_timestamp()
 and doc->>'historicalPolicySha256'=v->>'policySha256' and doc->>'historicalInventorySha256'=v->>'markerInventorySha256' and doc->'historicalHeaders'=headers and doc->'unknownResultHeaders'=unknowns and doc->'partitionCounts'=counts
 and doc->>'compositionProofSha256'=private_baden_history.sha(jsonb_build_object('derivedPackSha256',v#>'{manifest,derivedPackSha256}','bindingSha256',v->'bindingSha256','historicalPolicySha256',v->'policySha256','historicalInventorySha256',v->'markerInventorySha256','headers',headers,'partitionCounts',counts))
 and doc->>'sourceProofSha256'~'^[a-f0-9]{64}$' and doc->>'nightlyCacheSha256'~'^[a-f0-9]{64}$' and doc->>'pendingInventorySha256'=ready->>'pending_inventory_sha256' and doc->'openingRoundId'=v->'openingRoundId','version2 exact source/history/cards/cache/partition conjunction required');
 select *into strict opening from rounds where id=(v->>'openingRoundId')::bigint and competition_id=cid;
 perform private_baden_history.require(opening.played_on=(v->>'firstFantasyPlayedOn')::date and opening.deadline_at>clock_timestamp() and opening.lineups_locked_at is null and not exists(select 1 from fantasy_lineups where round_id=opening.id),'exact future unlocked source opening required');
 for b in select value from jsonb_array_elements(v->'bindings')loop
  f:=b->'fixture';select *into strict m from matches where id=(b->>'matchId')::bigint;select *into strict rr from rounds where id=m.round_id;
  -- Time is official fixture evidence. Never substitute a date-only/default hour.
  perform private_baden_history.require(f->>'time'~'^([01][0-9]|2[0-3]):[0-5][0-9]$' and rr.deadline_at=(select min(((q->>'date')::date+(q->>'time')::time)at time zone'Europe/Berlin')-make_interval(hours=>(v#>>'{manifest,deadlineOffsetHours}')::int)from jsonb_array_elements(v#>'{manifest,fixtures}')q where q->>'season'=rr.season and(q->>'round')::int=rr.number),'official kickoff/deadline differs');
  if(f->>'unavailable')::boolean then
   perform private_baden_history.require(not exists(select 1 from jsonb_array_elements(doc->'playedReports')x where(x->>'matchId')::bigint=m.id),'unavailable fixture cannot register or replay cards');
  elsif f->'score'='null'::jsonb then
   perform private_baden_history.require(m.statistics_status='available' and m.imported_at is null and m.home_goals=0 and m.away_goals=0 and m.zapisnik_id=f->>'reportId' and m.played_on=(f->>'date')::date and not exists(select 1 from appearances where match_id=m.id) and not exists(select 1 from goals where match_id=m.id) and m.played_on>=(clock_timestamp()at time zone'Europe/Berlin')::date,'unplayed source/native header drift');
   if rr.id=opening.id then perform private_baden_history.require(((f->>'date')::date+(f->>'time')::time)at time zone'Europe/Berlin'>clock_timestamp(),'opening official kickoff already passed');end if;
  else
   select count(*)into expected from jsonb_array_elements(doc->'playedReports')x join private_fussball.card_heads h on h.match_id=(x->>'matchId')::bigint join private_fussball.card_reports cr on cr.id=h.report_id where h.match_id=m.id and x->>'reportId'=m.zapisnik_id and x->>'revisionSha256'=cr.revision_sha256;
   perform private_baden_history.require(expected=1 and m.home_goals=(f#>>'{score,domaci}')::int and m.away_goals=(f#>>'{score,gostje}')::int and not m.kontumacija and not m.vir_brez_izida and ((m.statistics_status='available' and m.imported_at is not null and not exists(select 1 from unnest(m.import_warnings)w where w like'zapisnik nepopoln%'))or(m.statistics_status='pending_cards' and m.imported_at is null)),'every ordinary played fixture requires canonical complete/pending registered report');
   if m.statistics_status='available' then
    perform private_baden_history.require(not exists(select 1 from(values(m.home_team_id),(m.away_team_id))t(tid)where(select count(*)from appearances a where a.match_id=m.id and a.team_id=t.tid and a.started)<>11 or(select count(*)from appearances a where a.match_id=m.id and a.team_id=t.tid and a.started and a.is_goalkeeper)<>1)
     and m.home_goals=(select count(*)from goals g where g.match_id=m.id and(g.team_id=m.home_team_id)<>g.is_own_goal) and m.away_goals=(select count(*)from goals g where g.match_id=m.id and(g.team_id=m.away_team_id)<>g.is_own_goal)
     and not exists(select 1 from goals g where g.match_id=m.id and not exists(select 1 from appearances a where a.match_id=m.id and a.player_id=g.scorer_id and a.team_id=g.team_id)),'complete ordinary native XI/keeper/goal ledger required');
   end if;
  end if;
 end loop;
 perform private_baden_history.require(jsonb_typeof(doc->'playedReports')='array' and jsonb_array_length(doc->'playedReports')=jsonb_array_length(ready->'registered_reports') and (select count(distinct x->>'matchId')from jsonb_array_elements(doc->'playedReports')x)=jsonb_array_length(doc->'playedReports') and not exists(select 1 from jsonb_array_elements(doc->'playedReports')x where not exists(select 1 from jsonb_array_elements(ready->'registered_reports')r where r->>'match_id'=x->>'matchId' and r->>'report_id'=x->>'reportId' and r->>'revision_sha256'=x->>'revisionSha256')),'complete distinct ordinary report/card inventory required');
 -- Derive participating CURRENT clubs from the sealed schedule; no 14/16 guess.
 select count(distinct tid)into clubs from jsonb_array_elements(v->'bindings')b cross join lateral(values((b->>'homeTeamId')::bigint),((b->>'awayTeamId')::bigint))t(tid)where b->>'sourceCompetitionId'=v#>>'{manifest,currentCode}';
 perform private_baden_history.require(not exists(select 1 from(select distinct tid from jsonb_array_elements(v->'bindings')b cross join lateral(values((b->>'homeTeamId')::bigint),((b->>'awayTeamId')::bigint))t(tid)where b->>'sourceCompetitionId'=v#>>'{manifest,currentCode}')club
 where not exists(select 1 from players p where p.competition_id=cid and p.active and p.team_id=club.tid and p.position='GK' and p.position_source in('zapisnik','admin','glasovanje','klub') and p.reg_st is not null and
 (exists(select 1 from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=cid and r.season='2026/27' and a.player_id=p.id and a.team_id=p.team_id and a.is_goalkeeper)
 or exists(select 1 from private_fussball.card_reports cr join private_fussball.card_heads h on h.report_id=cr.id join matches m on m.id=h.match_id cross join lateral jsonb_array_elements(cr.envelope->'roster')ro where cr.competition_id=cid and cr.source_code=v#>>'{manifest,currentCode}' and m.statistics_status='pending_cards' and(ro->>'starter')::boolean and(ro->>'goalkeeper')::boolean and(ro->>'regSt')::bigint=p.reg_st and case when ro->>'side'='0'then m.home_team_id else m.away_team_id end=p.team_id)))),'all participating current clubs need active source-linked goalkeeper evidence');
 prices:=public.stanje_lige(cid);cost:=public.najcenejsi_kader(prices->'igralci');
 perform private_baden_history.require((prices->>'klubov')::int=clubs and cost is not null and cost<=100 and(prices->>'najvisja_cena')::numeric>=8 and coalesce((prices->>'privzetih')::numeric/nullif((prices->>'aktivnih')::numeric,0),1)<=0.7 and(prices->>'golov_brez_nastopa')::int=0 and(prices->>'nastopov_s_klopi')::int>0 and not exists(select 1 from players where competition_id=cid and active and(value is null or value<=0 or value::text in('NaN','Infinity','-Infinity')or position is null or position not in('GK','DEF','MID','FWD'))),'ordinary varied finite pricing/eligible clubs/bench/affordable legal15 required');
 return v;
end$$;

alter function private_fussball.admission_state(bigint)rename to admission_state_cards_v1;
create function private_fussball.admission_state(cid bigint)returns text language sql stable security definer set search_path=public,pg_temp as $$
 select case when exists(select 1 from private_baden_history.prepared where competition_id=cid)then private_baden_history.sha(jsonb_build_object('cardsNative',private_fussball.admission_state_cards_v1(cid),'prepared',(select to_jsonb(p)from private_baden_history.prepared p where competition_id=cid),'history',public.get_installed_historical_statistics_markers(cid),'runtime',public.get_fussball_historical_runtime(cid)-'active'))else private_fussball.admission_state_cards_v1(cid)end
$$;
alter function public.record_fussball_card_admission(bigint,text,jsonb,text)rename to record_fussball_card_admission_v1;
alter function public.record_fussball_card_admission_v1(bigint,text,jsonb,text)set schema private_fussball;
create function public.record_fussball_card_admission(p_competition_id bigint,p_code text,p_manifest jsonb,p_sha256 text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare c competitions;v jsonb;
begin
 if p_manifest->>'version' is distinct from'2'then return private_fussball.record_fussball_card_admission_v1(p_competition_id,p_code,p_manifest,p_sha256);end if;
 perform private_fussball.scope(p_competition_id,p_code);
 select *into strict c from competitions where id=p_competition_id for update;
 lock table teams,players,rounds,matches,appearances,goals,fantasy_teams,fantasy_lineups,private_baden_history.prepared,private_baden_history.catalog,private_historical_statistics.markers,private_historical_statistics.installed_policies,private_fussball.card_policies,private_fussball.card_heads,private_fussball.card_reports in share mode;
 perform private_baden_history.require(not c.active and c.slug='de-verbandsliga-baden' and c.source_league_code=p_code and not exists(select 1 from fantasy_teams where competition_id=c.id) and p_sha256=private_baden_history.sha(p_manifest),'inactive exact version2 canonical admission required');
 v:=private_baden_history.check_launch(c.id,p_manifest);
 perform private_baden_history.require(c.prvi_fantasy_krog=(select number from rounds where id=(v->>'openingRoundId')::bigint),'configure exact source opening before admission');
 insert into private_fussball.card_admissions(competition_id,manifest,manifest_sha256,state_sha256)values(c.id,p_manifest,p_sha256,private_fussball.admission_state(c.id))on conflict(competition_id)do update set manifest=excluded.manifest,manifest_sha256=excluded.manifest_sha256,state_sha256=excluded.state_sha256,registered_at=clock_timestamp();
 return jsonb_build_object('registered',true,'manifest_sha256',p_sha256,'pending_inventory_sha256',p_manifest->>'pendingInventorySha256','opening_round_id',(v->>'openingRoundId')::bigint,'historical_policy_sha256',v->>'policySha256','historical_inventory_sha256',v->>'markerInventorySha256');
end$$;

alter function public.vklopi_ligo_sredi_sezone(text)rename to activate_cards_v1;
alter function public.activate_cards_v1(text)set schema private_baden_history;
create function public.vklopi_ligo_sredi_sezone(p_slug text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare c competitions;a private_fussball.card_admissions;v jsonb;answer jsonb;
begin
 select *into c from competitions where slug=p_slug for update;
 if not exists(select 1 from private_baden_history.prepared where competition_id=c.id)then return private_baden_history.activate_cards_v1(p_slug);end if;
 perform private_fussball.service();
 lock table teams,players,rounds,matches,appearances,goals,fantasy_teams,fantasy_lineups,private_baden_history.prepared,private_baden_history.catalog,private_historical_statistics.markers,private_historical_statistics.installed_policies,private_fussball.card_policies,private_fussball.card_heads,private_fussball.card_reports in share mode;
 select *into strict a from private_fussball.card_admissions where competition_id=c.id;
 perform private_baden_history.require(not c.active and a.manifest->>'version'='2' and a.manifest_sha256=private_baden_history.sha(a.manifest) and a.state_sha256=private_fussball.admission_state(c.id) and a.registered_at>clock_timestamp()-interval'1 hour' and not exists(select 1 from fantasy_teams where competition_id=c.id),'fresh unchanged version2 conjunction admission required');
 v:=private_baden_history.check_launch(c.id,a.manifest);
 perform private_historical_statistics.authorize_release(c.id,v#>>'{history,policyId}',v->>'policySha256',a.manifest_sha256);
 answer:=private_baden_history.activate_cards_v1(p_slug);
 perform private_baden_history.require(answer->>'vklopljena'='true' and (public.get_fussball_historical_runtime(c.id)->>'active')::boolean,'active combined policy readback required');
 return answer||jsonb_build_object('historical_policy_sha256',v->>'policySha256','historical_inventory_sha256',v->>'markerInventorySha256','composition_proof_sha256',a.manifest->>'compositionProofSha256');
end$$;
-- Native readiness reports both installed hashes for exact composed targets.
alter function public.check_fussball_card_readiness(bigint,text)rename to check_fussball_card_readiness_v1;
alter function public.check_fussball_card_readiness_v1(bigint,text)set schema private_baden_history;
create function public.check_fussball_card_readiness(p_competition_id bigint,p_code text)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare cards jsonb;history jsonb;
begin
 cards:=private_baden_history.check_fussball_card_readiness_v1(p_competition_id,p_code);
 if exists(select 1 from private_baden_history.prepared where competition_id=p_competition_id)then
  history:=public.get_installed_historical_statistics_markers(p_competition_id);
  perform private_baden_history.require(history->>'installed'='true','complete installed history required alongside cards');
  cards:=cards||jsonb_build_object('historical_policy_sha256',history->>'policySha256','historical_inventory_sha256',private_baden_history.sha(history->'markers'),'composed_admission_version',2);
 end if;return cards;
end$$;
revoke all on function public.check_fussball_card_readiness(bigint,text)from public,anon,authenticated;
grant execute on function public.check_fussball_card_readiness(bigint,text)to service_role;

-- Both triggers independently check the same transaction's conjunction. Direct
-- UPDATE, version1 admission, or a card-only activation context cannot pass.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('private_fussball.policy_guard()'::regprocedure);
 changed:=replace(d,'elsif new.active then', $q$elsif new.active then
  if exists(select 1 from private_baden_history.prepared where competition_id=new.id)then
   perform private_baden_history.require(exists(select 1 from private_fussball.card_admissions ca join private_historical_statistics.release_authorizations ha on ha.competition_id=ca.competition_id where ca.competition_id=new.id and ca.manifest->>'version'='2' and ca.state_sha256=private_fussball.admission_state(new.id) and ha.authorized_xid=txid_current() and ha.state_sha256=private_historical_statistics.state_sha256(new.id)),'both transaction-bound history and cards authorizations required');
  end if;$q$);
 if changed=d then raise exception 'BADEN_HISTORY: card activation guard anchor missing';end if;execute changed;
end$$;
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('private_historical_statistics.guard_activation()'::regprocedure);
 changed:=replace(d,'if not new.active then return new;end if;', $q$if not new.active then return new;end if;
 if tg_op='UPDATE'and not old.active and exists(select 1 from private_baden_history.prepared where competition_id=new.id)then
  perform private_baden_history.require(exists(select 1 from private_fussball.card_activation_context a join private_fussball.card_admissions ca on ca.competition_id=a.competition_id where a.competition_id=new.id and a.xid=txid_current() and a.state_sha256=private_fussball.admission_state(new.id) and ca.manifest->>'version'='2' and ca.state_sha256=a.state_sha256),'history activation also requires matching transactional cards context');
 end if;$q$);
 if changed=d then raise exception 'BADEN_HISTORY: generic activation guard anchor missing';end if;execute changed;
end$$;
revoke all on all functions in schema private_baden_history from public,anon,authenticated,service_role;
revoke all on function private_fussball.record_fussball_card_admission_v1(bigint,text,jsonb,text),private_fussball.admission_state_cards_v1(bigint),private_fussball.admission_state(bigint)from public,anon,authenticated,service_role;
revoke all on function public.record_fussball_card_admission(bigint,text,jsonb,text),public.vklopi_ligo_sredi_sezone(text)from public,anon,authenticated;
grant execute on function public.record_fussball_card_admission(bigint,text,jsonb,text),public.vklopi_ligo_sredi_sezone(text)to service_role;

-- Public boolean projection contains no private report bytes or policy data.
create function public.baden_known_native_result(p_match_id bigint)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from matches m join rounds r on r.id=m.round_id join competitions c on c.id=r.competition_id join private_baden_history.prepared bp on bp.competition_id=c.id
 where m.id=p_match_id and c.slug='de-verbandsliga-baden' and c.source='fussball-public' and c.source_policy='fussball-community-cards-v1' and c.source_league_code='03188V27L800000JVS5489BTVU7GTVLE-G:2026/27' and m.home_goals is not null and m.away_goals is not null
 and((m.statistics_status='unavailable_historical' and exists(select 1 from private_historical_statistics.markers mk where mk.competition_id=c.id and mk.round_id=m.round_id and mk.source_report_id=m.zapisnik_id and mk.fixture->>'resultKnown'='true'))or(m.statistics_status='pending_cards' and exists(select 1 from private_fussball.card_heads ch join private_fussball.card_reports cr on cr.id=ch.report_id where ch.match_id=m.id and cr.competition_id=c.id and cr.envelope->>'reportId'=m.zapisnik_id))))
$$;
revoke all on function public.baden_known_native_result(bigint)from public;
grant execute on function public.baden_known_native_result(bigint)to anon,authenticated,service_role;
-- Known official header/card results count in standings for the exact installed
-- Baden tuple. Existing paired-null and all other provider predicates remain.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('public.lestvica_lige(bigint,text)'::regprocedure);
 changed:=replace(d,'m.imported_at is not null or m.kontumacija or(', 'm.imported_at is not null or m.kontumacija or public.baden_known_native_result(m.id) or(');
 if changed=d then raise exception 'BADEN_HISTORY: standings result predicate anchor missing';end if;execute changed;
end$$;

-- CHECK expressions initialize function ACLs even for ordinary known scores.
-- Grant only schema lookup and these boolean predicates to the actual importer.
-- Private marker/catalog tables and all preparer/mutator functions stay closed.
grant usage on schema private_baden_history,private_fcf_six_history to service_role;
grant execute on function private_baden_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer),private_fcf_six_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)to service_role;
do $$begin
 if to_regprocedure('private_fcf_g1_supplement.unknown_result_allowed(text,text,date,text,text,text,integer,integer,integer,timestamp with time zone,boolean,boolean,text[])')is not null then
  grant usage on schema private_fcf_g1_supplement to service_role;
  grant execute on function private_fcf_g1_supplement.unknown_result_allowed(text,text,date,text,text,text,integer,integer,integer,timestamptz,boolean,boolean,text[])to service_role;
 end if;
end$$;
