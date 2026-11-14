-- Katalonija (fcf): še 10 skupin Quarta Catalana 2026/27. Vzorec kot
-- 20261014093100. Bloki zapisnikov (glej docs/viri/spanija.md):
-- grup 9, 11, 12, 15, 33, 34 iz pregleda 13.–14. 10. 2026; grup 24, 25, 27
-- in 28 iz meja, preverjenih 4. 11. 2026 (prva in zadnja šifra bloka in
-- sosednji šifri zunaj njega).
--
-- Vse so NEAKTIVNE. Vklop gre skozi vrata vklop-katalonije (QUARTA_LIGE),
-- ki jih ta migracija ne spreminja.

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
    ('es-ct-quarta-g9', 'Quarta Catalana, grup 9', 'Quarta Cat. 9', '4146391-4146630', 109),
    ('es-ct-quarta-g11', 'Quarta Catalana, grup 11', 'Quarta Cat. 11', '4146871-4147110', 111),
    ('es-ct-quarta-g12', 'Quarta Catalana, grup 12', 'Quarta Cat. 12', '4147111-4147350', 112),
    ('es-ct-quarta-g15', 'Quarta Catalana, grup 15', 'Quarta Cat. 15', '4147835-4148074', 115),
    ('es-ct-quarta-g24', 'Quarta Catalana, grup 24', 'Quarta Cat. 24', '4149996-4150236', 124),
    ('es-ct-quarta-g25', 'Quarta Catalana, grup 25', 'Quarta Cat. 25', '4150238-4150477', 125),
    ('es-ct-quarta-g27', 'Quarta Catalana, grup 27', 'Quarta Cat. 27', '4150719-4150958', 127),
    ('es-ct-quarta-g28', 'Quarta Catalana, grup 28', 'Quarta Cat. 28', '4150959-4151198', 128),
    ('es-ct-quarta-g33', 'Quarta Catalana, grup 33', 'Quarta Cat. 33', '4136821-4136952', 133),
    ('es-ct-quarta-g34', 'Quarta Catalana, grup 34', 'Quarta Cat. 34', '4136689-4136820', 134)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'ES'
on conflict (slug) do nothing;
