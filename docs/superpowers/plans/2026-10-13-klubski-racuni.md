# Klubski računi — načrt izvedbe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Klub se registrira z uradnim naslovom in samodejno dobi klubski račun (do 5 na klub); klub brez znanega naslova zaprosi za nov naslov, admin odloči v Administraciji → Klubi.

**Architecture:** Vse stanje v dveh tabelah (`klubski_racuni`, `klubski_zahtevki`) z RLS brez neposrednega dostopa; vse spremembe prek SECURITY DEFINER RPC. Vmesnik ob vsaki prijavi pokliče `uveljavi_klubski_racun()`; stran Račun pokaže stanje in obrazec, Administracija dobi razdelek Klubi. Hrvaški in srbski stiki se povežejo s klubi v migraciji (natančno ime + liga).

**Tech Stack:** Postgres (self-hosted Supabase), React + TypeScript (Vite), `supabase/tests/varnost.sql` (`npm run test:varnost`), `npm run typecheck`, `npm run smoke`.

**Spec:** `docs/superpowers/specs/2026-10-13-klubski-racuni-design.md`

Ta načrt podrobno pokriva **fazo 1** (en PR). Faze 2–4 so na koncu kot oris; vsaka dobi svoj načrt, ko je prejšnja združena.

## Global Constraints

- Migracije: verzija **večja od produkcije in od `origin/main`**, minuta liha (`YYYYMMDDHHM100`, kjer je M lih). Pred dodajanjem preveri: `ssh SLFF "docker exec supabase-db psql -U postgres -At -c \"select max(version) from supabase_migrations.schema_migrations\""` in `ls supabase/migrations | tail -1`. Ta načrt uporablja `20261013201100` in `20261013203100`; če je katera že presežena, premakni obe naprej (ohrani vrstni red).
- Največ **5 aktivnih računov na klub**; en aktiven račun na uporabnika.
- Samodejno le, kadar: `email_confirmed_at is not null`, `lower(btrim(email))` enak `klub_stik`, `klub_stik.team_id is not null`, `stanje not in ('ne_zeli','napacen_mail')`.
- Prošnja za nov naslov: predlagani naslov je **vedno mail računa**, ki prošnjo odda.
- Klub nikoli ne piše minut, golov, cen ali `reg_st` (velja za vse faze).
- Vsi novi napisi v vseh 13 jezikih: `sl en hr sk cs hu de sr ro et pl es lv mk` (`src/i18n/<jezik>/racun.ts`).
- Brez pomišljajev (—) v besedilih za uporabnike.
- Nikoli `git add -A`; dodajaj datoteke poimensko. Commit trailer: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Produkcije ne piši; migracije uveljavi CI ob združitvi.

## Review Focus

1. **Preklican račun se ob naslednji prijavi ne sme ustvariti znova** (uporabnik se odjavi in prijavi; admin ga je preklical). Pričakovano: ostane preklican. Test v Task 1.
2. **Velike črke in presledki v naslovu** (`Klub@Gmail.com ` v `klub_stik`, `klub@gmail.com` v auth). Pričakovano: ujame se. Test v Task 1.
3. **Šesti račun istega kluba** gre v vrsto `polno`, ne v račun; ponovna prijava ne podvoji zahtevka. Test v Task 1.
4. **Uporabnik, ki že zastopa klub, zaprosi za drug klub.** Pričakovano: zavrnjeno z jasnim sporočilom. Test v Task 2.
5. **Admin potrdi prošnjo za klub, ki ima že 5 računov**, brez izbranega računa za preklic. Pričakovano: napaka »najprej prekliči enega«; s preklicem uspe. Test v Task 2.

---

## Datoteke

| datoteka | vloga |
|---|---|
| `supabase/migrations/20261013201100_klubski_racuni.sql` | tabele, pomožne funkcije, `uveljavi_klubski_racun`, prošnje, admin RPC |
| `supabase/migrations/20261013203100_povezi_stike_klubov.sql` | poveže stike brez `team_id` s klubi |
| `supabase/tests/varnost.sql` | testi pravic in pravil (dodan blok na koncu, pred končno preverbo) |
| `src/lib/klubskiRacun.ts` | klici RPC in tipi za vmesnik |
| `src/lib/useAuth.tsx` | ob prijavi pokliče `uveljaviKlubskiRacun` |
| `src/components/KlubskiRacun.tsx` | stran Račun: stanje računa, obrazec prošnje |
| `src/pages/Racun.tsx` | vstavi `<KlubskiRacun />` |
| `src/components/admin/KlubskiRacuni.tsx` | Administracija → Klubi |
| `src/pages/Administracija.tsx` | vstavi `<KlubskiRacuni />` |
| `src/i18n/<13 jezikov>/racun.ts` | napisi `klubskiRacun` |
| `src/lib/baza.types.ts` | regenerirano (`npm run tipi`) |
| `CLAUDE.md` | razdelek »Klubski računi« |

---

### Task 1: Računi in samodejna preverba (baza)

**Files:**
- Create: `supabase/migrations/20261013201100_klubski_racuni.sql` (prvi del; Task 2 doda drugi del v isto datoteko)
- Test: `supabase/tests/varnost.sql`

**Interfaces:**
- Produces:
  - tabela `klubski_racuni(id, user_id, team_id, klub_stik_id, created_at, preklican_at, preklical)`
  - tabela `klubski_zahtevki(id, user_id, email, vrsta, team_id, klub_stik_id, vloga, dokaz_url, opomba, status, razlog, created_at, decided_at, decided_by)`
  - `je_klubski_racun(p_user uuid, p_team_id bigint) returns boolean` (le SECURITY DEFINER klicatelji)
  - `klub_ustvari_racun(p_user uuid, p_team_id bigint, p_stik_id bigint) returns bigint` (interno)
  - `klub_v_vrsto(p_user uuid, p_email text, p_vrsta text, p_team_id bigint, p_stik_id bigint) returns void` (interno)
  - `uveljavi_klubski_racun() returns bigint` (team_id ali null; `authenticated`)
  - `moj_klubski_racun() returns jsonb` (`authenticated`)

- [ ] **Step 1: Pripravi lokalno bazo**

Run: `docker ps --format '{{.Names}}' | grep supabase_db_mnzgorenjska || npx supabase start`
Nato: `npx supabase db reset` (uveljavi vse migracije lokalno).
Expected: brez napak, `npm run test:varnost` konča z `VSE OK`.

- [ ] **Step 2: Napiši teste (padejo)**

V `supabase/tests/varnost.sql` dodaj blok **tik pred** zaključnim `do $$ declare v_napak int; ...`:

