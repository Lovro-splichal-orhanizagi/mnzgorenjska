-- Preizkus borze ob delno uvozenem krogu.
--
-- Zapisniki enega kroga ne pridejo hkrati. Vprasanje je, kaj naredi borza z
-- igralcem, katerega zapisnika se ni: ga ovrednoti (in ga s tem trajno spusti
-- v ceni, ker popravka ne bo) ali ga pocaka.
--
-- Fixture je sestavljen tu, ne poiskan v uvozenih podatkih — preizkus, ki tako
-- stanje samo isce, je zelen takrat, ko ga slucajno ni.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-borze.sql
\set ON_ERROR_STOP on

begin;

do $$
declare
  tekmovanje bigint;
  sezona text;
  krog bigint;
  stevilka int;
  klub_uvozen_d bigint;
  klub_uvozen_g bigint;
  klub_caka_d bigint;
  klub_caka_g bigint;
  n_uvozenih int;
  n_cakajocih int;
  tekma_uvozena bigint;
  tekma_caka bigint;
  strelec bigint;
  dvig numeric;
begin
  -- --- priprava ------------------------------------------------------------
  select c.id, max(r.season) into tekmovanje, sezona
    from competitions c join rounds r on r.competition_id = c.id
    join players p on p.competition_id = c.id
   group by c.id
   order by count(distinct p.id) desc
   limit 1;

  select t.id into klub_uvozen_d from teams t
    join players p on p.team_id = t.id and p.competition_id = tekmovanje
   group by t.id order by t.id limit 1;
  select t.id into klub_uvozen_g from teams t
    join players p on p.team_id = t.id and p.competition_id = tekmovanje
   where t.id <> klub_uvozen_d group by t.id order by t.id limit 1;
  select t.id into klub_caka_d from teams t
    join players p on p.team_id = t.id and p.competition_id = tekmovanje
   where t.id not in (klub_uvozen_d, klub_uvozen_g) group by t.id order by t.id limit 1;
  select t.id into klub_caka_g from teams t
    join players p on p.team_id = t.id and p.competition_id = tekmovanje
   where t.id not in (klub_uvozen_d, klub_uvozen_g, klub_caka_d)
   group by t.id order by t.id limit 1;
  if klub_caka_g is null then
    raise exception 'preizkus potrebuje stiri klube z igralci';
  end if;

  -- Nov krog v tekoci sezoni, za njim pa dve tekmi: ena uvozena, ena ne.
  select coalesce(max(number), 0) + 1 into stevilka
    from rounds where competition_id = tekmovanje and season = sezona;
  insert into rounds (competition_id, season, number, deadline_at, played_on)
  values (tekmovanje, sezona, stevilka, now() - interval '2 days', current_date - 1)
  returning id into krog;

  insert into matches (round_id, home_team_id, away_team_id, home_goals, away_goals, played_on, imported_at)
  values (krog, klub_uvozen_d, klub_uvozen_g, 3, 0, current_date - 1, now())
  returning id into tekma_uvozena;
  insert into matches (round_id, home_team_id, away_team_id, played_on, imported_at)
  values (krog, klub_caka_d, klub_caka_g, current_date - 1, null)
  returning id into tekma_caka;

  -- Borza od migracije 20260924100000 premakne predvsem tiste, ki so igrali:
  -- odsotnost kaznuje sele drugi zaporedni krog. Zato na vsaki tekmi igra po
  -- en igralec vsakega kluba in zabije gol, domaci pa hat-trick. Izberemo
  -- igralca z znano pozicijo (brez nje gol nima tock) in z dovolj prostora
  -- do zgornje meje, da dvig ni odrezan.
  insert into appearances (match_id, player_id, team_id, started, minutes_played, goals)
  select t.match_id, x.id, x.team_id, true, 90, case when t.hattrick then 3 else 1 end
    from (values (tekma_uvozena, klub_uvozen_d, true), (tekma_uvozena, klub_uvozen_g, false),
                 (tekma_caka, klub_caka_d, false), (tekma_caka, klub_caka_g, false))
         t(match_id, team_id, hattrick)
    cross join lateral (
      select p.id, p.team_id from players p
       where p.team_id = t.team_id and p.competition_id = tekmovanje
         and not p.value_locked and p.position is not null
         and p.value + 1.0 <= least((select najvisja from meje_borze()),
                                    coalesce(p.value_start, p.value) + (select odmik from meje_borze()))
       order by p.id limit 1
    ) x;
  select a.player_id into strelec from appearances a
   where a.match_id = tekma_uvozena and a.goals = 3;
  if strelec is null then
    raise exception 'preizkus potrebuje igralca z dovolj prostora za dvig cene';
  end if;
  perform recompute_round_scores(krog);

  -- --- 1. krog s prvim zapisnikom je odigran -------------------------------
  if not krog_je_odigran(krog) then
    raise exception '1. krog z eno uvozeno tekmo naj velja za odigran';
  end if;

  -- --- 2. borza ovrednoti klube, katerih zapisnik je tu ---------------------
  perform preracunaj_cene(krog);

  select count(*) into n_uvozenih
    from price_changes pc join players p on p.id = pc.player_id
   where pc.round_id = krog and p.team_id in (klub_uvozen_d, klub_uvozen_g);
  if n_uvozenih = 0 then
    raise exception '2. klubi z uvozenim zapisnikom naj bodo ovrednoteni, ovrednotenih je 0';
  end if;

  -- --- 3. klub brez zapisnika pocaka ---------------------------------------
  select count(*) into n_cakajocih
    from price_changes pc join players p on p.id = pc.player_id
   where pc.round_id = krog and p.team_id in (klub_caka_d, klub_caka_g);
  if n_cakajocih <> 0 then
    raise exception '3. klub brez zapisnika naj pocaka, ovrednotenih je % igralcev', n_cakajocih;
  end if;

  -- --- 4. ko zapisnik pride, jih borza pobere sama -------------------------
  -- Vrstice v `price_changes` ni, zato jih naslednji tek se vidi.
  update matches set imported_at = now()
   where round_id = krog and imported_at is null;
  perform preracunaj_cene(krog);

  select count(*) into n_cakajocih
    from price_changes pc join players p on p.id = pc.player_id
   where pc.round_id = krog and p.team_id in (klub_caka_d, klub_caka_g);
  if n_cakajocih = 0 then
    raise exception '4. po prihodu zapisnika naj bodo ovrednoteni tudi ti, ovrednotenih je 0';
  end if;

  -- --- 5. hat-trick dvigne ceno bolj kot stari najvecji korak -------------
  select pc.new_value - pc.old_value into dvig
    from price_changes pc where pc.round_id = krog and pc.player_id = strelec;
  if coalesce(dvig, 0) <= 0.3 then
    raise exception '5. hat-trick naj dvigne ceno za vec kot 0.3, dvig je %', coalesce(dvig, 0);
  end if;

  -- --- 6. prvi obracun se ne ponovi ----------------------------------------
  -- Kdor je ceno ze dobil, je ne dobi dvakrat za isti krog.
  select count(*) into n_uvozenih
    from price_changes pc join players p on p.id = pc.player_id
   where pc.round_id = krog and p.team_id in (klub_uvozen_d, klub_uvozen_g);
  perform preracunaj_cene(krog);
  if (select count(*) from price_changes pc join players p on p.id = pc.player_id
       where pc.round_id = krog and p.team_id in (klub_uvozen_d, klub_uvozen_g)) <> n_uvozenih then
    raise exception '6. ponovni obracun ne sme dodati vrstic';
  end if;

  -- --- 7. krog, odigran pred novimi pravili, se ne obracuna znova ---------
  -- Nocni cron vsak dan znova obracuna odigrane kroge zadnjih 14 dni. Brez
  -- zapore bi nova pravila za ze odigrani krog naknadno podelila dvige.
  delete from price_changes where round_id = krog;
  update rounds set borza_po_starem = true where id = krog;
  perform preracunaj_cene(krog);
  if exists (select 1 from price_changes where round_id = krog) then
    raise exception '7. krog z borza_po_starem ne sme dobiti premikov cen';
  end if;

  raise notice 'preizkus borze: vseh 7 trditev drzi (cakajo posamezniki, hat-trick se pozna, brez obracuna za nazaj)';
end $$;

rollback;
