# Scout stran Klub (del 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Klub" page on scout.slff.eu with the club's header (table position, form, Elo, league strength), team performance vs league average, the squad table, depth by position and the club's gaps; SLFF admins can pick any club in the subscription's country.

**Architecture:** One new RPC `public.scout_klub(p_team_id)` (security definer) goes through the existing `scout.dostop` gate and calls `scout.klub_jedro(model, country, team)`, which builds one jsonb document from `scout.kazalniki`, `scout.ekipe_elo`, `scout.lige_moc`, public `matches`/`appearances` and `lestvica_lige`. The Scout Vite app gets a new page `Klub.tsx` at `/club`; depth by position is computed client-side from the squad.

**Tech Stack:** PostgreSQL (Supabase, plpgsql), React + TypeScript + Tailwind (scout/ Vite app).

**Spec:** `docs/superpowers/specs/2026-10-18-scout-klub-design.md`

## Global Constraints

- Players that count: same exclusion as the rest of Scout — every squad row passes `scout.vidni(model, country)` (youth leagues, `scout.ugovori`, anonymised are out).
- Period: current season of the club's league (from `lestvica_lige`), previous year only for Elo.
- Admin picker: only `is_admin()` callers, only clubs with `teams.country_id = ` the subscription's country; anyone else passing another club gets `insufficient_privilege` (never a silent fallback to their own club).
- Every call goes through `scout.dostop('klub', …)`: logged in `scout.dnevnik`, counts in the 300/day "other calls" limit.
- No new tables; one new migration; never edit existing migrations; regenerate `src/lib/baza.types.ts` with `npm run tipi`.
- Strings only in `scout/src/besede.ts`, sl and en, same `{params}`, no negative labels (smoke regex).
- Visual style: existing Scout classes (`kartica`, `gumb-*`, `znacka poz-*`, `polje`, `povezava`, `opozorilo`, `tabular-nums`).
- Before merge: time `scout_klub` on production inside a rolled-back transaction for the biggest club; target < 300 ms.

---

### Task 1: Database — `scout_klub` RPC and security tests

**Files:**
- Create: `supabase/migrations/20261018120000_scout_klub.sql`
- Modify: `supabase/tests/varnost.sql` (append a block right before the line `-- Scout 3, opazovalni seznam (klub -913001, do 30).`, i.e. after the existing `scout3: dnevnik iskanja in podobnih …` assertion and the privolitev block that follows it — place it immediately before that comment line)
- Modify: `src/lib/baza.types.ts` (generated)

**Interfaces:**
- Produces: `public.scout_klub(p_team_id bigint default null) returns jsonb` with shape:
  ```
  { team_id, ime, admin: boolean, country_id,
    glava: null | { competition_id, liga, sezona, mesto, klubov, tekme, tocke, forma,  -- forma: 'WDLWW' oldest→newest
                    elo, elo_lani, moc_mesto, lig },
    ekipa: null | { klub: Stat, liga: Stat },  -- Stat = { tekme, tocke, za, proti, ciste, tocke_doma, tocke_gost, kartoni } (per-match averages; ciste is a 0..1 share)
    kader: [{ player_id, ime, skupina, nastopi, minute, delez_minut, zacetki_delez, goli, onoff_ref_90, kartoni_90, trend_minut }],
    vrzeli: [{ liga, skupina, vrsta, player_id, ime, vrednost }] }
  ```

- [ ] **Step 1: Write the failing tests** — insert into `supabase/tests/varnost.sql` before `-- Scout 3, opazovalni seznam (klub -913001, do 30).`:

