-- Pragovi glasovanja po tekmovanju.
--
-- `settings` je plosčata tabela ključ→vrednost brez dimenzije tekmovanja.
-- Dokler je bila ena zveza, je to zadoščalo. Z več ligami ne: prag treh
-- glasov za asistenco je smiseln v ligi z dvesto igralci in nedosegljiv v
-- ligi z dvajsetimi. Liga, v kateri se nič nikoli ne potrdi, je videti
-- pokvarjena, čeprav koda dela pravilno.
--
-- Globalne vrednosti ostanejo privzetek; tekmovanje jih lahko povozi. Tako
-- ni treba ničesar nastavljati za lige, ki so s privzetkom zadovoljne.

create table if not exists competition_settings (
  competition_id bigint not null references competitions(id) on delete cascade,
  key            text   not null,
  value          jsonb  not null,
  primary key (competition_id, key)
);

comment on table competition_settings is
  'Nastavitve, ki povozijo globalne iz `settings`, za eno tekmovanje. Kar ni tu, se bere iz `settings`.';

alter table competition_settings enable row level security;

create policy "javno branje" on competition_settings for select using (true);

create policy "admin ureja nastavitve tekmovanja" on competition_settings
  for all using (is_admin()) with check (is_admin());

-- --------------------------------------------------------------------------
-- Branje: najprej tekmovanje, nato globalno, nato privzetek v kodi
-- --------------------------------------------------------------------------
create or replace function nastavitev_int_za(
  p_key text,
  p_competition_id bigint,
  p_privzeto integer
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::int
       from competition_settings
      where competition_id = p_competition_id and key = p_key),
    (select (value #>> '{}')::int from settings where key = p_key),
    p_privzeto
  );
$$;

comment on function nastavitev_int_za(text, bigint, integer) is
  'Nastavitev za tekmovanje; če je ni, globalna iz `settings`; če tudi te ni, podani privzetek.';

-- --------------------------------------------------------------------------
-- Porabniki pragov razrešijo tekmovanje iz svojega konteksta
-- --------------------------------------------------------------------------
-- `voter_weight` ostane globalen namenoma: zaupanje glasovalca ni lastnost
-- lige, ampak človeka, in nima konteksta tekmovanja v podpisu.

CREATE OR REPLACE FUNCTION public.potrdi_asistenco(p_goal_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_gol goals;
  v_tekmovanje bigint;
  v_prag int;
  v_player_id bigint;
  v_glasov int;
begin
  select * into v_gol from goals where id = p_goal_id;
  if not found then
    return;
  end if;

  -- Prag je last tekmovanja, ne sistema: trije glasovi so v veliki ligi
  -- lahek dosežek, v majhni pa nedosegljiv. Če tekmovanje svojega nima,
  -- `nastavitev_int_za` vrne globalnega.
  select r.competition_id into v_tekmovanje
    from matches m join rounds r on r.id = m.round_id
   where m.id = v_gol.match_id;
  v_prag := nastavitev_int_za('prag_glasov_asistenca', v_tekmovanje, 3);

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
  select av.player_id, count(*)
    into v_player_id, v_glasov
  from assist_votes av
  where av.goal_id = p_goal_id
  group by av.player_id
  order by count(*) desc, (av.player_id is null)
  limit 1;

  if v_glasov is null or v_glasov < v_prag then
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
$function$

;

CREATE OR REPLACE FUNCTION public.adaptivni_prag(p_player_id bigint, p_position text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with prior as (
    select coalesce((
      select score from position_priors
      where player_id = p_player_id and position = p_position
    ), 0) as s
  ),
  liga as (
    -- Prag pripada tekmovanju igralca; ista oseba je pri clanih in mladincih
    -- dve vrstici, zato je to enolicno.
    select competition_id from players where id = p_player_id
  ),
  meje as (
    select
      nastavitev_int_za('prag_glasov_pozicija',     (select competition_id from liga), 5)::numeric as osnovni,
      nastavitev_int_za('min_prag_glasov_pozicija', (select competition_id from liga), 2)::numeric as spodnja
  )
  select greatest(
    (select spodnja from meje),
    (select osnovni from meje) - case
      when (select s from prior) >= 0.70 then 3
      when (select s from prior) >= 0.50 then 2
      when (select s from prior) >= 0.30 then 1
      else 0
    end
  );
$function$

;

CREATE OR REPLACE FUNCTION public.potrdi_pozicijo(p_player_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_team_id       bigint;
  v_utez_insider  numeric;
  v_position      text;
  v_utez          numeric;
  v_prag          numeric;
begin
  -- Utez poznavalca je last tekmovanja: kako mocno naj steje glas domacina,
  -- je odvisno od tega, koliko ljudi ligo sploh spremlja.
  v_utez_insider := nastavitev_int_za(
    'utez_insider',
    (select competition_id from players where id = p_player_id),
    3
  );
  -- Zapisnik in admin sta neomajna.
  if exists (
    select 1 from players
    where id = p_player_id and position_source in ('zapisnik','admin')
  ) then
    return;
  end if;

  select team_id into v_team_id from players where id = p_player_id;

  select
    pv.position,
    sum(greatest(
      voter_weight(pv.voter_id),
      case when pf.insider_team_id = v_team_id then v_utez_insider else 1.0 end
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
$function$

;
