# Nemčija in Galicija: neaktivna priprava lig

DFB lahko prvo opozorilo pri izključitvi Gelb-Rot izpusti. Uradna oznaka drugega rumenega dokazuje en predhodni rumeni karton: statistika ohrani en rumeni in en rdeči, čas izpuščenega prvega ostane `null`, zapisnik pa ima izrecno opozorilo in sled `izpeljanIz: drugi-rumeni`. Obstoječega prvega kartona ne podvoji. Pri menjavi uradno označenega vratarja isti par menjave poda vlogo vstopajočega v obeh oblikah zapisnika; označena je kot izpeljana iz menjave, ne iz dresa.

Migracija `20261016170000_nemcija_galicija_neaktivni.sql` vpiše samo dve
preverjeni začetni tekmovanji. Obe imata `active = false`; igralci, tekme in
fantasy ekipe se z migracijo ne ustvarijo. `prvi_fantasy_krog = 1` je začetna
nastavitev, ne dovoljenje za retroaktivno igranje. Ob poznejšem vklopu sredi
sezone mora `vklopi_ligo_sredi_sezone` izbrati naslednji ustrezen prihodnji krog.

| tekmovanje | vir | tekoča sezona 2026/27 | arhiv 2025/26 |
| --- | --- | --- | --- |
| `de-regionalliga-nordost` | `dfb` | `regionalliga-nordost/2026-2027` | `regionalliga-nordost/2025-2026` |
| `es-ga-tercera-lugo-g1` | `novanet` | `galicia:22:26990830:27759837` | `galicia:21:24123231:24820329` |

Šifre pripadajo sezonam. Arhiv se poda uvozu z `arhiv`, ne zamenja tekoče
`competitions.source_league_code`. Aragón in druge španske ali nemške lige
niso del te migracije.

## DFB Datencenter

