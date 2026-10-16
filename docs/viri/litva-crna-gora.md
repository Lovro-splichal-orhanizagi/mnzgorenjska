# Litva in Črna gora — vira `ltfutbolas` in `fscg` (predloga COMET Auris)

Obe spletišči (in fscg.me z državnimi ligami) izrišeta podatke COMET s
strežnika v isti predlogi podjetja Auris kot lff.lv, zato imata skupen razčlenjevalnik
(`scripts/viri/comet-auris.mjs`) in vsak svoj tanek vir. Državi `LT`
("Lietuva") in `ME` ("Crna Gora") vpiše migracija lig (20261016091300).
Šifre lig se začnejo z `lt-` oziroma `me-`. Uvoz za ligo ne potrebuje ničesar
več.

**Črna gora** dobi srbski vmesnik v latinici (`JEZIK_DRZAVE.ME = 'sr'`,
ekavski; črnogorščina je ijekavska, zato je to kompromis do lastnega
prevoda), vstop `slff.eu/me`, kartico ob deljenju `me.html` (Caddy jo vrne za `/me` in `?t=me-…`, tudi rezerva `:3201`, `vercel.json`), srbsko vejo pošte (rok po podgoriško, kot Ljubljana),
črnogorska imena lastnikov hišnih ekip in `klub_stik.drzava` (migracija
20261016213700), `IMENA_ME` v *Hisne ekipe* in `ME` v matriki nočnega uvoza (en koš).
Ugib: IP, brskalnik `sr-ME`, `sr-Latn-ME`, `cnr` ali pas `Europe/Podgorica`
(cela oznaka ima prednost pred osnovo, `sr-RS` ostane Srbija). **Litve še
ni**: vmesnika v litovščini, kartice in pošte ni, `LT` ni v matriki nočnega
uvoza; oboje pred vklopom.

- **Stran tekmovanja**: zavihek vseh tekem `table.fixtures style2`, krogi
  `tr.th1` ("14. turas", "5. kolo"), tekma je vrstica z `data-id` (id tekme
  COMET). Litva: datum `YYYY-MM-DD` in ura v celicah, klub kot povezava
  `/klubai/<slug>-<id>/?cid=<tekmovanje>` s `title`, izid v povezavi
  `/rungtynes/<slug>-<id>/` ("-" = neodigrana). Črna gora: `div.date`
  "05.09.2026.", `div.time`, klub v `<span>` ob izidu (regije) ali kot
  povezava `/klubovi/<slug>-<id>/?cid=` (fscg.me), povezava
  `/utakmice/<slug>-<id>/` (sicer "-"). Izid brez povezave je kontumacija.
- **Zapisnik** (`table.teams`): vrstice `firstteam` in `bench`, v vsaki
  igralec domačih, dres, prazno, dres, igralec gostov; prazno mesto je "-".
  "(G)" vratar (tudi rezervni), "(C)" kapetan. Dogodki `ul.events li.<vrsta>`
  z minuto — Litva in fscg.me besedilo "46'", regije `div.minute`: `goal`,
  **`penalty` (gol z 11 m — razred ni `goal`)**, `own_goal` (pri strelčevi
  ekipi, šteje nasprotniku), `penalty_failed`, `yellow`, `second_yellow` (prvi
  rumeni je svoj dogodek → 1 rumeni + 1 rdeči), `red`, `substitutionIn`/
  `substitutionOut` — **minute so točne**, menjave v parih po minuti. Rumeni
  brez minute se zgodi (opozorilo). Polčasa stran ne pove. Kartoni trenerjev
  niso v protokolu.
- Ime "Ime Priimek" → "Priimek Ime". Šifra zapisnika v bazi je `lt<id>` in
  `me<id>` (COMET drugih zvez ima iste številke). Kontumacija: 3:0 / 0:3,
  starejša od tedna, z zapisnikom brez postave ene ekipe (Igalo : Cetinje,
  Jug 2026/27) — `vir.kontumacije`.
- Ključ kluba ohrani krajevne znake; kratko ime brez FK/FC/FKS/FSK, **OFK
  ostane** (Sjever: "Gusinje" in "OFK Gusinje" sta dva kluba).
- *Uskladi pozicije* z `vir = ltfutbolas` ali `fscg` (vratar po večini tekem).
- **Predpomnilnik** (`zaPredpomnilnik`): shrani se le prava stran tekmovanja
  (`table.fixtures`) ali tekme (`matchHeader`); stran vzdrževanja ali napake
  s statusom 200 ne gre vanj in uvoz jo prebere znova.
