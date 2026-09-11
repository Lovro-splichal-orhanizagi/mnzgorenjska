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

- **1. SNL in 2. SNL — ni mogoče.** `nzs.si` da razpored, rezultate, sodnike,
  gledalce, lestvico in zbirno statistiko sezone, postav pa ne. Preverjeno:
  stran na tekmo (`/klubi/moski/<liga>/tekme/<slug>`), njeni podzavihki,
  `?tab=`, `nzs-dynamic-page`, `prvaliga.si`, iskanje PDF‑jev in uradnih objav.
  Postave so v **Registi** (`regista.nzs.si`), ki je v celoti za prijavo.
  Nobena MNZ 1. ali 2. SNL ne podvaja — preverjeno po seznamih tekmovanj vseh
  zvez in vseh sezon.
- **3. SNL Vzhod in Zahod — mogoče**, ker ju vodi posamezna MNZ in ju objavi
  na svojem spletišču z istimi zapisniki kot svoje lige.

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
(Kranj, Ljubljana, Celje), `?sezona=<L>` pri Ptuju. Nova Gorica in Maribor
arhiva **nimata** — neznana šifra tam vrne privzeto stran s statusom 200, ne
404, zato je videti, kot da arhiv obstaja. Preveri po vsebini, ne po statusu.

Šifre klubskih lig po sezonah:

| zveza | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|
| mnzg — člani / mladinci | 1601 / 1603 | 1502 / 1503 | — |
| mnzlj — 1. / 2. liga | 2003 / 2004 | 1904 / 1905 | 1804 / 1805 |
| mnzce — člani | 1902 | 1801 | 1701 |

Odpri en zapisnik in preveri, da vidiš številke dresov, imena in oznako `(V)`
za vratarja. Če ne, tu se konča.

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

## Ob koncu

`npm run smoke`, `npm test`, `npm run typecheck`, `npm run build` — vsi zeleni,
in **vzorec obstoječe zveze mora dati znak za znak enak izid kot prej**.
Posodobi `CLAUDE.md` (šifre lig po sezonah) in dopiši, kar te je presenetilo.
