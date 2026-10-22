# Madžarska

Država `HU` ("Magyarország", migracija 20261009011100) ima vmesnik v
madžarščini (`src/i18n/hu/`, jezik `hu`, `hu-HU`, `JEZIK_DRZAVE.HU`), vstop
`slff.eu/hu`, kartico ob deljenju `hu.html` (Caddy jo vrne za `/hu` in
`?t=hu-…`), madžarsko vejo pošte (`sporocila.ts`, avtentikacijske predloge in
zadeve v `docker-compose.slff.yml`) in madžarska imena lastnikov hišnih ekip
(priimek pred imenom, "Nagy Péter"). **Šifra madžarske lige se začne s
`hu-`.** Ugib: brskalnik `hu`, pas `Europe/Budapest`. Zveze, tekmovanja in vir
vpiše svoja migracija. Madžarščina ime lige sklanja s priponami, zato ga
`ligaVTozilniku` pusti v imenovalniku in madžarski stavki ga postavijo
samostojno ("Megnyílt a fantasy liga: {liga}."); enako ime kluba in številke
(člen a/az je odvisen od izgovora). Za številom je samostalnik v ednini
("3 pont"), zato imata množinski obliki `one` in `other` isto besedo. Stran
Pozicije je v meniju kot v Sloveniji (če madžarski vir pozicije prinese, jo
skrij v `Navbar.tsx` kot za SK). Madžarskega kanala v HelpStacku še ni:
`Podpora.tsx` za `hu` uporabi slovenskega.

Vir `mlsz` (`scripts/viri/mlsz.mjs`) bere **MLSZ adatbank**
(adatbank.mlsz.hu), kjer MLSZ in vseh dvajset županijskih zvez objavljata
vsa tekmovanja. Brez zaščite pred roboti, robots.txt branje dovoli
(ada1bank: `Crawl-delay: 1`), posrednika ni treba. Beremo odkrito
(`User-Agent: SLFF fantasy`, 1,5 s med stranmi, popolnih zapisnikov ne
beremo znova). **Če se pojavi izziv ali CAPTCHA, ustavi — ne obhajaj.**

- **Šifra lige** je `<évad>/<szervezet>/<verseny>`, npr. `67/20/33915`
  (Zala Vármegyei I. osztály 2026/27). Évad je id sezone, ne letnica, in ni
  enakomeren: 67 = 2026/27, 65 = 2025/26, 63 = 2024/25, 61 = 2023/24
  (`SEZONE` v viru; zapisnik sezono pove sam z izbrano možnostjo izbirnika).
  Szervezet je zveza: 0 MLSZ, 1–20 županije (5 Budapest, 20 Zala). Verseny
  je id tekmovanja in se **z vsako sezono zamenja**, tudi arhiv ima svojega
  (Zala I 2025/26 = `65/20/31672`).
- **Strani**: krog `league/<évad>/<sz>/<verseny>/<krog>.html` (`#match_panel`,
  koliko krogov je, pove izbirnik `Forduló`; pod razporedom kroga je še ves
  razpored ene ekipe, zato se bere le panel in le tekme s tem krogom v
  povezavi; `szabadnap` je prost krog), zapisnik
  `match/<évad>/<sz>/<verseny>/<krog>/<id>.html` (lahko preusmeri na
  ada1bank, ista stran). Seznam lig zveze vrne
  `POST ada1bank.mlsz.hu/libs/ajax.php` (`type=getHeaderFilderData`).
- **Zapisnik**: `#left_team` domači, `#right_team` gostje; pred `CSERÉK`
  začetniki, za njim klop (tudi neuporabljene rezerve), od `VEZETŐEDZŐ`
  vodstvo ekipe, katerega kartoni ne štejejo. Šifra igralca iz
  `player/<id>.html` → `reg_st`. Menjave so v parih (`match_players_changeup`),
  rezerva lahko gre noter in ven. Avtogol je pri igralcu, ki ga je dal.
  Minute 91–96 se odrežejo na 90.
- **Vratar NI označen.** Prvi začetnik je poseben (ostalih deset je urejenih
  po dresu, prvi v 168 od 358 postav ne), v praksi vratar: rezerva, ki pride
  namesto njega, ima skoraj vedno dres 1. Uvoz zato prvemu začetniku in
  njegovi zamenjavi da `vratar` (→ GK, `is_goalkeeper`) — **le kot namig**;
  ostali so brez pozicije in čakajo na glasovanje kot v Sloveniji. Napačen
  namig popravi *Uskladi pozicije* z `vir = mlsz` (večina tekem).
