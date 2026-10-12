-- Naslovi naročil značk: poleg 90 dni po pošiljanju ali preklicu velja še
-- zgornja meja 12 mesecev od naročila — naročilo, ki obvisi v za_tisk ali
-- natisnjeno, naslova ne hrani v nedogled.
create or replace function public.preverjen_pocisti_naslove()
returns int language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  update narocila_znack
     set naslov = jsonb_build_object('country', naslov->>'country')
   where ((status in ('poslano', 'preklicano') and coalesce(poslano_at, created_at) < now() - interval '90 days')
          or created_at < now() - interval '12 months')
     and naslov ?| array['name', 'line1', 'line2', 'postal_code', 'city'];
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.preverjen_pocisti_naslove() from public, anon, authenticated;
grant execute on function public.preverjen_pocisti_naslove() to service_role;
