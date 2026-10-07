-- `appearances.is_goalkeeper` je v produkciji obstajal (ročno dodan v Supabase
-- Cloud), migracije pa ga niso imele. Uvoz ga od 8. 10. 2026 piše (oznaka
-- vratarja iz HNS zapisnika, glej uskladi-pozicije.mjs --vir hns), zato je
-- sveža baza (lokalno, obnova) padla na "column does not exist".
alter table public.appearances
  add column if not exists is_goalkeeper boolean not null default false;
