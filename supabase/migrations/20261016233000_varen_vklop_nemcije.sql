-- Only installs the scoped release gate. No league is activated during migration
-- replay: fresh CI has no imported football data. Invoke explicitly in Actions
-- with the independently reviewed raw manifest SHA after importing and pricing.
create or replace function public.varen_vklop_nemcije(
  p_manifest text, p_sha256 text, p_aktiviraj boolean default false
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v jsonb;
  c public.competitions%rowtype;
  s jsonb;
  r jsonb;
  v_cena numeric;
  v_krog integer;
  v_rok timestamptz;
  v_zaklenjen timestamptz;
begin
  if current_setting('transaction_isolation') <> 'read committed' or p_aktiviraj is null then
    raise exception 'DE_RELEASE: READ COMMITTED required';
  end if;
  if p_manifest is null or octet_length(p_manifest)>2500000
     or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
     or encode(sha256(convert_to(p_manifest,'UTF8')),'hex')<>p_sha256 then
    raise exception 'DE_RELEASE: reviewed manifest SHA256 mismatch';
  end if;
  v := p_manifest::jsonb;
  if (v->>'version') is distinct from '1'
     or (v->>'slug') is distinct from 'de-regionalliga-nordost'
     or coalesce(v->>'sourceCommit','') !~ '^[a-f0-9]{40}$'
     or coalesce(v->>'parserSha256','') !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(v->'seasons') is distinct from 'array'
     or jsonb_array_length(v->'seasons')<>2 then
    raise exception 'DE_RELEASE: invalid fixed league scope/provenance';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v->'seasons') with ordinality as a(x,n)
     where (x->>'season') is distinct from (case n when 1 then '2025/26' else '2026/27' end)
        or (x->>'code') is distinct from (case n when 1 then 'regionalliga-nordost/2025-2026' else 'regionalliga-nordost/2026-2027' end)
        or coalesce(x->>'runId','') !~ '^[1-9][0-9]{0,19}$'
        or coalesce(x->>'documentsSha256','') !~ '^[a-f0-9]{64}$'
        or x->>'capturedAt' is null
        or (x->>'capturedAt')::timestamptz>clock_timestamp()+interval '5 minutes'
        or (x->>'capturedAt')::timestamptz<clock_timestamp()-(case n when 1 then interval '7 days' else interval '12 hours' end)
        or jsonb_typeof(x->'fixtures') is distinct from 'array'
        or jsonb_array_length(x->'fixtures')<>306
  ) then raise exception 'DE_RELEASE: invalid or stale season evidence'; end if;

  select * into strict c from public.competitions where slug='de-regionalliga-nordost' for update;
  if c.active or c.source is distinct from 'dfb'
     or c.source_league_code is distinct from 'regionalliga-nordost/2026-2027'
     or public.sezona_lige(c.id) is distinct from '2026/27'
     or not exists(select 1 from public.countries d where d.id=c.country_id and d.code='DE') then
    raise exception 'DE_RELEASE: wrong league/source/season or already active';
  end if;
  -- Preserve the checked snapshot through the final helper, including club names.
  lock table public.teams, public.players, public.rounds, public.matches,
             public.appearances, public.goals in share mode;

  drop table if exists pg_temp._slff_de_expected;
  create temporary table _slff_de_expected (
    season text not null, id text primary key, round integer not null,
    played_on date not null, home_name text not null, away_name text not null,
    played boolean not null, home_goals integer, away_goals integer,
    source_url text, starters jsonb not null, warnings jsonb not null
  ) on commit drop;
  insert into pg_temp._slff_de_expected
  select a.x->>'season', f.id, f.round, f.date::date, f.home, f.away, f.played,
         f."homeGoals", f."awayGoals", f.url, f.starters, f.warnings
    from jsonb_array_elements(v->'seasons') a(x)
    cross join lateral jsonb_to_recordset(a.x->'fixtures') as f(
      id text, round integer, date text, home text, away text, played boolean,
      "homeGoals" integer, "awayGoals" integer, url text, starters jsonb, warnings jsonb);
  if exists(select 1 from pg_temp._slff_de_expected e
     where e.id !~ '^de-dfb-[1-9][0-9]{0,9}$' or e.round not between 1 and 34
        or e.home_name=e.away_name or length(e.home_name) not between 1 and 250 or length(e.away_name) not between 1 and 250
        or e.played_on<make_date(left(e.season,4)::int,7,1) or e.played_on>=make_date(left(e.season,4)::int+1,7,1)
        or jsonb_typeof(e.starters)<>'array' or jsonb_typeof(e.warnings)<>'array'
        or (e.played and (e.home_goals is null or e.away_goals is null or e.home_goals not between 0 and 30 or e.away_goals not between 0 and 30
              or jsonb_array_length(e.starters)<>22
              or e.source_url is null
              or e.source_url !~ ('^https://datencenter[.]dfb[.]de/datencenter/regionalliga-nordost/' || left(e.season,4) || '-' || (left(e.season,4)::int+1)::text || '/')))
        or (not e.played and (jsonb_array_length(e.starters)<>0 or e.home_goals is not null or e.away_goals is not null))
        or (e.season='2025/26' and not e.played)
  ) then raise exception 'DE_RELEASE: invalid fixture/closed archive/lineup evidence'; end if;
  if exists(select 1 from pg_temp._slff_de_expected group by season
             having count(*)<>306 or count(distinct round)<>34 or count(distinct (home_name,away_name))<>306)
     or exists(select 1 from pg_temp._slff_de_expected group by season,round having count(*)<>9)
     or exists(select 1 from (select season,round,home_name name from pg_temp._slff_de_expected
                              union all select season,round,away_name from pg_temp._slff_de_expected) q
                group by season,round having count(distinct name)<>18)
     or exists(select 1 from (select season,home_name name from pg_temp._slff_de_expected
                              union select season,away_name from pg_temp._slff_de_expected) q
                group by season having count(*)<>18)
     or not exists(select 1 from pg_temp._slff_de_expected where season='2026/27' and played) then
    raise exception 'DE_RELEASE: incomplete 18-club/34-round/306-fixture structure';
  end if;

  drop table if exists pg_temp._slff_de_actual;
  create temporary table _slff_de_actual on commit drop as
    select m.*, ro.season, ro.number as round, h.name as home_name, a.name as away_name
      from public.matches m join public.rounds ro on ro.id=m.round_id
      join public.teams h on h.id=m.home_team_id join public.teams a on a.id=m.away_team_id
     where ro.competition_id=c.id;
  if (select count(*) from pg_temp._slff_de_actual)<>612
     or (select count(*) from public.rounds where competition_id=c.id)<>68
     or exists(select 1 from pg_temp._slff_de_expected e
         left join pg_temp._slff_de_actual a on a.season=e.season and a.round=e.round
           and a.home_name=e.home_name and a.away_name=e.away_name
        group by e.id having count(a.id)<>1)
     or exists(select 1 from pg_temp._slff_de_actual a
         left join pg_temp._slff_de_expected e on a.season=e.season and a.round=e.round
           and a.home_name=e.home_name and a.away_name=e.away_name
        where e.id is null) then
    raise exception 'DE_RELEASE: persisted fixture set differs from approved source snapshot';
  end if;
  if exists(select 1 from pg_temp._slff_de_expected e join pg_temp._slff_de_actual a
         on a.season=e.season and a.round=e.round and a.home_name=e.home_name and a.away_name=e.away_name
       where a.played_on is distinct from e.played_on or a.kontumacija
          or (e.played and (a.zapisnik_id is distinct from e.id or a.imported_at is null
              or a.home_goals is distinct from e.home_goals or a.away_goals is distinct from e.away_goals
              or a.source_url is distinct from e.source_url or to_jsonb(a.import_warnings) is distinct from e.warnings))
          or (not e.played and (a.imported_at is not null or a.zapisnik_id is not null
              or exists(select 1 from public.appearances ap where ap.match_id=a.id)
              or exists(select 1 from public.goals g where g.match_id=a.id)))) then
    raise exception 'DE_RELEASE: report coverage/metadata/warnings differ from approved evidence';
  end if;
  if exists(select 1 from pg_temp._slff_de_expected e cross join lateral jsonb_to_recordset(e.starters)
        as p(side int,name text,keeper boolean,proof text)
       where p.side not in(0,1) or p.side is null or p.name is null or length(p.name) not between 1 and 250
          or p.keeper is null or (p.keeper and p.proof is distinct from 'oznaka-T'))
     or exists(select 1 from pg_temp._slff_de_expected e cross join lateral jsonb_to_recordset(e.starters)
        as p(side int,name text,keeper boolean,proof text)
       group by e.id,p.side having count(*)<>11 or count(distinct p.name)<>11 or count(*) filter(where p.keeper)<>1) then
    raise exception 'DE_RELEASE: explicit starting keeper/eleven identity evidence missing';
  end if;
  if exists(select 1 from pg_temp._slff_de_expected e join pg_temp._slff_de_actual a
        on a.season=e.season and a.round=e.round and a.home_name=e.home_name and a.away_name=e.away_name
      cross join lateral jsonb_to_recordset(e.starters) as p(side int,name text,keeper boolean,proof text)
      left join public.appearances ap on ap.match_id=a.id and ap.started
        and ap.team_id=case p.side when 0 then a.home_team_id else a.away_team_id end
      left join public.players pl on pl.id=ap.player_id and pl.competition_id=c.id and pl.full_name=p.name
      group by e.id,p.side,p.name,p.keeper
      having count(pl.id)<>1 or bool_and(case when pl.id is not null then ap.is_goalkeeper is not distinct from p.keeper else true end) is not true)
     or exists(select 1 from pg_temp._slff_de_actual a join public.appearances ap on ap.match_id=a.id
          join public.players pl on pl.id=ap.player_id
        where pl.competition_id<>c.id or ap.team_id not in(a.home_team_id,a.away_team_id)
           or ap.minutes_played not between 0 and 90)
     or exists(select 1 from pg_temp._slff_de_actual a where a.imported_at is not null
          and (select count(*) from public.appearances ap where ap.match_id=a.id and ap.started)<>22) then
    raise exception 'DE_RELEASE: persisted starting lineups/keeper roles differ from source';
  end if;
  if exists(select 1 from pg_temp._slff_de_actual a where a.imported_at is not null
         and ((select count(*) from public.goals g where g.match_id=a.id)<>a.home_goals+a.away_goals
           or (select count(*) from public.goals g where g.match_id=a.id
                 and case when g.is_own_goal then g.team_id=a.away_team_id else g.team_id=a.home_team_id end)<>a.home_goals
           or (select count(*) from public.goals g where g.match_id=a.id
                 and case when g.is_own_goal then g.team_id=a.home_team_id else g.team_id=a.away_team_id end)<>a.away_goals))
     or exists(select 1 from pg_temp._slff_de_actual a join public.goals g on g.match_id=a.id
        where g.scorer_id is null or g.team_id not in(a.home_team_id,a.away_team_id)
           or not exists(select 1 from public.appearances ap where ap.match_id=a.id and ap.player_id=g.scorer_id))
     or not exists(select 1 from pg_temp._slff_de_actual a join public.appearances ap on ap.match_id=a.id
         where a.season='2026/27' and not ap.started and ap.minutes_played>0) then
    raise exception 'DE_RELEASE: per-match goals, scorers or current substitutions incomplete';
  end if;

  s := public.stanje_lige(c.id);
  v_cena := public.najcenejsi_kader(s->'igralci');
  if (s->>'klubov')::int<>18 or v_cena is null or v_cena>100
     or (s->>'najvisja_cena')::numeric<8
     or coalesce(round(1000.0*(s->>'privzetih')::numeric/nullif((s->>'aktivnih')::numeric,0))/10,100)>70
     or (s->>'golov_brez_nastopa')::bigint<>0 then
    raise exception 'DE_RELEASE: roster/pricing readiness rejected';
  end if;
  -- Preview the latest helper's early-played-round policy without changing state.
  with played as (
    select ro.number from public.rounds ro where ro.competition_id=c.id and ro.season='2026/27'
      and exists(select 1 from public.matches m join public.appearances ap on ap.match_id=m.id where m.round_id=ro.id)
  ), gap as (
    select min(ro.number) n from public.rounds ro where ro.competition_id=c.id and ro.season='2026/27'
      and ro.deadline_at>clock_timestamp() and not exists(select 1 from played p where p.number=ro.number)
  ), last_played as (
    select coalesce(max(p.number),0) n from played p cross join gap g
      where g.n is null or p.number<g.n or (select count(*) from played p2 where p2.number>g.n)>2
  ) select min(ro.number) into v_krog from public.rounds ro cross join last_played p
      where ro.competition_id=c.id and ro.season='2026/27' and ro.number>p.n and ro.deadline_at>clock_timestamp();
  select deadline_at,lineups_locked_at into v_rok,v_zaklenjen from public.rounds
    where competition_id=c.id and season='2026/27' and number=v_krog;
  if v_krog is null or v_rok<=clock_timestamp() or v_zaklenjen is not null
     or exists(select 1 from pg_temp._slff_de_expected where season='2026/27' and round=v_krog and played) then
    raise exception 'DE_RELEASE: no future unlocked wholly unplayed eligible round';
  end if;

  if p_aktiviraj then
    r := public.vklopi_ligo_sredi_sezone(c.slug);
    if (r->>'vklopljena')::boolean is distinct from true or (r->>'prvi_krog')::int is distinct from v_krog
       or coalesce((r->>'razlika')::bigint,1)<>0 then
      raise exception 'DE_RELEASE: activation helper rejected/mismatched: %',r;
    end if;
    if not exists(select 1 from public.competitions co join public.rounds ro
          on ro.competition_id=co.id and ro.number=co.prvi_fantasy_krog and ro.season='2026/27'
         where co.id=c.id and co.active and co.prvi_fantasy_krog=v_krog
           and ro.deadline_at>clock_timestamp() and ro.lineups_locked_at is null) then
      raise exception 'DE_RELEASE: active future-round readback failed';
    end if;
  end if;
  return jsonb_build_object('preverjeno',true,'vklopljena',p_aktiviraj,'slug',c.slug,
    'prvi_krog',v_krog,'rok',v_rok,'najcenejsi_kader',v_cena,'manifestSha256',p_sha256,
    'sourceCommit',v->>'sourceCommit','parserSha256',v->>'parserSha256');
end;
$$;
revoke all on function public.varen_vklop_nemcije(text,text,boolean) from public,anon,authenticated;
grant execute on function public.varen_vklop_nemcije(text,text,boolean) to service_role;
comment on function public.varen_vklop_nemcije(text,text,boolean) is
  'Explicit Germany release only: reviewed source snapshot + persisted coverage + prices + future round. Default is nonmutating preflight; service-role Actions only.';
