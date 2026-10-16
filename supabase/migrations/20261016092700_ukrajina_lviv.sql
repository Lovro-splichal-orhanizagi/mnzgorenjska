-- Ukrajina, Lvivska oblast: zveza ЛАФ (Львівська асоціація футболу) in
-- osem lig oblastnega prvenstva odraslih z vira `ffl` (ffl.org.ua):
-- Прем'єр-ліга, Перша, Друга, Третя (tri skupine) in Четверта ліга (dve
-- skupini).
--
-- Sezona je jesen–pomlad ("Сезон-2026/2027" → "2026/27"), ne koledarska.
-- Šifra lige je id tekmovanja `/cup/<id>` (glej scripts/viri/ffl.mjs); vsaka
-- sezona ima svojega, ob novi sezoni se šifra popravi.
--
-- Postave so v novicah (članek lige na dan ali konec tedna), ne na strani
-- tekme; glej CLAUDE.md (Ukrajina — vir ffl). Pokritost 15. 10. 2026: vse
-- odigrane tekme vseh osmih lig imajo članek s postavama (razen ene
-- kontumacije).
--
-- Vmesnika v ukrajinščini še ni in UA ni v matriki nočnega uvoza; lige so
-- NEAKTIVNE (in tudi sicer do uvoza razporeda, zapisnikov in cen).

insert into countries (code, name, sort_order) values ('UA', 'Україна', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'laf', 'Львівська асоціація футболу', 'ЛАФ', 'https://ffl.org.ua/', 1403
  from countries d
 where d.code = 'UA'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'ffl', v.koda, 1, v.vrstni, 6, false,
       'ЛАФ', 'https://ffl.org.ua/cup/' || v.koda
  from countries d
  join federations f on f.code = 'laf'
  cross join (values
    ('ua-lv-premier', 'Прем''єр-ліга Львівщини', 'Львів Прем''єр', '837', 21),
    ('ua-lv-persha', 'Перша ліга Львівщини', 'Львів Перша', '838', 22),
    ('ua-lv-druha', 'Друга ліга Львівщини', 'Львів Друга', '839', 23),
    ('ua-lv-tretia-1', 'Третя ліга Львівщини, група 1', 'Львів Третя 1', '840', 24),
    ('ua-lv-tretia-2', 'Третя ліга Львівщини, група 2', 'Львів Третя 2', '841', 25),
    ('ua-lv-tretia-3', 'Третя ліга Львівщини, група 3', 'Львів Третя 3', '842', 26),
    ('ua-lv-chetverta-1', 'Четверта ліга Львівщини, група 1', 'Львів Четверта 1', '844', 27),
    ('ua-lv-chetverta-2', 'Четверта ліга Львівщини, група 2', 'Львів Четверта 2', '845', 28)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'UA'
on conflict (slug) do nothing;