```sql
-- Scout, stran Klub (20261018120000). Klub K = -913001; uporabnik ...0001 ima sedež.
select pg_temp.preveri('scoutk: anon ne klice, notranje ne iz brskalnika',
  not has_function_privilege('anon', 'public.scout_klub(bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.scout_klub(bigint)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.klub_jedro(bigint, bigint, bigint)', 'EXECUTE'));

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scoutk: brez sedeza ni pregleda kluba', $$select scout_klub()$$);
reset role;

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scoutk: svoj klub, kader le vidni igralci',
  (select (j->>'team_id')::bigint = -913001
      and not (j->>'admin')::boolean
      and (select array_agg((x->>'player_id')::bigint) from jsonb_array_elements(j->'kader') x) = array[-930007]::bigint[]
      and jsonb_array_length(j->'vrzeli') = 2
     from scout_klub() j));
select pg_temp.preveri('scoutk: svoj klub tudi z izrecnim id', (select (scout_klub(-913001)->>'team_id')::bigint = -913001));
select pg_temp.zavrnjeno('scoutk: ne-admin ne vidi tujega kluba', $$select scout_klub(-913002)$$);
reset role;
select pg_temp.preveri('scoutk: klic v dnevniku',
  exists (select 1 from scout.dnevnik where team_id = -913001 and vrsta = 'klub'
            and user_id = 'e5c30000-0000-4000-8000-000000000001'));

update profiles set is_admin = true where id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scoutk: admin vidi drug klub iste drzave',
  (select (j->>'team_id')::bigint = -913002 and (j->>'admin')::boolean from scout_klub(-913002) j));
select pg_temp.zavrnjeno('scoutk: admin ne vidi kluba druge drzave', $$select scout_klub(-930201)$$);
reset role;
update profiles set is_admin = false where id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','',true);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:varnost 2>&1 | grep -E "scoutk|FAIL|NAPAK" | head -20`
Expected: the `scoutk:` assertions fail (function does not exist).

- [ ] **Step 3: Write the migration** `supabase/migrations/20261018120000_scout_klub.sql`:

