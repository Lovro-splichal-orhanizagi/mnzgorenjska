-- SLFF Scout, Ekipa (20261027180000): koledar, dogodki, prisotnost, kader selekcije.
-- Klub A (980011) ima naročnino in sedež a1; a2 je uradni račun brez sedeža;
-- b1 ima sedež kluba B (980012). Teče v transakciji in se povrne.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000e0a01', 'ekipa-a1@test.invalid'),
  ('00000000-0000-0000-0000-0000000e0a02', 'ekipa-a2@test.invalid'),
  ('00000000-0000-0000-0000-0000000e0b01', 'ekipa-b1@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000e0a01', 'Ekipa A1'),
  ('00000000-0000-0000-0000-0000000e0a02', 'Ekipa A2'),
  ('00000000-0000-0000-0000-0000000e0b01', 'Ekipa B1')
on conflict (id) do nothing;

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
select v.id, v.slug, v.name, 'T', false, (select id from countries where code = 'SI'), 'test'
  from (values (980001, 'test-ekipa-clani', 'Test člani'), (980002, 'test-ekipa-tuja', 'Test tuja')) v(id, slug, name);
insert into teams (id, name, country_id) overriding system value
select v.id, v.name, (select id from countries where code = 'SI')
  from (values (980011, 'NK A'), (980012, 'NK B'), (980013, 'NK C')) v(id, name);
insert into rounds (id, competition_id, season, number) overriding system value
values (980021, 980001, sezona_lige(980001), 1), (980022, 980002, sezona_lige(980002), 1);
insert into matches (id, round_id, home_team_id, away_team_id, played_on, home_goals, away_goals, imported_at) overriding system value
values (980031, 980021, 980011, 980012, '2026-10-11', 2, 1, now()),
       (980032, 980022, 980012, 980013, '2026-10-12', 0, 0, now());
-- 980041 viden, 980042 ugovor (lastni klub ga vidi), 980043 anonimiziran, 980044 pri B
insert into players (id, competition_id, team_id, full_name, first_name, last_name, position) overriding system value
values (980041, 980001, 980011, 'Kos Jan', 'Jan', 'Kos', 'MID'),
       (980042, 980001, 980011, 'Ugovor Ana', 'Ana', 'Ugovor', 'DEF'),
       (980043, 980001, 980011, 'Skrit Bor', 'Bor', 'Skrit', 'FWD'),
       (980044, 980001, 980012, 'Tuji Ivo', 'Ivo', 'Tuji', 'GK');
update players set anonimiziran_at = now() where id = 980043;
insert into appearances (match_id, player_id, team_id, started, minutes_played, goals, yellow_cards)
values (980031, 980041, 980011, true, 90, 1, 1),
       (980031, 980042, 980011, true, 90, 0, 0),
       (980031, 980043, 980011, false, 20, 0, 0),
       (980031, 980044, 980012, true, 90, 0, 2);
insert into scout.ugovori (player_id, kljuc) select k.player_id, k.kljuc from scout.kljuci_vrstic(array[980042::bigint]) k;

insert into klubski_racuni (user_id, team_id) values
  ('00000000-0000-0000-0000-0000000e0a01', 980011),
  ('00000000-0000-0000-0000-0000000e0a02', 980011),
  ('00000000-0000-0000-0000-0000000e0b01', 980012);
insert into scout.narocnine (team_id, country_id, paket, velja_do, pogoji_sprejeti_at)
select t.id, t.country_id, 'preizkus', now() + interval '14 days', now() from teams t where t.id in (980011, 980012);
insert into scout.sedezi (user_id, team_id) values
  ('00000000-0000-0000-0000-0000000e0a01', 980011),
  ('00000000-0000-0000-0000-0000000e0b01', 980012);
update scout.drzave set stanje = 'odprto' where country_id = (select id from countries where code = 'SI');

