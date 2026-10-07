-- OFK Želovce (sk-vk-7liga): predsednik kluba (e-pošta 7. 10. 2026) sporoča,
-- da je Ádám Erik vezist, ne vratar. Na nobeni od petih tekem ni bil na golu.
-- `admin`, ker je to potrdil klub — glasovanje ga ne prestavi nazaj.
-- Ljudje ga nimajo, dve hišni ekipi ga imata: ostaneta veljavni, ker
-- veljavnost šteje pozicijo ob nakupu (fantasy_roster.buy_position).
update public.players
   set position = 'MID', position_source = 'admin'
 where id = 24533 and position = 'GK';
