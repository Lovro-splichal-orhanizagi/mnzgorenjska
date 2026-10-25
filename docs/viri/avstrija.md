# Avstrija

Država `AT` ("Österreich", migracija 20261009160000) ima vmesnik v nemščini
(`src/i18n/de/`, jezik `de`, `de-AT`, `JEZIK_DRZAVE.AT`), vstop `slff.eu/at`,
kartico ob deljenju `at.html` (Caddy jo vrne za `/at` in `?t=at-…`), nemško
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Servus") in avstrijska imena lastnikov
hišnih ekip ("Lukas Gruber"). **Šifra avstrijske lige se začne s `at-`.**
Ugib: brskalnik `de-AT` ali pas `Europe/Vienna` — sama nemščina (`de`,
`de-DE`) ni Avstrija, ker je tudi Nemčija in Švica; tujec z nemškim
brskalnikom pa dobi nemščino. Izrazi kot v FPL: Kader, Startelf, Bank,
Kapitän, Vizekapitän, Transfers, `krog` je vedno **Runde**, vratar je
"Tormann", pripomoček `klop_plus` je "Bank+". Ime lige stoji za dvopičjem
("Die Fantasy-Liga ist eröffnet: {liga}"), `ligaVTozilniku` ga pusti. Zveze,
tekmovanja in vir vpiše svoja migracija. Stran Pozicije je v meniju kot v
Sloveniji (če avstrijski vir pozicije prinese, jo skrij v `Navbar.tsx` kot za
SK). Nemškega kanala v HelpStacku še ni: `Podpora.tsx` za `de` uporabi
slovenskega.

## Avstrija — vir `oefb`

Vir `oefb` (`scripts/viri/oefb.mjs`) bere **oefb.at** (Ligen & Bewerbe), kjer
ÖFB in vseh devet deželnih zvez vodijo vsa tekmovanja do najnižje Klasse.
Strani izriše JavaScript, podatki pa so v strani kot JSON
(`SG.container.appPreloads['…']=[{…}];`) — beremo JSON, ne HTML.

- **Šifra lige je id tekmovanja** (Bewerb, `/bewerbe/Bewerb/<id>/`); vsaka
  sezona ima svojega, seznam sezon je na strani tekmovanja (`saisonen`).
- **Razpored** `/bewerbe/Bewerb/Spielplan/<id>/`: `ergebnisse` + `spiele`, vse
  tekme z `runde`, `anstoss` (ms, dunajski čas) in izidom. `Neuaustragung` je
  razveljavljena tekma, ki se ponovi (ponovitev je svoja vrstica, lahko z
  zamenjanim domačinom) — izpustimo jo. **Kontumacija** ima izid in namesto
  zapisnika povezavo `strafverifiziert` (`#`); v arhivih 14 lig pet takih.
  Kot rezerva šteje še 3:0 s prazno postavo po tednu dni.
  oefb.at kdaj za minuto vrne stran razporeda s statusom 200, a brez JSON-a
  razporeda (`appPreloads['NO_DATA']`): nočni uvoz je javljal "Razporeda ni
  bilo mogoče razbrati", uvoz zapisnikov pa tiho 0 tekem (13.–15. 10. 2026).
  `stranRazporeda` jo prebere znova po 30 s in 2 min, nato uvoz pade z
  jasno napako; taka stran ne gre v predpomnilnik (`zaPredpomnilnik`).
- **Zapisnik** `/bewerbe/Spiel/Spielbericht/<id>/`: začetniki v skupinah
  `tor`/`abwehr`/`mittelfeld`/`sturm` ali vsi v `weitere`, klop v `ersatz`,
  šifra igralca iz `/Profile/Spieler/<id>` → `reg_st`. Dogodki: `goal`
  (`eigentor` je pri ekipi strelca, `hinweis: "Strafstoß"` = 11 m),
  `playerchange` (primary noter, secondary ven), `card-yellow`,
  `card-yellow-red` (prvi rumeni je svoj dogodek), `card-red`. Minuta je
  `minuteString` ("67", "HZ" = 45, "90+5" → 90, "SE" = po koncu → 90).
  Kartoni trenerjev (niso v postavi) ne štejejo.
