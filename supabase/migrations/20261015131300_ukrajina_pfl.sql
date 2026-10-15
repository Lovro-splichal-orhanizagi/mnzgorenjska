-- Ukrajina: država UA, zveza PFL (Професіональна футбольна ліга України) in
-- njene tri lige z vira `pfl-ua` (pfl.ua): Perša liga (raven 2) ter Druga
-- liga A in B (raven 3). Nižjih lig (AAFU, oblastne zveze) na pfl.ua ni.
--
-- Šifra lige je `<koledar>/<turnir>` (glej scripts/viri/pfl-ua.mjs): oznaka
-- javnega koledarja JSON (`/calendar-json/1`, `2a`, `2b`) in id tekmovanja
-- sezone 2026/27. Arhiv 2025/26 (HTML koledar `/calendar/<turnir>`), ki se
-- uvozu poda z `arhiv=`:
--   ua-1-liga    1/1347  (2025/26 VBET Перша ліга, 16 klubov, 240 tekem)
--   ua-2-liga-a  2a/1348 (2025/26 Друга ліга А, 11 klubov, 165 tekem, 152 z izidom)
--   ua-2-liga-b  2b/1349 (2025/26 Друга ліга Б, 11 klubov, 165 tekem)
--
-- Tekme so pogosto dopoldne (10:00–12:00 po ljubljansko), zato rok 2 h pred
-- prvo tekmo kroga (kot pri mladinskih ligah), ne 6.
--
-- Vmesnika v ukrajinščini še ni in UA ni v matriki nočnega uvoza; lige so
-- NEAKTIVNE (in tudi sicer do uvoza arhiva, razporeda, zapisnikov in cen).

insert into countries (code, name, sort_order) values ('UA', 'Україна', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'pfl-ua', 'Професіональна футбольна ліга України', 'ПФЛ', 'https://pfl.ua/', 1401
  from countries d
 where d.code = 'UA'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'pfl-ua', v.koda, 1, v.vrstni, 2, false,
       'ПФЛ', 'https://pfl.ua/calendar/' || split_part(v.koda, '/', 2)
  from countries d
  join federations f on f.code = 'pfl-ua'
  cross join (values
    ('ua-1-liga', 'Перша ліга', 'Перша ліга', '1/1353', 1),
    ('ua-2-liga-a', 'Друга ліга А', 'Друга ліга А', '2a/1354', 2),
    ('ua-2-liga-b', 'Друга ліга Б', 'Друга ліга Б', '2b/1355', 3)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'UA'
on conflict (slug) do nothing;
