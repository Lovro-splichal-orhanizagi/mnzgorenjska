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

## Turčija — vir `tff`

Vir `tff` (`scripts/viri/tff.mjs`) bere **tff.org** (Türkiye Futbol
Federasyonu): Trendyol 1. Lig (raven 2, ena skupina, 20 klubov, 38 tednov),
Nesine 2. Lig (raven 3, skupini Beyaz in Kırmızı), Nesine 3. Lig
(raven 4, v 2026/27 tri skupine po 18 klubov) in Profesyonelliğe Geçiş Ligi
(PGL, raven 5, nekdanji BAL, 12 skupin po 10–14 klubov, prvi krog 17.–18. 10.
2026). Pokrajinske amaterske lige (Süper Amatör in nižje, ASKF) na tff.org
niso. **Süper Lig namenoma ni vpisana**: TFF ima svojo fantasy igro, pogoji
so nekomercialni — o njej odloči lastnik posebej. Država `TR` ("Türkiye") in zveza `tff` vpiše migracija lig; vmesnika v
turščini, kartice, pošte in `TR` v matriki nočnega uvoza **še ni** — oboje
pred vklopom (`TR` je le v `SKUPEN_VIR`, da ročni uvozi turških lig tečejo
eden za drugim). Šifra lige se začne s `tr-`.

- **Kodiranje**: ASP.NET iz strežnika v **windows-1254**. `vir.fetch`
  (`tffFetch`) bajte pretvori v UTF-8; brez tega so ğ, ı, İ, ş pokvarjeni.
- **Šifra lige je `<pageID>/<grupID>`**: stran tekmovanja ene sezone in
  skupina. 2026/27: 2. Lig `976`, 3. Lig `971`, PGL `1596`; 2025/26: 2. Lig
  `1769`, 3. Lig `1770`, BAL `1793` (seznam sezon: arhiv 2. Lig `pageID=371`,
  3. Lig `376`, PGL `1290`). Vsaka sezona ima nove številke obeh.
- **1. Lig je brez skupin: šifra je le `<pageID>`** — `142` (stran lige, ki
  kaže tekočo sezono; ob novi sezoni dobi zaključena svojo številko), arhiv
  2025/26 `1772` (seznam sezon `pageID=563`). Predloga tedna je druga:
  `default.aspx?pageID=142&hafta=<n>`, zavihek "10.Hafta" (`…_hs_Tab2`) in
  vrstice `dtlHaftaninMaclari` (domači Label4, gostje Label1, izid
  Label5/Label6, `macId`, `kulupID`); `tekmeTedna` in `obreziTeden` za šifro
  brez skupine bereta le ta blok. Na isti strani sta še play-off (`kupaMaclari`,
  maja) in fiksture vse sezone brez datumov — ne beremo ju. Zapisnik je isti
  kot pri nižjih ligah. Neznan teden (`hafta=99`) kaže prazen "99.Hafta".
