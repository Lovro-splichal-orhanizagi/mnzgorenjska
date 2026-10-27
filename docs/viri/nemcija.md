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

Ločeni `scripts/viri/fussball-statistika.mjs` zdaj iz istih izvirnih strani
in vezanih bajtov pisav preveri statistiko **posameznega** podprtega zapisnika.
`razberiFantasyZapisnik(mainHtml,lineupHtml,{fonts,id,lineupId})` sam pokliče
obstoječi validator in nato preveri zaprto slovnico vseh dogodkov, izrecna
polčasa 0–45/45–90, zaključka 45/90, Abpfiff in skladni hitri pregled.
Dokazi zahtevajo žive oznake HTML: komentar, surovo besedilo skripte ali
textarea, vsebina predloge in besedilo drugega atributa niso dokazni elementi.
URL dokazov je enolična živa kanonična povezava v glavi z isto šifro tekme;
izvorni odmiki in bajti vrstic za SHA-256 se pri tem ne spreminjajo.
Fragment postave se pred validatorjem preveri z zaprto slovnico oznak
`div`, `a`, `span`, `img` in `h3`, njihovih znanih atributov ter uravnoteženih
mej. Komentarji, neznane oznake/atributi, surovi ali inertni vsebniki,
tuji imenski prostori, gnezdene povezave in oznake znotraj atributa se
zavrnejo. To prepreči skrito postavo ali oznako vratarja; ne pomeni podpore
poljubni popravljeni strukturi HTML ali dodatnim predlogam postave.
`lineupId` je obvezna identiteta zajema postave; sama fragmentna postava
nima neodvisne šifre tekme. Imena se razberejo samo iz pripadajočih pisav,
dogodki pa se povežejo po točnih profilnih šifrah. `player-id` in `userid`
ostaneta ločena; `regSt` je `null`.
Glava postave podpira tudi izrecni navadni otrok `<span>Ime kluba</span>`
v `div.club-name`, opažen v obeh zajetih Bayernliga zapisnikih. Vsaka glava
ima en sam podprt otrok, skupaj morata biti natanko dva kluba in ujemati
se morata z naslovom zapisnika. Mešani, skriti, prazni ali dodatni otroci
in dodatne glave se zavrnejo; logotipi in `alt` niso nadomestilo imena.
Nespremenjeni izvorni glavi in provenienca sta v
`de-fussball-club-name-span.json`; sestavljene regresije uporabljajo
podprte postave in pisave, dokler celotna izvirnika nimata vseh pisav.
Javni `userid` podpira tudi točno opaženo obliko `I\.[0-9]{6}\.-{23}`
(npr. `I.715682.-----------------------` v Hessnu in
`I.573584.-----------------------` v Sachsenligi). Celoten neprosojni niz
ostane del identitete `de-fussball-userid-…`; šestmestno število ni nova
registrska številka in identitete ne združujemo po imenu. Oblika ne velja
za `player-id`. Napačna dolžina, velike/male črke, pripone, poizvedbe in
fragmenti se zavrnejo v obeh razčlenjevalnikih in domačem pretvorniku.
Nova migracija `20261026192000` razširi samo zasebno preverbo oblike in
servisni RPC; ohrani SHA-256/52-bitni ključ, preverbe trkov, atomski rollback,
prazni `search_path` in omejitve dostopa. Izvorne povezave, vrstice in
SHA-256 obeh neodvisnih prič so v `de-fussball-legacy-userid.json`.
Celotna izvirnika še ostaneta brez potrebnih zajetih pisav `0bivxpjv`
(Hessen) in `v0vmz4z1` (Sachsen); sestavljene regresije ne nadomestijo njune
celotne ponovitve. Povezava `href="#"` ali manjkajoča identiteta ni podprta.


Pravi vzorec Ilvesheim–Oftersheim (2 : 3, 11. 10. 2026) potrdi 30 nastopov,
22 začetnikov, osem dejanskih vstopov, 990 minut na stran, oba izrecna
90-minutna vratarja in pet pripisanih golov. Vstop pri 90 ima nič minut;
neuporabljene rezerve nimajo nastopa. Prejeti goli ostanejo po obstoječem
pravilu celotnega izida: tri za domače in dva za gostujoče udeležence,
brez clean sheeta. To ni sprememba točkovanja po igralčevem intervalu.

Tri anonimne običajne rumene ohrani ločeno v `nepripisaniRumeni`: stran,
surovi čas, osnovno minuto, dodatek, polčas, ordinal, SHA-256 izvirne
vrstice dogodka, ID tekme in njen kanonični URL. Njihovi prejemniki in
odbitki se ne ugibajo. To je lokalna dokazna oblika; ni DFB-jevo kodirano
opozorilo in še ni prikazano v uporabniškem vmesniku.

Offline ukaz sprejme samo lokalne datoteke; manifest mora z `matchUrl` in
`lineupUrl` vezati obe strani na zahtevani ID ter za vsako uporabljeno
pisavo podati datoteko in SHA-256:

```bash
node scripts/preveri-fussball-statistiko.mjs 031EQBPLF4000000VS5489BTVUS470OH scripts/vzorci/de-fussball-ilvesheim-main.html scripts/vzorci/de-fussball-ilvesheim-lineup.html scripts/vzorci/de-fussball-zapisnik.json
npm run test:fussball
```

Izhod 0 pomeni samo `reportStatistikaPripravljena:true`. Vedno ostaneta
`sezonskiUvozPodprt:false`, `activationEligible:false` in izvirni
`z.nepopoln:true`. Nepodprti ali neveljavni dokumenti imajo izhod 1,
izrecno `koda`/`razlog`, false-ready zastavice in `nastopi:[]`.
Stari validator in njegov izhod 3 ostajata nespremenjena.

