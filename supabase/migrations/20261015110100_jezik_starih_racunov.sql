-- Računi brez jezika v metapodatkih (večinoma prijava z Googlom) dobijo pošto
-- v angleščini in brez lige. Do 27. 9. 2026 16:37 UTC (prva slovaška ekipa)
-- je SLFF imel le slovenske lige, zato je vsak tak račun slovenski. Mlajše
-- pustimo: država je neznana.
update auth.users
   set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"jezik": "sl"}'::jsonb
 where created_at < '2026-09-27 16:37:25+00'
   and coalesce(raw_user_meta_data->>'jezik', '') = '';