- **Pozicije**: skupine vnese **klub sam**, zato jih ima na isti tekmi ena
  ekipa, druga ne. S skupinami → GK/DEF/MID/FWD iz zapisnika; brez njih je
  vratar le, če ima dres "T" (rezervni "ET") — namig kot pri mlsz, ostali na
  glasovanje. *Uskladi pozicije* z `vir = oefb`.
- **Nastopi gredo po šifri igralca, ne po dresu** (`nastopi` v viru):
  vratar "T" nima številke. Leteče menjave šteje `minuteIzPreklopov`.
- Ime igralca je "Ime Priimek" s poljem `nachname`; uvoz dobi "Priimek Ime".
  Ključ kluba ohrani ä, ö, ü, ß; razpored piše kratko ime, uvoz ga vzame od tam.
- **Isto ime, drug klub.** Kratko ime je ime kraja, zato ima šest krajev
  klub v dveh deželah (Rust, Mannersdorf: Gradiščanska in NÖ; Gmünd: Koroška
  in NÖ; Reichenau, Berg: Koroška in OÖ/NÖ; Pischelsdorf: Štajerska in OÖ).
  `IME_DRUSTVA` v viru preimenuje ekipo po šifri društva
  (`vereine.oefb.at/<društvo>/`) v "Rust (NÖ)" ipd.; koroški in štajerski
  klubi ostanejo, kot so. Pregled 9. 10. 2026 je zajel vseh 153 lig; ob novi
  ligi preveri trke znova in nov trk dodaj tja.
- **Preimenovanje sredi sezone** (Koroška, oktober 2026: "Austria Klagenfurt
  Amat." → "Austria Klagenfurt 1b", "SG ASKÖ Wölfnitz / SV Oberglan Juniors"
  → "… 1b"): razpored pod novim imenom ustvari drug klub in podvoji vse tekme.
  Vzdevek gre v `ISTI_KLUB_AT` v viru, dvojnik se združi z *Zdruzi podvojena
  kluba*.

**Kje najti šifre.** Izbirnik zvez in lig na oefb.at kliče javni posrednik
strani (`/proxy/oefb3/1469066385635312874_<ključ>?proxyUrl=<…>`, ključ je
zadnji del poti z `_` namesto `/;=:`) z
`http://portale-datenservice:8080/datenservice/rest/oefb/datenservice/saisonen/<zveza>`,
`…/gruppen/<zveza>;jahr=<leto2>;homepage=1473983024629548524`
in `…/bewerbe/<skupina>;homepage=1473983024629548524;runden=true`
(zveza: BFV `4d5b3b4d93139e5ca7c8`, KFV `07383705631a73ec5a03`, NÖFV
`ed9c2fe8888e641f8e1a`, OÖFV `5faee79882faada18ab2`, SFV
`5ac4e17caa6271317678`, StFV `2b343dd0b84af271a9ea`, TFV
`2597aa11e457ecc97f32`, VFV `83f816954706cd0dff5f`, WFV
`22793f390fce3e915783`; seznam je v strani `/bewerbe/` kot
`appPreloads`). Bundesliga, 2. Liga in Regionallige so v skupinah več zvez.
Stran razporeda nosi tudi `saisonen` (šifre prejšnjih sezon iste lige) in
`verband`; vrstica tekme ima `heimMannschaftUrl` s šifro društva.

