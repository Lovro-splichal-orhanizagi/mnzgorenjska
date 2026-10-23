# Bosna in Hercegovina — vir `nsfbih`

Država `BA` ("Bosna i Hercegovina", migracija 20261016092100). Šifra lige se
začne z `ba-`. Lige ostanejo neaktivne, dokler jih lastnik ne vklopi. BiH
dobi hrvaški vmesnik (`JEZIK_DRZAVE.BA = 'hr'`), vstop `slff.eu/ba`, kartico ob deljenju `ba.html` (Caddy jo vrne za `/ba` in `?t=ba-…`, tudi rezerva `:3201`, `vercel.json`), hrvaško vejo pošte
(rok po sarajevsko, kot Ljubljana), imena lastnikov hišnih ekip in
`klub_stik.drzava` (migracija 20261016213700), `IMENA_BA` v *Hisne ekipe* (imena brez
etničnih in političnih tem) in `BA` v matriki nočnega uvoza (en koš: `nsfbih`,
`nfsbih`). Ugib: IP, brskalnik `bs-BA`, `hr-BA`, `sr-BA` ali pas
`Europe/Sarajevo`; gola `bs` (brez regije) ostane Hrvaška, kot doslej. Viri sta dva: `nsfbih` (NS FBiH, spodaj) in
`nfsbih` (NFSBiH, državna WWIN liga BiH, naslednji razdelek); oba sta isti
COMET in imata isti ključ kluba (`kljucKlubaBa`), zato je klub skupen.

Vir `nsfbih` (`scripts/viri/nsfbih.mjs`) bere **www.nsfbih.ba** (Nogometni
savez Federacije BiH): WWIN Prva liga FBiH (2. raven BiH), Druga liga FBiH
v štirih skupinah (3. raven) in Omladinska liga BiH — juniori (U19) v treh
skupinah. Podatki so iz COMET (šifre tekem 54xxxxxx),
stran je HTML iz strežnika, brez prijave in izziva. Kantonalnih lig (4. raven
in nižje) ni nikjer javno s postavami. **fsrs.org (Republika Srpska) ne
beremo** (povezava nanj je na naslovnici nsfbih.ba — ne sledi ji).

- **Šifra lige je `<slug>/<sezona>`** (`druga-liga-fbih-jug/2026-27`). Slug
  strani `/takmicenja/<slug>` je **isti vsako sezono**; stran kaže le tekočo
  sezono, izbirnika sezon ni. Sezona v šifri ustavi uvoz, ko stran preide na
  novo sezono (`kaže sezono …`) — ob novi sezoni popravi le sezono v
  `source_league_code`. **Arhiva ni**: cene so le iz tekoče sezone (uvoz brez
  `arhiv`, s `cene`).
- **Razpored**: zavihek "Raspored i rezultati" (`id="t3"`), krogi "N. kolo",
  tekma z datumom in uro ("02.09.2026. 16:30h", sarajevski = ljubljanski čas),
  imenoma klubov (`<b>`, kraj v `<small>`), izidom ("7:0", "-" neodigrana) in
  povezavo `/takmicenja/<slug>/<id>`. Druga liga objavi le jesenski del
  (13–16 krogov), Prva liga vseh 30.
- **Zelena miza**: izid z zvezdico ("3:0 *", na zapisniku "0:3*" in
  "*(p.f.)") je **kontumacija** z registriranim izidom, tudi ko je bila tekma
  odigrana (Bratstvo : Posušje 14. 8. 2026, na igrišču 3:1) — zapisnik je
  null, igralci te tekme nastopov nimajo.
- **Zapisnik** `/takmicenja/<slug>/<id>`: "Startna postava" in "Rezervni
  igrači", vsak z dvema tabelama (domači: dogodki | ime | dres; gostje
  zrcalno). Dogodki so ikone z minuto, **ne po vrsti**: `event-icon-goal`
  (pred minuto "(P)" = 11 m, "(AG)" = avtogol pri strelcu v njegovi ekipi),
  `event-icon-card bg-warning` / `bg-danger` (rumeni / rdeči; drugi rumeni je
  rumeni + rdeči), `icon-right text-danger` / `text-success` (izstop / vstop,
  minute točne, par po minuti). Zgrešenih 11 m stran ne kaže.
- **Napake vira**: rezerva včasih "vstopi" dvakrat (Kobilica 56' in 79',
  ob 79' vstopi drug brez para) — poznejši vstop je izstop (opozorilo
  `dvakrat vstopi`); karton brez minute ostane karton z opozorilom.
- **Vratar in kapetan nista označena.** COMET vratarja našteje prvega
  (ostali po dresu; dres 1 ali 12 v 125 od 145 postav), zato je prvi začetnik
  `vratar` kot namig (kot ffm, fssid). *Uskladi pozicije* z `vir = nsfbih`.
