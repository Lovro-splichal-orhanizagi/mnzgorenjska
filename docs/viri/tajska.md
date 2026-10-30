# Tajska — vir `thaileague`

Vir `thaileague` (`scripts/viri/thaileague.mjs`) bere **Thai League** (TL,
podjetje tajske zveze FAT, thaileague.co.th): Thai League 2 (raven 2, 18
klubov) in Thai League 3 (raven 3, šest regij). Država `TH` ("ประเทศไทย"),
zveza `thaileague`, lige `th-t2` in `th-t3-<regija>` (migracija
20261028121100), **neaktivne**; šifra lige se začne s `th-`.

**Država je pripravljena** (28. 10. 2026, migracija 20261028131500): angleški
vmesnik (`JEZIK_DRZAVE.TH = 'en'`, tajskega slovarja ni), ugib po `th` ali
pasu `Asia/Bangkok`, vstop `slff.eu/th`, kartica `th.html` (Caddy, rezerva
`:3201`, `vercel.json`), angleška pošta z rokom po bangkoško, zastava, imena
hišnih ekip in lastnikov (`IMENA_TH`), `klub_stik.drzava` in `TH` v matriki
nočnega uvoza (posel ima pdftotext, kot `uvoz-lige.yml` za `th-`). Pozicije da
zapisnik, zato strani Pozicije v meniju za TH ni. Lige ostanejo neaktivne do
uvoza in vklopa. Tekme so v Ljubljani **dopoldne** (Bangkok UTC+7 brez
poletnega časa: poleti −5 h, pozimi −6 h; 15:30 → 10:30 oziroma 9:30).

## Dostop in pravice

- thaileague.co.th je stran Angular, podatke si naloži iz javnega API-ja
  `https://competition.tl.prod.c0d1um.io/thaileague/api/` **brez ključa,
  prijave ali žetona** (v svežnju `main-es2017.*.js` je le osnovni naslov in
  privzeti XSRF piškotek Angularja, ki ga GET ne potrebuje). Beremo iste klice
  kot stran sama.
- robots.txt: na `competition.tl.prod.c0d1um.io` ga ni (404), na
  thaileague.co.th SPA za `/robots.txt` vrne naslovnico (pravila ni).
  **Pogojev uporabe spletišče nima** (ni poti ne povezave; noga le
  "Copyright © - Thai League"). Dovoljenja TL nimamo — pred vklopom je
  smiselno vprašati.
- Beremo odkrito (`User-Agent: SLFF fantasy (https://slff.eu)`, **3 s** med
  zahtevki, popolnih zapisnikov ne beremo znova). **Ob 401, 403, 429 ali
  izzivu se uvoz ustavi (`ThaiLeagueZavrnitev`, izhod 4) — ne obhajaj**;
  `thFetch` 429 ne ponavlja.
- Vsak klic izvoza (`exports-competition-match`) na njihovem strežniku
  **ustvari PDF** (`/media/tmp/<uuid>.pdf`). Zato gre besedilo zapisnika v
  predpomnilnik (tudi nepopolno, ki ga beremo znova le 45 dni po tekmi).

## Šifre

Šifra lige je `<turnir>/<stopnja>` ene sezone. Sezone:
`season-dropdown-public/` (2026/27 = 33, 2025/26 = 32); turnirji sezone:
`tournament-dropdown-public/?season=<id>`; stopnje (regije):
`stage-dropdown-public/?tournament=<id>`. **Ob novi sezoni se popravi
šifra** (turnir in stopnje so novi).

| liga | klubov 2026/27 | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|---|
| th-t1 | 16 | `224/1202` | `207/1051` |
| th-t2 | 18 | `226/1203` | `208/1054` |
| th-t3-north | 12 | `228/1204` | `209/1057` |
| th-t3-northeast | 12 | `228/1205` | `209/1059` |
| th-t3-east | 11 | `228/1207` | `209/1060` |
| th-t3-central | 12 | `228/1208` | `209/1058` |
| th-t3-west | 12 | `228/1209` | `209/1061` |
| th-t3-south | 10 | `228/1210` | `209/1062` |

Skupaj 103 klubi (T1 dodana 30. 10. 2026, migracija 20261030211300). T3 2025/26 ima pod istim turnirjem še končnico
(`CHAMPIONSHIP`, `CHAMPIONS LEAGUE GROUP A–C`) — ne uvažamo je. T2 2025/26
ima še `Play-Off Round` (stopnja 1195) — prav tako ne.

## Razpored

`match-day-match-public/?tournament=<t>&stage=<s>` (JSON, ostranjen z
`next`): vse tekme stopnje z `match_day_name` (številka kroga; prestavljena
tekma ima "3 (ตกค้าง)" = "zaostala", ostane v svojem krogu), `start_date` in
`start_time` po bangkoškem času, `match_status` (2 = odigrana, 0 = ne),
izid, `is_ca_approve` (zapisnik potrjen; vse odigrane ga imajo) in
`is_cancel` (odpovedana — ni v razporedu). Imena klubov so tajska in
angleška (`*_name_en`, z različnimi velikimi črkami in dvojnimi presledki:
"CHIANGRAI  TSC  FC", "Chiangmai FC") — beremo angleška, presledke strnemo.
Vir preveri, da je vsaka tekma iz zahtevane stopnje (sicer se uvoz ustavi).
Sezona je "2026/27" iz imena turnirja; turnirji 2025/26 v imenu leta nimajo,
zato iz datuma (meja 1. julij).

## Zapisnik

JSON tekme (`match-day-match-public/<id>/`) postav nima. Postave so le v PDF
"Match Report": `exports-competition-match/?match_id=<id>&type=
match_summary_public&is_thai_language=false&tournament=<t>` vrne `pdf_url`.
Stran ga ponudi le za potrjene tekme.

