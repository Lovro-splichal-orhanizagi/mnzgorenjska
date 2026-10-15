-- Grčija: država GR, devet regionalnih zvez EPS in njihove lige z vira `eps`
-- (skupna platforma results.php, ena domena na zvezo). Šifra lige je
-- `<domena>:<league_id>` sezone 2026/27 (glej CLAUDE.md, Grčija — vir eps).
--
-- Vpisane so le lige, ki imajo 2026/27 že odigrane tekme in katerih zapisniki
-- (postave 11 + 11, menjave z minuto, goli) so se v preizkusu 15. 10. 2026
-- razčlenili. NI vpisano: Halkidika, Kikladi, Hios (izidi brez postav),
-- Ftiotida (postave brez menjav), Lakonija in Kilkis/Mesenija (sezona se še
-- ni začela oziroma je ni na strani) ter skupine vpisanih zvez brez odigrane
-- tekme (Argolida Α2, Arkadija Β, Zahodna Atika Β, Dodekanez Β in Γ).
--
-- Arhiv 2025/26 (izbran po skupnih klubih; Pirej je skupine preuredil):
--   gr-peir-a-1  epspeir.gr:605  (6 skupnih)   gr-peir-a-2  epspeir.gr:606  (5)
--   gr-peir-b-1  epspeir.gr:607  (5)           gr-peir-b-2  epspeir.gr:608  (4)
--   gr-peir-g-1  epspeir.gr:610  (4)           gr-peir-g-2  epspeir.gr:609  (4)
--   gr-ana-a     epsana.gr:689                 gr-ana-b     epsana.gr:690
--   gr-ana-g     epsana.gr:691                 gr-da-a      epsda.gr:244
--   gr-ip-a      epsip.gr:300                  gr-ip-b      epsip.gr:301
--   gr-ip-g-a    epsip.gr:303    (6)           gr-ip-g-b    epsip.gr:304    (6)
--   gr-dod-a     epsdod.gr:443                 gr-arg-a1    epsarg.gr:1020
--   gr-ark-a     epsarkadias.gr:205
--   Atene (Αθηνών, epsath.gr) in Evbeja (Εύβοιας, epsevias.gr): robots.txt
--   prepove /results/, beremo ju s PISNIM DOVOLJENJEM upravljavca (pridobil
--   Lovro, oktober 2026). Atene so skupine 2026/27 preuredile — arhiv šibek:
--   gr-ath-a-1   epsath.gr:1410  (5)           gr-ath-a-2   epsath.gr:1411  (6)
--   gr-ath-b-1   epsath.gr:1413  (3)           gr-ath-b-2   epsath.gr:1412  (4)
--   gr-ath-b-3   epsath.gr:1414  (4)           gr-ath-g-1   epsath.gr:1436  (4)
--   gr-ath-g-2   epsath.gr:1435  (3)           gr-ath-g-3   epsath.gr:1437  (3)
--   gr-ath-g-4   epsath.gr:1434  (3)
--   gr-ev-a      epsevias.gr:224 (12)          gr-ev-b-1    epsevias.gr:218 (7)
--   gr-ev-b-2    epsevias.gr:219 (9)           gr-ev-g-1    epsevias.gr:220 (7)
--   gr-ev-g-2    epsevias.gr:221 (7)           gr-ev-g-3    epsevias.gr:222 (6)
--   Evbeja Γ 4. skupina (epsevias.gr:278) NI vpisana: en sam poln zapisnik
--   brez menjav — vpiši, ko se menjave pokažejo.
-- Play-off, play-out in razvrstilne tekme so svoja tekmovanja — za arhiv jih
-- ne uvažaj. Vsak arhiv preštej pred uvozom (tekem, golov, postav po 11).
--
-- Vmesnika v grščini še ni, GR ni v matriki nočnega uvoza; lige so NEAKTIVNE.

