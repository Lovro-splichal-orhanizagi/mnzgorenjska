-- Zasebna sporočila v igri (SLF-373).
--
-- Pravilo: preverjen igralec piše komurkoli, ostali le preverjenim. Pogovor
-- se začne s profila potrjenega igralca (prejemnik je lastnik profila); v
-- obstoječem pogovoru se pravilo preveri ob vsakem sporočilu znova.
--
-- Varovala, ki veljajo vedno:
-- - mladinski ali anonimizirani profil ne piše in ne prejema (kdor ima
--   potrjen tak profil, je iz sporočil izločen v celoti),
-- - omejen račun ne piše,
-- - vsak lahko sporočila izklopi, blokira sogovornika in prijavi sporočilo,
-- - največ 20 novih pogovorov in 300 sporočil na 24 ur na pošiljatelja.
--
-- Vse teče prek funkcij spodaj; tabele vlogi `authenticated` niso odprte.

create table public.pogovori (
  id bigint generated always as identity primary key,
  a uuid not null references public.profiles on delete cascade,
  b uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  zadnje_at timestamptz not null default now(),
  check (a < b),
  unique (a, b)
);
create index pogovori_b on public.pogovori (b);

create table public.sporocila (
  id bigint generated always as identity primary key,
  pogovor_id bigint not null references public.pogovori on delete cascade,
  avtor uuid not null references public.profiles on delete cascade,
  besedilo text not null check (char_length(btrim(besedilo)) between 1 and 1000),
  created_at timestamptz not null default now(),
  prebrano_at timestamptz
);
create index sporocila_pogovor on public.sporocila (pogovor_id, id desc);
create index sporocila_avtor_cas on public.sporocila (avtor, created_at);

create table public.sporocila_blokade (
  kdo uuid not null references public.profiles on delete cascade,
  koga uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kdo, koga)
);

create table public.sporocila_izklop (
  user_id uuid primary key references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table public.sporocila_prijave (
  id bigint generated always as identity primary key,
  sporocilo_id bigint not null references public.sporocila on delete cascade,
  prijavil uuid not null references public.profiles on delete cascade,
  razlog text check (razlog is null or char_length(razlog) <= 300),
  created_at timestamptz not null default now(),
  reseno_at timestamptz,
  unique (sporocilo_id, prijavil)
);

alter table public.pogovori enable row level security;
alter table public.sporocila enable row level security;
alter table public.sporocila_blokade enable row level security;
alter table public.sporocila_izklop enable row level security;
alter table public.sporocila_prijave enable row level security;
revoke all on public.pogovori, public.sporocila, public.sporocila_blokade,
  public.sporocila_izklop, public.sporocila_prijave from public, anon, authenticated;

insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.pogovori', 'kdo si piše s kom'),
  ('public.sporocila', 'zasebna sporočila uporabnikov'),
  ('public.sporocila_blokade', 'blokade med uporabniki'),
  ('public.sporocila_izklop', 'nastavitve sporočil uporabnikov'),
  ('public.sporocila_prijave', 'prijave zasebnih sporočil')
on conflict (tabela) do nothing;

-- Uporabnik ima potrjen preverjen profil igralca.
create or replace function public.sporocila_preverjen(p_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from zahtevki_igralca z
                  where z.user_id = p_uid and z.status = 'potrjen' and je_preverjen(z.player_id))
$$;

-- Uporabnik ima potrjen mladinski ali anonimiziran profil: iz sporočil izločen.
create or replace function public.sporocila_izlocen(p_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from zahtevki_igralca z
                  where z.user_id = p_uid and z.status = 'potrjen' and not izlozba_odrasla_oseba(z.player_id))
$$;

-- Ali sme `p_od` pisati `p_za`; null pomeni da, sicer koda razloga.
create or replace function public.sporocila_razlog(p_od uuid, p_za uuid)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when p_od is null then 'prijava'
    when p_za is null or p_od = p_za then 'sam'
    when je_omejen(p_od) then 'omejen'
    when sporocila_izlocen(p_od) or sporocila_izlocen(p_za) then 'mladinec'
    when exists (select 1 from sporocila_izklop i where i.user_id = p_za) then 'izklop'
    when exists (select 1 from sporocila_blokade x
                  where (x.kdo = p_za and x.koga = p_od) or (x.kdo = p_od and x.koga = p_za)) then 'blokada'
    when not (sporocila_preverjen(p_od) or sporocila_preverjen(p_za)) then 'preverjen'
  end
$$;
revoke all on function public.sporocila_preverjen(uuid), public.sporocila_izlocen(uuid),
  public.sporocila_razlog(uuid, uuid) from public, anon, authenticated;

-- Lastnik potrjenega profila igralca (katerakoli vrstica osebe).
create or replace function public.sporocila_lastnik(p_player_id bigint)
returns uuid language sql stable security definer set search_path = public
as $$
  select z.user_id from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id)
