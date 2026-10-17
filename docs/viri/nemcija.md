# Nemčija in Galicija: neaktivna priprava lig

DFB lahko prvo opozorilo pri izključitvi Gelb-Rot izpusti. Uradna oznaka drugega rumenega dokazuje en predhodni rumeni karton: statistika ohrani en rumeni in en rdeči, čas izpuščenega prvega ostane `null`, zapisnik pa ima izrecno opozorilo in sled `izpeljanIz: drugi-rumeni`. Obstoječega prvega kartona ne podvoji. Pri menjavi uradno označenega vratarja isti par menjave poda vlogo vstopajočega v obeh oblikah zapisnika; označena je kot izpeljana iz menjave, ne iz dresa.

Migracija `20261016211600_nemcija_galicija_neaktivni.sql` vpiše samo dve
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
celoten razpored BFC Dynamo s 34 tekmami. Celotni živi pregled teka38939351677 je nato dejansko zajel vseh306 arhivskih in108 tekočih zapisnikov, skupaj s klubskimi razporedi. Izvorni dokumenti in poročili sta v artefaktih `vir-dfb-2025` in `vir-dfb-2026`. Sintetična sezona v testih dodatno preverja prehod med18 klubskimi stranmi in združevanje306 tekem; ni nadomestilo za te prave zajeme.

`(T)` je izrecna oznaka vratarja. Vstopnik v uradnem paru menjave lahko
podeduje že potrjeno vlogo vratarja; to je sklep iz menjave in ne samostojen
dokaz začetnega vratarja kluba. Arhivski zapisnik nima celotne klopi, zato
igralce, ki so dejansko vstopili, poda samo uradni par menjave. Manjkajočih
rezerv ali številk dresov ne dopolnjujemo brez natančno vezanega uradnega dokaza iste tekme.

Javne profilne povezave niso registrske številke. Igralci se trenutno
ujemajo po uradnem imenu in klubu; enakoimenska igralca iste ekipe zahtevata
zavrnitev ali dokazano razločitev. Uradne šifre klubov in primerjave z
razporedom pomagajo pri preverjanju vira, skupna baza klubov pa še vedno
uporablja ime znotraj države. Preglej preslikavo klubov med sezonama.

`scripts/viri/fussball.mjs` ostaja lokalni validator shranjenih strani.
Zajeti javni kartoni lahko nimajo pripisanega igralca. To samo po sebi ni
razlog za zavrnitev sicer popolne tekme; validator pa še vedno nima
preverjenega celotnega sezonskega prehoda in ne vrača fantasy nastopov ter
ni registriran produkcijski uvoznik.

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


## Sklep celotnega zajema

Ponovitev vseh 414 dejanskih zapisnikov po razčlenitvi ohrani 108/108 tekočih in 306/306 arhivskih zapisnikov. Podvojene povsem enake celice postave se združijo samo znotraj iste strani in tabele; skupni označevalec gola ne izbriše posameznih izvornih strelcev in vmesnih izidov. Dve izrecni obliki časa v zaključnem sodnikovem dodatku se združita samo, če je vsaka podsekvenca že urejena; običajno neurejenih dogodkov ne popravljamo.

Arhivski zapisnik 2401897 ima omejeno dopolnitev vloge Luis Zwick iz uradne klopi iste tekme na FUSSBALL.DE. Glavna stran, njen izrecni URL postave, CSS in pisava so shranjeni nespremenjeno s SHA-256. Strogi dekoder potrdi Luis Maria Zwick kot domačo rezervo; uradna profila z enakim datumom rojstva potrdita izrecno pregledani vzdevek. Register `scripts/viri/dfb-rezerve.json` velja samo za to tekmo, popolno semantično identiteto izvirnega zapisnika in te dokazne bajte. DFB ime, profil in karton pri90+5 ostanejo nespremenjeni. Dodana vloga ne pomeni vstopa ali minut: nastop ima0minut,1rumeni in brez clean sheeta; vloga vratarja v nastopu ostane neznana. Spremenjen dokaz, dogodek, postava, sodnik ali nepovezan neznan prejemnik se zavrne. Izrecna DFB klop ima prednost in se je ne dopolnjuje, če igralca ne vsebuje.

