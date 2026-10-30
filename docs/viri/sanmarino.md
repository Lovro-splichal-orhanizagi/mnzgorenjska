# San Marino — vir `fsgc`

Vir `fsgc` (`scripts/viri/fsgc.mjs`) bere **fsgc.sm** (Federazione
Sammarinese Giuoco Calcio). Strani izriše strežnik (CMS Studio99, HTML brez
JSON-a in brez ključev). Država `SM` ("San Marino") in liga se vpišeta z
migracijo `20261030143100_sanmarino_fsgc`. **Država je pripravljena** kot
JP, HK, TH in GI: angleški vmesnik brez lastnega slovarja
(`JEZIK_DRZAVE.SM = 'en'`), ugib po `it-SM` ali pasu `Europe/San_Marino`
(gola `it` ne kaže nanj), vstop `slff.eu/sm`, kartica `sm.html` (Caddy,
rezerva `:3201`, `vercel.json`), angleška pošta z rokom po sanmarinsko
(= ljubljansko), zastava (civilna, belo-modra), imena hišnih ekip in
lastnikov (`IMENA_SM`, veja `SM` v `ime_hisnega_lastnika`),
`klub_stik.drzava`, `SM` v matriki nočnega uvoza. Liga ostane neaktivna do
uvoza in vklopa. Šifra lige v bazi se začne s `sm-`.

- **Sezona je avgust–maj**: `"2026/27"` (iz datuma tekme). Osnovni del se
  konča aprila, nato je končnica (zavihek *Playoff*), ki je ne uvažamo.
- **Šifra lige je `<slug>-<id prvenstva>/<season_id>`**:
  `campionato-sammarinese-1/48`. `season_id` je v izbirniku sezon na strani
  prvenstva (`?season_id=48` je 2026/27). **Neznan `season_id` stran tiho
  zamenja s tekočo sezono**, zato vir preveri, da je izbrana sezona (gumb
  `bg-primary`) prav zahtevana, sicer se ustavi.
