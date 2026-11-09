-- Izbranost le za preverjene (20261109120000, SLF-360). Teče v transakciji in se povrne.
--
-- Lige: A (SI, 6 človeških ekip + hišna), B (SI, 5 ekip), C (HR, 2 ekipi: pod
-- pragom), D (SI mladinci). Igralec 936101 (A) je oseba preverjenega V, povezan
-- z 936102 (B) in 936103 (C). 936104 (A) je nepotrjen. 936105 (A) ima R s
-- preklicano pravico, 936106 (A) E s potečeno, 936107 (A) M z mladinsko
-- povezano vrstico 936108 (D). F je navaden uporabnik, AD admin.
begin;

insert into settings (key, value) values ('preverjeni_racuni', '2')
  on conflict (key) do update set value = '2';

insert into auth.users (id, email, raw_user_meta_data, created_at)
select ('e3600000-0000-4000-8000-0000000000' || k)::uuid, 'izb-' || k || '@test.invalid',
       jsonb_build_object('display_name', 'Izb ' || k), now() - interval '5 days'
  from (values ('01'), ('02'), ('03'), ('04'), ('05'), ('06'), ('09'),
               ('11'), ('12'), ('13'), ('14'), ('15'), ('16'), ('19')) v(k);
-- 01 V, 02 F, 03 R, 04 E, 05 M, 06 AD, 09 lastnik hišne, 11-16 lastniki ekip
update profiles set is_admin = true where id = 'e3600000-0000-4000-8000-000000000006';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (936001, 'test-izb-a', 'Izb A', 'IA', false, (select id from countries where code = 'SI'), 'mnzg'),
       (936002, 'test-izb-b', 'Izb B', 'IB', false, (select id from countries where code = 'SI'), 'mnzg'),
       (936003, 'hr-test-izb-c', 'Izb C', 'IC', false, (select id from countries where code = 'HR'), 'hns'),
       (936004, 'test-izb-mladinci', 'Izb D', 'ID', false, (select id from countries where code = 'SI'), 'mnzg');
insert into teams (id, name, country_id) overriding system value
values (936011, 'NK Izb', (select id from countries where code = 'SI')),
       (936012, 'NK Izb HR', (select id from countries where code = 'HR'));
insert into players (id, team_id, competition_id, first_name, last_name, position, position_source, value, value_start, active) overriding system value
values (936101, 936011, 936001, 'Vid', 'Preverjen', 'MID', 'admin', 5, 5, true),
       (936102, 936011, 936002, 'Vid', 'Preverjen', 'MID', 'admin', 5, 5, true),
       (936103, 936012, 936003, 'Vid', 'Preverjen', 'MID', 'admin', 5, 5, true),
       (936104, 936011, 936001, 'Nik', 'Nepotrjen', 'DEF', 'admin', 5, 5, true),
       (936105, 936011, 936001, 'Rok', 'Preklican', 'DEF', 'admin', 5, 5, true),
       (936106, 936011, 936001, 'Eva', 'Potekla', 'FWD', 'admin', 5, 5, true),
       (936107, 936011, 936001, 'Mia', 'Mlada', 'FWD', 'admin', 5, 5, true),
       (936108, 936011, 936004, 'Mia', 'Mlada', 'FWD', 'admin', 5, 5, true);

