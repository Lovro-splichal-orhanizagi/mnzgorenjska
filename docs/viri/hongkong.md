# Hongkong — vir `hkfa` (HKFA)

Lige so vpisane **neaktivne** (migracija `20261028120500_hongkong_hkfa`); ali
SLFF gre v Hongkong (angleški vmesnik brez vstopne strani `/hk`, kartice,
pošte, ugiba države), odloči lastnik pred vklopom. Država `HK` ("Hong Kong"),
zveza `hkfa`, šifra lige se začne s `hk-`. `HK` še **ni** v `JEZIK_DRZAVE`,
`DRZAVE` (`src/lib/drzavaUgib.ts`), matriki nočnega uvoza
(`docs/nocni-uvoz.md`), *Hisne ekipe* in *Uskladi pozicije* — vse to pred
vklopom.

| slug | liga | raven | klubov 2026/27 | šifra 2026/27 | arhiv 2025/26 (osnovni del) |
|---|---|---|---|---|---|
| `hk-premier-league` | Hong Kong Premier League (BOC Life) | 1 | 11 | `2041/2026-2027` | `1945/2025-2026` |
| `hk-1-division` | 1st Division | 2 | 14 | `2047/2026-2027` | `1949/2025-2026` |
| `hk-2-division` | 2nd Division | 3 | 16 | `2048/2026-2027` | `1950/2025-2026` |
| `hk-3-division` | 3rd Division | 4 | 16 | `2049/2026-2027` | `1951/2025-2026` |

Premier League je polprofesionalni vrh; vpisana je, ker so podatki enako
popolni kot v divizijah in smo vrh majhne države vpisali tudi drugod (Betri
deildin na Ferskih otokih). Raven iz `ravenLige` (`hk-premier-league` 1,
`hk-<n>-division` n + 1; prepis v `scout/stroj/stroj/ravni.py`): novinec iz
višje lige ni pri 4.5, ker je šifra igralca ista v vseh ligah HKFA.

## Pravice in vljudnost

- **robots.txt** (`https://www.hkfa.com/robots.txt`, 28. 10. 2026):
  `User-agent: *` / `Disallow:` (prazen) / `Allow: /` — vse dovoljeno.
- **Pogojev uporabe ni**: `/en/terms` vrne stran 404, v nogi (sitemap) ni
  povezave na pogoje ali izjavo o omejitvi odgovornosti; le "Copyright (c)
  The Football Association of Hong Kong, China Limited. All rights reserved."
  Dovoljenja HKFA nimamo; vir je v nogi (`vir_ime` HKFA, `vir_url` stran lige).
- Beremo odkrito: `User-Agent: SLFF fantasy (https://slff.eu)`, **3 s** med
  zahtevki, le navaden **GET** strežniško izrisanih strani. Popolnih
  zapisnikov ne beremo znova. **Ob 401, 403, 429 ali izzivu se uvoz ustavi
  (`HkfaZavrnitev`, izhod 4) — ne obhajaj.**
- Spletišče seznam in zapisnik v brskalniku osvežuje z **GraphQL POST** in
  žetonom JWT, ki ga strežnik vpiše v stran (`state.token`). **Tega ne
  uporabljamo** — ne POST, ne žetona; vse, kar potrebujemo, je že v stanju
  strani. Vzorci v `scripts/vzorci/hk-hkfa-*` imajo žeton izbrisan (smoke
  preveri), ker je repo javen.

## Kako vir bere strani

Spletišče je **Nuxt 2**: strežnik stran izriše in stanje zapiše v
`window.__NUXT__=(function(a,b,…){ a[0]={…}; b.x=…; return {…} }(null,0,…))`.
To je izraz JavaScripta s tujega strežnika, zato ga **ne izvajamo** (ne
`eval`, ne `new Function`, ne `vm`). `scripts/viri/nuxt.mjs` je ozek
razčlenjevalnik: parametri, prirejanja `x[0]=` / `x.y=`, `return`, argumenti,
literali, objekti, tabele, `Array(n)`, `void 0`, sklic na parameter. Klic,
operator ali neznano ime vrže `NuxtNapaka` (smoke to preveri), `__proto__` se
zavrže.

- **Šifra lige** `<leagueyear_id>/<leto>`: leagueyear_id je id tekmovanja ENE
  sezone. Najdeš ga v izbirniku "Competition" na
  `/en/competitions/fixtures?year=<leto>` (`leagueRange` v `__NUXT__`).
