# SLFF Scout → orodje za upravljanje kluba

Datum: 27. 10. 2026. Status: osnutek (Claude, po raziskavi trga; lastnik je
raziskavo in načrt prepustil Claudu). Odločitve, označene **(Claude)**, so
privzete in jih lastnik lahko spremeni.

## Zakaj

Scout danes odpre skavt ali trener, ko išče igralca. Lastnik želi
**univerzalno orodje za cel klub**, ki ga klub odpre vsak teden. Trg
(spodaj) kaže, da ima vsak amaterski klub dva sveta, ki se ne pogovarjata:

- **Zveza** (COMET pri NZS/HNS, IFA pri MLSZ, DFBnet) ima uradne podatke
  tekem, klubu pa ne da nobene analize.
- **Ekipna aplikacija** (Spond, SpielerPlus, SportEasy, Heja, Teamer) ima
  koledar, prisotnost in sporočila, statistiko pa mora trener **vpisati
  ročno** — zato je večina nima.

SLFF ima uradne podatke vsakega kluba v ~30 državah samodejno (zapisniki:
postave, minute, menjave, goli, kartoni, izidi) in vsak klub je že v bazi.
To je prednost, ki je nihče od konkurentov nima: **orodje brez vnašanja**.

## Konkurenca (povzetek)

Celotna tabela 24 izdelkov z viri: priloga *Raziskava trga* spodaj.

| izdelek | za koga | cena | slabost |
|---|---|---|---|
| Spond | ekipe in klubi | brezplačno, 2,5 % + 0,20 € plačila | preveč obvestil, člani vidijo e-pošto drugih |
| SportEasy | FR amaterji | 69 €/ekipo/leto; klub 0,33–0,48 €/člana/mesec | statistika ročno |
| SpielerPlus | DACH (410 k ekip) | brezplačno + Premium | statistika ročno |
| 360Player | klubi, akademije | 49 $/mesec + 3 $/uporabnika | cena raste z uporabniki |
| Vereinsplaner, ClubDesk, Campai | društva DACH | 119 €/leto – 30 €/mesec | splošno, ne nogomet |
| COMET, IFA, DFBnet | zveze | plača zveza | le administracija |
| Veo, Hudl | video | 999 € kamera + 45–165 €/mesec | strojna oprema |
| Wyscout, InStat | profesionalci | ~15–25 k€/leto | pod 3.–4. ravnijo ni pokritosti |

V SI/HR/SK/HU ni prevladujočega komercialnega orodja: klubi uporabljajo
zvezin sistem + WhatsApp/Viber + Excel (ali Spond).

**Kaj ima vsak** (osnova): koledar s potrditvami udeležbe in opomniki,
sporočila, register članov z vlogami (admin, trener, igralec, starš),
članarine/plačila, statistika prisotnosti, brezplačna raven na ekipo.

**Kaj plačajo**: 100–600 € na klub na leto je realen pas; na klub, ne na
člana (klubi z mladinsko šolo imajo stotine članov).

**GDPR**: digitalna privolitev SI 15, AT 14, HR/DE/SK/HU 16 → računi staršev
pod to mejo; zdravstveni podatki (zdravniški pregled, poškodbe) so posebna
vrsta podatkov; seznam članov zaseben privzeto (glavna pritožba pri Spondu);
klub je upravljavec, SLFF obdelovalec (pogodba po čl. 28).

## Pozicioniranje (Claude)

**Ne tekmujemo s Spondom v brezplačnem klepetu.** Prodajamo tisto, česar
nima nihče: klubski pregled, ki se izpolni sam, in poleg njega osnovo
upravljanja (koledar, prisotnost), da ga trener odpre vsak teden.

> SLFF Klub: vse o tvojem klubu iz uradnih zapisnikov — brez vnašanja.

## Načrt po fazah