Podprt je preverjeni navadni format brez pripisanih kartonov ter izrecna
oznaka zadete enajstmetrovke `Strafstoßtor` kot četrti živi otrok elementa
izida. Oznaka se ohrani pri golu in v `goliIzEnajstmetrovke`; komentarji,
skripte, podvojeni ali neznani dodatki in protislovje z avtogolom se zavrnejo.
Podprt je tudi pristno opaženi par razreda `row-event event-right own-goal`
in četrtega otroka izida `<span class="event-info">Eigentor</span>`; simetrična
leva oblika je preverjena s sestavljenim zapisnikom. Oba označevalca morata
biti prisotna skupaj, strelec mora biti aktiven in po preverjeni profilni
identiteti pripadati nasprotni postavi od strani, ki ji izid doda gol.
Običajno dokazovanje avtogola iz postave in zaporedja izidov ostane veljavno.
Izvirna vrstica Schermbeck–Lippstadt pri 47 in njen SHA-256/provenienca sta v
`de-fussball-own-goal.json`; celoten izvirnik še ni ponovljen, ker zajem pred
zavrnitvijo dogodka ni pridobil potrebne pisave izida `lksxyf9m`. Regresije
sestavijo opaženo obliko s podprtimi bajti izida in preverjeno postavo ter ne
predstavljajo celotnega izvirnega zapisnika. Dodatnih pisav nismo pridobivali.
Rdeči, drugi rumeni, mešane/neznane ikone,
pripisani kartoni, zgrešene enajstmetrovke, neznani
podrejeni elementi dogodkov, podaljšek ali prekinitev zadržijo vse nastope.
Prav tako se zavrne ponovni vstop, napačna stran, dvoumen istočasni strelec
in menjava, nedokazana menjava vloge vratarja ter polčasna menjava 45/46.
Neodvisna para pri 67 sta dovoljena. Dodatek ostane v dokazu, statistična
minuta pa je omejena na 90. Shranjena pristna oblika `90 &rsquo; <div>+N</div>`
je podprta pri zaključku polčasa 45 ali 90 in dodatku 1–30; vzorci ohranijo izvorni SHA-256 in
odmik v bajtih. Nove oblike zahtevajo pristne vzorce in nove regresije.

Hitri pregled sme pri tako dokazanem `45+N`/`90+N` objaviti samo `45`/`90`; vrsta,
stran, število in vrstni red dogodkov se še vedno ujemajo. Izrecno drugačen
dodatek se zavrne, izvirni dodatek in odtis vrstice ostaneta v dokazu.
Pristna vrstica Bersenbrück–Verden z `45 &rsquo; <div>+2</div>` je shranjena
z izvorno provenienco v `de-fussball-first-half-added-time.json`. Polčas,
dodatek in odtis vrstice se ohranijo; celoten zajeti izvirnik se offline
preveri z 32 nastopi. Izrecno drugačen dodatek, napačen
polčas, neurejena kronologija in dvoumna menjava pri 45 ostanejo zavrnjeni.
Dodatna opažena oblika slike `images.media.fussball.de/userfiles/…_p3.jpg`
je le okras: identiteto še vedno določata profilna povezava in preverjena
pisava, slike se ne prenašajo.

Še vedno manjkajo registriran vir, potrjena arhivska povezava 2025/26 za amatersko ligo,
popoln prehod obeh sezon, trajna uvozna vezava profilnih identitet ter
ločene preverbe vlog, cenika in vklopa. Ta ukaz ne dostopa do omrežja ali
baze in ne aktivira nobene lige; ne dokazuje podpore 600 ligam.

### Omejen zajem cele amaterske sezone

`scripts/zajemi-fussball-sezono.mjs capture` najprej prebere vse oglaševane
kroge iste lige/sezone, preveri enolične primarne tekme in skladne prestavitve,
nato preveri odigrane zapisnike. Uporabi samo opažene javne povezave in pisave.
Zahtevki tečejo zaporedno z vsaj šestimi sekundami med začetki, brez ponovitev
ali preusmeritev; zavrnitev, izziv ali napaka prenosa ustavi ves zajem.
Za `--max-requests` je obvezna meja 1–4000 (gostovani workflow največ 3000).
`--reports all` zahteva vse odigrane zapisnike; številka izrecno omeji vzorec.

```bash
node scripts/zajemi-fussball-sezono.mjs capture --seed-url <opaženi-URL-kroga> --staffel <ID-G> --season 2026/27 --max-requests 1000 --reports all --output <nova-mapa>
node scripts/zajemi-fussball-sezono.mjs verify <mapa>
```

Zajem ohrani izvirne dokumente s SHA-256, dnevnik zahtevkov, manifest in
rezultat s popolnim razporedom ter ločenimi razlogi za zavrnjene zapisnike.
Pisavo prenese šele, ko jo zahteva strogi razčlenjevalnik; nepovezane pisave
drugih prikaznih polj ne povzročijo dodatnih zahtevkov. Vsak zahtevani ID mora
biti prej opažen na isti strani/postavi, ponavljanje razčlenitve pa je omejeno.
Koledarski dan je pripet ob začetku; offline preverba zahteva isto kodo in
ponovi celoten prehod samo iz shranjenih bajtov, brez omrežnega nadomestila.
`preveri-fussball-sezono.yml` omogoča isti javni zajem na `main`, brez skrivnosti
ali dostopa do baze. Izhod vedno vsebuje `activationEligible:false`; ta
zbiralnik sam ne vpiše igralcev in ne vklopi lige.

Zajem Baden 40407936449 se je po 90 zahtevkih ustavil pri razčlenitvi
20. kroga (19. je zadnji uspešno zabeleženi). Vrstica `spielfrei` lahko
namesto praznega datuma vsebuje samo datum brez ure, opaženo
`Mo, 29.03.27 |`. Takšna vrstica ni tekma: še vedno zahteva en klub,
izrecni `spielfrei`, prazen izid in nobene povezave na zapisnik. Datum se
dekodira z vezano pisavo, mora biti veljaven in se ujemati z glavo istega
dne; ura ali drugačna/neprepoznana vsebina se zavrne. Izvirna stran in obe
pisavi s provenienco so v `de-fussball-baden-round20-20261026.json`.
Offline ponovitev ohrani vseh sedem tekem in eno prestavljeno referenco.
Zavrnjen zajem ostane zavrnjen; ne postane dovoljenje za uvoz ali arhiv.
Skupna poraba pred ponovitvijo je 453 od odobrenih 5000 zahtevkov.

Pregledani katalog `scripts/policies/de-bulk-candidates.json` zdaj vsebuje
tudi `de-verbandsliga-baden`. Tekoča šifra je
`03188V27L800000JVS5489BTVU7GTVLE-G:2026/27`, arhivska pa
`02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26`. Povezavo dokazujeta izvirni
tekoči izbirnik in neodvisni 20. krog ter shranjeni terminalni 301 in
arhivska stran. To ni aktivacija ali potrditev celotnih statistik.

Predaja uspešnega gostovanega para uporablja oba izvirna zajema
ločeno, brez prepisovanja dnevnikov ali ponovnega branja vira. Pred pisanjem
mora ponovno preveriti isti uspešen Actions run/commit in oba artefakta,
celotnost in svežino tekoče sezone, sosednji arhiv ter njegov dokaz istega
tekočega izvirnika. Nato uporabi obstoječi paketni uvoz: neaktivna registracija,
arhiv, tekoči razpored in zapisniki, vratarji/pozicije/cene, primerjava z
izvirnikom, obstojen začetni nočni predpomnilnik in njegov potrjeni zapis,
šele nato sveže preverbe roka, kadra in vklopa ter branje rezultata.
Vrzeli zadržijo ligo; uspeh samega zajema ne dovoli vklopa.

