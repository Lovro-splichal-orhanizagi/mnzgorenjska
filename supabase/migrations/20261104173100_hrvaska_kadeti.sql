-- Hrvaška: kadetske lige (U17) in zimska FNL Hvar z vira HNS Semafor — 28 lig.
--
-- Lastnik je 4. 11. 2026 odobril U16/U17 v virih, ki jih že uvažamo. Seznam
-- tekmovanj vseh 40 zvez 2026/27 (`/handlers/getCompetitions/`) je bil
-- primerjan s produkcijo; vse spodaj so nove vrstice na obstoječem viru `hns`,
-- zapisnik je isti kot pri juniorjih (U19, migracija 20261013110100).
-- Pilot "nacionalna liga kadeta 2" ima preverjen zapisnik (postavi 11 + klop,
-- 13 menjav, goli, kartoni); ostale so iste oblike kot žive U19 sestrske lige.
-- ZNS Zagreb, Zadar, Krapina-Zagorje in Međimurje menjav ne vpisujejo (minute
-- so zato šibkejše, strelce s klopi doda `dodajStrelceSKlopi`).
--
-- Šifra nosi `u17`, da jo `je_mladinski_slug` (PR #668, migracija
-- 20261104170100) prepozna kot mladinsko. **Pred uvozom mora biti #668
-- združen**, sicer `ravenLige` kadetsko ligo bere kot člansko.
--
-- Sezona teče, zato je `prvi_fantasy_krog` prvi krog brez odigrane tekme
-- (razpored 4. 11. 2026); ob vklopu ga vklopna skripta postavi na prvi
-- prihodnji krog. `rok_pomak_ur = 2` kot pri drugih mladinskih ligah.
--
-- FNL (`119844748`) je zimska liga otoka Hvar (9 klubov, 72 tekem, odigrana
-- 2 kroga od 18, naslednje tekme 7. 11.): članska, zveza ŽNS Splitsko-
-- dalmatinski, `rok_pomak_ur = 6` kot ostale članske.
--
-- Izpuščeno: VS kadeti A in B, Bjelovar, Koprivnica, Međimurje U-19 in
-- Virovitica U-19 (jesenski del končan, razporeda za pomlad še ni; VS B ima
-- tri istoimenska tekmovanja, odigrano le `115426213`), Split juniori NSŽSD
-- (5 klubov), Prva HNLŽ kadetkinje in Međimurska liga žene (ženske lige gredo
-- prek strožje poti `hr-hnlz-v1`, zapisnik ni preverjen), Baranja, Požega,
-- Lika (2–4 klubi).
--
-- Vse se vpišejo NEAKTIVNE; arhiv 2025/26 in tabela šifer: docs/viri/hrvaska.md.

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
    ('hr-u17-1hnl', 'Prva HNL kadeti', 'U17 HNL', 'hns', '114526396', 12, 131, 2),
    ('hr-u17-2nl-a', '2. NL kadeti A', 'U17 2. NL A', 'hns', '114771650', 10, 132, 2),
    ('hr-u17-2nl-b', '2. NL kadeti B', 'U17 2. NL B', 'hns', '114771674', 10, 133, 2),
    ('hr-u17-nlk2', 'Nacionalna liga kadeta 2 (pilot)', 'U17 NLK 2', 'hns', '114526618', 10, 134, 2),
    -- regijske (nogometna središta HNS)
    ('hr-u17-1nl-istok', '1. NL Središte Istok kadeti', 'U17 Istok I.', 'hns', '114866519', 10, 135, 2),
    ('hr-u17-2nl-istok', '2. NL Središte Istok kadeti', 'U17 Istok II.', 'hns', '114874642', 10, 136, 2),
    ('hr-u17-1nl-centar', 'Prva NL Centar kadeti', 'U17 Centar I.', 'hns', '114974130', 11, 137, 2),
    ('hr-u17-2nl-centar', 'Druga NL Centar kadeti', 'U17 Centar II.', 'hns', '114979194', 10, 138, 2),
    ('hr-u17-3nl-centar', 'Treća NL Centar kadeti', 'U17 Centar III.', 'hns', '114992094', 9, 139, 2),
    ('hr-u17-1nl-rijeka', '1. NL NS Rijeka kadeti', 'U17 Rijeka', 'hns', '115052610', 10, 140, 2),
    ('hr-u17-1nl-sjever', 'Prva NL kadeti U17 Središte Sjever', 'U17 Sjever', 'hns', '115344430', 11, 141, 2),
    ('hr-u17-1nl-split', '1. NL Split kadeti', 'U17 Split I.', 'hns', '116560790', 9, 142, 2),
    ('hr-u17-2nl-split', '2. NL Split kadeti', 'U17 Split II.', 'hns', '116564705', 9, 143, 2),
    -- županijske in NS
    ('hr-zg-u17-1znl', '1. ZNL kadeti', 'ZG U17 I.', 'zns-zagreb', '114507631', 10, 144, 2),
    ('hr-zg-u17-1a-znl', '1. "A" ZNL kadeti', 'ZG U17 I. A', 'zns-zagreb', '114638882', 9, 145, 2),
    ('hr-zg-u17-2znl', '2. ZNL kadeti', 'ZG U17 II.', 'zns-zagreb', '114507637', 8, 146, 2),
    ('hr-zz-u17-1liga', '1. liga kadeti NSZŽ', 'ZŽ U17 I.', 'zns-zagrebacka', '114785966', 10, 147, 2),
    ('hr-zz-u17-2liga-a', '2. liga kadeti A NSZŽ', 'ZŽ U17 II. A', 'zns-zagrebacka', '114787002', 8, 148, 2),
    ('hr-zz-u17-2liga-b', '2. liga kadeti B NSZŽ', 'ZŽ U17 II. B', 'zns-zagrebacka', '114787296', 9, 149, 2),
    ('hr-bp-u17', 'Kadeti MŽNL SB-PŽ', 'BP U17', 'zns-brod', '115136220', 12, 150, 2),
    ('hr-zd-u17-a', 'MŽNL kadeti A Zadar-Šibenik', 'ZD U17 A', 'zns-zadar', '116261333', 7, 151, 2),
    ('hr-zd-u17-b', 'MŽNL kadeti B Zadar-Šibenik', 'ZD U17 B', 'zns-zadar', '116262343', 6, 152, 2),
    ('hr-kz-u17', 'Kadeti KZŽ', 'KZ U17', 'zns-krapina-zagorje', '115644941', 9, 153, 2),
    ('hr-du-u17', 'Kadeti (U-17) ŽNS Dubrovnik', 'DU U17', 'zns-dubrovnik', '116842055', 7, 154, 2),
    ('hr-st-u17-1liga', '1. liga kadeta NSŽSD', 'ST U17 I.', 'zns-split', '116887160', 6, 155, 2),
    ('hr-st-u17-2liga', '2. liga kadeta NSŽSD', 'ST U17 II.', 'zns-split', '117635351', 6, 156, 2),
    ('hr-mz-u17', 'U-17 ŽNS Međimurje', 'MZ U17', 'zns-medimurje', '115952721', 9, 157, 2),
    -- članska zimska liga
    ('hr-hv-fnl', 'FNL Hvar', 'FNL Hvar', 'zns-split', '119844748', 3, 158, 6)
  ) as v(slug, ime, kratko, zveza, koda, prvi, vrstni, pomak)
  join federations f on f.code = v.zveza
 where d.code = 'HR'
on conflict (slug) do nothing;
