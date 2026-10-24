# Poljska

Država `PL` ("Polska", migracija 20261012004500) ima vmesnik v poljščini
(`src/i18n/pl/`, jezik `pl`, `pl-PL`, `JEZIK_DRZAVE.PL`), vstop `slff.eu/pl`,
kartico ob deljenju `pl.html` (Caddy jo vrne za `/pl` in `?t=pl-…`), poljsko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Cześć") in poljska imena lastnikov hišnih
ekip ("Jakub Nowak"). **Šifra poljske lige se začne z `pl-`.** Ugib: brskalnik
`pl` ali pas `Europe/Warsaw`. Izrazi kot v poljskih fantasy igrah: drużyna,
kadra (15), wyjściowy skład / jedenastka, ławka, kapitan, wicekapitan,
transfery, bramkarz, obrońca, pomocnik, napastnik, tabela, ranking, asysta,
kartka, czyste konto, punkty, miniliga; `krog` je vedno **kolejka** ("5.
kolejka"), pripomoček `klop_plus` je "Ławka+". Množine one/few/many/other
(`Intl.PluralRules('pl')`): `one` 1, `few` 2–4 (22–24 …), `many` 0 in 5–21
(25 …), `other` le decimalke, ki dobijo rodilnik ednine ("1 punkt, 2 punkty,
5 punktów, 1,5 punktu"); `two` poljščina nima. Poljščina ima 7 sklonov, zato
ime lige **ostane v imenovalniku** in stoji samostojno za dvopičjem ali v
oklepaju ("Liga fantasy jest otwarta: {liga}"); `ligaVTozilniku` ga pusti.
Psevdonim v klepetu ima pridevnik pred samostalnikom ("Niebieski Bramkarz
42", vsi samostalniki so moškega spola). Stran Pozicije je v meniju kot v
Sloveniji. `PL` je v matriki nočnega uvoza. Zveze, tekmovanja in vir vpiše
svoja migracija. Manjka še: poljski kanal v HelpStacku (`Podpora.tsx` za `pl`
uporabi slovenskega) in **pregled prevoda pri naravnem govorcu**.

## Sveže stanje in paketna diagnostika (24. 10. 2026)

Preverjeni živi inventar: **7 aktivnih od 20 registriranih lig**. Spodnji
prvotni tabeli opisujeta registracijo, ne današnjega števila aktivnih lig.
`predogled-drzave.yml` sprejme `country=PL`, `limit=1..5`, `offset` in točni
`expected_sha` trenutnega `main`. Prebere paginiran inventar in preveri samo
točne neaktivne kandidate iz pregledanega registra; ne odkriva vseh poljskih
lig, ne bere zveze, ne uvaža in ne vklaplja. Rezultati in razlogi se ohranijo
v artefaktu `country-preview-<run>-PL`.

Generični `READY` postane `PROVISIONAL_READY / NEEDS_STRICT_SOURCE_AUDIT`:
obstoječa generična vrata za večino virov ne preverijo vseh dokazov vratarjev
in minut. Podatkovni HOLD ene lige ne ustavi drugih, infrastrukturna napaka
pa ustavi preostanek. Čas inventarja ni čas zadnje preverbe vira.

`pl-sk-b-kielce-1` ima 142 preverjenih arhivskih in 46 tekočih zapisnikov,
vendar Samson–SPORT CK (218689, 6. september) nima objavljenega izida.
`Rozegrany` ob praznih `final` in `full_time` ni dokaz 0:0. Vir šteje tekmo
za odigrano samo z izrecnim izidom oziroma kontumacijo; uvožen preverjen
zapisnik se s praznim razporedom ne skrije. Izstop SPORT CK ostaja nepotrjen.

WMZPN še vedno ne objavi vratarjev. Pravilnik 2026/27 (str. 74) za klaso B
potrdi povratne menjave, zato iz manjkajočih intervalov ne moremo izdelati
zanesljivih minut. Sedem skupin IV/okręgowa/A ima uporabnejše postave in
časovne menjave, a pred vklopom potrebuje dokazan vir vratarjev.

### Lokalni pregled CKM / Concordia

`scripts/viri/ckm-report.mjs` bere samo tri ohranjene oblike SportsPress na
`concordiaknurow.pl`. Ni registriran uvozni vir. Pristni zapisnik
Sośnica–Silesia (3. oktober 2026, III liga Śląska) vsebuje oba vratarja,
profilne identitete, pet parov menjav, gole in kartone; lokalna uskladitev
da 27 nastopov in 990/983 ekipnih minut. Dva druga vzorca ostaneta HOLD:
tekoči nima gostujoče postave/dogodkov, arhivski ima le devet gostujočih
začetnikov in pripada drugi ligi. Celotna sezonska pokritost, pravilna
arhivska povezava in pogoji nadaljnjega zbiranja še niso potrjeni.

```bash
node scripts/preveri-ckm-zapisnik.mjs --datoteka scripts/vzorci/pl-ckm-complete.html --url https://concordiaknurow.pl/event/sosnica-gliwice-vs-silesia-miechowice/
```

Izhod 0 pomeni samo usklajene posamezne statistike tega zapisnika; 2 pomeni
HOLD, 1 napačne argumente/datoteko. `activationEligible:false` in
`sezonskiUvozPodprt:false` veljata vedno. Sezona, izpeljana iz datuma, ni
potrjena oznaka sezone. Izvirni SHA in izvor so v `pl-ckm-provenance.json`.
Preizkusi vključujejo tudi inertne HTML odseke in protislovne dogodke.

## Poljska — vir `pzpn`

Država, jezik in vmesnik so opisani zgoraj (*Poljska*); lige vpiše migracija
20261012003000.

Vir `pzpn` (`scripts/viri/pzpn.mjs`) bere **uradne zapisnike PZPN** (Extranet,
"protokół"). PZPN jih hrani v skupnem API-ju (`shared-api-ng.laczynaspilka.pl`,
ključ zahteva Bearer); vojvodska zveza ga ima za svoja tekmovanja in jih na
svoji strani pokaže z gradnikom, ki bere JSON prek **javnega posrednika
zveze** — tega beremo tudi mi. Zaenkrat ga ima le **Świętokrzyski ZPN**
(szpnkielce.pl, `/wp-json/szpn/v1/proxy`, gradnik `szpn-widget` podjetja
3CK). Ključ posrednika velja le za tekmovanja te zveze (druga zveza → 403;
3. liga gr. 4 vrne zapisnik brez postav). **laczynaspilka.pl ima iste
zapisnike za vso Poljsko, a so podatki za nevidno reCAPTCHO — ne beremo jih
in je ne obhajamo.** PZPN smo 11. 10. 2026 prosili za ključ Shared API
(pzpn@pzpn.pl, wsparcie@pzpn.pl), ŚZPN za soglasje (biuro@szpnkielce.pl).

- **Šifra lige** je `<zveza>/<play_id>` (`swietokrzyski/0e86c2b3-…`); zveze
  in posredniki so v `POSREDNIKI`. Play_id je tekmovanje ene sezone; seznam
  vrne `plays.json` (tekoča sezona) oz. `plays.json?season_id=<id>` (sezone
  so v istem odgovoru: "Sezon 2026" = 2026/27, "Sezon 2025" = 2025/26).
- **Tekme**: `matches.json?play_id=…&type=results|schedule` — `round_label`
  ("Kolejka 7"), `kickoff_at` (varšavski = ljubljanski čas), `state`
  (`Rozegrany` / `Nierozegrany`), `score.final` "2:8" in `score.half`. Prosti
  krog je tekma s klubom "pauzuje w tej kolejce" — vir jo izpusti. Walkower
  vir prepozna po `state` (/walk/), primera še nismo videli.
- **Zapisnik** `pzpn/shared/matches/<id>/events.json`: `squad` obeh ekip
  (`type` Starter/Substitute, `number`, `isKeeper`, `isCaptain`, `id` = stalna
  šifra osebe → `reg_st` kot pri hlf), pri igralcu `goals` (`Normal`,
  `PenaltyKick`; avtogol `own` še ne videli — opozorilo), `cards` (`Yellow`,
  `SecondYellow`, `Red`) in `substitutions` (`In`/`Out`) z minuto ("90' +2'"
  → 90). Imena sodnikov in osebja ne beremo. Rdeči karton rezervi, ki ni
  vstopila (z klopi), ne šteje (ni nastopa).
- Vljudno: 3 s med zahtevki, User-Agent SLFF, popolnih zapisnikov ne beremo
  znova. Odgovor, ki ni JSON ali ima `success: false`, ustavi uvoz.

Preizkus (11. 10. 2026): 15 zapisnikov IV lige, okręgowe in klase A — vsi
11 + 11, vratar pri vseh 30 ekipah, goli = izidi, 0 opozoril; Klasa B Kielce I
v živo — 78 tekem z uro, 36 zapisnikov, goli = izidi (197), 1120 nastopov.

Vpisanih je 8 lig (migracija 20261012003000), **neaktivnih**, zveza
`szpn-swietokrzyski`. Skupine A in B so z lanskimi povezane po skupnih klubih:

| liga | tekoča 2026/27 (`swietokrzyski/…`) | arhiv 2025/26 |
|---|---|---|
| pl-sk-4-liga | `0e86c2b3-75d3-483b-80a0-4f086352afc5` | `swietokrzyski/3917069b-155b-41df-ae80-0e9ad0308f7f` |
| pl-sk-okregowa | `1681c4a3-9391-4990-b155-7f2c06535441` | `swietokrzyski/fbb005a3-73d0-493e-bfb4-325ea22d3784` |
| pl-sk-a-kielce-1 | `a6cd6f08-26ed-4cc6-8504-80d0e43c0882` | `swietokrzyski/797b8608-c6a0-4644-b282-9db632b9e441` |
| pl-sk-a-kielce-2 | `3f6b628a-737c-47be-8f56-15445e1bd347` | `swietokrzyski/0ec33104-08fa-4376-abd2-70e6dc036362` |
| pl-sk-a-sandomierz | `64ee2db0-9540-4372-9928-dfe268fc963e` | `swietokrzyski/7adb9e67-efd6-405d-962b-20d8ee4fa8be` |
| pl-sk-b-kielce-1 | `ed980a22-e851-4b47-bf75-5dfbee9f60cc` | `swietokrzyski/e5e68aa9-4602-42f9-80f5-b6d3b73330e1` |
| pl-sk-b-kielce-2 | `9c6fbee7-a9e5-4abd-84da-13bcf42c2d60` | `swietokrzyski/f23013ff-ca5d-4b08-be78-16bfb9442df9` |
| pl-sk-b-sandomierz | `740e1d89-139f-4fdd-a431-23a7da11b23c` | `swietokrzyski/9056e3a0-c498-4f72-b523-288d15a3e21e` |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=pl-sk-4-liga -f
arhiv=swietokrzyski/3917069b-155b-41df-ae80-0e9ad0308f7f -f cene=true`.

## Poljska — vir `wmzpn` (Warmińsko-Mazurski ZPN)

Vir `wmzpn` (`scripts/viri/wmzpn.mjs`) bere **wmzpn.pl** (WordPress, vtičnik
`wmzpn-tables`), kjer W-M ZPN pokaže svoja tekmovanja iz Extraneta PZPN. Isti
uradni zapisniki kot pri `pzpn`, druga pot do njih: brez gradnika in ključa,
stran jih naloži sama.

- **Šifra lige** je `<leagueN>/<play>/<season>` — trije UUID iz naslova
  strani skupine `/?page_id=1625&leagueN=…&play=…&season=…` (meni
  "Rozgrywki", skupine so naštete na strani). Vsaka sezona ima svoj `play` in
  `season` (2026/27 `3c77d143-…`, 2025/26 `e9d66181-…`, 2024/25
  `4be7b40c-…`; starejše sezone so na stari obliki `?league=<št.>` — ne
  beremo). Napačna šifra ali stran brez razporeda ustavi uvoz.
- **Razpored** je na strani skupine v `div.print-timetable`: tabele
  "Kolejka N", vrstica `tr[data-match-id]` (UUID tekme PZPN) z datumom
  ("2026-07-31 19:45:00", varšavski = ljubljanski čas, 00:00 = ura neznana),
  domačimi, izidom ("2:2", neodigrana "-:-") z namigom "Wynik końcowy … Do
  przerwy: (2:0)" in gosti. Pred njim stojita tabela križanja in blok
  "POPRZEDNIA / AKTUALNA KOLEJKA" z istimi vrsticami — ju ne beremo. Jeseni
  stran kaže le jesenske kroge (IV liga 15 od 30); pomlad pride z
  naslednjimi uvozi razporeda.
- **Zapisnik** je okno, ki ga stran ob kliku na izid naloži s
  `POST /wp-admin/admin-ajax.php` (`action=match_history&matchid=<uuid>`).
  Isti klic delamo mi: `naslovZapisnika` vrne naslov s parametri, `vir.fetch`
  (`wmzpnFetch`) iz njega sestavi isti POST. Odgovor je delček HTML: glava
  (klubi, izid, polčas), "Kolejka", "Sezon: 2026/2027 - Jesienna", "Status
  meczu" (Rozegrany, **Walkover**), postavi — "Drużyna" začetniki, "Rezerwa"
  klop — z dresom in **stalno šifro osebe PZPN** (`/rozgrywki/zawodnik/<uuid>`
  → `reg_st` kot pri `pzpn`; isti igralec ima pri obeh virih isto šifro),
  "(Junior)" se odreže. "Przebieg spotkania" ima dogodke z `data-minute`
  ("22'", "45' +2'" → 45): `span.goal`, `span.penalty-kick` (gol z 11 m),
  `span.own-goal` (avtogol, pri ekipi **strelca**, šteje nasprotniku), rumeni
  `#FFD700`, rdeči `#DF0021` (rdeča barva pred rumeno: rumeno-rdeča ikona bi
  bila rdeči), vstop zelena puščica `#28A745`, izstop rdeča `#DC3545` —
  minute so točne. **Drugi rumeni je le še en navaden rumeni brez rdečega**
  (6 v 97 zapisnikih raziskave; pzpn ima zanj `SecondYellow`): vir ga
  spremeni v rdeči v njegovi minuti (1 rumeni + 1 rdeči, opozorilo), minute
  igralca se končajo tam. Isti rumeni dvakrat v isti minuti (po zapisu vira,
  "90' +2'" ≠ "90' +3'") je dvojnik vnosa — šteje enkrat, opozorilo.
  Dogodek se pripiše igralcu po šifri, sicer
  strani (left = domači). Neodigrana tekma vrne "Brak danych na temat tego
  spotkania.". Imen osebja in sodnikov ne beremo; vzorci
  `scripts/vzorci/pl-wmzpn-*` so brez njih.
- **Vratarja, kapetana in pozicij zapisnik NE pove** (vse majice so iste
  barve). Vse pozicije, tudi GK, določi ugibanje in glasovanje kot v
  Sloveniji; *Uskladi pozicije* za `wmzpn` nima po čem šteti.
- **Walkower**: razpored pokaže izid z oznako "3:0(w)" (namig "(Walkower)
  3:0") ali le izid brez polčasa, zapisnik "Status meczu: Walkover" brez
  postav. "(w)" razpored sam označi kot kontumacijo z izidom; `kontumacije`
  prebere zapisnike ostalih tekem 3:0 / 0:3, starejših od tedna, in označi
  tiste z walkoverjem ali brez postav; uvoz zapisnikov jih izpusti.
- **Izstopljena ekipa**: zveza njene tekme pusti v razporedu kot "-:-
  Nierozegrany", zapisnik je "Brak danych" (B Klasa gr. 3 2025/26: Zryw
  Jedwabno jeseni, Omulew II spomladi; gr. 1: Znicz II). `izstopljeneEkipe`
  ekipo prepozna, ko ima za svojo zadnjo odigrano tekmo (kadarkoli, tudi ta
  teden) vsaj tri neodigrane, starejše od tedna, v vsakem od teh krogov so
  vse ostale tekme odigrane (tekme proti že izstopljeni ne štejejo) **in** to
  potrdi tabela zveze na isti strani (`tabelaStrani`): ekipe v njej ni
  (Zryw — izidi razveljavljeni) ali ji tabela šteje vsaj tri tekme več, kot
  jih ima z izidom (Omulew II: M 22, z izidom 14). Preložene tekme tabela ne
  šteje, stran brez tabele ne potrdi nobenega izstopa. Te tekme razpored
  označi kot kontumacije **brez izida** (kot jalgpall "- : -"). **Oznaka je
  enosmerna**: `uvoz-razporeda` kontumacije ne pobriše, ko tekma kasneje dobi
  izid (zapisnik se kljub temu uvozi in točke pridejo, oznaka ostane) — zato
  je pravilo strogo; napačno oznako popravi admin
  (`update matches set kontumacija = false where id = …`).
- **Zavrnitev in napake strani**: `wmzpnFetch` ob 401/403/429 vrže
  `WmzpnZavrnitev` na vsaki poti (razpored, zapisniki, kontumacije — tudi
  `uvoz-razporeda` jo iz kontumacij zdaj spusti naprej), prenos je ne
  ponavlja, izhod 4. V predpomnilnik gre le pravi zapisnik, "Brak danych" ali
  stran z razporedom (`zaPredpomnilnik`); odgovor, ki ni zapisnik ("0",
  prazen), uvoz preskoči in ga prebere znova.
- Zapisnik z manj kot 7 začetniki ekipe je `nepopoln` (kot `pzpn`), 45 dni se
  bere znova. **Postave in dogodke Extranet vnaša ločeno** (vzorec
  `…-brez-dogodkov`: 0:2, postavi 11 + 11, nobenega dogodka): zapisnik z
  začetniki, a goli iz dogodkov ≠ izid, je opozorilo `goli iz zapisnika … se
  ne ujemajo` (izid ostane izid) in **ni popoln** (`popolnZapisnik`), zato ga
  uvoz bere svežega do 45 dni po tekmi in dogodke, vnesene pozneje, ujame —
  nočni uvoz (`--sveze 21`) pa uvoženo tekmo, starejšo od 21 dni, preskoči,
  zato kar pride pozneje, prinese le ročni uvoz lige ali `--zapisnik`.
  Ekipa z rezervami, a brez vpisane menjave, je opozorilo `menjav ni vpisal`
  (začetniki 90 minut, `z.brezMenjav`).
- **Klasa B menjav ne vpisuje** — obravnava je ista kot pri Quarti (`fcf`):
  `z.brezMenjav` označi ekipo z rezervami brez vpisane menjave, začetnik ima
  90 minut (ali do rdečega kartona), rezerva brez gola nastopa nima, strelec s
  klopi nastopi od minute svojega (prvega) gola (opozorilo). Minute
  začetnikov so zato precenjene (ekipa ima lahko čez 990), minute strelcev s
  klopi podcenjene. Zapisnik, v katerem se goli iz dogodkov ne ujemajo z
  izidom (manjkajoči ali odvečni gol), obdrži **izid zapisnika** z
  opozorilom, kot pri drugih virih, in se bere znova do 45 dni.
- Klubi: ključ in kratko ime kot `pzpn` (`kljucKlubaPl`, `kratkoImePl`);
  rezervne ekipe ("Stomil II Olsztyn SA") so svoj klub.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt ni (404),
pogojev uporabe nismo našli; klic je javni klic strani brez prijave in
ključa. Dovoljenja W-M ZPN še nimamo. Beremo odkrito (User-Agent
`SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih zapisnikov
ne beremo znova). **Ob 401/403/429 ali izzivu (CAPTCHA) se uvoz ustavi —
ne obhajaj** (`WmzpnZavrnitev`, izhod 4). Če nas zveza prosi, naj nehamo,
`pl-wm-` lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo; razpored vseh 12 skupin,
6 zapisnikov na skupino IV lige, okręgowe in klase A ter 12 na skupino klase
B; tekme = v razporedu / odigrane, menjave = vstopi rezerv):

| skupina | tekme | zapisnikov | goli / izidi | postav po 11 | menjave |
|---|---|---|---|---|---|
| IV liga | 120 / 88 | 6 | 22 / 22 | 12/12 | 60 |
| okręgowa 1 | 120 / 87 | 6 | 30 / 30 | 12/12 | 54 |
| okręgowa 2 | 120 / 88 | 6 | 24 / 24 | 12/12 | 49 |
| klasa A 1 | 91 / 63 | 6 | 24 / 24 | 12/12 | 52 |
| klasa A 2 | 91 / 54 | 6 | 35 / 35 | 12/12 | 63 |
| klasa A 3 | 91 / 54 | 6 | 21 / 21 | 12/12 | 48 |
| klasa A 4 | 91 / 63 | 6 | 36 / 36 | 12/12 | 64 |

Pri IV ligi, okręgowi in klasi A ima vsaka ekipa 990 minut (razen ob rdečem
kartonu), vsi nastopi s šifro, 0 opozoril razen rumenih kartonov osebju
(ni v postavi). Arhivski zapisnik 2025/26 (IV liga, 30. krog) se razčleni
enako.

**Klasa B, vsi zapisniki tekoče sezone** (15. 10. 2026, pot uvoza brez baze:
`prenesiSPonovitvami` + `vir.fetch` + `razporedVseStrani` + `zapisniki`;
ekipe "brez menjav" = z rezervami in brez vpisane menjave; 990 = ekip z
natanko 990 minutami / več / manj):

| skupina | tekme / odigrane | zapisnikov | goli = izid | golov / izidi | postav po 11 | brez menjav | nastopov (s klopi) | 990 / več / manj |
|---|---|---|---|---|---|---|---|---|
| B 1 | 55 / 45 | 45 | 38 | 255 / 256 | 90/90 | 90/90 | 1027 (37) | 59 / 26 / 5 |
| B 2 | 66 / 54 | 54 | 42 | 320 / 359 | 108/108 | 108/108 | 1224 (36) | 77 / 22 / 9 |
| B 3 | 66 / 52 | 51 (1 walkower) | 41 | 239 / 265 | 102/102 | 102/102 | 1157 (35) | 74 / 26 / 2 |
| B 4 | 55 / 44 | 43 (1 walkower) | 28 | 210 / 231 | 86/86 | 84/86 | 978 (32) | 62 / 21 / 3 |
| B 5 | 55 / 44 | 43 (1 walkower) | 39 | 257 / 268 | 85/86 | 86/86 | 980 (35) | 55 / 21 / 10 |

Skupaj 236 zapisnikov: goli = izid 188, od 48 neujemanj jih 34 nima nobenega
dogodka (postavi da, goli ne — Extranet jih vnaša posebej), 14 ima gol preveč
ali premalo. Nobena ekipa ni vpisala menjave; dve ekipi (B 4) sta brez klopi
in zato nista "brez menjav". Vsi nastopi s šifro, nobena tekma nepopolna.
"Več kot 990" so strelci s klopi (175, vstop ob golu), "manj" rdeči kartoni.
Ostala opozorila: drugi rumeni (20), karton osebju (18), dogodek brez ikone
(2, `neznan dogodek`, prezrt). Walkoverji: zapisnik "Walkover" 3:0, razpored
jih tekoče sezone pokaže brez "(w)" — označi jih `kontumacije`.

Arhiv klase B 2025/26, vzorec 15 zapisnikov na skupino enakomerno čez sezono
(60, 2 walkoverja): 58 razčlenjenih, sezona 2025/26, goli = izid 45/58,
postav po 11 115/116, brez menjav 114/116, vsi nastopi s šifro. Razpored
2025/26: gr. 1 izstop Znicz II (jesen), gr. 3 Zryw Jedwabno (jesen) in
Omulew II (pomlad) — vzorec razporeda `pl-wmzpn-liga-klasa-b-2025.html`.

Vpisanih je 12 lig (migracija 20261016091100), **neaktivnih**, zveza `wmzpn`.
Šifra je `<leagueN>/<play>/<season>`; arhiv je ista skupina 2025/26 (po
skupnih klubih):

| liga | leagueN | play 2026/27 | play arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| pl-wm-4-liga | `c164ca31-22e4-43fc-9e30-4f3bcc2b7d72` | `2820e642-1475-40f8-9489-13c742fbc63a` | `17285e70-dba8-4fa2-a27a-30646ce64d6d` (11 od 16) |
| pl-wm-okregowa-1 | `c5afdf4b-b449-4ef3-acf5-dded47fc5f58` | `33dde60f-37d8-4592-a080-6795cc040465` | `bbb69021-0b53-44c6-863b-96715174e7e7` (12) |
| pl-wm-okregowa-2 | `c5afdf4b-…` | `add51c43-5c34-4d4a-82a6-7ee821ec1638` | `a0f01f01-7dff-4e92-ba57-1b339bb84e68` (9) |
| pl-wm-a-1 | `63d04023-727a-4c0c-a8c6-4154fe1104b7` | `0aace3bb-4a47-4117-a614-a0a54e2085e8` | `e75c0e65-cfc0-44f5-8692-3673dd094715` (10 od 14) |
| pl-wm-a-2 | `63d04023-…` | `a18e856f-d73b-4ff8-b44f-77ae417c83c9` | `9097e2ba-2e68-4552-953a-24766eafcba6` (9) |
| pl-wm-a-3 | `63d04023-…` | `d0d84a85-7816-4ca0-8f6a-de8e3d3f5965` | `8cf5857a-d4cc-45d8-b4ae-884d1bf38b10` (10) |
| pl-wm-a-4 | `63d04023-…` | `711ae517-02ca-4e5a-90a3-f0cbc75e7986` | `92e717fe-4cc1-445a-bf7e-85fc6ee377ea` (10) |
| pl-wm-b-1 | `b7d2c55b-e2af-44e2-9df2-3f6e05dc1768` | `2b6f4e61-f6fe-48fc-9637-0270ed5c3607` | `d8336132-3283-4853-9199-02e4bad4e292` (6 od 11) |
| pl-wm-b-2 | `b7d2c55b-…` | `4885750d-c754-45b9-be62-622caac0ceb2` | `e3f3d4b6-23fa-4241-823a-557ef7eb2c76` (8 od 12) |
| pl-wm-b-3 | `b7d2c55b-…` | `b7ee2253-ab8b-46ff-93af-c94500e196c1` | `6f5236af-3dd0-463e-b80c-43b6865c5190` (8 od 12) |
| pl-wm-b-4 | `b7d2c55b-…` | `34438712-87a8-4300-a5ad-2df29ecb415d` | `3adbaf0b-5784-4682-a306-763477dd0a44` (6 od 11) |
| pl-wm-b-5 | `b7d2c55b-…` | `c7a545a8-9770-4a42-b5f8-8fcbda7e3cf6` | — |

Tekoča sezona je `3c77d143-8010-4073-9842-d6b63365ffce`, arhiv
`e9d66181-d03e-4bb3-b889-4da848f4831d`. Klasa B je imela 2025/26 le štiri
skupine; **B 5 je brez arhiva** (največ skupnih klubov, 3 od 11, ima lanska
gr. 1, ki jo dobi B 1 s 6; večina B 5 so nove rezervne ekipe "II"). 2024/25
gr. 1 (`f4b73457-98f1-4f2a-9f55-353bb465a8df`, season
`4be7b40c-84ff-4e5a-96e5-875d7f13483a`) ima prav tako le 3 skupne — ni
uporabljena. Cene klase B naj zato pridejo predvsem iz tekoče sezone (11
krogov oktobra). Baraż (doigravanje) je svoje tekmovanje — za arhiv ga ne
uvažaj.

Uvoz (ena za drugo, šele po odločitvi lastnika): `gh workflow run
uvoz-lige.yml -f liga=pl-wm-4-liga -f
arhiv=c164ca31-22e4-43fc-9e30-4f3bcc2b7d72/17285e70-dba8-4fa2-a27a-30646ce64d6d/e9d66181-d03e-4bb3-b889-4da848f4831d
-f cene=true`. Arhiv 240 zapisnikov po 3 s je ~12 minut na ligo (klasa B
~130, strežnik je odgovarjal 3–5 s na zahtevek in dvakrat prekinil povezavo,
ECONNRESET — prenos jo ponovi). Klasa B brez arhiva: `-f liga=pl-wm-b-5 -f
cene=true`.

**Podkarpacki ZPN** (pregled 15. 10. 2026) vtičnika nima: `/wyniki24/` in
`/wyniki-terminarze/` kažeta neizrisano kratko kodo `[pzpn_table]`
(vtičnik ni nameščen, med naloženimi ni nobenega za tabele), rezultati so le
statični izvozi Extraneta v `/wp-content/uploads/…/*.html` (`/terminarze-2026-2027/`:
razpored z izidi in igrišči, brez povezav na tekme in brez postav). Za
fantasy neuporabno.
