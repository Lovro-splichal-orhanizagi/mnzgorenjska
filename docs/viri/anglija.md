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
