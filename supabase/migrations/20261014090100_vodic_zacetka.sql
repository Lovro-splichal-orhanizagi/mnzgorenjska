-- Vodič za novince na Moji ekipi (src/lib/vodic.ts): trije novi koraki lijaka,
-- da se vidi, ali vodenje pripelje več ljudi do shranjene ekipe. Le dnevni
-- seštevki, brez uporabnika (kot ostali koraki).
create or replace function public.zabelezi_korak(p_korak text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into lijak_dnevno (dan, korak, stevilo)
  select current_date, p_korak, 1
   where p_korak in ('prazna_ekipa', 'predlog', 'prva_shramba', 'sestavi_iz_maila', 'pivo',
                     'vodic_zacetek', 'vodic_preskok', 'vodic_konec')
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1
$$;
revoke all on function public.zabelezi_korak(text) from public;
grant execute on function public.zabelezi_korak(text) to anon, authenticated;
