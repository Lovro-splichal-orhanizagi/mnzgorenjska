-- Bosna in Hercegovina: lige Nogometnega saveza Federacije BiH (NS FBiH) z
-- vira `nsfbih` (nsfbih.ba, COMET) — WWIN Prva liga FBiH (2. raven BiH) in
-- štiri skupine Druge lige FBiH (3. raven: Jug, Sjever, Centar, Zapad).
--
-- Šifra lige je `<slug>/<sezona>` (glej scripts/viri/nsfbih.mjs): slug strani
-- `/takmicenja/<slug>` je isti vsako sezono, sezona v šifri pa ustavi uvoz,
-- ko stran preide na novo sezono — ob novi sezoni se popravi le sezona.
-- Arhiva ni (stran kaže le tekočo sezono, izbirnika sezon ni), zato so cene
-- le iz tekoče sezone; arhivskih šifer ni (CLAUDE.md, Bosna in Hercegovina —
-- vir nsfbih). Kantonalnih lig (4. raven in nižje) vir nima. Republika Srpska
-- (fsrs.org) ni vpisana.
--
-- Vse NEAKTIVNE; vklop po uvozu razporeda, zapisnikov, pozicij in cen.

insert into countries (code, name, sort_order) values ('BA', 'Bosna i Hercegovina', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'nsfbih', 'Nogometni savez Federacije BiH', 'NS FBiH', 'https://www.nsfbih.ba/', 1401
  from countries d
 where d.code = 'BA'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'nsfbih', v.koda, 1, v.vrstni, 6, false,
       'NS FBiH', 'https://www.nsfbih.ba/takmicenja/' || split_part(v.koda, '/', 1)
  from countries d
  join federations f on f.code = 'nsfbih'
  cross join (values
    ('ba-prva-liga-fbih', 'WWIN Prva liga FBiH', 'Prva liga FBiH', 'wwin-prva-liga-fbih/2026-27', 1),
    ('ba-druga-liga-fbih-jug', 'Druga liga FBiH - Jug', '2. liga Jug', 'druga-liga-fbih-jug/2026-27', 2),
    ('ba-druga-liga-fbih-sjever', 'Druga liga FBiH - Sjever', '2. liga Sjever', 'druga-liga-fbih-sjever/2026-27', 3),
    ('ba-druga-liga-fbih-centar', 'Druga liga FBiH - Centar', '2. liga Centar', 'druga-liga-fbih-centar/2026-27', 4),
    ('ba-druga-liga-fbih-zapad', 'Druga liga FBiH - Zapad', '2. liga Zapad', 'druga-liga-fbih-zapad/2026-27', 5)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'BA'
on conflict (slug) do nothing;
