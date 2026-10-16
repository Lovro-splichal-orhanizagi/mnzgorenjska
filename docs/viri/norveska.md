# Norveška — vir `nff`

Vir `nff` (`scripts/viri/nff.mjs`) bere **fotball.no** (Norges
Fotballforbund), javne strani FIKS (`/fotballdata/`), na katerih NFF in vseh 18
kretsov objavljajo vsa tekmovanja od OBOS-ligaen do najnižje divisjon. HTML iz
strežnika. Država `NO` ("Norge", migracija 20261016093900) **še nima vmesnika**
(jezika, kartice, pošte, `JEZIK_DRZAVE`) in **ni v matriki nočnega uvoza** — oboje
pred vklopom (glej spodaj). **Šifra norveške lige se začne z `no-`.**

**Pravice.** robots.txt splošnim robotom prepove vse (`User-agent: *` /
`Disallow: /`), noga strani pa ponatis. **Pisno dovoljenje NFF za zajem:
pridobil Lovro, oktober 2026 (kopija še ni v arhivu info@).** Dovoljenje odpravi
robots.txt in klavzulo v nogi — **ne dovoli pa obhajanja zaščite**: ob izzivu
(Cloudflare, CAPTCHA) ali 401/403/429 se uvoz ustavi (`NffZavrnitev`, izhod 4,
nočna zanka države ne bere naprej), uvoz razporeda tedaj ne vzame shranjene
strani. Beremo odkrito (`User-Agent: SLFF fantasy (https://slff.eu)`, **3 s**
med zahtevki; vse lige bere en gostitelj, zato je `NO` v `SKUPEN_VIR`
(`cakaj-na-uvoze.mjs`) in se zagoni države ne prekrivajo). Datuma rojstva in
sodnikov ne beremo. Kopijo dovoljenja naj Lovro posreduje na info@slff.eu. Če
NFF dovoljenje umakne ali prosi, naj nehamo, `no-` lige izklopimo.

- **Sezona je koledarsko leto** (april–oktober, `sezona_koledarska`, glej
  *Koledarska sezona* pri Estoniji): oznaka `"2026"`. Vir jo vzame iz naslova
  turnirja ("4. div. menn avd. 01 - 2026 - Oslo").
- **Šifra lige je id turnirja FIKS** (`/fotballdata/turnering/hjem/?fiksId=205400`).
  Vsaka sezona je svoj turnir z novim id-jem, tudi arhiv (2025 = `199018` za isto
  skupino). Seznam turnirjev kretsa je `/turneringer/?d=<krets>&s=<sezona>`
  (sezona ni letnica: `110` = 2026, `107` = 2025; `d=1` NFF, ostali kretsi).
  OBOS-ligaen na tem seznamu ni (2026 `206093`, 2025 `199422`).
- **Razpored** je stran turnirja (~1 MB): zavihek "Alle kamper" je tabela z
  vsemi tekmami (Runde, Dato, Tid, Hjemmelag, Resultat s povezavo
  `/fotballdata/kamp/?fiksId=`, Bortelag). **Oslo ima isti čas kot Ljubljana** —
  ura ostane. Uvoz razporeda stran prenese sam (`razcleniRazpored`); stran, ki ni
  stran turnirja (napaka s statusom 200), da prazen razpored in uvoz vzame
  zadnjega shranjenega.
- **Zapisnik** `/fotballdata/kamp/?fiksId=<id>`: glava (izid "4 - 1", polčas,
  klubi), "Startoppstilling" (začetniki) in "Innbyttere" (klop) z dresom in
  **stalno šifro osebe FIKS** (`person/profil/?fiksId=` → `reg_st`), "Kap" =
  kapetan. Časovnica "Kamphendelser": vrstica `homeTeam`/`awayTeam` je ekipa
  IGRALCA; "Spillemål" (gol), "Straffemål" (11 m), "Selvmål" (avtogol, v vrstici
  strelčeve ekipe, šteje nasprotniku), "Advarsel" (rumeni), "Utvisning" (rdeči;
  drugi rumeni ima ikono `RedYellowRedCard2`, prvi rumeni je svoj dogodek → 1 + 1),
  menjava "Inn:"/"Ut:" z minuto. "Advarsel/Utvisning for Leder" je karton vodstva —
  ne šteje. Minute nad 90 → 90.