```sql
-- --------------------------------------------------------------------------
-- Klubski računi (faza 1)
-- --------------------------------------------------------------------------
reset role;
-- Klub -913003 ima uradni naslov z velikimi črkami in presledkom; klub
-- -913004 ima naslov brez kluba (team_id null); -913005 ne želi stika.
insert into klub_stik(id, team_id, klub, drzava, email, stanje) overriding system value values
 (-920001, -913003, 'Test varnosti 2', 'SI', ' Klub.Tri@Example.invalid', 'poslano'),
 (-920002, null,    'Brez kluba',      'SI', 'brez.kluba@example.invalid', 'poslano'),
 (-920003, -913005, 'Test varnosti 4', 'SI', 'ne.zeli@example.invalid', 'ne_zeli');
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('d1a10000-0000-4000-8000-000000000001', 'klub.tri@example.invalid', now(), '{"display_name":"K1"}', now()),
 ('d1a10000-0000-4000-8000-000000000002', 'nepotrjen@example.invalid', null, '{"display_name":"K2"}', now()),
 ('d1a10000-0000-4000-8000-000000000003', 'brez.kluba@example.invalid', now(), '{"display_name":"K3"}', now()),
 ('d1a10000-0000-4000-8000-000000000004', 'ne.zeli@example.invalid', now(), '{"display_name":"K4"}', now());
-- Nepotrjen uporabnik ima isti naslov kot klub -913003 (drug zapis v klub_stik).
insert into klub_stik(id, team_id, klub, drzava, email, stanje) overriding system value values
 (-920004, -913003, 'Test varnosti 2', 'SI', 'nepotrjen@example.invalid', 'poslano');

select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('klub: potrjen naslov (velike črke, presledek) dobi račun',
  uveljavi_klubski_racun() = -913003);
select pg_temp.preveri('klub: ponovna prijava vrne isti klub, brez druge vrstice',
  uveljavi_klubski_racun() = -913003);
select pg_temp.preveri('klub: moj_klubski_racun pokaže klub',
  (moj_klubski_racun()->'racun'->>'team_id')::bigint = -913003);
select pg_temp.zavrnjeno('klub: tabele računov ni mogoče brati neposredno',
  $$select * from klubski_racuni$$);
select pg_temp.zavrnjeno('klub: interne funkcije niso dostopne',
  $$select klub_ustvari_racun(auth.uid(), -913001, null)$$);

select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000002',true);
select pg_temp.preveri('klub: nepotrjen mail ne dobi računa', uveljavi_klubski_racun() is null);

select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000003',true);
select pg_temp.preveri('klub: naslov brez kluba ne dobi računa', uveljavi_klubski_racun() is null);
select uveljavi_klubski_racun();
reset role;
select pg_temp.preveri('klub: naslov brez kluba gre enkrat v vrsto (brez_kluba)',
  (select count(*) from klubski_zahtevki where user_id = 'd1a10000-0000-4000-8000-000000000003'
     and vrsta = 'brez_kluba' and status = 'odprt') = 1);

select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.preveri('klub: stik ne_zeli ne dobi računa', uveljavi_klubski_racun() is null);
reset role;

-- Peti račun kluba -913003: dodamo 4 aktivne (skupaj s K1 jih je 5).
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at)
select ('d1a10000-0000-4000-8000-00000000001' || n)::uuid, 'peti' || n || '@example.invalid', now(), '{}', now()
from generate_series(1, 5) n;
insert into klubski_racuni(user_id, team_id)
select ('d1a10000-0000-4000-8000-00000000001' || n)::uuid, -913003 from generate_series(1, 4) n;
insert into klub_stik(id, team_id, klub, drzava, email, stanje) overriding system value values
 (-920005, -913003, 'Test varnosti 2', 'SI', 'peti5@example.invalid', 'poslano');
select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000015',true);
set local role authenticated;
select pg_temp.preveri('klub: šesti račun ne nastane', uveljavi_klubski_racun() is null);
select uveljavi_klubski_racun();
reset role;
select pg_temp.preveri('klub: šesti gre enkrat v vrsto (polno)',
  (select count(*) from klubski_zahtevki where user_id = 'd1a10000-0000-4000-8000-000000000015'
     and vrsta = 'polno' and status = 'odprt') = 1);

-- Preklican račun se ob naslednji prijavi ne obnovi.
update klubski_racuni set preklican_at = now() where user_id = 'd1a10000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('klub: preklican račun se ob prijavi ne obnovi', uveljavi_klubski_racun() is null);
reset role;
select pg_temp.preveri('klub: preklican ostane edina vrstica',
  (select count(*) from klubski_racuni where user_id = 'd1a10000-0000-4000-8000-000000000001') = 1);

set local role anon;
select pg_temp.zavrnjeno('klub: anonimni ne kliče uveljavi', $$select uveljavi_klubski_racun()$$);
reset role;
```

- [ ] **Step 3: Poženi teste, preveri, da padejo**

Run: `npm run test:varnost`
Expected: napaka `function uveljavi_klubski_racun() does not exist` (ali `relation "klub_stik"` … ne; `klub_stik` obstaja).

- [ ] **Step 4: Napiši migracijo (prvi del)**

`supabase/migrations/20261013201100_klubski_racuni.sql`:

```sql
-- Klubski računi (spec: docs/superpowers/specs/2026-10-13-klubski-racuni-design.md).
--
-- Klub se registrira z uradnim naslovom iz `klub_stik`. Potrjen naslov
-- (GoTrue zahteva potrditev, Google vrne preverjen naslov) dokazuje, da ima
-- klub nabiralnik, zato račun nastane brez admina. Klub ima lahko do 5
-- računov (vsak s svojim naslovom); uporabnik zastopa največ en klub.
-- Primeri brez kluba, s polnim klubom in prošnje za nov naslov gredo v
-- `klubski_zahtevki` (Administracija → Klubi).
--
-- Tabel vmesnik ne bere ne piše; vse gre prek RPC spodaj.

create table public.klubski_racuni (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles on delete cascade,
  team_id      bigint not null references public.teams on delete cascade,
  klub_stik_id bigint references public.klub_stik on delete set null,
  created_at   timestamptz not null default now(),
  preklican_at timestamptz,
  preklical    uuid references public.profiles on delete set null
);
create unique index klubski_racuni_en_aktiven on public.klubski_racuni (user_id) where preklican_at is null;
create index klubski_racuni_klub on public.klubski_racuni (team_id) where preklican_at is null;

create table public.klubski_zahtevki (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles on delete cascade,
  email        text not null,
  vrsta        text not null check (vrsta in ('brez_kluba', 'polno', 'nov_naslov')),
  team_id      bigint references public.teams on delete set null,
  klub_stik_id bigint references public.klub_stik on delete set null,
  vloga        text check (vloga in ('predsednik', 'tajnik', 'trener', 'vodstvo', 'drugo')),
  dokaz_url    text check (dokaz_url is null or (length(dokaz_url) <= 300 and dokaz_url ~ '^https?://[^[:space:]<>"]+$')),
  opomba       text check (opomba is null or length(opomba) <= 500),
  status       text not null default 'odprt' check (status in ('odprt', 'potrjen', 'zavrnjen')),
  razlog       text check (razlog is null or length(razlog) <= 500),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references public.profiles on delete set null
);
create unique index klubski_zahtevki_en_odprt on public.klubski_zahtevki (user_id) where status = 'odprt';

alter table public.klubski_racuni enable row level security;
alter table public.klubski_zahtevki enable row level security;
revoke all on public.klubski_racuni, public.klubski_zahtevki from anon, authenticated;

create or replace function public.je_klubski_racun(p_user uuid, p_team_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from klubski_racuni
                  where user_id = p_user and team_id = p_team_id and preklican_at is null)
$$;

-- Vpiše račun in javi na Discord. Kliče se le iz preverjenih poti.
create or replace function public.klub_ustvari_racun(p_user uuid, p_team_id bigint, p_stik_id bigint)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  v_n int;
begin
  insert into klubski_racuni(user_id, team_id, klub_stik_id)
  values (p_user, p_team_id, p_stik_id) returning id into v_id;
  select count(*) into v_n from klubski_racuni where team_id = p_team_id and preklican_at is null;
  perform preverjeni_na_discord(format('🏟️ Klubski račun: %s (%s), %s. račun kluba',
    (select name from teams where id = p_team_id),
    (select coalesce(display_name, '?') from profiles where id = p_user),
    v_n));
  return v_id;
end;
$$;

-- Odprt zahtevek v vrsto admina (največ en odprt na uporabnika).
create or replace function public.klub_v_vrsto(p_user uuid, p_email text, p_vrsta text,
                                               p_team_id bigint, p_stik_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into klubski_zahtevki(user_id, email, vrsta, team_id, klub_stik_id)
  values (p_user, p_email, p_vrsta, p_team_id, p_stik_id)
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    perform preverjeni_na_discord(format('🏟️ Klubski zahtevek (%s): %s, %s',
      p_vrsta, coalesce((select name from teams where id = p_team_id), 'klub neznan'), p_email));
  end if;
end;
$$;

-- Kliče vmesnik ob vsaki prijavi. Vrne klub (team_id) aktivnega računa ali null.
create or replace function public.uveljavi_klubski_racun()
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_potrjen timestamptz;
  s klub_stik;
  v_team bigint;
begin
  if v_uid is null then
    raise insufficient_privilege using message = 'Prijava je obvezna.';
  end if;
  select team_id into v_team from klubski_racuni where user_id = v_uid and preklican_at is null;
  if found then
    return v_team;
  end if;
  select lower(btrim(email)), email_confirmed_at into v_email, v_potrjen from auth.users where id = v_uid;
  if v_potrjen is null or coalesce(v_email, '') = '' then
    return null;
  end if;
  select * into s from klub_stik where lower(btrim(email)) = v_email limit 1;
  if not found or s.stanje in ('ne_zeli', 'napacen_mail') then
    return null;
  end if;
  -- Admin je račun preklical: ne obnovi ga samodejno.
  if exists (select 1 from klubski_racuni where user_id = v_uid and preklican_at is not null) then
    return null;
  end if;
  if s.team_id is null then
    perform klub_v_vrsto(v_uid, v_email, 'brez_kluba', null, s.id);
    return null;
  end if;
  perform 1 from teams where id = s.team_id for update;  -- dva hkratna šesta računa
  if (select count(*) from klubski_racuni where team_id = s.team_id and preklican_at is null) >= 5 then
    perform klub_v_vrsto(v_uid, v_email, 'polno', s.team_id, s.id);
    return null;
  end if;
  perform klub_ustvari_racun(v_uid, s.team_id, s.id);
  return s.team_id;
end;
$$;

-- Stanje za stran Račun: aktiven račun in zadnji zahtevek.
create or replace function public.moj_klubski_racun()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'racun', (select jsonb_build_object('team_id', r.team_id, 'team_name', t.name, 'od', r.created_at)
                from klubski_racuni r join teams t on t.id = r.team_id
               where r.user_id = auth.uid() and r.preklican_at is null),
    'zahtevek', (select jsonb_build_object('id', z.id, 'vrsta', z.vrsta, 'status', z.status,
                                           'razlog', z.razlog, 'team_name', t.name, 'created_at', z.created_at)
                   from klubski_zahtevki z left join teams t on t.id = z.team_id
                  where z.user_id = auth.uid() order by z.created_at desc limit 1))
$$;

revoke all on function public.je_klubski_racun(uuid, bigint), public.klub_ustvari_racun(uuid, bigint, bigint),
  public.klub_v_vrsto(uuid, text, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.uveljavi_klubski_racun(), public.moj_klubski_racun() from public, anon;
grant execute on function public.uveljavi_klubski_racun(), public.moj_klubski_racun() to authenticated;
```

- [ ] **Step 5: Uveljavi in poženi teste**

Run: `npx supabase db reset && npm run test:varnost`
Expected: vse `klub:` vrstice `PASS`, konec `VSE OK`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261013201100_klubski_racuni.sql supabase/tests/varnost.sql
git commit -m "Klubski računi: tabele in samodejna preverba z uradnim mailom

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Prošnje za nov naslov in odločitve admina (baza)

**Files:**
- Modify: `supabase/migrations/20261013201100_klubski_racuni.sql` (dodaj na konec)
- Test: `supabase/tests/varnost.sql` (nadaljuj blok iz Task 1)

**Interfaces:**
- Consumes: `klub_ustvari_racun`, `klub_v_vrsto`, tabeli iz Task 1.
- Produces:
  - `klub_zaprosi_za_naslov(p_team_id bigint, p_vloga text, p_dokaz_url text, p_opomba text default null) returns bigint` (`authenticated`)
  - `admin_klubski_zahtevki() returns table(id bigint, user_id uuid, display_name text, email text, vrsta text, team_id bigint, team_name text, vloga text, dokaz_url text, opomba text, status text, razlog text, created_at timestamptz, racunov_kluba int)`
  - `admin_klubski_racuni() returns table(id bigint, user_id uuid, display_name text, email text, team_id bigint, team_name text, created_at timestamptz, preklican_at timestamptz)`
  - `admin_odloci_klubski_zahtevek(p_id bigint, p_potrdi boolean, p_team_id bigint default null, p_razlog text default null, p_preklici_racun bigint default null) returns void`
  - `admin_preklici_klubski_racun(p_id bigint) returns void`

- [ ] **Step 1: Napiši teste (padejo)**

Dodaj za blokom iz Task 1 (še vedno pred zaključnim `do $$`):

