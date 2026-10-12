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

| zveza | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|
| mnzg — člani / mladinci | 1601 / 1603 | 1502 / 1503 | — |
| mnzlj — 1. / 2. liga | 2003 / 2004 | 1904 / 1905 | 1804 / 1805 |

**Pri 3. SNL arhiv ni pri istem viru kot tekoča sezona.** Ligo vodi NZS,
objavi pa jo tista medobčinska zveza, ki ji jo je NZS za to sezono zaupala —
in skrbništvo se seli. Zato ima šifra v delovnem toku obliko `<koda>@<vir>`:

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
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
  vsi drugi viri (MNZ, nzs, fsb, jalgpall, fcf, facr, hlf, frf, lff, pzpn, ffm)
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

**TODO**: Quarta grup 7–32+ (grup 32: `4137000`, grup 26 ima posamezno
tekmo `4117388`) niso pregledane. Bloki istega tekmovanja niso urejeni po
številki skupine; za blokom Quarta grup 6 je Copa Catalunya Femenina.
Pregled: `node scripts/catalanske-lige.mjs <šifra> --naprej N --preveri` (en
blok ~3–20 zahtevkov). Arhiv 2025/26: blok s semenom iz lanskih zapisnikov,
isti postopek; isto skupino določijo skupni klubi (vsaj ~polovica, ob
napredovanju in izpadu manj).

Uvoz (ena za drugo, **šele s soglasjem FCF**): `gh workflow run uvoz-lige.yml
-f liga=es-ct-quarta-g1 -f cene=true` (z arhivom: `-f arhiv=<blok 2025/26>`).
Prvi uvoz bloka je ~240 strani — ob počasnem strežniku do ene ure.

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
LV po uradni piramidi, AT le državne nad deželnimi; mladinske se primerjajo le
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

- `players` → realni igralci, vezani na realni klub (`teams`) in tekmovanje
- **Soimenjak pri drugem klubu ni samodejno prestop.** Vir brez šifre igralca
  (stari CMS MNZ, NZS, fsb, fss, fssid, ffm) pozna le ime in klub; uvoz je
  istoimenskega igralca drugega kluba imel za prestop tudi, ko sta igrala
  hkrati (Petrović Lazar, rs-srpska-istok, 10/2026: vratar Morave in igralec
  Malošišta v istih krogih, en zapis, vsota točk). Zdaj ga `prestopSkladen`
  (`scripts/prestop.mjs`) sprejme le, če je skladen s časom: brez **trka**
  (isti dan ali isti krog ≤ 6 dni narazen), nov klub za vsemi nastopi starega,
  vrnitev ne v obdobju drugega kluba; sicer nov zapis (dvojnika `zdruzi-duplikate`
  združi, zapisov s trkom pa ne). Igralca s šifro (`reg_st`) po imenu ne
  posvoji. Šifra je identiteta: pri sportnet/oefb/hns/mlsz dva kluba v istem
  krogu niso zlitje (dvojna registracija, prestavljena tekma, krogi faz).
  Že zlite razdeli delovni tok *Razdeli zlite igralce*
  (`scripts/razdeli-zlite-igralce.mjs` → SQL `zliti_igralci`,
  `razdeli_zlitega_igralca`, migracija 20261011233100): gruča je klub, id
  ostane klubu, ki ga imajo lastniki (pozicija ob nakupu, sicer klub zadnjega
  kroga pred prvim posnetkom postave), sicer trenutnemu klubu; drugi klubi
  dobijo svojega igralca z nastopi, goli in asistencami, točke krogov se
  preračunajo. Najprej brez `pisi`, najprej neaktivne lige; ponoven zagon nič ne spremeni
- `fantasy_teams` → ekipe uporabnikov, `fantasy_roster` → izbrani igralci
  (`is_starter`, `is_captain`, `is_vice`, `bench_order`)
- `fantasy_teams.hisna` → **hišna ekipa**: sistemska ekipa SLFF, da slovaške
  lige z eno ekipo niso prazne (glej *Hišne ekipe* spodaj)
- `fantasy_chips` → vloženi pripomočki (`klop_plus`, `wildcard`), vsak enkrat na
  sezono: ključ je `(fantasy_team_id, chip, season)`, `season` vpiše sprožilec
  iz kroga. Vmesnik naj bere in briše pripomočke **s filtrom na sezono**.
- `fantasy_lineups` → posnetek postave po krogih; nastane s `zakleni_krog(krog)`
  oz. `zakleni_zapadle_kroge()` (za cron). Točkovanje bere posnetek, če obstaja.
- **Ekipe so zasebne** (migracija 20261012137100): sestavo ekipe (kader,
  posnetki, kapetan, klop, pripomočki) vidi le lastnik in admin, tudi po roku
  in tudi pri hišnih ekipah. RLS na `fantasy_roster`, `fantasy_lineups`,
  `fantasy_chips`; `tuja_postava` vrne vrstice le, če `sme_videti_ekipo(ekipa)`
  (lastnik, admin, servis). Javno ostane, kar sestave ne izda: lestvice (ime,
  lastnik, točke, mesto, točke kroga, število prestopov in kazen iz
  `fantasy_transfers`), mini lige in izbranost. Izbranost (`owners` v
  `player_standings`, `player_season_standings`) je NULL, dokler ima zadnji
  zaklenjeni krog lige manj kot **5 človeških ekip** — sicer seštevek izda
  ekipo. Stran `/team/:id` tujcu pokaže le ime, lastnika, točke in mesto;
  ime ekipe na lestvicah je povezava le pri svoji ekipi (`ImeEkipe.tsx`).
  Funkcija ali pogled, ki bere tuje posnetke, mora teči kot lastnik sheme
  (SECURITY DEFINER / pogled brez `security_invoker`) in sama paziti, kaj
  vrne.
- `rounds.lineups_locked_at` → dokončan zajem, tudi za neveljavne/prazne ekipe;
  odsotnost posnetka ni dovoljenje za poznejši zajem. `fantasy_teams.roster_updated_at`
  beleži čas shranjevanja. `shrani_ekipo` pred spremembo zajame zapadle kroge;
  shranjevanje, zaklep in urejanje pripomočkov si delijo transakcijski zaklep lige.
- `rounds` → krogi sezone, `matches` → tekme (z izvorom `zapisnik_id`).
  `matches.kontumacija` = tekma ni bila odigrana, izid je dodeljen in
  zapisnika ne bo; borza in preverba nanjo ne čakata. Označi jo uvoz razporeda:
  Sportnet `contumation`; stari CMS izid brez polčasa `3 : 0()` ali `(u.d.)`
  (Celje); Maribor izid brez polčasa **in** brez kraja (s krajem je zelena
  miza z zapisnikom); Ptuj, Murska Sobota, Lendava prazna kartica 3:0 brez
  sodnika in postav na strani zapisnikov kroga (`vir.kontumacije`). Pri Novi
  Gorici in NZS primera še nismo videli — tam admin z
  `update matches set kontumacija = true where id = …`
- `matches.vir_brez_izida` → vir ob zadnjem uvozu razporeda za to minulo,
  neuvoženo tekmo ni kazal izida: zveza jo je prestavila brez novega datuma
  (Bled Bohinj : Sava Kranj, 4. 10. 2026). Piše jo uvoz razporeda iz
  `odigrana`, ki ga dajo razčlenjevalniki starega CMS-a (Kranj, Ljubljana,
  Celje), hns, sportnet, mlsz, facr, fsb in frf (`oznakaBrezIzida` v `razpored.mjs`);
  ostali viri ga nimajo in tekme ostanejo neoznačene. Preverba podatkov takih
  tekem ne javi kot `tekma-ni-uvozena`, šele po 30 dneh kot `tekma-brez-izida`
  (človek odloči: kontumacija ali izbris). Nov vir naj tekmi da `odigrana`
  (ali ima vir izid), kadar ga razpored pozna.
- Omrežje: uvozi berejo prek `prenesiSPonovitvami` (`scripts/prenos.mjs`) —
  ponovi omrežne napake, 5xx in 429 (2 s, 6 s, 15 s), 4xx nikoli. Nov prenos
  v uvozni skripti naj gre skozenj, ne mimo z golim `fetch`. Vir, katerega
  strežnik ob preobremenitvi vrne 200 z obvestilom namesto strani, naj ima
  `zaPredpomnilnik(besedilo, datoteka)` (uvoz zapisnikov in razporeda tako
  stran ne shranita in shranjene ne bereta; zdaj le mlsz)
- Nastope tekme (in spremenjene gole) uvoz zamenja s
  `zamenjaj_nastope_tekme(tekma, nastopi, goli)` v eni transakciji (servisna,
  migracija 20261013181100). Prej sta bila izbris in vstavljanje dva zahtevka
  in padec omrežja vmes je živo tekmo pustil brez nastopov (tekma 148981,
  12. 10. 2026)
