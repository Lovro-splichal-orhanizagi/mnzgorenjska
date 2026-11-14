-- Slovenija: kadetske (U17), U15 in ženske lige na virih, ki že tečejo — 30 lig.
--
-- Lastnik je 4. 11. 2026 odobril U16/U17, U15 in ženske lige (tudi dekleta)
-- v virih, ki jih že uvažamo. Pregled istega dne (razčlenjevalniki uvoza na
-- vzorčnem zapisniku vsake vrste): NZS 1. SKL in 2. U15 Zahod, ŽNL, GNL
-- kadeti in U15 modra, LJ kadeti in U15, CE kadeti in U15, MB U17 in U15,
-- MS kadeti in U15, PT kadeti in U15 — povsod postavi 11 + 11 z goli.
--
-- Šifra nosi starostno oznako (`u17`, `u15`, `kadeti`), da jo
-- `je_mladinski_slug` (PR #668, migracija 20261104170100) prepozna; zato
-- `skl1-u17` namesto `skl1`. Pred uvozom mora biti #668 združen.
--
-- Prilagoditvi vira v istem PR:
--   - nzs: ženske lige so pod `/klubi/zenski/`; šifra `zenski/<pot>[:<sezona>]`.
--   - zapisnik.mjs: polčas je neobvezen (LJ U15 2011/2012 ga ne vpisuje).
--
-- LJ CMS: 2007/2008 sta kadeti (U17, letnik 2010–11), 2011/2012 U15 (2012),
-- 2009/2010 starejši dečki (letnik 2013, dejansko U14) — izpuščeni.
-- Izpuščeni še: CE mladinska (1903, 4 klubi), Lendava (2. SKL V in 2. U15 V
-- sta podvojeni NZS ligi, U15 4 klubi), MS 122/127/129 (prazen program),
-- veteranske lige.
--
-- Sezona teče, zato je `prvi_fantasy_krog` krog po zadnjem odigranem
-- (pregled 4. 11. 2026); vklopna skripta ga ob vklopu postavi na prvi
-- prihodnji krog. Mladinske `rok_pomak_ur = 2` (tekme zjutraj), ŽNL 6 kot
-- članske.
--
-- Majhne: ženski U15 Vzhod/Zahod in MB U17 2 (6 klubov, spodnja meja),
-- MS kadeti in PT U15 2 (7). PT U15 2 (`2026:94`) zapisnika še ni pokazala.
--
-- Vse se vpišejo NEAKTIVNE; arhivi v docs/viri/slovenija.md.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, v.vir, v.koda, v.prvi, v.vrstni, v.pomak, false
  from countries d
  cross join (values
    -- NZS kadeti in U15
    ('skl1-u17',        '1. SKL — kadeti',              '1. SKL',     'nzs',   '1-skl',                       12, 6,  2),
    ('skl2-vzhod-u17',  '2. SKL Vzhod — kadeti',        '2. SKL V',   'nzs',   '2-skl-vzhod',                 14, 7,  2),
    ('skl2-zahod-u17',  '2. SKL Zahod — kadeti',        '2. SKL Z',   'nzs',   '2-skl-zahod',                 14, 8,  2),
    ('u15-1',           '1. liga U15',                  '1. U15',     'nzs',   '1-liga-u15',                  12, 9,  2),
    ('u15-2-vzhod',     '2. liga U15 Vzhod',            '2. U15 V',   'nzs',   '2-liga-u15-vzhod',            14, 10, 2),
    ('u15-2-zahod',     '2. liga U15 Zahod',            '2. U15 Z',   'nzs',   '2-liga-u15-zahod',            14, 11, 2),
    -- NZS ženske
    ('znl',             'Ženska nogometna liga Triglav', '1. ŽNL',    'nzs',   'zenski/zenska-nogometna-liga-triglav', 12, 12, 6),
    ('zl-u17',          'Liga deklet U17',              'Dekleta U17', 'nzs',  'zenski/liga-deklet-u17',      11, 13, 2),
    ('zl-u15-vzhod',    'Liga deklet U15 Vzhod',        'Dekleta U15 V', 'nzs', 'zenski/liga-deklet-u15-vzhod', 7, 14, 2),
    ('zl-u15-zahod',    'Liga deklet U15 Zahod',        'Dekleta U15 Z', 'nzs', 'zenski/liga-deklet-u15-zahod', 7, 15, 2),
    -- MNZ Gorenjska
    ('gnl-kadeti',      'GNL kadeti',                   'GNL U17',    'mnzg',  '1602',                        12, 3,  2),
    ('gnl-u15-modra',   'GNL starejši dečki U15 — modra', 'GNL U15 M', 'mnzg', '1604',                        12, 4,  2),
    ('gnl-u15-rdeca',   'GNL starejši dečki U15 — rdeča', 'GNL U15 R', 'mnzg', '1605',                        12, 5,  2),
    -- MNZ Ljubljana
    ('lj-kadeti',       'Kadeti 1. liga',               'LJ U17',     'mnzlj', '2007',                        10, 5,  2),
    ('lj-kadeti-2',     'Kadeti 2. liga',               'LJ U17 2',   'mnzlj', '2008',                        10, 6,  2),
    ('lj-u15',          'U15 1. liga',                  'LJ U15',     'mnzlj', '2011',                        10, 7,  2),
    ('lj-u15-2',        'U15 2. liga',                  'LJ U15 2',   'mnzlj', '2012',                        10, 8,  2),
    -- MNZ Celje
    ('ce-kadeti',       'Medobčinska kadetska liga — Celje', 'CE U17', 'mnzce', '1904',                       11, 3,  2),
    ('ce-u15',          '1. liga starejši dečki — Celje', 'CE U15',   'mnzce', '1905',                        10, 4,  2),
    ('ce-u15-2',        '2. liga starejši dečki — Celje', 'CE U15 2', 'mnzce', '1906',                        11, 5,  2),
    -- MNZ Maribor
    ('mb-u17',          'U17 1. kadetska liga — Maribor', 'MB U17',   'mnzmb', 'u17-kadetska-liga-1-26-27',   10, 4,  2),
    ('mb-u17-2',        'U17 2. kadetska liga — Maribor', 'MB U17 2', 'mnzmb', 'u17-kadetska-liga-2-26-27',   9,  5,  2),
    ('mb-u15',          'U15 1. liga — Maribor',        'MB U15',     'mnzmb', 'u15-starejsi-decki-1-26-27',  10, 6,  2),
    ('mb-u15-2a',       'U15 2A — Maribor',             'MB U15 2A',  'mnzmb', 'u15-starejsi-decki-2a-26-27', 10, 7,  2),
    ('mb-u15-2b',       'U15 2B — Maribor',             'MB U15 2B',  'mnzmb', 'u15-starejsi-decki-2b-26-27', 10, 8,  2),
    -- MNZ Murska Sobota
    ('ms-kadeti',       'U17 kadeti — M. Sobota',       'MS U17',     'mnzms', '2026:78',                     10, 3,  2),
    ('ms-u15',          'U15 — M. Sobota',              'MS U15',     'mnzms', '2026:121',                    11, 4,  2),
    -- MNZ Ptuj
    ('pt-kadeti',       'Kadeti — Ptuj',                'PT U17',     'mnzpt', '2026:54',                     10, 4,  2),
    ('pt-u15',          'Starejši dečki 1. razred — Ptuj', 'PT U15',  'mnzpt', '2026:77',                     10, 5,  2),
    ('pt-u15-2',        'Starejši dečki 2. razred — Ptuj', 'PT U15 2', 'mnzpt', '2026:94',                    8,  6,  2)
  ) as v(slug, ime, kratko, vir, koda, prvi, vrstni, pomak)
  join federations f on f.code = v.vir
 where d.code = 'SI'
on conflict (slug) do nothing;