- **Identiteta**: ime + klub (šifer igralcev ni), ime "Priimek Ime" kot v
  COMET. Šifra zapisnika v bazi je `ba<id>`. Ključ kluba ohrani obliko in
  šumnike: "FK VITEZ" / "NK VITEZ", "FK RUDAR" / "NK RUDAR", "NK SLOGA" /
  "HNK SLOGA", "NK BRATSTVO" / "GNK BRATSTVO" so različni klubi, zato je
  kratko ime polno ime. Istih imen v osmih ligah nsfbih ni (pregled 15. 10.
  2026: kraj v `<small>` je pri vsakem imenu en sam); trki z WWIN ligo BiH so
  pri `nfsbih` (`IME_KLUBA`). Mladinske ekipe nosijo ime kluba in so isti
  klub kot člani (FK BORAC iz Jelaha je v Drugi ligi Centar in v juniorjih
  Centar 2).
- **Predpomnilnik**: v predpomnilnik gre le prava stran (`zaPredpomnilnik`:
  stran lige ali tekme z glavo); stran brez glave tekme (napaka, vzdrževanje)
  se prebere še enkrat sveže, zapisnik brez postav 45 dni.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt je
"User-agent: *" in `Sitemap: /sitemap`, brez Disallow in Crawl-delay; pogojev
uporabe proti branju nismo našli. Dovoljenja NS FBiH nimamo. Beremo odkrito
(`User-Agent: SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih
zapisnikov ne beremo znova). **Ob 401, 403, 429, izzivu ali CAPTCHI se uvoz
ustavi — ne obhajaj** (`NsfbihZavrnitev`, izhod 4). Sodnikov, delegata in
gledalcev ne beremo; vzorci `scripts/vzorci/ba-nsfbih-*` so brez njih.

Preizkus v živo (15. 10. 2026, ~80 strani po 3 s, brez pisanja v bazo; 14–15
zapisnikov na ligo, razpršenih čez sezono): vsi 11 + 11, goli = izid povsod,
990 minut na ekipo razen ob rdečem kartonu.

| liga | klubov | tekoča 2026/27 | krogov / tekem / odigranih | preizkus: zapisnikov, goli, postav po 11, menjav |
|---|---|---|---|---|
| ba-prva-liga-fbih | 16 | `wwin-prva-liga-fbih/2026-27` | 30 / 240 / 72 (1 zelena miza) | 14, 30, 28/28, 117 |
| ba-druga-liga-fbih-jug | 13 | `druga-liga-fbih-jug/2026-27` | 16 / 96 / 48 (1 kontumacija) | 15, 60, 30/30, 119 |
| ba-druga-liga-fbih-sjever | 16 | `druga-liga-fbih-sjever/2026-27` | 15 / 120 / 72 | 14, 54, 28/28, 118 |
| ba-druga-liga-fbih-centar | 16 | `druga-liga-fbih-centar/2026-27` | 15 / 120 / 71 | 14, 57, 28/28, 112 |
| ba-druga-liga-fbih-zapad | 14 | `druga-liga-fbih-zapad/2026-27` | 13 / 91 / 56 | 14, 43, 28/28, 93 |

**Omladinska liga BiH — juniori (U19)**, tri skupine na nsfbih.ba v isti
obliki kot članske (`omladinska-liga-bih-juniori-<skupina>/2026-27`). Kot
druge U19: `prvi_fantasy_krog = 2`, `rok_pomak_ur = 2` (tekme ob 12:30). Kadeti
(U17) niso vpisani. Preizkus v živo (15. 10. 2026) je prebral **vse**
zapisnike:

| liga | klubov | tekoča 2026/27 | krogov / tekem / odigranih | zapisnikov | goli (= izid) | postav po 11 | 990 min | menjav | opozorila |
|---|---|---|---|---|---|---|---|---|---|
| ba-u19-juniori-centar-1 | 14 | `omladinska-liga-bih-juniori-centar-1/2026-27` | 15 / 91 / 55 | 55 | 260 (55/55) | 110/110 | 104/110 (rdeči) | 487 | 4× dvojni vstop, 2× karton brez minute |
| ba-u19-juniori-centar-2 | 17 | `omladinska-liga-bih-juniori-centar-2/2026-27` | 17 / 136 / 87 | 87 | 355 (87/87) | 173/174 (Kiseljak z 8) | 163/174 (10 rdeči, 1 z 8) | 647 | 4× dvojni vstop, 2× karton brez minute |
| ba-u19-juniori-jug | 13 | `omladinska-liga-bih-juniori-jug/2026-27` | 13 / 78 / 48 (1 zelena miza) | 47 | 280 (47/47) | 93/94 (Čapljina s 7) | 90/94 (rdeči, 1 s 7) | 260 | 3× dvojni vstop, 2 zapisnika brez minut |

Vratar (prvi začetnik) je namig pri vseh postavah. **Zapisnik brez minut**
(Jug: Brotnjo : Igman 54198839, Grude : Leotar 54198850 — vsi dogodki brez
minute): goli in kartoni ostanejo, začetniki dobijo 90 minut, rezerve brez
minute vstopa pa nastopa nimajo (opozorilo `brez minute`). Identiteta je ime + klub
(nastopov brez šifre je 100 %, kot pri članih nsfbih).

Arhiv: — (vir ga nima). Vse **neaktivne**, zveza `nsfbih`. Uvoz (ena za
drugo, brez arhiva): `gh workflow run uvoz-lige.yml -f
liga=ba-druga-liga-fbih-jug -f cene=true`; ~70 zapisnikov po 3 s je ~4
minute na ligo.

## Bosna in Hercegovina — vir `nfsbih` (WWIN liga BiH)

Vir `nfsbih` (`scripts/viri/nfsbih.mjs`) bere **www.nfsbih.ba**
(Nogometni/Fudbalski savez BiH), kjer NFSBiH objavi državno **WWIN ligo BiH**
(Premijer liga, 1. raven, 10 klubov, 36 krogov). Isti COMET kot nsfbih, a
druga stran (Joomla z lastno komponento) in druga oblika, zato svoj vir.

- **Šifra lige je `<slug>/<id tekmovanja COMET>`** (`wwin-liga-bih/54152223`),
  slug je pot pod `/takmicenja/nogomet-muskarci/`. Vsaka sezona ima svoj id:
  2026/27 = `54152223`, 2025/26 = `46565761` (najden v arhivu Wayback strani
  lestvice; stran sama seznama sezon nima). Ob novi sezoni poišči id v strani
  lige (`view=fixtures&id[0]=…`) in popravi `source_league_code`.
- **Razpored** `?view=fixtures&id=<id>`: naslov sezone ("WWIN liga BiH 26/27",
  uvoz ga primerja z datumi), krogi "N. KOLO", tekma z datumom in uro
  ("07.08.2026 20:00", sarajevski = ljubljanski čas), igriščem, klubi
  (`/stats/team/<tekmovanje>/<šifra kluba>-…`), izidom ("2 : 1", neodigrana
  "- : -") in `?view=match&id=<id>`. Objavljenih je toliko krogov, kolikor jih
  je zveza razpisala (15. 10.: 10 od 36).
- **Zapisnik** `?view=match&id=<id>`: glava "DOMAČI - GOSTJE (polčas) izid",
  "Status: Odigrana" (neodigrana je "Zakazana" in ima v glavi **0 : 0** — ni
  izid), datum; tabeli ekip, začetniki pred vrstico "Izmjene", klop za njo.
  Igralec ima v povezavi šifro (`view=player&id=<šifra>:…` ali
  `/stats/player/<šifra>-…`), ki pa **ni stalna**: je vrstica strani in stran
  jo ob osvežitvi preštevilči (15. 10. 2026 v nekaj urah vsi igralci +293,
  Marčetić Stefan 22294400 → 22294693). Zato **ni `reg_st`**: identiteta je
  ime + klub kot pri nsfbih, šifra le poveže dogodke z igralcem na isti
  strani. Šifre klubov (`/stats/team/…/<šifra>-…`) so stalne. "(GK)" je
  vratar (tudi rezervni), "(C)" kapetan. Dogodki `<div class="…">min'</div>`: `gol`,
  `penal` (11 m, v 45 tekmah ga še ni bilo), `autogol` (pri strelcu v njegovi
  ekipi), `zuta`, `crvena` (dva rumena = 1 rumeni + 1 rdeči), `izmjena` (pri
  začetniku izstop, pri rezervi vstop; minute točne, par po minuti).
- **Napaka vira**: dve rezervi vstopita ob isti minuti, izstop pa je vpisan le
  enemu začetniku — opozorilo `vstopi v N. minuti, izstopa ob tej minuti ni`,
  ekipa ima čez 990 minut (2× v 45 tekmah).
- **Zapisnik brez postav** je null in se 45 dni bere znova (Željezničar :
  Čelik ima povezave `/stats/player/…` namesto `view=player` — brez obeh oblik
  bi bil videti prazen); v predpomnilnik gre le stran z glavo tekme ali razpored
  (`zaPredpomnilnik`), napaka Joomle (403 "Pristup zabranjen") nikoli.
- **Isto ime, drug klub**: nsfbih ima FK BORAC (Jelah), FK VELEŽ (Nevesinje,
  juniori Jug) in FK RADNIK (Donji Vakuf). Državni klubi dobijo kraj po šifri
  kluba COMET (`IME_KLUBA`: 424 "FK BORAC (Banja Luka)", 607 "FK VELEŽ
  (Mostar)", 530 "FK RADNIK (Bijeljina)"). Ostali klubi WWIN lige imen v
  nsfbih nimajo (NK ČELIK ≠ NK ČELIĆ, FK RUDAR PRIJEDOR ≠ FK RUDAR). HŠK
  POSUŠJE (lani WWIN, letos Prva liga FBiH) je v obeh virih isti klub.
- **Arhiv 2025/26 ni uporaben**: razpored ima 36 krogov in 180 izidov, a
  zapisniki so **brez postav** (preverjenih 12, razpršenih čez sezono). Cene
  so le iz tekoče sezone.
- *Uskladi pozicije* z `vir = nfsbih` (vratar "(GK)" po večini tekem).

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt prepove le
sistemske mape Joomle (`/administrator/`, `/cache/`, `/modules/` …);
`/takmicenja/` je dovoljen. Pogojev uporabe proti branju nismo našli.
Dovoljenja NFSBiH nimamo. `/stats/` (koren) vrne 403 — tja ne hodimo
(povezave `/stats/player/…` beremo le kot šifro v zapisniku). Beremo odkrito
(`User-Agent: SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih
zapisnikov ne beremo znova). **Ob 401, 403, 429, izzivu ali CAPTCHI se uvoz
ustavi — ne obhajaj** (`NfsbihZavrnitev`, izhod 4). Sodnikov, delegata,
posmatrača in gledalcev ne beremo; vzorci `scripts/vzorci/ba-nfsbih-*` so brez
njih.

Preizkus v živo (15. 10. 2026, vsi zapisniki, brez pisanja v bazo):

| liga | klubov | tekoča 2026/27 | krogov / tekem / odigranih | zapisnikov | goli (= izid) | postav po 11 | vratar "(GK)" | 990 min | menjav |
|---|---|---|---|---|---|---|---|---|---|
| ba-wwin-liga-bih | 10 | `wwin-liga-bih/54152223` | 10 / 50 / 45 | 45 | 118 (45/45) | 90/90 | 90/90 | 83/90 (5 rdeči, 2 napaki vira) | 403 |

1393 nastopov (403 s klopi), identiteta ime + klub; 162 rumenih, 6 rdečih, 3 avtogoli.
Neaktivna, zveza `nfsbih`. Uvoz (brez arhiva): `gh workflow run
uvoz-lige.yml -f liga=ba-wwin-liga-bih -f cene=true`; 45 zapisnikov po 3 s
je ~3 minute.

Registrirani obstoječi kandidat `ba-wwin-liga-bih` (id 998) ostane current-
season only: arhiv 2025/26 nima postav in ne more prispevati cen. Vir vratarja
je izrecni `(GK)` v trenutnem zapisniku; to ni dovoljenje za vklop ali dokaz
pripravljenosti. Ohranita se 3-sekundni premor in ustavitev ob zavrnitvi.

Rollout audit on 23 October 2026 imported 49 current reports and prepared 248 active players across ten clubs. Two reports still have an incoming substitute without an outgoing player: `ba54152295` (Široki Brijeg–Sarajevo, 2 September, 1–2) and `ba54152303` (Zrinjski–Široki Brijeg, 6 September, 2–1). Fresh source captures reproduce the missing events. The owner separately approved these exact two historical exclusions on 23 October. Use the shared reviewed-history release: preserve both official results, mark their individual statistics unavailable, reprice from the remaining 47 reports and require a fresh legal squad, verified goalkeepers and future deadline before activation. This approval does not extend to other reports.

As an implementation choice for the 23 October 2026 prelaunch, this rollout sets a two-hour lock for `ba-wwin-liga-bih`. The retained NFSBiH fixture capture (`SHA-256 46bfd442846cb92162e9c24e105f72c0e2f25b8c37775bcb0d71200fe810ba84`, 11:58:56 UTC) showed the first kickoff, Zrinjski–Radnik, at 20:00 Ljubljana. The guarded one-time migration changes this inactive competition from its six-hour default to `rok_pomak_ur = 2` and moves round 11's deadline from 12:00 UTC to 16:00 UTC. It applies only to the exact five retained native fixtures while the new deadline is future and no user activity or round results exist; it preserves a private immutable before/after configuration audit. The configuration adjustment runs once; the two-hour per-league offset also applies to subsequent schedule refreshes.
