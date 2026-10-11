-- Zasebne ekipe: sestavo fantasy ekipe vidi le lastnik (in admin).
--
-- Prej je bila postava po roku javna (20260916090000_tuje_ekipe): posnetki
-- `fantasy_lineups` in pripomočki `fantasy_chips` so imeli politiko "javno
-- branje", `tuja_postava` pa je vsakomur vrnila zaklenjeno postavo tuje ekipe
-- s kapetanom in klopjo. Odločitev lastnika (10/2026): ekipe drugih niso
-- javne. Javno ostane, kar sestave ne izda: lestvice (ime ekipe, lastnik,
-- točke, mesto, točke kroga, število prestopov in kazen), mini lige in
-- izbranost igralcev kot seštevek.
--
-- Tekoči kader (`fantasy_roster`) je bil zaseben že prej.
--
-- Hišne ekipe (`hisna`) so tekmeci v ligi, ne vzorčne ekipe: vmesnik jih ne
-- označi in njihovih postav nikjer ne kaže kot zgled. Zanje velja isto pravilo
-- (vidi jih le admin) — tudi zato, ker bi javna postava izdala, katera ekipa je
-- hišna.
--
-- Točke, lestvice, izbranost in tedenski pregled mini lige računajo funkcije
-- in pogledi, ki tečejo s pravicami lastnika sheme (postgres ima BYPASSRLS),
-- zato jih zaostritev politik ne zadene.

-- === 1. Kdo sme videti sestavo ekipe ==========================================
-- Lastnik, admin ali servis (PostgREST s ključem service_role naredi SET ROLE
-- service_role; neposredna povezava kot postgres/supabase_admin brez SET
-- ROLE). Vsebine JWT tu ne beremo: user_metadata je v njem in ga piše
-- uporabnik sam. Vzorec je isti kot v
-- `razlog_neveljavne_ekipe`: preizkus pod `set local role anon` mora ostati
-- tujec, čeprav je seja postgres.
create or replace function public.sme_videti_ekipo(p_team bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.fantasy_teams ft
                  where ft.id = p_team and ft.owner_id = auth.uid())
      or public.is_admin()
      or (auth.uid() is null
          and (current_setting('role', true) = 'service_role'
               or (current_setting('role', true) in ('none', 'postgres', 'supabase_admin')
                   and session_user in ('postgres', 'supabase_admin'))));
$$;
revoke all on function public.sme_videti_ekipo(bigint) from public, anon, authenticated;
grant execute on function public.sme_videti_ekipo(bigint) to service_role;

-- === 2. Posnetki postav in pripomočki: le lastnik in admin ===================
drop policy if exists "javno branje" on public.fantasy_lineups;
drop policy if exists "lastnik bere svoje posnetke" on public.fantasy_lineups;
create policy "lastnik bere svoje posnetke" on public.fantasy_lineups
  for select using (
    exists (select 1 from public.fantasy_teams ft
             where ft.id = fantasy_lineups.fantasy_team_id and ft.owner_id = auth.uid())
    or public.is_admin()
  );
-- "admin ureja posnetke" (ALL, is_admin()) ostane.

drop policy if exists "javno branje" on public.fantasy_chips;
drop policy if exists "admin bere pripomocke" on public.fantasy_chips;
create policy "admin bere pripomocke" on public.fantasy_chips
  for select using (public.is_admin());
-- "lastnik igra pripomocek" (ALL, lastnik) ostane in pokrije branje lastnika.

-- `fantasy_transfers` nosi le število prestopov in kazen kroga (brez igralcev),
-- isto kot javni `fantasy_round_points`/`fantasy_round_standings` — ostane javen.