```sql
-- Prošnja za nov naslov. K5 ima potrjen mail, ki ga ni v klub_stik.
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('d1a10000-0000-4000-8000-000000000005', 'tajnik.novi@example.invalid', now(), '{"display_name":"K5"}', now());
select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.preveri('klub: prošnja za nov naslov se odda',
  klub_zaprosi_za_naslov(-913004, 'tajnik', 'https://example.org/kontakt') is not null);
select pg_temp.napaka('klub: le ena odprta prošnja na račun',
  $$select klub_zaprosi_za_naslov(-913004, 'tajnik', 'https://example.org/kontakt')$$);
select pg_temp.zavrnjeno('klub: ne-admin ne odloča', $$select admin_odloci_klubski_zahtevek(
  (select (moj_klubski_racun()->'zahtevek'->>'id')::bigint), true)$$);
select pg_temp.zavrnjeno('klub: ne-admin ne vidi vrste', $$select * from admin_klubski_zahtevki()$$);

-- Uporabnik, ki že zastopa klub (eden od petih), ne zaprosi za drugega.
select set_config('request.jwt.claim.sub','d1a10000-0000-4000-8000-000000000011',true);
select pg_temp.napaka('klub: zastopnik kluba ne zaprosi za drug klub',
  $$select klub_zaprosi_za_naslov(-913004, 'trener', null)$$);

-- Admin potrdi K5 za -913004: nastane stik in račun.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
select admin_odloci_klubski_zahtevek(
  (select id from admin_klubski_zahtevki() where email = 'tajnik.novi@example.invalid'), true);
reset role;
select pg_temp.preveri('klub: potrjena prošnja vpiše klub_stik (sodeluje)',
  exists (select 1 from klub_stik where lower(email) = 'tajnik.novi@example.invalid'
            and team_id = -913004 and stanje = 'sodeluje' and vir_url = 'https://example.org/kontakt'));
select pg_temp.preveri('klub: potrjena prošnja ustvari račun',
  je_klubski_racun('d1a10000-0000-4000-8000-000000000005', -913004));

-- Polno: šesti (iz Task 1) za -913003 brez preklica pade, s preklicem uspe.
-- Task 1 je preklical K1, zato klub spet napolnimo na 5 aktivnih.
reset role;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('d1a10000-0000-4000-8000-000000000016', 'sesti@example.invalid', now(), '{}', now());
insert into klubski_racuni(user_id, team_id) values ('d1a10000-0000-4000-8000-000000000016', -913003);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.napaka('klub: polnega kluba admin ne potrdi brez preklica',
  $$select admin_odloci_klubski_zahtevek(
      (select id from admin_klubski_zahtevki() where vrsta = 'polno' and status = 'odprt'), true)$$);
select admin_odloci_klubski_zahtevek(
  (select id from admin_klubski_zahtevki() where vrsta = 'polno' and status = 'odprt'), true, null, null,
  (select id from admin_klubski_racuni() where user_id = 'd1a10000-0000-4000-8000-000000000011'));
reset role;
select pg_temp.preveri('klub: s preklicem šesti dobi račun, preklicani ga izgubi',
  je_klubski_racun('d1a10000-0000-4000-8000-000000000015', -913003)
  and not je_klubski_racun('d1a10000-0000-4000-8000-000000000011', -913003));

-- Brez kluba: admin izbere klub; zavrnitev nosi razlog.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.napaka('klub: brez_kluba brez izbranega kluba ne gre',
  $$select admin_odloci_klubski_zahtevek(
      (select id from admin_klubski_zahtevki() where vrsta = 'brez_kluba' and status = 'odprt'), true)$$);
select admin_odloci_klubski_zahtevek(
  (select id from admin_klubski_zahtevki() where vrsta = 'brez_kluba' and status = 'odprt'), false, null, 'Ni naslov kluba.');
reset role;
select pg_temp.preveri('klub: zavrnjen zahtevek ima razlog',
  exists (select 1 from klubski_zahtevki where user_id = 'd1a10000-0000-4000-8000-000000000003'
            and status = 'zavrnjen' and razlog = 'Ni naslov kluba.'));
```

- [ ] **Step 2: Poženi teste, preveri, da padejo**

Run: `npm run test:varnost`
Expected: `function klub_zaprosi_za_naslov(...) does not exist`.

- [ ] **Step 3: Dodaj funkcije na konec migracije**

```sql
-- --------------------------------------------------------------------------
-- Prošnja za nov naslov: »mail mojega računa je uradni naslov kluba X«.
-- --------------------------------------------------------------------------
create or replace function public.klub_zaprosi_za_naslov(p_team_id bigint, p_vloga text,
                                                         p_dokaz_url text, p_opomba text default null)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_potrjen timestamptz;
  v_id bigint;
begin
  if v_uid is null then
    raise insufficient_privilege using message = 'Prijava je obvezna.';
  end if;
  select lower(btrim(email)), email_confirmed_at into v_email, v_potrjen from auth.users where id = v_uid;
  if v_potrjen is null then
    raise exception 'Najprej potrdi e-pošto računa.';
  end if;
  if exists (select 1 from klubski_racuni where user_id = v_uid and preklican_at is null) then
    raise exception 'Že zastopaš klub.';
  end if;
  if not exists (select 1 from teams where id = p_team_id) then
    raise exception 'Klub ne obstaja.';
  end if;
  if exists (select 1 from klubski_zahtevki where user_id = v_uid and status = 'odprt') then
    raise exception 'Prošnja že čaka na odločitev.';
  end if;
  insert into klubski_zahtevki(user_id, email, vrsta, team_id, vloga, dokaz_url, opomba)
  values (v_uid, v_email, 'nov_naslov', p_team_id, p_vloga,
          nullif(btrim(coalesce(p_dokaz_url, '')), ''), nullif(btrim(coalesce(p_opomba, '')), ''))
  returning id into v_id;
  perform preverjeni_na_discord(format('🏟️ Prošnja za uradni naslov: %s, %s (%s) %s',
    (select name from teams where id = p_team_id), v_email, coalesce(p_vloga, '?'), coalesce(p_dokaz_url, '')));
  return v_id;
end;
$$;

-- --------------------------------------------------------------------------
-- Administracija → Klubi
-- --------------------------------------------------------------------------
create or replace function public.admin_klubski_zahtevki()
returns table (id bigint, user_id uuid, display_name text, email text, vrsta text, team_id bigint,
               team_name text, vloga text, dokaz_url text, opomba text, status text, razlog text,
               created_at timestamptz, racunov_kluba int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select z.id, z.user_id, p.display_name, z.email, z.vrsta, z.team_id, t.name, z.vloga, z.dokaz_url,
           z.opomba, z.status, z.razlog, z.created_at,
           (select count(*)::int from klubski_racuni r where r.team_id = z.team_id and r.preklican_at is null)
      from klubski_zahtevki z
      left join profiles p on p.id = z.user_id
      left join teams t on t.id = z.team_id
     order by (z.status = 'odprt') desc, z.created_at desc
     limit 300;
end;
$$;

create or replace function public.admin_klubski_racuni()
returns table (id bigint, user_id uuid, display_name text, email text, team_id bigint, team_name text,
               created_at timestamptz, preklican_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select r.id, r.user_id, p.display_name, u.email::text, r.team_id, t.name, r.created_at, r.preklican_at
      from klubski_racuni r
      join teams t on t.id = r.team_id
      left join profiles p on p.id = r.user_id
      left join auth.users u on u.id = r.user_id
     order by (r.preklican_at is null) desc, t.name, r.created_at;
end;
$$;

create or replace function public.admin_preklici_klubski_racun(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  update klubski_racuni set preklican_at = now(), preklical = auth.uid()
   where id = p_id and preklican_at is null;
  if not found then
    raise exception 'Račun ni aktiven.';
  end if;
end;
$$;

create or replace function public.admin_odloci_klubski_zahtevek(p_id bigint, p_potrdi boolean,
  p_team_id bigint default null, p_razlog text default null, p_preklici_racun bigint default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  z klubski_zahtevki;
  v_team bigint;
  v_stik bigint;
  v_drzava text;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  select * into z from klubski_zahtevki where id = p_id for update;
  if not found or z.status <> 'odprt' then
    raise exception 'Zahtevek ni odprt.';
  end if;

  if not p_potrdi then
    update klubski_zahtevki
       set status = 'zavrnjen', razlog = nullif(left(btrim(coalesce(p_razlog, '')), 500), ''),
           decided_at = now(), decided_by = auth.uid()
     where id = p_id;
    return;
  end if;

  v_team := coalesce(p_team_id, z.team_id);
  if v_team is null then
    raise exception 'Izberi klub.';
  end if;
  if exists (select 1 from klubski_racuni where user_id = z.user_id and preklican_at is null) then
    raise exception 'Uporabnik že zastopa klub.';
  end if;
  if p_preklici_racun is not null then
    update klubski_racuni set preklican_at = now(), preklical = auth.uid()
     where id = p_preklici_racun and team_id = v_team and preklican_at is null;
    if not found then
      raise exception 'Račun za preklic ni aktiven račun tega kluba.';
    end if;
  end if;
  perform 1 from teams where id = v_team for update;
  if (select count(*) from klubski_racuni where team_id = v_team and preklican_at is null) >= 5 then
    raise exception 'Klub ima že 5 računov; najprej prekliči enega.';
  end if;

  -- Uradni naslov: popravi obstoječi stik ali dodaj novega (klub ima lahko več naslovov).
  select id into v_stik from klub_stik where lower(btrim(email)) = z.email limit 1;
  if v_stik is not null then
    update klub_stik
       set team_id = v_team, stanje = 'sodeluje', vir_url = coalesce(z.dokaz_url, vir_url), updated_at = now()
     where id = v_stik;
  else
    select c.code into v_drzava from teams t join countries c on c.id = t.country_id where t.id = v_team;
    insert into klub_stik(team_id, klub, drzava, email, vir_url, stanje, opomba)
    values (v_team, (select name from teams where id = v_team), v_drzava, z.email, z.dokaz_url, 'sodeluje',
            'Prošnja za uradni naslov #' || p_id)
    returning id into v_stik;
  end if;

  perform klub_ustvari_racun(z.user_id, v_team, v_stik);
  update klubski_zahtevki
     set status = 'potrjen', team_id = v_team, klub_stik_id = v_stik, decided_at = now(), decided_by = auth.uid()
   where id = p_id;
end;
$$;

revoke all on function public.klub_zaprosi_za_naslov(bigint, text, text, text), public.admin_klubski_zahtevki(),
  public.admin_klubski_racuni(), public.admin_preklici_klubski_racun(bigint),
  public.admin_odloci_klubski_zahtevek(bigint, boolean, bigint, text, bigint) from public, anon;
grant execute on function public.klub_zaprosi_za_naslov(bigint, text, text, text), public.admin_klubski_zahtevki(),
  public.admin_klubski_racuni(), public.admin_preklici_klubski_racun(bigint),
  public.admin_odloci_klubski_zahtevek(bigint, boolean, bigint, text, bigint) to authenticated;
```