```sql
-- SLFF Scout, stran Klub (del 1): pregled kluba za trenerja in skavta.
-- Spec: docs/superpowers/specs/2026-10-18-scout-klub-design.md

alter table scout.dnevnik drop constraint dnevnik_vrsta_check;
alter table scout.dnevnik add constraint dnevnik_vrsta_check
  check (vrsta = any (array['isci', 'igralec', 'podobni', 'vrzeli', 'opazuj', 'opazovani', 'klub']));

create or replace function scout.klub_jedro(p_model bigint, p_country bigint, p_team bigint)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_liga bigint;
  v_moc double precision;
  v_sezona text;
  v_leto int;
  v_glava jsonb;
  v_ekipa jsonb;
  v_kader jsonb;
begin
  -- Liga kluba: najmočnejša odrasla liga zadnjega leta z Elo (kot drugod v Scoutu).
  select l.competition_id, l.moc into v_liga, v_moc from scout.liga_kluba(p_model, p_team) l;

  if v_liga is not null then
    -- Tekoča sezona lige (koledarska ali 2026/27), ne zadnja z odigrano tekmo.
    v_sezona := public.sezona_lige(v_liga);
    with lt as (select * from public.lestvica_lige(v_liga, v_sezona))
    select jsonb_build_object(
             'competition_id', v_liga,
             'liga', (select c.name from competitions c where c.id = v_liga),
             'sezona', lt.sezona,
             'mesto', lt.mesto,
             'klubov', (select count(*) from lt),
             'tekme', lt.tekme,
             'tocke', lt.tocke,
             'forma', lt.forma)
      into v_glava
      from lt where lt.team_id = p_team;

    select max(e.leto) into v_leto
      from scout.ekipe_elo e where e.model_id = p_model and e.team_id = p_team;
    v_glava := coalesce(v_glava, jsonb_build_object('competition_id', v_liga, 'sezona', v_sezona,
                 'liga', (select c.name from competitions c where c.id = v_liga)))
      || jsonb_build_object(
           'elo', (select e.elo from scout.ekipe_elo e
                    where e.model_id = p_model and e.team_id = p_team and e.leto = v_leto
                    order by (e.competition_id = v_liga) desc limit 1),
           'elo_lani', (select e.elo from scout.ekipe_elo e
                         where e.model_id = p_model and e.team_id = p_team and e.leto = v_leto - 1
                         order by (e.competition_id = v_liga) desc limit 1),
           'moc_mesto', 1 + (select count(*) from scout.lige_moc m join competitions c on c.id = m.competition_id
                              where m.model_id = p_model and c.country_id = p_country
                                and not je_mladinski_slug(c.slug) and m.moc > v_moc),
           'lig', (select count(*) from scout.lige_moc m join competitions c on c.id = m.competition_id
                    where m.model_id = p_model and c.country_id = p_country and not je_mladinski_slug(c.slug)));
  end if;

  if v_liga is not null then
    with tekme as (
      select m.* from matches m join rounds r on r.id = m.round_id
       where r.competition_id = v_liga and r.season = v_sezona
         and (m.imported_at is not null or m.kontumacija)
    ),
    izidi as (
      select home_team_id as team_id, true as doma, home_goals as za, away_goals as proti from tekme
      union all
      select away_team_id, false, away_goals, home_goals from tekme
    ),
    po_klubu as (
      select i.team_id,
             count(*)::float as tekme,
             avg(case when za > proti then 3 when za = proti then 1 else 0 end) as tocke,
             avg(za) as za,
             avg(proti) as proti,
             avg((proti = 0)::int) as ciste,
             avg(case when za > proti then 3 when za = proti then 1 else 0 end) filter (where doma) as tocke_doma,
             avg(case when za > proti then 3 when za = proti then 1 else 0 end) filter (where not doma) as tocke_gost
        from izidi i group by i.team_id
    ),
    kartoni as (
      select a.team_id, sum(a.yellow_cards + a.red_cards)::float / nullif(count(distinct a.match_id), 0) as kartoni
        from appearances a join tekme t on t.id = a.match_id group by a.team_id
    ),
    vse as (select p.*, k.kartoni from po_klubu p left join kartoni k on k.team_id = p.team_id)
    select jsonb_build_object(
             'klub', (select to_jsonb(v) - 'team_id' from vse v where v.team_id = p_team),
             'liga', (select jsonb_build_object(
                        'tekme', avg(v.tekme), 'tocke', avg(v.tocke), 'za', avg(v.za), 'proti', avg(v.proti),
                        'ciste', avg(v.ciste), 'tocke_doma', avg(v.tocke_doma), 'tocke_gost', avg(v.tocke_gost),
                        'kartoni', avg(v.kartoni))
                        from vse v))
      into v_ekipa;

    select coalesce(jsonb_agg(jsonb_build_object(
             'player_id', k.player_id, 'ime', p.full_name, 'skupina', k.skupina,
             'nastopi', coalesce(s.nastopi, 0), 'minute', k.minute, 'delez_minut', k.delez_minut,
             'zacetki_delez', k.zacetki_delez, 'goli', coalesce(s.goli, 0),
             'onoff_ref_90', k.onoff_ref_90, 'kartoni_90', k.kartoni_90, 'trend_minut', k.trend_minut)
             order by k.minute desc), '[]'::jsonb)
      into v_kader
      from scout.kazalniki k
      join players p on p.id = k.player_id
      -- Lateral z offset 0: vidni po igralcu, ne za celo državo (kot vrzeli_jedro).
      join lateral (select true as ok from scout.vidni(p_model, p_country) v
                     where v.player_id = k.player_id offset 0) w on true
      left join lateral (
        select count(*)::int as nastopi, sum(a.goals)::int as goli
          from appearances a join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
         where a.player_id = k.player_id and a.team_id = p_team
           and r.competition_id = v_liga and r.season = v_sezona) s on true
     where k.model_id = p_model and k.team_id = p_team and k.competition_id = v_liga
       and k.sezona = v_sezona and k.minute > 0;
  end if;

  return jsonb_build_object(
    'team_id', p_team,
    'ime', (select t.name from teams t where t.id = p_team),
    'country_id', p_country,
    'admin', is_admin(),
    'glava', v_glava,
    'ekipa', v_ekipa,
    'kader', coalesce(v_kader, '[]'::jsonb),
    'vrzeli', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
                 from scout.vrzeli_jedro(p_model, p_country, p_team) r));
end;
$$;

create or replace function public.scout_klub(p_team_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
  v_team bigint;
begin
  select * into d from scout.dostop('klub', null, jsonb_build_object('team', p_team_id));
  v_team := coalesce(p_team_id, d.team_id);
  -- Tuj klub le administratorju in le v državi naročnine; nikoli tiho nazaj na svoj klub.
  if v_team <> d.team_id and not (is_admin()
       and exists (select 1 from teams t where t.id = v_team and t.country_id = d.country_id)) then
    raise insufficient_privilege using message = 'Scout: le pregled svojega kluba.';
  end if;
  return scout.klub_jedro(d.model_id, d.country_id, v_team);
end;
$$;

revoke all on function scout.klub_jedro(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.scout_klub(bigint) from public, anon;
grant execute on function public.scout_klub(bigint) to authenticated;
```

