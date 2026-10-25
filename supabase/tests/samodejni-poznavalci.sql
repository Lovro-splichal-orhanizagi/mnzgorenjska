-- Prag 3 in samodejni poznavalci lige (20261025223100): kdo dobi poznavalca,
-- kdo ne, odvzem pod 75 % in dokončen odvzem admina.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

do $$
begin
  assert (select value from settings where key = 'prag_glasov_pozicija') = '3'::jsonb, 'prag pozicije je 3';
end;
$$;

-- a: natančen, b: natančen (pozneje se zmoti), c, d: natančna, a d je bil omejen,
-- e: račun mlajši od 14 dni, f: admin.
insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-00000000e00a', 'pozn-a@test.invalid', now() - interval '30 days'),
  ('00000000-0000-0000-0000-00000000e00b', 'pozn-b@test.invalid', now() - interval '30 days'),
  ('00000000-0000-0000-0000-00000000e00c', 'pozn-c@test.invalid', now() - interval '30 days'),
  ('00000000-0000-0000-0000-00000000e00d', 'pozn-d@test.invalid', now() - interval '30 days'),
  ('00000000-0000-0000-0000-00000000e00e', 'pozn-e@test.invalid', now() - interval '2 days'),
  ('00000000-0000-0000-0000-00000000e00f', 'pozn-admin@test.invalid', now() - interval '30 days');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000e00a', 'Pozn A'),
  ('00000000-0000-0000-0000-00000000e00b', 'Pozn B'),
  ('00000000-0000-0000-0000-00000000e00c', 'Pozn C'),
  ('00000000-0000-0000-0000-00000000e00d', 'Pozn D'),
  ('00000000-0000-0000-0000-00000000e00e', 'Pozn E'),
  ('00000000-0000-0000-0000-00000000e00f', 'Pozn admin')
on conflict (id) do nothing;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000e00f';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (990301, 'test-poznavalci', 'Test poznavalci', 'TP', false, 1, 'test');
set local session_replication_role = replica;
update competitions set active = true where id = 990301;
set local session_replication_role = origin;
insert into teams (id, name, country_id) overriding system value values (990311, 'NK Poznavalci', 1);
insert into players (id, competition_id, team_id, full_name, last_name, first_name, position, position_source)
overriding system value
select 990400 + i, 990301, 990311, 'Igralec ' || i, 'Igralec', i::text, 'FWD', 'ugibanje'
  from generate_series(1, 20) i;

-- Vsi glasujejo MID za 20 igralcev: pozicija postane MID z glasovanjem.
insert into position_votes (player_id, voter_id, position)
select 990400 + i, v::uuid, 'MID'
  from generate_series(1, 20) i,
       unnest(array['00000000-0000-0000-0000-00000000e00a', '00000000-0000-0000-0000-00000000e00b',
                    '00000000-0000-0000-0000-00000000e00c', '00000000-0000-0000-0000-00000000e00d',
                    '00000000-0000-0000-0000-00000000e00e']) v;
select count(potrdi_pozicijo(990400 + i)) from generate_series(1, 20) i;
-- d je bil nekoč omejen (omejitev je že potekla): samodejnega poznavalca ne dobi.
insert into omejitve_uporabnikov (user_id, velja_do, razlog)
values ('00000000-0000-0000-0000-00000000e00d', now() - interval '1 day', 'stara');

do $$
begin
  assert (select count(*) from players where id between 990401 and 990420
            and position = 'MID' and position_source = 'glasovanje') = 20, 'trije glasovi premaknejo pozicijo';
  assert (select glasov from neodvisna_natancnost()
           where voter_id = '00000000-0000-0000-0000-00000000e00a' and competition_id = 990301) = 20,
         'neodvisno razrešenih 20';
end;
$$;

-- Brez prijave in kot navaden uporabnik nočne naloge ni.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e00a","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e00a', true);
do $$
begin
  begin
    perform podeli_samodejne_poznavalce();
    raise exception 'uporabnik podelil poznavalce';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform neodvisna_natancnost();
    raise exception 'uporabnik bere natančnost';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform admin_samodejni_poznavalci();
    raise exception 'uporabnik bere seznam samodejnih';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Nočna naloga.
select podeli_samodejne_poznavalce();
do $$
begin
  assert (select insider_competition_id from profiles where id = '00000000-0000-0000-0000-00000000e00a') = 990301,
         'a je poznavalec';
  assert (select insider_competition_id from profiles where id = '00000000-0000-0000-0000-00000000e00b') = 990301,
         'b je poznavalec';
  assert (select insider_competition_id from profiles where id = '00000000-0000-0000-0000-00000000e00d') is null,
         'nekoč omejen d ni poznavalec';
  assert (select insider_competition_id from profiles where id = '00000000-0000-0000-0000-00000000e00e') is null,
         'nov račun e ni poznavalec';
  assert (select count(*) from samodejni_poznavalci where odvzeto_at is null) = 3, 'a, b, c';
end;
$$;

-- Uporabnik vidi le svojo vrstico.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e00a","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e00a', true);
do $$
begin
  assert (select count(*) from samodejni_poznavalci) = 1, 'le svoja vrstica';
end;
$$;

-- Admin odvzame a: dokončno.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e00f","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e00f', true);
select admin_nastavi_poznavalca('00000000-0000-0000-0000-00000000e00a', null);
do $$
begin
  assert (select count(*) from admin_samodejni_poznavalci()) = 3, 'admin vidi vse';
end;
$$;
reset role;

-- b se zmoti pri polovici igralcev: 10/20 je pod 75 %.
update position_votes set position = 'DEF'
 where voter_id = '00000000-0000-0000-0000-00000000e00b' and player_id between 990401 and 990410;
select podeli_samodejne_poznavalce();
do $$
begin
  assert (select insider_competition_id from profiles where id = '00000000-0000-0000-0000-00000000e00a') is null,
         'admin odvzem ostane';
  assert (select odvzel from samodejni_poznavalci where user_id = '00000000-0000-0000-0000-00000000e00a')
         = '00000000-0000-0000-0000-00000000e00f', 'odvzel admin';
  assert (select insider_competition_id from profiles where id = '00000000-0000-0000-0000-00000000e00b') is null,
         'b je izgubil poznavalca';
  assert (select odvzeto_at is not null and odvzel is null from samodejni_poznavalci
           where user_id = '00000000-0000-0000-0000-00000000e00b'), 'samodejni odvzem';
  assert (select insider_competition_id from profiles where id = '00000000-0000-0000-0000-00000000e00c') = 990301,
         'c ostane';
end;
$$;

select 'samodejni-poznavalci: ok';
rollback;
