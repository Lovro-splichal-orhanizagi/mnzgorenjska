-- Nočna preverba podatkov je padala na časovni omejitvi.
--
-- `preveri_podatke()` je z uvozom slovaških lig (in njihovih arhivov) zrasla
-- nad 8 s, kolikor PostgREST dovoli vsaki poizvedbi (`authenticator`
-- statement_timeout). Preverba je od 27. 9. padala skoraj vsak zagon, uvozi
-- pa so ob obremenitvi padali na isti meji (mb-u19, 26. 9.).
--
-- 1. Najpočasnejši del (izgubljena postava) bere nastope v enem prehodu.
-- 2. Servisna vloga, s katero tečejo le skripte v GitHub Actions, dobi 60 s.
--    Brskalnik (anon, authenticated) ostane pri 8 s.

create or replace function public.preveri_podatke()
 RETURNS TABLE(kljuc text, opis text, koliko bigint, primer text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

-- Ista meja in isti pomen NULL kot pri preracunaj_igralca; sezona ni meja zamrznitve.
with svezi_krogi as (
  select r.id from rounds r
   where r.played_on is null or r.played_on >= current_date - okno_preracuna_tock()
), pricakovane_tocke as materialized (
  select ap.player_id, ap.round_id, sum(ap.points) vsota
    from appearance_points ap
    join svezi_krogi sk on sk.id = ap.round_id
   group by ap.player_id, ap.round_id
)

-- === Uvoz ================================================================

-- Ekipa, ki je na tekmi nastopila z manj kot SEDMIMI igralci.
--
-- Prej je merilo bilo "manj kot 22 nastopov na tekmo", z razlago, da ima
-- odigrana tekma dve enajsterici. V nizjih ligah to ne drzi: zapisnik MNL
-- Lendava 2025/26 za Nafto veterane res nasteje osem igralcev, in tekma je
-- bila odigrana. Merilo je torej javljalo napako za podatek, ki je pravilen.
--
-- Sedem je meja iz pravil igre: s sestimi se tekma ne more nadaljevati. Manj
-- kot sedem nastopov torej ne more biti resnica in nujno pomeni, da se je
-- postava med uvozom izgubila.
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
-- Menjav ni prebral nihce: vsi zacetniki 90 minut, klop brez nastopa. Tako
-- je izpadel ljubljanski zapisnik, ker je minuta zapisana pred VSAKIM igralcem.
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
-- Strelec, ki na tekmi uradno ni igral — gol ne prinese tock.
select 'gol-brez-nastopa',
       'Gol, katerega strelec na tej tekmi nima nastopa',
       count(*), min(format('gol %s, tekma %s', g.id, g.match_id))
  from goals g
 where g.scorer_id is not null
   and not exists (select 1 from appearances a
                    where a.player_id = g.scorer_id and a.match_id = g.match_id)
having count(*) > 0

union all
-- Tekma zunaj svoje sezone. Ljubljanska letnica s stirimi stevkami je cel
-- arhiv 2025/26 postavila v leto 2020, brez ene same napake.
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
       'Sezona ni v obliki LLLL/LL',
       count(*), min(r.season)
  from rounds r where r.season !~ '^\d{4}/\d{2}$'
having count(*) > 0

-- === Tocke ===============================================================

union all
-- `player_scores` je posnetek, `appearance_points` ziv pogled. Ce se
-- razideta, so tocke zastarele ali dvojno stete — to je tista vrsta napake,
-- zaradi katere je ekipa kazala -27.
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
-- Tocke za krog, v katerem igralec sploh ni nastopil.
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
-- Izhajamo iz nastopov, da zaznamo tudi povsem neizračunan krog in ničelne točke.
select 'tocke-manjkajo',
       'Manjka posnetek točk za igralca z nastopom (znotraj okna preračuna)',
       count(*), min(format('igralec %s, krog %s', ap.player_id, ap.round_id))
  from pricakovane_tocke ap
  left join player_scores ps on ps.player_id = ap.player_id and ps.round_id = ap.round_id
 where ps.player_id is null
having count(*) > 0

-- === Cene ================================================================

union all
select 'cena-zunaj-mej',
       (select format('Cena zunaj dovoljenega razpona %s–%s', najnizja, najvisja) from meje_borze()),
       count(*), min(format('igralec %s: %s', p.id, p.value))
  from players p cross join meje_borze() m
 where p.value < m.najnizja or p.value > m.najvisja
having count(*) > 0

union all
-- Vklopljena liga, v kateri stane skoraj vsak enako, nima igre.
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
$function$;

alter role service_role set statement_timeout = '60s';
notify pgrst, 'reload config';
