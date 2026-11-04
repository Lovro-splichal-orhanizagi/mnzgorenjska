-- Romunija, vir `hlf` (hailafotbal.ro, uradna platforma FRF): državna
-- mladinska tekmovanja FRF (lastnik je mladinske lige U15–U19 odobril
-- 4. 11. 2026). Šifra lige je pot strani brez kroga, kot pri 20261010220000.
--
-- Pregled 4. 11. 2026 (inventar, seznam s Playwrightom kot obiskovalec):
--   Campionatul Național U19 in U17, Seria 1–12 (po 9 klubov, 27 krogov,
--   odigranih 11; Seria 1 in 7 U19 ter Seria 1 U17 imajo zadnji krog 4/4
--   polnih digitalnih zapisnikov — postava, klop, vratar, menjave, strelci),
--   Liga de Tineret in Liga Elitelor U17: play-off in play-out Est/Vest (po
--   7 klubov, 14 krogov od 18. 10.; play-off obeh 3/3 polnih). Redni del obeh
--   se je končal 11. 10. in ni vpisan. Liga de Tineret je za igralce letnika
--   2008 in mlajše (pravilnik FRF 2025/26) — šifra ima zato `u19`.
--   Liga Elitelor U16 in U15 (play-off 2 skupini, play-out 4) ter
--   Campionatul Național U16 in U15 (Seria 1–10): zapisniki NISO preverjeni —
--   pred uvozom `node scripts/hailafotbal-lige.mjs national --preveri`.
-- Ni vpisano: U14 in U13, redni del Elitelor U16/U15 (končan 10. 10.).
--
-- Vse šifre imajo starostno oznako (`u15`–`u19`) za varovalo mladih.
-- Arhiva ni (digitalni zapisniki šele od 2026/27): uvoz brez `arhiv`, s
-- `cene`. Vse lige so NEAKTIVNE.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hlf', v.koda, 1, v.vrstni, 6, false,
       'Hai la fotbal (FRF)', 'https://hailafotbal.ro/rezultate/' || v.koda
  from countries d
  cross join (values
    ('ro-u19-s1', 'Campionatul Național U19 Seria 1', 'U19 S1', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-1', 20),
    ('ro-u19-s2', 'Campionatul Național U19 Seria 2', 'U19 S2', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-2', 21),
    ('ro-u19-s3', 'Campionatul Național U19 Seria 3', 'U19 S3', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-3', 22),
    ('ro-u19-s4', 'Campionatul Național U19 Seria 4', 'U19 S4', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-4', 23),
    ('ro-u19-s5', 'Campionatul Național U19 Seria 5', 'U19 S5', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-5', 24),
    ('ro-u19-s6', 'Campionatul Național U19 Seria 6', 'U19 S6', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-6', 25),
    ('ro-u19-s7', 'Campionatul Național U19 Seria 7', 'U19 S7', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-7', 26),
    ('ro-u19-s8', 'Campionatul Național U19 Seria 8', 'U19 S8', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-8', 27),
    ('ro-u19-s9', 'Campionatul Național U19 Seria 9', 'U19 S9', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-9', 28),
    ('ro-u19-s10', 'Campionatul Național U19 Seria 10', 'U19 S10', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-10', 29),
    ('ro-u19-s11', 'Campionatul Național U19 Seria 11', 'U19 S11', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-11', 30),
    ('ro-u19-s12', 'Campionatul Național U19 Seria 12', 'U19 S12', 'frf', 'national/fotbal/2026-2027/campionatul-national-u19/sezon-regular/seria-12', 31),
    ('ro-tineret-u19-playoff', 'Liga de Tineret Play-Off', 'Tineret Play-Off', 'frf', 'national/fotbal/2026-2027/liga-de-tineret/play-off/play-off', 32),
    ('ro-tineret-u19-playout-est', 'Liga de Tineret Play-Out Est', 'Tineret Play-Out Est', 'frf', 'national/fotbal/2026-2027/liga-de-tineret/play-out/play-out-est', 33),
    ('ro-tineret-u19-playout-vest', 'Liga de Tineret Play-Out Vest', 'Tineret Play-Out Vest', 'frf', 'national/fotbal/2026-2027/liga-de-tineret/play-out/play-out-vest', 34),
    ('ro-u17-s1', 'Campionatul Național U17 Seria 1', 'U17 S1', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-1', 35),
    ('ro-u17-s2', 'Campionatul Național U17 Seria 2', 'U17 S2', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-2', 36),
    ('ro-u17-s3', 'Campionatul Național U17 Seria 3', 'U17 S3', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-3', 37),
    ('ro-u17-s4', 'Campionatul Național U17 Seria 4', 'U17 S4', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-4', 38),
    ('ro-u17-s5', 'Campionatul Național U17 Seria 5', 'U17 S5', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-5', 39),
    ('ro-u17-s6', 'Campionatul Național U17 Seria 6', 'U17 S6', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-6', 40),
    ('ro-u17-s7', 'Campionatul Național U17 Seria 7', 'U17 S7', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-7', 41),
    ('ro-u17-s8', 'Campionatul Național U17 Seria 8', 'U17 S8', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-8', 42),
    ('ro-u17-s9', 'Campionatul Național U17 Seria 9', 'U17 S9', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-9', 43),
    ('ro-u17-s10', 'Campionatul Național U17 Seria 10', 'U17 S10', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-10', 44),
    ('ro-u17-s11', 'Campionatul Național U17 Seria 11', 'U17 S11', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-11', 45),
    ('ro-u17-s12', 'Campionatul Național U17 Seria 12', 'U17 S12', 'frf', 'national/fotbal/2026-2027/campionatul-national-u17/sezon-regular/seria-12', 46),
    ('ro-elite-u17-playoff', 'Liga Elitelor U17 Play-Off', 'Elite U17 Play-Off', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u17/play-off/play-off', 47),
    ('ro-elite-u17-playout-est', 'Liga Elitelor U17 Play-Out Est', 'Elite U17 Play-Out Est', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u17/play-out/play-out-est', 48),
    ('ro-elite-u17-playout-vest', 'Liga Elitelor U17 Play-Out Vest', 'Elite U17 Play-Out Vest', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u17/play-out/play-out-vest', 49),
    ('ro-elite-u16-playoff-1', 'Liga Elitelor U16 Play-Off Seria 1', 'Elite U16 Play-Off 1', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u16/play-off/play-off-seria-1', 50),
    ('ro-elite-u16-playoff-2', 'Liga Elitelor U16 Play-Off Seria 2', 'Elite U16 Play-Off 2', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u16/play-off/play-off-seria-2', 51),
    ('ro-elite-u16-playout-1', 'Liga Elitelor U16 Play-Out Seria 1', 'Elite U16 Play-Out 1', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u16/play-out/play-out-seria-1', 52),
    ('ro-elite-u16-playout-2', 'Liga Elitelor U16 Play-Out Seria 2', 'Elite U16 Play-Out 2', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u16/play-out/play-out-seria-2', 53),
    ('ro-elite-u16-playout-3', 'Liga Elitelor U16 Play-Out Seria 3', 'Elite U16 Play-Out 3', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u16/play-out/play-out-seria-3', 54),
    ('ro-elite-u16-playout-4', 'Liga Elitelor U16 Play-Out Seria 4', 'Elite U16 Play-Out 4', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u16/play-out/play-out-seria-4', 55),
    ('ro-u16-s1', 'Campionatul Național U16 Seria 1', 'U16 S1', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-1', 56),
    ('ro-u16-s2', 'Campionatul Național U16 Seria 2', 'U16 S2', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-2', 57),
    ('ro-u16-s3', 'Campionatul Național U16 Seria 3', 'U16 S3', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-3', 58),
    ('ro-u16-s4', 'Campionatul Național U16 Seria 4', 'U16 S4', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-4', 59),
    ('ro-u16-s5', 'Campionatul Național U16 Seria 5', 'U16 S5', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-5', 60),
    ('ro-u16-s6', 'Campionatul Național U16 Seria 6', 'U16 S6', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-6', 61),
    ('ro-u16-s7', 'Campionatul Național U16 Seria 7', 'U16 S7', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-7', 62),
    ('ro-u16-s8', 'Campionatul Național U16 Seria 8', 'U16 S8', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-8', 63),
    ('ro-u16-s9', 'Campionatul Național U16 Seria 9', 'U16 S9', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-9', 64),
    ('ro-u16-s10', 'Campionatul Național U16 Seria 10', 'U16 S10', 'frf', 'national/fotbal/2026-2027/campionatul-national-u16/sezon-regular/seria-10', 65),
    ('ro-elite-u15-playoff-1', 'Liga Elitelor U15 Play-Off Seria 1', 'Elite U15 Play-Off 1', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u15/play-off/play-off-seria-1', 66),
    ('ro-elite-u15-playoff-2', 'Liga Elitelor U15 Play-Off Seria 2', 'Elite U15 Play-Off 2', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u15/play-off/play-off-seria-2', 67),
    ('ro-elite-u15-playout-1', 'Liga Elitelor U15 Play-Out Seria 1', 'Elite U15 Play-Out 1', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u15/play-out/play-out-seria-1', 68),
    ('ro-elite-u15-playout-2', 'Liga Elitelor U15 Play-Out Seria 2', 'Elite U15 Play-Out 2', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u15/play-out/play-out-seria-2', 69),
    ('ro-elite-u15-playout-3', 'Liga Elitelor U15 Play-Out Seria 3', 'Elite U15 Play-Out 3', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u15/play-out/play-out-seria-3', 70),
    ('ro-elite-u15-playout-4', 'Liga Elitelor U15 Play-Out Seria 4', 'Elite U15 Play-Out 4', 'frf', 'national/fotbal/2026-2027/liga-elitelor-u15/play-out/play-out-seria-4', 71),
    ('ro-u15-s1', 'Campionatul Național U15 Seria 1', 'U15 S1', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-1', 72),
    ('ro-u15-s2', 'Campionatul Național U15 Seria 2', 'U15 S2', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-2', 73),
    ('ro-u15-s3', 'Campionatul Național U15 Seria 3', 'U15 S3', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-3', 74),
    ('ro-u15-s4', 'Campionatul Național U15 Seria 4', 'U15 S4', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-4', 75),
    ('ro-u15-s5', 'Campionatul Național U15 Seria 5', 'U15 S5', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-5', 76),
    ('ro-u15-s6', 'Campionatul Național U15 Seria 6', 'U15 S6', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-6', 77),
    ('ro-u15-s7', 'Campionatul Național U15 Seria 7', 'U15 S7', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-7', 78),
    ('ro-u15-s8', 'Campionatul Național U15 Seria 8', 'U15 S8', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-8', 79),
    ('ro-u15-s9', 'Campionatul Național U15 Seria 9', 'U15 S9', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-9', 80),
    ('ro-u15-s10', 'Campionatul Național U15 Seria 10', 'U15 S10', 'frf', 'national/fotbal/2026-2027/campionatul-national-u15/sezon-regular/seria-10', 81)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'RO'
on conflict (slug) do nothing;
