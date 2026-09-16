---
name: dodaj-ligo
description: Use when adding a new football league or federation to SLFF (a new MNZ, a new competition, or a new country) — covers the source adapter, parser differences between federations, archive import, player pricing, and the go-live checklist. Written after adding MNZ Ljubljana.
---

# Dodajanje nove lige

Vrstni red ni okrasek. Vsak korak stoji na prejšnjem, in če enega preskočiš,
se to ne pokaže kot napaka, ampak kot **liga, ki je videti v redu in ni**.

## Zakaj tako previdno

Ob dodajanju MNZ Ljubljana je bilo napak šest. **Nobena ni ničesar javila.**
Uvoz je vsakič poročal uspeh in vpisal smeti:

| kaj | posledica |
|---|---|
| letnica s štirimi števkami | cel arhiv v letu 2020 |
| sezona iz menija, ne z zapisnika | sezona `2026/20`, ki ne obstaja |
| konec razporeda ni ujel `REZULTATI TEKEM` | 8 klubov druge lige v prvi |
| minuta pred vsakim igralcem | **nobene menjave**, vsi po 90 minut |
| klub s sponzorjem | isti klub kot dva, statistika razpolovljena |
| PostgREST vrne 1000 vrstic | liga brez statistike, vsi igralci po 4.5 |

Iz tega sledi edino pravilo, ki ga velja ponoviti: **ne verjemi, da je uvoz
uspel, zato ker ni javil napake.** Preveri številke.

## 0. Ali je fantasy sploh mogoč

Vir mora objavljati **postave po tekmah**, ne le rezultatov in lestvic. Brez
postav ni minut, brez minut ni točk.

Medobčinskih zvez je devet (`nzs.si/zveza/organizacija/medobcinske-nogometne-zveze`)
in postave po tekmah objavljajo **vse**. Prvotno sem zapisal, da jih objavljajo
samo tri — to je bilo narobe in stalo je en cikel dela. Napaka je bila v metodi:
pogledal sem samo **domačo stran** vsake zveze. Rezultati in lestvice so tam,
zapisniki pa dve ali tri klike globlje, pri nekaterih zvezah pod `zapisniki?krog=`.
Nauk: dokler nisi odprl **strani tekmovanja**, ne pa samo naslovnice, o viru ne
veš nič.

Tri zveze dajo poleg imena še **registrsko številko NZS** (`Reg. št.`): Ptuj,
Murska Sobota in Lendava. Pri njih identiteta igralca ne stoji na ugibanju iz
imena in številke dresa.

**Državna tekmovanja (NZS).** Tu velja ločnica, ki ni po ligi, ampak po tem,
kdo tekmovanje *objavlja*:

- **1. SNL in 2. SNL — mogoče.** Stran s postavami stoji **pod** stranjo
  tekme: `/klubi/moski/<liga>/tekme/<slug>/zapisnik`. Vir je `nzs`.
- **3. SNL Vzhod in Zahod — mogoče** na dva načina: prek `nzs` kakor zgornji
  dve, ali prek MNZ, ki ju za tekočo sezono objavi na svojem spletišču.

**Tu sem se zmotil dvakrat in obakrat enako, zato je vredno zapisati, kako.**

Trdil sem, da NZS postav ne objavlja, in to za dve celi ligi. Stran sem
prenesel, a sem v njej **iskal besedo "postave"**. Te na njej ni: začetna
enajsterica nima nobenega naslova, klop piše "Rezervni igralci". Iz odsotnosti
NAPISA sem sklepal na odsotnost PODATKA.

Nato sem trdil, da arhiva ni, ker izbirnik sezone ob navadnem POST vrne tekočo
sezono. Odgovor AJAX pa v ukazu `redirect` pove, kam vodi — in to je navaden
`?season=<id>`.

Iz obojega isto pravilo: **preden zapišeš, da vira ni, poglej, kaj stran
vsebuje, ne, ali vsebuje besedo, ki jo pričakuješ.** Če iskanje ne najde
ničesar, je to podatek o iskanju, ne o strani. In nikoli ne sklepaj o celi
ligi iz ene poizvedbe.

**Regista** (`regista.nzs.si`) je v celoti za prijavo. Ni je treba obiskovati:
vse, kar potrebujemo, je javno na `nzs.si`.

**Skrbništvo 3. SNL se med sezonami seli.** Arhiva torej ni na isti strani kot
tekoča sezona; iskati ga je treba pri zvezi, ki je ligo vodila **tisto** leto:

| sezona | 3. SNL Vzhod | 3. SNL Zahod |
|---|---|---|
| 2026/27 | mnzpt `2026:96` | mnzng `2785` |
| 2025/26 | mnzle `2025-26/3-snl-v-25-26` | — |
| 2024/25 | mnzle `2024-25/3-snl-v-24-25` | — |
| 2023/24 | — | mnzlj `1703` |
| 2022/23 | — | mnzlj `1603` |
| 2017/18 | mnzle `2017-18/3-snl-v` | — |

Kako najdeš skrbnika za dano sezono: `sezona-<L>-<L>` v meniju pri Lendavi,
POST `sezona=<L>/<L>` na `index.cfm?akc=tekmovanja` pri zvezah na starem CMS-u
(Kranj, Ljubljana, Celje), `?sezona=<L>` pri Ptuju, `<slug>-<L><L>` v poti pri
Mariboru.

**Nova Gorica arhiv ima, a ga ne razkazuje.** Menija za pretekle sezone ni:
stara sezona je svoje tekmovanje s svojo šifro in do nje ne vodi nobena
povezava. Edini način je, da šifre **prečešeš** (`/tekmovanja/<n>/rezultati`).

Tu je past, ki me je prvič zavedla v napačno trditev, da arhiva ni: **neznana
šifra vrne privzeto stran s statusom 200**, ne 404. Vzorčil sem deset šifer,
vseh deset je bilo neveljavnih, vseh deset je vrnilo isto stran — in sklenil
sem, da arhiva ni. Privzeta stran je pri Gorici dolga 45304 B in nima nobenega
naslova kroga; veljavna jih ima 16–24. **Loči po vsebini, nikoli po statusu**,
in ne sklepaj iz vzorca — prečeši razpon.

Najdeno pri Gorici (razpon 1500–3600):

| šifra | tekmovanje | uporabno |
|---|---|---|
| 3199 | Primorska članska liga 2026/27 | tekoča sezona |
| 2579 | Primorska članska liga 2025/26 | **da** — 110 tekem, 446 golov, vse postave po 11 |
| 2163 | Primorska članska liga 2023/24 | **ne** — 0 golov, 193 od 220 postav ni po 11 |
| 1537, 1575 | starejši Primorski sezoni | ne — razčlenjevalnik vrne 0 tekem |
| 2785 | 3. SNL Zahod 2026/27 | tekoča sezona |

