# SLFF Scout faza 2: stran igralca Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Igralec s prevzetim profilom na slff.eu vklopi "odprt za prestop", vpiše letnico, želene regije in dovoli stik (privolitev, preklic kadarkoli, ob preklicu izbris), lahko ugovarja Scoutu; vsak drug igralec ugovarja po povezavi na vsaki javni strani igralca (razdelek Scout na `/legal`, mail na info@, admin vpiše). Seznam ugovornikov ni več javen, stroj spusti mladinca s prijavljeno polnoletno letnico.

**Architecture:** Ugovor se preseli iz javnega stolpca `players.scout_skrit` (stolpec gre proč v ločeni zadnji nalogi, ko na produkciji teče nov delavec) v zaprto tabelo `scout.ugovori` z zgoščenimi ključi osebe (država + ime, država + šifra), natanko kot `anonimizirani_igralci` (stroj ključe že računa). Privolitev gre v zaprto `scout.privolitve` (ne v `profil_igralca`, ker je ta javno berljiv). Brskalnik sheme `scout` ne vidi: vse gre prek SECURITY DEFINER RPC v `public`, ki preverijo `je_lastnik_profila`. Nekrivljen igralec ugovarja po obstoječi poti anonimizacije (info@ → Administracija → Igralec), brez nove tabele zahtevkov.

**Tech Stack:** PostgreSQL (Supabase, migracije), Python 3.12 (`scout/stroj`, psycopg, pytest), React + TypeScript (Vite), lasten i18n (`src/i18n`).

**Spec:** docs/superpowers/specs/2026-10-16-scout-design.md

## Global Constraints

- Veja: `feat/scout-faza2-igralec` iz `main`; en PR, commit na nalogo.
- Migracija: `supabase/migrations/20261016160100_scout_igralec.sql` (nova datoteka; obstoječih ne spreminjaj).
- Migracija 1 obstoječe ugovore prepiše v `scout.ugovori`, stolpec `players.scout_skrit` pa **ostane** (stari delavec ga bere do objave novega). Odstrani ga ločena migracija `supabase/migrations/20261017090100_scout_brez_stolpca.sql` v nalogi 10 (svoj PR, šele ko je nov delavec na produkciji uspešno tekel).
- Vrstni red objave: združitev → CI migrira (stari delavec še teče) → objava novega delavca → naloga 10.
- Ključ ugovora: `anonimizacijski_kljuc(country_id || '|' || full_name)` in `anonimizacijski_kljuc(country_id || '|reg|' || reg_st)`, enako kot `anonimiziraj_igralca` in stroj.
- `scout.privolitve` stolpci: `player_id` (glavna vrstica), `odprt_za_prestop`, `letnik`, `regije` (`bigint[]` id-jev `federations` iste države, največ 50), `kontakt_dovoljen`, `updated_at`.
- Letnica: obvezna, `1940 <= letnik <= extract(year from current_date) - 19` (polnoleten vse tekoče leto).
- Polnoleten za stroj: `letnik <= extract(year from current_date)::int - 19`.
- Stanje "skrit" za lastnika (`scout_moj_profil`, `scout_shrani_privolitev`) šteje le ugovore njegovih vrstic: `exists (select 1 from scout.ugovori where player_id = any(scout.vrstice_profila(p_player_id)))`. Stroj pa izloča po ključih (tudi soimenjake).
- `scout_stroj` bere `scout.ugovori` (politika `stroj`), `scout.privolitve` ne (le prek `scout.odrasle_vrstice()`).
- Ugovor velja v 14 dneh (besedilo na `/legal`); samopostrežni ugovor velja takoj.
- RPC (vse `security definer`, `set search_path = public`, `revoke all … from public, anon, authenticated`, `grant execute … to authenticated`): `scout_moj_profil(bigint)`, `scout_shrani_privolitev(bigint, boolean, int, bigint[], boolean)`, `scout_preklici_privolitev(bigint)`, `scout_ugovor(bigint, boolean)`, `admin_scout_skrij(bigint[])`.
- Notranje funkcije v `scout` (brez pravic za brskalnik): `scout.kljuci_vrstic(bigint[])`, `scout.vrstice_profila(bigint)`, `scout.je_skrit(bigint[])`, `scout.odrasle_vrstice()` (execute le `scout_stroj`).
- Brez nove poti: ni sprememb v `<Routes>`, Caddy `@ni_strani`/`@zasebne`, `PO_POTI`/`zabelezi_obisk`, `STRANI_LIGE`.
- i18n: vsak nov niz v vseh 14 jezikih `PRIPRAVLJENI`: sl, hr, sk, cs, hu, de, sr, ro, et, pl, es, lv, mk, en.
- V prevodih nobenih pomišljajev `—` ali `–` (smoke jih zavrne za cs, hu, de, sr, ro, et, lv, mk) in nobenih apostrofov v angleščini.
- Nizi: `igralci.scout.*` (17 ključev), `racun.pravno.scout*` (5 ključev), `racun.pravno.zadnjaSprememba` na 16. 10. 2026.
- Administracija ostane slovenska (brez i18n).
- Brez Scout vmesnika, Stripe in sporočil: `kontakt_dovoljen` se le hrani.
- Komponenta `ScoutIgralca` je poimenski izvoz (`export function`).
- SQL stroja se pred objavo izmeri na produkciji (branje, `rollback`), sprejemljivo pod 30 s.
- Commit sporočila: conventional, zadnja vrstica `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Structure

| datoteka | sprememba |
|---|---|
| `supabase/migrations/20261016160100_scout_igralec.sql` | nova: `scout.ugovori`, `scout.privolitve`, notranje funkcije, RPC, prenos ugovorov iz `players.scout_skrit` (stolpec ostane), `prevzem_odstrani_predstavitev` briše privolitev |
| `supabase/migrations/20261017090100_scout_brez_stolpca.sql` | naloga 10: odstrani `players.scout_skrit` |
| `supabase/tests/varnost.sql` | 9 politik, števci; nov blok faze 2; v nalogi 10 preverjanje brez stolpca |
| `scout/stroj/stroj/nalaganje.py` | `SQL_IZKLJUCENI`: ugovor iz `scout.ugovori`, izjema za polnoletnega mladinca |
| `scout/stroj/tests/test_baza.py` | fikstura brez `scout_skrit`, nov test mladinca z letnico |
| `src/lib/baza.types.ts` | pet novih funkcij; `scout_skrit` gre proč šele v nalogi 10 |
| `src/i18n/<14 jezikov>/igralci.ts` | blok `scout` |
| `src/i18n/<14 jezikov>/racun.ts` | `pravno.scout*`, `pravno.zadnjaSprememba` |
| `src/components/ScoutIgralca.tsx` | nova: privolitev in ugovor lastnika |
| `src/components/PrevzemIgralca.tsx` | izriše `ScoutIgralca` lastniku med urejanjem |
| `src/pages/Igralec.tsx` | povezava za ugovor na dnu strani |
| `src/pages/Pravno.tsx` | razdelek `#scout` |
| `src/pages/Administracija.tsx` | gumb "Skrij iz Scouta (ugovor)" z izbiro vrstic osebe |
| `scripts/smoke.jsx` | izris `ScoutIgralca` in `Pravno`, sidro `#scout` |
| `docs/scout.md`, `docs/podatkovni-model.md`, `CLAUDE.md` | opis faze 2 (naloga 8) |
| `README.md` | vrstica `players` brez `scout_skrit` (naloga 10) |

---

### Task 1: Migracija in varnostni testi

**Files:**
- Create: `supabase/migrations/20261016160100_scout_igralec.sql`
- Modify: `supabase/tests/varnost.sql`

**Interfaces:**
- Consumes: `public.je_lastnik_profila(bigint)`, `public.is_admin()`, `public.anonimizacijski_kljuc(text)`, `public.zahtevki_igralca`, `public.povezani_igralci`, `public.federations`, `scout.drzave`, vloga `scout_stroj`.
- Produces:
  - `scout.ugovori(player_id bigint, kljuc text, created_at timestamptz, primary key (player_id, kljuc))`
  - `scout.privolitve(player_id bigint pk, odprt_za_prestop boolean, letnik int, regije bigint[], kontakt_dovoljen boolean, updated_at timestamptz)`
  - `scout.kljuci_vrstic(p_ids bigint[]) returns table(player_id bigint, kljuc text)`
  - `scout.vrstice_profila(p_glavni bigint) returns bigint[]`
  - `scout.je_skrit(p_ids bigint[]) returns boolean`
  - `scout.odrasle_vrstice() returns table(player_id bigint)`
  - `public.scout_moj_profil(p_player_id bigint) returns table(drzava_odprta boolean, country_id bigint, skrit boolean, odprt_za_prestop boolean, letnik int, regije bigint[], kontakt_dovoljen boolean)`
  - `public.scout_shrani_privolitev(p_player_id bigint, p_odprt boolean, p_letnik int, p_regije bigint[], p_kontakt boolean) returns void`
  - `public.scout_preklici_privolitev(p_player_id bigint) returns void`
  - `public.scout_ugovor(p_player_id bigint, p_skrij boolean) returns void`
  - `public.admin_scout_skrij(p_player_ids bigint[]) returns integer` (število vpisanih ključev)

- [ ] **Step 1: Veja**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
git switch main && git pull --ff-only && git switch -c feat/scout-faza2-igralec
```

- [ ] **Step 2: Popravi teste faze 1 v `supabase/tests/varnost.sql`**

Preverjanje `scout: scout_skrit privzeto false` ostane do naloge 10 (stolpec ostane).

Zamenjaj

```sql
  (select count(*) = 8 from pg_policies where schemaname = 'scout' and 'scout_stroj' = any(roles)));
```

z

```sql
  (select count(*) = 9 from pg_policies where schemaname = 'scout' and 'scout_stroj' = any(roles)));
```

Zamenjaj

```sql
  'select 1 from public.players p join public.competitions c on c.id = p.competition_id where p.scout_skrit or public.je_mladinski_slug(c.slug)'
]) q;
```

z

```sql
  'select 1 from public.players p join public.competitions c on c.id = p.competition_id where p.scout_skrit or public.je_mladinski_slug(c.slug)',
  'select * from scout.ugovori', 'select * from scout.odrasle_vrstice()'
]) q;
```

- [ ] **Step 3: Dodaj blok faze 2 v `supabase/tests/varnost.sql`**

Tik pred vrstico `do $$` z `declare v_napak int;` (povzetek na koncu datoteke) vstavi:

```sql
-- ---------------------------------------------------------------------------
-- Scout, faza 2 (migracija 20261016160100): ugovor in privolitev igralca.
-- L (...e5c...001) je potrjeni lastnik -918001; povezana vrstica -918002 je
-- v drugi ligi z istim imenom. T (...002) je tujec. -918003 skrije admin.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('e5c00000-0000-4000-8000-000000000001','scout-lastnik@example.invalid','{"display_name":"ScoutL"}',now()),
 ('e5c00000-0000-4000-8000-000000000002','scout-tujec@example.invalid','{"display_name":"ScoutT"}',now());
update profiles set is_admin = true where id = 'b8a06635-2322-4444-8c42-44e419f912ad';
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-918001, -913001, -913001, 'Scout', 'Lastnik', 'Scout Lastnik', 'MID', 'admin', 6, 6, true),
       (-918002, -913002, -913002, 'Scout', 'Lastnik', 'Scout Lastnik', 'MID', 'admin', 6, 6, true),
       (-918003, -913003, -913001, 'Scout', 'Admin', 'Scout Admin', 'MID', 'admin', 6, 6, true),
       (-918004, -913004, -913001, 'Scout', 'Soimenjak', 'Scout Lastnik', 'MID', 'admin', 6, 6, true);
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
values (-918001, 'e5c00000-0000-4000-8000-000000000001', 'potrjen', 'admin', now());
insert into povezani_igralci(player_id, zahtevek_id)
select -918002, id from zahtevki_igralca where player_id = -918001 and status = 'potrjen';
-- Soimenjak -918004 (drug klub, isto ime v državi) je ugovarjal sam: njegov
-- ključ imena je enak lastnikovemu.
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-918004]::bigint[]);

select pg_temp.preveri('scout: funkcij Scouta anon ne klice, notranjih nihce iz brskalnika',
  not has_function_privilege('anon', 'public.scout_moj_profil(bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_ugovor(bigint, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_scout_skrij(bigint[])', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.odrasle_vrstice()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.kljuci_vrstic(bigint[])', 'EXECUTE')
  and has_function_privilege('scout_stroj', 'scout.odrasle_vrstice()', 'EXECUTE'));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout: tujec ne bere tuje privolitve', $$select * from scout_moj_profil(-918001)$$);
select pg_temp.zavrnjeno('scout: tujec ne vpise tuje privolitve',
  $$select scout_shrani_privolitev(-918001, true, 1995, '{}'::bigint[], true)$$);
select pg_temp.zavrnjeno('scout: tujec ne skrije tujega igralca', $$select scout_ugovor(-918001, true)$$);
select pg_temp.zavrnjeno('scout: navaden uporabnik ne skrije kot admin', $$select admin_scout_skrij(array[-918003]::bigint[])$$);
select pg_temp.zavrnjeno('scout: brskalnik ne bere ugovorov', $$select * from scout.ugovori$$);
select pg_temp.zavrnjeno('scout: brskalnik ne bere privolitev', $$select * from scout.privolitve$$);
reset role;

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout: letnica, ki letos ni vse leto polnoletna, zavrnjena',
  $$select scout_shrani_privolitev(-918001, true, extract(year from current_date)::int - 18, '{}'::bigint[], true)$$, null);
select pg_temp.napaka('scout: neznana regija zavrnjena',
  $$select scout_shrani_privolitev(-918001, true, 1995, array[-1]::bigint[], true)$$, null);
select scout_shrani_privolitev(-918001, true, 1995, array(select id::bigint from federations where code = 'mnzg'), true);
select pg_temp.preveri('scout: lastnik vpise in prebere privolitev',
  (select drzava_odprta and not skrit and odprt_za_prestop and letnik = 1995 and kontakt_dovoljen
          and cardinality(regije) = 1
     from scout_moj_profil(-918001)));
reset role;
select pg_temp.preveri('scout: soimenjakov ugovor ne zaklene lastnika, stroj pa ga izloci',
  (select letnik = 1995 from scout.privolitve where player_id = -918001)
  and scout.je_skrit(array[-918001]::bigint[]));
select pg_temp.preveri('scout: polnoletna privolitev odpre glavno in povezano vrstico',
  (select count(*) = 2 from scout.odrasle_vrstice() where player_id in (-918001, -918002)));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_ugovor(-918001, true);
select pg_temp.preveri('scout: ugovor skrije in izbrise privolitev',
  (select skrit and letnik is null from scout_moj_profil(-918001)));
select pg_temp.napaka('scout: skrit igralec ne vpise privolitve',
  $$select scout_shrani_privolitev(-918001, true, 1995, '{}'::bigint[], true)$$, null);
reset role;
select pg_temp.preveri('scout: ugovor zajame povezano vrstico',
  scout.je_skrit(array[-918002]::bigint[]) and exists (select 1 from scout.ugovori where player_id = -918002));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_ugovor(-918001, false);
select pg_temp.preveri('scout: lastnik preklice ugovor', (select not skrit from scout_moj_profil(-918001)));
select scout_shrani_privolitev(-918001, false, 1990, '{}'::bigint[], false);
select scout_preklici_privolitev(-918001);
reset role;
select pg_temp.preveri('scout: preklic privolitve izbrise vrstico',
  not exists (select 1 from scout.privolitve where player_id = -918001));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_shrani_privolitev(-918001, true, 1990, '{}'::bigint[], true);