-- === 3. tuja_postava: le za tiste, ki smejo videti ekipo =====================
create or replace function public.tuja_postava(p_team bigint, p_round bigint)
returns table(
  player_id bigint, ime text, klub text, pozicija text, mnozitelj integer,
  je_kapetan boolean, je_namestnik boolean, je_zacetnik boolean, tocke numeric
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
     and public.sme_videti_ekipo(p_team)
     and exists (
       select 1 from public.rounds r
        where r.id = p_round and r.lineups_locked_at is not null
     )
   order by (coalesce(u.mnozitelj, 0) = 0), l.bench_order nulls first,
            coalesce(l.position, p.position);
$$;
revoke all on function public.tuja_postava(bigint, bigint) from public;
grant execute on function public.tuja_postava(bigint, bigint) to anon, authenticated, service_role;

-- === 4. Tedenski pregled mini lige brez tujih postav =========================
-- Funkcija je prej tekla s pravicami klicatelja in brala tuje posnetke prek
-- javne politike. Zdaj teče kot lastnik sheme (sicer bi točke klopi in
-- učinkovite postave tujih ekip izginile), a sama skrije, kar izda sestavo:
--   * kapetan kroga se izbere le med ekipami, ki jih klicatelj sme videti
--     (lastnik: svoja ekipa) — tuj kapetan z imenom igralca ne gre ven;
--   * aduta (igralec, ki ga je imela ena sama ekipa) ni več — tudi pri svoji
--     ekipi bi povedal, katerih igralcev tekmeci nimajo;
--   * klop ostane le kot vsota točk.
-- Vrstice dobijo še `lastnik_id`, da vmesnik poveže le svojo ekipo.
create or replace function public.tedenski_pregled_mini_lige(p_liga bigint, p_krog integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_sezona text;
  v_krog int;
  v_krogi int[];
  v_rezultat jsonb;
begin
  if not sem_v_mini_ligi(p_liga) then
    return null;
  end if;

  select max(k.season) into v_sezona from koncani_krogi_mini_lige(p_liga) k;
  if v_sezona is null then
    return jsonb_build_object('sezona', null, 'krog', null, 'krogi', '[]'::jsonb);
  end if;

  select array_agg(distinct k.number order by k.number desc) into v_krogi
    from koncani_krogi_mini_lige(p_liga) k where k.season = v_sezona;
  v_krog := case when p_krog = any (v_krogi) then p_krog else v_krogi[1] end;

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
      left join fantasy_team_standings s on s.fantasy_team_id = k.fantasy_team_id
      join fantasy_round_points frp
        on frp.fantasy_team_id = k.fantasy_team_id and frp.round_id = k.round_id
     where k.number = v_krog
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
      left join fantasy_round_points frp on frp.fantasy_team_id = c.fantasy_team_id
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
revoke all on function public.tedenski_pregled_mini_lige(bigint, int) from public, anon;
grant execute on function public.tedenski_pregled_mini_lige(bigint, int) to authenticated, service_role;

-- === 5. Izbranost brez izdaje majhnih lig ====================================
-- `owners` šteje človeške ekipe s posnetkom zadnjega zaklenjenega kroga. V ligi
-- z eno ali dvema človeškima ekipama bi seštevek izdal celo ekipo (pri eni
-- sami ekipi ima vsak njen igralec owners = 1). Zato je izbranost znana šele,
-- ko je v tistem krogu vsaj 5 človeških ekip; do takrat NULL (vmesnik kaže
-- "–", kot pred prvim rokom).
create or replace view public.player_standings as
 SELECT po.id,
    po.full_name,
    po."position",
    po.position_source,
    po.team_id,
    po.team_name,
    po.team_short,
    po.value,
    po.matches,
    po.minutes,
    po.goals,
    po.clean_sheets,
    COALESCE(t.points, (0)::numeric) AS points,
    COALESCE(f.points, (0)::numeric) AS form,
    COALESCE(z.points, (0)::numeric) AS last_round,
        CASE
            WHEN (po.matches > 0) THEN round((COALESCE(t.points, (0)::numeric) / (po.matches)::numeric), 2)
            ELSE (0)::numeric
        END AS points_per_match,
        CASE
            WHEN (po.value > (0)::numeric) THEN round((COALESCE(t.points, (0)::numeric) / po.value), 2)
            ELSE (0)::numeric
        END AS points_per_value,
        CASE
            WHEN (zk.id IS NULL) OR (zk.ekip < 5) THEN NULL::integer
            ELSE COALESCE(l.owners, 0)
        END AS owners,
    rank() OVER (PARTITION BY po.competition_id ORDER BY COALESCE(t.points, (0)::numeric) DESC) AS rank,
    po.team_logo,
    po.competition_id,
    po.assists
   FROM (((((public.player_overview po
     LEFT JOIN LATERAL ( SELECT sum(ps.points) AS points
           FROM public.player_scores ps
          WHERE (ps.player_id = po.id)) t ON (true))
     LEFT JOIN LATERAL ( SELECT sum(zadnji.points) AS points
           FROM ( SELECT ps.points
                   FROM (public.player_scores ps
                     JOIN public.rounds r ON ((r.id = ps.round_id)))
                  WHERE (ps.player_id = po.id)
                  ORDER BY r.number DESC
                 LIMIT 3) zadnji) f ON (true))
     LEFT JOIN LATERAL ( SELECT ps.points
           FROM (public.player_scores ps
             JOIN public.rounds r ON ((r.id = ps.round_id)))
          WHERE (ps.player_id = po.id)
          ORDER BY r.number DESC
         LIMIT 1) z ON (true))
     LEFT JOIN ( SELECT z.competition_id, z.id,
            ( SELECT count(DISTINCT fl.fantasy_team_id)::integer
                FROM public.fantasy_lineups fl
               WHERE fl.round_id = z.id
                 AND NOT EXISTS (SELECT 1 FROM public.fantasy_teams h
                                  WHERE h.id = fl.fantasy_team_id AND h.hisna)) AS ekip
           FROM ( SELECT DISTINCT ON (r.competition_id) r.competition_id, r.id
                    FROM public.rounds r
                   WHERE r.lineups_locked_at IS NOT NULL
                   ORDER BY r.competition_id, r.season DESC, r.number DESC) z) zk
       ON (zk.competition_id = po.competition_id))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS owners
           FROM public.fantasy_lineups fl
          WHERE ((fl.player_id = po.id) AND (fl.round_id = zk.id)
            AND NOT EXISTS (SELECT 1 FROM public.fantasy_teams h
                             WHERE h.id = fl.fantasy_team_id AND h.hisna))) l ON (true));

create or replace view public.player_season_standings as
select po.id,
       po.full_name,
       po.position,
       po.position_source,
       po.team_id,
       po.team_name,
       po.team_short,
       po.team_logo,
       po.value,
       ss.season,
       ss.matches,
       ss.minutes,
       ss.goals,
       ss.clean_sheets,
       ss.points,
       case when ss.matches > 0 then round(ss.points / ss.matches::numeric, 2)
            else 0::numeric end as points_per_match,
       case when po.value > 0::numeric then round(ss.points / po.value, 2)
            else 0::numeric end as points_per_value,
       ss.last_round,
       ss.form,
       case when zk.id is null or zk.ekip < 5 then null::integer
            else coalesce(l.owners, 0) end as owners,
       rank() over (partition by po.competition_id, ss.season order by ss.points desc) as rank,
       po.competition_id,
       ss.assists
  from public.player_overview po
  join public.statistika_igralcev ss
    on ss.player_id = po.id and ss.competition_id = po.competition_id
  -- Zadnji zaklenjeni krog lige in število človeških ekip v njem: enkrat na
  -- ligo, ne na igralca (lateral na vrstico je bil 10× počasnejši).
  left join (
    select z.competition_id, z.id,
           (select count(distinct fl.fantasy_team_id)::integer
              from public.fantasy_lineups fl
             where fl.round_id = z.id
               and not exists (select 1 from public.fantasy_teams h
                                where h.id = fl.fantasy_team_id and h.hisna)) as ekip
      from (select distinct on (r.competition_id) r.competition_id, r.id
              from public.rounds r
             where r.lineups_locked_at is not null
             order by r.competition_id, r.season desc, r.number desc) z
  ) zk on zk.competition_id = po.competition_id
  left join lateral (
    select count(*)::integer as owners
      from public.fantasy_lineups fl
     where fl.player_id = po.id and fl.round_id = zk.id
       and not exists (select 1 from public.fantasy_teams h
                        where h.id = fl.fantasy_team_id and h.hisna)
  ) l on true;

-- === 6. Pravice funkcij, ki se dotikajo ekip ==================================
-- Ob selitvi na Hetzner (6. 10. 2026) je obnova baze vsem funkcijam v public
-- dodala EXECUTE za anon in authenticated (privzete pravice supabase_admin in
-- postgres v shemi public), tudi servisnim. Tu vrnemo nameravane pravice
-- funkcijam, ki berejo ali spreminjajo ekipe, posnetke in točke krogov —
-- enako kot jih ima baza, zgrajena iz migracij. Ostale funkcije so naštete v
-- opisu PR in jih uredi ločena sprememba.
do $$
declare
  f text;
begin
  -- Samo servis (cron, delovni tokovi, sprožilci).
  foreach f in array array[
    'public.odstrani_hisne_ekipe(bigint[])',
    'public.ustvari_hisno_ekipo(uuid, bigint, text, jsonb)',
    'public.osvezi_tocke_krogov(bigint[])',
    'public.osvezi_vse_tocke_krogov()',
    'public.zakleni_krog(bigint)',
    'public.zakleni_zapadle_kroge(interval)',
    'public.tocke_krogov_po_krogu()',
    'public.tocke_krogov_po_nastopu()',
    'public.dodeli_ime_hisnega_lastnika()',
    'public.ime_hisnega_lastnika(bigint, bigint)',
    'public.varuj_hisno_ekipo()',
    'public.mini_liga_brez_hisnih()',
    'public.nova_koda_mini_lige()',
    'public.preveri_rok_pripomocka()',
    'public.pripomocek_sezona()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;

  -- Le prijavljeni (funkcije same preverijo lastnika ali admina).
  foreach f in array array[
    'public.shrani_ekipo(bigint, jsonb)',
    'public.razlog_neveljavne_ekipe(bigint)',
    'public.stanje_mojih_ekip()',
    'public.pridruzi_mini_ligi(text, bigint)',
    'public.ustvari_mini_ligo(text, bigint)',
    'public.koncani_krogi_mini_lige(bigint)',
    'public.admin_preracunaj_krog(bigint)',
    'public.admin_uporabniki(bigint)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated, service_role', f);
    end if;
  end loop;
end $$;