Starejša sezona torej ni samodejno uporabna: spletišče je obliko strani med
sezonama spremenilo. **Vsak arhiv preštej, preden ga uvoziš** — koliko tekem,
koliko golov, koliko postav ima natanko 11 igralcev. Arhiv brez golov je
tišja okvara od arhiva brez tekem.

3. SNL Zahod pri Gorici arhiva nima (prečesano 1500–3600); njegova arhiva sta
ljubljanska 1703 in 1603.

Šifre klubskih lig po sezonah:

| zveza | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|
| mnzg — člani / mladinci | 1601 / 1603 | 1502 / 1503 | — |
| mnzlj — 1. / 2. liga | 2003 / 2004 | 1904 / 1905 | 1804 / 1805 |
| mnzce — člani | 1902 | 1801 | 1701 |

Odpri en zapisnik in preveri, da vidiš številke dresov, imena in oznako `(V)`
za vratarja. Če ne, tu se konča.

## 0b. Vir `nzs` — državne lige

Drugačen od vseh MNZ, zato na kratko, kar je treba vedeti.

**Zapisnik** je `/klubi/moski/<liga>/tekme/<slug>/zapisnik`. Vrsto dogodka pove
**ikona**, ne besedilo:

| ikona | pomen |
|---|---|
| `fa-futbol` | gol |
| `fa-circle yellow` | rumeni karton |
| `fa-circle red` | rdeči karton |
| `fa-arrows-repeat` | menjava (ista ikona pri obeh; loči ju začetnik) |

Vsak igralec ima v profilni povezavi **stalno šifro**
(`…/mostvo/pijus-sirvys-157721`). To je najboljša identiteta med vsemi viri —
boljša od registrske številke, ker je vedno tam. Ugibanja iz imena in dresa
tu ni.

**Nastevanje tekem** je bilo težje od postav:

- Sezona je `?season=<id>`, kjer je id **številka iz spustnega seznama**, ne
  letnica: `372571` = 2026/27, `22` = 2025/26, `23` = 2024/25, `24` = 2023/24,
  `25` = 2022/23, `26` = 2021/22, `27` = 2020/21, `28` = 2019/20.
- Seznam je ostranjen z Drupalovim **večstranskim** pagerjem, zato je vrednost
  **par**: `page=0,<n>`, ne `page=<n>`. Z napačno obliko vrne vsakič isto
  stran in videti je, kot da ostranjevanja ni. Zadnja stran je krajša od
  desetih; to je edino merilo za konec, ker pager čez konec ne vrne napake.
- Šifra lige je `<pot>` za tekočo sezono in `<pot>:<sezona>` za arhiv.

Arhiv je globok: sezona 2022/23 ima 182 tekem na 19 straneh in se razčleni
enako kot tekoča.

## 0c. Preden uvoziš arhiv, ga preštej

Vsak arhiv ni uporaben, in neuporaben arhiv ne javi ničesar — uvoz poroča
uspeh in vpiše polovične podatke. Trije podatki povedo vse:

```
tekem · golov · koliko postav ima natanko 11 igralcev
```

Primerjaj Gorico: `2579` da 110 tekem, 446 golov in vseh 220 postav po 11;
`2163` da 110 tekem, **0 golov** in 193 od 220 postav, ki niso po 11. Isti
razčlenjevalnik, ista zveza, dve sezoni narazen — spletišče je vmes zamenjalo
obliko strani. **Arhiv brez golov je tišja okvara od arhiva brez tekem.**

## 1. Razčlenjevalnik

Preveri, ali vir uporablja **isti CMS** kot že znan (`index.cfm?akc=zapisnik`).
Ljubljana in Celje ga delita s Kranjem; ostalih pet zvez ima svoje.

Isti CMS **ne pomeni istega zapisa**. Preveri vsako od teh točk na pravem
zapisniku, ne po spominu:

- **Stolpci.** Naslavljaj jih po glavi tabele, ne po zaporedju. Ljubljana ima
  stolpec `Leto rojstva`, ki ga Kranj nima.
- **Letnica.** Dve števki ali štiri? `05.09.26` proti `05.09.2026`.
- **Tudi sezona ima tri različice.** Kranj piše `2025/26`, Ljubljana
  `2025/2026`, Celje pa `Golgeter 26/27`. Ob dvomestnem začetku je izraz, ki
  je zahteval štiri števke, segel mimo naslova nazaj v meni in našel
  `2007/08` — cel arhiv bi pristal dvajset let v preteklosti, brez ene same
  napake. Tri zveze, tri različice: **preveri jo pri vsaki novi.**
- **Sezona.** Beri jo v naslovni vrstici tik nad `Zapisnik:`, nikoli kot prvo
  vrstico z letnico na strani — meniji naštevajo vse sezone od 2006/07.
- **Datum tekme.** Če obstaja vrstica `Datum:`, velja ona; naslov kroga nosi
  nominalni dan in petkova tekma dobi soboto.
- **Menjave.** Je minuta zapisana enkrat na menjavo ali pred vsakim igralcem?
  To je najbolj zahrbtna razlika: če je ne ujameš, ni nobene menjave, vsi
  začetniki dobijo 90 minut in `nastopi` jih vrne natanko 22 — videti
  popolnoma pravilno.
- **Konec razdelka.** Naslovi niso gole besede: Kranj piše `REZULTATI`,
  Ljubljana `REZULTATI TEKEM`. Primerjava z enakostjo spusti skozi cel blok
  druge lige.

**Shrani vzorec v `scripts/vzorci/`** — zapisnik in razpored — in napiši
trditve v `npm run smoke`. Brez vzorca se prva taka napaka opazi šele na
lestvici. Vzorec obstoječe zveze mora ostati zelen: to je edini dokaz, da
nisi ničesar pokvaril.

## 2. Vir (`scripts/viri/`)

Nova datoteka + ena vrstica v `scripts/viri/index.mjs`. Uvozne skripte vira ne
poznajo — dobijo ga iz `competitions.source`.

V njej: osnovni naslov, oblike naslovov, razčlenjevalnik in **svoj slovar
vzdevkov klubov**. Vzdevki so last vira: dve zvezi sta dva ločena nabora
klubov in ime, ki v Kranju pomeni en klub, v Ljubljani lahko pomeni drugega.

Vzdevkov **ne dodajaj na zalogo**. Dodaj tistega, ki si ga videl: klub, ki
nastopa pod dvema imenoma. Če se razkolje znotraj ene sezone (12 + 12 tekem),
je to hkrati dokaz, da gre res za isti klub.