- borza (`preracunaj_cene`, nočno `uveljavi_zapadle_cene`) premakne ceno po
  točkah kroga (+0.1 na dve točki nad osnovnima dvema, največ +1.0; forma
  treh krogov je spodnja meja), odsotnost pa kaznuje šele drugi zaporedni krog.
  Cena se giblje v razponu 4.0–14.0 (`meje_borze()`) in od izhodiščne
  `value_start` ni omejena — kdor igra dobro vso sezono, lahko pride do vrha.
  Cron vsak dan znova obračuna odigrane kroge zadnjih 14 dni, zato sprememba
  pravil **ne sme seči nazaj**: `rounds.borza_po_starem` zapre kroge, odigrane
  pred zadnjo spremembo (migracija 20260924100000). Ob naslednji spremembi
  pravil jih zapri enako. Kadar se spremenijo le meje cene, krog ne zapri,
  ampak ga označi, da ga borza obračuna po starih mejah — tako je
  `rounds.borza_z_odmikom` (20260925100000) ohranil odmik 3.0 od izhodiščne
  za kroge, odigrane pred ukinitvijo, in igralci, ki čakajo na zapisnik,
  premika ne izgubijo.
- `appearances` → nastop igralca na tekmi (minute, goli, kartoni, prejeti goli)
- `goals` → posamezen gol; nosi tudi potrjeno asistenco
- `assist_votes`, `position_votes` → glasovanje skupnosti (prag v `settings`)
- `player_scores` → točke igralca na krog (iz pogleda `appearance_points`);
  posnetek se osveži sam, ko se spremeni pozicija igralca ali potrdi asistenca
  — pozicija odloča, koliko je vreden gol, zato bi brez tega lestvica kazala
  stanje ob uvozu, ko je pozicijo poznal samo vratar
- `rounds.pravila_tockovanja` → različica pravil, po kateri se krog točkuje
  (`tocke_za_nastop(…, zmaga, pravila)`, migracija 20260928100000). Nočni
  preračun bi sicer spremembo pravil prenesel na že podeljene točke. Različica
  2: vratar čista mreža +5, zmaga +2 za vratarja in branilca, prejeti goli le
  med igranjem (`appearance_points.prejeti_na_igriscu`; `goals_conceded` in
  `clean_sheet` ostaneta izid cele tekme). Ob novi spremembi dodaj različico
  3, zapri začete kroge in jo prenesi v `src/lib/tockovanje.ts`
- `ucinkovita_postava(ekipa, krog)` → postava po samodejnih menjavah z množitelji;
  iz nje računa `fantasy_round_points_izracun`. Izid hrani tabela `tocke_krogov`
  in `fantasy_round_points` (ter z njim obe lestvici) bere **tabelo**, ker je
  sprotni izračun anonimnim obiskovalcem presegel 3 s. Tabelo po krogih osvežijo
  sprožilci na `player_scores`, `fantasy_lineups`, `fantasy_transfers`,
  `fantasy_chips`, `appearances` in `matches`; ponoči jo cron obnovi vso. Nov
  vhod v izračun **potrebuje svoj sprožilec**, sicer lestvica zaostaja do noči
  (`npm run preizkus-tock-krogov` primerja tabelo z izračunom).
- `tedenski_pregled_mini_lige(liga, krog)` → zgodbe končanega kroga mini lige
  (točke kroga, premiki na lestvici mini lige, kapetan, klop) kot jsonb;
  besedila sestavi `src/lib/miniLige.ts` (`zgodbeKroga`). Krog je **številka**
  tekoče sezone, ker mini liga gre čez lige; končane kroge ekip da
  `koncani_krogi_mini_lige`. Tujec mini lige (`sem_v_mini_ligi`) dobi `null`.
  Pregled teče kot lastnik sheme (bere tuje posnetke za točke klopi), a
  kapetana izbere le med ekipami, ki jih klicatelj sme videti (svojo), aduta
  ne vrne več (izdal bi, česa tekmeci nimajo); vrstice nosijo `lastnik_id`
- **Javne mini lige** (migracija 20261012139100): `mini_lige.javna`, `opis`
  (≤ 120), `competition_id` (liga, v kateri je javna; mini liga sama še vedno
  gre čez lige) in `javna_zaklenjena_at` (admin jo je skril, lastnik je ne more
  spet objaviti). Javnost nastavi le ustvarjalec prek
  `nastavi_javnost_mini_lige` (potrebuje ekipo v tej ligi); neposredno sme
  lastnik spremeniti le `name` (stolpčna pravica). Sprožilec `varuj_mini_ligo`
  ime in opis javne lige preveri s `prepovedano_besedilo` (isto pravilo kot
  prikazno ime: znaki, rezervirane besede, žaljivke; JS `prepovedanoBesedilo`)
  in omeji na 3 javne lige istega lastnika v ligi. Branje gre le prek
  SECURITY DEFINER RPC (tabela nosi kodo, RLS ostane za člane):
  `javne_mini_lige(liga, iskanje)` (anon, največ 100, po številu ekip),
  `mini_liga_glava(id)` in `lestvica_javne_mini_lige(id)` (javna vsem,
  zasebna članom; le lestvica, nikoli postave ali koda). Pridružitev brez kode
  `pridruzi_javni_mini_ligi(liga, ekipa)`: liga javna, ekipa svoja in iz lige
  mini lige. Prijave v `prijave_mini_lig` (`prijavi_mini_ligo`, ena odprta na
  uporabnika in ligo, največ 10 odprtih); Administracija → Prijave mini lig
  (`admin_prijave_mini_lig`, `admin_odloci_mini_ligo`: skrij in zakleni ali
  zavrni). Stran `/mini-leagues/:id` (`JavnaMiniLiga.tsx`, noindex)
- `player_standings` → lestvica igralcev (točke, forma, na tekmo, izbranost)
- `statistika_igralcev` → statistika igralca po ligi in sezoni (nastopi,
  minute, goli, kartoni, čiste mreže, točke, asistence, zadnji krog, forma).
  `player_season_stats`, `player_overview` in `player_season_standings` jo
  berejo namesto sprotnega seštevanja vseh nastopov (prej 0,7–2,5 s na klic,
  tri četrtine časa baze; migracija 20261002120000). Izračun je
  `player_season_stats_izracun`; tabelo osvežijo sprožilci na `appearances`,
  `player_scores`, `goals`, `matches` (izid) in `players` (pozicija), ponoči
  jo cron obnovi vso. Nov vhod v izračun **potrebuje svoj sprožilec**
  (`npm run preizkus-statistike` primerja tabelo z izračunom)
- `isci_igralce(iskanje, omejitev)` → igralci **vseh aktivnih lig** po imenu
  (javna, anon): id, ime, klub, liga (šifra, kratko ime, država), pozicija,
  cena, `podobno`. Brez šumnikov, vrstni red besed poljuben, od treh znakov;
  najprej natančno (vsaka beseda v imenu), šele brez zadetka podobnost
  (pg_trgm `%` in `<%`, kazalo `players_ime_brez_sumnikov_trgm`). Brez
  anonimiziranih in neaktivnih lig. Bere jo izbirnik lige (razdelek Igralci
  pod ligami, izbira preklopi ligo in odpre `/player/<id>?t=<liga>`) in stran
  Igralci, ko iskanje v ligi ne najde nikogar ("Najdeno v drugih ligah").
  Odjemalec: `src/lib/iskanjeIgralcev.ts`. V produkciji (125k igralcev)
  najslabši primer "ric" ~210 ms, običajno 1–40 ms
- `vrh_drzave(drzava, koliko)` → vrh igralcev tekoče sezone vseh aktivnih lig
  države (točke brez asistenc, goli, čiste mreže vratarjev) za zavihek Igralci na
  strani Slovenija. Bere tabele (`player_scores`, `appearances`, `goals`), ne
  `appearance_points`: prek pogleda je poizvedba trajala 10 s, iz tabel ~150 ms
- `navijaci_klubov(liga)` → klubi lige po povprečju točk navijačev (zavihek
  Navijači klubov na Lestvici, `#fans`; razdelek na strani kluba). Navijač je
  `profiles.navijam_team_id` — en klub na človeka, ne po ligah (klubi so
  skupni); šteje le v ligi, kjer klub igra. Navijanje **ni** poznavalec
  (`insider_team_id`, trikratna utež glasu za pozicije), zato povabilo piše
  samo `navijam_team_id`; ob uvedbi je dobil klub vsak poznavalec. Mesto dobi klub z vsaj `min_navijacev_kluba` navijači
  (privzeto 3). Točke bere iz `fantasy_round_points` (tabela), ne računa sproti
- stran Rezultati (`/results`, `/match/:id`) sestavi postavi tekme iz
  `appearances` + `appearance_points`; nove sheme ne potrebuje
