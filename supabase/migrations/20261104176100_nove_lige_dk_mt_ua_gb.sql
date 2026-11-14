-- Nove lige v virih, ki jih SLFF že uvaža (odobritev lastnika 4. 11. 2026:
-- članske, ženske, U19–U23 in U16/U17): Danska (dbu), Malta (mfa), Ukrajina
-- (upl) in Škotska (lowland). Vzorec kot pri prvem vpisu vira (migracije
-- 20261016093700, 20261016091500, 20261016092500, 20261016090500).
--
-- Šifre so iz pregleda 4. 11. 2026 (en vzorčen zapisnik na vir oziroma ligo,
-- glej docs/viri/<država>.md). Mladinske lige imajo v šifri starostno oznako
-- (`u16`, `u17`, `u19`), da jih ujame pravilo `je_mladinski_slug`; U20/U21/U22
-- so člani.
--
-- Vse lige so NEAKTIVNE; uvoz ni bil pognan.

-- Danska (dbu): šifra je id pulje osnovnega dela (Grundspil); pulje
-- nadaljevanja (prvenstvena/obstanek, pomladni del) se dopišejo s `+`.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'dbu', v.koda, 1, v.vrstni, 6, false
  from countries d
  join federations f on f.code = 'dbu'
  cross join (values
    -- slug, ime, kratko ime, šifra (tekoča 2026/27), vrstni red
    ('dk-superliga', 'Superliga', 'Superliga', '506118', 1),
    ('dk-1-division', '1. division', '1. div', '507530', 5),
    ('dk-kvinder-a-liga', 'A-Liga Kvinder', 'A-Liga K', '508850', 50),
    ('dk-u19-ligaen', 'U19 Ligaen', 'U19 Liga', '508670', 60),
    ('dk-u19-divisionen', 'U19 Divisionen', 'U19 Div', '508669', 61),
    ('dk-u17-ligaen', 'U17 Ligaen', 'U17 Liga', '508668', 70),
    ('dk-u17-divisionen', 'U17 Divisionen', 'U17 Div', '508667', 71)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'DK'
on conflict (slug) do nothing;

-- Malta (mfa): `<tip tekmovanja>/<sezona>`; mladinske lige imajo faze kot
-- Challenge League (vir jih poveže prek lestvice).
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
    ('mt-women', 'Women''s League', 'Women''s League', '58570/2027', 10),
    ('mt-youth-a', 'Youth League A', 'Youth League A', '2601268/2027', 20),
    ('mt-youth-b', 'Youth League B', 'Youth League B', '6306756/2027', 21),
    ('mt-youth-c', 'Youth League C', 'Youth League C', '6318084/2027', 22),
    ('mt-youth-d', 'Youth League D', 'Youth League D', '6318086/2027', 23),
    ('mt-u17-a', 'U17 League A', 'U17 League A', '6472256/2027', 30),
    ('mt-u17-b', 'U17 League B', 'U17 League B', '6480493/2027', 31),
    ('mt-u17-c', 'U17 League C', 'U17 League C', '6480496/2027', 32),
    ('mt-u17-d', 'U17 League D', 'U17 League D', '6480497/2027', 33),
    ('mt-women-u16', 'Women''s U16 League', 'Women U16', '1324251/2027', 40)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'MT'
on conflict (slug) do nothing;

-- Ukrajina (upl): rezervna liga UPL (Прем'єр-ліга 2), isti koledar in
-- zapisniki kot ua-upl.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, active
)
select 'ua-upl-2', 'Прем''єр-ліга 2', 'УПЛ-2', d.id, f.id, 'upl', '433', 1, 2, false
  from countries d
  join federations f on f.code = 'upl'
 where d.code = 'UA'
on conflict (slug) do nothing;

-- Škotska (lowland): U20 Development League na isti strani Match Centra
-- (pot `sldfl`), skupini East in West.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'lowland', v.koda, 1, v.vrstni, 6, false
  from countries d
  join federations f on f.code = 'slfl'
  cross join (values
    ('gb-lowland-u20-east', 'Lowland U20 Development League East', 'Lowland U20 East', 'sldfl/2026-2027/54269281', 230),
    ('gb-lowland-u20-west', 'Lowland U20 Development League West', 'Lowland U20 West', 'sldfl/2026-2027/54269309', 240)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'GB'
on conflict (slug) do nothing;