$$;
revoke all on function public.sporocila_lastnik(bigint) from public, anon, authenticated;

-- Za gumb na profilu igralca: null (sme), koda razloga ali 'ni_lastnika'.
create or replace function public.sporocila_sme_pisati(p_player_id bigint)
returns text language sql stable security definer set search_path = public
as $$
  select case when sporocila_lastnik(p_player_id) is null then 'ni_lastnika'
              else sporocila_razlog(auth.uid(), sporocila_lastnik(p_player_id)) end
$$;
revoke all on function public.sporocila_sme_pisati(bigint) from public;
grant execute on function public.sporocila_sme_pisati(bigint) to anon, authenticated;

-- Začne (ali najde) pogovor z lastnikom profila igralca in vrne njegov id.
create or replace function public.sporocila_zacni(p_player_id bigint)
returns bigint language plpgsql volatile security definer set search_path = public
as $$
declare
  v_jaz uuid := auth.uid();
  v_on uuid := sporocila_lastnik(p_player_id);
  v_razlog text;
  v_id bigint;
begin
  if v_on is null then
    raise exception 'Profil nima lastnika.' using hint = 'ni_lastnika';
  end if;
  v_razlog := sporocila_razlog(v_jaz, v_on);
  if v_razlog is not null then
    raise exception 'Pisanje ni dovoljeno.' using hint = v_razlog;
  end if;
  select p.id into v_id from pogovori p where p.a = least(v_jaz, v_on) and p.b = greatest(v_jaz, v_on);
  if v_id is not null then
    return v_id;
  end if;
  if (select count(*) from pogovori p where (p.a = v_jaz or p.b = v_jaz) and p.created_at > now() - interval '24 hours'
        and not exists (select 1 from sporocila s where s.pogovor_id = p.id and s.avtor <> v_jaz)) >= 20 then
    raise exception 'Preveč novih pogovorov.' using hint = 'meja';
  end if;
  insert into pogovori (a, b) values (least(v_jaz, v_on), greatest(v_jaz, v_on)) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.sporocila_zacni(bigint) from public;
grant execute on function public.sporocila_zacni(bigint) to authenticated;

create or replace function public.sporocila_poslji(p_pogovor bigint, p_besedilo text)
returns bigint language plpgsql volatile security definer set search_path = public
as $$
declare
  v_jaz uuid := auth.uid();
  v_p pogovori;
  v_razlog text;
  v_id bigint;
begin
  select * into v_p from pogovori where id = p_pogovor and v_jaz in (a, b);
  if v_p.id is null then
    raise exception 'Pogovor ne obstaja.' using hint = 'ni_pogovora';
  end if;
  v_razlog := sporocila_razlog(v_jaz, case when v_p.a = v_jaz then v_p.b else v_p.a end);
  if v_razlog is not null then
    raise exception 'Pisanje ni dovoljeno.' using hint = v_razlog;
  end if;
  if (select count(*) from sporocila s where s.avtor = v_jaz and s.created_at > now() - interval '24 hours') >= 300 then
    raise exception 'Preveč sporočil.' using hint = 'meja';
  end if;
  insert into sporocila (pogovor_id, avtor, besedilo) values (p_pogovor, v_jaz, btrim(p_besedilo)) returning id into v_id;
  update pogovori set zadnje_at = now() where id = p_pogovor;
  return v_id;