- `lestvica_lige(liga, sezona)` → **prava** lestvica lige (stran `/table`, meni
  "Lestvica lige"; `/standings` je fantasy). Iz `matches`: odigrana = ima
  zapisnik ali je kontumacija (z dodeljenim izidom); 3/1/0, točke → gol razlika
  → dani goli → ime. Medsebojnih tekem in odvzetih točk ne pozna — stran to
  pove kot približek. Privzeta sezona je zadnja z odigrano tekmo. Pod njo
  strelci iz `player_season_standings`
- **Zemljevid strani**: `public/sitemap.xml` ima le stalne poti brez lige (`/`, `/table` … privzete lige so v `sitemap-clani.xml`); po ligah ga
  ponoči sestavi `scripts/sitemap.mjs` (delovni tok `sitemap.yml`, anon ključ:
  strani lige s `?t=` — privzeta liga `clani` brez njega, kot kanonični —,
  klubi, igralci z minutami letos ali lani, odigrane tekme, v
  `sitemap-drzave.xml` še vstopne strani držav z aktivno ligo) in ga z rsync prenese v `/srv/slff/sitemap/` na strežniku — ne v
  repozitorij in ne v `dist/`, ker objava zamenja mapo izdaje. Caddy streže
  `/sitemap-index.xml` in `/sitemap-*.xml` iz te mape. Nova javna stran lige
  sodi tudi v `STRANI_LIGE` v skripti. *Uvoz Avstrije (vrsta)* ga po vklopu
  lige zažene takoj, ne šele ponoči
- `match_assist_status` → odigrane tekme s številom golov brez asistence
  (stran Asistence izbira po korakih: krog → tekma → gol)
- `naslednji_krog` → prvi krog, ki se še ni zaklenil (rok na strani Moja ekipa)
- `stevilo_ekip_lig` → število ekip po ligah (s hišnimi) za okno prvega
  obiska; `security_invoker`, le branje. Prej je odjemalec prenesel vse ekipe
- `stanje_mojih_ekip()` → za prijavljenega vse njegove ekipe v aktivnih ligah:
  veljavnost, razlog, ali bo ob roku brez točk (prvi fantasy krog se zaklene
  tudi nepopoln) in igralci s poročilom o poškodbi/odsotnosti. Bere ga pas
  `OpozoriloEkipe` (rdeče napake, rumena opozorila, ki se dajo skriti);
  besedila sestavi `src/lib/stanjeEkip.ts`
- `lijak_dnevno` → lijak začetka: dnevni seštevki korakov `prazna_ekipa`,
  `predlog` ("Sestavi mi ekipo"), `prva_shramba`, `sestavi_iz_maila` (povezava
  `/my-team?sestavi=1` sestavi ekipo ob odprtju). Le števci, brez uporabnika;
  piše `zabelezi_korak`, bere admin. Ime ekipe se predlaga ("FC Ime") in se ga
  da spremeniti kadarkoli (od 6. 10. 2026; prej je bilo po prvi shrambi fiksno)
- `obiski_dnevno` → obiski strani: dnevni seštevki po strani in starosti
  računa (`nov` = registriran v zadnjih 7 dneh, `star`, `neprijavljen`).
  Odgovarja na "kam gre tisti, ki ekipe ne sestavi" — lijak sam tega ne pove.
  Piše `zabelezi_obisk(stran)`, bere admin. Šteje se **ena stran na sejo na
  dan** (doseg, ne ogledi); ime strani določi `imeStrani()` v
  `src/lib/obiski.ts`, dinamični deli poti (id igralca, koda mini lige)
  odpadejo. Starost računa izračuna baza iz `auth.users.created_at`, zato je
  odjemalec ne more lagati in v tabeli kljub temu ni uporabnika ne naprave.
  **Nova stran se ne šteje sama**: dodaj jo v `PO_POTI`/`PO_PREDPONI` in v
  seznam v `zabelezi_obisk()`, sicer se zapis tiho zavrže. Oboje skupaj kaže
  razdelek *Kje ljudje obtičijo* v adminu (`src/components/admin/Lijak.tsx`)
- `trgovine_dnevno` (trgovina `ios`/`android`, dan, `skupaj`, `novi`) in
  `trgovine_stanje` (zadnje stanje različice iOS) → namestitve aplikacije.
  Piše le delovni tok *Trgovine* (`scripts/trgovine.mjs`, vsak dan 07:30 UTC,
  servisni ključ; RLS brez pravic za anon/authenticated). iOS: dnevna
  prodajna poročila ASC, zadnjih 8 dni znova; Android: vse mesečne datoteke
  `stats/installs/` v vedru Play. Discord javi vsak nov mejnik po 10
  namestitev (nad `trgovine_stanje.mejnik`, najvišjim že javljenim, zato
  padec seštevka ne javi znova) in spremembo stanja iOS. `--suho` ne piše in
  ne javlja
- `admin_rast(od)` → po dnevih (ljubljanski dan): novi in skupni uporabniki
  (kot `skupaj_uporabnikov()`, brez hišnega profila), nove ne-hišne ekipe,
  `obiskovalcev` (najbolj obiskana stran dneva iz `obiski_dnevno`, spodnja
  meja sej) in namestitve; plus `stanje` trgovin. Le admin. Razdelek *Rast*
  v adminu (`src/components/admin/Rast.tsx`)
- **Statistika obiska** je Umami na strežniku (`src/lib/analitika.ts`, `stats.slff.eu`, nastavitev v
  `docs/migracija-hetzner.md` 6c): brez piškotkov, ogledi strani in nekaj dogodkov
  (`dogodek('ime', {…})`). Vsak korak `zabeleziKorak` gre tudi tja. Nov dogodek naj nima
  podatkov o uporabniku; parametri iz naslova se počistijo (ostanejo `t`, `utm_*`, `src`)
- `push_tokens` → žeton FCM naprave mobilne aplikacije (ključ je žeton, ob
  prijavi drugega uporabnika na isti napravi se preseli). Vpiše ga le
  `shrani_push_zeton`, bere servis: `posli-opomnik` pošlje isto sporočilo še
  kot obvestilo (`push.ts`, skrivnost `FIREBASE_SERVICE_ACCOUNT`). Kanala sta
  neodvisna: pošta gre, če ni `profiles.brez_opomnikov`, push, če ni
  `profiles.brez_push` (oboje stran `/reminders`, naslov "Obvestila");
  kandidati vrnejo `email_vklop`/`push_vklop`, `email_log.kanal` pove, kaj je
  prišlo. Za dovoljenje telefona vpraša šele stikalo na tej strani, ne prijava
- `kandidati_za_push_opomnik(liga)` → samo push "še nimaš ekipe": kdor ima
  napravo in v ligi nima ekipe (ali ima prazno; brez ekipe šteje domača liga
  kot pri opomniku), 24 ur pred rokom, enkrat na krog (`email_log` vrsta
  `opomnik-push`). Teče vsako uro v `opozorila.yml` (`VRSTA=opomnik-push`)
- `javni_profil(id)` → javna stran profila `/u/:id` (SECURITY DEFINER, le
  javna polja): ime, avatar, član od, navijam, ekipe v aktivnih ligah z mestom
  na lestvici lige, dosežki (sezone, krogi, najboljši krog) in mini lige, v
  katerih je tudi gledalec (`sem_v_mini_ligi`; mini lige so zasebne).
  `profiles.javni_profil = false` pokaže drugim le ime; izbrisan profil in
  sistemski lastnik hišnih ekip vrneta NULL. Lestvični pogledi
  (`fantasy_team_standings`, `fantasy_round_standings`, `lestvica_drzavna`,
  `mini_liga_lestvica`) imajo na koncu `owner_id` (pri hišnih NULL), da ime
  lastnika vodi na profil (`ImeLastnika.tsx`), ime ekipe pa na ekipo le pri
  svoji (`ImeEkipe.tsx`, ekipe so zasebne). `isci_klube(iskanje)` je
  izbirnik kluba (navijam) čez klube aktivnih lig
- `izbrisi_moj_racun()` → uporabnik izbriše svoj račun (stran `/account`,
  zahteva obeh trgovin); kaskada odnese profil, ekipe, glasove in mini lige