Celotna ponovitev preveri vseh450 izvornih SHA-256, dejanske klubovske razporede, sezono, datum, uro in izid ter potrdi izrecne začetne vratarje vseh18 klubov v obeh sezonah. To potrdi podatkovni vir; produkcijski uvoz, cenik, pozicije, prihodnji prvi fantasy krog in dejanska strežniška objava imajo še ločene preverbe.

Pri 2401959, 2402023 in 2402046 so uradni zapisi sodelujočih klubov potrdili pravilne strelce in čase, vendar napačne vmesne oznake izida v DFB. Podatkovni register `scripts/viri/dfb-korekcije.json` za te tri zgodovinske tekme vsebuje celotno pričakovano identiteto, obe ekipi, datum, polčas, končni izid ter vsak izvorni gol z imenom, stranjo, surovim časom, oznakami in izidom. Pred uporabo se morata izvirna razdelka časovnice in golov ujemati. Spremeni se samo šest konkretno potrjenih vmesnih izidov; izvorni izid, izvorni celoten podatek, dokazni URL, datum preverbe ter SHA vzorca in dejanskega dokumenta ostanejo v `rezultatVir`, `popravekIzida` in `popravki`, skupaj z opozorilom.

Pravila sprejmejo samo celoten znani napačni vzorec ali celoten pričakovani vzorec, če DFB oznake popravi sam. Delna sprememba ali drug odmik zahteva ponovno preverbo in zavrnitev. Strelcev, časa, strani ali vrstnega reda ne spreminjamo. Vse običajne preverbe aktivnih igralcev, polčasa, končnega izida in dogodkov se nato izvedejo še vedno. Nespremenjeni zajemi in regresijski preizkusi vsebujejo potrjene popravke, omejeno uradno dopolnitev Luisove vloge ter zavrnitve vseh nepregledanih odstopanj.

## Regionalni pregled DFB pred uvozom

Register `scripts/viri/dfb-lige.json` izrecno veže vsako šifro na sezono,
uradno pot in začetni klub. Kandidati še niso potrjeni s celotnim zajemom:

| liga | tekoča šifra (2026/27) | arhivska šifra (2025/26) |
| --- | --- | --- |
| Nord | `regionalliga-nord/2026-2027` | `regionalliga-nord/2025-2026` |
| West | `regionalliga-west/2026-2027` | `regionalliga-west/2025-2026` |
| Südwest | `regionalliga-suedwest/2026-2027` | `regionalliga-suedwest/2025-2026` |
| Bayern | `regionalliga-bayern/2026-2027` | `regionalliga-bayern/2025-2026` |

Vsaka sezona ima 18 klubov, 34 krogov in 306 tekem, razen Bayern 2026/27:
19 klubov, 38 krogov, 342 tekem in dva prosta kroga na klub. Uradnih
identifikatorjev klubov ne sestavljamo iz prikazanih imen.

Po pregledu kode se ročno sproži `preveri-dfb-ligo.yml` na pregledanem commitu:
`liga` je ena od štirih zgornjih osnovnih šifer (brez `de-`), `sezona` pa
`current`, `archive` ali privzeti `all`. En posel zaporedno zajame zahtevani
sezoni; napaka prve ne preskoči druge, posel pa ostane neuspešen. Artefakta
`vir-dfb-<liga>-2026` in `vir-dfb-<liga>-2025` se ohranita 14 dni, tudi ob
zavrnitvi. Vsebujeta poročilo, prenose in dosegljive surove dokumente z
URL, časom in SHA. Zajem nima ključa baze, SSH ali obvestil in ne piše v
produkcijo. Skupni časovni limit za obe sezoni je 180 minut.

