-- Državna lestvica po starostnih skupinah (SLF-366).
--
-- Prej so se v enem "vrhu države" mešali člani, U19, kadeti (U17) in U15:
-- liga se je razvrstila po golih in točkah, ne po težavnosti. Zdaj ima vsaka
-- liga starostno skupino, ki jo določa TEKMOVANJE, ne igralec ali njegovo ime:
--
--   clani    člani, brez starostne omejitve
--   u19      lige U19 (mladinci, juniori)
--   pod_u19  lige U18 in mlajših (kadeti U17, U15, ...)
--
-- Glavni pogled (`p_skupina = 'glavna'`) zajame `clani` + `u19`, pogled za
-- mlade (`'mladi'`) le `pod_u19`. Lige z NEZNANO skupino (`null`) niso v nobenem
-- pogledu: neznanega ne uvrščamo ne k članom ne k mladim. Skupina je oznaka
-- lige, ne trditev o letih posameznega igralca.
--
-- Pregled 9. 11. 2026 (vse 1 500 lig, aktivne in neaktivne): 1 072 članskih,
-- 174 U19, 227 pod U19. Brez skupine ostane 23 lig, ki jih pravilo noče
-- ugibati; popravi jih človek z vpisom v `competition_starostne_skupine`:
--   hr-ri-u19 (šifra U19, ime U18), hr-vz-u19 (kadeti/juniori U-18),
--   13 madžarskih U21, at-w-stadtliga-u23, gb-lowland-u20-east/west,
--   hk-u22-league, mt-youth-a..d (brez starostne meje).
-- Nove lige dobijo skupino ob vpisu iz iste funkcije; dvoumne nimajo vrstice.
--
-- Skupina je v lastni tabeli, ne v stolpcu `competitions`: obliko `competitions`
-- namreč zaklepa opazovalec FCF (G1), nov stolpec pa bi ga zrušil.

create table if not exists public.competition_starostne_skupine (
  competition_id bigint primary key references public.competitions(id) on delete cascade,
  skupina text not null check (skupina in ('clani', 'u19', 'pod_u19'))
);

comment on table public.competition_starostne_skupine is
  'Starostna skupina tekmovanja: clani, u19 ali pod_u19 (U18 in mlajši). Brez vrstice = neznana, liga ni na nobeni državni lestvici.';

alter table public.competition_starostne_skupine enable row level security;
drop policy if exists "javno branje" on public.competition_starostne_skupine;
create policy "javno branje" on public.competition_starostne_skupine for select using (true);
drop policy if exists "admin ureja skupine" on public.competition_starostne_skupine;
create policy "admin ureja skupine" on public.competition_starostne_skupine for all
  using (is_admin()) with check (is_admin());

-- Skupina iz šifre in imena lige. Številka U-- (u17, U-15) ima prednost pred
-- besedo; številka v šifri in imenu mora biti ena sama, sicer je odgovor null.
create or replace function public.starostna_skupina_iz_oznake(p_slug text, p_ime text)
returns text language sql immutable parallel safe set search_path = public as $$
  with o as (
    select lower(coalesce(p_slug, '')) as s, lower(coalesce(p_ime, '')) as i
  ),
  st as (
    select (select array_agg(distinct m[1]::int)
              from regexp_matches(o.s || ' ' || o.i, '(?:^|[^a-z0-9])u-?([0-9]{1,2})(?![0-9])', 'g') as m) as stevila,
           o.s, o.s || ' ' || o.i as b
      from o
  )
  select case
    when stevila is not null and cardinality(stevila) > 1 then null
    when stevila is not null and stevila[1] >= 20 then null
    when stevila is not null and stevila[1] = 19 then
      case when b ~ 'kadet|кадет|dečk|decak|dječ|pionir|starejši|mlajši|žiak|ziak|serdül|pupil|infantil|alev'
           then null else 'u19' end
    when stevila is not null then
      case when b ~ 'mladinc|младин|junior|юниор' then null else 'pod_u19' end
    when b ~ 'kadet|кадет|dečk|dječ|pionir|starejši dečki' and b !~ 'mladinc|младин|junior|юниор'
      then 'pod_u19'
    when (b ~ 'mladinc' or s ~ '^sml[0-9]') and b !~ 'kadet|кадет|dečk|dječ|pionir|starejši dečki'
      then 'u19'
    when b ~ 'mladin|младин|junior|юниор|omladin|kadet|кадет|dečk|decak|dječ|pionir|starejši|mlajši|žiak|ziak|serdül|pupil|infantil|alev|dorast|ifjúsági|ifjusagi|tineret|youth|jugend|academy|akademi|juvenil|nachwuchs|młodzi|mlodzi|cadet|sub-?[0-9]|under'
      then null
    else 'clani'
  end from st
