-- Ferski otoki: lige odraslih (moški) Fótbóltssamband Føroya (FSF) z vira
-- `fsf` (javni posrednik COMET na fsf.fo, JSON, ki ga stran kliče sama) —
-- Betri deildin (raven 1), 1. deild (raven 2) in 2. deild (raven 3).
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"). Šifra lige je id
-- tekmovanja COMET (vsaka sezona svoj); vir mora id poznati v tabeli
-- `SEZONE` (scripts/viri/fsf.mjs), da zna drugim ekipam dati pripono
-- ("B36 II" v 1. deild). Arhiv 2025: Betri `6095440`, 1. deild `6095452`,
-- 2. deild `6095465` (CLAUDE.md, Ferski otoki — vir `fsf`).
--
-- 3. deild NI vpisana: zapisniki so večinoma prazni ali enostranski (pod 80 %
-- popolnih, meritev 15. 10. 2026 v CLAUDE.md).
--
-- Vse NEAKTIVNE; uvozi niso bili pognani. Vmesnika v ferščini ni.

insert into countries (code, name, sort_order) values ('FO', 'Føroyar', 16) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'fsf', 'Fótbóltssamband Føroya', 'FSF', 'https://www.fsf.fo/', 1601
  from countries d
 where d.code = 'FO'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fsf', v.koda, 1, v.vrstni, 6, false,
       'FSF', v.url, true
  from countries d
  cross join (values
    ('fo-betri-deildin', 'Betri deildin', 'Betri deildin', '6654857', 1, 'https://www.fsf.fo/kappingar-og-urslit/menn/meistaradeildin-menn/'),
    ('fo-1-deild', '1. deild', '1. deild', '6654881', 2, 'https://www.fsf.fo/kappingar-og-urslit/menn/1-deild-menn/'),
    ('fo-2-deild', '2. deild', '2. deild', '6651271', 3, 'https://www.fsf.fo/kappingar-og-urslit/menn/2-deild-menn/')
  ) as v(slug, ime, kratko, koda, vrstni, url)
  join federations f on f.code = 'fsf'
 where d.code = 'FO'
on conflict (slug) do nothing;
