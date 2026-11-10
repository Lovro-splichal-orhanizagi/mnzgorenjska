-- Promocija preverjenega profila (SLF-383): kdo pride v kohorto in zakaj ne,
-- paket do 20, en mail na človeka. Vse se na koncu povrne.
begin;
set local statement_timeout = '15s';
create function pg_temp.pp_user(n int) returns uuid language sql immutable as $$
  select ('a3830000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;
create function pg_temp.pp_assert(p_label text, p_ok boolean) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'PROMO_TEST: %', p_label; end if;
  raise notice 'PASS %', p_label;
end $$;
create function pg_temp.pp_razlog(n int) returns text language sql as $$
  select coalesce(k.razlog, 'ok') from promo_preverjen_kohorta() k where k.user_id = pg_temp.pp_user(n);
$$;

insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-938301, 'test-promo-clani', 'Promo test', 'PT', false, (select id from countries where code = 'HU'), 'mnzg'),
       (-938302, 'test-promo-mladinci', 'Promo test U19', 'PTU', false, (select id from countries where code = 'HU'), 'mnzg');
insert into teams(id, name, short_name, country_id) overriding system value
values (-938301, 'Promo test', 'PT', (select id from countries where code = 'HU'));
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, value, value_start) overriding system value
select -938300 - n, -938301, case when n = 2 then -938302 else -938301 end,
       'Promo', 'Igralec ' || n, 'Promo Igralec ' || n, 'MID', 6, 6
  from generate_series(1, 10) n;

-- 1 ustrezen, 2 mladinec, 3 odjavljen, 4 neaktiven, 5 admin, 6 preverjen,
-- 7 dobil anketo, 8 nepotrjen naslov, 9 ustrezen z istim naslovom kot 1 (velike črke), 10 ustrezen
insert into auth.users(id, email, email_confirmed_at, last_sign_in_at, created_at)
select pg_temp.pp_user(n),
       case when n = 9 then 'PROMO-1@example.invalid' else 'promo-' || n || '@example.invalid' end,
       case when n = 8 then null else now() end,
       case when n = 4 then now() - interval '120 days' when n = 9 then now() - interval '5 days' else now() - interval '1 day' end,
       now() - interval '200 days'
  from generate_series(1, 10) n;
insert into profiles(id, display_name) select pg_temp.pp_user(n), 'Promo ' || n from generate_series(1, 10) n
on conflict (id) do nothing;
update profiles set brez_opomnikov = true where id = pg_temp.pp_user(3);
update profiles set is_admin = true where id = pg_temp.pp_user(5);
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
select -938300 - n, pg_temp.pp_user(n), 'potrjen', 'admin', now() from generate_series(1, 10) n;
insert into preverjeni_racuni(player_id, user_id, vir, status)
values (-938306, pg_temp.pp_user(6), 'rocno', 'aktiven');
insert into email_log(user_id, email, vrsta) values (pg_temp.pp_user(7), 'promo-7@example.invalid', 'anketa-placila');

select pg_temp.pp_assert('ustrezen', pg_temp.pp_razlog(1) = 'ok');
select pg_temp.pp_assert('mladinec izpuščen', pg_temp.pp_razlog(2) = 'ni_odrasla_oseba');
select pg_temp.pp_assert('odjavljen izpuščen', pg_temp.pp_razlog(3) = 'odjavljen');
select pg_temp.pp_assert('neaktiven izpuščen', pg_temp.pp_razlog(4) = 'neaktiven');
select pg_temp.pp_assert('admin izpuščen', pg_temp.pp_razlog(5) = 'admin');
select pg_temp.pp_assert('preverjen izpuščen', pg_temp.pp_razlog(6) = 'ze_preverjen');
select pg_temp.pp_assert('prejemnik ankete izpuščen', pg_temp.pp_razlog(7) = 'anketa_placila');
select pg_temp.pp_assert('nepotrjen naslov izpuščen', pg_temp.pp_razlog(8) = 'neaktiven_racun');
select pg_temp.pp_assert('isti naslov le enkrat (bolj nedavno aktiven ostane)', pg_temp.pp_razlog(9) = 'podvojen_naslov');
select pg_temp.pp_assert('ustrezen 10', pg_temp.pp_razlog(10) = 'ok');

