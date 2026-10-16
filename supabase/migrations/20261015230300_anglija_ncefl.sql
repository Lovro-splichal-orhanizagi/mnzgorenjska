-- Anglija (step 5–6): Northern Counties East Football League (NCEL) z vira
-- `ncefl` — lastna stran lige www.ncefl.org.uk. Glej CLAUDE.md
-- (Anglija — vir ncefl).
--
-- Država je `GB` (ISO 3166-1 alpha-2, kot pove `countries.code`; šifra lige se
-- začne z `gb-`). Vpiše jo tudi migracija lig isthmian (20261015031100), zato
-- `on conflict do nothing` z istimi vrednostmi: migraciji sta neodvisni od
-- vrstnega reda.
--
-- Šifra lige je `<divizija>/<leto>` (`ncelpremierdivision/2026` = 2026/27).
-- Ob novi sezoni se popravi le leto. Arhiv 2025/26 je ista divizija z letom
-- 2025 (`ncelpremierdivision/2025`, `nceldivisionone/2025`): vse tekme odigrane,
-- vse z zapisnikom (380 in 462).
--
-- Stran krogov ne pozna: krog je teden (ponedeljek–nedelja) od tedna zadnje
-- julijske sobote, zato ima klub v kakem krogu dve tekmi, v kakem nobene.
-- Sezona avgust–maj (ne koledarska). Lige so NEAKTIVNE; uvoz ni bil pognan.

insert into countries (code, name, sort_order) values ('GB', 'United Kingdom', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'ncefl', 'Northern Counties East Football League', 'NCEL', 'https://www.ncefl.org.uk/', 1410
  from countries d
 where d.code = 'GB'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'ncefl', v.koda, 1, v.vrstni, 6, false,
       f.short_name, f.site_url
  from countries d
  join federations f on f.code = 'ncefl'
  cross join (values
    -- slug, ime, kratko ime, šifra (tekoča 2026/27), vrstni red
    ('gb-ncel-premier', 'NCEL Premier Division', 'NCEL Premier', 'ncelpremierdivision/2026', 210),
    ('gb-ncel-division-one', 'NCEL Division One', 'NCEL Division One', 'nceldivisionone/2026', 220)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'GB'
on conflict (slug) do nothing;
