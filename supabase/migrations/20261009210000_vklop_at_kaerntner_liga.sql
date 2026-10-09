-- Vklop Kärntner Liga (at-k-kaerntner-liga). Uvoz arhiva 2024/25 + 2025/26 in
-- tekoče sezone (delovni tok Uvoz lige, 9. 10. 2026): 553 aktivnih igralcev,
-- 42.1 % na privzeti ceni, vrh 11.5, 16 klubov, 2596 nastopov s klopi, 0 golov
-- brez nastopa; goli = izidi v vseh treh sezonah.
--
-- Avstrija gre v živo pred odgovorom ÖFB (odločitev lastnika); če ÖFB
-- prepove, lige izklopimo (glej CLAUDE.md, Avstrija).
--
-- Prvi fantasy krog = prvi krog za zadnjim krogom z zapisniki, ki ima rok še
-- pred sabo. Krog 11 je ob vklopu že zaprt (rok 9. 10. 10:00 UTC, tekme še
-- tečejo), zato šteje od 12.: začetna cena vsebuje kroge 1–10, borza kroga 11
-- ne obračuna (en krog premika manj, nič dvojnega štetja).
update public.competitions c
   set prvi_fantasy_krog = n.krog,
       active = true
  from (
    select z.competition_id,
           (select min(r.number) from public.rounds r
             where r.competition_id = z.competition_id
               and r.season = '2026/27'
               and r.number > z.zadnji
               and r.deadline_at > now()) as krog
      from (
        select r.competition_id, max(r.number) as zadnji
          from public.rounds r
         where r.season = '2026/27'
           and exists (select 1 from public.matches m
                        join public.appearances a on a.match_id = m.id
                       where m.round_id = r.id)
         group by r.competition_id
      ) z
  ) n
 where n.competition_id = c.id
   and n.krog is not null
   and not c.active
   and c.slug = 'at-k-kaerntner-liga';
