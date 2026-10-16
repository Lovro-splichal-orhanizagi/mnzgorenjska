# Latvija

Država `LV` ("Latvija", migracija 20261012050000) ima vmesnik v latvijščini
(`src/i18n/lv/`, jezik `lv`, `lv-LV`, `JEZIK_DRZAVE.LV`), izbirnik jezika
"Latviešu", vstop `slff.eu/lv`, kartico ob deljenju `lv.html` (Caddy jo vrne
za `/lv` in `?t=lv-…`, tudi rezerva `:3201`), latvijsko vejo pošte
(`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Sveiki") in latvijska imena lastnikov
hišnih ekip ("Jānis Bērziņš"; le moška imena, ker imajo priimki moško in
žensko obliko). **Šifra latvijske lige se začne z `lv-`.** Ugib: brskalnik
`lv` ali pas `Europe/Riga`. Izrazi kot v latvijskih fantasy in nogometnih
medijih: komanda, sastāvs (15), pamatsastāvs, soliņš / rezervisti, kapteinis,
vicekapteinis, transfēri (prestopi), maiņa (samodejna menjava), vārtsargs,
aizsargs, pussargs, uzbrucējs, turnīra tabula (prava lestvica lige),
kopvērtējums (fantasy lestvica), rezultatīvā piespēle, kartīte, sausā spēle,
punkti, eksperts (poznavalec), bonuss (pripomoček); `krog` je vedno **kārta**
("5. kārta", "5. kārtā"), pripomoček `klop_plus` je "Soliņš+". Množine
zero/one/other (`Intl.PluralRules('lv')`, `Mnozina.zero` v `jedro.ts`):
`zero` 0, 10–20, 30 … z rodilnikom množine ("0 punktu, 10 punktu, 11
punktu"), `one` 1, 21, 31 … razen 11 ("1 punkts, 21 punkts"), `other`
ostalo ("2 punkti", tudi "2,5 punkti"). Latvijščina ima 7 sklonov, zato ime
lige **ostane v imenovalniku** in stoji samostojno za dvopičjem ali v
oklepaju ("Fantāzijas līga ir atvērta: {liga}", "līga: {liga}");
`ligaVTozilniku` ga pusti. Brez pomišljajev (smoke). Psevdonim v klepetu ima
pridevnik v določni obliki pred samostalnikom ("Zilais Vārtsargs 42", vsi
samostalniki so moškega spola). Sezona je **koledarska** kot v Estoniji
(`competitions.sezona_koledarska` vklopi migracija lig). Stran Pozicije je
v meniju kot v Sloveniji. `LV` je v matriki nočnega uvoza in v *Hisne
ekipe*. Zveze, tekmovanja in vir vpiše svoja migracija. Manjka še: latvijski
kanal v HelpStacku (`Podpora.tsx` za `lv` uporabi slovenskega) in
**pregled prevoda pri naravnem govorcu**.


## Latvija — vir `lff`

Vir `lff` (`scripts/viri/lff.mjs`) bere **lff.lv** (Latvijas Futbola
federācija), kjer LFF iz COMET objavi Virslīgo, 1., 2. in 3. līgo. HTML iz
strežnika, brez izziva. Država `LV` ("Latvija", vpiše jo migracija lig);
vmesnika v latvijščini, kartice in pošte **še ni** in `LV` **ni** v matriki
nočnega uvoza — oboje pred vklopom. Šifra lige se začne z `lv-`.

- **Sezona je koledarsko leto** (marec–november, `sezona_koledarska`, glej
  *Koledarska sezona* pri Estoniji): oznaka `"2026"`. Vir jo vzame iz
  datumov razporeda (najpogostejše leto).
- **Šifra lige je `<sekcija>/<p>[/<tekmovanje>]`**: `<sekcija>` je pot pod
  `/sacensibas/viriesi/` (virsliga, lvbet-liga, otra-liga, tresa-liga), `<p>`
  parameter `?p=` izbirnika "Izvēlies līgu" — pri Virslīgi in 1. ligi **leto**
  (`virsliga/2026`), pri 3. ligi **id tekmovanja COMET** cone
  (`tresa-liga/23836414` = Rietumu zona 2026), pri 2. ligi leto ali id strani.
  `<tekmovanje>` izbere skupino, kadar ima stran več blokov "Visas spēles"
  (2. liga: A, B in Finālturnīrs → `otra-liga/2026/23536781`). Stran z več
  bloki brez izbire ali z letom, ki se ne ujema z datumi (neznan `p` stran
  tiho zamenja s tekočo), uvoz ustavi. Vsaka sezona ima svoje id-je.
- **Razpored**: zavihek "Visas spēles" (`stats_competition_<id>_…_style2`),
  krogi "N. kārta", tekma z `data-id` (id tekme COMET), datumom (h5 dan, h6
  mesec "okt"/"jūn", h7 ura, h8 leto; **riški čas → ljubljanski −1 h**),
  izidom (`res1`/`res2`, "-" neodigrana) in potjo `/speles/<slug>-<id>/`
  (stran najde id na koncu, slug je okras). "Nākamās spēles" (`style1`) ne
  beremo. Izpadnih delov (Finālturnīrs, "1/4 fināls") ne uvažamo.
- **Zapisnik** (zavihek "Spēles protokols", `table.teams`): vrstice
  `firstteam` (začetniki) in `bench` (klop), v vsaki oba kluba (dres, igralec,
  prazno, dres, igralec). "(G)" vratar (tudi rezervni), "(C)" kapetan,
  kapetan-vratar "(C) (G)". Dogodki pri igralcu z minuto ("64'", "90'+1'" →
  90, **"PP" = polčas → 45**): `goal`, `penalty` (gol z 11 m), `own_goal` (pri
  strelčevi ekipi, šteje nasprotniku — goli = izid to potrdi), `penalty_failed`,
  `yellow`, `second_yellow` (prvi rumeni je svoj dogodek → 1 rumeni + 1 rdeči),
  `red`, `substitutionIn`/`substitutionOut` — **minute so točne**, menjave
  združimo v pare po minuti. Kartoni trenerjev (časovnica) niso v protokolu in
  ne štejejo. Polčasa stran ne pove. Narodnosti (zastavica) ne beremo.
- **Identiteta: ime + klub** (kot fss, fsb). Le nekateri igralci imajo
  povezavo `/speletaji/<slug>-<id>/` (profil reprezentanta) — za identiteto je
  ne uporabljamo, ker bi isti igralec dobil dve vrstici. Ime "Ime Priimek" →
  "Priimek Ime" (priimek je zadnja beseda). Šifra zapisnika v bazi je
  `lv<id>` (COMET drugih zvez ima iste številke).
- **Kontumacija**: razpored jo pokaže le kot 3:0 / 0:3; zapisnik je brez
  postav. `vir.kontumacije` prebere zapisnike takih tekem, starejših od tedna
  dni (v isti predpomnilnik kot uvoz zapisnikov), in jih označi.
- Klubi: ključ ohrani latvijske znake; skupne ekipe ("Mārupes SC-2 / MNSS")
  in druge ekipe ("Riga FC-2") so svoj klub. Kratko ime brez FK/FC/SK/FS/AFA.
  Klubi nižjih lig se med sezonama močno premešajo (3. liga 2026 ↔ 2025: le
  2–6 skupnih klubov na cono).
- *Uskladi pozicije* z `vir = lff` (vratar po večini tekem); ostale pozicije
  na glasovanje.

**Pravice (pregled 11. 10. 2026, ni pravni nasvet).** robots.txt zapre le
MJ12bot. Pogojev uporabe strani ni (le *Privātuma politika*); noga pravi
"Autortiesības 2026 © Atsauce uz LFF.lv obligāta" — **navedba vira je
obvezna** (`vir_ime` LFF, `vir_url` → lff.lv v nogi). Dovoljenja LFF še
nimamo. Beremo odkrito (User-Agent `SLFF fantasy (slff.eu;
splih.94@gmail.com)`, **3 s** med zahtevki, zapisnikov, starejših od tedna, ne
beremo znova). **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne
obhajaj** (`LffZavrnitev`, izhod 4). Če nas LFF prosi, naj nehamo, `lv-` lige
izklopimo.

Seznam lig in preizkus:

```bash
node scripts/latvijske-lige.mjs                       # lige 2026: šifra, klubi, krogi, tekme
node scripts/latvijske-lige.mjs --leto 2025 --preveri --najvec 1
node scripts/latvijske-lige.mjs --polno tresa-liga/23836414 --mapa /tmp/lv
```

Preizkus v živo (11. 10. 2026) na 3. ligi Rietumu zona 2026: 10 krogov,
30 tekem z uro, 6 klubov, 3 kontumacije (FK Namejs, prazen zapisnik),
27 zapisnikov, goli = izid 27/27 (172; razpored s kontumacijami 181),
53/54 postav po 11 (FK Namejs z 10), vratar (G) 54/54, 990 minut 47/54,
ostalih 7 pojasni rdeči karton (6) ali 10 začetnikov (1); 784 nastopov
(191 s klopi), 2 avtogola, 7 golov z 11 m, 5 zgrešenih, 8 izključitev. Po en
zapisnik zadnjega kroga vsake lige 2026 in 2025: vsi 11 + 11 (dvakrat ekipa
z 10), goli = izid, vratar pri vseh.

Vpisanih je 8 lig (migracija 20261012030100), **neaktivnih**, zveza `lff`.
Sezona 2026 je ob vpisu skoraj končana (Virslīga 32. od 36 krogov, 1. liga
22. od 26, ostale končane, 3. liga igra finale) — vklop bo realno za 2027.

| liga | klubov | tekoča 2026 | arhiv 2025 |
|---|---|---|---|
| lv-virsliga | 10 | `virsliga/2026` | `virsliga/2025` |
| lv-1-liga | 14 | `lvbet-liga/2026` | `lvbet-liga/2025` |
| lv-2-liga-a | 10 | `otra-liga/2026/23536781` | `otra-liga/20846382/22188994` (2. faza A) |
| lv-2-liga-b | 10 | `otra-liga/2026/23536800` | `otra-liga/20846382/20849250` (1. faza A) |
| lv-3-liga-centrs | 12 | `tresa-liga/23836115` | `tresa-liga/21070084` |
| lv-3-liga-ziemeli | 10 | `tresa-liga/23836298` | `tresa-liga/21311921/21311921` (1. faza, Austrumu grupa) |
| lv-3-liga-austrumi | 8 | `tresa-liga/23836359` | `tresa-liga/21063555/21063555` (1. faza) |
| lv-3-liga-rietumi | 6 | `tresa-liga/23836414` | `tresa-liga/21172228` |

2. liga 2025 je imela dve fazi (1. faza A/B po 14 krogov, 2. faza A/B po 8
krogov, isti klubi premešani); arhiv je izbran po največ skupnih klubih, vsak
arhiv ima ena sama liga (`matches.zapisnik_id` je enoličen). Neuporabljeni
bloki 2025: `20849255` (1. faza B), `22188997` (2. faza B), Ziemeļu
`21338843` (1. faza Rietumu) in `22146056` (2. faza A). Arhivi so izbrani po
skupnih klubih in so pri nižjih ligah šibki — pred uvozom preveri. Rietumu
zona (6 klubov) je na spodnji meji (3 iz kluba × 5).

Izpuščeno: ženske, mladinske pod U19, futsal, pokal, superpokal, Livonia Cup,
veterani, pārspēles, izpadni deli, *Turnīru reģistrs* (seznam zasebnih
turnirjev, brez zapisnikov).

**Druge lige odraslih (pregled 12. 10. 2026): uporabne ni nobene več.**
Na lff.lv so med moškimi le zgornje štiri sekcije (ostale so pokal,
superpokal, veterani, pārspēles, Livonia Cup, Baltic futsal). Regijske strani:

- **riga.lff.lv** (Joomla, robots zapre le sistemske mape): "Rīgas futbola
  čempionāts" (11 : 11) teče na **fta.lv/rigasfutbols** (robots
  `Crawl-delay: 5`). 2025 (strežniški HTML, id-ji COMET) je to le 3. liga
  Centra zona (isti 12 klubov). 2026 je SPA, ki bere JSON
  `www.footour.lv/api` (robots dovoli vse; `masterTournamentSettings?
  masterTournamentId=58`): tid 353 = 3. liga Centra zona (že imamo), **tid
  355 = "4. līga"** — nova, 8 klubov (ASK Kadaga-2, FC Baku Riga, FK Fujaki,
  FK Lielupe-2, FK Ropaži, JFC Dobele, Just Vibe FC, SK Tedīši), 14 krogov /
  56 tekem + končnica, arhiva 2025 ni. Zapisnik
  (`matchProtocol?masterTournamentId=58&tid=355&mid=<id>`) ima ime, dres,
  pozicijo (G/D/M/S), gole (`MATCH_TIME_GOAL`, `11M_PENALTY_GOAL`) in kartone
  z minuto — goli = izid 22/22 v vzorcu 11 tekem — **a začetne enajsterice
  ne loči**: `startingLineup` je true pri vseh igralcih seznama (do 57),
  `played` označi vse, ki so igrali (14–20), menjave (`PLAYER_ON/OFF`) so
  vpisane le pri 3 od 11 tekem. Brez XI in minut menjav ni nastopov ne
  minut, zato **ni vpisana**. Če bi footour začel vpisovati menjave, bi bil
  potreben nov vir (JSON, drug format kot lff.lv).
- **kurzeme.lff.lv** (https ima lastno potrdilo, http dela): odrasli le
  7 : 7 (Kurzemes kauss), telpni futbol in veterani; "Rietumu līga" je 3. liga
  Rietumu zona.
- **vidzeme.lff.lv** (Squarespace): "Sacensības" vodi na 3. ligo lff.lv,
  ostalo mladinsko in novice.
- **zemgale.lff.lv** (Squarespace, zelo počasen): amaterski futbol je telpni
  in 7 : 7, brez zapisnikov.
- **latgale.lff.lv** (https lastno potrdilo, http dela): "Latgales reģiona 3.
  līga" je 3. liga Austrumu zona; Daugavpils atklātais in Augšdaugavas novada
  čempionāts sta 7 : 7 z le izidi v novicah.
- **za.lff.lv** (Ziemeļaustrumi): "1. līga 2026" je 6 regijskih ekip
  (Preiļi, Jēkabpils Lūši, Balvi …), le lestvica; 2025 je bila telpna.

**Mladinska U19** (migracija 20261013100100, **neaktivna**, kot ostale U19
`prvi_fantasy_krog = 2`, `rok_pomak_ur = 2`). Jaunatnes čempionāts je pod
`/sacensibas/jauniesi/` (Elites, Meistarības, Attīstības grupa); šifra ima
spredaj `jauniesi/` (`jauniesi/<sekcija>/<p>`, `<p>` je id COMET), pretekla
leta so na svoji strani `<sekcija>-<leto>` (`elites-grupa-2025`; povezave na
*LJFČ vēsture*). Najstarejša skupina je U-19; leta 2026 jo igra **le Elites
grupa** (Meistarības in Attīstības sta od U-17 navzdol). Seznam:
`node scripts/latvijske-lige.mjs --u19 [--leto 2025]`.

| liga | klubov | tekoča 2026 | arhiv 2025 |
|---|---|---|---|
| lv-u19 | 7 | `jauniesi/elites-grupa/23450990` | `jauniesi/elites-grupa-2025/20725038` (6) |

Preizkus v živo (12. 10. 2026), vsi zapisniki: 2026 — 14 krogov, 42 tekem,
goli = izid 42/42, postav po 11 83/84 (Dienvidkurzemes SS/LFS enkrat z 8),
vratar (G) 84/84, 990 minut 79/84 (4 z rdečim), 1235 nastopov (314 s klopi),
314 menjav z minuto; 2025 — 20 krogov (6 klubov, štirikrožno), 60 tekem,
goli = izid 60/60, postav po 11 120/120, vratar 120/120, 990 minut 108/120
(vseh 12 z rdečim), 1845 nastopov (525 s klopi); en zapisnik (20864859) ima
tri rdeče brez minute (opozorilo). Arhiv je šibek: skupna sta le FS Ventspils in
FS Jelgava ("Skanstes SK/FS Metta" 2025 in "Skanstes SK/FK Metta" 2026 sta
po ključu različna kluba). U19 Meistarības grupa 2025
(`jauniesi/meistaribas-grupa-2025/20725145`, 7 klubov, skupna JDFS Alberts in
Dienvidkurzemes SS/LFS) ostane neuporabljena — arhiv ima ena sama liga.
Klubi so skupne ekipe akademij in šol ("JFK Daugava / Salaspils FA",
"FK Tukums 2000/TSS"); kratko ime poševnico ohrani ("JFK Daugava/Salaspils
FA"). V tabeli 2026 je še "FK Jelgava" brez tekem (izstop) — razpored ga ne
pozna.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=lv-virsliga -f
arhiv=virsliga/2025 -f cene=true`. Arhiv 180 zapisnikov po 3 s je okoli
10 minut na sezono.
