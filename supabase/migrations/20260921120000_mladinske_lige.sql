-- Mladinske lige (U19), prvi sveženj: pet lig na virih, ki že tečejo.
--
-- Gorenjski mladinci imajo 62 ekip ob 110 članskih: mladinska liga privabi
-- drugo občinstvo (igralce same, starše, trenerje) in od tam pridejo tudi
-- poznavalci. Raziskava (21. 9.): vseh pet se razčleni z obstoječimi viri,
-- vsak zapisnik nosi postavo.
--
-- Vpisane NEAKTIVNE, kot vedno: vklop šele, ko arhiv da cenik.
--
-- prvi_fantasy_krog = 2 kot pri gorenjskih mladincih: do drugega kroga se
-- še vrstijo prestopi in prehodi med člane. rok_pomak_ur = 2: mladinske
-- tekme so zjutraj in šest ur pred prvo bi rok potisnilo v noč.
--
-- 2. SML Zahod objavljata tako NZS kot MNZ Ljubljana (šifra 2002); vir je
-- nzs, ker ima stalne šifre igralcev in isto obliko kot 1. SML.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id, v.vir, v.koda, 2, v.vrstni, 2, false
  from countries d
  cross join (values
    ('sml1',        '1. SML — mladinci',       '1. SML',  'nzs',   '1-sml-eon-nextgen',        'nzs',   3),
    ('sml2-vzhod',  '2. SML Vzhod — mladinci', '2. SML V','nzs',   '2-sml-vzhod',              'nzs',   4),
    ('sml2-zahod',  '2. SML Zahod — mladinci', '2. SML Z','nzs',   '2-sml-zahod',              'nzs',   5),
    ('mb-u19',      'U19 — Maribor',           'MB U19',  'mnzmb', 'u19-mladinska-liga-26-27', 'mnzmb', 3),
    ('lj-mladinci', 'Mladinci 1. liga',        'LJ U19',  'mnzlj', '2005',                     'mnzlj', 3)
  ) as v(slug, ime, kratko, vir, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'SI'
on conflict (slug) do nothing;