- **Vratar NI označen.** FIKS našteje začetnike po mestih z vratarjem prvim (ostali
  niso po dresu), zato ima prvi začetnik `vratar` in GK **le kot namig** (kot mlsz,
  ffm); *Uskladi pozicije* z `vir = nff` (večina tekem). Ostale pozicije na
  glasovanje. Namig gre po **mestu** v seznamu: je na prvem mestu skrita ali
  prečrtana oseba, ga ne dobi nihče (sicer bi ga dobil igralec iz polja).
- **Prečrtan igralec** ("Ime (strøket)") ni igral — izpuščen. **"Personinfo ikke
  tilgjengelig"** je oseba, katere podatkov NFF ne objavi (zasebnost): brez imena
  in šifre, izpuščena; njen gol ostane ekipi brez strelca (`scorer_id` null, goli =
  izid). Takih igralcev ne iščemo drugje.
- **Menjave** (pregled 15. 10. 2026, glej tabelo): OBOS-ligaen, 2. in 3. divisjon
  jih vpisujejo **vse ekipe** (990 minut na ekipo razen pri rdečem). V 4. divisjon
  le nekateri kretsi (Akershus, Indre Østland, Buskerud, Sogn og Fjordane, Troms,
  Agder, Trøndelag večinoma; Vestfold, Østfold, Sunnmøre del ekip), v 5. divisjon
  skoraj nihče (Agder in Trøndelag del). Prejšnji vzorci (3. div 8990682 "brez
  menjav") so bili napačni: tekma ima 8 menjav. **Brez menjav** (`z.brezMenjav`,
  kot fsb in fcf Quarta): začetnik 90 minut (ali do rdečega), rezerva brez vstopa
  nastopa nima, **strelec s klopi dobi vstop ob golu** (`nastopi` iz `hlf.mjs`,
  opozorilo); karton rezervi brez vstopa ne šteje (opozorilo). Minute začetnikov so
  precenjene, ekipa ima lahko čez 990 minut.
- **Več kot 11 začetnikov**: v nižjih 5. divisjon klubi vpišejo vse igralce kot
  začetnike (do 20; leteče menjave brez minut) — kdo je začel, ni znano. Taka ekipa
  **nima znane postave** (kot pod 7 začetniki): zapisnik je nepopoln, njeni igralci
  nastopov ne dobijo (prej 20 × 90 minut, nastop in čista mreža — cene), opozorilo
  `v postavi je N igralcev`. Pregled tak zapisnik šteje kot nepoln; skupine, kjer je
  to pogosto (Trøndelag 5. div, Nordmøre og Romsdal 5. div, Helgeland 2), niso vpisane.
  **Gol ekipe brez znane postave** ostane ekipi brez strelca (brez imena in šifre):
  strelec brez nastopa bi sicer pri uvozu nastal kot nov igralec, gol pa bi pobrisalo
  čiščenje golov brez nastopa.
- **Kontumacija**: glava "Bortelaget/Hjemmelaget møtte ikke" (`z.kontumacija`,
  tudi z izpolnjenim zapisnikom — Otta : Eina 0:3, 2026, ima 12 golov) ali 3:0 / 0:3
  brez obeh postav, starejša od tedna. Razpored izid pokaže kot navaden izid,
  zato `vir.kontumacije` prebere zapisnike tekem 3:0 / 0:3 (predpomnilnik), uvoz
  zapisnikov jih izpusti.
- **Nepopoln zapisnik** (ekipa z manj kot 7 začetniki) kot pri `frf`: izid se
  zapiše, `imported_at` ostane prazen, 45 dni se bere znova (`zapisnikSvez`):
  zapisnik zadnjih 3 dni vedno svež, prazen ali nepopoln še enkrat svež do 45 dni.
  **Napaka s statusom 200 ne gre v predpomnilnik** (`zaPredpomnilnik`: le stran
  tekme s `MatchPage_Index` in karto tekme ali stran turnirja z letnico).
