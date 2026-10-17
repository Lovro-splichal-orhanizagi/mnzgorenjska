-- Enkratni trenutek prve kvalifikacije prijatelja. Ponovna/dodatna ekipa
-- istega računa ne daje nove prednosti; javni vlogi v povabila ne pišeta.
alter table public.povabila add column kvalificiran_at timestamptz;
comment on column public.povabila.kvalificiran_at is
  'Prva kvalifikacija (povabilo in človeška ekipa), čas strežnika; dodatna ali ponovno ustvarjena ekipa ga ne spremeni.';

-- Za obstoječa povabila uporabimo prvo še obstoječo človeško ekipo.
-- Izbrisane zgodovine ni mogoče rekonstruirati. Stare datume omejimo na
-- čas migracije, da zgodovinski prihodnji datum ne zadrži vrha vrste.
update public.povabila pv
   set kvalificiran_at = least(now(), greatest(pv.created_at, (
     select min(ft.created_at) from public.fantasy_teams ft
      where ft.owner_id = pv.povabljeni and not ft.hisna
   )))
 where exists (select 1 from public.fantasy_teams ft
                where ft.owner_id = pv.povabljeni and not ft.hisna);

-- Registracija lahko prispe tudi za že ustvarjeno ekipo. Ne zaupamo
-- created_at iz vnosa; clock_timestamp loči dogodke v isti transakciji.
create function public.povabilo_prva_kvalifikacija() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Isti zaklep pri nastanku ekipe: sočasni zahtevi ne izgubita dogodka.
  -- NO KEY UPDATE je združljiv z zaklepi tujih ključev obeh vnosov.
  perform 1 from profiles where id = new.povabljeni for no key update;
  new.kvalificiran_at := case when exists (
    select 1 from fantasy_teams ft where ft.owner_id = new.povabljeni and not ft.hisna
  ) then clock_timestamp() else null end;
  return new;
end;
$$;
create trigger povabilo_prva_kvalifikacija before insert on public.povabila
for each row execute function public.povabilo_prva_kvalifikacija();

create function public.ekipa_kvalificira_povabilo() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform 1 from profiles where id = new.owner_id for no key update;
  update povabila set kvalificiran_at = clock_timestamp()
   where povabljeni = new.owner_id and kvalificiran_at is null;
  return new;
end;
$$;
-- Servisna sprememba lastnika/hišnosti/created_at ni nova prijateljeva ekipa.
create trigger ekipa_kvalificira_povabilo after insert on public.fantasy_teams
for each row when (not new.hisna) execute function public.ekipa_kvalificira_povabilo();

-- Ena definicija dejanskega vrstnega reda za uporabnika in administratorja.
-- Kvalifikacija še vedno zahteva obstoječo nehišno ekipo, kot pripeljanih().
create function public.vrsta_zahtevkov_igralca()
returns table (zahtevek_id bigint, user_id uuid, mesto int, v_vrsti int, pripeljanih int)
language sql stable security definer set search_path = public
as $$
  with q as (
    select z.id, z.user_id, z.created_at, public.pripeljanih(z.user_id) as n,
           (select max(pv.kvalificiran_at) from povabila pv
             where pv.povabil = z.user_id
               and exists (select 1 from fantasy_teams ft
                            where ft.owner_id = pv.povabljeni and not ft.hisna)) as prednost
      from zahtevki_igralca z where z.status = 'cakajoc'
  )
  select q.id, q.user_id,
         row_number() over (order by q.prednost desc nulls last, q.created_at, q.id)::int,
         count(*) over ()::int, q.n
    from q;
$$;
revoke all on function public.povabilo_prva_kvalifikacija(), public.ekipa_kvalificira_povabilo(),
  public.vrsta_zahtevkov_igralca() from public, anon, authenticated;

create or replace function public.moje_mesto_v_vrsti()
returns table (zahtevek_id bigint, mesto int, v_vrsti int, pripeljanih int)
language sql stable security definer set search_path = public
as $$
  select q.zahtevek_id, q.mesto, q.v_vrsti, q.pripeljanih
    from public.vrsta_zahtevkov_igralca() q where q.user_id = auth.uid();
$$;

create or replace function public.admin_zahtevki_igralcev()
returns table (
  id bigint, player_id bigint, player_name text, team_name text, competition_id bigint, liga text,
  user_id uuid, prosilec text, email text, status text, potrdil text, spor boolean,
  star_vsaj_16 boolean, dokaz_url text, created_at timestamptz, decided_at timestamptz,
  prijav int, razlogi text[], potrditev int, povezanih int, vrsta text,
  klub_email text, klubu_poslano_at timestamptz, klubu_na text, pripeljanih int
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select z.id, z.player_id, p.full_name, t.name, p.competition_id, c.name,
         z.user_id, pf.display_name, u.email::text, z.status, z.potrdil, z.spor,
         z.star_vsaj_16, z.dokaz_url, z.created_at, z.decided_at,
         (select count(*)::int from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null),
         array(select pr.razlog from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null and pr.razlog is not null),
         (select count(*)::int from potrditve_soigralcev ps where ps.zahtevek_id = z.id),
         (select count(*)::int from povezani_igralci pi where pi.zahtevek_id = z.id),
         case
           when z.status = 'cakajoc' and z.spor then 'spor'
           when z.status = 'cakajoc' then 'caka'
           when exists (select 1 from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null) then 'prijava'
           else 'potrjen'
         end,
         (select lower(ks.email) from klub_stik ks
           where ks.team_id = p.team_id and coalesce(ks.email, '') <> ''
             and ks.stanje not in ('ne_zeli', 'napacen_mail')
           order by ks.id limit 1),
         z.klubu_poslano_at, z.klubu_na, public.pripeljanih(z.user_id)
    from zahtevki_igralca z
    left join public.vrsta_zahtevkov_igralca() q on q.zahtevek_id = z.id
    join players p on p.id = z.player_id
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
   where z.status = 'cakajoc'
      or (z.status = 'potrjen' and (z.decided_at > now() - interval '60 days'
          or exists (select 1 from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null)))
   order by case when z.status = 'cakajoc' then 0 else 1 end, q.mesto,
            public.pripeljanih(z.user_id) desc, z.created_at, z.id;
end;
$$;
