-- Samodejni sprejem popravkov (20261113101100): preverjen igralec kluba velja
-- takoj, nepreverjeni šele ob soglasju; spor, admin/klub in odhod ostanejo
-- ročni; admin razveljavi. Teče v transakciji in se povrne.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f001', 'sam-preverjen@test.invalid'),
  ('00000000-0000-0000-0000-00000000f002', 'sam-navijac1@test.invalid'),
  ('00000000-0000-0000-0000-00000000f003', 'sam-navijac2@test.invalid'),
  ('00000000-0000-0000-0000-00000000f004', 'sam-navijac3@test.invalid'),
  ('00000000-0000-0000-0000-00000000f005', 'sam-admin@test.invalid'),
  ('00000000-0000-0000-0000-00000000f006', 'sam-tujec@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000f001', 'Sam preverjen'),
  ('00000000-0000-0000-0000-00000000f002', 'Sam navijac 1'),
  ('00000000-0000-0000-0000-00000000f003', 'Sam navijac 2'),
  ('00000000-0000-0000-0000-00000000f004', 'Sam navijac 3'),
  ('00000000-0000-0000-0000-00000000f005', 'Sam admin'),
  ('00000000-0000-0000-0000-00000000f006', 'Sam tujec')
on conflict (id) do nothing;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000f005';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (990301, 'test-samodejni', 'Test samodejni', 'TS', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values (990311, 'NK Domači', 1), (990312, 'NK Tuji', 1);
insert into rounds (id, competition_id, season, number) overriding system value
values (990321, 990301, sezona_lige(990301), 1);
insert into matches (id, round_id, home_team_id, away_team_id) overriding system value values (990331, 990321, 990311, 990312);
insert into players (id, competition_id, team_id, full_name, last_name, first_name, position, position_source) overriding system value values
  (990341, 990301, 990311, 'Sam Preverjeni', 'Sam', 'Preverjeni', 'FWD', 'ugibanje'),
  (990342, 990301, 990311, 'Kos Soigralec', 'Kos', 'Soigralec', 'FWD', 'ugibanje'),
  (990343, 990301, 990312, 'Tuj Igralec', 'Tuj', 'Igralec', 'FWD', 'ugibanje'),
  (990344, 990301, 990312, 'Tuj Zaklenjen', 'Tuj', 'Zaklenjen', 'FWD', 'admin'),
  (990345, 990301, 990311, 'Novak Strelec', 'Novak', 'Strelec', 'MID', 'ugibanje'),
  (990346, 990301, 990311, 'Breg Podajalec', 'Breg', 'Podajalec', 'MID', 'ugibanje'),
  (990347, 990301, 990312, 'Tuj Strelec', 'Tuj', 'Strelec', 'MID', 'ugibanje'),
  (990348, 990301, 990312, 'Tuj Podajalec', 'Tuj', 'Podajalec', 'MID', 'ugibanje'),
  (990349, 990301, 990312, 'Tuj Spor', 'Tuj', 'Spor', 'FWD', 'ugibanje');
insert into appearances (match_id, player_id, team_id, minutes_played, goals) values
  (990331, 990345, 990311, 90, 1),
  (990331, 990346, 990311, 90, 0),
  (990331, 990347, 990312, 90, 1),
  (990331, 990348, 990312, 90, 0);
insert into goals (id, match_id, scorer_id, team_id, minute) overriding system value values
  (990351, 990331, 990345, 990311, 10),
  (990352, 990331, 990347, 990312, 20);
-- f001 je preverjen igralec 990341 (NK Domači).
insert into zahtevki_igralca (player_id, user_id, status, potrdil)
values (990341, '00000000-0000-0000-0000-00000000f001', 'potrjen', 'admin');

create temp table _uporabnik (n int primary key, sub text);
insert into _uporabnik values
  (1, '00000000-0000-0000-0000-00000000f001'), (2, '00000000-0000-0000-0000-00000000f002'),
  (3, '00000000-0000-0000-0000-00000000f003'), (4, '00000000-0000-0000-0000-00000000f004'),
  (5, '00000000-0000-0000-0000-00000000f005'), (6, '00000000-0000-0000-0000-00000000f006');
create function pg_temp.kot(n int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', sub, 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', sub, true)
    from _uporabnik where _uporabnik.n = kot.n
$$;

set local role authenticated;

-- Preverjen igralec: svoja pozicija, soigralec in asistenca svojega kluba
-- veljajo takoj; tuj klub čaka; odhod soigralca čaka.
reset role; select pg_temp.kot(1); set local role authenticated;
do $$
begin
  assert prijavi_popravek('pozicija', 990341, 'MID') = 'sprejet', 'svoja pozicija';
  assert prijavi_popravek('pozicija', 990342, 'DEF') = 'sprejet', 'soigralec';
  assert prijavi_popravek('asistenca', p_goal_id => 990351, p_asistent_id => 990346) = 'sprejet', 'asistenca kluba';
  assert prijavi_popravek('pozicija', 990343, 'DEF') = 'caka', 'tuj klub čaka';
  assert prijavi_popravek('odhod', 990342) = 'caka', 'odhod čaka';
end;
$$;
reset role;
do $$
begin
  assert (select position || '|' || position_source from players where id = 990341) = 'MID|admin', 'svoja uveljavljena';
  assert (select position from players where id = 990342) = 'DEF', 'soigralec uveljavljen';
  assert (select assist_player_id from goals where id = 990351) = 990346, 'asistenca uveljavljena';
  assert (select position from players where id = 990343) = 'FWD', 'tuj nespremenjen';
  assert (select active from players where id = 990342), 'odhod ni uveljavljen';
  assert (select count(*) from popravki_samodejno where nacin = 'preverjen') = 3, 'trije zapisani';