Če zveza česa ne objavlja (npr. prestopov), to povej z zastavico
(`imaRegistracije: false`) — "0 zapisnikov" je videti kot okvara.

**Šifra lige pripada SEZONI, ne ligi.** Ob novi sezoni se popravi
`competitions.source_league_code`, ne skripta. Arhiv poiščeš prek POST obrazca
za izbiro sezone in šifre zapišeš v CLAUDE.md.

## 3. Migracija — liga se vpiše NEAKTIVNA

```sql
insert into competitions (..., active) values (..., false);
```

Vmesnik bere `competitions_view` s filtrom `active = true`, zato migracija za
obstoječe uporabnike ne spremeni ničesar. Vklopiš jo šele po koraku 4.

Če dodajaš tudi zvezo, gre v `federations` (koda, ime, kratica, `site_url` za
navedbo vira v nogi).

**Kadar tekmovanja ne vodi tisti, ki ga objavlja.** Do 3. SNL je veljalo
"ena zveza = eno spletišče" in stolpca sta bila praktično ista stvar. Nista:

| stolpec | pomen | uporabi ga |
|---|---|---|
| `federation_id` | kdo tekmovanje **vodi** | izbirnik, ko grupira lige |
| `source` | kdo ga **objavlja** | uvoz, ko izbere razčlenjevalnik |
| `vir_ime` / `vir_url` | objavitelj za navedbo v nogi | noga, kadar nista ista |

Pri ligi MNZ pusti `vir_ime` in `vir_url` prazna — noga jih takrat vzame od
zveze in izpis je enak kot prej. Izpolni ju samo, kadar bi noga sicer lagala:
3. SNL vodi NZS, zapisniki pa so na strani Ptuja oziroma Nove Gorice.

## 4. Podatki in cene — tu se odloči, ali je liga igriva

```bash
node scripts/uvoz-zapisnikov.mjs  --tekmovanje <slug> --liga <arhiv>
node scripts/uvoz-razporeda.mjs   --tekmovanje <slug> --pisi
node scripts/uvoz-zapisnikov.mjs  --tekmovanje <slug>
node scripts/ugani-pozicije.mjs   --tekmovanje <slug> --pisi
node scripts/ovrednoti-igralce.mjs --tekmovanje <slug>
```

Cena je percentil **znotraj lige**, igralec pod 270 minutami dobi privzeto
4.5. Liga brez arhiva ima zato vse igralce po isti ceni: 15 × 4.5 = 67.5 pri
proračunu 100, nobene izbire, nobene igre.

**Ena arhivska sezona ni vedno dovolj.** Majhna liga (MNZ liga ima devet
klubov) v eni sezoni nabere premalo minut. Takrat uvozi še eno sezono nazaj in
`ovrednoti-igralce` poženi **brez** `--sezona`, da sešteje vse.

### Preveri, preden vklopiš

Odgovor da skripta — merila so v `src/lib/pripravljenost.ts`, uporablja jih
tudi delovni tok in stran za administracijo:

```bash
node scripts/pripravljenost-lige.mjs --tekmovanje <slug>
```

Konča se z napako in našteje, kaj manjka. Ročno pa tako:

```sql
select c.slug,
       count(*) filter (where p.active) aktivnih,
       round(avg(p.value) filter (where p.active), 2) povprecje,
       percentile_cont(0.9) within group (order by p.value)
         filter (where p.active) p90,
       round(100.0 * count(*) filter (where p.active and p.value = 4.5)
             / nullif(count(*) filter (where p.active), 0), 1) odst_privzetih
  from players p join competitions c on c.id = p.competition_id
 group by c.slug order by c.slug;
```

Nova liga mora biti **primerljiva z obstoječo**. Za MNZ Gorenjska: povprečje
okoli 5.2, p90 okoli 7.5, privzetih okoli 50 %. Če je privzetih 75 %, arhiva
ni dovolj — vrni se korak nazaj, ne vklapljaj.

Preveri še troje, ker vsako od tega je že bilo narobe:

```sql
-- 1. Klubov toliko, kolikor jih liga res ima (ne več!)
select count(distinct t.id) from players p join teams t on t.id = p.team_id
 join competitions c on c.id = p.competition_id where c.slug = '<slug>' and p.active;

-- 2. Menjave se berejo: nastopi s klopi NISO 0, povprečje minut okoli 67
select count(*) filter (where not started) s_klopi, round(avg(minutes_played),1)
  from appearances a join players p on p.id = a.player_id
  join competitions c on c.id = p.competition_id where c.slug = '<slug>';

-- 3. Noben gol brez nastopa strelca
select count(*) from goals g join matches m on m.id = g.match_id
  join rounds r on r.id = m.round_id join competitions c on c.id = r.competition_id
 where c.slug = '<slug>' and g.scorer_id is not null
   and not exists (select 1 from appearances a
                   where a.player_id = g.scorer_id and a.match_id = g.match_id);
```

## Uvoz proti produkciji

Ne prek terminala s produkcijskim ključem, ampak z delovnim tokom
**Uvoz lige (rocno)** (`workflow_dispatch`) — ključ tako nikoli ne zapusti
GitHuba. Zadnji korak je preverba pripravljenosti, zato zagon pade, če cenik
ni igriv.

```bash
gh workflow run uvoz-lige.yml -f liga=lj-1-liga -f arhiv=1904,1804
gh run list --workflow=uvoz-lige.yml --limit 1        # id zagona
gh run view <id> --log | grep -A 12 'Liga:'           # izid preverbe
```

Traja **20–30 minut na ligo** (arhiv dveh sezon je nekaj sto zapisnikov).

Če arhiv leži pri **drugi zvezi** kot tekoča sezona, pripni šifri `@vir`;
delovni tok iz tega sestavi `--vir` in uvoz bere s pravega spletišča, ne da bi
se liga preselila:

```bash
gh workflow run uvoz-lige.yml -f liga=snl3-vzhod \
  -f arhiv='2025-26/3-snl-v-25-26@mnzle,2024-25/3-snl-v-24-25@mnzle'
```

Ločilo je `@`, ker se `:` in `/` pojavljata znotraj samih šifer (Ptuj
`2026:96`, Lendava `2025-26/…`).

Delegacijske strani nima vsaka zveza; `uvoz-delegiranja.mjs` se pri viru brez
nje izpiše in konča z 0. Rok kroga takrat stoji na urah iz razporeda.

