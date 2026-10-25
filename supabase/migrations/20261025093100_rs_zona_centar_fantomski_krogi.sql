-- Zona Centar 2026/27 (rs-zona-centar, vir fssid): fsris.org.rs ima 14. kolo z
-- datumom 1. kola ("22.08.2026"), uvoz razporeda je iz njega ocenil še kroge
-- 15–22 (+7 dni). Nastalo je devet minulih krogov brez zapisnikov (54 tekem),
-- zaklep 22. kroga (rok 17. 10.) pa je zajel posnetke 27 ekip in jim zapisal
-- 0 točk. Pravi pomladni krogi se ne igrajo pred marcem 2027.
--
-- Kroge pobrišemo s tekmami in posnetki; uvoz jih vpiše znova, ko jih zveza
-- objavi (datum vira pred prejšnjimi krogi odslej zavrne). Varovala: le liga
-- rs-zona-centar, sezona 2026/27, krogi 14–22, in le če noben nima uvožene
-- tekme, nastopa, gola, prestopa, žetona, točk ali cenovne spremembe. Na sveži
-- bazi (CI) take lige ni in migracija ne naredi nič.
do $$
declare
  v_krogi bigint[];
begin
  select array_agg(r.id order by r.number) into v_krogi
    from rounds r join competitions c on c.id = r.competition_id
   where c.slug = 'rs-zona-centar' and r.season = '2026/27' and r.number between 14 and 22
     and r.played_on < date '2026-11-01';
  if v_krogi is null then
    return;
  end if;

  if exists (select 1 from matches m where m.round_id = any(v_krogi)
              and (m.imported_at is not null or m.zapisnik_id is not null or m.kontumacija))
     or exists (select 1 from appearances a join matches m on m.id = a.match_id where m.round_id = any(v_krogi))
     or exists (select 1 from goals g join matches m on m.id = g.match_id where m.round_id = any(v_krogi))
     or exists (select 1 from fantasy_transfers where round_id = any(v_krogi))
     or exists (select 1 from fantasy_chips where round_id = any(v_krogi))
     or exists (select 1 from player_scores where round_id = any(v_krogi))
     or exists (select 1 from price_changes where round_id = any(v_krogi))
     or exists (select 1 from zadrzani_padci where round_id = any(v_krogi))
     or exists (select 1 from tocke_krogov where round_id = any(v_krogi)
                 and (points <> 0 or transfers <> 0 or penalty <> 0)) then
    raise exception 'rs-zona-centar: krogi 14–22 niso več prazni — preveri ročno, preden jih pobrišeš';
  end if;

  delete from fantasy_lineups where round_id = any(v_krogi);
  delete from tocke_krogov where round_id = any(v_krogi);
  delete from matches where round_id = any(v_krogi);
  delete from rounds where id = any(v_krogi);
  raise notice 'rs-zona-centar: pobrisanih krogov %', cardinality(v_krogi);
end
$$;
