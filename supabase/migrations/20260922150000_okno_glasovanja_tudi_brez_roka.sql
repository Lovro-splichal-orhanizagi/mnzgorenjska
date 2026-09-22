-- Okno glasovanja o asistencah tudi tam, kjer roka ni.
--
-- Prvi poskus (20260922140000) je iskal rok NASLEDNJEGA kroga. Arhivske
-- sezone rokov nimajo — uvozene so iz zapisnikov, ne iz razporeda s
-- fantasy rokom — zato je bil `rok` vedno NULL in glasovanje je ostalo
-- odprto za vse. Stevilka se ni premaknila: 1919 golov v 1. SML pred in po.
--
-- Vsak krog pa ima `played_on`. Naslednji krog torej dolocimo po prvem od
-- obojega, kar je znano: rok, sicer datum igranja. In ce naslednjega kroga
-- v sezoni ni, a v ligi obstaja NOVEJSA sezona, je sezona koncana in
-- glasovanje zaprto — sicer bi zadnji krog vsake sezone ostal odprt za vedno.

create or replace function public.asistence_odprte_do(p_match_id bigint)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
           -- Naslednji krog iste sezone: konec okna.
           when naslednji.cas is not null
             then greatest(naslednji.cas, m.imported_at + interval '3 days')
           -- Naslednjega kroga ni, a liga je ze v novi sezoni: sezona je
           -- koncana, glasovanje zaprto.
           when novejsa.obstaja
             then m.imported_at + interval '3 days'
           -- Tekoca sezona, naslednji krog se ni na sporedu: odprto.
           else null
         end
    from matches m
    join rounds r on r.id = m.round_id
    left join lateral (
      select min(coalesce(r2.deadline_at, r2.played_on::timestamptz)) as cas
        from rounds r2
       where r2.competition_id = r.competition_id
         and r2.season = r.season
         and r2.number > r.number
         and coalesce(r2.deadline_at, r2.played_on::timestamptz) is not null
    ) naslednji on true
    left join lateral (
      select exists (
        select 1 from rounds r3
         where r3.competition_id = r.competition_id
           and r3.season > r.season
      ) as obstaja
    ) novejsa on true
   where m.id = p_match_id;
$$;

revoke all on function public.asistence_odprte_do(bigint) from public;
grant execute on function public.asistence_odprte_do(bigint)
  to anon, authenticated, service_role;
