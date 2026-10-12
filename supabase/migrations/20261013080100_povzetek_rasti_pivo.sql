-- Povzetek rasti (vrstica pod poročili na Discord) doda klike na "Časti pivo"
-- (korak `pivo` v lijak_dnevno, zabelezi_korak): skupaj in zadnjih 7 dni.
-- Šteje klike gumba, ne obiskov buymeacoffee.com.

create or replace function public.povzetek_rasti()
returns text
language sql
stable
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.povzetek_rasti() from public, anon, authenticated;
grant execute on function public.povzetek_rasti() to service_role;