do $$
begin
  assert not has_function_privilege('anon', 'public.scout_koledar(date, date)', 'execute')
     and not has_function_privilege('anon', 'public.scout_shrani_prisotnost(bigint, jsonb)', 'execute')
     and has_function_privilege('authenticated', 'public.scout_ekipa(bigint)', 'execute')
     and not has_function_privilege('authenticated', 'scout.kader_selekcije(bigint, bigint, date, bigint)', 'execute')
     and not has_table_privilege('authenticated', 'scout.dogodki', 'select')
     and not has_table_privilege('authenticated', 'scout.prisotnost', 'insert'),
    'pravice: anon nič, brskalnik le RPC';
end;
$$;

-- a2: uradni račun brez sedeža → nič
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0a02', true);
do $$
begin
  begin
    perform scout_koledar('2026-10-01', '2026-10-31');
    raise exception 'brez sedeža koledar viden';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- a1: koledar, dogodek, serija, prisotnost, kader
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0a01', true);
do $$
declare
  k jsonb;
  e jsonb;
  v_id bigint;
  v_serija bigint;
  v_napaka text;
begin
  k := scout_koledar('2026-10-01', '2026-10-31');
  assert (select array_agg((s->>'competition_id')::bigint) from jsonb_array_elements(k->'selekcije') s) = array[980001::bigint],
    'selekcije: le tekmovanja kluba: ' || (k->'selekcije')::text;
  assert jsonb_array_length(k->'tekme') = 1 and (k->'tekme'->0->>'id')::bigint = 980031
     and (k->'tekme'->0->>'doma')::boolean and (k->'tekme'->0->>'nasprotnik') = 'NK B'
     and (k->'tekme'->0->>'za')::int = 2, 'koledar: tekma kluba z izidom';

  begin
    perform scout_koledar('2026-01-01', '2026-12-31');
    raise exception 'predolgo obdobje sprejeto';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Scout: neveljavno obdobje%', 'obdobje: ' || v_napaka;

  begin
    perform scout_shrani_dogodek(980002, 'trening', '2026-10-14 16:00+00', 90, 'x', null);
    raise exception 'tuja selekcija sprejeta';
  exception when insufficient_privilege then null;
  end;

  v_id := scout_shrani_dogodek(980001, 'trening', '2026-10-14 16:00+00', 90, '  Igrišče ', '');
  e := scout_dogodek(v_id);
  assert e->>'kraj' = 'Igrišče' and e->'opomba' = 'null'::jsonb, 'dogodek: kraj obrezan, prazna opomba null';
  assert (select array_agg((x->>'player_id')::bigint order by (x->>'player_id')::bigint) from jsonb_array_elements(e->'kader') x)
         = array[980041, 980042]::bigint[],
    'kader: z ugovorom (lastni klub), brez anonimiziranega in tujega: ' || (e->'kader')::text;

  -- serija čez premik ure (25. 10. 2026): ura ostane 18.00 po ljubljanskem času
  v_serija := scout_shrani_dogodek(980001, 'trening', '2026-10-20 16:00+00', 90, null, null, null, '2026-11-03');
  assert (select count(*) = 3 and bool_and(to_char(x.z at time zone 'Europe/Ljubljana', 'HH24:MI') = '18:00')
            from (select (d->>'zacetek')::timestamptz z
                    from jsonb_array_elements(scout_koledar('2026-10-15', '2026-11-10')->'dogodki') d
                   where d->>'serija' is not null) x),
    'serija: 3 tedni, vedno ob 18.00 krajevno';

  begin
    perform scout_shrani_dogodek(980001, 'trening', '2026-10-20 16:00+00', 90, null, null, null, '2028-01-01');
    raise exception '53+ ponovitev sprejetih';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like '%52%', 'največ 52: ' || v_napaka;

  begin
    perform scout_shrani_prisotnost(v_id, '[{"player_id": 980044, "stanje": "prisoten"}]');
    raise exception 'igralec drugega kluba sprejet';
  exception when insufficient_privilege then null;
  end;
  perform scout_shrani_prisotnost(v_id, '[{"player_id": 980042, "stanje": "prisoten"}]');
  perform scout_shrani_prisotnost(v_id, '[{"player_id": 980042, "stanje": null}]');
  begin
    perform scout_shrani_prisotnost(v_id, '[{"player_id": 980043, "stanje": "prisoten"}]');
    raise exception 'anonimiziran igralec sprejet';
  exception when insufficient_privilege then null;
  end;

  perform scout_shrani_prisotnost(v_id, '[{"player_id": 980041, "stanje": "prisoten"}]');
  assert (select x->>'stanje' from jsonb_array_elements(scout_dogodek(v_id)->'kader') x
           where (x->>'player_id')::bigint = 980041) = 'prisoten', 'prisotnost shranjena';
  perform scout_shrani_prisotnost(v_id, '[{"player_id": 980041, "stanje": null}]');
  assert (select x->'stanje' from jsonb_array_elements(scout_dogodek(v_id)->'kader') x
           where (x->>'player_id')::bigint = 980041) = 'null'::jsonb, 'null pobriše oznako';
  perform scout_shrani_prisotnost(v_id, '[{"player_id": 980041, "stanje": "opravicen"}]');

  e := scout_ekipa();
  assert (e->>'competition_id')::bigint = 980001 and jsonb_array_length(e->'igralci') = 2
     and exists (select 1 from jsonb_array_elements(e->'igralci') x
                  where (x->>'player_id')::bigint = 980041 and (x->>'minute')::int = 90
                    and (x->>'rumeni')::int = 1 and (x->>'goli')::int = 1),
    'kader: dejstva sezone: ' || (e->'igralci')::text;

  begin
    perform scout_ekipa(980002);
    raise exception 'tuja selekcija kadra';
  exception when insufficient_privilege then null;
  end;

  -- brisanje serije od drugega naprej pusti prvega
  select (d->>'id')::bigint into v_serija
    from jsonb_array_elements(scout_koledar('2026-10-15', '2026-11-10')->'dogodki') d
   where d->>'serija' is not null order by d->>'zacetek' offset 1 limit 1;
  assert scout_brisi_dogodek(v_serija, true) = 2, 'serija: izbrisana ta in prihodnji';
