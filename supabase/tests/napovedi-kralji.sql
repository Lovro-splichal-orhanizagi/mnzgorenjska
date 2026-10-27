-- Kralj napovedi (20261027141100): kralj končanega kroga (točke, nato točni
-- izidi, popolnoma izenačeni delijo krono), nekončan krog in krog pred rokom
-- brez kralja, 0 točk brez kralja, kralj sezone, krone, mini liga le člani,
-- hišna ekipa ne šteje, servisni `kralj_napovedi_kroga` za pošto.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

-- a, b, c: člani mini lige 990751; d: ekipa v ligi, ni član; e: sam v mini
-- ligi 990752 brez točk; h: le hišna ekipa.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c10a', 'kralj-a@test.invalid'),
  ('00000000-0000-0000-0000-00000000c10b', 'kralj-b@test.invalid'),
  ('00000000-0000-0000-0000-00000000c10c', 'kralj-c@test.invalid'),
  ('00000000-0000-0000-0000-00000000c10d', 'kralj-d@test.invalid'),
  ('00000000-0000-0000-0000-00000000c10e', 'kralj-e@test.invalid'),
  ('00000000-0000-0000-0000-00000000c10f', 'kralj-h@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000c10a', 'kralj-a'),
  ('00000000-0000-0000-0000-00000000c10b', 'kralj-b'),
  ('00000000-0000-0000-0000-00000000c10c', 'kralj-c'),
  ('00000000-0000-0000-0000-00000000c10d', 'kralj-d'),
  ('00000000-0000-0000-0000-00000000c10e', 'kralj-e'),
  ('00000000-0000-0000-0000-00000000c10f', 'kralj-h')
on conflict (id) do nothing;

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (990701, 'test-kralj-napovedi', 'Test kralj napovedi', 'TK', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values
  (990711, 'NK Kralj Ena', 1), (990712, 'NK Kralj Dva', 1),
  (990713, 'NK Kralj Tri', 1), (990714, 'NK Kralj Stiri', 1);
-- 1, 2, 5: končani; 3: rok je potekel, tekma čaka na izid; 4: pred rokom.
insert into rounds (id, season, number, deadline_at, played_on, competition_id) overriding system value values
  (990721, sezona_lige(990701), 1, now() - interval '20 days', current_date - 20, 990701),
  (990722, sezona_lige(990701), 2, now() - interval '13 days', current_date - 13, 990701),
  (990723, sezona_lige(990701), 3, now() - interval '2 days', current_date - 1, 990701),
  (990724, sezona_lige(990701), 4, now() + interval '5 days', current_date + 5, 990701),
  (990725, sezona_lige(990701), 5, now() - interval '30 days', current_date - 30, 990701);
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, kontumacija, played_on, imported_at)
overriding system value values
  (990731, 990721, 990711, 990712, 2, 1, false, current_date - 20, now()),
  (990732, 990721, 990713, 990714, 0, 0, false, current_date - 20, now()),
  (990733, 990721, 990711, 990713, 3, 0, true,  current_date - 20, null),  -- kontumacija: končana
  (990741, 990722, 990711, 990714, 1, 0, false, current_date - 13, now()),
  (990742, 990722, 990712, 990713, 2, 2, false, current_date - 13, now()),
  (990743, 990722, 990714, 990712, 3, 3, false, current_date - 13, now()),
  (990751, 990723, 990711, 990712, 1, 1, false, current_date - 1, now()),
  (990752, 990723, 990713, 990714, 0, 0, false, current_date - 1, null),   -- čaka
  (990761, 990724, 990711, 990713, 0, 0, false, current_date + 5, null),
  (990771, 990725, 990712, 990714, 1, 0, false, current_date - 30, now());
insert into fantasy_teams (id, owner_id, name, competition_id, created_at, hisna) overriding system value values
  (990781, '00000000-0000-0000-0000-00000000c10a', 'Kralj A', 990701, now() - interval '40 days', false),
  (990782, '00000000-0000-0000-0000-00000000c10b', 'Kralj B', 990701, now() - interval '40 days', false),
  (990783, '00000000-0000-0000-0000-00000000c10c', 'Kralj C', 990701, now() - interval '40 days', false),
  (990784, '00000000-0000-0000-0000-00000000c10d', 'Kralj D', 990701, now() - interval '40 days', false),
  (990785, '00000000-0000-0000-0000-00000000c10e', 'Kralj E', 990701, now() - interval '40 days', false),
  (990786, '00000000-0000-0000-0000-00000000c10f', 'Kralj H', 990701, now() - interval '40 days', true);
