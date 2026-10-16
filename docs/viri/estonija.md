# Estonija

Država `EE` ("Eesti", migracija 20261011140000) ima vmesnik v estonščini
(`src/i18n/et/`, jezik `et`, `et-EE`, `JEZIK_DRZAVE.EE`), vstop `slff.eu/ee`,
kartico ob deljenju `ee.html` (Caddy jo vrne za `/ee` in `?t=ee-…`), estonsko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Tere") in estonska imena lastnikov hišnih
ekip ("Martin Tamm"). **Šifra estonske lige se začne z `ee-`** (koda države;
jezik je `et`). Ugib: brskalnik `et` ali pas `Europe/Tallinn`. Izrazi:
meeskond, koosseis, algkoosseis, pink, kapten, asekapten, üleminekud,
väravavaht, kaitsja, poolkaitsja, ründaja, edetabel, liigatabel,
resultatiivne sööt, kaart, nullimäng; `krog` je vedno **voor** ("5. voor"),
pripomoček `klop_plus` je "Pink+". Množine one/other (`Intl.PluralRules('et')`);
za številom je samostalnik v delilniku ednine ("3 punkti", "12 mängijat"),
v mestniku/izhodniku pa ednina za obe obliki ("12 meeskonnast"). Estonščina
ima 14 sklonov, zato ime lige **ostane v imenovalniku** in stoji samostojno
za dvopičjem ali v oklepaju ("Fantaasialiiga on avatud: {liga}", "liiga:
{liga}"); `ligaVTozilniku` ga pusti. Tako tudi ime zveze (`{zveza}` v
oklepaju) in klub ("klubi {klub}"). Brez pomišljajev (smoke). Psevdonim v
klepetu ima pridevnik pred samostalnikom ("Sinine Väravavaht 42"). Stran
Pozicije je v meniju kot v Sloveniji. `EE` je v matriki nočnega uvoza.
Manjka še: estonski kanal v HelpStacku (`Podpora.tsx` za `et` uporabi
slovenskega) in **pregled prevoda pri naravnem govorcu**.

**Koledarska sezona.** Estonske lige igrajo od marca do novembra, zato je
sezona leto: `rounds.season = '2026'`, ne `'2026/27'` (arhiv `'2025'`).
Ligo označi `competitions.sezona_koledarska = true` (migracija
20261011140100, privzeto false — obstoječe lige ostanejo pri meji 1. julija).
Tekočo sezono lige da SQL `sezona_lige(liga[, datum])`; nanjo gledata
`stanje_lige` (pripravljenost) in `vklopi_ligo_sredi_sezone`. Uvoz razporeda
oznako izračuna s `sezonaIz(datum, tekmovanje.sezona_koledarska)`
(`scripts/razpored.mjs`; zastavico prebere `scripts/tekmovanje.mjs` s
posebno poizvedbo, da manjkajoč stolpec ne odnese vira), **vir mora v
zapisniku (`z.sezona`) dati isto obliko** (`'2026'`). Hišne ekipe in
*Uskladi pozicije* berejo `sezona_lige` po ligi, preverba podatkov in
zemljevid strani vzameta obe obliki, `competitions_view` nosi
`sezona_koledarska` (Igralci po njej ugane tekočo sezono). Vse ostalo sezono
le primerja ali razvršča in z obliko "2026" deluje brez sprememb. Globalna
`tekoca_sezona()` ostane "2026/27" — nov klic naj bo `sezona_lige(liga)`.
`ovrednoti-igralce --sezona 2025` za arhiv.

## Estonija — vir `jalgpall`

Vir `jalgpall` (`scripts/viri/jalgpall.mjs`) bere **jalgpall.ee** (Eesti
Jalgpalli Liit), kjer EJL objavi vse lige odraslih od Premium liige do IV
liige. HTML iz strežnika, brez izziva. Država `EE`, jezik in koledarska
sezona so opisani zgoraj (`competitions.sezona_koledarska`).

- **Sezona je koledarsko leto** (marec–november): oznaka `"2026"`, ne
  `"2026/27"`. Vir jo zapiše v `z.sezona` iz šifre lige.
