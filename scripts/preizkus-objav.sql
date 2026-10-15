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
  raise notice 'preizkus objav: vse v redu';
end $$;

rollback;
