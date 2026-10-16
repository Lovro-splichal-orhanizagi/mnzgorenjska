# SLFF Scout faza 3a: zaledje MVP (računi, branje, seznam, plačila) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Baza in plačila za `scout.slff.eu`: klub z uradnim klubskim računom sam začne 14-dnevni preizkus, zasede do 3 sedeže, plača paket Klub (39 €/mesec ali 290 €/sezono) prek Stripe in prek SECURITY DEFINER RPC išče igralce, odpre profil, vidi podobne, vrzeli v kadru in opazovalni seznam (do 30). Vsak klic preveri sedež, naročnino, odprto državo, skritost in mladoletnost, dnevno mejo in se zapiše v dnevnik (12 mesecev). Vmesnik (faza 3b, ločen načrt `2026-10-16-scout-faza3b-aplikacija.md`) bere le te RPC.

**Architecture:** Štiri nove tabele v zaprti shemi `scout`: `narocnine` (ključ `team_id`, en zapis na klub), `sedezi` (ključ `user_id`, sedež = uradni račun kluba iz obstoječih `klubski_racuni`), `dnevnik`, `opazovani`. Vse branje gre skozi notranjo `scout.dostop(vrsta, igralec, parametri)` (sedež + aktiven klubski račun + veljavna naročnina + odprta država + meja + vrstica v dnevniku) in `scout.vidni(model, država)` (zadnji **objavljeni** model, brez skritih, anonimiziranih, mladinskih vrstic in zaprtih držav). Poizvedbe so v notranjih `scout.*_jedro` (merljive na produkciji brez sedeža), javni RPC v `public` jih le ovijejo. Plačila: nova funkcija `scout-placilo` (Checkout, portal) in veja `metadata.app = slff-scout` v obstoječem `stripe-webhook`.

**Tech Stack:** PostgreSQL (Supabase, migracije, pg_cron), Deno Edge Functions, Stripe REST (Checkout, Billing portal, webhooks), `test:varnost` (SQL), `smoke` (vite-node).

**Spec:** docs/superpowers/specs/2026-10-16-scout-design.md

## Global Constraints

- Veja: `feat/scout-faza3a-zaledje` iz `main`; en PR, commit na nalogo. Faza 3b (vmesnik, objava) je ločen PR po združitvi tega.
- Migracije (nove datoteke; obstoječih ne spreminjaj): `20261017140100_scout_racuni.sql`, `20261017140200_scout_branje.sql`, `20261017140300_scout_opazovani.sql`, `20261017140400_scout_placila.sql`.
- Brskalnik sheme `scout` ne vidi (ni USAGE, RLS brez politik za `anon`/`authenticated`); vse prek `security definer` RPC v `public` s `set search_path = public`, `revoke all … from public, anon` (servisne tudi `authenticated`), izrecen `grant execute`.
- Notranje funkcije `scout.*`: `revoke all … from public, anon, authenticated`. `scout.vidni`, `scout.privolitve_vrstic`, `scout.liga_kluba` in `scout.*_jedro` so `language sql stable` **brez** `set search_path` in s polno kvalificiranimi imeni, da jih planer vstavi (inlining) in potisne filter na igralca v poizvedbo.
- Klub vidi **le zadnji objavljeni model**: `scout.zadnji_model() = (select id from scout.modeli where objavljen order by id desc limit 1)`. Brez objavljenega modela RPC vrnejo prazno.
- Država kluba je `teams.country_id`; odprta pomeni `scout.drzave.stanje <> 'zaprto'` (enako kot stroj in faza 2).
- Meje (konstante v `scout.dostop`): 500 klicev `igralec` in 300 ostalih klicev na klub na ljubljanski dan; iskanje 25 vrstic na stran, odmik največ 175 (prvih 200); podobni 10; seznam 30; sedeži 3.
- Kode napak za vmesnik so v `hint` (`scout-pogoji`, `scout-preizkus-porabljen`, `scout-drzava`, `scout-ni-narocnine`, `scout-sedezi-polni`, `scout-meja`, `scout-filter`, `scout-ni-igralca`, `scout-seznam-poln`, `scout-ze-placano`); brez sedeža ali veljavne naročnine `insufficient_privilege` (42501).
- Dnevnik: vsak klic s podatki igralcev (`isci`, `igralec`, `podobni`, `vrzeli`, `opazuj`, `opazovani`), hramba 12 mesecev (`scout.pocisti()`, pg_cron `47 4 * * *`). Zavrnjen klic se ne zapiše (napaka razveljavi transakcijo).
- Stripe: cene po `lookup_key` `slff_scout_klub_mesec` (3900 EUR centov, mesečno) in `slff_scout_klub_sezona` (29000, letno), `tax_behavior=exclusive`; metapodatki `app=slff-scout`, `team_id`, `user_id`, `obdobje` na seji in naročnini; milost 3 dni kot pri preverjenih. Id-jev Stripe ni v kodi.
- **Preklic naročnine mora biti vedno mogoč**: `scout_portal_kupec()` vrne kupca plačniku ali kateremukoli aktivnemu klubskemu računu kluba, ne glede na sedež, naročnino in zaprtje.
- Vsaka nova poizvedba se pred združitvijo izmeri na produkciji v transakciji z `rollback` (pravilo po 16. 10.: join z OR je na produkciji obvisel); sprejemljivo pod 1000 ms na klic.
- Besedišče (spec 2): "kazalniki iz podatkov tekem", brez negativnih oznak (velja za vmesnik v 3b; v SQL ni nizov za uporabnika razen sporočil napak).
- Zunaj obsega 3a/3b (YAGNI, z razlogom v *Spec coverage*): sporočila klub → igralec, tedensko poročilo, mesečni mail "vaba", Pro, PDF, primerjava, CSV, razdalja.
- Commit sporočila: conventional, zadnja vrstica `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Structure

| datoteka | sprememba |
|---|---|
| `supabase/migrations/20261017140100_scout_racuni.sql` | nova: `scout.narocnine`, `scout.sedezi`, `scout.dnevnik`, `scout.opazovani`, `scout.pocisti()` + pg_cron, RPC `scout_moj_klub`, `scout_zacni_preizkus`, `scout_zasedi_sedez`, `scout_sprosti_sedez` |
| `supabase/migrations/20261017140200_scout_branje.sql` | nova: `scout.zadnji_model`, `scout.dostop`, `scout.vidni`, `scout.privolitve_vrstic`, `scout.liga_kluba`, jedra in RPC `scout_isci`, `scout_igralec`, `scout_podobni`, `scout_vrzeli` |
| `supabase/migrations/20261017140300_scout_opazovani.sql` | nova: `scout.opazovani_jedro`, RPC `scout_opazuj`, `scout_opazovani` |
| `supabase/migrations/20261017140400_scout_placila.sql` | nova: RPC `scout_pripravi_nakup`, `scout_portal_kupec`; servisne `scout_iz_placila`, `scout_podaljsaj`, `scout_narocnina_konec` |
| `supabase/tests/varnost.sql` | blok "Scout, faza 3" (štirje deli, en na migracijo) |
| `supabase/functions/stripe-webhook/scout.ts` | nova: `scoutPostavkeVeljajo` (čista funkcija, preveri jo smoke) |
| `supabase/functions/stripe-webhook/index.ts` | veja `app=slff-scout` |
| `supabase/functions/scout-placilo/index.ts` | nova: Checkout in portal za klube |
| `scripts/smoke.jsx` | preverjanje `scoutPostavkeVeljajo` |
| `src/lib/baza.types.ts` | regenerirano (`npm run tipi`) |
| `docs/scout.md`, `docs/podatkovni-model.md`, `README.md` | opis faze 3a |

---

### Task 1: Računi klubov, sedeži, dnevnik (migracija 1)

**Files:**
- Create: `supabase/migrations/20261017140100_scout_racuni.sql`
- Modify: `supabase/tests/varnost.sql`

**Interfaces:**
- Consumes: `public.klubski_racuni(user_id, team_id, preklican_at)`, `public.je_klubski_racun(uuid, bigint)`, `public.teams(id, name, country_id)`, `public.profiles(id, display_name)`, `public.players(id, anonimiziran_at)`, `public.preverjeni_na_discord(text)`, `scout.drzave`, `scout.je_skrit(bigint[])`.
- Produces:
  - `scout.narocnine(team_id bigint pk → teams, country_id bigint, paket text 'preizkus'|'klub', obdobje text null|'mesec'|'sezona', velja_do timestamptz, pogoji_sprejeti_at timestamptz, pogoje_sprejel uuid, stripe_customer_id text, stripe_subscription_id text unique, placal uuid, zaprt_at timestamptz, created_at, updated_at)`
  - `scout.sedezi(user_id uuid pk → profiles, team_id bigint → scout.narocnine, created_at)`
  - `scout.dnevnik(id bigint pk, team_id bigint, user_id uuid, vrsta text, player_id bigint, parametri jsonb, created_at)`
  - `scout.opazovani(team_id bigint → scout.narocnine, player_id bigint, dodal uuid, created_at, pk (team_id, player_id))`
  - `scout.pocisti() returns void`
  - `public.scout_moj_klub() returns jsonb` (null, če uporabnik ni uradni račun kluba)
  - `public.scout_zacni_preizkus(p_sprejmem_pogoje boolean) returns void`
  - `public.scout_zasedi_sedez() returns void`
  - `public.scout_sprosti_sedez(p_user uuid) returns void`

- [ ] **Step 1: Veja**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
git switch main && git pull --ff-only && git switch -c feat/scout-faza3a-zaledje
```

- [ ] **Step 2: Test (pade, ker funkcij še ni)**

V `supabase/tests/varnost.sql` tik pred vrstico `do $$`, ki ji sledi `declare v_napak int;` (povzetek na koncu datoteke), vstavi:

```sql
-- ---------------------------------------------------------------------------
-- Scout, faza 3 (migracije 20261017140100-140400): računi, branje, seznam,
-- plačila. K1..K4 (e5c3...001-004) so uradni računi kluba -913001 (SI), X
-- (e5c3...005) nima kluba. Igralci -930001.. so v testnih ligah.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('e5c30000-0000-4000-8000-000000000001','scout-k1@example.invalid','{"display_name":"ScoutK1"}',now()),
 ('e5c30000-0000-4000-8000-000000000002','scout-k2@example.invalid','{"display_name":"ScoutK2"}',now()),
 ('e5c30000-0000-4000-8000-000000000003','scout-k3@example.invalid','{"display_name":"ScoutK3"}',now()),
 ('e5c30000-0000-4000-8000-000000000004','scout-k4@example.invalid','{"display_name":"ScoutK4"}',now()),
 ('e5c30000-0000-4000-8000-000000000005','scout-x@example.invalid','{"display_name":"ScoutX"}',now());
insert into klubski_racuni (user_id, team_id)
select ('e5c30000-0000-4000-8000-00000000000' || n)::uuid, -913001 from generate_series(1, 4) n;

select pg_temp.preveri('scout3: anon ne klice funkcij racunov, notranjih nihce',
  not has_function_privilege('anon', 'public.scout_moj_klub()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_zacni_preizkus(boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_zasedi_sedez()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_sprosti_sedez(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.scout_moj_klub()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.pocisti()', 'EXECUTE'));

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.preveri('scout3: brez klubskega racuna ni kluba', scout_moj_klub() is null);
select pg_temp.zavrnjeno('scout3: brez klubskega racuna ni preizkusa', $$select scout_zacni_preizkus(true)$$);
select pg_temp.zavrnjeno('scout3: brskalnik ne bere narocnin', $$select * from scout.narocnine$$);
select pg_temp.zavrnjeno('scout3: brskalnik ne bere dnevnika', $$select * from scout.dnevnik$$);
select pg_temp.zavrnjeno('scout3: brskalnik ne pise sedezev',
  $$insert into scout.sedezi (user_id, team_id) values (auth.uid(), -913001)$$);
reset role;

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: preizkus brez pogojev zavrnjen', $$select scout_zacni_preizkus(false)$$, 'scout-pogoji');
select scout_zacni_preizkus(true);
select pg_temp.preveri('scout3: preizkus 14 dni in sedez zacetnika',
  (select (k->'narocnina'->>'paket') = 'preizkus' and (k->>'sedez')::boolean and (k->'narocnina'->>'velja')::boolean
          and (k->'narocnina'->>'velja_do')::timestamptz between now() + interval '13 days' and now() + interval '15 days'
     from scout_moj_klub() k));
reset role;

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.napaka('scout3: drug preizkus istega kluba zavrnjen', $$select scout_zacni_preizkus(true)$$, 'scout-preizkus-porabljen');
select scout_zasedi_sedez();
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000003',true);
set local role authenticated;
select scout_zasedi_sedez();
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.napaka('scout3: cetrti sedez zavrnjen', $$select scout_zasedi_sedez()$$, 'scout-sedezi-polni');
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_sprosti_sedez('e5c30000-0000-4000-8000-000000000003');
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000004',true);
set local role authenticated;
select scout_zasedi_sedez();
select pg_temp.preveri('scout3: sproscen sedez zasede drug racun',
  (select jsonb_array_length(k->'sedezi') = 3 and (k->>'sedez')::boolean from scout_moj_klub() k));
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: tujec ne sprosti sedeza',
  $$select scout_sprosti_sedez('e5c30000-0000-4000-8000-000000000001')$$);
reset role;
select set_config('request.jwt.claim.sub','',true);

insert into scout.dnevnik (team_id, user_id, vrsta, created_at) values
  (-913001, null, 'isci', now() - interval '13 months'),
  (-913001, null, 'isci', now() - interval '11 months');
select scout.pocisti();
select pg_temp.preveri('scout3: dnevnik hrani 12 mesecev',
  (select count(*) = 1 from scout.dnevnik where team_id = -913001 and created_at < now() - interval '10 months'));
```

