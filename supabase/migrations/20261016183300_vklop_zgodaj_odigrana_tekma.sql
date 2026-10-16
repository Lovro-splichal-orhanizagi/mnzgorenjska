-- Vklop sredi sezone ni smel zavrniti lige, v kateri je ena sama tekma
-- zadnjega kroga odigrana pred razporedom (npr. 15. krog v ligi s 15 krogi):
-- zadnji krog z zapisniki je bil tedaj 15 in za njim ni bilo kroga z rokom v
-- prihodnosti, zato je funkcija javila, da je sezona končana (hu-bp-4-1,
-- hu-bp-4-2, hu-u19-kozepkelet, sk-vsfz-u19-3liga-a, sk-vsfz-u19-3liga-b).
--
-- Zdaj se takšni posamezni odigrani krogi nad prvim prihodnjim krogom brez
-- zapisnikov prezrejo (največ dva); vse drugo je enako zadnji definiciji
-- (20261011140100_koledarska_sezona.sql). Test v supabase/tests/varnost.sql.

create or replace function public.vklopi_ligo_sredi_sezone(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_aktivna boolean;
  v_sezona text;
  v_zadnji int;
  v_krog int;
  v_vrzel int;
  v_razlika bigint;
begin
  select id, active into v_id, v_aktivna from competitions where slug = p_slug for update;
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
      or (select count(*) from odigrani o2 where o2.number > v_vrzel) > 2;

  select min(r.number) into v_krog
    from rounds r
   where r.competition_id = v_id and r.season = v_sezona
     and r.number > v_zadnji and r.deadline_at > now();
  if v_krog is null then
    return jsonb_build_object('vklopljena', false,
      'razlog', format('Za zadnjim krogom z zapisniki (%s) ni kroga z rokom v prihodnosti.', v_zadnji),
      'razlika', v_razlika);
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
