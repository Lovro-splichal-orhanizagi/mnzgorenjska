-- MNZ Celje: Medobčinska članska liga.
--
-- Tretja zveza na istem CMS-u kot Kranj in Ljubljana, zato je vir tanek.
-- Liga se vpiše **neaktivna**; sprožilec `varovalo_vklopa_lige` je od
-- 20260910170000 tako ali tako ne pusti vklopiti, dokler nima razporeda,
-- igralcev in cenika, iz katerega se da sestaviti kader.
--
-- Šifra lige pripada sezoni: 2026/27 je 1902, arhiv 2025/26 je 1801 in
-- 2024/25 je 1701. Deset klubov je malo, zato bosta za spodoben cenik
-- potrebni obe arhivski sezoni — pri ljubljanski 2. ligi je ena sama pustila
-- 77 % igralcev na privzeti ceni.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select id, 'mnzce', 'MNZ Celje', 'Celje', 'https://www.mnzcelje.com/', 3
  from countries where code = 'SI'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select 'ce-clani', 'Članska liga — Celje', 'CE', d.id, f.id,
       'mnzce', '1902', 1, 1, 6, false
  from countries d
  join federations f on f.code = 'mnzce'
 where d.code = 'SI'
on conflict (slug) do nothing;
