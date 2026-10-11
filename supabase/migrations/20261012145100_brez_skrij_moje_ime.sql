-- Igralec si imena ne more več skriti sam.
--
-- `skrij_moje_ime()` (20261012091100) je potrjenemu igralcu dovolila, da z
-- enim klikom za vedno zamenja svoje ime s številko. V fantasy igri je ime to,
-- po čemer igralca poznajo drugi (ekipe, lestvice, poročila), zato gumb ni
-- sodil na profil. Ugovor (GDPR) ostane, kot je opisan na /legal: igralec ali
-- zveza piše na info@slff.eu, admin ime skrije v Administracija → Igralec
-- (`admin_anonimiziraj_igralca`). Funkcija ostane servisna.
revoke execute on function public.skrij_moje_ime() from public, anon, authenticated;
