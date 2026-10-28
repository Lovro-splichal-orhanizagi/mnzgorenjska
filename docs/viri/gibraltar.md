# Gibraltar — vir `gfa`

Vir `gfa` (`scripts/viri/gfa.mjs`) bere **gibraltarfa.com** (Gibraltar
Football Association). Strani izriše strežnik (HTML, brez JSON-a in brez
ključev). Država `GI` ("Gibraltar", vpiše jo migracija lig); vmesnik bi bil
angleški (`en` obstaja), vstopne strani, kartice, pošte, ugiba države in vrstice
v matriki nočnega uvoza pa **ni** — vse to pred vklopom. Šifra lige v bazi se
začne z `gi-`.

- **Sezona je avgust–maj**: `"2026/27"` (iz datuma tekme).
- **Šifra lige je pot tekmovanja** na strani, `<slug>-<id>`
  (`gibraltar-football-league-26-27-3395567`). Strežnik zahteva pravi slug
  (`x-3395567` vrne 404), zato hranimo celo pot. Vsaka sezona ima svoje
  tekmovanje; tekoče najdeš v meniju *Competitions* na naslovnici, pretekla
  (meni jih ne kaže) pa prek iskalnika (`site:gibraltarfa.com competitions
  <ime> 25-26`) ali povezav na straneh klubov (`/teams/<slug>-<id>`).
- **Faze.** GFL se po 22. krogu razdeli: 1.–6. **Championship Group**,
  7.–11. **Challenge Group** (pravila GFL 2026/27, 7.3), vsaka skupina je
  **svoje tekmovanje z novim id-jem**. Šifra sme zato našteti več faz s `+`:
  `<osnovna>+<championship>+<challenge>` (kot `oefb`). Kroge poznejših faz
  `tekmeFaz` zamakne za zadnji krog osnovne (obe skupini sta krog 23 …, rok
  enega kroga velja za obe). **Ko GFA skupini objavi**, dopiši poti z
  migracijo pred rokom 23. kroga. 2025/26 je imela le Championship Round
  (6 klubov, 5 krogov), spodnjih šest je sezono končalo.
- **Naslovi.**
  - `/competitions/<pot>/matches` — vsi krogi ("Matchday 1 of 22"). Odigrana
    tekma ima izid in povezavo na zapisnik, **datuma pa ne**; neodigrana ima
    datum in uro ("30/10/2026 - 21:00"), povezavo šele, ko jo zveza vnese.
    Datum odigrane tekme razpored prebere z zapisnika — iz predpomnilnika
    (isti, kot ga polni uvoz zapisnikov, `scripts/.predpomnilnik/gfa`), sicer
    z vira (`dopolniDatume`). Prvi uvoz razporeda zato prebere vse zapisnike
    odigranih tekem enkrat (~40 zahtevkov na ligo), potem le nove.
  - `/competitions/<pot>/match-report/<slug>-<id>` — zapisnik. Slug tekme
    strežnik prezre (`m-<id>` velja), pot tekmovanja pa mora biti prava.
    Glava: datum in ura ("25th October 2026, 4:30 PM"), izid, klub in strelci
    pod klubom, ki mu gol šteje ("PEREZ SANCHEZ Carlos (5 min.)", "(pen.)",
    avtogol "(o.g.)" z belo ikono). Spodaj *Lineup* in *Substitutes*: dres,
    PRIIMEK s povezavo `/player/<ime-priimek>-<id>`, "(GK)", "(C)", pri
    igralcu, ki je šel ven, "(⇄ PRIIMEK Ime - 123')", ikone žogice (gol), rdeče
    žogice (avtogol), rumenega in rdečega kartona.
- **Šifra igralca** je id profila (`/player/bradley-banda-1749` → `reg_st`
  1749), stalen čez sezone in tekmovanja (preverjeno: 114 igralcev 2025/26 in
  2026/27, vsi z istim id-jem). Ime: priimek iz besedila povezave (z naglasi),
  ime iz sluga — "Soler Ortuño Manuel". Strani igralca (datum rojstva, slika)
  **ne beremo**.
