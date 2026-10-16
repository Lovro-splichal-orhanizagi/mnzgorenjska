# Danska — vir `dbu`

**Pisno dovoljenje DBU za zajem: pridobil Lovro, oktober 2026 (kopija še ni v
arhivu info@).** Dovoljenje odpravi omejitev pogojev uporabe dbu.dk (A.5.1),
**ne pokriva pa tehnične zaščite**: ob Cloudflarovem izzivu, CAPTCHI ali
401/403/429 se uvoz ustavi (`DbuZavrnitev`, izhod 4) — ne obhajaj. Zavrne že
`dbuFetch` (brez ponovitve 429, brez shranjenega razporeda pri 401). Navadna
stran naloži `google.com/recaptcha/api.js` in ima obrazec "Log ind" — to ni
izziv (`jeIzziv` gleda le Cloudflare, `class="g-recaptcha"`, turnstile).
robots.txt dovoli `/resultater/pulje|kamp|Raekke|hold`, prepove
`/resultater/kampsoegAdvanceret/`, `/turneringer_og_resultater/resultatsoegning/`
in `/umbraco/` — izvoza v Excel (`/Umbraco/DBUFront/…`) ne beremo.

Država `DK` ("Danmark", migracija 20261015172500), **šifra lige se začne z
`dk-`**, zveza `dbu`. Vmesnika v danščini, kartice in pošte **še ni**, `DK` ni
v matriki nočnega uvoza (`uvoz-zapisnikov.yml`, `KOSOV`) — oboje pred vklopom.
Sezona je jesen–pomlad: oznaka `"2026/27"` (ne koledarska).

Vir `dbu` (`scripts/viri/dbu.mjs`) bere **dbu.dk/resultater** (HTML s
strežnika, ASP.NET/Umbraco).

- **Šifra lige je id pulje** (`508656`) ali več pulj ene sezone s `+`
  (`474114+498951+498952`). Pulja je `/resultater/pulje/<id>/kampprogram`:
  vse tekme sezone (številka tekme, "fre. 31-07 2026", ura — **kopenhagenski
  čas = ljubljanski**, domači, gostje, izid, povezava
  `/resultater/kamp/<številka>_<pulja>/kampinfo`). Pulje najdeš z iskalnikom
  vrst: `/resultater/raekkesoeg/?unionid=1&genderid=0&divisionid=1&season=<S>`
  (S je leto KONCA sezone: `2026` = 2025/26; brez `season` tekoča) →
  `/resultater/Raekke/<id>` → pulje.
- **Krogov vir ne objavi, tekme pa oštevilči po krogih** (`krogiPulje`):
  zaporedni blok ⌊klubov / 2⌋ številk tekem je en krog (vmes so vrzeli,
  308842 → 308885). Številka tekme se ob prestavitvi ne spremeni, zato je krog
  **stalen** — prestavljena tekma ali cel prestavljen krog ostane v svojem
  krogu, odigrane tekme in zaklenjeni krogi se ne preštevilčijo; sredin krog
  (velika noč 2027: četrtek in ponedeljek) je svoj blok. Preverba 15. 10. 2026:
  vseh 16 pulj (obe sezoni, s fazami) — vsak blok je cel krog brez kluba
  dvakrat in enak krogom po datumih. **Prej** so bili krogi izpeljani iz
  datumov: prestavitev 4 od 6 tekem kroga je krog izbrisala, poznejše
  preštevilčila in odigrane tekme premaknila (uvoz razporeda bi jih podvojil v
  drugih krogih, zaklenjeni krogi bi izgubili tekme). Blok, ki ni krog (DBU je
  tekmo izbrisal ali dodal, klub je izstopil in tekme so šle proč, klub
  dvakrat), **ustavi uvoz** z napako — odloči človek (popravek vira), ne
  tiho preštevilčenje.
- **Več faz** (`+`): pulja se zamakne za zadnji krog prejšnjih pulj, s
  katerimi si deli klube (`kroziPulj`); vzporedni pulji (Oprykningsspil in
  Kvalifikationsspil) si delita številke 23–32. **2. in 3. division se
  spomladi razdelita** na Oprykningsspil in Kvalifikationsspil (2025/26: svoji
  pulji, klubi iste lige): ko pulji nastaneta, ju vpiši v `DBU_PULJE` v viru
  in pripni šifri z migracijo
  (`update competitions set source_league_code = '508656+<opryk>+<kval>' …`)
  pred rokom prvega kroga. **Danmarksserien** igra 18 krogov v puljah; nato
  sta Oprykningsspil in Kvalifikationsspil **mešani** (klubi več pulj) — ne
  pripenjaj (kot Regionalliga Süd).
