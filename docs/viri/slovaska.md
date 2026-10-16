# Slovaška

Vir `sportnet` (`scripts/viri/sportnet.mjs`) bere **javni API**, ki ga
uporablja futbalnet.sk (`sutaze.api.sportnet.online/api/v2`), ne HTML. Šifra
lige je `<appSpace>/<competitionId>[/<partId>]`; vsaka sezona ima svoj
competitionId, tekmovanje s skupinami (V. liga Sever/Juh) pa je več lig in
skupino izbere `partId`. Zapisnik prinese pozicijo in šifro ISSF vsakega
igralca, zato Slovaška ne čaka na glasovanje o pozicijah (stran Pozicije je
v meniju skrita); asistenc ni, kot pri nas. Avtogol je `goal` z vrsto
`dropped` in je zapisan pri ekipi strelca.

Uvoz vzame pozicijo iz **prvega** zapisnika, ki igralca vidi, in je ne spreminja:
kdor je bil lani drugje vratar, ostane GK (Ádám Erik, Želovce, 10/2026).
`scripts/uskladi-pozicije.mjs` (delovni tok *Uskladi pozicije*, najprej brez
`pisi`) jo popravi po večini letošnjih zapisnikov (vsaj dva glasova), privzeto
le vratar ↔ polje; DEF/MID/FWD med sabo le z `vse_pozicije`, ker klubi te
oznake pišejo ohlapno in menjava preračuna točke zadnjih 14 dni.

Vpisane so vse lige odraslih Stredoslovenského FZ in enajstih okresov pod njim
(27, migracija 20260926090000), **neaktivne**. Seznam lig z arhivom izpiše:

```bash
node scripts/slovaske-lige.mjs ssfz          # regija, lige, šifre, arhiv 2025/26
```

Pri desetih ligah arhiva po imenu ni najti (sponzor ali skupina se je
preimenovala) — šifro poišči ročno v `/public/<appSpace>/competitions`.

**Vse ostale slovaške lige** (pometanje vseh zvez 12. 10. 2026): migracija
20261012151100 vpiše 30 zvez in 78 lig odraslih (Niké liga, MONACObet liga,
III. liga po skupinah, BFZ, ZsFZ, VsFZ in vsi okresi pod njimi), migracija
20261012153100 34 lig U19 (I. in II. liga starší dorast, regijske in okresne
U19 z vsaj šestimi klubi); skupaj s SsFZ je Slovaška 154 lig, vse
**neaktivne**. appSpace-i zvez, ki jih stran zveze ne pove sama: Komárno
`obfz-komarno.futbalnet.sk`, Levice `obfz-levice.futbalnet.sk`, Trebišov
`obfz-trebisov.futbalnet.sk`, Svidník `ondavsky-futbalovy-zvaz.futbalnet.sk`
(stran zveze `ondavsky-oblastny-futbalovy-zvaz`), MFZ Košice `MFZ-Kosice`
(le mladinske lige — zveza ni vpisana), Niké liga `ulk.futbalnet.sk`, ostale
državne `futbalsfz.sk`.

Izpuščeno: pokali (Slovnaft Cup, okresni), ženske, futsal, U17 in mlajši,
kvalifikacije (ZsFZ VI. Severovýchod ima "Kvalifikačné stretnutie" kot svoj
del — šifra je zato z delom lige), lige z manj kot šestimi klubi (Prievidza
IX. A; U19 Košice-okolie MINI, Michalovce, Rožňava, Trebišov) in Poprad U19
"malé mužstvo 8+1".

- **Niké liga** piše kroge "7. kolo" (ostale "7"); vir jih bere s
  `krogIz`. Nadstavba (o titul, o obstanek) je v istem tekmovanju kot nova
  dela s krogi spet od 1, zato ima šifra del `Základná časť` in arhiv prav
  tako. Ob delitvi (po 22. krogu) jo je treba pripeti posebej — vir tega še
  ne zna (kot `+` pri `oefb`).
- **Arhiv** je izbran po skupnih klubih (1. krog ni pomemben, šteje vsa
  sezona); vsak arhiv ima ena sama liga. ZsFZ U19 IV. C1 in C2 sta lani bili
  ena skupina C — dobi jo C1, **C2 je brez arhiva**. Šibka arhiva:
  Trebišov 7. liga (lani 5 klubov, 3 skupni) in Prešov U19 6. liga (4 od 9).
