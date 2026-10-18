-- Unplayed source-confirmed fixtures may carry the generic no-result marker.
-- Preserve all other v4 release validation and the existing public wrapper.
create or replace function private_dfb_release.varen_vklop_dfb_regije_policy_v4(p_manifest text,p_sha256 text,p_aktiviraj boolean)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb;c competitions%rowtype;s jsonb;markers jsonb;price numeric;k int;deadline timestamptz;official_deadline timestamptz;locked timestamptz;first_day date;total_matches int;total_rounds int;
begin
 if p_aktiviraj is null then raise exception 'DE_RELEASE: explicit activation flag required';end if;
 v:=private_dfb_release.validate_historical_manifest_v4(p_manifest,p_sha256);
 select * into c from competitions where slug=v->>'slug'for update;
 lock table fantasy_teams in share mode;
 if c.source_policy is distinct from v#>>'{statisticsPolicy,id}'or exists(select 1 from fantasy_teams where competition_id=c.id)then raise exception 'DE_RELEASE: reviewed policy/inactive no-userdata release required';end if;
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
 if exists(select 1 from _dfb_actual a where a.played_on is distinct from (f->>'date')::date or a.kontumacija or (a.vir_brez_izida and (f->>'played')::boolean)
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
