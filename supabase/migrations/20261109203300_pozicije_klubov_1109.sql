-- Pozicije, ki so jih klubi sporočili v podpori (HelpStack, do 9. 11. 2026).
-- `admin`, ker jih je potrdil klub: glasovanje in uvoz jih ne prestavita nazaj.
-- Obstoječe fantasy ekipe ostanejo veljavne, ker veljavnost šteje pozicijo ob
-- nakupu (fantasy_roster.buy_position).
--
-- Pogoj na staro pozicijo: če se je vmes kaj spremenilo, vrstice ne povozimo.

-- NK Slavonac 1980 Bukovlje (hr-bp-2znl-istok): član uprave kluba v klepetu 3. 11.
update public.players set position = 'DEF', position_source = 'admin'
 where id = 45323 and full_name = 'Tipurić Renato' and position = 'MID';
update public.players set position = 'DEF', position_source = 'admin'
 where id = 45331 and full_name = 'Dubac Luka' and position = 'MID';
update public.players set position = 'DEF', position_source = 'admin'
 where id = 45328 and full_name = 'Abramović Josip' and position = 'MID';
update public.players set position = 'MID', position_source = 'admin'
 where id = 45329 and full_name = 'Padrić Josip' and position = 'FWD';
update public.players set position = 'MID', position_source = 'admin'
 where id = 45330 and full_name = 'Mijić Marko' and position = 'DEF';
update public.players set position = 'MID', position_source = 'admin'
 where id = 45332 and full_name = 'Jozić Petar' and position = 'FWD';
update public.players set position = 'FWD', position_source = 'admin'
 where id = 45506 and full_name = 'Pavlinović Marko' and position = 'MID';

-- HEPPIX SE Hernádkércs (hu-baz-2-eszak): igralec kluba po e-pošti 24. 10.
-- Oba sta bila vratarja po zapisniku, a nobeden ne brani.
update public.players set position = 'MID', position_source = 'admin'
 where id = 87676 and full_name = 'Mika József' and position = 'GK';
update public.players set position = 'DEF', position_source = 'admin'
 where id = 87673 and full_name = 'Gulyás József' and position = 'GK';

-- FC Zohor (sk-bav-6liga): klub po e-pošti 2. 11. — Roman Horváth zadnjih
-- šest tekem igra v napadu.
update public.players set position = 'FWD', position_source = 'admin'
 where id = 258123 and full_name = 'Horváth Roman' and position = 'DEF';