select preklici_moj_zahtevek((select id from zahtevki_igralca where user_id = auth.uid() and status = 'potrjen'));
reset role;
select pg_temp.preveri('scout: preklic profila izbrise privolitev',
  not exists (select 1 from scout.privolitve where player_id = -918001));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('scout: admin skrije igralca', admin_scout_skrij(array[-918003]::bigint[]) > 0);
reset role;
select pg_temp.preveri('scout: adminov ugovor velja', scout.je_skrit(array[-918003]::bigint[]));
select set_config('request.jwt.claim.sub','',true);
```

- [ ] **Step 4: Poženi, mora pasti**

```bash
npm run test:varnost
```

Expected: FAIL (`relation "scout.ugovori" does not exist` ali `function scout_moj_profil(...) does not exist`; zaradi `ON_ERROR_STOP` se ustavi na prvi napaki).

- [ ] **Step 5: Napiši migracijo `supabase/migrations/20261016160100_scout_igralec.sql`**

```sql
-- SLFF Scout, faza 2 (stran igralca). Spec: docs/superpowers/specs/2026-10-16-scout-design.md.
--
-- 1. Ugovor se preseli iz players.scout_skrit v zaprto scout.ugovori. Politika
--    "javno branje" na players bi seznam ugovornikov razkrila vsakomur.
--    Ključa sta zgoščena (država + ime, država + šifra) kot pri
--    anonimizaciji, zato ugovor velja za vse vrstice osebe v državi in za
--    poznejše uvoze. Stolpec players.scout_skrit ostane, dokler na produkciji
--    ne teče nov delavec (ločena migracija 20261017090100 ga odstrani).
-- 2. scout.privolitve: odprt za prestop, letnica, regije, stik. Privolitev
--    potrjenega lastnika profila; preklic, ugovor, preklic profila,
--    anonimizacija in izbris računa jo izbrišejo. Ne v profil_igralca, ker
--    je ta javno berljiv.
-- 3. Stroj spusti osebo z mladinsko vrstico, če ima potrjen profil z
--    letnico, s katero je polnoleten vse tekoče leto (scout.odrasle_vrstice).
-- Brskalnik sheme scout ne vidi; vse gre prek SECURITY DEFINER RPC spodaj.

create table scout.ugovori (
  -- Vrstica, iz katere je ključ. Brez tujega ključa: ključ mora preživeti
  -- brisanje vrstice (zdruzi-klube, razdeli-zlite-igralce).
  player_id  bigint not null,
  kljuc      text not null,
  created_at timestamptz not null default now(),
  primary key (player_id, kljuc)
);
create index ugovori_kljuc on scout.ugovori (kljuc);
comment on table scout.ugovori is
  'Ugovor proti Scoutu: zgosceni kljuci osebe (anonimizacijski_kljuc drzava|ime, drzava|reg|sifra). Stroj izloci vsako vrstico z istim kljucem.';

create table scout.privolitve (
  -- Glavna vrstica potrjenega zahtevka (kot profil_igralca).
  player_id        bigint primary key references public.players on delete cascade,
  odprt_za_prestop boolean not null default false,
  letnik           int not null check (letnik between 1940 and 2100),
  -- id-ji public.federations iste drzave; krovna zveza pomeni vso drzavo.
  regije           bigint[] not null default '{}' check (cardinality(regije) <= 50),
  kontakt_dovoljen boolean not null default false,
  updated_at       timestamptz not null default now()
);
comment on table scout.privolitve is
  'Privolitev igralca za Scout (odprt za prestop, letnica, regije, stik). Preklic = izbris vrstice.';

alter table scout.ugovori enable row level security;
alter table scout.privolitve enable row level security;
revoke all on scout.ugovori, scout.privolitve from public, anon, authenticated;
-- Stroj bere le ugovore; privolitve vidi samo prek scout.odrasle_vrstice().
grant select on scout.ugovori to scout_stroj;
create policy stroj on scout.ugovori for select to scout_stroj using (true);

-- Zgoščena ključa vrstic: enako kot anonimiziraj_igralca in SQL_IZKLJUCENI stroja.
create function scout.kljuci_vrstic(p_ids bigint[])
returns table (player_id bigint, kljuc text)
language sql stable set search_path = public
as $$
  select p.id, anonimizacijski_kljuc(v.k)
    from players p join competitions c on c.id = p.competition_id
   cross join lateral (values
     (case when nullif(p.full_name, '') is not null then c.country_id || '|' || p.full_name end),
     (case when p.reg_st is not null then c.country_id || '|reg|' || p.reg_st end)) v(k)
   where p.id = any(p_ids) and v.k is not null
$$;

-- Vrstice osebe s potrjenim profilom: glavna in povezane.
create function scout.vrstice_profila(p_glavni bigint)
returns bigint[]
language sql stable set search_path = public
as $$
  select array_agg(id) from (
    select z.player_id as id from zahtevki_igralca z
     where z.player_id = p_glavni and z.status = 'potrjen'
    union
    select pi.player_id from povezani_igralci pi
      join zahtevki_igralca z on z.id = pi.zahtevek_id
     where z.player_id = p_glavni and z.status = 'potrjen') v
$$;

-- Ali je katera od vrstic (po ključu) skrita. Funkcije faze 3 jo pokličejo
-- ob branju, ker model nastane enkrat na dan.
create function scout.je_skrit(p_ids bigint[])
returns boolean
language sql stable set search_path = public
as $$
  select exists (select 1 from scout.kljuci_vrstic(p_ids) k join scout.ugovori u on u.kljuc = k.kljuc)
$$;

-- Za stroj: vrstice, pokrite s potrjenim profilom s polnoletno letnico.
-- Teče kot lastnik, da stroj ne potrebuje branja zahtevkov.
create function scout.odrasle_vrstice()
returns table (player_id bigint)
language sql stable security definer set search_path = public
as $$
  select z.player_id from zahtevki_igralca z
    join scout.privolitve s on s.player_id = z.player_id
   where z.status = 'potrjen' and s.letnik <= extract(year from current_date)::int - 19
  union
  select pi.player_id from povezani_igralci pi
    join zahtevki_igralca z on z.id = pi.zahtevek_id and z.status = 'potrjen'
    join scout.privolitve s on s.player_id = z.player_id
   where s.letnik <= extract(year from current_date)::int - 19
$$;

revoke all on function scout.kljuci_vrstic(bigint[]), scout.vrstice_profila(bigint),
  scout.je_skrit(bigint[]), scout.odrasle_vrstice() from public, anon, authenticated;
grant execute on function scout.odrasle_vrstice() to scout_stroj;

-- Prenos ugovorov iz faze 1. Stolpec ostane (stari delavec ga bere do
-- objave novega); odstrani ga 20261017090100.
insert into scout.ugovori (player_id, kljuc)
select k.player_id, k.kljuc
  from scout.kljuci_vrstic(array(select id from public.players where scout_skrit)) k
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RPC za lastnika potrjenega profila (p_player_id = glavna vrstica)
-- ---------------------------------------------------------------------------
create function public.scout_moj_profil(p_player_id bigint)
returns table (drzava_odprta boolean, country_id bigint, skrit boolean, odprt_za_prestop boolean,
               letnik int, regije bigint[], kontakt_dovoljen boolean)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  return query
  select coalesce(d.stanje <> 'zaprto', false), c.country_id,
         -- le ugovori lastnikovih vrstic: soimenjakov ugovor ga ne zaklene
         -- (stroj soimenjake še vedno izloča po ključu imena)
         exists (select 1 from scout.ugovori u where u.player_id = any(scout.vrstice_profila(p_player_id))),
         s.odprt_za_prestop, s.letnik, s.regije, s.kontakt_dovoljen
    from players p
    join competitions c on c.id = p.competition_id
    left join scout.drzave d on d.country_id = c.country_id
    left join scout.privolitve s on s.player_id = p.id
   where p.id = p_player_id;
end;
$$;

