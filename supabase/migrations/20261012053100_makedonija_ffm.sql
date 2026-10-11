-- Severna Makedonija: država MK, zveza FFM in lige z vira `ffm` (ffm.mk,
-- zapisniki COMET). Šifra lige je slug strani lige sezone 2026/27; arhivi so v
-- CLAUDE.md (Severna Makedonija — vir ffm) in se uvozu podajo z `arhiv=`.
--
-- Člani: Prva MFL, Vtora MFL in regijske lige Region 1–6 (od 2026/27 namesto
-- Treta liga). Mladinci (U19): Mladinska Super liga in Vtora mladinska liga —
-- igralci so mladoletni (glej CLAUDE.md).
--
-- Vmesnika v makedonščini še ni; lige so NEAKTIVNE (in tudi sicer do uvoza in cen).

insert into countries (code, name, sort_order) values ('MK', 'Северна Македонија', 13) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'ffm', 'Фудбалска федерација на Македонија', 'ФФМ', 'https://www.ffm.mk/', 1101
  from countries d
 where d.code = 'MK'
on conflict (code) do nothing;

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
    ('mk-prva-mfl', 'Прва МФЛ', 'Прва МФЛ', 'prva-mfl27', 1, 6, 1),
    ('mk-vtora-mfl', 'Втора МФЛ', 'Втора МФЛ', 'vtora-mfl-26-27', 2, 6, 1),
    ('mk-region-1', 'Регион 1', 'Регион 1', 'region-1-sezona-26-27', 3, 6, 1),
    ('mk-region-2', 'Регион 2', 'Регион 2', 'region-2-sezona-26-27', 4, 6, 1),
    ('mk-region-3', 'Регион 3', 'Регион 3', 'region-3-sezona-26-27', 5, 6, 1),
    ('mk-region-4', 'Регион 4', 'Регион 4', 'region-4-sezona-26-27', 6, 6, 1),
    ('mk-region-5', 'Регион 5', 'Регион 5', 'region-5-sezona-26-27', 7, 6, 1),
    ('mk-region-6', 'Регион 6', 'Регион 6', 'region-6-sezona-26-27', 8, 6, 1),
    -- U19: tekme so pogosto dopoldne (10:00), zato rok 2 h prej, in prvi
    -- fantasy krog 2 kot pri slovenskih mladincih.
    ('mk-u19-super', 'Младинска Супер лига', 'Младинска СЛ', 'mladinska-super-liga-26-27', 9, 2, 2),
    ('mk-u19-vtora', 'Втора младинска лига', 'Втора младинска', 'vtora-mladinska-liga-26-27', 10, 2, 2)
  ) as v(slug, ime, kratko, koda, vrstni, pomak, prvi)
 where d.code = 'MK'
on conflict (slug) do nothing;
