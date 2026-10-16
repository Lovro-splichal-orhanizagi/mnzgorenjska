-- Azerbajdžan: država AZ, zveza PFL (Peşəkar Futbol Liqası) in dve ligi z
-- vira `pfl-az` (javni API pfl.az za razpored, zapisniki v PDF). Šifra lige je
-- `league_id` sezone 2026/27 (II Liqa 55, I Liqa 53); arhiv 2025/26 (50, 49)
-- je v CLAUDE.md (Azerbajdžan — vir pfl-az) in se uvozu poda z `arhiv=`.
--
-- Vmesnika v azerbajdžanščini še ni; lige so NEAKTIVNE (in tudi sicer do
-- uvoza in cen).

insert into countries (code, name, sort_order) values ('AZ', 'Azərbaycan', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'pfl-az', 'Peşəkar Futbol Liqası', 'PFL', 'https://pfl.az/', 1401
  from countries d
 where d.code = 'AZ'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'pfl-az', v.koda, 1, v.vrstni, 6, false,
       'PFL', v.url
  from countries d
  join federations f on f.code = 'pfl-az'
  cross join (values
    ('az-liqa1', 'I Liqa', 'I Liqa', '53', 1, 'https://liqa1.pfl.az/'),
    ('az-liqa2', 'II Liqa', 'II Liqa', '55', 2, 'https://liqa2.pfl.az/')
  ) as v(slug, ime, kratko, koda, vrstni, url)
 where d.code = 'AZ'
on conflict (slug) do nothing;
