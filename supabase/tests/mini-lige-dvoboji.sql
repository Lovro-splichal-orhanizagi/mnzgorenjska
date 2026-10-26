-- Dvoboji v mini ligah (20261026151100): krožni razpored, povprečje pri
-- lihem številu, pari se ob zaklepu shranijo in ne spremenijo, poznejši
-- člani igrajo od naslednjega kroga, izidi iz točk kroga, kdo vidi.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000d001', 'dvoboj1@test.invalid'),
  ('00000000-0000-0000-0000-00000000d002', 'dvoboj2@test.invalid'),
  ('00000000-0000-0000-0000-00000000d003', 'dvoboj3@test.invalid'),
  ('00000000-0000-0000-0000-00000000d004', 'dvoboj4@test.invalid'),
  ('00000000-0000-0000-0000-00000000d005', 'dvoboj5@test.invalid'),
  ('00000000-0000-0000-0000-00000000d006', 'dvoboj6@test.invalid'),
  ('00000000-0000-0000-0000-00000000d007', 'tujec@test.invalid');
insert into profiles (id, display_name)
select u.id, 'Dvoboj ' || right(u.id::text, 1) from auth.users u
 where u.id::text like '00000000-0000-0000-0000-00000000d00%'
on conflict (id) do nothing;

-- Dve ligi: A ima pet krogov, B dva. Mini liga gre čez obe.
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value values
  (-917001, 'test-dvoboji-a', 'Dvoboji A', 'DA', false, (select id from countries where code = 'SI'), 'mnzg'),
  (-917002, 'test-dvoboji-b', 'Dvoboji B', 'DB', false, (select id from countries where code = 'SI'), 'mnzg');
insert into teams (id, name, short_name, country_id) overriding system value values
  (-917001, 'Dvoboji klub 1', 'K1', (select id from countries where code = 'SI')),
  (-917002, 'Dvoboji klub 2', 'K2', (select id from countries where code = 'SI'));
insert into rounds (id, season, number, deadline_at, competition_id) overriding system value
select -917000 - n, sezona_lige(-917001), n, now() - interval '20 days' + n * interval '3 days', -917001
  from generate_series(1, 5) n;
insert into rounds (id, season, number, deadline_at, competition_id) overriding system value
select -917010 - n, sezona_lige(-917002), n, now() - interval '19 days' + n * interval '3 days', -917002
  from generate_series(1, 2) n;
insert into matches (id, round_id, home_team_id, away_team_id, played_on, zapisnik_id) overriding system value
select r.id, r.id, -917001, -917002, r.deadline_at::date, 'test-dvoboji' || r.id
  from rounds r where r.competition_id in (-917001, -917002);
-- Vsaka ekipa ima svojega igralca; točke ekipe so njegove točke.
insert into players (id, team_id, competition_id, first_name, last_name, position,
                     position_source, value, value_start, active) overriding system value
select -917000 - n, -917001, case when n = 5 then -917002 else -917001 end,
       'Dvoboj', n::text, 'MID', 'admin', 5, 5, true
  from generate_series(1, 6) n;
-- Ekipe 1–4 in 6 v ligi A, 5 v ligi B.
insert into fantasy_teams (id, owner_id, name, competition_id, created_at) overriding system value
select -917000 - n, ('00000000-0000-0000-0000-00000000d00' || n)::uuid, 'Dvoboj ' || n,
       case when n = 5 then -917002 else -917001 end, now() - interval '60 days'
  from generate_series(1, 6) n;

-- Mini liga L: ekipe 1–5 od začetka, 6 se pridruži po zaklepu 1. kroga.
-- Mini liga R: pet ekip lige A, za preizkus krožnega razporeda.
insert into mini_lige (id, name, code, owner_id) overriding system value values
  (-917001, 'Dvoboji L', 'DVOBOJL917', '00000000-0000-0000-0000-00000000d001'),
  (-917002, 'Dvoboji R', 'DVOBOJR917', '00000000-0000-0000-0000-00000000d001');