- **Ime kluba po šifri** (`IME_KLUBA` v viru): 1. Lig ima sponzorje v imenu in
  jih menja vsako sezono ("ÖZBELSAN SİVASSPOR" 2025/26 → "EKENLER BETON
  SİVASSPOR"); brez preslikave bi arhiv isti klub vpisal še enkrat. Pregled
  15. 10. 2026 (1. Lig obeh sezon proti 2./3. Lig, PGL, BAL): 10 preimenovanih
  (devet v 1. Lig, Hatayspor v 2. Lig), **0 trkov** (isto ime, druga šifra).
  Ob novi sezoni pregled ponovi.
- **Razpored** je po tednih: `default.aspx?pageID=<p>&grupID=<g>&hafta=<n>`
  (zavihek "<skupina> (<n>.hafta)", vse tekme kroga z datumom, uro, kluboma s
  šifro `kulupID`, izidom in `macId`). Število tednov povedo povezave
  `hafta=`. Neznan teden ali skupino stran tiho zamenja — vir preveri zavihek in
  se ustavi. Ura je istanbulska (UTC+3 vse leto) → ljubljanska (poleti −1 h,
  pozimi −2 h). Celotna stran 3. Lig ima 640 kB (fiksturji vseh skupin, brez
  datumov); v predpomnilnik (`scripts/.predpomnilnik/tff/hafta-…`) gre le
  tedenski del (`obreziTeden`). Odigran teden (vsi izidi, zadnja tekma > 3 dni)
  se bere enkrat na teden do 45 dni (disciplinska komisija izid pozneje
  spremeni v hükmen 3:0, `kontumacije` pa gleda izide tedna), starejši ne
  več; teden od −10 do +7 dni vsako uro, poznejši na 3 dni.
- **Ime kluba** je zadnje, ki ga strani tednov povedo za `kulupID` (klub 4485
  je v starih fiksturjih "BEYKOZ İSHAKLI …", zdaj "BÜYÜKÇEKMECE GÜCÜ …");
  zapisnik vzame ime, krog in datum s strani tedna. Ključ kluba je po turško
  (`toLocaleLowerCase('tr')`: I → ı, İ → i), kratko ime brez "Spor Kulübü",
  "A.Ş." ("Kdz.Ereğli 1980", "Orduspor 1967").
- **Zapisnik** `Default.aspx?pageId=29&macId=<id>` (šifra v bazi `tr<id>`): za
  vsako ekipo "İlk 11" (dres "47." in igralec s **stalno šifro osebe**
  `kisiId` → `reg_st`), "Yedekler" (klop), "Goller" ("IME,47.dk (H)": F noga,
  H glava, P 11 m, K avtogol — vpisan pri **strelčevi** ekipi, šteje
  nasprotniku; S = izvajanje 11 m po tekmi, ne šteje), "Kartlar" (Sarı Kart,
  Kırmızı Kart, Çift Sarı Kart = drugi rumeni, prvi rumeni ni vpisan posebej →
  1 rumeni + 1 rdeči ob isti minuti), "Oyundan Çıkanlar" in "Oyuna Girenler"
  (izstop in vstop z minuto, par po minuti; "90+3.dk" → 90). Ime "MÜCAHİT
  ÇAKIR" → "Çakır Mücahit". **Vratarja in pozicij ni** (prvi začetnik ni
  vratar: dresi 47, 34, 25 …) — vse pozicije, tudi GK, določi glasovanje;
  *Uskladi pozicije* za `tff` nima česa šteti. Sodnikov, opazovalcev,
  stadiona in trenerjev ne beremo; vzorci `scripts/vzorci/tr-tff-*` so brez
  njih.
- **Neodigrana tekma** ima glavo z datumom brez izida; **kontumacija** (hükmen)
  ima izid 3:0 / 0:3, opombo "Esame Bilgileri Kulüpler Tarafından
  Girilmektedir", brez ure in brez ene ali obeh postav (Yeni Malatyaspor,
  3. Lig 03, 3. in 11. 10. 2026; BAL 2025/26 pogosto z le domačo postavo).
  `vZapisnik` vrne null, `vir.kontumacije` jo označi po tednu dni.
- **Izid brez strelcev** (manj golov kot izid, `manjkajoGoli`): TFF strelce
  vpiše pozneje. Do 45 dni je tekma `nepopoln` (opozorilo `zapisnik
  nepopoln`, `imported_at` prazen, borza čaka) in jo vsak uvoz bere sveže;
  starejša gre skozi z opozorilom `goli … se ne ujemajo z izidom`.