end;
$$;

-- b1: tuj dogodek ni viden in ga ne more spremeniti
reset role;
select set_config('test.dogodek', (select id::text from scout.dogodki where team_id = 980011 and serija is null), true);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0b01', true);
do $$
declare
  v_id bigint := current_setting('test.dogodek')::bigint;
begin
  begin
    perform scout_dogodek(v_id);
    raise exception 'tuj dogodek viden';
  exception when insufficient_privilege then null;
  end;
  begin
    perform scout_brisi_dogodek(v_id);
    raise exception 'tuj dogodek izbrisan';
  exception when insufficient_privilege then null;
  end;
  begin
    perform scout_shrani_dogodek(980001, 'trening', now(), 60, null, null, v_id);
    raise exception 'tuj dogodek spremenjen';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
do $$
begin
  assert (select count(*) from scout.dogodki where team_id = 980011) = 2, 'dogodki A: ostaneta 2';
  assert (select count(*) from scout.dnevnik where team_id = 980011 and vrsta in ('koledar', 'dogodek', 'ekipa')) > 0,
    'klici v dnevniku';
  assert (select parametri->'igralci' from scout.dnevnik where team_id = 980011 and vrsta = 'ekipa' order by id limit 1)
         = '[980041, 980042]'::jsonb, 'dnevnik kadra hrani vrnjene igralce';
  assert not exists (select 1 from scout.dnevnik where team_id = 980012), 'zavrnjeni klici niso v dnevniku';
end;
$$;