- [ ] **Step 4: Poženi teste**

Run: `npx supabase db reset && npm run test:varnost`
Expected: vse `klub:` `PASS`, `VSE OK`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261013201100_klubski_racuni.sql supabase/tests/varnost.sql
git commit -m "Klubski računi: prošnja za nov uradni naslov in odločitve admina

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Povezava hrvaških in srbskih stikov s klubi

**Files:**
- Create: `supabase/migrations/20261013203100_povezi_stike_klubov.sql`

Na produkciji (13. 10.) je 585 stikov brez `team_id`; 578 se ujame natanko z enim klubom po imenu (brez šumnikov, ne glede na velikost črk) med klubi, ki imajo igralce v ligi `liga_slug`; dvoumnih ni. Ostali ostanejo prazni (admin jih dobi v vrsto `brez_kluba`, ko se prijavijo).

- [ ] **Step 1: Napiši migracijo**

```sql
-- Stiki brez kluba (hrvaški, srbski) dobijo team_id: natančno ime kluba
-- (brez šumnikov in velikosti črk) med klubi z igralci v ligi stika. Le
-- enoznačni zadetki; ostali ostanejo prazni in gredo ob prijavi v vrsto admina.
update public.klub_stik s
   set team_id = m.team_id, updated_at = now()
  from (
    select k.id, min(t.id) as team_id, count(distinct t.id) as n
      from public.klub_stik k
      join public.competitions c on c.slug = k.liga_slug
      join public.players p on p.competition_id = c.id
      join public.teams t on t.id = p.team_id
     where k.team_id is null
       and lower(extensions.unaccent(btrim(t.name))) = lower(extensions.unaccent(btrim(k.klub)))
     group by k.id
  ) m
 where m.id = s.id and m.n = 1;
```

- [ ] **Step 2: Preveri lokalno in izmeri na produkciji (le branje)**

Run: `npx supabase db reset` (mora iti brez napak; lokalno ni stikov).
Run (branje, isti `select` brez `update`):
```bash
ssh SLFF "docker exec supabase-db psql -U postgres -At -c \"select count(*) filter (where n=1), count(*) filter (where n>1) from (select k.id, count(distinct t.id) n from klub_stik k join competitions c on c.slug=k.liga_slug join players p on p.competition_id=c.id join teams t on t.id=p.team_id where k.team_id is null and lower(extensions.unaccent(btrim(t.name)))=lower(extensions.unaccent(btrim(k.klub))) group by k.id) m\""
```
Expected: približno `578|0`. Številko zapiši v opis PR.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261013203100_povezi_stike_klubov.sql
git commit -m "Stiki klubov: poveži hrvaške in srbske naslove s klubi

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Vmesnik — preverba ob prijavi in stran Račun

**Files:**
- Create: `src/lib/klubskiRacun.ts`, `src/components/KlubskiRacun.tsx`
- Modify: `src/lib/useAuth.tsx`, `src/pages/Racun.tsx`, `src/i18n/*/racun.ts` (13), `src/lib/baza.types.ts`
- Test: `scripts/smoke.jsx`

**Interfaces:**
- Consumes: `uveljavi_klubski_racun`, `moj_klubski_racun`, `klub_zaprosi_za_naslov`.
- Produces: `uveljaviKlubskiRacun(): Promise<number | null>`, `mojKlubskiRacun(): Promise<StanjeKluba>`, tip `StanjeKluba`, komponenta `KlubskiRacun` (brez propsov).

- [ ] **Step 1: Regeneriraj tipe**

Run: `npm run tipi`
Expected: `src/lib/baza.types.ts` vsebuje `uveljavi_klubski_racun`, `admin_klubski_zahtevki`.

- [ ] **Step 2: `src/lib/klubskiRacun.ts`**

```ts
// Klubski računi (migracija 20261013201100). Ali je uporabnik klub, pove le
// baza: ob vsaki prijavi `uveljavi_klubski_racun` preveri potrjen mail proti
// uradnim naslovom klubov in po potrebi ustvari račun.
import { supabase } from './supabase'

export interface StanjeKluba {
  racun: { team_id: number; team_name: string; od: string } | null
  zahtevek: {
    id: number
    vrsta: 'brez_kluba' | 'polno' | 'nov_naslov'
    status: 'odprt' | 'potrjen' | 'zavrnjen'
    razlog: string | null
    team_name: string | null
    created_at: string
  } | null
}

export const VLOGE_KLUBA = ['predsednik', 'tajnik', 'trener', 'vodstvo', 'drugo'] as const

export async function uveljaviKlubskiRacun(): Promise<number | null> {
  const { data, error } = await supabase.rpc('uveljavi_klubski_racun')
  if (error) return null
  return (data as number | null) ?? null
}

export async function mojKlubskiRacun(): Promise<StanjeKluba> {
  const { data } = await supabase.rpc('moj_klubski_racun')
  return (data as StanjeKluba | null) ?? { racun: null, zahtevek: null }
}
```

- [ ] **Step 3: Klic ob prijavi v `src/lib/useAuth.tsx`**

Dodaj uvoz in učinek v `AuthProvider` (za obstoječim `useEffect`):

```tsx
import { uveljaviKlubskiRacun } from './klubskiRacun'
// …
  // Klubski račun: ob vsaki prijavi (in ob odprtju strani s sejo) preveri,
  // ali je potrjen mail uradni naslov kluba. Enkrat na uporabnika na nalaganje.
  const uid = session?.user.id
  useEffect(() => {
    if (uid) void uveljaviKlubskiRacun()
  }, [uid])
```

