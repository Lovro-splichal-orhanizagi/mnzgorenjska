-- Klik na gumb "Časti pivo" (components/Pivo.tsx) kot korak v lijak_dnevno: le
-- dnevni seštevek, brez uporabnika. Admin ga vidi v razdelku lijaka. Dejanski
-- nakup sporoči Buy Me a Coffee prek funkcije bmc-pivo na Discord.
create or replace function public.zabelezi_korak(p_korak text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into lijak_dnevno (dan, korak, stevilo)
  select current_date, p_korak, 1
   where p_korak in ('prazna_ekipa', 'predlog', 'prva_shramba', 'sestavi_iz_maila', 'pivo')
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1
$$;
revoke all on function public.zabelezi_korak(text) from public;
grant execute on function public.zabelezi_korak(text) to anon, authenticated;
