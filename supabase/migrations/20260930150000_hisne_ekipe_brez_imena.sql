-- Hišne ekipe brez imena lastnika. "SLFF" je v lestvici izstopal; lastnik
-- hišne ekipe se zdaj ne izpiše (prazen niz — `display_name` je obvezen).
-- Vmesnik pri praznem imenu izpusti vodilno piko.
update public.profiles p
   set display_name = ''
 where p.id in (select distinct owner_id from public.fantasy_teams where hisna)
   and p.display_name <> '';