- **Igralec brez profila** (nov, približno 1 na zapisnik) nima povezave, le
  besedilo "Jair BRYSON": priimek so besede z velikimi črkami na koncu. Šifre
  nima; uvoz ga veže po imenu in ga posvoji po šifri, ko dobi profil.
- **Menjava** je zapisana pri igralcu, ki gre ven, z imenom vstopnega v obliki
  "PRIIMEK Ime"; vstopnega iščemo med rezervami po imenu (`najdiIgralca`:
  vse besede, priimek + ime, nato največ skupnih besed — profil "Rosruiguez
  Macias" ujame "RODRIGUEZ MACIAS Yoel-David"). Neznan vstopni ("N/A") je
  opozorilo; izstopni igra do menjave, vstopni nima nastopa.
- **Šifra zapisnika v bazi je `gi<id>`** (id tekme COMET 3xxxxxx).

## Minute drugega polčasa: +45

Vir drugi polčas piše **od 91 do 135**, podaljšek posebej ("135 +4"); prvi
polčas od 1 do 45 ("45 +6"). Na 47 zapisnikih (GFL 2025/26 in 2026/27,
Championship Round, Intermediate 2025/26, Reserve 2026/27; 371 menjav in vsi
goli) ni nobene minute med 46 in 90 in nobene nad 135. Zamik je torej stalen:
`minutaVira` vsemu nad 90 odšteje 45 ("116" → 71, "135 +4" → 90). Minuta med
46 in 90 ostane, kakor je, in da opozorilo (če bi vir zamik kdaj popravil, se
to pokaže tu). Brez popravka bi vsak vstopni v drugem polčasu dobil 45 minut
premalo, izstopni 45 preveč (čez 90).

## Kartoni: brez minute

Kartoni so le ikona pri igralcu, **brez minute** (glava jih ne našteva;
raziskava jih je sprva spregledala). Uvoz jih vpiše (odbitek −1 / −3), rumeni
in rdeči pri istem igralcu sta 1 rumeni + 1 rdeči. **Izključeni igralec brez
minute igra v nastopih do 90. minute** oziroma do menjave (kot rdeči brez
minute pri `fsf`) — minute so torej pri izključenih precenjene. Karton
neuporabljene rezerve se izgubi (nima nastopa).

## Popolnost

Zapisnik je `nepopoln` (`NEPOPOLN` prvo opozorilo, do 45 dni se bere znova
sveže), če ekipa nima 11 začetnikov ali se goli iz glave ne ujemajo z izidom
(gol brez najdenega strelca šteje kot nepopoln). Opozorila: žogice pri igralcu
se ne ujemajo z glavo, vratarjev ni natanko eden, ekipa z rezervami brez
menjav, neznan vstopni. Prazen zapisnik (tekma še ni vnesena) ni zapisnik in
ne gre v predpomnilnik.

Preizkus (28. 10. 2026, brez pisanja v bazo, vzorec zapisnikov):

| tekmovanje | tekem / odigranih | prebranih | popolnih | 990 + 990 minut |
|---|---|---|---|---|
| GFL 2026/27 (`…-3395567`) | 109 / 37 | 10 | 9 (`gi3398093` 0:8 brez strelcev v glavi) | 9 (`gi3398084`: vstopni "N/A") |
| GFL 2025/26 (`…-3082381`) | 132 / 132 | 19 | 19 | 19 |
| GFL 2025/26 Championship (`…-3082383`) | 15 / 15 | 5 | 5 | 5 |
| Intermediate 2025/26 (`intermediate-league-25-26-3085893`) | 28 / 25 | 8 | 8 | 8 |
| Reserve 2026/27 (`reserve-league-26-27-3395742`) | 108 / 9 | 6 | 4 (2 prazna — tekmi z datumom v preteklosti brez izida) | 4 |

Vse postave po 11 z enim vratarjem, goli = izid, povprečno 7,9 nastopa s
klopi na tekmo. Pred uvozom arhiva **preštej ves arhiv** (skill
`dodaj-ligo`, 0c) — zgornje je vzorec (tudi zaradi vljudnosti do vira).

## Lige

Vpisani sta 2 ligi (migracija `20261028121300_gibraltar_gfa`), **neaktivni**,
zveza `gfa`:

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|---|
| gi-gfl | 11 | `gibraltar-football-league-26-27-3395567` | `gibraltar-football-league-25-26-3082381+gibraltar-football-league-25-26-3082383` |
| gi-reserve-league | 9 | `reserve-league-26-27-3395742` | `intermediate-league-25-26-3085893` (8 klubov, 7 krogov) |

- **GFL**: 11 klubov, 22 krogov osnovnega dela, nato skupini (glej *Faze*).
  Tekma Lincoln Red Imps : St Joseph's 1. kroga na seznamu manjka (109 od
  110) — verjetno prestavljena zaradi evropskih tekem; ko jo GFA vpiše, jo
  prinese razpored.
