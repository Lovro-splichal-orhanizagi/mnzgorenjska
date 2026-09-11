-- Preostale slovenske zveze: Ptuj, Murska Sobota, Lendava, Nova Gorica, Maribor.
--
-- S temi je pokrita vsa Slovenija. Devet medobčinskih zvez, postave po tekmah
-- pa objavljajo vse — kar sem sprva zmotno sklepal, da jih ne. Prve tri dajo
-- celo **registrsko številko NZS** (`Reg. št.`), zato pri njih identiteta
-- igralca ne stoji več na ugibanju iz imena in dresa.
--
-- Koper nima svoje članske lige: Primorska članska liga je skupna z Novo
-- Gorico in objavljena na njeni strani, zato je tu ena sama vrstica.
--
-- Vse lige se vpišejo NEAKTIVNE. Sprožilec `varovalo_vklopa_lige` jih tako ali
-- tako ne pusti vklopiti, dokler nimajo razporeda, igralcev in cenika, iz
-- katerega je mogoče sestaviti kader.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.stran, v.vrstni
  from countries d
  cross join (values
    ('mnzpt', 'MNZ Ptuj',          'Ptuj',        'https://www.mnzveza-ptuj.si/', 4),
    ('mnzms', 'MNZ Murska Sobota', 'Murska Sobota','https://www.mnzveza-ms.si/',  5),
    ('mnzle', 'MNZ Lendava',       'Lendava',     'https://www.mnzlendava.si/',   6),
    ('mnzng', 'MNZ Nova Gorica',   'Nova Gorica', 'https://mnzgorica.si/',        7),
    ('mnzmb', 'MNZ Maribor',       'Maribor',     'https://mnzmaribor.si/',       8)
  ) as v(koda, ime, kratko, stran, vrstni)
 where d.code = 'SI'
on conflict (code) do nothing;

-- Šifra lige pripada sezoni, vsak vir pa jo zapiše po svoje, zato je stolpec
-- besedilo in vsebuje vse, kar vir potrebuje za sestavo naslova:
--   Ptuj, Murska Sobota   `<sezona>:<liga>`   (npr. `2026:3`)
--   Lendava               `<sezona>/<slug>`   (npr. `2026-27/mnl-lendava-26-27`)
--   Nova Gorica           `<competitionId>`   (npr. `3199`)
--   Maribor               `<slug>`            (npr. `1-clanska-liga-26-27`)
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, v.vir, v.koda, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('pt-super',     'Super liga — Ptuj',        'PT 1.', 'mnzpt', '2026:3',                        1),
    ('pt-1razred',   '1. razred — Ptuj',         'PT 2.', 'mnzpt', '2026:4',                        2),
    ('ms-clani',     '1. MNL — Murska Sobota',   'MS',    'mnzms', '2026:113',                      1),
    ('le-pnl',       'Pomurska liga — Lendava',  'PNL',   'mnzle', '2026-27/pomurska-nogometna-liga-26-27', 1),
    ('le-mnl',       'MNL — Lendava',            'LE',    'mnzle', '2026-27/mnl-lendava-26-27',     2),
    ('ng-primorska', 'Primorska liga — Gorica',  'NG',    'mnzng', '3199',                           1),
    ('mb-1clanska',  '1. članska — Maribor',     'MB 1.', 'mnzmb', '1-clanska-liga-26-27',           1),
    ('mb-2clanska',  '2. članska — Maribor',     'MB 2.', 'mnzmb', '2-clanska-liga-26-27',           2)
  ) as v(slug, ime, kratko, vir, koda, vrstni)
  join federations f on f.code = v.vir
 where d.code = 'SI'
on conflict (slug) do nothing;
