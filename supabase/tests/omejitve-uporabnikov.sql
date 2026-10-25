-- Omejitve uporabnikov (20261025111100): omejen račun ne prijavlja, ne piše
-- v klepet in ne glasuje; neomejen in tisti s pretečeno omejitvijo lahko.
-- Teče v transakciji in se povrne: psql -v ON_ERROR_STOP=1 -f tega.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000d001', 'omejen@test.invalid'),
  ('00000000-0000-0000-0000-00000000d002', 'prost@test.invalid'),
  ('00000000-0000-0000-0000-00000000d003', 'potekel@test.invalid'),
  ('00000000-0000-0000-0000-00000000d004', 'admin-omejitve@test.invalid');
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000d001', 'Omejen test'),
  ('00000000-0000-0000-0000-00000000d002', 'Prost test'),
  ('00000000-0000-0000-0000-00000000d003', 'Potekel test'),
  ('00000000-0000-0000-0000-00000000d004', 'Admin omejitve')
on conflict (id) do nothing;
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000d004';
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (990101, 'test-omejitve', 'Test omejitve', 'TO', false, 1, 'test');
insert into teams (id, name, country_id) overriding system value values (990111, 'NK Omejitve', 1);
insert into players (id, competition_id, team_id, full_name, last_name, first_name) overriding system value
values (990141, 990101, 990111, 'Kos Jan', 'Kos', 'Jan');

-- Omejitev, ki je že potekla, ne šteje.
insert into omejitve_uporabnikov (user_id, velja_do, razlog)
values ('00000000-0000-0000-0000-00000000d003', now() - interval '1 hour', 'stara');

-- Brez prijave admin RPC-jev ni.
set local role anon;
do $$
begin
  begin
    perform admin_omeji_uporabnika('00000000-0000-0000-0000-00000000d001', 7, 'x');
    raise exception 'anon je omejil';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform admin_omejitve();
    raise exception 'anon bere omejitve';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Navaden uporabnik ne omeji nikogar.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d002', true);
do $$
begin
  perform admin_omeji_uporabnika('00000000-0000-0000-0000-00000000d001', 7, 'x');
  raise exception 'uporabnik je omejil';
exception when insufficient_privilege then
  null;
end;
$$;

-- Admin omeji.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d004","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d004', true);
do $$
begin
  perform admin_omeji_uporabnika('00000000-0000-0000-0000-00000000d001', 7, 'lažne prijave');
  assert (select count(*) from admin_omejitve() where user_id = '00000000-0000-0000-0000-00000000d001') = 1, 'seznam omejitev';
  -- Nova omejitev nadomesti staro.
  perform admin_omeji_uporabnika('00000000-0000-0000-0000-00000000d001', 30, 'še enkrat');
  assert (select count(*) from admin_omejitve() where user_id = '00000000-0000-0000-0000-00000000d001') = 1, 'ena veljavna';
end;
$$;

-- Omejeni ne piše nikamor.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);
do $$
declare
  v_napaka text;
begin
  assert (select count(*) from omejitve_uporabnikov) = 2, 'svoje omejitve vidi (ne tujih)';
  begin
    insert into player_reports (player_id, user_id, kind, content)
    values (990141, '00000000-0000-0000-0000-00000000d001', 'drugo', 'troll');
    raise exception 'prijava omejenega sprejeta';
  exception when insufficient_privilege then
    v_napaka := sqlerrm;
  end;
  assert v_napaka like 'Račun je omejen do 20%Z.', 'sporočilo: ' || v_napaka;
  begin
    insert into chat_messages (user_id, content, alias, country_code)
    values ('00000000-0000-0000-0000-00000000d001', 'troll', 'x', 'SI');
    raise exception 'klepet omejenega sprejet';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into position_votes (player_id, voter_id, position)
    values (990141, '00000000-0000-0000-0000-00000000d001', 'GK');
    raise exception 'glas omejenega sprejet';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform admin_omejitve();
    raise exception 'omejeni bere seznam';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Neomejen in tisti s pretečeno omejitvijo lahko.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d002', true);
insert into player_reports (player_id, user_id, kind, content)
values (990141, '00000000-0000-0000-0000-00000000d002', 'poskodba', 'koleno');
insert into position_votes (player_id, voter_id, position)
values (990141, '00000000-0000-0000-0000-00000000d002', 'MID');
insert into chat_messages (user_id, content, alias, country_code)
values ('00000000-0000-0000-0000-00000000d002', 'živjo', 'prost', 'SI');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d003","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d003', true);
insert into player_reports (player_id, user_id, kind, content)
values (990141, '00000000-0000-0000-0000-00000000d003', 'vrnitev', 'nazaj');

-- Admin omejitev odstrani in uporabnik spet piše.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d004","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d004', true);
select admin_odstrani_omejitev(id) from admin_omejitve() where user_id = '00000000-0000-0000-0000-00000000d001';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000d001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);
insert into player_reports (player_id, user_id, kind, content)
values (990141, '00000000-0000-0000-0000-00000000d001', 'drugo', 'po omejitvi');

reset role;

-- Sprožilec je na vseh poteh pisanja.
do $$
declare
  v_manjka text;
begin
  select string_agg(t, ', ') into v_manjka
    from unnest(array['player_reports', 'chat_messages', 'assist_votes', 'position_votes',
                      'prijave_mini_lig', 'prijave_profila_igralca', 'potrditve_soigralcev']) t
   where not exists (select 1 from pg_trigger g where g.tgrelid = ('public.' || t)::regclass
                        and g.tgname = 'zavrni_omejenega' and not g.tgisinternal);
  assert v_manjka is null, 'brez sprožilca: ' || v_manjka;
  assert not has_function_privilege('authenticated', 'public.je_omejen(uuid)', 'execute'), 'je_omejen zaprt';
  assert not has_function_privilege('anon', 'public.admin_omeji_uporabnika(uuid,integer,text)', 'execute'), 'anon admin';
end;
$$;

select 'omejitve-uporabnikov: ok';
rollback;
