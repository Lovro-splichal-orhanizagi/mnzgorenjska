# SLFF Scout, faza 1: analitični stroj Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nočni Python posel `slff-scout` iz zapisnikov izračuna moč lig, Elo ekip, kazalnike igralcev (prilagojene ravni, skrčene), indeks po poziciji s percentilom, podobne igralce in vrzeli v kadrih ter vse zapiše kot novo različico modela v zaprto shemo `scout`; backtest dokaže, da pri igralcih, ki so zamenjali ligo, premaga naivno osnovo za ≥ 15 %.

**Architecture:** Agregate po (igralec, liga, sezona) izračuna SQL v enem branju (`psycopg`, strežniški kazalec), Python (numpy) prilega moč lig (dvosmerni fiksni učinki oseba + liga, tedensko), Elo in kazalnike ter jih z `COPY` v eni transakciji zapiše v `scout.*` pod novo vrstico `scout.modeli`. Delavec teče v Dockerju na strežniku (`network_mode: host`, Postgres na 127.0.0.1:5432, vloga `scout_stroj`) z zanko ob 11:00; vmesnika še ni, shema je za `anon`/`authenticated` zaprta.

**Tech Stack:** Python 3.12, numpy 2.1.3, psycopg 3.2.3 (binary), pytest 8.3.3; PostgreSQL (self-hosted Supabase); Docker Compose; bash + rsync za objavo.

**Spec:** docs/superpowers/specs/2026-10-16-scout-design.md

## Global Constraints

- Pogoj za fazo 2+: backtest premaga naivno osnovo (lanski učinek) za **≥ 15 %** (utežen MAE golov brez 11 m na 90) pri igralcih, ki so zamenjali ligo, in je boljši od istega modela brez moči lig (ablacija); pod 200 pari prestopnikov (`MIN_PRESTOPOV`) je izid "premalo podatkov", ne prestal; prag `PRAG = 0.15`, `scout.modeli.objavljen` = prestal.
- Samo odrasli: lige, kjer `je_mladinski_slug(slug)`, ne vstopijo nikamor; oseba z **katerokoli** vrstico v mladinski ligi je izločena (letnice še ni, pride v fazi 2).
- `players.scout_skrit` (nov stolpec, privzeto `false`) in `players.anonimiziran_at is not null` izločita osebo iz izračuna v celoti.
- Identiteta osebe: `r<competitions.source>:<reg_st>`, kjer je šifra (šifre so po viru: RS, ES, UA, RO imajo več virov z ločenimi številkami); sicer `i<country_id>:<lower(full_name)>:<players.team_id>` (Slovenija: ime + klub).
- `scout.drzave.stanje` ∈ `zaprto` / `pilot` / `odprto`; Slovenija `odprto` ob migraciji, vse ostale `zaprto`. Kazalniki, indeks, podobni, vrzeli in Elo se pišejo le za države, ki niso `zaprto`; moč lig za vse.
- Shema `scout`: brez pravic za `public`, `anon`, `authenticated`, RLS brez politik, ni v `api.schemas`; piše jo le delavec kot vloga `scout_stroj` (LOGIN brez gesla v migraciji; geslo nastavi lastnik ročno, nikoli v git).
- Dnevni zagon **11:00 Europe/Ljubljana** (nočni uvozi med tednom začnejo ob 07:17 in tečejo do 190 min); delavec ima `mem_limit: 1g` (strežnik CPX22, 4 GB, z bazo, Supabase in slff-objave); moč lig in backtest enkrat na 7 dni (ali `--moc-lig`), kazalniki, indeks, podobni, vrzeli vsak dan; vsak zagon = nova `scout.modeli` vrstica v **eni transakciji**; ohranjeni so zadnji 3 objavljeni modeli + trenutni.
- Migracija je nova datoteka `supabase/migrations/20261016140100_scout_stroj.sql`; obstoječih migracij ne spreminjaj; CI jo uveljavi ob pushu na main.
- CI delavca ne objavi: `scripts/hetzner/objavi-scout.sh` (ročno, iz čistega main).
- Odvisnosti le numpy in psycopg. Spec predvideva statsmodels (MixedLM); pregled ga je zamenjal z dvosmernimi fiksnimi učinki (oseba + liga) z izmeničnim odštevanjem povprečij v numpy: brez pandas/scipy v sliki, linearen čas v številu vrstic. Pandas ne uporabljamo (vse operacije so maske nad stolpci).
- Produkcijo za meritve (čas, RSS, `EXPLAIN ANALYZE`) beremo le prek SSH tunela s sejo `default_transaction_read_only=on` (`SCOUT_PROD_URL`, nastavi človek; geslo nikoli v git).
- Pragovi: model in backtest le vrstice z ≥ 450 minutami (`MIN_MINUT`), liga v modelu z ≥ 20 vrsticami prestopnikov (`MIN_VRSTIC_LIGE`), krčenje `K_MINUT = 900`, reden igralec ≥ 50 % minut ekipe.
- Hišne ekipe (`fantasy_teams.hisna`) za stroj niso pomembne: stroj ne bere nobene fantasy tabele.
- PostgREST meja 1000 vrstic ne velja: stroj bere Postgres neposredno prek psycopg.
- Identifikatorji in komentarji so **slovenski** (konvencija repozitorija, kot `scripts/`; nadomesti globalno angleško privzetost); sporočila commitov konvencionalna, opis slovensko kot v `git log`.
- Vsak commit konča `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; nikoli `git add -A`, vedno izrecne poti.
- Testi: čista matematika na sintetičnih podatkih brez baze; en integracijski test (`tests/test_baza.py`) proti lokalni bazi `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (`SCOUT_TEST_DB`), vse v transakciji z `rollback`.

---

## File Structure

| datoteka | odgovornost |
|---|---|
| `supabase/migrations/20261016140100_scout_stroj.sql` | `players.scout_skrit`, shema `scout` (`drzave`, `modeli`, `lige_moc`, `ekipe_elo`, `kazalniki`, `indeks`, `vektorji`, `vrzeli`), pravice |
| `supabase/tests/varnost.sql` | preverba, da je `scout` zaprt za `anon`/`authenticated` in da je SI odprta |
| `src/lib/baza.types.ts` | regeneriran (`npm run tipi`) zaradi novega stolpca |
| `scout/stroj/pyproject.toml` | paket `stroj`, pripete odvisnosti, pytest |
| `scout/stroj/stroj/__init__.py` | tip `Tabela` (stolpci kot numpy) in `izberi` |
| `scout/stroj/stroj/ravni.py` | prepis odrasle veje `ravenLige` iz `scripts/visja-liga.mjs` |
| `scout/stroj/stroj/nalaganje.py` | SQL branje: sezone igralcev (z on/off), tekme za Elo, lige; izločanje oseb |
| `scout/stroj/stroj/elo.py` | Elo kluba po (liga, leto, klub) in `elo_rel` |
| `scout/stroj/stroj/moc_lig.py` | moč lig (fiksni učinki oseba + liga, numpy), dopolnitev s piramido/državo, `prilagodi` |
| `scout/stroj/stroj/kazalniki.py` | kazalniki igralca: deleži, skrčene stopnje na 90, prilagoditev ravni in ekipe, on/off, zaupanje, pot |
| `scout/stroj/stroj/indeks.py` | z-vrednosti, indeks po poziciji, percentil, projekcija na raven |
| `scout/stroj/stroj/podobnost.py` | kosinusno najbližji v kosih |
| `scout/stroj/stroj/vrzeli.py` | vrzeli v kadru kluba |
| `scout/stroj/stroj/backtest.py` | napoved naslednje sezone proti naivni osnovi |
| `scout/stroj/stroj/pisanje.py` | nova različica modela z `COPY` v eni transakciji, obrezovanje starih |
| `scout/stroj/stroj/__main__.py` | CLI `python -m stroj`, `zagon`, zanka ob 11:00 |
| `scout/stroj/tests/pomoc.py` | sintetična `Tabela` sezon s privzetimi stolpci |
| `scout/stroj/tests/test_*.py` | testi po modulih; `test_baza.py` je integracijski |
| `scripts/hetzner/scout/Dockerfile` | slika `python:3.12-slim` s paketom |
| `scripts/hetzner/scout/docker-compose.yml` | storitev `slff-scout` |
| `scripts/hetzner/objavi-scout.sh` | objava na VM (rsync, build, zagon) |
| `docs/scout.md` | opis stroja, ukazi, objava, omejitve |
| `CLAUDE.md`, `README.md`, `docs/podatkovni-model.md`, `.gitignore` | kazalec, vrstice podatkovnega modela, izključitve Pythona |

Lokacija `scout/stroj/`: spec postavi izdelek Scout v `scout/` (Vite vmesnik faze 3 bo `scout/src`), stroj je samostojen Python projekt ob njem.

---

### Task 1: Shema `scout` in `players.scout_skrit`

**Files:**
- Create: `supabase/migrations/20261016140100_scout_stroj.sql`
- Modify: `supabase/tests/varnost.sql`
- Modify (generirano): `src/lib/baza.types.ts`

**Interfaces:**
- Consumes: `public.countries(id, code)`, `public.je_mladinski_slug(text)`
- Produces: `public.players.scout_skrit boolean not null default false`; vloga `scout_stroj` (LOGIN, brez gesla); tabele `scout.drzave(country_id, stanje)`, `scout.modeli(id, ustvarjen_at, leto, backtest jsonb, parametri jsonb, objavljen)`, `scout.lige_moc`, `scout.ekipe_elo`, `scout.kazalniki`, `scout.indeks`, `scout.vektorji`, `scout.vrzeli` (stolpci kot v SQL spodaj; Task 11 jih piše v tem vrstnem redu)

- [ ] **Step 1: Napiši padajoči test.** V `supabase/tests/varnost.sql` vstavi tik pred zaključni blok `do $$` / `declare v_napak int;`:

```sql
-- Scout, faza 1: shema stroja je zaprta za brskalnik, Slovenija odprta.
select pg_temp.preveri('scout: Slovenija je odprta',
  (select d.stanje = 'odprto' from scout.drzave d join countries c on c.id = d.country_id where c.code = 'SI'));
select pg_temp.preveri('scout: scout_skrit privzeto false',
  (select column_default = 'false' from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name = 'scout_skrit'));
set local role anon;
select pg_temp.zavrnjeno('scout: anon ne bere kazalnikov', $$select * from scout.kazalniki$$);
reset role;
set local role authenticated;
select pg_temp.zavrnjeno('scout: authenticated ne bere moci lig', $$select * from scout.lige_moc$$);
select pg_temp.zavrnjeno('scout: authenticated ne odpre drzave', $$update scout.drzave set stanje = 'odprto'$$);
reset role;
select pg_temp.preveri('scout: stroj bere zapisnike in ne pise vanje',
  has_table_privilege('scout_stroj', 'public.appearances', 'SELECT')
  and not has_table_privilege('scout_stroj', 'public.players', 'UPDATE'));
select pg_temp.preveri('scout: anon in authenticated nimata sheme scout',
  not has_schema_privilege('anon', 'scout', 'USAGE') and not has_schema_privilege('authenticated', 'scout', 'USAGE'));
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `npx supabase status >/dev/null && npm run test:varnost`
Expected: FAIL — `ERROR: relation "scout.drzave" does not exist` (ali `schema "scout" does not exist`), izhod ≠ 0.

- [ ] **Step 3: Migracija.** Ustvari `supabase/migrations/20261016140100_scout_stroj.sql`:

```sql
-- SLFF Scout, faza 1 (stroj). Spec: docs/superpowers/specs/2026-10-16-scout-design.md.
--
-- 1. `players.scout_skrit`: ugovor igralca proti Scoutu. Stroj izloči vso
--    osebo (isto šifro ali ime in klub v državi); v fantasy igri ostane.
-- 2. Shema `scout`: rezultati nočnega delavca slff-scout (scout/stroj/).
--    Vsak zagon je nova vrstica v `scout.modeli`; ostale tabele visijo na njej
--    in gredo z njo. Brskalnik sheme ne vidi: ni v api.schemas, anon in
--    authenticated nimata pravic, RLS brez politik. Brale jo bodo SECURITY
--    DEFINER funkcije faze 3 (te morajo ob branju še enkrat preveriti
--    scout_skrit in anonimizacijo, ker model nastane enkrat na noč).
--    Tujih ključev na public.players/teams ni namenoma: zdruzi-klube in
--    razdeli-zlite-igralce brišeta vrstice, stroj pa vse prepiše vsako noč.

alter table public.players
  add column if not exists scout_skrit boolean not null default false;
comment on column public.players.scout_skrit is
  'Ugovor proti Scoutu: oseba ne vstopi v izracun scout (vse vrstice z isto sifro oz. imenom in klubom v drzavi). Fantasy igre ne spremeni.';

create schema if not exists scout;
revoke all on schema scout from public, anon, authenticated;

create table scout.drzave (
  country_id     bigint primary key references public.countries on delete cascade,
  stanje         text not null default 'zaprto' check (stanje in ('zaprto', 'pilot', 'odprto'))
);
comment on table scout.drzave is
  'Katere drzave Scout pokaze klubom. Odpre jo lastnik; Slovenija je odprta od zacetka.';
insert into scout.drzave (country_id, stanje)
select id, case when code = 'SI' then 'odprto' else 'zaprto' end from public.countries
on conflict (country_id) do nothing;

create table scout.modeli (
  id           bigint generated always as identity primary key,
  ustvarjen_at timestamptz not null default now(),
  leto         int not null,
  backtest     jsonb not null,
  parametri    jsonb not null,
  objavljen    boolean not null default false
);
comment on column scout.modeli.objavljen is
  'Backtest je prestal prag (>= 15 % manjsa napaka od naivne osnove pri prestopih); vmesnik bere zadnji objavljeni model.';

create table scout.lige_moc (
  model_id       bigint not null references scout.modeli on delete cascade,
  competition_id bigint not null,
  moc            double precision not null,
  vir            text not null check (vir in ('model', 'piramida', 'drzava', 'brez')),
  prestopov      int not null,
  izracunano_at  timestamptz not null,
  primary key (model_id, competition_id)
);
comment on column scout.lige_moc.moc is
  'Log faktor moci: vrednost_ref = vrednost_v_ligi * exp(moc); projekcija na ligo = vrednost_ref * exp(-moc_lige).';

create table scout.ekipe_elo (
  model_id       bigint not null references scout.modeli on delete cascade,
  team_id        bigint not null,
  competition_id bigint not null,
  leto           int not null,
  elo            double precision not null,
  primary key (model_id, team_id, competition_id, leto)
);

create table scout.kazalniki (
  model_id       bigint not null references scout.modeli on delete cascade,
  player_id      bigint not null,
  competition_id bigint not null,
  sezona         text not null,
  leto           int not null,
  team_id        bigint not null,
  skupina        text check (skupina in ('GK', 'DEF', 'MID', 'FWD')),
  minute         int not null,
  delez_minut    double precision not null,
  zacetki_delez  double precision not null,
  cele_delez     double precision not null,
  goli_ref_90    double precision not null,
  delez_golov    double precision not null,
  enajstm        int not null,
  onoff_ref_90   double precision not null,
  prejeti_ref_90 double precision not null,
  ciste_delez    double precision not null,
  kartoni_90     double precision not null,
  vratar_ref_90  double precision not null,
  stalnost       double precision not null,
  trend_minut    double precision,
  prehod_ravni   double precision,
  zaupanje       double precision not null,
  primary key (model_id, player_id, sezona)
);