insert into mini_lige (id, name, code, owner_id) overriding system value values
  (990751, 'Kraljevska', 'KRALJ751', '00000000-0000-0000-0000-00000000c10a'),
  (990752, 'Brez tock', 'KRALJ752', '00000000-0000-0000-0000-00000000c10e');
insert into mini_liga_clani (mini_liga_id, fantasy_team_id) values
  (990751, 990781), (990751, 990782), (990751, 990783), (990752, 990785);

-- Napovedi (servis). Točke v oklepaju.
insert into napovedi (user_id, match_id, home_goals, away_goals) values
  -- Krog 1: A 4 (3+1), B 2 (1+1), D 3; H 6, a je hišna.
  ('00000000-0000-0000-0000-00000000c10a', 990731, 2, 1),
  ('00000000-0000-0000-0000-00000000c10a', 990732, 1, 1),
  ('00000000-0000-0000-0000-00000000c10a', 990733, 3, 0),
  ('00000000-0000-0000-0000-00000000c10b', 990731, 3, 0),
  ('00000000-0000-0000-0000-00000000c10b', 990732, 2, 2),
  ('00000000-0000-0000-0000-00000000c10d', 990731, 2, 1),
  ('00000000-0000-0000-0000-00000000c10f', 990731, 2, 1),
  ('00000000-0000-0000-0000-00000000c10f', 990732, 0, 0),
  -- Krog 2: B 3 (1 točen), C 3 (0 točnih), D 3 (1 točen), A 2.
  ('00000000-0000-0000-0000-00000000c10b', 990741, 1, 0),
  ('00000000-0000-0000-0000-00000000c10b', 990742, 0, 1),
  ('00000000-0000-0000-0000-00000000c10c', 990741, 2, 1),
  ('00000000-0000-0000-0000-00000000c10c', 990742, 1, 1),
  ('00000000-0000-0000-0000-00000000c10c', 990743, 0, 0),
  ('00000000-0000-0000-0000-00000000c10d', 990741, 1, 0),
  ('00000000-0000-0000-0000-00000000c10a', 990741, 2, 0),
  ('00000000-0000-0000-0000-00000000c10a', 990742, 1, 1),
  -- Krog 3 ni končan: A 3 šteje v skupno, krone ni.
  ('00000000-0000-0000-0000-00000000c10a', 990751, 1, 1),
  ('00000000-0000-0000-0000-00000000c10a', 990752, 0, 0),
  -- Krog 4 je pred rokom.
  ('00000000-0000-0000-0000-00000000c10a', 990761, 0, 0),
  -- Krog 5: le 0 točk, brez kralja.
  ('00000000-0000-0000-0000-00000000c10a', 990771, 0, 1),
  ('00000000-0000-0000-0000-00000000c10e', 990771, 0, 2);

