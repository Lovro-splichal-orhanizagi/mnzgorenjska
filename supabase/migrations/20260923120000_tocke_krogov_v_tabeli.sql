-- Točke krogov v tabeli, ne v pogledu.
--
-- `fantasy_round_points` je za vsako ekipo in vsak zaklenjen krog poklical
-- `ucinkovita_postava()` — pri 126 ekipah in devetih krogih 1–3 sekunde, med
-- uvozom do sedem. Anonimni obiskovalec ima omejitev 3 s, zato je lestvica
-- ravno ob vikendih, ko teče uvoz in jo gleda največ ljudi, padala s
-- "statement timeout". Oba pogleda lestvice (`fantasy_team_standings`,
-- `fantasy_round_standings`) bereta ta pogled, zato zadošča popravek tu.
--
-- Izračun ostane isti in se preseli v `fantasy_round_points_izracun`. Njegov
-- izid hrani `tocke_krogov`; `fantasy_round_points` postane tanek pogled nad
-- njo z enakimi stolpci, zato se ne spremeni noben bralec.
--
-- Tabela se osveži PO KROGIH in TAKOJ, v isti transakciji: sprožilci na vsem,
-- kar izračun bere (točke igralcev, posnetki postav, prestopi, pripomočki,
-- nastopi, tekme), preračunajo le kroge, ki jih je stavek spremenil. Zamika
-- ni, zato lestvica nikoli ne kaže starega stanja.
--
-- Dva robna primera sprožilci ne ujamejo in ju pobere nočna obnova vsega:
--   * nova ekipa po zaklepu: izračun ji za pretekle kroge da vrstico z 0,
--     tabela je nima — skupni seštevek je isti, manjka le ničla v lestvici
--     preteklega kroga;
--   * sprememba pozicije igralca v starem posnetku brez `position`, ki je
--     `preracunaj_igralca` zunaj 14-dnevnega okna ne osveži.

-- === 1. Izračun pod novim imenom ============================================
-- Telo je natanko dosedanji `fantasy_round_points` (20260901090000 + kasnejši).
create or replace view public.fantasy_round_points_izracun as
select ft.id as fantasy_team_id,
       r.id as round_id,
       r.season,
       r.number as round_number,
       coalesce(sum(ps.points * up.mnozitelj::numeric), 0::numeric)
         - coalesce(max(tr.penalty), 0)::numeric as points,
       coalesce(max(tr.transfers), 0) as transfers,
       coalesce(max(tr.penalty), 0) as penalty,
       ft.competition_id
  from fantasy_teams ft
  join rounds r on r.competition_id = ft.competition_id
  left join lateral ucinkovita_postava(ft.id, r.id) up(player_id, mnozitelj) on true
  left join player_scores ps on ps.round_id = r.id and ps.player_id = up.player_id
  left join fantasy_transfers tr on tr.fantasy_team_id = ft.id and tr.round_id = r.id
 where exists (select 1 from fantasy_lineups fl where fl.round_id = r.id)
 group by ft.id, r.id, r.season, r.number, ft.competition_id;

-- Drag izračun ni za javnost; bere ga le osvežitev.
revoke all on public.fantasy_round_points_izracun from public, anon, authenticated;

-- === 2. Tabela ==============================================================
create table if not exists public.tocke_krogov (
  fantasy_team_id bigint  not null references public.fantasy_teams(id) on delete cascade,
  round_id        bigint  not null references public.rounds(id) on delete cascade,
  points          numeric not null,
  transfers       integer not null,
  penalty         integer not null,
  primary key (fantasy_team_id, round_id)
);
create index if not exists tocke_krogov_krog on public.tocke_krogov (round_id);

comment on table public.tocke_krogov is
  'Izid fantasy_round_points_izracun po ekipah in krogih. Pise ga samo '
  'osvezi_tocke_krogov (sprozilci + nocna obnova); bere se prek fantasy_round_points.';

alter table public.tocke_krogov enable row level security;
revoke all on public.tocke_krogov from public, anon, authenticated;

