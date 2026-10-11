-- Prevzem profila: zahtevek najprej vidi admin, klubu gre šele na njegov ukaz.
--
-- Prej je funkcija `posli-prevzem` (urnika še ni bilo) klubu poslala vsak
-- čakajoči zahtevek sama, admin pa je videl le zahtevke, starejše od 7 dni.
-- Klub iz imena prikaza ("Nejc K") prosilca ne prepozna, zato:
--
--   * admin vidi VSE čakajoče zahtevke in ima tri gumbe: potrdi, pošlji
--     klubu, zavrni;
--   * "pošlji klubu" ustvari žeton za EN zahtevek (`admin_prevzem_zeton_za_klub`)
--     in mail pošlje funkcija `posli-prevzem` na admin klic;
--   * mail in stran /claim pokažeta še e-naslov prosilca (to piše tudi v
--     oknu "To sem jaz", preden zahtevek odda);
--   * ime igralca je "Ime Priimek" kot v vmesniku, ne "Priimek Ime".
--
-- Samodejno pošiljanje klubom (`prevzem_za_posto_klubu`) gre proč.

alter table public.zahtevki_igralca
  add column klubu_poslano_at timestamptz,
  add column klubu_na text check (klubu_na is null or length(klubu_na) <= 254);
comment on column public.zahtevki_igralca.klubu_poslano_at is
  'Kdaj je admin zahtevek poslal klubu v potrditev (žeton po mailu).';
comment on column public.zahtevki_igralca.klubu_na is
  'Naslov, na katerega je šel zadnji mail klubu.';

drop function public.prevzem_za_posto_klubu(int);

-- Ime za mail: "Ime Priimek", sicer polno ime iz vira. (Argumenti so
-- besedila, ne vrstica `players`: funkcija na vrstici bi bila v PostgREST
-- izračunan stolpec tabele.)
create or replace function public.prevzem_ime_igralca(p_ime text, p_priimek text, p_polno text)
returns text language sql immutable set search_path = public
as $$
  select coalesce(nullif(btrim(coalesce(p_ime, '') || ' ' || coalesce(p_priimek, '')), ''), p_polno)
$$;
revoke all on function public.prevzem_ime_igralca(text, text, text) from public, anon, authenticated;

-- Admin: žeton za EN zahtevek, ki ga funkcija `posli-prevzem` pošlje klubu.
-- Naslov je `p_na` (admin ga vpiše, ko kluba ni v stikih) ali prvi uporaben
-- naslov kluba iz `klub_stik`. Prejšnji neporabljeni žetoni zahtevka padejo,
-- da velja le zadnja povezava.
create or replace function public.admin_prevzem_zeton_za_klub(p_zahtevek_id bigint, p_na text default null)
returns table (
  zahtevek_id bigint, zeton text, email text, klub text, igralec text,
  liga_slug text, liga text, drzava text, prosilec text, prosilec_email text,
  expires_at timestamptz, klub_stik_id bigint
)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  r record;
  v_na text := nullif(lower(btrim(coalesce(p_na, ''))), '');
  v_stik bigint;
  v_zeton text;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  select z.id, z.user_id, p.team_id, prevzem_ime_igralca(p.first_name, p.last_name, p.full_name) as igralec, t.name as klub, c.slug,
         c.name as liga, co.code as drzava, pf.display_name, u.email::text as prosilec_email
    into r
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    join teams t on t.id = p.team_id
    join competitions c on c.id = p.competition_id
    left join countries co on co.id = c.country_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
   where z.id = p_zahtevek_id and z.status = 'cakajoc';
  if not found then
    raise exception 'Zahtevek ni odprt.';
  end if;
  if v_na is not null and v_na !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Naslov kluba ni veljaven.';
  end if;
  if v_na is null then
    select ks.id, lower(ks.email) into v_stik, v_na from klub_stik ks
     where ks.team_id = r.team_id and coalesce(ks.email, '') <> ''
       and ks.stanje not in ('ne_zeli', 'napacen_mail')
     order by ks.id limit 1;
    if v_na is null then
      raise exception 'Klub nima uporabnega e-naslova. Vpiši naslov.';
    end if;
  else
    select ks.id into v_stik from klub_stik ks where lower(ks.email) = v_na order by ks.id limit 1;
    if exists (select 1 from klub_stik ks where ks.id = v_stik and ks.stanje in ('ne_zeli', 'napacen_mail')) then
      raise exception 'Ta naslov ne želi pošte ali je napačen (stiki klubov).';
    end if;
    -- Nov naslov gre v skupni seznam stikov, da je mail zabeležen kot vsak drug.
    if v_stik is null and r.drzava in ('SI', 'SK', 'HR', 'CZ', 'HU', 'AT', 'RS', 'RO', 'EE', 'PL', 'ES', 'LV') then
      insert into klub_stik (team_id, klub, drzava, liga_slug, email, stanje, opomba)
      values (r.team_id, r.klub, r.drzava, r.slug, v_na, 'nov', 'Vpisal admin ob prevzemu profila.')
      returning id into v_stik;
    end if;
  end if;

  update zetoni_prevzema set expires_at = now()
   where zetoni_prevzema.zahtevek_id = r.id and porabljen_at is null and zetoni_prevzema.expires_at > now();
  v_zeton := encode(extensions.gen_random_bytes(32), 'hex');
  insert into zetoni_prevzema (zahtevek_id, hash, klub_stik_id)
  values (r.id, encode(sha256(convert_to(v_zeton, 'UTF8')), 'hex'), v_stik);
  update zahtevki_igralca set klubu_poslano_at = now(), klubu_na = v_na where id = r.id;

  return query select r.id, v_zeton, v_na, r.klub, r.igralec, r.slug, r.liga, r.drzava,
                      r.display_name, r.prosilec_email, now() + interval '14 days', v_stik;
