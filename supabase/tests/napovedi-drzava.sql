-- Lestvica napovedi države (20261110120100): seštevek vseh aktivnih lig
-- države, le lastniki nehišnih ekip v ligi tekme, le tekoča sezona,
-- kontumacija ne šteje, neaktivna liga in druga država ne štejeta, krone
-- enake kot `kralji_krogov_lige`, pogled zadnjih 7 dni, vrh in lastna vrstica,
-- brez user_id, odprta tudi neprijavljenim.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

-- a: ekipi v obeh ligah ZZ; b: le liga 1 (napoved v ligi 2 ne šteje);
-- c: liga 1, lanska sezona ne šteje; h: le hišna; d: neaktivna liga;
-- e: liga druge države.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000d20a', 'drzava-a@test.invalid'),
  ('00000000-0000-0000-0000-00000000d20b', 'drzava-b@test.invalid'),
  ('00000000-0000-0000-0000-00000000d20c', 'drzava-c@test.invalid'),
  ('00000000-0000-0000-0000-00000000d20d', 'drzava-d@test.invalid'),
  ('00000000-0000-0000-0000-00000000d20e', 'drzava-e@test.invalid'),
  ('00000000-0000-0000-0000-00000000d20f', 'drzava-h@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000d20a', 'drzava-a'),
  ('00000000-0000-0000-0000-00000000d20b', 'drzava-b'),
  ('00000000-0000-0000-0000-00000000d20c', 'drzava-c'),
  ('00000000-0000-0000-0000-00000000d20d', 'drzava-d'),
  ('00000000-0000-0000-0000-00000000d20e', 'drzava-e'),
  ('00000000-0000-0000-0000-00000000d20f', 'drzava-h')
on conflict (id) do nothing;

insert into countries (id, code, name) overriding system value values
  (991200, 'ZZ', 'Testna drzava'), (991209, 'ZY', 'Druga testna drzava');
-- Testna liga nima igralcev in cenika; varovalo vklopa tu ne velja.
alter table public.competitions disable trigger varovalo_vklopa_lige;
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value values
  (991201, 'zz-test-napovedi-1', 'ZZ liga 1', 'Z1', true, 991200, 'test'),
  (991202, 'zz-test-napovedi-2', 'ZZ liga 2', 'Z2', true, 991200, 'test'),
  (991203, 'zz-test-napovedi-3', 'ZZ neaktivna', 'Z3', false, 991200, 'test'),
  (991204, 'zy-test-napovedi-1', 'ZY liga', 'Y1', true, 991209, 'test');
alter table public.competitions enable trigger varovalo_vklopa_lige;
insert into teams (id, name, country_id) overriding system value values
  (991211, 'NK Drzava Ena', 991200), (991212, 'NK Drzava Dva', 991200),
  (991213, 'NK Drzava Tri', 991200), (991214, 'NK Drzava Stiri', 991200);
-- Liga 1: krog 1 pred 20 dnevi, krog 2 pred dvema (v oknu 7 dni), lanski krog.
insert into rounds (id, season, number, deadline_at, played_on, competition_id) overriding system value values
  (991221, sezona_lige(991201), 1, now() - interval '20 days', current_date - 20, 991201),
  (991222, sezona_lige(991201), 2, now() - interval '3 days', current_date - 2, 991201),
  (991223, '2000/01', 1, now() - interval '400 days', current_date - 400, 991201),
  (991224, sezona_lige(991202), 1, now() - interval '20 days', current_date - 20, 991202),
  (991225, sezona_lige(991203), 1, now() - interval '20 days', current_date - 20, 991203),
  (991226, sezona_lige(991204), 1, now() - interval '20 days', current_date - 20, 991204);
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, kontumacija, played_on, imported_at)
overriding system value values
  (991231, 991221, 991211, 991212, 2, 1, false, current_date - 20, now()),
  (991232, 991221, 991213, 991214, 0, 0, false, current_date - 20, now()),
  (991233, 991221, 991211, 991213, 3, 0, true,  current_date - 20, null),  -- kontumacija
  (991234, 991222, 991211, 991213, 1, 1, false, current_date - 2, now()),
  (991235, 991223, 991211, 991212, 1, 0, false, current_date - 400, now()),
  (991236, 991224, 991213, 991214, 2, 2, false, current_date - 20, now()),
  (991237, 991225, 991211, 991212, 1, 0, false, current_date - 20, now()),
  (991238, 991226, 991211, 991212, 1, 0, false, current_date - 20, now());
insert into fantasy_teams (id, owner_id, name, competition_id, created_at, hisna) overriding system value values
  (991281, '00000000-0000-0000-0000-00000000d20a', 'Drzava A1', 991201, now() - interval '40 days', false),
  (991282, '00000000-0000-0000-0000-00000000d20a', 'Drzava A2', 991202, now() - interval '40 days', false),
  (991283, '00000000-0000-0000-0000-00000000d20b', 'Drzava B', 991201, now() - interval '40 days', false),
  (991284, '00000000-0000-0000-0000-00000000d20c', 'Drzava C', 991201, now() - interval '40 days', false),
  (991285, '00000000-0000-0000-0000-00000000d20f', 'Drzava H', 991201, now() - interval '40 days', true),
  (991286, '00000000-0000-0000-0000-00000000d20d', 'Drzava D', 991203, now() - interval '40 days', false),
  (991287, '00000000-0000-0000-0000-00000000d20e', 'Drzava E', 991204, now() - interval '40 days', false);

