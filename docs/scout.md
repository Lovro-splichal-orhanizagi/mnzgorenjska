# SLFF Scout: analitični stroj (faza 1)

Spec: `docs/superpowers/specs/2026-10-16-scout-design.md`. Načrt:
`docs/superpowers/plans/2026-10-16-scout-faza1-stroj.md`. Kjer se ta datoteka
in načrt razhajata, velja ta datoteka (opisuje kodo, kot je).

Delavec `slff-scout` (Python 3.12, `scout/stroj/`, numpy + psycopg) iz
zapisnikov izračuna moč lig, Elo klubov, kazalnike igralcev, indeks po
poziciji, podobne igralce in vrzeli v kadrih. Vse zapiše v zaprto shemo
`scout` kot novo različico (`scout.modeli`) v eni transakciji. Vmesnika
(faza 3) še ni.

**Stanje (10/2026):** prvi backtest (ciljna 2025) je bil `padel`, ker 2025 ni
imela zgodovine za moč lig; na pokritih prestopnikih ciljne 2026 moč lig
izboljša napoved za 7,3 % (glej *Backtest*).

## Tok

1. `nalaganje.py`: en SQL sešteje nastope po (igralec, liga, sezona) z on/off,
   drugi tekme za Elo, tretji članske lige s stanjem države iz `scout.drzave`.
   Branje gre prek strežniškega kazalca v kosih po 50 000 vrstic, s
   `set local cursor_tuple_fraction = 1` (s privzetim 0.1 je produkcija
   izbrala gnezdeno zanko in nalaganje ni končalo v 10 minutah).
2. Izločanje (glej *Identiteta in izločanje*).
3. `elo.py`: Elo vsake (liga, sezona) od 1500 (k = 20, domači +60). Meri moč
   ekipe znotraj lige (kontekst ekipe), ne med ligami.
4. `moc_lig.py` (enkrat na teden, glej *Urnik*): moč lig (glej *Moč lig*).
5. `kazalniki.py`: deleži minut, začetkov in celih tekem, stalnost čez
   sezone, goli brez 11 m na 90, delež golov ekipe, on/off, prejeti, vratar
   proti povprečju lastne ekipe, čiste mreže, kartoni, trend minut, prehod
   ravni. Stopnje so skrčene proti povprečju (liga, pozicija) z 900
   navideznimi minutami; napad × `exp(moc)` in popravek za Elo lastne ekipe,
   prejeti × `exp(-moc)`. Zaupanje iz minut (polno pri 1800), šifre (brez
   ×0.7) in vira moči (model 1, piramida 0.8, država 0.6, brez 0.5).
6. `indeks.py`, `podobnost.py`, `vrzeli.py`: le odprte države, aktivne lige,
   tekoča sezona lige, znana pozicija. Z-vrednosti, percentili in podobni so
   znotraj (država, skupina), nikoli čez države. Prag discipline je p90
   kartonov po (liga, pozicija), vsaj 0.2 na 90, le pri ≥ 10 igralcih.
7. `backtest.py` (ob tedenski moči lig): glej *Backtest*.
8. `pisanje.py`: nova vrstica `scout.modeli` in vse tabele v eni transakciji.
   `COPY` v začasno tabelo, nato `insert … select` v tabelo `scout` (RLS
   zavrne `COPY FROM` v tabelo, ki je vloga ni lastnik). Ostanejo trenutni in
   zadnji trije objavljeni modeli; starejši neobjavljeni se pobrišejo.

Projekcija na raven kluba: `vrednost_ref * exp(-moc_lige_kluba)`, **le na ligo
iste države** (moč je lestvica znotraj države).

## Identiteta in izločanje

Oseba (ključ čez lige in sezone):

- s šifro: `r<source>:<reg_st>` — šifra je enolična le znotraj vira
  (`competitions.source`), zato vir v ključu;
- brez šifre: `i<country_id>:<ime z malimi>:<team_id>` — ime + klub v državi
  (Slovenija, stari CMS MNZ). Prestop med klubi brez šifre zato ni povezan.

Viri so po državah, zato ena oseba nikoli ne zajame dveh držav.

V izračun ne vstopi cela oseba (vse njene vrstice), če ima:

- vrstico v mladinski ligi (`je_mladinski_slug`) — katerokoli, tudi staro —
  ali vrstico z istim ključem imena ali šifre v državi kot katerakoli mladinska
  vrstica (ista oseba brez šifre v drugem klubu, tudi soimenjak); izjema je le
  oseba vrstice, za katero je potrjen profil prijavil polnoletno letnico
  (`scout.odrasle_vrstice()`), soimenjakova prijava ne odpre nikogar drugega;
  ključ je po vseh sezonah, polnoletna letnica pomeni `letnik <= letos - 19`
  (polnoleten vse leto), v izračunu pa je le, kdor ima članske minute;
  mladinske lige same tudi niso v izračunu;