insert into mini_liga_clani (mini_liga_id, fantasy_team_id, joined_at)
select -917001, -917000 - n, now() - interval '50 days' + n * interval '1 minute' from generate_series(1, 5) n;
insert into mini_liga_clani (mini_liga_id, fantasy_team_id, joined_at)
select -917002, t, now() - interval '50 days' from unnest(array[-917001, -917002, -917003, -917004, -917006]) t;

-- Krožni razpored: pet ekip, pet krogov → vsak z vsakim natanko enkrat,
-- vsak enkrat proti povprečju.
do $$
begin
  for k in 1..5 loop
    assert sestavi_dvoboje(-917002, sezona_lige(-917001), k, now() - interval '40 days') = 3,
      'krog ' || k || ': trije pari (dva dvoboja in povprečje)';
  end loop;
  assert (select count(*) from mini_liga_dvoboji where mini_liga_id = -917002 and ekipa_b is not null) = 10,
    'deset dvobojev';
  assert (select count(distinct (least(ekipa_a, ekipa_b), greatest(ekipa_a, ekipa_b)))
            from mini_liga_dvoboji where mini_liga_id = -917002 and ekipa_b is not null) = 10,
    'vsak par natanko enkrat';
  assert (select count(distinct ekipa_a) from mini_liga_dvoboji
           where mini_liga_id = -917002 and ekipa_b is null) = 5,
    'vsak enkrat proti povprečju';
  assert not exists (
    select 1 from (select krog, ekipa_a e from mini_liga_dvoboji where mini_liga_id = -917002
                   union all
                   select krog, ekipa_b from mini_liga_dvoboji where mini_liga_id = -917002 and ekipa_b is not null) x
     group by krog, e having count(*) > 1),
    'ekipa v krogu igra le en dvoboj';
  -- Drugi klic istega kroga ne spremeni ničesar.
  assert sestavi_dvoboje(-917002, sezona_lige(-917001), 1, now()) = 0, 'krog s pari ostane';
end;
$$;

-- Točke 1. kroga: posnetki in točke igralcev (tocke_krogov osvežijo sprožilci).
insert into fantasy_lineups (round_id, fantasy_team_id, player_id, is_starter, is_captain, bench_order, position)
select r, -917000 - n, -917000 - n, true, false, null, 'MID'
  from generate_series(1, 6) n
  cross join lateral (select case when n = 5 then -917011 else -917001 end as r) x;
insert into player_scores (round_id, player_id, points)
values (-917001, -917001, 10), (-917001, -917002, 6), (-917001, -917003, 6),
       (-917001, -917004, 2), (-917001, -917006, 9), (-917011, -917005, 8);

-- Zaklep 1. kroga lige A: sprožilec sestavi pare mini lige L (ekipa 5 je
-- zraven, ker ima liga B 1. krog, četudi ga še ni zaklenila).
update rounds set lineups_locked_at = deadline_at where id = -917001;
do $$
begin
  assert (select count(*) from mini_liga_dvoboji where mini_liga_id = -917001 and krog = 1) = 3,
    'zaklep sestavi pare: pet ekip, trije pari';
  assert not exists (select 1 from mini_liga_dvoboji where mini_liga_id = -917001 and -917006 in (ekipa_a, ekipa_b)),
    'ekipe 6 v 1. krogu ni';
end;
$$;

-- Ekipa 6 vstopi po zaklepu 1. kroga in pred 2. krogom.
insert into mini_liga_clani (mini_liga_id, fantasy_team_id, joined_at)
values (-917001, -917006, (select deadline_at + interval '1 hour' from rounds where id = -917001));
update rounds set lineups_locked_at = deadline_at where id = -917002;
do $$
declare
  v_pari text;
