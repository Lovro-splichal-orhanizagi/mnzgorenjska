-- Independent service-only release gate. No change to Nordost's RPC or state.
create function public.varen_vklop_dfb_regije(p_manifest text,p_sha256 text,p_aktiviraj boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v jsonb; c competitions%rowtype; s jsonb; result jsonb; price numeric;
 n int; nr int; k int; deadline timestamptz; official_deadline timestamptz;
 locked timestamptz; first_day date; total_matches int; total_rounds int;
begin
 if current_setting('transaction_isolation')<>'read committed' or p_aktiviraj is null then raise exception 'DE_RELEASE: READ COMMITTED required'; end if;
 if p_manifest is null or octet_length(p_manifest)>8388608 or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
    or encode(sha256(convert_to(p_manifest,'UTF8')),'hex')<>p_sha256 then raise exception 'DE_RELEASE: reviewed manifest SHA/size mismatch'; end if;
 v:=p_manifest::jsonb;
 if v->>'version' is distinct from '1' or coalesce(v->>'slug','') !~ '^de-regionalliga-(nord|west|suedwest|bayern)$'
    or coalesce(v->>'sourceCommit','') !~ '^[a-f0-9]{40}$' or coalesce(v->>'parserSha256','') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(v->'seasons') is distinct from 'array' or jsonb_array_length(v->'seasons')<>2 then raise exception 'DE_RELEASE: invalid scope/provenance'; end if;
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
     or jsonb_typeof(f->'starters') is distinct from 'array' or jsonb_typeof(f->'warnings') is distinct from 'array'
     or jsonb_typeof(f->'appearances') is distinct from 'array' or jsonb_typeof(f->'goals') is distinct from 'array'
     or ((f->>'played')::boolean and (jsonb_array_length(f->'starters')<>22 or jsonb_array_length(f->'appearances')<22
         or f->>'homeGoals' is null or f->>'awayGoals' is null or (f->>'homeGoals')::int not between 0 and 30 or (f->>'awayGoals')::int not between 0 and 30
         or f->>'url' is null or f->>'url' !~ ('^https://datencenter[.]dfb[.]de/datencenter/'||substring(c.slug from 4)||'/'||left(e.season,4)||'-20'||right(e.season,2)||'/')))
     or (not (f->>'played')::boolean and (f->>'homeGoals' is not null or f->>'awayGoals' is not null or f->'starters'<>'[]'::jsonb or f->'appearances'<>'[]'::jsonb or f->'goals'<>'[]'::jsonb)))) then raise exception 'DE_RELEASE: invalid fixture/complete report evidence'; end if;
  if (select count(distinct round) from _dfb_expected where season=s->>'season')<>nr
     or (select count(distinct (home,away)) from _dfb_expected where season=s->>'season')<>n*(n-1)
     or exists(select 1 from _dfb_expected where season=s->>'season' group by round having count(*)<>n/2)
     or exists(select 1 from (select round,home name from _dfb_expected where season=s->>'season' union all select round,away from _dfb_expected where season=s->>'season')x group by round having count(distinct name)<>2*(n/2))
     or (select count(*) from (select home from _dfb_expected where season=s->>'season' union select away from _dfb_expected where season=s->>'season')x)<>n then raise exception 'DE_RELEASE: incomplete season pairs/rounds/byes'; end if;
 end loop;
 if v#>>'{seasons,0,season}' is distinct from '2025/26' or v#>>'{seasons,1,season}' is distinct from '2026/27'
    or not exists(select 1 from _dfb_expected where season='2026/27' and (f->>'played')::boolean) then raise exception 'DE_RELEASE: two ordered seasons/current reports required'; end if;
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
    or ((f->>'played')::boolean and (a.zapisnik_id is distinct from evidence_id or a.imported_at is null or a.home_goals is distinct from (f->>'homeGoals')::int or a.away_goals is distinct from (f->>'awayGoals')::int or a.source_url is distinct from f->>'url' or to_jsonb(a.import_warnings) is distinct from f->'warnings'))
    or (not(f->>'played')::boolean and (a.imported_at is not null or a.zapisnik_id is not null or a.home_goals<>0 or a.away_goals<>0))) then raise exception 'DE_RELEASE: persisted metadata/coverage mismatch'; end if;
 -- EXCEPT ALL in both directions retains duplicate identity/event multiplicity.
 -- Ignore only generated IDs and fields the importer does not write (saved
 -- penalties, assists). Never join archive appearances on current player.team_id.
 if exists(
  with expected as(select a.id,x from _dfb_actual a cross join lateral jsonb_array_elements(f->'appearances')x),
  actual as(select a.id,(to_jsonb(ap)-array['id','match_id','player_id','team_id','penalties_saved'])||jsonb_build_object('side',case ap.team_id when a.home_team_id then 0 when a.away_team_id then 1 else -1 end,'name',p.full_name) x
   from _dfb_actual a join appearances ap on ap.match_id=a.id join players p on p.id=ap.player_id where p.competition_id=c.id)
  (select * from expected except all select * from actual) union all (select * from actual except all select * from expected)
 ) or exists(select 1 from _dfb_actual a join appearances ap on ap.match_id=a.id join players p on p.id=ap.player_id where p.competition_id<>c.id)
 then raise exception 'DE_RELEASE: appearance identity/statistics multiset mismatch'; end if;
 if exists(
  with expected as(select a.id,x from _dfb_actual a cross join lateral jsonb_array_elements(f->'goals')x),
  actual as(select a.id,(to_jsonb(g)-array['id','match_id','scorer_id','team_id','assist_player_id','assist_confirmed_at','assist_none_confirmed_at'])||jsonb_build_object('side',case g.team_id when a.home_team_id then 0 when a.away_team_id then 1 else -1 end,'name',p.full_name) x
   from _dfb_actual a join goals g on g.match_id=a.id left join players p on p.id=g.scorer_id)
  (select * from expected except all select * from actual) union all (select * from actual except all select * from expected)
 ) then raise exception 'DE_RELEASE: attributed goal event multiset mismatch'; end if;
 if exists(select 1 from _dfb_actual a cross join lateral jsonb_to_recordset(f->'starters')p(side int,name text,keeper boolean,proof text)
   where p.side is null or p.side not in(0,1) or p.name is null or p.keeper is null or (p.keeper and p.proof is distinct from 'oznaka-T')
    or not exists(select 1 from appearances ap join players pl on pl.id=ap.player_id where ap.match_id=a.id and ap.started and ap.team_id=case p.side when 0 then a.home_team_id else a.away_team_id end and pl.full_name=p.name and ap.is_goalkeeper=p.keeper))
   or exists(select 1 from _dfb_actual a cross join lateral jsonb_to_recordset(f->'starters')p(side int,name text,keeper boolean,proof text) group by a.id,p.side having count(*)<>11 or count(distinct p.name)<>11 or count(*) filter(where p.keeper)<>1)
   or exists(select 1 from _dfb_actual a where (f->>'played')::boolean and (select count(*) from appearances where match_id=a.id and started)<>22)
   then raise exception 'DE_RELEASE: explicit starting keeper/lineup proof mismatch'; end if;
 if exists(select 1 from _dfb_actual a where (f->>'played')::boolean and (
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
 if p_aktiviraj then
  result:=vklopi_ligo_sredi_sezone(c.slug);
  if result->>'vklopljena' is distinct from 'true' or (result->>'prvi_krog')::int is distinct from k or coalesce((result->>'razlika')::bigint,1)<>0 then raise exception 'DE_RELEASE: activation helper mismatch: %',result; end if;
  if not exists(select 1 from competitions co join rounds r on r.competition_id=co.id and r.number=co.prvi_fantasy_krog and r.season='2026/27' where co.id=c.id and co.active and co.prvi_fantasy_krog=k and r.deadline_at=deadline and r.deadline_at>clock_timestamp() and r.lineups_locked_at is null) then raise exception 'DE_RELEASE: active future-round readback failed'; end if;
 end if;
 return jsonb_build_object('preverjeno',true,'vklopljena',p_aktiviraj,'slug',c.slug,'prvi_krog',k,'rok',deadline,'najcenejsi_kader',price,'manifestSha256',p_sha256,'sourceCommit',v->>'sourceCommit','parserSha256',v->>'parserSha256');
end $$;
revoke all on function public.varen_vklop_dfb_regije(text,text,boolean) from public,anon,authenticated;
grant execute on function public.varen_vklop_dfb_regije(text,text,boolean) to service_role;
comment on function public.varen_vklop_dfb_regije(text,text,boolean) is 'Four inactive DFB regions only; reviewed 8MiB manifest, complete statistics, prices, official future deadline; nonmutating preflight by default.';
