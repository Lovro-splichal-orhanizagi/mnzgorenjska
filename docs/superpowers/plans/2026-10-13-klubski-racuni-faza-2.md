# Klubski računi, faza 2 — načrt izvedbe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Klubski račun lahko nastavlja pozicije svojih igralcev (uveljavijo se v ponedeljek), potrjuje profile svojih igralcev in ureja stran kluba (grb, opis, povezave).

**Architecture:** Nov vir pozicije `klub`: zahteva gre v `pozicije_klub_cakajo`, tedenski `uveljavi_pozicije()` jo uveljavi pred glasovanjem; `klub` je zaklenjen kot `admin` povsod, kjer je zaklenjen `admin`. Potrjevanje profilov le razširi `prevzem_je_poznavalec_kluba`. Stran kluba: `klub_predstavitev` (javno branje), vedro `grbi-klubov`, `teams.logo_vir` s sprožilcem, ki skriptam za grbe prepreči povoziti grb kluba.

**Tech Stack:** Postgres (Supabase), React + TypeScript, `supabase/tests/varnost.sql`, `npm run smoke`, `npm run typecheck`.

**Spec:** `docs/superpowers/specs/2026-10-13-klubski-racuni-design.md` (razdelka 2 in 4). Faza 1: `docs/superpowers/plans/2026-10-13-klubski-racuni.md`.

## Global Constraints

- Migracije: verzija večja od produkcije in `origin/main`, minuta liha. Ta načrt: `20261013211100`, `20261013213100`, `20261013215100`. Pred pushem preveri `select max(version) from supabase_migrations.schema_migrations` na `ssh SLFF` in `ls supabase/migrations | tail -1`.
- Pravica kluba je vedno `je_klubski_racun(auth.uid(), <team_id igralca ali kluba>)` (faza 1).
- Klub **ne prepiše** `admin`; prepiše `glasovanje`, `ugibanje`, `neznano`, `zapisnik`.
- Pozicija kluba velja od ponedeljka 02:00 UTC (`uveljavi_pozicije`), nikoli takoj.
- Klub nikoli ne piše minut, golov, cen, `reg_st`.
- Novi napisi v 13 jezikih (`sl en hr sk cs hu de sr ro et pl es lv mk`), brez pomišljajev.
- Testne uporabniške id-je v `varnost.sql` začni z `f1a10000-` (d1a1 in e1a1 sta zasedena).
- Lokalno: `npx supabase migration up --local` (ne reset, razen na koncu); smoke z `VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=lokalni`.
- Nikoli `git add -A`. Trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Glasovanje po ponedeljku ne sme povoziti pozicije kluba.** Pričakovano: `potrdi_pozicijo` preskoči `klub`. Test v Task 1.
2. **Klub ne nastavi pozicije igralcu drugega kluba** (tudi ne prek drugega tekmovanja). Test v Task 1.
3. **Skripta za grbe ali `zdruzi-klube` povozi grb, ki ga je naložil klub.** Pričakovano: sprožilec ohrani grb. Test v Task 3.
4. **Admin pozicije klub ne prepiše**, niti s čakajočo zahtevo, ki se uveljavi po adminovem popravku. Test v Task 1.
5. **Preklican klubski račun** ne more več pisati (pozicije, predstavitev, grb). Test v Task 3.

---

## Datoteke

| datoteka | vloga |
|---|---|
| `supabase/migrations/20261013211100_klub_pozicije.sql` | vir `klub`, čakajoče pozicije, dnevnik, RPC, posodobljeni `potrdi_pozicijo`, `uveljavi_pozicije`, `pozicije_v_cakanju` |
| `supabase/migrations/20261013213100_klub_potrjuje_profile.sql` | `prevzem_je_poznavalec_kluba` + klubski račun |
| `supabase/migrations/20261013215100_klub_stran.sql` | `klub_predstavitev`, `ima_klubski_racun`, `teams.logo_vir` + sprožilec, vedro `grbi-klubov`, RPC grba |
| `supabase/tests/varnost.sql` | testi (blok pred zaključno preverbo) |
| `scripts/ugani-pozicije.mjs` | `klub` med zaklenjenimi in zanesljivimi |
| `src/lib/klubskiRacun.ts` | `useMojKlub()`, `pripraviGrb()` |
| `src/components/KlubUrejanje.tsx` | stran kluba: pozicije, predstavitev, grb (le za klubski račun) |
| `src/components/KlubPredstavitev.tsx` | javni prikaz: oznaka »Uradni račun kluba«, opis, povezave |
| `src/pages/Klub.tsx` | vstavi obe komponenti |
| `src/pages/Pozicije.tsx` | `klub` zaklenjen, oznaka |
| `src/i18n/*/lestvice.ts`, `src/i18n/*/tekme.ts` | napisi |
| `src/lib/baza.types.ts` | `npm run tipi` + `npx prettier --no-semi --write` |
| `CLAUDE.md` | posodobi razdelek »Klubski računi« |

---

### Task 1: Pozicije kluba (baza)

**Files:** Create `supabase/migrations/20261013211100_klub_pozicije.sql`; Test `supabase/tests/varnost.sql`

**Interfaces:**
- Consumes: `je_klubski_racun(uuid, bigint)`, `klubski_racuni` (faza 1).
- Produces: `klub_nastavi_pozicijo(p_player_id bigint, p_position text) returns void`, `klub_preklici_pozicijo(p_player_id bigint) returns void`, `klub_cakajoce_pozicije(p_team_id bigint) returns table(player_id bigint, position text, created_at timestamptz)`; `position_source = 'klub'`.

