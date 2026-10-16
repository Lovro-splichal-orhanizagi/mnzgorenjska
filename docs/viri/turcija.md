# Turčija — vir askf

Vir `askf` (`scripts/viri/askf.mjs`) bere **pokrajinske amaterske zveze
(ASKF)** na platformi FYS ("Futbol Yönetim Sistemi", ASP.NET WebForms):
**Çanakkale** (canakkaleaskf.org) in **Aydın** (aydinaskf.com) — en vir, ker
je program isti; spletišče izbere šifra lige. To so lige pod TFF (Süper
Amatör = raven 6, 1. Amatör = 7), ki jih tff.org nima; TFF 3. Lig in PGL, ki ju
spletišči tudi naštejeta, so pri viru `tff`. Država `TR` (vmesnik, pošta, nočni
uvoz) še ni pripravljena — lige so **neaktivne**.

- **Šifra lige** je `<zveza>/<sezona>/<liga>[/<skupina>]`:
  `canakkale/2026-2027/samator`, `aydin/2026-2027/1amator/2`. `<liga>` je
  vrednost izbirnika lig brez ločil in turških črk ("S.AMATÖR" → `samator`),
  `<skupina>` naslov gumba skupine. Sezona je del šifre — ob novi sezoni se
  šifra popravi; liga s skupinami brez skupine v šifri ustavi uvoz.
- **Razpored** je `/fikstur`, a sezona, liga in skupina so **postbacki**
  (`__VIEWSTATE` ~120 kB), ne naslov. `askfFetch` za psevdonaslov
  `/fikstur#sezona=…&liga=…[&skupina=…]` odpre stran in pošlje 1–3 postbacke
  (3 s premora): meni lig je meni **prikazane** sezone (indeks se med sezonami
  zamakne), zato ob menjavi sezone ligo poišče znova. Kaj stran res kaže, pove
  glava "1.AMATÖR 2025/2026 SEZONU" (naslov strani je po postbacku skupine
  prazen) in izbrani gumb skupine; `tekmeLige` ob neujemanju ustavi uvoz. V
  predpomnilnik gre le razčlenjen razpored (JSON v komentarju, nekaj kB namesto
  0,5 MB). Uvoz zapisnikov razpored vedno prebere svež (uvoz razporeda ga
  shrani tik prej, `razporedVseStrani` ga ne bere dvakrat).
- Stran ima več **delov lige** (`rptLigler`): play-off final, polfinale, redni
  del. Beremo le redni del z letnim razporedom ("YILLIK FİKSTÜR", tedni
  "N. HAFTA"); izpadnih delov ne uvažamo. Izid s podaljškom
  ("1-4 N.S.:0-0/Uzt.:1-4") vzame končni par.
- **Čas** je istanbulski (UTC+3 vse leto) → ljubljanski (−1 h poleti, −2 h
  pozimi); "00:00" pomeni brez ure (kontumacije).
- **Kontumacija**: pod klubom v razporedu stoji opomba — "Hükmen" (zmagovalec),
  "Bu Maça Gitmeyecek/Çıkmadı", "Ligden Çekildi" (izstopil), "Ligden
  Çıkarıldı" (izključen). Taka tekma je v razporedu `kontumacija`, **tudi brez
  izida**: "Gitmeyecek" (ne bo prišel) zveza vpiše pred tekmo, "Çekildi" na vse
  tekme izstopljenega kluba. Izstop in izključitev sta še `odstop`. Izid se
  vpiše, ko ga zveza objavi (do takrat je v bazi 0:0, lestvica lige jo šteje kot
  remi). Zapisnika uvoz ne bere. Stran tekme ima tedaj le postavo ekipe, ki je
  prišla (ali nobene) — `vZapisnik` z opombo kontumacije in eno postavo vrne
  null, da igralci ne dobijo nastopa. **Neznana opomba** se ne razume kot
  kontumacija: uvoz razporeda jo javi (`::warning::`), zapisnik dobi opozorilo
  — ob novi obliki dopolni `OPOMBA_KONTUMACIJE`. Kontumacij je veliko: Aydın
  SAL 2025/26 41 od 108, Çanakkale SAL 25 od 132.
- **Zapisnik** `/macdetay?macID=<id>`: "İLK 11" in "YEDEKLER" obeh ekip z
  dresom in **šifro licence TFF** (`/oyuncular?lisansno=` → `reg_st`, ista v
  obeh pokrajinah); časovnica "OLAYLAR": `estakimli` domači, `mstakimli` gostje,
  igralec z dresom in imenom, vrsta v `title` ikone: "Gol - Ayak/Kafa/Penaltı",
  "Gol - Kendi Kalesine" (avtogol, **navadno pri ekipi, ki ji je štel** —
  strelca išče najprej po imenu v obeh ekipah, šele nato po dresu: dres 4
  gostov ni domači strelec z dresom 4), "Sarı Kart", "Kırmızı Kart", "Çıkan
  Oyuncu", "Giren Oyuncu" — **minute so točne**, menjave v pare po minuti,
  leteče menjave šteje `minuteIzPreklopov`. "DA" (polčas) = 45, "MS" (po koncu)
  = 90, "90+4'" = 90. Kartoni trenerjev imajo namesto dresa "TK" — ne štejejo in
  `obreziTekmo` jih z imeni vred vrže proč. Vratarja in pozicij ni (glasovanje).
  Šifra zapisnika v bazi je `askf-<zveza>-<macID>`.
- **Nepopoln**: ekipa z manj kot 7 začetniki (le ena postava) ali goli, ki se
  pri tekmi zadnjega tedna ne ujemajo z izidom → `nepopoln` (izid brez
  `imported_at`). `zapisnikSvez`: tekma zadnjega tedna sveže, do 45 dni iz
  predpomnilnika, a nerazčlenjena ali nepopolna stran še enkrat sveže.
