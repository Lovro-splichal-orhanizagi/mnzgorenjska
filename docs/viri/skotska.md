# Škotska — vir `lowland`

**Pisno dovoljenje za zajem: pridobil Lovro, oktober 2026.** Pogoji uporabe
slfl.co.uk (Termageddon, 12. 10. 2026) avtomatsko branje in kopiranje sicer
prepovedujejo; robots.txt zapre le `/wp-admin/`. Dovoljenje **ne pokriva
tehnične zaščite**: ob CAPTCHI, Cloudflarovem izzivu, prijavi ali 401/403/429
se uvoz ustavi (`LowlandZavrnitev`, izhod 4) — ne obhajaj. Zavrne že
`lowlandFetch` (brez ponovitve 429, brez shranjenega razporeda pri 401).

Država `GB` (migracija 20261016090500, ime "United Kingdom" — isto kodo vpiše
tudi vir `isthmian` za Anglijo, kdor je prvi, da ime). **Šifra škotske lige se
začne z `gb-`.** Vmesnik (angleščina), kartica `gb.html`, pošta in `GB` v
matriki nočnega uvoza so pripravljeni (glej `docs/viri/anglija.md`).

Vir `lowland` (`scripts/viri/lowland.mjs`) bere **Match Centre lige**
(slfl.co.uk, WordPress Scoot Digital, podatki COMET škotske zveze — "All data
provided by Comet"), HTML s strežnika. Lowland League je 5. raven (od 2026/27
East in West).

