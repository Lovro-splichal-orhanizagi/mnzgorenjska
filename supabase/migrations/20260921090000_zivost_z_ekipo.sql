-- Zivost: koliko profilov ima vsaj eno ekipo (v katerikoli ligi).
-- 310 od 516 uporabnikov brez ekipe je bila najvecja luknja lijaka; to
-- stevilo mora biti na vrhu admin strani, ne v poizvedbi.
drop function if exists public.admin_zivost();
create function public.admin_zivost()
returns table (
  registriranih int,
  aktivnih_7dni int,
  aktivnih_30dni int,
  z_veljavno_ekipo int,
  prijavljenih_7dni int,
  mini_lig int,
  v_mini_ligah int,
  z_ekipo int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;
  return query
  with dejanja as (
    select voter_id as kdo, created_at as kdaj from assist_votes
    union all select voter_id, created_at from position_votes
    union all select user_id, created_at from chat_messages
    union all select user_id, created_at from player_reports
    union all select owner_id, roster_updated_at from fantasy_teams
     where roster_updated_at is not null
  )
  select
    (select count(*) from auth.users)::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '7 days' and kdo is not null)::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '30 days' and kdo is not null)::int,
    (select count(distinct ft.owner_id) from fantasy_teams ft
      where roster_je_veljaven(ft.id))::int,
    (select count(*) from auth.users
      where last_sign_in_at > now() - interval '7 days')::int,
    (select count(*) from mini_lige)::int,
    (select count(distinct ft.owner_id) from mini_liga_clani c
       join fantasy_teams ft on ft.id = c.fantasy_team_id)::int,
    (select count(distinct owner_id) from fantasy_teams)::int;
end $$;
grant execute on function public.admin_zivost() to authenticated;