create table scout.indeks (
  model_id  bigint not null references scout.modeli on delete cascade,
  player_id bigint not null,
  skupina   text not null check (skupina in ('GK', 'DEF', 'MID', 'FWD')),
  indeks    double precision not null,
  percentil double precision not null,
  zaupanje  double precision not null,
  primary key (model_id, player_id)
);

create table scout.vektorji (
  model_id  bigint not null references scout.modeli on delete cascade,
  player_id bigint not null,
  skupina   text not null,
  vektor    double precision[] not null,
  podobni   bigint[] not null,
  podobnost double precision[] not null,
  primary key (model_id, player_id)
);

create table scout.vrzeli (
  model_id       bigint not null references scout.modeli on delete cascade,
  team_id        bigint not null,
  competition_id bigint not null,
  skupina        text,
  vrsta          text not null check (vrsta in ('tanka', 'odvisnost', 'padajoce_minute', 'disciplina', 'prejeti')),
  player_id      bigint,
  vrednost       double precision not null
);
create index vrzeli_model_ekipa_idx on scout.vrzeli (model_id, team_id);

alter table scout.drzave    enable row level security;
alter table scout.modeli    enable row level security;
alter table scout.lige_moc  enable row level security;
alter table scout.ekipe_elo enable row level security;
alter table scout.kazalniki enable row level security;
alter table scout.indeks    enable row level security;
alter table scout.vektorji  enable row level security;
alter table scout.vrzeli    enable row level security;
revoke all on all tables in schema scout from public, anon, authenticated;
revoke all on all sequences in schema scout from public, anon, authenticated;

-- Delavec slff-scout se prijavi kot scout_stroj (SCOUT_DB_URL): bere le
-- tabele zapisnikov, piše le shemo scout. Geslo nastavi lastnik ročno na
-- strežniku (docs/scout.md), nikoli v gitu; brez gesla prijava ne uspe.
-- Javne tabele imajo politike "javno branje" brez TO, zato zadošča SELECT;
-- politike "admin ureja …" pokličejo is_admin(), zato EXECUTE nanjo.
do $$
begin
  if not exists (select from pg_roles where rolname = 'scout_stroj') then
    create role scout_stroj login;
  end if;
end;
$$;
-- Lastnik migracij (lokalno postgres) sme preklopiti v vlogo (set role), da
-- integracijski test preveri prav te pravice.
grant scout_stroj to current_user;
grant usage on schema public, scout to scout_stroj;
grant select on public.players, public.appearances, public.goals, public.matches, public.rounds,
  public.competitions, public.federations, public.countries, public.teams to scout_stroj;
grant execute on function public.je_mladinski_slug(text), public.is_admin() to scout_stroj;
grant select, insert, update, delete on all tables in schema scout to scout_stroj;
grant usage, select on all sequences in schema scout to scout_stroj;
```

- [ ] **Step 4: Uveljavi, poženi teste, regeneriraj tipe.**

Run: `npx supabase migration up && npm run test:varnost && npm run tipi && npm run typecheck`
Expected: PASS — `NOTICE: PASS scout: Slovenija je odprta` … `VSE OK: …`; typecheck brez napak; `git diff --stat src/lib/baza.types.ts` pokaže `scout_skrit`.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20261016140100_scout_stroj.sql supabase/tests/varnost.sql src/lib/baza.types.ts
git commit -m "feat(scout): shema scout za stroj in players.scout_skrit" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Paket `stroj` in raven lig (prepis `ravenLige`)

**Files:**
- Create: `scout/stroj/pyproject.toml`, `scout/stroj/stroj/__init__.py`, `scout/stroj/stroj/ravni.py`
- Test: `scout/stroj/tests/test_ravni.py`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `scripts/visja-liga.mjs` `ravenLige({ slug, name, zveza })` (le v testu, prek `node`)
- Produces: `Tabela = dict[str, np.ndarray]`; `izberi(t: Tabela, maska: np.ndarray) -> Tabela`; `raven_lige(slug: str, ime: str | None = None, zveza: str | None = None) -> tuple[int | None, str] | None`

Odločitev: prepis namesto izvoza JSON iz Node. Raven je odvisna od lig v bazi (nove lige vsak teden), delavec pa je čist Python; prepis odrasle veje je ~50 vrstic, test enakosti z JS ga drži poravnanega.

- [ ] **Step 1: Okolje in paket.** Če `python3.12` ne obstaja: `brew install python@3.12`. Ustvari `scout/stroj/pyproject.toml`:

```toml
[project]
name = "slff-stroj"
version = "1.0.0"
description = "SLFF Scout: nocni analiticni stroj"
requires-python = ">=3.12"
dependencies = [
  "numpy==2.1.3",
  "psycopg[binary]==3.2.3",
]

