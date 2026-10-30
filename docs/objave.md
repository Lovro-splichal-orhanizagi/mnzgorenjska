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
- **Vsak dan ena objava** (lastnik, 16. 10. 2026; migracija 20261016090000).
  Torek, sreda, petek, sobota in nedelja imajo po dve vrsti (`TERMINI[slot].vrsti`):
  **teden A = sodi teden ISO**, B = lihi (`vrstaTermina`, `tedenISO`), v dveh
  tednih 12 različnih objav. Torek in sobota sta **reela**.

  | dan | osnutek | objava (osnova, razpon) | teden A | teden B |
  |---|---|---|---|---|
  | pon | 04:00 | 10:00 −40…+100 | vrtiljak držav | (isto) |
  | tor | 05:00 | 12:00 −45…+80 | **reel** ekipa tedna (`ekipa`) | **reel** strelci sezone (`strelci`) |
  | sre | 11:00 | 17:30 −50…+70 | liga tedna (`liga`) | država tedna (`drzava`) |
  | čet | 12:00 | 18:00 −50…+100 | dosežki tedna | (isto) |
  | pet | 09:00 | 16:00 −45…+90 | kapetani, igralci v formi (`kapetani`) | dvigi cen (`cene`) |
  | sob | 04:00 | 10:30 −50…+75 | **reel** napoved vikenda (`predogled`) | **reel** kako se igra (`pravila`) |
  | ned | 12:00 | 19:00 −45…+90 | številka tedna (`stat`) | najboljše obrambe (`obramba`) |

  Dejstva (servisne SQL, vse prek pogleda `objava_lige` = aktivne, ne mladinske,
  samo za servis; le uvožene tekme, ne kontumacije; okna v `OKNA` glede na
  ponedeljek tedna). Vse začnejo pri ligah in tekoči sezoni ali oknu krogov,
  nastope berejo prek indeksov tekme ali igralca; strelci in čiste mreže
  najprej vzamejo kandidate iz `statistika_igralcev` (60 oz. 40) in jih
  natančno preštejejo le iz uvoženih tekem:
  - `objava_ekipa_tedna(od, do)` — pet najboljših po poziciji zadnjega kroga
    vsake lige v prejšnjem tednu; `izberiEkipo` izbere formacijo z največ točkami
    (3-4-3 … 5-4-1). Reel: naslov, igrišče (vrste se pojavijo na udarce,
    števec skupnih točk), zvezda enajsterice, poziv.
  - `objava_strelci(do)` — strelci sezone (sezona vsake lige, `sezona_lige`).
    Reel: odštevanje #5…#2, #1 s števcem golov, poziv. Najmanj trije.
  - `objava_liga(od, do, izkljuci)` — liga z uvoženo tekmo v zadnjih dveh
    tednih z največ upravitelji (brez hišnih) in vsaj tremi klubi s tremi
    tekmami (en prehod čez tekme); vrh treh iz `lestvica_lige` (le za izbrano
    ligo), strelec. **Ista liga ne prej
    kot v 8 tednih** (`LIGA_PREMOR_TEDNOV`: `izkljuci` so `objave.liga`
    srednih objav). Povezava napisa `https://slff.eu/?t=<liga>&src=ig`.
  - `objava_drzava(od, do, izkljuci)` — prva država iz `objava_drzave` (po
    upraviteljih), ki je ni bilo v 8 tednih (sicer katerakoli), z aktivnimi
    ligami in ekipami; prosojnice: številke, igralec kroga, poziv.
  - `objava_forma(do)` — vsota točk zadnjih treh krogov lige (vsaj dva krogi
    igralca), le igralci, ki jih je mogoče kupiti; prosojnica na igralca s
    točkami po krogih in ceno.
  - `objava_cene(od, do)` — največji dvigi cene tedna (le dvigi).
  - `objava_tekme(od, do)` — neodigrane tekme sobote in nedelje, kjer igra
    klub z vrha (oba z vsaj tremi tekmami); najzanimivejša na ligo (vsota mest,
    razlika točk), največ štiri. Mesto po pravilu `lestvica_lige`, izračunano v
    enem prehodu za vse lige s tekmo. Reel: tekma na prizor (domači, VS, gostje
    z mestom in točkami; **brez forme W/D/L**, objava le slavi).
  - pravila — brez baze: `PRAVILA` v `objave.mjs` (smoke preveri, da je enako
    `src/lib/pravila.ts` in `tockovanje.ts`). **Tri teme** (`temaPravil`:
    `TEME_PRAVIL[floor(teden ISO / 2) % 3]`, zaporedna liha tedna drugačna):
    `kader` (15 igralcev, €100M, po pozicijah, največ 3 iz kluba), `tocke` (gol
    po poziciji, čista mreža, asistenca, 60 minut), `kapetan` (×3, namestnik,
    Wildcard in Klop+).
  - `objava_stat(od, do)` — goli, tekme, lige in države tedna; "golijada" le,
    ko sta oba kluba dala vsaj tri (slavi oba).
  - `objava_obramba(do)` — klubi z najmanj prejetimi na tekmo (vsaj pet tekem)
    in vratarji z največ čistimi mrežami (vsaj tri, 60 minut).

  **Brez novice dan izpade** (`vsebinaVrste` vrne null, v dnevnik "ni novice"),
  polnila ni. `objave` hrani še `vrsta`, `glasba`, `liga` (sreda) in `drzava`.