end;
$$;
revoke all on function public.sporocila_poslji(bigint, text) from public;
grant execute on function public.sporocila_poslji(bigint, text) to authenticated;

-- Moji pogovori z zadnjim sporočilom, neprebranimi in ali sme pisati naprej.
create or replace function public.sporocila_pogovori()
returns table (id bigint, drugi uuid, ime text, igralec_id bigint, igralec text, preverjen boolean,
               zadnje text, zadnje_moje boolean, zadnje_at timestamptz, neprebranih int, razlog text, blokiran boolean)
language sql stable security definer set search_path = public
as $$
  with moji as (
    select p.id, p.zadnje_at, case when p.a = auth.uid() then p.b else p.a end as drugi
      from pogovori p where auth.uid() in (p.a, p.b)
  )
  select m.id, m.drugi, pr.display_name, z.player_id, pl.full_name, sporocila_preverjen(m.drugi),
         s.besedilo, s.avtor = auth.uid(), m.zadnje_at,
         (select count(*)::int from sporocila n where n.pogovor_id = m.id and n.avtor <> auth.uid() and n.prebrano_at is null),
         sporocila_razlog(auth.uid(), m.drugi),
         exists (select 1 from sporocila_blokade x where x.kdo = auth.uid() and x.koga = m.drugi)
    from moji m
    join profiles pr on pr.id = m.drugi
    left join lateral (select zz.player_id from zahtevki_igralca zz
                        where zz.user_id = m.drugi and zz.status = 'potrjen' order by zz.id limit 1) z on true
    left join players pl on pl.id = z.player_id and pl.anonimiziran_at is null
    left join lateral (select ss.besedilo, ss.avtor from sporocila ss
                        where ss.pogovor_id = m.id order by ss.id desc limit 1) s on true
   where s.besedilo is not null
      or exists (select 1 from pogovori p where p.id = m.id and p.created_at > now() - interval '1 day')
   order by m.zadnje_at desc
   limit 200
$$;
revoke all on function public.sporocila_pogovori() from public;
grant execute on function public.sporocila_pogovori() to authenticated;

-- Zadnjih 100 sporočil pogovora (starejša s `p_pred`); prejeta označi kot prebrana.
create or replace function public.sporocila_pogovora(p_pogovor bigint, p_pred bigint default null)
returns table (id bigint, moje boolean, besedilo text, created_at timestamptz, prebrano boolean)
language plpgsql volatile security definer set search_path = public
as $$
begin
  if not exists (select 1 from pogovori p where p.id = p_pogovor and auth.uid() in (p.a, p.b)) then
    return;
  end if;
  update sporocila s set prebrano_at = now()
   where s.pogovor_id = p_pogovor and s.avtor <> auth.uid() and s.prebrano_at is null;
  return query
  select s.id, s.avtor = auth.uid(), s.besedilo, s.created_at, s.prebrano_at is not null
    from sporocila s
   where s.pogovor_id = p_pogovor and (p_pred is null or s.id < p_pred)
   order by s.id desc
   limit 100;
end;
$$;
revoke all on function public.sporocila_pogovora(bigint, bigint) from public;
grant execute on function public.sporocila_pogovora(bigint, bigint) to authenticated;

create or replace function public.sporocila_neprebrana()
returns int language sql stable security definer set search_path = public
as $$
  select count(*)::int from sporocila s join pogovori p on p.id = s.pogovor_id
   where auth.uid() in (p.a, p.b) and s.avtor <> auth.uid() and s.prebrano_at is null
$$;
revoke all on function public.sporocila_neprebrana() from public;
grant execute on function public.sporocila_neprebrana() to authenticated;

create or replace function public.sporocila_blokiraj(p_pogovor bigint, p_da boolean)
returns void language plpgsql volatile security definer set search_path = public
as $$
declare
  v_drugi uuid;