Novi in starejši Nordost audit imata isto stalno skupino sočasnosti
`live-source-dfb-readonly` čez vse veje. Tudi Nordost sezoni sta zaporedni,
brez matrike; njegov limit je 90 minut. GitHub ohrani največ en čakajoči
posel na skupino: operativno sprožaj en audit naenkrat, saj lahko dodatni
čakajoči zagon zamenja prejšnjega. Uvozi DE se med seboj vrstijo prek
obstoječe koordinacije skupnega vira `dfb`, tudi pri neaktivnih ligah.
Največ en uvoz in en audit bereta s premorom šest sekund na bralca,
skupaj povprečno največ en zahtevek na tri sekunde. CAPTCHA, izziv ali
401/403/429 ustavijo zajem; zavrnitve ne obhajamo.

Javni FUSSBALL.DE kartoni brez pripisanih imen ter nepovezani ticker dogodki
ne zadoščajo za druge nemške lige. Reprezentativni zapisniki teh štirih
Regionallig potrjujejo podporo razčlenjevalnika, ne pripravljenosti za vklop.
Celotna arhivska in tekoča zgodovina, uradni začetni vratarji, dejanske
menjave, produkcijska enakost in cenik potrebujejo ločene preverbe pred
varovanim vklopom. Nordostova obstoječa aktivacija ostane ločena.

## Varovan regionalni uvoz in vklop

Migraciji `20261017180000` in `20261017180100` dodata samo štiri neaktivne
kandidate in ločen servisni RPC `varen_vklop_dfb_regije(text,text,boolean)`.
Zveze so `nfv-nord` (Norddeutscher Fußballverband e.V.), `wdfv`
(Westdeutscher Fußballverband e.V.), `rlsw` (Regionalliga Südwest GmbH) in
`bfv-bayern` (Bayerischer Fußball-Verband). Uradni URL zveze je ločen od
navedbe vira DFB Datencenter. Nordostov RPC in aktivno stanje ostaneta ločena.

Postopek uporablja dva uspešna sezonska zajema `preveri-dfb-ligo.yml` na
istem pregledanem `source_commit`. Preveri dejanski posel `DFB regionalni
audit` in točen uspešen korak posamezne sezone, ne le zelenega zagona ali
obstoja artefakta. Razčlenjevalnik, register `dfb-lige.json` in njegovi
pomočniki morajo biti identični zajemu. Trenutni čas priprave nikoli ne
osveži zajema: najstarejši čas dokumenta ostane v manifestu (arhiv največ
7 dni, tekoča sezona največ 12 ur).

1. Sproži `vklop-dfb-regije.yml` brez `approved_sha256`. Prenese artefakta,
   preveri vsak izvorni SHA/URL in brez omrežja ponovno razčleni vse
   dokumente. Artefakt `dfb-regional-release-<run>` vsebuje `jobs.json`,
   `manifest.json` in `summary.json`. Preglej manifest in njegov SHA-256.
2. Sproži `uvoz-dfb-regije.yml` z istimi ligo, commitom, zagoni in odobrenim
   SHA. Pred prvo spremembo baze znova preveri celoten manifest in zajeme.
   Obstoječe skripte izvedejo arhiv → razpored → tekoče zapisnike →
   `lazni-vratarji` → `ugani-pozicije` → `ovrednoti-igralce`.
   `dfb-offline.mjs` oskrbi DFB samo z odobrenimi surovimi dokumenti;
   manjkajoč URL nima omrežnega nadomestila. Svež checkout ne sme imeti
   obnovljenega predpomnilnika. Baza uporablja običajni overjeni HTTP
   odjemalec v Actions. Uvozni tok ne vklaplja lige.
