# Ferski otoki — vir `fsf`

Vir `fsf` (`scripts/viri/fsf.mjs`) bere **fsf.fo** (Fótbóltssamband Føroya),
ki vodi vsa ferska tekmovanja v COMET. Strani tekmovanj in tekme so lupine
Vue; podatke si naložijo iz **javnega posrednika strani**
`/wp-json/comet-api/v2/…` (JSON, brez ključa, prijave ali piškotka —
`competition-controller.js` in `dystur-controller.js` kličeta navaden GET).
Beremo iste naslove, kot jih zahteva stran; ključev iz JS ne uporabljamo.
Država `FO` ("Føroyar", vpiše jo migracija lig); vmesnika v ferščini,
kartice in pošte **ni**, `FO` **ni** v matriki nočnega uvoza — oboje pred
vklopom. Šifra lige se začne s `fo-`.

- **Sezona je koledarsko leto** (april–oktober, `sezona_koledarska`): `"2026"`.
- **Šifra lige je id tekmovanja COMET** (`6654857` = Betri deildin 2026), vsaka
  sezona svoj; id-ji so v `data-competition-config` strani lige
  (`/kappingar-og-urslit/menn/meistaradeildin-menn/`, `1-deild-menn/`,
  `2-deild-menn/`). Vir mora id poznati v tabeli **`SEZONE`** (leto → id-ji
  Betri, 1. in 2. deild): **ob novi sezoni dopiši vrstico** in popravi šifro
  lige; neznan id ustavi uvoz.
- **Druge ekipe.** 1. in 2. deild igrajo večinoma druge in tretje ekipe klubov
  iz višjih lig, COMET pa jim da **isto ime in isti id kluba** ("B36" v
  1. deild je B36 II). Vir zato ime ekipe dopolni s pripono po tem, v koliko
  višjih ligah iste sezone nastopa isti id kluba (`imeEkipe`): 2. deild 2026
  ima "NSÍ III" in "Víkingur III" (oba kluba igrata v Betri in 1. deild),
  "B71 II", "FC Suðuroy II", "ÍF II" (prve ekipe v 1. deild) in "MB" (prva
  ekipa). TB in FC Suðuroy sta 2025 igrala v Betri in 2026 v 1. deild: v
  1. deild 2026 sta prvi ekipi, v arhivu 2. deild 2025 "TB II" in "FC Suðuroy
  II". Razpored višjih lig iste sezone vir prebere sam (en zahtevek na ligo);
  prazen ali tuj seznam višje lige (napačen id v `SEZONE`) ustavi uvoz.
  Druga ekipa je svoj klub (kot "Riga FC-2" pri `lff`); igralci so tako ali
  tako ločeni po ligi.
- **Naslovi**: `/matches?competitionId=<id>` (vse tekme sezone: `roundOrder`,
  `dateTimeUTC`, `liveStatus` PLAYED/SCHEDULED, izid in polčas),
  `/match/lineup?matchId=<id>` (postavi: `starting`, `shirtNumber`,
  `position` "G" = vratar, `captain`, **`personId` → `reg_st`**, ime
  "PRIIMEK Ime" → "Priimek Ime") in `/match/events?matchId=<id>` (GOAL,
  PENALTY = gol z 11 m, OWN_GOAL — `homeTeam` je ekipa strelca, šteje
  nasprotniku —, PENALTY_FAILED, YELLOW, RED, SUBSTITUTION: `player` noter,
  `player2` ven, `minuteFull` od začetka tekme). Uradnih oseb (`officials`)
  ne beremo. Človeška stran tekme je `/kappingar/dystur/?matchID=<id>` (vir v
  nogi in `source_url`).
- **Pozicije**: le če ekipa vnese postavitev (`formation`), ima vsak začetnik
  `formationPositionDisplayName` (GK, LCB, CAM, CF …) → GK/DEF/MID/FWD; brez
  postavitve COMET vsem pripiše "LB" in oznako prezremo — znan je le vratar.
  *Uskladi pozicije* vira `fsf` še ne pozna (seznam virov v
  `uskladi-pozicije.yml` in `.mjs`) — dodaj ga pred vklopom.
- **Čas**: `dateTimeUTC` → ljubljanski čas (ferski WET/WEST + 1 h).
  Ferska polnoč pomeni, da ura še ni določena: datum ostane, ura null.
- **Šifra zapisnika v bazi je `fo<id>`** (id tekme COMET je enoličen le
  znotraj zveze).