**Lige uvažaj ENO ZA DRUGO.** Delovni tok ima `concurrency: uvoz` s
`cancel-in-progress: false`. GitHub v taki skupini hrani **največ eno** čakajočo
zahtevo in vsaka nova povozi prejšnjo — osem naenkrat pomeni sedem preklicev,
ki jih opaziš šele, ko pogledaš seznam zagonov. Počakaj, da se vrsta izprazni,
šele nato zaženi naslednjo.

**Šifra lige gre v ime datoteke predpomnilnika.** Če vsebuje `/` ali `:`
(Lendava `2026-27/mnl-lendava-26-27`, Ptuj `2026:96`), jo je treba očistiti,
sicer postane pot v mapo, ki je ni. Obe lendavski ligi sta tako padli z
`ENOENT` — a šele po tem, ko je bil arhiv že prenesen. Za to je
`sifra()` v `scripts/viri/zapisniki.mjs`.

**Ime v predpomnilniku mora nositi LIGO, ne le šifre zapisnika.** Naslov
zapisnika vsebuje `liga=`, ime datoteke pa je bilo `<id>.html` — dve ligi
istega vira sta si tako povozili stran. Pokazalo se je pri 3. SNL Zahod, ker
sta oba arhiva (1703 in 1603) ljubljanska in tečeta v istem zagonu drug za
drugim: druga sezona je dobila postavo prve, goli pa so ostali svoji.
Invarianta `gol-brez-nastopa` je ujela **en gol od 3953**.

### Tako je izpadlo pri MNZ Ljubljana

Merilo za novo ligo ni absolutno število, ampak **podobnost z obstoječo**:

| liga | igralcev | klubov | krogov | privzeta cena | vrh |
|---|---|---|---|---|---|
| 1. GNL — člani (obstoječa) | 465 | 13 | 26 | — | 11.7 |
| LJ 1. liga | 520 | 12 | 22 | 49.4 % | 12.0 |
| LJ 2. liga | 281 | 8 | 18 | 55.5 % | 12.0 |

**Obe ljubljanski ligi sta potrebovali dve arhivski sezoni.** Z eno samo je
imela 2. liga 77.6 % igralcev na privzeti ceni — cenik brez razlik. Z dvema
je padlo na 55.5 %. Pri majhni ligi računaj z dvema že vnaprej.

### Ko preverba ustavi vklop

Sporočilo »liga ni pripravljena, glej zadržke« skoraj vedno pomeni, da
podatkov **še ni v produkciji** — uvoz je tekel lokalno. Preveri:

```sql
select slug, (stanje_lige(id)->>'aktivnih')::int, (stanje_lige(id)->>'krogov_tekoce')::int
  from competitions where slug = '<slug>';
```

Same ničle pomenijo: poženi uvoz. Gumba **Vseeno vklopi** ne uporabljaj za to
— obstaja za primer, ko veš kaj, česar preverba ne more vedeti, ne za to, da
se prebiješ mimo prazne lige.

## 5. Vklop

Na strani **Administracija → Lige**. Vsaka liga pokaže število igralcev,
klubov in krogov, gumb za vklop pa je onemogočen, dokler preverba ne gre
skozi — zadržki so našteti z razlogom. Kdor ve, kaj dela, ima pod njimi
izhod v sili.

Tam se nastavijo tudi **pragovi glasovanja po ligi** (prazno polje pomeni
globalno vrednost). Isto se da iz baze:

```sql
update competitions set active = true where slug = '<slug>';
```

Nočni uvoz seznam lig prebere iz baze (`scripts/aktivna-tekmovanja.mjs`), zato
delovnega toka ni treba spreminjati — nova liga se začne uvažati sama.

## Cene med sezono

Ob postavitvi je cena izračunana, potem pa jo premika **borza**: največ ±0.3
na krog in nikoli več kot 3.0 od `value_start`. Kdor je ob postavitvi imel
premalo minut, ima 4.5 — in če pozneje postane nosilec igre, ostane poceni.

Zato teče **tedensko prevrednotenje** (`tedensko-cene.yml`, torek). Cene ne
postavi na novo, ampak jih **približa** izračunani, največ za 1.0 na zagon
(`ovrednoti-igralce --tedensko --najvec N`). Brez te omejitve bi igralec čez
noč poskočil s 4.5 na 9.0, uporabnik pa ga ima v ekipi po stari ceni in
proračun je vezan na ceno ob nakupu. Sidro borze potuje z isto razliko, sicer
bi cena takoj obstala ob meji.

## Preverba podatkov

`node scripts/preveri-podatke.mjs` trdi stvari, ki morajo držati v vsaki ligi,
in se konča z napako, če katera ne drži. Teče vsak dan po nočnem uvozu
(`preveri-podatke.yml`) in ob težavi javi na Discord.

Dve pravili, ki sta se izkazali:

- **Preverba mora znati sprožiti.** Vsako je treba preizkusiti z namerno
  okvaro. Dve od mojih nista mogli sprožiti nikoli, ker isto stvar prepreči že
  enolično kazalo v bazi — omejitev v bazi je boljša varovalka (pade ob
  vpisu), preverba pa je bila prazna obljuba.
- **Preverba, ki lažno alarmira, je slabša od nobene.** Prva različica je v
  produkciji našla 5405 »težav«, od katerih ni bila nobena prava: v arhivu
  posnetek točk namenoma odstopa za vrednost asistence, ker se stare sezone ne
  osvežujejo. Zato točkovne preverbe gledajo samo tekočo sezono.

Ekipo mora biti mogoče **sestaviti**: pozicije in klubi so lahko vsak zase v
redu, pravilo o največ treh iz kluba in proračun pa se sekata. Skripta zato
sestavi najcenejši veljaven kader in ga primerja s proračunom.

## Dvojni pregled se je izplačal

Ta postopek je nastal ob MNZ Ljubljana, potem pa ga je pregledal še drug
model (Codex) in našel enajst napak, ki so vse držale. Dve se ponovita
povsod, zato sta tu:

- **Konstanta, prepisana na dveh mestih, se razide.** Preverba je javljala
  napako nad 12.0, borza pa gre do 15.0 — zakonita cena je zvenela kot okvara.
  Meje zdaj bere ena funkcija (`meje_borze()`), okno preračuna prav tako
  (`okno_preracuna_tock()`).
- **Približek namesto izračuna laže v obe smeri.** Izvedljivost kadra sem
  ocenil s požrešnim izborom po pozicijah; javljal je »nemogoče« tam, kjer
  veljaven kader obstaja, in spregledal primer, ko vseh pet branilcev pride iz
  enega kluba. Zdaj jo izračuna `najcenejsi_kader()` in isto številko bereta
  nočna preverba in vmesnik.

Tretje, kar velja ponoviti: **varovalka v brskalniku ni varovalka.** Vklop
lige zdaj brani sprožilec v bazi, zato pade tudi neposreden
`update ... set active = true` s servisnim ključem.

