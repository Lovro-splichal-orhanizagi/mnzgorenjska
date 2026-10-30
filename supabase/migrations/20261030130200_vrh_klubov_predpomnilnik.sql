-- `vrh_klubov_drzave` (zavihek Klubi državne lestvice) je ob vsakem klicu
-- seštel vso sezono države (Madžarska 250 000 nastopov): povprečno 1,2 s,
-- Madžarska 5 s, Avstrija 8 s, anon pa ima 3 s — obiskovalec je dobil 500.
-- Seštevki se spremenijo le z uvozom, zato jih vsako uro izračuna pg_cron v
-- `vrh_klubov_predpomnilnik`, funkcija pa bere od tam. Česar ni (nova
-- država, drug prag, zastarelo več kot 3 ure), izračuna sproti kot prej.

-- Izračun je nespremenjen, le pod novim imenom in zaprt za vmesnik.
create or replace function public.vrh_klubov_drzave_izracun(
  p_drzava text,
  p_koliko integer default 50,
  p_na_krog boolean default false,
  p_najmanj_krogov integer default 3
)
returns table(mesto integer, team_id bigint, team_name text, team_short text, team_logo text,
              competition_slug text, competition_short text, tocke numeric, krogov integer,
              na_krog numeric, goli integer, igralcev integer, season text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with lige as (
    select c.id, c.slug, c.short_name
      from competitions c
      join countries d on d.id = c.country_id
     where c.active and d.code = p_drzava
  ),
  sezona as (
    select max(r.season) as s
      from rounds r
      join lige l on l.id = r.competition_id
  ),
  tekme as (
    select m.id, m.round_id, r.competition_id, m.home_team_id, m.away_team_id
      from matches m
      join rounds r on r.id = m.round_id
      join lige l on l.id = r.competition_id
     where r.season = (select s from sezona)
       and m.imported_at is not null
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
         x.tocke, x.krogov, x.na_krog, x.goli, x.igralcev, (select s from sezona)
    from razvrsceni x
    join teams t on t.id = x.team_id
    join lige l on l.id = x.competition_id
   where x.mesto <= least(greatest(coalesce(p_koliko, 50), 1), 1000)
   order by x.mesto;
$function$;
revoke all on function public.vrh_klubov_drzave_izracun(text, integer, boolean, integer) from public, anon, authenticated;

create table if not exists public.vrh_klubov_predpomnilnik (
  drzava text not null,
  po_krogu boolean not null,
  najmanj integer not null,
  vrstice jsonb not null,
  izracunano_at timestamptz not null default now(),
  primary key (drzava, po_krogu, najmanj)
);
alter table public.vrh_klubov_predpomnilnik enable row level security;
revoke all on table public.vrh_klubov_predpomnilnik from anon, authenticated;

-- Vse države z aktivno ligo, oba načina razvrstitve, prag kot v vmesniku
-- (NAJMANJ_KROGOV_ZA_POVPRECJE v src/lib/drzavna.ts).
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
    insert into vrh_klubov_predpomnilnik as p (drzava, po_krogu, najmanj, vrstice, izracunano_at)
    select d, k.po_krogu, 3,
           coalesce((select jsonb_agg(to_jsonb(x) order by x.mesto)
                       from vrh_klubov_drzave_izracun(d, 1000, k.po_krogu, 3) x), '[]'::jsonb),
           now()
      from (values (false), (true)) as k(po_krogu)
    on conflict (drzava, po_krogu, najmanj)
      do update set vrstice = excluded.vrstice, izracunano_at = excluded.izracunano_at;
    n := n + 1;
  end loop;
  delete from vrh_klubov_predpomnilnik where izracunano_at < now() - interval '2 days';
  return n;
end;
$function$;
revoke all on function public.osvezi_vrh_klubov() from public, anon, authenticated;

create or replace function public.vrh_klubov_drzave(
  p_drzava text,
  p_koliko integer default 50,
  p_na_krog boolean default false,
  p_najmanj_krogov integer default 3
)
returns table(mesto integer, team_id bigint, team_name text, team_short text, team_logo text,
              competition_slug text, competition_short text, tocke numeric, krogov integer,
              na_krog numeric, goli integer, igralcev integer, season text)
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
     and p.po_krogu = coalesce(p_na_krog, false)
     and p.najmanj = greatest(coalesce(p_najmanj_krogov, 1), 1)
     and p.izracunano_at > now() - interval '3 hours';
  if v is null then
    return query select * from vrh_klubov_drzave_izracun(p_drzava, p_koliko, p_na_krog, p_najmanj_krogov);
    return;
  end if;
  return query
    select x.mesto, x.team_id, x.team_name, x.team_short, x.team_logo, x.competition_slug,
           x.competition_short, x.tocke, x.krogov, x.na_krog, x.goli, x.igralcev, x.season
      from jsonb_to_recordset(v) as x(mesto integer, team_id bigint, team_name text, team_short text,
           team_logo text, competition_slug text, competition_short text, tocke numeric,
           krogov integer, na_krog numeric, goli integer, igralcev integer, season text)
     where x.mesto <= koliko
     order by x.mesto;
end;
$function$;
revoke all on function public.vrh_klubov_drzave(text, integer, boolean, integer) from public;
grant execute on function public.vrh_klubov_drzave(text, integer, boolean, integer) to anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('vrh-klubov', '20 * * * *', $urnik$select public.osvezi_vrh_klubov()$urnik$);
exception
  when others then
    raise notice 'pg_cron ni na voljo (%): vrh klubov se računa sproti.', sqlerrm;
end;
$$;