- **Razpored**: `/en/competitions/fixtures?competition=<ly>&page=<n>&year=<leto>`
  (50 tekem na stran, `listMatchsSize` = vseh). Vrstica: `match_id`, datum,
  ura (lokalno), `match_round`, `match_status` (0 razpisana, 1 odigrana,
  3 prestavljena, 4 prekinjena; `matchStatus` je besedilo, v arhivu tudi
  kitajsko "完場", "改期", "腰斬" — zato beremo številko), izid, klub
  (`Club.club_id`, `TeamName`). Seznam drugega tekmovanja ustavi uvoz.
- **Prestavljene tekme**: vrstica s statusom 3 ostane v seznamu, nadomestna
  pride kot nova tekma z novim `match_id` in krogom `"1R"` (arhiv `"1*"`).
  Status 3 in 4 izpadeta; nadomestna je v tednu svojega datuma.
- **Krog je teden** (pon–ned po hongkonškem datumu), štet od **stalnega
  začetka** — tedna 1. avgusta prvega leta sezone (`krogIzDatuma`; 2026/27
  od pon 27. 7.). Uradni krog HKFA se s tedni ne ujema: HKPL igra 17. krog
  13. 9., prestavljene tekme 1. kroga 1st Division pridejo 6. 12. Divizije
  začnejo v 6. tednu (6. 9. 2026), HKPL v 4. Isti par dvakrat v istem tednu →
  poznejša v naslednji krog (kot `modular11`). `razporedCel`: uvoz razporeda
  neuvoženo vrstico, ki je razpored v njenem krogu nima, odstrani.
- **Zapisnik**: `/en/competitions/result/<match_id>/detail`, `data[0].MatchData`:
  `HomePlayers` / `GuestPlayers` (začetniki), `HomeSubPlayers` /
  `GuestSubPlayers` (klop). Igralec: stalna šifra `player_id` (→ `reg_st`,
  ista čez lige in sezone), ime, vpisana pozicija (`G`/`GK` vratar, `DF`,
  `LB`, `MF`, `FW` …). **Dresov ni** (`player_jersey` prazen), kapetana ne
  hranimo.
- **Dogodki** (`MatchEvents`, pomen iz JS strani tekme): `G`, `PEN` (gol
  ekipe `side`), `OG` (avtogol igralca ekipe `side` — šteje **nasprotniku**),
  `M.PEN` (zgrešena 11-m), `YC`, `12Y` (drugi rumeni → rdeči), `RC`, `EXC`
  (menjava: `EXCPlayer.from` gre noter, `to` ven; smer vir preveri po tem,
  kdo je na igrišču). Minuta `min` + `minExtra`: podaljšek odrežemo na 90,
  **`"HT"` je menjava ob polčasu (45.)**, **`"AM"` karton po tekmi (90.)**.
  Brez `HT` je bila petina menjav (51 od ~240 v vzorcu) brez minute in vstopni
  igralec brez nastopa (njegov gol bi izginil).
- **Ime igralca**: HKFA piše "Chan, Yiu Yin", "Cheung,Hoi Leong Harry",
  "ANNAN Christian Kwesi", "Ng Man Hei" — priimek je povsod spredaj. Vejica
  odpade, besede iz samih velikih črk dobijo veliko začetnico.
- **Klubi po `club_id`**: isti klub ima isti id čez sezone, ime pa se menja
  (WSE → Harmony, Kwong Wah → P.B Alliance FC, Wui Hong Sport Centre → Kong
  Kit FC, Supreme Football Club → Sky Leader FC, Sha Tin → Supreme Shatin),
  v angleškem seznamu pa je ime pogosto kitajsko ("南華", vse prihodnje tekme
  HKPL). Ime vzame `IMENA_KLUBOV` (zadnje angleško ime); neznan id dobi ime s
  strani in opozorilo — **ob novem klubu dopiši vrstico**. Kratko ime odreže
  "FC", razen ko bi nastalo ime drugega kluba: "Tuen Mun F.C." (3rd, id 40)
  ni "Tuen Mun" (2nd, id 52).
- **Čas**: HKFA piše lokalni čas (`Asia/Hong_Kong`, UTC+8, brez poletnega
  časa); `casLjubljana` pretvori v ljubljanskega (15:30 → 09:30 poleti,
  08:30 pozimi; 20:00 → 14:00). `"--:--"` = ura še ni določena (ura null).
  `rok_pomak_ur = 6`.
