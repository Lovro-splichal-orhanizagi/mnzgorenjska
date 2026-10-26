-- Napovedi izidov v mini ligah (20261026153100): rok, zasebnost pred rokom,
-- vidnost po roku le članom, točke (3/1/0, kontumacija ne šteje), omejen
-- račun in tuja liga ne napovedujeta.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

-- a, b: člana mini lige, c: član, a omejen, d: ekipa v ligi, ni član, e: brez ekipe.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f00a', 'napoved-a@test.invalid'),
  ('00000000-0000-0000-0000-00000000f00b', 'napoved-b@test.invalid'),
  ('00000000-0000-0000-0000-00000000f00c', 'napoved-c@test.invalid'),
  ('00000000-0000-0000-0000-00000000f00d', 'napoved-d@test.invalid'),
  ('00000000-0000-0000-0000-00000000f00e', 'napoved-e@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000f00a', 'Napoved A'),
  ('00000000-0000-0000-0000-00000000f00b', 'Napoved B'),
  ('00000000-0000-0000-0000-00000000f00c', 'Napoved C'),
  ('00000000-0000-0000-0000-00000000f00d', 'Napoved D'),
  ('00000000-0000-0000-0000-00000000f00e', 'Napoved E')
on conflict (id) do nothing;

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (990501, 'test-napovedi', 'Test napovedi', 'TN', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values
  (990511, 'NK Napoved Ena', 1), (990512, 'NK Napoved Dva', 1),
  (990513, 'NK Napoved Tri', 1), (990514, 'NK Napoved Stiri', 1);
-- Krog 1 je za rokom (z izidi), krog 2 pred rokom.
insert into rounds (id, season, number, deadline_at, played_on, competition_id) overriding system value
values (990521, sezona_lige(990501), 1, now() - interval '2 days', current_date - 2, 990501),
       (990522, sezona_lige(990501), 2, now() + interval '5 days', current_date + 5, 990501);
-- Neodigrana tekma ima privzeto 0:0 in nima `imported_at`.
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, kontumacija, played_on, imported_at)
overriding system value values
  (990531, 990521, 990511, 990512, 2, 1, false, current_date - 2, now()),
  (990532, 990521, 990513, 990514, 0, 0, false, current_date - 2, now()),
  (990533, 990521, 990511, 990513, 3, 0, true,  current_date - 2, null),
  (990534, 990521, 990512, 990514, 0, 0, false, current_date - 2, null),
  (990535, 990522, 990511, 990514, 0, 0, false, current_date + 5, null),
  (990536, 990522, 990512, 990513, 0, 0, false, current_date + 5, null);
insert into fantasy_teams (id, owner_id, name, competition_id, created_at) overriding system value values
  (990541, '00000000-0000-0000-0000-00000000f00a', 'Ekipa A', 990501, now() - interval '9 days'),
  (990542, '00000000-0000-0000-0000-00000000f00b', 'Ekipa B', 990501, now() - interval '9 days'),
  (990543, '00000000-0000-0000-0000-00000000f00c', 'Ekipa C', 990501, now() - interval '9 days'),
  (990544, '00000000-0000-0000-0000-00000000f00d', 'Ekipa D', 990501, now() - interval '9 days');
insert into mini_lige (id, name, code, owner_id) overriding system value
values (990551, 'Napovedna', 'NAPOVED551', '00000000-0000-0000-0000-00000000f00a');
insert into mini_liga_clani (mini_liga_id, fantasy_team_id) values
  (990551, 990541), (990551, 990542), (990551, 990543);
insert into omejitve_uporabnikov (user_id, velja_do, razlog)
values ('00000000-0000-0000-0000-00000000f00c', now() + interval '3 days', 'test');

-- Napovedi preteklega kroga (vpisane kot servis, pred rokom).
insert into napovedi (user_id, match_id, home_goals, away_goals) values
  ('00000000-0000-0000-0000-00000000f00a', 990531, 2, 1),  -- točen: 3
  ('00000000-0000-0000-0000-00000000f00a', 990532, 1, 1),  -- razplet: 1
  ('00000000-0000-0000-0000-00000000f00a', 990533, 3, 0),  -- kontumacija: ne šteje
  ('00000000-0000-0000-0000-00000000f00a', 990534, 1, 0),  -- brez izida: čaka
  ('00000000-0000-0000-0000-00000000f00b', 990531, 1, 0),  -- razplet: 1
  ('00000000-0000-0000-0000-00000000f00b', 990532, 2, 0),  -- zgrešen: 0
  ('00000000-0000-0000-0000-00000000f00d', 990531, 2, 1);  -- ni član: ne šteje

