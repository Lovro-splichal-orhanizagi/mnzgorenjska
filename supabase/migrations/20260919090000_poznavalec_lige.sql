-- Poznavalec lige.
--
-- Poznavalec kluba (insider_team_id) si ga izbere vsak sam in njegov glas
-- za igralce tega kluba steje trojno. To je premalo za cloveka, ki pozna vso
-- ligo: v Primorski ligi ima 302 od 342 igralcev pozicijo samo uganjeno in
-- 414 golov je brez asistence, prvi tak clovek pa se je ponudil sam (dela
-- to ze za SofaScore). Z utezjo 3 in pragom 5 bi moral za vsakega igralca
-- cakati se na dva tujca.
--
-- Zato `profiles.insider_competition_id`: glas poznavalca lige za KATEREGAKOLI
-- igralca te lige steje toliko, kot je prag — en glas potrdi. Nastavi ga
-- samo admin (stolpec ni v grant update za authenticated), ker gre za
-- zaupanje nad celo ligo, ne nad enim klubom.
--
-- Velja za pozicije (utez_poznavalca_lige, privzeto 5 = prag_glasov_pozicija)
-- in za asistence (utez = prag_glasov_asistenca). Zapisnik in admin ostaneta
-- neomajna, kot doslej.

alter table public.profiles
  add column if not exists insider_competition_id bigint
  references public.competitions on delete set null;

create index if not exists profiles_insider_competition_idx
  on public.profiles (insider_competition_id);

comment on column public.profiles.insider_competition_id is
  'Poznavalec lige: en glas potrdi pozicijo ali asistenco v tej ligi. Nastavi samo admin.';

-- --------------------------------------------------------------------------
-- Pozicije
-- --------------------------------------------------------------------------
create or replace function public.potrdi_pozicijo(p_player_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id        bigint;
  v_competition_id bigint;
  v_utez_insider   numeric;
  v_utez_lige      numeric;
  v_position       text;
  v_utez           numeric;
  v_prag           numeric;
begin
  select team_id, competition_id into v_team_id, v_competition_id
  from players where id = p_player_id;

  v_utez_insider := nastavitev_int_za('utez_insider', v_competition_id, 3);
  -- Poznavalec lige: en glas doseze osnovni prag.
  v_utez_lige := nastavitev_int_za(
    'utez_poznavalca_lige', v_competition_id,
    nastavitev_int_za('prag_glasov_pozicija', v_competition_id, 5)
  );

  -- Zapisnik in admin sta neomajna.
  if exists (
    select 1 from players
    where id = p_player_id and position_source in ('zapisnik','admin')
  ) then
    return;
  end if;

  select
    pv.position,
    sum(greatest(
      voter_weight(pv.voter_id),
      case when pf.insider_team_id = v_team_id then v_utez_insider else 1.0 end,
      case when pf.insider_competition_id = v_competition_id then v_utez_lige else 1.0 end
    ))
    into v_position, v_utez
  from position_votes pv
  join profiles pf on pf.id = pv.voter_id
  where pv.player_id = p_player_id
  group by pv.position
  order by 2 desc
  limit 1;

  if v_position is null then
    return;
  end if;

  v_prag := adaptivni_prag(p_player_id, v_position);

  if v_utez >= v_prag then
    update players
      set position = v_position,
          position_source = 'glasovanje'
    where id = p_player_id
      and (position is distinct from v_position
           or position_source is distinct from 'glasovanje');
  end if;
end;
$$;

-- Pogled za UI mora racunati enako kot funkcija, sicer stran Pozicije
-- kaze drugacen napredek, kot ga potem odloci baza.
create or replace view public.position_vote_weights as
  select
    pv.player_id,
    pv.position,
    count(*)::int as votes,
    round(sum(greatest(
      voter_weight(pv.voter_id),
      case when pf.insider_team_id = p.team_id
        then nastavitev_int_za('utez_insider', p.competition_id, 3)::numeric
        else 1.0
      end,
      case when pf.insider_competition_id = p.competition_id
        then nastavitev_int_za(
          'utez_poznavalca_lige', p.competition_id,
          nastavitev_int_za('prag_glasov_pozicija', p.competition_id, 5)
        )::numeric
        else 1.0
      end
    )), 2) as weight
  from position_votes pv
  join players  p  on p.id  = pv.player_id
  join profiles pf on pf.id = pv.voter_id
  group by pv.player_id, pv.position, p.team_id, p.competition_id;

-- --------------------------------------------------------------------------
-- Asistence: glasovi so bili gol steti; poznavalec lige steje kot prag.
-- --------------------------------------------------------------------------
create or replace function public.potrdi_asistenco(p_goal_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gol goals;
  v_competition_id bigint;
  v_prag numeric;
  v_player_id bigint;
  v_utez numeric;
begin
  select * into v_gol from goals where id = p_goal_id;
  if not found then
    return;
  end if;

  select r.competition_id into v_competition_id
  from matches m join rounds r on r.id = m.round_id
  where m.id = v_gol.match_id;

  v_prag := nastavitev_int_za('prag_glasov_asistenca', v_competition_id, 3);

  -- Enkrat odločeno ostane odločeno.
  if v_gol.assist_player_id is not null
     or v_gol.assist_none_confirmed_at is not null then
    return;
  end if;

  -- Enajstmetrovka in avtogol asistence nimata.
  if v_gol.is_penalty or v_gol.is_own_goal then
    update goals set assist_none_confirmed_at = now() where id = p_goal_id;
    return;
  end if;

  -- Vodilna izbira, pri čemer »nihče« (player_id is null) šteje enako kot
  -- igralec. Ob izenačenju ima prednost imenovani podajalec.
  select av.player_id,
         sum(case when pf.insider_competition_id = v_competition_id then v_prag else 1 end)
    into v_player_id, v_utez
  from assist_votes av
  join profiles pf on pf.id = av.voter_id
  where av.goal_id = p_goal_id
  group by av.player_id
  order by 2 desc, (av.player_id is null)
  limit 1;

  if v_utez is null or v_utez < v_prag then
    return;
  end if;

  if v_player_id is null then
    update goals set assist_none_confirmed_at = now() where id = p_goal_id;
  else
    update goals
       set assist_player_id = v_player_id,
           assist_confirmed_at = now()
     where id = p_goal_id;
  end if;
end;
$$;

-- UI steje glasove iz tega pogleda; poznavalec naj tudi tu steje kot prag,
-- da se stran in odlocitev ne razideta.
create or replace view public.assist_vote_counts as
  select
    av.goal_id,
    av.player_id,
    sum(case when pf.insider_competition_id = r.competition_id
          then nastavitev_int_za('prag_glasov_asistenca', r.competition_id, 3)
          else 1 end)::int as votes
  from assist_votes av
  join profiles pf on pf.id = av.voter_id
  join goals g on g.id = av.goal_id
  join matches m on m.id = g.match_id
  join rounds r on r.id = m.round_id
  group by av.goal_id, av.player_id;