- Imena: TFF ime kluba včasih odreže ("… SPORTİF FAALİYET SPOR KULÜ").

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt ni (404),
izziva ni. Pogoji uporabe (`default.aspx?pageID=179`): "Sitede yer alan
bilgiler, kaynak gösterilmek suretiyle yayımlanabilir; ancak bu bilgiler
ticari amaçlarla kullanılamaz" — objava **z navedbo vira** (`vir_ime` TFF,
`vir_url` → tff.org v nogi), **ne v komercialne namene**. SLFF je brezplačen,
zato zdaj ustreza. **Pogoj za ponovni pregled: ko SLFF zasluži karkoli
(oglasi, sponzorji, plačljivi preverjeni igralci, pivo), potrebujemo pisno
dovoljenje TFF ali turške lige izklopimo.** Beremo odkrito (User-Agent
`SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, zaključenih tednov in
zapisnikov ne beremo znova). **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi —
ne obhajaj** (`TffZavrnitev`, izhod 4 — na strani tedna in tekme, oboje gre
skozi `prenesiStran`; 401, 403 in 429 vrže že `vir.fetch` (`tffFetch`), brez
ponovitev, zato tudi uvoz razporeda in kontumacije ne vzamejo shranjene strani). V predpomnilnik gre le prava stran (`vir.zaPredpomnilnik`:
zapisnik z glavo, teden z zavihkom) — napaka strežnika s statusom 200 ne. Če nas TFF prosi, naj nehamo, `tr-`
lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo, ~150 zahtevkov): tabela
spodaj; vse prebrane postave 11 + 11, goli = izid, menjave z minuto, 0
opozoril. 3. Lig 01 v celoti: 34 tednov, 306 tekem, 18 klubov. Ekipa ima 990
minut razen pri rdečem kartonu.

| liga | tekoča 2026/27 | zapisnikov (goli = izid, postav po 11, s klopi) | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| tr-1-lig | `142` (20 klubov, 38 tednov) | vseh 97 odigranih do 15. 10.: 97 (254, 194/194, 893; 6 avtogolov, 19 z 11 m, 21 rdečih) | `1772` (13 od 20; 5 tednov, 50 zapisnikov: 148, 100/100, 430) |
| tr-2-lig-beyaz | `976/3541` | 12 (36, 24/24, 103) | `1769/2781` Kırmızı (8 od 18) |
| tr-2-lig-kirmizi | `976/3542` (17 klubov) | 12 (39, 24/24, 112; 2 avtogola) | `1769/2782` Beyaz (7 od 19) |
| tr-3-lig-1 | `971/3543` | 12 (34, 24/24, 110) | `1770/2785` 03 (9), `1770/2783` 01 (7) |
| tr-3-lig-2 | `971/3544` | 12 (24, 24/24, 111) | `1770/2786` 04 (11) |
| tr-3-lig-3 | `971/3545` | 10 + 2 kontumaciji (42, 20/20, 94) | `1770/2784` 02 (11) |
| tr-pgl-1 … tr-pgl-12 | `1596/3938` … `1596/3949` (12 skupin, 10–14 klubov, 22 ali 26 tednov) | 2026/27 še ni odigrana (1. krog 17.–18. 10.); BAL 2025/26: 47 (97, 94/94, 414) | spodaj |

Arhiv je izbran po skupnih klubih (šifre `kulupID` iz fiksturjev obeh sezon);
vsak arhiv ima ena sama liga. 2. Lig je med sezonama skupini premešala, zato
je arhiv šibek. PGL 2026/27 ima 12 skupin, BAL 2025/26 jih je imel deset;
PGL je nova raven: najboljši klubi BAL in izpadli iz 3. Lig (ta ima zdaj tri
skupine namesto štirih). Skupnih klubov z BAL je največ 6 od 10–14, zato je
arhiv šibek; izpadli iz 3. Lig dobijo ceno iz višje lige sami (`reg_st` =
`kisiId`, isti vir), če je 3. Lig uvožena. Predlog (vsak BAL arhiv enkrat,
`1793/<grup>`): PGL 1 `3306` (4), 2 `3304` (3), 3 `3302` (4), 4 `3309` (3),
5 `3310` (6), 8 `3301` (3), 10 `3308` (5), 11 `3305` (3), 12 `3307` (5);
PGL 6, 7 in 9 brez arhiva (`3303` ima z njimi le 1 klub). BAL 2025/26 preizkus
(teden 10 vsake od 10 skupin): 47 zapisnikov in 3 kontumacije z le domačo
postavo, goli = izid 97/97, 94/94 postav po 11, 414 nastopov s klopi, 2
avtogola, 12 golov z 11 m, 0 opozoril. **PGL pred uvozom preveri na prvem
odigranem krogu 2026/27.**

1. Lig (15. 10. 2026, 135 + 88 zahtevkov): tekoča sezona 38 tednov, 380
tekem, 20 klubov, 97 z izidom — vsi zapisniki 11 + 11, menjave z minuto (893),
goli = izid 96/97 (tekma 318188, Mardin : Karagümrük, se je ta dan šele
končala: izid 1:0 brez vpisanega strelca, tudi zvečer še brez), 990
minut 177/194, ostalih 17 pojasni rdeči karton. Arhiv `1772` (tedni 1, 10,
19, 28, 38): 50 zapisnikov, goli = izid 50/50, 990 minut 90/100 (10 z rdečim),
0 opozoril. Imena tujcev so po turško ("Gıannı", "Cebıo"): TFF jih piše z I
brez pike, od turških (YILMAZ, AYDIN) se ne dajo zanesljivo ločiti.

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=tr-1-lig -f
arhiv=1772 -f cene=true` (38 strani tednov in ~480 zapisnikov po 3 s — prvi
uvoz okoli 30 minut), `gh workflow run uvoz-lige.yml -f liga=tr-3-lig-1 -f
arhiv=1770/2785,1770/2783 -f cene=true`. Liga je 34 strani tednov in ~300
zapisnikov po 3 s — prvi uvoz okoli 20–30 minut.
