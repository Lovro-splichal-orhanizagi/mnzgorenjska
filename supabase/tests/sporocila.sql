-- Zasebna sporočila in mesečni ogledi profila (20261109190000, 20261109191000, SLF-373).
-- Teče v transakciji in se povrne.
--
-- V: preverjen odrasel (937101), P: potrjen, ni preverjen (937102),
-- M: preverjen, a z mladinsko povezano vrstico (937103 + 937104),
-- F: navaden uporabnik brez profila, AD: admin.
begin;

insert into settings (key, value) values ('preverjeni_racuni', '2')
  on conflict (key) do update set value = '2';

insert into auth.users (id, email, raw_user_meta_data)
select ('e3700000-0000-4000-8000-0000000000' || k)::uuid, 'spo-' || k || '@test.invalid',
       jsonb_build_object('display_name', 'Spo ' || k)
  from (values ('01'), ('02'), ('03'), ('04'), ('06')) v(k);
-- 01 V, 02 P, 03 M, 04 F, 06 AD
update profiles set is_admin = true where id = 'e3700000-0000-4000-8000-000000000006';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (937001, 'test-spo-a', 'Spo A', 'SA', false, (select id from countries where code = 'SI'), 'mnzg'),
       (937002, 'test-spo-mladinci', 'Spo M', 'SM', false, (select id from countries where code = 'SI'), 'mnzg');
insert into teams (id, name, country_id) overriding system value
values (937011, 'NK Spo', (select id from countries where code = 'SI'));
insert into players (id, team_id, competition_id, first_name, last_name, position, position_source, value, value_start, active) overriding system value
values (937101, 937011, 937001, 'Vid', 'Spo', 'MID', 'admin', 5, 5, true),
       (937102, 937011, 937001, 'Pia', 'Spo', 'DEF', 'admin', 5, 5, true),
       (937103, 937011, 937001, 'Mia', 'Spo', 'FWD', 'admin', 5, 5, true),
       (937104, 937011, 937002, 'Mia', 'Spo', 'FWD', 'admin', 5, 5, true);
