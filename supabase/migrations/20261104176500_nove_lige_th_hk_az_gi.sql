-- Nove lige v virih, ki jih SLFF že uvaža (odobritev lastnika 4. 11. 2026):
-- Tajska (thaileague), Hongkong (hkfa), Azerbajdžan (pfl-az) in Gibraltar
-- (gfa). Vzorec kot 20261028121100, 20261028120500, 20261016094500 in
-- 20261028121300. Vse so NEAKTIVNE; uvoz ni bil pognan.

-- Tajska: ženski ligi (ena stopnja na šifro `<turnir>/<stopnja>`).
-- PEA U-21 (229/1211, 229/1212) NI vpisana: medskupinske tekme so v ločeni
-- stopnji 1213, vir pa bere eno stopnjo na šifro.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'thaileague', v.koda, 1, v.vrstni, 6, false,
       'Thai League', 'https://thaileague.co.th/results'
  from countries d
  join federations f on f.code = 'thaileague'
  cross join (values
    ('th-women-1', 'Thai Women''s League 1', 'TWL 1', '232/1222', 20),
    ('th-women-2', 'Thai Women''s League 2', 'TWL 2', '233/1226', 21)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'TH'
on conflict (slug) do nothing;

-- Hongkong: HKPL U-22 in ženska 1. in 2. divizija.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hkfa', v.koda, 1, v.vrstni, 6, false,
       'HKFA', 'https://www.hkfa.com/en/competitions/fixtures?competition=' || split_part(v.koda, '/', 1) || '&year=' || split_part(v.koda, '/', 2)
  from countries d
  cross join (values
    ('hk-u22-league', 'HKPL U-22 League', 'U-22 League', '2045/2026-2027', 10),
    ('hk-women-1', 'Women''s League 1st Division', 'Women 1st Div', '2057/2026-2027', 20),
    ('hk-women-2', 'Women''s League 2nd Division', 'Women 2nd Div', '2058/2026-2027', 21)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'hkfa'
 where d.code = 'HK'
on conflict (slug) do nothing;

-- Azerbajdžan: Premyer Liqa in rezervna liga (Əvəzedicilər Liqası, U22).
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'pfl-az', v.koda, 1, v.vrstni, 6, false,
       'PFL', v.url
  from countries d
  join federations f on f.code = 'pfl-az'
  cross join (values
    ('az-premyer-liqa', 'Premyer Liqa', 'Premyer Liqa', '52', 0, 'https://pfl.az/'),
    ('az-evezediciler', 'Əvəzedicilər Liqası', 'Əvəzedicilər', '54', 3, 'https://pfl.az/')
  ) as v(slug, ime, kratko, koda, vrstni, url)
 where d.code = 'AZ'
on conflict (slug) do nothing;

-- Gibraltar: U18 liga (GYFL).
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select 'gi-u18', 'Under 18 League', 'U18 League', d.id, f.id, 'gfa',
       'gyfl-u18-championship-26-27-3394735', 1, 3, 6, false,
       'Gibraltar FA', 'https://www.gibraltarfa.com/competitions/gyfl-u18-championship-26-27-3394735', false
  from countries d
  join federations f on f.code = 'gfa'
 where d.code = 'GI'
on conflict (slug) do nothing;
