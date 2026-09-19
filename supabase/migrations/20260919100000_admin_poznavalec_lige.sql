-- Admin dodeli ali odvzame poznavalca lige.
--
-- `insider_competition_id` namerno ni v grant update za authenticated (glej
-- 20260919090000) — tudi admin je authenticated, zato potrebuje SECURITY
-- DEFINER klic z izrecnim is_admin(). Seznam uporabnikov v administraciji
-- ob tem pokaze, kdo je poznavalec katere lige.

-- p_competition_id null = odvzem.
create or replace function public.admin_nastavi_poznavalca(
  p_user_id uuid,
  p_competition_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko dodeli poznavalca lige.';
  end if;
  update profiles
     set insider_competition_id = p_competition_id
   where id = p_user_id;
end;
$$;
grant execute on function public.admin_nastavi_poznavalca(uuid, bigint) to authenticated;

-- Isti seznam kot doslej, plus liga, ki jo uporabnik pozna.
drop function if exists public.admin_uporabniki(bigint);
create function public.admin_uporabniki(p_competition_id bigint default null)
returns table (
  user_id uuid,
  email text,
  display_name text,
  registered_at timestamptz,
  is_admin boolean,
  team_id bigint,
  team_name text,
  roster_stevilo int,
  ekipa_veljavna boolean,
  insider_competition_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere uporabnike.';
  end if;

  return query
  select
    u.id                                                       as user_id,
    u.email::text                                              as email,
    p.display_name                                             as display_name,
    u.created_at                                               as registered_at,
    coalesce(p.is_admin, false)                                as is_admin,
    ft.id                                                      as team_id,
    ft.name                                                    as team_name,
    coalesce(
      (select count(*)::int
         from fantasy_roster fr
         where fr.fantasy_team_id = ft.id),
      0
    )                                                          as roster_stevilo,
    coalesce(roster_je_veljaven(ft.id), false)                 as ekipa_veljavna,
    p.insider_competition_id                                   as insider_competition_id
  from auth.users u
  left join profiles p on p.id = u.id
  left join fantasy_teams ft
    on ft.owner_id = u.id
   and (p_competition_id is null or ft.competition_id = p_competition_id)
  order by u.created_at;
end;
$$;
grant execute on function public.admin_uporabniki(bigint) to authenticated;
