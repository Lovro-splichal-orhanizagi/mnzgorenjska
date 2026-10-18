-- SLFF Trgovina (shop.slff.eu), del 1: katalog, zaloga, rezervacija, naročila.
-- Spec: docs/superpowers/specs/2026-10-18-trgovina-design.md
--
-- Shema `trgovina` ni v API. Brskalnik bere katalog prek trgovina_katalog() in
-- trgovina_izdelek(slug), ki zaloge ne povesta v številkah. Rezervacijo in
-- plačilo pišeta le funkciji trgovina-nakup in stripe-webhook (service_role)
-- prek tankih ovojev public.trgovina_*; administracija prek RPC z is_admin().
--
-- Rezervacija = postavke naročil v stanju caka_placilo z rezervirano_do > now().
-- Na voljo = zaloga − rezervirano. Zaloga se odšteje šele ob plačilu.

create schema if not exists trgovina;
revoke all on schema trgovina from public, anon, authenticated;

create table trgovina.izdelki (
  id          bigint generated always as identity primary key,
  slug        text unique not null check (slug ~ '^[a-z0-9-]+$'),
  ime_sl      text not null,
  ime_en      text not null,
  opis_sl     text not null default '',
  opis_en     text not null default '',
  kategorija  text not null check (kategorija in ('oblacila', 'dodatki', 'dom', 'nalepke')),
  slike       text[] not null default '{}',
  tax_code    text not null default 'txcd_99999999',
  pismo       boolean not null default false,
  aktiven     boolean not null default false,
  vrstni_red  int not null default 0,
  created_at  timestamptz default now()
);
comment on column trgovina.izdelki.pismo is
  'Gre v pismo (nalepke): tarifa pismo_si se ponudi le, če so vse postavke pismo.';

create table trgovina.razlicice (
  id          bigint generated always as identity primary key,
  izdelek_id  bigint not null references trgovina.izdelki on delete cascade,
  oznaka_sl   text not null,
  oznaka_en   text not null,
  sku         text unique not null,
  cena        int not null check (cena > 0),
  zaloga      int not null default 0 check (zaloga >= 0),
  teza_g      int not null default 0,
  aktivna     boolean not null default true,
  vrstni_red  int not null default 0
);
comment on column trgovina.razlicice.cena is 'Centi z DDV (tax_behavior=inclusive).';
create index on trgovina.razlicice (izdelek_id);

create table trgovina.narocila (
  id                    bigint generated always as identity primary key,
  javna_oznaka          text unique not null default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  stanje                text not null default 'caka_placilo'
                        check (stanje in ('caka_placilo', 'placano', 'poslano', 'preklicano', 'vrnjeno', 'poteklo')),
  user_id               uuid references auth.users on delete set null,
  email                 text,
  ime                   text,
  naslov                jsonb,
  jezik                 text not null default 'sl' check (jezik in ('sl', 'en')),
  znesek_postavke       int,
  znesek_dostava        int,
  znesek_ddv            int,
  znesek_skupaj         int,
  dostava_kljuc         text,
  stripe_checkout_id    text unique,
  stripe_payment_intent text,
  sledilna              text,
  rezervirano_do        timestamptz not null default now() + interval '35 minutes',
  odjemalec             text,
  manjka                int not null default 0,
  placano_at            timestamptz,
  poslano_at            timestamptz,
  created_at            timestamptz not null default now()
);
create index on trgovina.narocila (stanje, rezervirano_do);
create index on trgovina.narocila (user_id);
create index on trgovina.narocila (odjemalec) where stanje = 'caka_placilo';
comment on column trgovina.narocila.odjemalec is
  'sha256(IP + poper) iz trgovina-nakup, le za omejitev odprtih naročil; ob plačilu ali poteku se pobriše.';
comment on column trgovina.narocila.manjka is
  'Kosov, ki jih ob plačilu ni bilo na zalogi (zaloga se ustavi pri 0): uredi s kupcem.';

create table trgovina.postavke (
  id           bigint generated always as identity primary key,
  narocilo_id  bigint not null references trgovina.narocila on delete cascade,
  razlicica_id bigint not null references trgovina.razlicice,
  ime          text not null,
  cena         int not null,
  kolicina     int not null check (kolicina between 1 and 20)
);
create index on trgovina.postavke (narocilo_id);
create index on trgovina.postavke (razlicica_id);