- [ ] **Step 1: Testi (padejo)** — dodaj pred `do $$\ndeclare v_napak int;`:

```sql
-- --------------------------------------------------------------------------
-- Klubski računi, faza 2: pozicije
-- --------------------------------------------------------------------------
reset role;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('f1a10000-0000-4000-8000-000000000001', 'klub.ena@example.invalid', now(), '{"display_name":"KE"}', now()),
 ('f1a10000-0000-4000-8000-000000000002', 'klub.dva@example.invalid', now(), '{"display_name":"KD"}', now());
-- KE zastopa klub -913001, KD klub -913002 (vstavimo neposredno, kot admin).
insert into klubski_racuni(user_id, team_id) values
 ('f1a10000-0000-4000-8000-000000000001', -913001),
 ('f1a10000-0000-4000-8000-000000000002', -913002);
-- -913006 je igralec kluba -913001 (MID, admin iz začetka datoteke); za test ga
-- postavimo na glasovanje, -913011 (kluba -913001) ostane admin.
update players set position = 'MID', position_source = 'glasovanje' where id = -913006;

select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select klub_nastavi_pozicijo(-913006, 'FWD');
select pg_temp.preveri('klub-poz: zahteva čaka, pozicija se ne spremeni takoj',
  (select position from players where id = -913006) = 'MID'
  and exists (select 1 from klub_cakajoce_pozicije(-913001) where player_id = -913006 and position = 'FWD'));
select klub_nastavi_pozicijo(-913006, 'DEF');
select pg_temp.preveri('klub-poz: nova zahteva zamenja staro',
  (select count(*) from klub_cakajoce_pozicije(-913001) where player_id = -913006) = 1
  and (select position from klub_cakajoce_pozicije(-913001) where player_id = -913006) = 'DEF');
select pg_temp.napaka('klub-poz: neveljavna pozicija', $$select klub_nastavi_pozicijo(-913006, 'XYZ')$$);
select pg_temp.zavrnjeno('klub-poz: igralec drugega kluba',
  $$select klub_nastavi_pozicijo((select id from players where team_id = -913002 limit 1), 'GK')$$);
select pg_temp.zavrnjeno('klub-poz: čakajoče drugega kluba niso vidne',
  $$select * from klub_cakajoce_pozicije(-913002)$$);
select pg_temp.zavrnjeno('klub-poz: tabele ni mogoče brati', $$select * from pozicije_klub_cakajo$$);
-- Admin igralec: zahteva se sprejme, a se ob uveljavitvi ne uveljavi.
select klub_nastavi_pozicijo(-913011, 'GK');
reset role;

set local role anon;
select pg_temp.zavrnjeno('klub-poz: anonimni ne nastavlja', $$select klub_nastavi_pozicijo(-913006, 'GK')$$);
reset role;

-- Tedenska uveljavitev (kot cron).
select uveljavi_pozicije();
select pg_temp.preveri('klub-poz: ponedeljek uveljavi pozicijo kluba',
  (select position || '/' || position_source from players where id = -913006) = 'DEF/klub');
select pg_temp.preveri('klub-poz: admin pozicije klub ne prepiše',
  (select position_source from players where id = -913011) = 'admin');
select pg_temp.preveri('klub-poz: po uveljavitvi ni več čakajočih',
  not exists (select 1 from pozicije_klub_cakajo where player_id in (-913006, -913011)));
select pg_temp.preveri('klub-poz: dnevnik zabeleži spremembo',
  exists (select 1 from pozicije_klub_dnevnik where player_id = -913006 and staro = 'MID' and novo = 'DEF'));

-- Glasovanje ne povozi pozicije kluba.
insert into position_votes(player_id, voter_id, position)
select -913006, u, 'GK' from (values
 ('b8a06635-2322-4444-8c42-44e419f912ab'::uuid), ('b8a06635-2322-4444-8c42-44e419f912ac'::uuid),
 ('b8a06635-2322-4444-8c42-44e419f912ad'::uuid)) v(u)
on conflict do nothing;
select potrdi_pozicijo(-913006);
select pg_temp.preveri('klub-poz: glasovanje ne povozi kluba',
  (select position_source from players where id = -913006) = 'klub');
select pg_temp.preveri('klub-poz: pozicije_v_cakanju ne kaže igralcev kluba',
  not exists (select 1 from pozicije_v_cakanju where player_id = -913006));

-- Preklican račun ne piše več.
update klubski_racuni set preklican_at = now() where user_id = 'f1a10000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('klub-poz: preklican račun ne nastavlja',
  $$select klub_nastavi_pozicijo((select id from players where team_id = -913002 limit 1), 'GK')$$);
reset role;
update klubski_racuni set preklican_at = null where user_id = 'f1a10000-0000-4000-8000-000000000002';
```

Run: `npm run test:varnost` → Expected: `function klub_nastavi_pozicijo(...) does not exist`.

- [ ] **Step 2: Migracija**

