-- Prenosi tekem v živo (20261115120000_prenosi_tekem.sql): pravice, pravila
-- ob vpisu (potrjen naslov, mladinske, seznam lig, okno, podvojeni video, en
-- kanal en prenos), vidnost s stikalom, 2 prijavi skrijeta, prepoved
-- uporabnika in kanala, osvežitev, varovalo kvote, obvestila izklopljena.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

do $$
begin
  if has_table_privilege('anon', 'public.prenosi', 'SELECT')
     or has_table_privilege('authenticated', 'public.prenosi', 'SELECT')
     or has_table_privilege('authenticated', 'public.prenosi_prijave', 'SELECT')
     or has_table_privilege('authenticated', 'public.prenosi_prepovedi', 'SELECT') then
    raise exception 'Tabele prenosov morajo biti zaprte';
  end if;
  if has_function_privilege('authenticated', 'public.prenos_dodaj(uuid,bigint,text,text,text,text,text,timestamptz,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.prenosi_osvezi(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.prenos_push_prejemniki(bigint,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.prenos_prijavi(uuid,text,text)', 'EXECUTE') then
    raise exception 'Strežniške funkcije prenosov ne smejo biti odprte';
  end if;
  if not has_function_privilege('anon', 'public.prenosi_tekme(bigint)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.prenos_ogled(uuid,text)', 'EXECUTE') then
    raise exception 'Gledanje mora biti odprto brez prijave';
  end if;
end $$;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000e0001', 'prenos-1@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000e0002', 'prenos-2@test.invalid', null),
  ('00000000-0000-0000-0000-0000000e0003', 'prenos-3@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000e0004', 'prenos-4@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000e0005', 'prenos-5@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000e00ad', 'prenos-admin@test.invalid', now());
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000e0001', 'Jure Kovač'),
  ('00000000-0000-0000-0000-0000000e0002', 'Brez Potrditve'),
  ('00000000-0000-0000-0000-0000000e0003', 'Tretji'),
  ('00000000-0000-0000-0000-0000000e0004', 'Četrti'),
  ('00000000-0000-0000-0000-0000000e0005', 'Peti'),
  ('00000000-0000-0000-0000-0000000e00ad', 'Admin')
on conflict (id) do update set display_name = excluded.display_name;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-0000000e00ad';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value values
  (991301, 'zz-test-prenosi-clani', 'Prenosi člani', 'PC', false, (select id from countries where code = 'SI'), 'test'),
  (991302, 'zz-test-prenosi-u17', 'Prenosi U17', 'P17', false, (select id from countries where code = 'SI'), 'test'),
  (991303, 'zz-test-prenosi-izven', 'Prenosi izven seznama', 'PI', false, (select id from countries where code = 'SI'), 'test');
insert into prenosi_tekmovanja (competition_id) values (991301), (991302);
insert into teams (id, name, short_name, country_id) overriding system value values
  (991311, 'NK Prenosgrad', 'Prenosgrad', (select id from countries where code = 'SI')),
  (991312, 'NK Kamniška Bistrica', 'Bistrica', (select id from countries where code = 'SI'));
insert into rounds (id, season, number, deadline_at, played_on, competition_id) overriding system value values
  (991321, sezona_lige(991301), 1, now() - interval '1 day', current_date, 991301),
  (991322, sezona_lige(991302), 1, now() - interval '1 day', current_date, 991302),
  (991323, sezona_lige(991303), 1, now() - interval '1 day', current_date, 991303),
  (991324, sezona_lige(991301), 2, now() - interval '1 day', current_date, 991301);
insert into matches (id, round_id, home_team_id, away_team_id, played_on, zacetek) overriding system value values
  (991331, 991321, 991311, 991312, (now() at time zone 'Europe/Ljubljana')::date, null),
  (991332, 991321, 991312, 991311, (now() at time zone 'Europe/Ljubljana')::date, now() - interval '5 hours'),
  (991333, 991322, 991311, 991312, (now() at time zone 'Europe/Ljubljana')::date, null),
  (991334, 991323, 991311, 991312, (now() at time zone 'Europe/Ljubljana')::date, null),
  (991335, 991324, 991312, 991311, (now() at time zone 'Europe/Ljubljana')::date, null);

insert into settings (key, value) values ('prenosi', '2'), ('prenosi_push', '0')
on conflict (key) do update set value = excluded.value;

do $$
declare
  u1 constant uuid := '00000000-0000-0000-0000-0000000e0001';
  u2 constant uuid := '00000000-0000-0000-0000-0000000e0002';
  u5 constant uuid := '00000000-0000-0000-0000-0000000e0005';
  r jsonb;
  p1 uuid;
  p2 uuid;
  n int;
  s jsonb;
