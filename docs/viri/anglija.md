# Anglija — vir `ncefl`

Država `GB` ("England"; vpišeta jo ta migracija in migracija lig `isthmian`,
obe z `on conflict do nothing`). **Šifra angleške lige se začne z `gb-`.**
Vmesnika v angleščini za državo, kartice in pošte še ni (`JEZIK_DRZAVE.GB`),
`GB` ni v matriki nočnega uvoza — oboje pred vklopom.

Vir `ncefl` (`scripts/viri/ncefl.mjs`) bere **Northern Counties East Football
League** (NCEL, step 5–6) z lastne strani lige www.ncefl.org.uk — HTML s
strežnika, brez izziva. robots.txt vrne 404 (pravil ni), pogojev uporabe
stran nima. **Lastnik ima dovoljenje lige.** Beremo odkrito (`User-Agent:
SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih zapisnikov
ne beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi** —
`NceflZavrnitev` že v `vir.fetch` (brez ponovitve in mimo shranjenega
razporeda), izhod 4. Ne obhajaj.

- **Šifra lige je `<divizija>/<leto>`** (`ncelpremierdivision/2026` =
  2026/27), kot v naslovu strani divizije `/matches/<divizija>/<leto>/`.
  Ob novi sezoni se popravi le leto; arhiv je isto z lanskim letom. Stran
  preveri, da je v izbirniku sezone izbrana prav ta pot.
- **Stran divizije** nosi vse tekme sezone po dnevih (`mddate`): odigrane z
  izidom ("2-1", "Att", "HT") in povezavo na zapisnik (`mdteamsheet` →
  `/matches/day/<LLLL>/<LLLLMMDD>/<id>/`), prihodnje z uro ("3:00pm",
  angleški čas → ljubljanski +1 h). Odigrane nimajo ure.
- **Krogov stran ne pozna** (ne stran divizije ne zapisnik). Krog je zato
  **teden** (ponedeljek–nedelja), štet od tedna zadnje julijske sobote
  (`krogIzDatuma`: 2026/27 od 20. 7. 2026, sobota 25. 7. je 1. krog, torek
  28. 7. 2. krog). Številka ne zavisi od drugih tekem, zato prestavitev ne
  preštevilči ostalih. Klub ima lahko v krogu dve tekmi (torek in sobota, kot
  "double gameweek") ali nobene; v sezoni so tedni brez tekem (vrzel v
  številkah, npr. Premier 2026/27: 36 krogov od 1 do 37). Borza gleda
  prejšnji krog po številki — za tednom brez tekem ga ni.
- **Prestavljena tekma zamenja krog.** Vir ima `krogiPoTednih: true`; uvoz
  razporeda tekmo istega para (domači:gostje igra v sezoni enkrat) iz drugega
  kroga **premakne** (`tekmaDrugegaKroga` v `razpored.mjs`), namesto da bi
  nastala druga vrstica, in pobriše neuvoženo dvojnico para, ki jo je pustil
  uvoz zapisnikov (`odvecneVrsticePara`). Krog, iz katerega so odšle vse
  tekme, ostane prazen (zaklene se brez točk).
- **Posebne vrstice**: "A-A" je prekinjena tekma — s pripisom "… points
  awarded …" (`mdcomments`) je kontumacija brez izida, sicer čaka ponovitev
  (neodigrana, `vir_brez_izida`). Izid brez zapisnika s pripisom "unable to
  field a team - 2-0 win awarded" je kontumacija z izidom (brez pripisa, a z
  `mdnoinfo`, šele po tednu dni). Odigrana tekma brez zapisnika (2023/24 trije
  primeri) ostane neuvožena. Izstopljen klub ("record expunged following
  their resignation", Doncaster City 15. 9. 2026) s strani izgine z vsemi
  tekmami — uvoz razporeda zato zahteva `--dovoli-manj-klubov`.
- **Zapisnik**: glava z izidom, polčasom in strelci po imenu z minuto
  ("41, 71", "82pen", "45og" — avtogol stoji pri ekipi, ki ji gol šteje, z
  imenom nasprotnika; "Unknown" = brez strelca); nato "<klub> starting
  line-up" in "Substitutes" obeh ekip. Igralec: dres, ime ("Ime Priimek" →
  "Priimek Ime"), goli (`Ball20.png` + število), karton (`yellowcard`,
  `yellowredcard` = drugi rumeni → 1 rumeni + 1 rdeči, `redcard`), menjava
  (`down.gif NN` izstop, `up.gif NN` vstop) — **minute menjav so točne,
  kartoni so brez minute** (izključeni igra do konca ali izstopa, ekipa ima
  990). Goli: število po igralcu iz glave, sicer iz ikon; strelec glave, ki ga
  ni v postavi, je gol ekipe brez strelca. Šifer igralcev ni (ime + klub kot
  fss/lff), vratar ni označen — začetnik z dresom 1 dobi `vratar` kot namig
  (*Uskladi pozicije* vira še ne pozna).
- **Šifra zapisnika v bazi je `ncel<id>`** (`sifraZapisnika`).
- **Predpomnilnik** (`vir.zaPredpomnilnik`): le stran divizije s tekmami ali
  zapisnik s postavo; stran vzdrževanja ne. Zapisnik zadnjega tedna se bere
  sveže, do 45 dni še enkrat sveže, če iz predpomnilnika nima postav ali se
  goli ne ujemajo z izidom (`zapisnikSvez`); goli mimo izida so prvih 7 dni
  `nepopoln` (brez `imported_at`, bere se znova).

Vpisani ligi (migracija 20261015230300, **neaktivni**), zveza `ncefl`:

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|---|
| gb-ncel-premier | 20 | `ncelpremierdivision/2026` | `ncelpremierdivision/2025` (380 tekem, vse z zapisnikom) |
| gb-ncel-division-one | 21 | `nceldivisionone/2026` | `nceldivisionone/2025` (462, vse z zapisnikom) |

Preizkus v živo (15. 10. 2026, po poti uvoza brez baze, 3,5 s med zahtevki):
Premier 2026/27 — 380 tekem (20 klubov, 36 tednov), 134 odigranih, vseh 134
zapisnikov razčlenjenih, goli = izid 134/134, postav po 11 268/268, 990
minut 267/268, 930 menjav z minuto, 20 rdečih; Division One 2026/27 — 420
tekem (21 klubov), 153 zapisnikov, goli = izid 153/153, postav po 11 306/306,
990 minut 303/306, 1109 menjav. Odstopanja so napake vira: rezerva z vstopom
brez para (Selby Town) in strelec s klopi brez vstopa (dobi nastop od gola).
Arhiv 2025/26 (vzorec vsake 8. tekme): Premier 48/48 goli = izid, 96/96 po
11 in 990 minut; Division One 57/58 (56246: v glavi 4 goli gostov, izid 1:3).

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=gb-ncel-premier
-f arhiv=ncelpremierdivision/2025 -f cene=true`. Arhiv 380 zapisnikov po 3 s
je okoli 20 minut na ligo.

## Anglija — vir `isthmian`

Država `GB` ("England", migracija 20261016091700): koda ISO 3166-1, ker
`GB-ENG` (ISO 3166-2) z vezajem podre pravilo "šifra lige se začne s kodo
države" in ker IP iz Anglije pove `GB`. **Šifra angleške lige se začne z
`gb-`.** Vmesnika v angleščini za državo, kartice in pošte **še ni**
(`JEZIK_DRZAVE.GB` ni vpisan), `GB` ni v matriki nočnega uvoza — oboje pred
vklopom.

Vir `isthmian` (`scripts/viri/isthmian.mjs`) bere step 3–4 angleške piramide:
**Isthmian League, Northern Premier League (NPL) in Southern League (SFL)**,
po štiri divizije. Vse tri tečejo na isti platformi (Streamline Content):
stran lige (www.isthmian.co.uk, www.thenpl.co.uk,
www.southern-football-league.co.uk) bere **javni JSON** z
`api.<domena>/matches` in pošlje glavo `x-tenant-id: isthmian | npl | sfl` —
brez ključa in prijave, isto kot brskalnik obiskovalca. Glava, ne gostitelj,
izbere ligo (brez nje 400, z napačno prazen seznam); vir jo doda po
gostitelju API-ja (`vir.fetch` → `isthmianFetch`).

- **Šifra lige je `<tenant>/<tekmovanje>/<LLLL-LL>`**
  (`npl/67d7c7bb74247876e6dae40c/2026-27`). Tekmovanje (24 hex) je **stalno
  čez sezone**; sezono izbere `period=Custom&startDate=<L>-07-01&endDate=<L+1>-06-30`
  (brez `period=Custom` API datum prezre in vrne obe sezoni). **Ob novi sezoni
  se popravi le sezona v šifri.** Seznam tekmovanj (tudi pokalov) vrne
  `GET /competitions`.
- **Seznam je zapisnik**: `GET /matches?competition=<id>&limit=100&page=<n>&sort=asc&…`
  vrne vse tekme sezone (~5 strani po 100, vsakič sveže) in v vsaki že vse:
  `homeLineup`/`awayLineup` (`personId` UUID → `reg_st` kot pri hlf, dres,
  `isCaptain`, `hasStartedMatch` = začetnik, `position` — skoraj vedno le
  "GK" pri vratarju), `homeSubs` (minuta, `personOffId`, `personOnId` —
  **minute so točne**, rezerva lahko gre noter in ven), `homeGoals`
  (`goalType` normal | penalty | own-goal), `homeCards` (first_yellow_card,
  second_yellow_card → 1 rumeni + rdeči, red_card). Minute nad 90 → 90.
  Posebne strani zapisnika ni; povezava je `www.<domena>/match/<id>`.
- **Avtogol** je v golih ekipe, ki ji šteje, s strelcem "N/A" in
  `own-goal`. Strelec "N/A" pri `normal` je gol ekipe brez strelca (~1 na 30
  tekem). "N/A" na klopi ni igralec. Gol, vpisan igralcu nasprotne ekipe, vir
  šteje kot avtogol tega igralca (v podatkih še ni bil viden).
- **Krog je "Match N"** (`round.name`): reža zvezinega razporeda, v kateri
  igra vsak klub enkrat (11 tekem pri 22 klubih). Tekma, prestavljena naprej
  ali nazaj, ostane v svoji reži — v ~11 % krogov 2026/27 je tekma odigrana
  **več kot tri dni pred** glavnim datumom kroga (do več mesecev), zato bi
  rok tak krog zaklenil zgodaj (rok = najzgodnejša tekma). **Pred vklopom
  preveri roke krogov.** Prekinjena tekma (`Abandoned`) s ponovitvijo v
  istem krogu se izpusti; brez ponovitve ostane neodigrana. `Postponed` je
  neodigrana (datum lahko ostane star).
- **Čas**: `date` in `time` sta londonska (`dateTime` z "Z" je isti čas,
  napačno označen); Ljubljana = London + 1 h. Sezona avgust–maj.
- Šifra zapisnika v bazi je `gb<id>`. Identiteta igralca je šifra osebe;
  ime "Ime Priimek" → "Priimek Ime". Klub: `homeTeamName`, ključ z "&" =
  "and", kratko ime iz `club.shortName` ("AFC Whyteleafe" → "Whyteleafe").
- Kontumacije v podatkih še ni bilo; vir jo prepozna kot 3:0 / 0:3 brez
  obeh postav, starejšo od tedna (ali stanje "Awarded"/"Walkover").
- `ravenLige`: Premier Division vseh treh lig (step 3) nad ostalimi (step 4).
  *Uskladi pozicije* z `vir = isthmian` (vratar po večini tekem).

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** `robots.txt` na
straneh ni (vrne aplikacijo s 200), na API-ju vrne 400 ("X-TENANT-ID not
provided") — nič ni prepovedano, pravil za AI-robote ni. Pogojev uporabe s
prepovedjo branja nismo našli (stran pogojev bere API s prijavo); noga
"© … All rights reserved". **Vljudnostni mail vsem trem ligam je
priporočljiv.** Beremo odkrito (`User-Agent: SLFF fantasy (https://slff.eu)`,
**3 s** med zahtevki, ena liga ~5 zahtevkov na uvoz). **Ob 401, 403, 429 ali
izzivu se uvoz ustavi (`IsthmianZavrnitev`, izhod 4) — ne obhajaj.** Zavrne
že `isthmianFetch` (brez ponovitve 429 in brez shranjenega razporeda pri 401);
v predpomnilnik gre le seznam tekem (`zaPredpomnilnik`). API ni
dokumentiran in se lahko spremeni brez opozorila.

Preizkus v živo (15. 10. 2026, vse strani vseh 12 lig, brez baze):

| liga | tekoča 2026/27 | tekem | zapisnikov | goli / izidi | postav po 11 | menjav | arhiv 2025/26 |
|---|---|---|---|---|---|---|---|
| gb-isthmian-premier | `isthmian/67d7d01f749090308acc101e/2026-27` | 462 | 118 | 392/394 | 236/236 | 948 | `…/2025-26`: 462 zap., goli = izid, 924/924 |
| gb-isthmian-north | `isthmian/67d7d0c1749090308acc1021/2026-27` | 462 | 115 | 393/393 | 230/230 | 873 | `…/2025-26`: 462, 924/924 |
| gb-isthmian-south-central | `isthmian/67d7d11a749090308acc1022/2026-27` | 462 | 109 | 382/382 | 218/218 | 895 | `…/2025-26`: 462, 924/924 |
| gb-isthmian-south-east | `isthmian/67d7d187749090308acc1023/2026-27` | 462 | 108 | 386/386 | 216/216 | 849 | `…/2025-26`: 462, 924/924 |
| gb-npl-premier | `npl/67d7c7bb74247876e6dae40a/2026-27` | 462 | 142 | 465/465 | 284/284 | 1086 | `…/2025-26`: 420, 840/840 |
| gb-npl-east | `npl/67d7c7bb74247876e6dae40b/2026-27` | 462 | 139 | 384/384 | 278/278 | 1056 | `…/2025-26`: 462, 924/924 |
| gb-npl-west | `npl/67d7c7bb74247876e6dae40d/2026-27` | 462 | 138 | 458/460 | 276/276 | 1015 | `…/2025-26`: 462, 924/924 |
| gb-npl-midlands | `npl/67d7c7bb74247876e6dae40c/2026-27` | 462 | 134 | 419/419 | 268/268 | 1012 | `…/2025-26`: 462, 924/924 |
| gb-sfl-premier-south | `sfl/69d0bd99b616bafb97331d3f/2026-27` | 462 | 118 | 374/374 | 236/236 | 893 | **ni uporaben** |
| gb-sfl-premier-central | `sfl/69d0bdbab616bafb97331d40/2026-27` | 462 | 119 | 348/348 | 238/238 | 898 | **ni uporaben** |
| gb-sfl-d1-south | `sfl/69d0bdf9b616bafb97331d41/2026-27` | 462 | 114 | 340/340 | 228/228 | 834 | **ni uporaben** |
| gb-sfl-d1-central | `sfl/69d0be24b616bafb97331d42/2026-27` | 462 | 106 | 368/368 | 212/212 | 798 | **ni uporaben** |

Vratar (GK) je v vsaki postavi natanko eden. Neujemanja golov so tekme
prejšnjega večera (zapisnik se še dopolnjuje): taka tekma je do 7 dni
`nepopoln` (brez `imported_at`, nočni uvoz jo bere znova), nato gre skozi z
opozorilom. Sicer bi jo `--sveze 21` po prvem uvozu preskočil, ker ima krog
"Match N" datum najzgodnejše tekme reže. **Arhiv SFL 2025/26 ni
uporaben**: tekmovanja so bila za 2026/27 prenesena na platformo, lanski
podatki imajo ekipe "P"/"p", 16 "začetnikov" in večino tekem brez postav
(Premier South 135 zapisnikov, goli = izid 26) — SFL dobi cene le iz tekoče
sezone. Starejše sezone (od 2018) so po raziskavi brez menjav — ne uvažaj.

Uvoz (ena za drugo, **šele po vljudnostnem mailu ligam**): `gh workflow run
uvoz-lige.yml -f liga=gb-isthmian-premier -f
arhiv=isthmian/67d7d01f749090308acc101e/2025-26 -f cene=true`; SFL brez
`arhiv`. Liga je ~10 zahtevkov po 3 s.
