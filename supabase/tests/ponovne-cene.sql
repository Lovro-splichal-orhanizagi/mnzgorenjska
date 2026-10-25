-- Plačljivo ponovno vrednotenje cene (20261025193100): kdo sme kupiti, da
-- plačilo in predlog ceno pustita, da jo premakne le admin, in okno roka.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e001', 'kupec@test.invalid'),
  ('00000000-0000-0000-0000-00000000e002', 'drugi@test.invalid'),
  ('00000000-0000-0000-0000-00000000e003', 'admin@test.invalid'),
  ('00000000-0000-0000-0000-00000000e004', 'omejen@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000e001', 'Kupec test'),
  ('00000000-0000-0000-0000-00000000e002', 'Drugi test'),
  ('00000000-0000-0000-0000-00000000e003', 'Admin test'),
  ('00000000-0000-0000-0000-00000000e004', 'Omejen test')
on conflict (id) do nothing;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000e003';
insert into omejitve_uporabnikov (user_id, velja_do, razlog)
values ('00000000-0000-0000-0000-00000000e004', now() + interval '7 days', 'test');

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value values
  (990101, 'test-ponovna-cena', 'Test liga', 'TL', false, 1, 'test'),
  (990102, 'test-ponovna-rok', 'Test liga rok', 'TR', false, 1, 'test'),
  (990103, 'test-ponovna-u19', 'Test liga U19', 'T19', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values (990111, 'NK Cena', 1);
insert into rounds (id, competition_id, season, number, deadline_at) overriding system value values
  (990121, 990101, sezona_lige(990101), 1, now() + interval '5 days'),
  (990122, 990102, sezona_lige(990102), 1, now() + interval '10 hours');
insert into players (id, competition_id, team_id, full_name, last_name, first_name, value, value_start) overriding system value values
  (990131, 990101, 990111, 'Kos Jan', 'Kos', 'Jan', 4.5, 4.5),
  (990132, 990101, 990111, 'Borza Ana', 'Borza', 'Ana', 6.0, 6.0),
  (990133, 990102, 990111, 'Rok Tim', 'Rok', 'Tim', 5.0, 5.0),
  (990134, 990103, 990111, 'Mlad Ivo', 'Mlad', 'Ivo', 4.5, 4.5);
insert into price_changes (player_id, round_id, old_value, new_value, form) values (990132, 990121, 6.0, 6.1, 0);
-- Vklop zahteva sestavljiv kader; za ta preizkus ga obidemo.
set local session_replication_role = replica;
update competitions set active = true where id in (990101, 990102, 990103);
set local session_replication_role = origin;
update settings set value = '2' where key = 'ponovna_cena';

-- Neprijavljen: stanje da, nakupa ne.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  assert (ponovna_cena_stanje(990131) ->> 'vidno')::boolean, 'stikalo 2: vidno';
  assert (ponovna_cena_stanje(990131) ->> 'centi')::int = 499, 'privzeta cena 4,99 €';
  begin
    perform ponovna_cena_pripravi(990131);
    raise exception 'anon je kupil';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Kupec: zahtevek, a tabele ne bere in ne piše, plačila in predloga ne označi.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);
do $$
declare
  v_id bigint;
  v_napaka text;
begin
  assert ponovna_cena_stanje(990131) ->> 'ovira' is null, 'igralec je na voljo';
  assert ponovna_cena_stanje(990132) ->> 'ovira' = 'borza', 'borza';
  assert ponovna_cena_stanje(990133) ->> 'ovira' = 'rok', 'rok kroga';
  assert ponovna_cena_stanje(990134) ->> 'ovira' = 'mladinska', 'mladinska liga';
  select zahtevek into v_id from ponovna_cena_pripravi(990131);
  assert v_id is not null, 'zahtevek';
  -- Ponoven poskusni klik (preklic Checkout) ne zapre lastnega igralca.
  select zahtevek into v_id from ponovna_cena_pripravi(990131);
  assert v_id is not null, 'ponovni poskus';

  begin
    perform ponovna_cena_pripravi(990132);
    raise exception 'borza ni zavrnjena';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Ponovno vrednotenje cene zdaj ni mogoče (borza)%', 'borza: ' || v_napaka;

  begin
    perform 1 from ponovne_cene;
    raise exception 'tabela berljiva';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into ponovne_cene (player_id, competition_id, user_id, stanje)
    values (990131, 990101, '00000000-0000-0000-0000-00000000e001', 'placano');
    raise exception 'tabela zapisljiva';
  exception when insufficient_privilege then null;
  end;
  begin
    perform ponovna_cena_iz_placila(v_id, '00000000-0000-0000-0000-00000000e001', 'cs_test', 'pi_test');
    raise exception 'kupec je označil plačilo';
  exception when insufficient_privilege then null;
  end;
  begin
    perform ponovna_cena_predlog(v_id, 'premaknjena', 4.5, 9.0, null);
    raise exception 'kupec je zapisal predlog';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Drug kupec istega igralca: odprta seja prvega ga drži.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e002', true);
do $$
declare
  v_napaka text;