- **Reeli** (`src/pages/ObjavaReel.tsx`, `/objava?reel=1`, 1080 × 1920,
  ~12–14 s): vse gibanje je CSS ali WAAPI (števci na `@property --n`), prizori
  se menjajo na udarce (`v.bpm`, privzeto 124). `posnemiReel` animacije ustavi
  in vsako sličico postavi na točen čas (`getAnimations().currentTime`), jo
  posname in pošlje v **ffmpeg** (H.264 + AAC 48 kHz, 30 fps, `+faststart`,
  ~2 MB). Zato je video gladek tudi na počasnem strežniku (namesto Playwrightovega
  `recordVideo`, ki na enem jedru izpušča sličice). Slika delavca je
  `scripts/hetzner/objave/Dockerfile` (Playwright + ffmpeg iz apt; Playwrightov
  ffmpeg zna le VP8). Mediji osnutka: `reel.mp4`, `naslovnica.jpg`.
  Za eno jedro in 1,5 GB (`mem_limit: 1536m`): libx264 `veryfast`, ena nit,
  `rc-lookahead=10`; dnevnik izpiše vrh pomnilnika (node, ffmpeg). Trajanje
  mora biti 3–90 s (`REEL_TRAJANJE`). Zgodnji izhod ffmpeg, napaka posnetka ali
  rok **6 minut** (`REEL_ROK`) vrže napako: ffmpeg se ubije, brskalnik zapre,
  vrstice v `objave` ni.
- **Neuspel osnutek**: slike ali reel nastanejo pred napisom (Claude se ne
  kliče, če posnetek pade). Zanka termin, ki pade, poskusi največ trikrat na
  teden (`NAJVEC_POSKUSOV`, števec v pomnilniku delavca), nato ga ta teden
  izpusti.
- **Glasba**: skladbe v `scripts/objave-glasba/` (README: vir in licenca vsake;
  le licence, ki dovolijo rabo v videih na omrežjih, npr. CC0). Izbere se
  najmanj nedavno rabljena (`najmanjRabljena` po `objave.glasba`), začetek
  naključno 0–12 s (`zacetekGlasbe`), pojemanje na začetku in koncu. Prazna
  mapa: `sintetiziraj` naredi svojo plesno zanko (boben, hi-hat, bas, akordi,
  arpeggio; tonaliteta in vzorci po semenu, `glasba = 'sinteza:<seme>'`).
- **Objava reela**: Instagram vsebnik `media_type=REELS` z `video_url` (in
  `cover_url`), čakanje na FINISHED (do 10 minut), `media_publish`; Facebook
  `/{stran}/video_reels` (start → `rupload.facebook.com` s `file_url` → finish
  `PUBLISHED`), nato sprašuje `status`, dokler ni objavljen (napaka obdelave ali
  10 minut → `napaka`). Napaka kot pri vrtiljaku: `napaka`, brez samodejne ponovitve.
  Discord dobi priponke do skupaj 9,5 MB (kar ne gre zraven, je povezava) in gumb "Ustavi".