- **Šifra lige je `<id lige>/<leto>`** (`52/2026`). Id lige je stalen čez
  sezone, arhiv je isti id z drugim letom (`52/2025`). **Ob novi sezoni se
  popravi le leto** v `source_league_code`. Spodnje lige so bile 2025
  preurejene: II liiga (536), II liiga B (537, 538) in III liiga (548–550)
  imajo le 2025 in 2026; starejše sezone so bile druge lige z drugimi id-ji.
- **Razpored** `/voistlused/<id>/liigad/calendar?season=<leto>`: vsi krogi
  ("N. voor") na eni strani, tekma z datumom ("28.02.2025 19:00", tallinski
  čas → ljubljanski −1 h; lahko prazen), izidom in povezavo
  `/voistlused/protocol/<id>`. Neznano leto stran tiho zamenja s tekočim —
  vir preveri izbrano sezono in se ustavi. Izid brez povezave je tekma,
  katere zapisnik še ni vnesen.
- **Kontumacija** je izid s "+" in "-": `+ : -` (3:0), `- : +` (0:3),
  `- : -` (obe, brez izida — klub je izstopil, Piraaja 2026), `4 : -` (tekma,
  razveljavljena eni ekipi — Maardu je izstopil iz Esiliige 2026). Zapisnik
  kontumacije se ne uvaža (je prazen ali razveljavljen).
- **Zapisnik**: "Põhikoosseis" in "Vahetusmängijad" (`ul.left` domači,
  `ul.right` gostje), dres, **stalna šifra osebe** (`/voistlused/player/<id>`
  → `reg_st`), "(VV)" vratar, "(K)" kapetan. Časovnica "Mängu sündmused" z
  minuto: gol, 11 m (`penalty football`), avtogol (`goal red football`, po
  legendi strani "Omavärav"; stanje po golu je le preverba z opozorilom),
  zgrešena in ubranjena 11-metrovka, rumeni in rdeči karton, menjava (prvi
  noter, drugi ven), **`football var` = gol, ki ga je razveljavil VAR (ne
  šteje)**. Drugi rumeni je v zapisniku rumeni + rdeči ob isti minuti
  ("Teise hoiatuse saamine"); vir rumenega odstrani, da je kot pri drugih
  virih 1 rumeni + 1 rdeči. Dogodek brez minute je opozorilo.
- **Šifra zapisnika v bazi je `ee<id>`** (`sifraZapisnika`): številke
  jalgpall.ee (127xxx–143xxx) se prekrivajo s šiframi starega CMS-a (MNZ,
  100049–161136), `matches.zapisnik_id` pa je enoličen čez vse vire. Naslov
  (`naslovZapisnika`) predpono odreže; `--zapisnik` uvoza vzame `ee…`.
  Asistenca je pri golu, a je ne uvažamo (asistence določi glasovanje).
  Ime je "Ime Priimek" → uvoz dobi "Priimek Ime" (`vPriimekIme`, priimek je
  zadnja beseda; igralca prepoznamo po šifri).
- **Pozicije**: postavitev (`lineup-layout`) da pozicijo vsakega začetnika
  ("Väravavaht" GK, "…poolkaitsja" MID, "…kaitsja" DEF, "…ründaja" FWD).
  Vnese jo klub, zato je ima ena ekipa, druga ne: Premium liiga, Esiliiga in
  Esiliiga B skoraj vedno, nižje lige okoli polovice ekip. Brez nje je znan le
  vratar; ostali na glasovanje. *Uskladi pozicije* z `vir = jalgpall` (vratar
  po večini tekem).
- Klubi: ključ ohrani õ, ä, ö, ü, š, ž; rezervne ekipe ("Tallinna FC Flora
  U21") so svoj klub. Kratko ime brez oblike in kraja ("Tallinna FC Flora" →
  "Flora").