**Pravice (pregled 9. 10. 2026, ni pravni nasvet).** robots.txt oefb.at
splošnim robotom `/bewerbe/` dovoli; "Datenbank Crawler" je le ime v skupini
AI-robotov, ne velja za nas. "Datenservice" ni prodaja podatkov, ampak pot
strani tekmovanj. Pogojev uporabe za anonimne obiskovalce ni (Nutzungsbedingungen
veljajo le za prijavo SSO). **Strani KFV in StFV pa z istim zapisnikom
prepovedujejo** (`Disallow: /bewerbe/Spiel/`, `/bewerbe/Spieler/`) — beremo
**samo oefb.at**, nikoli kfv-fussball.at ali stfv.at. Dejstva tekme niso
avtorsko varovana; tveganje je pravica baze (UrhG § 76d, sistematično
izvlečenje) — najverjetneje poziv k prenehanju, ne odškodnina. ÖFB sam objavo
postav utemelji z javnim interesom (Information für Spieler, 26. 4. 2026).
**ÖFB je uporabo dovolil** (odgovor na prošnjo z office@oefb.at, v vednost
KFV in StFV, 9. 10. 2026): podatke iz zapisnikov in grbe klubov. Grbe beremo
z `/oefb2/images/`, ki ga robots.txt splošnim robotom prepoveduje — **samo
zaradi tega dovoljenja**. Avstrija je v živo. **Če ÖFB, KFV ali StFV dovoljenje
umakne ali nas blokira: vse `at-` lige izklopi** (`update competitions set
active = false where slug like 'at-%'`) in nočni uvoz jih ne bere več. Vklop
lige: `vklopi_ligo_sredi_sezone` (prej migracija `…_vklop_at_…`), prvi fantasy krog = prvi krog za zadnjim
krogom z zapisniki, ki ima rok še pred sabo. Pogoji GDPR, ki smo jih obljubili, so urejeni
(glej `players.anonimiziran_at`): obvestilo po čl. 14 z ugovorom igralca na
`/legal`, anonimizacija na zahtevo igralca ali zveze (vse vrstice osebe v državi),
v avstrijskih ligah 18 mesecev po zadnjem nastopu ime skrijemo. **Kako
oefb.at pokaže igralca, ki je pri ÖFB zahteval anonimizacijo, še ne vemo** — v vzorcih ima vsak igralec ime in
`/Profile/Spieler/<id>`. Ko tak primer najdemo (ime brez profila, "anonym"
…), naj ga vir izpusti in uvoz igralca s to šifro anonimizira
(`anonimiziraj_igralca(id, 'ugovor')`); do takrat anonimizacijo ÖFB, ki
nam jo sporočijo, vnese admin. Če prosijo, naj nehamo, ali nas blokirajo — nehamo.
Beremo odkrito (`User-Agent: SLFF fantasy`, 1,5 s med stranmi, popolnih
zapisnikov ne beremo znova). **Če se pojavi izziv ali CAPTCHA, ustavi — ne
obhajaj.** Odziv je počasen (2–7 s na stran): arhiv ene lige je ~20 minut.

Grbe avstrijskih klubov prinese `scripts/grbi-oefb.mjs`: id grba je v
razporedu lige (`heimMannschaftLogo`/`gastMannschaftLogo`, ena stran na ligo,
ime ekipe prek `imeEkipe` kot pri uvozu), slika je
`/oefb2/images/1278650591628556536_<id>-1,0-256x256-256x256.png` (strežnik jo
pomanjša sam), shrani se v `public/grbi/at-*`. To pot robots.txt splošnim
robotom **prepoveduje** — beremo jo **le zaradi izrecnega dovoljenja ÖFB**
(odgovor lastniku, 9. 10. 2026); če ga umaknejo, skripte ne poganjaj več.
Delovni tok *Grbi klubov* z `vir = oefb`, najprej brez `pisi`; brez
`tekmovanje` vse **aktivne** `at-` lige. Po vklopu nove avstrijske lige ga
poženi znova (vzame le klube brez grba).

Preizkus vira na Kärntner Liga 2025/26 (`226828`): 30 krogov, 240 tekem,
0 kontumacij, 240 zapisnikov, 795 golov (= izidi), 480/480 postav po 11,
1695 nastopov s klopi, 0 nastopov brez šifre, 0 opozoril. Skupine je
vneslo okoli pol klubov: vratar je znan v 257 od 480 postav, pozicija v
2834 od 6975 nastopov.

Vpisanih je 14 lig (migracija 20261009170000), **neaktivnih**. Lige so velike
(11–16 klubov), ena arhivska sezona naj zadošča; 2024/25 je za rezervo.
Unterliga Mitte obstaja šele od 2025/26.

