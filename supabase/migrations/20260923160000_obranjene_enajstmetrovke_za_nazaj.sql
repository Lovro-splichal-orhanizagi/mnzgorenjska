-- Obranjene enajstmetrovke za nazaj.
--
-- `pripisi_obranjene_enajstmetrovke` (20260828190000) ni klical nihče: uvoz je
-- zgrešene enajstmetrovke vpisal, vratarju nasprotnikov pa obrambe (+5) ni
-- pripisal nihče. Uvoz jo odslej kliče sam; ta migracija dohiti vse že
-- uvožene kroge. Funkcija ročno vnesenih obramb ne povozi in sama preračuna
-- točke kroga, v katerem je kaj spremenila.
do $$
declare
  v_krog bigint;
  v_skupaj int := 0;
begin
  for v_krog in
    select distinct m.round_id
      from appearances a
      join matches m on m.id = a.match_id
     where a.penalties_missed > 0
     order by m.round_id
  loop
    v_skupaj := v_skupaj + pripisi_obranjene_enajstmetrovke(v_krog);
  end loop;
  raise notice 'obranjene enajstmetrovke: pripisanih % vratarjem', v_skupaj;
end;
$$;
