-- SLF-462: človek, ki je ekipo v ligi ustvaril po pomoti (npr. Druga kadetska
-- liga), jo sme izbrisati — a le, dokler ni dobila nobene točke.
--
-- Neposredno brisanje fantasy_teams je odvzeto (20260913100000: CASCADE bi
-- obšel zaklep pripomočkov in zgodovine), zato gre le prek te funkcije.
-- Zbriše vrstico ekipe; prek CASCADE odidejo njen kader, postave, menjave,
-- pripomočki, članstva v mini ligah in posnetki krogov. Podatkov drugih ljudi
-- se ne dotakne. Ekipa, ki je že štela točke, ostane (primer za podporo).
create or replace function public.izbrisi_mojo_ekipo(p_ekipa bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lastnik uuid;
  v_hisna boolean;
begin
  if auth.uid() is null then
    raise exception 'Za brisanje ekipe se je treba prijaviti.' using errcode = '42501';
  end if;

  select owner_id, hisna into v_lastnik, v_hisna
    from fantasy_teams
   where id = p_ekipa
     for update;
  if not found or v_lastnik is distinct from auth.uid() then
    raise exception 'Ekipo lahko izbriše le njen lastnik.' using errcode = '42501';
  end if;
  if v_hisna then
    raise exception 'Hišne ekipe ni mogoče izbrisati.' using errcode = '42501';
  end if;

  -- Ekipa je zdaj "po pomoti" le, če ni štela nobene točke, menjave ali kazni.
  if exists (
    select 1 from tocke_krogov
     where fantasy_team_id = p_ekipa
       and (points <> 0 or transfers <> 0 or penalty <> 0)
  ) then
    raise exception 'Ekipa ima že točke, zato je ne moreš izbrisati. Piši podpori.'
      using errcode = 'P0001', hint = 'ekipa_ima_tocke';
  end if;

  delete from fantasy_teams where id = p_ekipa;
end;
$$;

revoke all on function public.izbrisi_mojo_ekipo(bigint) from public, anon, authenticated;
grant execute on function public.izbrisi_mojo_ekipo(bigint) to authenticated, service_role;
