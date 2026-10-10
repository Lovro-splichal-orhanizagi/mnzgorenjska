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

Klubi se ujemajo le znotraj države vira (`mapaKlubov` po `vir.drzava`):
"NK Polet" ali "NK Mladost" je v Sloveniji in na Hrvaškem drug klub. Ključ
kluba ohrani ć in đ, ki ju slovenski `poenostavi` zavrže.

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
- 1. ŽNL Karlovac zapisnikov na Semafor ne vnaša — ostane izklopljena.
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

#**Nočni uvoz teče po državah** (matrika `drzava` v `.github/workflows/uvoz-zapisnikov.yml`).
Nova država mora na ta seznam, sicer se njene vklopljene lige ponoči ne uvažajo — brez napake.

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
`cakaj-na-uvoze.mjs` v Avstriji (`LOCENE_ZVEZE`) ročna uvoza nevklopljenih lig
dveh dežel pusti teči hkrati; hkraten vpis istega novega kluba ujame `klubId`
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

**Ostale regije Srbije ne objavljajo zapisnikov** (preverjeno 10. 10. 2026):
FS Vojvodine (fsv.rs, FS Novog Sada fsgns.rs), FS regiona Zapadne Srbije
(fsrzs.com, le PDF lestvice in strelci) in FS regiona Istočne Srbije
(fsris.org.rs, razpored in izidi s šiframi klubov) kažejo le izide in
lestvice. Tudi Srpska liga Vojvodina, Zapad in Istok nimajo zapisnikov
nikjer javno; državni ligi bere vir `fss` (spodaj). Vse zveze vodijo podatke v COMET (comet.fss.rs, za prijavo); javni
API "areports" zahteva ključ FSS — ključa s tujih strani ne uporabljamo.
Pot naprej je prošnja FSS za ključ.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=rs-bg-srpska -f
arhiv=srpska-liga-beograd-2025-26 -f cene=true`. Arhiv ~180 zapisnikov po 2 s
je okoli 7 minut na ligo.

### Srbija — vir `fss`

Vir `fss` (`scripts/viri/fss.mjs`) bere **fss.rs** (Fudbalski savez Srbije)
za državni ligi; Srpska liga in nižje so pri regijskih zvezah (zgoraj).
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
v **angleščini**, razen če je prvi jezik brskalnika `sl` ali `sk`
(`jezikTujca`); oznaka ostane v brskalniku, zato angleščina ostane tudi po
izbiri lige ali države. Neuspel IP (napaka, 800 ms, `vite dev`) ni tujec —
velja stari ugib brez vprašanja. SI in SK IP gresta naravnost v svojo državo.
Lokalno tujca preizkusiš z `localStorage.setItem('slff-tujec', 'CZ')` v
brskalniku brez shranjene lige.

**Izbira države** (`src/components/IzbiraDrzave.tsx`, "🇸🇮 Slovenija · 🇸🇰
Slovensko") je v nogi in na vrhu izbirnika lige; pokaže le države z aktivnimi
ligami. `preklopiDrzavo` zapiše državo, privzeto ligo in jezik v brskalnik in
naloži naslovnico nove države — ekip in strežnika se ne dotakne. Okno prvega
obiska ima isto povezavo ("Slovenija?"), ki pa ligo pusti neizbrano, da okno
vpraša znova z ligami nove države. Vstopni povezavi `slff.eu/sk` in `/si` sta
za kampanje in ostajata.

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
- `fantasy_teams` → ekipe uporabnikov, `fantasy_roster` → izbrani igralci
  (`is_starter`, `is_captain`, `is_vice`, `bench_order`)
- `fantasy_teams.hisna` → **hišna ekipa**: sistemska ekipa SLFF, da slovaške
  lige z eno ekipo niso prazne (glej *Hišne ekipe* spodaj)
- `fantasy_chips` → vloženi pripomočki (`klop_plus`, `wildcard`), vsak enkrat na
  sezono: ključ je `(fantasy_team_id, chip, season)`, `season` vpiše sprožilec
  iz kroga. Vmesnik naj bere in briše pripomočke **s filtrom na sezono**.
- `fantasy_lineups` → posnetek postave po krogih; nastane s `zakleni_krog(krog)`
  oz. `zakleni_zapadle_kroge()` (za cron). Točkovanje bere posnetek, če obstaja.
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
  Celje), hns, sportnet, mlsz, facr in fsb (`oznakaBrezIzida` v `razpored.mjs`);
  ostali viri ga nimajo in tekme ostanejo neoznačene. Preverba podatkov takih
  tekem ne javi kot `tekma-ni-uvozena`, šele po 30 dneh kot `tekma-brez-izida`
  (človek odloči: kontumacija ali izbris). Nov vir naj tekmi da `odigrana`
  (ali ima vir izid), kadar ga razpored pozna.
- Omrežje: uvozi berejo prek `prenesiSPonovitvami` (`scripts/prenos.mjs`) —
  ponovi omrežne napake, 5xx in 429 (2 s, 6 s, 15 s), 4xx nikoli. Nov prenos
  v uvozni skripti naj gre skozenj, ne mimo z golim `fetch`
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
  (točke kroga, premiki na lestvici mini lige, kapetan, klop, adut) kot jsonb;
  besedila sestavi `src/lib/miniLige.ts` (`zgodbeKroga`). Krog je **številka**
  tekoče sezone, ker mini liga gre čez lige; končane kroge ekip da
  `koncani_krogi_mini_lige`. Obe tečeta s pravicami klicatelja, zato tujec
  mini lige (RLS na `mini_liga_clani`) dobi `null`
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
- **Zemljevid strani**: `public/sitemap.xml` ima le stalne poti; po ligah ga
  ponoči sestavi `scripts/sitemap.mjs` (delovni tok `sitemap.yml`, anon ključ:
  strani lige s `?t=`, klubi, igralci z minutami letos ali lani, odigrane
  tekme) in ga z rsync prenese v `/srv/slff/sitemap/` na strežniku — ne v
  repozitorij in ne v `dist/`, ker objava zamenja mapo izdaje. Caddy streže
  `/sitemap-index.xml` in `/sitemap-*.xml` iz te mape. Nova javna stran lige
  sodi tudi v `STRANI_LIGE` v skripti
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
   (nov naslov še `--klub "…" --drzava SI|SK|HR|CZ|HU|AT|RS [--liga …]`). Pri paketih
   beleži sproti, po vsakem mailu, ne na koncu.
3. Odgovor kluba: `zabelezi --vrsta odgovor --opomba "<povzetek>"`; dogovor ali
   zavrnitev: `nastavi --za … --stanje sodeluje|ne_zeli`.

Ključ stikov je v `~/.config/slff/stiki-kljuc` ali `SLFF_STIKI_KLJUC` (da ga
admin; **repo je javen, ključ in naslovi nikoli v git**). Brez ključa ne
pošiljaj — vprašaj človeka. Funkcije: migracija `20261008143100_stiki_kljuc`.

## Poti

Poti so **angleške** (`/my-team`, `/players`, `/match/:id` …), ker jih vidi
vsaka država. Stari slovenski naslovi (`/moja-ekipa` …) so v `STARE_POTI`
v `src/App.tsx` in preusmerijo na nove s parametri, poizvedbo in #, zato
deljene povezave in e-pošta ostanejo veljavne. `/novo-geslo` je izjema: je
vpisana pri Supabase kot povratni naslov ponastavitve gesla in žeton nosi v
#, zato stran velja na obeh naslovih. Nova stran dobi angleško pot.

## Prevodi

`src/i18n/index.tsx` je celoten sistem, brez knjižnice:

- `t(kljuc, parametri)` — ključ je tipiziran (napačen javi `typecheck`),
  `{ime}` v nizu se zamenja s parametrom. Kliče se lahko kjerkoli, tudi zunaj
  Reacta (slike na platnu, `lib/`, konstante): jezik se izbere ob nalaganju
  strani in se med obiskom ne menja.
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
  jezik sam šele, ko je v `PRIPRAVLJENI` (`sl`, `hr`, `sk`, `cs`, `hu`, `de`, `sr`, `en`). Hrvaščina,
  slovaščina, češčina, madžarščina, nemščina, srbščina in angleščina so popolne — smoke preveri, da imajo vse ključe ter iste
  `{parametre}` in `<oznake>`; nov slovenski niz zato dodaj v vseh sedem.
- **Kateri jezik** (`zeljenJezik` v `src/lib/drzavaUgib.ts`, isto pravilo v
  `izberi()` ob nalaganju in v varovalu konteksta lige):
  1. izbira z izbirnika **"SL · SK · EN"** (`IzbiraJezika`, v nogi in na vrhu
     izbirnika lige; `izberiJezik` zapiše `slff-jezik-izbran` in stran naloži
     znova),
  2. tujec (glej *Država obiskovalca*) → angleščina, razen prvega jezika
     brskalnika `sl`/`sk`,
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
brez `pisi` za predogled) in `hisne-ekipe.yml` (hišne ekipe SLFF; najprej
brez `pisi`). Grb, dodan le v seznam in pognan lokalno, v
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
  `navijam_team_id`, `brez_opomnikov` in `brez_push` (odjava od e-pošte in
  pusha, stran `/reminders`); `is_admin` je servisno polje. Lastnik ekipe sme pisati le vnosna polja ob
  nastanku in ime ob spremembi. Za kader in denar vedno kliči `shrani_ekipo`.
  Brisanje ekipe je servisno opravilo, ker bi sicer obšlo zaklenjeno zgodovino.
- Nove tabele in pogledi v `public` vlogama `anon`/`authenticated` **ne dajo
  več pisanja** samodejno (migracija 20260923090000). Tabela, v katero piše
  vmesnik, potrebuje izrecen `grant insert/update/delete` in RLS. Pogled, ki ni
  `security_invoker`, teče mimo RLS — nikoli mu ne daj pisanja.
- V mini ligo se vstopi samo prek `pridruzi_mini_ligi` (s kodo) ali
  `ustvari_mini_ligo`; neposrednega vpisa v `mini_liga_clani` ni.
- Mutacijski RPC-ji so servisni. Admin stran kliče `admin_preracunaj_krog`,
  ki izrecno preveri `is_admin()`. Novi javni RPC potrebuje izrecen `grant execute`;
  privzeto funkcije niso več odprte vlogama `anon` in `authenticated`.
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