alter table trgovina.izdelki enable row level security;
alter table trgovina.razlicice enable row level security;
alter table trgovina.narocila enable row level security;
alter table trgovina.postavke enable row level security;
revoke all on all tables in schema trgovina from public, anon, authenticated;

-- Koliko kosov različice je še na voljo (zaloga − aktivne rezervacije).
create view trgovina.razpolozljivo as
select r.id as razlicica_id,
       r.zaloga - coalesce((
         select sum(p.kolicina) from trgovina.postavke p
           join trgovina.narocila n on n.id = p.narocilo_id
          where p.razlicica_id = r.id and n.stanje = 'caka_placilo' and n.rezervirano_do > now()
       ), 0)::int as na_voljo
from trgovina.razlicice r;
revoke all on trgovina.razpolozljivo from public, anon, authenticated;

create function trgovina.oznaka_voljo(p_kosov bigint) returns text
language sql immutable
as $$ select case when coalesce(p_kosov, 0) <= 0 then 'ne' when p_kosov <= 3 then 'malo' else 'da' end $$;

-- Naročilo s postavkami za administracijo, pošto in kupca.
create function trgovina.narocilo_json(p_id bigint) returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'id', n.id, 'javna_oznaka', n.javna_oznaka, 'stanje', n.stanje, 'user_id', n.user_id,
    'email', n.email, 'ime', n.ime, 'naslov', n.naslov, 'jezik', n.jezik,
    'znesek_postavke', n.znesek_postavke, 'znesek_dostava', n.znesek_dostava,
    'znesek_ddv', n.znesek_ddv, 'znesek_skupaj', n.znesek_skupaj, 'dostava_kljuc', n.dostava_kljuc,
    'sledilna', n.sledilna, 'manjka', n.manjka, 'placano_at', n.placano_at, 'poslano_at', n.poslano_at,
    'created_at', n.created_at,
    'postavke', coalesce((
      select jsonb_agg(jsonb_build_object('razlicica_id', p.razlicica_id, 'sku', r.sku, 'ime', p.ime,
                                          'cena', p.cena, 'kolicina', p.kolicina) order by p.id)
        from trgovina.postavke p join trgovina.razlicice r on r.id = p.razlicica_id
       where p.narocilo_id = n.id), '[]'::jsonb))
  from trgovina.narocila n where n.id = p_id
$$;

-- --------------------------------------------------------------------------
-- Javni katalog (anon). Zaloga le kot 'da' | 'malo' (1–3) | 'ne'.
-- --------------------------------------------------------------------------
create function public.trgovina_katalog() returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', i.slug, 'ime_sl', i.ime_sl, 'ime_en', i.ime_en, 'kategorija', i.kategorija,
           'slike', to_jsonb(i.slike), 'cena_od', v.cena_od, 'cena_do', v.cena_do, 'na_voljo', trgovina.oznaka_voljo(v.kosov))
         order by i.vrstni_red, i.id), '[]'::jsonb)
  from trgovina.izdelki i
  join lateral (
    select min(r.cena) as cena_od, max(r.cena) as cena_do, sum(greatest(z.na_voljo, 0)) as kosov
      from trgovina.razlicice r join trgovina.razpolozljivo z on z.razlicica_id = r.id
     where r.izdelek_id = i.id and r.aktivna
  ) v on v.cena_od is not null
  where i.aktiven
$$;

create function public.trgovina_izdelek(p_slug text) returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'slug', i.slug, 'ime_sl', i.ime_sl, 'ime_en', i.ime_en, 'opis_sl', i.opis_sl, 'opis_en', i.opis_en,
    'kategorija', i.kategorija, 'slike', to_jsonb(i.slike), 'pismo', i.pismo,
    'razlicice', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'oznaka_sl', r.oznaka_sl, 'oznaka_en', r.oznaka_en,
                                          'cena', r.cena, 'na_voljo', trgovina.oznaka_voljo(z.na_voljo))
                       order by r.vrstni_red, r.id)
        from trgovina.razlicice r join trgovina.razpolozljivo z on z.razlicica_id = r.id
       where r.izdelek_id = i.id and r.aktivna), '[]'::jsonb))
  from trgovina.izdelki i
  where i.slug = p_slug and i.aktiven
$$;

-- --------------------------------------------------------------------------
-- Servisne funkcije (Edge Functions trgovina-nakup in stripe-webhook).
-- --------------------------------------------------------------------------

