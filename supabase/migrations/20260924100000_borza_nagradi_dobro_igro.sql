-- Borza nagradi dobro igro, odsotnosti pa ne kaznuje vsak krog.
--
-- Doslej je cena sledila le formi zadnjih treh krogov: +0.1 od 7 točk, +0.3
-- od 18, -0.2 pri nič točkah. V prvih petih krogih članske sezone je to dalo
-- 1007 padcev in 177 dvigov, 746 padcev pa je doletelo igralce, ki tisti krog
-- sploh niso igrali (klop, poškodba, odhod). Redni igralec z dvema točkama na
-- tekmo se ni premaknil, igralec z golom pa je dobil +0.1 — za človeka, ki
-- igra v resnici in spremlja svojo ceno, dober vikend skoraj ni bil viden.
--
-- Zdaj:
--   * igralec, ki je igral, dobi dvig po točkah TEGA kroga: +0.1 za vsaki
--     dve točki nad osnovnima dvema, največ +1.0 (gol veznega = 7 točk =
--     +0.2, dva gola ~ +0.5, hat-trick +0.7 in več). Forma treh krogov ostane
--     spodnja meja za stalne igralce (+0.1/+0.2/+0.3 kot doslej);
--   * igral je slabo (negativne točke ali forma <= 2): -0.1;
--   * ni igral: -0.1 le, če ni igral dva kroga zapored, v katerih je njegov
--     klub igral. Krog brez tekme kluba ceno pusti pri miru.
--
-- Meje ostanejo: 4.0–15.0 in največ 3.0 od `value_start` (meje_borze()).
-- Simulacija na krogih 2026/27 je povprečno ceno članov pustila pri 5.14
-- (začetek 5.22, po starem 4.91), vrh cenika pa se je razširil navzgor.
--
-- NOVA PRAVILA NE SMEJO SEČI NAZAJ. Nočni `uveljavi_zapadle_cene` vsak dan
-- znova obračuna vse odigrane kroge zadnjih 14 dni, za vsakega igralca, ki za
-- krog še nima vrstice v `price_changes`. Po starem je "ni vrstice" pomenilo
-- tudi "premik 0" — nova pravila bi takemu igralcu (npr. strelcu s 7 točkami
-- v zadnjem krogu) za že odigrani krog naknadno podelila dvig. Zato vsak krog,
-- ki je ob tej migraciji že odigran, dobi `borza_po_starem` in ga borza ne
-- obračuna več. Igralec, ki je v takem krogu še čakal na zapisnik, ostane
-- brez premika za ta krog; to je manjša škoda kot dvigi za nazaj.
alter table public.rounds
  add column if not exists borza_po_starem boolean not null default false;

comment on column public.rounds.borza_po_starem is
  'Krog je obračunan po pravilih borze pred 20260924100000; preracunaj_cene ga ne obračuna več.';

update public.rounds r
   set borza_po_starem = true
 where krog_je_odigran(r.id);

create or replace function public.preracunaj_cene(p_round_id bigint)
 returns table(igralec bigint, stara_cena numeric, nova_cena numeric, forma numeric)
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  MEJA_DRIFTA constant numeric := (select odmik from meje_borze());
  NAJNIZJA constant numeric := (select najnizja from meje_borze());
  NAJVISJA constant numeric := (select najvisja from meje_borze());
  v_stevilka int;
  v_sezona text;
  v_tekmovanje bigint;
  v_prvi int;
  v_zadnja_sezona text;
  v_prejsnji bigint;
  v_po_starem boolean;