- ugovor: ključ katerekoli vrstice (država + ime ali država + šifra) v
  `scout.ugovori`; zajame tudi isto osebo brez šifre v drugem klubu,
  soimenjaka v državi in poznejše uvoze (kot anonimizacija spodaj);
- anonimizirano vrstico: ta izpade sama (`anonimiziran_at`), ostale vrstice
  iste osebe pa po ključih `anonimizacijski_kljuc(country|ime)` in
  `(country|reg|reg_st)` v `anonimizirani_igralci`. Ključ imena nima kluba,
  zato izpade tudi soimenjak v drugem klubu iste države (namerno, varneje).

## Moč lig

Dvosmerni fiksni učinki v numpy (izmenično odštevanje povprečij, do 500
korakov): `log((goli_np + 0.5) / (minute/90)) = sposobnost osebe + moč lige +
c · Elo ekipe`. Vzorec: igralci izven vrat z ≥ 450 minut v sezoni, ki so igrali
v več ligah; liga mora imeti ≥ 20 takih vrstic. (Spec predvideva MixedLM;
pregled je pokazal, da pri produkcijski velikosti ni izvedljiv.)

**Lestvica je znotraj države.** Razlike so določene le znotraj povezane
komponente lig (oseba poveže lige, v katerih je igrala). Vsaka država obdrži
komponento z največ vrsticami in jo centrira tako, da je mediana njenih lig 0.
Ostale lige dobijo moč po vrsti:

1. `model` — iz zgornjega;
2. `piramida` — iz ravni (`ravni.py` = prepis `ravenLige` iz
   `scripts/visja-liga.mjs`, test enakosti) in modelnih lig iste države;
3. `drzava` — mediana modelnih lig države;
4. `brez` — 0.

`scout.lige_moc.vir` pove, od kod. **Primerjav in projekcij čez države v fazi
1 ni**; za to bo treba sidrni model med državami.

Produkcija 10/2026: SI ima le 3 modelne lige (8 lig v vzorcu, 2 komponenti),
13 lig iz mediane; Slovenija nima ravni v `ravenLige`. Prestopi znotraj SI so
po imenu in klubu, torej večinoma napredovanja in izpadi klubov.

## Backtest

Napove gole brez 11 m na 90 v ciljni sezoni iz prejšnjih (brez puščanja: moč,
Elo in kazalniki vidijo le starejše sezone) za vse države. Primerja tri
napovedi pri igralcih, ki so zamenjali ligo (prestopniki): model, naivno
(lanski učinek) in ablacijo brez moči lig (le krčenje).

Pogoj šteje le **pokrite prestopnike** (`n_pokriti`): obe ligi para imata moč
z virom `model` ali `piramida`, ne nadomestne (`drzava`, `brez`). Pri ligi
brez naučene moči je model kar ablacija in razlike ni mogoče izmeriti.
`n`, `mae_model`, `mae_naivno`, `mae_brez_moci` veljajo za vse pare in
`n_prestopi` šteje vse prestopnike; `mae_*_prestopi`, `izboljsava_prestopi` in
`izboljsava_moci` pa so izračunani **le na pokritih** prestopnikih.

**Ciljna sezona** (`izberi_ciljno_leto`): od zadnje (`max(leto)`) navzdol,
največ tri, prva z vsaj 200 pokritimi prestopniki (šteje jih le prilagoditev
moči, brez kazalnikov). Če je ni, je `stanje` `premalo podatkov` in
`ciljno_leto` prazno. **Ciljna je lahko tudi tekoča sezona** — namerna
izbira: zgodaj v sezoni je ocena šumnejša (malo minut), a je pogosto edina z
dovolj zgodovine pred sabo.

`stanje`:

- `premalo podatkov` — manj kot 200 pokritih prestopnikov;
- `prestal` — ≥ 15 % manjša napaka od naivne **in** ≥ 1 % manjša od ablacije
  (`MIN_IZBOLJSAVA_MOCI = 0.01`); le tak model je `objavljen`;
- `padel` — sicer.

Raziskava (10/2026, produkcija, branje brez pisanja): stari pogoj s ciljno
2025 je bil `padel` s +0,0015 % proti ablaciji, ker 2025 skoraj nima
zgodovine (pred njo le 2024) — moč se je naučila za 2 ligi, 918 od 926 lig je
dobilo 0 in 99,9 % prestopnikov je imelo enako moč obeh lig.

