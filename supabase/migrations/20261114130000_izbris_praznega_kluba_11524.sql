-- Izbris klub-ostanka z praznim imenom (SLF-290).
--
-- Napaka #676 (HNS, mladinski zapisniki brez imena kluba v povezavi) je 4. 11.
-- ustvarila ekipo 11524 z praznim imenom. Vanjo so se uvozile tekme dveh
-- neaktivnih lig, hr-u17-1nl-centar (1307) in hr-zd-u17-a (1325): 14 tekem,
-- 404 nastopov, 66 golov, 209 igralcev. Ponovni uvoz je ne odstrani, varovalo
-- izstopa klubov (17 klubov v bazi, 16 v razporedu) pa uvoza obeh lig ne pusti
-- naprej. Nejc je izbris odobril 14. 11. 2026.
--
-- Brisanje ne seže izven teh dveh lig: če ekipa ni več prazna, ima tekme
-- drugje ali so njeni igralci v fantasy ekipah, migracija ne naredi nič.
-- Ponovni zagon je prazen ukaz.
do $$
declare
  v_klub constant bigint := 11524;
  v_tekme bigint[];
  v_tujih int;
begin
  if not exists (select 1 from teams where id = v_klub and name = '' and short_name = '') then
    raise notice 'Ekipa % ne obstaja ali ni več prazna: nič za izbrisati', v_klub;
    return;
  end if;

  select coalesce(array_agg(m.id), '{}') into v_tekme
    from matches m
   where m.home_team_id = v_klub or m.away_team_id = v_klub;

  select count(*) into v_tujih
    from matches m join rounds r on r.id = m.round_id
   where m.id = any (v_tekme) and r.competition_id not in (1307, 1325);
  if v_tujih > 0 then
    raise notice 'Ekipa % ima % tekem zunaj lig 1307 in 1325: preskočeno', v_klub, v_tujih;
    return;
  end if;

  if exists (select 1 from fantasy_roster where player_id in (select id from players where team_id = v_klub))
     or exists (select 1 from fantasy_lineups where player_id in (select id from players where team_id = v_klub)) then
    raise notice 'Igralci ekipe % so v fantasy ekipah: preskočeno', v_klub;
    return;
  end if;

  delete from goals where match_id = any (v_tekme) or team_id = v_klub;
  delete from appearances where match_id = any (v_tekme) or team_id = v_klub;
  delete from matches where id = any (v_tekme);
  delete from competition_teams where team_id = v_klub;
  delete from teams where id = v_klub;  -- igralci in njihove točke gredo z njo (on delete cascade)
end $$;
