-- Posnetek postave si zapomni tudi pozicijo.
--
-- Kvota kadra se od migracije 20260902110000 sodi po `fantasy_roster.buy_position`
-- — poziciji ob nakupu — ker glasovanje skupnosti pozicijo premika in bi sicer
-- tuj kader za nazaj postal neveljaven. Isti premislek velja za POSTAVO
-- zaklenjenega kroga, le da tam posnetka pozicije ni bilo: `tuja_postava` in
-- `ucinkovita_postava` sta brali `players.position`, torej stanje DANES.
--
-- Posledica je bila vidna na strani tuje ekipe: ekipa 22 v 2. krogu kaze
-- 1-4-1-5, ekipa 206 pa 1-6-1-3. Nobene od teh postav ni bilo mogoce shraniti
-- (napadalcev je najvec 3, branilcev 5) — lastnik je postavil veljavno
-- enajsterico, pozicije pa so se pozneje premaknile.
--
-- Drugi, tisji ucinek: samodejna menjava isce namestnika z ISTO pozicijo.
-- Ce je vezist medtem postal napadalec, klop, ki jo je lastnik sestavil za
-- pokrivanje vezista, za nazaj ne pokriva nicesar.
--
-- Odslej velja isto kot pri kvoti in ceni:
--   * postava se rise in menjave se iscejo po poziciji IZ POSNETKA,
--   * tocke se naprej steje PRAVA, trenutna pozicija — gol je vreden toliko,
--     kolikor je vreden gol igralca na tem mestu.
--
-- Zgodovino napolnimo iz `fantasy_roster.buy_position`, kjer je igralec se
-- vedno v istem kadru; za tiste, ki so med tem odsli, prave vrednosti ni
-- nikjer in ostane trenutna.

alter table fantasy_lineups add column if not exists position text;

alter table fantasy_lineups drop constraint if exists fantasy_lineups_position_check;
alter table fantasy_lineups add constraint fantasy_lineups_position_check
  check (position is null or position in ('GK', 'DEF', 'MID', 'FWD'));

comment on column fantasy_lineups.position is
  'Pozicija igralca ob zaklepu kroga. Po njej se rise postava in iscejo '
  'samodejne menjave; tocke steje trenutna pozicija.';

update fantasy_lineups fl
   set position = coalesce(
         (select fr.buy_position
            from fantasy_roster fr
           where fr.fantasy_team_id = fl.fantasy_team_id
             and fr.player_id = fl.player_id),
         p.position)
  from players p
 where p.id = fl.player_id
   and fl.position is null;

