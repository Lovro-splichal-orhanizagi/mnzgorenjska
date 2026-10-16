-- Bosna in Hercegovina: lige Nogometnega saveza Federacije BiH (NS FBiH) z
-- vira `nsfbih` (nsfbih.ba, COMET) — WWIN Prva liga FBiH (2. raven BiH),
-- štiri skupine Druge lige FBiH (3. raven: Jug, Sjever, Centar, Zapad) in tri
-- skupine Omladinske lige BiH — juniori (U19: Centar 1, Centar 2, Jug) — ter
-- WWIN liga BiH (Premijer liga, 1. raven, 10 klubov) z vira `nfsbih`
-- (nfsbih.ba, NFSBiH, isti COMET, druga stran).
--
-- Šifra lige nsfbih je `<slug>/<sezona>` (glej scripts/viri/nsfbih.mjs): slug
-- strani `/takmicenja/<slug>` je isti vsako sezono, sezona v šifri pa ustavi
-- uvoz, ko stran preide na novo sezono — ob novi sezoni se popravi le sezona.
-- Arhiva ni (stran kaže le tekočo sezono, izbirnika sezon ni), zato so cene
-- le iz tekoče sezone. Kantonalnih lig (4. raven in nižje) vir nima.
--
-- Šifra lige nfsbih je `<slug>/<id tekmovanja COMET>` (glej
-- scripts/viri/nfsbih.mjs); vsaka sezona ima svoj id. Arhiv 2025/26
-- (`wwin-liga-bih/46565761`) ima izide, zapisniki pa so brez postav — ni
-- uporaben, cene so le iz tekoče sezone.
--
-- Mladinske lige (U19) kot drugod: prvi_fantasy_krog = 2, rok_pomak_ur = 2.
-- Republika Srpska (fsrs.org) ni vpisana.
--
-- Vse NEAKTIVNE; vklop po uvozu razporeda, zapisnikov, pozicij in cen.

insert into countries (code, name, sort_order) values ('BA', 'Bosna i Hercegovina', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.name, v.short_name, v.site_url, v.sort_order
  from countries d
  cross join (values
    ('nfsbih', 'Nogometni/Fudbalski savez Bosne i Hercegovine', 'NFSBiH', 'https://www.nfsbih.ba/', 1400),
    ('nsfbih', 'Nogometni savez Federacije BiH', 'NS FBiH', 'https://www.nsfbih.ba/', 1401)
  ) as v(code, name, short_name, site_url, sort_order)
 where d.code = 'BA'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'nsfbih', v.koda, v.prvi, v.vrstni, v.pomak, false,
       'NS FBiH', 'https://www.nsfbih.ba/takmicenja/' || split_part(v.koda, '/', 1)
  from countries d
  join federations f on f.code = 'nsfbih'
  cross join (values
    ('ba-prva-liga-fbih', 'WWIN Prva liga FBiH', 'Prva liga FBiH', 'wwin-prva-liga-fbih/2026-27', 1, 1, 6),
    ('ba-druga-liga-fbih-jug', 'Druga liga FBiH - Jug', '2. liga Jug', 'druga-liga-fbih-jug/2026-27', 2, 1, 6),
    ('ba-druga-liga-fbih-sjever', 'Druga liga FBiH - Sjever', '2. liga Sjever', 'druga-liga-fbih-sjever/2026-27', 3, 1, 6),
    ('ba-druga-liga-fbih-centar', 'Druga liga FBiH - Centar', '2. liga Centar', 'druga-liga-fbih-centar/2026-27', 4, 1, 6),
    ('ba-druga-liga-fbih-zapad', 'Druga liga FBiH - Zapad', '2. liga Zapad', 'druga-liga-fbih-zapad/2026-27', 5, 1, 6),
    ('ba-u19-juniori-centar-1', 'Omladinska liga BiH Juniori - Centar 1', 'Juniori Centar 1', 'omladinska-liga-bih-juniori-centar-1/2026-27', 6, 2, 2),
    ('ba-u19-juniori-centar-2', 'Omladinska liga BiH Juniori - Centar 2', 'Juniori Centar 2', 'omladinska-liga-bih-juniori-centar-2/2026-27', 7, 2, 2),
    ('ba-u19-juniori-jug', 'Omladinska liga BiH Juniori - Jug', 'Juniori Jug', 'omladinska-liga-bih-juniori-jug/2026-27', 8, 2, 2)
  ) as v(slug, ime, kratko, koda, vrstni, prvi, pomak)
 where d.code = 'BA'
on conflict (slug) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select 'ba-wwin-liga-bih', 'WWIN liga BiH', 'WWIN liga BiH', d.id, f.id, 'nfsbih', 'wwin-liga-bih/54152223', 1, 0, 6, false,
       'NFSBiH', 'https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih/'
  from countries d
  join federations f on f.code = 'nfsbih'
 where d.code = 'BA'
on conflict (slug) do nothing;
