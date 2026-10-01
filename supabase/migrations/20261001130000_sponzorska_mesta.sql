-- Sponzorska mesta po straneh.
--
-- Doslej je bilo mesto eno (pod lestvico). Zdaj jih je pet in vsak sponzor
-- ima svoj nabor (`sponsors.mesta`), ki ga admin nastavi. Stevci se vodijo
-- po mestu, da se vidi, katero mesto res kaj prinese.
--
-- Prikaz se steje, ko je pasica res na zaslonu (vsaj pol vidna), ne ob
-- nalaganju strani — mesto pod lestvico bi sicer stelo tudi tistim, ki do
-- njega nikoli ne pridejo.

alter table public.sponsors
  add column if not exists mesta text[] not null default '{lestvica}';

alter table public.sponsors drop constraint if exists sponsors_mesta_check;
alter table public.sponsors add constraint sponsors_mesta_check
  check (mesta <@ array['domov', 'lestvica', 'moja_ekipa', 'rezultati', 'igralci']::text[]);

comment on column public.sponsors.mesta is
  'Kje se sponzor pokaze: domov, lestvica, moja_ekipa, rezultati, igralci.';

-- Stevci po mestu. Stare vrstice (pred to migracijo) ostanejo brez mesta —
-- vse so bile z lestvice.
alter table public.sponsor_stats add column if not exists mesto text;
update public.sponsor_stats set mesto = 'lestvica' where mesto is null;
drop index if exists public.sponsor_stats_dan_idx;
create unique index sponsor_stats_dan_idx
  on public.sponsor_stats (sponsor_id, dan, coalesce(competition_id, 0), coalesce(mesto, ''));

-- --------------------------------------------------------------------------
-- Prikaz: sponzorji za ligo in mesto
-- --------------------------------------------------------------------------
drop function if exists public.sponzorji_za(bigint);
create function public.sponzorji_za(p_competition_id bigint, p_mesto text default null)
returns table (
  id        bigint,
  name      text,
  logo_url  text,
  url       text,
  claim     text,
  doseg     text,
  slika_url text
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
         end,
         s.slika_url
    from sponsors s
    join competitions c on c.id = p_competition_id
   where s.active
     and coalesce(nastavitev_int('sponzorji_vidni', 0), 0) = 1
     and (s.starts_on is null or s.starts_on <= current_date)
     and (s.ends_on is null or s.ends_on >= current_date)
     and (p_mesto is null or p_mesto = any (s.mesta))
     and (
       s.competition_id = c.id
       or (s.competition_id is null and s.federation_id = c.federation_id)
       or (s.competition_id is null and s.federation_id is null
           and s.country_id = c.country_id)
       or (s.competition_id is null and s.federation_id is null
           and s.country_id is null)
     )
   order by
     (s.competition_id is null),
     (s.federation_id is null),
     (s.country_id is null),
     s.utez desc, s.id;
$$;

comment on function public.sponzorji_za(bigint, text) is
  'Sponzorji za dano ligo (in mesto), od najbolj določenega dosega navzdol. '
  'Prazno, dokler nastavitev sponzorji_vidni ni 1.';

revoke all on function public.sponzorji_za(bigint, text) from public;
grant execute on function public.sponzorji_za(bigint, text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Stevec: zdaj z mestom. Steje le, kar bi `sponzorji_za` res pokazal.
-- --------------------------------------------------------------------------
drop function if exists public.zabelezi_sponzorja(bigint, bigint, boolean);
create function public.zabelezi_sponzorja(
  p_sponsor_id bigint,
  p_competition_id bigint default null,
  p_klik boolean default false,
  p_mesto text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into sponsor_stats (sponsor_id, dan, competition_id, mesto, prikazov, klikov)
  select p_sponsor_id, current_date, p_competition_id, p_mesto,
         case when p_klik then 0 else 1 end,
         case when p_klik then 1 else 0 end
   where case
           when p_competition_id is not null then
             exists (select 1 from sponzorji_za(p_competition_id, p_mesto) z
                      where z.id = p_sponsor_id)
           else
             coalesce(nastavitev_int('sponzorji_vidni', 0), 0) = 1
             and exists (
               select 1 from sponsors s
                where s.id = p_sponsor_id
                  and s.active
                  and (s.starts_on is null or s.starts_on <= current_date)
                  and (s.ends_on is null or s.ends_on >= current_date)
                  and (p_mesto is null or p_mesto = any (s.mesta))
                  and s.competition_id is null
                  and s.federation_id is null
                  and s.country_id is null)
         end
  on conflict (sponsor_id, dan, (coalesce(competition_id, 0)), (coalesce(mesto, ''))) do update
     set prikazov = sponsor_stats.prikazov + excluded.prikazov,
         klikov   = sponsor_stats.klikov   + excluded.klikov;
$$;

revoke all on function public.zabelezi_sponzorja(bigint, bigint, boolean, text) from public;
grant execute on function public.zabelezi_sponzorja(bigint, bigint, boolean, text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Admin: seznam (z mesti) in statistika po mestih
-- --------------------------------------------------------------------------
drop function if exists public.admin_sponzorji();
create function public.admin_sponzorji()
returns table (
  id bigint, name text, logo_url text, url text, claim text,
  country_id bigint, federation_id bigint, competition_id bigint,
  doseg_ime text, starts_on date, ends_on date, utez int, active boolean,
  opomba text, prikazov bigint, klikov bigint, mesta text[], slika_url text
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
         coalesce(sum(st.prikazov), 0), coalesce(sum(st.klikov), 0),
         s.mesta, s.slika_url
    from sponsors s
    left join competitions c on c.id = s.competition_id
    left join federations  f on f.id = s.federation_id
    left join countries    d on d.id = s.country_id
    left join sponsor_stats st on st.sponsor_id = s.id
   group by s.id, c.name, f.name, d.name
   order by s.active desc, s.name;
end;
$$;

revoke all on function public.admin_sponzorji() from public;
grant execute on function public.admin_sponzorji() to authenticated;

-- Po sponzorju in mestu: vse skupaj in zadnjih 7 dni.
create or replace function public.admin_sponzorji_po_mestih()
returns table (
  sponsor_id bigint, mesto text,
  prikazov bigint, klikov bigint,
  prikazov_7 bigint, klikov_7 bigint
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
  select st.sponsor_id, coalesce(st.mesto, '—'),
         sum(st.prikazov)::bigint, sum(st.klikov)::bigint,
         coalesce(sum(st.prikazov) filter (where st.dan > current_date - 7), 0)::bigint,
         coalesce(sum(st.klikov) filter (where st.dan > current_date - 7), 0)::bigint
    from sponsor_stats st
   group by st.sponsor_id, coalesce(st.mesto, '—')
   order by st.sponsor_id, 3 desc;
end;
$$;

revoke all on function public.admin_sponzorji_po_mestih() from public;
grant execute on function public.admin_sponzorji_po_mestih() to authenticated;

-- --------------------------------------------------------------------------
-- Nasa sponzorja: vsa mesta; slovaska vrstica brez roka dostave.
-- --------------------------------------------------------------------------
update public.sponsors
   set mesta = array['domov', 'lestvica', 'moja_ekipa', 'rezultati', 'igralci'],
       updated_at = now()
 where name in ('Foto Delavnica', 'Foto Spomienky');

update public.sponsors
   set claim = 'Vytlač si fotky zo zápasu už od 0,11 €. Profesionálny Fujifilm papier.',
       updated_at = now()
 where name = 'Foto Spomienky';
