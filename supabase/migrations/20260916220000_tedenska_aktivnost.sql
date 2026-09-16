-- Koliko ljudi je res zivih, po tednih.
--
-- "Koliko uporabnikov imam" je pri 354 registriranih napacno vprasanje —
-- registracija je enkraten dogodek izpred treh tednov. Zanima nas, koliko jih
-- vsak teden kaj NAREDI.
--
-- Stejejo dejanja, ne obiski: strani ne merimo in tega ta pogled ne zna
-- pretvarjati. Dejanje je glas (asistenca ali pozicija), sporocilo v klepetu,
-- prijava odsotnosti ali shranjena ekipa.
--
-- POZOR pri shranjenih ekipah: `fantasy_teams.roster_updated_at` hrani samo
-- ZADNJE shranjevanje, ne vseh. Kdor je ekipo shranil v 36. in spet v 37.
-- tednu, se pojavi le v 37. Pretekli tedni so zato pri tem enem viru
-- podcenjeni — glasovi, klepet in odsotnosti imajo polno zgodovino. Stevilka
-- je torej spodnja meja, ne ocena navzgor.
create or replace function public.admin_tedenska_aktivnost(p_tednov int default 12)
returns table (
  teden text,
  zacetek date,
  aktivnih int,
  novih int,
  glasovalcev int,
  klepetalcev int,
  urejalcev_ekipe int,
  javiteljev int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;

  return query
  with dejanja as (
    select voter_id as kdo, created_at as kdaj, 'glas' as kaj from assist_votes
    union all
    select voter_id, created_at, 'glas' from position_votes
    union all
    select user_id, created_at, 'klepet' from chat_messages
    union all
    select user_id, created_at, 'odsotnost' from player_reports
    union all
    select owner_id, roster_updated_at, 'ekipa'
      from fantasy_teams where roster_updated_at is not null
  ),
  po_tednu as (
    select date_trunc('week', kdaj) as t,
           count(distinct kdo) as aktivnih,
           count(distinct kdo) filter (where kaj = 'glas') as glasovalcev,
           count(distinct kdo) filter (where kaj = 'klepet') as klepetalcev,
           count(distinct kdo) filter (where kaj = 'ekipa') as urejalcev,
           count(distinct kdo) filter (where kaj = 'odsotnost') as javiteljev
      from dejanja
     where kdo is not null and kdaj is not null
     group by 1
  ),
  novi as (
    select date_trunc('week', created_at) as t, count(*) as n
      from auth.users group by 1
  ),
  tedni as (
    select generate_series(
             date_trunc('week', now()) - make_interval(weeks => p_tednov - 1),
             date_trunc('week', now()),
             interval '1 week'
           ) as t
  )
  select to_char(w.t, 'IYYY-"W"IW'),
         w.t::date,
         coalesce(p.aktivnih, 0)::int,
         coalesce(n.n, 0)::int,
         coalesce(p.glasovalcev, 0)::int,
         coalesce(p.klepetalcev, 0)::int,
         coalesce(p.urejalcev, 0)::int,
         coalesce(p.javiteljev, 0)::int
    from tedni w
    left join po_tednu p on p.t = w.t
    left join novi n on n.t = w.t
   order by w.t;
end $$;

comment on function public.admin_tedenska_aktivnost(int) is
  'Tedensko aktivni uporabniki (dejanja, ne obiski). Shranjene ekipe stejejo le po zadnjem shranjevanju, zato so pretekli tedni spodnja meja.';

-- Trenutno stanje v eni vrstici — za pas na vrhu admin strani.
create or replace function public.admin_zivost()
returns table (
  registriranih int,
  aktivnih_7dni int,
  aktivnih_30dni int,
  z_veljavno_ekipo int,
  prijavljenih_7dni int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;

  return query
  with dejanja as (
    select voter_id as kdo, created_at as kdaj from assist_votes
    union all select voter_id, created_at from position_votes
    union all select user_id, created_at from chat_messages
    union all select user_id, created_at from player_reports
    union all select owner_id, roster_updated_at from fantasy_teams
     where roster_updated_at is not null
  )
  select
    (select count(*) from auth.users)::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '7 days' and kdo is not null)::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '30 days' and kdo is not null)::int,
    (select count(distinct ft.owner_id) from fantasy_teams ft
      where roster_je_veljaven(ft.id))::int,
    -- `last_sign_in_at` hrani le zadnjo prijavo, zato je to uporabno samo za
    -- "zdaj", ne za zgodovino.
    (select count(*) from auth.users
      where last_sign_in_at > now() - interval '7 days')::int;
end $$;

comment on function public.admin_zivost() is
  'Kazalniki zivosti za admin pas. Prijave so le zadnje po uporabniku — za zgodovino niso uporabne.';

revoke all on function public.admin_tedenska_aktivnost(int) from public;
revoke all on function public.admin_zivost() from public;
grant execute on function public.admin_tedenska_aktivnost(int) to authenticated;
grant execute on function public.admin_zivost() to authenticated;