```sql
-- Klubski računi, faza 2: pozicije kluba (spec, razdelek 2).
--
-- Klub nastavi pozicijo svojega igralca. Ne velja takoj: zahteva čaka v
-- `pozicije_klub_cakajo` in jo uveljavi tedenski `uveljavi_pozicije()`
-- (ponedeljek 02:00 UTC), pred glasovanjem in pred cenami, tako kot glasovi.
-- Uveljavljena pozicija ima vir `klub`, ki je zaklenjen kot `admin`:
-- glasovanje in skripte ga ne spremenijo. Klub ne prepiše `admin`.

alter table public.players drop constraint if exists players_position_source_check;
alter table public.players add constraint players_position_source_check
  check (position_source in ('neznano', 'ugibanje', 'zapisnik', 'glasovanje', 'admin', 'klub'));

create table public.pozicije_klub_cakajo (
  player_id  bigint primary key references public.players on delete cascade,
  position   text not null check (position in ('GK', 'DEF', 'MID', 'FWD')),
  user_id    uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create table public.pozicije_klub_dnevnik (
  id         bigint generated always as identity primary key,
  player_id  bigint not null references public.players on delete cascade,
  staro      text,
  novo       text not null,
  user_id    uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index pozicije_klub_dnevnik_igralec on public.pozicije_klub_dnevnik (player_id, created_at desc);
alter table public.pozicije_klub_cakajo enable row level security;
alter table public.pozicije_klub_dnevnik enable row level security;
revoke all on public.pozicije_klub_cakajo, public.pozicije_klub_dnevnik from anon, authenticated;

create or replace function public.klub_nastavi_pozicijo(p_player_id bigint, p_position text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_team bigint;
begin
  select team_id into v_team from players where id = p_player_id;
  if auth.uid() is null or v_team is null or not je_klubski_racun(auth.uid(), v_team) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  if p_position not in ('GK', 'DEF', 'MID', 'FWD') then
    raise exception 'Pozicija je GK, DEF, MID ali FWD.';
  end if;
  insert into pozicije_klub_cakajo(player_id, position, user_id)
  values (p_player_id, p_position, auth.uid())
  on conflict (player_id) do update
    set position = excluded.position, user_id = excluded.user_id, created_at = now();
end;
$$;

create or replace function public.klub_preklici_pozicijo(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_team bigint;
begin
  select team_id into v_team from players where id = p_player_id;
  if auth.uid() is null or v_team is null or not je_klubski_racun(auth.uid(), v_team) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  delete from pozicije_klub_cakajo where player_id = p_player_id;
end;
$$;

create or replace function public.klub_cakajoce_pozicije(p_team_id bigint)
returns table (player_id bigint, position text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  return query
    select c.player_id, c.position, c.created_at
      from pozicije_klub_cakajo c join players p on p.id = c.player_id
     where p.team_id = p_team_id
     order by c.created_at;
end;
$$;

revoke all on function public.klub_nastavi_pozicijo(bigint, text), public.klub_preklici_pozicijo(bigint),
  public.klub_cakajoce_pozicije(bigint) from public, anon;
grant execute on function public.klub_nastavi_pozicijo(bigint, text), public.klub_preklici_pozicijo(bigint),
  public.klub_cakajoce_pozicije(bigint) to authenticated;

-- Glasovanje: `klub` je zaklenjen kot zapisnik in admin. Telo je enako
-- 20260919090000_poznavalec_lige.sql, spremenjen je le seznam zaklenjenih.
create or replace function public.potrdi_pozicijo(p_player_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id        bigint;
  v_competition_id bigint;
  v_utez_insider   numeric;
  v_utez_lige      numeric;
  v_position       text;
  v_utez           numeric;
  v_prag           numeric;
begin
  select team_id, competition_id into v_team_id, v_competition_id
  from players where id = p_player_id;

  v_utez_insider := nastavitev_int_za('utez_insider', v_competition_id, 3);
  v_utez_lige := nastavitev_int_za(
    'utez_poznavalca_lige', v_competition_id,
    nastavitev_int_za('prag_glasov_pozicija', v_competition_id, 5)
  );

  -- Zapisnik, admin in klub so neomajni.
  if exists (
    select 1 from players
    where id = p_player_id and position_source in ('zapisnik', 'admin', 'klub')
  ) then
    return;
  end if;

  select
    pv.position,
    sum(greatest(
      voter_weight(pv.voter_id),
      case when pf.insider_team_id = v_team_id then v_utez_insider else 1.0 end,
      case when pf.insider_competition_id = v_competition_id then v_utez_lige else 1.0 end
    ))
    into v_position, v_utez
  from position_votes pv
  join profiles pf on pf.id = pv.voter_id
  where pv.player_id = p_player_id
  group by pv.position
  order by 2 desc
  limit 1;

  if v_position is null then
    return;
  end if;

  v_prag := adaptivni_prag(p_player_id, v_position);

  if v_utez >= v_prag then
    update players
      set position = v_position,
          position_source = 'glasovanje'
    where id = p_player_id
      and (position is distinct from v_position
           or position_source is distinct from 'glasovanje');
  end if;
end;
$$;

-- Tedenska uveljavitev: najprej klub (nad glasovanjem), nato glasovi.
create or replace function public.uveljavi_pozicije()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_igralec record;
  v_pred text;
  v_spremenjenih int := 0;
begin
  for v_igralec in
    select c.player_id, c.position, c.user_id, p.position as staro, p.position_source
      from pozicije_klub_cakajo c join players p on p.id = c.player_id
  loop
    if v_igralec.position_source is distinct from 'admin' then
      update players set position = v_igralec.position, position_source = 'klub'
       where id = v_igralec.player_id;
      insert into pozicije_klub_dnevnik(player_id, staro, novo, user_id)
      values (v_igralec.player_id, v_igralec.staro, v_igralec.position, v_igralec.user_id);
      if v_igralec.staro is distinct from v_igralec.position then
        v_spremenjenih := v_spremenjenih + 1;
      end if;
    end if;
    delete from pozicije_klub_cakajo where player_id = v_igralec.player_id;
  end loop;

  for v_igralec in
    select distinct pv.player_id from position_votes pv
  loop
    select position into v_pred from players where id = v_igralec.player_id;
    perform potrdi_pozicijo(v_igralec.player_id);
    if (select position from players where id = v_igralec.player_id)
       is distinct from v_pred then
      v_spremenjenih := v_spremenjenih + 1;
    end if;
  end loop;
  return v_spremenjenih;
end;
$$;

-- Pogled za stran Pozicije: igralci kluba ne čakajo na glasove.
create or replace view public.pozicije_v_cakanju as
select
  p.id as player_id,
  p.full_name,
  p.competition_id,
  p.team_id,
  p.position as trenutna,
  v.position as izglasovana,
  v.weight as utez,
  v.votes as glasov,
  adaptivni_prag(p.id, v.position) as prag
from players p
join lateral (
  select pvw.position, pvw.weight, pvw.votes
  from position_vote_weights pvw
  where pvw.player_id = p.id
  order by pvw.weight desc
  limit 1
) v on true
where p.position_source not in ('zapisnik', 'admin', 'klub')
  and v.weight >= adaptivni_prag(p.id, v.position)
  and p.position is distinct from v.position;
```

