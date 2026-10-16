-- Samodejne objave, faza 2: objava na Instagram in Facebook z oknom za veto.
-- Načrt: docs/superpowers/specs/2026-10-15-samodejne-objave-design.md.
--
-- - `objavljanje`: delavec (scripts/objave.mjs) je vrstico prevzel in kliče
--   Meto. Prevzem je pogojna posodobitev iz `osnutek`, zato se ista objava ne
--   objavi dvakrat; vrstica, ki obvisi v `objavljanje`, se ne ponovi sama.
-- - `discord_at`: osnutek je bil na Discordu. Brez tega se ne objavi (človek
--   ga ni videl).
-- - Povezava "Ustavi objavo" (slff.eu/objava#ustavi=<žeton>) kliče
--   `ustavi_objavo` kot anon. Varno: žeton ima 256 bitov, v bazi je le sha256,
--   funkcija le ustavi še neobjavljen osnutek pred rokom in ne vrne ničesar
--   drugega kot da/ne.

alter table public.objave drop constraint objave_stanje_check;
alter table public.objave add constraint objave_stanje_check
  check (stanje in ('osnutek', 'odobreno', 'ustavljeno', 'objavljanje', 'objavljeno', 'napaka'));

alter table public.objave
  add column discord_at timestamptz,
  add column objavljeno_at timestamptz,
  add column ig_povezava text,
  add column fb_povezava text;

grant execute on function public.ustavi_objavo(text) to anon, authenticated;