| liga | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|
| at-k-kaerntner-liga | `231665` | `226828` | `221445` |
| at-k-unterliga-ost / -mitte / -west | `231652` / `231657` / `231656` | `226819` / `227197` / `226827` | `221449` / — / `221441` |
| at-st-oberliga-mitte-west / -sued-ost / -nord | `231501` / `231521` / `231503` | `226278` / `226272` / `226273` | `221194` / `221178` / `221180` |
| at-st-gebietsliga-mitte / -west / -sued / -ost | `231500` / `231520` / `231523` / `231524` | `226269` / `226283` / `226276` / `226291` | `221200` / `221199` / `221176` / `221182` |
| at-st-gebietsliga-mur / -muerz / -enns | `231502` / `231508` / `231512` | `226281` / `226279` / `226266` | `221191` / `221185` / `221190` |

**Vse ostale lige odraslih** (migracija 20261009230000, 139 lig, vse
**neaktivne**): Bundesliga, 2. Liga, tri Regionallige in vse lige vseh devetih
deželnih zvez do najnižje Klasse. Zveza `oefb` je državna raven (kot `nzs`):
Bundesliga, 2. Liga, Regionalliga Ost, Nord in West. Regionalliga Süd je od
2026/27 razdeljena na koroško (`kfv`) in štajersko (`stfv`).

Pregled 9. 10. 2026 (en zapisnik na ligo, zadnja odigrana tekma z goli):
**vseh 139 ima zapisnik z 11 + 11 začetniki**, klopjo, strelci s šifro in
menjavami — tudi najnižje Klasse in DSG. Nobena liga ni izpuščena zaradi
zapisnikov. Seznam za uvozno verigo je `scripts/avstrija-lige.txt` (`<slug>
<arhivi>`, vrstni red: državna raven, nato po deželah od vrha navzdol).

**Vrsta uvozov** je delovni tok *Uvoz Avstrije (vrsta)* (`uvoz-avstrije.yml`
→ `scripts/vrsta-avstrije.mjs`, vsakih 15 minut, seznam
`scripts/avstrija-vrsta.txt`). Tik je brez spomina: stanje razbere iz zagonov
*Uvoz lige* (naslov `Uvoz lige <slug>`, štejejo tudi ročni) in baze. Hkrati
tečejo največ trije uvozi, **iz vsake deželne zveze en**; državna (`oefb`:
Bundesliga, 2. Liga, Regionalliga) meša dežele in teče sama, in če je na vrsti,
se za njo ne zažene nič. Deželne zveze skoraj nimajo skupnih klubov (izjema:
obe Regionalligi Süd uvozita isti arhiv mešane Regionallige `226374`, `221198`), zato
`cakaj-na-uvoze.mjs` v Avstriji (`LOCENE_ZVEZE` v `scripts/hkratnost.mjs`, enako za RO, RS, HU in od
13. 10. 2026 SK z njihovimi državnimi zvezami) ročna uvoza lig dveh dežel pusti teči hkrati, od 13. 10. 2026
tudi vklopljenih (nočni uvoz jih v koših že piše hkrati; vklopljena liga še vedno čaka na nočni posel svoje
države), ista dežela pa le pri dveh nevklopljenih; hkraten vpis istega novega kluba ujame `klubId`
(23505 → obstoječi klub). Zažene nevklopljene lige brez zagona ali z enim
padcem (z `cene`); po dveh padcih ligo preskoči in javi na Discord. Ligo z
uspelim uvozom poskusi vklopiti vsak tik. Ligo z novim
uspelim uvozom vklopi servisna `vklopi_ligo_sredi_sezone(slug)` (gol brez
nastopa zavrne, prvi krog kot zgoraj, varovalka vklopa; vrne `vklopljena`,
`razlog`, `prvi_krog`, `razlika` izidi − goli) in zažene *Hisne ekipe* (AT)
in *Grbi klubov* (oefb). Zavrnjen vklop se javi enkrat — odloči človek.
**Premor ali konec: delovni tok izklopi** (Actions → Disable workflow); ko
izpiše "Avstrija končana", ga izklopi. Preizkus: `node
scripts/vrsta-avstrije.mjs --suho`. Funkcija je splošna, uporabna za vsako ligo.

Posebnosti:

