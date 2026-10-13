-- Preizkus zamrznitve cene ob poškodbi (migracija 20261013221100).
--
-- En klub igra šest novih krogov. V 1. krogu igrajo vsi (izhodišče), nato
-- pet igralcev ne igra več; odsotnosti veljajo od dneva po 1. krogu:
--   Q  brez odsotnosti (primerjava: borza ga spušča od 3. kroga),
--   P1 poškodba brez potrditve kluba (zamrznjena 2 kroga: 2. in 3.),
--   P2 poškodba s potrditvijo kluba (do 6 krogov),
--   P3 poškodba s potrditvijo, vrnitev dan po 3. krogu (4. še, 5. ne),
--   P4 dopust (ne zamrzne).
-- Borza obračuna 2.–5. krog. P2 nato zaigra v 6. krogu, med poškodbo:
-- zadržani padci (3., 4., 5. krog) se uveljavijo, enkrat.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-zamrznitve.sql
\set ON_ERROR_STOP on

begin;

do $$
declare
  tekmovanje bigint;
  sezona text;
  klub bigint;
  nasprotnik bigint;
  igralci bigint[];
  igralec_tekme bigint;
  q bigint; p1 bigint; p2 bigint; p3 bigint; p4 bigint; p5 bigint;
  krogi bigint[] := '{}';
  tekme bigint[] := '{}';
  st int;
  k bigint;
  t bigint;
  i int;
  od date := current_date - 36;
  u uuid;
  vrstni bigint[];
  cena_p2 numeric;
  premik numeric;
