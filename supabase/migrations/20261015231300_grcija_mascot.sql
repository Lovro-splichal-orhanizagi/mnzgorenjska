-- Grčija: lige regionalnih zvez EPS, ki jih gosti Mascot Network Hellas
-- (mascotnet.com; ista ASP koda na domeni vsake zveze), z vira `mascot`.
-- Šifra lige je `<domena>:<diorganosi>` — parameter `diorganosi` natanko kot
-- v meniju domene (glej CLAUDE.md, Grčija — vir mascot).
--
-- Pisno dovoljenje za zajem: pridobil Lovro, oktober 2026. Dovoljenje ne
-- pokriva tehnične zaščite: ob 401/403/429, izzivu ali CAPTCHI se uvoz ustavi.
--
-- Vpisane so le lige, ki imajo 2026/27 že odigrane tekme in katerih zapisniki
-- (postave 11 + 11, menjave z minuto, goli) so se v preizkusu 15. 10. 2026
-- razčlenili. NI vpisano: Thesprotia (epsthesprotias.gr) in Preveza-Lefkada
-- (epsprevezas-lefkadas.gr) — nič odigranega, Β skupini Preveze brez
-- razporeda; Ahaja Γ1/Γ2, Pela Β1/Β2 in Imatija Γ — nič odigranega.
--
-- Arhiva ni (stran lige kaže le tekočo sezono), cene so le iz tekoče sezone.
-- Država GR je lahko že vpisana z migracijo vira `eps` (on conflict).
-- Vmesnika v grščini še ni, GR ni v matriki nočnega uvoza; lige so NEAKTIVNE.