Pred pisanjem preveri, da sta `potrdi_pozicijo` in pogled res zadnji različici (`grep -l "potrdi_pozicijo\|pozicije_v_cakanju" supabase/migrations/*.sql | tail -2`) in da `create or replace view` ohrani obstoječe pravice (ista imena in vrstni red stolpcev).

Run: `npx supabase migration up --local && npm run test:varnost` → Expected: vse `klub-poz:` PASS, `VSE OK`.

- [ ] **Step 3: Commit** — `git add supabase/migrations/20261013211100_klub_pozicije.sql supabase/tests/varnost.sql`; sporočilo »Klubski računi: pozicije kluba (uveljavijo se v ponedeljek)«.

---

### Task 2: Klub potrjuje profile svojih igralcev (baza)

**Files:** Create `supabase/migrations/20261013213100_klub_potrjuje_profile.sql`; Test `supabase/tests/varnost.sql`

**Interfaces:** Consumes `je_klubski_racun`; changes `prevzem_je_poznavalec_kluba(uuid, bigint)` (ista podpisa).

- [ ] **Step 1: Test (pade)**

Nov igralec kluba -913001 (obstoječi igralci kluba so v drugih testih že uporabljeni):

```sql
-- Klub KE (-913001) potrdi zahtevek za igralca svojega kluba; KD (-913002) ne.
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-921001, -913001, -913001, 'Klub', 'Profil', 'Profil Klub', 'MID', 'admin', 5, 5, true);
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('f1a10000-0000-4000-8000-000000000003', 'igralec.kluba@example.invalid', now(), '{"display_name":"IK"}', now());
insert into zahtevki_igralca(player_id, user_id) values (-921001, 'f1a10000-0000-4000-8000-000000000003');
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('klub-profil: drug klub ne potrdi',
  $$select odloci_zahtevek_klub((select id from zahtevki_igralca where player_id = -921001 and status = 'cakajoc'), true)$$);
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
select odloci_zahtevek_klub((select id from zahtevki_igralca where player_id = -921001 and status = 'cakajoc'), true);
reset role;
select pg_temp.preveri('klub-profil: klubski račun potrdi profil svojega igralca',
  exists (select 1 from zahtevki_igralca where player_id = -921001 and status = 'potrjen' and potrdil = 'klub'));
```

Če `odloci_zahtevek_klub` nepooblaščenemu ne vrne `insufficient_privilege`, ampak drugo napako, zamenjaj `pg_temp.zavrnjeno` s `pg_temp.napaka` in to zapiši v ledger.

Run: `npm run test:varnost` → Expected: FAIL `klub-profil: klubski račun potrdi profil svojega igralca` (ali `insufficient_privilege` pri KE).

- [ ] **Step 2: Migracija**

```sql
-- Klubski računi, faza 2: klubski račun potrjuje profile igralcev svojega
-- kluba, tako kot odobren poznavalec kluba (spec, razdelek 4).
create or replace function public.prevzem_je_poznavalec_kluba(p_user uuid, p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from players p join profiles pf on pf.id = p_user
     where p.id = p_player_id
       and (pf.insider_competition_id = p.competition_id
            or je_klubski_racun(p_user, p.team_id)
            or (pf.insider_team_id = p.team_id
                and exists (select 1 from poznavalec_prosnje pp
                             where pp.user_id = p_user and pp.status = 'klub'
                               and pp.team_id = p.team_id and pp.competition_id = p.competition_id))))
$$;
revoke all on function public.prevzem_je_poznavalec_kluba(uuid, bigint) from public, anon, authenticated;
```

Run: `npx supabase migration up --local && npm run test:varnost` → Expected: `VSE OK`.