3. Ponovno sproži `vklop-dfb-regije.yml` z odobrenim SHA: privzeto je to
   preverba brez spremembe produkcijskih tabel. Za vklop sta potrebna
   `activate=true` in `server_ready=true` po preverjeni objavi nemškega
   HTML/Caddy/opomnikov. Ključi ostanejo samo v Actions; ni obvestil ali pošte.

Manifest v1 ima omejitev 8 MiB in veže obe dejanski službi zajema, izvorni
commit, razčlenjevalnik in vse tekme: ID, krog, datum, tudi neznano uro
(`null`), kluba, izid, URL, opozorila, 22 imen začetnikov in izrecna dokaza
`oznaka-T`. Nastopi vsebujejo vsa polja, ki jih zapisuje uvoznik (tudi dres,
minute vstopa/izstopa, kartone, enajstmetrovke, prejete gole in clean sheet),
goli pa ime, zgodovinsko stran, minuto, oznaki in vmesni izid. Primerjava
uporabi multiset z ohranjanjem podvojitev, po tekmi, zgodovinski strani in
točnem imenu; trenutni klub igralca ne presoja arhivskega nastopa.

Vsak arhivski in vsak odigrani tekoči zapisnik je obvezen. Regionalna pot
nima izjem za manjkajoče zapisnike. Pod zaklepi preveri tudi trenutne
izbirljive klube, uradne vratarje, resnične menjave, gole brez nastopa,
najvišjo ceno vsaj 8, največ 70 % privzetih cen in veljaven kader 2/5/5/3
z največ tremi igralci kluba za največ 100. Prvi fantasy krog mora biti
prihodnji, nezaklenjen in v celoti neodigran. Neznana ura katerekoli tekme
njegovega prvega dne prepreči vklop; rok se mora natančno ujemati z
najzgodnejšim uradnim začetkom minus šest ur v `Europe/Berlin`.

Izolirani regresiji `scripts/test-vklop-dfb-regije-sql.mjs` in
`scripts/test-dfb-regije-locks.mjs` zahtevata izrecni
`SUPABASE_DB_CONTAINER` sveže, odstranljive baze. Preverjata sezoni
18/34/306 in Bayern 19/38/342, zavrnitve spremenjenih podatkov ter
blokiranje sočasnih zapisovalcev. Fixture se vedno razveljavi z ROLLBACK.

## Ponovitev ohranjenega zajema po popravilu razčlenjevalnika

Za pregledan popravek parserja obstaja ločena pot v2. Na pregledanem novem
commitu sproži `ponovi-dfb-regijo.yml` za vsako sezono: `liga` vključuje
`de-`, `season` je `2025/26` ali `2026/27`, `capture_run` in
`capture_commit` pa označujeta izvirni zajem. GitHub API potrdi dejanski
izvirni posel, točen sezonski korak in uspešen prenos dokazov. Dovoljen je
zaključen neuspešen korak razčlenjevanja, nikoli preklican, časovno prekinjen,
zavrnjen ali transportno nepopoln zajem. Prvotni neuspeh ostane neuspeh.

Preneseni ZIP se mora ujemati z dejanskim API `artifact.digest`, ID-jem,
velikostjo, imenom, zagonom in commitom. Preveri se vsak izvorni SHA, URL in
UTC ter SHA nespremenjenih bajtov `prenosi.json`. Ponovitev teče v Linux
omrežnem imenskem prostoru brez omrežja, brez podatkovnih ključev in z
zaprtim zemljevidom URL-jev. Manjkajoča stran ali zapisnik ustavi celotno
ponovitev; ni novega zajema ali nadomestnega vira.

Artefakt `dfb-regional-replay-<liga-brez-de>-<leto>` vsebuje `replay.json`,
`summary.json`, `razpored.json` in `zapisniki.json`. Notranji dokaz veže
izvirni zajem ter dejanski novi run/job/commit, SHA workflowa in parserja.
Čas generiranja je ločen od izvirnih časov. ID in SHA novega artefakta se
pridobita šele po uspešni objavi iz GitHub API; artefakt ne vsebuje lastnega
krožnega SHA. Izvirni surovi artefakt ostane ločen in nespremenjen.