- **Bundesliga** 2026/27 je `Grunddurchgang` (12 klubov, 22 krogov); po njem
  se razdeli na Meister- in Qualifikationsgruppe, ki sta pri ÖFB **svoji
  tekmovanji z novima šiframa** (glej *Lige z več fazami* spodaj). Arhiv
  2025/26 je vse tri faze: `227113+231372+231373`.
  Rezultati in zapisniki Bundeslige so na oefb.at v istem JSON kot nižje lige
  (preverjeno: krog 7, 20. 9. 2026), zato drugega vira (bundesliga.at) ne
  potrebujemo.
- **Regionalliga Süd** (Koroška 8, Štajerska 8 klubov, 14 krogov) je jesenski
  del; spomladi je nadaljevanje svoje tekmovanje. Lani je bila Regionalliga
  Mitte ena liga brez delitve, zato oblike pomladi še ne poznamo: je pomlad
  skupna liga obeh dežel, jo *Nove faze* javi kot mešano (ročni pregled) —
  pripeti jo pomeni pripeljati štajerske klube v koroško ligo.

**Lige z več fazami.** `source_league_code` vira `oefb` sme našteti več
tekmovanj s `+`: `232246+<meister>+<quali>`. `vrsticeFaz` (viri/oefb.mjs)
prebere vse razporede po vrsti in kroge poznejšega tekmovanja zamakne za
zadnji krog faze, iz katere so prišli njegovi klubi; vzporedni skupini (brez
skupnega kluba) si zato delita številke — Meister- in Qualifikationsgruppe
sta obe kroga 23–32, v enem krogu z enim rokom (najzgodnejša tekma obeh).
Ena šifra deluje kot prej. Play-off za Evropo in Relegation se ne pripneta.
Ista oblika velja za arhiv (`uvoz-lige.yml`, `arhiv`: vejica loči sezone,
`+` faze ene sezone) — brez nje bi arhivska Meistergruppe pristala v krogih
1–10 ob Grunddurchgangu.

Novo fazo javi delovni tok *Preverba podatkov* (dnevni zagon, korak *Nove
faze avstrijskih lig* → `scripts/nova-faza-oefb.mjs`): za vsako aktivno `at-`
ligo poišče njeno skupino pri zvezi (en seznam skupin na zvezo, nato seznami
tekmovanj skupin, dokler ne najde vseh lig) in tekmovanje, ki ga nobena naša
liga ne bere in katerega klubi so vsi iz lige. Na Discord pošlje točen SQL
(`update competitions set source_league_code = '…+…' where slug = '…';`),
baze ne spreminja; brez novosti molči. **Ko javi:** SQL vpiši z migracijo
**pred rokom prvega kroga nove faze** (zaklep zajame le kroge z rokom v
zadnjih 7 dneh), nato naj steče uvoz razporeda (urni ali ročni). Krogi se
dodajo za obstoječimi; `prvi_fantasy_krog`, borza, hišne ekipe in roki se ne
spremenijo. Preizkus na lanski delitvi: `--jahr 2026`.

Delitve v sezoni 2025/26 (pregled vseh skupin odraslih vseh devetih zvez,
9. 10. 2026): le **Bundesliga** (Grunddurchgang `227113` → Meistergruppe
`231372`, Qualifikationsgruppe `231373`) in **Salzburg 2. Klasse Süd**
(Grunddurchgang A `226773` in B `226783` → Oberes Play-Off `229101`, Unteres
`229102`; 2026/27 sta ločeni ligi brez delitve, arhiv ostane Grunddurchgang).
Brez delitve: 2. Liga, vse Regionallige (lani Mitte, Ost, West, Tirol) in vse
deželne lige. Ostalo so Relegation in Play-off (NÖFV `232356` z
Europacup-Playoffom, KFV, OÖFV, SFV, StFV, VFV).

- **Prenovljene lige dobijo arhive vseh lanskih lig, iz katerih so prišli
  vsaj dva kluba** (kot Madžarska): Regionalliga Nord (lani Mitte, West, OÖ
  Liga, Salzburger Liga), West (lani West, Regionalliga Tirol, Eliteliga),
  Süd (lani Mitte in Kärntner Liga / štajerska Landesliga). Tirolska je
  2026/27 vse prenovila (Tiroler Liga, 1. in 2. Landesliga, 1. in 2.
  Gebietsliga po štiri skupine); arhivi po izvoru klubov so v tabeli.
  Vorarlberška 5. Landesklasse je lani imela Oberland in Unterland.