[project.optional-dependencies]
test = ["pytest==8.3.3"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = ["stroj"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

`scout/stroj/stroj/__init__.py`:

```python
"""SLFF Scout: nočni analitični stroj (docs/scout.md)."""
import numpy as np

# Tabela je slovar stolpcev; vse vrstice so poravnane po indeksu.
Tabela = dict[str, np.ndarray]


def izberi(t: Tabela, maska: np.ndarray) -> Tabela:
    """Vrstice tabele, kjer je maska resnična."""
    return {c: v[maska] for c, v in t.items()}
```

Dodaj na konec `.gitignore`:

```
# Stroj Scout (Python)
scout/stroj/.venv/
__pycache__/
.pytest_cache/
*.egg-info/
```

Run: `cd scout/stroj && python3.12 -m venv .venv && .venv/bin/pip install -q -e '.[test]'`
Expected: namestitev brez napake.

- [ ] **Step 2: Napiši padajoči test** `scout/stroj/tests/test_ravni.py`:

```python
import json
import subprocess
from pathlib import Path

from stroj.ravni import raven_lige

KOREN = Path(__file__).resolve().parents[3]

LIGE = [
    ["hr-hnl", None, None],
    ["hr-3nl-zapad", None, None],
    ["hr-zup-istra-1", "1. ŽNL Istarska", "hr-istra"],
    ["hr-zup-x", "Nešto", None],
    ["sk-nike-liga", None, None],
    ["sk-sfz-3liga-zapad", None, None],
    ["sk-zsfz-5liga-nitra", None, None],
    ["sk-xyz", None, None],
    ["hu-nb2", None, None],
    ["hu-pest-1", None, None],
    ["hu-pest-2-del", None, None],
    ["at-regionalliga-ost", None, None],
    ["at-wiener-liga", None, None],
    ["es-ct-primera-g1", None, None],
    ["es-as-tercera-g2", None, None],
    ["es-ct-x", None, None],
    ["ee-esiliiga-b", None, None],
    ["ee-iii-liiga-louna", None, None],
    ["lv-virsliga", None, None],
    ["lv-2-liga", None, None],
    ["clani", None, None],
    ["lj-1-liga", None, None],
]

JS = (
    "import('./scripts/visja-liga.mjs').then((m) => console.log(JSON.stringify("
    "JSON.parse(process.argv[1]).map(([slug, name, zveza]) => {"
    " const r = m.ravenLige({ slug, name, zveza }); return r && [r.raven, r.obmocje] }))))"
)


def test_enako_kot_js():
    izhod = subprocess.run(["node", "-e", JS, json.dumps(LIGE)], cwd=KOREN, capture_output=True, text=True, check=True)
    pricakovano = json.loads(izhod.stdout)
    dobljeno = [list(r) if r else None for r in (raven_lige(*l) for l in LIGE)]
    assert dobljeno == pricakovano


def test_slovenija_nima_ravni():
    assert raven_lige("clani") is None
```

- [ ] **Step 3: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_ravni.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.ravni'`.

- [ ] **Step 4: Implementacija** `scout/stroj/stroj/ravni.py`:

```python
"""Uradna raven članske lige: prepis `ravenLige` iz scripts/visja-liga.mjs.

Vrne (raven, obmocje) kot JS (1 = vrh države; obmocje 'drzava' ali šifra
zveze) ali None. Mladinskih vej ni, ker Scout mladinskih lig ne bere.
Enakost z JS preveri tests/test_ravni.py; ob spremembi JS popravi oba.
"""
import re

HR_REGIJSKE = [
    (re.compile(r"\b4\. NL\b|Elitna|Premier|Premijer", re.I), 1),
    (re.compile(r"(^|\s)(III\.?|3\.|Treća)\s"), 4),
    (re.compile(r"(^|\s)(II\.?|2\.|Druga)\s"), 3),
    (re.compile(r"(^|\s)(I\.|1\.|Prva|Jedinstvena prva)\s"), 2),
]
HR_FIKSNE = {"hr-hnl": 1, "hr-1nl": 2, "hr-2nl": 3}
ES_CT = {"elit": 1, "primera": 2, "segona": 3, "tercera": 4, "quarta": 5}
ES_AS = {"tercera": 1, "primera": 2}
EE_FIKSNE = {"ee-premium-liiga": 1, "ee-esiliiga": 2, "ee-esiliiga-b": 3}
EE_NIZJE = {"ii": 4, "iii": 5, "iv": 6}


def raven_lige(slug: str, ime: str | None = None, zveza: str | None = None) -> tuple[int | None, str] | None:
    ime = ime or ""
    regija = zveza or slug
    tretji = (slug.split("-") + ["", "", ""])[2]
    if slug.startswith("hr-"):
        if slug in HR_FIKSNE:
            return HR_FIKSNE[slug], "drzava"
        if re.match(r"^hr-(3nl-|hns-treca-nl-)", slug):
            return 4, "drzava"
        return next((r for vzorec, r in HR_REGIJSKE if vzorec.search(ime)), None), regija
    if slug.startswith("sk-"):
        if slug == "sk-nike-liga":
            return 1, "drzava"
        m = re.match(r"^sk-sfz-(\d)liga", slug) or re.search(r"-(\d)liga", slug)
        return (int(m[1]), "drzava") if m else (None, regija)
    if slug.startswith("hu-"):
        if m := re.match(r"^hu-nb(\d)", slug):
            return int(m[1]), "drzava"
        if m := re.match(r"^hu-[a-z]+-(\d)(-|$)", slug):
            return 3 + int(m[1]), "drzava"
        return None, regija
    if slug.startswith("at-"):
        if slug == "at-bundesliga":
            return 1, "drzava"
        if slug == "at-2-liga":
            return 2, "drzava"
        if re.search(r"(^at-|-)regionalliga-", slug):
            return 3, "drzava"
        return None, regija
    if slug.startswith("es-ct-"):
        return (ES_CT[tretji], "drzava") if tretji in ES_CT else None
    if slug.startswith("es-as-"):
        return (ES_AS[tretji], "es-as") if tretji in ES_AS else None
    if slug.startswith("ee-"):
        if slug in EE_FIKSNE:
            return EE_FIKSNE[slug], "drzava"
        m = re.match(r"^ee-(ii|iii|iv)-liiga", slug)
        return (EE_NIZJE[m[1]], "drzava") if m else None
    if slug.startswith("lv-"):
        if slug == "lv-virsliga":
            return 1, "drzava"
        m = re.match(r"^lv-(\d)-liga", slug)
        return (1 + int(m[1]), "drzava") if m else None
    return None
```

- [ ] **Step 5: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_ravni.py`
Expected: PASS — `2 passed`.

- [ ] **Step 6: Commit.**

```bash
git add scout/stroj/pyproject.toml scout/stroj/stroj/__init__.py scout/stroj/stroj/ravni.py scout/stroj/tests/test_ravni.py .gitignore
git commit -m "feat(scout): paket stroj in raven lig iz ravenLige" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Nalaganje iz Postgresa

**Files:**
- Create: `scout/stroj/stroj/nalaganje.py`
- Test: `scout/stroj/tests/test_baza.py`

**Interfaces:**
- Consumes: shema iz Task 1; `Tabela`, `izberi` (Task 2)
- Produces: `SQL_SEZONE`, `SQL_TEKME`, `SQL_LIGE: str`; `v_stolpce(conn: psycopg.Connection, sql: str) -> Tabela` (strežniški kazalec); `nalozi(conn: psycopg.Connection) -> tuple[Tabela, Tabela, Tabela]` = `(sezone, tekme, lige)`:
  - `sezone`: `player_id, oseba, country_id, competition_id, sezona, leto, team_id, skupina, ima_sifro, nastopi, zacetki, minute, cele, goli_np, enajstm, rumeni, rdeci, prejeti, ciste, gr_on, min_on, ekipa_minute, ekipa_goli, ekipa_prejeti, ekipa_gr, ekipa_min_zmin` (ena vrstica na igralca × sezono; igralec je že vezan na eno ligo)
  - `tekme`: `competition_id, leto, home_team_id, away_team_id, home_goals, away_goals` (po datumu)
  - `lige`: `id, slug, name, zveza, country_id, active, stanje`

On/off iz zapisnikov: `appearances.minute_on/minute_off` in `goals.minute` obstajajo. `goals.team_id` je ekipa **strelca** (tudi pri avtogolu, glej `zapisnik-maribor.mjs`), zato koristnik avtogola = nasprotnik. Tekma z vsaj enim golom brez minute ne šteje v on/off (`ima_minute`); gol po 90. minuti šteje igralcu, ki je ostal do konca (`minute_off >= 90`). Minute na igrišču za on/off (`min_on`) so iz istega okna kot goli: `least(minute_off, 90) - minute_on`, ne `minutes_played`. Branje gre prek strežniškega kazalca v kosih po 50.000 vrstic (`mem_limit: 1g`); gol razlika na igrišču je spoj + `group by`, ne podpoizvedba po nastopu.

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_baza.py`:

```python
"""Integracijski test proti lokalni bazi (npx supabase start); vse se razveljavi."""
import os

import psycopg
import pytest

from stroj.nalaganje import nalozi

URL = os.environ.get("SCOUT_TEST_DB", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")

FIKSTURA = """
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
select v.id, v.slug, v.slug, 'T', false, (select id from countries where code = 'SI'), 'mnzg'
from (values (-914001, 'test-scout'), (-914002, 'test-scout-mladinci')) v(id, slug);
insert into teams (id, name, short_name, country_id) overriding system value
select -914000 - n, 'Test Scout ' || n, 'TS' || n, (select id from countries where code = 'SI')
from generate_series(1, 2) n;
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start, scout_skrit, anonimiziran_at) overriding system value
values (-914001, -914001, -914001, 'Prvi', 'Scout', 'Scout Prvi', 'FWD', 6, 6, false, null),
       (-914002, -914002, -914001, 'Drugi', 'Scout', 'Scout Drugi', 'DEF', 6, 6, false, null),
       (-914003, -914001, -914001, 'Skriti', 'Scout', 'Scout Skriti', 'MID', 6, 6, true, null),
       (-914004, -914001, -914001, 'Anonimni', 'Scout', 'Scout Anonimni', 'MID', 6, 6, false, now()),
       (-914005, -914001, -914001, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, false, null),
       (-914006, -914001, -914002, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, false, null);
insert into rounds (id, season, number, deadline_at, competition_id) overriding system value
values (-914001, '2098/99', 1, now() + interval '1 day', -914001);
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, zapisnik_id, played_on)
overriding system value
values (-914001, -914001, -914001, -914002, 2, 1, 'test-scout-1', '2098-09-01');
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914001, -914001, -914001, true, 0, 90, 90, 2, 1),
       (-914001, -914002, -914002, true, 0, 60, 60, 0, 0),
       (-914001, -914003, -914001, true, 0, 90, 90, 0, 0),
       (-914001, -914004, -914001, true, 0, 90, 90, 0, 0),
       (-914001, -914005, -914001, true, 0, 90, 90, 0, 0);
insert into goals (match_id, scorer_id, team_id, minute, is_penalty)
values (-914001, -914001, -914001, 10, true),
       (-914001, -914002, -914002, 50, false),
       (-914001, -914001, -914001, 70, false);
"""


@pytest.fixture
def conn():
    c = psycopg.connect(URL, connect_timeout=5)
    c.execute(FIKSTURA)
    c.execute("set role scout_stroj")  # preveri prav pravice delavca
    yield c
    c.rollback()
    c.close()


def test_nalozi(conn):
    sezone, tekme, lige = nalozi(conn)
    vrsta = {p: i for i, p in enumerate(sezone["player_id"].tolist()) if -914006 <= p <= -914001}
    assert set(vrsta) == {-914001, -914002}  # skriti, anonimni in mladi (ima mladinsko vrstico) izpadejo
    i, j = vrsta[-914001], vrsta[-914002]
    assert [sezone[c][i] for c in ("goli_np", "enajstm", "gr_on", "ekipa_gr", "ekipa_goli", "ekipa_prejeti", "leto")] == [1, 1, 1, 1, 2, 1, 2098]
    assert [sezone[c][j] for c in ("min_on", "gr_on", "ekipa_gr", "ekipa_min_zmin")] == [60, 0, -1, 90]
    assert sezone["skupina"][j] == "DEF" and sezone["oseba"][i].startswith("i")
    assert -914002 not in lige["id"].tolist()
    assert (-914001, 2098) in set(zip(tekme["competition_id"].tolist(), tekme["leto"].tolist()))
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_baza.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.nalaganje'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/nalaganje.py`:

```python
"""Branje iz Postgresa: vse seštevke naredi SQL, Python dobi stolpce."""
import numpy as np
import psycopg

from stroj import Tabela, izberi

# Identiteta osebe čez lige: šifra je enolična le znotraj vira (RS, ES, UA, RO
# imajo več virov z ločenimi številkami), ime in klub znotraj države
# (Slovenija, stari CMS MNZ). Pričakuje aliasa p (players) in c (competitions).
OSEBA = """case when p.reg_st is not null
  then 'r' || coalesce(c.source, '') || ':' || p.reg_st
  else 'i' || coalesce(c.country_id, 0) || ':'
       || lower(coalesce(p.full_name, p.last_name || ' ' || p.first_name)) || ':' || p.team_id end"""

# Ugovor (scout_skrit) velja za vse vrstice osebe; kdor ima vrstico v
# mladinski ligi, je izločen, dokler faza 2 ne prinese prijavljene letnice.
SQL_IZKLJUCENI = f"""
select distinct {OSEBA}
from public.players p join public.competitions c on c.id = p.competition_id
where p.scout_skrit or public.je_mladinski_slug(c.slug)
"""

SQL_SEZONE = f"""
with tekme as (
  select m.id, m.home_team_id, m.away_team_id, m.home_goals, m.away_goals,
         r.season as sezona, r.competition_id,
         not exists (select 1 from public.goals g where g.match_id = m.id and g.minute is null) as ima_minute
  from public.matches m
  join public.rounds r on r.id = m.round_id
  join public.competitions c on c.id = r.competition_id
  where m.zapisnik_id is not null and not m.kontumacija and not public.je_mladinski_slug(c.slug)
),
goli as (
  -- goals.team_id je ekipa strelca, tudi pri avtogolu
  select g.match_id, g.minute,
         case when not g.is_own_goal then g.team_id
              when g.team_id = t.home_team_id then t.away_team_id
              else t.home_team_id end as za_ekipo
  from public.goals g join tekme t on t.id = g.match_id
  where t.ima_minute
),
ekipe as (
  select t.competition_id, t.sezona, e.team_id,
         count(*) * 90 as ekipa_minute,
         sum(e.dala) as ekipa_goli,
         sum(e.prejela) as ekipa_prejeti,
         coalesce(sum(e.dala - e.prejela) filter (where t.ima_minute), 0) as ekipa_gr,
         count(*) filter (where t.ima_minute) * 90 as ekipa_min_zmin
  from tekme t
  cross join lateral (values (t.home_team_id, t.home_goals, t.away_goals),
                             (t.away_team_id, t.away_goals, t.home_goals)) e(team_id, dala, prejela)
  group by 1, 2, 3
),
nastopi as (
  select a.id, a.match_id, a.player_id, a.team_id, a.started, a.minutes_played, a.goals,
         a.penalties_scored, a.yellow_cards, a.red_cards, a.goals_conceded, a.clean_sheet,
         a.is_goalkeeper, a.minute_on, a.minute_off, t.sezona, t.competition_id, t.ima_minute
  from public.appearances a join tekme t on t.id = a.match_id
  where a.minutes_played > 0
),
na_igriscu as (
  -- gol razlika ekipe, ko je igralec na igrišču (isto okno kot min_on spodaj)
  select n.id, sum(case when g.za_ekipo = n.team_id then 1 else -1 end) as gr
  from nastopi n join goli g on g.match_id = n.match_id
  where g.minute > n.minute_on and (g.minute <= n.minute_off or n.minute_off >= 90)
  group by n.id
),
igralci as (
  select n.player_id, n.competition_id, n.sezona,
         mode() within group (order by n.team_id) as team_id,
         count(*) as nastopi, sum(n.started::int) as zacetki, sum(n.minutes_played) as minute,
         sum((n.minutes_played >= 90)::int) as cele,
         sum(n.goals - n.penalties_scored) as goli_np, sum(n.penalties_scored) as enajstm,
         sum(n.yellow_cards) as rumeni, sum(n.red_cards) as rdeci,
         sum(n.goals_conceded) as prejeti, sum(n.clean_sheet::int) as ciste,
         bool_or(n.is_goalkeeper) as vratar,
         coalesce(sum(o.gr) filter (where n.ima_minute), 0)::int as gr_on,
         coalesce(sum(greatest(least(n.minute_off, 90) - n.minute_on, 0)) filter (where n.ima_minute), 0)::int as min_on
  from nastopi n left join na_igriscu o on o.id = n.id
  group by 1, 2, 3
)
select i.player_id, {OSEBA} as oseba, c.country_id, i.competition_id, i.sezona,
       left(i.sezona, 4)::int as leto, i.team_id,
       coalesce(p.position, case when i.vratar then 'GK' end) as skupina,
       p.reg_st is not null as ima_sifro,
       i.nastopi, i.zacetki, i.minute, i.cele, i.goli_np, i.enajstm, i.rumeni, i.rdeci,
       i.prejeti, i.ciste, i.gr_on, i.min_on,
       e.ekipa_minute, e.ekipa_goli, e.ekipa_prejeti, e.ekipa_gr, e.ekipa_min_zmin
from igralci i
join public.players p on p.id = i.player_id
join public.competitions c on c.id = i.competition_id
join ekipe e on e.competition_id = i.competition_id and e.sezona = i.sezona and e.team_id = i.team_id
where p.anonimiziran_at is null
order by i.player_id, i.sezona
"""

SQL_TEKME = """
select r.competition_id, left(r.season, 4)::int as leto,
       m.home_team_id, m.away_team_id, m.home_goals, m.away_goals
from public.matches m
join public.rounds r on r.id = m.round_id
join public.competitions c on c.id = r.competition_id
where m.zapisnik_id is not null and not m.kontumacija and not public.je_mladinski_slug(c.slug)
order by m.played_on nulls last, m.id
"""

SQL_LIGE = """
select c.id, c.slug, c.name, f.code as zveza, c.country_id, c.active,
       coalesce(d.stanje, 'zaprto') as stanje
from public.competitions c
left join public.federations f on f.id = c.federation_id
left join scout.drzave d on d.country_id = c.country_id
where not public.je_mladinski_slug(c.slug)
order by c.id
"""

KOS = 50_000  # vrstic na branje strežniškega kazalca


def v_stolpce(conn: psycopg.Connection, sql: str) -> Tabela:
    """Rezultat poizvedbe kot stolpci, brano v kosih (strežniški kazalec);
    besedilo in NULL ostaneta object."""
    with conn.transaction(), conn.cursor(name="stroj") as cur:
        cur.itersize = KOS
        cur.execute(sql)
        imena = [d.name for d in cur.description]
        stolpci: list[list] = [[] for _ in imena]
        for vrstica in cur:
            for stolpec, x in zip(stolpci, vrstica):
                stolpec.append(x)
    izid: Tabela = {}
    for ime, stolpec in zip(imena, stolpci):
        stevilsko = all(isinstance(x, (int, float)) for x in stolpec)
        izid[ime] = np.array(stolpec) if stevilsko else np.array(stolpec, dtype=object)
    return izid


def nalozi(conn: psycopg.Connection) -> tuple[Tabela, Tabela, Tabela]:
    """Sezone igralcev (brez izločenih oseb), tekme za Elo, članske lige."""
    izkljuceni = {r[0] for r in conn.execute(SQL_IZKLJUCENI)}
    sezone = v_stolpce(conn, SQL_SEZONE)
    ostanejo = np.array([o not in izkljuceni for o in sezone["oseba"].tolist()], dtype=bool)
    return izberi(sezone, ostanejo), v_stolpce(conn, SQL_TEKME), v_stolpce(conn, SQL_LIGE)
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_baza.py`
Expected: PASS — `1 passed`.

- [ ] **Step 5: Commit.**

```bash
git add scout/stroj/stroj/nalaganje.py scout/stroj/tests/test_baza.py
git commit -m "feat(scout): nalaganje sezon, tekem in lig iz Postgresa" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Elo ekip

**Files:**
- Create: `scout/stroj/stroj/elo.py`
- Test: `scout/stroj/tests/test_elo.py`

**Interfaces:**
- Consumes: `tekme` iz `nalozi`
- Produces: `elo(tekme: Tabela, k: float = 20.0, domaci: float = 60.0) -> dict[tuple[int, int, int], float]` (ključ `(competition_id, leto, team_id)`); `elo_rel(s: Tabela, elo: dict[tuple[int, int, int], float]) -> np.ndarray` (`(elo − 1500) / 400`, neznana ekipa 0)

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_elo.py`:

```python
import numpy as np
import pytest

from stroj.elo import elo, elo_rel


def _tekme(vrstice):
    imena = ["competition_id", "leto", "home_team_id", "away_team_id", "home_goals", "away_goals"]
    return {ime: np.array(stolpec) for ime, stolpec in zip(imena, zip(*vrstice))}


def test_zmagovalec_raste_vsota_ostane():
    r = elo(_tekme([(1, 2025, 10, 20, 2, 0), (1, 2025, 10, 30, 3, 0), (1, 2025, 20, 30, 1, 1)]))
    assert r[(1, 2025, 10)] > 1500 > r[(1, 2025, 30)]
    assert sum(r.values()) == pytest.approx(4500)


def test_vsaka_liga_sezona_zacne_pri_1500():
    r = elo(_tekme([(1, 2025, 10, 20, 5, 0), (2, 2026, 10, 20, 0, 0)]))
    assert r[(2, 2026, 10)] < 1500  # domači remi brez upoštevanja lanske zmage


def test_elo_rel():
    s = {"competition_id": np.array([1, 1]), "leto": np.array([2025, 2025]), "team_id": np.array([10, 99])}
    assert elo_rel(s, {(1, 2025, 10): 1700.0}).tolist() == [0.5, 0.0]
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_elo.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.elo'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/elo.py`:

```python
"""Elo klubov iz izidov. Vsaka liga-sezona začne pri 1500: Elo meri moč
znotraj lige (kontekst ekipe), moč med ligami meri moc_lig."""
import numpy as np

from stroj import Tabela

ZACETEK = 1500.0


def elo(tekme: Tabela, k: float = 20.0, domaci: float = 60.0) -> dict[tuple[int, int, int], float]:
    r: dict[tuple[int, int, int], float] = {}
    for liga, leto, d, g, dg, gg in zip(*(tekme[c].tolist() for c in (
            "competition_id", "leto", "home_team_id", "away_team_id", "home_goals", "away_goals"))):
        kd, kg = (liga, leto, d), (liga, leto, g)
        rd, rg = r.get(kd, ZACETEK), r.get(kg, ZACETEK)
        pricakovano = 1 / (1 + 10 ** ((rg - rd - domaci) / 400))
        izid = 1.0 if dg > gg else 0.5 if dg == gg else 0.0
        r[kd] = rd + k * (izid - pricakovano)
        r[kg] = rg - k * (izid - pricakovano)
    return r


def elo_rel(s: Tabela, elo: dict[tuple[int, int, int], float]) -> np.ndarray:
    """Elo ekipe igralca glede na povprečje lige, v enotah 400 točk."""
    kljuci = zip(s["competition_id"].tolist(), s["leto"].tolist(), s["team_id"].tolist())
    return np.array([(elo.get(kl, ZACETEK) - ZACETEK) / 400 for kl in kljuci], dtype=float)
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_elo.py`
Expected: PASS — `3 passed`.

- [ ] **Step 5: Commit.**

```bash
git add scout/stroj/stroj/elo.py scout/stroj/tests/test_elo.py
git commit -m "feat(scout): Elo klubov po ligi in sezoni" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Moč lig (fiksni učinki in dopolnitev)

**Files:**
- Create: `scout/stroj/stroj/moc_lig.py`
- Test: `scout/stroj/tests/test_moc_lig.py`

**Interfaces:**
- Consumes: `raven_lige` (Task 2), `elo_rel` (Task 4), `sezone`, `lige` (Task 3)
- Produces:
  - `MIN_MINUT = 450`, `MIN_VRSTIC_LIGE = 20`, `PRIVZETI_KORAK = 0.25`, `KORAKOV = 500`, `TOLERANCA = 1e-9`
  - `oceni_moc(oseba: np.ndarray, liga: np.ndarray, elo_rel: np.ndarray, y: np.ndarray) -> tuple[dict[int, float], float, dict[int, int]]` = (moč po ligi, mediana 0; koeficient Elo; vrstice prestopnikov po ligi)
  - `dopolni_moc(moc: dict[int, float], stevci: dict[int, int], lige: Tabela) -> dict[int, tuple[float, str, int]]` = liga → (moč, vir ∈ model/piramida/drzava/brez, prestopov)
  - `prilagodi(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float]) -> tuple[dict[int, tuple[float, str, int]], float]`

Model: `y = log((goli_np + 0.5) / (minute / 90))` za igralce izven vrat z ≥ 450 min; `y = sposobnost osebe + liga + c · elo_rel` (oba fiksna učinka), le osebe z vsaj dvema ligama, rešeno z izmeničnim odštevanjem povprečij (blokovni koordinatni spust na najmanjših kvadratih) v numpy. Moč = −učinek lige (močnejša liga → manj golov → večja moč), mediana 0.

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_moc_lig.py`:

```python
import numpy as np

from stroj.moc_lig import dopolni_moc, oceni_moc


def test_najde_znano_moc():
    rng = np.random.default_rng(1)
    prava = {1: 0.0, 2: 0.5, 3: 1.0}
    oseba, liga, rel, y = [], [], [], []
    for i in range(600):
        sposobnost = rng.normal(0, 0.3)
        for l in rng.choice([1, 2, 3], 2, replace=False).tolist():
            r = rng.normal(0, 0.5)
            oseba.append(f"o{i}")
            liga.append(l)
            rel.append(r)
            y.append(sposobnost - prava[l] + 0.2 * r + rng.normal(0, 0.1))
    moc, koef, stevci = oceni_moc(np.array(oseba, dtype=object), np.array(liga), np.array(rel), np.array(y))
    assert abs((moc[2] - moc[1]) - 0.5) < 0.05
    assert abs((moc[3] - moc[1]) - 1.0) < 0.05
    assert abs(koef - 0.2) < 0.05
    assert stevci[1] > 300


def test_brez_prestopov_ni_modela():
    moc, koef, _ = oceni_moc(np.array(["a", "b"], dtype=object), np.array([1, 2]), np.zeros(2), np.zeros(2))
    assert moc == {} and koef == 0.0


def test_dopolni_piramida_drzava_brez():
    lige = {
        "id": np.array([1, 2, 3, 4, 5, 6, 7]),
        "slug": np.array(["sk-nike-liga", "sk-sfz-2liga", "sk-sfz-3liga", "sk-sfz-4liga", "clani", "lj-1-liga", "x-liga"], dtype=object),
        "name": np.array([None] * 7, dtype=object),
        "zveza": np.array([None] * 7, dtype=object),
        "country_id": np.array([2, 2, 2, 2, 1, 1, 3]),
    }
    izid = dopolni_moc({1: 1.0, 2: 0.75, 3: 0.5, 6: 0.3}, {1: 40, 2: 30, 3: 25, 6: 50}, lige)
    assert izid[1] == (1.0, "model", 40)
    assert izid[4][1] == "piramida" and abs(izid[4][0] - 0.25) < 1e-9
    assert izid[5] == (0.3, "drzava", 0)
    assert izid[7] == (0.0, "brez", 0)
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_moc_lig.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.moc_lig'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/moc_lig.py`:

```python
"""Moč lig iz igralcev, ki so igrali v več ligah (spec 3.1)."""
from collections import Counter

import numpy as np

from stroj import Tabela
from stroj.elo import elo_rel
from stroj.ravni import raven_lige

MIN_MINUT = 450
MIN_VRSTIC_LIGE = 20
# ponytail: privzet korak moči na raven piramide (log faktor), ko ni treh lig
# z modelom in znano ravnijo; zamenja ga naklon iz podatkov, takoj ko so.
PRIVZETI_KORAK = 0.25
# ponytail: izmenično odštevanje povprečij konvergira počasi pri slabo
# povezanih ligah; če 500 korakov ne zadošča, ga zamenja redek LSQR.
KORAKOV = 500
TOLERANCA = 1e-9


def _prestopniki(oseba: np.ndarray, liga: np.ndarray) -> np.ndarray:
    lige_osebe: dict = {}
    for o, l in zip(oseba.tolist(), liga.tolist()):
        lige_osebe.setdefault(o, set()).add(l)
    return np.array([len(lige_osebe[o]) > 1 for o in oseba.tolist()], dtype=bool)


def _povprecje(inv: np.ndarray, v: np.ndarray, n: int) -> np.ndarray:
    return np.bincount(inv, v, n) / np.maximum(np.bincount(inv, minlength=n), 1)


def oceni_moc(oseba: np.ndarray, liga: np.ndarray, elo_rel: np.ndarray, y: np.ndarray) -> tuple[dict[int, float], float, dict[int, int]]:
    """Dvosmerni fiksni učinki: y = oseba + liga + c · Elo ekipe."""
    m = _prestopniki(oseba, liga)
    stevci = dict(Counter(liga[m].tolist()))
    m &= np.isin(liga, [l for l, n in stevci.items() if n >= MIN_VRSTIC_LIGE])
    m[m] = _prestopniki(oseba[m], liga[m])
    znane, il = np.unique(liga[m], return_inverse=True)
    if len(znane) < 2:
        return {}, 0.0, stevci
    _, io = np.unique(oseba[m], return_inverse=True)
    yy, e = y[m], elo_rel[m]
    a, b, c = np.zeros(io.max() + 1), np.zeros(len(znane)), 0.0
    ee = float(e @ e)
    for _ in range(KORAKOV):
        b_prej = b
        b = _povprecje(il, yy - a[io] - c * e, len(b))
        a = _povprecje(io, yy - b[il] - c * e, len(a))
        if ee > 0:
            c = float((yy - a[io] - b[il]) @ e / ee)
        if np.abs(b - b_prej).max() < TOLERANCA:
            break
    moc = np.median(b) - b
    return dict(zip(znane.tolist(), moc.tolist())), c, stevci


def dopolni_moc(moc: dict[int, float], stevci: dict[int, int], lige: Tabela) -> dict[int, tuple[float, str, int]]:
    """Vsaki ligi moč in vir: model → piramida (ravenLige) → mediana države → 0."""
    drzava = dict(zip(lige["id"].tolist(), lige["country_id"].tolist()))
    ravni = {l: raven_lige(s, i, z) for l, s, i, z in zip(
        lige["id"].tolist(), lige["slug"].tolist(), lige["name"].tolist(), lige["zveza"].tolist())}
    drzavna = {l: r[0] for l, r in ravni.items() if r and r[0] is not None and r[1] == "drzava"}
    pari = [(drzavna[l], v) for l, v in moc.items() if l in drzavna]
    # ponytail: en naklon za vse države; po državi, ko bo vsaka imela tri modelne lige
    korak = -float(np.polyfit(*zip(*pari), 1)[0]) if len({r for r, _ in pari}) >= 2 and len(pari) >= 3 else PRIVZETI_KORAK
    izid: dict[int, tuple[float, str, int]] = {}
    for l, d in drzava.items():
        n = stevci.get(l, 0)
        modelne = [k for k in moc if drzava.get(k) == d]
        if l in moc:
            izid[l] = (moc[l], "model", n)
        elif l in drzavna:
            sidra = [moc[k] + korak * (drzavna[k] - 1) for k in modelne if k in drzavna]
            vrh = float(np.mean(sidra)) if sidra else 0.0
            izid[l] = (vrh - korak * (drzavna[l] - 1), "piramida", n)
        elif modelne:
            izid[l] = (float(np.median([moc[k] for k in modelne])), "drzava", n)
        else:
            izid[l] = (0.0, "brez", n)
    return izid


def prilagodi(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float]) -> tuple[dict[int, tuple[float, str, int]], float]:
    """Moč vseh lig in učinek Elo ekipe na gole (teče enkrat tedensko)."""
    m = (s["minute"] >= MIN_MINUT) & (s["skupina"] != "GK")
    y = np.log((s["goli_np"][m] + 0.5) / (s["minute"][m] / 90))
    moc, koef, stevci = oceni_moc(s["oseba"][m], s["competition_id"][m], elo_rel(s, elo)[m], y)
    return dopolni_moc(moc, stevci, lige), koef
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_moc_lig.py`
Expected: PASS — `3 passed`.

- [ ] **Step 5: Čas na produkcijskih podatkih (le branje).** Tunel in `SCOUT_PROD_URL` (supabase_admin kot CI, `?options=-c%20default_transaction_read_only%3Don`) nastavi človek; migracija iz Task 1 tu še ni potrebna.

Run:
```bash
ssh -fN -L 55432:127.0.0.1:5432 slff
cd scout/stroj && .venv/bin/python - <<'EOF'
import os, time
import psycopg
from stroj.elo import elo
from stroj.moc_lig import prilagodi
from stroj.nalaganje import SQL_SEZONE, SQL_TEKME, v_stolpce

LIGE = """select c.id, c.slug, c.name, f.code as zveza, c.country_id from public.competitions c
left join public.federations f on f.id = c.federation_id
where not public.je_mladinski_slug(c.slug) order by c.id"""
with psycopg.connect(os.environ["SCOUT_PROD_URL"], autocommit=True) as conn:
    t0 = time.monotonic()
    s = v_stolpce(conn, SQL_SEZONE)
    t1 = time.monotonic()
    tekme, lige = v_stolpce(conn, SQL_TEKME), v_stolpce(conn, LIGE)
t2 = time.monotonic()
moc, koef = prilagodi(s, lige, elo(tekme))
t3 = time.monotonic()
print(f"vrstic {len(s['player_id'])}, branje {t1 - t0:.0f} s, moc lig {t3 - t2:.0f} s, "
      f"lig z modelom {sum(v[1] == 'model' for v in moc.values())}, elo_koef {koef:.3f}")
EOF
```
Expected: izpis ene vrstice; `moc lig` pod 300 s in vsaj nekaj deset lig z modelom. Če je počasneje ali je lig z modelom 0, ustavi in javi (ne nadaljuj s Task 6).

- [ ] **Step 6: Commit.**

```bash
git add scout/stroj/stroj/moc_lig.py scout/stroj/tests/test_moc_lig.py
git commit -m "feat(scout): moc lig s fiksnimi ucinki in dopolnitvijo iz piramide" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Kazalniki igralca

**Files:**
- Create: `scout/stroj/stroj/kazalniki.py`, `scout/stroj/tests/pomoc.py`
- Test: `scout/stroj/tests/test_kazalniki.py`

**Interfaces:**
- Consumes: `sezone` (Task 3), moč iz `prilagodi` (Task 5), `elo`, `elo_rel` (Task 4)
- Produces: `K_MINUT = 900.0`; `izracunaj(s: Tabela, moc: dict[int, tuple[float, str, int]], elo: dict[tuple[int, int, int], float], elo_koef: float) -> Tabela` s stolpci `player_id, oseba, country_id, competition_id, sezona, leto, team_id, skupina, minute, enajstm, ekipa_goli, moc_lige, delez_minut, zacetki_delez, cele_delez, goli_ref_90, delez_golov, onoff_ref_90, prejeti_ref_90, ciste_delez, kartoni_90, vratar_ref_90, zaupanje, stalnost, trend_minut, prehod_ravni` (vrstni red vrstic = `s`)

Pravila: stopnje na 90 se skrčijo proti povprečju iste lige in pozicije (`K_MINUT` navideznih minut); `goli_ref_90` in `onoff_ref_90` × `exp(moč)` (na referenčno raven), `prejeti_ref_90` × `exp(−moč)`; goli še ÷ `exp(elo_koef · elo_rel)` (močna ekipa šteje manj); on/off = (gol razlika na 90 na igrišču − brez njega), skrčeno proti 0 z `min(min_on, min_off)`; zaupanje = `min(1, minute/1800)` × (1 s šifro, 0,7 po imenu) × vir moči (model 1, piramida 0,8, drzava 0,6, brez 0,5). Obramba vratarja: `vratar_ref_90` = (prejeti ekipe na 90 − skrčeni prejeti vratarja na 90) × `exp(−moč)`, pozitivno = boljši od povprečja ekipe, drugim 0. Zanesljivost čez sezone: `stalnost` = delež dosedanjih sezon osebe (do te vključno), v katerih je bila glavna vrstica redna (≥ 50 % minut ekipe).

- [ ] **Step 1: Pomožna tabela** `scout/stroj/tests/pomoc.py`:

```python
"""Sintetične sezone s privzetimi stolpci, kot jih vrne nalaganje.nalozi."""
import numpy as np

PRIVZETO = {
    "country_id": 1, "competition_id": 1, "sezona": "2025/26", "leto": 2025, "team_id": 1,
    "skupina": "FWD", "ima_sifro": True, "nastopi": 10, "zacetki": 10, "minute": 900, "cele": 10,
    "goli_np": 0, "enajstm": 0, "rumeni": 0, "rdeci": 0, "prejeti": 0, "ciste": 0,
    "gr_on": 0, "min_on": 900, "ekipa_minute": 900, "ekipa_goli": 10, "ekipa_prejeti": 10, "ekipa_gr": 0,
    "ekipa_min_zmin": 900,
}


def sezone(n: int, **stolpci) -> dict[str, np.ndarray]:
    t = {c: np.array(stolpci.get(c, [v] * n), dtype=object if isinstance(v, str) else None)
         for c, v in PRIVZETO.items()}
    t["player_id"] = np.array(stolpci.get("player_id", list(range(1, n + 1))))
    t["oseba"] = np.array(stolpci.get("oseba", [f"r1:{i}" for i in range(1, n + 1)]), dtype=object)
    return t
```

- [ ] **Step 2: Napiši padajoči test** `scout/stroj/tests/test_kazalniki.py`:

```python
import numpy as np
import pytest
from pomoc import sezone

from stroj.kazalniki import izracunaj

MODEL = {1: (0.0, "model", 30), 2: (0.5, "model", 30)}


def test_skrcenje_in_raven():
    s = sezone(4, minute=[900, 90, 900, 90], goli_np=[2, 2, 2, 2], competition_id=[1, 1, 2, 2], min_on=[900, 90, 900, 90])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert k["goli_ref_90"][1] < 1.0  # surovo 2,0 na 90, a le 90 minut
    assert k["goli_ref_90"][2] == pytest.approx(k["goli_ref_90"][0] * np.exp(0.5))


def test_mocna_ekipa_steje_manj():
    s = sezone(2, team_id=[1, 2], goli_np=[5, 5])
    k = izracunaj(s, MODEL, {(1, 2025, 1): 1900.0}, 0.2)
    assert k["goli_ref_90"][0] == pytest.approx(k["goli_ref_90"][1] * np.exp(-0.2))


def test_onoff():
    s = sezone(2, gr_on=[3, 0], min_on=[900, 900], ekipa_gr=[3, 3], ekipa_min_zmin=[900, 1800])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert k["onoff_ref_90"][0] == 0  # ves čas na igrišču: ni primerjave
    assert k["onoff_ref_90"][1] == pytest.approx(-0.15)  # brez njega +3, z njim 0; skrčeno na pol


def test_zaupanje():
    s = sezone(2, minute=[1800, 1800], ima_sifro=[True, False])
    assert izracunaj(s, MODEL, {}, 0.0)["zaupanje"].tolist() == pytest.approx([1.0, 0.7])
    assert izracunaj(s, {}, {}, 0.0)["zaupanje"].tolist() == pytest.approx([0.5, 0.35])


def test_pot():
    s = sezone(2, oseba=["r1:7", "r1:7"], leto=[2024, 2025], minute=[900, 400], competition_id=[1, 2], ekipa_minute=[1000, 1000])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert np.isnan(k["trend_minut"][0])
    assert k["trend_minut"][1] == pytest.approx(-0.5)
    assert k["prehod_ravni"][1] == pytest.approx(0.5)


def test_vratar_proti_ekipi():
    s = sezone(3, skupina=["GK", "GK", "DEF"], prejeti=[10, 20, 15], ekipa_prejeti=[15, 15, 15])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert k["vratar_ref_90"][0] > 0 > k["vratar_ref_90"][1]  # prvi prejme manj kot ekipa
    assert k["vratar_ref_90"][2] == 0


def test_stalnost():
    s = sezone(3, oseba=["r1:7"] * 3, leto=[2024, 2025, 2026], minute=[900, 200, 900], ekipa_minute=[1000] * 3)
    assert izracunaj(s, MODEL, {}, 0.0)["stalnost"].tolist() == pytest.approx([1.0, 0.5, 2 / 3])
```

- [ ] **Step 3: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_kazalniki.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.kazalniki'`.

- [ ] **Step 4: Implementacija** `scout/stroj/stroj/kazalniki.py`:

```python
"""Kazalniki igralca po (igralec, liga, sezona): prilagojeni ravni in ekipi,
skrčeni proti povprečju pri malo minutah (spec 3.2, 3.3, 3.7)."""
import numpy as np

from stroj import Tabela
from stroj.elo import elo_rel

# ponytail: ena prior teža za vse stopnje; po kazalniku, ko backtest pokaže razliko
K_MINUT = 900.0
REDNI = 0.5  # delež minut ekipe
ZAUPANJE_VIRA = {"model": 1.0, "piramida": 0.8, "drzava": 0.6, "brez": 0.5}
NEZNANA = (0.0, "brez", 0)
PREPISANI = ["player_id", "oseba", "country_id", "competition_id", "sezona", "leto", "team_id",
             "skupina", "minute", "enajstm", "ekipa_goli"]


def _deli(a, b) -> np.ndarray:
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    return np.divide(a, b, out=np.zeros_like(a), where=b > 0)


def _skrci(stevec: np.ndarray, minute: np.ndarray, kljuc: np.ndarray) -> np.ndarray:
    """Stopnja na 90 minut, skrčena proti povprečju iste lige in pozicije."""
    _, inv = np.unique(kljuc, return_inverse=True)
    mu = np.bincount(inv, stevec) / np.maximum(np.bincount(inv, minute), 1.0)
    return (stevec + mu[inv] * K_MINUT) / (minute + K_MINUT) * 90


def _pot(k: Tabela) -> tuple[np.ndarray, np.ndarray]:
    """Sprememba deleža minut in moči lige od lanske glavne vrstice iste osebe."""
    glavna: dict = {}
    for i, (o, y, m) in enumerate(zip(k["oseba"].tolist(), k["leto"].tolist(), k["minute"].tolist())):
        j = glavna.get((o, y))
        if j is None or m > k["minute"][j]:
            glavna[(o, y)] = i
    trend = np.full(len(k["oseba"]), np.nan)
    prehod = np.full(len(k["oseba"]), np.nan)
    for i, (o, y) in enumerate(zip(k["oseba"].tolist(), k["leto"].tolist())):
        j = glavna.get((o, y - 1))
        if j is not None:
            trend[i] = k["delez_minut"][i] - k["delez_minut"][j]
            prehod[i] = k["moc_lige"][i] - k["moc_lige"][j]
    return trend, prehod


def _stalnost(k: Tabela) -> np.ndarray:
    """Delež dosedanjih sezon osebe, v katerih je bila (glavna vrstica) redna."""
    redna: dict = {}
    for o, y, d in zip(k["oseba"].tolist(), k["leto"].tolist(), k["delez_minut"].tolist()):
        sezone = redna.setdefault(o, {})
        sezone[y] = sezone.get(y, False) or d >= REDNI
    return np.array([np.mean([r for yy, r in redna[o].items() if yy <= y])
                     for o, y in zip(k["oseba"].tolist(), k["leto"].tolist())])


def izracunaj(s: Tabela, moc: dict[int, tuple[float, str, int]], elo: dict[tuple[int, int, int], float], elo_koef: float) -> Tabela:
    minute = s["minute"].astype(float)
    lige = s["competition_id"].tolist()
    moc_lige = np.array([moc.get(l, NEZNANA)[0] for l in lige], dtype=float)
    vir = np.array([ZAUPANJE_VIRA[moc.get(l, NEZNANA)[1]] for l in lige])
    f = np.exp(moc_lige)
    kljuc = np.array([f"{l}:{g}" for l, g in zip(lige, s["skupina"].tolist())])
    min_off = np.maximum(s["ekipa_min_zmin"] - s["min_on"], 0).astype(float)
    utez = np.minimum(s["min_on"], min_off).astype(float)
    prejeti = _skrci(s["prejeti"].astype(float), minute, kljuc)
    onoff = (_deli(s["gr_on"], s["min_on"]) - _deli(s["ekipa_gr"] - s["gr_on"], min_off)) * 90
    k: Tabela = {c: s[c] for c in PREPISANI}
    k |= {
        "moc_lige": moc_lige,
        "delez_minut": _deli(minute, s["ekipa_minute"]),
        "zacetki_delez": _deli(s["zacetki"], s["nastopi"]),
        "cele_delez": _deli(s["cele"], s["nastopi"]),
        "goli_ref_90": _skrci(s["goli_np"].astype(float), minute, kljuc) * f * np.exp(-elo_koef * elo_rel(s, elo)),
        "delez_golov": _deli(s["goli_np"], s["ekipa_goli"]),
        "onoff_ref_90": onoff * utez / (utez + K_MINUT) * f,
        "prejeti_ref_90": prejeti / f,
        "vratar_ref_90": np.where(s["skupina"] == "GK", (_deli(s["ekipa_prejeti"], s["ekipa_minute"]) * 90 - prejeti) / f, 0.0),
        "ciste_delez": _deli(s["ciste"], s["nastopi"]),
        "kartoni_90": _skrci((s["rumeni"] + 3 * s["rdeci"]).astype(float), minute, kljuc),
        "zaupanje": np.minimum(1.0, minute / 1800) * np.where(s["ima_sifro"], 1.0, 0.7) * vir,
    }
    k["trend_minut"], k["prehod_ravni"] = _pot(k)
    k["stalnost"] = _stalnost(k)
    return k
```

- [ ] **Step 5: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_kazalniki.py`
Expected: PASS — `7 passed`.

- [ ] **Step 6: Commit.**

```bash
git add scout/stroj/stroj/kazalniki.py scout/stroj/tests/pomoc.py scout/stroj/tests/test_kazalniki.py
git commit -m "feat(scout): kazalniki igralca, prilagojeni ravni in skrceni" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Indeks po poziciji, percentil, projekcija

**Files:**
- Create: `scout/stroj/stroj/indeks.py`
- Test: `scout/stroj/tests/test_indeks.py`

**Interfaces:**
- Consumes: izhod `izracunaj` (Task 6), že omejen na izbrane vrstice
- Produces: `UTEZI: dict[str, dict[str, float]]`, `VEKTOR: list[str]`; `z_vrednosti(t: Tabela) -> np.ndarray` (n × len(VEKTOR)); `indeks(t: Tabela, Z: np.ndarray) -> tuple[np.ndarray, np.ndarray]` (indeks, percentil 0–100 znotraj (država, skupina)); `projekcija(vrednost_ref, moc_cilj) -> np.ndarray`

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_indeks.py`:

```python
import numpy as np
import pytest

from stroj.indeks import VEKTOR, indeks, projekcija, z_vrednosti


def test_indeks_in_percentil():
    t = {"skupina": np.array(["FWD"] * 3 + ["GK"] * 2, dtype=object), "country_id": np.array([1] * 5)}
    t |= {c: np.zeros(5) for c in VEKTOR}
    t["goli_ref_90"] = np.array([0.2, 0.5, 0.9, 0.0, 0.0])
    t["prejeti_ref_90"] = np.array([0.0, 0.0, 0.0, 1.0, 2.0])
    idx, pct = indeks(t, z_vrednosti(t))
    assert idx[0] < idx[1] < idx[2]
    assert pct[:3].tolist() == pytest.approx([100 / 3, 200 / 3, 100])
    assert idx[3] > idx[4]  # vratar z manj prejetimi je višje


def test_projekcija():
    assert projekcija(1.0, np.log(2)) == pytest.approx(0.5)
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_indeks.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.indeks'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/indeks.py`:

```python
"""Indeks po poziciji: utežena vsota z-vrednosti, percentil v (država, skupina),
projekcija na raven ciljne lige (spec 3.4)."""
import numpy as np

from stroj import Tabela

VEKTOR = ["delez_minut", "zacetki_delez", "stalnost", "goli_ref_90", "delez_golov",
          "onoff_ref_90", "prejeti_ref_90", "vratar_ref_90", "ciste_delez", "kartoni_90"]
# ponytail: uteži po presoji; umeri jih backtest indeksa, ko bo merilo (faza 4)
UTEZI = {
    "FWD": {"goli_ref_90": 0.5, "delez_golov": 0.2, "onoff_ref_90": 0.2, "delez_minut": 0.1},
    "MID": {"goli_ref_90": 0.3, "onoff_ref_90": 0.3, "delez_minut": 0.2, "stalnost": 0.1, "kartoni_90": -0.1},
    "DEF": {"onoff_ref_90": 0.3, "prejeti_ref_90": -0.3, "delez_minut": 0.2, "stalnost": 0.1, "goli_ref_90": 0.1},
    "GK": {"prejeti_ref_90": -0.3, "vratar_ref_90": 0.3, "ciste_delez": 0.2, "delez_minut": 0.2},
}


def z_vrednosti(t: Tabela) -> np.ndarray:
    """Stolpci VEKTOR, standardizirani znotraj skupine pozicij."""
    X = np.column_stack([np.nan_to_num(np.asarray(t[c], dtype=float)) for c in VEKTOR])
    Z = np.zeros_like(X)
    for g in UTEZI:
        m = t["skupina"] == g
        if m.sum() < 2:
            continue
        sd = X[m].std(0)
        Z[m] = (X[m] - X[m].mean(0)) / np.where(sd > 0, sd, 1.0)
    return Z


def indeks(t: Tabela, Z: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    idx = np.full(len(Z), np.nan)
    for g, utezi in UTEZI.items():
        m = t["skupina"] == g
        idx[m] = Z[m] @ np.array([utezi.get(c, 0.0) for c in VEKTOR])
    pct = np.full(len(Z), np.nan)
    for d in set(t["country_id"].tolist()):
        for g in UTEZI:
            m = np.flatnonzero((t["country_id"] == d) & (t["skupina"] == g))
            if len(m):
                pct[m] = (idx[m].argsort().argsort() + 1) / len(m) * 100
    return idx, pct


def projekcija(vrednost_ref, moc_cilj) -> np.ndarray:
    """Pričakovana vrednost (npr. golov na 90) v ligi z močjo moc_cilj."""
    return np.asarray(vrednost_ref, dtype=float) * np.exp(-np.asarray(moc_cilj, dtype=float))
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_indeks.py`
Expected: PASS — `2 passed`.

- [ ] **Step 5: Commit.**

```bash
git add scout/stroj/stroj/indeks.py scout/stroj/tests/test_indeks.py
git commit -m "feat(scout): indeks po poziciji, percentil in projekcija" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Podobni igralci

**Files:**
- Create: `scout/stroj/stroj/podobnost.py`
- Test: `scout/stroj/tests/test_podobnost.py`

**Interfaces:**
- Consumes: `Z` iz `z_vrednosti` (Task 7), vrstice ene (država, skupina)
- Produces: `najblizji(vektorji: np.ndarray, n: int = 20, kos: int = 2000) -> tuple[np.ndarray, np.ndarray]` = (indeksi sosedov n × k, kosinusne podobnosti n × k, padajoče; brez sebe); zahteva ≥ 2 vrstici

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_podobnost.py`:

```python
import numpy as np
import pytest

from stroj.podobnost import najblizji

X = np.array([[1.0, 0.0], [0.9, 0.1], [0.0, 1.0]])


def test_najblizji():
    sosedi, podobnost = najblizji(X, n=1)
    assert sosedi[:, 0].tolist() == [1, 0, 1]
    assert podobnost[0, 0] == pytest.approx(0.9 / np.hypot(0.9, 0.1))


def test_kosi_ne_spremenijo_izida():
    assert (najblizji(X, n=2, kos=1)[0] == najblizji(X, n=2)[0]).all()
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_podobnost.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.podobnost'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/podobnost.py`:

```python
"""Podobni igralci: kosinusna podobnost vektorjev kazalnikov (spec 3.5).
Vektorji so že prilagojeni ravni (kazalniki *_ref) in standardizirani."""
import numpy as np


def najblizji(vektorji: np.ndarray, n: int = 20, kos: int = 2000) -> tuple[np.ndarray, np.ndarray]:
    norma = vektorji / np.maximum(np.linalg.norm(vektorji, axis=1, keepdims=True), 1e-9)
    n = min(n, len(norma) - 1)
    sosedi = np.empty((len(norma), n), dtype=np.int64)
    podobnost = np.empty((len(norma), n))
    # ponytail: kosi po 2000 vrstic držijo matriko pod ~150 MB; ANN indeks, ko bo država > 200k igralcev
    for z in range(0, len(norma), kos):
        s = norma[z:z + kos] @ norma.T
        s[np.arange(len(s)), np.arange(z, z + len(s))] = -np.inf
        top = np.argpartition(-s, n - 1, axis=1)[:, :n]
        vr = np.take_along_axis(s, top, 1)
        red = np.argsort(-vr, axis=1)
        sosedi[z:z + kos] = np.take_along_axis(top, red, 1)
        podobnost[z:z + kos] = np.take_along_axis(vr, red, 1)
    return sosedi, podobnost
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_podobnost.py`
Expected: PASS — `2 passed`.

- [ ] **Step 5: Commit.**

```bash
git add scout/stroj/stroj/podobnost.py scout/stroj/tests/test_podobnost.py
git commit -m "feat(scout): podobni igralci s kosinusno podobnostjo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Vrzeli v kadru

**Files:**
- Create: `scout/stroj/stroj/vrzeli.py`
- Test: `scout/stroj/tests/test_vrzeli.py`

**Interfaces:**
- Consumes: izhod `izracunaj`, omejen na izbrane vrstice tekoče sezone (stolpci `team_id, competition_id, player_id, skupina, delez_minut, delez_golov, ekipa_goli, trend_minut, kartoni_90, prejeti_ref_90`)
- Produces: `NORMA: dict[str, int]`, `REDNI = 0.5`; `vrzeli(t: Tabela) -> list[tuple[int, int, str | None, str, int | None, float]]` = `(team_id, competition_id, skupina, vrsta, player_id, vrednost)`, vrsta ∈ `tanka, odvisnost, padajoce_minute, disciplina, prejeti`

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_vrzeli.py`:

```python
import numpy as np

from stroj.vrzeli import vrzeli


def test_vrzeli():
    t = {
        "team_id": np.array([1] * 5), "competition_id": np.array([1] * 5), "player_id": np.array([1, 2, 3, 4, 5]),
        "skupina": np.array(["GK", "DEF", "DEF", "MID", "FWD"], dtype=object),
        "delez_minut": np.array([0.9, 0.9, 0.2, 0.6, 0.8]),
        "delez_golov": np.array([0.0, 0.0, 0.0, 0.1, 0.6]),
        "ekipa_goli": np.array([10] * 5),
        "trend_minut": np.array([np.nan, 0.0, 0.0, -0.4, 0.1]),
        "kartoni_90": np.zeros(5),
        "prejeti_ref_90": np.array([1.0, 1.2, 0.5, 0.8, 0.9]),
    }
    v = vrzeli(t)
    vrste = {(r[2], r[3], r[4]) for r in v}
    assert ("DEF", "tanka", None) in vrste and ("GK", "tanka", None) not in vrste
    assert ("FWD", "odvisnost", 5) in vrste
    assert ("MID", "padajoce_minute", 4) in vrste
    assert not any(r[3] == "disciplina" for r in v)  # nihče nima kartonov
    assert ("DEF", "prejeti", None) in vrste  # redni branilec 1,2 > MID 0,8, FWD 0,9
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_vrzeli.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.vrzeli'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/vrzeli.py`:

```python
"""Vrzeli v kadru kluba iz tekoče sezone (spec 3.6)."""
import numpy as np

from stroj import Tabela

NORMA = {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2}  # rednih igralcev na pozicijo
REDNI = 0.5  # delež minut ekipe


def vrzeli(t: Tabela) -> list[tuple[int, int, str | None, str, int | None, float]]:
    izid: list[tuple[int, int, str | None, str, int | None, float]] = []
    meja_kartonov = {g: float(np.percentile(t["kartoni_90"][t["skupina"] == g], 90))
                     for g in NORMA if (t["skupina"] == g).any()}
    ekipe = sorted(set(zip(t["team_id"].tolist(), t["competition_id"].tolist())))
    for ekipa, liga in ekipe:
        m = (t["team_id"] == ekipa) & (t["competition_id"] == liga)
        redni = m & (t["delez_minut"] >= REDNI)
        for g, n in NORMA.items():
            stevilo = int((redni & (t["skupina"] == g)).sum())
            if stevilo < n:
                izid.append((ekipa, liga, g, "tanka", None, float(stevilo)))
        for i in np.flatnonzero(m):
            pid, g = int(t["player_id"][i]), t["skupina"][i]
            if t["delez_golov"][i] >= 0.4 and t["ekipa_goli"][i] >= 5:
                izid.append((ekipa, liga, g, "odvisnost", pid, float(t["delez_golov"][i])))
            if t["trend_minut"][i] <= -0.3 and t["delez_minut"][i] - t["trend_minut"][i] >= REDNI:
                izid.append((ekipa, liga, g, "padajoce_minute", pid, float(t["trend_minut"][i])))
            if g in meja_kartonov and t["kartoni_90"][i] > meja_kartonov[g]:
                izid.append((ekipa, liga, g, "disciplina", pid, float(t["kartoni_90"][i])))
        prejeti = {g: float(t["prejeti_ref_90"][redni & (t["skupina"] == g)].mean())
                   for g in ("DEF", "MID", "FWD") if (redni & (t["skupina"] == g)).any()}
        if prejeti:
            g = max(prejeti, key=prejeti.get)
            izid.append((ekipa, liga, g, "prejeti", None, prejeti[g]))
    return izid
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_vrzeli.py`
Expected: PASS — `1 passed`.

- [ ] **Step 5: Commit.**

```bash
git add scout/stroj/stroj/vrzeli.py scout/stroj/tests/test_vrzeli.py
git commit -m "feat(scout): vrzeli v kadru kluba" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Backtest proti naivni osnovi

**Files:**
- Create: `scout/stroj/stroj/backtest.py`
- Test: `scout/stroj/tests/test_backtest.py`

**Interfaces:**
- Consumes: `prilagodi`, `MIN_MINUT` (Task 5), `izracunaj` (Task 6), `projekcija` (Task 7), `izberi` (Task 2)
- Produces: `PRAG = 0.15`, `MIN_PRESTOPOV = 200`; `backtest(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float], ciljno_leto: int) -> dict` s ključi `ciljno_leto, n, n_prestopi, mae_model, mae_naivno, mae_brez_moci, mae_model_prestopi, mae_naivno_prestopi, mae_brez_moci_prestopi, izboljsava_prestopi, izboljsava_moci, stanje, prestal`; `stanje` ∈ `premalo podatkov` / `padel` / `prestal` (vrednosti JSON: float/int/bool/str/None)

Brez puščanja: moč lig se prilega le na sezonah pred ciljno; napoved = `projekcija(goli_ref_90 lani, moč lige v ciljni sezoni)`; naivno = lanski surovi goli na 90; ablacija `brez_moci` = isti kazalniki z močjo 0 povsod (le krčenje), da se vidi, koliko doda moč lig; MAE utežen z minutami ciljne sezone. Prestal = ≥ 200 parov prestopnikov in izboljšava proti naivni ≥ 15 % in model boljši od ablacije.

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_backtest.py`:

```python
import numpy as np
from pomoc import sezone

from stroj.backtest import backtest


def _sinteticno(oseb: int = 900):
    rng = np.random.default_rng(7)
    prava = {1: 0.0, 2: 0.6, 3: 1.2}
    vrstice = []
    for i in range(oseb):
        sposobnost = rng.normal(0, 0.3)
        liga = int(rng.integers(1, 4))
        for leto in (2023, 2024, 2025):
            if rng.random() < 0.5:
                liga = int(rng.integers(1, 4))
            vrstice.append((f"r1:{i}", liga, leto, int(rng.poisson(np.exp(sposobnost - prava[liga]) * 20))))
    oseba, liga, leto, goli = (list(x) for x in zip(*vrstice))
    n = len(oseba)
    s = sezone(n, oseba=oseba, competition_id=liga, leto=leto, goli_np=goli, minute=[1800] * n,
               min_on=[1800] * n, ekipa_minute=[1800] * n, ekipa_min_zmin=[1800] * n)
    lige = {"id": np.array([1, 2, 3]), "slug": np.array(["x-1", "x-2", "x-3"], dtype=object),
            "name": np.array([None] * 3, dtype=object), "zveza": np.array([None] * 3, dtype=object),
            "country_id": np.array([1, 1, 1])}
    return s, lige


def test_premaga_naivno_in_ablacijo_pri_prestopih():
    s, lige = _sinteticno()
    rez = backtest(s, lige, {}, 2025)
    assert rez["n_prestopi"] >= 200
    assert rez["mae_model_prestopi"] < min(rez["mae_brez_moci_prestopi"], rez["mae_naivno_prestopi"])
    assert rez["stanje"] == "prestal" and rez["prestal"] is True


def test_premalo_prestopov_ni_prestal():
    s, lige = _sinteticno(300)
    rez = backtest(s, lige, {}, 2025)
    assert 0 < rez["n_prestopi"] < 200
    assert rez["stanje"] == "premalo podatkov" and rez["prestal"] is False


def test_brez_parov():
    s, lige = _sinteticno()
    assert backtest(s, lige, {}, 2030) == {"ciljno_leto": 2030, "n": 0, "n_prestopi": 0, "izboljsava_prestopi": None,
                                           "izboljsava_moci": None, "stanje": "premalo podatkov", "prestal": False}
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_backtest.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.backtest'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/backtest.py`:

```python
"""Backtest: napoved golov brez 11 m na 90 v naslednji sezoni proti naivni
osnovi (lanski učinek) in proti ablaciji brez moči lig; pogoj faze 1 velja za
igralce, ki so zamenjali ligo."""
import numpy as np

from stroj import Tabela, izberi
from stroj.indeks import projekcija
from stroj.kazalniki import izracunaj
from stroj.moc_lig import MIN_MINUT, prilagodi

PRAG = 0.15
MIN_PRESTOPOV = 200


def _glavne(t: Tabela, leto: int) -> dict:
    """Za vsako osebo vrstica z največ minutami v sezoni (le ≥ MIN_MINUT)."""
    izid: dict = {}
    for i in np.flatnonzero((t["leto"] == leto) & (t["minute"] >= MIN_MINUT)).tolist():
        o = t["oseba"][i]
        if o not in izid or t["minute"][i] > t["minute"][izid[o]]:
            izid[o] = i
    return izid


def _mae(napoved: np.ndarray, dejansko: np.ndarray, utez: np.ndarray, m: np.ndarray) -> float | None:
    return float(np.average(np.abs(napoved[m] - dejansko[m]), weights=utez[m])) if m.any() else None


def backtest(s: Tabela, lige: Tabela, elo: dict[tuple[int, int, int], float], ciljno_leto: int) -> dict:
    ucna = izberi(s, s["leto"] < ciljno_leto)
    moc, koef = prilagodi(ucna, lige, elo)
    k = izracunaj(ucna, moc, elo, koef)
    k0 = izracunaj(ucna, {}, elo, koef)  # ablacija: moč lig 0 povsod, le krčenje
    prej, potem = _glavne(k, ciljno_leto - 1), _glavne(s, ciljno_leto)
    pari = [(prej[o], potem[o]) for o in prej if o in potem]
    rez: dict = {"ciljno_leto": ciljno_leto, "n": len(pari), "n_prestopi": 0, "izboljsava_prestopi": None,
                 "izboljsava_moci": None, "stanje": "premalo podatkov", "prestal": False}
    if not pari:
        return rez
    i, j = (np.array(x) for x in zip(*pari))
    cilj = s["competition_id"][j]
    model = projekcija(k["goli_ref_90"][i], [moc.get(l, (0.0,))[0] for l in cilj.tolist()])
    brez_moci = k0["goli_ref_90"][i]
    naivno = ucna["goli_np"][i] / ucna["minute"][i] * 90
    dejansko = s["goli_np"][j] / s["minute"][j] * 90
    utez = s["minute"][j].astype(float)
    prestop = ucna["competition_id"][i] != cilj
    vsi = np.ones(len(i), dtype=bool)
    for ime, napoved in (("model", model), ("naivno", naivno), ("brez_moci", brez_moci)):
        rez[f"mae_{ime}"] = _mae(napoved, dejansko, utez, vsi)
        rez[f"mae_{ime}_prestopi"] = _mae(napoved, dejansko, utez, prestop)
    rez["n_prestopi"] = int(prestop.sum())
    if rez["n_prestopi"] < MIN_PRESTOPOV:
        return rez
    rez["izboljsava_prestopi"] = 1 - rez["mae_model_prestopi"] / max(rez["mae_naivno_prestopi"], 1e-12)
    rez["izboljsava_moci"] = 1 - rez["mae_model_prestopi"] / max(rez["mae_brez_moci_prestopi"], 1e-12)
    rez["prestal"] = bool(rez["izboljsava_prestopi"] >= PRAG and rez["izboljsava_moci"] > 0)
    rez["stanje"] = "prestal" if rez["prestal"] else "padel"
    return rez
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_backtest.py`
Expected: PASS — `3 passed`.

- [ ] **Step 5: Commit.**

```bash
git add scout/stroj/stroj/backtest.py scout/stroj/tests/test_backtest.py
git commit -m "feat(scout): backtest naslednje sezone proti naivni osnovi" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Pisanje nove različice modela

**Files:**
- Create: `scout/stroj/stroj/pisanje.py`
- Modify (test): `scout/stroj/tests/test_baza.py`

**Interfaces:**
- Consumes: tabele iz Task 1
- Produces: `STOLPCI: dict[str, list[str]]` (vrstni red stolpcev za vsako `scout.*` tabelo, brez `model_id`); `zapisi(conn: psycopg.Connection, model: dict, vrstice: dict[str, list[tuple]]) -> int` — `model` ima `leto: int, backtest: dict, parametri: dict, objavljen: bool`; vrne `scout.modeli.id`. Ena transakcija (v odprti transakciji savepoint); NaN → NULL; ohrani zadnje 3 objavljene + trenutnega.

- [ ] **Step 1: Napiši padajoči test.** Na vrh `scout/stroj/tests/test_baza.py` dodaj uvoza:

```python
from datetime import datetime, timezone

from stroj.pisanje import zapisi
```

in na konec datoteke:

```python
def test_zapisi_in_obrezi(conn):
    vrstice = {
        "lige_moc": [(-914001, 0.1, "model", 25, datetime.now(timezone.utc))],
        "ekipe_elo": [(-914001, -914001, 2098, 1510.0)],
        "kazalniki": [(-914001, -914001, "2098/99", 2098, -914001, "FWD", 90, 1.0, 1.0, 1.0, 0.5, 0.5, 1,
                       0.1, 1.0, 0.0, 0.0, 0.0, 1.0, float("nan"), float("nan"), 0.05)],
        "indeks": [(-914001, "FWD", 0.7, 100.0, 0.05)],
        "vektorji": [(-914001, "FWD", [0.1, 0.2], [-914002], [0.9])],
        "vrzeli": [(-914001, -914001, "DEF", "tanka", None, 1.0)],
    }
    model = {"leto": 2098, "backtest": {"n": 0, "prestal": False}, "parametri": {"elo_koef": 0.2}, "objavljen": False}
    prvi = zapisi(conn, model, vrstice)
    assert conn.execute("select count(*) from scout.kazalniki where model_id = %s and trend_minut is null",
                        (prvi,)).fetchone()[0] == 1
    for _ in range(3):
        zadnji = zapisi(conn, model | {"objavljen": True}, vrstice)
    ostali = [r[0] for r in conn.execute("select id from scout.modeli where id >= %s order by id", (prvi,))]
    assert prvi not in ostali and zadnji in ostali and len(ostali) == 3
    assert conn.execute("select count(*) from scout.vrzeli where model_id = %s", (prvi,)).fetchone()[0] == 0
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_baza.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.pisanje'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/pisanje.py`:

```python
"""Nova različica modela: vse tabele v eni transakciji, vmesnik nikoli ne
vidi napol izračunanih števil (spec 4)."""
import math

import psycopg
from psycopg.types.json import Jsonb

STOLPCI = {
    "lige_moc": ["competition_id", "moc", "vir", "prestopov", "izracunano_at"],
    "ekipe_elo": ["team_id", "competition_id", "leto", "elo"],
    "kazalniki": ["player_id", "competition_id", "sezona", "leto", "team_id", "skupina", "minute",
                  "delez_minut", "zacetki_delez", "cele_delez", "goli_ref_90", "delez_golov", "enajstm",
                  "onoff_ref_90", "prejeti_ref_90", "ciste_delez", "kartoni_90", "vratar_ref_90",
                  "stalnost", "trend_minut", "prehod_ravni", "zaupanje"],
    "indeks": ["player_id", "skupina", "indeks", "percentil", "zaupanje"],
    "vektorji": ["player_id", "skupina", "vektor", "podobni", "podobnost"],
    "vrzeli": ["team_id", "competition_id", "skupina", "vrsta", "player_id", "vrednost"],
}
OHRANI_OBJAVLJENIH = 3


def _vrednost(v):
    return None if isinstance(v, float) and math.isnan(v) else v


def zapisi(conn: psycopg.Connection, model: dict, vrstice: dict[str, list[tuple]]) -> int:
    with conn.transaction():
        model_id = conn.execute(
            "insert into scout.modeli (leto, backtest, parametri, objavljen) values (%s, %s, %s, %s) returning id",
            (model["leto"], Jsonb(model["backtest"]), Jsonb(model["parametri"]), model["objavljen"]),
        ).fetchone()[0]
        with conn.cursor() as cur:
            for tabela, stolpci in STOLPCI.items():
                with cur.copy(f"copy scout.{tabela} (model_id, {', '.join(stolpci)}) from stdin") as cp:
                    for r in vrstice.get(tabela, []):
                        cp.write_row((model_id, *map(_vrednost, r)))
        conn.execute(
            """delete from scout.modeli where id <> %(id)s and id not in (
                 select id from scout.modeli where objavljen order by id desc limit %(n)s)""",
            {"id": model_id, "n": OHRANI_OBJAVLJENIH},
        )
    return model_id
```

- [ ] **Step 4: Poženi, mora uspeti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_baza.py`
Expected: PASS — `2 passed`.

- [ ] **Step 5: Commit.**

```bash
git add scout/stroj/stroj/pisanje.py scout/stroj/tests/test_baza.py
git commit -m "feat(scout): zapis nove razlicice modela v eni transakciji" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Zagon (`python -m stroj`)

**Files:**
- Create: `scout/stroj/stroj/__main__.py`
- Test: `scout/stroj/tests/test_zagon.py`

**Interfaces:**
- Consumes: `nalozi`, `elo`, `prilagodi`, `backtest`, `izracunaj`, `UTEZI`, `z_vrednosti`, `indeks`, `najblizji`, `vrzeli`, `STOLPCI`, `zapisi`, `izberi`
- Produces: `PAS = ZoneInfo("Europe/Ljubljana")`; `do_naslednjega(zdaj: datetime, ura: int = 11, minuta: int = 0) -> float`; `zagon(conn: psycopg.Connection, pisi: bool, sili_moc: bool) -> int | None`; `main(argv: list[str] | None = None) -> int`. CLI: `--pisi`, `--moc-lig`, `--zanka`; okolje `SCOUT_DB_URL`.

- [ ] **Step 1: Napiši padajoči test** `scout/stroj/tests/test_zagon.py`:

```python
from datetime import datetime

from stroj.__main__ import PAS, do_naslednjega


def test_do_naslednjega():
    assert do_naslednjega(datetime(2026, 10, 16, 4, 0, tzinfo=PAS)) == 25200
    assert do_naslednjega(datetime(2026, 10, 16, 12, 0, tzinfo=PAS)) == 82800
    # 25. 10. 2026 se ura premakne nazaj: do 11:00 je uro več
    assert do_naslednjega(datetime(2026, 10, 24, 12, 0, tzinfo=PAS)) == 86400
```

- [ ] **Step 2: Poženi, mora pasti.**

Run: `cd scout/stroj && .venv/bin/pytest -q tests/test_zagon.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'stroj.__main__'`.

- [ ] **Step 3: Implementacija** `scout/stroj/stroj/__main__.py`:

```python
"""Stroj SLFF Scout.

  python -m stroj                 izračun in izpis (backtest, prvih 10 vsake lige), brez pisanja
  python -m stroj --pisi          zapiše novo različico modela
  python -m stroj --moc-lig       moč lig in backtest zdaj (sicer enkrat na 7 dni)
  python -m stroj --zanka         delavec slff-scout: vsak dan ob 11:00 (po nočnih uvozih), piše
"""
import argparse
import os
import time
import traceback
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np
import psycopg

from stroj import Tabela, izberi
from stroj.backtest import backtest
from stroj.elo import elo
from stroj.indeks import UTEZI, indeks, z_vrednosti
from stroj.kazalniki import izracunaj
from stroj.moc_lig import prilagodi
from stroj.nalaganje import nalozi
from stroj.pisanje import STOLPCI, zapisi
from stroj.podobnost import najblizji
from stroj.vrzeli import vrzeli

PAS = ZoneInfo("Europe/Ljubljana")
TEDEN = timedelta(days=7)
SQL_PREJSNJI = """
select m.id, m.parametri, m.backtest, max(l.izracunano_at)
from scout.modeli m join scout.lige_moc l on l.model_id = m.id
group by m.id order by m.id desc limit 1
"""


def do_naslednjega(zdaj: datetime, ura: int = 11, minuta: int = 0) -> float:
    """Sekunde do naslednjega ura:minuta po stenski uri pasu `zdaj` (tudi ob premiku ure)."""
    cilj = zdaj.replace(hour=ura, minute=minuta, second=0, microsecond=0)
    if cilj <= zdaj:
        cilj += timedelta(days=1)
    return (cilj.astimezone(timezone.utc) - zdaj.astimezone(timezone.utc)).total_seconds()


def _pregled(conn: psycopg.Connection, t: Tabela, idx: np.ndarray) -> None:
    """Prvih 10 vsake lige za človeški pregled smiselnosti (spec 5)."""
    imena = dict(conn.execute(
        "select id, coalesce(full_name, last_name || ' ' || first_name) from public.players where id = any(%s)",
        (t["player_id"].tolist(),)).fetchall())
    for liga in sorted(set(t["competition_id"].tolist())):
        m = np.flatnonzero(t["competition_id"] == liga)
        prvi = m[np.argsort(-idx[m])][:10]
        print(f"liga {liga}: " + ", ".join(
            f"{imena.get(int(t['player_id'][i]), '?')} ({t['skupina'][i]} {idx[i]:.2f})" for i in prvi))


def zagon(conn: psycopg.Connection, pisi: bool, sili_moc: bool) -> int | None:
    conn.execute("set statement_timeout = 0")
    sezone, tekme, lige = nalozi(conn)
    elo_lig = elo(tekme)
    zdaj = datetime.now(PAS)
    prejsnji = conn.execute(SQL_PREJSNJI).fetchone()
    if sili_moc or prejsnji is None or zdaj - prejsnji[3] > TEDEN:
        moc, elo_koef = prilagodi(sezone, lige, elo_lig)
        bt = backtest(sezone, lige, elo_lig, int(sezone["leto"].max()) - 1)
        izracunano = zdaj
    else:
        moc = {l: (m, v, n) for l, m, v, n in conn.execute(
            "select competition_id, moc, vir, prestopov from scout.lige_moc where model_id = %s", (prejsnji[0],))}
        elo_koef, bt, izracunano = prejsnji[1]["elo_koef"], prejsnji[2], prejsnji[3]
    k = izracunaj(sezone, moc, elo_lig, elo_koef)

    drzava_lige = dict(zip(lige["id"].tolist(), lige["country_id"].tolist()))
    odprte = {d for d, st in zip(lige["country_id"].tolist(), lige["stanje"].tolist()) if st != "zaprto"}
    aktivne = {l for l, a in zip(lige["id"].tolist(), lige["active"].tolist()) if a and drzava_lige[l] in odprte}
    tekoca: dict[int, int] = {}
    for l, y in zip(k["competition_id"].tolist(), k["leto"].tolist()):
        tekoca[l] = max(tekoca.get(l, y), y)
    v_odprti = np.array([d in odprte for d in k["country_id"].tolist()], dtype=bool)
    izbrani = v_odprti & np.array([
        l in aktivne and y == tekoca[l] and g in UTEZI
        for l, y, g in zip(k["competition_id"].tolist(), k["leto"].tolist(), k["skupina"].tolist())], dtype=bool)
    t = izberi(k, izbrani)
    Z = z_vrednosti(t)
    idx, pct = indeks(t, Z)
    vektorji = []
    for d in set(t["country_id"].tolist()):
        for g in UTEZI:
            m = np.flatnonzero((t["country_id"] == d) & (t["skupina"] == g))
            if len(m) < 2:
                continue
            sosedi, podobnost = najblizji(Z[m])
            for i, s_i, p_i in zip(m.tolist(), sosedi, podobnost):
                vektorji.append((int(t["player_id"][i]), g, Z[i].tolist(), t["player_id"][m[s_i]].tolist(), p_i.tolist()))
    kk = izberi(k, v_odprti)
    vrstice = {
        "lige_moc": [(l, m, v, n, izracunano) for l, (m, v, n) in moc.items()],
        "ekipe_elo": [(e, l, y, r) for (l, y, e), r in elo_lig.items() if l in aktivne and y == tekoca.get(l)],
        "kazalniki": list(zip(*(kk[c].tolist() for c in STOLPCI["kazalniki"]))),
        "indeks": list(zip(t["player_id"].tolist(), t["skupina"].tolist(), idx.tolist(), pct.tolist(), t["zaupanje"].tolist())),
        "vektorji": vektorji,
        "vrzeli": vrzeli(t),
    }
    print(f"Stroj: {len(sezone['player_id'])} vrstic, {len(t['player_id'])} izbranih, backtest {bt}", flush=True)
    if not pisi:
        _pregled(conn, t, idx)
        return None
    model_id = zapisi(conn, {"leto": int(sezone["leto"].max()), "backtest": bt,
                             "parametri": {"elo_koef": elo_koef}, "objavljen": bool(bt.get("prestal"))}, vrstice)
    print(f"Stroj: zapisan model {model_id} (objavljen: {bool(bt.get('prestal'))})", flush=True)
    return model_id


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m stroj", description="SLFF Scout: moč lig, kazalniki, indeks, podobni, vrzeli.")
    p.add_argument("--pisi", action="store_true", help="zapiši novo različico modela (brez: le izpis)")
    p.add_argument("--moc-lig", action="store_true", help="moč lig in backtest zdaj (sicer enkrat na 7 dni)")
    p.add_argument("--zanka", action="store_true", help="vsak dan ob 11:00 (delavec slff-scout), piše")
    a = p.parse_args(argv)
    url = os.environ["SCOUT_DB_URL"]
    if a.zanka:
        print("Stroj: zanka teče (vsak dan ob 11:00).", flush=True)
    while True:
        if a.zanka:
            time.sleep(do_naslednjega(datetime.now(PAS)))
        try:
            with psycopg.connect(url, autocommit=True) as conn:
                zagon(conn, a.pisi or a.zanka, a.moc_lig)
        except Exception:
            if not a.zanka:
                raise
            traceback.print_exc()
        if not a.zanka:
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Poženi teste in suh zagon proti lokalni bazi.**

Run: `cd scout/stroj && .venv/bin/pytest -q && SCOUT_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres .venv/bin/python -m stroj --moc-lig`
(lokalno kot postgres, ker vloga `scout_stroj` nima gesla; njene pravice preveri `test_baza.py` s `set role`)
Expected: PASS — vsi testi zeleni (`26 passed`); zagon izpiše `Stroj: … vrstic, … izbranih, backtest {...}` in vrstice `liga <id>: …` (na lokalni bazi s testnim okoljem; prazna baza nima sezon in ni za ta korak).

- [ ] **Step 5: Vrh pomnilnika in načrt poizvedbe na produkciji (le branje).** Isti tunel in `SCOUT_PROD_URL` kot v Task 5. Delavec ima `mem_limit: 1g`; vrh mora ostati pod 700 MB.

Run:
```bash
cd scout/stroj && .venv/bin/python - <<'EOF'
import os, resource, sys, time
import numpy as np
import psycopg
from stroj import izberi
from stroj.backtest import backtest
from stroj.elo import elo
from stroj.indeks import UTEZI, indeks, z_vrednosti
from stroj.kazalniki import izracunaj
from stroj.moc_lig import prilagodi
from stroj.nalaganje import SQL_SEZONE, SQL_TEKME, v_stolpce
from stroj.vrzeli import vrzeli

LIGE = """select c.id, c.slug, c.name, f.code as zveza, c.country_id from public.competitions c
left join public.federations f on f.id = c.federation_id
where not public.je_mladinski_slug(c.slug) order by c.id"""
with psycopg.connect(os.environ["SCOUT_PROD_URL"], autocommit=True) as conn:
    for vrstica in conn.execute("explain (analyze, buffers) " + SQL_SEZONE).fetchall():
        print(vrstica[0])
    t0 = time.monotonic()
    s, tekme, lige = v_stolpce(conn, SQL_SEZONE), v_stolpce(conn, SQL_TEKME), v_stolpce(conn, LIGE)
e = elo(tekme)
moc, koef = prilagodi(s, lige, e)
bt = backtest(s, lige, e, int(s["leto"].max()) - 1)
k = izracunaj(s, moc, e, koef)
izbrani = np.array([g in UTEZI for g in k["skupina"].tolist()]) & (k["leto"] == k["leto"].max())
t = izberi(k, izbrani)
indeks(t, z_vrednosti(t))
vrzeli(t)
vrh = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1 if sys.platform == "darwin" else 1 / 1024)
print(f"cas {time.monotonic() - t0:.0f} s, vrh RSS {vrh / 2**20:.0f} MB, backtest {bt}")
EOF
```
Expected: `EXPLAIN` brez `SubPlan` po nastopu (gol razlika je `Hash Join` + `HashAggregate`), skupni čas poizvedbe pod 10 min; zadnja vrstica `vrh RSS` pod 700 MB. Če ne, ustavi in javi (ne objavi delavca), preden se dvigne `mem_limit` ali razreže branje po državah.

- [ ] **Step 6: Commit.**

```bash
git add scout/stroj/stroj/__main__.py scout/stroj/tests/test_zagon.py
git commit -m "feat(scout): zagon stroja, zanka ob 11:00 in pregled" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Delavec `slff-scout` na strežniku