Gostovani par lahko z izrecnim `rollout_candidate=de-verbandsliga-baden`
po uspešnih obeh zajemih sam preda dokaz obstoječemu
`uvoz-pl-de-paketa.yml`. Ta možnost ne velja za navadne vzorce in privzeti
audit ostane samo bralen. Izbrana liga mora ustrezati obema katalogskima
šiframa in URL-jema; pred predajo se obe sezoni preverita tudi kot popolna
domača paketa. Pred sprejemom artefaktov naslednji workflow počaka na
končni uspeh izvornega zagona. Predaja ne potrebuje budnega klepeta in nima
zahtevkov do nogometnega vira; napake razčlenjevanja še vedno potrebujejo popravek.

Ročna predaja istega uspešnega para (brez novega zajema):

```bash
gh workflow run uvoz-pl-de-paketa.yml -f country=DE -f expected_sha=<isti-pregledani-main-SHA> -f max_requests=1 -f audit_run=<uspesen-parni-zagon> -f candidate=de-verbandsliga-baden
```

`max_requests` je tu obvezen stari vhod, ne dovoljenje za nadomestno branje;
pot `audit_run` ob manjkajočih ali neveljavnih dokazih ne preklopi na zbiranje.

### Hitri pregled pred celotnim zajemom (24. 10. 2026)

`zajemi-fussball-vzorec.mjs` preveri opaženi krog in največ en prej
oglaševani starejši krog ter največ tri odigrane zapisnike. Izrecni proračun
1–80 vključuje HTML, CSS, pisave in neuspele zahtevke. Zaporedni šestsekundni
začetki, ustavitev ob zavrnitvi/napaki ter preverba izvirnih bajtov so enaki
celotnemu zajemu. Veljavni datirani URL vsebuje resničen koledarski datum.

```bash
node scripts/zajemi-fussball-vzorec.mjs capture --seed-url <opazovani-URL> --staffel <ID-G> --season 2026/27 --max-requests 80 --reports 3 --output <nova-mapa>
node scripts/zajemi-fussball-vzorec.mjs verify <mapa>
```

`preveri-fussball-vzorec.yml` zažene isto preverbo na točnem `expected_sha`
trenutnega `main`, brez skrivnosti ali baze. Deli skupino sočasnosti
`fussball-public-season-source` s celotnim zajemom. Artefakt `fussball-screen-*`
je diagnostika, nikoli dovoljeni `fussball-season-*` uvozni dokaz; obe zastavici
`activationEligible` in `sezonskiUvozPodprt` ostaneta `false`.

Živi pregled Oberlige Schleswig-Holstein 24. 10. je po petih uspešnih GET
prebral krog in pisavi, nato odkril nepodprte dvojne vezaje v objavljenih
prikaznih URL. Ni zahteval nobenega zapisnika: to ni dokaz kakovosti postav.
Te slovnične vrzeli ne enačimo z zavrnitvijo vira. Mannheimovi starejši vzorci
pa vsebujejo tudi resnične `k.A.` udeležence in rdeče brez igralca; pisava ne
more povrniti podatka, ki ni objavljen. Trenutno je aktivnih pet lig DFB,
noben `fussball-public` kandidat še ni registriran ali aktiviran.

## Javni amaterski uvoz `fussball-public` (24. 10. 2026)

Ločeni vir `scripts/viri/fussball-public.mjs` poveže preverjen zajem z
običajnima uvoznikoma razporeda in zapisnikov. Osnovni lokalni validator
`fussball.mjs` in report-only zastavice ostanejo ločeni. Šifra novega vira je
`<32-znakovna-staffel>-G:<YYYY/YY>`; ne zamenjuj je s kodami DFB Datencentra.
Izvirno postavo, profile in pisave preveri `verifyFussballDirectory`, nato
`fussball-import.mjs` zahteva vse kroge in vse odigrane zapisnike, brez
vzorčenja, zavrnitev, podvojitev ali preteklih tekem brez preverjenega izida.
Nobene nove lige ta sprememba sama ne vpiše ali vklopi.

Podprta je pristno zajeta menjava pri 46′ v izrecnem drugem polčasu, z obema
profilnima povezavama. Ohrani minuto 46 (vstop 44 minut, izstop 46), ne sklepa
45. minute. Dvoumen 45′, anonimni dejanski udeleženci, rdeči brez prejemnika
in drugi nepodprti dogodki ostanejo zavrnjeni. Pristni vzorec je
`scripts/vzorci/de-fussball-46-manifest.json`; različice drugih predlog s tem
niso samodejno potrjene.

Polne profilne šifre `de-fussball-player-id-…` / `de-fussball-userid-…`
ostanejo v ločenih prostorih. Zasebni `private_fussball.identity_map` pred
uvozom rezervira enolične interne številčne ključe v razponu 2^52–2^53−1.
Trk ali spremenjena preslikava ustavita celoten paket. To niso registrske
številke DFB; imen, dresov ali podobnosti ne uporabljamo za zlivanje profilov.
Navadni anonimni rumeni ostanejo v `matches.import_warnings` z izvirnim SHA,
časom, stranjo in URL; obstoječi vmesnik pokaže število nepripisanih kartonov.

Operativno zaporedje:

1. Obstoječi `preveri-fussball-sezono.yml` na trenutnem `main` zajame `reports=all`
   z izrecnim proračunom. Zavrnitev ali napaka ustavi zajem; ni ponovitev prek
   drugega gostitelja ali seje. Celoten izvirni artefakt mora uspešno prestati
   offline ponovitev. Ne uporabljaj starega neuspelega Mannheimovega zajema za uvoz.
2. `uvoz-fussball-public.yml` sprejme le uspešen audit iz istega repozitorija,
   na `main` in točno istem commitu. Liga mora že obstajati kot neaktivna,
   imeti vir `fussball-public`, točno sezonsko šifro in nič fantasy ekip.
   Svež tekoči zajem je star največ 24 ur od začetka; računajo se tudi čakanja.
3. Po preverbi vseh bajtov in pokritosti sledi razpored, rezervacija identitet,
   nastopi/goli, začetne pozicije in cene ter običajna preverba pripravljenosti.
   Oba standardna uvoznika bereta `SLFF_FUSSBALL_CAPTURE`, brez novih zahtevkov
   k viru. Ročni arhiv potrebuje izrecno `SLFF_FUSSBALL_ARCHIVE_CODE` ter njegov
   ločeni popolni zajem prejšnje sezone; trenutni workflow je samo za tekočo.
4. Pred prvim vklopom sta še vedno potrebna dokazano redno osveževanje vira in
   ločen pregled cen, vratarjev, arhiva oziroma odobrene alternative ter svežega
   prihodnjega roka. Ta bootstrap nima cron urnika in nikoli ne kliče vklopa.

Predogled brez baze: `node scripts/preveri-fussball-uvoz.mjs preview --capture
<mapa> --code <staffel-G:YYYY/YY> --output <nova-datoteka.json>`. `npm run
test:fussball` preveri tudi adapter, pravice in meje uvoza; naravni SQL test je
izrecno omejen na odstranljivo bazo in se v CI izvede posebej.

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

