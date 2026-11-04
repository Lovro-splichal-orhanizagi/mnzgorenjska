-- Avstrija: rezervne, ženske in mladinske lige z vira ÖFB (oefb.at, vir
-- `oefb`) — 80 lig, vse NEAKTIVNE. Lige odraslih so v 20261009170000 in
-- 20261009230000; tam izpuščene skupine je lastnik odobril 4. 11. 2026.
--
-- - 43 rezervnih lig odraslih: Reserve (BFV, NÖFV, OÖFV, SFV, TFV), koroške
--   Challenge, štajerski IB ligi in OÖ 2. Klasse 1b. Rezervne ekipe nosijo ime
--   prve ekipe, zato si delita vrstico kluba (klubi so skupni, igralci so po
--   tekmovanjih).
-- - Wiener Stadtliga U23 (odrasli, brez mladinske oznake).
-- - 25 ženskih lig 11 na 11 (Frauen Bundesliga, Future League, 2. FBL in
--   deželne). Brez: Kärnten Kleinfeldliga (mali nogomet), Wiener Frauen
--   Landesliga in Frauen Vorarlbergliga (jesenski Grunddurchgang se konča
--   8. oz. 15. 11., spomladanska faza bo svoje tekmovanje z novo šifro).
-- - 11 mladinskih (U18, U17, U16, U15): šifra ima starostni del `u1x`, da jo
--   ujame `je_mladinski_slug` (PR #668 ga razširi z u19 na u14–u19).
--
-- Pregled 4. 11. 2026: vzorčni zapisniki (NÖ Gebietsliga West Reserve, NÖ
-- Frauen LL, Frauengruppe Mostviertel in Weinviertel) imajo 11 + 11
-- začetnikov, klop, strelce in menjave. Arhivi so v scripts/avstrija-lige.txt;
-- trije namesto lanske lige kažejo na drugo tekmovanje (Regionalliga Ost,
-- Regionalliga Mitte, Steirer-Cup) in so izpuščeni, OÖ 2. Klasse 1b lani ni
-- imela predhodnice (2. Klasse Nordost so bile večinoma prve ekipe).
--
-- Zimski premor: zadnji jesenski krog je med 30. 10. in 29. 11. 2026, nato
-- premor do marca — zato vpis brez vklopa in brez vrstice v
-- scripts/avstrija-vrsta.txt (vrsta bi ligo uvozila in vklopila).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'oefb', v.koda, 1, v.vrstni, 6, false,
       'ÖFB', 'https://www.oefb.at/bewerbe/Bewerb/' || v.koda || '/'
  from countries d
  cross join (values
    ('at-b-landesliga-reserve', 'Burgenlandliga Reserve', 'Burgenlandliga Res.', 'bfv', '232574', 101),
    ('at-b-2-klasse-nord-reserve', '2. Klasse Nord Reserve (Burgenland)', 'Bgld. 2. Kl. Nord Res.', 'bfv', '232557', 102),
    ('at-b-2-klasse-sued-a-reserve', '2. Klasse Süd A Reserve (Burgenland)', 'Bgld. 2. Kl. Süd A Res.', 'bfv', '232580', 103),
    ('at-b-2-klasse-sued-b-reserve', '2. Klasse Süd B Reserve (Burgenland)', 'Bgld. 2. Kl. Süd B Res.', 'bfv', '232581', 104),
    ('at-noe-gebietsliga-nord-nordwest-reserve', 'Gebietsliga Nord/Nordwest Reserve (NÖ)', 'NÖ GL Nord/Nordwest Res.', 'noefv', '232503', 101),
    ('at-noe-gebietsliga-nordwest-waldviertel-reserve', 'Gebietsliga Nordwest/Waldviertel Reserve (NÖ)', 'NÖ GL NW/Waldviertel Res.', 'noefv', '232505', 102),
    ('at-noe-gebietsliga-sued-suedost-reserve', 'Gebietsliga Süd/Südost Reserve (NÖ)', 'NÖ GL Süd/Südost Res.', 'noefv', '232542', 103),
    ('at-noe-gebietsliga-west-reserve', 'Gebietsliga West Reserve (NÖ)', 'NÖ GL West Res.', 'noefv', '232495', 104),
    ('at-noe-1-klasse-nord-reserve', '1. Klasse Nord Reserve (NÖ)', 'NÖ 1. Kl. Nord Res.', 'noefv', '232511', 105),
    ('at-noe-1-klasse-nordwest-reserve', '1. Klasse Nordwest Reserve (NÖ)', 'NÖ 1. Kl. Nordwest Res.', 'noefv', '232551', 106),
    ('at-noe-1-klasse-nordwest-mitte-reserve', '1. Klasse Nordwest-Mitte Reserve (NÖ)', 'NÖ 1. Kl. NW-Mitte Res.', 'noefv', '232517', 107),
    ('at-noe-1-klasse-ost-reserve', '1. Klasse Ost Reserve (NÖ)', 'NÖ 1. Kl. Ost Res.', 'noefv', '232570', 108),
    ('at-noe-1-klasse-sued-reserve', '1. Klasse Süd Reserve (NÖ)', 'NÖ 1. Kl. Süd Res.', 'noefv', '232543', 109),
    ('at-noe-1-klasse-waldviertel-reserve', '1. Klasse Waldviertel Reserve (NÖ)', 'NÖ 1. Kl. Waldviertel Res.', 'noefv', '232506', 110),
    ('at-noe-1-klasse-west-reserve', '1. Klasse West Reserve (NÖ)', 'NÖ 1. Kl. West Res.', 'noefv', '232562', 111),
    ('at-noe-1-klasse-west-mitte-reserve', '1. Klasse West/Mitte Reserve (NÖ)', 'NÖ 1. Kl. West/Mitte Res.', 'noefv', '232504', 112),
    ('at-ooe-bezirksliga-nord-reserve', 'Bezirksliga Nord Reserve (OÖ)', 'OÖ BL Nord Res.', 'ooefv', '232669', 101),
    ('at-ooe-bezirksliga-ost-reserve', 'Bezirksliga Ost Reserve (OÖ)', 'OÖ BL Ost Res.', 'ooefv', '232605', 102),
    ('at-ooe-bezirksliga-sued-reserve', 'Bezirksliga Süd Reserve (OÖ)', 'OÖ BL Süd Res.', 'ooefv', '232705', 103),
    ('at-ooe-bezirksliga-west-reserve', 'Bezirksliga West Reserve (OÖ)', 'OÖ BL West Res.', 'ooefv', '232706', 104),
    ('at-ooe-2-klasse-mitte-reserve', '2. Klasse Mitte Reserve (OÖ)', 'OÖ 2. Kl. Mitte Res.', 'ooefv', '232718', 105),
    ('at-ooe-2-klasse-mittewest-reserve', '2. Klasse Mittewest Reserve (OÖ)', 'OÖ 2. Kl. Mittewest Res.', 'ooefv', '232687', 106),
    ('at-ooe-2-klasse-nordmitte-reserve', '2. Klasse Nordmitte Reserve (OÖ)', 'OÖ 2. Kl. Nordmitte Res.', 'ooefv', '232717', 107),
    ('at-ooe-2-klasse-nordwest-reserve', '2. Klasse Nordwest Reserve (OÖ)', 'OÖ 2. Kl. Nordwest Res.', 'ooefv', '232685', 108),
    ('at-ooe-2-klasse-ost-reserve', '2. Klasse Ost Reserve (OÖ)', 'OÖ 2. Kl. Ost Res.', 'ooefv', '232684', 109),
    ('at-ooe-2-klasse-sued-reserve', '2. Klasse Süd Reserve (OÖ)', 'OÖ 2. Kl. Süd Res.', 'ooefv', '232716', 110),
    ('at-ooe-2-klasse-suedwest-reserve', '2. Klasse Südwest Reserve (OÖ)', 'OÖ 2. Kl. Südwest Res.', 'ooefv', '232686', 111),
    ('at-ooe-2-klasse-west-reserve', '2. Klasse West Reserve (OÖ)', 'OÖ 2. Kl. West Res.', 'ooefv', '232715', 112),
    ('at-ooe-2-klasse-westnord-reserve', '2. Klasse Westnord Reserve (OÖ)', 'OÖ 2. Kl. Westnord Res.', 'ooefv', '232714', 113),
    ('at-ooe-2-klasse-1b', '2. Klasse 1b (OÖ)', 'OÖ 2. Kl. 1b', 'ooefv', '231622', 114),
    ('at-s-1-landesliga-reserve', '1. Landesliga Reserve (Salzburg)', 'Sbg. 1. LL Res.', 'sfv', '232755', 101),
    ('at-s-2-landesliga-nord-reserve', '2. Landesliga Nord Reserve (Salzburg)', 'Sbg. 2. LL Nord Res.', 'sfv', '232756', 102),
    ('at-s-2-landesliga-sued-reserve', '2. Landesliga Süd Reserve (Salzburg)', 'Sbg. 2. LL Süd Res.', 'sfv', '232757', 103),
    ('at-s-1-klasse-nord-reserve', '1. Klasse Nord Reserve (Salzburg)', 'Sbg. 1. Kl. Nord Res.', 'sfv', '232758', 104),
    ('at-s-1-klasse-sued-reserve', '1. Klasse Süd Reserve (Salzburg)', 'Sbg. 1. Kl. Süd Res.', 'sfv', '232759', 105),
    ('at-t-reserve', 'Reserve (Tirol)', 'Tirol Reserve', 'tfv', '232615', 101),
    ('at-k-1-klasse-west-challenge', '1. Klasse West Challenge (Kärnten)', 'Kärnten 1. Kl. West Ch.', 'kfv', '232478', 101),
    ('at-k-1-klasse-mitte-challenge', '1. Klasse Mitte Challenge (Kärnten)', 'Kärnten 1. Kl. Mitte Ch.', 'kfv', '232479', 102),
    ('at-k-1-klasse-ost-challenge', '1. Klasse Ost Challenge (Kärnten)', 'Kärnten 1. Kl. Ost Ch.', 'kfv', '232480', 103),
    ('at-k-2-klasse-c-challenge', '2. Klasse C Challenge (Kärnten)', 'Kärnten 2. Kl. C Ch.', 'kfv', '232490', 104),
    ('at-k-challenge-villach', 'Challenge Region Villach (Kärnten)', 'Kärnten Ch. Villach', 'kfv', '232582', 105),
    ('at-st-ib-mittewest', 'IB MitteWest (Steiermark)', 'Stmk. IB MitteWest', 'stfv', '232230', 101),
    ('at-st-ib-glo', 'IB GLO (Steiermark)', 'Stmk. IB GLO', 'stfv', '232232', 102),
    ('at-w-stadtliga-u23', 'Wiener Stadtliga U23', 'Wien Stadtliga U23', 'wfv', '232585', 101),
    ('at-frauen-bundesliga', 'ADMIRAL Frauen Bundesliga', 'Frauen Bundesliga', 'oefb', '232361', 201),
    ('at-frauen-future-league', 'Frauen Future League', 'Future League', 'oefb', '232357', 202),
    ('at-2-frauen-bundesliga', '2. Frauen Bundesliga', '2. Frauen BL', 'oefb', '232359', 203),
    ('at-b-frauen-landesliga', 'Frauen-Landesliga (Burgenland)', 'Bgld. Frauen LL', 'bfv', '231970', 201),
    ('at-k-frauen-grossfeldliga', 'Frauen Großfeldliga (Kärnten)', 'Kärnten Frauen GFL', 'kfv', '231663', 201),
    ('at-noe-frauen-landesliga', 'Frauen Landesliga (NÖ)', 'NÖ Frauen LL', 'noefv', '231778', 201),
    ('at-noe-frauen-gl-industrieviertel', 'Frauen Gebietsliga Industrieviertel (NÖ)', 'NÖ Frauen GL Industrie.', 'noefv', '231766', 202),
    ('at-noe-frauen-gl-most-waldviertel', 'Frauen Gebietsliga Mostviertel/Waldviertel (NÖ)', 'NÖ Frauen GL Most/Wald.', 'noefv', '231758', 203),
    ('at-noe-frauen-gl-weinviertel', 'Frauen Gebietsliga Weinviertel (NÖ)', 'NÖ Frauen GL Weinviertel', 'noefv', '231780', 204),
    ('at-noe-frauen-1-klasse-industrieviertel', 'Frauen 1. Klasse Industrieviertel (NÖ)', 'NÖ Frauen 1. Kl. Industrie.', 'noefv', '231759', 205),
    ('at-noe-frauengruppe-mostviertel', 'Frauengruppe Mostviertel (NÖ)', 'NÖ Frauengr. Mostviertel', 'noefv', '231769', 206),
    ('at-noe-frauengruppe-weinviertel', 'Frauengruppe Weinviertel (NÖ)', 'NÖ Frauengr. Weinviertel', 'noefv', '231765', 207),
    ('at-ooe-frauen-ooe-liga', 'OÖ Liga Frauen', 'OÖ Liga Frauen', 'ooefv', '231601', 201),
    ('at-ooe-frauen-landesliga', 'Landesliga Frauen (OÖ)', 'OÖ Frauen LL', 'ooefv', '231615', 202),
    ('at-ooe-frauenklasse-nord-ost', 'Frauenklasse Nord/Ost (OÖ)', 'OÖ Frauenkl. Nord/Ost', 'ooefv', '231625', 203),
    ('at-ooe-frauenklasse-sued-west', 'Frauenklasse Süd/West (OÖ)', 'OÖ Frauenkl. Süd/West', 'ooefv', '231603', 204),
    ('at-s-frauenliga', 'Salzburger Frauenliga', 'Sbg. Frauenliga', 'sfv', '231817', 201),
    ('at-st-frauen-landesliga', 'Frauen Landesliga (Steiermark)', 'Stmk. Frauen LL', 'stfv', '231519', 201),
    ('at-st-frauen-oberliga-nord', 'Frauen Oberliga Nord (Steiermark)', 'Stmk. Frauen OL Nord', 'stfv', '231504', 202),
    ('at-st-frauen-oberliga-sued', 'Frauen Oberliga Süd (Steiermark)', 'Stmk. Frauen OL Süd', 'stfv', '231498', 203),
    ('at-st-frauen-unterliga', 'Frauen Unterliga (Steiermark)', 'Stmk. Frauen UL', 'stfv', '231574', 204),
    ('at-t-frauen-tirol-liga', 'Frauen Tirol Liga', 'Tirol Frauen Liga', 'tfv', '231688', 201),
    ('at-w-frauen-1-klasse', 'Frauen 1. Klasse (Wien)', 'Wien Frauen 1. Kl.', 'wfv', '231924', 201),
    ('at-w-frauen-2-klasse', 'Frauen 2. Klasse (Wien)', 'Wien Frauen 2. Kl.', 'wfv', '231914', 202),
    ('at-w-frauen-newcomer', 'Frauen Newcomer Liga (Wien)', 'Wien Frauen Newcomer', 'wfv', '231879', 203),
    ('at-oefb-jugendliga-u18', 'ÖFB Jugendliga U18', 'Jugendliga U18', 'oefb', '232400', 301),
    ('at-oefb-jugendregionalliga-u18', 'ÖFB Jugendregionalliga U18', 'Jugend-RL U18', 'oefb', '232407', 302),
    ('at-oefb-jugendliga-u16', 'ÖFB Jugendliga U16', 'Jugendliga U16', 'oefb', '232399', 303),
    ('at-oefb-jugendregionalliga-u16', 'ÖFB Jugendregionalliga U16', 'Jugend-RL U16', 'oefb', '232406', 304),
    ('at-oefb-jugendliga-u15', 'ÖFB Jugendliga U15', 'Jugendliga U15', 'oefb', '232398', 305),
    ('at-st-lk-u18', 'Leistungsklasse U18 (Steiermark)', 'Stmk. LK U18', 'stfv', '233369', 301),
    ('at-t-u16-tirol-liga', 'U16 Tirol Liga', 'Tirol U16 Liga', 'tfv', '232642', 301),
    ('at-w-wfv-liga-u18', 'WFV-Liga U18 (Wien)', 'Wien WFV-Liga U18', 'wfv', '231877', 301),
    ('at-w-a-liga-u18', 'A-Liga U18 (Wien)', 'Wien A-Liga U18', 'wfv', '231891', 302),
    ('at-w-b-liga-u18', 'B-Liga U18 (Wien)', 'Wien B-Liga U18', 'wfv', '231839', 303),
    ('at-w-wfv-liga-u17', 'WFV-Liga U17 (Wien)', 'Wien WFV-Liga U17', 'wfv', '231905', 304)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'AT'
on conflict (slug) do nothing;