## Pasti, ki niso v korakih

- **PostgREST vrne največ 1000 vrstic in tega ne pove.** `.limit(5000)` in
  `.range(0, 9999)` meje ne premakneta. Vsaka nova liga približa poizvedbe
  meji. Kjer števila vrstic ne omeji majhen filter, beri prek `vseVrstice()`
  iz `scripts/strani.mjs` — in poizvedbi določi vrstni red.
- **Besedilo, ki imenuje zvezo.** Vir podatkov v nogi, "statistika iz uradnih
  zapisnikov X" — vse to mora priti iz tekmovanja (`imeZveze`, `virPodatkov`).
  Oglasno besedilo (vabilo, pravno obvestilo) je odločitev lastnika, ne
  samodejna zamenjava.
- **Pragovi glasovanja** so po tekmovanju (`competition_settings`). Prag treh
  glasov je v ligi z dvesto igralci lahek in v ligi z dvajsetimi nedosegljiv.
  Vmesnik jih bere prek `nastavitve_tekmovanja`, ne iz kode.
- **Predpomnilnik je ločen po viru.** Šifra zapisnika je last spletišča; dve
  zvezi štejeta v istem razponu.
- **Migracijo, ki jo urejaš po prvem zagonu, preveri na prazni bazi.** Lokalna
  jo že ima uveljavljeno in napaka se pokaže šele pri drugem razvijalcu.
- **Soimenjaki.** Če dva igralca z istim imenom igrata za isti klub, ju loči
  dres — dokler ga v bazi ni. Takrat je star uvoz posvojil edinega
  obstoječega in oba nastopa sta dobila isti `player_id`: baza je vstavljanje
  zavrnila in tekma je obvisela z `imported_at` in **brez enega samega
  nastopa**. Tako je pri Niko Železniki (trije »Potočnik Matic«) tiho izpadlo
  enajst arhivskih tekem. Zdaj se najprej porabijo obstoječi soimenjaki, ki na
  tej tekmi še niso zasedeni, sicer nastane nov zapis in tekma dobi opozorilo.
  Pripisa ni vedno mogoče uganiti — izgubiti tekme pa ne smemo.
- **Žig `imported_at` postavi šele, ko so nastopi in goli vpisani.** Sicer
  tekma ob spodleteli vstavitvi izgleda uvožena in nihče ne dobi točk.
- **`--zapisnik <id>`** popravi eno samo tekmo. Ponovni uvoz cele lige med
  sezono premakne več, kot je treba.
- **`--tedensko` je predogled**; za zapis je treba dodati `--pisi`. Preskoči
  igralce, ki že imajo zgodovino v `price_changes` — tem ceno upravlja borza
  in bi ju tedenski premik in ponovna uveljavitev starega kroga tolkla drug ob
  drugega. Urnik je zaenkrat izklopljen: ponovni zagon isti teden bi premik
  uporabil dvakrat, ker ni zapisa o že opravljenem tednu.
- **`ovrednoti-igralce` brez `--tedensko` med sezono ne poganjaj.** Cene
  postavi na novo, `value_start` pa pusti pri miru — cena konča več kot 3.0
  od sidra in borza obstane. Preverba to ujame (`cena-predalec-od-sidra`).
- **Vmesnik mora preživeti neuveljavljeno migracijo.** Koda gre na Vercel,
  migracijo pa nekdo požene proti Supabase; če se vrstni red obrne, PostgREST
  zavrne poizvedbo z neznanimi stolpci in vmesnik ostane brez lig. Beri, kar
  je na voljo (glej `brezZveze` v `src/lib/tekmovanje.tsx`).

## Objava

Koda in migracije potujeta vsaka po svoji poti: koda gre v git in prek CI na
Vercel, **migracije pa požene človek** (`npx supabase db push` zahteva geslo
baze; CI jih ne poganja).

Pravi vrstni red je **najprej migracija, potem koda** — takrat ni vmesnega
okna. Če se obrne, mora vmesnik preživeti: bere, kar je na voljo, in ne
ostane brez lig (`brezZveze` v `src/lib/tekmovanje.tsx`).

`supabase db push` zahteva **geslo baze**, ki ga v seji navadno ni. Migracije
se da uveljaviti tudi z dostopnim žetonom CLI (`security find-generic-password
-s "Supabase CLI"`) prek Management API:

```
POST https://api.supabase.com/v1/projects/<ref>/database/query   {"query": "<sql>"}
```

Dvoje, ker se drugače izgubi ura: Cloudflare zavrne zahtevo brez glave
`User-Agent` (napaka 1010), zapis v `supabase_migrations.schema_migrations`
(`version`, `name`) pa je treba dodati sam, sicer bo `db push` migracijo
pognal še enkrat. Žetona ne izpisuj — beri ga v spremenljivko.

Pred objavo naredi **generalko**, ne le testov:

```bash
# 1. varnostna kopija produkcijskih podatkov (anon ključ zadošča za javne tabele)
#    → shrani JSON po tabelah, zabeleži števila vrstic

# 2. lokalno na natanko produkcijsko stanje sheme
npx supabase db reset --local --no-seed --version <zadnja_uveljavljena>

# 3. naloži produkcijske podatke vanjo

# 4. požene migracije, kakor jih bo produkcija
npx supabase migration up --local
```

Po generalki preveri, da so **števila vrstic nespremenjena** in da so nove
stvari nastale. Tako se pokaže tudi razhajanje sheme: produkcija je imela
stolpec `appearances.is_goalkeeper`, ki ga ni v nobeni migraciji — nekdo ga je
dodal neposredno. Dodatek ni škodoval, a je dobro vedeti, da razhajanje
obstaja, preden kaj povoziš s `create or replace`.

**`npm test` teče proti pravemu testnemu okolju** (`npm run testno-okolje`),
ne proti kopiji produkcije. Kopija ima kroge s prestavljenimi tekmami in brez
fantasy ekip, zato padejo testi, ki so pravilni.

## Zakaj tekma ostane brez statistike

Ko poročilo javi odigrano tekmo brez statistike, vzrok skoraj nikoli ni
»uvoz je padel«. Padel uvoz se vidi. Tiho obvisele tekme imajo tri vzroke in
vsi trije so videti enako:

**1. Klub se v razporedu in v zapisniku piše različno.** Tekma se išče po
(krog, domači, gostje); če ključ kluba ni isti, je uvoz ne najde in ne javi
ničesar — z njegovega vidika ni česa uvoziti. Najbolj zahrbtne so **entitete
HTML**: `&amp;` v ključu postane beseda `amp`, `&#8211;` postane `8211`.
"Kety Emmi&Impol Bistrica" se je tako razklal na tri zapise. Preveri z:

