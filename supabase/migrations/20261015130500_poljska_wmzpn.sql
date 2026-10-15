-- Poljska: lige seniorjev Warmińsko-Mazurskega ZPN z vira `wmzpn`
-- (wmzpn.pl, uradni zapisniki PZPN Extranet prek okna strani — admin-ajax
-- `match_history`; glej CLAUDE.md, Poljska — vir wmzpn).
--
-- Šifra lige je `<leagueN>/<play>/<season>` sezone 2026/27 (season
-- 3c77d143-8010-4073-9842-d6b63365ffce). Arhiv 2025/26 (season
-- e9d66181-d03e-4bb3-b889-4da848f4831d) se uvozu poda z `arhiv=` in je po
-- skupnih klubih ista skupina z isto številko:
--   pl-wm-4-liga        c164ca31-22e4-43fc-9e30-4f3bcc2b7d72/17285e70-dba8-4fa2-a27a-30646ce64d6d/e9d66181-d03e-4bb3-b889-4da848f4831d (11 skupnih od 16)
--   pl-wm-okregowa-1    c5afdf4b-b449-4ef3-acf5-dded47fc5f58/bbb69021-0b53-44c6-863b-96715174e7e7/e9d66181-d03e-4bb3-b889-4da848f4831d (12)
--   pl-wm-okregowa-2    c5afdf4b-b449-4ef3-acf5-dded47fc5f58/a0f01f01-7dff-4e92-ba57-1b339bb84e68/e9d66181-d03e-4bb3-b889-4da848f4831d (9)
--   pl-wm-a-1           63d04023-727a-4c0c-a8c6-4154fe1104b7/e75c0e65-cfc0-44f5-8692-3673dd094715/e9d66181-d03e-4bb3-b889-4da848f4831d (10 od 14)
--   pl-wm-a-2           63d04023-727a-4c0c-a8c6-4154fe1104b7/9097e2ba-2e68-4552-953a-24766eafcba6/e9d66181-d03e-4bb3-b889-4da848f4831d (9)
--   pl-wm-a-3           63d04023-727a-4c0c-a8c6-4154fe1104b7/8cf5857a-d4cc-45d8-b4ae-884d1bf38b10/e9d66181-d03e-4bb3-b889-4da848f4831d (10)
--   pl-wm-a-4           63d04023-727a-4c0c-a8c6-4154fe1104b7/92e717fe-4cc1-445a-bf7e-85fc6ee377ea/e9d66181-d03e-4bb3-b889-4da848f4831d (10)
--
-- Klasa B (5 skupin) NI vpisana: v preizkusu 60 zapisnikov (12 na skupino)
-- ni nobena ekipa vpisala menjav, v 7 od 59 odigranih se goli ne ujemajo z izidom.
-- Vir jo zna brati (šifre v CLAUDE.md), a brez menjav ni pravih minut.
-- Mladinske lige (Junior A1 …) niso vpisane.
--
-- Lige so NEAKTIVNE (vklop šele po uvozu arhiva, tekoče sezone in cen).

insert into countries (code, name, sort_order) values ('PL', 'Polska', 10) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'wmzpn', 'Warmińsko-Mazurski ZPN', 'Warmińsko-Mazurskie', 'https://wmzpn.pl/', 1002
  from countries d
 where d.code = 'PL'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'wmzpn', v.liga || '/' || v.play || '/3c77d143-8010-4073-9842-d6b63365ffce', 1, v.vrstni, 6, false,
       'Warmińsko-Mazurski ZPN', 'https://wmzpn.pl/?page_id=1625'
  from countries d
  join federations f on f.code = 'wmzpn'
  cross join (values
    ('pl-wm-4-liga', 'IV liga warmińsko-mazurska', 'WM IV liga', 'c164ca31-22e4-43fc-9e30-4f3bcc2b7d72', '2820e642-1475-40f8-9489-13c742fbc63a', 11),
    ('pl-wm-okregowa-1', 'Klasa okręgowa, grupa 1 (Warmińsko-Mazurskie)', 'WM okręgowa 1', 'c5afdf4b-b449-4ef3-acf5-dded47fc5f58', '33dde60f-37d8-4592-a080-6795cc040465', 12),
    ('pl-wm-okregowa-2', 'Klasa okręgowa, grupa 2 (Warmińsko-Mazurskie)', 'WM okręgowa 2', 'c5afdf4b-b449-4ef3-acf5-dded47fc5f58', 'add51c43-5c34-4d4a-82a6-7ee821ec1638', 13),
    ('pl-wm-a-1', 'Klasa A, grupa 1 (Warmińsko-Mazurskie)', 'WM A 1', '63d04023-727a-4c0c-a8c6-4154fe1104b7', '0aace3bb-4a47-4117-a614-a0a54e2085e8', 14),
    ('pl-wm-a-2', 'Klasa A, grupa 2 (Warmińsko-Mazurskie)', 'WM A 2', '63d04023-727a-4c0c-a8c6-4154fe1104b7', 'a18e856f-d73b-4ff8-b44f-77ae417c83c9', 15),
    ('pl-wm-a-3', 'Klasa A, grupa 3 (Warmińsko-Mazurskie)', 'WM A 3', '63d04023-727a-4c0c-a8c6-4154fe1104b7', 'd0d84a85-7816-4ca0-8f6a-de8e3d3f5965', 16),
    ('pl-wm-a-4', 'Klasa A, grupa 4 (Warmińsko-Mazurskie)', 'WM A 4', '63d04023-727a-4c0c-a8c6-4154fe1104b7', '711ae517-02ca-4e5a-90a3-f0cbc75e7986', 17)
  ) as v(slug, ime, kratko, liga, play, vrstni)
 where d.code = 'PL'
on conflict (slug) do nothing;
