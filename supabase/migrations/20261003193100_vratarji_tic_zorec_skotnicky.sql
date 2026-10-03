-- Zadnji trije "vratarji z goli" iz Preverbe podatkov (3. 10.).
--
-- Skripta preveri-vratarje jih ni mogla razsoditi (Ptuj objavi en zapisnik
-- za cel krog; Rašov vpiše tri vratarje). Razsodba iz baze: na tekmah, ki
-- jih je začel, je začel tudi drug vratar njegove ekipe —
--   Tič 43 od 44, Zorec 8 od 12, Skotnický 6 od 6.
-- Pozicija iz polja je najverjetnejša po priorih (FWD 75 %, 58 %, 53 %).
update public.players p
   set position = 'FWD', position_source = 'admin'
 where p.id in (4930, 5298, 17300);  -- Tič Žan, Zorec Timotej, Skotnický Patrik