## Preverjena Bayernova popravila (17. 10. 2026)

Štiri zgornje Bayernove blokade so razrešene z omejenimi, preverjenimi
popravili. `dfb-korekcije.json` za 2401658, 2401812 in 2425106 popravi samo
šest napačnih vmesnih oznak izida; vsa izvorna imena, strani, ure dogodkov,
končni izidi in polčasi ostanejo nespremenjeni. Register sprejme samo celotno
izvorno ali celotno že popravljeno zaporedje v obeh razdelkih. Delni popravek
ali druga metapodatkovna identiteta zahteva nov pregled. Surovi primarni
klubski/zvezni dokazi so vezani s SHA-256, URL in prvotnim UTC.

2425105 izrecno objavi dva strelca in dve ikoni pri skupnem času `45'`.
Razčlenitev sprejme eno skupno podprto ikono ali natanko eno podprto ikono
na razločen segment v objavljenem vrstnem redu. Ne sklepa o sodnikovem
dodatku iz drugih klubskih poročil. Prvi gol ostane enajstmetrovka zaradi
izrecnega izvornega `(Elfmeter)`.

`dfb-aliasi.json` veže samo 2425105, Bayern, domači Wacker Burghausen in
izvornega strelca Noah Shawn Agbaje na že navedenega Noah Agbaje/profil
374531. Javna profila DFB in FSV Zwickau objavita isti rojstni datum
23. 6. 2001; prestopna objava FSV potrdi prihod iz Wackerja. Celotni
semantični odtis vključuje postavi, profile, vse razdelke dogodkov,
uradne osebe in metapodatke. Spremenjen profil, stran, ime, dogodek ali
manjkajoči/spremenjeni dokazni bajti se zavrnejo. Tudi celoten poznejši
popravek imena zahteva pregled novega stanja. Vzdevek ne ustvari novega
igralca, nastopa ali minut. Gol uporablja ime postave, polji `imeVir` in
`dokazAliasa` ohranita izvorno ime in dokaz; izrecno opozorilo ostane v
ponovitvi. Druga liga te veje ne uporablja.

Izvirni štirje DFB dokumenti ter izbrani primarni dokazi imajo preverljivo
[varno provenienco](../../scripts/vzorci/de-dfb-bayern-provenance.json), brez
glav HTTP ali piškotkov. Regionalni izvorni odtis vključuje novi register in
vse njegove ter nove korekcijske dokazne datoteke. Zgodovinska odtisa
zajemov `a48fd89` in `671643e` ostaneta nespremenjena.

`node --test scripts/test-dfb-bayern-repairs.mjs` preveri pristne dokumente,
delne popravke, nasprotno stran, drugačen profil, spremenjene dokaze,
neveljavne skupine ikon in kanonično identiteto. Shranjena celotna lokalna
ponovitev brez HTTP potrdi 306/306 arhivskih in 132/132 tekočih Bayern
zapisnikov, popolna razporeda in izrecne začetne vratarje. Vsi prej sprejeti
regionalni in Nordostovi zapisniki/nastopi so nespremenjeni; druge regionalne
blokade ostanejo. To je dokaz kode in lokalne ponovitve, dejanska Actions
ponovitev, svežina, pregledani manifest, uvoz, cene in vklop imajo še vedno
ločena obstoječa varovala.

## Dodatna preverjena Nord/West popravila (18. 10. 2026)

Tri arhivske tekme dobijo šest omejenih popravkov vmesnega izida v
`dfb-korekcije.json`: Nord `2405451` (Wegner 1:2, Ghawilu 2:2), Nord
`2405547` (3:3, 4:3, 4:4) in West `2402204` (gostujoče izenačenje 1:1).
Nespremenjeni primarni klubski dokumenti in izvirni zajemi imajo
[SHA/URL/UTC provenienco](../../scripts/vzorci/de-dfb-nord-west-provenance.json).
Preveri se celotno prvotno ali celotno že popravljeno zaporedje in obe
izvorni razdelitvi golov. Spremenjen/manjkajoč dokaz, delni popravek ali
nepregledan odmik se zavrne; vsi dokazni bajti so del regionalnega odtisa.

VfB Lübeck pri `2405451` objavi Wegnerja 44 in Ghawiluja 45, DFB pa
45/45+2. Potrjena sta vrstni red in izida; izvornih ur ne popravljamo.
FSV Schöningen pri `2405547` potrdi tri zaključne oznake in ure, prva
Lohnejeva strelca pa ostaneta pripisana po DFB. RWO pri `2402204` potrdi
1:0, gostujoče izenačenje pred polčasom in končnih 3:1; izjava ne potrjuje
samostojno imena Keita ali točne ure 36. Te omejitve ostanejo v opozorilih
tudi po celotnem poznejšem izvirnem popravku oznak.

Lokalna ponovitev shranjenih dokumentov brez HTTP po tej spremembi potrdi
Nord 304/306 in West 298/306 arhivskih zapisnikov. Südwest ostane
304/306 arhivskih in 105/105 zajetih tekočih zapisnikov. Vsi prej sprejeti
zapisniki in nastopi ostanejo enaki, vključno z Bayernom in Nordostom.
To ni nov Actions zajem in ne osveži prvotnih časov dokumentov.

Nord ostane blokiran pri `2405268` (manjkajoče postave/dogodki) in
`2405441` (polčas 0:0 proti golu pri 29); West pri osmih Wuppertalerjevih
zapisnikih brez postav: `2402287`, `2402299`, `2402306`, `2402312`,
`2402325`, `2402332`, `2402346`, `2402352`. Tekoča razporeda obeh lig še
vedno vsebujeta po dva podvojena usmerjena para; njuna ohranjena zajema
imata samo 18 klubskih strani, brez zapisnikov. Südwest `2402929`
(12 začetnikov) in `2403004` (dva pripisana rumena brez izključitve) sta
ostala enako neveljavna tudi v ciljnem običajnem svežem DFB zajemu
18. 10. 2026. Noben od teh treh kandidatov še ni pripravljen za vklop.


## Omejena lokalna priprava pregledanih koledarjev Nord/West (18. 10. 2026)

`dfb-calendar.mjs` in nespremenljivi, s SHA-256 pripeti dejstveni register
`dfb-calendar-receipts.json` podpirata samo objavljeno orientacijo štirih
podvojenih usmerjenih parov v sezoni 2026/27: Nord 2423139/2423378 in
2423173/2423342, West 2425450/2425603 in 2425470/2425622. Register veže
izvorne klubske šifre, prikazna imena, kroge in izvirna URL/SHA/UTC obeh
sodelujočih klubskih strani. Ne vsebuje surovega HTML ali podatkov igralcev.
Parser ohrani objavljene strani, datume, izide in statistiko. Aktualni
`calendarEvidence` vsebuje SHA dejansko prebranih bajtov obeh različnih
sodelujočih strani; spreminjanje ovoja strani ne zahteva starega SHA.

