-- Popravki podatkov (20261025150100): uporabnik prijavi, klub ali admin
-- odloči, sprejeta asistenca preživi zamenjavo golov ob uvozu.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e001', 'klub-popravki@test.invalid'),
  ('00000000-0000-0000-0000-00000000e002', 'navijac-popravki@test.invalid'),
  ('00000000-0000-0000-0000-00000000e003', 'admin-popravki@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000e001', 'Klub popravki'),
  ('00000000-0000-0000-0000-00000000e002', 'Navijac popravki'),
  ('00000000-0000-0000-0000-00000000e003', 'Admin popravki')
on conflict (id) do nothing;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000e003';
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (990201, 'test-popravki', 'Test popravki', 'TP', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values (990211, 'NK Popravki', 1), (990212, 'NK Gost', 1);
insert into rounds (id, competition_id, season, number) overriding system value
values (990221, 990201, sezona_lige(990201), 1);
insert into matches (id, round_id, home_team_id, away_team_id) overriding system value values (990231, 990221, 990211, 990212);
insert into players (id, competition_id, team_id, full_name, last_name, first_name, position) overriding system value values
  (990241, 990201, 990211, 'Novak Peter', 'Novak', 'Peter', 'FWD'),
  (990242, 990201, 990211, 'Kos Jan', 'Kos', 'Jan', 'MID'),
  (990243, 990201, 990212, 'Zunaj Luka', 'Zunaj', 'Luka', 'MID');
insert into appearances (match_id, player_id, team_id, minutes_played, goals) values
  (990231, 990241, 990211, 90, 1),
  (990231, 990242, 990211, 90, 0),
  (990231, 990243, 990212, 90, 0);
insert into goals (id, match_id, scorer_id, team_id, minute) overriding system value
values (990251, 990231, 990241, 990211, 10);
insert into klubski_racuni (user_id, team_id) values ('00000000-0000-0000-0000-00000000e001', 990211);

-- Brez prijave ni ničesar.
set local role anon;
do $$
begin
  begin
    perform prijavi_popravek('odhod', 990242);
    raise exception 'anon je prijavil';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Navijač prijavi; popravek čaka, podatki ostanejo.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e002', true);
do $$
declare
  v_napaka text;
begin
  assert prijavi_popravek('asistenca', p_goal_id => 990251, p_asistent_id => 990242) = 'caka', 'asistenca čaka';
  assert (select assist_player_id from goals where id = 990251) is null, 'gol nespremenjen';

  begin
    perform prijavi_popravek('asistenca', p_goal_id => 990251, p_asistent_id => 990242);
    raise exception 'dvojnik ni zavrnjen';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Tak popravek že čaka%', 'dvojnik: ' || v_napaka;

  begin
    perform prijavi_popravek('asistenca', p_goal_id => 990251, p_asistent_id => 990243);
    raise exception 'tuj podajalec ni zavrnjen';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Podajalec mora%', 'tuj podajalec: ' || v_napaka;

  begin
    perform prijavi_popravek('pozicija', 990243, 'XX');
    raise exception 'pozicija ni zavrnjena';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Pozicija je%', 'pozicija: ' || v_napaka;

  assert prijavi_popravek('pozicija', 990243, 'DEF', p_opomba => 'igra zadaj') = 'caka', 'pozicija čaka';
end;
$$;

-- Šifri popravkov za preizkuse odločanja (tabela je vlogi zaprta).
reset role;
select set_config('test.asistenca', (select id::text from popravki_podatkov where vrsta = 'asistenca' and match_id = 990231), true);
select set_config('test.pozicija', (select id::text from popravki_podatkov where vrsta = 'pozicija' and player_id = 990243), true);
set local role authenticated;
do $$
begin
  begin
    perform odloci_popravek(current_setting('test.asistenca')::bigint, true);
    raise exception 'navijač je odločil';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform popravki_v_pregledu(990211);
    raise exception 'navijač bere pregled';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Klub odloči o svojem, tujega ne vidi in ne odloča.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);
