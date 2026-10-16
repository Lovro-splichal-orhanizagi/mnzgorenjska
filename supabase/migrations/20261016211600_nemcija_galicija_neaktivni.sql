-- Preverjeni začetni ligi novih virov. Obe ostaneta NEAKTIVNI: vpis šifer
-- ni potrditev popolnosti sezon ali cenika in ne sproži uvoza.
--
-- DFB Datencenter: Regionalliga Nordost 2026/27, arhiv
-- regionalliga-nordost/2025-2026 (javni zapisniki 2425990 in 2401894).
-- Tekmovanje vodi NOFV, objavitelj podatkov pa je DFB Datencenter.
--
-- RFGF Novanet: Tercera Futgal Lugo, skupina 1, 2026/27; arhiv
-- galicia:21:24123231:24820329. Obe šifri iz javnih izbirnikov RFGF,
-- preverjenih 16. 10. 2026. Vratarji v Novanet zapisnikih niso označeni.
-- Celotni sezoni, identitete, pozicije in cene preveri PRED vklopom.
-- Postopek in omejitve: docs/viri/nemcija.md.

insert into countries (code, name, sort_order)
values ('DE', 'Deutschland', 14)
on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'nofv', 'Nordostdeutscher Fußballverband e.V.', 'NOFV',
       'https://www.nofv-online.de/', 1401
  from countries d
 where d.code = 'DE'
on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'rfgf', 'Real Federación Galega de Fútbol', 'RFGF',
       'https://www.futgal.es/', 1202
  from countries d
 where d.code = 'ES'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur,
  active, vir_ime, vir_url, sezona_koledarska
)
select 'de-regionalliga-nordost', 'Regionalliga Nordost', 'RL Nordost',
       d.id, f.id, 'dfb', 'regionalliga-nordost/2026-2027', 1, 1, 6,
       false, 'DFB Datencenter',
       'https://datencenter.dfb.de/competitions/regionalliga-nordost/seasons/2026-2027/teams/bfc-dynamo',
       false
  from countries d
  join federations f on f.country_id = d.id and f.code = 'nofv'
 where d.code = 'DE'
on conflict (slug) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur,
  active, vir_ime, vir_url, sezona_koledarska
)
select 'es-ga-tercera-lugo-g1', 'Tercera Futgal Lugo, grupo 1', 'Tercera Lugo 1',
       d.id, f.id, 'novanet', 'galicia:22:26990830:27759837', 1, 1, 6,
       false, null, null, false
  from countries d
  join federations f on f.country_id = d.id and f.code = 'rfgf'
 where d.code = 'ES'
on conflict (slug) do nothing;
