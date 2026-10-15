-- Anglija (step 3–4): Isthmian League, Northern Premier League in Southern
-- League z vira `isthmian` — vse tri lige objavljajo na isti platformi
-- (Streamline Content) z javnim JSON (`api.<domena>/matches`, glava
-- `x-tenant-id` isthmian | npl | sfl). Glej CLAUDE.md (Anglija — vir isthmian).
--
-- Država je `GB` (ISO 3166-1 alpha-2, kot pove `countries.code`): `GB-ENG` je
-- oznaka ISO 3166-2 in bi z vezajem podrla pravilo "šifra lige se začne s
-- kodo države" (`gb-…`), IP obiskovalca iz Anglije pa je tako ali tako `GB`.
-- Ime države je "England", ker gre za angleško piramido (FA).
--
-- Šifra lige je `<tenant>/<tekmovanje>/<LLLL-LL>`: tekmovanje je stalno čez
-- sezone, ob novi sezoni se popravi le sezona. Arhiv 2025/26 je ista šifra s
-- sezono `2025-26`:
--   Isthmian in NPL (8 lig): arhiv 2025/26 uporaben — vsi zapisniki s postavo
--     11 + 11, goli = izid (npr. isthmian/67d7d01f749090308acc101e/2025-26,
--     npl/67d7c7bb74247876e6dae40a/2025-26 …).
--   Southern League (4 lige): arhiva NI — tekmovanja so bila za 2026/27
--     prenesena na novo platformo, 2025/26 ima imena ekip "P"/"p", 16
--     "začetnikov" in večino tekem brez postav. Cene le iz tekoče sezone.
--
-- Sezona avgust–maj (ne koledarska). Vse lige so NEAKTIVNE; uvoz ni bil pognan.

insert into countries (code, name, sort_order) values ('GB', 'United Kingdom', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.name, v.short_name, v.site_url, v.sort_order
  from countries d
  cross join (values
    ('isthmian', 'Isthmian Football League', 'Isthmian League', 'https://www.isthmian.co.uk/', 1401),
    ('npl', 'Northern Premier League', 'NPL', 'https://www.thenpl.co.uk/', 1402),
    ('sfl', 'Southern Football League', 'Southern League', 'https://www.southern-football-league.co.uk/', 1403)
  ) as v(code, name, short_name, site_url, sort_order)
 where d.code = 'GB'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'isthmian', v.koda, 1, v.vrstni, 6, false,
       f.short_name, f.site_url || v.tabela
  from countries d
  cross join (values
    -- slug, ime, kratko ime, zveza, šifra (tekoča 2026/27), stran lestvice, vrstni red
    ('gb-isthmian-premier', 'Isthmian League Premier Division', 'Isthmian Premier', 'isthmian', 'isthmian/67d7d01f749090308acc101e/2026-27', 'tables/premier', 10),
    ('gb-isthmian-north', 'Isthmian League North Division', 'Isthmian North', 'isthmian', 'isthmian/67d7d0c1749090308acc1021/2026-27', 'tables/north', 20),
    ('gb-isthmian-south-central', 'Isthmian League South Central Division', 'Isthmian South Central', 'isthmian', 'isthmian/67d7d11a749090308acc1022/2026-27', 'tables/south-central', 30),
    ('gb-isthmian-south-east', 'Isthmian League South East Division', 'Isthmian South East', 'isthmian', 'isthmian/67d7d187749090308acc1023/2026-27', 'tables/south-east', 40),
    ('gb-npl-premier', 'Northern Premier League Premier Division', 'NPL Premier', 'npl', 'npl/67d7c7bb74247876e6dae40a/2026-27', 'tables/premier', 50),
    ('gb-npl-east', 'Northern Premier League East Division', 'NPL East', 'npl', 'npl/67d7c7bb74247876e6dae40b/2026-27', 'tables/east', 60),
    ('gb-npl-west', 'Northern Premier League West Division', 'NPL West', 'npl', 'npl/67d7c7bb74247876e6dae40d/2026-27', 'tables/west', 70),
    ('gb-npl-midlands', 'Northern Premier League Midlands Division', 'NPL Midlands', 'npl', 'npl/67d7c7bb74247876e6dae40c/2026-27', 'tables/midlands', 80),
    ('gb-sfl-premier-south', 'Southern League Premier Division South', 'SFL Premier South', 'sfl', 'sfl/69d0bd99b616bafb97331d3f/2026-27', 'tables/premier-south', 90),
    ('gb-sfl-premier-central', 'Southern League Premier Division Central', 'SFL Premier Central', 'sfl', 'sfl/69d0bdbab616bafb97331d40/2026-27', 'tables/premier-central', 100),
    ('gb-sfl-d1-south', 'Southern League Division One South', 'SFL D1 South', 'sfl', 'sfl/69d0bdf9b616bafb97331d41/2026-27', 'tables/division-one-south', 110),
    ('gb-sfl-d1-central', 'Southern League Division One Central', 'SFL D1 Central', 'sfl', 'sfl/69d0be24b616bafb97331d42/2026-27', 'tables/division-one-central', 120)
  ) as v(slug, ime, kratko, zveza, koda, tabela, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'GB'
on conflict (slug) do nothing;