Pri pripravi/uvozu/vklopu podaj nova uspešna replay zagona kot `archive_run`
in `current_run`, novi pregledani commit pa kot `source_commit`. Obe sezoni
morata uporabljati isto pot (v1 neposredni zajem ali v2 ponovitev). Vsak
workflow neodvisno preveri oba dejanska posla, oba artefakta in vsak dokument,
znova strogo razčleni celotni sezoni ter primerja rezultate ponovitve.
Celotna izvedbena koda v2 mora biti identična pregledanemu commitu. Manifest
v2 doda `lineage.capture` in `lineage.replay`; odobritev SHA in izvorna
svežina 7 dni/12 ur ostaneta obvezni. Ponovitev ne osveži zajema.

Migracija `20261017220000` ohrani prejšnjo funkcijo nespremenjeno v zasebni
shemi `private_dfb_release` brez pravice izvedbe za javne ali servisno vlogo.
Javni servisni RPC preveri v2 lineage in nato v isti transakciji uporabi
iste statistične, cenovne, časovne in zaklepne pogoje. V1 ostane podprt;
Nordostov RPC ostane ločen. Dejanska zaključnost tekočih tekem je dodatna
izvorna zahteva: zelen replay ne dokazuje, da je bil zajem narejen po koncu
tekme. Uradno manjkajoči ali protislovni podatki ostanejo blokada.


## Nepripisani običajni rumeni kartoni (17. 10. 2026)

Prva produkcijska politika velja samo za štiri registrirane neaktivne DFB
kandidate Nord, West, Südwest in Bayern. Nordostova privzeta razčlenitev,
obstoječi podatki in ločen postopek vklopa se ne spreminjajo. Majhno število
običajnih rumenih kartonov brez dokazane vloge prejemnika ne izloči sicer
uporabne tekme. Ni izpuščanja celih zapisnikov in ni odstotkovnega praga.
Vsi dokazani nastopi, minute, menjave, goli, izidi in pripisani kartoni se
ohranijo. Nepripisan karton ne ustvari igralca, klopi ali nastopa in nima
odbitka točk; odsotnost odbitka ne dokazuje nič rumenih kartonov.

Vloga igralec-trener zahteva isto izrecno javno profilno šifro v postavi in
vrstici trenerja iste strani. Ime samo, manjkajoča šifra ali različni šifri
niso dokaz. Pri dokazani dvojni vlogi običajni rumeni ostane nepripisan,
ker vir ne pove, v kateri vlogi je bil prejet. Znani igralci in uradne
osebe ohranijo dosedanje kartone in sankcije. Rdeči in drugi rumeni nikoli
ne dobijo te izjeme. Dva navadna rumena istega igralca brez izključitve,
neveljaven čas, nasprotna stran, trk profila, neskladje razdelkov dogodkov,
protislovni goli, manjkajoče postave ali vratarji in nepopoln razpored
ostanejo blokade.

Skupni kodek `src/lib/nepripisaniRumeni.mjs` preveri in kodira po eno omejeno
opozorilo `SLFF_UNATTRIBUTED_YELLOW_V1:` na dogodek. `matches.import_warnings`
hrani javno sled: vir in identiteto tekme, stran, celoten čas, minuto,
razlog, SHA/ordinal dogodka in javni profil, če obstaja; brez surovega HTML
ali osebnih opomb. Nepripisani dogodki niso v `rumeni`. Kodek je del
pregledanega izvornega prstnega odtisa, manifest pa preveri vse bajte
opozoril in znane nastope. Sprememba ne potrebuje migracije, RPC ali
spremembe točkovanja.