Prvi zagon z novim pogojem na produkciji (16. 10. 2026, branje brez pisanja):
ciljna 2026, 5563 pokritih prestopnikov, **+18,6 % proti naivni, +7,3 %
proti ablaciji**, `prestal`. Trajal je 61 s, največ ~600 MB pomnilnika
(lokalno). 2026 je tekoča sezona, zato je ocena šumnejša.

## Urnik

`python -m stroj --zanka` teče vsak dan ob **11:00 Europe/Ljubljana** (nočni
uvozi med tednom začnejo ob 07:17 in tečejo do 190 minut). Napaka v zagonu
se izpiše in javi na Discord (`DISCORD_WEBHOOK` v `/opt/slff-scout/.env`;
brez njega le dnevnik), zanka teče naprej. Tekme brez izida (NULL goli)
izloči že `SQL_TEKME`, `elo()` jih za vsak primer preskoči (28.–30. 10. 2026
je TypeError tri dni ustavil stroj).

Moč lig in backtest se izračunata, ko je zadnji izračun v bazi
(`max(scout.lige_moc.izracunano_at)` zadnjega modela) starejši od 7 dni
(minus ura, da teden ne zdrsne), če modela še ni ali ob `--moc-lig`. Na dan
brez backtesta model prevzame moč lig, `elo_koef`, `backtest` in `objavljen`
zadnjega modela; kazalniki, indeks, podobni in vrzeli so vedno sveži.

## Tabele (`scout`)

`drzave` (zaprto/pilot/odprto, SI odprta), `modeli` (različica, backtest,
`parametri.elo_koef`, `objavljen`), `lige_moc`, `ekipe_elo`, `kazalniki` (vse
sezone odprtih držav), `indeks`, `vektorji` (z-vektor in 20 najbližjih),
`vrzeli`. Migracija `20261016140100_scout_stroj`. Faza 2 (migracija
`20261016160100_scout_igralec`): `ugovori` (zgoščena ključa osebe, kot
`anonimizirani_igralci`) in `privolitve` (odprt za prestop, letnica, regije
= `federations` države, stik; ključ glavna vrstica potrjenega profila;
preklic = izbris vrstice). Notranje funkcije `kljuci_vrstic`,
`vrstice_profila`, `je_skrit`, `odrasle_vrstice`; vlogi `scout_stroj` je
odprta le `odrasle_vrstice` (`privolitve` stroj ne bere neposredno,
`ugovori` bere). Stari javni `players.scout_skrit` je prenesen v `ugovori` in
odstranjen (`20261017170100`). Poizvedba izločenih (`SQL_IZKLJUCENI`) na produkciji: 4,7 s, le
hash joini (join z OR je obvisel).

Brskalnik sheme ne bere: ni v API, `anon`/`authenticated` nimata pravic, RLS
je vklopljen. Vloga `scout_stroj` ima na vsaki tabeli politiko `stroj` (ne
BYPASSRLS), bere le tabele zapisnikov. Funkcije faze 3 naj berejo zadnji
`objavljen` model in ob branju še enkrat preverijo `scout.je_skrit(array[id])`
in `anonimiziran_at` (model nastane enkrat na dan).

## Stran igralca (faza 2)

Lastnik potrjenega profila na `/player/<id>` (Uredi) vidi razdelek SLFF Scout,
če država lige v `scout.drzave` ni `zaprto` (`ScoutIgralca.tsx`, bere
`scout_moj_profil`): privolitev (`scout_shrani_privolitev`, letnica obvezna in
`<= letos - 19`, regije le zveze države; z veljavnim ugovorom zavrne) in
ugovor (`scout_ugovor(glavni, true|false)`). Privolitev izbrišejo njen
preklic (`scout_preklici_privolitev`), lastnikov ugovor in
`prevzem_odstrani_predstavitev` (preklic profila, anonimizacija, izbris
računa). Igralec brez prevzetega profila ugovarja po povezavi na dnu vsake
javne strani igralca (ne mladinske, ne anonimizirane) na `/legal#scout`: mail
na info@slff.eu, admin v 14 dneh v Administracija → Igralec → *Skrij iz Scouta
(ugovor)* (`admin_scout_skrij(ids[])`, izbira vrstic osebe kot pri
anonimizaciji). `kontakt_dovoljen` se le hrani; sporočila pridejo v fazi 4.

**Soimenjak.** Stroj izloča po ključu imena brez kluba, zato soimenjakov
ugovor izloči tudi lastnika profila z istim imenom v državi (namerno, varneje
za zasebnost). Lastnik pa vidi in prekliče le ugovore svojih vrstic
(`scout.ugovori.player_id` med `vrstice_profila`): soimenjak ga ne zaklene,
privolitev lahko shrani, a v izračun ne vstopi, dokler ugovor soimenjaka velja.
Preklic z `false` pobriše le ključe njegovih vrstic. Enako pri mladinskem
izločanju: polnoletna letnica odpre le osebo prijaviteljevih vrstic, ne
soimenjaka.

