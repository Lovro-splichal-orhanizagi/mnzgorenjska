# Hrvaška

Vir `hns` (`scripts/viri/hns.mjs`) bere **HNS Semafor** (semafor.hns.family),
javni prikaz COMET-a, v katerem HNS in vse županijske zveze (ŽNS, NS) vodijo
tekmovanja. Zapisnik je enak od Treće NL do III. ŽNL: postavi s številko dresa
in stalno šifro osebe (`data-personid` → `reg_st`), vratar označen, dogodki pri
igralcu z minuto (gol, 11 m, avtogol, karton, menjava). Menjave niso v parih —
vemo, kdaj je kdo prišel in šel, kar minutam zadošča. Pozicij razen vratarja
ni, zato hrvaške lige čakajo na glasovanje o pozicijah kot slovenske.

Šifra lige je **id tekmovanja** na Semaforju (`/natjecanja/<id>/`); vsaka
sezona ima svoj id, tudi arhiv. Stran tekmovanja nosi ves razpored, stran
tekme zapisnik. Vse lige po zvezah z arhivom in številom klubov izpiše:

```bash
node scripts/hrvaske-lige.mjs              # vse zveze
node scripts/hrvaske-lige.mjs --zveza 40   # ena zveza (oid, 40 = Međimurje)
```

Vpisanih je 15 lig severozahoda (migracija 20261004163300), **neaktivnih**:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| hr-3nl-sjever / -zapad / -centar | `115183774` / `114647051` / `114608014` | `100970578` / `100585203` / `100580402` |
| hr-mz-premier / -1mnl / -2mnl | `114562601` / `114562642` / `114563249` | `100660111` / `100663430` / `100664944` |
| hr-vz-elitna / -1znl | `114667150` / `114669201` | `100608915` / `100609886` |
| hr-kz-1znl | `114647266` | `100694508` |
| hr-is-elitna / -1znl | `114701073` / `114703568` | `100703751` / `100704518` |
| hr-ri-4nl | `114651788` | `100796651` |
| hr-zg-1liga / -2liga | `114608298` / `114608605` | `100629221` / `100632300` |
| hr-kc-elitna | `114703534` | `100712145` |

**Državne lige HNS** (migracija 20261012155100, **neaktivne**): pregled
pokritosti 12. 10. 2026 je pokazal, da `hrvaske-lige.mjs` izpusti vse s
"SuperSport" v imenu (filter `IZPUSTI`, ker sponzor nosi tudi HNK in HMNL), zato
vrh ni bil vpisan. Zapisnik je isti kot pri Treći NL.

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| hr-hnl | `114137140` (10 klubov) | `100391485` |
| hr-1nl | `114348034` (16) | `100413651` |
| hr-2nl | `114348039` (16) | `100418001` |

**Veteranske lige imena ne povedo** (pregled 15. 10. 2026): ZNS Zagreb ima
2026/27 "Premier liga" (`115622586`), "1. liga skupina A/B" (`115624020`,
`115628588`) in "2. liga skupina A/B/C" (`115630270`, `115632903`,
`115635697`) — veteranske, klubi "VNK …" in veteranske ekipe NK. Filter
`IZPUSTI` jih po imenu ne ujame, zato `hrvaske-lige.mjs` ligo izpusti še po
klubih (`jeVeteranska`: klub "VNK …" ali "… veterani"; trki imen jih ne
štejejo). `IZPUSTI` izpusti še pokale "HNK …" (HNKŽ, HNK NSKŽ), futsal "ŽNML"
(klubi MNK) in "djevojčice/zagičice". Pregled vseh 40 zvez po popravku: drugih
takih lig ni, nobena ni vpisana v bazi.

**Mladinske lige (juniori, U19)** (migracija 20261013110100, 28 lig,
**neaktivnih**): pregled 12. 10. 2026 je prečesal seznam tekmovanj vseh 40
zvez (`/handlers/getCompetitions/`, sezoni 2026/2027 in 2025/2026; skripta
`hrvaske-lige.mjs` mladinske izpusti) in odprl en zapisnik vsake lige in
vsakega arhiva: povsod postavi 11 + 11 s šifro osebe, vratar in klop, kot pri
odraslih. Kot druge U19: `prvi_fantasy_krog = 2`, `rok_pomak_ur = 2`.
Državne in regijske (nogometna središta HNS: Istok, Centar, Rijeka, Sjever,
Split) imajo zvezo `hns`, županijske in NS zvezo kot lige odraslih.
Primorsko-goranska in Varaždinska imata namesto U19 **U18** — šifra ima vseeno
`u19`, da ju `je_mladinski_slug` prepozna kot mladinski (smoke).

