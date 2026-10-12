-- Španija (Katalonija): več lig z vira `fcf` (fcf.cat) — Lliga Elit,
-- Primera Catalana (3 skupine), Segona Catalana (6), Tercera Catalana (17)
-- in Quarta Catalana grup 4 in 5, vse 2026/27. Šifra lige je blok šifer
-- zapisnikov `<od>-<do>` (glej CLAUDE.md, Španija — vir fcf). Bloki so
-- najdeni iz zapisnikov (12. 10. 2026), postave so preverjene (11 + 11).
--
-- Od Lliga Elit do Tercera klubi menjave VPISUJEJO (minuta vstopa in
-- izstopa); Quarta jih ne. FCF je obveščen / zaprošen za soglasje — do
-- odgovora so lige NEAKTIVNE, kot prve štiri (20261012080000).

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
    ('es-ct-elit', 'Lliga Elit', 'Lliga Elit', '4106968-4107207', 10),
    ('es-ct-primera-g1', 'Primera Catalana, grup 1', 'Primera Cat. 1', '4108646-4108885', 21),
    ('es-ct-primera-g2', 'Primera Catalana, grup 2', 'Primera Cat. 2', '4108886-4109125', 22),
    ('es-ct-primera-g3', 'Primera Catalana, grup 3', 'Primera Cat. 3', '4109126-4109365', 23),
    ('es-ct-segona-g1', 'Segona Catalana, grup 1', 'Segona Cat. 1', '4109388-4109627', 31),
    ('es-ct-segona-g2', 'Segona Catalana, grup 2', 'Segona Cat. 2', '4109630-4109869', 32),
    ('es-ct-segona-g3', 'Segona Catalana, grup 3', 'Segona Cat. 3', '4109870-4110109', 33),
    ('es-ct-segona-g4', 'Segona Catalana, grup 4', 'Segona Cat. 4', '4110110-4110349', 34),
    ('es-ct-segona-g5', 'Segona Catalana, grup 5', 'Segona Cat. 5', '4110354-4110593', 35),
    ('es-ct-segona-g6', 'Segona Catalana, grup 6', 'Segona Cat. 6', '4110598-4110837', 36),
    ('es-ct-tercera-g1', 'Tercera Catalana, grup 1', 'Tercera Cat. 1', '4115948-4116187', 41),
    ('es-ct-tercera-g2', 'Tercera Catalana, grup 2', 'Tercera Cat. 2', '4116188-4116427', 42),
    ('es-ct-tercera-g3', 'Tercera Catalana, grup 3', 'Tercera Cat. 3', '4116428-4116667', 43),
    ('es-ct-tercera-g4', 'Tercera Catalana, grup 4', 'Tercera Cat. 4', '4115228-4115467', 44),
    ('es-ct-tercera-g5', 'Tercera Catalana, grup 5', 'Tercera Cat. 5', '4115468-4115707', 45),
    ('es-ct-tercera-g6', 'Tercera Catalana, grup 6', 'Tercera Cat. 6', '4116668-4116907', 46),
    ('es-ct-tercera-g7', 'Tercera Catalana, grup 7', 'Tercera Cat. 7', '4116908-4117147', 47),
    ('es-ct-tercera-g8', 'Tercera Catalana, grup 8', 'Tercera Cat. 8', '4117389-4117628', 48),
    ('es-ct-tercera-g9', 'Tercera Catalana, grup 9', 'Tercera Cat. 9', '4118349-4118588', 49),
    ('es-ct-tercera-g10', 'Tercera Catalana, grup 10', 'Tercera Cat. 10', '4119498-4119737', 50),
    ('es-ct-tercera-g11', 'Tercera Catalana, grup 11', 'Tercera Cat. 11', '4118591-4118830', 51),
    ('es-ct-tercera-g12', 'Tercera Catalana, grup 12', 'Tercera Cat. 12', '4118835-4119074', 52),
    ('es-ct-tercera-g13', 'Tercera Catalana, grup 13', 'Tercera Cat. 13', '4119076-4119315', 53),
    ('es-ct-tercera-g14', 'Tercera Catalana, grup 14', 'Tercera Cat. 14', '4117629-4117868', 54),
    ('es-ct-tercera-g15', 'Tercera Catalana, grup 15', 'Tercera Cat. 15', '4117869-4118108', 55),
    ('es-ct-tercera-g16', 'Tercera Catalana, grup 16', 'Tercera Cat. 16', '4114505-4114744', 56),
    ('es-ct-tercera-g17', 'Tercera Catalana, grup 17', 'Tercera Cat. 17', '4114745-4114984', 57),
    ('es-ct-quarta-g4', 'Quarta Catalana, grup 4', 'Quarta Cat. 4', '4140261-4140442', 104),
    ('es-ct-quarta-g5', 'Quarta Catalana, grup 5', 'Quarta Cat. 5', '4140443-4140624', 105)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'ES'
on conflict (slug) do nothing;

-- Prve štiri skupine Quarta za višje lige (vrstni red po rangu).
update competitions c
   set sort_order = 100 + v.g
  from (values ('es-ct-quarta-g1', 1), ('es-ct-quarta-g2', 2), ('es-ct-quarta-g3', 3), ('es-ct-quarta-g6', 6)) as v(slug, g)
 where c.slug = v.slug;
