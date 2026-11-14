-- Prekoračitve časa in zaklepov iz dnevnikov strežnika (14. 11. 2026).
--
-- 1. Cron `zakleni_zapadle_kroge` (vsakih 5 min) je v eni transakciji zaklenil
--    kader (`slff-kader:<liga>`) vseh lig s krogom v zadnjih 7 dneh in ga držal
--    do konca (6–16 s ob polnih urah); shrani_ekipo je takrat čakal 8 s in padel.
--    Zdaj postopek z COMMIT po vsakem krogu.
-- 2. Nočni `osvezi_vso_statistiko_igralcev` je 3,7 min držal izključni zaklep
--    `slff-statistika`; vsaka sprožena osvežitev (glas, uvoz) je padla na
--    lock_timeout. Zdaj kosi po 200 (zaklep na igralca) s COMMIT po kosu.
-- 3. Mini lige: pogledi točk dobijo filter ekip kot omejitev (= any), ne iz
--    stika, zato ne preberejo vseh lig (koncani_krogi_mini_lige 567 → 44 ms).
--
-- Postopka nimata SECURITY DEFINER ali SET (COMMIT bi bil prepovedan); kliče
-- ju le pg_cron kot lastnik.

create or replace procedure public.zakleni_zapadle_kroge_po_vrsti(p_okno interval default '7 days')
language plpgsql
as $$
declare
  v_id bigint;
begin
  for v_id in
    select r.id from public.rounds r
     where r.deadline_at is not null
       and r.deadline_at <= now()
       and r.deadline_at > now() - p_okno
     order by r.number, r.id
  loop
    perform public.zakleni_krog(v_id);
    commit;
  end loop;
end;
$$;
revoke all on procedure public.zakleni_zapadle_kroge_po_vrsti(interval) from public, anon, authenticated;

create or replace procedure public.osvezi_vso_statistiko_po_kosih()
language plpgsql
as $$
declare
  v_kos bigint[];
begin
  for v_kos in
    select array_agg(id order by id)
      from (select id, (row_number() over (order by id) - 1) / 200 as kos from public.players) x
     group by kos
     order by kos
  loop
    perform public.osvezi_statistiko_igralcev(v_kos);
    commit;
  end loop;
  delete from public.statistika_igralcev s
   where not exists (select 1 from public.players p where p.id = s.player_id);
end;
$$;
revoke all on procedure public.osvezi_vso_statistiko_po_kosih() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.alter_job(jobid, command := 'call public.zakleni_zapadle_kroge_po_vrsti()')
       from cron.job where command = 'select public.zakleni_zapadle_kroge()';
    perform cron.alter_job(jobid, command := 'call public.osvezi_vso_statistiko_po_kosih()')
       from cron.job where command = 'select public.osvezi_vso_statistiko_igralcev()';
  end if;
end;
$$;

