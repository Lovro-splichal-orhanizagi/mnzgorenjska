-- Preverba podatkov: sezona "LLLL" je pravilna za lige, ki igrajo v enem
-- koledarskem letu (Estonija, Latvija: pomlad–jesen). Doslej jo je pravilo
-- `sezona-oblika` (samo LLLL/LL) štelo za napako, zato je vsaka preverba
-- padla (1035 krogov) in na Discord/mail javljala isto lažno težavo.
-- Funkcija je sicer enaka produkcijski (pg_get_functiondef), spremenjen je
-- le izraz za obliko sezone.
CREATE OR REPLACE FUNCTION public.preveri_podatke()
 RETURNS TABLE(kljuc text, opis text, koliko bigint, primer text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

with svezi_krogi as (
  select r.id from rounds r
   where r.played_on is null or r.played_on >= current_date - okno_preracuna_tock()
), pricakovane_tocke as materialized (
  select ap.player_id, ap.round_id, sum(ap.points) vsota
    from appearance_points ap
    join svezi_krogi sk on sk.id = ap.round_id
   group by ap.player_id, ap.round_id
)


select 'postava-izgubljena',
       'Ekipa z manj kot sedmimi nastopi na tekmi',
       count(*), min(x.opis)
  -- Nastope najprej seštejemo po tekmi in ekipi (en prehod tabele), nato
  -- primerjamo z obema ekipama tekme. Prej je stik `t.id in (domači, gostje)`
  -- za vsako tekmo posebej iskal nastope in je bil sam 2,9 s.
  from (select format('tekma %s, %s: %s nastopov', m.id, t.name, coalesce(n.n, 0)) opis
          from matches m
         cross join lateral (values (m.home_team_id), (m.away_team_id)) e(team_id)
          join teams t on t.id = e.team_id
          left join (select match_id, team_id, count(*) n
                       from appearances group by match_id, team_id) n
            on n.match_id = m.id and n.team_id = e.team_id
         where m.imported_at is not null
           and coalesce(n.n, 0) < 7) x
having count(*) > 0

union all
select 'menjave-neprebrane',
       'Liga z odigranimi tekmami, a brez enega samega nastopa s klopi',
       count(*), min(x.slug)
  from (select c.slug
          from competitions c
          join players p on p.competition_id = c.id
          join appearances a on a.player_id = p.id
         group by c.slug
        having count(*) filter (where not a.started) = 0) x
having count(*) > 0

union all
select 'gol-brez-nastopa',
       'Gol, katerega strelec na tej tekmi nima nastopa',
       count(*), min(format('gol %s, tekma %s', g.id, g.match_id))
  from goals g
 where g.scorer_id is not null
   and not exists (select 1 from appearances a
                    where a.player_id = g.scorer_id and a.match_id = g.match_id)
having count(*) > 0

union all
select 'datum-zunaj-sezone',
       'Tekma z datumom zunaj svoje sezone',
       count(*), min(format('tekma %s: %s v sezoni %s', m.id, m.played_on, r.season))
  from matches m join rounds r on r.id = m.round_id
 where m.played_on is not null
   and r.season ~ '^\d{4}/\d{2}$'
   and (m.played_on < make_date(split_part(r.season, '/', 1)::int, 7, 1)
     or m.played_on > make_date(split_part(r.season, '/', 1)::int + 1, 6, 30))
having count(*) > 0

union all
select 'sezona-oblika',
       'Sezona ni v obliki LLLL/LL ali LLLL',
       count(*), min(r.season)
  from rounds r where r.season !~ '^\d{4}(/\d{2})?$'
having count(*) > 0


union all
select 'tocke-razhajanje',
       'Posnetek točk se ne ujema z izračunom iz nastopov (znotraj okna preračuna)',
       count(*), min(x.opis)
  from (select format('igralec %s, krog %s: posnetek %s, izračun %s',
                      ps.player_id, ps.round_id, ps.points, coalesce(ap.vsota, 0)) opis
          from player_scores ps
          join svezi_krogi tk on tk.id = ps.round_id
          left join pricakovane_tocke ap
            on ap.player_id = ps.player_id and ap.round_id = ps.round_id
         where abs(ps.points - coalesce(ap.vsota, 0)) > 0.01) x
having count(*) > 0

union all
select 'tocke-brez-nastopa',
       'Igralec ima točke v krogu, v katerem ni nastopil (znotraj okna preračuna)',
       count(*), min(format('igralec %s, krog %s', ps.player_id, ps.round_id))
  from player_scores ps
  join svezi_krogi tk on tk.id = ps.round_id
 where ps.points <> 0
   and not exists (select 1 from pricakovane_tocke ap
                    where ap.player_id = ps.player_id and ap.round_id = ps.round_id)
having count(*) > 0

union all
select 'tocke-manjkajo',
       'Manjka posnetek točk za igralca z nastopom (znotraj okna preračuna)',
       count(*), min(format('igralec %s, krog %s', ap.player_id, ap.round_id))
  from pricakovane_tocke ap
  left join player_scores ps on ps.player_id = ap.player_id and ps.round_id = ap.round_id
 where ps.player_id is null
having count(*) > 0


union all
select 'cena-zunaj-mej',
       (select format('Cena zunaj dovoljenega razpona %s–%s', najnizja, najvisja) from meje_borze()),
       count(*), min(format('igralec %s: %s', p.id, p.value))
  from players p cross join meje_borze() m
 where p.value < m.najnizja or p.value > m.najvisja
having count(*) > 0

union all
select 'cenik-brez-razlik',
       'Vklopljena liga, kjer ima več kot 70 % igralcev privzeto ceno',
       count(*), min(x.opis)
  from (select format('%s: %s %%', c.slug,
               round(100.0 * count(*) filter (where p.value = 4.5) / count(*))) opis
          from competitions c join players p on p.competition_id = c.id
         where c.active and p.active
         group by c.slug
        having count(*) filter (where p.value = 4.5) > 0.7 * count(*)) x
having count(*) > 0
$function$

;
