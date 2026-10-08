-- Češka: prve lige z vira FAČR (IS FAČR, vir `facr`), štiri okrajne zveze.
--
-- Okresní přebor (8. liga) in III. třída (9. liga, po skupinah) okrajev
-- Benešov, Brno-venkov, Praha-východ in Plzeň-jih. Šifra lige je UUID
-- tekmovanja v IS FAČR (isti kot www.fotbal.cz/souteze/turnaje/hlavni/<UUID>);
-- arhiv 2025/26 ima svoj UUID, zapisan v CLAUDE.md (Češka).
--
-- Vse se vpišejo NEAKTIVNE; vklopi se liga po ligi, ko ima uvožen arhiv,
-- razpored, zapisnike in cene. Kratko ime je v državi enolično: oznaka okraja
-- (BN, BO, PH, PJ) in raven.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, 'https://www.fotbal.cz/', v.vrstni
  from countries d
  cross join (values
    ('ofs-benesov', 'OFS Benešov', 'Benešov', 301),
    ('ofs-brno-venkov', 'OFS Brno-venkov', 'Brno-venkov', 302),
    ('ofs-praha-vychod', 'OFS Praha-východ', 'Praha-východ', 303),
    ('ofs-plzen-jih', 'OFS Plzeň-jih', 'Plzeň-jih', 304)
  ) as v(koda, ime, kratko, vrstni)
 where d.code = 'CZ'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'facr', v.koda, 1, v.vrstni, 6, false,
       'IS FAČR', 'https://www.fotbal.cz/souteze/turnaje/hlavni/' || v.koda
  from countries d
  cross join (values
    ('cz-bn-op', 'Okresní přebor Benešov', 'BN OP', 'ofs-benesov', 'cf517b12-b1ec-414d-bea3-1326e9b0d156', 1),
    ('cz-bn-3a', 'III. třída Benešov, sk. A', 'BN III. A', 'ofs-benesov', '696d3dfb-01c0-4b17-b0e5-de472b873f29', 2),
    ('cz-bn-3b', 'III. třída Benešov, sk. B', 'BN III. B', 'ofs-benesov', '96b956df-d0be-4090-95d1-d587d80fcf52', 3),
    ('cz-bo-op', 'Okresní přebor Brno-venkov', 'BO OP', 'ofs-brno-venkov', '640ad2e8-c3bd-4fb7-92d2-dbb9637dfbe6', 1),
    ('cz-bo-3a', 'III. třída Brno-venkov, sk. A', 'BO III. A', 'ofs-brno-venkov', '326544ca-ff0f-4694-92e2-daee48f7e170', 2),
    ('cz-bo-3b', 'III. třída Brno-venkov, sk. B', 'BO III. B', 'ofs-brno-venkov', '65736e4c-ee9b-42d8-b0d9-ae23b299e000', 3),
    ('cz-ph-op', 'Okresní přebor Praha-východ', 'PH OP', 'ofs-praha-vychod', 'e62b1d0c-00ce-4299-b8cc-e9acfc341d8d', 1),
    ('cz-ph-3a', 'III. třída Praha-východ, sk. A', 'PH III. A', 'ofs-praha-vychod', 'cda51ba4-6a81-4c3d-80c3-95d302cb0cfc', 2),
    ('cz-ph-3b', 'III. třída Praha-východ, sk. B', 'PH III. B', 'ofs-praha-vychod', 'e9d912c6-986b-41a5-ac5b-e3a320a5ebab', 3),
    ('cz-pj-op', 'Okresní přebor Plzeň-jih', 'PJ OP', 'ofs-plzen-jih', '2065a536-0645-4d7f-a784-e07227ade9d8', 1),
    ('cz-pj-3z', 'III. třída Plzeň-jih, sk. Západ', 'PJ III. Z', 'ofs-plzen-jih', '4e322683-eeac-48e5-abda-284f2576448c', 2),
    ('cz-pj-3v', 'III. třída Plzeň-jih, sk. Východ', 'PJ III. V', 'ofs-plzen-jih', '3174430a-b5de-4c78-b65c-1b2617bda0fb', 3)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'CZ'
on conflict (slug) do nothing;