- `players.anonimiziran_at` → igralcu je ime skrito (GDPR, migracija
  20261009180000, obvestilo po čl. 14 na strani `/legal`). `full_name` in
  `last_name` postaneta `#<id>`; `first_name`, `reg_st` (javna šifra osebe
  pri viru, z njo bi se ime dalo poiskati), `nzs_*` in poročila o poškodbah
  gredo proč. Statistika, točke in cena ostanejo. Vse strani berejo ime iz
  `players`, zato anonimizacija velja povsod.
  `anonimiziraj_igralca(id, razlog)` je servisna. Ugovor (igralec ali zveza,
  info@slff.eu, v 14 dneh) admin vnese v Administracija → Igralec (iskanje
  čez vse lige, tudi po id-ju): `admin_ista_oseba(id)` našteje druge vrstice
  iste osebe v isti državi, `admin_anonimiziraj_igralca(ids[])` anonimizira
  izbrane in **vse z isto šifro** v državi; soimenjake brez šifre admin
  odkljuka ročno. `anonimiziran_razlog`: `ugovor` je dokončen; `neaktiven`
  nastavi nočni cron `anonimiziraj_neaktivne()` (04:30, ne 03:30 zaradi
  `uveljavi-cene`) **le v Avstriji** (obljuba ÖFB), neaktivnemu igralcu brez
  nastopa 18 mesecev, ki ni v nobenem kadru.
  **Uvoz imena in šifre nikoli ne povozi.** Anonimiziranega igralca najde po
  zgoščenih ključih `sha256("<country_id>|<ime>")` in
  `sha256("<country_id>|reg|<reg_st>")` v zaprti tabeli
  `anonimizirani_igralci` (RLS brez pravic, ker je `players` javen); nov
  igralec, ki se ujema s ključem igralca z ugovorom, nastane že anonimiziran.
  Letošnji nastop vrne ime (in šifro) le `neaktiven` igralcu, ključe pobriše
  šele po uspešni posodobitvi. `imeHash`/`regHash` v
  `scripts/anonimizacija.mjs` morata ostati enaka SQL
  `anonimizacijski_kljuc` (smoke in `test:varnost`)
- **Prevzem profila igralca** ("To sem jaz", migracija 20261012091100):
  `zahtevki_igralca` (en potrjen na igralca IN na uporabnika, en odprt na
  uporabnika; delna unikatna kazala), piše le prek RPC `prevzemi_igralca`,
  `preklici_moj_zahtevek`, `odloci_zahtevek_klub`, `potrdi_soigralca`,
  `prevzem_odloci_z_zetonom`, `admin_odloci_zahtevek`. Potrdi: **poznavalec
  kluba** (`insider_team_id` + odobrena `poznavalec_prosnje` `klub` za ta klub
  in ligo, ali `insider_competition_id` lige; sam nastavljen klub ne šteje),
  **dva različna potrjena soigralca** istega kluba in lige, **klub po mailu**
  ali **admin**. **Vsak zahtevek najprej vidi admin** (Administracija →
  Prevzemi profilov: vsi čakajoči, spori, prijave; migracija 20261012141100)
  in ima tri gumbe: *potrdi*, *pošlji klubu* in *zavrni*. *Pošlji klubu*
  pokliče funkcijo `posli-prevzem` z admin žetonom (`{zahtevek, na}`); žeton
  da `admin_prevzem_zeton_za_klub` (enkraten, 14 dni, v bazi le sha256,
  prejšnja povezava zahtevka poteče), naslov je vpisani ali prvi uporaben iz
  `klub_stik` (nov naslov gre v stike, mail v `klub_stik_posta`). Mail in stran
  `/claim` pokažeta ime **in e-naslov prosilca** (to piše v oknu "To sem jaz");
  samodejnega pošiljanja klubom ni. Nov zahtevek in prijava lažnega profila
  gresta takoj na Discord (sprožilec `trg_prevzem_na_discord`, webhook iz Vaulta,
  brez e-naslova). Preizkus brez kluba: servis
  `{"test_zahtevek", "test_na"}`. Zahtevek za že potrjenega ali čakajočega igralca je `spor`
  (odloči le admin). Mladinska liga (`je_mladinski_slug`: `mladinci`, `-u19`,
  `sml1/2`; isto v `src/lib/prevzem.ts`) zahteva potrdilo "vsaj 16 let"
  (`star_vsaj_16`), datuma rojstva ne zbiramo. **Ista oseba v več vrsticah**
  (člani in mladinci, druga liga, prestop) je ena: admin poveže vrstice v
  `povezani_igralci` (predlogi `admin_predlogi_povezav`: isto ime brez šumnikov
  ali šifra v državi), povezane kažejo isto značko in predstavitev.
  `profil_igralca` (ključ je glavna vrstica): vzdevek, opis, uporabniška imena
  omrežij, `fotografija` (pot v vedru `fotografije-igralcev`,
  `<igralec>/<ime>.webp` 256 px in `-64.webp`; izrez in pomanjšava v
  brskalniku). Fotografije na seznamih bere pogled `fotografije_igralcev` v
  enem zahtevku na stran (`useFotografije`, `FotoIgralca`, `Dres igralecId`).
  `skrij_moje_ime()` je le servisna (od 20261012145100 igralec imena ne skrije sam:
  v fantasy igri ga poznajo drugi; ugovor gre prek info@ in admina);
  anonimizacija vedno pobriše predstavitev. **Storage na strežniku** je
  `storage-api` z datotekami na disku (`/opt/supabase/volumes/storage`, brez
  MinIO), vklop, varnostna kopija in povrnitev v `docs/hetzner-shramba.md`.
  Vedro in pravila ustvari `prevzem_pripravi_shrambo()` šele, ko tabele
  `storage` obstajajo (storage-api jih ustvari sam ob zagonu) — po vklopu jo
  pokliči. SQL brisanje (`prevzem_odstrani_fotografije`) odstrani le vrstico,
  datoteka ostane na disku (osirotelo, ni javna; čiščenje v istem dokumentu).