do $$
begin
  -- Liga: krog 1 A, krog 2 B in D (enake točke in točni izidi), 3/4/5 nič.
  assert (select array_agg(krog || ':' || right(user_id::text, 1) || ':' || tocke || ':' || tocnih order by krog, user_id)
            from kralji_krogov_lige(990701))
         = array['1:a:4:1', '2:b:3:1', '2:d:3:1'], 'kralji krogov lige';
  assert (select count(*) from kralji_krogov_lige(990701, 2)) = 2, 'kralji enega kroga';
  -- Mini liga (A, B, C): krog 1 A, krog 2 B (C ima 3, a brez točnega).
  assert (select array_agg(krog || ':' || right(user_id::text, 1) order by krog, user_id)
            from kralji_krogov_mini_lige(990751))
         = array['1:a', '2:b'], 'kralji krogov mini lige';
  assert not exists (select 1 from kralji_krogov_mini_lige(990752)), 'brez točk ni kralja';

  -- Pošta: liga (NULL) in mini liga; D le liga; nekončan krog nič.
  assert (select array_agg(coalesce(mini_liga, '-')) from kralj_napovedi_kroga('00000000-0000-0000-0000-00000000c10a', 990721))
         = array['-', 'Kraljevska'], 'A je kralj 1. kroga v ligi in mini ligi';
  assert (select array_agg(coalesce(mini_liga, '-')) from kralj_napovedi_kroga('00000000-0000-0000-0000-00000000c10b', 990722))
         = array['-', 'Kraljevska'], 'B je kralj 2. kroga';
  assert (select array_agg(coalesce(mini_liga, '-')) from kralj_napovedi_kroga('00000000-0000-0000-0000-00000000c10d', 990722))
         = array['-'], 'D le v ligi';
  assert not exists (select 1 from kralj_napovedi_kroga('00000000-0000-0000-0000-00000000c10c', 990722)), 'C ni kralj';
  assert not exists (select 1 from kralj_napovedi_kroga('00000000-0000-0000-0000-00000000c10a', 990723)), 'nekončan krog';
  assert not exists (select 1 from kralj_napovedi_kroga('00000000-0000-0000-0000-00000000c10a', 990724)), 'krog pred rokom';
  assert not exists (select 1 from kralj_napovedi_kroga('00000000-0000-0000-0000-00000000c10f', 990721)), 'hišna ne šteje';
end;
$$;

-- Notranji in servisni funkciji nista odprti nikomur.
set local role anon;
do $$
begin
  begin
    perform * from kralji_krogov_lige(990701);
    raise exception 'anon kliče kralje krogov';
  exception when insufficient_privilege then
    null;
  end;
  -- Neprijavljen: skupno A 9 kralj sezone, krone A 1, B 1, D 1, C 0.
  assert (select array_agg(display_name || ':' || tocke || ':' || kron || ':' || kralj order by mesto, display_name)
            from lestvica_napovedi_lige(990701))
         = array['kralj-a:9:1:true', 'kralj-d:6:1:false', 'kralj-b:5:1:false', 'kralj-c:3:0:false', 'kralj-e:0:0:false'],
         'lestvica lige s kronami';
  assert (select array_agg(display_name order by display_name) from lestvica_napovedi_lige(990701, 2) where kralj)
         = array['kralj-b', 'kralj-d'], 'kralja 2. kroga si delita krono';
  assert not exists (select 1 from lestvica_napovedi_lige(990701, 3) where kralj), 'nekončan krog brez kralja';
  assert not exists (select 1 from lestvica_napovedi_lige(990701, 5) where kralj), '0 točk brez kralja';
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c10b","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c10b', true);
do $$
begin
  begin
    perform * from kralj_napovedi_kroga(auth.uid(), 990722);
    raise exception 'uporabnik kliče servisnega kralja';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform * from kralji_krogov_mini_lige(990751);
    raise exception 'uporabnik kliče kralje mini lige mimo pravic';
  exception when insufficient_privilege then
    null;
  end;
  -- Mini liga: A 9 (kralj sezone), B 5, C 3; D ni član.
  assert (select array_agg(right(user_id::text, 1) || ':' || tocke || ':' || kron || ':' || kralj)
            from lestvica_napovedi_mini_lige(990751))
         = array['a:9:1:true', 'b:5:1:false', 'c:3:0:false'], 'lestvica mini lige s kronami';
  assert (select array_agg(right(user_id::text, 1)) from lestvica_napovedi_mini_lige(990751, 2) where kralj)
         = array['b'], 'kralj 2. kroga mini lige';
  assert (select array_agg(right(user_id::text, 1)) from lestvica_napovedi_mini_lige(990751, 1) where kralj)
         = array['a'], 'kralj 1. kroga mini lige';
end;
$$;

-- Nečlan ne vidi lestvice ne kron; mini liga brez točk nima kralja sezone.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c10d","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c10d', true);
do $$
begin
  assert not exists (select 1 from lestvica_napovedi_mini_lige(990751)), 'zasebna lestvica s kronami';
end;
$$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c10e","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c10e', true);
do $$
begin
  assert (select not kralj and kron = 0 and ocenjenih = 1 from lestvica_napovedi_mini_lige(990752)), 'brez točk ni kralja sezone';
end;
$$;
reset role;

select 'napovedi-kralji: ok';
rollback;
