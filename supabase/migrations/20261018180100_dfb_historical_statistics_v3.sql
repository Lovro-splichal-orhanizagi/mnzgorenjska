-- Separate v3 boundary; the existing strict v1/v2 implementation stays unchanged.
create function private_dfb_release.validate_historical_manifest(p_manifest text,p_sha256 text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb;c competitions%rowtype;s jsonb;p private_historical_statistics.policies%rowtype;n int;nr int;capture jsonb;r jsonb;x jsonb;generated timestamptz;captured timestamptz;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'DE_RELEASE: READ COMMITTED required'; end if;
 if p_manifest is null or octet_length(p_manifest)>8388608 or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
    or encode(sha256(convert_to(p_manifest,'UTF8')),'hex')<>p_sha256 then raise exception 'DE_RELEASE: reviewed manifest SHA/size mismatch'; end if;
 v:=p_manifest::jsonb;
 if v->>'version' is distinct from '3' or v->>'provenanceVersion' is distinct from '2' or v->>'slug' is distinct from 'de-regionalliga-suedwest'
    or coalesce(v->>'sourceCommit','') !~ '^[a-f0-9]{40}$' or coalesce(v->>'parserSha256','') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(v->'seasons') is distinct from 'array' or jsonb_array_length(v->'seasons')<>2 then raise exception 'DE_RELEASE: invalid scope/provenance'; end if;
 select * into p from private_historical_statistics.policies where id='de-dfb-suedwest-2025-historical-unavailable-v1';
 if p.id is null or v#>>'{statisticsPolicy,id}'is distinct from p.id or v#>>'{statisticsPolicy,sha256}'is distinct from p.policy_sha256 or(v#>>'{statisticsPolicy,firstFantasyPlayedOn}')is null then raise exception 'DE_RELEASE: approved policy/hash/date required';end if;
 select * into c from competitions where slug=v->>'slug' for update;
 if c.id is null or c.active or c.source is distinct from 'dfb' or c.source_league_code is distinct from substring(c.slug from 4)||'/2026-2027'
    or c.rok_pomak_ur is distinct from 6 or sezona_lige(c.id) is distinct from '2026/27'
    or not exists(select 1 from countries where id=c.country_id and code='DE') then raise exception 'DE_RELEASE: wrong league/source/season or already active'; end if;
 -- A consistent read-committed snapshot is rechecked after these locks. Writers
 -- cannot change names, roles, prices, match identities or statistics until commit.
 lock table teams,players,rounds,matches,appearances,goals in share mode;
 drop table if exists pg_temp._dfb_expected;
 create temporary table _dfb_expected(season text,id text primary key,round int,day date,home text,away text,f jsonb) on commit drop;
 for s in select value from jsonb_array_elements(v->'seasons') loop
  n:=case when c.slug='de-regionalliga-bayern' and s->>'season'='2026/27' then 19 else 18 end;
  nr:=case n when 19 then 38 else 34 end;
  if s->>'season' not in('2025/26','2026/27') or s->>'season' is null
     or s->>'code' is distinct from substring(c.slug from 4)||'/'||left(s->>'season',4)||'-20'||right(s->>'season',2)
     or coalesce(s->>'runId','') !~ '^[1-9][0-9]{0,19}$' or coalesce(s->>'jobId','') !~ '^[1-9][0-9]{0,19}$'
     or coalesce(s->>'documentsSha256','') !~ '^[a-f0-9]{64}$' or s->>'capturedAt' is null
     or (s->>'capturedAt')::timestamptz>clock_timestamp()+interval '5 minutes'
     or (s->>'capturedAt')::timestamptz<clock_timestamp()-(case s->>'season' when '2025/26' then interval '7 days' else interval '12 hours' end)
     or jsonb_typeof(s->'fixtures') is distinct from 'array' or jsonb_array_length(s->'fixtures')<>n*(n-1) then raise exception 'DE_RELEASE: invalid/stale season evidence'; end if;
  insert into _dfb_expected select s->>'season',f->>'id',(f->>'round')::int,(f->>'date')::date,f->>'home',f->>'away',f from jsonb_array_elements(s->'fixtures')f;
  if exists(select 1 from _dfb_expected e where e.season=s->>'season' and (e.id !~ '^de-dfb-[1-9][0-9]{0,9}$'
     or e.round is null or e.round not between 1 and nr or e.day is null or e.day<make_date(left(e.season,4)::int,7,1) or e.day>=make_date(left(e.season,4)::int+1,7,1)
     or e.home is null or e.away is null or e.home=e.away or length(e.home) not between 1 and 250 or length(e.away) not between 1 and 250
     or jsonb_typeof(f->'played') is distinct from 'boolean' or (e.season='2025/26' and f->>'played'<>'true')
     or not(f ? 'time') or (f->>'time' is not null and f->>'time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
     or f->>'statisticsStatus' not in('available','unavailable_historical') or f->>'statisticsStatus' is null or jsonb_typeof(f->'warnings') is distinct from 'array'
     or(f->>'statisticsStatus'='available'and(jsonb_typeof(f->'starters') is distinct from 'array' or jsonb_typeof(f->'appearances') is distinct from 'array' or jsonb_typeof(f->'goals') is distinct from 'array'))
     or (f->>'statisticsStatus'='available'and(f->>'played')::boolean and (jsonb_array_length(f->'starters')<>22 or jsonb_array_length(f->'appearances')<22
         or f->>'homeGoals' is null or f->>'awayGoals' is null or (f->>'homeGoals')::int not between 0 and 30 or (f->>'awayGoals')::int not between 0 and 30
         or f->>'url' is null or f->>'url' !~ ('^https://datencenter[.]dfb[.]de/datencenter/'||substring(c.slug from 4)||'/'||left(e.season,4)||'-20'||right(e.season,2)||'/')))
     or (not (f->>'played')::boolean and (f->>'homeGoals' is not null or f->>'awayGoals' is not null or f->'starters'<>'[]'::jsonb or f->'appearances'<>'[]'::jsonb or f->'goals'<>'[]'::jsonb)))) then raise exception 'DE_RELEASE: invalid fixture/complete report evidence'; end if;
  if (select count(distinct round) from _dfb_expected where season=s->>'season')<>nr
     or (select count(distinct (home,away)) from _dfb_expected where season=s->>'season')<>n*(n-1)
     or exists(select 1 from _dfb_expected where season=s->>'season' group by round having count(*)<>n/2)
     or exists(select 1 from (select round,home name from _dfb_expected where season=s->>'season' union all select round,away from _dfb_expected where season=s->>'season')x group by round having count(distinct name)<>2*(n/2))
     or (select count(*) from (select home from _dfb_expected where season=s->>'season' union select away from _dfb_expected where season=s->>'season')x)<>n then raise exception 'DE_RELEASE: incomplete season pairs/rounds/byes'; end if;

  if s->>'evidenceMode' is distinct from 'policy-replay' then raise exception 'DE_RELEASE: policy replay required';end if;
  if exists(select 1 from _dfb_expected e where e.season=s->>'season'and e.f->>'statisticsStatus'='available'and(
   e.f->>'statisticsReason'is not null or e.f->>'statisticsPolicyId'is not null or e.f->>'statisticsPolicySha256'is not null or e.f->>'sourceRawSha256'is not null or e.f->>'sourceFixture'is not null
   or((e.f->>'played')::boolean and jsonb_array_length(e.f->'goals')<>(e.f->>'homeGoals')::int+(e.f->>'awayGoals')::int)))then raise exception 'DE_RELEASE: normal statistics shape/policy evidence differs';end if;
  if (select coalesce(array_agg(id order by id),array[]::text[])from _dfb_expected where season=s->>'season'and f->>'statisticsStatus'='unavailable_historical')is distinct from(case s->>'season'when '2025/26'then array['de-dfb-2402929','de-dfb-2403004']else array[]::text[]end)then raise exception 'DE_RELEASE: exact historical set differs';end if;
  if exists(select 1 from _dfb_expected e left join lateral(select value entry from jsonb_array_elements(p.document->'entries')where 'de-dfb-'||(value->>'sourceMatchId')=e.id)approved on true where e.season=s->>'season'and e.f->>'statisticsStatus'='unavailable_historical'and(
   e.season<>'2025/26'or approved.entry is null or e.f->'played'is distinct from 'true'::jsonb or e.f->'starters'is distinct from 'null'::jsonb or e.f->'appearances'is distinct from 'null'::jsonb or e.f->'goals'is distinct from 'null'::jsonb
   or e.f->'sourceFixture'is distinct from(approved.entry-array['rawSha256','reasonCode'])||jsonb_build_object('season','2025/26')
   or e.f->>'sourceRawSha256'is distinct from approved.entry->>'rawSha256'or e.f->>'statisticsReason'is distinct from approved.entry->>'reasonCode'or e.f->>'statisticsPolicyId'is distinct from p.id or e.f->>'statisticsPolicySha256'is distinct from p.policy_sha256
   or e.day is distinct from(approved.entry->>'playedOn')::date or e.round is distinct from(approved.entry->>'sourceRound')::int or e.f->>'time'is distinct from '14:00'or e.f->>'url'is distinct from approved.entry->>'sourceUrl'
   or(e.f->>'homeGoals')::int is distinct from(approved.entry->>'observedHomeScore')::int or(e.f->>'awayGoals')::int is distinct from(approved.entry->>'observedAwayScore')::int
   or not exists(select 1 from private_historical_statistics.source_club_bindings b where b.provider='dfb'and b.source_club_id=approved.entry->>'homeSourceClubId'and b.source_category_id=''and e.home=any(b.canonical_names))
   or not exists(select 1 from private_historical_statistics.source_club_bindings b where b.provider='dfb'and b.source_club_id=approved.entry->>'awaySourceClubId'and b.source_category_id=''and e.away=any(b.canonical_names))))then raise exception 'DE_RELEASE: unavailable exact fixture/header binding differs';end if;
  if s->'statisticsCoverage'is distinct from jsonb_build_object('fixtureCount',306,'playedCount',(select count(*)from _dfb_expected where season=s->>'season'and(f->>'played')::boolean),'availableStatisticsCount',(select count(*)from _dfb_expected where season=s->>'season'and(f->>'played')::boolean and f->>'statisticsStatus'='available'),'unavailableHistoricalCount',case s->>'season'when '2025/26'then 2 else 0 end,'strictStatisticsCoverage',s->>'season'='2026/27','policyCoverage',true)then raise exception 'DE_RELEASE: honest statistics coverage differs';end if;
 end loop;
 if v#>>'{seasons,0,season}' is distinct from '2025/26' or v#>>'{seasons,1,season}' is distinct from '2026/27'
    or not exists(select 1 from _dfb_expected where season='2026/27' and (f->>'played')::boolean) then raise exception 'DE_RELEASE: two ordered seasons/current reports required'; end if;
 for s in select value from jsonb_array_elements(v->'seasons') loop
  capture:=s#>'{lineage,capture}';r:=s#>'{lineage,replay}';
  foreach x in array array[capture,r] loop
   if jsonb_typeof(x) is distinct from 'object'
    or coalesce(x->>'runId','') !~ '^[1-9][0-9]{0,19}$' or coalesce(x->>'jobId','') !~ '^[1-9][0-9]{0,19}$'
    or coalesce(x->>'commit','') !~ '^[a-f0-9]{40}$' or coalesce(x->>'parserSha256','') !~ '^[a-f0-9]{64}$'
    or coalesce(x->>'workflowSha256','') !~ '^[a-f0-9]{64}$' or coalesce(x->>'artifactId','') !~ '^[1-9][0-9]{0,19}$'
    or coalesce(x->>'artifactDigest','') !~ '^sha256:[a-f0-9]{64}$' then raise exception 'DE_RELEASE: invalid replay execution identity'; end if;
  end loop;
  if capture->>'workflow' is distinct from '.github/workflows/preveri-dfb-ligo.yml'
   or capture->>'step' is distinct from (case s->>'season' when '2025/26' then 'Arhiv sezona — brez baze' when '2026/27' then 'Tekoča sezona — brez baze' end)
   or coalesce(capture->>'conclusion','') not in('success','failure') or capture->>'runId'=r->>'runId'
   or coalesce(capture->>'indexSha256','') !~ '^[a-f0-9]{64}$'
   or capture->>'documentsSha256' is distinct from s->>'documentsSha256' or capture->>'capturedAt' is distinct from s->>'capturedAt'
   or(s->>'season'='2026/27'and capture->>'conclusion'is distinct from 'success')
   or r->>'statisticsPolicyId'is distinct from v#>>'{statisticsPolicy,id}'or r->>'statisticsPolicySha256'is distinct from v#>>'{statisticsPolicy,sha256}'or r->>'firstFantasyPlayedOn'is distinct from v#>>'{statisticsPolicy,firstFantasyPlayedOn}'
   or r->>'workflow' is distinct from '.github/workflows/ponovi-dfb-regijo.yml' or r->>'step' is distinct from 'Ponovi sezono s pregledano zgodovinsko politiko — brez omrežja in baze'
   or r->>'runId' is distinct from s->>'runId' or r->>'jobId' is distinct from s->>'jobId'
   or r->>'commit' is distinct from v->>'sourceCommit' or r->>'parserSha256' is distinct from v->>'parserSha256'
   then raise exception 'DE_RELEASE: changed replay lineage'; end if;
  begin
   generated:=(r->>'generatedAt')::timestamptz;captured:=(capture->>'capturedAt')::timestamptz;
  exception when others then raise exception 'DE_RELEASE: invalid replay timestamp'; end;
  if generated is null or captured is null or not isfinite(generated) or not isfinite(captured) or generated<captured or generated>clock_timestamp()+interval '5 minutes' then raise exception 'DE_RELEASE: invalid replay generation time'; end if;
 end loop;

 if exists(select 1 from _dfb_expected e cross join lateral jsonb_to_recordset(case when e.f->>'statisticsStatus'='available'then e.f->'starters'else '[]'::jsonb end)a(side int,name text,keeper boolean,proof text)
  where a.side is null or a.side not in(0,1)or a.name is null or a.keeper is null or a.proof is distinct from(case when a.keeper then 'oznaka-T'end))
 or exists(select 1 from _dfb_expected e cross join lateral jsonb_to_recordset(case when e.f->>'statisticsStatus'='available'then e.f->'starters'else '[]'::jsonb end)a(side int,name text,keeper boolean,proof text)group by e.id,a.side having count(*)<>11 or count(*)filter(where a.keeper)<>1)
 or exists(with starters as(select e.id,a->'side' side,a->'name'name,a->'keeper'keeper from _dfb_expected e cross join lateral jsonb_array_elements(case when e.f->>'statisticsStatus'='available'then e.f->'starters'else '[]'::jsonb end)a),
 appearances as(select e.id,a->'side'side,a->'name'name,a->'is_goalkeeper'keeper from _dfb_expected e cross join lateral jsonb_array_elements(case when e.f->>'statisticsStatus'='available'then e.f->'appearances'else '[]'::jsonb end)a where a->'started'='true'::jsonb)
 (select * from starters except all select * from appearances)union all(select * from appearances except all select * from starters))then raise exception 'DE_RELEASE: normal explicit XI/appearance evidence differs';end if;
 return v;
end $$;
revoke all on function private_dfb_release.validate_historical_manifest(text,text)from public,anon,authenticated,service_role;

-- Preinstall only verified fixture/club/round headers. Both unavailable markers
-- are installed atomically before generic archive/schedule/report traversal.
create function public.prepare_dfb_historical_statistics(p_manifest text,p_sha256 text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare v jsonb;c competitions%rowtype;p private_historical_statistics.policies%rowtype;f jsonb;e jsonb;x record;tid bigint;rid bigint;hid bigint;aid bigint;k int;day date;due timestamptz;expected_day date;expected_due timestamptz;
begin
 select * into c from competitions where slug='de-regionalliga-suedwest'for update;
 lock table teams,players,rounds,matches,appearances,goals,fantasy_teams in share row exclusive mode;
 v:=private_dfb_release.validate_historical_manifest(p_manifest,p_sha256);
 select * into p from private_historical_statistics.policies where id=v#>>'{statisticsPolicy,id}';
 if c.id is null or c.active or(c.source_policy is not null and c.source_policy is distinct from p.document->>'sourcePolicy')or exists(select 1 from fantasy_teams where competition_id=c.id)then raise exception 'DE_RELEASE: inactive empty-user bootstrap target required';end if;
 select min(round)into k from(select round from _dfb_expected where season='2026/27'group by round having not bool_or((f->>'played')::boolean)and min((day+(f->>'time')::time)at time zone 'Europe/Berlin')-interval '6 hours'>clock_timestamp())next_round;
 select min(day),min((day+(f->>'time')::time)at time zone 'Europe/Berlin')-interval '6 hours'into day,due from _dfb_expected where season='2026/27'and round=k;
 if k is null or day is distinct from(v#>>'{statisticsPolicy,firstFantasyPlayedOn}')::date or due<=clock_timestamp()or exists(select 1 from _dfb_expected where season='2026/27'and round=k and day=(v#>>'{statisticsPolicy,firstFantasyPlayedOn}')::date and f->>'time'is null)then raise exception 'DE_RELEASE: verified next-future candidate/date required';end if;
 -- These are genuine source metadata, with no player/statistical observations.
 for x in select distinct name from(select home name from _dfb_expected where f->>'statisticsStatus'='unavailable_historical'union select away from _dfb_expected where f->>'statisticsStatus'='unavailable_historical')names loop
  select id into tid from teams where country_id=c.country_id and name=x.name;
  if tid is null then insert into teams(name,short_name,country_id)values(x.name,x.name,c.country_id)returning id into tid;end if;
 end loop;
 for x in select season,round from _dfb_expected where f->>'statisticsStatus'='unavailable_historical'group by season,round union select '2026/27',k loop
  select min(day),min((day+(f->>'time')::time)at time zone 'Europe/Berlin')-interval '6 hours'into expected_day,expected_due from _dfb_expected where season=x.season and round=x.round;
  select id into rid from rounds where competition_id=c.id and season=x.season and number=x.round;
  if rid is null then insert into rounds(competition_id,season,number,played_on,deadline_at)values(c.id,x.season,x.round,expected_day,expected_due)returning id into rid;
  elsif not exists(select 1 from rounds where id=rid and played_on=expected_day and deadline_at=expected_due and lineups_locked_at is null)then raise exception 'DE_RELEASE: existing bootstrap round metadata differs/locked';end if;
 end loop;
 update competitions set source_policy=p.document->>'sourcePolicy',prvi_fantasy_krog=k where id=c.id;
 perform public.apply_historical_statistics_policy(c.id,p.id,p.policy_sha256,p.document->'entries');
 for f in select f from _dfb_expected where f->>'statisticsStatus'='unavailable_historical'order by id loop
  select id into rid from rounds where competition_id=c.id and season='2025/26'and number=(f->>'round')::int;
  select id into hid from teams where country_id=c.country_id and name=f->>'home';select id into aid from teams where country_id=c.country_id and name=f->>'away';
  perform public.upsert_unavailable_historical_match(c.id,substring(f->>'id'from 8),p.id,p.policy_sha256,f->>'sourceRawSha256',jsonb_build_object('fixture',f->'sourceFixture','roundId',rid,'homeTeamId',hid,'awayTeamId',aid));
 end loop;
 e:=public.get_installed_historical_statistics_markers(c.id);
 if e->>'policyId'is distinct from p.id or e->>'policySha256'is distinct from p.policy_sha256 or e->>'firstFantasyPlayedOn'is distinct from v#>>'{statisticsPolicy,firstFantasyPlayedOn}'then raise exception 'DE_RELEASE: atomic marker binding readback differs';end if;
 return jsonb_build_object('prepared',true,'unavailableHistoricalCount',2,'prvi_krog',k,'firstFantasyPlayedOn',day,'rok',due,'manifestSha256',p_sha256);
end $$;
revoke all on function public.prepare_dfb_historical_statistics(text,text)from public,anon,authenticated;
grant execute on function public.prepare_dfb_historical_statistics(text,text)to service_role;

-- Full persisted canonical equality/readiness gate, independently of the importer.
create function private_dfb_release.varen_vklop_dfb_regije_v3(p_manifest text,p_sha256 text,p_aktiviraj boolean)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb;c competitions%rowtype;s jsonb;markers jsonb;price numeric;k int;deadline timestamptz;official_deadline timestamptz;locked timestamptz;first_day date;total_matches int;total_rounds int;
begin
 if p_aktiviraj is null then raise exception 'DE_RELEASE: explicit activation flag required';end if;
 v:=private_dfb_release.validate_historical_manifest(p_manifest,p_sha256);
 select * into c from competitions where slug=v->>'slug'for update;
 lock table fantasy_teams in share mode;
 if c.source_policy is distinct from 'de-dfb-suedwest-2025-historical-unavailable-v1'or exists(select 1 from fantasy_teams where competition_id=c.id)then raise exception 'DE_RELEASE: reviewed policy/inactive no-userdata release required';end if;
 markers:=public.get_installed_historical_statistics_markers(c.id);
 if markers->>'policyId'is distinct from v#>>'{statisticsPolicy,id}'or markers->>'policySha256'is distinct from v#>>'{statisticsPolicy,sha256}'then raise exception 'DE_RELEASE: complete installed policy markers required';end if;
 total_matches:=case c.slug when 'de-regionalliga-bayern' then 648 else 612 end;
 total_rounds:=case c.slug when 'de-regionalliga-bayern' then 72 else 68 end;
 drop table if exists pg_temp._dfb_actual;
 create temporary table _dfb_actual on commit drop as
 select m.*,r.season,r.number as round,h.name home,a.name away,e.f,e.id evidence_id
 from matches m join rounds r on r.id=m.round_id join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id
 left join _dfb_expected e on e.season=r.season and e.round=r.number and e.home=h.name and e.away=a.name where r.competition_id=c.id;
 if (select count(*) from _dfb_actual)<>total_matches or (select count(*) from rounds where competition_id=c.id)<>total_rounds
    or exists(select 1 from _dfb_actual where evidence_id is null)
    or (select count(distinct evidence_id) from _dfb_actual)<>total_matches then raise exception 'DE_RELEASE: persisted fixture set mismatch'; end if;
 if exists(select 1 from _dfb_actual a where a.played_on is distinct from (f->>'date')::date or a.kontumacija or a.vir_brez_izida
    or (f->>'statisticsStatus'='available'and(f->>'played')::boolean and (a.zapisnik_id is distinct from evidence_id or a.imported_at is null or a.home_goals is distinct from (f->>'homeGoals')::int or a.away_goals is distinct from (f->>'awayGoals')::int or a.source_url is distinct from f->>'url' or to_jsonb(a.import_warnings) is distinct from f->'warnings'))
    or (not(f->>'played')::boolean and (a.imported_at is not null or a.zapisnik_id is not null or a.home_goals<>0 or a.away_goals<>0))) then raise exception 'DE_RELEASE: persisted metadata/coverage mismatch'; end if;
 if exists(select 1 from _dfb_actual a where a.statistics_status is distinct from f->>'statisticsStatus'
  or(f->>'statisticsStatus'='unavailable_historical'and(a.imported_at is not null or a.zapisnik_id is distinct from evidence_id or a.home_goals is distinct from(f->>'homeGoals')::int or a.away_goals is distinct from(f->>'awayGoals')::int or a.source_url is distinct from f->>'url'or a.statistics_reason is distinct from f->>'statisticsReason'or a.source_phase is not null or a.source_round is distinct from(f->>'round')::int))
  or(f->>'statisticsStatus'='available'and a.statistics_reason is not null))then raise exception 'DE_RELEASE: installed availability/header differs';end if;
 -- EXCEPT ALL in both directions retains duplicate identity/event multiplicity.
 -- Ignore only generated IDs and fields the importer does not write (saved
 -- penalties, assists). Never join archive appearances on current player.team_id.
 if exists(
  with expected as(select a.id,x from _dfb_actual a cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else '[]'::jsonb end)x),
  actual as(select a.id,(to_jsonb(ap)-array['id','match_id','player_id','team_id','penalties_saved'])||jsonb_build_object('side',case ap.team_id when a.home_team_id then 0 when a.away_team_id then 1 else -1 end,'name',p.full_name) x
   from _dfb_actual a join appearances ap on ap.match_id=a.id join players p on p.id=ap.player_id where p.competition_id=c.id)
  (select * from expected except all select * from actual) union all (select * from actual except all select * from expected)
 ) or exists(select 1 from _dfb_actual a join appearances ap on ap.match_id=a.id join players p on p.id=ap.player_id where p.competition_id<>c.id)
 then raise exception 'DE_RELEASE: appearance identity/statistics multiset mismatch'; end if;
 if exists(
  with expected as(select a.id,x from _dfb_actual a cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'goals'else '[]'::jsonb end)x),
  actual as(select a.id,(to_jsonb(g)-array['id','match_id','scorer_id','team_id','assist_player_id','assist_confirmed_at','assist_none_confirmed_at'])||jsonb_build_object('side',case g.team_id when a.home_team_id then 0 when a.away_team_id then 1 else -1 end,'name',p.full_name) x
   from _dfb_actual a join goals g on g.match_id=a.id left join players p on p.id=g.scorer_id)
  (select * from expected except all select * from actual) union all (select * from actual except all select * from expected)
 ) then raise exception 'DE_RELEASE: attributed goal event multiset mismatch'; end if;
 if exists(select 1 from _dfb_actual a cross join lateral jsonb_to_recordset(case when f->>'statisticsStatus'='available'then f->'starters'else '[]'::jsonb end)p(side int,name text,keeper boolean,proof text)
   where p.side is null or p.side not in(0,1) or p.name is null or p.keeper is null or (p.keeper and p.proof is distinct from 'oznaka-T')
    or not exists(select 1 from appearances ap join players pl on pl.id=ap.player_id where ap.match_id=a.id and ap.started and ap.team_id=case p.side when 0 then a.home_team_id else a.away_team_id end and pl.full_name=p.name and ap.is_goalkeeper=p.keeper))
   or exists(select 1 from _dfb_actual a cross join lateral jsonb_to_recordset(case when f->>'statisticsStatus'='available'then f->'starters'else '[]'::jsonb end)p(side int,name text,keeper boolean,proof text) group by a.id,p.side having count(*)<>11 or count(distinct p.name)<>11 or count(*) filter(where p.keeper)<>1)
   or exists(select 1 from _dfb_actual a where f->>'statisticsStatus'='available'and(f->>'played')::boolean and (select count(*) from appearances where match_id=a.id and started)<>22)
   then raise exception 'DE_RELEASE: explicit starting keeper/lineup proof mismatch'; end if;
 if exists(select 1 from _dfb_actual a where f->>'statisticsStatus'='available'and(f->>'played')::boolean and (
    (select count(*) from goals g where g.match_id=a.id and case when g.is_own_goal then g.team_id=a.away_team_id else g.team_id=a.home_team_id end)<>a.home_goals or
    (select count(*) from goals g where g.match_id=a.id and case when g.is_own_goal then g.team_id=a.home_team_id else g.team_id=a.away_team_id end)<>a.away_goals))
    or exists(select 1 from _dfb_actual a join goals g on g.match_id=a.id where g.scorer_id is null or not exists(select 1 from appearances ap where ap.match_id=a.id and ap.player_id=g.scorer_id and ap.team_id=g.team_id))
    or not exists(select 1 from _dfb_actual a join appearances ap on ap.match_id=a.id where a.season='2026/27' and not ap.started and ap.minutes_played>0) then raise exception 'DE_RELEASE: goal accounting/orphans/current substitutes'; end if;
 if exists(with clubs as(select home_team_id id from _dfb_actual where season='2026/27' union select away_team_id from _dfb_actual where season='2026/27'),
   selectable as(select distinct team_id id from players where competition_id=c.id and active)
   (select * from clubs except select * from selectable) union all (select * from selectable except select * from clubs))
    or exists(select 1 from _dfb_actual a join appearances ap on ap.match_id=a.id join players p on p.id=ap.player_id where a.season='2026/27' and ap.started and ap.is_goalkeeper and p.active and p.position is distinct from 'GK')
    or exists(select 1 from (select home_team_id id from _dfb_actual where season='2026/27' union select away_team_id from _dfb_actual where season='2026/27')t where not exists(
      select 1 from _dfb_actual a join appearances ap on ap.match_id=a.id join players p on p.id=ap.player_id where a.season='2026/27' and ap.team_id=t.id and ap.started and ap.is_goalkeeper and p.active and p.team_id=t.id and p.position='GK')) then raise exception 'DE_RELEASE: current clubs/official goalkeeper positions'; end if;
 s:=stanje_lige(c.id);price:=najcenejsi_kader(s->'igralci');
 if (s->>'klubov')::int<>(case c.slug when 'de-regionalliga-bayern' then 19 else 18 end) or price is null or price>100 or (s->>'najvisja_cena')::numeric<8
    or coalesce((s->>'privzetih')::numeric/nullif((s->>'aktivnih')::numeric,0),1)>0.7 or (s->>'golov_brez_nastopa')::bigint<>0 then raise exception 'DE_RELEASE: roster/pricing readiness'; end if;
 with played as(select distinct round from _dfb_actual where season='2026/27' and (f->>'played')::boolean),
 gap as(select min(number)n from rounds r where competition_id=c.id and season='2026/27' and deadline_at>now() and not exists(select 1 from played where round=r.number)),
 last_played as(select coalesce(max(round),0)n from played cross join gap where gap.n is null or round<gap.n or (select count(*) from played where round>gap.n)>2)
 select min(number) into k from rounds cross join last_played p where competition_id=c.id and season='2026/27' and number>p.n and deadline_at>now();
 select deadline_at,lineups_locked_at into deadline,locked from rounds where competition_id=c.id and season='2026/27' and number=k;
 select min(day) into first_day from _dfb_expected where season='2026/27' and round=k;
 select min((day+(f->>'time')::time) at time zone 'Europe/Berlin')-interval '6 hours' into official_deadline from _dfb_expected where season='2026/27' and round=k;
 if k is null or deadline<=clock_timestamp() or locked is not null or deadline is distinct from official_deadline
    or exists(select 1 from _dfb_expected where season='2026/27' and round=k and ((f->>'played')::boolean or (day=first_day and f->>'time' is null))) then raise exception 'DE_RELEASE: future round/official six-hour kickoff deadline'; end if;
 if k is distinct from c.prvi_fantasy_krog or first_day is distinct from(v#>>'{statisticsPolicy,firstFantasyPlayedOn}')::date or markers->>'firstFantasyPlayedOn'is distinct from v#>>'{statisticsPolicy,firstFantasyPlayedOn}'then raise exception 'DE_RELEASE: installed first-fantasy binding differs';end if;
 if p_aktiviraj then
  perform private_historical_statistics.authorize_release(c.id,markers->>'policyId',markers->>'policySha256',p_sha256);
  update competitions set active=true where id=c.id;
  if not exists(select 1 from competitions co join rounds r on r.competition_id=co.id and r.number=co.prvi_fantasy_krog and r.season='2026/27' where co.id=c.id and co.active and co.prvi_fantasy_krog=k and r.deadline_at=deadline and r.deadline_at>clock_timestamp() and r.lineups_locked_at is null) then raise exception 'DE_RELEASE: active future-round readback failed'; end if;
 end if;
 return jsonb_build_object('preverjeno',true,'vklopljena',p_aktiviraj,'slug',c.slug,'prvi_krog',k,'rok',deadline,'najcenejsi_kader',price,'manifestSha256',p_sha256,'sourceCommit',v->>'sourceCommit','parserSha256',v->>'parserSha256');
end $$;

revoke all on function private_dfb_release.varen_vklop_dfb_regije_v3(text,text,boolean)from public,anon,authenticated,service_role;
-- Preserve the entire reviewed v1/v2 dispatcher as a private unchanged body.
alter function public.varen_vklop_dfb_regije(text,text,boolean)rename to legacy_v1_v2;
alter function public.legacy_v1_v2(text,text,boolean)set schema private_dfb_release;
revoke all on function private_dfb_release.legacy_v1_v2(text,text,boolean)from public,anon,authenticated,service_role;
create function public.varen_vklop_dfb_regije(p_manifest text,p_sha256 text,p_aktiviraj boolean default false)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_manifest is null or octet_length(p_manifest)>8388608 or p_sha256 is null or p_sha256!~'^[a-f0-9]{64}$'or encode(sha256(convert_to(p_manifest,'UTF8')),'hex')<>p_sha256 then raise exception 'DE_RELEASE: reviewed manifest SHA/size mismatch';end if;
 if p_manifest::jsonb->>'version'='3'then return private_dfb_release.varen_vklop_dfb_regije_v3(p_manifest,p_sha256,p_aktiviraj);end if;
 return private_dfb_release.legacy_v1_v2(p_manifest,p_sha256,p_aktiviraj);
end$$;
revoke all on function public.varen_vklop_dfb_regije(text,text,boolean)from public,anon,authenticated;
grant execute on function public.varen_vklop_dfb_regije(text,text,boolean)to service_role;
