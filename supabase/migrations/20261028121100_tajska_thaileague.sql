-- Tajska: država TH, zveza Thai League (TL) in sedem lig z vira `thaileague`
-- (javni API competition.tl.prod.c0d1um.io, ki ga kliče thaileague.co.th;
-- zapisniki "Match Report" v PDF, vrsta dogodka iz ikone).
--
-- Thai League 3 ima šest regij (vsaka svoja liga), Thai League 2 eno skupino.
-- Šifra lige je `<turnir>/<stopnja>` sezone 2026/27 (T3 = 228, T2 = 226);
-- arhiv 2025/26 (T3 = 209, T2 = 208 — stopnje v docs/viri/tajska.md) se uvozu
-- poda z `arhiv=`. Sezona teče od septembra do aprila (`2026/27`).
--
-- Vmesnika, vstopne strani, kartice, pošte, ugiba države in vrstice v matriki
-- nočnega uvoza še ni — lastnik odloči pred vklopom. Tekme so v Ljubljani
-- dopoldne (Bangkok UTC+7, poleti +5 h, pozimi +6 h).
--
-- Vse NEAKTIVNE.

insert into countries (code, name, sort_order) values ('TH', 'ประเทศไทย', 40) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'thaileague', 'Thai League', 'TL', 'https://thaileague.co.th/', 4001
  from countries d
 where d.code = 'TH'
on conflict (code) do nothing;

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
    ('th-t2', 'Thai League 2', 'T2', '226/1203', 1),
    ('th-t3-north', 'Thai League 3 North', 'T3 North', '228/1204', 2),
    ('th-t3-northeast', 'Thai League 3 Northeast', 'T3 Northeast', '228/1205', 3),
    ('th-t3-east', 'Thai League 3 East', 'T3 East', '228/1207', 4),
    ('th-t3-central', 'Thai League 3 Central', 'T3 Central', '228/1208', 5),
    ('th-t3-west', 'Thai League 3 West', 'T3 West', '228/1209', 6),
    ('th-t3-south', 'Thai League 3 South', 'T3 South', '228/1210', 7)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'TH'
on conflict (slug) do nothing;
