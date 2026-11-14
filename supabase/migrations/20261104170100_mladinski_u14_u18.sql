-- Mladinske lige pod U19 (U14–U18, kadeti, juniori): ista zaščita mladoletnih
-- kot za U19 (izložba, scout, objave, opomniki, prevzem igralca, ankete).
-- Pred registracijo ~200 mladinskih lig (HR kadeti, HU U16/U17, SI/SK/AT U15–U17).
-- Na produkciji ni nobene obstoječe šifre, ki bi jo novo pravilo na novo zajelo
-- (preverjeno 4. 11. 2026). Isto pravilo je v src/lib/prevzem.ts,
-- scripts/visja-liga.mjs in scripts/hetzner/html/streznik.mjs.
create or replace function public.je_mladinski_slug(p_slug text)
returns boolean language sql immutable parallel safe set search_path = public
as $$ select coalesce(p_slug ~ '(^|-)(u1[4-9]|mladinci|kadeti|kadetki|kadetska|juniori)($|-)' or p_slug ~ '^sml[0-9]', false) $$;
