-- Madžarska: prve lige z vira MLSZ adatbank (vir `mlsz`), vármegyei I. osztály
-- vseh županij in Budimpešte (BLSZ I.). Tolna I. osztály v sezoni 2026/27 še
-- ni (le kvalifikacija), zato manjka.
--
-- Šifra lige je `<ev>/<szervezet>/<verseny>`: ev 67 = 2026/27, szervezet je
-- županija (1–20, Budimpešta 5), verseny id tekmovanja te sezone. Arhiv
-- 2025/26 (ev 65) je v CLAUDE.md (Madžarska). Nadaljevanja sezone (felsőház,
-- alsóház, rájátszás) so svoja tekmovanja in se v arhiv osnovne lige NE
-- uvažajo.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, 'https://adatbank.mlsz.hu/', v.vrstni
  from countries d
  cross join (values
    ('mlsz-bk', 'MLSZ Bács-Kiskun', 'Bács-Kiskun', 401),
    ('mlsz-ba', 'MLSZ Baranya', 'Baranya', 402),
    ('mlsz-be', 'MLSZ Békés', 'Békés', 403),
    ('mlsz-baz', 'MLSZ Borsod-Abaúj-Zemplén', 'Borsod-Abaúj-Zemplén', 404),
    ('mlsz-bp', 'MLSZ Budapest', 'Budapest', 405),
    ('mlsz-cs', 'MLSZ Csongrád-Csanád', 'Csongrád-Csanád', 406),
    ('mlsz-fe', 'MLSZ Fejér', 'Fejér', 407),
    ('mlsz-gy', 'MLSZ Győr-Moson-Sopron', 'Győr-Moson-Sopron', 408),
    ('mlsz-hb', 'MLSZ Hajdú-Bihar', 'Hajdú-Bihar', 409),
    ('mlsz-he', 'MLSZ Heves', 'Heves', 410),
    ('mlsz-jn', 'MLSZ Jász-Nagykun-Szolnok', 'Jász-Nagykun-Szolnok', 411),
    ('mlsz-ke', 'MLSZ Komárom-Esztergom', 'Komárom-Esztergom', 412),
    ('mlsz-no', 'MLSZ Nógrád', 'Nógrád', 413),
    ('mlsz-pe', 'MLSZ Pest', 'Pest', 414),
    ('mlsz-so', 'MLSZ Somogy', 'Somogy', 415),
    ('mlsz-sz', 'MLSZ Szabolcs-Szatmár-Bereg', 'Szabolcs-Szatmár-Bereg', 416),
    ('mlsz-va', 'MLSZ Vas', 'Vas', 417),
    ('mlsz-ve', 'MLSZ Veszprém', 'Veszprém', 418),
    ('mlsz-za', 'MLSZ Zala', 'Zala', 419)
  ) as v(koda, ime, kratko, vrstni)
 where d.code = 'HU'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mlsz', v.koda, 1, v.vrstni, 6, false,
       'MLSZ Adatbank', 'https://adatbank.mlsz.hu/league/' || v.koda || '/1.html'
  from countries d
  cross join (values
    ('hu-bk-1', 'Bács-Kiskun vármegyei I. osztály', 'Bács-Kiskun I.', 'mlsz-bk', '67/1/33671', 1),
    ('hu-ba-1', 'Baranya vármegyei I. osztály', 'Baranya I.', 'mlsz-ba', '67/2/33837', 1),
    ('hu-be-1', 'Békés vármegyei I. osztály', 'Békés I.', 'mlsz-be', '67/3/33830', 1),
    ('hu-baz-1', 'Borsod-Abaúj-Zemplén vármegyei I. osztály', 'BAZ I.', 'mlsz-baz', '67/4/33596', 1),
    ('hu-bp-1', 'BLSZ I. osztály', 'BLSZ I.', 'mlsz-bp', '67/5/33753', 1),
    ('hu-cs-1', 'Csongrád-Csanád vármegyei I. osztály', 'Csongrád I.', 'mlsz-cs', '67/6/33870', 1),
    ('hu-fe-1', 'Fejér vármegyei I. osztály', 'Fejér I.', 'mlsz-fe', '67/7/34106', 1),
    ('hu-gy-1', 'Győr-Moson-Sopron vármegyei I. osztály', 'GYMS I.', 'mlsz-gy', '67/8/33888', 1),
    ('hu-hb-1', 'Hajdú-Bihar vármegyei I. osztály', 'Hajdú-Bihar I.', 'mlsz-hb', '67/9/33901', 1),
    ('hu-he-1', 'Heves vármegyei I. osztály', 'Heves I.', 'mlsz-he', '67/10/33860', 1),
    ('hu-jn-1', 'Jász-Nagykun-Szolnok vármegyei I. osztály', 'JNSZ I.', 'mlsz-jn', '67/11/33736', 1),
    ('hu-ke-1', 'Komárom-Esztergom vármegyei I. osztály', 'KEM I.', 'mlsz-ke', '67/12/33789', 1),
    ('hu-no-1', 'Nógrád vármegyei I. osztály', 'Nógrád I.', 'mlsz-no', '67/13/33928', 1),
    ('hu-pe-1', 'Pest vármegyei I. osztály', 'Pest I.', 'mlsz-pe', '67/14/33660', 1),
    ('hu-so-1', 'Somogy vármegyei I. osztály', 'Somogy I.', 'mlsz-so', '67/15/33702', 1),
    ('hu-sz-1', 'Szabolcs-Szatmár-Bereg vármegyei I. osztály', 'SZSZB I.', 'mlsz-sz', '67/16/33809', 1),
    ('hu-va-1', 'Vas vármegyei I. osztály', 'Vas I.', 'mlsz-va', '67/18/34394', 1),
    ('hu-ve-1', 'Veszprém vármegyei I. osztály', 'Veszprém I.', 'mlsz-ve', '67/19/34160', 1),
    ('hu-za-1', 'Zala vármegyei I. osztály', 'Zala I.', 'mlsz-za', '67/20/33915', 1)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HU'
on conflict (slug) do nothing;
