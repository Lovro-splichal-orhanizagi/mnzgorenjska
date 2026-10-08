-- Vklop Hrvaške: prvi val, 14 lig severozahoda z arhivom 2025/26 in
-- popolnimi zapisniki (pregled 7. 10. 2026, ponovni uvoz 8. 10.).
--
-- Vklop sredi sezone: `prvi_fantasy_krog` je naslednji krog z rokom v
-- prihodnosti, da borza starejših krogov ne obračuna (začetna cena jih že
-- vsebuje) in da ekipa ne dobi točk za odigrane kroge. Izračunan je ob
-- uveljavitvi, ne vpisan na roko.
--
-- Ostanejo izklopljene: 1. ŽNL Karlovac (zapisnikov na Semafor ni),
-- ŽNS Zagreb 2. liga (menjave niso vpisane) in ostalih 66 lig do drugega vala.
update public.competitions c
   set prvi_fantasy_krog = n.krog,
       active = true
  from (
    select r.competition_id, min(r.number) as krog
      from public.rounds r
     where r.season = '2026/27' and r.deadline_at > now()
     group by r.competition_id
  ) n
 where n.competition_id = c.id
   and c.slug in (
     'hr-3nl-centar', 'hr-3nl-sjever', 'hr-3nl-zapad',
     'hr-mz-premier', 'hr-mz-1mnl', 'hr-mz-2mnl', 'hr-mz-3mnl-a', 'hr-mz-3mnl-b',
     'hr-vz-elitna', 'hr-vz-1znl', 'hr-kz-2-znl-kzz', 'hr-is-elitna',
     'hr-ri-4nl', 'hr-kc-elitna'
   )
   and not c.active;
