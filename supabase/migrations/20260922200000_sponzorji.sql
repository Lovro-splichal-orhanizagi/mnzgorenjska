-- Sponzorska mesta: logika zdaj, prikaz pozneje.
--
-- Programatično oglaševanje pri tem obsegu ne pride v poštev: nekaj deset
-- evrov na mesec v zameno za piškotno pasico, tuje skripte in stran o
-- zasebnosti, ki trdi nasprotno. Sponzor je lokalen — klubski, regijski ali
-- državni — in ga postreže naša baza, brez tretje strani.
--
-- Zato je doseg hierarhičen: tekmovanje > zveza (regija) > država > povsod.
-- Sponzor iz Kranja se pokaže Gorenjcem, ne Prekmurcem; sponzor lige samo v
-- tisti ligi. Najbolj določen zadetek zmaga, ob izenačenju odloči `utez`.
--
-- Nič se še ne prikaže: `sponzorji_vidni` je 0. Vklop je ena vrstica v
-- nastavitvah, ne nova objava.
--
-- Stevci so dnevni seštevki, ne dogodki: en zapis na sponzorja, ligo in dan.
-- Milijon vrstic za "koliko klikov je bilo maja" ni vreden ničesar, stolpec
-- s številko pa pove isto.

create table if not exists sponsors (
  id            bigint generated always as identity primary key,
  name          text not null,
  logo_url      text,
  url           text not null,
  claim         text,                      -- ena vrstica besedila
  country_id    bigint references countries(id) on delete cascade,
  federation_id bigint references federations(id) on delete cascade,
  competition_id bigint references competitions(id) on delete cascade,
  starts_on     date,
  ends_on       date,
  utez          int not null default 1,
  active        boolean not null default true,
  opomba        text,                      -- interno: kontakt, dogovor, cena
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table sponsors is
  'Sponzorska mesta. Doseg: competition_id > federation_id > country_id > vsi.';
comment on column sponsors.opomba is
  'Interna opomba (kontakt, cena). Nikoli ne zapusti admin strani.';

create index if not exists sponsors_doseg_idx
  on sponsors (active, competition_id, federation_id, country_id);

create table if not exists sponsor_stats (
  sponsor_id     bigint not null references sponsors(id) on delete cascade,
  dan            date not null,
  competition_id bigint references competitions(id) on delete set null,
  prikazov       int not null default 0,
  klikov         int not null default 0,
  primary key (sponsor_id, dan, competition_id)
);

alter table sponsors enable row level security;
alter table sponsor_stats enable row level security;

-- Sponzorjev ne beremo neposredno: `opomba` je interna, doseg pa izračuna
-- funkcija. Admin ima svojo pot.
drop policy if exists "admin ureja sponzorje" on sponsors;
create policy "admin ureja sponzorje" on sponsors for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin bere stevce" on sponsor_stats;
create policy "admin bere stevce" on sponsor_stats for select using (is_admin());

-- --------------------------------------------------------------------------
-- Kaj pokazati v tej ligi
-- --------------------------------------------------------------------------
create or replace function public.sponzorji_za(p_competition_id bigint)
returns table (
  id       bigint,
  name     text,
  logo_url text,
  url      text,
  claim    text,
  doseg    text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.logo_url, s.url, s.claim,
         case
           when s.competition_id is not null then 'liga'
           when s.federation_id is not null then 'zveza'
           when s.country_id is not null then 'drzava'
           else 'vsi'
         end
    from sponsors s
    join competitions c on c.id = p_competition_id
   where s.active
     and coalesce(nastavitev_int('sponzorji_vidni', 0), 0) = 1
     and (s.starts_on is null or s.starts_on <= current_date)
     and (s.ends_on is null or s.ends_on >= current_date)
     and (
       s.competition_id = c.id
       or (s.competition_id is null and s.federation_id = c.federation_id)
       or (s.competition_id is null and s.federation_id is null
           and s.country_id = c.country_id)
       or (s.competition_id is null and s.federation_id is null
           and s.country_id is null)
     )
   order by
     (s.competition_id is null),          -- najprej liga
     (s.federation_id is null),           -- nato zveza
     (s.country_id is null),              -- nato drzava
     s.utez desc, s.id;
$$;

comment on function public.sponzorji_za(bigint) is
  'Sponzorji za dano ligo, od najbolj določenega dosega navzdol. Prazno, '
  'dokler nastavitev sponzorji_vidni ni 1.';

-- --------------------------------------------------------------------------
-- Stevci (dnevni sestevek)
-- --------------------------------------------------------------------------
create or replace function public.zabelezi_sponzorja(
  p_sponsor_id bigint,
  p_competition_id bigint default null,
  p_klik boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into sponsor_stats (sponsor_id, dan, competition_id, prikazov, klikov)
  select p_sponsor_id, current_date, p_competition_id,
         case when p_klik then 0 else 1 end,
         case when p_klik then 1 else 0 end
   where exists (select 1 from sponsors s where s.id = p_sponsor_id and s.active)
  on conflict (sponsor_id, dan, competition_id) do update
     set prikazov = sponsor_stats.prikazov + excluded.prikazov,
         klikov   = sponsor_stats.klikov   + excluded.klikov;
$$;

-- --------------------------------------------------------------------------
-- Admin: seznam s stevci
-- --------------------------------------------------------------------------
create or replace function public.admin_sponzorji()
returns table (
  id bigint, name text, logo_url text, url text, claim text,
  country_id bigint, federation_id bigint, competition_id bigint,
  doseg_ime text, starts_on date, ends_on date, utez int, active boolean,
  opomba text, prikazov bigint, klikov bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere sponzorje.';
  end if;

  return query
  select s.id, s.name, s.logo_url, s.url, s.claim,
         s.country_id, s.federation_id, s.competition_id,
         coalesce(c.name, f.name, d.name, 'vse lige')::text,
         s.starts_on, s.ends_on, s.utez, s.active, s.opomba,
         coalesce(sum(st.prikazov), 0), coalesce(sum(st.klikov), 0)
    from sponsors s
    left join competitions c on c.id = s.competition_id
    left join federations  f on f.id = s.federation_id
    left join countries    d on d.id = s.country_id
    left join sponsor_stats st on st.sponsor_id = s.id
   group by s.id, c.name, f.name, d.name
   order by s.active desc, s.name;
end;
$$;

revoke all on function public.sponzorji_za(bigint) from public;
revoke all on function public.zabelezi_sponzorja(bigint, bigint, boolean) from public;
revoke all on function public.admin_sponzorji() from public;
grant execute on function public.sponzorji_za(bigint) to anon, authenticated;
grant execute on function public.zabelezi_sponzorja(bigint, bigint, boolean) to anon, authenticated;
grant execute on function public.admin_sponzorji() to authenticated;

insert into settings (key, value)
values ('sponzorji_vidni', '0')
on conflict (key) do nothing;
