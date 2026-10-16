-- Ukrajina: Українська Прем'єр-Ліга (UPL, 16 klubov) z vira `upl` (upl.ua).
-- Država UA je že vpisana z migracijo 20261015163700 (vir pfl-ua); vrstica je
-- tu ponovljena z `on conflict do nothing`, da migracija stoji sama.
--
-- Šifra lige je id prvenstva sezone na upl.ua (glej scripts/viri/upl.mjs):
-- 2026/27 = 432. Arhiv 2025/26 (16 klubov, 240 tekem), ki se uvozu poda z
-- `arhiv=`: 428.
--
-- Zveza `upl` je organizator lige (UPL), ne UAF; noga vzame vir od zveze
-- (`site_url`), zato `vir_ime` in `vir_url` ostaneta prazna.
--
-- Vmesnika v ukrajinščini še ni in UA ni v matriki nočnega uvoza; liga je
-- NEAKTIVNA (in tudi sicer do uvoza arhiva, razporeda, zapisnikov in cen).

insert into countries (code, name, sort_order) values ('UA', 'Україна', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'upl', 'Українська Прем''єр-Ліга', 'УПЛ', 'https://upl.ua/', 1400
  from countries d
 where d.code = 'UA'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, active
)
select 'ua-upl', 'Прем''єр-ліга', 'УПЛ', d.id, f.id, 'upl', '432', 1, 1, false
  from countries d
  join federations f on f.code = 'upl'
 where d.code = 'UA'
on conflict (slug) do nothing;
