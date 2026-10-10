-- Lestvica prave lige (stran /table): izračun iz izidov tekem sezone.
--
-- Zveze objavijo svojo lestvico, a ljudje iščejo "1. GNL lestvica" in
-- "Kärntner Liga Tabelle" — SLFF je imel le fantasy lestvico. Tu se sešteje
-- iz `matches`: odigrana tekma ima zapisnik (`imported_at`), kontumacija
-- šteje z dodeljenim izidom. Točke 3/1/0, vrstni red točke → gol razlika →
-- dani goli → ime. Pravila ob enakem številu točk (medsebojne tekme) in
-- odvzete točke so pri zvezah različna, zato je to približek; stran to pove.
--
-- Klubi brez odigrane tekme (začetek sezone) so v lestvici z ničlami, ker
-- jih pozna razpored (`matches` brez izida).
--
-- Sezona: privzeto zadnja s kakšno odigrano tekmo; pred prvo tekmo nove
-- sezone stran tako pokaže končno lestvico prejšnje (stolpec `sezona`).
--
-- security invoker: bere le javno berljive tabele (teams, rounds, matches),
-- nič ne piše.
create or replace function public.lestvica_lige(p_competition_id bigint, p_sezona text default null)
returns table (
  mesto int,
  team_id bigint,
  ime text,
  kratko text,
  grb text,
  tekme int,
  zmage int,
  remiji int,
  porazi int,
  dani int,
  prejeti int,
  razlika int,
  tocke int,
  forma text,
  sezona text
)
language sql
stable
security invoker
set search_path = public
as $$
  with sz as (
    select coalesce(
      p_sezona,
      (select max(r.season) from rounds r join matches m on m.round_id = r.id
        where r.competition_id = p_competition_id
          and (m.imported_at is not null or m.kontumacija)),
      tekoca_sezona()
    ) as season
  ),
  tekme_sezone as (
    select m.*, (m.imported_at is not null or m.kontumacija) as odigrana
      from matches m
      join rounds r on r.id = m.round_id
     where r.competition_id = p_competition_id
       and r.season = (select season from sz)
  ),
  -- Ena vrstica na klub na tekmo, z vidika tega kluba.
  izidi as (
    select home_team_id as team_id, home_goals as za, away_goals as proti,
           played_on, id, odigrana
      from tekme_sezone
    union all
    select away_team_id, away_goals, home_goals, played_on, id, odigrana
      from tekme_sezone
  ),
  odigrane as (
    select i.*,
           case when za > proti then 'W' when za = proti then 'D' else 'L' end as izid,
           row_number() over (partition by team_id order by played_on desc nulls last, id desc) as od_zadaj
      from izidi i
     where odigrana
  ),
  sestevek as (
    select k.team_id,
           count(o.id)::int as tekme,
           count(*) filter (where o.izid = 'W')::int as zmage,
           count(*) filter (where o.izid = 'D')::int as remiji,
           count(*) filter (where o.izid = 'L')::int as porazi,
           coalesce(sum(o.za), 0)::int as dani,
           coalesce(sum(o.proti), 0)::int as prejeti,
           -- Zadnjih pet, od najstarejše do zadnje.
           coalesce(string_agg(o.izid, '' order by o.od_zadaj desc)
                      filter (where o.od_zadaj <= 5), '') as forma
      from (select distinct team_id from izidi) k
      left join odigrane o on o.team_id = k.team_id
     group by k.team_id
  )
  select (row_number() over (
            order by s.zmage * 3 + s.remiji desc, s.dani - s.prejeti desc, s.dani desc, t.name
          ))::int as mesto,
         s.team_id, t.name, t.short_name, t.logo_url,
         s.tekme, s.zmage, s.remiji, s.porazi, s.dani, s.prejeti,
         s.dani - s.prejeti as razlika,
         s.zmage * 3 + s.remiji as tocke,
         s.forma,
         (select season from sz)
    from sestevek s
    join teams t on t.id = s.team_id
   order by mesto;
$$;

revoke all on function public.lestvica_lige(bigint, text) from public;
grant execute on function public.lestvica_lige(bigint, text) to anon, authenticated;

-- Obisk strani /table (src/lib/obiski.ts): ime 'tabela' mora biti na seznamu.
create or replace function public.zabelezi_obisk(p_stran text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ustvarjen timestamptz;
  v_skupina text;
begin
  if p_stran not in (
    'domov', 'vstop_drzave', 'moja_ekipa', 'igralci', 'igralec', 'lestvica',
    'slovenija', 'mini_lige', 'vstop_v_mini_ligo', 'ekipa', 'klub', 'rezultati',
    'tekma', 'glasovanje', 'pozicije', 'odsotnosti', 'racun', 'opomniki',
    'pravno', 'prijava', 'potrditev', 'tabela'
  ) then
    return;
  end if;

  -- Neprijavljen nima vrstice; `auth.uid()` je takrat null.
  select created_at into v_ustvarjen from auth.users where id = auth.uid();

  v_skupina := case
    when v_ustvarjen is null then 'neprijavljen'
    when v_ustvarjen > now() - interval '7 days' then 'nov'
    else 'star'
  end;

  insert into obiski_dnevno (dan, stran, skupina, stevilo)
  values (current_date, p_stran, v_skupina, 1)
  on conflict (dan, stran, skupina) do update
    set stevilo = obiski_dnevno.stevilo + 1;
end;
$$;

revoke all on function public.zabelezi_obisk(text) from public;
grant execute on function public.zabelezi_obisk(text) to anon, authenticated;
