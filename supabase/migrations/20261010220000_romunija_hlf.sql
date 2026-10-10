-- Romunija: lige z vira `hlf` (hailafotbal.ro, uradna platforma FRF).
--
-- Šifra lige je pot strani brez kroga (`judetean/<județ>/fotbal/<sezona>/…`
-- ali `national/fotbal/…`). Seznam izpiše `node scripts/hailafotbal-lige.mjs`.
-- Digitalni zapisniki so šele od 2026/27, zato arhiva ni: cene dajo minute
-- tekoče sezone.
--
-- Podatke imajo le državna raven (SuperLiga pri LPF, Liga 2 in 3 pri FRF) in
-- osem županij (pregled vseh 41 + Bukarešta, 10. 10. 2026). Vpisane so lige,
-- katerih zadnji odigrani krog ima večinoma polne zapisnike. Ni vpisanih:
-- Bihor Liga 5 (obe seriji), Sibiu Liga 4 in Liga 5 (zapisniki nepopolni ali
-- prazni — ro-sb-l4 in ro-sb-l5-medias ostaneta na viru frf), Galați (krogi
-- brez izidov), Prahova Liga 6 in Caraș-Severin (še nič odigranega).
--
-- Vse lige so NEAKTIVNE; vklop po uvozu, cenah in pripravljenosti.

do $$
begin
  if not exists (select 1 from countries where code = 'RO') then
    raise exception 'država RO manjka — najprej migracija 20261010190000_romunija';
  end if;
