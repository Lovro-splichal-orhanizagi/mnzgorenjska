-- SLF-366: državna lestvica po starostnih skupinah. Pravi RPC-ji in prava
-- shema; vse se na koncu povrne. Preverja, da se mladi (U18 in mlajši) in
-- glavna skupina (člani + U19) ne mešata, da je meja pri U19, da je skupina
-- določena PRED omejitvijo na prvih N, da druga država ne pride zraven, da
-- lige z neznano skupino niso nikjer in da sta lestvici ločeni tudi pri klubih.
begin;
set local statement_timeout = '30s';

create temporary table sk_rezultati (opis text, uspeh boolean);
create function pg_temp.preveri(opis text, uspeh boolean) returns void language plpgsql as $$
begin
  insert into sk_rezultati values (opis, coalesce(uspeh, false));
  raise notice '% %', case when uspeh then 'PASS' else 'FAIL' end, opis;
  if not coalesce(uspeh, false) then raise exception 'FAIL: %', opis; end if;
end $$;

-- Razvrščanje po šifri in imenu (neodvisno od baze).
select pg_temp.preveri('clani', public.starostna_skupina_iz_oznake('snl1', '1. SNL') = 'clani');
select pg_temp.preveri('mladinci = U19', public.starostna_skupina_iz_oznake('lj-mladinci', 'Mladinci 1. liga') = 'u19');
select pg_temp.preveri('sml1 = U19', public.starostna_skupina_iz_oznake('sml1', '1. SML — mladinci') = 'u19');
select pg_temp.preveri('mb-u19 = U19', public.starostna_skupina_iz_oznake('mb-u19', 'U19 — Maribor') = 'u19');
select pg_temp.preveri('kadeti pod U19', public.starostna_skupina_iz_oznake('lj-kadeti', 'Kadeti 1. liga') = 'pod_u19');
select pg_temp.preveri('skl1-u17 pod U19', public.starostna_skupina_iz_oznake('skl1-u17', '1. SKL — kadeti') = 'pod_u19');
select pg_temp.preveri('lj-u15 pod U19', public.starostna_skupina_iz_oznake('lj-u15', 'U15 1. liga') = 'pod_u19');
select pg_temp.preveri('zl-u17 pod U19', public.starostna_skupina_iz_oznake('zl-u17', 'Liga deklet U17') = 'pod_u19');
select pg_temp.preveri('U18 je pod U19', public.starostna_skupina_iz_oznake('rs-u18-bg', 'Liga mlađih omladinaca Beograda') = 'pod_u19');
select pg_temp.preveri('nasprotje šifre in imena = neznano', public.starostna_skupina_iz_oznake('hr-ri-u19', 'NS PGŽ U18') is null);
select pg_temp.preveri('U21 = neznano', public.starostna_skupina_iz_oznake('hu-no-u21', 'Nógrád vármegyei U21') is null);
select pg_temp.preveri('mladinska liga brez starosti = neznano', public.starostna_skupina_iz_oznake('mt-youth-a', 'Youth League A') is null);
select pg_temp.preveri('vsaka aktivna liga je razvrščena ali izrecno neznana',
  not exists (select 1 from public.competitions c
               where public.starostna_skupina_iz_oznake(c.slug, c.name) is not null
                 and not exists (select 1 from public.competition_starostne_skupine g
                                  where g.competition_id = c.id)));

-- Lastna država, da se ne meša z živimi podatki.
insert into countries(id, code, name) overriding system value
  values (-936601, 'ZA', 'Test A'), (-936602, 'ZB', 'Test B');
-- Testne lige nimajo krogov; varovalo vklopa tu ne velja (razvrstitveni sprožilec ostane).
alter table public.competitions disable trigger varovalo_vklopa_lige;
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
select -936600 - n, s.slug, s.ime, upper(s.slug), s.aktivna, s.drzava, 'mnzg'
  from (values
    (1, 'za-clani',        'Prva liga',       true,  -936601),
    (2, 'za-mladinci',     'Mladinci 1. liga', true, -936601),
    (3, 'za-kadeti',       'Kadeti 1. liga',  true,  -936601),
    (4, 'za-u15',          'U15 1. liga',     true,  -936601),
    (5, 'za-u21',          'U21 liga',        true,  -936601),
    (6, 'za-stara-u15',    'U15 stara',       false, -936601),
    (7, 'zb-kadeti',       'Kadeti',          true,  -936602),
    (8, 'zb-clani',        'Liga',            true,  -936602)
  ) as s(n, slug, ime, aktivna, drzava);
alter table public.competitions enable trigger varovalo_vklopa_lige;

