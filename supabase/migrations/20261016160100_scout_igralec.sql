-- SLFF Scout, faza 2 (stran igralca). Spec: docs/superpowers/specs/2026-10-16-scout-design.md.
--
-- 1. Ugovor se preseli iz players.scout_skrit v zaprto scout.ugovori. Politika
--    "javno branje" na players bi seznam ugovornikov razkrila vsakomur.
--    Ključa sta zgoščena (država + ime, država + šifra) kot pri
--    anonimizaciji, zato ugovor velja za vse vrstice osebe v državi in za
--    poznejše uvoze. Stolpec players.scout_skrit ostane, dokler na produkciji
--    ne teče nov delavec (ločena migracija 20261017090100 ga odstrani).
-- 2. scout.privolitve: odprt za prestop, letnica, regije, stik. Privolitev
--    potrjenega lastnika profila; preklic, ugovor, preklic profila,
--    anonimizacija in izbris računa jo izbrišejo. Ne v profil_igralca, ker
--    je ta javno berljiv.
-- 3. Stroj spusti osebo z mladinsko vrstico, če ima potrjen profil z
--    letnico, s katero je polnoleten vse tekoče leto (scout.odrasle_vrstice).
-- Brskalnik sheme scout ne vidi; vse gre prek SECURITY DEFINER RPC spodaj.

create table scout.ugovori (
  -- Vrstica, iz katere je ključ. Brez tujega ključa: ključ mora preživeti
  -- brisanje vrstice (zdruzi-klube, razdeli-zlite-igralce).
  player_id  bigint not null,
  kljuc      text not null,
  created_at timestamptz not null default now(),
  primary key (player_id, kljuc)
);
create index ugovori_kljuc on scout.ugovori (kljuc);
comment on table scout.ugovori is
  'Ugovor proti Scoutu: zgosceni kljuci osebe (anonimizacijski_kljuc drzava|ime, drzava|reg|sifra). Stroj izloci vsako vrstico z istim kljucem.';

create table scout.privolitve (
  -- Glavna vrstica potrjenega zahtevka (kot profil_igralca).
  player_id        bigint primary key references public.players on delete cascade,
  odprt_za_prestop boolean not null default false,
  letnik           int not null check (letnik between 1940 and 2100),
  -- id-ji public.federations iste drzave; krovna zveza pomeni vso drzavo.
  regije           bigint[] not null default '{}' check (cardinality(regije) <= 50),
  kontakt_dovoljen boolean not null default false,
  updated_at       timestamptz not null default now()
);
comment on table scout.privolitve is
  'Privolitev igralca za Scout (odprt za prestop, letnica, regije, stik). Preklic = izbris vrstice.';

alter table scout.ugovori enable row level security;
alter table scout.privolitve enable row level security;
revoke all on scout.ugovori, scout.privolitve from public, anon, authenticated;
-- Stroj bere le ugovore; privolitve vidi samo prek scout.odrasle_vrstice().
grant select on scout.ugovori to scout_stroj;
create policy stroj on scout.ugovori for select to scout_stroj using (true);

-- Zgoščena ključa vrstic: enako kot anonimiziraj_igralca in SQL_IZKLJUCENI stroja.
create function scout.kljuci_vrstic(p_ids bigint[])
returns table (player_id bigint, kljuc text)
language sql stable set search_path = public
as $$
  select p.id, anonimizacijski_kljuc(v.k)
    from players p join competitions c on c.id = p.competition_id
   cross join lateral (values
     (case when nullif(p.full_name, '') is not null then c.country_id || '|' || p.full_name end),
     (case when p.reg_st is not null then c.country_id || '|reg|' || p.reg_st end)) v(k)
   where p.id = any(p_ids) and v.k is not null
$$;