- **Šifra lige je `<tekmovanje>/<LLLL-LLLL>/<skupina COMET>`**
  (`slfl/2026-2027/54193157`). Stran `/match-centre/slfl/2026-2027/` nosi obe
  skupini (`data-mc-competition-panel="comp-<id>"`) in vse tekme sezone:
  "Fixtures" ("vs") in "Results" ("4 : 0"), po dnevih ("Saturday 17 Oct,
  2026"), igrišče, ura ("KO 15:00", **škotski čas → ljubljanski +1 h**),
  oznaka tekmovanja ("Lowland League East 2026-27"; tekma z drugo oznako se
  izpusti) in povezava `/match-centre/slfl/2026-2027/<id tekme COMET>/`.
  Ob novi sezoni se popravi sezona **in** id skupine (novi bloki COMET).
- **Krogov vir ne objavi.** Izpeljemo jih iz šifer tekem (`dodeliKroge`):
  razpored je bil ustvarjen naenkrat po dnevih, zato so šifre strnjen blok
  (East 54383300–54383536, West 54381817–54382087). Krog je zaporedje šifer
  brez ponovljenega kluba (nov krog tudi, ko se sklop dni — Tor–Čet ali
  Pet–Pon — zamenja in ga potrdi naslednja tekma). Šifra se ob prestavitvi ne
  spremeni, zato so številke stalne. Prestavljena tekma gre v krog svojega
  dne, če oba kluba tam nista zasedena (Bo'ness : Lochee 15. 9. in Lochee :
  Bo'ness 18. 11. sta zamenjali kroga); sicer ostane v svojem krogu, razen
  če je prestavljena več krogov prej — takrat gre v krog, ki na njen dan teče
  (klub ima tam dve tekmi), da rok kroga ne pade pred prejšnje kroge. Tekma z
  novo šifro (zveza prestavljeno tekmo izbriše in vpiše znova: Gala : Berwick
  `60152607`) gre v zadnji krog do svojega dne, v katerem nobeden od klubov ne
  igra. Krogi niso uradni "kolo": East ima 31 krogov (5. z dvema tekmama — dan
  pokala), West 35 (17 klubov, prost klub vsak krog).
  **Tveganje**: če zveza izbriše **cel prihodnji krog** (vse tekme dneva) in
  ga vpiše z novimi šiframi, se krogi za njim preštevilčijo. Zgodilo se še ni;
  ob padcu števila krogov (East 31, West 35) preveri razpored pred uvozom.
- **Stran tekme** nima datuma (pride s strani lige). Postavi "Starting XI" in
  "Substitutes" (dres, "C. Armour", "(c)" kapetan). **Vratar ni označen** —
  COMET ga našteje prvega (preverjeno: brez dresa 1 je prvi 25, 24, 12, 22 …),
  zato ima prvi začetnik `vratar` kot namig (kot ffm, mlsz); *Uskladi pozicije*
  z `vir = lowland`. Dogodki v stolpcu ekipe (`event home`/`event away`) z
  minuto ("90+1'" → 90): `goal`, `penalty` (gol z 11 m), `own-goal` (v
  stolpcu ekipe **strelca**, šteje nasprotniku — goli = izid to potrdi),
  `penalty-failed` (zgrešena 11-m), `yellow`, `second-yellow` (prvi rumeni je
  svoj dogodek → 1 rumeni + 1 rdeči), `red`, `expulsion` in rumeni **brez
  imena** (osebje — ne štejeta), `SUBSTITUTION` (prvi noter, drugi ven —
  **minute so točne**).
- **Identiteta je ime + klub** (šifer igralcev ni, kot fsb, ffm). Ime je
  "Priimek I." iz postave ("C. Armour" → "Armour C."; ime samo z malimi ali
  velikimi črkami se poenoti). Dogodki pišejo "PRIIMEK Ime" — igralca najdemo
  po priimku in začetnici (tudi "LINTON JAMES", "DOS SANTOS Tuacenio").
  Dva igralca z istim imenom v ekipi sta opozorilo.
- Klub: ime s strani lige (zapisnik ga vzame od tam), brez pripone "1st Team"
  ("Bonnyrigg Rose Athletic 1st Team"); ključ z "&" = "and", brez ločil.
  Celtic B Team je rezervna ekipa Celtica in je član lige.
- Šifra zapisnika v bazi je `sc<id>` (šifre COMET so v prostoru hns, fss, ffm).
- **Predpomnilnik**: v `zaPredpomnilnik` gre le stran lige z Match Centrom in
  stran tekme z obema postavama in z goli = izid. Vzdrževalna stran, izziv in
  zapisnik, ki se še dopolnjuje, se berejo znova; goli, ki se z izidom ne
  ujemajo, so 7 dni `nepopoln` (brez `imported_at`), nato opozorilo. Stran
  tekme prve 3 dni vedno sveža. Tekma z izidom, ki vrne 404, se preskoči.
- Kontumacija: 3:0 / 0:3 brez postav in dogodkov, starejša od tedna
  (`vir.kontumacije`); v sezoni 2026/27 je še ni bilo. Prestavljena tekma brez
  novega datuma iz seznama izgine (East: Bonnyrigg : Dunipace, Brechin :
  Cowdenbeath; West: Cumbernauld : Clydebank); prekinjene še nismo videli.
- **Arhiva ni**: stran je nova, `/match-centre/slfl/2025-2026/` vrne 404 —
  cene le iz tekoče sezone (oktobra ~11 odigranih krogov).
- Ista stran nosi še Lowland League Cup (pokal — ne) in SLDFL (razvojna liga
  rezervnih ekip — ne). Highland League (highlandfootballleague.com, SFG
  Software) ima le izide in drug upravljavec, North of Scotland in EoSFL/WoSFL
  imajo robots `Disallow: /` — dovoljenje za SLFL jih ne pokriva.

Preizkus v živo (15. 10. 2026, vse odigrane tekme, 3,5 s med zahtevki, brez
baze):

| liga | tekoča 2026/27 | klubov | tekem | krogov | zapisnikov | goli = izid | postav po 11 | menjav (vse z minuto) | 990 minut |
|---|---|---|---|---|---|---|---|---|---|
| gb-lowland-east | `slfl/2026-2027/54193157` | 16 | 238 | 31 | 77/77 | 77/77 | 154/154 | 598 | 139/154, ostalih 15 pojasni rdeči karton |
| gb-lowland-west | `slfl/2026-2027/54193424` | 17 | 271 | 35 | 88/88 | 88/88 | 176/176 | 705 | 159/176, ostalih 17 pojasni rdeči karton |

0 opozoril, 0 nepopolnih; 12 avtogolov, 61 golov z 11 m, 41 izključitev.
Vratar (prvi začetnik) v vseh 330 postavah.

Uvoz (ena za drugo, **brez arhiva**): `gh workflow run uvoz-lige.yml -f
liga=gb-lowland-east -f cene=true`. Liga je ~80–90 strani tekem po 3 s.
