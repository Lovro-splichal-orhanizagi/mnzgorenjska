-- Vklop 2. ŽNL Zadar (hr-zd-2-znl). V drugem valu je ostala izklopljena, ker
-- ni imela arhiva (87 % igralcev na privzeti ceni). Po uvozu sezone 2025/26
-- (Semafor 111414091) ima privzetih 51.8 %, vrh 12, 548 nastopov s klopi.
-- Prvi fantasy krog = krog za zadnjim krogom z zapisniki, kot v drugem valu.
update public.competitions c
   set prvi_fantasy_krog = n.krog,
       active = true
  from (
    select z.competition_id, z.zadnji + 1 as krog
      from (
        select r.competition_id, max(r.number) as zadnji
          from public.rounds r
         where r.season = '2026/27'
           and exists (select 1 from public.matches m
                        join public.appearances a on a.match_id = m.id
                       where m.round_id = r.id)
         group by r.competition_id
      ) z
     where exists (select 1 from public.rounds r
                    where r.competition_id = z.competition_id
                      and r.season = '2026/27'
                      and r.number = z.zadnji + 1
                      and r.deadline_at > now())
  ) n
 where n.competition_id = c.id
   and not c.active
   and c.slug = 'hr-zd-2-znl';