-- --------------------------------------------------------------------------
-- Zaklep zapise pozicijo ob nakupu
-- --------------------------------------------------------------------------
create or replace function zakleni_krog(p_round_id bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posnetih   int;
  v_strogo_od  int := nastavitev_int('strogi_zaklep_od_kroga', 2);
  v_prosti     int := nastavitev_int('prosti_prestopi', 3);
  v_kazen      int := nastavitev_int('kazen_prestopa', 4);
  v_stevilka   int;
  v_sezona     text;
  v_deadline   timestamptz;
  v_tekmovanje bigint;
  v_prvi       int;
  v_uporabi_v  boolean;
  v_zaklenjen  timestamptz;
begin
  select competition_id into v_tekmovanje from rounds where id = p_round_id;
  if not found then return 0; end if;

  perform pg_advisory_xact_lock(hashtextextended('slff-kader:' || v_tekmovanje, 0));

  select r.number, r.season, r.deadline_at, r.competition_id, c.prvi_fantasy_krog,
         r.lineups_locked_at
    into v_stevilka, v_sezona, v_deadline, v_tekmovanje, v_prvi, v_zaklenjen
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.id = p_round_id;

  if v_stevilka is null or v_zaklenjen is not null
     or v_deadline is null or v_deadline > clock_timestamp() then
    return 0;
  end if;

  if v_stevilka < coalesce(v_prvi, 1) then
    return 0;
  end if;

  update rounds set lineups_locked_at = clock_timestamp() where id = p_round_id;

  v_uporabi_v := v_stevilka >= greatest(v_strogo_od, coalesce(v_prvi, 1) + 1);

  insert into fantasy_lineups (
    round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice,
    bench_order, position
  )
  select p_round_id, fr.fantasy_team_id, fr.player_id,
         fr.is_starter, fr.is_captain, fr.is_vice, fr.bench_order,
         coalesce(fr.buy_position, p.position)
  from fantasy_roster fr
  join fantasy_teams ft on ft.id = fr.fantasy_team_id
  join players p on p.id = fr.player_id
  where ft.competition_id = v_tekmovanje
  and not exists (
    select 1 from fantasy_lineups fl
    where fl.round_id = p_round_id and fl.fantasy_team_id = fr.fantasy_team_id
  )
  and ft.created_at <= v_deadline
  and ft.roster_updated_at <= v_deadline
  and (not v_uporabi_v or roster_je_veljaven(fr.fantasy_team_id));

  get diagnostics v_posnetih = row_count;

  insert into fantasy_transfers (fantasy_team_id, round_id, transfers, free_transfers, penalty)
  select
    n.fantasy_team_id,
    p_round_id,
    n.prisli,
    v_prosti,
    case
      when exists (
        select 1 from fantasy_chips c
        where c.fantasy_team_id = n.fantasy_team_id
          and c.chip = 'wildcard'
          and c.round_id = p_round_id
      ) then 0
      else greatest(0, n.prisli - v_prosti) * v_kazen
    end
  from (
    select
      fl.fantasy_team_id,
      count(*) filter (
        where not exists (
          select 1 from fantasy_lineups prej
          where prej.fantasy_team_id = fl.fantasy_team_id
            and prej.player_id = fl.player_id
            and prej.round_id = prejsnji.round_id
        )
      ) as prisli
    from fantasy_lineups fl
    join lateral (
      select fl2.round_id
      from fantasy_lineups fl2
      join rounds r2 on r2.id = fl2.round_id
      where fl2.fantasy_team_id = fl.fantasy_team_id
        and r2.season = v_sezona
        and r2.number < v_stevilka
      order by r2.number desc
      limit 1
    ) prejsnji on true
    where fl.round_id = p_round_id
    group by fl.fantasy_team_id
  ) n
  on conflict (fantasy_team_id, round_id) do nothing;

  return v_posnetih;
end;
$$;

-- --------------------------------------------------------------------------
-- Postava kroga vrne tudi pozicijo (iz posnetka, sicer ob nakupu)
-- --------------------------------------------------------------------------
drop function if exists postava_kroga(bigint, bigint);
create function postava_kroga(p_team bigint, p_round bigint)
returns table (
  player_id bigint,
  is_starter boolean,
  is_captain boolean,
  is_vice boolean,
  bench_order int,
  poz text
)
language sql
stable
as $$
  select fl.player_id, fl.is_starter, fl.is_captain, fl.is_vice, fl.bench_order,
         coalesce(fl.position, p.position)::text
  from fantasy_lineups fl
  join players p on p.id = fl.player_id
  where fl.fantasy_team_id = p_team and fl.round_id = p_round
  union all
  -- Dokler rok ni potekel, velja trenutni kader; po roku samo še posnetek.
  select fr.player_id, fr.is_starter, fr.is_captain, fr.is_vice, fr.bench_order,
         coalesce(fr.buy_position, p.position)::text
  from fantasy_roster fr
  join players p on p.id = fr.player_id
  where fr.fantasy_team_id = p_team
    and exists (
      select 1 from rounds r
      where r.id = p_round
        and (r.deadline_at is null or r.deadline_at > now())
    )
    and not exists (
      select 1 from fantasy_lineups fl
      where fl.fantasy_team_id = p_team and fl.round_id = p_round
    );
$$;

-- `drop function` vzame s sabo tudi pravice; brez tega zgodovinska postava
-- prijavljenemu uporabniku vrne "permission denied".
grant execute on function postava_kroga(bigint, bigint)
  to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Samodejna menjava isce namestnika po poziciji iz posnetka
-- --------------------------------------------------------------------------
create or replace function ucinkovita_postava(p_team bigint, p_round bigint)
returns table (player_id bigint, mnozitelj int)
language plpgsql
stable
as $$
declare
  v_klop_plus boolean;
  v_kapetan bigint;
  v_postava bigint[] := '{}';
  v_porabljeni bigint[] := '{}';
  v_zamenjava bigint;
  igralec record;
begin
  select exists (
    select 1 from fantasy_chips c
    where c.fantasy_team_id = p_team and c.chip = 'klop_plus' and c.round_id = p_round
  ) into v_klop_plus;

  for igralec in
    select pk.player_id, pk.poz, coalesce(mk.minutes, 0) as minutes
    from postava_kroga(p_team, p_round) pk
    left join minute_kroga mk
      on mk.round_id = p_round and mk.player_id = pk.player_id
    where pk.is_starter
    order by pk.player_id
  loop
    if igralec.minutes > 0 then
      v_postava := v_postava || igralec.player_id;
      continue;
    end if;

    select pk.player_id into v_zamenjava
    from postava_kroga(p_team, p_round) pk
    join minute_kroga mk
      on mk.round_id = p_round and mk.player_id = pk.player_id and mk.minutes > 0
    where not pk.is_starter
      and pk.poz = igralec.poz
      and not (pk.player_id = any (v_porabljeni))
    order by coalesce(pk.bench_order, 99), pk.player_id
    limit 1;

    if v_zamenjava is not null then
      v_postava := v_postava || v_zamenjava;
      v_porabljeni := v_porabljeni || v_zamenjava;
    else
      -- Brez ustrezne zamenjave ostane igralec v postavi z nič točkami.
      v_postava := v_postava || igralec.player_id;
    end if;
    v_zamenjava := null;
  end loop;

  if v_klop_plus then
    v_postava := v_postava || coalesce(
      (select array_agg(pk.player_id)
       from postava_kroga(p_team, p_round) pk
       where not pk.is_starter
         and not (pk.player_id = any (v_porabljeni))),
      '{}'::bigint[]
    );
  end if;

  select pk.player_id into v_kapetan
  from postava_kroga(p_team, p_round) pk
  join minute_kroga mk
    on mk.round_id = p_round and mk.player_id = pk.player_id and mk.minutes > 0
  where pk.is_captain;

  if v_kapetan is null then
    select pk.player_id into v_kapetan
    from postava_kroga(p_team, p_round) pk
    join minute_kroga mk
      on mk.round_id = p_round and mk.player_id = pk.player_id and mk.minutes > 0
    where pk.is_vice;
  end if;

  return query
  select v.id, case when v.id = v_kapetan then 3 else 1 end
  from unnest(v_postava) as v(id);
end;
$$;

-- --------------------------------------------------------------------------
-- Tuja postava kaze pozicijo iz posnetka
-- --------------------------------------------------------------------------
create or replace function public.tuja_postava(p_team bigint, p_round bigint)
returns table (
  player_id  bigint,
  ime        text,
  klub       text,
  pozicija   text,
  mnozitelj  int,
  je_kapetan boolean,
  je_namestnik boolean,
  je_zacetnik boolean,
  tocke      numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select l.player_id,
         coalesce(
           nullif(trim(p.full_name), ''),
           nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
         )::text,
         t.name::text,
         coalesce(l.position, p.position)::text,
         coalesce(u.mnozitelj, 0),
         l.is_captain,
         l.is_vice,
         l.is_starter,
         coalesce(s.points, 0)::numeric
    from public.fantasy_lineups l
    join public.players p on p.id = l.player_id
    left join public.teams t on t.id = p.team_id
    left join public.player_scores s
           on s.player_id = l.player_id and s.round_id = l.round_id
    left join public.ucinkovita_postava(p_team, p_round) u
           on u.player_id = l.player_id
   where l.fantasy_team_id = p_team
     and l.round_id = p_round
     and exists (
       select 1 from public.rounds r
        where r.id = p_round and r.lineups_locked_at is not null
     )
   order by (coalesce(u.mnozitelj, 0) = 0), l.bench_order nulls first,
            coalesce(l.position, p.position);
$$;

revoke all on function public.tuja_postava(bigint, bigint) from public;
grant execute on function public.tuja_postava(bigint, bigint) to anon, authenticated;