PDF (cairo) ima dva stolpca: začetna enajsterica in "Substitutes" z dresom
(`[ 5 ]`), pozicijo (GK, DF, MF, FW → GK, DEF, MID, FWD) in imenom (vzdevek
v oklepaju), za igralcem njegovi dogodki. **Vrsto dogodka pove le ikona**
(slika), ne besedilo — gol in rumeni karton sta oba "39'":

| ikona (prstni odtis) | pomen | besedilo |
|---|---|---|
| žoga `f68b6d04ff25d926` | gol | `39'`, avtogol `39' (OG)`, 11 m `70' (P)` |
| rumen karton `7517d8e8f0e52a8f` | opomin | `85'` |
| rdeč karton `e418ff4d08ebdeb2` | izključitev | `26`, `90+3` (brez opuščaja) |
| rdeča puščica `24bad4c3039b20be` | izstop | `61`, `90+4` |
| modra puščica `b59ee37078e291ee` | vstop | `46` |

Kako beremo:

- Besede z mesti da `pdftotext -bbox` (poppler-utils, kot `fmf`, `pfl-az`).
- Ikone: vir sam prebere tok strani (`cm`/`Do`, brez knjižnice — `zlib`), kje
  je narisana katera slika, sliko pa prepozna po **prstnem odtisu pik**
  (sha256 razpakiranih RGB; `IKONE`). Slika je pri vseh zapisnikih ista
  datoteka. **Neznana ikona** (npr. drugi rumeni, ki ga v vzorcu še nismo
  videli) **ni ugibanje**: zapisnik je nepopoln, v besedilu ostane
  `{?<odtis>}` — odtis dopiši v `IKONE`.
- Stolpca loči lega levega roba gostujočega "[n] GK|DF|MF|FW" (ne kateri koli
  "[n]": tabela dogodkov ima "[28]" sredi strani).
- **Dolgo ime se prelomi** v dve vrstici, dres in pozicija pa stojita na
  sredini med njima (±6 pt); prelom (tudi dogodki v drugi vrstici,
  "… 68' / 90+1") gre k najbližjemu igralcu.
- Dogodki niso po času (ikone po vrsti: gol, karton, menjava). Menjave so pri
  vsakem igralcu posebej; v pare jih zložimo po zapisani minuti ("90+4"),
  nato po minuti. Podaljšek se ne šteje (90+4 → 90, 45+2 → 45).
- Identiteta je **ime + klub + dres** (šifer ni, kot `fss`, `pfl-az`). Ime
  je v zapisniku z različnimi velikimi črkami ("tanawit kamjoi" ob
  "THANAWAT LOEDCHAI"), zato ga zapišemo "Tanawit Kamjoi"; vzdevek izpustimo,
  zabloden tajski znak na začetku besede ("์NACHANOK") tudi.
- V predpomnilnik in vzorce gre le besedilo postav z oznakami ikon (`{G}`,
  `{Y}`, `{R}`, `{IN}`, `{OUT}`) — **brez sodnikov, delegata, trenerjev in
  vodij ekip**, brez gledalcev in prihodkov.

**Nepopoln zapisnik** (kot `frf`): ni 11 začetnikov, goli ≠ izid, neznana
ikona, minuta brez ikone, menjava brez para, nerazumljena vrstica. Izid se
zapiše, `imported_at` ostane prazen, 45 dni se bere znova.

Kontumacij v sezoni še ni bilo; kako jih TL zapiše, ne vemo (`kontumacije`
ni napisana).

## Preizkus (28. 10. 2026, brez pisanja v bazo)

38 zapisnikov (po 5 iz vsake regije T3 in T2 2026/27 ter 3 iz arhiva
2025/26), ~80 zahtevkov po 3 s, nobene zavrnitve:

- **38/38 popolnih**: vse postave 11 + 11, goli = izid (86 golov, 3 × 11 m, 2
  avtogola), 164 rumenih, 8 rdečih, 348 menjav (vse v paru).
- Minute: 990 na ekipo; izjeme so le ekipe z rdečim kartonom (926 = rdeči v
  26., 956 = v 56. …). Vsak začetnik z GK je vratar (po en na ekipo).
- Čas: 15:30 Bangkok → 10:30 Ljubljana (poleti), 16:00 → 10:00 (januar).

Odigranih 2026/27 do 28. 10.: T3 184 (vse potrjene), T2 72.

## Ženske in mladi (za pozneje)

Isti API ima **Thai Women's League 1 in 2** (2026/27: turnirja 232, 233) in
**PEA U-21 Youngster League** (229); 2025/26 še "Thailand Semi-Pro League
2026" (223, koledarska, regije North … South — 4. raven moških, morda za
pozneje). Pokali (FA Cup, Muang Thai Cup) niso lige.

## Preizkusi

`npm run smoke` (razdelek *vir thaileague*): vzorci `scripts/vzorci/th-tl-*`
— seznam tekem T3 North 2026/27 (polja, ki jih beremo), krog 3 Central s
prestavljenimi, šest zapisnikov (avtogol, rdeči brez opuščaja, prelomljena
imena, 11 m, arhiv T2), besede z mesti in ikone tekme 38240 (pretvorba da
shranjeno besedilo), najmanjši PDF z ikono rumenega kartona (tok strani),
zavrnitve.

## Uvoz

```bash
gh workflow run uvoz-lige.yml -f liga=th-t3-north -f arhiv=209/1057 -f cene=true
```

Ena za drugo. Arhiv ~130 zapisnikov (T2 ~306) po 2 zahtevka in 3 s.