**Files:**
- Create: `scripts/hetzner/scout/Dockerfile`, `scripts/hetzner/scout/docker-compose.yml`, `scripts/hetzner/objavi-scout.sh`

**Interfaces:**
- Consumes: `python -m stroj --zanka` (Task 12); na VM `/opt/slff-scout/.env` z `SCOUT_DB_URL`
- Produces: kontejner `slff-scout` (`restart: unless-stopped`, `network_mode: host`); `scripts/hetzner/objavi-scout.sh` brez argumentov

- [ ] **Step 1: Preverba, ki pade.**

Run: `bash -n scripts/hetzner/objavi-scout.sh`
Expected: FAIL — `No such file or directory`.

- [ ] **Step 2: Datoteke.** `scripts/hetzner/scout/Dockerfile`:

```dockerfile
# Delavec slff-scout: nočni stroj Scout (scout/stroj/). Sliko zgradi
# scripts/hetzner/objavi-scout.sh na strežniku iz app/ (brez testov).
FROM python:3.12-slim
COPY app/ /app/
RUN pip install --no-cache-dir /app
USER nobody
CMD ["python", "-m", "stroj", "--zanka"]
```

`scripts/hetzner/scout/docker-compose.yml`:

```yaml
# Stroj SLFF Scout (python -m stroj --zanka) na VM: /opt/slff-scout/
#   docker-compose.yml   ta datoteka
#   Dockerfile           python:3.12-slim + paket iz app/
#   .env                 SCOUT_DB_URL=postgresql://scout_stroj:<geslo vloge>@127.0.0.1:5432/postgres
#                        (chmod 600, ustvari lastnik, NI v gitu)
#   app/                 scout/stroj/ brez testov (objavi-scout.sh)
# Objava: scripts/hetzner/objavi-scout.sh. CI tega ne objavi.
# Dnevnik: docker logs slff-scout. Preizkus brez pisanja:
#   docker compose run --rm scout python -m stroj
services:
  scout:
    build: .
    image: slff-scout:1
    container_name: slff-scout
    restart: unless-stopped
    init: true
    # Gostiteljevo omrežje: Postgres posluša na 127.0.0.1:5432 (docker-compose.slff.yml).
    network_mode: host
    environment:
      TZ: Europe/Ljubljana
      PYTHONUNBUFFERED: "1"
    env_file: .env
    # Strežnik CPX22 (4 GB) nosi še bazo, Supabase in slff-objave (1536m); vrh izmeri Task 12.
    mem_limit: 1g
    cpus: 1.0
```