- **Preverjeni igralci** (faza 1 brez plačil, migracija 20261012190100):
  potrjen igralec z veljavno pravico dobi modro kljukico ob imenu (stran
  igralca, Igralci, Klub, Ekipa, igrišča, tekma, iskanje lige; vzdevek na
  seznamih) in dodatke profila. **Stikalo** `preverjeni_racuni` v `settings`:
  0 izklopljeno (privzeto), 1 preizkus (admin in `testerji`), 2 v živo.
  Vsako branje gre skozi `vidi_preverjene()`; pri 0 ne vidi nihče ničesar,
  tudi lastnik ne (kot `sponzorji_vidni`). Admin → Igralci → *Preverjeni*:
  stikalo, preizkuševalci (`admin_nastavi_testerja`), dodelitev in odvzem.
  - `preverjeni_racuni` (pravica): `user_id`, `player_id` = glavna vrstica,
    `vir` `rocno`/`letna`/`dozivljenjska`, `status` `aktiven`/`preklican`/`potekel`,
    `velja_do` (null = brez roka), `star_vsaj_18` (CHECK: plačljiv vir zahteva
    true, ročni sme null), `stripe_customer_id`/`stripe_subscription_id` (prazna,
    za fazo 2). En aktiven na igralca. Zaprta tabela, piše le admin:
    `admin_dodeli_preverjen(igralec, 'rocno', velja_do)` (zahteva potrjen
    zahtevek, vzame njegovega uporabnika; plačljivih virov ne vpiše),
    `admin_odvzemi_preverjen(id)`, seznam `admin_preverjeni()`. Potek ne
    potrebuje crona: `je_preverjen` primerja `velja_do` s časom.
  - `je_preverjen(igralec)`: stikalo + potrjen zahtevek (tudi povezane
    vrstice) + aktivna, nepotekla pravica **istega uporabnika** + ime ni
    skrito. Seznami kličejo `preverjeni_igralci_za(ids[])` (id in vzdevek, do
    300 na klic) v enem zahtevku na stran (`usePreverjeni`, `ZnakPreverjen`,
    `src/lib/preverjeni.ts`), kot fotografije.
  - `profil_igralca_plus` (ključ glavna vrstica): opis do 500 (navadni opis
    160 ostane), `youtube`, `x`, `splet` (https, ≤ 200), `pasica`
    (`<glavni>/banner-<ime>.webp` v vedru `fotografije-igralcev`, 1200 × 400,
    ≤ 2 MB, izrez v brskalniku; nalaganje dovoli `prevzem_sme_pisati_foto` le
    preverjenemu), `barva` (ena od osmih), `tekma_id` (svoja tekma) ali
    `statistika` (ključ sezone), `sporocilo` do 140. Bere vsak le, če
    `je_preverjen`; piše lastnik, ki je preverjen. Sprožilec
    `varuj_profil_igralca_plus`: ročici (YouTube, X) gresta skozi strogo
    `prepovedano_besedilo`, opis, sporočilo in spletna stran skozi
    `prepovedane_besede` (po besedah: žaljivka je beseda ali začetek besede,
    rezervirana beseda — admin, slff, moderator … — le cela; ločila,
    številke, `/ @ # " %` so dovoljeni, prepovedani le kontrolni in nevidni
    znaki ter `< >`). Opis obdrži nove vrstice, največ dve zapored. Brisati
    svoje datoteke (tudi pasico po poteku) sme lastnik brez pravice
    (`prevzem_sme_brisati_foto`), nalagati pasico le preverjen.
  - Brisanje: `prevzem_odstrani_predstavitev` (preklic, anonimizacija, izbris
    računa prek sprožilca `prevzem_izbris_zahtevka`) pobriše predstavitev,
    dodatke in datoteke (pasica gre z mapo igralca) in aktivno pravico igralca
    postavi na `preklican`. Mesto (en aktiven na igralca) se tako sprosti za
    naslednjega lastnika; **isti uporabnik ob ponovnem prevzemu kljukice ne
    dobi sam** — potrebna je nova dodelitev (faza 2 plačano obnovi izrecno).
    `admin_dodeli_preverjen` prekliče aktivno pravico drugega uporabnika,
    `admin_preverjeni` pokaže aktivno pravico igralca ne glede na uporabnika
    (`aktivna`, `drug_uporabnik`). `user_id` je `on delete set null`: izbris
    računa pusti zgodovino (pomembno za plačila).
  - Lastnik potrjenega profila, ki ni preverjen, pri vklopljenem stikalu
    vidi nakup (spodaj); v aplikaciji je skrit (`jeNativno`, pravila trgovin).
  - **Faza 2: Stripe Checkout** (testni način, migracija 20261012210100).
    Kartica "Preveri profil": letno (9,99 €) ali za vedno (29 €), pri
    doživljenjski še "+ natisnjena značka" (5 €, poštnina 2 € SI / 4 € EU)
    z izbiro dostave "Slovenija / druga država EU" (seja dobi le to tarifo in
    le te države: SI ali EU-26) in imenom na znački (≤ 30,
    `prepovedane_besede`), obvezni potrditvi 18+ in soglasja o takojšnji
    zagotovitvi (izguba 14-dnevne pravice do odstopa); obe se shranita
    (`star_vsaj_18`, `odpoved_pravici`, CHECK za plačljiv vir). Gumb kliče
    funkcijo **`preverjen-placilo`** (JWT kupca): `checkout` →
    `preverjen_pripravi_nakup` z JWT kupca (stikalo, svoj potrjen profil prek
    `povezani_igralci`, ime ni skrito, ni že preverjen, ime na znački), cene po
    lookup_key (`slff_preverjen_letna`, `slff_preverjen_dozivljenjska`,
    `slff_znacka`), poštnina po metapodatku `kljuc` — id-jev Stripe v kodi ni.
    Checkout: `automatic_tax`, `billing_address_collection=required`, kupec iz
    prejšnje pravice ali `customer_email`, metapodatki `app=slff`, `user_id`,
    `player_id` (glavna), `vir`, `znacka`, `ime_na_znacki`, `dostava` tudi na
    naročnini/plačilu. Neznane napake baze funkcija vrne kot splošno
    "Plačila ni bilo mogoče začeti.". Povratek
    `SITE_URL/player/<id>?t=<liga>&placilo=uspeh|preklic`; ob `uspeh` kartica
    ~20 s sprašuje `je_preverjen` ("plačilo se še obdeluje", nato "plačilo
    prejeto"). **Preklic naročnine mora biti vedno mogoč**: `portal` vzame
    kupca iz `preverjen_moje_narocnine()` (lastne aktivne letne, ne glede na
    stikalo in profil); "Upravljaj naročnino" je na profilu in na `/account`
    (v aplikaciji le opomba "na slff.eu", brez povezave na nakup).
  - **`stripe-webhook`** (brez JWT): podpis `Stripe-Signature` (HMAC-SHA256
    `t.telo`, 5 minut, stalni čas; `podpis.ts`, preverja ga smoke). Dogodek
    se zapiše v `stripe_dogodki`; z `obdelano_at` se ne obdela znova, brez
    njega (napaka → 500) ga ponovitev obdela. Seje in naročnine štejejo le z
    `metadata.app = slff` (račun je skupen več znamkam); vračila in spori se
    iščejo **v bazi**: payment_intent, sicer račun → naročnina (stari API
    `charge.invoice`, basil `invoice_payments`); neznano → 200 in nič.
    Servisne funkcije (`service_role`):
    - `preverjen_iz_placila`: postavke seje najprej preveri webhook
      (lookup_key, en kos, `amount_subtotal` = cena × količina; sicer brez pravice in Discord),
      `znesek_pravice` se shrani. Seja enkrat (`stripe_checkout_id`, po
      zaklepu). Letna `velja_do` = konec obdobja + 3 dni milosti (obnova se
      plača nekaj ur po izteku), doživljenjska brez roka. Ročna ali tuja
      aktivna pravica pade. Profil ni več kupčev, ime skrito, dvojno plačilo
      ali izbrisan račun (`user_id` null) → vrstica `preklican`, izbrisan
      igralec → brez vrstice; vselej Discord "vrni denar" in takojšen preklic
      naročnine. Z značko vrstica v `narocila_znack`.
    - `preverjen_podaljsaj` (`invoice.paid`, `subscription.updated` active):
      rok le naprej; potekla vrstica iste naročnine oživi, če pravica spet
      lahko velja (`preverjen_lahko_velja`). Naša naročnina brez pravice
      (`brez_pravice`) → webhook jo prekliče in javi (varovalo).
    - `preverjen_narocnina_konec` (`deleted`, canceled, incomplete_expired →
      `potekel`). `past_due` in `unpaid` pustita pravico do roka;
      `cancel_at_period_end` do konca obdobja.
    - `preverjen_vracilo` (`charge.refunded`: znesek vrnjeno/plačano): polno
      vračilo, spor (`charge.dispute.created`) ali vračilo vsaj celotne cene
      doživljenjske → `preklican` (in značka); manjše pri odprtem naročilu →
      le značka; sicer le Discord. Postavke seje: `amount_subtotal` =
      cena × količina, `znesek_pravice` = `amount_total`.
    - `preverjen_spor_dobljen` (`charge.dispute.closed`, won): pravica se
      vrne, če profil še velja (zastarele aktivne vrstice najprej `potekel`,
      tudi pri oživitvi v `preverjen_podaljsaj`), sicer Discord.
  - **Ustavitev zaračunavanja.** Vsak prehod letne pravice z naročnino v
    `preklican` (preklic profila, anonimizacija, izbris računa, admin odvzem,
    dodelitev drugemu, sumljivo plačilo, vračilo, spor) sprožilec
    `preverjeni_oznaci_preklic` označi `stripe_preklic = 'caka'`.
    `stripe-webhook` čakajoče prekliče (`DELETE subscriptions/<id>`, nato
    `preverjen_preklic_opravljen`): po vsakem dogodku Stripe, ob
    `{"akcija":"preklici"}` z admin JWT (Administracija → Preverjeni po vsakem
    dejanju) ali servisnim ključem — delovni tok *Preverjeni: preklici
    naročnin* (`preverjeni-preklici.yml`, vsako uro; 404 pred objavo je le
    opozorilo; izpis le kode HTTP). Po dobljenem sporu naročnina ostane
    preklicana, letna velja do `velja_do` (`subscription.deleted` sami
    preklicane naročnine roka ne skrajša).
  - `narocila_znack`: ime, naslov (jsonb), poštnina, `za_tisk` →
    `natisnjeno` → `poslano` (`poslano_at`) ali `preklicano`; zaprta,
    `admin_narocila_znack`, `admin_nastavi_narocilo_znacke` (Administracija →
    Preverjeni → Naročila značk). Izbris računa ali anonimizacija naročila ne
    pobrišeta, `user_id` gre na null; 90 dni po pošiljanju ali preklicu ostane
    v naslovu le država (`preverjen_pocisti_naslove`, pg_cron 04:23), naročilu,
    ki obvisi v `za_tisk`/`natisnjeno`, pa 12 mesecev po naročilu (migracija
    20261012233100).
  - **Vklop testnega načina (lastnik):** na strežniku v `/opt/supabase/.env`
    `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`,
    `SITE_URL=https://slff.eu` (compose jih poda funkcijam; compose ročno),
    nato `scripts/hetzner/objavi-funkcije.sh preverjen-placilo` in
    `… stripe-webhook` (CI funkcij ne objavi). **Po objavi preveri, da je
    stripe-webhook dosegljiv brez JWT**: `curl -s -o /dev/null -w '%{http_code}'
    -X POST https://api.slff.eu/functions/v1/stripe-webhook -H
    'Stripe-Signature: t=1,v1=x' -d '{}'` mora vrniti 400 (podpis), ne 401.
    V Stripe (testni način) Webhooks → endpoint
    `https://api.slff.eu/functions/v1/stripe-webhook` z dogodki
    `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
    `invoice.paid`, `customer.subscription.updated`,
    `customer.subscription.deleted`, `charge.refunded`,
    `charge.dispute.created`, `charge.dispute.closed`; skrivnost podpisa na
    strežnik. Portal (Settings → Billing → Customer portal) vklopi preklic
    naročnine. Stripe Tax mora biti vklopljen (sicer `automatic_tax` seje
    zavrne). Testna kartica `4242 4242 4242 4242`, 3DS
    `4000 0027 6000 3184`, zavrnjena `4000 0000 0000 0002`. Stikalo 1 +
    preizkuševalec za preizkus.
  - **Faza 3: pogoji nakupa.** So razdelek `/legal#placljivo` ("Plačljive
    storitve: preverjeni igralci", ne svoja pot, zato brez sprememb Caddyja in
    zemljevida): prodajalec SPACE GUARDIAN d.o.o. (naslov, matična 9850538000,
    DDV SI42765153, info@slff.eu), ponudba in cene z DDV, Stripe, 18+, odpoved
    naročnine (ob koncu plačanega leta), izguba pravice do odstopa za digitalno
    vsebino (čl. 16(m)) in izjema za značko po meri (čl. 16(c)) ob ohranjenem
    jamstvu, prenehanje (preklic potrditve, skrito ime, izbris računa,
    chargeback), vračila (zloraba nič; naša napaka, zahteva zveze ali ukinitev:
    letna sorazmerno, za vedno vse v prvih 12 mesecih, nato sorazmerno do 5
    let; natisnjene značke in poštnine ob ukinitvi ne vračamo) in pritožbe
    (odgovor v 8 delovnih dneh, ne priznavamo izvajalca IRPS). Prodajalec je
    "vpisan v sodni register pri Okrožnem sodišču v Ljubljani". "Brez jamstva"
    velja le za brezplačno igro. Zasebnost pove, kaj hranimo o nakupu (10 let
    zapis, naslov 90 dni po pošiljanju ali preklicu, največ 12 mesecev), da
    plačila obdeluje Stripe in da izbris računa konča značko in naročnino brez
    vračila. Ključi `racun.pravno.*` v vseh 13 jezikih; sprememba pogojev =
    nov datum v `zadnjaSprememba`. Kartica nakupa ima pod potrditvama
    povezavo "Pogoji nakupa" (nov zavihek) in "Prodajalec: Space Guardian
    d.o.o."; Checkout ima nad gumbom opombo o takojšnji zagotovitvi
    (`custom_text.submit`, sl ali en po `jezik` iz vmesnika). Ista opomba z
    naslovom pogojev je **na računu** (trajni nosilec potrditve): pri enkratnem
    plačilu `invoice_creation` z `invoice_data.footer` (Stripe zaračuna
    Invoicing za račune po plačilu; račun sproži `invoice.paid` brez
    naročnine, ki ga webhook prezre), pri naročnini `subscription_data.description`
    (`invoice_creation` v načinu subscription ni dovoljen) — nogo računov
    naročnine da privzeta noga v Stripe (spodaj). **`STRIPE_TOS=1`**
    (env funkcij, compose) doda `consent_collection[terms_of_service]=required`;
    vklopi ga šele, ko je v Stripe Settings → Public details vpisan Terms of
    service URL `https://slff.eu/legal#placljivo`, sicer Stripe sejo zavrne.
    Strežnik HTML na strani igralca ob imenu izriše "✓ Preverjen igralec"
    (`preverjeni_igralci_za` z anon ključem, ki vrne kaj šele pri stikalu 2;
    napaka kljukico izpusti).
  - **Pred vklopom v živo (lastnik):** aktivacija računa Stripe v živem načinu
    s podatki Space Guardian (znamka SLFF, Public details: ime, podpora
    info@slff.eu, Terms of service URL zgoraj); katalog v živem načinu (CLI:
    cene z lookup_key `slff_preverjen_letna`, `slff_preverjen_dozivljenjska`,
    `slff_znacka`, poštnini z metapodatkom `kljuc` `postnina_si`/`postnina_eu`,
    davčna koda in `tax_behavior=inclusive`); Stripe Tax: registracija SI (in
    OSS za EU); e-poštna potrdila kupcem (Settings → Customer emails); živi
    webhook endpoint z istimi dogodki in portal; na strežniku `sk_live_…`,
    nov `whsec_…`, `STRIPE_TOS=1`, objava obeh funkcij; preizkus z eno pravo
    kartico in vračilom; šele nato stikalo `preverjeni_racuni = 2`. Še:
    - **Trajni nosilec**: Settings → Invoices → privzeta noga (Default footer)
      in potrdila kupcem (Customer emails: successful payments) s stavkom o
      odpovedi pravici in `https://slff.eu/legal#placljivo`; preveri na
      testnem računu enkratnega plačila in naročnine, da je stavek na obeh.
    - **Osnovni kapital** Space Guardian d.o.o. dopiši v `racun.pravno.prodajalec`
      (vseh 13 jezikov) — zdaj ga ni (TODO lastnik).
    - **Davčno potrjevanje računov (ZDavPR)**: spletna plačila s kartico so
      lahko zavezana davčno potrjenim računom (EOR/ZOI) — pred živim načinom
      potrdi z računovodjo, ali račun Stripe zadošča.
    - **Pravnik**: ali je značka digitalna vsebina (odpoved po čl. 16(m)) ali
      digitalna storitev (sorazmerno plačilo ob odstopu) — od tega je odvisno
      besedilo odpovedi.
    - **Portal v živem načinu**: preklic naročnine ob koncu obdobja (v
      testnem je tako nastavljen; ponovi v živem).
