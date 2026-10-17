# Španija

Novanet (Galicija / Aragón): preverjene šifre, decoder, omejitve in podatkovni audit so v [novanet.md](novanet.md). Tercera Futgal Lugo grupo 1 je vpisana neaktivno; vratarji v pregledanem viru niso označeni in pogoj za aktivacijo še ni izpolnjen.

Država `ES` ("España", migracija 20261012040000) ima vmesnik v španščini
(`src/i18n/es/`, jezik `es`, `es-ES`: "3 oct", decimalna vejica, cena
"13,2 M€"; `JEZIK_DRZAVE.ES`), vstop `slff.eu/es`, kartico ob deljenju
`es.html` (Caddy jo vrne za `/es` in `?t=es-…`, tudi na `:3201`), špansko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "¡Hola!") in španska imena lastnikov
hišnih ekip ("Javier García"). **Šifra španske lige se začne z `es-`.**
Ugib: brskalnik `es` (gola oznaka), `es-ES`, `ca-ES`, `gl-ES`, `eu-ES` ali
pas `Europe/Madrid`, `Atlantic/Canary`, `Africa/Ceuta`. **`es-MX`, `es-419`,
`es-AR` … niso Španija** (kot `de` ni Avstrija): v `DRZAVE` je zato `=es`,
oznaka z `=`, ki velja le natanko. Tujec s katerokoli španščino dobi španski
vmesnik (`jezikTujca`). Sezona kot v Sloveniji (avgust–junij), ne koledarska.
Izrazi kot v LaLiga Fantasy in Biwenger, oblika "tú": equipo, plantilla (15),
once inicial / titulares, banquillo, suplentes, capitán, vicecapitán,
fichajes, mercado, presupuesto, portero, defensa, centrocampista, delantero,
clasificación, asistencia, tarjeta, portería a cero, puntos, miniliga;
`krog` je vedno **jornada** ("Jornada 5"), pripomoček `klop_plus` je
"Banquillo+", poznavalec je "experto". Množine one/many/other
(`Intl.PluralRules('es')`): `one` 1, `many` celi milijoni (1.000.000),
`other` vse ostalo, tudi 0 in decimalke ("1,5 puntos"); `many` je zato
enak `other`. Španščina ne sklanja, a člen pred imenom lige je odvisen od
imena ("la Primera Regional", "el Grupo 3"), zato ime lige stoji samostojno
za dvopičjem ali v oklepaju ("Liga fantasy abierta: {liga}", "liga:
{liga}"); `ligaVTozilniku` ga pusti. Psevdonim v klepetu ima pridevnik za
samostalnikom ("Portero Azul 42", vsi samostalniki moškega spola). Stran
Pozicije je v meniju kot v Sloveniji. `ES` je v matriki nočnega uvoza.
Zveze, tekmovanja in vir vpiše svoja migracija. Manjka še: španski kanal v
HelpStacku (`Podpora.tsx` za `es` uporabi slovenskega) in **pregled
prevoda pri naravnem govorcu**.

## Španija — vir `fcf` (Katalonija)

Vir `fcf` (`scripts/viri/fcf.mjs`) bere **fcf.cat** (Federació Catalana de
Futbol), ki objavi vsa katalonska tekmovanja od Lliga Elit do Quarta
Catalana. Stran je Next.js: **strani tekmovanj, skupin, klubov in ekip si
podatke naloži brskalnik iz `/api/`, ki ga robots.txt prepoveduje — `/api/`
(in `/_next/`) ne kličemo nikoli.** Strežnik pa izriše **zapisnik**
`/ca/competicio/acta/<id>` (robots.txt ga dovoli): v strani je drevo React
Server Components (`self.__next_f.push`), ki ga `drevoRsc` sestavi
(sklici `$<id>`/`$L<id>`, besedilne vrstice `T`), ostalo bere po elementih.
Šifra lige se začne z `es-`.

- **Šifra lige je blok šifer zapisnikov `<od>-<do>`** (kot `fssid`). Skupina
  ene sezone je strnjen blok, urejen po krogih (8 mest na krog pri 15 ali 16
  klubih; pri lihem številu je prosto mesto "Acta no trobada" ali tekma "vs
  undefined"). **Zapisnik obstaja tudi za neodigrano tekmo** ("Pendent") — z
  datumom, uro in krogom, zato je razpored kar blok zapisnikov in datumov ni
  treba ocenjevati. Vsaka stran nosi tekmovanje, skupino, krog in sezono;
  stran druge skupine v bloku vir izpusti z opozorilom. Blok in sosednje
  bloke najde `scripts/catalanske-lige.mjs` iz ene šifre (bisekcija mej).
  Nova sezona = nov blok; seme poišči v bližini lanskega bloka ali na strani
  kluba v brskalniku (povezave na akte so v strani, ki jo izriše brskalnik).
- **Glava**: domači, oznaka ("Acta Tancada" = zaprt, "Pendent", "SUSPÈS",
  "AJORNAT"), izid ("1 - 3"; neodigrana "- - -"), drobtine "QUARTA CATALANA /
  GRUP 1 / Jornada 1", "Temporada : 2026 / 27", "Data: 19.09.2026", "Hora:
  17.00 H" — **madridski čas = ljubljanski**, brez pretvorbe. Polčasa ni.
- **Ekipi** (`localNode`, `visitorNode`): "Alineacions" (začetniki) in
  "Suplents" (klop); igralec je predmet `{ id, nombre, dorsal, titular,
  capitan, portero }` — `id` je stalna šifra osebe FCF (→ `reg_st`),
  `portero` vratar (tudi rezervni, → GK), `capitan` kapetan. Ime "PRIIMKA,
  IME" → "Priimka Ime" (`imeIgralca`, male črke z veliko začetnico; "de",
  "la", "i" ostanejo mali); nekateri igralci imajo le vzdevek ("AITOR").
- **Dogodki** so ob igralcu: minuta ("35’", "90+3’" → 90) in ikona na stalnem
  mestu — žoga (gol), rumeni (`#FFEB3B`), rdeči/drugi rumeni, vstop (modra
  puščica `#0068A9`) in izstop (rdeča puščica). Vrsto gola (GOL, GOL PENAL,
  GOL EN PRÒPIA) in strelca da razdelek "Gols" s stanjem po golu; avtogol je
  pri strelcu v njegovi ekipi in šteje nasprotniku (stanje to preveri).
  Rdečega kartona v vzorcih še ni bilo — razbiranje po barvi je
  nepreverjeno (`neznan dogodek` v opozorilih, če ikona ni znana).
- **Menjave**: v nižjih ligah jih klubi **ne vpišejo** (Quarta Catalana grup
  1 2026/27: nobena ekipa nobene). Takrat ima začetnik 90 minut, rezerva brez
  vpisanega vstopa pa nastopa nima (kot `fsb`) — minute začetnikov so
  precenjene, ekipa ima lahko čez 990 minut. Strelec s klopi dobi vstop ob
  golu (opozorilo). `z.brezMenjav` pove, katera ekipa menjav ni vpisala.
  Od Lliga Elit do Tercera Catalana jih vpisujejo vse ekipe (pregled 12. 10.
  2026, 990 minut na ekipo), Quarta nobena.
- **Šifra zapisnika v bazi je `es<id>`** (`sifraZapisnika`): številke fcf.cat
  (3,7–4,2 milijona) se prekrivajo s šiframi oefb, `matches.zapisnik_id` pa je
  enoličen čez vse vire. `--zapisnik` uvoza vzame `es…`.
- **Nepopoln zapisnik** (ekipa z manj kot 7 začetniki) kot pri `frf`: izid se
  zapiše, `imported_at` ostane prazen, 45 dni se bere znova. Kontumacija: izid
  brez obeh postav, starejši od tedna. Tekma z izidom, ki še ni "Tancada", se
  bere vsako uro do 45 dni.
- **Predpomnilnik** (`scripts/.predpomnilnik/fcf`): odigrana zaprta tekma se
  ne bere znova (razen prve 3 dni ob uvozu zapisnikov), neodigrana, ko je na
  vrsti (od dneva pred datumom do 14 dni po njem vsako uro, nato dnevno),
  sicer enkrat na teden; "no trobada" enkrat na teden. Prvi uvoz bloka
  prebere vseh ~240 strani — **strežnik je počasen** (stran 0,4 MB, v
  preizkusu 5–20 s na zahtevek s 3 s premora), zato je prvi uvoz skupine
  ~1 ura. Vse lige bere en gostitelj: `cakaj-na-uvoze.mjs` ima ES v
  `SKUPEN_VIR`, zagoni Španije se ne prekrivajo.
- Klubi: ključ brez diakritike in ločil, **z obliko** ("ROSES, A.E." in "BASE
  ROSES, C.F." sta dva kluba); kratko ime je del pred vejico brez oblike
  ("Roses", "Sant Llorenç de la Muga"). Druge ekipe ("…, B") so svoj klub.
- *Uskladi pozicije* z `vir = fcf` (vratar po večini tekem); ostale pozicije
  na glasovanje.

**Pravice (pregled 11. 10. 2026, ni pravni nasvet).** robots.txt dovoli vse
razen `/api/`, `/_next/` in iskanja; zapisniki so dovoljeni. Pravno obvestilo
(Avís legal) prepoveduje reprodukcijo vsebin **"amb finalitats comercials"**
brez dovoljenja FCF. SLFF je brezplačen in nekomercialen; **Dovoljenje FCF je prejeto: uporabnik je to izrecno potrdil
17. 10. 2026 in naročil vklop preverjenih katalonskih lig.** Ta potrditev
nadomesti prejšnje čakanje na soglasje; novega sporočila nismo pošiljali.
Dovoljenje samo ne nadomesti preverbe podatkov pred vklopom. Navedba
vira (`vir_ime` FCF, `vir_url` → fcf.cat) je v nogi. Beremo odkrito
(User-Agent `SLFF fantasy (slff.eu; splih.94@gmail.com)`, **3 s** med
zahtevki). Sodnikov, osebja (Equip Tècnic) in igrišča ne beremo; vzorci
`scripts/vzorci/es-fcf-*` so brez njih (repo je javen). **Ob izzivu, CAPTCHI,
403 ali 429 se uvoz ustavi — ne obhajaj** (`FcfZavrnitev`, izhod 4). Če nas
FCF prosi, naj nehamo, `es-` lige izklopimo.

Seznam blokov in preizkus:

```bash
node scripts/catalanske-lige.mjs 4139543                    # blok skupine iz enega zapisnika
node scripts/catalanske-lige.mjs 4139543 --naprej 3 --preveri   # + sosednji bloki, zadnji odigrani krog
node scripts/catalanske-lige.mjs --polno 4139542-4139779    # ves blok, kot ga bere uvoz (brez baze)
```

Preizkus v živo (11. 10. 2026, brez pisanja v bazo) na Quarta Catalana grup 1
2026/27 (`4139542-4139779`): 30 krogov, 210 tekem (vse z uro), 15 klubov,
28 "no trobada" (prosto mesto vsakega kroga), 0 tujih strani; 16 odigranih,
16 zapisnikov, vsi polni (11 + 11, vratar pri vseh 32 postavah), goli = izid
16/16 (82), 0 kontumacij, 1 avtogol, 2 gola z 11 m, 1 rdeči karton, 81
rumenih. **Nobena ekipa ni vpisala menjav** (32/32): 990 minut ima 19 ekip,
12 več (strelec s klopi dobi vstop ob golu — 15 takih opozoril), 1 manj
(rdeči karton). 367 nastopov (15 s klopi), vsi s šifro. Preverjeni so še
zapisniki 1. in 30. kroga Primera Catalana 2025/26 (menjave vpisane, 990
minut) in Quarta grup 2 2025/26. Med preizkusom je strežnik večkrat
odgovarjal po 20–60 s; telo strani zato bere `fcfFetch` (90 s, ponovitev).
Rdeči karton je `div` z `bg-[#F30000]` na 3. mestu; avtogol je žoga z
rdečimi pikami (ne rdeči karton). **Drugi rumeni in gol z 11 m v vrstici
igralca še nista videna kot ikona** — vrsta gola pride iz razdelka "Gols".

Vpisane so 4 skupine Quarta (migracija 20261012080000) in 29 skupin višjih
lig (migracija 20261013090000), vse **neaktivne**, zveza `fcf`.

**Pregled blokov 2026/27** (12. 10. 2026, ~450 zahtevkov po 3 s): bloki
tekmovanj ležijo v dveh skupinah šifer. `4106968-4110837`: Lliga Elit (en
blok), za njim prijateljske tekme državnih lig, nato Primera grup 1–3 in
Segona grup 1–6 zaporedoma. `4114505-4119737`: Tercera grup 1–17, pomešane s
futsalom in ženskimi Preferent ter posameznimi prijateljskimi tekmami
(Tercera grup 18 ni; vrzel `4114985-4115227` je prazna). Quarta je pri
`4137000-4140864` (grup 4 in 5 med grup 3 in 6, po 182 šifer). Vsi bloki
višjih lig imajo 30 krogov po 8 mest (240 šifer), 15–16 klubov.

**Postave in menjave**: 1. krog vseh 29 skupin in dve tekmi 4. kroga vsake
(Quarta 4 in 5 še nimata 4. kroga): **vse postave 11 + 11**. Od Lliga Elit do
Tercera **vse ekipe vpisujejo menjave** (minuta vstopa in izstopa); Quarta
grup 4 in 5 (kot 1–6) **nobena**.

| liga | klubov | tekoča 2026/27 | menjave | arhiv 2025/26 |
|---|---|---|---|---|
| es-ct-elit | 16 | `4106968-4107207` | da | — (TODO) |
| es-ct-primera-g1 | 16 | `4108646-4108885` | da | — (TODO) |
| es-ct-primera-g2 | 16 | `4108886-4109125` | da | — (TODO) |
| es-ct-primera-g3 | 15–16 | `4109126-4109365` | da | — (TODO) |
| es-ct-segona-g1 | 16 | `4109388-4109627` | da | — (TODO) |
| es-ct-segona-g2 | 16 | `4109630-4109869` | da | — (TODO) |
| es-ct-segona-g3 | 16 | `4109870-4110109` | da | — (TODO) |
| es-ct-segona-g4 | 16 | `4110110-4110349` | da | — (TODO) |
| es-ct-segona-g5 | 16 | `4110354-4110593` | da | — (TODO) |
| es-ct-segona-g6 | 16 | `4110598-4110837` | da | — (TODO) |
| es-ct-tercera-g1 | 16 | `4115948-4116187` | da | — (TODO) |
| es-ct-tercera-g2 | 15–16 | `4116188-4116427` | da | — (TODO) |
| es-ct-tercera-g3 | 15–16 | `4116428-4116667` | da | — (TODO) |
| es-ct-tercera-g4 | 15–16 | `4115228-4115467` | da | — (TODO) |
| es-ct-tercera-g5 | 16 | `4115468-4115707` | da | — (TODO) |
| es-ct-tercera-g6 | 16 | `4116668-4116907` | da | — (TODO) |
| es-ct-tercera-g7 | 16 | `4116908-4117147` | da | — (TODO) |
| es-ct-tercera-g8 | 16 | `4117389-4117628` | da | — (TODO) |
| es-ct-tercera-g9 | 16 | `4118349-4118588` | da | — (TODO) |
| es-ct-tercera-g10 | 16 | `4119498-4119737` | da | — (TODO) |
| es-ct-tercera-g11 | 16 | `4118591-4118830` | da | — (TODO) |
| es-ct-tercera-g12 | 16 | `4118835-4119074` | da | — (TODO) |
| es-ct-tercera-g13 | 16 | `4119076-4119315` | da | — (TODO) |
| es-ct-tercera-g14 | 16 | `4117629-4117868` | da | — (TODO) |
| es-ct-tercera-g15 | 16 | `4117869-4118108` | da | — (TODO) |
| es-ct-tercera-g16 | 16 | `4114505-4114744` | da | — (TODO) |
| es-ct-tercera-g17 | 16 | `4114745-4114984` | da | — (TODO) |
| es-ct-quarta-g1 | 15 | `4139542-4139779` | ne | — (TODO) |
| es-ct-quarta-g2 | 15–16 | `4139781-4140020` | ne | — (TODO; zapisnik `3788226` je v bloku grup 2 2025/26) |
| es-ct-quarta-g3 | 15–16 | `4140021-4140260` | ne | — (TODO) |
| es-ct-quarta-g4 | 14 | `4140261-4140442` | ne | — (TODO) |
| es-ct-quarta-g5 | 14 | `4140443-4140624` | ne | — (TODO) |
| es-ct-quarta-g6 | 15–16 | `4140625-4140864` | ne | — (TODO) |
| es-ct-quarta-g7 | 16 | `4145911-4146150` | ne | — (TODO) |
| es-ct-quarta-g8 | 16 | `4146151-4146390` | ne | — (TODO) |
| es-ct-quarta-g10 | 16 | `4146631-4146870` | ne | — (TODO) |
| es-ct-quarta-g13 | 16 | `4147351-4147590` | ne | — (TODO) |
| es-ct-quarta-g14 | 16 | `4147593-4147832` | ne | — (TODO) |
| es-ct-quarta-g16 | 16 | `4148075-4148313` | ne | — (TODO) |
| es-ct-quarta-g17 | 16 | `4148315-4148554` | ne | — (TODO) |
| es-ct-quarta-g18 | 16 | `4148555-4148794` | ne | — (TODO) |
| es-ct-quarta-g19 | 16 | `4148795-4149034` | ne | — (TODO) |
| es-ct-quarta-g20 | 16 | `4149035-4149274` | ne | — (TODO) |
| es-ct-quarta-g21 | 16 | `4149275-4149513` | ne | — (TODO) |
| es-ct-quarta-g22 | 16 | `4149516-4149755` | ne | — (TODO) |
| es-ct-quarta-g23 | 16 | `4149756-4149995` | ne | — (TODO) |
| es-ct-quarta-g32 | 12 | `4136953-4137084` | ne | — (TODO) |

**Quarta grup 7+** (pregled 13.–14. 10. 2026, migracija 20261014093100): grup
7–23 ležijo strnjeno v `4145911-4149995` (po 240 šifer, 30 krogov, 16 klubov,
urejeni po številki skupine; pred grup 7 je vrzel), grup 24 se začne pri
`4149996` (grup 24 je tudi `4150000`). Grup 32–34 so pri `4136689-4137084`
(22 krogov po 6 mest, 12 klubov; grup 33 `4136821-4136952` in 34
`4136689-4136820` ležita pred grup 32, za njo je Primera Femení Juvenil).
Tekma grup 26 pri `4117388` je posamezna (okoli nje Preferent Femení
Infantil). Postave vpisanih skupin so preverjene na 3 odigranih tekmah
(11 + 11, vratar pri vseh); Quarta menjav ne vpisuje (grup 7: ena ekipa jih je).

**TODO**: grup 9 (`4146391-4146630`), 11 (`4146871-4147110`), 12
(`4147111-4147350`) in 15 (`4147835-4148074`) — bloki najdeni, a prva tekma
bloka ni odigrana, zato postave niso preverjene (`node
scripts/catalanske-lige.mjs <od> --preveri`); grup 33 in 34 — še brez
odigrane tekme; grup 24–31 — nepregledano (strežnik je ponoči obstal), seme
`4149996`, nadaljuj z `node scripts/catalanske-lige.mjs 4150000 --naprej 8
--preveri`.

Uvoz (ena za drugo; dovoljenje FCF potrjeno 17. 10. 2026): `gh workflow run uvoz-lige.yml
-f liga=es-ct-quarta-g1 -f cene=true` (z arhivom: `-f arhiv=<blok 2025/26>`).
Prvi uvoz bloka je ~240 strani — ob počasnem strežniku do ene ure.

## Nadzorovana osvežitev popravljenih FCF zapisnikov

Za javno preverjen popravek, ki ga sedemdnevni predpomnilnik še drži kot
prihodnjo/manjkajočo stran, ima obstoječi `uvoz-lige.yml` izbirni vhod
`fcf_osvezi`. Primer na pregledanem **main** commitu:

```bash
gh workflow run uvoz-lige.yml --ref main -f liga=es-ct-elit \
  -f fcf_osvezi=es4106977 -f tekoca=true -f cene=true
```

Vhod sprejme 1–8 unikatnih `esID`, ločenih z vejico. Dovoljenih je samo
27 zgornjih katalonskih skupin, vir `fcf`, država ES, **neaktivna** liga,
tekoča sezona in njen točno pregledani blok 2026/27. Nova sezona zahteva
pregled blokov in posodobitev pomočnika. Arhiv, `zapisnik`, `tekoca=false`,
`dovoli_manj_klubov` in `prepisi_aktivno` so v tem načinu zavrnjeni.

Po obstoječem čakanju na druge pisce ES in obnovitvi predpomnilnika pomočnik
prebere resnično metapodatkovno vrstico lige in RPC `sezona_lige` v Actions.
Pred prvim brisanjem preveri **vse** šifre in poti, tudi prednike manjkajočih
datotek; simbolne povezave in neregularne cilje zavrne. Izbriše samo izbrane
`scripts/.predpomnilnik/fcf/acta-ID.html`; manjkajoča datoteka je varen no-op.
Artefakt `fcf-refresh-RUN_ID-ATTEMPT/audit.json` ohrani izbrane šifre,
odstranjene/manjkajoče datoteke in prejšnji SHA256/mtime tudi ob napaki.
Ključev ne vsebuje. Drugih teles in časov datotek ne spreminja.

Sledi **običajni celoten uvoz bloka**: osem omejuje samo izbris izbranih
predpomnjenih strani, ne števila poznejših zahtevkov. Razpored, zapisniki,
izbirne pozicije/cene in pripravljenost ohranijo obstoječa pravila,
3-sekundni razmik in ustavitev ob zavrnitvi vira. Ni vbrizgavanja HTML ali
popravljanja časov datotek. Uspešen uvoz lige še ne vklopi; za vklop je
potreben nov pregledani manifest in spodnji strogi postopek.

Samo ta izrecni način najprej obnovi najnovejši uppercase ES nočni/državni
predpomnilnik, nato po potrebi starejši predpomnilnik lige/lowercase ES;
splošnega predpomnilnika tuje države ne uporabi. Običajni zagoni brez vhoda
ohranijo dosedanji vrstni red. Po uspehu pomočnika, tekočega uvoza in
pripravljenosti na `main` se isti celoten predpomnilnik objavi še pod
`zapisniki-ES-k1od1-RUN_ID-ATTEMPT`, da naslednji nočni uvoz dobi pristne
sveže strani. Ob napaki, preklicu ali na drugi veji se ta objava ne izvede.
Dosedanje ročno shranjevanje predpomnilnika tudi ob napaki ostaja.

## Preverjen vklop zgornjih katalonskih lig (17. 10. 2026)

Vklop pokriva natanko 27 že uvoženih skupin: `es-ct-elit`, Primera 1–3,
Segona 1–6 in Tercera 1–17. Quarta zaradi manjkajočih menjav ostaja zunaj;
FAS in Novanet imata ločena postopka. Obstoječih cen in pozicij ne spreminja.

Ročni tok `vklop-katalonije.yml` privzeto **samo pripravi** paket. V enem
usklajenem zagonu države ES prebere celotne tekoče kroge, tekme, nastope
(tudi pri še neuvoženih tekmah), gole, igralce in `stanje_lige`. Vse strani
uskladi z natančnim številom vrstic. Preveri 30 krogov, 16 klubov, 240
usmerjenih parov, 8 disjunktnih tekem na krog, XI in izrecnega vratarja,
minute in statistiko, gole po upravičencu (tudi avtogole), nič opozoril,
dokaz vratarja in klopi za vsak klub ter obstoječo pripravljenost in
najcenejši veljaven kader. Neuvožen zapisnik več kot 48 ur po **koncu UTC
dneva tekme** blokira ligo, razen izrecnega `vir_brez_izida`; ta ostane
neuvožen. Tudi označena čakajoča tekma ne sme za nazaj začeti fantasy kroga.

```bash
# Brez lige: vseh 27; opcijsko -f lige=es-ct-primera-g1,es-ct-tercera-g1
# Uporabi pregledano vejo in ohrani isti commit za oba zagona.
gh workflow run vklop-katalonije.yml --ref <pregledana-veja>
gh run download <prepare-run> -n katalonija-release-<prepare-run> -D katalonija-review
# Preglej summary.json, batch.json in vsak manifest. batch.sha256 je odobreni SHA.
gh workflow run vklop-katalonije.yml --ref <ista-veja-isti-commit> \
  -f activate=true -f approved_sha256=<pregledani-64-hex-SHA>
```

Izbirni seznam `lige` mora biti isti v obeh zagonih. `summary.json` pojasni
vsako blokirano skupino; te ostanejo izklopljene. SHA veže celoten izbrani
paket, vsako podatkovno stanje, cene/statistiko, preverbe, izvorni commit in
datum potrditve dovoljenja; čas izdelave povzetka ni del odobritve. Nova
sprememba podatkov ali commita zahteva novo pripravo in pregled SHA.

Vklop je dovoljen samo v Actions tega repozitorija z izrecnim SHA. Pred
prvim RPC primerja celoten paket; pred **vsako** ligo še enkrat v celoti
prebere in primerja njen manifest ter tik pred RPC ponovno preveri čas.
Izbira prvega fantasy kroga natančno sledi obstoječemu
`vklopi_ligo_sredi_sezone` (do dva predčasno odigrana poznejša kroga).
Izbrani krog nima nastopov, ima prihodnji rok, vsi njegovi datumi tekem pa
so po današnjem dnevu UTC, ker baza hrani le datum tekme. Po klicu preveri
odgovor in ponovno prebrano aktivno stanje/prvi krog ter nespremenjene
cene, pozicije in statistiko. Napaka ustavi preostale klice; artefakt zabeleži
delni rezultat, pri napaki po RPC je treba posebej preveriti aktivno stanje.

Tok ima stalno skupino `vklop-katalonije` in se v obeh smereh usklajuje z
ročnimi/nočnimi pisci ES, popravki igralcev, združevanjem klubov in tedenskimi
cenami. V isti družini so tudi zapisovalni zagoni usklajevanja pozicij
(po viru/ligi), izstopa kluba (po ligi) in `cene-lig` (globalno, ker en
seznam lahko pokriva več držav). Suha uskladitev/izstop ne čakata. Starejši
zagon cen lahko pripravi veljaven cenik še pred zadnjim zapisom, zato tudi
že tekoči cenovni zagon zadrži vklop. **Obstoječi RPC ne preverja SHA atomsko v bazi.** Jamstvo velja za
usklajene Actions pisce in neposredno ponovno branje; ne varuje pred
neusklajenim zunanjim piscem. Produkcijski servisni ključ ostane samo v
Actions. Postopek ne pošilja pošte, ne ustvarja hišnih ekip in ne uvaža ali
vrednoti igralcev. Lokalni preizkus brez baze:
`node --test scripts/test-vklop-katalonije.mjs scripts/test-cakaj-na-uvoze.mjs`.

## Španija — vir `fas` (Asturija)

Vir `fas` (`scripts/viri/fas.mjs`) bere **futbolasturiano.es**, neodvisen
digitalni dnevnik asturijskega nogometa (WordPress + SportsPress, Grupo
Tyclamata), **ne zveze**. Postave objavlja za **Tercera Federación, skupina 2**
(asturijski klubi) in **Primera AsturFútbol**; nižje asturijske lige (2ª, 3ª
AsturFútbol) imajo le izide — ne beremo jih. REST `sportspress/v2` je
izklopljen; beremo HTML.

- **Šifra lige je `<liga>:<od>-<do>`**: `<liga>` je izraz SportsPress
  `sp_league` (stran `/competicion/<liga>/`: `3-rfef`, `1-asturfutbol`),
  `<od>-<do>` blok šifer objav (post id) tekem **ene sezone**. Razpored sezone
  je ustvarjen naenkrat, zato je blok strnjen in natanko N×(N−1) šifer (18
  klubov: 306, 20 klubov: 380), po dve in dve (krog n in povratni krog).
  Stran lige našteje tekme vseh sezon z `sp_league-…` `sp_season-2026-2027`,
  datumom in uro (`<time datetime>`); **tekme s stanjem "future" (bližnji
  krog, ki mu je uredništvo popravilo uro) na strani lige in v zemljevidu
  strani manjkajo** — zato blok, ne seznam: manjkajoče šifre vir prebere s
  `/?p=<id>` (preusmeri na stran tekme). Pomočnik: `node
  scripts/asturijske-lige.mjs` (lige, sezone, blok, koliko manjka na strani
  lige), `--polno <šifra>` (ves blok kot uvoz, brez baze), `--vzorec <id>
  <datoteka>` (obrezana stran za `scripts/vzorci/`). Nova sezona = nov blok
  (poženi pomočnika, ko je razpored objavljen).
- **Stran tekme** `/evento/<domači>-<gostje>/`: imeni (`sp-team-name` = ime
  objave ekipe; isto na vseh tekmah ekipe, zato brez vzdevkov — razen
  tipkarske "EI San Martín" → "El San Martín", `IME_EKIPE`), izid
  (`sp-team-result`, neodigrana brez števk), "Detalles": Fecha, Hora
  (**madridski = ljubljanski čas**), Liga ("3ª RFEF", "1ª AsturFútbol"),
  Temporada ("2026/2027" → `2026/27`), **Jornada** (krog). Krog in klubi
  tekme se ne menjajo, zato se stran neodigrane tekme bere enkrat na 14 dni
  (datum da sveža stran lige), od dneva pred tekmo vsako uro.
- **Postavi** (`fa-convocatoria`): vrstica `fa-conv__row` = začetnik,
  `--entra` = vstopil, `--convocado` = neuporabljena rezerva; dres, ime s
  povezavo `/jugador/<slug>/`, pozicija ("Portero" → GK, branilci DEF,
  vezisti in **krila (Extremo) MID**, "Delantero" FWD; "—" brez) in ocena
  (ne beremo). **Identiteta igralca je pot profila**: `regSt` =
  `sifraIgralca(slug)` (FNV-1a, 50 bitov + 2^52 — nad šiframi oseb FCF v isti
  državi). Dva igralca z istim dresom na isti tekmi (Sporting Atlético: 14
  in 14) loči šifra.
- **Dogodki** po prikaznem imenu (brez povezave) v razdelkih GOLES (oznaka
  `sp-res__gol-badge--penalti` = 11 m, `--propia` = avtogol, stolpec ekipe
  strelca, šteje nasprotniku), TARJETAS (`--yellow`, `--red`; drugi rumeni =
  dva rumena + rdeči → 1 rumeni + 1 rdeči) in SUSTITUCIONES (vstop, izstop,
  minuta; "94'" → 90). **Minute so točne.** Menjava brez minute (redko,
  uredništvo je vpisalo le ime) je opozorilo, rezerva brez nastopa.
- **Šifra zapisnika v bazi je `fas<id>`**; `--zapisnik` vzame `fas…`.
- **Nepopoln zapisnik** (ekipa z manj kot 7 začetniki, tudi le strelci ali
  prazna stran z izidom) kot pri `frf`/`fcf`: izid se zapiše, `imported_at`
  ostane prazen, 45 dni se bere vsako uro. **Kontumacija** je le 3:0 ali 0:3
  brez obeh postav in brez golov, starejša od tedna — prazna stran z drugim
  izidom ali z goli je tekma, ki ji uredništvo postav ni vpisalo.
- **Arhiva ni.** SportsPress na futbolasturiano.es vodi le sezono 2026/27
  (izraz `sp_season` je en sam, `/temporada/2025-2026/` vrne 404, zgodovina
  na straneh igralcev se začne z 2026/2027; objave ekip so iz junija 2025,
  tekme od avgusta 2026). Cene so le iz tekoče sezone (uvoz brez `arhiv`,
  s `cene`) — kot `hlf` in `fssid`; pred vklopom preveri
  `pripravljenost-lige` (delež privzetih ≤ 70 %).
- *Uskladi pozicije* z `vir = fas` (vratar po večini tekem).
- Predpomnilnik `scripts/.predpomnilnik/fas` (stran lige `razpored-<šifra>.html`,
  ki jo uvoz razporeda prenese tik pred `razporedVseStrani`, in
  `evento-<id>.html`). Prvi uvoz bloka prebere vse strani (~300–380 po 3 s,
  20–25 minut). ES je v `SKUPEN_VIR` (`cakaj-na-uvoze.mjs`, zaradi fcf.cat) —
  zagoni Španije se zato ne prekrivajo, tudi fas s fcf; drugega ni treba.

**Pravice (pregled 13. 10. 2026, ni pravni nasvet).** robots.txt
`User-agent: * / Disallow:` (nič prepovedano), pravno obvestilo (Aviso legal)
je prazno, brez WAF in izziva. Navedba vira (`vir_ime` FutbolAsturiano.es,
`vir_url` → stran lige) je v nogi; zveza v izbirniku je RFFPA (`rfpaf`).
Vljudnostno obvestilo uredništvu (correo@futbolasturiano.es) še ni poslano.
Beremo odkrito (User-Agent `SLFF fantasy (slff.eu; splih.94@gmail.com)`,
**3 s** med zahtevki, strežnik je občasno počasen — `fasFetch` 90 s). Sodnikov,
ocen, poročil, fotografij in igrišča ne beremo; vzorci `scripts/vzorci/es-fas-*`
so obrezani. **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj**
(`FasZavrnitev`, izhod 4).

Vpisani ligi (migracija 20261014203100), **neaktivni**, zveza `rfpaf`:

| liga | klubov | tekoča 2026/27 | arhiv |
|---|---|---|---|
| es-as-tercera-g2 | 18 | `3-rfef:14499-14804` | — (vir ga nima) |
| es-as-primera | 20 | `1-asturfutbol:15137-15516` | — (vir ga nima) |

Preizkus v živo (14. 10. 2026, `node scripts/asturijske-lige.mjs --polno`,
brez baze; ves blok, ~690 strani po 3 s, 0 zavrnitev):

- **Tercera G2** — 34 krogov, 306 tekem (vse z uro), 18 klubov, 0 tujih
  objav, 54 odigranih (krogi 1–6), 0 kontumacij; 50 polnih zapisnikov in 4
  nepopolni (1. krog: uredništvo je vpisalo le strelce); **postav po 11
  100/100, vratar 100/100**, goli = izid 52/54 (148/151), 446 menjav z
  minuto, 990 minut 89/100 ekip (ostale: rdeči karton ali menjava brez
  minute), 1544 nastopov (444 s klopi), vsi s šifro; 15 rdečih, 5 avtogolov,
  6 golov z 11 m. Od 2. kroga so polni vsi zapisniki (9/9 na krog).
- **Primera AF** — 38 krogov, 380 tekem, 20 klubov, 48 odigranih (krogi
  1–5), 3 kontumacije (3:0 brez postav); od 45 zapisnikov **le 20 polnih**
  (11 + 11, vratar 40/40, goli = izid 20/20, 163 menjav z minuto), 25 brez
  postav. Po krogih polnih: 4, 1, 5, 2, 8 od 9–10 — uredništvo postave
  Primere vpisuje vse bolj redno, a ne zanesljivo. Pred vklopom preveri
  pokritost zadnjih krogov; tekma brez postav da le izid (klubi brez točk).
- **Napake vira**: UP Langreo – Praviano (4. krog) ima v glavi 0:3, med goli
  3:2; El San Martín – Astur CF (4. krog, 2:2) ima vpisana le gola gostov;
  Sporting Atlético – Llanes (2. krog) in štiri druge tekme imajo nekaj
  menjav brez minute (vstop v postavi, minute ni) — opozorilo, rezerva brez
  nastopa. Izid ostane izid glave.
- **Arhiv 2025/26 ne obstaja** (glej zgoraj); preizkus lanskih tekem zato ni
  mogoč.

Uvoz (ena za drugo, brez arhiva): `gh workflow run uvoz-lige.yml -f
liga=es-as-tercera-g2 -f cene=true`.