`scripts/hetzner/objavi-scout.sh` (nato `chmod +x`):

```bash
#!/usr/bin/env bash
# Objavi stroj Scout (scout/stroj/, scripts/hetzner/scout/) na VM in (znova)
# zažene delavca slff-scout.
#
#   scripts/hetzner/objavi-scout.sh
#
# Iz posodobljenega main. Prejšnjo različico shrani v /opt/slff/backup-scout/<čas>/.
# /opt/slff-scout/.env (SCOUT_DB_URL) ustvari lastnik enkrat (glej docs/scout.md);
# skripta ga ne piše in ne bere.
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ -n $(git status --porcelain -- scout/stroj scripts/hetzner/scout) ]]; then
  echo "Uncommitted changes in the Scout engine; publish only what is on main."; exit 1
fi
CILJ=/opt/slff-scout
CAS=$(date +%Y%m%d-%H%M%S)
ssh SLFF "test -f $CILJ/.env || { echo 'Manjka $CILJ/.env (ustvari ga lastnik, glej docs/scout.md)'; exit 1; }; \
  mkdir -p /opt/slff/backup-scout && { [ -d $CILJ/app ] && cp -a $CILJ/app /opt/slff/backup-scout/$CAS || true; } \
  && rm -rf $CILJ/app.novo && mkdir -p $CILJ/app.novo"
rsync -a --exclude .venv --exclude tests --exclude __pycache__ --exclude .pytest_cache --exclude '*.egg-info' \
  scout/stroj/ "SLFF:$CILJ/app.novo/"
rsync -a scripts/hetzner/scout/docker-compose.yml scripts/hetzner/scout/Dockerfile "SLFF:$CILJ/"
ssh SLFF "cd $CILJ && rm -rf app.staro && { [ -d app ] && mv app app.staro || true; } && mv app.novo app \
  && docker compose build -q && docker compose run --rm --no-deps scout python -m stroj --help >/dev/null \
  && docker compose up -d --force-recreate >/dev/null && sleep 3 && docker logs --tail 5 slff-scout"
```