## Klubi (faza 3)

Načrta `docs/superpowers/plans/2026-10-16-scout-faza3a-zaledje.md` (baza,
plačila) in `…-faza3b-aplikacija.md` (scout.slff.eu). Migracije
`20261017140100`–`140400`.

- **Račun in sedeži.** Naročnina (`scout.narocnine`, ključ `team_id`) pripada
  klubu, sedež (`scout.sedezi`, ključ `user_id`) uradnemu računu kluba
  (`klubski_racuni`, potrjen naslov iz `klub_stik`). Do 3 sedeži (štejejo le
  računi, ki so še uradni računi kluba); sedež sprosti njegov imetnik ali drug
  sedež kluba. Preizkus 14 dni enkrat na klub, brez kartice, s sprejetjem
  pogojev (`pogoji_sprejeti_at`). Država naročnine je država kluba, le če v
  `scout.drzave` ni `zaprto`. `narocnine.team_id` nima kaskade: `zdruzi-klube`
  pade na klubu z naročnino, prenesi jo ročno.
- **Dostop.** Vsak klic s podatki igralcev gre skozi `scout.dostop`: sedež,
  aktiven klubski račun, `velja_do > now()`, `zaprt_at is null`, država ni
  zaprta, dnevna meja (500 profilov in 300 drugih klicev na klub na ljubljanski
  dan; med drugimi so tudi `scout_opazuj`, dodajanje in odstranjevanje, in
  `scout_opazovani`) in vrstica v `scout.dnevnik` (pri iskanju, podobnih,
  strani Klub in opazovalnem seznamu še id-ji vrnjenih igralcev v
  `parametri.igralci`). Meja 30 na seznamu šteje le igralce, ki jih klub danes
  vidi (`scout.vidni`, migracija 20261019180000). Zavrnjen klic se ne zapiše.
- **Kaj klub vidi.** Le zadnji **objavljeni** model (`scout.zadnji_model()`).
  `scout.vidni(model, država)` ob branju znova izloči skrite (ključi
  `scout.ugovori`), anonimizirane (ključi `anonimizirani_igralci`, tudi druge
  vrstice osebe), vrstice mladinskih lig in zaprte države; privolitev le pri
  "odprt za prestop", stik nikoli (faza 4); celo osebo z mladinsko vrstico
  izloča stroj enkrat na dan. Privolitev je ena na vrstico
  (`scout.privolitve_vrstic()`): če vrstico pokrivata dva potrjena profila
  (neposredno in prek povezave), zmaga odprta, nato neposredna, nato manjši id
  vira — igralec se v iskanju ne podvoji. Iskanje: 25 na stran, največ prvih
  200, brez lastnih igralcev; raven `ista_ali_nizja` / `nizja` primerja moč
  lige igralca z ligo kluba (`scout.liga_kluba`, ± 0.1; brez lige kluba v
  modelu filter ne velja); projekcija golov na raven kluba le znotraj države.
  Podobni 10, seznam 30.
- **Plačila.** `scout-placilo` (Checkout, portal) in `stripe-webhook`
  (`metadata.app = slff-scout`, veja v `stripe-webhook/scout.ts`). Cene po
  `lookup_key` `slff_scout_klub_mesec` (39 €/mesec), `slff_scout_klub_sezona`
  (290 €/leto), brez DDV: Checkout vzame le ceno s `tax_behavior = exclusive`
  (sicer napaka), DDV doda Stripe Tax (`automatic_tax`), z davčno številko in
  naslovom kupca; sezona je letna naročnina. Naročnina velja do konca obdobja
  + 3 dni. Seja mora imeti natanko eno postavko (cena obdobja, en kos, brez
  popusta), sicer preklic + Discord. Novo plačilo kluba s staro (potečeno)
  naročnino staro prekliče: `scout_iz_placila` vrne `aktivna:<stara>` in jo
  hrani v `prejsnja_subscription_id`, zato ponovljen dogodek (Stripe ga
  ponovi po napaki 500) preklic poskusi znova. Obnova (`invoice.paid`,
  `subscription.updated` v `active`/`trialing`) z naročnino, ki ima tujo ceno,
  ali obnova zaprtega kluba se prekliče. Portal je lastna konfiguracija
  (metapodatek `app=slff-scout`, brez menjave paketa; ustvari jo lastnik
  enkrat, načrt 3b); brez nje portal javi napako.
  Drugo plačilo istega kluba (`dvojno`), zaprt klub (`zaprt`), klub brez
  naročnine (`ni_narocnine`) ali seja z neveljavnim obdobjem ali brez kupca
  (`neveljavno`) → takojšen preklic + Discord "vrni denar". Naročnina brez
  konca obdobja je napaka 500 (Stripe dogodek ponovi), ne preklic. Vračil in sporov
  Scout ne obdeluje samodejno: admin naročnino prekliče v Stripe
  (`subscription.deleted` → `velja_do = least(velja_do, ended_at)`). Portal
  (preklic) dobi plačnik ali kateri koli uradni račun kluba, tudi brez sedeža
  in pri zaprtem klubu.