- **Naslovi.**
  - `/it/campionato/<slug>/<id>?season_id=<s>` — vsi krogi v harmoniki
    (`gamesAccordion`, "Giornata 1" …): datum in ura ("28/08/2026 21:15",
    "TBD" pred objavo, pri prestavljeni še "Recupero"), domači in gostje s
    povezavo `/it/squadra/<slug>/<id>`, izid ("5 - 0", neodigrana "-") s
    povezavo na tekmo. Tekma ima povezavo že pred začetkom. Ena stran,
    ~1 MB.
  - `/it/partita/<slug>/<id>` — stran tekme. Slug strežnik prezre (`m`
    velja). Glava: stanje (*Concluso*, *In programma*), izid "1:0",
    tekmovanje, datum, "Orario 20:45". Zavihki: *Dettagli* (časovnica:
    minuta v sredini, levo domači, desno gostje), *Formazioni* (Titolari in
    Panchina: dres, povezava `/it/giocatore/<slug>/<id>`, prikaz "M. De
    Angelis", vloga *Portiere/Difensore/Centrocampista/Attaccante*, kapetan),
    *Statistiche* (vsote dogodkov po ekipah).
- **Šifra igralca** je id povezave (`/it/giocatore/de-angelis-mirco/94` →
  `reg_st` 94), stalen čez sezone (vzorec: 208 igralcev v 2025/26 in 2026/27,
  vsi z istim id-jem in imenom). Isto ime z dvema id-jema so različni ljudje
  (Gasperoni Marco 58/731, Gori Nicola 409/1164, Valentini Filippo 735/939).
  Ime: priimek iz prikaza (z naglasi), ime iz sluga — "De Angelis Mirco",
  "D'addario Nicola". Slug v časovnici je obrnjen ("Matteo-Sapucci"), zato
  dogodke vežemo **le po id-ju**. Strani igralca **ne beremo**.
- **Pozicije** dá vir (vloga v postavi → GK/DEF/MID/FWD, uvoz jih vpiše kot
  `zapisnik`); vratar je *Portiere* v začetni enajsterici. Glasovanje o
  pozicijah zato ni potrebno (SM ni v `DRZAVE_Z_GLASOVANJEM`). Asistence vir
  ima (*Assist*), a jih kot pri drugih virih ne uvažamo — določi jih
  glasovanje.
- **Dogodki z minuto**: Gol, Gol (Rig.), Autogol, Rigore Sbagliato
  (`zgresene`), Ammonizione, Espulsione, menjava Entra/Esce. Minuta "90' +
  2'" je 90, "45' + 1'" je 45. **Avtogol** je v stolpcu ekipe, ki ji šteje
  (strelec je nasprotnik; *Statistiche* ga šteje tej ekipi). **Drugi
  rumeni**: Ammonizione ob prvem in Espulsione ob drugem kartonu (vzorec
  2026/27: 4 od 9 rdečih) — 1 rumeni + 1 rdeči. Izključeni igra do minute rdečega.
  **Karton trenerju** (povezava `/it/allenatore/`) šteje le v vsoti, ni
  igralčev.
- **Šifra zapisnika v bazi je `sm<id>`** (id tekme FSGC, 900–2100 …).
- **Čas**: Europe/San_Marino = Ljubljana, ura se ne pretvarja.

## Napake vnosa pri viru

Vir vnašajo ročno; v vzorcu so tri vrste napak:

- **Ista menjava dvakrat ob isti minuti** (`sm1834`): druga se preskoči z
  opozorilom.
- **Isti "Entra" pri obeh ekipah** (`sm931`, `sm932`, `sm937` v 2025/26):
  vstopni ni med rezervami te ekipe. Kot pri `gfa`: izstopni igra do menjave,
  vstopni nima nastopa (ekipi zmanjka do 23 minut), le opozorilo.
- **Isti igralec gre ven dvakrat ob različnih minutah** (`sm1823`, Cosmos:
  Rossi za Zaghinija v 27. in 71.): katera minuta je prava, ne vemo, zato je
  zapisnik `nepopoln` (tekoča sezona: izid in nastopi zapisani, do 45 dni se
  bere znova; arhiv: preskočen).

Rdeči karton neuporabljene rezerve (`sm944`) se izgubi (nima nastopa, kot
drugje). Dva *Portiere* v začetni enajsterici (`sm970`) uvoz razreši sam
(oznake vratarja ne verjame pri nobenem).

## Popolnost

Zapisnik je `nepopoln` (`NEPOPOLN` prvo opozorilo), če ekipa nima 11
začetnikov, ima igralca brez šifre, se goli iz dogodkov ne ujemajo z izidom,
je izstopni menjave ali vstopni na napačni strani igrišča ali izstopni ni v
postavi. Neodigrana tekma (ni *Concluso*) ni zapisnik in ne gre v
predpomnilnik. Vsote *Statistiche* (rumeni, rdeči, menjave) so le opozorilo.

Preizkus (30. 10. 2026, brez pisanja v bazo):

| sezona | tekem / odigranih | prebranih | goli = izid | 11 + 11 začetnikov | 1 vratar | 990 minut (ekipe brez rdečega) | nepopolnih |
|---|---|---|---|---|---|---|---|
| 2026/27 (`…-1/48`) | 240 / 48 | 48 | 48 | 96 / 96 | 96 / 96 | 87 / 87 | 1 (`sm1823`) |
| 2025/26 (`…-1/19`) | 240 / 240 | 40 (krogi 1–5) | 40 | 80 / 80 | 79 / 80 (`sm970`) | 75 / 78 (tuji "Entra") | 0 |

Vseh 88 tekem: 230 golov (15 iz enajstmetrovke) in 5 avtogolov, 7 zgrešenih
enajstmetrovk, 337 rumenih, 14 rdečih, 772 menjav, vsi igralci s pozicijo, povprečno 8,8
nastopa s klopi na tekmo (2026/27). Pred uvozom arhiva **preštej ves arhiv**
(skill `dodaj-ligo`, 0c) — zgornje je vzorec (tudi zaradi vljudnosti do
vira).

## Liga

Vpisana je ena liga (migracija `20261030143100_sanmarino_fsgc`),
**neaktivna**, zveza `fsgc`:

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|---|
| sm-campionato | 16 | `campionato-sammarinese-1/48` | `campionato-sammarinese-1/19` | `campionato-sammarinese-1/1` |

- **Campionato Sammarinese**: 16 klubov, 30 krogov (vsak z vsakim dvakrat),
  avgust–april; 30. 10. je odigranih 6 krogov, datumi od 15. kroga naprej so
  "TBD" (krogi brez datuma in roka, dokler jih zveza ne objavi).
- Imena klubov so v razporedu 2025/26 in 2026/27 ista (`ISTI_KLUB_SM` je
  prazen); glava tekme jih piše z velikimi črkami, uvoz vzame ime iz
  razporeda. Klubi so le sanmarinski — trkov z drugimi viri ni.
- **Raven lige** (`ravenLige`) za `sm-` ni določena (ena liga).

**Ni vpisano:** končnica (Playoff), Coppa Titano, Supercoppa, futsal,
mladinske in ženske lige.

## Pravice (pregled 30. 10. 2026, ni pravni nasvet)

robots.txt: `User-agent: *` / `Disallow: /admin` — strani prvenstev in tekem
so dovoljene. Pogojev uporabe stran nima (zemljevid strani našteje le
*Privacy Policy* in *Cookie Policy*, brez določb o samodejnem dostopu ali
ponovni uporabi; v nogi "Tutti i diritti riservati"). Dovoljenja FSGC nimamo.
Spredaj je Cloudflare (brez izziva ob branju). Beremo odkrito (User-Agent
`SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih zapisnikov
ne beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi — ne
obhajaj** (`FsgcZavrnitev`, izhod 4). Stran ima v prevodih niz
"recaptcha_error", zato `jeIzziv` ne išče gole besede "captcha". Če nas
FSGC prosi, naj nehamo, `sm-` ligo izklopimo.

## Pred vklopom

- Uvoz (arhiv 2025/26 je 240 tekem po 3 s, ~13 minut; tekoča sezona še ~50):
  `gh workflow run uvoz-lige.yml -f liga=sm-campionato -f arhiv='campionato-sammarinese-1/19' -f cene=true`
- Ena sezona ima ~545 igralcev v 16 klubih in 30 krogov — dovolj minut za
  cenik; 2024/25 (`…-1/1`) le, če cenik pokaže preveč privzetih 4.5.
- `prvi_fantasy_krog` je 1 — ob vklopu sredi sezone ga nastavi na prvi
  prihodnji krog.
- Strežnik HTML (`scripts/hetzner/objavi-html.sh`), Caddy (`/sm`, `?t=sm-…`)
  in funkcijo pošte (`scripts/hetzner/objavi-funkcije.sh`) CI ne objavi.

Preizkusi: `npm run smoke` (blok *vir fsgc*, vzorci `scripts/vzorci/sm-fsgc-*`).
