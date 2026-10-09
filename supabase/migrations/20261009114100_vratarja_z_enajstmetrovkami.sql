-- Dva prava vratarja, ki streljata enajstmetrovke. Preverba podatkov ju
-- javlja vsak dan ("vratar z vsaj 5 goli"); pravega vratarja potrdi admin
-- (position_source = admin) in javljanje utihne.
--
-- Harambaša Denis (NK Struga, hr-vz-3znl-ludbreg, id 54796): 9 golov, vseh
--   9 z enajstih metrov; na vseh 5 tekmah z oznako vratarja na tekmi
--   (uvožene po 7. 10. 2026) je vratar.
-- Klemenčić Roko (NK Samobor, hr-3nl-centar, id 39364): 6 golov, vseh 6 z
--   enajstih metrov; vratar na 29 od 30 tekem.
update public.players
   set position = 'GK', position_source = 'admin'
 where (id = 54796 and full_name = 'Harambaša Denis')
    or (id = 39364 and full_name = 'Klemenčić Roko');
