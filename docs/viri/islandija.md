# Islandija — vir `ksi`

Država `IS` ("Ísland") in zveza `ksi` pridejo z migracijo lig
(20261015171100). **Vmesnika v islandščini, kartice in pošte še ni** (kot pri
Litvi in Črni gori), `IS` **ni** v matriki nočnega uvoza in ni v *Hisne
ekipe* — vse to pred vklopom. Šifra lige se začne z `is-`. Sezona je
**koledarska** (april–oktober, `sezona_koledarska`, oznaka `"2026"`).

Vir `ksi` (`scripts/viri/ksi.mjs`) bere **ksi.is** (Knattspyrnusamband
Íslands), kjer KSÍ iz COMET objavi vsa tekmovanja. Astro, HTML iz strežnika,
brez izziva; robots.txt `Allow: /` za vse. Beremo odkrito (`User-Agent: SLFF
fantasy (https://slff.eu)`, **3 s** med zahtevki, zapisnikov, starejših od
tedna, ne beremo znova; do 45 dni še enkrat sveže, če se shranjena stran ne
razčleni ali goli niso izid — `zapisnikSvez`). **Ob izzivu, CAPTCHI, 401, 403
ali 429 se uvoz ustavi** (`KsiZavrnitev`, izhod 4) — ne obhajaj. Stran napake
s statusom 200 ne gre v predpomnilnik (`zaPredpomnilnik`: le stran z
izbirnikom sezone ali zavihkom Leikskýrsla). Dovoljenja KSÍ nimamo (in ga za
javne strani ne potrebujemo po robots.txt); če nas prosijo, naj nehamo,
`is-` lige izklopimo.

- **Šifra lige je id tekmovanja** (`/oll-mot/mot?id=<id>`), vsaka sezona ima
  svojega. Liga z več fazami jih našteje s `+`: Besta deild je osnovni del
  (22 krogov) in nato "Efri hluti" / "Neðri hluti" (po 5 krogov, vsak svoje
  tekmovanje); vir kroge poznejše faze zamakne za zadnji krog faze, iz katere
  so prišli njeni klubi (`zdruziFaze`, kot `oefb`), zato sta obe skupini
  kroga 23–27. Izpadni deli (Lengjudeild *Umspil*, *5. deild - Úrslit*)
  nimajo krogov ("Umferð") in se ne pripnejo — 5. deild Úrslit meša klube
  skupin A in B (kot nadstavba Plzeň-jih), zato ni vpisan. Poznejša faza s
  klubom, ki ga prejšnje faze nimajo, ali brez skupnega kluba uvoz ustavi;
  faza še brez tekem ne doda ničesar. Zapisnik tekmovanja, ki ni faza iz
  razporeda (povezava v glavi), uvoz ustavi.