- **Nepopoln zapisnik** (ekipa z manj kot 7 začetniki) je `z.nepopoln` kot
  pri `frf`; obe prazni postavi → null. Zapisnik iz predpomnilnika, mlajši
  od 45 dni, se ob nepopolnosti ali golih ≠ izid prebere še enkrat sveže.
  **Kontumacija**: 3:0/0:3 s praznima postavama, starejša od tedna
  (`vir.kontumacije`).
- **Predpomnilnik**: le pravi JSON (seznam tekem in dogodki kot tabela,
  postava z `home`/`away`) — napaka WordPressa ali HTML ne gre vanj in ne
  obvelja.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt (Yoast):
`User-agent: * / Disallow:` — vse dovoljeno. Pogojev uporabe za podatke ni
(le pogoji vstopnic). Dovoljenja FSF še nimamo. Beremo odkrito (User-Agent
`SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, zapisnikov, starejših
od tedna, ne beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi —
ne obhajaj** (`FsfZavrnitev`, izhod 4; vir ima svoj `fetch`, zato 429 ni
ponovljen in uvoz razporeda ne vzame shranjene strani). Če nas FSF prosi, naj
nehamo, `fo-` lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo, vsi zapisniki):

| liga, sezona | tekem / odigranih | zapisnikov | goli = izid | postav 11 / vratar | 990 minut | nastopov (s klopi) |
|---|---|---|---|---|---|---|
| Betri 2026 (`6654857`) | 135 / 120 | 120 | 119 | 240/240 / 240 | 227/240 | 3448 (808) |
| 1. deild 2026 (`6654881`) | 135 / 125 | 125 | 125 | 250/250 / 250 | 232/250 | 3683 (933) |
| 2. deild 2026 (`6651271`) | 110 / 100 | 99 (1 kontumacija, 1 nepopoln) | 98/98 | 196/196 / 196 | 185/196 | 2780 (624) |
| Betri 2025 (`6095440`) | 135 / 135 | 135 | 135 | 270/270 / 270 | 252/270 | 3944 (974) |
| 1. deild 2025 (`6095452`) | 135 / 135 | 135 | 135 | 270/270 / 270 | 252/270 | 4013 (1043) |
| 2. deild 2025 (`6095465`) | 110 / 110 | 109 (1 kontumacija) | 107 | 217/218 / 218 | 205/218 | 3158 (761) |

Vsaka ekipa brez 990 minut ima rdeči karton (ali 10 začetnikov: ÍF II 2025);
vse menjave imajo oba igralca s šifro, vsi nastopi imajo šifro osebe.
Odstopanja: Betri 2026 `fo6655208` (3:1) nima nobenega dogodka (goli ≠ izid,
opozorilo, zapisnik se do 45 dni bere znova); 2. deild 2025 `fo6099346` in
`fo6099348` sta za zeleno mizo 0:3 (na igrišču 7:1 in 1:1) — izid ostane
uradni, goli igrišča so opozorilo; štirje kartoni igralcev brez minute
(rdeči brez minute šteje do 90). Kartoni po tekmi (`AFTER_THE_MATCH`) štejejo
v 90. minuti, kartoni uradnih oseb (`teamOfficial`, `EXPULSION` brez
igralca) ne. Postavitev (pozicije) so ekipe vnesle redko: 70 od 2640
začetnikov Betri 2026, 0 v 2025. Kontumaciji: 2. deild 2026 B71 II : NSÍ III
(15. krog), 2025 TB II : MB (11. krog) — prazni postavi, 3:0.

**3. deild ni vpisana**: od 105 odigranih tekem štirih skupin 2026
(predtekmovanje A `6659859`, B `6659867`, finale A `7074072`, B `7074248`) je
popolnih (obe postavi po 11, goli = izid) le 5 (4,8 %); 30 zapisnikov je
povsem praznih, 55 ima eno samo postavo, 14 golov ne ujema izida. Meja je
80 %.

Vpisane so 3 lige (migracija 20261015171300), **neaktivne**, zveza `fsf`:

| liga | klubov | tekoča 2026 | arhiv 2025 |
|---|---|---|---|
| fo-betri-deildin | 10 | `6654857` | `6095440` |
| fo-1-deild | 10 | `6654881` | `6095452` |
| fo-2-deild | 11 | `6651271` | `6095465` |

Starejši id-ji (v `SEZONE`): 2024 `5415898` / `5420267` / `5420269`, 2023
`4704632` / `4704644` / `4695395`. Sezona 2026 se konča oktobra (Betri 27.
krog 31. 10.) — vklop bo realno za 2027.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=fo-betri-deildin
-f arhiv=6095440 -f cene=true`. Liga ima ~135 tekem, zapisnik sta dva
zahtevka po 3 s — arhiv ~15 minut.
