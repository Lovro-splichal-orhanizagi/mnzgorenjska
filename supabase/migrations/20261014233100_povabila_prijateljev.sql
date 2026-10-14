-- Povabila prijateljev: kdo je koga pripeljal. Daje prednost v vrsti
-- zahtevkov za prevzem profila igralca: kdor pripelje prijatelja, ki se
-- prijavi prek njegove povezave IN sestavi ekipo, je pregledan prej.
--
-- Prijatelj šteje šele z ekipo, da vrste ni mogoče prehiteti s praznimi
-- računi. Povabilo se zabeleži le novemu računu (prva dva dneva), enkrat in
-- za vedno; obe tabeli sta dostopni samo prek funkcij spodaj.

create table public.kode_vabil (
  user_id    uuid primary key references public.profiles on delete cascade,
  koda       text not null unique check (koda ~ '^[a-z0-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table public.kode_vabil enable row level security;

create table public.povabila (
  povabljeni uuid primary key references public.profiles on delete cascade,
  povabil    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  check (povabljeni <> povabil)
);
create index povabila_povabil on public.povabila (povabil);
alter table public.povabila enable row level security;

revoke all on public.kode_vabil, public.povabila from public, anon, authenticated;

-- Koda za povezavo; ustvari jo ob prvi zahtevi.
create function public.moja_koda_vabila()
returns text
language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k text;
begin
  if uid is null then
    raise insufficient_privilege using message = 'Prijava je potrebna.';
  end if;
  loop
    select koda into k from kode_vabil where user_id = uid;
    if k is not null then
      return k;
    end if;
    insert into kode_vabil (user_id, koda)
    values (uid, substr(md5(gen_random_uuid()::text), 1, 8))
    on conflict do nothing;
  end loop;
end;
$$;

-- Novi račun je prišel prek povezave s kodo. Vrne, ali je bilo zabeleženo.
create function public.zabelezi_povabilo(p_koda text)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  od  uuid;
begin
  if uid is null then
    return false;
  end if;
  select user_id into od from kode_vabil where koda = lower(trim(p_koda));
  if od is null or od = uid then
    return false;
  end if;
  if not exists (select 1 from profiles where id = uid and created_at > now() - interval '2 days') then
    return false;
  end if;
  insert into povabila (povabljeni, povabil) values (uid, od) on conflict do nothing;
  return found;
end;
$$;

-- Koliko pripeljanih je sestavilo ekipo.
create function public.pripeljanih(p_uid uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select count(*)::int
    from povabila pv
   where pv.povabil = p_uid
     and exists (select 1 from fantasy_teams ft where ft.owner_id = pv.povabljeni and not ft.hisna);
$$;

-- Mesto prosilčevih čakajočih zahtevkov v vrsti (prednost: pripeljani, nato starost).
create function public.moje_mesto_v_vrsti()
returns table (zahtevek_id bigint, mesto int, v_vrsti int, pripeljanih int)
language sql stable security definer set search_path = public
as $$
  with q as (
    select z.id, z.user_id, z.created_at, public.pripeljanih(z.user_id) as n
      from zahtevki_igralca z
     where z.status = 'cakajoc'
  ), r as (
    select q.*, row_number() over (order by q.n desc, q.created_at)::int as m, count(*) over ()::int as c
      from q
  )
  select r.id, r.m, r.c, r.n from r where r.user_id = auth.uid();
$$;

-- Za Admin → Prevzemi: koliko registracij so prinesla povabila.
create function public.admin_povabila_skupaj()
returns table (registracij int, z_ekipo int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select count(*)::int,
         count(*) filter (where exists (select 1 from fantasy_teams ft where ft.owner_id = pv.povabljeni and not ft.hisna))::int
    from povabila pv;
end;
$$;

drop function public.admin_zahtevki_igralcev();
create function public.admin_zahtevki_igralcev()
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
    join players p on p.id = z.player_id
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
   where z.status = 'cakajoc'
      or (z.status = 'potrjen' and (z.decided_at > now() - interval '60 days'
          or exists (select 1 from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null)))
   order by case when z.status = 'cakajoc' then 0 else 1 end, public.pripeljanih(z.user_id) desc, z.created_at;
end;
$$;
revoke all on function public.admin_zahtevki_igralcev() from public, anon;
grant execute on function public.admin_zahtevki_igralcev() to authenticated;

revoke all on function public.moja_koda_vabila(), public.zabelezi_povabilo(text), public.pripeljanih(uuid),
  public.moje_mesto_v_vrsti(), public.admin_povabila_skupaj() from public, anon;
revoke all on function public.pripeljanih(uuid) from authenticated;
grant execute on function public.moja_koda_vabila(), public.zabelezi_povabilo(text),
  public.moje_mesto_v_vrsti(), public.admin_povabila_skupaj() to authenticated;
