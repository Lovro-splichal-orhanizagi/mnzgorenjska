# Samodejne objave (Instagram, Facebook)

Načrt: `docs/superpowers/specs/2026-10-15-samodejne-objave-design.md`. Faza 1:
osnutki na Discord; **faza 2: ob roku objava na Instagram in Facebook, če je
nihče ne ustavi** — le, ko so na strežniku ključi `META_*` (brez njih ostane
faza 1). Delavec `slff-objave` na
strežniku (`scripts/objave.mjs --zanka`, `/opt/slff-objave`, slika Playwright)
vsakih 10 minut pogleda termin. **Vse objave so angleške** (napis in
prosojnice, `JEZIK`; lastnik, 15. 10. 2026). **Ponedeljek** osnutek 04:00,
objava 09:20–11:40 — **vrtiljak vseh držav** (lastnik, 15. 10. 2026; prej
rotacija ene države): naslovnica "Weekend in Europe's Sunday leagues" z
obdobjem in zastavami, ena prosojnica na državo (zastava in angleško ime,
igralec kroga velik, do dva za njim), poziv "Pick your Sunday XI · slff.eu".
**Četrtek** osnutek 12:00, objava 17:10–19:40 — **dosežki tedna**: naslovnica,
en dosežek na prosojnico (največ 6), poziv. En osnutek na termin in teden
(`objave`, delni unique `slot, teden` za pon/cet); zamujen termin se ne
nadoknadi.
- **Ura objave je naključna** (lastnik: naj bo videti kot človek):
  `casObjave(osnova, razpon, zdaj, rng)` — osnova (pon 10:00, čet 18:00,
  mejnik `objavaMejnika`) + enakomeren odmik iz `TERMINI[slot].razpon`
  (pon −40…+100 min, čet −50…+100, mejnik ±40), cele minute, nikoli
  večkratnik 5, vsaj `VETO` (5 h) po osnutku, v oknu 08:30–21:30 Ljubljana.
  Izračuna se šele po napisu in slikah (veto teče od Discorda); čas je v
  `objava_ob` in v sporočilu na Discordu. `terminiZdaj` osnutek naredi le,
  dokler do najkasnejše objave termina ostane 5 h.
- **Instagram Graph API vrtiljak sprejme največ 10 slik** (v aplikaciji jih je
  20, v API ne). Ponedeljek: do 8 držav naslovnica + države + poziv; pri 9
  naslovnica odpade (9 + poziv), obdobje nosi glava prve države; več kot 9
  (`NAJVEC_DRZAV`) odpadejo tiste z najmanj uporabniki. Četrtek največ 6 dosežkov.
- **Mejnik** (slot `mejnik`, migracija 20261015190100): vsak obhod zanke
  pokliče `objava_mejnik_dejstva()` (servisna: `uporabnikov` =
  `skupaj_uporabnikov()`, `drzav` in `lig` aktivnih lig, `ekip` brez hišnih).
  Ko število preseže večkratnik 1000 (`dosezenMejnik`) **za manj kot 300**
  (`MEJNIK_ROK`; mejniki, preseženi pred uvedbo, se ne objavijo) in vrstice s
  tem `mejnik` (unique) še ni, nastane osnutek: napis (Claude, zahvala
  skupnosti, ista preverba), prosojnici "4,000" z maskoto in "SLFF today"
  (države, lige, ekipe) ter poziv. Osnova objave je 6 ur po osnutku,
  premaknjena naprej v okno 09:00–20:00 (`objavaMejnika`), nato ±40 min
  (`casObjave`); dalje kot vsak osnutek (Discord z "Ustavi", `objaviZapadle`).

- **Dejstva** (migracija 20261015230100, obe servisni) štejejo le tekme, ki
  so se zgodile: **uvožen zapisnik** (`imported_at`), ne kontumacija, datum v
  oknu. Razpisan, prestavljen ali na zapisnik čakajoč krog ne šteje.
  - `objava_drzave(od, do)` (ponedeljek, okno prejšnji teden): po državi
    trije najboljši igralci kroga čez vse njene lige (zadnji krog lige z
    uvoženo tekmo v oknu; ime, klub, kratko ime lige, krog, točke, goli).
    **Država brez igralca s 6 točkami ne pride v objavo.** Vrstni red:
    uporabniki z ekipo v ligah države (brez hišnih), nato število lig s
    krogom, nato koda. Brez države ni osnutka.
  - `objava_dosezki(od, do)` (četrtek, zadnjih 7 dni): seznami `hattrick`
    (3+ goli na tekmi), `vratar_gol`, `najvec_tock` (največ točk kroga v
    Evropi, ≥ 6), `rekord_lige` (več točk kot kdorkoli v prejšnjih, vsaj
    štirih krogih sezone lige), `skok` (le dvig cene), `cista_mreza` (vratar
    s 3+ čistimi mrežami zapored, zadnja v oknu), skupnost **anonimno**:
    `manager_tedna` (le točke in država, brez hišnih), `novih_upraviteljev`
    (računi iz okna brez hišnega), `uporabnikov`. `vsebinaDosezkov` vzame vsak
    igralec enkrat (vrstni red hat-trick, največ točk, rekord, vratar, niz,
    skok), skupnost na konec; **brez dosežka igralca ni osnutka**. Novih lig
    ni (vklop lige nima časa), mini lig tudi ne.
  - `objava_dejstva` (stari ponedeljek in četrtek) ostane v bazi, a je
    `objave.mjs` ne kliče več.
  **Objava le slavi** (lastnik, 15. 10. 2026): padca cene in slabih predstav
  ni, šala gre na nedeljsko ligo nasploh, nikoli na igralca. **Nikoli**
  mladinske lige (`je_mladinski_slug`), neaktivne lige, anonimizirani igralci,
  hišne ekipe, imena uporabnikov ali ekip. `npm run preizkus-objav` (tudi v
  CI) preveri izločitve, preskočene države in anonimnost.