-- Zastarela naročila caka_placilo (seja Stripe je potekla vsaj pred pol ure,
-- webhook expired pa ni prišel): stanje poteklo, odjemalec proč. Namesto
-- crona jo kliče vsaka rezervacija (indeks stanje, rezervirano_do).
create function trgovina.pocisti() returns void
language sql
as $$
  update trgovina.narocila set stanje = 'poteklo', odjemalec = null
   where stanje = 'caka_placilo' and rezervirano_do < now() - interval '1 hour'
$$;

-- Rezervira košarico in ustvari naročilo caka_placilo. Vhod [{razlicica_id, kolicina}].
-- p_odjemalec = sha256 hex (IP + poper): največ 5 odprtih naročil na uporabnika,
-- gost (p_user null) pa na odjemalca. Brez IP-ja funkcija pošlje naključen odjemalec.
create function trgovina.rezerviraj(p_postavke jsonb, p_user uuid, p_jezik text, p_odjemalec text) returns jsonb
language plpgsql
as $$
declare
  v_narocilo trgovina.narocila;
  v_vrstic int;
  v_postavke jsonb;
begin
  if jsonb_typeof(p_postavke) is distinct from 'array'
     or jsonb_array_length(p_postavke) not between 1 and 20
     or p_jezik is null or p_jezik not in ('sl', 'en')
     or p_odjemalec is null or p_odjemalec !~ '^[0-9a-f]{64}$'
     or exists (select 1 from jsonb_array_elements(p_postavke) e
                 where jsonb_typeof(e) <> 'object'
                    or jsonb_typeof(e->'razlicica_id') is distinct from 'number'
                    or jsonb_typeof(e->'kolicina') is distinct from 'number'
                    or (e->>'kolicina')::numeric not between 1 and 20
                    or (e->>'kolicina')::numeric <> trunc((e->>'kolicina')::numeric)
                    or (e->>'razlicica_id')::numeric not between -9223372036854775808 and 9223372036854775807
                    or (e->>'razlicica_id')::numeric <> trunc((e->>'razlicica_id')::numeric))
  then
    raise exception 'Trgovina: neveljavna košarica.' using hint = 'trgovina-vnos';
  end if;

  if (select sum(kolicina) from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)) > 50
     or (select count(distinct razlicica_id) from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)) <> jsonb_array_length(p_postavke)
  then
    raise exception 'Trgovina: neveljavna košarica.' using hint = 'trgovina-vnos';
  end if;

  perform trgovina.pocisti();

  -- ponytail: brez zaklepa sta hkratni šesti zahtevi lahko obe sprejeti; meja je le zavora.
  if (select count(*) from trgovina.narocila n
       where n.stanje = 'caka_placilo' and n.rezervirano_do > now()
         and (n.user_id = p_user or (p_user is null and n.user_id is null and n.odjemalec = p_odjemalec))) >= 5
  then
    raise exception 'Trgovina: preveč odprtih naročil.' using hint = 'trgovina-omejitev';
  end if;

  -- Zaklep v stalnem vrstnem redu: hkratni nakupi istih različic čakajo drug
  -- na drugega in nato vidijo rezervacije, ki jih je prejšnji že potrdil.
  perform 1 from trgovina.razlicice r
   where r.id in (select razlicica_id from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int))
   order by r.id for update;

  select count(*) into v_vrstic
    from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)
    join trgovina.razlicice r on r.id = k.razlicica_id and r.aktivna
    join trgovina.izdelki i on i.id = r.izdelek_id and i.aktiven;
  if v_vrstic <> jsonb_array_length(p_postavke) then
    raise exception 'Trgovina: izdelek ni na voljo.' using hint = 'trgovina-vnos';
  end if;

  if exists (select 1 from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)
               join trgovina.razpolozljivo z on z.razlicica_id = k.razlicica_id
              where z.na_voljo < k.kolicina) then
    raise exception 'Trgovina: ni dovolj zaloge.' using hint = 'trgovina-zaloga';
  end if;

  insert into trgovina.narocila (user_id, jezik, odjemalec) values (p_user, p_jezik, p_odjemalec)
  returning * into v_narocilo;

  with nove as (
    insert into trgovina.postavke (narocilo_id, razlicica_id, ime, cena, kolicina)
    select v_narocilo.id, r.id,
           case when p_jezik = 'en' then i.ime_en || ' (' || r.oznaka_en || ')'
                else i.ime_sl || ' (' || r.oznaka_sl || ')' end,
           r.cena, k.kolicina
      from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)
      join trgovina.razlicice r on r.id = k.razlicica_id
      join trgovina.izdelki i on i.id = r.izdelek_id
    returning id, razlicica_id, ime, cena, kolicina
  )
  select jsonb_agg(jsonb_build_object('razlicica_id', n.razlicica_id, 'ime', n.ime, 'cena', n.cena,
                                      'kolicina', n.kolicina, 'tax_code', i.tax_code) order by n.id)
    into v_postavke
    from nove n join trgovina.razlicice r on r.id = n.razlicica_id join trgovina.izdelki i on i.id = r.izdelek_id;

  return jsonb_build_object(
    'narocilo_id', v_narocilo.id,
    'javna_oznaka', v_narocilo.javna_oznaka,
    'rezervirano_do', v_narocilo.rezervirano_do,
    'postavke', v_postavke,
    'pismo', not exists (select 1 from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)
                           join trgovina.razlicice r on r.id = k.razlicica_id
                           join trgovina.izdelki i on i.id = r.izdelek_id
                          where not i.pismo));
