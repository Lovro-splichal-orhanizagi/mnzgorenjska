-- SLF-383: suhi tek promocije še vedno obstane pri kohorti (30 s) tudi po
-- 20261114220000. `je_mladinski_slug` ima `set search_path`, zato je planer ne
-- more vstaviti v poizvedbo: v `izlozba_odrasla_oseba` se kliče kot prava
-- funkcija za vsako tekmovanje države (do 303), dvakrat na prevzem, ob vsakem
-- klicu pa se nastavi in povrne search_path (~550.000 klicev za 913 prevzemov).
-- Isto poizvedbo z vstavljenim regexom sem na produkciji (bralni dostop) izmeril
-- v ~1 s. Funkcija uporablja le `~` in `coalesce` iz pg_catalog in ne bere
-- tabel, zato search_path ni potreben. Pravilo ostane enako.
alter function public.je_mladinski_slug(text) reset search_path;
