-- Španija (Katalonija): preostale skupine Quarta Catalana 2026/27 z vira
-- `fcf` (fcf.cat). Šifra lige je blok šifer zapisnikov `<od>-<do>` (glej
-- CLAUDE.md, Španija — vir fcf). Bloki so najdeni iz zapisnikov (13. 10.
-- 2026): grup 7–31 ležijo v `4145911-…` (po 240 šifer, 30 krogov, 16 klubov),
-- grup 32–34 v `4136689-4137084` (22 krogov po 6 mest, 12 klubov).
-- Postave so preverjene na odigranih tekmah (11 + 11).
--
-- Quarta menjav ne vpisuje (začetniki 90 minut, klop brez nastopa). FCF je
-- obveščen / zaprošen za soglasje — do odgovora so lige NEAKTIVNE, kot
-- skupine 1–6 (20261012080000, 20261013090000).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fcf', v.koda, 1, v.vrstni, 6, false,
       'FCF', 'https://www.fcf.cat/ca/competicio/acta/' || split_part(v.koda, '-', 1)
  from countries d
  join federations f on f.code = 'fcf'
  cross join (values
    ('es-ct-quarta-g7', 'Quarta Catalana, grup 7', 'Quarta Cat. 7', '4145911-4146150', 107),
    ('es-ct-quarta-g8', 'Quarta Catalana, grup 8', 'Quarta Cat. 8', '4146151-4146390', 108),
    ('es-ct-quarta-g10', 'Quarta Catalana, grup 10', 'Quarta Cat. 10', '4146631-4146870', 110),
    ('es-ct-quarta-g13', 'Quarta Catalana, grup 13', 'Quarta Cat. 13', '4147351-4147590', 113),
    ('es-ct-quarta-g14', 'Quarta Catalana, grup 14', 'Quarta Cat. 14', '4147593-4147832', 114),
    ('es-ct-quarta-g16', 'Quarta Catalana, grup 16', 'Quarta Cat. 16', '4148075-4148313', 116),
    ('es-ct-quarta-g17', 'Quarta Catalana, grup 17', 'Quarta Cat. 17', '4148315-4148554', 117),
    ('es-ct-quarta-g18', 'Quarta Catalana, grup 18', 'Quarta Cat. 18', '4148555-4148794', 118),
    ('es-ct-quarta-g19', 'Quarta Catalana, grup 19', 'Quarta Cat. 19', '4148795-4149034', 119),
    ('es-ct-quarta-g20', 'Quarta Catalana, grup 20', 'Quarta Cat. 20', '4149035-4149274', 120),
    ('es-ct-quarta-g32', 'Quarta Catalana, grup 32', 'Quarta Cat. 32', '4136953-4137084', 132)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'ES'
on conflict (slug) do nothing;
