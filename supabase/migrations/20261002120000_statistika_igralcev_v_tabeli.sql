-- Statistika igralcev po sezonah v tabeli, ne v pogledu.
--
-- `player_season_standings` (stran Igralci, trg v Moji ekipi, naslovnica,
-- klub, igralec) je ob vsakem branju seštel vse nastope lige in za vsak
-- nastop izračunal točke (`appearance_points`): 0,7–2,5 s na klic. 2. 10.
-- je bilo to tri četrtine vsega časa baze (30 000 s v urah, ko so jo
-- poganjali obiskovalci), in baza na Nano je ob uvozu 15 mladinskih lig
-- obstala. Isto zdravilo kot pri točkah krogov (20260923120000):
--
--   * izračun ostane isti in se preseli v `player_season_stats_izracun`,
--   * izid hrani `statistika_igralcev` (igralec × liga × sezona) skupaj z
--     zadnjim krogom in formo, ki sta prej tudi tekla sproti,
--   * `player_season_stats`, `player_overview` in `player_season_standings`
--     ostanejo z enakimi stolpci, a berejo tabelo — noben bralec se ne
--     spremeni.
--
-- Tabela se osveži TAKOJ, v isti transakciji, po igralcih: sprožilci na
-- vsem, kar izračun bere (nastopi, goli, tekme, igralci, točke krogov),
-- preračunajo le igralce, ki se jih je stavek dotaknil. Gol spremeni točke
-- vseh na tisti tekmi (asistenca, prejeti goli na igrišču), izid tekme pa
-- zmago, zato goli in tekme osvežijo vse nastope tekme.
--
-- Robni primer, ki ga sprožilci ne ujamejo: sprememba kroga sama (sezona,
-- `pravila_tockovanja`). Pobere ga nočna obnova vsega.

-- === 1. Izračun pod novim imenom ============================================
-- Telo je natanko dosedanji `player_season_stats` (20260921220000).
create or replace view public.player_season_stats_izracun as
select
  a.player_id,
  r.season,
  count(distinct a.match_id)::int as matches,
  sum(a.minutes_played)::int as minutes,
  sum(a.goals)::int as goals,
  sum(a.own_goals)::int as own_goals,
  sum(a.yellow_cards)::int as yellow_cards,
  sum(a.red_cards)::int as red_cards,
  sum(case when a.clean_sheet and a.minutes_played >= 60 then 1 else 0 end)::int
    as clean_sheets,
  coalesce(sum(ap.points), 0) as points,
  coalesce(sum(ap.assists), 0)::int as assists,
  r.competition_id
from appearances a
join matches m on m.id = a.match_id
join rounds r on r.id = m.round_id
left join appearance_points ap on ap.appearance_id = a.id
group by a.player_id, r.season, r.competition_id;

revoke all on public.player_season_stats_izracun from public, anon, authenticated;

-- === 2. Tabela ==============================================================
create table if not exists public.statistika_igralcev (
  player_id      bigint  not null references public.players(id) on delete cascade,
  competition_id bigint  not null references public.competitions(id) on delete cascade,
  season         text    not null,
  matches        integer not null,
  minutes        integer not null,
  goals          integer not null,
  own_goals      integer not null,
  yellow_cards   integer not null,
  red_cards      integer not null,
  clean_sheets   integer not null,
  points         numeric not null,
  assists        integer not null,
  -- točke zadnjega kroga sezone, v katerem ima igralec točke, in vsota
  -- zadnjih treh (forma) — kakor sta ju računala lateralna stika pogleda
  last_round     numeric not null default 0,
  form           numeric not null default 0,
  primary key (player_id, competition_id, season)
);
create index if not exists statistika_igralcev_liga
  on public.statistika_igralcev (competition_id, season);

comment on table public.statistika_igralcev is
  'Izid player_season_stats_izracun (+ zadnji krog, forma) po igralcih, ligah '
  'in sezonah. Piše ga samo osvezi_statistiko_igralcev (sprožilci + nočna '
  'obnova); bere se prek player_season_stats / player_season_standings.';

alter table public.statistika_igralcev enable row level security;
revoke all on public.statistika_igralcev from public, anon, authenticated;

