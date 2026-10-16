-- Islandija: lige odraslih (moški) Knattspyrnusamband Íslands (KSÍ) z vira
-- `ksi` (ksi.is) — Besta deild, Lengjudeild, 2., 3. in 4. deild, obe skupini
-- 5. deild in Utandeild.
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"). Šifra lige je id
-- tekmovanja na ksi.is (`/oll-mot/mot?id=<id>`), vsaka sezona ima svojega;
-- liga z več fazami jih našteje s `+` (Besta deild: osnovni del, "Efri
-- hluti" in "Neðri hluti"). Ob novi sezoni (2027) se šifra popravi; arhivi
-- 2025 in postopek so v CLAUDE.md (Islandija — vir `ksi`).
--
-- Država IS je nova; vmesnika v islandščini, kartice in pošte še ni (kot pri
-- Litvi in Črni gori) — pred vklopom. Sezona 2026 je ob vpisu končana (Besta
-- deild igra zadnje kroge faze), vklop bo realno za 2027.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into countries (code, name, sort_order) values ('IS', 'Ísland', 16) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'ksi', 'Knattspyrnusamband Íslands', 'KSÍ', 'https://www.ksi.is/', 1600
  from countries d
 where d.code = 'IS'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'ksi', v.koda, 1, v.vrstni, 6, false,
       'KSÍ', 'https://www.ksi.is/oll-mot/mot?id=' || split_part(v.koda, '+', 1), true
  from countries d
  join federations f on f.code = 'ksi'
  cross join (values
    ('is-besta-deild', 'Besta deild karla', 'Besta deild', '7025510+7025527+7025532', 1),
    ('is-lengjudeild', 'Lengjudeild karla', 'Lengjudeild', '7025540', 2),
    ('is-2-deild', '2. deild karla', '2. deild', '7025548', 3),
    ('is-3-deild', '3. deild karla', '3. deild', '7025551', 4),
    ('is-4-deild', '4. deild karla', '4. deild', '7025560', 5),
    ('is-5-deild-a', '5. deild karla A riðill', '5. deild A', '7025573', 6),
    ('is-5-deild-b', '5. deild karla B riðill', '5. deild B', '7025587', 7),
    ('is-utandeild', 'Utandeild karla', 'Utandeild', '7025600', 8)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'IS'
on conflict (slug) do nothing;