end;
$$;

create function trgovina.vezi_sejo(p_narocilo bigint, p_checkout text) returns void
language plpgsql
as $$
begin
  update trgovina.narocila set stripe_checkout_id = p_checkout
   where id = p_narocilo and stanje = 'caka_placilo' and stripe_checkout_id is null;
  if not found then
    raise exception 'Trgovina: naročilo ne čaka plačila ali že ima sejo.' using hint = 'trgovina-stanje';
  end if;
end;
$$;

-- checkout.session.completed (paid). Idempotentno po stripe_checkout_id.
-- 'placano' | 'premalo' (plačano, a zaloga bi šla pod 0: narocila.manjka > 0, obvesti Discord) | 'ze' | 'neznano'.
create function trgovina.iz_placila(
  p_checkout text, p_payment_intent text, p_email text, p_ime text, p_naslov jsonb,
  p_postavke int, p_dostava int, p_ddv int, p_skupaj int, p_dostava_kljuc text
) returns text
language plpgsql
as $$
declare
  v_narocilo trgovina.narocila;
  v_manjka int;
begin
  select * into v_narocilo from trgovina.narocila where stripe_checkout_id = p_checkout for update;
  if not found then
    return 'neznano';
  elsif v_narocilo.stanje in ('placano', 'poslano') then
    return 'ze';
  -- Poteklo (pocisti, sprosti) se še plača: Stripe pošlje plačano le za
  -- zaključeno sejo, zaprte seje ni mogoče plačati. Česar ni več na zalogi, gre v manjka.
  elsif v_narocilo.stanje not in ('caka_placilo', 'poteklo') then
    return 'neznano';
  end if;

  perform 1 from trgovina.razlicice r
   where r.id in (select razlicica_id from trgovina.postavke where narocilo_id = v_narocilo.id)
   order by r.id for update;

  select coalesce(sum(greatest(k.kolicina - r.zaloga, 0)), 0) into v_manjka
    from (select razlicica_id, sum(kolicina) as kolicina from trgovina.postavke
           where narocilo_id = v_narocilo.id group by razlicica_id) k
    join trgovina.razlicice r on r.id = k.razlicica_id;

  update trgovina.razlicice r set zaloga = greatest(r.zaloga - k.kolicina, 0)
    from (select razlicica_id, sum(kolicina)::int as kolicina from trgovina.postavke
           where narocilo_id = v_narocilo.id group by razlicica_id) k
   where r.id = k.razlicica_id;

  update trgovina.narocila set
    stanje = 'placano', placano_at = now(), stripe_payment_intent = p_payment_intent,
    email = p_email, ime = p_ime, naslov = p_naslov,
    znesek_postavke = p_postavke, znesek_dostava = p_dostava, znesek_ddv = p_ddv,
    znesek_skupaj = p_skupaj, dostava_kljuc = p_dostava_kljuc, manjka = v_manjka, odjemalec = null
   where id = v_narocilo.id;

  return case when v_manjka > 0 then 'premalo' else 'placano' end;
end;
$$;

-- checkout.session.expired: rezervacija se sprosti. 'poteklo' | 'ze' | 'neznano'.
create function trgovina.potekla(p_checkout text) returns text
language plpgsql
as $$
declare v_stanje text;
begin
  select stanje into v_stanje from trgovina.narocila where stripe_checkout_id = p_checkout for update;
  if not found then
    return 'neznano';
  elsif v_stanje <> 'caka_placilo' then
    return 'ze';
  end if;
  update trgovina.narocila set stanje = 'poteklo', odjemalec = null where stripe_checkout_id = p_checkout;
  return 'poteklo';
