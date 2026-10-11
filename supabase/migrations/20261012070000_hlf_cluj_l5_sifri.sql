-- Cluj Liga 5 Grupa 1 in 2 (vir hlf): prava šifra ima tri vezaje
-- ("Liga 5 Cluj - Grupa 1" → "liga-5-cluj---grupa-1"). S strnjenimi vezaji je
-- stran tiho pokazala Ligo 4 Cluj in prvi uvoz (11. 10. 2026) je obema ligama
-- vpisal razpored Lige 4 (26 krogov, 156 tekem). Zapisnikov ni uvozil (so že v
-- ro-cj-l4), igralcev in točk ni. Ligi sta neaktivni: napačne kroge in tekme
-- pobrišemo, šifri popravimo, nato ju uvozimo znova.

delete from matches
 where round_id in (select r.id from rounds r join competitions c on c.id = r.competition_id
                     where c.slug in ('ro-cj-l5-g1', 'ro-cj-l5-g2') and not c.active);
delete from rounds
 where competition_id in (select id from competitions where slug in ('ro-cj-l5-g1', 'ro-cj-l5-g2') and not active);

update competitions set source_league_code = 'judetean/cluj/fotbal/2026-2027/liga-5-cluj---grupa-1/sezon-regular/grupa-1',
       vir_url = 'https://hailafotbal.ro/rezultate/judetean/cluj/fotbal/2026-2027/liga-5-cluj---grupa-1/sezon-regular/grupa-1'
 where slug = 'ro-cj-l5-g1';
update competitions set source_league_code = 'judetean/cluj/fotbal/2026-2027/liga-5-cluj---grupa-2/sezon-regular/grupa-2',
       vir_url = 'https://hailafotbal.ro/rezultate/judetean/cluj/fotbal/2026-2027/liga-5-cluj---grupa-2/sezon-regular/grupa-2'
 where slug = 'ro-cj-l5-g2';