$$;

insert into public.competition_starostne_skupine (competition_id, skupina)
select c.id, public.starostna_skupina_iz_oznake(c.slug, c.name)
  from public.competitions c
 where public.starostna_skupina_iz_oznake(c.slug, c.name) is not null
on conflict (competition_id) do nothing;

create or replace function public.competitions_starostna_skupina()
returns trigger language plpgsql security definer set search_path = public as $$
declare g text := public.starostna_skupina_iz_oznake(new.slug, new.name);
begin
  if g is not null then
    insert into public.competition_starostne_skupine (competition_id, skupina)
    values (new.id, g) on conflict (competition_id) do nothing;
  end if;
  return null;
end $$;

drop trigger if exists competitions_starostna_skupina_trg on public.competitions;
create trigger competitions_starostna_skupina_trg
  after insert on public.competitions
  for each row execute function public.competitions_starostna_skupina();

-- Pogled lig: stolpec na konec, da `create or replace` ne prerazporedi
-- stolpcev (`lestvica_drzavna` in `mini_liga_lestvica` stojita nanj).
create or replace view public.competitions_view as
  select c.id, c.slug, c.name, c.short_name, c.mnzg_liga, c.prvi_fantasy_krog,
         c.sort_order, c.active, c.rok_pomak_ur, c.country_id, c.source,
         c.source_league_code, c.federation_id, c.vir_ime, c.vir_url,
         d.code       as country_code,
         d.name       as country_name,
         f.code       as federation_code,
         f.name       as federation_name,
         f.short_name as federation_short,
         f.site_url   as federation_url,
         f.sort_order as federation_sort,
         c.sezona_koledarska,
         g.skupina as starostna_skupina
    from public.competitions c
    join public.countries d on d.id = c.country_id
    left join public.federations f on f.id = c.federation_id
    left join public.competition_starostne_skupine g on g.competition_id = c.id;

-- ---------------------------------------------------------------------------
-- vrh_drzave: najboljši igralci države, ločeno po starostnih skupinah
-- ---------------------------------------------------------------------------
-- Skupino je treba izločiti PRED razvrščanjem in `limit`: ob filtriranju po
-- desetih najboljših iz mešane lestvice bi mladi ostali brez vrstic.
--
-- Tekoča sezona se določi PO LIGI (največja sezona krogov te lige), ne za
-- vso državo: koledarska sezona ("2026") in jesen-pomlad ("2026/27") nista
-- primerljivi nizi. Sezona je zato v vsaki vrstici.
--
-- Točke so brez asistenc (asistenca = 3 točke na vsaki poziciji), kot doslej:
-- asistence potrdi glasovanje, ki v večini lig še ne teče.
--
-- Staro podpis (text, integer) odpade: ostal bi in `vrh_drzave(p_drzava =>
-- 'SI')` bi bil dvoumen. Star odjemalec kliče z imenovanima argumentoma in
-- dobi glavno skupino (člani + U19), kar je pravilen odgovor.
drop function if exists public.vrh_drzave(text, integer);

create function public.vrh_drzave(p_drzava text, p_koliko integer default 10,
                                  p_skupina text default 'glavna')
