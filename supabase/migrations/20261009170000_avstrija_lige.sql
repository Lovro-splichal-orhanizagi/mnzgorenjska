-- Avstrija: prve lige z vira ÖFB (oefb.at, vir `oefb`) — Koroška (KFV):
-- Kärntner Liga in vse tri Unterlige; Štajerska (StFV): vse tri Oberlige in
-- vseh sedem Gebietslig.
--
-- Država AT je v svoji migraciji (20261009160000_avstrija); brez nje se tu ne
-- vpiše nič. Šifra lige je id tekmovanja (Bewerb) sezone 2026/27; arhivi
-- 2025/26 in 2024/25 so v CLAUDE.md (Avstrija, vir `oefb`). Unterliga Mitte
-- obstaja šele od 2025/26.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.url, v.vrstni
  from countries d
  cross join (values
    ('kfv', 'Kärntner Fußballverband', 'Kärnten', 'https://www.kfv-fussball.at/', 501),
    ('stfv', 'Steirischer Fußballverband', 'Steiermark', 'https://www.stfv.at/', 502)
  ) as v(koda, ime, kratko, url, vrstni)
 where d.code = 'AT'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'oefb', v.koda, 1, v.vrstni, 6, false,
       'ÖFB', 'https://www.oefb.at/bewerbe/Bewerb/' || v.koda || '/'
  from countries d
  cross join (values
    ('at-k-kaerntner-liga', 'Kärntner Liga', 'Kärntner Liga', 'kfv', '231665', 1),
    ('at-k-unterliga-ost', 'Unterliga Ost (Kärnten)', 'Kärnten UL Ost', 'kfv', '231652', 2),
    ('at-k-unterliga-mitte', 'Unterliga Mitte (Kärnten)', 'Kärnten UL Mitte', 'kfv', '231657', 3),
    ('at-k-unterliga-west', 'Unterliga West (Kärnten)', 'Kärnten UL West', 'kfv', '231656', 4),
    ('at-st-oberliga-mitte-west', 'Oberliga Mitte/West', 'Stmk. OL Mitte/West', 'stfv', '231501', 11),
    ('at-st-oberliga-sued-ost', 'Oberliga Süd/Ost', 'Stmk. OL Süd/Ost', 'stfv', '231521', 12),
    ('at-st-oberliga-nord', 'Oberliga Nord', 'Stmk. OL Nord', 'stfv', '231503', 13),
    ('at-st-gebietsliga-mitte', 'Gebietsliga Mitte', 'Stmk. GL Mitte', 'stfv', '231500', 21),
    ('at-st-gebietsliga-west', 'Gebietsliga West', 'Stmk. GL West', 'stfv', '231520', 22),
    ('at-st-gebietsliga-sued', 'Gebietsliga Süd', 'Stmk. GL Süd', 'stfv', '231523', 23),
    ('at-st-gebietsliga-ost', 'Gebietsliga Ost', 'Stmk. GL Ost', 'stfv', '231524', 24),
    ('at-st-gebietsliga-mur', 'Gebietsliga Mur', 'Stmk. GL Mur', 'stfv', '231502', 25),
    ('at-st-gebietsliga-muerz', 'Gebietsliga Mürz', 'Stmk. GL Mürz', 'stfv', '231508', 26),
    ('at-st-gebietsliga-enns', 'Gebietsliga Enns', 'Stmk. GL Enns', 'stfv', '231512', 27)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'AT'
on conflict (slug) do nothing;