- **Zaprt klub** (kršitev pogojev):
  `update scout.narocnine set zaprt_at = now() where team_id = <klub>` in
  takojšen preklic naročnine v Stripe.
- **Dnevnik** 12 mesecev (`scout.pocisti()`, pg_cron `scout-pocisti` 04:47; s
  seznamov odstrani tudi skrite, anonimizirane in izbrisane igralce). Zahteva
  igralca "kateri klubi so me gledali":

  ```sql
  select t.name, d.vrsta, d.created_at from scout.dnevnik d join teams t on t.id = d.team_id
   where d.player_id = any(:'ids'::bigint[])
      or exists (select 1 from jsonb_array_elements_text(d.parametri->'igralci') e
                  where e::bigint = any(:'ids'::bigint[]))
   order by d.created_at desc;
  ```

  `ids` je psql spremenljivka z vsemi vrsticami osebe (izbrane kot pri
  anonimizaciji), npr. `psql -v ids='{101,202}'`.

- **Posnetki igralca** (migracija 20261031183100): `scout_igralec` doda
  `posnetkov` (odobreni posnetki izložbe, če velja `izlozba_dovoljena`:
  preverjen, polnoleten, brez mladinske vrstice). Le takrat stran igralca
  pokliče funkcijo `posnetki-igralca` (`akcija: scout`) → `scout_posnetki`
  skozi `scout.dostop` (`dnevnik.vrsta = 'posnetki'`, meja 300) in
  `scout.vidni`; podpisani naslovi (R2 ali Stream, po ponudniku posnetka) veljajo 2 uri. Igralec na svoji izložbi
  vidi le števili odprtij profila (`vrsta = 'igralec'`, zadnjih 30 dni, brez
  lastnega kluba) in različnih klubov, nikoli kateri. Vse:
  `docs/podatkovni-model.md` (*Izložba preverjenega igralca*).

- **Merilo faze 3** (5 poskusnih klubov tedensko):

  ```sql
  select count(distinct team_id) from scout.dnevnik where created_at > now() - interval '7 days';
  ```

## Aplikacija club.slff.eu (faza 3b)

**27. 10. 2026 preimenovano v SLFF Club** (`club.slff.eu`; `scout.slff.eu`
preusmeri s 301 v Caddyju). Ostanejo: mapa `/srv/slff-scout`, shema in RPC
`scout_*`, lookup keys Stripa, `storageKey` seje (nov izvor pomeni novo prijavo).
Scout je ime modula za iskanje igralcev. DNS `club` (Proxied) in GoTrue
`https://club.slff.eu/**` sta dodana; `scout-placilo` ima privzeti
`SCOUT_URL` `https://club.slff.eu` (objavi funkcijo po združitvi).

Vite + React + TypeScript v `scout/` (`scout/src/`, `scout/vite.config.js`,
lasten Tailwind), sveženj `dist-scout/`. Ukazi: `npm run dev:scout` (5174,
lokalni stack), `npm run build:scout`, `npm run smoke:scout`. Isti računi kot
slff.eu, seja je svoja (`storageKey` `slff-scout-seja`). Registracija,
ponastavitev gesla in prošnja za klubski račun ostanejo na slff.eu; ob vsaki
prijavi aplikacija pokliče `uveljavi_klubski_racun`. Bere le RPC `scout_*` in
`federations` (regije države kluba). Nizi v `scout/src/besede.ts` (sl, en),
ne v `src/i18n`. Poti: `/club`, `/`, `/player/:id`, `/gaps`, `/watchlist`,
`/account`, `/login`, `/terms`. Videz je prepis slff.eu (tema iz korenskega
`tailwind.config.js`, razredi v `scout/src/index.css`).

