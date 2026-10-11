-- Poljska: država PL in lige seniorjev Świętokrzyskega ZPN z vira `pzpn`
-- (uradni zapisniki PZPN Extranet prek javnega gradnika szpnkielce.pl).
--
-- Šifra lige je `swietokrzyski/<play_id>` sezone 2026/27; arhiv 2025/26 je v
-- CLAUDE.md (Poljska — vir pzpn) in se uvozu poda z `arhiv=`. Skupine A in B
-- so z lanskimi povezane po skupnih klubih (Kielce I = Grupa 1, Kielce II =
-- Grupa 2, Sandomierz = Grupa 3).
--
-- 3. liga gr. 4 ni vpisana: zveza je ne vodi in gradnik zanjo vrne zapisnik
-- brez postav. Vmesnik v poljščini pride s svojo spremembo; do takrat so
-- lige NEAKTIVNE (in tudi sicer do uvoza in cen).

insert into countries (code, name, sort_order) values ('PL', 'Polska', 10) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'szpn-swietokrzyski', 'Świętokrzyski ZPN', 'Świętokrzyskie', 'https://szpnkielce.pl/rozgrywki/', 1001
  from countries d
 where d.code = 'PL'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'pzpn', 'swietokrzyski/' || v.play, 1, v.vrstni, 6, false,
       'Świętokrzyski ZPN', 'https://szpnkielce.pl/rozgrywki/'
  from countries d
  join federations f on f.code = 'szpn-swietokrzyski'
  cross join (values
    ('pl-sk-4-liga', 'IV liga świętokrzyska', 'ŚK IV liga', '0e86c2b3-75d3-483b-80a0-4f086352afc5', 1),
    ('pl-sk-okregowa', 'Klasa okręgowa (Świętokrzyskie)', 'ŚK okręgowa', '1681c4a3-9391-4990-b155-7f2c06535441', 2),
    ('pl-sk-a-kielce-1', 'Klasa A Kielce I', 'ŚK A Kielce I', 'a6cd6f08-26ed-4cc6-8504-80d0e43c0882', 3),
    ('pl-sk-a-kielce-2', 'Klasa A Kielce II', 'ŚK A Kielce II', '3f6b628a-737c-47be-8f56-15445e1bd347', 4),
    ('pl-sk-a-sandomierz', 'Klasa A Sandomierz', 'ŚK A Sandomierz', '64ee2db0-9540-4372-9928-dfe268fc963e', 5),
    ('pl-sk-b-kielce-1', 'Klasa B Kielce I', 'ŚK B Kielce I', 'ed980a22-e851-4b47-bf75-5dfbee9f60cc', 6),
    ('pl-sk-b-kielce-2', 'Klasa B Kielce II', 'ŚK B Kielce II', '9c6fbee7-a9e5-4abd-84da-13bcf42c2d60', 7),
    ('pl-sk-b-sandomierz', 'Klasa B Sandomierz', 'ŚK B Sandomierz', '740e1d89-139f-4fdd-a431-23a7da11b23c', 8)
  ) as v(slug, ime, kratko, play, vrstni)
 where d.code = 'PL'
on conflict (slug) do nothing;
