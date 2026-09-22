-- Okno glasovanja meri po datumu tekme, ne po uvozu.
--
-- `imported_at` se je zdel dober zacetek okna, a ga uvoz ob vsakem zagonu
-- postavi na zdaj: do vcerajsnjega `--sveze 21` se je vsak zapisnik uvozil
-- vsako noc znova. Trije dnevi od uvoza so bili zato vedno v prihodnosti in
-- nic se ni zaprlo — v clanski ligi so bili odprti vsi stirje krogi sezone,
-- tudi prvi, odigran 29. avgusta.
--
-- `played_on` je datum tekme in se ne premika. Okno je torej:
--
--   odprto do naslednjega kroga iste sezone (rok, sicer datum igranja),
--   a vsaj pet dni od tekme same.
--
-- Pet dni je tam zaradi prestavljenih tekem: tekma 2. kroga, odigrana mesec
-- pozneje, bi sicer prisla v bazo ze zaprta.
--
-- Koncana sezona (obstaja novejsa) nima okna: zapre jo naslednji krog, pri
-- zadnjem pa datum tekme.

create or replace function public.asistence_odprte_do(p_match_id bigint)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
           when novejsa.obstaja
             then coalesce(naslednji.cas, m.played_on::timestamptz)
           when naslednji.cas is not null
             then greatest(naslednji.cas, m.played_on + interval '5 days')
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
