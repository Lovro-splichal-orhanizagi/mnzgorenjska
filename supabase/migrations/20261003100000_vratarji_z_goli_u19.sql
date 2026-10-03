-- Vratarji z goli po uvozu slovaških mladinskih lig (Preverba podatkov 3. 10.).
--
-- Razsodba: `node scripts/preveri-vratarje.mjs --goli 5`, ki prebere vse
-- zapisnike tekem, ki jih je igralec začel.
--
-- LAZEN — več zapisnikov ga ima v polju kot na golu: pozicija iz polja.
-- Maslák (Čierny Balog, U19): 10 golov na 5 tekmah, 3 zapisniki ga imajo na
-- golu, 2 v napadu; kot vratar bi bil vsak gol vreden več kot napadalcu, zato
-- napad. Sládek (Banská Štiavnica, U19): 17 zapisnikov na golu, je vratar.
--
-- position_source = 'admin': glasovanje in uvoz pozicije ne spreminjata več
-- (20261001: oznaka (V) prekrsti le neznano ali ugibano pozicijo).
-- Neodločeni ostanejo za ročni pregled: Skotnický (Rašov, same dvoumne
-- oznake), Tič in Zorec (Ptuj, zapisnik kroga skripta ne bere).
update public.players p
   set position = v.pozicija, position_source = 'admin'
  from (values
    (21465, 'DEF'),  -- Auxt Michal, TJ Partizán Dolná Lehota
    (30165, 'MID'),  -- Bohušík Šimon, MŠK Kysucké Nové Mesto
    (30050, 'DEF'),  -- Hollý Sebastián, OFK Hôrky
    (33068, 'DEF'),  -- Gontko Valerián, TJ Družstevník Belá - Dulice
    (30733, 'DEF'),  -- Šefara Patrik, FK Rajec
    (30704, 'MID'),  -- Pakos Timotej, TJ Sokol Liesek
    (32357, 'FWD'),  -- Rybák Jakub, 1. OFC Liptovské Sliače
    (31298, 'FWD'),  -- Maslák Richard, ŠK Partizán Čierny Balog
    (31117, 'GK')    -- Sládek Benjamín Lukáš, FK Sitno Banská Štiavnica
  ) as v(id, pozicija)
 where p.id = v.id;
