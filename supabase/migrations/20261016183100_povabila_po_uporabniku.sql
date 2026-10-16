-- Za Admin → Prevzemi: koliko prijateljev je vsak povabil in koliko jih še
-- nima ekipe. Ob značko "pripeljal N" (le tisti z ekipo, ki štejejo za vrsto)
-- pokaže tudi "povabil N (brez ekipe M)".

create function public.admin_povabila_po_uporabniku()
returns table (user_id uuid, povabil int, brez_ekipe int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select pv.povabil,
         count(*)::int,
         count(*) filter (where not exists (
           select 1 from fantasy_teams ft where ft.owner_id = pv.povabljeni and not ft.hisna))::int
    from povabila pv
   group by pv.povabil;
end;
$$;

revoke all on function public.admin_povabila_po_uporabniku() from public, anon;
grant execute on function public.admin_povabila_po_uporabniku() to authenticated;
