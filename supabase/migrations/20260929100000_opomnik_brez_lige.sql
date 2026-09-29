-- Opomnik brez ekipe: jezik prijave namesto privzete lige.
--
-- Kdor nima nobene ekipe, pripade "privzeti" ligi (najbolj živi) in je dobil
-- mail "V 1. GNL še nimaš ekipe" s povezavo na Gorenjsko. 29. 9. je bilo takih
-- 535 od 563 kandidatov, 175 prijavljenih v zadnjem tednu — večina iz drugih
-- lig. Zanje edge funkcija zdaj pošlje mail brez lige (izberi svojo ligo), v
-- jeziku prijave: `jezik` iz metapodatkov uporabnika (20260928153000).
--
-- Vrnjeni stolpci se spremenijo, zato drop + create.

drop function public.kandidati_za_opomnik(bigint);

create function public.kandidati_za_opomnik(p_competition_id bigint)
 RETURNS TABLE(user_id uuid, email text, display_name text, team_id bigint, jezik text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    select u.id, u.email::text as email, p.display_name,
           u.raw_user_meta_data->>'jezik' as jezik
      from auth.users u
      left join profiles p on p.id = u.id
     where u.email is not null
       -- Novo: odjavljeni od opomnikov.
       and not coalesce(p.brez_opomnikov, false)
       and not exists (
         select 1 from fantasy_teams ft
          where ft.owner_id = u.id and coalesce(roster_je_veljaven(ft.id), false))
  ),
  domaca as (
    select b.id, b.email, b.display_name, b.jezik,
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
  select d.id, d.email, d.display_name, d.ekipa, d.jezik
    from domaca d
   where d.liga = p_competition_id;
end $function$;

revoke all on function public.kandidati_za_opomnik(bigint) from public, anon, authenticated;
grant execute on function public.kandidati_za_opomnik(bigint) to service_role;