- **Predpomnilnik** (`scripts/.predpomnilnik/askf`, `zaPredpomnilnik`): le
  razčlenjen razpored in stran tekme z glavo; stran napake ali vzdrževanja ne.
  Stran tekme se obreže (`obreziTekmo`): brez sodnikov, delegata, zdravnika,
  trenerjev in stadiona; vzorci `scripts/vzorci/tr-askf-*` so taki.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt na obeh
spletiščih ni (404), pogojev uporabe ni, noga pravi le "Tüm Hakları Saklıdır".
Lastnik ima dovoljenje za branje. Beremo odkrito (`User-Agent: SLFF fantasy
(https://slff.eu)`, **3 s** med zahtevki tudi med postbacki, zaključenih
zapisnikov ne beremo znova). Vse strani naložijo `recaptcha/api.js` (obrazec
za stik) — to ni izziv; izziv je gradnik `g-recaptcha` ali Cloudflare. **Ob
izzivu, CAPTCHI, 401, 403 ali 429 se uvoz ustavi** (`AskfZavrnitev` že v
`askfFetch`, brez ponovitve, izhod 4) — ne obhajaj. Strežnik je počasen (stran
tekme 5–20 s): arhiv lige (~130 strani) je 30–45 minut; lige iste zveze uvažaj
ena za drugo.

Preizkus v živo (15. 10. 2026, brez baze; prešteto z razčlenjevalnikom iz PR):

| liga 2025/26 | tekem | odigranih | kontumacij | zapisnikov | goli = izid | postav po 11 | menjav (vse z minuto) | ekip z 990 min |
|---|---|---|---|---|---|---|---|---|
| Çanakkale SAL (vse) | 132 | 132 | 25 | 105 (+2 brez postav) | 390 / 390 | 210 / 210 | 747 | 181 / 210 |
| Çanakkale 1. Amatör (prvih 46) | 90 | 46 | 1 | 44 | 179 / 179 | 88 / 88 | 366 | 73 / 88 |
| Aydın SAL (vse) | 110 | 108 | 41 | 67 | 331 / 331 | 134 / 134 | 510 | 108 / 134 |
| Aydın 1. Amatör 1 (prvih 40) | 72 | 40 | 8 | 32 | 144 / 144 | 64 / 64 | 251 | 51 / 64 |
| Aydın 1. Amatör 2 (prvih 40) | 72 | 40 | 0 | 40 (9 nepopolnih) | 149 / 186 | 71 / 71 | 282 | 55 / 71 |

Ekipe brez 990 minut pojasni rdeči karton ali strelec s klopi brez vpisanega
vstopa (vstop ob golu, opozorilo). Napake vira: menjava z minuto "-150'"
(opozorilo, menjava izpade), dve odigrani tekmi Çanakkale SAL brez postav.
V Aydın 1. Amatör 2 2025/26 **KOÇARLI BLD.SPOR ni vnesel nobene postave** —
vseh 9 njegovih tekem je nepopolnih (izid, nastopi le nasprotnika; arhiv
nepopolnih ne uvaža).

**Aydın: 403 (15. 10. 2026, 10:58).** Med preizkusom je aydinaskf.com po
~200 zahtevkih v ~70 minutah (3 s premora, stran tekme 5–20 s) na stran tekme
(`macID=5992`) vrnil **HTTP 403**. Preizkus se je ustavil (`AskfZavrnitev`) in
spletišča nismo več brali — ne vemo, ali je zapora trajna, časovna ali le ta
stran. Aydın 1. Amatör 3 zato ni preštet. **Pred uvozom aydınskih lig** naj
lastnik preveri dostop (ali vpraša Aydın ASKF); če 403 ostane, `aydin` lige
ostanejo neaktivne in jih ne beremo — ne obhajaj (drug IP, brskalnik, manjši
tempo brez dogovora). Çanakkale zavrnitve ni vrnil (~260 zahtevkov). Ob
11:15 istega dne je en sam GET `/fikstur` spet dobil 403 — zapora traja.

Vpisanih je 5 lig (migracija 20261015230900), **neaktivnih**, zvezi
`askf-canakkale` in `askf-aydin`. Sezona 2026/27 se začne konec oktobra
(Aydın 24.–25. 10.); Çanakkale razporeda 2026/27 še ni datiral — uvoz
razporeda do takrat konča z "Razporeda ni bilo mogoče razbrati".

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| tr-canakkale-sal | 11 | `canakkale/2026-2027/samator` | `canakkale/2025-2026/samator` (12 lani) |
| tr-canakkale-1-amator | 11 | `canakkale/2026-2027/1amator` | `canakkale/2025-2026/1amator` |
| tr-aydin-sal | 13 | `aydin/2026-2027/samator` | `aydin/2025-2026/samator` (11 lani) |
| tr-aydin-1-amator-1 | 11 | `aydin/2026-2027/1amator/1` | `aydin/2025-2026/1amator/1` (6) |
| tr-aydin-1-amator-2 | 11 | `aydin/2026-2027/1amator/2` | `aydin/2025-2026/1amator/2`, `aydin/2025-2026/1amator/3` (5 + 4) |

Izpuščeno: 2. Amatör (2026/27 ni razpisana; Çanakkale 2025/26 skupine A–C po
5–6 klubov, le spomladi), mladinske (U19–U11), ženske, veterani, pokali,
play-off. Uvoz (**ena za drugo**): `gh workflow run uvoz-lige.yml -f
liga=tr-canakkale-sal -f arhiv=canakkale/2025-2026/samator -f cene=true`.
