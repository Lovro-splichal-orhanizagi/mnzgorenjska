-- Enkratno obvestilo o novih igrah mini lig (26. 10. 2026): dvoboji in
-- napovedi. Mail (in potisno obvestilo) dobi vsak, ki ima nehišno ekipo s
-- kadrom, enkrat za vedno; brez odjavljenih (`brez_opomnikov`), izbrisanih,
-- nepotrjenih in omejenih računov. Jezik in povezave določi zadnja ustvarjena
-- nehišna ekipa (tista liga, ki jo človek trenutno igra).
-- `v_mini_ligi`: ekipa je v mini ligi z vsaj dvema ekipama — tak dobi
-- "Odpri mini ligo", ostali "Ustvari mini ligo in povabi prijatelje".
-- Pošiljanje sproži le delovni tok `novost-mini-lige.yml` (ročno).

create or replace function public.kandidati_za_novost_mini_lig(p_najvec int default 100)
returns table (
  user_id uuid,
  email text,
  display_name text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text,
  v_mini_ligi boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id,
         u.email,
         p.display_name,
         li.id,
         li.slug,
         li.short_name,
         li.drzava,
         exists (
           select 1
             from mini_liga_clani m
             join fantasy_teams f on f.id = m.fantasy_team_id
            where f.owner_id = u.id
              and (select count(*) from mini_liga_clani m2 where m2.mini_liga_id = m.mini_liga_id) >= 2
         )
    from auth.users u
    join profiles p on p.id = u.id
    join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from fantasy_teams f
        join competitions c on c.id = f.competition_id
        left join countries d on d.id = c.country_id
       where f.owner_id = u.id and not f.hisna
         and exists (select 1 from fantasy_roster r where r.fantasy_team_id = f.id)
       order by f.created_at desc, f.id desc
       limit 1
    ) li on true
   where u.email is not null
     and u.email_confirmed_at is not null
     and u.deleted_at is null
     and not p.brez_opomnikov
     and not je_omejen(u.id)
     and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'novost-mini-lige' and l.napaka is null)
     and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'novost-mini-lige') < 3
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'novost-mini-lige'
                       and l.poslano_at > now() - interval '1 day')
   order by u.created_at
   limit greatest(p_najvec, 0)
$$;
revoke all on function public.kandidati_za_novost_mini_lig(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_novost_mini_lig(int) to service_role;
