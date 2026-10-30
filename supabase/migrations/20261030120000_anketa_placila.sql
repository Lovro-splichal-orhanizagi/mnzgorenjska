-- Anketa "kaj bi plačal" (SLF-211): en oseben mail 20 res aktivnim
-- uporabnikom iz različnih držav, enkrat za vedno. Pošlje ga `posli-opomnik`
-- (vrsta `anketa-placila`), sproži ročni delovni tok `anketa-placila.yml`.
--
-- Naslovi ne zapustijo strežnika: `kandidati_za_anketo` (z e-pošto) sme klicati
-- le service_role, torej edge funkcija. Suhi tek vrne le predogled (država,
-- jezik, dnevi, dejanja; brez id-jev, imen in naslovov; repozitorij in dnevniki
-- delovnih tokov so javni) in kratek odtis kohorte, ki ga mora zagon s
-- pošiljanjem ponoviti.
--
-- Aktivnost (zadnjih 30 dni) je ista kot v `admin_tedenska_aktivnost`:
-- glasovi za asistence in pozicije, klepet, javljene odsotnosti, urejanje
-- nehišne ekipe (`roster_updated_at` je le zadnja sprememba, zato šteje kot
-- en dan). Obiski strani in registracije ne štejejo. Razvrstitev: različni
-- aktivni dnevi, nato število dejanj; najmanj `p_min_dni` dni.
--
-- Kdo NE: admini, lastniki hišnih ekip, kdor igra le v mladinskih ligah,
-- odjavljeni (`profiles.brez_opomnikov`), nepotrjen, izbrisan ali blokiran
-- račun, naslovi @slff.eu (naši in testni računi) in kdor je anketo že dobil
-- (uspešna vrstica `email_log` 'anketa-placila') ali ima za seboj tri
-- neuspele poskuse.
--
-- Države: vsak dobi državo lige svoje nazadnje urejene nehišne nemladinske
-- ekipe. Najprej najaktivnejši iz vsake države, nato drugi iz vsake … dokler
-- ni `p_najvec` ljudi; največ `p_na_drzavo` iz ene države.
create or replace function public.kandidati_za_anketo(
  p_najvec int default 20,
  p_na_drzavo int default 3,
  p_min_dni int default 3
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text,
  aktivnih_dni int,
  dejanj int
)
language sql
stable
security definer
set search_path = public
as $$
  with dejanja as (
    select voter_id as kdo, created_at as kdaj from assist_votes
    union all
    select voter_id, created_at from position_votes
    union all
    select user_id, created_at from chat_messages
    union all
    select user_id, created_at from player_reports
    union all
    select owner_id, roster_updated_at from fantasy_teams
     where roster_updated_at is not null and not hisna
  ),
  aktivni as (
    select kdo,
           count(distinct (kdaj at time zone 'UTC')::date)::int as dni,
           count(*)::int as n
      from dejanja
     where kdo is not null and kdaj > now() - interval '30 days'
     group by kdo
    having count(distinct (kdaj at time zone 'UTC')::date) >= p_min_dni
  ),
  upraviceni as (
    select u.id, u.email::text as email, p.display_name, a.dni, a.n,
           li.id as competition_id, li.slug, li.short_name, li.drzava
      from aktivni a
      join auth.users u on u.id = a.kdo
      join profiles p on p.id = u.id
      join lateral (
        select c.id, c.slug, c.short_name, d.code as drzava
          from fantasy_teams f
          join competitions c on c.id = f.competition_id
          left join countries d on d.id = c.country_id
         where f.owner_id = u.id and not f.hisna and not je_mladinski_slug(c.slug)
         order by f.roster_updated_at desc nulls last, f.created_at, f.id
         limit 1
      ) li on true
     where u.email is not null
       and u.email_confirmed_at is not null
       and u.deleted_at is null
       and (u.banned_until is null or u.banned_until < now())
       and lower(u.email) not like '%@slff.eu'
       and not coalesce(p.is_admin, false)
       and not coalesce(p.brez_opomnikov, false)
       and not exists (select 1 from fantasy_teams h where h.owner_id = u.id and h.hisna)
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'anketa-placila' and l.napaka is null)
       and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'anketa-placila') < 3
  ),
  po_drzavi as (
    select *, row_number() over (partition by coalesce(drzava, '?') order by dni desc, n desc, id) as mesto
      from upraviceni
  )
  select id, email, display_name, competition_id, slug, short_name, drzava, dni, n
    from po_drzavi
   where mesto <= greatest(p_na_drzavo, 1)
   order by mesto, dni desc, n desc, id
   limit greatest(p_najvec, 0)
$$;

revoke all on function public.kandidati_za_anketo(int, int, int) from public, anon, authenticated;
grant execute on function public.kandidati_za_anketo(int, int, int) to service_role;

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
