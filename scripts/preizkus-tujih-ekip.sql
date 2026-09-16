-- Preizkus pravil za tuje ekipe.
--
-- Dve trditvi, ki ju vmesnik ne more dokazati, ker sta v bazi:
--   a) tekoci kader tuje ekipe ni berljiv nikomur razen lastniku,
--   b) zaklenjena postava tuje ekipe je berljiva vsem.
-- Med njima je edina razlika rok kroga.
--
-- Poganja se proti LOKALNI bazi:
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-tujih-ekip.sql
--
-- Vse skupaj tece v transakciji, ki se na koncu zavrti nazaj, zato skripta
-- ne pusti sledi in jo je mogoce pognati kolikorkrat.
\set ON_ERROR_STOP on

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a1';
  b uuid := '00000000-0000-0000-0000-0000000000b1';
  ekipa_a bigint;
  ekipa_b bigint;
  tekmovanje bigint;
  krog bigint;
  kapetan bigint;
  namestnik bigint;
  poz text;
  potrebno int;
  tekma bigint;
  t numeric;
  zadnji_zaklenjen bigint;
  n int;
begin
  -- --- priprava ------------------------------------------------------------
  insert into auth.users (id, email, instance_id, aud, role)
  values (a, 'a@tuje', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
         (b, 'b@tuje', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;
  insert into profiles (id, display_name) values (a, 'A'), (b, 'B')
  on conflict (id) do nothing;

  select r.id, r.competition_id into krog, tekmovanje
    from rounds r
    join players p on p.competition_id = r.competition_id
   group by r.id, r.competition_id
   order by r.number
   limit 1;
  if krog is null then
    raise exception 'preizkus potrebuje krog v tekmovanju z igralci';
  end if;

  -- Rok je ze mimo: krog je zrel za zaklep.
  update rounds set deadline_at = now() - interval '1 day', lineups_locked_at = null
   where id = krog;

  -- Ekipa mora obstajati in biti shranjena PRED rokom, sicer je `zakleni_krog`
  -- namenoma preskoci — kdor je ekipo sestavil po roku, v tem krogu ne igra.
  insert into fantasy_teams (owner_id, name, competition_id, created_at, roster_updated_at)
  values (a, 'Ekipa A', tekmovanje, now() - interval '3 days', now() - interval '3 days')
  returning id into ekipa_a;
  insert into fantasy_teams (owner_id, name, competition_id, created_at, roster_updated_at)
  values (b, 'Ekipa B', tekmovanje, now() - interval '3 days', now() - interval '3 days')
  returning id into ekipa_b;

  -- Kader po pravilih: 2 GK, 5 DEF, 5 MID, 3 FWD, najvec trije iz istega
  -- kluba. Omejitev kluba ni kozmeticna: ce jo kader krsi, ga
  -- `roster_je_veljaven` zavrne, `zakleni_krog` zanj ne naredi posnetka in
  -- preizkus bi meril prazno ekipo namesto pravila o roku.
  create temp table izbor (
    player_id bigint, position text, team_id bigint, je_zacetnik boolean
  ) on commit drop;

  foreach poz in array array['GK', 'DEF', 'MID', 'FWD'] loop
    potrebno := case poz when 'GK' then 2 when 'DEF' then 5
                         when 'MID' then 5 else 3 end;
    while (select count(*) from izbor where position = poz) < potrebno loop
      -- Vedno iz kluba, ki je doslej prispeval najmanj igralcev.
      insert into izbor (player_id, position, team_id, je_zacetnik)
      select p.id, p.position, p.team_id, false
        from players p
       where p.competition_id = tekmovanje
         and p.active
         and p.position = poz
         and not exists (select 1 from izbor i where i.player_id = p.id)
         and (select count(*) from izbor i where i.team_id = p.team_id) < 3
       order by (select count(*) from izbor i where i.team_id = p.team_id), p.id
       limit 1;
      if not found then
        raise exception 'preizkus potrebuje vec igralcev na mestu %', poz;
      end if;
    end loop;
  end loop;

  -- Postava 1-4-4-2.
  update izbor set je_zacetnik = true
   where player_id in (
     select player_id from (
       select player_id, position,
              row_number() over (partition by position order by player_id) as rn
         from izbor
     ) r
      where r.rn <= case r.position when 'GK' then 1 when 'DEF' then 4
                                    when 'MID' then 4 else 2 end
   );

  insert into fantasy_roster (fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, buy_position)
  select ekipa_a, i.player_id, i.je_zacetnik, false, false,
         case when i.je_zacetnik then null
              else row_number() over (order by i.player_id) end,
         i.position
    from izbor i;

  -- Natanko en kapetan in natanko en namestnik, oba med zacetniki.
  select player_id into kapetan from fantasy_roster
   where fantasy_team_id = ekipa_a and is_starter order by player_id limit 1;
  select player_id into namestnik from fantasy_roster
   where fantasy_team_id = ekipa_a and is_starter and player_id <> kapetan
   order by player_id limit 1;
  update fantasy_roster set is_captain = true
   where fantasy_team_id = ekipa_a and player_id = kapetan;
  update fantasy_roster set is_vice = true
   where fantasy_team_id = ekipa_a and player_id = namestnik;

  select count(*) into n from fantasy_roster where fantasy_team_id = ekipa_a;
  if n <> 15 then
    raise exception '1. priprava: kader naj ima 15 igralcev, ima %', n;
  end if;
  if not roster_je_veljaven(ekipa_a) then
    raise exception '1. priprava: kader ni veljaven, zato posnetka ne bo';
  end if;

  -- Posnetek vpisemo ROCNO, se preden je krog zaklenjen. Brez tega bi
  -- trditvi 2 in 3 veljali same od sebe — `tuja_postava` ne bi vrnila
  -- nicesar ze zato, ker vrstic ni, in ne zaradi zaklepa. Tako pa preverjata
  -- prav pogoj o zaklepu.
  insert into fantasy_lineups (round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order)
  select krog, ekipa_a, fr.player_id, fr.is_starter, fr.is_captain, fr.is_vice, fr.bench_order
    from fantasy_roster fr where fr.fantasy_team_id = ekipa_a;

  -- --- 2. pred rokom tuje postave ni ---------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from tuja_postava(ekipa_a, krog);
  execute 'set local role postgres';
  if n <> 0 then
    raise exception '2. pred zaklepom naj tuja postava ne vrne nicesar, vrnila je %', n;
  end if;

  -- --- 3. tudi lastniku ne, dokler ni zaklenjeno ---------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from tuja_postava(ekipa_a, krog);
  execute 'set local role postgres';
  if n <> 0 then
    raise exception '3. nezaklenjen krog naj bo prazen tudi za lastnika, vrnil je %', n;
  end if;

  -- Posnetek pospravimo: naprej naj ga naredi `zakleni_krog` sam.
  delete from fantasy_lineups where round_id = krog and fantasy_team_id = ekipa_a;

  -- --- 4. tekocega kadra tujec ne prebere ----------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from fantasy_roster where fantasy_team_id = ekipa_a;
  execute 'set local role postgres';
  if n <> 0 then
    raise exception '4. tujec naj ne bere tekocega kadra, prebral je % vrstic', n;
  end if;

  -- --- 5. lastnik svojega prebere ------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from fantasy_roster where fantasy_team_id = ekipa_a;
  execute 'set local role postgres';
  if n <> 15 then
    raise exception '5. lastnik naj bere svoj kader (15), prebral je %', n;
  end if;

  -- --- 6. neprijavljen ne prebere nicesar ----------------------------------
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from fantasy_roster;
  execute 'set local role postgres';
  if n <> 0 then
    raise exception '6. anonimni naj ne bere kadrov, prebral je % vrstic', n;
  end if;

  -- --- 6b. tudi obvoz prek `postava_kroga` ne izda tekocega kadra ----------
  -- `postava_kroga` je starejsa pomozna funkcija: dokler posnetka se ni in
  -- rok se ni potekel, vrne ZIVI kader iz `fantasy_roster`. Zato mora ta
  -- trditev stati PRED zaklepom — potem prva veja vrne posnetek, ki je javen
  -- tako ali tako, in preizkus ne bi meril tistega, kar misli, da meri. Tece s pravicami klicatelja
  -- in je javna, zato je bila pred zaostritvijo RLS druga pot do tuje ekipe —
  -- mimo politike in mimo `tuja_postava`.
  update rounds set deadline_at = now() + interval '2 days' where id = krog;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from postava_kroga(ekipa_a, krog);
  execute 'set local role postgres';
  if n <> 0 then
    raise exception '6b. postava_kroga naj tujcu ne izda kadra, izdala je % vrstic', n;
  end if;

  -- Lastniku pa jo se vedno vrne — funkcija mora ostati uporabna.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from postava_kroga(ekipa_a, krog);
  execute 'set local role postgres';
  if n = 0 then
    raise exception '6b. postava_kroga naj lastniku vrne njegov kader, vrnila je 0';
  end if;

  update rounds set deadline_at = now() - interval '1 day' where id = krog;


  -- --- 7. po zaklepu je tuja postava vidna ---------------------------------
  -- Kapetan tudi odigra tekmo: mnozitelj pripada tistemu, ki je igral, in
  -- brez nastopa bi kapetanstvo preslo na namestnika.
  insert into matches (round_id, home_team_id, away_team_id, home_goals, away_goals, played_on)
  select krog, p.team_id, t.id, 1, 0, current_date - 1
    from players p
    join teams t on t.id <> p.team_id
   where p.id = kapetan
   limit 1
  returning id into tekma;

  insert into appearances (match_id, player_id, team_id, started, minutes_played, goals)
  select tekma, kapetan, p.team_id, true, 90, 1 from players p where p.id = kapetan;

  perform recompute_round_scores(krog);

  perform zakleni_krog(krog);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from tuja_postava(ekipa_a, krog);
  execute 'set local role postgres';
  if n <> 15 then
    raise exception '7. po zaklepu naj tujec vidi 15 igralcev, videl je %', n;
  end if;

  -- --- 8. vidi jo tudi neprijavljen ----------------------------------------
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from tuja_postava(ekipa_a, krog);
  execute 'set local role postgres';
  if n <> 15 then
    raise exception '8. po zaklepu naj tudi anonimni vidi postavo, videl je %', n;
  end if;

  -- --- 9. v postavi je enajst igralcev, kapetan steje dvojno ---------------
  select count(*) into n from tuja_postava(ekipa_a, krog) where mnozitelj > 0;
  if n <> 11 then
    raise exception '9. v ucinkoviti postavi naj bo 11 igralcev, jih je %', n;
  end if;

  select mnozitelj into n from tuja_postava(ekipa_a, krog) where je_kapetan;
  if n <> 3 then
    raise exception '9. kapetan naj steje trojno, steje %', n;
  end if;

  -- --- 10. tekoci kader ostane skrit tudi po zaklepu ------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from fantasy_roster where fantasy_team_id = ekipa_a;
  execute 'set local role postgres';
  if n <> 0 then
    raise exception '10. zaklep kroga naj ne odpre tekocega kadra, odprl je % vrstic', n;
  end if;

  -- --- 10b. izbranost ne izda zivega kadra --------------------------------
  -- `player_standings.owners` je stel vrstice v `fantasy_roster`. V majhni
  -- ligi to tujo ekipo izda v celoti, pogled pa tece s pravicami lastnika in
  -- RLS obide, zato ga zaostritev politike ne zadeva.
  --
  -- Pogled steje posnetek ZADNJEGA zaklenjenega kroga lige, ne kroga iz tega
  -- preizkusa — v uvozenem okolju jih je zaklenjenih vec.
  select r.id into zadnji_zaklenjen
    from rounds r
   where r.competition_id = tekmovanje and r.lineups_locked_at is not null
   order by r.season desc, r.number desc
   limit 1;

  select count(*) into n
    from fantasy_lineups fl
    join player_standings ps on ps.id = fl.player_id
   where fl.round_id = zadnji_zaklenjen
     and coalesce(ps.owners, 0) = 0;
  if n > 0 then
    raise exception '10b. igralci iz zadnjega zaklenjenega kroga naj steti v izbranost, brez nje jih je %', n;
  end if;

  -- Ko zaklenjenega kroga ni, izbranost ni nic, ampak se ne vemo.
  create temp table zaklepi on commit drop as
    select id, lineups_locked_at from rounds where competition_id = tekmovanje;
  update rounds set lineups_locked_at = null where competition_id = tekmovanje;
  select count(*) into n from player_standings ps
   where ps.competition_id = tekmovanje and ps.owners is not null;
  update rounds r set lineups_locked_at = z.lineups_locked_at
    from zaklepi z where z.id = r.id;
  if n > 0 then
    raise exception '10b. brez zaklenjenega kroga naj izbranost ne bo znana, znana je pri % igralcih', n;
  end if;

  -- --- 11. postava nosi tocke, ne le imen ---------------------------------
  select tocke into t from tuja_postava(ekipa_a, krog) where player_id = kapetan;
  if t is null or t <= 0 then
    raise exception '11. kapetan z golom in 90 minutami naj ima tocke, ima %', t;
  end if;

  raise notice 'preizkus tujih ekip: vse trditve drzijo';
end $$;

rollback;