-- Neveljavni vnosi, meje začetka, prehod sezone, že označeni ostanejo v kadru.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0a01', true);
do $$
declare
  v_id bigint := scout_shrani_dogodek(980001, 'trening', now() + interval '1 day', 60, null, null);
  v_vnosi text;
  v_napaka text;
begin
  foreach v_vnosi in array array[
    '{"player_id": 980041}', '[{"stanje": "prisoten"}]', '[{"player_id": 980041, "stanje": "bolan"}]',
    '[{"player_id": 980041, "stanje": "prisoten"}, {"player_id": 980041, "stanje": "odsoten"}]',
    '[{"player_id": "980041", "stanje": "prisoten"}]']
  loop
    begin
      perform scout_shrani_prisotnost(v_id, v_vnosi::jsonb);
      raise exception 'sprejeto: %', v_vnosi;
    exception when others then
      get stacked diagnostics v_napaka = pg_exception_detail;
      assert sqlerrm like 'Scout: neveljavni vnosi%', v_vnosi || ' → ' || sqlerrm;
    end;
  end loop;
  begin
    perform scout_shrani_dogodek(980001, 'trening', now() + interval '3 years', 60, null, null);
    raise exception 'začetek čez 3 leta sprejet';
  exception when others then v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Scout: začetek%', 'meja začetka: ' || v_napaka;
  perform scout_shrani_prisotnost(v_id, '[{"player_id": 980041, "stanje": "prisoten"}]');
  perform set_config('test.prehod', v_id::text, true);
end;
$$;
reset role;
-- 1. 7.: tekoča sezona se premakne, nova še nima tekem kluba → prejšnja.
update rounds set season = sezona_lige(980001, (now() at time zone 'Europe/Ljubljana')::date - 365) where id = 980021;
-- igralec brez nastopa v sezoni dogodka, a že označen, ostane na seznamu
insert into players (id, competition_id, team_id, full_name, first_name, last_name) overriding system value
values (980045, 980001, 980011, 'Nov Rok', 'Rok', 'Nov');
insert into scout.prisotnost (dogodek_id, player_id, stanje) values (current_setting('test.prehod')::bigint, 980045, 'odsoten');
set local role authenticated;
do $$
declare
  e jsonb := scout_ekipa();
  d jsonb := scout_dogodek(current_setting('test.prehod')::bigint);
begin
  assert (e->>'competition_id')::bigint = 980001 and jsonb_array_length(e->'igralci') = 2
     and (e->>'sezona') = sezona_lige(980001, (now() at time zone 'Europe/Ljubljana')::date - 365),
    'prehod sezone: selekcija in kader iz prejšnje sezone: ' || e::text;
  assert (select array_agg((x->>'player_id')::bigint order by (x->>'player_id')::bigint) from jsonb_array_elements(d->'kader') x)
         = array[980041, 980042, 980045]::bigint[], 'že označen ostane v kadru dogodka: ' || (d->'kader')::text;
  assert jsonb_array_length(d->'selekcije') = 1, 'dogodek vrne selekcije za urejanje';
end;
$$;
reset role;
-- Selekcija izpade s seznama kluba (dve sezoni nazaj): dogodek se še ureja, nova selekcija ne.
update rounds set season = sezona_lige(980001, (now() at time zone 'Europe/Ljubljana')::date - 800) where id = 980021;
set local role authenticated;
do $$
declare
  v_id bigint := current_setting('test.prehod')::bigint;
begin
  assert jsonb_array_length(scout_koledar(current_date, current_date + 7)->'selekcije') = 0, 'selekcija izpadla';
  perform scout_shrani_dogodek(980001, 'sestanek', now() + interval '1 day', 60, 'Klubska soba', null, v_id);
  begin
    perform scout_shrani_dogodek(980001, 'trening', now() + interval '1 day', 60, null, null);
    raise exception 'nov dogodek v izpadli selekciji sprejet';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'scout-ekipa: ok';
rollback;