- **Razpored**: stran kroga `?id=<id>&banner-tab=matches-and-results&toggle=rounds&round=<n>`;
  prva stran (brez `round`) da izbirnik "Umferð N" (koliko krogov je, izbran je
  tekoči) in izbirnik sezone (`<option selected>` "2026 - 2. deild karla 2026"
  → leto). Neznan id stran tiho zamenja z drugim tekmovanjem — vir preveri
  izbrani id in izbrani krog in se ustavi. Tekma: dan **brez letnice** ("Lau
  12. september 14:00", letnica iz sezone), **islandski čas = UTC** →
  ljubljanski +2 poleti, +1 pozimi (`vLjubljanskiCas`, prek `Intl`), igrišče,
  klub s šifro (`/oll-mot/mot/lid?id=<lid>`), izid "2 - 1" ali "-". Krog
  brez razpisanega datuma tekme stran ne pokaže (Besta Efri/Neðri hluti 4.
  krog 15. 10.: ena tekma od treh, 5. krog prazen) — pridejo z naslednjimi
  uvozi razporeda.
- **Zapisnik** `/leikir-og-urslit/felagslid/leikur?id=<id>&banner-tab=report`
  ("Leikskýrsla"; privzeti zavihek "Atburðir" postav nima): glava
  ("2. deild karla 2026 / 16. umferð", "Fim 27. ágúst 2026 18:00", izid
  `<h1>`, strelci v dveh stolpcih — levo goli domačih, desno gostov; več golov
  istega igralca v eni vrstici "10´, 45´ (vítaspyrna)"; "(sjálfsmark)" =
  avtogol igralca nasprotne ekipe), nato "Byrjunarlið" (začetniki) in
  "Varamenn" (klop) v ploščah `data-panel="home"`/`"away"`. Igralec: povezava
  `/leikmenn/leikmadur?id=<id>` (stalna šifra osebe → `reg_st`), dres, ime
  "Ime Priimek" (→ "Priimek Ime"), "(M)" vratar (markmaður, tudi rezervni),
  "(F)" kapetan, ikone z minuto: žoga (gol), `bg-[#FAC83C]` rumeni,
  `bg-[#DD3636]` rdeči, zelena puščica `#1A7941` vstop, rdeča `#DD3636`
  izstop — **minute menjav so točne**. Gole beremo iz glave (ta pove vrsto),
  ikone žoge so preverba. Rdeči "0´" je rdeči po končani tekmi: minut ne
  skrajša. Drugi rumeni (dva rumena in rdeči) → 1 rumeni + 1 rdeči. Prazna
  ikona brez gola v glavi (Höskuldur Gunnlaugsson, KR : Breiðablik 2026, 28.)
  je neznan dogodek (verjetno zgrešena 11-metrovka) — opozorilo. "Liðstjórn"
  (vodstvo) in "Dómarar" (sodniki) ne beremo; vzorci `scripts/vzorci/is-ksi-*`
  so brez njih. Šifra zapisnika v bazi je `is<id>`.
- **Stran tekme z napako 500**: nekaj zapisnikov zavihek Leikskýrsla vztrajno
  vrne HTTP 500 (Haukar : Kári 2026 `7053260`, KA : Stjarnan `7041329`,
  Valur : Breiðablik `7041365`; privzeti zavihek dela). Vir tako tekmo
  izpusti z opozorilom (tekma ostane brez zapisnika, preverba jo javi), ob več
  kot petini (najmanj 6) pa uvoz ustavi — to bi bila sprememba vira. Tudi
  `kontumacije` tako tekmo preskoči (prej je ena 500 odnesla vse kontumacije
  lige). Strani napake (500, 404) nosijo zavihek `banner-tab=report`, glave
  tekme (`match-banner`) pa ne — `zaPredpomnilnik` zahteva glavo, da stran
  napake s statusom 200 ne obvelja za zapisnik ali kontumacijo.
- **Kontumacija**: tekma z izidom 3:0 ali 0:3, starejša od tedna, katere
  zapisnik nima postav (`vir.kontumacije`, kot `lff`). Stran tekme takrat
  pod izidom piše "<klub> mættu ekki til leiks." (Einherji : Fálkar 3:0,
  Utandeild 2026). Izstopa kluba v pregledanih ligah ni bilo.
- Klubi: ključ ohrani islandske znake (`kljucKlubaIs`); ksi.is piše kratko
  ime ("Þróttur V.", "KFA", "Dalvík/Reynir") in ga vir ne krajša. Druge ekipe
  ("KÁ", "KV") so svoji klubi. Arhiv 2025 nekaterim ekipam doda pripono
  kategorije ("KFA Fullorðnir Karlar", "Höttur/Huginn Fullorðnir Karlar") —
  `imeKluba` jo odreže, sicer bi klub nastal dvakrat. **Trki imen** (pregled
  15. 10. 2026, vse lige 2026 in arhivi 2025, 83 klubov po ključu): isto ime
  z dvema šiframa kluba ksi.is (`/oll-mot/mot/lid?id=`) imata le KFA (6330 →
  7291, ista 2. deild) in KFS (5980 v 4. deild 2025 → 7702 v 5. deild 2026)
  — oba sta isti klub z novo registracijo, zato je ujemanje po imenu prav.
  Isti klub z dvema imenoma ni nobeden. Ob novi sezoni preveri znova.
- *Uskladi pozicije* z `vir = ksi` (vratar po večini tekem); ostale pozicije
  na glasovanje. Raven lige (`ravenLige`): Besta 1, Lengjudeild 2, N. deild
  N + 1, Utandeild brez ravni (zunaj piramide).

Preizkus v živo (15. 10. 2026, vsi krogi in vsi zapisniki vseh lig, brez
pisanja v bazo; "990" = ekip z natanko 990 minutami, ostale pojasni rdeči
karton ali 10/12 začetnikov, razen redkih napak vira v arhivu):

| liga | krogov | tekem / odigranih / zapisnikov | goli / izidi | postav 11 | vratar (M) | 990 min | nastopov (s klopi) |
|---|---|---|---|---|---|---|---|
| Besta 2026 (3 faze) | 26 | 152 / 150 / 148 | 571 / 571 | 296/296 | 296/296 | 286/296 | 4496 (1240) |
| Lengjudeild 2026 | 22 | 132 / 132 / 131 | 469 / 469 | 262/262 | 262/262 | 254/262 | 3971 (1089) |
| 2. deild 2026 | 22 | 132 / 132 / 131 | 507 / 507 | 262/262 | 262/262 | 248/262 | 3933 (1051) |
| 3. deild 2026 | 22 | 132 / 132 / 132 | 548 / 548 | 264/264 | 264/264 | 253/264 | 3965 (1061) |
| 4. deild 2026 | 18 | 90 / 90 / 90 | 489 / 489 | 180/180 | 180/180 | 177/180 | 2723 (743) |
| 5. deild A 2026 | 14 | 56 / 56 / 51 | 290 / 290 | 100/102 | 102/102 | 97/102 | 1492 (372) |
| 5. deild B 2026 | 14 | 56 / 56 / 51 | 254 / 254 | 102/102 | 102/102 | 98/102 | 1514 (392) |
| Utandeild 2026 | 15 | 30 / 30 / 29 | 170 / 170 | 56/58 | 57/58 | 53/58 | 830 (194) |
| Besta 2025 (3 faze) | 27 | 162 / 162 / 162 | 537 / 538 | 324/324 | 317/324 | 312/324 | 4847 (1283) |
| Lengjudeild 2025 | 22 | 132 / 132 / 132 | 470 / 470 | 264/264 | 256/264 | 254/264 | 3959 (1055) |
| 2. deild 2025 | 22 | 132 / 132 / 132 | 473 / 473 | 263/264 | 247/264 | 255/264 | 3951 (1048) |
| 3. deild 2025 | 22 | 132 / 132 / 128 | 573 / 574 | 254/256 | 248/256 | 242/256 | 3791 (975) |
| 4. deild 2025 | 18 | 90 / 90 / 90 | 392 / 392 | 174/180 | 168/180 | 159/180 | 2706 (724) |
| 5. deild A 2025 | 14 | 56 / 56 / 55 | 303 / 303 | 107/110 | 99/110 | 99/110 | 1644 (435) |
| 5. deild B 2025 | 14 | 56 / 56 / 56 | 285 / 285 | 111/112 | 110/112 | 101/112 | 1684 (453) |
| Utandeild 2025 | 14 | 42 / 42 / 42 | 209 / 210 | 83/84 | 67/84 | 76/84 | 1218 (295) |

Brez zapisnika so tekme z napako 500 (2026: Besta 2, Lengjudeild 1,
2. deild 1, 5. deild A 5 — štiri s klubom SR, 5. deild B 5 — štiri s
Hamrarnir; zato meja petina, ne desetina) in kontumacija Einherji :
Fálkar. Vsi nastopi imajo šifro osebe. **Arhiv 2025 je slabše vnesen**:
vratar (M) manjka pri 1–20 % postav (Utandeild 17 od 84), nekaj postav ima
10 ali 12 začetnikov in nekaj ekip menjavo brez para (Þór 1014 minut) —
opozorila, uvoz jih vzame. Besta deild 2026 ob preizkusu ni končana (23.–26.
krog delno, 27. še ni razpisan).

Izpuščeno: Lengjudeild *Umspil* in 5. deild *Úrslit* (izpadna dela),
Íslandsmót innanhúss (futsal), ženske, mladinske (2.–5. flokkur), pokali
(Mjólkurbikarinn, Lengjubikarinn — zimski pokal). Utandeild (5 klubov 2026,
15 krogov) je na spodnji meji (3 iz kluba × 5).

Vpisanih je 8 lig (migracija 20261015171100), **neaktivnih**, zveza `ksi`.
Sezona 2026 je ob vpisu končana (Besta deild igra zadnja kroga faz) — vklop
bo realno za **2027**.

| liga | klubov | tekoča 2026 | arhiv 2025 |
|---|---|---|---|
| is-besta-deild | 12 | `7025510+7025527+7025532` | `190366+190373+190371` |
| is-lengjudeild | 12 | `7025540` | `190359` |
| is-2-deild | 12 | `7025548` | `190365` |
| is-3-deild | 12 | `7025551` | `190363` |
| is-4-deild | 10 | `7025560` | `190358` |
| is-5-deild-a | 8 | `7025573` | `190369` |
| is-5-deild-b | 8 | `7025587` | `190362` |
| is-utandeild | 5 | `7025600` | `190275` (7 klubov) |

**Ob novi sezoni (2027)**: id-ji tekmovanj so novi. Na strani lige 2026
izbirnik sezone ("Veldu") pokaže tudi novo sezono, ko jo KSÍ objavi; sicer
`https://www.ksi.is/oll-mot/?tab=leit&name=deild%20karla&season=2027&pageSize=100`
(Besta deild in Lengjudeild imata v seznamu predpono "Íslandsmót KSÍ - ").
Nova šifra gre v `competitions.source_league_code` z migracijo (Besta deild:
tri šifre s `+`, faze se pojavijo šele julija/avgusta — dotlej le osnovni
del, nato dodaj `+<efri>+<neðri>` pred rokom 23. kroga), arhiv lige je
dotedanja šifra 2026. `sezona_koledarska` ostane, oznaka postane "2027"
sama iz izbirnika sezone.

Uvoz (ena za drugo, **šele po vklopu države** — jezik, matrika): `gh workflow
run uvoz-lige.yml -f liga=is-2-deild -f arhiv=190365 -f cene=true`. Arhiv
~130 zapisnikov po 3 s (strani ~430 kB) je okoli 8–10 minut na sezono.