-- Vrstice osebe s potrjenim profilom: glavna in povezane.
create function scout.vrstice_profila(p_glavni bigint)
returns bigint[]
language sql stable set search_path = public
as $$
  select array_agg(id) from (
    select z.player_id as id from zahtevki_igralca z
     where z.player_id = p_glavni and z.status = 'potrjen'
    union
    select pi.player_id from povezani_igralci pi
      join zahtevki_igralca z on z.id = pi.zahtevek_id
     where z.player_id = p_glavni and z.status = 'potrjen') v
$$;

-- Ali je katera od vrstic (po ključu) skrita. Funkcije faze 3 jo pokličejo
-- ob branju, ker model nastane enkrat na dan.
create function scout.je_skrit(p_ids bigint[])
returns boolean
language sql stable set search_path = public
as $$
  select exists (select 1 from scout.kljuci_vrstic(p_ids) k join scout.ugovori u on u.kljuc = k.kljuc)
$$;

-- Za stroj: vrstice, pokrite s potrjenim profilom s polnoletno letnico.
-- Teče kot lastnik, da stroj ne potrebuje branja zahtevkov.
create function scout.odrasle_vrstice()
returns table (player_id bigint)
language sql stable security definer set search_path = public
as $$
  select z.player_id from zahtevki_igralca z
    join scout.privolitve s on s.player_id = z.player_id
   where z.status = 'potrjen' and s.letnik <= extract(year from current_date)::int - 19
  union
  select pi.player_id from povezani_igralci pi
    join zahtevki_igralca z on z.id = pi.zahtevek_id and z.status = 'potrjen'
    join scout.privolitve s on s.player_id = z.player_id
   where s.letnik <= extract(year from current_date)::int - 19
$$;

revoke all on function scout.kljuci_vrstic(bigint[]), scout.vrstice_profila(bigint),
  scout.je_skrit(bigint[]), scout.odrasle_vrstice() from public, anon, authenticated;
grant execute on function scout.odrasle_vrstice() to scout_stroj;

-- Prenos ugovorov iz faze 1. Stolpec ostane (stari delavec ga bere do
-- objave novega); odstrani ga 20261017090100.
insert into scout.ugovori (player_id, kljuc)
select k.player_id, k.kljuc
  from scout.kljuci_vrstic(array(select id from public.players where scout_skrit)) k
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RPC za lastnika potrjenega profila (p_player_id = glavna vrstica)
-- ---------------------------------------------------------------------------
create function public.scout_moj_profil(p_player_id bigint)
returns table (drzava_odprta boolean, country_id bigint, skrit boolean, odprt_za_prestop boolean,
               letnik int, regije bigint[], kontakt_dovoljen boolean)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  return query
  select coalesce(d.stanje <> 'zaprto', false), c.country_id,
         -- le ugovori lastnikovih vrstic: soimenjakov ugovor ga ne zaklene
         -- (stroj soimenjake še vedno izloča po ključu imena)
         exists (select 1 from scout.ugovori u where u.player_id = any(scout.vrstice_profila(p_player_id))),
         s.odprt_za_prestop, s.letnik, s.regije, s.kontakt_dovoljen
    from players p
    join competitions c on c.id = p.competition_id
    left join scout.drzave d on d.country_id = c.country_id
    left join scout.privolitve s on s.player_id = p.id
   where p.id = p_player_id;
end;
$$;