- **Isto ime, drug klub**: klub se ujema po imenu (`kljucKlubaSk`), ne po
  ISSF. Pregled vseh 154 lig (tekoča sezona in arhivi, 1409 klubov) je našel
  le "FAM Poprad" z dvema organizacijama ISSF v istem okresu (isti klub,
  nova registracija) — ni trka. Ob novi sezoni preveri znova.

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| sk-nike-liga | 12 | `ulk.futbalnet.sk/6a18960d44ff24612efb0865/6a189f95b5f9fd8631502d6a` | `ulk.futbalnet.sk/685547e75a52cdc9435d81e6/685547e7bf40937d07404c50` (11) |
| sk-sfz-2liga | 16 | `futbalsfz.sk/6a0d921b5736165c0eab633c` | `futbalsfz.sk/6849d1b0eba10c40f7f790dc` (12) |
| sk-sfz-3liga-zapad | 16 | `futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c66c9a61a70ee926736` | `futbalsfz.sk/684025c89673e57cce43c96a/684025c70dabda15026f072d` (13) |
| sk-sfz-3liga-stred | 14 | `futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c81c9a61a70ee926737` | `futbalsfz.sk/684025c89673e57cce43c96a/684025c80dabda15026f072e` (12) |
| sk-sfz-3liga-vychod | 14 | `futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c9ec9a61a70ee926738` | `futbalsfz.sk/684025c89673e57cce43c96a/684025c70dabda15026f072c` (11) |
| sk-bfz-4liga | 16 | `BFZ/6a1201b044ff24612e96f228` | `BFZ/68453070eba10c40f77b3c7a` (13) |
| sk-bfz-5liga | 16 | `BFZ/6a1201f944ff24612e97a052` | `BFZ/68452feceba10c40f77a12db` (12) |
| sk-ba-6liga | 14 | `BA-mesto/6a23e9a0233cdeb1e71cfc2f` | `BA-mesto/684c832fe7ee690eb4708607` (9) |
| sk-ba-7liga | 9 | `BA-mesto/6a23e719233cdeb1e716a3ba` | `BA-mesto/6847d58deba10c40f7c625e5` (5) |
| sk-bav-6liga | 14 | `BA-vidiek/6a30ef8ee4bf1215246cc80d` | `BA-vidiek/68529e4a5a52cdc943952b0e` (12) |
| sk-bav-7liga | 7 | `BA-vidiek/6a310515e4bf1215248f7fc3` | `BA-vidiek/68529e435a52cdc943951d58` (5) |
| sk-zsfz-4liga | 16 | `ZsFZ/6a0fdf345736165c0e132e9a` | `ZsFZ/68483817eba10c40f7723690` (13) |
| sk-zsfz-5liga-juhovychod | 16 | `ZsFZ/6a0ff1ef5736165c0e3f366c` | `ZsFZ/684167109673e57cceb2c3d5` (13) |
| sk-zsfz-5liga-severozapad | 16 | `ZsFZ/6a0ff21f5736165c0e3fa12b` | `ZsFZ/684ea203e7ee690eb44c6121` (11) |
| sk-zsfz-6liga-sever | 14 | `ZsFZ/6a0ff3395736165c0e424726` | `ZsFZ/6842f06eeba10c40f74da585` (14) |
| sk-zsfz-6liga-severovychod | 16 | `ZsFZ/6a0ff3155736165c0e41f151/6a0ff3153bff416b52e1d022` | `ZsFZ/6842f16beba10c40f74f9130` (13) |
| sk-zsfz-6liga-stred | 14 | `ZsFZ/6a0ff2525736165c0e4014cd` | `ZsFZ/684bfa6fe7ee690eb490d156` (13) |
| sk-zsfz-6liga-vychod | 16 | `ZsFZ/6a0ff2845736165c0e4082f9` | `ZsFZ/684292c6eba10c40f7aa38c8` (12) |
| sk-zsfz-6liga-zapad | 15 | `ZsFZ/6a0ff2d65736165c0e4155e3` | `ZsFZ/6842940deba10c40f7ac686d` (10) |
| sk-zsfz-6liga-juh | 10 | `ZsFZ/6a0ff2a75736165c0e40d814` | `ZsFZ/684bfaf6e7ee690eb491b146` (8) |
| sk-nz-7liga | 16 | `ObFZ-Nove-Zamky/6a1de63f44ff24612e84982b` | `ObFZ-Nove-Zamky/684092bc9673e57cce273ba9` (13) |
| sk-nz-8liga | 13 | `ObFZ-Nove-Zamky/6a1de6db44ff24612e858d41` | `ObFZ-Nove-Zamky/684093609673e57cce288361` (11) |
| sk-tt-7liga | 14 | `ObFZ-Trnava/6a26ec1f233cdeb1e7bba90d` | `ObFZ-Trnava/684c1adee7ee690eb4cb9308` (12) |
| sk-tt-8liga-maxima | 14 | `ObFZ-Trnava/6a26eef5233cdeb1e7bfcfcc` | `ObFZ-Trnava/68432737eba10c40f7b16aae` (11) |
| sk-tt-8liga-rubbex | 13 | `ObFZ-Trnava/6a26edb8233cdeb1e7bde2ad` | `ObFZ-Trnava/684ace3ce7ee690eb4c19c5c` (11) |
| sk-tt-9liga | 14 | `ObFZ-Trnava/6a26efb9233cdeb1e7c0fd58` | `ObFZ-Trnava/68499d1feba10c40f793fb62` (10) |
| sk-tn-7liga | 15 | `ObFZTrencin/6a217b1f233cdeb1e76426f4` | `ObFZTrencin/684ab00ae7ee690eb48f22b9` (13) |
| sk-tn-8liga-sever | 12 | `ObFZTrencin/6a217b8e233cdeb1e7653743` | `ObFZTrencin/68529e3d5a52cdc943950c47` (11) |
| sk-tn-8liga-juh | 9 | `ObFZTrencin/6a217b51233cdeb1e764b240` | `ObFZTrencin/68529e3f5a52cdc943951232` (8) |
| sk-tn-9liga | 13 | `ObFZTrencin/6a217bc4233cdeb1e765aee8` | `ObFZTrencin/68529e3c5a52cdc943950b2a` (11) |
| sk-ds-7liga | 16 | `obfz-dunajska-streda/6a17fb9d44ff24612ecf19e4` | `obfz-dunajska-streda/6849c020eba10c40f7d2cbed` (13) |
| sk-ds-8liga | 10 | `obfz-dunajska-streda/6a3046abe4bf12152410590e` | `obfz-dunajska-streda/684127989673e57cce38ef96` (9) |
| sk-ga-7liga-a | 10 | `obfz-galanta.futbalnet.sk/6a2c0666e4bf121524a0bdb4/6a350bbe0b755716bcd9b03d` | `obfz-galanta.futbalnet.sk/68429b32eba10c40f7b810ca/6870c74abf40937d075d8961` (9) |
| sk-ga-7liga-b | 10 | `obfz-galanta.futbalnet.sk/6a2c0666e4bf121524a0bdb4/6a4e2e0cbd81013dc7a6938e` | `obfz-galanta.futbalnet.sk/68429b32eba10c40f7b810ca/6870c6d4bf40937d075d8936` (9) |
| sk-kn-7liga | 14 | `obfz-komarno.futbalnet.sk/6a2667b4233cdeb1e7bf8ecb` | `obfz-komarno.futbalnet.sk/685272505a52cdc9434e5ea9` (13) |
| sk-lv-7liga | 13 | `obfz-levice.futbalnet.sk/6a26a26b233cdeb1e73686ef` | `obfz-levice.futbalnet.sk/6846ba2beba10c40f7ff39af` (11) |
| sk-lv-8liga | 12 | `obfz-levice.futbalnet.sk/6a26a2ea233cdeb1e7378075` | `obfz-levice.futbalnet.sk/6846bab8eba10c40f7005641` (11) |
| sk-nr-7liga | 16 | `obfz-nitra.futbalnet.sk/6a1f41cc233cdeb1e7206aec` | `obfz-nitra.futbalnet.sk/684fde8b5a52cdc943396059` (13) |
| sk-nr-8liga-a | 14 | `obfz-nitra.futbalnet.sk/6a1f420b233cdeb1e720ca7c` | `obfz-nitra.futbalnet.sk/685145fe5a52cdc943855f84` (12) |
| sk-nr-8liga-b | 13 | `obfz-nitra.futbalnet.sk/6a1f4269233cdeb1e721462c` | `obfz-nitra.futbalnet.sk/684ac7aae7ee690eb4b6fe51` (12) |
| sk-pb-7liga | 14 | `obfz-povazska-bystrica.futbalnet.sk/6a0ea6b45736165c0eaa9d93` | `obfz-povazska-bystrica.futbalnet.sk/68529e435a52cdc943951d7b` (12) |
| sk-pb-8liga | 10 | `obfz-povazska-bystrica.futbalnet.sk/6a0ea7c85736165c0eac8ef6` | `obfz-povazska-bystrica.futbalnet.sk/68529e405a52cdc943951727` (7) |
| sk-pd-7liga | 14 | `obfz-prievidza/6a16fb0144ff24612e412a4c` | `obfz-prievidza/684af3f2e7ee690eb4fd4c43` (10) |
| sk-pd-8liga-a | 12 | `obfz-prievidza/6a16fcd944ff24612e4478f8` | `obfz-prievidza/684af40ee7ee690eb4fd7309` (8) |
| sk-pd-8liga-b | 14 | `obfz-prievidza/6a1893a344ff24612ef44956` | `obfz-prievidza/684af431e7ee690eb4fda7e1` (12) |
| sk-pd-9liga-b | 10 | `obfz-prievidza/6a18949b44ff24612ef6facb` | `obfz-prievidza/684af450e7ee690eb4fdd3cc` (8) |
| sk-se-7liga | 12 | `obfz-senica.futbalnet.sk/6a2bfb69e4bf1215248a0202` | `obfz-senica.futbalnet.sk/684c3ebce7ee690eb404d7fa` (9) |
| sk-se-8liga | 12 | `obfz-senica.futbalnet.sk/6a2bfaa3e4bf12152488a64b` | `obfz-senica.futbalnet.sk/684c3deae7ee690eb4039424` (9) |
| sk-se-9liga | 9 | `obfz-senica.futbalnet.sk/6a2bf998e4bf12152486cd98` | `obfz-senica.futbalnet.sk/684c3d51e7ee690eb402a83f/685420d8bf40937d0740498b` (5) |
| sk-to-7liga | 8 | `obfz-topolcany.futbalnet.sk/6a27bb4b225470a9beffaacf` | `obfz-topolcany.futbalnet.sk/68529e485a52cdc9439527ed` (6) |
| sk-to-8liga | 9 | `obfz-topolcany.futbalnet.sk/6a27bd6c225470a9be02d35c` | `obfz-topolcany.futbalnet.sk/68529e425a52cdc943951bae` (7) |
| sk-vsfz-4liga | 14 | `VsFZ/6a0f09fd5736165c0e627a32` | `VsFZ/684f236a5a52cdc943166993` (11) |
| sk-vsfz-5liga-sever | 14 | `VsFZ/6a5df775705f8e9a4940e79b` | `VsFZ/684f23785a52cdc943168833` (11) |
| sk-vsfz-5liga-juh | 14 | `VsFZ/6a0f0a525736165c0e6330fd` | `VsFZ/684f23855a52cdc94316a5e1` (10) |
| sk-vsfz-6liga-kg | 14 | `VsFZ/6a0f0a745736165c0e637097` | `VsFZ/684f23905a52cdc94316bd2a` (12) |
| sk-vsfz-6liga-pt | 14 | `VsFZ/6a0f0b285736165c0e64e8f7` | `VsFZ/6846d95deba10c40f73fcc03` (12) |
| sk-vsfz-6liga-sarisska | 14 | `VsFZ/6a0f0b5a5736165c0e655762` | `VsFZ/6846daf2eba10c40f742ea26` (12) |
| sk-vsfz-6liga-vd | 14 | `VsFZ/6a0f0b0b5736165c0e64adc1` | `VsFZ/684f23a95a52cdc94316f802` (12) |
| sk-vsfz-6liga-zemplinska | 14 | `VsFZ/6a0f0a8c5736165c0e63a24f` | `VsFZ/68454f1ceba10c40f7d3cdbb` (10) |
| sk-ks-7liga | 10 | `ObFZ-KE-okolie/6a267bc4233cdeb1e7e92ff0` | `ObFZ-KE-okolie/68500a2c5a52cdc9438c30e7` (8) |
| sk-ks-8liga | 7 | `ObFZ-KE-okolie/6a267c12233cdeb1e7e9dd03` | `ObFZ-KE-okolie/68529e415a52cdc94395190e` (4) |
| sk-pp-7liga | 14 | `ObFZ-Poprad/6a27cd57225470a9be1a7686` | `ObFZ-Poprad/6847ff97eba10c40f7088114` (12) |
| sk-pp-8liga | 8 | `ObFZ-Poprad/6a27cec3225470a9be1ca9fa` | `ObFZ-Poprad/6847ffb7eba10c40f708b582` (6) |
| sk-po-7liga | 14 | `ObFZ-Presov/6a22a6e7233cdeb1e729518b` | `ObFZ-Presov/6849bf45eba10c40f7d00ea7` (11) |
| sk-po-8liga | 12 | `ObFZ-Presov/6a22a723233cdeb1e729a3d3` | `ObFZ-Presov/6849bf88eba10c40f7d142ac` (9) |
| sk-po-9liga | 8 | `ObFZ-Presov/6a22a751233cdeb1e729e761` | `ObFZ-Presov/6849bfbeeba10c40f7d1cc16` (5) |
| sk-bj-7liga | 12 | `obfz-bardejov.futbalnet.sk/6a1e683444ff24612e3a21db` | `obfz-bardejov.futbalnet.sk/684674b8eba10c40f7699dbd` (9) |
| sk-bj-8liga | 9 | `obfz-bardejov.futbalnet.sk/6a1e68c344ff24612e3b2ed6` | `obfz-bardejov.futbalnet.sk/68529e3c5a52cdc943950b1a` (6) |
| sk-he-7liga | 14 | `obfz-humenne.futbalnet.sk/6a22c028233cdeb1e751845c` | `obfz-humenne.futbalnet.sk/684939f0eba10c40f7ed4dbc` (13) |
| sk-he-8liga | 8 | `obfz-humenne.futbalnet.sk/6a22c0b9233cdeb1e7526067` | `obfz-humenne.futbalnet.sk/68493b79eba10c40f7ef81e0` (8) |
| sk-mi-7liga-a | 8 | `obfz-michalovce/6a2fb735e4bf121524fb09e2` | `obfz-michalovce/684fbcb75a52cdc943fb78c4/684fbd279db12b1dbe8c5f47` (7) |
| sk-mi-7liga-b | 8 | `obfz-michalovce/6a2fb757e4bf121524fb4974` | `obfz-michalovce/684fbd5d5a52cdc943fc8861` (7) |
| sk-rv-7liga | 13 | `obfz-roznava.futbalnet.sk/6a2bdb09e4bf1215244cde54` | `obfz-roznava.futbalnet.sk/6847ef6eeba10c40f7eec824` (13) |
| sk-sl-7liga | 6 | `obfz-stara-lubovna.futbalnet.sk/6a1c356444ff24612eed70b6` | `obfz-stara-lubovna.futbalnet.sk/68926983affe0f1eee4b9a27` (6) |
| sk-tv-7liga | 10 | `obfz-trebisov.futbalnet.sk/6a2e535ce4bf121524150c48` | `obfz-trebisov.futbalnet.sk/68508b475a52cdc9437c695d` (3) |
| sk-vt-7liga | 7 | `obfz-vranov-nad-toplou.futbalnet.sk/6a1e8e2d44ff24612e879ec5` | `obfz-vranov-nad-toplou.futbalnet.sk/6850fbd15a52cdc9430a53bb` (6) |
| sk-sk-7liga | 10 | `ondavsky-futbalovy-zvaz.futbalnet.sk/6a1d3ce044ff24612e48b0dd` | `ondavsky-futbalovy-zvaz.futbalnet.sk/685105d85a52cdc943199420` (10) |
| sk-sn-7liga | 14 | `sofz-spisska-nova-ves.futbalnet.sk/6a2ffe06e4bf1215247c8fb4` | `sofz-spisska-nova-ves.futbalnet.sk/68510a3c5a52cdc943205e2c` (12) |
| sk-sfz-u19-1liga | 14 | `futbalsfz.sk/6a0da2685736165c0ec8545b` | `futbalsfz.sk/6849d660e7ee690eb457bf2d` (12) |
| sk-sfz-u19-2liga-zapad | 16 | `futbalsfz.sk/6a0da4525736165c0ecc3551/6a17407fc9a61a70ee926749` | `futbalsfz.sk/684d6386e7ee690eb4e6d4c6/684d63869db12b1dbe8c5b81` (11) |
| sk-sfz-u19-2liga-vychod | 16 | `futbalsfz.sk/6a0da4525736165c0ecc3551/6a174094c9a61a70ee92674a` | `futbalsfz.sk/684d6386e7ee690eb4e6d4c6/684d63869db12b1dbe8c5b82` (14) |
| sk-bfz-u19-3liga | 12 | `BFZ/6a12024444ff24612e986fe3` | `BFZ/68452fa6eba10c40f77975c3` (10) |
| sk-bav-u19 | 17 | `BA-vidiek/6a310851e4bf12152494c907` | `BA-vidiek/68529e365a52cdc94394f9a9` (9) |
| sk-zsfz-u19-3liga-sz | 16 | `ZsFZ/6a0ff3605736165c0e429b58/6a0ff3603bff416b52e1d025` | `ZsFZ/6841675c9673e57cceb36ce1/6841675c0dabda15026f09a1` (12) |
| sk-zsfz-u19-3liga-jv | 16 | `ZsFZ/6a0ff3605736165c0e429b58/6a0ff3603bff416b52e1d024` | `ZsFZ/6841675c9673e57cceb36ce1/6841675c0dabda15026f09a2` (11) |
| sk-zsfz-u19-4liga-a | 11 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02d` | `ZsFZ/6844443feba10c40f7a8db50/6844443f1542852f3453efd9` (9) |
| sk-zsfz-u19-4liga-b | 13 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02b` | `ZsFZ/6844443feba10c40f7a8db50/685d676ebf40937d07405e60` (11) |
| sk-zsfz-u19-4liga-c1 | 9 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02a` | `ZsFZ/6844443feba10c40f7a8db50/685d69b6bf40937d07405e61` (7) |
| sk-zsfz-u19-4liga-c2 | 9 | `ZsFZ/6a0ff3a55736165c0e43378a/6a46147fc89d6650f060c7e2` | — |
| sk-zsfz-u19-4liga-d | 16 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02c` | `ZsFZ/6844443feba10c40f7a8db50/685d6bcfbf40937d07405e66` (14) |
| sk-zsfz-u19-4liga-e | 8 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d029` | `ZsFZ/6844443feba10c40f7a8db50/685d6e08bf40937d07405e6e` (6) |
| sk-zsfz-u19-4liga-f | 16 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d028` | `ZsFZ/6844443feba10c40f7a8db50/685d6f5ebf40937d07405e6f` (14) |
| sk-nz-u19 | 7 | `ObFZ-Nove-Zamky/6a1de75844ff24612e865cdf` | `ObFZ-Nove-Zamky/6840941f9673e57cce29ef12` (5) |
| sk-tt-u19 | 11 | `ObFZ-Trnava/6a26f0b5233cdeb1e7c2a346` | `ObFZ-Trnava/6843277beba10c40f7b1d6a3` (9) |
| sk-tn-u19 | 14 | `ObFZTrencin/6a217bfc233cdeb1e76636a7` | `ObFZTrencin/68529e335a52cdc94394f2fb` (11) |
| sk-ds-u19 | 8 | `obfz-dunajska-streda/6a17fb8444ff24612ecef142` | `obfz-dunajska-streda/684bd2f4e7ee690eb44d4698` (8) |
| sk-ga-u19 | 12 | `obfz-galanta.futbalnet.sk/6a2c0875e4bf121524a4b3ba` | `obfz-galanta.futbalnet.sk/684dc78fe7ee690eb4c89778` (8) |
| sk-pb-u19 | 12 | `obfz-povazska-bystrica.futbalnet.sk/6a0ea8575736165c0ead9c38` | `obfz-povazska-bystrica.futbalnet.sk/684b0bf1e7ee690eb4265192` (10) |
| sk-pd-u19 | 16 | `obfz-prievidza/6a1895fa44ff24612efadd4c` | `obfz-prievidza/684af46be7ee690eb4fe0132` (12) |
| sk-vsfz-u19-3liga-a | 13 | `VsFZ/6a0f0c905736165c0e67cffd/6a1415883bff416b52e1d814` | `VsFZ/68482dd5eba10c40f7607731/6870bf05bf40937d075d83fa` (10) |
| sk-vsfz-u19-3liga-b | 13 | `VsFZ/6a0f0c905736165c0e67cffd/6a3910eb0b755716bcd9c05a` | `VsFZ/68482dd5eba10c40f7607731/68482dd5de64929471ba8501` (8) |
| sk-vsfz-u19-4liga-kg | 10 | `VsFZ/6a0f0cee5736165c0e68aac6` | `VsFZ/684afbbfe7ee690eb409db58` (7) |
| sk-vsfz-u19-4liga-pt | 14 | `VsFZ/6a0f0d485736165c0e6977ab` | `VsFZ/6846db9beba10c40f74430b7` (11) |
| sk-vsfz-u19-4liga-sarisska | 13 | `VsFZ/6a0f0d2b5736165c0e693c5b` | `VsFZ/68429280eba10c40f7a9d12c` (12) |
| sk-vsfz-u19-4liga-vd | 9 | `VsFZ/6a0f0ccb5736165c0e6859bd` | `VsFZ/684c6c20e7ee690eb44cfe00` (9) |
| sk-vsfz-u19-4liga-z | 11 | `VsFZ/6a0f0d145736165c0e68fd63` | `VsFZ/68455c91eba10c40f7f49bc1` (7) |
| sk-po-u19-5liga | 9 | `ObFZ-Presov/6a22a78d233cdeb1e72a3aa4` | `ObFZ-Presov/6849bff7eba10c40f7d261ad` (7) |
| sk-po-u19-6liga | 9 | `ObFZ-Presov/6a22a7bc233cdeb1e72a7d80` | `ObFZ-Presov/6849c033eba10c40f7d2f67c` (4) |
| sk-bj-u19 | 7 | `obfz-bardejov.futbalnet.sk/6a1e693444ff24612e3bf23d` | `obfz-bardejov.futbalnet.sk/68467595eba10c40f76b4819` (7) |
| sk-vt-u19 | 10 | `obfz-vranov-nad-toplou.futbalnet.sk/6a1e8e4644ff24612e87dee7` | `obfz-vranov-nad-toplou.futbalnet.sk/68510e9f5a52cdc943276dac` (7) |
| sk-sk-u19 | 7 | `ondavsky-futbalovy-zvaz.futbalnet.sk/6a1d3d3a44ff24612e4977db` | `ondavsky-futbalovy-zvaz.futbalnet.sk/684fbc795a52cdc943fb18ad` (6) |
| sk-sn-u19 | 7 | `sofz-spisska-nova-ves.futbalnet.sk/6a2ffd43e4bf1215247b525e` | `sofz-spisska-nova-ves.futbalnet.sk/68510bb65a52cdc94322bef4` (5) |