Note: if `scout.vidni` turns out to be slow per row in Step 4 timing, keep it — Task 3 measures on production and decides.

- [ ] **Step 4: Apply locally and run tests**

Run: `npx supabase migration up --include-all && npm run test:varnost 2>&1 | tail -5`
Expected: all pass (`VSE OK` / no `FAIL`). If the existing check `scout: funkcij Scouta anon ne klice, notranjih nihce iz brskalnika` fails, fix grants in the migration (not the test).

- [ ] **Step 5: Regenerate types, typecheck**

Run: `npm run tipi && npm run typecheck`
Expected: `src/lib/baza.types.ts` gains `scout_klub`; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261018120000_scout_klub.sql supabase/tests/varnost.sql src/lib/baza.types.ts
git commit -m "feat(scout): scout_klub RPC for the club overview"
```

---

### Task 2: Scout app — Klub page

**Files:**
- Create: `scout/src/strani/Klub.tsx`
- Modify: `scout/src/baza.ts` (types), `scout/src/besede.ts` (sl + en strings), `scout/src/App.tsx` (route), `scout/src/Okvir.tsx` (tab), `scout/src/strani/Racun.tsx` ("Go to …" link), `scout/src/strani/Igralec.tsx` (export `st`, `odst`), `scout/smoke.tsx` (render `/club`, test `globina`)

**Interfaces:**
- Consumes: `supabase.rpc('scout_klub', { p_team_id?: number })` → jsonb as in Task 1.
- Produces: `export function globina(kader: IgralecKluba[]): { skupina: Skupina; stalnih: number; nosilec: IgralecKluba | null }[]` in `Klub.tsx`.

- [ ] **Step 1: Types** — append to `scout/src/baza.ts`:

```ts
/** scout_klub(): statistika na tekmo; ciste je delež 0..1. */
export interface StatEkipe {
  tekme: number
  tocke: number
  za: number
  proti: number
  ciste: number
  tocke_doma: number | null
  tocke_gost: number | null
  kartoni: number | null
}
export interface IgralecKluba {
  player_id: number
  ime: string
  skupina: Skupina
  nastopi: number
  minute: number
  delez_minut: number
  zacetki_delez: number
  goli: number
  onoff_ref_90: number
  kartoni_90: number
  trend_minut: number | null
}
export interface PregledKluba {
  team_id: number
  ime: string
  country_id: number
  admin: boolean
  glava: {
    competition_id: number
    liga: string
    sezona?: string
    mesto?: number
    klubov?: number
    tekme?: number
    tocke?: number
    forma?: string
    elo: number | null
    elo_lani: number | null
    moc_mesto: number
    lig: number
  } | null
  ekipa: { klub: StatEkipe | null; liga: StatEkipe } | null
  kader: IgralecKluba[]
  vrzeli: Vrzel[]
}
```

- [ ] **Step 2: Strings** — in `scout/src/besede.ts` add to `SL` (after `'nav.seznam'`) and to `EN` (same position) these keys:

| key | sl | en |
|---|---|---|
| `nav.klub` | `Klub` | `Club` |
| `klub.mesto` | `{mesto}. mesto od {n}` | `Position {mesto} of {n}` |
| `klub.forma` | `Zadnjih 5` | `Last 5` |
| `klub.izid.W` | `Z` | `W` |
| `klub.izid.D` | `R` | `D` |
| `klub.izid.L` | `P` | `L` |
| `klub.elo` | `Elo` | `Elo` |
| `klub.eloLani` | `lani {elo}` | `last year {elo}` |
| `klub.moc` | `Moč lige: {mesto}. od {n} lig v državi` | `League strength: {mesto} of {n} leagues in the country` |
| `klub.ekipa` | `Uspešnost ekipe` | `Team performance` |
| `klub.stKlub` | `Klub` | `Club` |
| `klub.stLiga` | `Povprečje lige` | `League average` |
| `klub.v.tocke` | `Točke na tekmo` | `Points per match` |
| `klub.v.za` | `Dani goli na tekmo` | `Goals scored per match` |
| `klub.v.proti` | `Prejeti goli na tekmo` | `Goals conceded per match` |
| `klub.v.ciste` | `Čiste mreže` | `Clean sheets` |
| `klub.v.tockeDoma` | `Točke na tekmo doma` | `Points per home match` |
| `klub.v.tockeGost` | `Točke na tekmo v gosteh` | `Points per away match` |
| `klub.v.kartoni` | `Kartoni na tekmo` | `Cards per match` |
| `klub.kader` | `Kader` | `Squad` |
| `klub.st.ime` | `Igralec` | `Player` |
| `klub.st.poz` | `Poz.` | `Pos.` |
| `klub.st.nastopi` | `Nastopi` | `Apps` |
| `klub.st.goli` | `Goli` | `Goals` |
| `klub.st.trend` | `Trend minut` | `Minutes trend` |
| `klub.globina` | `Globina po poziciji` | `Depth by position` |
| `klub.stalnih` | `{n} z vsaj 30 % minut` | `{n} with at least 30% of minutes` |
| `klub.nosilec` | `največ minut: {ime} ({delez} %)` | `most minutes: {ime} ({delez}%)` |
| `klub.izberi` | `Izberi klub (administrator)` | `Pick a club (admin)` |
| `klub.brezPodatkov` | `Za ta klub v tekoči sezoni še ni podatkov tekem.` | `No match data for this club this season yet.` |

And change `racun.naprej` to sl `Na pregled kluba`, en `Go to club overview`.

- [ ] **Step 3: Export helpers** — in `scout/src/strani/Igralec.tsx` change
  `const st = …` → `export const st = …` and `const odst = …` → `export const odst = …`.

- [ ] **Step 4: Page** — create `scout/src/strani/Klub.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SKUPINE, supabase, type IgralecKluba, type PregledKluba, type Skupina, type StatEkipe } from '../baza'
import { napaka, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'
import { odst, st } from './Igralec'
import { opisVrzeli } from './Vrzeli'

/** Globina po poziciji iz kadra: koliko igralcev nosi vsaj 30 % minut in kdo največ. */
export function globina(kader: IgralecKluba[]): { skupina: Skupina; stalnih: number; nosilec: IgralecKluba | null }[] {
  return SKUPINE.map((s) => {
    const v = kader.filter((k) => k.skupina === s)
    const nosilec = v.reduce<IgralecKluba | null>((a, b) => (!a || b.delez_minut > a.delez_minut ? b : a), null)
    return { skupina: s, stalnih: v.filter((k) => k.delez_minut >= 0.3).length, nosilec }
  })
}

const STOLPCI: [Kljuc, keyof IgralecKluba, (k: IgralecKluba) => string][] = [
  ['klub.st.nastopi', 'nastopi', (k) => String(k.nastopi)],
  ['igralec.st.minute', 'minute', (k) => String(k.minute)],
  ['igralec.st.delez', 'delez_minut', (k) => odst(k.delez_minut)],
  ['igralec.st.zacetki', 'zacetki_delez', (k) => odst(k.zacetki_delez)],
  ['klub.st.goli', 'goli', (k) => String(k.goli)],
  ['igralec.st.onoff', 'onoff_ref_90', (k) => st(k.onoff_ref_90)],
  ['igralec.st.kartoni', 'kartoni_90', (k) => st(k.kartoni_90)],
  ['klub.st.trend', 'trend_minut', (k) => odst(k.trend_minut)],
]

const VRSTICE: [Kljuc, keyof StatEkipe, (x: number | null | undefined) => string][] = [
  ['klub.v.tocke', 'tocke', (x) => st(x)],
  ['klub.v.za', 'za', (x) => st(x)],
  ['klub.v.proti', 'proti', (x) => st(x)],
  ['klub.v.ciste', 'ciste', (x) => odst(x)],
  ['klub.v.tockeDoma', 'tocke_doma', (x) => st(x)],
  ['klub.v.tockeGost', 'tocke_gost', (x) => st(x)],
  ['klub.v.kartoni', 'kartoni', (x) => st(x)],
]

/** Id kluba iz naslova (?team=): le varno pozitivno celo število. */
function klubIzNaslova(v: string | null): number | undefined {
  if (!v || !/^[1-9]\d*$/.test(v)) return undefined
  const n = Number(v)
  return Number.isSafeInteger(n) ? n : undefined
}

export function Klub() {
  const [q, setQ] = useSearchParams()
  const izbran = klubIzNaslova(q.get('team'))
  const [p, setP] = useState<PregledKluba | null>(null)
  const [napakaK, setNapakaK] = useState<string | null>(null)
  const [razvrsti, setRazvrsti] = useState<keyof IgralecKluba>('minute')

  useEffect(() => {
    let velja = true
    setP(null)
    setNapakaK(null)
    void supabase.rpc('scout_klub', izbran ? { p_team_id: izbran } : {}).then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaK(napaka(error))
      else setP(data as unknown as PregledKluba)
    })
    return () => {
      velja = false
    }
  }, [izbran])

  if (napakaK) return <p className="opozorilo">{napakaK}</p>
  if (!p) return <Nalaganje />
  const g = p.glava
  const kader = [...p.kader].sort((a, b) => Number(b[razvrsti] ?? -Infinity) - Number(a[razvrsti] ?? -Infinity))
  return (
    <div className="space-y-6">
      {p.admin && <IzbiraKluba drzava={p.country_id} onIzbira={(id) => setQ({ team: String(id) })} />}

      <header className="kartica space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black naslov sm:text-3xl">{p.ime}</h1>
            {g && <p className="text-sm text-slate-400">{g.liga}{g.sezona ? ` · ${g.sezona}` : ''}</p>}
          </div>
          {g?.mesto != null && g.klubov != null && (
            <p className="text-right text-lg font-bold text-slate-100">{t('klub.mesto', { mesto: g.mesto, n: g.klubov })}</p>
          )}
        </div>
        {g && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
            {g.forma && (
              <span className="flex items-center gap-1">
                <span className="mr-1 text-slate-400">{t('klub.forma')}</span>
                {[...g.forma].map((z, i) => (
                  <span
                    key={i}
                    className={`znacka ${z === 'W' ? 'bg-gnl-400/20 text-gnl-200' : z === 'D' ? 'bg-white/10 text-slate-300' : 'bg-rose-400/15 text-rose-200'}`}
                  >
                    {t(`klub.izid.${z}` as Kljuc)}
                  </span>
                ))}
              </span>
            )}
            {g.elo != null && (
              <span>
                <span className="text-slate-400">{t('klub.elo')}</span>{' '}
                <span className="font-bold tabular-nums text-gnl-300">{Math.round(g.elo)}</span>
                {g.elo_lani != null && <span className="text-slate-400"> · {t('klub.eloLani', { elo: Math.round(g.elo_lani) })}</span>}
              </span>
            )}
            <span className="text-slate-400">{t('klub.moc', { mesto: g.moc_mesto, n: g.lig })}</span>
          </div>
        )}
      </header>

      {!p.ekipa?.klub ? (
        <p className="kartica p-5 text-center text-slate-400">{t('klub.brezPodatkov')}</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">{t('klub.ekipa')}</h2>
            <div className="kartica overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 text-left text-xs text-slate-400">
                  <tr>
                    <th className="px-3 py-2" />
                    <th className="px-3 py-2 text-right font-semibold">{t('klub.stKlub')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('klub.stLiga')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {VRSTICE.map(([k, polje, f]) => (
                    <tr key={k}>
                      <td className="px-3 py-2 text-slate-300">{t(k)}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-100">{f(p.ekipa?.klub?.[polje])}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">{f(p.ekipa?.liga[polje])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">{t('klub.kader')}</h2>
            <div className="kartica overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10 text-left text-xs text-slate-400">
                  <tr>
                    <th className="sticky left-0 bg-slate-950 px-3 py-2 font-semibold">{t('klub.st.ime')}</th>
                    <th className="px-3 py-2 font-semibold">{t('klub.st.poz')}</th>
                    {STOLPCI.map(([k, polje]) => (
                      <th key={k} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                        <button type="button" onClick={() => setRazvrsti(polje)} className={razvrsti === polje ? 'text-gnl-300' : 'hover:text-slate-200'}>
                          {t(k)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {kader.map((k) => (
                    <tr key={k.player_id} className="hover:bg-white/5">
                      <td className="sticky left-0 whitespace-nowrap bg-slate-950 px-3 py-2">
                        <Link to={`/player/${k.player_id}`} className="font-semibold text-slate-100 hover:text-gnl-300">{k.ime}</Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`znacka poz-${k.skupina}`}>{t(`poz.${k.skupina}` as Kljuc)}</span>
                      </td>
                      {STOLPCI.map(([kl, , f]) => (
                        <td key={kl} className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-300">{f(k)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">{t('klub.globina')}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {globina(p.kader).map((x) => (
                <div key={x.skupina} className="kartica space-y-1 p-4">
                  <span className={`znacka poz-${x.skupina}`}>{t(`skupina.${x.skupina}` as Kljuc)}</span>
                  <p className="text-sm text-slate-200">{t('klub.stalnih', { n: x.stalnih })}</p>
                  {x.nosilec && (
                    <p className="text-xs text-slate-400">
                      {t('klub.nosilec', { ime: x.nosilec.ime, delez: Math.round(x.nosilec.delez_minut * 100) })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {p.vrzeli.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">{t('nav.vrzeli')}</h2>
          <ul className="kartica divide-y divide-white/5 overflow-hidden">
            {p.vrzeli.map((v, i) => (
              <li key={`${v.vrsta}-${v.skupina}-${v.player_id ?? i}`} className="flex flex-wrap items-center gap-2 px-4 py-3 text-slate-100">
                {v.skupina && <span className={`znacka poz-${v.skupina}`}>{t(`poz.${v.skupina}` as Kljuc)}</span>}
                {opisVrzeli(v)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Izbira kluba za administratorje SLFF (preizkus na pravih klubih); baza preveri še enkrat. */
function IzbiraKluba({ drzava, onIzbira }: { drzava: number; onIzbira: (id: number) => void }) {
  const [iskanje, setIskanje] = useState('')
  const [zadetki, setZadetki] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    const q = iskanje.trim()
    if (q.length < 2) return setZadetki([])
    let velja = true
    void supabase
      .from('teams')
      .select('id, name')
      .eq('country_id', drzava)
      .ilike('name', `%${q.replace(/[%_]/g, '')}%`)
      .order('name')
      .limit(8)
      .then(({ data }) => velja && setZadetki(data ?? []))
    return () => {
      velja = false
    }
  }, [iskanje, drzava])

  return (
    <div className="relative">
      <input value={iskanje} onChange={(e) => setIskanje(e.target.value)} placeholder={t('klub.izberi')} className="polje w-full sm:w-80" />
      {zadetki.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-1 sm:w-80">
          {zadetki.map((z) => (
            <li key={z.id}>
              <button
                type="button"
                onClick={() => {
                  onIzbira(z.id)
                  setIskanje('')
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
              >
                {z.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Route, tab, account link**
  - `scout/src/App.tsx`: `import { Klub } from './strani/Klub'` and add `<Route path="/club" element={<ZahtevaSedez><Klub /></ZahtevaSedez>} />` before the `/gaps` route.
  - `scout/src/Okvir.tsx`: inside `{dostop && (<>…</>)}` add as the FIRST link `<NavLink to="/club" className={povezava}>{t('nav.klub')}</NavLink>`.
  - `scout/src/strani/Racun.tsx`: change `<Link to="/" className="gumb-glavni inline-block">` to `<Link to="/club" className="gumb-glavni inline-block">`.

- [ ] **Step 6: Smoke** — in `scout/smoke.tsx`:
  - `import { Klub, globina } from './src/strani/Klub'`
  - add `['/club', '/club', <Klub />],` to `strani`
  - after the existing utemeljitev/vrzeli checks add:

```ts
const kaderPreizkus = [
  { player_id: 1, ime: 'A', skupina: 'FWD', nastopi: 9, minute: 800, delez_minut: 0.9, zacetki_delez: 1, goli: 5, onoff_ref_90: 0.3, kartoni_90: 0.1, trend_minut: 0 },
  { player_id: 2, ime: 'B', skupina: 'FWD', nastopi: 4, minute: 200, delez_minut: 0.2, zacetki_delez: 0.2, goli: 1, onoff_ref_90: 0, kartoni_90: 0, trend_minut: null },
] as const
const gl = globina([...kaderPreizkus])
preveri('klub: globina šteje igralce z vsaj 30 % minut in najde nosilca',
  gl.find((x) => x.skupina === 'FWD')?.stalnih === 1 && gl.find((x) => x.skupina === 'FWD')?.nosilec?.ime === 'A'
  && gl.find((x) => x.skupina === 'GK')?.nosilec === null)
```

- [ ] **Step 7: Run checks**

Run: `npm run typecheck && VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=x npm run smoke:scout | tail -3 && VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=x npm run build:scout | tail -2`
Expected: typecheck clean, `VSE OK`, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add scout/
git commit -m "feat(scout): Club page with squad, team performance, depth and gaps"
```

---

### Task 3: Production timing, docs

**Files:**
- Modify: `docs/scout.md` (section `## Aplikacija scout.slff.eu (faza 3b)`: one paragraph on `/club` and `scout_klub`), `CLAUDE.md` (in *SLFF Scout (klubi, scout.slff.eu)* add one sentence: "Stran Klub (`/club`, `scout_klub`) je pregled lastnega kluba; administratorji izberejo katerikoli klub v državi naročnine.")

- [ ] **Step 1: Time on production (rolled back)** — copy the migration to the server and run it inside a transaction with timing for the biggest Slovenian club, then roll back:

```bash
f=supabase/migrations/20261018120000_scout_klub.sql
{ echo 'begin;'; cat "$f"; cat <<'SQL'
\timing on
select scout.klub_jedro(scout.zadnji_model(), (select id from countries where code='SI'),
  (select k.team_id from scout.kazalniki k where k.model_id = scout.zadnji_model()
    group by k.team_id order by count(*) desc limit 1)) is not null;
select scout.klub_jedro(scout.zadnji_model(), (select id from countries where code='SI'),
  (select id from teams where name ilike 'Šenčur%' limit 1)) is not null;
rollback;
SQL
} > /tmp/klub-cas.sql
scp -q /tmp/klub-cas.sql slff:/tmp/klub-cas.sql && ssh slff 'docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < /tmp/klub-cas.sql; rm /tmp/klub-cas.sql'
```
Expected: both selects return `t`, each `Time:` under 300 ms (run twice; take the second, warm run). If above 300 ms, stop and report the timing with `explain (analyze, buffers)` of the slow part — do not merge.

- [ ] **Step 2: Docs** — write the two doc changes above (Slovenian, matching the surrounding style).

- [ ] **Step 3: Commit**

```bash
git add docs/scout.md CLAUDE.md
git commit -m "docs(scout): Club page"
```