-- === 3. Osvežitev ===========================================================
create or replace function public.osvezi_statistiko_igralcev(p_igralci bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_igralci bigint[];
  v_igralec bigint;
begin
  select array_agg(distinct i order by i) into v_igralci
    from unnest(p_igralci) i where i is not null;
  if v_igralci is null then
    return;
  end if;

  -- Brez zaklepa bi druga hkratna osvežitev po commitu prve vpisala iste
  -- ključe. Zaklep na igralca, urejeno, da si dve osvežitvi ne podajata
  -- navzkriž — a le za majhne nabore: vsak zaklep zasede mesto v tabeli
  -- zaklepov in 34 000 igralcev v eni transakciji (nočna obnova, prva
  -- polnitev) jo prekorači ("out of shared memory"). Velik nabor zato vzame
  -- izključni skupni zaklep, majhni pa njegovo deljeno različico.
  if cardinality(v_igralci) > 200 then
    perform pg_advisory_xact_lock(hashtextextended('slff-statistika', 0));
  else
    perform pg_advisory_xact_lock_shared(hashtextextended('slff-statistika', 0));
    foreach v_igralec in array v_igralci loop
      perform pg_advisory_xact_lock(hashtextextended('slff-statistika:' || v_igralec, 0));
    end loop;
  end if;

  delete from statistika_igralcev where player_id = any (v_igralci);

  insert into statistika_igralcev (
    player_id, competition_id, season, matches, minutes, goals, own_goals,
    yellow_cards, red_cards, clean_sheets, points, assists, last_round, form
  )
  select ss.player_id, ss.competition_id, ss.season, ss.matches, ss.minutes,
         ss.goals, ss.own_goals, ss.yellow_cards, ss.red_cards, ss.clean_sheets,
         ss.points, ss.assists,
         coalesce(z.points, 0), coalesce(f.points, 0)
    from player_season_stats_izracun ss
    left join lateral (
      select ps.points
        from player_scores ps join rounds r on r.id = ps.round_id
       where ps.player_id = ss.player_id and r.season = ss.season
       order by r.number desc
       limit 1
    ) z on true
    left join lateral (
      select sum(zadnji.points) as points
        from (select ps.points
                from player_scores ps join rounds r on r.id = ps.round_id
               where ps.player_id = ss.player_id and r.season = ss.season
               order by r.number desc
               limit 3) zadnji
    ) f on true
   where ss.player_id = any (v_igralci);
end;
$$;
revoke all on function public.osvezi_statistiko_igralcev(bigint[]) from public, anon, authenticated;

-- Nočna obnova vsega: po kosih, da en sam ogromen stavek ne požre spomina
-- male instance.
create or replace function public.osvezi_vso_statistiko_igralcev()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kos bigint[];
begin
  for v_kos in
    select array_agg(id order by id)
      from (select id, (row_number() over (order by id) - 1) / 500 as kos from players) x
     group by kos
     order by kos
  loop
    perform osvezi_statistiko_igralcev(v_kos);
  end loop;
  -- Vrstice igralcev, ki jih ni več (izbris kaskadira), in lig brez nastopov.
  delete from statistika_igralcev s
   where not exists (select 1 from players p where p.id = s.player_id);
end;
$$;
revoke all on function public.osvezi_vso_statistiko_igralcev() from public, anon, authenticated;

-- === 4. Sprožilci ===========================================================
-- Na stavek, ne na vrstico: uvoz zapiše vse nastope tekme v enem stavku in
-- igralci naj se preračunajo enkrat.

-- Tabele s stolpcem player_id (nastopi, točke krogov).
create or replace function public.statistika_po_igralcu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform osvezi_statistiko_igralcev(array(select player_id from novi));
  elsif tg_op = 'UPDATE' then
    perform osvezi_statistiko_igralcev(array(select player_id from novi union select player_id from stari));
  else
    perform osvezi_statistiko_igralcev(array(select player_id from stari));
  end if;
  return null;
end;
$$;

-- Goli in tekme: vsi, ki so tisto tekmo igrali.
create or replace function public.statistika_po_tekmi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tekme bigint[];
begin
  if tg_op = 'INSERT' then
    v_tekme := array(select match_id from novi);
  elsif tg_op = 'UPDATE' then
    v_tekme := array(select match_id from novi union select match_id from stari);
  else
    v_tekme := array(select match_id from stari);
  end if;
  perform osvezi_statistiko_igralcev(array(
    select a.player_id from appearances a where a.match_id = any (v_tekme)));
  return null;
end;
$$;

-- Tekme imajo id, ne match_id.
create or replace function public.statistika_po_tekmi_sami()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Izbris tekme kaskadira na nastope, ki jih pokrije njihov sprožilec.
  perform osvezi_statistiko_igralcev(array(
    select a.player_id from appearances a
     where a.match_id in (select id from novi union select id from stari)));
  return null;
end;
$$;

-- Igralec: pozicija (vrednost gola) in liga.
create or replace function public.statistika_po_igralcih()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform osvezi_statistiko_igralcev(array(
    select n.id from novi n join stari s on s.id = n.id
     where n.position is distinct from s.position
        or n.competition_id is distinct from s.competition_id));
  return null;
end;
$$;

revoke all on function public.statistika_po_igralcu() from public, anon, authenticated;
revoke all on function public.statistika_po_tekmi() from public, anon, authenticated;
revoke all on function public.statistika_po_tekmi_sami() from public, anon, authenticated;
revoke all on function public.statistika_po_igralcih() from public, anon, authenticated;

do $$
declare
  t text;
  fn text;
begin
  foreach t in array array['appearances', 'player_scores', 'goals'] loop
    fn := case when t = 'goals' then 'statistika_po_tekmi' else 'statistika_po_igralcu' end;
    execute format('drop trigger if exists %I on public.%I', t || '_statistika_ins', t);
    execute format('drop trigger if exists %I on public.%I', t || '_statistika_upd', t);
    execute format('drop trigger if exists %I on public.%I', t || '_statistika_del', t);
    execute format('create trigger %I after insert on public.%I referencing new table as novi '
                   'for each statement execute function public.%I()', t || '_statistika_ins', t, fn);
    execute format('create trigger %I after update on public.%I referencing old table as stari new table as novi '
                   'for each statement execute function public.%I()', t || '_statistika_upd', t, fn);
    execute format('create trigger %I after delete on public.%I referencing old table as stari '
                   'for each statement execute function public.%I()', t || '_statistika_del', t, fn);
  end loop;
end;
$$;

-- Izid tekme (zmaga) in prestavitev v drug krog/sezono.
drop trigger if exists matches_statistika_upd on public.matches;
create trigger matches_statistika_upd after update on public.matches
  referencing old table as stari new table as novi
  for each statement execute function public.statistika_po_tekmi_sami();

drop trigger if exists players_statistika_upd on public.players;
create trigger players_statistika_upd after update on public.players
  referencing old table as stari new table as novi
  for each statement execute function public.statistika_po_igralcih();

-- === 5. Začetna polnitev in zamenjava pogledov ==============================
select public.osvezi_vso_statistiko_igralcev();

-- Enaki stolpci v enakem vrstnem redu, zato `create or replace` ohrani
-- odvisne poglede in pravice.
create or replace view public.player_season_stats as
select s.player_id, s.season, s.matches, s.minutes, s.goals, s.own_goals,
       s.yellow_cards, s.red_cards, s.clean_sheets, s.points, s.assists,
       s.competition_id
  from public.statistika_igralcev s;

-- `player_overview` (20261001100000) z vsoto vseh sezon iz tabele.
create or replace view public.player_overview as
select
  p.id,
  p.full_name,
  p.first_name,
  p.last_name,
  p.position,
  p.position_source,
  p.shirt_number,
  p.value,
  p.team_id,
  t.name as team_name,
  t.short_name as team_short,
  coalesce(s.matches, 0) as matches,
  coalesce(s.minutes, 0) as minutes,
  coalesce(s.goals, 0) as goals,
  coalesce(s.clean_sheets, 0) as clean_sheets,
  coalesce(s.points, 0) as points,
  coalesce(pv.votes, 0) as position_votes,
  t.logo_url as team_logo,
  p.competition_id,
  p.active,
  coalesce(s.assists, 0) as assists,
  p.izstopil_at
from players p
join teams t on t.id = p.team_id
left join lateral (
  select sum(si.matches)::int as matches, sum(si.minutes)::int as minutes,
         sum(si.goals)::int as goals, sum(si.clean_sheets)::int as clean_sheets,
         sum(si.points) as points, sum(si.assists)::int as assists
  from statistika_igralcev si
  where si.player_id = p.id
    and si.competition_id = p.competition_id
) s on true
left join lateral (
  select count(*)::int as votes from position_votes where player_id = p.id
) pv on true;

-- `player_season_standings` (20260930130000): zadnji krog in forma iz tabele,
-- izbranost (owners) ostane sprotna — spremeni se ob vsakem zaklepu.
create or replace view public.player_season_standings as
select po.id,
       po.full_name,
       po.position,
       po.position_source,
       po.team_id,
       po.team_name,
       po.team_short,
       po.team_logo,
       po.value,
       ss.season,
       ss.matches,
       ss.minutes,
       ss.goals,
       ss.clean_sheets,
       ss.points,
       case when ss.matches > 0 then round(ss.points / ss.matches::numeric, 2)
            else 0::numeric end as points_per_match,
       case when po.value > 0::numeric then round(ss.points / po.value, 2)
            else 0::numeric end as points_per_value,
       ss.last_round,
       ss.form,
       case when zk.id is null then null::integer
            else coalesce(l.owners, 0) end as owners,
       rank() over (partition by po.competition_id, ss.season order by ss.points desc) as rank,
       po.competition_id,
       ss.assists
  from public.player_overview po
  join public.statistika_igralcev ss
    on ss.player_id = po.id and ss.competition_id = po.competition_id
  left join lateral (
    select r.id
      from public.rounds r
     where r.competition_id = po.competition_id and r.lineups_locked_at is not null
     order by r.season desc, r.number desc
     limit 1
  ) zk on true
  left join lateral (
    select count(*)::integer as owners
      from public.fantasy_lineups fl
     where fl.player_id = po.id and fl.round_id = zk.id
       and not exists (select 1 from public.fantasy_teams h
                        where h.id = fl.fantasy_team_id and h.hisna)
  ) l on true;

-- === 6. Nočna obnova ========================================================
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'obnovi-statistiko-igralcev',
    '45 3 * * *',
    $urnik$select public.osvezi_vso_statistiko_igralcev()$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — nočno obnovo statistike je treba klicati ročno', sqlerrm;
end;
$$;
