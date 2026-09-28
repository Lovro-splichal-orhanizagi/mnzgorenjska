-- Navijači klubov: kateri klub ima v ligi najboljše fantasy managerje.
--
-- Najbolj žive mini lige v produkciji so klubske (ND Renče 11 članov, ŠD
-- Leskovec 8) — ljudje igrajo za svoj klub. Ta funkcija da vsaki ligi
-- lestvico klubov po povprečju točk njihovih navijačev.
--
-- Navijač je, kdor ima v profilu izbran klub (`profiles.insider_team_id`,
-- izbira se na strani Pozicije) in ima v tej ligi fantasy ekipo. Klub je
-- en za človeka, ne po ligah: `teams` so skupni (Šenčur je isti klub pri
-- članih in mladincih), zato ista izbira velja v vsaki ligi, kjer klub igra.
-- Navijač kluba, ki v tej ligi ne igra, se tu ne šteje.
--
-- Točke so iz `fantasy_round_points` (tabela `tocke_krogov`), ne iz sprotnega
-- izračuna — lestvica je morala v tabelo, ker je izračun anonimnim
-- obiskovalcem presegel mejo. Sezona je sezona zadnjega odigranega kroga lige.
--
-- Vrstica je en navijač; klub brez navijačev ima eno vrstico s praznim
-- `fantasy_team_id`, da se klub vseeno pokaže. Podatki o klubu (število,
-- povprečji, mesto) se v vrsticah istega kluba ponovijo. Mesto dobi le klub
-- z vsaj `min_navijacev` navijači (nastavitev `min_navijacev_kluba`,
-- privzeto 3) — povprečje enega managerja ni klubska lestvica.
--
-- Vrne le javna polja: ime ekipe in prikazno ime lastnika sta že na lestvici,
-- izbira kluba pa je v `profiles` javno berljiva. Funkcija je
-- `security invoker`, zato velja RLS vsake tabele, ki jo bere.

create or replace function public.navijaci_klubov(p_competition_id bigint)
returns table (
  team_id bigint,
  klub text,
  klub_kratko text,
  grb text,
  navijacev int,
  povprecje_sezona numeric,
  povprecje_krog numeric,
  mesto int,
  min_navijacev int,
  fantasy_team_id bigint,
  ekipa text,
  lastnik text,
  tocke_sezona numeric,
  tocke_krog numeric,
  round_id bigint,
  round_number int,
  season text
)
language sql
stable
set search_path = public
as $$
  with zadnji as (
    select z.id, z.number, z.season
      from zadnji_odigrani_krog z
     where z.competition_id = p_competition_id
  ),
  prag as (
    select nastavitev_int_za('min_navijacev_kluba', p_competition_id, 3) as n
  ),
  klubi as (
    select ct.team_id, ct.name, ct.short_name, ct.logo_url
      from competition_teams ct
     where ct.competition_id = p_competition_id
  ),
  navijaci as (
    select pr.insider_team_id as team_id,
           ft.id as fantasy_team_id,
           ft.name as ekipa,
           pr.display_name as lastnik
      from fantasy_teams ft
      join profiles pr on pr.id = ft.owner_id
     where ft.competition_id = p_competition_id
       and pr.insider_team_id in (select k.team_id from klubi k)
  ),
  tocke as (
    select frp.fantasy_team_id,
           sum(frp.points) as sezona,
           sum(frp.points) filter (where frp.round_id = (select z.id from zadnji z)) as krog
      from fantasy_round_points frp
     where frp.competition_id = p_competition_id
       and frp.season = (select z.season from zadnji z)
       and frp.fantasy_team_id in (select n.fantasy_team_id from navijaci n)
     group by frp.fantasy_team_id
  ),
  posamezni as (
    select n.team_id, n.fantasy_team_id, n.ekipa, n.lastnik,
           coalesce(t.sezona, 0) as tocke_sezona,
           coalesce(t.krog, 0) as tocke_krog
      from navijaci n
      left join tocke t on t.fantasy_team_id = n.fantasy_team_id
  ),
  po_klubih as (
    select k.team_id, k.name, k.short_name, k.logo_url,
           count(p.fantasy_team_id)::int as navijacev,
           round(avg(p.tocke_sezona), 1) as povprecje_sezona,
           round(avg(p.tocke_krog), 1) as povprecje_krog
      from klubi k
      left join posamezni p on p.team_id = k.team_id
     group by k.team_id, k.name, k.short_name, k.logo_url
  ),
  uvrsceni as (
    select pk.*,
           case when pk.navijacev >= (select n from prag)
             then (rank() over (
                     partition by pk.navijacev >= (select n from prag)
                     order by pk.povprecje_sezona desc))::int
           end as mesto
      from po_klubih pk
  )
  select u.team_id, u.name, u.short_name, u.logo_url,
         u.navijacev, u.povprecje_sezona, u.povprecje_krog, u.mesto,
         (select n from prag),
         p.fantasy_team_id, p.ekipa, p.lastnik, p.tocke_sezona, p.tocke_krog,
         (select z.id from zadnji z), (select z.number from zadnji z),
         (select z.season from zadnji z)
    from uvrsceni u
    left join posamezni p on p.team_id = u.team_id
   order by u.team_id, p.fantasy_team_id;
$$;

comment on function public.navijaci_klubov(bigint) is
  'Klubi lige z navijači (profiles.insider_team_id) in povprečjem njihovih fantasy točk v sezoni in zadnjem krogu. Mesto le pri vsaj min_navijacev navijačih.';

revoke all on function public.navijaci_klubov(bigint) from public;
grant execute on function public.navijaci_klubov(bigint) to anon, authenticated;