- **Stran tekme**: "Holdopstillinger" — za vsako ekipo tabela začetnikov
  (dres, "Ime Priimek"; gostje zrcalno: ime pred dresom), "Reserver" (klop) in
  "Officials" (osebje — le za prepoznavo kartonov osebja, imen ne hranimo).
  **Vratar ni označen**; dres 1 med začetniki je namig (GK, kot oefb "T") —
  ima ga ~60–80 % postav; *Uskladi pozicije* z `vir = dbu`. Dogodki
  ("Kampfakta") so našteti **od zadnjega proti prvemu** (vir jih obrne) z
  minuto "'80" (podaljšek je absolutna minuta "'93" → 90) in ikono
  `icon_sr_<vrsta>`: `goal` (drugo ime je podaja — ne uvažamo),
  `penaltyGoal`, `goalOwn` (**prikazan pri ekipi, ki ji šteje**, strelec je
  iz nasprotne), `penaltyMiss`, `yellow`, `yellowred` (vir zapiše yellow +
  yellowred ob isti minuti → 1 rumeni + 1 rdeči), `red`, `subHome`/`subAway`.
  Pri menjavi je navadno prvi, ki vstopi; vnašalci (KFUM Roskilde, DS) ju
  zamenjajo, zato odloči stanje na igrišču (kdor je na igrišču, izstopi).
  Rezerva sme vstopiti in izstopiti; vstop igralca, ki je že na igrišču, je
  opozorilo (napaka vira, ~1 na ligo).
- **Identiteta je ime + klub** (šifer igralcev ni, kot fsb, lff): "Priimek
  Ime" (priimek je zadnja beseda). "Ukendt spiller" (DBU ime skrije —
  persondata) zasede mesto v postavi, nastopa ne dobi; gol takega igralca šteje
  brez strelca.
- **Ekipa brez delitve** (en seznam 12–16 igralcev brez "Reserver", nižje
  lige): če je brez igralcev, ki vstopijo z menjavo, natanko 11, so to
  začetniki (opozorilo); sicer ekipa nima postave in tekma je `nepopoln`.
- Klub: ime s programa; ključ ohrani æ, ø, å, ločila proč ("B.93" = "b93"),
  številka druge ekipe ostane. **Druga ekipa z istim imenom**: DBU obe ekipi
  kluba piše enako — "Holstebro B" je 2026/27 v 3. division (ekipa 6038) in v
  DS pulji 4 (6068), isti klub 255 (logotip). `IME_EKIPE` v viru preimenuje po
  id-ju ekipe (`/resultater/hold/<id>_<pulja>`) v "Holstebro B 2". Id ekipe je
  **stalen čez sezone** (6038 je prva ekipa 2025/26 v DS pulji 4 in 2026/27 v
  3. division, Næstved 109644 obe sezoni). **Varovalo**: vsaka pulja, ki jo
  uvoz bere, mora biti v `DBU_PULJE` (po sezonah, tudi arhivi in pripete
  faze), sicer se uvoz ustavi; uvoz zapisnikov prebere programe vseh pulj iz
  `DBU_PULJE` (sosednje iz predpomnilnika) in se ustavi, če ima isto ime
  (ključ kluba po `IME_EKIPE`) dva id-ja ekipe (`trkiEkip`) — trk reši vpis v
  `IME_EKIPE`. **Nova sezona**: nove pulje najprej v `DBU_PULJE`, nato
  migracija s šiframi.
- Šifra zapisnika v bazi je `dk<številka tekme>`.
- **Predpomnilnik**: v `zaPredpomnilnik` gre le program pulje in stran tekme
  z obema postavama, dogodki in goli = izid. Nepopolna stran zato ob vsakem
  uvozu pride sveža (enkrat na zagon), napaka in izziv nikoli ne gredo v
  predpomnilnik. Goli ≠ izid je 7 dni `nepopoln` (brez `imported_at`), nato
  opozorilo. Stran tekme prve 3 dni vedno sveža.
- Kontumacija: 3:0 / 0:3 brez postav in golov, starejša od tedna
  (`vir.kontumacije`, uvoz razporeda; zavrnitev tam ustavi uvoz — popravek
  `uvoz-razporeda.mjs` je enak kot v vir-comet-lt-me). V 2026/27 je še ni.

**Regijske serije niso vpisane.** Merilo: v vsaj 80 % zapisnikov imata obe
ekipi delitev na začetnike in klop **in** menjave. Vzorec 12 odigranih tekem
na puljo (15. 10. 2026; Sjællandsserien pulja 1 vse tekme):

| vrsta (pulje) | delitev + menjave |
|---|---|
| Sjællandsserien 502542 / 543 / 544 | 37 % (vse 35) / 17 % / 0 % |
| Sjælland Serie 1 502545–548 | 33 %, 8 %, 0 %, 0 % |
| Jyllandsserien 1 502002 / 003 | 0 %, 8 % |
| Jyllandsserien 2 502006 / 004 / 005 | 0 %, 0 %, 8 % |
| Jylland Serie 1 502012, 007–011 | 0 % (delitve ni nikjer) |
| GF Fyn Serien 501649 | 0 % |
| Fyn S1 501650–653 | 0 % |
| Københavnsserien 496311 | 17 % |
| København Serie 1 P1 / P2 496312 / 496317 | 0 % |

Nižje lige večinoma vpišejo en seznam 12–16 igralcev brez klopi, menjave le
redko, pogosto "Ukendt spiller". Sjællandsserien in Jyllandsserien sta poleg
tega razdeljeni na jesen in pomlad (pomladne pulje mešajo jesenske).

