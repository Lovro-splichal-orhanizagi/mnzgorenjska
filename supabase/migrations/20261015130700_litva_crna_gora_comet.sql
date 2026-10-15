-- Litva in Črna gora: lige z dveh spletišč v isti predlogi COMET (Auris),
-- skupni razčlenjevalnik scripts/viri/comet-auris.mjs (glej CLAUDE.md,
-- Litva — vir ltfutbolas, Črna gora — vir fscg).
--
-- LITVA (vir `ltfutbolas`, lietuvosfutbolas.lt): II lyga A in B divizionas
-- 2026 (raven 3). Sezona je koledarsko leto (`sezona_koledarska`, "2026"),
-- šifra lige je id tekmovanja COMET (vsaka sezona svoj). Arhiv: stran
-- tekmovanja nima izbirnika sezon in id-jev 2025 nismo našli (2022:
-- `11644164` II lyga I etapas, `13334048` / `13339888` 1–10 / 11–18 v.);
-- cene bodo iz tekoče sezone (sredi oktobra je odigranih okoli 26 od 30 krogov).
-- KAFF-MAFF III lyga 2026 (`23832343`) NI vpisana: razčlenjevalnik jo bere,
-- a klubi menjav večinoma ne vpisujejo (preizkus 15. 10. 2026: 24 od 40
-- ekip brez ene same menjave) — minute bi bile napačne.
--
-- ČRNA GORA (vir `fscg`, centar/sjever/jug.fscg.me): Treća liga v treh
-- regijah (raven 3, najnižja), sezona 2026/27. Šifra lige je
-- `<regija>/<slug>/<id tekmovanja COMET>`; ob novi sezoni stran pokaže drug
-- id in uvoz se ustavi, dokler šifre ne popraviš. Arhiv je šifra
-- `<regija>/arhiva/<id>` (stran `/takmicenja/arhiva/?cid=<id>` izriše
-- katerokoli tekmovanje COMET; id-ji iz posnetkov na web.archive.org):
-- 2025/26 Centar `centar/arhiva/8303239`, Sjever `sjever/arhiva/8327709`,
-- Jug `jug/arhiva/8373775`; 2024/25 Sjever `sjever/arhiva/7390107`, Jug
-- `jug/arhiva/7487412`. Jug ima le 7 klubov (spodnja meja: 3 iz kluba × 5).
--
-- Vse NEAKTIVNE; uvozi niso bili pognani.

insert into countries (code, name, sort_order) values ('LT', 'Lietuva', 14) on conflict (code) do nothing;
insert into countries (code, name, sort_order) values ('ME', 'Crna Gora', 15) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.name, v.short_name, v.site_url, v.sort_order
  from (values
    ('LT', 'lff-lt', 'Lietuvos futbolo federacija', 'LFF', 'https://lietuvosfutbolas.lt/', 1301),
    ('ME', 'fscg-centar', 'Udruženje klubova FSCG - Centar', 'FSCG Centar', 'https://centar.fscg.me/', 1401),
    ('ME', 'fscg-sjever', 'Udruženje klubova FSCG - Sjever', 'FSCG Sjever', 'https://sjever.fscg.me/', 1402),
    ('ME', 'fscg-jug', 'Udruženje klubova FSCG - Jug', 'FSCG Jug', 'https://jug.fscg.me/', 1403)
  ) as v(drzava, code, name, short_name, site_url, sort_order)
  join countries d on d.code = v.drzava
on conflict (code) do nothing;

-- Litva: koledarska sezona.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'ltfutbolas', v.koda, 1, v.vrstni, 6, false,
       'Lietuvos futbolas', 'https://lietuvosfutbolas.lt/varzybos/' || v.koda || '/' || v.pot || '/', true
  from countries d
  join federations f on f.code = 'lff-lt'
  cross join (values
    ('lt-2-lyga-a', 'II lyga A divizionas', 'II lyga A', '23383524', 'ii-lyga-a-div', 1),
    ('lt-2-lyga-b', 'II lyga B divizionas', 'II lyga B', '23384849', 'ii-lyga-b-div', 2)
  ) as v(slug, ime, kratko, koda, pot, vrstni)
 where d.code = 'LT'
on conflict (slug) do nothing;

-- Črna gora: sezona jesen–pomlad.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fscg', v.koda, 1, v.vrstni, 6, false,
       'FSCG', 'https://' || split_part(v.koda, '/', 1) || '.fscg.me/takmicenja/' || split_part(v.koda, '/', 2) || '/'
  from countries d
  cross join (values
    ('me-3-liga-centar', 'Regionalna liga Centar', 'Treća liga Centar', 'centar/seniorska-liga/9331975', 'fscg-centar', 1),
    ('me-3-liga-sjever', 'Prvenstvo Sjeverne regije', 'Treća liga Sjever', 'sjever/seniorska-liga/9344268', 'fscg-sjever', 2),
    ('me-3-liga-jug', 'Prvenstvo Južne regije', 'Treća liga Jug', 'jug/seniorska-liga/9391667', 'fscg-jug', 3)
  ) as v(slug, ime, kratko, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'ME'
on conflict (slug) do nothing;