- [ ] **Step 3: Preveri skripto, compose in sliko lokalno.**

Run:
```bash
chmod +x scripts/hetzner/objavi-scout.sh && bash -n scripts/hetzner/objavi-scout.sh \
  && T=$(mktemp -d) && rsync -a --exclude .venv --exclude tests --exclude __pycache__ --exclude .pytest_cache --exclude '*.egg-info' scout/stroj/ "$T/app/" \
  && cp scripts/hetzner/scout/Dockerfile scripts/hetzner/scout/docker-compose.yml "$T/" && touch "$T/.env" \
  && docker compose -f "$T/docker-compose.yml" config -q && docker build -q -t slff-scout:preizkus "$T" \
  && docker run --rm slff-scout:preizkus python -m stroj --help
```
Expected: PASS — izpis pomoči `usage: python -m stroj [-h] [--pisi] [--moc-lig] [--zanka]`.

- [ ] **Step 4: Commit.**

```bash
git add scripts/hetzner/scout/Dockerfile scripts/hetzner/scout/docker-compose.yml scripts/hetzner/objavi-scout.sh
git commit -m "feat(scout): delavec slff-scout in skripta za objavo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Dokumentacija

**Files:**
- Create: `docs/scout.md`
- Modify: `CLAUDE.md`, `README.md`, `docs/podatkovni-model.md`

**Interfaces:**
- Consumes: vse zgoraj
- Produces: `docs/scout.md` (vir resnice za stroj); kazalec v `CLAUDE.md`

- [ ] **Step 1: Preverba, ki pade.**

Run: `test -f docs/scout.md && grep -q "scout_skrit" docs/podatkovni-model.md && grep -q "docs/scout.md" CLAUDE.md`
Expected: FAIL — izhod 1.

- [ ] **Step 2: Ustvari `docs/scout.md`:**

````markdown
# SLFF Scout: analitični stroj (faza 1)

Spec: `docs/superpowers/specs/2026-10-16-scout-design.md`. Načrt:
`docs/superpowers/plans/2026-10-16-scout-faza1-stroj.md`.

Nočni delavec `slff-scout` (Python 3.12, `scout/stroj/`) iz zapisnikov
izračuna moč lig, Elo klubov, kazalnike igralcev, indeks po poziciji,
podobne igralce in vrzeli v kadrih. Vse zapiše v zaprto shemo `scout` kot
novo različico (`scout.modeli`) v eni transakciji. Vmesnika (faza 3) še ni.

## Tok

1. `nalaganje.py`: en SQL sešteje nastope po (igralec, sezona) z on/off
   (gol razlika ekipe na igrišču iz `minute_on/minute_off` in `goals.minute`),
   tekme za Elo in lige.
2. Izločanje: mladinske lige (`je_mladinski_slug`); osebe z vrstico v
   mladinski ligi (dokler faza 2 ne prinese letnice), `scout_skrit`,
   anonimizirani. Oseba = `reg_st` znotraj vira (`competitions.source`),
   sicer ime + klub v državi.
3. `elo.py`: Elo vsake (liga, sezona) od 1500, kontekst ekipe.
4. `moc_lig.py` (enkrat na 7 dni): fiksni učinki `log goli/90 = sposobnost
   osebe + liga + Elo` (izmenično odštevanje povprečij v numpy) na igralcih,
   ki so igrali v več ligah (≥ 450 min, liga z ≥ 20 vrsticami prestopnikov). Lige brez modela dobijo moč iz piramide
   (`ravni.py` = prepis `ravenLige`), sicer mediano države, sicer 0.
   `scout.lige_moc.vir` pove, od kod.
5. `kazalniki.py`: deleži minut in začetkov, stalnost čez sezone, goli brez
   11 m na 90, delež golov ekipe, on/off, prejeti, vratar proti povprečju
   ekipe, čiste mreže, kartoni; stopnje skrčene proti
   povprečju lige in pozicije (900 navideznih minut), napad × `exp(moc)`,
   prejeti × `exp(-moc)`; zaupanje iz minut, šifre in vira moči.
6. `indeks.py`, `podobnost.py`, `vrzeli.py`: le odprte države, aktivne lige,
   tekoča sezona, znana pozicija.
7. `backtest.py` (z močjo lig): napove gole na 90 v zadnji zaključeni sezoni
   iz prejšnjih; primerja z naivno osnovo in z ablacijo brez moči lig.
   `stanje`: `premalo podatkov` (pod 200 parov prestopnikov), `padel` ali
   `prestal` (≥ 15 % bolje od naivne in bolje od ablacije) = `objavljen`.

Projekcija na raven kluba: `vrednost_ref * exp(-moc_lige_kluba)`.

## Tabele (`scout`)

`drzave` (zaprto/pilot/odprto, SI odprta), `modeli` (različica, backtest,
`elo_koef`, `objavljen`), `lige_moc`, `ekipe_elo`, `kazalniki` (vse sezone
odprtih držav), `indeks`, `vektorji` (z-vektor in 20 najbližjih), `vrzeli`.
Ohranijo se zadnji trije objavljeni modeli in trenutni. Brskalnik sheme ne
bere; funkcije faze 3 naj berejo zadnji `objavljen` model in ob branju še
enkrat preverijo `scout_skrit` in `anonimiziran_at`.

## Ukazi (lokalno)

```bash
cd scout/stroj
python3.12 -m venv .venv && .venv/bin/pip install -e '.[test]'   # enkrat
.venv/bin/pytest -q                                              # testi (test_baza rabi npx supabase start)
SCOUT_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres .venv/bin/python -m stroj --moc-lig
```

Brez `--pisi` stroj le izpiše backtest in prvih 10 vsake lige (pregled
smiselnosti); `--pisi` zapiše model.

## Objava (strežnik)

CI delavca ne objavi. Migracija ustvari vlogo `scout_stroj` brez gesla
(bere zapisnike, piše le `scout`). Enkrat ji nastavi geslo (ne v git, ne v
zgodovino lupine: `read -s`) in ustvari `/opt/slff-scout/.env` (chmod 600):

```bash
read -rs GESLO && ssh slff "docker exec -i supabase-db psql -U supabase_admin -d postgres" \
  <<< "alter role scout_stroj password '$GESLO';"
