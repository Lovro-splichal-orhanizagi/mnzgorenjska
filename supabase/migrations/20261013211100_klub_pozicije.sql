-- Klubski računi, faza 2: pozicije kluba (spec, razdelek 2).
--
-- Klub nastavi pozicijo svojega igralca. Ne velja takoj: zahteva čaka v
-- `pozicije_klub_cakajo` in jo uveljavi tedenski `uveljavi_pozicije()`
-- (ponedeljek 02:00 UTC), pred glasovanjem in pred cenami, tako kot glasovi.
-- Uveljavljena pozicija ima vir `klub`, ki je zaklenjen kot `admin`:
-- glasovanje in skripte ga ne spremenijo. Klub ne prepiše `admin`.

alter table public.players drop constraint if exists players_position_source_check;
-- NOT VALID + VALIDATE: preverba ne drži izključnega zaklepa nad players, ki
-- ga uvozi pišejo ves dan (lock timeout, glej uvozne verige).
alter table public.players add constraint players_position_source_check
  check (position_source in ('neznano', 'ugibanje', 'zapisnik', 'glasovanje', 'admin', 'klub')) not valid;
alter table public.players validate constraint players_position_source_check;

create table public.pozicije_klub_cakajo (
  player_id  bigint primary key references public.players on delete cascade,
  position   text not null check (position in ('GK', 'DEF', 'MID', 'FWD')),
  user_id    uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create table public.pozicije_klub_dnevnik (
  id         bigint generated always as identity primary key,
  player_id  bigint not null references public.players on delete cascade,
  staro      text,
  novo       text not null,
  user_id    uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index pozicije_klub_dnevnik_igralec on public.pozicije_klub_dnevnik (player_id, created_at desc);
alter table public.pozicije_klub_cakajo enable row level security;
alter table public.pozicije_klub_dnevnik enable row level security;
revoke all on public.pozicije_klub_cakajo, public.pozicije_klub_dnevnik from anon, authenticated;

create or replace function public.klub_nastavi_pozicijo(p_player_id bigint, p_position text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_team bigint;
begin
  select team_id into v_team from players where id = p_player_id;
  if auth.uid() is null or v_team is null or not je_klubski_racun(auth.uid(), v_team) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  if p_position not in ('GK', 'DEF', 'MID', 'FWD') then
    raise exception 'Pozicija je GK, DEF, MID ali FWD.';
  end if;
  insert into pozicije_klub_cakajo(player_id, position, user_id)
  values (p_player_id, p_position, auth.uid())
  on conflict (player_id) do update
    set position = excluded.position, user_id = excluded.user_id, created_at = now();
end;
$$;

create or replace function public.klub_preklici_pozicijo(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_team bigint;
begin
  select team_id into v_team from players where id = p_player_id;
  if auth.uid() is null or v_team is null or not je_klubski_racun(auth.uid(), v_team) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  delete from pozicije_klub_cakajo where player_id = p_player_id;
end;
$$;

create or replace function public.klub_cakajoce_pozicije(p_team_id bigint)
returns table (igralec bigint, pozicija text, od timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  return query
    select c.player_id, c.position, c.created_at
      from pozicije_klub_cakajo c join players p on p.id = c.player_id
     where p.team_id = p_team_id
     order by c.created_at;
end;
$$;

revoke all on function public.klub_nastavi_pozicijo(bigint, text), public.klub_preklici_pozicijo(bigint),
  public.klub_cakajoce_pozicije(bigint) from public, anon;
grant execute on function public.klub_nastavi_pozicijo(bigint, text), public.klub_preklici_pozicijo(bigint),
  public.klub_cakajoce_pozicije(bigint) to authenticated;

-- Glasovanje: `klub` je zaklenjen kot zapisnik in admin. Telo je enako
-- 20260919090000_poznavalec_lige.sql, spremenjen je le seznam zaklenjenih.
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
  v_utez_lige := nastavitev_int_za(
    'utez_poznavalca_lige', v_competition_id,
    nastavitev_int_za('prag_glasov_pozicija', v_competition_id, 5)
  );

  -- Zapisnik, admin in klub so neomajni.
  if exists (
    select 1 from players
    where id = p_player_id and position_source in ('zapisnik', 'admin', 'klub')
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

-- Tedenska uveljavitev: najprej klub (nad glasovanjem), nato glasovi.
create or replace function public.uveljavi_pozicije()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_igralec record;
  v_pred text;
  v_spremenjenih int := 0;
begin
  for v_igralec in
    select c.player_id, c.position, c.user_id, p.team_id, p.position as staro, p.position_source
      from pozicije_klub_cakajo c join players p on p.id = c.player_id
  loop
    -- Velja le, če račun še zastopa igralčev klub (preklic, prestop med tednom).
    if v_igralec.position_source is distinct from 'admin'
       and v_igralec.user_id is not null
       and je_klubski_racun(v_igralec.user_id, v_igralec.team_id) then
      update players set position = v_igralec.position, position_source = 'klub'
       where id = v_igralec.player_id;
      insert into pozicije_klub_dnevnik(player_id, staro, novo, user_id)
      values (v_igralec.player_id, v_igralec.staro, v_igralec.position, v_igralec.user_id);
      if v_igralec.staro is distinct from v_igralec.position then
        v_spremenjenih := v_spremenjenih + 1;
      end if;
    end if;
    delete from pozicije_klub_cakajo where player_id = v_igralec.player_id;
  end loop;

  for v_igralec in
    select distinct pv.player_id from position_votes pv
  loop
    select position into v_pred from players where id = v_igralec.player_id;
    perform potrdi_pozicijo(v_igralec.player_id);
    if (select position from players where id = v_igralec.player_id)
       is distinct from v_pred then
      v_spremenjenih := v_spremenjenih + 1;
    end if;
  end loop;
  return v_spremenjenih;
end;
$$;

-- Pogled za stran Pozicije: igralci kluba ne čakajo na glasove.
create or replace view public.pozicije_v_cakanju as
select
  p.id as player_id,
  p.full_name,
  p.competition_id,
  p.team_id,
  p.position as trenutna,
  v.position as izglasovana,
  v.weight as utez,
  v.votes as glasov,
  adaptivni_prag(p.id, v.position) as prag
from players p
join lateral (
  select pvw.position, pvw.weight, pvw.votes
  from position_vote_weights pvw
  where pvw.player_id = p.id
  order by pvw.weight desc
  limit 1
) v on true
where p.position_source not in ('zapisnik', 'admin', 'klub')
  and v.weight >= adaptivni_prag(p.id, v.position)
  and p.position is distinct from v.position;
