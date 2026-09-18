-- Prijava z Googlom: ime za profil iz Googlovih metapodatkov.
--
-- Nas obrazec poslje `display_name`; Google poslje `given_name`, `name` in
-- `full_name`. Brez tega bi vsak Googlov uporabnik dobil ime iz e-naslova
-- ("jernej.kocica"). Vzamemo samo ime (given_name): profil je javen na
-- lestvici, uporabnik pa si imena sam ne more spremeniti, zato je polno ime
-- preveč, vzdevek iz obrazca pa ima se vedno prednost.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'given_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
