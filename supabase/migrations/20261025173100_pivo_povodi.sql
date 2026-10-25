-- Okno "Časti pivo" se pokaže ob povodu (src/lib/pivoNavdusenje.ts): po
-- shranjeni ekipi (`ekipa`) ali po dobrem krogu (`krog`). Lijak loči prikaze
-- (`pivo_okno_<povod>`) in klike iz okna (`pivo_klik_<povod>`); `pivo_okno`
-- in `pivo` še naprej štejeta vse. Le dnevni seštevki, kot ostali.
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
                     'osnutek_brez_prijave', 'osnutek_shranjen', 'igralec_cta', 'kartica_deljena',
                     'pivo_okno', 'pivo_okno_ekipa', 'pivo_okno_krog', 'pivo_klik_ekipa', 'pivo_klik_krog')
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1
$$;
revoke all on function public.zabelezi_korak(text) from public;
grant execute on function public.zabelezi_korak(text) to anon, authenticated;
