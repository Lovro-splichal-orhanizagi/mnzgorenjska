-- Napovedi v mini ligi le za njene lige.
--
-- `moje_odprte_napovedi()` vrne tekme vseh lig, v katerih ima klicatelj
-- ekipo; obrazec v mini ligi je zato pri igralcu z več ekipami pokazal
-- desetine lig, čeprav mu v tej mini ligi šteje le liga ekipe, s katero je
-- član (`clani_napovedi_mini_lige`). `p_mini_liga` obseg zoži na lige
-- klicateljevih ekip v tej mini ligi. Napoved ostane ena na tekmo.

drop function if exists public.moje_odprte_napovedi(bigint);

create function public.moje_odprte_napovedi(p_tekmovanje bigint default null, p_mini_liga bigint default null)
returns table (
  competition_id bigint, competition_short text, round_id bigint, krog int, rok timestamptz,
  match_id bigint, played_on date,
  home_name text, home_short text, home_logo text,
  away_name text, away_short text, away_logo text,
  napoved_doma int, napoved_gostje int
)
language sql stable
set search_path = public
as $$
  select ft.competition_id, k.short_name, nk.id, nk.number, rok_napovedi(nk.id),
         m.id, m.played_on,
         h.name, h.short_name, h.logo_url,
         a.name, a.short_name, a.logo_url,
         n.home_goals, n.away_goals
    from (select distinct f.competition_id from fantasy_teams f
           where f.owner_id = auth.uid() and not f.hisna
             and (p_tekmovanje is null or f.competition_id = p_tekmovanje)
             and (p_mini_liga is null or exists (
                   select 1 from mini_liga_clani c
                    where c.mini_liga_id = p_mini_liga and c.fantasy_team_id = f.id))) ft
    join competitions_view k on k.id = ft.competition_id
    join naslednji_krog nk on nk.competition_id = ft.competition_id
    join matches m on m.round_id = nk.id
    join teams h on h.id = m.home_team_id
    join teams a on a.id = m.away_team_id
    left join napovedi n on n.match_id = m.id and n.user_id = auth.uid()
   where not izid_znan(m.imported_at, m.statistics_status) and not m.kontumacija
     and rok_napovedi(nk.id) > now()
   order by ft.competition_id, m.played_on nulls last, m.id
$$;

revoke all on function public.moje_odprte_napovedi(bigint, bigint) from public, anon;
grant execute on function public.moje_odprte_napovedi(bigint, bigint) to authenticated;