- **Kontumacija**: 3:0 (0:0) brez postav (Zala I 2025/26 tri). Razpored jo
  označi (pri obeh praznih postavah po tednu dni, kot hns), zapisnik vrne null.
- Vzdevek kluba: `ZVFC` (2025/26) = `Zalaszentgróti VFC` (2026/27).
- **Delitve sezone so ločene lige**: felsőház/alsóház, rájátszás 1–6 / 7–12
  (npr. Zala III. Északi rájátszás `33546`/`33548`, Veszprém II. felsőház
  `33478`) imajo vsaka svoj verseny z ekipami več skupin. Za arhiv osnovne
  lige jih **ne** uvažaj — enako kot nadstavbo Plzeň-jih — sicer v ligo
  pripeljejo igralce drugih skupin.

Preizkus vira na Zala I 2025/26 (`65/20/31672`): 26 krogov, 182 tekem,
3 kontumacije, 179 zapisnikov, 714 golov (= izidi), 358/358 postav po 11,
1173 nastopov s klopi, vsi nastopi s šifro.

Vpisanih je 19 lig vármegyei I. osztály (migracija 20261009021100),
**neaktivnih**. Tolna I. osztály 2026/27 še nima (le kvalifikacija). Arhiv je
osnovno tekmovanje 2025/26 (ev 65, ne 66):

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| hu-bk-1 | `67/1/33671` | `65/1/31503` |
| hu-ba-1 | `67/2/33837` | `65/2/31434` |
| hu-be-1 | `67/3/33830` | `65/3/31544` |
| hu-baz-1 | `67/4/33596` | `65/4/31346` |
| hu-bp-1 | `67/5/33753` | `65/5/31531` |
| hu-cs-1 | `67/6/33870` | `65/6/31523` |
| hu-fe-1 | `67/7/34106` | `65/7/31898` |
| hu-gy-1 | `67/8/33888` | `65/8/31658` |
| hu-hb-1 | `67/9/33901` | `65/9/31597` |
| hu-he-1 | `67/10/33860` | `65/10/31643` |
| hu-jn-1 | `67/11/33736` | `65/11/31489` |
| hu-ke-1 | `67/12/33789` | `65/12/31687` |
| hu-no-1 | `67/13/33928` | `65/13/31712` |
| hu-pe-1 | `67/14/33660` | `65/14/31445` |
| hu-so-1 | `67/15/33702` | `65/15/31582` |
| hu-sz-1 | `67/16/33809` | `65/16/31415` |
| hu-va-1 | `67/18/34394` | `65/18/31701` |
| hu-ve-1 | `67/19/34160` | `65/19/32093` |
| hu-za-1 | `67/20/33915` | `65/20/31672` |

**Drugi val** (migracija 20261009103100): 30 lig vármegyei II. osztály s
skupinami in BLSZ II., **neaktivnih**. Tolna II. 2026/27 nima (kvalifikacija
I-II). Seznam tekmovanj zveze in sezone vrne `POST
ada1bank.mlsz.hu/libs/ajax.php` z `type=getHeaderFilderData&season=<évad>&federationId=<sz>&leagueId=0&changedType=first`
(`leagues[]`: id, ime, `isCup`).

