-- Kralj napovedi: krona za krog in za sezono na lestvicah napovedi.
--
-- Nad napovedmi izidov (20261026153100, 20261026183100):
--   kralj kroga   je, kdor v končanem krogu zbere največ točk napovedi (pri
--                 enakih točkah odločajo točni izidi, popolnoma izenačeni
--                 si krono delijo). Potrebna je vsaj ena ocenjena napoved in
--                 več kot 0 točk.
--   kralj sezone  je trenutni vodilni skupne lestvice (isto razvrščanje kot
--                 lestvica: točke, nato točni izidi), šele ko ima kdo več
--                 kot 0 točk.
--   krone         koliko kron kroga je član osvojil v tekoči sezoni.
--
-- Krog je končan, ko je rok vseh krogov s to številko potekel in nobena
-- njihova tekma ne čaka (`stanje_tekme_napovedi` ni 'caka': izid, kontumacija
-- ali razveljavljena). V mini ligi so to krogi vseh lig članov, kot pri
-- `lestvica_napovedi_mini_lige(liga, krog)`. Tako krona nikoli ne razkrije
-- napovedi pred rokom in se po podelitvi ne premakne več.
--
-- Lestvici dobita stolpca `kron` (število kron kroga) in `kralj` (v skupni
-- lestvici kralj sezone, v lestvici kroga kralj tega kroga). Lestvica lige
-- ostane brez user_id. Pošta "tvoj krog" bere servisni `kralj_napovedi_kroga`.

-- ---------------------------------------------------------------------------
-- Notranji izračun (brez pravic za klic od zunaj)
-- ---------------------------------------------------------------------------
-- Kralji končanih krogov lige v tekoči sezoni; `p_krog` omeji na en krog.
-- Napovedujejo lastniki nehišnih ekip lige (kot `lestvica_napovedi_lige`).
create or replace function public.kralji_krogov_lige(p_tekmovanje bigint, p_krog int default null)
returns table (krog int, user_id uuid, tocke int, tocnih int)
language sql stable
set search_path = public
as $$
  with krogi as (
    select r.number as krog
      from rounds r
      join matches m on m.round_id = r.id
     where r.competition_id = p_tekmovanje
       and r.season = sezona_lige(p_tekmovanje)
       and (p_krog is null or r.number = p_krog)
     group by r.number
    having bool_and(rok_napovedi(r.id) <= now())
       and bool_and(stanje_tekme_napovedi(m.kontumacija, m.vir_brez_izida,
                                          izid_znan(m.imported_at, m.statistics_status),
                                          coalesce(m.played_on, r.played_on)) <> 'caka')
  ),
  ocene as (
    select n.user_id, r.number as krog,
           tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) as t
      from krogi k
      join rounds r on r.competition_id = p_tekmovanje
                   and r.season = sezona_lige(p_tekmovanje)
                   and r.number = k.krog
      join matches m on m.round_id = r.id
      join napovedi n on n.match_id = m.id
     where not m.kontumacija
       and izid_znan(m.imported_at, m.statistics_status)
       and exists (select 1 from fantasy_teams ft
                    where ft.owner_id = n.user_id and ft.competition_id = p_tekmovanje
                      and not ft.hisna)
  ),
  sestevki as (
    select o.user_id, o.krog,
           sum(o.t)::int as tocke,
           (count(*) filter (where o.t = 3))::int as tocnih
      from ocene o
     group by o.user_id, o.krog
  )
  select s.krog, s.user_id, s.tocke, s.tocnih
    from (select s.*, rank() over (partition by s.krog order by s.tocke desc, s.tocnih desc) as mesto
            from sestevki s
           where s.tocke > 0) s
   where s.mesto = 1
   order by s.krog, s.user_id
$$;

