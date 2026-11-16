-- SLF-505: Rudar Kakanj - Novi Travnik (tekma 917804, 14. 11. 2026, 9:0).
--
-- Hazim Ganic (451119) ima 1 gol (37.) in po zapisniku/poročilih uporabnikov
-- le 1 asistenco (39. minuta, gol 938056). Še štiri asistence (48., 53., 60.,
-- 65. minuta) je 15. 11. med 14:51 in 14:52 potrdilo glasovanje, ki so ga
-- dosegli trije računi v nekaj sekundah: Hazim Ganic sam in dva računa
-- "Omer Ganić" ter "Majda Ganic", ustvarjena isto jutro. Drugi glasovi na teh
-- golih (Merdić Edvin pri 48., 60. in 65.; Džider Fahrudin pri 53.) ostanejo.
-- Uvoz je pravilen (9 golov, 9 zapisov); napake v uvozu ni.
--
-- Popravek: odstranimo glasove teh treh računov na štirih golih in gole
-- ponovno odpremo za glasovanje. Trigger goals_asistenca_preracun nato
-- preračuna točke kroga. Glas se izbriše prek audit sledi
-- (assist_votes_deleted). Izrecni id-ji in pogoji, da ponovni zagon nič ne spremeni.

do $$
declare
  v_gol    constant bigint[] := array[938057, 938054, 938060, 938058];
  v_racuni constant uuid[]   := array[
    'e0a7ba8b-b7cb-4362-b488-7cd11a9d7184',
    '2f628f03-e67d-46e4-bfed-a7edf59648dd',
    '06aa52e0-db19-4c8c-a667-adc3cc7c7a4c'
  ]::uuid[];
begin
  delete from assist_votes
   where goal_id = any (v_gol)
     and voter_id = any (v_racuni)
     and player_id = 451119;

  update goals
     set assist_player_id = null,
         assist_confirmed_at = null
   where id = any (v_gol)
     and match_id = 917804
     and assist_player_id = 451119;
end;
$$;