**Stran Klub** (`/club`, `scout_klub(p_team_id)`, migracija 20261018120000,
spec `docs/superpowers/specs/2026-10-18-scout-klub-design.md`): pregled
lastnega kluba — liga je odrasla liga z največ tekmami kluba v tekoči
sezoni (šele brez njih `scout.liga_kluba`) — mesto, oblika zadnjih 5, Elo
letos in lani, moč lige v državi, uspešnost ekipe proti povprečju lige (javne tekme tekoče sezone,
`sezona_lige`), kader iz `scout.kazalniki` (le `scout.vidni`; lastni klub —
ne administrator pri tujem — vidi še svoje igralce z mladinsko vrstico z
oznako U19, le javna dejstva iz `appearances`, brez ugovora, anonimiziranih
in povezave na profil, migracija 20261018150000), globina po
poziciji (izračuna vmesnik) in vrzeli kluba. Klic gre skozi `scout.dostop`
(`dnevnik.vrsta = 'klub'`). Administrator SLFF lahko z `?team=` odpre
katerikoli klub države naročnine (preizkus na pravih klubih); drugim tuj klub
vrne napako, nikoli tiho svojega. Izmerjeno na produkciji 18. 10. 2026:
13–38 ms za klub z največ vrsticami.

### Ekipa: koledar, prisotnost, kader (faza 1 upravljanja kluba)

Spec in raziskava trga: `docs/superpowers/specs/2026-10-27-scout-klubsko-upravljanje-design.md`,
`…-raziskava-trga-klubi.md`. Migracija `20261027180000`, testi
`supabase/tests/scout-ekipa.sql` (v `npm run test:varnost`).

- **Selekcije kluba** (`scout.selekcije_kluba`): tekmovanja s tekmo kluba v
  tekoči ali prejšnji sezoni (`sezona_lige`) ali z aktivnim igralcem, ki ga je dodal klub;
  tudi mladinska. Tuja selekcija → napaka, nikoli tiho druga.
- **Kader selekcije** (`scout.kader_selekcije`): nastop za klub v tekoči
  sezoni ali dodan s strani kluba; brez anonimiziranih (tudi po ključu).
  Igralec z ugovorom proti Scoutu **je** v kadru in prisotnosti lastnega kluba
  (ugovor je proti skavtiranju drugih klubov; lastnik 27. 10. 2026).
- **Koledar** (`/calendar`, `scout_koledar(od, do)`, največ 62 dni): uradne
  tekme se berejo živo iz `matches` (ne kopiramo jih), dogodki iz
  `scout.dogodki` (trening, prijateljska, sestanek, drugo). Tedenska serija
  (`p_ponovi_do`, največ 52) teče po ljubljanskem času; v državi brez premika
  ure se čez premik zamakne (shortcut v migraciji).
- **Prisotnost** (`/calendar/:id`, `scout_dogodek`, `scout_shrani_prisotnost`):
  tri stanja (`prisoten`/`opravicen`/`odsoten`), **brez razloga** (zdravstveni
  podatek); ves kader v enem klicu, le igralci iz kadra selekcije.
- **Kader** (`/squad`, `scout_ekipa(selekcija)`): nastopi, začetki, minute,
  goli, rumeni, rdeči tekoče sezone in prisotnost zadnjih 30 dni. Kartoni so
  število, ne napoved kazni (pravilniki po zvezah so faza 6).
- Vsak klic gre skozi `scout.dostop` (vrste `koledar`, `dogodek`, `ekipa`;
  šteje v mejo 300). Od `20261027203000` `scout_dogodek` in `scout_ekipa`
  **ne** pišeta igralcev v dnevnik (pravni pregled: lastni klub, mladoletni). `scout.pocisti` briše dogodke (s
  prisotnostjo) starejše od 24 mesecev, dogodke kluba 90 dni po koncu naročnine in prisotnost
  anonimiziranih igralcev. Klub je upravljavec teh podatkov, SLFF obdelovalec (pogoji, *Pogodba o
  obdelavi podatkov*, `pogoji.obdelava`).
- Izmerjeno na produkciji 27. 10. 2026 (klub 1747, branje): selekcije (dve
  sezoni) 1–2 ms toplo, 194 ms hladno; kader 1–15 ms, tekme koledarja 0,1 ms.
- **Prehod sezone** (`scout.sezona_selekcije`): sezona dne dogodka, če ima klub
  v njej tekmo, sicer prejšnja — selekcija in kader ostaneta od 1. 7. do uvoza
  novega razporeda. Kader dogodka vsebuje tudi že označene igralce.

### Objava aplikacije

CI (`objavi-scout`) zgradi in prenese `dist-scout/` v
`/srv/slff-scout/releases/<sha>`, premakne `current` in preveri, da
scout.slff.eu streže ta commit — a le ob spremenljivki repozitorija
`SCOUT_OBJAVA=1`; brez nje je posel preskočen. Korak `Scout` v `preveri`
(build + smoke) teče vedno. Vse drugo je ročno, enkrat, po tem vrstnem redu
(ukazi: načrt 3b, naloga 8):

