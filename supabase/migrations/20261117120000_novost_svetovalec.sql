-- Obvestilo o Svetovalcu ekipe (SLF-549, za SLF-548): enkraten mail vsakomur z
-- nehišno ekipo v slovenski članski ligi, ki še nima Preverjenega profila.
-- Besedilo je slovensko in ga je 17. 11. 2026 odobril Nejc; za druge jezike
-- odobrenega besedila ni, zato njihove lige niso kandidati.
--
-- Kdo ne pride v poštev: odjavljeni (`brez_opomnikov`), omejeni, nepotrjeni in
-- izbrisani računi, hišni računi, mladinske lige, že preverjeni (račun ali
-- prevzeti igralec), kdor je mail že dobil (en mail na človeka in na naslov za
-- vedno), kdor je dobil tri neuspele poskuse, kdor je v zadnjih treh dneh
-- dobil katerikoli naš promocijski ali obvestilni mail.
-- Dnevno mejo 150 uveljavi funkcija `posli-opomnik` s `novost_svetovalec_danes`.

-- En uspešen mail na človeka (zadnja varovalka ob hkratnih zagonih).
create unique index if not exists email_log_novost_svetovalec_enkrat
  on email_log (user_id)
  where vrsta = 'novost-svetovalec' and napaka is null;

-- Uspešno poslani maili od polnoči po ljubljanskem času.
create or replace function public.novost_svetovalec_danes()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from email_log l
   where l.vrsta = 'novost-svetovalec'
     and l.napaka is null
     and l.poslano_at >= date_trunc('day', now() at time zone 'Europe/Ljubljana') at time zone 'Europe/Ljubljana'
$$;
revoke all on function public.novost_svetovalec_danes() from public, anon, authenticated;
grant execute on function public.novost_svetovalec_danes() to service_role;

create or replace function public.kandidati_za_novost_svetovalec(p_najvec int default 10)
returns table (
  user_id uuid,
  email text,
  display_name text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text
)
language sql
stable
security definer
set search_path = public
as $$
  with k as (
    select u.id as uid, u.email::text as email, p.display_name, u.created_at,
           li.id as lid, li.slug, li.short_name, li.drzava
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
     where u.email is not null and u.email <> ''
       and u.email_confirmed_at is not null
       and u.deleted_at is null
       and (u.banned_until is null or u.banned_until <= now())
       and not p.is_admin
       and not p.brez_opomnikov
       and not je_omejen(u.id)
       and not exists (select 1 from testerji t where t.user_id = u.id)
       and lower(u.email) <> 'hisa@slff.eu'
       and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
       -- Odobreno je slovensko besedilo: samo liga iz Slovenije, nemladinska.
       and coalesce(li.drzava, 'SI') = 'SI'
       and not je_mladinski_slug(li.slug)
       -- Svetovalec je del Preverjenega profila: kdor ga ima, mu ne prodajamo.
       and not exists (select 1 from preverjeni_racuni pr
                        where pr.status = 'aktiven'
                          and (pr.user_id = u.id
                               or pr.player_id in (select z.player_id from zahtevki_igralca z
                                                    where z.user_id = u.id and z.status = 'potrjen')))
       and not exists (select 1 from email_log l where l.user_id = u.id
                         and l.vrsta = 'novost-svetovalec' and l.napaka is null)
       -- En mail na naslov tudi med računi.
       and not exists (select 1 from email_log l where lower(l.email) = lower(u.email)
                         and l.vrsta = 'novost-svetovalec' and l.napaka is null)
       and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'novost-svetovalec') < 3
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'novost-svetovalec'
                         and l.poslano_at > now() - interval '1 day')
       -- Kdor je v zadnjih treh dneh dobil promocijski ali obvestilni mail, počaka.
       and not exists (select 1 from email_log l where l.user_id = u.id and l.napaka is null
                         and l.poslano_at > now() - interval '3 days'
                         and (l.vrsta like 'akcija-vabil%'
                              or l.vrsta in ('promo-preverjen', 'novost-mini-lige', 'pivo-7dni',
                                             'anketa-placila', 'dobrodoslica', 'brez-ekipe', 'liga-zivi')))
  ), r as (
    select k.*, row_number() over (partition by lower(k.email) order by k.created_at, k.uid) as vrstni
      from k
  )
  select r.uid, r.email, r.display_name, r.lid, r.slug, r.short_name, r.drzava
    from r
   where r.vrstni = 1
   order by r.created_at, r.uid
   limit greatest(p_najvec, 0)
$$;
revoke all on function public.kandidati_za_novost_svetovalec(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_novost_svetovalec(int) to service_role;