begin
  begin
    perform ponovna_cena_pripravi(990131);
    raise exception 'dvojna seja';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like '%(nedavno)%', 'nedavno: ' || v_napaka;
end;
$$;

-- Omejen račun ne kupuje (sprožilec zavrni_omejenega; prost igralec).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e004","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e004', true);
reset role;
delete from ponovne_cene where player_id = 990131;
set local role authenticated;
do $$
declare
  v_napaka text;
begin
  begin
    perform ponovna_cena_pripravi(990131);
    raise exception 'omejen je kupil';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Račun je omejen do%', 'omejen: ' || v_napaka;
end;
$$;

-- Kupec znova; webhook (servis) označi plačilo, delovni tok predlog. Cena ostane.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);
create temp table t_zahtevek as select zahtevek from ponovna_cena_pripravi(990131);
reset role;
do $$
declare
  v_id bigint := (select zahtevek from t_zahtevek);
begin
  assert ponovna_cena_iz_placila(v_id, '00000000-0000-0000-0000-00000000e002', 'cs_x', 'pi_x') = 'za_vracilo:neznan', 'tuj kupec';
  assert ponovna_cena_iz_placila(v_id, '00000000-0000-0000-0000-00000000e001', 'cs_1', 'pi_1') = 'placano', 'plačano';
  assert ponovna_cena_iz_placila(v_id, '00000000-0000-0000-0000-00000000e001', 'cs_1', 'pi_1') = 'ze', 'ponovitev dogodka';
  assert (select count(*) from ponovne_cene_za_izracun() where zahtevek = v_id) = 1, 'v vrsti za izračun';
  assert ponovna_cena_predlog(v_id, 'premaknjena', 4.5, 5.5, '{"ciljna": 7.0}') = 'v_pregledu', 'predlog';
  assert ponovna_cena_predlog(v_id, 'premaknjena', 4.5, 5.5, null) = 'ze', 'predlog le enkrat';
  assert (select value from players where id = 990131) = 4.5, 'brez potrditve cena ostane';
  assert (ponovna_cena_stanje(990131) ->> 'v_pregledu')::boolean, 'stran: v pregledu';
end;
$$;

-- Kupec ne potrdi.
set local role authenticated;
do $$
begin
  begin
    perform admin_ponovna_cena_potrdi((select zahtevek from t_zahtevek));
    raise exception 'kupec je potrdil';
  exception when insufficient_privilege then null;
  end;
  begin
    perform admin_ponovne_cene();
    raise exception 'kupec bere seznam';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Admin: zastarel predlog zavrne, potrjen premakne ceno in sidro, zabeleži teden.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e003","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e003', true);
do $$
declare
  v_id bigint := (select zahtevek from t_zahtevek);
  v_napaka text;
begin
  assert (select count(*) from admin_ponovne_cene() where id = v_id) = 1, 'admin vidi zahtevek';
  update players set value = 5.0 where id = 990131;
  begin
    perform admin_ponovna_cena_potrdi(v_id);
    raise exception 'zastarel predlog potrjen';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Cena se je od predloga spremenila%', 'zastarel: ' || v_napaka;
  update players set value = 4.5 where id = 990131;

  assert admin_ponovna_cena_potrdi(v_id) = 'potrjeno', 'potrjeno';
  assert (select value || '|' || value_start || '|' || repriced_week from players where id = 990131)
       = '5.5|5.5|' || to_char(now() at time zone 'UTC', 'IYYY-"W"IW'), 'cena, sidro, teden';
  assert ponovna_cena_stanje(990131) -> 'zadnja' ->> 'nova' = '5.5', 'stran: zadnji izid';
  -- Ta teden prevrednoten: nov nakup ni mogoč.
  assert ponovna_cena_stanje(990131) ->> 'ovira' = 'ta_teden', 'tedenska meja';
end;
$$;
reset role;

-- Plačan zahtevek v oknu roka: predlog da, potrditev ne.
insert into ponovne_cene (player_id, competition_id, user_id, stanje, placano_at, izid, stara_cena, nova_cena)
values (990133, 990102, '00000000-0000-0000-0000-00000000e001', 'v_pregledu', now(), 'premaknjena', 5.0, 6.0);
create temp table t_rok as select id from ponovne_cene where player_id = 990133;
grant select on t_rok, t_zahtevek to authenticated;
set local role authenticated;
do $$
declare
  v_napaka text;
begin
  begin
    perform admin_ponovna_cena_potrdi((select id from t_rok));
    raise exception 'potrjeno v oknu roka';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Rok kroga je manj kot 24 ur stran%', 'rok: ' || v_napaka;
  perform admin_ponovna_cena_zavrni((select id from t_rok), 'vrnjeno v Stripe');
end;
$$;
reset role;
do $$
begin
  assert (select stanje || '|' || opomba from ponovne_cene where player_id = 990133) = 'zavrnjeno|vrnjeno v Stripe', 'zavrnjeno';
  assert (select value from players where id = 990133) = 5.0, 'zavrnitev pusti ceno';
end;
$$;

select 'ponovne-cene: ok';
rollback;