begin
  select case when p.a = auth.uid() then p.b else p.a end into v_drugi
    from pogovori p where p.id = p_pogovor and auth.uid() in (p.a, p.b);
  if v_drugi is null then
    raise exception 'Pogovor ne obstaja.' using hint = 'ni_pogovora';
  end if;
  if p_da then
    insert into sporocila_blokade (kdo, koga) values (auth.uid(), v_drugi) on conflict do nothing;
  else
    delete from sporocila_blokade where kdo = auth.uid() and koga = v_drugi;
  end if;
end;
$$;
revoke all on function public.sporocila_blokiraj(bigint, boolean) from public;
grant execute on function public.sporocila_blokiraj(bigint, boolean) to authenticated;

-- Prijava prejetega sporočila (le sogovornik, ne lastnega).
create or replace function public.sporocila_prijavi(p_sporocilo bigint, p_razlog text default null)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  if not exists (select 1 from sporocila s join pogovori p on p.id = s.pogovor_id
                  where s.id = p_sporocilo and s.avtor <> auth.uid() and auth.uid() in (p.a, p.b)) then
    raise exception 'Sporočila ni mogoče prijaviti.' using hint = 'ni_pogovora';
  end if;
  insert into sporocila_prijave (sporocilo_id, prijavil, razlog)
  values (p_sporocilo, auth.uid(), nullif(btrim(left(p_razlog, 300)), ''))
  on conflict (sporocilo_id, prijavil) do nothing;
end;
$$;
revoke all on function public.sporocila_prijavi(bigint, text) from public;
grant execute on function public.sporocila_prijavi(bigint, text) to authenticated;

create or replace function public.sporocila_izklopi(p_da boolean)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Prijava je obvezna.' using hint = 'prijava';
  end if;
  if p_da then
    insert into sporocila_izklop (user_id) values (auth.uid()) on conflict do nothing;
  else
    delete from sporocila_izklop where user_id = auth.uid();
  end if;
end;
$$;
revoke all on function public.sporocila_izklopi(boolean) from public;
grant execute on function public.sporocila_izklopi(boolean) to authenticated;

create or replace function public.sporocila_moje_stanje()
returns table (izklopljeno boolean, preverjen boolean, izlocen boolean)
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from sporocila_izklop i where i.user_id = auth.uid()),
         sporocila_preverjen(auth.uid()), sporocila_izlocen(auth.uid())
$$;
revoke all on function public.sporocila_moje_stanje() from public;
grant execute on function public.sporocila_moje_stanje() to authenticated;

-- Admin: odprte prijave s prijavljenim sporočilom in avtorjem.
create or replace function public.admin_prijave_sporocil()
returns table (id bigint, sporocilo_id bigint, besedilo text, avtor uuid, avtor_ime text,
               prijavil_ime text, razlog text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Le za admina.';
  end if;
  return query
  select r.id, s.id, s.besedilo, s.avtor, a.display_name, b.display_name, r.razlog, r.created_at
    from sporocila_prijave r
    join sporocila s on s.id = r.sporocilo_id
    join profiles a on a.id = s.avtor
    join profiles b on b.id = r.prijavil
   where r.reseno_at is null
   order by r.created_at;
end;
$$;
revoke all on function public.admin_prijave_sporocil() from public;
grant execute on function public.admin_prijave_sporocil() to authenticated;

-- Admin: prijavo zapre; z `p_izbrisi` izbriše še sporočilo.
create or replace function public.admin_resi_prijavo_sporocila(p_id bigint, p_izbrisi boolean)
returns void language plpgsql volatile security definer set search_path = public
as $$
declare
  v_sporocilo bigint;
begin
  if not is_admin() then
    raise exception 'Le za admina.';
  end if;
  select r.sporocilo_id into v_sporocilo from sporocila_prijave r where r.id = p_id;
  if p_izbrisi then
    delete from sporocila where id = v_sporocilo;
  else
    update sporocila_prijave set reseno_at = now() where sporocilo_id = v_sporocilo and reseno_at is null;
  end if;
end;
$$;
revoke all on function public.admin_resi_prijavo_sporocila(bigint, boolean) from public;
grant execute on function public.admin_resi_prijavo_sporocila(bigint, boolean) to authenticated;
