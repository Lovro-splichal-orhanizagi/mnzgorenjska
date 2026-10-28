# Japonska — vir `jfl`

Vir `jfl` (`scripts/viri/jfl.mjs`) bere **Japan Football League** (JFL,
日本フットボールリーグ, jfl.or.jp): 4. raven pod J1–J3, 16 klubov, 30 krogov
(dvokrožno). Država `JP` ("日本"), zveza `jfl`, liga `jp-jfl` (migracija
20261028120900), **neaktivna**; šifra lige se začne z `jp-`. Imena klubov in
igralcev so japonska, kot jih objavi liga (priimek naprej, polna širina
"Ｈｏｎｄａ ＦＣ" ostane).

**Še manjka za vklop**: vmesnik (`src/i18n/ja/` ali angleščina za JP,
`JEZIK_DRZAVE.JP`), kartica `jp.html` in Caddy, veja pošte, imena hišnih ekip,
`JP` v matriki nočnega uvoza (`docs/nocni-uvoz.md`), `klub_stik.drzava`.
Čas: liga igra ob 13:00–18:00 po japonsko, kar je **05:00–11:00 po
ljubljansko** (poleti −7 h, pozimi −8 h) — rok kroga (`rok_pomak_ur` 6) pade
na noč pred tekmo.

