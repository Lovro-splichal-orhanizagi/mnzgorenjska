# CLAUDE.md

Navodila za Claude Code pri delu na tem projektu.

## O projektu

Fantasy football aplikacija za 1. Gorenjsko nogometno ligo (MNZG Kranj). Pokriva
dve tekmovanji — **člane** in **mladince** — vsako s svojimi igralci, krogi,
ekipami in lestvico. Uporabniki sestavljajo fantasy ekipe iz realnih igralcev
znotraj proračuna in tekmujejo na skupni lestvici svoje lige.

Točke temeljijo na uradni statistiki iz zapisnikov MNZ Gorenjska. Skupnost z glasovanjem
določi le tisto, česar zapisnik ne pove: **asistence** in **pozicije** (zapisnik označi le
vratarja z (V), postave pa našteje po številkah dresov). Prag je 5 glasov.

## Tehnološki sklop

- Frontend: React + Vite + Tailwind CSS, **postopno v TypeScriptu**
- Backend / baza / avtentikacija: Supabase (PostgreSQL)
- Gostovanje: **lasten strežnik** (Hetzner, `ssh slff`): self-hosted Supabase
  v Dockerju (`/opt/supabase`), Caddy streže stran in `api.slff.eu`, spredaj
  Cloudflare. Supabase Cloud in Vercel sta od 6. 10. 2026 le še rezerva in
  gresta proč (`docs/migracija-hetzner.md`). Pošta gre prek Mailcowa
  (`mail.slff.eu`, `noreply@slff.eu`), ne Resenda.

Lokalni razvoj teče na Supabase CLI stacku v Dockerju (`npx supabase start`).

## Dve ligi

`competitions` (`clani`, `mladinci`) nosita tri tabele, vse ostalo se izpelje:

- `rounds.competition_id` → krog in z njim tekme, goli, nastopi
- `players.competition_id` → mladinec in član sta **dve vrstici**, tudi če gre
  za isto osebo; prehod med selekcijama tako ne povleče statistike in cene
- `fantasy_teams.competition_id` → vsak ima lahko po eno ekipo v vsaki ligi

`teams` (klubi) so **skupni** — Šenčur je isti klub, ne glede na selekcijo.
Vir isti klub piše različno ("Eltron Preddvor" pri članih, "Preddvor SP Avto"
pri mladincih), zato uvoz imena preslika v `scripts/klubi.mjs`. Kateri klub
igra v kateri ligi, pove pogled `competition_teams`.

`competitions.prvi_fantasy_krog` pove, od katerega kroga liga šteje za fantasy
(mladinci od 2., ker se do takrat še vrstijo prestopi in prehodi med člane).
Vsi pogledi imajo stolpec `competition_id`; vmesnik izbrano ligo hrani v
`src/lib/tekmovanje.tsx` in jo doda v naslov kot `?t=mladinci`.

Uvozne skripte sprejmejo `--tekmovanje mladinci` (privzeto `clani`).

`ovrednoti-igralce` piše samo z `--pisi`. Na **aktivni** ligi celotno
prevrednotenje (in `ugani-pozicije --pisi` brez `--samo-nove`) zavrne, dokler
ne dodaš `--dovoli-aktivno` — med sezono cene premika le `--tedensko`.

## Države, zveze, tekmovanja

Nad tekmovanjem sta dve ravni, obe plitvi:

```
countries (SI)  →  federations (mnzg, mnzlj)  →  competitions (clani, lj-1-liga …)
```

- `federations` je **regijska zveza** (MNZ). Po njej izbirnik grupira lige in
  z nje pride `site_url` za navedbo vira v nogi. `competitions.federation_id`
  je lahko prazen — tekmovanje brez znane zveze se pokaže brez skupine.
- `competitions_view` prilepi državo in zvezo; vmesnik bere **ta pogled**, ne
  same tabele, in filtrira po `active`.
- **Nova liga se vpiše kot `active = false`.** Vklopi se šele, ko sta uvožena
  arhiv in tekoča sezona in cene niso več privzete — liga, v kateri stane vsak
  igralec 4.5, nima igre.

Vir podatkov je `competitions.source` in zanj obstaja datoteka v
`scripts/viri/`. Uvozne skripte naslovov ne gradijo same in vira ne poznajo:
dobijo ga iz tekmovanja (`viraZa`). Nova zveza = nova datoteka in ena vrstica
v `scripts/viri/index.mjs`.

**Vzdevki klubov so last vira**, ne sistema: dve zvezi sta dva ločena nabora
klubov in ime, ki v Kranju pomeni en klub, v Ljubljani lahko pomeni drugega.
Vsak vir zato pripelje svoj slovar v `naredikljucKluba`.

**Šifra lige pri viru pripada sezoni, ne ligi.** Ob novi sezoni se popravi
`competitions.source_league_code`, ne skripte. Arhiv prejšnje sezone se poda
z `--liga`.

Šifre slovenskih lig po sezonah (MNZ, 3. SNL `<koda>@<vir>`, U19) in
posebnosti Nove Gorice so v `docs/viri/slovenija.md`.

## Lige po državah in virih

Vsaka država oziroma vir ima svojo datoteko: šifre lig (tekoča sezona in
arhiv), kako vir bere strani, pravice in pogoji branja, kontumacije, vratarji,
trki imen klubov, preizkusi in ukaz za uvoz. **Preden se dotakneš vira, lige
ali uvoza države, preberi njeno datoteko**; ob novi ligi ali sezoni posodobi
tabelo šifer tam, ne tu.

| država | datoteka | viri |
|---|---|---|
| Slovenija | `docs/viri/slovenija.md` | stari CMS MNZ, nzs |
| Slovaška | `docs/viri/slovaska.md` | `sportnet` |
| Hrvaška | `docs/viri/hrvaska.md` | `hns` |
| Češka (ustavljeno, CAPTCHA) | `docs/viri/ceska.md` | `facr` |
| Madžarska | `docs/viri/madzarska.md` | `mlsz` |
| Avstrija | `docs/viri/avstrija.md` | `oefb` (dovoljenje ÖFB) |
| Srbija | `docs/viri/srbija.md` | `fsb`, `fss`, `fssid` |
| Romunija | `docs/viri/romunija.md` | `frf` (brez dovoljenja), `hlf` |
| Estonija | `docs/viri/estonija.md` | `jalgpall` |
| Latvija | `docs/viri/latvija.md` | `lff` |
| Poljska | `docs/viri/poljska.md` | `pzpn` |
| Španija | `docs/viri/spanija.md` | `fcf`, `fas` |
| Anglija | `docs/viri/anglija.md` | `ncefl` |
| Severna Makedonija | `docs/viri/makedonija.md` | `ffm` |
| Ukrajina | `docs/viri/ukrajina.md` | `aft`, `hoff-km` |
| Turčija | `docs/viri/turcija.md` | `askf` |
| Armenija | `docs/viri/armenija.md` | `ffa` |

Pravila, ki veljajo za vse vire (podrobnosti v datotekah):

- **Beremo odkrito in vljudno**: `User-Agent: SLFF fantasy …`, premor med
  zahtevki po viru, popolnih zapisnikov ne beremo znova, vir je v nogi.
  **Ob izzivu, CAPTCHI, 401/403/429 se uvoz ustavi (izhod 4) — nikoli ne
  obhajaj** (drug IP, brskalnik brez glave, nova seja, nižji tempo brez
  dogovora). Če zveza prosi, naj nehamo, lige države izklopimo.
- Šifra lige zunaj Slovenije se začne s kodo države (`sk-`, `hr-`, `at-` …),
  da jezik ob nalaganju ve, katero državo gleda.
- Nova država potrebuje: vmesnik (`src/i18n/<jezik>/`, `JEZIK_DRZAVE`),
  kartico `<kd>.html` in Caddy, vejo pošte, imena hišnih ekip in vrstico v
  matriki nočnega uvoza (`docs/nocni-uvoz.md`) — sicer se njene lige ponoči
  tiho ne uvažajo.
- Arhiv lahko uvozi **le ena liga** (`matches.zapisnik_id` je enoličen čez
  vse vire; zato imajo novejši viri predpono šifre zapisnika, npr. `ee<id>`).
- Isto ime kluba v dveh zvezah ali krajih je lahko drug klub: vsak vir ima
  svoj slovar preimenovanj; ob novi ligi preveri trke imen.
- Koledarska sezona (EE, LV, UA): `competitions.sezona_koledarska`,
  `sezona_lige(liga)`, oznaka `'2026'` (glej `docs/viri/estonija.md`).
- Lige z delitvijo sezone (Avstrija `+`, Madžarska felső/alsóház): delitev za
  arhiv osnovne lige ne uvažaj, sicer pripelje igralce drugih skupin.

Država obiskovalca (katere lige vidi, ugib po IP/jeziku/pasu, tujec, vstopne
strani `/si`, `/at` …, izbira države): `docs/drzava-obiskovalca.md`. Kratko:
lige druge države so skrite, `useTekmovanje().tekmovanja` vrne le lige
gledane države — **nova stran, ki našteva lige ali ekipe več lig, mora
filtrirati po državi**.

Nočni uvoz po državah in koših (`uvoz-zapisnikov.yml`, `nocni-kosi.mjs`,
`KOSOV` = matrika): `docs/nocni-uvoz.md`.
| snl3-vzhod | mnzpt `2026:96` | `2025-26/3-snl-v-25-26@mnzle`, `2024-25/3-snl-v-24-25@mnzle` |
| snl3-zahod | mnzng `2785` | `1703@mnzlj` (23/24), `1603@mnzlj` (22/23) |

Arhivi preostalih zvez:

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| pt-super | `2026:3` | `2025:65`, `2024:65` |
| pt-1razred | `2026:4` | `2025:67`, `2024:67` |
| ms-clani | `2026:113` | `2025:113` |
| le-pnl | `2026-27/pomurska-nogometna-liga-26-27` | `2025:112@mnzms`, `2024:112@mnzms` |
| le-mnl | `2026-27/mnl-lendava-26-27` | `2025-26/mnl-lendava-25-26` |
| ng-primorska | `3199` | `2579` (25/26) — starejših **ne** uvažaj, glej spodaj |
| mb-1clanska | `1-clanska-liga-26-27` | `1-clanska-liga-25-26` |
| mb-2clanska | `2-clanska-liga-26-27` | `2-clanska-liga-25-26` |

Mladinske lige (U19) — `prvi_fantasy_krog = 2`, `rok_pomak_ur = 2`, ker so
tekme zjutraj. Izpuščeni Celje (4 klubi) in Lendava (5): pri 15 igralcih in
največ 3 iz kluba je pet klubov spodnja meja brez izbire.

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| sml1 / sml2-vzhod / sml2-zahod (nzs) | `1-sml-eon-nextgen` / `2-sml-vzhod` / `2-sml-zahod` | `<pot>:22` (25/26), `<pot>:23` (24/25) |
| mb-u19 | `u19-mladinska-liga-26-27` | `u19-mladinska-liga-25-26`, `…-24-25` |
| lj-mladinci / lj-mladinci-2 | `2005` / `2006` | `1906`,`1806` / `1907`,`1807` |
| pt-mladinci | `2026:53` | `2025:71`, `2024:71` (šifra Mladine se s sezono menja) |
| ms-mladinci | `2026:115` | `2025:115`, `2024:115` |

### Slovaška

Vir `sportnet` (`scripts/viri/sportnet.mjs`) bere **javni API**, ki ga
uporablja futbalnet.sk (`sutaze.api.sportnet.online/api/v2`), ne HTML. Šifra
lige je `<appSpace>/<competitionId>[/<partId>]`; vsaka sezona ima svoj
competitionId, tekmovanje s skupinami (V. liga Sever/Juh) pa je več lig in
skupino izbere `partId`. Zapisnik prinese pozicijo in šifro ISSF vsakega
igralca, zato Slovaška ne čaka na glasovanje o pozicijah (stran Pozicije je
v meniju skrita); asistenc ni, kot pri nas. Avtogol je `goal` z vrsto
`dropped` in je zapisan pri ekipi strelca.

Uvoz vzame pozicijo iz **prvega** zapisnika, ki igralca vidi, in je ne spreminja:
kdor je bil lani drugje vratar, ostane GK (Ádám Erik, Želovce, 10/2026).
`scripts/uskladi-pozicije.mjs` (delovni tok *Uskladi pozicije*, najprej brez
`pisi`) jo popravi po večini letošnjih zapisnikov (vsaj dva glasova), privzeto
le vratar ↔ polje; DEF/MID/FWD med sabo le z `vse_pozicije`, ker klubi te
oznake pišejo ohlapno in menjava preračuna točke zadnjih 14 dni.

Vpisane so vse lige odraslih Stredoslovenského FZ in enajstih okresov pod njim
(27, migracija 20260926090000), **neaktivne**. Seznam lig z arhivom izpiše:

```bash
node scripts/slovaske-lige.mjs ssfz          # regija, lige, šifre, arhiv 2025/26
```

Pri desetih ligah arhiva po imenu ni najti (sponzor ali skupina se je
preimenovala) — šifro poišči ročno v `/public/<appSpace>/competitions`.

**Vse ostale slovaške lige** (pometanje vseh zvez 12. 10. 2026): migracija
20261012151100 vpiše 30 zvez in 78 lig odraslih (Niké liga, MONACObet liga,
III. liga po skupinah, BFZ, ZsFZ, VsFZ in vsi okresi pod njimi), migracija
20261012153100 34 lig U19 (I. in II. liga starší dorast, regijske in okresne
U19 z vsaj šestimi klubi); skupaj s SsFZ je Slovaška 154 lig, vse
**neaktivne**. appSpace-i zvez, ki jih stran zveze ne pove sama: Komárno
`obfz-komarno.futbalnet.sk`, Levice `obfz-levice.futbalnet.sk`, Trebišov
`obfz-trebisov.futbalnet.sk`, Svidník `ondavsky-futbalovy-zvaz.futbalnet.sk`
(stran zveze `ondavsky-oblastny-futbalovy-zvaz`), MFZ Košice `MFZ-Kosice`
(le mladinske lige — zveza ni vpisana), Niké liga `ulk.futbalnet.sk`, ostale
državne `futbalsfz.sk`.

Izpuščeno: pokali (Slovnaft Cup, okresni), ženske, futsal, U17 in mlajši,
kvalifikacije (ZsFZ VI. Severovýchod ima "Kvalifikačné stretnutie" kot svoj
del — šifra je zato z delom lige), lige z manj kot šestimi klubi (Prievidza
IX. A; U19 Košice-okolie MINI, Michalovce, Rožňava, Trebišov) in Poprad U19
"malé mužstvo 8+1".

- **Niké liga** piše kroge "7. kolo" (ostale "7"); vir jih bere s
  `krogIz`. Nadstavba (o titul, o obstanek) je v istem tekmovanju kot nova
  dela s krogi spet od 1, zato ima šifra del `Základná časť` in arhiv prav
  tako. Ob delitvi (po 22. krogu) jo je treba pripeti posebej — vir tega še
  ne zna (kot `+` pri `oefb`).
- **Arhiv** je izbran po skupnih klubih (1. krog ni pomemben, šteje vsa
  sezona); vsak arhiv ima ena sama liga. ZsFZ U19 IV. C1 in C2 sta lani bili
  ena skupina C — dobi jo C1, **C2 je brez arhiva**. Šibka arhiva:
  Trebišov 7. liga (lani 5 klubov, 3 skupni) in Prešov U19 6. liga (4 od 9).