- **Napis** napiše Claude (`claude-sonnet-5-5`, Messages API, `ANTHROPIC_API_KEY`)
  iz izbranih dejstev (ponedeljek: uvodna vrstica in ena vrstica na državo;
  četrtek: ena na dosežek), s povezavo `https://slff.eu/?src=ig`.
  `preveriNapis`: vsako število in vsaka beseda z veliko začetnico sredi stavka
  mora biti v dejstvih ("4,000" je tisoč, svojilni 's odpade, dnevi v tednu
  so dovoljeni); sicer še en poskus, nato suha predloga (`napis_vir`).
- **Prosojnice** (1080 × 1350): stran `/objava?slide=n`
  (`src/pages/Objava.tsx`), ki jo main.tsx izriše brez glave in noge; vsebino
  ji Playwright vpiše v `window.__OBJAVA__`, jezik (`en`) v izbiro jezika. Ni v
  zemljevidu, `noindex` (tudi Caddy `@zasebne`), v `@ni_strani` je izjema.
  Nizi so v `domov.objava.*` vseh jezikov (smoke), izriše se le angleščina. **Strežnik jo bere s slff.eu**
  (`OBJAVE_URL`), zato mora biti sprememba strani objavljena pred delavcem.
- **Osnutek**: vrstica v `objave` (slike JPEG na disku
  `/opt/slff-objave/mediji/<teden>-<slot>-<naključno>/n.jpg`), nato Discord
  (`DISCORD_OBJAVE_WEBHOOK`) s slikami, napisom, povzetkom dejstev in
  enkratno povezavo **"⛔ Ustavi objavo"** (`slff.eu/objava#ustavi=<žeton>`;
  žeton 256 bitov, v bazi le `ustavi_zeton_hash` = sha256). Šele uspel
  Discord vpiše `discord_at`; neuspel → `stanje = 'napaka'` (osnutek, ki ga
  človek ni videl, se nikoli ne objavi).
- **Ustavitev**: stran `/objava` z `#ustavi=` (`UstaviObjavo` v
  `src/pages/Objava.tsx`, slovensko kot Administracija) pokaže gumb; šele klik
  pokliče `ustavi_objavo(zeton)` (anon, migracija 20261015170100) — Discord
  povezave odpira sam, zato ne ustavi že odprtje. Ustavi le `osnutek` pred
  rokom; sicer "povezava ne velja več".
- **Objava (faza 2)**: `objaviZapadle` v zanki vzame osnutke z rokom v
  zadnjih **2 urah** (`OBJAVA_ZAMUDA`; starejši ostanejo neobjavljeni — delavec
  ni tekel ali preizkusni osnutek preteklega tedna), z `discord_at` in
  `stanje = 'osnutek'`. Najprej jih pogojno prevzame (`objavljanje`), nato
  Instagram (vsebniki → vrtiljak → `status_code` FINISHED → `media_publish`)
  in Facebook stran (neobjavljene `/photos`, nato `/feed` z `attached_media`),
  Graph API `v26.0` (`META_GRAPH_VERSION`). Slike Meta prebere z
  `https://slff.eu/objave-mediji/…` (Caddy, `OBJAVE_MEDIJI_URL`). Uspeh →
  `objavljeno`, `ig_povezava`, `fb_povezava`, Discord s povezavama; napaka →
  `napaka` in Discord, **nikoli ponovno samodejno** (Meta je morda objavila
  del) — ponovi človek ročno.
- Preizkus brez baze in brez ključev: `npm run dev`, nato `node scripts/objave.mjs
  --slot pon --suho --dejstva scripts/vzorci/objava-drzave.json --url
  http://localhost:5173 --mapa /tmp/objave-vzorec` (napis je predloga, slike v mapi);
  četrtek: `--slot cet --dejstva scripts/vzorci/objava-dosezki.json`;
  mejnik: `--slot mejnik --dejstva scripts/vzorci/objava-mejnik.json`.
- **Objava**: `scripts/hetzner/objavi-objave.sh` iz main (CI je ne objavi).
  Enkratna nastavitev (lastnik): `/opt/slff-objave/.env` s
  `SUPABASE_SERVICE_ROLE_KEY=`, `ANTHROPIC_API_KEY=`, `DISCORD_OBJAVE_WEBHOOK=`,
  za fazo 2 še `META_PAGE_TOKEN=`, `META_PAGE_ID=`, `META_IG_USER_ID=` (kako jih
  dobiti: načrt, *Faza 2*), `chmod 600`. Blok `/objave-mediji/*` v
  `scripts/hetzner/Caddyfile` se prenese ročno (Caddy CI ne objavi). Dnevnik
  `ssh slff docker logs slff-objave`.