begin
  r := prenos_dodaj(u2, 991331, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'Prenosgrad : Bistrica', '', now() - interval '10 minutes', 5);
  if r->>'napaka' is distinct from 'potrdi_naslov' then raise exception 'Nepotrjen naslov: %', r; end if;
  r := prenos_dodaj(u1, 991333, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'x', '', now(), 5);
  if r->>'napaka' is distinct from 'mladinska' then raise exception 'Mladinska tekma: %', r; end if;
  r := prenos_dodaj(u1, 991334, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'x', '', now(), 5);
  if r->>'napaka' is distinct from 'tekmovanje' then raise exception 'Liga zunaj seznama: %', r; end if;
  -- Ura znana: začetek prenosa zdaj je več kot 3 h po začetku tekme.
  r := prenos_dodaj(u1, 991332, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'x', '', now(), 5);
  if r->>'napaka' is distinct from 'izven_casa' or (r->>'ura_znana')::boolean is not true then
    raise exception 'Izven okna: %', r;
  end if;
  -- Ura neznana: velja dan tekme, včeraj ne.
  r := prenos_dodaj(u1, 991331, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'x', '', now() - interval '2 days', 5);
  if r->>'napaka' is distinct from 'izven_casa' then raise exception 'Prenos od včeraj: %', r; end if;

  r := prenos_dodaj(u1, 991331, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'Prenosgrad : Bistrica', '', now() - interval '10 minutes', 5);
  if not (r->>'ok')::boolean or not (r->>'prvi')::boolean or (r->>'nepreverjeno')::boolean then
    raise exception 'Prvi prenos: %', r;
  end if;
  p1 := (r->>'id')::uuid;
  r := prenos_dodaj(u1, 991331, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'x', '', now(), 5);
  if r->>'napaka' is distinct from 'ze_dodan' then raise exception 'Isti video dvakrat: %', r; end if;
  r := prenos_dodaj(u5, 991335, 'aaaaaaaaaa1', 'UCkanal1', 'Kanal 1', 'x', '', now(), 5);
  if r->>'napaka' is distinct from 'druga_tekma' then raise exception 'Isti video druga tekma: %', r; end if;
  r := prenos_dodaj(u5, 991331, 'bbbbbbbbbb2', 'UCkanal1', 'Kanal 1', 'x', '', now(), 5);
  if r->>'napaka' is distinct from 'kanal_ze_v_zivo' then raise exception 'En kanal en prenos: %', r; end if;
  -- Brez imena kluba: sprejet, a nepreverjen; ni prvi.
  r := prenos_dodaj(u5, 991331, 'cccccccccc3', 'UCkanal5', 'Kanal 5', 'Nedeljski stream', 'brez', now(), 50);
  if not (r->>'ok')::boolean or (r->>'prvi')::boolean or not (r->>'nepreverjeno')::boolean then
    raise exception 'Nepreverjen prenos: %', r;
  end if;
  p2 := (r->>'id')::uuid;

  -- Gost vidi oba, najbolj gledan prvi, ime skrajšano.
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  if (select count(*) from prenosi_tekme(991331)) <> 2 then raise exception 'Gost mora videti oba prenosa'; end if;
  if (select id from prenosi_tekme(991331) limit 1) <> p2 then raise exception 'Razvrstitev po gledalcih'; end if;
  if (select dodal from prenosi_tekme(991331) where id = p1) <> 'Jure K.' then raise exception 'Kratko ime'; end if;
  if (select count(*) from prenosi_v_zivo()) <> 1 or (select prenosov from prenosi_v_zivo()) <> 2 then
    raise exception 'V živo zdaj: ena tekma, dva prenosa';
  end if;
  s := prenosi_stanje_tekme(991333);
  if s->>'zaprto' is distinct from 'mladinska' then raise exception 'Stanje mladinske: %', s; end if;
  update settings set value = '0' where key = 'prenosi';
  if exists (select 1 from prenosi_tekme(991331)) then raise exception 'Stikalo 0 skrije prenose'; end if;
  update settings set value = '2' where key = 'prenosi';

  -- Ogled: edinstven po napravi.
  perform prenos_ogled(p1, 'naprava-1234');
  perform prenos_ogled(p1, 'naprava-1234');
  if (select count(*) from prenosi_ogledi where prenos_id = p1) <> 1 then raise exception 'Ogledi niso edinstveni'; end if;

  -- Dve prijavi različnih uporabnikov skrijeta prenos; ena ne.
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0003', 'role', 'authenticated')::text, true);
  perform prenos_prijavi(p1, 'ni_tekma', null);
  perform prenos_prijavi(p1, 'spam', 'še enkrat isti');
  if (select skrit_prijave from prenosi where id = p1) then raise exception 'Ena oseba ne sme skriti prenosa'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0004', 'role', 'authenticated')::text, true);
  perform prenos_prijavi(p1, 'ni_tekma', null);
  if not (select skrit_prijave from prenosi where id = p1) then raise exception 'Dve prijavi morata skriti prenos'; end if;
  if exists (select 1 from prenosi_tekme(991331) where id = p1) then raise exception 'Skrit prenos je viden'; end if;

  -- Ne-admin ne sme odločati.
  begin
    perform admin_prenos_odloci(p1, 'pokazi');
    raise exception 'NAPAKA: ne-admin je odločil';
  exception when others then
    if sqlerrm like 'NAPAKA%' then raise; end if;
  end;

  -- Admin pokaže; stare prijave ga ne skrijejo znova.
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e00ad', 'role', 'authenticated')::text, true);
  if not exists (select 1 from admin_prenosi('pregled') where id = p1) then raise exception 'Prijavljen prenos ni v vrsti'; end if;
  perform admin_prenos_odloci(p1, 'pokazi');
  if not exists (select 1 from prenosi_tekme(991331) where id = p1) then raise exception 'Pokazan prenos ni viden'; end if;

  -- Prepoved uporabnika in kanala: skrije njegove prenose, nov račun z istim kanalom ne more.
  perform admin_prenosi_prepovej(u1, 'UCkanal1', null, 'Prenos ni bil tekma.');
  if exists (select 1 from prenosi_tekme(991331) where id = p1) then raise exception 'Prepovedan uporabnik je viden'; end if;
  r := prenos_dodaj(u1, 991331, 'dddddddddd4', 'UCdrug', 'Drug', 'Prenosgrad', '', now(), 1);
  if r->>'napaka' is distinct from 'prepoved' then raise exception 'Prepovedan uporabnik: %', r; end if;
  update prenosi set stanje = 'posnetek' where id = p1;
  r := prenos_dodaj(u5, 991331, 'eeeeeeeeee5', 'UCkanal1', 'Kanal 1', 'Prenosgrad', '', now(), 1);
  if r->>'napaka' is distinct from 'prepoved' then raise exception 'Prepovedan kanal: %', r; end if;
  -- Preklic: spet viden.
  perform admin_prenosi_preklici((select id from prenosi_prepovedi where user_id = u1));
  if not exists (select 1 from prenosi_tekme(991331) where id = p1) then raise exception 'Po preklicu ni viden'; end if;

  -- Osvežitev: konec → posnetek, izbrisan → skrit.
  n := prenosi_osvezi(jsonb_build_array(
    jsonb_build_object('video_id', 'cccccccccc3', 'najden', true, 'v_zivo', false, 'konec', now(), 'trajanje_s', 6000),
    jsonb_build_object('video_id', 'aaaaaaaaaa1', 'najden', false, 'v_zivo', false)));
  if n <> 2 then raise exception 'Osveženih: %', n; end if;
  if (select stanje from prenosi where id = p2) <> 'posnetek' or (select trajanje_s from prenosi where id = p2) <> 6000 then
    raise exception 'Konec prenosa ni zapisan';
  end if;
  if exists (select 1 from prenosi_tekme(991331) where id = p1) then raise exception 'Izbrisan video je viden'; end if;

  -- Varovalo kvote: drugi klic v 2 min ne vrne ničesar.
  update prenosi set stanje = 'v_zivo', konec = null where id = p2;
  update prenosi_osvezitve set zadnja = 'epoch' where vrsta = 'zivo';
  if (select count(*) from prenosi_za_osvezitev('zivo')) <> 1 then raise exception 'Prva osvežitev mora vrniti video'; end if;
  if exists (select 1 from prenosi_za_osvezitev('zivo')) then raise exception 'Druga osvežitev v 2 min mora biti prazna'; end if;

  -- Obvestila so izklopljena (besedilo še ni odobreno).
  update profiles set navijam_team_id = 991311 where id = u5;
  insert into push_tokens (token, user_id, platforma) values ('test-zeton-prenosi', u5, 'web');
  if exists (select 1 from prenos_push_prejemniki(991331)) then raise exception 'Obvestila morajo biti izklopljena'; end if;
  update settings set value = '1' where key = 'prenosi_push';
  if (select count(*) from prenos_push_prejemniki(991331)) <> 1 then raise exception 'Navijač mora dobiti obvestilo'; end if;
  if exists (select 1 from prenos_push_prejemniki(991331)) then raise exception 'Največ eno obvestilo na tekmo'; end if;
end $$;

rollback;
