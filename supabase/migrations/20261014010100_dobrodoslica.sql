-- Dobrodošlica: dan po registraciji mail in push "sestavi ekipo" tistim, ki
-- ekipe še nimajo (ali je prazna). Pregled 13. 10. 2026: od 1700 registracij v
-- tednu jih je ekipo sestavilo 45 %; Moja ekipa je imela 4100 obiskov novih,
-- shramb pa 840. Enkrat na človeka (uspešna vrstica `email_log` 'dobrodoslica';
-- neuspela se ponovi, največ trikrat),
-- registracija med 20 urami in 7 dnevi nazaj (prvi zagon zajame zaostanek),
-- potrjen naslov, ne v treh dneh po ročnem opomniku. Jezik: ob registraciji
-- (`jezik`), sicer država prve (prazne) ekipe ali kluba, ki mu navija; funkcija
-- brez obojega piše v angleščini. Kliče jo urnik prek `posli-opomnik`.
create or replace function public.kandidati_za_dobrodoslico(p_najvec int default 100)
returns table (
  user_id uuid,
  email text,
  display_name text,
  jezik text,
  drzava text,
  email_vklop boolean,
  push_vklop boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id,
         u.email,
         p.display_name,
         u.raw_user_meta_data->>'jezik',
         coalesce(
           (select d.code from fantasy_teams f
              join competitions c on c.id = f.competition_id
              join countries d on d.id = c.country_id
             where f.owner_id = u.id and not f.hisna
             order by f.created_at limit 1),
           (select d.code from teams t join countries d on d.id = t.country_id
             where t.id = p.navijam_team_id)),
         not p.brez_opomnikov,
         not p.brez_push and exists (select 1 from push_tokens pt where pt.user_id = u.id)
    from auth.users u
    join profiles p on p.id = u.id
   where u.created_at between now() - interval '7 days' and now() - interval '20 hours'
     and u.email_confirmed_at is not null
     and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
     and not exists (select 1 from fantasy_teams f join fantasy_roster r on r.fantasy_team_id = f.id
                      where f.owner_id = u.id and not f.hisna)
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'dobrodoslica' and l.napaka is null)
     and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'dobrodoslica') < 3
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'opomnik-ekipa'
                       and l.poslano_at > now() - interval '3 days')
     and (not p.brez_opomnikov
          or (not p.brez_push and exists (select 1 from push_tokens pt where pt.user_id = u.id)))
   order by u.created_at
   limit greatest(p_najvec, 0)
$$;

revoke all on function public.kandidati_za_dobrodoslico(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_dobrodoslico(int) to service_role;
