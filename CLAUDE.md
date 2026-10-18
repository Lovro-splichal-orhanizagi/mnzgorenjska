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
| Poljska | `docs/viri/poljska.md` | `pzpn`, `wmzpn` |
| Španija | `docs/viri/spanija.md`, `docs/viri/novanet.md` | `fcf`, `fas`, `novanet` |
| Nemčija | `docs/viri/nemcija.md` | `dfb` (Regionalliga Nordost; pred vklopom audit obeh sezon) |
| Anglija | `docs/viri/anglija.md` | `ncefl`, `isthmian` |
| Severna Makedonija | `docs/viri/makedonija.md` | `ffm` |
| Ukrajina | `docs/viri/ukrajina.md` | `aft`, `hoff-km`, `pfl-ua`, `upl`, `ffl` |
| Turčija | `docs/viri/turcija.md` | `askf`, `tff` |
| Armenija | `docs/viri/armenija.md` | `ffa` |
| Grčija | `docs/viri/grcija.md` | `mascot`, `eps` |
| Škotska | `docs/viri/skotska.md` | `lowland` |
| Litva in Črna gora | `docs/viri/litva-crna-gora.md` | `ltfutbolas`, `fscg` |
| Malta | `docs/viri/malta.md` | `mfa` |
| Bosna in Hercegovina | `docs/viri/bih.md` | `nsfbih`, `nfsbih` |
| Gruzija | `docs/viri/gruzija.md` | `gff` |
| Islandija | `docs/viri/islandija.md` | `ksi` |
| Ferski otoki | `docs/viri/ferski-otoki.md` | `fsf` |
| ZDA | `docs/viri/zda.md` | `modular11` |
| Danska | `docs/viri/danska.md` | `dbu` |
| Norveška | `docs/viri/norveska.md` | `nff` |
| Kazahstan | `docs/viri/kazahstan.md` | `kff` |
| Moldavija | `docs/viri/moldavija.md` | `fmf` |
| Azerbajdžan | `docs/viri/azerbajdzan.md` | `pfl-az` |

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
LV, TR (1. Lig nad 2. Lig nad 3. Lig nad PGL), UA, LT, GB, GR (znotraj iste zveze EPS), FO, IS, NO, KZ, MD po uradni piramidi, AT le državne nad deželnimi; mladinske se primerjajo le
z mladinskimi. Brez pravila (SI, RS, RO, PL, CZ, MK, ME, AZ) in brez šifer osebe ostane
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
- Čakalna vrsta prevzema: `povabila.kvalificiran_at` je enkratni strežniški
  čas prve kvalifikacije prijatelja (registracija + nehišna ekipa).
  Zasebni `vrsta_zahtevkov_igralca()` deli dejanski vrstni red med uporabnika
  in admin; dodatna/ponovno ustvarjena ekipa ne daje nove prednosti.
  Samo uporabniški prikaz števila pred njim je pomnožen s 7.
- Plačila (preverjeni igralci, Stripe): stikalo `preverjeni_racuni`, webhook
  `stripe-webhook`, **preklic naročnine mora biti vedno mogoč**; vse v
  `docs/podatkovni-model.md` (*Preverjeni igralci*).

## Pregledane zgodovinske vrzeli

`matches.statistics_status = 'unavailable_historical'` ohrani uradni izid,
vendar nima nastopov/golov in `imported_at` ostane NULL. Izjeme so omejene
na točne identitete in SHA v `scripts/policies/historical-statistics-exclusions.json`;
zasebna shema hrani odobritev in nespremenljive označbe. Navaden uvoz ali
neposredna sprememba `active` ne odobrita vklopa take lige. Za namestitev
so potrebni servisni RPC, neaktivna liga brez uporabniških ekip in resničen
prihodnji prvi fantasy krog. `get_installed_historical_statistics_markers`
preveri vezave na klube/kroge; označba ni dovoljenje za ugibanje statistik.
`match_assist_status` vrne NULL za neznane posamezne podatke in zapre
glasovanje, `sezone` pa ločeno šteje popolne in nedosegljive zapisnike.

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

