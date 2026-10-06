-- Lijak začetka: koliko ljudi pride do prazne Moje ekipe, pritisne
-- "Sestavi mi ekipo" in prvič shrani.
--
-- 4. 10. 2026 je bilo od 1447 registriranih 829 brez ekipe, in nismo vedeli,
-- kje odnehajo. Le dnevni seštevki po koraku (kot `sponsor_stats`), brez
-- uporabnika, naprave ali naslova — za odločitve o vmesniku zadošča.

create table if not exists public.lijak_dnevno (
  dan date not null default current_date,
  korak text not null,
  stevilo int not null default 0,
  primary key (dan, korak)
);

alter table public.lijak_dnevno enable row level security;
-- Bere le admin; piše le funkcija spodaj.
create policy lijak_admin_bere on public.lijak_dnevno for select using (public.is_admin());

create or replace function public.zabelezi_korak(p_korak text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into lijak_dnevno (dan, korak, stevilo)
  select current_date, p_korak, 1
   where p_korak in ('prazna_ekipa', 'predlog', 'prva_shramba', 'sestavi_iz_maila')
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1
$$;

revoke all on function public.zabelezi_korak(text) from public;
grant execute on function public.zabelezi_korak(text) to anon, authenticated;