Celota še vedno zahteva 306 tekem, 18 klubov, 34 krogov, devet tekem in
18 različnih klubov na krog ter vsak neusmerjeni par natanko dvakrat.
Nepregledan usmerjeni podvojeni par, druga identiteta ali manjkajoč oziroma
spremenjen dokaz se zavrne. Če vir popravi par v običajni doma/gostje,
uporabi strogo običajno preverjanje brez dokaza; to velja tudi, če drugi
pregledani par še ostaja podvojen. Nobena tekma se samodejno ne obrne.

Prvotna priprava je pokrivala parser in kanonično obliko. Stare različice
regionalnega manifesta v1/v2/v3 izrecno zavrnejo vsak `calendarEvidence`;
za koledarske dokaze je zdaj na voljo spodnja različica v4. Prvotna priprava
ni dodala migracije, dovoljenja vklopa ali zgodovinske izjeme. Zgodovinska
politika ostane omejena na dve obstoječi Südwestovi arhivski tekmi. Popolnost tekočih zapisnikov, začetnih postav in
izrecnih vratarjev ostane obvezna. Lokalna ponovitev starih zajemov ne
osveži zajema ali potrdi pripravljenosti Norda/West za vklop.

`node --test scripts/test-dfb-calendar.mjs` pokriva identitete, dve dokazni
strani, popravljene pare, sezonsko obliko, kanonične statistike in zavrnitev
vklopa. Modul in register sta vključena v regionalni in Nordostov izvorni
odtis; Nordostova kanonična oblika in ločeni pogoji vklopa se ne spreminjajo.

## Regionalni manifest v4 za pregledane koledarje

Migracija `20261018223000` doda ločeno zasebno SQL preverjanje samo za
Nord/West. Manifest v4 veže `calendarReceiptSha256` in izrecni
`provenanceVersion` 1 (preverjen neposredni zajem) ali 2 (preverjena
ponovitev). Priprava ga izbere samodejno, ko resnične kanonične tekme
vsebujejo pregledani `calendarEvidence`. Izvorni commit neposrednih
Nord/West zajemov zdaj veže tudi celotno izvedbeno kodo in SQL vrata.

SQL neodvisno preveri točnih osem identitet, izvorne klubske šifre, kroge,
nespremenljivi SHA registra in URL/SHA dveh različnih sodelujočih strani.
Vsak neusmerjeni par ostane natanko dvakrat; običajna tekma ne sme nositi
izjeme. Razpored ostane 306/18/34 z izvirnimi stranmi. Preostanek vrat
ohrani vsa dosedanja preverjanja uvoženih nastopov/golov, vratarjev, cen,
kadra 2/5/5/3 in resničnega prihodnjega uradnega roka. V1/v2/v3 tudi v
SQL zavrnejo vsak koledarski dokaz. Nordost in Südwestova pot v3 ostaneta
ločena. Javnih podpisov RPC ni sprememb; pravica ostane samo servisna.

Sam koledarski V4 ne odpusti nobenega arhivskega ali tekočega zapisnika.
Ločena sestavljena zgodovinska pot spodaj podpira samo točno pregledani
`statisticsPolicy`; sveži celotni tekoči zajemi ostanejo obvezni. Noben
lokalni test ali prejšnji zajem ne osveži izvornih časov in ne vklopi lige.

`node scripts/test-dfb-calendar-release-sql.mjs` zahteva izrecna
`SUPABASE_DB_CONTAINER` in `SUPABASE_TEST_DB` odstranljive baze; vse
fixture in mutacije razveljavi. Preveri obe množici identitet/dokazov in
celotno shranjeno sezono s ponovljenimi pregledanimi usmerjenimi pari ter
dosedanje regresije statistike, cen in rokov.

## Točne zgodovinske izjeme Nord/West v sestavljenem v4

Migracija `20261018231000` registrira samo spodnjih deset arhivskih izjem
2025/26. Prvotni shranjeni zajem je po vseh že pregledanih popravkih dal
Nord 304/306 in West 298/306 popolnih zapisnikov. Razlog, točni izvorni
identiteti klubov, objavljeni datum/izid, URL in SHA ostanejo vezani na
[skupni register](../../scripts/policies/historical-statistics-exclusions.json);
[DFB dejstveni zapis](../../scripts/viri/dfb-historical-receipts.json) doda
prvotni UTC, točno uro začetka, arhivsko prikazno ime kluba in nespremenjeno
strogo diagnostiko. Nobena statistika igralca se ne rekonstruira.

| liga | ID arhiva | preostala izvorna napaka |
| --- | --- | --- |
| Nord | 2405268 | manjkajoča postava/klop |
| Nord | 2405441 | polčas v nasprotju s časovno označenim golom |
| West | 2402287, 2402299, 2402306, 2402312, 2402325, 2402332, 2402346, 2402352 | manjkajoča postava/klop |

Nordova vira objavita uri 19:30 in 16:00; Westovi 18:00, 19:30 ali 14:00.
Ure se preverijo po točni tekmi. Nordov arhiv za izvorni
`sv-werder-bremen-ii` objavi ime `Werder Bremen`; to ostane arhivsko ime,
brez samodejne zamenjave s prikaznim imenom tekoče sezone.

Manifest ostane **v4** in `provenanceVersion = 2`. Neobvezni
`statisticsPolicy` je dovoljen samo za točno ligo, nespremenljivi SHA
registrirane politike in datum resnične prihodnje prve fantasy tekme. Obe
sezoni zahtevata dejanski uspešen policy replay; izvirni tekoči zajem mora
biti strogo popoln in uspešen. Skupni SQL preverjevalnik koledarske oblike
je isti za običajni in zgodovinski v4. Nobena različica manifesta, izvirna
lineage ali ničelna statistika se ne prepiše za obhod drugih vrat.

Ista servisna `prepare_dfb_historical_statistics` pred navadnim uvozom
atomarno namesti samo resnične klube/kroge, točnih 2 oziroma 8 naslovov
tekem in zaprte označbe. Liga mora biti neaktivna in brez uporabniških
ekip. `starters`, `appearances` in `goals` ostanejo `null`;
`imported_at` ostane NULL. Nameščeni označevalci se pred vsakim runtime
uvozom v celoti preverijo in ti zapisniki se preskočijo pred zahtevkom.
Nova ali drugače pokvarjena tekma nikoli ne dobi te izjeme.

Isti javni servisni release RPC nato neodvisno primerja vse znane
nastope/gole in vse nameščene naslove, preveri resnične trenutne vratarje,
cene, veljaven kader 2/5/5/3 in prihodnji uradni rok. Südwestova različica
v3 in Nordostov ločeni RPC ostaneta nespremenjena.

