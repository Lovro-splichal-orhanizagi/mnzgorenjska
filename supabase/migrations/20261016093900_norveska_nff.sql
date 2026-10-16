-- Norveška: lige odraslih moških NFF z vira `nff` (fotball.no, javne strani FIKS)
-- — OBOS-ligaen (2. raven), 2. divisjon (2 skupini), Norsk Tipping-ligaen
-- (3. divisjon, 6 skupin) ter 4. in 5. divisjon kretsov, ki so prestale
-- preverbo pokritosti (vzorec zapisnikov 2026 in 2025, vsaj 80 % polnih:
-- obe postavi, goli = izid). Seznam, arhivi in izpuščene skupine so v
-- CLAUDE.md (Norveška — vir nff); izpiše jih `scripts/norveske-lige.mjs`.
--
-- Pisno dovoljenje NFF za zajem: pridobil Lovro, oktober 2026 (kopija še ni
-- v arhivu info@).
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"). Šifra lige je id
-- turnirja FIKS ene sezone; ob novi sezoni (2027) se popravi
-- `source_league_code` (vsaka skupina dobi nov id). Vse NEAKTIVNE.

insert into countries (code, name, sort_order) values ('NO', 'Norge', 20) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'nff', 'Norges Fotballforbund', 'NFF', 'https://www.fotball.no/', 1301
  from countries d
 where d.code = 'NO'
