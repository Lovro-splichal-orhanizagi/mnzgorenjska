-- Dnevna triaža (20261114150100, SLF-260): spori, mladinci brez potrdila,
-- dvojni zahtevki, povabilo ni dokaz, zadržanje 3 dni in prijatelj, preklican
-- klubski račun, suhi tek, idempotenca, razveljavitev in besedilo brez
-- osebnih podatkov. Teče v transakciji in se povrne.
begin;
set local statement_timeout = '30s';

create function pg_temp.u(n int) returns uuid language sql immutable as $$
  select ('a9600000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value values
  (-960001, 'test-triaza', 'Triaža test', 'TT', false, (select id from countries where code = 'SI'), 'mnzg'),
  (-960002, 'test-triaza-mladinci', 'Triaža mladinci', 'TM', false, (select id from countries where code = 'SI'), 'mnzg');
insert into teams (id, name, short_name, country_id) overriding system value values
  (-960001, 'NK Triaža', 'TRI', (select id from countries where code = 'SI')),
  (-960002, 'NK Poln', 'POL', (select id from countries where code = 'SI'));
-- 1–20 člani, 21 mladinec, 30–31 potrjeni soigralci (vrstici potrjevalcev).
insert into players (id, team_id, competition_id, first_name, last_name, position, value, value_start) overriding system value
select -960000 - n, -960001, case when n = 21 then -960002 else -960001 end, 'Triaza', n::text, 'MID', 6, 6
  from generate_series(1, 40) n;

-- Uporabniki: 1–9 prosilci, 10–19 potrjevalci, 20–29 prijatelji,
-- 40–49 klubski, 99 admin.
insert into auth.users (id, email, raw_user_meta_data, created_at, email_confirmed_at)
select pg_temp.u(n), 'triaza-' || n || '@example.invalid', '{"display_name":"Triaza Oseba"}', now() - interval '60 days', now() - interval '60 days'
  from unnest(array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,20,21,22,40,41,42,43,44,45,46,47,48,49,99]) n;
update profiles set is_admin = true where id = pg_temp.u(99);

-- Potrjevalci 10–14 so potrjeni igralci istega kluba in lige.
insert into zahtevki_igralca (player_id, user_id, status, potrdil, decided_at)
select -960030 - (n - 10), pg_temp.u(n), 'potrjen', 'admin', now() - interval '30 days' from generate_series(10, 14) n;

-- Prijatelji 20–22 imajo pravo (nehišno) ekipo.
insert into fantasy_teams (owner_id, name, competition_id)
select pg_temp.u(n), 'Prijatelj ' || n, -960001 from generate_series(20, 22) n;

-- Zahtevki (id = -960100 - prosilec):
--  1: brez dokaza, star 10 dni           → caka_potrditev (po 3 dneh nič)
--  2 in 3: isti igralec                  → oba spor (dvojni zahtevek)
--  4: mladinec brez potrdila 16 let      → mladinski_brez_potrdila
--  5: dva neodvisna soigralca, 1 dan     → zadrzan
--  6: dva soigralca, 1 dan, nov prijatelj → potrdi
--  7: dva soigralca, 5 dni               → potrdi
--  8: soigralca, eden je prosilčev povabljenec → caka_potrditev
--  9: le kvalificiran prijatelj, brez soigralcev → caka_potrditev
insert into zahtevki_igralca (id, player_id, user_id, created_at, star_vsaj_16) overriding system value values
  (-960101, -960001, pg_temp.u(1), now() - interval '10 days', null),
  (-960102, -960002, pg_temp.u(2), now() - interval '2 days', null),
  (-960103, -960002, pg_temp.u(3), now() - interval '1 day', null),
  (-960104, -960021, pg_temp.u(4), now() - interval '5 days', null),
  (-960105, -960005, pg_temp.u(5), now() - interval '1 day', null),
  (-960106, -960006, pg_temp.u(6), now() - interval '1 day', null),
  (-960107, -960007, pg_temp.u(7), now() - interval '5 days', null),
  (-960108, -960008, pg_temp.u(8), now() - interval '5 days', null),
  (-960109, -960009, pg_temp.u(9), now() - interval '5 days', null);
update zahtevki_igralca set spor = true where id in (-960102, -960103);
insert into potrditve_soigralcev (zahtevek_id, user_id, player_id) values
  (-960105, pg_temp.u(10), -960030), (-960105, pg_temp.u(11), -960031),
  (-960106, pg_temp.u(10), -960030), (-960106, pg_temp.u(12), -960032),
  (-960107, pg_temp.u(11), -960031), (-960107, pg_temp.u(13), -960033),
  (-960108, pg_temp.u(12), -960032), (-960108, pg_temp.u(14), -960034);
-- Povabila: 6 in 9 dobita kvalificiranega prijatelja PO oddaji zahtevka,
-- 14 je povabljenec prosilca 8 (ni neodvisen).
insert into povabila (povabljeni, povabil) values
  (pg_temp.u(20), pg_temp.u(6)), (pg_temp.u(21), pg_temp.u(9)), (pg_temp.u(14), pg_temp.u(8));