end;
$$;
revoke all on function public.admin_prevzem_zeton_za_klub(bigint, text) from public, anon;
grant execute on function public.admin_prevzem_zeton_za_klub(bigint, text) to authenticated;

-- Preizkus po mailu (servis): isto kot prej, z e-naslovom prosilca.
drop function public.prevzem_zeton_test(bigint);
create function public.prevzem_zeton_test(p_zahtevek_id bigint)
returns table (
  zahtevek_id bigint, zeton text, email text, klub text, igralec text,
  liga_slug text, liga text, drzava text, prosilec text, prosilec_email text,
  expires_at timestamptz, klub_stik_id bigint
)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  r record;
  v_zeton text;
begin
  select z.id, prevzem_ime_igralca(p.first_name, p.last_name, p.full_name) as igralec, t.name as klub, c.slug, c.name as liga,
         co.code as drzava, pf.display_name, u.email::text as prosilec_email
    into r
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    join teams t on t.id = p.team_id
    join competitions c on c.id = p.competition_id
    left join countries co on co.id = c.country_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
   where z.id = p_zahtevek_id and z.status = 'cakajoc' and not z.spor;
  if not found then
    raise exception 'zahtevek % ne čaka (ali je spor)', p_zahtevek_id;
  end if;
  v_zeton := encode(extensions.gen_random_bytes(32), 'hex');
  insert into zetoni_prevzema (zahtevek_id, hash, klub_stik_id)
  values (r.id, encode(sha256(convert_to(v_zeton, 'UTF8')), 'hex'), null);
  return query select r.id, v_zeton, null::text, r.klub, r.igralec, r.slug, r.liga, r.drzava,
                      r.display_name, r.prosilec_email, now() + interval '14 days', null::bigint;
end;
$$;
revoke all on function public.prevzem_zeton_test(bigint) from public, anon, authenticated;
grant execute on function public.prevzem_zeton_test(bigint) to service_role;

-- Stran /claim: še e-naslov prosilca (vidi ga le, kdor ima žeton iz maila).
drop function public.prevzem_zeton_podatki(text);
create function public.prevzem_zeton_podatki(p_zeton text)
returns table (stanje text, igralec text, klub text, liga text, prosilec text, prosilec_email text,
               dokaz_url text, expires_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select case
           when zp.porabljen_at is not null then 'porabljen'
           when zp.expires_at <= now() then 'potekel'
           when z.status <> 'cakajoc' or z.spor then 'zaprt'
           else 'veljaven'
         end,
         p.full_name, t.name, c.name, pf.display_name,
         case when zp.porabljen_at is null and zp.expires_at > now() then u.email::text end,
         z.dokaz_url, zp.expires_at
    from zetoni_prevzema zp
    join zahtevki_igralca z on z.id = zp.zahtevek_id
    join players p on p.id = z.player_id
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
   where zp.hash = prevzem_zeton_hash(p_zeton)
$$;
revoke all on function public.prevzem_zeton_podatki(text) from public;
grant execute on function public.prevzem_zeton_podatki(text) to anon, authenticated;

-- Vrsta admina: vsi čakajoči (ne le starejši od 7 dni), z naslovom kluba.
drop function public.admin_zahtevki_igralcev();
create function public.admin_zahtevki_igralcev()
returns table (
  id bigint, player_id bigint, player_name text, team_name text, competition_id bigint, liga text,
  user_id uuid, prosilec text, email text, status text, potrdil text, spor boolean,
  star_vsaj_16 boolean, dokaz_url text, created_at timestamptz, decided_at timestamptz,
  prijav int, razlogi text[], potrditev int, povezanih int, vrsta text,
  klub_email text, klubu_poslano_at timestamptz, klubu_na text
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
         z.klubu_poslano_at, z.klubu_na
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
   where z.status = 'cakajoc'
      or (z.status = 'potrjen' and (z.decided_at > now() - interval '60 days'
          or exists (select 1 from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null)))
   order by case when z.status = 'cakajoc' then 0 else 1 end, z.created_at;
end;
$$;
revoke all on function public.admin_zahtevki_igralcev() from public, anon;
grant execute on function public.admin_zahtevki_igralcev() to authenticated;