begin
  select r.number, r.season, r.competition_id, c.prvi_fantasy_krog, r.borza_po_starem
    into v_stevilka, v_sezona, v_tekmovanje, v_prvi, v_po_starem
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.id = p_round_id;
  if v_stevilka is null then
    raise exception 'krog % ne obstaja', p_round_id;
  end if;

  -- Krog, odigran pred novimi pravili, je zaključen (glej glavo migracije).
  if v_po_starem then
    return;
  end if;

  -- Arhivske sezone trga ne premikajo.
  select max(r.season) into v_zadnja_sezona
    from rounds r where r.competition_id = v_tekmovanje;
  if v_sezona is distinct from v_zadnja_sezona then
    return;
  end if;

  -- Krogi pred začetkom fantasy dela lige so samo rezultati.
  if v_stevilka < coalesce(v_prvi, 1) then
    return;
  end if;

  -- Brez odigrane tekme ni premika cene.
  if not krog_je_odigran(p_round_id) then
    return;
  end if;

  select r.id into v_prejsnji
    from rounds r
   where r.competition_id = v_tekmovanje
     and r.season = v_sezona
     and r.number = v_stevilka - 1
   order by r.id
   limit 1;

  return query
  with forma as (
    select
      ps.player_id,
      sum(ps.points) as tocke,
      sum(ps.points) filter (where ps.round_id = p_round_id) as tocke_kroga
    from player_scores ps
    join rounds r on r.id = ps.round_id
    where r.season = v_sezona
      and r.competition_id = v_tekmovanje
      and r.number between greatest(1, v_stevilka - 2) and v_stevilka
    group by ps.player_id
  ),
  -- Kdo je igral (minute > 0) in kateri klub je imel uvoženo tekmo, v tem
  -- in v prejšnjem krogu.
  igral as (
    select distinct a.player_id, m.round_id
      from appearances a
      join matches m on m.id = a.match_id
     where m.round_id in (p_round_id, v_prejsnji)
       and a.minutes_played > 0
  ),
  klub_igral as (
    select distinct x.team_id, m.round_id
      from matches m
      cross join lateral (values (m.home_team_id), (m.away_team_id)) x(team_id)
     where m.round_id in (p_round_id, v_prejsnji)
       and m.imported_at is not null
  ),
  stanje as (
    select
      p.id,
      p.value as stara,
      coalesce(f.tocke, 0) as tocke,
      coalesce(f.tocke_kroga, 0) as tocke_kroga,
      exists (select 1 from igral i where i.player_id = p.id and i.round_id = p_round_id) as je_igral,
      exists (select 1 from igral i where i.player_id = p.id and i.round_id = v_prejsnji) as prej_igral,
      exists (select 1 from klub_igral k where k.team_id = p.team_id and k.round_id = p_round_id) as klub_igral,
      exists (select 1 from klub_igral k where k.team_id = p.team_id and k.round_id = v_prejsnji) as prej_klub_igral
    from players p
    left join forma f on f.player_id = p.id
    where not p.value_locked
      and p.competition_id = v_tekmovanje
      and not exists (
        select 1 from price_changes pc
        where pc.player_id = p.id and pc.round_id = p_round_id
      )
      -- Zapisniki enega kroga ne pridejo hkrati. Igralec, katerega klub v
      -- oknu forme se nima uvozene tekme, pocaka — brez vrstice v
      -- `price_changes` ga naslednji nocni tek obracuna znova, ko podatki
      -- pridejo. Cakajo posamezniki, ne cela liga (20260916140000).
      and not exists (
        select 1
          from rounds r
          join matches m on m.round_id = r.id
         where r.competition_id = v_tekmovanje
           and r.season = v_sezona
           and r.number between greatest(1, v_stevilka - 2) and v_stevilka
           and m.imported_at is null
           and p.team_id in (m.home_team_id, m.away_team_id)
      )
  ),
  dvig as (
    select
      s.*,
      greatest(
        -- +0.1 za vsaki dve točki nad osnovnima dvema, največ +1.0
        least(1.0, greatest(0, floor((s.tocke_kroga - 2) / 2.0) * 0.1)),
        -- stalna forma ostane spodnja meja
        case
          when s.tocke >= 18 then 0.3
          when s.tocke >= 12 then 0.2
          when s.tocke >= 7 then 0.1
          else 0
        end
      ) as gor
    from stanje s
  ),
  premik as (
    select
      d.id,
      d.stara,
      d.tocke,
      case
        when d.je_igral and d.gor > 0 then d.gor
        -- rdeč karton, avtogol, kup prejetih — ali tri slabe tekme
        when d.je_igral and (d.tocke_kroga < 0 or d.tocke <= 2) then -0.1
        when d.je_igral then 0
        -- Ni igral: pade šele drugi zaporedni krog, ko je klub igral brez njega.
        when d.klub_igral and d.prej_klub_igral and not d.prej_igral then -0.1
        else 0
      end as delta
    from dvig d
  ),
  omejeno as (
    select
      pr.id,
      pr.stara,
      pr.tocke,
      least(
        greatest(pr.stara + pr.delta, NAJNIZJA, p.value_start - MEJA_DRIFTA),
        NAJVISJA,
        p.value_start + MEJA_DRIFTA
      ) as nova
    from premik pr
    join players p on p.id = pr.id
    where pr.delta <> 0
  ),
  zapis as (
    insert into price_changes (player_id, round_id, old_value, new_value, form)
    select o.id, p_round_id, o.stara, o.nova, o.tocke
    from omejeno o
    where o.nova <> o.stara
    on conflict (player_id, round_id) do update
      set new_value = excluded.new_value,
          form = excluded.form,
          changed_at = now()
    returning price_changes.player_id, price_changes.old_value,
              price_changes.new_value, price_changes.form
  )
  select z.player_id, z.old_value, z.new_value, z.form from zapis z;
end;
$$;
