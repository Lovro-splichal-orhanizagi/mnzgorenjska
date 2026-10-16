-- Moldavija: država MD, zveza FMF in lige z vira `fmf` (fmf.md, zapisniki COMET
-- kot PDF). Šifra lige je `<slug>/<competition>` (glej scripts/viri/fmf.mjs);
-- vsaka sezona in faza je svoje tekmovanje, ob novi se šifra popravi.
--
-- Liga 1 (raven 2) v fazi 1 igra v dveh skupinah (A 6 klubov, B 5 klubov,
-- trikrožno, 15 krogov), Liga 2 (raven 3) v eni skupini s 15 klubi (30 krogov).
-- Super Liga (Liga 7777) NI vpisana: sezona 2026/27 se je začela 27. 6. 2026,
-- pred mejo sezone 1. julija (glej CLAUDE.md, Moldavija). Arhiva ni: zapisniki
-- 2025/26 so v starejši predlogi "Analyticom", ki je vir ne bere.
--
-- Vmesnika v romunščini za Moldavijo še ni; lige so NEAKTIVNE.

insert into countries (code, name, sort_order) values ('MD', 'Moldova', 16) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'fmf', 'Federația Moldovenească de Fotbal', 'FMF', 'https://www.fmf.md/', 1601
  from countries d
 where d.code = 'MD'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fmf', v.koda, 1, v.vrstni, 6, false,
       'FMF', 'https://www.fmf.md/home/competitii/masculin/' || split_part(v.koda, '/', 1)
  from countries d
  join federations f on f.code = 'fmf'
  cross join (values
    ('md-liga-1-a', 'Liga 1 Grupa A', 'Liga 1 A', 'liga-1-faza-1-grupa-a-1783092701/878', 1),
    ('md-liga-1-b', 'Liga 1 Grupa B', 'Liga 1 B', 'liga-1-faza-1-grupa-b-1783092819/879', 2),
    ('md-liga-2', 'Liga 2', 'Liga 2', 'liga-2-1782306996/877', 3)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'MD'
on conflict (slug) do nothing;