-- === 3. Osvežitev ===========================================================
create or replace function public.osvezi_tocke_krogov(p_krogi bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_krog bigint;
begin
  -- Urejeno, da si dve hkratni osvežitvi zaklepov ne podajata navzkriž.
  for v_krog in
    select distinct k from unnest(p_krogi) k where k is not null order by k
  loop
    -- Zaporedno po krogu: brez zaklepa bi druga osvežitev po commitu prve
    -- vpisala iste ključe in padla na primarnem ključu.
    perform pg_advisory_xact_lock(hashtextextended('slff-tocke-krogov:' || v_krog, 0));
    delete from tocke_krogov where round_id = v_krog;
    insert into tocke_krogov (fantasy_team_id, round_id, points, transfers, penalty)
    select fantasy_team_id, round_id, points, transfers, penalty
      from fantasy_round_points_izracun
     where round_id = v_krog;
  end loop;
end;
$$;
revoke all on function public.osvezi_tocke_krogov(bigint[]) from public, anon, authenticated;

-- Nočna obnova vsega: robni primeri iz uvoda in varovalo, če bi kdaj kakšen
-- vir sprememb ostal brez sprožilca.
create or replace function public.osvezi_vse_tocke_krogov()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform osvezi_tocke_krogov(array(
    select distinct fl.round_id from fantasy_lineups fl
    union
    select distinct tk.round_id from tocke_krogov tk
  ));
end;
$$;
revoke all on function public.osvezi_vse_tocke_krogov() from public, anon, authenticated;

-- === 4. Sprožilci ===========================================================
-- Na stavek, ne na vrstico: uvoz v enem stavku zapiše točke celega kroga in
-- krog naj se preračuna enkrat, ne stokrat. Prehodni tabeli `novi`/`stari`
-- obstajata le za dogodke, ki ju imajo — zato veja po TG_OP.

-- Tabele s stolpcem round_id.
create or replace function public.tocke_krogov_po_krogu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform osvezi_tocke_krogov(array(select round_id from novi));
  elsif tg_op = 'UPDATE' then
    perform osvezi_tocke_krogov(array(select round_id from novi union select round_id from stari));
  else
    perform osvezi_tocke_krogov(array(select round_id from stari));
  end if;
  return null;
end;
$$;

-- Nastopi: krog pove tekma.
create or replace function public.tocke_krogov_po_nastopu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform osvezi_tocke_krogov(array(
      select m.round_id from novi n join matches m on m.id = n.match_id));
  elsif tg_op = 'UPDATE' then
    perform osvezi_tocke_krogov(array(
      select m.round_id from novi n join matches m on m.id = n.match_id
      union
      select m.round_id from stari s join matches m on m.id = s.match_id));
  else
    -- Ob brisanju tekme je tekma ze izbrisana; krog pokrije sprozilec na tekmah.
    perform osvezi_tocke_krogov(array(
      select m.round_id from stari s join matches m on m.id = s.match_id));
  end if;
  return null;
end;
$$;

revoke all on function public.tocke_krogov_po_krogu() from public, anon, authenticated;
revoke all on function public.tocke_krogov_po_nastopu() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['player_scores', 'fantasy_lineups', 'fantasy_transfers', 'fantasy_chips'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_tocke_ins', t);
    execute format('drop trigger if exists %I on public.%I', t || '_tocke_upd', t);
    execute format('drop trigger if exists %I on public.%I', t || '_tocke_del', t);
    execute format('create trigger %I after insert on public.%I referencing new table as novi '
                   'for each statement execute function public.tocke_krogov_po_krogu()', t || '_tocke_ins', t);
    execute format('create trigger %I after update on public.%I referencing old table as stari new table as novi '
                   'for each statement execute function public.tocke_krogov_po_krogu()', t || '_tocke_upd', t);
    execute format('create trigger %I after delete on public.%I referencing old table as stari '
                   'for each statement execute function public.tocke_krogov_po_krogu()', t || '_tocke_del', t);
  end loop;
end;
$$;

drop trigger if exists appearances_tocke_ins on public.appearances;
drop trigger if exists appearances_tocke_upd on public.appearances;
drop trigger if exists appearances_tocke_del on public.appearances;
create trigger appearances_tocke_ins after insert on public.appearances
  referencing new table as novi
  for each statement execute function public.tocke_krogov_po_nastopu();
create trigger appearances_tocke_upd after update on public.appearances
  referencing old table as stari new table as novi
  for each statement execute function public.tocke_krogov_po_nastopu();
create trigger appearances_tocke_del after delete on public.appearances
  referencing old table as stari
  for each statement execute function public.tocke_krogov_po_nastopu();

-- Tekma, prestavljena v drug krog ali izbrisana, spremeni minute obeh krogov.
drop trigger if exists matches_tocke_upd on public.matches;
drop trigger if exists matches_tocke_del on public.matches;
create trigger matches_tocke_upd after update on public.matches
  referencing old table as stari new table as novi
  for each statement execute function public.tocke_krogov_po_krogu();
create trigger matches_tocke_del after delete on public.matches
  referencing old table as stari
  for each statement execute function public.tocke_krogov_po_krogu();

-- === 5. Začetna polnitev in zamenjava pogleda ===============================
select public.osvezi_vse_tocke_krogov();

-- Enaki stolpci v enakem vrstnem redu kot doslej, zato `create or replace`
-- ohrani odvisna pogleda in pravice.
create or replace view public.fantasy_round_points as
select tk.fantasy_team_id,
       tk.round_id,
       r.season,
       r.number as round_number,
       tk.points,
       tk.transfers,
       tk.penalty,
       ft.competition_id
  from public.tocke_krogov tk
  join public.rounds r on r.id = tk.round_id
  join public.fantasy_teams ft on ft.id = tk.fantasy_team_id;

-- === 6. Nočna obnova ========================================================
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'obnovi-tocke-krogov',
    '15 3 * * *',
    $urnik$select public.osvezi_vse_tocke_krogov()$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — nocno obnovo tock krogov je treba klicati rocno', sqlerrm;
end;
$$;