```bash
npm run test:varnost
```

Expected: napaka `function scout_moj_klub() does not exist` (psql ustavi z ON_ERROR_STOP).

- [ ] **Step 3: Migracija `supabase/migrations/20261017140100_scout_racuni.sql`**

```sql
-- SLFF Scout, faza 3a: računi klubov. Spec: docs/superpowers/specs/2026-10-16-scout-design.md.
--
-- Naročnina pripada klubu (team_id), sedež uradnemu računu kluba
-- (klubski_racuni: potrjen uradni naslov iz klub_stik). Do 3 sedeži na klub.
-- Preizkus 14 dni enkrat na klub, brez kartice, s sprejetjem pogojev; plačilo
-- zapiše stripe-webhook (20261017140400). Država naročnine je država kluba.
-- Dnevnik klicev s podatki igralcev se hrani 12 mesecev (scout.pocisti).
-- Brskalnik tabel ne vidi; vse gre prek SECURITY DEFINER RPC.

create table scout.narocnine (
  -- Brez kaskade: zdruzi-klube ne sme tiho pobrisati plačane naročnine.
  team_id                bigint primary key references public.teams,
  country_id             bigint not null references public.countries,
  paket                  text not null check (paket in ('preizkus', 'klub')),
  obdobje                text check (obdobje in ('mesec', 'sezona')),
  velja_do               timestamptz not null,
  pogoji_sprejeti_at     timestamptz not null,
  pogoje_sprejel         uuid references public.profiles on delete set null,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  -- Uporabnik, ki je plačal: portal (preklic) mu ostane, tudi brez sedeža.
  placal                 uuid references public.profiles on delete set null,
  -- Zaprt zaradi kršitve pogojev (admin, ročno).
  zaprt_at               timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check ((paket = 'klub') = (obdobje is not null))
);
comment on table scout.narocnine is
  'Naročnina kluba na SLFF Scout (preizkus ali Klub). Velja, dokler velja_do > now() in zaprt_at is null.';

create table scout.sedezi (
  user_id    uuid primary key references public.profiles on delete cascade,
  team_id    bigint not null references scout.narocnine on delete cascade,
  created_at timestamptz not null default now()
);
create index sedezi_klub on scout.sedezi (team_id);

create table scout.dnevnik (
  id         bigint generated always as identity primary key,
  -- Brez tujih ključev na klub in igralca: zapis mora preživeti brisanje.
  team_id    bigint not null,
  user_id    uuid references public.profiles on delete set null,
  vrsta      text not null check (vrsta in ('isci', 'igralec', 'podobni', 'vrzeli', 'opazuj', 'opazovani')),
  player_id  bigint,
  parametri  jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index dnevnik_klub_cas on scout.dnevnik (team_id, created_at);
create index dnevnik_igralec on scout.dnevnik (player_id) where player_id is not null;
comment on table scout.dnevnik is
  'Vsak klic Scouta s podatki igralcev (klub, uporabnik, igralec, čas). 12 mesecev: zloraba in zahteva igralca, kateri klubi so ga gledali.';

create table scout.opazovani (
  team_id    bigint not null references scout.narocnine on delete cascade,
  player_id  bigint not null,
  dodal      uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

alter table scout.narocnine enable row level security;
alter table scout.sedezi    enable row level security;
alter table scout.dnevnik   enable row level security;
alter table scout.opazovani enable row level security;
revoke all on scout.narocnine, scout.sedezi, scout.dnevnik, scout.opazovani from public, anon, authenticated;
revoke all on all sequences in schema scout from public, anon, authenticated;

-- Hramba: dnevnik 12 mesecev; s seznama gredo skriti, anonimizirani in
-- izbrisani igralci (ugovor velja tudi za seznam kluba).
create function scout.pocisti()
returns void language sql
as $$
  delete from scout.dnevnik where created_at < now() - interval '12 months';
  delete from scout.opazovani o
   where not exists (select 1 from public.players p where p.id = o.player_id and p.anonimiziran_at is null)
      or scout.je_skrit(array[o.player_id]);
$$;
revoke all on function scout.pocisti() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('scout-pocisti', '47 4 * * *', 'select scout.pocisti()');
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — scout.pocisti() je treba poganjati ročno', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC za uradne račune klubov
-- ---------------------------------------------------------------------------

-- Stanje za stran Račun kluba; null, če uporabnik ni uradni račun kluba.
create function public.scout_moj_klub()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'team_id', r.team_id, 'klub', t.name, 'country_id', t.country_id,
    'drzava_odprta', coalesce(d.stanje <> 'zaprto', false),
    'narocnina', (select jsonb_build_object(
                     'paket', n.paket, 'obdobje', n.obdobje, 'velja_do', n.velja_do,
                     'velja', n.velja_do > now() and n.zaprt_at is null,
                     'placljiva', n.stripe_customer_id is not null)
                    from scout.narocnine n where n.team_id = r.team_id),
    'sedez', exists (select 1 from scout.sedezi s where s.user_id = auth.uid() and s.team_id = r.team_id),
    'sedezi', coalesce((select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'ime', p.display_name)
                                         order by s.created_at)
                          from scout.sedezi s join profiles p on p.id = s.user_id
                         where s.team_id = r.team_id), '[]'::jsonb))
    from klubski_racuni r
    join teams t on t.id = r.team_id
    left join scout.drzave d on d.country_id = t.country_id
   where r.user_id = auth.uid() and r.preklican_at is null
$$;

create function public.scout_zacni_preizkus(p_sprejmem_pogoje boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team bigint;
  v_country bigint;
begin
  select r.team_id, t.country_id into v_team, v_country
    from klubski_racuni r join teams t on t.id = r.team_id
   where r.user_id = v_uid and r.preklican_at is null;
  if v_team is null then
    raise insufficient_privilege using message = 'Scout: le uradni račun kluba.';
  end if;
  if p_sprejmem_pogoje is not true then
    raise exception 'Scout: za preizkus sprejmi pogoje.' using hint = 'scout-pogoji';
  end if;
  if coalesce((select d.stanje from scout.drzave d where d.country_id = v_country), 'zaprto') = 'zaprto' then
    raise exception 'Scout: država kluba ni odprta.' using hint = 'scout-drzava';
  end if;
  perform 1 from teams where id = v_team for update;  -- dva hkratna preizkusa
  if exists (select 1 from scout.narocnine n where n.team_id = v_team) then
    raise exception 'Scout: klub je preizkus že uporabil.' using hint = 'scout-preizkus-porabljen';
  end if;
  insert into scout.narocnine (team_id, country_id, paket, velja_do, pogoji_sprejeti_at, pogoje_sprejel)
  values (v_team, v_country, 'preizkus', now() + interval '14 days', now(), v_uid);
  delete from scout.sedezi s where s.user_id = v_uid;
  insert into scout.sedezi (user_id, team_id) values (v_uid, v_team);
  perform preverjeni_na_discord(format('🔎 Scout: preizkus %s', (select name from teams where id = v_team)));
end;
$$;

create function public.scout_zasedi_sedez()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team bigint;
begin
  select r.team_id into v_team from klubski_racuni r where r.user_id = v_uid and r.preklican_at is null;
  if v_team is null then
    raise insufficient_privilege using message = 'Scout: le uradni račun kluba.';
  end if;
  perform 1 from scout.narocnine n where n.team_id = v_team for update;  -- četrti sedež ob dirki
  if not found then
    raise exception 'Scout: klub nima naročnine.' using hint = 'scout-ni-narocnine';
  end if;
  if exists (select 1 from scout.sedezi s where s.user_id = v_uid and s.team_id = v_team) then
    return;
  end if;
  -- Šteje le sedeže računov, ki so še uradni računi kluba.
  if (select count(*) from scout.sedezi s where s.team_id = v_team and je_klubski_racun(s.user_id, v_team)) >= 3 then
    raise exception 'Scout: vsi trije sedeži so zasedeni.' using hint = 'scout-sedezi-polni';
  end if;
  delete from scout.sedezi s where s.user_id = v_uid;  -- sedež prejšnjega kluba
  insert into scout.sedezi (user_id, team_id) values (v_uid, v_team);
end;
$$;

-- Sedež sprosti njegov imetnik ali katerikoli sedež istega kluba.
create function public.scout_sprosti_sedez(p_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  delete from scout.sedezi s
   where s.user_id = p_user
     and (p_user = v_uid
          or exists (select 1 from scout.sedezi m
                      where m.user_id = v_uid and m.team_id = s.team_id and je_klubski_racun(v_uid, m.team_id)));
  if not found then
    raise insufficient_privilege using message = 'Scout: sedeža ni mogoče sprostiti.';
  end if;
end;
$$;

revoke all on function public.scout_moj_klub(), public.scout_zacni_preizkus(boolean),
  public.scout_zasedi_sedez(), public.scout_sprosti_sedez(uuid) from public, anon;
grant execute on function public.scout_moj_klub(), public.scout_zacni_preizkus(boolean),
  public.scout_zasedi_sedez(), public.scout_sprosti_sedez(uuid) to authenticated;
```

- [ ] **Step 4: Uveljavi in poženi teste**

```bash
npx supabase migration up
npm run test:varnost
```

Expected: `VSE OK`, vrstice `PASS scout3: …` brez `FAIL`.

- [ ] **Step 5: Commit**

Verigo migracij na prazni bazi preveri CI posel *Pravice in roki v svezi bazi* (`supabase db start` + `test:varnost`); lokalne baze z uvoženimi ligami ne resetiraj.