| faza | vsebina | odvisnost |
|---|---|---|
| **1 Ekipa** (ta dokument, gradimo zdaj) | koledar (uradne tekme samodejno + treningi kluba, tedenska ponovitev), prisotnost na treningih, kader selekcije s sezonskimi dejstvi in kartoni ter deležem prisotnosti | obstoječi Scout sedeži |
| 2 Nasprotnik | poročilo o naslednjem nasprotniku (že načrtovan del 2 strani Klub) | — |
| 3 Igralci in starši | potrditev udeležbe na slff.eu/aplikaciji (prevzet profil), push opomniki, ICS naročnina koledarja, vloga trener na selekcijo (več kot 3 sedeži), računi staršev | pogodba o obdelavi, pravila mladoletnih |
| 4 Članarine | evidenca plačil, nato pobiranje prek Stripe Connect (provizija) | pravnik/računovodja |
| 5 Vsebina in sponzorji | samodejni plakati tekem in strelcev (strežnik slik že obstaja), poročilo o dosegu za sponzorje, gradnik za spletno stran kluba | — |
| 6 Kazni | opozorila o rumenih kartonih po pravilniku vsake zveze | pravila po zvezah |

Paketi **(Claude, predlog lastniku)**: brezplačno *Klub* (koledar,
prisotnost, kader — rast, vsak klub je že v bazi), plačljivo *Scout*
(obstoječe 39 €/mesec, 290 €/sezono), pozneje *Pro*. **Faza 1 Stripe ne
spreminja**: nove strani so za istim sedežem in naročnino (tudi preizkus) kot
preostanek Scouta, dokler lastnik ne odloči o brezplačni ravni.

Ime in domena ostaneta `scout.slff.eu` / SLFF Scout, dokler lastnik ne
odloči o preimenovanju.

## Faza 1: Ekipa

### Kaj klub dobi

1. **Koledar** (`/calendar`): seznam po tednih za izbran mesec. Uradne tekme
   vseh selekcij kluba (članska in mladinske, domače in gostujoče) pridejo
   same iz `matches` (datum, nasprotnik, doma/v gosteh, izid, povezava na
   tekmo na slff.eu). Klub doda **dogodke**: trening, prijateljska tekma,
   sestanek, drugo — selekcija, začetek, trajanje, kraj, opomba; pri dodajanju
   lahko izbere **"ponovi vsak teden do"** (največ 52).
2. **Dogodek** (`/calendar/:id`): podatki dogodka, urejanje, brisanje (enega
   ali vseh prihodnjih iz iste serije) in **prisotnost**: kader selekcije s
   tremi stanji — prisoten, opravičen, odsoten. Shrani se naenkrat.
3. **Kader** (`/squad`): za izbrano selekcijo tekoča sezona iz zapisnikov —
   nastopi, začetki, minute, goli, rumeni, rdeči — in prisotnost na treningih
   zadnjih 30 dni (prisoten / vsi označeni). Kartoni so dejstvo ("4 rumeni"),
   ne napoved kazni (pravilniki se razlikujejo po zvezah; faza 6).

### Odločitve (Claude)

| tema | odločitev | zakaj |
|---|---|---|
| kdo | imetniki sedežev kluba z veljavno naročnino ali preizkusom (`scout.dostop`), kot ostali Scout | brez novega modela pravic v fazi 1 |
| selekcije | tekmovanja, v katerih ima klub tekme ali igralce v tekoči sezoni (`sezona_lige`), tudi mladinske | upravljanje celega kluba; podatki so klubu lastni |
| kader selekcije | igralci kluba v tej selekciji z nastopom v tekoči sezoni ali dodani s strani kluba (`dodal_klub_at`, aktivni); brez anonimiziranih in brez ugovora (`scout.ugovori`) | ista pravila kot stran Klub (odločitev lastnika 18. 10.); glej odprta vprašanja |
| mladi | igralci z mladinsko vrstico so v kadru svoje selekcije (le lastni klub), samo javna dejstva tekem | kot stran Klub (U19, 18. 10.) |
| prisotnost | le tri stanja, **brez razloga in proste besede** | razlog odsotnosti je pogosto zdravstveni podatek (čl. 9) |
| shramba | zaprta shema `scout` (`scout.dogodki`, `scout.prisotnost`), le prek RPC | kot ostali Scout; agentom shema ni dostopna |
| dnevnik | vsak klic skozi `scout.dostop` z novimi vrstami `koledar`, `dogodek`, `ekipa`; pri kadru id-ji igralcev v `parametri.igralci` | zahteva igralca "kdo me je gledal" ostane popolna; meja 300 drži |
| prisotnost en klic | `scout_shrani_prisotnost` zapiše ves kader naenkrat | 20 klikov ne porabi 20 klicev meje |
| izbris | dogodki se brišejo s prisotnostjo (kaskada); `scout.pocisti` briše dogodke starejše od 24 mesecev | hramba osebnih podatkov omejena |
| tekme | uradnih tekem ne kopiramo v `scout.dogodki`; koledar jih bere živo | ena resnica, brez sinhronizacije |
| čas | `timestamptz`, vmesnik prikazuje v Europe/Ljubljana prek `datumUra` vzorca Scouta | obstoječi vzorec |