**Vklop slovaške lige v produkciji:** delovni tok *Uvoz lige (rocno)* z
`liga = sk-…`, `arhiv = <šifra 2025/26>`, `tekoca` in `cene`; nato
`pripravljenost-lige` in `update competitions set active = true …`.

Podatke beremo brez izrecnega dovoljenja SFZ/Sportnet, zato odkrito in
vljudno: glava `User-Agent: SLFF fantasy (https://slff.eu)`, 300 ms med
zahtevki, nespremenjenih zapisnikov ne beremo znova, vir (`vir_ime`,
`vir_url` → futbalnet.sk) je v nogi vsake strani. Če nas prosijo, naj nehamo,
slovaške lige izklopimo.

Grbe slovaških klubov prinese `scripts/grbi-sportnet.mjs` (klub sam naloži grb
v ISSF, `organization.logo_public_url`) — delovni tok *Grbi klubov* z
`vir = sportnet`. Po uvozu nove slovaške lige ga poženi znova.

Jezik vmesnika sledi državi lige (`src/i18n/sk/`, `JEZIK_DRZAVE`), razen izbire
jezika in tujca (glej *Prevodi*); šifra lige
zunaj Slovenije se začne s kodo države (`sk-…`), da jezik ob nalaganju ve,
katero državo gleda.
