-- Japonska: država JP, zveza JFL (一般社団法人 日本フットボールリーグ) in ena liga
-- z vira `jfl` (jfl.or.jp: razpored in stran tekme v HTML, uradni zapisnik v PDF
-- je ista vsebina). Japan Football League je 4. raven (pod J3), 16 klubov,
-- 30 krogov.
--
-- Šifra lige je `<stran>-<sezona>`: 28. JFL 2026/27 = `2591-2026A001` (prva
-- jesensko-pomladna sezona, zato NI koledarska). Arhiv 2025 (`2375-2025A001`)
-- in 2024 (`2218-2024A001`) sta koledarski sezoni in se uvozu podata z
-- `arhiv=` (docs/viri/japonska.md).
--
-- Vmesnika v japonščini, kartice, pošte in ugiba države še ni; liga je
-- NEAKTIVNA (in tudi sicer do uvoza in cen).

insert into countries (code, name, sort_order) values ('JP', '日本', 40) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'jfl', 'Japan Football League', 'JFL', 'https://www.jfl.or.jp/', 4001
  from countries d
 where d.code = 'JP'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select 'jp-jfl', '日本フットボールリーグ', 'JFL', d.id, f.id, 'jfl', '2591-2026A001', 1, 1, 6, false,
       'JFL', 'https://www.jfl.or.jp/jfl-pc/view/s.php?a=2591&f=2026A001_spc.html'
  from countries d
  join federations f on f.code = 'jfl'
 where d.code = 'JP'
on conflict (slug) do nothing;
