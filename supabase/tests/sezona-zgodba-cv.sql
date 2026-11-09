-- Moja sezona, zgodba po tekmi in CV (20261109193000, SLF-373).
-- Teče v transakciji in se povrne.
--
-- V: preverjen (938601 + povezana vrstica 938602 v drugi ligi), P: potrjen,
-- ne preverjen (938603), F: tujec, gost: anon.
begin;

insert into settings (key, value) values ('preverjeni_racuni', '2')
  on conflict (key) do update set value = '2';

insert into auth.users (id, email)
values ('e3900000-0000-4000-8000-000000000001', 'szc-v@test.invalid'),
       ('e3900000-0000-4000-8000-000000000002', 'szc-p@test.invalid'),
       ('e3900000-0000-4000-8000-000000000003', 'szc-f@test.invalid'),
       ('e3900000-0000-4000-8000-000000000006', 'szc-ad@test.invalid');
update profiles set is_admin = true where id = 'e3900000-0000-4000-8000-000000000006';

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (938501, 'test-szc-a', 'SZC A', 'SA', false, (select id from countries where code = 'SI'), 'mnzg'),
       (938502, 'test-szc-b', 'SZC B', 'SB', false, (select id from countries where code = 'SI'), 'mnzg');
insert into teams (id, name, country_id) overriding system value
values (938511, 'NK Domači', (select id from countries where code = 'SI')),
       (938512, 'NK Gostje', (select id from countries where code = 'SI'));
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (938601, 938511, 938501, 'Vid', 'Sezona', 'Vid Sezona', 'FWD', 'admin', 5, 5, true),
       (938602, 938511, 938502, 'Vid', 'Sezona', 'Vid Sezona', 'FWD', 'admin', 5, 5, true),
       (938603, 938511, 938501, 'Pia', 'Sezona', 'Pia Sezona', 'DEF', 'admin', 5, 5, true);
insert into zahtevki_igralca (id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (938701, 938601, 'e3900000-0000-4000-8000-000000000001', 'potrjen', 'admin', now()),
       (938703, 938603, 'e3900000-0000-4000-8000-000000000002', 'potrjen', 'admin', now());
insert into povezani_igralci (player_id, zahtevek_id) values (938602, 938701);
insert into preverjeni_racuni (user_id, player_id, vir, status, velja_do, star_vsaj_18, odpoved_pravici)
values ('e3900000-0000-4000-8000-000000000001', 938601, 'rocno', 'aktiven', null, null, null);
insert into profil_igralca (player_id, vzdevek, opis) values (938601, 'Vidko', 'Napadalec, ki rad zadene.');

-- Dve odigrani tekmi v A: prva 1 gol, druga (zadnja) 3 goli; ena v B.
insert into rounds (id, season, number, deadline_at, played_on, competition_id) overriding system value
values (938801, sezona_lige(938501), 1, now() - interval '14 days', current_date - 14, 938501),
       (938802, sezona_lige(938501), 2, now() - interval '7 days', current_date - 7, 938501),
       (938803, sezona_lige(938502), 1, now() - interval '20 days', current_date - 20, 938502);
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at) overriding system value
values (938901, 938801, 938511, 938512, 1, 0, current_date - 14, now()),
       (938902, 938802, 938512, 938511, 1, 3, current_date - 7, now()),
       (938903, 938803, 938511, 938512, 0, 0, current_date - 20, now());
insert into appearances (match_id, player_id, team_id, started, minutes_played, goals, yellow_cards, red_cards)
values (938901, 938601, 938511, true, 90, 1, 1, 0),
       (938902, 938601, 938511, true, 85, 3, 0, 0),
       (938901, 938603, 938511, true, 90, 0, 0, 0),
       (938903, 938602, 938511, false, 20, 0, 0, 0);