- [ ] **Step 3: Commit** — »Klubski računi: klub potrjuje profile svojih igralcev«.

---

### Task 3: Stran kluba — predstavitev in grb (baza)

**Files:** Create `supabase/migrations/20261013215100_klub_stran.sql`; Test `supabase/tests/varnost.sql`

**Interfaces:**
- Produces: tabela `klub_predstavitev(team_id, opis, spletna_stran, instagram, facebook, updated_at)` (javno branje); `ima_klubski_racun(p_team_id bigint) returns boolean` (anon); `klub_uredi_predstavitev(p_team_id bigint, p_opis text, p_spletna_stran text, p_instagram text, p_facebook text) returns void`; `klub_nastavi_grb(p_team_id bigint, p_pot text) returns text` (vrne javni naslov); `admin_ponastavi_grb(p_team_id bigint) returns void`; `teams.logo_vir text`; vedro `grbi-klubov`.

- [ ] **Step 1: Testi (padejo)**

```sql
-- Stran kluba.
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select klub_uredi_predstavitev(-913001, 'Klub z dolgo tradicijo.', 'https://klub.example.org', 'nk_test', null);
select pg_temp.napaka('klub-stran: spletna stran mora biti https',
  $$select klub_uredi_predstavitev(-913001, null, 'javascript:alert(1)', null, null)$$);
select pg_temp.zavrnjeno('klub-stran: drug klub ne ureja',
  $$select klub_uredi_predstavitev(-913002, 'x', null, null, null)$$);
select klub_nastavi_grb(-913001, '-913001/grb-abc.webp');
select pg_temp.zavrnjeno('klub-stran: grb le v svojo mapo',
  $$select klub_nastavi_grb(-913001, '-913002/grb-abc.webp')$$);
reset role;
set local role anon;
select pg_temp.preveri('klub-stran: predstavitev je javna',
  (select opis from klub_predstavitev where team_id = -913001) = 'Klub z dolgo tradicijo.');
select pg_temp.preveri('klub-stran: oznaka uradnega računa je javna',
  ima_klubski_racun(-913001) and not ima_klubski_racun(-913005));
reset role;
select pg_temp.preveri('klub-stran: grb kluba je zapisan',
  (select logo_vir from teams where id = -913001) = 'klub'
  and (select logo_url from teams where id = -913001) like '%/grbi-klubov/-913001/grb-abc.webp');
-- Skripta za grbe (service_role) ne povozi grba kluba.
update teams set logo_url = '/grbi/drug.png' where id = -913001;
select pg_temp.preveri('klub-stran: skripta ne povozi grba kluba',
  (select logo_url from teams where id = -913001) like '%/grbi-klubov/-913001/grb-abc.webp');
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_ponastavi_grb(-913001);
reset role;
update teams set logo_url = '/grbi/drug.png' where id = -913001;
select pg_temp.preveri('klub-stran: po adminovi ponastavitvi skripta spet piše',
  (select logo_url from teams where id = -913001) = '/grbi/drug.png' and (select logo_vir from teams where id = -913001) is null);
-- Preklican račun ne ureja strani.
update klubski_racuni set preklican_at = now() where user_id = 'f1a10000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('klub-stran: preklican račun ne ureja',
  $$select klub_uredi_predstavitev(-913001, 'y', null, null, null)$$);
reset role;
```

Run → Expected: `function klub_uredi_predstavitev(...) does not exist`.

- [ ] **Step 2: Migracija**

