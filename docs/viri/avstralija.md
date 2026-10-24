# Avstralija — Dribl (omejeni dokaz, 24. 10. 2026)

Noben vir ali liga nista registrirana ali aktivirana. Delo poteka brez baze.
Dovoljenje za avtomatizirano branje ostaja nepreverjeno: prejšnji enkratni
zahtevek `https://dribl.com/terms/` je potekel; tega gostitelja ne ponavljamo.
Javni Football NSW Match Centre se izriše brez prijave ali izziva.

## Načrt in pogodba vira

1. Ohranimo izvirne bajte le javno opaženih zahtevkov in SHA-256 provenienco.
2. Najprej preizkusi na resničnih JSON odgovorih, nato strogi offline parser.
3. Ločen omejeni zajem; najmanj 3 s med začetki, največ 20 zahtevkov,
   brez preusmeritev/ponovitev/prijave. Napaka transporta ali blokada ustavi zajem.
4. Popoln zapisnik je šele dokaz za zapisnik; celotna liga potrebuje razpored,
   vse strani in ločeno presojo vsake tekme. Nepopolna liga ostane HOLD.

Opaženi javni API je `https://mc-api.dribl.com/api/`, oglasile so ga dejanske
zahteve strani `https://competitions.footballnsw.com.au/` (pageAssets inventory).
Ne uporabljamo zasebnih/admin poti, piškotkov ali ključev.

- `tenants?mc_link=competitions.footballnsw.com.au&slug=competitions`:
  `data.id=1RwNlWemjr`, Football New South Wales.
- `list/seasons?disable_paging=true&tenant=1RwNlWemjr`: 2022–2026,
  tekoča 2026 `wOmelzGd02`. Sezona 2027 ni opažena.
- `list/competitions?disable_paging=true&tenant=1RwNlWemjr&season=wOmelzGd02`:
  imenik tekmovanj; NPL Men's NSW `A4KLxx87Kq`.
- `list/leagues?disable_paging=true&tenant=1RwNlWemjr&competition=A4KLxx87Kq&sort=%2Bname`:
  First Grade `bgdMjoBxmE`, U20 `Bjmaxvo6dR`.
- `results?season=wOmelzGd02&competition=A4KLxx87Kq&league=bgdMjoBxmE&date_range=default&tenant=1RwNlWemjr&results=1&timezone=Europe%2FLjubljana`:
  30 vrstic na stran, kazalci. `data[].hash_id` NI ID zapisnika;
  uporabi `attributes.match_hash_id`. `links.next` sam ne ohrani filtrov!
- `matchcentre/<match_hash_id>?tenant=1RwNlWemjr`:
  `data.type=fixtures`, `data.hash_id`, `attributes` z izidom, kontekstom,
  stanjem zapisnika in dogodki.
- `matchcentre-match-members/match/<match_hash_id>/team/<team_hash_id>`:
  polje oseb in osebja. Igralci so `role_slug=player`; profilna šifra je
  `user_hash_id`. `playing=true` imajo tudi neuporabljene rezerve. Nastop
  izhaja iz `starting` in dejanskih časovnih menjav.

`matchcentre.attributes.goals[].member_id` je DRUG imenski prostor kot
`user_hash_id`. Ne smeta postati ista šifra. Gol povežemo s profilom prek
osebnih dogodkov in strogega ujemanja ekipe, imena, minute in polčasa;
nejednoznačnost je HOLD. Menjave in kartone dodatno uskladimo s časovnico.

Vratar je izrecen `field_role=Goalkeeper`, `field_role_slug=goalkeeper` in
`field_role_group=goalkeeper`; `is_goalkeeper=false` sam ne zanika te vloge
(tako je dejansko zapisan Adam Pavlesic). Številka 1, ime ali clean sheets
niso dokaz. Odsotna/kontradiktorna vloga začetnega vratarja je HOLD.

Minute so absolutne: menjava 45 v `ft-second-half` pomeni začetek drugega
polčasa; karton 47 v `ft-first-half` je sodnikov dodatek prvega. Izvirno minuto
in polčas ohranimo; za minute nastopa uporabljamo 45/90-minutni meji.
Podprta sta samo opažena redna polčasa 45+45; podaljški, streljanje penalov,
kontumacija in neopažene vrste kartonov ostanejo HOLD.

Resnični Grand Final `vdWDwrrWym` APIA–Sydney United 1:3 ostane HOLD:
Oliver Kalac nima izrecne vratarske vloge. Noben popravek osebe ni dovoljen.

## Ohranjeni dokazi in offline preverba

`scripts/vzorci/au-dribl-provenance.json` navaja 13 izvirnih JSON odgovorov,
URL-je, datume zajema, HTTP 200, velikost in SHA-256. 13 neposrednih JSON
branj in sedem dejanj prehoda v brskalniku; brez ponovitev, zavrnitev ali izziva.
Vzorcev ne popravljamo; negativni preizkusi spreminjajo le kopije v pomnilniku.