select pg_temp.preveri('trigger razvrsti nove lige',
  (select array_agg(g.skupina order by c.id desc) from competitions c
     left join competition_starostne_skupine g on g.competition_id = c.id
    where c.id between -936608 and -936601)
  = array['clani', 'u19', 'pod_u19', 'pod_u19', null, 'pod_u19', 'pod_u19', 'clani']::text[]);

insert into teams(id, name, short_name, country_id) overriding system value
  values (-936610, 'Test klub 1', 'T1', -936601), (-936611, 'Test klub 2', 'T2', -936601);
insert into rounds(id, competition_id, season, number, played_on, deadline_at) overriding system value
select -936620 - n, -936600 - n, '2026/27', 1, '2030-01-01', '2030-01-01T12:00Z' from generate_series(1, 8) n;
-- Stara sezona clanov: ne sme prišteti.
insert into rounds(id, competition_id, season, number, played_on, deadline_at) overriding system value
  values (-936630, -936601, '2025/26', 1, '2029-01-01', '2029-01-01T12:00Z');

create function pg_temp.igralec(p_id bigint, p_liga int, p_ime text, p_poz text, p_tekem int,
                                p_goli int, p_cm int, p_tocke numeric, p_sezona text default '2026/27')
returns void language plpgsql as $$
begin
  insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, value, value_start)
    overriding system value
    values (p_id, -936610, -936600 - p_liga, 'T', p_ime, 'T ' || p_ime, p_poz, 6, 6);
  insert into statistika_igralcev(player_id, competition_id, season, matches, minutes, goals, own_goals,
                                  yellow_cards, red_cards, clean_sheets, points, assists)
    values (p_id, -936600 - p_liga, p_sezona, p_tekem, p_tekem * 90, p_goli, 0, 0, 0, p_cm, p_tocke + 3, 1);
end $$;

select pg_temp.igralec(-936701, 1, 'Clan', 'FWD', 10, 8, 0, 50);
select pg_temp.igralec(-936702, 1, 'ClanGK', 'GK', 10, 0, 5, 30);
select pg_temp.igralec(-936703, 2, 'U19', 'MID', 9, 7, 0, 45);
select pg_temp.igralec(-936704, 3, 'Kadet', 'FWD', 12, 15, 0, 80);
select pg_temp.igralec(-936705, 3, 'KadetGK', 'GK', 12, 0, 7, 60);
select pg_temp.igralec(-936706, 4, 'U15', 'MID', 11, 9, 0, 70);
select pg_temp.igralec(-936707, 5, 'U21', 'FWD', 10, 20, 0, 99);
select pg_temp.igralec(-936708, 6, 'StaraLiga', 'FWD', 10, 20, 0, 99);
select pg_temp.igralec(-936709, 7, 'DrugaDrzava', 'FWD', 10, 30, 0, 99);
select pg_temp.igralec(-936710, 8, 'DrugaClan', 'FWD', 10, 30, 0, 99);
select pg_temp.igralec(-936711, 1, 'StaraSezona', 'FWD', 30, 99, 0, 999, '2025/26');

select pg_temp.preveri('glavna: točke samo člani + U19, po vrsti',
  (select array_agg(full_name order by mesto) from public.vrh_drzave('ZA', 10, 'glavna') where kategorija = 'tocke')
  = array['T Clan', 'T U19', 'T ClanGK']);
select pg_temp.preveri('mladi: točke samo U18 in mlajši, po vrsti',
  (select array_agg(full_name order by mesto) from public.vrh_drzave('ZA', 10, 'mladi') where kategorija = 'tocke')
  = array['T Kadet', 'T U15', 'T KadetGK']);
select pg_temp.preveri('mladi: mesta so 1..n',
  (select array_agg(mesto order by mesto) from public.vrh_drzave('ZA', 10, 'mladi') where kategorija = 'tocke') = array[1, 2, 3]);
select pg_temp.preveri('mladi: omejitev na prvega po razdelitvi, ne pred njo',
  (select array_agg(full_name) from public.vrh_drzave('ZA', 1, 'mladi') where kategorija = 'tocke') = array['T Kadet']);
select pg_temp.preveri('mladi: strelci',
  (select array_agg(full_name order by mesto) from public.vrh_drzave('ZA', 10, 'mladi') where kategorija = 'goli') = array['T Kadet', 'T U15']);
select pg_temp.preveri('glavna: čiste mreže vratarja člana, ne kadeta',
  (select array_agg(full_name) from public.vrh_drzave('ZA', 10, 'glavna') where kategorija = 'ciste_mreze') = array['T ClanGK']);
