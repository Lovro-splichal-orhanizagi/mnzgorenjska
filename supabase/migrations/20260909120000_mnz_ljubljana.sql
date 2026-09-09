-- MNZ Ljubljana: 1. in 2. liga člani.
--
-- Ligi se vpišeta kot **neaktivni**. `competitions_view` bere vmesnik s
-- filtrom `active = true`, zato ta migracija za obstoječega uporabnika iz
-- Gorenjske ne spremeni ničesar — izbirnik ostane tak, kot je bil.
--
-- Vklopi ju administrator šele, ko sta uvožena arhiv in tekoča sezona in ko
-- cene niso več privzete. Liga, v kateri stane vsak igralec 4.5, nima igre:
-- 15 × 4.5 = 67.5 pri proračunu 100 in vsaka ekipa je enaka.
--
--   update competitions set active = true where slug in ('lj-1-liga','lj-2-liga');
--
-- Šifra lige pri viru pripada SEZONI, ne ligi (2026/27 je 2003/2004, arhiv
-- 2025/26 pa 1904/1905) — ob novi sezoni se popravi `source_league_code`.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select id, 'mnzlj', 'MNZ Ljubljana', 'Ljubljana', 'https://www.mnzljubljana-zveza.si/', 2
  from countries where code = 'SI'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.name, v.short_name, d.id, f.id,
       'mnzlj', v.koda, 1, v.sort, 6, false
  from (values
    ('lj-1-liga', '1. liga — člani', 'LJ 1.', '2003', 1),
    ('lj-2-liga', '2. liga — člani', 'LJ 2.', '2004', 2)
  ) as v(slug, name, short_name, koda, sort)
  cross join countries d
  join federations f on f.code = 'mnzlj'
 where d.code = 'SI'
on conflict (slug) do nothing;