- **Uradne odsotnosti** (migracija 20261012135100): potrjeni igralec (lastnik
  potrjenega `zahtevki_igralca`, tudi za povezane vrstice) sam javi odsotnost
  (`objavi_uradno_odsotnost`: vrsta `poskodba`/`bolezen`/`dopust`/`kazen`/`drugo`,
  od, vrnitev ali neznano, opomba do 140 znakov) in jo zapre
  ("Spet sem nared", `zapri_uradno_odsotnost`, brez posledic). Naenkrat ena
  odprta na osebo. Tabela `uradne_odsotnosti` je zaprta (v njej je uporabnik);
  javno jo kaže pogled `uradne_odsotnosti_view` (brez uporabnika, `moje` za
  prijavljenega; profil, ki ni več potrjen, ne kaže ničesar). Na forumu
  Odsotnosti stoji z značko "Uradno: igralec sam" nad skupnostnimi poročili
  istega igralca (`zdruziZaForum` v `src/lib/uradneOdsotnosti.ts`), na strani
  igralca razdelek `UradnaOdsotnost.tsx` (lastnik vidi opomine in obrazec).
  **Preverba** `preveri_uradne_odsotnosti()` (servis) teče v poslu *skupno*
  delovnega toka *Uvoz zapisnikov* (`scripts/preveri-uradne-odsotnosti.mjs`,
  po združitvi duplikatov) in vsako uro prek pg_cron: če je igralec
  (katerakoli vrstica osebe) igral z minutami > 0 na tekmi z datumom v
  [od, vrnitev), po dnevu objave in pred dnem zaprtja, je odsotnost
  `ni_drzalo` (javno "Ni držalo: igral DD. MM.") in to je opomin osebi.
  Zapisnik pozna le datum, zato dan objave in dan zaprtja štejeta v korist
  igralca. Zaprte odsotnosti pregleduje še 60 dni (zapisnik lahko zamuja).
  Dva opomina v sezoni (`sezona_lige` lige vrstice, `uradne_odsotnosti_najvec()`)
  = do konca sezone brez uradnih odsotnosti; navadna poročila lahko piše še
  naprej. Nova sezona začne z nič. **Ni odbitka točk**: točke prihajajo le iz
  uradnih zapisnikov, zato odsotnost na točke in izbiro ekip ne vpliva.
  **Zamrznitev cene** (migracija 20261013233100, spec
  `docs/superpowers/specs/2026-10-13-zamrznitev-cene-design.md`): poškodba ali
  bolezen (ne dopust, kazen, drugo) zadrži padec borze "ni igral" (−0.1):
  `zamrznjena_odsotnost(player, round)` šteje kroge lige od dneva `od`, največ
  2, s potrditvijo klubskega računa (`klub_potrdi_odsotnost`,
  `klub_odsotnosti` v Urejanju kluba) 6, do vrnitve/zaprtja in še en krog.
  Dviga ne zadrži. `preracunaj_cene` zadržani padec zapiše v `zadrzani_padci`;
  ob "ni držalo" ga `preveri_uradne_odsotnosti` uveljavi (vsoto naenkrat, ne
  pod mejo borze, enkrat) — cena pade le na tisto, kar bi bila brez
  zamrznitve. Pogled ima `cena_zamrznjena` in `klub_potrdil`. Preizkus
  `npm run preizkus-zamrznitve` (tudi v CI). Anonimizacija vrstice jih
  izbriše (kot skupnostna poročila).
- `povzetek_rasti()` → ena vrstica številk (uporabniki, novi v 7 dneh, ekipe,
  aktivne lige, namestitve, kliki na "Časti pivo" skupaj in v 7 dneh), pod njo
  vrstica na državo (uporabniki z ekipo v ligi države in novi v 7 dneh, ekipe
  in nove, aktivne lige; država je država lige) in število uporabnikov brez
  ekipe — pod vsakim poročilom na Discord (mejnik uporabnikov,
  `scripts/trgovine.mjs`). Le servis
