-- Mesečna statistika profila preverjenega igralca (SLF-373).
--
-- Kot `obiski_dnevno`: dnevni seštevki, ne dogodki. V tabelo gre le igralec
-- (glavna vrstica potrjenega zahtevka), dan, vir in število — nikoli kdo je
-- gledal, naprava ali naslov. Igralec vidi le števila po viru, imen ne.
--
-- Vir: `igra` (prijavljen uporabnik), `gost` (neprijavljen), `povezava`
-- (prišel od zunaj, npr. iz deljene povezave). Prijavljenost določi baza,
-- odjemalec pove le, ali je prišel od zunaj. Enkrat na sejo na dan šteje
-- odjemalec (`src/lib/ogledi.ts`), kot obiske strani.

create table public.ogledi_profila_dnevno (
  dan date not null default current_date,
  -- Glavna vrstica potrjenega zahtevka. Ime ni `player_id` in ni tujega ključa
  -- na players: izdaje FCF preverjajo točen katalog relacij na igralce
  -- (kot posnetki_igralca). Vrstice izbrisanega igralca so le osirotela števila.
  igralec bigint not null,
  vir text not null check (vir in ('igra', 'gost', 'povezava')),
  stevilo int not null default 0,
  primary key (igralec, dan, vir)
);

comment on table public.ogledi_profila_dnevno is
  'Dnevni seštevki ogledov profila potrjenega igralca po viru. Brez gledalca, naprave in naslova.';

alter table public.ogledi_profila_dnevno enable row level security;
-- Bere le admin; piše le zabelezi_ogled_profila, lastnik bere prek mesecni_ogledi_profila.
create policy ogledi_profila_admin_bere on public.ogledi_profila_dnevno for select using (public.is_admin());

-- Zabeleži ogled. Šteje le potrjene profile (ostali nimajo lastnika, ki bi
-- številke videl), ne anonimiziranih in ne lastnikovih lastnih ogledov.
create or replace function public.zabelezi_ogled_profila(p_player_id bigint, p_od_zunaj boolean default false)
returns void language plpgsql volatile security definer set search_path = public
as $$
declare
  v_glavni bigint;
  v_vir text;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null then
    return;
  end if;
  if exists (select 1 from players p where p.id = v_glavni and p.anonimiziran_at is not null) then
    return;
  end if;
  if auth.uid() is not null and je_lastnik_profila(v_glavni) then
    return;
  end if;
  v_vir := case when p_od_zunaj then 'povezava' when auth.uid() is not null then 'igra' else 'gost' end;
  insert into ogledi_profila_dnevno (igralec, vir, stevilo) values (v_glavni, v_vir, 1)
  on conflict (igralec, dan, vir) do update set stevilo = ogledi_profila_dnevno.stevilo + 1;
end;
$$;
revoke all on function public.zabelezi_ogled_profila(bigint, boolean) from public;
grant execute on function public.zabelezi_ogled_profila(bigint, boolean) to anon, authenticated;

-- Zadnjih 6 mesecev (tudi tekoči) za lastnika preverjenega profila: ogledi
-- po viru in odprtja v SLFF Club (brez lastnega kluba, kot `izlozba_igralca`).
-- Tujec in nepreverjen lastnik dobita prazno.
create or replace function public.mesecni_ogledi_profila(p_player_id bigint)
returns table (mesec date, igra int, gost int, povezava int, scout int)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_glavni bigint;
  v_vrstice bigint[];
  v_od date := (date_trunc('month', current_date) - interval '5 months')::date;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null or not je_lastnik_profila(v_glavni) or not je_preverjen(v_glavni) then
    return;
  end if;
  v_vrstice := izlozba_vrstice(v_glavni);
  return query
  with meseci as (
    select generate_series(v_od, date_trunc('month', current_date)::date, interval '1 month')::date as m
  ), profil as (
    select date_trunc('month', o.dan)::date as m,
           sum(o.stevilo) filter (where o.vir = 'igra')::int as igra,
           sum(o.stevilo) filter (where o.vir = 'gost')::int as gost,
           sum(o.stevilo) filter (where o.vir = 'povezava')::int as povezava
      from ogledi_profila_dnevno o
     where o.igralec = v_glavni and o.dan >= v_od
     group by 1
  ), klubi as (
    select date_trunc('month', d.created_at)::date as m, count(*)::int as scout
      from scout.dnevnik d
     where d.vrsta = 'igralec' and d.player_id = any (v_vrstice)
       and d.created_at >= v_od
       and d.team_id not in (select p.team_id from players p where p.id = any (v_vrstice) and p.team_id is not null)
     group by 1
  )
  select me.m, coalesce(p.igra, 0), coalesce(p.gost, 0), coalesce(p.povezava, 0), coalesce(k.scout, 0)
    from meseci me
    left join profil p on p.m = me.m
    left join klubi k on k.m = me.m
   order by me.m desc;
end;
$$;
revoke all on function public.mesecni_ogledi_profila(bigint) from public;
grant execute on function public.mesecni_ogledi_profila(bigint) to authenticated;
