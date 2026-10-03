-- Preizkus tabele statistika_igralcev.
--
-- Strani igralcev berejo shranjeno statistiko namesto sprotnega izračuna.
-- To je varno le, dokler je tabela po VSAKI spremembi vhodov enaka izračunu.
-- Preizkus spremeni vsak vhod posebej in po vsakem primerja oba; na koncu
-- vse povrne (ROLLBACK).
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-statistike.sql
\set ON_ERROR_STOP on

begin;

create function pg_temp.razlik(p_igralci bigint[]) returns int language sql as $$
  select count(*)::int from (
    (select player_id, season, matches, minutes, goals, own_goals, yellow_cards,
            red_cards, clean_sheets, points, assists, competition_id
       from statistika_igralcev where player_id = any (p_igralci)
     except
     select * from player_season_stats_izracun where player_id = any (p_igralci))
    union all
    (select * from player_season_stats_izracun where player_id = any (p_igralci)
     except
     select player_id, season, matches, minutes, goals, own_goals, yellow_cards,
            red_cards, clean_sheets, points, assists, competition_id
       from statistika_igralcev where player_id = any (p_igralci))
  ) x;
$$;

do $$
declare
  tekma bigint;
  igralci bigint[];
  igralec bigint;
  drugi bigint;
  n int;
begin
  -- Tekma z največ nastopi in goli.
  select a.match_id into tekma
    from appearances a join goals g on g.match_id = a.match_id
   group by a.match_id order by count(*) desc, a.match_id limit 1;
  if tekma is null then
    raise notice 'preizkus statistike: v bazi ni tekem z goli, preskakujem';
    return;
  end if;
  igralci := array(select player_id from appearances where match_id = tekma order by player_id);
  igralec := igralci[1];
  drugi := igralci[2];

  n := pg_temp.razlik(igralci);
  if n <> 0 then raise exception 'izhodišče: % razlik', n; end if;

  -- 1. nastop: minute in gol
  update appearances set minutes_played = minutes_played + 7, goals = goals + 1
   where match_id = tekma and player_id = igralec;
  n := pg_temp.razlik(igralci);
  if n <> 0 then raise exception 'po spremembi nastopa: % razlik', n; end if;

  -- 2. gol z asistenco (točke asistenta in prejeti goli nasprotnikov)
  insert into goals (match_id, scorer_id, team_id, minute, assist_player_id)
  select tekma, igralec, a.team_id, 55, drugi
    from appearances a where a.match_id = tekma and a.player_id = igralec;
  n := pg_temp.razlik(igralci);
  if n <> 0 then raise exception 'po golu z asistenco: % razlik', n; end if;

  -- 3. izid tekme (zmaga)
  update matches set home_goals = coalesce(home_goals, 0) + 3 where id = tekma;
  n := pg_temp.razlik(igralci);
  if n <> 0 then raise exception 'po spremembi izida: % razlik', n; end if;

  -- 4. pozicija igralca (vrednost gola)
  update players set position = case when position = 'FWD' then 'DEF' else 'FWD' end
   where id = igralec;
  n := pg_temp.razlik(igralci);
  if n <> 0 then raise exception 'po spremembi pozicije: % razlik', n; end if;

  -- 5. izbris gola
  delete from goals where match_id = tekma and minute = 55 and assist_player_id = drugi;
  n := pg_temp.razlik(igralci);
  if n <> 0 then raise exception 'po izbrisu gola: % razlik', n; end if;

  -- 6. izbris nastopa
  delete from appearances where match_id = tekma and player_id = drugi;
  n := pg_temp.razlik(igralci);
  if n <> 0 then raise exception 'po izbrisu nastopa: % razlik', n; end if;

  -- 7. nočna obnova vsega ne spremeni ničesar
  perform osvezi_vso_statistiko_igralcev();
  select count(*) into n from (
    (select player_id, season, matches, minutes, goals, own_goals, yellow_cards,
            red_cards, clean_sheets, points, assists, competition_id from statistika_igralcev
     except select * from player_season_stats_izracun)
    union all
    (select * from player_season_stats_izracun
     except select player_id, season, matches, minutes, goals, own_goals, yellow_cards,
            red_cards, clean_sheets, points, assists, competition_id from statistika_igralcev)) x;
  if n <> 0 then raise exception 'po nočni obnovi: % razlik', n; end if;

  raise notice 'VSE OK: statistika igralcev sledi nastopom, golom, izidom in pozicijam';
end;
$$;

rollback;
