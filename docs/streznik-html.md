# Strežnik HTML (iskalniki, kartice)

SPA vsem naslovom vrne isti prazen `index.html`. Za `/`, `/table`, `/results`,
`/standings`, `/players`, `/player/*`, `/club/*`, `/match/*`, `/mini-leagues/*`, `/l/*` (GET/HEAD) Caddy
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

## Slike za predogled povezave (og:image)

Vsaka stran igralca, kluba, tekme in lige ter javna mini liga (`/mini-leagues/:id`)
in povabilo (`/l/:koda`) ima ob deljenju (WhatsApp, Viber, Facebook, Messenger)
svojo sliko 1200 × 630 namesto skupne `og/slff-og.png`:

| stran | slika |
|---|---|
| `/player/:id` | kartica FUT (kot `KarticaIgralca.tsx`): točke sezone, pozicija, grb ali začetnice, dres, goli, asistence, minute, cena; desno ime, klub, liga |
| `/club/:id` | plakat kluba (kot `Plakat.tsx`): grb, ime, liga, mesto na lestvici, trije z največ točkami |
| `/match/:id` | plakat izida: grba, izid, krog in datum, strelci |
| `/`, `/table`, `/results`, `/players`, `/standings` | ime lige, država in zveza, vrh lestvice (pet klubov); brez lestvice maskota |
| `/mini-leagues/:id` (javna) | ime, liga, število ekip, vrh fantasy lestvice |
| `/l/:koda` | "Povabilo v mini ligo", ime, število ekip, maskota |

- **Strežnik slik** (`scripts/hetzner/predogledi/`, kontejner `slff-predogledi`
  na 127.0.0.1:3202, Node 22 + `@napi-rs/canvas`): `GET /predogled/<vrsta>/<id>.jpg`.
  Platno ima isti Canvas 2D API kot brskalnik, zato je `risbe.mjs` prepis kartice
  in plakata — **spremembo oblike tam prenesi sem** (in dvigni
  `RAZLICICA_PREDOGLEDOV` v `html/streznik.mjs`, da omrežja vzamejo nove slike).
  Podatke bere `podatki.mjs` prek PostgREST z anon ključem; prevajalnik in
  pravila uvozi iz `html/streznik.mjs`, nize iz `html-besede.json` (`KLJUCI`).
- **Kaj ne gre na sliko**: anonimiziran igralec (ime `#…`) in igralci mladinskih
  lig nimajo kartice (`smeKartico` v `Igralec.tsx`), klub in tekma mladinske lige
  sta brez imen igralcev, fotografij igralcev ni nikjer, zasebna mini liga le prek
  kode in le z imenom in številom ekip (brez lastnika). Takrat gre ven privzeta
  slika; strežnik HTML jim og:image sploh ne zamenja.
- **Pisave** so ob strežniku (`predogledi/pisave/`, OFL): Inter (statične
  debeline; spremenljive InterVariable platno ne zna odebeliti), Barlow
  Condensed, za cirilico in grščino v ozki vlogi Fira Sans Extra Condensed,
  Noto Sans Armenian in Georgian. Kontejner nima sistemskih pisav: `odseki` v
  `risbe.mjs` besedilo razreže po pisavi, ki znak ima. Nova pisava = datoteka v
  `pisave/` in vrstica v `DRUZINE`.
- **Naslov in predpomnilnik**: strežnik HTML vpiše `og:image` (in
  `twitter:image`, mere, `summary_large_image`) z `?v=` iz podatkov, ki jih slika
  kaže (točke, izid, vrh lestvice; strani lige brez lestvice dan) — novi podatki,
  nov naslov, zato Facebook in WhatsApp ne ostaneta pri stari sliki. Strežnik slik
  `v` ne bere: datoteka na disku (`predpomnilnik/`) je poimenovana po izvlečku
  narisanih podatkov in jezika, za entiteto ostane le zadnja, vseh največ 3000
  (najdlje nebrane gredo). Podatki v pomnilniku živijo 10 min. Odgovor:
  `Cache-Control: public, max-age=3600, s-maxage=21600`, `X-Slff-Predogled:
  nova|disk|privzeta`.
- **Varovala**: neveljavna pot ali id (`/predogled/player/abc.jpg`, koda z
  `I`/`O`/`0`/`1`) → 404 brez baze. Neznana ali skrita entiteta, PostgREST
  počasnejši od 1,5 s ali dol, polna vrsta risanja (največ 2 hkrati, 16 čaka),
  napaka risbe → privzeta `og/slff-og.png` s 200 (napaka le 60 s v
  predpomnilniku). Če strežnik ne teče ali v 4 s ne odgovori, Caddy postreže
  privzeto sliko z `:3201`. HTML ni nikoli počasnejši: slike bere omrežje s
  svojim zahtevkom.
- **Objava**: `scripts/hetzner/objavi-predogledi.sh` (preizkus, kopija prejšnje v
  `/opt/slff/backup-predogledi/`, `@napi-rs/canvas` iz `package-lock.json`
  namesti `node:22-alpine` na VM, `docker compose up -d` v
  `/opt/slff-predogledi`), nato Caddy, nato `objavi-html.sh`. CI ga ne objavi.
- Preizkus: `npm run preizkus-predogledov` (`VZORCI=<mapa>` zapiše vse slike,
  tudi armenske, grške, gruzinske, turške in predolga imena). Lokalno proti bazi:
  `KOREN=dist PREDPOMNILNIK=/tmp/pp SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=… PORT=3298 node scripts/hetzner/predogledi/streznik.mjs`.
