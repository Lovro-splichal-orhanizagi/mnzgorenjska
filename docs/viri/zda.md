# ZDA — vir `modular11` (USL League Two)

**Prvi vir zunaj Evrope.** Lige so vpisane neaktivne; ali SLFF sploh gre v
ZDA (časovni pasovi, angleški vmesnik brez vstopne strani `/us`, kartice,
pošte in ugiba države), odloči lastnik pred vklopom. Država `US` ("United
States", migracija 20261015171500), zveza `usl`, šifra lige se začne z
`us-`. Vmesnik bi bil angleški (`en` obstaja); `US` še **ni** v
`JEZIK_DRZAVE`, `DRZAVE` (`src/lib/drzavaUgib.ts`), matriki nočnega uvoza,
*Hisne ekipe* in *Uskladi pozicije* — vse to pred vklopom.

Vir `modular11` (`scripts/viri/modular11.mjs`) bere **Modular11**, sistem, v
katerem USL vodi League Two (amaterska 4. raven, maj–avgust);
uslleaguetwo.com ga vgradi (iframe `modular11.com/league-schedule/league-two`).
robots.txt modular11.com ne obstaja (404), robots.txt uslleaguetwo.com
`/league-schedule` ne zapira; pogojev uporabe za javni razpored ni (le
politika zasebnosti). Dovoljenja USL nimamo. Beremo odkrito (`User-Agent:
SLFF fantasy (https://slff.eu)`, **3 s** med zahtevki, popolnih zapisnikov ne
beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi
(`Modular11Zavrnitev`, izhod 4) — ne obhajaj.** Javni JS strani ima ključ
Google Maps — **ne uporabljamo ga** (in nobenega drugega ključa iz njihove kode).

- **Sezona je koledarsko leto** (`sezona_koledarska`, oznaka `"2026"`).
- **Šifra lige je `<turnir>/<divizija>/<leto>`** (`24/52/2026` = Southwest
  2026): turnir 24 je League Two, divizija id iz izbirnika "Division", leto
  omeji razpon datumov seznama.
- **Razpored** je navaden GET
  `/public_schedule/league/get_matches?tournament=24&start_date=<leto>-01-01 00:00:00&end_date=<leto>-12-31 23:59:59&match_type=2&groups=<divizija>&open_page=<n>`
  (HTML, 25 tekem na stran, "1 page out of 3"; `open_page` šteje od 1, datum
  mora imeti uro, sicer "Date is invalid."). Vrstica: id tekme, lokalni datum in
  ura ("06/01/26 07:00pm"), prizorišče, divizija (`js-match-group`), del
  (`js-match-bracket` "League" ali "Playoffs" — **končnice ne beremo**), klub z
  id-jem ekipe, izid. Stran napake ne gre v predpomnilnik (`zaPredpomnilnik`).
- **Krogov ni** (`js-match-round` je vedno 1): **krog je teden** (pon–ned po
  lokalnem datumu), štet od **stalnega začetka**: teden 1. maja v letu šifre
  (`krogIzDatuma`, `zacetekSezone`; 2026 od pon 27. 4.). Številka ne zavisi od
  drugih tekem — prej je štela od prve tekme divizije in prestavljena prva
  tekma bi premaknila vse kroge (tekme, roki in posnetki postav zaklenjenih
  krogov bi pristali v drugih krogih). Divizija, ki začne pozneje, ima prvi
  krog 2–4 (Southwest 2026: 3); tekma pred 1. majem je krog 1 (najzgodnejša
  tekma 2025 in 2026 je bila 3. 5.). Prazen teden preskoči številko. Ekipa ima
  lahko v tednu dve tekmi (sobota + torek) — dvojni krog kot v FPL (točke krogov
  se seštejejo). **Isti par domači : gostje igra v sezoni lahko dvakrat** (vse
  divizije s 6 klubi, 2026 po šest parov), zato vir NI `krogiPoTednih` (ncefl).
  Celo v **istem tednu** (Mountain 2025: Utah United : Colorado Storm, četrtek
  in sobota): tekma je v bazi enolična po (krog, domači, gostje), zato gre
  poznejša v naslednji krog (`tekmeLige`).
  **Prestavljena tekma** (v drug teden) dobi nov krog; `razporedCel` pove uvozu
  razporeda, da staro neuvoženo vrstico odstrani v vsakem krogu sezone, ne le
  v polnih (sicer bi ostala "ni uvožena" in borza bi čakala nanjo).
- **Zapisnik** `/match_details/<id>/2`: strežnik v skripto vpiše JSON
  `'match'` (glava, prizorišče s pasom, formaciji, polčasa), `'details'`
  (goli z minuto in `ownGoal`, opomini, izključitve, menjave z minuto) in
  `'members'` (igralci: dres, stalna šifra `UID` → `reg_st`, `position` 1–11
  začetniki po formaciji, 0 klop). Mesto 1 je vratar; ostale pozicije iz
  formacije (`4 3 3` → prva vrsta DEF, zadnja FWD, vmes MID) — vnese jih klub,
  zato so namig kot pri `jalgpall`. Rezerva, ki zamenja vratarja, je vratar.
  Asistenco pri golu prezremo (asistence določi glasovanje). Gol: `UID_team`
  je ekipa, **ki ji gol šteje** — pri avtogolu nasprotnik strelca; strelec
  avtogola pogosto manjka (`UID_player` 0), gol ostane brez strelca.
  Minute nad 90 (podaljšek) se odrežejo, `minute_add` prezremo.
- **Ne beremo in ne hranimo**: datuma rojstva in letnika (`birthdate`,
  `birthYear`), šole (`university`, `hs_grad_date`), slik, osebja (`staffs`),
  sodnikov (`referees`), PDF-jev. `members` vse to vsebuje — vir vzame le dres,
  ime, šifro in mesto (`igralec()`), vzorci `scripts/vzorci/us-m11-*` so
  počiščeni (repo je javen).
- **Mladoletni**: v League Two igrajo tudi 17- in 18-letniki (dijaki pred
  kolidžem). Veljajo ista pravila kot pri mladinskih ligah drugod: ime skrijemo
  na ugovor igralca ali zveze (`anonimiziraj_igralca`, Administracija →
  Igralec, obvestilo na `/legal`), letnika ne hranimo.
- **Čas**: Modular11 piše **lokalni čas prizorišča**. Zapisnik pove pas
  (`field.timezone_name`, npr. `America/Phoenix` — Arizona brez poletnega
  časa); razpored ga ne, zato velja pas domačega kluba (`PAS_KLUBA`) ali
  divizije (`PAS_DIVIZIJE`, oba iz zapisnikov 2026, izpiše ju
  `zda-lige.mjs --pasovi`). `vLjubljano` pretvori v ljubljanski čas s poletnim
  časom obeh krajev (19:00 v New Yorku = 01:00 naslednji dan, v Phoenixu
  04:00) — **tudi datum**; vse tekme so v Ljubljani ponoči. Prizorišče brez
  pasu dobi pas iz razporeda; neujemanje pasov je opozorilo. Rok kroga je
  `rok_pomak_ur = 6` ur pred prvo tekmo (popoldne po vzhodnem času).
- **Kontumacija** (forfeit): opomba "Forfeit in favor of …" ali izid iz samih
  avtogolov brez strelca v 1. minuti brez menjav (Seacoast United : Black Rock
  3:0, 28. 6. 2026). Zapisnik vrne null; razpored jo označi (`kontumacije`,
  tekme 3:0 / 0:3, starejše od tedna).
- **Nepopoln zapisnik** (`z.nepopoln`, prvo opozorilo `zapisnik nepopoln`,
  kot `frf`): ekipa brez natanko 11 začetnikov, goli iz dogodkov ≠ izid, ekipa
  brez menjave z minuto, navaden gol brez strelca ali same minute ≤ 1 (obrazec
  brez minut). Tekoča sezona: izid in nastopi se zapišejo, `imported_at` ostane
  prazen, vir ga 45 dni bere svežega (`zapisnikSvez`); arhiva nepopolnih ne
  uvažamo. Menjava, v kateri gre ven igralec, ki ni na igrišču, je le opozorilo.

**Preverba 2026** (15. 10. 2026, vsi zapisniki, 1005 tekem lige v 20
divizijah, 1062 zahtevkov po 3,5 s; `node scripts/zda-lige.mjs --vse --mapa …`).
Popoln = 11 + 11, goli = izid, menjave z minuto pri obeh ekipah, zaključen;
odigranih vključuje kontumacije (7, vse 3:0). Merilo za vpis je ≥ 80 %
popolnih — dosežejo ga **vse** divizije, zato je vpisanih vseh 20:

| liga | id | klubov | odigranih | zapisnikov | popolnih | % | 11+11 | goli = izid | menjave | 990 minut |
|---|---|---|---|---|---|---|---|---|---|---|
| us-usl2-chesapeake | 158 | 11 | 77 | 77 | 73 | 95 % | 75 | 77 | 76 | 57 |
| us-usl2-great-forest | 188 | 7 | 42 | 42 | 41 | 98 % | 42 | 42 | 42 | 36 |
| us-usl2-great-lakes | 160 | 7 | 42 | 41 | 38 | 90 % | 39 | 41 | 41 | 25 |
| us-usl2-great-plains | 206 | 6 | 36 | 36 | 35 | 97 % | 35 | 36 | 35 | 24 |
| us-usl2-heartland | 51 | 9 | 54 | 52 | 50 | 93 % | 52 | 52 | 50 | 41 |
| us-usl2-lone-star | 161 | 9 | 54 | 54 | 47 | 87 % | 53 | 53 | 50 | 38 |
| us-usl2-metropolitan | 162 | 10 | 60 | 60 | 55 | 92 % | 58 | 60 | 58 | 45 |
| us-usl2-mid-south | 169 | 7 | 42 | 42 | 38 | 90 % | 39 | 42 | 41 | 24 |
| us-usl2-mid-atlantic | 68 | 9 | 63 | 62 | 57 | 90 % | 60 | 62 | 58 | 45 |
| us-usl2-mountain | 163 | 7 | 42 | 42 | 40 | 95 % | 42 | 42 | 40 | 32 |
| us-usl2-nor-cal | 164 | 8 | 56 | 56 | 53 | 95 % | 56 | 56 | 53 | 37 |
| us-usl2-northeast | 41 | 10 | 70 | 69 | 67 | 96 % | 68 | 69 | 68 | 50 |
| us-usl2-northwest | 57 | 8 | 56 | 55 | 53 | 95 % | 54 | 55 | 55 | 41 |
| us-usl2-ranger | 273 | 6 | 36 | 36 | 31 | 86 % | 31 | 36 | 36 | 21 |
| us-usl2-south-atlantic | 165 | 11 | 77 | 77 | 66 | 86 % | 70 | 77 | 76 | 49 |
| us-usl2-south-central | 166 | 7 | 42 | 42 | 37 | 88 % | 41 | 42 | 39 | 28 |
| us-usl2-south-florida | 167 | 6 | 36 | 36 | 31 | 86 % | 33 | 36 | 34 | 21 |
| us-usl2-southeast | 45 | 6 | 36 | 36 | 34 | 94 % | 35 | 36 | 35 | 25 |
| us-usl2-southwest | 52 | 8 | 48 | 48 | 41 | 85 % | 47 | 48 | 43 | 36 |
| us-usl2-valley | 168 | 6 | 36 | 35 | 34 | 94 % | 34 | 35 | 35 | 25 |

Skupaj 921 popolnih od 1005 (92 %), 77 nepopolnih, 7 kontumacij. Razlogi
nepopolnih: ekipa z 9 ali 10 začetniki (32), navaden gol brez strelca (7),
ekipa brez menjav, nezaključen (4); en zapisnik ima lahko več razlogov. "990 minut" je nižji od "popolnih",
ker 990 pokvari že rdeči karton ali napačno vnesena menjava (igralec gre ven,
čeprav ni na igrišču — opozorilo; nekaj takih je verjetno ponovni vstop).
Seznam `penalties` je bil v vseh zapisnikih prazen: **gola z 11 m ne ločimo**
(`enajstmetrovka` je vedno false), zgrešenih 11 m ni. Polčasa sta 45 + 45
razen petih napačnih vnosov (opozorilo). Krogov (tednov) je 9–11 na divizijo (številke 1–11).
Klubi lige: 6–11 (Ranger, South Florida, Valley, Southeast, Great Plains s 6
so na spodnji meji 3 iz kluba × 5).

**Prehod na 2027.** Id-ji divizij so v Modular11 stalni (`zda-lige.mjs --leto 2025`:
2025 ima vseh 20 divizij razen Ranger iste id-je, končnica 2025 je imela
druge). Ko USL objavi razpored 2027:

```bash
node scripts/zda-lige.mjs --leto 2027             # divizije z id-ji in številom tekem lige
```

Nova ali preimenovana divizija dobi nov id (nova liga z migracijo); ostalim se
v `source_league_code` popravi le leto (`update competitions set
source_league_code = replace(source_league_code, '/2026', '/2027') where
source = 'modular11'`), arhiv 2026 se uvozi z `--liga 24/<divizija>/2026`
(delovni tok: `-f arhiv=24/52/2026`). Pred tem preveri `PAS_KLUBA` za nove
klube (`zda-lige.mjs --vse --pasovi`). Pri `source_league_code` z letom 2026
uvoz 2026 jemlje kot tekočo sezono (nepopolne bi zapisal) — zato najprej leto
v šifri, potem arhiv.

Arhiv je tudi 2025 (`24/<divizija>/2025`, razen Ranger; 2025 ni bil
preštet). Uvoz (ena za drugo, **šele po odločitvi lastnika**): `gh workflow run
uvoz-lige.yml -f liga=us-usl2-southwest -f arhiv=24/52/2026,24/52/2025 -f cene=true`.
Divizija ima 36–77 tekem, zapisnik ~3–8 s.
