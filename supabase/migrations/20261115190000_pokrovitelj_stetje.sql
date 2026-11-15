-- Števci za pokrovitelja lige (SLF-484).
--
-- Pokrovitelj lige (SLF-481) je sponzor z dosegom lige. Kaže se v glavi lige,
-- na kartici igralca za deljenje in v objavi lige tedna, a števec ga ni štel:
-- `zabelezi_sponzorja` z mestom zahteva, da je mesto v `sponsors.mesta`, ta
-- pa dovoli le pasice (domov, lestvica, …). Pred podaljšanjem pogodbe sponzor
-- rabi številke.
--
-- Nova mesta v `sponsor_stats.mesto` (ne v `sponsors.mesta`, ker jih ne
-- vklaplja admin, ampak velja vse, kar ima pokrovitelja):
--   glava    prikaz = glava lige vsaj do polovice na zaslonu, klik = na sponzorja
--   kartica  prikaz = kartica s pokroviteljem deljena ali prenesena,
--            klik = obisk SLFF prek povezave s take kartice
--   objava   prikaz = objava lige tedna s pokroviteljem objavljena,
--            klik = obisk SLFF prek povezave iz te objave
-- Šteje le, ko je sponzor res trenutni pokrovitelj te lige (isto pravilo kot
-- `sponzorji_za` brez mesta, doseg lige). Ostalo kot v 20261001130000.

create or replace function public.zabelezi_sponzorja(
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
           when p_mesto in ('glava', 'kartica', 'objava') then
             p_competition_id is not null
             and exists (select 1 from sponzorji_za(p_competition_id, null) z
                          where z.id = p_sponsor_id and z.doseg = 'liga')
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
grant execute on function public.zabelezi_sponzorja(bigint, bigint, boolean, text)
  to anon, authenticated, service_role;
