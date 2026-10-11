-- Latvija: lige odraslih (moški) Latvijas Futbola federācije (LFF) z vira `lff`
-- (lff.lv) — Virslīga, 1. līga, obe skupini 2. līge in štiri cone 3. līge.
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"). Šifra lige je
-- `<sekcija>/<p>[/<tekmovanje>]` (glej scripts/viri/lff.mjs); vsaka sezona ima
-- svoje id-je, ob novi sezoni se šifra popravi. Arhivi (2025) so v CLAUDE.md
-- (Latvija — vir `lff`).
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into countries (code, name, sort_order) values ('LV', 'Latvija', 11) on conflict do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'lff', 'Latvijas Futbola federācija', 'LFF', 'https://lff.lv/', 1001
  from countries d
 where d.code = 'LV'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'lff', v.koda, 1, v.vrstni, 6, false,
       'LFF', 'https://lff.lv/sacensibas/viriesi/' || split_part(v.koda, '/', 1) || '/?p=' || split_part(v.koda, '/', 2), true
  from countries d
  cross join (values
    ('lv-virsliga', 'Tonybet Virslīga', 'Virslīga', 'virsliga/2026', 1),
    ('lv-1-liga', 'LVBET līga', '1. līga', 'lvbet-liga/2026', 2),
    ('lv-2-liga-a', 'Altero.lv LIIGA A grupa', '2. līga A', 'otra-liga/2026/23536781', 3),
    ('lv-2-liga-b', 'Altero.lv LIIGA B grupa', '2. līga B', 'otra-liga/2026/23536800', 4),
    ('lv-3-liga-centrs', '3. līga Centra zona', '3. līga Centrs', 'tresa-liga/23836115', 5),
    ('lv-3-liga-ziemeli', '3. līga Ziemeļu zona', '3. līga Ziemeļi', 'tresa-liga/23836298', 6),
    ('lv-3-liga-austrumi', '3. līga Austrumu zona', '3. līga Austrumi', 'tresa-liga/23836359', 7),
    ('lv-3-liga-rietumi', '3. līga Rietumu zona', '3. līga Rietumi', 'tresa-liga/23836414', 8)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'lff'
 where d.code = 'LV'
on conflict (slug) do nothing;