- **Dostop.** robots.txt na `www.jfl.or.jp` in `data.jfl.or.jp` ne obstaja
  (404, preverjeno 28. 10. 2026; `jfl.or.jp` brez `www` vrne 403 — ne beremo
  ga). Pogojev uporabe, ki bi prepovedovali samodejno branje, ni; stran
  "静止画/動画について" (a=1596) omejuje le snemanje in objavo posnetkov,
  logotipov in podob igralcev, noga pravi "Copyright © JAPAN FOOTBALL LEAGUE.
  All Rights Reserved." Beremo le dejstva tekem (postave, minute, goli,
  kartoni), nobenih slik, logotipov ali posnetkov. Beremo odkrito
  (`User-Agent: SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih
  zapisnikov ne beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi
  (`JflZavrnitev`, izhod 4) — ne obhajaj**; `jflFetch` 429 ne ponavlja.
  Dovoljenja JFL nimamo (kontakt za medije: obrazec na a=2535).
- **GoalNote** (regionalne in prefekturne lige, goalnote.net) ima
  `Disallow: /` — **ne beremo ga**, tudi ne za regionalne lige pod JFL.
- **Šifra lige je `<stran>-<sezona>`**: `f` je datoteka sezone
  (`2026A001_spc.html`), `a` številka strani CMS, ki jo sezona dobi ob objavi.
  Stran brez prave `a` vrne privzeto vsebino (tekočo sezono ali naslovnico s
  statusom 200), zato vir preveri, da naslov razporeda nosi leto iz šifre, in
  sicer ustavi uvoz. Seznam sezon: a=38 (第１回 … 第２７回, 2026 JFL CUP), na
  strani sezone povezava "日程・結果".
- **Razpored** je ena stran z vsemi 30 krogi (`第N節`), vrstica na tekmo:
  datum "08月29日(土)" **brez leta** (ali `未定`), ura (ali `未定`), domači,
  izid ("0-0"; neodigrana " - "; odpovedana "&nbsp;-&nbsp;" s povezavo), gostje,
  prizorišče, povezava na stran tekme (`a=2617&f=<šifra>_spc.html`) in na PDF.
  Leto pove naslov strani: "(2026-2027)" — julij–december prvo leto,
  januar–junij drugo; "(2025)" — koledarsko leto. Tekme brez datuma (`未定`,
  2026/27: 62 v pomladnem delu) pridejo brez datuma in roka; razpored jih
  dopolni, ko JFL objavi termin.
- **Sezona 2026/27 je prva jesensko-pomladna** (JFL je sledila J.League;
  avgust 2026 – maj 2027, `sezona_koledarska = false`, oznaka "2026/27").
  2025 in starejše so **koledarske** (marec–november) in dobijo oznako "2025".
  Vmes (pomlad 2026) je bil "2026 JFL CUP" — pokal s skupinami, ni liga, ne
  uvažamo ga.
- **Zapisnik** beremo s **strani tekme** (HTML), ne iz PDF: ista uradna
  vsebina — stanje (`【試合終了】`), izid in polčas, datum in ura, goli z
  minuto, dresom in imenom ("(PK)" = 11 m; "オウンゴール" brez dresa = avtogol
  pri ekipi, ki ji šteje — **strelec avtogola ni zapisan**, tudi v PDF ne),
  opomini in izključitve z minuto in razlogom, začetna enajsterica in klop s
  **pozicijo GK/DF/MF/FW** (→ GK/DEF/MID/FWD) in dresom, kapetan "(C)",
  menjave z minuto ("56分", "90+4分" → 90; najprej kdo gre ven, nato kdo noter).
  Levo je domača, desno gostujoča ekipa. Drugi rumeni je zapisan kot dva
  rumena in rdeči z razlogom "警告2" → kot pri drugih virih 1 rumeni + 1 rdeči.
  Karton osebja (brez dresa, pogosto "試合後") ne šteje. Šifer igralcev ni:
  identiteta je **ime + klub** (kot fss, ffa); igralec dogodka se poišče po
  dresu na svoji strani, ime je preverba (razlika = opozorilo). PDF
  (`data.jfl.or.jp/jfl-pc/pdf/<sezona>/<šifra>.pdf`) je isti zapisnik z več
  podrobnostmi (strele, prekrški) — za ročno preverbo; pdftotext ni potreben.
- **V predpomnilnik in vzorce gre očiščena stran** (`ocistiTekmo`): le izid,
  dogodki in postavi — brez glave CMS, trenerjev (監督), sodnikov in delegata
  (マッチオフィシャル), gledalcev in vremena (試合情報) ter kartonov osebja.
- **Šifra zapisnika** v bazi je `jp<šifra tekme>` (`jp2026A0010111`:
  sezona `2026A001`, krog `01`, tekma `11`).
- **Kontumacija**: odvzeta tekma (stanje `没収試合`) z izidom 3:0 ali 0:3 —
  `vir.kontumacije` prebere stran tekme. Primera še nismo videli; odpovedana
  tekma (中止, 2026/27 9. krog Numazu : Hirakata) ostane neodigrana.
- **Nepopoln zapisnik** (manj kot 11 začetnikov, goli ≠ izid, strelec ni v
  postavi) kot pri `frf`: izid se zapiše, `imported_at` ostane prazen, 45 dni
  se bere znova. Stran tekme v teku (`【前半】` …) ni zapisnik in ne gre v
  predpomnilnik.

Preizkus (28. 10. 2026, razčlenjevalnik na prenesenih straneh, brez baze in
brez pisanja v produkcijo):

| sezona | odigranih | prebranih | 11 + 11 | goli = izid | menjav z minuto | 990 min (ostale: rdeči) |
|---|---|---|---|---|---|---|
| 2026/27 (`2591-2026A001`), krogi 1–9 | 70 | 70 | 70/70 | 70/70 (181 golov, 4 avtogoli) | 667 | 135/140 |
| 2025 (`2375-2025A001`), krogi 10 in 15 | 240 | 12 | 12/12 | 12/12 | 107 | 24/24 |

Vsaka ekipa brez 990 minut ima rdeči karton. Skupaj 82 tekem: 2578 nastopov
(774 s klopi), povprečje 62,9 minute na nastop. Menjava v sodnikovem dodatku
("90+2分") da vstopnemu igralcu 0 minut (kot drugi viri). Razpored 2024
(`2218-2024A001`) se razčleni enako (240 tekem, 16 klubov); zapisnikov 2024
nismo brali. Prenos: ~100 zahtevkov po 1,2–3 s, nobene zavrnitve.

Ženske (なでしこリーグ) in mladinske lige JFL ne objavlja; za pozneje.

| liga | klubov | tekoča 2026/27 | arhiv 2025 | arhiv 2024 |
|---|---|---|---|---|
| jp-jfl | 16 | `2591-2026A001` | `2375-2025A001` | `2218-2024A001` |

Klubi se med sezonama menjajo (2025: レイラック滋賀, アトレチコ鈴鹿, 飛鳥ＦＣ …;
2026/27: アスルクラロ沼津, いわてグルージャ盛岡 iz J3, ボンズ市原). Arhiv
igralca ne vrača med aktivne; nov klub ima v arhivu manj minut.

Uvoz (ena za drugo, po vklopu matrike): `gh workflow run uvoz-lige.yml -f
liga=jp-jfl -f arhiv=2375-2025A001,2218-2024A001 -f cene=true`. Arhiv 240
strani po 3 s je ~12 minut na sezono.
