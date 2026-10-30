-- "Profil je potrjen" je 30. 10. 2026 dobilo 100 ljudi do 36-krat: vsaka
-- potrditev v adminu sproži `posli-prevzem {obvesti}`, vsi hkratni klici so
-- prebrali iste neobveščene in vsak je poslal vsem, zaznamek je prišel šele
-- po pošiljanju. Zdaj klic zahtevek najprej zakupi (en sam uspe), nato pošlje;
-- ob napaki pošiljanja ga sprosti, da ga naslednji klic poskusi znova.
create or replace function public.prevzem_zakupi_obvestilo(p_zahtevek_id bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  with z as (
    update zahtevki_igralca set obvescen_at = now()
     where id = p_zahtevek_id and status = 'potrjen' and obvescen_at is null
    returning 1
  )
  select exists (select 1 from z);
$$;
revoke all on function public.prevzem_zakupi_obvestilo(bigint) from public, anon, authenticated;
grant execute on function public.prevzem_zakupi_obvestilo(bigint) to service_role;

create or replace function public.prevzem_sprosti_obvestilo(p_zahtevek_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update zahtevki_igralca set obvescen_at = null
   where id = p_zahtevek_id and status = 'potrjen';
$$;
revoke all on function public.prevzem_sprosti_obvestilo(bigint) from public, anon, authenticated;
grant execute on function public.prevzem_sprosti_obvestilo(bigint) to service_role;