do $$
begin
  assert tocke_napovedi(2, 1, 2, 1) = 3 and tocke_napovedi(3, 0, 1, 0) = 1
     and tocke_napovedi(1, 1, 2, 2) = 1 and tocke_napovedi(0, 1, 1, 0) = 0
     and tocke_napovedi(1, 0, null, null) is null, 'točkovanje 3/1/0';
  -- 3 + 1, kontumacija in tekma brez izida ne štejeta.
  assert (select tocke = 4 and tocnih = 1 and napovedi = 4 and ocenjenih = 2
            from povzetek_napovedi_kroga('00000000-0000-0000-0000-00000000f00a', 990521)),
         'povzetek kroga za pošto';
end;
$$;

-- Brez prijave ničesar.
set local role anon;
do $$
begin
  begin
    perform shrani_napoved(990535, 1, 0);
    raise exception 'anon je napovedal';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform * from lestvica_napovedi_mini_lige(990551);
    raise exception 'anon bere lestvico napovedi';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- A napove krog 2, popravi in izbriše; pretekla tekma in nesmiselen izid ne gresta.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000f00a","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f00a', true);
do $$
declare
  v_napaka text;
begin
  assert (select count(*) from moje_odprte_napovedi()) = 2, 'odprti sta tekmi kroga 2';
  perform shrani_napoved(990535, 1, 0);
  perform shrani_napoved(990535, 2, 2);
  perform shrani_napoved(990536, 0, 1);
  perform shrani_napoved(990536, null, null);
  assert (select count(*) from napovedi where match_id in (990535, 990536)) = 1, 'ena napoved kroga 2';
  assert (select home_goals = 2 and away_goals = 2 from napovedi where match_id = 990535), 'popravek';
  assert (select napoved_doma = 2 from moje_odprte_napovedi(990501) where match_id = 990535), 'odprte z napovedjo';
  begin
    perform shrani_napoved(990531, 1, 0);
    raise exception 'napoved po roku';
  exception when raise_exception then
    get stacked diagnostics v_napaka = message_text;
    assert v_napaka like 'Rok za napoved%', v_napaka;
  end;
  begin
    perform shrani_napoved(990535, 21, 0);
    raise exception 'napoved 21 golov';
  exception when raise_exception then
    get stacked diagnostics v_napaka = message_text;
    assert v_napaka like 'Napoved ima%', v_napaka;
  end;
  begin
    perform shrani_napoved(990535, 1, null);
    raise exception 'polovična napoved';
  exception when raise_exception then
    get stacked diagnostics v_napaka = message_text;
    assert v_napaka like 'Napoved ima%', v_napaka;
  end;
  -- Mimo RPC ne gre.
  begin
    insert into napovedi (user_id, match_id, home_goals, away_goals)
    values (auth.uid(), 990536, 1, 1);
    raise exception 'neposreden vpis';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update napovedi set home_goals = 9 where match_id = 990531;
    raise exception 'neposreden popravek';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform * from povzetek_napovedi_kroga(auth.uid(), 990521);
    raise exception 'uporabnik kliče servisni povzetek';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- B pred rokom ne vidi napovedi A kroga 2, po roku kroga 1 jih vidi.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000f00b","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f00b', true);
