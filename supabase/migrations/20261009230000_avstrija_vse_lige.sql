-- Avstrija: vse lige odraslih (moški, 11 na 11) z vira ÖFB (oefb.at, vir
-- `oefb`) — Bundesliga in 2. Liga, Regionalliga Ost, Nord in West
-- (Regionalliga Süd je od 2026/27 razdeljena na koroško in štajersko) ter
-- vse lige vseh devetih deželnih zvez do najnižje Klasse. Prvih 14 (Koroška,
-- Štajerska) je v 20261009170000_avstrija_lige; tu so preostale.
--
-- Pregled 9. 10. 2026: vsaka liga ima zapisnik z 11 + 11 začetniki, klopjo,
-- strelci s šifro in menjavami (en vzorec na ligo). Izpuščene: rezervne lige
-- (Reserve, štajerske IB lige), mladinske, ženske, futsal, pokali in dodatne
-- tekme (Relegation, Play-Off). Seznam, arhivi in razlogi so v CLAUDE.md
-- (Avstrija, vir `oefb`), arhivi za uvoz v scripts/avstrija-lige.txt.
--
-- Bundesliga 2026/27 je Grunddurchgang (22 krogov), Regionalliga Süd
-- (Koroška, Štajerska) jesenski del (14 krogov); nadaljevanje je pri ÖFB
-- svoje tekmovanje z novo šifro.
--
-- Zveza `oefb` je državna raven (kot `nzs` v Sloveniji): Bundesliga, 2. Liga
-- in Regionallige, ki jih igrajo klubi več dežel.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.url, v.vrstni
  from countries d
  cross join (values
    ('oefb', 'Österreichischer Fußball-Bund', 'ÖFB', 'https://www.oefb.at/', 500),
    ('bfv', 'Burgenländischer Fußballverband', 'Burgenland', 'https://www.bfv.at/', 503),
    ('noefv', 'Niederösterreichischer Fußballverband', 'Niederösterreich', 'https://www.noefv.at/', 504),
    ('ooefv', 'Oberösterreichischer Fußballverband', 'Oberösterreich', 'https://www.ooefv.at/', 505),
    ('sfv', 'Salzburger Fußballverband', 'Salzburg', 'https://www.sfv.at/', 506),
    ('tfv', 'Tiroler Fußballverband', 'Tirol', 'https://www.tfv.at/', 507),
    ('vfv', 'Vorarlberger Fußballverband', 'Vorarlberg', 'https://www.vfv.at/', 508),
    ('wfv', 'Wiener Fußballverband', 'Wien', 'https://www.wfv.at/', 509)
  ) as v(koda, ime, kratko, url, vrstni)
 where d.code = 'AT'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'oefb', v.koda, 1, v.vrstni, 6, false,
       'ÖFB', 'https://www.oefb.at/bewerbe/Bewerb/' || v.koda || '/'
  from countries d
  cross join (values
    ('at-bundesliga', 'Bundesliga', 'Bundesliga', 'oefb', '232246', 1),
    ('at-2-liga', '2. Liga', '2. Liga', 'oefb', '232245', 2),
    ('at-regionalliga-ost', 'Regionalliga Ost', 'RL Ost', 'oefb', '231974', 3),
    ('at-regionalliga-nord', 'Regionalliga Nord', 'RL Nord', 'oefb', '232371', 4),
    ('at-regionalliga-west', 'Regionalliga West', 'RL West', 'oefb', '232368', 5),
    ('at-b-landesliga', 'Burgenlandliga', 'Burgenlandliga', 'bfv', '231975', 1),
    ('at-b-ii-liga-nord', 'II. Liga Nord (Burgenland)', 'Bgld. II. Liga Nord', 'bfv', '231969', 2),
    ('at-b-ii-liga-mitte', 'II. Liga Mitte (Burgenland)', 'Bgld. II. Liga Mitte', 'bfv', '231965', 3),
    ('at-b-ii-liga-sued', 'II. Liga Süd (Burgenland)', 'Bgld. II. Liga Süd', 'bfv', '231967', 4),
    ('at-b-1-klasse-nord', '1. Klasse Nord (Burgenland)', 'Bgld. 1. Kl. Nord', 'bfv', '231971', 5),
    ('at-b-1-klasse-mitte', '1. Klasse Mitte (Burgenland)', 'Bgld. 1. Kl. Mitte', 'bfv', '231964', 6),
    ('at-b-1-klasse-sued', '1. Klasse Süd (Burgenland)', 'Bgld. 1. Kl. Süd', 'bfv', '231966', 7),
    ('at-b-2-klasse-nord', '2. Klasse Nord (Burgenland)', 'Bgld. 2. Kl. Nord', 'bfv', '231972', 8),
    ('at-b-2-klasse-sued-a', '2. Klasse Süd A (Burgenland)', 'Bgld. 2. Kl. Süd A', 'bfv', '231973', 9),
    ('at-b-2-klasse-sued-b', '2. Klasse Süd B (Burgenland)', 'Bgld. 2. Kl. Süd B', 'bfv', '231968', 10),
    ('at-k-regionalliga-sued', 'Regionalliga Süd (Kärnten)', 'RL Süd Kärnten', 'kfv', '231655', 0),
    ('at-k-1-klasse-west', '1. Klasse West (Kärnten)', 'Kärnten 1. Kl. West', 'kfv', '231653', 6),
    ('at-k-1-klasse-mitte', '1. Klasse Mitte (Kärnten)', 'Kärnten 1. Kl. Mitte', 'kfv', '231662', 7),
    ('at-k-1-klasse-ost', '1. Klasse Ost (Kärnten)', 'Kärnten 1. Kl. Ost', 'kfv', '231660', 8),
    ('at-k-2-klasse-a', '2. Klasse A (Kärnten)', 'Kärnten 2. Kl. A', 'kfv', '231664', 9),
    ('at-k-2-klasse-b', '2. Klasse B (Kärnten)', 'Kärnten 2. Kl. B', 'kfv', '231658', 10),
    ('at-k-2-klasse-c', '2. Klasse C (Kärnten)', 'Kärnten 2. Kl. C', 'kfv', '231661', 11),
    ('at-k-2-klasse-d', '2. Klasse D (Kärnten)', 'Kärnten 2. Kl. D', 'kfv', '231659', 12),
    ('at-noe-1-landesliga', '1. Landesliga (NÖ)', 'NÖ 1. LL', 'noefv', '231756', 1),
    ('at-noe-2-landesliga-ost', '2. Landesliga Ost (NÖ)', 'NÖ 2. LL Ost', 'noefv', '231747', 2),
    ('at-noe-2-landesliga-west', '2. Landesliga West (NÖ)', 'NÖ 2. LL West', 'noefv', '231773', 3),
    ('at-noe-gebietsliga-nord-nordwest', 'Gebietsliga Nord/Nordwest (NÖ)', 'NÖ GL Nord/Nordwest', 'noefv', '231750', 4),
    ('at-noe-gebietsliga-nordwest-waldviertel', 'Gebietsliga Nordwest/Waldviertel (NÖ)', 'NÖ GL Nordwest/Waldviertel', 'noefv', '231768', 5),
    ('at-noe-gebietsliga-sued-suedost', 'Gebietsliga Süd/Südost (NÖ)', 'NÖ GL Süd/Südost', 'noefv', '231779', 6),
    ('at-noe-gebietsliga-west', 'Gebietsliga West (NÖ)', 'NÖ GL West', 'noefv', '231771', 7),
    ('at-noe-1-klasse-nord', '1. Klasse Nord (NÖ)', 'NÖ 1. Kl. Nord', 'noefv', '231754', 8),
    ('at-noe-1-klasse-nordwest', '1. Klasse Nordwest (NÖ)', 'NÖ 1. Kl. Nordwest', 'noefv', '231772', 9),
    ('at-noe-1-klasse-nordwest-mitte', '1. Klasse Nordwest-Mitte (NÖ)', 'NÖ 1. Kl. Nordwest-Mitte', 'noefv', '231783', 10),
    ('at-noe-1-klasse-ost', '1. Klasse Ost (NÖ)', 'NÖ 1. Kl. Ost', 'noefv', '231751', 11),
    ('at-noe-1-klasse-sued', '1. Klasse Süd (NÖ)', 'NÖ 1. Kl. Süd', 'noefv', '231757', 12),
    ('at-noe-1-klasse-waldviertel', '1. Klasse Waldviertel (NÖ)', 'NÖ 1. Kl. Waldviertel', 'noefv', '231774', 13),
    ('at-noe-1-klasse-west', '1. Klasse West (NÖ)', 'NÖ 1. Kl. West', 'noefv', '231776', 14),
    ('at-noe-1-klasse-west-mitte', '1. Klasse West/Mitte (NÖ)', 'NÖ 1. Kl. West/Mitte', 'noefv', '231764', 15),
    ('at-noe-2-klasse-marchfeld', '2. Klasse Marchfeld (NÖ)', 'NÖ 2. Kl. Marchfeld', 'noefv', '231755', 16),
    ('at-noe-2-klasse-mostviertel', '2. Klasse Mostviertel (NÖ)', 'NÖ 2. Kl. Mostviertel', 'noefv', '231753', 17),
    ('at-noe-2-klasse-ost', '2. Klasse Ost (NÖ)', 'NÖ 2. Kl. Ost', 'noefv', '231748', 18),
    ('at-noe-2-klasse-ost-mitte', '2. Klasse Ost/Mitte (NÖ)', 'NÖ 2. Kl. Ost/Mitte', 'noefv', '231777', 19),
    ('at-noe-2-klasse-pulkau-schmidatal', '2. Klasse Pulkau-/Schmidatal (NÖ)', 'NÖ 2. Kl. Pulkau-/Schmidatal', 'noefv', '231781', 20),
    ('at-noe-2-klasse-steinfeld', '2. Klasse Steinfeld (NÖ)', 'NÖ 2. Kl. Steinfeld', 'noefv', '231767', 21),
    ('at-noe-2-klasse-thayatal', '2. Klasse Thayatal (NÖ)', 'NÖ 2. Kl. Thayatal', 'noefv', '231749', 22),
    ('at-noe-2-klasse-traisental', '2. Klasse Traisental (NÖ)', 'NÖ 2. Kl. Traisental', 'noefv', '231775', 23),
    ('at-noe-2-klasse-triestingtal', '2. Klasse Triestingtal (NÖ)', 'NÖ 2. Kl. Triestingtal', 'noefv', '231784', 24),
    ('at-noe-2-klasse-wachau-donau', '2. Klasse Wachau/Donau (NÖ)', 'NÖ 2. Kl. Wachau/Donau', 'noefv', '231760', 25),
    ('at-noe-2-klasse-waldviertel-sued', '2. Klasse Waldviertel Süd (NÖ)', 'NÖ 2. Kl. Waldviertel Süd', 'noefv', '231762', 26),
    ('at-noe-2-klasse-waldviertel-zentral', '2. Klasse Waldviertel Zentral (NÖ)', 'NÖ 2. Kl. Waldviertel Zentral', 'noefv', '231763', 27),
    ('at-noe-2-klasse-wechsel', '2. Klasse Wechsel (NÖ)', 'NÖ 2. Kl. Wechsel', 'noefv', '231752', 28),
    ('at-noe-2-klasse-weinviertel', '2. Klasse Weinviertel (NÖ)', 'NÖ 2. Kl. Weinviertel', 'noefv', '231761', 29),
    ('at-noe-2-klasse-ybbstal', '2. Klasse Ybbstal (NÖ)', 'NÖ 2. Kl. Ybbstal', 'noefv', '231770', 30),
    ('at-noe-bezirksklasse-weinviertel', 'Bezirksklasse Weinviertel (NÖ)', 'NÖ BK Weinviertel', 'noefv', '231782', 31),
    ('at-ooe-ooe-liga', 'OÖ Liga', 'OÖ Liga', 'ooefv', '231619', 1),
    ('at-ooe-landesliga-ost', 'Landesliga Ost (OÖ)', 'OÖ LL Ost', 'ooefv', '231629', 2),
    ('at-ooe-landesliga-west', 'Landesliga West (OÖ)', 'OÖ LL West', 'ooefv', '231612', 3),
    ('at-ooe-bezirksliga-nord', 'Bezirksliga Nord (OÖ)', 'OÖ BL Nord', 'ooefv', '231623', 4),
    ('at-ooe-bezirksliga-ost', 'Bezirksliga Ost (OÖ)', 'OÖ BL Ost', 'ooefv', '231610', 5),
    ('at-ooe-bezirksliga-sued', 'Bezirksliga Süd (OÖ)', 'OÖ BL Süd', 'ooefv', '231600', 6),
    ('at-ooe-bezirksliga-west', 'Bezirksliga West (OÖ)', 'OÖ BL West', 'ooefv', '231631', 7),
    ('at-ooe-1-klasse-mitte', '1. Klasse Mitte (OÖ)', 'OÖ 1. Kl. Mitte', 'ooefv', '231639', 8),
    ('at-ooe-1-klasse-mittewest', '1. Klasse Mittewest (OÖ)', 'OÖ 1. Kl. Mittewest', 'ooefv', '231609', 9),
    ('at-ooe-1-klasse-nord', '1. Klasse Nord (OÖ)', 'OÖ 1. Kl. Nord', 'ooefv', '231635', 10),
    ('at-ooe-1-klasse-nordost', '1. Klasse Nordost (OÖ)', 'OÖ 1. Kl. Nordost', 'ooefv', '231638', 11),
    ('at-ooe-1-klasse-nordwest', '1. Klasse Nordwest (OÖ)', 'OÖ 1. Kl. Nordwest', 'ooefv', '231604', 12),
    ('at-ooe-1-klasse-ost', '1. Klasse Ost (OÖ)', 'OÖ 1. Kl. Ost', 'ooefv', '231617', 13),
    ('at-ooe-1-klasse-sued', '1. Klasse Süd (OÖ)', 'OÖ 1. Kl. Süd', 'ooefv', '231608', 14),
    ('at-ooe-1-klasse-suedwest', '1. Klasse Südwest (OÖ)', 'OÖ 1. Kl. Südwest', 'ooefv', '231599', 15),
    ('at-ooe-2-klasse-mitte', '2. Klasse Mitte (OÖ)', 'OÖ 2. Kl. Mitte', 'ooefv', '231602', 16),
    ('at-ooe-2-klasse-mittewest', '2. Klasse Mittewest (OÖ)', 'OÖ 2. Kl. Mittewest', 'ooefv', '231626', 17),
    ('at-ooe-2-klasse-nordmitte', '2. Klasse Nordmitte (OÖ)', 'OÖ 2. Kl. Nordmitte', 'ooefv', '231614', 18),
    ('at-ooe-2-klasse-nordwest', '2. Klasse Nordwest (OÖ)', 'OÖ 2. Kl. Nordwest', 'ooefv', '231636', 19),
    ('at-ooe-2-klasse-ost', '2. Klasse Ost (OÖ)', 'OÖ 2. Kl. Ost', 'ooefv', '231618', 20),
    ('at-ooe-2-klasse-sued', '2. Klasse Süd (OÖ)', 'OÖ 2. Kl. Süd', 'ooefv', '231606', 21),
    ('at-ooe-2-klasse-suedwest', '2. Klasse Südwest (OÖ)', 'OÖ 2. Kl. Südwest', 'ooefv', '231605', 22),
    ('at-ooe-2-klasse-west', '2. Klasse West (OÖ)', 'OÖ 2. Kl. West', 'ooefv', '231633', 23),
    ('at-ooe-2-klasse-westnord', '2. Klasse Westnord (OÖ)', 'OÖ 2. Kl. Westnord', 'ooefv', '231598', 24),
    ('at-s-salzburger-liga', 'Salzburger Liga', 'Salzburger Liga', 'sfv', '231808', 1),
    ('at-s-1-landesliga', '1. Landesliga (Salzburg)', 'Sbg. 1. LL', 'sfv', '231816', 2),
    ('at-s-2-landesliga-nord', '2. Landesliga Nord (Salzburg)', 'Sbg. 2. LL Nord', 'sfv', '231807', 3),
    ('at-s-2-landesliga-sued', '2. Landesliga Süd (Salzburg)', 'Sbg. 2. LL Süd', 'sfv', '231810', 4),
    ('at-s-1-klasse-nord', '1. Klasse Nord (Salzburg)', 'Sbg. 1. Kl. Nord', 'sfv', '231813', 5),
    ('at-s-1-klasse-sued', '1. Klasse Süd (Salzburg)', 'Sbg. 1. Kl. Süd', 'sfv', '231815', 6),
    ('at-s-2-klasse-nord-a', '2. Klasse Nord A (Salzburg)', 'Sbg. 2. Kl. Nord A', 'sfv', '231811', 7),
    ('at-s-2-klasse-nord-b', '2. Klasse Nord B (Salzburg)', 'Sbg. 2. Kl. Nord B', 'sfv', '231806', 8),
    ('at-s-2-klasse-sued', '2. Klasse Süd (Salzburg)', 'Sbg. 2. Kl. Süd', 'sfv', '231814', 9),
    ('at-s-2-klasse-sued-west', '2. Klasse Süd/West (Salzburg)', 'Sbg. 2. Kl. Süd/West', 'sfv', '231819', 10),
    ('at-st-regionalliga-sued', 'Regionalliga Süd (Steiermark)', 'RL Süd Stmk.', 'stfv', '231530', 8),
    ('at-st-landesliga', 'Landesliga (Steiermark)', 'Stmk. LL', 'stfv', '231506', 9),
    ('at-st-unterliga-mitte', 'Unterliga Mitte (Steiermark)', 'Stmk. UL Mitte', 'stfv', '231511', 14),
    ('at-st-unterliga-west', 'Unterliga West (Steiermark)', 'Stmk. UL West', 'stfv', '231517', 15),
    ('at-st-unterliga-sued', 'Unterliga Süd (Steiermark)', 'Stmk. UL Süd', 'stfv', '231509', 16),
    ('at-st-unterliga-ost', 'Unterliga Ost (Steiermark)', 'Stmk. UL Ost', 'stfv', '231516', 17),
    ('at-st-unterliga-nord-a', 'Unterliga Nord A (Steiermark)', 'Stmk. UL Nord A', 'stfv', '231518', 18),
    ('at-st-unterliga-nord-b', 'Unterliga Nord B (Steiermark)', 'Stmk. UL Nord B', 'stfv', '231515', 19),
    ('at-st-1-klasse-mitte-a', '1. Klasse Mitte A (Steiermark)', 'Stmk. 1. Kl. Mitte A', 'stfv', '231499', 31),
    ('at-st-1-klasse-mitte-b', '1. Klasse Mitte B (Steiermark)', 'Stmk. 1. Kl. Mitte B', 'stfv', '231526', 32),
    ('at-st-1-klasse-west', '1. Klasse West (Steiermark)', 'Stmk. 1. Kl. West', 'stfv', '231507', 33),
    ('at-st-1-klasse-sued-ost-a', '1. Klasse Süd/Ost A (Steiermark)', 'Stmk. 1. Kl. Süd/Ost A', 'stfv', '231513', 34),
    ('at-st-1-klasse-sued-ost-b', '1. Klasse Süd/Ost B (Steiermark)', 'Stmk. 1. Kl. Süd/Ost B', 'stfv', '231525', 35),
    ('at-st-1-klasse-enns', '1. Klasse Enns (Steiermark)', 'Stmk. 1. Kl. Enns', 'stfv', '231510', 36),
    ('at-st-1-klasse-mur-muerz-a', '1. Klasse Mur/Mürz A (Steiermark)', 'Stmk. 1. Kl. Mur/Mürz A', 'stfv', '231505', 37),
    ('at-st-1-klasse-mur-muerz-b', '1. Klasse Mur/Mürz B (Steiermark)', 'Stmk. 1. Kl. Mur/Mürz B', 'stfv', '231514', 38),
    ('at-t-tiroler-liga', 'Tiroler Liga', 'Tiroler Liga', 'tfv', '231687', 1),
    ('at-t-1-landesliga-ost', '1. Landesliga Ost (Tirol)', 'Tirol 1. LL Ost', 'tfv', '231680', 2),
    ('at-t-1-landesliga-west', '1. Landesliga West (Tirol)', 'Tirol 1. LL West', 'tfv', '231689', 3),
    ('at-t-2-landesliga-ost', '2. Landesliga Ost (Tirol)', 'Tirol 2. LL Ost', 'tfv', '231683', 4),
    ('at-t-2-landesliga-west', '2. Landesliga West (Tirol)', 'Tirol 2. LL West', 'tfv', '231682', 5),
    ('at-t-1-gebietsliga-ost', '1. Gebietsliga Ost (Tirol)', 'Tirol 1. GL Ost', 'tfv', '231676', 6),
    ('at-t-1-gebietsliga-mitte-ost', '1. Gebietsliga Mitte-Ost (Tirol)', 'Tirol 1. GL Mitte-Ost', 'tfv', '231678', 7),
    ('at-t-1-gebietsliga-mitte-west', '1. Gebietsliga Mitte-West (Tirol)', 'Tirol 1. GL Mitte-West', 'tfv', '231693', 8),
    ('at-t-1-gebietsliga-west', '1. Gebietsliga West (Tirol)', 'Tirol 1. GL West', 'tfv', '231694', 9),
    ('at-t-2-gebietsliga-ost', '2. Gebietsliga Ost (Tirol)', 'Tirol 2. GL Ost', 'tfv', '231695', 10),
    ('at-t-2-gebietsliga-mitte-ost', '2. Gebietsliga Mitte-Ost (Tirol)', 'Tirol 2. GL Mitte-Ost', 'tfv', '231696', 11),
    ('at-t-2-gebietsliga-mitte-west', '2. Gebietsliga Mitte-West (Tirol)', 'Tirol 2. GL Mitte-West', 'tfv', '231697', 12),
    ('at-t-2-gebietsliga-west', '2. Gebietsliga West (Tirol)', 'Tirol 2. GL West', 'tfv', '231698', 13),
    ('at-v-eliteliga', 'Eliteliga Vorarlberg', 'Vbg. Eliteliga', 'vfv', '232055', 1),
    ('at-v-vorarlbergliga', 'Vorarlbergliga', 'Vorarlbergliga', 'vfv', '232052', 2),
    ('at-v-landesliga', 'Landesliga (Vorarlberg)', 'Vbg. LL', 'vfv', '232051', 3),
    ('at-v-1-landesklasse', '1. Landesklasse (Vorarlberg)', 'Vbg. 1. LK', 'vfv', '232046', 4),
    ('at-v-2-landesklasse', '2. Landesklasse (Vorarlberg)', 'Vbg. 2. LK', 'vfv', '232048', 5),
    ('at-v-3-landesklasse', '3. Landesklasse (Vorarlberg)', 'Vbg. 3. LK', 'vfv', '232056', 6),
    ('at-v-4-landesklasse', '4. Landesklasse (Vorarlberg)', 'Vbg. 4. LK', 'vfv', '232047', 7),
    ('at-v-5-landesklasse', '5. Landesklasse (Vorarlberg)', 'Vbg. 5. LK', 'vfv', '232049', 8),
    ('at-w-stadtliga', 'Wiener Stadtliga', 'Wiener Stadtliga', 'wfv', '231940', 1),
    ('at-w-2-landesliga', '2. Landesliga (Wien)', 'Wien 2. LL', 'wfv', '231867', 2),
    ('at-w-oberliga-a', 'Oberliga A (Wien)', 'Wien OL A', 'wfv', '231846', 3),
    ('at-w-oberliga-b', 'Oberliga B (Wien)', 'Wien OL B', 'wfv', '231885', 4),
    ('at-w-1-klasse-a', '1. Klasse A (Wien)', 'Wien 1. Kl. A', 'wfv', '231863', 5),
    ('at-w-1-klasse-b', '1. Klasse B (Wien)', 'Wien 1. Kl. B', 'wfv', '231880', 6),
    ('at-w-dsg-liga', 'DSG Liga (Wien)', 'Wien DSG Liga', 'wfv', '231852', 7),
    ('at-w-dsg-oberliga-a', 'DSG Oberliga A (Wien)', 'Wien DSG OL A', 'wfv', '231915', 8),
    ('at-w-dsg-oberliga-b', 'DSG Oberliga B (Wien)', 'Wien DSG OL B', 'wfv', '231934', 9),
    ('at-w-dsg-unterliga-a', 'DSG Unterliga A (Wien)', 'Wien DSG UL A', 'wfv', '231862', 10),
    ('at-w-dsg-unterliga-b', 'DSG Unterliga B (Wien)', 'Wien DSG UL B', 'wfv', '231884', 11),
    ('at-w-dsg-1-klasse-a', 'DSG 1. Klasse A (Wien)', 'Wien DSG 1. Kl. A', 'wfv', '231855', 12),
    ('at-w-dsg-1-klasse-b', 'DSG 1. Klasse B (Wien)', 'Wien DSG 1. Kl. B', 'wfv', '231900', 13),
    ('at-w-dsg-2-klasse', 'DSG 2. Klasse (Wien)', 'Wien DSG 2. Kl.', 'wfv', '231899', 14)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'AT'
on conflict (slug) do nothing;