select pg_temp.preveri('mladi: čiste mreže vratarja kadeta',
  (select array_agg(full_name) from public.vrh_drzave('ZA', 10, 'mladi') where kategorija = 'ciste_mreze') = array['T KadetGK']);
select pg_temp.preveri('nobena skupina ne pusti U21, neaktivne lige, tuje države ali stare sezone',
  not exists (select 1 from (select full_name from public.vrh_drzave('ZA', 50, 'glavna')
                             union all select full_name from public.vrh_drzave('ZA', 50, 'mladi')) x
               where x.full_name in ('T U21', 'T StaraLiga', 'T DrugaDrzava', 'T DrugaClan', 'T StaraSezona')));
select pg_temp.preveri('vsaka vrstica nosi skupino svoje lige',
  not exists (select 1 from public.vrh_drzave('ZA', 50, 'glavna') where starostna_skupina not in ('clani', 'u19'))
  and not exists (select 1 from public.vrh_drzave('ZA', 50, 'mladi') where starostna_skupina <> 'pod_u19'));
select pg_temp.preveri('igralec je v kategoriji le enkrat',
  not exists (select 1 from public.vrh_drzave('ZA', 50, 'glavna') group by kategorija, player_id having count(*) > 1));
select pg_temp.preveri('druga država: svoja lestvica',
  (select array_agg(full_name) from public.vrh_drzave('ZB', 10, 'mladi') where kategorija = 'goli') = array['T DrugaDrzava']
  and (select array_agg(full_name) from public.vrh_drzave('ZB', 10, 'glavna') where kategorija = 'goli') = array['T DrugaClan']);
select pg_temp.preveri('prazna skupina ali neznana vrednost = prazno',
  not exists (select 1 from public.vrh_drzave('ZZ', 10, 'mladi'))
  and not exists (select 1 from public.vrh_drzave('ZA', 10, 'vse'))
  and not exists (select 1 from public.vrh_drzave('ZA', 10, null)));
select pg_temp.preveri('star klic z imenovanima argumentoma = glavna skupina',
  (select count(*) from public.vrh_drzave(p_drzava => 'ZA', p_koliko => 10))
  = (select count(*) from public.vrh_drzave('ZA', 10, 'glavna')));
select pg_temp.preveri('anon sme klicati',
  has_function_privilege('anon', 'public.vrh_drzave(text,integer,text)', 'execute')
  and has_function_privilege('anon', 'public.vrh_klubov_drzave(text,integer,boolean,integer,text)', 'execute'));

-- Klubi: ista razdelitev; mesta so znotraj skupine.
insert into matches(id, round_id, home_team_id, away_team_id, imported_at) overriding system value
select -936640 - n, -936620 - n, -936610, -936611, clock_timestamp() from generate_series(1, 4) n;
insert into appearances(id, match_id, player_id, team_id, started, is_goalkeeper, minutes_played, minute_on, minute_off)
  overriding system value
select -936650 - p.id::int % 1000, -936640 - (-936600 - p.competition_id)::int, p.id, -936610, true, false, 90, 0, 90
  from players p where p.id in (-936701, -936703, -936704, -936706);
insert into player_scores(round_id, player_id, avg_rating, votes_count, points)
select -936620 - (-936600 - p.competition_id)::int, p.id, 6, 1, 10
  from players p where p.id in (-936701, -936703, -936704, -936706)
on conflict do nothing;

select pg_temp.preveri('klubi glavna: le člani in U19',
  (select array_agg(competition_slug order by mesto) from public.vrh_klubov_drzave('ZA', 50, false, 1, 'glavna'))
  <@ array['za-clani', 'za-mladinci']::text[]
  and not exists (select 1 from public.vrh_klubov_drzave('ZA', 50, false, 1, 'glavna')
                   where competition_slug not in ('za-clani', 'za-mladinci')));
select pg_temp.preveri('klubi mladi: le kadeti in U15',
  not exists (select 1 from public.vrh_klubov_drzave('ZA', 50, false, 1, 'mladi')
               where competition_slug not in ('za-kadeti', 'za-u15')));
select pg_temp.preveri('klubi: mesta so 1..n v vsaki skupini',
  (select array_agg(mesto order by mesto) from public.vrh_klubov_drzave('ZA', 50, false, 1, 'mladi'))
  = (select array_agg(i) from generate_series(1, (select count(*) from public.vrh_klubov_drzave('ZA', 50, false, 1, 'mladi'))::int) i));
select pg_temp.preveri('klubi: neznana skupina = prazno',
  not exists (select 1 from public.vrh_klubov_drzave('ZA', 50, false, 1, 'vse')));

rollback;