do $$
begin
  assert (select count(*) from napovedi where user_id <> auth.uid()) = 0, 'tuje napovedi niso v tabeli';
  assert not exists (select 1 from napovedi_mini_lige_krog(990551, 2)), 'krog 2 je pred rokom zaprt';
  assert (select count(*) from napovedi_mini_lige_krog(990551, 1)
           where user_id = '00000000-0000-0000-0000-00000000f00a') = 4, 'po roku vidi napovedi A';
  assert not exists (select 1 from napovedi_mini_lige_krog(990551, 1)
                      where user_id = '00000000-0000-0000-0000-00000000f00d'), 'nečlan ni med napovedmi';
  assert (select stanje = 'razveljavljena' and tocke is null from napovedi_mini_lige_krog(990551, 1)
           where match_id = 990533 and user_id = '00000000-0000-0000-0000-00000000f00a'), 'kontumacija';
  assert (select stanje = 'caka' from napovedi_mini_lige_krog(990551, 1)
           where match_id = 990534 and user_id = '00000000-0000-0000-0000-00000000f00a'), 'brez izida čaka';
  assert (select tocke = 3 from napovedi_mini_lige_krog(990551, 1)
           where match_id = 990531 and user_id = '00000000-0000-0000-0000-00000000f00a'), 'točen izid';
  -- Lestvica: A 4 (1 točen), B 1, C 0; D ni član.
  assert (select array_agg(right(user_id::text, 1) || ':' || tocke || ':' || tocnih || ':' || ocenjenih)
            from lestvica_napovedi_mini_lige(990551))
         = array['a:4:1:2', 'b:1:0:2', 'c:0:0:0'], 'lestvica napovedi';
  assert (select tocke from lestvica_napovedi_mini_lige(990551, 2)
           where user_id = '00000000-0000-0000-0000-00000000f00a') = 0, 'krog 2 brez izidov';
  assert (select array_agg(krog) from krogi_napovedi_mini_lige(990551)) = array[1], 'krogi z napovedmi';
end;
$$;

-- Omejen član ne napoveduje.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000f00c","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f00c', true);
do $$
declare
  v_napaka text;
begin
  perform shrani_napoved(990535, 1, 0);
  raise exception 'omejen je napovedal';
exception when insufficient_privilege then
  get stacked diagnostics v_napaka = message_text;
  assert v_napaka like 'Račun je omejen do %', v_napaka;
end;
$$;

-- Nečlan zasebne mini lige ne vidi ne lestvice ne napovedi; brez ekipe v ligi
-- ni napovedi.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000f00d","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f00d', true);
do $$
begin
  assert not exists (select 1 from lestvica_napovedi_mini_lige(990551)), 'zasebna lestvica napovedi';
  assert not exists (select 1 from napovedi_mini_lige_krog(990551, 1)), 'zasebne napovedi';
  assert not exists (select 1 from krogi_napovedi_mini_lige(990551)), 'zasebni krogi';
end;
$$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000f00e","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f00e', true);
do $$
declare
  v_napaka text;
begin
  assert not exists (select 1 from moje_odprte_napovedi()), 'brez ekipe ni odprtih tekem';
  perform shrani_napoved(990535, 1, 0);
  raise exception 'napoved brez ekipe';
exception when raise_exception then
  get stacked diagnostics v_napaka = message_text;
  assert v_napaka like 'Napoveduješ lahko%', v_napaka;
end;
$$;
reset role;

-- Javna liga: lestvico vidi vsak prijavljen, posameznih napovedi ne.
update mini_lige set javna = true, competition_id = 990501, opis = 'test' where id = 990551;
set local role authenticated;
do $$
begin
  assert (select count(*) from lestvica_napovedi_mini_lige(990551)) = 3, 'javna lestvica napovedi';
  assert not exists (select 1 from napovedi_mini_lige_krog(990551, 1)), 'javna: napovedi le članom';
end;
$$;
reset role;

-- Izbris neodigrane tekme (izstop kluba, združitev) odnese napoved.
delete from matches where id = 990535;
do $$
begin
  assert not exists (select 1 from napovedi where match_id = 990535), 'napoved odide s tekmo';
end;
$$;

-- ---------------------------------------------------------------------------
-- Napovedi za vse (20261026183100): lestvica lige, krogi, izbira skupnosti.
-- ---------------------------------------------------------------------------
-- H ima le hišno ekipo v ligi; njegove napovedi (vpisane mimo RPC) ne štejejo.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f0a1', 'napoved-h@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000f0a1', 'Napoved H')
on conflict (id) do nothing;
insert into fantasy_teams (id, owner_id, name, competition_id, created_at, hisna) overriding system value values
  (990545, '00000000-0000-0000-0000-00000000f0a1', 'Hisna H', 990501, now() - interval '9 days', true);
insert into napovedi (user_id, match_id, home_goals, away_goals) values
  ('00000000-0000-0000-0000-00000000f0a1', 990531, 2, 1),
  ('00000000-0000-0000-0000-00000000f0a1', 990532, 0, 0),
  -- Krog 2 je pred rokom: trije napovedi tekme 990536 ostanejo skrite.
  ('00000000-0000-0000-0000-00000000f00a', 990536, 1, 0),
  ('00000000-0000-0000-0000-00000000f00b', 990536, 1, 1),
  ('00000000-0000-0000-0000-00000000f00d', 990536, 0, 2);