insert into countries (code, name, sort_order) values ('GR', 'Ελλάδα', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.ime, v.kratko, v.url, v.vrstni
  from countries d
  cross join (values
    ('eps-mak', 'Ένωση Ποδοσφαιρικών Σωματείων Μακεδονίας', 'ΕΠΣ Μακεδονίας', 'https://www.epsm.gr/', 1311),
    ('eps-ach', 'Ένωση Ποδοσφαιρικών Σωματείων Αχαΐας', 'ΕΠΣ Αχαΐας', 'https://www.epsachaias.gr/', 1312),
    ('eps-pel', 'Ένωση Ποδοσφαιρικών Σωματείων Πέλλας', 'ΕΠΣ Πέλλας', 'https://www.epspellas.gr/', 1313),
    ('eps-dra', 'Ένωση Ποδοσφαιρικών Σωματείων Δράμας', 'ΕΠΣ Δράμας', 'https://www.epsdramas.gr/', 1314),
    ('eps-koz', 'Ένωση Ποδοσφαιρικών Σωματείων Κοζάνης', 'ΕΠΣ Κοζάνης', 'https://www.epskozanis.gr/', 1315),
    ('eps-ker', 'Ένωση Ποδοσφαιρικών Σωματείων Κέρκυρας', 'ΕΠΣ Κέρκυρας', 'https://www.epskerkyras.gr/', 1316),
    ('eps-les', 'Ένωση Ποδοσφαιρικών Σωματείων Λέσβου', 'ΕΠΣ Λέσβου', 'https://www.epsl.gr/', 1317),
    ('eps-ima', 'Ένωση Ποδοσφαιρικών Σωματείων Ημαθίας', 'ΕΠΣ Ημαθίας', 'https://www.eps-imathias.gr/', 1318)
  ) as v(code, ime, kratko, url, vrstni)
 where d.code = 'GR'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mascot', v.koda, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('gr-mak-a1', 'Α1 Ερασιτεχνική', 'Μακεδονία Α1', 'epsm.gr:Α1 ΕΡΑΣΙΤΕΧΝΙΚΗ', 'eps-mak', 101),
    ('gr-mak-a-1', 'Α Ερασιτεχνική, 1ος Όμιλος', 'Μακεδονία Α (1)', 'epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ', 'eps-mak', 102),
    ('gr-mak-a-2', 'Α Ερασιτεχνική, 2ος Όμιλος', 'Μακεδονία Α (2)', 'epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ', 'eps-mak', 103),
    ('gr-mak-a-3', 'Α Ερασιτεχνική, 3ος Όμιλος', 'Μακεδονία Α (3)', 'epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 3ος ΟΜΙΛΟΣ', 'eps-mak', 104),
    ('gr-mak-b-1', 'Β Ερασιτεχνική, 1ος Όμιλος', 'Μακεδονία Β (1)', 'epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ', 'eps-mak', 105),
    ('gr-mak-b-2', 'Β Ερασιτεχνική, 2ος Όμιλος', 'Μακεδονία Β (2)', 'epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ', 'eps-mak', 106),
    ('gr-mak-b-3', 'Β Ερασιτεχνική, 3ος Όμιλος', 'Μακεδονία Β (3)', 'epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 3ος ΟΜΙΛΟΣ', 'eps-mak', 107),
    ('gr-mak-b-4', 'Β Ερασιτεχνική, 4ος Όμιλος', 'Μακεδονία Β (4)', 'epsm.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 4ος ΟΜΙΛΟΣ', 'eps-mak', 108),
    ('gr-mak-g-1', 'Γ Ερασιτεχνική, 1ος Όμιλος', 'Μακεδονία Γ (1)', 'epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ', 'eps-mak', 109),
    ('gr-mak-g-2', 'Γ Ερασιτεχνική, 2ος Όμιλος', 'Μακεδονία Γ (2)', 'epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ', 'eps-mak', 110),
    ('gr-mak-g-3', 'Γ Ερασιτεχνική, 3ος Όμιλος', 'Μακεδονία Γ (3)', 'epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 3ος ΟΜΙΛΟΣ', 'eps-mak', 111),
    ('gr-mak-g-4', 'Γ Ερασιτεχνική, 4ος Όμιλος', 'Μακεδονία Γ (4)', 'epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 4ος ΟΜΙΛΟΣ', 'eps-mak', 112),
    ('gr-mak-g-5', 'Γ Ερασιτεχνική, 5ος Όμιλος', 'Μακεδονία Γ (5)', 'epsm.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 5ος ΟΜΙΛΟΣ', 'eps-mak', 113),
    ('gr-ach-a-1', 'Α Ερασιτεχνική, 1ος Όμιλος', 'Αχαΐα Α (1)', 'epsachaias.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ', 'eps-ach', 114),
    ('gr-ach-a-2', 'Α Ερασιτεχνική, 2ος Όμιλος', 'Αχαΐα Α (2)', 'epsachaias.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ', 'eps-ach', 115),
    ('gr-ach-b-1', 'Β Ερασιτεχνική, 1ος Όμιλος', 'Αχαΐα Β (1)', 'epsachaias.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ', 'eps-ach', 116),
    ('gr-ach-b-2', 'Β Ερασιτεχνική, 2ος Όμιλος', 'Αχαΐα Β (2)', 'epsachaias.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ', 'eps-ach', 117),
    ('gr-pel-a1', 'Α1 Ερασιτεχνική', 'Πέλλα Α1', 'epspellas.gr:Α1 ΕΡΑΣΙΤΕΧΝΙΚΗ', 'eps-pel', 118),
    ('gr-pel-a', 'Α Ερασιτεχνική', 'Πέλλα Α', 'epspellas.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ', 'eps-pel', 119),
    ('gr-dra-a', 'Α Ερασιτεχνική', 'Δράμα Α', 'epsdramas.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΠΡΩΤΑΘΛΗΜΑ)', 'eps-dra', 120),
    ('gr-dra-b-a', 'Β Ερασιτεχνική, Α Όμιλος', 'Δράμα Β (Α)', 'epsdramas.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - Α ΟΜΙΛΟΣ (ΠΡΩΤΑΘΛΗΜΑ)', 'eps-dra', 121),
    ('gr-dra-b-b', 'Β Ερασιτεχνική, Β Όμιλος', 'Δράμα Β (Β)', 'epsdramas.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - Β ΟΜΙΛΟΣ (ΠΡΩΤΑΘΛΗΜΑ)', 'eps-dra', 122),
    ('gr-koz-a', 'Α Ερασιτεχνική', 'Κοζάνη Α', 'epskozanis.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΠΡΩΤΑΘΛΗΜΑ)', 'eps-koz', 123),
    ('gr-koz-b', 'Β Ερασιτεχνική', 'Κοζάνη Β', 'epskozanis.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ (ΠΡΩΤΑΘΛΗΜΑ)', 'eps-koz', 124),
    ('gr-ker-a', 'Α Ερασιτεχνική', 'Κέρκυρα Α', 'epskerkyras.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ', 'eps-ker', 125),
    ('gr-ker-b', 'Β Ερασιτεχνική', 'Κέρκυρα Β', 'epskerkyras.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ', 'eps-ker', 126),
    ('gr-les-a-lesvos', 'Α Ερασιτεχνική, Όμιλος Λέσβου', 'Λέσβος Α', 'epsl.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΟΜΙΛΟΣ ΛΕΣΒΟΥ)', 'eps-les', 127),
    ('gr-les-a-limnos', 'Α Ερασιτεχνική, Όμιλος Λήμνου', 'Λήμνος Α', 'epsl.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΟΜΙΛΟΣ ΛΗΜΝΟΥ)', 'eps-les', 128),
    ('gr-les-b', 'Β Ερασιτεχνική Λέσβου', 'Λέσβος Β', 'epsl.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ ΛΕΣΒΟΥ', 'eps-les', 129),
    ('gr-ima-a', 'Α Ερασιτεχνική', 'Ημαθία Α', 'eps-imathias.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ ΚΑΤΗΓΟΡΙΑ ΚΑΝΟΝΙΚΗ ΠΕΡΙΟΔΟΣ', 'eps-ima', 130),
    ('gr-ima-b', 'Β Ερασιτεχνική', 'Ημαθία Β', 'eps-imathias.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ ΚΑΤΗΓΟΡΙΑ ΚΑΝΟΝΙΚΗ ΠΕΡΙΟΔΟΣ', 'eps-ima', 131)
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'GR'
on conflict (slug) do nothing;
