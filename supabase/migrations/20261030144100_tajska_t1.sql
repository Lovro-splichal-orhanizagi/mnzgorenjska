-- Tajska: Thai League 1 (raven 1, 16 klubov) z istega vira `thaileague` kot T2
-- in T3. Šifra 2026/27 je `224/1202`, arhiv 2025/26 `207/1051` (uvozu z
-- `arhiv=`). Ostalo (vmesnik, pošta, nočni uvoz) ima država TH že.
--
-- NEAKTIVNA.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select 'th-t1', 'Thai League 1', 'T1', d.id, f.id, 'thaileague', '224/1202', 1, 0, 6, false,
       'Thai League', 'https://thaileague.co.th/results'
  from countries d
  join federations f on f.code = 'thaileague'
 where d.code = 'TH'
on conflict (slug) do nothing;
