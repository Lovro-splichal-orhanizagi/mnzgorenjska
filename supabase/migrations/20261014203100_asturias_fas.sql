-- Španija (Asturija): Tercera Federación, skupina 2, in Primera AsturFútbol z
-- vira `fas` (futbolasturiano.es — neodvisen digitalni dnevnik, WordPress
-- SportsPress). Šifra lige je `<sp_league>:<od>-<do>`: izraz lige in blok
-- šifer objav tekem sezone 2026/27 (glej CLAUDE.md, Španija — vir fas).
--
-- Zveza je Real Federación de Fútbol del Principado de Asturias (RFFPA), ki
-- Primero AsturFútbol vodi (Tercero RFEF vodi RFEF, skupino 2 sestavljajo
-- asturijski klubi); objavitelj v nogi je FutbolAsturiano.es (`vir_ime`,
-- `vir_url`). Arhiva 2025/26 vir nima (SportsPress vodi le 2026/27), zato
-- so cene le iz tekoče sezone. Lige so NEAKTIVNE.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'rfpaf', 'Real Federación de Fútbol del Principado de Asturias', 'RFFPA', 'https://www.asturfutbol.es/', 1202
  from countries d
 where d.code = 'ES'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fas', v.koda, 1, v.vrstni, 6, false,
       'FutbolAsturiano.es', 'https://www.futbolasturiano.es/competicion/' || split_part(v.koda, ':', 1) || '/'
  from countries d
  join federations f on f.code = 'rfpaf'
  cross join (values
    ('es-as-tercera-g2', 'Tercera Federación, grupo 2', '3ª RFEF G2', '3-rfef:14499-14804', 10),
    ('es-as-primera', 'Primera AsturFútbol', '1ª AsturFútbol', '1-asturfutbol:15137-15516', 20)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'ES'
on conflict (slug) do nothing;
