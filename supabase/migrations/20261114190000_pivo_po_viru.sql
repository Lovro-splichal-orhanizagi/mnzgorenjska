-- Lijak "Časti pivo" po viru (SLF-129): `pivo_prikaz` = gumb je bil vsaj pol
-- viden (components/Pivo.tsx), poleg skupnih `pivo` in `pivo_prikaz` pa še
-- ista koraka z virom, npr. `pivo:noga`, `pivo_prikaz:domov`. Viri so le
-- znani (`<Pivo src>` v kodi), da anonimni klic ne more nasuti poljubnih
-- korakov. Okno ima svoje korake (`pivo_okno_<povod>`, `pivo_klik_<povod>`).
-- Klike iz mailov (`mail-*`) vidi le BMC: gredo naravnost na /pivo.
--
-- Ista podpis kot v 20261030180000 (zamenja, ne doda preobremenitve); seznam
-- in osebni zapis ostaneta, dodana sta le `pivo_prikaz` in koraki z virom.
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
                     'poziv_sledi', 'poziv_sledi_klik', 'poziv_zaprt', 'pivo_prikaz')
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