Regionalligo Nordost vodi [Nordostdeutscher Fußballverband e.V.](https://www.nofv-online.de/).
Podatke objavlja [DFB Datencenter](https://datencenter.dfb.de/competitions/regionalliga-nordost/seasons/2026-2027/teams/bfc-dynamo),
zato je `federation_id` vezan na NOFV, noga pa izrecno navaja DFB Datencenter.
Vir je `scripts/viri/dfb.mjs`, ne `fussball`.

Pravi javni zajemi so navedeni v
[`de-dfb-provenance.md`](../../scripts/vzorci/de-dfb-provenance.md):
tekoči zapisnik `2425990`, arhivski `2401894`, dodatni tekoči `2426054` in
celoten razpored BFC Dynamo s 34 tekmami. Sintetična sezona v testih preverja
prehod med 18 klubskimi stranmi in združevanje 306 tekem; ni dokaz dejansko
prenesenih vseh 306 zapisnikov.

`(T)` je izrecna oznaka vratarja. Vstopnik v uradnem paru menjave lahko
podeduje že potrjeno vlogo vratarja; to je sklep iz menjave in ne samostojen
dokaz začetnega vratarja kluba. Arhivski zapisnik nima celotne klopi, zato
igralce, ki so dejansko vstopili, poda samo uradni par menjave. Manjkajočih
rezerv ali številk dresov ne dopolnjujemo.

Javne profilne povezave niso registrske številke. Igralci se trenutno
ujemajo po uradnem imenu in klubu; enakoimenska igralca iste ekipe zahtevata
zavrnitev ali dokazano razločitev. Uradne šifre klubov in primerjave z
razporedom pomagajo pri preverjanju vira, skupna baza klubov pa še vedno
uporablja ime znotraj države. Preglej preslikavo klubov med sezonama.

`scripts/viri/fussball.mjs` ostaja lokalni validator shranjenih strani.
Zajeti javni kartoni nimajo pripisanega igralca, zato ta validator ne vrača
fantasy nastopov in ni produkcijski uvoznik.

## Galicija

Ligo vodi in podatke objavlja [Real Federación Galega de Fútbol](https://www.futgal.es/).
Izbirniki uradne strani so 16. 10. 2026 potrdili zgornji tekoči/arhivski par.
`vir_ime` in `vir_url` ostaneta prazna, zato noga uporabi RFGF in njeno stran.
Pri shranjevanju polnih klubskih imen vir doda `(Galicia)`. To loči navadne
soimenjake med zvezami, ne razreši pa različnih istoimenskih klubov znotraj
iste zveze. Preveri tudi sponzorska imena in rezervne ekipe v obeh sezonah.

Novanet **ne označi vratarja**. Splošna skripta `ugani-pozicije.mjs` lahko
ugane vratarje in s tem izpolni količinski pogoj kadra, vendar to ni uradna
potrditev. Pred aktivacijo je nujen ločen dokaz začetnega vratarja za vsak
klub in pregled trajnih pozicij. Sam uspešen uvoz ali cenik tega ne potrdi.

## Preverjanje in uvoz

Najprej opravimo pregled celotnih obeh sezon brez pisanja v bazo:

```bash
node scripts/preveri-vir-sezono.mjs dfb regionalliga-nordost/2026-2027 2026/27 /tmp/slff-dfb-2026
node scripts/preveri-vir-sezono.mjs dfb regionalliga-nordost/2025-2026 2025/26 /tmp/slff-dfb-2025
node scripts/preveri-vir-sezono.mjs novanet galicia:22:26990830:27759837 2026/27 /tmp/slff-galicia-2026
node scripts/preveri-vir-sezono.mjs novanet galicia:21:24123231:24820329 2025/26 /tmp/slff-galicia-2025
```

Ohrani `porocilo.json`, `prenosi.json`, razpored, zapisnike in zajete strani.
`pokritost` mora potrditi vsak oglaševani krog in vsak odigrani zapisnik;
sezona, identitete, datum, ura, izid, goli in postavi se morajo ujemati.
`klubiBrezVratarja` ne sme biti prazen samo zaradi ugibanja. Galicijski
pregled lahko pravilno potrdi pokritost in hkrati zavrne pripravljenost,
ker zapisniki ne označijo vratarjev. Te zavrnitve se ne utiša.

Po zeleni preverbi kode in migracij se produkcijski uvoz izvede v GitHub
Actions, kjer ostane servisni ključ. Naslednja ukaza sta operativna koraka
za poznejši odobren uvoz; ta priprava ju ne poganja:

```bash
gh workflow run uvoz-lige.yml -f liga=de-regionalliga-nordost -f arhiv=regionalliga-nordost/2025-2026 -f tekoca=true -f cene=true -f prepisi_aktivno=false
gh workflow run uvoz-lige.yml -f liga=es-ga-tercera-lugo-g1 -f arhiv=galicia:21:24123231:24820329 -f tekoca=true -f cene=true -f prepisi_aktivno=false
```

Zaporedje je arhiv → razpored → tekoči zapisniki → pregled pozicij → cene.
Po njem preveri število klubov/igralcev, nastope s klopi, minute, gole brez
nastopa in razpon cen. Največ 70 % aktivnih igralcev sme imeti privzetih 4.5,
najvišja cena mora biti vsaj 8, veljaven kader 2/5/5/3 z največ tremi iz
kluba pa mora stati največ 100. Ti pogoji ne nadomestijo pregleda pokritosti,
identitet in uradnih vratarjev. Cena pod 270 minutami ostane privzetih 4.5;
če en arhiv ne zadostuje, je potreben še preverjen starejši arhiv.

`node scripts/pripravljenost-lige.mjs --tekmovanje <slug>` mora uspeti in
`preveri_podatke()` ne sme pokazati nerešenih težav. Dejanska aktivacija
ostane ločen korak po teh preverjanjih. Ne uporabljaj `supabase --linked`,
ki kaže na zamrznjeni Supabase Cloud.

## Integracija Nemčije pred aktivacijo

- Registracija vira `dfb` ter DE v nočni matriki `uvoz-zapisnikov.yml`.
- `src/lib/drzavaUgib.ts`: država DE, jezik `de`, časovni pas `Europe/Berlin`,
  prepoznava `de-` sluga. Nemščina že obstaja za Avstrijo; goli `de` ne sme
  samodejno preglasiti izrecnega `de-AT` ali `de-CH`.
- Imena države v vseh `src/i18n/*/aplikacija.ts`, vstop `/de` in povezani
  preizkusi; strežniški HTML mora dobiti enako preslikavo DE → `de`.
  Preveri še gradnjo statične vstopne strani, preusmeritve v `vercel.json`
  in seznam poti s poševnico v `scripts/hetzner/Caddyfile`.
- `supabase/functions/posli-opomnik/sporocila.ts`: DE → `de` in
  `Europe/Berlin`; po spremembi je potrebna ločena objava funkcije. Preveri
  tudi avtentikacijske predloge in trajno shranjevanje izbire jezika.
- Države/tekmovanja nimajo zaprtega seznama kod in za ta neaktivna vpisa ni
  potreben nov RPC ali sprememba tipov. Obstoječe `stanje_lige`,
  `sezona_lige` in varovalo vklopa so splošni. Sveža CI baza mora preveriti
  celotno verigo migracij.

Omejitev `klub_stik_drzava_check` še ne sprejme DE. To zadeva ločeno
funkcionalnost klubskih stikov; migracija je namenoma ne razširi in ne
ustvarja stikov ali odhodne pošte. Tudi nemška imena hišnih lastnikov
(`ime_hisnega_lastnika`) so ločena priprava pred ustvarjanjem hišnih ekip.