- **Ročni reel** (SLF-204, `scripts/objava-reel.mjs`): pripravljen video
  (npr. Pivkov) mimo dnevnih osnutkov. Na VM `ssh slff-ops post-custom reel
  [ig|fb|both] [--dry] < reel.tar` = `docker exec -i slff-objave node
  scripts/objava-reel.mjs <ig|fb|both> [--dry]` (vrstico v ovoju `slff-ops`
  doda lastnik VM; ovoj ni v gitu). Tar ima natanko en `*.mp4` in
  `caption.txt` (UTF-8), nič drugega (`._*` in `.DS_Store` se preskočijo).
  Preverbe pred objavo: video s ffprobe (H.264 yuv420p, AAC ali brez zvoka, 9:16,
  vsaj 540 × 960, 23–60 fps, 3–90 s, ≤ 100 MB), napis (≤ 2200 znakov, ≤ 30
  ključnikov, ≤ 20 omemb), računi (stran `META_PAGE_ID` je povezana z
  `META_IG_USER_ID`, ime = `OBJAVE_IG_RACUN`, če je nastavljen, kvota
  Instagrama), dnevna meja `ROCNI_REEL_NA_DAN` (privzeto 2 na ljubljanski
  dan, 0 ustavi; šteje vsak poskus pri Meti, tudi neuspel) in **ni osnutka
  delavca 2 h nazaj ali 60 min naprej** (`osnutek`/`objavljanje` v `objave`;
  nazaj 2 h, ker delavec zamujen osnutek objavi do `OBJAVA_ZAMUDA` pozneje;
  brez baze zavrne).
  `--dry` naredi vse to (Meta le bere) in nič ne objavi ne zapiše. Objava:
  video v `/mediji/rocni/<datum>-<naključno>/reel.mp4`, preverba javnega
  naslova (HEAD, velikost), nato Instagram in Facebook kot pri delavcu
  (IG pade → FB se ne kliče). Instagram se preveri na seznamu objav računa
  (`REELS`, ista povezava). Javen je le video; zapisi so v zasebni mapi
  `/opt/slff-objave/rocni/objave.jsonl` (`ROCNI_MAPA`, v kontejnerju `/rocni`;
  stanje, povezavi, sha256 videa in napisa, računa; brez žetonov), seznam
  `docker exec slff-objave node scripts/objava-reel.mjs --zapisi`. Discord dobi
  povezavi ali napako;
  **ni samodejne ponovitve**. Zaklep `.zaklep` prepreči hkratni objavi.
  Preizkus: `npm run test:objava-reel` (korak v CI doda človek: žeton agenta ne sme spreminjati workflowov).
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
  Ostali dnevi: `--slot tor --dejstva scripts/vzorci/objava-ekipa.json` (vrsta
  pride iz `"vrsta"` v vzorcu ali `--vrsta`); vzorci `objava-{ekipa,strelci,liga,
  drzava,kapetani,cene,predogled,pravila,stat,obramba}.json`. Reel potrebuje
  lokalni `ffmpeg`.
- **Objava**: `scripts/hetzner/objavi-objave.sh` iz main (CI je ne objavi).
  Enkratna nastavitev (lastnik): `/opt/slff-objave/.env` s
  `SUPABASE_SERVICE_ROLE_KEY=`, `ANTHROPIC_API_KEY=`, `DISCORD_OBJAVE_WEBHOOK=`,
  za fazo 2 še `META_PAGE_TOKEN=`, `META_PAGE_ID=`, `META_IG_USER_ID=` (kako jih
  dobiti: načrt, *Faza 2*), `chmod 600`. Blok `/objave-mediji/*` v
  `scripts/hetzner/Caddyfile` se prenese ročno (Caddy CI ne objavi). Dnevnik
  `ssh slff docker logs slff-objave`.