Vsaka taka stran (in javna mini liga, povabilo `/l/:koda`) ima ob deljenju svojo
sliko (og:image 1200 × 630, kartica igralca, plakat kluba, izid, vrh lestvice), ki
jo riše strežnik slik `scripts/hetzner/predogledi/` (kontejner `slff-predogledi`,
`/predogled/*`, ob napaki privzeta `og/slff-og.png`). Risba je prepis
`KarticaIgralca.tsx` in `Plakat.tsx`: spremembo oblike prenesi tja in dvigni
`RAZLICICA_PREDOGLEDOV`. Brez kartice so anonimizirani in mladinske lige.
Podrobnosti v `docs/streznik-html.md` (*Slike za predogled*); CI ga ne objavi
(`scripts/hetzner/objavi-predogledi.sh`).

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

Samodejno pošiljanje iz luka@, lovro@, nejc@ in klubi@slff.eu (vrsta, delavec
`slff-posta` na strežniku, ogrevanje novih nabiralnikov, opomnik od istega
pošiljatelja, okna, polnjenje po državah, objava): `docs/posta-klubom.md`.
CI ga ne objavi (`scripts/hetzner/objavi-posto.sh`).
Odgovore v lovro@, nejc@ in klubi@ (niso v HelpStacku, opomnik pregleda le
INBOX in Junk) lastnik zabeleži v 3 dneh (`zabelezi --vrsta odgovor`).
Skupni razmik 60–150 s: okoli 34 mailov/uro, 340/dan za vse skupaj. Med tekom
kontejnerja `posta-klubom.mjs` le s `--suho`; objava izven okna pošiljanja.

`klub_stik.drzava` sprejme tudi `DE` (migracija `20261018120600_stiki_nemcija`);
pravila predhodnega preverjanja in beleženja veljajo enako za nemške klube.

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

## SLFF Scout (stroj)

Delavec `slff-scout` (Python 3.12, `scout/stroj/`) vsak dan ob 11:00 (po
nočnih uvozih) izračuna moč lig (tedensko), Elo, kazalnike, indeks, podobne
in vrzeli ter jih zapiše v zaprto shemo `scout` kot novo različico
(`scout.modeli`) v eni transakciji. Vse ostalo (izločanje, backtest, spomin,
objava, testi): `docs/scout.md`. Bistvo:

- **Mladinske lige, osebe z vrstico v mladinski ligi (razen s polnoletno
  letnico na potrjenem profilu, le prijavitelj), ugovor (`scout.ugovori`) in
  anonimizirani (tudi ista oseba v drugih ligah) ne vstopijo v izračun.**
  Izjema: stran Klub lastnemu klubu pokaže njegove igralce z mladinsko
  vrstico (le javna dejstva tekem, brez ugovora in anonimiziranih).
- Privolitev igralca (odprt za prestop, letnica, regije, stik) je v zaprti
  `scout.privolitve`, ne v javnem `profil_igralca`; piše le
  `scout_shrani_privolitev`. Ugovor nikoli ne gre v javno tabelo.
- Moč lig je **lestvica znotraj države**; primerjav in projekcij čez države
  ni. Backtest šteje le pokrite prestopnike in leto izbere po zgodovini;
  od 16. 10. 2026 je `prestal` (2026: +18,6 % proti naivni, +7,3 % od moči
  lig) in model je objavljen. Vmesnik bere le zadnji objavljeni model.
- Shema `scout` ni dostopna `anon`/`authenticated`; delavec se prijavi kot
  `scout_stroj` z geslom (nastavi ga lastnik ročno na strežniku, nikoli v
  git). Država se odpre v `scout.drzave` — **pred drugo državo mora pisanje teči pretočno**, sicer
  delavec preseže `mem_limit: 1g`.
