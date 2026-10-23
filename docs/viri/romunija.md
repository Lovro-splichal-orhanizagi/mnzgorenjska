# Romunija

Država `RO` ("România", migracija 20261010190000) ima vmesnik v romunščini
(`src/i18n/ro/`, jezik `ro`, `ro-RO`, `JEZIK_DRZAVE.RO`), vstop `slff.eu/ro`,
kartico ob deljenju `ro.html` (Caddy jo vrne za `/ro` in `?t=ro-…`), romunsko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Salut") in romunska imena lastnikov
hišnih ekip ("Andrei Popescu"). **Šifra romunske lige se začne z `ro-`.**
Ugib: brskalnik `ro` ali pas `Europe/Bucharest`. Izrazi kot v romunskem
amaterskem nogometu: echipă, `krog` je vedno **etapă**, lot, formație de
start, bancă, portar, fundaș, mijlocaș, atacant, căpitan, vicecăpitan,
transferuri, clasament, pasă decisivă, cartonaș, poziții; pripomoček
`klop_plus` je "Bancă+". **ș in ț z vejico spodaj** (ne s cedilo ş ţ; smoke
preveri). Množine one/few/other: `few` je 0, 2–19 in decimalke, `other` (20
in več) dobi "de" ("20 de puncte"), zato se števne besede v `skupno.besede`
za `other` začnejo z "de". Ime lige stoji za dvopičjem ("Liga fantasy s-a
deschis: {liga}"), `ligaVTozilniku` ga pusti. Psevdonim v klepetu ima
pridevnik za samostalnikom ("Portar Albastru 42"). Stran Pozicije je v meniju
kot v Sloveniji. Zveze, tekmovanja in vir vpiše svoja migracija. Manjka še:
romunski kanal v HelpStacku (`Podpora.tsx` za `ro` uporabi slovenskega) in
pregled prevoda pri naravnem govorcu. `RO` je v matriki nočnega uvoza.

**Hkratni uvozi po županijah.** `cakaj-na-uvoze.mjs` (`LOCENE_ZVEZE.RO`) pusti
ročna uvoza **nevklopljenih** lig dveh **različnih** županijskih zvez
(`ajf-<judet>`, vira `hlf` in `frf`) teči hkrati — županije nimajo skupnih
klubov; hkraten vpis istega novega kluba ujame `klubId` (23505 → obstoječi).
Lige **iste** županije se vrstijo (`istaZveza: false`; v AT/RS/HU tečejo
hkrati tudi te). Državni zvezi `lpf` (SuperLiga) in `frf` (Liga 2, Liga 3)
čakata na vse romunske uvoze in vsi nanju (kot `oefb` v Avstriji). Vklopljene
lige in nočni uvoz se vrstijo kot prej. Arhiv `frf` je počasen (~10 s na
tekmo), zato hkrati zaženi le nekaj županij.

## Romunija — vir `frf`

Vir `frf` (`scripts/viri/frf.mjs`) bere **www.frf-ajf.ro**, en portal vseh 41
županijskih zvez (AJF) in Bukarešte, od Lige IV navzdol. HTML iz strežnika,
spredaj Cloudflare brez izziva, robots.txt prazen. **Pogoji portala
prepovedujejo reprodukcijo brez pisnega dovoljenja** — prošnja je poslana;
do odgovora so vse lige **neaktivne** in jih ne uvažamo v produkcijo. Če nas
prosijo, naj nehamo, ali nas blokirajo — nehamo. Beremo odkrito
(`User-Agent: SLFF fantasy (slff.eu; splih.94@gmail.com)` — drugega naslova
ne, 1,6 s med zahtevki, popolnih zapisnikov ne beremo znova). **Ob izzivu,
CAPTCHI ali 403 se uvoz ustavi (`jeIzziv`) — ne obhajaj.** Navadne strani
nosijo Cloudflarov skript `/cdn-cgi/challenge-platform/…/jsd/` — to ni izziv.

- **Šifra lige** je `<judet>/<slug>-<id>` (`timis/liga-a-iv-a-16445`), kot v
  naslovu `/<judet>/competitii-fotbal/<slug>-<id>`. Vsaka sezona ima svoj id
  (2026/27 ~16xxx–17xxx, 2025/26 ~14xxx–15xxx). Tekoča tekmovanja so v meniju
  županije, arhiv na `/<judet>/competitii-fotbal/2025` (mreža "Detalii").
  Seznam z arhivi izpiše:

  ```bash
  node scripts/romunske-lige.mjs valcea sibiu          # liga, šifra 2026/27, arhiv 2025/26
  node scripts/romunske-lige.mjs valcea --preveri      # še zapisniki zadnjega kroga: polni/nepopolni/prazni
  node scripts/romunske-lige.mjs --trki                # isto ime kluba v dveh županijah
  ```
- **Program** (`…/program`) je ena stran z vsemi tekmami sezone: "Domači -
  Gostje", krog, datum ISO (prazen ali `1970-01-01`, dokler krog ni razpisan),
  izid ("2-1", neodigrana "-"), povezava `/<judet>/meciuri/<…>-<id>.html`.
  Ure tu ni: razpored jo prebere s strani prihajajočega kroga
  (`…/meciuri/etapa-<N>`, "Sambata, 10 Octombrie 2026, 11:00") in jo pretvori
  v ljubljanski čas (−1 h). Razpored vrne le razpisane kroge. Če ima ime kluba
  " - ", odloči lestvica (`…/clasament`), sicer uvoz pade.
- **Zapisnik** (stran tekme): izid `<h2>`, "Pauza", datum in ura (bukareška),
  krog v drobtinah ("Etapa 7"). Ekipa je `<h3 class="tbk__title">`, pod njo
  `Titulari` in `Rezerve`; **gostje so zrcalni** (stolpec dogodkov pred
  imenom). Med ekipama je časovnica (Intră/Iese, CG, Gol) — za preverjanje,
  ne beremo je. Za ekipama "În aceeași etapă" — tam nehamo. Igralec:
  `/jucatori/<slug>-<id>.html` → `reg_st`; ime je "Priimek Ime", ş ţ →
  ș ț, "Vladut - Stefan" → "Vladut-Stefan". **"Carnet" (izkaznica) in datuma
  rojstva ne beremo in ne hranimo**; vzorci v `scripts/vzorci/ro-frf-*` so
  počiščeni (repo je javen).
- **Dogodki** (ikone z minuto, "92'" → 90): `goal.png` (pripona `(a)` =
  avtogol pri strelcu v njegovi ekipi; `(p)` bi bila 11 m — videli je še
  nismo), `yellow_card.png`, `redCard.png` (title pove, ali je drugi rumeni;
  prvi rumeni takrat ni posebej vpisan), `outHome.gif` pri začetniku in
  `inHome.gif` pri rezervi — **minute so točne**, leteče menjave šteje
  `minuteIzPreklopov`. Strelec s klopi brez vstopa dobi nastop od gola.
- **Dresov, vratarja in pozicij ni.** Vse pozicije, tudi GK, določi
  glasovanje (stran Pozicije je v meniju); `ugani-pozicije` brez dresov vratarja
  ne ugane. **Liga brez vratarjev ni pripravljena na vklop** (`kader-nemogoc`)
  — pred vklopom potrebuje glasove ali admina. *Uskladi pozicije* za `frf` ni
  (ni oznake vratarja, po kateri bi štel).
- **Nepopolni zapisniki.** Zapisnik vnaša klub: v isti ligi so polni, prazni
  (izid brez postav), z eno postavo ali "le dogodki" (pod Titulari so samo
  strelci in kartonirani, brez klopi — Prahova, Ialomița). Ekipa ima postavo,
  če ima vsaj 7 začetnikov in ni "le dogodkov"; sicer njeni igralci ne dobijo
  nastopov. Tekma brez postave ene ali obeh ekip je `nepopoln`: **uvoz zapiše
  izid in nastope znane ekipe, `imported_at` ostane prazen** (lestvica lige je
  ne šteje, borza na oba kluba čaka), prvo opozorilo se začne z `zapisnik
  nepopoln` (`NEPOPOLN`). Nespremenjeno nepopolno tekmo uvoz preskoči (odtis),
  vir jo 45 dni bere svežo; preveri-podatke jo po 3 dneh javi kot
  `zapisnik-nepopoln`, ne kot zamudo. **Arhiva nepopolnih ne uvažamo.**
  Kontumacija: 3:0 brez obeh postav, starejša od tedna dni (razpored jo
  označi, zapisnik jo izpusti). Splošno: `z.nepopoln` lahko da vsak vir.
- **Isto ime, drug klub**: ime kluba je enolično v državi, AJF pa ločene
  piramide. Trk med županijama se doda v `IME_V_ZUPANIJI` (`<judet>|<ime>` →
  "Ime (Županija)"); pregled 10. 10. 2026 vpisanih lig trkov ni našel. Ključ
  kluba je brez diakritike (vir piše ş in ș). Grbe ima portal
  (`/upload/echipe/<id>.jpg`), a brez dovoljenja jih ne beremo — skripte za
  grbe ni.

Preizkus v živo (10. 10. 2026, brez pisanja v bazo):
Timiș IV 2026/27 — 8 krogov, 62 odigranih, 1 kontumacija, 61 zapisnikov: 54
polnih, 7 praznih (6 iz današnjega kroga), goli polnih 191 / izidi 193, 990
minut na ekipo pri polnih. Timiș IV 2025/26 (arhiv) — 239 zapisnikov, 238
polnih, 1 prazen, goli 877 / izidi 881, vsi nastopi s šifro. Vâlcea V 2026/27 —
50 odigranih, 1 kontumacija, 47 polnih, 2 prazna, goli = izidi (191).
Ostalih lig preizkus ni zajel (le zadnji krog ob izbiri).
Prahova (vseh 7 lig) in Ialomița (4) objavljata le dogodke — **niso vpisane**;
Vâlcea Liga IV ima prazne zapisnike — ni vpisana.

Vpisanih je 12 lig sedmih županij (migracija 20261010210000), **neaktivnih**,
zveze `ajf-<judet>`:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| ro-ag-l5-centru | `arges/liga-5-centru-16780` | — (nova liga) |
| ro-ag-l5-nord | `arges/liga-5-nord-16691` | `arges/liga-5-nord-15410` |
| ro-ag-l5-sud | `arges/liga-5-sud-16692` | `arges/liga-5-sud-15405` |
| ro-bn-l4 | `bistrita-nasaud/liga-4-16002` | — (redni del 2025/26 ni v arhivu; play-off `16003` ima 6 klubov) |
| ro-bt-l4 | `botosani/liga-a-iv-a-givova-16401` | `botosani/liga-a-iv-a-givova-14932` |
| ro-gl-l4 | `galati/liga-a-iv-a-16549` | `galati/liga-a-iv-a-15250` |
| ro-sb-l4 | `sibiu/liga-4-16532` | `sibiu/liga-4-sezon-regular-liga-a-4-a-15027` (brez play-offa) |
| ro-sb-l5-medias | `sibiu/liga-5-seria-medias-16568` | `sibiu/liga-a-5-a-liga-a-5-a-seria-medias-15057` |
| ro-tm-l4 | `timis/liga-a-iv-a-16445` | `timis/liga-a-iv-a-14975` |
| ro-vl-l5 | `valcea/liga-a-v-a-16574` | `valcea/liga-a-v-a-15193` |
| ro-vl-l6-nord | `valcea/liga-a-vi-a-seria-nord-16615` | `valcea/liga-a-vi-a-seria-nord-15213` |
| ro-vl-l6-sud | `valcea/liga-a-vi-a-seria-sud-16618` | `valcea/liga-a-vi-a-seria-sud-15214` |

Uvoz (**šele z dovoljenjem**; lige različnih županij lahko tečejo hkrati, iste
županije ena za drugo — glej *Hkratni uvozi po županijah*): `gh workflow run uvoz-lige.yml -f
liga=ro-tm-l4 -f arhiv=timis/liga-a-iv-a-14975 -f cene=true`. Strani tekem
arhiva strežnik sestavlja **~10 s** (tekoče < 1 s), zato je arhiv 240
zapisnikov ~45 minut na ligo — en arhiv naenkrat. Nato pozicije (glasovanje, vratarji!),
`pripravljenost-lige` in `vklopi_ligo_sredi_sezone`.

## Romunija — vir `hlf`

Vir `hlf` (`scripts/viri/hlf.mjs`) bere **hailafotbal.ro**, uradno platformo
rezultatov FRF. Od sezone 2026/27 zveze tam vnašajo **digitalne zapisnike**:
postava in klop z dresi, registrirana pozicija ("Portar" = vratar → GK),
kapetan, goli z vrsto (11 m, avtogol), kartoni, menjave z minuto, polčas in
stalna šifra igralca FRF (UUID → `reg_st`, prvih 13 šestnajstiških števk).
Bistveno boljši od `frf`: vratar je znan, zapisniki so skoraj vsi polni.
Lastnik je vir odobril (10. 10. 2026). robots.txt stran nima.

- **Dostop.** Stran je Angularjeva aplikacija; podatke (JSON z
  `api.datalake.frf.ro`) si naloži sama po žetonu. **Javni JS ima vgrajeno
  uporabniško ime in geslo za API — tega ne beremo, ne uporabljamo in API-ja
  ne kličemo sami.** Stran odpre Chromium brez glave (Playwright) kot
  obiskovalec, menja krog v izbirniku "Etapă", klikne tekmo in pobere
  odgovore, ki jih stran sama zahteva. Slike, pisave in tuji gostitelji so
  blokirani. **Ob izzivu, CAPTCHI, 401/403/429 ali prijavi se uvoz ustavi —
  ne obhajaj.** User-Agent je Chromov s pripono `SLFF fantasy (slff.eu;
  splih.94@gmail.com)`, 2 s med dejanji, popolnih zapisnikov in zaključenih
  krogov ne beremo znova (`scripts/.predpomnilnik/hlf/`, brez fotografij in
  osebja). Uvozna tokova namestita Chromium le za Romunijo (`ro-`).
- **Šifra lige** je pot strani brez kroga:
  `judetean/<județ>/fotbal/<sezona>/<tekmovanje>/<faza>/<skupina>` ali
  `national/fotbal/<sezona>/…`. Sezona je del šifre. Seznam lig županij s
  podatki in polnost zapisnikov zadnjega kroga izpiše:

  ```bash
  node scripts/hailafotbal-lige.mjs                        # županije s podatki
  node scripts/hailafotbal-lige.mjs national cluj --preveri
  ```
- **Arhiva ni.** Digitalni zapisniki so šele od 2026/27; stran za 2025/26 vrne
  tekočo sezono. Arhiva s `frf` ne mešaj: šifre igralcev so druge, nastopi bi
  pristali na podvojenih igralcih. Cene dajo minute tekoče sezone (uvoz brez
  `arhiv`, s `cene`) — oktobra ima redni igralec že 600+ minut.
- **Liga 3 Serie 1** (`ro-liga3-s1`, tekmovanje 497) je v registru obstoječih
  lig z isto trenutno šifro kot Serie 1 v tabeli zgoraj. Posnetek 23. 10. 2026
  ima 12 klubov in 260 igralcev; šest zapisnikov 9. kroga (16.–17. 10.) še
  manjka, brez ugotovljenih razlik med goli in izidi. Ti zapisniki ostanejo
  običajna manjkajoča poročila za ciljno osvežitev; izjema za njih ni odobrena.
- **Nepopolni zapisniki** ("nu există o versiune salvată a foii de joc") kot
  pri `frf`: izid se zapiše, `imported_at` ostane prazen, 45 dni se bere
  znova. Kontumacija: 3:0 brez zapisnika, starejša od tedna dni.
- Čas tekme je bukareški (`startDate`), uvoz ga pretvori v ljubljanskega;
  00:00 pomeni, da ure ni.

- **Stran je počasna in asinhrona.** `TourRoundId` je skupen vsem ligam
  zveze, zato se odgovor kroga izbere tudi po `SeriesId`; krogi pridejo za
  vso zvezo (SuperLiga je LPF, ne FRF) in se vzame odgovor s serijo lige. Po
  menjavi kroga odgovor pride pred karticami — `karticeKazejo` počaka, da
  kartice kažejo tekme odgovora, tekmo pa poišče po imenih klubov, ne po
  mestu (Cluj L5 Gherla je klikal napačne tekme).
- **Slug: vsak znak, ki ni črka ali števka, je svoj vezaj** ("Liga 5 Cluj -
  Grupa 1" → `liga-5-cluj---grupa-1`). Neznano pot stran pusti v naslovu, a
  pokaže privzeto ligo zveze — prvi uvoz Cluj L5 G1/G2 (11. 10. 2026) je tako
  dobil razpored Lige 4 (popravek 20261012070000). Zdaj `odpri` preveri ime
  naloženega tekmovanja proti šifri in brez kartic, ki se ujemajo z odgovorom,
  ligo ne ugiba — uvoz se ustavi.

Preizkus (10. 10. 2026): Liga 3 Serie 1 — 22 krogov, 132 tekem z uro, 48
zapisnikov, vsi polni, goli = izidi (158), 1460 nastopov, vsi s šifro;
vratar pri vsaki ekipi. Ekipa ima 990 minut razen pri rdečem kartonu.
Napaka vira: USV-CSM Iași, 1. krog, igralec dvakrat vstopi (opozorilo).
Cluj L5 Gherla — 24 zapisnikov, goli = izidi (112).

**Pokritost** (pregled vseh 41 županij in Bukarešte, 10. 10. 2026): podatke
imajo le državna raven in osem županij (Alba, Bihor, Caraș-Severin, Cluj,
Galați, Hunedoara, Prahova, Sibiu); ostalim stran ne naloži nobene lige.
Vpisanih je 26 lig (migracija 20261010220000), **neaktivnih**, sezona
2026/27 (šifra je v migraciji, `<pot>` = `…/2026-2027/…`):

| liga | šifra (brez `/fotbal/2026-2027`) |
|---|---|
| ro-superliga (LPF) | `national superliga/sezon-regular/serie-1` |
| ro-liga2 | `national liga-2-casa-pariurilor/sezon-regular/seria-1` |
| ro-liga3-s1 … s8 | `national superscore-liga-3/sezon-regular/serie-1` … `serie-8` |
| ro-ab-superliga, -l4-s1/-s2, -l5-s1/-s2 | `judetean/alba superliga-ajf-alba/sezon-regular/1`, `liga-4/…/serie-1/2`, `liga-5/…/serie-1/2` |
| ro-bh-l4 | `judetean/bihor liga-4/sezon-regular/tur-preliminar` (13 krogov, nato nova faza) |
| ro-cj-l4, -l5-g1, -l5-g2, -l5-gherla, -l5-dej, -l5-campia-turzii | `judetean/cluj liga-4-cluj/…`, `liga-5-cluj---grupa-1/2` (tri vezaje!), `liga-5-gherla`, `liga-5-dej`, `liga-5-campia-turzii` |
| ro-hd-l4, -l5 | `judetean/hunedoara liga-4/sezon-regular/serie-1`, `liga-5/campionat/serie-1` |
| ro-ph-l4 | `judetean/prahova liga-a-4-a-prahova/sezon-regular/serie-1` |
| ro-sb-superliga | `judetean/sibiu superliga/sezon-regular/serie-1` |

Ni vpisanih: Bihor Liga 5 (1/3 in 0/1 polnih), Sibiu Liga 4 in Liga 5 (2/6,
0/5, 0/6 — `ro-sb-l4` in `ro-sb-l5-medias` ostaneta na `frf`), Galați (krogi
brez izidov), Prahova Liga 6 in Caraș-Severin (nič odigranega). Cluj L5
Câmpia Turzii je vpisana s 3/5 polnih.

Uvoz (ena za drugo, **brez arhiva**): `gh workflow run uvoz-lige.yml -f
liga=ro-liga3-s1 -f cene=true`. Liga ~1–2 minuti.

### Exact reviewed current-season exclusion, 23 October 2026

The owner approved keeping the official 2–1 result of USV-CSM Iași–KSE Târgu Secuiesc (29 August 2026, report `f43d55c1-6530-49dc-a02e-4d7e578d6205`, native `133334`) while marking its individual statistics unavailable. Two conflicting medical/ordinary substitution sequences are present in the source itself. The exact policy pins both retained round and match-sheet hashes; no substitution is guessed or silently removed. The shared `reviewed-existing-history.yml` requires a reviewed beforeimage, one-use cleanup, fresh positions/prices, a fresh native preview and its pinned activation. Registration alone is not activation. Serie 1 retains its documented current-season-only pricing route.

The reviewed Liga 3 S1 fixture (native match 133334) stores the official match-detail URL while its immutable source proof records the containing round page. Both exact official URLs identify the same approved fixture. Its source club spells Iaşi with a cedilla and the native row spells Iași with a comma; a one-time audited binding pins that exact source UUID to native team 3016, preserving both source and native spelling. The binding is checked before historical cleanup and does not change any match result, player or report policy.

Round 1 begins on 28 August, while the reviewed USV–KSE match is dated 29 August. Club binding validates the exact match date and round identity/season/number; it does not equate the round’s first fixture date with every match date.