`test-dfb-nord-west-historical.mjs` preveri izvirne bajte, identitete,
nameščene označbe ter sestavljeni manifest.
`test-dfb-nord-west-historical-sql.mjs` zahteva izrecno odstranljivo bazo,
regiji poganja zaporedoma in vse spremembe razveljavi. Njegove posamezne
postave/nastopi/goli so jasno označeni **TEST ONLY**; resnični so koledarski
naslovi in točna nedosegljiva dokazila, testne individualne vrstice nikoli
niso izvorni dokaz ali produkcijski paket.


## West: točne predzačetne izjeme iz dveh sezon (22. 10. 2026)

Sveži celotni zajem `39829375576`, posel `120001142581`, commit
`e4bdca52b315b8f5ce7fc4edfafb787e5737ef4b` ima 134 zaprtih dokumentov,
116 odigranih tekem in 114 popolnih zapisnikov. Transportnih napak,
opozoril, izzivov in klubov brez izrecnega vratarja ni. Preostali napaki sta
`2425409` (Wattenscheid–Schalke II, 21. 8., 3:0; samo deset gostujočih
začetnikov) in `2425474` (Schalke II–Köln II, 20. 10., 1:3; brez postav).
Obe sta pred prvo predlagano fantasy tekmo 23. 10. Podatkov igralcev ne
rekonstruiramo iz rezultata ali poročil klubov.

Nova politika `de-dfb-west-prelaunch-unavailable-v2` ohrani vseh osem
arhivskih opisov in doda samo ta dva opisa s sezono `2026/27`. Njen SHA je
`487fb62e608c75ab798c18500f59ff01c16e043513089603e66a7b338acce95e`.
Migracija `20261022185000` doda novo nespremenljivo različico; stara v1
ostane v SQL registru. Lastnikovo dovoljenje za pregledane nemške izjeme
pred začetkom fantasy igre velja ob popolnosti vseh poznejših zapisnikov.

Ponovitev s to politiko zahteva točno dve prvotni semantični napaki ter
ustrezni manjkajoči identiteti in skupni števili. Nobena dodatna napaka,
transportni status, opozorilo ali manjkajoč izvorni dokument ne postane
izjema. Celotna ponovitev ponovno preveri vseh 114 drugih tekočih
zapisnikov in točne bajte/diagnozi obeh izjem. Prvotni zajem ostane star
največ 12 ur; ponovitev ne pomladi časa. Arhiv `39032122832` ostane isti,
z največ sedemdnevno veljavnostjo.

V4 vsebuje 298 razpoložljivih in osem nerazpoložljivih arhivskih statistik
ter 114 razpoložljivih in dve nerazpoložljivi tekoči statistiki. Vsaka
izjema je strogo pred preverjenim prvim fantasy datumom. Namestitev
uporabi dejansko sezono vsake oznake; izvajalnik preskoči samo oznake
zahtevane sezone. Izidi ostanejo uradni, individualna statistika ostane
izrecno nerazpoložljiva. Nord, Südwest in drugi ponudniki ohranijo
prejšnja pravila. Uvoz, cene, native primerjava in dejanski prihodnji rok
morajo uspeti pred vklopom; sam zajem ali testni vklop ne aktivira produkcije.


## Bulk capture and activation (25 October 2026)

`uvoz-pl-de-paketa.yml` selects all reviewed candidates for PL, DE or ALL in one dispatch. Exact current/archive tuples live in `scripts/policies/pl-bulk-candidates.json` and `de-bulk-candidates.json`. Catalog presence never establishes readiness. Source collectors preserve original bytes; the installed provider replay, complete native snapshot comparison and ordinary native activation RPC must all pass. A semantic report failure holds that league; a refusal/transport failure stops its host. No guessed keepers, missing scores, new historical exclusions or active repricing are admitted.

The source stage has no database credentials. Native imports use an offline adapter with network restricted to the exact database REST origin. Admission receipts are sidecars outside the provider's closed evidence directory. Source packs expire after 24 hours, pricing receipts after one hour; the native gate checks an actual future untouched opening round at activation. Every mutation requires first-attempt Actions on the exact current main SHA, the same inactive tuple and no fantasy data. Interrupted writes are UNKNOWN, retained and never automatically replayed.

The explicit dispatch budget counts actual requests, including failures, separately per host. PZPN collector instances additionally cap at 1000 requests; FUSSBALL at 4000. There are no new source requests during implementation. Previously spent diagnostic budgets are not reset by this feature. Any operational source run needs its recorded bounded scope and request authorization.

Initial catalog on 25 October: Mannheim and Schleswig-Holstein current seasons. At that time no verified archive staffel pair existed in the retained evidence, so both held before any GET. Supplying observed reviewed archive tuples is configuration, not a new importer. This catalog does not contain 600 German leagues. Active FUSSBALL leagues prepare and replay a fresh full current-season capture before nightly import; preparation failure stops that provider for the run. Source-only audits, bulk jobs and nightly readers use creation-ordered host coordination before requests, without holding a host mutex while waiting. Future large catalogs still need practical request/time budgets; a six-hour job is not unlimited collection capacity.


The deployed workflow separates inactive preparation from activation. German preparation seeds a verified original-byte envelope; Actions saves that cache successfully and records the exact run/SHA receipt before the activation phase can run. Activation replays source proof and rechecks native state without repeating imports. Nightly refresh reuses complete reports/lineups/fonts with their unchanged original timestamps, fetches fresh schedules and new reports, and atomically replaces a bounded latest cache. Missing/corrupt cache fails closed rather than redownloading complete reports. Source reader enumeration rejects partial/duplicate inventories and reruns; use a new first-attempt dispatch.


## Operational repairs (26 October 2026)

Active/current DFB nightly imports opt into per-report isolation. A rejected report retains its original bytes and SHA in private evidence, preserves previous verified player statistics and leaves the exact existing fixture pending. Good sibling reports continue. Pending imports exit distinctly, never record a completed refresh, and retry at most ten due pending IDs after six hours. Source/transport refusals and fixture/header mismatches remain fatal. Historical exclusions are unchanged.

Pending reports cannot age into completed mini-league rounds or weekly result emails. Provisional points remain visible; affected market inputs wait. Automatic weekly DFB repricing defers the entire league before reading the provisional percentile cohort. Only a successful native report write plus atomic resolution clears the marker; a recompute failure rolls back resolution. The private raw evidence is service-only.

FUSSBALL named cards now retain published identities, source clocks and dismissal intervals through both bulk and ordinary import. Substituted-out bench recipients retain their actual substitution time and later red-card clock. Positive named-card DOM examples are explicitly synthetic; no live named-card grammar has yet been observed. The retained Mannheim and Schleswig anonymous-red examples publish neither a recipient link in the timeline nor a card marker in the lineup, so they remain HOLD.