on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.url, v.vrstni
  from countries d
  cross join (values
    ('nff-ostfold', 'Østfold Fotballkrets', 'NFF Østfold', 'https://www.fotball.no/kretser/ostfold/', 1302),
    ('nff-akershus', 'Akershus Fotballkrets', 'NFF Akershus', 'https://www.fotball.no/kretser/akershus/', 1303),
    ('nff-oslo', 'Oslo Fotballkrets', 'NFF Oslo', 'https://www.fotball.no/kretser/oslo/', 1304),
    ('nff-indre-ostland', 'Indre Østland Fotballkrets', 'NFF Indre Østland', 'https://www.fotball.no/kretser/indre-ostland/', 1305),
    ('nff-buskerud', 'Buskerud Fotballkrets', 'NFF Buskerud', 'https://www.fotball.no/kretser/buskerud/', 1306),
    ('nff-vestfold', 'Vestfold Fotballkrets', 'NFF Vestfold', 'https://www.fotball.no/kretser/vestfold/', 1307),
    ('nff-telemark', 'Telemark Fotballkrets', 'NFF Telemark', 'https://www.fotball.no/kretser/telemark/', 1308),
    ('nff-rogaland', 'Rogaland Fotballkrets', 'NFF Rogaland', 'https://www.fotball.no/kretser/rogaland/', 1309),
    ('nff-hordaland', 'Hordaland Fotballkrets', 'NFF Hordaland', 'https://www.fotball.no/kretser/hordaland/', 1310),
    ('nff-sogn-fjordane', 'Sogn og Fjordane Fotballkrets', 'NFF Sogn og Fjordane', 'https://www.fotball.no/kretser/sogn-og-fjordane/', 1311),
    ('nff-nordmore-romsdal', 'Nordmøre og Romsdal Fotballkrets', 'NFF Nordmøre/Romsdal', 'https://www.fotball.no/kretser/nordmore-og-romsdal/', 1312),
    ('nff-trondelag', 'Trøndelag Fotballkrets', 'NFF Trøndelag', 'https://www.fotball.no/kretser/trondelag/', 1313),
    ('nff-nordland', 'Nordland Fotballkrets', 'NFF Nordland', 'https://www.fotball.no/kretser/nordland/', 1314),
    ('nff-troms', 'Troms Fotballkrets', 'NFF Troms', 'https://www.fotball.no/kretser/troms/', 1315),
    ('nff-finnmark', 'Finnmark Fotballkrets', 'NFF Finnmark', 'https://www.fotball.no/kretser/finnmark/', 1316),
    ('nff-sunnmore', 'Sunnmøre Fotballkrets', 'NFF Sunnmøre', 'https://www.fotball.no/kretser/sunnmore/', 1317),
    ('nff-halogaland', 'Hålogaland Fotballkrets', 'NFF Hålogaland', 'https://www.fotball.no/kretser/haalogaland/', 1318),
    ('nff-agder', 'Agder Fotballkrets', 'NFF Agder', 'https://www.fotball.no/kretser/agder/', 1319)
  ) as v(koda, ime, kratko, url, vrstni)
 where d.code = 'NO'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'nff', v.koda, 1, v.vrstni, 6, false,
       'NFF', 'https://www.fotball.no/fotballdata/turnering/hjem/?fiksId=' || v.koda, true
  from countries d
  cross join (values
    ('no-obos', 'OBOS-ligaen', 'OBOS-ligaen', 'nff', '206093', 1),
    ('no-2div-1', '2. divisjon avd. 1', '2. div 1', 'nff', '206007', 2),
    ('no-2div-2', '2. divisjon avd. 2', '2. div 2', 'nff', '206008', 3),
    ('no-3div-1', 'Norsk Tipping-ligaen avd. 1', '3. div 1', 'nff', '205686', 4),
    ('no-3div-2', 'Norsk Tipping-ligaen avd. 2', '3. div 2', 'nff', '205687', 5),
    ('no-3div-3', 'Norsk Tipping-ligaen avd. 3', '3. div 3', 'nff', '205688', 6),
    ('no-3div-4', 'Norsk Tipping-ligaen avd. 4', '3. div 4', 'nff', '205689', 7),
    ('no-3div-5', 'Norsk Tipping-ligaen avd. 5', '3. div 5', 'nff', '205690', 8),
    ('no-3div-6', 'Norsk Tipping-ligaen avd. 6', '3. div 6', 'nff', '205691', 9),
    ('no-ostfold-4div', '4. divisjon Østfold', '4. div Østfold', 'nff-ostfold', '205277', 10),
    ('no-ostfold-5div', '5. divisjon Østfold', '5. div Østfold', 'nff-ostfold', '205278', 11),
    ('no-akershus-4div', '4. divisjon Akershus', '4. div Akershus', 'nff-akershus', '205683', 12),
    ('no-akershus-5div', '5. divisjon Akershus', '5. div Akershus', 'nff-akershus', '205706', 13),
    ('no-oslo-4div-1', '4. divisjon Oslo avd. 1', '4. div Oslo 1', 'nff-oslo', '205400', 14),
    ('no-oslo-4div-2', '4. divisjon Oslo avd. 2', '4. div Oslo 2', 'nff-oslo', '205401', 15),
    ('no-oslo-5div-2', '5. divisjon Oslo avd. 2', '5. div Oslo 2', 'nff-oslo', '205404', 16),
    ('no-indre-ostland-4div', '4. divisjon Indre Østland', '4. div Indre Østland', 'nff-indre-ostland', '205625', 17),
    ('no-indre-ostland-5div-1', '5. divisjon Indre Østland avd. 1', '5. div Indre Østland 1', 'nff-indre-ostland', '205626', 18),
    ('no-indre-ostland-5div-2', '5. divisjon Indre Østland avd. 2', '5. div Indre Østland 2', 'nff-indre-ostland', '205627', 19),
    ('no-buskerud-4div', '4. divisjon Buskerud', '4. div Buskerud', 'nff-buskerud', '206361', 20),
    ('no-buskerud-5div', '5. divisjon Buskerud', '5. div Buskerud', 'nff-buskerud', '206756', 21),
    ('no-vestfold-4div', '4. divisjon Vestfold', '4. div Vestfold', 'nff-vestfold', '206502', 22),
    ('no-telemark-4div', '4. divisjon Telemark', '4. div Telemark', 'nff-telemark', '205085', 23),
    ('no-telemark-5div', '5. divisjon Telemark', '5. div Telemark', 'nff-telemark', '205086', 24),
    ('no-rogaland-4div-1', '4. divisjon Rogaland avd. 1', '4. div Rogaland 1', 'nff-rogaland', '206109', 25),
    ('no-rogaland-4div-2', '4. divisjon Rogaland avd. 2', '4. div Rogaland 2', 'nff-rogaland', '206110', 26),
    ('no-rogaland-5div-1', '5. divisjon Rogaland avd. 1', '5. div Rogaland 1', 'nff-rogaland', '206111', 27),
    ('no-rogaland-5div-2', '5. divisjon Rogaland avd. 2', '5. div Rogaland 2', 'nff-rogaland', '206112', 28),
    ('no-rogaland-5div-3', '5. divisjon Rogaland avd. 3', '5. div Rogaland 3', 'nff-rogaland', '206113', 29),
    ('no-hordaland-4div-1', '4. divisjon Hordaland avd. 1', '4. div Hordaland 1', 'nff-hordaland', '205952', 30),
    ('no-hordaland-4div-2', '4. divisjon Hordaland avd. 2', '4. div Hordaland 2', 'nff-hordaland', '205953', 31),
    ('no-sogn-fjordane-4div', '4. divisjon Sogn og Fjordane', '4. div Sogn og Fjordane', 'nff-sogn-fjordane', '204918', 32),
    ('no-sogn-fjordane-5div', '5. divisjon Sogn og Fjordane', '5. div Sogn og Fjordane', 'nff-sogn-fjordane', '204920', 33),
    ('no-nordmore-romsdal-4div', '4. divisjon Nordmøre og Romsdal', '4. div Nordmøre/Romsdal', 'nff-nordmore-romsdal', '205958', 34),
    ('no-trondelag-4div-1', '4. divisjon Trøndelag avd. 1', '4. div Trøndelag 1', 'nff-trondelag', '205476', 35),
    ('no-trondelag-4div-2', '4. divisjon Trøndelag avd. 2', '4. div Trøndelag 2', 'nff-trondelag', '205477', 36),
    ('no-nordland-4div', '4. divisjon Nordland', '4. div Nordland', 'nff-nordland', '204882', 37),
    ('no-nordland-5div-helgeland', '5. divisjon Nordland Helgeland avd. 3', '5. div Helgeland 3', 'nff-nordland', '204885', 38),
    ('no-troms-4div', '4. divisjon Troms', '4. div Troms', 'nff-troms', '206757', 39),
    ('no-finnmark-4div', '4. divisjon Finnmark', '4. div Finnmark', 'nff-finnmark', '207928', 40),
    ('no-sunnmore-4div', '4. divisjon Sunnmøre', '4. div Sunnmøre', 'nff-sunnmore', '205682', 41),
    ('no-sunnmore-5div', '5. divisjon Sunnmøre', '5. div Sunnmøre', 'nff-sunnmore', '205921', 42),
    ('no-halogaland-4div', '4. divisjon Hålogaland', '4. div Hålogaland', 'nff-halogaland', '206174', 43),
    ('no-halogaland-5div-vesteralen', '5. divisjon Hålogaland Vesterålen', '5. div Vesterålen', 'nff-halogaland', '206942', 44),
    ('no-agder-4div', '4. divisjon Agder', '4. div Agder', 'nff-agder', '205077', 45),
    ('no-agder-5div', '5. divisjon Agder', '5. div Agder', 'nff-agder', '205103', 46)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'NO'
on conflict (slug) do nothing;
