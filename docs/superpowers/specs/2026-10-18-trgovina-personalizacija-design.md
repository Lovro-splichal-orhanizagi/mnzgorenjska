# SLFF Trgovina — deli 2 in 3: personalizirani izdelki, značke, boni

Datum: 18. 10. 2026. Status: odobren dizajn. Nadgrajuje
`docs/superpowers/specs/2026-10-18-trgovina-design.md` (del 1, v živo v
testnem načinu Stripe) in `docs/trgovina.md`.

## Odločitve (lastnik, 18. 10. 2026)

| tema | odločitev |
|---|---|
| izdelava personaliziranih | lokalna tiskarna: admin zbere plačana personalizirana naročila v serijo in jo pošlje tiskarni (PDF/ZIP z oblikami, velikostmi, oznakami); pakiramo in pošiljamo sami |
| izdelki | majica z imenom fantasy ekipe, izdelki prvaka mini lige, značka preverjenega igralca, poljubno ime/številka |
| boni | da: darilni boni za trgovino ter boni za Scout in preverjene |

## Personalizirani izdelki

- Izdelek dobi `po_narocilu boolean` (izdelava po naročilu): zaloge ne šteje,
  rezervacije ne drži, dobavni rok "1–2 tedna" (niz). Lahko ima različice
  (velikost/barva) kot zdaj.
- `trgovina.personalizacije` (vrsta možnosti na izdelku): `izdelek_id`,
  `vrsta` (`ime_ekipe` | `poljubno_ime` | `stevilka` | `prvak` | `znacka`),
  `doplacilo` (centi z DDV), `obvezna`. Predlagana doplačila (lastnik jih
  spremeni v adminu): ime +5,00 €, številka +3,00 €; prvak in značka sta v ceni.
- `trgovina.postavke.personalizacija jsonb` hrani, kar je kupec izbral
  (npr. `{"ime":"Kranjski Tigri","stevilka":10}`), in `doplacilo int`.
- **Preverjanje na strežniku** (`rezerviraj`), nikoli le v brskalniku:
  - `ime_ekipe`: prijava obvezna; besedilo je ime ene od kupčevih
    `fantasy_teams` (ne hišne); shrani se tudi `fantasy_team_id`.
  - `poljubno_ime`: 1–12 znakov, črke (tudi šumniki), presledek, pika,
    vezaj; isti filter žaljivk kot `varuj_prikazno_ime` (izlušči skupno
    funkcijo, ne kopiraj seznama); nič "admin/slff/moderator".
  - `stevilka`: celo število 0–99.
  - `prvak`: le ekipa, ki je **prvak končane sezone** mini lige: največ točk
    na lestvici mini lige za sezono S (isti izračun kot lestvica mini lige),
    sezona S je končana (po `sezona_lige` vseh tekmovanj ekip v ligi je S
    pretekla), mini liga ima vsaj 4 človeške ekipe (brez hišnih); kupec je
    lastnik te ekipe. Besedilo na izdelku sestavi strežnik ("Prvak mini lige
    <ime lige> 2026/27"), kupec ga ne piše. Izdelki prvaka so v katalogu
    vidni vsem, gumb je aktiven le upravičenim (RPC `trgovina_moji_prvaki()`).
  - `znacka`: le lastnik potrjenega profila igralca z doživljenjsko
    preverjenostjo, ki značke še ni naročil (`narocila_znack`); ime na
    znački po `preverjen_ime_znacke`. Plačilo v trgovini ob uspehu vpiše
    vrstico v `narocila_znack` (obstoječi tok tiska in pošiljanja značk ostane).
- Predogled na strani izdelka: slika izdelka z vpisanim besedilom (CSS/SVG
  plast, ne nova slika).
- **Brez pravice do odstopa**: košarica s personaliziranim izdelkom zahteva
  potrditev "Personaliziranih izdelkov ni mogoče vrniti" (ZVPot-1, izdelek po
  meri); pogoji to že navajajo.

## Tisk (admin "Za tisk")

- Plačana naročila s personaliziranimi postavkami gredo najprej v stanje
  postavke `za_tisk` → admin jih izbere v **serijo** (`trgovina.serije`:
  id, ustvarjena, poslana_tiskarni, natisnjena) → izvoz ZIP: `serija.csv`
  (oznaka naročila, izdelek, različica, besedilo, številka) in SVG/PNG
  oblika za vsako postavko (ime/številka v pisavi blagovne znamke) →
  "Poslano tiskarni" → "Natisnjeno" → naročilo gre v obstoječi seznam za
  pakiranje. Mešano naročilo (zaloga + personalizirano) se pakira skupaj,
  ko je vse natisnjeno.

## Boni (Stripe promocijske kode)

- **Darilni bon** (digitalni izdelek v katalogu: 20, 30, 50 €): po plačilu
  webhook ustvari Stripe kupon (`amount_off`, EUR, `duration=once`) in
  enkratno promocijsko kodo (`max_redemptions=1`, `metadata.app=slff-shop`,
  omejeno na trgovino) ter kodo pošlje kupcu (mail `trgovina-posta`, vrsta
  `bon`). Bon velja 1 leto (`expires_at`). **Brez ostanka**: koda se porabi v
  celoti v enem nakupu (pogoji in mail to povedo). Dostave ni.
- **Boni za Scout in preverjene**: admin v trgovini ustvari kodo (odstotek ali
  znesek, omejitev na izdelek Scout ali preverjene prek
  `applies_to.products` kupona, število uporab, rok). Checkouti
  `scout-placilo`, `preverjen-placilo` in `trgovina-nakup` dobijo
  `allow_promotion_codes=true`.
- Darilni bon trgovine je omejen na izdelke trgovine (kupon z
  `applies_to.products` = izdelek "SLFF Trgovina" v Stripe; trgovina zato
  postavke vodi pod tem izdelkom prek `price_data.product`).
- `trgovina.boni`: evidenca izdanih kod (koda zgoščena in zadnji 4 znaki,
  naročilo, znesek, rok, porabljeno — iz webhooka `checkout.session.completed`
  z `discounts`). Kode v čistopisu ne hranimo.

## Pravno

Pogoji trgovine: personalizirani izdelki brez odstopa, rok izdelave, darilni
boni (veljavnost 1 leto, enkratna uporaba, brez izplačila v gotovini).
Zasebnost (`#trgovina`): besedilo personalizacije in ime ekipe sta del
naročila.

## Testi

`varnost.sql`: tuj `fantasy_team` za ime ekipe zavrnjen; žaljivka zavrnjena;
številka izven 0–99 zavrnjena; prvak le za pravega lastnika in le po koncu
sezone in ≥ 4 ekipe; značka le doživljenjsko preverjen, enkrat; doplačila iz
baze, ne iz brskalnika; po_narocilu ne zmanjša zaloge; bon se izda enkrat
(ponovljen webhook). Smoke: predogled, košarica s potrditvijo, izvoz serije.

## Zunaj obsega

Izdelki klubov (del 4), ostanek na darilnem bonu, samodejno pošiljanje serije
tiskarni po e-pošti.