Preizkus v živo (15. 10. 2026, vse odigrane tekme, 3 s med zahtevki, brez
baze; DS = Danmarksserien):

| liga | šifra | klubov | krogov | tekem / odigranih | zapisnikov | goli = izid | postav 11 / klop | menjav | 990 minut | delitev + menjave |
|---|---|---|---|---|---|---|---|---|---|---|
| dk-2-division | `508656` | 12 | 22 × 6 | 132 / 66 | 66 | 65/66 | 131/132, 132/132 | 584 | 125/132 | 66/66 |
| — arhiv 2025/26 | `474114+498951+498952` | 12 | 32 (22 + 10) | 192 / 192 | 192 | 192/192 | 384/384, 384/384 | 1641 | 361/384 | 192/192 |
| dk-3-division | `508657` | 12 | 22 × 6 | 132 / 66 | 66 | 66/66 | 132/132, 132/132 | 606 | 127/132 | 66/66 |
| — arhiv 2025/26 | `474115+498953+498954` | 12 | 32 (22 + 10) | 192 / 192 | 192 | 192/192 | 384/384, 384/384 | 1732 | 367/384 | 192/192 |
| dk-danmarksserien-1 | `499766` | 10 | 18 × 5 | 90 / 49 | 49 | 48/49 | 98/98, 98/98 | 407 | 88/98 | 49/49 |
| — arhiv 2025/26 | `473826` (4 skupni) | 10 | 18 × 5 | 90 / 90 | 90 | 90/90 | 180/180, 180/180 | 801 | 169/180 | 89/90 |
| dk-danmarksserien-2 | `499767` | 10 | 18 × 5 | 90 / 50 | 50 | 50/50 | 99/100, 100/100 | 435 | 89/100 | 50/50 |
| — arhiv 2025/26 | `473827` (4 skupni) | 10 | 18 × 5 | 90 / 89 | 89 | 89/89 | 178/178, 178/178 | 767 | 158/178 | 88/89 |
| dk-danmarksserien-3 | `499768` | 10 | 18 × 5 | 90 / 50 | 50 | 50/50 | 99/100, 99/100 | 413 | 88/99 | 48/50 |
| — arhiv 2025/26 | `473828` (6 skupnih) | 10 | 18 × 5 | 90 / 90 | 90 | 90/90 | 179/180, 180/180 | 707 | 157/180 | 89/90 |
| dk-danmarksserien-4 | `499769` | 10 | 18 × 5 | 90 / 50 | 50 | 49/50 | 100/100, 100/100 | 414 | 92/100 | 49/50 |
| — arhiv 2025/26 | `473829` (6 skupnih) | 10 | 18 × 5 | 90 / 90 | 90 | 90/90 | 180/180, 180/180 | 740 | 165/180 | 90/90 |

Noben klub ni dvakrat v krogu, vse menjave imajo minuto, 0 kontumacij.
Odstopanja od 990 minut pojasni rdeči karton ali postava z 10, ostala (1–8 na
ligo) so napake vira z opozorilom (menjava igralca, ki ni na igrišču oz. na
klopi; strelec s klopi brez vstopa). Goli ≠ izid: 3 tekme (avtogol, vpisan
napačni ekipi; manjkajoč gol) — 7 dni `nepopoln`, nato opozorilo. Dres 1 med
začetniki (namig vratarja) ima 58–98 % postav. Skupni klubi DS: 2026/27
pulji 1 in 2 imata po 4 kluba iz 2025/26 pulj 1 in 2 (arhiv 1 → 1, 2 → 2),
pulji 3 in 4 po 6 iz 3 in 4. Trki imen (vse pulje obeh sezon, logotip
`/images/club/<id>/`): le Holstebro B 2 (2026/27) in Næstved 2 ("Næstved
I.F.", DS 2025/26) — v `IME_EKIPE`. **Danmarksserien 4 2025/26 ima prvo ekipo
Holstebro B, 2026/27 pa drugo (Holstebro B 2)** — to **ni mešanje podatkov**
(preverjeno 15. 10. 2026: arhiv DS 4 ima ekipo 6038, isti id kot prva ekipa v
3. division 2026/27). Prva ekipa je napredovala, druga je prišla v DS: igralci
arhiva so v ligi dk-danmarksserien-4 pri klubu Holstebro B (prava prva ekipa,
klub je isti kot v 3. division), in uvoz razporeda jih v DS 4 deaktivira, ker
Holstebro B letos tam ne igra. Kdor je iz prve prešel v drugo ekipo, se po
imenu prestavi k Holstebro B 2 z arhivskimi minutami (res jih je odigral).
Posledica je kot pri vsakem napredovalcu: prva ekipa v **dk-3-division nima
arhiva** (njeni lanski nastopi so v ligi DS 4), zato njeni igralci dobijo
privzeto ceno 4.5, dokler ne naberejo minut.

Uvoz (ena za drugo, brez baze ni bil pognan): `gh workflow run uvoz-lige.yml
-f liga=dk-2-division -f arhiv=474114+498951+498952 -f cene=true`. Liga je
~70 strani tekem po 3 s, arhiv ~190.
