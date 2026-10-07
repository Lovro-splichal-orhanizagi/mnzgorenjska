-- `preveri_vratarje()` je ostanek iz Supabase Cloud: v migracijah ga ni bilo,
-- v produkciji pa je bil SECURITY DEFINER z izvajanjem za anon. En klic prek
-- REST (brez prijave) bi vsem igralcem v vseh ligah z virom 'zapisnik' ali
-- 'neznano' pozicijo postavil po `is_goalkeeper`, ki je bil do 8. 10. 2026
-- povsod false — torej skoraj vse vratarje izbrisal. Nihče ga ne kliče;
-- pozicije usklajuje scripts/uskladi-pozicije.mjs.
drop function if exists public.preveri_vratarje();
