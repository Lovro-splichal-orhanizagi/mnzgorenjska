-- Gibraltar: moški ligi Gibraltar Football Association z vira `gfa`
-- (gibraltarfa.com, HTML, ki ga izriše strežnik) — Gibraltar Football League
-- (raven 1, 11 klubov) in GFA Reserve League (rezervne ekipe klubov, 9;
-- naslednica Intermediate League 2025/26).
--
-- Sezona je avgust–maj ("2026/27"). Šifra lige je pot tekmovanja na strani
-- (`<slug>-<id>`); GFL se po 22. krogu razdeli na Championship in Challenge
-- Group, ki sta svoji tekmovanji — takrat se šifra dopolni s `+<pot>`
-- (docs/viri/gibraltar.md). Arhiv 2025/26: GFL
-- `gibraltar-football-league-25-26-3082381+gibraltar-football-league-25-26-3082383`,
-- Intermediate League `intermediate-league-25-26-3085893`.
--
-- Zapisnik ima postave, klop, menjave z minuto in strelce; kartoni so brez
-- minute. Pokali (Rock Cup, Pepe Reyes Cup), ženske, mladinske in futsal NISO
-- vpisani.
--
-- Država GI: vmesnik bi bil angleški (jezik `en` obstaja), a vstopne strani,
-- kartice, pošte in ugiba države še ni — lastnik odloči pred vklopom.
--
-- Vse NEAKTIVNE; uvozi niso bili pognani.

insert into countries (code, name, sort_order) values ('GI', 'Gibraltar', 21) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'gfa', 'Gibraltar Football Association', 'GFA', 'https://www.gibraltarfa.com/', 2101
  from countries d
 where d.code = 'GI'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'gfa', v.koda, 1, v.vrstni, 6, false,
       'Gibraltar FA', 'https://www.gibraltarfa.com/competitions/' || v.koda, false
  from countries d
  cross join (values
    ('gi-gfl', 'Gibraltar Football League', 'GFL', 'gibraltar-football-league-26-27-3395567', 1),
    ('gi-reserve-league', 'GFA Reserve League', 'Reserve League', 'reserve-league-26-27-3395742', 2)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'gfa'
 where d.code = 'GI'
on conflict (slug) do nothing;