create temp table r (k text primary key, v text);
grant all on r to anon, authenticated;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into r values ('gost_cv', (select (public.cv_igralca(938601) ->> 'vzdevek')));
insert into r values ('gost_cv_p', (public.cv_igralca(938603) is null)::text);
reset role;

set local role authenticated;
do $$
declare
  j jsonb;
begin
  perform set_config('request.jwt.claim.sub', 'e3900000-0000-4000-8000-000000000001', true);
  j := public.moja_sezona(938601);
  insert into r values
    ('v_preverjen', j ->> 'preverjen'), ('v_goli', j ->> 'goli'), ('v_minute', j ->> 'minute'),
    ('v_rumeni', j ->> 'rumeni'), ('v_najboljsa_goli', j -> 'najboljsa' ->> 'goli');
  j := public.zadnja_tekma_zgodba(938601);
  insert into r values ('v_zadnja', (j ->> 'tekma') || ':' || (j ->> 'goli') || ':' || (j ->> 'doma'));
  j := public.cv_igralca(938601);
  insert into r values ('v_cv_sezone', jsonb_array_length(j -> 'sezone')::text), ('v_cv_opis', j ->> 'opis');
  j := public.moj_highlight(938601);
  insert into r values ('v_highlight', (j ->> 'posnetkov') || '/' || (j ->> 'potrebnih'));

  perform set_config('request.jwt.claim.sub', 'e3900000-0000-4000-8000-000000000002', true);
  j := public.moja_sezona(938603);
  insert into r values ('p_preverjen', j ->> 'preverjen'), ('p_tocke', coalesce(j ->> 'tocke', 'brez')),
    ('p_zgodba', (public.zadnja_tekma_zgodba(938603) is null)::text);

  perform set_config('request.jwt.claim.sub', 'e3900000-0000-4000-8000-000000000003', true);
  insert into r values ('f_sezona', (public.moja_sezona(938601) is null)::text),
    ('f_zgodba', (public.zadnja_tekma_zgodba(938601) is null)::text),
    ('f_highlight', (public.moj_highlight(938601) is null)::text);
  begin
    perform public.admin_highlight_vrsta();
    insert into r values ('f_vrsta', 'uspelo');
  exception when others then
    insert into r values ('f_vrsta', 'zavrnjeno');
  end;

  perform set_config('request.jwt.claim.sub', 'e3900000-0000-4000-8000-000000000006', true);
  perform public.admin_highlight_stanje(938601, 'v_delu', 'test');
  insert into r values ('ad_vrsta', (select stanje from public.admin_highlight_vrsta() where igralec = 938601));
end $$;
reset role;

do $$
declare
  v_pricakovano jsonb := jsonb_build_object(
    'gost_cv', 'Vidko', 'gost_cv_p', 'true',
    'v_preverjen', 'true', 'v_goli', '4', 'v_minute', '175', 'v_rumeni', '1', 'v_najboljsa_goli', '3',
    'v_zadnja', '938902:3:false', 'v_cv_sezone', '2', 'v_cv_opis', 'Napadalec, ki rad zadene.',
    'p_preverjen', 'false', 'p_tocke', 'brez', 'p_zgodba', 'true',
    'f_sezona', 'true', 'f_zgodba', 'true',
    'v_highlight', '0/6', 'f_highlight', 'true', 'f_vrsta', 'zavrnjeno', 'ad_vrsta', 'v_delu');
  v_k text;
  v_dobljeno text;
begin
  for v_k in select jsonb_object_keys(v_pricakovano) loop
    select v into v_dobljeno from r where k = v_k;
    if v_dobljeno is distinct from v_pricakovano ->> v_k then
      raise exception 'sezona-zgodba-cv: % je %, pričakovano %', v_k, coalesce(v_dobljeno, 'NULL'), v_pricakovano ->> v_k;
    end if;
  end loop;
  raise notice 'sezona-zgodba-cv: vse OK (%)', (select count(*) from r);
end $$;

rollback;