# /opt/slff-scout/.env:
SCOUT_DB_URL=postgresql://scout_stroj:<to geslo>@127.0.0.1:5432/postgres
```

Nato iz čistega main `scripts/hetzner/objavi-scout.sh`. Prvi zagon ročno:

```bash
ssh slff 'cd /opt/slff-scout && docker compose run --rm scout python -m stroj --moc-lig'          # pregled
ssh slff 'cd /opt/slff-scout && docker compose run --rm scout python -m stroj --moc-lig --pisi'   # zapis
```

Dnevnik: `docker logs slff-scout`. Delavec teče ob 11:00: nočni uvozi med
tednom začnejo ob 07:17 in tečejo do 190 minut. `mem_limit: 1g` (strežnik
ima 4 GB); branje gre prek strežniškega kazalca v kosih.

## Omejitve

- On/off je le na tekmah, kjer imajo vsi goli minuto. Minute na igrišču
  (`least(minute_off, 90) - minute_on`) in goli na igrišču imajo isto okno.
  Viri brez minut menjav pustijo `minute_on 0 / minute_off 90`: igralec velja
  za ves čas na igrišču, minut brez njega je malo in on/off se skrči proti 0
  (ne napihne se).
- Slovenija nima ravni v `ravenLige`: moč slovenskih lig je iz modela
  (prestopi med ligami v Sloveniji so po imenu in klubu, torej večinoma
  napredovanja in izpadi klubov), sicer mediana države.
- Prestop med klubi brez šifre (SI) ni povezan: oseba je ime + klub.
- Moč nasprotnika posamezne tekme ni utežena; kontekst ekipe je Elo lastne ekipe.
- Spec predvideva MixedLM (statsmodels); stroj uporablja fiksne učinke oseba
  + liga v numpy (odločitev pregleda: brez težkih odvisnosti, linearen čas).
- Sezona je `left(season, 4)` (koledarske lige: isto leto kot jesenski del).
````

- [ ] **Step 3: `CLAUDE.md`.** Vstavi tik pred `## Poti`:

```markdown
## SLFF Scout (stroj)

Delavec `slff-scout` (Python 3.12, `scout/stroj/`) vsak dan ob 11:00 (po nočnih uvozih) izračuna
moč lig (tedensko), Elo, kazalnike, indeks, podobne in vrzeli ter jih zapiše
v zaprto shemo `scout` kot novo različico (`scout.modeli`) v eni transakciji.
Podrobnosti (izločanje, ukazi, objava, omejitve): `docs/scout.md`.
Bistvo: **mladinske lige, osebe z vrstico v mladinski ligi, `scout_skrit` in
anonimizirani ne vstopijo v izračun**; shema `scout` ni dostopna `anon` in
`authenticated` (brale jo bodo SECURITY DEFINER funkcije faze 3), delavec se
prijavi kot vloga `scout_stroj` (geslo ročno, nikoli v git); država se
odpre v `scout.drzave`. `ravenLige` ima prepis v `scout/stroj/stroj/ravni.py`
(test enakosti). CI ga ne objavi (`scripts/hetzner/objavi-scout.sh`); testi:
`cd scout/stroj && .venv/bin/pytest -q`.
```

- [ ] **Step 4: `README.md`.** V tabeli podatkovnega modela zamenjaj vrstico `players`:

```markdown
| `players` | Igralci ene lige (cena, pozicija, vir pozicije); ista oseba je v obeh ligah dve vrstici; `anonimiziran_at` = ime skrito (GDPR); `scout_skrit` = ugovor proti Scoutu |
```

in tik pod vrstico `anonimizirani_igralci` dodaj:

```markdown
| `scout.*` | Rezultati nočnega stroja Scout (`drzave`, `modeli`, `lige_moc`, `ekipe_elo`, `kazalniki`, `indeks`, `vektorji`, `vrzeli`); zaprta shema, glej `docs/scout.md` |
```

- [ ] **Step 5: `docs/podatkovni-model.md`.** Takoj za odstavkom o `players.anonimiziran_at` (konča se z "`anonimizacijski_kljuc` (smoke in `test:varnost`)") dodaj alinejo:

```markdown
- `players.scout_skrit` → ugovor proti Scoutu (migracija 20261016140100):
  stroj izloči vso osebo (ista šifra ali ime in klub v državi), fantasy igra
  ostane. Shema `scout` je zaprta (brez pravic za `anon`/`authenticated`,
  RLS brez politik); piše jo nočni delavec `slff-scout`, `scout.drzave` pove,
  katere države so odprte. Podrobnosti: `docs/scout.md`
```

- [ ] **Step 6: Preverba.**

Run: `test -f docs/scout.md && grep -q "scout_skrit" docs/podatkovni-model.md && grep -q "docs/scout.md" CLAUDE.md && grep -q "scout_skrit" README.md && echo OK`
Expected: PASS — `OK`.

- [ ] **Step 7: Commit.**

```bash
git add docs/scout.md CLAUDE.md README.md docs/podatkovni-model.md
git commit -m "docs(scout): stroj, ukazi, objava in omejitve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Po vseh nalogah

- [ ] `cd scout/stroj && .venv/bin/pytest -q` (vse zeleno), `npm run test:varnost`, `npm run typecheck`, `npm run smoke`.
- [ ] Neodvisen pregled PR (spec 5). Po združitvi: CI uveljavi migracijo; lastnik nastavi geslo vloge `scout_stroj` in ustvari `/opt/slff-scout/.env` (docs/scout.md), `scripts/hetzner/objavi-scout.sh`, ročni `--moc-lig` (pregled prvih 10) in `--moc-lig --pisi`; preveri `select backtest from scout.modeli order by id desc limit 1` — pogoj faze 1 je `stanje = 'prestal'` (≥ 200 parov prestopnikov, `izboljsava_prestopi >= 0.15`, `izboljsava_moci > 0`).