create or replace function public.koncani_krogi_mini_lige(p_liga bigint)
 RETURNS TABLE(fantasy_team_id bigint, round_id bigint, season text, number integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select c.fantasy_team_id, r.id, r.season, r.number
    from mini_liga_clani c
    join fantasy_teams ft on ft.id = c.fantasy_team_id
    join rounds r on r.competition_id = ft.competition_id
    join (select f.fantasy_team_id, f.round_id
            from fantasy_round_points f
           where f.fantasy_team_id = any (array(select m.fantasy_team_id from mini_liga_clani m where m.mini_liga_id = p_liga))) frp
      on frp.fantasy_team_id = c.fantasy_team_id and frp.round_id = r.id
   where c.mini_liga_id = p_liga
     and not public.dfb_round_has_pending(r.id)
     and r.deadline_at < now()
     and ft.created_at < r.deadline_at
     and exists (select 1 from matches m where m.round_id = r.id)
     and not exists (
           select 1 from matches m
            where m.round_id = r.id
              and m.zapisnik_id is null
              and not m.kontumacija
              and coalesce(m.played_on, r.played_on, r.deadline_at::date) >= current_date - 7
         );
$function$;

create or replace function public.tedenski_pregled_mini_lige(p_liga bigint, p_krog integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sezona text;
  v_krog int;
  v_prej int;
  v_krogi int[];
  v_saljive boolean;
  v_mladinska boolean;
  v_rezultat jsonb;
  v_ekipe bigint[];
begin
  if not sem_v_mini_ligi(p_liga) then
    return null;
  end if;
  -- Pogledi točk dobijo filter le kot omejitev (= any), ne iz stika.
  v_ekipe := array(select fantasy_team_id from mini_liga_clani where mini_liga_id = p_liga);

  -- Mini liga gre čez lige: mladinska je, če ima ekipo iz mladinske lige ali
  -- je javna v mladinski ligi. Takrat slike ne kažejo piva.
  select m.saljive_nagrade,
         coalesce(je_mladinska_liga(m.competition_id), false)
         or exists (
           select 1
             from mini_liga_clani c
             join fantasy_teams ft on ft.id = c.fantasy_team_id
             join competitions co on co.id = ft.competition_id
            where c.mini_liga_id = p_liga
              and je_mladinski_slug(co.slug))
    into v_saljive, v_mladinska
    from mini_lige m
   where m.id = p_liga;

  select max(k.season) into v_sezona from koncani_krogi_mini_lige(p_liga) k;
  if v_sezona is null then
    return jsonb_build_object('sezona', null, 'krog', null, 'krogi', '[]'::jsonb,
                              'saljive', coalesce(v_saljive, true), 'mladinska', coalesce(v_mladinska, false));
  end if;

  select array_agg(distinct k.number order by k.number desc) into v_krogi
    from koncani_krogi_mini_lige(p_liga) k where k.season = v_sezona;
  v_krog := case when p_krog = any (v_krogi) then p_krog else v_krogi[1] end;
  select max(x) into v_prej from unnest(v_krogi) x where x < v_krog;

  with
  krogi as (
    select * from koncani_krogi_mini_lige(p_liga) k where k.season = v_sezona
  ),
  ekipe as (
    select k.fantasy_team_id, k.round_id,
           coalesce(s.team_name, ft.name) as ekipa,
           s.owner_name as lastnik,
           s.owner_id as lastnik_id,
           frp.points as tocke,
           sme_videti_ekipo(k.fantasy_team_id) as vidna
      from krogi k
      join fantasy_teams ft on ft.id = k.fantasy_team_id
      left join (select * from fantasy_team_standings where fantasy_team_id = any (v_ekipe)) s on s.fantasy_team_id = k.fantasy_team_id
      join (select * from fantasy_round_points where fantasy_team_id = any (v_ekipe)) frp
        on frp.fantasy_team_id = k.fantasy_team_id and frp.round_id = k.round_id
     where k.number = v_krog
  ),
  -- Točke prejšnjega končanega kroga: kdo je bil takrat zadnji.
  prej as (
    select k.fantasy_team_id, frp.points as tocke
      from krogi k
      join (select * from fantasy_round_points where fantasy_team_id = any (v_ekipe)) frp
        on frp.fantasy_team_id = k.fantasy_team_id and frp.round_id = k.round_id
     where k.number = v_prej
  ),
  -- Postava po samodejnih menjavah — ista, iz katere so točke kroga.
  igrali as (
    select e.fantasy_team_id, e.vidna, u.player_id, u.mnozitelj,
           coalesce(ps.points, 0) as tocke
      from ekipe e
      cross join lateral ucinkovita_postava(e.fantasy_team_id, e.round_id) u
      left join player_scores ps on ps.round_id = e.round_id and ps.player_id = u.player_id
  ),
  -- Klop: kdor je bil v posnetku, a ga ni v učinkoviti postavi. Ven gre le vsota.
  klop as (
    select e.fantasy_team_id, sum(coalesce(ps.points, 0)) as tocke
      from ekipe e
      join fantasy_lineups fl on fl.fantasy_team_id = e.fantasy_team_id and fl.round_id = e.round_id
      left join player_scores ps on ps.round_id = e.round_id and ps.player_id = fl.player_id
     where not exists (select 1 from igrali i
                        where i.fantasy_team_id = e.fantasy_team_id and i.player_id = fl.player_id)
     group by e.fantasy_team_id
  ),
  -- Lestvica mini lige pred krogom in po njem, iz vsote krogov te sezone.
  skupaj as (
    select c.fantasy_team_id,
           coalesce(sum(frp.points) filter (where r.number <= v_krog), 0) as zdaj,
           coalesce(sum(frp.points) filter (where r.number <= v_krog - 1), 0) as prej
      from mini_liga_clani c
      left join (select * from fantasy_round_points where fantasy_team_id = any (v_ekipe)) frp on frp.fantasy_team_id = c.fantasy_team_id
      left join rounds r on r.id = frp.round_id and r.season = v_sezona
     where c.mini_liga_id = p_liga
     group by c.fantasy_team_id
  ),
  mesta as (
    select fantasy_team_id,
           rank() over (order by zdaj desc) as mesto,
           rank() over (order by prej desc) as mesto_prej
      from skupaj
  ),
  premiki as (
    select m.fantasy_team_id, m.mesto, m.mesto_prej - m.mesto as premik
      from mesta m
  ),
  kapetani as (
    select i.fantasy_team_id, i.player_id, i.tocke, i.tocke * i.mnozitelj as skupaj
      from igrali i where i.mnozitelj > 1 and i.vidna
  ),
  najkapetan as (
    select * from kapetani where tocke > 0
     order by skupaj desc, fantasy_team_id limit 1
  )
  select jsonb_build_object(
    'sezona', v_sezona,
    'krog', v_krog,
    'krogi', to_jsonb(v_krogi),
    'ekip', (select count(*) from ekipe),
    'saljive', coalesce(v_saljive, true),
    'mladinska', coalesce(v_mladinska, false),
    -- Ekipe z najmanj točkami prejšnjega kroga (vse izenačene), le če je
    -- kdo imel več — sicer zadnjega ni bilo.
    'zadnji_prej', coalesce((
      select jsonb_agg(p.fantasy_team_id order by p.fantasy_team_id)
        from prej p
       where p.tocke = (select min(tocke) from prej)
         and (select min(tocke) from prej) < (select max(tocke) from prej)
    ), '[]'::jsonb),
    'vrstice', coalesce((
      select jsonb_agg(jsonb_build_object(
               'ekipa_id', e.fantasy_team_id, 'ekipa', e.ekipa, 'lastnik', e.lastnik,
               'lastnik_id', e.lastnik_id,
               'tocke', e.tocke, 'mesto', p.mesto,
               'premik', case when v_krog > (select min(number) from krogi)
                              then p.premik end)
               order by e.tocke desc, e.ekipa)
        from ekipe e join premiki p using (fantasy_team_id)
    ), '[]'::jsonb),
    'kapetan', (
      select jsonb_build_object('ekipa_id', k.fantasy_team_id, 'igralec_id', k.player_id,
                                'igralec', coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name),
                                'tocke', k.tocke, 'skupaj', k.skupaj)
        from najkapetan k join players pl on pl.id = k.player_id
    ),
    'klop', (
      select jsonb_build_object('ekipa_id', k.fantasy_team_id, 'tocke', k.tocke)
        from klop k where k.tocke > 0
       order by k.tocke desc, k.fantasy_team_id limit 1
    ),
    'adut', null
  ) into v_rezultat;

  return v_rezultat;
end $function$;
