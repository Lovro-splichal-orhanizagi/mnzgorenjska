-- Slovaška (vir `sportnet`): ženske lige, dorastenky WU19, mladší dorast U17
-- in U16 ter starší žiaci U15 — 30 lig z vsaj šestimi klubi (odobritev
-- lastnika 4. 11. 2026: ženske, U16/U17 in U15, kjer so navedene).
--
-- Šifra `<appSpace>/<tekmovanje>[/<del>]` kot pri ostalih slovaških ligah.
-- Orange liga ima del "Základná časť": nadstavba bo nov del (kot Niké liga).
-- WU19 I. liga je le ligaški del (ZČ) skupin Západ in Východ.
--
-- Izpuščeni: BFZ WU19 (3 klubi), SsFZ WU19 (5), ObFZ Banská Bystrica U17
-- (brez tekem), U14 in mlajši, VsFZ/ZsFZ III. liga U15 (nepreverjene),
-- pokali, futsal.
--
-- Ženske lige kot člani: prvi_fantasy_krog = 1, rok_pomak_ur = 6. Mladinske
-- (WU19, U17, U16, U15): prvi_fantasy_krog = 2, rok_pomak_ur = 2. Slug
-- mladinske lige nosi starostno oznako (u15–u19) kot svoj del, da jo ujame
-- pravilo mladinskih lig. Vse NEAKTIVNE; arhivi 2025/26 še niso poiskani.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'sportnet', v.koda, v.prvi, v.vrstni, v.pomak, false,
       'futbalnet.sk', 'https://sportnet.sme.sk/futbalnet/z/' || v.zveza || '/'
  from countries d
  cross join (values
    -- ženske
    ('sk-sfz-zeny-1liga', 'Orange liga — ženy', 'Orange liga Ž', 'sfz', 'futbalsfz.sk/6a0dc9335736165c0e12758f/6a1c35d48d3969cef869afb4', 1, 6, 31),             -- 10
    ('sk-sfz-zeny-2liga', 'II. liga ženy', 'SFZ Ž II.', 'sfz', 'futbalsfz.sk/6a0dc9435736165c0e1293c2/6a1c361b8d3969cef869afb5', 1, 6, 32),                        -- 10
    ('sk-sfz-zeny-u19-1liga-zapad', 'I. liga dorasteniek WU19 Západ', 'SFZ WU19 I. Z', 'sfz', 'futbalsfz.sk/6a0dc9745736165c0e12f8d8/6a1f264a8d3969cef869c9cc', 2, 2, 33),   -- 8
    ('sk-sfz-zeny-u19-1liga-vychod', 'I. liga dorasteniek WU19 Východ', 'SFZ WU19 I. V', 'sfz', 'futbalsfz.sk/6a0dc9745736165c0e12f8d8/6a1f26ac8d3969cef869c9f2', 2, 2, 34), -- 10
    ('sk-sfz-zeny-u19-2liga-zapad', 'II. liga dorasteniek WU19 Západ', 'SFZ WU19 II. Z', 'sfz', 'futbalsfz.sk/6a1f291b44ff24612e9c4a75', 2, 2, 35),                      -- 9
    -- mladší dorast U17 / U16
    ('sk-sfz-u17-1liga', 'I. liga mladší dorast U17', 'SFZ U17 I.', 'sfz', 'futbalsfz.sk/6a0da29a5736165c0ec8b4ad', 2, 2, 41),                                         -- 14
    ('sk-sfz-u16-1liga', 'I. liga mladší dorast U16', 'SFZ U16 I.', 'sfz', 'futbalsfz.sk/6a0da2ce5736165c0ec92746', 2, 2, 42),                                         -- 14
    ('sk-sfz-u17-2liga-zapad', 'II. liga mladší dorast U17 Západ', 'SFZ U17 II. Z', 'sfz', 'futbalsfz.sk/6a0da47c5736165c0ecc80a6/6a1740cfc9a61a70ee92674b', 2, 2, 43),  -- 16
    ('sk-sfz-u17-2liga-vychod', 'II. liga mladší dorast U17 Východ', 'SFZ U17 II. V', 'sfz', 'futbalsfz.sk/6a0da47c5736165c0ecc80a6/6a1740e7c9a61a70ee92674c', 2, 2, 44), -- 16
    ('sk-bfz-u17-3liga', 'III. liga U17 — BFZ', 'BFZ U17 III.', 'bfz', 'BFZ/6a12029544ff24612e995b40', 2, 2, 41),                                                       -- 12
    ('sk-bfz-u17-4liga-a', 'IV. liga U17 A — BFZ', 'BFZ U17 IV. A', 'bfz', 'BFZ/6a18211544ff24612e0aabd2/6a4f8017bd81013dc7a6c112', 2, 2, 42),                          -- 12
    ('sk-bfz-u17-4liga-b', 'IV. liga U17 B — BFZ', 'BFZ U17 IV. B', 'bfz', 'BFZ/6a18211544ff24612e0aabd2/6a4f7ff3bd81013dc7a6c111', 2, 2, 43),                          -- 13
    ('sk-bfz-u17-4liga-c', 'IV. liga U17 C — BFZ', 'BFZ U17 IV. C', 'bfz', 'BFZ/6a18211544ff24612e0aabd2/6a1822073b5ff2fb014f221d', 2, 2, 44),                          -- 12
    ('sk-ssfz-u17-3liga-sever', 'III. liga U17 Sever — SsFZ', 'SsFZ U17 III. S', 'ssfz', 'SsFZ/6a1953c544ff24612e692cce/6a1953d8b5f9fd8631502f40', 2, 2, 41),          -- 11
    ('sk-ssfz-u17-3liga-juh', 'III. liga U17 Juh — SsFZ', 'SsFZ U17 III. J', 'ssfz', 'SsFZ/6a1953c544ff24612e692cce/6a3d72375a99fcd8c41eda23', 2, 2, 42),              -- 8
    ('sk-vsfz-u17-3liga-a', 'III. liga mladší dorast U17 A — VsFZ', 'VsFZ U17 III. A', 'vsfz', 'VsFZ/6a0f0cb45736165c0e68279f/6a2aac00076b8e72ac234f35', 2, 2, 41),   -- 13
    ('sk-vsfz-u17-3liga-b', 'III. liga mladší dorast U17 B — VsFZ', 'VsFZ U17 III. B', 'vsfz', 'VsFZ/6a0f0cb45736165c0e68279f/6a3912f50b755716bcd9c072', 2, 2, 42),   -- 13
    ('sk-zsfz-u17-3liga-sz', 'III. liga U17 Severozápad — ZsFZ', 'ZsFZ U17 III. SZ', 'zsfz', 'ZsFZ/6a0ff38c5736165c0e430095/6a0ff38c3bff416b52e1d026', 2, 2, 41),     -- 16
    ('sk-zsfz-u17-3liga-jv', 'III. liga U17 Juhovýchod — ZsFZ', 'ZsFZ U17 III. JV', 'zsfz', 'ZsFZ/6a0ff38c5736165c0e430095/6a0ff38c3bff416b52e1d027', 2, 2, 42),      -- 16
    ('sk-tt-u17', 'IV. liga U17 — Trnava', 'TT U17', 'obfz-trnava', 'ObFZ-Trnava/6a26f201233cdeb1e7c498c9', 2, 2, 41),                                                 -- 9
    -- starší žiaci U15
    ('sk-sfz-u15-1liga-zapad', 'I. liga starší žiaci U15 Západ', 'SFZ U15 I. Z', 'sfz', 'futbalsfz.sk/6a0dc7d45736165c0e0fb860/6a1c36858d3969cef869afb7', 2, 2, 51),   -- 21?
    ('sk-sfz-u15-1liga-stred', 'I. liga starší žiaci U15 Stred', 'SFZ U15 I. S', 'sfz', 'futbalsfz.sk/6a0dc7d45736165c0e0fb860/6a1c36858d3969cef869afb6', 2, 2, 52),   -- 13
    ('sk-sfz-u15-1liga-vychod', 'I. liga starší žiaci U15 Východ', 'SFZ U15 I. V', 'sfz', 'futbalsfz.sk/6a0dc7d45736165c0e0fb860/6a1c36ac8d3969cef869afb8', 2, 2, 53), -- 13
    ('sk-bfz-u15-2liga', 'II. liga U15 — BFZ', 'BFZ U15 II.', 'bfz', 'BFZ/6a12039744ff24612e9bf6b6', 2, 2, 51),                                                        -- 14
    ('sk-ssfz-u15-2liga-a', 'II. liga U15 A — SsFZ', 'SsFZ U15 II. A', 'ssfz', 'SsFZ/6a19552c44ff24612e6c6b4d/6a195558b5f9fd8631502f60', 2, 2, 51),                    -- 14
    ('sk-ssfz-u15-2liga-b', 'II. liga U15 B — SsFZ', 'SsFZ U15 II. B', 'ssfz', 'SsFZ/6a19552c44ff24612e6c6b4d/6a19556bb5f9fd8631502f63', 2, 2, 52),                    -- 14
    ('sk-ssfz-u15-2liga-c', 'II. liga U15 C — SsFZ', 'SsFZ U15 II. C', 'ssfz', 'SsFZ/6a19552c44ff24612e6c6b4d/6a19557bb5f9fd8631502f69', 2, 2, 53),                    -- 14
    ('sk-ssfz-u15-2liga-d', 'II. liga U15 D — SsFZ', 'SsFZ U15 II. D', 'ssfz', 'SsFZ/6a19552c44ff24612e6c6b4d/6a19558bb5f9fd8631502f6a', 2, 2, 54),                    -- 11
    ('sk-vsfz-u15-2liga', 'II. liga starší žiaci U15 — VsFZ', 'VsFZ U15 II.', 'vsfz', 'VsFZ/6a0f0df95736165c0e6adb4f', 2, 2, 51),                                       -- 14
    ('sk-zsfz-u15-2liga', 'II. liga U15 — ZsFZ', 'ZsFZ U15 II.', 'zsfz', 'ZsFZ/6a0ff3e85736165c0e43dc97', 2, 2, 51)                                                     -- 16
  ) as v(slug, ime, kratko, zveza, koda, prvi, pomak, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'SK'
on conflict (slug) do nothing;