- **Zavrnitev** (403, 429, izziv) med branjem kontumacij v uvozu razporeda ni
  več "nadaljujem brez njih", ampak `CometZavrnitev` in izhod 4.

**Litva — `ltfutbolas`** (lietuvosfutbolas.lt, portal rezultatov LFF):

- **Sezona je koledarsko leto** (februar–november, `sezona_koledarska`, "2026"),
  iz datumov razporeda. Ura je vilenska (EET) → ljubljanska −1 h, v razporedu
  in v zapisniku (`vCas` v `delVira`).
- **Šifra lige je id tekmovanja COMET** (`/varzybos/<id>/<slug>/`, slug je
  okras); vsaka sezona svoj. `/varzybos/megeju/<slug>/` kaže le tekočo
  sezono, zato beremo po id-ju in preverimo, da povezave klubov nosijo isti
  `?cid=` (drugače se uvoz ustavi).
- Vsak igralec ima povezavo `/zaidejai/<slug>-<id>/` → `reg_st`.
- **Arhiv**: izbirnika sezon ni. Id-je prejšnjih sezon da posnetek strani
  `/varzybos/vyru/<liga>/` na web.archive.org (`?cid=`), stran
  `/varzybos/<id>/lyga/` jih izriše: 2025 A lyga `20647154`, I lyga
  `20673132`. Za II lyga 2025 posnetkov ni (2022: II lyga I etapas
  `11644164`, 1–10 v. `13334048`, 11–18 v. `13339888`) — cene iz tekoče sezone.
- A lyga se je 2026 preimenovala v **TOPLYGA** (9 klubov, 36 krogov); I lyga je
  "I lyga remiama TOPsport". Naslov tekmovanja letnice nima, sezona pride z razporeda.