end;
$$;

-- Seje Stripe ni bilo mogoče ustvariti ali vezati: rezervacija se sprosti takoj. 'poteklo' | 'ze'.
create function trgovina.sprosti(p_narocilo bigint) returns text
language plpgsql
as $$
begin
  update trgovina.narocila set stanje = 'poteklo', odjemalec = null
   where id = p_narocilo and stanje = 'caka_placilo';
  return case when found then 'poteklo' else 'ze' end;
end;
$$;

-- Prejšnja seja istega brskalnika (trgovina-nakup, prejsnja): naročilo le,
-- če je od tega uporabnika ali (odprto) od tega odjemalca. null, če ni.
create function trgovina.narocilo_seje(p_checkout text, p_user uuid, p_odjemalec text) returns jsonb
language sql stable
as $$
  select jsonb_build_object('id', n.id, 'stanje', n.stanje)
    from trgovina.narocila n
   where n.stripe_checkout_id = p_checkout
     and (n.user_id = p_user or (n.user_id is null and n.stanje = 'caka_placilo' and n.odjemalec = p_odjemalec))
$$;

revoke all on function trgovina.pocisti(), trgovina.narocilo_seje(text, uuid, text) from public, anon, authenticated;
revoke all on function trgovina.oznaka_voljo(bigint), trgovina.narocilo_json(bigint),
  trgovina.rezerviraj(jsonb, uuid, text, text), trgovina.vezi_sejo(bigint, text), trgovina.sprosti(bigint),
  trgovina.iz_placila(text, text, text, text, jsonb, int, int, int, int, text),
  trgovina.potekla(text) from public, anon, authenticated;

-- Shema ni v PostgREST: servis kliče te ovoje (le service_role).
create function public.trgovina_rezerviraj(p_postavke jsonb, p_user uuid, p_jezik text, p_odjemalec text) returns jsonb
language sql security definer set search_path = public
as $$ select trgovina.rezerviraj(p_postavke, p_user, p_jezik, p_odjemalec) $$;

create function public.trgovina_sprosti(p_narocilo bigint) returns text
language sql security definer set search_path = public
as $$ select trgovina.sprosti(p_narocilo) $$;

create function public.trgovina_vezi_sejo(p_narocilo bigint, p_checkout text) returns void
language sql security definer set search_path = public
as $$ select trgovina.vezi_sejo(p_narocilo, p_checkout) $$;

create function public.trgovina_iz_placila(
  p_checkout text, p_payment_intent text, p_email text, p_ime text, p_naslov jsonb,
  p_postavke int, p_dostava int, p_ddv int, p_skupaj int, p_dostava_kljuc text
) returns text
language sql security definer set search_path = public
as $$ select trgovina.iz_placila(p_checkout, p_payment_intent, p_email, p_ime, p_naslov,
                                 p_postavke, p_dostava, p_ddv, p_skupaj, p_dostava_kljuc) $$;

create function public.trgovina_potekla(p_checkout text) returns text
language sql security definer set search_path = public
as $$ select trgovina.potekla(p_checkout) $$;

create function public.trgovina_narocilo_seje(p_checkout text, p_user uuid, p_odjemalec text) returns jsonb
language sql stable security definer set search_path = public
as $$ select trgovina.narocilo_seje(p_checkout, p_user, p_odjemalec) $$;
revoke all on function public.trgovina_narocilo_seje(text, uuid, text) from public, anon, authenticated;
grant execute on function public.trgovina_narocilo_seje(text, uuid, text) to service_role;

revoke all on function public.trgovina_rezerviraj(jsonb, uuid, text, text), public.trgovina_vezi_sejo(bigint, text),
  public.trgovina_sprosti(bigint),
  public.trgovina_iz_placila(text, text, text, text, jsonb, int, int, int, int, text),
  public.trgovina_potekla(text) from public, anon, authenticated;
grant execute on function public.trgovina_rezerviraj(jsonb, uuid, text, text), public.trgovina_vezi_sejo(bigint, text),
  public.trgovina_sprosti(bigint),
  public.trgovina_iz_placila(text, text, text, text, jsonb, int, int, int, int, text),
  public.trgovina_potekla(text) to service_role;