begin
  select string_agg(ekipa_a || ':' || coalesce(ekipa_b::text, '-'), ',' order by id) into v_pari
    from mini_liga_dvoboji where mini_liga_id = -917001 and krog = 1;
  assert (select count(*) from mini_liga_dvoboji where mini_liga_id = -917001 and krog = 2) = 3,
    '2. krog: šest ekip, trije pari brez povprečja';
  assert exists (select 1 from mini_liga_dvoboji where mini_liga_id = -917001 and krog = 2 and -917006 in (ekipa_a, ekipa_b)),
    'poznejši član igra od naslednjega kroga';
  assert not exists (select 1 from mini_liga_dvoboji where mini_liga_id = -917001 and krog = 2 and ekipa_b is null),
    'sodo število nima povprečja';
  -- Zaklep 1. kroga lige B pozneje parov 1. kroga ne spremeni.
  update rounds set lineups_locked_at = deadline_at where id = -917011;
  assert v_pari = (select string_agg(ekipa_a || ':' || coalesce(ekipa_b::text, '-'), ',' order by id)
                     from mini_liga_dvoboji where mini_liga_id = -917001 and krog = 1),
    'pari 1. kroga se ne spremenijo za nazaj';
end;
$$;

-- Arhivski krog (druga sezona) ni dvoboj.
insert into rounds (id, season, number, deadline_at, competition_id) overriding system value
values (-917099, '2001/02', 1, now() - interval '9000 days', -917001);
update rounds set lineups_locked_at = deadline_at where id = -917099;
do $$
begin
  assert not exists (select 1 from mini_liga_dvoboji where sezona = '2001/02'), 'arhivski zaklep brez dvobojev';
end;
$$;

-- Izidi 1. kroga: A 10, B 6, C 6, D 2, E (liga B) 8; povprečje 6.4.
create temporary table izidi_l as select * from izidi_dvobojev(-917001, sezona_lige(-917001)) where krog = 1;
do $$
begin
  assert (select count(*) from izidi_l) = 5, 'vsaka ekipa ima v krogu en izid';
  assert (select bool_and(koncan) from izidi_l), 'krog je končan v obeh ligah';
  assert (select tocke_nasprotnika from izidi_l where nasprotnik is null) = 6.4, 'povprečje kroga';
  assert (select sum(tocke) from izidi_l) = 32, 'točke kroga iz fantasy_round_points';
end;
$$;

-- Član vidi dvoboje svoje mini lige.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d001","role":"authenticated"}', true);
create temporary table dvoboji_l as select dvoboji_mini_lige(-917001, 1) as j;
do $$
declare
  j jsonb := (select j from dvoboji_l);
  v_prvi jsonb;
begin
  assert (j ->> 'krog')::int = 1 and j -> 'krogi' = '[2,1]'::jsonb, 'krogi in izbrani krog';
  assert jsonb_array_length(j -> 'pari') = 3, 'trije pari';
  assert (select count(*) from jsonb_array_elements(j -> 'pari') p where p -> 'b' = 'null'::jsonb
            and (p ->> 'povprecje')::numeric = 6.4) = 1, 'en par proti povprečju';
  assert jsonb_array_length(j -> 'lestvica') = 6, 'lestvica: vsi sedanji člani';
  v_prvi := j -> 'lestvica' -> 0;
  -- Ekipa 1 ima največ točk 1. kroga in je zmagala, karkoli je bil nasprotnik;
  -- 2. krog lige A je končan brez postav (0:0), dvoboj z ekipo lige B čaka.
  assert (v_prvi ->> 'ekipa_id')::bigint = -917001 and (v_prvi ->> 'zmage')::int = 1
         and (v_prvi ->> 'porazi')::int = 0 and (v_prvi ->> 'tocke_za')::numeric = 10,
    'lestvica razvrščena po točkah dvobojev in točkah kroga: ' || v_prvi::text;
  assert not exists (select 1 from jsonb_array_elements(j -> 'pari') p
                      where -917006 in ((p -> 'a' ->> 'ekipa_id')::bigint, (p -> 'b' ->> 'ekipa_id')::bigint)),
    'poznejši član brez dvoboja v 1. krogu';
  assert (select count(*) from mini_liga_dvoboji where mini_liga_id = -917001) = 6, 'član bere tabelo svoje mini lige';