returns table(kategorija text, mesto integer, player_id bigint, full_name text, "position" text,
              team_name text, team_short text, team_logo text, competition_slug text,
              competition_short text, vrednost numeric, minutes integer, tekem integer, season text,
              starostna_skupina text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with lige as (
    select c.id, c.slug, c.short_name, g.skupina as starostna_skupina
      from competitions c
      join countries d on d.id = c.country_id
      join competition_starostne_skupine g on g.competition_id = c.id
     where c.active and d.code = p_drzava
       and case p_skupina
             when 'glavna' then g.skupina in ('clani', 'u19')
             when 'mladi'  then g.skupina = 'pod_u19'
             else false
           end
  ),
  sezona as (
    select r.competition_id, max(r.season) as s
      from rounds r
      join lige l on l.id = r.competition_id
     group by r.competition_id
  ),
  stat as (
    select s.player_id, s.competition_id, z.s as sezona,
           s.matches as tekem, s.minutes, s.goals as goli,
           s.clean_sheets as ciste_mreze,
           s.points - 3 * s.assists as tocke
      from statistika_igralcev s
      join sezona z on z.competition_id = s.competition_id and z.s = s.season
  ),
  kategorije as (
    select 'tocke' as kategorija, s.player_id, s.competition_id, s.sezona, s.tekem, s.minutes, s.tocke::numeric as vrednost from stat s
    union all
    select 'goli', s.player_id, s.competition_id, s.sezona, s.tekem, s.minutes, s.goli from stat s
    union all
    -- čista mreža je dosežek vratarja; branilci jo imajo le zraven
    select 'ciste_mreze', s.player_id, s.competition_id, s.sezona, s.tekem, s.minutes, s.ciste_mreze
      from stat s join players p on p.id = s.player_id
     where p.position = 'GK'
  ),
  razvrsceni as (
    select k.*,
           -- enako kot na naslovnici: ob izenačenju odloča več minut
           row_number() over (partition by k.kategorija
                              order by k.vrednost desc, k.minutes desc, k.player_id,
                                       k.competition_id) as mesto
      from kategorije k
     where k.vrednost > 0
  )
  select x.kategorija, x.mesto::int, p.id, p.full_name, p.position,
         t.name, t.short_name, t.logo_url,
         l.slug, l.short_name,
         x.vrednost, x.minutes, x.tekem, x.sezona, l.starostna_skupina
    from razvrsceni x
    join players p on p.id = x.player_id
    join lige l on l.id = x.competition_id
    left join teams t on t.id = p.team_id
   where x.mesto <= least(greatest(coalesce(p_koliko, 10), 1), 50)
   order by x.kategorija, x.mesto;
$function$;

revoke all on function public.vrh_drzave(text, integer, text) from public;
grant execute on function public.vrh_drzave(text, integer, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- vrh_klubov_drzave: klubske ekipe, ločeno po starostnih skupinah
-- ---------------------------------------------------------------------------
-- Ekipa je že klub v ENI ligi, zato se skupina izloči pred razvrščanjem
-- (`lige`), mesta pa so znotraj skupine. Sezona je po ligi, kakor pri
-- `vrh_drzave`. Funkcija bere urni predpomnilnik (20261030130200), zato ima
-- tudi ta ključ skupine; stare vrstice (brez skupine, mešane) dobijo oznako
-- 'vse', je nihče več ne bere, in jih urni opravek pobriše. Stari podpisi
-- (4 argumenti) odpadejo, da klic ni dvoumen; star odjemalec kliče z
-- imenovanimi argumenti in dobi glavno skupino.
drop function if exists public.vrh_klubov_drzave(text, integer, boolean, integer);
drop function if exists public.vrh_klubov_drzave_izracun(text, integer, boolean, integer);

create function public.vrh_klubov_drzave_izracun(
  p_drzava text,
  p_koliko integer default 50,
  p_na_krog boolean default false,
  p_najmanj_krogov integer default 3,
  p_skupina text default 'glavna'
)
returns table(mesto integer, team_id bigint, team_name text, team_short text, team_logo text,
              competition_slug text, competition_short text, tocke numeric, krogov integer,
              na_krog numeric, goli integer, igralcev integer, season text,
              starostna_skupina text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with lige as (
    select c.id, c.slug, c.short_name, g.skupina as starostna_skupina
      from competitions c
      join countries d on d.id = c.country_id
      join competition_starostne_skupine g on g.competition_id = c.id
     where c.active and d.code = p_drzava
       and case p_skupina
             when 'glavna' then g.skupina in ('clani', 'u19')
             when 'mladi'  then g.skupina = 'pod_u19'
             else false
           end
  ),
  sezona as (
    select r.competition_id, max(r.season) as s
      from rounds r
      join lige l on l.id = r.competition_id
     group by r.competition_id
  ),
  tekme as (
    select m.id, m.round_id, r.competition_id, m.home_team_id, m.away_team_id
      from matches m
      join rounds r on r.id = m.round_id
      join lige l on l.id = r.competition_id
      join sezona z on z.competition_id = r.competition_id and z.s = r.season
     where m.imported_at is not null
  ),
  asistence as (
    select g.match_id, g.assist_player_id as player_id, count(*)::int as st
      from goals g
      join tekme t on t.id = g.match_id
     where g.assist_player_id is not null
     group by g.match_id, g.assist_player_id
  ),
  -- Igralec v krogu: za koga je igral, koliko golov in asistenc je dal.
  -- Dvojni krog (dve tekmi istega kroga) se sešteje v eno vrstico, ker
  -- `player_scores` hrani točke po krogu.
  nastopi as (
    select a.player_id, t.round_id, t.competition_id,
           min(a.team_id) as team_id,
           sum(a.goals)::int as goli,
           coalesce(sum(asi.st), 0)::int as asistenc
      from appearances a
      join tekme t on t.id = a.match_id
      left join asistence asi on asi.match_id = a.match_id and asi.player_id = a.player_id
     group by a.player_id, t.round_id, t.competition_id
  ),
  ekipe as (
    select n.team_id, n.competition_id,
           sum(ps.points - 3 * n.asistenc)::numeric as tocke,
           sum(n.goli)::int as goli,
           count(distinct n.player_id)::int as igralcev
      from nastopi n
      join player_scores ps on ps.player_id = n.player_id and ps.round_id = n.round_id
     group by n.team_id, n.competition_id
  ),
  krogi as (
    select x.team_id, t.competition_id, count(*)::int as krogov
      from tekme t
      cross join lateral (values (t.home_team_id), (t.away_team_id)) as x(team_id)
     group by x.team_id, t.competition_id
  ),
  skupaj as (
    select e.*, coalesce(k.krogov, 0) as krogov,
           round(e.tocke / nullif(k.krogov, 0), 1) as na_krog
      from ekipe e
      left join krogi k on k.team_id = e.team_id and k.competition_id = e.competition_id
  ),
  razvrsceni as (
    select s.*,
           row_number() over (order by case when p_na_krog then s.na_krog else s.tocke end desc,
                                       s.tocke desc, s.goli desc, s.team_id, s.competition_id) as mesto
      from skupaj s
     where not p_na_krog or s.krogov >= greatest(coalesce(p_najmanj_krogov, 1), 1)
  )
  select x.mesto::int, t.id, t.name, t.short_name, t.logo_url, l.slug, l.short_name,
         x.tocke, x.krogov, x.na_krog, x.goli, x.igralcev, z.s, l.starostna_skupina
    from razvrsceni x
    join teams t on t.id = x.team_id
    join lige l on l.id = x.competition_id
    join sezona z on z.competition_id = x.competition_id
   where x.mesto <= least(greatest(coalesce(p_koliko, 50), 1), 1000)
   order by x.mesto;
$function$;
revoke all on function public.vrh_klubov_drzave_izracun(text, integer, boolean, integer, text) from public, anon, authenticated;

alter table public.vrh_klubov_predpomnilnik add column if not exists skupina text not null default 'vse';
alter table public.vrh_klubov_predpomnilnik alter column skupina drop default;
alter table public.vrh_klubov_predpomnilnik drop constraint if exists vrh_klubov_predpomnilnik_pkey;
alter table public.vrh_klubov_predpomnilnik add primary key (drzava, skupina, po_krogu, najmanj);

create or replace function public.osvezi_vrh_klubov()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d text;
  n integer := 0;
begin
  for d in
    select co.code from countries co
     where exists (select 1 from competitions c where c.country_id = co.id and c.active)
  loop
    insert into vrh_klubov_predpomnilnik as p (drzava, skupina, po_krogu, najmanj, vrstice, izracunano_at)
    select d, s.skupina, k.po_krogu, 3,
           coalesce((select jsonb_agg(to_jsonb(x) order by x.mesto)
                       from vrh_klubov_drzave_izracun(d, 1000, k.po_krogu, 3, s.skupina) x), '[]'::jsonb),
           now()
      from (values (false), (true)) as k(po_krogu)
     cross join (values ('glavna'), ('mladi')) as s(skupina)
    on conflict (drzava, skupina, po_krogu, najmanj)
      do update set vrstice = excluded.vrstice, izracunano_at = excluded.izracunano_at;
    n := n + 1;
  end loop;
  delete from vrh_klubov_predpomnilnik where izracunano_at < now() - interval '2 days';
  return n;
end;
$function$;
revoke all on function public.osvezi_vrh_klubov() from public, anon, authenticated;

create function public.vrh_klubov_drzave(
  p_drzava text,
  p_koliko integer default 50,
  p_na_krog boolean default false,
  p_najmanj_krogov integer default 3,
  p_skupina text default 'glavna'
)
returns table(mesto integer, team_id bigint, team_name text, team_short text, team_logo text,
              competition_slug text, competition_short text, tocke numeric, krogov integer,
              na_krog numeric, goli integer, igralcev integer, season text,
              starostna_skupina text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v jsonb;
  koliko integer := least(greatest(coalesce(p_koliko, 50), 1), 1000);
begin
  select p.vrstice into v
    from vrh_klubov_predpomnilnik p
   where p.drzava = p_drzava
     and p.skupina = p_skupina
     and p.po_krogu = coalesce(p_na_krog, false)
     and p.najmanj = greatest(coalesce(p_najmanj_krogov, 1), 1)
     and p.izracunano_at > now() - interval '2 hours';
  if v is null then
    return query select * from vrh_klubov_drzave_izracun(p_drzava, p_koliko, p_na_krog, p_najmanj_krogov, p_skupina);
    return;
  end if;
  return query
    select x.mesto, x.team_id, x.team_name, x.team_short, x.team_logo, x.competition_slug,
           x.competition_short, x.tocke, x.krogov, x.na_krog, x.goli, x.igralcev, x.season,
           x.starostna_skupina
      from jsonb_to_recordset(v) as x(mesto integer, team_id bigint, team_name text, team_short text,
           team_logo text, competition_slug text, competition_short text, tocke numeric,
           krogov integer, na_krog numeric, goli integer, igralcev integer, season text,
           starostna_skupina text)
     where x.mesto <= koliko
     order by x.mesto;
end;
$function$;
revoke all on function public.vrh_klubov_drzave(text, integer, boolean, integer, text) from public;
grant execute on function public.vrh_klubov_drzave(text, integer, boolean, integer, text) to anon, authenticated;

-- Predpomnilnik takoj, ne šele ob :20: brez njega bi velike države (Madžarska,
-- Avstrija) do prvega urnega opravka računale sproti in presegle 3 s anona.
do $$
begin
  perform public.osvezi_vrh_klubov();
exception
  when others then
    raise notice 'predpomnilnik klubov ni osvežen (%): ostane urnik.', sqlerrm;
end;
$$;