- [ ] **Step 4: Napisi v vseh 13 jezikih**

V `src/i18n/sl/racun.ts` dodaj v objekt `racun` ključ `klubskiRacun`:

```ts
  // Komponenta KlubskiRacun na strani Račun.
  klubskiRacun: {
    naslov: 'Uradni račun kluba',
    aktiven: 'Ta račun zastopa klub {klub}.',
    pravice: 'Kot klub boš lahko urejal pozicije, dodajal igralce in potrjeval profile svojih igralcev.',
    vprasanje: 'Zastopaš klub?',
    pojasnilo:
      'Če se prijaviš z uradnim naslovom kluba, ki ga imamo, dobiš klubski račun samodejno. Če naslova nimamo, zaprosi spodaj in ga preverimo.',
    klub: 'Klub',
    isciKlub: 'Išči klub …',
    vloga: 'Tvoja vloga v klubu',
    vloge: { predsednik: 'predsednik', tajnik: 'tajnik', trener: 'trener', vodstvo: 'vodstvo kluba', drugo: 'drugo' },
    dokaz: 'Povezava, kjer je naslov objavljen (spletna stran, Facebook, zveza)',
    opomba: 'Opomba (neobvezno)',
    naslovRacuna: 'Naslov, ki ga potrjujemo: {email}',
    poslji: 'Pošlji prošnjo',
    caka: 'Prošnja za {klub} čaka na pregled.',
    cakaBrezKluba: 'Tvoj naslov je med uradnimi, a ga moramo še povezati s klubom. Uredimo v kratkem.',
    cakaPolno: 'Klub ima že 5 računov. Pregledali bomo in ti sporočili.',
    zavrnjeno: 'Prošnja je bila zavrnjena: {razlog}',
    nepotrjen: 'Najprej potrdi e-pošto svojega računa.',
  },
```

V `src/i18n/en/racun.ts` isti ključi:

```ts
  klubskiRacun: {
    naslov: 'Official club account',
    aktiven: 'This account represents {klub}.',
    pravice: 'As a club you can edit positions, add players and approve your players’ profiles.',
    vprasanje: 'Do you represent a club?',
    pojasnilo:
      'If you sign in with the club’s official address that we have on file, you get a club account automatically. If we don’t have it, request it below and we will check it.',
    klub: 'Club',
    isciKlub: 'Search clubs …',
    vloga: 'Your role at the club',
    vloge: { predsednik: 'president', tajnik: 'secretary', trener: 'coach', vodstvo: 'club management', drugo: 'other' },
    dokaz: 'Link where the address is published (website, Facebook, federation)',
    opomba: 'Note (optional)',
    naslovRacuna: 'Address we are verifying: {email}',
    poslji: 'Send request',
    caka: 'Your request for {klub} is waiting for review.',
    cakaBrezKluba: 'Your address is an official one, but we still need to link it to the club. We’ll sort it out shortly.',
    cakaPolno: 'The club already has 5 accounts. We’ll review it and let you know.',
    zavrnjeno: 'Your request was declined: {razlog}',
    nepotrjen: 'Confirm your account’s email first.',
  },
```

Za ostalih 11 jezikov (`hr sk cs hu de sr ro et pl es lv mk`) prevedi isti nabor ključev v jezik datoteke, v istem tonu (tikanje kot v ostalih nizih te datoteke), brez pomišljajev. Ohrani `{klub}`, `{email}`, `{razlog}`.

Run: `npm run typecheck`
Expected: brez napak (oblika jezikov se preverja proti `sl`).

- [ ] **Step 5: Komponenta `src/components/KlubskiRacun.tsx`**

