-- Srbija: nižje lige Fudbalskog saveza Beograda (vir `fsb`), pod petimi iz
-- migracije 20261010000100. Šifra je slug strani lige sezone 2026/27; arhiva
-- 2025/26 in 2024/25 sta v CLAUDE.md (Srbija — vir fsb).
--
-- Izpuščeni: Prva opštinska liga FSOL in Opštinska liga Sopot imata vsaka po
-- dva različna kluba z imenom MLADOST v ISTI ligi, ki ju stran lige ne loči
-- (razčlenjevalnik ustavi uvoz). Istoimenski klubi v RAZLIČNIH ligah dobijo
-- kraj v `IME_V_LIGI` (scripts/viri/fsb.mjs).
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fsb', v.koda, 1, v.vrstni, 6, false,
       'FS Beograda', 'https://www.fsb.org.rs/takmicenje/' || v.koda || '/'
  from countries d
  cross join (values
    ('rs-bg-mol-a', 'Međuopštinska liga – grupa A', 'MOL A', 'medjuopstinska-liga-grupa-a', 6),
    ('rs-bg-mol-b', 'Međuopštinska liga – grupa B', 'MOL B', 'medjuopstinska-liga-grupa-b', 7),
    ('rs-bg-mol-c', 'Međuopštinska liga – grupa C', 'MOL C', 'medjuopstinska-liga-grupa-c', 8),
    ('rs-bg-lazarevac-2', 'Druga opštinska liga Lazarevac', 'Lazarevac 2', 'druga-opstinska-liga-fsol-2026-2027', 9),
    ('rs-bg-mladenovac', 'Opštinska liga Mladenovac', 'OL Mladenovac', 'opstinska-liga-mladenovac-2026-2027', 10),
    ('rs-bg-obrenovac', 'Opštinska liga Obrenovac', 'OL Obrenovac', 'opstinska-liga-obrenovac-2026-2027', 11)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'fsb'
 where d.code = 'RS'
on conflict (slug) do nothing;
