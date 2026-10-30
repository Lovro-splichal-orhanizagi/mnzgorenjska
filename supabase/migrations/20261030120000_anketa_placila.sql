-- Anketa "kaj bi plačal" (SLF-211): en oseben mail ljudem, ki jih admin
-- odkljuka v Administraciji (do 20 skupaj), enkrat za vedno. Pošlje ga
-- `posli-opomnik` (vrsta `anketa-placila`, z `user_ids`). Izračunane kohorte
-- ni (Lovro, 30. 10. 2026): strežnik nikogar ne izbere sam.
--
-- Naslovi ne zapustijo strežnika: funkciji sme klicati le service_role, torej
-- edge funkcija; odgovor vmesniku ima le števila in razloge preskoka.

-- Koliko jih je anketo že (uspešno) dobilo; edge funkcija ne pošlje čez 20.
create or replace function public.anketa_placila_poslanih()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct user_id)::int from email_log
   where vrsta = 'anketa-placila' and napaka is null
$$;

revoke all on function public.anketa_placila_poslanih() from public, anon, authenticated;
grant execute on function public.anketa_placila_poslanih() to service_role;

-- Izbor iz administracije (Lovro, 30. 10. 2026): anketo dobijo ljudje, ki jih
-- admin odkljuka v tabeli uporabnikov, ne izračunana kohorta. Značka "brez
-- ekipe" velja le za izbrano ligo, zato ekipa tu ni pogoj. Strežnik še vedno
-- izloči, česar admin v tabeli ne vidi: odjavljene, nepotrjene, izbrisane ali
-- blokirane račune in kdor je anketo že dobil. `razlog` je null, ko gre mail;
-- sicer koda, ki jo vmesnik pokaže ob številu (naslova ne vrne nikomur razen
-- edge funkciji).
--
-- Jezik in liga v email_log: nazadnje urejena nehišna nemladinska ekipa;
-- kdor je nima, dobi ligo, ki je v administraciji izbrana.
create or replace function public.prejemniki_ankete(p_ids uuid[], p_competition_id bigint)
returns table (
  user_id uuid,
  email text,
  display_name text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text,
  razlog text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text, p.display_name,
         coalesce(li.id, iz.id), coalesce(li.slug, iz.slug),
         coalesce(li.short_name, iz.short_name), coalesce(li.drzava, iz.drzava),
         case
           when u.email is null then 'brez_naslova'
           when u.email_confirmed_at is null or u.deleted_at is not null
             or (u.banned_until is not null and u.banned_until > now()) then 'neaktiven_racun'
           when coalesce(p.brez_opomnikov, false) then 'odjavljen'
           when exists (select 1 from email_log l where l.user_id = u.id
                          and l.vrsta = 'anketa-placila' and l.napaka is null) then 'ze_dobil'
           when (select count(*) from email_log l where l.user_id = u.id
                   and l.vrsta = 'anketa-placila') >= 3 then 'trije_neuspeli'
         end
    from auth.users u
    join profiles p on p.id = u.id
    left join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from fantasy_teams f
        join competitions c on c.id = f.competition_id
        left join countries d on d.id = c.country_id
       where f.owner_id = u.id and not f.hisna and not je_mladinski_slug(c.slug)
       order by f.roster_updated_at desc nulls last, f.created_at, f.id
       limit 1
    ) li on true
    left join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from competitions c
        left join countries d on d.id = c.country_id
       where c.id = p_competition_id
    ) iz on true
   where u.id = any(p_ids)
$$;

revoke all on function public.prejemniki_ankete(uuid[], bigint) from public, anon, authenticated;
grant execute on function public.prejemniki_ankete(uuid[], bigint) to service_role;