- Vilniaus BFA ima v COMET dva kluba (#36093 v 2025, #1511 v 2026) z istim
  imenom; ključ kluba je ime, zato je pri nas en klub (tako je prav).
- KLFF in ŠAFF-PAFF III lyga nimata ločitve začetniki/klop; vilniausfutbolas.lt
  nima menjav; lff.lt ima prazne tabele postav (raziskava 15. 10. 2026).

**Črna gora — `fscg`** (državne lige na fscg.me, Treća liga na regijskih
poddomenah centar, sjever, jug):

- Sezona jesen–pomlad ("2026/27"), čas je ljubljanski.
- **Šifra lige je `<regija>/<slug>/<id tekmovanja>`**
  (`centar/seniorska-liga/9331975`); regija **`fscg`** je fscg.me sam
  (`fscg/meridianbet-1-cfl/9278739`). Stran `/takmicenja/<slug>/` kaže le
  tekočo sezono; ko pokaže drug id (`data-genid`), se uvoz ustavi in šifro je
  treba popraviti.
- **Arhiv: `<regija>/arhiva/<id>`** → `/takmicenja/arhiva/?cid=<id>` na
  regijski poddomeni. Ta stran izriše **katerokoli** tekmovanje COMET po id-ju
  (v isti predlogi, varovalo `data-genid` velja), čeprav meni "Arhiva
  takmičenja" našteje le stare državne lige (do 2018/19) in fscg.me nobene
  regijske. Id-ji prejšnjih sezon so iz posnetkov strani lige na
  web.archive.org (`data-genid`); neznan id stran vrne s 200, zato id presodi
  vsebina (genid, ime, datumi), ne status.
- Igralci nimajo povezav na profil: identiteta je ime + klub (kot fss).
  fscg.me da povezavo `/igraci/<slug>-<id>/` le nekaterim igralcem
  (reprezentantom, kot lff.lv `/speletaji/`) — ni šifra, ker bi isti igralec
  dobil dve vrstici; šifro beremo le z litovskega `/zaidejai/`.
- **Prva omladinska liga** (U19, `prvi_fantasy_krog = 2`, `rok_pomak_ur = 2`):
  po ligaškem delu se razdeli na plej-of in plej-aut, ki sta **svoji
  tekmovanji** (2025/26: `8980717`, `8981167`; strani arhiva ju ne izrišeta v
  obliki z razporedom). Uvažamo le ligaški del; ko stran pokaže drug id, se
  uvoz ustavi. Druga omladinska liga (`9313718`, 12 klubov) ni vpisana.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** Nobeno spletišče nima
robots.txt (`/robots.txt` preusmeri na naslovnico), izziva ni bilo. Pogojev
uporabe nismo našli; LT noga "Visos teisės saugomos". Dovoljenja LFF ali
FSCG nimamo (za LFF raziskava priporoča vljudnostni mail). Beremo odkrito
(`User-Agent: SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki,
zapisnikov, starejših od tedna, ne beremo znova — do 45 dni le, če shranjena
stran nima postav ali se goli ne ujemajo z izidom: `zapisnikSvez` v
`comet-auris.mjs`, isto pri `lff`). **Ob izzivu, CAPTCHI, 403
ali 429 se uvoz ustavi — ne obhajaj** (`CometZavrnitev`, izhod 4). Sodnikov,
delegatov in gledalcev ne beremo; vzorci `scripts/vzorci/lt-ltfutbolas-*`,
`me-fscg-*` so brez njih.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo; po 8 tekem na ligo —
zadnje in najbolj zadetkovne; KAFF-MAFF 20):

| liga | tekem | goli = izid | postav po 11 | menjav | ekip brez menjav | 990 minut |
|---|---|---|---|---|---|---|
| II lyga A (`23383524`) | 8 | 54/54 (8/8) | 16/16 | 49 | 0 | 13/16 (6 rdečih) |
| II lyga B (`23384849`) | 8 | 70/70 (8/8) | 16/16 | 52 | 0 | 13/16 (3 rdeči) |
| KAFF-MAFF III (`23832343`) | 20 | 126/126 (20/20) | 39/40 | 23 | **24/40** | 36/40 |
| Centar (`9331975`) | 8 | 78/78 (8/8) | 16/16 | 62 | 1 | 16/16 |
| Sjever (`9344268`) | 8 | 63/63 (8/8) | 15/16 | 55 | 1 | 12/16 |
| Jug (`9391667`) | 8 (1 kontumacija) | 45/45 (7/7) | 13/14 | 43 | 2 | 13/14 |

Vratar (G) je bil pri vseh postavah, litovski nastopi vsi s šifro.

Preizkus državnih lig v živo (15. 10. 2026, brez pisanja v bazo, 3,5 s med
zahtevki; LT po 30 tekem tekoče sezone — zadnje in najbolj zadetkovne — in po
15 arhiva, ME **vsi** zapisniki tekoče sezone in po 15 arhiva):

| liga | tekem / zapisnikov | goli = izid | postav po 11 | vratar | menjav (nastopov s klopi) | ekip brez menjav | 990 minut |
|---|---|---|---|---|---|---|---|
| A lyga 2026 (`23198513`) | 30 / 30 | 120 (30/30) | 60/60 | 60/60 | 268 (252) | 0 | 59/60 (1 rdeči) |
| I lyga 2026 (`23198632`) | 30 / 30 | 138 (30/30) | 60/60 | 60/60 | 258 (253) | 0 | 56/60 (4 rdeči) |
| A lyga 2025 (`20647154`) | 15 / 15 | 74 (15/15) | 30/30 | 30/30 | 138 (130) | 0 | 29/30 (1 rdeči) |
| I lyga 2025 (`20673132`) | 15 / 15 | 82 (15/15) | 30/30 | 30/30 | 138 (134) | 0 | 26/30 (4 rdeči) |
| 1. CFL 26/27 (`9278739`) | 48 / 48 | 103 (48/48) | 96/96 | 96/96 | 426 (408) | 0 | 90/96 (6 rdečih) |
| 2. CFL 26/27 (`9279699`) | 54 / 54 | 145 (54/54) | 108/108 | 108/108 | 483 (471) | 0 | 100/108 (8 rdečih) |
| Prva omladinska 26/27 (`9312757`) | 32 / 32 | 125 (32/32) | 64/64 | 64/64 | 353 (335) | 0 | 59/64 (5 rdečih) |
| 1. CFL 2025/26 (`fscg/arhiva/8208775`) | 15 / 15 | 69 (15/15) | 30/30 | 30/30 | 141 (141) | 0 | 27/30 (3 rdeči) |
| 2. CFL 2025/26 (`fscg/arhiva/8208777`) | 15 / 15 | 70 (15/15) | 30/30 | 30/30 | 126 (122) | 0 | 30/30 |
| Prva omladinska 2025/26 (`fscg/arhiva/8231702`) | 15 / 15 | 94 (15/15) | 30/30 | 30/30 | 142 (140) | 0 | 29/30 (1 rdeči) |

Litovski nastopi so vsi s šifro (928 + 918 + 468 + 468), črnogorski brez.
Kontumacij v razporedih državnih lig ni. Edino opozorilo: rumeni brez minute
(A lyga, 24325679). Arhivi: A lyga 2025 180 tekem (10 klubov), I lyga 2025
240 (16), 1. in 2. CFL 2025/26 po 180 (10), Prva omladinska 2025/26 72 (9),
vse z zapisnikom.

**Trki imen** (15. 10. 2026, vse lige obeh držav, tekoče in arhivi, po
ključu kluba in šifri kluba COMET): ni jih. Ponovljena imena so isti klub
(napredovanje, izpad, mladinska ekipa kluba: Budva, Igalo, FK Internacional,
OFK Titograd, TransINVEST …); izjema je le Vilniaus BFA z dvema šiframa COMET
(glej zgoraj). "Akademija Berane" in "Berane", "Gusinje" in "OFK Gusinje" so
različni ključi.

Preizkus arhivov FSCG v živo (15. 10. 2026, **vsi** zapisniki, 3 s med
zahtevki; tekme brez zapisnika so vse 3:0 / 0:3 brez postav — kontumacije,
Sjever 2025/26 jih ima 25, ker so klubi spomladi odstopili):

| arhiv | tekem / zapisnikov | goli = izid | postav po 11 | vratar | 990 minut | menjav (nastopov s klopi) | ekip brez menjav |
|---|---|---|---|---|---|---|---|
| Centar 2025/26 `centar/arhiva/8303239` | 132 / 129 | 762 (129/129) | 258/258 | 258/258 | 240/258 | 1022 | 4/258 |
| Sjever 2025/26 `sjever/arhiva/8327709` | 108 / 83 | 389 (83/83) | 158/166 | 166/166 | 150/166 | 509 | 19/166 |
| Jug 2025/26 `jug/arhiva/8373775` | 63 / 56 | 336 (56/56) | 111/112 | 112/112 | 99/112 | 358 | 4/112 |
| Sjever 2024/25 `sjever/arhiva/7390107` | 108 / 102 | 483 (102/102) | 199/204 | 204/204 | 190/204 | 510 | 36/204 |
| Jug 2024/25 `jug/arhiva/7487412` | 63 / 60 | 322 (60/60) | 112/120 | 119/120 | 104/120 | 322 | 21/120 |

Centar 2024/25 id-ja nismo našli (posnetek septembra 2024 še kaže 2023/24
`6381521`).

Vpisanih je 10 lig (migracija 20261016091300), **neaktivnih**:

| liga | klubov | tekoča | arhiv | zveza |
|---|---|---|---|---|
| lt-a-lyga | 9 | `23198513` (2026) | `20647154` (2025) | `lff-lt` |
| lt-1-lyga | 16 | `23198632` (2026) | `20673132` (2025) | `lff-lt` |
| me-1-cfl | 10 | `fscg/meridianbet-1-cfl/9278739` (2026/27) | `fscg/arhiva/8208775` | `fscg` |
| me-2-cfl | 10 | `fscg/druga-liga/9279699` | `fscg/arhiva/8208777` | `fscg` |
| me-u19-1 | 10 | `fscg/prva-omladinska-liga/9312757` | `fscg/arhiva/8231702` (9, ligaški del) | `fscg` |
| lt-2-lyga-a | 15 | `23383524` (2026) | — | `lff-lt` |
| lt-2-lyga-b | 15 | `23384849` (2026) | — | `lff-lt` |
| me-3-liga-centar | 13 | `centar/seniorska-liga/9331975` (2026/27) | `centar/arhiva/8303239` | `fscg-centar` |
| me-3-liga-sjever | 9 | `sjever/seniorska-liga/9344268` | `sjever/arhiva/8327709`, `sjever/arhiva/7390107` | `fscg-sjever` |
| me-3-liga-jug | 7 | `jug/seniorska-liga/9391667` | `jug/arhiva/8373775`, `jug/arhiva/7487412` | `fscg-jug` |

**Ni vpisano**: KAFF-MAFF III lyga 2026 (`23832343`, 8 klubov) — zapisnike
razčleni, a 24 od 40 ekip v preizkusu ni vpisalo nobene menjave (začetniki
bi imeli po 90 minut, rezerve nič). Jug ima le 7 klubov (spodnja meja).
Litovska sezona 2026 je ob vpisu skoraj končana — vklop realno za 2027
(nova šifra).

Uvoz (ena za drugo): A in I lyga z arhivom (`gh workflow run uvoz-lige.yml
-f liga=lt-a-lyga -f arhiv=20647154 -f cene=true`), II lyga brez (`-f
liga=lt-2-lyga-a -f cene=true`), Črna gora z arhivom (`-f liga=me-1-cfl -f
arhiv=fscg/arhiva/8208775 -f cene=true`, `-f
liga=me-3-liga-sjever -f arhiv=sjever/arhiva/8327709,sjever/arhiva/7390107 -f
cene=true`). Arhiv ~130 zapisnikov po 3 s je ~7 minut.
