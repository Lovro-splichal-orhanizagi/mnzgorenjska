-- SLF-510 (prijava 3): Sekulić Marko (BASK, igralec 227591) ima v profilu dres 13,
-- uradni zapisniki pa ga od 3. 10. 2026 vodijo pod 2. Uvoz po imenu (FSB, MNZ ...)
-- dresa po prvem zapisu ni nikoli osvežil; popravek uvoza je v istem PR-ju.
--
-- Backfill: igralcu brez registrske šifre, ki je edini s tem imenom pri klubu,
-- nastavimo dres iz njegovega najnovejšega nastopa (po datumu tekme, nato po id)
-- za isti klub. Soimenjaki ostanejo, kot so: dres loči osebe pri uvozu. Šifrirani
-- igralci (reg_st) se osvežujejo že pri uvozu. Točk ne spreminja: dres ne vpliva
-- na točkovanje.
-- Na sveži bazi (CI) ni igralcev: migracija ne naredi nič.
with zadnji as (
  select distinct on (a.player_id)
         a.player_id, a.team_id, a.shirt_number
    from public.appearances a
    join public.matches m on m.id = a.match_id
    join public.rounds rr on rr.id = m.round_id
   where a.shirt_number is not null
   order by a.player_id, coalesce(m.played_on, rr.played_on) desc nulls last, a.id desc
)
update public.players p
   set shirt_number = z.shirt_number
  from zadnji z
 where z.player_id = p.id
   and z.team_id = p.team_id
   and p.reg_st is null
   and p.shirt_number is distinct from z.shirt_number
   and not exists (
     select 1 from public.players s
      where s.competition_id = p.competition_id
        and s.team_id = p.team_id
        and s.full_name = p.full_name
        and s.id <> p.id);