-- Za pošto (trgovina-posta): servis ali admin.
create function public.trgovina_narocilo_za_posto(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (current_setting('role', true) = 'service_role' or is_admin()) then
    raise insufficient_privilege using message = 'Trgovina: le servis ali admin.';
  end if;
  return trgovina.narocilo_json(p_id);
end;
$$;
revoke all on function public.trgovina_narocilo_za_posto(bigint) from public, anon;
grant execute on function public.trgovina_narocilo_za_posto(bigint) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Kupec: svoja naročila (brez nedokončanih).
-- --------------------------------------------------------------------------
create function public.trgovina_moja_narocila() returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(trgovina.narocilo_json(n.id) - 'user_id' - 'manjka' order by n.created_at desc), '[]'::jsonb)
  from trgovina.narocila n
  where n.user_id = auth.uid() and n.stanje not in ('caka_placilo', 'poteklo')
$$;
revoke all on function public.trgovina_moja_narocila() from public, anon;
grant execute on function public.trgovina_moja_narocila() to authenticated;

-- --------------------------------------------------------------------------
-- Administracija (is_admin()).
-- --------------------------------------------------------------------------
create function trgovina.le_admin() returns void
language plpgsql stable
as $$
begin
  if not public.is_admin() then
    raise insufficient_privilege using message = 'Trgovina: le admin.';
  end if;
end;
$$;
revoke all on function trgovina.le_admin() from public, anon, authenticated;

-- p_stanje null = vsa naročila.
create function public.trgovina_admin_narocila(p_stanje text default 'placano') returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select coalesce(jsonb_agg(trgovina.narocilo_json(n.id) order by coalesce(n.placano_at, n.created_at)), '[]'::jsonb)
            from trgovina.narocila n where p_stanje is null or n.stanje = p_stanje);
end;
$$;

