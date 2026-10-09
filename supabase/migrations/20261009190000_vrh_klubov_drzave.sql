-- `vrh_klubov_drzave`: najboljše klubske ekipe države — seštevek točk, ki so
-- jih igralci zbrali ZA ekipo v tekoči sezoni (zavihek Klubi državne
-- lestvice). Ekipa je klub v eni ligi: člani in mladinci istega kluba sta dve
-- vrstici.
--
-- Točke krogov se pripišejo klubu, za katerega je igralec v tistem krogu
-- nastopil (`appearances.team_id`), ne klubu, kjer je zdaj: kdor prestopi,
-- pri novem klubu začne z nič, njegove točke pa ostanejo staremu. Osnova je
-- `player_scores` (točke igralca v krogu, že izračunane), ne pogled
-- `appearance_points`, ki bi za vso državo računal vsak nastop sproti.
--
-- Točke so brez asistenc, kot pri `vrh_drzave`: asistence potrdi glasovanje,
-- ki v večini lig še ne teče, zato se odšteje 3 × asistence kroga.
--
-- Krogi so uvožene tekme ekipe v sezoni; `p_na_krog` razvrsti po točkah na
-- krog in izpusti ekipe z manj kot `p_najmanj_krogov` (kot državna lestvica
-- ekip: dva dobra kroga nista sezona).
--
-- `player_scores` in nastopi so vlogam anon/authenticated zaprti ali
-- omejeni, zato funkcija teče s pravicami lastnika; vrne le javne seštevke.
create or replace function public.vrh_klubov_drzave(
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

revoke all on function public.vrh_klubov_drzave(text, integer, boolean, integer) from public;
grant execute on function public.vrh_klubov_drzave(text, integer, boolean, integer) to anon, authenticated;
