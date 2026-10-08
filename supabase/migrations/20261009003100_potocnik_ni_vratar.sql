-- Potočnik Mario (mb-u19, id 12246) je vratar po eni oznaki (V) v zapisniku,
-- na golu je bil 1 od 24 tekem in je dal 12 golov. Preverba podatkov ga javlja
-- vsak dan ("vratar z vsaj 5 goli"). Uskladi pozicije za vir MNZ ne dela, zato
-- ga popravimo tu; position_source = admin, da ga uvoz ne povozi.
update public.players
   set position = 'FWD', position_source = 'admin'
 where id = 12246 and position = 'GK' and full_name = 'Potočnik Mario';
