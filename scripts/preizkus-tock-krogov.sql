-- Preizkus tabele tocke_krogov.
--
-- Lestvica bere shranjene tocke krogov namesto sprotnega izracuna. To je
-- varno le, dokler je tabela po VSAKI spremembi vhodov enaka izracunu. Zato
-- preizkus spreminja vsak vhod posebej in po vsakem primerja oba.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-tock-krogov.sql
\set ON_ERROR_STOP on

begin;

create function pg_temp.razlik(p_krogi bigint[]) returns int language sql as $$
  select count(*)::int from (
    (select * from fantasy_round_points where round_id = any (p_krogi)
     except
     select * from fantasy_round_points_izracun where round_id = any (p_krogi))
    union all
    (select * from fantasy_round_points_izracun where round_id = any (p_krogi)
     except
     select * from fantasy_round_points where round_id = any (p_krogi))
  ) x;
$$;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000e1';
  krog bigint;
  drugi_krog bigint;
  tekmovanje bigint;
  ekipa bigint;
  kapetan bigint;
  zacetnik bigint;
  tekma bigint;
  pred numeric;
  po numeric;
  n int;
begin
  insert into auth.users (id, email, instance_id, aud, role)
  values (a, 'e@tocke', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;
  insert into profiles (id, display_name) values (a, 'E') on conflict (id) do nothing;

  -- Odigran krog z najvec tockovanimi igralci in se en krog iste lige.
  select ps.round_id, r.competition_id into krog, tekmovanje
    from player_scores ps join rounds r on r.id = ps.round_id
   group by ps.round_id, r.competition_id
   order by count(*) desc, ps.round_id
   limit 1;
  if krog is null then
    raise notice 'preizkus tock krogov: v bazi ni tockovanih krogov, preskakujem';
    return;
  end if;
  select id into drugi_krog from rounds
   where competition_id = tekmovanje and id <> krog order by id limit 1;

  insert into fantasy_teams (owner_id, name, competition_id)
  values (a, 'Tocke krogov', tekmovanje) returning id into ekipa;

  -- --- 1. posnetek postave napolni tabelo ------------------------------------
  -- 15 igralcev, ki so v tem krogu igrali: 11 zacetnih, 4 na klopi.
  insert into fantasy_lineups (round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
  select krog, ekipa, x.player_id, x.rn <= 11, x.rn = 1, x.rn = 2,
         case when x.rn > 11 then x.rn - 11 end, x.position
    from (
      select ps.player_id, p.position,
             row_number() over (order by ps.points desc, ps.player_id) as rn
        from player_scores ps join players p on p.id = ps.player_id
       where ps.round_id = krog
    ) x
   where x.rn <= 15;

  select count(*) into n from tocke_krogov where fantasy_team_id = ekipa and round_id = krog;
  if n <> 1 then
    raise exception '1. posnetek postave naj doda vrstico v tocke_krogov, jih je %', n;
  end if;
  if pg_temp.razlik(array[krog]) <> 0 then
    raise exception '1. po posnetku se tabela razlikuje od izracuna';
  end if;

  -- --- 2. sprememba tock igralca ---------------------------------------------
  select player_id into kapetan from fantasy_lineups
   where fantasy_team_id = ekipa and round_id = krog and is_captain;
  select points into pred from fantasy_round_points where fantasy_team_id = ekipa and round_id = krog;
  update player_scores set points = points + 5 where round_id = krog and player_id = kapetan;
  select points into po from fantasy_round_points where fantasy_team_id = ekipa and round_id = krog;
  if po - pred <> 15 then
    raise exception '2. +5 tock kapetanu naj ekipi da +15, dalo je %', po - pred;
  end if;
  if pg_temp.razlik(array[krog]) <> 0 then
    raise exception '2. po spremembi tock se tabela razlikuje od izracuna';
  end if;

  -- --- 3. pripomocek Klop+ ---------------------------------------------------
  insert into fantasy_chips (fantasy_team_id, chip, round_id) values (ekipa, 'klop_plus', krog);
  if pg_temp.razlik(array[krog]) <> 0 then
    raise exception '3. po pripomocku se tabela razlikuje od izracuna';
  end if;

  -- --- 4. kazen za prestope --------------------------------------------------
  select points into pred from fantasy_round_points where fantasy_team_id = ekipa and round_id = krog;
  insert into fantasy_transfers (fantasy_team_id, round_id, transfers, free_transfers, penalty)
  values (ekipa, krog, 4, 3, 4);
  select points into po from fantasy_round_points where fantasy_team_id = ekipa and round_id = krog;
  if pred - po <> 4 then
    raise exception '4. kazen 4 naj odsteje 4 tocke, odstela je %', pred - po;
  end if;
  if pg_temp.razlik(array[krog]) <> 0 then
    raise exception '4. po kazni se tabela razlikuje od izracuna';
  end if;

  -- --- 5. zacetnik brez minut (samodejna menjava) ----------------------------
  select fl.player_id into zacetnik from fantasy_lineups fl
   where fl.fantasy_team_id = ekipa and fl.round_id = krog and fl.is_starter and not fl.is_captain
   order by fl.player_id limit 1;
  update appearances a set minutes_played = 0
    from matches m
   where m.id = a.match_id and m.round_id = krog and a.player_id = zacetnik;
  if pg_temp.razlik(array[krog]) <> 0 then
    raise exception '5. po spremembi minut se tabela razlikuje od izracuna';
  end if;

  -- --- 6. tekma v drug krog --------------------------------------------------
  if drugi_krog is not null then
    select a.match_id into tekma from appearances a join matches m on m.id = a.match_id
     where m.round_id = krog and a.player_id = kapetan limit 1;
    update matches set round_id = drugi_krog where id = tekma;
    if pg_temp.razlik(array[krog, drugi_krog]) <> 0 then
      raise exception '6. po prestavljeni tekmi se tabela razlikuje od izracuna';
    end if;
  end if;

  -- --- 7. brisanje posnetka --------------------------------------------------
  delete from fantasy_lineups where fantasy_team_id = ekipa and round_id = krog;
  if pg_temp.razlik(array[krog]) <> 0 then
    raise exception '7. po brisanju posnetka se tabela razlikuje od izracuna';
  end if;

  -- --- 8. nocna obnova se ujema z izracunom ----------------------------------
  perform osvezi_vse_tocke_krogov();
  if pg_temp.razlik(array(select id from rounds)) <> 0 then
    raise exception '8. po nocni obnovi se tabela razlikuje od izracuna';
  end if;

  -- --- 9. brisanje ekipe pobere njene vrstice --------------------------------
  delete from fantasy_chips where fantasy_team_id = ekipa;
  delete from fantasy_transfers where fantasy_team_id = ekipa;
  delete from fantasy_teams where id = ekipa;
  if exists (select 1 from tocke_krogov where fantasy_team_id = ekipa) then
    raise exception '9. izbrisana ekipa naj ne ostane v tocke_krogov';
  end if;

  raise notice 'preizkus tock krogov: vseh 9 trditev drzi';
end $$;

rollback;