```bash
git add supabase/migrations/20261017140100_scout_racuni.sql supabase/tests/varnost.sql
git commit -F - <<'MSG'
feat(scout): naročnine, sedeži in dnevnik klubov

Preizkus 14 dni enkrat na klub, do 3 sedeži uradnih računov kluba, dnevnik
12 mesecev (pg_cron).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 2: Dostop in branje (iskanje, profil, podobni, vrzeli)

**Files:**
- Create: `supabase/migrations/20261017140200_scout_branje.sql`
- Modify: `supabase/tests/varnost.sql`

**Interfaces:**
- Consumes: naloga 1 (`scout.narocnine`, `scout.sedezi`, `scout.dnevnik`, `scout.opazovani`); faza 1 (`scout.modeli.objavljen`, `scout.indeks`, `scout.kazalniki`, `scout.vektorji`, `scout.vrzeli`, `scout.lige_moc`, `scout.ekipe_elo`, `scout.drzave`); faza 2 (`scout.ugovori`, `scout.privolitve`, `scout.kljuci_vrstic`); `public.anonimizacijski_kljuc(text)`, `public.je_mladinski_slug(text)`, `public.je_klubski_racun(uuid, bigint)`, `public.zahtevki_igralca`, `public.povezani_igralci`, `public.federations`.
- Produces:
  - `scout.zadnji_model() returns bigint`
  - `scout.dostop(p_vrsta text, p_player_id bigint, p_parametri jsonb) returns table(model_id bigint, team_id bigint, country_id bigint)`
  - `scout.vidni(p_model bigint, p_country bigint) returns table(player_id bigint, skupina text, indeks double precision, percentil double precision, zaupanje double precision)`
  - `scout.privolitve_vrstic() returns table(player_id bigint, odprt_za_prestop boolean, letnik int, regije bigint[], kontakt_dovoljen boolean)`
  - `scout.liga_kluba(p_model bigint, p_team bigint) returns table(competition_id bigint, moc double precision)`
  - `scout.isci_jedro(p_model, p_country, p_team bigint, p_skupina text, p_raven text, p_regije bigint[], p_min_minut int, p_samo_odprti boolean, p_od int)`, `scout.igralec_jedro(p_model, p_country, p_team, p_player bigint) returns jsonb`, `scout.podobni_jedro(p_model, p_country, p_team, p_player bigint)`, `scout.vrzeli_jedro(p_model, p_country, p_team bigint)`
  - `public.scout_isci(p_skupina text default null, p_raven text default 'vse', p_regije bigint[] default '{}', p_min_minut int default 0, p_samo_odprti boolean default false, p_od int default 0) returns table(player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision, zaupanje double precision, minute int, delez_minut double precision, goli_90_pri_nas double precision, odprt_za_prestop boolean)`
  - `public.scout_igralec(p_player_id bigint) returns jsonb` (null, če igralec ni viden): ključi `player_id, ime, klub, liga, skupina, indeks, percentil, zaupanje, moc_lige, moc_kluba, opazujem, privolitev{odprt_za_prestop, letnik, kontakt_dovoljen, regije[]}|null, sezone[{sezona, liga, klub, minute, delez_minut, zacetki_delez, cele_delez, goli_ref_90, goli_90_pri_nas, delez_golov, enajstm, onoff_ref_90, prejeti_ref_90, ciste_delez, kartoni_90, vratar_ref_90, stalnost, trend_minut, zaupanje}]|null`
  - `public.scout_podobni(p_player_id bigint) returns table(player_id bigint, ime text, klub text, liga text, skupina text, podobnost double precision, percentil double precision, minute int, odprt_za_prestop boolean)`
  - `public.scout_vrzeli() returns table(liga text, skupina text, vrsta text, player_id bigint, ime text, vrednost double precision)`

- [ ] **Step 1: Test (pade)**

Tik pred povzetek (`do $$` z `declare v_napak int;`) vstavi:

```sql
-- Scout 3, branje. Model -> objavljen (s3.model) in novejši neobjavljen.
-- -930001 viden, -930002 skrit (ugovor), -930003 mladinska liga, -930004
-- anonimiziran, -930005 zaprta država (HR), -930006 le v neobjavljenem,
-- -930007 viden v klubu K (-913001).
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-930100, 'test-scout3-u19', 'Scout3 U19', 'S3U', false, (select id from countries where code='SI'), 'mnzg'),
       (-930200, 'test-scout3-hr', 'Scout3 HR', 'S3H', false, (select id from countries where code='HR'), 'hns');
insert into teams(id, name, short_name, country_id) overriding system value
values (-930201, 'Scout3 HR klub', 'S3H', (select id from countries where code='HR'));
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-930001, -913002, -913001, 'Scout', 'Vidni', 'Scout Vidni', 'FWD', 'admin', 6, 6, true),
       (-930002, -913002, -913001, 'Scout', 'Skriti', 'Scout Skriti', 'FWD', 'admin', 6, 6, true),
       (-930003, -913002, -930100, 'Scout', 'Mladi', 'Scout Mladi', 'FWD', 'admin', 6, 6, true),
       (-930004, -913002, -913001, 'Scout', 'Anonimni', 'Scout Anonimni', 'FWD', 'admin', 6, 6, true),
       (-930005, -930201, -930200, 'Scout', 'Hrvat', 'Scout Hrvat', 'FWD', 'admin', 6, 6, true),
       (-930006, -913002, -913001, 'Scout', 'Neobjavljeni', 'Scout Neobjavljeni', 'FWD', 'admin', 6, 6, true),
       (-930007, -913001, -913001, 'Scout', 'Domaci', 'Scout Domaci', 'MID', 'admin', 6, 6, true);
update players set anonimiziran_at = now() where id = -930004;
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-930002]::bigint[]);
insert into scout.modeli (leto, backtest, parametri, objavljen) values (2026, '{}', '{}', true);
insert into scout.modeli (leto, backtest, parametri, objavljen) values (2026, '{}', '{}', false);
create temporary table s3 as
select (select max(id) from scout.modeli where objavljen) as model,
       (select max(id) from scout.modeli where not objavljen) as neobjavljen;
insert into scout.lige_moc (model_id, competition_id, moc, vir, prestopov, izracunano_at)
select s3.model, c, 0, 'model', 0, now() from s3, unnest(array[-913001, -930100, -930200]::bigint[]) c;
insert into scout.ekipe_elo (model_id, team_id, competition_id, leto, elo)
select s3.model, -913001, -913001, 2026, 1500 from s3;
insert into scout.indeks (model_id, player_id, skupina, indeks, percentil, zaupanje)
select s3.model, p.id, p.position, 1, 90, 1
  from s3, players p where p.id in (-930001, -930002, -930003, -930004, -930005, -930007);
insert into scout.indeks (model_id, player_id, skupina, indeks, percentil, zaupanje)
select s3.neobjavljen, -930006, 'FWD', 1, 99, 1 from s3;
insert into scout.kazalniki (model_id, player_id, competition_id, sezona, leto, team_id, skupina, minute,
  delez_minut, zacetki_delez, cele_delez, goli_ref_90, delez_golov, enajstm, onoff_ref_90, prejeti_ref_90,
  ciste_delez, kartoni_90, vratar_ref_90, stalnost, trend_minut, prehod_ravni, zaupanje)
select s3.model, p.id, p.competition_id, '2026/27', 2026, p.team_id, p.position, 900,
       0.8, 0.8, 0.7, 0.5, 0.3, 0, 0.2, 1.1, 0.2, 0.1, 0, 0.9, 0, null, 1
  from s3, players p where p.id in (-930001, -930002, -930003, -930004, -930005, -930007);
insert into scout.vektorji (model_id, player_id, skupina, vektor, podobni, podobnost)
select s3.model, -930001, 'FWD', array[0.1, 0.2],
       array[-930002, -930003, -930004, -930005, -930006, -930007]::bigint[], array[0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
  from s3;
insert into scout.vrzeli (model_id, team_id, competition_id, skupina, vrsta, player_id, vrednost)
select s3.model, -913001, -913001, 'FWD', 'tanka', null, 1 from s3
union all select s3.model, -913001, -913001, 'MID', 'padajoce_minute', -930007, -0.4 from s3
union all select s3.model, -913001, -913001, 'FWD', 'disciplina', -930002, 0.5 from s3;

select pg_temp.preveri('scout3: anon ne bere, notranjih funkcij brskalnik ne klice',
  not has_function_privilege('anon', 'public.scout_isci(text, text, bigint[], integer, boolean, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_igralec(bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_podobni(bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_vrzeli()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.dostop(text, bigint, jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.vidni(bigint, bigint)', 'EXECUTE'));

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: brez sedeza ni iskanja', $$select * from scout_isci()$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni profila', $$select scout_igralec(-930001)$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni podobnih', $$select * from scout_podobni(-930001)$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni vrzeli', $$select * from scout_vrzeli()$$);
reset role;

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scout3: iskanje vrne le vidne igralce odprte drzave iz objavljenega modela, brez lastnih',
  (select array_agg(player_id order by player_id) = array[-930001]::bigint[] from scout_isci()));
select pg_temp.preveri('scout3: profil vidnega igralca s sezonami',
  (select (j->>'ime') = 'Scout Vidni' and jsonb_array_length(j->'sezone') = 1 from scout_igralec(-930001) j));
select pg_temp.preveri('scout3: skrit, mladinec, anonimiziran, zaprta drzava in neobjavljen nimajo profila',
  scout_igralec(-930002) is null and scout_igralec(-930003) is null and scout_igralec(-930004) is null
  and scout_igralec(-930005) is null and scout_igralec(-930006) is null);
select pg_temp.preveri('scout3: podobni le vidni',
  (select array_agg(player_id) = array[-930007]::bigint[] from scout_podobni(-930001)));
select pg_temp.preveri('scout3: vrzeli brez skritih igralcev',
  (select count(*) = 2 and bool_and(player_id is distinct from -930002) from scout_vrzeli()));
select pg_temp.napaka('scout3: neveljaven filter', $$select * from scout_isci('XYZ')$$, 'scout-filter');
reset role;
select pg_temp.preveri('scout3: vsak klic v dnevniku',
  (select count(*) = 9 from scout.dnevnik
    where team_id = -913001 and user_id = 'e5c30000-0000-4000-8000-000000000001'));

insert into scout.dnevnik (team_id, vrsta, player_id)
select -913001, 'igralec', -930001 from generate_series(1, 500);
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: dnevna meja profilov', $$select scout_igralec(-930001)$$, 'scout-meja');
select pg_temp.preveri('scout3: iskanje ima svojo mejo', (select count(*) = 1 from scout_isci()));
reset role;
delete from scout.dnevnik where team_id = -913001 and user_id is null and vrsta = 'igralec';

update scout.narocnine set velja_do = now() - interval '1 second' where team_id = -913001;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: potekla narocnina', $$select * from scout_isci()$$);
reset role;
update scout.narocnine set velja_do = now() + interval '14 days' where team_id = -913001;
update scout.drzave set stanje = 'zaprto' where country_id = (select id from countries where code = 'SI');
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: zaprta drzava', $$select * from scout_isci()$$);
reset role;
update scout.drzave set stanje = 'odprto' where country_id = (select id from countries where code = 'SI');
update klubski_racuni set preklican_at = now() where user_id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: preklican klubski racun', $$select * from scout_isci()$$);
reset role;
update klubski_racuni set preklican_at = null where user_id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','',true);
```

Število 9 v dnevniku: iskanje 1 + profil 1 + profil 5 + podobni 1 + vrzeli 1 (neveljaven filter pade pred dnevnikom).

```bash
npm run test:varnost
```

Expected: napaka `function scout_isci() does not exist`.

- [ ] **Step 2: Migracija `supabase/migrations/20261017140200_scout_branje.sql`**

```sql
-- SLFF Scout, faza 3a: branje za klube. Spec 4 (Dostop).
--
-- Vsak javni RPC najprej pokliče scout.dostop (sedež, aktiven klubski račun,
-- veljavna naročnina, odprta država, dnevna meja, vrstica v dnevniku), nato
-- jedro. Jedra berejo le zadnji OBJAVLJENI model in prek scout.vidni ob
-- branju znova izločijo skrite (ugovor po ključih osebe), anonimizirane,
-- vrstice mladinskih lig in zaprte države: model nastane enkrat na dan.
-- Celo osebo z mladinsko vrstico izloča stroj (SQL_IZKLJUCENI).
-- vidni/jedra so language sql brez SET in s polnimi imeni, da jih planer
-- vstavi in potisne filter na igralca; merijo se na produkciji brez sedeža.

