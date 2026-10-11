-- Madžarska, mladinci: najstarejša kategorija (U19) na velikem igrišču —
-- MLSZ državne (Országos U19 Kiemelt/Alap), regionalne (Regionális U19
-- Kiemelt in Alap; Adatbank jih vodi pod županijo, ki tekmovanje izvaja) in
-- županijske U19 lige s skupinami. Nobena županija nima U18 namesto U19.
-- Izpuščeni: U17 in mlajši, U21 (Győr, Hajdú-Bihar, Heves, Nógrád, Vas,
-- Zala, Veszprém — spremljevalne lige odraslih), leány/női, futsal,
-- kispályás, turnirji, pokali, rájátszás.
--
-- Arhivi so v CLAUDE.md (Madžarska, U19). Vsak arhiv uporabi ena sama liga
-- (matches.zapisnik_id je enoličen); kjer je županija skupine preuredila, je
-- arhiv izbran po skupnih klubih 1. kroga obeh sezon.
--
-- Kot druge mladinske lige: prvi_fantasy_krog = 2, rok_pomak_ur = 2. Ekipe
-- U19 nosijo ime kluba (pripono U19 ključ kluba odreže), klub je skupen s
-- člani, igralec ima v vsaki ligi svojo vrstico.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mlsz', v.koda, 2, v.vrstni, 2, false,
       'MLSZ Adatbank', 'https://adatbank.mlsz.hu/league/' || v.koda || '/1.html'
  from countries d
  cross join (values
    ('hu-u19-orszagos-kiemelt', 'MLSZ Országos U19 Kiemelt', 'U19 Országos Kiemelt', 'mlsz', '67/0/34125', 31),
    ('hu-u19-orszagos-alap', 'MLSZ Országos U19 Alap', 'U19 Országos Alap', 'mlsz', '67/0/33758', 32),
    ('hu-u19-kiemelt-nyugat', 'MLSZ Regionális U19 Kiemelt Nyugat', 'U19 Reg. Kiemelt Nyugat', 'mlsz', '67/0/33775', 33),
    ('hu-u19-kiemelt-kelet', 'MLSZ Regionális U19 Kiemelt Kelet', 'U19 Reg. Kiemelt Kelet', 'mlsz', '67/0/34140', 34),
    ('hu-u19-eszaknyugat', 'MLSZ Regionális U19 Alap Északnyugati csoport', 'U19 Reg. Alap Északnyugat', 'mlsz', '67/8/34463', 35),
    ('hu-u19-kozepnyugat', 'MLSZ Regionális U19 Alap Középnyugati csoport', 'U19 Reg. Alap Középnyugat', 'mlsz', '67/7/34362', 36),
    ('hu-u19-delnyugat', 'MLSZ Regionális U19 Alap Délnyugati csoport', 'U19 Reg. Alap Délnyugat', 'mlsz', '67/2/34374', 37),
    ('hu-u19-kozepkelet', 'MLSZ Regionális U19 Alap Középkeleti csoport', 'U19 Reg. Alap Középkelet', 'mlsz', '67/5/34365', 38),
    ('hu-u19-eszakkelet', 'MLSZ Regionális U19 Alap Északkeleti csoport', 'U19 Reg. Alap Északkelet', 'mlsz', '67/10/34363', 39),
    ('hu-u19-kelet', 'MLSZ Regionális U19 Alap Keleti csoport', 'U19 Reg. Alap Kelet', 'mlsz', '67/16/34403', 40),
    ('hu-u19-delkelet', 'MLSZ Regionális U19 Alap Délkeleti csoport', 'U19 Reg. Alap Délkelet', 'mlsz', '67/6/34350', 41),
    ('hu-bk-u19-del', 'Bács-Kiskun vármegyei U19 Dél', 'Bács-Kiskun U19 Dél', 'mlsz-bk', '67/1/33679', 51),
    ('hu-bk-u19-eszak', 'Bács-Kiskun vármegyei U19 Észak', 'Bács-Kiskun U19 Észak', 'mlsz-bk', '67/1/33680', 52),
    ('hu-bk-u19-kozep', 'Bács-Kiskun vármegyei U19 Közép', 'Bács-Kiskun U19 Közép', 'mlsz-bk', '67/1/33681', 53),
    ('hu-ba-u19-1', 'Baranya vármegyei I. osztály U19', 'Baranya U19 I.', 'mlsz-ba', '67/2/33845', 51),
    ('hu-ba-u19-2', 'Baranya vármegyei II. osztály U19', 'Baranya U19 II.', 'mlsz-ba', '67/2/33847', 52),
    ('hu-be-u19-eszak', 'Békés vármegyei U19 Észak', 'Békés U19 Észak', 'mlsz-be', '67/3/34290', 51),
    ('hu-be-u19-del', 'Békés vármegyei U19 Dél', 'Békés U19 Dél', 'mlsz-be', '67/3/33833', 52),
    ('hu-baz-u19-1', 'Borsod-Abaúj-Zemplén vármegyei U19 I. osztály', 'BAZ U19 I.', 'mlsz-baz', '67/4/33599', 51),
    ('hu-baz-u19-2-eszak', 'Borsod-Abaúj-Zemplén vármegyei U19 II. osztály Észak', 'BAZ U19 II. Észak', 'mlsz-baz', '67/4/34092', 52),
    ('hu-baz-u19-2-kelet', 'Borsod-Abaúj-Zemplén vármegyei U19 II. osztály Kelet', 'BAZ U19 II. Kelet', 'mlsz-baz', '67/4/34093', 53),
    ('hu-baz-u19-2-kozep', 'Borsod-Abaúj-Zemplén vármegyei U19 II. osztály Közép', 'BAZ U19 II. Közép', 'mlsz-baz', '67/4/34094', 54),
    ('hu-bp-u19-1', 'BLSZ Ifjúsági U19 1. csoport', 'BLSZ U19 1.', 'mlsz-bp', '67/5/33817', 51),
    ('hu-bp-u19-2', 'BLSZ Ifjúsági U19 2. csoport', 'BLSZ U19 2.', 'mlsz-bp', '67/5/34361', 52),
    ('hu-cs-u19-szalai', 'Csongrád-Csanád vármegyei U19 Szalai Dzsinó csoport', 'Csongrád U19 Szalai Dzsinó', 'mlsz-cs', '67/6/33880', 51),
    ('hu-cs-u19-toth', 'Csongrád-Csanád vármegyei U19 Tóth Pipu csoport', 'Csongrád U19 Tóth Pipu', 'mlsz-cs', '67/6/34102', 52),
    ('hu-fe-u19-1', 'Fejér vármegyei I. osztály U19', 'Fejér U19 I.', 'mlsz-fe', '67/7/34116', 51),
    ('hu-fe-u19-2-eszak', 'Fejér vármegyei II. osztály U19 Északi csoport', 'Fejér U19 II. Észak', 'mlsz-fe', '67/7/34186', 52),
    ('hu-fe-u19-2-nyugat', 'Fejér vármegyei II. osztály U19 Nyugati csoport', 'Fejér U19 II. Nyugat', 'mlsz-fe', '67/7/34187', 53),
    ('hu-fe-u19-2-del', 'Fejér vármegyei II. osztály U19 Déli csoport', 'Fejér U19 II. Dél', 'mlsz-fe', '67/7/34188', 54),
    ('hu-jn-u19-1', 'Jász-Nagykun-Szolnok vármegyei I. osztály U19', 'JNSZ U19 I.', 'mlsz-jn', '67/11/33742', 51),
    ('hu-jn-u19-teruleti', 'Jász-Nagykun-Szolnok vármegyei Területi U19', 'JNSZ U19 Területi', 'mlsz-jn', '67/11/33744', 52),
    ('hu-ke-u19-1', 'Komárom-Esztergom vármegyei I. osztály U19', 'KEM U19 I.', 'mlsz-ke', '67/12/33795', 51),
    ('hu-ke-u19-2', 'Komárom-Esztergom vármegyei II. osztály U19', 'KEM U19 II.', 'mlsz-ke', '67/12/33797', 52),
    ('hu-pe-u19-a', 'Pest vármegyei U19 A csoport', 'Pest U19 A', 'mlsz-pe', '67/14/34248', 51),
    ('hu-pe-u19-b', 'Pest vármegyei U19 B csoport', 'Pest U19 B', 'mlsz-pe', '67/14/34249', 52),
    ('hu-pe-u19-c', 'Pest vármegyei U19 C csoport', 'Pest U19 C', 'mlsz-pe', '67/14/34250', 53),
    ('hu-pe-u19-d', 'Pest vármegyei U19 D csoport', 'Pest U19 D', 'mlsz-pe', '67/14/34387', 54),
    ('hu-pe-u19-e', 'Pest vármegyei U19 E csoport', 'Pest U19 E', 'mlsz-pe', '67/14/34252', 55),
    ('hu-so-u19-1', 'Somogy vármegyei I. osztály U19', 'Somogy U19 I.', 'mlsz-so', '67/15/33707', 51),
    ('hu-so-u19-2-eszak', 'Somogy vármegyei II-III. osztály U19 Észak', 'Somogy U19 II-III. Észak', 'mlsz-so', '67/15/33711', 52),
    ('hu-so-u19-2-del', 'Somogy vármegyei II-III. osztály U19 Dél', 'Somogy U19 II-III. Dél', 'mlsz-so', '67/15/34108', 53),
    ('hu-sz-u19-1', 'Szabolcs-Szatmár-Bereg vármegyei I. osztály U19', 'SZSZB U19 I.', 'mlsz-sz', '67/16/33810', 51),
    ('hu-sz-u19-2-1', 'Szabolcs-Szatmár-Bereg vármegyei II. osztály U19 1. csoport', 'SZSZB U19 II. 1.', 'mlsz-sz', '67/16/33812', 52),
    ('hu-sz-u19-2-2', 'Szabolcs-Szatmár-Bereg vármegyei II. osztály U19 2. csoport', 'SZSZB U19 II. 2.', 'mlsz-sz', '67/16/34158', 53),
    ('hu-to-u19', 'Tolna vármegyei U19', 'Tolna U19', 'mlsz-to', '67/17/33960', 51),
    ('hu-ve-u19', 'Veszprém vármegyei I. osztály U19', 'Veszprém U19', 'mlsz-ve', '67/19/34165', 51),
    ('hu-za-u19', 'Zala vármegyei U19', 'Zala U19', 'mlsz-za', '67/20/33922', 51)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HU'
on conflict (slug) do nothing;