create function public.scout_shrani_privolitev(p_player_id bigint, p_odprt boolean, p_letnik int,
                                               p_regije bigint[], p_kontakt boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_drzava bigint;
  v_regije bigint[] := coalesce(p_regije, '{}');
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  select c.country_id into v_drzava
    from players p join competitions c on c.id = p.competition_id
   where p.id = p_player_id;
  if not exists (select 1 from scout.drzave where country_id = v_drzava and stanje <> 'zaprto') then
    raise exception 'Scout v tej državi še ni odprt.';
  end if;
  if exists (select 1 from scout.ugovori u where u.player_id = any(scout.vrstice_profila(p_player_id))) then
    raise exception 'Najprej prekliči ugovor proti Scoutu.';
  end if;
  if p_letnik is null or p_letnik < 1940 or p_letnik > extract(year from current_date)::int - 19 then
    raise exception 'Scout je le za polnoletne: vpiši letnico rojstva.';
  end if;
  if cardinality(v_regije) > 50 or exists (
       select 1 from unnest(v_regije) r(id)
        where not exists (select 1 from federations f where f.id = r.id and f.country_id = v_drzava)) then
    raise exception 'Neznana regija.';
  end if;
  insert into scout.privolitve (player_id, odprt_za_prestop, letnik, regije, kontakt_dovoljen)
  values (p_player_id, coalesce(p_odprt, false), p_letnik,
          array(select distinct r from unnest(v_regije) r order by r), coalesce(p_kontakt, false))
  on conflict (player_id) do update set
    odprt_za_prestop = excluded.odprt_za_prestop,
    letnik = excluded.letnik,
    regije = excluded.regije,
    kontakt_dovoljen = excluded.kontakt_dovoljen,
    updated_at = now();
end;
$$;

-- Preklic privolitve = izbris (spec, razdelek 2).
create function public.scout_preklici_privolitev(p_player_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  delete from scout.privolitve where player_id = p_player_id;
end;
$$;

-- Ugovor lastnika: ključi glavne in povezanih vrstic (šifra zajame še ostale
-- vrstice osebe v državi). Preklic pobriše le ključe teh vrstic: soimenjak,
-- ki je ugovarjal sam, ostane skrit.
create function public.scout_ugovor(p_player_id bigint, p_skrij boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_vrstice bigint[];
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  v_vrstice := scout.vrstice_profila(p_player_id);
  if p_skrij then
    insert into scout.ugovori (player_id, kljuc)
    select k.player_id, k.kljuc from scout.kljuci_vrstic(v_vrstice) k
    on conflict do nothing;
    delete from scout.privolitve where player_id = p_player_id;
  else
    delete from scout.ugovori where player_id = any(v_vrstice);
  end if;
end;
$$;

-- Ugovor po mailu (info@): admin izbere vrstice osebe kot pri anonimizaciji
-- (admin_ista_oseba). Vrne število vpisanih ključev.
create function public.admin_scout_skrij(p_player_ids bigint[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_n integer;
begin
  if not is_admin() then
    raise exception 'Samo administrator.' using errcode = '42501';
  end if;
  insert into scout.ugovori (player_id, kljuc)
  select k.player_id, k.kljuc from scout.kljuci_vrstic(p_player_ids) k
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.scout_moj_profil(bigint),
  public.scout_shrani_privolitev(bigint, boolean, int, bigint[], boolean),
  public.scout_preklici_privolitev(bigint), public.scout_ugovor(bigint, boolean),
  public.admin_scout_skrij(bigint[]) from public, anon, authenticated;
grant execute on function public.scout_moj_profil(bigint),
  public.scout_shrani_privolitev(bigint, boolean, int, bigint[], boolean),
  public.scout_preklici_privolitev(bigint), public.scout_ugovor(bigint, boolean),
  public.admin_scout_skrij(bigint[]) to authenticated;

-- Preklic profila, anonimizacija in izbris računa izbrišejo tudi privolitev.
-- Ista funkcija kot v 20261012190100, z eno vrstico več.
create or replace function public.prevzem_odstrani_predstavitev(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from profil_igralca where player_id = p_player_id;
  delete from profil_igralca_plus where player_id = p_player_id;
  delete from scout.privolitve where player_id = p_player_id;
  update preverjeni_racuni set status = 'preklican', updated_at = now()
   where player_id = p_player_id and status = 'aktiven';
  perform prevzem_odstrani_fotografije(p_player_id);
end;
$$;
revoke all on function public.prevzem_odstrani_predstavitev(bigint) from public, anon, authenticated;
```

- [ ] **Step 6: Uveljavi in poženi teste**

```bash
npx supabase migration up
npm run test:varnost
```

Expected: `VSE OK: … preverjanj pravic in rokov`, vključno z vsemi `scout:` vrsticami PASS.

- [ ] **Step 7: e2e (shema se je spremenila)**

```bash
npm test
```

Expected: PASS (potrebuje `SUPABASE_SERVICE_ROLE_KEY` v okolju ali `.env`).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261016160100_scout_igralec.sql supabase/tests/varnost.sql
git commit -F - <<'EOF'
feat(scout): zaprt ugovor in privolitev igralca

players.scout_skrit je bil javno berljiv (politika javno branje), torej tudi
seznam ugovornikov. Ugovor gre v zaprto scout.ugovori z zgoscenimi kljuci
osebe kot anonimizacija, privolitev v scout.privolitve; vse prek RPC, ki
preverijo lastnika potrjenega profila.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Stroj bere ugovor iz `scout.ugovori` in spusti polnoletnega mladinca

**Files:**
- Modify: `scout/stroj/stroj/nalaganje.py`
- Modify: `scout/stroj/tests/test_baza.py`

**Interfaces:**
- Consumes: `scout.ugovori`, `scout.kljuci_vrstic(bigint[])` (le fikstura), `scout.odrasle_vrstice()`, `public.anonimizirani_igralci`.
- Produces: `SQL_IZKLJUCENI` (isti izhod: en stolpec `oseba`); `nalozi(conn) -> tuple[Tabela, Tabela, Tabela]` nespremenjen.

- [ ] **Step 1: Posodobi fiksture in dodaj test v `scout/stroj/tests/test_baza.py`**

V `FIKSTURA` zamenjaj

```python
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start, scout_skrit, anonimiziran_at) overriding system value
values (-914001, -914001, -914001, 'Prvi', 'Scout', 'Scout Prvi', 'FWD', 6, 6, false, null),
       (-914002, -914002, -914001, 'Drugi', 'Scout', 'Scout Drugi', 'DEF', 6, 6, false, null),
       (-914003, -914001, -914001, 'Skriti', 'Scout', 'Scout Skriti', 'MID', 6, 6, true, null),
       (-914004, -914001, -914001, 'Anonimni', 'Scout', 'Scout Anonimni', 'MID', 6, 6, false, now()),
       (-914005, -914001, -914001, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, false, null),
       (-914006, -914001, -914002, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, false, null);
```

z

```python
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start, anonimiziran_at) overriding system value
values (-914001, -914001, -914001, 'Prvi', 'Scout', 'Scout Prvi', 'FWD', 6, 6, null),
       (-914002, -914002, -914001, 'Drugi', 'Scout', 'Scout Drugi', 'DEF', 6, 6, null),
       (-914003, -914001, -914001, 'Skriti', 'Scout', 'Scout Skriti', 'MID', 6, 6, null),
       (-914004, -914001, -914001, 'Anonimni', 'Scout', 'Scout Anonimni', 'MID', 6, 6, now()),
       (-914005, -914001, -914001, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, null),
       (-914006, -914001, -914002, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, null);
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-914003]::bigint[]);
```

Zamenjaj celoten `UGOVOR` in `test_ugovor_v_drugem_klubu`:

```python
UGOVOR = """
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start) overriding system value
values (-914030, -914001, -914001, 'Ugovor', 'Scout', 'Scout Ugovor', 'MID', 6, 6),
       (-914031, -914002, -914001, 'Ugovor', 'Scout', 'Scout Ugovor', 'MID', 6, 6);
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914001, -914031, -914002, true, 0, 90, 90, 0, 0);
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-914030]::bigint[]);
"""


def test_ugovor_v_drugem_klubu(conn):
    """Ugovor (scout.ugovori) velja za vse vrstice osebe v državi: isto ime brez
    šifre v drugem klubu je druga `oseba`, a izpade po ključu imena."""
    conn.execute("reset role")
    conn.execute(UGOVOR)
    conn.execute("set role scout_stroj")
    sezone, _, _ = nalozi(conn)
    igralci = set(sezone["player_id"].tolist())
    assert -914002 in igralci  # soigralec z drugim imenom ostane
    assert not igralci & {-914030, -914031}


MLADINEC = """
insert into auth.users (id, email, raw_user_meta_data, created_at)
values ('e5c00000-0000-4000-8000-000000000914', 'scout-mladi@example.invalid', '{"display_name":"ScoutMladi"}', now());
insert into zahtevki_igralca (player_id, user_id, status, potrdil, decided_at)
values (-914005, 'e5c00000-0000-4000-8000-000000000914', 'potrjen', 'admin', now());
"""


def test_mladinec_s_polnoletno_letnico(conn):
    """Oseba z mladinsko vrstico (-914006) vstopi, ko na potrjenem profilu
    prijavi letnico, s katero je polnoletna vse leto (<= letos - 19); letnica
    letos - 18 je ne odpre."""
    conn.execute("reset role")
    conn.execute(MLADINEC)
    conn.execute("insert into scout.privolitve (player_id, letnik) "
                 "values (-914005, extract(year from current_date)::int - 18)")
    conn.execute("set role scout_stroj")
    assert -914005 not in set(nalozi(conn)[0]["player_id"].tolist())
    conn.execute("reset role")
    conn.execute("update scout.privolitve set letnik = 2000 where player_id = -914005")
    conn.execute("set role scout_stroj")
    assert -914005 in set(nalozi(conn)[0]["player_id"].tolist())
```

- [ ] **Step 2: Poženi, mora pasti**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska/scout/stroj && .venv/bin/pytest -q tests/test_baza.py
```

Expected: FAIL (`relation "scout.privolitve"` ali `scout.ugovori` ne obstaja, če naloga 1 lokalno še ni uveljavljena; sicer `test_mladinec_s_polnoletno_letnico` pade, ker stari `SQL_IZKLJUCENI` izloči vsakega mladinca, in `test_ugovor_v_drugem_klubu`, ker ugovora ne bere iz `scout.ugovori`).

- [ ] **Step 3: Zamenjaj izločanje v `scout/stroj/stroj/nalaganje.py`**

Zamenjaj blok od vrstice `# Ugovor (scout_skrit) velja za vse vrstice osebe v državi (po istih ključih` do konca niza `SQL_IZKLJUCENI` (zaključni `"""` pred `SQL_SEZONE`) z:

```python
# Izločene osebe (vse vrstice osebe):
# - mladinska vrstica, razen če je oseba na potrjenem profilu prijavila
#   letnico, s katero je polnoletna vse leto (scout.odrasle_vrstice: glavna in
#   povezane vrstice);
#   članske minute ima, kdor je sploh v SQL_SEZONE;
# - ugovor (scout.ugovori) in anonimizacija (anonimizirani_igralci) po
#   zgoščenih ključih država + ime in država + šifra: velja za vse vrstice
#   osebe v državi, tudi v drugem klubu brez šifre in ob poznejših uvozih.
#   Ključ imena nima kluba, zato izpade tudi soimenjak (varneje za zasebnost).
# Anonimizirana vrstica sama izpade že po anonimiziran_at.
SQL_IZKLJUCENI = f"""
with vrstice as (
  select p.id, {OSEBA} as oseba, public.je_mladinski_slug(c.slug) as mladinski,
         public.anonimizacijski_kljuc(c.country_id || '|' || p.full_name) as kljuc_ime,
         public.anonimizacijski_kljuc(c.country_id || '|reg|' || p.reg_st) as kljuc_reg
  from public.players p join public.competitions c on c.id = p.competition_id
  where p.anonimiziran_at is null
)
(select v.oseba from vrstice v where v.mladinski
 except
 select v.oseba from vrstice v join scout.odrasle_vrstice() o on o.player_id = v.id)
union
-- Unija ključev omogoči hash join (join z OR je na produkciji obvisel).
select v.oseba from vrstice v
cross join lateral (values (v.kljuc_ime), (v.kljuc_reg)) k(kljuc)
join (select kljuc from scout.ugovori
      union select kljuc from public.anonimizirani_igralci) s on s.kljuc = k.kljuc
"""
```

V `test_nalozi` popravi le komentar:

```python
    assert set(vrsta) == {-914001, -914002}  # skriti (scout.ugovori), anonimni in mladi (mladinska vrstica brez letnice) izpadejo
```

- [ ] **Step 4: Poženi vse Pythonove teste**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska/scout/stroj && .venv/bin/pytest -q
```

Expected: vsi PASS.

- [ ] **Step 5: Izmeri novi SQL na produkciji (branje, brez pisanja)**

Migracija na produkciji še ni, zato `scout.ugovori` in `scout.odrasle_vrstice()` zamenjamo z enako oblikovanima izrazoma nad obstoječimi tabelami:

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska/scout/stroj
.venv/bin/python -c 'from stroj.nalaganje import SQL_IZKLJUCENI as s; print("begin;\nset local role scout_stroj;\nset local statement_timeout = 120000;\nexplain (analyze, buffers)\n" + s + ";\nrollback;")' \
  | sed -e 's/scout\.odrasle_vrstice()/(select null::bigint as player_id where false)/' \
        -e 's/scout\.ugovori/public.anonimizirani_igralci/' \
  > /private/tmp/scout-izkljuceni.sql
ssh slff 'docker exec -i supabase-db psql -U supabase_admin -d postgres -X' < /private/tmp/scout-izkljuceni.sql | tail -4
```

Expected: `Execution Time` pod 30000 ms in noben `Nested Loop` čez `vrstice` × ključi. Če ne: ne nadaljuj, popravi poizvedbo.

- [ ] **Step 6: Commit**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
git add scout/stroj/stroj/nalaganje.py scout/stroj/tests/test_baza.py
git commit -F - <<'EOF'
feat(scout): stroj bere ugovor iz scout.ugovori, mladinec s polnoletno letnico vstopi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Tipi baze

**Files:**
- Modify: `src/lib/baza.types.ts`

**Interfaces:**
- Consumes: migracija iz naloge 1 (uveljavljena lokalno).
- Produces: `Database['public']['Functions']` z `scout_moj_profil`, `scout_shrani_privolitev`, `scout_preklici_privolitev`, `scout_ugovor`, `admin_scout_skrij`; `players.scout_skrit` ostane (naloga 10).

- [ ] **Step 1: Generiraj**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
npm run tipi
git diff --stat src/lib/baza.types.ts
```

Če diff doda le pet novih funkcij, pojdi na Step 3. Če spremeni še kaj drugega (razlika v različici CLI, kot v fazi 1), `git checkout src/lib/baza.types.ts` in Step 2.

- [ ] **Step 2: Ročno (le ob razliki CLI)**

Pred vrstico `      admin_skrij_pivo: {` vstavi:

```ts
      admin_scout_skrij: {
        Args: { p_player_ids: number[] }
        Returns: number
      }
```

Pred vrstico `      sem_v_mini_ligi: { Args: { p_liga: number }; Returns: boolean }` vstavi:

```ts
      scout_moj_profil: {
        Args: { p_player_id: number }
        Returns: {
          country_id: number
          drzava_odprta: boolean
          kontakt_dovoljen: boolean
          letnik: number
          odprt_za_prestop: boolean
          regije: number[]
          skrit: boolean
        }[]
      }
      scout_preklici_privolitev: {
        Args: { p_player_id: number }
        Returns: undefined
      }
      scout_shrani_privolitev: {
        Args: {
          p_kontakt: boolean
          p_letnik: number
          p_odprt: boolean
          p_player_id: number
          p_regije: number[]
        }
        Returns: undefined
      }
      scout_ugovor: {
        Args: { p_player_id: number; p_skrij: boolean }
        Returns: undefined
      }
```

- [ ] **Step 3: Preveri**

```bash
npm run typecheck
```

Expected: brez napak.

- [ ] **Step 4: Commit**

```bash
git add src/lib/baza.types.ts
git commit -F - <<'EOF'
chore(scout): tipi baze za privolitev in ugovor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Prevodi (14 jezikov)

**Files:**
- Modify: `src/i18n/{sl,hr,sk,cs,hu,de,sr,ro,et,pl,es,lv,mk,en}/igralci.ts`
- Modify: `src/i18n/{sl,hr,sk,cs,hu,de,sr,ro,et,pl,es,lv,mk,en}/racun.ts`

**Interfaces:**
- Produces ključe: `igralci.scout.{naslov, opis, odprt, letnik, regije, kontakt, privolitev, shrani, shranjeno, preklici, preklicano, skrij, skrijPotrdi, skrit, razkrij, napaka, ugovorPovezava}` (`privolitev` ima oznako `<pravno>`); `racun.pravno.{scoutNaslov, scoutKaj, scoutPodlaga, scoutPrivolitev, scoutUgovor}` (`scoutUgovor` ima oznako `<eposta>`); spremenjen `racun.pravno.zadnjaSprememba`.

Vstavljanje: v `igralci.ts` vsakega jezika blok `scout` kot zadnji ključ objekta, za blokom `vrh` (pred zaključnim `}` datoteke). V `racun.ts` ključe `scout*` v objekt `pravno` takoj za vnosom `pritozbe:`.

- [ ] **Step 1: Slovenščina (izvor), pade smoke**

`src/i18n/sl/igralci.ts`, za blokom `vrh`:

```ts
  // SLFF Scout na prevzetem profilu (ScoutIgralca) in povezava za ugovor na
  // strani igralca. <pravno> je povezava na /legal#scout.
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Klubi, ki iščejo igralce, v SLFF Scoutu vidijo kazalnike iz tvojih tekem. Tu dodaš, kar vidijo le s tvojo privolitvijo.',
    odprt: 'Odprt za prestop',
    letnik: 'Letnica rojstva (Scout je le za polnoletne)',
    regije: 'Kje bi igral (zveze)',
    kontakt: 'Klubi mi lahko pišejo prek Scouta (moj e-naslov ostane skrit)',
    privolitev: 'S shranjevanjem privoliš, da to vidijo klubi v Scoutu. Privolitev lahko kadarkoli prekličeš in podatke izbrišemo. <pravno>Več o Scoutu</pravno>',
    shrani: 'Shrani',
    shranjeno: 'Shranjeno.',
    preklici: 'Prekliči privolitev',
    preklicano: 'Privolitev preklicana, podatki izbrisani.',
    skrij: 'Skrij me iz Scouta',
    skrijPotrdi: 'Te skrijem iz Scouta? Klubi te ne bodo videli, v fantasy igri ostaneš. Privolitev se izbriše.',
    skrit: 'Iz Scouta si skrit. Klubi te ne vidijo.',
    razkrij: 'Prekliči ugovor',
    napaka: 'Ni uspelo. Poskusi znova.',
    ugovorPovezava: 'Ne želiš biti v SLFF Scoutu? Tako ugovarjaš.',
  },
```

`src/i18n/sl/racun.ts`, v `pravno` za `pritozbe`:

```ts
    scoutNaslov: 'SLFF Scout: iskanje igralcev za klube',
    scoutKaj:
      'Iz istih javnih zapisnikov izračunamo kazalnike igralcev članskih lig: delež minut, gole, vpliv na igrišču, prejete gole, kartone in pot čez sezone, prilagojene moči lige. To so kazalniki iz podatkov tekem, ne ocena osebe. Videli jih bodo klubi z naročnino na SLFF Scout, ki iščejo igralce; odloči vedno človek v klubu. Mladinskih lig ne obdelujemo. Kdor igra tudi v mladinski ligi, je izločen, dokler nima minut v članski ligi in na svojem profilu ne vpiše letnice, s katero je polnoleten.',
    scoutPodlaga:
      'Pravna podlaga je zakoniti interes (člen 6(1)(f) GDPR): klubom pomagati najti igralce iz javno objavljenih rezultatov. Kazalnike izračunamo vsak dan znova in hranimo le zadnje izračune. Oglede klubov bomo beležili 12 mesecev, da preprečimo zlorabo in da igralcu na zahtevo povemo, kateri klubi so ga gledali.',
    scoutPrivolitev:
      'Igralec s prevzetim profilom lahko doda, da je odprt za prestop, letnico rojstva, želene regije in dovoljenje za stik. To je privolitev (člen 6(1)(a) GDPR): vidijo jo le klubi v Scoutu, prekliče jo kadarkoli na profilu in ob preklicu podatke izbrišemo. Klub igralcu piše le prek Scouta in njegovega e-naslova ne vidi.',
    scoutUgovor:
      'Ugovor: na prevzetem profilu klikni Skrij me iz Scouta ali piši na <eposta>info@slff.eu</eposta> s povezavo na stran igralca. V 14 dneh igralca skrijemo iz Scouta v vseh naših ligah te države, tudi ob poznejših uvozih. V fantasy igri ostane.',
```

```bash
npm run smoke
```

Expected: FAIL `prevodi xx: vsi nizi prevedeni` za vseh 13 jezikov.

- [ ] **Step 2: Angleščina**

`src/i18n/en/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Clubs looking for players see indicators from your matches in SLFF Scout. Here you add what they see only with your consent.',
    odprt: 'Open to a transfer',
    letnik: 'Year of birth (Scout is for adults only)',
    regije: 'Where you would play (associations)',
    kontakt: 'Clubs may write to me through Scout (my email stays hidden)',
    privolitev: 'By saving, you consent to clubs in Scout seeing this. You can withdraw your consent at any time and we delete the data. <pravno>More about Scout</pravno>',
    shrani: 'Save',
    shranjeno: 'Saved.',
    preklici: 'Withdraw consent',
    preklicano: 'Consent withdrawn, data deleted.',
    skrij: 'Hide me from Scout',
    skrijPotrdi: 'Hide you from Scout? Clubs will not see you; you stay in the fantasy game. Your consent is deleted.',
    skrit: 'You are hidden from Scout. Clubs do not see you.',
    razkrij: 'Withdraw objection',
    napaka: 'That did not work. Please try again.',
    ugovorPovezava: 'Prefer not to be in SLFF Scout? Here is how to object.',
  },
```

`src/i18n/en/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: player search for clubs',
    scoutKaj:
      'From the same public match reports we calculate indicators for players in senior leagues: share of minutes, goals, impact on the pitch, goals conceded, cards and progress across seasons, adjusted for league strength. These are indicators from match data, not an assessment of the person. Clubs with an SLFF Scout subscription who are looking for players will see them; a person at the club always makes the decision. We do not process youth leagues. Anyone who also plays in a youth league is excluded until they have minutes in a senior league and enter, on their own profile, a year of birth that makes them an adult.',
    scoutPodlaga:
      'The legal basis is legitimate interest (Article 6(1)(f) GDPR): helping clubs find players from publicly published results. We recalculate the indicators every day and keep only the latest calculations. Club views will be logged for 12 months to prevent abuse and so that we can tell a player, on request, which clubs viewed them.',
    scoutPrivolitev:
      'A player with a claimed profile can add that they are open to a transfer, their year of birth, preferred regions and permission to be contacted. This is consent (Article 6(1)(a) GDPR): only clubs in Scout see it, it can be withdrawn at any time on the profile, and on withdrawal we delete the data. A club writes to the player only through Scout and does not see their email address.',
    scoutUgovor:
      'Objection: on a claimed profile click Hide me from Scout, or write to <eposta>info@slff.eu</eposta> with a link to the player page. Within 14 days we hide the player from Scout in all our leagues of that country, including future imports. The player stays in the fantasy game.',
```

- [ ] **Step 3: Hrvaščina**

`src/i18n/hr/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Klubovi koji traže igrače u SLFF Scoutu vide pokazatelje iz tvojih utakmica. Ovdje dodaješ ono što vide samo uz tvoju privolu.',
    odprt: 'Otvoren za transfer',
    letnik: 'Godina rođenja (Scout je samo za punoljetne)',
    regije: 'Gdje bi igrao (savezi)',
    kontakt: 'Klubovi mi mogu pisati putem Scouta (moja e-adresa ostaje skrivena)',
    privolitev: 'Spremanjem pristaješ da to vide klubovi u Scoutu. Privolu možeš povući u bilo kojem trenutku i podatke brišemo. <pravno>Više o Scoutu</pravno>',
    shrani: 'Spremi',
    shranjeno: 'Spremljeno.',
    preklici: 'Povuci privolu',
    preklicano: 'Privola povučena, podaci izbrisani.',
    skrij: 'Sakrij me iz Scouta',
    skrijPotrdi: 'Da te sakrijemo iz Scouta? Klubovi te neće vidjeti, u fantasy igri ostaješ. Privola se briše.',
    skrit: 'Skriven si iz Scouta. Klubovi te ne vide.',
    razkrij: 'Povuci prigovor',
    napaka: 'Nije uspjelo. Pokušaj ponovno.',
    ugovorPovezava: 'Ne želiš biti u SLFF Scoutu? Ovako prigovaraš.',
  },
```

`src/i18n/hr/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: traženje igrača za klubove',
    scoutKaj:
      'Iz istih javnih zapisnika izračunavamo pokazatelje igrača seniorskih liga: udio minuta, golove, utjecaj na terenu, primljene golove, kartone i put kroz sezone, prilagođene snazi lige. To su pokazatelji iz podataka utakmica, a ne ocjena osobe. Vidjet će ih klubovi s pretplatom na SLFF Scout koji traže igrače; odluku uvijek donosi čovjek u klubu. Juniorske lige ne obrađujemo. Tko igra i u juniorskoj ligi, isključen je dok nema minuta u seniorskoj ligi i na svom profilu ne upiše godinu rođenja s kojom je punoljetan.',
    scoutPodlaga:
      'Pravna osnova je legitimni interes (članak 6. stavak 1. točka (f) GDPR-a): pomoći klubovima pronaći igrače iz javno objavljenih rezultata. Pokazatelje izračunavamo svaki dan iznova i čuvamo samo zadnje izračune. Preglede klubova bilježit ćemo 12 mjeseci kako bismo spriječili zlouporabu i kako bismo igraču na zahtjev rekli koji su ga klubovi gledali.',
    scoutPrivolitev:
      'Igrač s preuzetim profilom može dodati da je otvoren za transfer, godinu rođenja, željene regije i dopuštenje za kontakt. To je privola (članak 6. stavak 1. točka (a) GDPR-a): vide je samo klubovi u Scoutu, može se povući u bilo kojem trenutku na profilu, a nakon povlačenja podatke brišemo. Klub igraču piše samo putem Scouta i ne vidi njegovu e-adresu.',
    scoutUgovor:
      'Prigovor: na preuzetom profilu klikni Sakrij me iz Scouta ili piši na <eposta>info@slff.eu</eposta> s poveznicom na stranicu igrača. U roku od 14 dana igrača skrivamo iz Scouta u svim našim ligama te države, i pri kasnijim uvozima. U fantasy igri ostaje.',
```

- [ ] **Step 4: Slovaščina**

`src/i18n/sk/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Kluby, ktoré hľadajú hráčov, vidia v SLFF Scoute ukazovatele z tvojich zápasov. Tu pridáš to, čo vidia iba s tvojím súhlasom.',
    odprt: 'Otvorený prestupu',
    letnik: 'Rok narodenia (Scout je len pre plnoletých)',
    regije: 'Kde by si hral (zväzy)',
    kontakt: 'Kluby mi môžu písať cez Scout (môj e-mail zostane skrytý)',
    privolitev: 'Uložením súhlasíš, aby to videli kluby v Scoute. Súhlas môžeš kedykoľvek odvolať a údaje vymažeme. <pravno>Viac o Scoute</pravno>',
    shrani: 'Uložiť',
    shranjeno: 'Uložené.',
    preklici: 'Odvolať súhlas',
    preklicano: 'Súhlas odvolaný, údaje vymazané.',
    skrij: 'Skry ma zo Scoutu',
    skrijPotrdi: 'Skryť ťa zo Scoutu? Kluby ťa neuvidia, vo fantasy hre zostávaš. Súhlas sa vymaže.',
    skrit: 'Si skrytý zo Scoutu. Kluby ťa nevidia.',
    razkrij: 'Odvolať námietku',
    napaka: 'Nepodarilo sa. Skús znova.',
    ugovorPovezava: 'Nechceš byť v SLFF Scoute? Takto podáš námietku.',
  },
```

`src/i18n/sk/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: hľadanie hráčov pre kluby',
    scoutKaj:
      'Z tých istých verejných zápisov o stretnutí vypočítavame ukazovatele hráčov seniorských súťaží: podiel minút, góly, vplyv na ihrisku, inkasované góly, karty a vývoj naprieč sezónami, upravené podľa sily súťaže. Sú to ukazovatele z údajov o zápasoch, nie hodnotenie osoby. Uvidia ich kluby s predplatným SLFF Scout, ktoré hľadajú hráčov; rozhoduje vždy človek v klube. Mládežnícke súťaže nespracúvame. Kto hrá aj v mládežníckej súťaži, je vylúčený, kým nemá minúty v seniorskej súťaži a na svojom profile nezadá rok narodenia, podľa ktorého je plnoletý.',
    scoutPodlaga:
      'Právnym základom je oprávnený záujem (článok 6 ods. 1 písm. f) GDPR): pomôcť klubom nájsť hráčov z verejne zverejnených výsledkov. Ukazovatele vypočítavame každý deň nanovo a uchovávame len posledné výpočty. Zobrazenia klubov budeme zaznamenávať 12 mesiacov, aby sme zabránili zneužitiu a aby sme hráčovi na požiadanie povedali, ktoré kluby si ho pozreli.',
    scoutPrivolitev:
      'Hráč s prevzatým profilom môže pridať, že je otvorený prestupu, rok narodenia, želané regióny a povolenie na kontakt. Ide o súhlas (článok 6 ods. 1 písm. a) GDPR): vidia ho iba kluby v Scoute, dá sa kedykoľvek odvolať na profile a po odvolaní údaje vymažeme. Klub píše hráčovi iba cez Scout a jeho e-mailovú adresu nevidí.',
    scoutUgovor:
      'Námietka: na prevzatom profile klikni Skry ma zo Scoutu alebo napíš na <eposta>info@slff.eu</eposta> s odkazom na stránku hráča. Do 14 dní hráča skryjeme zo Scoutu vo všetkých našich súťažiach danej krajiny, aj pri neskorších importoch. Vo fantasy hre zostáva.',
```

- [ ] **Step 5: Češčina**

`src/i18n/cs/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Kluby, které hledají hráče, vidí ve SLFF Scoutu ukazatele z tvých zápasů. Tady přidáš to, co vidí jen s tvým souhlasem.',
    odprt: 'Otevřený přestupu',
    letnik: 'Rok narození (Scout je jen pro zletilé)',
    regije: 'Kde bys hrál (svazy)',
    kontakt: 'Kluby mi mohou psát přes Scout (můj e-mail zůstane skrytý)',
    privolitev: 'Uložením souhlasíš, aby to viděly kluby ve Scoutu. Souhlas můžeš kdykoli odvolat a údaje smažeme. <pravno>Více o Scoutu</pravno>',
    shrani: 'Uložit',
    shranjeno: 'Uloženo.',
    preklici: 'Odvolat souhlas',
    preklicano: 'Souhlas odvolán, údaje smazány.',
    skrij: 'Skryj mě ze Scoutu',
    skrijPotrdi: 'Skrýt tě ze Scoutu? Kluby tě neuvidí, ve fantasy hře zůstáváš. Souhlas se smaže.',
    skrit: 'Jsi skrytý ze Scoutu. Kluby tě nevidí.',
    razkrij: 'Odvolat námitku',
    napaka: 'Nepovedlo se. Zkus to znovu.',
    ugovorPovezava: 'Nechceš být ve SLFF Scoutu? Takhle podáš námitku.',
  },
```

`src/i18n/cs/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: hledání hráčů pro kluby',
    scoutKaj:
      'Ze stejných veřejných zápisů o utkání počítáme ukazatele hráčů soutěží dospělých: podíl minut, góly, vliv na hřišti, inkasované góly, karty a vývoj napříč sezónami, upravené podle síly soutěže. Jsou to ukazatele z údajů o zápasech, ne hodnocení osoby. Uvidí je kluby s předplatným SLFF Scout, které hledají hráče; rozhoduje vždy člověk v klubu. Mládežnické soutěže nezpracováváme. Kdo hraje i v mládežnické soutěži, je vyloučen, dokud nemá minuty v soutěži dospělých a na svém profilu nezadá rok narození, podle kterého je zletilý.',
    scoutPodlaga:
      'Právním základem je oprávněný zájem (článek 6 odst. 1 písm. f) GDPR): pomoci klubům najít hráče z veřejně zveřejněných výsledků. Ukazatele počítáme každý den znovu a uchováváme jen poslední výpočty. Zobrazení klubů budeme zaznamenávat 12 měsíců, abychom zabránili zneužití a abychom hráči na požádání řekli, které kluby si ho prohlížely.',
    scoutPrivolitev:
      'Hráč s převzatým profilem může přidat, že je otevřený přestupu, rok narození, preferované regiony a povolení ke kontaktu. Jde o souhlas (článek 6 odst. 1 písm. a) GDPR): vidí ho jen kluby ve Scoutu, lze ho kdykoli odvolat na profilu a po odvolání údaje smažeme. Klub píše hráči jen přes Scout a jeho e-mailovou adresu nevidí.',
    scoutUgovor:
      'Námitka: na převzatém profilu klikni Skryj mě ze Scoutu nebo napiš na <eposta>info@slff.eu</eposta> s odkazem na stránku hráče. Do 14 dnů hráče skryjeme ze Scoutu ve všech našich soutěžích dané země, i při pozdějších importech. Ve fantasy hře zůstává.',
```

- [ ] **Step 6: Madžarščina**

`src/i18n/hu/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'A játékost kereső klubok az SLFF Scoutban a meccseidből számolt mutatókat látják. Itt azt adod hozzá, amit csak a hozzájárulásoddal láthatnak.',
    odprt: 'Nyitott vagyok az átigazolásra',
    letnik: 'Születési év (a Scout csak nagykorúaknak szól)',
    regije: 'Hol játszanál (szövetségek)',
    kontakt: 'A klubok a Scouton keresztül írhatnak nekem (az e-mail-címem rejtve marad)',
    privolitev: 'A mentéssel hozzájárulsz, hogy ezt a Scoutban lévő klubok lássák. A hozzájárulást bármikor visszavonhatod, és az adatokat töröljük. <pravno>Bővebben a Scoutról</pravno>',
    shrani: 'Mentés',
    shranjeno: 'Mentve.',
    preklici: 'Hozzájárulás visszavonása',
    preklicano: 'Hozzájárulás visszavonva, adatok törölve.',
    skrij: 'Rejts el a Scoutból',
    skrijPotrdi: 'Elrejtsünk a Scoutból? A klubok nem fognak látni, a fantasy játékban maradsz. A hozzájárulásod törlődik.',
    skrit: 'El vagy rejtve a Scoutból. A klubok nem látnak.',
    razkrij: 'Tiltakozás visszavonása',
    napaka: 'Nem sikerült. Próbáld újra.',
    ugovorPovezava: 'Nem szeretnél az SLFF Scoutban lenni? Így tiltakozhatsz.',
  },
```

`src/i18n/hu/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: játékoskeresés kluboknak',
    scoutKaj:
      'Ugyanazokból a nyilvános jegyzőkönyvekből a felnőtt bajnokságok játékosaira mutatókat számolunk: a játékpercek aránya, gólok, hatás a pályán, kapott gólok, lapok és az idények közötti fejlődés, a bajnokság erősségéhez igazítva. Ezek a meccsadatokból számolt mutatók, nem a személy értékelése. Az SLFF Scout előfizetéssel rendelkező, játékost kereső klubok fogják látni őket; a döntést mindig a klub egy embere hozza meg. Utánpótlás bajnokságokat nem dolgozunk fel. Aki utánpótlás bajnokságban is játszik, ki van zárva, amíg nincsenek játékpercei felnőtt bajnokságban, és a saját profilján meg nem ad egy olyan születési évet, amellyel nagykorú.',
    scoutPodlaga:
      'A jogalap a jogos érdek (a GDPR 6. cikk (1) bekezdés f) pontja): segíteni a kluboknak játékost találni a nyilvánosan közzétett eredményekből. A mutatókat minden nap újraszámoljuk, és csak a legutóbbi számításokat őrizzük meg. A klubok megtekintéseit 12 hónapig naplózni fogjuk, hogy megakadályozzuk a visszaéléseket, és kérésre megmondhassuk a játékosnak, mely klubok nézték meg.',
    scoutPrivolitev:
      'Az átvett profillal rendelkező játékos megadhatja, hogy nyitott az átigazolásra, a születési évét, a kívánt régiókat és a kapcsolatfelvétel engedélyét. Ez hozzájárulás (a GDPR 6. cikk (1) bekezdés a) pontja): csak a Scoutban lévő klubok látják, bármikor visszavonható a profilon, és visszavonáskor töröljük az adatokat. A klub csak a Scouton keresztül ír a játékosnak, és nem látja az e-mail-címét.',
    scoutUgovor:
      'Tiltakozás: az átvett profilon kattints a Rejts el a Scoutból gombra, vagy írj az <eposta>info@slff.eu</eposta> címre a játékos oldalának linkjével. 14 napon belül elrejtjük a játékost a Scoutból az adott ország összes bajnokságunkban, a későbbi importoknál is. A fantasy játékban marad.',
```

- [ ] **Step 7: Nemščina**

`src/i18n/de/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Vereine auf Spielersuche sehen in SLFF Scout Kennzahlen aus deinen Spielen. Hier ergänzt du, was sie nur mit deiner Einwilligung sehen.',
    odprt: 'Offen für einen Wechsel',
    letnik: 'Geburtsjahr (Scout ist nur für Volljährige)',
    regije: 'Wo du spielen würdest (Verbände)',
    kontakt: 'Vereine dürfen mir über Scout schreiben (meine E-Mail-Adresse bleibt verborgen)',
    privolitev: 'Mit dem Speichern willigst du ein, dass Vereine in Scout dies sehen. Du kannst die Einwilligung jederzeit widerrufen, dann löschen wir die Daten. <pravno>Mehr über Scout</pravno>',
    shrani: 'Speichern',
    shranjeno: 'Gespeichert.',
    preklici: 'Einwilligung widerrufen',
    preklicano: 'Einwilligung widerrufen, Daten gelöscht.',
    skrij: 'Mich in Scout verbergen',
    skrijPotrdi: 'Dich in Scout verbergen? Vereine sehen dich nicht mehr, im Fantasy-Spiel bleibst du. Deine Einwilligung wird gelöscht.',
    skrit: 'Du bist in Scout verborgen. Vereine sehen dich nicht.',
    razkrij: 'Widerspruch zurücknehmen',
    napaka: 'Das hat nicht geklappt. Bitte versuche es erneut.',
    ugovorPovezava: 'Du willst nicht in SLFF Scout sein? So widersprichst du.',
  },
```

`src/i18n/de/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: Spielersuche für Vereine',
    scoutKaj:
      'Aus denselben öffentlichen Spielberichten berechnen wir Kennzahlen für Spieler der Erwachsenenligen: Anteil der Spielminuten, Tore, Einfluss auf dem Platz, Gegentore, Karten und Entwicklung über die Saisons, angepasst an die Stärke der Liga. Das sind Kennzahlen aus Spieldaten, keine Bewertung der Person. Sehen werden sie Vereine mit einem SLFF-Scout-Abo, die Spieler suchen; die Entscheidung trifft immer ein Mensch im Verein. Nachwuchsligen verarbeiten wir nicht. Wer auch in einer Nachwuchsliga spielt, ist ausgeschlossen, bis er Spielminuten in einer Erwachsenenliga hat und in seinem Profil ein Geburtsjahr angibt, mit dem er volljährig ist.',
    scoutPodlaga:
      'Rechtsgrundlage ist das berechtigte Interesse (Art. 6 Abs. 1 lit. f DSGVO): Vereinen helfen, Spieler aus öffentlich veröffentlichten Ergebnissen zu finden. Die Kennzahlen berechnen wir jeden Tag neu und bewahren nur die letzten Berechnungen auf. Aufrufe durch Vereine werden wir 12 Monate protokollieren, um Missbrauch zu verhindern und einem Spieler auf Anfrage sagen zu können, welche Vereine ihn angesehen haben.',
    scoutPrivolitev:
      'Ein Spieler mit übernommenem Profil kann angeben, dass er offen für einen Wechsel ist, sein Geburtsjahr, gewünschte Regionen und die Erlaubnis zur Kontaktaufnahme. Das ist eine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO): Sie sehen nur Vereine in Scout, sie kann jederzeit im Profil widerrufen werden, und beim Widerruf löschen wir die Daten. Ein Verein schreibt dem Spieler nur über Scout und sieht seine E-Mail-Adresse nicht.',
    scoutUgovor:
      'Widerspruch: Klicke im übernommenen Profil auf Mich in Scout verbergen oder schreibe an <eposta>info@slff.eu</eposta> mit einem Link zur Spielerseite. Innerhalb von 14 Tagen verbergen wir den Spieler in Scout in allen unseren Ligen dieses Landes, auch bei späteren Importen. Im Fantasy-Spiel bleibt er.',
```

- [ ] **Step 8: Srbščina (latinica)**

`src/i18n/sr/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Klubovi koji traže igrače u SLFF Scoutu vide pokazatelje iz tvojih utakmica. Ovde dodaješ ono što vide samo uz tvoj pristanak.',
    odprt: 'Otvoren za transfer',
    letnik: 'Godina rođenja (Scout je samo za punoletne)',
    regije: 'Gde bi igrao (savezi)',
    kontakt: 'Klubovi mogu da mi pišu preko Scouta (moja imejl adresa ostaje skrivena)',
    privolitev: 'Čuvanjem pristaješ da ovo vide klubovi u Scoutu. Pristanak možeš da povučeš u bilo kom trenutku i podatke brišemo. <pravno>Više o Scoutu</pravno>',
    shrani: 'Sačuvaj',
    shranjeno: 'Sačuvano.',
    preklici: 'Povuci pristanak',
    preklicano: 'Pristanak povučen, podaci obrisani.',
    skrij: 'Sakrij me iz Scouta',
    skrijPotrdi: 'Da te sakrijemo iz Scouta? Klubovi te neće videti, u fantasy igri ostaješ. Pristanak se briše.',
    skrit: 'Skriven si iz Scouta. Klubovi te ne vide.',
    razkrij: 'Povuci prigovor',
    napaka: 'Nije uspelo. Pokušaj ponovo.',
    ugovorPovezava: 'Ne želiš da budeš u SLFF Scoutu? Ovako se prigovara.',
  },
```

`src/i18n/sr/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: traženje igrača za klubove',
    scoutKaj:
      'Iz istih javnih zapisnika izračunavamo pokazatelje igrača seniorskih liga: udeo minuta, golove, uticaj na terenu, primljene golove, kartone i put kroz sezone, prilagođene snazi lige. To su pokazatelji iz podataka utakmica, a ne ocena osobe. Videće ih klubovi sa pretplatom na SLFF Scout koji traže igrače; odluku uvek donosi čovek u klubu. Omladinske lige ne obrađujemo. Ko igra i u omladinskoj ligi, isključen je dok nema minuta u seniorskoj ligi i na svom profilu ne upiše godinu rođenja sa kojom je punoletan.',
    scoutPodlaga:
      'Pravni osnov je legitimni interes (član 6 stav 1 tačka (f) GDPR): pomoći klubovima da pronađu igrače iz javno objavljenih rezultata. Pokazatelje izračunavamo svaki dan iznova i čuvamo samo poslednje proračune. Preglede klubova beležićemo 12 meseci kako bismo sprečili zloupotrebu i kako bismo igraču na zahtev rekli koji su ga klubovi gledali.',
    scoutPrivolitev:
      'Igrač sa preuzetim profilom može da doda da je otvoren za transfer, godinu rođenja, željene regione i dozvolu za kontakt. To je pristanak (član 6 stav 1 tačka (a) GDPR): vide ga samo klubovi u Scoutu, može se povući u bilo kom trenutku na profilu, a posle povlačenja podatke brišemo. Klub igraču piše samo preko Scouta i ne vidi njegovu imejl adresu.',
    scoutUgovor:
      'Prigovor: na preuzetom profilu klikni Sakrij me iz Scouta ili piši na <eposta>info@slff.eu</eposta> sa linkom na stranicu igrača. U roku od 14 dana igrača skrivamo iz Scouta u svim našim ligama te države, i pri kasnijim uvozima. U fantasy igri ostaje.',
```

- [ ] **Step 9: Romunščina**

`src/i18n/ro/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Cluburile care caută jucători văd în SLFF Scout indicatori din meciurile tale. Aici adaugi ce văd doar cu acordul tău.',
    odprt: 'Deschis pentru un transfer',
    letnik: 'Anul nașterii (Scout este doar pentru majori)',
    regije: 'Unde ai juca (asociații)',
    kontakt: 'Cluburile îmi pot scrie prin Scout (adresa mea de e-mail rămâne ascunsă)',
    privolitev: 'Prin salvare îți dai acordul ca acestea să fie văzute de cluburile din Scout. Poți retrage acordul oricând și ștergem datele. <pravno>Mai multe despre Scout</pravno>',
    shrani: 'Salvează',
    shranjeno: 'Salvat.',
    preklici: 'Retrage acordul',
    preklicano: 'Acord retras, date șterse.',
    skrij: 'Ascunde-mă din Scout',
    skrijPotrdi: 'Te ascundem din Scout? Cluburile nu te vor mai vedea, rămâi în jocul fantasy. Acordul tău se șterge.',
    skrit: 'Ești ascuns din Scout. Cluburile nu te văd.',
    razkrij: 'Retrage opoziția',
    napaka: 'Nu a reușit. Încearcă din nou.',
    ugovorPovezava: 'Nu vrei să fii în SLFF Scout? Iată cum te opui.',
  },
```

`src/i18n/ro/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: căutare de jucători pentru cluburi',
    scoutKaj:
      'Din aceleași rapoarte publice de joc calculăm indicatori pentru jucătorii din ligile de seniori: ponderea minutelor, goluri, impact pe teren, goluri primite, cartonașe și evoluția de la un sezon la altul, ajustate după puterea ligii. Sunt indicatori din datele meciurilor, nu o evaluare a persoanei. Îi vor vedea cluburile cu abonament SLFF Scout care caută jucători; decizia o ia întotdeauna un om din club. Nu prelucrăm ligile de juniori. Cine joacă și într-o ligă de juniori este exclus până când are minute într-o ligă de seniori și își introduce pe profil un an al nașterii cu care este major.',
    scoutPodlaga:
      'Temeiul juridic este interesul legitim (articolul 6 alineatul (1) litera (f) din GDPR): să ajutăm cluburile să găsească jucători din rezultate publicate public. Recalculăm indicatorii în fiecare zi și păstrăm doar ultimele calcule. Vom înregistra vizualizările cluburilor timp de 12 luni, pentru a preveni abuzurile și pentru a-i putea spune unui jucător, la cerere, ce cluburi l-au văzut.',
    scoutPrivolitev:
      'Un jucător cu profil revendicat poate adăuga că este deschis pentru un transfer, anul nașterii, regiunile dorite și permisiunea de a fi contactat. Este un consimțământ (articolul 6 alineatul (1) litera (a) din GDPR): îl văd doar cluburile din Scout, poate fi retras oricând pe profil, iar la retragere ștergem datele. Un club îi scrie jucătorului doar prin Scout și nu îi vede adresa de e-mail.',
    scoutUgovor:
      'Opoziție: pe profilul revendicat apasă Ascunde-mă din Scout sau scrie la <eposta>info@slff.eu</eposta> cu un link către pagina jucătorului. În 14 zile ascundem jucătorul din Scout în toate ligile noastre din acea țară, inclusiv la importurile ulterioare. În jocul fantasy rămâne.',
```

- [ ] **Step 10: Estonščina**

`src/i18n/et/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Mängijaid otsivad klubid näevad SLFF Scoutis sinu mängude põhjal arvutatud näitajaid. Siin lisad selle, mida nad näevad ainult sinu nõusolekul.',
    odprt: 'Valmis üleminekuks',
    letnik: 'Sünniaasta (Scout on ainult täisealistele)',
    regije: 'Kus sa mängiksid (liidud)',
    kontakt: 'Klubid võivad mulle Scouti kaudu kirjutada (minu e-posti aadress jääb varjatuks)',
    privolitev: 'Salvestades nõustud, et Scouti klubid seda näevad. Nõusoleku saad igal ajal tagasi võtta ja me kustutame andmed. <pravno>Rohkem Scoutist</pravno>',
    shrani: 'Salvesta',
    shranjeno: 'Salvestatud.',
    preklici: 'Võta nõusolek tagasi',
    preklicano: 'Nõusolek tagasi võetud, andmed kustutatud.',
    skrij: 'Peida mind Scoutist',
    skrijPotrdi: 'Kas peidame sind Scoutist? Klubid ei näe sind, fantaasiamängu jääd alles. Sinu nõusolek kustutatakse.',
    skrit: 'Oled Scoutist peidetud. Klubid sind ei näe.',
    razkrij: 'Võta vastuväide tagasi',
    napaka: 'Ei õnnestunud. Proovi uuesti.',
    ugovorPovezava: 'Ei soovi olla SLFF Scoutis? Nii esitad vastuväite.',
  },
```

`src/i18n/et/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: mängijate otsing klubidele',
    scoutKaj:
      'Samadest avalikest mängu protokollidest arvutame täiskasvanute liigade mängijatele näitajaid: mänguminutite osakaal, väravad, mõju väljakul, lastud väravad, kaardid ja areng hooaegade lõikes, kohandatud liiga tugevusele. Need on mänguandmete näitajad, mitte isiku hinnang. Neid näevad SLFF Scouti tellimusega klubid, kes otsivad mängijaid; otsuse teeb alati inimene klubis. Noorteliigasid me ei töötle. Kes mängib ka noorteliigas, on välja jäetud, kuni tal on mänguminuteid täiskasvanute liigas ja ta sisestab oma profiilil sünniaasta, millega ta on täisealine.',
    scoutPodlaga:
      'Õiguslik alus on õigustatud huvi (GDPR artikli 6 lõike 1 punkt f): aidata klubidel leida mängijaid avalikult avaldatud tulemuste põhjal. Arvutame näitajad iga päev uuesti ja säilitame ainult viimased arvutused. Klubide vaatamisi hakkame logima 12 kuud, et vältida kuritarvitamist ja et saaksime mängijale tema soovil öelda, millised klubid teda vaatasid.',
    scoutPrivolitev:
      'Ülevõetud profiiliga mängija saab lisada, et ta on valmis üleminekuks, oma sünniaasta, soovitud piirkonnad ja loa temaga ühendust võtta. See on nõusolek (GDPR artikli 6 lõike 1 punkt a): seda näevad ainult Scouti klubid, selle saab igal ajal profiilil tagasi võtta ja tagasivõtmisel kustutame andmed. Klubi kirjutab mängijale ainult Scouti kaudu ega näe tema e-posti aadressi.',
    scoutUgovor:
      'Vastuväide: klõpsa ülevõetud profiilil Peida mind Scoutist või kirjuta aadressile <eposta>info@slff.eu</eposta> ja lisa link mängija lehele. 14 päeva jooksul peidame mängija Scoutist kõigis meie selle riigi liigades, ka hilisematel importidel. Fantaasiamängus jääb ta alles.',
```

- [ ] **Step 11: Poljščina**

`src/i18n/pl/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Kluby szukające zawodników widzą w SLFF Scout wskaźniki z twoich meczów. Tutaj dodajesz to, co widzą tylko za twoją zgodą.',
    odprt: 'Otwarty na transfer',
    letnik: 'Rok urodzenia (Scout jest tylko dla pełnoletnich)',
    regije: 'Gdzie byś grał (związki)',
    kontakt: 'Kluby mogą do mnie pisać przez Scout (mój e-mail pozostaje ukryty)',
    privolitev: 'Zapisując, zgadzasz się, aby kluby w Scout to widziały. Zgodę możesz wycofać w każdej chwili, a dane usuniemy. <pravno>Więcej o Scout</pravno>',
    shrani: 'Zapisz',
    shranjeno: 'Zapisano.',
    preklici: 'Wycofaj zgodę',
    preklicano: 'Zgoda wycofana, dane usunięte.',
    skrij: 'Ukryj mnie w Scout',
    skrijPotrdi: 'Ukryć cię w Scout? Kluby nie będą cię widzieć, w grze fantasy zostajesz. Twoja zgoda zostanie usunięta.',
    skrit: 'Jesteś ukryty w Scout. Kluby cię nie widzą.',
    razkrij: 'Wycofaj sprzeciw',
    napaka: 'Nie udało się. Spróbuj ponownie.',
    ugovorPovezava: 'Nie chcesz być w SLFF Scout? Tak zgłosisz sprzeciw.',
  },
```

`src/i18n/pl/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: wyszukiwanie zawodników dla klubów',
    scoutKaj:
      'Z tych samych publicznych protokołów meczowych obliczamy wskaźniki zawodników lig seniorskich: udział minut, gole, wpływ na boisku, stracone gole, kartki i rozwój na przestrzeni sezonów, dostosowane do siły ligi. To wskaźniki z danych meczowych, a nie ocena osoby. Zobaczą je kluby z subskrypcją SLFF Scout, które szukają zawodników; decyzję zawsze podejmuje człowiek w klubie. Nie przetwarzamy lig młodzieżowych. Kto gra także w lidze młodzieżowej, jest wykluczony, dopóki nie ma minut w lidze seniorskiej i nie poda na swoim profilu roku urodzenia, z którym jest pełnoletni.',
    scoutPodlaga:
      'Podstawą prawną jest prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO): pomoc klubom w znalezieniu zawodników na podstawie publicznie opublikowanych wyników. Wskaźniki obliczamy codziennie od nowa i przechowujemy tylko ostatnie obliczenia. Wyświetlenia przez kluby będziemy rejestrować przez 12 miesięcy, aby zapobiegać nadużyciom i aby na prośbę zawodnika powiedzieć mu, które kluby go oglądały.',
    scoutPrivolitev:
      'Zawodnik z przejętym profilem może dodać, że jest otwarty na transfer, rok urodzenia, preferowane regiony i zgodę na kontakt. To zgoda (art. 6 ust. 1 lit. a RODO): widzą ją tylko kluby w Scout, można ją w każdej chwili wycofać na profilu, a po wycofaniu usuwamy dane. Klub pisze do zawodnika tylko przez Scout i nie widzi jego adresu e-mail.',
    scoutUgovor:
      'Sprzeciw: na przejętym profilu kliknij Ukryj mnie w Scout albo napisz na <eposta>info@slff.eu</eposta> z linkiem do strony zawodnika. W ciągu 14 dni ukryjemy zawodnika w Scout we wszystkich naszych ligach danego kraju, także przy późniejszych importach. W grze fantasy zostaje.',
```

- [ ] **Step 12: Španščina**

`src/i18n/es/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Los clubes que buscan jugadores ven en SLFF Scout indicadores de tus partidos. Aquí añades lo que solo ven con tu consentimiento.',
    odprt: 'Abierto a un traspaso',
    letnik: 'Año de nacimiento (Scout es solo para mayores de edad)',
    regije: 'Dónde jugarías (federaciones)',
    kontakt: 'Los clubes pueden escribirme a través de Scout (mi correo sigue oculto)',
    privolitev: 'Al guardar, consientes que los clubes de Scout vean esto. Puedes retirar el consentimiento en cualquier momento y borramos los datos. <pravno>Más sobre Scout</pravno>',
    shrani: 'Guardar',
    shranjeno: 'Guardado.',
    preklici: 'Retirar consentimiento',
    preklicano: 'Consentimiento retirado, datos borrados.',
    skrij: 'Ocúltame de Scout',
    skrijPotrdi: '¿Te ocultamos de Scout? Los clubes no te verán; sigues en el juego fantasy. Tu consentimiento se borra.',
    skrit: 'Estás oculto en Scout. Los clubes no te ven.',
    razkrij: 'Retirar oposición',
    napaka: 'No ha funcionado. Inténtalo de nuevo.',
    ugovorPovezava: '¿No quieres estar en SLFF Scout? Así te opones.',
  },
```

`src/i18n/es/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: búsqueda de jugadores para clubes',
    scoutKaj:
      'A partir de las mismas actas públicas calculamos indicadores de los jugadores de ligas sénior: porcentaje de minutos, goles, impacto en el campo, goles encajados, tarjetas y evolución a lo largo de las temporadas, ajustados a la fuerza de la liga. Son indicadores de datos de partidos, no una valoración de la persona. Los verán los clubes con suscripción a SLFF Scout que buscan jugadores; la decisión la toma siempre una persona del club. No tratamos ligas juveniles. Quien juega también en una liga juvenil queda excluido hasta que tenga minutos en una liga sénior e indique en su perfil un año de nacimiento con el que es mayor de edad.',
    scoutPodlaga:
      'La base jurídica es el interés legítimo (artículo 6, apartado 1, letra f, del RGPD): ayudar a los clubes a encontrar jugadores a partir de resultados publicados. Recalculamos los indicadores cada día y solo conservamos los últimos cálculos. Registraremos las consultas de los clubes durante 12 meses para evitar abusos y poder decir a un jugador, si lo pide, qué clubes lo han consultado.',
    scoutPrivolitev:
      'Un jugador con perfil reclamado puede añadir que está abierto a un traspaso, su año de nacimiento, las regiones que prefiere y el permiso para ser contactado. Es un consentimiento (artículo 6, apartado 1, letra a, del RGPD): solo lo ven los clubes de Scout, se puede retirar en cualquier momento en el perfil y, al retirarlo, borramos los datos. Un club escribe al jugador solo a través de Scout y no ve su correo electrónico.',
    scoutUgovor:
      'Oposición: en un perfil reclamado pulsa Ocúltame de Scout o escribe a <eposta>info@slff.eu</eposta> con un enlace a la página del jugador. En un plazo de 14 días ocultamos al jugador en Scout en todas nuestras ligas de ese país, también en importaciones posteriores. En el juego fantasy sigue.',
```

- [ ] **Step 13: Latvijščina**

`src/i18n/lv/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Klubi, kas meklē spēlētājus, SLFF Scout redz rādītājus no tavām spēlēm. Šeit pievieno to, ko tie redz tikai ar tavu piekrišanu.',
    odprt: 'Atvērts pārejai',
    letnik: 'Dzimšanas gads (Scout ir tikai pilngadīgajiem)',
    regije: 'Kur tu spēlētu (federācijas)',
    kontakt: 'Klubi var man rakstīt caur Scout (mana e-pasta adrese paliek slēpta)',
    privolitev: 'Saglabājot tu piekrīti, ka to redz klubi Scout. Piekrišanu vari atsaukt jebkurā laikā, un mēs dzēšam datus. <pravno>Vairāk par Scout</pravno>',
    shrani: 'Saglabāt',
    shranjeno: 'Saglabāts.',
    preklici: 'Atsaukt piekrišanu',
    preklicano: 'Piekrišana atsaukta, dati dzēsti.',
    skrij: 'Paslēpt mani no Scout',
    skrijPotrdi: 'Paslēpt tevi no Scout? Klubi tevi neredzēs, fantāzijas spēlē tu paliec. Tava piekrišana tiek dzēsta.',
    skrit: 'Tu esi paslēpts no Scout. Klubi tevi neredz.',
    razkrij: 'Atsaukt iebildumu',
    napaka: 'Neizdevās. Mēģini vēlreiz.',
    ugovorPovezava: 'Nevēlies būt SLFF Scout? Lūk, kā iebilst.',
  },
```

`src/i18n/lv/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: spēlētāju meklēšana klubiem',
    scoutKaj:
      'No tiem pašiem publiskajiem spēļu protokoliem mēs aprēķinām pieaugušo līgu spēlētāju rādītājus: spēles minūšu daļu, vārtus, ietekmi laukumā, ielaistos vārtus, kartītes un attīstību pa sezonām, pielāgotus līgas spēkam. Tie ir rādītāji no spēļu datiem, nevis personas vērtējums. Tos redzēs klubi ar SLFF Scout abonementu, kas meklē spēlētājus; lēmumu vienmēr pieņem cilvēks klubā. Jaunatnes līgas mēs neapstrādājam. Kas spēlē arī jaunatnes līgā, ir izslēgts, līdz viņam ir spēles minūtes pieaugušo līgā un savā profilā viņš norāda dzimšanas gadu, ar kuru ir pilngadīgs.',
    scoutPodlaga:
      'Juridiskais pamats ir leģitīmās intereses (VDAR 6. panta 1. punkta f) apakšpunkts): palīdzēt klubiem atrast spēlētājus no publiski publicētiem rezultātiem. Rādītājus pārrēķinām katru dienu un glabājam tikai pēdējos aprēķinus. Klubu skatījumus reģistrēsim 12 mēnešus, lai novērstu ļaunprātīgu izmantošanu un lai pēc pieprasījuma varētu spēlētājam pateikt, kuri klubi viņu skatījuši.',
    scoutPrivolitev:
      'Spēlētājs ar pārņemtu profilu var pievienot, ka ir atvērts pārejai, savu dzimšanas gadu, vēlamos reģionus un atļauju sazināties. Tā ir piekrišana (VDAR 6. panta 1. punkta a) apakšpunkts): to redz tikai klubi Scout, to var jebkurā laikā atsaukt profilā, un pēc atsaukšanas mēs dzēšam datus. Klubs spēlētājam raksta tikai caur Scout un neredz viņa e-pasta adresi.',
    scoutUgovor:
      'Iebildums: pārņemtajā profilā noklikšķini Paslēpt mani no Scout vai raksti uz <eposta>info@slff.eu</eposta> ar saiti uz spēlētāja lapu. 14 dienu laikā mēs paslēpjam spēlētāju no Scout visās mūsu šīs valsts līgās, arī turpmākajos importos. Fantāzijas spēlē viņš paliek.',
```

- [ ] **Step 14: Makedonščina**

`src/i18n/mk/igralci.ts`:

```ts
  scout: {
    naslov: 'SLFF Scout',
    opis: 'Клубовите што бараат играчи во SLFF Scout гледаат показатели од твоите натпревари. Тука додаваш што гледаат само со твоја согласност.',
    odprt: 'Отворен за трансфер',
    letnik: 'Година на раѓање (Scout е само за полнолетни)',
    regije: 'Каде би играл (сојузи)',
    kontakt: 'Клубовите можат да ми пишуваат преку Scout (мојата е-пошта останува скриена)',
    privolitev: 'Со зачувување се согласуваш клубовите во Scout да го гледаат ова. Согласноста можеш да ја повлечеш во секое време и ги бришеме податоците. <pravno>Повеќе за Scout</pravno>',
    shrani: 'Зачувај',
    shranjeno: 'Зачувано.',
    preklici: 'Повлечи согласност',
    preklicano: 'Согласноста е повлечена, податоците се избришани.',
    skrij: 'Скриј ме од Scout',
    skrijPotrdi: 'Да те скриеме од Scout? Клубовите нема да те гледаат, во фантази играта остануваш. Твојата согласност се брише.',
    skrit: 'Скриен си од Scout. Клубовите не те гледаат.',
    razkrij: 'Повлечи приговор',
    napaka: 'Не успеа. Обиди се повторно.',
    ugovorPovezava: 'Не сакаш да бидеш во SLFF Scout? Вака поднесуваш приговор.',
  },
```

`src/i18n/mk/racun.ts`:

```ts
    scoutNaslov: 'SLFF Scout: барање играчи за клубови',
    scoutKaj:
      'Од истите јавни записници пресметуваме показатели за играчите во сениорските лиги: удел во минутите, голови, влијание на теренот, примени голови, картони и патот низ сезоните, прилагодени на јачината на лигата. Тоа се показатели од податоците за натпреварите, а не оценка на личноста. Ќе ги гледаат клубовите со претплата на SLFF Scout што бараат играчи; одлуката секогаш ја носи човек во клубот. Младинските лиги не ги обработуваме. Кој игра и во младинска лига, е исклучен додека нема минути во сениорска лига и на својот профил не внесе година на раѓање со која е полнолетен.',
    scoutPodlaga:
      'Правната основа е легитимниот интерес (член 6 став 1 точка (f) од GDPR): да им помогнеме на клубовите да најдат играчи од јавно објавени резултати. Показателите ги пресметуваме секој ден одново и ги чуваме само последните пресметки. Прегледите од клубовите ќе ги бележиме 12 месеци за да спречиме злоупотреба и за да можеме на играчот на барање да му кажеме кои клубови го гледале.',
    scoutPrivolitev:
      'Играч со преземен профил може да додаде дека е отворен за трансфер, година на раѓање, посакувани региони и дозвола за контакт. Тоа е согласност (член 6 став 1 точка (a) од GDPR): ја гледаат само клубовите во Scout, може да се повлече во секое време на профилот и по повлекувањето ги бришеме податоците. Клубот му пишува на играчот само преку Scout и не ја гледа неговата е-пошта.',
    scoutUgovor:
      'Приговор: на преземениот профил кликни Скриј ме од Scout или пиши на <eposta>info@slff.eu</eposta> со линк до страницата на играчот. Во рок од 14 дена го криеме играчот од Scout во сите наши лиги од таа држава, и при подоцнежни увози. Во фантази играта останува.',
```

- [ ] **Step 15: Datum zadnje spremembe (vseh 14)**

V `racun.ts` vsakega jezika zamenjaj vrstico `zadnjaSprememba` s:

| jezik | nova vrednost |
|---|---|
| sl | `'Zadnja sprememba: 16. oktober 2026'` |
| hr | `'Zadnja izmjena: 16. listopada 2026.'` |
| sk | `'Posledná zmena: 16. októbra 2026'` |
| cs | `'Poslední změna: 16. října 2026'` |
| hu | `'Utolsó módosítás: 2026. október 16.'` |
| de | `'Zuletzt geändert: 16. Oktober 2026'` |
| sr | `'Poslednja izmena: 16. oktobra 2026.'` |
| ro | `'Ultima modificare: 16 octombrie 2026'` |
| et | `'Viimati muudetud: 16. oktoober 2026'` |
| pl | `'Ostatnia zmiana: 16 października 2026'` |
| es | `'Última modificación: 16 de octubre de 2026'` |
| lv | `'Pēdējās izmaiņas: 2026. gada 16. oktobris'` |
| mk | `'Последна измена: 16 октомври 2026.'` |
| en | `'Last updated: 16 October 2026'` |

```bash
grep -h "zadnjaSprememba:" src/i18n/*/racun.ts   # vseh 14 vsebuje 16
```

- [ ] **Step 16: Preveri**

```bash
grep -rn "[—–]" src/i18n/*/igralci.ts src/i18n/*/racun.ts | grep -i scout   # mora biti prazno
npm run typecheck && npm run smoke
```

Expected: oboje zeleno (`prevodi xx: vsi nizi prevedeni` in `parametri in oznake kot v izvirniku` PASS za vseh 13).

- [ ] **Step 17: Commit**

```bash
git add src/i18n
git commit -F - <<'EOF'
feat(scout): nizi za privolitev, ugovor in razdelek Scout na /legal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Privolitev in ugovor na prevzetem profilu

**Files:**
- Create: `src/components/ScoutIgralca.tsx`
- Modify: `src/components/PrevzemIgralca.tsx`
- Modify: `scripts/smoke.jsx`

**Interfaces:**
- Consumes: RPC `scout_moj_profil`, `scout_shrani_privolitev`, `scout_preklici_privolitev`, `scout_ugovor`; tabela `federations` (`id, name, country_id, active, sort_order`); ključi `igralci.scout.*`; `Link` iz `./Povezava`.
- Produces: `export function ScoutIgralca({ glavni }: { glavni: number }): JSX.Element | null`.

- [ ] **Step 1: Smoke izriše komponento (pade)**

V `scripts/smoke.jsx` za vrstico `import PrevzemIgralca from '../src/components/PrevzemIgralca'` dodaj:

```jsx
import { ScoutIgralca } from '../src/components/ScoutIgralca'
```

V seznam `strani` za vrstico `['Prevzem igralca', …]` dodaj:

```jsx
  ['Scout igralca', () => <div><ScoutIgralca glavni={1} /></div>, '/player/1'],
```

```bash
npm run smoke
```

Expected: FAIL (modul `../src/components/ScoutIgralca` ne obstaja).

- [ ] **Step 2: Napiši `src/components/ScoutIgralca.tsx`**

```tsx
// SLFF Scout na prevzetem profilu (faza 2): privolitev (odprt za prestop,
// letnica, regije, stik) in ugovor. Vidi jo le potrjeni lastnik med urejanjem
// profila in le, ko je država lige odprta za Scout. Vsa preverjanja so v bazi
// (scout_*, migracija 20261016160100).
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from './Povezava'
import { t, tx } from '../i18n'

interface Stanje {
  drzava_odprta: boolean
  country_id: number
  skrit: boolean
  odprt_za_prestop: boolean | null
  letnik: number | null
  regije: number[] | null
  kontakt_dovoljen: boolean | null
}

/** Najmlajša dovoljena letnica: polnoleten vse tekoče leto (isto pravilo kot scout_shrani_privolitev). */
const NAJMLAJSI = new Date().getFullYear() - 19

export function ScoutIgralca({ glavni }: { glavni: number }) {
  const [stanje, setStanje] = useState<Stanje | null>(null)
  const [zveze, setZveze] = useState<{ id: number; name: string }[]>([])
  const [odprt, setOdprt] = useState(false)
  const [letnik, setLetnik] = useState('')
  const [regije, setRegije] = useState<number[]>([])
  const [kontakt, setKontakt] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data } = await supabase.rpc('scout_moj_profil', { p_player_id: glavni })
    const s: Stanje | null = data?.[0] ?? null
    setStanje(s)
    if (!s?.drzava_odprta) return
    setOdprt(!!s.odprt_za_prestop)
    setLetnik(s.letnik ? String(s.letnik) : '')
    setRegije(s.regije ?? [])
    setKontakt(!!s.kontakt_dovoljen)
    const { data: z } = await supabase
      .from('federations')
      .select('id, name')
      .eq('country_id', s.country_id)
      .eq('active', true)
      .order('sort_order')
    setZveze(z ?? [])
  }, [glavni])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  if (!stanje?.drzava_odprta) return null

  async function klic(fn: () => PromiseLike<{ error: unknown }>, uspeh: string) {
    setNapaka(null)
    setSporocilo(null)
    setDela(true)
    const { error } = await fn()
    setDela(false)
    if (error) return setNapaka(t('igralci.scout.napaka'))
    setSporocilo(uspeh)
    await nalozi()
  }

  function shrani(e: FormEvent) {
    e.preventDefault()
    void klic(
      () =>
        supabase.rpc('scout_shrani_privolitev', {
          p_player_id: glavni,
          p_odprt: odprt,
          p_letnik: Number(letnik),
          p_regije: regije,
          p_kontakt: kontakt,
        }),
      t('igralci.scout.shranjeno'),
    )
  }

  function ugovor(skrij: boolean) {
    void klic(() => supabase.rpc('scout_ugovor', { p_player_id: glavni, p_skrij: skrij }), t('igralci.scout.shranjeno'))
  }

  return (
    <section className="kartica space-y-3 p-3 text-sm" aria-label={t('igralci.scout.naslov')}>
      <h3 className="font-bold">{t('igralci.scout.naslov')}</h3>
      <p className="text-slate-300">{t('igralci.scout.opis')}</p>
      {stanje.skrit ? (
        <>
          <p className="text-amber-200">{t('igralci.scout.skrit')}</p>
          <button type="button" disabled={dela} onClick={() => ugovor(false)} className="gumb-tih disabled:opacity-50">
            {t('igralci.scout.razkrij')}
          </button>
        </>
      ) : (
        <form onSubmit={shrani} className="space-y-3">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={odprt} onChange={(e) => setOdprt(e.target.checked)} />
            {t('igralci.scout.odprt')}
          </label>
          <label className="block space-y-1">
            <span className="text-slate-300">{t('igralci.scout.letnik')}</span>
            <input
              type="number"
              required
              min={1940}
              max={NAJMLAJSI}
              value={letnik}
              onChange={(e) => setLetnik(e.target.value)}
              className="w-32 rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <fieldset className="space-y-1">
            <legend className="text-slate-300">{t('igralci.scout.regije')}</legend>
            <div className="flex flex-wrap gap-x-4">
              {zveze.map((z) => (
                <label key={z.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={regije.includes(z.id)}
                    onChange={(e) =>
                      setRegije((r) => (e.target.checked ? [...r, z.id] : r.filter((x) => x !== z.id)))
                    }
                  />
                  {z.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={kontakt} onChange={(e) => setKontakt(e.target.checked)} />
            {t('igralci.scout.kontakt')}
          </label>
          <p className="text-xs text-slate-400">
            {tx('igralci.scout.privolitev', {}, {
              pravno: (v) => (
                <Link to="/legal#scout" className="text-gnl-300 underline">
                  {v}
                </Link>
              ),
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={dela} className="gumb-glavni disabled:opacity-50">
              {t('igralci.scout.shrani')}
            </button>
            {stanje.letnik != null && (
              <button
                type="button"
                disabled={dela}
                onClick={() =>
                  void klic(
                    () => supabase.rpc('scout_preklici_privolitev', { p_player_id: glavni }),
                    t('igralci.scout.preklicano'),
                  )
                }
                className="gumb-tih disabled:opacity-50"
              >
                {t('igralci.scout.preklici')}
              </button>
            )}
            <button
              type="button"
              disabled={dela}
              onClick={() => window.confirm(t('igralci.scout.skrijPotrdi')) && ugovor(true)}
              className="text-xs text-slate-500 hover:text-rose-300"
            >
              {t('igralci.scout.skrij')}
            </button>
          </div>
        </form>
      )}
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {sporocilo && <p className="text-gnl-300">{sporocilo}</p>}
    </section>
  )
}
```

- [ ] **Step 3: Vključi v `src/components/PrevzemIgralca.tsx`**

Za vrstico `import PreverjeniProfil from './PreverjeniProfil'` dodaj:

```tsx
import { ScoutIgralca } from './ScoutIgralca'
```

Zamenjaj

```tsx
          naOdpoved={async () => {
            if (!mojPotrjen || !window.confirm(t('igralci.prevzem.odpovejPotrdi'))) return
            if (await rpc(() => supabase.rpc('preklici_moj_zahtevek', { p_id: mojPotrjen.id }))) setUrejam(false)
          }}
        />
      )}
```

z

```tsx
          naOdpoved={async () => {
            if (!mojPotrjen || !window.confirm(t('igralci.prevzem.odpovejPotrdi'))) return
            if (await rpc(() => supabase.rpc('preklici_moj_zahtevek', { p_id: mojPotrjen.id }))) setUrejam(false)
          }}
        />
      )}

      {/* SLFF Scout: privolitev in ugovor (le lastnik, le odprta država) */}
      {jeLastnik && urejam && potrjen && <ScoutIgralca glavni={potrjen.glavni} />}
```

- [ ] **Step 4: Preveri**

```bash
npm run typecheck && npm run smoke
```

Expected: zeleno, `izris: Scout igralca` PASS. Ta vnos dokaže le, da se modul uvozi in izriše brez napake: `renderToString` ne požene `useEffect`, zato RPC ni klican in komponenta vrne `null`. Obnašanje obrazca preveri Step 5 ročno, pravila pa varnostni testi naloge 1.

- [ ] **Step 5: Ročni preizkus (lokalno)**

```bash
npm run dev
```

Prijavi se kot uporabnik s potrjenim profilom slovenskega igralca (lokalno: `update zahtevki_igralca set status = 'potrjen', potrdil = 'admin' where id = <id>` prek `docker exec supabase_db_mnzgorenjska psql -U postgres`), odpri `/player/<glavni>`, klikni Uredi: razdelek SLFF Scout; shrani letnico 2000 in regijo; osveži (vrednosti ostanejo); Prekliči privolitev (polja prazna); Skrij me iz Scouta (besedilo skrit, gumb Prekliči ugovor); Prekliči ugovor.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScoutIgralca.tsx src/components/PrevzemIgralca.tsx scripts/smoke.jsx
git commit -F - <<'EOF'
feat(scout): privolitev in ugovor na prevzetem profilu igralca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Povezava za ugovor na strani igralca in razdelek Scout na `/legal`

**Files:**
- Modify: `src/pages/Igralec.tsx`
- Modify: `src/pages/Pravno.tsx`
- Modify: `scripts/smoke.jsx`

**Interfaces:**
- Consumes: `racun.pravno.scout*`, `igralci.scout.ugovorPovezava`; obstoječi `eposta` v `Pravno.tsx`; `Link` iz `../components/Povezava`.
- Produces: sidro `/legal#scout` (element `<section id="scout">`).

- [ ] **Step 1: Smoke preveri sidro (pade)**

V `scripts/smoke.jsx` za vrstico `import Piva from '../src/pages/Piva'` dodaj:

```jsx
import Pravno from '../src/pages/Pravno'
```

Takoj za zanko `for (const [ime, Komponenta, pot] of strani) { … }` dodaj:

```jsx
preveri('pravno: razdelek Scout s sidrom #scout (povezava za ugovor)',
  renderToString(
    <StaticRouter location="/legal">
      <AuthProvider>
        <TekmovanjeProvider>
          <Pravno />
        </TekmovanjeProvider>
      </AuthProvider>
    </StaticRouter>,
  ).includes('id="scout"'))
```

```bash
npm run smoke
```

Expected: FAIL `pravno: razdelek Scout s sidrom #scout`.

- [ ] **Step 2: Razdelek v `src/pages/Pravno.tsx`**

Zamenjaj

```tsx
        <p className="text-slate-300">{t('racun.pravno.grbi')}</p>
      </section>
```

z

```tsx
        <p className="text-slate-300">{t('racun.pravno.grbi')}</p>
      </section>

      <section id="scout" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.scoutNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.scoutKaj')}</p>
        <p className="text-slate-300">{t('racun.pravno.scoutPodlaga')}</p>
        <p className="text-slate-300">{t('racun.pravno.scoutPrivolitev')}</p>
        <p className="text-slate-300">{tx('racun.pravno.scoutUgovor', {}, { eposta })}</p>
      </section>
```

- [ ] **Step 3: Povezava na dnu `src/pages/Igralec.tsx`**

Zamenjaj

```tsx
        </section>
      )}
    </div>
  )
}

function Stevilka({
```

z

```tsx
        </section>
      )}

      {/* ugovor proti SLFF Scout: na vsaki javni strani igralca (spec, razdelek 2) */}
      {!anonimiziran && !!slugLige && !jeMladinskiSlug(slugLige) && (
        <p className="text-xs text-slate-500">
          <Link to="/legal#scout" className="underline hover:text-slate-300">
            {t('igralci.scout.ugovorPovezava')}
          </Link>
        </p>
      )}
    </div>
  )
}

function Stevilka({
```

- [ ] **Step 4: Preveri**

```bash
npm run typecheck && npm run smoke
```

Expected: zeleno. Ročno (`npm run dev`): `/player/<id>` članske lige ima na dnu povezavo (mladinska liga in anonimiziran igralec je nimata), klik odpre `/legal#scout` in se pomakne na razdelek.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Igralec.tsx src/pages/Pravno.tsx scripts/smoke.jsx
git commit -F - <<'EOF'
feat(scout): razdelek Scout na /legal in povezava za ugovor na strani igralca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Admin vpiše ugovor po mailu

**Files:**
- Modify: `src/pages/Administracija.tsx`

**Interfaces:**
- Consumes: RPC `admin_ista_oseba(p_player_id)`, `admin_scout_skrij(p_player_ids)`.
- Produces: gumb "Skrij iz Scouta (ugovor)" v Administracija → Igralec; stanje `cakaIgralec.vrsta` `'anonimizacija' | 'scout'`.

- [ ] **Step 1: Stanje**

Zamenjaj

```tsx
    | { id: number; vrsta: 'anonimizacija'; ista: IstaOseba[]; izbrani: number[] }
```

z

```tsx
    | { id: number; vrsta: 'anonimizacija' | 'scout'; ista: IstaOseba[]; izbrani: number[] }
```

- [ ] **Step 2: Funkciji**

Zamenjaj

```tsx
  async function pripraviAnonimizacijo(id: number) {
    setNapaka(null)
    const { data, error } = await supabase.rpc('admin_ista_oseba', { p_player_id: id })
    if (error) return setNapaka(error.message)
    setCakaIgralec({ id, vrsta: 'anonimizacija', ista: data ?? [], izbrani: [] })
  }
```

z

```tsx
  async function pripraviAnonimizacijo(id: number, vrsta: 'anonimizacija' | 'scout' = 'anonimizacija') {
    setNapaka(null)
    const { data, error } = await supabase.rpc('admin_ista_oseba', { p_player_id: id })
    if (error) return setNapaka(error.message)
    setCakaIgralec({ id, vrsta, ista: data ?? [], izbrani: [] })
  }

  // Ugovor proti Scoutu (mail na info@, v 14 dneh): ključi izbranih vrstic.
  async function skrijIzScouta(ids: number[]) {
    setNapaka(null)
    setShranjujemIgralca(true)
    const { data, error } = await supabase.rpc('admin_scout_skrij', { p_player_ids: ids })
    setShranjujemIgralca(false)
    setCakaIgralec(null)
    if (error) return setNapaka(error.message)
    setSporocilo(`Ugovor proti Scoutu vpisan (novih ključev: ${data}).`)
  }
```

- [ ] **Step 3: Gumb**

Zamenjaj

```tsx
                          Anonimiziraj (ugovor)
                        </button>
                      )}
```

z

```tsx
                          Anonimiziraj (ugovor)
                        </button>
                      )}
                      {!z.full_name?.startsWith('#') && (
                        <button
                          onClick={() => pripraviAnonimizacijo(z.id, 'scout')}
                          disabled={shranjujemIgralca}
                          className="text-amber-300 underline disabled:opacity-50"
                        >
                          Skrij iz Scouta (ugovor)
                        </button>
                      )}
```

- [ ] **Step 4: Potrditev**

Zamenjaj

```tsx
                                  : c.vrsta === 'klub'
                                    ? premakniKlub(z.id, c.klubId)
                                    : anonimiziraj([z.id, ...c.izbrani])
```

z

```tsx
                                  : c.vrsta === 'klub'
                                    ? premakniKlub(z.id, c.klubId)
                                    : c.vrsta === 'scout'
                                      ? skrijIzScouta([z.id, ...c.izbrani])
                                      : anonimiziraj([z.id, ...c.izbrani])
```

Zamenjaj

```tsx
                              ) : c.vrsta === 'anonimizacija' ? (
                                <>
                                  Ime igralca {prikazniIme(z.full_name)} (id {z.id}) zamenjam z{' '}
                                  <strong>#{z.id}</strong>? Za vedno — tudi uvoz ga ne vrne, nov
                                  igralec z istim imenom ali šifro v tej državi nastane že
                                  anonimiziran. Statistika in točke ostanejo.
```

z

```tsx
                              ) : c.vrsta !== 'klub' ? (
                                <>
                                  {c.vrsta === 'scout' ? (
                                    <>
                                      Igralca {prikazniIme(z.full_name)} (id {z.id}) skrijem iz Scouta?
                                      Velja za izbrane vrstice in vse z istim imenom ali šifro v tej
                                      državi, tudi ob poznejših uvozih. V fantasy igri ostane.
                                    </>
                                  ) : (
                                    <>
                                      Ime igralca {prikazniIme(z.full_name)} (id {z.id}) zamenjam z{' '}
                                      <strong>#{z.id}</strong>? Za vedno — tudi uvoz ga ne vrne, nov
                                      igralec z istim imenom ali šifro v tej državi nastane že
                                      anonimiziran. Statistika in točke ostanejo.
                                    </>
                                  )}
```

- [ ] **Step 5: Preveri**

```bash
npm run typecheck && npm run smoke
```

Expected: zeleno (`izris: Administracija` PASS). Ročno (`npm run dev`, prijava kot admin): Administracija → Igralec, poišči poljubnega lokalnega igralca po id-ju → Skrij iz Scouta (ugovor) → potrdi → sporočilo z ≥ 1 ključem; v bazi `docker exec supabase_db_mnzgorenjska psql -U postgres -c "select count(*) from scout.ugovori where player_id = <id>"` ≥ 1, nato `delete from scout.ugovori where player_id = <id>`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Administracija.tsx
git commit -F - <<'EOF'
feat(scout): admin vpiše ugovor proti Scoutu za vse vrstice osebe

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Dokumentacija

**Files:**
- Modify: `docs/scout.md`, `docs/podatkovni-model.md`, `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: imena iz nalog 1 do 7.
- Produces: opis faze 2 na mestih, ki jih CLAUDE.md zahteva ob spremembi podatkovnega modela.

- [ ] **Step 1: `docs/scout.md`**

Zamenjaj

```
- vrstico v mladinski ligi (`je_mladinski_slug`) — katerokoli, tudi staro;
  dokler faza 2 ne prinese letnice, je to edini varen znak mladoletnosti;
  mladinske lige same tudi niso v izračunu;
- `players.scout_skrit` v katerikoli vrstici (ugovor); ugovor zajame tudi
  vrstice z istim ključem imena ali šifre v državi (kot anonimizacija spodaj),
  torej isto osebo brez šifre v drugem klubu;
```

z

```
- vrstico v mladinski ligi (`je_mladinski_slug`), katerokoli, tudi staro,
  **razen** če je katera njenih vrstic pokrita s potrjenim profilom s
  privolitvijo in polnoletno letnico (`scout.odrasle_vrstice()`: glavna in
  povezane vrstice, `letnik <= letos - 19`, torej polnoleten vse leto).
  Članske minute ima vsak, ki je v izračunu. Mladinske lige same niso v
  izračunu;
- ugovor: ključ vrstice (država + ime ali država + šifra) v `scout.ugovori`;
  zajame tudi isto osebo brez šifre v drugem klubu in poznejše uvoze (kot
  anonimizacija spodaj);
```

Zamenjaj

```
`vrzeli`. Migracija `20261016140100_scout_stroj`.
```

z

```
`vrzeli`. Migracija `20261016140100_scout_stroj`. Faza 2 (migracija
`20261016160100_scout_igralec`): `ugovori` (zgoščena ključa osebe, kot
`anonimizirani_igralci`) in `privolitve` (odprt za prestop, letnica, regije
= `federations` države, stik; ključ glavna vrstica). Notranje funkcije
`kljuci_vrstic`, `vrstice_profila`, `je_skrit`, `odrasle_vrstice` (le ta je
odprta vlogi `scout_stroj`; `privolitve` stroj ne bere neposredno).
```

Zamenjaj

```
`objavljen` model in ob branju še enkrat preverijo `scout_skrit` in
`anonimiziran_at` (model nastane enkrat na dan).
```

z

```
`objavljen` model in ob branju še enkrat preverijo `scout.je_skrit(array[id])`
in `anonimiziran_at` (model nastane enkrat na dan).

## Stran igralca (faza 2)

Lastnik potrjenega profila na `/player/<id>` (Uredi) vidi razdelek SLFF Scout,
če je država lige v `scout.drzave` odprta (`ScoutIgralca.tsx`): privolitev
(`scout_shrani_privolitev`, letnica obvezna in `<= letos - 19`, regije le
zveze države) in ugovor (`scout_ugovor`). Preklic privolitve, ugovor, preklic
profila, anonimizacija in izbris računa privolitev izbrišejo. Drugi igralci
ugovarjajo po povezavi na dnu vsake strani igralca (`/legal#scout`): mail na
info@, admin v Administracija → Igralec → *Skrij iz Scouta* (`admin_scout_skrij`,
izbira vrstic osebe kot pri anonimizaciji), v 14 dneh. `kontakt_dovoljen` se
le hrani; sporočila pridejo v fazi 3.

**Soimenjak.** Stroj izloča po ključu imena brez kluba, zato soimenjakov
ugovor izloči tudi lastnika profila z istim imenom v državi (namerno, varneje
za zasebnost). Lastnikov vmesnik pa šteje le ugovore njegovih vrstic
(`scout.ugovori.player_id` med `vrstice_profila`): soimenjak ga ne zaklene,
privolitev lahko shrani, a v izračun ne vstopi, dokler ugovor soimenjaka velja.
```

- [ ] **Step 2: `docs/podatkovni-model.md`**

Zamenjaj

```
- `players.scout_skrit` → ugovor proti Scoutu (migracija 20261016140100):
  stroj izloči vso osebo (ista šifra v viru ali ime in klub v državi), fantasy
  igra ostane. Shema `scout` je zaprta (brez pravic za `anon`/`authenticated`,
  RLS s politiko le za vlogo `scout_stroj`); piše jo delavec `slff-scout`,
  `scout.drzave` pove, katere države so odprte. Podrobnosti: `docs/scout.md`
```

z

```
- **Scout: ugovor in privolitev** (migraciji 20261016140100, 20261016160100;
  `players.scout_skrit` ostane do 20261017090100 in se ne bere več).
  Ugovor je v zaprti `scout.ugovori` (zgoščena ključa država + ime in država +
  šifra, kot `anonimizirani_igralci`; v javnem `players` bi bil seznam
  ugovornikov javen): stroj izloči vso osebo, tudi ob poznejših uvozih,
  fantasy igra ostane. Vpiše ga lastnik potrjenega profila
  (`scout_ugovor(glavni, true)`; preklic z `false` pobriše le ključe njegovih
  vrstic, soimenjak z lastnim ugovorom ostane skrit) ali admin po mailu na
  info@ (`admin_scout_skrij(ids[])`). Privolitev (odprt za prestop, letnica,
  s katero je polnoleten vse leto, tj. `<= letos - 19`, regije =
  `federations` države, stik) je v zaprti
  `scout.privolitve` (ključ glavna vrstica), **ne** v javnem
  `profil_igralca`; piše `scout_shrani_privolitev`, briše
  `scout_preklici_privolitev`, ugovor in `prevzem_odstrani_predstavitev`
  (preklic profila, anonimizacija, izbris računa); bere `scout_moj_profil`
  (le lastnik). Shema `scout` je zaprta (brez pravic za `anon`/`authenticated`,
  RLS s politiko le za vlogo `scout_stroj`); piše jo delavec `slff-scout`,
  `scout.drzave` pove, katere države so odprte. Podrobnosti: `docs/scout.md`
```

- [ ] **Step 3: `CLAUDE.md`**

Zamenjaj

```
- **Mladinske lige, osebe z vrstico v mladinski ligi, `scout_skrit` in
  anonimizirani (tudi ista oseba v drugih ligah) ne vstopijo v izračun.**
```

z

```
- **Mladinske lige, osebe z vrstico v mladinski ligi (razen s polnoletno
  letnico na potrjenem profilu), ugovor (`scout.ugovori`) in anonimizirani
  (tudi ista oseba v drugih ligah) ne vstopijo v izračun.**
- Privolitev igralca (odprt za prestop, letnica, regije, stik) je v zaprti
  `scout.privolitve`, ne v javnem `profil_igralca`; piše le
  `scout_shrani_privolitev`. Ugovor nikoli ne gre v javno tabelo.
```

- [ ] **Step 4: Commit**

```bash
git add docs/scout.md docs/podatkovni-model.md CLAUDE.md
git commit -F - <<'EOF'
docs(scout): faza 2, ugovor in privolitev igralca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Objava in preverjanje na produkciji

**Files:** brez (operativni koraki po združitvi PR).

**Interfaces:**
- Consumes: CI posel *Migracije baze* (`ci.yml`), `scripts/hetzner/objavi-scout.sh`, `ssh slff`.
- Produces: migracija na produkciji, nov delavec `slff-scout`.

- [ ] **Step 1: Pred združitvijo, celoten preizkus lokalno**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
npm run typecheck && npm run smoke && npm run test:varnost && npm test
cd scout/stroj && .venv/bin/pytest -q
```

Expected: vse zeleno.

- [ ] **Step 2: Stanje produkcije pred migracijo (branje)**

```bash
ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select count(*) from players where scout_skrit"'
```

Zapiši število; migracija te vrstice prenese v `scout.ugovori`.

- [ ] **Step 3: Združi PR in počakaj na CI**

Posel *Migracije baze* uveljavi `20261016160100`. Stolpec `players.scout_skrit` ostane, zato stari delavec teče naprej (mladince izloča vse, kar je strožje), dokler ga Step 5 ne zamenja.

- [ ] **Step 4: Izmeri pravi SQL na produkciji**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska/scout/stroj
.venv/bin/python -c 'from stroj.nalaganje import SQL_IZKLJUCENI as s; print("begin;\nset local role scout_stroj;\nset local statement_timeout = 120000;\nexplain (analyze, buffers)\n" + s + ";\nrollback;")' > /private/tmp/scout-izkljuceni.sql
ssh slff 'docker exec -i supabase-db psql -U supabase_admin -d postgres -X' < /private/tmp/scout-izkljuceni.sql | tail -4
ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select count(*) from scout.ugovori; select has_function_privilege('"'"'anon'"'"', '"'"'public.scout_moj_profil(bigint)'"'"', '"'"'EXECUTE'"'"')"'
```

Expected: `Execution Time` pod 30000 ms; število ključev ≥ 2 × število iz Step 2 (ali 0, če je bilo 0); `f`.

- [ ] **Step 5: Objavi delavca in preveri zagon brez pisanja**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
bash scripts/hetzner/objavi-scout.sh
ssh slff 'cd /opt/slff-scout && docker compose run --rm scout python -m stroj'
```

Expected: izpiše backtest in prvih 10 lig, brez napake.

- [ ] **Step 6: Preizkus v živo**

Na slff.eu s potrjenim profilom slovenskega igralca: Uredi → SLFF Scout → shrani letnico in regijo → Prekliči privolitev → Skrij me iz Scouta → Prekliči ugovor. `/legal#scout` se odpre iz povezave na dnu strani igralca. Admin: Administracija → Igralec → Skrij iz Scouta na testnem igralcu, nato `ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -c "delete from scout.ugovori where player_id = <id>"'`.

---

### Task 10: Odstranitev `players.scout_skrit` (ločen PR)

**Predpogoj (obvezen):** naloga 9 je končana in nov delavec je na produkciji vsaj enkrat po urniku (11:00) tekel brez napake: `ssh slff 'docker logs --since 24h slff-scout 2>&1 | tail -20'` ne kaže napake. Brez tega te naloge ne začni: stari delavec bere `p.scout_skrit` in bi po odstranitvi padel.

**Files:**
- Create: `supabase/migrations/20261017090100_scout_brez_stolpca.sql`
- Modify: `supabase/tests/varnost.sql`, `src/lib/baza.types.ts`, `README.md`, `docs/podatkovni-model.md`

**Interfaces:**
- Consumes: `scout.kljuci_vrstic(bigint[])`, `scout.ugovori` (naloga 1).
- Produces: `public.players` brez stolpca `scout_skrit`; `Database['public']['Tables']['players']` brez `scout_skrit`.

- [ ] **Step 1: Veja**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
git switch main && git pull --ff-only && git switch -c chore/scout-brez-stolpca
```

- [ ] **Step 2: Test pričakuje, da stolpca ni (pade)**

V `supabase/tests/varnost.sql` zamenjaj

```sql
select pg_temp.preveri('scout: scout_skrit privzeto false',
  (select column_default = 'false' from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name = 'scout_skrit'));
```

z

```sql
select pg_temp.preveri('scout: ugovor ni javni stolpec players',
  not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name = 'scout_skrit'));
```

in zamenjaj

```sql
  'select 1 from public.players p join public.competitions c on c.id = p.competition_id where p.scout_skrit or public.je_mladinski_slug(c.slug)',
```

z

```sql
  'select 1 from public.players p join public.competitions c on c.id = p.competition_id where public.je_mladinski_slug(c.slug)',
```

```bash
npm run test:varnost
```

Expected: FAIL `scout: ugovor ni javni stolpec players`.

- [ ] **Step 3: Migracija `supabase/migrations/20261017090100_scout_brez_stolpca.sql`**

```sql
-- SLFF Scout: odstrani players.scout_skrit. Ugovori so od 20261016160100 v
-- zaprti scout.ugovori, nov delavec stolpca ne bere. Javno berljiv stolpec bi
-- razkril seznam ugovornikov. Pred odstranitvijo še enkrat prenese morebitne
-- ugovore, vpisane v stolpec po prvi migraciji.
insert into scout.ugovori (player_id, kljuc)
select k.player_id, k.kljuc
  from scout.kljuci_vrstic(array(select id from public.players where scout_skrit)) k
on conflict do nothing;
alter table public.players drop column scout_skrit;
```

```bash
npx supabase migration up
npm run test:varnost
```

Expected: `VSE OK`.

- [ ] **Step 4: Tipi**

```bash
npm run tipi
git diff --stat src/lib/baza.types.ts
```

Če diff odstrani le tri vrstice `scout_skrit`, nadaljuj. Sicer (razlika v različici CLI) `git checkout src/lib/baza.types.ts` in ročno:

```bash
sed -i '' -E '/^ {10}scout_skrit\??: boolean$/d' src/lib/baza.types.ts
grep -c scout_skrit src/lib/baza.types.ts   # mora biti 0
```

- [ ] **Step 5: Dokumentacija**

`README.md`: v vrstici tabele `players` zamenjaj `; \`scout_skrit\` = ugovor proti Scoutu` z `; ugovor proti Scoutu je v zaprti \`scout.ugovori\``.

`docs/podatkovni-model.md`: zamenjaj

```
- **Scout: ugovor in privolitev** (migraciji 20261016140100, 20261016160100;
  `players.scout_skrit` ostane do 20261017090100 in se ne bere več).
```

z

```
- **Scout: ugovor in privolitev** (migracije 20261016140100, 20261016160100,
  20261017090100, ki je odstranila javni `players.scout_skrit`).
```

- [ ] **Step 6: Preveri, da stolpca nihče več ne omenja**

```bash
grep -rn scout_skrit src scripts scout supabase/tests README.md CLAUDE.md docs/scout.md docs/podatkovni-model.md
npm run typecheck && npm run smoke && npm test
cd scout/stroj && .venv/bin/pytest -q
```

Expected: `grep` najde le `supabase/tests/varnost.sql` (preverjanje, da stolpca ni) in `docs/podatkovni-model.md` (zgodovina migracij); vse ostalo zeleno.

- [ ] **Step 7: Commit**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
git add supabase/migrations/20261017090100_scout_brez_stolpca.sql supabase/tests/varnost.sql src/lib/baza.types.ts README.md docs/podatkovni-model.md
git commit -F - <<'MSG'
chore(scout): odstrani javni stolpec players.scout_skrit

Ugovori so v zaprti scout.ugovori, nov delavec stolpca ne bere.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Po združitvi CI uveljavi migracijo; na produkciji preveri `ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select count(*) from information_schema.columns where table_name = '"'"'players'"'"' and column_name = '"'"'scout_skrit'"'"'"'` = `0` in naslednji zagon delavca v `docker logs slff-scout`.

---

## Spec coverage

| spec | naloga |
|---|---|
| 2: samo odrasli, mladinec izključen do članskih minut in letnice ≥ 18 | 1 (`odrasle_vrstice`, letnica `<= letos - 19` ob vpisu), 2 |
| 2: ugovor = skrit v 14 dneh, vse vrstice osebe v državi, fantasy ostane | 1 (`scout.ugovori` po ključih), 2, 7, besedilo v 4 |
| 2: povezava za ugovor na vsaki javni strani igralca | 6 |
| 2: `/legal` čl. 14 razdelek Scout (kaj, zakaj, kako dolgo, ugovor) | 4, 6 |
| 2: privolitev, preklic kadarkoli, ob preklicu izbris | 1 (`scout_preklici_privolitev`, `prevzem_odstrani_predstavitev`), 5 |
| 4: `odprt_za_prestop`, `letnik`, `regije`, `kontakt_dovoljen`; ugovor | 1 (v `scout.privolitve`, ne v `profil_igralca`) |
| 5 faza 2: prijava deluje in je razložena igralcem | 5, 6, 9 |
| odprta točka faze 1: seznam ugovornikov javen | 1 (zaprta tabela, stolpec se ne piše več), 10 (stolpec odstranjen) |