**Arhiva ne moreta deliti dve ligi**: `matches.zapisnik_id` je enoličen, drugi
uvoz istega arhiva pade (`matches_zapisnik_id_key`, hu-bk-2-eszak 9. 10.).
Kjer je županija skupine preuredila, dobi vsaka skupina svojo lansko skupino,
manjkajočo pa iz 2024/25 (évad 63), ki je ne uporablja nihče drug. Sezone pred
2025/26 adatbank preusmeri na živi ada1bank, ki občasno vrne 43-bajtni
ostanek; vir ga prebere znova, vztrajen ostanek ustavi uvoz (`stranKroga`).
Isti ostanek (`SQLSTATE[08004] [1040] Too many connections`, 200) pride tudi
namesto strani tekme. **Ostanek ne gre v predpomnilnik** (`vir.zaPredpomnilnik`:
le stran s `match_panel` ali `left_team`) in shranjenega uvoz ne bere; stran
tekme se po umiku prebere znova (`stranTekme`), vztrajen ostanek tekmo
preskoči z opozorilom. Prej se je shranil kot vsak odgovor 200 in tekma,
starejša od 45 dni, se ni prebrala nikoli več: 10.–12. 10. 2026 je tako 286
tekem 65 lig ostalo brez zapisnika.

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| hu-bk-2-del / -eszak | `67/1/33672` / `33675` | `65/1/31504` / `63/1/29300` (2024/25 Észak) |
| hu-ba-2 | `67/2/33838` | `65/2/31435` |
| hu-be-2 | `67/3/33831` | `65/3/31546` |
| hu-baz-2-eszak / -kelet / -kozep | `67/4/34085` / `34086` / `34087` | `65/4/31788` / `31789` / `31790` |
| hu-bp-2 | `67/5/33754` | `65/5/31532` |
| hu-cs-2 | `67/6/33873` | `65/6/31524` |
| hu-fe-2-eszak / -del | `67/7/34109` / `34111` | `65/7/31902` / `31933` |
| hu-gy-2-kelet / -eszak / -nyugat | `67/8/33890` / `34176` / `34179` | `65/8/31660` / `31866` / `31868` (brez felső/alsóháza) |
| hu-hb-2-eszak / -del | `67/9/34117` / `34119` | `65/9/31600` / `31602` |
| hu-he-2 | `67/10/33864` | `65/10/31644` |
| hu-jn-2 | `67/11/33737` | `65/11/31490` |
| hu-ke-2 | `67/12/33790` | `65/12/31688` |
| hu-no-2 | `67/13/33936` | `65/13/31713` |
| hu-pe-2-eszak / -del | `67/14/34067` / `34068` | `65/14/31815` / `31816` |
| hu-so-2 | `67/15/33708` | `65/15/31584` |
| hu-sz-2-1 / -2 | `67/16/33811` / `34157` | `65/16/31417` / `31839,31842` |
| hu-va-2-szombathely | `67/18/34047` | `65/18/31703,31704` (II. Észak + III. Szombathely) |
| hu-va-2-kormend | `67/18/34043` | `65/18/31957,31949` (II. Dél + III. Körmend) |
| hu-va-2-sarvar | `67/18/34046` | `65/18/31952`, `63/18/29547,29693` (III. Sárvár + II. 2024/25) |
| hu-ve-2 | `67/19/33719` | `65/19/32270` (alapszakasz, brez felső/alsóháza) |
| hu-za-2 | `67/20/33916` | `65/20/31673` |

