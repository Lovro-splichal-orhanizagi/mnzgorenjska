-- Vrsta pošte klubom: maile napolnimo zdaj, pošlje jih delavec slff-posta
-- na strežniku (scripts/posta-klubom.mjs --zanka) pozneje, v oknu prejemnikove
-- države in z dnevno mejo.
--
-- `v_vrsti`: naslov je v vrsti (vpiše ga scripts/vrsta-poste-klubom.mjs).
-- `poslji_od`: prvega maila ne pošlji pred tem časom.
-- `posiljatelj`: čigav je naslov v vrsti (npr. luka@slff.eu).
-- Pravice ostanejo kot doslej (RLS, le admin in servis).
alter table public.klub_stik
  add column v_vrsti boolean not null default false,
  add column poslji_od timestamptz,
  add column posiljatelj text;

create index klub_stik_vrsta_idx on public.klub_stik (stanje, poslji_od) where v_vrsti;