create function scout.zadnji_model()
returns bigint language sql stable
as $$ select id from scout.modeli where objavljen order by id desc limit 1 $$;

create function scout.dostop(p_vrsta text, p_player_id bigint, p_parametri jsonb)
returns table (model_id bigint, team_id bigint, country_id bigint)
language plpgsql set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n scout.narocnine;
  v_danes timestamptz := ((now() at time zone 'Europe/Ljubljana')::date)::timestamp at time zone 'Europe/Ljubljana';
  v_meja int := case when p_vrsta = 'igralec' then 500 else 300 end;
begin
  select x.* into n from scout.sedezi s join scout.narocnine x on x.team_id = s.team_id where s.user_id = v_uid;
  if not found or not je_klubski_racun(v_uid, n.team_id) then
    raise insufficient_privilege using message = 'Scout: ni sedeža kluba.';
  end if;
  if n.velja_do <= now() or n.zaprt_at is not null then
    raise insufficient_privilege using message = 'Scout: naročnina ne velja.';
  end if;
  if coalesce((select d.stanje from scout.drzave d where d.country_id = n.country_id), 'zaprto') = 'zaprto' then
    raise insufficient_privilege using message = 'Scout: država ni odprta.';
  end if;
  -- Klici istega kluba po vrsti, da meja drži ob vzporednih zahtevkih.
  perform 1 from scout.narocnine x where x.team_id = n.team_id for update;
  if (select count(*) from scout.dnevnik d
       where d.team_id = n.team_id and d.created_at >= v_danes
         and (d.vrsta = 'igralec') = (p_vrsta = 'igralec')) >= v_meja then
    raise exception 'Scout: klub je danes dosegel mejo.' using hint = 'scout-meja';
  end if;
  insert into scout.dnevnik (team_id, user_id, vrsta, player_id, parametri)
  values (n.team_id, v_uid, p_vrsta, p_player_id, coalesce(p_parametri, '{}'::jsonb));
  return query select scout.zadnji_model(), n.team_id, n.country_id;
end;
$$;

-- Igralci, ki jih klub sme videti v modelu: odprta država, ne skrit (ključi
-- kot scout.kljuci_vrstic), ne anonimiziran, ne mladinska liga.
create function scout.vidni(p_model bigint, p_country bigint)
returns table (player_id bigint, skupina text, indeks double precision, percentil double precision,
               zaupanje double precision)
language sql stable
as $$
  select i.player_id, i.skupina, i.indeks, i.percentil, i.zaupanje
    from scout.indeks i
    join public.players p on p.id = i.player_id
    join public.competitions c on c.id = p.competition_id
    join scout.drzave d on d.country_id = c.country_id and d.stanje <> 'zaprto'
   where i.model_id = p_model and c.country_id = p_country
     and p.anonimiziran_at is null
     and not public.je_mladinski_slug(c.slug)
     -- = any(array) namesto OR: indeks ugovori_kljuc, brez join z OR (16. 10.)
     and not exists (select 1 from scout.ugovori u
                      where u.kljuc = any (array[
                        public.anonimizacijski_kljuc(c.country_id || '|' || nullif(p.full_name, '')),
                        public.anonimizacijski_kljuc(c.country_id || '|reg|' || p.reg_st)]))
$$;

-- Privolitve na vseh vrsticah potrjenega profila (glavna in povezane).
create function scout.privolitve_vrstic()
returns table (player_id bigint, odprt_za_prestop boolean, letnik int, regije bigint[], kontakt_dovoljen boolean)
language sql stable
as $$
  select z.player_id, s.odprt_za_prestop, s.letnik, s.regije, s.kontakt_dovoljen
    from public.zahtevki_igralca z join scout.privolitve s on s.player_id = z.player_id
   where z.status = 'potrjen'
  union
  select pi.player_id, s.odprt_za_prestop, s.letnik, s.regije, s.kontakt_dovoljen
    from public.povezani_igralci pi
    join public.zahtevki_igralca z on z.id = pi.zahtevek_id and z.status = 'potrjen'
    join scout.privolitve s on s.player_id = z.player_id
$$;

-- Liga kluba za projekcijo: najmočnejša članska liga zadnje sezone v modelu.
create function scout.liga_kluba(p_model bigint, p_team bigint)
returns table (competition_id bigint, moc double precision)
language sql stable
as $$
  select e.competition_id, m.moc
    from scout.ekipe_elo e
    join scout.lige_moc m on m.model_id = e.model_id and m.competition_id = e.competition_id
    join public.competitions c on c.id = e.competition_id
   where e.model_id = p_model and e.team_id = p_team and not public.je_mladinski_slug(c.slug)
   order by e.leto desc, m.moc desc
   limit 1
$$;

-- Raven: 'ista_ali_nizja' = moč lige igralca <= moč lige kluba + 0.1 (log),
-- 'nizja' = < moč kluba - 0.1. Brez lige kluba v modelu filter ne velja.
-- Projekcija golov na raven kluba le znotraj države (moč je lestvica države).
create function scout.isci_jedro(p_model bigint, p_country bigint, p_team bigint, p_skupina text, p_raven text,
                                 p_regije bigint[], p_min_minut int, p_samo_odprti boolean, p_od int)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               zaupanje double precision, minute int, delez_minut double precision,
               goli_90_pri_nas double precision, odprt_za_prestop boolean)
language sql stable
as $$
  with k as (select * from scout.liga_kluba(p_model, p_team))
  select v.player_id, p.full_name::text, t.name::text, c.name::text, v.skupina, v.percentil, v.zaupanje,
         z.minute, z.delez_minut, z.goli_ref_90 * exp(-(select k.moc from k)),
         coalesce(o.odprt_za_prestop, false)
    from scout.vidni(p_model, p_country) v
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join scout.lige_moc m on m.model_id = p_model and m.competition_id = p.competition_id
    join lateral (select x.minute, x.delez_minut, x.goli_ref_90 from scout.kazalniki x
                   where x.model_id = p_model and x.player_id = v.player_id
                   order by x.leto desc limit 1) z on true
    left join scout.privolitve_vrstic() o on o.player_id = v.player_id
   where p.team_id <> p_team
     and (p_skupina is null or v.skupina = p_skupina)
     and (cardinality(coalesce(p_regije, '{}'::bigint[])) = 0 or c.federation_id = any (p_regije))
     and z.minute >= coalesce(p_min_minut, 0)
     and (not coalesce(p_samo_odprti, false) or coalesce(o.odprt_za_prestop, false))
     and case coalesce(p_raven, 'vse')
           when 'ista_ali_nizja' then not exists (select 1 from k)
                                      or coalesce(m.moc, 0) <= (select k.moc from k) + 0.1
           when 'nizja' then not exists (select 1 from k) or coalesce(m.moc, 0) < (select k.moc from k) - 0.1
           else true
         end
   order by v.percentil desc, v.zaupanje desc, v.player_id
   limit 25 offset least(greatest(coalesce(p_od, 0), 0), 175)
$$;

create function scout.igralec_jedro(p_model bigint, p_country bigint, p_team bigint, p_player bigint)
returns jsonb language sql stable
as $$
  with k as (select * from scout.liga_kluba(p_model, p_team))
  select jsonb_build_object(
    'player_id', v.player_id, 'ime', p.full_name, 'klub', t.name, 'liga', c.name, 'skupina', v.skupina,
    'indeks', v.indeks, 'percentil', v.percentil, 'zaupanje', v.zaupanje,
    'moc_lige', m.moc, 'moc_kluba', (select k.moc from k),
    'opazujem', exists (select 1 from scout.opazovani w where w.team_id = p_team and w.player_id = v.player_id),
    'privolitev', (select jsonb_build_object(
                     'odprt_za_prestop', o.odprt_za_prestop, 'letnik', o.letnik,
                     'kontakt_dovoljen', o.kontakt_dovoljen,
                     'regije', (select coalesce(jsonb_agg(f.name order by f.name), '[]'::jsonb)
                                  from public.federations f where f.id = any (o.regije)))
                     from scout.privolitve_vrstic() o where o.player_id = v.player_id limit 1),
    'sezone', (select jsonb_agg(jsonb_build_object(
                 'sezona', z.sezona, 'liga', zc.name, 'klub', zt.name, 'minute', z.minute,
                 'delez_minut', z.delez_minut, 'zacetki_delez', z.zacetki_delez, 'cele_delez', z.cele_delez,
                 'goli_ref_90', z.goli_ref_90, 'goli_90_pri_nas', z.goli_ref_90 * exp(-(select k.moc from k)),
                 'delez_golov', z.delez_golov, 'enajstm', z.enajstm, 'onoff_ref_90', z.onoff_ref_90,
                 'prejeti_ref_90', z.prejeti_ref_90, 'ciste_delez', z.ciste_delez, 'kartoni_90', z.kartoni_90,
                 'vratar_ref_90', z.vratar_ref_90, 'stalnost', z.stalnost, 'trend_minut', z.trend_minut,
                 'zaupanje', z.zaupanje) order by z.leto desc)
                 from scout.kazalniki z
                 join public.competitions zc on zc.id = z.competition_id
                 join public.teams zt on zt.id = z.team_id
                where z.model_id = p_model and z.player_id = v.player_id))
    from scout.vidni(p_model, p_country) v
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join scout.lige_moc m on m.model_id = p_model and m.competition_id = p.competition_id
   where v.player_id = p_player
$$;

create function scout.podobni_jedro(p_model bigint, p_country bigint, p_team bigint, p_player bigint)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, podobnost double precision,
               percentil double precision, minute int, odprt_za_prestop boolean)
language sql stable
as $$
  select v.player_id, p.full_name::text, t.name::text, c.name::text, v.skupina, s.podobnost, v.percentil,
         z.minute, coalesce(o.odprt_za_prestop, false)
    from scout.vektorji x
    cross join lateral unnest(x.podobni, x.podobnost) with ordinality s(player_id, podobnost, red)
    join scout.vidni(p_model, p_country) v on v.player_id = s.player_id
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join lateral (select y.minute from scout.kazalniki y
                        where y.model_id = p_model and y.player_id = v.player_id
                        order by y.leto desc limit 1) z on true
    left join scout.privolitve_vrstic() o on o.player_id = v.player_id
   where x.model_id = p_model and x.player_id = p_player
     and exists (select 1 from scout.vidni(p_model, p_country) w where w.player_id = p_player)
   order by s.red
   limit 10
$$;

-- Vrzeli kluba; vrstica z igralcem, ki ni viden, odpade cela.
create function scout.vrzeli_jedro(p_model bigint, p_country bigint, p_team bigint)
returns table (liga text, skupina text, vrsta text, player_id bigint, ime text, vrednost double precision)
language sql stable
as $$
  select c.name::text, r.skupina, r.vrsta, r.player_id, p.full_name::text, r.vrednost
    from scout.vrzeli r
    join public.competitions c on c.id = r.competition_id
    left join public.players p on p.id = r.player_id
   where r.model_id = p_model and r.team_id = p_team
     and (r.player_id is null
          or exists (select 1 from scout.vidni(p_model, p_country) v where v.player_id = r.player_id))
   order by c.name, r.vrsta, r.skupina, r.player_id
$$;

