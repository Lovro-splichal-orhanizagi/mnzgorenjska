-- 1. ŽNL Koprivnica (Elitna): vklop je prvi fantasy krog postavil na 5.
-- Krog 5 je bil odigran 19.–20. 9.; ena tekma je prestavljena na 31. 10. in
-- uvoz razporeda je rok vsega kroga premaknil tja. Pravilo "najnižji krog z
-- rokom v prihodnosti" je zato izbralo krog 5, čeprav sta 6 in 7 že odigrana:
-- točke in borza bi štele odigrane kroge. Prvi pravi naslednji krog je 8.
update public.competitions
   set prvi_fantasy_krog = 8
 where slug = 'hr-kc-elitna' and prvi_fantasy_krog = 5;
