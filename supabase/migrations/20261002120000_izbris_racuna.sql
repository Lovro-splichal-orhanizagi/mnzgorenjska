-- Izbris lastnega računa.
--
-- App Store in Google Play zahtevata, da uporabnik, ki si račun ustvari v
-- aplikaciji, lahko račun v njej tudi izbriše (Apple 5.1.1(v), Google Play
-- "Account deletion"). Brisanje ekipe je sicer servisno opravilo, ker bi
-- obšlo zaklenjeno zgodovino — tu je to namen: z računom gredo profil, ekipe
-- z vso zgodovino, glasovi in mini lige, ki jih je ustvaril (vse
-- `on delete cascade`). Potrjene asistence ostanejo, ker so zapisane pri golu.
-- Dnevnik e-pošte ohrani vrstice brez uporabnika (`on delete set null`).

create or replace function public.izbrisi_moj_racun()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  jaz uuid := auth.uid();
begin
  if jaz is null then
    raise exception 'Za izbris računa se prijavi.';
  end if;
  -- Sistemski lastnik hišnih ekip (SLFF) se ne prijavlja; za vsak primer.
  if exists (select 1 from fantasy_teams where owner_id = jaz and hisna) then
    raise exception 'Sistemskega računa ni mogoče izbrisati.';
  end if;
  delete from auth.users where id = jaz;
end;
$$;

revoke all on function public.izbrisi_moj_racun() from public, anon;
grant execute on function public.izbrisi_moj_racun() to authenticated;
