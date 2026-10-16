-- Danska: 2. division, 3. division in Danmarksserien (štiri pulje) z vira `dbu`
-- (dbu.dk/resultater, Dansk Boldspil-Union). Glej CLAUDE.md (Danska — vir dbu).
--
-- Pisno dovoljenje DBU za zajem: pridobil Lovro, oktober 2026 (kopija še ni v
-- arhivu info@). Dovoljenje odpravi omejitev pogojev uporabe (A.5.1), ne pokriva
-- pa tehnične zaščite: ob Cloudflarovem izzivu, CAPTCHI ali 401/403/429 se uvoz
-- ustavi (izhod 4).
--
-- Država `DK`, šifra lige se začne z `dk-`. Sezona je jesen–pomlad ("2026/27",
-- ne koledarska). Šifra lige je id pulje (`508656`) ali več pulj ene sezone s
-- `+` (arhiv 2. division 2025/26: osnovni del + skupini za napredovanje in
-- obstanek). Krogov vir ne objavi; vir jih izpelje iz datumov.
--
-- Regijske serije (Sjællandsserien, Jyllandsserien, Fynsserien,
-- Københavnsserien, Serie 1) NISO vpisane: v manj kot 80 % zapisnikov imata obe
-- ekipi delitev na začetnike in klop ter menjave (številke v CLAUDE.md).
--
-- Vse lige so NEAKTIVNE; uvoz ni bil pognan.

insert into countries (code, name, sort_order) values ('DK', 'Danmark', 20) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'dbu', 'Dansk Boldspil-Union', 'DBU', 'https://www.dbu.dk/', 2000
  from countries d
 where d.code = 'DK'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'dbu', v.koda, 1, v.vrstni, 6, false
  from countries d
  join federations f on f.code = 'dbu'
  cross join (values
    -- slug, ime, kratko ime, šifra (tekoča 2026/27), vrstni red
    ('dk-2-division', '2. division', '2. div', '508656', 10),
    ('dk-3-division', '3. division', '3. div', '508657', 20),
    ('dk-danmarksserien-1', 'Danmarksserien, pulje 1', 'DS 1', '499766', 31),
    ('dk-danmarksserien-2', 'Danmarksserien, pulje 2', 'DS 2', '499767', 32),
    ('dk-danmarksserien-3', 'Danmarksserien, pulje 3', 'DS 3', '499768', 33),
    ('dk-danmarksserien-4', 'Danmarksserien, pulje 4', 'DS 4', '499769', 34)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'DK'
on conflict (slug) do nothing;