- **Šifra zapisnika v bazi je `no<id>`** (`sifraZapisnika`): FIKS šteje tekme v
  milijonih (8,7–9,2 milijona), v istem prostoru kot rastoči viri drugih zvez.
- Ime je "Ime Priimek" → uvoz dobi "Priimek Ime" (priimek je zadnja beseda; igralca
  prepoznamo po šifri). **Klubi**: ključ ohrani æ, ø, å in odreže obliko društva
  (IL, FK, IF, SK, BK, OIF …): krets Hålogaland piše od 2026 polna imena ("Svolvær
  IL", "Mjølner, FK", "Harstad IL 2"), 2025 kratka ("Svolvær", "Mjølner") — brez
  tega bi bil isti klub dvakrat. Druge ekipe ("Vålerenga 2", "Frigg 2") so svoj klub.
  Isto ime v dveh skupinah 2026 je pregled našel le v izpuščenih skupinah Finnmark
  in Lofoten (jesenski del istih klubov). **Isto ime, drug klub**: pregled vseh 46
  skupin in arhivov po id-jih ekip FIKS (15. 10. 2026; odrezana oblika ni združila
  nobenih dveh različnih ekip) je našel le "Borgen" — Østfold 4. div (ekipa 30463,
  klub 12) in Akershus 5. div (ekipa 4161, klub 143). `IME_EKIPE` (po id-ju ekipe) in
  `IME_V_KRETSU` (arhivske strani 2025 povezav na ekipe nimajo) v viru akershuškega
  preimenujeta v "Borgen (Akershus)". `norveske-lige.mjs` izpiše nove trke po id-jih
  ekip — dodaj jih tja pred uvozom.
- Raven za ceno novinca (`ravenLige`): `no-obos` 2, `-2div-` 3, `-3div-` 4,
  `-4div` 5, `-5div` 6 (Eliteserien ni vpisana); šifra osebe je skupna vsem
  ravnem, zato novinec iz višje lige dobi ceno od tam.

Seznam skupin in preizkus:

```bash
node scripts/norveske-lige.mjs --mapa /tmp/no                 # skupine 2026 z arhivom 2025 (po skupnih klubih)
node scripts/norveske-lige.mjs --preveri 4 --mapa /tmp/no      # + vzorec zapisnikov: polni, menjave, postave po 11
node scripts/norveske-lige.mjs --krets 4 --nivo 6 --preveri 4  # en krets, še 6. divisjon
node scripts/norveske-lige.mjs --polno 205400 --mapa /tmp/no   # vsi zapisniki ene skupine
```

**Pregled pokritosti (15. 10. 2026).** Vzorec odigranih tekem vsake skupine,
enakomerno čez sezono (4 + 4; pri 5. divisjon in mejnih 12 za 2026 in 8 za 2025),
kontumacije ne štejejo. Zapisnik je **poln**, če imata obe ekipi 7–11 začetnikov
in so goli iz dogodkov enaki izidu; vpisana je skupina z vsaj **80 %** polnih
(oba vzorca skupaj). Pregled je prebral ~800 strani (seznami, turnirji,
zapisniki) s 3 s premora; izziva ali zavrnitve ni bilo. Odigranih tekem v 2026
je ~90 % (sezona se konča konec oktobra).

- OBOS-ligaen, 2. in 3. divisjon: 72/72 polnih, menjave pri vseh ekipah.
- 4. divisjon (22 skupin): vse vpisane; nepolni so posamezni zapisniki brez golov
  (Trøndelag 4-2 "0:0" pri 4:3) in arhiv Nordland/Nordmøre 2025 (5/8).
- 5. divisjon: 15 od 37 skupin vpisanih; ostale imajo zapisnike brez golov ali s
  postavo "vsi začetniki" ali so jesenski/pomladni del z 3–9 klubi.
- **6. divisjon** (7. raven, ni v obsegu): vzorec 8 skupin (Oslo, Rogaland,
  Trøndelag, Hordaland, Agder, Indre Østland, Østfold, Troms), 44/45 polnih,
  menjav ni nikjer, 8–11 klubov; ni vpisana.

Vpisanih je 46 lig (migracija 20261016093900), **neaktivnih**, zveze `nff` (državna:
OBOS, 2. in 3. divisjon) in `nff-<krets>`:

| liga | klubov | 2026 | arhiv 2025 (skupnih klubov) | polnih 2026 / 2025 | ekip z menjavami 2026 |
|---|---|---|---|---|---|
| no-obos | 16 | `206093` | `199422` (11) | 4/4 / 4/4 | 8/8 |
| no-2div-1 | 14 | `206007` | `199294` (10) | 4/4 / 4/4 | 8/8 |
| no-2div-2 | 14 | `206008` | `199295` (10) | 4/4 / 4/4 | 8/8 |
| no-3div-1 | 14 | `205686` | `199883` (5) | 4/4 / 4/4 | 8/8 |
| no-3div-2 | 14 | `205687` | `199884` (9) | 4/4 / 4/4 | 8/8 |
| no-3div-3 | 14 | `205688` | `199886` (7) | 4/4 / 4/4 | 8/8 |
| no-3div-4 | 14 | `205689` | `199887` (8) | 4/4 / 4/4 | 8/8 |
| no-3div-5 | 14 | `205690` | `199885` (5) | 4/4 / 4/4 | 8/8 |
| no-3div-6 | 14 | `205691` | `199888` (5) | 4/4 / 4/4 | 8/8 |
| no-ostfold-4div | 14 | `205277` | `198293` (11) | 4/4 / 4/4 | 4/8 |
| no-ostfold-5div | 14 | `205278` | `198294` (10) | 10/12 / 8/8 | 0/20 |
| no-akershus-4div | 14 | `205683` | `199016` (10) | 4/4 / 4/4 | 7/8 |
| no-akershus-5div | 12 | `205706` | `199115` (7) | 10/12 / 7/8 | 0/20 |
| no-oslo-4div-1 | 12 | `205400` | `199018` (6) | 4/4 / 4/4 | 0/8 |
| no-oslo-4div-2 | 12 | `205401` | `199019` (6) | 4/4 / 4/4 | 0/8 |
| no-oslo-5div-2 | 12 | `205404` | `199022` (5) | 10/12 / 6/8 | 0/24 |
| no-indre-ostland-4div | 14 | `205625` | `198666` (10) | 4/4 / 4/4 | 8/8 |
| no-indre-ostland-5div-1 | 12 | `205626` | `198667` (6) | 10/12 / 8/8 | 0/20 |
| no-indre-ostland-5div-2 | 12 | `205627` | `198668` (8) | 12/12 / 8/8 | 0/24 |
| no-buskerud-4div | 14 | `206361` | `199791` (10) | 4/4 / 4/4 | 8/8 |
| no-buskerud-5div | 14 | `206756` | `199924` (9) | 10/12 / 8/8 | 0/24 |
| no-vestfold-4div | 12 | `206502` | `199523` (8) | 4/4 / 4/4 | 4/8 |
| no-telemark-4div | 12 | `205085` | `199109` (9) | 4/4 / 4/4 | 0/8 |
| no-telemark-5div | 12 | `205086` | `199242` (7) | 12/12 / 8/8 | 0/24 |
| no-rogaland-4div-1 | 12 | `206109` | `198845` (5) | 4/4 / 4/4 | 0/8 |
| no-rogaland-4div-2 | 12 | `206110` | `198846` (5) | 3/3 / 4/4 | 0/6 |
| no-rogaland-5div-1 | 12 | `206111` | `198848` (5) | 12/12 / 8/8 | 0/24 |
| no-rogaland-5div-2 | 11 | `206112` | `198847` (4) | 10/12 / 8/8 | 0/24 |
| no-rogaland-5div-3 | 12 | `206113` | `198849` (10) | 10/12 / 8/8 | 0/24 |
| no-hordaland-4div-1 | 12 | `205952` | `199277` (5) | 4/4 / 4/4 | 0/8 |
| no-hordaland-4div-2 | 12 | `205953` | `199276` (5) | 11/12 / 8/8 | 0/22 |
| no-sogn-fjordane-4div | 12 | `204918` | `198522` (10) | 4/4 / 4/4 | 8/8 |
| no-sogn-fjordane-5div | 10 | `204920` | `198864` (5) | 12/12 / 8/8 | 0/24 |
| no-nordmore-romsdal-4div | 12 | `205958` | `199890` (9) | 11/12 / 5/8 | 0/24 |
| no-trondelag-4div-1 | 12 | `205476` | `198853` (5) | 4/4 / 4/4 | 6/8 |
| no-trondelag-4div-2 | 12 | `205477` | `198854` (5) | 10/12 / 8/8 | 18/24 |
| no-nordland-4div | 10 | `204882` | `198520` (9) | 11/12 / 5/8 | 0/22 |
| no-nordland-5div-helgeland | 11 | `204885` | `200805` (7) | 12/12 / 8/8 | 0/24 |
| no-troms-4div | 12 | `206757` | `198548` (10) | 4/4 / 4/4 | 8/8 |
| no-finnmark-4div | 9 | `207928` | `200870` (6) | 4/4 / 4/4 | 0/8 |
| no-sunnmore-4div | 12 | `205682` | `199005` (10) | 4/4 / 4/4 | 5/8 |
| no-sunnmore-5div | 12 | `205921` | `199004` (10) | 11/12 / 6/8 | 0/24 |
| no-halogaland-4div | 9 | `206174` | `198903` (6) | 4/4 / 4/4 | 0/8 |
| no-halogaland-5div-vesteralen | 10 | `206942` | `200045` (8) | 9/12 / 8/8 | 0/20 |
| no-agder-4div | 14 | `205077` | `200043` (12) | 3/3 / 4/4 | 5/6 |
| no-agder-5div | 14 | `205103` | `198852` (6) | 9/12 / 7/8 | 14/24 |

**Izpuščeno** (skupine 2026, pod 80 % ali premajhne): Oslo 5. div avd. 01
`205403` (arhiv 4/8), Vestfold 5. div `206503` (3/8), Hordaland 5. div avd. 01–03
`205980`–`205982` (15/20, 15/20, 13/20), Nordmøre og Romsdal 5. div `205959`
(2/20, vsi začetniki), Trøndelag 5. div avd. 1–3 `205479`–`205481` (13, 6, 12 od
20), Nordland 5. div Salten `204883` (11/20), Troms 5. div `206838` (13/20),
Hålogaland Ofoten/Sør-Troms `206943` (14/20); premajhne ali le del sezone:
Finnmark 5. div avd. 1–5 (6–9 klubov, 7–15 krogov), Hålogaland Lofoten A, 2 in
Høst 2, 3 (3–6 klubov), Nordland Helgeland avd. 2 `204884` (7 klubov). Tudi:
Eliteserien (1. raven, ni v obsegu), kvalifikacije, KM, sluttspill, treningskamper,
ženske, mladinske, veterani (M34+), 7er.

**Vklop (2027).** Sezona 2026 je ob vpisu skoraj končana — vklop bo za 2027.
Takrat: (1) za vsako ligo nov id turnirja 2027 v `source_league_code` (seznam
`node scripts/norveske-lige.mjs`; za 2027 dodaj `2027` v `SEZONE` in `OBOS` v
skripti, tekoča sezona naj bo 2027 in arhiv 2026); id-ji 2026 postanejo arhiv
(`-f arhiv=<2026>,<2025>`); (2) vmesnik v norveščini (bokmål, `nb`) in `NO` v
`JEZIK_DRZAVE`, kartica `no.html`, pošta, imena lastnikov hišnih ekip; (3) `NO` v
matriko nočnega uvoza (`uvoz-zapisnikov.yml`, `KOSOV`) in *Hisne ekipe*;
(4) pred vklopom znova preveri pokritost 2027 (`--preveri`). Uvoz (ena za drugo,
**šele po uvozu migracije, ne v produkcijo pred odločitvijo lastnika**): `gh workflow
run uvoz-lige.yml -f liga=no-obos -f arhiv=199422 -f cene=true`. Arhiv ~180 zapisnikov po 3 s je
~10–15 minut na sezono.
