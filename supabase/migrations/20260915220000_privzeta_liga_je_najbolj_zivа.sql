-- Privzeta liga za opomnik naj bo NAJBOLJ ŽIVA, ne prva po vrsti.
--
-- Prva različica je vzela ligo z najnižjim `sort_order`. To je 1. SNL — ne
-- ker bi bila najbolj primerna, ampak ker sem državne lige postavil na vrh
-- izbirnika. 195 ljudi, ki so se prijavili ob Gorenjski in ekipe niso nikoli
-- sestavili, bi tako dobilo vabilo v 1. SNL. Tehnično pravilno, vsebinsko
-- napačno.
--
-- Vrstni red v izbirniku je okrasek; kam človeka povabiti, je vsebina. Zato
-- vzamemo ligo z največ ekipami — tja gre največ ljudi in tam bo imel
-- največ nasprotnikov. Merilo se popravlja samo: ko katera od novih lig
-- prehiti, se privzeta premakne brez posega v kodo.
create or replace function kandidati_za_opomnik(p_competition_id bigint)
returns table (user_id uuid, email text, display_name text, team_id bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_privzeta bigint;
begin
  select c.id into v_privzeta
    from competitions c
    left join fantasy_teams ft on ft.competition_id = c.id
   where c.active
   group by c.id, c.sort_order
   order by count(ft.id) desc, c.sort_order, c.id
   limit 1;

  return query
  with brez as (
    select u.id, u.email::text as email, p.display_name
      from auth.users u
      left join profiles p on p.id = u.id
     where u.email is not null
       and not exists (
         select 1 from fantasy_teams ft
          where ft.owner_id = u.id and coalesce(roster_je_veljaven(ft.id), false))
  ),
  domaca as (
    select b.id, b.email, b.display_name,
           coalesce(
             (select ft.competition_id from fantasy_teams ft
               join competitions c on c.id = ft.competition_id and c.active
              where ft.owner_id = b.id order by ft.created_at limit 1),
             v_privzeta
           ) as liga,
           (select ft.id from fantasy_teams ft
             where ft.owner_id = b.id order by ft.created_at limit 1) as ekipa
      from brez b
  )
  select d.id, d.email, d.display_name, d.ekipa
    from domaca d
   where d.liga = p_competition_id;
end $$;

revoke all on function kandidati_za_opomnik(bigint) from public, anon, authenticated;
grant execute on function kandidati_za_opomnik(bigint) to service_role;
