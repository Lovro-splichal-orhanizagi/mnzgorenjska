-- Grčija, vir `mascot` (Mascotnet): nove skupine zvez na platformi, ki jo
-- SLFF že bere (pisno dovoljenje Mascotneta, oktober 2026; ne pokriva
-- tehnične zaščite — ob 401/403/429, izzivu ali CAPTCHI se uvoz ustavi).
--
-- Pregled 4. 11. 2026 (inventar, brez pisanja v bazo):
--   Ahaja Γ 1. in 2. skupina (9 + 9 klubov, ~3 krogi, zapisniki polni),
--   Pela Β 1. in 2. skupina (8 + 7 klubov, ~3 krogi, XI 11/11, klop, menjave),
--   Preveza-Lefkada Α (9 klubov, 2 kroga) in Β 1. skupina (11 klubov, 1 krog),
--   Thesprotia Α (6 klubov, 1 krog). Pri Prevezi in Thesprotii vzorčni
--   zapisnik ni bil prebran (ista predloga Mascotneta) — pred uvozom
--   `node scripts/mascot-lige.mjs <domena> --preveri`.
-- Ni vpisano: Preveza-Lefkada Β 2. skupina (nič odigranega, brez datumov).
--
-- Arhiva ni (stran lige kaže le tekočo sezono). Lige so NEAKTIVNE.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.ime, v.kratko, v.url, v.vrstni
  from countries d
  cross join (values
    ('eps-thes', 'Ένωση Ποδοσφαιρικών Σωματείων Θεσπρωτίας', 'ΕΠΣ Θεσπρωτίας', 'https://www.epsthesprotias.gr/', 1319),
    ('eps-pl', 'Ένωση Ποδοσφαιρικών Σωματείων Πρέβεζας-Λευκάδας', 'ΕΠΣ Πρέβεζας-Λευκάδας', 'https://www.epsprevezas-lefkadas.gr/', 1320)
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
    ('gr-ach-g-1', 'Γ Ερασιτεχνική, 1ος Όμιλος', 'Αχαΐα Γ (1)', 'epsachaias.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ', 'eps-ach', 132),
    ('gr-ach-g-2', 'Γ Ερασιτεχνική, 2ος Όμιλος', 'Αχαΐα Γ (2)', 'epsachaias.gr:Γ ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ', 'eps-ach', 133),
    ('gr-pel-b-1', 'Β Ερασιτεχνική, 1ος Όμιλος', 'Πέλλα Β (1)', 'epspellas.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ', 'eps-pel', 134),
    ('gr-pel-b-2', 'Β Ερασιτεχνική, 2ος Όμιλος', 'Πέλλα Β (2)', 'epspellas.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 2ος ΟΜΙΛΟΣ', 'eps-pel', 135),
    ('gr-pl-a', 'Α Ερασιτεχνική', 'Πρέβεζα-Λευκάδα Α', 'epsprevezas-lefkadas.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΠΡΩΤΑΘΛΗΜΑ)', 'eps-pl', 136),
    ('gr-pl-b-1', 'Β Ερασιτεχνική, 1ος Όμιλος', 'Πρέβεζα-Λευκάδα Β (1)', 'epsprevezas-lefkadas.gr:Β ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ (ΠΡΩΤΑΘΛΗΜΑ)', 'eps-pl', 137),
    ('gr-thes-a', 'Α Ερασιτεχνική', 'Θεσπρωτία Α', 'epsthesprotias.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ', 'eps-thes', 138)
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'GR'
on conflict (slug) do nothing;
