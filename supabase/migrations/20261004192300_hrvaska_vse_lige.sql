-- Hrvaška: preostale lige za odrasle moške z HNS Semaforja (67).
--
-- Seznam je izpisal `node scripts/hrvaske-lige.mjs` (4. 10. 2026); izpuščeni so
-- pokali, veteranske lige ZNS ("1. liga skupina A" …) in lige s petimi klubi
-- ali manj. 48 ima lanski arhiv za cene, 19 ne (nova liga ali preimenovana) —
-- te imajo cene po privzetem 4.5, dokler jih ne ovrednotimo po tekoči sezoni.
-- Vse se vpišejo NEAKTIVNE.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.stran, v.vrstni
  from countries d
  cross join (values
    ('zns-bjelovar', 'ŽNS Bjelovarsko-bilogorski', 'Bjelovar', 'https://semafor.hns.family/', 209),
    ('zns-brod', 'ŽNS Brodsko-posavski', 'Brod', 'https://semafor.hns.family/', 210),
    ('zns-dubrovnik', 'ŽNS Dubrovačko-neretvanski', 'Dubrovnik', 'https://semafor.hns.family/', 211),
    ('zns-karlovac', 'ŽNS Karlovački', 'Karlovac', 'https://semafor.hns.family/', 212),
    ('zns-lika', 'ŽNS Ličko-senjski', 'Lika', 'https://semafor.hns.family/', 213),
    ('zns-osijek', 'ŽNS Osječko-baranjski', 'Osijek', 'https://semafor.hns.family/', 214),
    ('zns-pozega', 'ŽNS Požeško-slavonski', 'Požega', 'https://semafor.hns.family/', 215),
    ('zns-sisak', 'ŽNS Sisačko-moslavački', 'Sisak', 'https://semafor.hns.family/', 216),
    ('zns-split', 'ŽNS Splitsko-dalmatinski', 'Split', 'https://semafor.hns.family/', 217),
    ('zns-sibenik', 'ŽNS Šibensko-kninski', 'Šibenik', 'https://semafor.hns.family/', 218),
    ('zns-virovitica', 'ŽNS Virovitičko-podravski', 'Virovitica', 'https://semafor.hns.family/', 219),
    ('zns-vukovar', 'ŽNS Vukovarsko-srijemski', 'Vukovar', 'https://semafor.hns.family/', 220),
    ('zns-zadar', 'ŽNS Zadarski', 'Zadar', 'https://semafor.hns.family/', 221),
    ('zns-zagrebacka', 'ŽNS Zagrebački', 'Zagrebačka ž.', 'https://semafor.hns.family/', 222),
    ('ns-beli-manastir', 'NS Beli Manastir', 'Beli Manastir', 'https://semafor.hns.family/', 223),
    ('ns-donji-miholjac', 'NS Donji Miholjac', 'Donji Miholjac', 'https://semafor.hns.family/', 224),
    ('ns-dakovo', 'NS Đakovo', 'Đakovo', 'https://semafor.hns.family/', 225),
    ('ns-kutina', 'NS Kutina', 'Kutina', 'https://semafor.hns.family/', 226),
    ('ns-nasice', 'NS Našice', 'Našice', 'https://semafor.hns.family/', 227),
    ('ns-nova-gradiska', 'NS Nova Gradiška', 'Nova Gradiška', 'https://semafor.hns.family/', 228),
    ('ns-osijek', 'NS Osijek', 'NS Osijek', 'https://semafor.hns.family/', 229),
    ('ns-samobor', 'NS Samobor', 'Samobor', 'https://semafor.hns.family/', 230),
    ('ns-valpovo', 'NS Valpovo', 'Valpovo', 'https://semafor.hns.family/', 231)
  ) as v(koda, ime, kratko, stran, vrstni)
 where d.code = 'HR'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hns', v.koda, 1, v.vrstni, 6, false,
       'HNS Semafor', 'https://semafor.hns.family/natjecanja/' || v.koda || '/x/'
  from countries d
  cross join (values
    ('hr-hns-treca-nl-istok', 'Treća NL Istok', 'Treća NL Istok', 'hns', '114514707', 1),
    ('hr-hns-4nl-zagreb-a', '4. NL Središte Zagreb A', '4. NL Središte Zag', 'hns', '114560831', 2),
    ('hr-hns-treca-nl-jug', 'Treća NL Jug', 'Treća NL Jug', 'hns', '114819896', 3),
    ('hr-bj-druga-znl', 'Druga ŽNL — Bjelovar', 'Druga ŽNL', 'zns-bjelovar', '114590136', 4),
    ('hr-bj-prva-znl', 'Prva ŽNL — Bjelovar', 'Prva ŽNL', 'zns-bjelovar', '114589941', 5),
    ('hr-bj-treca-znl-jug', 'Treća ŽNL Jug — Bjelovar', 'Treća ŽNL Jug', 'zns-bjelovar', '114590362', 6),
    ('hr-bj-treca-znl-sjever', 'Treća ŽNL Sjever — Bjelovar', 'Treća ŽNL Sjever', 'zns-bjelovar', '114590232', 7),
    ('hr-bp-1znl', '1. ŽNL — Brod', '1. ŽNL', 'zns-brod', '114499805', 8),
    ('hr-bp-2znl-istok', 'II. ŽNL Istok — Brod', 'II. ŽNL Istok', 'zns-brod', '114639988', 9),
    ('hr-bp-2znl-zapad', 'II. ŽNL Zapad — Brod', 'II. ŽNL Zapad', 'zns-brod', '114644390', 10),
    ('hr-bp-3znl-istok', 'III. ŽNL Istok — Brod', 'III. ŽNL Istok', 'zns-brod', '114671956', 11),
    ('hr-bp-3znl-zapad', 'III. ŽNL Zapad — Brod', 'III. ŽNL Zapad', 'zns-brod', '114696117', 12),
    ('hr-du-1-znl', '1. ŽNL — Dubrovnik', '1. ŽNL', 'zns-dubrovnik', '116746244', 13),
    ('hr-du-2-znl', '2. ŽNL — Dubrovnik', '2. ŽNL', 'zns-dubrovnik', '116748316', 14),
    ('hr-is-2znl-jug', '2. ŽNL Jug — Istra', '2. ŽNL Jug', 'zns-istra', '114706585', 15),
    ('hr-is-2znl-sjever', '2. ŽNL Sjever — Istra', '2. ŽNL Sjever', 'zns-istra', '114705867', 16),
    ('hr-ka-1-znl-nskz', '1. ŽNL NSKŽ — Karlovac', '1. ŽNL NSKŽ', 'zns-karlovac', '114772886', 17),
    ('hr-ka-2-znl-nskz', '2. ŽNL NSKŽ — Karlovac', '2. ŽNL NSKŽ', 'zns-karlovac', '114773942', 18),
    ('hr-kc-1znl', 'I. ŽNL — Koprivnica', 'I. ŽNL', 'zns-koprivnica', '114769264', 19),
    ('hr-kc-2znl', 'II. ŽNL — Koprivnica', 'II. ŽNL', 'zns-koprivnica', '114769393', 20),
    ('hr-kc-3znl', 'III. ŽNL — Koprivnica', 'III. ŽNL', 'zns-koprivnica', '114788098', 21),
    ('hr-kz-2-znl-kzz', '2. ŽNL KZŽ — Zagorje', '2. ŽNL KZŽ', 'zns-krapina-zagorje', '114651796', 22),
    ('hr-ls-ns-lsz', 'NS LSŽ — Lika', 'NS LSŽ', 'zns-lika', '115979433', 23),
    ('hr-mz-3mnl-a', 'III. Međimurska NL A', 'III. Međimurska NL', 'zns-medimurje', '114563361', 24),
    ('hr-mz-3mnl-b', 'III. Međimurska NL B', 'III. Međimurska NL', 'zns-medimurje', '114563438', 25),
    ('hr-ob-prva-znl-ob', 'Prva ŽNL OB — Osijek', 'Prva ŽNL OB', 'zns-osijek', '114526456', 26),
    ('hr-ps-1-znl', '1. ŽNL — Požega', '1. ŽNL', 'zns-pozega', '114720601', 27),
    ('hr-ps-2-znl', '2. ŽNL — Požega', '2. ŽNL', 'zns-pozega', '114721765', 28),
    ('hr-ri-1-znl', '1. ŽNL — Rijeka', '1. ŽNL', 'zns-rijeka', '115499925', 29),
    ('hr-ri-2-znl', '2. ŽNL — Rijeka', '2. ŽNL', 'zns-rijeka', '115502657', 30),
    ('hr-sm-1-znl', '1. ŽNL — Sisak', '1. ŽNL', 'zns-sisak', '114853614', 31),
    ('hr-sm-2-znl', '2. ŽNL — Sisak', '2. ŽNL', 'zns-sisak', '114831316', 32),
    ('hr-sm-2-znl-novska', '2. ŽNL Novska — Sisak', '2. ŽNL Novska', 'zns-sisak', '114618341', 33),
    ('hr-sm-4nl-srediste-b', '4. NL Središte B — Sisak', '4. NL Središte B', 'zns-sisak', '114413205', 34),
    ('hr-st-1-znl-nszsd', '1. ŽNL NSŽSD — Split', '1. ŽNL NSŽSD', 'zns-split', '116282429', 35),
    ('hr-st-2-znl-nszsd', '2. ŽNL NSŽSD — Split', '2. ŽNL NSŽSD', 'zns-split', '116936859', 36),
    ('hr-si-1-znl', '1. ŽNL — Šibenik', '1. ŽNL', 'zns-sibenik', '117164976', 37),
    ('hr-vz-2-znl-varazdin', '2. ŽNL Varaždin', '2. ŽNL Varaždin', 'zns-varazdin', '114676546', 38),
    ('hr-vz-3znl-ludbreg', '3. ŽNL Ludbreg — Varaždin', '3. ŽNL Ludbreg', 'zns-varazdin', '114679518', 39),
    ('hr-vz-3znl-varazdin', '3. ŽNL Varaždin', '3. ŽNL Varaždin', 'zns-varazdin', '114678634', 40),
    ('hr-vp-druga-znl-istok', 'Druga ŽNL Istok — Virovitica', 'Druga ŽNL Istok', 'zns-virovitica', '114701118', 41),
    ('hr-vp-druga-znl-zapad', 'Druga ŽNL Zapad — Virovitica', 'Druga ŽNL Zapad', 'zns-virovitica', '114701598', 42),
    ('hr-vp-premijer-znl', 'Premijer ŽNL — Virovitica', 'Premijer ŽNL', 'zns-virovitica', '114698735', 43),
    ('hr-vp-prva-znl', 'Prva ŽNL — Virovitica', 'Prva ŽNL', 'zns-virovitica', '114700007', 44),
    ('hr-vs-druga-znl-vinkovci', 'Druga ŽNL Vinkovci — Vukovar', 'Druga ŽNL Vinkovci', 'zns-vukovar', '114674425', 45),
    ('hr-vs-druga-znl-vukovar', 'Druga ŽNL Vukovar', 'Druga ŽNL Vukovar', 'zns-vukovar', '114670974', 46),
    ('hr-vs-druga-znl-zupanja', 'Druga ŽNL Županja — Vukovar', 'Druga ŽNL Županja', 'zns-vukovar', '114673615', 47),
    ('hr-vs-prva-znl', 'Prva ŽNL — Vukovar', 'Prva ŽNL', 'zns-vukovar', '114664633', 48),
    ('hr-vs-treca-znl-vinkovci', 'Treća ŽNL Vinkovci — Vukovar', 'Treća ŽNL Vinkovci', 'zns-vukovar', '114677809', 49),
    ('hr-zd-1-znl', '1. ŽNL — Zadar', '1. ŽNL', 'zns-zadar', '115235266', 50),
    ('hr-zd-2-znl', '2. ŽNL — Zadar', '2. ŽNL', 'zns-zadar', '115235735', 51),
    ('hr-zz-1zl', 'Jedinstvena prva županijska liga — Zagrebačka ž.', 'Jedinstvena prva ž', 'zns-zagrebacka', '114408517', 52),
    ('hr-zz-premier', 'Premier liga NSZŽ — Zagrebačka ž.', 'Premier liga NSZŽ', 'zns-zagrebacka', '114403031', 53),
    ('hr-bm-baranjska-liga', 'Baranjska liga — Beli Manastir', 'Baranjska liga', 'ns-beli-manastir', '114489192', 54),
    ('hr-bm-ii-znl-beli-manastir', 'II ŽNL Beli Manastir', 'II ŽNL Beli Manast', 'ns-beli-manastir', '114487921', 55),
    ('hr-dm-ii-znl-donji-miholjac', 'II. ŽNL Donji Miholjac', 'II. ŽNL Donji Miho', 'ns-donji-miholjac', '114414921', 56),
    ('hr-da-2-znl-dakovo', '2. ŽNL Đakovo', '2. ŽNL Đakovo', 'ns-dakovo', '114499145', 57),
    ('hr-da-liga-nsd', 'Liga NSĐ — Đakovo', 'Liga NSĐ', 'ns-dakovo', '114914039', 58),
    ('hr-ku-2-znl-kt', '2. ŽNL KT — Kutina', '2. ŽNL KT', 'ns-kutina', '114531697', 59),
    ('hr-na-2-znl-nasice', '2. ŽNL Našice', '2. ŽNL Našice', 'ns-nasice', '115182406', 60),
    ('hr-na-lns-nasice', 'LNS Našice', 'LNS Našice', 'ns-nasice', '114357636', 61),
    ('hr-ng-2znl-zapad', '2. ŽNL Zapad — Nova Gradiška', '2. ŽNL Zapad', 'ns-nova-gradiska', '114757437', 62),
    ('hr-os-2-znl-osijek', '2. ŽNL Osijek', '2. ŽNL Osijek', 'ns-osijek', '114558651', 63),
    ('hr-os-lns-osijek', 'LNS Osijek', 'LNS Osijek', 'ns-osijek', '115193958', 64),
    ('hr-sa-2znl-zapad', '2. ŽNL Zapad — Samobor', '2. ŽNL Zapad', 'ns-samobor', '115078392', 65),
    ('hr-va-ii-znl-valpovo', 'II ŽNL Valpovo', 'II ŽNL Valpovo', 'ns-valpovo', '114574562', 66),
    ('hr-va-iii-znl-valpovo', 'III ŽNL Valpovo', 'III ŽNL Valpovo', 'ns-valpovo', '114575374', 67)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HR'
on conflict (slug) do nothing;
