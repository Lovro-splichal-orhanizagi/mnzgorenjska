-- Izbris dvojnika kluba St. Valent.ASK 1b v at-ooe-2-klasse-1b (SLF-456).
--
-- ÖFB je klub v razporedu preimenoval v "St. Valentin ASK 1b", zato je nočni
-- uvoz ustvaril ekipo 12917 in vanjo 26 praznih tekem (0:0, brez zapisnika,
-- brez nastopov in golov). Prava ekipa je 3685; vzdevek iz #744 preprečuje,
-- da bi se dvojnik ponovno ustvaril. Izbris je odobril Nejc 15. 11. 2026.
--
-- Brišemo samo, če je dvojnik še prazen: vse tekme v ligi 1270, brez
-- zapisnika, nastopov, golov, igralcev. Sicer migracija ne naredi nič.
-- Ponovni zagon je prazen ukaz.
do $$
declare
  v_klub constant bigint := 12917;
  v_liga constant bigint := 1270;
  v_tekme bigint[];
begin
  if not exists (select 1 from teams where id = v_klub and name = 'St. Valentin ASK 1b') then
    raise notice 'Ekipa % ne obstaja ali je preimenovana: nič za izbrisati', v_klub;
    return;
  end if;

  select coalesce(array_agg(m.id), '{}') into v_tekme
    from matches m
   where m.home_team_id = v_klub or m.away_team_id = v_klub;

  if exists (select 1 from matches m join rounds r on r.id = m.round_id
              where m.id = any (v_tekme)
                and (r.competition_id <> v_liga or m.zapisnik_id is not null))
     or exists (select 1 from appearances where match_id = any (v_tekme) or team_id = v_klub)
     or exists (select 1 from goals where match_id = any (v_tekme) or team_id = v_klub)
     or exists (select 1 from players where team_id = v_klub) then
    raise notice 'Ekipa % ni več prazna ali ima tekme zunaj lige %: preskočeno', v_klub, v_liga;
    return;
  end if;

  begin
    delete from matches where id = any (v_tekme);
    delete from teams where id = v_klub;
    raise notice 'Izbrisana ekipa % in % tekem', v_klub, cardinality(v_tekme);
  exception when foreign_key_violation then
    raise notice 'Ekipa % ali njene tekme so še vezane drugje (%): preskočeno', v_klub, sqlerrm;
  end;
end $$;