- `ravenLige` ima prepis v `scout/stroj/stroj/ravni.py` (test enakosti).
  CI ga ne objavi (`scripts/hetzner/objavi-scout.sh`) in Pythonovih testov ne
  poganja: `cd scout/stroj && .venv/bin/pytest -q`.

## SLFF Scout (klubi, scout.slff.eu)

Plačljivo orodje za klube: ločena Vite aplikacija v `scout/`
(`npm run dev:scout`, `build:scout` → `dist-scout/`, `smoke:scout`), ista
baza in računi, seja svoja. Bere **le** RPC `scout_*`, nikoli sheme `scout`
neposredno. Stran Klub (`/club`, `scout_klub`) je pregled lastnega kluba;
administratorji izberejo katerikoli klub v državi naročnine. Vsaka nova funkcija Scouta gre skozi `scout.dostop` in
`scout.vidni` in dobi test v `supabase/tests/varnost.sql`; vsako novo
poizvedbo pred združitvijo izmeri na produkciji. Nizi so v
`scout/src/besede.ts`: "kazalniki iz podatkov tekem", brez negativnih oznak. CI jo objavi le ob `SCOUT_OBJAVA=1`; DNS, Caddy blok,
GoTrue, funkcije in Stripe so ročni. Vse: `docs/scout.md` (*Aplikacija
scout.slff.eu*, *Objava aplikacije*).

## SLFF Trgovina (shop.slff.eu)

Spletna trgovina z izdelki SLFF (lastna zaloga, Pošta Slovenije, EU-27,
prodajalec Space Guardian): aplikacija `shop/` (`dev:shop`, `build:shop`,
`smoke:shop`), zaprta shema `trgovina` (brskalnik le `trgovina_katalog`,
`trgovina_izdelek`, `trgovina_moja_narocila`; admin `trgovina_admin_*` z
`is_admin()`), Stripe `metadata.app = slff-shop` (`trgovina-nakup`,
`stripe-webhook/trgovina.ts`, `trgovina-posta`). Cene v centih **z DDV**;
zaloga se odšteje le ob plačilu, rezervacija drži 35 min. CI jo objavi ob
`SHOP_OBJAVA=1`; funkcije, Stripe tarife in živi ključ so ročni. Vse:
`docs/trgovina.md`.

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
  jezik sam šele, ko je v `PRIPRAVLJENI` (`sl`, `hr`, `sk`, `cs`, `hu`, `de`, `sr`, `ro`, `et`, `pl`, `es`, `lv`, `mk`, `el`, `tr`, `uk`, `hy`, `az`, `da`, `en`). Hrvaščina,
  slovaščina, češčina, madžarščina, nemščina, srbščina, romunščina, estonščina, latvijščina, makedonščina, grščina, turščina, ukrajinščina, armenščina, azerbajdžanščina, danščina in angleščina so popolne — smoke preveri, da imajo vse ključe ter iste
  `{parametre}` in `<oznake>`; nov slovenski niz zato dodaj v vseh.
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
- **Nagrade tedenskega pregleda mini lig** imajo pravila prijaznosti (šala le na
  račun ekipe ali maskote, nikoli resničnega igralca; šaljive le od 4 ekip, ne
  dvakrat zapored, lastnik jih izklopi; mladim brez piva; deli le človek) —
  preberi jih v `docs/podatkovni-model.md` (*Nagrade tedenskega pregleda*),
  preden dodaš nagrado, niz ali pozo maskote.
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

Regionalni DFB vklop uporablja ločen servisni `varen_vklop_dfb_regije` in
odobrene zajeme v `uvoz-dfb-regije.yml` / `vklop-dfb-regije.yml`;
`varen_vklop_nemcije` ostaja samo za Nordost. Regionalni manifest zahteva
celotno zgodovino in ujemanje vseh uvoženih nastopov/golov. Postopek je v
`docs/viri/nemcija.md`; testi zahtevajo izrecno odstranljivo bazo prek
`SUPABASE_DB_CONTAINER`.