end $$;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.url, v.vrstni
  from countries d
  cross join (values
    ('lpf', 'Liga Profesionistă de Fotbal', 'LPF', 'https://hailafotbal.ro/rezultate', 790),
    ('frf', 'Federația Română de Fotbal', 'FRF', 'https://hailafotbal.ro/rezultate', 791),
    ('ajf-alba', 'AJF Alba', 'Alba', 'https://hailafotbal.ro/rezultate/judetean/alba', 808),
    ('ajf-bihor', 'AJF Bihor', 'Bihor', 'https://hailafotbal.ro/rezultate/judetean/bihor', 809),
    ('ajf-cluj', 'AJF Cluj', 'Cluj', 'https://hailafotbal.ro/rezultate/judetean/cluj', 810),
    ('ajf-hunedoara', 'AJF Hunedoara', 'Hunedoara', 'https://hailafotbal.ro/rezultate/judetean/hunedoara', 811),
    ('ajf-prahova', 'AJF Prahova', 'Prahova', 'https://hailafotbal.ro/rezultate/judetean/prahova', 812)
  ) as v(koda, ime, kratko, url, vrstni)
 where d.code = 'RO'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hlf', v.koda, 1, v.vrstni, 6, false,
       'Hai la fotbal (FRF)', 'https://hailafotbal.ro/rezultate/' || v.koda
  from countries d
  cross join (values
    ('ro-superliga', 'SuperLiga', 'SuperLiga', 'lpf', 'national/fotbal/2026-2027/superliga/sezon-regular/serie-1', 1),
    ('ro-liga2', 'Liga 2', 'Liga 2', 'frf', 'national/fotbal/2026-2027/liga-2-casa-pariurilor/sezon-regular/seria-1', 1),
    ('ro-liga3-s1', 'Liga 3 Seria 1', 'Liga 3 S1', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1', 2),
    ('ro-liga3-s2', 'Liga 3 Seria 2', 'Liga 3 S2', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-2', 3),
    ('ro-liga3-s3', 'Liga 3 Seria 3', 'Liga 3 S3', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-3', 4),
    ('ro-liga3-s4', 'Liga 3 Seria 4', 'Liga 3 S4', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-4', 5),
    ('ro-liga3-s5', 'Liga 3 Seria 5', 'Liga 3 S5', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-5', 6),
    ('ro-liga3-s6', 'Liga 3 Seria 6', 'Liga 3 S6', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-6', 7),
    ('ro-liga3-s7', 'Liga 3 Seria 7', 'Liga 3 S7', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-7', 8),
    ('ro-liga3-s8', 'Liga 3 Seria 8', 'Liga 3 S8', 'frf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-8', 9),
    ('ro-ab-superliga', 'SuperLiga AJF Alba', 'AB SuperLiga', 'ajf-alba', 'judetean/alba/fotbal/2026-2027/superliga-ajf-alba/sezon-regular/1', 1),
    ('ro-ab-l4-s1', 'Liga 4 Seria 1 (Alba)', 'AB L4 S1', 'ajf-alba', 'judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-1', 2),
    ('ro-ab-l4-s2', 'Liga 4 Seria 2 (Alba)', 'AB L4 S2', 'ajf-alba', 'judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2', 3),
    ('ro-ab-l5-s1', 'Liga 5 Seria 1 (Alba)', 'AB L5 S1', 'ajf-alba', 'judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-1', 4),
    ('ro-ab-l5-s2', 'Liga 5 Seria 2 (Alba)', 'AB L5 S2', 'ajf-alba', 'judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2', 5),
    ('ro-bh-l4', 'Liga 4 (Bihor)', 'BH L4', 'ajf-bihor', 'judetean/bihor/fotbal/2026-2027/liga-4/sezon-regular/tur-preliminar', 1),
    ('ro-cj-l4', 'Liga 4 (Cluj)', 'CJ L4', 'ajf-cluj', 'judetean/cluj/fotbal/2026-2027/liga-4-cluj/sezon-regular/grupa-a', 1),
    ('ro-cj-l5-g1', 'Liga 5 Grupa 1 (Cluj)', 'CJ L5 G1', 'ajf-cluj', 'judetean/cluj/fotbal/2026-2027/liga-5-cluj-grupa-1/sezon-regular/grupa-1', 2),
    ('ro-cj-l5-g2', 'Liga 5 Grupa 2 (Cluj)', 'CJ L5 G2', 'ajf-cluj', 'judetean/cluj/fotbal/2026-2027/liga-5-cluj-grupa-2/sezon-regular/grupa-2', 3),
    ('ro-cj-l5-gherla', 'Liga 5 Gherla (Cluj)', 'CJ L5 Gherla', 'ajf-cluj', 'judetean/cluj/fotbal/2026-2027/liga-5-gherla/sezon-regular/grupa-a', 4),
    ('ro-cj-l5-dej', 'Liga 5 Dej (Cluj)', 'CJ L5 Dej', 'ajf-cluj', 'judetean/cluj/fotbal/2026-2027/liga-5-dej/sezon-regular/grupa-a', 5),
    ('ro-cj-l5-campia-turzii', 'Liga 5 Câmpia Turzii (Cluj)', 'CJ L5 C. Turzii', 'ajf-cluj', 'judetean/cluj/fotbal/2026-2027/liga-5-campia-turzii/sezon-regular/grupa-a', 6),
    ('ro-hd-l4', 'Liga 4 (Hunedoara)', 'HD L4', 'ajf-hunedoara', 'judetean/hunedoara/fotbal/2026-2027/liga-4/sezon-regular/serie-1', 1),
    ('ro-hd-l5', 'Liga 5 (Hunedoara)', 'HD L5', 'ajf-hunedoara', 'judetean/hunedoara/fotbal/2026-2027/liga-5/campionat/serie-1', 2),
    ('ro-ph-l4', 'Liga 4 (Prahova)', 'PH L4', 'ajf-prahova', 'judetean/prahova/fotbal/2026-2027/liga-a-4-a-prahova/sezon-regular/serie-1', 1),
    ('ro-sb-superliga', 'SuperLiga (Sibiu)', 'SB SuperLiga', 'ajf-sibiu', 'judetean/sibiu/fotbal/2026-2027/superliga/sezon-regular/serie-1', 0)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'RO'
on conflict (slug) do nothing;
