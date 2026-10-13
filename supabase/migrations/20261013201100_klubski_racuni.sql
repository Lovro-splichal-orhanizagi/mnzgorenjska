-- Klubski računi (spec: docs/superpowers/specs/2026-10-13-klubski-racuni-design.md).
--
-- Klub se registrira z uradnim naslovom iz `klub_stik`. Potrjen naslov
-- (GoTrue zahteva potrditev, Google vrne preverjen naslov) dokazuje, da ima
-- klub nabiralnik, zato račun nastane brez admina. Klub ima lahko do 5
-- računov (vsak s svojim naslovom); uporabnik zastopa največ en klub.
-- Primeri brez kluba, s polnim klubom in prošnje za nov naslov gredo v
-- `klubski_zahtevki` (Administracija → Klubi).
--
-- Tabel vmesnik ne bere ne piše; vse gre prek RPC spodaj.

create table public.klubski_racuni (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles on delete cascade,
  team_id      bigint not null references public.teams on delete cascade,
  klub_stik_id bigint references public.klub_stik on delete set null,
  created_at   timestamptz not null default now(),
  preklican_at timestamptz,
  preklical    uuid references public.profiles on delete set null
);
create unique index klubski_racuni_en_aktiven on public.klubski_racuni (user_id) where preklican_at is null;
create index klubski_racuni_klub on public.klubski_racuni (team_id) where preklican_at is null;

create table public.klubski_zahtevki (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles on delete cascade,
  email        text not null,
  vrsta        text not null check (vrsta in ('brez_kluba', 'polno', 'nov_naslov')),
  team_id      bigint references public.teams on delete set null,
  klub_stik_id bigint references public.klub_stik on delete set null,
  vloga        text check (vloga in ('predsednik', 'tajnik', 'trener', 'vodstvo', 'drugo')),
  dokaz_url    text check (dokaz_url is null or (length(dokaz_url) <= 300 and dokaz_url ~ '^https?://[^[:space:]<>"]+$')),
  opomba       text check (opomba is null or length(opomba) <= 500),
  status       text not null default 'odprt' check (status in ('odprt', 'potrjen', 'zavrnjen')),
  razlog       text check (razlog is null or length(razlog) <= 500),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references public.profiles on delete set null
);
create unique index klubski_zahtevki_en_odprt on public.klubski_zahtevki (user_id) where status = 'odprt';

alter table public.klubski_racuni enable row level security;
alter table public.klubski_zahtevki enable row level security;
revoke all on public.klubski_racuni, public.klubski_zahtevki from anon, authenticated;

create or replace function public.je_klubski_racun(p_user uuid, p_team_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from klubski_racuni
                  where user_id = p_user and team_id = p_team_id and preklican_at is null)
$$;

-- Vpiše račun in javi na Discord. Kliče se le iz preverjenih poti.
create or replace function public.klub_ustvari_racun(p_user uuid, p_team_id bigint, p_stik_id bigint)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  v_n int;
begin
  insert into klubski_racuni(user_id, team_id, klub_stik_id)
  values (p_user, p_team_id, p_stik_id) returning id into v_id;
  select count(*) into v_n from klubski_racuni where team_id = p_team_id and preklican_at is null;
  perform preverjeni_na_discord(format('🏟️ Klubski račun: %s (%s), %s. račun kluba',
    (select name from teams where id = p_team_id),
    (select coalesce(display_name, '?') from profiles where id = p_user),
    v_n));
  return v_id;
end;
$$;