do $$
begin
  -- Rezultat javnih funkcij nima user_id (ne e-pošte).
  assert not exists (
    select 1 from pg_proc
     where proname in ('lestvica_napovedi_lige', 'krogi_napovedi_lige', 'skupnost_napovedi_kroga')
       and pronamespace = 'public'::regnamespace
       and (pg_get_function_result(oid) ilike '%user_id%' or pg_get_function_result(oid) ilike '%email%')
  ), 'javne funkcije napovedi ne vrnejo user_id';
end;
$$;

-- Neprijavljen bere lestvico, kroge in izbiro skupnosti.
set local role anon;
do $$
begin
  -- A 4 (točen + razplet), D 3 (točen), B 1; C (brez napovedi) in H (hišna) nista.
  assert (select array_agg(mesto || ':' || display_name || ':' || tocke || ':' || tocnih || ':' || razpletov || ':' || ocenjenih order by mesto, display_name)
            from lestvica_napovedi_lige(990501))
         = array['1:napoved-a:4:1:1:2', '2:napoved-d:3:1:0:1', '3:napoved-b:1:0:1:2'], 'lestvica napovedi lige';
  assert not exists (select 1 from lestvica_napovedi_lige(990501) where je_moj), 'anon nima svoje vrstice';
  assert (select count(*) from lestvica_napovedi_lige(990501, 1)) = 3, 'lestvica kroga 1';
  -- Krog 2 še nima izidov, šteje pa le tiste, ki so ga napovedovali.
  assert (select count(*) from lestvica_napovedi_lige(990501, 2) where ocenjenih = 0) = 3, 'krog 2 brez izidov';
  assert (select array_agg(krog) from krogi_napovedi_lige(990501)) = array[1], 'krogi napovedi lige: le po roku';
  assert (select round_id from krogi_napovedi_lige(990501)) = 990521, 'krog nosi id';
  -- 990531: A, B, D za domače (H ne šteje) -> 3; 990532: A, B -> pod 3, skrita.
  assert (select array_agg(match_id || ':' || n || ':' || doma || ':' || remi || ':' || gostje)
            from skupnost_napovedi_kroga(990521)) = array['990531:3:3:0:0'], 'izbira skupnosti kroga 1';
  assert not exists (select 1 from skupnost_napovedi_kroga(990522)), 'izbira skupnosti pred rokom je zaprta';
end;
$$;
reset role;

-- Prijavljen B vidi svojo vrstico; pri več kot 50 igralcih je dodana pod vrh.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000f00b","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f00b', true);
do $$
begin
  assert (select je_moj from lestvica_napovedi_lige(990501) where display_name = 'napoved-b'), 'je_moj';
  assert (select count(*) from lestvica_napovedi_lige(990501) where je_moj) = 1, 'le ena moja vrstica';
end;
$$;
reset role;

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000009' || lpad(g::text, 5, '0'))::uuid, 'napoved-mnozica-' || g || '@test.invalid'
  from generate_series(1, 55) g;
insert into profiles (id, display_name)
select ('00000000-0000-0000-0000-0000009' || lpad(g::text, 5, '0'))::uuid, 'Mnozica ' || g
  from generate_series(1, 55) g
on conflict (id) do update set display_name = excluded.display_name;
insert into fantasy_teams (id, owner_id, name, competition_id, created_at) overriding system value
select 990600 + g, ('00000000-0000-0000-0000-0000009' || lpad(g::text, 5, '0'))::uuid, 'Mnozica ' || g, 990501, now() - interval '9 days'
  from generate_series(1, 55) g;
insert into napovedi (user_id, match_id, home_goals, away_goals)
select ('00000000-0000-0000-0000-0000009' || lpad(g::text, 5, '0'))::uuid, 990531, 2, 1
  from generate_series(1, 55) g;

set local role authenticated;
do $$
begin
  -- 58 igralcev: B (1 točka) je zadnji, zunaj vrha 50.
  assert (select count(*) from lestvica_napovedi_lige(990501)) = 51, 'vrh 50 in moja vrstica';
  assert (select mesto = 58 and je_moj from lestvica_napovedi_lige(990501) where display_name = 'napoved-b'), 'moja vrstica pod vrhom';
  assert (select count(*) from lestvica_napovedi_lige(990501) where mesto = 2) = 49, 'enake točke delijo mesto (vrh 50)';
end;
$$;
reset role;

select 'napovedi: ok';
rollback;
