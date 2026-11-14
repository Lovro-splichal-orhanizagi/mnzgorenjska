-- Promocijski mail "Preverjen profil" (SLF-383): enkrat, od info@slff.eu,
-- odraslim lastnikom POTRJENEGA prevzema profila, ki so res aktivni. Ločeno od
-- ankete plačila (SLF-211), ki ostane, kot je.
--
-- Kdo pride v poštev (`promo_preverjen_kohorta`, vsak potrjen prevzem dobi
-- razlog ali null): potrjen, neizbrisan, neomejen račun z naslovom; ne admin,
-- preizkuševalec ali lastnik hišne ekipe; brez `brez_opomnikov`; odrasla oseba
-- (`izlozba_odrasla_oseba`: nobena vrstica osebe ni mladinska ali
-- anonimizirana); še ni preverjen; aktiven v zadnjih 60 dneh (prijava ali
-- sprememba kadra nehišne ekipe); ni dobil ankete plačila (SLF-211) in v 14
-- dneh nobenega drugega enkratnega maila; en mail na naslov. Največ 500 skupaj.
--
-- Pošiljanje gre le po PAKETIH do 20 ljudi (`promo_preverjen_paketi`):
-- paket zamrzne strežnik, agent vidi le id paketa in števila. Pošlje ga
-- edge funkcija šele z imenom odobritelja (Lovro, Nejc ali Luka), povezavo do
-- odobritve in zgoščeno vrednostjo osnutka, ki ga je odobril; ob pošiljanju
-- vsakega še enkrat preveri po istem pravilu. Odjava: obstoječi žeton
-- (`zeton_odjave` → /reminders, `brez_opomnikov`) in glava List-Unsubscribe.

create table public.promo_preverjen_paketi (
  id           bigint generated always as identity primary key,
  user_ids     uuid[] not null check (cardinality(user_ids) between 1 and 20),
  created_at   timestamptz not null default now(),
  -- Kdo je odobril osnutek in ta seznam (Lovro, Nejc, Luka) in kje (Discord).
  odobril      text check (odobril in ('Lovro', 'Nejc', 'Luka')),
  odobritev    text check (odobritev is null or length(odobritev) <= 300),
  osnutek_sha  text check (osnutek_sha is null or osnutek_sha ~ '^[0-9a-f]{64}$'),
  odobren_at   timestamptz,
  check ((odobril is null) = (odobren_at is null))
);
comment on table public.promo_preverjen_paketi is
  'Paketi promocijskega maila Preverjen profil (SLF-383), do 20 uporabnikov. Piše le service_role.';
alter table public.promo_preverjen_paketi enable row level security;
revoke all on public.promo_preverjen_paketi from public, anon, authenticated;

insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.promo_preverjen_paketi', 'seznami prejemnikov promocijskega maila (user_id)')
on conflict (tabela) do nothing;

-- En uspešen ali tekoč mail na človeka (kot anketa plačila).
create unique index if not exists email_log_promo_preverjen_enkrat
  on email_log (user_id)
  where vrsta = 'promo-preverjen' and (napaka is null or napaka = 'poteka');

create or replace function public.promo_preverjen_kohorta()
returns table (
  user_id uuid,
  email text,
  display_name text,
  player_id bigint,
  liga_slug text,
  drzava text,
  aktiven_at timestamptz,
  razlog text
)
language sql
stable
security definer
set search_path = public
as $$
  with z as (
    select z.user_id, z.player_id, c.slug as liga_slug, d.code as drzava
      from zahtevki_igralca z
      join players pl on pl.id = z.player_id
      join competitions c on c.id = pl.competition_id
      left join countries d on d.id = c.country_id
     where z.status = 'potrjen'
  ), r as (
    select z.user_id, u.email::text as email, p.display_name, z.player_id, z.liga_slug, z.drzava,
           greatest(u.last_sign_in_at,
                    (select max(f.roster_updated_at) from fantasy_teams f
                      where f.owner_id = z.user_id and not f.hisna)) as aktiven_at,
           case
             when u.id is null or u.email is null or u.email = '' then 'brez_naslova'
             when u.email_confirmed_at is null or u.deleted_at is not null
               or (u.banned_until is not null and u.banned_until > now()) then 'neaktiven_racun'
             when p.is_admin then 'admin'
             when exists (select 1 from testerji t where t.user_id = z.user_id) then 'tester'
             when lower(u.email) = 'hisa@slff.eu'
               or exists (select 1 from fantasy_teams f where f.owner_id = z.user_id and f.hisna) then 'hisa'
             when je_omejen(z.user_id) then 'omejen'
             when coalesce(p.brez_opomnikov, false) then 'odjavljen'
             when not izlozba_odrasla_oseba(z.player_id) then 'ni_odrasla_oseba'
             when exists (select 1 from preverjeni_racuni pr
                           where (pr.user_id = z.user_id or pr.player_id = z.player_id)
                             and pr.status = 'aktiven') then 'ze_preverjen'
             when exists (select 1 from email_log l where l.user_id = z.user_id
                            and l.vrsta = 'promo-preverjen' and l.napaka is null) then 'ze_dobil'
             when exists (select 1 from email_log l where l.user_id = z.user_id
                            and l.vrsta = 'promo-preverjen' and l.napaka = 'poteka') then 'v_teku'
             -- En mail na naslov tudi med računi: drug račun z istim naslovom ga je že dobil.
             when exists (select 1 from email_log l where l.user_id <> z.user_id
                            and lower(l.email) = lower(u.email) and l.vrsta = 'promo-preverjen'
                            and (l.napaka is null or l.napaka = 'poteka')) then 'naslov_ze_dobil'
             when (select count(*) from email_log l where l.user_id = z.user_id
                     and l.vrsta = 'promo-preverjen') >= 3 then 'trije_neuspeli'
             when exists (select 1 from email_log l where l.user_id = z.user_id
                            and l.vrsta = 'anketa-placila'
                            and (l.napaka is null or l.napaka = 'poteka')) then 'anketa_placila'
             when exists (select 1 from email_log l where l.user_id = z.user_id and l.napaka is null
                            and l.vrsta in ('novost-mini-lige', 'pivo-7dni', 'dobrodoslica', 'brez-ekipe')
                            and l.poslano_at > now() - interval '14 days') then 'nedavni_mail'
             when coalesce(greatest(u.last_sign_in_at,
                    (select max(f.roster_updated_at) from fantasy_teams f
                      where f.owner_id = z.user_id and not f.hisna)), '-infinity') < now() - interval '60 days'
               then 'neaktiven'
           end as razlog
      from z
      left join auth.users u on u.id = z.user_id
      left join profiles p on p.id = z.user_id
  )
  -- En mail na naslov: med ustreznimi z istim naslovom ostane najbolj nedavno aktiven.
  select r.user_id, r.email, r.display_name, r.player_id, r.liga_slug, r.drzava, r.aktiven_at,
         case when r.razlog is null
               and row_number() over (partition by lower(r.email), (r.razlog is null)
                                      order by r.aktiven_at desc nulls last, r.user_id) > 1
              then 'podvojen_naslov' else r.razlog end
    from r
