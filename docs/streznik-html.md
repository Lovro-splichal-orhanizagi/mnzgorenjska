# Strežnik HTML (iskalniki, kartice)

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
