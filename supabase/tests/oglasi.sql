-- Oglasi (20261120130000): oglasi_za vrne enote le pri vklopu, veljavnem
-- založniku in mestih; nikoli v mladinski ligi in plačnikom (Pro, preverjen).
-- Teče v transakciji in se povrne.
begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000a001', 'oglas-navaden@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000a002', 'oglas-admin@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000a003', 'oglas-pro@test.invalid', now()),
  ('00000000-0000-0000-0000-00000000a004', 'oglas-preverjen@test.invalid', now());
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'Oglas 1'),
  ('00000000-0000-0000-0000-00000000a002', 'Oglas 2'),
  ('00000000-0000-0000-0000-00000000a003', 'Oglas 3'),
  ('00000000-0000-0000-0000-00000000a004', 'Oglas 4')
on conflict (id) do update set display_name = excluded.display_name;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000a002';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value values
  (990301, 'test-oglasi', 'Test oglasi', 'TO', false, 1, 'test'),
  (990302, 'test-oglasi-mladinci', 'Test oglasi mladinci', 'TOM', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values (990311, 'NK Oglas', 1);
insert into players (id, competition_id, team_id, full_name, last_name, first_name, value, value_start) overriding system value values
  (990331, 990301, 990311, 'Oglas Jan', 'Oglas', 'Jan', 4.5, 4.5);
insert into pro_narocnine (user_id, vir, velja_do) values
  ('00000000-0000-0000-0000-00000000a003', 'rocno', now() + interval '30 days');
insert into preverjeni_racuni (user_id, player_id, vir) values
  ('00000000-0000-0000-0000-00000000a004', 990331, 'rocno');
update settings set value = '2' where key = 'slff_pro';

create function pg_temp.oglas_kot(p_uid text, p_liga bigint) returns jsonb language plpgsql as $$
declare v jsonb;
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('request.jwt.claim.sub', '', true);
    set local role anon;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', p_uid, true);
    set local role authenticated;
  end if;
  v := oglasi_za(p_liga);
  reset role;
  return v;
end;
$$;

do $$
declare
  navaden text := '00000000-0000-0000-0000-00000000a001';
  admin text := '00000000-0000-0000-0000-00000000a002';
begin
  -- Privzeto (migracija): izklop, mest ni.
  update settings set value = '0' where key = 'oglasi';
  update settings set value = '{}' where key = 'oglasi_mesta';
  assert (select value #>> '{}' from settings where key = 'oglasi_client') = 'ca-pub-9235394594566763', 'privzet založnik';
  assert pg_temp.oglas_kot(navaden, 990301) is null, 'izklop: nič';

  update settings set value = '{"domov": "1234567890"}' where key = 'oglasi_mesta';
  assert pg_temp.oglas_kot(admin, 990301) is null, 'stikalo 0: nič niti adminu';

  update settings set value = '1' where key = 'oglasi';
  assert pg_temp.oglas_kot(null, 990301) is null, 'stikalo 1: anon nič';
  assert pg_temp.oglas_kot(navaden, 990301) is null, 'stikalo 1: navaden nič';
  assert pg_temp.oglas_kot(admin, 990301) ->> 'client' = 'ca-pub-9235394594566763', 'stikalo 1: admin vidi';

  update settings set value = '2' where key = 'oglasi';
  assert pg_temp.oglas_kot(null, 990301) -> 'mesta' ->> 'domov' = '1234567890', 'stikalo 2: anon vidi';
  assert pg_temp.oglas_kot(navaden, 990301) is not null, 'stikalo 2: navaden vidi';
  assert pg_temp.oglas_kot(navaden, 990302) is null, 'mladinska liga: nikoli';
  assert pg_temp.oglas_kot(navaden, -1) is null, 'neznana liga: nič';
  assert pg_temp.oglas_kot('00000000-0000-0000-0000-00000000a003', 990301) is null, 'Pro: brez oglasov';
  assert pg_temp.oglas_kot('00000000-0000-0000-0000-00000000a004', 990301) is null, 'preverjen: brez oglasov';

  insert into competition_settings (competition_id, key, value) values (990301, 'oglasi', '0');
  assert pg_temp.oglas_kot(navaden, 990301) is null, 'povoz lige 0: nič';
  delete from competition_settings where competition_id = 990301;

  update settings set value = '""' where key = 'oglasi_client';
  assert pg_temp.oglas_kot(navaden, 990301) is null, 'prazen založnik: nič';
  update settings set value = '"pub-123"' where key = 'oglasi_client';
  assert pg_temp.oglas_kot(navaden, 990301) is null, 'neveljaven založnik: nič';
  raise notice 'PASS oglasi_za';
end;
$$;

rollback;
