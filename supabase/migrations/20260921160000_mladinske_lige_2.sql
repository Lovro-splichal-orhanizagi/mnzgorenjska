-- Mladinske lige (U19), drugi sveženj: Ptuj, Murska Sobota, Ljubljana 2. liga.
--
-- Preštete 21. 9. z istimi razčlenjevalniki kot uvoz (klubov / tekem s polno
-- postavo v tekoči sezoni; arhiv):
--   Ptuj Mladina       9 klubov, 14/14   arhiv 2025:71 (85 tekem), 2024:71 (51)
--   MS 1. MNL mladinci 7 klubov, 12/12   arhiv 2025:115 (62), 2024:115 (44)
--   LJ Mladinci 2      7 klubov, 11/11   arhiv 1907 (68), 1807 (63)
--
-- Izpuščeni: Celje (4 klubi) in Lendava (5 klubov). Ekipa ima 15 igralcev in
-- največ 3 iz kluba, zato je pet klubov spodnja meja, pri kateri je vsaka
-- ekipa prisiljena v tri iz vsakega kluba — to ni igra.
--
-- Pri Ptuju je šifra lige del sezone: tekoča sezona Mladine je 53, arhiv 71.
-- Pri MS ostane 115 skozi sezone (kot 113 pri članih).
--
-- Neaktivne; prvi_fantasy_krog = 2 in rok_pomak_ur = 2 kot pri prvem svežnju.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, v.vir, v.koda, 2, v.vrstni, 2, false
  from countries d
  cross join (values
    ('pt-mladinci',   'Mladina — Ptuj',              'PT U19',   'mnzpt', '2026:53',  3),
    ('ms-mladinci',   '1. MNL mladinci — M. Sobota', 'MS U19',   'mnzms', '2026:115', 2),
    ('lj-mladinci-2', 'Mladinci 2. liga',            'LJ U19 2', 'mnzlj', '2006',     4)
  ) as v(slug, ime, kratko, vir, koda, vrstni)
  join federations f on f.code = v.vir
 where d.code = 'SI'
on conflict (slug) do nothing;
