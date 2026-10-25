-- Lijak "Časti pivo" po viru (SLF-129): `pivo_prikaz` = gumb je bil viden
-- (components/Pivo.tsx), poleg skupnih `pivo` in `pivo_prikaz` pa še ista
-- koraka z virom, npr. `pivo:noga`, `pivo_prikaz:domov`. Viri so le znani
-- (src gumbov v kodi in `okno`), da anonimni klic ne more nasuti poljubnih
-- korakov. Klike iz mailov (`mail-*`) vidi le BMC: gredo naravnost na /pivo.
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
                     'pivo_okno', 'pivo_prikaz')
      or p_korak ~ '^pivo(_prikaz)?:(noga|domov|domov-lestvica|zid|okno)$'
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1
$$;
revoke all on function public.zabelezi_korak(text) from public;
grant execute on function public.zabelezi_korak(text) to anon, authenticated;
