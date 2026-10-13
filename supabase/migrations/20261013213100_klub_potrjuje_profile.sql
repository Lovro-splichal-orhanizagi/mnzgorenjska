-- Klubski računi, faza 2: klubski račun potrjuje profile igralcev svojega
-- kluba, tako kot odobren poznavalec kluba (spec, razdelek 4).
create or replace function public.prevzem_je_poznavalec_kluba(p_user uuid, p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from players p join profiles pf on pf.id = p_user
     where p.id = p_player_id
       and (pf.insider_competition_id = p.competition_id
            or je_klubski_racun(p_user, p.team_id)
            or (pf.insider_team_id = p.team_id
                and exists (select 1 from poznavalec_prosnje pp
                             where pp.user_id = p_user and pp.status = 'klub'
                               and pp.team_id = p.team_id and pp.competition_id = p.competition_id))))
$$;
revoke all on function public.prevzem_je_poznavalec_kluba(uuid, bigint) from public, anon, authenticated;
