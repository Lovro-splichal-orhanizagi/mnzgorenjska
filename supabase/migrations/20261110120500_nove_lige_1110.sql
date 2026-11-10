-- Nove neaktivne lige z virov, ki jih že uvažamo (pregled 9. 11. 2026) — 152 lig.
--
-- Vsak vir je bil pregledan za sezono 2026/27: seznam tekmovanj, primerjava s
-- produkcijo (vse šifre, aktivne in neaktivne), nato za vsakega kandidata
-- razpored (≥ 8 klubov, tekme po 9. 11. ali objavljen spomladanski del) in
-- vsaj en odigran zapisnik s postavami (11 + 11, klop, goli = izid), prebran
-- z razčlenjevalnikom obstoječega vira. Vljudno: ≥ 2 s med zahtevki, nekaj
-- sto zahtevkov na vir. Edina ustavitev: eps (epsana.gr, HTTP 403) — eps v
-- tej migraciji nima novih lig.
--
-- Mladinske šifre nosijo starostni del (u15–u19), da jih `je_mladinski_slug`
-- (PR #668, migracija 20261104170100) prepozna. prvi_fantasy_krog in
-- rok_pomak_ur sledita prejšnjemu vpisu istega vira (AT, MT, RO, GR mladinske
-- 1/6 kot doslej; drugod mladinske 2/2, članske 6). Vklopna skripta
-- prvi_fantasy_krog ob vklopu postavi na prvi prihodnji krog.
--
-- Slovenija in Velika Britanija (lowland, isthmian, ncefl): nič novega.
-- Podrobnosti, izpuščene lige in razlogi: docs/viri/<država>.md.
--
-- Vse se vpišejo NEAKTIVNE (on conflict do nothing).

-- ====================================================================
-- Hrvaška: pionirske lige (U15) in pilotna liga ulaznih juniora (U18) z vira
-- HNS Semafor — 33 lig, vse NEAKTIVNE.
--
-- Pregled 9. 11. 2026: seznam tekmovanj vseh 40 zvez za 2026/27
-- (`/handlers/getCompetitions/`) je bil primerjan s produkcijo. Članske lige so
-- vse že vpisane (razen veteranskih, pokalov, futsala in kvalifikacij), juniorji
-- in kadeti tudi — ostajajo predvsem pioniri (stariji pioniri, U15). Za vsako
-- ligo je bila prebrana stran tekmovanja (klubi, odigrano, naslednji datum) in
-- en zadnji odigrani zapisnik (`vZapisnik` iz scripts/viri/hns.mjs): povsod
-- postavi 11 + 11 s šifro osebe, oba vratarja, klop, goli = izid (brez
-- opozoril), večinoma kartoni. ŽNS/ZNS lige večinoma ne vpisujejo menjav
-- (strelce s klopi doda `dodajStrelceSKlopi`); menjave imajo vse lige HNS in VŽ.
--
-- Šifra nosi `u15` (pilot U-18 `u19`, kot Rijeka U18), da jo `je_mladinski_slug`
-- (PR #668) prepozna kot mladinsko. `prvi_fantasy_krog` = krog za zadnjim krogom
-- z zapisniki (razpored 9. 11.), vklopna skripta ga ob vklopu popravi;
-- `rok_pomak_ur = 2` kot pri drugih mladinskih ligah.
--
-- Izpuščeno 9. 11.:
--  - jesen odigrana, ostajajo le zaostale tekme, pomladi še ni: BP stariji
--    pioniri (115924840), KC U-15 (115074979) in U-17 kadeti i juniori
--    (115075074), VP pioniri (115939385), ZD MŽNL pioniri A (116265214),
--    NG 2. ŽNL zapad PIO (114759017);
--  - jesen končana, nobene tekme po 9. 11.: Bjelovar kadeti in pioniri U-15,
--    VS kadeti A in B (tri istoimenska, dve brez tekem), Međimurje U-15 in U-19
--    (stran spet dela, a jesen odigrana), Virovitica juniori, KZŽ pioniri A/B,
--    Dubrovnik pioniri, Kutina in Našice pioniri, Osijek pioniri, SM liga
--    pionira B, ŠK 1. ŽNL pioniri, Baranja U-15;
--  - premalo klubov (< 8): Istok 2. NL st. pioniri B (7), Rijeka in Sjever
--    2. NL pioniri (7/7), Karlovac 2. ŽNL pioniri (5), SM pioniri Novska (5),
--    NSŽSD juniori (5), Dubrovnik juniori (4), Đakovo juniori in pioniri (5/5),
--    Požega ŽNK in U-15 (3–6), Lika kadeti (2) in pioniri (6), Baranja U-17 (4),
--    D. Miholjac pioniri (7), NSZŽ 2. liga pioniri B — druga dva istoimenska
--    (115467599, 114789353; 4 in 6 klubov, nič odigranega);
--  - ženske (Druga HNLŽ A/B, HNLŽM kadetkinje/pionirke, Prva HNLŽ kadetkinje
--    in pionirke, Međimurska liga žene): po docs/viri/hrvaska.md gredo ženske
--    lige prek strožje poti `hr-hnlz-v1`, ne prek običajnega `hns`;
--  - mlajši pioniri (U13) in mlajši, pokali, veterani, futsal (ŽMNL, ŽNML,
--    HMNL), Dubrovnik 1. ŽFL, Jastrebarsko ŽML, kvalifikacije.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hns', v.koda, v.prvi, v.vrstni, v.pomak, false,
       'HNS Semafor', 'https://semafor.hns.family/natjecanja/' || v.koda || '/x/'
  from countries d
  cross join (values
    -- državne (HNS)
    ('hr-u15-1hnl', 'Prva HNL pioniri', 'U15 HNL', 'hns', '114526359', 11, 160, 2),                         -- 14 klubov
    ('hr-u19-pilot-ulazni', 'Liga ulaznih juniora U-18 (pilot)', 'U18 pilot', 'hns', '114997450', 10, 161, 2), -- 8
    -- regijske (nogometna središta HNS)
    ('hr-u15-1nl-istok', '1. NL Središte Istok stariji pioniri', 'U15 Istok I.', 'hns', '114870965', 12, 162, 2),       -- 16
    ('hr-u15-2nl-istok-a', '2. NL Središte Istok stariji pioniri A', 'U15 Istok II. A', 'hns', '114875574', 11, 163, 2), -- 9
    ('hr-u15-1nl-rijeka', '1. NL NS Rijeka pioniri', 'U15 Rijeka', 'hns', '115057197', 11, 164, 2),                    -- 14
    ('hr-u15-1nl-sjever', 'Prva NL pioniri U15 Središte Sjever', 'U15 Sjever', 'hns', '115349915', 13, 165, 2),        -- 14
    ('hr-u15-1nl-split', '1. NL Split pioniri', 'U15 Split I.', 'hns', '114963083', 13, 166, 2),                       -- 18
    ('hr-u15-2nl-split', '2. NL Split pioniri', 'U15 Split II.', 'hns', '115780745', 11, 167, 2),                      -- 16
    ('hr-u15-1nl-centar', 'Prva NL Centar pioniri', 'U15 Centar I.', 'hns', '114979435', 13, 168, 2),                  -- 18
    ('hr-u15-2nl-centar', 'Druga NL Centar pioniri', 'U15 Centar II.', 'hns', '114983458', 12, 169, 2),                -- 16
    -- županijske in NS
    ('hr-zg-u15-1znl', '1. ZNL pioniri', 'ZG U15 I.', 'zns-zagreb', '114507643', 9, 170, 2),                 -- 12
    ('hr-zg-u15-1a-znl', '1. "A" ZNL pioniri', 'ZG U15 I. A', 'zns-zagreb', '114507649', 9, 171, 2),         -- 20
    ('hr-zg-u15-2znl', '2. ZNL pioniri', 'ZG U15 II.', 'zns-zagreb', '114507655', 9, 172, 2),                -- 12
    ('hr-zg-u15-3a-znl', '3. "A" ZNL pioniri', 'ZG U15 III. A', 'zns-zagreb', '114955931', 9, 173, 2),       -- 12
    ('hr-zg-u15-3znl', '3. ZNL pioniri', 'ZG U15 III.', 'zns-zagreb', '114954964', 9, 174, 2),               -- 10
    ('hr-bp-u15-mznl', 'MŽNL PŽ-SB stariji pioniri U-15', 'BP U15 MŽNL', 'zns-brod', '115417232', 11, 175, 2), -- 8
    ('hr-is-u15-jpli', 'JPLI pioniri', 'IS U15 JPLI', 'zns-istra', '115014787', 11, 176, 2),                 -- 13
    ('hr-is-u15-znli', 'ŽNLI pioniri', 'IS U15 ŽNLI', 'zns-istra', '115008754', 10, 177, 2),                 -- 12
    ('hr-ka-u15', '1. ŽNL NSKŽ pioniri', 'KA U15', 'zns-karlovac', '115475982', 10, 178, 2),                 -- 8
    ('hr-ri-u15-a', 'NS PGŽ U15-A', 'RI U15 A', 'zns-rijeka', '115228375', 8, 179, 2),                       -- 9
    ('hr-ri-u15-b', 'NS PGŽ U15-B', 'RI U15 B', 'zns-rijeka', '115228487', 9, 180, 2),                       -- 9
    ('hr-sm-u15', 'Stariji pioniri ŽNS SMŽ', 'SM U15', 'zns-sisak', '115021552', 11, 181, 2),                -- 10
    ('hr-st-u15-1liga', '1. liga pionira NSŽSD', 'ST U15 I.', 'zns-split', '117167551', 8, 182, 2),          -- 14
    ('hr-st-u15-2liga', '2. liga pionira NSŽSD', 'ST U15 II.', 'zns-split', '117172327', 8, 183, 2),         -- 8
    ('hr-st-u15-liga-ii', 'Liga pionira II NSŽSD', 'ST U15 Liga II', 'zns-split', '117180868', 7, 184, 2),   -- 10
    ('hr-vz-u15', 'NC pioniri U-15 Varaždin', 'VZ U15', 'zns-varazdin', '114798184', 11, 185, 2),            -- 12
    ('hr-vs-u15-a', 'Liga mladeži ŽNS-VS pioniri A', 'VS U15 A', 'zns-vukovar', '114883708', 12, 186, 2),    -- 13
    ('hr-vs-u15-b', 'Liga mladeži ŽNS-VS pioniri B', 'VS U15 B', 'zns-vukovar', '114884704', 11, 187, 2),    -- 12
    ('hr-zd-u15-b', 'MŽNL pioniri B Zadar-Šibenik', 'ZD U15 B', 'zns-zadar', '116265368', 10, 188, 2),       -- 11
    ('hr-zz-u15-1liga', '1. liga pioniri NSZŽ', 'ZŽ U15 I.', 'zns-zagrebacka', '114787202', 13, 189, 2),     -- 14
    ('hr-zz-u15-2liga-a', '2. liga pioniri A NSZŽ', 'ZŽ U15 II. A', 'zns-zagrebacka', '114788141', 10, 190, 2), -- 10
    ('hr-zz-u15-2liga-b', '2. liga pioniri B NSZŽ', 'ZŽ U15 II. B', 'zns-zagrebacka', '115605875', 9, 191, 2),  -- 8
    ('hr-zz-u15-3liga', '3. liga pioniri NSZŽ', 'ZŽ U15 III.', 'zns-zagrebacka', '114791108', 9, 192, 2)       -- 10
  ) as v(slug, ime, kratko, zveza, koda, prvi, vrstni, pomak)
  join federations f on f.code = v.zveza
 where d.code = 'HR'
on conflict (slug) do nothing;

-- ====================================================================
-- Slovaška (vir `sportnet`): starší žiaci U15 v regijah in okresih ter
-- okresni U19 Liptov — 18 lig, NEAKTIVNIH.
--
-- Pometanje 9. 11. 2026: seznam tekmovanj sezone 2026/2027 vseh 44 appSpace-ov
-- (SFZ, ÚLK, BFZ, ZsFZ, SsFZ, VsFZ, MFZ Košice in vsi okresi), razpored vsake
-- kandidatke in en odigran zapisnik na ligo (/api/v2/matches/<id>). Vpisane so
-- le lige z vsaj osmimi aktivnimi klubi (odstopljene ekipe ne štejejo), s
-- tekmami po 9. 11. 2026 (jesen ali že razpisana pomlad) in z zapisnikom, ki
-- loči začetnih 11 od klopi (11 + rezerve, ISSF, pozicija, goli/menjave).
-- Šifra `<appSpace>/<tekmovanje>[/<del>]` kot pri ostalih slovaških ligah;
-- del le, kadar ima tekmovanje več skupin.
--
-- Izpuščeno, ker zapisnik nima delitve 11 + klop (vsi igralci, 12–20, so
-- vpisani kot začetni, menjav ni — "hokejové striedanie"): BFZ WU15, SFZ
-- I. LŽ WU15 Západ/Východ in II. LŽ WU15, SsFZ III. WU15, VsFZ III. U15 A–D,
-- ObFZ BB U15, Trnava U15 A/B, Trenčín U15 Sever/Juh, Liptov U15, Michalovce
-- IV. U15, Nitra U15 A/B, Považská Bystrica U15 Sever/Juh, Prievidza IV. in
-- V. U15, Topoľčany U15, Žiar n. H. U15, Žilina I. in II. A/B starší žiaci,
-- Orava U15, Spiš U15, Galanta U15.
-- Izpuščeno, premalo klubov (< 8): BFZ WU19 (2 aktivna), SsFZ WU19 (5),
-- VsFZ WU15 (6), Košice-okolie U15 (6), Nové Zámky U15 A/B (6), Prešov 5.B
-- (6), Bardejov, Humenné 4./5., Kysuce, Lučenec, Rimavská Sobota, Rožňava
-- U15, Zvolen U15, Svidník A/B; U19 Michalovce, Rožňava, Trebišov (4–5);
-- Prievidza IX. A (5 članskih).
-- Izpuščeno, jesen končana in pomlad ni razpisana: ZsFZ III. U15 skupina B,
-- Senica U15 A/B (ena prestavljena tekma). Brez tekem: ObFZ BB U17, DS U17,
-- Prešov 6. žiaci, Michalovce V. U15, Vranov U19 B, Zvolen U19, ZsFZ WU15,
-- VsFZ "Krajská futbalová liga". Malý formát: Košice-okolie MINI U15/U19,
-- Poprad U19 8+1. U14 in mlajši, pokali, turnirji.
--
-- Mladinske: prvi_fantasy_krog = 2, rok_pomak_ur = 2; slug nosi `u15`/`u19`
-- kot svoj del (pravilo mladinskih lig).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'sportnet', v.koda, 2, v.vrstni, 2, false,
       'futbalnet.sk', 'https://sportnet.sme.sk/futbalnet/z/' || v.zveza || '/'
  from countries d
  cross join (values
    ('sk-ssfz-u15-3liga', 'III. liga U15 — SsFZ', 'SsFZ U15 III.', 'ssfz', 'SsFZ/6a19569a44ff24612e6f6c1c', 55),                                                          -- 14, naslednja 20. 3. 2027
    ('sk-zsfz-u15-3liga-jv', 'III. liga U15 Juhovýchod — ZsFZ', 'ZsFZ U15 III. JV', 'zsfz', 'ZsFZ/6a0ff4565736165c0e44d975/6a0ff4563bff416b52e1d038', 52),            -- 15, 14. 11.
    ('sk-zsfz-u15-3liga-sz', 'III. liga U15 Severozápad — ZsFZ', 'ZsFZ U15 III. SZ', 'zsfz', 'ZsFZ/6a0ff4565736165c0e44d975/6a0ff4563bff416b52e1d039', 53),           -- 16, 14. 11.
    ('sk-ba-u15-3liga', '3. liga starší žiaci U15 — Bratislava-mesto', 'BA U15 3.', 'obfz-bratislava-mesto', 'BA-mesto/6a211daa233cdeb1e7d2a72d', 51),                 -- 16, 14. 11.
    ('sk-ba-u15-4liga-a', '4. liga starší žiaci U15 A — Bratislava-mesto', 'BA U15 4. A', 'obfz-bratislava-mesto', 'BA-mesto/6a211e0e233cdeb1e7d33c47/6a38d5020b755716bcd9bea2', 52), -- 9 (Čataj odstopil), 14. 11.
    ('sk-ba-u15-4liga-b', '4. liga starší žiaci U15 B — Bratislava-mesto', 'BA U15 4. B', 'obfz-bratislava-mesto', 'BA-mesto/6a211e0e233cdeb1e7d33c47/6a211eaa8d3969cef869ccbf', 53), -- 10, 14. 11.
    ('sk-bav-u15', 'Starší žiaci U15 — Bratislava-vidiek', 'BAV U15', 'obfz-bratislava-vidiek', 'BA-vidiek/6a31b21ae5a4847e62f8a82f', 51),                             -- 16, 14. 11.
    ('sk-ds-u15', 'IV. liga U15 — Dunajská Streda', 'DS U15', 'obfz-dunajska-streda', 'obfz-dunajska-streda/6a27b57c225470a9bef7123f', 51),                            -- 9 (Veľká Paka odstopila), 12. 3. 2027
    ('sk-kn-u15', 'IV. liga žiaci U15 — Komárno', 'KN U15', 'obfz-komarno', 'obfz-komarno.futbalnet.sk/6a295a7d225470a9be6f9cbb', 51),                                 -- 8, 20. 3. 2027
    ('sk-lv-u15', 'IV. liga žiaci U15 — Levice', 'LV U15', 'obfz-levice', 'obfz-levice.futbalnet.sk/6a26a341233cdeb1e73829b7', 51),                                    -- 15 (Čajkov odstopil), 14. 11.
    ('sk-tfz-u15', 'Starší žiaci U15 — Turiec', 'TFZ U15', 'turciansky-futbalovy-zvaz', 'TFZ/6a3d0865e5a4847e62b67338', 51),                                           -- 13 (Vrútky B odstopila), 20. 3. 2027
    ('sk-lm-u19', '6. liga dorast U19 — Liptov', 'LM U19', 'lfz-liptovsky-mikulas', 'lfz-liptovsky-mikulas.futbalnet.sk/6a392624e5a4847e623fe0ee', 21),               -- 14, 20. 3. 2027
    ('sk-pp-u15', '4. liga žiaci U15 — Podtatranský FZ', 'PP U15', 'podtatransky-futbalovy-zvaz', 'ObFZ-Poprad/6a27ccf2225470a9be19d49f', 51),                         -- 9, 10. 4. 2027
    ('sk-po-u15-4liga', '4. liga žiaci U15 — Prešov', 'PO U15 4.', 'obfz-presov', 'ObFZ-Presov/6a22a7e7233cdeb1e72abd20', 51),                                         -- 14, 14. 11.
    ('sk-po-u15-5liga-a', '5. liga žiaci U15 A — Prešov', 'PO U15 5. A', 'obfz-presov', 'ObFZ-Presov/6a22a815233cdeb1e72afe1d/6a22a82307041eda4046baaa', 52),         -- 8, 3. 4. 2027
    ('sk-tv-u15', '4. liga U15 — Trebišov', 'TV U15', 'obfz-trebisov', 'obfz-trebisov.futbalnet.sk/6a2e4e76e4bf121524098fe4', 51),                                     -- 9, 3. 4. 2027
    ('sk-vk-u15', '4. liga žiaci U15 — Veľký Krtíš', 'VK U15', 'obfz-velky-krtis', 'obfz-velky-krtis.futbalnet.sk/6a27ba6e225470a9befe776d', 51),                       -- 8, 17. 4. 2027
    ('sk-vt-u15-a', 'IV. liga starší žiaci U15 A — Vranov nad Topľou', 'VT U15 A', 'obfz-vranov-nad-toplou', 'obfz-vranov-nad-toplou.futbalnet.sk/6a1e8e5e44ff24612e881c37', 51) -- 10, 17. 4. 2027
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'SK'
on conflict (slug) do nothing;

-- ====================================================================
-- Madžarska (vir mlsz, MLSZ Adatbank), 9. 11. 2026: pregled vseh tekmovanj
-- sezone 2026/27 (évad 67) pri MLSZ in vseh 20 županijah
-- (getHeaderFilderData, 21 zahtevkov). Novih spomladanskih versenyjev
-- (felsőház/alsóház, tavaszi szakasz) adatbank še ne objavlja; edina nova
-- liga, ki ustreza pogojem, je Pest U21.
--
-- Pest U21 (`67/14/34247`, "U21-es bajnokság"): četrti val jo je izpustil
-- kot jesensko fazo (14 krogov, zadnji 18. 11.), a gre za celo dvokrožno
-- sezono 8 klubov v enem versenyju — krogi 11–14 imajo v razporedu le
-- nadomestni datum 30. 6. 2027 (spomladanski del še ni razporejen). 10. krog
-- 18. 11. 2026. Zapisnik 1. kroga (2225596, Halásztelki FC–Tahitótfalui SE
-- 1:4) se razčleni: 11 + 11, klop 3 + 1, 5 golov = izid, 4 rumeni,
-- 4 menjave, vsi nastopi s šifro. U21 je spremljevalna liga odraslih (brez
-- starostnega dela v slugu), 2 in 2 kot ostale U21 (migracija 20261104171100).
-- Arhiv (évad 65) še ni izbran.
--
-- Izpuščeno (preverjeno 9. 11. 2026 na strani 1. kroga):
-- - jesenske faze, enokrožne, konec jeseni, pomladi bo nov verseny:
--   Országos U15–U17 Kiemelt/Alap in Regionális U15–U17 Kiemelt (12; npr.
--   U17 Kiemelt 12 klubov, 11 krogov do 12. 12.), Pest U15–U17 (13; 9 krogov
--   do 15. 11.), Bács-Kiskun U16 Dél/Észak (11 krogov do 14. 11.), Fejér U16
--   in U15 A–F (do 12. 11.), Győr U16 (3 skupine, do 28. 11.), Győr II. U21
--   (4 skupine, do 15. 11.), Győr III. Nyugat A Tartalék (8 klubov, 14 krogov
--   do 15. 11.);
-- - Győr III. Kelet Tartalék (6 klubov), Bács-Kiskun U15 leány (7 klubov),
--   KEM leány U19 (4 klubi);
-- - SZSZB leány U19 (`67/16/34571`, 9 klubov, 18 krogov, pomlad z
--   nadomestnim datumom 31. 12.): igra 8 + 8 (zapisnik 2248673), malo igrišče;
-- - županijske ženske/dekliške lige na malem igrišču (Csongrád, Fejér,
--   Somogy, Pest ¾, Veszprém, Heves, KEM ½), U14 in mlajši, öregfiúk/old
--   boys/veterán, mestne amaterske lige (Csongrád Finish/Szkíta/ATS/IHS/KÉSZ/
--   GNX, Fejér Alba Liga, DLSZ), Neumann Football Liga, zimski/turnirski
--   (Téli Műfüves, Vas Műfüves), pokali.
-- NEAKTIVNA; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mlsz', v.koda, v.prvi, v.vrstni, v.rok, false,
       'MLSZ Adatbank', 'https://adatbank.mlsz.hu/league/' || v.koda || '/1.html'
  from countries d
  cross join (values
    ('hu-pe-u21', 'Pest vármegyei U21', 'Pest U21', 'mlsz-pe', '67/14/34247', 41, 2, 2) -- 8 klubov, 14 krogov
  ) as v(slug, ime, kratko, zveza, koda, vrstni, prvi, rok)
  join federations f on f.code = v.zveza
 where d.code = 'HU'
on conflict (slug) do nothing;

-- ====================================================================
-- Srbija: druge kadetske lige (U17) Vojvodine Sever in Jug ter FSRZS
-- "Kolubarsko-mačvanska", Pionirska liga Vojvodine (U15) in tri pionirske
-- lige Beograda (U15). Sedem lig, dva vira, vse NEAKTIVNE, brez arhiva.
--
-- Preverjeno 9. 11. 2026 (brez pisanja v bazo, 2–3 s med zahtevki, brez
-- izziva):
-- - `fssid`: meje blokov je našel `scripts/srbija-blok.mjs` (zadnja šifra
--   obstaja, naslednja "Utakmica ne postoji", N×(N−1) šifer). Kategorijo
--   blokov določa par z omladinsko ligo iste zveze (docs/viri/srbija.md,
--   "Pasti pri prepoznavanju"). Po en odigran zapisnik iz zadnjih krogov z
--   11 + klop, goli = izid, menjave z minutami; jesenski del še teče (prvi
--   krog po zadnjem odigranem je neodigran, jesen ima N/2 ali (N+1)/2 krogov).
--   Sever 76059127 (11. krog, 1. 11.), Jug 76060113 (11. krog, 31. 10.),
--   Kolubarsko-mačvanska 75918941 (12. krog, 24. 10.; 15 klubov, liho, 30
--   krogov po 7 tekem), Pionirska Vojvodine 76003943 (11. krog, 31. 10.).
--   Datumi neodigranih krogov so ocenjeni (fss.rs jih nima) — pred vklopom
--   preveri `datum_ocenjen`.
-- - `fsb`: strani lig z `tekmeStrani` in po en zapisnik ("Mesto:" za trke
--   imen): Prva liga pionira (76492184, 7. 11.; 13 krogov jeseni, naslednji
--   11.–21. 11.), Druga (76494291 BSK = Borča, 76494287 RADNIČKI = Obrenovac,
--   članska kluba brez kraja; naslednji 12.–21. 11.), Treća grupa B (76498430,
--   SOPOT = Sopot; 11. krog 14. 11.). Pioniri so U15 po kategorijah FSS
--   (mlađi pioniri U14, petlići U13 so posebna tekmovanja); letnice strani ne
--   pišejo.
--
-- Izpuščeni: Druga kadetska FSRZS "Zapadno-moravska" (75932006-75932137, 12
-- klubov) in "Podunavsko-šumadijska" (75915926-75916057, 12) ter Druga
-- pionirska Vojvodine Sever (76061069-76061200, 12) — jesen (11 krogov) je
-- končana, 12. krog ni odigran in pomladni datumi niso znani. Treća liga
-- pionira Beograda grupa A — OMLADINAC je iz Velikega Polja (zapisnik
-- 76496809), potrebuje vrstico v `IME_V_LIGI` (fsb.mjs). Grupa V — ostala je
-- le ena preložena tekma (11. 11.), jesen končana. Lige mlađih kadeta (U16,
-- štiri skupine) — enokrožne, B/G/V končane, A konča 14. 11. Razvojna liga
-- FSS U-15 na teritoriji FSB in Druga liga za žene FSB — stran nima sezone v
-- naslovu, `fsb` je ne prebere. fss.rs nima novih tekmovanj. Mlađi pioniri,
-- petlići, veterani, futsal in kup niso vpisani.
--
-- Mladinske: prvi_fantasy_krog = 2, rok_pomak_ur = 2.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, v.vir, v.koda, v.prvi, v.vrstni, v.pomak, false,
       case v.vir when 'fsb' then 'FS Beograda' else 'FSS' end,
       case v.vir
         when 'fsb' then 'https://www.fsb.org.rs/takmicenje/' || v.koda || '/'
         else 'https://fss.rs/'
       end
  from countries d
  cross join (values
    ('rs-u17-vojvodina-sever', 'Druga kadetska liga Vojvodine "Sever"', 'U17 Sever', 'fssid', '76059057-76059238', 'fsv', 2, 2, 32),    -- FSV, 14 klubov
    ('rs-u17-vojvodina-jug', 'Druga kadetska liga Vojvodine "Jug"', 'U17 Jug', 'fssid', '76060043-76060224', 'fsv', 2, 2, 33),          -- FSV, 14
    ('rs-u17-zapad-km', 'Druga kadetska liga "Kolubarsko-mačvanska"', 'U17 Zapad KM', 'fssid', '75918864-75919073', 'fsrzs', 2, 2, 34), -- FSRZS, 15 (lih)
    ('rs-u15-vojvodina', 'Pionirska liga Vojvodine', 'PLV U15', 'fssid', '76003873-76004054', 'fsv', 2, 2, 41),                         -- FSV, 14
    ('rs-u15-bg-1', 'Prva liga pionira Beograda', 'U15 BG 1.', 'fsb', 'prva-liga-pionira-beograda-2026-27', 'fsb', 2, 2, 41),           -- 14
    ('rs-u15-bg-2', 'Druga liga pionira Beograda', 'U15 BG 2.', 'fsb', 'druga-liga-pionira-beograda-2026-27', 'fsb', 2, 2, 42),         -- 14
    ('rs-u15-bg-3b', 'Treća liga pionira Beograda grupa B', 'U15 BG 3.B', 'fsb', 'treca-liga-pionira-beograda-grupa-b-2026-27', 'fsb', 2, 2, 43) -- 12
  ) as v(slug, ime, kratko, vir, koda, zveza, prvi, pomak, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'RS'
on conflict (slug) do nothing;

-- ====================================================================
-- Bosna in Hercegovina: Premijer omladinska liga BiH U-15 in Premijer ženska
-- liga BiH - Kadetkinje (U17) z nfsbih.ba (vir `nfsbih`, šifra
-- `<slug>/<id tekmovanja COMET>`; kadetkinje pod /takmicenja/nogomet-zene/,
-- zato z razdelkom spredaj kot ba-zene-premijer). Obe NEAKTIVNI, brez arhiva.
--
-- Preverjeno 9. 11. 2026 (stran razporeda z adapterjevim `tekmeLige` in en
-- zapisnik z `vZapisnik`, 3 s med zahtevki, brez izziva):
-- - U-15 (54160611): 10 klubov (mladinske ekipe klubov WWIN lige), sezona
--   26/27, objavljenih 14 krogov (63 od 64 tekem odigranih, zadnji 7.–9. 11.);
--   nadaljnje kroge zveza objavlja sproti (kot WWIN liga). Zapisnik 54165635
--   (Borac : Željezničar 0:1, 7. 11.): 11 + 7 na ekipo, vratar (GK), gol,
--   7 menjav z minutami, 4 rumeni.
-- - Kadetkinje (54337513): 11 klubov, objavljenih 10 krogov, vseh 45 tekem
--   odigranih (zadnji 7.–8. 11.); 11. krog in pomlad še nista objavljena.
--   Zapisnik 54337797 (Željezničar 2011 : Leotar 1:7, 8. 11.): 11 + 3, GK,
--   8 golov, 4 menjave (ena napaka vira: vstop brez izstopa).
-- nsfbih.ba nima novih tekmovanj (vse lige s seznama so že vpisane; pionirjev
-- in druge ženske lige tam ni). Republika Srpska (fsrs.org) ni vpisana.
--
-- Mladinske: prvi_fantasy_krog = 2, rok_pomak_ur = 2.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'nfsbih', v.koda, v.prvi, v.vrstni, v.pomak, false,
       'NFSBiH', 'https://www.nfsbih.ba/takmicenja/'
         || case when v.koda like 'nogomet-zene/%' then 'nogomet-zene/' || split_part(v.koda, '/', 2)
                 else 'nogomet-muskarci/' || split_part(v.koda, '/', 1) end || '/'
  from countries d
  join federations f on f.code = 'nfsbih'
  cross join (values
    ('ba-u15-premijer', 'Premijer omladinska liga BiH U-15', 'POL U15', 'premijer-omladinska-liga-bih-u-15/54160611', 4, 2, 2),                -- 10 klubov
    ('ba-zene-u17-kadetkinje', 'Premijer ženska liga BiH - Kadetkinje', 'Kadetkinje PL', 'nogomet-zene/premijer-liga-bih-kadetkinje/54337513', 5, 2, 2) -- 11
  ) as v(slug, ime, kratko, koda, vrstni, prvi, pomak)
 where d.code = 'BA'
on conflict (slug) do nothing;

-- ====================================================================
-- Avstrija: še 70 lig z vira ÖFB (oefb.at, vir `oefb`), vse NEAKTIVNE.
-- Nadaljevanje 20261104172100 (rezervne, ženske, mladinske).
--
-- - 38 rezervnih lig odraslih: Burgenland II. Liga in 1. Klasse Reserve (6),
--   NÖ 2. Landesliga in 2. Klasse Reserve (17), OÖ 1. Klasse Reserve (8),
--   Dunaj Oberliga/1. Klasse Reserve (4), DSG Reserve A/B (2), Wiener
--   2. Landesliga U23 (odrasli, brez mladinske oznake).
-- - 2 ženski (Tirol): Frauen Landesliga in Frauen Reserve Liga.
-- - 30 mladinskih (U15–U17/U18, slug ima `u1x` za `je_mladinski_slug`):
--   Burgenland U15 Nord, Koroška Unter 17+4 (Eliteliga, A, B) in U15
--   Eliteliga, NÖ JHG U16/U15 (celoletne skupine), Salzburg U17 1.
--   Sparkassenliga, Štajerska Gebiet Graz U18, Mur-Mürz U15, oberes
--   Murtal-Enns U15, Tirol U15 Liga in U16/U15 Landesliga, Dunaj A/B/C/WFV-Liga
--   U17/U16/U15. Vrednosti prvi_fantasy_krog=1, rok_pomak_ur=6 kot v
--   20261104172100 (avstrijski precedens tudi za mladinske).
--
-- Pregled 9. 11. 2026: seznam skupin vseh devetih deželnih zvez (`gruppen`,
-- jahr=2027) in tekmovanj skupin (`bewerbe`, z datumi krogov), razpored vsake
-- lige (število klubov, naslednja tekma), in en zapisnik na družino lig —
-- vseh 22 vzorcev ima 11 + 11 začetnikov (en 10), klop, šifre igralcev,
-- strelce in menjave (BFV/NÖ/OÖ/Dunaj/DSG rezerve, Wien U23, Tirol ženske in
-- ženske rezerve, Tirol U15/U16, Dunaj U17/U15/U16 B-Teams, KFV U17+4/U15,
-- NÖ JHG U16, SFV U17, Stmk. Graz U18, Mur-Mürz U15, Murtal-Enns U15, BFV U15).
-- Vse imajo kroge po 9. 11. 2026 ali že razpisano pomlad (marec–april 2027).
--
-- Izpuščeno: lige z manj kot 8 klubi (DSG Frauen/Mädchen 6, Wien C-Liga U16 A
-- 7, BFV H-U16 Nord 7 in Süd 5, BFV U15-U16 Mädchen 7, Stmk. Mur-Mürz U16 5,
-- Enns U16 6, Mädchenliga U16 A 7); jesenske mladinske skupine (zadnji krog
-- do 20. 11., pomlad bo novo tekmovanje: NÖ Nachwuchslandesliga in JHG
-- OPO/MPO/UPO, OÖ Nachwuchsliga/Regionsliga/Gruppenliga, SFV U17/U15 2. lige
-- in U15 skupine, Stmk. LK U16/U15 in Gebiet U16/U15, KFV U15 A–F, Tirol U18
-- skupine in FLEX, Vorarlberg U18/U16/U15, BFV U15 Mitte/Süd); Wiener Frauen
-- Landesliga in Frauen Vorarlbergliga (Grunddurchgang, pomlad bo nova
-- šifra); Kärnten Frauen Kleinfeldliga (mali nogomet); pokali, Senioren,
-- Legenden, Hallen, Futsal, U14 in mlajše. Nižjih lig odraslih, ki jih še ne
-- bi imeli, ni (vse skupine prvih ekip so že vpisane).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'oefb', v.koda, 1, v.vrstni, 6, false,
       'ÖFB', 'https://www.oefb.at/bewerbe/Bewerb/' || v.koda || '/'
  from countries d
  cross join (values
    ('at-b-ii-liga-nord-reserve', 'II. Liga Nord Reserve (Burgenland)', 'Bgld. II. Liga Nord Res.', 'bfv', '232554', 105), -- 14 klubov, naslednja tekma 2027-03-13
    ('at-b-ii-liga-mitte-reserve', 'II. Liga Mitte Reserve (Burgenland)', 'Bgld. II. Liga Mitte Res.', 'bfv', '232567', 106), -- 17 klubov, naslednja tekma 2026-11-13
    ('at-b-ii-liga-sued-reserve', 'II. Liga Süd Reserve (Burgenland)', 'Bgld. II. Liga Süd Res.', 'bfv', '232579', 107), -- 16 klubov, naslednja tekma 2026-11-13
    ('at-b-1-klasse-nord-reserve', '1. Klasse Nord Reserve (Burgenland)', 'Bgld. 1. Kl. Nord Res.', 'bfv', '232556', 108), -- 13 klubov, naslednja tekma 2026-11-14
    ('at-b-1-klasse-mitte-reserve', '1. Klasse Mitte Reserve (Burgenland)', 'Bgld. 1. Kl. Mitte Res.', 'bfv', '232569', 109), -- 15 klubov, naslednja tekma 2026-11-13
    ('at-b-1-klasse-sued-reserve', '1. Klasse Süd Reserve (Burgenland)', 'Bgld. 1. Kl. Süd Res.', 'bfv', '232578', 110), -- 16 klubov, naslednja tekma 2026-11-14
    ('at-noe-2-landesliga-ost-reserve', '2. Landesliga Ost Reserve (NÖ)', 'NÖ 2. LL Ost Res.', 'noefv', '232552', 113), -- 16 klubov, naslednja tekma 2026-11-13
    ('at-noe-2-landesliga-west-reserve', '2. Landesliga West Reserve (NÖ)', 'NÖ 2. LL West Res.', 'noefv', '232488', 114), -- 16 klubov, naslednja tekma 2026-11-13
    ('at-noe-2-klasse-marchfeld-reserve', '2. Klasse Marchfeld Reserve (NÖ)', 'NÖ 2. Kl. Marchfeld Res.', 'noefv', '232512', 115), -- 13 klubov, naslednja tekma 2026-11-15
    ('at-noe-2-klasse-mostviertel-reserve', '2. Klasse Mostviertel Reserve (NÖ)', 'NÖ 2. Kl. Mostviertel Res.', 'noefv', '232564', 116), -- 11 klubov, naslednja tekma 2027-03-21
    ('at-noe-2-klasse-ost-reserve', '2. Klasse Ost Reserve (NÖ)', 'NÖ 2. Kl. Ost Res.', 'noefv', '232608', 117), -- 11 klubov, naslednja tekma 2027-04-04
    ('at-noe-2-klasse-ost-mitte-reserve', '2. Klasse Ost/Mitte Reserve (NÖ)', 'NÖ 2. Kl. Ost/Mitte Res.', 'noefv', '232587', 118), -- 11 klubov, naslednja tekma 2027-04-04
    ('at-noe-2-klasse-pulkau-schmidatal-reserve', '2. Klasse Pulkau-/Schmidatal Reserve (NÖ)', 'NÖ 2. Kl. Pulkau/Schmidat. Res.', 'noefv', '232566', 119), -- 14 klubov, naslednja tekma 2027-03-21
    ('at-noe-2-klasse-steinfeld-reserve', '2. Klasse Steinfeld Reserve (NÖ)', 'NÖ 2. Kl. Steinfeld Res.', 'noefv', '232547', 120), -- 12 klubov, naslednja tekma 2027-04-04
    ('at-noe-2-klasse-thayatal-reserve', '2. Klasse Thayatal Reserve (NÖ)', 'NÖ 2. Kl. Thayatal Res.', 'noefv', '232507', 121), -- 14 klubov, naslednja tekma 2027-03-21
    ('at-noe-2-klasse-traisental-reserve', '2. Klasse Traisental Reserve (NÖ)', 'NÖ 2. Kl. Traisental Res.', 'noefv', '232508', 122), -- 14 klubov, naslednja tekma 2026-11-14
    ('at-noe-2-klasse-triestingtal-reserve', '2. Klasse Triestingtal Reserve (NÖ)', 'NÖ 2. Kl. Triestingtal Res.', 'noefv', '232550', 123), -- 10 klubov, naslednja tekma 2027-04-04
    ('at-noe-2-klasse-wachau-donau-reserve', '2. Klasse Wachau/Donau Reserve (NÖ)', 'NÖ 2. Kl. Wachau/Donau Res.', 'noefv', '232549', 124), -- 12 klubov, naslednja tekma 2027-04-04
    ('at-noe-2-klasse-waldviertel-sued-reserve', '2. Klasse Waldviertel Süd Reserve (NÖ)', 'NÖ 2. Kl. Waldv. Süd Res.', 'noefv', '232555', 125), -- 13 klubov, naslednja tekma 2026-11-14
    ('at-noe-2-klasse-waldviertel-zentral-reserve', '2. Klasse Waldviertel Zentral Reserve (NÖ)', 'NÖ 2. Kl. Waldv. Zentral Res.', 'noefv', '232532', 126), -- 12 klubov, naslednja tekma 2027-04-04
    ('at-noe-2-klasse-wechsel-reserve', '2. Klasse Wechsel Reserve (NÖ)', 'NÖ 2. Kl. Wechsel Res.', 'noefv', '232546', 127), -- 11 klubov, naslednja tekma 2027-04-04
    ('at-noe-2-klasse-weinviertel-reserve', '2. Klasse Weinviertel Reserve (NÖ)', 'NÖ 2. Kl. Weinviertel Res.', 'noefv', '232558', 128), -- 13 klubov, naslednja tekma 2027-03-21
    ('at-noe-2-klasse-ybbstal-reserve', '2. Klasse Ybbstal Reserve (NÖ)', 'NÖ 2. Kl. Ybbstal Res.', 'noefv', '232577', 129), -- 14 klubov, naslednja tekma 2027-02-26
    ('at-ooe-1-klasse-mitte-reserve', '1. Klasse Mitte Reserve (OÖ)', 'OÖ 1. Kl. Mitte Res.', 'ooefv', '232708', 115), -- 13 klubov, naslednja tekma 2027-03-21
    ('at-ooe-1-klasse-mittewest-reserve', '1. Klasse Mittewest Reserve (OÖ)', 'OÖ 1. Kl. Mittewest Res.', 'ooefv', '232709', 116), -- 14 klubov, naslednja tekma 2027-03-21
    ('at-ooe-1-klasse-nord-reserve', '1. Klasse Nord Reserve (OÖ)', 'OÖ 1. Kl. Nord Res.', 'ooefv', '232707', 117), -- 14 klubov, naslednja tekma 2026-11-14
    ('at-ooe-1-klasse-nordost-reserve', '1. Klasse Nordost Reserve (OÖ)', 'OÖ 1. Kl. Nordost Res.', 'ooefv', '232710', 118), -- 13 klubov, naslednja tekma 2027-03-21
    ('at-ooe-1-klasse-nordwest-reserve', '1. Klasse Nordwest Reserve (OÖ)', 'OÖ 1. Kl. Nordwest Res.', 'ooefv', '232721', 119), -- 14 klubov, naslednja tekma 2027-03-21
    ('at-ooe-1-klasse-ost-reserve', '1. Klasse Ost Reserve (OÖ)', 'OÖ 1. Kl. Ost Res.', 'ooefv', '232606', 120), -- 13 klubov, naslednja tekma 2027-03-21
    ('at-ooe-1-klasse-sued-reserve', '1. Klasse Süd Reserve (OÖ)', 'OÖ 1. Kl. Süd Res.', 'ooefv', '232712', 121), -- 13 klubov, naslednja tekma 2027-03-21
    ('at-ooe-1-klasse-suedwest-reserve', '1. Klasse Südwest Reserve (OÖ)', 'OÖ 1. Kl. Südwest Res.', 'ooefv', '232713', 122), -- 14 klubov, naslednja tekma 2027-03-21
    ('at-w-2-landesliga-u23', '2. Landesliga U23 (Wien)', 'Wien 2. LL U23', 'wfv', '232584', 102), -- 16 klubov, naslednja tekma 2026-11-13
    ('at-w-oberliga-a-reserve', 'Oberliga A Reserve (Wien)', 'Wien OL A Res.', 'wfv', '232726', 103), -- 11 klubov, naslednja tekma 2026-11-14
    ('at-w-oberliga-b-reserve', 'Oberliga B Reserve (Wien)', 'Wien OL B Res.', 'wfv', '232727', 104), -- 12 klubov, naslednja tekma 2026-11-14
    ('at-w-1-klasse-a-reserve', '1. Klasse A Reserve (Wien)', 'Wien 1. Kl. A Res.', 'wfv', '232728', 105), -- 12 klubov, naslednja tekma 2026-11-14
    ('at-w-1-klasse-b-reserve', '1. Klasse B Reserve (Wien)', 'Wien 1. Kl. B Res.', 'wfv', '232729', 106), -- 11 klubov, naslednja tekma 2026-11-15
    ('at-w-dsg-reserve-a', 'DSG Reserve A (Wien)', 'Wien DSG Res. A', 'wfv', '232588', 107), -- 8 klubov, naslednja tekma 2027-03-04
    ('at-w-dsg-reserve-b', 'DSG Reserve B (Wien)', 'Wien DSG Res. B', 'wfv', '232589', 108), -- 8 klubov, naslednja tekma 2027-03-04
    ('at-t-frauen-landesliga', 'Frauen Landesliga (Tirol)', 'Tirol Frauen LL', 'tfv', '231685', 202), -- 9 klubov, naslednja tekma 2027-04-17
    ('at-t-frauen-reserve-liga', 'Frauen Reserve Liga (Tirol)', 'Tirol Frauen Res.', 'tfv', '232616', 203), -- 10 klubov, naslednja tekma 2027-04-17
    ('at-b-u15-nord', 'U15 Nord (Burgenland)', 'Bgld. U15 Nord', 'bfv', '233642', 301), -- 9 klubov, naslednja tekma 2026-11-15
    ('at-k-u17-eliteliga', 'Unter 17+4 Eliteliga (Kärnten)', 'Kärnten U17 Eliteliga', 'kfv', '233029', 301), -- 16 klubov, naslednja tekma 2026-11-14
    ('at-k-u17-a', 'Unter 17+4 A (Kärnten)', 'Kärnten U17 A', 'kfv', '233034', 302), -- 12 klubov, naslednja tekma 2027-03-27
    ('at-k-u17-b', 'Unter 17+4 B (Kärnten)', 'Kärnten U17 B', 'kfv', '233035', 303), -- 9 klubov, naslednja tekma 2026-11-14
    ('at-k-u15-eliteliga', 'Unter 15 Eliteliga (Kärnten)', 'Kärnten U15 Eliteliga', 'kfv', '233031', 304), -- 11 klubov, naslednja tekma 2026-11-14
    ('at-noe-jhg-nordwest-mitte-u16', 'JHG Nordwest/Mitte U16 (NÖ)', 'NÖ JHG NW/Mitte U16', 'noefv', '233251', 301), -- 12 klubov, naslednja tekma 2026-11-13
    ('at-noe-jhg-sued-u16', 'JHG Süd U16 (NÖ)', 'NÖ JHG Süd U16', 'noefv', '233302', 302), -- 13 klubov, naslednja tekma 2026-11-11
    ('at-noe-jhg-suedost-u16', 'JHG Südost U16 (NÖ)', 'NÖ JHG Südost U16', 'noefv', '233558', 303), -- 11 klubov, naslednja tekma 2026-11-13
    ('at-noe-jhg-waldviertel-u16', 'JHG Waldviertel U16 (NÖ)', 'NÖ JHG Waldviertel U16', 'noefv', '232900', 304), -- 9 klubov, naslednja tekma 2026-11-13
    ('at-noe-jhg-waldviertel-u15', 'JHG Waldviertel U15 (NÖ)', 'NÖ JHG Waldviertel U15', 'noefv', '232902', 305), -- 10 klubov, naslednja tekma 2027-03-20
    ('at-s-u17-1-sparkassenliga', 'U17 1. Sparkassenliga (Salzburg)', 'Sbg. U17 1. Liga', 'sfv', '233372', 301), -- 8 klubov, naslednja tekma 2026-11-14
    ('at-st-gebiet-graz-u18', 'Gebiet Graz U18 (Steiermark)', 'Stmk. Graz U18', 'stfv', '233790', 302), -- 10 klubov, naslednja tekma 2026-11-11
    ('at-st-mur-muerz-u15', 'Gebiet Mur-Mürz U15 (Steiermark)', 'Stmk. Mur-Mürz U15', 'stfv', '233355', 303), -- 8 klubov, naslednja tekma 2027-04-03
    ('at-st-oberes-murtal-enns-u15', 'Gebiet oberes Murtal-Enns U15 (Steiermark)', 'Stmk. ob. Murtal-Enns U15', 'stfv', '233498', 304), -- 9 klubov, naslednja tekma 2027-04-03
    ('at-t-u15-tirol-liga', 'U15 Tirol Liga', 'Tirol U15 Liga', 'tfv', '231701', 302), -- 12 klubov, naslednja tekma 2027-04-03
    ('at-t-u16-landesliga-ost', 'U16 Landesliga Ost (Tirol)', 'Tirol U16 LL Ost', 'tfv', '232643', 303), -- 11 klubov, naslednja tekma 2027-04-03
    ('at-t-u16-landesliga-west', 'U16 Landesliga West (Tirol)', 'Tirol U16 LL West', 'tfv', '231700', 304), -- 10 klubov, naslednja tekma 2027-04-17
    ('at-t-u15-landesliga-ost', 'U15 Landesliga Ost (Tirol)', 'Tirol U15 LL Ost', 'tfv', '232619', 305), -- 11 klubov, naslednja tekma 2027-04-03
    ('at-t-u15-landesliga-mitte', 'U15 Landesliga Mitte (Tirol)', 'Tirol U15 LL Mitte', 'tfv', '232620', 306), -- 12 klubov, naslednja tekma 2027-04-03
    ('at-t-u15-landesliga-west', 'U15 Landesliga West (Tirol)', 'Tirol U15 LL West', 'tfv', '232621', 307), -- 12 klubov, naslednja tekma 2027-04-03
    ('at-w-a-liga-u17', 'A-Liga U17 (Wien)', 'Wien A-Liga U17', 'wfv', '231845', 305), -- 14 klubov, naslednja tekma 2026-11-14
    ('at-w-b-liga-u17', 'B-Liga U17 (Wien)', 'Wien B-Liga U17', 'wfv', '231843', 306), -- 14 klubov, naslednja tekma 2026-11-14
    ('at-w-wfv-liga-u16', 'WFV-Liga U16 (Wien)', 'Wien WFV-Liga U16', 'wfv', '231938', 307), -- 12 klubov, naslednja tekma 2026-11-14
    ('at-w-a-liga-u16', 'A-Liga U16 (Wien)', 'Wien A-Liga U16', 'wfv', '231856', 308), -- 12 klubov, naslednja tekma 2026-11-14
    ('at-w-b-liga-u16', 'B-Liga U16 (Wien)', 'Wien B-Liga U16', 'wfv', '231849', 309), -- 12 klubov, naslednja tekma 2026-11-14
    ('at-w-c-liga-u16-b-teams', 'C-Liga U16 B-Teams (Wien)', 'Wien C-Liga U16 B', 'wfv', '232484', 310), -- 9 klubov, naslednja tekma 2027-03-14
    ('at-w-wfv-liga-u15', 'WFV-Liga U15 (Wien)', 'Wien WFV-Liga U15', 'wfv', '231850', 311), -- 12 klubov, naslednja tekma 2026-11-14
    ('at-w-a-liga-u15', 'A-Liga U15 (Wien)', 'Wien A-Liga U15', 'wfv', '231881', 312), -- 14 klubov, naslednja tekma 2026-11-14
    ('at-w-b-liga-u15', 'B-Liga U15 (Wien)', 'Wien B-Liga U15', 'wfv', '231861', 313), -- 14 klubov, naslednja tekma 2026-11-14
    ('at-w-c-liga-u15', 'C-Liga U15 (Wien)', 'Wien C-Liga U15', 'wfv', '231893', 314) -- 12 klubov, naslednja tekma 2026-11-11
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'AT'
on conflict (slug) do nothing;

-- ====================================================================
-- Romunija, vir `hlf` (hailafotbal.ro, uradna platforma FRF): županijski
-- mladinski ligi Cluj U15 in Hunedoara U19. Šifra lige je pot strani brez
-- kroga, kot pri 20261010220000 in 20261104175500. `frf` (frf-ajf.ro) ni bil
-- odprt.
--
-- Pregled 9. 11. 2026 (stran kot obiskovalec po poti vira:
-- `scripts/hailafotbal-lige.mjs` za seznam lig 10 županij s podatki in
-- državne ravni, nato za vsako kandidatko seja `Seja` — razpored, zadnji
-- odigrani krog in do 3 zapisniki; 2 s med dejanji, brez 401/403/429 ali
-- izziva):
--   Cluj U15 Grupa A — 22 krogov (dvokrožno, 11–12 klubov), naslednji krog
--     14. 11. 2026; 9. krog (7. 11.) 3/3 preverjenih polnih, npr. Dribli Cluj
--     Napoca 1:2 ACS Napocense Stars: XI 11/11, klop 5/4.
--   Hunedoara Juniori U19 Faza 1 — 8 klubov, 14 krogov; 10. krog (5. 11.)
--     3/3 polnih, npr. Retezatul Hațeg 1:7 CSM Jiul Petroșani: XI 11/11, klop
--     5/4. Jesenski del je končan, pomladni krogi 11–14 so razpisani od
--     23. 3. 2027.
-- Ni vpisano (seniorji): Caraș-Severin L4, Maramureș L4, Sălaj L4, Galați
-- L4 in L5 (noben krog nima vpisanega izida); Bihor L5 S1/S2 (1/4 izidov,
-- zapisnik prazen oz. nepopoln); Prahova L6 Nord (16 klubov, 1/3 polnih);
-- Sibiu L5 Sibiu (0/3 polnih); Sibiu L4 in L5 Mediaș (na `frf`, odloči
-- lastnik).
-- Ni vpisano (mladi): Cluj U17 (7 klubov), Hunedoara U17 (5) in U16 (4),
-- Bihor U19/U17/U15 (brez izida), Prahova U19 (1/6 izidov, nepopoln),
-- Sibiu U19 (0/3 polnih), U17, U16, U15 (manj kot 8 klubov ali prazni
-- zapisniki); redni del Liga de Tineret in Elitelor U15–U17 (končan
-- 10.–11. 10.), U14 in mlajši, pokali.
--
-- Mladinske šifre imajo `u15`/`u19` (varovalo mladih). Arhiva ni (uvoz brez
-- `arhiv`, s `cene`). Ligi sta NEAKTIVNI.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hlf', v.koda, 1, v.vrstni, 6, false,
       'Hai la fotbal (FRF)', 'https://hailafotbal.ro/rezultate/' || v.koda
  from countries d
  cross join (values
    ('ro-cj-u15', 'Campionatul Județean U15 (Cluj)', 'CJ U15', 'ajf-cluj', 'judetean/cluj/fotbal/2026-2027/campionatul-judetean-u15/sezon-regular/grupa-a', 10), -- 11–12 klubov
    ('ro-hd-u19', 'Juniori U19 (Hunedoara)', 'HD U19', 'ajf-hunedoara', 'judetean/hunedoara/fotbal/2026-2027/juniori-u19/faza-1/serie-1', 10) -- 8 klubov
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'RO'
on conflict (slug) do nothing;

-- ====================================================================
-- Grčija, vira `mascot` (Mascotnet, pisno dovoljenje upravljavca) in `eps`.
--
-- Pregled 9. 11. 2026 (`mascot`): meniji vseh desetih domen (`DOMENE`),
-- razpored vsake nove lige iz menija in en zapisnik zadnje odigrane tekme,
-- po razčlenjevalniku vira (3 s med zahtevki, 37 zahtevkov, vsi 200).
--   Krf Κ15 (`epskerkyras.gr:Κ15`) — 10 klubov, 18 krogov, odigrani 1.–3.
--     krog (24. 10.–7. 11., 12 tekem s stranjo tekme); zapisnik 15015
--     (7. 11., ΑΣ ΘΙΝΑΛΙΑΚΟΣ 2:0 ΑΣ ΒΟΛΙΣ): XI 11/11, klop 5/1, 2 strelca =
--     izid. Krogi 4–18 so objavljeni brez datuma (stran tekme 15016 ga še
--     nima) — kot pri epsm vir datum vzame s strani tekme pred krogom.
-- Ni vpisano (`mascot`):
--   - epsm Κ17 LEAGUE 1: ena stran z dvema skupinama (41 klubov, krog po
--     20 tekem, krogi 20–21 po 10) — zapisniki so polni (170026: 11 + 7 /
--     11 + 5), a liga bi bila mešanica skupin; odloči lastnik.
--   - epsm ΓΥΝΑΙΚΩΝ Κ15, Pela Κ16, Drama Κ15, Thesprotia Κ15, Imatija Γ
--     Ερασιτεχνική, Γ Εθνική, Β Εθνική Γυναικών in Κ16, Preveza-Lefkada Β
--     2. skupina: brez razporeda (nobene tekme na strani).
--   - Ahaja Κ17 Α Elite (8), Κ17 Β (6), Κ16 Α Elite (8), Κ16 Β (10), Κ16 Γ
--     (8): razpored je, odigrane tekme z izidom ni nobene (1. krog 31. 10.).
--   - Lezbos Γ Εθνική Ανδρών 5. skupina (11 klubov), Β Εθνική Γυναικών (10),
--     Γ Εθνική Γυναικών (8): stran tekme nima glave tekme ne postav
--     (10035, 11024, 12005) — razčlenjevalnik je ne prebere.
--   - Lezbos ΥΠΟΔΟΜΩΝ Κ16 Α/Β (po 5 klubov); ΜΙΚΤΩΝ ΕΝΩΣΕΩΝ in
--     ΠΡΟΕΠΙΛΟΓΗΣ (reprezentance zvez), Κ14 in mlajši, pokali.
--
-- `eps`: STOP. 9. 11. 2026 je www.epsana.gr/results/results.php vrnil
-- HTTP 403 (drugi zahtevek; prvi, epspeir.gr, 200) — branje `eps` je
-- ustavljeno, nič ni ponovljeno. Pirej ima na seznamu nove mladinske lige
-- (Κ16 Α faza 1.–3. skupina `epspeir.gr:740`, `741`, `757`; Κ17 `754`;
-- Κ15 Κορασίδων `758`), ki NISO preverjene in niso vpisane.
--
-- Mladinska šifra ima `u15` (varovalo mladih). Liga je NEAKTIVNA.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mascot', v.koda, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('gr-ker-u15', 'Κ15', 'Κέρκυρα Κ15', 'epskerkyras.gr:Κ15', 'eps-ker', 139) -- 10 klubov
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'GR'
on conflict (slug) do nothing;

-- ====================================================================
-- Malta, vir `mfa` (javni JSON API Match Centra MFA): mladinske lige U15
-- A–D 2026/27 (BNF U15 League A, B, C, D). Šifra `<tip tekmovanja>/<sezona>`
-- kot pri U17 A–D (20261104176100); faze (Phase 1, nato nova tekmovanja)
-- vir poveže prek lestvice sezone.
--
-- Pregled 9. 11. 2026 (seznam `/competitions`, za vsako ligo pastMatches,
-- upcomingMatches, standings in postava zadnje odigrane tekme; 3 s med
-- zahtevki, 21 zahtevkov, 200 razen dveh 400 pri GIDA in SWAN, brez zavrnitve):
--   U15 A (6480560) — 10 klubov, odigrano 29. 8.–31. 10., naslednji krog
--     14. 11. 2026; postava mt53209028 (Pieta' Hotspurs : Valletta): 11 + 9 /
--     11 + 8, vratar označen, dogodki z minuto.
--   U15 B (6480561) — 10 klubov, naslednji krog 14. 11.; mt53209325: 11 + 9 /
--     11 + 9, vratar.
--   U15 C (6480562) — 10 klubov, naslednji krog 14. 11.; mt53679361: 11 + 8 /
--     11 + 8, vratar.
--   U15 D (6480601) — 13 klubov, naslednji krog 14. 11.; mt53209940: 11 + 9 /
--     11 + 9, vratar.
--   Lestvica sezone vsake lige našteje Phase 1 (konec 31. 12. 2026).
-- Ni vpisano: Women's Youth League (17926959, 6 klubov), Gozo (GFL 1st Div
-- 7, 2nd Div 5, GFA Youth League 6, GYFA U16 6 klubov), amaterske zveze
-- MAFA, IASC, ISA (6–7 klubov), GIDA League in SWAN 1st/2nd Division
-- (`pastMatches?season=2027` vrne 400 "Value cannot be null" — vir jih ne
-- prebere brez spremembe), veterani, futsal, 5-a-side, pokali, U13 in mlajši.
--
-- Mladinske šifre imajo `u15` (varovalo mladih). Vse lige so NEAKTIVNE.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mfa', v.koda, 1, v.vrstni, 6, false,
       'MFA', 'https://matchcentre.mfa.com.mt/competition/' || split_part(v.koda, '/', 1) || '/'
  from countries d
  join federations f on f.code = 'mfa'
  cross join (values
    ('mt-u15-a', 'U15 League A', 'U15 League A', '6480560/2027', 50), -- 10 klubov
    ('mt-u15-b', 'U15 League B', 'U15 League B', '6480561/2027', 51), -- 10 klubov
    ('mt-u15-c', 'U15 League C', 'U15 League C', '6480562/2027', 52), -- 10 klubov
    ('mt-u15-d', 'U15 League D', 'U15 League D', '6480601/2027', 53)  -- 13 klubov
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'MT'
on conflict (slug) do nothing;

-- ====================================================================
-- ČRNA GORA, `fscg` (šifra `<regija>/<slug>/<id tekmovanja>`): pionirske
-- lige (U15) 2026/27 — državna Pionirska liga na fscg.me in regijske
-- pionirske lige Centar, Sjever, Jug na poddomenah. 4 lige, vse NEAKTIVNE.
--
-- Preverjeno 9. 11. 2026 (brez pisanja v bazo, 3 s med zahtevki, 13
-- zahtevkov): menija fscg.me in treh poddomen, strani lig (genid = id
-- tekmovanja, sezona 2026/27 iz datumov, naslednji krog po 9. 11.) in po en
-- zapisnik na ligo, razčlenjen z obstoječim comet-auris: obe postavi po 11,
-- klop, vratar (G), goli = izid (Berane : Lovćen 3:3 #9317458, Onogošt :
-- Ribnica 12:0 #9335149, Breznica : Jedinstvo Franca 1:9 #9345009, Balkan :
-- Orjen 3:0 #9392106). Vse odigrane tekme imajo zapisnik.
-- Pionirji so U15 (kot pri fss in ffm); mladinske: prvi_fantasy_krog = 2,
-- rok_pomak_ur = 2.
--
-- Ni vpisano: 1. ŽFL (`9336272`, 3 klubi), Liga pjetlića (Sjever, Jug —
-- mlajši od U14), Kup mlađih kategorija (Centar — pokal), futsal, Kup CG.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fscg', v.koda, 2, v.vrstni, 2, false,
       'FSCG',
       'https://' || case when split_part(v.koda, '/', 1) = 'fscg' then '' else split_part(v.koda, '/', 1) || '.' end
         || 'fscg.me/takmicenja/' || split_part(v.koda, '/', 2) || '/'
  from countries d
  cross join (values
    ('me-u15-1', 'Pionirska liga', 'Pionirska liga', 'fscg/pionirska-liga/9317237', 'fscg', 10),                   -- 9
    ('me-u15-centar', 'Pionirska liga Centar', 'Pionirska Centar', 'centar/pionirska-liga/9334988', 'fscg-centar', 11), -- 11
    ('me-u15-sjever', 'Pionirska liga Sjever', 'Pionirska Sjever', 'sjever/pionirska-liga/9344863', 'fscg-sjever', 12), -- 13
    ('me-u15-jug', 'Pionirska liga Jug', 'Pionirska Jug', 'jug/pionirska-liga/9392031', 'fscg-jug', 13)               -- 8
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'ME'
on conflict (slug) do nothing;

-- ====================================================================
-- SEVERNA MAKEDONIJA, `ffm` (slug strani lige): pionerske lige (U15)
-- 2026/27 — Пионерска Супер лига, Втора пионерска лига Исток in Запад
-- (slednja ima zavajajoč slug `vtora-kadetska-liga-zapad-26-27-2`, naslov
-- strani je "Втора Пионерска лига ЗАПАД 26/27"). 3 lige, vse NEAKTIVNE.
--
-- Preverjeno 9. 11. 2026 (brez pisanja v bazo, 3 s med zahtevki, 9
-- zahtevkov): meni ffm.mk, strani lig, razčlenjene z obstoječim ffm.mjs
-- (vse odigrane tekme imajo /izvestaj/), in zapisniki: 11940079 (Супер,
-- Тетекс : Аресими 0:5), 11956710 (Исток, Победа : Тиквеш 5:1), 11954984,
-- 11954913, 11954948 (Запад) — obe postavi po 11, klop, vratar (prvi), goli
-- = izid, menjave z minuto (11954984 jih nima vpisanih, druga dva Zahodna
-- jih imata). Istok in Zapad imata naslednje tekme 14.–15. 11.; Супер лига
-- je odigrala 11. krog 4.–5. 11. (13 klubov, prvi del še ni končan), 12.
-- krog na strani še ni objavljen (ffm objavi razpored le nekaj krogov
-- naprej). Mladinske: prvi_fantasy_krog = 2, rok_pomak_ur = 2.
--
-- Ni vpisano: Куп на РМ (pokal); drugih tekmovanj 2026/27 v meniju ni
-- (Treta liga in občinske lige še vedno ne obstajajo za 2026/27).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'ffm', v.koda, 2, v.vrstni, 2, false,
       'FFM', 'https://www.ffm.mk/natprevaruvanje/' || v.koda || '/'
  from countries d
  join federations f on f.code = 'ffm'
  cross join (values
    ('mk-u15-super', 'Пионерска Супер лига', 'Пионерска СЛ', 'pionerska-super-liga-26-27', 15),                         -- 13
    ('mk-u15-vtora-istok', 'Втора пионерска лига Исток', 'Втора пионерска И', 'vtora-pionerska-liga-istok-26-27', 16),   -- 11
    ('mk-u15-vtora-zapad', 'Втора пионерска лига Запад', 'Втора пионерска З', 'vtora-kadetska-liga-zapad-26-27-2', 17)   -- 14
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'MK'
on conflict (slug) do nothing;

-- ====================================================================
-- UKRAJINA, `upl` (šifra = id prvenstva sezone): Національна Ліга U-19
-- 2026/27 (`434`; 2025/26 je bila `429`). 1 liga, NEAKTIVNA.
--
-- Preverjeno 9. 11. 2026 (brez pisanja v bazo, 3 s med zahtevki):
-- /ua/tournaments/championship/434 (izbirnik: "434 selected 2026/27"),
-- koledar razčlenjen z obstoječim upl.mjs — 14 klubov (mladinske ekipe UPL
-- klubov, isti zapis imen kot člani), 26 krogov, 86 odigranih z zapisnikom,
-- naslednja tekma 11. 11. 2026; zapisnik 16872 (Металург : Шахтар 1:3):
-- postavi po 11 s šifro osebe, klop, vratar s sheme, goli = izid, kartoni,
-- 10 menjav, 0 opozoril. Obrazec za novice (`<div class="captcha">`) v nogi
-- ni izziv (glej docs/viri/ukrajina.md). Mladinska: prvi_fantasy_krog = 2,
-- rok_pomak_ur = 2.
--
-- Ni vpisano / ni novih lig:
-- * upl: 430/435 Кубок України (pokal), 431 Play-Off.
-- * pfl-ua: /custom/6 našteje le koledarje 1, 2a, 2b (že vpisani); 1a/1b ne
--   obstajata.
-- * aft: prvenstvo 2026 (36, 37) se je končalo 11. 10. 2026 (koledarska
--   sezona); ostalo so Ліга Тернопільщини (brez postav), Ліга чемпіонів,
--   zimsko prvenstvo, kupi, veterani, futsal, šolska liga, ДЮФЛ.
-- * hoff-km: strani ЧХО 2026 sta zadnji (sezona končana 10/2026), ostalo so
--   veterani 40+.
-- * ffl: Чемпіонат юніорів Сезон-2026 (820 Вища, 821 Перша), ženske (656,
--   836), Чемпіонат України серед аматорів (843) — vir bere le naslove
--   "<Ліга> Львівщини-YYYY/YYYY" in izrecno izloči юніор/жін (jeClanekLige,
--   sezonaIz), zato bi potrebovali spremembo vira; 833–835 so državne lige
--   (pfl-ua, upl), kupi in memoriali izločeni.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select 'ua-u19-upl', 'Національна Ліга U-19', 'U-19', d.id, f.id, 'upl', '434', 2, 3, 2, false  -- 14
  from countries d
  join federations f on f.code = 'upl'
 where d.code = 'UA'
on conflict (slug) do nothing;

-- ====================================================================
-- Katalonija (fcf): mladinske lige 2026/27 — dekleta U19 (Preferent Femení
-- Juvenil, Primera Divisió Femení Juvenil grup 2 in 3) in kadeti U15
-- (Preferent Cadet S15 grup 2, 3, 4). Vzorec kot 20261104176300.
--
-- Preverjeno 9. 11. 2026 le z zapisniki /ca/competicio/acta/<id> (isti
-- naslov, User-Agent in fcfFetch kot scripts/viri/fcf.mjs; 59 zahtevkov po
-- 3,5 s, vsi HTTP 200, brez izziva). Meje blokov: prva in zadnja šifra bloka
-- ter sosednji šifri zunaj njega (druga skupina ali "Acta no trobada").
-- Vsi bloki imajo 30 krogov po 8 mest (16 klubov), J30 maja 2027, sezona
-- teče. Postave: odigran zapisnik 1. kroga vsake skupine 11 + 11, klop,
-- vratar pri obeh, goli = izid, brez opozoril. Menjav ekipe ne vpisujejo
-- (kot Quarta). Kadeti igrajo 2 × 40 min, vir šteje 90 (minute precenjene).
--
-- Šifre nosijo `u19`/`u15`, da velja zaščita mladoletnih (PR #668);
-- prvi_fantasy_krog = 2 in rok_pomak_ur = 2 kot pri drugih mladinskih ligah.
--
-- Preskočeno: Primera Federació grup 2 (4143290 — zapisnik brez postav),
-- Preferent Femení Infantil / Alevers / Aleví S11–S12 (U14 in mlajši),
-- futsal (4114495, 4119745, 4122000–4134000), Primera Divisió Femení
-- Infantil (U14). Nedokončano (meja ali postava ni preverjena, proračun
-- ~60 zahtevkov): Preferent Cadet S15 grup 1 (konča pri 4155328, začetek
-- ni preverjen) in grup 5+ (za 4156048), Primera Divisió Femení Juvenil
-- grup 1 (ni najdena), fantovski Juvenil (Preferent / Primera) ni najden.
-- Vse NEAKTIVNE.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fcf', v.koda, 2, v.vrstni, 2, false,
       'FCF', 'https://www.fcf.cat/ca/competicio/acta/' || split_part(v.koda, '-', 1)
  from countries d
  join federations f on f.code = 'fcf'
  cross join (values
    ('es-ct-u19-zenske-preferent', 'Preferent Femení Juvenil, grup 1', 'U19 Fem. Pref.', '4115708-4115947', 201),          -- 16 klubov
    ('es-ct-u19-zenske-primera-g2', 'Primera Divisió Femení Juvenil, grup 2', 'U19 Fem. 1a 2', '4137344-4137583', 202),    -- 16 klubov
    ('es-ct-u19-zenske-primera-g3', 'Primera Divisió Femení Juvenil, grup 3', 'U19 Fem. 1a 3', '4137104-4137342', 203),    -- 16 klubov
    ('es-ct-u15-preferent-g2', 'Preferent Cadet S15, grup 2', 'U15 Pref. 2', '4155329-4155568', 212),                      -- 16 klubov
    ('es-ct-u15-preferent-g3', 'Preferent Cadet S15, grup 3', 'U15 Pref. 3', '4155569-4155808', 213),                      -- 16 klubov
    ('es-ct-u15-preferent-g4', 'Preferent Cadet S15, grup 4', 'U15 Pref. 4', '4155809-4156048', 214)                       -- 16 klubov
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'ES'
on conflict (slug) do nothing;

