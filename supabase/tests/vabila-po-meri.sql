-- Povabila po meri (20261114200000): berljiva koda, izbira kode, zasedenost,
-- stara koda velja, seznam povabljenih. Teče v transakciji in se povrne.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000aa001', 'a@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000aa002', 'b@test.invalid', now());
insert into profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000aa001', 'Žiga Novak'),
  ('00000000-0000-0000-0000-0000000aa002', 'B')
on conflict (id) do update set display_name = excluded.display_name;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000aa001","role":"authenticated"}', true);
do $$
declare v_napaka text;
begin
  assert moja_koda_vabila() ~ '^ziga[0-9]+$', 'berljiva koda iz imena: ' || moja_koda_vabila();
  assert nastavi_kodo_vabila(' ZigaN ') = 'zigan', 'izbrana koda';
  assert vabilo_od('zigan') ->> 'ime' = 'Žiga Novak', 'stran vabila';
  assert vabilo_od('ni-te-kode') is null, 'neznana koda';
  begin perform nastavi_kodo_vabila('ab'); exception when others then v_napaka := sqlerrm; end;
  assert v_napaka like 'Koda ima lahko%', 'oblika';
  v_napaka := null;
  begin perform nastavi_kodo_vabila('admin'); exception when others then v_napaka := sqlerrm; end;
  assert v_napaka = 'Ta koda ni na voljo.', 'rezervirana';
  begin
    perform 1 from stare_kode_vabil;
    raise exception 'tabela berljiva';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
create temp table t_stara as select koda from stare_kode_vabil where user_id = '00000000-0000-0000-0000-0000000aa001' limit 1;
grant select on t_stara to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000aa002","role":"authenticated"}', true);
do $$
declare v_napaka text;
begin
  begin perform nastavi_kodo_vabila('zigan'); exception when others then v_napaka := sqlerrm; end;
  assert v_napaka = 'Ta koda ni na voljo.', 'zasedena';
  assert zabelezi_povabilo((select koda from t_stara)), 'stara koda še šteje';
end;
$$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000aa001","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from moji_povabljeni() where ime = 'B') = 1, 'seznam povabljenih';
end;
$$;
reset role;
rollback;
