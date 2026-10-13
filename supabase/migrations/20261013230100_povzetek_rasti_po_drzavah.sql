-- Povzetek rasti (vrstica pod poročili na Discord) dobi še vrstico na državo:
-- uporabniki (z vsaj eno človeško ekipo v ligi države; isti človek šteje v
-- vsaki državi, kjer igra), novi v 7 dneh, ekipe, nove ekipe v 7 dneh in
-- aktivne lige. Država je država lige — uporabnik sam države nima. Na koncu
-- še uporabniki brez ekipe. Države brez aktivne lige in brez ekip izpusti.

create or replace function public.povzetek_rasti()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with ekipe as (
    select c.country_id, f.owner_id, f.created_at, u.created_at as registriran
      from fantasy_teams f
      join competitions c on c.id = f.competition_id
      join auth.users u on u.id = f.owner_id
     where not f.hisna
  ),
  po_drzavah as (
    select d.code, d.sort_order,
           (select count(distinct owner_id) from ekipe e where e.country_id = d.id) as uporabniki,
           (select count(distinct owner_id) from ekipe e where e.country_id = d.id
               and e.registriran > now() - interval '7 days') as novi,
           (select count(*) from ekipe e where e.country_id = d.id) as st_ekip,
           (select count(*) from ekipe e where e.country_id = d.id
               and e.created_at > now() - interval '7 days') as nove_ekipe,
           (select count(*) from competitions c where c.country_id = d.id and c.active) as lige
      from countries d
  )
  select format('👥 %s uporabnikov (+%s v 7 dneh) · ⚽ %s ekip · 🏆 %s aktivnih lig · 📱 iOS %s · Android %s · 🍺 %s klikov na pivo (+%s v 7 dneh)',
    skupaj_uporabnikov(),
    (select count(*) from profiles p join auth.users u on u.id = p.id
      where u.created_at > now() - interval '7 days'
        and not exists (select 1 from fantasy_teams f where f.owner_id = p.id and f.hisna)),
    (select count(*) from fantasy_teams where not hisna),
    (select count(*) from competitions where active),
    coalesce((select skupaj from trgovine_dnevno where trgovina = 'ios' order by dan desc limit 1)::text, '–'),
    coalesce((select skupaj from trgovine_dnevno where trgovina = 'android' order by dan desc limit 1)::text, '–'),
    (select coalesce(sum(stevilo), 0) from lijak_dnevno where korak = 'pivo'),
    (select coalesce(sum(stevilo), 0) from lijak_dnevno where korak = 'pivo' and dan > current_date - 7))
  || coalesce(E'\n' || (
    select string_agg(format('%s %s · 👥 %s (+%s) · ⚽ %s (+%s) · 🏆 %s',
             chr(127397 + ascii(substr(code, 1, 1))) || chr(127397 + ascii(substr(code, 2, 1))),
             code, uporabniki, novi, st_ekip, nove_ekipe, lige),
           E'\n' order by uporabniki desc, st_ekip desc, sort_order, code)
      from po_drzavah
     where lige > 0 or st_ekip > 0), '')
  || format(E'\n👤 brez ekipe: %s',
    (select count(*) from profiles p
      where not exists (select 1 from fantasy_teams f where f.owner_id = p.id)))
$$;

revoke all on function public.povzetek_rasti() from public, anon, authenticated;
grant execute on function public.povzetek_rasti() to service_role;