insert into countries (code, name, sort_order) values ('GR', 'Ελλάδα', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.ime, v.kratko, v.url, v.vrstni
  from countries d
  cross join (values
    ('eps-peir', 'Ένωση Ποδοσφαιρικών Σωματείων Πειραιά', 'ΕΠΣ Πειραιά', 'https://www.epspeir.gr/', 1301),
    ('eps-ana', 'Ένωση Ποδοσφαιρικών Σωματείων Ανατολικής Αττικής', 'ΕΠΣ Ανατολικής Αττικής', 'https://www.epsana.gr/', 1302),
    ('eps-da', 'Ένωση Ποδοσφαιρικών Σωματείων Δυτικής Αττικής', 'ΕΠΣ Δυτικής Αττικής', 'https://www.epsda.gr/', 1303),
    ('eps-ip', 'Ένωση Ποδοσφαιρικών Σωματείων Ηπείρου', 'ΕΠΣ Ηπείρου', 'https://www.epsip.gr/', 1304),
    ('eps-dod', 'Ένωση Ποδοσφαιρικών Σωματείων Δωδεκανήσου', 'ΕΠΣ Δωδεκανήσου', 'https://www.epsdod.gr/', 1305),
    ('eps-arg', 'Ένωση Ποδοσφαιρικών Σωματείων Αργολίδας', 'ΕΠΣ Αργολίδας', 'https://www.epsarg.gr/', 1306),
    ('eps-ark', 'Ένωση Ποδοσφαιρικών Σωματείων Αρκαδίας', 'ΕΠΣ Αρκαδίας', 'https://www.epsarkadias.gr/', 1307),
    ('eps-ath', 'Ένωση Ποδοσφαιρικών Σωματείων Αθηνών', 'ΕΠΣ Αθηνών', 'https://www.epsath.gr/', 1308),
    ('eps-ev', 'Ένωση Ποδοσφαιρικών Σωματείων Εύβοιας', 'ΕΠΣ Εύβοιας', 'https://www.epsevias.gr/', 1309)
  ) as v(code, ime, kratko, url, vrstni)
 where d.code = 'GR'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'eps', v.koda, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('gr-peir-a-1', 'Α Κατηγορία, 1ος Όμιλος', 'Πειραιάς Α1', 'epspeir.gr:726', 'eps-peir', 1),
    ('gr-peir-a-2', 'Α Κατηγορία, 2ος Όμιλος', 'Πειραιάς Α2', 'epspeir.gr:727', 'eps-peir', 2),
    ('gr-peir-b-1', 'Β Κατηγορία, 1ος Όμιλος', 'Πειραιάς Β1', 'epspeir.gr:738', 'eps-peir', 3),
    ('gr-peir-b-2', 'Β Κατηγορία, 2ος Όμιλος', 'Πειραιάς Β2', 'epspeir.gr:729', 'eps-peir', 4),
    ('gr-peir-g-1', 'Γ Κατηγορία, 1ος Όμιλος', 'Πειραιάς Γ1', 'epspeir.gr:735', 'eps-peir', 5),
    ('gr-peir-g-2', 'Γ Κατηγορία, 2ος Όμιλος', 'Πειραιάς Γ2', 'epspeir.gr:736', 'eps-peir', 6),
    ('gr-ana-a', 'Α Κατηγορία', 'Αν. Αττική Α', 'epsana.gr:747', 'eps-ana', 7),
    ('gr-ana-b', 'Β Κατηγορία', 'Αν. Αττική Β', 'epsana.gr:749', 'eps-ana', 8),
    ('gr-ana-g', 'Γ Κατηγορία', 'Αν. Αττική Γ', 'epsana.gr:748', 'eps-ana', 9),
    ('gr-da-a', 'Α Κατηγορία', 'Δυτ. Αττική Α', 'epsda.gr:278', 'eps-da', 10),
    ('gr-ip-a', 'Α Κατηγορία', 'Ήπειρος Α', 'epsip.gr:328', 'eps-ip', 11),
    ('gr-ip-b', 'Β Κατηγορία', 'Ήπειρος Β', 'epsip.gr:329', 'eps-ip', 12),
    ('gr-ip-g-a', 'Γ Κατηγορία, Α Όμιλος', 'Ήπειρος Γ-Α', 'epsip.gr:331', 'eps-ip', 13),
    ('gr-ip-g-b', 'Γ Κατηγορία, Β Όμιλος', 'Ήπειρος Γ-Β', 'epsip.gr:332', 'eps-ip', 14),
    ('gr-dod-a', 'Α Κατηγορία', 'Δωδεκάνησα Α', 'epsdod.gr:495', 'eps-dod', 15),
    ('gr-arg-a1', 'Α1 Κατηγορία', 'Αργολίδα Α1', 'epsarg.gr:1042', 'eps-arg', 16),
    ('gr-ark-a', 'Α Κατηγορία', 'Αρκαδία Α', 'epsarkadias.gr:222', 'eps-ark', 17),
    ('gr-ath-a-1', 'Α Κατηγορία, 1ος Όμιλος', 'Αθήνα Α1', 'epsath.gr:1534', 'eps-ath', 18),
    ('gr-ath-a-2', 'Α Κατηγορία, 2ος Όμιλος', 'Αθήνα Α2', 'epsath.gr:1535', 'eps-ath', 19),
    ('gr-ath-b-1', 'Β Κατηγορία, 1ος Όμιλος', 'Αθήνα Β1', 'epsath.gr:1537', 'eps-ath', 20),
    ('gr-ath-b-2', 'Β Κατηγορία, 2ος Όμιλος', 'Αθήνα Β2', 'epsath.gr:1538', 'eps-ath', 21),
    ('gr-ath-b-3', 'Β Κατηγορία, 3ος Όμιλος', 'Αθήνα Β3', 'epsath.gr:1539', 'eps-ath', 22),
    ('gr-ath-g-1', 'Γ Κατηγορία, 1ος Όμιλος', 'Αθήνα Γ1', 'epsath.gr:1541', 'eps-ath', 23),
    ('gr-ath-g-2', 'Γ Κατηγορία, 2ος Όμιλος', 'Αθήνα Γ2', 'epsath.gr:1542', 'eps-ath', 24),
    ('gr-ath-g-3', 'Γ Κατηγορία, 3ος Όμιλος', 'Αθήνα Γ3', 'epsath.gr:1543', 'eps-ath', 25),
    ('gr-ath-g-4', 'Γ Κατηγορία, 4ος Όμιλος', 'Αθήνα Γ4', 'epsath.gr:1544', 'eps-ath', 26),
    ('gr-ev-a', 'Α Κατηγορία', 'Εύβοια Α', 'epsevias.gr:272', 'eps-ev', 27),
    ('gr-ev-b-1', 'Β Κατηγορία, 1ος Όμιλος (Βόρειος)', 'Εύβοια Β1', 'epsevias.gr:273', 'eps-ev', 28),
    ('gr-ev-b-2', 'Β Κατηγορία, 2ος Όμιλος (Νότιος)', 'Εύβοια Β2', 'epsevias.gr:279', 'eps-ev', 29),
    ('gr-ev-g-1', 'Γ Κατηγορία, 1ος Όμιλος (Βόρειος)', 'Εύβοια Γ1', 'epsevias.gr:275', 'eps-ev', 30),
    ('gr-ev-g-2', 'Γ Κατηγορία, 2ος Όμιλος (Κεντρικός 1)', 'Εύβοια Γ2', 'epsevias.gr:276', 'eps-ev', 31),
    ('gr-ev-g-3', 'Γ Κατηγορία, 3ος Όμιλος (Κεντρικός 2)', 'Εύβοια Γ3', 'epsevias.gr:277', 'eps-ev', 32)
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'GR'
on conflict (slug) do nothing;