create function public.trgovina_admin_narocilo(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return trgovina.narocilo_json(p_id);
end;
$$;

-- Vnos sledilne številke; vrne podatke za mail "odposlano".
create function public.trgovina_admin_poslano(p_narocilo bigint, p_sledilna text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v trgovina.narocila;
begin
  perform trgovina.le_admin();
  if nullif(btrim(p_sledilna), '') is null then
    raise exception 'Trgovina: manjka sledilna številka.' using hint = 'trgovina-vnos';
  end if;
  update trgovina.narocila
     set stanje = 'poslano', sledilna = btrim(p_sledilna), poslano_at = coalesce(poslano_at, now())
   where id = p_narocilo and stanje in ('placano', 'poslano')
  returning * into v;
  if not found then
    raise exception 'Trgovina: naročilo ni plačano.' using hint = 'trgovina-stanje';
  end if;
  return jsonb_build_object('email', v.email, 'jezik', v.jezik, 'javna_oznaka', v.javna_oznaka,
                            'sledilna', v.sledilna, 'ime', v.ime);
end;
$$;

create function public.trgovina_admin_izdelki() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select coalesce(jsonb_agg(to_jsonb(i) || jsonb_build_object('razlicice', coalesce((
             select jsonb_agg(to_jsonb(r) || jsonb_build_object('na_voljo', z.na_voljo) order by r.vrstni_red, r.id)
               from trgovina.razlicice r join trgovina.razpolozljivo z on z.razlicica_id = r.id
              where r.izdelek_id = i.id), '[]'::jsonb)) order by i.vrstni_red, i.id), '[]'::jsonb)
            from trgovina.izdelki i);
end;
$$;

-- Vstavi (brez id) ali delno posodobi izdelek; manjkajoča polja ostanejo.
create function public.trgovina_admin_shrani_izdelek(p jsonb) returns bigint
language plpgsql security definer set search_path = public
as $$
declare r trgovina.izdelki;
begin
  perform trgovina.le_admin();
  if p ? 'id' and p->>'id' is not null then
    select * into r from trgovina.izdelki where id = (p->>'id')::bigint for update;
    if not found then
      raise exception 'Trgovina: ni izdelka.' using hint = 'trgovina-vnos';
    end if;
    r := jsonb_populate_record(r, p - 'id' - 'created_at');
    update trgovina.izdelki set slug = r.slug, ime_sl = r.ime_sl, ime_en = r.ime_en, opis_sl = r.opis_sl,
      opis_en = r.opis_en, kategorija = r.kategorija, slike = r.slike, tax_code = r.tax_code,
      pismo = r.pismo, aktiven = r.aktiven, vrstni_red = r.vrstni_red
     where id = r.id;
    return r.id;
  end if;
  r := jsonb_populate_record(null::trgovina.izdelki,
         '{"opis_sl":"","opis_en":"","slike":[],"tax_code":"txcd_99999999","pismo":false,"aktiven":false,"vrstni_red":0}'::jsonb
         || (p - 'id' - 'created_at'));
  insert into trgovina.izdelki (slug, ime_sl, ime_en, opis_sl, opis_en, kategorija, slike, tax_code,
                                pismo, aktiven, vrstni_red)
  values (r.slug, r.ime_sl, r.ime_en, r.opis_sl, r.opis_en, r.kategorija, r.slike, r.tax_code,
          r.pismo, r.aktiven, r.vrstni_red)
  returning id into r.id;
  return r.id;
end;
$$;

-- Obstoječi različici se zaloga spremeni le za zaloga_dodaj (lahko negativno),
-- da hkratna prodaja med urejanjem ne izgine; nova dobi začetno zalogo.
create function public.trgovina_admin_shrani_razlicico(p jsonb) returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  r trgovina.razlicice;
  v_dodaj int;
begin
  perform trgovina.le_admin();
  if p ? 'zaloga_dodaj' and (jsonb_typeof(p->'zaloga_dodaj') <> 'number'
                             or (p->>'zaloga_dodaj')::numeric not between -1000000 and 1000000
                             or (p->>'zaloga_dodaj')::numeric <> trunc((p->>'zaloga_dodaj')::numeric)) then
    raise exception 'Trgovina: zaloga_dodaj mora biti celo število.' using hint = 'trgovina-vnos';
  end if;
  v_dodaj := coalesce((p->>'zaloga_dodaj')::int, 0);
  if p ? 'id' and p->>'id' is not null then
    if p ? 'zaloga' then
      raise exception 'Trgovina: zalogo obstoječe različice spremeni z zaloga_dodaj.' using hint = 'trgovina-vnos';
    end if;
    select * into r from trgovina.razlicice where id = (p->>'id')::bigint for update;
    if not found then
      raise exception 'Trgovina: ni različice.' using hint = 'trgovina-vnos';
    end if;
    if r.zaloga + v_dodaj < 0 then
      raise exception 'Trgovina: zaloga bi šla pod 0.' using hint = 'trgovina-zaloga';
    end if;
    r := jsonb_populate_record(r, p - 'id' - 'zaloga_dodaj');
    update trgovina.razlicice set izdelek_id = r.izdelek_id, oznaka_sl = r.oznaka_sl, oznaka_en = r.oznaka_en,
      sku = r.sku, cena = r.cena, zaloga = zaloga + v_dodaj, teza_g = r.teza_g, aktivna = r.aktivna,
      vrstni_red = r.vrstni_red
     where id = r.id;
    return r.id;
  end if;
  r := jsonb_populate_record(null::trgovina.razlicice,
         '{"zaloga":0,"teza_g":0,"aktivna":true,"vrstni_red":0}'::jsonb || (p - 'id' - 'zaloga_dodaj'));
  r.zaloga := r.zaloga + v_dodaj;
  insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, zaloga, teza_g, aktivna, vrstni_red)
  values (r.izdelek_id, r.oznaka_sl, r.oznaka_en, r.sku, r.cena, r.zaloga, r.teza_g, r.aktivna, r.vrstni_red)
  returning id into r.id;
  return r.id;
end;
$$;

revoke all on function public.trgovina_katalog(), public.trgovina_izdelek(text) from public;
grant execute on function public.trgovina_katalog(), public.trgovina_izdelek(text) to anon, authenticated;
revoke all on function public.trgovina_admin_narocila(text), public.trgovina_admin_narocilo(bigint),
  public.trgovina_admin_poslano(bigint, text), public.trgovina_admin_izdelki(),
  public.trgovina_admin_shrani_izdelek(jsonb), public.trgovina_admin_shrani_razlicico(jsonb) from public, anon;
grant execute on function public.trgovina_admin_narocila(text), public.trgovina_admin_narocilo(bigint),
  public.trgovina_admin_poslano(bigint, text), public.trgovina_admin_izdelki(),
  public.trgovina_admin_shrani_izdelek(jsonb), public.trgovina_admin_shrani_razlicico(jsonb) to authenticated;