create function public.scout_shrani_privolitev(p_player_id bigint, p_odprt boolean, p_letnik int,
                                               p_regije bigint[], p_kontakt boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_drzava bigint;
  v_regije bigint[] := coalesce(p_regije, '{}');
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  select c.country_id into v_drzava
    from players p join competitions c on c.id = p.competition_id
   where p.id = p_player_id;
  if not exists (select 1 from scout.drzave where country_id = v_drzava and stanje <> 'zaprto') then
    raise exception 'Scout v tej državi še ni odprt.';
  end if;
  if exists (select 1 from scout.ugovori u where u.player_id = any(scout.vrstice_profila(p_player_id))) then
    raise exception 'Najprej prekliči ugovor proti Scoutu.';
  end if;
  if p_letnik is null or p_letnik < 1940 or p_letnik > extract(year from current_date)::int - 19 then
    raise exception 'Scout je le za polnoletne: vpiši letnico rojstva.';
  end if;
  if cardinality(v_regije) > 50 or exists (
       select 1 from unnest(v_regije) r(id)
        where not exists (select 1 from federations f where f.id = r.id and f.country_id = v_drzava)) then
    raise exception 'Neznana regija.';
  end if;
  insert into scout.privolitve (player_id, odprt_za_prestop, letnik, regije, kontakt_dovoljen)
  values (p_player_id, coalesce(p_odprt, false), p_letnik,
          array(select distinct r from unnest(v_regije) r order by r), coalesce(p_kontakt, false))
  on conflict (player_id) do update set
    odprt_za_prestop = excluded.odprt_za_prestop,
    letnik = excluded.letnik,
    regije = excluded.regije,
    kontakt_dovoljen = excluded.kontakt_dovoljen,
    updated_at = now();
end;
$$;

-- Preklic privolitve = izbris (spec, razdelek 2).
create function public.scout_preklici_privolitev(p_player_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  delete from scout.privolitve where player_id = p_player_id;
end;
$$;

-- Ugovor lastnika: ključi glavne in povezanih vrstic (šifra zajame še ostale
-- vrstice osebe v državi). Preklic pobriše le ključe teh vrstic: soimenjak,
-- ki je ugovarjal sam, ostane skrit.
create function public.scout_ugovor(p_player_id bigint, p_skrij boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_vrstice bigint[];
begin
  if not je_lastnik_profila(p_player_id) then
    raise insufficient_privilege using message = 'Le potrjeni lastnik profila.';
  end if;
  v_vrstice := scout.vrstice_profila(p_player_id);
  if p_skrij then
    insert into scout.ugovori (player_id, kljuc)
    select k.player_id, k.kljuc from scout.kljuci_vrstic(v_vrstice) k
    on conflict do nothing;
    delete from scout.privolitve where player_id = p_player_id;
  else
    delete from scout.ugovori where player_id = any(v_vrstice);
  end if;
end;
$$;

-- Ugovor po mailu (info@): admin izbere vrstice osebe kot pri anonimizaciji
-- (admin_ista_oseba). Vrne število vpisanih ključev.
create function public.admin_scout_skrij(p_player_ids bigint[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_n integer;
begin
  if not is_admin() then
    raise exception 'Samo administrator.' using errcode = '42501';
  end if;
  insert into scout.ugovori (player_id, kljuc)
  select k.player_id, k.kljuc from scout.kljuci_vrstic(p_player_ids) k
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.scout_moj_profil(bigint),
  public.scout_shrani_privolitev(bigint, boolean, int, bigint[], boolean),
  public.scout_preklici_privolitev(bigint), public.scout_ugovor(bigint, boolean),
  public.admin_scout_skrij(bigint[]) from public, anon, authenticated;
grant execute on function public.scout_moj_profil(bigint),
  public.scout_shrani_privolitev(bigint, boolean, int, bigint[], boolean),
  public.scout_preklici_privolitev(bigint), public.scout_ugovor(bigint, boolean),
  public.admin_scout_skrij(bigint[]) to authenticated;

-- Preklic profila, anonimizacija in izbris računa izbrišejo tudi privolitev.
-- Ista funkcija kot v 20261012190100, z eno vrstico več.
create or replace function public.prevzem_odstrani_predstavitev(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from profil_igralca where player_id = p_player_id;
  delete from profil_igralca_plus where player_id = p_player_id;
  delete from scout.privolitve where player_id = p_player_id;
  update preverjeni_racuni set status = 'preklican', updated_at = now()
   where player_id = p_player_id and status = 'aktiven';
  perform prevzem_odstrani_fotografije(p_player_id);
end;
$$;
revoke all on function public.prevzem_odstrani_predstavitev(bigint) from public, anon, authenticated;
