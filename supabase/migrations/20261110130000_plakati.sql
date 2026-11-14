-- Plakat 40 × 60 cm ob doživljenjskem nakupu (SLF-373): nadomesti natisnjeno
-- značko. Pošljemo ga na dom (EU), v ceni. Naslov pobere Stripe Checkout,
-- naročilo zapiše webhook (`plakat_iz_placila`), admin ga natisne in pošlje.
--
-- Brez tujih ključev na players in preverjeni_racuni: izdaje FCF preverjajo
-- točen katalog relacij nanje (kot posnetki_igralca). `igralec` je glavna
-- vrstica potrjenega zahtevka; pravico poiščemo po `stripe_checkout_id`.

create table public.narocila_plakatov (
  id                 bigint generated always as identity primary key,
  igralec            bigint not null,
  user_id            uuid references public.profiles on delete set null,
  -- {name, line1, line2, postal_code, city, country} iz Checkout; po 90 dneh le {country}.
  naslov             jsonb not null,
  status             text not null default 'za_tisk' check (status in ('za_tisk', 'natisnjeno', 'poslano', 'preklicano')),
  stripe_checkout_id text not null unique,
  created_at         timestamptz not null default now(),
  poslano_at         timestamptz,
  opomba             text check (opomba is null or char_length(opomba) <= 500)
);
comment on table public.narocila_plakatov is
  'Plakati 40 × 60 cm ob doživljenjski pravici. Naslovi niso javni: bere in ureja le admin prek RPC.';
alter table public.narocila_plakatov enable row level security;
revoke all on public.narocila_plakatov from public, anon, authenticated;
insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.narocila_plakatov', 'domači naslovi kupcev')
on conflict (tabela) do nothing;

-- Webhook (service_role) po uspešnem doživljenjskem nakupu z naslovom.
-- Idempotentno po seji; brez aktivne doživljenjske pravice te seje nič.
create or replace function public.plakat_iz_placila(p_checkout text, p_naslov jsonb)
returns text language plpgsql volatile security definer set search_path = public
as $$
declare
  r preverjeni_racuni;
begin
  select * into r from preverjeni_racuni
   where stripe_checkout_id = p_checkout and vir = 'dozivljenjska' and status = 'aktiven'
   limit 1;
  if r.id is null then
    return 'brez pravice';
  end if;
  if p_naslov is null or coalesce(p_naslov->>'line1', '') = '' or coalesce(p_naslov->>'country', '') = '' then
    return 'brez naslova';
  end if;
  insert into narocila_plakatov (igralec, user_id, naslov, stripe_checkout_id)
  values (r.player_id, r.user_id, p_naslov, p_checkout)
  on conflict (stripe_checkout_id) do nothing;
  return 'plakat';
end;
$$;
revoke all on function public.plakat_iz_placila(text, jsonb) from public, anon, authenticated;
grant execute on function public.plakat_iz_placila(text, jsonb) to service_role;

create or replace function public.admin_narocila_plakatov()
returns table (id bigint, igralec bigint, ime text, naslov jsonb, status text, created_at timestamptz,
               poslano_at timestamptz, opomba text, eposta text)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not is_admin() then
    raise exception 'Le za admina.';
  end if;
  return query
  select n.id, n.igralec, p.full_name, n.naslov, n.status, n.created_at, n.poslano_at, n.opomba, u.email::text
    from narocila_plakatov n
    left join players p on p.id = n.igralec
    left join auth.users u on u.id = n.user_id
   order by (n.status in ('poslano', 'preklicano')), n.created_at;
end;
$$;
revoke all on function public.admin_narocila_plakatov() from public;
grant execute on function public.admin_narocila_plakatov() to authenticated;

create or replace function public.admin_nastavi_narocilo_plakata(p_id bigint, p_status text, p_opomba text default null)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Le za admina.';
  end if;
  update narocila_plakatov
     set status = p_status,
         opomba = coalesce(p_opomba, opomba),
         poslano_at = case when p_status = 'poslano' then coalesce(poslano_at, now()) else poslano_at end
   where id = p_id;
end;
$$;
revoke all on function public.admin_nastavi_narocilo_plakata(bigint, text, text) from public;
grant execute on function public.admin_nastavi_narocilo_plakata(bigint, text, text) to authenticated;

-- Naslovi: ista pravila kot pri značkah (90 dni po pošiljanju ali preklicu,
-- največ 12 mesecev od naročila), zdaj za oboje.
create or replace function public.preverjen_pocisti_naslove()
returns int language plpgsql security definer set search_path = public
as $$
declare
  n int;
  m int;
begin
  update narocila_znack
     set naslov = jsonb_build_object('country', naslov->>'country')
   where ((status in ('poslano', 'preklicano') and coalesce(poslano_at, created_at) < now() - interval '90 days')
          or created_at < now() - interval '12 months')
     and naslov ?| array['name', 'line1', 'line2', 'postal_code', 'city'];
  get diagnostics n = row_count;
  update narocila_plakatov
     set naslov = jsonb_build_object('country', naslov->>'country')
   where ((status in ('poslano', 'preklicano') and coalesce(poslano_at, created_at) < now() - interval '90 days')
          or created_at < now() - interval '12 months')
     and naslov ?| array['name', 'line1', 'line2', 'postal_code', 'city'];
  get diagnostics m = row_count;
  return n + m;
end;
$$;
revoke all on function public.preverjen_pocisti_naslove() from public, anon, authenticated;
grant execute on function public.preverjen_pocisti_naslove() to service_role;
