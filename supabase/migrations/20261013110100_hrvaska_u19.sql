-- Hrvaška: mladinske lige (juniori, U19) z vira HNS Semafor — 28 lig.
--
-- Pregled 12. 10. 2026 (seznam tekmovanj vseh 40 zvez za 2026/27 in 2025/26,
-- en zapisnik na ligo in na arhiv): vse imajo postavi 11 + 11 s šifro osebe,
-- vratarja in klop, kot zapisnik odraslih. Državne (HNS) in regijske
-- (nogometna središta Istok, Centar, Rijeka, Sjever, Split) vodi HNS, zato
-- zveza `hns`; županijske in NS lige imajo zvezo kot lige odraslih.
--
-- Primorsko-goranska in Varaždinska nimata U19, najvišja mladinska liga je
-- U18 — vpisani sta, šifra ima vseeno `u19`, da ju `je_mladinski_slug`
-- prepozna kot mladinski.
--
-- Izpuščeni: Međimurje U-19 (115953166 — stran tekmovanja vrača HTTP 500),
-- Koprivnica "U-17 Kadeti i juniori" (U17), Split NSŽSD (5 klubov), Dubrovnik
-- (5, brez odigrane tekme), Požega (3), Đakovo (5, igra 8 na 8), HNS pilot
-- "liga ulaznih juniora U-18", pokali, futsal, kvalifikacije.
--
-- Kot ostale U19: prvi_fantasy_krog = 2, rok_pomak_ur = 2. Klub je skupen s
-- člani. Vse se vpišejo NEAKTIVNE; arhiv 2025/26 je v CLAUDE.md.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hns', v.koda, 2, v.vrstni, 2, false,
       'HNS Semafor', 'https://semafor.hns.family/natjecanja/' || v.koda || '/x/'
  from countries d
  cross join (values
    -- državne (HNS)
    ('hr-u19-1hnl', 'Prva HNL juniori', 'U19 HNL', 'hns', '114526424', 101),
    ('hr-u19-2nl', '2. NL juniori', 'U19 2. NL', 'hns', '114771687', 102),
    ('hr-u19-2nl-b', '2. NL juniori B', 'U19 2. NL B', 'hns', '114771691', 103),
    -- regijske (nogometna središta HNS)
    ('hr-u19-1nl-istok', '1. NL Središte Istok juniori', 'U19 Istok', 'hns', '114864867', 104),
    ('hr-u19-1nl-centar', 'Prva NL Centar juniori', 'U19 Centar I.', 'hns', '114975565', 105),
    ('hr-u19-2nl-centar', 'Druga NL Centar juniori', 'U19 Centar II.', 'hns', '114985034', 106),
    ('hr-u19-3nl-centar', 'Treća NL Centar juniori', 'U19 Centar III.', 'hns', '114992787', 107),
    ('hr-u19-1nl-rijeka', '1. NL NS Rijeka juniori', 'U19 Rijeka', 'hns', '115053595', 108),
    ('hr-u19-1nl-sjever', 'Prva NL juniori U19 Središte Sjever', 'U19 Sjever', 'hns', '115344352', 109),
    ('hr-u19-1nl-split', '1. NL Split juniori', 'U19 Split I.', 'hns', '116563036', 110),
    ('hr-u19-2nl-split', '2. NL Split juniori', 'U19 Split II.', 'hns', '116566614', 111),
    -- županijske in NS
    ('hr-zg-u19-1znl', '1. ZNL juniori', 'ZG U19 I.', 'zns-zagreb', '114507628', 112),
    ('hr-zg-u19-2znl', '2. ZNL juniori', 'ZG U19 II.', 'zns-zagreb', '114507634', 113),
    ('hr-bj-u19-sjever', '1. ŽNL U19 juniori Sjever', 'BJ U19 Sjever', 'zns-bjelovar', '114681204', 114),
    ('hr-bj-u19-jug', 'Prva ŽNL juniori Jug', 'BJ U19 Jug', 'zns-bjelovar', '115169842', 115),
    ('hr-bp-u19', 'Juniori ŽNS BPŽ', 'BP U19', 'zns-brod', '115910901', 116),
    ('hr-is-u19-a', 'ŽNLI juniori A', 'IS U19 A', 'zns-istra', '115006487', 117),
    ('hr-is-u19-b', 'ŽNLI juniori B', 'IS U19 B', 'zns-istra', '115003917', 118),
    ('hr-ka-u19', '1. ŽNL NSKŽ juniori', 'KA U19', 'zns-karlovac', '115466348', 119),
    ('hr-kz-u19', '1. ŽNL juniori KZŽ', 'KZ U19', 'zns-krapina-zagorje', '115942754', 120),
    ('hr-ri-u19', 'NS PGŽ U18', 'RI U18', 'zns-rijeka', '115228638', 121),
    ('hr-sm-u19', 'Liga juniora SMŽ', 'SM U19', 'zns-sisak', '115008823', 122),
    ('hr-vz-u19', 'NC kadeti/juniori U-18', 'VŽ U18', 'zns-varazdin', '114799310', 123),
    ('hr-vs-u19', 'Liga mladeži ŽNS-VS juniori', 'VS U19', 'zns-vukovar', '114880435', 124),
    ('hr-zz-u19-1liga', '1. liga juniori NSZŽ', 'ZŽ U19 I.', 'zns-zagrebacka', '114786421', 125),
    ('hr-zz-u19-2liga', '2. liga juniori NSZŽ', 'ZŽ U19 II.', 'zns-zagrebacka', '114786736', 126),
    ('hr-ku-u19', 'Liga juniora NS Kutina', 'KU U19', 'ns-kutina', '114768241', 127),
    ('hr-na-u19', 'LM NS Našice juniori', 'NA U19', 'ns-nasice', '114377093', 128)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HR'
on conflict (slug) do nothing;