- **Reserve League** (GFA Reserve League, rezervne ekipe klubov GFL, pravila
  GFL 2026/27, 16.–17.): 9 ekip, 27 krogov (3 kroge vsak z vsakim). Igralci
  so registrirani posebej (prehod v GFL po pravilu *feeder*). **Slabost**:
  28. 10. je imela le 9 izidov od ~40 tekem z datumom v preteklosti; prazni
  zapisniki ostanejo brez statistike. Arhiv (Intermediate League 2025/26) je
  majhen — pred vklopom preveri cenik (privzetih 4.5).
- Isti klub, dve imeni (`ISTI_KLUB_GI`): Mons Calpe SC (2025/26) = Mons Calpe
  FC (2026/27, rezervna ekipa "Mons Calpe Sports Club Reserves"); Lynx FC in
  Europa Point FC "Intermediate" (2025/26) = "Reserves" (2026/27). Manchester
  1962 FC (GFL 2025/26) in Manchester 62 FC Intermediate v 2026/27 ne igrata.
  Zapisnik piše sponzorsko ime ("FCB Magpies"), uvoz vzame ime s seznama
  ("FC Magpies"). Rezervna ekipa je svoj klub ("Lincoln Red Imps Res.").
- **Raven lige** (`ravenLige`) za `gi-` ni določena — novinec iz GFL v
  rezervni ligi zato ostane pri 4.5 (šifra osebe je sicer skupna).

**Ni vpisano:** pokali (Rock Cup, Pepe Reyes Cup — SLFF pokalov ne vodi),
Women's League, Under 18 League in mlajše, futsal (Premier, 1st Division,
Luisito Bonavia Trophy), veterani. Ženska liga in U18 imata zapisnike v isti
obliki — za pozneje.

## Pravice (pregled 28. 10. 2026, ni pravni nasvet)

robots.txt: `User-agent: *` / `Disallow:` (prazno) — vse dovoljeno. Pogojev
uporabe stran nima (le *Privacy Policy* in *Refund Policy*, brez določb o
samodejnem dostopu). Dovoljenja GFA nimamo. Beremo odkrito (User-Agent
`SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih zapisnikov
ne beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi — ne
obhajaj** (`GfaZavrnitev`, izhod 4). Če nas GFA prosi, naj nehamo, `gi-`
lige izklopimo.

## Pred vklopom

- Država `GI`: `JEZIK_DRZAVE` (angleščina), kartica, Caddy, veja pošte,
  imena hišnih ekip, `klub_stik.drzava`, vrstica v matriki nočnega uvoza
  (`docs/nocni-uvoz.md`).
- *Uskladi pozicije* vira `gfa` ne pozna (pozicij vir ne daje, le vratarja).
- Uvoz (ena za drugo):
  `gh workflow run uvoz-lige.yml -f liga=gi-gfl -f arhiv='gibraltar-football-league-25-26-3082381+gibraltar-football-league-25-26-3082383' -f cene=true`
  (~150 zapisnikov po 3 s, ~10 minut).
- `prvi_fantasy_krog` je 1 — ob vklopu sredi sezone ga nastavi na prvi
  prihodnji krog.

Preizkusi: `npm run smoke` (blok *vir gfa*, vzorci `scripts/vzorci/gi-gfa-*`).
