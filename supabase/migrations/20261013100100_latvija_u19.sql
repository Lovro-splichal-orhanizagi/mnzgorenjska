-- Latvija: mladinska liga U19 Latvijas Futbola federācije (LFF) z vira `lff`
-- (lff.lv, Latvijas Jaunatnes čempionāts futbolā). Najstarejša starostna
-- skupina je U-19; leta 2026 jo igra le Elites grupa (7 klubov, 14 krogov,
-- 42 tekem, vsi zapisniki popolni). Meistarības grupa 2026 nima U-19.
--
-- Šifra lige je `jauniesi/<sekcija>/<p>` (stran /sacensibas/jauniesi/…,
-- glej scripts/viri/lff.mjs); pretekle sezone so na `<sekcija>-<leto>`
-- (arhiv 2025: `jauniesi/elites-grupa-2025/20725038`, v CLAUDE.md).
--
-- Kot ostale U19: prvi_fantasy_krog = 2, rok_pomak_ur = 2. Sezona je
-- koledarsko leto (`sezona_koledarska`). Zvezo in državo vpiše
-- 20261012030100. Vpisana NEAKTIVNA.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'lff', v.koda, 2, v.vrstni, 2, false,
       'LFF', v.url, true
  from countries d
  cross join (values
    ('lv-u19', 'Jaunatnes čempionāts U-19 Elites grupa', 'U19 Elites grupa', 'jauniesi/elites-grupa/23450990',
     'https://lff.lv/sacensibas/jauniesi/elites-grupa/?p=23450990', 21)
  ) as v(slug, ime, kratko, koda, url, vrstni)
  join federations f on f.code = 'lff'
 where d.code = 'LV'
on conflict (slug) do nothing;