-- Prijava lažnega profila na potrjenega 13.
insert into prijave_profila_igralca (zahtevek_id, user_id, razlog)
select id, pg_temp.u(1), 'to ni on' from zahtevki_igralca where user_id = pg_temp.u(13) and status = 'potrjen';

-- Klubi: NK Poln ima 5 računov (40–44), 44 je preklican → prostor za enega.
insert into klubski_racuni (user_id, team_id, preklican_at)
select pg_temp.u(n), -960002, case when n = 44 then now() - interval '1 day' end from generate_series(40, 44) n;
insert into klub_stik (id, team_id, klub, drzava, email, stanje) overriding system value values
  (-960045, -960002, 'NK Poln', 'SI', 'triaza-45@example.invalid', 'sodeluje'),
  (-960046, -960002, 'NK Poln', 'SI', 'triaza-44@example.invalid', 'sodeluje'),
  (-960047, null,    'Neznan',  'SI', 'triaza-47@example.invalid', 'nov');
--  45: poln klub, zdaj prostor, potrjen uradni naslov → izdaj
--  44: poln klub, a račun mu je admin preklical       → preklican
--  46: prošnja za nov naslov                           → nov_naslov
--  47: naslov brez kluba                               → brez_kluba
insert into klubski_zahtevki (id, user_id, email, vrsta, team_id, klub_stik_id) overriding system value values
  (-960245, pg_temp.u(45), 'triaza-45@example.invalid', 'polno', -960002, -960045),
  (-960244, pg_temp.u(44), 'triaza-44@example.invalid', 'polno', -960002, -960046),
  (-960246, pg_temp.u(46), 'triaza-46@example.invalid', 'nov_naslov', -960002, null),
  (-960247, pg_temp.u(47), 'triaza-47@example.invalid', 'brez_kluba', null, -960047);

insert into poznavalec_prosnje (id, user_id, competition_id, team_id, vloga) overriding system value
values (-960301, pg_temp.u(48), -960001, -960001, 'igralec');

create function pg_temp.raz(p_vrsta text, p_id bigint) returns text language sql as $$
  select razvrstitev from triaza_postavke
   where vrsta = p_vrsta and predmet_id = p_id and tek_id = (select max(id) from triaza_teki)
$$;
create function pg_temp.stanje() returns text language sql as $$
  select string_agg(id || ':' || status, ',' order by id) from (
    select id, status from zahtevki_igralca where id between -960199 and -960100
    union all select id, status from klubski_zahtevki where id between -960299 and -960200) s
$$;
create temporary table prej as select pg_temp.stanje() s;

-- 1) Suhi tek: razvrsti, nič ne spremeni.
do $$
declare r jsonb;
begin
  r := dnevna_triaza(true);
  assert (r->>'suho')::boolean and not (r->>'samodejno')::boolean, 'suhi tek';
  assert pg_temp.stanje() = (select s from prej), 'suhi tek ne spremeni zahtevkov';
  assert pg_temp.raz('prevzem', -960101) = 'caka_potrditev', 'brez dokaza po 10 dneh ostane (ni samodejne potrditve)';
  assert pg_temp.raz('prevzem', -960102) = 'spor' and pg_temp.raz('prevzem', -960103) = 'spor', 'dvojni zahtevek je spor';
  assert pg_temp.raz('prevzem', -960104) = 'mladinski_brez_potrdila', 'mladinec brez potrdila 16 let';
  assert pg_temp.raz('prevzem', -960105) = 'zadrzan', 'dokaz, a 1 dan in brez prijatelja: zadržan';
  assert pg_temp.raz('prevzem', -960106) = 'potrdi', 'nov kvalificiran prijatelj skrajša čakanje';
  assert pg_temp.raz('prevzem', -960107) = 'potrdi', 'dokaz in 3 dni';
  assert pg_temp.raz('prevzem', -960108) = 'caka_potrditev', 'povabljenec prosilca ni neodvisen soigralec';
  assert pg_temp.raz('prevzem', -960109) = 'caka_potrditev', 'povabilo samo ni dokaz';
  assert pg_temp.raz('prijava', (select id from zahtevki_igralca where user_id = pg_temp.u(13) and status = 'potrjen')) = 'prijava', 'prijava gre človeku';
  assert pg_temp.raz('klubski', -960245) = 'izdaj', 'prostor v klubu: izdaj';
  assert pg_temp.raz('klubski', -960244) = 'preklican', 'preklican račun se ne obnovi';
  assert pg_temp.raz('klubski', -960246) = 'nov_naslov', 'nov naslov odloči človek';
  assert pg_temp.raz('klubski', -960247) = 'brez_kluba', 'naslov brez kluba odloči človek';
  assert pg_temp.raz('poznavalec', -960301) = 'prosnja', 'poznavalec vedno človeku';
  assert (r->>'predlogov')::int >= 3 and (r->>'potrjenih')::int = 0, 'suhi tek le predlaga';
  r := dnevna_triaza(true);
  assert pg_temp.stanje() = (select s from prej), 'ponovljen suhi tek ne spremeni ničesar';
