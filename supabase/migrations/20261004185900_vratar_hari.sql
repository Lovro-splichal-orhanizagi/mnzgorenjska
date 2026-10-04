-- "Vratar z goli" iz Preverbe podatkov (4. 10.): Hari Tadej (MLINOPEK
-- Križevci, ms-clani), 7 golov v 27 nastopih.
--
-- Igra s številko 13 (23 nastopov); na štirih tekmah je nosil 1 in zapisnik
-- ga je označil z (V), uvoz pa ga je prekrstil v vratarja. Lastnik ekipe ga
-- je kupil kot napadalca (`buy_position` FWD) — vrnemo ga tja in zaklenemo,
-- da ga naslednja (V) ne prekrsti znova.
update public.players
   set position = 'FWD', position_source = 'admin'
 where id = 5836;  -- Hari Tadej
