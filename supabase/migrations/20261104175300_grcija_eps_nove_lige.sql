-- Grčija, vir `eps`: nove skupine zvez, ki jih SLFF že bere (Argolida,
-- Arkadija, Zahodna Atika, Dodekanez, Vzhodna Atika; Evbeja s pisnim
-- dovoljenjem upravljavca, oktober 2026). Zveze brez dosedanjih lig v bazi
-- (Lakonija, Hios, Ftiotida …) tu NISO vpisane — zanje mora prej odločiti
-- lastnik.
--
-- Pregled 4. 11. 2026 (inventar, brez pisanja v bazo):
--   Argolida Α2 1. in 2. skupina (11 + 10 klubov, 2 kroga, postave 11 + klop),
--   Arkadija Β (9 klubov, 3 krogi), Zahodna Atika Β (11 klubov, 3 krogi),
--   Dodekanez Β 1., 2. (12 + 12, 1 krog) in 3. skupina (8 klubov, 1. krog
--   7. 11. 2026), Evbeja Γ 4. skupina (9 klubov, 4 krogi; menjave so zdaj
--   vpisane), Vzhodna Atika Κ17 Α in Β (12 + 13 klubov, 4 krogi; najstarejši
--   zapisnik poln, zadnji še prazni — zveza jih vpiše pozneje).
-- Ni vpisano: Dodekanez Γ 1. in 2. skupina (en sam zapisnik, prazen / nič
-- odigranega), Evbeja Κ16 (prva faza se končuje).
--
-- Arhiva za nove skupine ni treba (uvoz brez `arhiv`, s `cene`). Mladinski
-- ligi imata v šifri `u17` (varovalo mladih). Lige so NEAKTIVNE.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'eps', v.koda, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('gr-arg-a2-1', 'Α2 Κατηγορία, 1ος Όμιλος', 'Αργολίδα Α2 (1)', 'epsarg.gr:1043', 'eps-arg', 33),
    ('gr-arg-a2-2', 'Α2 Κατηγορία, 2ος Όμιλος', 'Αργολίδα Α2 (2)', 'epsarg.gr:1044', 'eps-arg', 34),
    ('gr-ark-b', 'Β Κατηγορία', 'Αρκαδία Β', 'epsarkadias.gr:223', 'eps-ark', 35),
    ('gr-da-b', 'Β Κατηγορία', 'Δυτ. Αττική Β', 'epsda.gr:279', 'eps-da', 36),
    ('gr-dod-b-1', 'Β Κατηγορία, 1ος Όμιλος', 'Δωδεκάνησα Β1', 'epsdod.gr:496', 'eps-dod', 37),
    ('gr-dod-b-2', 'Β Κατηγορία, 2ος Όμιλος', 'Δωδεκάνησα Β2', 'epsdod.gr:497', 'eps-dod', 38),
    ('gr-dod-b-3', 'Β Κατηγορία, 3ος Όμιλος Νήσων', 'Δωδεκάνησα Β3', 'epsdod.gr:501', 'eps-dod', 39),
    ('gr-ev-g-4', 'Γ Κατηγορία, 4ος Όμιλος (Νότιος)', 'Εύβοια Γ4', 'epsevias.gr:278', 'eps-ev', 40),
    ('gr-ana-u17-a', 'Κ17, Α Όμιλος', 'Αν. Αττική Κ17 Α', 'epsana.gr:751', 'eps-ana', 41),
    ('gr-ana-u17-b', 'Κ17, Β Όμιλος', 'Αν. Αττική Κ17 Β', 'epsana.gr:752', 'eps-ana', 42)
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'GR'
on conflict (slug) do nothing;