insert into zahtevki_igralca (id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (936201, 936101, 'e3600000-0000-4000-8000-000000000001', 'potrjen', 'admin', now()),
       (936203, 936105, 'e3600000-0000-4000-8000-000000000003', 'potrjen', 'admin', now()),
       (936204, 936106, 'e3600000-0000-4000-8000-000000000004', 'potrjen', 'admin', now()),
       (936205, 936107, 'e3600000-0000-4000-8000-000000000005', 'potrjen', 'admin', now());
insert into povezani_igralci (player_id, zahtevek_id)
values (936102, 936201), (936103, 936201), (936108, 936205);
insert into preverjeni_racuni (user_id, player_id, vir, status, velja_do, star_vsaj_18, odpoved_pravici)
values ('e3600000-0000-4000-8000-000000000001', 936101, 'rocno', 'aktiven', null, null, null),
       ('e3600000-0000-4000-8000-000000000003', 936105, 'letna', 'preklican', now() + interval '6 months', true, true),
       ('e3600000-0000-4000-8000-000000000004', 936106, 'letna', 'aktiven', now() - interval '1 day', true, true),
       ('e3600000-0000-4000-8000-000000000005', 936107, 'rocno', 'aktiven', null, null, null);

insert into rounds (id, season, number, deadline_at, lineups_locked_at, competition_id) overriding system value
values (936301, '2099/00', 3, now() - interval '2 days', now() - interval '2 days', 936001),
       (936302, '2099/00', 3, now() - interval '2 days', now() - interval '2 days', 936002),
       (936303, '2099/00', 3, now() - interval '2 days', now() - interval '2 days', 936003);
-- A: 6 človeških (11-16) + hišna; B: 5 (11-15); C: 2 (11-12)
insert into fantasy_teams (id, owner_id, name, competition_id, created_at) overriding system value
select 936400 + c * 10 + n, ('e3600000-0000-4000-8000-0000000000' || (10 + n))::uuid,
       'Izb ' || c || '-' || n, 936000 + c, now() - interval '5 days'
  from (values (1, 6), (2, 5), (3, 2)) l(c, ekip)
  cross join lateral generate_series(1, l.ekip) n;
insert into fantasy_teams (id, owner_id, name, competition_id, created_at, hisna) overriding system value
values (936419, 'e3600000-0000-4000-8000-000000000009', 'Izb hišna', 936001, now() - interval '5 days', true);
-- 936101 v A pri 11-14 in hišni (4 človeške), 936104 pri 15; 936102 v B pri vseh 5; 936103 v C pri obeh
insert into fantasy_lineups (round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
select v.r, v.t, v.p, true, false, false, null, 'MID'
  from (values (936301, 936411, 936101), (936301, 936412, 936101), (936301, 936413, 936101), (936301, 936414, 936101),
               (936301, 936419, 936101), (936301, 936415, 936104), (936301, 936416, 936105),
               (936302, 936421, 936102), (936302, 936422, 936102), (936302, 936423, 936102), (936302, 936424, 936102),
               (936302, 936425, 936102),
               (936303, 936431, 936103), (936303, 936432, 936103)) v(r, t, p);

do $$
begin
  assert has_function_privilege('anon', 'public.vidi_izbranost()', 'execute')
     and has_function_privilege('anon', 'public.izbranost_igralca(bigint)', 'execute'),
    'pravice: funkciji sta klicljivi, pravilo je v njiju';
  assert pg_get_function_result('public.izbranost_igralca(bigint)'::regprocedure) !~ '(team|ekipa|owner_id|name)',
    'izbranost_igralca ne vrne ekip ali lastnikov (sestave ostanejo zasebne)';
  -- strežnik (postgres brez JWT): vse, prag in hišne kot prej
  assert vidi_izbranost(), 'strežnik vidi';
  assert (select owners = 4 from player_standings where id = 936101), 'strežnik: 4 človeške, hišna ne šteje';
  assert (select owners = 5 from player_standings where id = 936102), 'strežnik: B 5 od 5';
  assert (select owners is null from player_standings where id = 936103), 'strežnik: C pod 5 ekipami ostane NULL';
end;
$$;

-- anonimni: NULL povsod, RPC prazen, posnetkov ne bere
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert not vidi_izbranost(), 'anon: ne vidi';
  assert not exists (select 1 from player_standings where id between 936101 and 936108 and owners is not null),
    'anon: player_standings owners NULL';
  assert not exists (select 1 from player_season_standings where id between 936101 and 936108 and owners is not null),
    'anon: player_season_standings owners NULL';
  assert not exists (select 1 from izbranost_igralca(936101)), 'anon: RPC prazen';
  assert not exists (select 1 from fantasy_lineups where round_id between 936301 and 936303), 'anon: posnetki zasebni';
end;
$$;
reset role;

-- navaden (F), preklican (R), potekel (E), mladoleten (M): kot anonimni
create temporary table izb_vloge (sub uuid, opis text);
insert into izb_vloge values
  ('e3600000-0000-4000-8000-000000000002', 'navaden'),
  ('e3600000-0000-4000-8000-000000000003', 'preklican'),
  ('e3600000-0000-4000-8000-000000000004', 'potekel'),
  ('e3600000-0000-4000-8000-000000000005', 'mladoleten');
grant select on izb_vloge to authenticated;
set local role authenticated;
do $$
declare v record;
begin
  for v in select * from izb_vloge loop
    perform set_config('request.jwt.claim.sub', v.sub::text, true);
    assert not vidi_izbranost(), v.opis || ': ne vidi';
    assert not exists (select 1 from player_standings where id between 936101 and 936108 and owners is not null),
      v.opis || ': owners NULL';
    assert not exists (select 1 from izbranost_igralca(936101)), v.opis || ': RPC prazen';
    assert not exists (select 1 from izbranost_igralca(936104)), v.opis || ': RPC prazen tudi za nepotrjenega';
  end loop;
end;
$$;

-- preverjen (V)
select set_config('request.jwt.claim.sub', 'e3600000-0000-4000-8000-000000000001', true);
do $$
begin
  assert vidi_izbranost(), 'V: vidi';
  assert (select owners = 4 from player_standings where id = 936101), 'V: svoja izbranost 4 (brez hišne)';
  assert (select owners = 1 from player_standings where id = 936104), 'V: tuj nepotrjen igralec 1';
  assert (select owners is null from player_standings where id = 936103), 'V: prag 5 ekip ostane';
  -- svoj profil: vse tri lige osebe, tudi tuja država; brez podvajanja
  assert (select count(*) = 3 and bool_and(lastni) from izbranost_igralca(936101)), 'V: svoj profil, 3 lige';
  assert (select count(*) = 3 from izbranost_igralca(936103)), 'V: ista oseba prek povezane vrstice';
  assert (select ekip = 6 and owners = 4 and krog = 3 and zaklenjen is not null
            from izbranost_igralca(936101) where competition_id = 936001), 'V: A 4 od 6, krog in čas posnetka';
  assert (select ekip = 5 and owners = 5 from izbranost_igralca(936101) where competition_id = 936002), 'V: B 5 od 5';
  assert (select ekip = 2 and owners is null from izbranost_igralca(936101) where competition_id = 936003), 'V: C pod pragom NULL';
  -- tuj igralec: le njegova vrstica, ne lastni
  assert (select count(*) = 1 and not bool_or(lastni) and min(owners) = 1 from izbranost_igralca(936104)), 'V: tuj nepotrjen';
  -- mladoleten (mladinska povezana vrstica) in mladinska vrstica: nič
  assert not exists (select 1 from izbranost_igralca(936107)), 'V: oseba z mladinsko vrstico nima analitike';
  assert not exists (select 1 from izbranost_igralca(936108)), 'V: mladinska vrstica nima analitike';
  assert not exists (select 1 from fantasy_lineups where round_id between 936301 and 936303), 'V: tujih posnetkov ne bere';
end;
$$;
reset role;

-- admin gleda tujo osebo: le vrstice v državi gledane vrstice (SI), ne HR
select set_config('request.jwt.claim.sub', 'e3600000-0000-4000-8000-000000000006', true);
set local role authenticated;
do $$
begin
  assert vidi_izbranost(), 'admin: vidi';
  assert (select count(*) = 2 and not bool_or(lastni) from izbranost_igralca(936101)), 'admin: tuja oseba le SI lige';
  assert (select count(*) = 1 from izbranost_igralca(936103)), 'admin: HR vrstica le HR';
end;
$$;
reset role;

-- preverjen V, ko je stikalo izklopljeno ali profil anonimiziran: nič
update settings set value = '0' where key = 'preverjeni_racuni';
select set_config('request.jwt.claim.sub', 'e3600000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
begin
  assert not vidi_izbranost(), 'V: stikalo 0 skrije';
  assert (select owners is null from player_standings where id = 936101), 'V: stikalo 0 owners NULL';
end;
$$;
reset role;
update settings set value = '2' where key = 'preverjeni_racuni';
update players set anonimiziran_at = now() where id = 936101;
set local role authenticated;
do $$
begin
  assert not vidi_izbranost(), 'V: anonimiziran profil izgubi dostop';
end;
$$;
reset role;

-- preklic pravice (webhook / admin) takoj vzame dostop
update players set anonimiziran_at = null where id = 936101;
update preverjeni_racuni set status = 'preklican' where player_id = 936101;
set local role authenticated;
do $$
begin
  assert not vidi_izbranost(), 'V: preklic vzame dostop';
  assert (select owners is null from player_standings where id = 936101), 'V: po preklicu owners NULL';
end;
$$;
reset role;

rollback;