-- ---------------------------------------------------------------------------
-- Javni RPC: dostop + jedro
-- ---------------------------------------------------------------------------
create function public.scout_isci(p_skupina text default null, p_raven text default 'vse',
                                  p_regije bigint[] default '{}', p_min_minut int default 0,
                                  p_samo_odprti boolean default false, p_od int default 0)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               zaupanje double precision, minute int, delez_minut double precision,
               goli_90_pri_nas double precision, odprt_za_prestop boolean)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  if (p_skupina is not null and p_skupina not in ('GK', 'DEF', 'MID', 'FWD'))
     or coalesce(p_raven, 'vse') not in ('vse', 'ista_ali_nizja', 'nizja')
     or cardinality(coalesce(p_regije, '{}'::bigint[])) > 50 then
    raise exception 'Scout: neveljaven filter.' using hint = 'scout-filter';
  end if;
  select * into d from scout.dostop('isci', null, jsonb_build_object(
    'skupina', p_skupina, 'raven', p_raven, 'regije', p_regije, 'min_minut', p_min_minut,
    'samo_odprti', p_samo_odprti, 'od', p_od));
  return query select * from scout.isci_jedro(d.model_id, d.country_id, d.team_id, p_skupina, p_raven,
                                              p_regije, p_min_minut, p_samo_odprti, p_od);
end;
$$;

create function public.scout_igralec(p_player_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('igralec', p_player_id, '{}'::jsonb);
  return scout.igralec_jedro(d.model_id, d.country_id, d.team_id, p_player_id);
end;
$$;

create function public.scout_podobni(p_player_id bigint)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, podobnost double precision,
               percentil double precision, minute int, odprt_za_prestop boolean)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('podobni', p_player_id, '{}'::jsonb);
  return query select * from scout.podobni_jedro(d.model_id, d.country_id, d.team_id, p_player_id);
end;
$$;

create function public.scout_vrzeli()
returns table (liga text, skupina text, vrsta text, player_id bigint, ime text, vrednost double precision)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('vrzeli', null, '{}'::jsonb);
  return query select * from scout.vrzeli_jedro(d.model_id, d.country_id, d.team_id);
end;
$$;

revoke all on function scout.zadnji_model(), scout.dostop(text, bigint, jsonb), scout.vidni(bigint, bigint),
  scout.privolitve_vrstic(), scout.liga_kluba(bigint, bigint),
  scout.isci_jedro(bigint, bigint, bigint, text, text, bigint[], int, boolean, int),
  scout.igralec_jedro(bigint, bigint, bigint, bigint), scout.podobni_jedro(bigint, bigint, bigint, bigint),
  scout.vrzeli_jedro(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.scout_isci(text, text, bigint[], int, boolean, int), public.scout_igralec(bigint),
  public.scout_podobni(bigint), public.scout_vrzeli() from public, anon;
grant execute on function public.scout_isci(text, text, bigint[], int, boolean, int), public.scout_igralec(bigint),
  public.scout_podobni(bigint), public.scout_vrzeli() to authenticated;
```

- [ ] **Step 3: Uveljavi in poženi teste**

```bash
npx supabase migration up
npm run test:varnost
```

Expected: `VSE OK`. Če pade `structure of query does not match function result type`, je stolpec v jedru drugega tipa kot v javnem RPC: dodaj `::text`/`::int` v jedro (ne spreminjaj tipov v RPC, ker jih bere vmesnik).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261017140200_scout_branje.sql supabase/tests/varnost.sql
git commit -F - <<'MSG'
feat(scout): iskanje, profil, podobni in vrzeli za klube

Vsak klic preveri sedež, naročnino, državo in dnevno mejo ter se zapiše v
dnevnik; bere le zadnji objavljeni model brez skritih, anonimiziranih in
mladinskih vrstic.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 3: Opazovalni seznam

**Files:**
- Create: `supabase/migrations/20261017140300_scout_opazovani.sql`
- Modify: `supabase/tests/varnost.sql`

**Interfaces:**
- Consumes: `scout.dostop`, `scout.vidni`, `scout.privolitve_vrstic` (naloga 2), `scout.opazovani`, `scout.pocisti` (naloga 1).
- Produces:
  - `scout.opazovani_jedro(p_model bigint, p_country bigint, p_team bigint)`
  - `public.scout_opazuj(p_player_id bigint, p_opazuj boolean) returns void`
  - `public.scout_opazovani() returns table(player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision, minute int, odprt_za_prestop boolean, dodano timestamptz)`

- [ ] **Step 1: Test (pade)**

Tik pred povzetek vstavi:

```sql
-- Scout 3, opazovalni seznam (klub -913001, do 30).
select pg_temp.preveri('scout3: anon nima seznama',
  not has_function_privilege('anon', 'public.scout_opazuj(bigint, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_opazovani()', 'EXECUTE'));
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: brez sedeza ni seznama', $$select * from scout_opazovani()$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni dodajanja', $$select scout_opazuj(-930001, true)$$);
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_opazuj(-930001, true);
select pg_temp.preveri('scout3: igralec na seznamu',
  (select array_agg(player_id) = array[-930001]::bigint[] from scout_opazovani()));
select pg_temp.preveri('scout3: profil ve, da ga klub opazuje', (scout_igralec(-930001)->>'opazujem')::boolean);
select pg_temp.napaka('scout3: skritega ni mogoce opazovati', $$select scout_opazuj(-930002, true)$$, 'scout-ni-igralca');
reset role;
insert into scout.opazovani (team_id, player_id) select -913001, -940000 - n from generate_series(1, 29) n;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: seznam ima najvec 30', $$select scout_opazuj(-930007, true)$$, 'scout-seznam-poln');
reset role;
insert into scout.opazovani (team_id, player_id) values (-913001, -930002);
select scout.pocisti();
select pg_temp.preveri('scout3: ciscenje odstrani skrite in neobstojece s seznama',
  not exists (select 1 from scout.opazovani where team_id = -913001 and player_id in (-930002, -940001))
  and exists (select 1 from scout.opazovani where team_id = -913001 and player_id = -930001));
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_opazuj(-930001, false);
select pg_temp.preveri('scout3: odstranjen s seznama', not exists (select 1 from scout_opazovani()));
reset role;
select set_config('request.jwt.claim.sub','',true);
```

```bash
npm run test:varnost
```

Expected: napaka `function public.scout_opazuj(bigint, boolean) does not exist`.

- [ ] **Step 2: Migracija `supabase/migrations/20261017140300_scout_opazovani.sql`**

```sql
-- SLFF Scout, faza 3a: opazovalni seznam kluba (do 30 igralcev, paket Klub).
-- Skriti in anonimizirani odpadejo ob branju (scout.vidni) in iz tabele vsako
-- noč (scout.pocisti). Tedensko poročilo seznama je faza 4.

create function scout.opazovani_jedro(p_model bigint, p_country bigint, p_team bigint)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               minute int, odprt_za_prestop boolean, dodano timestamptz)
language sql stable
as $$
  select v.player_id, p.full_name::text, t.name::text, c.name::text, v.skupina, v.percentil, z.minute,
         coalesce(o.odprt_za_prestop, false), w.created_at
    from scout.opazovani w
    join scout.vidni(p_model, p_country) v on v.player_id = w.player_id
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join lateral (select y.minute from scout.kazalniki y
                        where y.model_id = p_model and y.player_id = v.player_id
                        order by y.leto desc limit 1) z on true
    left join scout.privolitve_vrstic() o on o.player_id = v.player_id
   where w.team_id = p_team
   order by w.created_at desc, w.player_id
$$;