- **Pivski zid** (`/beers`, migracija 20261013150100): `piva` hrani nakupe
  Buy Me a Coffee (funkcija `bmc-pivo`, servisni ključ, `zunanji_id` = BMC
  `data.id`, idempotentno; vračilo postavi `vracilo`, `live_mode = false` je
  `test`) in ročne vnose admina (`vir = 'rocno'`). **Zneska, valute in
  e-naslova ne hranimo.** Sporočilo počisti sprožilec (`ocisti_sporocilo_piva`:
  `<br>` → nova vrstica, oznake proč, entitete, 500 znakov; isto pravilo
  `ocistiSporocilo` v `bmc-pivo/sporocilo.ts` za Discord), skrito na BMC se ne
  shrani. Tabela je zaprta; javno le `javna_piva()` (ime ali null za
  anonimne/"Someone", piva, sporočilo ali null, ko ga je admin skril, datum;
  brez vračil in testov). Admin: `admin_piva`, `admin_skrij_pivo`,
  `admin_dodaj_pivo`, `admin_izbrisi_pivo` (le ročni). Stran združi
  podpornike po imenu (`src/lib/piva.ts`). Če zapis v bazo ne uspe, gre
  Discord vseeno ven, BMC pa dobi 500 in ponovi. Stran in povezave so le na
  spletu (kot gumb `Pivo.tsx`)
- **Klubski računi** (migracija 20261013201100, spec
  `docs/superpowers/specs/2026-10-13-klubski-racuni-design.md`): klub dobi
  račun, ko se prijavi s **potrjenim** uradnim naslovom iz `klub_stik`
  (`uveljavi_klubski_racun`, kliče ga `useAuth` ob vsaki prijavi). Do 5
  računov na klub, en klub na uporabnika. Brez admina, razen: naslov brez
  `team_id` (`brez_kluba`), poln klub (`polno`) in prošnja za nov naslov
  (`klub_zaprosi_za_naslov`; predlagani naslov je vedno mail računa). Vse v
  Administraciji → Klubski računi (`admin_odloci_klubski_zahtevek`; potrditev
  vpiše ali popravi `klub_stik` s stanjem `sodeluje`). Preklican račun se ob
  prijavi ne obnovi. Povsod velja `je_klubski_racun(uid, team_id)`.
  **Faza 2** (migracije 20261013211100–215100): pozicija kluba
  (`klub_nastavi_pozicijo`) čaka v `pozicije_klub_cakajo` in jo uveljavi
  `uveljavi_pozicije()` v ponedeljek pred glasovanjem; vir `klub` je zaklenjen
  kot `admin` (`potrdi_pozicijo`, `pozicije_v_cakanju`, `ugani-pozicije.mjs`,
  `smeVVrata`), `admin` pa ga prepiše in klub `admin` ne; dnevnik
  `pozicije_klub_dnevnik`. Klub potrjuje profile svojih igralcev
  (`prevzem_je_poznavalec_kluba`). Stran kluba: `klub_predstavitev` (javno
  branje), `ima_klubski_racun` (oznaka), grb v vedru `grbi-klubov`
  (`klub_nastavi_grb`; `teams.logo_url` je relativna pot `/storage/…`, ki ji
  `naslovSlike` doda `API_URL`); `teams.logo_vir = 'klub'` in sprožilec
  `teams_grb_kluba` skriptam za grbe in `zdruzi-klube` preprečita povoziti
  grb, dokler ga admin ne ponastavi (`admin_ponastavi_grb`). Dodajanje
  igralcev in prijave napak sta fazi 3–4. Klub nikoli ne piše minut, golov, cen ali
  `reg_st`. Hrvaški in srbski stiki so s klubi povezani po imenu in ligi
  (migracija 20261013203100)
- `teams.logo_url` → grb kluba; če je prazen, `src/components/Grb.jsx` nariše
  ščit z začetnicami

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

SPA vsem naslovom vrne isti prazen `index.html`. Za `/`, `/table`, `/results`,
`/standings`, `/players`, `/player/*`, `/club/*`, `/match/*` (GET/HEAD) Caddy
(`@html_strani`) vpraša **strežnik HTML** (`scripts/hetzner/html/streznik.mjs`,
Node 22 brez odvisnosti, kontejner `slff-html` na 127.0.0.1:3200). Ta vzame
predlogo iz `/srv/slff/current` (index.html ali kartico države lige, kot Caddy),
prebere podatke iz PostgREST z anon ključem in vpiše `<title>`, opis, og:,
kanonični naslov (isto pravilo kot `kanonicni` v `src/lib/naslov.ts`), JSON-LD
(Person, SportsTeam, SportsEvent, BreadcrumbList) in povzetek s povezavami v
`<div id="root">`, ki ga React ob zagonu zamenja (brez hidracije). Neznan id →
404 z `noindex`. Reacta ne izriše; nizi pridejo iz `dist/html-besede.json`, ki
ga build zapiše iz slovarjev (`besedeZaHtml` v `vite.config.js` — nov ključ
dodaj v `KLJUCI` tam).

- **Vstopne strani držav** (`/si`, `/at` … za vsako državo z aktivno ligo;
  `drzava` v `streznik.mjs`): naslov je ime države, kanonični nase, v
  `#root` vse aktivne lige po zvezah (domača stran in lestvica, privzeta liga
  brez `?t=`). Predloga je kartica države (`at.html`), og:/twitter: opis
  ostane s kartice. Država brez aktivne lige dobi nespremenjeno predlogo.
  Vmesnik izriše isto stran (glej *Država obiskovalca*). `/` (domov) povezuje vse vstopne
  strani, prva drobtina (BreadcrumbList) kaže nanje.
- **Naslovi strani lige** (domov, lestvica lige, fantasy lestvica, rezultati,
  igralci) imajo za imenom lige državo: "Bundesliga (Österreich)", ker ima
  ime, kot je "Bundesliga" ali "2. Liga", več držav. Pravilo je preprosto:
  vedno, razen če ime lige državo že vsebuje (`zDrzavo` v `src/lib/naslov.ts`,
  kopija v `streznik.mjs`, ker kontejner nima `src/`; smoke ju primerja).
  Isto velja za `useNaslov` teh strani v vmesniku. Opis teh strani je
  po ligi (zveza, sezona, vrh lestvice ali zadnji izidi).
- Poševnica na koncu (`/table/`) je ista stran: strežnik jo za kanonični
  odreže, Caddy pa strani s seznama `@posevnica` preusmeri s 301 brez nje.

- **Varovalo**: PostgREST ima 800 ms za vse poizvedbe strani; ob napaki ali
  zamudi gre ven nespremenjena predloga s 200 (`X-Slff-Html: varovalo`,
  brez predpomnjenja). Če strežnik ne teče ali v 1,5 s ne odgovori, Caddy
  postreže isto predlogo z `:3201` (statično, kartica po `?t=`; blok brez
  imena gostitelja, ker proxy pošlje `Host: slff.eu`).
- **Predpomnilnik**: v pomnilniku 5 min (ključ pot + `?t=` le, kadar je znana
  liga in jo stran rabi; nova objava ga izprazni) in `Cache-Control: public, max-age=300, s-maxage=3600`. Strani so
  javne, piškotkov ne bere. Ker star HTML kaže na stare `/assets/*`, objava v CI
  prenese v novo izdajo še lastna sredstva vseh ohranjenih izdaj (`assets/.lastna`).
- **Objava**: `scripts/hetzner/objavi-html.sh` (iz main; preizkus, kopija
  prejšnje, `docker compose up -d` v `/opt/slff-html`). CI ga ne objavi.
- Preizkus brez baze: `npm run preizkus-html`. Lokalno proti bazi:
  `KOREN=dist SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=… PORT=3299 node scripts/hetzner/html/streznik.mjs`.
- Nova javna stran, ki jo iskalniki morajo videti: funkcija v `SEZNAMI` ali
  `ENTITETE` v `streznik.mjs` in pot v `@html_strani`.

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

### Vrsta pošte (luka@slff.eu)

