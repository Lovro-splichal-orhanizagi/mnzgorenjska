-- Prikazno ime hišne ekipe se imenuje display_name, tako kot prikazna imena profilov.
-- Preimenovanje ohrani podatke, omejitev, pravice stolpca in reference pogledov.
alter table public.fantasy_teams rename column fake_name to display_name;
alter table public.fantasy_teams
  rename constraint fantasy_teams_fake_name_hisna to fantasy_teams_display_name_hisna;

-- Telo PL/pgSQL se pri preimenovanju stolpca ne prepiše samodejno.
create or replace function public.dodeli_ime_hisnega_lastnika() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.hisna and new.display_name is null then
    new.display_name := ime_hisnega_lastnika(new.id, new.competition_id);
  end if;
  return new;
end;
$$;