end $$;

-- 2) Pravi tek z izklopljenimi dejanji (privzeto): povzetek, brez sprememb.
do $$
declare r jsonb; m text;
begin
  assert (select value from settings where key = 'triaza_samodejno') = 'false'::jsonb, 'privzeto izklopljeno';
  r := dnevna_triaza(false);
  assert not (r->>'samodejno')::boolean and pg_temp.stanje() = (select s from prej), 'izklopljeno: nič ne spremeni';
  m := (select sporocilo from triaza_teki where id = (r->>'tek')::bigint);
  assert m like '🗂️ Dnevna triaža%' and m like '%izklopljena%', 'sporočilo';
  assert m !~ '@' and m !~* 'triaza oseba|nk poln|nk triaža|example', 'sporočilo brez imen in naslovov';
  r := dnevna_triaza(false);
  assert (r->>'ponovljeno')::boolean, 'drugi pravi tek istega dne vrne prejšnji povzetek';
  assert (select count(*) from triaza_teki where not suho and dan = (now() at time zone 'Europe/Ljubljana')::date) = 1, 'en pravi tek na dan';
end $$;

-- 3) Vklopljena dejanja (testno pobrišemo današnji tek).
delete from triaza_teki where not suho;
update settings set value = 'true'::jsonb where key = 'triaza_samodejno';
do $$
declare r jsonb;
begin
  r := dnevna_triaza(false);
  assert (r->>'samodejno')::boolean, 'vklopljeno';
  assert (select status || potrdil from zahtevki_igralca where id = -960106) = 'potrjensoigralci', 'prijatelj + dokaz: potrjen';
  assert (select status from zahtevki_igralca where id = -960107) = 'potrjen', 'dokaz + 3 dni: potrjen';
  assert (select status from zahtevki_igralca where id = -960105) = 'cakajoc', 'zadržan ostane';
  assert (select count(*) from zahtevki_igralca where id in (-960101, -960102, -960103, -960104, -960108, -960109) and status = 'cakajoc') = 6,
         'brez dokaza, spor, mladinec in povabilo ostanejo';
  assert (select status from klubski_zahtevki where id = -960245) = 'potrjen', 'klubski zahtevek potrjen';
  assert je_klubski_racun(pg_temp.u(45), -960002), 'klubski račun izdan';
  assert (select count(*) from klubski_zahtevki where id in (-960244, -960246, -960247) and status = 'odprt') = 3, 'ostali klubski ostanejo';
  assert not je_klubski_racun(pg_temp.u(44), -960002), 'preklican ne dobi računa';
  assert (select status from poznavalec_prosnje where id = -960301) = 'caka', 'poznavalec ostane';
  assert (r->>'potrjenih')::int >= 2 and (r->>'izdanih')::int >= 1 and (r->>'napak')::int = 0, 'povzetek dejanj';
end $$;

-- 4) Pravice: le admin razveljavi in bere dnevnik; navaden uporabnik ne.
select set_config('request.jwt.claim.sub', pg_temp.u(1)::text, true);
set local role authenticated;
do $$
begin
  begin
    perform admin_triaza(7);
    assert false, 'navaden uporabnik ne bere triaže';
  exception when insufficient_privilege then null;
  end;
  begin
    perform dnevna_triaza(false);
    assert false, 'navaden uporabnik ne požene triaže';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 5) Razveljavitev (admin): profil nazaj v čakanje, klubski račun preklican.
-- Id postavk preberemo pred menjavo vloge (dnevnik je zaprt za authenticated).
select set_config('triaza.p', (select id from triaza_postavke where vrsta = 'prevzem' and predmet_id = -960106 and uspelo)::text, true),
       set_config('triaza.k', (select id from triaza_postavke where vrsta = 'klubski' and predmet_id = -960245 and uspelo)::text, true),
       set_config('request.jwt.claim.sub', pg_temp.u(99)::text, true);
set local role authenticated;
select admin_triaza_razveljavi(current_setting('triaza.p')::bigint, 'test');
select admin_triaza_razveljavi(current_setting('triaza.k')::bigint, 'test');
-- Ponovna razveljavitev ni mogoča.
do $$
begin
  perform admin_triaza_razveljavi(current_setting('triaza.p')::bigint, null);
  assert false, 'dvakrat razveljavljeno';
exception when raise_exception then null;
end $$;
reset role;
do $$
begin
  assert (select status from zahtevki_igralca where id = -960106) = 'cakajoc', 'profil spet čaka';
  assert (select status from klubski_zahtevki where id = -960245) = 'odprt', 'klubski zahtevek spet odprt';
  assert not je_klubski_racun(pg_temp.u(45), -960002), 'račun preklican';
  assert (select count(*) from triaza_postavke where razveljavljeno_at is not null and predmet_id in (-960106, -960245)) = 2, 'zapis razveljavitve';
end $$;

do $$ begin raise notice 'dnevna-triaza: vse OK'; end $$;
rollback;
