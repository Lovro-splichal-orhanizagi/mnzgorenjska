-- Španija (Katalonija): Federació Catalana de Futbol z vira `fcf` (fcf.cat) —
-- skupine Quarta Catalana 2026/27, katerih zapisniki so preverjeni (postave
-- 11 + 11). Šifra lige je blok šifer zapisnikov `<od>-<do>` (glej
-- scripts/viri/fcf.mjs in CLAUDE.md, Španija — vir fcf). Arhivov 2025/26 še ni.
--
-- Klubi menjav ne vpisujejo: začetniki 90 minut, klop brez nastopa. FCF je
-- obveščen / zaprošen za soglasje — do odgovora so lige NEAKTIVNE.

insert into countries (code, name, sort_order) values ('ES', 'España', 12) on conflict do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'fcf', 'Federació Catalana de Futbol', 'FCF', 'https://www.fcf.cat/', 1201
  from countries d
 where d.code = 'ES'
on conflict (code) do nothing;

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
    ('es-ct-quarta-g1', 'Quarta Catalana, grup 1', 'Quarta Cat. 1', '4139542-4139779', 1),
    ('es-ct-quarta-g2', 'Quarta Catalana, grup 2', 'Quarta Cat. 2', '4139781-4140020', 2),
    ('es-ct-quarta-g3', 'Quarta Catalana, grup 3', 'Quarta Cat. 3', '4140021-4140260', 3),
    ('es-ct-quarta-g6', 'Quarta Catalana, grup 6', 'Quarta Cat. 6', '4140625-4140864', 6)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'ES'
on conflict (slug) do nothing;