- **Nepopoln zapisnik** (prvo opozorilo `zapisnik nepopoln`, kot `frf`): ekipa
  brez natanko 11 začetnikov, goli iz dogodkov ≠ izid, gol brez strelca.
  Tekoča sezona: vir ga bere svežega do 45 dni.
- **Kontumacija**: odigrana tekma 3:0 / 0:3, starejša od tedna, brez postav.
  V vzorcih je ni bilo; pravilo je enako kot pri `fsf`.

## Preverba (28. 10. 2026)

Vzorec, ne celota: 42 odigranih tekem (5–8 na ligo v 2026/27, 4 na ligo v
arhivu 2025/26, enakomerno čez sezono), skupaj ~85 zahtevkov po 1,5–3 s.
**Vseh 42 je popolnih**: 11 + 11 začetnikov, goli = izid (tudi avtogoli in
11-m), vsaka menjava z minuto, 990 minut na ekipo razen rdečih kartonov.
Razpored arhiva je cel: odigranih 182/182 (1st), 120/120 (2nd), 120/120
(3rd), 90/90 (HKPL osnovni del) — prestavljene so bile vse odigrane.

| liga | 2026/27 tekem (objavljenih) | odigranih 28. 10. | vzorec popolnih |
|---|---|---|---|
| HKPL | 110 (vsa sezona) | 31 | 6/6 + 4/4 arhiv |
| 1st Division | 91 (do 20. 12.) | 53 | 8/8 + 4/4 arhiv |
| 2nd Division | 120 (prvi del) | 56 | 6/6 + 4/4 arhiv |
| 3rd Division | 120 (prvi del) | 62 | 6/6 + 4/4 arhiv |

Vratar je vpisan pri HKPL vedno, pri 1st Division pogosto le pri eni ekipi,
pri 2nd in 3rd Division večinoma pri nobeni (pozicija pride iz `ugani-pozicije` in
glasovanja). **Celotnega arhiva nismo prešteli** — pred vklopom preštej
tekme · gole · postave po 11 (dodaj-ligo, 0c) z uvozom v lokalno bazo.

## Pasti

- **Delitev sezone.** Lige 2025/26 so se po osnovnem delu razdelile v
  *Championship* in *Challenging Group* (HKPL `2030`/`2032`, 2nd `2014`/`2015`,
  3rd `2016`/`2017`) — vsaka skupina je SVOJ leagueyear_id. Za arhiv
  uvažamo le osnovni del (CLAUDE.md, delitev sezone). 2nd in 3rd Division
  2026/27 imata zdaj objavljenih 120 tekem (enkrat vsak z vsakim, 15 krogov);
  če se spet razdelita, bo nadaljevanje sezone pod novima id-jema in šifre
  lige ena sama ne pokrije — **lastnik odloči pred vklopom** (preklop šifre
  sredi sezone ali vir z več id-ji).
- 1st Division 2026/27 ima objavljen razpored le do 20. 12.; drugi del pride
  pozneje (razpored je vedno svež).
- HKPL: prihodnje tekme imajo v angleškem seznamu kitajska imena in pogosto
  `"--:--"`; oboje vir prenese (ime po club_id, ura null).

## Kasneje (ni vpisano)

- **Ženske**: Jockey Club Women's Football League 1st–3rd Division (in FA Cup)
  — isti vir, iste strani.
- **Mladinske**: HKPL U-22 League, Hong Kong Premier Youth League U14/U16/U18,
  Jockey Club Youth Football League, Women's Youth.
- **Pokali**: Senior Shield, FA Cup, League Cup, Sapling/Community Cup.
- Futsal (Jockey Club Futsal League) ni nogomet na velikem igrišču.

## Uvoz (šele po odločitvi lastnika)

Vrstni red kot povsod: arhiv → razpored → tekoča sezona → pozicije → cene,
lige eno za drugo:

```bash
gh workflow run uvoz-lige.yml -f liga=hk-1-division -f arhiv=1949/2025-2026 -f cene=true
gh workflow run uvoz-lige.yml -f liga=hk-premier-league -f arhiv=1945/2025-2026 -f cene=true
```

Arhiv je ena sezona; 2024/25 ima svoje id-je (izbirnik na
`/en/competitions/fixtures?year=2024-2025`), če cenik ostane privzet.

Ob novi sezoni: id-ji iz izbirnika za novo leto, `update competitions set
source_league_code = '<ly>/2027-2028' where slug = …`; nove klube dopiši v
`IMENA_KLUBOV`.