-- Napovedi (servis). Točke v oklepaju.
insert into napovedi (user_id, match_id, home_goals, away_goals) values
  -- A: 3 + 1 + kontumacija + 1 (krog 2) + 3 (liga 2) = 8, točnih 2.
  ('00000000-0000-0000-0000-00000000d20a', 991231, 2, 1),
  ('00000000-0000-0000-0000-00000000d20a', 991232, 1, 1),
  ('00000000-0000-0000-0000-00000000d20a', 991233, 3, 0),
  ('00000000-0000-0000-0000-00000000d20a', 991234, 0, 0),
  ('00000000-0000-0000-0000-00000000d20a', 991236, 2, 2),
  -- B: 1 + 3 + 3 (krog 2) = 7, točnih 2; liga 2 brez ekipe ne šteje.
  ('00000000-0000-0000-0000-00000000d20b', 991231, 1, 0),
  ('00000000-0000-0000-0000-00000000d20b', 991232, 0, 0),
  ('00000000-0000-0000-0000-00000000d20b', 991234, 1, 1),
  ('00000000-0000-0000-0000-00000000d20b', 991236, 2, 2),
  -- C: 0 v tej sezoni; lanski točen izid ne šteje.
  ('00000000-0000-0000-0000-00000000d20c', 991231, 0, 2),
  ('00000000-0000-0000-0000-00000000d20c', 991235, 1, 0),
  -- H (hišna), D (neaktivna liga), E (druga država): ne štejejo.
  ('00000000-0000-0000-0000-00000000d20f', 991231, 2, 1),
  ('00000000-0000-0000-0000-00000000d20f', 991232, 0, 0),
  ('00000000-0000-0000-0000-00000000d20d', 991237, 1, 0),
  ('00000000-0000-0000-0000-00000000d20e', 991238, 1, 0);

-- Vrnjeni stolpci: nikoli user_id.
do $$
begin
  assert pg_get_function_result('public.lestvica_napovedi_drzave(text, int, int)'::regprocedure) not like '%user_id%',
         'lestvica države brez user_id';
end;
$$;

set local role anon;
do $$
begin
  -- Sezona: A 8 (kralj), B 7, C 0. Krone: krog 1 lige 1 A in B (4:4, po en
  -- točen), krog 2 B, krog 1 lige 2 A.
  assert (select array_agg(display_name || ':' || mesto || ':' || tocke || ':' || tocnih || ':' || razpletov || ':'
                           || ocenjenih || ':' || kron || ':' || kralj || ':' || je_moj order by mesto, display_name)
            from lestvica_napovedi_drzave('ZZ'))
         = array['drzava-a:1:8:2:2:4:2:true:false', 'drzava-b:2:7:2:1:3:2:false:false', 'drzava-c:3:0:0:0:1:0:false:false'],
         'lestvica države';
  -- Zadnjih 7 dni: le krog 2 lige 1 (B 3 točen, A 1); C v oknu nima napovedi.
  assert (select array_agg(display_name || ':' || mesto || ':' || tocke || ':' || ocenjenih || ':' || kron || ':' || kralj order by mesto)
            from lestvica_napovedi_drzave('ZZ', 7))
         = array['drzava-b:1:3:1:2:true', 'drzava-a:2:1:1:2:false'],
         'lestvica zadnjih 7 dni';
  -- Vrh 1 brez prijave: le vodilni.
  assert (select array_agg(display_name) from lestvica_napovedi_drzave('ZZ', null, 1)) = array['drzava-a'], 'vrh 1';
  assert not exists (select 1 from lestvica_napovedi_drzave('XX')), 'neznana država';
  -- Druga država vidi le svojo ligo.
  assert (select array_agg(display_name) from lestvica_napovedi_drzave('ZY')) = array['drzava-e'], 'druga država';
end;
$$;
reset role;

-- Krone so iste kot v `kralji_krogov_lige` obeh lig.
do $$
begin
  assert (select array_agg(right(user_id::text, 1) || ':' || n order by user_id)
            from (select k.user_id, count(*) as n
                    from unnest(array[991201, 991202]::bigint[]) l(id)
                    cross join lateral kralji_krogov_lige(l.id) k
                   group by k.user_id) x)
         = array['a:2', 'b:2'], 'krone kot kralji_krogov_lige';
end;
$$;

-- Prijavljen C pod vrhom 1 dobi še svojo vrstico.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d20c","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d20c', true);
do $$
begin
  assert (select array_agg(display_name || ':' || mesto || ':' || je_moj order by mesto)
            from lestvica_napovedi_drzave('ZZ', null, 1))
         = array['drzava-a:1:false', 'drzava-c:3:true'], 'lastna vrstica pod vrhom';
end;
$$;
reset role;

select 'napovedi-drzava: ok';
rollback;
