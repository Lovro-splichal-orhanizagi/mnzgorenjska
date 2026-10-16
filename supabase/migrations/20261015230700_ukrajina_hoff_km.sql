-- Ukrajina, Hmeljnicka oblast: zveza ХОАФ (Хмельницька обласна асоціація
-- футболу) in obe ligi oblastnega prvenstva (ЧХО) z vira `hoff-km`
-- (hoff.km.ua): Vyshcha liga (6 klubov) in Persha liga (5 klubov).
--
-- Šifra lige je slug strani lige na hoff.km.ua (glej scripts/viri/hoff-km.mjs);
-- leto v slugu je sezona. Sezona je KOLEDARSKA (maj–oktober), oznaka "2026".
-- Arhiv, ki se uvozu poda z `arhiv=`:
--   ua-km-vyshcha  chho-2025 (ЧХО 2025, ena liga s 7 klubi; skupna sta
--                  Колос Полонне in Оболонь-Чемерівці)
--   ua-km-persha   — (lani je ni bilo; klubi 2026 so novi)
--
-- Država UA je lahko že vpisana (vir pfl-ua), zato on conflict do nothing.
-- Vmesnika v ukrajinščini še ni in UA ni v matriki nočnega uvoza; lige so
-- NEAKTIVNE (in tudi sicer do uvoza arhiva, razporeda, zapisnikov in cen).

insert into countries (code, name, sort_order) values ('UA', 'Україна', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'hoaf-km', 'Хмельницька обласна асоціація футболу', 'ХОАФ', 'https://hoff.km.ua/', 1410
  from countries d
 where d.code = 'UA'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hoff-km', v.koda, 1, v.vrstni, 6, false,
       null, null, true
  from countries d
  join federations f on f.code = 'hoaf-km'
  cross join (values
    ('ua-km-vyshcha', 'Чемпіонат Хмельницької області — Вища ліга', 'ХО Вища ліга', 'chho-2026-vyshha-liga', 21),
    ('ua-km-persha', 'Чемпіонат Хмельницької області — Перша ліга', 'ХО Перша ліга', 'chho-2026-persha-liga', 22)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'UA'
on conflict (slug) do nothing;