Semifinal `1K3pRqqeGd`, Sydney United–Manly 3:1, 6. 9. 2026 ob 04:00 UTC,
je pozitiven vzorec: 22 začetnikov, sedem rezerv z dejanskim vstopom, štirje
goli, pet rumenih kartonov in sedem parov menjav. Obe začetni vratarski vlogi
sta izrecni. `matchsheet_away_team_confirmed=false` je ohranjen upravni podatek;
objavljen dokončan zapisnik z usklajenimi statistikami zaradi tega ni nepopoln.
Zahtevamo obe oddani postavi; upravna potrditev drugega kluba ni nadomestilo za
preverjanje podatkov. Drugi vzorec Grand Final ostane HOLD.

```sh
node --test scripts/test-dribl.mjs
node scripts/dribl-offline.mjs --manifest scripts/vzorci/au-dribl-provenance.json --match 1K3pRqqeGd
node scripts/dribl-offline.mjs --manifest scripts/vzorci/au-dribl-provenance.json --match vdWDwrrWym
```

Izhod 0 pomeni samo preverjen zapisnik; 2 pomeni HOLD, 1 napako vhodnega
dokaza. CLI preveri tri izvirne SHA in ne vsebuje omrežja ali baze. Čiste
funkcije so `parseDriblCatalog`, `parseDriblSchedule`, `parseDriblReport` in
`verifyDriblReceipt` v `scripts/viri/dribl.mjs`. Izvoz za HOLD ima javno
uporabne statistične sezname `null`; surova razčlenitev ostane v `diagnostics`.
Vedno `activationEligible=false`, `sezonskiUvozPodprt=false`.

Razpored je samo prva stran 30 rezultatov (`next_cursor` ni prazen), zato
ostane HOLD. `nextUrl` ohrani prvotne filtre in doda opaženi kazalec.
`seasonComplete=false` prepreči zamenjavo konca strani za pregledano sezono.
Javni `fixtures?date_range=default&season=wOmelzGd02&competition=A4KLxx87Kq&league=bgdMjoBxmE&tenant=1RwNlWemjr&timezone=Europe%2FLjubljana`
je vrnil prazno stran brez kazalca. UI ga označi **Upcoming Fixtures**;
to ni dokaz vseh neodigranih/preloženih tekem v sezoni. Za sezonski uvoz
potrebujemo dokaz celotnega objavljenega inventarja in vse zapisnike.

Omejitve: trenutno podprta sta samo običajna polčasa 45+45 in izrecno opaženi
rumeni kartoni. Rdeči kartoni, avtogoli, podaljški ali kazenski streli zahtevajo
nov izvirni dokaz in preizkuse; do takrat HOLD. Vzorca ne dokazujeta uporabnosti
vseh lig NSW, drugih avstralskih zvez ali arhivov. Transport/zajem, povezava v
uvoz in presoja vsake lige so ločeni naslednji koraki; država ni aktivirana.

Naknadno je dejanski javni filter `Filter → Date → All Fixtures`, nato
navigacija `Fixtures`, pokazal celotni način `date_range=all`. Opaženi URL:
`https://mc-api.dribl.com/api/fixtures?season=wOmelzGd02&competition=A4KLxx87Kq&league=bgdMjoBxmE&date_range=all&tenant=1RwNlWemjr&timezone=Europe%2FLjubljana`.
Izvirni odgovor `au-dribl-fixtures-all-npl.json` vsebuje 30 vrstic od začetka
sezone in tudi končane tekme, s kazalcem za naslednjo stran. To je dokaz
objavljenega načina celotnega inventarja, še vedno **ne** zajeta celotna sezona.

Vrstice imajo `type=fixtures`, različen `hash_id` in `attributes.match_hash_id`,
čas pa `2026-02-06T08:30:00.000000Z` (rezultati uporabljajo presledek brez Z).
`links.next` tudi tu vsebuje samo kazalec; ob nadaljevanju je treba ohraniti
opažene filtre. Čisti `parseDriblSchedule` bere oba opažena formata: `results` z
`date_range=default` in `fixtures` z `date_range=all`. Prazni način Upcoming
Fixtures (`date_range=default`) ostane HOLD in ni dokaz celotnega inventarja.
Neopaženi filtri, podvojeni parametri in drugačen kontekst so zavrnjeni;
`fullInventoryEvidence=true` označi le opaženi način celotnega inventarja,
ne vseh zajetih strani. Naslednji korak mora zajeti in uskladiti vse strani. Nadaljnjega omrežja ni bilo: meja 20
(13 neposrednih JSON branj + 7 prehodov strani) je dosežena.

Glava zapisnika ohrani izvorne vrednosti `round_number` → `round`,
`display_round_number` → `displayRound`, `round_label` → `roundLabel` in
`match_type` → `matchType`. Semifinal ima 2 / F2 / Semi Finals / finals;
Grand Final 3 / F3 / Grand Final / finals. `full_round` v ohranjenih glavah
zapisnikov ni objavljen, zato `fullRound=null`; razpored ga dejansko objavi
(npr. Round 1) in ga parser ohrani. Ne izmišljamo si skupne številke kroga
za redni del in končnico.
