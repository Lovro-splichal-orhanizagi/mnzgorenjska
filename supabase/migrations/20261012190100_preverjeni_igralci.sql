-- Preverjeni igralci (faza 1, brez plačil).
--
-- Nad prevzemom profila ("To sem jaz", 20261012091100): potrjen igralec z
-- veljavno pravico (`preverjeni_racuni`) dobi modro kljukico ob imenu in
-- dodatke na profilu (daljši opis, več povezav, pasica, barva, izpostavljena
-- tekma ali statistika, sporočilo navijačem). Pravico zdaj dodeli le admin
-- (vir 'rocno'); plačilo (Stripe, 'letna' in 'dozivljenjska') pride v fazi 2
-- in se priklopi na iste stolpce.
--
-- Stikalo `preverjeni_racuni` v `settings`: 0 izklopljeno (privzeto), 1
-- preizkus (le admin in `testerji`), 2 v živo. Vsako branje statusa in
-- dodatkov gre skozi `vidi_preverjene()`, zato pri 0 ne pricurlja nič — tudi
-- lastniku ne (kot `sponzorji_vidni` v `sponzorji_za`).

insert into settings (key, value) values ('preverjeni_racuni', '0')
on conflict (key) do nothing;

-- --------------------------------------------------------------------------
-- Preizkuševalci (stikalo 1)
-- --------------------------------------------------------------------------
create table public.testerji (
  user_id    uuid primary key references public.profiles on delete cascade,
  dodal      uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.testerji is
  'Uporabniki, ki vidijo preverjene igralce, ko je stikalo preverjeni_racuni 1. Piše le admin prek RPC.';
alter table public.testerji enable row level security;
revoke all on public.testerji from anon, authenticated;
grant select on public.testerji to authenticated;
create policy "admin bere preizkuševalce" on public.testerji
  for select to authenticated using (is_admin());

create or replace function public.vidi_preverjene()
returns boolean language sql stable security definer set search_path = public
as $$
  select case coalesce(nastavitev_int('preverjeni_racuni', 0), 0)
           when 2 then true
           when 1 then is_admin() or exists (select 1 from testerji where user_id = auth.uid())
           else false
         end
$$;
revoke all on function public.vidi_preverjene() from public;
grant execute on function public.vidi_preverjene() to anon, authenticated;

-- --------------------------------------------------------------------------
-- Pravica (entitlement)
-- --------------------------------------------------------------------------
create table public.preverjeni_racuni (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles on delete cascade,
  -- Glavna vrstica potrjenega zahtevka; povezane vrstice gredo prek nje.
  player_id    bigint not null references public.players on delete cascade,
  vir          text not null check (vir in ('rocno', 'letna', 'dozivljenjska')),
  status       text not null default 'aktiven' check (status in ('aktiven', 'preklican', 'potekel')),
  -- Null: brez roka (doživljenjska ali ročna brez omejitve).
  velja_do     timestamptz,
  -- Plačilo zahteva polnoletnost (potrditev ob nakupu, faza 2); ročna pravica sme biti brez.
  star_vsaj_18 boolean,
  -- Rezervirano za fazo 2 (Stripe); zdaj vedno prazno.
  stripe_customer_id     text,
  stripe_subscription_id text,
  ustvaril     uuid references public.profiles on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (vir = 'rocno' or star_vsaj_18 is true)
);
comment on table public.preverjeni_racuni is
  'Pravica do značke in dodatkov preverjenega igralca. Piše le admin prek RPC (faza 2: plačilo).';
create unique index preverjeni_racuni_en_aktiven on public.preverjeni_racuni (player_id) where status = 'aktiven';
create index preverjeni_racuni_uporabnik on public.preverjeni_racuni (user_id);

alter table public.preverjeni_racuni enable row level security;
revoke all on public.preverjeni_racuni from anon, authenticated;
grant select on public.preverjeni_racuni to authenticated;
create policy "admin bere pravice" on public.preverjeni_racuni
  for select to authenticated using (is_admin());

-- Ali je igralec (glavna ali povezana vrstica) preverjen in ali to klicatelj
-- sme videti: potrjen zahtevek, aktivna pravica ISTEGA uporabnika, ki ni
-- potekla, ime ni skrito, stikalo.
create or replace function public.je_preverjen(p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select vidi_preverjene() and exists (
    select 1
      from zahtevki_igralca z
      join players g on g.id = z.player_id and g.anonimiziran_at is null
      join preverjeni_racuni r on r.player_id = z.player_id and r.user_id = z.user_id
     where z.id = prevzem_zahtevek_igralca(p_player_id)
       and r.status = 'aktiven'
       and (r.velja_do is null or r.velja_do > now()))
    and not exists (select 1 from players p where p.id = p_player_id and p.anonimiziran_at is not null)
$$;
revoke all on function public.je_preverjen(bigint) from public;
grant execute on function public.je_preverjen(bigint) to anon, authenticated;

-- Za sezname (Igralci, Klub, igrišča, tekma, iskanje): en klic na stran.
-- Vrne le preverjene id-je in njihov vzdevek; pri skritem stikalu nič.
create or replace function public.preverjeni_igralci_za(p_ids bigint[])
returns table (player_id bigint, vzdevek text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not vidi_preverjene() then
    return;
  end if;
  return query
  select i.id, pr.vzdevek
    from (select distinct unnest(p_ids[1:300]) as id) i
    left join potrjeni_igralci pg on pg.player_id = i.id
    left join profil_igralca pr on pr.player_id = pg.glavni_player_id
   where je_preverjen(i.id);
end;
$$;
revoke all on function public.preverjeni_igralci_za(bigint[]) from public;
grant execute on function public.preverjeni_igralci_za(bigint[]) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Dodatki preverjenega igralca (ključ je glavna vrstica, kot profil_igralca)
-- --------------------------------------------------------------------------
create table public.profil_igralca_plus (
  player_id  bigint primary key references public.players on delete cascade,
  opis       text check (opis is null or char_length(opis) between 1 and 500),
  youtube    text check (youtube is null or youtube ~ '^[A-Za-z0-9._-]{3,30}$'),
  x          text check (x is null or x ~ '^[A-Za-z0-9_]{1,15}$'),
  splet      text check (splet is null or (char_length(splet) <= 200 and splet ~ '^https://[^[:space:]<>"''\\]+$')),
  -- Pot v vedru `fotografije-igralcev`: "<player_id>/banner-<ime>.<webp|jpg>".
  pasica     text check (pasica is null or pasica ~ ('^' || player_id::text || '/banner-[A-Za-z0-9_-]{1,64}\.(webp|jpg)$')),
  barva      text check (barva is null or barva in ('modra', 'zelena', 'rdeca', 'oranzna', 'vijolicna', 'rumena', 'roza', 'siva')),
  -- Izpostavljeno: ena svoja tekma ALI ena statistika sezone.
  tekma_id   bigint references public.matches on delete set null,
  statistika text check (statistika is null or statistika in ('tocke', 'goli', 'asistence', 'nastopi', 'minute', 'ciste_mreze')),
  sporocilo  text check (sporocilo is null or char_length(sporocilo) between 1 and 140),
  updated_at timestamptz not null default now(),
  check (tekma_id is null or statistika is null)
);
comment on table public.profil_igralca_plus is
  'Dodatki preverjenega igralca. Vidni le prek je_preverjen (stikalo preverjeni_racuni); piše lastnik.';

alter table public.profil_igralca_plus enable row level security;
revoke all on public.profil_igralca_plus from anon, authenticated;
grant select on public.profil_igralca_plus to anon, authenticated;
grant insert (player_id, opis, youtube, x, splet, pasica, barva, tekma_id, statistika, sporocilo),
      update (opis, youtube, x, splet, pasica, barva, tekma_id, statistika, sporocilo)
   on public.profil_igralca_plus to authenticated;
create policy "dodatki preverjenih" on public.profil_igralca_plus
  for select to anon, authenticated using (je_preverjen(player_id));
create policy "preverjen lastnik doda" on public.profil_igralca_plus
  for insert to authenticated with check (je_lastnik_profila(player_id) and je_preverjen(player_id));
create policy "preverjen lastnik ureja" on public.profil_igralca_plus
  for update to authenticated
  using (je_lastnik_profila(player_id) and je_preverjen(player_id))
  with check (je_lastnik_profila(player_id) and je_preverjen(player_id));

-- Besedila vidijo vsi: isto pravilo kot prikazno ime in javna mini liga.
-- Tekma mora biti igralčeva (nastop glavne ali povezane vrstice).
create or replace function public.varuj_profil_igralca_plus()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_napaka text;
  v_besedilo text;
begin
  new.opis := nullif(btrim(regexp_replace(coalesce(new.opis, ''), '\s+', ' ', 'g')), '');
  new.sporocilo := nullif(btrim(regexp_replace(coalesce(new.sporocilo, ''), '\s+', ' ', 'g')), '');
  foreach v_besedilo in array array[new.opis, new.sporocilo, new.youtube, new.x,
                                    -- naslov: le besede (znaki URL-ja so pri spletu dovoljeni)
                                    regexp_replace(coalesce(new.splet, ''), '[^[:alnum:]]+', ' ', 'g')] loop
    continue when v_besedilo is null or v_besedilo = '';
    v_napaka := prepovedano_besedilo(v_besedilo);
    if v_napaka = 'znaki' then
      raise exception 'Besedilo vsebuje nedovoljene znake.' using hint = 'plus-znaki';
    elsif v_napaka is not null then
      raise exception 'To besedilo ni dovoljeno.' using hint = 'plus-' || v_napaka;
    end if;
  end loop;
  if new.tekma_id is not null and not exists (
    select 1 from appearances a
     where a.match_id = new.tekma_id
       and (a.player_id = new.player_id
            or a.player_id in (select pi.player_id from povezani_igralci pi
                                where pi.zahtevek_id = prevzem_zahtevek_igralca(new.player_id))))
  then
    raise exception 'Izpostavi lahko le svojo tekmo.' using hint = 'plus-tekma';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.varuj_profil_igralca_plus() from public, anon, authenticated;
create trigger profil_igralca_plus_varuj before insert or update on public.profil_igralca_plus
  for each row execute function public.varuj_profil_igralca_plus();

-- --------------------------------------------------------------------------
-- Brisanje: preklic, anonimizacija, izbris računa
-- --------------------------------------------------------------------------

-- Ista funkcija kot prej, še z dodatki. Pasica je v isti mapi vedra
-- ("<glavni>/banner-…"), zato jo odnese `prevzem_odstrani_fotografije`.
-- Kliče jo preklic (`prevzem_preklici`) in sprožilec anonimizacije.
create or replace function public.prevzem_odstrani_predstavitev(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from profil_igralca where player_id = p_player_id;
  delete from profil_igralca_plus where player_id = p_player_id;
  perform prevzem_odstrani_fotografije(p_player_id);
end;
$$;

-- Izbris računa (kaskada profiles → zahtevki_igralca): potrjen zahtevek
-- izgine brez preklica, zato bi predstavitev, dodatki in datoteke v javnem
-- vedru ostali. Pobriše jih ta sprožilec.
create or replace function public.prevzem_ob_izbrisu_zahtevka()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform prevzem_odstrani_predstavitev(old.player_id);
  return null;
end;
$$;
revoke all on function public.prevzem_ob_izbrisu_zahtevka() from public, anon, authenticated;
create trigger prevzem_izbris_zahtevka after delete on public.zahtevki_igralca
  for each row when (old.status = 'potrjen')
  execute function public.prevzem_ob_izbrisu_zahtevka();

-- Pasico ("<glavni>/banner-…") sme naložiti le preverjen lastnik.
create or replace function public.prevzem_sme_pisati_foto(p_name text)
returns boolean language sql stable security definer set search_path = public
as $$
  select p_name ~ '^-?[0-9]{1,18}/[A-Za-z0-9_-]{1,64}\.(jpg|png|webp)$'
     and je_lastnik_profila(split_part(p_name, '/', 1)::bigint)
     and (split_part(p_name, '/', 2) not like 'banner-%'
          or je_preverjen(split_part(p_name, '/', 1)::bigint))
$$;

-- --------------------------------------------------------------------------
-- Admin
-- --------------------------------------------------------------------------

-- Vsi potrjeni profili z zadnjo pravico (za dodelitev in seznam aktivnih).
create or replace function public.admin_preverjeni()
returns table (
  zahtevek_id bigint, player_id bigint, player_name text, team_name text, liga text,
  user_id uuid, prosilec text, email text,
  pravica_id bigint, vir text, status text, velja_do timestamptz, dodeljena_at timestamptz,
  velja boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select z.id, z.player_id, p.full_name, t.name, c.name,
         z.user_id, pf.display_name, u.email::text,
         r.id, r.vir, r.status, r.velja_do, r.created_at,
         coalesce(r.status = 'aktiven' and (r.velja_do is null or r.velja_do > now()), false)
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
    left join lateral (
      select * from preverjeni_racuni r
       where r.player_id = z.player_id and r.user_id = z.user_id
       order by (r.status = 'aktiven') desc, r.created_at desc limit 1
    ) r on true
   where z.status = 'potrjen'
   order by (r.status = 'aktiven') desc nulls last, p.full_name;
end;
$$;

create or replace function public.admin_dodeli_preverjen(p_player_id bigint, p_vir text default 'rocno', p_velja_do timestamptz default null)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
  v_id bigint;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  if p_vir is distinct from 'rocno' then
    raise exception 'Plačljive pravice (letna, dozivljenjska) vpiše plačilo.';
  end if;
  if p_velja_do is not null and p_velja_do <= now() then
    raise exception 'Rok mora biti v prihodnosti.';
  end if;
  select * into z from zahtevki_igralca where id = prevzem_zahtevek_igralca(p_player_id);
  if not found then
    raise exception 'Igralec nima potrjenega profila.';
  end if;
  -- Potekla pravica ne drži več mesta (en aktiven na igralca).
  update preverjeni_racuni set status = 'potekel', updated_at = now()
   where player_id = z.player_id and status = 'aktiven' and velja_do <= now();
  if exists (select 1 from preverjeni_racuni where player_id = z.player_id and status = 'aktiven') then
    raise exception 'Igralec že ima aktivno pravico.';
  end if;
  insert into preverjeni_racuni (user_id, player_id, vir, velja_do, ustvaril)
  values (z.user_id, z.player_id, p_vir, p_velja_do, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_odvzemi_preverjen(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  update preverjeni_racuni set status = 'preklican', updated_at = now()
   where id = p_id and status = 'aktiven';
  if not found then
    raise exception 'Aktivne pravice s tem id ni.';
  end if;
end;
$$;

create or replace function public.admin_testerji()
returns table (user_id uuid, display_name text, email text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select te.user_id, pf.display_name, u.email::text, te.created_at
    from testerji te
    left join profiles pf on pf.id = te.user_id
    left join auth.users u on u.id = te.user_id
   order by te.created_at;
end;
$$;

create or replace function public.admin_nastavi_testerja(p_user_id uuid, p_dodaj boolean default true)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  if p_dodaj then
    insert into testerji (user_id, dodal) values (p_user_id, auth.uid()) on conflict do nothing;
  else
    delete from testerji where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.admin_preverjeni(), public.admin_dodeli_preverjen(bigint, text, timestamptz),
  public.admin_odvzemi_preverjen(bigint), public.admin_testerji(), public.admin_nastavi_testerja(uuid, boolean)
  from public, anon;
grant execute on function public.admin_preverjeni(), public.admin_dodeli_preverjen(bigint, text, timestamptz),
  public.admin_odvzemi_preverjen(bigint), public.admin_testerji(), public.admin_nastavi_testerja(uuid, boolean)
  to authenticated;
