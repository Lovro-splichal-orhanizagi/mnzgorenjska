-- Preverba podatkov 7. 10. 2026.
--
-- 1. ng-primorska 26/27: zveza je Bistrcu in Jadranu zamenjala domačina v 5. in
--    18. krogu. Uvoz razporeda je vpisal obrnjena para (28099 v 5. krogu je
--    odigrana in uvožena, 2:0; 28100 v 18.), stara sta ostala, ker noben krog
--    ni štel za polnega (glej uvoz-razporeda.mjs). Brišemo le neodigrano tekmo
--    brez zapisnika in nastopov.
delete from public.matches m
 where m.id in (3781, 3859)
   and m.zapisnik_id is null
   and m.imported_at is null
   and not exists (select 1 from public.appearances a where a.match_id = m.id);

-- 2. mb-u19: Potočnik Mario (RoHo Krovstvo TiT) je GK iz zapisnika, a na
--    nobeni od 24 tekem ni bil vratar in je dal 12 golov. Nihče ga nima v
--    ekipi. `ugibanje`, ne `admin`: napadalec je ugib, glasovanje ga sme popraviti.
update public.players
   set position = 'FWD', position_source = 'ugibanje'
 where id = 12246 and position = 'GK';
