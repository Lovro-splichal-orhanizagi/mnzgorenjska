-- Lijak akcije vabil: okno vabila (`poziv_vabilo`, klik `poziv_vabilo_klik`)
-- in pasica pod navigacijo (`pasica_vabila`, klik, zaprta). Isti podpis in
-- seznam kot 20261114190000, dodani le ti koraki.
create or replace function public.zabelezi_korak(p_korak text, p_platforma text default null, p_osebno boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_korak not in ('prazna_ekipa', 'predlog', 'prva_shramba', 'sestavi_iz_maila', 'pivo',
                     'vodic_zacetek', 'vodic_preskok', 'vodic_konec',
                     'osnutek_brez_prijave', 'osnutek_shranjen', 'igralec_cta', 'kartica_deljena',
                     'pivo_okno', 'pivo_okno_ekipa', 'pivo_okno_krog', 'pivo_klik_ekipa', 'pivo_klik_krog',
                     'pivo_okno_zaprto', 'push_pas', 'push_pas_zaprt', 'push_dovoljeno', 'push_zavrnjeno',
                     'aplikacija_odprta', 'poziv_aplikacija', 'poziv_aplikacija_klik',
                     'poziv_sledi', 'poziv_sledi_klik', 'poziv_zaprt', 'pivo_prikaz',
                     'poziv_vabilo', 'poziv_vabilo_klik', 'pasica_vabila', 'pasica_vabila_klik', 'pasica_vabila_zaprta')
     and p_korak !~ '^pivo(_prikaz)?:(noga|domov|domov-lestvica|zid)$' then
    return;
  end if;

  insert into lijak_dnevno (dan, korak, stevilo)
  values (current_date, p_korak, 1)
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1;

  -- Isto dejanje istega človeka največ enkrat na minuto (osvežitve, zanke).
  if p_osebno and auth.uid() is not null and not exists (
    select 1 from dejanja_uporabnikov
     where user_id = auth.uid() and dejanje = p_korak and created_at > now() - interval '1 minute'
  ) then
    insert into dejanja_uporabnikov (user_id, dejanje, platforma)
    values (auth.uid(), p_korak, case when p_platforma in ('web', 'ios', 'android') then p_platforma end);
  end if;
end;
$$;
revoke all on function public.zabelezi_korak(text, text, boolean) from public;
grant execute on function public.zabelezi_korak(text, text, boolean) to anon, authenticated;
