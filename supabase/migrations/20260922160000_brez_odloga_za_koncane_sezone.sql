-- Trije dnevi od uvoza veljajo samo za tekočo sezono.
--
-- Odlog obstaja zato, ker zapisnik včasih pride pozno in gol ne sme biti
-- zaprt, preden se je sploh pokazal. Pri arhivski sezoni pa ta premislek ne
-- velja: cela sezona pride naenkrat ob postavitvi lige in odlog je pomenil,
-- da se je ob vsaki novi ligi za tri dni odprlo glasovanje o dveh tisoč
-- lanskih golih. Mladinske lige, uvožene včeraj, so tako imele 1919 odprtih
-- golov — natanko številka, ki naj bi je ne bilo več.
--
-- Končana sezona (obstaja novejša) se zapre z naslednjim krogom, brez odloga.

create or replace function public.asistence_odprte_do(p_match_id bigint)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
           -- Sezona je končana: zapre jo naslednji krog, pri zadnjem uvoz.
           when novejsa.obstaja
             then coalesce(naslednji.cas, m.imported_at)
           -- Tekoča sezona: naslednji krog, a vsaj tri dni od uvoza.
           when naslednji.cas is not null
             then greatest(naslednji.cas, m.imported_at + interval '3 days')
           -- Naslednjega kroga še ni na sporedu: odprto.
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
