-- Okno "Tvoj profil": pravice, štetje ogledov in skrite številke brez kljukice.
-- Teče v transakciji in se povrne (ROLLBACK).
begin;

do $$
begin
  if not has_function_privilege('anon', 'public.zabelezi_ogled_igralca(bigint,text)', 'EXECUTE') then
    raise exception 'zabelezi_ogled_igralca mora biti odprta za anon';
  end if;
  if has_function_privilege('anon', 'public.vaba_profila(bigint)', 'EXECUTE') then
    raise exception 'vaba_profila ne sme biti odprta za anon';
  end if;
  if has_table_privilege('anon', 'public.ogledi_igralcev', 'SELECT')
     or has_table_privilege('authenticated', 'public.ogledi_igralcev', 'SELECT')
     or has_table_privilege('authenticated', 'public.ogledi_igralcev', 'INSERT') then
    raise exception 'Tabela ogledi_igralcev mora biti zaprta';
  end if;
end $$;

-- Igralec, uporabnik s potrjenim profilom, brez kljukice; preverjeni vklopljeni.
do $$
declare
  v_liga bigint;
  v_igralec bigint;
  v_klub bigint;
  v_uporabnik uuid := gen_random_uuid();
  v_zahtevek bigint;
  v jsonb;
begin
  insert into settings (key, value) values ('preverjeni_racuni', '2')
  on conflict (key) do update set value = excluded.value;
  insert into competitions (slug, name, short_name, country_id, source, active)
  values ('test-vaba', 'TEST Vaba', 'TEST', (select id from countries where code = 'SI'), 'mnzg', false)
  returning id into v_liga;
  insert into teams (name, country_id) values ('TEST Vaba klub', (select id from countries where code = 'SI')) returning id into v_klub;
  insert into players (first_name, last_name, full_name, team_id, competition_id, active)
  values ('Vaba', 'Testni', 'Vaba Testni', v_klub, v_liga, true) returning id into v_igralec;
  insert into auth.users (id, email) values (v_uporabnik, 'vaba-test@example.invalid');
  insert into zahtevki_igralca (player_id, user_id, status)
  values (v_igralec, v_uporabnik, 'potrjen') returning id into v_zahtevek;

  -- Štetje: vsak klic je ogled, neznan igralec ne šteje.
  perform zabelezi_ogled_igralca(v_igralec, 'si');
  perform zabelezi_ogled_igralca(v_igralec, 'SI');
  perform zabelezi_ogled_igralca(-1, 'SI');
  if (select stevilo from ogledi_igralcev where igralec = v_igralec and drzava = 'SI') <> 2
     or exists (select 1 from ogledi_igralcev where igralec = -1) then
    raise exception 'Ogledi se ne štejejo pravilno';
  end if;

  -- Tujec: null. Lastnik brez kljukice: le {"preverjen": false}, brez številk.
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  if vaba_profila(v_igralec) is not null then
    raise exception 'Tujec ne sme dobiti okna';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uporabnik, 'role', 'authenticated')::text, true);
  v := vaba_profila(v_igralec);
  if v is distinct from '{"preverjen": false}'::jsonb then
    raise exception 'Lastnik brez kljukice dobi preveč: %', v;
  end if;
end $$;

rollback;