Maile iz luka@slff.eu ne pošilja več človek, ampak vrsta (migracija
`20261012183100`): `klub_stik.v_vrsti` (naslov je v vrsti), `poslji_od` (prvi
mail ne prej) in `posiljatelj`. Pošilja jo **delavec na strežniku**, ne GitHub
Actions (dnevniki javnega repozitorija bi pokazali naslove): kontejner
`slff-posta` (`/opt/slff-posta`, `scripts/hetzner/posta/docker-compose.yml`,
node:22-alpine, omrežje gostitelja kot `slff-html`) poganja
`scripts/posta-klubom.mjs --zanka`. Vsakih 10 minut pošlje največ dva maila
(60–150 s narazen), le v oknu države prejemnika (08–18, pon–sob; AT dunajski,
EE tallinski čas) in največ 100 na dunajski dan. Najprej opomniki (en sam, ≥ 3
dni po našem prvem, brez pošte drugih — tudi klic ali drugo za vedno zapre
opomnik), nato prvi maili (`nov`, brez pošte, liga **aktivna** — neaktivna
liga čaka, tako Estonija do vklopa). Klub (isti `team_id` ali isto ime v
državi) čaka, če je v 3 dneh dobil pošto od kogarkoli ali v 7 dneh od drugega,
pravilo pa tik pred pošiljanjem preveri še enkrat na sveži pošti. **En stik na
klub:** drug naslov kluba, ki je prvi mail ali opomnik že dobil, prvega ne dobi.
Pred opomnikom pogleda v nabiralnik (IMAP, INBOX in Junk): mail z naslova ali
citirana povezava na stran kluba → `odgovor`, odboj ali SMTP zavrnitev →
`napacen_mail`. Pred SMTP vrstico prevzame (`v_vrsti = false`) in jo vrne šele
po vpisu v `klub_stik_posta` (poslal `Luka (luka@slff.eu)`); napaka po začetku
DATA ali neuspel vpis jo pusti zunaj vrste z opombo "poslano? preveri ročno" —
**nikoli samodejno znova** (in šteje v dnevno mejo). Polnjenje vrne v vrsto le
stare avstrijske vrstice pred vrsto (brez `posiljatelj`, `poslano`, brez opombe
"poslano…") in jim ob tem vpiše pošiljatelja. Kopija gre v Sent. Številke v mailu so sveže;
besedila (nemška, estonska) so v skripti in ne trdijo, da imamo dovoljenje
zveze. Prehodne napake delavec le zabeleži; zavrnjena prijava: ura premora,
nato izhod (Docker ga znova zažene).

**Dnevnik:** `ssh slff docker logs slff-posta` — brez naslovov (stik #id,
klub; naslovi zakriti v `k***@domena`). **Objava:**
`scripts/hetzner/objavi-posto.sh` iz main (skripte, ki jih pošta rabi, in le
`@supabase/supabase-js`); **CI je ne objavi** — po vsaki spremembi pošte jo
poženi ročno. **Enkratna nastavitev** (lastnik, skrivnosti niso v gitu): na
strežniku `/opt/slff-posta/.env` s `SUPABASE_SERVICE_ROLE_KEY=` (servisni
ključ iz `/opt/supabase/.env`) in `LUKA_SMTP_GESLO=` (geslo nabiralnika),
`chmod 600`; `SUPABASE_URL` (`http://127.0.0.1:8000`) je v compose.

**Polnjenje** teče na strežniku: `cd /opt/slff-posta && docker compose run --rm
posta node scripts/vrsta-poste-klubom.mjs --drzava AT` (načrt), nato z
`--pisi` (po želji `--poslji-od <ISO>`). Le uradni naslov kluba (AT: blok
"Kontakt" na vereine.oefb.at, brez Bundeslige in 2. Lige; EE: "E-post" na
strani ekipe jalgpall.ee, ne "Esindaja"), en naslov na klub, prva ekipa pred
rezervno, klub brez igralcev z nastopi izpusti; 403, 429 ali izziv ustavi
takoj. Vrstic drugih pošiljateljev in obstoječih naslovov ne spreminja.
jalgpall.ee ima skupen proračun branja (`SKUPEN_VIR`), strežnik pa nima
žetona za `cakaj-na-uvoze.mjs`: polnjenje EE zato prek javnega API GitHub
pogleda, ali teče ali čaka uvoz, ki bere jalgpall.ee (*Uvoz lige ee-…*, posel
*uvoz EE* nočnega uvoza, *Grbi klubov jalgpall*), in tedaj ne bere (izhod 3).
Ne zaganjaj ga tik pred uvozom Estonije. `--suho` na posta-klubom izpiše
naslednje maile brez pošiljanja.

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

V slovaških ligah (`sk-…`) je po 10 ± 2 **hišnih ekip** (`fantasy_teams.hisna`,
migracija 20260930130000). Vse ima en sistemski lastnik, profil **SLFF**
(`hisa@slff.eu`, `brez_opomnikov`, prijave ni). Neobvezni `display_name` je
izmišljeno prikazno ime samo za hišne ekipe: obe ligaški lestvici in stran
ekipe ga uporabijo namesto imena sistemskega profila. Piše ga le servis;
`NULL` ime skrije. Migracija 20260930160000 ga dodeli obstoječim hišnim
ekipam, sprožilec ob nastanku pa novim. Migracija 20260930180000 zamenja
prejšnja generirana imena z mešanico vzdevkov, začetnic s številkami, imen
in polnih imen; neodvisna izbira prepreči bloke enakih priimkov. Ime se
shrani, generator pa preskoči že zasedena prikazna imena v isti ligi.
Prave ekipe tega polja ne smejo imeti; njihovo ime ostane iz profila. En
lastnik ima zato več ekip v ligi: unikatni indeks ena-ekipa-na-ligo velja le
`where not hisna`, sprožilec pa lastniku hišnih ekip prepove človeške ekipe (in
obratno). V ligi štejejo povsod (lestvica, število ekip, točke kroga); **ne
štejejo** v izbranosti (`owners` in imenovalec deleža na strani Igralci),
državni lestvici, e-pošti (`kandidati_za_*`, popravek pozicij), mini ligah
(sprožilec na `mini_liga_clani`), admin statistiki in `skupaj_uporabnikov`.
Nova poizvedba, ki šteje ljudi ali ekipe čez lige, naj izpusti `hisna`.

Ustvari in odstrani jih samo delovni tok *Hisne ekipe* (`hisne-ekipe.yml` →
`scripts/hisne-ekipe.mjs`), najprej brez `pisi` za načrt. Kader shrani baza
(`ustvari_hisno_ekipo` → `shrani_ekipo` kot sistemski lastnik) in zavrne
neveljavnega. Točke zbirajo od prvega roka po nastanku, nazaj ne. Ponoven
zagon le dopolni do cilja (cilj je stalen po ligi). **Odstranitev:** isti tok
z `odstrani` (in `pisi`) → `odstrani_hisne_ekipe`, ki zavrne ves paket, če
kateri id ni hišna ekipa. Lokalno:

```bash
node scripts/hisne-ekipe.mjs --liga sk-za-1trieda          # načrt
node scripts/hisne-ekipe.mjs --odstrani --pisi             # vse SK hišne ekipe proč
```

Hišna ekipa, ki ji igralec odide, postane neveljavna in ostane brez točk;
skripta jih ob zagonu našteje.

Vrstni red ni izbiren: **arhiv → razpored → tekoča sezona → pozicije → cene**.
Igralec pod 270 minutami dobi privzeto 4.5, zato bi liga brez arhiva imela vse
igralce po isti ceni in prvi teden ne bi imel igre.

Isto zaporedje za mladince — `--tekmovanje mladinci`, arhiv je `--liga 1503`:

```bash
node scripts/uvoz-zapisnikov.mjs --tekmovanje mladinci --liga 1503
node scripts/uvoz-zapisnikov.mjs --tekmovanje mladinci
node scripts/uvoz-razporeda.mjs  --tekmovanje mladinci --pisi
node scripts/ugani-pozicije.mjs  --tekmovanje mladinci --pisi
node scripts/ovrednoti-igralce.mjs --tekmovanje mladinci --sezona 2025/26 --pisi
```

Brez `--liga` skripte vzamejo šifro tekoče sezone iz `competitions.mnzg_liga`
— ob novi sezoni je treba posodobiti njo, ne skript. `uvoz-razporeda` iz
razporeda razbere, kateri klubi letos igrajo, in igralce klubov zunaj lige
deaktivira (pri mladincih vsako leto odide cela generacija).

Ljubljanski ligi (vpisani sta **neaktivni**; vklopi ju šele, ko so cene prave):

```bash
node scripts/uvoz-zapisnikov.mjs  --tekmovanje lj-1-liga --liga 1904
node scripts/uvoz-razporeda.mjs   --tekmovanje lj-1-liga --pisi
node scripts/uvoz-zapisnikov.mjs  --tekmovanje lj-1-liga
node scripts/ugani-pozicije.mjs   --tekmovanje lj-1-liga --pisi
node scripts/ovrednoti-igralce.mjs --tekmovanje lj-1-liga --sezona 2025/26 --pisi
# isto za lj-2-liga, arhiv je --liga 1905
```

Preden ligo vklopiš, **preveri razpon cen** — mora biti primerljiv z
Gorenjsko (povprečje okoli 5, resničen vrh, ne vsi po 4.5):

```sql
select round(avg(value),2), min(value), max(value),
       count(*) filter (where value = 4.5) * 100.0 / count(*) as odst_privzetih
  from players p join competitions c on c.id = p.competition_id
 where c.slug = 'lj-1-liga' and p.active;

update competitions set active = true where slug in ('lj-1-liga','lj-2-liga');
```

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
