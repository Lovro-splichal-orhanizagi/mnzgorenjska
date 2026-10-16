-- Malta: država MT, zveza MFA in štiri lige odraslih z vira `mfa` (javni JSON
-- API Match Centra, api.mfa.com.mt, podatki iz COMET): Premier League,
-- Challenge League, National League I in National League II (raven 4, nekdanja
-- Amateur League). Gozo FA (gozofa.com, ločena piramida) ni vpisana.
--
-- Šifra lige je `<tip>/<sezona>`: id vrste tekmovanja (stalen) in id sezone
-- = leto konca (2027 = 2026/27). Brez izrecnega tekmovanja so liga vse faze, ki
-- jih našteje lestvica sezone (Premier: Opening Round Phase 1, P2 Top 6 /
-- Bottom 6, Closing Round …; Challenge: Phase 1, Top 8, Play-Out). Glej
-- scripts/viri/mfa.mjs in CLAUDE.md (Malta — vir mfa).
--
-- Arhiv 2025/26 (uvozu z `arhiv=`):
--   mt-premier      58539/2026    (6 faz, 32 krogov, 192 tekem)
--   mt-challenge    2601248/2026  (Phase 1 + Top 8 + Play-Out)
--   mt-nl1          2601267/2026  (National Amateur League 1, 14 klubov)
--   mt-nl2          6234492/2026  (National Amateur League 2, 12 klubov)
-- Starejše sezone (2022–2024) so na istem API-ju; 2023/24 je imela NL II
-- (takrat IZIBET Amateur League) skupini A in B — tam šifra potrebuje
-- `/<competitionId>`.
--
-- Vmesnika v malteščini/angleščini za MT še ni; lige so NEAKTIVNE, uvoz ni bil pognan.

insert into countries (code, name, sort_order) values ('MT', 'Malta', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'mfa', 'Malta Football Association', 'MFA', 'https://www.mfa.com.mt/', 1401
  from countries d
 where d.code = 'MT'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mfa', v.koda, 1, v.vrstni, 6, false,
       'MFA', 'https://matchcentre.mfa.com.mt/competition/' || split_part(v.koda, '/', 1) || '/'
  from countries d
  join federations f on f.code = 'mfa'
  cross join (values
    ('mt-premier', 'Malta Premier League', 'Premier League', '58539/2027', 1),
    ('mt-challenge', 'Challenge League', 'Challenge League', '2601248/2027', 2),
    ('mt-nl1', 'National League I', 'National League I', '2601267/2027', 3),
    ('mt-nl2', 'National League II', 'National League II', '6234492/2027', 4)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'MT'
on conflict (slug) do nothing;