```sql
select name from teams where name like '%&%;%';
```

**2. Prazna stran obtiči v predpomnilniku.** Zapisnik se objavi nekaj ur po
tekmi, uvoz pa ob koncu tedna teče vsako uro. Prvi zagon prenese stran BREZ
postav, ta obleži v predpomnilniku (ki se med zagoni obnavlja) in vsak
naslednji zagon jo prebere od tam. Zapisnik je medtem objavljen, a ga nihče
več ne pogleda. Zato mora vsaka pot ob nerazčlenjeni strani **poskusiti še
enkrat sveže** (`zapisnikSvez` v `scripts/viri/zapisniki.mjs`).

**3. Zveza je zamenjala domačina ali prestavila tekmo.** Razpored ima
"Visoko – Niko Železniki" 5. 9., zapisnik pa "Niko Železniki – Visoko" 8. 9.
Odigrana tekma se uvozi v svojo vrstico, razporedna pa obvisi. To je redko
(v vsej bazi en primer) in ne potrebuje kode — vrstico iz razporeda pobriši.

Kako ločiš, kaj od tega je: poglej, ali vir zapisnik **sploh ima**. Če ga
ima in ga uvoz ni vzel, je vzrok 1 ali 2; če ga nima, tekma samo čaka.

```bash
node -e "import('./scripts/viri/<vir>.mjs').then(async ({default:v})=>{
  const zs = await v.zapisniki('<koda>', async u => (await fetch(u)).text())
  console.log(zs.length, zs.map(z=>z.z.domaci.ime+'-'+z.z.gostje.ime).join(' | '))})"
```

## Cene med sezono: zagon, ki ga ni varno ponoviti

Tedensko prevrednotenje **ni idempotentno**. Vsak zagon približa ceno
izračunani za največ 1.0 in z njo potuje sidro borze `value_start` — dvakrat
v istem tednu torej pomeni premik za 2.0. Zaradi tega je bil urnik nekaj
časa izklopljen.

Varovalo je `players.repriced_week` (ISO teden, npr. `2026-W38`); ob njem
stoji `repriced_at` kot sled. Igralca, ki je ta teden že bil prevrednoten,
zagon preskoči.

**Teden, ne "manj kot sedem dni nazaj".** Drseče okno se z vsakim zagonom
premakne naprej: zagoni ob 6., 5. in 4. dnevu bi ceno premaknili trikrat.
ISO teden je nepremičen ključ — torkov zagon in sredin popravek zadeneta
istega.

Iz tega sledi tudi to, da je prekinjen zagon zdaj varno ponoviti: pobere
samo tiste, ki jih prvi ni. Zato ima tok izolacijo po ligah, tako kot uvoz.

Izjema je `--znova`, ki varovalo povozi. Uporabi jo le, kadar je prvi zagon
naredil kaj narobe in morajo cene res iti še enkrat.

## Kar je veljalo za eno ligo, pri sedemnajstih ne velja več

Trikrat se je isto pokazalo: odločitev, ki je bila pri **eni** ligi pravilna,
je pri sedemnajstih napačna, in koda tega ne pove — deluje naprej.

**Opomniki.** `posli-opomnik` je iskal uporabnike brez ekipe v DANI ligi.
Dokler je bila liga ena, je bilo to isto kot »brez ekipe«. Pri sedemnajstih
skoraj nihče nima ekipe v petnajstih novih, zato bi zagon čez vse lige
poskusil **5.830 sporočil**; isti človek bi jih dobil sedemnajst, ker varovalo
proti podvajanju šteje na par (uporabnik, liga). Pravilna številka je 217 —
po eno na osebo. **Izmeri, preden vklopiš karkoli, kar gre navzven.**

**Privzeta liga.** Za človeka brez ekipe sem privzeto vzel ligo z najnižjim
`sort_order`. To je 1. SNL, ker so državne lige na vrhu izbirnika — 195 ljudi,
prijavljenih ob Gorenjski, bi dobilo vabilo v 1. SNL. Vrstni red v izbirniku
je okrasek; kam človeka povabiti, je vsebina. Zdaj velja liga z največ
ekipami, kar se popravlja samo.

**Gostota.** Tudi produkt sam: pokritost je rešena, gostota ni. 170 od 198
ekip je v Gorenjski, ostalih petnajst lig ima po nekaj. Zato državna lestvica
in mini lige — obe delujeta pri vsaki gostoti.

Pravilo: **ko se število lig spremeni, preglej vse, kar šteje »na ligo«.**

## Nadzor: alarm in poročilo nista isto

`preveri-podatke.mjs` (dnevno) se oglasi **samo ob težavi**. To je prav za
alarm, a pomeni, da tišina lahko pomeni oboje — da je vse v redu ali da je
nekaj nehalo teči. Prav tiho ustavljen tok je tisto, česar nihče ne opazi.

`tedensko-porocilo.mjs` (ponedeljek) pride **vedno**, tudi kadar je vse v
redu, in pove številke po ligah: zadnji odigrani krog, koliko tekem v njem je
uvoženih, koliko tekem zadnjega tedna še čaka na statistiko, kdaj je naslednji
rok. Če poročila kak teden ni, je to podatek.

Webhooka sta ločena (`DISCORD_WEBHOOK`, `DISCORD_WEBHOOK_TEDENSKO`), da se
nujno opozorilo in tedenski pregled ne mešata v istem kanalu.

**Fantasy ekipa v vsaki ligi je tretja plast.** Račun lastnika ima ekipo v
vsaki aktivni ligi; če teden ne obračuna točk, se to vidi na ekipi, ne šele v
pritožbi igralca. Sestavi jih `/tmp`-skripta iz seje, pravila pa so v
`src/lib/pravila.ts` — baza jih NE preverja, preverja jih vmesnik, zato jih
mora vsak zapis mimo vmesnika preveriti sam.

## Krog ni odigran, dokler ni uvožena zadnja tekma

`krog_je_odigran` je dolgo pomenilo "vsaj ena tekma uvožena". V amaterski
ligi to ni isto kot "krog je končan": zapisniki pridejo vsak ob svojem času,
nekateri v nedeljo, drugi v sredo. Nočna borza (`uveljavi_zapadle_cene`,
pg_cron ob 3:30) je tak krog imela za končan in ovrednotila **tudi igralce,
katerih tekme še ni bilo v bazi** — v obdobju forme so šteli nič točk in
padli v ceni. Popravka ni bilo, ker `preracunaj_cene` izpusti igralca, ki za
ta krog že ima vrstico v `price_changes`. Padec je torej trajen.