-- --------------------------------------------------------------------------
-- Shramba slik (javno vedro `trgovina`, piše le admin). Kot pri
-- prevzem_pripravi_shrambo: na strežniku brez sheme storage se le preskoči;
-- ko jo vklopiš: `select trgovina_pripravi_shrambo();`
-- --------------------------------------------------------------------------
create function public.trgovina_pripravi_shrambo() returns void
language plpgsql security definer set search_path = public
as $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'Sheme storage ni: vedro trgovine ni ustvarjeno.';
    return;
  end if;
  execute $s$
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('trgovina', 'trgovina', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
                                   allowed_mime_types = excluded.allowed_mime_types
  $s$;
  execute 'drop policy if exists "trgovina: admin bere" on storage.objects';
  execute 'drop policy if exists "trgovina: admin naloži" on storage.objects';
  execute 'drop policy if exists "trgovina: admin zamenja" on storage.objects';
  execute 'drop policy if exists "trgovina: admin izbriše" on storage.objects';
  execute $s$create policy "trgovina: admin bere" on storage.objects for select to authenticated
    using (bucket_id = 'trgovina' and public.is_admin())$s$;
  execute $s$create policy "trgovina: admin naloži" on storage.objects for insert to authenticated
    with check (bucket_id = 'trgovina' and public.is_admin())$s$;
  execute $s$create policy "trgovina: admin zamenja" on storage.objects for update to authenticated
    using (bucket_id = 'trgovina' and public.is_admin()) with check (bucket_id = 'trgovina' and public.is_admin())$s$;
  execute $s$create policy "trgovina: admin izbriše" on storage.objects for delete to authenticated
    using (bucket_id = 'trgovina' and public.is_admin())$s$;
end;
$$;
revoke all on function public.trgovina_pripravi_shrambo() from public, anon, authenticated;

select public.trgovina_pripravi_shrambo();

-- --------------------------------------------------------------------------
-- Začetni katalog: neaktiven, zaloga 0, cene so osnutek (uredi admin).
-- --------------------------------------------------------------------------
insert into trgovina.izdelki (slug, ime_sl, ime_en, kategorija, tax_code, pismo, vrstni_red) values
  ('majica', 'Majica SLFF', 'SLFF T-shirt', 'oblacila', 'txcd_30011000', false, 10),
  ('pulover', 'Pulover s kapuco SLFF', 'SLFF hoodie', 'oblacila', 'txcd_30011000', false, 20),
  ('sal', 'Šal SLFF', 'SLFF scarf', 'dodatki', 'txcd_99999999', false, 30),
  ('kapa', 'Kapa SLFF', 'SLFF beanie', 'dodatki', 'txcd_99999999', false, 40),
  ('skodelica', 'Skodelica SLFF', 'SLFF mug', 'dom', 'txcd_99999999', false, 50),
  ('pivski-kozarec', 'Pivski kozarec SLFF', 'SLFF beer glass', 'dom', 'txcd_99999999', false, 60),
  ('nalepke', 'Nalepke SLFF', 'SLFF stickers', 'nalepke', 'txcd_99999999', true, 70);

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, b.sl || ' / ' || v.v, b.en || ' / ' || v.v, 'MAJ-' || b.k || '-' || v.v, 2500, 180, b.n * 10 + v.n
from trgovina.izdelki i,
     (values ('Črna', 'Black', 'CRN', 1), ('Bela', 'White', 'BEL', 2)) b(sl, en, k, n),
     (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)) v(v, n)
where i.slug = 'majica';

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, 'Črna / ' || v.v, 'Black / ' || v.v, 'PUL-CRN-' || v.v, 4500, 550, v.n
from trgovina.izdelki i, (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)) v(v, n)
where i.slug = 'pulover';

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g)
select i.id, x.sl, x.en, x.sku, x.cena, x.teza
from trgovina.izdelki i
join (values ('sal', 'Ena velikost', 'One size', 'SAL-1', 2000, 150),
             ('kapa', 'Ena velikost', 'One size', 'KAP-1', 1800, 80),
             ('skodelica', '330 ml', '330 ml', 'SKO-1', 1200, 350),
             ('pivski-kozarec', '0,5 l', '0.5 l', 'KOZ-1', 1000, 300),
             ('nalepke', 'Komplet', 'Set', 'NAL-1', 400, 20)) x(slug, sl, en, sku, cena, teza)
  on x.slug = i.slug;