### Baza (nova migracija)

- `scout.dogodki`: `id`, `team_id` (klub), `competition_id` (selekcija),
  `vrsta` (`trening`/`prijateljska`/`sestanek`/`drugo`), `zacetek`
  timestamptz, `trajanje_min` int (15–600), `kraj` text (≤120), `opomba`
  text (≤500), `serija` uuid null, `ustvaril` uuid, `created_at`.
- `scout.prisotnost`: (`dogodek_id` → kaskada, `player_id`), `stanje`
  (`prisoten`/`opravicen`/`odsoten`), `oznacil` uuid, `updated_at`.
- `scout.selekcije_kluba(team)` (pomožna): tekmovanja s tekmo ali aktivnim
  igralcem kluba v tekoči sezoni.
- `scout.kader_selekcije(team, competition)` (pomožna): pravila zgoraj.
- RPC (`security definer`, `grant execute` le `authenticated`):
  `scout_koledar(p_od date, p_do date)`, `scout_dogodek(p_id)`,
  `scout_shrani_dogodek(…, p_ponovi_do date)`, `scout_brisi_dogodek(p_id,
  p_vse_prihodnje)`, `scout_shrani_prisotnost(p_id, p_vnosi jsonb)`,
  `scout_ekipa(p_competition_id)`.
- Preverbe: selekcija mora biti klubova; dogodek tujega kluba → napaka
  (nikoli tiho); igralec v prisotnosti mora biti v kadru selekcije; obseg
  koledarja največ 62 dni.

### Vmesnik

- Novi strani `Koledar.tsx`, `Dogodek.tsx`, `Kader.tsx` v
  `scout/src/strani/`; zavihka *Koledar* in *Kader* v `Okvir.tsx`; nizi sl/en
  v `scout/src/besede.ts`.
- Videz kot preostanek Scouta (kartice, `tabular-nums`), mobilno najprej:
  trener označuje prisotnost na igrišču s telefonom — velike tarče (≥44 px),
  segmentni gumbi za stanje, "vsi prisotni" z enim dotikom.

### Testi

- `supabase/tests/varnost.sql`: brez sedeža → napaka; tuj dogodek → napaka;
  tuja selekcija → napaka; igralec izven kadra → napaka; anon nima dostopa do
  tabel; ponovitev ustvari pravilno število dogodkov in ne več kot 52.
- `npm run smoke:scout`, `npm run typecheck`, `npm run build:scout`,
  `npm run test:varnost`.

## Odprta vprašanja za lastnika

1. **Brezplačna raven** *Klub* (koledar, prisotnost, kader) za vsak klubski
   račun, Scout ostane plačljiv? (Claude priporoča da — rast.)
2. **Ugovor proti Scoutu** zdaj skrije igralca tudi iz kadra in prisotnosti
   lastnega kluba. Za upravljanje bi klub moral videti vse svoje igralce;
   ugovor je mišljen proti skavtiranju, ne proti lastnemu klubu.
3. **Pogodba o obdelavi** (čl. 28) za faze 3+ (računi igralcev in staršev).
4. **Ime**: ostane "SLFF Scout" ali postane "SLFF Klub" z modulom Scout?

## Priloga: Raziskava trga

Celotno poročilo (24 izdelkov, 30 virov): glej `docs/superpowers/specs/2026-10-27-raziskava-trga-klubi.md`.
