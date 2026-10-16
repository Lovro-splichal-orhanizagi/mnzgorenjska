-- Škotska (5. raven): Scottish Lowland Football League — Lowland League East in
-- West z vira `lowland` (slfl.co.uk, Match Centre iz podatkov COMET škotske
-- zveze). Glej CLAUDE.md (Škotska — vir lowland).
--
-- Pisno dovoljenje za zajem: pridobil Lovro, oktober 2026 (pogoji uporabe
-- slfl.co.uk avtomatsko branje sicer prepovedujejo). Dovoljenje ne pokriva
-- tehnične zaščite: ob CAPTCHI, izzivu ali 401/403/429 se uvoz ustavi.
--
-- Država je `GB` (ISO 3166-1 alpha-2, kot pove `countries.code`; IP iz Škotske
-- je `GB`), šifra lige se začne z `gb-`. Isto kodo vpiše tudi vir `isthmian`
-- (Anglija) — kdor je prvi, da ime države; zato `on conflict do nothing`.
--
-- Šifra lige je `<tekmovanje>/<LLLL-LLLL>/<skupina COMET>`. Arhiva NI: stran je
-- nova, `/match-centre/slfl/2025-2026/` vrne 404 — cene le iz tekoče sezone.
-- Krogov vir ne objavi; izpelje jih iz šifer tekem (East 31, West 35 krogov).
--
-- Obe ligi sta NEAKTIVNI; uvoz ni bil pognan.

insert into countries (code, name, sort_order) values ('GB', 'United Kingdom', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'slfl', 'Scottish Lowland Football League', 'SLFL', 'https://slfl.co.uk/', 1411
  from countries d
 where d.code = 'GB'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'lowland', v.koda, 1, v.vrstni, 6, false
  from countries d
  join federations f on f.code = 'slfl'
  cross join (values
    -- slug, ime, kratko ime, šifra (tekoča 2026/27), vrstni red
    ('gb-lowland-east', 'Lowland League East', 'Lowland East', 'slfl/2026-2027/54193157', 210),
    ('gb-lowland-west', 'Lowland League West', 'Lowland West', 'slfl/2026-2027/54193424', 220)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'GB'
on conflict (slug) do nothing;
