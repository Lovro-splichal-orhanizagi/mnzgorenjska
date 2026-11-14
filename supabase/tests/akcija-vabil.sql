-- Akcija vabil (20261114120000): štetje povabljenih z ekipo, bon za 3,
-- poraba bona enkrat, vrnitev ob zavrnitvi, javna lestvica brez admina.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000f001', 'vabi@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000f002', 'p1@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000f003', 'p2@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000f004', 'p3@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000f005', 'p4@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000f006', 'admin@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000f007', 'p5@test.invalid', now());
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000f001', 'Vabitelj'),
  ('00000000-0000-0000-0000-00000000f002', 'P1'),
  ('00000000-0000-0000-0000-00000000f003', 'P2'),
  ('00000000-0000-0000-0000-00000000f004', 'P3'),
  ('00000000-0000-0000-0000-00000000f005', 'P4 brez ekipe'),
  ('00000000-0000-0000-0000-00000000f006', 'Admin vabi'),
  ('00000000-0000-0000-0000-00000000f007', 'P5')
on conflict (id) do update set display_name = excluded.display_name;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000f006';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value values
  (990201, 'test-akcija-vabil', 'Test akcija', 'TA', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values (990211, 'NK Vabila', 1);
insert into rounds (id, competition_id, season, number, deadline_at) overriding system value values
  (990221, 990201, sezona_lige(990201), 1, now() + interval '5 days');
insert into players (id, competition_id, team_id, full_name, last_name, first_name, value, value_start) overriding system value values
  (990231, 990201, 990211, 'Bon Jan', 'Bon', 'Jan', 4.5, 4.5),
  (990232, 990201, 990211, 'Bon Ana', 'Bon', 'Ana', 5.0, 5.0);
set local session_replication_role = replica;
update competitions set active = true where id = 990201;
set local session_replication_role = origin;
update settings set value = '2' where key = 'ponovna_cena';

-- Trije prijatelji z ekipo, četrti brez; adminu en prijatelj.
insert into povabila (povabljeni, povabil) values
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f001'),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000f001'),
  ('00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-00000000f001'),
  ('00000000-0000-0000-0000-00000000f007', '00000000-0000-0000-0000-00000000f006');
insert into fantasy_teams (owner_id, competition_id, name) values
  ('00000000-0000-0000-0000-00000000f002', 990201, 'E1'),
  ('00000000-0000-0000-0000-00000000f003', 990201, 'E2'),
  ('00000000-0000-0000-0000-00000000f007', 990201, 'E5'),
  ('00000000-0000-0000-0000-00000000f001', 990201, 'Vabiteljeva');
-- Šteje le ekipa s kadrom.
insert into fantasy_roster (fantasy_team_id, player_id)
select id, 990231 from fantasy_teams where competition_id = 990201;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000f001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f001', true);
do $$
declare
  m jsonb := moje_vabilo();
  v_napaka text;
begin
  assert m ->> 'koda' ~ '^[a-z0-9]{8}$', 'koda';
  assert (m ->> 'registriranih')::int = 3, 'registriranih 3: ' || m;
  assert (m ->> 'pripeljanih')::int = 2, 'brez ekipe ne šteje: ' || m;
  -- Tekmovanje velja le v oknu akcije; po njem test ne sme pasti.
  if now() >= (akcija_vabil_okno()).od and now() < (akcija_vabil_okno()).do_ then
    assert (m ->> 'v_akciji')::int = 2 and (m ->> 'mesto')::int = 1, 'akcija: ' || m;
  end if;
  assert not (m ->> 'bon')::boolean, 'pod 3 ni bona';
  assert not (ponovna_cena_stanje(990231) ->> 'bon')::boolean, 'stran: ni bona';
  begin
    perform ponovna_cena_z_bonom(990231);
    raise exception 'bon brez treh';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Bona za ponovno vrednotenje nimaš%', 'brez bona: ' || v_napaka;
  -- Admin ni na javni lestvici.
  if now() >= (akcija_vabil_okno()).od and now() < (akcija_vabil_okno()).do_ then
    assert (select count(*) from lestvica_vabil()) = 1, 'lestvica brez admina';
    assert (select ime from lestvica_vabil() where mesto = 1) = 'Vabitelj', 'vodilni';
  end if;
  begin
    perform 1 from akcija_vabil_stevci();
    raise exception 'števci javni';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Tretji prijatelj sestavi ekipo: bon.
reset role;
insert into povabila (povabljeni, povabil) values ('00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-00000000f001');
insert into fantasy_teams (owner_id, competition_id, name) values ('00000000-0000-0000-0000-00000000f004', 990201, 'E3');
insert into fantasy_roster (fantasy_team_id, player_id)
select id, 990231 from fantasy_teams where owner_id = '00000000-0000-0000-0000-00000000f004';
set local role authenticated;
do $$
declare
  v_id bigint;
  v_napaka text;
begin
  assert (moje_vabilo() ->> 'bon')::boolean, 'bon pri treh';
  assert (ponovna_cena_stanje(990231) ->> 'bon')::boolean, 'stran: bon';
  v_id := ponovna_cena_z_bonom(990231);
  assert v_id is not null, 'zahtevek z bonom';
  assert (ponovna_cena_stanje(990231) ->> 'v_pregledu')::boolean, 'v pregledu';
  assert not (moje_vabilo() ->> 'bon')::boolean and (moje_vabilo() ->> 'bon_porabljen')::boolean, 'bon porabljen';
  begin
    perform ponovna_cena_z_bonom(990232);
    raise exception 'bon dvakrat';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Bona za ponovno vrednotenje nimaš%', 'drugič: ' || v_napaka;
end;
$$;

-- Zahtevek je v vrsti za izračun kot plačan; zavrnitev bon vrne.
reset role;
do $$
declare
  v_id bigint := (select id from ponovne_cene where player_id = 990231 and z_bonom);
begin
  assert (select stanje from ponovne_cene where id = v_id) = 'placano', 'brez Stripe naravnost v izračun';
  assert (select count(*) from ponovne_cene_za_izracun() where zahtevek = v_id) = 1, 'v vrsti za izračun';
  update ponovne_cene set stanje = 'zavrnjeno' where id = v_id;
  assert bon_ponovne_cene('00000000-0000-0000-0000-00000000f001'), 'zavrnitev vrne bon';
end;
$$;

-- Anon: lestvica da, moje_vabilo in bon ne.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  perform 1 from lestvica_vabil(); -- anon sme brati lestvico
  begin
    perform moje_vabilo();
    raise exception 'anon moje_vabilo';
  exception when insufficient_privilege then null;
  end;
  begin
    perform ponovna_cena_z_bonom(990231);
    raise exception 'anon bon';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Kandidati za pošto: le servis.
set local role authenticated;
do $$
begin
  begin
    perform 1 from kandidati_za_akcijo_vabil(10);
    raise exception 'kandidati javni';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
select count(*) >= 0 as kandidati_tecejo from kandidati_za_akcijo_vabil(10);

rollback;
