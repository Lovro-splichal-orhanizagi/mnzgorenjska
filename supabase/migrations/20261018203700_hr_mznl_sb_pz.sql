-- Hrvaška: MŽNL SB-PŽ (međužupanijska liga Brodsko-posavske in Požeško-
-- slavonske, peta raven, nad 1. ŽNL obeh županij) z vira HNS Semafor.
--
-- Prošnja uporabnikov. Skrivala jo je ista napaka kot MŽNL Vinkovci-Osijek
-- (#401): `IZPUSTI` v `scripts/hrvaske-lige.mjs` je izpuščal "mžnl".
-- Letos ligo objavlja ŽNS brodsko-posavski (oid 35, "MŽNL SB-PŽ 26/27"), lani
-- ŽNS požeško-slavonski (oid 314, "MŽNL PŽ-SB 25/26"), zato je skripta arhiva
-- po imenu znotraj zveze ne najde.
--
-- Pregled 18. 10. 2026 (`hns.mjs`, isti zapisnik kot ostale HR lige):
--   2026/27 `114477020`: 14 klubov, 63 od 91 tekem (jesenski del) z
--     zapisnikom, vseh 126 postav po 11, 229 golov = vsota izidov, oba
--     vratarja na vsaki tekmi.
--   2025/26 `100642980` (arhiv): 182 tekem, vse z zapisnikom, 363 od 364
--     postav po 11, 738 golov proti 734 po izidih (4 tekme z izidom za zeleno
--     mizo, 3:0 / 0:3, dogodki pa ostanejo z igrišča), oba vratarja povsod,
--     12 skupnih klubov.
--
-- Trkov imen ni: 10 od 16 klubov (tekoča + arhiv) že ima zapis v HR (2. ŽNL
-- Zapad NG, 1. ŽNL BPŽ, 1. ŽNL PŽ, Treća NL Istok, juniori BPŽ in 1. NL
-- juniori Istok) in pri vseh je šifra kluba na Semaforju ista.
--
-- Vpiše se NEAKTIVNA. Zvezo vodi ŽNS Brod (letošnji objavitelj).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hns', v.koda, 1, v.vrstni, 6, false,
       'HNS Semafor', 'https://semafor.hns.family/natjecanja/' || v.koda || '/x/'
  from countries d
  cross join (values
    ('hr-bp-mznl-sb-pz', 'MŽNL SB-PŽ', 'MŽNL SB-PŽ', '114477020', 8)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'zns-brod'
 where d.code = 'HR'
on conflict (slug) do nothing;

-- Želje iz "Moje lige ni" za to ligo poveži z njo, da obvestilo pride ob vklopu.
-- Ob pregledu take želje še ni ("2 Žnl Brodsko posavska" je II. ŽNL, ne MŽNL).
update zelje_lig z
   set competition_id = c.id
  from competitions c
 where c.slug = 'hr-bp-mznl-sb-pz'
   and z.competition_id is null
   and z.obvescen_at is null
   and z.drzava = 'HR'
   and lower(z.ime_lige) ~ 'm[žz]nl'
   and lower(z.ime_lige) ~ '(sb|brod)'
   and lower(z.ime_lige) ~ '(p[žz]|po[žz]eg)';