Izpuščeno: Međimurje U-19 (`115953166`, arhiv `101026354`) — stran
tekmovanja 12. 10. vrača HTTP 500 (U-17 iste zveze dela); vpiši, ko se
popravi. Koprivnica "U-17 Kadeti i juniori" (U17), Split NSŽSD (5 klubov),
Dubrovnik (5, nič odigranega), Požega (3), Đakovo (5, 8 na 8), Virovitica
(2026/27 le pokal), HNS pilot "liga ulaznih juniora U-18", pokali (HNK, ŽNS),
futsal, kvalifikacije.

Arhiv je izbran po skupnih klubih; vejica pomeni več lanskih lig (vsaka ima en
sam arhiv). **Brez arhiva**: Centar III. (nova liga, največ 2 skupna kluba),
Rijeka U18 (lani je PGŽ ni imela) in ZŽ I. (lanske 1. lige ni; edini arhiv
`101304947` — 3 od 8 klubov pri obeh — dobi ZŽ II. po imenu). Šibki arhivi:
Karlovac (lani 4 klubi), Sjever, Split II., Istok, ZG II. (4–6 skupnih).

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 (skupnih klubov) |
|---|---|---|---|
| hr-u19-1hnl | 16 | `114526424` | `100454960` (12) |
| hr-u19-2nl | 14 | `114771687` | `100540163` (12) |
| hr-u19-2nl-b | 14 | `114771691` | `100540177` (9) |
| hr-u19-1nl-istok | 9 | `114864867` | `100911679` (6, lani Središte Osijek) |
| hr-u19-1nl-centar | 16 | `114975565` | `101044860` (9) |
| hr-u19-2nl-centar | 14 | `114985034` | `101047726` (7) |
| hr-u19-3nl-centar | 9 | `114992787` | — |
| hr-u19-1nl-rijeka | 12 | `115053595` | `101025334` (11) |
| hr-u19-1nl-sjever | 10 | `115344352` | `100732196,100734814` (4 + 5, Prva + Druga) |
| hr-u19-1nl-split | 13 | `116563036` | `101245463` (10) |
| hr-u19-2nl-split | 13 | `116566614` | `101805614` (5) |
| hr-zg-u19-1znl | 14 | `114507628` | `100785503` (10) |
| hr-zg-u19-2znl | 6 | `114507634` | `100785794` (4) |
| hr-bj-u19-sjever | 10 | `114681204` | `100633968` (6) |
| hr-bj-u19-jug | 10 | `115169842` | `100634009` (8) |
| hr-bp-u19 | 8 | `115910901` | `101574772,101579365` (4 + 3, Centar + Istok) |
| hr-is-u19-a | 11 | `115006487` | `100949387` (9) |
| hr-is-u19-b | 8 | `115003917` | `100954626` (6) |
| hr-ka-u19 | 11 | `115466348` | `101150516` (3 od 4) |
| hr-kz-u19 | 11 | `115942754` | `100905225` (6) |
| hr-ri-u19 (U18) | 14 | `115228638` | — |
| hr-sm-u19 | 9 | `115008823` | `101064213` (8) |
| hr-vz-u19 (U18) | 12 | `114799310` | `101887799` (12) |
| hr-vs-u19 | 13 | `114880435` | `100803263,101338736,100671629` (8 + 2 + 2: Liga juniora A, Županja, Vukovar) |
| hr-zz-u19-1liga | 8 | `114786421` | — |
| hr-zz-u19-2liga | 9 | `114786736` | `101304947` (3) |
| hr-ku-u19 | 10 | `114768241` | `100559950` (6) |
| hr-na-u19 | 7 | `114377093` | `100460540` (5) |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=hr-u19-1hnl -f
arhiv=100454960 -f cene=true`; liga brez arhiva brez `arhiv`. Pred uvozom
poženi `node scripts/hrvaske-lige.mjs` za trke imen (mladinske ekipe nosijo
ime kluba) in po uvozu *Grbi klubov* z `vir = hns`.

Klubi se ujemajo le znotraj države vira (`mapaKlubov` po `vir.drzava`):
"NK Polet" ali "NK Mladost" je v Sloveniji in na Hrvaškem drug klub. Ključ
kluba ohrani ć in đ, ki ju slovenski `poenostavi` zavrže — tudi natančno ime
v `mapaKlubov` gre skozi `vir.poenostavi` (prej slovenski: "NK Tomislav (Đ)"
je bil "nk tomislav" in vanj je padel NK Tomislav iz Drnja).

**Isto ime, drug klub.** Semafor istoimenskim klubom večinoma doda oznako
("NK Tomislav (DA)"), ne vedno: "NK Ponikve" je Zagreb in Ston, "NK Polet
(SK)" Sveta Klara in Skrad. Uvoz ju je vpisal v isti zapis (grb, stran
kluba, navijači). `IME_KLUBA` v `hns.mjs` enega preimenuje po šifri kluba
na Semaforju (`data-id` v razporedu; glava strani tekme šifre nima, zato
zapisnik vzame ime iz razporeda). Pregled 9. 10. 2026 je našel sedem
zapisov, migracija `20261011184300` jih je razdelila. `node
scripts/hrvaske-lige.mjs` na koncu izpiše nove trke — dodaj jih v
`IME_KLUBA`, preden ligo uvoziš, in preimenuj le klub, ki v bazi zapisa s
tem imenom še nima.

Vmesnik je v hrvaščini (`src/i18n/hr/`, `JEZIK_DRZAVE.HR`), vstop je
`slff.eu/hr`, kartica ob deljenju `hr.html`, pošta ima hrvaško vejo. Stran
Pozicije je v meniju kot v Sloveniji.

Posebnosti, ki jih je našel pregled pred vklopom (7. 10. 2026):

- **Kontumacija**: Semafor pri 3:0 vnese postavo le ekipe, ki je prišla
  (`jeKontumacija` v `hns.mjs`); razpored tekmo označi in vpiše izid. Tudi
  3:0 z obema postavama, a ena ima manj kot sedem začetnikov in dogodkov ni
  (Suhopolje : Crnac, Crnac s šestimi, 9. 5. 2026) je kontumacija — tekma se
  ni začela; `vZapisnik` zanjo vrne null.
- **Strelec s klopi brez menjave** (ŽNS Zagreb menjav ne vpisuje) dobi nastop
  z goli in kartoni (`dodajStrelceSKlopi` v `zapisnik.mjs`); prej je bil gol
  le v `goals` in točk ni prinesel.
- `appearances.is_goalkeeper` je oznaka vratarja na tisti tekmi (tekme,
  uvožene od 7. 10. 2026 21:07 UTC). *Uskladi pozicije* z `vir = hns` po njej loči prave vratarje od
  enkratnih (Mezga: 1× vratar, 5 golov).
- Nastop v letošnjem zapisniku igralca vrne med aktivne in ga prestavi v klub
  zadnje tekme; arhiv kluba ne prestavlja.
- Kratko ime je v državi enolično (oznaka županije in raven: "MZ I.",
  "VŽ Elitna"), ker stoji brez zveze v roku, rezultatih in zadevi maila.
- 1. ŽNL Karlovac je zapisnike na Semafor začela vnašati (pregled 12. 10. 2026:
  143 tekem s postavami); `hr-ka-1-znl-nskz` je vklopljena.
- **Vklop sredi sezone**: borza neaktivnih lig ne premika; ob vklopu postavi
  `prvi_fantasy_krog` na naslednji krog, da borza starejših krogov ne
  obračuna (začetna cena jih že vsebuje). **Naslednji krog = prvi krog za
  zadnjim krogom z zapisniki**, ne "najnižji krog z rokom v prihodnosti":
  krog s prestavljeno tekmo ima lahko rok čez mesec (Koprivnica, krog 5 z
  rokom 31. 10., 6 in 7 že odigrana; vklop 8. 10. je izbral 5, popravek
  `20261008033100`). Pred vklopom preveri, da noben krog ≥ prvega nima
  zapisnikov.

Beremo odkrito (`User-Agent: SLFF fantasy`, 500 ms med zahtevki,
popolnih zapisnikov ne beremo znova), vir je v nogi vsake strani.

Grbe hrvaških klubov prinese `scripts/grbi-hns.mjs` z glave strani tekme
(`club1` domači, `club2` gostje — po mestu, ne po `alt`; izvirnik namesto
80 px, v `public/grbi/hr-*`) — delovni tok *Grbi klubov* z `vir = hns`,
najprej brez `pisi`, po želji `tekmovanje`. Klub brez grba ima na Semaforju
`logo nologo` brez slike in ostane pri grbu iz začetnic. Načrt (brez
`--pisi`) dela tudi z javnim anon ključem. Po uvozu nove hrvaške lige ga
poženi znova.

## Prva HNLŽ: zaprt začetni uvoz

`hr-prva-hnlz` uporablja ločen, strog adapter `hr-hnlz-v1`: tekoči vir
`114471579`, arhiv `108043476` (vseh 75 tekem) in prvih 14 tekočih krogov.
Arhivske faze se preslikajo brez izgube izvornega kroga ali faze. Osem
izvornih klubskih ID-jev se pred uvozom preveri prek servisnega konteksta;
sprememba prikaznega imena ne ustvari novega kluba. Organizacija `1274` ostane
natančno tista organizacija, ki jo navaja preverjeni vir.

Samo zgodovinski zapisniki `114471617`, `114471627` in `114471629` imajo
izrecno nedostopno individualno statistiko. Uradni rezultat ostane, nastopi
in goli se zanje ne ustvarijo. Noben prihodnji zapisnik ne dobi te izjeme.
Zajeti dokazi 18. oktobra 2026 še blokirajo izdajo: pri `114471645` vloga
vratarke od 86. do 90. minute ni objavljena, `114471644` ima le rezultat brez
polnega zapisnika, `114471642` pa še nima rezultata. Splošni seznam igralk ne
zamenja podatka o vlogi na konkretni tekmi.

Začetni uvoz vodi samo `uvoz-hr-zenske.yml`, z enako skupino hkratnosti kot
ročni uvoz te lige. Običajni `uvoz-lige.yml` ta slug zavrne. Bralni posel
brez ključa baze preveri natančen pregledani commit na `main`, draft izdajo
v tem repozitoriju, ID sredstva, SHA arhiva in manifesta ter vse izvorne
bajte. Arhiv sme vsebovati le `manifest.json` in imenovane HTML dokumente v
`documents/`; poti navzgor, povezave, podvojene in prevelike datoteke odpadejo.
Ime sredstva je `hns-women-<pregledani SHA>.tar.gz`; arhiv se naredi iz korena
že preverjenega paketa, na primer:

```bash
tar -czf hns-women-<pregledani-SHA>.tar.gz -C <paket> manifest.json documents
```

Pisni posel ponovno preveri shranjeni arhiv, nato atomsko pripravi neaktivno
ligo, 40 objavljenih krogov in tri oznake nedostopne statistike. Način `import`
uvozi arhiv, tekoči razpored in stroge tekoče zapisnike ter zažene običajno
oceno pozicij in cen. Vsak otrok teče z zaprtim prednalagalnikom:
neznana HNS zahteva se zavrne, nikoli ne pade nazaj na živi vir. Izvorni časi
zajema ostanejo nespremenjeni. Tudi neaktivni neposredni CLI zahteva tak
preverjen paket z `releaseReady: true`.

Neobjavljena ura začetka ostane `NULL`. Fantazijski rok za tak datum je
00:00 v `Europe/Zagreb`, pri objavljeni uri pa velja šesturni odmik.
Razpored piše kroge samo prek varovanega RPC: prihodnji rok sme premakniti
le prej, zaklenjenega ali pretečenega pa ne odpre ponovno. Poznejša tekoča
faza zahteva ločen pregled objavljenega vira.

Ta checkpoint še nima kanonične preverbe podatkov po uvozu in atomskega
vklopa. Delovni tok zato ne ponuja vklopa; migracija `20261018180300` se do
zaključka tega dela in neodvisnega pregleda ne združi ali namesti. Paket s
trenutnimi blokiranimi dokazi ostane `releaseReady: false` in se zavrne pred
prvo zahtevo pisnega posla v bazo.
