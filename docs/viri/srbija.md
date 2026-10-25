# Srbija

Država `RS` ("Srbija", migracija 20261009233100) ima vmesnik v srbščini
(`src/i18n/sr/`, jezik `sr`, **ekavica v latinici**, lokale `sr-Latn-RS`, ker
`sr-RS` datume piše v cirilici; `JEZIK_DRZAVE.RS`), vstop `slff.eu/rs`,
kartico ob deljenju `rs.html` (Caddy jo vrne za `/rs` in `?t=rs-…`), srbsko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Zdravo") in srbska imena lastnikov hišnih
ekip ("Nikola Jovanović"). **Šifra srbske lige se začne z `rs-`.** Ugib:
brskalnik `sr` ali pas `Europe/Belgrade`. Prevod izhaja iz hrvaškega, a z
ekavico in srbskimi izrazi: tim (ne momčad), golman, odbrambeni, tabela,
fudbal, nalog, imejl. Množine one/few/other in sklanjanje imena lige
(`ligaVTozilniku`, glava `liga` ali `zona`) kot v hrvaščini. Stran Pozicije
je v meniju kot v Sloveniji. Zveze, tekmovanja in vir vpiše svoja migracija
(spodaj). Manjka še: srbski kanal v HelpStacku (`Podpora.tsx` za `sr`
uporabi slovenskega) in pregled prevoda pri naravnem govorcu. `RS` je v
matriki nočnega uvoza.

## Srbija — vir `fsb`

Vir `fsb` (`scripts/viri/fsb.mjs`) bere **www.fsb.org.rs** (Fudbalski savez
Beograda), WordPress stran, na kateri FSB objavlja vsa svoja tekmovanja od
Srpske lige Beograd do opštinskih lig. Brez zaščite pred roboti; beremo
odkrito (`User-Agent: SLFF fantasy`, **2 s** med zahtevki, popolnih zapisnikov
ne beremo znova). **Če se pojavi izziv ali CAPTCHA, ustavi — ne obhajaj.**

- **Šifra lige je slug strani lige** (`/takmicenje/<slug>/`); vsaka sezona ima
  svojega, tudi arhiv. Slugi niso pravilni (`…-grupa-c-2`, arhiv
  `…-grupa-c-2-2025-26`), zato se vpišejo ročno. Seznam tekočih lig je na
  `/takmicenja/`, arhiv na `/arhiva-takmicenja/sezona-2025-2026/`.
- **Stran lige nosi vse**: krogi so `div.accordion-item` "Kolo: N", tekma sta
  dve vrstici (domača: datum **brez letnice** "23.08", ime, izid, status
  Odigrana / Zakazana / U toku s povezavo `/izvestaj/?pid=N`; gostujoča: ura,
  ime, izid). Leto pride iz sezone v naslovu strani. Najprej odstrani
  komentarje (zakomentirane podvojene vrstice). Lestvica (`id="tabela"`) je v
  zadnjem krogu — razčlenjevalnik se ustavi pred njo.
- **Krog, ki teče, je v harmoniki okrnjen**: neodigrane tekme tega kroga
  harmonika skrije (Srpska liga 9. 10. 2026: krog 8 z 2 od 7 tekem). Razdelek
  "Aktuelno kolo: N" nad njo jih ima vse in vir ju združi. Manjkajoča tekma
  NI izbrisana tekma; uvoz razporeda okrnjenega kroga tako ali tako ne čisti
  (manj tekem kot poln krog).
- Nižje lige objavijo razpored nekaj krogov naprej; ostali krogi pridejo z
  naslednjimi uvozi razporeda.
