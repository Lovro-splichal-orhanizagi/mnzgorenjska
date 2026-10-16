# Grčija — vir `mascot` (Mascotnet)

Država `GR` ("Ελλάδα") — vpiše jo ta migracija (20261016090300) ali migracija
vira `eps`, kar pride prej (obe `on conflict do nothing`). Šifra lige se začne
z `gr-`. Lige ostanejo neaktivne, dokler jih lastnik ne vklopi.

**Vmesnik in pošta.** Grčija ima vmesnik v grščini (`src/i18n/el/`, jezik `el`,
lokale `el-GR-u-hc-h23`, ker sama `el-GR` piše uro z "π.μ."; **grška pisava**,
`JEZIK_DRZAVE.GR`), izbirnik jezika "Ελληνικά", vstop `slff.eu/gr`, kartico ob deljenju `gr.html` (Caddy jo vrne za `/gr` in `?t=gr-…`, tudi rezerva `:3201`, `vercel.json`), grško vejo pošte (`sporocila.ts`;
pozdrav v klicniku "Γεια σου, Νίκο!", `klicnikEl`; avtentikacijske predloge in
zadeve v `docker-compose.slff.yml`), grška imena lastnikov hišnih ekip in
`klub_stik.drzava` (migracija 20261016213700) ter `IMENA_GR` v *Hisne ekipe*. Ugib:
brskalnik `el` ali pas `Europe/Athens`; rok v pošti je po atensko (uro več kot
Ljubljana). Krog je vedno "Nη αγωνιστική", točke one/other ("1 πόντος, 2
πόντοι"), ime lige stoji samostojno za dvopičjem (`ligaVTozilniku` ga pusti).
Stran Pozicije je v meniju (glasovanje). **Nočni uvoz:** `GR` ima 6 košev
(`KOSOV.GR`): `eps` (32 lig, 12–20 minut na ligo) bere iz štirih košev
(`VZPOREDNI.eps = 4`, vsak s 4 × 3 s premora, skupni tempo ostane 3 s),
`mascot` (31 lig, ~4 minute) iz enega; koš 6 je zaradi zamika zgoščenke
virov prazen (pri 5 koših bi mascot delil koš z 9 ligami eps). Manjka še: grški
kanal v HelpStacku (`Podpora.tsx` za `el` uporabi slovenskega) in **pregled
prevoda pri naravnem govorcu**.

**Pisno dovoljenje za zajem: pridobil Lovro, oktober 2026.** Pogoji
Mascotneta (`mascotnet.com/terms.asp`, "Όροι χρήσης" v nogi vsake strani)
samodejno branje prepovedujejo; upravljavec ga je SLFF pisno dovolil.
Dovoljenje **ne pokriva tehnične zaščite**: ob 401, 403, 429, izzivu ali
CAPTCHI se uvoz ustavi (`MascotZavrnitev`, izhod 4) — ne obhajaj (ne novih
sej, IP-jev ali brskalnika). Če upravljavec dovoljenje umakne: vse lige vira
izklopi (`update competitions set active = false where source = 'mascot'`).
Beremo vljudno: User-Agent `SLFF fantasy (https://slff.eu)`, **3 s** med
zahtevki (robots.txt nima `Crawl-delay`; epsm in epsl zapreta le `/form*/`
in `app*`, ostale domene robots.txt nimajo), popolnih zapisnikov ne beremo
znova.

Vir `mascot` (`scripts/viri/mascot.mjs`) bere spletišča EPS, ki jih gosti
Mascot Network Hellas: epsm.gr (Makedonija/Solun), epsachaias.gr, epspellas.gr,
epsdramas.gr, epskozanis.gr, epskerkyras.gr, epsthesprotias.gr, epsl.gr
(Lezbos in Limnos), eps-imathias.gr, epsprevezas-lefkadas.gr (`DOMENE`; kratica
zveze je v slugu in šifri zapisnika — **nikoli je ne spreminjaj**). Koda je
ista (ASP), predloge pa se med domenami razlikujejo (štiri različice razporeda —
epsm, Ahaja `table.asp`, Krf, Lezbos z izidom v isti vrstici — in dve strani
tekme), zato se razčlenjevalnik drži besedila in razredov
`epsm-…`, ne postavitve.

- **Šifra lige je `<domena>:<diorganosi>`**, `diorganosi` natanko kot v meniju
  domene (`table.asp?diorganosi=Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ`; zakomentirani
  vnosi menija so lanski play-off/out). **Arhiva ni**: stran lige vedno kaže
  tekočo sezono (Ahaja ima pretekle sezone le kot slike), cene so le iz
  tekoče sezone. Ob novi sezoni šifra ostane, če zveza ligo imenuje enako.
  Grške črke v šifri `sifra()` (zapisniki.mjs) spremeni v `_`, zato vir svoje
  datoteke imenuje z zgostitvijo šifre (`imeRazporeda`) in preveri, da je
  stran res ta liga (naslov strani, `jeStranLige`).
- **Razpored** je `table_analytika.asp` (epsm, Krf, Lezbos) ali `table.asp`
  (ostale): krogi "N<sup>η</sup> ΑΓΩΝΙΣΤΙΚΗ", vrstica "Domači / - / Gostje"
  (ime kluba ima lahko " - ": "ΑΟ ΤΡΙΤΑΙΑΣ - Ο ΤΡΙΤΑΙΙΚΟΣ"), izid, povezava
  `game.asp?game_number=N&match_date=dd.mm.yyyy`; Ahaja, Kozani, Imatija, Drama
  in Pela imajo pri tekmi še datum in uro, epsm le pri odigranih (s povezave).
  **Čas je atenski → ljubljanski −1 h.** Neodigrani tekmi brez datuma vir
  datum vzame s **strani tekme** (obstaja pred tekmo), številko pa iz
  razporeda ali okvirja "ΕΠΟΜΕΝΗ ΑΓΩΝΙΣΤΙΚΗ" na `table.asp` (epsm) — le za
  naslednja dva kroga, v lastnem predpomnilniku (ura do 12 ur). Krog brez
  znanega datuma prve polovice sezone se oceni (+7 dni, `datum_ocenjen`, kot
  fssid), druga polovica izpade, dokler ne dobi datuma.
- **Številka tekme se vsako sezono ponovi** (vsaka liga ima svoj tisočak:
  epsm Α1 1xxx, Α 1. skupina 2xxx …; `match_date` stran prezre). Šifra
  zapisnika je zato `gr-<zveza>-<leto začetka sezone>-<N>` (`gr-mak-2026-2018`),
  datoteka strani tekme v predpomnilniku prav tako
  (`mascot-tekma-mak-2026-2018.html`, `imeTekme`) — brez sezone bi lanska stran
  s postavami obveljala za letošnjo tekmo. Shranjena stran z datumom več kot tri
  tedne od datuma razporeda se prebere sveže.
- **Zapisnik** `game.asp`: imeni klubov, izid, strelci po ekipah ("27'
  ΧΑΤΖΗΛΙΑΣ Π.", 95' → 90; podaljšek "45' +1 ΙΜΕ" ali "45+1'" → 45), datum in ura ("ΗΜΕΡΟΜΗΝΙΑ", "ΩΡΑ"), za vsako ekipo
  seznam "NN. ΠΡΙΙΜΕΚ Ι." — **pred `<hr>` začetniki, za njim klop** (dres je
  prava številka: začetnik ima lahko 17, klop 03), nato menjave "61' ΙΖSTOP -
  VSTOP" ("ΗΜ.'" = polčas → 45). **Kartonov in asistenc ni.** Igralec v
  izključitvi zato dobi vse minute.
- **Smer menjave** pove, kdo je na igrišču (gre ven) in kdo še ni igral (gre
  noter) — klubi jo pišejo različno. Kjer veljata obe (soimenjaka "ΚΑΛΟΓΡΙΔΗΣ
  Ν. - ΚΑΛΟΓΡΙΔΗΣ Ν."), odloči običajna smer domene (`menjava`). Napake vira
  (prazno ime, oba igralca na klopi, oba na igrišču) dajo le izstop ali le
  vstop ali nič, vedno z opozorilom.
- **Ahaja (epsachaias.gr) klopi ne objavi**: le začetniki, menjave "VSTOP -
  IZSTOP" in pogosto le s priimkom ("46' ΚΕΡΑΜΙΔΑΣ - ΠΑΣΒΑΝΤΙΔΗΣ"). Rezerva, ki
  je vstopila, dobi nastop brez dresa; če ima klub v zapisnikih lige natanko
  enega igralca s tem začetkom imena, dobi njegovo polno ime (`dopolniImena`),
  sicer bi bila ista oseba v bazi dvakrat.
- **Vratar ni označen**: prvi začetnik je vratar (namig → GK, kot `eps`,
  `ffm`); *Uskladi pozicije* z `vir = mascot`, ostale pozicije na glasovanje.
- **Identiteta je ime + klub** (kot fsb, ffm): "ΠΡΙΙΜΕΚ Ι." v velikih grških
  črkah, kot ga piše zveza (male črke brez naglasov niso pravilna grščina);
  soimenjaka loči dres. Isti dres pri dveh igralcih ekipe je opozorilo.
- **Kontumacija**: izid brez strani tekme ali z oznako "α.α." / "ΑΝΕΥ ΑΓΩΝΑ"
  / "ΑΠΟΣΥΡ…" / "ΔΕΝ ΘΑ ΔΙΕΞΑΧΘΕΙ" (`BREZ_BORBE`; velike "Α. Α." so začetnice
  igrišča, ne oznaka), ali 3:0 / 0:3, starejša od tedna, katere stran nima
  postav (`vir.kontumacije`). Nepopoln zapisnik (ekipa z manj kot 7
  začetniki) kot pri `frf`: izid se zapiše, `imported_at` ostane prazen.
- **Predpomnilnik**: v predpomnilnik gre le stran z glavo tekme oziroma
  razpored s krogi (`zaPredpomnilnik`) — vzdrževalna stran ne. Prve tri dni po
  tekmi se stran bere sveže. Shranjena stran je dokončna šele, če je bila
  **shranjena** več kot tri dni po tekmi (čas datoteke, ne starost tekme: stran
  z dne tekme ima lahko postave brez menjav in strelcev; GR ni v nočnem uvozu).
  Nedokončan zapisnik (`nedokoncan`: brez postav, nepopoln, goli ≠ izid, strelca
  ni, menjava brez para) se do 45 dni bere sveže; dokončan nikoli več.
- **Isto ime, drug klub**: zveze so ločene piramide, klub pa je enoličen v
  državi (tudi proti viru `eps`). `IME_V_ZVEZI` (`<domena>|<ključ>` → ime s
  krajem zveze). Pregled 15. 10. 2026 (vseh 41 lig desetih domen in
206 klubov vira `eps`): en trk, Α.Ε. Αμπελοκήπων (Solun, epsm Α 2. skupina,
in Drama, Β) — dramski in njegova druga ekipa sta "Α.Ε. ΑΜΠΕΛΟΚΗΠΩΝ (Δράμα)"
in "… Β (Δράμα)"; z `eps` trkov ni. Ob novi ligi ali sezoni:
  `node scripts/mascot-lige.mjs --trki`.

Seznam lig in preizkus (brez baze, po poti uvoza):

```bash
node scripts/mascot-lige.mjs                        # lige iz menijev vseh domen: krogi, tekme, odigrane
node scripts/mascot-lige.mjs epsm.gr --preveri      # še vsi zapisniki (goli, postave, menjave, minute)
node scripts/mascot-lige.mjs --trki                 # isto ime kluba v dveh zvezah
```

Preizkus v živo (15. 10. 2026, vse lige vseh desetih domen, vsi zapisniki,
po poti uvoza brez baze; ~500 zahtevkov po 3 s, nobenega 403, 429 ali
izziva): v 31 vpisanih ligah 384 odigranih tekem, 380 zapisnikov (stran 4 tekem
še ni dala zapisnika — vir jo bere znova do 45 dni), 1 nepopoln (epsm Γ3, ekipa brez postave);
goli = izid 362/379 — razlika je napaka vira (strelec, ki ga ni na seznamu
igralcev, ali gol brez strelca), izid ostane izid zapisnika; postav po 11
758/759 (Λήμνος: ekipa z 10); 2811 menjav z minuto, 990 minut ima 738/759
ekip — ostale imajo menjavo, ki jo je klub vpisal le do polovice (le izstop
ali le vstop, opozorilo), ali menjavo, pri kateri vir ne ve, kdo gre ven. Ahaja: 386
nastopov s klopi brez dresa (klopi ne objavi). Nobena tekma ni bila brez
borbe.

Vpisanih je 31 lig (migracija 20261016090300), **neaktivnih**, brez arhiva:

| liga | šifra (`<domena>:<diorganosi>`) | klubov | odigranih / zapisnikov | goli = izid | postav po 11 | 990 minut |
|---|---|---|---|---|---|---|
| gr-mak-a1 | `epsm.gr:Α1 ΕΡΑΣΙΤΕΧΝΙΚΗ` | 16 | 56 / 56 | 55/56 | 112/112 | 109/112 |
| gr-mak-a-1 | `epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ` | 14 | 21 / 21 | 21/21 | 42/42 | 40/42 |
| gr-mak-a-2 | `epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ` | 14 | 21 / 21 | 19/21 | 42/42 | 39/42 |
| gr-mak-a-3 | `epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 3ος ΟΜΙΛΟΣ` | 15 | 27 / 27 | 25/27 | 54/54 | 54/54 |
| gr-mak-b-1 | `epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ` | 11 | 5 / 4 | 4/4 | 8/8 | 8/8 |
| gr-mak-b-2 | `epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ` | 12 | 6 / 6 | 6/6 | 12/12 | 11/12 |
| gr-mak-b-3 | `epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 3ος ΟΜΙΛΟΣ` | 12 | 6 / 5 | 5/5 | 10/10 | 9/10 |
| gr-mak-b-4 | `epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 4ος ΟΜΙΛΟΣ` | 12 | 5 / 5 | 5/5 | 10/10 | 10/10 |
| gr-mak-g-1 | `epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ` | 10 | 5 / 5 | 5/5 | 10/10 | 8/10 |
| gr-mak-g-2 | `epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ` | 11 | 4 / 3 | 3/3 | 6/6 | 5/6 |
| gr-mak-g-3 | `epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 3ος ΟΜΙΛΟΣ` | 10 | 4 / 4 (1 nepopoln) | 3/3 | 7/7 | 7/7 |
| gr-mak-g-4 | `epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 4ος ΟΜΙΛΟΣ` | 10 | 3 / 3 | 3/3 | 6/6 | 5/6 |
| gr-mak-g-5 | `epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 5ος ΟΜΙΛΟΣ` | 11 | 4 / 4 | 4/4 | 8/8 | 8/8 |
| gr-ach-a-1 | `epsachaias.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ` | 10 | 15 / 15 | 14/15 | 30/30 | 30/30 |
| gr-ach-a-2 | `epsachaias.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ` | 10 | 15 / 14 | 12/14 | 28/28 | 28/28 |
| gr-ach-b-1 | `epsachaias.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ` | 13 | 12 / 12 | 12/12 | 24/24 | 24/24 |
| gr-ach-b-2 | `epsachaias.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ` | 13 | 12 / 12 | 11/12 | 24/24 | 24/24 |
| gr-pel-a1 | `epspellas.gr:Α1 ΕΡΑΣΙΤΕΧΝΙΚΗ` | 11 | 5 / 5 | 4/5 | 10/10 | 10/10 |
| gr-pel-a | `epspellas.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ` | 12 | 6 / 6 | 5/6 | 12/12 | 12/12 |
| gr-dra-a | `epsdramas.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΠΡΩΤΑΘΛΗΜΑ)` | 12 | 24 / 24 | 24/24 | 48/48 | 47/48 |
| gr-dra-b-a | `epsdramas.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - Α ΟΜΙΛΟΣ (ΠΡΩΤΑΘΛΗΜΑ)` | 12 | 18 / 18 | 18/18 | 36/36 | 34/36 |
| gr-dra-b-b | `epsdramas.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - Β ΟΜΙΛΟΣ (ΠΡΩΤΑΘΛΗΜΑ)` | 12 | 17 / 17 | 15/17 | 34/34 | 33/34 |
| gr-koz-a | `epskozanis.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΠΡΩΤΑΘΛΗΜΑ)` | 11 | 10 / 10 | 10/10 | 20/20 | 19/20 |
| gr-koz-b | `epskozanis.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ (ΠΡΩΤΑΘΛΗΜΑ)` | 13 | 12 / 12 | 11/12 | 24/24 | 24/24 |
| gr-ker-a | `epskerkyras.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ` | 12 | 5 / 5 | 5/5 | 10/10 | 10/10 |
| gr-ker-b | `epskerkyras.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ` | 16 | 8 / 8 | 7/8 | 16/16 | 16/16 |
| gr-les-a-lesvos | `epsl.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΟΜΙΛΟΣ ΛΕΣΒΟΥ)` | 8 | 4 / 4 | 3/4 | 8/8 | 8/8 |
| gr-les-a-limnos | `epsl.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΟΜΙΛΟΣ ΛΗΜΝΟΥ)` | 8 | 4 / 4 | 4/4 | 7/8 | 7/8 |
| gr-les-b | `epsl.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ ΛΕΣΒΟΥ` | 15 | 4 / 4 | 4/4 | 8/8 | 7/8 |
| gr-ima-a | `eps-imathias.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ ΚΑΤΗΓΟΡΙΑ ΚΑΝΟΝΙΚΗ ΠΕΡΙΟΔΟΣ` | 14 | 28 / 28 | 27/28 | 56/56 | 56/56 |
| gr-ima-b | `eps-imathias.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ ΚΑΤΗΓΟΡΙΑ ΚΑΝΟΝΙΚΗ ΠΕΡΙΟΔΟΣ` | 12 | 18 / 18 | 18/18 | 36/36 | 36/36 |

**Ni vpisano** (15. 10. 2026): Thesprotia (epsthesprotias.gr, Α:
6 klubov, nič odigranega) in Preveza-Lefkada (epsprevezas-lefkadas.gr, Α nič
odigranega, Β 1. in 2. skupina brez razporeda) nimata nobene lige; Ahaja Γ
1. in 2. skupina, Pela Β 1. in 2. skupina in Imatija Γ (brez razporeda) še
nič odigranega. Vpiši jih, ko `node scripts/mascot-lige.mjs <domena>
--preveri` pokaže zapisnike. Mlajše kategorije, ženske, pokali in play-off /
play-out (zakomentirani vnosi menija) niso vpisani.

Uvoz (ena za drugo, brez arhiva): `gh workflow run uvoz-lige.yml -f
liga=gr-mak-a1 -f cene=true`. Liga ~60 zapisnikov po 3 s je ~3–4 minute.

## Grčija — vir `eps`

Država `GR` ("Ελλάδα", migracija 20261016090700). Vmesnik, pošta in nočni uvoz
so pripravljeni (glej začetek datoteke; `eps` bere iz štirih košev). Šifra
lige se začne z `gr-`.

Vir `eps` (`scripts/viri/eps.mjs`) bere regionalne zveze EPS (Ένωση
Ποδοσφαιρικών Σωματείων), ki imajo vsaka svojo domeno, a isto platformo
"results.php" (noga "Shipwrecked Frontier Pioneer & UnScrupulous"): epspeir,
epsana, epsda, epsip, epsdod, epsarg, epsarkadias, epshalkidikis, epski,
epskyklades, epslak, epsmes, epsxiou, epsf, epsath, epsevias (vse `.gr`;
Atene imajo nogo "Stargoose"). Lige so Α/Β/Γ
Κατηγορία zveze (raven 4–6), po skupinah (Όμιλος). HTML iz strežnika,
Cloudflare brez izziva.

- **Šifra lige je `<domena>:<league_id>`** (`epspeir.gr:726`). Vsaka sezona
  ima svoj league_id; seznam lig sezone je na `/results/results.php`
  (izbirnik `period_id`, sezone od 2013-14). Ob novi sezoni se popravi šifra.
- **Razpored** `/results/display_schedule.php?league_id=N`: krogi
  `<h2>Nη Αγωνιστική</h2>`, vrstica "Domači - Gostje" (zmagovalec krepko),
  igrišče, dan, datum `dd/mm/yy`, ura (**atenski čas → ljubljanski −1 h**;
  `00:00` = ure ni), sodniki, izid. Vrstice nimajo vedno `</tr>`. Atene pišejo
  sezono s presledkom ("Περιόδου 2026 2027"). **Ime kluba ima lahko " - "**
  ("ΑΠΟΛΛΩΝ ΑΘΗΝΩΝ - ΔΑΦΝΗ", Atene Β2): par "Domači - Gostje" se razreši po
  imenih iz ostalih vrstic, prostega kroga (`Ρεπό:`) in krepkega zmagovalca;
  par, ki ga ni mogoče razrešiti, ustavi uvoz razporeda (prej je vrstica tiho
  izpadla — 1 tekma na krog). Krogi brez
  datuma (še nerazpisani) gredo v uvoz šele, ko dobijo datum.
  **Kontumacija** je izid z oznako `α.α.` (άνευ αγώνος, "0-3 α.α."); igrišče
  "ΔΕΝ ΘΑ ΔΙΕΞΑΧΘΕΙ" pomeni, da tekme ne bo (klub je izstopil).
- **Povezavo na tekmo ima razpored le pri nekaterih odigranih** (Vzhodna Atika
  Γ: 8 od 14). Vse odigrane da **mreža** `/results/display_results.php?league_id=N`
  (`display_game.php?game_id=N` z izidom); povezava brez izida je neodigrana
  tekma — je ne beremo.
- **Zapisnik** `/results/display_game.php?game_id=N`: naslov s sezono, ligo in
  krogom, klubi, izid, časovnica "Διακύμανση Αποτελέσματος" (ikona, stanje,
  minuta, igralec v stolpcu domačih ali gostov), postavi "Συμμετοχές"
  (vrstice 1–11 začetniki, za "Αναπληρωματικοί" klop do 20) in "Γενικές
  Πληροφορίες" (datum `dd-mm-yyyy`, ura). Ikone: `ball` gol, `ball_yellow` gol
  z 11 m, `ball_red` **avtogol** (igralec je v stolpcu SVOJE ekipe, gol šteje
  nasprotniku), `yellowCard`, `redCard`, `yellowRedCards` (drugi rumeni; prvi
  je svoj dogodek → 1 rumeni + 1 rdeči), `redArrow` izstop, `greenArrow`
  vstop — **minute so točne**. Dogodke beremo iz časovnice, stolpci postave
  (minute menjav, goli) so preverba (opozorilo ob neujemanju).
- **Številka vrstice NI dres** (ista za obe ekipi); dresov vir nima (`st:
  null`). Postava je v klasičnem vrstnem redu 1–11: **prvi začetnik je
  vratar** (namig → GK, kot ffm, mlsz; v 71 postavah vzorca 3 izstopi in 1 gol
  od 111, največ golov v vrstici 9). *Uskladi pozicije* z `vir = eps`; ostale
  pozicije na glasovanje.
- **Identiteta**: `player_id` iz `display_player.php?player_id=N`, a vsaka
  zveza šteje svoje. Šifra osebe (`reg_st`) je zato `<zveza> × 10^7 +
  player_id` (`ZVEZE` v viru: epspeir 1, epsana 2, epsda 3, epsip 4, epsdod 5,
  epsarg 6, epsarkadias 7, epshalkidikis 8, epski 9, epskyklades 10, epslak 11,
  epsmes 12, epsxiou 13, epsf 14, epsath 15, epsevias 16 — **številk nikoli ne
  spreminjaj**), šifra
  zapisnika `gr<zveza>-<game_id>` (`gr1-27822`). Imena so "PRIIMEK IME" v
  velikih grških črkah brez naglasov, kot jih piše zveza — ne pretvarjamo jih
  (male črke brez naglasov niso pravilna grščina). Letnice rojstva ne beremo
  (Atene `ageAttention`, Evbeja "(1989)" ob imenu).
- **Klubi**: ključ brez naglasov, ločil in presledkov (`Α.Ε.` = `ΑΕ`,
  "Π.Α.Σ.ΑΛΜΥΡΟΣ"), latinične dvojnice grških črk (ΜΕΤΑΣΟYΜΗ) poenotene;
  druga ekipa ("ΑΡΗΣ ΒΟΥΛΑΣ Β") je svoj klub. Kratko ime brez oblike društva
  spredaj (ΑΕ, ΑΟ, ΑΣ, ΑΠΣ, ΓΣ, ΠΑΣ …). **Isto ime, drug klub**: zveze so
  ločene piramide, klub pa je enoličen v državi — `IME_V_ZVEZI` v viru
  (`<domena>|<ključ>` → ime): ΑΡΓΟΝΑΥΤΗΣ je v Pireju in v Argolidi
  ("ΑΡΓΟΝΑΥΤΗΣ (Αργολίδα)"), ΠΡΟΜΗΘΕΑΣ je v Pireju in v Atenah
  ("ΠΡΟΜΗΘΕΑΣ (Αθήνα)"). Pregled 15. 10. 2026 zajel 432 klubov 33 lig (vse
  vpisane z Atenami in Evbejo); ob novi zvezi ali sezoni preveri trke znova.
- **Napake strežnika**: Dodekanez (epsdod.gr) vrne **vsako** stran s HTTP 500,
  a celo; Epir (epsip.gr) vrne 500 pri tekmi s pripombami ("Λοιπές
  Παρατηρήσεις"), stran pa je odrezana šele za podatki tekme. `epsFetch` obe
  vzame kot 200; 500 brez cele strani ostane napaka in `zapisniki` tako tekmo
  preskoči z opozorilom (ne ustavi lige). **401, 403, 429 in izziv** vrže že
  `epsFetch` (`EpsZavrnitev`, brez ponovitev in brez shranjene strani, izhod 4
  pri uvozu razporeda in zapisnikov). `vir.zaPredpomnilnik` v predpomnilnik
  pusti (in iz njega bere) le celo stran platforme ali odrezano tekmo — stran
  vzdrževanja ali izziv ne obvelja za vselej.
- **Nepopolni zapisniki**: nekatere tekme imajo le izid brez postav (kot pri
  `frf`, `fcf`): izid se zapiše, `imported_at` ostane prazen, tekma se bere
  znova (shranjen nepopoln zapisnik ne velja). Zapisnik, starejši od tedna in
  poln, se ne bere znova. Nepopoln je tudi zapisnik z obema postavama in
  izidom z goli, a brez gola v časovnici (Evbeja Γ3 8371, 1:4): zveza
  časovnico vpiše pozneje, sicer bi tekma po tednu obstala z 0 goli in brez
  menjav.
- **Strelec s klopi brez vstopa** (Atene Γ3 84218, Evbeja Β1 7829, Γ3 8373):
  dobi nastop od gola, ekipa ima zato čez 990 minut (kot pri `fcf`).
- Navedba vira: zveza (`site_url`) v nogi; `vir_ime`/`vir_url` sta prazna.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt vrne 404 na
prvih 14 domenah (brez pravil), pogojev uporabe na straneh ni. **epsath.gr
(Atene) in epsevias.gr (Evbeja)** tečeta na isti platformi, a robots.txt
prepove `/results/` (Atene izrecno tudi ClaudeBot in druge AI pajke).
**Pisno dovoljenje za zajem: pridobil Lovro, oktober 2026** (dovoljenje
upravljavca za Atene in Evbejo) — beremo ju **le zaradi tega dovoljenja**; če
ga umaknejo, `gr-ath-` in `gr-ev-` lige izklopi. Dovoljenje NE pokriva
tehnične zaščite: CAPTCHA, izziv Cloudflare, prijava, 401/403/429 ali
zakriti podatki uvoz ustavijo — **ne obhajaj**. Za ostale zveze dovoljenja
nimamo. Beremo odkrito (User-Agent `SLFF fantasy (https://slff.eu)`, **3 s**
med zahtevki), zaključenih zapisnikov ne beremo znova. **Ob izzivu, CAPTCHI,
401, 403 ali 429 se uvoz ustavi** (`EpsZavrnitev`, izhod 4). Če nas zveza
prosi, naj nehamo, njene lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo): po 8 odigranih tekem vsake
lige (Arkadija 4, Epir Γ po 5), skupaj 126 zapisnikov, od tega 116 polnih
(ostali le izid: Vzhodna Atika 5, Zahodna Atika 2, Dodekanez 2, Epir Γ-Β 1),
postave po 11 pri 228 od 232 ekip (4 z 10 igralci), goli = izid pri vseh
polnih (386/386), 875 menjav z minuto, 990 minut na ekipo razen ob rdečem
kartonu ali 10 igralcih. Od konca do konca (razpored, mreža, zapisniki,
nastopi) Arkadija Α in Epir Γ-Α: 9 zapisnikov, 18/18 postav po 11, goli 36/36.

Preizkus v živo Aten in Evbeje (15. 10. 2026, vsi zapisniki vseh odigranih
tekem 16 lig, 3,5 s med zahtevki, brez pisanja v bazo): 270 zapisnikov, 256
polnih, 14 le izid (nepopolni), goli = izid 254/256 (Atene Α2 82981 — strelec
ni v postavi; Evbeja Γ3 8371 — prazna časovnica pri 1:4), postave po 11 pri
504/512 ekip (ostale 9–10 igralcev), 1970 menjav, vse z minuto, 990 minut na
ekipo razen ob rdečem kartonu, manj kot 11 igralcih ali strelcu s klopi brez
vstopa. Arhiv 2025/26: po dva zapisnika (1. in zadnji krog) vsakega od 15
arhivov — 30/30 razčlenjenih, 11 + 11 (enkrat 10), goli = izid 29/30.

Vpisanih je 32 lig devetih zvez (migracija 20261016090700), **neaktivnih**:

| liga | tekoča 2026/27 | klubov | arhiv 2025/26 |
|---|---|---|---|
| gr-peir-a-1 / -a-2 | `epspeir.gr:726` / `727` | 12 / 12 | `epspeir.gr:605` / `606` (6 / 5 skupnih) |
| gr-peir-b-1 / -b-2 | `epspeir.gr:738` / `729` | 13 / 13 | `epspeir.gr:607` / `608` (5 / 4) |
| gr-peir-g-1 / -g-2 | `epspeir.gr:735` / `736` | 12 / 11 | `epspeir.gr:610` / `609` (4 / 4) |
| gr-ana-a / -b / -g | `epsana.gr:747` / `749` / `748` | 16 / 16 / 14 | `epsana.gr:689` / `690` / `691` |
| gr-da-a | `epsda.gr:278` | 14 | `epsda.gr:244` |
| gr-ip-a / -b | `epsip.gr:328` / `329` | 14 / 14 | `epsip.gr:300` / `301` |
| gr-ip-g-a / -g-b | `epsip.gr:331` / `332` | 11 / 10 | `epsip.gr:303` / `304` (6 / 6) |
| gr-dod-a | `epsdod.gr:495` | 14 | `epsdod.gr:443` |
| gr-arg-a1 | `epsarg.gr:1042` | 15 | `epsarg.gr:1020` |
| gr-ark-a | `epsarkadias.gr:222` | 9 | `epsarkadias.gr:205` |
| gr-ath-a-1 / -a-2 | `epsath.gr:1534` / `1535` | 17 / 16 | `epsath.gr:1410` / `1411` (5 / 6 skupnih) |
| gr-ath-b-1 / -b-2 / -b-3 | `epsath.gr:1537` / `1538` / `1539` | 16 / 15 / 16 | `epsath.gr:1413` / `1412` / `1414` (3 / 4 / 4) |
| gr-ath-g-1 / -g-2 / -g-3 / -g-4 | `epsath.gr:1541` / `1542` / `1543` / `1544` | 12 vsaka | `epsath.gr:1436` / `1435` / `1437` / `1434` (4 / 3 / 3 / 3) |
| gr-ev-a | `epsevias.gr:272` | 16 | `epsevias.gr:224` (12) |
| gr-ev-b-1 / -b-2 | `epsevias.gr:273` / `279` | 14 / 14 | `epsevias.gr:218` / `219` (7 / 9) |
| gr-ev-g-1 / -g-2 / -g-3 | `epsevias.gr:275` / `276` / `277` | 9 / 12 / 11 | `epsevias.gr:220` / `221` / `222` (7 / 7 / 6) |

Pirej in Atene sta skupine 2026/27 preuredila — arhiv je izbran po skupnih
klubih in je šibek (3–6); vsak arhiv ima ena sama liga. Arhiv Aten in Evbeje:
`results.php?period_id=14` (Atene) oz. `=4` (Evbeja). Atene Α1 ima 17 klubov
(prost krog). Play-off, play-out in razvrstilne tekme (`Αγώνες Κατάταξης`) so
svoja tekmovanja — za arhiv jih ne uvažaj. Vsak arhiv preštej pred uvozom
(arhivski zapisnik Pireja 2025/26 se razčleni enako kot tekoči).

**Ni vpisano** (15. 10. 2026): Halkidika (`epshalkidikis.gr:110`, `112`),
Kikladi (`epskyklades.gr:520`, `521`) in Hios (`epsxiou.gr:384`, `385`) — le
izidi, brez postav (0 od 4 vzorčnih); Ftiotida (`epsf.gr:13`, `14`, `15`) —
postave brez menjav (11 od 12 zapisnikov), strelci s klopi brez vstopa.
Skupine vpisanih zvez brez odigrane tekme: Argolida Α2 (`epsarg.gr:1043`,
`1044`), Arkadija Β (`epsarkadias.gr:223`), Zahodna Atika Β (`epsda.gr:279`),
Dodekanez Β in Γ (`epsdod.gr:496`, `497`, `501`, `498`, `499`) — vpiši, ko
se prvi zapisniki razčlenijo. Lakonija (`epslak.gr:407`, `408`) še nima
odigrane tekme; Kilkis in Mesenija sezone 2026/27 na strani še nimata. Γ
Εθνική na straneh zvez (raven 3, vodi jo EPO) ni vpisana. Evbeja Γ 4.
skupina (`epsevias.gr:278`) ni vpisana: en sam poln zapisnik, brez menjav —
vpiši, ko se menjave pokažejo. Mladinske (Κ12–Κ17) niso vpisane.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=gr-peir-a-1 -f
arhiv=epspeir.gr:605 -f cene=true`. Arhiv 240 zapisnikov po 3 s je okoli
12 minut na ligo (Atene odgovarjajo počasneje, ~5 s na stran).
