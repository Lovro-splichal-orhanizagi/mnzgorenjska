-- Bosna in Hercegovina, Črna gora, Severna Makedonija: kadetske (U17),
-- mladinske (U19) in ženske lige iz virov, ki jih že uvažamo (odobritev
-- lastnika 4. 11. 2026). 14 lig, vse NEAKTIVNE.
--
-- BIH, `nsfbih` (šifra `<slug>/<sezona>`): Omladinska liga BiH Kadeti
-- Centar 1, Centar 2, Jug (ista oblika kot juniori) in Prva ženska liga FBiH
-- (6 klubov, visoki izidi). `nfsbih` (šifra `<slug>/<id tekmovanja>`):
-- Premijer omladinska liga BiH U-19 in U-17 (pod nogomet-muskarci) ter
-- Premijer ženska liga BiH — ta je pod /takmicenja/nogomet-zene/, zato njena
-- šifra nosi razdelek spredaj (`nogomet-zene/<slug>/<id>`, nfsbih.mjs).
-- Arhiva ni (nsfbih kaže le tekočo sezono; nfsbih arhiv 2025/26 nima postav).
-- Republika Srpska (fsrs.org) ni vpisana.
--
-- ČRNA GORA, `fscg` (šifra `<regija>/<slug>/<id>`): Druga omladinska liga
-- (U19), Prva in Druga kadetska liga (U17). 1. ŽFL ni vpisana (5 klubov).
--
-- SEVERNA MAKEDONIJA, `ffm` (slug strani lige): Kadetska Super liga, Vtora
-- kadetska liga Istok in Zapad (U17; `vtora-kadetska-liga-zapad-26-27-2` je
-- pionirska U15 in NI vpisana) ter Prva ženska fudbalska liga.
--
-- Mladinske: prvi_fantasy_krog = 2, rok_pomak_ur = 2; ženske kot člani:
-- prvi_fantasy_krog = 1, rok_pomak_ur = 6.

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
    ('ba-zene-prva-fbih', 'Prva ženska liga FBiH', 'Ženska liga FBiH', 'prva-zenska-liga-fbih/2026-27', 9, 1, 6),                                  -- 6
    ('ba-u17-kadeti-centar-1', 'Omladinska liga BiH Kadeti - Centar 1', 'Kadeti Centar 1', 'omladinska-liga-bih-kadeti-centar-1/2026-27', 10, 2, 2), -- 14
    ('ba-u17-kadeti-centar-2', 'Omladinska liga BiH Kadeti - Centar 2', 'Kadeti Centar 2', 'omladinska-liga-bih-kadeti-centar-2/2026-27', 11, 2, 2), -- 15
    ('ba-u17-kadeti-jug', 'Omladinska liga BiH Kadeti - Jug', 'Kadeti Jug', 'omladinska-liga-bih-kadeti-jug/2026-27', 12, 2, 2)                      -- 13
  ) as v(slug, ime, kratko, koda, vrstni, prvi, pomak)
 where d.code = 'BA'
on conflict (slug) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'nfsbih', v.koda, v.prvi, v.vrstni, v.pomak, false,
       'NFSBiH', 'https://www.nfsbih.ba/takmicenja/'
         || case when v.koda like 'nogomet-zene/%' then 'nogomet-zene/' || split_part(v.koda, '/', 2)
                 else 'nogomet-muskarci/' || split_part(v.koda, '/', 1) end || '/'
  from countries d
  join federations f on f.code = 'nfsbih'
  cross join (values
    ('ba-zene-premijer', 'Premijer ženska liga BiH', 'Ženska PL BiH', 'nogomet-zene/premijer-zenska-liga-bih/54336938', 1, 1, 6),           -- 10
    ('ba-u19-premijer', 'Premijer omladinska liga BiH U-19', 'POL U19', 'premijer-omladinska-liga-bih-u-19/54153428', 2, 2, 2),            -- 16
    ('ba-u17-premijer', 'Premijer omladinska liga BiH U-17', 'POL U17', 'premijer-omladinska-liga-bih-u-17/54160619', 3, 2, 2)             -- 10
  ) as v(slug, ime, kratko, koda, vrstni, prvi, pomak)
 where d.code = 'BA'
on conflict (slug) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fscg', v.koda, 2, v.vrstni, 2, false,
       'FSCG', 'https://fscg.me/takmicenja/' || split_part(v.koda, '/', 2) || '/'
  from countries d
  join federations f on f.code = 'fscg'
  cross join (values
    ('me-u19-2', 'Druga omladinska liga', 'Druga omladinska', 'fscg/druga-omladinska-liga/9313718', 7),  -- 12–14
    ('me-u17-1', 'Prva kadetska liga', 'Prva kadetska', 'fscg/prva-kadetska-liga/9315074', 8),           -- 10
    ('me-u17-2', 'Druga kadetska liga', 'Druga kadetska', 'fscg/druga-kadetska-liga/9315843', 9)         -- 16
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'ME'
on conflict (slug) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'ffm', v.koda, v.prvi, v.vrstni, v.pomak, false,
       'FFM', 'https://www.ffm.mk/natprevaruvanje/' || v.koda || '/'
  from countries d
  join federations f on f.code = 'ffm'
  cross join (values
    ('mk-zene-prva', 'Прва женска фудбалска лига', 'Прва женска', 'prva-zenska-fudbalska-liga-26-27', 11, 1, 6),        -- 10
    ('mk-u17-super', 'Кадетска Супер лига', 'Кадетска СЛ', 'kadetska-super-liga-26-27', 12, 2, 2),                      -- 12
    ('mk-u17-vtora-istok', 'Втора кадетска лига Исток', 'Втора кадетска И', 'vtora-kadetska-liga-istok-26-27', 13, 2, 2), -- 8
    ('mk-u17-vtora-zapad', 'Втора кадетска лига Запад', 'Втора кадетска З', 'vtora-kadetska-liga-zapad-26-27', 14, 2, 2)  -- 14
  ) as v(slug, ime, kratko, koda, vrstni, prvi, pomak)
 where d.code = 'MK'
on conflict (slug) do nothing;