Stran tekme ločeno prebere javni `matches.import_warnings` za točni ID,
preveri in združi podvojena opozorila s skupnim kodekom ter nad postavami
pokaže prevedeno število in pojasnilo o manjkajočih odbitkih. Ne kaže JSON,
profilnih šifer ali diagnostike parserja. Napaka tega neobveznega branja
pokaže le splošno nedosegljivost podatka; znana statistika ostane na voljo.
Po izvorni korekciji opozorilo izgine, obstoječa idempotentna zamenjava
nastopov pa zapiše znani karton in odbitek enkrat.

Ponovni sveži prenos opozorjenih tekem je omejen na običajno nastavljeno
nedavno okno `--sveze` (če ni podano, 7 dni) in obstoječi proračun zahtevkov
vira. Nočni uvoz ne pregleduje znova vsega zgodovinskega arhiva zaradi
opozoril. Staro opozorilo se popravi z izrecnim ciljnim uvozom, npr. v
odobrenem Actions okolju z običajnimi nastavitvami lige:

```bash
node scripts/uvoz-zapisnikov.mjs --tekmovanje de-regionalliga-west --liga regionalliga-west/2025-2026 --zapisnik de-dfb-2402201
```

`--zapisnik` zahteva sveži HTML prav tega starega zapisnika; ne posega v
vse stare tekme. Enak izvorni odtis preskoči podvojen vpis, spremenjen pa
zamenja nastope in opozorila. To ni obljuba zgodovinskega prevrednotenja
cen ali spremembe pravil za nazaj; ceniki imajo svoj obstoječi postopek.

Lokalna ponovitev ohranjenih nespremenjenih zajemov (ne nov živi zajem) je
po tej politiki dala naslednjo pokritost. SHA/URL/prvotni UTC treh shranjenih
regresijskih zapisnikov so v preverjenem
[registru njihovega izvora](../../scripts/vzorci/de-dfb-unattributed-provenance.json).
Ta register ne vsebuje celotnih sezonskih zajemov. Celotna lokalna diagnostika
ponovitve in primerjava prej sprejetih statistik sta v
`.superpowers/sdd/2026-10-17-unattributed-yellow-cards/task-1-report.md`;
to je prezrto lokalno dokazno gradivo, ki ni v gitu in ob svežem checkoutu
ni na voljo.

| kandidat | arhiv 2025/26 | tekoči zajem 2026/27 | preostale blokade |
| --- | --- | --- | --- |
| Nord | 302/306 | zavrnjen razpored; le 18 klubskih strani | 4 arhivski zapisniki; podvojen usmerjeni par ekip v tekočem razporedu |
| West | 297/306 | zavrnjen razpored; le 18 klubskih strani | 9 arhivskih zapisnikov; podvojen usmerjeni par ekip v tekočem razporedu |
| Südwest | 302/306 | 103/105 zajetih odigranih zapisnikov | 4 arhivski in 2 tekoča zapisnika |
| Bayern | 304/306 | 130/132 zajetih odigranih zapisnikov | 2 arhivska in 2 tekoča zapisnika |

West `2402201` ohrani neznani običajni rumeni pri `90+4` brez izmišljenega
nastopa. Bayern ima 32 sprejetih zapisnikov z dokazano dvojno vlogo profila
`112345`, od tega 10 z nepripisanim rumenim. To ne razreši drugih napak:
Südwest `2402929` še vedno nima potrjene začetne postave/vratarja,
`2402984` ima vstop izključenega igralca in `2403004` dva rumena brez
izključitve. Bayern `2425106` ostaja neskladen pri golih/izidu, `2425105`
pa ima nepodprt združen gol ter še nerešeno identiteto Noah Shawn/Noah
Agbaje. Napaka, ki jo parser vrne prvo, ni popoln seznam težav.

Te štiri lige zato ostanejo neaktivne do vseh preostalih preverjenih
pogojev. Politika ne dokazuje pripravljenosti drugih nemških lig ali
600 živih lig; FUSSBALL.DE ostaja neregistriran validator shranjenih strani.