```sql
-- Klubski računi, faza 2: stran kluba (spec, razdelek 4). Klubski račun
-- ureja opis in povezave ter naloži grb. Grb kluba ima prednost pred grbi iz
-- skript: sprožilec ohrani `logo_url`, dokler admin ne ponastavi vira.

create table public.klub_predstavitev (
  team_id       bigint primary key references public.teams on delete cascade,
  opis          text check (opis is null or (char_length(opis) between 1 and 300 and opis !~ '[[:cntrl:]]')),
  spletna_stran text check (spletna_stran is null or (length(spletna_stran) <= 200 and spletna_stran ~ '^https://[^[:space:]<>"''\\]+$')),
  instagram     text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  facebook      text check (facebook is null or facebook ~ '^[A-Za-z0-9.]{5,50}$'),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles on delete set null
);
alter table public.klub_predstavitev enable row level security;
revoke all on public.klub_predstavitev from anon, authenticated;
grant select (team_id, opis, spletna_stran, instagram, facebook, updated_at) on public.klub_predstavitev to anon, authenticated;
create policy "predstavitev kluba je javna" on public.klub_predstavitev for select using (true);

create or replace function public.ima_klubski_racun(p_team_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from klubski_racuni where team_id = p_team_id and preklican_at is null) $$;
grant execute on function public.ima_klubski_racun(bigint) to anon, authenticated;

create or replace function public.klub_uredi_predstavitev(p_team_id bigint, p_opis text, p_spletna_stran text,
                                                          p_instagram text, p_facebook text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  insert into klub_predstavitev(team_id, opis, spletna_stran, instagram, facebook, updated_at, updated_by)
  values (p_team_id, nullif(btrim(coalesce(p_opis, '')), ''), nullif(btrim(coalesce(p_spletna_stran, '')), ''),
          nullif(btrim(coalesce(p_instagram, '')), ''), nullif(btrim(coalesce(p_facebook, '')), ''), now(), auth.uid())
  on conflict (team_id) do update
    set opis = excluded.opis, spletna_stran = excluded.spletna_stran, instagram = excluded.instagram,
        facebook = excluded.facebook, updated_at = now(), updated_by = auth.uid();
end;
$$;

-- Grb: vir 'klub' zaklene logo_url pred skriptami (prenesi-grbe*, grbi-*,
-- zdruzi-klube). Spremeni ga le RPC spodaj (nastavi `slff.grb_kluba`).
alter table public.teams add column if not exists logo_vir text check (logo_vir is null or logo_vir = 'klub');

create or replace function public.trg_teams_grb_kluba()
returns trigger language plpgsql set search_path = public
as $$
begin
  if old.logo_vir = 'klub' and coalesce(current_setting('slff.grb_kluba', true), '') <> 'da' then
    new.logo_url := old.logo_url;
    new.logo_vir := old.logo_vir;
  end if;
  return new;
end;
$$;
drop trigger if exists teams_grb_kluba on public.teams;
create trigger teams_grb_kluba before update of logo_url, logo_vir on public.teams
  for each row execute function public.trg_teams_grb_kluba();

create or replace function public.klub_nastavi_grb(p_team_id bigint, p_pot text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_url text;
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  if p_pot !~ ('^' || p_team_id::text || '/[A-Za-z0-9_-]{1,64}\.(webp|png)$') then
    raise insufficient_privilege using message = 'Grb mora biti v mapi svojega kluba.';
  end if;
  v_url := coalesce(nullif(current_setting('app.settings.api_url', true), ''), '')
           || '/storage/v1/object/public/grbi-klubov/' || p_pot;
  perform set_config('slff.grb_kluba', 'da', true);
  update teams set logo_url = v_url, logo_vir = 'klub' where id = p_team_id;
  perform set_config('slff.grb_kluba', '', true);
  return v_url;
end;
$$;

create or replace function public.admin_ponastavi_grb(p_team_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  perform set_config('slff.grb_kluba', 'da', true);
  update teams set logo_vir = null where id = p_team_id;
  perform set_config('slff.grb_kluba', '', true);
end;
$$;

revoke all on function public.klub_uredi_predstavitev(bigint, text, text, text, text),
  public.klub_nastavi_grb(bigint, text), public.admin_ponastavi_grb(bigint) from public, anon;
grant execute on function public.klub_uredi_predstavitev(bigint, text, text, text, text),
  public.klub_nastavi_grb(bigint, text), public.admin_ponastavi_grb(bigint) to authenticated;

-- Vedro grbov: javno branje, pisanje le klubski račun v mapo svojega kluba.
create or replace function public.klub_sme_pisati_grb(p_name text)
returns boolean language sql stable security definer set search_path = public
as $$
  select p_name ~ '^-?[0-9]{1,18}/[A-Za-z0-9_-]{1,64}\.(webp|png)$'
     and je_klubski_racun(auth.uid(), split_part(p_name, '/', 1)::bigint)
$$;
grant execute on function public.klub_sme_pisati_grb(text) to authenticated;

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Sheme storage ni: vedro grbov ni ustvarjeno.';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('grbi-klubov', 'grbi-klubov', true, 524288, array['image/webp', 'image/png'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
                                 allowed_mime_types = excluded.allowed_mime_types;
  drop policy if exists "grbi klubov: klub naloži" on storage.objects;
  drop policy if exists "grbi klubov: klub zamenja" on storage.objects;
  drop policy if exists "grbi klubov: klub bere" on storage.objects;
  create policy "grbi klubov: klub bere" on storage.objects for select to authenticated
    using (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name));
  create policy "grbi klubov: klub naloži" on storage.objects for insert to authenticated
    with check (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name));
  create policy "grbi klubov: klub zamenja" on storage.objects for update to authenticated
    using (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name))
    with check (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name));
end;
$$;
```

**Javni naslov grba.** `app.settings.api_url` morda ni nastavljen; preveri, kako vmesnik sestavi javni naslov fotografije (`naslovFotografije` v `src/lib/prevzem.ts`, uporablja `API_URL`). Če baza naslova ne pozna, naj `klub_nastavi_grb` v `logo_url` zapiše **relativno pot** `/storage/v1/object/public/grbi-klubov/<pot>` in `naslovSlike` (`src/lib/platforma`) jo dopolni z `API_URL`, kot to že dela za relativne poti; prilagodi test (`like '%/grbi-klubov/-913001/grb-abc.webp'` drži v obeh primerih). Zapiši odločitev v ledger.

Run: `npx supabase migration up --local && npm run test:varnost` → Expected: `VSE OK`.

- [ ] **Step 3: Commit** — »Klubski računi: predstavitev kluba in grb (skripte ga ne povozijo)«.

---

### Task 4: Skripte pozicij

**Files:** Modify `scripts/ugani-pozicije.mjs:122,144,177`; comment in `scripts/uvoz-zapisnikov.mjs:296`