Zato: **krog je odigran, ko so uvozene vse njegove tekme.** Če katera ne
pride nikoli (prestavljena, razveljavljena), krog ostane neodigran in ga
borza po štirinajstih dneh preskoči — raje brez obračuna kot narobe.

Ob novem viru to pomeni, da mora `uvoz-razporeda` vpisati **vse** tekme
kroga, tudi tiste brez zapisnika. Če jih vpiše le toliko, kolikor jih je
objavljenih, je krog videti končan, čim je objavljena zadnja od njih.

### Zeleni test, ki ni ničesar preveril

Napako je bilo mogoče videti samo ob PRVEM zagonu na svežem okolju. Ob
ponovnem je bil test zelen, ker je bila škoda že narejena in drugi zagon ni
premaknil ničesar. Poleg tega se je pomožna funkcija ob manjkajočem krogu
tiho vrnila — trditev je izginila, izpis pa je bil videti popoln.

Dvoje za naprej:

- **Test, ki ob manjkajočem vzorcu ne pade, ni test.** Če fixture ni, naj to
  pade, ne izpusti.
- **Preizkus, ki spreminja stanje, poženi na sveže postavljenem okolju.**
  `npm test` je idempotenten po namenu; kar se pokaže samo prvič, se skriva
  prav za to idempotentnostjo.

## Kar vmesnik skriva, API vseeno vrne

`fantasy_roster` je imel politiko `javno branje using (true)`. Vmesnik tujih
ekip ni kazal, zato je veljalo, da so skrite — a jih je z anonimnim ključem
prebral vsak, ki je znal poklicati PostgREST. Skrivnost je bila navidezna in
krivična: videl jo je tisti, ki zna, ne pa tisti, ki vpraša.

Ob vsaki tabeli, za katero misliš, da je zasebna, preveri z anonimnim
ključem, ne z vmesnikom:

```bash
curl -s "$URL/rest/v1/<tabela>?select=*&limit=3" -H "apikey: $ANON"
```

Pogledi nad tako tabelo tečejo s pravicami **lastnika pogleda**
(`security_invoker=false`). To je nož z dvema rezitvama: izračuni po
zaostritvi RLS delujejo naprej — a prav zato **zaostritev nanje ne velja**.
Zapreti tabelo in pustiti pogled nad njo pomeni pustiti vrata odprta.

Tu se je to zgodilo trikrat: `player_standings.owners` je štel žive kadre in
je v majhni ligi tujo ekipo izdal v celoti, `fantasy_team_wealth.roster_value`
in `fantasy_team_budget` pa sta bila seštevka istega. Rešitev je bila dvojna:
izbranost šteje posnetek zadnjega zaklenjenega kroga, obema seštevkoma pa je
vklopljen `security_invoker = on`, da zanju velja ista politika kot za kader.

**Ob vsaki zaostritvi RLS zato preštej pogleda nad tabelo in se pri vsakem
vprašaj, ali sme povedati to, kar tabela odslej skriva.** Agregat ni manj
razkrivajoč od vrstic — število je lahko dovolj.

Preveri, preden zaostriš:

```sql
select c.relname, coalesce((select option_value from pg_options_to_table(c.reloptions)
        where option_name='security_invoker'),'false') as invoker
  from pg_class c join pg_rewrite r on r.ev_class=c.oid
  join pg_depend d on d.objid=r.oid join pg_class t on t.oid=d.refobjid
 where t.relname='<tabela>' and c.relkind='v' group by 1,2;
```

## Dve nasprotujoči si prošnji imata pogosto skupen rok

V klepetu je en manager prosil, naj se vidijo tuje ekipe, drug pa odgovoril,
da igra tako izgubi smisel. Nobeden ni imel krive: pred rokom je vpogled
prepisovanje, po roku je postava zamrznjena in je edino, kar se da z njo
početi, primerjati se. Rešitev ni bila nastavitev zasebnosti, ampak **rok**
— `fantasy_lineups` postavo tako ali tako posname ob zaklepu.

Preden dodaš nastavitev, poglej, ali obstaja trenutek, ob katerem prošnji
nehata nasprotovati.

## Prošnja za nekaj, kar že obstaja, je prošnja za vidnost

Dve od treh prošenj v klepetu sta bili za stvari, ki jih aplikacija že ima
(stran Odsotnosti, glasovanje o pozicijah). To ni prošnja za funkcijo, ampak
podatek, da je v meniju ne najdejo. Preden kaj zgradiš, preveri, ali stran že
obstaja — in če obstaja, je delo drugje.

## Popravek, ki tiho ustavi celo ligo, je slabši od napake, ki jo odpravi

Prvi popravek zgornje napake je bil: "krog je odigran, ko so uvožene **vse**
tekme". Odpravil je krivico ~30 igralcem, uvedel pa hujšo: če ena tekma ne
pride nikoli — prestavljena čez štirinajst dni, zapisnik z dvoumnim imenom,
podvojena vrstica v razporedu — borza celega kroga ne obračuna več. Ker
`uveljavi_zapadle_cene` kroge, starejše od štirinajstih dni, preskoči, se to
ne popravi samo od sebe, nikjer ne piše in nihče ne opazi.

Prava rešitev je bila varovalko premakniti z **ravni kroga na raven igralca**:
krog je odigran, ko je uvožena vsaj ena tekma, iz obračuna pa izpade igralec,
čigar klub v oknu forme še nima zapisnika. Ker zanj ne nastane vrstica v
`price_changes`, ga naslednji nočni tek pobere sam.

Pravilo: **preden zaostriš pogoj, vprašaj, kdo vse ostane zunaj.** Če jih je
več, kot jih je bilo prej prizadetih, si napako povečal in jo skril.

Drugi del iste lekcije: varovalka mora pokrivati vse, kar v izračun vstopa.
Prvi popravek je varoval le krog, ki se je obračunaval — okno forme pa sega
dva kroga nazaj in tam je napaka ostala.

## Trditev, ki pade šele, ko jo pokvariš

Vsak nov preizkus poženi **tudi proti stari, pokvarjeni kodi** in preveri, da
pade. Brez tega ne veš, ali meri tisto, kar misliš.

Pri tuji postavi sta dve trditvi veljali same od sebe: `tuja_postava` ni
vrnila ničesar, ker vrstic v `fantasy_lineups` sploh še ni bilo — ne zaradi
zaklepa. Trditev je bila zelena tudi, če bi pogoj o zaklepu iz funkcije
izbrisal. Popravek: posnetek vpiši ročno, preden je krog zaklenjen, in šele
potem trdi, da ga ni videti.

Postopek, ki se je obnesel:

```bash
# rdeče: staro definicijo funkcije in nov preizkus v isto transakcijo
{ echo 'begin;'; <stara definicija>; <do blok preizkusa>; echo 'rollback;'; } \
  | docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres
```

Trditev tudi ne sme domnevati, KATERO vrstico bo koda izbrala. "Izbranost
šteje zadnji zaklenjeni krog" je bila zelena na golem seedu in rdeča na
uvoženem okolju — preizkus je mislil, da je njegov krog zadnji, v resnici jih
je bilo zaklenjenih dvajset. Trditev naj zadnji krog poišče enako, kot ga
poišče pogled.

Tudi mesto trditve šteje. "Obvoz prek `postava_kroga` ne izda kadra" je najprej
stal za zaklepom kroga — in tam funkcija vrne posnetek, ki je javen tako ali
tako. Trditev je padla, čeprav luknje ni bilo. Šele pred zaklepom meri tisto,
kar naj bi merila.

## Preizkus naj si stanje sestavi, ne poišče

Trditev o delno uvoženem krogu je stanje iskala med uvoženimi podatki. Sredi
tedna, ko vsi zapisniki pridejo, takega kroga ni — in pomožna funkcija se je
ob manjkajočem krogu tiho vrnila, torej je trditev izginila, izpis pa je bil
videti popoln. Zdaj tak primer sestavi `scripts/preizkus-borze.sql` sam (dve
tekmi, ena uvožena), e2e pa te trditve nima več.

## `sezone.odigranih` šteje tekme, ne krogov

Ime zavaja: pogled `sezone` z `odigranih` misli **uvožene tekme**. Pri članih
je to 19 proti 4 dejansko odigranim krogom. Kdor ga uporabi kot "zadnji krog",
razpotegne graf čez pol sezone, ki še ni bila odigrana. Zadnji odigrani krog
se dobi neposredno:

```ts
supabase.from('rounds')
  .select('number, matches!inner(imported_at)')
  .eq('competition_id', liga).eq('season', sezona)
  .not('matches.imported_at', 'is', null)
  .order('number', { ascending: false }).limit(1)
```

Brez filtra na sezono vrne krog iz lanskega arhiva (26 namesto 4).

## Preveri objavo po nizu, ki ga stara koda NIMA

Čakanje na Vercel z `grep "Gibanje cene"` je bilo takoj zeleno — tisti naslov
je v strani stal že prej. Stran sem torej pogledal, preden je bila objavljena,
in sklepal, da graf ne dela. Za čakanje vzemi niz, ki obstaja **samo** v novi
kodi:

```bash
until curl -s https://slff.eu/ | grep -o '/assets/[^"]*\.js' | head -1 \
      | xargs -I{} curl -s "https://slff.eu{}" | grep -q "ob postavitvi lige"; do
  sleep 20
done
```

## Kar hrani samo spremembe, je za graf treba dopolniti

`price_changes` ima vrstico le za krog, v katerem se je cena premaknila. Trije
zapisi zato izgledajo kot tri zaporedne spremembe, pa naj bo med njima pet
mirnih krogov ali noben. Vmesne kroge dopolni (`src/lib/gibanjeCene.ts`),
sicer graf laže o hitrosti gibanja.

Drugo: krivuljo raztegni na razpon **serije**, ne cenika. Premik za 0.3 je pri
igralcu za 4.5 velika novica in bi se ob lestvici od 0 do 15 zlil v ravno črto.

## Ekipa se prenaša sama, dokler se lahko

`zakleni_krog` ob roku posname shranjeni kader — uporabniku ni treba vsak
teden ničesar shraniti. Izjema je kader, ki ob roku ni več veljaven: posnetka
ni, krog je brez točk, in dokler ni bilo opozorila, tega ni povedal nihče.

Past je v tem, da kader **postane neveljaven sam od sebe**.
`roster_je_veljaven` gleda `players.team_id`, torej TRENUTNI klub. Ko igralec
med sezono prestopi v klub, iz katerega jih lastnik že ima tri, ekipa čez noč
krši omejitev `MAX_IZ_KLUBA` — brez vsake lastnikove spremembe. En prestop
(Tadić Ivano, Jesenice → Šenčur) je podrl štiri ekipe hkrati.

Isto velja za deaktivacijo: `uvoz-razporeda` igralce klubov zunaj lige
deaktivira, `roster_je_veljaven` pa zahteva `neaktivnih = 0`.

Zato ob vsakem uvozu, ki premakne igralce med klubi ali jih deaktivira,
preštej, koliko ekip je s tem postalo neveljavnih:

```sql
select c.slug, count(*) filter (where not roster_je_veljaven(ft.id)) as neveljavnih
  from fantasy_teams ft join competitions c on c.id = ft.competition_id
 where c.active group by 1 having count(*) filter (where not roster_je_veljaven(ft.id)) > 0;
```

**Opozorilo mora povedati razlog, ne le da je nekaj narobe.** In kadar razloga
ni zakrivil uporabnik, mora to izrecno pisati — sicer išče svojo napako, ki je
ni naredil.

### Množična pošta potrebuje varovalko na številu

Opozorilo naslavlja napako posameznika, zato jih je nekaj na ligo. Če jih je
nenadoma cel kup, to skoraj gotovo ni dvajset ljudi, ki bi vsak zase pokvaril
ekipo — verjetneje je uvoz deaktiviral cel klub. Zato se pošiljanje nad
`NAJVEC_NA_LIGO` ustavi: pomota, poslana dvajsetim, napake ne popravi.

## Projekt ima dva servisna ključa, funkcija pozna enega

Supabase ima zdaj star (`eyJ…`, legacy JWT) in nov (`sb_secret_…`) servisni
ključ. Oba sta veljavna, okolje edge funkcije pa dobi **le enega**. Koda, ki
dela `auth === "Bearer " + SERVICE_KEY`, zato drugega zavrne — in klic pride do
konca ter dobi `403 Samo administrator.`, kar krivdo zvali na pravice namesto
na zapis ključa. Sprejmi oba:

```ts
const strojniKljuci = [
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  Deno.env.get('SUPABASE_SECRET_KEY'),
].filter(Boolean)
const jeStroj = strojniKljuci.some((k) => auth === `Bearer ${k}`)
```

Kateri ključ okolje res ima, se preveri tako, da funkcijo suho pokličeš z
vsakim posebej.

## Ob koncu

`npm run smoke`, `npm test`, `npm run typecheck`, `npm run build` — vsi zeleni,
in **vzorec obstoječe zveze mora dati znak za znak enak izid kot prej**.
Posodobi `CLAUDE.md` (šifre lig po sezonah) in dopiši, kar te je presenetilo.
