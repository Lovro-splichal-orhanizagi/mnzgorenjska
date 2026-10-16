-- Turčija: pokrajinske amaterske lige ASKF z vira `askf` (platforma FYS) —
-- Çanakkale (canakkaleaskf.org) in Aydın (aydinaskf.com), sezona 2026/27.
--
-- Šifra lige je `<zveza>/<sezona>/<liga>[/<skupina>]` (glej
-- scripts/viri/askf.mjs); sezona je del šifre, ob novi sezoni se šifra popravi.
-- Arhiv 2025/26 (po skupnih klubih, CLAUDE.md, Turčija — vir askf):
--   tr-canakkale-sal        canakkale/2025-2026/samator
--   tr-canakkale-1-amator   canakkale/2025-2026/1amator
--   tr-aydin-sal            aydin/2025-2026/samator
--   tr-aydin-1-amator-1     aydin/2025-2026/1amator/1                (6 skupnih klubov)
--   tr-aydin-1-amator-2     aydin/2025-2026/1amator/2,aydin/2025-2026/1amator/3  (5 + 4)
-- 2. Amatör v 2026/27 ni razpisana (Çanakkale 2025/26: skupine po 5–6 klubov,
-- le spomladi), mladinske in TFF lige (3. Lig, PGL — vir `tff`) niso vpisane.
--
-- Zveza objavlja sama (noga vzame `site_url` zveze, `vir_ime`/`vir_url` ostaneta
-- prazna). Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen —
-- in pred tem vmesnik, pošta in TR v nočnem uvozu. Država TR je lahko že vpisana
-- (vir `tff`), zato `on conflict do nothing`.

insert into countries (code, name, sort_order) values ('TR', 'Türkiye', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.name, v.short_name, v.site_url, v.sort_order
  from countries d
  cross join (values
    ('askf-canakkale', 'Çanakkale Amatör Spor Kulüpleri Federasyonu', 'Çanakkale ASKF', 'https://www.canakkaleaskf.org/', 1411),
    ('askf-aydin', 'Aydın Amatör Spor Kulüpleri Federasyonu', 'Aydın ASKF', 'https://www.aydinaskf.com/', 1412)
  ) as v(code, name, short_name, site_url, sort_order)
 where d.code = 'TR'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'askf', v.koda, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('tr-canakkale-sal', 'Çanakkale Süper Amatör Lig', 'Çanakkale SAL', 'canakkale/2026-2027/samator', 'askf-canakkale', 41),
    ('tr-canakkale-1-amator', 'Çanakkale 1. Amatör Lig', 'Çanakkale 1. Amatör', 'canakkale/2026-2027/1amator', 'askf-canakkale', 42),
    ('tr-aydin-sal', 'Aydın Süper Amatör Lig', 'Aydın SAL', 'aydin/2026-2027/samator', 'askf-aydin', 51),
    ('tr-aydin-1-amator-1', 'Aydın 1. Amatör Lig, 1. Grup', 'Aydın 1. Amatör 1', 'aydin/2026-2027/1amator/1', 'askf-aydin', 52),
    ('tr-aydin-1-amator-2', 'Aydın 1. Amatör Lig, 2. Grup', 'Aydın 1. Amatör 2', 'aydin/2026-2027/1amator/2', 'askf-aydin', 53)
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'TR'
on conflict (slug) do nothing;