- **Salzburg**: 2. Klasse Süd in Süd/West sta lani imeli Grunddurchgang A in
  B s Play-Offom; arhiv je Grunddurchgang (Play-Off ne, ker meša skupini).
- **DSG** (Diözesansportgemeinschaft, Dunaj) je vzporedna hobi piramida pod
  WFV z istimi zapisniki; vpisana je. DSG 2. Klasse ima le 6 klubov (štirikrat
  vsak z vsakim) — na meji, 3 igralci iz kluba × 5 klubov.
- Lige z ≤ 10 klubi imajo še arhiv 2024/25.
- Nižje lige mešajo prve in druge ekipe (1b, Juniors, "II"); vpisane so, ker
  v njih igrajo prve ekipe.

Izpuščeno: Reserve lige (BFV, KFV, NÖFV …), štajerske `IB Ligen` (IB
MitteWest, IB GLO — druge ekipe), mladinske (U…, Unter …, JHG, OPO/MPO/UPO),
ženske, futsal, pokali, Relegation/Entscheidungsspiel/Play-Off, šolski
turnirji, legende, Salzburger `Reserven`.

| liga | klubov | tekoča 2026/27 | arhiv (2025/26; pri ≤ 10 klubih še 2024/25) |
|---|---|---|---|
| at-bundesliga | 12 | `232246` | `227113+231372+231373` |
| at-2-liga | 16 | `232245` | `227112` |
| at-regionalliga-ost | 16 | `231974` | `226510` |
| at-regionalliga-nord | 15 | `232371` | `226374`, `226774`, `226368`, `226782` |
| at-regionalliga-west | 16 | `232368` | `226774`, `226430`, `226852` |
| at-b-landesliga | 16 | `231975` | `226443` |
| at-b-ii-liga-nord | 14 | `231969` | `226451` |
| at-b-ii-liga-mitte | 17 | `231965` | `226446` |
| at-b-ii-liga-sued | 16 | `231967` | `226448` |
| at-b-1-klasse-nord | 13 | `231971` | `226441` |
| at-b-1-klasse-mitte | 15 | `231964` | `226445` |
| at-b-1-klasse-sued | 16 | `231966` | `226450` |
| at-b-2-klasse-nord | 12 | `231972` | `226444` |
| at-b-2-klasse-sued-a | 10 | `231973` | `226449`, `221805` |
| at-b-2-klasse-sued-b | 12 | `231968` | `226442` |
| at-k-regionalliga-sued | 8 | `231655` | `226374`, `226828`, `221198`, `221445` |
| at-k-1-klasse-west | 15 | `231653` | `226824` |
| at-k-1-klasse-mitte | 14 | `231662` | `226822` |
| at-k-1-klasse-ost | 14 | `231660` | `226829` |
| at-k-2-klasse-a | 12 | `231664` | `226821` |
| at-k-2-klasse-b | 14 | `231658` | `226820` |
| at-k-2-klasse-c | 13 | `231661` | `226830` |
| at-k-2-klasse-d | 14 | `231659` | `226826` |
| at-noe-1-landesliga | 16 | `231756` | `226514` |
| at-noe-2-landesliga-ost | 16 | `231747` | `226499` |
| at-noe-2-landesliga-west | 16 | `231773` | `226502` |
| at-noe-gebietsliga-nord-nordwest | 14 | `231750` | `226512` |
| at-noe-gebietsliga-nordwest-waldviertel | 14 | `231768` | `226519` |
| at-noe-gebietsliga-sued-suedost | 14 | `231779` | `226530` |
| at-noe-gebietsliga-west | 14 | `231771` | `226527` |
| at-noe-1-klasse-nord | 14 | `231754` | `226507` |
| at-noe-1-klasse-nordwest | 14 | `231772` | `226511` |
| at-noe-1-klasse-nordwest-mitte | 14 | `231783` | `226529` |
| at-noe-1-klasse-ost | 16 | `231751` | `226509` |
| at-noe-1-klasse-sued | 14 | `231757` | `226522` |
| at-noe-1-klasse-waldviertel | 14 | `231774` | `226494` |
| at-noe-1-klasse-west | 16 | `231776` | `226504` |
| at-noe-1-klasse-west-mitte | 14 | `231764` | `226516` |
| at-noe-2-klasse-marchfeld | 13 | `231755` | `226515` |
| at-noe-2-klasse-mostviertel | 13 | `231753` | `226518` |
| at-noe-2-klasse-ost | 12 | `231748` | `226517` |
| at-noe-2-klasse-ost-mitte | 12 | `231777` | `226496` |
| at-noe-2-klasse-pulkau-schmidatal | 14 | `231781` | `226505` |
| at-noe-2-klasse-steinfeld | 12 | `231767` | `226506` |
| at-noe-2-klasse-thayatal | 14 | `231749` | `226501` |
| at-noe-2-klasse-traisental | 14 | `231775` | `226489` |
| at-noe-2-klasse-triestingtal | 12 | `231784` | `226528` |
| at-noe-2-klasse-wachau-donau | 12 | `231760` | `226493` |
| at-noe-2-klasse-waldviertel-sued | 13 | `231762` | `226503` |
| at-noe-2-klasse-waldviertel-zentral | 12 | `231763` | `226521` |
| at-noe-2-klasse-wechsel | 12 | `231752` | `226525` |
| at-noe-2-klasse-weinviertel | 13 | `231761` | `226513` |
| at-noe-2-klasse-ybbstal | 14 | `231770` | `226508` |
| at-noe-bezirksklasse-weinviertel | 11 | `231782` | `226523` |
| at-ooe-ooe-liga | 16 | `231619` | `226368` |
| at-ooe-landesliga-ost | 16 | `231629` | `226387` |
| at-ooe-landesliga-west | 16 | `231612` | `226377` |
| at-ooe-bezirksliga-nord | 14 | `231623` | `226391` |
| at-ooe-bezirksliga-ost | 14 | `231610` | `226381` |
| at-ooe-bezirksliga-sued | 14 | `231600` | `226402` |
| at-ooe-bezirksliga-west | 14 | `231631` | `226393` |
| at-ooe-1-klasse-mitte | 14 | `231639` | `226396` |
| at-ooe-1-klasse-mittewest | 14 | `231609` | `226373` |
| at-ooe-1-klasse-nord | 14 | `231635` | `226389` |
| at-ooe-1-klasse-nordost | 14 | `231638` | `226397` |
| at-ooe-1-klasse-nordwest | 14 | `231604` | `226390` |
| at-ooe-1-klasse-ost | 14 | `231617` | `226382` |
| at-ooe-1-klasse-sued | 14 | `231608` | `226371` |
| at-ooe-1-klasse-suedwest | 14 | `231599` | `226398` |
| at-ooe-2-klasse-mitte | 14 | `231602` | `226376` |
| at-ooe-2-klasse-mittewest | 14 | `231626` | `226372` |
| at-ooe-2-klasse-nordmitte | 14 | `231614` | `226399` |
| at-ooe-2-klasse-nordwest | 14 | `231636` | `226386` |
| at-ooe-2-klasse-ost | 13 | `231618` | `226403` |
| at-ooe-2-klasse-sued | 14 | `231606` | `226394` |
| at-ooe-2-klasse-suedwest | 13 | `231605` | `226401` |
| at-ooe-2-klasse-west | 14 | `231633` | `226369` |
| at-ooe-2-klasse-westnord | 14 | `231598` | `226379` |
| at-s-salzburger-liga | 16 | `231808` | `226782` |
| at-s-1-landesliga | 14 | `231816` | `226781` |
| at-s-2-landesliga-nord | 14 | `231807` | `226771` |
| at-s-2-landesliga-sued | 14 | `231810` | `226770` |
| at-s-1-klasse-nord | 14 | `231813` | `226775` |
| at-s-1-klasse-sued | 14 | `231815` | `226776` |
| at-s-2-klasse-nord-a | 10 | `231811` | `226780`, `221323` |
| at-s-2-klasse-nord-b | 8 | `231806` | `226778`, `221321` |
| at-s-2-klasse-sued | 9 | `231814` | `226773`, `221328` |
| at-s-2-klasse-sued-west | 8 | `231819` | `226783`, `222172` |
| at-st-regionalliga-sued | 8 | `231530` | `226374`, `226282`, `221198`, `221195` |
| at-st-landesliga | 16 | `231506` | `226282` |
| at-st-unterliga-mitte | 14 | `231511` | `226294` |
| at-st-unterliga-west | 14 | `231517` | `226271` |
| at-st-unterliga-sued | 14 | `231509` | `226288` |
| at-st-unterliga-ost | 14 | `231516` | `226275` |
| at-st-unterliga-nord-a | 13 | `231518` | `226285` |
| at-st-unterliga-nord-b | 14 | `231515` | `226274` |
| at-st-1-klasse-mitte-a | 12 | `231499` | `226277` |
| at-st-1-klasse-mitte-b | 12 | `231526` | `226293` |
| at-st-1-klasse-west | 11 | `231507` | `226286` |
| at-st-1-klasse-sued-ost-a | 12 | `231513` | `226292` |
| at-st-1-klasse-sued-ost-b | 10 | `231525` | `226268`, `221181` |
| at-st-1-klasse-enns | 8 | `231510` | `226270`, `221188` |
| at-st-1-klasse-mur-muerz-a | 12 | `231505` | `226284` |
| at-st-1-klasse-mur-muerz-b | 12 | `231514` | `226267` |
| at-t-tiroler-liga | 16 | `231687` | `226430`, `226427` |
| at-t-1-landesliga-ost | 15 | `231680` | `226425`, `226427` |
| at-t-1-landesliga-west | 15 | `231689` | `226436`, `226427` |
| at-t-2-landesliga-ost | 14 | `231683` | `226429`, `226425` |
| at-t-2-landesliga-west | 14 | `231682` | `226434`, `226436` |
| at-t-1-gebietsliga-ost | 14 | `231676` | `226423`, `226428`, `226429` |
| at-t-1-gebietsliga-mitte-ost | 14 | `231678` | `226423`, `226428` |
| at-t-1-gebietsliga-mitte-west | 14 | `231693` | `226431`, `226437` |
| at-t-1-gebietsliga-west | 14 | `231694` | `226431`, `226434`, `226437` |
| at-t-2-gebietsliga-ost | 13 | `231695` | `226426` |
| at-t-2-gebietsliga-mitte-ost | 14 | `231696` | `226426`, `226428`, `226432` |
| at-t-2-gebietsliga-mitte-west | 12 | `231697` | `226432` |
| at-t-2-gebietsliga-west | 13 | `231698` | `226424` |
| at-v-eliteliga | 14 | `232055` | `226852` |
| at-v-vorarlbergliga | 14 | `232052` | `226853` |
| at-v-landesliga | 14 | `232051` | `226858` |
| at-v-1-landesklasse | 14 | `232046` | `226860` |
| at-v-2-landesklasse | 14 | `232048` | `226857` |
| at-v-3-landesklasse | 14 | `232056` | `226859` |
| at-v-4-landesklasse | 14 | `232047` | `226851` |
| at-v-5-landesklasse | 14 | `232049` | `226856`, `226855` |
| at-w-stadtliga | 16 | `231940` | `226635` |
| at-w-2-landesliga | 16 | `231867` | `226684` |
| at-w-oberliga-a | 14 | `231846` | `226695` |
| at-w-oberliga-b | 14 | `231885` | `226591` |
| at-w-1-klasse-a | 13 | `231863` | `226633` |
| at-w-1-klasse-b | 14 | `231880` | `226627` |
| at-w-dsg-liga | 12 | `231852` | `226618` |
| at-w-dsg-oberliga-a | 12 | `231915` | `226621` |
| at-w-dsg-oberliga-b | 12 | `231934` | `226646` |
| at-w-dsg-unterliga-a | 12 | `231862` | `226631` |
| at-w-dsg-unterliga-b | 12 | `231884` | `226682` |
| at-w-dsg-1-klasse-a | 11 | `231855` | `226610` |
| at-w-dsg-1-klasse-b | 10 | `231900` | `226615`, `221680` |
| at-w-dsg-2-klasse | 6 | `231899` | `226694`, `221679` |