- [ ] **Step 1:** V `ugani-pozicije.mjs` dodaj `'klub'` v oba seznama preskočenih (`['zapisnik', 'admin', 'glasovanje', 'klub']`, vrstici 122 in 177) in v `zanesljivi` (vrstica 144). V `uvoz-zapisnikov.mjs` ob `smeVVrata` dopolni komentar: »`klub` (pozicija kluba) je kot `admin`: pogoj spodaj ga že izključi, ker ni `neznano` ne `ugibanje`.« `uskladi-pozicije.mjs` bere le `zapisnik/ugibanje/neznano` in ostane nespremenjen.
- [ ] **Step 2:** Run `node --check scripts/ugani-pozicije.mjs && npm run smoke` (z lokalnimi spremenljivkami) → `VSE OK`.
- [ ] **Step 3: Commit** — »Pozicije: skripte ne spreminjajo pozicije kluba«.

---

### Task 5: Vmesnik — stran kluba in Pozicije

**Files:** Create `src/components/KlubUrejanje.tsx`, `src/components/KlubPredstavitev.tsx`; Modify `src/lib/klubskiRacun.ts`, `src/pages/Klub.tsx`, `src/pages/Pozicije.tsx`, `src/i18n/*/lestvice.ts`, `src/i18n/*/tekme.ts`, `src/lib/baza.types.ts`

**Interfaces:** Consumes RPC iz Task 1–3; `moj_klubski_racun` (faza 1); `useAuth().klubPreverjen`.

- [ ] **Step 1: Tipi** — `npm run tipi && npx prettier --no-semi --write src/lib/baza.types.ts`; `npm run typecheck` → brez napak.

- [ ] **Step 2: `src/lib/klubskiRacun.ts`** — dodaj:

```ts
import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'

/** Klub (team_id), ki ga zastopa prijavljeni uporabnik, ali null. */
export function useMojKlub(): number | null {
  const { session, klubPreverjen } = useAuth()
  const [klub, setKlub] = useState<number | null>(null)
  useEffect(() => {
    if (!session || !klubPreverjen) return setKlub(null)
    void mojKlubskiRacun().then((s) => setKlub(s.racun?.team_id ?? null))
  }, [session, klubPreverjen])
  return klub
}

/** Grb za nalaganje: celoten (brez izreza) v 256 × 256, prozorno ozadje, WebP ali PNG. */
export async function pripraviGrb(datoteka: File): Promise<{ blob: Blob; koncnica: 'webp' | 'png' }> {
  if (datoteka.size > 20 * 1024 * 1024) throw new Error('prevelika')
  if (!/^image\/(jpeg|png|webp|svg\+xml)$/.test(datoteka.type)) throw new Error('vrsta')
  const bmp = await createImageBitmap(datoteka)
  try {
    const platno = document.createElement('canvas')
    platno.width = platno.height = 256
    const ctx = platno.getContext('2d')!
    const s = Math.min(256 / bmp.width, 256 / bmp.height)
    const w = bmp.width * s, h = bmp.height * s
    ctx.drawImage(bmp, (256 - w) / 2, (256 - h) / 2, w, h)
    const kot = (vrsta: string) => new Promise<Blob | null>((r) => platno.toBlob(r, vrsta, 0.9))
    const webp = await kot('image/webp')
    if (webp && webp.type === 'image/webp') return { blob: webp, koncnica: 'webp' }
    const png = await kot('image/png')
    if (!png) throw new Error('kodiranje')
    return { blob: png, koncnica: 'png' }
  } finally {
    bmp.close()
  }
}
```

(Uvoz `useAuth` v `klubskiRacun.ts` ustvari krožni uvoz z `useAuth.tsx`, ki uvaža `uveljaviKlubskiRacun`. Če typecheck ali smoke to javi, premakni `useMojKlub` v novo datoteko `src/lib/useMojKlub.ts`.)

- [ ] **Step 3: `src/components/KlubPredstavitev.tsx`** (javno):

```tsx
// Stran kluba: predstavitev, ki jo uredi klubski račun (migracija 20261013215100),
// in oznaka "Uradni račun kluba". Brez predstavitve in računa ne pokaže ničesar.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'

export interface Predstavitev {
  opis: string | null
  spletna_stran: string | null
  instagram: string | null
  facebook: string | null
}

export default function KlubPredstavitev({ klubId, osvezi }: { klubId: number; osvezi: number }) {
  const [p, setP] = useState<Predstavitev | null>(null)
  const [uraden, setUraden] = useState(false)
  useEffect(() => {
    let veljavno = true
    void Promise.all([
      supabase.from('klub_predstavitev').select('opis, spletna_stran, instagram, facebook').eq('team_id', klubId).maybeSingle(),
      supabase.rpc('ima_klubski_racun', { p_team_id: klubId }),
    ]).then(([a, b]) => {
      if (!veljavno) return
      setP((a.data as Predstavitev | null) ?? null)
      setUraden(Boolean(b.data))
    })
    return () => {
      veljavno = false
    }
  }, [klubId, osvezi])
  if (!uraden && !p) return null
  return (
    <section className="space-y-1 text-sm">
      {uraden && <span className="znacka bg-sky-400/20 text-sky-200">✓ {t('lestvice.klub.uradniRacun')}</span>}
      {p?.opis && <p className="text-slate-300">{p.opis}</p>}
      <div className="flex flex-wrap gap-3 text-sky-300">
        {p?.spletna_stran && (
          <a href={p.spletna_stran} target="_blank" rel="noreferrer noopener nofollow" className="underline">
            {new URL(p.spletna_stran).hostname}
          </a>
        )}
        {p?.instagram && (
          <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer noopener" className="underline">
            Instagram
          </a>
        )}
        {p?.facebook && (
          <a href={`https://facebook.com/${p.facebook}`} target="_blank" rel="noreferrer noopener" className="underline">
            Facebook
          </a>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: `src/components/KlubUrejanje.tsx`** (le za klubski račun tega kluba): zložljiv razdelek »Urejanje kluba« s tremi deli:
  1. **Pozicije**: seznam igralcev strani (prop `igralci: { id: number; full_name: string | null; position: string | null }[]`), ob vsakem `<select>` GK/DEF/MID/FWD; sprememba kliče `klub_nastavi_pozicijo`; čakajoče (`klub_cakajoce_pozicije`) označi z »velja od ponedeljka« in gumbom za preklic (`klub_preklici_pozicijo`). Igralec z virom `admin` ima izbiro onemogočeno (prop vključuje `position_source`).
  2. **Predstavitev**: obrazec (opis ≤300, spletna stran https, Instagram, Facebook uporabniško ime) → `klub_uredi_predstavitev`; po shranjevanju pokliče `onSpremeni()`.
  3. **Grb**: `<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">` → `pripraviGrb` → `supabase.storage.from('grbi-klubov').upload(`${klubId}/grb-${crypto.randomUUID().slice(0, 8)}.${koncnica}`, blob, { contentType })` → `klub_nastavi_grb` → `onSpremeni()`.
  Napake prek `prevediNapako`. Vsi napisi `lestvice.klub.urejanje.*`. Sledi slogu `KlubskiRacun.tsx` (faza 1) in razredom `kartica`, `gumb-glavni`.

