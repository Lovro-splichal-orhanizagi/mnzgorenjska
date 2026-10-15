-- Kazahstan: Prva liga in Druga liga (konferenci Jugo-zahod in Severo-vzhod)
-- z vira `kff` (kffleague.kz, uradna stran lig KFF). Glej CLAUDE.md
-- (Kazahstan — vir `kff`) in scripts/viri/kff.mjs.
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"; marec–november).
-- Šifra lige je `<turnir>/<leto>/<sezona>[/<klub>][@<od>-<do>]`: id sezone KFF
-- (2026: Prva liga 204, Druga liga 203), pri Drugi ligi še id kluba, ki
-- konferenco določi (obe konferenci sta v istem `season_id`; konferenca je
-- skupina klubov, ki igrajo drug z drugim). Finale Druge lige je druga faza
-- in ni del lige. Arhiv 2025 je v CLAUDE.md.
--
-- Sezona 2026 se ob vpisu končuje (zadnji krogi v novembru) — vklop bo realno
-- za 2027; takrat se šifra popravi (leto, id sezone, klub).
--
-- Navedba vira je obvezna ("При использовании материалов обязательна ссылка
-- на официальный сайт"): `vir_ime` in `vir_url` v nogi.
--
-- Vse NEAKTIVNE; uvozi niso bili pognani.

insert into countries (code, name, sort_order) values ('KZ', 'Қазақстан', 40) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'kff', 'Қазақстан Футбол Федерациясы', 'KFF', 'https://kffleague.kz/', 4001
  from countries d
 where d.code = 'KZ'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'kff', v.koda, 1, v.vrstni, 6, false,
       'kffleague.kz', v.url, true
  from countries d
  cross join (values
    ('kz-1-liga', 'Первая лига', 'Первая лига', '1l/2026/204', 1, 'https://kffleague.kz/ru/first-league'),
    ('kz-2-liga-yugo-zapad', 'Вторая лига — Юго-Запад', '2Л Юго-Запад', '2l/2026/203/332', 2, 'https://kffleague.kz/ru/second-league'),
    ('kz-2-liga-severo-vostok', 'Вторая лига — Северо-Восток', '2Л Северо-Восток', '2l/2026/203/5065', 3, 'https://kffleague.kz/ru/second-league')
  ) as v(slug, ime, kratko, koda, vrstni, url)
  join federations f on f.code = 'kff'
 where d.code = 'KZ'
on conflict (slug) do nothing;
