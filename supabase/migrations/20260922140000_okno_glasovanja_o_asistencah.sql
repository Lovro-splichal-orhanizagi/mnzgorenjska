-- Glasovanje o asistenci se zapre z naslednjim krogom.
--
-- Doslej je bilo odprto vecno. Zapisnik asistenc ne objavi, zato jih pove
-- skupnost — a spomin na to, kdo je podal, traja teden, ne leto. Posledica je
-- bila kopica, ki raste hitreje, kot se prazni: v 1. SML 1919 golov brez
-- asistence, v 2. SNL 1514. Znacka v glavi je zato kazala stevilko, ki je
-- nihce ni mogel spraviti na nic, in je nehala biti opomnik.
--
-- Odslej: goli kroga so odprti do roka NASLEDNJEGA kroga iste sezone.
-- Kdor je tekmo videl, ima teden dni casa; potem gol ostane brez asistence.
--
-- Dve varovalki:
--   * ce naslednjega kroga se ni v razporedu, ostane odprto — liga na koncu
--     sezone ali pred objavo razporeda ne sme tiho zapreti glasovanja;
--   * vsaj tri dni od uvoza zapisnika, ker zapisnik vcasih pride pozno in bi
--     bil gol sicer zaprt, se preden se je pokazal.
--
-- Zaprt gol ni "brez asistence" — je samo neodlocen. Zato `assist_none_
-- confirmed_at` ostane prazen; zapremo le glasovanje.

create or replace function public.asistence_odprte_do(p_match_id bigint)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
           when naslednji.rok is null then null   -- se ni naslednjega kroga
           else greatest(naslednji.rok, m.imported_at + interval '3 days')
         end
    from matches m
    join rounds r on r.id = m.round_id
    left join lateral (
      select min(r2.deadline_at) as rok
        from rounds r2
       where r2.competition_id = r.competition_id
         and r2.season = r.season
         and r2.number > r.number
         and r2.deadline_at is not null
    ) naslednji on true
   where m.id = p_match_id;
$$;

comment on function public.asistence_odprte_do(bigint) is
  'Do kdaj se sme glasovati o asistencah te tekme. NULL = se ni naslednjega '
  'kroga, torej odprto.';

create or replace function public.asistenca_odprta(p_goal_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(asistence_odprte_do(g.match_id) > now(), true)
    from goals g
   where g.id = p_goal_id;
$$;

revoke all on function public.asistence_odprte_do(bigint) from public;
revoke all on function public.asistenca_odprta(bigint) from public;
grant execute on function public.asistence_odprte_do(bigint)
  to anon, authenticated, service_role;
grant execute on function public.asistenca_odprta(bigint)
  to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Glas po zaprtju ne gre vec noter
-- --------------------------------------------------------------------------
drop policy if exists "oddaj glas o asistenci" on assist_votes;
create policy "oddaj glas o asistenci" on assist_votes for insert
  with check (auth.uid() = voter_id and asistenca_odprta(goal_id));

drop policy if exists "spremeni svoj glas o asistenci" on assist_votes;
create policy "spremeni svoj glas o asistenci" on assist_votes for update
  using (auth.uid() = voter_id and asistenca_odprta(goal_id))
  with check (auth.uid() = voter_id and asistenca_odprta(goal_id));

-- --------------------------------------------------------------------------
-- Pogled pove, ali je tekma se odprta in koliko golov v njej se caka
-- --------------------------------------------------------------------------
create or replace view match_assist_status as
select
  m.id as match_id,
  m.round_id,
  r.season,
  r.number as round_number,
  m.played_on,
  h.name as home_name,
  h.short_name as home_short,
  h.logo_url as home_logo,
  a.name as away_name,
  a.short_name as away_short,
  a.logo_url as away_logo,
  m.home_goals,
  m.away_goals,
  count(g.id) filter (where not g.is_own_goal) as golov,
  count(g.id) filter (
    where not g.is_own_goal
      and not g.is_penalty
      and g.assist_player_id is null
      and g.assist_none_confirmed_at is null
  ) as brez_asistence,
  m.home_team_id,
  m.away_team_id,
  r.competition_id,
  asistence_odprte_do(m.id) as glasovanje_do,
  coalesce(asistence_odprte_do(m.id) > now(), true) as glasovanje_odprto
from matches m
join rounds r on r.id = m.round_id
join teams h on h.id = m.home_team_id
join teams a on a.id = m.away_team_id
left join goals g on g.match_id = m.id
where m.imported_at is not null
group by m.id, m.round_id, r.season, r.number, m.played_on,
         h.name, h.short_name, h.logo_url,
         a.name, a.short_name, a.logo_url,
         m.home_goals, m.away_goals, m.home_team_id, m.away_team_id,
         r.competition_id;
