-- Reviewed SFL D1, NPL East and Isthmian South Central calendars retain official Match N slots when
-- postponed fixtures have been played out of order. Only the exact reviewed
-- source tuples use the first future empty round; all other competitions keep
-- the legacy two-advanced-round rule and every native readiness guard.

create or replace function public.vklopi_ligo_sredi_sezone(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_aktivna boolean;
  v_source text;
  v_code text;
  v_reviewed_calendar boolean := false;
  v_sezona text;
  v_zadnji int;
  v_krog int;
  v_vrzel int;
  v_razlika bigint;
begin
  select id, active, source, source_league_code into v_id, v_aktivna, v_source, v_code from competitions where slug = p_slug for update;
  if v_id is null then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Lige ni.');
  end if;
  v_sezona := sezona_lige(v_id);
  if v_aktivna then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Liga je že vklopljena.');
  end if;

  select coalesce(sum(m.home_goals + m.away_goals), 0)
         - (select count(*) from goals g
              join matches m2 on m2.id = g.match_id
              join rounds r2 on r2.id = m2.round_id
             where r2.competition_id = v_id and m2.imported_at is not null and not m2.kontumacija)
    into v_razlika
    from matches m join rounds r on r.id = m.round_id
   where r.competition_id = v_id and m.imported_at is not null and not m.kontumacija;

  if exists (select 1 from goals g
               join matches m on m.id = g.match_id
               join rounds r on r.id = m.round_id
              where r.competition_id = v_id and g.scorer_id is not null
                and not exists (select 1 from appearances a
                                 where a.player_id = g.scorer_id and a.match_id = g.match_id)) then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Gol nima nastopa strelca.',
                              'razlika', v_razlika);
  end if;

  v_reviewed_calendar := coalesce((p_slug = 'gb-sfl-d1-central' and v_source = 'isthmian' and v_code = 'sfl/69d0be24b616bafb97331d42/2026-27')
           or (p_slug = 'gb-sfl-d1-south' and v_source = 'isthmian' and v_code = 'sfl/69d0bdf9b616bafb97331d41/2026-27')
           or (p_slug = 'gb-npl-east' and v_source = 'isthmian' and v_code = 'npl/67d7c7bb74247876e6dae40b/2026-27')
           or (p_slug = 'gb-isthmian-south-central' and v_source = 'isthmian' and v_code = 'isthmian/67d7d11a749090308acc1022/2026-27'), false);
  if v_reviewed_calendar and (exists(select 1 from fantasy_teams where competition_id=v_id)
                   or exists(select 1 from fantasy_lineups fl join rounds r on r.id=fl.round_id where r.competition_id=v_id)) then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Reviewed calendar exception requires no existing fantasy teams or lineups.', 'razlika', v_razlika);
  end if;

  -- Prvi krog z rokom v prihodnosti brez zapisnikov. Odigrani krogi nad njim
  -- so posamezne tekme, odigrane pred razporedom (npr. tekma 15. kroga sredi
  -- jesenskega dela); ne štejejo kot zadnji krog z zapisniki, če sta taka
  -- največ dva. Več odigranih krogov nad vrzeljo pomeni prestavljen krog:
  -- velja staro pravilo (za zadnjim krogom z zapisniki).
  select min(r.number) into v_vrzel
    from rounds r
   where r.competition_id = v_id and r.season = v_sezona and r.deadline_at > now()
     and not exists (select 1 from matches m join appearances a on a.match_id = m.id
                      where m.round_id = r.id);

  if v_reviewed_calendar and v_vrzel is not null and exists (
    select 1 from rounds r where r.competition_id=v_id and r.season=v_sezona and r.number>v_vrzel
      and (r.deadline_at is null or r.deadline_at>now()) and exists(select 1 from matches m join appearances a on a.match_id=m.id where m.round_id=r.id)
  ) then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Played higher round still has a future deadline.', 'razlika', v_razlika);
  end if;

  with odigrani as (
    select r.number
      from rounds r
     where r.competition_id = v_id and r.season = v_sezona
       and exists (select 1 from matches m join appearances a on a.match_id = m.id
                    where m.round_id = r.id)
  )
  select coalesce(max(o.number), 0) into v_zadnji
    from odigrani o
   where v_vrzel is null
      or o.number < v_vrzel
      or (not v_reviewed_calendar and (select count(*) from odigrani o2 where o2.number > v_vrzel) > 2);

  select min(r.number) into v_krog
    from rounds r
   where r.competition_id = v_id and r.season = v_sezona
     and r.number > v_zadnji and r.deadline_at > now();
  if v_krog is null then
    return jsonb_build_object('vklopljena', false,
      'razlog', format('Za zadnjim krogom z zapisniki (%s) ni kroga z rokom v prihodnosti.', v_zadnji),
      'razlika', v_razlika);
  end if;

  if v_reviewed_calendar and not exists (
    select 1 from rounds r
     where r.competition_id=v_id and r.season=v_sezona and r.number=v_krog
       and r.deadline_at>now()
       and r.played_on is not null
       and r.played_on >= (now() at time zone 'Europe/Ljubljana')::date
       and r.lineups_locked_at is null
       and exists(select 1 from matches m where m.round_id=r.id)
       and not exists(select 1 from matches m where m.round_id=r.id
                        and (m.imported_at is not null or m.home_goals is null or m.away_goals is null
                             or m.home_goals<>0 or m.away_goals<>0
                             or exists(select 1 from appearances a where a.match_id=m.id)))
  ) then
    return jsonb_build_object('vklopljena', false,
      'razlog', 'Selected reviewed first round is not an unlocked, empty future fixture round.',
      'prvi_krog', v_krog, 'razlika', v_razlika);
  end if;

  begin
    update competitions set prvi_fantasy_krog = v_krog, active = true where id = v_id;
  exception when others then
    -- Varovalka vklopa (cenik, kader, klop …): vklop odloči človek.
    return jsonb_build_object('vklopljena', false, 'razlog', sqlerrm,
                              'prvi_krog', v_krog, 'razlika', v_razlika);
  end;
  return jsonb_build_object('vklopljena', true, 'razlog', null,
                            'prvi_krog', v_krog, 'razlika', v_razlika);
end;
$$;
revoke all on function public.vklopi_ligo_sredi_sezone(text) from public, anon, authenticated;
grant execute on function public.vklopi_ligo_sredi_sezone(text) to service_role;