Schleswig's current season selectors independently advertise archive staffel `02TC3RCRHK000004VS5489BTVVQ0O654-G` (2025/26). Original archive HTML binds that selected season and its form URL, although its SEO canonical points to the current parent. The collector accepts only this explicitly reviewed adjacent-season family, with the same identity check during capture and closed replay. Default current/report identity validation remains strict. Mannheim still has no verified archive pairing. This resolves catalog identity only; the archive's full schedule/reports, goalkeeper coverage, prices and native launch gate remain unvalidated.

Three bounded archive requests were recorded under the existing 80-request diagnostic allowance: terminal 301, separate redirect metadata witness, and the observed canonical target (200). Total spent is 23/80, including the previous 20; no budget was reset. Redirects are not automatically followed. Original evidence and the offline identity replay are in `league-rollout-evidence/2026-10-26-german-operational/`. No new German league was activated by these code changes.

## Izrecni prosti klubi v javnem razporedu (26. 10. 2026)

Razpored Baden Verbandslige je v pregledu Actions `40366437379` vseboval
vrstico `FC Zuzenhausen : spielfrei`. To je prost klub, ne tekma brez izida.
Razčlenjevalnik preskoči samo opaženo obliko z enim klubom, izrecnim živim
`spielfrei`, praznim datumom in izidom ter brez povezave zapisnika. Povezava
tekme, drugi klub, rezultat ali skrita oznaka te izjeme ne dobijo. Izvirna
vrstica in njen SHA/odmik sta v `de-fussball-baden-bye-provenance.json`.
Ponovitev celotne shranjene strani potrdi sedem resničnih tekem 11. kroga;
to ni dokaz popolnosti njihovih zapisnikov ali dovoljenje za vklop lige.


Živi paketni pregled `40369728901` je razkril še tri ozke vrzeli. Ime
`DJK/&#8203;FC Ziegelhausen-Peterstal` v razporedu vsebuje prikazni U+200B,
ki ga glava zapisnika nima; razpored odstrani samo ta nevidni prelom pri
imenih klubov. Izrecni `Ausfall` v praznem rezultatskem polju ohrani tekmo
z `rezultat:null`, nikoli 0:0; pretekla tekma brez izida še vedno prepreči
popoln sezonski uvoz. Pristna celica Westfalna ima ločeno provenienco.
Časovnik zajema po vsakem prebujanju ponovno preveri dejanski šestsekundni
razmik. Stari paket je zaradi enega razmika 5999 ms neuspešen dokaz in ne
postane dopusten uvoz; njegove posamezne nespremenjene strani so uporabne
za diagnostiko brez dodatnih zahtevkov. Popravilo imen omogoči lokalno
preverbo prvega Badenovega zapisnika (30 nastopov, dva gola, oba vratarja),
kar še ni dokaz cele lige.

### Gostovani zaporedni audit dveh sezon (26. 10. 2026)

`preveri-fussball-sezono.yml` lahko po uspešnem tekočem zajemu nadaljuje z
izrecno odobrenim sosednjim arhivom na drugem gostovanem GitHub poslu.
Prazen `archive_json` ohrani običajen enosezonski vmesnik. Za par je obvezen
`reports=all`, točen pregledani `expected_sha` na `main` v izvornem repozitoriju
in prvi poskus ročnega zagona. `archive_json` vsebuje samo `seedUrl`, `staffel`,
`season`, `maxRequests` ter po potrebi `observedSeedUrl` za izrecno pregledano
normalizacijo URL. Vsaka sezona ima največ 3000 zahtevkov in 360 minut.

`scripts/fussball-season-pilot.mjs validate` pred prvim branjem rezervira
`prior_requests + max_requests + archive.maxRequests <= total_request_cap`.
Odobreni Baden pilot šteje že porabljenih **363** (prvotnih 361 in dva arhivska pregleda), največ **1500** za 2026/27
(`03188V27L800000JVS5489BTVU7GTVLE-G`) in **3000** za opaženi arhiv 2025/26
(`02TGLSVQ1800000IVS5489BTVTLPPK10-G`), skupaj pod mejo **5000**. Prejšnje
porabe ni dovoljeno ponastaviti; to varovalo zavrne manj kot 363 in mejo nad
5000. Nov operativni poskus potrebuje novo pregledano kumulativno porabo.

Tekoči posel šele po uspešnem zajemu in neodvisnem offline ponavljanju izda
`archive_allowed` in dejansko število zahtevkov. Arhivski posel prenese samo
artefakt tega zagona, znova preveri izvirnike z isto nespremenljivo kodo ter
veže točen arhivski URL, ID in sezono na edini živi izbirnik sezon izvirne
tekoče strani. Pred arhivskim branjem ponovno preveri preostali proračun.
Napaka prenosa, zavrnitev vira, delni zajem ali neuspešna offline preverba
ustavijo nadaljevanje. Semantično zavrnjeni zapisniki ostanejo v dokazu in
ne preprečijo ločeno odobrenega arhivskega audita, če je bil ves vir uspešno
prebran. Še vedno preprečujejo ustrezno poznejšo pripravljenost za uvoz.

Oba posla uporabljata obstoječi vrstni red bralcev istega gostitelja in vsaj
šest sekund med začetki zahtevkov, brez ponovitev ali nadomestnega dostopa.
Arhiv ne čaka na zaključek svojega starševskega zagona. Tekoči artefakt ostane
`fussball-season-<run_id>`, arhivski je ločen
`fussball-season-archive-<run_id>` in ni sprejet kot tekoči uvozni dokaz.
To je izključno audit vira brez baze, fotografij, registracije ali vklopa lige;
obstoječa produkcijska uvozna vrata se ne spreminjajo.