insert into zahtevki_igralca (id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (937201, 937101, 'e3700000-0000-4000-8000-000000000001', 'potrjen', 'admin', now()),
       (937202, 937102, 'e3700000-0000-4000-8000-000000000002', 'potrjen', 'admin', now()),
       (937203, 937103, 'e3700000-0000-4000-8000-000000000003', 'potrjen', 'admin', now());
insert into povezani_igralci (player_id, zahtevek_id) values (937104, 937203);
insert into preverjeni_racuni (user_id, player_id, vir, status, velja_do, star_vsaj_18, odpoved_pravici)
values ('e3700000-0000-4000-8000-000000000001', 937101, 'rocno', 'aktiven', null, null, null),
       ('e3700000-0000-4000-8000-000000000003', 937103, 'rocno', 'aktiven', null, null, null);

create temp table r (k text primary key, v text);
grant all on r to anon, authenticated;

-- Gost: ne sme pisati, ogled se šteje kot `gost`.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into r values ('gost_sme', public.sporocila_sme_pisati(937101));
select public.zabelezi_ogled_profila(937101, false);
select public.zabelezi_ogled_profila(937101, true);
reset role;

set local role authenticated;
do $$
declare
  v_id bigint;
  v_vp bigint;
  v_msg bigint;
  v_napaka text;
begin
  -- F (nepreverjen) → P (nepreverjen): ne.
  perform set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000004', true);
  insert into r values ('f_p', public.sporocila_sme_pisati(937102));
  begin
    perform public.sporocila_zacni(937102);
    insert into r values ('f_p_zacni', 'uspelo');
  exception when others then
    get stacked diagnostics v_napaka = pg_exception_hint;
    insert into r values ('f_p_zacni', v_napaka);
  end;
  -- F → V (preverjen): da. Ogled F šteje kot `igra`.
  insert into r values ('f_v', coalesce(public.sporocila_sme_pisati(937101), 'da'));
  perform public.zabelezi_ogled_profila(937101, false);
  v_id := public.sporocila_zacni(937101);
  perform public.sporocila_poslji(v_id, 'Živjo, dober gol v soboto!');
  insert into r values ('f_v_isti', (public.sporocila_zacni(937101) = v_id)::text);
  -- F → M (preverjen, mladinska vrstica): ne.
  insert into r values ('f_m', public.sporocila_sme_pisati(937103));

  -- V: neprebrano, prebere, odgovori; V → P (nepreverjen) sme.
  perform set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000001', true);
  perform public.zabelezi_ogled_profila(937101, false); -- lasten ogled se ne šteje
  insert into r values ('v_neprebrana', public.sporocila_neprebrana()::text);
  insert into r values ('v_bere', (select count(*)::text from public.sporocila_pogovora(v_id)));
  insert into r values ('v_neprebrana_po', public.sporocila_neprebrana()::text);
  perform public.sporocila_poslji(v_id, 'Hvala!');
  insert into r values ('v_p', coalesce(public.sporocila_sme_pisati(937102), 'da'));
  v_vp := public.sporocila_zacni(937102);
  v_msg := public.sporocila_poslji(v_vp, 'Pridi na trening.');
  insert into r values ('v_m', public.sporocila_sme_pisati(937103));
  insert into r values ('v_pogovorov', (select count(*)::text from public.sporocila_pogovori()));
  insert into r values ('v_ogledi', (select gost || '/' || igra || '/' || povezava
                                       from public.mesecni_ogledi_profila(937101)
                                      where mesec = date_trunc('month', current_date)::date));

  -- P odgovori V (V je preverjen), prijavi sporočilo, izklopi sporočila.
  perform set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000002', true);
  perform public.sporocila_poslji(v_vp, 'Pridem.');
  perform public.sporocila_prijavi(v_msg, 'test');
  insert into r values ('p_ogledi', (select count(*)::text from public.mesecni_ogledi_profila(937102)));
  perform public.sporocila_izklopi(true);

  -- F ne bere tujega pogovora in ne prijavi tujega sporočila.
  perform set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000004', true);
  insert into r values ('f_tuje', (select count(*)::text from public.sporocila_pogovora(v_vp)));
  insert into r values ('f_ogledi', (select count(*)::text from public.mesecni_ogledi_profila(937101)));
  begin
    perform public.sporocila_poslji(v_vp, 'vrinem se');
    insert into r values ('f_vrine', 'uspelo');
  exception when others then
    get stacked diagnostics v_napaka = pg_exception_hint;
    insert into r values ('f_vrine', v_napaka);
  end;

  -- V: P je izklopil sporočila; V blokira F, F ne more več pisati.
  perform set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000001', true);
  insert into r values ('v_p_izklop', public.sporocila_sme_pisati(937102));
  perform public.sporocila_blokiraj(v_id, true);
  perform set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000004', true);
  begin
    perform public.sporocila_poslji(v_id, 'še enkrat');
    insert into r values ('f_blokiran', 'uspelo');
  exception when others then
    get stacked diagnostics v_napaka = pg_exception_hint;
    insert into r values ('f_blokiran', v_napaka);
  end;

  -- Admin vidi prijavo; neadmin ne.
  perform set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000006', true);
  insert into r values ('ad_prijave', (select count(*)::text from public.admin_prijave_sporocil()));
end $$;
reset role;

-- Neposreden dostop do tabel je zaprt.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e3700000-0000-4000-8000-000000000001', true);
do $$
begin
  perform 1 from public.sporocila;
  insert into r values ('tabela', 'odprta');
exception when insufficient_privilege then
  insert into r values ('tabela', 'zaprta');
end $$;
reset role;

do $$
declare
  v_pricakovano jsonb := jsonb_build_object(
    'gost_sme', 'prijava',
    'f_p', 'preverjen', 'f_p_zacni', 'preverjen',
    'f_v', 'da', 'f_v_isti', 'true', 'f_m', 'mladinec',
    'v_neprebrana', '1', 'v_bere', '1', 'v_neprebrana_po', '0',
    'v_p', 'da', 'v_m', 'mladinec', 'v_pogovorov', '2',
    'v_ogledi', '1/1/1',
    'p_ogledi', '0', 'f_tuje', '0', 'f_ogledi', '0', 'f_vrine', 'ni_pogovora',
    'v_p_izklop', 'izklop', 'f_blokiran', 'blokada',
    'ad_prijave', '1', 'tabela', 'zaprta');
  v_k text;
  v_dobljeno text;
begin
  for v_k in select jsonb_object_keys(v_pricakovano) loop
    select v into v_dobljeno from r where k = v_k;
    if v_dobljeno is distinct from v_pricakovano ->> v_k then
      raise exception 'sporocila: % je %, pričakovano %', v_k, coalesce(v_dobljeno, 'NULL'), v_pricakovano ->> v_k;
    end if;
  end loop;
  raise notice 'sporocila: vse OK (%)', (select count(*) from r);
end $$;

rollback;
