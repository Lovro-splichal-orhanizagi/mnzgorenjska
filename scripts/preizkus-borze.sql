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
  values (krog, klub_uvozen_d, klub_uvozen_g, 1, 0, current_date - 1, now());
  insert into matches (round_id, home_team_id, away_team_id, played_on, imported_at)
  values (krog, klub_caka_d, klub_caka_g, current_date - 1, null);

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

  -- --- 5. prvi obracun se ne ponovi ----------------------------------------
  -- Kdor je ceno ze dobil, je ne dobi dvakrat za isti krog.
  select count(*) into n_uvozenih
    from price_changes pc join players p on p.id = pc.player_id
   where pc.round_id = krog and p.team_id in (klub_uvozen_d, klub_uvozen_g);
  perform preracunaj_cene(krog);
  if (select count(*) from price_changes pc join players p on p.id = pc.player_id
       where pc.round_id = krog and p.team_id in (klub_uvozen_d, klub_uvozen_g)) <> n_uvozenih then
    raise exception '5. ponovni obracun ne sme dodati vrstic';
  end if;

  raise notice 'preizkus borze: vseh 5 trditev drzi (cakajo posamezniki, ne liga)';
end $$;

rollback;
