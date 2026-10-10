-- Rast: namestitve iz trgovin in zgodovina uporabnikov za administracijo.
--
-- `trgovine_dnevno` in `trgovine_stanje` piše le delovni tok *Trgovine*
-- (scripts/trgovine.mjs, servisni ključ); admin ju bere prek `admin_rast`.
-- Zato RLS brez politik in brez pravic za anon/authenticated.

create table public.trgovine_dnevno (
  trgovina text not null check (trgovina in ('ios', 'android')),
  dan date not null,
  skupaj int not null,
  novi int,
  primary key (trgovina, dan)
);
comment on table public.trgovine_dnevno is
  'Namestitve po dnevih: skupaj = seštevek do vključno dneva, novi = ta dan. Piše scripts/trgovine.mjs.';

create table public.trgovine_stanje (
  trgovina text primary key check (trgovina in ('ios', 'android')),
  stanje text not null,
  posodobljeno timestamptz not null default now()
);
comment on table public.trgovine_stanje is
  'Zadnje stanje različice v trgovini (iOS: "1.0.1: WAITING_FOR_REVIEW"). Piše scripts/trgovine.mjs.';

alter table public.trgovine_dnevno enable row level security;
alter table public.trgovine_stanje enable row level security;
revoke all on public.trgovine_dnevno, public.trgovine_stanje from anon, authenticated;

-- Po dnevih (ljubljanski dan) od `p_od` do danes. Uporabniki štejejo kot
-- `skupaj_uporabnikov()` (profili brez lastnika hišnih ekip); izbrisani
-- računi izginejo tudi iz preteklih dni. `obiskovalcev` je najbolj obiskana
-- stran dneva iz `obiski_dnevno` (ena stran na sejo na dan) — spodnja meja
-- dnevnih sej, ne število ljudi. Namestitve so null, kjer dneva ni v tabeli.
create or replace function public.admin_rast(p_od date default (now() - interval '365 days')::date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_danes date := (now() at time zone 'Europe/Ljubljana')::date;
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere rast.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'stanje', coalesce((select jsonb_agg(to_jsonb(s) order by s.trgovina) from trgovine_stanje s), '[]'::jsonb),
    'dnevi', coalesce((
      with uporabniki as (
        select (u.created_at at time zone 'Europe/Ljubljana')::date as dan
          from profiles p
          join auth.users u on u.id = p.id
         where not exists (select 1 from fantasy_teams h where h.owner_id = p.id and h.hisna)
      ),
      dnevi as (
        select d::date as dan from generate_series(p_od, v_danes, interval '1 day') d
      ),
      novi as (
        select dan, count(*)::int as n from uporabniki where dan >= p_od group by dan
      ),
      ekipe as (
        select (created_at at time zone 'Europe/Ljubljana')::date as dan, count(*)::int as n
          from fantasy_teams
         where not hisna and created_at >= p_od
         group by 1
      ),
      obiski as (
        select dan, max(n)::int as n
          from (select dan, stran, sum(stevilo) as n from obiski_dnevno where dan >= p_od group by dan, stran) x
         group by dan
      ),
      vrstice as (
        select d.dan,
               coalesce(n.n, 0) as novi_uporabniki,
               (select count(*) from uporabniki where dan < p_od)
                 + sum(coalesce(n.n, 0)) over (order by d.dan) as skupaj_uporabnikov,
               coalesce(e.n, 0) as nove_ekipe,
               o.n as obiskovalcev,
               i.skupaj as ios_skupaj, i.novi as ios_novi,
               a.skupaj as android_skupaj, a.novi as android_novi
          from dnevi d
          left join novi n on n.dan = d.dan
          left join ekipe e on e.dan = d.dan
          left join obiski o on o.dan = d.dan
          left join trgovine_dnevno i on i.trgovina = 'ios' and i.dan = d.dan
          left join trgovine_dnevno a on a.trgovina = 'android' and a.dan = d.dan
      )
      select jsonb_agg(to_jsonb(v) order by v.dan) from vrstice v
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_rast(date) from public, anon;
grant execute on function public.admin_rast(date) to authenticated;
