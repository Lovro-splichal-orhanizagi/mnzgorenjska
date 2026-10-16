# Gruzija — vir `gff`

Vir `gff` (`scripts/viri/gff.mjs`) bere **liga.gff.ge** (GFF, Drupal, izdelal
Omedia), kjer GFF objavi **Liga 3 in Liga 4** (raven 3 in 4, po 16 klubov,
30 krogov). Nižje (regionalne lige na gff.ge) imajo le izide — fantasy ni
mogoč. HTML iz strežnika, brez izziva in prijave; stran je le v gruzinščini.
Država `GE` ("საქართველო", vpiše jo migracija lig); vmesnika v gruzinščini,
kartice in pošte **še ni** in `GE` **ni** v `JEZIK_DRZAVE` ne v matriki
nočnega uvoza — oboje pred vklopom. Šifra lige se začne z `ge-`.

- **Sezona je koledarsko leto** (marec–november/december,
  `sezona_koledarska`): oznaka `"2026"`. Leto pove izbirnik sezone na strani.
- **Šifra lige je `<sezona>/<liga>`**: id sezone iz izbirnika (44 = 2026,
  41 = 2025, 38 = 2024, 34 = 2023, 30 = 2022, 18 = 2021, 11 = 2020, 7 = 2019,
  6 = 2018, 29 = 2017 — ni letnica in ni enakomeren) in id lige (3 = Liga 3,
  4 = Liga 4, 5 = play-off; 2020–2021 je bila Liga 4 v skupinah 14/15 in
  23/24). Ob novi sezoni se popravi le prvi del. Stran z neznanim id-jem tiho
  pokaže privzeto ligo — vir preveri izbrano povezavo in se ustavi.
- **Razpored** sta dve strani: `/results?season=<s>&league=<l>` (odigrane:
  krog "ტური N", dan "ხუთშაბათი, 8 ოქტომბერი" brez leta in ure, izid) in
  `/calendar?season=…` (neodigrane z uro). **Tbilisijski čas (UTC+4, brez
  poletnega) → ljubljanski** (`vLjubljanskiCas`, −2 h poleti, −3 h pozimi).
- **Zapisnik** `/game/<nid>-<slug>` (nid = id objave Drupal; šifra v bazi
  `ge<nid>`): glava (`<time datetime>`, izid, "ლიგა 4 / სეზონი 2026 / ტური
  23"), postavi kot **prosto besedilo urejevalnika** (`gf-line-up-1/2`:
  "12. ime priimek", kapetan `badge-c`, klop za "სათადარიგო
  შემადგენლობა", trener za "მთავარი მწვრთნელი" — ga ne beremo) in dogodki
  kot JSON v `data-events`: `goal`, `goal_p` (11 m), `goal_auto` (avtogol —
  vpisan na strani ekipe, ki ji šteje; strelec je v nasprotni), `penalty_miss`,
  `yellow_card`, `yellow_red_card` (drugi rumeni; prvi je svoj dogodek →
  1 rumeni + 1 rdeči), `red_card`, `substitution` ("noter / ven"), minute
  ≥ 200 so 11 m po tekmi (ne štejejo). Polčasa stran ne pove. Sodnikov in
  kaznovanih (zavihek tekme) ne beremo; vzorci `ge-gff-*` so brez njih.
- **Identiteta: ime + klub** (kot fss, lff), šifer igralcev ni. Ime je v
  gruzinski pisavi, kot ga piše zveza ("ხარშილაძე ოთარ", Priimek Ime);
  prečrkovanja ne delamo. Dogodek se z igralcem ujame po `text_ka` (natančno
  ime), sicer po edinem priimku, sicer po edinem imenu z največ dvema
  drugačnima znakoma (tipkarska napaka "მაღალდაძემ"); pripis v oklepaju
  ("(სათადარიგო სკამიდან)" = s klopi) odpade.
- **Vratar ni označen**: prvi začetnik je (kot pri COMET) vratar — namig, kot
  mlsz in ffm; v 70 pregledanih postavah je imel prvi dres 1 ali 12 v 44,
  v ostalih 26 je stal izven vrstnega reda dresov (16, 33, 25 …). *Uskladi
  pozicije* z `vir = gff`.
- **Napake vira**: obrnjen vnos menjave ("začetnik / rezerva", 4605) vir
  zamenja z opozorilom; igralec, ki gre ven dvakrat (4781), je opozorilo
  (ekipa ima čez 990 minut).
- **Kontumacija**: 3:0 / 0:3 s stranjo brez postav, starejša od tedna
  (`vir.kontumacije`). V pregledu 21 tekem 3:0 / 0:3 (2025, 2026) take ni bilo.
- Klubi: druge ekipe ("სამგურალი 2", "კოლხეთი 1913-2") so svoj klub; ključ
  ohrani števke.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt: en blok
`User-agent: *` s **`Crawl-delay: 10`**, prepoveduje le sistemske poti
Drupala (`/admin/`, `/user/…`, `/search/`, `/includes/` …); `/results`,
`/calendar` in `/game/` so dovoljene. Pogojev uporabe nismo našli; noga
"© საქართველოს ფეხბურთის ფედერაცია". Dovoljenja GFF še nimamo. Beremo
odkrito (`User-Agent: SLFF fantasy (https://slff.eu)`, **10 s** med zahtevki,
zapisnikov, starejših od tedna, ne beremo znova). Živega vira (websocket
`liga-ws.gff.ge`) ne uporabljamo. **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz
ustavi — ne obhajaj** (`GffZavrnitev`, izhod 4). Če nas GFF prosi, naj
nehamo, `ge-` lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo; 36 strani tekem po 11 s,
od tega ena neodigrana):
razpored 2026 obeh lig 30 krogov po 8 tekem (184 odigranih, 56 v koledarju z
uro), 16 klubov; arhiv 2025 obeh lig 240 odigranih tekem, 30 krogov. Liga 3
2026: 13 zapisnikov, 45 golov (= izid 13/13), postav po 11 26/26, 120
menjav, 990 minut 26/26. Liga 4 2026: 16 zapisnikov, 52 golov (= izid 16/16),
postav po 11 32/32, 136 menjav, 990 minut 28/32 (trije rdeči kartoni, en
dvojni izstop). Arhiv 2025: Liga 3 in Liga 4 po 3 zapisnike, goli = izid,
postave 6/6 po 11, 23 in 21 menjav.

Vpisani ligi (migracija 20261016092300), **neaktivni**, zveza `gff`. Sezona
2026 je ob vpisu pri 23. od 30 krogov — vklop bo realno za 2027. Arhiv ima
vsak ena sama liga; Liga 3 2026 ima 9 klubov lanske Lige 3 in 3 lanske Lige 4.

| liga | klubov | tekoča 2026 | arhiv 2025 | arhiv 2024 |
|---|---|---|---|---|
| ge-liga-3 | 16 | `44/3` | `41/3` | `38/3` (nepreštet) |
| ge-liga-4 | 16 | `44/4` | `41/4` | `38/4` (nepreštet) |

Uvoz (ena za drugo, ~10 s na zapisnik — arhiv 240 zapisnikov je ~40 minut):
`gh workflow run uvoz-lige.yml -f liga=ge-liga-3 -f arhiv=41/3 -f cene=true`.
