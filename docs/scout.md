# SLFF Scout: analitični stroj (faza 1)

Spec: `docs/superpowers/specs/2026-10-16-scout-design.md`. Načrt:
`docs/superpowers/plans/2026-10-16-scout-faza1-stroj.md`. Kjer se ta datoteka
in načrt razhajata, velja ta datoteka (opisuje kodo, kot je).

Delavec `slff-scout` (Python 3.12, `scout/stroj/`, numpy + psycopg) iz
zapisnikov izračuna moč lig, Elo klubov, kazalnike igralcev, indeks po
poziciji, podobne igralce in vrzeli v kadrih. Vse zapiše v zaprto shemo
`scout` kot novo različico (`scout.modeli`) v eni transakciji. Vmesnika
(faza 3) še ni.

**Stanje (10/2026): moč lig trenutno ne prinese merljive vrednosti.** Backtest
na produkcijskih podatkih je `padel`, zato model ne bo objavljen (glej *Backtest*).

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

- vrstico v mladinski ligi (`je_mladinski_slug`) — katerokoli, tudi staro;
  dokler faza 2 ne prinese letnice, je to edini varen znak mladoletnosti;
  mladinske lige same tudi niso v izračunu;
- `players.scout_skrit` v katerikoli vrstici (ugovor);
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

Napove gole brez 11 m na 90 v zadnji zaključeni sezoni iz prejšnjih (brez
puščanja: moč, Elo in kazalniki vidijo le starejše sezone) za vse države.
Primerja tri napovedi pri igralcih, ki so zamenjali ligo (prestopniki):
model, naivno (lanski učinek) in ablacijo brez moči lig (le krčenje).

`stanje`:

- `premalo podatkov` — manj kot 200 prestopnikov;
- `prestal` — ≥ 15 % manjša napaka od naivne **in** ≥ 1 % manjša od ablacije
  (`MIN_IZBOLJSAVA_MOCI = 0.01`); le tak model je `objavljen`;
- `padel` — sicer.

Izmerjeno na produkciji (ciljna sezona 2025, branje brez pisanja):

| obseg | prestopnikov | proti naivni | proti ablaciji | stanje |
|---|---|---|---|---|
| vse države | 3081 | +16,8 % | +0,0015 % | `padel` |
| le SI | 66 | +12,8 % | 0 | `premalo podatkov` |

Izboljšava proti naivni pride od krčenja, ne od moči lig. **Moč lig zdaj ne
prinese merljive vrednosti**, zato model ni objavljen, dokler se metoda ne
izboljša (vmesnika, ki bi ga bral, še ni).

## Urnik

`python -m stroj --zanka` teče vsak dan ob **11:00 Europe/Ljubljana** (nočni
uvozi med tednom začnejo ob 07:17 in tečejo do 190 minut). Napaka v zagonu
se izpiše, zanka teče naprej.

Moč lig in backtest se izračunata, ko je zadnji izračun v bazi
(`max(scout.lige_moc.izracunano_at)` zadnjega modela) starejši od 7 dni
(minus ura, da teden ne zdrsne), če modela še ni ali ob `--moc-lig`. Na dan
brez backtesta model prevzame moč lig, `elo_koef`, `backtest` in `objavljen`
zadnjega modela; kazalniki, indeks, podobni in vrzeli so vedno sveži.

## Tabele (`scout`)

`drzave` (zaprto/pilot/odprto, SI odprta), `modeli` (različica, backtest,
`parametri.elo_koef`, `objavljen`), `lige_moc`, `ekipe_elo`, `kazalniki` (vse
sezone odprtih držav), `indeks`, `vektorji` (z-vektor in 20 najbližjih),
`vrzeli`. Migracija `20261016140100_scout_stroj`.

Brskalnik sheme ne bere: ni v API, `anon`/`authenticated` nimata pravic, RLS
je vklopljen. Vloga `scout_stroj` ima na vsaki tabeli politiko `stroj` (ne
BYPASSRLS), bere le tabele zapisnikov. Funkcije faze 3 naj berejo zadnji
`objavljen` model in ob branju še enkrat preverijo `scout_skrit` in
`anonimiziran_at` (model nastane enkrat na dan).

## Spomin

| odprte države | trajanje | vrh RSS |
|---|---|---|
| le SI (zdaj) | 64 s | 472 MB |
| vse | 113–158 s | 1,19–1,22 GB |

**Delavec ima `mem_limit: 1g`. Preden odpreš drugo državo v `scout.drzave`,
mora pisanje teči pretočno** (generatorji v COPY namesto seznamov `vrstice` v
`__main__.py`) ali pa je treba dvigniti `mem_limit` — sicer delavca ubije OOM.
Največ spomina pojedo seznami za `kazalniki` in `vektorji`; `vrzeli` je
O(ekip × vrstic) in pri vseh državah traja ~100 s.

## Ukazi (lokalno)

```bash
cd scout/stroj
python3.12 -m venv .venv && .venv/bin/pip install -e '.[test]'   # enkrat (.venv je v .gitignore)
.venv/bin/pytest -q
SCOUT_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres .venv/bin/python -m stroj --moc-lig
```

`test_baza.py` piše v bazo `SCOUT_TEST_DB` (privzeto lokalni Supabase
`…@127.0.0.1:54322/postgres`, z uveljavljeno migracijo) in vse razveljavi;
`test_ravni.py` pokliče `node` (primerja `ravenLige`). **Pythonovih testov CI
ne poganja** — poženi jih sam ob vsaki spremembi `scout/stroj/`.

Brez `--pisi` stroj le izpiše backtest in prvih 10 vsake lige (pregled
smiselnosti); `--pisi` zapiše model.

## Objava (strežnik)

CI delavca ne objavi. Enkrat ustvari `/opt/slff-scout/.env` (chmod 600, ni v
gitu):

```
SCOUT_DB_URL=postgresql://scout_stroj@127.0.0.1:5432/postgres
```

Na strežniku Postgres posluša na `127.0.0.1:5432` in `pg_hba` zaupa
`127.0.0.1`; delavec teče v gostiteljevem omrežju, zato geslo tam ni
potrebno. **Vloga v naslovu mora biti vseeno `scout_stroj`** (ne
`supabase_admin` ali `postgres`): le ta sme pisati le shemo `scout`.

Če bo kdaj geslo treba (drug gostitelj, strožji `pg_hba`), ga nastavi ročno
— nikoli v git, ne v zgodovino lupine — in ga dodaj v `.env`:

```bash
read -rs GESLO && ssh slff "docker exec -i supabase-db psql -U supabase_admin -d postgres" \
  <<< "alter role scout_stroj password '$GESLO';"
# .env: SCOUT_DB_URL=postgresql://scout_stroj:<to geslo>@127.0.0.1:5432/postgres
```

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
