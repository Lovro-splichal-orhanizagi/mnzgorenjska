-- Hongkong: moške lige odraslih Hong Kong Football Association (HKFA) z vira
-- `hkfa` (strežniško izrisane strani hkfa.com, stanje `__NUXT__`, brez eval).
-- Premier League (raven 1, polprofesionalna — kot Betri deildin na Ferskih
-- otokih), 1st Division (2), 2nd Division (3) in 3rd Division (4).
--
-- Sezona je jesen–pomlad ("2026/27"). Šifra lige je
-- `<leagueyear_id>/<leto>` — leagueyear_id je id tekmovanja ENE sezone
-- (scripts/viri/hkfa.mjs). Arhiv 2025/26 (osnovni del, brez Championship /
-- Challenging Group): HKPL `1945/2025-2026`, 1st `1949/2025-2026`, 2nd
-- `1950/2025-2026`, 3rd `1951/2025-2026` (docs/viri/hongkong.md).
--
-- Krog je teden (pon–ned po hongkonškem datumu) od tedna 1. avgusta: uradni
-- krogi HKFA se ne ujemajo s tedni (prestavljene tekme "1R" mesece pozneje).
--
-- Država HK: vmesnik bi bil angleški (jezik `en` obstaja), a vstopne strani,
-- kartice, pošte, ugiba države in vrstice v matriki nočnega uvoza še ni —
-- lastnik odloči pred vklopom.
--
-- Vse NEAKTIVNE; uvozi niso bili pognani.

insert into countries (code, name, sort_order) values ('HK', 'Hong Kong', 41) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'hkfa', 'Hong Kong Football Association', 'HKFA', 'https://www.hkfa.com/', 4101
  from countries d
 where d.code = 'HK'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hkfa', v.koda, 1, v.vrstni, 6, false,
       'HKFA', v.url
  from countries d
  cross join (values
    ('hk-premier-league', 'Hong Kong Premier League', 'HKPL', '2041/2026-2027', 1, 'https://www.hkfa.com/en/hkpl'),
    ('hk-1-division', '1st Division', '1st Division', '2047/2026-2027', 2, 'https://www.hkfa.com/en/competitions/leagues/1st-division'),
    ('hk-2-division', '2nd Division', '2nd Division', '2048/2026-2027', 3, 'https://www.hkfa.com/en/competitions/leagues/2nd-division'),
    ('hk-3-division', '3rd Division', '3rd Division', '2049/2026-2027', 4, 'https://www.hkfa.com/en/competitions/leagues/3rd-division')
  ) as v(slug, ime, kratko, koda, vrstni, url)
  join federations f on f.code = 'hkfa'
 where d.code = 'HK'
on conflict (slug) do nothing;
