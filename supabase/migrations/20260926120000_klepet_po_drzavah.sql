-- Klepet po državah.
--
-- Klepet na začetni strani je bil en sam za vso aplikacijo. S Slovaško so
-- Slovaki pod naslovom "Pomôž nám to zlepšiť!" brali slovenska sporočila —
-- država mora biti ločena v celoti, tudi v klepetu. Vsa dosedanja sporočila so
-- slovenska.

alter table public.chat_messages
  add column if not exists country_code text not null default 'SI'
  references public.countries (code);

create index if not exists chat_messages_drzava_cas
  on public.chat_messages (country_code, created_at desc);

-- Vpis gre po stolpcih (migracija 20260923090000): brez tega bi slovaško
-- sporočilo padlo na pravicah.
grant insert (country_code) on public.chat_messages to authenticated;

-- Pogled dobi državo na koncu, da `create or replace` ne premakne stolpcev.
create or replace view public.klepet_sporocila as
  select m.id,
         m.content,
         m.alias,
         m.created_at,
         (m.user_id = auth.uid()) as je_moje,
         m.country_code
    from public.chat_messages m;
