-- NK Suhopolje : NK Crnac (Premijer ŽNL Virovitica 2025/26, 23. krog,
-- 9. 5. 2026, semafor.hns.family/utakmice/100982308) ni bila odigrana.
--
-- Crnac je prišel s šestimi igralci, tekma se s manj kot sedmimi ne sme
-- začeti, izid 3:0 je dodeljen. Semafor je vnesel obe postavi, dogodkov
-- ni nobenega, zato je uvoz arhiva tekmo uvozil kot odigrano: 17 nastopov
-- po 90 minut in čista mreža za domače. Preverba podatkov jo javlja vsak
-- dan ("Ekipa z manj kot sedmimi nastopi", Crnac 6).
--
-- Vir hns tako tekmo odslej prepozna kot kontumacijo (`jeKontumacija`,
-- `vZapisnik` vrne null). Tu jo popravimo v obliko, ki jo ima vsaka
-- kontumacija: brez nastopov in zapisnika, izid ostane.
delete from public.appearances
 where match_id = 66768
   and exists (select 1 from public.matches
                where id = 66768 and zapisnik_id = '100982308');

update public.matches
   set kontumacija = true,
       imported_at = null,
       zapisnik_id = null,
       import_warnings = '{}'
 where id = 66768
   and zapisnik_id = '100982308'
   and home_goals = 3 and away_goals = 0;
