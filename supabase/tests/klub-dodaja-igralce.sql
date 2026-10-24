-- Klubski računi, faza 3 (20261024123700): klub doda in odstrani igralca.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c001', 'klub@test.invalid'),
  ('00000000-0000-0000-0000-00000000c002', 'drugi@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000c001', 'Klub test'),
  ('00000000-0000-0000-0000-00000000c002', 'Drugi test')
on conflict (id) do nothing;
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (990001, 'test-klub-dodaja', 'Test liga', 'TL', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values (990011, 'NK Test', 1), (990012, 'NK Drugi', 1), (990013, 'NK Zunaj', 1);
insert into rounds (id, competition_id, season, number) overriding system value
values (990021, 990001, sezona_lige(990001), 1);
insert into matches (id, round_id, home_team_id, away_team_id) overriding system value values (990031, 990021, 990011, 990012);
insert into players (id, competition_id, team_id, full_name, last_name, first_name) overriding system value
values (990041, 990001, 990011, 'Novak Peter', 'Novak', 'Peter');
-- Vklop zahteva sestavljiv kader; za ta preizkus ga obidemo.
set local session_replication_role = replica;
update competitions set active = true where id = 990001;
set local session_replication_role = origin;
insert into klubski_racuni (user_id, team_id) values
  ('00000000-0000-0000-0000-00000000c001', 990011),
  ('00000000-0000-0000-0000-00000000c002', 990013);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c001', true);

do $$
declare
  v_id bigint;
  v_izid text;
  v_napaka text;
begin
  v_id := klub_dodaj_igralca(990001, 'Jan', 'Kos', 'MID', 8);
  assert (select full_name || '|' || position_source || '|' || value || '|' || active from players where id = v_id)
         = 'Kos Jan|klub|4.5|true', 'dodan igralec';

  -- Isto ime drugače zapisano je dvojnik.
  begin
    perform klub_dodaj_igralca(990001, 'Péter', 'NOVÁK', 'DEF');
    raise exception 'dvojnik ni zavrnjen';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Igralec s tem imenom%', 'dvojnik: ' || v_napaka;

  begin
    perform klub_dodaj_igralca(990001, 'Ana', 'Kos', 'XX');
    raise exception 'pozicija ni zavrnjena';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Pozicija je%', 'pozicija: ' || v_napaka;

  begin
    perform klub_dodaj_igralca(990001, 'Ana<script>', 'Kos', 'MID');
    raise exception 'znaki niso zavrnjeni';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Ime in priimek%', 'znaki: ' || v_napaka;

  assert (select count(*) from klub_dodani(990011)) = 1, 'seznam kluba';

  -- Brez lastnikov: izbrisan, a v dnevniku šteje v omejitev.
  v_izid := klub_odstrani_igralca(v_id);
  assert v_izid = 'izbrisan', 'odstranitev: ' || v_izid;
  assert not exists (select 1 from players where id = v_id), 'vrstica izbrisana';
  assert (select count(*) from klub_dodani(990011) where odstranjen is not null) = 1, 'odstranjen v seznamu';

  -- Uvoženega igralca klub ne odstrani.
  begin
    perform klub_odstrani_igralca(990041);
    raise exception 'uvožen igralec odstranjen';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Odstraniti je mogoče le%', 'uvožen: ' || v_napaka;

  -- Omejitev 25 na sezono, odstranjeni štejejo.
  for i in 2..25 loop
    perform klub_dodaj_igralca(990001, 'Igralec', 'Test' || chr(64 + i), 'FWD');
  end loop;
  begin
    perform klub_dodaj_igralca(990001, 'Zadnji', 'Prevec', 'FWD');
    raise exception 'omejitev ni prijela';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Klub je to sezono dodal že 25%', 'omejitev: ' || v_napaka;
end;
$$;

-- Račun kluba, ki v ligi ne igra.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c002', true);
do $$
declare
  v_napaka text;
begin
  begin
    perform klub_dodaj_igralca(990001, 'Jan', 'Tujec', 'MID');
    raise exception 'tuji klub ni zavrnjen';
  exception when others then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Klub v tej ligi letos ne igra%', 'tuji klub: ' || v_napaka;

  begin
    perform klub_dodani(990011);
    raise exception 'tuj seznam viden';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
select 'klub-dodaja-igralce: ok';
rollback;