do $$
declare
  v_id bigint;
begin
  assert (select count(*) from popravki_v_pregledu(990211)) = 1, 'klub vidi svojega';
  select p.id into v_id from popravki_v_pregledu(990211) p;
  assert v_id = current_setting('test.asistenca')::bigint, 'klub vidi asistenco';
  perform odloci_popravek(v_id, true);
  assert (select assist_player_id from goals where id = 990251) = 990242, 'asistenca uveljavljena';

  begin
    perform odloci_popravek(current_setting('test.pozicija')::bigint, true);
    raise exception 'klub je odločil o tujem';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform popravki_v_pregledu(990212);
    raise exception 'klub bere tuj pregled';
  exception when insufficient_privilege then
    null;
  end;

  -- Klub o svojem igralcu velja takoj (brez roka v 24 urah).
  assert prijavi_popravek('odhod', 990242, p_opomba => 'prestop') = 'sprejet', 'odhod kluba velja';
  assert (select not active and odsel_at is not null from players where id = 990242), 'igralec odšel';
end;
$$;

-- Admin odloči o vsem.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e003","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e003', true);
do $$
begin
  assert (select count(*) from popravki_v_pregledu()) >= 1, 'admin vidi vse';
  perform odloci_popravek(current_setting('test.pozicija')::bigint, true);
  assert (select position || '|' || position_source from players where id = 990243) = 'DEF|admin', 'pozicija admina';
end;
$$;

-- Uvoz zamenja gole (nova vrstica): sprejeta asistenca se vpiše nazaj.
reset role;
select zamenjaj_nastope_tekme(
  990231,
  '[{"player_id":990241,"team_id":990211,"minutes_played":90,"goals":1},
    {"player_id":990242,"team_id":990211,"minutes_played":90},
    {"player_id":990243,"team_id":990212,"minutes_played":90}]'::jsonb,
  '[{"scorer_id":990241,"team_id":990211,"minute":10}]'::jsonb
);
do $$
begin
  assert (select count(*) from goals where match_id = 990231) = 1, 'en gol';
  assert not exists (select 1 from goals where id = 990251), 'stari gol je zamenjan';
  assert (select assist_player_id from goals where match_id = 990231) = 990242, 'asistenca preživi uvoz';
  assert (select goal_id from popravki_podatkov where vrsta = 'asistenca' and match_id = 990231)
       = (select id from goals where match_id = 990231), 'popravek kaže na nov gol';
end;
$$;

-- Gol, ki ga vir premakne (druga minuta), ostane, kot pravi vir.
select zamenjaj_nastope_tekme(
  990231,
  '[{"player_id":990241,"team_id":990211,"minutes_played":90,"goals":1},
    {"player_id":990242,"team_id":990211,"minutes_played":90}]'::jsonb,
  '[{"scorer_id":990241,"team_id":990211,"minute":11}]'::jsonb
);
do $$
begin
  assert (select assist_player_id from goals where match_id = 990231) is null, 'drug gol brez popravka';
end;
$$;

-- Omejen račun ne prijavlja.
insert into omejitve_uporabnikov (user_id, velja_do, razlog)
values ('00000000-0000-0000-0000-00000000e002', now() + interval '1 day', 'test');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e002', true);
do $$
declare
  v_napaka text;
begin
  begin
    perform prijavi_popravek('pozicija', 990241, 'MID');
    raise exception 'omejen je prijavil';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Račun je omejen do%', 'omejen: ' || v_napaka;
end;
$$;

reset role;
do $$
begin
  assert not has_function_privilege('authenticated', 'uveljavi_popravek(bigint)', 'execute'), 'notranja zaprta';
  assert not has_function_privilege('anon', 'prijavi_popravek(text,bigint,text,bigint,bigint,text)', 'execute'), 'anon zaprt';
  assert not has_table_privilege('authenticated', 'popravki_podatkov', 'select'), 'tabela zaprta';
end;
$$;
select 'popravki-podatkov: ok';
rollback;