-- Kralji končanih krogov mini lige: člani z napovedmi na tekmah lig, s
-- katerimi so v njej, tekoče sezone (kot `lestvica_napovedi_mini_lige`).
-- Pravic ne preverja; kliče jo le koda, ki jih je že preverila.
create or replace function public.kralji_krogov_mini_lige(p_liga bigint, p_krog int default null)
returns table (krog int, user_id uuid, tocke int, tocnih int)
language sql stable
set search_path = public
as $$
  with clani as (
    select c.* from clani_napovedi_mini_lige(p_liga) c
  ),
  krogi as (
    select r.number as krog
      from (select distinct c.competition_id, c.sezona from clani c) l
      join rounds r on r.competition_id = l.competition_id and r.season = l.sezona
      join matches m on m.round_id = r.id
     where (p_krog is null or r.number = p_krog)
     group by r.number
    having bool_and(rok_napovedi(r.id) <= now())
       and bool_and(stanje_tekme_napovedi(m.kontumacija, m.vir_brez_izida,
                                          izid_znan(m.imported_at, m.statistics_status),
                                          coalesce(m.played_on, r.played_on)) <> 'caka')
  ),
  ocene as (
    select c.user_id, r.number as krog,
           tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) as t
      from clani c
      join napovedi n on n.user_id = c.user_id
      join matches m on m.id = n.match_id
      join rounds r on r.id = m.round_id
      join krogi k on k.krog = r.number
     where r.competition_id = c.competition_id
       and r.season = c.sezona
       and not m.kontumacija
       and izid_znan(m.imported_at, m.statistics_status)
  ),
  sestevki as (
    select o.user_id, o.krog,
           sum(o.t)::int as tocke,
           (count(*) filter (where o.t = 3))::int as tocnih
      from ocene o
     group by o.user_id, o.krog
  )
  select s.krog, s.user_id, s.tocke, s.tocnih
    from (select s.*, rank() over (partition by s.krog order by s.tocke desc, s.tocnih desc) as mesto
            from sestevki s
           where s.tocke > 0) s
   where s.mesto = 1
   order by s.krog, s.user_id
$$;

revoke all on function public.kralji_krogov_lige(bigint, int) from public, anon, authenticated;
revoke all on function public.kralji_krogov_mini_lige(bigint, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lestvici s kronami
-- ---------------------------------------------------------------------------
-- Vrnjena vrstica dobi stolpca, zato funkciji najprej padeta.
drop function public.lestvica_napovedi_mini_lige(bigint, int);
drop function public.lestvica_napovedi_lige(bigint, int);

-- Kot v 20261026153100, dodana `kron` in `kralj`. Krone vidi le, kdor vidi
-- lestvico (prazni `clani` ne vrnejo vrstic).
create function public.lestvica_napovedi_mini_lige(p_liga bigint, p_krog int default null)
returns table (
  user_id uuid, display_name text, tocke int, tocnih int, razpletov int, ocenjenih int,
  kron int, kralj boolean
)
language sql stable
security definer
set search_path = public
as $$
  with clani as (
    select c.* from mini_lige ml, clani_napovedi_mini_lige(ml.id) c
     where ml.id = p_liga and (ml.javna or sem_v_mini_ligi(ml.id))
  ),
  ocene as (
    select c.user_id, tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) as t
      from clani c
      join napovedi n on n.user_id = c.user_id
      join matches m on m.id = n.match_id
      join rounds r on r.id = m.round_id
     where r.competition_id = c.competition_id
       and r.season = c.sezona
       and (p_krog is null or r.number = p_krog)
       and not m.kontumacija
       and izid_znan(m.imported_at, m.statistics_status)
  ),
  sestevki as (
    select u.user_id, p.display_name,
           coalesce(sum(o.t), 0)::int as tocke,
           (count(*) filter (where o.t = 3))::int as tocnih,
           (count(*) filter (where o.t = 1))::int as razpletov,
           count(o.t)::int as ocenjenih
      from (select distinct c.user_id from clani c) u
      join profiles p on p.id = u.user_id
      left join ocene o on o.user_id = u.user_id
     group by u.user_id, p.display_name
  ),
  kralji as (
    select k.* from kralji_krogov_mini_lige(p_liga) k
     where exists (select 1 from clani)
  )
  select s.user_id, s.display_name, s.tocke, s.tocnih, s.razpletov, s.ocenjenih,
         (select count(*) from kralji k where k.user_id = s.user_id)::int,
         case
           when p_krog is null then s.tocke > 0 and s.mesto = 1
           else exists (select 1 from kralji k where k.krog = p_krog and k.user_id = s.user_id)
         end
    from (select s.*, rank() over (order by s.tocke desc, s.tocnih desc) as mesto
            from sestevki s) s
   order by 3 desc, 4 desc, 2, 1
$$;

