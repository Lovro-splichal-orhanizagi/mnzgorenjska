-- `vrh_klubov_drzave`: najboljši klubi države — seštevek točk vseh igralcev
-- kluba iz vseh aktivnih lig države v tekoči sezoni (zavihek Klubi državne
-- lestvice). Klub je `teams`, skupen članom in mladincem, zato se selekciji
-- seštejeta.
--
-- Točke so brez asistenc, kot pri `vrh_drzave`: asistence potrdi glasovanje,
-- ki v večini lig še ne teče. Igralec šteje pri klubu, za katerega igra zdaj
-- (`players.team_id`); statistika po klubih ni ločena.
--
-- `statistika_igralcev` je vlogam anon/authenticated zaprta, zato funkcija
-- teče s pravicami lastnika; vrne le javne seštevke.
create or replace function public.vrh_klubov_drzave(p_drzava text, p_koliko integer default 50)
returns table(mesto integer, team_id bigint, team_name text, team_short text, team_logo text,
              tocke numeric, goli integer, igralcev integer, lige text, season text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with lige as (
    select c.id, c.short_name
      from competitions c
      join countries d on d.id = c.country_id
     where c.active and d.code = p_drzava
  ),
  sezona as (
    select max(r.season) as s
      from rounds r
      join lige l on l.id = r.competition_id
  ),
  klubi as (
    select p.team_id,
           sum(s.points - 3 * s.assists)::numeric as tocke,
           sum(s.goals)::int as goli,
           count(*)::int as igralcev,
           string_agg(distinct l.short_name, ' · ') as lige
      from statistika_igralcev s
      join lige l on l.id = s.competition_id
      join players p on p.id = s.player_id
     where s.season = (select s from sezona)
       and p.team_id is not null
       and s.matches > 0
     group by p.team_id
  ),
  razvrsceni as (
    select k.*, row_number() over (order by k.tocke desc, k.goli desc, k.team_id) as mesto
      from klubi k
  )
  select x.mesto::int, t.id, t.name, t.short_name, t.logo_url,
         x.tocke, x.goli, x.igralcev, x.lige, (select s from sezona)
    from razvrsceni x
    join teams t on t.id = x.team_id
   where x.mesto <= least(greatest(coalesce(p_koliko, 50), 1), 500)
   order by x.mesto;
$function$;

revoke all on function public.vrh_klubov_drzave(text, integer) from public;
grant execute on function public.vrh_klubov_drzave(text, integer) to anon, authenticated;
