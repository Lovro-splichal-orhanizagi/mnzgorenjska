-- 1. SNL in 2. SNL.
--
-- Dvakrat sem zapisal, da iz njiju fantasy ni mogoč, ker NZS postav po tekmah
-- ne objavlja. Oboje je bilo narobe in oboje iz iste napake v metodi.
--
-- Postave: stran zanje stoji pod stranjo tekme kot `/zapisnik`. Iskal sem
-- besedo "postave", ki je na strani ni — začetna enajsterica nima naslova,
-- klop piše "Rezervni igralci". Iz odsotnosti NAPISA sem sklepal na odsotnost
-- PODATKA.
--
-- Arhiv: izbirnik sezone je skripten in navaden POST vrne tekočo sezono, zato
-- je bilo videti, da arhiva ni. Odgovor AJAX pa pove, kam preusmeri — in to je
-- navaden `?season=<id>`, kjer je sezona številka iz seznama, ne letnica.
--
-- Za razliko od 3. SNL tu zveza IN objavitelj sta ista (NZS), zato `vir_ime`
-- in `vir_url` ostaneta prazna in noga vzame navedbo od zveze.
--
-- Šifra je `<pot>` za tekočo sezono; arhivske sezone se podajo ob uvozu kot
-- `<pot>:<sezona>` (372571 = 2026/27, 22 = 2025/26, 23 = 2024/25,
-- 24 = 2023/24, 25 = 2022/23, 26 = 2021/22, 27 = 2020/21, 28 = 2019/20).
--
-- Obe se vpišeta NEAKTIVNI, kakor vsaka nova liga.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'nzs', v.koda, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('snl1', '1. SNL',  '1. SNL', 'prva-liga-telemach',          -2),
    ('snl2', '2. SNL',  '2. SNL', '2-slovenska-nogometna-liga',  -1)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'nzs'
 where d.code = 'SI'
on conflict (slug) do nothing;