- [ ] **Step 5: `src/pages/Klub.tsx`** — `const mojKlub = useMojKlub()`, `const [osvezi, setOsvezi] = useState(0)`; pod glavo `<KlubPredstavitev klubId={Number(id)} osvezi={osvezi} />`; pred `<ZahtevkiKluba …/>` `{mojKlub === Number(id) && <KlubUrejanje klubId={Number(id)} igralci={…} onSpremeni={() => { setOsvezi((n) => n + 1); /* ponovno naloži klub (grb) */ }} />}`. Igralcem strani dodaj `position_source` v poizvedbo (`player_season_standings` ga morda nima; če ne, preberi `players.position_source` za id-je igralcev v enem `in` klicu).

- [ ] **Step 6: `src/pages/Pozicije.tsx:546-547`** — `const odKluba = igralec.position_source === 'klub'`; `zaklenjeno = izZapisnika || igralec.position_source === 'admin' || odKluba`; v `title` znački: `odKluba ? t('tekme.pozicije.igralec.odKluba') : …`, v znački ` · klub` (`t('tekme.pozicije.igralec.klub')`).

- [ ] **Step 7: Napisi (13 jezikov)** — v `lestvice.ts` pod `klub`: `uradniRacun`, `urejanje: { naslov, pozicije, velјaOdPonedeljka, preklici, predstavitev, opis, spletnaStran, instagram, facebook, shrani, shranjeno, grb, naloziGrb, grbNapaka }`; v `tekme.ts` pod `pozicije.igralec`: `odKluba` (»Pozicijo je nastavil klub«), `klub` (» · klub«). Sl in en napiši sam, ostale prevedi v tonu datoteke. Napake RPC (`Samo klubski račun tega kluba.`, `Pozicija je GK, DEF, MID ali FWD.`, `Grb mora biti v mapi svojega kluba.`) dodaj v `src/lib/napake.ts` s ključi `lestvice.klub.urejanje.napake.*`.

- [ ] **Step 8: Preveri** — `npm run typecheck && npm run smoke` (lokalne spremenljivke) → `VSE OK` (smoke preveri vse ključe v 13 jezikih). Ročno: `npm run dev`, lokalni uporabnik s klubskim računom (vstavi v `klubski_racuni`), stran `/club/<id>`: urejanje vidno, pozicija čaka, predstavitev se pokaže; drug uporabnik urejanja ne vidi.

- [ ] **Step 9: Commit** — »Klubski računi: urejanje strani kluba in pozicij (13 jezikov)«.

---

### Task 6: Dokumentacija, celotna preverba, PR

- [ ] **Step 1:** V `CLAUDE.md` razdelek »Klubski računi« dopolni: vir pozicije `klub` (čaka v `pozicije_klub_cakajo`, uveljavi `uveljavi_pozicije` v ponedeljek pred glasovanjem, zaklenjen kot `admin`, admin ga prepiše; dnevnik `pozicije_klub_dnevnik`), potrjevanje profilov (`prevzem_je_poznavalec_kluba`), `klub_predstavitev`, `ima_klubski_racun`, grb (`grbi-klubov`, `teams.logo_vir = 'klub'`, sprožilec `teams_grb_kluba` ohrani grb pred skriptami, `admin_ponastavi_grb`).
- [ ] **Step 2:** `npx supabase db reset --local && npm run test:varnost && npm run typecheck && npm run smoke` → vse zeleno.
- [ ] **Step 3:** Commit, push, `gh pr create` (telo konča z `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).
- [ ] **Step 4 (po združitvi):** dodaj odstavek o klubskem računu v osnutke mailov (`~/Projects/SLFF/outreach/sestavi_hr.py`, `sestavi.py`: prvi mail in opomnik, HR/SL/SK), zdaj brez »kmalu« za pozicije in stran kluba; dodajanje igralcev še »kmalu«. Pokaži uporabniku pred kakršnimkoli pošiljanjem.