- **Zapisnik** `/izvestaj/?pid=N`: domači in gostje v blokih
  `<!-- Home team -->` / `<!-- Away team -->`, začetniki v prvi tabeli, klop za
  "Rezervni igrači". Uvažamo **le status "Odigrana"**; "U toku" je delni
  zapisnik tekme v živo. Neveljaven pid vrne 200 s prazno predlogo — veljavnost
  presodi vsebina. "Kolo:" v zapisniku je ograda ("ubaciti"), krog pride s
  strani lige, ime kluba prav tako (zapisnik ga lahko piše drugače: "OFK
  BORAC" proti "BORAC").
- **Dogodki** so ikone z minuto ("45+1'" → 45, "90+6'" → 90): gol, penal,
  autogol (pri strelcu v **njegovi** ekipi), zuti, crveni (direkten), drugi-zuti
  (prvi rumeni ostane v rumeni celici), izmena — **le pri rezervi, ki je
  prišla v igro**. Kdo je šel ven, vir ne pove.
- **Minute (odločitev lastnika, 9. 10. 2026)**: začetnik 90 (ali do minute
  rdečega kartona); rezerva 90 − minuta vstopa (ali do rdečega). Zamenjani
  začetnik ima zato **90**, ker ga vir ne označi — minute začetnikov so
  precenjene (ekipa ima čez 990 minut), minute rezerv pravilne.
- **Vratar**: značka `bg-info` (tudi rezervni vratar) → `vratar` in GK kot
  namig; `bg-danger` je kapetan — kapetan-vratar na tisti tekmi ni označen.
  Ostali čakajo na glasovanje o pozicijah. *Uskladi pozicije* z `vir = fsb`.
- **Identiteta**: vir **nima šifer igralcev ne klubov**. Igralec je ime + klub,
  soimenjaka na isti tekmi loči dres (Studentski grad 2026/27: dva "PERIŠIĆ
  Nikola", 5 in 8) — isti stroj kot pri slovenskih MNZ (`igralecId`).
  Dresi se med tekmami menjajo; isto ime v drugem klubu je prestop (kot v
  Sloveniji). Ime je "PRIIMEK Ime" v latinici; prečrkovanje iz cirilice ima
  napake ("NemanJa", "VelJko"), `lepoIme` jih popravi v "Nemanja".
- **Isto ime, drug klub.** Klubi so napisani brez kraja; 2026/27 imata BORAC
  (Zonska = Ostružnica, PBL B drug) in OMLADINAC (Zonska = Veliko Polje, PBL C
  drug) dva kluba v isti sezoni. `IME_V_LIGI` v viru jih preimenuje po šifri
  lige ("BORAC (Ostružnica)"); kraj potrdi "Mesto:" v zapisniku domače tekme.
  Ob novi ligi preveri trke imen vseh lig iste sezone. BORAC v PBL A 2025/26
  ostane neopredeljen (deli vrstico `teams` z BORAC iz PBL B; igralci so
  ločeni po ligi). Dva kluba z istim imenom v ISTI ligi (Opštinska liga Sopot
  2025/26: dva "MLADOST") ustavita uvoz z napako.
- **Kontumacija**: status Odigrana, izid "---", zapisnik prazen ali z eno
  postavo (tudi z obema in brez izida: BASK : Zvezdara 2025/26). Starejša od
  tedna dni je kontumacija; izid (3:0) vir izpelje iz lestvice (goli kluba
  minus znani izidi, n × 3:0 ali n × 0:3), sicer ostane brez izida. Mlajša je
  le `odigrana: false` (izid morda še ni vnesen). Imena na lestvici nosijo
  odbitek točk ("BASK -1"), ki se odreže.
- Rdeči karton rezervi, ki ni vstopila, ne šteje (ni nastopa).

Preizkus vira (predpomnilnik pregleda 9. 10. 2026 in v živo): vseh 10 strani
(5 lig × 2 sezoni) se razčleni v 26 krogov po 7 tekem (PBL B 2025/26: 22 po
6), kontumacije z izidom z lestvice; vsi prebrani zapisniki imajo 11 + 11
začetnikov in gole = izid, brez opozoril.

Vpisanih je pet lig (migracija 20261010000100), **neaktivnih**. Zveza `fsb`.

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| rs-bg-srpska | `srpska-liga-beograd` | `srpska-liga-beograd-2025-26` |
| rs-bg-zonska | `zonska-liga-beograd` | `zonska-liga-beograd-2025-26` |
| rs-bg-pbl-a | `prva-beogradska-liga-grupa-a` | `prva-beogradska-liga-grupa-a-2025-26` |
| rs-bg-pbl-b | `prva-beogradska-liga-grupa-b` | `prva-beogradska-liga-grupa-b-2025-26` |
| rs-bg-pbl-c | `prva-beogradska-liga-grupa-c-2` | `prva-beogradska-liga-grupa-c-2-2025-26` |

Nižje lige (migracija 20261010153100, neaktivne), arhiv dveh sezon, ker so
majhne (7–12 klubov):

| liga | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|
| rs-bg-mol-a | `medjuopstinska-liga-grupa-a` | `…-grupa-a-2025-26` | `…-grupa-a-2024-25` |
| rs-bg-mol-b | `medjuopstinska-liga-grupa-b` | `…-grupa-b-2025-26` | `…-grupa-b-2024-25` |
| rs-bg-mol-c | `medjuopstinska-liga-grupa-c` | `…-grupa-c-2025-26` | `…-grupa-c-2024-25` |
| rs-bg-lazarevac-2 | `druga-opstinska-liga-fsol-2026-2027` | `druga-opstinska-liga-fso-lazarevac-2025-2026` | `druga-opstinska-liga-lazarevac-2024-25` |
| rs-bg-mladenovac | `opstinska-liga-mladenovac-2026-2027` | `opstinska-liga-mladenovac-2` | `opstinska-liga-mladenovac-2024-25` |
| rs-bg-obrenovac | `opstinska-liga-obrenovac-2026-2027` | `opstinska-liga-obrenovac` | `opstinska-liga-obrenovac-2024-2025` |

(`…` = `medjuopstinska-liga`.) Prva opštinska liga FSOL in Opštinska liga
Sopot imata po dva kluba MLADOST v isti ligi, ki ju stran FSB ne loči — zato
sta vpisani prek vira `fssid` (COMET ime s krajem; `rs-bg-lazarevac-1`,
`rs-bg-sopot`, glej spodaj), arhiva (le na fsb) nimata. **Šifre tekem fsb
(`pid`) so šifre COMET**; `/izvestaj/?pid=` od 15. 10. 2026 preusmeri (301) na
`/utakmica/izvestaj/?pid=`. Trki imen med ligami (10. 10. 2026, kraj
iz "Mesto:"): BUDUĆNOST/JEDINSTVO/SLOGA v Obrenovcu (Zvečka, Dren, Ratari),
NAPREDAK/SLOGA v Mladenovcu (kraja ne piše), BSK/MLADOST/SLOGA/ŠUMADIJA v
Lazarevcu (Brajkovac, Cvetovac, Lukavica, Mali Crljeni), BSK v MOL A
(Batajnica), HAJDUK v MOL C (Kamendol; HAJDUK v MOL B je beograjski iz PBL A
2025/26). Ostala ponovljena imena so isti klub, ki je napredoval ali izpadel
(SREM Jakovo, OMLADINAC Rajkovac …).

**Ostale regije Srbije na svojih straneh ne objavljajo zapisnikov**
(preverjeno 10. 10. 2026): FS Vojvodine (fsv.rs, FS Novog Sada fsgns.rs), FS
regiona Zapadne Srbije (fsrzs.com, le PDF lestvice in strelci) in FS regiona
Istočne Srbije (fsris.org.rs, razpored in izidi s šiframi klubov) kažejo le
izide, razpored in lestvice. Vse zveze vodijo podatke v COMET (comet.fss.rs,
za prijavo), **fss.rs pa izriše zapisnik vsake tekme COMET po šifri** — tudi
Srpske lige Istok, Zapad in Vojvodina; te bere vir `fssid` (spodaj), državni
ligi vir `fss`. Javni API "areports" zahteva ključ FSS — ključa s tujih strani
ne uporabljamo.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=rs-bg-srpska -f
arhiv=srpska-liga-beograd-2025-26 -f cene=true`. Arhiv ~180 zapisnikov po 2 s
je okoli 7 minut na ligo.

## Srbija — vir `fss`

Vir `fss` (`scripts/viri/fss.mjs`) bere **fss.rs** (Fudbalski savez Srbije)
za državni ligi; Srpska liga Beograd in nižje beograjske so pri `fsb`
(zgoraj), Srpska liga Istok, Zapad in Vojvodina pri `fssid` (spodaj).
WordPress za Cloudflarom, ki je strani do zdaj vračal brez izziva;
robots.txt zapre le /wp-admin/. Beremo odkrito (2 s, popolnih zapisnikov
ne beremo znova). **Če se pojavi izziv ali CAPTCHA, ustavi — ne obhajaj.**

- **Šifra lige je slug** (`/takmicenje/<slug>/`), vsaka sezona svojega;
  `?script=lat` da latinico (privzeto je cirilica). Play-off in play-out sta
  svoji tekmovanji (`…-25-26-play-off`) — za arhiv ju **ne** uvažaj.
- **Stran lige**: harmonika krogov `fss-rezultati__title` "N. kolo". Prva
  harmonika (`accordion_current`) **ponovi tekoči krog**, beremo le
  `id="accordion"`. Tekma: datum ("01.08.2026 20:00" ali s piko za letnico),
  dve `col-6` imeni (brez kraja), povezava `/izvestaj-sa-utakmice/<id>` (id
  COMET) pri odigrani in štiri številke izida v izvornem vrstnem redu:
  domači, gostje, polčas domači, polčas gostje ("/" = ni izida).
- **Zapisnik** `/izvestaj-sa-utakmice/<id>/?script=lat`: štirje bloki
  `fss-rez__oneteam` (začetniki domačih, gostov, klop domačih, gostov),
  dogodki pred imenom in dresom: goal, penalty, own_goal (v ekipi strelca),
  penalty_failed_miss, yellow, second_yellow in red (izključitev), substitution
  (vstop, pri rezervi), substitution_out (izstop, pri začetniku) — **minute so
  točne**. Neveljaven id vrne 200 s prazno predlogo (veljaven ima
  `fss-rez__start`). Šifer igralcev ni: identiteta ime + klub kot pri fsb.
- **Vratarja fss.rs ne označi.** Isto tekmo (isti id COMET) pokaže
  **prvaliga.rs** `/arhiva/izvestaj-utakmice/<id>/` z "(G)" pri dresu (tudi
  za Superligo in tekočo sezono; kapetan-vratar je "(C) (G)"). Iz nje vzamemo
  le dres vratarja; imena so tam okrnjena. superliga.rs ima isto, a robots.txt
  prepove `/arhiva/` — tja ne hodimo. *Uskladi pozicije* z `vir = fss`.
- **Isto ime, drug klub**: državni klubi z imenom beograjskega dobijo kraj
  (`IME` v viru): JEDINSTVO (Ub), MLADOST (Lučani), NAPREDAK (Kruševac),
  RADNIČKI (Niš). UŠĆE NOVI BEOGRAD in TELEOPTIK sta v obeh virih isti klub.

Preizkus v živo (10. 10. 2026, 20 naključnih zapisnikov štirih strani):
vsi 11 + 11, goli = izid, 990 minut na ekipo, vratar znan pri vseh.

Vpisani ligi (migracija 20261010153300, **neaktivni**), zveza `fss`:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| rs-superliga | `mozzart-bet-super-liga-srbije-26-27` (14 klubov) | `mozzart-bet-super-liga-srbije-25-26` (16) |
| rs-prva-liga | `mozzart-bet-prva-liga-srbije-26-27` (16) | `mozzart-bet-prva-liga-srbije-25-26` (16) |

Arhiv je 240 zapisnikov in 240 strani prvaliga.rs po 2 s — okoli 20 minut na ligo.

## Srbija — vir `fssid`

Vir `fssid` (`scripts/viri/fssid.mjs`) bere regijske lige (Srpska liga Istok,
Zapad, Vojvodina) z **fss.rs po šifri tekme COMET**. Regijske zveze zapisnikov
ne objavljajo in strani lige na fss.rs za te lige ni, a
`/izvestaj-sa-utakmice/<id>/?script=lat` izriše vsako tekmo COMET. Razčlenjevanje
zapisnika, minute in nastopi so iz `fss.mjs`. Beremo odkrito (2 s, User-Agent
SLFF); **izziv ali CAPTCHA ustavi uvoz — ne obhajaj.**

- **Blok šifer**: tekmovanje-sezona je strnjen blok N×(N−1) šifer, urejen po
  krogih (N/2 na krog; pri lihem N (N−1)/2). Šifra lige je `<od>-<do>`. Stran tekme ima tri stanja:
  "Utakmica ne postoji", "Utakmica nije odigrana ili podaci nisu uneti" (le
  imeni klubov, **brez datuma in kroga**) in poln zapisnik ("N. kolo", datum,
  postavi, dogodki z minutami). Krog odigrane je iz zapisnika, neodigrane iz
  mesta v bloku. Preverba 10. 10. 2026: pri vseh 209 odigranih treh lig je
  krog iz zapisnika enak krogu po mestu (0 neujemanj), v blokih ni manjkajočih
  šifer. Neujemanje in manjkajoče šifre vir izpiše.
- **Nov blok (nova sezona)**: poišči eno šifro lige (npr. s strani regijske
  zveze ali iz bližine lanskega bloka) in poženi `node scripts/srbija-blok.mjs
  <šifra>` — poišče meji bloka, preveri N×(N−1), izpiše klube 1. kroga in ali je
  liga članska. **Članska ima v zapisniku "Četvrti sudija" in "Kontrolor
  suđenja"**; mladinske (Omladinska/Kadetska liga, ista imena klubov, akademije,
  tekme sredi tedna) ju nimajo. Tako sta bila bloka `75908331` in `75910179`
  (Zapad, skoraj isti klubi, z Radničkim 1923, Novim Pazarjem, Jedinstvom Ub)
  mladinska; članska Srpska liga Zapad je `75859176`. Šifre lige se vpišejo z
  migracijo, za vir datumov še vrstica v `DATUMI`.
- **Datumi neodigranih tekem** (fss.rs jih nima): kjer jih ima regijska zveza,
  so iz nje (`DATUMI`): **fsris.org.rs** za Istok (stran lige in strani krogov
  `?kolo=<id>&sezona=19`, ime kluba iz `title` povezave) in **fsv.rs** za
  Vojvodino (ena stran, cirilica, harmonika `comet-acc`). Obe objavita jesenski
  del (krogi 1–15) z datumi in uro, pomladi še ne; robots.txt dovoli, brez
  prijave. Tekmo vira najde `ujemiZVirom` po krogu in besedah imen (Radnički
  (P) ≠ Radnički (S)); 10. 10. so se ujele vse prebrane. fsrzs.com (Zapad) ima le
  PDF — **Zapad je brez vira datumov**.
- **Ocena**: krog brez znanega datuma dobi datum prejšnjega znanega kroga iste
  polovice sezone + 7 dni na krog, premaknjen na najpogostejši dan, z
  najpogostejšo uro, in `rounds.datum_ocenjen = true` (piše ga uvoz razporeda
  le za vir z `ocenjeniDatumi`). Krog druge polovice (po zimskem premoru) brez
  znanega datuma se ne oceni in ne vpiše — pride, ko ga zveza objavi ali se
  odigra. **Tveganje**: rok ocenjenega kroga je približen. Krog sredi tedna
  (Zapad 7. krog, sreda 23. 9.) ali prestavljen krog ocena zgreši; če je tekma
  prej, se lahko ekipe urejajo po začetku, če pozneje, se krog zaklene prezgodaj
  in zaklenjenemu krogu se rok ne premika več. Pred vklopom lige brez vira
  datumov (Zapad) preveri `datum_ocenjen` naslednjih krogov.
- **Datum vira pred prejšnjimi krogi se zavrne** (Zona Centar 2026/27: fsris
  ima 14. kolo z datumom 1. kola "22.08.2026"; ocena je iz njega naredila
  kroge 14–22 v jeseni, zaklep 22. kroga je zajel posnetke 27 ekip, migracija
  `20261025093100` jih je pobrisala). Datum neodigrane tekme iz vira, ki je
  več kot 14 dni pred večino prejšnjih krogov (`datumPredPrejsnjimi` v
  `scripts/razpored.mjs`), `sestaviBlok` zavrže; krog ostane brez datuma in
  krogi za njim brez ocene. Uvoz razporeda krogu, ki ga razpored nima več in
  ima tak datum, datum in rok počisti (če ni zaklenjen in nima uvožene tekme);
  preverba podatkov ga javi kot `krog-pred-prejsnjim`.
- **Predpomnilnik** (`scripts/.predpomnilnik/fssid`): odigrana tekma se ne bere
  znova (uvoz zapisnikov jo prve 3 dni bere sveže, zapisnik brez postav do 45
  dni), neodigrana, ko je na vrsti (od dneva pred datumom, vsako uro do 14 dni
  po njem, nato dnevno), sicer enkrat na teden; "ne postoji" enkrat na teden;
  strani zvez 12 ur. Prvi uvoz bloka prebere vseh 240 strani (~8–15 minut).
- **Vratar**: prvaliga.rs (`(G)`, ista šifra COMET) kot pri `fss`; če ga tam ni,
  je vratar prvi začetnik (COMET vratarja našteje prvega; 30/30 preverjenih
  tekem enako kot prvaliga.rs). *Uskladi pozicije* z `vir = fssid`.
- **Lažni vratarji** (fsb, fss, fssid — `vratarPoVecini`): COMET igralca iz
  polja na posamezni tekmi kdaj vodi kot vratarja (Mirković Dalibor, zapisnik
  76083196: dres 1 in (G) tudi na prvaliga.rs; sicer 11 ob vratarju). Uvoz ga
  ob prvi oznaki za vselej prekrsti v GK (`smeVVrata`), zato po vsakem uvozu
  `scripts/lazni-vratarji.mjs` vrne v polje GK, ki je v zadnji sezoni vsaj 2×
  in večkrat kot v vratih začel v polju ob drugem označenem vratarju; pozicijo
  da razvrstitev iz ugani-pozicije (`ugibanje`). Ob vklopu 12. 10. 2026 jih je
  bilo 112 (migracija 20261012195100).
- **Napake vira**: v 7 od 209 zapisnikov je gol vpisan dvema igralcema v isti
  minuti (goli iz dogodkov > izid, opozorilo `goli iz dogodkov …`); izid ostane
  izid zapisnika. Izid za zeleno mizo (fsv: Dinamo 1945 : Mladost Apa 3:0*,
  na igrišču 1:3) COMET ne pozna — uvoz ima izid igrišča.
- **Imena klubov** so iz COMET s krajem; podvojen kraj ("KABEL (Novi Sad) (Novi
  Sad)") se odreže. Izpadla kluba Prve lige imata ime državne lige
  (`IME_DRZAVNE`: TRAJAL, TEKSTILAC); FAP in KABEL (Novi Sad) se ujemata sama.

Vpisane lige (migracija 20261011181100, **neaktivne**, zveze `fsris`, `fsrzs`,
`fsv`, vir v nogi FSS). **Arhiva ni** (šifre 2025/26 niso znane; arhiv 2022/23
bi se dal najti prek `data-match_id` na straneh delegiranja fss.rs, a je star tri
sezone) — cene so le iz tekoče sezone:

| liga | tekoča 2026/27 | klubov | datumi |
|---|---|---|---|
| rs-srpska-istok | `75912381-75912620` | 16 | fsris.org.rs (jesen), sicer ocena |
| rs-srpska-zapad | `75859176-75859415` | 16 | ocena |
| rs-srpska-vojvodina | `75952376-75952615` | 16 | fsv.rs (jesen), sicer ocena |

Preizkus (10. 10. 2026, krogi 1–10): Istok 67, Zapad 79, Vojvodina 63
odigranih; vsi 11 + 11, goli = izid razen 7 zgoraj, nobena kontumacija.
Igralcev z vsaj 270 minutami je 50–57 % (ostali dobijo privzeto 4.5) — pod
mejo 70 % privzetih v `pripravljenost.ts`. Uvoz: `gh workflow run
uvoz-lige.yml -f liga=rs-srpska-istok -f cene=true` (brez arhiva).

**Zone, Vojvođanske in nižje lige** (migracija 20261011203100, 47 lig,
**neaktivne**, brez arhiva). Bloke je našlo pometanje šifer fss.rs (11. 10.
2026, 100 blokov). Izpuščeni so mladinski (akademije, mladinske ekipe velikih
klubov, jutranje ali medtedenske tekme, klubi iz članskega bloka iste regije,
izidi kot 8:10), veteranski (ponedeljek, brez delegata), ženski, beograjski
(vir `fsb`), majhni ali nepravilni bloki in podvojeni Zaječar `76159661`
(isti klubi kot `76162366`, nobena tekma ni vnesena). **Članski test s
četrtim sodnikom velja le za Srpske lige** — zone in VFL imajo kontrolorja
sojenja, nižje lige le sodnika (pogosto brez pomočnikov) in delegata; tam
odločijo vikend popoldne, vaški klubi in klubi, ki niso v drugem bloku.

- **Liho število klubov** (Gradski ligi Kruševac, 13): blok N×(N−1), vsak krog
  en klub prost, (N−1)/2 tekem na krog, 2N krogov (`razberiKodo`); prva
  polovica sezone so krogi do `krogov / 2`.
- **Večkrožne lige** (opštinske z malo klubi): blok je k × N(N−1)/2 šifer,
  `razberiKodo` poskusi k = 2, 3, 4, 1 (prvi, ki da celo N ≥ 3) in vrne
  `krozni`. Malo Crniće 2026/27: 8 klubov trikrožno (84 šifer, 21 krogov po 4);
  Krupanj: 6 klubov štirikrožno (60, 20 krogov po 3). Velikost je le ugib —
  blok mora biti cel (meji iz `srbija-blok.mjs`), sicer se okrnjen blok prebere
  kot drugo število klubov (220 šifer = 11 klubov štirikrožno).
- **Isto ime, drug klub**: COMET v nižjih ligah piše ime brez kraja (MLADOST v
  štirih ligah, HAJDUK, RUDAR, BSK v treh …), bare JEDINSTVO/MLADOST/NAPREDAK pa
  `fss.mjs` preslika v državni klub (Ub, Lučani, Kruševac). `IME_V_BLOKU` v
  `fssid.mjs` jim da kraj po bloku (s strani zveze ali stadiona domačih tekem);
  pregled zajame vse bloke fssid in vsa imena RS v bazi (11. 10. 2026). Klub
  dvakrat v istem krogu bloka ustavi uvoz. **Ob novem bloku ali sezoni preveri
  trke znova.**
- Kraj iz stadiona ni vedno sedež (DUNAVAC iz Petke igra v Kostolcu, POLET (T)
  v MOFL Istok "Takovo" po prizorišču); HAJDUK (Rujevica) le po agregatorju in
  prizorišču v Sokobanji.

| liga | blok | klubov | ime (zveza) | datumi |
|---|---|---|---|---|
| rs-vfl-sever | `75938263-75938444` | 14 | Vojvođanska fudbalska liga Sever (FSV) | fsv.rs (jesen) |
| rs-vfl-istok | `75963094-75963275` | 14 | VFL Istok (FSV) | fsv.rs (jesen) |
| rs-vfl-jug | `75940439-75940620` | 14 | VFL Jug (FSV) | fsv.rs (jesen) |
| rs-pancevo-pfl | `75849222-75849403` | 14 | Prva južnobanatska područna liga (FS područja Pančevo, fspp.rs) | ocena |
| rs-subotica-pfl | `75879887-75880126` | 16 | Područna fudbalska liga Subotica (PFS Subotica) | ocena (COMET PDF jesen) |
| rs-sombor-pfl | `75897207-75897446` | 16 | PFL Sombor (PFS Sombor) | ocena |
| rs-zrenjanin-pfl | `76054893-76055132` | 16 | Područna fudbalska liga Zrenjanin (FSP Zrenjanin) | ocena (HTML, vikend kroga) |
| rs-srem-pfl | `76051146-76051385` | 16 | Sremska liga / COMET PFL Srem (PFS Srem, sfs.org.rs) | ocena (COMET PDF jesen) |
| rs-ns-prva | `76038544-76038783` | 16 | Prva novosadska liga (FSGNS) | ocena (PDF jesen) |
| rs-srem-mfl-zapad | `76097001-76097182` | 14 | MFL Srem Zapad (PFS Srem) | ocena (COMET PDF jesen) |
| rs-sombor-mfl | `75954296-75954477` | 14 | MFL Sombor 1. razred (GFS Sombor; ime iz medijev) | ocena |
| rs-backa-palanka | `76033904-76034085` | 14 | Liga Bačka Palanka (**ime nepotrjeno**) | ocena |
| rs-zona-drina | `75863516-75863647` | 12 | Zonska liga "Drina", preliminarni del (FSRZS) | ocena (COMET PDF) |
| rs-zona-dunav | `75862803-75862934` | 12 | Zonska liga "Dunav" (FSRZS) | ocena (COMET PDF) |
| rs-zona-morava | `75862092-75862223` | 12 | Zonska liga "Morava" (FSRZS) | ocena (COMET PDF) |
| rs-kolubara-okruzna | `75882160-75882341` | 14 | Okružna liga Kolubara (FS Kolubarskog okruga, fsko.rs) | ocena (COMET PDF jesen) |
| rs-kolubara-mofl-istok | `75902301-75902482` | 14 | MOFL Istok (FSKO) | ocena (COMET PDF jesen) |
| rs-kolubara-mofl-zapad | `75946952-75947133` | 14 | MOFL Zapad (FSKO) | ocena (COMET PDF jesen) |
| rs-macva-okruzna | `76148843-76149024` | 14 | Mačvanska okružna liga (FS Mačvanskog okruga, fsmo.rs) | ocena |
| rs-macva-mfl-jadar | `76187411-76187592` | 14 | Međuopštinska liga Jadar (FSMO) | ocena |
| rs-macva-mfl-macva | `76219059-76219240` | 14 | Međuopštinska liga Mačva (FSMO) | ocena |
| rs-macva-mfl-pocerina | `76217686-76217867` | 14 | Međuopštinska liga Pocerina (FSMO) | ocena |
| rs-moravica-okruzna | `75969523-75969704` | 14 | Okružna Moravička liga (FS Moravičkog okruga, fsmo.info) | ocena (COMET PDF jesen) |
| rs-sumadija-okruzna | `76126804-76126985` | 14 | Šumadijska okružna liga (FS Šumadijskog okruga) | ocena (COMET PDF **vseh 26 krogov**) |
| rs-kg-prva / -druga / -treca | `76022530-76022711` / `76024362-76024493` / `76025757-76025938` | 14 / 12 / 14 | Prva / Druga / Treća gradska liga (FS grada Kragujevca, fsgkg.org.rs) | ocena (HTML jesen) |
| rs-topola | `76174925-76175056` | 12 | Liga Topola (**ime nepotrjeno**, agregatorji: Opštinska liga Topola) | ocena |
| rs-podunavlje-okruzna | `75900760-75900941` | 14 | Podunavska okružna fudbalska liga (FS Podunavskog okruga) | ocena |
| rs-branicevo-okruzna | `76144655-76144836` | 14 | Braničevska okružna liga (FSBO, fsbo.rs) | ocena (COMET PDF jesen) |
| rs-branicevo-mfl-dunav | `76146941-76147122` | 14 | MFL Dunav (FSBO) | ocena (COMET PDF jesen) |
| rs-branicevo-mfl-mlava | `76155052-76155233` | 14 | MFL Mlava (FSBO) | ocena (COMET PDF jesen) |
| rs-zona-zapad | `75975050-75975181` | 12 | Zona Zapad (FSRIS) | fsris.org.rs |
| rs-zona-centar | `75976635-75976766` | 12 | Zona Centar (FSRIS) | fsris.org.rs (izbirnik brez 18. kroga) |
| rs-zona-istok | `76044412-76044543` | 12 | Zona Istok (FSRIS) | fsris.org.rs |
| rs-zona-jug | `75920107-75920238` | 12 | Zona Jug (FSRIS) | fsris.org.rs |
| rs-pomoravlje-okruzna | `75992166-75992471` | 18 | Okružna fudbalska liga (FS Pomoravskog okruga, fspo.org.rs) | ocena (tekme tudi ob sredah!) |
| rs-pomoravlje-mfl-sever | `75995108-75995347` | 16 | Međuopštinska liga Sever (FSPO) | ocena |
| rs-pomoravlje-mfl-jug | `75993822-75994061` | 16 | Međuopštinska liga Jug (FSPO) | ocena |
| rs-rasina-prva | `76045363-76045602` | 16 | Rasinska Prva liga (FS Rasinskog okruga, fsro.org.rs) | ocena |
| rs-rasina-druga-zapad | `76046778-76046909` | 12 | Rasinska Druga liga Zapad (FSRO) | ocena (1. krog prestavljen na 8. 11.) |
| rs-rasina-druga-istok | `76049679-76049860` | 14 | Rasinska Druga liga Istok (FSRO) | ocena (tabela 9. 10. brez OFK Orašje — preveri) |
| rs-krusevac-morava | `75957933-75958088` | 13 | Gradska liga Morava (FS grada Kruševca, fsgks.rs) | ocena (HTML jesen) |
| rs-krusevac-rasina | `75959913-75960068` | 13 | Gradska liga Rasina (FSG Kruševca) | ocena (HTML jesen) |
| rs-zajecar-okruzna | `76162366-76162605` | 16 | Zaječarska okružna liga (ime iz medijev) | ocena; malo vnesenih zapisnikov |
| rs-bor-okruzna | `76083154-76083335` | 14 | Okružna liga Bor (ime iz medijev) | ocena |
| rs-pirot-okruzna | `76156082-76156171` | 10 | Liga Pirotski okrug (**ime nepotrjeno**) | ocena |

**Opštinske in međuopštinske lige** (migracija 20261015172300, 8 lig,
**neaktivne**, brez arhiva, datumi ocena). Vsak blok je bil ves prebran
(15. 10. 2026, brez pisanja v bazo): odigrane tekme, zapisniki (11 + 11),
goli = izid, menjave z minuto. Kraji v `IME_V_BLOKU` so s stadiona domačih
tekem v zapisniku COMET.

| liga | blok | klubov | ime (zveza) | odigranih / zapisnikov | goli = izid | postav 11 |
|---|---|---|---|---|---|---|
| rs-kikinda-mol | `76235200-76235409` | 15 | Međuopštinska liga Kikinda-Žitište (MFS Kikinda-Žitište; občine Kikinda, Žitište, Novi Bečej, Nova Crnja) | 56 / 56 | 56/56 | 112/112 |
| rs-vrsac-mol | `76475945-76476034` | 10 | MOL Vršac (Vršac, Bela Crkva, Alibunar; **ime nepotrjeno**) | 40 / 39 (1 brez postav) | 39/39 | 74/78 |
| rs-subotica-gradska | `75788469-75788578` | 11 | Gradska liga Subotica (vasi mesta Subotica; **ime nepotrjeno**) | 35 / 35 | 35/35 | 70/70 |
| rs-bg-lazarevac-1 | `76177421-76177510` | 10 | Prva opštinska liga FSOL (fsb.org.rs) | 24 / 24 | 24/24 | 48/48 |
| rs-bg-sopot | `77527270-77527325` | 8 | Opštinska liga Sopot (fsb.org.rs) | 16 / 16 | 16/16 | 30/32 |
| rs-malo-crnice | `76183530-76183613` | 8 (trikrožna) | Opštinska liga Malo Crniće (vse vasi občine; **ime nepotrjeno**) | 16 / 15 (1 brez postav) | 15/15 | 28/30 |
| rs-krupanj | `77542317-77542376` | 6 (štirikrožna) | Opštinska liga Krupanj (**ime nepotrjeno**) | 14 / 14 | 14/14 | 28/28 |
| rs-pirot-opstinska | `76461361-76461416` | 8 | Opštinska liga Pirot (vasi občine Pirot; **ime nepotrjeno**) | 24 / 24 | 24/24 | 48/48 |

Imena: MOL Kikinda — BEGA (Novi Itebej), BORAC (A) = Aleksandrovo, BORAC (I) =
Iđoš, BUDUĆNOST (Banatski Dvor), PROLETER (Međa); Sopot — drugi MLADOST
(poleg MLADOST (Guberevac)) nima kraja ne v COMET ne na fsb ("Mesto: ---"),
zato MLADOST (Sopot), kot občina pri Mladenovcu. FSOL: BSK (Brajkovac), SLOGA
(Lukavica), MLADOST (Cvetovac), MLADI RADNIK in OFK BORAC 1978 so isti klubi
kot v arhivih `rs-bg-lazarevac-2` (fsb) — COMET jih piše enako, zato en zapis.
Pregled trkov (15. 10. 2026, vsa imena RS v bazi): drugih trkov ni.

**Pometanje 15. 10. 2026** (step 50, 2 s, ~2220 zahtevkov, brez izziva; trikrat
HTTP 522 in izpad omrežja — ponovljeno): `75781300-75828200` (navzdol od
prvega znanega bloka), `76460000-76477700`, `77500000-77560000` (okoli bloka
Sopot). **Nepregledano**: `75600000-75781300` in `76477700-77500000` (proračun
2500 zahtevkov). Najdeno: zgornji bloki Vršac, Subotica, Pirot, Krupanj, Prva
liga Srbije `75808231-75808470` (vir `fss`), pokalne ali posamezne tekme
(`75812699`, `75803389`, 5 in 15 šifer), mladinski Srem `76472363-76472452`
(tekme v petek dopoldne in sredi tedna, klubi višjih lig) in `77543710-77543754`
(45 šifer, enokrožna, ob sredah, Inđija/Irig/Ruma — ni članska liga).
Neznani `75982840` ima iste klube kot MOL Kikinda (tekme ob ponedeljkih) — ni vpisan.

Zveza v izbirniku je regijska (`fsv`, `fsrzs`, `fsris`), organizator je v
tabeli. Datume z vira bereta le `fsv` (VFL) in `fsris` (zone) — ista oblika
kot pri Srpskih ligah. Drugod jih zveze objavljajo v PDF (COMET "Raspored
takmičenja" z datumom, uro in prizoriščem; fsrzs.com ima tak PDF celo za
Srpsko ligo Zapad) ali HTML (fsgkg.org.rs, fsgks.rs), a vir jih še ne bere:
**ocena** — pred vklopom preveri `datum_ocenjen` naslednjih krogov. Zone so
"preliminarni del" (FSRIS: nato play-off in play-out kot svoji tekmovanji).
Uvoz: `gh workflow run uvoz-lige.yml -f liga=rs-zona-drina -f cene=true`;
seznam v vrstnem redu je v PR.

## Srbija — omladinske lige (U19)

Le **najstarejša mladinska kategorija** (omladinci, U19); kadeti (U17),
pioniri (U15), petlići in "Liga mlađih omladinaca Beograda" (U18) niso
vpisani. Migracija 20261012055100, devet lig, **neaktivnih**,
`prvi_fantasy_krog = 2`, `rok_pomak_ur = 2` (tekme dopoldne, kot slovenske
in slovaške U19). Mladinske ekipe so isti klubi kot člani (klub skupen,
igralec svoja vrstica po ligi).

| liga | vir | šifra 2026/27 | klubov | arhiv 2025/26 | ime (zveza) | dokaz U19 | datumi |
|---|---|---|---|---|---|---|---|
| rs-u19-srbija | fss | `omladinska-liga-srbije-26-27` | 14 | `omladinska-liga-srbije-25-26` (16) | Omladinska liga Srbije (FSS) | ime tekmovanja na fss.rs; blok COMET 75829387 (Kadetska liga Srbije je 75828245) | stran lige |
| rs-u19-bg-1 | fsb | `prva-omladinska-liga-beograda-2026-27` | 14 | `prva-omladinska-liga-beograda` | Prva omladinska liga Beograda (FSB) | ime tekmovanja na fsb.org.rs | stran lige (jesen) |
| rs-u19-bg-2 | fsb | `druga-omladinska-liga-beograda-2026-27` | 14 | `druga-omladinska-liga-beograda` | Druga omladinska liga Beograda (FSB) | isto | stran lige (jesen) |
| rs-u19-bg-3 | fsb | `treca-omladinska-liga-beograda-2026-27` | 12 | `treca-omladinska-liga-beograda` | Treća omladinska liga Beograda (FSB) | isto | stran lige (jesen) |
| rs-u19-vojvodina | fssid | `76001621-76001802` | 14 | — | Omladinska liga Vojvodine (FSV) | fsv.rs stran lige + PDF "Sastav Omladinske lige Vojvodine 2026/27", 14/14 klubov | ocena |
| rs-u19-vojvodina-sever | fssid | `76057523-76057654` | 12 | — | Druga omladinska liga Vojvodine "Sever" (FSV) | fsv.rs stran lige, 12/12 | ocena |
| rs-u19-vojvodina-jug | fssid | `76058296-76058427` | 12 | — | Druga omladinska liga Vojvodine "Jug" (FSV) | fsv.rs stran lige, 12/12 | ocena |
| rs-u19-zapad | fssid | `75908331-75908570` | 16 | — | Prva omladinska liga FSRZS | COMET tabela (tekmovanje 75907894) na fsrzs.com, 16/16 | ocena (COMET PDF ves razpored) |
| rs-u19-zapad-zm | fssid | `75924544-75924699` | 13 | — | Druga omladinska liga "Zapadno-moravska" (FSRZS) | COMET tabela (75918191), 13/13 | ocena |

**Pasti pri prepoznavanju.** fsv.rs ima podstran
`omladinska-liga-vojvodine-2026-2027-tabela-i-rezultati`, ki kaže **kadetsko**
ligo (isti razpored kot Kadetska liga Vojvodine) — velja glavna stran lige in
PDF sastava. Pari blokov z istimi klubi (odločeno s strani zveze): Vojvodina
76001621 omladinska / 76002700 kadetska / 76003873 pionirska; Druga Sever
76057523 omladinska / 76059057 kadetska; Druga Jug 76058296 omladinska /
76060043 kadetska; FSRZS 75908331 Prva omladinska / 75910179 Prva kadetska;
Druga kadetska "Zapadno-moravska" 75932006, "Kolubarsko-mačvanska" 75918864,
"Podunavsko-šumadijska" 75915926. Ostali bloki FSRZS z akademijami
(75913817, 75917144, 75922145, 75932959) so pionirski — vse tri omladinske
lige FSRZS so najdene drugje. Druga pionirska Sever (FSV) je 76061069.

**Ni vpisano / negotovo**: Druga omladinska liga "Podunavsko-šumadijska"
(FSRZS, šest klubov, bloka nismo našli); pet blokov okolice Subotice
(76104745, 76105755, 76106517, 76107559, 76108498 — kategorija ni potrjena,
76105755, 76107559 in 76108498 imajo TSC ali Spartak, ki U19 igrata v OLS — verjetno mlajši); FSRIS
(I. in II. omladinska liga) — fsris.org.rs nima šifer tekem COMET, blokov
pometanje ni našlo; veteranski 76135586, 76227518 in neznani 75982840,
76134808, 76199287.

**Imena.** fssid piše klube s krajem, fss (Superliga, Prva liga, OLS) brez:
`IME_DRZAVNE` v `fssid.mjs` mladinske ekipe državnih klubov preslika v ime iz
baze (LOZNICA, METALAC, RADNIČKI 1923, BORAC 1926, JAVOR MATIS, OFK VRŠAC,
PROLETER 023, ŽELEZNIČAR = Pančevo). V fsb (`IME_V_LIGI`, "Mesto:" domačih
tekem obeh sezon): OMLADINAC v Drugi = Veliko Polje, BSK v Tretji = Batajnica,
BORAC v Tretji 2025/26 = Ostružnica, JEDINSTVO v Drugi igra doma v Dobanovcih
(članski JEDINSTVO v Jakovu) — ločen klub "JEDINSTVO (Dobanovci)", dokler ni
potrjeno, da je isti. RADNIČKI (Obrenovac), BUDUĆNOST (Dobanovci), DUNAV
(Veliko Selo), BSK v Drugi (Palilula/Borča) in KOLUBARA (Lazarevac) so
članski klubi brez kraja.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=rs-u19-srbija -f
arhiv=omladinska-liga-srbije-25-26 -f cene=true`; fssid brez arhiva. Seznam
je v PR.