$$;
revoke all on function public.promo_preverjen_kohorta() from public, anon, authenticated;
grant execute on function public.promo_preverjen_kohorta() to service_role;

-- Uspešnih in tekočih skupaj (meja 500 velja za vse pakete).
create or replace function public.promo_preverjen_poslanih()
returns bigint language sql stable security definer set search_path = public
as $$
  select count(distinct user_id) from email_log
   where vrsta = 'promo-preverjen' and (napaka is null or napaka = 'poteka')
$$;
revoke all on function public.promo_preverjen_poslanih() from public, anon, authenticated;
grant execute on function public.promo_preverjen_poslanih() to service_role;

-- Zamrzne naslednji paket: do p_velikost (največ 20) ustreznih, ki niso v
-- nobenem neposlanem paketu, najbolj nedavno aktivni najprej, do meje.
-- Vrne id paketa ali null, če ni nikogar.
create or replace function public.promo_preverjen_nov_paket(p_velikost int, p_meja int)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('promo-preverjen'));
  select array_agg(k.user_id order by k.aktiven_at desc nulls last, k.user_id) into v_ids
    from (
      select k.user_id, k.aktiven_at
        from promo_preverjen_kohorta() k
       where k.razlog is null
         -- Že v paketu: odobrenem ali neodobrenem, mlajšem od 7 dni (starejši neodobren poteče).
         and not exists (select 1 from promo_preverjen_paketi pk where k.user_id = any(pk.user_ids)
                           and (pk.odobren_at is not null or pk.created_at > now() - interval '7 days'))
       order by k.aktiven_at desc nulls last, k.user_id
       limit greatest(0, least(p_velikost, 20,
                               p_meja - promo_preverjen_poslanih()
                               - coalesce((select sum(cardinality(pk.user_ids)) from promo_preverjen_paketi pk
                                            where pk.odobren_at is null
                                              and pk.created_at > now() - interval '7 days'), 0)::int))
    ) k;
  if v_ids is null or cardinality(v_ids) = 0 then return null; end if;
  insert into promo_preverjen_paketi (user_ids) values (v_ids) returning id into v_id;
  return v_id;
end
$$;
revoke all on function public.promo_preverjen_nov_paket(int, int) from public, anon, authenticated;
grant execute on function public.promo_preverjen_nov_paket(int, int) to service_role;

-- Zasede vrstico v email_log pred pošiljanjem (kot anketa_placila_zasedi).
-- Vrne id; -1 = meja dosežena, 0 = človek že ima uspešno ali tekočo vrstico,
-- -2 = tik pred pošiljanjem ni več ustrezen (odjava ali naslov že dobil).
create or replace function public.promo_preverjen_zasedi(p_user_id uuid, p_email text, p_meja int)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('promo-preverjen'));
  if promo_preverjen_poslanih() >= p_meja then return -1; end if;
  if exists (select 1 from profiles p where p.id = p_user_id and coalesce(p.brez_opomnikov, false))
     or exists (select 1 from email_log l where l.user_id <> p_user_id and lower(l.email) = lower(p_email)
                  and l.vrsta = 'promo-preverjen' and (l.napaka is null or l.napaka = 'poteka'))
  then return -2; end if;
  insert into email_log (user_id, email, vrsta, napaka)
  values (p_user_id, p_email, 'promo-preverjen', 'poteka')
  on conflict (user_id) where vrsta = 'promo-preverjen' and (napaka is null or napaka = 'poteka')
  do nothing
  returning id into v_id;
  return coalesce(v_id, 0);
end
$$;
revoke all on function public.promo_preverjen_zasedi(uuid, text, int) from public, anon, authenticated;
grant execute on function public.promo_preverjen_zasedi(uuid, text, int) to service_role;
