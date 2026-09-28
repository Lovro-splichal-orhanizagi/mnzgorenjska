-- Več točk za vratarje in branilce (pravila točkovanja, različica 2).
--
-- Zapisnik ne beleži obramb, zato je vratar do zdaj točke nabiral skoraj
-- samo s čisto mrežo, ki je v nižjih ligah redka (gorenjski člani 19 %,
-- mladinci 12,5 %, 2. SNL 30 %). Na vseh aktivnih ligah je vratar povprečno
-- dobil 2,02 točke na nastop, branilec 1,79, vezist 2,36, napadalec 2,92.
-- Nova pravila (izračun na istih podatkih: vratar 2,95, branilec 2,40):
--
--   * čista mreža vratarja     +4 → +5 (branilec ostane pri +4)
--   * zmaga ekipe              +2 za vratarja in branilca (60+ minut)
--   * prejeti goli se štejejo le, ko je igralec na igrišču — prej je štel
--     izid cele tekme, zato je zamenjani vratar izgubil čisto mrežo za gol,
--     ki je padel, ko je že sedel na klopi
--
-- Pravila ne sežejo nazaj: nočni preračun bi sicer spremenil že podeljene
-- točke in lestvice. Krog nosi različico pravil, po kateri se točkuje;
-- vsi krogi, ki so se že začeli ali karkoli hranijo (rok je potekel, postave
-- so zaklenjene, ima uvožene tekme, nastope, točke ali posnetke postav),
-- ostanejo pri različici 1. Na produkciji je bilo pred namestitvijo
-- preverjeno: vseh 416.712 nastopov ostane na različici 1 in pogled zanje
-- vrne enake točke kot prej. Na `rounds` ni sprožilcev, zato posodobitev
-- spodaj ničesar ne preračuna. Nova sprememba pravil naj doda različico 3
-- in zapre kroge enako.

alter table rounds
  add column if not exists pravila_tockovanja smallint not null default 2;

-- Krog brez roka in datuma (spomladanski del, ki še ni razporejen) nima ne
-- tekem ne točk in ostane pri 2; coalesce to pove izrecno, namesto da bi se
-- zanašali na NULL v pogoju.
update rounds r
   set pravila_tockovanja = 1
 where r.lineups_locked_at is not null
    or coalesce(r.deadline_at <= now(), false)
    or coalesce(r.played_on <= current_date, false)
    or exists (select 1 from matches m
                where m.round_id = r.id and m.imported_at is not null)
    or exists (select 1 from matches m join appearances a on a.match_id = m.id
                where m.round_id = r.id)
    or exists (select 1 from player_scores ps where ps.round_id = r.id)
    or exists (select 1 from fantasy_lineups fl where fl.round_id = r.id);

comment on column rounds.pravila_tockovanja is
  'Različica pravil točkovanja za ta krog (1 = krogi pred migracijo 20260928100000, 2 = več za vratarje in branilce). Starih krogov ne spreminjaj.';

-- Točke po različici pravil. Različica 1 je nespremenjena funkcija z
-- enajstimi parametri; različica 2 ji prišteje, kar je novo.
create or replace function tocke_za_nastop(
  p_position text,
  p_minutes int,
  p_goals int,
  p_assists int,
  p_clean_sheet boolean,
  p_conceded int,
  p_pen_saved int,
  p_pen_missed int,
  p_own_goals int,
  p_yellow int,
  p_red int,
  p_zmaga boolean,
  p_pravila smallint
)
returns numeric
language sql
immutable
as $$
  select tocke_za_nastop(
      p_position, p_minutes, p_goals, p_assists, p_clean_sheet, p_conceded,
      p_pen_saved, p_pen_missed, p_own_goals, p_yellow, p_red)
    + (case when p_pravila >= 2 and coalesce(p_minutes, 0) >= 60 then
        -- čista mreža vratarja: +5 namesto +4
        (case when p_clean_sheet and p_position = 'GK' then 1 else 0 end)
        -- zmaga ekipe
        + (case when p_zmaga and p_position in ('GK', 'DEF') then 2 else 0 end)
      else 0 end);
$$;

-- Pogled `appearance_points` bere vsak obiskovalec, funkcijo pa kliče s
-- pravicami bralca. Funkcija je čist izračun in ne bere nobene tabele.
grant execute on function tocke_za_nastop(
  text, int, int, int, boolean, int, int, int, int, int, int, boolean, smallint
) to anon, authenticated;

-- Novi stolpci so na koncu, da `create or replace` ostane mogoč in
-- obstoječi bralci pogleda ne opazijo spremembe. `clean_sheet` in
-- `goals_conceded` ostaneta, kot ju je zapisal uvoz (izid cele tekme);
-- točke računa `prejeti_na_igriscu`.
create or replace view appearance_points as
select
  a.id as appearance_id,
  a.match_id,
  a.player_id,
  m.round_id,
  p.position,
  a.minutes_played,
  a.goals,
  coalesce(asi.st, 0) as assists,
  a.clean_sheet,
  a.goals_conceded,
  tocke_za_nastop(
    p.position, a.minutes_played, a.goals, coalesce(asi.st, 0)::int,
    pr.cista, pr.prejeti, a.penalties_saved, a.penalties_missed,
    a.own_goals, a.yellow_cards, a.red_cards,
    zm.zmaga, r.pravila_tockovanja
  ) as points,
  zm.zmaga,
  pr.prejeti as prejeti_na_igriscu,
  pr.cista as cista_mreza,
  r.pravila_tockovanja as pravila
from appearances a
join matches m on m.id = a.match_id
join rounds r on r.id = m.round_id
join players p on p.id = a.player_id
left join lateral (
  select count(*)::int as st
  from goals g
  where g.match_id = a.match_id and g.assist_player_id = a.player_id
) asi on true
cross join lateral (
  select case when a.team_id = m.home_team_id then m.home_goals > m.away_goals
              else m.away_goals > m.home_goals end as zmaga
) zm
-- Goli, ki jih je igralčeva ekipa prejela, ko je bil na igrišču. Gol v
-- minuti menjave velja za igralca, ki odhaja; kdor igra do konca, dobi tudi
-- gole v sodniškem podaljšku. Če goli niso popolni (manjka minuta ali jih je
-- manj kot po izidu), ostane izid cele tekme — kakor pri različici 1.
left join lateral (
  select count(*) filter (where g.minute is null) as brez_minute,
         count(*) as vseh,
         count(*) filter (where g.minute > a.minute_on
                            and (g.minute <= a.minute_off or a.minute_off >= 90)) as na_igriscu
  from goals g
  where r.pravila_tockovanja >= 2
    and g.match_id = a.match_id
    -- avtogol je zapisan pri ekipi strelca in šteje nasprotniku
    and (case when g.is_own_goal then g.team_id = a.team_id
              else g.team_id <> a.team_id end)
) gl on true
cross join lateral (
  select r.pravila_tockovanja >= 2
         and gl.brez_minute = 0 and gl.vseh = a.goals_conceded as po_golih
) po
cross join lateral (
  select case when po.po_golih then gl.na_igriscu::int else a.goals_conceded end as prejeti,
         case when po.po_golih then gl.na_igriscu = 0 else a.clean_sheet end as cista
) pr;
