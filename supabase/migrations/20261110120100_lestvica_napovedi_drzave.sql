-- Lestvica napovedi države: najboljši napovedovalci vseh lig države.
--
-- Napovedi imajo lestvico lige (20261026183100) in mini lige (20261026153100),
-- čez vse lige države pa ne. Teden po zagonu se je vrnila le šestina
-- napovedovalcev; državna lestvica (zavihek Napovedi na /national in vrh 5 na
-- naslovnici) da napovedovalcu iz male lige nasprotnike, ki jih liga nima.
--
-- Pravila so ista kot na lestvici lige (`lestvica_napovedi_lige`):
--   šteje napoved lastnika nehišne ekipe v ligi tekme, na tekmah tekoče sezone
--   lige (`sezona_lige`), točke `tocke_napovedi` (točen 3, razplet 1);
--   kontumacija in tekma brez znanega izida (`izid_znan`) ne štejeta.
--   Vrstni red: točke, nato točni izidi; `mesto` je skupno pri enakih obeh.
--   Vrne prikazno ime in `je_moj`, nikoli user_id; imena so javna že na
--   lestvici lige, zato jo bere tudi neprijavljeni.
-- Lige so aktivne lige države (`countries.code`), kot pri `vrh_klubov_drzave`.
--
-- `p_dni` (npr. 7) šteje le tekme zadnjih dni (dan tekme med danes - p_dni in
-- danes); brez njega cela sezona. `kron` je vedno število kron kroga v sezoni
-- vseh lig države, `kralj` pa vodilni tega pogleda z več kot 0 točkami.
--
-- Poizvedba gre od `napovedi` (nekaj tisoč vrstic) do tekme, kroga in lige po
-- ključih; velikih tabel (igralci, nastopi, goli) ne bere. Krone se ne
-- računajo s `kralji_krogov_lige` za vsako ligo (Madžarska ima napovedi v 89
-- ligah in vsak klic prebere vse kroge sezone), ampak le za kroge z
-- napovedmi, po istem pravilu: krog je končan, ko je rok potekel in nobena
-- njegova tekma ne `caka` (`stanje_tekme_napovedi`); kralj kroga ima največ
-- točk, nato točnih, več kot 0 točk, izenačeni si krono delijo. Številka
-- kroga je v ligi in sezoni enolična (`rounds_tekmovanje_sezona_krog`), zato
-- je krog lige kar en `round_id`.
create or replace function public.lestvica_napovedi_drzave(
  p_drzava text,
  p_dni int default null,
  p_limit int default 50
)
returns table (
  mesto int, display_name text, tocke int, tocnih int, razpletov int, ocenjenih int, je_moj boolean,
  kron int, kralj boolean
)
language sql stable
security definer
set search_path = public
as $$
  with lige as materialized (
    select c.id, sezona_lige(c.id) as sezona
      from competitions c
      join countries d on d.id = c.country_id
     where d.code = p_drzava
       and c.active
  ),
  -- Vse napovedi sezone v državi; `v_oknu` za pogled zadnjih dni.
  napovedi_drzave as materialized (
    select n.user_id, r.id as round_id,
           case when not m.kontumacija and izid_znan(m.imported_at, m.statistics_status)
                then tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) end as t,
           p_dni is null
             or coalesce(m.played_on, r.played_on) between current_date - p_dni and current_date as v_oknu
      from napovedi n
      -- `offset 0`: tekmo in krog poišče po ključu za vsako napoved; brez
      -- tega planer začne pri ligah države in prebere vse njihove tekme.
      cross join lateral (select m.* from matches m where m.id = n.match_id offset 0) m
      cross join lateral (select r.* from rounds r where r.id = m.round_id offset 0) r
      join lige l on l.id = r.competition_id and l.sezona = r.season
     where exists (select 1 from fantasy_teams ft
                    where ft.owner_id = n.user_id and ft.competition_id = r.competition_id
                      and not ft.hisna)
  ),
  sestevki as (
    select o.user_id,
           coalesce(sum(o.t), 0)::int as tocke,
           (count(*) filter (where o.t = 3))::int as tocnih,
           (count(*) filter (where o.t = 1))::int as razpletov,
           count(o.t)::int as ocenjenih
      from napovedi_drzave o
     where o.v_oknu
     group by o.user_id
  ),
  -- Končani krogi z napovedmi (kot `krogi` v `kralji_krogov_lige`).
  koncani as materialized (
    select r.id
      from (select distinct o.round_id from napovedi_drzave o) o
      join rounds r on r.id = o.round_id
     where rok_napovedi(r.id) <= now()
       and not exists (select 1 from matches m
                        where m.round_id = r.id
                          and stanje_tekme_napovedi(m.kontumacija, m.vir_brez_izida,
                                                    izid_znan(m.imported_at, m.statistics_status),
                                                    coalesce(m.played_on, r.played_on)) = 'caka')
  ),
  krogi_ljudi as (
    select o.round_id, o.user_id,
           sum(o.t)::int as tocke,
           (count(*) filter (where o.t = 3))::int as tocnih
      from napovedi_drzave o
      join koncani k on k.id = o.round_id
     where o.t is not null
     group by o.round_id, o.user_id
  ),
  krone as materialized (
    select k.user_id, count(*)::int as kron
      from (select k.*, rank() over (partition by k.round_id order by k.tocke desc, k.tocnih desc) as mesto
              from krogi_ljudi k
             where k.tocke > 0) k
     where k.mesto = 1
     group by k.user_id
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
         coalesce(k.kron, 0),
         r.tocke > 0 and r.mesto = 1
    from razvrsceni r
    left join krone k on k.user_id = r.user_id
   where r.vrsta <= least(greatest(coalesce(p_limit, 50), 1), 100) or r.je_moj
   order by r.vrsta
$$;

revoke all on function public.lestvica_napovedi_drzave(text, int, int) from public;
grant execute on function public.lestvica_napovedi_drzave(text, int, int) to anon, authenticated;