-- Odprt zahtevek v vrsto admina (največ en odprt na uporabnika).
create or replace function public.klub_v_vrsto(p_user uuid, p_email text, p_vrsta text,
                                               p_team_id bigint, p_stik_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into klubski_zahtevki(user_id, email, vrsta, team_id, klub_stik_id)
  values (p_user, p_email, p_vrsta, p_team_id, p_stik_id)
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    perform preverjeni_na_discord(format('🏟️ Klubski zahtevek (%s): %s, %s',
      p_vrsta, coalesce((select name from teams where id = p_team_id), 'klub neznan'), p_email));
  end if;
end;
$$;

-- Kliče vmesnik ob vsaki prijavi. Vrne klub (team_id) aktivnega računa ali null.
create or replace function public.uveljavi_klubski_racun()
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_potrjen timestamptz;
  s klub_stik;
  v_team bigint;
begin
  if v_uid is null then
    raise insufficient_privilege using message = 'Prijava je obvezna.';
  end if;
  select team_id into v_team from klubski_racuni where user_id = v_uid and preklican_at is null;
  if found then
    return v_team;
  end if;
  select lower(btrim(email)), email_confirmed_at into v_email, v_potrjen from auth.users where id = v_uid;
  if v_potrjen is null or coalesce(v_email, '') = '' then
    return null;
  end if;
  select * into s from klub_stik where lower(btrim(email)) = v_email limit 1;
  if not found or s.stanje in ('ne_zeli', 'napacen_mail') then
    return null;
  end if;
  -- Admin je račun preklical: ne obnovi ga samodejno.
  if exists (select 1 from klubski_racuni where user_id = v_uid and preklican_at is not null) then
    return null;
  end if;
  -- Admin je zahtevek za ta naslov zavrnil: ne vračaj ga v vrsto ob vsaki prijavi.
  if exists (select 1 from klubski_zahtevki
              where user_id = v_uid and klub_stik_id = s.id and status = 'zavrnjen') then
    return null;
  end if;
  if s.team_id is null then
    perform klub_v_vrsto(v_uid, v_email, 'brez_kluba', null, s.id);
    return null;
  end if;
  perform 1 from teams where id = s.team_id for update;  -- dva hkratna šesta računa
  if (select count(*) from klubski_racuni where team_id = s.team_id and preklican_at is null) >= 5 then
    perform klub_v_vrsto(v_uid, v_email, 'polno', s.team_id, s.id);
    return null;
  end if;
  perform klub_ustvari_racun(v_uid, s.team_id, s.id);
  return s.team_id;
end;
$$;

-- Stanje za stran Račun: aktiven račun in zadnji zahtevek.
create or replace function public.moj_klubski_racun()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'racun', (select jsonb_build_object('team_id', r.team_id, 'team_name', t.name, 'od', r.created_at)
                from klubski_racuni r join teams t on t.id = r.team_id
               where r.user_id = auth.uid() and r.preklican_at is null),
    'zahtevek', (select jsonb_build_object('id', z.id, 'vrsta', z.vrsta, 'status', z.status,
                                           'razlog', z.razlog, 'team_name', t.name, 'created_at', z.created_at)
                   from klubski_zahtevki z left join teams t on t.id = z.team_id
                  where z.user_id = auth.uid() order by z.created_at desc limit 1))
$$;

