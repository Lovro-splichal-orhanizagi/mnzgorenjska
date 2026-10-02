-- `vrh_drzave` iz tabele statistika_igralcev.
--
-- Funkcija je ob vsakem klicu seštela vse nastope, točke krogov in asistence
-- tekoče sezone vseh lig države (~2,5 s; 20261002 med najdražjimi klici).
-- Isto že hrani `statistika_igralcev` (20261002120000): tekme, minute,
-- goli, čiste mreže, točke in asistence po igralcu, ligi in sezoni.
--
-- Točke so brez asistenc, kakor doslej: asistenca je vredna 3 točke na
-- vsaki poziciji, zato se odšteje 3 × asistence.
--
-- Tabela je vlogam anon/authenticated zaprta, zato funkcija teče s pravicami
-- lastnika; vrne le javne podatke (imena, klube, seštevke), kot prej.
create or replace function public.vrh_drzave(p_drzava text, p_koliko integer default 10)
returns table(kategorija text, mesto integer, player_id bigint, full_name text, "position" text,
              team_name text, team_short text, team_logo text, competition_slug text,
              competition_short text, vrednost numeric, minutes integer, tekem integer, season text)
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
  stat as (
    select s.player_id, s.matches as tekem, s.minutes, s.goals as goli,
           s.clean_sheets as ciste_mreze,
           s.points - 3 * s.assists as tocke
      from statistika_igralcev s
      join lige l on l.id = s.competition_id
     where s.season = (select s from sezona)
  ),
  kategorije as (
    select 'tocke' as kategorija, s.player_id, s.tekem, s.minutes, s.tocke::numeric as vrednost from stat s
    union all
    select 'goli', s.player_id, s.tekem, s.minutes, s.goli from stat s
    union all
    -- čista mreža je dosežek vratarja; branilci jo imajo le zraven
    select 'ciste_mreze', s.player_id, s.tekem, s.minutes, s.ciste_mreze
      from stat s join players p on p.id = s.player_id
     where p.position = 'GK'
  ),
  razvrsceni as (
    select k.*,
           -- enako kot na naslovnici: ob izenačenju odloča več minut
           row_number() over (partition by k.kategorija
                              order by k.vrednost desc, k.minutes desc, k.player_id) as mesto
      from kategorije k
     where k.vrednost > 0
  )
  select x.kategorija, x.mesto::int, p.id, p.full_name, p.position,
         t.name, t.short_name, t.logo_url,
         l.slug, l.short_name,
         x.vrednost, x.minutes, x.tekem, (select s from sezona)
    from razvrsceni x
    join players p on p.id = x.player_id
    join lige l on l.id = p.competition_id
    left join teams t on t.id = p.team_id
   where x.mesto <= least(greatest(coalesce(p_koliko, 10), 1), 50)
   order by x.kategorija, x.mesto;
$function$;

revoke all on function public.vrh_drzave(text, integer) from public;
grant execute on function public.vrh_drzave(text, integer) to anon, authenticated;