end;
$$;

-- Soglasje: pozicija tujega igralca 990343 (f001 že predlaga DEF) velja ob
-- tretjem človeku; asistenca ob drugem.
set local role authenticated;
reset role; select pg_temp.kot(2); set local role authenticated;
do $$
begin
  assert prijavi_popravek('pozicija', 990343, 'DEF') = 'caka', 'drugi glas čaka';
  assert prijavi_popravek('asistenca', p_goal_id => 990352, p_asistent_id => 990348) = 'caka', 'prva asistenca čaka';
end;
$$;
reset role; select pg_temp.kot(3); set local role authenticated;
do $$
begin
  assert prijavi_popravek('pozicija', 990343, 'DEF') = 'sprejet', 'tretji glas sprejme';
  assert prijavi_popravek('asistenca', p_goal_id => 990352, p_asistent_id => 990348) = 'sprejet', 'druga asistenca sprejme';
end;
$$;
reset role;
do $$
begin
  assert (select position from players where id = 990343) = 'DEF', 'soglasje pozicije';
  assert (select assist_player_id from goals where id = 990352) = 990348, 'soglasje asistence';
  assert (select count(*) from popravki_podatkov where player_id = 990343 and stanje = 'sprejet') = 3, 'vsi trije zaprti';
  assert (select nacin from popravki_samodejno s join popravki_podatkov p on p.id = s.popravek
           where p.player_id = 990343) = 'soglasje', 'način soglasje';
end;
$$;

-- Spor: dva predloga za 990349 se razlikujeta, tretji enak prvemu ne sprejme.
-- Zaklenjena pozicija (vir admin) ostane ročna tudi ob soglasju.
set local role authenticated;
reset role; select pg_temp.kot(2); set local role authenticated;
select prijavi_popravek('pozicija', 990349, 'DEF');
select prijavi_popravek('pozicija', 990344, 'DEF');
reset role; select pg_temp.kot(3); set local role authenticated;
select prijavi_popravek('pozicija', 990349, 'MID');
select prijavi_popravek('pozicija', 990344, 'DEF');
reset role; select pg_temp.kot(4); set local role authenticated;
do $$
begin
  assert prijavi_popravek('pozicija', 990349, 'DEF') = 'caka', 'spor ostane ročen';
  assert prijavi_popravek('pozicija', 990344, 'DEF') = 'caka', 'zaklenjena ostane ročna';
end;
$$;
reset role;
do $$
begin
  assert (select position from players where id = 990349) = 'FWD', 'spor nespremenjen';
  assert (select position from players where id = 990344) = 'FWD', 'zaklenjen nespremenjen';
end;
$$;

-- Pravice: navijač ne vidi in ne razveljavi; admin razveljavi.
set local role authenticated;
reset role; select pg_temp.kot(6); set local role authenticated;
do $$
begin
  begin
    perform admin_samodejni_popravki();
    raise exception 'navijač bere seznam';
  exception when insufficient_privilege then null;
  end;
  begin
    perform admin_razveljavi_samodejni_popravek(1);
    raise exception 'navijač razveljavi';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
select set_config('test.poz', (select s.popravek::text from popravki_samodejno s join popravki_podatkov p on p.id = s.popravek where p.player_id = 990343), true);
select set_config('test.as', (select s.popravek::text from popravki_samodejno s join popravki_podatkov p on p.id = s.popravek where p.vrsta = 'asistenca' and p.match_id = 990331 and p.gol_strelec_id = 990347), true);
set local role authenticated;
reset role; select pg_temp.kot(5); set local role authenticated;
do $$
begin
  assert (select count(*) from admin_samodejni_popravki()) = 5, 'admin vidi pet';
  perform admin_razveljavi_samodejni_popravek(current_setting('test.poz')::bigint);
  perform admin_razveljavi_samodejni_popravek(current_setting('test.as')::bigint);
end;
$$;
reset role;
do $$
begin
  assert (select position || '|' || position_source from players where id = 990343) = 'FWD|ugibanje', 'pozicija vrnjena';
  assert (select assist_player_id from goals where id = 990352) is null, 'asistenca vrnjena';
  assert (select count(*) from popravki_podatkov where player_id = 990343 and stanje = 'zavrnjen') = 3, 'vsi zavrnjeni';
  assert (select count(*) from popravki_samodejno where razveljavljen_at is not null) = 2, 'dva razveljavljena';
end;
$$;

-- Uvoz golov razveljavljene asistence ne vpiše nazaj.
select zamenjaj_nastope_tekme(
  990331,
  '[{"player_id":990347,"team_id":990312,"minutes_played":90,"goals":1},
    {"player_id":990348,"team_id":990312,"minutes_played":90}]'::jsonb,
  '[{"scorer_id":990347,"team_id":990312,"minute":20}]'::jsonb
);
do $$
begin
  assert (select assist_player_id from goals where match_id = 990331) is null, 'razveljavljena ostane proč';
  assert not has_function_privilege('authenticated', 'popravek_samodejno(bigint)', 'execute'), 'notranja zaprta';
  assert not has_table_privilege('authenticated', 'popravki_samodejno', 'select'), 'tabela zaprta';
end;
$$;

select 'samodejni-popravki: ok';
rollback;
