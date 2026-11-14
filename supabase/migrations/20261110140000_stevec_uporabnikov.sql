-- Števec uporabnikov na naslovnici (pot do 10.000): le skupno število
-- računov, brez kakršnih koli podatkov o osebah.
create or replace function public.stevec_uporabnikov()
returns bigint language sql stable security definer set search_path = public
as $$
  select count(*) from profiles;
$$;
revoke all on function public.stevec_uporabnikov() from public;
grant execute on function public.stevec_uporabnikov() to anon, authenticated;