select pg_temp.pp_assert('kohorta brez pravic za anon in authenticated',
  not has_function_privilege('anon', 'public.promo_preverjen_kohorta()', 'execute')
  and not has_function_privilege('authenticated', 'public.promo_preverjen_kohorta()', 'execute')
  and not has_table_privilege('authenticated', 'public.promo_preverjen_paketi', 'select'));

-- Paket: le ustrezni (testni + morebitni drugi v bazi, največ 20); drugi paket jih ne ponovi.
do $$
declare v1 bigint; v2 bigint; ids uuid[];
begin
  v1 := promo_preverjen_nov_paket(20, 500);
  select user_ids into ids from promo_preverjen_paketi where id = v1;
  perform pg_temp.pp_assert('paket vsebuje 1 in 10, ne izpuščenih',
    pg_temp.pp_user(1) = any(ids) and pg_temp.pp_user(10) = any(ids)
    and not (ids && array[pg_temp.pp_user(2), pg_temp.pp_user(3), pg_temp.pp_user(9)]) and cardinality(ids) <= 20);
  v2 := promo_preverjen_nov_paket(20, 500);
  perform pg_temp.pp_assert('drugi paket ne ponovi članov',
    v2 is null or not exists (select 1 from promo_preverjen_paketi p where p.id = v2
                                and p.user_ids && array[pg_temp.pp_user(1), pg_temp.pp_user(10)]));
  begin
    insert into promo_preverjen_paketi(user_ids) select array_agg(gen_random_uuid()) from generate_series(1, 21);
    raise exception 'PROMO_TEST: paket z 21 sprejet';
  exception when check_violation then null;
  end;
  perform pg_temp.pp_assert('meja 0 ne naredi paketa', promo_preverjen_nov_paket(20, 0) is null);
end $$;

-- En mail na človeka: druga zasedba vrne 0; po uspehu je razlog ze_dobil.
do $$
declare z1 bigint; z2 bigint;
begin
  z1 := promo_preverjen_zasedi(pg_temp.pp_user(1), 'promo-1@example.invalid', 500);
  z2 := promo_preverjen_zasedi(pg_temp.pp_user(1), 'promo-1@example.invalid', 500);
  perform pg_temp.pp_assert('zasedba enkrat', z1 > 0 and z2 = 0);
  perform pg_temp.pp_assert('med pošiljanjem v_teku', pg_temp.pp_razlog(1) = 'v_teku');
  update email_log set napaka = null where id = z1;
  perform pg_temp.pp_assert('po uspehu ze_dobil', pg_temp.pp_razlog(1) = 'ze_dobil');
  perform pg_temp.pp_assert('drug račun z istim naslovom: naslov_ze_dobil', pg_temp.pp_razlog(9) = 'naslov_ze_dobil');
  -- Isti naslov na drugem računu: ne dobi drugega maila.
  perform pg_temp.pp_assert('drug račun z istim naslovom: zasedba -2',
    promo_preverjen_zasedi(pg_temp.pp_user(10), 'PROMO-1@example.invalid', 500) = -2);
  perform pg_temp.pp_assert('odjavljen tik pred pošiljanjem: zasedba -2',
    promo_preverjen_zasedi(pg_temp.pp_user(3), 'promo-3@example.invalid', 500) = -2);
  perform pg_temp.pp_assert('meja dosežena vrne -1',
    promo_preverjen_zasedi(pg_temp.pp_user(10), 'promo-10@example.invalid', promo_preverjen_poslanih()::int) = -1);
end $$;

rollback;
