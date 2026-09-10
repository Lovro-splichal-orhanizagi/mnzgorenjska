-- Preverbe tock veljajo le za TEKOCO sezono.
--
-- V arhivu posnetek in izracun narocno odstopata za ~3.0 — toliko je vredna
-- asistenca. Asistenco skupnost potrdi pozneje, `preracunaj_igralca` pa
-- osvezi le kroge znotraj okna (14 dni, migracija 20260902110000), zato se
-- arhivski posnetek ne popravi. To je namerno: pretekle sezone so zgodovina.
--
-- Prva razlicica preverbe tega ni locevala in je v produkciji nasla 5405
-- "tezav", od katerih ni bila nobena prava. Preverba, ki lazno alarmira, je
-- slabsa od nobene — nehas jo brati.

-- Preverbe, ki lovijo TIHE napake.
--
-- Vsaka napaka v tej seji je bila tiha: uvoz je poročal uspeh in vpisal
-- smeti, testi so bili zeleni, stran je izrisala številko. Enotski testi tega
-- ne ujamejo, ker koda naredi natanko to, kar ji piše.
--
-- Ujame jih le trditev o **podatkih samih**: kaj mora držati, ne glede na
-- ligo in sezono. Kjer je le mogoče, je vrednost izračunana po DRUGI poti kot
-- tista, ki jo preverjamo — sicer preverjamo formulo s samo seboj.
--
-- Vrne eno vrstico na vrsto težave; prazen izid pomeni, da je vse v redu.

create or replace function preveri_podatke()
returns table (kljuc text, opis text, koliko bigint, primer text)
language sql
stable
security definer
set search_path = public
as $$

-- Kroge tekoce sezone potrebujeta dve preverbi spodaj.
with tekoci_krogi as (
  select r.id
    from rounds r
   where r.season = (select max(r2.season) from rounds r2
                      where r2.competition_id = r.competition_id)
)

-- === Uvoz ================================================================

-- Odigrana tekma ima dve enajsterici in klop. Manj kot 22 nastopov pomeni
-- nepopolno prebrano postavo.
select 'nastopi-premalo',
       'Uvožena tekma z manj kot 22 nastopi',
       count(*), min(x.opis)
  from (select m.id, format('tekma %s: %s nastopov', m.id, count(a.id)) opis
          from matches m left join appearances a on a.match_id = m.id
         where m.imported_at is not null
         group by m.id having count(a.id) < 22) x
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

union all
select 'nastop-podvojen',
       'Isti igralec ima na isti tekmi dva nastopa',
       count(*), min(x.opis)
  from (select format('igralec %s, tekma %s', a.player_id, a.match_id) opis
          from appearances a group by a.player_id, a.match_id having count(*) > 1) x
having count(*) > 0

union all
-- Klub pod dvema imenoma: statistika se razpolovi, pravilo o najvec treh
-- igralcih iz kluba pa se da zaobiti.
select 'klub-podvojen',
       'Dva kluba z enakim poenostavljenim imenom v isti državi',
       count(*), min(x.opis)
  from (select format('%s / %s', min(t.name), max(t.name)) opis
          from teams t group by t.country_id, poenostavljeno_ime(t.name)
        having count(*) > 1) x
having count(*) > 0

-- === Tocke ===============================================================

union all
-- `player_scores` je posnetek, `appearance_points` ziv pogled. Ce se
-- razideta, so tocke zastarele ali dvojno stete — to je tista vrsta napake,
-- zaradi katere je ekipa kazala -27.
select 'tocke-razhajanje',
       'Posnetek točk se ne ujema z izračunom iz nastopov (tekoča sezona)',
       count(*), min(x.opis)
  from (select format('igralec %s, krog %s: posnetek %s, izračun %s',
                      ps.player_id, ps.round_id, ps.points, coalesce(ap.vsota, 0)) opis
          from player_scores ps
          join tekoci_krogi tk on tk.id = ps.round_id
          left join (select player_id, round_id, sum(points) vsota
                       from appearance_points group by player_id, round_id) ap
            on ap.player_id = ps.player_id and ap.round_id = ps.round_id
         where abs(ps.points - coalesce(ap.vsota, 0)) > 0.01) x
having count(*) > 0

union all
-- Tocke za krog, v katerem igralec sploh ni nastopil.
select 'tocke-brez-nastopa',
       'Igralec ima točke v krogu, v katerem ni nastopil (tekoča sezona)',
       count(*), min(format('igralec %s, krog %s', ps.player_id, ps.round_id))
  from player_scores ps
  join tekoci_krogi tk on tk.id = ps.round_id
 where ps.points <> 0
   and not exists (select 1 from appearance_points ap
                    where ap.player_id = ps.player_id and ap.round_id = ps.round_id)
having count(*) > 0

-- === Cene ================================================================

union all
select 'cena-zunaj-mej',
       'Cena zunaj dovoljenega razpona 4.0–12.0',
       count(*), min(format('igralec %s: %s', p.id, p.value))
  from players p where p.value < 4.0 or p.value > 12.0
having count(*) > 0

union all
-- Borza se sme od sidra oddaljiti najvec za 3.0 (migracija 20260828170000).
select 'cena-predalec-od-sidra',
       'Cena je več kot 3.0 od izhodiščne',
       count(*), min(format('igralec %s: %s proti %s', p.id, p.value, p.value_start))
  from players p
 where p.value_start is not null and abs(p.value - p.value_start) > 3.0
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
$$;

comment on function preveri_podatke() is
  'Trditve o podatkih, ki morajo drzati v vsaki ligi. Prazen izid = vse v redu. Poganja jo `scripts/preveri-podatke.mjs` po nocnem uvozu.';

grant execute on function preveri_podatke() to anon, authenticated;