```tsx
// Stran Račun: stanje klubskega računa in prošnja za nov uradni naslov.
// Pravila so v bazi (migracija 20261013201100); tu le prikaz in obrazec.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { mojKlubskiRacun, VLOGE_KLUBA, type StanjeKluba } from '../lib/klubskiRacun'

interface Klub {
  id: number
  name: string
}

export default function KlubskiRacun() {
  const { session } = useAuth()
  const [stanje, setStanje] = useState<StanjeKluba | null>(null)
  const [iskanje, setIskanje] = useState('')
  const [zadetki, setZadetki] = useState<Klub[]>([])
  const [klub, setKlub] = useState<Klub | null>(null)
  const [vloga, setVloga] = useState<(typeof VLOGE_KLUBA)[number]>('tajnik')
  const [dokaz, setDokaz] = useState('')
  const [opomba, setOpomba] = useState('')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
    if (session) void mojKlubskiRacun().then(setStanje)
  }, [session])

  useEffect(() => {
    const q = iskanje.trim()
    if (q.length < 2 || klub?.name === q) return setZadetki([])
    let veljavno = true
    void supabase
      .from('teams')
      .select('id, name')
      .ilike('name', `%${q.replace(/[%_]/g, '')}%`)
      .order('name')
      .limit(8)
      .then(({ data }) => {
        if (veljavno) setZadetki((data ?? []) as Klub[])
      })
    return () => {
      veljavno = false
    }
  }, [iskanje, klub])

  if (!session || !stanje) return null
  const potrjen = Boolean(session.user.email_confirmed_at)

  async function poslji() {
    if (!klub) return
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('klub_zaprosi_za_naslov', {
      p_team_id: klub.id,
      p_vloga: vloga,
      p_dokaz_url: dokaz.trim() || null,
      p_opomba: opomba.trim() || null,
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setStanje(await mojKlubskiRacun())
  }

  const z = stanje.zahtevek
  return (
    <section className="kartica space-y-2 p-3 sm:p-4">
      <h2 className="font-bold">{t('racun.klubskiRacun.naslov')}</h2>
      {stanje.racun ? (
        <>
          <p className="text-sm">{t('racun.klubskiRacun.aktiven', { klub: stanje.racun.team_name })}</p>
          <p className="text-xs text-slate-400">{t('racun.klubskiRacun.pravice')}</p>
        </>
      ) : z?.status === 'odprt' ? (
        <p className="text-sm text-slate-300">
          {z.vrsta === 'brez_kluba'
            ? t('racun.klubskiRacun.cakaBrezKluba')
            : z.vrsta === 'polno'
              ? t('racun.klubskiRacun.cakaPolno')
              : t('racun.klubskiRacun.caka', { klub: z.team_name ?? '' })}
        </p>
      ) : (
        <>
          {z?.status === 'zavrnjen' && (
            <p className="text-sm text-rose-300">{t('racun.klubskiRacun.zavrnjeno', { razlog: z.razlog ?? '' })}</p>
          )}
          <p className="text-sm">{t('racun.klubskiRacun.vprasanje')}</p>
          <p className="text-xs text-slate-400">{t('racun.klubskiRacun.pojasnilo')}</p>
          {!potrjen ? (
            <p className="text-sm text-amber-300">{t('racun.klubskiRacun.nepotrjen')}</p>
          ) : (
            <div className="space-y-2 text-sm">
              <label className="block">
                {t('racun.klubskiRacun.klub')}
                <input
                  value={iskanje}
                  onChange={(e) => {
                    setIskanje(e.target.value)
                    setKlub(null)
                  }}
                  placeholder={t('racun.klubskiRacun.isciKlub')}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
              </label>
              {zadetki.length > 0 && !klub && (
                <ul className="rounded-lg border border-white/10 bg-slate-900">
                  {zadetki.map((k) => (
                    <li key={k.id}>
                      <button
                        type="button"
                        className="w-full px-2 py-1 text-left hover:bg-white/5"
                        onClick={() => {
                          setKlub(k)
                          setIskanje(k.name)
                        }}
                      >
                        {k.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="block">
                {t('racun.klubskiRacun.vloga')}
                <select
                  value={vloga}
                  onChange={(e) => setVloga(e.target.value as (typeof VLOGE_KLUBA)[number])}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                >
                  {VLOGE_KLUBA.map((v) => (
                    <option key={v} value={v}>
                      {t(`racun.klubskiRacun.vloge.${v}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                {t('racun.klubskiRacun.dokaz')}
                <input
                  type="url"
                  value={dokaz}
                  onChange={(e) => setDokaz(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
              </label>
              <label className="block">
                {t('racun.klubskiRacun.opomba')}
                <textarea
                  value={opomba}
                  maxLength={500}
                  onChange={(e) => setOpomba(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
              </label>
              <p className="text-xs text-slate-400">
                {t('racun.klubskiRacun.naslovRacuna', { email: session.user.email ?? '' })}
              </p>
              {napaka && <p className="text-rose-400">{napaka}</p>}
              <button type="button" className="gumb" disabled={!klub || dela} onClick={() => void poslji()}>
                {t('racun.klubskiRacun.poslji')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
```

Pred pisanjem preveri, da `t()` sprejme objekt za `{…}` zamenjave in da obstajata `prevediNapako` (`src/lib/napake`) ter razred `gumb` (poglej `ProsnjaZaPoznavalca.tsx`); prilagodi imenom, ki jih repo res uporablja. Nova sporočila napak iz RPC (`Že zastopaš klub.`, `Prošnja že čaka na odločitev.`, `Najprej potrdi e-pošto računa.`) dodaj v prevajalnik napak, če ta prevaja po besedilu.

- [ ] **Step 6: Vstavi v `src/pages/Racun.tsx`**

Uvozi `KlubskiRacun` in ga postavi za razdelek z navijanjem/poznavalcem (poišči `ProsnjaZaPoznavalca` ali `insider_team_id`; če ga ni, za prvi `<section className="kartica`).

- [ ] **Step 7: Smoke test za oblike napisov**

V `scripts/smoke.jsx` dodaj preverbo (ob obstoječih preverbah jezikov):

```js
// Klubski račun: vsi jeziki imajo vse ključe in ohranijo {klub}/{email}/{razlog}.
for (const [jezik, nizi] of Object.entries(jeziki)) {
  const k = nizi.racun.klubskiRacun
  preveri(`klubskiRacun ${jezik}`, k && k.aktiven.includes('{klub}') && k.naslovRacuna.includes('{email}')
    && k.zavrnjeno.includes('{razlog}') && Object.keys(k.vloge).length === 5)
}
```

Prilagodi imeni `jeziki` in `preveri` tistim, ki jih `smoke.jsx` že uporablja za jezike.

Run: `npm run typecheck && npm run smoke`
Expected: `VSE OK`.

- [ ] **Step 8: Ročni preizkus lokalno**

Run: `npm run dev`; na lokalni bazi ustvari uporabnika z mailom, ki je v `klub_stik` z `team_id` (vstavi vrstico v lokalni `klub_stik`), prijavi se. Stran Račun pokaže »Ta račun zastopa klub …«. Drug uporabnik brez stika vidi obrazec in odda prošnjo.

- [ ] **Step 9: Commit**

```bash
git add src/lib/klubskiRacun.ts src/components/KlubskiRacun.tsx src/lib/useAuth.tsx src/pages/Racun.tsx \
  src/lib/baza.types.ts scripts/smoke.jsx src/i18n/*/racun.ts
git commit -m "Klubski računi: preverba ob prijavi in stran Račun (13 jezikov)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Administracija → Klubi

**Files:**
- Create: `src/components/admin/KlubskiRacuni.tsx`
- Modify: `src/pages/Administracija.tsx` (uvoz ob `PotrjeniPoznavalci`, vstavi ob `<PotrjeniPoznavalci />`, okoli vrstice 752)

**Interfaces:**
- Consumes: `admin_klubski_zahtevki`, `admin_klubski_racuni`, `admin_odloci_klubski_zahtevek`, `admin_preklici_klubski_racun`.

- [ ] **Step 1: Komponenta**

```tsx
// Administracija → Klubi: klubski računi in vrsta zahtevkov (migracija
// 20261013201100). Brez kluba: izberi klub. Polno: izberi račun za preklic.
// Nov naslov: preveri povezavo (dokaz), nato potrdi ali zavrni z razlogom.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/baza.types'

type Zahtevek = Database['public']['Functions']['admin_klubski_zahtevki']['Returns'][number]
type Racun = Database['public']['Functions']['admin_klubski_racuni']['Returns'][number]

const VRSTA: Record<string, string> = { brez_kluba: 'naslov brez kluba', polno: 'klub ima 5 računov', nov_naslov: 'nov naslov' }

export default function KlubskiRacuni() {
  const [zahtevki, setZahtevki] = useState<Zahtevek[] | null>(null)
  const [racuni, setRacuni] = useState<Racun[]>([])
  const [napaka, setNapaka] = useState<string | null>(null)
  const [klubZa, setKlubZa] = useState<Record<number, string>>({})
  const [preklicZa, setPreklicZa] = useState<Record<number, string>>({})
  const [razlogZa, setRazlogZa] = useState<Record<number, string>>({})

  const nalozi = useCallback(async () => {
    const [z, r] = await Promise.all([supabase.rpc('admin_klubski_zahtevki'), supabase.rpc('admin_klubski_racuni')])
    if (z.error || r.error) return setNapaka((z.error ?? r.error)!.message)
    setZahtevki(z.data ?? [])
    setRacuni(r.data ?? [])
  }, [])
  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function odloci(z: Zahtevek, potrdi: boolean) {
    const { error } = await supabase.rpc('admin_odloci_klubski_zahtevek', {
      p_id: z.id,
      p_potrdi: potrdi,
      p_team_id: klubZa[z.id] ? Number(klubZa[z.id]) : undefined,
      p_razlog: razlogZa[z.id] || undefined,
      p_preklici_racun: preklicZa[z.id] ? Number(preklicZa[z.id]) : undefined,
    })
    if (error) return setNapaka(error.message)
    setNapaka(null)
    await nalozi()
  }

  async function preklici(r: Racun) {
    const { error } = await supabase.rpc('admin_preklici_klubski_racun', { p_id: r.id })
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  if (zahtevki === null) return napaka ? <p className="text-sm text-rose-400">{napaka}</p> : null
  const odprti = zahtevki.filter((z) => z.status === 'odprt')
  const aktivni = racuni.filter((r) => !r.preklican_at)

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <h2 className="font-bold">
        Klubi
        <span className="znacka ml-2 bg-sky-400/20 text-sky-200">{aktivni.length} računov</span>
        {odprti.length > 0 && <span className="znacka ml-2 bg-amber-400/20 text-amber-200">{odprti.length} čaka</span>}
      </h2>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {odprti.length === 0 ? (
        <p className="text-sm text-slate-500">Ni odprtih zahtevkov.</p>
      ) : (
        <ul className="space-y-2">
          {odprti.map((z) => (
            <li key={z.id} className="space-y-1 rounded-xl bg-white/5 p-2 text-sm">
              <div>
                <b>{z.team_name ?? '(klub neznan)'}</b> · {VRSTA[z.vrsta] ?? z.vrsta} · {z.email}
                {z.display_name && <> · {z.display_name}</>}
                {z.vloga && <> · {z.vloga}</>}
                {z.team_id && <> · računov: {z.racunov_kluba}/5</>}
              </div>
              {z.dokaz_url && (
                <a href={z.dokaz_url} target="_blank" rel="noreferrer noopener" className="text-sky-300 underline">
                  {z.dokaz_url}
                </a>
              )}
              {z.opomba && <p className="text-slate-400">{z.opomba}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {!z.team_id && (
                  <input
                    placeholder="team_id kluba"
                    value={klubZa[z.id] ?? ''}
                    onChange={(e) => setKlubZa({ ...klubZa, [z.id]: e.target.value })}
                    className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                  />
                )}
                {z.team_id && z.racunov_kluba >= 5 && (
                  <select
                    value={preklicZa[z.id] ?? ''}
                    onChange={(e) => setPreklicZa({ ...preklicZa, [z.id]: e.target.value })}
                    className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                  >
                    <option value="">prekliči račun …</option>
                    {aktivni
                      .filter((r) => r.team_id === z.team_id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.email}
                        </option>
                      ))}
                  </select>
                )}
                <button type="button" className="gumb" onClick={() => void odloci(z, true)}>
                  Potrdi
                </button>
                <input
                  placeholder="razlog zavrnitve"
                  value={razlogZa[z.id] ?? ''}
                  onChange={(e) => setRazlogZa({ ...razlogZa, [z.id]: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
                <button type="button" className="gumb-sekundarni" onClick={() => void odloci(z, false)}>
                  Zavrni
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="cursor-pointer text-sm text-slate-400">Aktivni računi ({aktivni.length})</summary>
        <ul className="mt-2 divide-y divide-white/5 text-sm">
          {aktivni.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-1">
              <span>
                <b>{r.team_name}</b> · {r.email} · od {new Date(r.created_at).toLocaleDateString('sl-SI')}
              </span>
              <button type="button" className="text-xs text-rose-300 underline" onClick={() => void preklici(r)}>
                prekliči
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
```

Razreda gumbov (`gumb`, `gumb-sekundarni`) zamenjaj s tistima, ki ju uporabljajo sosednje admin komponente (npr. `ProsnjePoznavalcev.tsx`). Administracija je le slovenska (brez i18n), kot ostale admin komponente.

- [ ] **Step 2: Vstavi v Administracijo**

V `src/pages/Administracija.tsx` dodaj `import KlubskiRacuni from '../components/admin/KlubskiRacuni'` ob uvozu `PotrjeniPoznavalci` in `<KlubskiRacuni />` takoj za `<PotrjeniPoznavalci />`.

- [ ] **Step 3: Preveri**

Run: `npm run typecheck && npm run smoke`
Expected: brez napak, `VSE OK`.
Ročno (`npm run dev`, lokalni admin): odprt zahtevek iz Task 4, potrdi ga; račun se pojavi med aktivnimi; prekliči ga.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/KlubskiRacuni.tsx src/pages/Administracija.tsx
git commit -m "Administracija: klubski računi in vrsta zahtevkov

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Dokumentacija in PR

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Razdelek v CLAUDE.md**

Dodaj za razdelkom o prevzemu profila igralca (poišči `prevzem_odloci_z_zetonom`):

```markdown
### Klubski računi

Klub dobi račun, ko se prijavi s **potrjenim** uradnim naslovom iz `klub_stik`
(`uveljavi_klubski_racun`, kliče ga `useAuth` ob vsaki prijavi). Do 5 računov
na klub, en klub na uporabnika. Brez admina, razen: naslov brez `team_id`
(`brez_kluba`), poln klub (`polno`) in prošnja za nov naslov
(`klub_zaprosi_za_naslov`, predlagani naslov je vedno mail računa). Vse v
Administraciji → Klubi (`admin_odloci_klubski_zahtevek`). Preklican račun se
ob prijavi ne obnovi. Pravice klubskega računa (pozicije, dodajanje igralcev,
stran kluba, prijave napak) prihajajo v fazah 2–4
(`docs/superpowers/specs/2026-10-13-klubski-racuni-design.md`); povsod velja
`je_klubski_racun(uid, team_id)`. Klub nikoli ne piše minut, golov, cen ali
`reg_st`.
```

- [ ] **Step 2: Celotna preverba**

Run: `npx supabase db reset && npm run test:varnost && npm run typecheck && npm run smoke`
Expected: vse zeleno.

- [ ] **Step 3: Commit, push, PR**

```bash
git add CLAUDE.md
git commit -m "CLAUDE.md: klubski računi

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin klubski-racuni
gh pr create --title "Klubski računi (faza 1): preverba z uradnim mailom, prošnje, Administracija → Klubi" --body "…povzetek, število povezanih HR stikov iz Task 3…

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Pred `git push` preveri, da sta verziji migracij še vedno večji od produkcije in `origin/main` (glej Global Constraints).

---

## Faze 2–4 (oris; vsaka dobi svoj načrt)

**Faza 2: pozicije, potrjevanje profilov, stran kluba.**
- `position_source` CHECK + `'klub'`; tabela `pozicije_klub_cakajo(player_id PK, position, user_id, created_at)` in `pozicije_klub_dnevnik`.
- RPC `klub_nastavi_pozicijo(p_player_id, p_position)` (`je_klubski_racun` za `players.team_id`; ne prepiše `admin`).
- `uveljavi_pozicije()` najprej uveljavi `pozicije_klub_cakajo`, nato glasovanje.
- `'klub'` dodaj na sezname izjem: `potrdi_pozicijo`, `pozicije_v_cakanju`, `smeVVrata` (`scripts/uvoz-zapisnikov.mjs:301`), `scripts/ugani-pozicije.mjs:122`, `scripts/uskladi-pozicije.mjs:99`.
- `prevzem_je_poznavalec_kluba` + `or je_klubski_racun(p_user, p.team_id)`.
- `klub_predstavitev`, vedro `grbi-klubov`, `teams.logo_vir`; grbne skripte preskočijo `logo_vir = 'klub'`.
- `klub_pregled(p_team_id)`; stran `/club/:id` z oznako »Uradni račun kluba« in urejanjem za klub.

**Faza 3: dodajanje igralcev.**
- `players.dodal_klub_at`; RPC `klub_dodaj_igralca` (25 na klub na sezono), `klub_odstrani_igralca`.
- Alarmi: ≥10 v 24 h, 20/25, podobno ime (trigram ali Levenshtein na normaliziranem imenu).
- Posvojitev v `igralecId` (`scripts/uvoz-zapisnikov.mjs:291`) pred vpisom novega, s smoke testi (en zadetek, dva, obrnjen vrstni red, šumniki).
- Pogled `klubski_igralci_brez_nastopa` (6 tednov); preverba v `preveri-podatke.mjs`.

**Faza 4: prijave napak v zapisniku.**
- `popravki_zapisnika`, RPC `klub_prijavi_napako` (največ 10 odprtih), gumb na strani tekme za oba kluba, Discord, zavihek v Administraciji, stanje in odgovor vidna klubu.
