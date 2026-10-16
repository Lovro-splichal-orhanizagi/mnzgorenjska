-- Preizkus dejstev za objave (migracija 20261015130100): kaj NE sme v objavo.
--
-- Lastna država ZZ z aktivno člansko, aktivno mladinsko (U19) in neaktivno
-- ligo. V članski ligi je najboljši igralec kroga anonimiziran (s
-- hat-trickom), šest hišnih ekip izbere kapetana A, pet človeških pa B (4×) in
-- C (1×). Pričakovano: le članska liga, brez anonimiziranega, kapetan B.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-objav.sql
\set ON_ERROR_STOP on

begin;

-- Vklop lige zahteva pravi cenik; preizkus ga ne potrebuje (ROLLBACK na koncu).
alter table competitions disable trigger varovalo_vklopa_lige;

do $$
declare
  drzava bigint;
  liga bigint;
  ligaU19 bigint;
  ligaNeaktivna bigint;
  l bigint;
  k bigint;
  t bigint;
  krogi bigint[] := '{}';
  u uuid;
  ekipa bigint;
  d jsonb;
  i int;
begin
  insert into countries(code, name) values ('ZZ', 'Preizkus objav') returning id into drzava;
  insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value values
    (-924001, 'test-objave', 'Test objav', 'TO', true, drzava, 'mnzg'),
    (-924002, 'test-objave-u19', 'Test objav U19', 'TOU', true, drzava, 'mnzg'),
    (-924003, 'test-objave-off', 'Test objav izklop', 'TOX', false, drzava, 'mnzg');
  liga := -924001; ligaU19 := -924002; ligaNeaktivna := -924003;
  insert into teams(id, name, short_name, country_id) overriding system value
  values (-924001, 'Objave domači', 'OD', drzava), (-924002, 'Objave gostje', 'OG', drzava);

  -- Igralci: v vsaki ligi -924x01 (anonimiziran v članski), x02 A, x03 B, x04 C.
  foreach l in array array[liga, ligaU19, ligaNeaktivna] loop
    insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
    select l * 1000 - n, -924001, l, 'O', n::text, 'Objava' || l || ' ' || n,
           case n when 1 then 'FWD' when 2 then 'GK' else 'MID' end, 'admin', 6.0, 6.0, true
      from generate_series(1, 4) n;
    insert into rounds (competition_id, season, number, deadline_at, played_on)
    values (l, tekoca_sezona(), 1, now() - interval '3 days', current_date - 2) returning id into k;
    krogi := krogi || k;
    insert into matches (round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at)
    values (k, -924001, -924002, 3, 0, current_date - 2, now()) returning id into t;
    insert into appearances (match_id, player_id, team_id, started, minutes_played, goals)
    select t, l * 1000 - n, -924001, true, 90, case n when 1 then 3 else 0 end from generate_series(1, 4) n;
    insert into player_scores(player_id, round_id, points)
    select l * 1000 - n, k, case n when 1 then 20 else 1 end from generate_series(1, 4) n;
  end loop;
  update players set anonimiziran_at = now(), anonimiziran_razlog = 'ugovor' where id = liga * 1000 - 1;

  -- Kapetani prvega kroga članske lige.
  u := 'a3a10000-0000-4000-8000-000000000000';
  insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at)
  values (u, 'objave-hisa@example.invalid', now(), '{}', now());
  for i in 1..6 loop
    insert into fantasy_teams(owner_id, competition_id, name, hisna) values (u, liga, 'Hiša ' || i, true) returning id into ekipa;
    insert into fantasy_lineups(fantasy_team_id, round_id, player_id, is_starter, is_captain, is_vice)
    values (ekipa, krogi[1], liga * 1000 - 2, true, true, false);
  end loop;
  for i in 1..5 loop
    u := ('a3a10000-0000-4000-8000-00000000000' || i)::uuid;
    insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at)
    values (u, 'objave' || i || '@example.invalid', now(), '{}', now());
    insert into fantasy_teams(owner_id, competition_id, name) values (u, liga, 'Človek ' || i) returning id into ekipa;
    insert into fantasy_lineups(fantasy_team_id, round_id, player_id, is_starter, is_captain, is_vice)
    values (ekipa, krogi[1], liga * 1000 - case when i = 5 then 4 else 3 end, true, true, false);
  end loop;

  d := objava_dejstva('ZZ', current_date - 7, current_date + 1);

  -- 1. Le aktivna članska liga.
  if jsonb_array_length(d -> 'lige') <> 1 or d -> 'lige' -> 0 ->> 'slug' <> 'test-objave' then
    raise exception '1. v dejstvih naj bo le aktivna članska liga, so: %', d -> 'lige';
  end if;
  -- 2. Anonimiziran igralec nikjer (ne igralec kroga, ne enajsterica, ne hat-trick).
  if position('Objava-924001 1' in d::text) > 0 then
    raise exception '2. anonimiziran igralec je v dejstvih: %', d;
  end if;
  if jsonb_array_length(d -> 'lige' -> 0 -> 'hattrick') <> 0 then
    raise exception '2b. hat-trick anonimiziranega naj ne bo v dejstvih';
  end if;
  -- 3. Kapetan: šteje le človeške ekipe (B, 4 od 5 = 80 %).
  if d -> 'lige' -> 0 -> 'kapetan_spodrsljaj' ->> 'ime' <> 'Objava-924001 3'
     or (d -> 'lige' -> 0 -> 'kapetan_spodrsljaj' ->> 'delez')::numeric <> 80 then
    raise exception '3. kapetan naj bo B iz človeških ekip, je: %', d -> 'lige' -> 0 -> 'kapetan_spodrsljaj';
  end if;
  -- 4. Hišne ekipe ne štejejo med ekipe lige.
  if (d -> 'lige' -> 0 ->> 'ekip')::int <> 5 then
    raise exception '4. ekip naj bo 5 (brez hišnih), je %', d -> 'lige' -> 0 ->> 'ekip';
  end if;
  -- 5. Pravice: dejstva in tabela servisna, ustavitev z žetonom tudi anon (faza 2).
  if has_function_privilege('anon', 'objava_dejstva(text, date, date)', 'execute')
     or not has_function_privilege('anon', 'ustavi_objavo(text)', 'execute')
     or has_table_privilege('anon', 'objave', 'select') then
    raise exception '5. objave in dejstva naj bodo le servisna, ustavitev anon';
  end if;
  -- 6. Ustavi objavo: le pravi žeton, le enkrat, le pred rokom, le neobjavljen osnutek.
  insert into objave (slot, teden, jezik, dejstva, napis, objava_ob, ustavi_zeton_hash) values
    ('pon', '1999-01-04', 'sl', '{}', 'x', now() + interval '1 hour', encode(sha256(convert_to('zeton-a', 'UTF8')), 'hex')),
    ('cet', '1999-01-04', 'en', '{}', 'x', now() - interval '1 minute', encode(sha256(convert_to('zeton-b', 'UTF8')), 'hex')),
    ('pon', '1999-01-11', 'sl', '{}', 'x', now() + interval '1 hour', encode(sha256(convert_to('zeton-c', 'UTF8')), 'hex'));
  update objave set stanje = 'objavljanje' where teden = '1999-01-11';
  set local role anon;
  if ustavi_objavo('napacen') or not ustavi_objavo('zeton-a') or ustavi_objavo('zeton-a')
     or ustavi_objavo('zeton-b') or ustavi_objavo('zeton-c') then
    raise exception '6. ustavi_objavo: napačen izid';
  end if;
  reset role;
  if (select stanje from objave where teden = '1999-01-04' and slot = 'pon') <> 'ustavljeno' then
    raise exception '6. osnutek naj bo ustavljen';
  end if;
  -- 7. Mejnik: dejstva servisna, uporabniki brez hišnega profila, ekipe brez hišnih;
  --    vsak mejnik enkrat, dva mejnika v istem tednu gresta, pon/cet še vedno enkrat na teden.
  d := objava_mejnik_dejstva();
  if (d ->> 'uporabnikov')::int <> skupaj_uporabnikov()
     or (d ->> 'ekip')::int <> (select count(*) from fantasy_teams where not hisna)
     or (d ->> 'drzav')::int < 1 or (d ->> 'lig')::int < 1
     or has_function_privilege('anon', 'objava_mejnik_dejstva()', 'execute')
     or has_function_privilege('authenticated', 'objava_mejnik_dejstva()', 'execute') then
    raise exception '7. objava_mejnik_dejstva: %', d;
  end if;
  insert into objave (slot, teden, mejnik, jezik, dejstva, napis, objava_ob) values
    ('mejnik', '1999-01-04', 1000, 'en', '{}', 'x', now()),
    ('mejnik', '1999-01-04', 2000, 'en', '{}', 'x', now());
  begin
    insert into objave (slot, teden, mejnik, jezik, dejstva, napis, objava_ob) values ('mejnik', '1999-02-01', 1000, 'en', '{}', 'x', now());
    raise exception '7. isti mejnik dvakrat';
  exception when unique_violation then null;
  end;
  begin
    insert into objave (slot, teden, jezik, dejstva, napis, objava_ob) values ('mejnik', '1999-02-01', 'en', '{}', 'x', now());
    raise exception '7. mejnik brez številke';
  exception when check_violation then null;
  end;
  begin
    insert into objave (slot, teden, jezik, dejstva, napis, objava_ob) values ('pon', '1999-01-04', 'en', '{}', 'x', now());
    raise exception '7. pon dvakrat v tednu';
  exception when unique_violation then null;
  end;
  -- 8.–9. Ponedeljek po državah in četrtkovi dosežki (migracija 20261015230100).
  --   Okno je leta 2099, da resnični podatki lokalne baze ne motijo. Država ZY:
  --   liga A (uvožena tekma v oknu; P1 3 goli 10 t, P2 vratar z golom 8 t,
  --   P3 7 t, P4 anonimiziran 30 t; štirje prejšnji krogi do 9 t), liga B (tekma
  --   v oknu brez zapisnika, 25 t), liga C U19 (40 t), liga D (le kontumacija,
  --   50 t). Država ZX: vse uvoženo, a največ 5 t. ZZ (zgoraj) je v 2099 brez tekem.
  insert into countries(code, name) values ('ZY', 'Preizkus ZY') returning id into drzava;
  insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value values
    (-924011, 'test-zy-a', 'Test ZY A', 'ZYA', true, drzava, 'mnzg'),
    (-924012, 'test-zy-b', 'Test ZY B', 'ZYB', true, drzava, 'mnzg'),
    (-924013, 'test-zy-u19', 'Test ZY U19', 'ZYU', true, drzava, 'mnzg'),
    (-924014, 'test-zy-d', 'Test ZY D', 'ZYD', true, drzava, 'mnzg');
  insert into countries(code, name) values ('ZX', 'Preizkus ZX') returning id into drzava;
  insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
  values (-924015, 'test-zx', 'Test ZX', 'ZXA', true, drzava, 'mnzg');
  foreach l in array array[-924011, -924012, -924013, -924014, -924015]::bigint[] loop
    insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
    select l * 1000 - n, -924001, l, 'O', n::text, 'Dosezek' || l || ' ' || n,
           case n when 2 then 'GK' else 'MID' end, 'admin', 5.0, 5.0, true
      from generate_series(1, 4) n;
    insert into rounds (competition_id, season, number, deadline_at, played_on)
    values (l, '2098/99', 5, '2099-01-02', '2099-01-03') returning id into k;
    insert into matches (round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at, kontumacija)
    values (k, -924001, -924002, 4, 0, '2099-01-03',
            case when l = -924012 then null else now() end, l = -924014) returning id into t;
    insert into appearances (match_id, player_id, team_id, started, minutes_played, goals, clean_sheet, is_goalkeeper)
    select t, l * 1000 - n, -924001, true, 90, case n when 1 then 3 when 2 then 1 else 0 end, true, n = 2
      from generate_series(1, 4) n;
    insert into player_scores(player_id, round_id, points)
    select l * 1000 - n, k,
           case l when -924011 then (array[10, 8, 7, 30])[n] when -924012 then 25 when -924013 then 40
                  when -924014 then 50 else 5 end
      from generate_series(1, 4) n
    on conflict (round_id, player_id) do update set points = excluded.points;
    if l = -924011 then
      krogi := array[k];
      -- Štirje prejšnji krogi (do 9 t) in dve prejšnji čisti mreži vratarja P2.
      for i in 1..4 loop
        insert into rounds (competition_id, season, number, deadline_at, played_on)
        values (l, '2098/99', i, '2098-12-01'::date + i * 7, '2098-12-02'::date + i * 7) returning id into k;
        insert into matches (round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at)
        values (k, -924001, -924002, 1, 0, '2098-12-02'::date + i * 7, now()) returning id into t;
        insert into appearances (match_id, player_id, team_id, started, minutes_played, goals, clean_sheet, is_goalkeeper)
        values (t, l * 1000 - 2, -924001, true, 90, 0, i >= 3, true);
        insert into player_scores(player_id, round_id, points) values (l * 1000 - 3, k, 9)
        on conflict (round_id, player_id) do update set points = 9;
      end loop;
      insert into price_changes (player_id, round_id, old_value, new_value, form) values
        (l * 1000 - 3, krogi[1], 5.0, 5.6, 0), (l * 1000 - 1, krogi[1], 6.0, 5.2, 0), (l * 1000 - 4, krogi[1], 5.0, 9.0, 0)
      on conflict (player_id, round_id) do update set old_value = excluded.old_value, new_value = excluded.new_value;
    end if;
  end loop;
  update players set anonimiziran_at = now(), anonimiziran_razlog = 'ugovor' where id = -924011 * 1000 - 4;

  -- Skupnost: človek (77 t, račun iz okna) in hišna ekipa (99 t).
  u := 'a3a10000-0000-4000-8000-0000000000e1';
  insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at)
  values (u, 'objave-zy@example.invalid', now(), '{}', now());
  update profiles set created_at = '2099-01-04', display_name = 'Skrivni Upravitelj' where id = u;
  insert into fantasy_teams(owner_id, competition_id, name) values (u, -924011, 'Skrivna Ekipa') returning id into ekipa;
  insert into tocke_krogov(fantasy_team_id, round_id, points, transfers, penalty) values (ekipa, krogi[1], 77, 0, 0)
  on conflict (fantasy_team_id, round_id) do update set points = 77;
  insert into fantasy_teams(owner_id, competition_id, name, hisna) values ('a3a10000-0000-4000-8000-000000000000', -924011, 'Hiša ZY', true)
  returning id into ekipa;
  insert into tocke_krogov(fantasy_team_id, round_id, points, transfers, penalty) values (ekipa, krogi[1], 99, 0, 0)
  on conflict (fantasy_team_id, round_id) do update set points = 99;
  update profiles set created_at = '2099-01-04' where id = 'a3a10000-0000-4000-8000-000000000000';

  d := objava_drzave('2099-01-01', '2099-01-08');
  -- 8. Ponedeljek: le ZY (ZX pod šest točk, ZZ brez tekem), trije igralci, brez izločenih.
  if jsonb_path_query_array(d, '$.drzave[*].drzava') <> '["ZY"]'::jsonb
     or jsonb_path_query_array(d, '$.drzave[0].igralci[*].ime') <> '["Dosezek-924011 1", "Dosezek-924011 2", "Dosezek-924011 3"]'::jsonb
     or (d #>> '{drzave,0,igralci,0,tocke}')::numeric <> 10 or (d #>> '{drzave,0,igralci,0,goli}')::int <> 3
     or (d #>> '{drzave,0,lig}')::int <> 1 or (d #>> '{drzave,0,uporabnikov}')::int <> 1 then
    raise exception '8. objava_drzave: %', d;
  end if;
  if d::text ~ 'Dosezek-92401[2-5]|Dosezek-924011 4' then
    raise exception '8b. brez zapisnika, U19, kontumacija ali anonimiziran v dejstvih: %', d;
  end if;

  d := objava_dosezki('2099-01-01', '2099-01-08');
  -- 9. Četrtek: vsaka kategorija, le iz uvoženih tekem, skupnost anonimna.
  if not d -> 'hattrick' @> '[{"ime": "Dosezek-924011 1", "goli": 3}]' or jsonb_array_length(d -> 'hattrick') <> 2
     or not d -> 'vratar_gol' @> '[{"ime": "Dosezek-924011 2"}]' or jsonb_array_length(d -> 'vratar_gol') <> 2
     or d #>> '{najvec_tock,0,ime}' <> 'Dosezek-924011 1' or (d #>> '{najvec_tock,0,tocke}')::numeric <> 10
     or d #>> '{rekord_lige,0,ime}' <> 'Dosezek-924011 1' or (d #>> '{rekord_lige,0,prej}')::numeric <> 9
     or d #>> '{skok,0,ime}' <> 'Dosezek-924011 3'
     or d #>> '{cista_mreza,0,ime}' <> 'Dosezek-924011 2' or (d #>> '{cista_mreza,0,niz}')::int <> 3
     or (d #>> '{manager_tedna,tocke}')::numeric <> 77 or d #>> '{manager_tedna,drzava}' <> 'ZY'
     or (d ->> 'novih_upraviteljev')::int <> 1 then
    raise exception '9. objava_dosezki: %', d;
  end if;
  -- ZX ima hat-trick in vratarja (5 t) — dosežek je dosežek; izločeni nikoli.
  if d::text ~ 'Dosezek-92401[2-4]|Dosezek-924011 4' then
    raise exception '9b. brez zapisnika, U19, kontumacija ali anonimiziran v dosežkih: %', d;
  end if;
  if d::text ~* 'skrivn|hiša|človek|@|objave-zy' then
    raise exception '9c. ime uporabnika ali ekipe v dosežkih: %', d;
  end if;
  if has_function_privilege('anon', 'objava_drzave(date, date)', 'execute')
     or has_function_privilege('authenticated', 'objava_dosezki(date, date)', 'execute') then
    raise exception '9d. objava_drzave in objava_dosezki naj bosta le servisni';
  end if;

  -- 10. Objave vsak dan (migracija 20261016090000). Liga A dobi tretji klub
  --     (tri tekme 0:0 v krogih 1–3) in neodigrano tekmo 6. kroga (2099-01-10).
  if exists (select 1 from objava_lige where slug in ('test-zy-u19', 'test-objave-off'))
     or not exists (select 1 from objava_lige where slug = 'test-zy-a') then
    raise exception '10a. objava_lige: le aktivne članske lige';
  end if;
  insert into teams(id, name, short_name, country_id) overriding system value values (-924003, 'Objave tretji', 'OT', drzava);
  insert into matches (round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at)
  select r.id, -924003, -924002, 0, 0, r.played_on, now() from rounds r where r.competition_id = -924011 and r.number <= 3;
  insert into rounds (competition_id, season, number, deadline_at, played_on) values (-924011, '2098/99', 6, '2099-01-09', '2099-01-10')
  returning id into k;
  insert into matches (round_id, home_team_id, away_team_id, played_on) values (k, -924002, -924001, '2099-01-10');

  d := objava_ekipa_tedna('2099-01-01', '2099-01-08');
  if not d -> 'igralci' @> '[{"ime": "Dosezek-924011 1", "pozicija": "MID", "tocke": 10}, {"ime": "Dosezek-924011 2", "pozicija": "GK"}]'
     or d::text ~ 'Dosezek-92401[2-4]|Dosezek-924011 4' then
    raise exception '10b. objava_ekipa_tedna: %', d;
  end if;
  d := objava_strelci('2099-01-08');
  if d #>> '{igralci,0,ime}' not in ('Dosezek-924011 1', 'Dosezek-924015 1') or (d #>> '{igralci,0,goli}')::int <> 3
     or d::text ~ 'Dosezek-92401[2-4]|Dosezek-924011 4' then
    raise exception '10c. objava_strelci: %', d;
  end if;
  d := objava_forma('2099-01-08');
  if d #>> '{igralci,0,ime}' <> 'Dosezek-924011 3' or (d #>> '{igralci,0,tocke}')::numeric <> 25
     or d::text ~ 'Dosezek-92401[2-5]|Dosezek-924011 4' then
    raise exception '10d. objava_forma (tri krogi, le uvoženi, brez izločenih): %', d;
  end if;
  d := objava_cene('2099-01-01', '2099-01-08');
  if jsonb_path_query_array(d, '$.igralci[*].ime') <> '["Dosezek-924011 3"]'::jsonb then
    raise exception '10e. objava_cene: le dvig, brez anonimiziranega: %', d;
  end if;
  d := objava_stat('2099-01-01', '2099-01-08');
  if (d ->> 'tekem')::int <> 2 or (d ->> 'golov')::int <> 8 or (d ->> 'lig')::int <> 2 or (d ->> 'drzav')::int <> 2
     or d -> 'tekma' <> 'null'::jsonb then
    raise exception '10f. objava_stat (le uvožene, brez U19 in kontumacij): %', d;
  end if;
  d := objava_obramba('2099-01-08');
  if d #>> '{ekipe,0,ime}' <> 'Objave domači' or (d #>> '{ekipe,0,prejeti}')::int <> 0
     or jsonb_path_query_array(d, '$.vratarji[*].ime') <> '["Dosezek-924011 2"]'::jsonb
     or (d #>> '{vratarji,0,ciste}')::int <> 3 then
    raise exception '10g. objava_obramba: %', d;
  end if;
  d := objava_tekme('2099-01-09', '2099-01-12');
  if jsonb_array_length(d -> 'tekme') <> 1 or d #>> '{tekme,0,domaci,ime}' <> 'Objave gostje'
     or (d #>> '{tekme,0,gostje,mesto}')::int <> 1 then
    raise exception '10h. objava_tekme: %', d;
  end if;
  d := objava_liga('2099-01-01', '2099-01-08');
  if d #>> '{liga,slug}' <> 'test-zy-a' or (d #>> '{liga,upraviteljev}')::int <> 1 or jsonb_array_length(d #> '{liga,lestvica}') <> 3
     or d #>> '{liga,strelec,ime}' <> 'Dosezek-924011 1' or d::text ~* 'skrivn|hiša|@'
     or objava_liga('2099-01-01', '2099-01-08', '{test-zy-a}') -> 'liga' <> 'null'::jsonb then
    raise exception '10i. objava_liga (upravitelji brez hišnih, izključitev): %', d;
  end if;
  d := objava_drzava('2099-01-01', '2099-01-08');
  if d #>> '{drzava,drzava}' <> 'ZY' or (d #>> '{drzava,aktivnih_lig}')::int <> 3 or (d #>> '{drzava,ekip}')::int <> 1
     or objava_drzava('2099-01-01', '2099-01-08', '{ZY}') -> 'drzava' <> 'null'::jsonb then
    raise exception '10j. objava_drzava: %', d;
  end if;
  if has_function_privilege('anon', 'objava_ekipa_tedna(date, date)', 'execute')
     or has_function_privilege('authenticated', 'objava_liga(date, date, text[])', 'execute')
     or has_function_privilege('anon', 'objava_tekme(date, date)', 'execute')
     or has_table_privilege('authenticated', 'objava_lige', 'select') or has_table_privilege('anon', 'objava_lige', 'select') then
    raise exception '10k. nove funkcije objav naj bodo le servisne';
  end if;
  insert into objave (slot, teden, vrsta, jezik, dejstva, napis, objava_ob) values ('tor', '1999-01-05', 'ekipa', 'en', '{}', 'x', now());
  raise notice 'preizkus objav: vse v redu';
end $$;

rollback;