create function public.scout_opazuj(p_player_id bigint, p_opazuj boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('opazuj', p_player_id, jsonb_build_object('opazuj', p_opazuj));
  if not coalesce(p_opazuj, false) then
    delete from scout.opazovani w where w.team_id = d.team_id and w.player_id = p_player_id;
    return;
  end if;
  if not exists (select 1 from scout.vidni(d.model_id, d.country_id) v where v.player_id = p_player_id) then
    raise exception 'Scout: igralec ni na voljo.' using hint = 'scout-ni-igralca';
  end if;
  if exists (select 1 from scout.opazovani w where w.team_id = d.team_id and w.player_id = p_player_id) then
    return;
  end if;
  -- dostop je zaklenil vrstico naročnine: štetje in vpis sta brez dirke
  if (select count(*) from scout.opazovani w where w.team_id = d.team_id) >= 30 then
    raise exception 'Scout: na seznamu je že 30 igralcev.' using hint = 'scout-seznam-poln';
  end if;
  insert into scout.opazovani (team_id, player_id, dodal) values (d.team_id, p_player_id, auth.uid());
end;
$$;

create function public.scout_opazovani()
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               minute int, odprt_za_prestop boolean, dodano timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('opazovani', null, '{}'::jsonb);
  return query select * from scout.opazovani_jedro(d.model_id, d.country_id, d.team_id);
end;
$$;

revoke all on function scout.opazovani_jedro(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.scout_opazuj(bigint, boolean), public.scout_opazovani() from public, anon;
grant execute on function public.scout_opazuj(bigint, boolean), public.scout_opazovani() to authenticated;
```

- [ ] **Step 3: Uveljavi in poženi teste**

```bash
npx supabase migration up
npm run test:varnost
```

Expected: `VSE OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261017140300_scout_opazovani.sql supabase/tests/varnost.sql
git commit -F - <<'MSG'
feat(scout): opazovalni seznam kluba (do 30)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 4: Plačila v bazi

**Files:**
- Create: `supabase/migrations/20261017140400_scout_placila.sql`
- Modify: `supabase/tests/varnost.sql`

**Interfaces:**
- Consumes: `scout.narocnine`, `scout.sedezi` (naloga 1), `public.je_klubski_racun`, `public.preverjeni_na_discord`, `auth.users(email)`.
- Produces:
  - `public.scout_pripravi_nakup(p_obdobje text) returns table(team_id bigint, stripe_customer_id text, email text)` (authenticated; JWT kupca)
  - `public.scout_portal_kupec() returns text` (authenticated; null, če kupca ni)
  - `public.scout_iz_placila(p_team_id bigint, p_user_id uuid, p_obdobje text, p_velja_do timestamptz, p_customer text, p_subscription text) returns text` (`aktivna` | `dvojno` | `zaprt` | `ni_narocnine` | `neveljavno`; service_role)
  - `public.scout_podaljsaj(p_subscription text, p_velja_do timestamptz) returns text` (`podaljsano` | `zaprt` | `neznana`; service_role)
  - `public.scout_narocnina_konec(p_subscription text, p_konec timestamptz) returns text` (`koncano` | `neznana`; service_role)

- [ ] **Step 1: Test (pade)**

Tik pred povzetek vstavi:

```sql
-- Scout 3, plačila (stripe-webhook kliče kot service_role).
select pg_temp.preveri('scout3: placila zapise le servis',
  not has_function_privilege('authenticated', 'public.scout_iz_placila(bigint, uuid, text, timestamp with time zone, text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.scout_podaljsaj(text, timestamp with time zone)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.scout_narocnina_konec(text, timestamp with time zone)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.scout_iz_placila(bigint, uuid, text, timestamp with time zone, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_pripravi_nakup(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_portal_kupec()', 'EXECUTE'));
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: brez sedeza ni nakupa', $$select * from scout_pripravi_nakup('mesec')$$);
select pg_temp.preveri('scout3: tujec nima kupca za portal', scout_portal_kupec() is null);
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: neveljavno obdobje', $$select * from scout_pripravi_nakup('teden')$$, 'scout-filter');
select pg_temp.preveri('scout3: sedez pripravi nakup s svojim mailom',
  (select team_id = -913001 and email = 'scout-k1@example.invalid' from scout_pripravi_nakup('mesec')));
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('scout3: placilo aktivira paket Klub',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000001', 'mesec', now() + interval '33 days', 'cus_s3', 'sub_s3') = 'aktivna'
  and (select paket = 'klub' and obdobje = 'mesec' and placal = 'e5c30000-0000-4000-8000-000000000001'
         from scout.narocnine where team_id = -913001));
select pg_temp.preveri('scout3: ponovljen dogodek je idempotenten',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000001', 'mesec', now() + interval '33 days', 'cus_s3', 'sub_s3') = 'aktivna');
select pg_temp.preveri('scout3: drugo placilo istega kluba je dvojno',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000002', 'sezona', now() + interval '1 year', 'cus_s3b', 'sub_s3b') = 'dvojno');
select pg_temp.preveri('scout3: podaljsanje le naprej',
  scout_podaljsaj('sub_s3', now() + interval '1 day') = 'podaljsano'
  and (select velja_do > now() + interval '30 days' from scout.narocnine where team_id = -913001));
select pg_temp.preveri('scout3: tuja narocnina je neznana', scout_podaljsaj('sub_tuja', now()) = 'neznana');
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: placan klub ne kupi znova', $$select * from scout_pripravi_nakup('sezona')$$, 'scout-ze-placano');
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.preveri('scout3: vsak uradni racun kluba odpre portal', scout_portal_kupec() = 'cus_s3');
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('scout3: konec narocnine', scout_narocnina_konec('sub_s3', now() - interval '1 second') = 'koncano');
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: po koncu narocnine ni iskanja', $$select * from scout_isci()$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
```

```bash
npm run test:varnost
```

Expected: napaka `function public.scout_iz_placila(...) does not exist`.

- [ ] **Step 2: Migracija `supabase/migrations/20261017140400_scout_placila.sql`**

```sql
-- SLFF Scout, faza 3a: plačila (Stripe, prodajalec SPACE GUARDIAN d.o.o.).
--
-- scout-placilo (JWT kupca) pripravi Checkout (scout_pripravi_nakup) in portal
-- (scout_portal_kupec); stripe-webhook (metadata.app = slff-scout, servisni
-- ključ) zapiše plačilo, obnovo in konec. Preklic mora biti vedno mogoč:
-- portal dobi plačnik ali katerikoli uradni račun kluba, ne glede na sedež.

create function public.scout_pripravi_nakup(p_obdobje text)
returns table (team_id bigint, stripe_customer_id text, email text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n scout.narocnine;
begin
  select x.* into n from scout.sedezi s join scout.narocnine x on x.team_id = s.team_id where s.user_id = v_uid;
  if not found or not je_klubski_racun(v_uid, n.team_id) or n.zaprt_at is not null then
    raise insufficient_privilege using message = 'Scout: ni sedeža kluba.';
  end if;
  if p_obdobje is null or p_obdobje not in ('mesec', 'sezona') then
    raise exception 'Scout: obdobje je mesec ali sezona.' using hint = 'scout-filter';
  end if;
  if n.paket = 'klub' and n.velja_do > now() then
    raise exception 'Scout: naročnina že teče.' using hint = 'scout-ze-placano';
  end if;
  if coalesce((select d.stanje from scout.drzave d where d.country_id = n.country_id), 'zaprto') = 'zaprto' then
    raise exception 'Scout: država ni odprta.' using hint = 'scout-drzava';
  end if;
  return query select n.team_id, n.stripe_customer_id, (select u.email::text from auth.users u where u.id = v_uid);
end;
$$;

create function public.scout_portal_kupec()
returns text language sql stable security definer set search_path = public
as $$
  select n.stripe_customer_id from scout.narocnine n
   where n.stripe_customer_id is not null
     and (n.placal = auth.uid() or je_klubski_racun(auth.uid(), n.team_id))
   order by n.updated_at desc
   limit 1
$$;

create function public.scout_iz_placila(p_team_id bigint, p_user_id uuid, p_obdobje text, p_velja_do timestamptz,
                                        p_customer text, p_subscription text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  n scout.narocnine;
begin
  select * into n from scout.narocnine where team_id = p_team_id for update;
  if not found then
    return 'ni_narocnine';
  end if;
  if n.stripe_subscription_id = p_subscription then
    return 'aktivna';  -- ponovljen dogodek
  end if;
  if n.zaprt_at is not null then
    return 'zaprt';
  end if;
  if n.paket = 'klub' and n.velja_do > now() then
    return 'dvojno';
  end if;
  if p_obdobje is null or p_obdobje not in ('mesec', 'sezona') then
    return 'neveljavno';
  end if;
  update scout.narocnine
     set paket = 'klub', obdobje = p_obdobje, velja_do = p_velja_do, stripe_customer_id = p_customer,
         stripe_subscription_id = p_subscription, placal = p_user_id, updated_at = now()
   where team_id = p_team_id;
  perform preverjeni_na_discord(format('💶 Scout plačan: %s (%s)', (select name from teams where id = p_team_id), p_obdobje));
  return 'aktivna';
end;
$$;

-- invoice.paid lahko pride pred checkout.session.completed: neznana naročnina
-- je 'neznana' (webhook ne naredi nič), ne preklic.
create function public.scout_podaljsaj(p_subscription text, p_velja_do timestamptz)
returns text language plpgsql security definer set search_path = public
as $$
begin
  update scout.narocnine set velja_do = greatest(velja_do, p_velja_do), updated_at = now()
   where stripe_subscription_id = p_subscription and zaprt_at is null;
  if found then
    return 'podaljsano';
  end if;
  if exists (select 1 from scout.narocnine where stripe_subscription_id = p_subscription) then
    return 'zaprt';
  end if;
  return 'neznana';
end;
$$;

create function public.scout_narocnina_konec(p_subscription text, p_konec timestamptz)
returns text language plpgsql security definer set search_path = public
as $$
begin
  update scout.narocnine set velja_do = least(velja_do, p_konec), updated_at = now()
   where stripe_subscription_id = p_subscription;
  return case when found then 'koncano' else 'neznana' end;
end;
$$;

revoke all on function public.scout_pripravi_nakup(text), public.scout_portal_kupec() from public, anon;
grant execute on function public.scout_pripravi_nakup(text), public.scout_portal_kupec() to authenticated;
revoke all on function public.scout_iz_placila(bigint, uuid, text, timestamptz, text, text),
  public.scout_podaljsaj(text, timestamptz), public.scout_narocnina_konec(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.scout_iz_placila(bigint, uuid, text, timestamptz, text, text),
  public.scout_podaljsaj(text, timestamptz), public.scout_narocnina_konec(text, timestamptz) to service_role;
```

- [ ] **Step 3: Uveljavi in poženi teste**

```bash
npx supabase migration up
npm run test:varnost
npm test
```

Expected: `VSE OK`; `npm test` zelen (nespremenjen tok fantasy). Prazno bazo preveri CI.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261017140400_scout_placila.sql supabase/tests/varnost.sql
git commit -F - <<'MSG'
feat(scout): plačila naročnin v bazi

Priprava nakupa in portal z JWT kluba; servisne funkcije za webhook
(plačilo, obnova le naprej, konec, dvojno plačilo).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 5: Stripe: `scout-placilo` in veja v `stripe-webhook`

**Files:**
- Create: `supabase/functions/stripe-webhook/scout.ts`, `supabase/functions/scout-placilo/index.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`, `scripts/smoke.jsx`

**Interfaces:**
- Consumes: `scout_pripravi_nakup`, `scout_portal_kupec`, `scout_iz_placila`, `scout_podaljsaj`, `scout_narocnina_konec` (naloga 4); v `index.ts` obstoječe `beri`, `rpc`, `discord`, `prekliciNarocnino`, `konecObdobja`, `iso`, `id`, `MILOST_S`.
- Produces:
  - `export function scoutPostavkeVeljajo(postavke: Postavka[], obdobje: string): boolean` in `export const SCOUT_CENE: Record<string, string>` v `stripe-webhook/scout.ts`
  - Edge funkcija `scout-placilo`: POST `{"akcija":"checkout","obdobje":"mesec"|"sezona","jezik"?:"sl"|"en"}` → `{"url"}`; `{"akcija":"portal"}` → `{"url"}`; napaka `{"error", "hint"}`.

- [ ] **Step 1: Test v smoke (pade, ker datoteke ni)**

V `scripts/smoke.jsx` za vrstico `import { veljavenPodpis } from '../supabase/functions/stripe-webhook/podpis.ts'` dodaj:

```js
import { scoutPostavkeVeljajo } from '../supabase/functions/stripe-webhook/scout.ts'
```

in za blokom, ki se konča z `preveri('stripe: brez glave pade', !(await veljavenPodpis(null, telo, skr, t)))` in `}`, dodaj:

```js
{
  // Postavke seje Scout (stripe-webhook/scout.ts): ena cena obdobja, en kos, brez popusta.
  const p = (kljuc, kos = 1, znesek = 3900) => ({ quantity: kos, amount_subtotal: znesek, price: { lookup_key: kljuc, unit_amount: 3900 } })
  preveri('scout stripe: mesečna postavka gre', scoutPostavkeVeljajo([p('slff_scout_klub_mesec')], 'mesec'))
  preveri('scout stripe: napačno obdobje pade', !scoutPostavkeVeljajo([p('slff_scout_klub_mesec')], 'sezona'))
  preveri('scout stripe: dva kosa padeta', !scoutPostavkeVeljajo([p('slff_scout_klub_mesec', 2, 7800)], 'mesec'))
  preveri('scout stripe: popust pade', !scoutPostavkeVeljajo([p('slff_scout_klub_mesec', 1, 1900)], 'mesec'))
  preveri('scout stripe: dodatna postavka pade', !scoutPostavkeVeljajo([p('slff_scout_klub_mesec'), p('slff_znacka')], 'mesec'))
  preveri('scout stripe: neznano obdobje pade', !scoutPostavkeVeljajo([p('slff_scout_klub_mesec')], 'teden'))
}
```

```bash
npm run smoke 2>&1 | tail -3
```

Expected: napaka uvoza `scout.ts`.

- [ ] **Step 2: `supabase/functions/stripe-webhook/scout.ts`**

```ts
// SLFF Scout v stripe-webhook: preverjanje postavk seje (čista funkcija,
// preveri jo smoke). Kopija ključev cen je v scout-placilo/index.ts (funkciji
// se objavljata vsaka iz svoje mape).
export const SCOUT_CENE: Record<string, string> = {
  mesec: 'slff_scout_klub_mesec',
  sezona: 'slff_scout_klub_sezona',
}

export interface Postavka {
  quantity?: number | null
  amount_subtotal?: number | null
  price?: { lookup_key?: string | null; unit_amount?: number | null } | null
}

/** Seja ima natanko eno postavko: cena obdobja, en kos, znesek pred davkom brez popusta. */
export function scoutPostavkeVeljajo(postavke: Postavka[], obdobje: string): boolean {
  const kljuc = SCOUT_CENE[obdobje]
  const l = postavke[0]
  return (
    Boolean(kljuc) &&
    postavke.length === 1 &&
    l?.quantity === 1 &&
    l.price?.lookup_key === kljuc &&
    l.amount_subtotal === l.price.unit_amount
  )
}
```

- [ ] **Step 3: Veja v `supabase/functions/stripe-webhook/index.ts`**

V glavi zamenjaj

```ts
// Oblike objektov se med različicami API razlikujejo (basil: obdobje na
```

z

```ts
// SLFF Scout (metadata app=slff-scout, faza 3): seja → scout_iz_placila
// (postavke po scout.ts; 'dvojno', 'zaprt', 'ni_narocnine' → preklic +
// Discord "vrni denar"), invoice.paid in subscription.updated →
// scout_podaljsaj ('zaprt' → preklic), deleted → scout_narocnina_konec.
// Vračil in sporov Scouta ne obdelujemo samodejno: admin naročnino prekliče v
// Stripe, kar pride kot subscription.deleted.
//
// Oblike objektov se med različicami API razlikujejo (basil: obdobje na
```

Zamenjaj

```ts
import { veljavenPodpis } from './podpis.ts'
```

z

```ts
import { veljavenPodpis } from './podpis.ts'
import { scoutPostavkeVeljajo } from './scout.ts'
```

Zamenjaj

```ts
      const m = o.metadata ?? {}
      if (m.app !== 'slff') return 'ignored'
```

z

```ts
      const m = o.metadata ?? {}
      if (m.app === 'slff-scout') return await scoutSeja(o)
      if (m.app !== 'slff') return 'ignored'
```

Zamenjaj

```ts
      const sub = id(o.subscription) ?? id(podrobno.subscription)
      if (podrobno.metadata?.app !== 'slff' || !sub) return 'ignored'
      const konec = Math.max(0, ...(o.lines?.data ?? []).map((l: Obj) => l.period?.end ?? 0))
      if (!konec) return 'no period'
      return await podaljsaj(sub, konec)
```

z

```ts
      const sub = id(o.subscription) ?? id(podrobno.subscription)
      const app = podrobno.metadata?.app
      if ((app !== 'slff' && app !== 'slff-scout') || !sub) return 'ignored'
      const konec = Math.max(0, ...(o.lines?.data ?? []).map((l: Obj) => l.period?.end ?? 0))
      if (!konec) return 'no period'
      return app === 'slff-scout' ? await scoutPodaljsaj(sub, konec) : await podaljsaj(sub, konec)
```

Zamenjaj

```ts
      if (o.metadata?.app !== 'slff') return 'ignored'
      if (tip === 'customer.subscription.deleted' || ['canceled', 'incomplete_expired'].includes(o.status))
```

z

```ts
      if (o.metadata?.app === 'slff-scout') return await scoutNarocnina(tip, o)
      if (o.metadata?.app !== 'slff') return 'ignored'
      if (tip === 'customer.subscription.deleted' || ['canceled', 'incomplete_expired'].includes(o.status))
```

Na konec datoteke dodaj:

```ts

// --- SLFF Scout (metadata app=slff-scout) -----------------------------------

async function scoutSeja(o: Obj): Promise<string> {
  const m = o.metadata ?? {}
  if (!['paid', 'no_payment_required'].includes(o.payment_status)) return 'unpaid'
  const sub = id(o.subscription)
  if (!sub) return 'brez naročnine'
  const postavke = await beri(`checkout/sessions/${o.id}/line_items?limit=10`)
  if (!scoutPostavkeVeljajo(postavke.data ?? [], m.obdobje)) {
    await discord(`⚠️ Scout seja ${o.id}: postavke se ne ujemajo, naročnine ni (preveri in vrni denar).`)
    await prekliciNarocnino(sub)
    return 'neveljavne postavke'
  }
  const konec = konecObdobja(await beri(`subscriptions/${sub}`))
  // Brez konca obdobja bi naročnina veljala za vedno: raje napaka in ponovitev.
  if (!konec) throw new Error('naročnina brez konca obdobja')
  const izid = await rpc('scout_iz_placila', {
    p_team_id: Number(m.team_id),
    p_user_id: m.user_id,
    p_obdobje: m.obdobje,
    p_velja_do: iso(konec + MILOST_S),
    p_customer: id(o.customer),
    p_subscription: sub,
  })
  if (izid !== 'aktivna') {
    await discord(`⚠️ Scout seja ${o.id}: ${izid}, naročnina preklicana (vrni denar v Stripe).`)
    await prekliciNarocnino(sub)
  }
  return izid
}

async function scoutPodaljsaj(sub: string, konec: number): Promise<string> {
  const izid = await rpc('scout_podaljsaj', { p_subscription: sub, p_velja_do: iso(konec + MILOST_S) })
  if (izid === 'zaprt') {
    await prekliciNarocnino(sub)
    await discord('⚠️ Scout: obnova zaprtega kluba, naročnina preklicana (preveri vračilo v Stripe).')
  }
  return izid
}

async function scoutNarocnina(tip: string, o: Obj): Promise<string> {
  if (tip === 'customer.subscription.deleted' || ['canceled', 'incomplete_expired'].includes(o.status))
    return await rpc('scout_narocnina_konec', {
      p_subscription: o.id,
      p_konec: iso(o.ended_at ?? o.canceled_at) ?? new Date().toISOString(),
    })
  // past_due in unpaid: dostop velja do roka, nato poteče sam.
  const konec = konecObdobja(o)
  if (!konec || !['active', 'trialing'].includes(o.status)) return 'unchanged'
  return await scoutPodaljsaj(o.id, konec)
}
```

- [ ] **Step 4: `supabase/functions/scout-placilo/index.ts`**

```ts
// Edge Function: scout-placilo
//
// Naročnina SLFF Scout s Stripe Checkout. Kliče prijavljen uradni račun kluba
// s scout.slff.eu (Bearer <access_token>):
//
//   {"akcija": "checkout", "obdobje": "mesec"|"sezona", "jezik"?: "sl"|"en"} → {"url": "<Checkout>"}
//   {"akcija": "portal"} → {"url": "<Billing portal>"}  (plačnik ali katerikoli
//     uradni račun kluba: preklic mora biti vedno mogoč)
//
// Kaj sme, odloči baza z JWT kupca (scout_pripravi_nakup: sedež, klubski
// račun, ni že plačano, država odprta; scout_portal_kupec). Naročnino zapiše
// šele stripe-webhook (metadata app=slff-scout). Cene po lookup_key; B2B:
// davčna številka (tax_id_collection), cene brez DDV (tax_behavior exclusive).
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SCOUT_URL (neobvezno,
// privzeto https://scout.slff.eu). Objava: scripts/hetzner/objavi-funkcije.sh scout-placilo

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
// Kopija SCOUT_CENE iz stripe-webhook/scout.ts.
const CENE: Record<string, string> = { mesec: 'slff_scout_klub_mesec', sezona: 'slff_scout_klub_sezona' }
const NAPAKA = 'Plačila ni bilo mogoče začeti.'

type Polja = Record<string, string | number | boolean | undefined | null>

async function stripe<T>(pot: string, polja?: Polja): Promise<T> {
  const telo = polja
    ? new URLSearchParams(Object.entries(polja).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    : undefined
  const r = await fetch(`https://api.stripe.com/v1/${pot}`, {
    method: telo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: telo,
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Stripe ${pot}: ${j?.error?.message ?? r.status}`)
  return j as T
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: NAPAKA }, 503)
  const SCOUT = (Deno.env.get('SCOUT_URL') ?? 'https://scout.slff.eu').replace(/\/$/, '')

  const auth = req.headers.get('Authorization') ?? ''
  const baza = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: u } = await baza.auth.getUser(auth.replace(/^Bearer /, ''))
  if (!u?.user) return json({ error: NAPAKA }, 401)

  const vhod = (await req.json().catch(() => ({}))) as { akcija?: string; obdobje?: string; jezik?: string }
  try {
    if (vhod.akcija === 'portal') {
      const { data, error } = await baza.rpc('scout_portal_kupec')
      if (error || typeof data !== 'string') return json({ error: NAPAKA }, 400)
      const s = await stripe<{ url: string }>('billing_portal/sessions', { customer: data, return_url: `${SCOUT}/account` })
      return json({ url: s.url })
    }
    if (vhod.akcija !== 'checkout') return json({ error: 'akcija: checkout ali portal.' }, 400)
    const obdobje = vhod.obdobje ?? ''
    if (!CENE[obdobje]) return json({ error: NAPAKA, hint: 'scout-filter' }, 400)

    const { data, error } = await baza.rpc('scout_pripravi_nakup', { p_obdobje: obdobje })
    if (error) return json({ error: NAPAKA, hint: error.hint ?? null }, 400)
    const n = (data ?? [])[0] as { team_id: number; stripe_customer_id: string | null; email: string | null } | undefined
    if (!n) return json({ error: NAPAKA }, 400)

    const cene = await stripe<{ data: { id: string; lookup_key: string }[] }>(`prices?active=true&lookup_keys[]=${CENE[obdobje]}`)
    const cena = cene.data.find((c) => c.lookup_key === CENE[obdobje])?.id
    if (!cena) throw new Error(`Cena ${CENE[obdobje]} v Stripe ne obstaja.`)

    const meta = { app: 'slff-scout', team_id: String(n.team_id), user_id: u.user.id, obdobje }
    const polja: Polja = {
      mode: 'subscription',
      'line_items[0][price]': cena,
      'line_items[0][quantity]': 1,
      'automatic_tax[enabled]': true,
      'tax_id_collection[enabled]': true,
      billing_address_collection: 'required',
      client_reference_id: u.user.id,
      success_url: `${SCOUT}/account?placilo=uspeh`,
      cancel_url: `${SCOUT}/account?placilo=preklic`,
      locale: vhod.jezik === 'sl' ? 'sl' : 'en',
    }
    // Naročnina nosi iste oznake, da webhook loči dogodke Scouta od drugih.
    for (const [k, v] of Object.entries(meta)) {
      polja[`metadata[${k}]`] = v
      polja[`subscription_data[metadata][${k}]`] = v
    }
    if (n.stripe_customer_id) {
      polja.customer = n.stripe_customer_id
      polja['customer_update[address]'] = 'auto'
      polja['customer_update[name]'] = 'auto'
    } else {
      polja.customer_email = n.email ?? u.user.email
    }
    const s = await stripe<{ url: string }>('checkout/sessions', polja)
    return json({ url: s.url })
  } catch (e) {
    console.error('scout-placilo:', e)
    return json({ error: NAPAKA }, 502)
  }
})
```

- [ ] **Step 5: Smoke in tipi Deno**

```bash
npm run smoke 2>&1 | grep -E 'scout stripe|VSE OK|NAPAK'
npx --yes deno@2.7.14 check supabase/functions/scout-placilo/index.ts supabase/functions/stripe-webhook/index.ts
```

Expected: šest `PASS scout stripe: …`, `VSE OK`; `deno check` brez napak.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/scout-placilo supabase/functions/stripe-webhook scripts/smoke.jsx
git commit -F - <<'MSG'
feat(scout): Stripe Checkout in portal za klube, veja v stripe-webhook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 6: Tipi in dokumentacija

**Files:**
- Modify: `src/lib/baza.types.ts`, `docs/scout.md`, `docs/podatkovni-model.md`, `README.md`

**Interfaces:**
- Consumes: vse migracije nalog 1–4 na lokalni bazi.
- Produces: `Database['public']['Functions']` z `scout_moj_klub`, `scout_zacni_preizkus`, `scout_zasedi_sedez`, `scout_sprosti_sedez`, `scout_isci`, `scout_igralec`, `scout_podobni`, `scout_vrzeli`, `scout_opazuj`, `scout_opazovani`, `scout_pripravi_nakup`, `scout_portal_kupec`, `scout_iz_placila`, `scout_podaljsaj`, `scout_narocnina_konec` (vmesnik 3b bere tipe vrstic iz `Returns`).

- [ ] **Step 1: Tipi**

```bash
npm run tipi
git diff --stat src/lib/baza.types.ts
grep -c "scout_" src/lib/baza.types.ts
npm run typecheck
```

Expected: diff doda le funkcije `scout_*` (15 novih); `typecheck` zelen. Če diff spremeni še kaj drugega (druga različica CLI), `git checkout src/lib/baza.types.ts`, ponovi z `npx --yes supabase@2.117.0 gen types typescript --local > /private/tmp/baza.types.ts && mv /private/tmp/baza.types.ts src/lib/baza.types.ts` (ista različica kot CI).

- [ ] **Step 2: `docs/scout.md`**

Pred razdelek `## Spomin` vstavi:

```markdown
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
  dan) in vrstica v `scout.dnevnik`. Zavrnjen klic se ne zapiše.
- **Kaj klub vidi.** Le zadnji **objavljeni** model (`scout.zadnji_model()`).
  `scout.vidni(model, država)` ob branju znova izloči skrite (ključi
  `scout.ugovori`), anonimizirane, vrstice mladinskih lig in zaprte države;
  celo osebo z mladinsko vrstico izloča stroj enkrat na dan. Iskanje: 25 na
  stran, največ prvih 200, brez lastnih igralcev; raven `ista_ali_nizja` /
  `nizja` primerja moč lige igralca z ligo kluba (`scout.liga_kluba`, ± 0.1);
  projekcija golov na raven kluba le znotraj države. Podobni 10, seznam 30.
- **Plačila.** `scout-placilo` (Checkout, portal) in `stripe-webhook`
  (`metadata.app = slff-scout`). Cene po `lookup_key`
  `slff_scout_klub_mesec` (39 €/mesec), `slff_scout_klub_sezona` (290 €/leto),
  brez DDV, z davčno številko kupca. Naročnina velja do konca obdobja + 3 dni.
  Drugo plačilo istega kluba (`dvojno`), zaprt klub ali seja brez naročnine →
  takojšen preklic + Discord "vrni denar". Vračil in sporov Scout ne obdeluje
  samodejno: admin naročnino prekliče v Stripe (`subscription.deleted` →
  `velja_do = ended_at`). Portal (preklic) dobi plačnik ali kateri koli uradni
  račun kluba.
- **Zaprt klub** (kršitev pogojev):
  `update scout.narocnine set zaprt_at = now() where team_id = <klub>` in
  takojšen preklic naročnine v Stripe.
- **Dnevnik** 12 mesecev (`scout.pocisti()`, pg_cron `scout-pocisti` 04:47; s
  seznamov odstrani tudi skrite, anonimizirane in izbrisane igralce). Zahteva
  igralca "kateri klubi so me gledali":

  ```sql
  select t.name, d.vrsta, d.created_at from scout.dnevnik d join teams t on t.id = d.team_id
   where d.player_id = any(array[<id vrstic osebe>]::bigint[]) order by d.created_at desc;
  ```

- **Merilo faze 3** (5 poskusnih klubov tedensko):

  ```sql
  select count(distinct team_id) from scout.dnevnik where created_at > now() - interval '7 days';
  ```
```

- [ ] **Step 3: `docs/podatkovni-model.md`**

Za odstavkom, ki se začne z `- **Scout: ugovor in privolitev**`, (pred naslednjo vrstico, ki se začne z `- **`) vstavi:

```markdown
- **Scout: klubi** (migracije 20261017140100–140400, `docs/scout.md` *Klubi*):
  `scout.narocnine` (klub, preizkus ali Klub, `velja_do`, Stripe),
  `scout.sedezi` (do 3 uradni računi kluba), `scout.dnevnik` (vsak klic s
  podatki igralcev, 12 mesecev), `scout.opazovani` (do 30). Brskalnik bere le
  prek `scout_*` RPC, ki preverijo sedež, naročnino, državo in dnevno mejo in
  berejo le zadnji objavljeni model. Plačila: `scout-placilo` in veja
  `app=slff-scout` v `stripe-webhook`; **preklic naročnine mora biti vedno
  mogoč** (`scout_portal_kupec`: plačnik ali kateri koli uradni račun kluba).
```

- [ ] **Step 4: `README.md`**

Zamenjaj

```
| `scout.*` | Rezultati nočnega stroja Scout (`drzave`, `modeli`, `lige_moc`, `ekipe_elo`, `kazalniki`, `indeks`, `vektorji`, `vrzeli`); zaprta shema, glej `docs/scout.md` |
```

z

```
| `scout.*` | Rezultati nočnega stroja Scout (`drzave`, `modeli`, `lige_moc`, `ekipe_elo`, `kazalniki`, `indeks`, `vektorji`, `vrzeli`), ugovori in privolitve igralcev, računi klubov (`narocnine`, `sedezi`, `dnevnik`, `opazovani`); zaprta shema, glej `docs/scout.md` |
```

- [ ] **Step 5: Preverjanje in commit**

```bash
npm run typecheck && npm run smoke 2>&1 | tail -1
git add src/lib/baza.types.ts docs/scout.md docs/podatkovni-model.md README.md
git commit -F - <<'MSG'
docs(scout): klubi, dostop in plačila (faza 3a); tipi RPC

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 7: Meritev na produkciji, PR, preverjanje po združitvi

**Files:** brez (operativni koraki).

**Interfaces:**
- Consumes: migracije nalog 1–4, `ssh slff`, CI posel *Migracije baze*.
- Produces: izmerjene poizvedbe, združen PR, migracije na produkciji.

- [ ] **Step 1: Celoten preizkus lokalno**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
npm run typecheck && npm run smoke && npm run test:varnost && npm test
```

Expected: vse zeleno.

- [ ] **Step 2: Izmeri vse nove poizvedbe na produkciji (migracije v transakciji, `rollback`)**

```bash
cat > /private/tmp/scout-meritve.sql <<'SQL'
select coalesce(scout.zadnji_model(), (select max(id) from scout.modeli)) as m,
       (select id from countries where code = 'SI') as si \gset
select e.team_id as ekipa from scout.ekipe_elo e join competitions c on c.id = e.competition_id
 where e.model_id = :m and c.country_id = :si order by e.elo desc, e.team_id limit 1 \gset
select player_id as igralec from scout.indeks where model_id = :m order by percentil desc, player_id limit 1 \gset
explain (analyze, buffers) select * from scout.vidni(:m, :si);
explain (analyze) select * from scout.isci_jedro(:m, :si, :ekipa, null, 'vse', '{}', 0, false, 0);
explain (analyze) select * from scout.isci_jedro(:m, :si, :ekipa, 'FWD', 'ista_ali_nizja', '{}', 450, true, 175);
explain (analyze) select scout.igralec_jedro(:m, :si, :ekipa, :igralec);
explain (analyze) select * from scout.podobni_jedro(:m, :si, :ekipa, :igralec);
explain (analyze) select * from scout.vrzeli_jedro(:m, :si, :ekipa);
explain (analyze) select * from scout.opazovani_jedro(:m, :si, :ekipa);
explain (analyze) select count(*) from scout.dnevnik where team_id = :ekipa and created_at >= now() - interval '1 day';
explain (analyze) select scout.pocisti();
SQL
{ echo 'begin;'; echo 'set local statement_timeout = 60000;'; \
  cat supabase/migrations/2026101714*_scout_*.sql /private/tmp/scout-meritve.sql; echo 'rollback;'; } \
  | ssh slff 'docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1' 2>&1 \
  | grep -E 'Execution Time|ERROR|ROLLBACK'
```

Expected: devet vrstic `Execution Time`, vsaka pod 1000 ms (`vidni` pod 500 ms), na koncu `ROLLBACK`, brez `ERROR`. Če je katera nad mejo: ne združi; zaženi isto z `explain (analyze, buffers)` telesa jedra z vstavljenimi vrednostmi (kopiraj SQL iz migracije), poišči `Nested Loop` brez indeksa ali `Seq Scan` na `scout.ugovori`/`scout.kazalniki` in popravi jedro (nova meritev, nov commit).

- [ ] **Step 3: PR**

```bash
git push -u origin feat/scout-faza3a-zaledje
gh pr create --title "feat: SLFF Scout faza 3a — zaledje (računi, branje, seznam, plačila)" --body-file - <<'MSG'
Faza 3a SLFF Scout (načrt `docs/superpowers/plans/2026-10-16-scout-faza3a-zaledje.md`).

- `scout.narocnine`, `sedezi`, `dnevnik`, `opazovani`; preizkus 14 dni, do 3 sedeži
- RPC `scout_isci`, `scout_igralec`, `scout_podobni`, `scout_vrzeli`, `scout_opazuj`, `scout_opazovani`: sedež, naročnina, odprta država, dnevna meja, dnevnik; le zadnji objavljeni model, brez skritih, anonimiziranih in mladinskih
- Stripe: `scout-placilo` in veja `app=slff-scout` v `stripe-webhook` (funkcij CI ne objavi; objava v fazi 3b)
- Meritve na produkciji (rollback): vse pod 1000 ms

Preizkusi: `npm run test:varnost` (blok scout3), `npm run smoke`, `npm test`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
```

Počakaj na neodvisen pregled (spec 5) in zelen CI.

- [ ] **Step 4: Po združitvi: migracije in pravice na produkciji**

CI posel *Migracije baze* uveljavi `20261017140100`–`140400`. Nato:

```bash
ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select has_function_privilege('"'"'anon'"'"', '"'"'public.scout_isci(text, text, bigint[], integer, boolean, integer)'"'"', '"'"'EXECUTE'"'"'), has_function_privilege('"'"'authenticated'"'"', '"'"'public.scout_iz_placila(bigint, uuid, text, timestamp with time zone, text, text)'"'"', '"'"'EXECUTE'"'"'), (select count(*) from cron.job where jobname = '"'"'scout-pocisti'"'"')"'
```

Expected: `f|f|1`. Funkcij (`stripe-webhook`, `scout-placilo`) v tej fazi **ne** objavljaj: objava, Stripe katalog in obvezni ročni preizkus v testnem načinu so v fazi 3b (naloga 8), ko je vmesnik.

---

## Spec coverage

| spec | naloga / odločitev |
|---|---|
| 1: račun pripada klubu, potrjen kot klubski računi, do 3 sedeži | 1 (`sedezi` na `klubski_racuni`) |
| 1: preizkus 14 dni, Klub 39 €/mesec ali 290 €/sezono, ena država, seznam 30 | 1, 3, 4, 5 |
| 1: Stripe, prodajalec SPACE GUARDIAN d.o.o. | 5 (isti račun Stripe kot preverjeni); besedilo prodajalca v 3b |
| 1: Pro 99 € (vse države, neomejen seznam, PDF, primerjava, CSV) | **ni v fazi 3**: tabela faz postavi Pro, PDF in primerjavo v fazo 5 |
| 1/4: tedensko poročilo (ponedeljek, e-pošta) | **ni v fazi 3**: tabela faz ga postavi v fazo 4 (pilot); seznam zanj obstaja |
| 1: vaba (mesečni mail klubskim računom) | **ni v fazi 3**: trženje po pilotu; pogoj faze 3 je raba, ne pridobivanje |
| 1: iskanje (pozicija, raven, regija, minute, odprti), enovrstična utemeljitev | 2 (utemeljitev sestavi vmesnik iz vrnjenih števil, 3b) |
| 1: razdalja | **ni**: klubi nimajo koordinat; regija (zveza) pokrije potrebo |
| 1: vrzeli s predlogi | 2 (predlogi = iskanje s pozicijo vrzeli, 3b) |
| 1: podobni igralci, prilagojeni ravni | 2 (vektorji stroja so na lestvici države) |
| 2/4: sporočila klub → igralec (`scout.sporocila`) | **ni v fazi 3**: vrstica faze 3 jih ne našteje; potrebujejo posredovanje pošte s skritim naslovom, obvestilo in odjavo igralca ter zaščito pred zlorabo; pogoj faze 3 je tedenska raba. `kontakt_dovoljen` se vrne v profilu, prikaz in sporočila so faza 4 |
| 2: samo odrasli, ugovor skrije, odprta država | 2 (`scout.vidni` ob branju; celo osebo izloča stroj) |
| 2: dnevnik 12 mesecev, odgovor "kateri klubi so me gledali" | 1 (`scout.pocisti`), 6 (SQL v `docs/scout.md`) |
| 2: pogoji za klube | 1 (`pogoji_sprejeti_at`), besedilo v 3b |
| 4: dostop le prek SECURITY DEFINER, sedež + naročnina + država + skrit + mladoleten + meja + dnevnik | 2 (`scout.dostop`, `scout.vidni`) |
| 4: vmesnik bere le objavljen model (`docs/scout.md`) | 2 (`scout.zadnji_model`) |
| 4: Stripe izdelek, webhook `app=slff-scout` | 5 |
| 5: SQL testi za vsako funkcijo (brez sedeža, potekla, zaprta država, skrit, mladoletnik, meja, dnevnik) | 1–4 |
| pravilo 16. 10.: vsaka nova poizvedba izmerjena na produkciji | 7 |
