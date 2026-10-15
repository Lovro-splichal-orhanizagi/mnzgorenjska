-- Sestava ekipe brez prijave (src/lib/osnutek.ts): dva nova koraka lijaka.
-- `osnutek_brez_prijave` = neprijavljen je začel sestavljati, `osnutek_shranjen`
-- = po prijavi je shranil ekipo iz osnutka. Le dnevni seštevki, kot ostali.
create or replace function public.zabelezi_korak(p_korak text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into lijak_dnevno (dan, korak, stevilo)
  select current_date, p_korak, 1
   where p_korak in ('prazna_ekipa', 'predlog', 'prva_shramba', 'sestavi_iz_maila', 'pivo',
                     'vodic_zacetek', 'vodic_preskok', 'vodic_konec',
                     'osnutek_brez_prijave', 'osnutek_shranjen')
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1
$$;
revoke all on function public.zabelezi_korak(text) from public;
grant execute on function public.zabelezi_korak(text) to anon, authenticated;
