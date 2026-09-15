-- Preizkus pravic za mini lige.
--
-- Pravice so v bazi, ne v vmesniku, zato jih `npm run smoke` ne more
-- preveriti — ta skripta pa lahko. Poganja se proti LOKALNI bazi:
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -f scripts/preizkus-mini-lig.sql
--
-- Vsak korak je trditev. Skripta pade ob prvi krsitvi.
\set ON_ERROR_STOP on

do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  b uuid := '00000000-0000-0000-0000-00000000000b';
  ekipa_a bigint;
  ekipa_b bigint;
  liga bigint;
  koda text;
  n int;
  napaka text;
  drzava bigint;
  tekmovanje bigint;
  klub bigint;
begin
  -- --- priprava ------------------------------------------------------------
  insert into auth.users (id, email, instance_id, aud, role)
  values (a, 'a@preizkus', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
         (b, 'b@preizkus', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;
  insert into profiles (id, display_name) values (a, 'A'), (b, 'B')
  on conflict (id) do nothing;

  select id into drzava from countries limit 1;
  if drzava is null then
    insert into countries (code, name) values ('SI', 'Slovenija') returning id into drzava;
  end if;
  select id into tekmovanje from competitions limit 1;
  insert into fantasy_teams (owner_id, name, competition_id) values (a, 'Ekipa A', tekmovanje)
    returning id into ekipa_a;
  insert into fantasy_teams (owner_id, name, competition_id) values (b, 'Ekipa B', tekmovanje)
    returning id into ekipa_b;

  -- --- 1. A ustvari mini ligo ---------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select m.id, m.code into liga, koda from ustvari_mini_ligo('Bratje', ekipa_a) m;
  if liga is null then raise exception 'NAPAKA: mini liga ni nastala'; end if;
  raise notice 'OK 1: A ustvaril mini ligo % s kodo %', liga, koda;

  -- --- 2. Ustvarjalec je ZE clan -------------------------------------------
  -- Prva razlicica je ligo le ustvarila; clovek je dobil kodo in prazno
  -- lestvico, v svojo ligo pa bi se moral pridruziti s svojo kodo. Videti je
  -- bilo kot okvara. Pokazalo se je sele ob uporabi strani.
  select count(*) into n from mini_liga_clani where mini_liga_id = liga;
  if n <> 1 then raise exception 'NAPAKA: ustvarjalec ni clan svoje lige (clanov %)', n; end if;
  raise notice 'OK 2: ustvarjalec je takoj clan';

  -- --- 3. A NE sme pridruziti tuje ekipe -----------------------------------
  begin
    perform pridruzi_mini_ligi(koda, ekipa_b);
    raise exception 'NAPAKA: A je pridruzil TUJO ekipo — pravica manjka';
  exception when others then
    get stacked diagnostics napaka = message_text;
    if napaka like 'NAPAKA:%' then raise; end if;
    raise notice 'OK 3: tuja ekipa zavrnjena (%)', napaka;
  end;

  -- --- 4. B se pridruzi s kodo, s svojo ekipo ------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform pridruzi_mini_ligi(koda, ekipa_b);
  select count(*) into n from mini_liga_clani where mini_liga_id = liga;
  if n <> 2 then raise exception 'NAPAKA: po pridruzitvi B je clanov %, pricakovano 2', n; end if;
  raise notice 'OK 4: B se pridruzil s kodo';

  -- Pridruzitev mora POVEDATI, ali se je kaj zgodilo: sicer vmesnik izpise
  -- potrditev tudi, kadar je bila ekipa clan ze prej, lestvica pa se ne
  -- spremeni — in to je videti kot okvara.
  if not (select p.dodano from pridruzi_mini_ligi(koda, ekipa_b) p) is false then
    raise exception 'NAPAKA: ponovna pridruzitev trdi, da je kaj dodala';
  end if;
  raise notice 'OK 4b: ponovna pridruzitev pove, da ni dodala nicesar';

  -- --- 5. Napacna koda ne sme uspeti ---------------------------------------
  begin
    perform pridruzi_mini_ligi('XXXXXX', ekipa_b);
    raise exception 'NAPAKA: pridruzitev z neobstojeco kodo je uspela';
  exception when others then
    get stacked diagnostics napaka = message_text;
    if napaka like 'NAPAKA:%' then raise; end if;
    raise notice 'OK 5: neobstojeca koda zavrnjena (%)', napaka;
  end;

  -- --- 6. Ponovna pridruzitev ne podvoji -----------------------------------
  perform pridruzi_mini_ligi(koda, ekipa_b);
  select count(*) into n from mini_liga_clani where mini_liga_id = liga;
  if n <> 2 then raise exception 'NAPAKA: ponovna pridruzitev je podvojila clana (%)', n; end if;
  raise notice 'OK 6: ponovna pridruzitev ne podvoji';

  -- --- 7. Lestvica mini lige vidi oba ---------------------------------------
  select count(*) into n from mini_liga_lestvica where mini_liga_id = liga;
  if n <> 2 then raise exception 'NAPAKA: lestvica ima % vrstic, pricakovano 2', n; end if;
  raise notice 'OK 7: lestvica mini lige ima obe ekipi';

  -- --- 8. RLS sama, mimo funkcije --------------------------------------------
  -- Koraki 1-7 tecejo kot superuser, ki RLS PRESKOCI; preverili so torej
  -- logiko funkcij, ne pravil. Napadalec pa funkcije ne potrebuje — piše lahko
  -- naravnost v tabelo prek PostgREST. Zato tu prevzamemo vlogo `authenticated`,
  -- za katero pravila veljajo.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin
    insert into mini_liga_clani (mini_liga_id, fantasy_team_id) values (liga, ekipa_a);
    execute 'reset role';
    raise exception 'NAPAKA: B je prek RLS vpisal TUJO ekipo v mini ligo';
  exception when insufficient_privilege or check_violation then
    raise notice 'OK 8: RLS zavrne vpis tuje ekipe';
  when others then
    get stacked diagnostics napaka = message_text;
    if napaka like 'NAPAKA:%' then execute 'reset role'; raise; end if;
    raise notice 'OK 8: RLS zavrne vpis tuje ekipe (%)', napaka;
  end;

  -- --- 9. Clan ne sme odstraniti tujega clanstva ------------------------------
  begin
    delete from mini_liga_clani where mini_liga_id = liga and fantasy_team_id = ekipa_a;
    get diagnostics n = row_count;
    if n > 0 then
      execute 'reset role';
      raise exception 'NAPAKA: B je odstranil A-jevo ekipo iz mini lige';
    end if;
    raise notice 'OK 9: RLS ne pusti odstraniti tujega clanstva';
  exception when insufficient_privilege then
    raise notice 'OK 9: RLS ne pusti odstraniti tujega clanstva';
  end;

  -- --- 10. Lastnik mini lige SME odstraniti clana -----------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from mini_liga_clani where mini_liga_id = liga and fantasy_team_id = ekipa_b;
  get diagnostics n = row_count;
  execute 'reset role';
  if n <> 1 then raise exception 'NAPAKA: lastnik ni mogel odstraniti clana (vrstic %)', n; end if;
  raise notice 'OK 10: lastnik mini lige sme odstraniti clana';

  -- --- pospravi -------------------------------------------------------------
  delete from mini_lige where id = liga;
  delete from fantasy_teams where id in (ekipa_a, ekipa_b);
  delete from profiles where id in (a, b);
  delete from auth.users where id in (a, b);
  raise notice 'VSI PREIZKUSI MINI LIG USPESNI';
end $$;