end;
$$;
-- 2. krog še nima točk vseh: privzeto zadnji krog, dvoboji z ekipo B čakajo.
do $$
declare
  j jsonb := dvoboji_mini_lige(-917001);
begin
  assert (j ->> 'krog')::int = 2, 'privzeto zadnji krog';
  assert (select bool_and(not (p ->> 'koncan')::boolean) from jsonb_array_elements(j -> 'pari') p
           where (p -> 'a' ->> 'ekipa_id')::bigint = -917005 or (p -> 'b' ->> 'ekipa_id')::bigint = -917005),
    'dvoboj ekipe brez zaklenjenega kroga čaka';
end;
$$;
reset role;

-- Tujec: nič, tudi iz tabele ne. Anonimni pri zasebni ligi nič.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d007","role":"authenticated"}', true);
do $$
begin
  assert dvoboji_mini_lige(-917001) is null, 'tujec ne vidi zasebne mini lige';
  assert not exists (select 1 from mini_liga_dvoboji where mini_liga_id = -917001), 'tujec ne bere tabele';
  begin
    perform sestavi_dvoboje(-917001, sezona_lige(-917001), 3, now());
    raise exception 'prijavljeni je sestavil pare';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from dvoboji_ekipe(-917001);
    raise exception 'prijavljeni je bral dvoboje ekipe';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into mini_liga_dvoboji (mini_liga_id, sezona, krog, ekipa_a) values (-917001, 'x', 9, -917001);
    raise exception 'prijavljeni je pisal v tabelo';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  assert dvoboji_mini_lige(-917001) is null, 'anonimni ne vidi zasebne mini lige';
  begin
    perform 1 from mini_liga_dvoboji;
    raise exception 'anonimni je bral tabelo';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Javna mini liga: dvoboje vidi vsak, kot lestvico.
update mini_lige set javna = true, competition_id = -917001 where id = -917001;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  assert jsonb_array_length(dvoboji_mini_lige(-917001) -> 'lestvica') = 6, 'javna mini liga: anonimni vidi dvoboje';
end;
$$;
reset role;

-- Za pošto: dvoboj ekipe v krogu.
do $$
begin
  assert (select count(*) from dvoboji_ekipe(-917001, 1) where mini_liga_id = -917001 and koncan) = 1,
    'dvoboji_ekipe: en dvoboj v mini ligi L';
  assert (select izid from dvoboji_ekipe(-917001, 1) where mini_liga_id = -917001) = 'zmaga',
    'dvoboji_ekipe: izid';
  assert (select krog from dvoboji_ekipe(-917001) where mini_liga_id = -917001) = 2,
    'dvoboji_ekipe: privzeto zadnji krog';
  assert not has_function_privilege('anon', 'public.sestavi_dvoboje(bigint, text, int, timestamptz)', 'execute')
     and not has_function_privilege('authenticated', 'public.izidi_dvobojev(bigint, text)', 'execute')
     and not has_function_privilege('authenticated', 'public.dvoboji_ekipe(bigint, int)', 'execute')
     and has_function_privilege('anon', 'public.dvoboji_mini_lige(bigint, int)', 'execute'),
    'pravice funkcij';
end;
$$;

-- Izbris mini lige pobriše njene pare.
delete from mini_lige where id = -917002;
do $$
begin
  assert not exists (select 1 from mini_liga_dvoboji where mini_liga_id = -917002), 'pari gredo z mini ligo';
end;
$$;

select 'mini-lige-dvoboji: ok';
rollback;
