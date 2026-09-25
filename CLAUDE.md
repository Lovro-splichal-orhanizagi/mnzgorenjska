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
- Gostovanje: Vercel + Supabase

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

### Slovaška (poskus, neaktivna)

Vir `sportnet` (`scripts/viri/sportnet.mjs`) bere **javni API**, ki ga
uporablja futbalnet.sk (`sutaze.api.sportnet.online/api/v2`), ne HTML. Šifra
lige je `<appSpace>/<competitionId>`; vsaka sezona ima svoj competitionId
(seznam: `/public/<appSpace>/competitions`). Zapisnik prinese pozicijo in
šifro ISSF vsakega igralca, zato Slovaška ne čaka na glasovanje o pozicijah;
asistenc ni, kot pri nas. Avtogol je `goal` z vrsto `dropped` in je zapisan pri
ekipi strelca.

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| sk-ssfz-4liga | `SsFZ/6a154cf844ff24612e07e083` | `SsFZ/68431237eba10c40f78a669c` |

**Dovoljenje SFZ/Sportnet še ni potrjeno** — liga ostane neaktivna in se v
produkcijo ne uvaža, dokler ga ni.

### Država obiskovalca

Domena je ena. Država sledi ligi: kdor ligo ima (`?t=` ali shranjena), ostane
pri njej. Le nov obiskovalec brez izbire dobi privzeto ligo države, ki jo
ugane `src/lib/drzava.ts` (povezava `/sk`, jezik brskalnika, časovni pas).
Slovenija in neznana država ostaneta pri `PRIVZETO`, država brez aktivne lige
prav tako — dokler je slovaška liga neaktivna, se za nikogar nič ne spremeni.
Vstopni povezavi `slff.eu/sk` in `/si` sta za kampanje.

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
- `fantasy_chips` → vloženi pripomočki (`klop_plus`, `wildcard`), vsak enkrat na
  sezono: ključ je `(fantasy_team_id, chip, season)`, `season` vpiše sprožilec
  iz kroga. Vmesnik naj bere in briše pripomočke **s filtrom na sezono**.
- `fantasy_lineups` → posnetek postave po krogih; nastane s `zakleni_krog(krog)`
  oz. `zakleni_zapadle_kroge()` (za cron). Točkovanje bere posnetek, če obstaja.
- `rounds.lineups_locked_at` → dokončan zajem, tudi za neveljavne/prazne ekipe;
  odsotnost posnetka ni dovoljenje za poznejši zajem. `fantasy_teams.roster_updated_at`
  beleži čas shranjevanja. `shrani_ekipo` pred spremembo zajame zapadle kroge;
  shranjevanje, zaklep in urejanje pripomočkov si delijo transakcijski zaklep lige.
- `rounds` → krogi sezone, `matches` → tekme (z izvorom `zapisnik_id`)
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
- `ucinkovita_postava(ekipa, krog)` → postava po samodejnih menjavah z množitelji;
  iz nje računa `fantasy_round_points_izracun`. Izid hrani tabela `tocke_krogov`
  in `fantasy_round_points` (ter z njim obe lestvici) bere **tabelo**, ker je
  sprotni izračun anonimnim obiskovalcem presegel 3 s. Tabelo po krogih osvežijo
  sprožilci na `player_scores`, `fantasy_lineups`, `fantasy_transfers`,
  `fantasy_chips`, `appearances` in `matches`; ponoči jo cron obnovi vso. Nov
  vhod v izračun **potrebuje svoj sprožilec**, sicer lestvica zaostaja do noči
  (`npm run preizkus-tock-krogov` primerja tabelo z izračunom).
- `player_standings` → lestvica igralcev (točke, forma, na tekmo, izbranost)
- stran Rezultati (`/rezultati`, `/tekma/:id`) sestavi postavi tekme iz
  `appearances` + `appearance_points`; nove sheme ne potrebuje
- `match_assist_status` → odigrane tekme s številom golov brez asistence
  (stran Asistence izbira po korakih: krog → tekma → gol)
- `naslednji_krog` → prvi krog, ki se še ni zaklenil (rok na strani Moja ekipa)
- `stanje_mojih_ekip()` → za prijavljenega vse njegove ekipe v aktivnih ligah:
  veljavnost, razlog, ali bo ob roku brez točk (prvi fantasy krog se zaklene
  tudi nepopoln) in igralci s poročilom o poškodbi/odsotnosti. Bere ga pas
  `OpozoriloEkipe` (rdeče napake, rumena opozorila, ki se dajo skriti);
  besedila sestavi `src/lib/stanjeEkip.ts`
- `teams.logo_url` → grb kluba; če je prazen, `src/components/Grb.jsx` nariše
  ščit z začetnicami

## Smernice za razvoj

- Uporabniško vidni nizi **niso v komponentah**, ampak v slovarju
  `src/i18n/sl/<področje>.ts` in se berejo s `t('področje.ključ', { … })`
  (glej *Prevodi* spodaj). Slovenščina je izvor; nov niz vedno dodaj tja.
- Ohrani kodo preprosto in berljivo; to je skupnostni projekt, ne enterprise.
- Preden dodaš novo odvisnost, preveri ali je res potrebna.
- Ob spremembi podatkovnega modela posodobi tudi README in to datoteko.

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
  jezik sam šele, ko je v `PRIPRAVLJENI`.
- Nizi iz baze (razlogi `razlog_neveljavne_ekipe`, napake RPC), e-pošta
  opomnikov in `index.html` so še slovenski — ob novem jeziku jih je treba
  urediti posebej. Administracija ostaja slovenska.

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
brez `pisi` za predogled). Grb, dodan le v seznam in pognan lokalno, v
produkcijo ne pride. Shemo in poizvedbe potisne Supabase CLI, ki je
povezan s projektom: `npx supabase db push --linked`, `npx supabase db query
--linked "<sql>"`.

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
- Lastnik profila sme posodobiti le `display_name`, `insider_team_id` in
  `brez_opomnikov` (odjava od opomnikov, stran `/opomniki`); `is_admin` je servisno polje. Lastnik ekipe sme pisati le vnosna polja ob
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
  adminu, ne objava. Števci so dnevni seštevki v `sponsor_stats`, ne dogodki.
- Na trg sodijo samo aktivni igralci (`player_overview.active`) — kader z
  neaktivnim igralcem `roster_je_veljaven` zavrne in ekipa tiho ostane brez točk.
