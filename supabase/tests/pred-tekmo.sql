-- Pred tekmo (20261109192000, SLF-373): poročilo le preverjenemu lastniku,
-- naslednja tekma v 10 dneh, forma, strelci in minute nasprotnika, kartoni
-- lastne ekipe (od 3 rumenih), medsebojne tekme, brez anonimiziranih.
-- Teče v transakciji in se povrne.
begin;

insert into settings (key, value) values ('preverjeni_racuni', '2')
  on conflict (key) do update set value = '2';

insert into auth.users (id, email)
values ('e3800000-0000-4000-8000-000000000001', 'pt-v@test.invalid'),
       ('e3800000-0000-4000-8000-000000000002', 'pt-p@test.invalid'),
       ('e3800000-0000-4000-8000-000000000003', 'pt-f@test.invalid');

insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (938001, 'test-pt', 'PT', 'PT', false, (select id from countries where code = 'SI'), 'mnzg');
insert into teams (id, name, country_id) overriding system value
values (938011, 'NK Moji', (select id from countries where code = 'SI')),
       (938012, 'NK Tuji', (select id from countries where code = 'SI'));
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active, anonimiziran_at) overriding system value
values (938101, 938011, 938001, 'Vid', 'Moj', 'Vid Moj', 'MID', 'admin', 5, 5, true, null),     -- V, preverjen
       (938102, 938011, 938001, 'Pia', 'Moja', 'Pia Moja', 'DEF', 'admin', 5, 5, true, null),   -- P, potrjen, ne preverjen
       (938103, 938011, 938001, 'Kar', 'Ton', 'Kar Ton', 'DEF', 'admin', 5, 5, true, null),     -- 3 rumeni
       (938111, 938012, 938001, 'Gol', 'Ster', 'Gol Ster', 'FWD', 'admin', 5, 5, true, null),   -- strelec
       (938112, 938012, 938001, '#', 'Skrit', '#938112', 'FWD', 'admin', 5, 5, true, now());    -- anonimiziran strelec
insert into zahtevki_igralca (id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (938201, 938101, 'e3800000-0000-4000-8000-000000000001', 'potrjen', 'admin', now()),
       (938202, 938102, 'e3800000-0000-4000-8000-000000000002', 'potrjen', 'admin', now());
insert into preverjeni_racuni (user_id, player_id, vir, status, velja_do, star_vsaj_18, odpoved_pravici)
values ('e3800000-0000-4000-8000-000000000001', 938101, 'rocno', 'aktiven', null, null, null);

-- Odigrani krog 1 (Moji 2:1 Tuji) in prihodnji krog 2 (Tuji : Moji čez 3 dni).
insert into rounds (id, season, number, deadline_at, played_on, competition_id) overriding system value
values (938301, sezona_lige(938001), 1, now() - interval '7 days', current_date - 7, 938001),
       (938302, sezona_lige(938001), 2, now() + interval '3 days', current_date + 3, 938001);
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at) overriding system value
values (938401, 938301, 938011, 938012, 2, 1, current_date - 7, now()),
       (938402, 938302, 938012, 938011, 0, 0, current_date + 3, null);
insert into appearances (match_id, player_id, team_id, started, minutes_played, goals, yellow_cards, red_cards)
values (938401, 938101, 938011, true, 90, 2, 0, 0),
       (938401, 938103, 938011, true, 90, 0, 3, 0),
       (938401, 938111, 938012, true, 90, 1, 0, 0),
       (938401, 938112, 938012, true, 80, 1, 0, 0);

create temp table r (k text primary key, v text);
grant all on r to authenticated;
set local role authenticated;
do $$
declare
  j jsonb;
begin
  perform set_config('request.jwt.claim.sub', 'e3800000-0000-4000-8000-000000000001', true);
  j := public.pred_tekmo(938101);
  insert into r values
    ('v_tekma', j -> 'tekma' ->> 'id'),
    ('v_doma', j -> 'tekma' ->> 'doma'),
    ('v_nasprotnik', j -> 'tekma' -> 'nasprotnik' ->> 'ime'),
    ('v_forma_klub', (j -> 'forma' -> 'klub' -> 0 ->> 'dani') || ':' || (j -> 'forma' -> 'klub' -> 0 ->> 'prejeti')),
    ('v_strelci', (select string_agg(e ->> 'ime', ',') from jsonb_array_elements(j -> 'strelci') e)),
    ('v_kartoni', (select string_agg(e ->> 'ime' || '=' || (e ->> 'rumeni'), ',') from jsonb_array_elements(j -> 'kartoni') e)),
    ('v_medsebojno', jsonb_array_length(j -> 'medsebojno')::text),
    ('v_jaz_goli', j -> 'jaz' -> 0 ->> 'goli');
  -- Nepreverjen lastnik in tujec dobita null.
  perform set_config('request.jwt.claim.sub', 'e3800000-0000-4000-8000-000000000002', true);
  insert into r values ('p_null', (public.pred_tekmo(938102) is null)::text);
  perform set_config('request.jwt.claim.sub', 'e3800000-0000-4000-8000-000000000003', true);
  insert into r values ('f_null', (public.pred_tekmo(938101) is null)::text);
end $$;
reset role;

do $$
declare
  v_pricakovano jsonb := jsonb_build_object(
    'v_tekma', '938402', 'v_doma', 'false', 'v_nasprotnik', 'NK Tuji', 'v_forma_klub', '2:1',
    'v_strelci', 'Gol Ster', 'v_kartoni', 'Kar Ton=3', 'v_medsebojno', '1', 'v_jaz_goli', '2',
    'p_null', 'true', 'f_null', 'true');
  v_k text;
  v_dobljeno text;
begin
  for v_k in select jsonb_object_keys(v_pricakovano) loop
    select v into v_dobljeno from r where k = v_k;
    if v_dobljeno is distinct from v_pricakovano ->> v_k then
      raise exception 'pred-tekmo: % je %, pričakovano %', v_k, coalesce(v_dobljeno, 'NULL'), v_pricakovano ->> v_k;
    end if;
  end loop;
  raise notice 'pred-tekmo: vse OK (%)', (select count(*) from r);
end $$;

rollback;
