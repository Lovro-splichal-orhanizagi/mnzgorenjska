-- Kdo naj dobi opomnik — berljivo tudi za urnik, ne le za admina.
--
-- `posli-opomnik` obstaja in dela (195 poslanih), a ga sproži GUMB v
-- administraciji. Zato je zadnji opomnik odšel 3. septembra in nato nič —
-- ne zato, ker bi bil pokvarjen, ampak ker ga nihče ni pritisnil. Uporabniki
-- brez ekipe so največje puščanje, v novih ligah pa so to skoraj vsi.
--
-- Seznam bere `admin_uporabniki`, ki zahteva `is_admin()`, ta pa bere
-- `auth.uid()`. Ob klicu s service ključem uporabnika ni, zato urnik po tej
-- poti ne more. Tu je ista poizvedba brez tega pogoja, dostopna SAMO vlogi
-- `service_role` — ta ima tako ali tako vse pravice, zato to ničesar ne
-- odpira; le omogoči, da klic pride od stroja in ne od človeka.
create or replace function kandidati_za_opomnik(p_competition_id bigint)
returns table (user_id uuid, email text, display_name text, team_id bigint)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select u.id, u.email::text, p.display_name, ft.id
    from auth.users u
    left join profiles p on p.id = u.id
    left join fantasy_teams ft
      on ft.owner_id = u.id and ft.competition_id = p_competition_id
   where u.email is not null
     and coalesce(roster_je_veljaven(ft.id), false) = false
   order by u.created_at;
end $$;

comment on function kandidati_za_opomnik(bigint) is
  'Uporabniki brez veljavne ekipe v ligi. Za urnik; človeška pot ostane admin_uporabniki.';

revoke all on function kandidati_za_opomnik(bigint) from public, anon, authenticated;
grant execute on function kandidati_za_opomnik(bigint) to service_role;