revoke all on function public.je_klubski_racun(uuid, bigint), public.klub_ustvari_racun(uuid, bigint, bigint),
  public.klub_v_vrsto(uuid, text, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.uveljavi_klubski_racun(), public.moj_klubski_racun() from public, anon;
grant execute on function public.uveljavi_klubski_racun(), public.moj_klubski_racun() to authenticated;

-- --------------------------------------------------------------------------
-- Prošnja za nov naslov: »mail mojega računa je uradni naslov kluba X«.
-- --------------------------------------------------------------------------
create or replace function public.klub_zaprosi_za_naslov(p_team_id bigint, p_vloga text,
                                                         p_dokaz_url text, p_opomba text default null)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_potrjen timestamptz;
  v_id bigint;
begin
  if v_uid is null then
    raise insufficient_privilege using message = 'Prijava je obvezna.';
  end if;
  select lower(btrim(email)), email_confirmed_at into v_email, v_potrjen from auth.users where id = v_uid;
  if v_potrjen is null then
    raise exception 'Najprej potrdi e-pošto računa.';
  end if;
  if exists (select 1 from klubski_racuni where user_id = v_uid and preklican_at is null) then
    raise exception 'Že zastopaš klub.';
  end if;
  if not exists (select 1 from teams where id = p_team_id) then
    raise exception 'Klub ne obstaja.';
  end if;
  if exists (select 1 from klubski_zahtevki where user_id = v_uid and status = 'odprt') then
    raise exception 'Prošnja že čaka na odločitev.';
  end if;
  -- Isto besedilo kot pri prevzemu profila, da ga vmesnik prevede (napake.ts).
  if nullif(btrim(coalesce(p_dokaz_url, '')), '') is not null
     and (length(btrim(p_dokaz_url)) > 300 or btrim(p_dokaz_url) !~ '^https?://[^[:space:]<>"]+$') then
    raise exception 'Dokaz mora biti povezava (https://…).';
  end if;
  insert into klubski_zahtevki(user_id, email, vrsta, team_id, vloga, dokaz_url, opomba)
  values (v_uid, v_email, 'nov_naslov', p_team_id, p_vloga,
          nullif(btrim(coalesce(p_dokaz_url, '')), ''), nullif(btrim(coalesce(p_opomba, '')), ''))
  returning id into v_id;
  perform preverjeni_na_discord(format('🏟️ Prošnja za uradni naslov: %s, %s (%s) %s',
    (select name from teams where id = p_team_id), v_email, coalesce(p_vloga, '?'), coalesce(p_dokaz_url, '')));
  return v_id;
end;
$$;

-- --------------------------------------------------------------------------
-- Administracija → Klubi
-- --------------------------------------------------------------------------
create or replace function public.admin_klubski_zahtevki()
returns table (id bigint, user_id uuid, display_name text, email text, vrsta text, team_id bigint,
               team_name text, vloga text, dokaz_url text, opomba text, status text, razlog text,
               created_at timestamptz, racunov_kluba int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select z.id, z.user_id, p.display_name, z.email, z.vrsta, z.team_id, t.name, z.vloga, z.dokaz_url,
           z.opomba, z.status, z.razlog, z.created_at,
           (select count(*)::int from klubski_racuni r where r.team_id = z.team_id and r.preklican_at is null)
      from klubski_zahtevki z
      left join profiles p on p.id = z.user_id
      left join teams t on t.id = z.team_id
     order by (z.status = 'odprt') desc, z.created_at desc
     limit 300;
end;
$$;

create or replace function public.admin_klubski_racuni()
returns table (id bigint, user_id uuid, display_name text, email text, team_id bigint, team_name text,
               created_at timestamptz, preklican_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select r.id, r.user_id, p.display_name, u.email::text, r.team_id, t.name, r.created_at, r.preklican_at
      from klubski_racuni r
      join teams t on t.id = r.team_id
      left join profiles p on p.id = r.user_id
      left join auth.users u on u.id = r.user_id
     order by (r.preklican_at is null) desc, t.name, r.created_at;
end;
$$;

create or replace function public.admin_preklici_klubski_racun(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  update klubski_racuni set preklican_at = now(), preklical = auth.uid()
   where id = p_id and preklican_at is null;
  if not found then
    raise exception 'Račun ni aktiven.';
  end if;
end;
$$;

create or replace function public.admin_odloci_klubski_zahtevek(p_id bigint, p_potrdi boolean,
  p_team_id bigint default null, p_razlog text default null, p_preklici_racun bigint default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  z klubski_zahtevki;
  v_team bigint;
  v_stik bigint;
  v_drzava text;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  select * into z from klubski_zahtevki where id = p_id for update;
  if not found or z.status <> 'odprt' then
    raise exception 'Zahtevek ni odprt.';
  end if;

  if not p_potrdi then
    update klubski_zahtevki
       set status = 'zavrnjen', razlog = nullif(left(btrim(coalesce(p_razlog, '')), 500), ''),
           decided_at = now(), decided_by = auth.uid()
     where id = p_id;
    return;
  end if;

  v_team := coalesce(p_team_id, z.team_id);
  if v_team is null then
    raise exception 'Izberi klub.';
  end if;
  if exists (select 1 from klubski_racuni where user_id = z.user_id and preklican_at is null) then
    raise exception 'Uporabnik že zastopa klub.';
  end if;
  if p_preklici_racun is not null then
    update klubski_racuni set preklican_at = now(), preklical = auth.uid()
     where id = p_preklici_racun and team_id = v_team and preklican_at is null;
    if not found then
      raise exception 'Račun za preklic ni aktiven račun tega kluba.';
    end if;
  end if;
  perform 1 from teams where id = v_team for update;
  if (select count(*) from klubski_racuni where team_id = v_team and preklican_at is null) >= 5 then
    raise exception 'Klub ima že 5 računov; najprej prekliči enega.';
  end if;

  -- Uradni naslov: popravi obstoječi stik ali dodaj novega (klub ima lahko več naslovov).
  select id into v_stik from klub_stik where lower(btrim(email)) = z.email limit 1;
  if v_stik is not null then
    update klub_stik
       set team_id = v_team, stanje = 'sodeluje', vir_url = coalesce(z.dokaz_url, vir_url), updated_at = now()
     where id = v_stik;
  else
    select c.code into v_drzava from teams t join countries c on c.id = t.country_id where t.id = v_team;
    insert into klub_stik(team_id, klub, drzava, email, vir_url, stanje, opomba)
    values (v_team, (select name from teams where id = v_team), v_drzava, z.email, z.dokaz_url, 'sodeluje',
            'Prošnja za uradni naslov #' || p_id)
    returning id into v_stik;
  end if;

  perform klub_ustvari_racun(z.user_id, v_team, v_stik);
  update klubski_zahtevki
     set status = 'potrjen', team_id = v_team, klub_stik_id = v_stik, decided_at = now(), decided_by = auth.uid()
   where id = p_id;
end;
$$;

revoke all on function public.klub_zaprosi_za_naslov(bigint, text, text, text), public.admin_klubski_zahtevki(),
  public.admin_klubski_racuni(), public.admin_preklici_klubski_racun(bigint),
  public.admin_odloci_klubski_zahtevek(bigint, boolean, bigint, text, bigint) from public, anon;
grant execute on function public.klub_zaprosi_za_naslov(bigint, text, text, text), public.admin_klubski_zahtevki(),
  public.admin_klubski_racuni(), public.admin_preklici_klubski_racun(bigint),
  public.admin_odloci_klubski_zahtevek(bigint, boolean, bigint, text, bigint) to authenticated;
