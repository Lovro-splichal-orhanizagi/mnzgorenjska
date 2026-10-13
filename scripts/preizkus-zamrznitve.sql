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
  q bigint; p1 bigint; p2 bigint; p3 bigint; p4 bigint;
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
  select c.id, max(r.season) into tekmovanje, sezona
    from competitions c join rounds r on r.competition_id = c.id
    join players p on p.competition_id = c.id
   group by c.id order by count(distinct p.id) desc limit 1;

  -- Klub s vsaj šestimi igralci z znano pozicijo in prostorom navzdol.
  select p.team_id into klub from players p
   where p.competition_id = tekmovanje and not p.value_locked and p.position is not null
   group by p.team_id having count(*) >= 6 order by p.team_id limit 1;
  select t2.id into nasprotnik from teams t2
    join players p on p.team_id = t2.id and p.competition_id = tekmovanje
   where t2.id <> klub group by t2.id order by t2.id limit 1;
  if klub is null or nasprotnik is null then
    raise exception 'preizkus potrebuje klub s šestimi igralci in nasprotnika';
  end if;
  select array_agg(id order by id) into igralci from (
    select p.id from players p
     where p.team_id = klub and p.competition_id = tekmovanje and not p.value_locked
       and p.position is not null
     order by p.id limit 6) x;
  -- Cena s prostorom navzdol (lokalni podatki imajo pogosto spodnjo mejo).
  update players set value = 7.0, value_start = 7.0 where id = any(igralci);
  igralec_tekme := igralci[1]; q := igralci[2]; p1 := igralci[3]; p2 := igralci[4]; p3 := igralci[5]; p4 := igralci[6];

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

  raise notice 'preizkus zamrznitve: vse trditve držijo (2/6 krogov, vrnitev + 1, dopust ne, zadržani padci, ni_drzalo enkrat)';
end $$;

rollback;
