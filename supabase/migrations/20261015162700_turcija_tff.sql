-- Turčija: lige TFF z vira `tff` (tff.org) — Trendyol 1. Lig (raven 2, ena
-- skupina, 20 klubov), Nesine 2. Lig (dve skupini), Nesine 3. Lig (tri
-- skupine) in Profesyonelliğe Geçiş Ligi (PGL, nekdanji BAL, 12 skupin) za
-- sezono 2026/27. Süper Lig namenoma NI vpisana (TFF ima svojo fantasy igro,
-- pogoji so nekomercialni — odloči lastnik posebej).
--
-- Šifra lige je `<pageID>/<grupID>` (stran tekmovanja sezone in skupina, glej
-- scripts/viri/tff.mjs), pri 1. Lig brez skupin le `<pageID>` (142, arhiv
-- 2025/26 `1772`); vsaka sezona ima svoje številke, ob novi sezoni se
-- šifra popravi. Arhiv 2025/26 (po skupnih klubih, CLAUDE.md, Turčija — vir tff):
--   tr-1-lig          1772
--   tr-2-lig-beyaz    1769/2781            tr-3-lig-1  1770/2785,1770/2783
--   tr-2-lig-kirmizi  1769/2782            tr-3-lig-2  1770/2786
--                                          tr-3-lig-3  1770/2784
--   PGL (BAL 2025/26, šibek, največ 6 skupnih klubov): pgl-1 1793/3306,
--   pgl-2 1793/3304, pgl-3 1793/3302, pgl-4 1793/3309, pgl-5 1793/3310,
--   pgl-8 1793/3301, pgl-10 1793/3308, pgl-11 1793/3305, pgl-12 1793/3307;
--   pgl-6, pgl-7, pgl-9 brez arhiva. PGL 2026/27 se začne 17.–18. 10. 2026.
--
-- Pogoji tff.org dovolijo objavo z navedbo vira, a ne v komercialne namene
-- (vir_ime/vir_url v nogi). Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda,
-- zapisnikov in cen — in pred tem vmesnik, pošta in TR v nočnem uvozu.

insert into countries (code, name, sort_order) values ('TR', 'Türkiye', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'tff', 'Türkiye Futbol Federasyonu', 'TFF', 'https://www.tff.org/', 1401
  from countries d
 where d.code = 'TR'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'tff', v.koda, 1, v.vrstni, 6, false,
       'TFF', 'https://www.tff.org/default.aspx?pageID=' || split_part(v.koda, '/', 1)
         || case when v.koda like '%/%' then '&grupID=' || split_part(v.koda, '/', 2) else '' end
  from countries d
  join federations f on f.code = 'tff'
  cross join (values
    ('tr-1-lig', 'Trendyol 1. Lig', '1. Lig', '142', 0),
    ('tr-2-lig-beyaz', 'Nesine 2. Lig Beyaz Grup', '2. Lig Beyaz', '976/3541', 1),
    ('tr-2-lig-kirmizi', 'Nesine 2. Lig Kırmızı Grup', '2. Lig Kırmızı', '976/3542', 2),
    ('tr-3-lig-1', 'Nesine 3. Lig 1. Grup', '3. Lig 1', '971/3543', 11),
    ('tr-3-lig-2', 'Nesine 3. Lig 2. Grup', '3. Lig 2', '971/3544', 12),
    ('tr-3-lig-3', 'Nesine 3. Lig 3. Grup', '3. Lig 3', '971/3545', 13),
    ('tr-pgl-1', 'Profesyonelliğe Geçiş Ligi 1. Grup', 'PGL 1', '1596/3938', 21),
    ('tr-pgl-2', 'Profesyonelliğe Geçiş Ligi 2. Grup', 'PGL 2', '1596/3939', 22),
    ('tr-pgl-3', 'Profesyonelliğe Geçiş Ligi 3. Grup', 'PGL 3', '1596/3940', 23),
    ('tr-pgl-4', 'Profesyonelliğe Geçiş Ligi 4. Grup', 'PGL 4', '1596/3941', 24),
    ('tr-pgl-5', 'Profesyonelliğe Geçiş Ligi 5. Grup', 'PGL 5', '1596/3942', 25),
    ('tr-pgl-6', 'Profesyonelliğe Geçiş Ligi 6. Grup', 'PGL 6', '1596/3943', 26),
    ('tr-pgl-7', 'Profesyonelliğe Geçiş Ligi 7. Grup', 'PGL 7', '1596/3944', 27),
    ('tr-pgl-8', 'Profesyonelliğe Geçiş Ligi 8. Grup', 'PGL 8', '1596/3945', 28),
    ('tr-pgl-9', 'Profesyonelliğe Geçiş Ligi 9. Grup', 'PGL 9', '1596/3946', 29),
    ('tr-pgl-10', 'Profesyonelliğe Geçiş Ligi 10. Grup', 'PGL 10', '1596/3947', 30),
    ('tr-pgl-11', 'Profesyonelliğe Geçiş Ligi 11. Grup', 'PGL 11', '1596/3948', 31),
    ('tr-pgl-12', 'Profesyonelliğe Geçiş Ligi 12. Grup', 'PGL 12', '1596/3949', 32)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'TR'
on conflict (slug) do nothing;