- **Isto ime, drug klub**: klub se ujema po imenu (`kljucKlubaSk`), ne po
  ISSF. Pregled vseh 154 lig (tekoča sezona in arhivi, 1409 klubov) je našel
  le "FAM Poprad" z dvema organizacijama ISSF v istem okresu (isti klub,
  nova registracija) — ni trka. Ob novi sezoni preveri znova.

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| sk-nike-liga | 12 | `ulk.futbalnet.sk/6a18960d44ff24612efb0865/6a189f95b5f9fd8631502d6a` | `ulk.futbalnet.sk/685547e75a52cdc9435d81e6/685547e7bf40937d07404c50` (11) |
| sk-sfz-2liga | 16 | `futbalsfz.sk/6a0d921b5736165c0eab633c` | `futbalsfz.sk/6849d1b0eba10c40f7f790dc` (12) |
| sk-sfz-3liga-zapad | 16 | `futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c66c9a61a70ee926736` | `futbalsfz.sk/684025c89673e57cce43c96a/684025c70dabda15026f072d` (13) |
| sk-sfz-3liga-stred | 14 | `futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c81c9a61a70ee926737` | `futbalsfz.sk/684025c89673e57cce43c96a/684025c80dabda15026f072e` (12) |
| sk-sfz-3liga-vychod | 14 | `futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c9ec9a61a70ee926738` | `futbalsfz.sk/684025c89673e57cce43c96a/684025c70dabda15026f072c` (11) |
| sk-bfz-4liga | 16 | `BFZ/6a1201b044ff24612e96f228` | `BFZ/68453070eba10c40f77b3c7a` (13) |
| sk-bfz-5liga | 16 | `BFZ/6a1201f944ff24612e97a052` | `BFZ/68452feceba10c40f77a12db` (12) |
| sk-ba-6liga | 14 | `BA-mesto/6a23e9a0233cdeb1e71cfc2f` | `BA-mesto/684c832fe7ee690eb4708607` (9) |
| sk-ba-7liga | 9 | `BA-mesto/6a23e719233cdeb1e716a3ba` | `BA-mesto/6847d58deba10c40f7c625e5` (5) |
| sk-bav-6liga | 14 | `BA-vidiek/6a30ef8ee4bf1215246cc80d` | `BA-vidiek/68529e4a5a52cdc943952b0e` (12) |
| sk-bav-7liga | 7 | `BA-vidiek/6a310515e4bf1215248f7fc3` | `BA-vidiek/68529e435a52cdc943951d58` (5) |
| sk-zsfz-4liga | 16 | `ZsFZ/6a0fdf345736165c0e132e9a` | `ZsFZ/68483817eba10c40f7723690` (13) |
| sk-zsfz-5liga-juhovychod | 16 | `ZsFZ/6a0ff1ef5736165c0e3f366c` | `ZsFZ/684167109673e57cceb2c3d5` (13) |
| sk-zsfz-5liga-severozapad | 16 | `ZsFZ/6a0ff21f5736165c0e3fa12b` | `ZsFZ/684ea203e7ee690eb44c6121` (11) |
| sk-zsfz-6liga-sever | 14 | `ZsFZ/6a0ff3395736165c0e424726` | `ZsFZ/6842f06eeba10c40f74da585` (14) |
| sk-zsfz-6liga-severovychod | 16 | `ZsFZ/6a0ff3155736165c0e41f151/6a0ff3153bff416b52e1d022` | `ZsFZ/6842f16beba10c40f74f9130` (13) |
| sk-zsfz-6liga-stred | 14 | `ZsFZ/6a0ff2525736165c0e4014cd` | `ZsFZ/684bfa6fe7ee690eb490d156` (13) |
| sk-zsfz-6liga-vychod | 16 | `ZsFZ/6a0ff2845736165c0e4082f9` | `ZsFZ/684292c6eba10c40f7aa38c8` (12) |
| sk-zsfz-6liga-zapad | 15 | `ZsFZ/6a0ff2d65736165c0e4155e3` | `ZsFZ/6842940deba10c40f7ac686d` (10) |
| sk-zsfz-6liga-juh | 10 | `ZsFZ/6a0ff2a75736165c0e40d814` | `ZsFZ/684bfaf6e7ee690eb491b146` (8) |
| sk-nz-7liga | 16 | `ObFZ-Nove-Zamky/6a1de63f44ff24612e84982b` | `ObFZ-Nove-Zamky/684092bc9673e57cce273ba9` (13) |
| sk-nz-8liga | 13 | `ObFZ-Nove-Zamky/6a1de6db44ff24612e858d41` | `ObFZ-Nove-Zamky/684093609673e57cce288361` (11) |
| sk-tt-7liga | 14 | `ObFZ-Trnava/6a26ec1f233cdeb1e7bba90d` | `ObFZ-Trnava/684c1adee7ee690eb4cb9308` (12) |
| sk-tt-8liga-maxima | 14 | `ObFZ-Trnava/6a26eef5233cdeb1e7bfcfcc` | `ObFZ-Trnava/68432737eba10c40f7b16aae` (11) |
| sk-tt-8liga-rubbex | 13 | `ObFZ-Trnava/6a26edb8233cdeb1e7bde2ad` | `ObFZ-Trnava/684ace3ce7ee690eb4c19c5c` (11) |
| sk-tt-9liga | 14 | `ObFZ-Trnava/6a26efb9233cdeb1e7c0fd58` | `ObFZ-Trnava/68499d1feba10c40f793fb62` (10) |
| sk-tn-7liga | 15 | `ObFZTrencin/6a217b1f233cdeb1e76426f4` | `ObFZTrencin/684ab00ae7ee690eb48f22b9` (13) |
| sk-tn-8liga-sever | 12 | `ObFZTrencin/6a217b8e233cdeb1e7653743` | `ObFZTrencin/68529e3d5a52cdc943950c47` (11) |
| sk-tn-8liga-juh | 9 | `ObFZTrencin/6a217b51233cdeb1e764b240` | `ObFZTrencin/68529e3f5a52cdc943951232` (8) |
| sk-tn-9liga | 13 | `ObFZTrencin/6a217bc4233cdeb1e765aee8` | `ObFZTrencin/68529e3c5a52cdc943950b2a` (11) |
| sk-ds-7liga | 16 | `obfz-dunajska-streda/6a17fb9d44ff24612ecf19e4` | `obfz-dunajska-streda/6849c020eba10c40f7d2cbed` (13) |
| sk-ds-8liga | 10 | `obfz-dunajska-streda/6a3046abe4bf12152410590e` | `obfz-dunajska-streda/684127989673e57cce38ef96` (9) |
| sk-ga-7liga-a | 10 | `obfz-galanta.futbalnet.sk/6a2c0666e4bf121524a0bdb4/6a350bbe0b755716bcd9b03d` | `obfz-galanta.futbalnet.sk/68429b32eba10c40f7b810ca/6870c74abf40937d075d8961` (9) |
| sk-ga-7liga-b | 10 | `obfz-galanta.futbalnet.sk/6a2c0666e4bf121524a0bdb4/6a4e2e0cbd81013dc7a6938e` | `obfz-galanta.futbalnet.sk/68429b32eba10c40f7b810ca/6870c6d4bf40937d075d8936` (9) |
| sk-kn-7liga | 14 | `obfz-komarno.futbalnet.sk/6a2667b4233cdeb1e7bf8ecb` | `obfz-komarno.futbalnet.sk/685272505a52cdc9434e5ea9` (13) |
| sk-lv-7liga | 13 | `obfz-levice.futbalnet.sk/6a26a26b233cdeb1e73686ef` | `obfz-levice.futbalnet.sk/6846ba2beba10c40f7ff39af` (11) |
| sk-lv-8liga | 12 | `obfz-levice.futbalnet.sk/6a26a2ea233cdeb1e7378075` | `obfz-levice.futbalnet.sk/6846bab8eba10c40f7005641` (11) |
| sk-nr-7liga | 16 | `obfz-nitra.futbalnet.sk/6a1f41cc233cdeb1e7206aec` | `obfz-nitra.futbalnet.sk/684fde8b5a52cdc943396059` (13) |
| sk-nr-8liga-a | 14 | `obfz-nitra.futbalnet.sk/6a1f420b233cdeb1e720ca7c` | `obfz-nitra.futbalnet.sk/685145fe5a52cdc943855f84` (12) |
| sk-nr-8liga-b | 13 | `obfz-nitra.futbalnet.sk/6a1f4269233cdeb1e721462c` | `obfz-nitra.futbalnet.sk/684ac7aae7ee690eb4b6fe51` (12) |
| sk-pb-7liga | 14 | `obfz-povazska-bystrica.futbalnet.sk/6a0ea6b45736165c0eaa9d93` | `obfz-povazska-bystrica.futbalnet.sk/68529e435a52cdc943951d7b` (12) |
| sk-pb-8liga | 10 | `obfz-povazska-bystrica.futbalnet.sk/6a0ea7c85736165c0eac8ef6` | `obfz-povazska-bystrica.futbalnet.sk/68529e405a52cdc943951727` (7) |
| sk-pd-7liga | 14 | `obfz-prievidza/6a16fb0144ff24612e412a4c` | `obfz-prievidza/684af3f2e7ee690eb4fd4c43` (10) |
| sk-pd-8liga-a | 12 | `obfz-prievidza/6a16fcd944ff24612e4478f8` | `obfz-prievidza/684af40ee7ee690eb4fd7309` (8) |
| sk-pd-8liga-b | 14 | `obfz-prievidza/6a1893a344ff24612ef44956` | `obfz-prievidza/684af431e7ee690eb4fda7e1` (12) |
| sk-pd-9liga-b | 10 | `obfz-prievidza/6a18949b44ff24612ef6facb` | `obfz-prievidza/684af450e7ee690eb4fdd3cc` (8) |
| sk-se-7liga | 12 | `obfz-senica.futbalnet.sk/6a2bfb69e4bf1215248a0202` | `obfz-senica.futbalnet.sk/684c3ebce7ee690eb404d7fa` (9) |
| sk-se-8liga | 12 | `obfz-senica.futbalnet.sk/6a2bfaa3e4bf12152488a64b` | `obfz-senica.futbalnet.sk/684c3deae7ee690eb4039424` (9) |
| sk-se-9liga | 9 | `obfz-senica.futbalnet.sk/6a2bf998e4bf12152486cd98` | `obfz-senica.futbalnet.sk/684c3d51e7ee690eb402a83f/685420d8bf40937d0740498b` (5) |
| sk-to-7liga | 8 | `obfz-topolcany.futbalnet.sk/6a27bb4b225470a9beffaacf` | `obfz-topolcany.futbalnet.sk/68529e485a52cdc9439527ed` (6) |
| sk-to-8liga | 9 | `obfz-topolcany.futbalnet.sk/6a27bd6c225470a9be02d35c` | `obfz-topolcany.futbalnet.sk/68529e425a52cdc943951bae` (7) |
| sk-vsfz-4liga | 14 | `VsFZ/6a0f09fd5736165c0e627a32` | `VsFZ/684f236a5a52cdc943166993` (11) |
| sk-vsfz-5liga-sever | 14 | `VsFZ/6a5df775705f8e9a4940e79b` | `VsFZ/684f23785a52cdc943168833` (11) |
| sk-vsfz-5liga-juh | 14 | `VsFZ/6a0f0a525736165c0e6330fd` | `VsFZ/684f23855a52cdc94316a5e1` (10) |
| sk-vsfz-6liga-kg | 14 | `VsFZ/6a0f0a745736165c0e637097` | `VsFZ/684f23905a52cdc94316bd2a` (12) |
| sk-vsfz-6liga-pt | 14 | `VsFZ/6a0f0b285736165c0e64e8f7` | `VsFZ/6846d95deba10c40f73fcc03` (12) |
| sk-vsfz-6liga-sarisska | 14 | `VsFZ/6a0f0b5a5736165c0e655762` | `VsFZ/6846daf2eba10c40f742ea26` (12) |
| sk-vsfz-6liga-vd | 14 | `VsFZ/6a0f0b0b5736165c0e64adc1` | `VsFZ/684f23a95a52cdc94316f802` (12) |
| sk-vsfz-6liga-zemplinska | 14 | `VsFZ/6a0f0a8c5736165c0e63a24f` | `VsFZ/68454f1ceba10c40f7d3cdbb` (10) |
| sk-ks-7liga | 10 | `ObFZ-KE-okolie/6a267bc4233cdeb1e7e92ff0` | `ObFZ-KE-okolie/68500a2c5a52cdc9438c30e7` (8) |
| sk-ks-8liga | 7 | `ObFZ-KE-okolie/6a267c12233cdeb1e7e9dd03` | `ObFZ-KE-okolie/68529e415a52cdc94395190e` (4) |
| sk-pp-7liga | 14 | `ObFZ-Poprad/6a27cd57225470a9be1a7686` | `ObFZ-Poprad/6847ff97eba10c40f7088114` (12) |
| sk-pp-8liga | 8 | `ObFZ-Poprad/6a27cec3225470a9be1ca9fa` | `ObFZ-Poprad/6847ffb7eba10c40f708b582` (6) |
| sk-po-7liga | 14 | `ObFZ-Presov/6a22a6e7233cdeb1e729518b` | `ObFZ-Presov/6849bf45eba10c40f7d00ea7` (11) |
| sk-po-8liga | 12 | `ObFZ-Presov/6a22a723233cdeb1e729a3d3` | `ObFZ-Presov/6849bf88eba10c40f7d142ac` (9) |
| sk-po-9liga | 8 | `ObFZ-Presov/6a22a751233cdeb1e729e761` | `ObFZ-Presov/6849bfbeeba10c40f7d1cc16` (5) |
| sk-bj-7liga | 12 | `obfz-bardejov.futbalnet.sk/6a1e683444ff24612e3a21db` | `obfz-bardejov.futbalnet.sk/684674b8eba10c40f7699dbd` (9) |
| sk-bj-8liga | 9 | `obfz-bardejov.futbalnet.sk/6a1e68c344ff24612e3b2ed6` | `obfz-bardejov.futbalnet.sk/68529e3c5a52cdc943950b1a` (6) |
| sk-he-7liga | 14 | `obfz-humenne.futbalnet.sk/6a22c028233cdeb1e751845c` | `obfz-humenne.futbalnet.sk/684939f0eba10c40f7ed4dbc` (13) |
| sk-he-8liga | 8 | `obfz-humenne.futbalnet.sk/6a22c0b9233cdeb1e7526067` | `obfz-humenne.futbalnet.sk/68493b79eba10c40f7ef81e0` (8) |
| sk-mi-7liga-a | 8 | `obfz-michalovce/6a2fb735e4bf121524fb09e2` | `obfz-michalovce/684fbcb75a52cdc943fb78c4/684fbd279db12b1dbe8c5f47` (7) |
| sk-mi-7liga-b | 8 | `obfz-michalovce/6a2fb757e4bf121524fb4974` | `obfz-michalovce/684fbd5d5a52cdc943fc8861` (7) |
| sk-rv-7liga | 13 | `obfz-roznava.futbalnet.sk/6a2bdb09e4bf1215244cde54` | `obfz-roznava.futbalnet.sk/6847ef6eeba10c40f7eec824` (13) |
| sk-sl-7liga | 6 | `obfz-stara-lubovna.futbalnet.sk/6a1c356444ff24612eed70b6` | `obfz-stara-lubovna.futbalnet.sk/68926983affe0f1eee4b9a27` (6) |
| sk-tv-7liga | 10 | `obfz-trebisov.futbalnet.sk/6a2e535ce4bf121524150c48` | `obfz-trebisov.futbalnet.sk/68508b475a52cdc9437c695d` (3) |
| sk-vt-7liga | 7 | `obfz-vranov-nad-toplou.futbalnet.sk/6a1e8e2d44ff24612e879ec5` | `obfz-vranov-nad-toplou.futbalnet.sk/6850fbd15a52cdc9430a53bb` (6) |
| sk-sk-7liga | 10 | `ondavsky-futbalovy-zvaz.futbalnet.sk/6a1d3ce044ff24612e48b0dd` | `ondavsky-futbalovy-zvaz.futbalnet.sk/685105d85a52cdc943199420` (10) |
| sk-sn-7liga | 14 | `sofz-spisska-nova-ves.futbalnet.sk/6a2ffe06e4bf1215247c8fb4` | `sofz-spisska-nova-ves.futbalnet.sk/68510a3c5a52cdc943205e2c` (12) |
| sk-sfz-u19-1liga | 14 | `futbalsfz.sk/6a0da2685736165c0ec8545b` | `futbalsfz.sk/6849d660e7ee690eb457bf2d` (12) |
| sk-sfz-u19-2liga-zapad | 16 | `futbalsfz.sk/6a0da4525736165c0ecc3551/6a17407fc9a61a70ee926749` | `futbalsfz.sk/684d6386e7ee690eb4e6d4c6/684d63869db12b1dbe8c5b81` (11) |
| sk-sfz-u19-2liga-vychod | 16 | `futbalsfz.sk/6a0da4525736165c0ecc3551/6a174094c9a61a70ee92674a` | `futbalsfz.sk/684d6386e7ee690eb4e6d4c6/684d63869db12b1dbe8c5b82` (14) |
| sk-bfz-u19-3liga | 12 | `BFZ/6a12024444ff24612e986fe3` | `BFZ/68452fa6eba10c40f77975c3` (10) |
| sk-bav-u19 | 17 | `BA-vidiek/6a310851e4bf12152494c907` | `BA-vidiek/68529e365a52cdc94394f9a9` (9) |
| sk-zsfz-u19-3liga-sz | 16 | `ZsFZ/6a0ff3605736165c0e429b58/6a0ff3603bff416b52e1d025` | `ZsFZ/6841675c9673e57cceb36ce1/6841675c0dabda15026f09a1` (12) |
| sk-zsfz-u19-3liga-jv | 16 | `ZsFZ/6a0ff3605736165c0e429b58/6a0ff3603bff416b52e1d024` | `ZsFZ/6841675c9673e57cceb36ce1/6841675c0dabda15026f09a2` (11) |
| sk-zsfz-u19-4liga-a | 11 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02d` | `ZsFZ/6844443feba10c40f7a8db50/6844443f1542852f3453efd9` (9) |
| sk-zsfz-u19-4liga-b | 13 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02b` | `ZsFZ/6844443feba10c40f7a8db50/685d676ebf40937d07405e60` (11) |
| sk-zsfz-u19-4liga-c1 | 9 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02a` | `ZsFZ/6844443feba10c40f7a8db50/685d69b6bf40937d07405e61` (7) |
| sk-zsfz-u19-4liga-c2 | 9 | `ZsFZ/6a0ff3a55736165c0e43378a/6a46147fc89d6650f060c7e2` | — |
| sk-zsfz-u19-4liga-d | 16 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02c` | `ZsFZ/6844443feba10c40f7a8db50/685d6bcfbf40937d07405e66` (14) |
| sk-zsfz-u19-4liga-e | 8 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d029` | `ZsFZ/6844443feba10c40f7a8db50/685d6e08bf40937d07405e6e` (6) |
| sk-zsfz-u19-4liga-f | 16 | `ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d028` | `ZsFZ/6844443feba10c40f7a8db50/685d6f5ebf40937d07405e6f` (14) |
| sk-nz-u19 | 7 | `ObFZ-Nove-Zamky/6a1de75844ff24612e865cdf` | `ObFZ-Nove-Zamky/6840941f9673e57cce29ef12` (5) |
| sk-tt-u19 | 11 | `ObFZ-Trnava/6a26f0b5233cdeb1e7c2a346` | `ObFZ-Trnava/6843277beba10c40f7b1d6a3` (9) |
| sk-tn-u19 | 14 | `ObFZTrencin/6a217bfc233cdeb1e76636a7` | `ObFZTrencin/68529e335a52cdc94394f2fb` (11) |
| sk-ds-u19 | 8 | `obfz-dunajska-streda/6a17fb8444ff24612ecef142` | `obfz-dunajska-streda/684bd2f4e7ee690eb44d4698` (8) |
| sk-ga-u19 | 12 | `obfz-galanta.futbalnet.sk/6a2c0875e4bf121524a4b3ba` | `obfz-galanta.futbalnet.sk/684dc78fe7ee690eb4c89778` (8) |
| sk-pb-u19 | 12 | `obfz-povazska-bystrica.futbalnet.sk/6a0ea8575736165c0ead9c38` | `obfz-povazska-bystrica.futbalnet.sk/684b0bf1e7ee690eb4265192` (10) |
| sk-pd-u19 | 16 | `obfz-prievidza/6a1895fa44ff24612efadd4c` | `obfz-prievidza/684af46be7ee690eb4fe0132` (12) |
| sk-vsfz-u19-3liga-a | 13 | `VsFZ/6a0f0c905736165c0e67cffd/6a1415883bff416b52e1d814` | `VsFZ/68482dd5eba10c40f7607731/6870bf05bf40937d075d83fa` (10) |
| sk-vsfz-u19-3liga-b | 13 | `VsFZ/6a0f0c905736165c0e67cffd/6a3910eb0b755716bcd9c05a` | `VsFZ/68482dd5eba10c40f7607731/68482dd5de64929471ba8501` (8) |
| sk-vsfz-u19-4liga-kg | 10 | `VsFZ/6a0f0cee5736165c0e68aac6` | `VsFZ/684afbbfe7ee690eb409db58` (7) |
| sk-vsfz-u19-4liga-pt | 14 | `VsFZ/6a0f0d485736165c0e6977ab` | `VsFZ/6846db9beba10c40f74430b7` (11) |
| sk-vsfz-u19-4liga-sarisska | 13 | `VsFZ/6a0f0d2b5736165c0e693c5b` | `VsFZ/68429280eba10c40f7a9d12c` (12) |
| sk-vsfz-u19-4liga-vd | 9 | `VsFZ/6a0f0ccb5736165c0e6859bd` | `VsFZ/684c6c20e7ee690eb44cfe00` (9) |
| sk-vsfz-u19-4liga-z | 11 | `VsFZ/6a0f0d145736165c0e68fd63` | `VsFZ/68455c91eba10c40f7f49bc1` (7) |
| sk-po-u19-5liga | 9 | `ObFZ-Presov/6a22a78d233cdeb1e72a3aa4` | `ObFZ-Presov/6849bff7eba10c40f7d261ad` (7) |
| sk-po-u19-6liga | 9 | `ObFZ-Presov/6a22a7bc233cdeb1e72a7d80` | `ObFZ-Presov/6849c033eba10c40f7d2f67c` (4) |
| sk-bj-u19 | 7 | `obfz-bardejov.futbalnet.sk/6a1e693444ff24612e3bf23d` | `obfz-bardejov.futbalnet.sk/68467595eba10c40f76b4819` (7) |
| sk-vt-u19 | 10 | `obfz-vranov-nad-toplou.futbalnet.sk/6a1e8e4644ff24612e87dee7` | `obfz-vranov-nad-toplou.futbalnet.sk/68510e9f5a52cdc943276dac` (7) |
| sk-sk-u19 | 7 | `ondavsky-futbalovy-zvaz.futbalnet.sk/6a1d3d3a44ff24612e4977db` | `ondavsky-futbalovy-zvaz.futbalnet.sk/684fbc795a52cdc943fb18ad` (6) |
| sk-sn-u19 | 7 | `sofz-spisska-nova-ves.futbalnet.sk/6a2ffd43e4bf1215247b525e` | `sofz-spisska-nova-ves.futbalnet.sk/68510bb65a52cdc94322bef4` (5) |

**Vklop slovaške lige v produkciji:** delovni tok *Uvoz lige (rocno)* z
`liga = sk-…`, `arhiv = <šifra 2025/26>`, `tekoca` in `cene`; nato
`pripravljenost-lige` in `update competitions set active = true …`.

Podatke beremo brez izrecnega dovoljenja SFZ/Sportnet, zato odkrito in
vljudno: glava `User-Agent: SLFF fantasy (https://slff.eu)`, 300 ms med
zahtevki, nespremenjenih zapisnikov ne beremo znova, vir (`vir_ime`,
`vir_url` → futbalnet.sk) je v nogi vsake strani. Če nas prosijo, naj nehamo,
slovaške lige izklopimo.

Grbe slovaških klubov prinese `scripts/grbi-sportnet.mjs` (klub sam naloži grb
v ISSF, `organization.logo_public_url`) — delovni tok *Grbi klubov* z
`vir = sportnet`. Po uvozu nove slovaške lige ga poženi znova.

Jezik vmesnika sledi državi lige (`src/i18n/sk/`, `JEZIK_DRZAVE`), razen izbire
jezika in tujca (glej *Prevodi*); šifra lige
zunaj Slovenije se začne s kodo države (`sk-…`), da jezik ob nalaganju ve,
katero državo gleda.

### Hrvaška

Vir `hns` (`scripts/viri/hns.mjs`) bere **HNS Semafor** (semafor.hns.family),
javni prikaz COMET-a, v katerem HNS in vse županijske zveze (ŽNS, NS) vodijo
tekmovanja. Zapisnik je enak od Treće NL do III. ŽNL: postavi s številko dresa
in stalno šifro osebe (`data-personid` → `reg_st`), vratar označen, dogodki pri
igralcu z minuto (gol, 11 m, avtogol, karton, menjava). Menjave niso v parih —
vemo, kdaj je kdo prišel in šel, kar minutam zadošča. Pozicij razen vratarja
ni, zato hrvaške lige čakajo na glasovanje o pozicijah kot slovenske.

Šifra lige je **id tekmovanja** na Semaforju (`/natjecanja/<id>/`); vsaka
sezona ima svoj id, tudi arhiv. Stran tekmovanja nosi ves razpored, stran
tekme zapisnik. Vse lige po zvezah z arhivom in številom klubov izpiše:

```bash
node scripts/hrvaske-lige.mjs              # vse zveze
node scripts/hrvaske-lige.mjs --zveza 40   # ena zveza (oid, 40 = Međimurje)
```

Vpisanih je 15 lig severozahoda (migracija 20261004163300), **neaktivnih**:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| hr-3nl-sjever / -zapad / -centar | `115183774` / `114647051` / `114608014` | `100970578` / `100585203` / `100580402` |
| hr-mz-premier / -1mnl / -2mnl | `114562601` / `114562642` / `114563249` | `100660111` / `100663430` / `100664944` |
| hr-vz-elitna / -1znl | `114667150` / `114669201` | `100608915` / `100609886` |
| hr-kz-1znl | `114647266` | `100694508` |
| hr-is-elitna / -1znl | `114701073` / `114703568` | `100703751` / `100704518` |
| hr-ri-4nl | `114651788` | `100796651` |
| hr-zg-1liga / -2liga | `114608298` / `114608605` | `100629221` / `100632300` |
| hr-kc-elitna | `114703534` | `100712145` |

**Državne lige HNS** (migracija 20261012155100, **neaktivne**): pregled
pokritosti 12. 10. 2026 je pokazal, da `hrvaske-lige.mjs` izpusti vse s
"SuperSport" v imenu (filter `IZPUSTI`, ker sponzor nosi tudi HNK in HMNL), zato
vrh ni bil vpisan. Zapisnik je isti kot pri Treći NL.

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| hr-hnl | `114137140` (10 klubov) | `100391485` |
| hr-1nl | `114348034` (16) | `100413651` |
| hr-2nl | `114348039` (16) | `100418001` |

**Mladinske lige (juniori, U19)** (migracija 20261013110100, 28 lig,
**neaktivnih**): pregled 12. 10. 2026 je prečesal seznam tekmovanj vseh 40
zvez (`/handlers/getCompetitions/`, sezoni 2026/2027 in 2025/2026; skripta
`hrvaske-lige.mjs` mladinske izpusti) in odprl en zapisnik vsake lige in
vsakega arhiva: povsod postavi 11 + 11 s šifro osebe, vratar in klop, kot pri
odraslih. Kot druge U19: `prvi_fantasy_krog = 2`, `rok_pomak_ur = 2`.
Državne in regijske (nogometna središta HNS: Istok, Centar, Rijeka, Sjever,
Split) imajo zvezo `hns`, županijske in NS zvezo kot lige odraslih.
Primorsko-goranska in Varaždinska imata namesto U19 **U18** — šifra ima vseeno
`u19`, da ju `je_mladinski_slug` prepozna kot mladinski (smoke).

Izpuščeno: Međimurje U-19 (`115953166`, arhiv `101026354`) — stran
tekmovanja 12. 10. vrača HTTP 500 (U-17 iste zveze dela); vpiši, ko se
popravi. Koprivnica "U-17 Kadeti i juniori" (U17), Split NSŽSD (5 klubov),
Dubrovnik (5, nič odigranega), Požega (3), Đakovo (5, 8 na 8), Virovitica
(2026/27 le pokal), HNS pilot "liga ulaznih juniora U-18", pokali (HNK, ŽNS),
futsal, kvalifikacije.

Arhiv je izbran po skupnih klubih; vejica pomeni več lanskih lig (vsaka ima en
sam arhiv). **Brez arhiva**: Centar III. (nova liga, največ 2 skupna kluba),
Rijeka U18 (lani je PGŽ ni imela) in ZŽ I. (lanske 1. lige ni; edini arhiv
`101304947` — 3 od 8 klubov pri obeh — dobi ZŽ II. po imenu). Šibki arhivi:
Karlovac (lani 4 klubi), Sjever, Split II., Istok, ZG II. (4–6 skupnih).

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| hr-u19-1hnl | 16 | `114526424` | `100454960` (12) |
| hr-u19-2nl | 14 | `114771687` | `100540163` (12) |
| hr-u19-2nl-b | 14 | `114771691` | `100540177` (9) |
| hr-u19-1nl-istok | 9 | `114864867` | `100911679` (6, lani Središte Osijek) |
| hr-u19-1nl-centar | 16 | `114975565` | `101044860` (9) |
| hr-u19-2nl-centar | 14 | `114985034` | `101047726` (7) |
| hr-u19-3nl-centar | 9 | `114992787` | — |
| hr-u19-1nl-rijeka | 12 | `115053595` | `101025334` (11) |
| hr-u19-1nl-sjever | 10 | `115344352` | `100732196,100734814` (4 + 5, Prva + Druga) |
| hr-u19-1nl-split | 13 | `116563036` | `101245463` (10) |
| hr-u19-2nl-split | 13 | `116566614` | `101805614` (5) |
| hr-zg-u19-1znl | 14 | `114507628` | `100785503` (10) |
| hr-zg-u19-2znl | 6 | `114507634` | `100785794` (4) |
| hr-bj-u19-sjever | 10 | `114681204` | `100633968` (6) |
| hr-bj-u19-jug | 10 | `115169842` | `100634009` (8) |
| hr-bp-u19 | 8 | `115910901` | `101574772,101579365` (4 + 3, Centar + Istok) |
| hr-is-u19-a | 11 | `115006487` | `100949387` (9) |
| hr-is-u19-b | 8 | `115003917` | `100954626` (6) |
| hr-ka-u19 | 11 | `115466348` | `101150516` (3 od 4) |
| hr-kz-u19 | 11 | `115942754` | `100905225` (6) |
| hr-ri-u19 (U18) | 14 | `115228638` | — |
| hr-sm-u19 | 9 | `115008823` | `101064213` (8) |
| hr-vz-u19 (U18) | 12 | `114799310` | `101887799` (12) |
| hr-vs-u19 | 13 | `114880435` | `100803263,101338736,100671629` (8 + 2 + 2: Liga juniora A, Županja, Vukovar) |
| hr-zz-u19-1liga | 8 | `114786421` | — |
| hr-zz-u19-2liga | 9 | `114786736` | `101304947` (3) |
| hr-ku-u19 | 10 | `114768241` | `100559950` (6) |
| hr-na-u19 | 7 | `114377093` | `100460540` (5) |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=hr-u19-1hnl -f
arhiv=100454960 -f cene=true`; liga brez arhiva brez `arhiv`. Pred uvozom
poženi `node scripts/hrvaske-lige.mjs` za trke imen (mladinske ekipe nosijo
ime kluba) in po uvozu *Grbi klubov* z `vir = hns`.

Klubi se ujemajo le znotraj države vira (`mapaKlubov` po `vir.drzava`):
"NK Polet" ali "NK Mladost" je v Sloveniji in na Hrvaškem drug klub. Ključ
kluba ohrani ć in đ, ki ju slovenski `poenostavi` zavrže — tudi natančno ime
v `mapaKlubov` gre skozi `vir.poenostavi` (prej slovenski: "NK Tomislav (Đ)"
je bil "nk tomislav" in vanj je padel NK Tomislav iz Drnja).

**Isto ime, drug klub.** Semafor istoimenskim klubom večinoma doda oznako
("NK Tomislav (DA)"), ne vedno: "NK Ponikve" je Zagreb in Ston, "NK Polet
(SK)" Sveta Klara in Skrad. Uvoz ju je vpisal v isti zapis (grb, stran
kluba, navijači). `IME_KLUBA` v `hns.mjs` enega preimenuje po šifri kluba
na Semaforju (`data-id` v razporedu; glava strani tekme šifre nima, zato
zapisnik vzame ime iz razporeda). Pregled 9. 10. 2026 je našel sedem
zapisov, migracija `20261011184300` jih je razdelila. `node
scripts/hrvaske-lige.mjs` na koncu izpiše nove trke — dodaj jih v
`IME_KLUBA`, preden ligo uvoziš, in preimenuj le klub, ki v bazi zapisa s
tem imenom še nima.

Vmesnik je v hrvaščini (`src/i18n/hr/`, `JEZIK_DRZAVE.HR`), vstop je
`slff.eu/hr`, kartica ob deljenju `hr.html`, pošta ima hrvaško vejo. Stran
Pozicije je v meniju kot v Sloveniji.

Posebnosti, ki jih je našel pregled pred vklopom (7. 10. 2026):

- **Kontumacija**: Semafor pri 3:0 vnese postavo le ekipe, ki je prišla
  (`jeKontumacija` v `hns.mjs`); razpored tekmo označi in vpiše izid. Tudi
  3:0 z obema postavama, a ena ima manj kot sedem začetnikov in dogodkov ni
  (Suhopolje : Crnac, Crnac s šestimi, 9. 5. 2026) je kontumacija — tekma se
  ni začela; `vZapisnik` zanjo vrne null.
- **Strelec s klopi brez menjave** (ŽNS Zagreb menjav ne vpisuje) dobi nastop
  z goli in kartoni (`dodajStrelceSKlopi` v `zapisnik.mjs`); prej je bil gol
  le v `goals` in točk ni prinesel.
- `appearances.is_goalkeeper` je oznaka vratarja na tisti tekmi (tekme,
  uvožene od 7. 10. 2026 21:07 UTC). *Uskladi pozicije* z `vir = hns` po njej loči prave vratarje od
  enkratnih (Mezga: 1× vratar, 5 golov).
- Nastop v letošnjem zapisniku igralca vrne med aktivne in ga prestavi v klub
  zadnje tekme; arhiv kluba ne prestavlja.
- Kratko ime je v državi enolično (oznaka županije in raven: "MZ I.",
  "VŽ Elitna"), ker stoji brez zveze v roku, rezultatih in zadevi maila.
- 1. ŽNL Karlovac je zapisnike na Semafor začela vnašati (pregled 12. 10. 2026:
  143 tekem s postavami); `hr-ka-1-znl-nskz` je vklopljena.
- **Vklop sredi sezone**: borza neaktivnih lig ne premika; ob vklopu postavi
  `prvi_fantasy_krog` na naslednji krog, da borza starejših krogov ne
  obračuna (začetna cena jih že vsebuje). **Naslednji krog = prvi krog za
  zadnjim krogom z zapisniki**, ne "najnižji krog z rokom v prihodnosti":
  krog s prestavljeno tekmo ima lahko rok čez mesec (Koprivnica, krog 5 z
  rokom 31. 10., 6 in 7 že odigrana; vklop 8. 10. je izbral 5, popravek
  `20261008033100`). Pred vklopom preveri, da noben krog ≥ prvega nima
  zapisnikov.

Beremo odkrito (`User-Agent: SLFF fantasy`, 500 ms med zahtevki,
popolnih zapisnikov ne beremo znova), vir je v nogi vsake strani.

Grbe hrvaških klubov prinese `scripts/grbi-hns.mjs` z glave strani tekme
(`club1` domači, `club2` gostje — po mestu, ne po `alt`; izvirnik namesto
80 px, v `public/grbi/hr-*`) — delovni tok *Grbi klubov* z `vir = hns`,
najprej brez `pisi`, po želji `tekmovanje`. Klub brez grba ima na Semaforju
`logo nologo` brez slike in ostane pri grbu iz začetnic. Načrt (brez
`--pisi`) dela tudi z javnim anon ključem. Po uvozu nove hrvaške lige ga
poženi znova.

### Češka

Vir `facr` (`scripts/viri/facr.mjs`) bere **javni del IS FAČR**
(is.fotbal.cz/public), sistem, v katerem FAČR ter krajske in okrajne zveze
vodijo vsa tekmovanja do IV. třídy. Zapisnik je na vseh ravneh enak: postavi
s številko dresa in **šifro igralca FAČR** (osem števk, → `reg_st`; vodilna
ničla odpade), vratar `B`, menjava, rumeni (dva stolpca) in rdeči z minuto,
strelci v svoji tabeli s tipom (`Branka`, `Pokutový kop`, vlastní). Vrstice
`po1`–`po11` so začetniki, od `po12` klop.

- **Leteče menjave**: nižje lige dovolijo, da gre igralec ven in nazaj. Stolpec
  `Stř.` ima zato dve celici — zaporedni spremembi stanja. `nastopi` v
  `facr.mjs` sešteje minute iz obeh (`minuteIzPreklopov`).
- **Ime kluba iz razporeda**: razpored lahko piše kratko ("Vyškov"), zapisnik
  polno; uvoz vzame ime iz razporeda, sicer bi klub nastal dvakrat.
- Krogi so na strani tekmovanja razvrščeni po datumu, ne po številki
  (prestavljen krog stoji kasneje) — številka pride iz naslova `N. kolo`.

**Dostop.** IS odgovarja le iz EU: GitHubovi tekači (Microsoft, ZDA) ne dobijo
povezave, strežnik SLFF (Hetzner) jo dobi. Zato zahtevki tečejo prek
posrednika na strežniku (`scripts/hetzner/facr-posrednik.sh`, tinyproxy, samo
is.fotbal.cz:443, geslo, omejen CPU in RAM), naslov je skrivnost `FACR_PROXY`.
Uvoz sam teče na GitHubu kot vsi drugi. Vsak zahtevek potrebuje sejo (piškotka
z naslovnice); brez nje IS preusmeri na `/public/?redir=v4` — to ureja
`facrFetch`. **www.fotbal.cz je za Cloudflarovim izzivom: ne beremo ga in ga
ne obhajamo.** Iskanja tekem (CAPTCHA) ne uporabljamo; iskalnik tekmovanj
nam ne vrne ničesar, tudi z izbrano okrajno zvezo.

**Šifra lige je UUID tekmovanja** (`detail-souteze.aspx?req=<UUID>`), isti kot
v naslovu `www.fotbal.cz/souteze/turnaje/hlavni/<UUID>`. Vsaka sezona je svoje
tekmovanje (ročník 2026 = 2026/27), zato se UUID ob novi sezoni vpiše ročno.
Številka tekmovanja `2026211A1A` = ročník, zveza (211 = OFS Benešov), koda.

Vpisanih je 12 lig štirih okrajev (migracija 20261008235100), **neaktivnih**.
Šifre (UUID) so dolge, zato tu le začetek; polne so v migraciji in spodaj za arhiv:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| cz-bn-op / -3a / -3b | `cf517b12…` / `696d3dfb…` / `96b956df…` | `e7520b40-ec17-46dc-a736-f2867ce40991` / `fdf890f1-d213-492f-abf1-6a98b9d76f14` / `797ae0d9-8a48-4626-be4e-fd0a59027e4e` |
| cz-bo-op / -3a / -3b | `640ad2e8…` / `326544ca…` / `65736e4c…` | `7d7f1453-588b-4b39-84e4-5b2c0b65f9f6` / `4cd6a445-1411-4b55-8f77-5013dba9133d` / `5436be6a-adb0-426b-b169-afc31b5641c4` |
| cz-ph-op / -3a / -3b | `e62b1d0c…` / `cda51ba4…` / `e9d912c6…` | `ce6b24c1-1826-48c0-b8c1-404461e5e965` / `de11dd4b-9fd5-49d0-b1f5-785c76601455` / `12d1eb58-8f55-487d-8a25-2eb1758b70c8` |
| cz-pj-op / -3z / -3v | `2065a536…` / `4e322683…` / `3174430a…` | `24c32f84-d385-48a3-a447-7baefbb6873d` / `57b0c3b6-9136-498a-9a8a-3c7f60f8a61e` / `09e86dd4-a53f-4d2f-a3d9-162d93fd5e09` |

Plzeň-jih je imel 2025/26 v III. třídi še nadaljevanje (nadstavba POSTUP
`44ba171d-97fb-431f-b48d-9ad8fd83b932`, UMÍSTĚNÍ `f408f571-7dc4-4cf2-ab96-6c1d1320b5f8`)
z ekipami obeh skupin; za arhiv ga NE uvažamo, ker bi v ligo pripeljal
igralce druge skupine. Seznam tekmovanj okraja je na www.fotbal.cz
(Rozcestník soutěží → kraj → okres, arhiv pod "Archiv").

Beremo odkrito (`User-Agent: SLFF fantasy`, 1 s med zahtevki, zaključenih
zapisnikov ne beremo znova). Dovoljenja FAČR še nimamo.

**USTAVLJENO (8. 10. 2026, 23:03).** Prvi pravi uvoz (cz-bn-op) je padel:
vsak zapisnik zdaj preusmeri na `security-valid.aspx` ("Bezpečnostní ověření
… ověřte že nejste robot", CAPTCHA), tudi tisti, ki se je nekaj ur prej
odprl. To je zaščita pred roboti — **ne obhajaj je** (ne reševanje CAPTCHA,
ne nove seje ali IP-ji, ne brskalnik brez glave). Češke lige ostanejo
neaktivne, nočni uvoz jih zato ne bere. Naprej le z dovoljenjem ali dostopom
FAČR (API, seznam dovoljenih IP-jev); vir, posrednik in lige so pripravljeni.

9. 10. je CAPTCHA izginila (zapisnik spet 200) — verjetno jo je sprožil
tempo (1 s med zahtevki). Vir zdaj čaka **8 s** med stranmi, lige se uvažajo
**ena za drugo**, in ob prvi preusmeritvi na `security-valid.aspx` uvoz
vrže `FacrPreverba` in se ustavi. Če se to zgodi, Češka spet čaka na FAČR.

**Zgodilo se je takoj** (9. 10. ob 00:18): prvi zapisnik prvega uvoza je
spet vrnil CAPTCHO, kljub 8 s premora. Zapora torej ni odvisna od tempa.
**Češka čaka na odgovor FAČR; do takrat k is.fotbal.cz ne pošiljamo NIČESAR**,
tudi posameznih preizkusov ne.

Država `CZ` ("Česko", migracija 20261008233100) ima vmesnik v češčini
(`src/i18n/cs/`, jezik `cs`, `JEZIK_DRZAVE.CZ`), vstop `slff.eu/cz`, kartico
ob deljenju `cz.html` (Caddy jo vrne za `/cz` in `?t=cz-…`), češko vejo pošte
(`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`) in češka imena lastnikov hišnih ekip. **Šifra
češke lige se začne s `cz-`** (koda države, ne jezika), sicer jezik ob
nalaganju ne ve, da gleda Češko. Ugib: brskalnik `cs`, pas `Europe/Prague`.
Stran Pozicije je v meniju kot v Sloveniji in na Hrvaškem (če češki vir
pozicije prinese, jo skrij v `Navbar.tsx` kot za SK). Češkega kanala v
HelpStacku še ni: `Podpora.tsx` za `cs` uporabi slovenskega.

### Nočni uvoz: države in koši

**Nočni uvoz teče po državah, velike države po koših** (matrika `include` v
`.github/workflows/uvoz-zapisnikov.yml`, vsak koš svoj posel; zanka koša je
`scripts/nocni-uvoz.sh`, razdelitev `scripts/nocni-kosi.mjs`). Nova država
mora v matriko, sicer se njene vklopljene lige ponoči ne uvažajo — brez
napake. Število košev države je `KOSOV` v `nocni-kosi.mjs` in ista številka v
matriki (smoke ju primerja): AT 4, HR 3, HU 3, SK 2, RS 2, SI 2, ostale 1.

Zakaj (meritev 11.–13. 10. 2026): posel AT (162 vklopljenih lig, ~4–6 minut
na ligo) je v 240 minutah obdelal 42 lig in GitHub ga je preklical — **vsak
zagon istih 42**, ostalih 120 se ni osvežilo. HR (110) je trajal 2–2,5 ure in
padal na eni ligi (varovalo razporeda "14 klubov, v bazi 15"), SI in SK prav
tako. Preklican ali padel posel `actions/cache` ni shranil predpomnilnika
(shrani le ob uspehu), zato naslednji zagon ni imel odtisov in je znova bral in
uvažal vse zapisnike zadnjih 21 dni ("Nespremenjenih: 0") — začarani krog.
Odtis kode je poleg tega zajel vse datoteke `scripts/viri/`, zato je vsak
popravek kateregakoli vira razveljavil odtise vseh lig.

Kako zdaj:

- **Koš lige** je zgoščenka šifre (stabilna; koš ima svoj predpomnilnik
  `zapisniki-<drzava>-k<kos>od<kosov>-…`). Vir sme brati iz več košev hkrati le,
  če je v `VZPOREDNI` (oefb 4, hns 3, mlsz 3, sportnet 2, fss 2, fssid 2);
  vsi drugi viri (MNZ, nzs, fsb, jalgpall, fcf, fas, facr, hlf, frf, lff, pzpn, ffm)
  so v enem košu. Vir, ki ga bere k košev, v vsakem bere s **k-krat daljšim
  premorom** (`SLFF_PREMOR_FAKTOR` → `prenos.mjs`), zato skupni tempo k viru
  ni večji kot pri enem poslu (mlsz: Crawl-delay 1 s). Hitrost pride iz pisanja
  v bazo, ki teče vzporedno, in iz tega, da počasen odgovor enega posla ne
  čaka drugih.
- **Vrstni red v košu**: najprej lige, ki jih nočni uvoz najdlje ni uspešno
  obdelal (`scripts/.predpomnilnik/nocni-stanje-<drzava>-<kos>.json`).
- **Časovni rok**: po 190 minutah (`ROK_MIN`) koš ne začne nove lige; ostale
  so opozorilo "Zmanjkalo časa" (ne napaka) in pridejo naslednjič prve.
- **Drugi poskus**: liga, ki pade (omrežje, `lock timeout` ob hkratnem pisanju
  dveh košev), dobi na koncu koša še en poskus. Izhod 4 (vir je zavrnil) ustavi
  le lige tega vira v košu.
- **Predpomnilnik se shrani vedno** (`actions/cache/restore` + `save` z
  `if: always()`), tudi ob padcu ali preklicu.
- **Odtis kode** (`scripts/odtis-kode.mjs`) zajame skupne datoteke uvoza in le
  vir lige z datotekami, ki jih uvaža. Prvi zagon po tej spremembi (in vsak
  popravek vira) zapisnike tega vira enkrat uvozi znova.
- **Rezervni cron** `47 6 * * 1-4`: GitHub jutranji zagon kdaj tiho izpusti
  (13. 10. 2026); posel `zacni` rezervo preskoči, če je današnji zagon že tekel.
- Ime posla je `uvoz HU` pri enem košu in `uvoz HU 2/3` pri več;
  `cakaj-na-uvoze.mjs` pri skupnem viru gleda vse posle države.

## Madžarska

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

### Avstrija

Država `AT` ("Österreich", migracija 20261009160000) ima vmesnik v nemščini
(`src/i18n/de/`, jezik `de`, `de-AT`, `JEZIK_DRZAVE.AT`), vstop `slff.eu/at`,
kartico ob deljenju `at.html` (Caddy jo vrne za `/at` in `?t=at-…`), nemško
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Servus") in avstrijska imena lastnikov
hišnih ekip ("Lukas Gruber"). **Šifra avstrijske lige se začne s `at-`.**
Ugib: brskalnik `de-AT` ali pas `Europe/Vienna` — sama nemščina (`de`,
`de-DE`) ni Avstrija, ker je tudi Nemčija in Švica; tujec z nemškim
brskalnikom pa dobi nemščino. Izrazi kot v FPL: Kader, Startelf, Bank,
Kapitän, Vizekapitän, Transfers, `krog` je vedno **Runde**, vratar je
"Tormann", pripomoček `klop_plus` je "Bank+". Ime lige stoji za dvopičjem
("Die Fantasy-Liga ist eröffnet: {liga}"), `ligaVTozilniku` ga pusti. Zveze,
tekmovanja in vir vpiše svoja migracija. Stran Pozicije je v meniju kot v
Sloveniji (če avstrijski vir pozicije prinese, jo skrij v `Navbar.tsx` kot za
SK). Nemškega kanala v HelpStacku še ni: `Podpora.tsx` za `de` uporabi
slovenskega.

### Avstrija — vir `oefb`

Vir `oefb` (`scripts/viri/oefb.mjs`) bere **oefb.at** (Ligen & Bewerbe), kjer
ÖFB in vseh devet deželnih zvez vodijo vsa tekmovanja do najnižje Klasse.
Strani izriše JavaScript, podatki pa so v strani kot JSON
(`SG.container.appPreloads['…']=[{…}];`) — beremo JSON, ne HTML.

- **Šifra lige je id tekmovanja** (Bewerb, `/bewerbe/Bewerb/<id>/`); vsaka
  sezona ima svojega, seznam sezon je na strani tekmovanja (`saisonen`).
- **Razpored** `/bewerbe/Bewerb/Spielplan/<id>/`: `ergebnisse` + `spiele`, vse
  tekme z `runde`, `anstoss` (ms, dunajski čas) in izidom. `Neuaustragung` je
  razveljavljena tekma, ki se ponovi (ponovitev je svoja vrstica, lahko z
  zamenjanim domačinom) — izpustimo jo. **Kontumacija** ima izid in namesto
  zapisnika povezavo `strafverifiziert` (`#`); v arhivih 14 lig pet takih.
  Kot rezerva šteje še 3:0 s prazno postavo po tednu dni.
  oefb.at kdaj za minuto vrne stran razporeda s statusom 200, a brez JSON-a
  razporeda (`appPreloads['NO_DATA']`): nočni uvoz je javljal "Razporeda ni
  bilo mogoče razbrati", uvoz zapisnikov pa tiho 0 tekem (13.–15. 10. 2026).
  `stranRazporeda` jo prebere znova po 30 s in 2 min, nato uvoz pade z
  jasno napako; taka stran ne gre v predpomnilnik (`zaPredpomnilnik`).
- **Zapisnik** `/bewerbe/Spiel/Spielbericht/<id>/`: začetniki v skupinah
  `tor`/`abwehr`/`mittelfeld`/`sturm` ali vsi v `weitere`, klop v `ersatz`,
  šifra igralca iz `/Profile/Spieler/<id>` → `reg_st`. Dogodki: `goal`
  (`eigentor` je pri ekipi strelca, `hinweis: "Strafstoß"` = 11 m),
  `playerchange` (primary noter, secondary ven), `card-yellow`,
  `card-yellow-red` (prvi rumeni je svoj dogodek), `card-red`. Minuta je
  `minuteString` ("67", "HZ" = 45, "90+5" → 90, "SE" = po koncu → 90).
  Kartoni trenerjev (niso v postavi) ne štejejo.
- **Pozicije**: skupine vnese **klub sam**, zato jih ima na isti tekmi ena
  ekipa, druga ne. S skupinami → GK/DEF/MID/FWD iz zapisnika; brez njih je
  vratar le, če ima dres "T" (rezervni "ET") — namig kot pri mlsz, ostali na
  glasovanje. *Uskladi pozicije* z `vir = oefb`.
- **Nastopi gredo po šifri igralca, ne po dresu** (`nastopi` v viru):
  vratar "T" nima številke. Leteče menjave šteje `minuteIzPreklopov`.
- Ime igralca je "Ime Priimek" s poljem `nachname`; uvoz dobi "Priimek Ime".
  Ključ kluba ohrani ä, ö, ü, ß; razpored piše kratko ime, uvoz ga vzame od tam.
- **Isto ime, drug klub.** Kratko ime je ime kraja, zato ima šest krajev
  klub v dveh deželah (Rust, Mannersdorf: Gradiščanska in NÖ; Gmünd: Koroška
  in NÖ; Reichenau, Berg: Koroška in OÖ/NÖ; Pischelsdorf: Štajerska in OÖ).
  `IME_DRUSTVA` v viru preimenuje ekipo po šifri društva
  (`vereine.oefb.at/<društvo>/`) v "Rust (NÖ)" ipd.; koroški in štajerski
  klubi ostanejo, kot so. Pregled 9. 10. 2026 je zajel vseh 153 lig; ob novi
  ligi preveri trke znova in nov trk dodaj tja.

**Kje najti šifre.** Izbirnik zvez in lig na oefb.at kliče javni posrednik
strani (`/proxy/oefb3/1469066385635312874_<ključ>?proxyUrl=<…>`, ključ je
zadnji del poti z `_` namesto `/;=:`) z
`http://portale-datenservice:8080/datenservice/rest/oefb/datenservice/saisonen/<zveza>`,
`…/gruppen/<zveza>;jahr=<leto2>;homepage=1473983024629548524`
in `…/bewerbe/<skupina>;homepage=1473983024629548524;runden=true`
(zveza: BFV `4d5b3b4d93139e5ca7c8`, KFV `07383705631a73ec5a03`, NÖFV
`ed9c2fe8888e641f8e1a`, OÖFV `5faee79882faada18ab2`, SFV
`5ac4e17caa6271317678`, StFV `2b343dd0b84af271a9ea`, TFV
`2597aa11e457ecc97f32`, VFV `83f816954706cd0dff5f`, WFV
`22793f390fce3e915783`; seznam je v strani `/bewerbe/` kot
`appPreloads`). Bundesliga, 2. Liga in Regionallige so v skupinah več zvez.
Stran razporeda nosi tudi `saisonen` (šifre prejšnjih sezon iste lige) in
`verband`; vrstica tekme ima `heimMannschaftUrl` s šifro društva.

**Pravice (pregled 9. 10. 2026, ni pravni nasvet).** robots.txt oefb.at
splošnim robotom `/bewerbe/` dovoli; "Datenbank Crawler" je le ime v skupini
AI-robotov, ne velja za nas. "Datenservice" ni prodaja podatkov, ampak pot
strani tekmovanj. Pogojev uporabe za anonimne obiskovalce ni (Nutzungsbedingungen
veljajo le za prijavo SSO). **Strani KFV in StFV pa z istim zapisnikom
prepovedujejo** (`Disallow: /bewerbe/Spiel/`, `/bewerbe/Spieler/`) — beremo
**samo oefb.at**, nikoli kfv-fussball.at ali stfv.at. Dejstva tekme niso
avtorsko varovana; tveganje je pravica baze (UrhG § 76d, sistematično
izvlečenje) — najverjetneje poziv k prenehanju, ne odškodnina. ÖFB sam objavo
postav utemelji z javnim interesom (Information für Spieler, 26. 4. 2026).
**ÖFB je uporabo dovolil** (odgovor na prošnjo z office@oefb.at, v vednost
KFV in StFV, 9. 10. 2026): podatke iz zapisnikov in grbe klubov. Grbe beremo
z `/oefb2/images/`, ki ga robots.txt splošnim robotom prepoveduje — **samo
zaradi tega dovoljenja**. Avstrija je v živo. **Če ÖFB, KFV ali StFV dovoljenje
umakne ali nas blokira: vse `at-` lige izklopi** (`update competitions set
active = false where slug like 'at-%'`) in nočni uvoz jih ne bere več. Vklop
lige: `vklopi_ligo_sredi_sezone` (prej migracija `…_vklop_at_…`), prvi fantasy krog = prvi krog za zadnjim
krogom z zapisniki, ki ima rok še pred sabo. Pogoji GDPR, ki smo jih obljubili, so urejeni
(glej `players.anonimiziran_at`): obvestilo po čl. 14 z ugovorom igralca na
`/legal`, anonimizacija na zahtevo igralca ali zveze (vse vrstice osebe v državi),
v avstrijskih ligah 18 mesecev po zadnjem nastopu ime skrijemo. **Kako
oefb.at pokaže igralca, ki je pri ÖFB zahteval anonimizacijo, še ne vemo** — v vzorcih ima vsak igralec ime in
`/Profile/Spieler/<id>`. Ko tak primer najdemo (ime brez profila, "anonym"
…), naj ga vir izpusti in uvoz igralca s to šifro anonimizira
(`anonimiziraj_igralca(id, 'ugovor')`); do takrat anonimizacijo ÖFB, ki
nam jo sporočijo, vnese admin. Če prosijo, naj nehamo, ali nas blokirajo — nehamo.
Beremo odkrito (`User-Agent: SLFF fantasy`, 1,5 s med stranmi, popolnih
zapisnikov ne beremo znova). **Če se pojavi izziv ali CAPTCHA, ustavi — ne
obhajaj.** Odziv je počasen (2–7 s na stran): arhiv ene lige je ~20 minut.

Grbe avstrijskih klubov prinese `scripts/grbi-oefb.mjs`: id grba je v
razporedu lige (`heimMannschaftLogo`/`gastMannschaftLogo`, ena stran na ligo,
ime ekipe prek `imeEkipe` kot pri uvozu), slika je
`/oefb2/images/1278650591628556536_<id>-1,0-256x256-256x256.png` (strežnik jo
pomanjša sam), shrani se v `public/grbi/at-*`. To pot robots.txt splošnim
robotom **prepoveduje** — beremo jo **le zaradi izrecnega dovoljenja ÖFB**
(odgovor lastniku, 9. 10. 2026); če ga umaknejo, skripte ne poganjaj več.
Delovni tok *Grbi klubov* z `vir = oefb`, najprej brez `pisi`; brez
`tekmovanje` vse **aktivne** `at-` lige. Po vklopu nove avstrijske lige ga
poženi znova (vzame le klube brez grba).

Preizkus vira na Kärntner Liga 2025/26 (`226828`): 30 krogov, 240 tekem,
0 kontumacij, 240 zapisnikov, 795 golov (= izidi), 480/480 postav po 11,
1695 nastopov s klopi, 0 nastopov brez šifre, 0 opozoril. Skupine je
vneslo okoli pol klubov: vratar je znan v 257 od 480 postav, pozicija v
2834 od 6975 nastopov.

Vpisanih je 14 lig (migracija 20261009170000), **neaktivnih**. Lige so velike
(11–16 klubov), ena arhivska sezona naj zadošča; 2024/25 je za rezervo.
Unterliga Mitte obstaja šele od 2025/26.

| liga | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|
| at-k-kaerntner-liga | `231665` | `226828` | `221445` |
| at-k-unterliga-ost / -mitte / -west | `231652` / `231657` / `231656` | `226819` / `227197` / `226827` | `221449` / — / `221441` |
| at-st-oberliga-mitte-west / -sued-ost / -nord | `231501` / `231521` / `231503` | `226278` / `226272` / `226273` | `221194` / `221178` / `221180` |
| at-st-gebietsliga-mitte / -west / -sued / -ost | `231500` / `231520` / `231523` / `231524` | `226269` / `226283` / `226276` / `226291` | `221200` / `221199` / `221176` / `221182` |
| at-st-gebietsliga-mur / -muerz / -enns | `231502` / `231508` / `231512` | `226281` / `226279` / `226266` | `221191` / `221185` / `221190` |

**Vse ostale lige odraslih** (migracija 20261009230000, 139 lig, vse
**neaktivne**): Bundesliga, 2. Liga, tri Regionallige in vse lige vseh devetih
deželnih zvez do najnižje Klasse. Zveza `oefb` je državna raven (kot `nzs`):
Bundesliga, 2. Liga, Regionalliga Ost, Nord in West. Regionalliga Süd je od
2026/27 razdeljena na koroško (`kfv`) in štajersko (`stfv`).

Pregled 9. 10. 2026 (en zapisnik na ligo, zadnja odigrana tekma z goli):
**vseh 139 ima zapisnik z 11 + 11 začetniki**, klopjo, strelci s šifro in
menjavami — tudi najnižje Klasse in DSG. Nobena liga ni izpuščena zaradi
zapisnikov. Seznam za uvozno verigo je `scripts/avstrija-lige.txt` (`<slug>
<arhivi>`, vrstni red: državna raven, nato po deželah od vrha navzdol).

**Vrsta uvozov** je delovni tok *Uvoz Avstrije (vrsta)* (`uvoz-avstrije.yml`
→ `scripts/vrsta-avstrije.mjs`, vsakih 15 minut, seznam
`scripts/avstrija-vrsta.txt`). Tik je brez spomina: stanje razbere iz zagonov
*Uvoz lige* (naslov `Uvoz lige <slug>`, štejejo tudi ročni) in baze. Hkrati
tečejo največ trije uvozi, **iz vsake deželne zveze en**; državna (`oefb`:
Bundesliga, 2. Liga, Regionalliga) meša dežele in teče sama, in če je na vrsti,
se za njo ne zažene nič. Deželne zveze skoraj nimajo skupnih klubov (izjema:
obe Regionalligi Süd uvozita isti arhiv mešane Regionallige `226374`, `221198`), zato
`cakaj-na-uvoze.mjs` v Avstriji (`LOCENE_ZVEZE` v `scripts/hkratnost.mjs`, enako za RO, RS, HU in od
13. 10. 2026 SK z njihovimi državnimi zvezami) ročna uvoza lig dveh dežel pusti teči hkrati, od 13. 10. 2026
tudi vklopljenih (nočni uvoz jih v koših že piše hkrati; vklopljena liga še vedno čaka na nočni posel svoje
države), ista dežela pa le pri dveh nevklopljenih; hkraten vpis istega novega kluba ujame `klubId`
(23505 → obstoječi klub). Zažene nevklopljene lige brez zagona ali z enim
padcem (z `cene`); po dveh padcih ligo preskoči in javi na Discord. Ligo z
uspelim uvozom poskusi vklopiti vsak tik. Ligo z novim
uspelim uvozom vklopi servisna `vklopi_ligo_sredi_sezone(slug)` (gol brez
nastopa zavrne, prvi krog kot zgoraj, varovalka vklopa; vrne `vklopljena`,
`razlog`, `prvi_krog`, `razlika` izidi − goli) in zažene *Hisne ekipe* (AT)
in *Grbi klubov* (oefb). Zavrnjen vklop se javi enkrat — odloči človek.
**Premor ali konec: delovni tok izklopi** (Actions → Disable workflow); ko
izpiše "Avstrija končana", ga izklopi. Preizkus: `node
scripts/vrsta-avstrije.mjs --suho`. Funkcija je splošna, uporabna za vsako ligo.

Posebnosti:

- **Bundesliga** 2026/27 je `Grunddurchgang` (12 klubov, 22 krogov); po njem
  se razdeli na Meister- in Qualifikationsgruppe, ki sta pri ÖFB **svoji
  tekmovanji z novima šiframa** (glej *Lige z več fazami* spodaj). Arhiv
  2025/26 je vse tri faze: `227113+231372+231373`.
  Rezultati in zapisniki Bundeslige so na oefb.at v istem JSON kot nižje lige
  (preverjeno: krog 7, 20. 9. 2026), zato drugega vira (bundesliga.at) ne
  potrebujemo.
- **Regionalliga Süd** (Koroška 8, Štajerska 8 klubov, 14 krogov) je jesenski
  del; spomladi je nadaljevanje svoje tekmovanje. Lani je bila Regionalliga
  Mitte ena liga brez delitve, zato oblike pomladi še ne poznamo: je pomlad
  skupna liga obeh dežel, jo *Nove faze* javi kot mešano (ročni pregled) —
  pripeti jo pomeni pripeljati štajerske klube v koroško ligo.

**Lige z več fazami.** `source_league_code` vira `oefb` sme našteti več
tekmovanj s `+`: `232246+<meister>+<quali>`. `vrsticeFaz` (viri/oefb.mjs)
prebere vse razporede po vrsti in kroge poznejšega tekmovanja zamakne za
zadnji krog faze, iz katere so prišli njegovi klubi; vzporedni skupini (brez
skupnega kluba) si zato delita številke — Meister- in Qualifikationsgruppe
sta obe kroga 23–32, v enem krogu z enim rokom (najzgodnejša tekma obeh).
Ena šifra deluje kot prej. Play-off za Evropo in Relegation se ne pripneta.
Ista oblika velja za arhiv (`uvoz-lige.yml`, `arhiv`: vejica loči sezone,
`+` faze ene sezone) — brez nje bi arhivska Meistergruppe pristala v krogih
1–10 ob Grunddurchgangu.

Novo fazo javi delovni tok *Preverba podatkov* (dnevni zagon, korak *Nove
faze avstrijskih lig* → `scripts/nova-faza-oefb.mjs`): za vsako aktivno `at-`
ligo poišče njeno skupino pri zvezi (en seznam skupin na zvezo, nato seznami
tekmovanj skupin, dokler ne najde vseh lig) in tekmovanje, ki ga nobena naša
liga ne bere in katerega klubi so vsi iz lige. Na Discord pošlje točen SQL
(`update competitions set source_league_code = '…+…' where slug = '…';`),
baze ne spreminja; brez novosti molči. **Ko javi:** SQL vpiši z migracijo
**pred rokom prvega kroga nove faze** (zaklep zajame le kroge z rokom v
zadnjih 7 dneh), nato naj steče uvoz razporeda (urni ali ročni). Krogi se
dodajo za obstoječimi; `prvi_fantasy_krog`, borza, hišne ekipe in roki se ne
spremenijo. Preizkus na lanski delitvi: `--jahr 2026`.

Delitve v sezoni 2025/26 (pregled vseh skupin odraslih vseh devetih zvez,
9. 10. 2026): le **Bundesliga** (Grunddurchgang `227113` → Meistergruppe
`231372`, Qualifikationsgruppe `231373`) in **Salzburg 2. Klasse Süd**
(Grunddurchgang A `226773` in B `226783` → Oberes Play-Off `229101`, Unteres
`229102`; 2026/27 sta ločeni ligi brez delitve, arhiv ostane Grunddurchgang).
Brez delitve: 2. Liga, vse Regionallige (lani Mitte, Ost, West, Tirol) in vse
deželne lige. Ostalo so Relegation in Play-off (NÖFV `232356` z
Europacup-Playoffom, KFV, OÖFV, SFV, StFV, VFV).

- **Prenovljene lige dobijo arhive vseh lanskih lig, iz katerih so prišli
  vsaj dva kluba** (kot Madžarska): Regionalliga Nord (lani Mitte, West, OÖ
  Liga, Salzburger Liga), West (lani West, Regionalliga Tirol, Eliteliga),
  Süd (lani Mitte in Kärntner Liga / štajerska Landesliga). Tirolska je
  2026/27 vse prenovila (Tiroler Liga, 1. in 2. Landesliga, 1. in 2.
  Gebietsliga po štiri skupine); arhivi po izvoru klubov so v tabeli.
  Vorarlberška 5. Landesklasse je lani imela Oberland in Unterland.
- **Salzburg**: 2. Klasse Süd in Süd/West sta lani imeli Grunddurchgang A in
  B s Play-Offom; arhiv je Grunddurchgang (Play-Off ne, ker meša skupini).
- **DSG** (Diözesansportgemeinschaft, Dunaj) je vzporedna hobi piramida pod
  WFV z istimi zapisniki; vpisana je. DSG 2. Klasse ima le 6 klubov (štirikrat
  vsak z vsakim) — na meji, 3 igralci iz kluba × 5 klubov.
- Lige z ≤ 10 klubi imajo še arhiv 2024/25.
- Nižje lige mešajo prve in druge ekipe (1b, Juniors, "II"); vpisane so, ker
  v njih igrajo prve ekipe.

Izpuščeno: Reserve lige (BFV, KFV, NÖFV …), štajerske `IB Ligen` (IB
MitteWest, IB GLO — druge ekipe), mladinske (U…, Unter …, JHG, OPO/MPO/UPO),
ženske, futsal, pokali, Relegation/Entscheidungsspiel/Play-Off, šolski
turnirji, legende, Salzburger `Reserven`.

| liga | klubov | tekoča 2026/27 | arhiv (2025/26; pri ≤ 10 klubih še 2024/25) |
|---|---|---|---|
| at-bundesliga | 12 | `232246` | `227113+231372+231373` |
| at-2-liga | 16 | `232245` | `227112` |
| at-regionalliga-ost | 16 | `231974` | `226510` |
| at-regionalliga-nord | 15 | `232371` | `226374`, `226774`, `226368`, `226782` |
| at-regionalliga-west | 16 | `232368` | `226774`, `226430`, `226852` |
| at-b-landesliga | 16 | `231975` | `226443` |
| at-b-ii-liga-nord | 14 | `231969` | `226451` |
| at-b-ii-liga-mitte | 17 | `231965` | `226446` |
| at-b-ii-liga-sued | 16 | `231967` | `226448` |
| at-b-1-klasse-nord | 13 | `231971` | `226441` |
| at-b-1-klasse-mitte | 15 | `231964` | `226445` |
| at-b-1-klasse-sued | 16 | `231966` | `226450` |
| at-b-2-klasse-nord | 12 | `231972` | `226444` |
| at-b-2-klasse-sued-a | 10 | `231973` | `226449`, `221805` |
| at-b-2-klasse-sued-b | 12 | `231968` | `226442` |
| at-k-regionalliga-sued | 8 | `231655` | `226374`, `226828`, `221198`, `221445` |
| at-k-1-klasse-west | 15 | `231653` | `226824` |
| at-k-1-klasse-mitte | 14 | `231662` | `226822` |
| at-k-1-klasse-ost | 14 | `231660` | `226829` |
| at-k-2-klasse-a | 12 | `231664` | `226821` |
| at-k-2-klasse-b | 14 | `231658` | `226820` |
| at-k-2-klasse-c | 13 | `231661` | `226830` |
| at-k-2-klasse-d | 14 | `231659` | `226826` |
| at-noe-1-landesliga | 16 | `231756` | `226514` |
| at-noe-2-landesliga-ost | 16 | `231747` | `226499` |
| at-noe-2-landesliga-west | 16 | `231773` | `226502` |
| at-noe-gebietsliga-nord-nordwest | 14 | `231750` | `226512` |
| at-noe-gebietsliga-nordwest-waldviertel | 14 | `231768` | `226519` |
| at-noe-gebietsliga-sued-suedost | 14 | `231779` | `226530` |
| at-noe-gebietsliga-west | 14 | `231771` | `226527` |
| at-noe-1-klasse-nord | 14 | `231754` | `226507` |
| at-noe-1-klasse-nordwest | 14 | `231772` | `226511` |
| at-noe-1-klasse-nordwest-mitte | 14 | `231783` | `226529` |
| at-noe-1-klasse-ost | 16 | `231751` | `226509` |
| at-noe-1-klasse-sued | 14 | `231757` | `226522` |
| at-noe-1-klasse-waldviertel | 14 | `231774` | `226494` |
| at-noe-1-klasse-west | 16 | `231776` | `226504` |
| at-noe-1-klasse-west-mitte | 14 | `231764` | `226516` |
| at-noe-2-klasse-marchfeld | 13 | `231755` | `226515` |
| at-noe-2-klasse-mostviertel | 13 | `231753` | `226518` |
| at-noe-2-klasse-ost | 12 | `231748` | `226517` |
| at-noe-2-klasse-ost-mitte | 12 | `231777` | `226496` |
| at-noe-2-klasse-pulkau-schmidatal | 14 | `231781` | `226505` |
| at-noe-2-klasse-steinfeld | 12 | `231767` | `226506` |
| at-noe-2-klasse-thayatal | 14 | `231749` | `226501` |
| at-noe-2-klasse-traisental | 14 | `231775` | `226489` |
| at-noe-2-klasse-triestingtal | 12 | `231784` | `226528` |
| at-noe-2-klasse-wachau-donau | 12 | `231760` | `226493` |
| at-noe-2-klasse-waldviertel-sued | 13 | `231762` | `226503` |
| at-noe-2-klasse-waldviertel-zentral | 12 | `231763` | `226521` |
| at-noe-2-klasse-wechsel | 12 | `231752` | `226525` |
| at-noe-2-klasse-weinviertel | 13 | `231761` | `226513` |
| at-noe-2-klasse-ybbstal | 14 | `231770` | `226508` |
| at-noe-bezirksklasse-weinviertel | 11 | `231782` | `226523` |
| at-ooe-ooe-liga | 16 | `231619` | `226368` |
| at-ooe-landesliga-ost | 16 | `231629` | `226387` |
| at-ooe-landesliga-west | 16 | `231612` | `226377` |
| at-ooe-bezirksliga-nord | 14 | `231623` | `226391` |
| at-ooe-bezirksliga-ost | 14 | `231610` | `226381` |
| at-ooe-bezirksliga-sued | 14 | `231600` | `226402` |
| at-ooe-bezirksliga-west | 14 | `231631` | `226393` |
| at-ooe-1-klasse-mitte | 14 | `231639` | `226396` |
| at-ooe-1-klasse-mittewest | 14 | `231609` | `226373` |
| at-ooe-1-klasse-nord | 14 | `231635` | `226389` |
| at-ooe-1-klasse-nordost | 14 | `231638` | `226397` |
| at-ooe-1-klasse-nordwest | 14 | `231604` | `226390` |
| at-ooe-1-klasse-ost | 14 | `231617` | `226382` |
| at-ooe-1-klasse-sued | 14 | `231608` | `226371` |
| at-ooe-1-klasse-suedwest | 14 | `231599` | `226398` |
| at-ooe-2-klasse-mitte | 14 | `231602` | `226376` |
| at-ooe-2-klasse-mittewest | 14 | `231626` | `226372` |
| at-ooe-2-klasse-nordmitte | 14 | `231614` | `226399` |
| at-ooe-2-klasse-nordwest | 14 | `231636` | `226386` |
| at-ooe-2-klasse-ost | 13 | `231618` | `226403` |
| at-ooe-2-klasse-sued | 14 | `231606` | `226394` |
| at-ooe-2-klasse-suedwest | 13 | `231605` | `226401` |
| at-ooe-2-klasse-west | 14 | `231633` | `226369` |
| at-ooe-2-klasse-westnord | 14 | `231598` | `226379` |
| at-s-salzburger-liga | 16 | `231808` | `226782` |
| at-s-1-landesliga | 14 | `231816` | `226781` |
| at-s-2-landesliga-nord | 14 | `231807` | `226771` |
| at-s-2-landesliga-sued | 14 | `231810` | `226770` |
| at-s-1-klasse-nord | 14 | `231813` | `226775` |
| at-s-1-klasse-sued | 14 | `231815` | `226776` |
| at-s-2-klasse-nord-a | 10 | `231811` | `226780`, `221323` |
| at-s-2-klasse-nord-b | 8 | `231806` | `226778`, `221321` |
| at-s-2-klasse-sued | 9 | `231814` | `226773`, `221328` |
| at-s-2-klasse-sued-west | 8 | `231819` | `226783`, `222172` |
| at-st-regionalliga-sued | 8 | `231530` | `226374`, `226282`, `221198`, `221195` |
| at-st-landesliga | 16 | `231506` | `226282` |
| at-st-unterliga-mitte | 14 | `231511` | `226294` |
| at-st-unterliga-west | 14 | `231517` | `226271` |
| at-st-unterliga-sued | 14 | `231509` | `226288` |
| at-st-unterliga-ost | 14 | `231516` | `226275` |
| at-st-unterliga-nord-a | 13 | `231518` | `226285` |
| at-st-unterliga-nord-b | 14 | `231515` | `226274` |
| at-st-1-klasse-mitte-a | 12 | `231499` | `226277` |
| at-st-1-klasse-mitte-b | 12 | `231526` | `226293` |
| at-st-1-klasse-west | 11 | `231507` | `226286` |
| at-st-1-klasse-sued-ost-a | 12 | `231513` | `226292` |
| at-st-1-klasse-sued-ost-b | 10 | `231525` | `226268`, `221181` |
| at-st-1-klasse-enns | 8 | `231510` | `226270`, `221188` |
| at-st-1-klasse-mur-muerz-a | 12 | `231505` | `226284` |
| at-st-1-klasse-mur-muerz-b | 12 | `231514` | `226267` |
| at-t-tiroler-liga | 16 | `231687` | `226430`, `226427` |
| at-t-1-landesliga-ost | 15 | `231680` | `226425`, `226427` |
| at-t-1-landesliga-west | 15 | `231689` | `226436`, `226427` |
| at-t-2-landesliga-ost | 14 | `231683` | `226429`, `226425` |
| at-t-2-landesliga-west | 14 | `231682` | `226434`, `226436` |
| at-t-1-gebietsliga-ost | 14 | `231676` | `226423`, `226428`, `226429` |
| at-t-1-gebietsliga-mitte-ost | 14 | `231678` | `226423`, `226428` |
| at-t-1-gebietsliga-mitte-west | 14 | `231693` | `226431`, `226437` |
| at-t-1-gebietsliga-west | 14 | `231694` | `226431`, `226434`, `226437` |
| at-t-2-gebietsliga-ost | 13 | `231695` | `226426` |
| at-t-2-gebietsliga-mitte-ost | 14 | `231696` | `226426`, `226428`, `226432` |
| at-t-2-gebietsliga-mitte-west | 12 | `231697` | `226432` |
| at-t-2-gebietsliga-west | 13 | `231698` | `226424` |
| at-v-eliteliga | 14 | `232055` | `226852` |
| at-v-vorarlbergliga | 14 | `232052` | `226853` |
| at-v-landesliga | 14 | `232051` | `226858` |
| at-v-1-landesklasse | 14 | `232046` | `226860` |
| at-v-2-landesklasse | 14 | `232048` | `226857` |
| at-v-3-landesklasse | 14 | `232056` | `226859` |
| at-v-4-landesklasse | 14 | `232047` | `226851` |
| at-v-5-landesklasse | 14 | `232049` | `226856`, `226855` |
| at-w-stadtliga | 16 | `231940` | `226635` |
| at-w-2-landesliga | 16 | `231867` | `226684` |
| at-w-oberliga-a | 14 | `231846` | `226695` |
| at-w-oberliga-b | 14 | `231885` | `226591` |
| at-w-1-klasse-a | 13 | `231863` | `226633` |
| at-w-1-klasse-b | 14 | `231880` | `226627` |
| at-w-dsg-liga | 12 | `231852` | `226618` |
| at-w-dsg-oberliga-a | 12 | `231915` | `226621` |
| at-w-dsg-oberliga-b | 12 | `231934` | `226646` |
| at-w-dsg-unterliga-a | 12 | `231862` | `226631` |
| at-w-dsg-unterliga-b | 12 | `231884` | `226682` |
| at-w-dsg-1-klasse-a | 11 | `231855` | `226610` |
| at-w-dsg-1-klasse-b | 10 | `231900` | `226615`, `221680` |
| at-w-dsg-2-klasse | 6 | `231899` | `226694`, `221679` |

### Srbija

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

### Srbija — vir `fsb`

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

(`…` = `medjuopstinska-liga`.) **Ni vpisanih**: Prva opštinska liga FSOL
(2026/27) in Opštinska liga Sopot (obe sezoni) imata po dva kluba MLADOST v
isti ligi, stran lige ju ne loči. Trki imen med ligami (10. 10. 2026, kraj
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

### Srbija — vir `fss`

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

### Srbija — vir `fssid`

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

Zveza v izbirniku je regijska (`fsv`, `fsrzs`, `fsris`), organizator je v
tabeli. Datume z vira bereta le `fsv` (VFL) in `fsris` (zone) — ista oblika
kot pri Srpskih ligah. Drugod jih zveze objavljajo v PDF (COMET "Raspored
takmičenja" z datumom, uro in prizoriščem; fsrzs.com ima tak PDF celo za
Srpsko ligo Zapad) ali HTML (fsgkg.org.rs, fsgks.rs), a vir jih še ne bere:
**ocena** — pred vklopom preveri `datum_ocenjen` naslednjih krogov. Zone so
"preliminarni del" (FSRIS: nato play-off in play-out kot svoji tekmovanji).
Uvoz: `gh workflow run uvoz-lige.yml -f liga=rs-zona-drina -f cene=true`;
seznam v vrstnem redu je v PR.

### Srbija — omladinske lige (U19)

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

### Romunija

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

### Romunija — vir `frf`

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

### Romunija — vir `hlf`

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

### Estonija

Država `EE` ("Eesti", migracija 20261011140000) ima vmesnik v estonščini
(`src/i18n/et/`, jezik `et`, `et-EE`, `JEZIK_DRZAVE.EE`), vstop `slff.eu/ee`,
kartico ob deljenju `ee.html` (Caddy jo vrne za `/ee` in `?t=ee-…`), estonsko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Tere") in estonska imena lastnikov hišnih
ekip ("Martin Tamm"). **Šifra estonske lige se začne z `ee-`** (koda države;
jezik je `et`). Ugib: brskalnik `et` ali pas `Europe/Tallinn`. Izrazi:
meeskond, koosseis, algkoosseis, pink, kapten, asekapten, üleminekud,
väravavaht, kaitsja, poolkaitsja, ründaja, edetabel, liigatabel,
resultatiivne sööt, kaart, nullimäng; `krog` je vedno **voor** ("5. voor"),
pripomoček `klop_plus` je "Pink+". Množine one/other (`Intl.PluralRules('et')`);
za številom je samostalnik v delilniku ednine ("3 punkti", "12 mängijat"),
v mestniku/izhodniku pa ednina za obe obliki ("12 meeskonnast"). Estonščina
ima 14 sklonov, zato ime lige **ostane v imenovalniku** in stoji samostojno
za dvopičjem ali v oklepaju ("Fantaasialiiga on avatud: {liga}", "liiga:
{liga}"); `ligaVTozilniku` ga pusti. Tako tudi ime zveze (`{zveza}` v
oklepaju) in klub ("klubi {klub}"). Brez pomišljajev (smoke). Psevdonim v
klepetu ima pridevnik pred samostalnikom ("Sinine Väravavaht 42"). Stran
Pozicije je v meniju kot v Sloveniji. `EE` je v matriki nočnega uvoza.
Manjka še: estonski kanal v HelpStacku (`Podpora.tsx` za `et` uporabi
slovenskega) in **pregled prevoda pri naravnem govorcu**.

**Koledarska sezona.** Estonske lige igrajo od marca do novembra, zato je
sezona leto: `rounds.season = '2026'`, ne `'2026/27'` (arhiv `'2025'`).
Ligo označi `competitions.sezona_koledarska = true` (migracija
20261011140100, privzeto false — obstoječe lige ostanejo pri meji 1. julija).
Tekočo sezono lige da SQL `sezona_lige(liga[, datum])`; nanjo gledata
`stanje_lige` (pripravljenost) in `vklopi_ligo_sredi_sezone`. Uvoz razporeda
oznako izračuna s `sezonaIz(datum, tekmovanje.sezona_koledarska)`
(`scripts/razpored.mjs`; zastavico prebere `scripts/tekmovanje.mjs` s
posebno poizvedbo, da manjkajoč stolpec ne odnese vira), **vir mora v
zapisniku (`z.sezona`) dati isto obliko** (`'2026'`). Hišne ekipe in
*Uskladi pozicije* berejo `sezona_lige` po ligi, preverba podatkov in
zemljevid strani vzameta obe obliki, `competitions_view` nosi
`sezona_koledarska` (Igralci po njej ugane tekočo sezono). Vse ostalo sezono
le primerja ali razvršča in z obliko "2026" deluje brez sprememb. Globalna
`tekoca_sezona()` ostane "2026/27" — nov klic naj bo `sezona_lige(liga)`.
`ovrednoti-igralce --sezona 2025` za arhiv.

### Estonija — vir `jalgpall`

Vir `jalgpall` (`scripts/viri/jalgpall.mjs`) bere **jalgpall.ee** (Eesti
Jalgpalli Liit), kjer EJL objavi vse lige odraslih od Premium liige do IV
liige. HTML iz strežnika, brez izziva. Država `EE`, jezik in koledarska
sezona so opisani zgoraj (`competitions.sezona_koledarska`).

- **Sezona je koledarsko leto** (marec–november): oznaka `"2026"`, ne
  `"2026/27"`. Vir jo zapiše v `z.sezona` iz šifre lige.
- **Šifra lige je `<id lige>/<leto>`** (`52/2026`). Id lige je stalen čez
  sezone, arhiv je isti id z drugim letom (`52/2025`). **Ob novi sezoni se
  popravi le leto** v `source_league_code`. Spodnje lige so bile 2025
  preurejene: II liiga (536), II liiga B (537, 538) in III liiga (548–550)
  imajo le 2025 in 2026; starejše sezone so bile druge lige z drugimi id-ji.
- **Razpored** `/voistlused/<id>/liigad/calendar?season=<leto>`: vsi krogi
  ("N. voor") na eni strani, tekma z datumom ("28.02.2025 19:00", tallinski
  čas → ljubljanski −1 h; lahko prazen), izidom in povezavo
  `/voistlused/protocol/<id>`. Neznano leto stran tiho zamenja s tekočim —
  vir preveri izbrano sezono in se ustavi. Izid brez povezave je tekma,
  katere zapisnik še ni vnesen.
- **Kontumacija** je izid s "+" in "-": `+ : -` (3:0), `- : +` (0:3),
  `- : -` (obe, brez izida — klub je izstopil, Piraaja 2026), `4 : -` (tekma,
  razveljavljena eni ekipi — Maardu je izstopil iz Esiliige 2026). Zapisnik
  kontumacije se ne uvaža (je prazen ali razveljavljen).
- **Zapisnik**: "Põhikoosseis" in "Vahetusmängijad" (`ul.left` domači,
  `ul.right` gostje), dres, **stalna šifra osebe** (`/voistlused/player/<id>`
  → `reg_st`), "(VV)" vratar, "(K)" kapetan. Časovnica "Mängu sündmused" z
  minuto: gol, 11 m (`penalty football`), avtogol (`goal red football`, po
  legendi strani "Omavärav"; stanje po golu je le preverba z opozorilom),
  zgrešena in ubranjena 11-metrovka, rumeni in rdeči karton, menjava (prvi
  noter, drugi ven), **`football var` = gol, ki ga je razveljavil VAR (ne
  šteje)**. Drugi rumeni je v zapisniku rumeni + rdeči ob isti minuti
  ("Teise hoiatuse saamine"); vir rumenega odstrani, da je kot pri drugih
  virih 1 rumeni + 1 rdeči. Dogodek brez minute je opozorilo.
- **Šifra zapisnika v bazi je `ee<id>`** (`sifraZapisnika`): številke
  jalgpall.ee (127xxx–143xxx) se prekrivajo s šiframi starega CMS-a (MNZ,
  100049–161136), `matches.zapisnik_id` pa je enoličen čez vse vire. Naslov
  (`naslovZapisnika`) predpono odreže; `--zapisnik` uvoza vzame `ee…`.
  Asistenca je pri golu, a je ne uvažamo (asistence določi glasovanje).
  Ime je "Ime Priimek" → uvoz dobi "Priimek Ime" (`vPriimekIme`, priimek je
  zadnja beseda; igralca prepoznamo po šifri).
- **Pozicije**: postavitev (`lineup-layout`) da pozicijo vsakega začetnika
  ("Väravavaht" GK, "…poolkaitsja" MID, "…kaitsja" DEF, "…ründaja" FWD).
  Vnese jo klub, zato je ima ena ekipa, druga ne: Premium liiga, Esiliiga in
  Esiliiga B skoraj vedno, nižje lige okoli polovice ekip. Brez nje je znan le
  vratar; ostali na glasovanje. *Uskladi pozicije* z `vir = jalgpall` (vratar
  po večini tekem).
- Klubi: ključ ohrani õ, ä, ö, ü, š, ž; rezervne ekipe ("Tallinna FC Flora
  U21") so svoj klub. Kratko ime brez oblike in kraja ("Tallinna FC Flora" →
  "Flora").

**Pravice (pregled 10. 10. 2026, ni pravni nasvet).** robots.txt splošnim
robotom dovoli vse razen `/otsing`, `/errors/` in `/ejl/staadionid/…`, s
**`Crawl-Delay: 5`** — vir čaka 5 s med zahtevki. Fragmente `ajax.php` je zveza
zaprla enemu robotu (FutisBot) kot "podatkovni tok" — **ne beremo jih**, vse je
na straneh. Pogojev uporabe ni; stran ima le pravilnik o zasebnosti
(`/ejl/tingimused-ja-pohimotted`: podatke o tekmah EJL objavlja na podlagi
licenčne pogodbe z igralci, "võidakse avalikustada kodulehel või meedias") in
nogo "Kõik õigused kaitstud". Dovoljenja EJL še nimamo. Datuma rojstva ne
beremo. Beremo odkrito (User-Agent SLFF, zapisnikov, starejših od tedna, ne
beremo znova). **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne
obhajaj**: vir vrže `JalgpallZavrnitev`, uvoz razporeda tedaj NE vzame
shranjene strani, izziv ne gre v predpomnilnik, skripta konča z izhodom 4 in
nočna zanka Estonije (`uvoz-zapisnikov.yml`) ostalih lig ne bere več.
**Proračun branja je skupen**: `cakaj-na-uvoze.mjs` (`SKUPEN_VIR`) za EE
križa vsak zagon iste države — nočni, ročni (tudi nevklopljene lige) in
*Grbi klubov* z `vir = jalgpall` (čaka na prej začete uvoze; run-name
`Grbi klubov <vir>`), da dva zagona ne bereta hkrati. Če nas EJL prosi, naj
nehamo, `ee-` lige izklopimo.

Grbe prinese `scripts/grbi-jalgpall.mjs` z glave zapisnika (`/images/clubs/…`,
`/images/logos/…`; robots.txt slike dovoli; SVG preskoči, ob 403/429 se
ustavi) — delovni tok *Grbi klubov* z `vir = jalgpall`, najprej brez `pisi`.

Seznam lig in preizkus:

```bash
node scripts/eesti-lige.mjs                      # lige 2026 s številom klubov, krogov, zapisnikov
node scripts/eesti-lige.mjs --leto 2025 --preveri
node scripts/eesti-lige.mjs --polno 52/2025      # vsi zapisniki ene lige
```

Preizkus vira na Premium liigi 2025 (`52/2025`): 36 krogov, 180 tekem,
0 kontumacij, 180 zapisnikov, 572 golov (= izidi), 360/360 postav po 11 z
enim vratarjem, pozicija pri 3960/3960 začetnikih, 5387 nastopov (1427 s
klopi), vsi s šifro, 0 opozoril.

Vpisanih je 11 lig (migracija 20261011180000), **neaktivnih**, zveza `ejl`.
Sezona 2026 je ob vpisu skoraj končana (Premium 30. od 36 krogov, nižje lige
končane) — vklop bo realno za 2027, takrat leto v šifri popravi na 2027.

| liga | klubov | tekoča | arhiv |
|---|---|---|---|
| ee-premium-liiga | 10 | `52/2026` | `52/2025`, `52/2024` |
| ee-esiliiga | 10 | `53/2026` | `53/2025`, `53/2024` |
| ee-esiliiga-b | 10 | `186/2026` | `186/2025`, `186/2024` |
| ee-ii-liiga | 16 | `536/2026` | `536/2025` |
| ee-ii-liiga-b-pohi-laas | 14 | `537/2026` | `537/2025` |
| ee-ii-liiga-b-louna-ida | 14 | `538/2026` | `538/2025` |
| ee-iii-liiga-pohi-laas | 12 | `549/2026` | `549/2025` |
| ee-iii-liiga-pohi-ida | 10 | `548/2026` | `548/2025` |
| ee-iii-liiga-louna-ida | 11 | `550/2026` | `550/2025` |
| ee-iv-liiga-pohja-ida | 8 | `267/2026` | `267/2025`, `267/2024` |
| ee-iv-liiga-pohja-laane | 7 | `268/2026` | `268/2025`, `268/2024` |

Izpuščeno: kvalifikacije (üleminekumängud: Premium 283, II liiga 281, II
liiga B 560), zaključni turnirji (III liiga võitja 180, II B võitja 559, IV
liiga võitja 181), Rahvaliiga (rekreativni sistem s prijavo, ne zapisniki
EJL), ženske, mladinske, futsal, pesek, pokali in zimski turnirji.

Uvoz (ena za drugo): `gh workflow
run uvoz-lige.yml -f liga=ee-premium-liiga -f arhiv=52/2025,52/2024 -f
cene=true`. Arhiv 180 zapisnikov po 5 s in več je okoli 20 minut na sezono.

### Latvija

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


### Latvija — vir `lff`

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

### Poljska

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

### Poljska — vir `pzpn`

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

### Poljska — vir `wmzpn` (Warmińsko-Mazurski ZPN)

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

Vpisanih je 12 lig (migracija 20261015162900), **neaktivnih**, zveza `wmzpn`.
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

### Španija

Država `ES` ("España", migracija 20261012040000) ima vmesnik v španščini
(`src/i18n/es/`, jezik `es`, `es-ES`: "3 oct", decimalna vejica, cena
"13,2 M€"; `JEZIK_DRZAVE.ES`), vstop `slff.eu/es`, kartico ob deljenju
`es.html` (Caddy jo vrne za `/es` in `?t=es-…`, tudi na `:3201`), špansko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "¡Hola!") in španska imena lastnikov
hišnih ekip ("Javier García"). **Šifra španske lige se začne z `es-`.**
Ugib: brskalnik `es` (gola oznaka), `es-ES`, `ca-ES`, `gl-ES`, `eu-ES` ali
pas `Europe/Madrid`, `Atlantic/Canary`, `Africa/Ceuta`. **`es-MX`, `es-419`,
`es-AR` … niso Španija** (kot `de` ni Avstrija): v `DRZAVE` je zato `=es`,
oznaka z `=`, ki velja le natanko. Tujec s katerokoli španščino dobi španski
vmesnik (`jezikTujca`). Sezona kot v Sloveniji (avgust–junij), ne koledarska.
Izrazi kot v LaLiga Fantasy in Biwenger, oblika "tú": equipo, plantilla (15),
once inicial / titulares, banquillo, suplentes, capitán, vicecapitán,
fichajes, mercado, presupuesto, portero, defensa, centrocampista, delantero,
clasificación, asistencia, tarjeta, portería a cero, puntos, miniliga;
`krog` je vedno **jornada** ("Jornada 5"), pripomoček `klop_plus` je
"Banquillo+", poznavalec je "experto". Množine one/many/other
(`Intl.PluralRules('es')`): `one` 1, `many` celi milijoni (1.000.000),
`other` vse ostalo, tudi 0 in decimalke ("1,5 puntos"); `many` je zato
enak `other`. Španščina ne sklanja, a člen pred imenom lige je odvisen od
imena ("la Primera Regional", "el Grupo 3"), zato ime lige stoji samostojno
za dvopičjem ali v oklepaju ("Liga fantasy abierta: {liga}", "liga:
{liga}"); `ligaVTozilniku` ga pusti. Psevdonim v klepetu ima pridevnik za
samostalnikom ("Portero Azul 42", vsi samostalniki moškega spola). Stran
Pozicije je v meniju kot v Sloveniji. `ES` je v matriki nočnega uvoza.
Zveze, tekmovanja in vir vpiše svoja migracija. Manjka še: španski kanal v
HelpStacku (`Podpora.tsx` za `es` uporabi slovenskega) in **pregled
prevoda pri naravnem govorcu**.

### Španija — vir `fcf` (Katalonija)

Vir `fcf` (`scripts/viri/fcf.mjs`) bere **fcf.cat** (Federació Catalana de
Futbol), ki objavi vsa katalonska tekmovanja od Lliga Elit do Quarta
Catalana. Stran je Next.js: **strani tekmovanj, skupin, klubov in ekip si
podatke naloži brskalnik iz `/api/`, ki ga robots.txt prepoveduje — `/api/`
(in `/_next/`) ne kličemo nikoli.** Strežnik pa izriše **zapisnik**
`/ca/competicio/acta/<id>` (robots.txt ga dovoli): v strani je drevo React
Server Components (`self.__next_f.push`), ki ga `drevoRsc` sestavi
(sklici `$<id>`/`$L<id>`, besedilne vrstice `T`), ostalo bere po elementih.
Šifra lige se začne z `es-`.

- **Šifra lige je blok šifer zapisnikov `<od>-<do>`** (kot `fssid`). Skupina
  ene sezone je strnjen blok, urejen po krogih (8 mest na krog pri 15 ali 16
  klubih; pri lihem številu je prosto mesto "Acta no trobada" ali tekma "vs
  undefined"). **Zapisnik obstaja tudi za neodigrano tekmo** ("Pendent") — z
  datumom, uro in krogom, zato je razpored kar blok zapisnikov in datumov ni
  treba ocenjevati. Vsaka stran nosi tekmovanje, skupino, krog in sezono;
  stran druge skupine v bloku vir izpusti z opozorilom. Blok in sosednje
  bloke najde `scripts/catalanske-lige.mjs` iz ene šifre (bisekcija mej).
  Nova sezona = nov blok; seme poišči v bližini lanskega bloka ali na strani
  kluba v brskalniku (povezave na akte so v strani, ki jo izriše brskalnik).
- **Glava**: domači, oznaka ("Acta Tancada" = zaprt, "Pendent", "SUSPÈS",
  "AJORNAT"), izid ("1 - 3"; neodigrana "- - -"), drobtine "QUARTA CATALANA /
  GRUP 1 / Jornada 1", "Temporada : 2026 / 27", "Data: 19.09.2026", "Hora:
  17.00 H" — **madridski čas = ljubljanski**, brez pretvorbe. Polčasa ni.
- **Ekipi** (`localNode`, `visitorNode`): "Alineacions" (začetniki) in
  "Suplents" (klop); igralec je predmet `{ id, nombre, dorsal, titular,
  capitan, portero }` — `id` je stalna šifra osebe FCF (→ `reg_st`),
  `portero` vratar (tudi rezervni, → GK), `capitan` kapetan. Ime "PRIIMKA,
  IME" → "Priimka Ime" (`imeIgralca`, male črke z veliko začetnico; "de",
  "la", "i" ostanejo mali); nekateri igralci imajo le vzdevek ("AITOR").
- **Dogodki** so ob igralcu: minuta ("35’", "90+3’" → 90) in ikona na stalnem
  mestu — žoga (gol), rumeni (`#FFEB3B`), rdeči/drugi rumeni, vstop (modra
  puščica `#0068A9`) in izstop (rdeča puščica). Vrsto gola (GOL, GOL PENAL,
  GOL EN PRÒPIA) in strelca da razdelek "Gols" s stanjem po golu; avtogol je
  pri strelcu v njegovi ekipi in šteje nasprotniku (stanje to preveri).
  Rdečega kartona v vzorcih še ni bilo — razbiranje po barvi je
  nepreverjeno (`neznan dogodek` v opozorilih, če ikona ni znana).
- **Menjave**: v nižjih ligah jih klubi **ne vpišejo** (Quarta Catalana grup
  1 2026/27: nobena ekipa nobene). Takrat ima začetnik 90 minut, rezerva brez
  vpisanega vstopa pa nastopa nima (kot `fsb`) — minute začetnikov so
  precenjene, ekipa ima lahko čez 990 minut. Strelec s klopi dobi vstop ob
  golu (opozorilo). `z.brezMenjav` pove, katera ekipa menjav ni vpisala.
  Od Lliga Elit do Tercera Catalana jih vpisujejo vse ekipe (pregled 12. 10.
  2026, 990 minut na ekipo), Quarta nobena.
- **Šifra zapisnika v bazi je `es<id>`** (`sifraZapisnika`): številke fcf.cat
  (3,7–4,2 milijona) se prekrivajo s šiframi oefb, `matches.zapisnik_id` pa je
  enoličen čez vse vire. `--zapisnik` uvoza vzame `es…`.
- **Nepopoln zapisnik** (ekipa z manj kot 7 začetniki) kot pri `frf`: izid se
  zapiše, `imported_at` ostane prazen, 45 dni se bere znova. Kontumacija: izid
  brez obeh postav, starejši od tedna. Tekma z izidom, ki še ni "Tancada", se
  bere vsako uro do 45 dni.
- **Predpomnilnik** (`scripts/.predpomnilnik/fcf`): odigrana zaprta tekma se
  ne bere znova (razen prve 3 dni ob uvozu zapisnikov), neodigrana, ko je na
  vrsti (od dneva pred datumom do 14 dni po njem vsako uro, nato dnevno),
  sicer enkrat na teden; "no trobada" enkrat na teden. Prvi uvoz bloka
  prebere vseh ~240 strani — **strežnik je počasen** (stran 0,4 MB, v
  preizkusu 5–20 s na zahtevek s 3 s premora), zato je prvi uvoz skupine
  ~1 ura. Vse lige bere en gostitelj: `cakaj-na-uvoze.mjs` ima ES v
  `SKUPEN_VIR`, zagoni Španije se ne prekrivajo.
- Klubi: ključ brez diakritike in ločil, **z obliko** ("ROSES, A.E." in "BASE
  ROSES, C.F." sta dva kluba); kratko ime je del pred vejico brez oblike
  ("Roses", "Sant Llorenç de la Muga"). Druge ekipe ("…, B") so svoj klub.
- *Uskladi pozicije* z `vir = fcf` (vratar po večini tekem); ostale pozicije
  na glasovanje.

**Pravice (pregled 11. 10. 2026, ni pravni nasvet).** robots.txt dovoli vse
razen `/api/`, `/_next/` in iskanja; zapisniki so dovoljeni. Pravno obvestilo
(Avís legal) prepoveduje reprodukcijo vsebin **"amb finalitats comercials"**
brez dovoljenja FCF. SLFF je brezplačen in nekomercialen; **FCF smo obvestili
oziroma prosili za soglasje** — do odgovora so lige **neaktivne**. Navedba
vira (`vir_ime` FCF, `vir_url` → fcf.cat) je v nogi. Beremo odkrito
(User-Agent `SLFF fantasy (slff.eu; splih.94@gmail.com)`, **3 s** med
zahtevki). Sodnikov, osebja (Equip Tècnic) in igrišča ne beremo; vzorci
`scripts/vzorci/es-fcf-*` so brez njih (repo je javen). **Ob izzivu, CAPTCHI,
403 ali 429 se uvoz ustavi — ne obhajaj** (`FcfZavrnitev`, izhod 4). Če nas
FCF prosi, naj nehamo, `es-` lige izklopimo.

Seznam blokov in preizkus:

```bash
node scripts/catalanske-lige.mjs 4139543                    # blok skupine iz enega zapisnika
node scripts/catalanske-lige.mjs 4139543 --naprej 3 --preveri   # + sosednji bloki, zadnji odigrani krog
node scripts/catalanske-lige.mjs --polno 4139542-4139779    # ves blok, kot ga bere uvoz (brez baze)
```

Preizkus v živo (11. 10. 2026, brez pisanja v bazo) na Quarta Catalana grup 1
2026/27 (`4139542-4139779`): 30 krogov, 210 tekem (vse z uro), 15 klubov,
28 "no trobada" (prosto mesto vsakega kroga), 0 tujih strani; 16 odigranih,
16 zapisnikov, vsi polni (11 + 11, vratar pri vseh 32 postavah), goli = izid
16/16 (82), 0 kontumacij, 1 avtogol, 2 gola z 11 m, 1 rdeči karton, 81
rumenih. **Nobena ekipa ni vpisala menjav** (32/32): 990 minut ima 19 ekip,
12 več (strelec s klopi dobi vstop ob golu — 15 takih opozoril), 1 manj
(rdeči karton). 367 nastopov (15 s klopi), vsi s šifro. Preverjeni so še
zapisniki 1. in 30. kroga Primera Catalana 2025/26 (menjave vpisane, 990
minut) in Quarta grup 2 2025/26. Med preizkusom je strežnik večkrat
odgovarjal po 20–60 s; telo strani zato bere `fcfFetch` (90 s, ponovitev).
Rdeči karton je `div` z `bg-[#F30000]` na 3. mestu; avtogol je žoga z
rdečimi pikami (ne rdeči karton). **Drugi rumeni in gol z 11 m v vrstici
igralca še nista videna kot ikona** — vrsta gola pride iz razdelka "Gols".

Vpisane so 4 skupine Quarta (migracija 20261012080000) in 29 skupin višjih
lig (migracija 20261013090000), vse **neaktivne**, zveza `fcf`.

**Pregled blokov 2026/27** (12. 10. 2026, ~450 zahtevkov po 3 s): bloki
tekmovanj ležijo v dveh skupinah šifer. `4106968-4110837`: Lliga Elit (en
blok), za njim prijateljske tekme državnih lig, nato Primera grup 1–3 in
Segona grup 1–6 zaporedoma. `4114505-4119737`: Tercera grup 1–17, pomešane s
futsalom in ženskimi Preferent ter posameznimi prijateljskimi tekmami
(Tercera grup 18 ni; vrzel `4114985-4115227` je prazna). Quarta je pri
`4137000-4140864` (grup 4 in 5 med grup 3 in 6, po 182 šifer). Vsi bloki
višjih lig imajo 30 krogov po 8 mest (240 šifer), 15–16 klubov.

**Postave in menjave**: 1. krog vseh 29 skupin in dve tekmi 4. kroga vsake
(Quarta 4 in 5 še nimata 4. kroga): **vse postave 11 + 11**. Od Lliga Elit do
Tercera **vse ekipe vpisujejo menjave** (minuta vstopa in izstopa); Quarta
grup 4 in 5 (kot 1–6) **nobena**.

| liga | klubov | tekoča 2026/27 | menjave | arhiv 2025/26 |
|---|---|---|---|---|
| es-ct-elit | 16 | `4106968-4107207` | da | — (TODO) |
| es-ct-primera-g1 | 16 | `4108646-4108885` | da | — (TODO) |
| es-ct-primera-g2 | 16 | `4108886-4109125` | da | — (TODO) |
| es-ct-primera-g3 | 15–16 | `4109126-4109365` | da | — (TODO) |
| es-ct-segona-g1 | 16 | `4109388-4109627` | da | — (TODO) |
| es-ct-segona-g2 | 16 | `4109630-4109869` | da | — (TODO) |
| es-ct-segona-g3 | 16 | `4109870-4110109` | da | — (TODO) |
| es-ct-segona-g4 | 16 | `4110110-4110349` | da | — (TODO) |
| es-ct-segona-g5 | 16 | `4110354-4110593` | da | — (TODO) |
| es-ct-segona-g6 | 16 | `4110598-4110837` | da | — (TODO) |
| es-ct-tercera-g1 | 16 | `4115948-4116187` | da | — (TODO) |
| es-ct-tercera-g2 | 15–16 | `4116188-4116427` | da | — (TODO) |
| es-ct-tercera-g3 | 15–16 | `4116428-4116667` | da | — (TODO) |
| es-ct-tercera-g4 | 15–16 | `4115228-4115467` | da | — (TODO) |
| es-ct-tercera-g5 | 16 | `4115468-4115707` | da | — (TODO) |
| es-ct-tercera-g6 | 16 | `4116668-4116907` | da | — (TODO) |
| es-ct-tercera-g7 | 16 | `4116908-4117147` | da | — (TODO) |
| es-ct-tercera-g8 | 16 | `4117389-4117628` | da | — (TODO) |
| es-ct-tercera-g9 | 16 | `4118349-4118588` | da | — (TODO) |
| es-ct-tercera-g10 | 16 | `4119498-4119737` | da | — (TODO) |
| es-ct-tercera-g11 | 16 | `4118591-4118830` | da | — (TODO) |
| es-ct-tercera-g12 | 16 | `4118835-4119074` | da | — (TODO) |
| es-ct-tercera-g13 | 16 | `4119076-4119315` | da | — (TODO) |
| es-ct-tercera-g14 | 16 | `4117629-4117868` | da | — (TODO) |
| es-ct-tercera-g15 | 16 | `4117869-4118108` | da | — (TODO) |
| es-ct-tercera-g16 | 16 | `4114505-4114744` | da | — (TODO) |
| es-ct-tercera-g17 | 16 | `4114745-4114984` | da | — (TODO) |
| es-ct-quarta-g1 | 15 | `4139542-4139779` | ne | — (TODO) |
| es-ct-quarta-g2 | 15–16 | `4139781-4140020` | ne | — (TODO; zapisnik `3788226` je v bloku grup 2 2025/26) |
| es-ct-quarta-g3 | 15–16 | `4140021-4140260` | ne | — (TODO) |
| es-ct-quarta-g4 | 14 | `4140261-4140442` | ne | — (TODO) |
| es-ct-quarta-g5 | 14 | `4140443-4140624` | ne | — (TODO) |
| es-ct-quarta-g6 | 15–16 | `4140625-4140864` | ne | — (TODO) |
| es-ct-quarta-g7 | 16 | `4145911-4146150` | ne | — (TODO) |
| es-ct-quarta-g8 | 16 | `4146151-4146390` | ne | — (TODO) |
| es-ct-quarta-g10 | 16 | `4146631-4146870` | ne | — (TODO) |
| es-ct-quarta-g13 | 16 | `4147351-4147590` | ne | — (TODO) |
| es-ct-quarta-g14 | 16 | `4147593-4147832` | ne | — (TODO) |
| es-ct-quarta-g16 | 16 | `4148075-4148313` | ne | — (TODO) |
| es-ct-quarta-g17 | 16 | `4148315-4148554` | ne | — (TODO) |
| es-ct-quarta-g18 | 16 | `4148555-4148794` | ne | — (TODO) |
| es-ct-quarta-g19 | 16 | `4148795-4149034` | ne | — (TODO) |
| es-ct-quarta-g20 | 16 | `4149035-4149274` | ne | — (TODO) |
| es-ct-quarta-g21 | 16 | `4149275-4149513` | ne | — (TODO) |
| es-ct-quarta-g22 | 16 | `4149516-4149755` | ne | — (TODO) |
| es-ct-quarta-g23 | 16 | `4149756-4149995` | ne | — (TODO) |
| es-ct-quarta-g32 | 12 | `4136953-4137084` | ne | — (TODO) |

**Quarta grup 7+** (pregled 13.–14. 10. 2026, migracija 20261014093100): grup
7–23 ležijo strnjeno v `4145911-4149995` (po 240 šifer, 30 krogov, 16 klubov,
urejeni po številki skupine; pred grup 7 je vrzel), grup 24 se začne pri
`4149996` (grup 24 je tudi `4150000`). Grup 32–34 so pri `4136689-4137084`
(22 krogov po 6 mest, 12 klubov; grup 33 `4136821-4136952` in 34
`4136689-4136820` ležita pred grup 32, za njo je Primera Femení Juvenil).
Tekma grup 26 pri `4117388` je posamezna (okoli nje Preferent Femení
Infantil). Postave vpisanih skupin so preverjene na 3 odigranih tekmah
(11 + 11, vratar pri vseh); Quarta menjav ne vpisuje (grup 7: ena ekipa jih je).

**TODO**: grup 9 (`4146391-4146630`), 11 (`4146871-4147110`), 12
(`4147111-4147350`) in 15 (`4147835-4148074`) — bloki najdeni, a prva tekma
bloka ni odigrana, zato postave niso preverjene (`node
scripts/catalanske-lige.mjs <od> --preveri`); grup 33 in 34 — še brez
odigrane tekme; grup 24–31 — nepregledano (strežnik je ponoči obstal), seme
`4149996`, nadaljuj z `node scripts/catalanske-lige.mjs 4150000 --naprej 8
--preveri`.

Uvoz (ena za drugo, **šele s soglasjem FCF**): `gh workflow run uvoz-lige.yml
-f liga=es-ct-quarta-g1 -f cene=true` (z arhivom: `-f arhiv=<blok 2025/26>`).
Prvi uvoz bloka je ~240 strani — ob počasnem strežniku do ene ure.

### Španija — vir `fas` (Asturija)

Vir `fas` (`scripts/viri/fas.mjs`) bere **futbolasturiano.es**, neodvisen
digitalni dnevnik asturijskega nogometa (WordPress + SportsPress, Grupo
Tyclamata), **ne zveze**. Postave objavlja za **Tercera Federación, skupina 2**
(asturijski klubi) in **Primera AsturFútbol**; nižje asturijske lige (2ª, 3ª
AsturFútbol) imajo le izide — ne beremo jih. REST `sportspress/v2` je
izklopljen; beremo HTML.

- **Šifra lige je `<liga>:<od>-<do>`**: `<liga>` je izraz SportsPress
  `sp_league` (stran `/competicion/<liga>/`: `3-rfef`, `1-asturfutbol`),
  `<od>-<do>` blok šifer objav (post id) tekem **ene sezone**. Razpored sezone
  je ustvarjen naenkrat, zato je blok strnjen in natanko N×(N−1) šifer (18
  klubov: 306, 20 klubov: 380), po dve in dve (krog n in povratni krog).
  Stran lige našteje tekme vseh sezon z `sp_league-…` `sp_season-2026-2027`,
  datumom in uro (`<time datetime>`); **tekme s stanjem "future" (bližnji
  krog, ki mu je uredništvo popravilo uro) na strani lige in v zemljevidu
  strani manjkajo** — zato blok, ne seznam: manjkajoče šifre vir prebere s
  `/?p=<id>` (preusmeri na stran tekme). Pomočnik: `node
  scripts/asturijske-lige.mjs` (lige, sezone, blok, koliko manjka na strani
  lige), `--polno <šifra>` (ves blok kot uvoz, brez baze), `--vzorec <id>
  <datoteka>` (obrezana stran za `scripts/vzorci/`). Nova sezona = nov blok
  (poženi pomočnika, ko je razpored objavljen).
- **Stran tekme** `/evento/<domači>-<gostje>/`: imeni (`sp-team-name` = ime
  objave ekipe; isto na vseh tekmah ekipe, zato brez vzdevkov — razen
  tipkarske "EI San Martín" → "El San Martín", `IME_EKIPE`), izid
  (`sp-team-result`, neodigrana brez števk), "Detalles": Fecha, Hora
  (**madridski = ljubljanski čas**), Liga ("3ª RFEF", "1ª AsturFútbol"),
  Temporada ("2026/2027" → `2026/27`), **Jornada** (krog). Krog in klubi
  tekme se ne menjajo, zato se stran neodigrane tekme bere enkrat na 14 dni
  (datum da sveža stran lige), od dneva pred tekmo vsako uro.
- **Postavi** (`fa-convocatoria`): vrstica `fa-conv__row` = začetnik,
  `--entra` = vstopil, `--convocado` = neuporabljena rezerva; dres, ime s
  povezavo `/jugador/<slug>/`, pozicija ("Portero" → GK, branilci DEF,
  vezisti in **krila (Extremo) MID**, "Delantero" FWD; "—" brez) in ocena
  (ne beremo). **Identiteta igralca je pot profila**: `regSt` =
  `sifraIgralca(slug)` (FNV-1a, 50 bitov + 2^52 — nad šiframi oseb FCF v isti
  državi). Dva igralca z istim dresom na isti tekmi (Sporting Atlético: 14
  in 14) loči šifra.
- **Dogodki** po prikaznem imenu (brez povezave) v razdelkih GOLES (oznaka
  `sp-res__gol-badge--penalti` = 11 m, `--propia` = avtogol, stolpec ekipe
  strelca, šteje nasprotniku), TARJETAS (`--yellow`, `--red`; drugi rumeni =
  dva rumena + rdeči → 1 rumeni + 1 rdeči) in SUSTITUCIONES (vstop, izstop,
  minuta; "94'" → 90). **Minute so točne.** Menjava brez minute (redko,
  uredništvo je vpisalo le ime) je opozorilo, rezerva brez nastopa.
- **Šifra zapisnika v bazi je `fas<id>`**; `--zapisnik` vzame `fas…`.
- **Nepopoln zapisnik** (ekipa z manj kot 7 začetniki, tudi le strelci ali
  prazna stran z izidom) kot pri `frf`/`fcf`: izid se zapiše, `imported_at`
  ostane prazen, 45 dni se bere vsako uro. **Kontumacija** je le 3:0 ali 0:3
  brez obeh postav in brez golov, starejša od tedna — prazna stran z drugim
  izidom ali z goli je tekma, ki ji uredništvo postav ni vpisalo.
- **Arhiva ni.** SportsPress na futbolasturiano.es vodi le sezono 2026/27
  (izraz `sp_season` je en sam, `/temporada/2025-2026/` vrne 404, zgodovina
  na straneh igralcev se začne z 2026/2027; objave ekip so iz junija 2025,
  tekme od avgusta 2026). Cene so le iz tekoče sezone (uvoz brez `arhiv`,
  s `cene`) — kot `hlf` in `fssid`; pred vklopom preveri
  `pripravljenost-lige` (delež privzetih ≤ 70 %).
- *Uskladi pozicije* z `vir = fas` (vratar po večini tekem).
- Predpomnilnik `scripts/.predpomnilnik/fas` (stran lige `razpored-<šifra>.html`,
  ki jo uvoz razporeda prenese tik pred `razporedVseStrani`, in
  `evento-<id>.html`). Prvi uvoz bloka prebere vse strani (~300–380 po 3 s,
  20–25 minut). ES je v `SKUPEN_VIR` (`cakaj-na-uvoze.mjs`, zaradi fcf.cat) —
  zagoni Španije se zato ne prekrivajo, tudi fas s fcf; drugega ni treba.

**Pravice (pregled 13. 10. 2026, ni pravni nasvet).** robots.txt
`User-agent: * / Disallow:` (nič prepovedano), pravno obvestilo (Aviso legal)
je prazno, brez WAF in izziva. Navedba vira (`vir_ime` FutbolAsturiano.es,
`vir_url` → stran lige) je v nogi; zveza v izbirniku je RFFPA (`rfpaf`).
Vljudnostno obvestilo uredništvu (correo@futbolasturiano.es) še ni poslano.
Beremo odkrito (User-Agent `SLFF fantasy (slff.eu; splih.94@gmail.com)`,
**3 s** med zahtevki, strežnik je občasno počasen — `fasFetch` 90 s). Sodnikov,
ocen, poročil, fotografij in igrišča ne beremo; vzorci `scripts/vzorci/es-fas-*`
so obrezani. **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj**
(`FasZavrnitev`, izhod 4).

Vpisani ligi (migracija 20261014203100), **neaktivni**, zveza `rfpaf`:

| liga | klubov | tekoča 2026/27 | arhiv |
|---|---|---|---|
| es-as-tercera-g2 | 18 | `3-rfef:14499-14804` | — (vir ga nima) |
| es-as-primera | 20 | `1-asturfutbol:15137-15516` | — (vir ga nima) |

Preizkus v živo (14. 10. 2026, `node scripts/asturijske-lige.mjs --polno`,
brez baze; ves blok, ~690 strani po 3 s, 0 zavrnitev):

- **Tercera G2** — 34 krogov, 306 tekem (vse z uro), 18 klubov, 0 tujih
  objav, 54 odigranih (krogi 1–6), 0 kontumacij; 50 polnih zapisnikov in 4
  nepopolni (1. krog: uredništvo je vpisalo le strelce); **postav po 11
  100/100, vratar 100/100**, goli = izid 52/54 (148/151), 446 menjav z
  minuto, 990 minut 89/100 ekip (ostale: rdeči karton ali menjava brez
  minute), 1544 nastopov (444 s klopi), vsi s šifro; 15 rdečih, 5 avtogolov,
  6 golov z 11 m. Od 2. kroga so polni vsi zapisniki (9/9 na krog).
- **Primera AF** — 38 krogov, 380 tekem, 20 klubov, 48 odigranih (krogi
  1–5), 3 kontumacije (3:0 brez postav); od 45 zapisnikov **le 20 polnih**
  (11 + 11, vratar 40/40, goli = izid 20/20, 163 menjav z minuto), 25 brez
  postav. Po krogih polnih: 4, 1, 5, 2, 8 od 9–10 — uredništvo postave
  Primere vpisuje vse bolj redno, a ne zanesljivo. Pred vklopom preveri
  pokritost zadnjih krogov; tekma brez postav da le izid (klubi brez točk).
- **Napake vira**: UP Langreo – Praviano (4. krog) ima v glavi 0:3, med goli
  3:2; El San Martín – Astur CF (4. krog, 2:2) ima vpisana le gola gostov;
  Sporting Atlético – Llanes (2. krog) in štiri druge tekme imajo nekaj
  menjav brez minute (vstop v postavi, minute ni) — opozorilo, rezerva brez
  nastopa. Izid ostane izid glave.
- **Arhiv 2025/26 ne obstaja** (glej zgoraj); preizkus lanskih tekem zato ni
  mogoč.

Uvoz (ena za drugo, brez arhiva): `gh workflow run uvoz-lige.yml -f
liga=es-as-tercera-g2 -f cene=true`.

### Anglija — vir `ncefl`

Država `GB` ("England"; vpišeta jo ta migracija in migracija lig `isthmian`,
obe z `on conflict do nothing`). **Šifra angleške lige se začne z `gb-`.**
Vmesnika v angleščini za državo, kartice in pošte še ni (`JEZIK_DRZAVE.GB`),
`GB` ni v matriki nočnega uvoza — oboje pred vklopom.

Vir `ncefl` (`scripts/viri/ncefl.mjs`) bere **Northern Counties East Football
League** (NCEL, step 5–6) z lastne strani lige www.ncefl.org.uk — HTML s
strežnika, brez izziva. robots.txt vrne 404 (pravil ni), pogojev uporabe
stran nima. **Lastnik ima dovoljenje lige.** Beremo odkrito (`User-Agent:
SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih zapisnikov
ne beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi** —
`NceflZavrnitev` že v `vir.fetch` (brez ponovitve in mimo shranjenega
razporeda), izhod 4. Ne obhajaj.

- **Šifra lige je `<divizija>/<leto>`** (`ncelpremierdivision/2026` =
  2026/27), kot v naslovu strani divizije `/matches/<divizija>/<leto>/`.
  Ob novi sezoni se popravi le leto; arhiv je isto z lanskim letom. Stran
  preveri, da je v izbirniku sezone izbrana prav ta pot.
- **Stran divizije** nosi vse tekme sezone po dnevih (`mddate`): odigrane z
  izidom ("2-1", "Att", "HT") in povezavo na zapisnik (`mdteamsheet` →
  `/matches/day/<LLLL>/<LLLLMMDD>/<id>/`), prihodnje z uro ("3:00pm",
  angleški čas → ljubljanski +1 h). Odigrane nimajo ure.
- **Krogov stran ne pozna** (ne stran divizije ne zapisnik). Krog je zato
  **teden** (ponedeljek–nedelja), štet od tedna zadnje julijske sobote
  (`krogIzDatuma`: 2026/27 od 20. 7. 2026, sobota 25. 7. je 1. krog, torek
  28. 7. 2. krog). Številka ne zavisi od drugih tekem, zato prestavitev ne
  preštevilči ostalih. Klub ima lahko v krogu dve tekmi (torek in sobota, kot
  "double gameweek") ali nobene; v sezoni so tedni brez tekem (vrzel v
  številkah, npr. Premier 2026/27: 36 krogov od 1 do 37). Borza gleda
  prejšnji krog po številki — za tednom brez tekem ga ni.
- **Prestavljena tekma zamenja krog.** Vir ima `krogiPoTednih: true`; uvoz
  razporeda tekmo istega para (domači:gostje igra v sezoni enkrat) iz drugega
  kroga **premakne** (`tekmaDrugegaKroga` v `razpored.mjs`), namesto da bi
  nastala druga vrstica, in pobriše neuvoženo dvojnico para, ki jo je pustil
  uvoz zapisnikov (`odvecneVrsticePara`). Krog, iz katerega so odšle vse
  tekme, ostane prazen (zaklene se brez točk).
- **Posebne vrstice**: "A-A" je prekinjena tekma — s pripisom "… points
  awarded …" (`mdcomments`) je kontumacija brez izida, sicer čaka ponovitev
  (neodigrana, `vir_brez_izida`). Izid brez zapisnika s pripisom "unable to
  field a team - 2-0 win awarded" je kontumacija z izidom (brez pripisa, a z
  `mdnoinfo`, šele po tednu dni). Odigrana tekma brez zapisnika (2023/24 trije
  primeri) ostane neuvožena. Izstopljen klub ("record expunged following
  their resignation", Doncaster City 15. 9. 2026) s strani izgine z vsemi
  tekmami — uvoz razporeda zato zahteva `--dovoli-manj-klubov`.
- **Zapisnik**: glava z izidom, polčasom in strelci po imenu z minuto
  ("41, 71", "82pen", "45og" — avtogol stoji pri ekipi, ki ji gol šteje, z
  imenom nasprotnika; "Unknown" = brez strelca); nato "<klub> starting
  line-up" in "Substitutes" obeh ekip. Igralec: dres, ime ("Ime Priimek" →
  "Priimek Ime"), goli (`Ball20.png` + število), karton (`yellowcard`,
  `yellowredcard` = drugi rumeni → 1 rumeni + 1 rdeči, `redcard`), menjava
  (`down.gif NN` izstop, `up.gif NN` vstop) — **minute menjav so točne,
  kartoni so brez minute** (izključeni igra do konca ali izstopa, ekipa ima
  990). Goli: število po igralcu iz glave, sicer iz ikon; strelec glave, ki ga
  ni v postavi, je gol ekipe brez strelca. Šifer igralcev ni (ime + klub kot
  fss/lff), vratar ni označen — začetnik z dresom 1 dobi `vratar` kot namig
  (*Uskladi pozicije* vira še ne pozna).
- **Šifra zapisnika v bazi je `ncel<id>`** (`sifraZapisnika`).
- **Predpomnilnik** (`vir.zaPredpomnilnik`): le stran divizije s tekmami ali
  zapisnik s postavo; stran vzdrževanja ne. Zapisnik zadnjega tedna se bere
  sveže, do 45 dni še enkrat sveže, če iz predpomnilnika nima postav ali se
  goli ne ujemajo z izidom (`zapisnikSvez`); goli mimo izida so prvih 7 dni
  `nepopoln` (brez `imported_at`, bere se znova).

Vpisani ligi (migracija 20261015230300, **neaktivni**), zveza `ncefl`:

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|---|
| gb-ncel-premier | 20 | `ncelpremierdivision/2026` | `ncelpremierdivision/2025` (380 tekem, vse z zapisnikom) |
| gb-ncel-division-one | 21 | `nceldivisionone/2026` | `nceldivisionone/2025` (462, vse z zapisnikom) |

Preizkus v živo (15. 10. 2026, po poti uvoza brez baze, 3,5 s med zahtevki):
Premier 2026/27 — 380 tekem (20 klubov, 36 tednov), 134 odigranih, vseh 134
zapisnikov razčlenjenih, goli = izid 134/134, postav po 11 268/268, 990
minut 267/268, 930 menjav z minuto, 20 rdečih; Division One 2026/27 — 420
tekem (21 klubov), 153 zapisnikov, goli = izid 153/153, postav po 11 306/306,
990 minut 303/306, 1109 menjav. Odstopanja so napake vira: rezerva z vstopom
brez para (Selby Town) in strelec s klopi brez vstopa (dobi nastop od gola).
Arhiv 2025/26 (vzorec vsake 8. tekme): Premier 48/48 goli = izid, 96/96 po
11 in 990 minut; Division One 57/58 (56246: v glavi 4 goli gostov, izid 1:3).

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=gb-ncel-premier
-f arhiv=ncelpremierdivision/2025 -f cene=true`. Arhiv 380 zapisnikov po 3 s
je okoli 20 minut na ligo.

### Severna Makedonija — vir `ffm`

Država `MK` ("Северна Македонија", migracija 20261012053100) ima vmesnik v
makedonščini (`src/i18n/mk/`, jezik `mk`, `mk-MK`, **cirilica**,
`JEZIK_DRZAVE.MK`), izbirnik jezika "Македонски", vstop `slff.eu/mk`, kartico
ob deljenju `mk.html` (Caddy jo vrne za `/mk` in `?t=mk-…`, tudi rezerva
`:3201`), makedonsko vejo pošte (`sporocila.ts`, avtentikacijske predloge in
zadeve v `docker-compose.slff.yml`, pozdrav "Здраво") in makedonska imena
lastnikov hišnih ekip (migracija 20261013183100, tudi `klub_stik.drzava`
sprejme MK). **Šifra makedonske lige se začne z `mk-`.** Ugib: brskalnik `mk`
ali pas `Europe/Skopje`. Izrazi kot v makedonskih športnih medijih: тим,
состав, прв состав, клупа, капитен, вице-капитен, трансфери, голман,
одбранбен, среден ред, напаѓач, табела, асистенција, картон, поени, мини лига;
`krog` je vedno **коло** ("5. коло"), pripomoček `klop_plus` je "Клупа+",
poznavalec je "познавач". Množine one/other (`Intl.PluralRules('mk')`): `one`
1, 21, 31 … razen 11, sicer `other` s števno obliko ("1 поен, 2 поени, 11
поени, 21 поен"; "2 тима", "3 гласа"). Makedonščina nima sklonov, a člen je
pripona (лигата), zato ime lige stoji samostojno za dvopičjem ali predlogom
("лига: {liga}", "за {liga}"); `ligaVTozilniku` ga pusti. Psevdonim v
klepetu ima pridevnik pred samostalnikom ("Син Голман 42"). Stran Pozicije je
v meniju kot v Sloveniji. `MK` je v matriki nočnega uvoza in v *Hisne ekipe*.
Manjka še: makedonski kanal v HelpStacku (`Podpora.tsx` za `mk` uporabi
slovenskega) in **pregled prevoda pri naravnem govorcu**. Lige ostanejo
neaktivne, dokler jih lastnik ne vklopi.

Vir `ffm` (`scripts/viri/ffm.mjs`) bere **www.ffm.mk** (Фудбалска федерација
на Македонија). Ista WordPressova predloga kot fss.rs (vtičnik
`igal-comet-v2`), s predpono `ffm-` namesto `fss-`; podatki so iz COMET.
robots.txt zapre le /wp-admin/, brez izziva in prijave. Beremo odkrito
(`User-Agent: SLFF fantasy (https://slff.eu)`, **2 s** med zahtevki, popolnih
zapisnikov ne beremo znova). **Če se pojavi izziv ali CAPTCHA, ustavi — ne
obhajaj.** Dovoljenja FFM še nimamo.

- **Šifra lige je slug strani** `/natprevaruvanje/<slug>/`; vsaka sezona ima
  svojega in slugi niso pravilni (`prva-mfl27`, `vtora-mfl-25-26-2`), zato se
  vpišejo ročno. Seznam: meni strani (tekoče) in `/arhiva-na-natprevari/`
  (2022/23–2024/25); 2025/26 je le v stranskem meniju strani lige.
  Neznan slug vrne **404**. Ni ga v `sitemap.xml` (tam so le nekatere
  strani 2026/27) ne v REST API-ju — tekmovanja izriše vtičnik.
- **Pisava**: latinice za strani lig ni (`?script=lat` stran prezre, `/en/`
  prevaja le okvir). **Imena klubov so v cirilici, kot jih piše zveza** (s
  strani lige — "ФК Студеничан", "ФК КУЛ-ЗДРАВЈЕ"), **imena igralcev v
  latinici**, kot jih da zapisnik COMET ("Kjehovikj Alan"). Ključ kluba je
  male črke (zveza isti klub piše enkrat z velikimi, drugič z malimi); COMET
  istoimenske klube loči s krajem ("ФК РЕЧИЦА" ≠ "ФК РЕЧИЦА с.Речица",
  "ФК ПОБЕДА Валандово" ≠ "ГФК ПОБЕДА Прилеп"), zato `IME_V_…` ni treba.
  Med sezonami 2023/24–2026/27 je zapis vsakega kluba isti.
- **Stran lige**: harmonika krogov `ffm-rezultati__title` "N. коло"; prva
  (`accordion_current`) ponovi tekoči krog, beremo le `id="accordion"` do
  lestvice `id="ffm-tabela"`. Tekma: datum in ura, kraj, imeni, povezava
  `/izvestaj/<id>` (odigrana) ali `/najava/<id>` (napoved) in štiri številke
  izida (domači, gostje, polčas domači, polčas gostje; "/" = ni). **Ura 00:00
  pomeni, da tekma še ni razpisana** — vir da `ura: null` (rok kroga pride iz
  ure drugih tekem dne ali privzetega). Regijske lige objavijo razpored le
  nekaj krogov naprej (Region 2: 5 krogov), ostali pridejo z naslednjimi
  uvozi razporeda.
- **Kontumacija**: izid brez polčasa. Zveza registriran izid vnese kot
  zapisnik s postavama, a brez dogodkov in polčasa (Likova : Vlaznimi 0:3,
  Region 2, 13. 9. 2026; stran ima PHP opozorilo `Undefined array key
  "half"`). Razpored jo označi z izidom (`jeKontumacija`), zapisnik je null.
- **Zapisnik** `/izvestaj/<id>/`: glava `ffm-match-header` (izid), pod njo
  `ffm-match-meta` ("Полувреме: 1 - 2", "1. коло", datum); štirje bloki
  `ffm-rez__oneteam` (začetniki domačih, gostov, klop domačih, gostov),
  dogodki pred imenom in dresom kot pri fss: goal, penalty, own_goal (v ekipi
  strelca), penalty_failed_miss, yellow, second_yellow in red, substitution
  (vstop), substitution_out (izstop) — **minute so točne**. Šifer igralcev ni:
  identiteta je ime + klub, soimenjak pri drugem klubu po `prestop.mjs`.
- **Šifra zapisnika v bazi je `mk<id>`** (`sifraZapisnika`), ker so šifre
  COMET (~10–12 milijonov) v številskem prostoru rastočih virov (oefb, mlsz);
  naslov predpono odreže, `--zapisnik` vzame `mk…`.
- **Vratar ni označen.** COMET ga v postavi našteje prvega (ostali po dresu),
  zato ima prvi začetnik `vratar` (GK, `is_goalkeeper`) **kot namig** — kot
  fssid in mlsz. Dres prvega začetnika: 1 ali 12 pri večini, sicer tipične
  vratarske številke (99, 30, 25, 95). Rezerva, ki ga zamenja, namiga nima;
  ostali čakajo na glasovanje. *Uskladi pozicije* z `vir = ffm`.
- **Napake vira**: gol, vpisan dvema igralcema v isti minuti (Brera Strumica
  : Shkupi 7:0, dogodkov 11) — opozorilo `goli iz dogodkov …`, izid ostane
  izid zapisnika (kot fssid).

**Pokritost** (pregled 11. 10. 2026): lige odraslih moških na ffm.mk so v
2026/27 le Prva MFL, Vtora MFL in Region 1–6. Treta liga (Sever, Jug,
Jugozapad, Zapad, Istok) je zadnjič objavljena za 2024/25, za 2025/26 je ni
(slugi `treta-liga-*-25-26` vrnejo 404). Občinske lige (Kičevo, Kumanovo,
Ohrid, Skopje) so le 2024/25; `opshtinska-fudbalska-liga-<kraj>-25-26` in
`-26-27` vrnejo 404. Ostalo je mladinsko (kadetska U17, pionerska U15 — ne
vpisujemo), žensko, futsal in pokal.

**Mladinske lige (U19)**: Mladinska Super liga in Vtora mladinska liga.
**Igralci so mladoletni**; ime skrijemo na ugovor igralca ali zveze kot
povsod (`anonimiziraj_igralca`, Administracija → Igralec, obvestilo na
`/legal`). Kot pri slovenskih mladincih `prvi_fantasy_krog = 2` in
`rok_pomak_ur = 2` (tekme ob 10:00). Klubi so isti kot pri članih (vrstica
`teams` je skupna), igralci ločeni po ligi.

Vpisanih je 10 lig (migracija 20261012053100), **neaktivnih**, zveza `ffm`.
Arhiv 2025/26 obstaja le za Prvo in Vtoro MFL ter Mladinsko Super ligo;
regijske lige dobijo Treto ligo 2024/25 (2023/24 Istok) po skupnih klubih
(1. krog obeh sezon), Region 1 in 2 še občinsko ligo 2024/25. Vsak arhiv ima
ena sama liga (`matches.zapisnik_id` je enoličen).

| liga | tekoča 2026/27 | klubov | arhiv (skupnih klubov) |
|---|---|---|---|
| mk-prva-mfl | `prva-mfl27` | 10 | `prva-mfl-25-26` (7) |
| mk-vtora-mfl | `vtora-mfl-26-27` | 14 | `vtora-mfl-25-26-2` (7) |
| mk-region-1 | `region-1-sezona-26-27` | 12 | `treta-liga-sever-24-25` (6), `opshtinska-fudbalska-liga-skop-e-24-25` (2) |
| mk-region-2 | `region-2-sezona-26-27` | 10 | `opshtinska-fudbalska-liga-kumanovo-24-25` (4), `treta-liga-sever-23-24` (2) |
| mk-region-3 | `region-3-sezona-26-27` | 12 | `treta-liga-istok-23-24` (6) |
| mk-region-4 | `region-4-sezona-26-27` | 14 | `treta-liga-ug-24-25` (9) |
| mk-region-5 | `region-5-sezona-26-27` | 13 | `treta-liga-ugozapad-24-25` (5) |
| mk-region-6 | `region-6-sezona-26-27` | 13 | `treta-liga-zapad-24-25` (6) |
| mk-u19-super | `mladinska-super-liga-26-27` | 10 | `mladinska-super-liga-25-26` (10) |
| mk-u19-vtora | `vtora-mladinska-liga-26-27` | 14 | — (lastnega arhiva ni) |

Preštetje (11. 10. 2026, vsi zapisniki; tekem z zapisnikom / razčlenjenih,
goli dogodkov / izidi, postav po 11):

| stran | tekem | goli / izidi | postav 11 | opomba |
|---|---|---|---|---|
| prva-mfl27 (tekoča) | 42/42 | 121/121 | 84/84 | |
| vtora-mfl-26-27 (tekoča) | 47/47 | 112/108 | 94/94 | 1 podvojen gol |
| region-1 … 6 (tekoče) | 26, 20, 23, 32, 24, 25 | 121/121, 59/62, 95/88, 146/146, 114/111, 114/114 | vse | R2: 1 kontumacija; R3, R5: podvojeni goli |
| prva-mfl-25-26 | 197/197 | 609/603 | 394/394 | |
| vtora-mfl-25-26-2 | 240/240 | 829/780 | 479/480 | 22 podvojenih golov, 3× izid 0:0 z goli |
| treta-liga-sever-24-25 | 178/178 | 757/753 | 353/356 | |
| treta-liga-sever-23-24 | 177/178 | 767/767 | 350/354 | |
| treta-liga-istok-23-24 | 71/71 | 265/265 | 142/142 | |
| treta-liga-ug-24-25 | 138/139 | 536/536 | 269/276 | |
| opshtinska-…-skop-e-24-25 | 44/44 | 192/192 | 86/88 | |
| opshtinska-…-kumanovo-24-25 | 75/75 | 355/355 | 147/150 | |
| treta-liga-ugozapad-24-25 | 119/119 | 452/446 | 237/238 | 2 s podvojenimi goli |
| treta-liga-zapad-24-25 | 148/148 | 664/656 | 290/296 | 5 s podvojenimi goli |
| mladinska-super-liga-25-26 | **ni preštet** — preštej pred uvozom |

Prvi začetnik ima dres 1 ali 12 v 70–90 % postav, sicer vratarske številke
(25, 30, 99, 95, 90).

Uvoz (ena za drugo, ~2 s na zapisnik — arhiv 240 zapisnikov je ~10 minut):
`gh workflow run uvoz-lige.yml -f liga=mk-prva-mfl -f arhiv=prva-mfl-25-26 -f
cene=true`.

### Ukrajina — vir `aft` (Ternopilska oblast)

Vir `aft` (`scripts/viri/aft.mjs`) bere **aft.com.ua** (Асоціація футболу
Тернопільщини): oblastno prvenstvo, Вища ліга (raven 5, pod AAFU) in Перша
ліга (raven 6). Država `UA` ("Україна") in zveza `aft` sta v migraciji
20261015230500 (država z `on conflict do nothing`, ker jo vpiše tudi vir
`pfl-ua`). Ukrajinskega vmesnika, kartice in pošte še ni, `UA` ni v matriki
nočnega uvoza — oboje pred vklopom. Šifra lige se začne z `ua-`.

- **Sezona je koledarsko leto** (maj–oktober, `sezona_koledarska`): `"2026"`.
  Vir jo vzame iz naslova turnirja ("Чемпіонат Тернопільської області 2026")
  in preveri, da je to leto tekem.
- **Šifra lige je id turnirja** (`/tournament/champinship/<id>`): 36 = Вища
  ліга 2026, 37 = Перша ліга 2026. Vsaka sezona ima svojega — spomladi 2027
  se šifra popravi, 2026 postane arhiv (`arhiv=36` oz. `37`).
- **Razpored** je stran turnirja: "Тур N", kartice tekem z id-jem
  (`/match/<id>`), datumom in krajem, klubi (kraj v `alt` grba) in izidom ali
  uro neodigrane (kijevski čas → ljubljanski −1 h). **Izid 3:0/0:3 brez kraja
  je kontumacija** (Нараїв od avgusta 2026 ne igra več: 8 tekem). Prestavljena
  tekma stoji v krogu dvakrat (neodigrana s starim datumom, odigrana z novim);
  neodigrana vrstica odpade.
- **Postav na strani tekme ni** (`/match/<id>` ima le izid, uro in sodnike;
  "Склад команди" je prazen). Postave so v **novicah** (ponatis iz časopisa
  Газета 1): Вища ліга en članek na tekmo s prostim naslovom, Перша ліга en
  članek na krog. Članka brez sluga ni mogoče nasloviti (`/news/1800` → 404),
  zato vir bere seznam novic (`/news?page=N`, 12 na stran) in ga hrani v
  `scripts/.predpomnilnik/aft/novice.json`; vsak zagon prebere sveže le prve
  strani do že znanih novic, starejših od dveh tednov (pozneje objavljen
  članek z zgodnejšim datumom stoji globlje). Prvi zagon sezone bere ~40
  strani in ~470 člankov (strežnik je počasen, 3–10 s na stran: ~45 minut).
  **Izbrisan članek** (404, 410 — umaknjena novica, spremenjen slug) lige ne
  ustavi: opozorilo, članek izpade iz `novice.json`, uvoz gre naprej.
  401, 403, 429, izziv in 5xx še vedno ustavijo uvoz.
- **Blok tekme** v članku: glava `«Дом» (kraj) – «Gost» (kraj) – 1:0 (0:0)`,
  datum ("11 жовтня"), postavi `«Klub»: …`, "Гол(и):", "Попереджені:",
  "Вилучений:", stavek "На 34-й хвилині … не реалізував пенальті" in pri Вищі
  "ТАКТИЧНА РОЗСТАНОВКА" (polna imena po mestih, "Воротар – …"). Blok se ujame
  s tekmo razporeda po klubih (ime in kraj, številka se mora ujemati:
  "Борщів-2" ni "Борщів") in datumu ±3 dni; ime v članku je pogosto drugo
  ("ФАТ-Вікнини" = Вікнини, "Арсенал" = Арсенал-Теребовля). Kadar je datum v
  članku napačen ("16 липня" namesto avgusta) ali je bila tekma dokončana
  pozneje ("у дограванні"), se tekma brez poročila ujame še ohlapno po klubih
  in izidu (opozorilo).
- **Postava**: enajst priimkov, "-к" kapetan, soimenjak z začetnico
  ("Семенець Т.", "Д. Марчук" → "Марчук Д."), menjava v oklepaju
  ("Грабчак (Марцінковський, 64)", veriga "(Гринь, 60, Дума, 90+4)"), za
  "Заміна:" neuporabljena klop. **Identiteta je priimek + klub** (kot fsb);
  isti igralec se lahko piše različno ("Пшивий Волод.", "Пшивий Володимир") in
  dobi dve vrstici. Tipkarske napake vira, ki jih vir popravi z opozorilom:
  manjkajoča vejica pri desetih začetnikih ("Чемерейко Слободян" → dva, a ne,
  če je druga beseda ime: "Кладочний Михайло"), odvečna vejica pred menjavo,
  pika ali vprašaj namesto vejice, "Заміна" brez dvopičja.
- **Goli in kartoni** so s polnim imenom brez kluba: igralec se najde po
  priimku (in začetnici), soimenjaka v obeh klubih loči taktična razporeditev,
  sicer izid. Avtogol "(3, а/г)" ali "автогол"; gol, ki ga izid zahteva kot
  neoznačen avtogol (vratar gostov pri 1:0), se šteje kot avtogol z
  opozorilom. Drugi rumeni "(90+4, друге попередження)" → 1 rumeni + rdeči.
  Kartoni trenerjev in uradnih oseb ("тренер", "офіційна особа") ne štejejo.
- **Vratar**: "Воротар" iz taktične razporeditve, sicer prvi začetnik (namig,
  kot mlsz). *Uskladi pozicije* z `vir = aft`.
- **Predpomnilnik**: stran turnirja in seznam novic vedno sveža; članek
  zadnjega tedna svež, do 45 dni še enkrat svež, če ima nepopoln blok (postava
  ni 11 ali goli niso izid). `zaPredpomnilnik` ne shrani vzdrževalne strani.

**Pravice.** robots.txt: `User-agent: * / Disallow:` (nič prepovedanega),
pogojev uporabe ni. Lastnik pravi, da imamo dovoljenje za branje. Beremo
odkrito (User-Agent SLFF, 3 s med zahtevki). **Ob 401, 403, 429 ali izzivu se
uvoz ustavi** (`AftZavrnitev`, izhod 4) — ne obhajaj. Sodnikov, opazovalcev
in osebja ne beremo; vzorci `scripts/vzorci/ua-aft-*` so brez njih.

Preizkus v živo (15. 10. 2026, vsa sezona 2026, brez pisanja v bazo):

| liga | tekem | kontumacij | s poročilom | goli = izid | postav po 11 | 990 minut | nastopov (s klopi) |
|---|---|---|---|---|---|---|---|
| Вища ліга (`36`, 9 klubov, 18 krogov) | 72 | 8 | 62/64 | 62/62 (188) | 124/124 | 118/124 (6 z rdečim) | 1870 (506) |
| Перша ліга (`37`, 7 klubov, 21 krog) | 60 + 3 neodigrane | 0 | 60/60 | 60/60 (171) | 118/120 | 113/120 | 1760 (440) |

Brez poročila sta Агрон–Сокіл (12. 9.) in Борщів–Поділля ВБ (3. 10.) —
članek je le pripoved. Перша: dve postavi nista po 11 (Арсенал z 10, napaka
vira z 12), 5 menjav brez minute (rezerva brez nastopa). Igralcev z vsaj 270
minutami: 145 od 214 (Вища), 122 od 187 (Перша).

| liga | klubov | tekoča 2026 | arhiv |
|---|---|---|---|
| ua-te-vyshcha | 9 | `36` | — (2026 postane arhiv sezone 2027) |
| ua-te-persha | 7 | `37` | — |

Izpuščeno: Ліга Тернопільщини 2026/27 (le goli in kartoni, brez postav),
Ліга чемпіонів, kupi, veterani, futsal, ДЮФЛ (mladinske).

Uvoz (ena za drugo; lige so **neaktivne**): `gh workflow run uvoz-lige.yml -f
liga=ua-te-vyshcha -f cene=true` (brez arhiva).
### Ukrajina — vir `hoff-km` (Hmeljnicka oblast)

Vir `hoff-km` (`scripts/viri/hoff-km.mjs`) bere **hoff.km.ua**, spletišče
Хмельницька обласна асоціація футболу (ХОАФ): oblastno prvenstvo (ЧХО),
Vyshcha liga (6 klubov) in Persha liga (5 klubov), raven 5 in 6. Ime vira je
`hoff-km` (ne `hoff.km`), ker delovni tokovi sprejmejo le `[a-z0-9-]`. Država
`UA` (vpiše jo ta migracija ali `pfl-ua`, `on conflict do nothing`), zveza
`hoaf-km` (migracija 20261015230700); **vmesnika v ukrajinščini, kartice in
pošte še ni in `UA` ni v matriki nočnega uvoza** — oboje pred vklopom. Šifra
lige se začne z `ua-`.

- **Sezona je koledarsko leto** (maj–oktober, `sezona_koledarska`): oznaka
  `"2026"`. **Šifra lige je slug strani lige** (`chho-2026-vyshha-liga`,
  arhiv `chho-2025`), leto v slugu je sezona; stran druge sezone uvoz ustavi.
  Ob novi sezoni se vpiše nov slug. Seznam strani: `/wp-json/wp/v2/pages?search=ЧХО`
  (ali meni "АРХІВ ЧХО", ki 2024 in 2025 ne našteje).
- **Razpored** je ročno vnesena tabela v vsebini strani lige ("Тур | Дата |
  № гри | Господарі | Гості | Рахунок"; 2025 je "№ матчу" pred datumom —
  stolpci po glavi). **Ure ni** (`ura: null`, rok kroga po privzetem); če bi
  bila, je kijevska → ljubljanska (−1 h). Krog brez številke vzame prejšnjega.
  Tekme istega kroga so lahko mesece narazen (1. krog 2026: 9. 5. in 1. 7.).
- **Tehnični izid** je zvezdica z opombo pod tabelo ("* Матч №9 – неявка
  гостей… техічна перемога", "КДК анулював результат") ali "3:0 (+:-)".
  Brez objave s postavami (neigra) in starejši od tedna je **kontumacija**;
  z objavo (KDK je razveljavil odigrano tekmo: 1:0 → 0:3) je tekma z uradnim
  izidom, prejeti goli in čista mreža pa so z igrišča (`izidIgrisca`, kot
  `pfl-ua`). Opomba s "призупинено / догравання / перенесено" (letalski alarm
  pri 0:0) pomeni, da tekma še ni odigrana — brez izida.
- **Zapisnik je objava tekme** ("ЧЕМПІОНАТ ОБЛАСТІ: A – B", 2025 "ЧХО-2025.
  14 ТУР. A – B"). Beremo **javni REST WordPressa** (robots.txt zapre le
  /wp-admin/): seznam vseh objav leta (le id, datum, naslov; ~3 strani po
  100), filter po naslovu, nato vsebina objav tekem po 100 — ~5 zahtevkov na
  ligo. **Oznake in kategorije niso popolne** (`sezon-2026`,
  `chempionat-oblasti` in "ОБЛАСНІ ТУРНІРИ" vsaka zgreši nekaj tekem; Нива :
  Олімп 2026 je le v "Новини"), zato ne filtriramo po njih. Objava gre tekmi
  po paru klubov iz naslova (prva beseda imena brez "ФК"; glava objave je
  rezerva — v 12. krogu 2026 piše "Енергетик – Енергетик"), med več takimi po
  krogu ("Матч 15 туру", "14 ТУР") in nato po najbližjem datumu.
- **Postava**: "“Колос”: Бушняк, …, Бартошук – к, Музичук (Панфілов, 78)."
  Le enajsterica in rezerve, ki so prišle; **neuporabljene klopi ni**. V
  oklepaju rezerva in minuta vstopa; veriga "(Чабак, 20 (Омельчук, 64))" ali
  "(Гацький, 46, Чуб, 57)" — tudi rezerva gre ven (`preklopi`). Ročne napake,
  ki jih razčlenjevalnik prenese z opozorilom: neuravnotežen oklepaj, rezerva
  brez minute ("(Григор’єв)" → brez nastopa), manjkajoč začetnik ("…,  (Муляр,
  90+3)"), oklepaj za vejico ("Закорчменний, (Бондаренко, 79)"), isto ime
  dvakrat (drugi vnos izpuščen), ostanek za koncem stavka ("Омельчук. (Муляр,
  63), Гудзь…" — izpuščen). **Vratar ni označen**; prvi začetnik (in kdor ga
  zamenja) je vratar kot namig (kot mlsz, ffm); *Uskladi pozicije* z
  `vir = hoff-km`.
- **Dogodki**: "Голи: A (18, 32), B (58-пен.) – C (61)", avtogol pri minuti
  ("6 – а/г", "75–а/г") šteje nasprotniku, "На 58 хв. … не реалізував
  пенальті" (zgrešena 11 m), "Попередження:" rumeni, "Вилучення:" rdeči
  ("друге попередження" = 1 rumeni + rdeči, "по завершенню гри" → 90). Strelca
  in karton **pripišemo ekipi po postavi, ne po strani pomišljaja** (Вишнівчик
  2:0 Поділля, 10. 10. 2026: domači strelec za pomišljajem); neznan strelec je
  gol ekipe brez strelca (ne nov igralec — sicer gol brez nastopa). Karton
  trenerja ne šteje.
- **Identiteta: ime + klub**, šifer ni. Objave pišejo večinoma le priimek, ime
  le ob soimenjaku ali pri strelcu ("Олійник" / "Олійник Владислав"), ista
  oseba pa je kdaj "Матанчук", "Матанчук Денис" in "Матанчук Д.". **Ime se z
  novimi objavami ne sme spremeniti**: uvoz išče igralca po polnem imenu, nočni
  uvoz znova uvozi le zadnjih 21 dni, zato bi preimenovanje enega igralca
  razdelilo na dva (pregled sezone 2026: 86 od 1186 nastopov Vyshcha in 65 od
  737 Persha, preden je bilo popravljeno). `poenotiImena` gre skozi objave po vrsti
  (datum, id) in osebi kluba da ime, kot ga je postava napisala ob njenem
  **prvem** nastopu; poznejšo obliko (golo ime, ime, začetnica) pripiše
  obstoječi osebi le iz prejšnjih objav in iste objave, ime strelca se le
  nauči. Nova objava tako starih imen ne spremeni (smoke: vsak rez po datumu).
  Dvoumno (dva Бойка, golo "Бойко") ostane, kot je napisano; soimenjaka v
  klubu, ki ju postava piše z imenom, sta dva igralca (Сідорчук Владислав in
  Станіслав). Ime v naslednji sezoni je spet ime iz postave (večinoma golo),
  zato se med sezonama ujema bolje kot polno ime strelca.
  Šifra zapisnika v bazi je `hk<id objave>`.
- **Predpomnilnik**: stran lige vedno sveža; seznam in vsebina objav tekočega
  leta vedno sveža, arhiv iz predpomnilnika — a če kateri tekmi do 45 dni
  manjka objava ali je nepopolna, še enkrat svež. Goli ≠ izid v zadnjem tednu
  je `zapisnik nepopoln` (brez `imported_at`, nočni uvoz bere znova), pozneje
  le opozorilo. V predpomnilnik gre le stran lige z razporedom in pravi JSON
  (`zaPredpomnilnik`), ne stran vzdrževanja ali napaka WordPressa.
- **Isto ime, drug klub**: "Колос" (2025) = "Колос Полонне", "ДЮСШ-2" =
  "ДЮСШ-2 Імпульс" (preimenovan sredi 2025) — `IME_KLUBA` v viru. Natančno ime
  (`poenostavi`) ohrani kraj, zato "Нива Летичів" ni "Нива (Вінниця)" iz
  `pfl-ua`.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt je privzeti
WordPressov (Disallow /wp-admin/), pogojev uporabe ni; po besedah lastnika (15. 10. 2026) za branje
imamo dovoljenje. Beremo odkrito (User-Agent `SLFF fantasy (https://slff.eu)`,
**3 s** med zahtevki, `hoffFetch`). Sodnikov, opazovalcev, fotografij in
videov ne beremo; vzorci `scripts/vzorci/ua-hoff-*` so brez njih. **Ob 401,
403, 429, izzivu ali CAPTCHI se uvoz ustavi — ne obhajaj** (`HoffZavrnitev`,
izhod 4; `hoffFetch` zavrne že pred ponovitvijo 429 in pred shranjenim
razporedom).

Preizkus v živo (15. 10. 2026, vse tekme, brez baze; ~30 zahtevkov z raziskavo vred):

| liga | tekem / z izidom | kontumacij | zapisnikov | goli = izid | postav po 11 | menjav (z minuto in parom) | 990 minut |
|---|---|---|---|---|---|---|---|
| Vyshcha 2026 | 45 / 43 | 1 (+1 mlajša od tedna) | 41 | 41/41 | 81/82 | 284 (283) | 80/82 |
| Persha 2026 | 30 / 30 | 3 | 27 | 25/27 | 52/54 | 140 (140) | 48/54 |
| ЧХО 2025 (arhiv) | 42 / 42 | 4 | 38 | 37/38 | 73/76 | 292 (292) | 70/76 |

Vsa odstopanja so napake vnosa (objava brez vrstice "Голи", 10 ali 13 imen v
enajsterici, gol premalo); opozorila so v `import_warnings`. Noben gol ni brez
nastopa strelca. **Sezona 2026 je ob vpisu končana** (Vyshcha še 13. krog
Вишнівчик : Колос in prekinjena Поділля : Оболонь, 17. 10.) — vklop realno
za 2027 (nov slug). Persha liga ima pet klubov — spodnja meja (3 iz kluba × 5).

Vpisani ligi (migracija 20261015230700), **neaktivni**, zveza `hoaf-km`:

| liga | klubov | tekoča 2026 | arhiv |
|---|---|---|---|
| ua-km-vyshcha | 6 | `chho-2026-vyshha-liga` | `chho-2025` (7 klubov, skupna Колос Полонне in Оболонь-Чемерівці) |
| ua-km-persha | 5 | `chho-2026-persha-liga` | — (lani je ni bilo) |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=ua-km-vyshcha -f
arhiv=chho-2025 -f cene=true`; Persha brez `arhiv`.
### Turčija — vir askf

Vir `askf` (`scripts/viri/askf.mjs`) bere **pokrajinske amaterske zveze
(ASKF)** na platformi FYS ("Futbol Yönetim Sistemi", ASP.NET WebForms):
**Çanakkale** (canakkaleaskf.org) in **Aydın** (aydinaskf.com) — en vir, ker
je program isti; spletišče izbere šifra lige. To so lige pod TFF (Süper
Amatör = raven 6, 1. Amatör = 7), ki jih tff.org nima; TFF 3. Lig in PGL, ki ju
spletišči tudi naštejeta, so pri viru `tff`. Država `TR` (vmesnik, pošta, nočni
uvoz) še ni pripravljena — lige so **neaktivne**.

- **Šifra lige** je `<zveza>/<sezona>/<liga>[/<skupina>]`:
  `canakkale/2026-2027/samator`, `aydin/2026-2027/1amator/2`. `<liga>` je
  vrednost izbirnika lig brez ločil in turških črk ("S.AMATÖR" → `samator`),
  `<skupina>` naslov gumba skupine. Sezona je del šifre — ob novi sezoni se
  šifra popravi; liga s skupinami brez skupine v šifri ustavi uvoz.
- **Razpored** je `/fikstur`, a sezona, liga in skupina so **postbacki**
  (`__VIEWSTATE` ~120 kB), ne naslov. `askfFetch` za psevdonaslov
  `/fikstur#sezona=…&liga=…[&skupina=…]` odpre stran in pošlje 1–3 postbacke
  (3 s premora): meni lig je meni **prikazane** sezone (indeks se med sezonami
  zamakne), zato ob menjavi sezone ligo poišče znova. Kaj stran res kaže, pove
  glava "1.AMATÖR 2025/2026 SEZONU" (naslov strani je po postbacku skupine
  prazen) in izbrani gumb skupine; `tekmeLige` ob neujemanju ustavi uvoz. V
  predpomnilnik gre le razčlenjen razpored (JSON v komentarju, nekaj kB namesto
  0,5 MB). Uvoz zapisnikov razpored vedno prebere svež (uvoz razporeda ga
  shrani tik prej, `razporedVseStrani` ga ne bere dvakrat).
- Stran ima več **delov lige** (`rptLigler`): play-off final, polfinale, redni
  del. Beremo le redni del z letnim razporedom ("YILLIK FİKSTÜR", tedni
  "N. HAFTA"); izpadnih delov ne uvažamo. Izid s podaljškom
  ("1-4 N.S.:0-0/Uzt.:1-4") vzame končni par.
- **Čas** je istanbulski (UTC+3 vse leto) → ljubljanski (−1 h poleti, −2 h
  pozimi); "00:00" pomeni brez ure (kontumacije).
- **Kontumacija**: pod klubom v razporedu stoji opomba — "Hükmen" (zmagovalec),
  "Bu Maça Gitmeyecek/Çıkmadı", "Ligden Çekildi" (izstopil), "Ligden
  Çıkarıldı" (izključen). Taka tekma je v razporedu `kontumacija`, **tudi brez
  izida**: "Gitmeyecek" (ne bo prišel) zveza vpiše pred tekmo, "Çekildi" na vse
  tekme izstopljenega kluba. Izstop in izključitev sta še `odstop`. Izid se
  vpiše, ko ga zveza objavi (do takrat je v bazi 0:0, lestvica lige jo šteje kot
  remi). Zapisnika uvoz ne bere. Stran tekme ima tedaj le postavo ekipe, ki je
  prišla (ali nobene) — `vZapisnik` z opombo kontumacije in eno postavo vrne
  null, da igralci ne dobijo nastopa. **Neznana opomba** se ne razume kot
  kontumacija: uvoz razporeda jo javi (`::warning::`), zapisnik dobi opozorilo
  — ob novi obliki dopolni `OPOMBA_KONTUMACIJE`. Kontumacij je veliko: Aydın
  SAL 2025/26 41 od 108, Çanakkale SAL 25 od 132.
- **Zapisnik** `/macdetay?macID=<id>`: "İLK 11" in "YEDEKLER" obeh ekip z
  dresom in **šifro licence TFF** (`/oyuncular?lisansno=` → `reg_st`, ista v
  obeh pokrajinah); časovnica "OLAYLAR": `estakimli` domači, `mstakimli` gostje,
  igralec z dresom in imenom, vrsta v `title` ikone: "Gol - Ayak/Kafa/Penaltı",
  "Gol - Kendi Kalesine" (avtogol, **navadno pri ekipi, ki ji je štel** —
  strelca išče najprej po imenu v obeh ekipah, šele nato po dresu: dres 4
  gostov ni domači strelec z dresom 4), "Sarı Kart", "Kırmızı Kart", "Çıkan
  Oyuncu", "Giren Oyuncu" — **minute so točne**, menjave v pare po minuti,
  leteče menjave šteje `minuteIzPreklopov`. "DA" (polčas) = 45, "MS" (po koncu)
  = 90, "90+4'" = 90. Kartoni trenerjev imajo namesto dresa "TK" — ne štejejo in
  `obreziTekmo` jih z imeni vred vrže proč. Vratarja in pozicij ni (glasovanje).
  Šifra zapisnika v bazi je `askf-<zveza>-<macID>`.
- **Nepopoln**: ekipa z manj kot 7 začetniki (le ena postava) ali goli, ki se
  pri tekmi zadnjega tedna ne ujemajo z izidom → `nepopoln` (izid brez
  `imported_at`). `zapisnikSvez`: tekma zadnjega tedna sveže, do 45 dni iz
  predpomnilnika, a nerazčlenjena ali nepopolna stran še enkrat sveže.
- **Predpomnilnik** (`scripts/.predpomnilnik/askf`, `zaPredpomnilnik`): le
  razčlenjen razpored in stran tekme z glavo; stran napake ali vzdrževanja ne.
  Stran tekme se obreže (`obreziTekmo`): brez sodnikov, delegata, zdravnika,
  trenerjev in stadiona; vzorci `scripts/vzorci/tr-askf-*` so taki.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt na obeh
spletiščih ni (404), pogojev uporabe ni, noga pravi le "Tüm Hakları Saklıdır".
Lastnik ima dovoljenje za branje. Beremo odkrito (`User-Agent: SLFF fantasy
(https://slff.eu)`, **3 s** med zahtevki tudi med postbacki, zaključenih
zapisnikov ne beremo znova). Vse strani naložijo `recaptcha/api.js` (obrazec
za stik) — to ni izziv; izziv je gradnik `g-recaptcha` ali Cloudflare. **Ob
izzivu, CAPTCHI, 401, 403 ali 429 se uvoz ustavi** (`AskfZavrnitev` že v
`askfFetch`, brez ponovitve, izhod 4) — ne obhajaj. Strežnik je počasen (stran
tekme 5–20 s): arhiv lige (~130 strani) je 30–45 minut; lige iste zveze uvažaj
ena za drugo.

Preizkus v živo (15. 10. 2026, brez baze; prešteto z razčlenjevalnikom iz PR):

| liga 2025/26 | tekem | odigranih | kontumacij | zapisnikov | goli = izid | postav po 11 | menjav (vse z minuto) | ekip z 990 min |
|---|---|---|---|---|---|---|---|---|
| Çanakkale SAL (vse) | 132 | 132 | 25 | 105 (+2 brez postav) | 390 / 390 | 210 / 210 | 747 | 181 / 210 |
| Çanakkale 1. Amatör (prvih 46) | 90 | 46 | 1 | 44 | 179 / 179 | 88 / 88 | 366 | 73 / 88 |
| Aydın SAL (vse) | 110 | 108 | 41 | 67 | 331 / 331 | 134 / 134 | 510 | 108 / 134 |
| Aydın 1. Amatör 1 (prvih 40) | 72 | 40 | 8 | 32 | 144 / 144 | 64 / 64 | 251 | 51 / 64 |
| Aydın 1. Amatör 2 (prvih 40) | 72 | 40 | 0 | 40 (9 nepopolnih) | 149 / 186 | 71 / 71 | 282 | 55 / 71 |

Ekipe brez 990 minut pojasni rdeči karton ali strelec s klopi brez vpisanega
vstopa (vstop ob golu, opozorilo). Napake vira: menjava z minuto "-150'"
(opozorilo, menjava izpade), dve odigrani tekmi Çanakkale SAL brez postav.
V Aydın 1. Amatör 2 2025/26 **KOÇARLI BLD.SPOR ni vnesel nobene postave** —
vseh 9 njegovih tekem je nepopolnih (izid, nastopi le nasprotnika; arhiv
nepopolnih ne uvaža).

**Aydın: 403 (15. 10. 2026, 10:58).** Med preizkusom je aydinaskf.com po
~200 zahtevkih v ~70 minutah (3 s premora, stran tekme 5–20 s) na stran tekme
(`macID=5992`) vrnil **HTTP 403**. Preizkus se je ustavil (`AskfZavrnitev`) in
spletišča nismo več brali — ne vemo, ali je zapora trajna, časovna ali le ta
stran. Aydın 1. Amatör 3 zato ni preštet. **Pred uvozom aydınskih lig** naj
lastnik preveri dostop (ali vpraša Aydın ASKF); če 403 ostane, `aydin` lige
ostanejo neaktivne in jih ne beremo — ne obhajaj (drug IP, brskalnik, manjši
tempo brez dogovora). Çanakkale zavrnitve ni vrnil (~260 zahtevkov). Ob
11:15 istega dne je en sam GET `/fikstur` spet dobil 403 — zapora traja.

Vpisanih je 5 lig (migracija 20261015230900), **neaktivnih**, zvezi
`askf-canakkale` in `askf-aydin`. Sezona 2026/27 se začne konec oktobra
(Aydın 24.–25. 10.); Çanakkale razporeda 2026/27 še ni datiral — uvoz
razporeda do takrat konča z "Razporeda ni bilo mogoče razbrati".

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| tr-canakkale-sal | 11 | `canakkale/2026-2027/samator` | `canakkale/2025-2026/samator` (12 lani) |
| tr-canakkale-1-amator | 11 | `canakkale/2026-2027/1amator` | `canakkale/2025-2026/1amator` |
| tr-aydin-sal | 13 | `aydin/2026-2027/samator` | `aydin/2025-2026/samator` (11 lani) |
| tr-aydin-1-amator-1 | 11 | `aydin/2026-2027/1amator/1` | `aydin/2025-2026/1amator/1` (6) |
| tr-aydin-1-amator-2 | 11 | `aydin/2026-2027/1amator/2` | `aydin/2025-2026/1amator/2`, `aydin/2025-2026/1amator/3` (5 + 4) |

Izpuščeno: 2. Amatör (2026/27 ni razpisana; Çanakkale 2025/26 skupine A–C po
5–6 klubov, le spomladi), mladinske (U19–U11), ženske, veterani, pokali,
play-off. Uvoz (**ena za drugo**): `gh workflow run uvoz-lige.yml -f
liga=tr-canakkale-sal -f arhiv=canakkale/2025-2026/samator -f cene=true`.
### Armenija — vir `ffa`

Vir `ffa` (`scripts/viri/ffa.mjs`) bere **ffa.am** (Football Federation of
Armenia, Laravel + Livewire, spredaj Cloudflare brez izziva), kjer FFA objavi
tekmovanja, ki jih vodi sama: **Prvo ligo** (Առաջին խումբ, raven 2) in
amaterski ligi A in B, in **premierleague.ffa.am** (**Premier Liga**,
Հայաստանի Պրեմիեր լիգա, raven 1; glej *Premier Liga* spodaj). Država `AM`
("Հայաստան", vpiše jo migracija lig); vmesnika v armenščini, kartice in pošte
**še ni** in `AM` **ni** v `JEZIK_DRZAVE` ne v matriki nočnega uvoza — oboje
pred vklopom. Šifra lige se začne z `am-`.

- **Šifra lige je `<pot>/<skupina>`**: pot strani pod `/en/` (`first-league`)
  in id skupine iz gradnika Livewire `cascade-tour-matches`
  (`wire:initial-data`, `dataMeta.groups`; 902 = Prva liga 2026/27). Stran
  vedno pokaže **tekočo** skupino; pretekle sezone (802 = 2025/26, …) in
  druge skupine (amaterske A1/A2) bi zahtevale zahtevek Livewire (POST), ki
  ga ne pošiljamo — **arhiva zato ni**, cene so iz tekoče sezone. Če stran
  pokaže drugo skupino (nova sezona), se uvoz ustavi: popravi
  `source_league_code`. Sezona je leto skupine v gradniku ("2026-2027" →
  "2026/27"; skupine in leta so našteti vzporedno, najnovejše prvo).
- **Razpored** je ena stran: `<tbody tour="N">` (krogi pomešani), vrstica
  domači, izid ("2:1", tehnični izid "3:0(3:0)", neodigrana " : "), gostje,
  termin "04/08 17:00" **brez leta** (julij–december prvo leto sezone,
  januar–junij drugo) ali "Postponed", kraj, stadion in povezava
  `/en/match-info/f<id>`. **Erevanski čas (UTC+4, brez poletnega) →
  ljubljanski** (−2 h poleti, −3 h pozimi). Tehnični izid je kontumacija.
- **Izstop kluba**: klub, ki je izstopil (Hayq 2026/27), ostane na strani z
  vrsticami brez termina, izida in povezave tudi v odigranih krogih.
  `izstopljeniKlubi` ga prepozna (vsaj dve taki vrstici, od prve nobene prave
  tekme) in `razporedIzTekem` njegove neodigrane tekme izpusti (25); tehnični
  izidi pred izstopom ostanejo kot kontumacije.
- **Zapisnik** `/en/match-info/f<id>` (šifra v bazi `am<id>`): glava ("…
  (2026-2027): 1" = sezona in krog, "04.08.2026 17:00", imeni, izid,
  "Technical defeat" pri kontumaciji → zapisnik null), "Players" (začetniki)
  in "Substitutes" (klop), levo domači, desno gostje. Dogodki so ikone z
  minuto: `down.png` izstop, `up.png` vstop, `ball.png` gol, `yc.png`
  rumeni, `rc.png` rdeči — **levo ikona pred minuto, desno minuta pred
  ikono**, zato razčlenjujemo HTML. Rumeni in rdeči ob isti minuti (ali dva
  rumena) je drugi rumeni → 1 rumeni + 1 rdeči. Polčasa stran ne pove.
  Trenerjev ("Coaches"), sodnikov in delegata ne beremo; vzorci `am-ffa-*`
  so brez njih.
- **Goli iz glave**: pod imenom kluba, ki mu gol šteje, so strelci z
  minutami, "(11m)" = 11 m, "(OG)" = **avtogol igralca nasprotne ekipe** (pri
  nas je pri strelcu v njegovi ekipi). Igralca najde ikona žoge iste minute
  (glava ime včasih obrne: "Abayomi David"), sicer ime. Ikone v postavi same
  avtogola ne ločijo — s samimi ikonami bi se 4 od 59 tekem ne ujemale z
  izidom.
- **Napake vira**: menjava, vpisana obrnjeno (rezerva "vstopi" po izstopu:
  "67 noter, 20 ven", f98471, f98509, f98518), se zamenja z opozorilom. Kadar
  vstop rezerve manjka (Olympia, f98492: dva izstopa v 82., brez vstopa), ima
  ekipa manj kot 990 minut.
- **Identiteta: ime + klub** (kot fss, gff), šifer igralcev ni. Ime je
  latinica ("Hayk Hovakimyan" → "Hovakimyan Hayk"), nekaj imen tujcev je
  delno v armenski pisavi, kot jih piše zveza.
- **Vratar ni označen**: prvi začetnik je vratar le kot namig (kot ffm,
  gff); v 118 postavah ima dres 1, 12, 13 ali 25 v 59, sicer 31, 33, 71, 88 …
  *Uskladi pozicije* z `vir = ffa`.
- Druge ekipe ("Ararat-2", "BKMA-2", "Urartu-2") so svoj klub; ključ ohrani
  števke. Oblika "FC"/"SC" v ključu odpade (`kljucKlubaAm`): Premier Liga piše
  "FC Urartu", "SC Shirak", "Sardarapat FC", ffa.am "Urartu" — ob prestopu
  lige je to isti klub.

**Amaterske lige niso vpisane**: Amateur League A 2026/27 ima skupini A1 in
A2 po **4 klube** (6 krogov), League B je le 2025/26 (skupini in play-off po
4–5 klubov). Pri 15 igralcih in največ treh iz kluba je pet klubov spodnja
meja — kadra ni mogoče sestaviti. Zapisnik je ista predloga (vzorec
`am-ffa-tekma-95922-amaterska.html` se razčleni, 11 + 11, goli = izid).

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt:
`User-agent: *` z `Disallow:` (prazno — nič prepovedano), brez Crawl-delay.
Noga zahteva aktivno povezavo na ffa.am ob uporabi gradiva (`vir_ime` FFA,
`vir_url` → stran lige v nogi). Po besedah lastnika imamo dovoljenje za
branje (15. 10. 2026). Beremo odkrito (`User-Agent: SLFF fantasy (https://slff.eu)`, **4 s**
med zahtevki, zapisnikov, starejših od tedna, ne beremo znova — razen
nepopolnih do 45 dni, `zapisnikSvez`). **Ob 401, 403, 429 ali izzivu se uvoz
ustavi — ne obhajaj** (`FfaZavrnitev` že v `vir.fetch`, izhod 4). Navadne
strani nosijo Cloudflarov skript `/cdn-cgi/challenge-platform/…/jsd/` — to
ni izziv. V predpomnilnik gre le prava stran (`vir.zaPredpomnilnik`: stran
lige z gradnikom, stran tekme z glavo). Če nas FFA prosi, naj nehamo, `am-`
lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo; stran lige in 79 strani
tekem po 4 s): 30 krogov, 222 vrstic, 15 klubov (14 + Hayq, izstopil), v
razporedu 197 tekem (25 neodigranih Hayqa izpuščenih), 63 odigranih, od tega 4
tehnični izidi (kontumacije) in 59 zapisnikov: goli = izid 59/59 (211),
postav po 11 118/118, 547 menjav z minuto (547 nastopov s klopi), 990 minut
102/118 (15 rdečih kartonov, 1 manjkajoč vstop), 4 opozorila (obrnjene
menjave). Igralcev z vsaj 270 minutami 199 od 368 (54 %).

| liga | klubov | tekoča 2026/27 | arhiv |
|---|---|---|---|
| am-premier-liga | 12 | `premierleague/96103-96300` | `premierleague/38786-38920` (2025/26, 10 klubov) |
| am-1-liga | 14 (+ Hayq, izstopil) | `first-league/902` | — (le prek Livewire) |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=am-premier-liga
-f arhiv=premierleague/38786-38920 -f cene=true`, nato `gh workflow run
uvoz-lige.yml -f liga=am-1-liga -f cene=true` (brez arhiva). Prvi uvoz
Premier Lige prebere 135 + 198 strani po 4 s (~25 minut), Prva liga 59
zapisnikov (~5 minut).

#### Premier Liga (premierleague.ffa.am)

Isti vir `ffa`, druga oblika šifre. Spletišče je ista Laravel + Livewire
predloga kot ffa.am; robots.txt `User-agent: *` z `Disallow:` (nič
prepovedano). Šifre tekem so v istem prostoru kot na ffa.am (f96151 je na
obeh ista tekma), zato `am<id>` ostane enolična.

- **Razpored cele sezone stran ne pokaže**: `/en/games` ima le tekoči krog
  (gradnik `games-index`, podatek `tour`), drugi krogi so le prek zahtevka
  Livewire (POST), ki ga ne pošiljamo; `?tour=N` stran prezre, stran kluba
  kaže le zadnje in naslednje tekme. **Strani tekem pa so strnjen blok šifer,
  urejen po krogih** (kot fssid, fcf), zunaj bloka 404. Šifra lige je zato
  `premierleague/<od>-<do>`: 2026/27 `96103-96300` (12 klubov, 33 krogov po 6),
  2025/26 `38786-38920` (10 klubov, 27 krogov po 5; meje preverjene z 404 na
  obeh straneh). **Nova sezona**: poišči prvo in zadnjo tekmo (stran `/en/games`
  ali stran kluba da šifre tekočega kroga; blok je klubov/2 × krogov) in popravi
  `source_league_code`. Stran kroga s tekmami zunaj bloka: vse zunaj
  nedokončanega bloka ustavi uvoz (nova sezona ali nov blok), nekaj zunaj
  (tekma, dodana za zgornjo mejo) je opozorilo — blok razširi.
- **Stran tekme** `/en/games/f<id>` (beremo `/en/`; `/hy/` ima imena v
  armenski pisavi): naslov "2025-2026 Fastex Premier League : Matchday 1"
  (tekoča sezona le ": Matchday 9"), termin "11.10.2026 20:00" (erevanski čas
  → ljubljanski), imena "FC Urartu", "SC Shirak", "Sardarapat FC". Neodigrana
  tekma ima krog in termin, **nerazpisana** "To schedule" brez kroga in termina
  — krog se izpelje iz mesta v bloku (`sestaviBlokPl`: klubov/2 tekem na krog,
  odmik iz strani s krogom). Postave in dogodki so ista predloga kot ffa.am,
  razlike: ikone v `/img/icons/` (tudi desno ikona pred minuto), dva
  `players__box` brez `mr-2`/`ml-2`, `<div` in `class=` v dveh vrsticah,
  stadion pod izidom (pred desnim stolpcem strelcev). "(OG)" in "(11m)" sta
  v glavi kot na ffa.am, "Technical defeat" je kontumacija.
- **Branje bloka** (`preberiBlokPl`, predpomnilnik `scripts/.predpomnilnik/ffa/tekma-pl-<id>.html`):
  odigrana s postavama se ne bere znova (zapisnik zadnjega tedna sveže,
  nepopoln do 45 dni — `zapisnikSvez`), izid brez postav dnevno do 45 dni,
  neodigrana na vrsti (od dneva pred terminom do 14 dni po njem) vsako uro,
  sicer tedensko, "To schedule" tedensko (pred tekočim krogom — prestavljena
  brez termina — dnevno). Stran kroga (uvoz razporeda jo
  prenese kot `naslovRazporeda`) pove izid in termin tekočega kroga — tekmo,
  ki jo kaže drugače kot predpomnilnik, preberemo takoj. Prvi uvoz bloka
  prebere vse strani. Krog brez termina (vse "To schedule") v razpored ne
  gre, pride z naslednjim uvozom, ko ga razpišejo. Izid brez postav, starejši
  od tedna, je kontumacija; neodigrane tekme kluba, ki je izstopil
  (`izstopljeniVBloku`), izpustimo.
- Zavrnitev kot pri ffa.am: 401, 403, 429 in izziv vržejo `FfaZavrnitev` na
  vsaki poti (stran kroga, stran tekme), izhod 4; vzdrževalna stran ne gre v
  predpomnilnik in ustavi uvoz ("ni stran tekme").
- **Vratar** ni označen, prvi začetnik je namig: v 54 tekmah 2026/27 ima vsak
  klub 1–3 različne prve začetnike (znani vratarji: Beglaryan, Buchnev,
  Ayvazov …), nobeden ni dal gola, zamenjan dvakrat.
- **Trki imen** s Prvo ligo: jih ni — druge ekipe ("Urartu-2", "Sardarapat
  FC-2") imajo števko, ostali klubi Prve lige so drugi (Olympia, MIKA, Avshar
  Ararat …). Vseh 10 klubov 2025/26 igra tudi 2026/27.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo; 198 + 135 strani tekem po
3,5–4,5 s, nato pot `vir.fetch` + `prenesiSPonovitvami` s predpomnilnikom — 7
zahtevkov):

| | 2026/27 (`96103-96300`) | 2025/26 (`38786-38920`) |
|---|---|---|
| strani / klubov / krogov | 198 / 12 / 33 (12 razpisanih, 21 "To schedule") | 135 / 10 / 27 |
| odigranih | 54 (krogi 1–9) | 135 (1 tehnični poraz, BKMA : Urartu 0:3) |
| goli = izid | 54/54 (161; 7 avtogolov, 13 z 11 m) | 134/134 (347; 12 avtogolov, 54 z 11 m) |
| postav po 11 | 108/108 | 268/268 |
| menjave z minuto | 511 (511 nastopov s klopi) | 1232 |
| 990 minut na ekipo | 101/108 (7 z rdečim kartonom) | 248/268 (19 z rdečim, 1 vstop brez izstopa v viru: f38847, 1006 min) |
| krog strani ≠ mesto v bloku | 0 (od 72 s krogom) | 0 |
### Grčija — vir `mascot` (Mascotnet)

Država `GR` ("Ελλάδα") — vpiše jo ta migracija (20261016090300) ali migracija
vira `eps`, kar pride prej (obe `on conflict do nothing`). Vmesnika v grščini,
kartice in pošte **še ni**, `GR` **ni** v matriki nočnega uvoza — oboje pred
vklopom. Šifra lige se začne z `gr-`.

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
### Škotska — vir `lowland`

**Pisno dovoljenje za zajem: pridobil Lovro, oktober 2026.** Pogoji uporabe
slfl.co.uk (Termageddon, 12. 10. 2026) avtomatsko branje in kopiranje sicer
prepovedujejo; robots.txt zapre le `/wp-admin/`. Dovoljenje **ne pokriva
tehnične zaščite**: ob CAPTCHI, Cloudflarovem izzivu, prijavi ali 401/403/429
se uvoz ustavi (`LowlandZavrnitev`, izhod 4) — ne obhajaj. Zavrne že
`lowlandFetch` (brez ponovitve 429, brez shranjenega razporeda pri 401).

Država `GB` (migracija 20261016090500, ime "United Kingdom" — isto kodo vpiše
tudi vir `isthmian` za Anglijo, kdor je prvi, da ime). **Šifra škotske lige se
začne z `gb-`.** Vmesnika v angleščini za državo, kartice in pošte **še ni**,
`GB` ni v matriki nočnega uvoza — oboje pred vklopom.

Vir `lowland` (`scripts/viri/lowland.mjs`) bere **Match Centre lige**
(slfl.co.uk, WordPress Scoot Digital, podatki COMET škotske zveze — "All data
provided by Comet"), HTML s strežnika. Lowland League je 5. raven (od 2026/27
East in West).

- **Šifra lige je `<tekmovanje>/<LLLL-LLLL>/<skupina COMET>`**
  (`slfl/2026-2027/54193157`). Stran `/match-centre/slfl/2026-2027/` nosi obe
  skupini (`data-mc-competition-panel="comp-<id>"`) in vse tekme sezone:
  "Fixtures" ("vs") in "Results" ("4 : 0"), po dnevih ("Saturday 17 Oct,
  2026"), igrišče, ura ("KO 15:00", **škotski čas → ljubljanski +1 h**),
  oznaka tekmovanja ("Lowland League East 2026-27"; tekma z drugo oznako se
  izpusti) in povezava `/match-centre/slfl/2026-2027/<id tekme COMET>/`.
  Ob novi sezoni se popravi sezona **in** id skupine (novi bloki COMET).
- **Krogov vir ne objavi.** Izpeljemo jih iz šifer tekem (`dodeliKroge`):
  razpored je bil ustvarjen naenkrat po dnevih, zato so šifre strnjen blok
  (East 54383300–54383536, West 54381817–54382087). Krog je zaporedje šifer
  brez ponovljenega kluba (nov krog tudi, ko se sklop dni — Tor–Čet ali
  Pet–Pon — zamenja in ga potrdi naslednja tekma). Šifra se ob prestavitvi ne
  spremeni, zato so številke stalne. Prestavljena tekma gre v krog svojega
  dne, če oba kluba tam nista zasedena (Bo'ness : Lochee 15. 9. in Lochee :
  Bo'ness 18. 11. sta zamenjali kroga); sicer ostane v svojem krogu, razen
  če je prestavljena več krogov prej — takrat gre v krog, ki na njen dan teče
  (klub ima tam dve tekmi), da rok kroga ne pade pred prejšnje kroge. Tekma z
  novo šifro (zveza prestavljeno tekmo izbriše in vpiše znova: Gala : Berwick
  `60152607`) gre v zadnji krog do svojega dne, v katerem nobeden od klubov ne
  igra. Krogi niso uradni "kolo": East ima 31 krogov (5. z dvema tekmama — dan
  pokala), West 35 (17 klubov, prost klub vsak krog).
  **Tveganje**: če zveza izbriše **cel prihodnji krog** (vse tekme dneva) in
  ga vpiše z novimi šiframi, se krogi za njim preštevilčijo. Zgodilo se še ni;
  ob padcu števila krogov (East 31, West 35) preveri razpored pred uvozom.
- **Stran tekme** nima datuma (pride s strani lige). Postavi "Starting XI" in
  "Substitutes" (dres, "C. Armour", "(c)" kapetan). **Vratar ni označen** —
  COMET ga našteje prvega (preverjeno: brez dresa 1 je prvi 25, 24, 12, 22 …),
  zato ima prvi začetnik `vratar` kot namig (kot ffm, mlsz); *Uskladi pozicije*
  z `vir = lowland`. Dogodki v stolpcu ekipe (`event home`/`event away`) z
  minuto ("90+1'" → 90): `goal`, `penalty` (gol z 11 m), `own-goal` (v
  stolpcu ekipe **strelca**, šteje nasprotniku — goli = izid to potrdi),
  `penalty-failed` (zgrešena 11-m), `yellow`, `second-yellow` (prvi rumeni je
  svoj dogodek → 1 rumeni + 1 rdeči), `red`, `expulsion` in rumeni **brez
  imena** (osebje — ne štejeta), `SUBSTITUTION` (prvi noter, drugi ven —
  **minute so točne**).
- **Identiteta je ime + klub** (šifer igralcev ni, kot fsb, ffm). Ime je
  "Priimek I." iz postave ("C. Armour" → "Armour C."; ime samo z malimi ali
  velikimi črkami se poenoti). Dogodki pišejo "PRIIMEK Ime" — igralca najdemo
  po priimku in začetnici (tudi "LINTON JAMES", "DOS SANTOS Tuacenio").
  Dva igralca z istim imenom v ekipi sta opozorilo.
- Klub: ime s strani lige (zapisnik ga vzame od tam), brez pripone "1st Team"
  ("Bonnyrigg Rose Athletic 1st Team"); ključ z "&" = "and", brez ločil.
  Celtic B Team je rezervna ekipa Celtica in je član lige.
- Šifra zapisnika v bazi je `sc<id>` (šifre COMET so v prostoru hns, fss, ffm).
- **Predpomnilnik**: v `zaPredpomnilnik` gre le stran lige z Match Centrom in
  stran tekme z obema postavama in z goli = izid. Vzdrževalna stran, izziv in
  zapisnik, ki se še dopolnjuje, se berejo znova; goli, ki se z izidom ne
  ujemajo, so 7 dni `nepopoln` (brez `imported_at`), nato opozorilo. Stran
  tekme prve 3 dni vedno sveža. Tekma z izidom, ki vrne 404, se preskoči.
- Kontumacija: 3:0 / 0:3 brez postav in dogodkov, starejša od tedna
  (`vir.kontumacije`); v sezoni 2026/27 je še ni bilo. Prestavljena tekma brez
  novega datuma iz seznama izgine (East: Bonnyrigg : Dunipace, Brechin :
  Cowdenbeath; West: Cumbernauld : Clydebank); prekinjene še nismo videli.
- **Arhiva ni**: stran je nova, `/match-centre/slfl/2025-2026/` vrne 404 —
  cene le iz tekoče sezone (oktobra ~11 odigranih krogov).
- Ista stran nosi še Lowland League Cup (pokal — ne) in SLDFL (razvojna liga
  rezervnih ekip — ne). Highland League (highlandfootballleague.com, SFG
  Software) ima le izide in drug upravljavec, North of Scotland in EoSFL/WoSFL
  imajo robots `Disallow: /` — dovoljenje za SLFL jih ne pokriva.

Preizkus v živo (15. 10. 2026, vse odigrane tekme, 3,5 s med zahtevki, brez
baze):

| liga | tekoča 2026/27 | klubov | tekem | krogov | zapisnikov | goli = izid | postav po 11 | menjav (vse z minuto) | 990 minut |
|---|---|---|---|---|---|---|---|---|---|
| gb-lowland-east | `slfl/2026-2027/54193157` | 16 | 238 | 31 | 77/77 | 77/77 | 154/154 | 598 | 139/154, ostalih 15 pojasni rdeči karton |
| gb-lowland-west | `slfl/2026-2027/54193424` | 17 | 271 | 35 | 88/88 | 88/88 | 176/176 | 705 | 159/176, ostalih 17 pojasni rdeči karton |

0 opozoril, 0 nepopolnih; 12 avtogolov, 61 golov z 11 m, 41 izključitev.
Vratar (prvi začetnik) v vseh 330 postavah.

Uvoz (ena za drugo, **brez arhiva**): `gh workflow run uvoz-lige.yml -f
liga=gb-lowland-east -f cene=true`. Liga je ~80–90 strani tekem po 3 s.
### Grčija — vir `eps`

Država `GR` ("Ελλάδα", migracija 20261016090700). Vmesnika v grščini, kartice
in pošte **še ni**, `GR` **ni** v matriki nočnega uvoza — oboje pred vklopom
(nočni uvoz vklopljene lige sicer tiho ne bere). Šifra lige se začne z `gr-`.

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
### Turčija — vir `tff`

Vir `tff` (`scripts/viri/tff.mjs`) bere **tff.org** (Türkiye Futbol
Federasyonu): Trendyol 1. Lig (raven 2, ena skupina, 20 klubov, 38 tednov),
Nesine 2. Lig (raven 3, skupini Beyaz in Kırmızı), Nesine 3. Lig
(raven 4, v 2026/27 tri skupine po 18 klubov) in Profesyonelliğe Geçiş Ligi
(PGL, raven 5, nekdanji BAL, 12 skupin po 10–14 klubov, prvi krog 17.–18. 10.
2026). Pokrajinske amaterske lige (Süper Amatör in nižje, ASKF) na tff.org
niso. **Süper Lig namenoma ni vpisana**: TFF ima svojo fantasy igro, pogoji
so nekomercialni — o njej odloči lastnik posebej. Država `TR` ("Türkiye") in zveza `tff` vpiše migracija lig; vmesnika v
turščini, kartice, pošte in `TR` v matriki nočnega uvoza **še ni** — oboje
pred vklopom (`TR` je le v `SKUPEN_VIR`, da ročni uvozi turških lig tečejo
eden za drugim). Šifra lige se začne s `tr-`.

- **Kodiranje**: ASP.NET iz strežnika v **windows-1254**. `vir.fetch`
  (`tffFetch`) bajte pretvori v UTF-8; brez tega so ğ, ı, İ, ş pokvarjeni.
- **Šifra lige je `<pageID>/<grupID>`**: stran tekmovanja ene sezone in
  skupina. 2026/27: 2. Lig `976`, 3. Lig `971`, PGL `1596`; 2025/26: 2. Lig
  `1769`, 3. Lig `1770`, BAL `1793` (seznam sezon: arhiv 2. Lig `pageID=371`,
  3. Lig `376`, PGL `1290`). Vsaka sezona ima nove številke obeh.
- **1. Lig je brez skupin: šifra je le `<pageID>`** — `142` (stran lige, ki
  kaže tekočo sezono; ob novi sezoni dobi zaključena svojo številko), arhiv
  2025/26 `1772` (seznam sezon `pageID=563`). Predloga tedna je druga:
  `default.aspx?pageID=142&hafta=<n>`, zavihek "10.Hafta" (`…_hs_Tab2`) in
  vrstice `dtlHaftaninMaclari` (domači Label4, gostje Label1, izid
  Label5/Label6, `macId`, `kulupID`); `tekmeTedna` in `obreziTeden` za šifro
  brez skupine bereta le ta blok. Na isti strani sta še play-off (`kupaMaclari`,
  maja) in fiksture vse sezone brez datumov — ne beremo ju. Zapisnik je isti
  kot pri nižjih ligah. Neznan teden (`hafta=99`) kaže prazen "99.Hafta".
- **Ime kluba po šifri** (`IME_KLUBA` v viru): 1. Lig ima sponzorje v imenu in
  jih menja vsako sezono ("ÖZBELSAN SİVASSPOR" 2025/26 → "EKENLER BETON
  SİVASSPOR"); brez preslikave bi arhiv isti klub vpisal še enkrat. Pregled
  15. 10. 2026 (1. Lig obeh sezon proti 2./3. Lig, PGL, BAL): 10 preimenovanih
  (devet v 1. Lig, Hatayspor v 2. Lig), **0 trkov** (isto ime, druga šifra).
  Ob novi sezoni pregled ponovi.
- **Razpored** je po tednih: `default.aspx?pageID=<p>&grupID=<g>&hafta=<n>`
  (zavihek "<skupina> (<n>.hafta)", vse tekme kroga z datumom, uro, kluboma s
  šifro `kulupID`, izidom in `macId`). Število tednov povedo povezave
  `hafta=`. Neznan teden ali skupino stran tiho zamenja — vir preveri zavihek in
  se ustavi. Ura je istanbulska (UTC+3 vse leto) → ljubljanska (poleti −1 h,
  pozimi −2 h). Celotna stran 3. Lig ima 640 kB (fiksturji vseh skupin, brez
  datumov); v predpomnilnik (`scripts/.predpomnilnik/tff/hafta-…`) gre le
  tedenski del (`obreziTeden`). Odigran teden (vsi izidi, zadnja tekma > 3 dni)
  se bere enkrat na teden do 45 dni (disciplinska komisija izid pozneje
  spremeni v hükmen 3:0, `kontumacije` pa gleda izide tedna), starejši ne
  več; teden od −10 do +7 dni vsako uro, poznejši na 3 dni.
- **Ime kluba** je zadnje, ki ga strani tednov povedo za `kulupID` (klub 4485
  je v starih fiksturjih "BEYKOZ İSHAKLI …", zdaj "BÜYÜKÇEKMECE GÜCÜ …");
  zapisnik vzame ime, krog in datum s strani tedna. Ključ kluba je po turško
  (`toLocaleLowerCase('tr')`: I → ı, İ → i), kratko ime brez "Spor Kulübü",
  "A.Ş." ("Kdz.Ereğli 1980", "Orduspor 1967").
- **Zapisnik** `Default.aspx?pageId=29&macId=<id>` (šifra v bazi `tr<id>`): za
  vsako ekipo "İlk 11" (dres "47." in igralec s **stalno šifro osebe**
  `kisiId` → `reg_st`), "Yedekler" (klop), "Goller" ("IME,47.dk (H)": F noga,
  H glava, P 11 m, K avtogol — vpisan pri **strelčevi** ekipi, šteje
  nasprotniku; S = izvajanje 11 m po tekmi, ne šteje), "Kartlar" (Sarı Kart,
  Kırmızı Kart, Çift Sarı Kart = drugi rumeni, prvi rumeni ni vpisan posebej →
  1 rumeni + 1 rdeči ob isti minuti), "Oyundan Çıkanlar" in "Oyuna Girenler"
  (izstop in vstop z minuto, par po minuti; "90+3.dk" → 90). Ime "MÜCAHİT
  ÇAKIR" → "Çakır Mücahit". **Vratarja in pozicij ni** (prvi začetnik ni
  vratar: dresi 47, 34, 25 …) — vse pozicije, tudi GK, določi glasovanje;
  *Uskladi pozicije* za `tff` nima česa šteti. Sodnikov, opazovalcev,
  stadiona in trenerjev ne beremo; vzorci `scripts/vzorci/tr-tff-*` so brez
  njih.
- **Neodigrana tekma** ima glavo z datumom brez izida; **kontumacija** (hükmen)
  ima izid 3:0 / 0:3, opombo "Esame Bilgileri Kulüpler Tarafından
  Girilmektedir", brez ure in brez ene ali obeh postav (Yeni Malatyaspor,
  3. Lig 03, 3. in 11. 10. 2026; BAL 2025/26 pogosto z le domačo postavo).
  `vZapisnik` vrne null, `vir.kontumacije` jo označi po tednu dni.
- **Izid brez strelcev** (manj golov kot izid, `manjkajoGoli`): TFF strelce
  vpiše pozneje. Do 45 dni je tekma `nepopoln` (opozorilo `zapisnik
  nepopoln`, `imported_at` prazen, borza čaka) in jo vsak uvoz bere sveže;
  starejša gre skozi z opozorilom `goli … se ne ujemajo z izidom`.
- Imena: TFF ime kluba včasih odreže ("… SPORTİF FAALİYET SPOR KULÜ").

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt ni (404),
izziva ni. Pogoji uporabe (`default.aspx?pageID=179`): "Sitede yer alan
bilgiler, kaynak gösterilmek suretiyle yayımlanabilir; ancak bu bilgiler
ticari amaçlarla kullanılamaz" — objava **z navedbo vira** (`vir_ime` TFF,
`vir_url` → tff.org v nogi), **ne v komercialne namene**. SLFF je brezplačen,
zato zdaj ustreza. **Pogoj za ponovni pregled: ko SLFF zasluži karkoli
(oglasi, sponzorji, plačljivi preverjeni igralci, pivo), potrebujemo pisno
dovoljenje TFF ali turške lige izklopimo.** Beremo odkrito (User-Agent
`SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, zaključenih tednov in
zapisnikov ne beremo znova). **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi —
ne obhajaj** (`TffZavrnitev`, izhod 4 — na strani tedna in tekme, oboje gre
skozi `prenesiStran`; 401, 403 in 429 vrže že `vir.fetch` (`tffFetch`), brez
ponovitev, zato tudi uvoz razporeda in kontumacije ne vzamejo shranjene strani). V predpomnilnik gre le prava stran (`vir.zaPredpomnilnik`:
zapisnik z glavo, teden z zavihkom) — napaka strežnika s statusom 200 ne. Če nas TFF prosi, naj nehamo, `tr-`
lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo, ~150 zahtevkov): tabela
spodaj; vse prebrane postave 11 + 11, goli = izid, menjave z minuto, 0
opozoril. 3. Lig 01 v celoti: 34 tednov, 306 tekem, 18 klubov. Ekipa ima 990
minut razen pri rdečem kartonu.

| liga | tekoča 2026/27 | zapisnikov (goli = izid, postav po 11, s klopi) | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| tr-1-lig | `142` (20 klubov, 38 tednov) | vseh 97 odigranih do 15. 10.: 97 (254, 194/194, 893; 6 avtogolov, 19 z 11 m, 21 rdečih) | `1772` (13 od 20; 5 tednov, 50 zapisnikov: 148, 100/100, 430) |
| tr-2-lig-beyaz | `976/3541` | 12 (36, 24/24, 103) | `1769/2781` Kırmızı (8 od 18) |
| tr-2-lig-kirmizi | `976/3542` (17 klubov) | 12 (39, 24/24, 112; 2 avtogola) | `1769/2782` Beyaz (7 od 19) |
| tr-3-lig-1 | `971/3543` | 12 (34, 24/24, 110) | `1770/2785` 03 (9), `1770/2783` 01 (7) |
| tr-3-lig-2 | `971/3544` | 12 (24, 24/24, 111) | `1770/2786` 04 (11) |
| tr-3-lig-3 | `971/3545` | 10 + 2 kontumaciji (42, 20/20, 94) | `1770/2784` 02 (11) |
| tr-pgl-1 … tr-pgl-12 | `1596/3938` … `1596/3949` (12 skupin, 10–14 klubov, 22 ali 26 tednov) | 2026/27 še ni odigrana (1. krog 17.–18. 10.); BAL 2025/26: 47 (97, 94/94, 414) | spodaj |

Arhiv je izbran po skupnih klubih (šifre `kulupID` iz fiksturjev obeh sezon);
vsak arhiv ima ena sama liga. 2. Lig je med sezonama skupini premešala, zato
je arhiv šibek. PGL 2026/27 ima 12 skupin, BAL 2025/26 jih je imel deset;
PGL je nova raven: najboljši klubi BAL in izpadli iz 3. Lig (ta ima zdaj tri
skupine namesto štirih). Skupnih klubov z BAL je največ 6 od 10–14, zato je
arhiv šibek; izpadli iz 3. Lig dobijo ceno iz višje lige sami (`reg_st` =
`kisiId`, isti vir), če je 3. Lig uvožena. Predlog (vsak BAL arhiv enkrat,
`1793/<grup>`): PGL 1 `3306` (4), 2 `3304` (3), 3 `3302` (4), 4 `3309` (3),
5 `3310` (6), 8 `3301` (3), 10 `3308` (5), 11 `3305` (3), 12 `3307` (5);
PGL 6, 7 in 9 brez arhiva (`3303` ima z njimi le 1 klub). BAL 2025/26 preizkus
(teden 10 vsake od 10 skupin): 47 zapisnikov in 3 kontumacije z le domačo
postavo, goli = izid 97/97, 94/94 postav po 11, 414 nastopov s klopi, 2
avtogola, 12 golov z 11 m, 0 opozoril. **PGL pred uvozom preveri na prvem
odigranem krogu 2026/27.**

1. Lig (15. 10. 2026, 135 + 88 zahtevkov): tekoča sezona 38 tednov, 380
tekem, 20 klubov, 97 z izidom — vsi zapisniki 11 + 11, menjave z minuto (893),
goli = izid 96/97 (tekma 318188, Mardin : Karagümrük, se je ta dan šele
končala: izid 1:0 brez vpisanega strelca, tudi zvečer še brez), 990
minut 177/194, ostalih 17 pojasni rdeči karton. Arhiv `1772` (tedni 1, 10,
19, 28, 38): 50 zapisnikov, goli = izid 50/50, 990 minut 90/100 (10 z rdečim),
0 opozoril. Imena tujcev so po turško ("Gıannı", "Cebıo"): TFF jih piše z I
brez pike, od turških (YILMAZ, AYDIN) se ne dajo zanesljivo ločiti.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=tr-1-lig -f
arhiv=1772 -f cene=true` (38 strani tednov in ~480 zapisnikov po 3 s — prvi
uvoz okoli 30 minut), `gh workflow run uvoz-lige.yml -f liga=tr-3-lig-1 -f
arhiv=1770/2785,1770/2783 -f cene=true`. Liga je 34 strani tednov in ~300
zapisnikov po 3 s — prvi uvoz okoli 20–30 minut.

### Država obiskovalca

Domena je ena, **lige druge države so skrite**: `useTekmovanje().tekmovanja`
vrne le lige države, ki jo obiskovalec gleda (izbirnik, okno prvega obiska,
državna lestvica); vse lige so v `vsaTekmovanja` (vstop `/sk`, admin). Nova
stran, ki našteva lige ali ekipe več lig, mora filtrirati po državi.
Država sledi ligi. Vrstni red (`zacetnaLiga` v `src/lib/drzava.ts`):

1. **Kdor ligo ima** (`?t=` ali shranjena `slff-tekmovanje`), ostane pri njej —
   ugib ga ne premakne, tudi če ima slovaški brskalnik ali IP.
2. **Prijavljen brez shranjene lige** (nova naprava) dobi ligo svojih ekip
   (`ligaEkip`: država z največ človeškimi ekipami, ob izenačenju prva ekipa).
3. **Nov obiskovalec** dobi privzeto ligo ugibane države (`ugibajDrzavo`):
   izbira s povezave `/sk` ali izbirnika (`slff-drzava`) → **IP** →
   jezik brskalnika → časovni pas → nič (Slovenija, `PRIVZETO`).

IP pove edge funkcija `api/drzava.ts` (glava `x-vercel-ip-country`, odgovor
`{ drzava }`, `no-store`, nič ne beleži). Kliče jo le, kdor lige in države še
nima, in po 800 ms odneha; `vite dev` funkcije nima (vrne index.html), zato
lokalno ugib teče brez IP. SPA preusmeritev v `vercel.json` izpusti `/api/`.
Država brez aktivne lige ostane pri `PRIVZETO`. Jezik se popravi šele, ko je
začetna liga odločena (`ustaljena`), sicer bi se stran med čakanjem na ugib
naložila dvakrat.

**Tujec** je nov obiskovalec (brez lige, brez `?t=`, `/sk`, `/si`, prijavljen
brez ekip), čigar IP je iz države **brez aktivnih lig** (CZ, AT, DE, HR, GB …;
`jeTujIp`). Ne pristane tiho v Sloveniji: kontekst lige zapiše `slff-tujec`
(koda IP) in da `vprasajDrzavo`, okno prvega obiska pa najprej vpraša po
državi ("🇸🇮 Slovenija · 🇸🇰 Slovensko", iz `vsaTekmovanja`), nato po ligi te
države. Do izbire je za oknom ugibana država (za večino Slovenija). Vmesnik je
v **angleščini**, razen če je prvi jezik brskalnika eden od naših
(`jezikTujca`). **Odločitev o tujcu pade le na goli naslovnici** — pot `/`
brez `?t=` in brez shranjene lige ob nalaganju strani (`naGoliNaslovnici` v
`drzavaUgib.ts`): le tam se zapiše `slff-tujec` in le tam okno vpraša po
državi. Robot (`jeRobot` po `navigator.userAgent`: Googlebot, bingbot,
facebookexternalhit …) ni nikoli tujec (`zaznajTujca`). Kdor pride naravnost na drugo stran (`/player/*`, `/club/*`,
`/match/*`, `/table`, `/players`, `/results`, `/standings` …) brez oznake,
vidi jezik države lige (privzeta liga = slovenščina) — tako ima vsak naslov
en jezik tudi za iskalnik z ameriškega IP-ja (Googlebot strani ne hrani
shrambe). Že zapisana oznaka velja povsod: angleščina ostane tudi po izbiri
lige ali države. Neuspel IP (napaka, 800 ms, `vite dev`) ni tujec —
velja stari ugib brez vprašanja. SI in SK IP gresta naravnost v svojo državo.
Lokalno tujca preizkusiš z `localStorage.setItem('slff-tujec', 'CZ')` v
brskalniku brez shranjene lige.

**Izbira države** (`src/components/IzbiraDrzave.tsx`, "🇸🇮 Slovenija · 🇸🇰
Slovensko") je v nogi in na vrhu izbirnika lige; pokaže le države z aktivnimi
ligami. `preklopiDrzavo` zapiše državo, privzeto ligo in jezik v brskalnik in
naloži naslovnico nove države — ekip in strežnika se ne dotakne. Okno prvega
obiska ima isto povezavo ("Slovenija?"), ki pa ligo pusti neizbrano, da okno
vpraša znova z ligami nove države.

**Vstopne povezave** `slff.eu/si`, `/sk`, `/at` … (`VstopDrzave.tsx`) so
prave strani: ime države in vse aktivne lige po zvezah (domača stran in
lestvica), v jeziku države (`drzavaVstopa` v `izberi()`), kanonični `/at`,
brez okna prvega obiska. Ligo izbere
klik (`/?t=…`, shrani se kot vsaka izbira); kontekst lige na njih `?t=` ne
piše. **Kampanja** (`?src=…` ali
`utm_*`) gre po starem naravnost v privzeto ligo države (`location.replace`).
Država brez aktivne lige preusmeri na `/` (strežnik HTML: 404 z `noindex`).
Isto vsebino za iskalnike izriše strežnik HTML (`drzava` v `streznik.mjs`).
**Kampanjska povezava mora nositi `src` ali `utm_*`**, sicer kaže vstopno
stran, ne lige; države si vstopna stran ne zapomni, le kampanja.

**Slovaška je odprta** za vse (ugib po IP in jeziku). **Državo zapreš** tako,
da jo dodaš v `SAMO_S_POVEZAVO` v `src/lib/drzavaUgib.ts` (npr. `['SK']`):
lige ostanejo vklopljene, a IP, jezik in pas je ne odprejo — vanjo pride le,
kdor ima povezavo `/sk` ali `?t=sk-…` (ali jo izbere v izbirniku).

Nova Gorica menija za pretekle sezone nima — stara sezona je svoje tekmovanje
s svojo šifro in do nje ne vodi nobena povezava, zato jih je treba prečesati.
Neznana šifra vrne privzeto stran s **statusom 200**, ne 404, zato je iz
vzorca lahko napačno sklepati, da arhiva ni. Starejše sezone so v drugačni
obliki: `2163` (2023/24) da 0 golov in 193 od 220 postav ni po 11 igralcev.
Zato vsak arhiv preštej, preden ga uvoziš.

Ena arhivska sezona ni vedno dovolj. Cena je percentil znotraj lige, igralec
pod 270 minutami pa dobi privzeto 4.5 — v majhni ligi (MNZ liga ima devet
klubov) toliko minut v eni sezoni nabere premalo igralcev in cenik se sesede
v eno samo številko. Takrat uvozi še eno sezono nazaj in `ovrednoti-igralce`
poženi **brez** `--sezona`, da sešteje vse.

**Novinec iz višje lige** ni pri 4.5 (pritožba s Hrvaške, 13. 10. 2026).
Igralec pod 270 minutami, ki ima isto šifro osebe (`reg_st`) v višji ligi
iste države in **istega vira** in tam vsaj 270 minut v zadnjih dveh sezonah,
dobi ceno iz tamkajšnje: percentil, prebran iz cene, vsaka raven višje zapre
20 % razdalje do vrha (največ tri), nato meje pozicije te lige; le navzgor
(`scripts/visja-liga.mjs`, `ovrednoti-igralce` izpiše seznam "Cena iz višje
lige"). Raven lige je pravilo po šifri in imenu v `ravenLige`, ne stolpec:
HR (državne lige, županijske po imenu le znotraj iste zveze), SK, HU, ES, EE,
LV, TR (1. Lig nad 2. Lig nad 3. Lig nad PGL) po uradni piramidi, AT le državne nad deželnimi; mladinske se primerjajo le
z mladinskimi. Brez pravila (SI, RS, RO, PL, CZ, MK) in brez šifer osebe ostane
4.5. Ob novi ligi z novim poimenovanjem ravni preveri `ravenLige` (smoke).
Na vklopljeni ligi pride do nove cene le **tedensko prevrednotenje** (največ
1.0 na teden, sidro potuje z njo) — tudi pri igralcu, ki je že na borzi,
a le navzgor do cene iz višje lige.

**Pragovi glasovanja so po tekmovanju** (`competition_settings`, brano prek
`nastavitev_int_za`). Trije glasovi so v ligi z dvesto igralci lahek dosežek
in v ligi z dvajsetimi nedosegljiv; kar tekmovanje nima svojega, pride iz
globalnega `settings`. Zaupanje glasovalca (`voter_weight`) ostaja globalno —
je lastnost človeka, ne lige.

## Razčlenjevanje pri več virih

Oba vira uporabljata isti CMS, a ne pišeta enako. Kar se je izkazalo:

- **Stolpce naslavljaj po glavi tabele, ne po zaporedju.** Ljubljana ima
  stolpec `Leto rojstva`, ki ga Kranj nima.
- **Letnica ima lahko dve ali štiri števke** (`05.09.26` proti `05.09.2026`).
- **Sezono beri v naslovni vrstici nad `Zapisnik:`**, ne kjerkoli na strani —
  Ljubljana ima v meniju spustni seznam vseh sezon od 2006/07.
- **Razpored se konča pri bloku rezultatov**, ki se pri Kranju imenuje
  `REZULTATI`, pri Ljubljani `REZULTATI TEKEM`. Pod njim so rezultati DRUGE
  lige in brez tega konca pristanejo v bazi kot dodatni krogi te.

Vsi štirje so se končali **brez sporočila o napaki**: uvoz je poročal uspeh in
vpisal smeti. Zato so v `scripts/vzorci/` shranjeni zapisniki in razporedi
obeh zvez, `npm run smoke` pa jih preveri brez omrežja. **Ob novem viru dodaj
vzorec** — sicer se prvi tak hrošč opazi šele na lestvici.

## Glavni koncepti podatkovnega modela

Podroben opis vseh tabel, pogledov in RPC (borza, točkovanje, statistika,
mini lige, prevzem profila, preverjeni igralci in Stripe, uradne odsotnosti,
klubski računi, pošta in push, anonimizacija, pivski zid, želje lig …) je v
**`docs/podatkovni-model.md`** — preberi ustrezni razdelek, preden spreminjaš
to področje. Bistvo, ki ga je treba vedeti vedno:

- `players` (realni igralci, vrstica na ligo), `teams` (klubi, skupni),
  `rounds`, `matches` (`zapisnik_id`, `kontumacija`, `vir_brez_izida`),
  `appearances`, `goals`; `fantasy_teams`, `fantasy_roster`,
  `fantasy_lineups` (posnetek ob roku), `fantasy_chips` (filtriraj po sezoni).
- **Izračunane tabele potrebujejo sprožilce**: `tocke_krogov` (lestvice),
  `statistika_igralcev`, `player_scores`. Nov vhod v izračun = nov sprožilec,
  sicer številke zaostajajo do noči (`npm run preizkus-tock-krogov`,
  `npm run preizkus-statistike`).
- **Ekipe so zasebne**: sestavo vidi le lastnik in admin
  (`sme_videti_ekipo`). Funkcija, ki bere tuje posnetke, teče kot lastnik
  sheme in sama pazi, kaj vrne. Izbranost je NULL pod 5 človeškimi ekipami.
- **Hišne ekipe** (`fantasy_teams.hisna`) se ne štejejo v izbranosti,
  državni lestvici, pošti, mini ligah in statistiki — nova poizvedba, ki šteje
  ljudi ali ekipe čez lige, naj izpusti `hisna` (`docs/hisne-ekipe.md`).
- **Soimenjak pri drugem klubu ni samodejno prestop** (`prestopSkladen` v
  `scripts/prestop.mjs`); šifra (`reg_st`) je identiteta.
- **Pravila se ne smejo spremeniti za nazaj**: borza
  (`rounds.borza_po_starem`, `borza_z_odmikom`) in točkovanje
  (`rounds.pravila_tockovanja`, kopija v `src/lib/tockovanje.ts`) imata
  različice po krogih.
- Uvozi berejo prek `prenesiSPonovitvami` in pišejo prek `fetchZaBazo()`
  (`scripts/prenos.mjs`); nastope tekme zamenja `zamenjaj_nastope_tekme` v eni
  transakciji. Nov idempotenten RPC uvoza dodaj v `PONOVLJIVI_RPC`.
- **Anonimiziran igralec** (`players.anonimiziran_at`): uvoz imena in šifre
  nikoli ne povozi (`anonimizirani_igralci`, `scripts/anonimizacija.mjs` ↔ SQL
  `anonimizacijski_kljuc`).
- Obiski (`zabelezi_obisk`): **nova stran se ne šteje sama** — dodaj jo v
  `PO_POTI`/`PO_PREDPONI` (`src/lib/obiski.ts`) in v `zabelezi_obisk()`.
- Zemljevid strani: nova javna stran lige gre v `STRANI_LIGE` v
  `scripts/sitemap.mjs`.
- Plačila (preverjeni igralci, Stripe): stikalo `preverjeni_racuni`, webhook
  `stripe-webhook`, **preklic naročnine mora biti vedno mogoč**; vse v
  `docs/podatkovni-model.md` (*Preverjeni igralci*).

## Mobilna aplikacija

Capacitor zapakira `dist/` (`ios/`, `android/`; načrt in gradnja v
`docs/mobilna-aplikacija.md`, objava v `docs/trgovine/`). Koda je ista kot na
spletu; kar je drugače, je v `src/lib/platforma.ts`:

- **Povezava, ki gre ven** (deljenje, vabila, e-pošta), se začne z `izvor()`,
  ne z `window.location.origin` — v aplikaciji je izvor `capacitor://localhost`.
- `navigator.share` je v aplikaciji nadomeščen s Capacitor Share (tudi slike),
  zato deljenje kliče kar `navigator.share`.
- E-poštne povezave vodijo na `/auth/confirm?token_hash=…` (predloge v
  `supabase/templates/`), ne prek supabase.co — Universal/App Links ne sledijo
  preusmeritvi. Prijava z Googlom/Applom v aplikaciji gre prek sistemskega
  brskalnika in sheme `eu.slff.app://auth`; sejo prevzame `NativnePovezave`.
- Administracija je v aplikaciji skrita (`jeNativno()`).
- **OTA:** vsak build zapiše `dist/app/<commit>.zip` in `latest.json`
  (`otaSvezenj` v `vite.config.js`); aplikacija (`src/lib/ota.ts`,
  `@capgo/capacitor-updater`) novo kodo s slff.eu prenese sama in jo zamenja
  ob naslednjem zagonu. Grbov ni v zipu — v aplikaciji se berejo s slff.eu
  (`naslovSlike`). **Nativna sprememba** (nov vtičnik, dovoljenje, ikona) gre
  le prek trgovine: takrat dvigni `slff.otaMinBuild` v `package.json` na
  številko nove gradnje, sicer stara aplikacija dobi kodo, ki pri njej ne dela.
- `settings.min_app_verzija` ostane varovalo za gradnje, ki jih OTA ne more
  rešiti (prestara nativna različica).
- `src/lib/platforma.ts` uvažajo tudi `src/lib` datoteke, ki jih berejo
  skripte — tam ga uvažaj s končnico `.ts`.

## Strežnik HTML (iskalniki, kartice)

Caddy javne strani (`/`, `/table`, `/player/*` …) pošlje strežniku HTML
(`scripts/hetzner/html/streznik.mjs`, kontejner `slff-html`), ki v predlogo
vpiše naslov, opis, og:, kanonični naslov, JSON-LD in povzetek. Podrobnosti
(varovalo, predpomnilnik, objava, preizkus): `docs/streznik-html.md`.
Bistvo: nov niz zanj dodaj v `KLJUCI` v `vite.config.js`; `zDrzavo` v
`src/lib/naslov.ts` ima kopijo v `streznik.mjs` (smoke ju primerja); nova
javna stran za iskalnike = `SEZNAMI`/`ENTITETE` v `streznik.mjs` in pot v
`@html_strani`. CI ga ne objavi (`scripts/hetzner/objavi-html.sh`).

## Smernice za razvoj

- Uporabniško vidni nizi **niso v komponentah**, ampak v slovarju
  `src/i18n/sl/<področje>.ts` in se berejo s `t('področje.ključ', { … })`
  (glej *Prevodi* spodaj). Slovenščina je izvor; nov niz vedno dodaj tja.
- Ohrani kodo preprosto in berljivo; to je skupnostni projekt, ne enterprise.
- Preden dodaš novo odvisnost, preveri ali je res potrebna.
- Ob spremembi podatkovnega modela posodobi tudi README in to datoteko.

## Pošta klubom (stiki)

Klubom pišemo trije (vsak s svojim Claudom). Skupni seznam je v bazi
(`klub_stik` = naslov kluba s stanjem, `klub_stik_posta` = vsak mail z
besedilom). **Obvezno, vsakič:**

1. **Pred** mailom klubu: `node scripts/stiki-klubov.mjs preveri <klub ali naslov>`.
   **Ne piši** (in povej človeku), če je stanje `odgovoril` / `ne_zeli` /
   `napacen_mail` / `sodeluje`, če je klub v zadnjih 7 dneh dobil mail od
   **koga drugega** ali v zadnjih 3 dneh od kogarkoli (načrtovan opomnik
   istega pošiljatelja po 3+ dneh je v redu).
2. **Po** poslanem mailu: `node scripts/stiki-klubov.mjs zabelezi --za <naslov>
   --vrsta prvi|opomnik --poslal <ime> --zadeva "…" --telo-datoteka <datoteka>`
   (nov naslov še `--klub "…" --drzava SI|SK|HR|CZ|HU|AT|RS|RO|EE|PL|ES|LV [--liga …]`). Pri paketih
   beleži sproti, po vsakem mailu, ne na koncu.
3. Odgovor kluba: `zabelezi --vrsta odgovor --opomba "<povzetek>"`; dogovor ali
   zavrnitev: `nastavi --za … --stanje sodeluje|ne_zeli`.

Ključ stikov je v `~/.config/slff/stiki-kljuc` ali `SLFF_STIKI_KLJUC` (da ga
admin; **repo je javen, ključ in naslovi nikoli v git**). Brez ključa ne
pošiljaj — vprašaj človeka. Funkcije: migracija `20261008143100_stiki_kljuc`.

Samodejno pošiljanje iz luka@slff.eu (vrsta, delavec `slff-posta` na
strežniku, okna, polnjenje po državah, objava): `docs/posta-klubom.md`.
CI ga ne objavi (`scripts/hetzner/objavi-posto.sh`).

## Samodejne objave (Instagram, Facebook)

Delavec `slff-objave` (`scripts/objave.mjs`) pripravi **vsak dan** osnutek
(ponedeljek vrtiljak držav, četrtek dosežki, ostali dnevi po dve vrsti, ki se
menjata po sodem/lihem tednu ISO; torek in sobota sta **reela** z glasbo iz
`scripts/objave-glasba/`, slika delavca ima ffmpeg), mejnike uporabnikov, jih
pošlje na Discord z gumbom "Ustavi" in jih ob roku objavi. Dan brez novice
izpade (brez polnila). Vse podrobnosti: `docs/objave.md`.
Bistvo: **objava le slavi** (nikoli padec cene ali slaba predstava, nikoli
mladinske lige, anonimizirani igralci, hišne ekipe, imena uporabnikov);
`npm run preizkus-objav`; CI je ne objavi (`scripts/hetzner/objavi-objave.sh`).

## Poti

Poti so **angleške** (`/my-team`, `/players`, `/match/:id` …), ker jih vidi
vsaka država. Stari slovenski naslovi (`/moja-ekipa` …) so v `STARE_POTI`
v `src/App.tsx` in preusmerijo na nove s parametri, poizvedbo in #, zato
deljene povezave in e-pošta ostanejo veljavne. `/novo-geslo` je izjema: je
vpisana pri Supabase kot povratni naslov ponastavitve gesla in žeton nosi v
#, zato stran velja na obeh naslovih. Nova stran dobi angleško pot.

Iste preusmeritve naredi tudi Caddy s statusom 301 (razen `/novo-geslo`), in
pot, ki ni nobena stran v `<Routes>`, dobi SPA s **statusom 404** (`@ni_strani`
v `scripts/hetzner/Caddyfile`) — **nova stran gre tudi na ta seznam**, sicer
iskalnik dobi 404. Neznan id (`/player/999999999`) ostane 200, stran pa nastavi
`useNoindex`. Zasebne strani in strani uporabnikov (`/my-team`,
`/mini-leagues`, `/login`, `/account`, `/team/*`, `/l/*` …, `@zasebne`) dobijo
glavo `X-Robots-Tag: noindex`; nova taka stran gre tudi tja.

Notranje povezave uvažajo `Link`/`NavLink` iz `src/components/Povezava.tsx`,
ne iz `react-router-dom`: ta doda izbrano ligo (`?t=`), da iskalnik ne pristane
v privzeti. Povezava na igralca, klub, tekmo ali ekipo druge lige ligo poda
sama z `zLigo(pot, slug)`; stran entitete z `useKanonicnaLiga(slug)` pove
kanonični `?t=` po svoji ligi.

## Prevodi

`src/i18n/index.tsx` je celoten sistem, brez knjižnice:

- `t(kljuc, parametri)` — ključ je tipiziran (napačen javi `typecheck`),
  `{ime}` v nizu se zamenja s parametrom. Kliče se lahko kjerkoli, tudi zunaj
  Reacta (slike na platnu, `lib/`): jezik se izbere ob nalaganju strani in se
  med obiskom ne menja.
- **Slovar drugega jezika je svoj kos** (`NALAGALNIKI` v `jedro.ts`), ki ga
  `main.tsx` naloži pred prvim izrisom (`naloziSlovar`); v svežnju je le
  slovenščina. Zato **ne kliči `t()` na vrhu modula** (konstanta ob uvozu bi
  ostala slovenska): napiši funkcijo ali getter (`get naslov() { return t(…) }`).
  Smoke to preveri (`prezgodnjiKljuci`).
- Strani razen naslovnice so v `App.tsx` `lazy()` kosi; nova stran naj bo prav
  tako. Po objavi stari kosi izginejo, zato `main.tsx` ob `vite:preloadError`
  stran naloži znova.
- Množina je objekt oblik po `Intl.PluralRules` (`one/two/few/other`) in se
  izbere po `n`: `t('skupno.besede.tocke', { n })`. Za "4 točke" je v
  `lib/pomozno` `mnozina(n, TOCKE)`. **Ne sestavljaj končnic sam.**
- `tx(kljuc, parametri, oznake)` za stavek z elementom (povezava, krepko):
  niz `"Preberi <pogoji>pogoje</pogoji>."`, oznaka vrne element. Stavka ne
  trgaj na kose, prevajalec mora imeti celoto.
- Datume in števila oblikuj z `datum`, `datumUra`, `ura`, `stevilo` iz
  `src/i18n` — nikoli `toLocaleString('sl-SI')`.
- Drugi jezik (`src/i18n/hr/`) je lahko delen; manjkajoče pride iz
  slovenščine. `npm run prevodi -- hr` izpiše, kaj manjka. Brskalnik izbere
  jezik sam šele, ko je v `PRIPRAVLJENI` (`sl`, `hr`, `sk`, `cs`, `hu`, `de`, `sr`, `ro`, `et`, `pl`, `es`, `lv`, `mk`, `en`). Hrvaščina,
  slovaščina, češčina, madžarščina, nemščina, srbščina, romunščina, estonščina, latvijščina, makedonščina in angleščina so popolne — smoke preveri, da imajo vse ključe ter iste
  `{parametre}` in `<oznake>`; nov slovenski niz zato dodaj v vseh devet.
- **Kateri jezik** (`zeljenJezik` v `src/lib/drzavaUgib.ts`, isto pravilo v
  `izberi()` ob nalaganju in v varovalu konteksta lige):
  1. izbira z izbirnika **"SL · SK · EN"** (`IzbiraJezika`, v nogi in na vrhu
     izbirnika lige; `izberiJezik` zapiše `slff-jezik-izbran` in stran naloži
     znova),
  2. tujec (oznaka se zapiše le na goli naslovnici, glej *Država
     obiskovalca*) → angleščina, razen prvega jezika brskalnika, ki ga imamo,
  3. jezik države lige (`JEZIK_DRZAVE`) — Slovenci in Slovaki kot doslej.
  `slff-jezik` je le zadnji uporabljeni jezik (samodejni popravek), ne izbira.
- **Angleščina** (`src/i18n/en/`, `en-GB`: "3 Oct", decimalna pika, cena
  `€13.2M`) služi obema državama, zato niz ne imenuje države ("National",
  ne "Slovenia"). Izrazi kot v FPL (squad, starting XI, bench, captain,
  vice-captain, transfers), `krog` je vedno **round**. Imena lig, klubov in
  igralcev se ne prevajajo, imena držav v izbirniku države ostanejo v svojem
  jeziku (Slovenija, Slovensko).
- Nizi iz baze (razlogi `razlog_neveljavne_ekipe`, napake RPC) so
  slovenski. Razlog neveljavne ekipe vmesnik za sk in en prevede po obliki
  stavka (`prevediRazlog`); napake RPC ostanejo slovenske. Administracija
  ostaja slovenska.
- **E-pošta.** Opomnike in opozorila (`supabase/functions/posli-opomnik/
  sporocila.ts`) piše funkcija v jeziku **države lige** (ena liga na klic,
  zato ima kdor igra v obeh državah dva maila); povezave nosijo `?t=<liga>`,
  razlog iz baze se za slovaščino prevede po obliki stavka. Smoke preveri
  obe različici. Angleške pošte ni: registracija v angleškem vmesniku
  zapiše `jezik` države lige, ki jo gleda. Nov jezik = nova veja v `sporocila.ts` in vrstica v
  `JEZIK_DRZAVE` tam. Funkcij CI ne objavi: po združitvi
  `scripts/hetzner/objavi-funkcije.sh` (rsync na VM, kopija prejšnje, ponovni
  zagon). Tedenski mail "tvoj krog" (`tedenski-pregled.yml`, pon in tor
  zvečer) bere `tedenski_pregled_ekip`. Avtentikacijska pošta (`supabase/templates/`) izbere
  jezik po `jezik` v metapodatkih uporabnika (vpiše ga registracija);
  v gostujočem projektu predloge **niso** iz config.toml — prilepi jih v
  Auth → Email Templates.
- `index.html` je slovenski; `main.tsx` za drug jezik zamenja le `lang` in
  opis strani, naslov nastavi `useNaslov`. Kartica ob deljenju (og:) mora biti
  v statičnem HTML, ker je Facebook/WhatsApp bereta brez JS: build zato zapiše
  še `sk.html` (vtičnik `slovaskaKartica` v `vite.config.js`, besedila
  `aplikacija.naslovStrani.deljenje`), Caddy (`scripts/hetzner/Caddyfile`,
  prej `vercel.json`) pa ga vrne za `/sk` in poti z `?t=sk-…`, tudi za `/`.
  Angleške kartice ni — angleški obiskovalec ob deljenju vidi slovensko
  ali slovaško (po ligi v povezavi).

## TypeScript

Ves `src/` je TypeScript (`strict`). `allowJs` ostaja vklopljen samo zato, da
skripte iz `scripts/` lahko uvazajo iz `src/lib` — v `src/` ni vec nobene
`.js` ali `.jsx` datoteke.

**Tailwind mora poznati `.ts`/`.tsx`.** V `tailwind.config.js` je `content`
`['./index.html', './src/**/*.{js,jsx,ts,tsx}']`. Ce se koncnica izgubi,
Tailwind razredov iz teh datotek ne najde in jih izpusti iz CSS — build,
`npm run typecheck` in `npm run smoke` ostanejo zeleni, stran pa je brez
slogov. To se je med migracijo ze zgodilo.

- Tipe vrstic **ne piši na roko** — generira jih baza:
  `npm run tipi` zapiše `src/lib/baza.types.ts` iz lokalnih migracij.
  Po vsaki novi migraciji jo poženi znova in datoteke ne popravljaj ročno.
- `supabase` odjemalec je tipiziran z `Database`, zato napačno ime tabele
  javi napako že pri `npm run typecheck`.
- Pojmi, ki jih shema ne pozna (`Pozicija`, `IgralecVKadru` …), so v
  `src/lib/tipi.ts`.
- Uvozne skripte (`scripts/*.mjs`) ostajajo v JavaScriptu. Node 26 zna brati
  `.ts` neposredno, zato smejo uvažati iz `src/lib` (glej `zdruzi-klube.mjs`).

## Ukazi

```bash
npm install         # namestitev odvisnosti
npx supabase start  # lokalna baza (Docker)
npm run dev         # razvojni strežnik
npm run build       # produkcijski build
npm test            # e2e test proti bazi (RLS, glasovanje, točke, lestvica)
npm run test:varnost # pravice in roki, izolirane SQL regresije z ROLLBACK
npm run test:socasnost # dve povezavi: shranjevanje in zaklep brez dirke
npm run smoke       # izris vseh strani + pravila ekipe, brez brskalnika
npm run typecheck   # preverjanje tipov (tsc --noEmit)
npm run tipi        # regeneriraj src/lib/baza.types.ts iz lokalne baze
```

`npm test` potrebuje `SUPABASE_SERVICE_ROLE_KEY` v okolju ali `.env` — brez njega ne more
povrniti asistence in pozicije, ki ju potrdi z glasovi, in naslednji zagon pade.

`npm test` je idempotenten — poganjaj ga zaporedoma, kolikorkrat hočeš.
Da tak tudi ostane, veljata dve pravili:

- **Vsak `.limit(1)` potrebuje `.order(...)`.** Brez njega Postgres vrne
  poljubno vrstico in test dobi vsakič drugega igralca ali krog: enkrat pade,
  drugič ne, koda pa je ves čas ista. Pri krogih `.order('number')` ni dovolj —
  številko 1 ima vsaka sezona, zato filtriraj še po `deadline_at`.
- **Kar test spremeni, mora tudi povrniti.** `zakleni_krog` naredi posnetke
  za celo ligo, zato e2e zajem preverja v lastnem začasnem tekmovanju.
  Ne briši posnetkov drugih uporabnikov in ne odpiraj zgodovinskih krogov;
  svoje fixture in uporabnike odstrani v `finally`, tudi ob napaki.

Testno okolje mora imeti uvoženo **tekočo** sezono, ne le arhiva:
`preracunaj_igralca` osveži samo kroge znotraj okna (14 dni, migracija
20260902110000), zato na sami arhivski sezoni točke ne dohitijo pozicije.
`npm run testno-okolje` poskrbi za oboje.

Uvoz podatkov (vsi sprejmejo `SUPABASE_URL` za projekt v oblaku):

```bash
node scripts/uvoz-zapisnikov.mjs --liga 1502         # arhiv (za cene igralcev)
node scripts/uvoz-zapisnikov.mjs                     # rezultati tekoče sezone
node scripts/uvoz-razporeda.mjs --pisi               # krogi in tekme z datumi
node scripts/ugani-pozicije.mjs --pisi               # ugibanje pozicij
node scripts/ovrednoti-igralce.mjs --pisi            # cene igralcev
node scripts/prenesi-grbe.mjs --pisi                 # grbi klubov
```

Pozicije in cene na **aktivni** ligi zahtevajo `--dovoli-aktivno` (glej
razdelek *Dve ligi* zgoraj).

Živi servisni ključ živi samo v GitHub Actions. Kar piše v produkcijo,
teče tam: `uvoz-lige.yml` (uvoz ene lige), `grbi-nzs.yml` (grbi z NZS, ki
jih sam zapiše v git), `grbi.yml` (ročni seznam grbov iz
`prenesi-grbe.mjs` za regionalne lige; prepiše le klube brez grba, najprej
brez `pisi` za načrt) in `zdruzi-klube.yml` (dva podvojena kluba; najprej
brez `pisi` za predogled), `hisne-ekipe.yml` (hišne ekipe SLFF; najprej
brez `pisi`) in `razdeli-zlite-igralce.yml` (zliti soimenjaki; najprej brez
`pisi`). Grb, dodan le v seznam in pognan lokalno, v
produkcijo ne pride. **Migracije uveljavi CI samodejno** ob vsakem pushu na main (posel
*Migracije baze* v `ci.yml`, pred objavo strani) v bazo iz skrivnosti
`SUPABASE_DB_URL`; ob selitvi baze se zamenja le ta skrivnost, med samo
selitvijo pa spremenljivka `MIGRACIJE_PREMOR=1` migracije zadrži. Baza je na
strežniku in ni javna: CI gre do nje skozi SSH tunel. **`--linked` kaže na
zamrznjeni Supabase Cloud — ne uporabljaj ga več.** Ročno:

```bash
ssh -fN -L 54322:127.0.0.1:5432 slff        # tunel do baze na strežniku
npx supabase db push --db-url "postgresql://supabase_admin:<geslo>@127.0.0.1:54322/postgres"
ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -c "<sql>"'
```

Geslo je `POSTGRES_PASSWORD` v `/opt/supabase/.env` na strežniku.

### Hišne ekipe

Sistemske ekipe SLFF v slovaških ligah (`fantasy_teams.hisna`), ustvari in
odstrani jih le delovni tok *Hisne ekipe* (najprej brez `pisi`). Podrobnosti:
`docs/hisne-ekipe.md`.

Vrstni red ni izbiren: **arhiv → razpored → tekoča sezona → pozicije → cene**.
Igralec pod 270 minutami dobi privzeto 4.5, zato bi liga brez arhiva imela vse
igralce po isti ceni in prvi teden ne bi imel igre.

## Preverjanje sprememb

- Po spremembi kode poženi `npm run smoke`.
- Po spremembi sheme ali RLS poženi še `npm test`.
- Po spremembi pravic ali rokov poženi tudi `npm run test:varnost`. Testi
  potrebujejo le lokalni Docker Postgres in migracije, ne uvoženih tekem.
  `SUPABASE_TEST_DB` lahko izbere izolirano testno bazo v istem kontejnerju.
- Lastnik profila sme posodobiti le `display_name`, `insider_team_id`,
  `navijam_team_id`, `brez_opomnikov`, `brez_push` (odjava od e-pošte in
  pusha, stran `/reminders`), `avatar_barva`, `avatar_ikona` in
  `javni_profil` (stran `/account`); `is_admin`, `insider_competition_id` in
  `display_name_changed_at` so servisna polja. Ime, ki ga spremeni lastnik
  sam, preveri sprožilec `varuj_prikazno_ime` (3–24 znakov, brez "admin",
  "slff", "moderator" in žaljivk, enolično brez razlike v velikosti črk,
  enkrat na 7 dni; koda napake gre v `hint`, vmesnik jo prevede v
  `src/lib/profil.ts`). Enolični indeks velja le za izbrana imena
  (`display_name_changed_at is not null`), ker ima registracija podvojena
  imena (Googlovo `given_name`) in ne sme pasti; admin in servis pravil ne
  poznata. Lastnik ekipe sme pisati le vnosna polja ob
  nastanku in ime ob spremembi. Za kader in denar vedno kliči `shrani_ekipo`.
  Brisanje ekipe je servisno opravilo, ker bi sicer obšlo zaklenjeno zgodovino.
- Nove tabele in pogledi v `public` vlogama `anon`/`authenticated` **ne dajo
  več pisanja** samodejno (migracija 20260923090000). Tabela, v katero piše
  vmesnik, potrebuje izrecen `grant insert/update/delete` in RLS. Pogled, ki ni
  `security_invoker`, teče mimo RLS — nikoli mu ne daj pisanja.
- V mini ligo se vstopi samo prek `pridruzi_mini_ligi` (s kodo),
  `pridruzi_javni_mini_ligi` (javna liga, ekipa iz njene lige) ali
  `ustvari_mini_ligo`; neposrednega vpisa v `mini_liga_clani` ni.
- Mutacijski RPC-ji so servisni. Admin stran kliče `admin_preracunaj_krog`,
  ki izrecno preveri `is_admin()`. Novi javni RPC potrebuje izrecen `grant execute`;
  privzeto funkcije niso več odprte vlogama `anon` in `authenticated`.
  **Obnova baze na Hetznerju (6. 10. 2026) je to tiho razveljavila**: vse
  funkcije v public so dobile EXECUTE za anon in authenticated, tudi
  servisne (`uveljavi_cene`, `izstop_kluba` …), in privzete pravice so spet
  odpirale vsako novo funkcijo. Migracija 20261012123100 vrne pravice, kot jih
  ima baza iz migracij. Po vsaki obnovi ali selitvi baze primerjaj
  `has_function_privilege('anon', …)` produkcije s svežo bazo iz migracij.
- Migracija `20260913100000` zapre vse že zapadle kroge brez rekonstruiranja
  manjkajočih postav. V produkciji jo namesti po končanem zajemu zapadlih
  krogov in pred naslednjim rokom; nato objavi frontend z novim admin RPC-jem.
- Ob spremembi podatkovnega modela **dodaj novo migracijo** v `supabase/migrations/`;
  obstoječih migracij ne spreminjaj, ker so že uporabljene.
- Migracijo, ki jo urejaš po prvem zagonu, preveri **na prazni bazi** — na
  lokalni je že uveljavljena in napaka se pokaže šele pri drugem razvijalcu.
- `create or replace view` ne more prerazporediti stolpcev; ko se `c.*`
  razširi, je treba pogled najprej `drop`.
- Pravila sestave ekipe so na enem mestu v `src/lib/pravila.ts` — spreminjaj jih tam,
  ne razpršeno po komponentah.
- **PostgREST vrne največ 1000 vrstic in tega ne pove.** Odgovor je videti
  običajen, le krajši; `.limit(5000)` in `.range(0, 9999)` meje ne premakneta.
  Dokler je bila liga ena, so poizvedbe ostajale pod mejo — z vsako novo se
  tiho prekorači. Kjer števila vrstic ne omeji majhen filter, beri prek
  `vseVrstice()` iz `scripts/strani.mjs` (in poizvedbi **določi vrstni red**,
  sicer se strani prekrivajo). Tako je padel `ovrednoti-igralce`: druga
  ljubljanska liga je dobila 0 vrstic statistike, ker je prvih tisoč porabila
  gorenjska, in vsi igralci bi imeli ceno 4.5.
- Vsaka nova poizvedba na strani mora filtrirati po `competition_id`, sicer
  stran pokaže obe ligi hkrati. `useTekmovanje().id` je `null`, dokler se
  seznam lig ne naloži — do takrat naj stran ne poizveduje.
- Statistika igralca v `player_overview` je seštevek **vseh** sezon. Kjer gre za
  tekočo sezono (trg v Moji ekipi, naslovnica, stran Igralci), beri
  `player_season_standings` s filtrom na sezono; lanska sezona je le zgodovina
  in izhodišče za ceno.
- Sponzorska mesta (`sponsors`) imajo hierarhičen doseg: liga > zveza >
  država > vsi, najbolj določen zadetek zmaga (`sponzorji_za(liga)`). Nič se
  ne prikaže, dokler nastavitev `sponzorji_vidni` ni 1 — vklop je stikalo v
  adminu, ne objava. Števci so dnevni seštevki v `sponsor_stats` po mestu,
  ne dogodki. Mesta (`sponsors.mesta`: domov, lestvica, moja_ekipa,
  rezultati, igralci) nastavi admin po sponzorju; na strani je
  `<Sponzor kje="…" />`. Prikaz se šteje, ko je mesto vsaj do polovice na
  zaslonu, klik ob kliku. Klic Supabase se izvede šele ob `then`/`await` —
  `void supabase.rpc(…)` ne pošlje ničesar (tako so števci do oktobra 2026
  ostali na nič).
- Na trg sodijo samo aktivni igralci (`player_overview.active`) — kader z
  neaktivnim igralcem `roster_je_veljaven` zavrne in ekipa tiho ostane brez točk.
- **Klub izstopi med sezono** (Tržič 2012, mladinci, 2026/27): igralcev **ne**
  deaktiviraj (cela ekipa bi izgubila točke kroga), ampak poženi delovni tok
  *Izstop kluba* (`scripts/izstop-kluba.mjs`, najprej `suho`). `izstop_kluba()`
  nastavi `players.izstopil_at` — kdor igralca ima, ga obdrži, `shrani_ekipo`
  ga na novo ne proda nikomur, trg ga skrije, lastnik vidi opozorilo in dobi
  e-mail — in izbriše neodigrane tekme kluba. Odigrane tekme in točke ostanejo,
  tudi če zveza izide kluba na lestvici razveljavi.