-- Kot v 20261026183100, dodana `kron` in `kralj`; še vedno brez user_id.
create function public.lestvica_napovedi_lige(p_tekmovanje bigint, p_krog int default null)
returns table (
  mesto int, display_name text, tocke int, tocnih int, razpletov int, ocenjenih int, je_moj boolean,
  kron int, kralj boolean
)
language sql stable
security definer
set search_path = public
as $$
  with napovedi_lige as (
    select n.user_id,
           case when not m.kontumacija and izid_znan(m.imported_at, m.statistics_status)
                then tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) end as t
      from rounds r
      join matches m on m.round_id = r.id
      join napovedi n on n.match_id = m.id
     where r.competition_id = p_tekmovanje
       and r.season = sezona_lige(p_tekmovanje)
       and (p_krog is null or r.number = p_krog)
       and exists (select 1 from fantasy_teams ft
                    where ft.owner_id = n.user_id and ft.competition_id = p_tekmovanje
                      and not ft.hisna)
  ),
  sestevki as (
    select o.user_id,
           coalesce(sum(o.t), 0)::int as tocke,
           (count(*) filter (where o.t = 3))::int as tocnih,
           (count(*) filter (where o.t = 1))::int as razpletov,
           count(o.t)::int as ocenjenih
      from napovedi_lige o
     group by o.user_id
  ),
  kralji as (
    select k.* from kralji_krogov_lige(p_tekmovanje) k
  ),
  razvrsceni as (
    select s.*, p.display_name,
           (rank() over (order by s.tocke desc, s.tocnih desc))::int as mesto,
           row_number() over (order by s.tocke desc, s.tocnih desc, p.display_name, s.user_id) as vrsta,
           s.user_id = auth.uid() as je_moj
      from sestevki s
      join profiles p on p.id = s.user_id
  )
  select r.mesto, r.display_name, r.tocke, r.tocnih, r.razpletov, r.ocenjenih, coalesce(r.je_moj, false),
         (select count(*) from kralji k where k.user_id = r.user_id)::int,
         case
           when p_krog is null then r.tocke > 0 and r.mesto = 1
           else exists (select 1 from kralji k where k.krog = p_krog and k.user_id = r.user_id)
         end
    from razvrsceni r
   where r.vrsta <= 50 or r.je_moj
   order by r.vrsta
$$;

revoke all on function public.lestvica_napovedi_mini_lige(bigint, int) from public, anon;
grant execute on function public.lestvica_napovedi_mini_lige(bigint, int) to authenticated;
revoke all on function public.lestvica_napovedi_lige(bigint, int) from public;
grant execute on function public.lestvica_napovedi_lige(bigint, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pošta "tvoj krog" (servis)
-- ---------------------------------------------------------------------------
-- Kje je uporabnik kralj napovedi kroga: vrstica brez mini lige (NULL) je
-- liga sama, ostale so mini lige, v katerih je z nehišno ekipo te lige.
-- Le krog tekoče sezone; nekončan krog nima kralja.
create or replace function public.kralj_napovedi_kroga(p_user_id uuid, p_round_id bigint)
returns table (mini_liga_id bigint, mini_liga text)
language sql stable
security definer
set search_path = public
as $$
  with krog as (
    select r.competition_id, r.number
      from rounds r
     where r.id = p_round_id
       and r.season = sezona_lige(r.competition_id)
  )
  select x.mini_liga_id, x.mini_liga
    from (
      select null::bigint as mini_liga_id, null::text as mini_liga, 0 as vrsta
        from krog k
       where exists (select 1 from kralji_krogov_lige(k.competition_id, k.number) kr
                      where kr.user_id = p_user_id)
      union all
      select ml.id, ml.name, 1
        from krog k
        join mini_lige ml
          on exists (select 1 from mini_liga_clani c
                       join fantasy_teams ft on ft.id = c.fantasy_team_id
                      where c.mini_liga_id = ml.id
                        and ft.owner_id = p_user_id
                        and ft.competition_id = k.competition_id
                        and not ft.hisna)
       where exists (select 1 from kralji_krogov_mini_lige(ml.id, k.number) kr
                      where kr.user_id = p_user_id)
    ) x
   order by x.vrsta, x.mini_liga, x.mini_liga_id
$$;
revoke all on function public.kralj_napovedi_kroga(uuid, bigint) from public, anon, authenticated;
