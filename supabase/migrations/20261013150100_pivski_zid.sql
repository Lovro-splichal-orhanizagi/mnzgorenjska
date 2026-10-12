-- Pivski zid: javna lestvica podpornikov z Buy Me a Coffee (stran /beers).
--
-- `piva` hrani vsak nakup (webhook bmc-pivo, servisni ključ) in ročne vnose
-- (admin). Zneska, valute in e-naslova NE hranimo: zid kaže le ime, število
-- piv, sporočilo in datum. Tabela je zaprta; javno pot da `javna_piva()`, ki
-- izpusti vračila, testne nakupe (live_mode = false) in skrita sporočila.
--
-- BMC v support_note piše HTML prelome (`<br>`), zato sporočilo pred zapisom
-- počisti sprožilec (en kraj za webhook in ročni vnos): <br> → nova vrstica,
-- druge oznake proč, osnovne entitete nazaj v znake, največ 500 znakov.

create table public.piva (
  id bigint generated always as identity primary key,
  -- BMC data.id; ročni vnosi ga nimajo.
  zunanji_id text unique,
  ime text,
  piv int not null default 1 check (piv >= 1),
  -- Sporočilo podpornika; null, če ga je na BMC skril (note_hidden).
  sporocilo text,
  -- Admin skrije sporočilo z zidu (vrstica in piva ostanejo).
  skrito boolean not null default false,
  vracilo boolean not null default false,
  -- Nakup iz testnega načina BMC (live_mode = false); na zidu ga ni.
  test boolean not null default false,
  vir text not null default 'bmc' check (vir in ('bmc', 'rocno')),
  created_at timestamptz not null default now(),
  check ((vir = 'bmc') = (zunanji_id is not null))
);

comment on table public.piva is
  'Pivski zid: nakupi Buy Me a Coffee (bmc-pivo) in ročni vnosi. Brez zneskov in e-naslovov; javno le prek javna_piva().';

alter table public.piva enable row level security;
revoke all on public.piva from public, anon, authenticated;
grant select, insert, update on public.piva to service_role;

-- Čiščenje sporočila (isto pravilo kot `ocistiSporocilo` v
-- supabase/functions/bmc-pivo/sporocilo.ts, ki ga rabi besedilo za Discord).
-- &amp; zadnji, da "&amp;lt;" ostane "&lt;".
create or replace function public.ocisti_sporocilo_piva(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(left(btrim(
    replace(replace(replace(replace(replace(
      regexp_replace(
        regexp_replace(replace(coalesce(p, ''), E'\r\n', E'\n'), '<br\s*/?>', E'\n', 'gi'),
        '<[^>]*>', '', 'g'),
      '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''), '&amp;', '&'),
    E' \t\r\n'), 500), '')
$$;

create or replace function public.piva_pred_zapisom()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.sporocilo := ocisti_sporocilo_piva(new.sporocilo);
  new.ime := nullif(left(btrim(regexp_replace(coalesce(new.ime, ''), '<[^>]*>', '', 'g')), 60), '');
  return new;
end;
$$;

create trigger piva_pred_zapisom
before insert or update of sporocilo, ime on public.piva
for each row execute function public.piva_pred_zapisom();

-- --------------------------------------------------------------------------
-- Javno: ime (null = anonimno), piva, sporočilo (null, če skrito), datum.
-- --------------------------------------------------------------------------
create or replace function public.javna_piva()
returns table (ime text, piv int, sporocilo text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select case when p.ime is null or lower(p.ime) in ('someone', 'nekdo', 'anonymous') then null else p.ime end,
         p.piv,
         case when p.skrito then null else p.sporocilo end,
         p.created_at
    from piva p
   where not p.vracilo and not p.test
   order by p.created_at desc, p.id desc
   limit 2000
$$;

revoke all on function public.javna_piva() from public;
grant execute on function public.javna_piva() to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Admin
-- --------------------------------------------------------------------------
create or replace function public.admin_piva()
returns table (id bigint, zunanji_id text, ime text, piv int, sporocilo text, skrito boolean,
               vracilo boolean, test boolean, vir text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select p.id, p.zunanji_id, p.ime, p.piv, p.sporocilo, p.skrito, p.vracilo, p.test, p.vir, p.created_at
    from piva p
   order by p.created_at desc, p.id desc
   limit 1000;
end;
$$;

create or replace function public.admin_skrij_pivo(p_id bigint, p_skrito boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  update piva set skrito = coalesce(p_skrito, true) where id = p_id;
  if not found then
    raise exception 'Piva s tem id ni.';
  end if;
end;
$$;

create or replace function public.admin_dodaj_pivo(p_ime text, p_piv int, p_sporocilo text default null, p_datum date default null)
returns bigint language plpgsql security definer set search_path = public
as $$
declare v_id bigint;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  if p_piv is null or p_piv < 1 or p_piv > 1000 then
    raise exception 'Število piv mora biti med 1 in 1000.';
  end if;
  insert into piva (ime, piv, sporocilo, vir, created_at)
  values (p_ime, p_piv, p_sporocilo, 'rocno',
          case when p_datum is null or p_datum = current_date then now()
               else (p_datum::timestamp + time '12:00') at time zone 'Europe/Ljubljana' end)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_izbrisi_pivo(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  delete from piva where id = p_id and vir = 'rocno';
  if not found then
    raise exception 'Izbrisati je mogoče le ročni vnos.';
  end if;
end;
$$;

revoke all on function public.admin_piva(), public.admin_skrij_pivo(bigint, boolean),
  public.admin_dodaj_pivo(text, int, text, date), public.admin_izbrisi_pivo(bigint) from public, anon;
grant execute on function public.admin_piva(), public.admin_skrij_pivo(bigint, boolean),
  public.admin_dodaj_pivo(text, int, text, date), public.admin_izbrisi_pivo(bigint) to authenticated;
-- Sprožilec teče kot pisec (servis, admin RPC); čiščenje je neškodljivo in ostane odprto.
revoke all on function public.piva_pred_zapisom() from public, anon, authenticated;