1. **DNS**: zapis `scout` v Cloudflare, enak kot `slff.eu`, Proxied. Doda ga
   Claude v lastnikovem prijavljenem brskalniku, šele po lastnikovi izrecni
   potrditvi. Origin certifikat mora pokriti `*.slff.eu`.
2. **Mapi** `/srv/slff-scout` in `/srv/slff-scout/releases`, obe v lasti
   uporabnika `deploy` (sicer rsync ali preklop `current` v CI pade z
   `Permission denied`).
3. **Caddy blok** `scout.slff.eu` iz `scripts/hetzner/Caddyfile` (Caddyfile
   ni v CI): `caddy validate`, kopija stare, `systemctl reload caddy`. Cela
   stran je `noindex` (orodje za prijavljene klube), SPA le za poti brez pike.
4. **GoTrue**: `https://scout.slff.eu/**` v `ADDITIONAL_REDIRECT_URLS`
   (`/opt/supabase/.env`), nato `cd /opt/supabase && docker compose -f
   docker-compose.yml -f docker-compose.slff.yml up -d auth`. Brez tega GoTrue
   `redirect_to` tiho zavrže in prijava z Googlom pristane na slff.eu (seja
   tam, ne v Scoutu), brez napake.
5. `SCOUT_OBJAVA=1` (`gh variable set SCOUT_OBJAVA --body 1`): aplikacija je
   dosegljiva, a še ne oznanjena; plačilo javi napako, dokler ni Stripa.
6. **Ročni preizkus v testnem načinu Stripe — LOKALNO**, ne na produkciji.
   Končna točka testnega webhooka računa SLFF je
   `https://api.slff.eu/functions/v1/stripe-webhook`, zato isti dogodek dobi
   tudi produkcija: klub brez naročnine tam → `ni_narocnine`, naročnina se
   prekliče, Discord "vrni denar" (pričakovano, prezri). Lokalni preizkus naj
   zato preveri le Checkout, zapis naročnine in portal, ne preklica. Zaenkrat
   (17. 10. 2026) je ves Stripe SLFF, tudi preverjeni igralci, v testnem
   načinu in produkcijski ključ je že testni; ob prehodu v živi način ta
   opozorila odpadejo.
   Produkcijski `STRIPE_SECRET_KEY` je skupen s plačili preverjenih igralcev,
   zato ga **nikoli ne zamenjaj s testnim**. Lokalni sklad (`npx supabase
   start`), `npx supabase functions serve --no-verify-jwt --env-file <datoteka>`
   (testni `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` iz `stripe listen`,
   `SCOUT_URL=http://localhost:5174`), `stripe listen --forward-to
   http://127.0.0.1:54321/functions/v1/stripe-webhook`, `npm run dev:scout`.
   V testnem načinu ustvari izdelek, ceni in konfiguracijo portala (kot v
   točki 7) in preizkusi preizkus, sedeže, plačilo, portal in preklic.
7. **Stripe v živem načinu na produkciji**, funkciji `scout-placilo` in
   `stripe-webhook` (`scripts/hetzner/objavi-funkcije.sh`):
   - izdelek "SLFF Scout" (metadata `app=slff-scout`), ceni z `lookup_key`
     `slff_scout_klub_mesec` (3900, mesečno) in `slff_scout_klub_sezona`
     (29000, letno), obe `tax_behavior=exclusive` (Checkout druge zavrne);
     obstoječi webhook zadošča;
   - lastna konfiguracija Billing Portala z metapodatkom `app=slff-scout`
     (preklic ob koncu obdobja, brez menjave paketa). Brez nje gumb portala
     na `/account` javi napako — preklic mora biti vedno mogoč;
   - Stripe Tax aktiven v živem načinu (`/v1/tax/settings`: `status`
     `active`, država `SI`); sicer Checkout z `automatic_tax` sejo zavrne.
8. **Preverjanje na produkciji brez plačila**: na scout.slff.eu se Checkout
   odpre s pravim zneskom in vrstico DDV (nato nazaj, brez plačila), portal
   se odpre (gumb je le pri klubu s kupcem Stripe; sicer preveri, da živa
   konfiguracija portala obstaja).
9. Šele nato oznanitev klubom.

## Spomin

| odprte države | trajanje | vrh RSS |
|---|---|---|
| le SI (produkcija, pred 10/2026 popravki) | 64 s | 472 MB |
| vse (produkcija, pred popravki) | 113–158 s | 1,19–1,22 GB |

