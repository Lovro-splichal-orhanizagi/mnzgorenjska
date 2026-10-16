-- Preizkus `kandidati_za_opomnik_brez_ekipe`: urnik (3 dni, 7 dni narazen,
-- največ trije, dobrodošlica prva) in konec ob neprazni ekipi.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-brez-ekipe.sql
\set ON_ERROR_STOP on

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000e1';
  liga bigint;
  ekipa bigint;
  klub bigint;
  igralec bigint;
  n int;
  liga_slug text;
  poizvedba constant text := 'select count(*) from kandidati_za_opomnik_brez_ekipe(100000) k where k.user_id = $1';
begin
  insert into auth.users (id, email, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
  values (a, 'brez-ekipe@test.slff', now(), now() - interval '2 days', '{"jezik":"sl"}', 'authenticated', 'authenticated');
  insert into profiles (id, display_name) values (a, 'Test Brez') on conflict (id) do nothing;

  -- Premlad: ni kandidat.
  execute poizvedba into n using a;
  assert n = 0, 'registriran pred 2 dnevoma ne sme biti kandidat';

  -- 4 dni, brez dobrodošlice: v oknu dobrodošlice najprej ta.
  update auth.users set created_at = now() - interval '4 days' where id = a;
  execute poizvedba into n using a;
  assert n = 0, 'v oknu dobrodošlice mora ta oditi prva';

  -- Dobrodošlica pred 3 dnevi: kandidat, liga člani (sl).
  insert into email_log (user_id, email, vrsta, poslano_at) values (a, 'x', 'dobrodoslica', now() - interval '3 days');
  select k.liga_slug into liga_slug from kandidati_za_opomnik_brez_ekipe(100000) k where k.user_id = a;
  assert liga_slug = 'clani', format('liga za sl je clani, dobil %s', liga_slug);

  -- Dobrodošlica včeraj: premor dva dni.
  update email_log set poslano_at = now() - interval '1 day' where user_id = a and vrsta = 'dobrodoslica';
  execute poizvedba into n using a;
  assert n = 0, 'v dveh dneh po dobrodošlici ni opomnika';
  update email_log set poslano_at = now() - interval '30 days' where user_id = a and vrsta = 'dobrodoslica';

  -- Uspešen opomnik pred 5 dnevi: počaka do 7.
  insert into email_log (user_id, email, vrsta, poslano_at) values (a, 'x', 'brez-ekipe', now() - interval '5 days');
  execute poizvedba into n using a;
  assert n = 0, 'drugi opomnik šele 7 dni po prvem';
  update email_log set poslano_at = now() - interval '8 days' where user_id = a and vrsta = 'brez-ekipe';
  execute poizvedba into n using a;
  assert n = 1, 'drugi opomnik po 7 dneh';

  -- Trije uspešni: nikoli več.
  insert into email_log (user_id, email, vrsta, poslano_at) values
    (a, 'x', 'brez-ekipe', now() - interval '20 days'), (a, 'x', 'brez-ekipe', now() - interval '30 days');
  execute poizvedba into n using a;
  assert n = 0, 'največ trije opomniki';
  delete from email_log where user_id = a and vrsta = 'brez-ekipe' and poslano_at < now() - interval '15 days';

  -- Neprazna ekipa: konec.
  select id into liga from competitions where slug = 'clani';
  insert into fantasy_teams (owner_id, competition_id, name) values (a, liga, 'Test') returning id into ekipa;
  execute poizvedba into n using a;
  assert n = 1, 'prazna ekipa še šteje kot brez ekipe';
  -- Svoj igralec, da preizkus teče tudi na prazni bazi (CI).
  insert into teams (name, country_id) select 'Test Brez Klub', country_id from competitions where id = liga
    returning id into klub;
  insert into players (team_id, first_name, last_name, competition_id) values (klub, 'Test', 'Brez', liga)
    returning id into igralec;
  insert into fantasy_roster (fantasy_team_id, player_id) values (ekipa, igralec);
  execute poizvedba into n using a;
  assert n = 0, 'z neprazno ekipo ni opomnika';

  raise notice 'preizkus-brez-ekipe: OK';
end $$;

rollback;
