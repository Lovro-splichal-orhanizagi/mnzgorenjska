-- Madžarska, drugi val: vármegyei II. osztály vseh županij (s skupinami) in
-- BLSZ II. Tolna II. v sezoni 2026/27 ni (le kvalifikacija I-II), zato manjka.
-- Arhivi 2025/26 so v CLAUDE.md (Madžarska). Kjer je županija skupine
-- preuredila (Bács-Kiskun, Szabolcs, Vas), dobi vsaka nova skupina arhive vseh
-- lanskih skupin II.: uvoz razporeda igralce klubov zunaj lige deaktivira.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mlsz', v.koda, 1, v.vrstni, 6, false,
       'MLSZ Adatbank', 'https://adatbank.mlsz.hu/league/' || v.koda || '/1.html'
  from countries d
  cross join (values
    ('hu-bk-2-del', 'Bács-Kiskun vármegyei II. osztály Dél', 'Bács-Kiskun II. Dél', 'mlsz-bk', '67/1/33672', 2),
    ('hu-bk-2-eszak', 'Bács-Kiskun vármegyei II. osztály Észak', 'Bács-Kiskun II. Észak', 'mlsz-bk', '67/1/33675', 3),
    ('hu-ba-2', 'Baranya vármegyei II. osztály', 'Baranya II.', 'mlsz-ba', '67/2/33838', 2),
    ('hu-be-2', 'Békés vármegyei II. osztály', 'Békés II.', 'mlsz-be', '67/3/33831', 2),
    ('hu-baz-2-eszak', 'Borsod-Abaúj-Zemplén vármegyei II. osztály Észak', 'BAZ II. Észak', 'mlsz-baz', '67/4/34085', 2),
    ('hu-baz-2-kelet', 'Borsod-Abaúj-Zemplén vármegyei II. osztály Kelet', 'BAZ II. Kelet', 'mlsz-baz', '67/4/34086', 3),
    ('hu-baz-2-kozep', 'Borsod-Abaúj-Zemplén vármegyei II. osztály Közép', 'BAZ II. Közép', 'mlsz-baz', '67/4/34087', 4),
    ('hu-bp-2', 'BLSZ II. osztály', 'BLSZ II.', 'mlsz-bp', '67/5/33754', 2),
    ('hu-cs-2', 'Csongrád-Csanád vármegyei II. osztály', 'Csongrád II.', 'mlsz-cs', '67/6/33873', 2),
    ('hu-fe-2-eszak', 'Fejér vármegyei II. osztály Észak', 'Fejér II. Észak', 'mlsz-fe', '67/7/34109', 2),
    ('hu-fe-2-del', 'Fejér vármegyei II. osztály Dél', 'Fejér II. Dél', 'mlsz-fe', '67/7/34111', 3),
    ('hu-gy-2-kelet', 'Győr-Moson-Sopron vármegyei II. osztály Kelet', 'GYMS II. Kelet', 'mlsz-gy', '67/8/33890', 2),
    ('hu-gy-2-eszak', 'Győr-Moson-Sopron vármegyei II. osztály Észak', 'GYMS II. Észak', 'mlsz-gy', '67/8/34176', 3),
    ('hu-gy-2-nyugat', 'Győr-Moson-Sopron vármegyei II. osztály Nyugat', 'GYMS II. Nyugat', 'mlsz-gy', '67/8/34179', 4),
    ('hu-hb-2-eszak', 'Hajdú-Bihar vármegyei II. osztály Észak', 'Hajdú-Bihar II. Észak', 'mlsz-hb', '67/9/34117', 2),
    ('hu-hb-2-del', 'Hajdú-Bihar vármegyei II. osztály Dél', 'Hajdú-Bihar II. Dél', 'mlsz-hb', '67/9/34119', 3),
    ('hu-he-2', 'Heves vármegyei II. osztály', 'Heves II.', 'mlsz-he', '67/10/33864', 2),
    ('hu-jn-2', 'Jász-Nagykun-Szolnok vármegyei II. osztály', 'JNSZ II.', 'mlsz-jn', '67/11/33737', 2),
    ('hu-ke-2', 'Komárom-Esztergom vármegyei II. osztály', 'KEM II.', 'mlsz-ke', '67/12/33790', 2),
    ('hu-no-2', 'Nógrád vármegyei II. osztály', 'Nógrád II.', 'mlsz-no', '67/13/33936', 2),
    ('hu-pe-2-eszak', 'Pest vármegyei II. osztály Észak', 'Pest II. Észak', 'mlsz-pe', '67/14/34067', 2),
    ('hu-pe-2-del', 'Pest vármegyei II. osztály Dél', 'Pest II. Dél', 'mlsz-pe', '67/14/34068', 3),
    ('hu-so-2', 'Somogy vármegyei II. osztály', 'Somogy II.', 'mlsz-so', '67/15/33708', 2),
    ('hu-sz-2-1', 'Szabolcs-Szatmár-Bereg vármegyei II. osztály 1. csoport', 'SZSZB II. 1.', 'mlsz-sz', '67/16/33811', 2),
    ('hu-sz-2-2', 'Szabolcs-Szatmár-Bereg vármegyei II. osztály 2. csoport', 'SZSZB II. 2.', 'mlsz-sz', '67/16/34157', 3),
    ('hu-va-2-szombathely', 'Vas vármegyei II. osztály Szombathely', 'Vas II. Szombathely', 'mlsz-va', '67/18/34047', 2),
    ('hu-va-2-kormend', 'Vas vármegyei II. osztály Körmend', 'Vas II. Körmend', 'mlsz-va', '67/18/34043', 3),
    ('hu-va-2-sarvar', 'Vas vármegyei II. osztály Sárvár', 'Vas II. Sárvár', 'mlsz-va', '67/18/34046', 4),
    ('hu-ve-2', 'Veszprém vármegyei II. osztály', 'Veszprém II.', 'mlsz-ve', '67/19/33719', 2),
    ('hu-za-2', 'Zala vármegyei II. osztály', 'Zala II.', 'mlsz-za', '67/20/33916', 2)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HU'
on conflict (slug) do nothing;
