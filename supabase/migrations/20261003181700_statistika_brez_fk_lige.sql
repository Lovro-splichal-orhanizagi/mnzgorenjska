-- statistika_igralcev brez tujega ključa na competitions.
--
-- Tabela je imela ključa na players in competitions, oba v primarnem ključu.
-- PostgREST jo je zato prepoznal kot vezno tabelo (mnogo-proti-mnogo) med
-- igralci in ligami, in vsak `players(... competitions(...))` je padel s
-- PGRST201 "more than one relationship" — obvestilo o popravku pozicij
-- 3. 10. ni steklo.
--
-- Ključ na ligo ni potreben: izbris lige kaskadno izbriše njene igralce in s
-- tem njihovo statistiko (ključ na players ostane).
alter table public.statistika_igralcev
  drop constraint if exists statistika_igralcev_competition_id_fkey;

notify pgrst, 'reload schema';
