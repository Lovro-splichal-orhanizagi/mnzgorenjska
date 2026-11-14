-- Plakati 40 × 60 cm (20261109194000, SLF-373): naročilo le ob aktivni
-- doživljenjski pravici te seje, idempotentno, brez naslova nič, admin vidi.
-- Teče v transakciji in se povrne.
begin;

insert into auth.users (id, email)
values ('e3a00000-0000-4000-8000-000000000001', 'plk-v@test.invalid'),
       ('e3a00000-0000-4000-8000-000000000006', 'plk-ad@test.invalid');
update profiles set is_admin = true where id = 'e3a00000-0000-4000-8000-000000000006';
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (939001, 'test-plk', 'PLK', 'PL', false, (select id from countries where code = 'SI'), 'mnzg');
insert into teams (id, name, country_id) overriding system value values (939011, 'NK Plakat', (select id from countries where code = 'SI'));
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (939101, 939011, 939001, 'Pia', 'Plakat', 'Pia Plakat', 'MID', 'admin', 5, 5, true);
insert into zahtevki_igralca (id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (939201, 939101, 'e3a00000-0000-4000-8000-000000000001', 'potrjen', 'admin', now());
insert into preverjeni_racuni (user_id, player_id, vir, status, velja_do, star_vsaj_18, odpoved_pravici, stripe_checkout_id)
values ('e3a00000-0000-4000-8000-000000000001', 939101, 'dozivljenjska', 'aktiven', null, true, true, 'cs_test_plakat');

create temp table r (k text primary key, v text);
grant all on r to authenticated;
do $$
declare
  v_naslov jsonb := '{"name":"Pia Plakat","line1":"Cesta 1","postal_code":"4000","city":"Kranj","country":"SI"}';
begin
  insert into r values ('prvic', public.plakat_iz_placila('cs_test_plakat', v_naslov));
  insert into r values ('drugic', public.plakat_iz_placila('cs_test_plakat', v_naslov));
  insert into r values ('vrstic', (select count(*)::text from narocila_plakatov where stripe_checkout_id = 'cs_test_plakat'));
  insert into r values ('tuja_seja', public.plakat_iz_placila('cs_test_drugo', v_naslov));
  insert into r values ('brez_naslova', public.plakat_iz_placila('cs_test_plakat', '{"country":"SI"}'));
end $$;

set local role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', 'e3a00000-0000-4000-8000-000000000001', true);
  begin
    perform public.admin_narocila_plakatov();
    insert into r values ('kupec_vrsta', 'uspelo');
  exception when others then
    insert into r values ('kupec_vrsta', 'zavrnjeno');
  end;
  begin
    perform public.plakat_iz_placila('cs_test_plakat', '{}');
    insert into r values ('kupec_zapis', 'uspelo');
  exception when insufficient_privilege then
    insert into r values ('kupec_zapis', 'zavrnjeno');
  end;
  perform set_config('request.jwt.claim.sub', 'e3a00000-0000-4000-8000-000000000006', true);
  insert into r values ('ad_vrsta', (select n.naslov ->> 'city' from public.admin_narocila_plakatov() n where n.igralec = 939101));
  perform public.admin_nastavi_narocilo_plakata((select id from public.admin_narocila_plakatov() n where n.igralec = 939101), 'poslano');
  insert into r values ('ad_poslano', (select (n.poslano_at is not null)::text from public.admin_narocila_plakatov() n where n.igralec = 939101));
end $$;
reset role;

do $$
declare
  v_pricakovano jsonb := jsonb_build_object(
    'prvic', 'plakat', 'drugic', 'plakat', 'vrstic', '1', 'tuja_seja', 'brez pravice', 'brez_naslova', 'brez naslova',
    'kupec_vrsta', 'zavrnjeno', 'kupec_zapis', 'zavrnjeno', 'ad_vrsta', 'Kranj', 'ad_poslano', 'true');
  v_k text;
  v_dobljeno text;
begin
  for v_k in select jsonb_object_keys(v_pricakovano) loop
    select v into v_dobljeno from r where k = v_k;
    if v_dobljeno is distinct from v_pricakovano ->> v_k then
      raise exception 'plakati: % je %, pričakovano %', v_k, coalesce(v_dobljeno, 'NULL'), v_pricakovano ->> v_k;
    end if;
  end loop;
  raise notice 'plakati: vse OK (%)', (select count(*) from r);
end $$;

rollback;
