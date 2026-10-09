-- Vklop lige sredi sezone kot servisna funkcija (prej blok DO prek ssh in
-- migracije `…_vklop_at_…`). Kliče jo delovni tok *Uvoz Avstrije (vrsta)*
-- (scripts/vrsta-avstrije.mjs) po uspelem uvozu; splošna je za vsako ligo.
--
-- Prvi fantasy krog = prvi krog tekoče sezone za zadnjim krogom z zapisniki,
-- ki ima rok še pred sabo (CLAUDE.md, Hrvaška: "Vklop sredi sezone"). Ligo,
-- ki ni pripravljena, zavrne sprožilec `varovalo_vklopa_lige`; funkcija
-- napako ujame in jo vrne kot razlog. Razlika izidi − goli se le javi.
create or replace function public.vklopi_ligo_sredi_sezone(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_aktivna boolean;
  v_sezona text := tekoca_sezona();
  v_zadnji int;
  v_krog int;
  v_razlika bigint;
begin
  select id, active into v_id, v_aktivna from competitions where slug = p_slug for update;
  if v_id is null then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Lige ni.');
  end if;
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

  select coalesce(max(r.number), 0) into v_zadnji
    from rounds r
   where r.competition_id = v_id and r.season = v_sezona
     and exists (select 1 from matches m join appearances a on a.match_id = m.id
                  where m.round_id = r.id);
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
