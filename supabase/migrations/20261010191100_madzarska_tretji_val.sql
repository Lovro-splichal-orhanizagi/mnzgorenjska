-- Madžarska, tretji val: NB III (štiri skupine) ter vármegyei III. in IV.
-- osztály vseh županij (s skupinami) in BLSZ III./IV., le odrasli moški na
-- velikem igrišču. Izpuščeni: mladinci, ženske, futsal, kispályás, old boys,
-- tartalék (rezervne ekipe Győra), mestne lige (Alba Liga, DLSZ, szegedske
-- III.A–C), univerzitetne in delitve sezone (felsőház/alsóház, rájátszás).
-- Nova zveza: MLSZ (državna raven, NB III) in Tolna (prej brez lige).
--
-- Arhivi so v CLAUDE.md (Madžarska, Tretji val). Vsak arhiv uporabi ena sama
-- liga (matches.zapisnik_id je enoličen); Vas III. 2025/26 že uporabljajo
-- lige Vas II., zato Vas III. dobi 2024/25.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, 'https://adatbank.mlsz.hu/', v.vrstni
  from countries d
  cross join (values
    ('mlsz', 'Magyar Labdarúgó Szövetség', 'MLSZ', 400),
    ('mlsz-to', 'MLSZ Tolna', 'Tolna', 420)
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
    ('hu-nb3-eszak-kelet', 'NB III. Észak-Keleti csoport', 'NB III. Északkelet', 'mlsz', '67/0/33588', 1),
    ('hu-nb3-del-kelet', 'NB III. Dél-Keleti csoport', 'NB III. Délkelet', 'mlsz', '67/0/34054', 2),
    ('hu-nb3-eszak-nyugat', 'NB III. Észak-Nyugati csoport', 'NB III. Északnyugat', 'mlsz', '67/0/34055', 3),
    ('hu-nb3-del-nyugat', 'NB III. Dél-Nyugati csoport', 'NB III. Délnyugat', 'mlsz', '67/0/34056', 4),
    ('hu-bk-3-del', 'Bács-Kiskun vármegyei III. osztály Dél', 'Bács-Kiskun III. Dél', 'mlsz-bk', '67/1/33674', 11),
    ('hu-bk-3-eszak', 'Bács-Kiskun vármegyei III. osztály Észak', 'Bács-Kiskun III. Észak', 'mlsz-bk', '67/1/33676', 12),
    ('hu-bk-3-kozep', 'Bács-Kiskun vármegyei III. osztály Közép', 'Bács-Kiskun III. Közép', 'mlsz-bk', '67/1/33677', 13),
    ('hu-bk-3-nyugat', 'Bács-Kiskun vármegyei III. osztály Nyugat', 'Bács-Kiskun III. Nyugat', 'mlsz-bk', '67/1/33678', 14),
    ('hu-ba-3-a', 'Baranya vármegyei III. osztály A csoport', 'Baranya III. A', 'mlsz-ba', '67/2/34398', 11),
    ('hu-ba-3-b', 'Baranya vármegyei III. osztály B csoport', 'Baranya III. B', 'mlsz-ba', '67/2/34399', 12),
    ('hu-be-3-eszak', 'Békés vármegyei III. osztály Észak', 'Békés III. Észak', 'mlsz-be', '67/3/33832', 11),
    ('hu-be-3-del', 'Békés vármegyei III. osztály Dél', 'Békés III. Dél', 'mlsz-be', '67/3/34173', 12),
    ('hu-baz-3-eszak', 'Borsod-Abaúj-Zemplén vármegyei III. osztály Észak', 'BAZ III. Észak', 'mlsz-baz', '67/4/34090', 11),
    ('hu-baz-3-kelet', 'Borsod-Abaúj-Zemplén vármegyei III. osztály Kelet', 'BAZ III. Kelet', 'mlsz-baz', '67/4/34089', 12),
    ('hu-baz-3-del', 'Borsod-Abaúj-Zemplén vármegyei III. osztály Dél', 'BAZ III. Dél', 'mlsz-baz', '67/4/34091', 13),
    ('hu-bp-3-1', 'BLSZ III. osztály 1. csoport', 'BLSZ III. 1.', 'mlsz-bp', '67/5/33755', 11),
    ('hu-bp-3-2', 'BLSZ III. osztály 2. csoport', 'BLSZ III. 2.', 'mlsz-bp', '67/5/34211', 12),
    ('hu-bp-3-3', 'BLSZ III. osztály 3. csoport', 'BLSZ III. 3.', 'mlsz-bp', '67/5/34212', 13),
    ('hu-bp-4-1', 'BLSZ IV. osztály 1. csoport', 'BLSZ IV. 1.', 'mlsz-bp', '67/5/34214', 21),
    ('hu-bp-4-2', 'BLSZ IV. osztály 2. csoport', 'BLSZ IV. 2.', 'mlsz-bp', '67/5/34213', 22),
    ('hu-bp-4-3', 'BLSZ IV. osztály 3. csoport', 'BLSZ IV. 3.', 'mlsz-bp', '67/5/33756', 23),
    ('hu-cs-3', 'Csongrád-Csanád vármegyei III. osztály', 'Csongrád III.', 'mlsz-cs', '67/6/33875', 11),
    ('hu-cs-4-tisza-maros', 'Csongrád-Csanád vármegyei IV. osztály Tisza-Maros', 'Csongrád IV. Tisza-Maros', 'mlsz-cs', '67/6/33879', 21),
    ('hu-cs-4-homokhat', 'Csongrád-Csanád vármegyei IV. osztály Homokhát', 'Csongrád IV. Homokhát', 'mlsz-cs', '67/6/34084', 22),
    ('hu-fe-3-eszak', 'Fejér vármegyei III. osztály Észak', 'Fejér III. Észak', 'mlsz-fe', '67/7/34113', 11),
    ('hu-fe-3-del', 'Fejér vármegyei III. osztály Dél', 'Fejér III. Dél', 'mlsz-fe', '67/7/34115', 12),
    ('hu-gy-3-kelet-a', 'Győr-Moson-Sopron vármegyei III. osztály Kelet A', 'GYMS III. Kelet A', 'mlsz-gy', '67/8/33892', 11),
    ('hu-gy-3-kelet-b', 'Győr-Moson-Sopron vármegyei III. osztály Kelet B', 'GYMS III. Kelet B', 'mlsz-gy', '67/8/34181', 12),
    ('hu-gy-3-eszak', 'Győr-Moson-Sopron vármegyei III. osztály Észak', 'GYMS III. Észak', 'mlsz-gy', '67/8/34182', 13),
    ('hu-gy-3-nyugat-a', 'Győr-Moson-Sopron vármegyei III. osztály Nyugat A', 'GYMS III. Nyugat A', 'mlsz-gy', '67/8/34183', 14),
    ('hu-gy-3-nyugat-b', 'Győr-Moson-Sopron vármegyei III. osztály Nyugat B', 'GYMS III. Nyugat B', 'mlsz-gy', '67/8/34185', 15),
    ('hu-hb-3-eszak', 'Hajdú-Bihar vármegyei III. osztály Észak', 'Hajdú-Bihar III. Észak', 'mlsz-hb', '67/9/34121', 11),
    ('hu-hb-3-del', 'Hajdú-Bihar vármegyei III. osztály Dél', 'Hajdú-Bihar III. Dél', 'mlsz-hb', '67/9/34122', 12),
    ('hu-he-3', 'Heves vármegyei III. osztály', 'Heves III.', 'mlsz-he', '67/10/33863', 11),
    ('hu-jn-3', 'Jász-Nagykun-Szolnok vármegyei III. osztály', 'JNSZ III.', 'mlsz-jn', '67/11/33738', 11),
    ('hu-ke-3-del', 'Komárom-Esztergom vármegyei III. osztály Dél', 'KEM III. Dél', 'mlsz-ke', '67/12/33791', 11),
    ('hu-ke-3-eszak', 'Komárom-Esztergom vármegyei III. osztály Észak', 'KEM III. Észak', 'mlsz-ke', '67/12/34204', 12),
    ('hu-no-3-kelet', 'Nógrád vármegyei III. osztály Kelet', 'Nógrád III. Kelet', 'mlsz-no', '67/13/33940', 11),
    ('hu-no-3-nyugat', 'Nógrád vármegyei III. osztály Nyugat', 'Nógrád III. Nyugat', 'mlsz-no', '67/13/34057', 12),
    ('hu-pe-3-eszak', 'Pest vármegyei III. osztály Észak', 'Pest III. Észak', 'mlsz-pe', '67/14/34069', 11),
    ('hu-pe-3-del', 'Pest vármegyei III. osztály Dél', 'Pest III. Dél', 'mlsz-pe', '67/14/34070', 12),
    ('hu-pe-3-kelet', 'Pest vármegyei III. osztály Kelet', 'Pest III. Kelet', 'mlsz-pe', '67/14/34071', 13),
    ('hu-pe-4-eszak', 'Pest vármegyei IV. osztály Észak', 'Pest IV. Észak', 'mlsz-pe', '67/14/34072', 21),
    ('hu-pe-4-delkelet', 'Pest vármegyei IV. osztály Délkelet', 'Pest IV. Délkelet', 'mlsz-pe', '67/14/34073', 22),
    ('hu-pe-4-kelet', 'Pest vármegyei IV. osztály Kelet', 'Pest IV. Kelet', 'mlsz-pe', '67/14/34074', 23),
    ('hu-pe-4-nyugat', 'Pest vármegyei IV. osztály Nyugat', 'Pest IV. Nyugat', 'mlsz-pe', '67/14/34075', 24),
    ('hu-so-3-eszak', 'Somogy vármegyei III. osztály Észak', 'Somogy III. Észak', 'mlsz-so', '67/15/33709', 11),
    ('hu-so-3-del', 'Somogy vármegyei III. osztály Dél', 'Somogy III. Dél', 'mlsz-so', '67/15/34170', 12),
    ('hu-so-4-eszak', 'Somogy vármegyei IV. osztály Észak', 'Somogy IV. Észak', 'mlsz-so', '67/15/33710', 21),
    ('hu-so-4-del', 'Somogy vármegyei IV. osztály Dél', 'Somogy IV. Dél', 'mlsz-so', '67/15/34107', 22),
    ('hu-sz-3-nyugat', 'Szabolcs-Szatmár-Bereg vármegyei III. osztály Nyugat', 'SZSZB III. Nyugat', 'mlsz-sz', '67/16/33814', 11),
    ('hu-sz-3-kozep', 'Szabolcs-Szatmár-Bereg vármegyei III. osztály Közép', 'SZSZB III. Közép', 'mlsz-sz', '67/16/34163', 12),
    ('hu-sz-3-kelet', 'Szabolcs-Szatmár-Bereg vármegyei III. osztály Kelet', 'SZSZB III. Kelet', 'mlsz-sz', '67/16/34164', 13),
    ('hu-to-3-kelet', 'Tolna vármegyei III. osztály Kelet', 'Tolna III. Kelet', 'mlsz-to', '67/17/33957', 11),
    ('hu-to-3-nyugat', 'Tolna vármegyei III. osztály Nyugat', 'Tolna III. Nyugat', 'mlsz-to', '67/17/34465', 12),
    ('hu-va-3-szombathely', 'Vas vármegyei III. osztály Szombathely', 'Vas III. Szombathely', 'mlsz-va', '67/18/33771', 11),
    ('hu-va-3-kormend', 'Vas vármegyei III. osztály Körmend', 'Vas III. Körmend', 'mlsz-va', '67/18/34049', 12),
    ('hu-va-3-sarvar', 'Vas vármegyei III. osztály Sárvár', 'Vas III. Sárvár', 'mlsz-va', '67/18/34050', 13),
    ('hu-ve-3-eszak', 'Veszprém vármegyei III. osztály Észak', 'Veszprém III. Észak', 'mlsz-ve', '67/19/34241', 11),
    ('hu-ve-3-kelet', 'Veszprém vármegyei III. osztály Kelet', 'Veszprém III. Kelet', 'mlsz-ve', '67/19/34242', 12),
    ('hu-ve-3-nyugat', 'Veszprém vármegyei III. osztály Nyugat', 'Veszprém III. Nyugat', 'mlsz-ve', '67/19/34243', 13),
    ('hu-ve-3-del', 'Veszprém vármegyei III. osztály Dél', 'Veszprém III. Dél', 'mlsz-ve', '67/19/34246', 14),
    ('hu-za-3-eszak', 'Zala vármegyei III. osztály Északi csoport', 'Zala III. Észak', 'mlsz-za', '67/20/33917', 11),
    ('hu-za-3-del', 'Zala vármegyei III. osztály Déli csoport', 'Zala III. Dél', 'mlsz-za', '67/20/33918', 12),
    ('hu-za-3-kelet', 'Zala vármegyei III. osztály Keleti csoport', 'Zala III. Kelet', 'mlsz-za', '67/20/33919', 13),
    ('hu-za-3-nyugat', 'Zala vármegyei III. osztály Nyugati csoport', 'Zala III. Nyugat', 'mlsz-za', '67/20/33920', 14),
    ('hu-za-3-kozep', 'Zala vármegyei III. osztály Közép csoport', 'Zala III. Közép', 'mlsz-za', '67/20/34240', 15)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HU'
on conflict (slug) do nothing;