Pisanje teče **pretočno**: `zagon` da `zapisi` generatorje (`pisanje.vrstice`
po kosih 20 000 vrstic, vektorji po (država, skupina)), ne seznamov vseh
vrstic; nalaganje (`v_stolpce`) vsak kos kazalca takoj pretvori v numpy.
`vrzeli` gre čez vrstice enkrat (prej maska čez vse vrstice na ekipo,
O(ekip × vrstic)). Sintetični preizkus v velikosti produkcije (450 000
vrstic, 32 držav, 900 lig, `zagon` brez baze): vse države odprte **825 s →
58 s, vrh 1128 MB → 215 MB**; izid vseh šestih tabel je enak do vrstice.
Nalaganje iz baze v preizkusu ni zajeto.

Delavec ima `mem_limit: 1g`. **Ob odprtju druge države** takoj poženi suhi
tek `docker compose run --rm scout python -m stroj --moc-lig` (brez `--pisi`,
pred 11:00 naslednjega dne) in med njim glej vrh v `docker stats`.

## Ukazi (lokalno)

```bash
cd scout/stroj
python3.12 -m venv .venv && .venv/bin/pip install -e '.[test]'   # enkrat (.venv je v .gitignore)
.venv/bin/pytest -q
SCOUT_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres .venv/bin/python -m stroj --moc-lig
```

`test_baza.py` piše v bazo `SCOUT_TEST_DB` (privzeto lokalni Supabase
`…@127.0.0.1:54322/postgres`, z uveljavljeno migracijo) in vse razveljavi;
`test_ravni.py` pokliče `node` (primerja `ravenLige`). CI jih poganja v
`.github/workflows/scout-in-funkcije.yml` na PR, ki spremeni `scout/stroj/`,
`scripts/visja-liga.mjs` ali migracije (z `supabase db start`).

Brez `--pisi` stroj le izpiše backtest in prvih 10 vsake lige (pregled
smiselnosti); `--pisi` zapiše model.

## Objava (strežnik)

CI delavca ne objavi. Migracija ustvari vlogo `scout_stroj` brez gesla (bere
tabele zapisnikov, piše le shemo `scout`). Delavec teče v gostiteljevem
omrežju, `supabase-db` pa na mostu Dockerja (vrata objavljena na
`127.0.0.1:5432`): povezava v kontejner prispe iz `172.18.0.x`, ki ga `pg_hba`
preverja s `scram-sha-256`. **Brez gesla se delavec ne prijavi.**

Ko je migracija uveljavljena, lastnik enkrat nastavi geslo — interaktivno,
da ne pristane v zgodovini lupine ali v gitu:

```bash
ssh slff 'docker exec -it supabase-db psql -U supabase_admin -d postgres -c "\password scout_stroj"'
```

in ga zapiše v `/opt/slff-scout/.env` (chmod 600, ni v gitu):

```
SCOUT_DB_URL=postgresql://scout_stroj:<geslo>@127.0.0.1:5432/postgres
```

Vloga v naslovu mora biti `scout_stroj` (ne `supabase_admin` ali
`postgres`): le ta sme pisati le shemo `scout`.

Nato `scripts/hetzner/objavi-scout.sh` — zavrne necommitane spremembe v
`scout/stroj`/`scripts/hetzner/scout` in vse razen veje `main`, enake
`origin/main`. Prejšnjo različico shrani v `/opt/slff/backup-scout/<čas>/`,
zgradi sliko (`python:3.12.7-slim-bookworm`, uporabnik `nobody`), preveri
`--help` in znova zažene delavca. Prvi zagon ročno:

```bash
ssh slff 'cd /opt/slff-scout && docker compose run --rm scout python -m stroj --moc-lig'          # pregled
ssh slff 'cd /opt/slff-scout && docker compose run --rm scout python -m stroj --moc-lig --pisi'   # zapis
ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -c "select backtest from scout.modeli order by id desc limit 1"'
```

Dnevnik: `docker logs slff-scout`. Omejitve kontejnerja: `mem_limit: 1g`,
`cpus: 1.0` (strežnik ima 4 GB).

## Omejitve

- On/off je le na tekmah s popolnim zapisnikom: vsak gol ima minuto in goli
  po straneh (avtogol šteje nasprotniku) se seštejejo v izid. Minute na
  igrišču (`least(minute_off, 90) - minute_on`) in goli na igrišču imajo isto
  okno. Viri brez minut menjav pustijo `0/90`: igralec velja za ves čas na
  igrišču, minut brez njega je malo in on/off se skrči proti 0.
- Moč nasprotnika posamezne tekme ni utežena; kontekst ekipe je Elo lastne
  ekipe.
- Sezona je `left(season, 4)` (koledarske lige: isto leto kot jesenski del).
- Uteži indeksa so po presoji (`UTEZI` v `indeks.py`); umeri jih faza 4.
