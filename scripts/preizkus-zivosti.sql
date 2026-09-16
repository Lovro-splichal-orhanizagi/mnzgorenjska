-- Preizkus tedenske aktivnosti.
--
-- Stevilka, ki pove "koliko pravih uporabnikov imam", mora znati dvoje:
-- steti cloveka enkrat, ceprav je naredil pet stvari, in ne pokazati se
-- nikomur, ki ni administrator.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-zivosti.sql
\set ON_ERROR_STOP on

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000d1';
  b uuid := '00000000-0000-0000-0000-0000000000d2';
  tekmovanje bigint;
  igralec bigint;
  tekma bigint;
  gol bigint;
  n int;
  pred int;
  napaka text;
begin
  insert into auth.users (id, email, instance_id, aud, role, created_at)
  values (a, 'a@zivost', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now()),
         (b, 'b@zivost', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now())
  on conflict (id) do nothing;
  insert into profiles (id, display_name) values (a, 'A'), (b, 'B')
  on conflict (id) do nothing;

  select c.id into tekmovanje from competitions c
    join players p on p.competition_id = c.id group by c.id order by count(*) desc limit 1;

  -- --- 1. neadministrator ne vidi nicesar --------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform * from admin_tedenska_aktivnost(4);
    execute 'set local role postgres';
    raise exception '1. navaden uporabnik ne sme brati statistike';
  exception when others then
    execute 'set local role postgres';
    get stacked diagnostics napaka = message_text;
    if napaka not like '%administrator%' then raise; end if;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform * from admin_zivost();
    execute 'set local role postgres';
    raise exception '1. navaden uporabnik ne sme brati zivosti';
  exception when others then
    execute 'set local role postgres';
    get stacked diagnostics napaka = message_text;
    if napaka not like '%administrator%' then raise; end if;
  end;

  -- --- 2. administrator jo vidi ------------------------------------------
  update profiles set is_admin = true where id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from admin_tedenska_aktivnost(4);
  execute 'set local role postgres';
  if n <> 4 then
    raise exception '2. za 4 tedne naj bo 4 vrstic, jih je %', n;
  end if;

  -- --- 3. tihi teden ni luknja, ampak nicla ------------------------------
  -- Vrstica mora obstajati tudi za teden brez dejanj, sicer graf preskoci
  -- prazen teden in kaze neprekinjeno rast.
  select count(*) into n from admin_tedenska_aktivnost(12);
  if n <> 12 then
    raise exception '3. za 12 tednov naj bo 12 vrstic tudi ob tihih tednih, jih je %', n;
  end if;

  -- --- 4. clovek s petimi dejanji je en clovek ---------------------------
  select aktivnih into pred from admin_tedenska_aktivnost(1) limit 1;

  select p.id into igralec from players p where p.competition_id = tekmovanje limit 1;
  insert into matches (round_id, home_team_id, away_team_id, played_on)
  select r.id, p.team_id, t.id, current_date
    from rounds r, players p, teams t
   where r.competition_id = tekmovanje and p.id = igralec and t.id <> p.team_id
   limit 1
  returning id into tekma;
  insert into goals (match_id, scorer_id, team_id, minute)
  select tekma, igralec, p.team_id, 10 from players p where p.id = igralec
  returning id into gol;

  insert into assist_votes (goal_id, voter_id, player_id) values (gol, b, igralec);
  insert into chat_messages (user_id, content, alias) values (b, 'zivjo', 'B');
  insert into player_reports (user_id, player_id, kind, content)
  values (b, igralec, 'poskodba', 'koleno');

  select aktivnih into n from admin_tedenska_aktivnost(1) limit 1;
  if n <> pred + 1 then
    raise exception '4. trije vpisi istega cloveka naj dodajo enega aktivnega (prej %, zdaj %)', pred, n;
  end if;

  -- --- 5. razclenitev pove, kaj je delal ---------------------------------
  select glasovalcev, klepetalcev, javiteljev into n, pred, igralec
    from admin_tedenska_aktivnost(1) limit 1;
  if n < 1 or pred < 1 or igralec < 1 then
    raise exception '5. razclenitev naj steje vse tri vrste dejanj (glas %, klepet %, odsotnost %)', n, pred, igralec;
  end if;

  -- --- 6. zivost steje cloveka, ne dejanj --------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select aktivnih_7dni into n from admin_zivost();
  execute 'set local role postgres';
  if n < 1 then
    raise exception '6. zivost naj zazna nedavno dejavnega, nasla jih je %', n;
  end if;

  raise notice 'preizkus zivosti: vseh 6 trditev drzi';
end $$;

rollback;
