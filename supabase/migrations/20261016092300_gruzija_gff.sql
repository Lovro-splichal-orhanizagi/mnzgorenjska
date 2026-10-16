-- Gruzija: država GE, zveza GFF in Liga 3 ter Liga 4 (raven 3 in 4) z vira
-- `gff` (liga.gff.ge). Šifra lige je `<sezona>/<liga>` — id sezone iz
-- izbirnika strani (44 = 2026) in id lige (3 = Liga 3, 4 = Liga 4); glej
-- scripts/viri/gff.mjs in CLAUDE.md (Gruzija — vir gff).
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"). Arhiv 2025 se
-- uvozu poda z `arhiv=`: Liga 3 `41/3`, Liga 4 `41/4` (2024: `38/3`, `38/4`).
--
-- Vmesnika v gruzinščini še ni in GE ni v matriki nočnega uvoza; lige so
-- NEAKTIVNE (vklop po uvozu arhiva, razporeda, zapisnikov in cen).

insert into countries (code, name, sort_order) values ('GE', 'საქართველო', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'gff', 'საქართველოს ფეხბურთის ფედერაცია', 'GFF', 'https://gff.ge/', 1401
  from countries d
 where d.code = 'GE'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'gff', v.koda, 1, v.vrstni, 6, false,
       'GFF', 'https://liga.gff.ge/results?season=' || split_part(v.koda, '/', 1) || '&league=' || split_part(v.koda, '/', 2), true
  from countries d
  join federations f on f.code = 'gff'
  cross join (values
    ('ge-liga-3', 'ლიგა 3', 'ლიგა 3', '44/3', 1),
    ('ge-liga-4', 'ლიგა 4', 'ლიგა 4', '44/4', 2)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'GE'
on conflict (slug) do nothing;