Badenov [prvi arhivski pregled](https://github.com/Lovro-splichal-orhanizagi/mnzgorenjska/actions/runs/40403312901)
je porabil en zahtevek in se ustavil ob HTTP 301 s kratkega izbirniškega URL
na opaženi daljši URL; preusmeritvi ni sledil. Ločeni
[pregled kanoničnega arhivskega URL](https://github.com/Lovro-splichal-orhanizagi/mnzgorenjska/actions/runs/40404124953)
je porabil še en zahtevek in shranil izvirni HTTP 200 header, preden je običajni
razčlenjevalnik zavrnil SEO canonical tekoče sezone. Nespremenjena izvirnika
tekoče strani in arhivske glave ter točni računi pregledov so v
`de-fussball-baden-archive-20261026.json` in pripadajočih HTML vzorcih.

Za ta opaženi par `archive_json.seedUrl` poda daljši URL,
`observedSeedUrl` pa ohrani točen kratek URL iz tekočega živega izbirnika.
Razlika je dovoljena samo ob ujemanju točnega pregledanega terminalnega
301 računa in obeh sezonskih identitet; omrežni odjemalec še vedno ne sledi
preusmeritvam. Arhivski manifest v3 ohrani vse izvirne bajte tekoče strani
pod vsebinskim SHA-256 in njen ploski izvirni račun, brez novih zahtevkov ali
spremenjenih časov. Celoten dokaz starša ima svoj SHA-256. Tako zajem kot
običajna offline preverba v3 preverita isti živi izbirnik, opaženo normalizacijo,
arhivsko izbrano sezono in njen obrazec z obstoječim strogim
`inspectFussballArchivePage`. Manjkajoč ali spremenjen dokaz oziroma simbolna
povezava se zavrne. Običajna identiteta strani brez tega dokaza ostane stroga;
pregled glave še ne dokazuje kakovosti celotnega arhiva.

## Prejemniki kartonov po glasovanju (27. 10. 2026)

Ločena politika `fussball-community-cards-v1` omogoča glasovanje za manjkajočega
prejemnika uradnega kartona. Format zajema je `cardPolicy: community-v1`;
privzeti strogi format in že aktivne DFB Regionallige se ne spreminjajo.
Prvi pregledani kandidat z `communityCards: true` je samo
`de-verbandsliga-baden`. Sama namestitev politike ne vklopi lige.

Nespremenljivi zasebni `cardEnvelope` vsebuje izvirne bajte zapisnika, postave
in pisav ter SHA-256, vse uradne dogodke in javno zgodovinsko postavo z rezervami.
Glas lahko določi samo prejemnika na uradni strani dogodka; vrste, časa,
strani, izida, identitete ali vloge vratarja ne more popraviti. Ni izbire
»brez kartona«. Fotografije se ne uporabljajo. Prag `prag_glasov_karton` je
privzeto 3; veljajo obstoječe omejitve uporabnikov in poznavalec iste lige.
Predlog ostane popravljiv do uspešne uporabe; nasprotujoč drugi rumeni ali
menjava ostaneta odprta za pregled, brez ugibanja minut.

Nepripisan navadni rumeni ohrani dokazane nastope, odbitek počaka na prejemnika.
Nepripisan rdeči shrani uradni izid in dokaz, vendar nima individualnih nastopov
ali golov. Spremenjena revizija do uspešne ponovitve prav tako ne sme objaviti
starih ali praznih statistik kot dokončnih. `pending_cards` označi fantasy
krog kot začasen, vrne NULL točke in zadrži dokončne rezultate, obvestila in
prizadeto cenitev. Atomski servisni zapis preveri aktualne glasove/revizijo,
strogo časovnico, vratarja in gole, ohrani potrjene asistence ter skupaj
potrdi prejemnike in preračuna točke.

`replay-fussball-cards.yml` teče vsako uro in ročno po izbrani ligi. V enem
zagonu obdela največ 10 predlogov iz izvirnikov v bazi, izmenično po tekoči
sezoni in arhivu. Ne bere FUSSBALL.DE, ne potrebuje modela za vsako tekmo,
ne ponavlja dvoumnih zapisov v bazo in po neuspelem predlogu ne ugiba.
Uporablja isti vrstni red nemških zapisovalcev kot običajni uvoz. Navaden,
nočni in paketni uvoz uporabljajo isto registracijo in atomsko ponovitev;
odtis predpomnilnika vključuje SHA izvirne revizije, tudi če razčlenjeno telo
zapisnika izgleda enako.

Vklop še vedno zahteva celoten preverjen tekoči in arhivski zajem brez drugih
napak, točno domačo inventuro vseh odigranih zapisnikov, vratarje, cene,
dosegljiv veljaven kader, nedotaknjen prihodnji prvi krog in trajno shranjen
predpomnilnik istega zagona. Samo točno registrirani čakajoči kartoni so
dovoljena izjema; manjkajoči javni profili in nepodprti dogodki ostanejo razlog
za ustavitev. Potrdilo vira, predpomnilnika in inventure se pred vklopom
ponovno veže na aktualno stanje v bazi.

Zadnji Badenov zajem `40416972177` je ostal delni in neuspešen: 508 dejanskih
zahtevkov, skupaj **961/5000**. Pri prvih 55 celotnih izvirnikih nova strožja
preverba da 39 popolnih, 8 tipiziranih čakajočih in 8 drugih zavrnjenih
(6 povezav igralcev in 2 obliki slike; eden od prej 9 rdečih je skrival še
napako oblike). To je diagnostika, ne dovoljenje za vklop. Implementacija
glasovanja sama po sebi ne pomeni novih aktivnih lig ali 600 preverjenih lig.

Preverbe: `npm run test:fussball`, `npm run test:bulk`, offline UI skripte
`test-community-cards-ui.mjs` in `test-community-round-ui.mjs`, ter izrecno
disposable `test-fussball-community-sql.mjs` in
`test-fussball-community-integration.mjs`. Slednja ponovi resnični shranjeni
zapisnik prek pravih glasov in atomske baze v eni transakciji z rollback.

### Opažene oblike zapisnikov in nejavne rezerve (27. 10. 2026)

Dekorativni naslov `//images.media.fussball.de/userfiles/..._p3.jpg` je dovoljen
pod enakimi omejitvami gostitelja in poti kot različica `https:`. Slike se ne
prenašajo; identiteta še vedno zahteva javni profil in pripadajočo pisavo.
Pravi shranjeni zapisnik Heddesheim–Eppelheim ohrani 32 nastopov, tri gole,
izid 3–0 in pravilne minute ter prestane pretvorbo v domači uvozni model.

Postava lahko izpusti samo točno opaženo anonimno neuporabljeno rezervo:
`href="#"`, prazno ime, priimek `k.A.`, nadomestno sliko in številko dresa
znotraj pravilne domače oziroma gostujoče klopi. O izpustu ostane opozorilo;
izvirni bajti se ohranijo, identiteta ali kandidat za glasovanje se ne ustvari.
Anonimni začetni igralec, strelec, menjava ali povezani karton še vedno
zavrne zapisnik. Preverbe polnih nastopov z vstavljeno nespremenjeno vrstico
klopi so izrecno sestavljeni primeri, ne dokaz popolnosti njenih izvornih tekem.

Ponovitev prvih 55 zapisnikov iz neuspelega zajema `40416972177` brez omrežja
po teh popravkih da **40 popolnih, 9 čakajočih na kartone, 1 zavrnjenega**
zaradi treh nejavnih začetnih igralcev in **5 z manjkajočimi izvirniki pisav**.
Teh pet postav je razčlenljivih, polni zapisniki pa niso dokazani: stari parser
je pred zajemom potrebnih pisav že zavrnil postavo. Delni zajem ostane
neuspešen in ne omogoča vklopa; potrebna je nova celotna preverba. Poraba ostaja
**961/5000**, saj diagnostika ni poslala nobenega zahtevka.
