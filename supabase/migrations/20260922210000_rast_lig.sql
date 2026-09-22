-- Rast po ligah skozi cas.
--
-- Zivost skupnosti sesteje vse lige skupaj — kar je prav za vprasanje "koliko
-- ljudi je zivih", ne pove pa, katera liga raste in katera stoji. Pri 25
-- ligah je to edino, kar odloca, kam poslati naslednje pismo.
--
-- Teden je enota: dan je prehrupen (vikend ima ekipe, sreda ne), mesec
-- prepocasen za ligo, staro tri tedne.
--
-- `ekip` je kumulativa (koliko ekip je liga imela ob koncu tistega tedna),
-- `novih` pa prirast tistega tedna. Prva pove velikost, druga zagon.

create or replace function public.admin_rast_lig(p_tednov int default 12)
returns table (
  competition_id bigint,
  slug           text,
  name           text,
  federation     text,
  teden          date,
  ekip           int,
  novih          int,
  aktivnih       int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;

  return query
  with tedni as (
    select generate_series(
             (date_trunc('week', now()) - ((p_tednov - 1) || ' weeks')::interval)::date,
             date_trunc('week', now())::date,
             '1 week'::interval
           )::date as teden
  ),
  lige as (
    select c.id, c.slug, c.name, f.short_name as zveza
      from competitions c
      left join federations f on f.id = c.federation_id
     where c.active
  )
  select l.id, l.slug::text, l.name::text, coalesce(l.zveza, '—')::text, t.teden,
         (select count(*) from fantasy_teams ft
           where ft.competition_id = l.id
             and ft.created_at < t.teden + interval '7 days')::int,
         (select count(*) from fantasy_teams ft
           where ft.competition_id = l.id
             and ft.created_at >= t.teden
             and ft.created_at < t.teden + interval '7 days')::int,
         -- Aktivna je ekipa, ki je tisti teden spremenila kader.
         (select count(*) from fantasy_teams ft
           where ft.competition_id = l.id
             and ft.roster_updated_at >= t.teden
             and ft.roster_updated_at < t.teden + interval '7 days')::int
    from lige l
   cross join tedni t
   order by l.name, t.teden;
end;
$$;

revoke all on function public.admin_rast_lig(int) from public;
grant execute on function public.admin_rast_lig(int) to authenticated;

comment on function public.admin_rast_lig(int) is
  'Ekipe po ligah in tednih: kumulativa, prirast in teden aktivnih.';