**Pravice (pregled 10. 10. 2026, ni pravni nasvet).** robots.txt splošnim
robotom dovoli vse razen `/otsing`, `/errors/` in `/ejl/staadionid/…`, s
**`Crawl-Delay: 5`** — vir čaka 5 s med zahtevki. Fragmente `ajax.php` je zveza
zaprla enemu robotu (FutisBot) kot "podatkovni tok" — **ne beremo jih**, vse je
na straneh. Pogojev uporabe ni; stran ima le pravilnik o zasebnosti
(`/ejl/tingimused-ja-pohimotted`: podatke o tekmah EJL objavlja na podlagi
licenčne pogodbe z igralci, "võidakse avalikustada kodulehel või meedias") in
nogo "Kõik õigused kaitstud". Dovoljenja EJL še nimamo. Datuma rojstva ne
beremo. Beremo odkrito (User-Agent SLFF, zapisnikov, starejših od tedna, ne
beremo znova). **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne
obhajaj**: vir vrže `JalgpallZavrnitev`, uvoz razporeda tedaj NE vzame
shranjene strani, izziv ne gre v predpomnilnik, skripta konča z izhodom 4 in
nočna zanka Estonije (`uvoz-zapisnikov.yml`) ostalih lig ne bere več.
**Proračun branja je skupen**: `cakaj-na-uvoze.mjs` (`SKUPEN_VIR`) za EE
križa vsak zagon iste države — nočni, ročni (tudi nevklopljene lige) in
*Grbi klubov* z `vir = jalgpall` (čaka na prej začete uvoze; run-name
`Grbi klubov <vir>`), da dva zagona ne bereta hkrati. Če nas EJL prosi, naj
nehamo, `ee-` lige izklopimo.

Grbe prinese `scripts/grbi-jalgpall.mjs` z glave zapisnika (`/images/clubs/…`,
`/images/logos/…`; robots.txt slike dovoli; SVG preskoči, ob 403/429 se
ustavi) — delovni tok *Grbi klubov* z `vir = jalgpall`, najprej brez `pisi`.

Seznam lig in preizkus:

```bash
node scripts/eesti-lige.mjs                      # lige 2026 s številom klubov, krogov, zapisnikov
node scripts/eesti-lige.mjs --leto 2025 --preveri
node scripts/eesti-lige.mjs --polno 52/2025      # vsi zapisniki ene lige
```

Preizkus vira na Premium liigi 2025 (`52/2025`): 36 krogov, 180 tekem,
0 kontumacij, 180 zapisnikov, 572 golov (= izidi), 360/360 postav po 11 z
enim vratarjem, pozicija pri 3960/3960 začetnikih, 5387 nastopov (1427 s
klopi), vsi s šifro, 0 opozoril.

Vpisanih je 11 lig (migracija 20261011180000), **neaktivnih**, zveza `ejl`.
Sezona 2026 je ob vpisu skoraj končana (Premium 30. od 36 krogov, nižje lige
končane) — vklop bo realno za 2027, takrat leto v šifri popravi na 2027.

| liga | klubov | tekoča | arhiv |
|---|---|---|---|
| ee-premium-liiga | 10 | `52/2026` | `52/2025`, `52/2024` |
| ee-esiliiga | 10 | `53/2026` | `53/2025`, `53/2024` |
| ee-esiliiga-b | 10 | `186/2026` | `186/2025`, `186/2024` |
| ee-ii-liiga | 16 | `536/2026` | `536/2025` |
| ee-ii-liiga-b-pohi-laas | 14 | `537/2026` | `537/2025` |
| ee-ii-liiga-b-louna-ida | 14 | `538/2026` | `538/2025` |
| ee-iii-liiga-pohi-laas | 12 | `549/2026` | `549/2025` |
| ee-iii-liiga-pohi-ida | 10 | `548/2026` | `548/2025` |
| ee-iii-liiga-louna-ida | 11 | `550/2026` | `550/2025` |
| ee-iv-liiga-pohja-ida | 8 | `267/2026` | `267/2025`, `267/2024` |
| ee-iv-liiga-pohja-laane | 7 | `268/2026` | `268/2025`, `268/2024` |

Izpuščeno: kvalifikacije (üleminekumängud: Premium 283, II liiga 281, II
liiga B 560), zaključni turnirji (III liiga võitja 180, II B võitja 559, IV
liiga võitja 181), Rahvaliiga (rekreativni sistem s prijavo, ne zapisniki
EJL), ženske, mladinske, futsal, pesek, pokali in zimski turnirji.

Uvoz (ena za drugo): `gh workflow
run uvoz-lige.yml -f liga=ee-premium-liiga -f arhiv=52/2025,52/2024 -f
cene=true`. Arhiv 180 zapisnikov po 5 s in več je okoli 20 minut na sezono.
