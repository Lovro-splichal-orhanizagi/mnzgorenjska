-- Merilo "manj kot 22 nastopov" je javljalo napako za pravilen podatek.
--
-- Razlaga je bila, da ima odigrana tekma dve enajsterici in klop. V nizjih
-- ligah to ne drzi: zapisnik MNL Lendava 2025/26 za Nafto veterane nasteje
-- osem igralcev in tekma je bila odigrana. Preverba je torej oznacila vir, ne
-- nase napake — in ker delovni tok ob najdbi konca z napako, bi to vsak dan
-- javljalo na Discord nekaj, cesar ni mogoce popraviti.
--
-- Novo merilo je meja iz pravil igre: s sestimi igralci se tekma ne more
-- nadaljevati, zato manj kot sedem nastopov ene ekipe NE MORE biti resnica in
-- nujno pomeni izgubljeno postavo. Merjeno je po ekipi, ne po tekmi: prej bi
-- tekma, kjer ena ekipa nima nikogar, druga pa polno postavo in klop, skupaj
-- lahko presegla 22 in ostala neopazena.

CREATE OR REPLACE FUNCTION public.preveri_podatke()
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
  from (select m.id,
               format('tekma %s, %s: %s nastopov', m.id, t.name, count(a.id)) opis
          from matches m
          join teams t on t.id in (m.home_team_id, m.away_team_id)
          -- Ekipa se vzame z NASTOPA, ne iz `players.team_id`: ta pove, kje
          -- igralec igra DANES, arhivska tekma pa je od prej in igralci so
          -- med tem prestopili. Po klubu igralca bi zato skoraj vsaka
          -- arhivska tekma izpadla kot izgubljena postava.
          left join appearances a
            on a.match_id = m.id and a.team_id = t.id
         where m.imported_at is not null
         group by m.id, t.name having count(a.id) < 7) x
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
-- Odmik mora slediti borzi, ker je tudi sidro del omejitve cene.
select 'cena-predalec-od-sidra',
       (select format('Cena je več kot %s od izhodiščne', odmik) from meje_borze()),
       count(*), min(format('igralec %s: %s proti %s', p.id, p.value, p.value_start))
  from players p cross join meje_borze() m
 where p.value_start is not null and abs(p.value - p.value_start) > m.odmik
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
$function$
;