begin
  -- --- priprava ------------------------------------------------------------
  -- Lastna liga z negativnimi id-ji: preizkus ne sme sloneti na začetnih
  -- podatkih (seed), ki jih sveža baza v CI morda nima.
  sezona := tekoca_sezona();
  insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
  values (-923001, 'test-zamrznitev', 'Test zamrznitve', 'TZ', false, (select id from countries where code = 'SI'), 'mnzg')
  returning id into tekmovanje;
  update competitions set prvi_fantasy_krog = 1 where id = tekmovanje;
  insert into teams(id, name, short_name, country_id) overriding system value
  values (-923001, 'Zamrznitev klub', 'ZK', (select id from countries where code = 'SI')),
         (-923002, 'Zamrznitev nasprotnik', 'ZN', (select id from countries where code = 'SI'));
  klub := -923001; nasprotnik := -923002;
  insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
  select -923000 - n, klub, tekmovanje, 'Z', n::text, 'Zamrznitev ' || n, 'MID', 'admin', 7.0, 7.0, true
    from generate_series(1, 7) n;
  insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
  values (-923100, nasprotnik, tekmovanje, 'Z', 'N', 'Zamrznitev Nasprotnik', 'MID', 'admin', 7.0, 7.0, true);
  select array_agg(id order by id desc) into igralci from players where team_id = klub;
  igralec_tekme := igralci[1]; q := igralci[2]; p1 := igralci[3]; p2 := igralci[4]; p3 := igralci[5]; p4 := igralci[6]; p5 := igralci[7];

  -- Starejše tekme kluba v sezoni štejejo za uvožene (okno forme ne čaka).
  update matches m set imported_at = coalesce(m.imported_at, now())
    from rounds r where r.id = m.round_id and r.competition_id = tekmovanje and r.season = sezona;

  -- Šest novih krogov, tedensko, zadnji pred dvema dnevoma. V vsakem igra
  -- igralec_tekme (klub torej igra), v 1. krogu pa vsi.
  select coalesce(max(number), 0) into st from rounds where competition_id = tekmovanje and season = sezona;
  for i in 1..6 loop
    insert into rounds (competition_id, season, number, deadline_at, played_on)
    values (tekmovanje, sezona, st + i, now() - make_interval(days => 44 - 7 * i), current_date - (44 - 7 * i))
    returning id into k;
    krogi := krogi || k;
    insert into matches (round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at)
    values (k, klub, nasprotnik, 1, 1, current_date - (44 - 7 * i), now()) returning id into t;
    tekme := tekme || t;
    insert into appearances (match_id, player_id, team_id, started, minutes_played)
    select t, x, klub, true, 90 from unnest(case when i = 1 then igralci else array[igralec_tekme] end) x;
    insert into appearances (match_id, player_id, team_id, started, minutes_played)
    values (t, -923100, nasprotnik, true, 90);
  end loop;

  -- Potrjeni profili in uradne odsotnosti (objavljene pred prvim krogom).
  vrstni := array[p1, p2, p3, p4];
  for i in 1..4 loop
    u := ('a2a10000-0000-4000-8000-00000000000' || i)::uuid;
    insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at)
    values (u, 'zamrznitev' || i || '@example.invalid', now(), '{}', now() - interval '60 days');
    insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
    values (vrstni[i], u, 'potrjen', 'admin', now() - interval '50 days');
    insert into uradne_odsotnosti(player_id, zahtevek_id, user_id, vrsta, od, vrnitev, sezona, created_at, klub_potrdil_at)
    select vrstni[i], z.id, u,
           case when i = 4 then 'dopust' else 'poskodba' end,
           od,
           case when i = 3 then current_date - (44 - 7 * 3) + 1 end,
           sezona, now() - interval '45 days',
           case when i in (2, 3) then now() - interval '44 days' end
      from zahtevki_igralca z where z.player_id = vrstni[i] and z.user_id = u;
  end loop;

  -- P5 zapira in odpira samoprijavljene poškodbe (brez kluba): A1 zajame 2.
  -- krog (+3. po zaprtju), A2 4. krog (+5.). V sezoni sme brez potrditve
  -- prihraniti le 2 padca: 3. in 4. krog, 5. pade.
  u := 'a2a10000-0000-4000-8000-000000000005';
  insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at)
  values (u, 'zamrznitev5@example.invalid', now(), '{}', now() - interval '60 days');
  insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
  values (p5, u, 'potrjen', 'admin', now() - interval '50 days');
  insert into uradne_odsotnosti(player_id, zahtevek_id, user_id, vrsta, od, sezona, created_at, status, zaprto_at)
  select p5, z.id, u, 'poskodba', x.od, sezona, now() - interval '45 days', 'zaprto',
         (x.zaprto::timestamp at time zone 'Europe/Ljubljana')
    from zahtevki_igralca z,
         (values (current_date - (44 - 7 * 2) - 1, current_date - (44 - 7 * 2) + 1),
                 (current_date - (44 - 7 * 4) - 1, current_date - (44 - 7 * 4) + 1)) x(od, zaprto)
   where z.player_id = p5;

  -- --- 1. zamrznitev po krogih ---------------------------------------------
  -- P1 (brez potrditve): 2. in 3. krog zamrznjena, 4. ne.
  if zamrznjena_odsotnost(p1, krogi[3]) is null then raise exception '1a. P1 naj bo v 3. krogu zamrznjen'; end if;
  if zamrznjena_odsotnost(p1, krogi[4]) is not null then raise exception '1b. P1 brez potrditve naj bo v 4. krogu odmrznjen'; end if;
  -- P2 (potrjen): do 6 krogov, torej tudi 6. krog (5. zamrznjeni).
  if zamrznjena_odsotnost(p2, krogi[6]) is null then raise exception '1c. P2 s potrditvijo naj bo v 6. krogu zamrznjen'; end if;
  -- 1. krog je pred začetkom odsotnosti.
  if zamrznjena_odsotnost(p2, krogi[1]) is not null then raise exception '1g. krog pred začetkom odsotnosti ni zamrznjen'; end if;
  -- P3: vrnitev dan po 3. krogu; 4. krog (prvi po vrnitvi) še, 5. ne.
  if zamrznjena_odsotnost(p3, krogi[4]) is null then raise exception '1d. P3 naj bo v prvem krogu po vrnitvi še zamrznjen'; end if;
  if zamrznjena_odsotnost(p3, krogi[5]) is not null then raise exception '1e. P3 naj bo v drugem krogu po vrnitvi odmrznjen'; end if;
  -- P4: dopust ne zamrzne.
  if zamrznjena_odsotnost(p4, krogi[3]) is not null then raise exception '1f. dopust naj ne zamrzne cene'; end if;

  -- --- 2. borza: padec "ni igral" se zadrži --------------------------------
  for i in 1..5 loop
    perform recompute_round_scores(krogi[i]);
    perform preracunaj_cene(krogi[i]);
    perform uveljavi_cene(krogi[i]);
  end loop;
  -- Q pade v 3., 4. in 5. krogu (2. je prvi izpuščeni, brez padca).
  if (select count(*) from price_changes where player_id = q and round_id = any(krogi[3:5]) and new_value < old_value) <> 3 then
    raise exception '2a. Q brez odsotnosti naj pade v 3.–5. krogu (primerjava)';
  end if;
  -- P1: 3. krog zadržan, 4. in 5. pade.
  if exists (select 1 from price_changes where player_id = p1 and round_id = krogi[3] and new_value < old_value) then
    raise exception '2b. P1 v 3. krogu ne sme pasti';
  end if;
  if not exists (select 1 from zadrzani_padci where player_id = p1 and round_id = krogi[3] and znesek = -0.1) then
    raise exception '2c. zadržan padec P1 v 3. krogu naj bo zapisan';
  end if;
  if (select count(*) from price_changes where player_id = p1 and round_id = any(krogi[4:5]) and new_value < old_value) <> 2 then
    raise exception '2d. P1 naj pade v 4. in 5. krogu';
  end if;
  -- P2: nič ne pade, trije padci zadržani.
  if exists (select 1 from price_changes where player_id = p2 and round_id = any(krogi[2:5]) and new_value < old_value) then
    raise exception '2e. P2 s potrditvijo naj v 2.–5. krogu ne pade';
  end if;
  if (select count(*) from zadrzani_padci where player_id = p2) <> 3 then
    raise exception '2f. P2 naj ima tri zadržane padce, ima %', (select count(*) from zadrzani_padci where player_id = p2);
  end if;
  -- P4 (dopust) pade kot Q.
  if (select count(*) from price_changes where player_id = p4 and round_id = any(krogi[3:5]) and new_value < old_value) <> 3 then
    raise exception '2g. P4 (dopust) naj pade kot Q';
  end if;
  -- P5: brez potrditve največ 2 prihranjena padca v sezoni (kroženje).
  if (select count(*) from zadrzani_padci where player_id = p5) <> 2 then
    raise exception '2i. P5 brez potrditve naj v sezoni prihrani 2 padca, prihranil je %', (select count(*) from zadrzani_padci where player_id = p5);
  end if;
  if not exists (select 1 from price_changes where player_id = p5 and round_id = krogi[5] and new_value < old_value) then
    raise exception '2j. P5 naj v 5. krogu pade (omejitev v sezoni)';
  end if;
  -- Ponoven obračun ne podvoji zadržanih padcev.
  perform preracunaj_cene(krogi[4]);
  if (select count(*) from zadrzani_padci where player_id = p2) <> 3 then
    raise exception '2h. ponoven obračun ne sme podvojiti zadržanih padcev';
  end if;

  -- --- 3. ni držalo: zadržani padci se uveljavijo, enkrat -------------------
  select value into cena_p2 from players where id = p2;
  insert into appearances (match_id, player_id, team_id, started, minutes_played)
  values (tekme[6], p2, klub, false, 20);
  perform preveri_uradne_odsotnosti();
  if (select status from uradne_odsotnosti where player_id = p2) <> 'ni_drzalo' then
    raise exception '3a. P2 je igral med poškodbo: odsotnost naj bo ni_drzalo';
  end if;
  select cena_p2 - value into premik from players where id = p2;
  if premik <> 0.3 then
    raise exception '3b. P2 naj izgubi vsoto zadržanih padcev (0.3), izgubil je %', premik;
  end if;
  if zamrznjena_odsotnost(p2, krogi[6]) is not null then
    raise exception '3c. po ni_drzalo P2 ni več zamrznjen';
  end if;
  perform preveri_uradne_odsotnosti();
  if (select cena_p2 - value from players where id = p2) <> 0.3 then
    raise exception '3d. ponovna preverba ne sme znova odšteti';
  end if;
  -- Nočna borza znova obračuna kroge zadnjih 14 dni: kazen ostane, ni podvojena.
  -- Isto kot uveljavi_zapadle_cene (ta bere le vklopljene lige; testne lige
  -- ni mogoče vklopiti brez veljavnega kadra): krogi v oknu po vrsti.
  for i in 1..6 loop
    if dan_kroga(krogi[i]) >= current_date - 14 then
      perform uveljavi_cene(krogi[i]);
    end if;
  end loop;
  if (select cena_p2 - value from players where id = p2) <> 0.3 then
    raise exception '3e. po nočni borzi naj P2 ostane pri -0.3, je pri %', (select value - cena_p2 from players where id = p2);
  end if;
  if exists (select 1 from price_changes where player_id = p2 and new_value < old_value and round_id = any(krogi[2:5])) then
    raise exception '3g. zadržani krogi so obračunani: nočna borza jim ne sme dodati padca';
  end if;
  if not exists (select 1 from price_changes where player_id = p2 and new_value < old_value and round_id = krogi[6]) then
    raise exception '3f. kazen naj bo v zgodovini cene (zadnji krog)';
  end if;

  raise notice 'preizkus zamrznitve: vse trditve držijo (2/6 krogov, vrnitev + 1, dopust ne, zadržani padci, ni_drzalo enkrat)';
end $$;

rollback;