**NB I in NB II** (migracija 20261010230100, **neaktivni**) sta v Adatbank pod
zvezo 0, a s **sponzorskim imenom**, zato ju iskanje "NB I" ne najde:
2026/27 `67/0/33586` OTP Bank Liga (NB I, 33 krogov) in `67/0/33587`
Merkantil Bank Liga (NB II, 30); arhiv 2025/26 `65/0/31362` (takrat "Fizz
Liga") in `65/0/31363`. Ime se menja s sponzorjem — išči po šifri. Zapisnik je
enak županijskim, vratar prav tako ni označen.

robots.txt ada1bank ima od oktobra 2026 poleg `Crawl-delay: 1` še
`Disallow: /` za imenovane AI pajke (GPTBot, ClaudeBot, CCBot …). Uvoz s
`User-Agent: SLFF fantasy` ni med njimi, a če se seznam razširi na vse, uvoz
ustavi.

**Tretji val** (migracija 20261010191100): 67 lig, **neaktivnih** — NB III
(4 skupine, zveza `mlsz` = državna raven), vármegyei III. osztály vseh
županij s skupinami (49, tudi Tolna, nova zveza `mlsz-to`), IV. osztály
(8: Csongrád 2, Pest 4, Somogy 2) in BLSZ III./IV. (po 3). Le odrasli moški na
velikem igrišču. Kjer je županija skupine preuredila, je arhiv izbran po skupnih
klubih (1. krog obeh sezon); vsak arhiv ima ena sama liga. Vas III. 2025/26
že uvažajo lige Vas II., zato Vas III. dobi 2024/25 (évad 63).

Izpuščeno: Győr *Tartalék* (Kelet, Nyugat A — rezervne ekipe), BLSZ *Old
Boys*, mestne amaterske lige (Fejér: Alba Liga, DLSZ Diablo/Varázskép;
Csongrád: III.A/B/C IHS/KÉSZ/GNX — niso vármegyei), Pannon Egyetemi Házi
(univerzitetna), Neumann Football Liga, Tolna I-II. Kvalifikáció, vse
mladinske, ženske, futsal, kispályás, pokali, osztályozó, felsőház/alsóház
in rájátszás. Veszprém III. 2026/27 je *Alapszakasz* — nadaljevanje bo svoje
tekmovanje (kot Veszprém II.).

Preverba arhivov (10. 10. 2026, zadnji krog vsakega od 69 arhivov): število
krogov se ujema s seznamom zveze, zadnji krog je odigran (trije s po eno
neodigrano tekmo), prvi zapisnik z izidom se razčleni (11 + 11, dvakrat
ekipa z 10 oz. 9 začetniki; goli = izid, vsi nastopi s šifro); 14 vzorcev je bilo kontumacij zadnjega kroga
(zapisnik null, pričakovano). Adatbank je ta dan pogosto vračal `SQLSTATE
[1040] Too many connections` — počakaj in ponovi, ne pospešuj.


| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| hu-nb3-eszak-kelet | `67/0/33588` | `65/0/31364` |
| hu-nb3-del-kelet | `67/0/34054` | `65/0/31782` |
| hu-nb3-eszak-nyugat | `67/0/34055` | `65/0/31783` |
| hu-nb3-del-nyugat | `67/0/34056` | `65/0/31784` |
| hu-bk-3-del | `67/1/33674` | `65/1/31506` |
| hu-bk-3-eszak | `67/1/33676` | `65/1/31507` |
| hu-bk-3-kozep | `67/1/33677` | `65/1/31508` |
| hu-bk-3-nyugat | `67/1/33678` | `65/1/31509` |
| hu-ba-3-a | `67/2/34398` | `65/2/32145`, `65/2/32144` (Csík + Czibulka) |
| hu-ba-3-b | `67/2/34399` | `65/2/32147` (Dárdai) |
| hu-be-3-eszak | `67/3/33832` | `65/3/31548` |
| hu-be-3-del | `67/3/34173` | `65/3/31901` |
| hu-baz-3-eszak | `67/4/34090` | `65/4/31791` |
| hu-baz-3-kelet | `67/4/34089` | `65/4/31792` |
| hu-baz-3-del | `67/4/34091` | `65/4/31793` |
| hu-bp-3-1 | `67/5/33755` | `65/5/31533` |
| hu-bp-3-2 | `67/5/34211` | `65/5/31946` |
| hu-bp-3-3 | `67/5/34212` | `65/5/31947` |
| hu-bp-4-1 | `67/5/34214` | `65/5/31535` |
| hu-bp-4-2 | `67/5/34213` | `65/5/31997` |
| hu-bp-4-3 | `67/5/33756` | `65/5/31998` |
| hu-cs-3 | `67/6/33875` | `65/6/31530` |
| hu-cs-4-tisza-maros | `67/6/33879` | `65/6/31832` |
| hu-cs-4-homokhat | `67/6/34084` | `65/6/31550` |
| hu-fe-3-eszak | `67/7/34113` | `65/7/31951` |
| hu-fe-3-del | `67/7/34115` | `65/7/31960`, `65/7/31961` (Kelet + Dél) |
| hu-gy-3-kelet-a | `67/8/33892` | `65/8/31871` |
| hu-gy-3-kelet-b | `67/8/34181` | `65/8/31662` |
| hu-gy-3-eszak | `67/8/34182` | `65/8/31872` |
| hu-gy-3-nyugat-a | `67/8/34183` | `65/8/31874` (brez felső/alsóháza) |
| hu-gy-3-nyugat-b | `67/8/34185` | `65/8/31876` |
| hu-hb-3-eszak | `67/9/34121` | `65/9/31604` |
| hu-hb-3-del | `67/9/34122` | `65/9/31605` |
| hu-he-3 | `67/10/33863` | `65/10/31645` |
| hu-jn-3 | `67/11/33738` | `65/11/31491` |
| hu-ke-3-del | `67/12/33791` | `65/12/31689` |
| hu-ke-3-eszak | `67/12/34204` | `65/12/31948` |
| hu-no-3-kelet | `67/13/33940` | `65/13/31714` |
| hu-no-3-nyugat | `67/13/34057` | `65/13/31811` |
| hu-pe-3-eszak | `67/14/34069` | `65/14/31818` |
| hu-pe-3-del | `67/14/34070` | `65/14/31819` |
| hu-pe-3-kelet | `67/14/34071` | `65/14/31820` |
| hu-pe-4-eszak | `67/14/34072` | `65/14/31822` |
| hu-pe-4-delkelet | `67/14/34073` | `65/14/31824` |
| hu-pe-4-kelet | `67/14/34074` | `65/14/31825` (Közép) |
| hu-pe-4-nyugat | `67/14/34075` | `65/14/31823` (Déli) |
| hu-so-3-eszak | `67/15/33709` | `65/15/31585` |
| hu-so-3-del | `67/15/34170` | `63/15/29430` (III. 2024/25; 2025/26 je bila ena skupina) |
| hu-so-4-eszak | `67/15/33710` | `65/15/31586` |
| hu-so-4-del | `67/15/34107` | `65/15/31856` |
| hu-sz-3-nyugat | `67/16/33814` | `65/16/31419` |
| hu-sz-3-kozep | `67/16/34163` | `65/16/31845` |
| hu-sz-3-kelet | `67/16/34164` | `65/16/31846` |
| hu-to-3-kelet | `67/17/33957` | `65/17/31529` (Dél) |
| hu-to-3-nyugat | `67/17/34465` | `65/17/31528` (Észak) |
| hu-va-3-szombathely | `67/18/33771` | `63/18/29548` (2024/25; 2025/26 ima Vas II.) |
| hu-va-3-kormend | `67/18/34049` | `63/18/29695` (2024/25) |
| hu-va-3-sarvar | `67/18/34050` | `63/18/29696` (2024/25) |
| hu-ve-3-eszak | `67/19/34241` | `65/19/31919` |
| hu-ve-3-kelet | `67/19/34242` | `65/19/31920` |
| hu-ve-3-nyugat | `67/19/34243` | `65/19/31931` |
| hu-ve-3-del | `67/19/34246` | `65/19/31932` |
| hu-za-3-eszak | `67/20/33917` | `65/20/31674` |
| hu-za-3-del | `67/20/33918` | `65/20/31675` |
| hu-za-3-kelet | `67/20/33919` | `65/20/31677` |
| hu-za-3-nyugat | `67/20/33920` | `65/20/31676` |
| hu-za-3-kozep | `67/20/34240` | `63/20/29515` (Nyugat 2024/25; nova skupina) |

**Mladinci U19** (migracija 20261012061100): 48 lig, **neaktivnih**, le
najstarejša kategorija na velikem igrišču — MLSZ Országos U19 Kiemelt in Alap,
Regionális U19 Kiemelt (Nyugat, Kelet) in sedem skupin Regionális U19 Alap
(zveza `mlsz`; Adatbank regionalne vodi pod županijo, ki jih izvaja, zato je
`<sz>` v šifri županija) ter županijske U19 lige s skupinami. Nobena županija
nima U18 namesto U19. Kot druge mladinske lige: `prvi_fantasy_krog = 2`,
`rok_pomak_ur = 2`. Ekipe U19 nosijo ime kluba (`kljucKlubaHu` pripono U19
odreže), klub je skupen s člani. Zapisniki so enaki kot pri odraslih
(postavi 11 + 11, klop, menjave v parih, šifre igralcev).

Izpuščeno: U17 in mlajši (tudi Nógrád, ki ima najvišjo U17), U21 (Győr,
Hajdú-Bihar, Heves, Nógrád, Vas, Zala, Veszprém II. — spremljevalne lige
odraslih, ne mladinske; Győr, Hajdú-Bihar, Heves, Nógrád in Vas zato županijske
U19 nimajo, njihovi klubi igrajo v regionalnih), leány/női, futsal (tudi
županijski U19 futsal), kispályás, Fejér *Téli Műfüves* (zimski turnir),
Pest *PVMF7vége* (turnir), pokali in rájátszás. Pest U19 A–E (8 klubov, 9
krogov) in Komárom-Esztergom U19 *Alapszakasz* sta le jesenski del —
nadaljevanje bo svoje tekmovanje (kot Veszprém III.).

Arhiv je osnovno tekmovanje 2025/26; kjer je županija skupine preuredila, je
izbran po skupnih klubih 1. kroga (BLSZ 2025/26 je bila ena skupina →
1. csoport, 2. csoport dobi 2024/25; Pest 2025/26 A–D → A, C, D, E).
**Pest U19 B in Komárom-Esztergom U19 II. sta brez arhiva** (lanske skupine
so porabile druge lige, KEM je imel lani eno samo U19).

22. 10. 2026 sta v običajni paket obstoječih lig prijavljena samo
`hu-baz-u19-2-kozep` (`67/4/34094`, arhiv `65/4/31796`) in
`hu-to-3-nyugat` (`67/17/34465`, arhiv `65/17/31528`). Registracija ni vklop:
predogled in vklop še vedno preverita natančno šifro, manjkajoče pretekle
tekoče zapisnike, izide proti golom, cene, veljaven kader in prihodnji rok.
Pred vklopom posebej preveri vse arhivske in tekoče napake minut ter
aktivnega vratarja vsakega trenutnega kluba. Izjem za zgodovinske zapisnike
ali za manjkajoči arhiv ti ligi nimata.

Preverba arhivov (11.–12. 10. 2026, zadnji krog vsakega od 49 arhivov): število
krogov se ujema s seznamom zveze, zadnji krog je odigran (Békés Észak ena
neodigrana tekma); prvi zapisnik z izidom se razčleni pri 47 (goli = izid,
vsi nastopi s šifro, klop in menjave kot pri odraslih), dva vzorca sta
kontumaciji (zapisnik null). Mladinske ekipe pogosteje igrajo okrnjene: pet
vzorcev ima ekipo z 8–10 začetniki (opozorilo, ne napaka). Adatbank je ves čas
vračal `SQLSTATE[08004] [1040] Too many connections` — preverba je tekla s
3,5 s med zahtevki in umikom do 5 minut.

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| hu-u19-orszagos-kiemelt / -alap | `67/0/34125` / `33758` | `65/0/31618` / `31992` |
| hu-u19-kiemelt-nyugat / -kelet | `67/0/33775` / `34140` | `65/0/31636` / `32034` |
| hu-u19-eszaknyugat | `67/8/34463` | `65/8/32091` |
| hu-u19-kozepnyugat | `67/7/34362` | `65/7/32098` |
| hu-u19-delnyugat | `67/2/34374` | `65/15/32152` (lani pod Somogy) |
| hu-u19-kozepkelet | `67/5/34365` | `65/5/32155` |
| hu-u19-eszakkelet | `67/10/34363` | `65/13/32100` (lani pod Nógrád) |
| hu-u19-kelet | `67/16/34403` | `65/16/32090` |
| hu-u19-delkelet | `67/6/34350` | `65/6/32097` |
| hu-bk-u19-del / -eszak / -kozep | `67/1/33679` / `33680` / `33681` | `65/1/31510` / `31511` / `31512` |
| hu-ba-u19-1 | `67/2/33845` | `65/2/31438` |
| hu-ba-u19-2 | `67/2/33847` | `65/2/32199,32200` (A + B, brez rájátszás) |
| hu-be-u19-eszak / -del | `67/3/34290` / `33833` | `65/3/31726` / `32046` |
| hu-baz-u19-1 | `67/4/33599` | `65/4/31350` |
| hu-baz-u19-2-eszak / -kelet / -kozep | `67/4/34092` / `34093` / `34094` | `65/4/31794` / `31795` / `31796` |
| hu-bp-u19-1 | `67/5/33817` | `65/5/31545` (alapszakasz) |
| hu-bp-u19-2 | `67/5/34361` | `63/5/29828` (2. csoport 2024/25) |
| hu-cs-u19-szalai / -toth | `67/6/33880` / `34102` | `65/6/31554` (Homokhát) / `31904` (Tisza-Maros) |
| hu-fe-u19-1 | `67/7/34116` | `65/7/31938` |
| hu-fe-u19-2-eszak / -nyugat / -del | `67/7/34186` / `34187` / `34188` | `65/7/31964` (Kelet) / `31962` (Észak) / `31966` (Dél) |
| hu-jn-u19-1 | `67/11/33742` | `65/11/31496` |
| hu-jn-u19-teruleti | `67/11/33744` | `65/11/31497,31990` (I. + II. csoport) |
| hu-ke-u19-1 / -2 | `67/12/33795` / `33797` | `65/12/31692` / — |
| hu-pe-u19-a / -b / -c / -d / -e | `67/14/34248` / `34249` / `34250` / `34387` / `34252` | `65/14/32326` / — / `32327` / `32328` / `32325` |
| hu-so-u19-1 | `67/15/33707` | `65/15/31583` |
| hu-so-u19-2-eszak / -del | `67/15/33711` / `34108` | `65/15/31587` / `31857` |
| hu-sz-u19-1 | `67/16/33810` | `65/16/31416` |
| hu-sz-u19-2-1 / -2-2 | `67/16/33812` / `34158` | `65/16/31418` / `31844,31841` (3. + 2. csoport) |
| hu-to-u19 | `67/17/33960` | `65/17/31536` |
| hu-ve-u19 | `67/19/34165` | `65/19/32094` |
| hu-za-u19 | `67/20/33922` | `65/20/31681` |
