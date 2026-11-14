-- Madžarska, četrti val (lastnik odobril 4. 11. 2026): ženske (Női NB I/II),
-- dekleta (MLSZ Leány Országos/Regionális U15–U19), Tolna I-II.
-- Kvalifikáció (edina Tolnina najvišja članska liga 2026/27), nove skupine
-- Zala III. (od 25. 10. 2026), županijske U21 in mladinci U15–U17
-- (regionalni Alap in županijski). Vse 11 + 11 na velikem igrišču, celotna
-- sezona do pomladi.
--
-- Izpuščeni (docs/viri/madzarska.md, Četrti val): jesenske faze (Országos in
-- Regionális Kiemelt U15–U17, Pest U15–U17, Pest U21, Bács-Kiskun, Fejér in
-- Győr U15/U16, Győr II. U21, SZSZB leány U19) — pomladi dobijo nov verseny;
-- županijske ženske in dekliške lige (Csongrád 9 + 9, mala igrišča);
-- KEM leány U19 (4 klubi).
--
-- Šifre slugov nosijo starostni del (u15–u17, u19), da jih pravilo zaščite
-- mladoletnih (je_mladinski_slug, PR #668) prepozna; U21 in Női so odrasli.
-- Člani in Női: prvi_fantasy_krog = 1, rok_pomak_ur = 6; mladinci, dekleta in
-- U21 (spremljevalne lige, tekme pred člani): 2 in 2.
--
-- Arhivi 2025/26 (évad 65) še niso izbrani; nove skupine Zala III. arhiva
-- nimajo (pot brez arhiva potrebuje odobritev). Vse NEAKTIVNE; vklop po
-- uvozu arhiva, razporeda, zapisnikov in cen.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mlsz', v.koda, v.prvi, v.vrstni, v.rok, false,
       'MLSZ Adatbank', 'https://adatbank.mlsz.hu/league/' || v.koda || '/1.html'
  from countries d
  cross join (values
    ('hu-noi-nb1', 'Simple Női Liga NB I.', 'Női NB I.', 'mlsz', '67/0/33633', 21, 1, 6),
    ('hu-noi-nb2-kelet', 'Női NB II. Keleti csoport', 'Női NB II. Kelet', 'mlsz', '67/0/33634', 22, 1, 6),
    ('hu-noi-nb2-nyugat', 'Női NB II. Nyugati csoport', 'Női NB II. Nyugat', 'mlsz', '67/0/34124', 23, 1, 6),
    ('hu-leany-u19-orszagos', 'MLSZ Leány Országos U19', 'Leány U19 Országos', 'mlsz', '67/0/33636', 61, 2, 2),
    ('hu-leany-u19-reg-nyugat', 'MLSZ Leány Regionális U19 Nyugati csoport', 'Leány U19 Reg. Nyugat', 'mlsz', '67/0/33639', 62, 2, 2),
    ('hu-leany-u19-reg-kelet', 'MLSZ Leány Regionális U19 Keleti csoport', 'Leány U19 Reg. Kelet', 'mlsz', '67/0/34372', 63, 2, 2),
    ('hu-leany-u17-orszagos', 'MLSZ Leány Országos U17', 'Leány U17 Országos', 'mlsz', '67/0/33637', 64, 2, 2),
    ('hu-leany-u16-reg-nyugat', 'MLSZ Leány Regionális U16 Nyugati csoport', 'Leány U16 Reg. Nyugat', 'mlsz', '67/0/33640', 65, 2, 2),
    ('hu-leany-u16-reg-kozep', 'MLSZ Leány Regionális U16 Közép csoport', 'Leány U16 Reg. Közép', 'mlsz', '67/0/34378', 66, 2, 2),
    ('hu-leany-u16-reg-kelet', 'MLSZ Leány Regionális U16 Keleti csoport', 'Leány U16 Reg. Kelet', 'mlsz', '67/0/34379', 67, 2, 2),
    ('hu-leany-u15-orszagos', 'MLSZ Leány Országos U15', 'Leány U15 Országos', 'mlsz', '67/0/33638', 68, 2, 2),
    ('hu-to-1-2-kval', 'Tolna vármegyei I-II. osztály Kvalifikáció', 'Tolna I-II. Kvalifikáció', 'mlsz-to', '67/17/33955', 1, 1, 6),
    ('hu-za-3-ek-a', 'Zala vármegyei III. osztály Észak-Kelet A csoport', 'Zala III. Északkelet A', 'mlsz-za', '67/20/34859', 15, 1, 6),
    ('hu-za-3-ek-b', 'Zala vármegyei III. osztály Észak-Kelet B csoport', 'Zala III. Északkelet B', 'mlsz-za', '67/20/34860', 16, 1, 6),
    ('hu-za-3-kny-a', 'Zala vármegyei III. osztály Közép-Nyugat A csoport', 'Zala III. Középnyugat A', 'mlsz-za', '67/20/34861', 17, 1, 6),
    ('hu-za-3-kny-b', 'Zala vármegyei III. osztály Közép-Nyugat B csoport', 'Zala III. Középnyugat B', 'mlsz-za', '67/20/34862', 18, 1, 6),
    ('hu-gy-u21-1', 'Győr-Moson-Sopron vármegyei I. osztály U21', 'Győr U21 I.', 'mlsz-gy', '67/8/33889', 41, 2, 2),
    ('hu-hb-u21-1', 'Hajdú-Bihar vármegyei I. osztály U21', 'Hajdú-Bihar U21 I.', 'mlsz-hb', '67/9/33902', 41, 2, 2),
    ('hu-hb-u21-2-eszak', 'Hajdú-Bihar vármegyei II. osztály U21 Észak', 'Hajdú-Bihar U21 II. Észak', 'mlsz-hb', '67/9/34118', 42, 2, 2),
    ('hu-hb-u21-2-del', 'Hajdú-Bihar vármegyei II. osztály U21 Dél', 'Hajdú-Bihar U21 II. Dél', 'mlsz-hb', '67/9/34120', 43, 2, 2),
    ('hu-he-u21-1', 'Heves vármegyei I. osztály U21', 'Heves U21 I.', 'mlsz-he', '67/10/33866', 41, 2, 2),
    ('hu-he-u21-2', 'Heves vármegyei II. osztály U21', 'Heves U21 II.', 'mlsz-he', '67/10/33867', 42, 2, 2),
    ('hu-no-u21', 'Nógrád vármegyei U21', 'Nógrád U21', 'mlsz-no', '67/13/33946', 41, 2, 2),
    ('hu-va-u21-1', 'Vas vármegyei I. osztály U21', 'Vas U21 I.', 'mlsz-va', '67/18/33768', 41, 2, 2),
    ('hu-va-u21-2-szombathely', 'Vas vármegyei II. osztály U21 Szombathely', 'Vas U21 II. Szombathely', 'mlsz-va', '67/18/34048', 42, 2, 2),
    ('hu-va-u21-2-kormend', 'Vas vármegyei II. osztály U21 Körmend', 'Vas U21 II. Körmend', 'mlsz-va', '67/18/34044', 43, 2, 2),
    ('hu-va-u21-2-sarvar', 'Vas vármegyei II. osztály U21 Sárvár', 'Vas U21 II. Sárvár', 'mlsz-va', '67/18/34045', 44, 2, 2),
    ('hu-ve-u21-2', 'Veszprém vármegyei II. osztály U21', 'Veszprém U21 II.', 'mlsz-ve', '67/19/33720', 41, 2, 2),
    ('hu-za-u21', 'Zala vármegyei U21', 'Zala U21', 'mlsz-za', '67/20/33921', 41, 2, 2),
    ('hu-u17-reg-alap-eszaknyugat', 'MLSZ Regionális U17 Alap Északnyugati csoport', 'U17 Reg. Alap Északnyugat', 'mlsz', '67/20/34347', 71, 2, 2),
    ('hu-u17-reg-alap-kozepnyugat', 'MLSZ Regionális U17 Alap Középnyugati csoport', 'U17 Reg. Alap Középnyugat', 'mlsz', '67/7/34364', 72, 2, 2),
    ('hu-u17-reg-alap-delnyugat', 'MLSZ Regionális U17 Alap Délnyugati csoport', 'U17 Reg. Alap Délnyugat', 'mlsz', '67/2/34376', 73, 2, 2),
    ('hu-u17-reg-alap-kozepkelet', 'MLSZ Regionális U17 Alap Középkeleti csoport', 'U17 Reg. Alap Középkelet', 'mlsz', '67/13/34395', 74, 2, 2),
    ('hu-u17-reg-alap-kelet', 'MLSZ Regionális U17 Alap Keleti csoport', 'U17 Reg. Alap Kelet', 'mlsz', '67/9/34311', 75, 2, 2),
    ('hu-u17-reg-alap-delkelet', 'MLSZ Regionális U17 Alap Délkeleti csoport', 'U17 Reg. Alap Délkelet', 'mlsz', '67/1/34487', 76, 2, 2),
    ('hu-be-u17-eszak', 'Békés vármegyei U17 Észak', 'Békés U17 Észak', 'mlsz-be', '67/3/34516', 71, 2, 2),
    ('hu-be-u17-del', 'Békés vármegyei U17 Dél', 'Békés U17 Dél', 'mlsz-be', '67/3/34517', 72, 2, 2),
    ('hu-bp-u17', 'BLSZ Ifjúsági U17', 'BLSZ U17', 'mlsz-bp', '67/5/33818', 71, 2, 2),
    ('hu-no-u17', 'Nógrád vármegyei U17', 'Nógrád U17', 'mlsz-no', '67/13/33947', 71, 2, 2),
    ('hu-to-u17', 'Tolna vármegyei U17', 'Tolna U17', 'mlsz-to', '67/17/33961', 71, 2, 2),
    ('hu-u16-reg-alap-eszaknyugat', 'MLSZ Regionális U16 Alap Északnyugati csoport', 'U16 Reg. Alap Északnyugat', 'mlsz', '67/20/34349', 81, 2, 2),
    ('hu-u16-reg-alap-delnyugat', 'MLSZ Regionális U16 Alap Délnyugati csoport', 'U16 Reg. Alap Délnyugat', 'mlsz', '67/15/34429', 82, 2, 2),
    ('hu-u16-reg-alap-eszakkelet', 'MLSZ Regionális U16 Alap Északkeleti csoport', 'U16 Reg. Alap Északkelet', 'mlsz', '67/4/34332', 83, 2, 2),
    ('hu-u16-reg-alap-kelet', 'MLSZ Regionális U16 Alap Keleti csoport', 'U16 Reg. Alap Kelet', 'mlsz', '67/9/34312', 84, 2, 2),
    ('hu-u16-reg-alap-delkelet', 'MLSZ Regionális U16 Alap Délkeleti csoport', 'U16 Reg. Alap Délkelet', 'mlsz', '67/6/34351', 85, 2, 2),
    ('hu-ba-u16', 'Baranya vármegyei I. osztály U16', 'Baranya U16', 'mlsz-ba', '67/2/33846', 81, 2, 2),
    ('hu-baz-u16-eszak', 'Borsod-Abaúj-Zemplén vármegyei U16 Észak', 'BAZ U16 Észak', 'mlsz-baz', '67/4/33601', 81, 2, 2),
    ('hu-baz-u16-kelet', 'Borsod-Abaúj-Zemplén vármegyei U16 Kelet', 'BAZ U16 Kelet', 'mlsz-baz', '67/4/34059', 82, 2, 2),
    ('hu-baz-u16-kozep', 'Borsod-Abaúj-Zemplén vármegyei U16 Közép', 'BAZ U16 Közép', 'mlsz-baz', '67/4/34060', 83, 2, 2),
    ('hu-bp-u16', 'BLSZ Ifjúsági U16', 'BLSZ U16', 'mlsz-bp', '67/5/33819', 81, 2, 2),
    ('hu-cs-u16-szalai', 'Csongrád-Csanád vármegyei U16 Szalai Dzsinó csoport', 'Csongrád U16 Szalai Dzsinó', 'mlsz-cs', '67/6/33881', 81, 2, 2),
    ('hu-cs-u16-toth', 'Csongrád-Csanád vármegyei U16 Tóth Pipu csoport', 'Csongrád U16 Tóth Pipu', 'mlsz-cs', '67/6/34131', 82, 2, 2),
    ('hu-hb-u16-a', 'Hajdú-Bihar vármegyei U16 A csoport', 'Hajdú-Bihar U16 A', 'mlsz-hb', '67/9/34150', 81, 2, 2),
    ('hu-hb-u16-b', 'Hajdú-Bihar vármegyei U16 B csoport', 'Hajdú-Bihar U16 B', 'mlsz-hb', '67/9/34152', 82, 2, 2),
    ('hu-he-u16-kelet', 'Heves vármegyei U16 Kelet', 'Heves U16 Kelet', 'mlsz-he', '67/10/33871', 81, 2, 2),
    ('hu-he-u16-nyugat', 'Heves vármegyei U16 Nyugat', 'Heves U16 Nyugat', 'mlsz-he', '67/10/34159', 82, 2, 2),
    ('hu-jn-u16', 'Jász-Nagykun-Szolnok vármegyei Területi U16', 'JNSZ U16 Területi', 'mlsz-jn', '67/11/33745', 81, 2, 2),
    ('hu-ke-u16-del', 'Komárom-Esztergom vármegyei U16 Dél', 'KEM U16 Dél', 'mlsz-ke', '67/12/33798', 81, 2, 2),
    ('hu-ke-u16-eszak', 'Komárom-Esztergom vármegyei U16 Észak', 'KEM U16 Észak', 'mlsz-ke', '67/12/33799', 82, 2, 2),
    ('hu-no-u16', 'Nógrád vármegyei U16', 'Nógrád U16', 'mlsz-no', '67/13/34584', 81, 2, 2),
    ('hu-so-u16-eszak', 'Somogy vármegyei U16 Észak', 'Somogy U16 Észak', 'mlsz-so', '67/15/33712', 81, 2, 2),
    ('hu-so-u16-del', 'Somogy vármegyei U16 Dél', 'Somogy U16 Dél', 'mlsz-so', '67/15/34110', 82, 2, 2),
    ('hu-sz-u16-eszak', 'Szabolcs-Szatmár-Bereg vármegyei U16 Észak', 'SZSZB U16 Észak', 'mlsz-sz', '67/16/33815', 81, 2, 2),
    ('hu-sz-u16-del', 'Szabolcs-Szatmár-Bereg vármegyei U16 Dél', 'SZSZB U16 Dél', 'mlsz-sz', '67/16/34236', 82, 2, 2),
    ('hu-to-u16', 'Tolna vármegyei U16', 'Tolna U16', 'mlsz-to', '67/17/33962', 81, 2, 2),
    ('hu-va-u16-eszak', 'Vas vármegyei U16 Észak', 'Vas U16 Észak', 'mlsz-va', '67/18/33779', 81, 2, 2),
    ('hu-va-u16-del', 'Vas vármegyei U16 Dél', 'Vas U16 Dél', 'mlsz-va', '67/18/34333', 82, 2, 2),
    ('hu-ve-u16-a', 'Veszprém vármegyei U16 A csoport', 'Veszprém U16 A', 'mlsz-ve', '67/19/34500', 81, 2, 2),
    ('hu-ve-u16-b', 'Veszprém vármegyei U16 B csoport', 'Veszprém U16 B', 'mlsz-ve', '67/19/34501', 82, 2, 2),
    ('hu-ve-u16-c', 'Veszprém vármegyei U16 C csoport', 'Veszprém U16 C', 'mlsz-ve', '67/19/34502', 83, 2, 2),
    ('hu-za-u16-eszak', 'Zala vármegyei U16 Északi csoport', 'Zala U16 Észak', 'mlsz-za', '67/20/33923', 81, 2, 2),
    ('hu-za-u16-del', 'Zala vármegyei U16 Déli csoport', 'Zala U16 Dél', 'mlsz-za', '67/20/34524', 82, 2, 2),
    ('hu-u15-reg-alap-eszaknyugat', 'MLSZ Regionális U15 Alap Északnyugati csoport', 'U15 Reg. Alap Északnyugat', 'mlsz', '67/19/34407', 91, 2, 2),
    ('hu-u15-reg-alap-kozepnyugat', 'MLSZ Regionális U15 Alap Középnyugati csoport', 'U15 Reg. Alap Középnyugat', 'mlsz', '67/5/34490', 92, 2, 2),
    ('hu-u15-reg-alap-delnyugat', 'MLSZ Regionális U15 Alap Délnyugati csoport', 'U15 Reg. Alap Délnyugat', 'mlsz', '67/15/34353', 93, 2, 2),
    ('hu-u15-reg-alap-kozepkelet', 'MLSZ Regionális U15 Alap Középkeleti csoport', 'U15 Reg. Alap Középkelet', 'mlsz', '67/14/34301', 94, 2, 2),
    ('hu-u15-reg-alap-eszakkelet', 'MLSZ Regionális U15 Alap Északkeleti csoport', 'U15 Reg. Alap Északkelet', 'mlsz', '67/10/34366', 95, 2, 2),
    ('hu-u15-reg-alap-kelet', 'MLSZ Regionális U15 Alap Keleti csoport', 'U15 Reg. Alap Kelet', 'mlsz', '67/16/34404', 96, 2, 2),
    ('hu-u15-reg-alap-delkelet', 'MLSZ Regionális U15 Alap Délkeleti csoport', 'U15 Reg. Alap Délkelet', 'mlsz', '67/1/34491', 97, 2, 2),
    ('hu-be-u15-eszak', 'Békés vármegyei U15 Észak', 'Békés U15 Észak', 'mlsz-be', '67/3/34531', 91, 2, 2),
    ('hu-be-u15-kozep', 'Békés vármegyei U15 Közép', 'Békés U15 Közép', 'mlsz-be', '67/3/34532', 92, 2, 2),
    ('hu-be-u15-del', 'Békés vármegyei U15 Dél', 'Békés U15 Dél', 'mlsz-be', '67/3/34533', 93, 2, 2),
    ('hu-bp-u15-1', 'BLSZ Serdülő U15 1. csoport', 'BLSZ U15 1.', 'mlsz-bp', '67/5/33821', 91, 2, 2),
    ('hu-bp-u15-2', 'BLSZ Serdülő U15 2. csoport', 'BLSZ U15 2.', 'mlsz-bp', '67/5/34373', 92, 2, 2),
    ('hu-hb-u15', 'Hajdú-Bihar vármegyei U15', 'Hajdú-Bihar U15', 'mlsz-hb', '67/9/34206', 91, 2, 2),
    ('hu-no-u15', 'Nógrád vármegyei U15', 'Nógrád U15', 'mlsz-no', '67/13/33949', 91, 2, 2)
  ) as v(slug, ime, kratko, zveza, koda, vrstni, prvi, rok)
  join federations f on f.code = v.zveza
 where d.code = 'HU'
on conflict (slug) do nothing;
