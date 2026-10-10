-- Romunija: prve lige županijskih zvez (AJF) z vira `frf` (www.frf-ajf.ro).
--
-- Šifra lige je `<judet>/<slug>-<id>` sezone 2026/27; arhivi 2025/26 so v
-- CLAUDE.md (Romunija — vir `frf`) in se uvozu podajo z `arhiv=`. Seznam
-- tekmovanj županije izpiše `node scripts/romunske-lige.mjs <judet>`.
--
-- Zapisnik nima dresov, vratarja ne pozicij: pozicije (tudi GK) določi
-- glasovanje skupnosti. Pogoji portala prepovedujejo reprodukcijo brez
-- pisnega dovoljenja — prošnja je poslana. Vse lige so NEAKTIVNE in ostanejo
-- take, dokler dovoljenja ni.
--
-- Ni vpisanih: Prahova in Ialomița (zapisnik našteje le igralce z dogodki,
-- postav ni), Liga IV Vâlcea (zapisniki prazni) — glej CLAUDE.md.
--
-- Država RO pride z migracijo 20261010190000_romunija.

do $$
begin
  if not exists (select 1 from countries where code = 'RO') then
    raise exception 'država RO manjka — najprej migracija 20261010190000_romunija';
  end if;
end $$;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, 'https://www.frf-ajf.ro/' || v.judet, v.vrstni
  from countries d
  cross join (values
    ('ajf-arges', 'AJF Argeș', 'Argeș', 'arges', 801),
    ('ajf-bistrita-nasaud', 'AJF Bistrița-Năsăud', 'Bistrița-Năsăud', 'bistrita-nasaud', 802),
    ('ajf-botosani', 'AJF Botoșani', 'Botoșani', 'botosani', 803),
    ('ajf-galati', 'AJF Galați', 'Galați', 'galati', 804),
    ('ajf-sibiu', 'AJF Sibiu', 'Sibiu', 'sibiu', 805),
    ('ajf-timis', 'AJF Timiș', 'Timiș', 'timis', 806),
    ('ajf-valcea', 'AJF Vâlcea', 'Vâlcea', 'valcea', 807)
  ) as v(koda, ime, kratko, judet, vrstni)
 where d.code = 'RO'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'frf', v.koda, 1, v.vrstni, 6, false,
       'AJF ' || f.short_name, 'https://www.frf-ajf.ro/' || split_part(v.koda, '/', 1) || '/competitii-fotbal/' || split_part(v.koda, '/', 2)
  from countries d
  cross join (values
    ('ro-ag-l5-centru', 'Liga 5 Centru (Argeș)', 'AG L5 Centru', 'ajf-arges', 'arges/liga-5-centru-16780', 1),
    ('ro-ag-l5-nord', 'Liga 5 Nord (Argeș)', 'AG L5 Nord', 'ajf-arges', 'arges/liga-5-nord-16691', 2),
    ('ro-ag-l5-sud', 'Liga 5 Sud (Argeș)', 'AG L5 Sud', 'ajf-arges', 'arges/liga-5-sud-16692', 3),
    ('ro-bn-l4', 'Liga 4 (Bistrița-Năsăud)', 'BN L4', 'ajf-bistrita-nasaud', 'bistrita-nasaud/liga-4-16002', 1),
    ('ro-bt-l4', 'Liga a IV-a Givova (Botoșani)', 'BT L4', 'ajf-botosani', 'botosani/liga-a-iv-a-givova-16401', 1),
    ('ro-gl-l4', 'Liga a IV-a (Galați)', 'GL L4', 'ajf-galati', 'galati/liga-a-iv-a-16549', 1),
    ('ro-sb-l4', 'Liga 4 (Sibiu)', 'SB L4', 'ajf-sibiu', 'sibiu/liga-4-16532', 1),
    ('ro-sb-l5-medias', 'Liga 5 Seria Mediaș (Sibiu)', 'SB L5 Mediaș', 'ajf-sibiu', 'sibiu/liga-5-seria-medias-16568', 2),
    ('ro-tm-l4', 'Liga a IV-a (Timiș)', 'TM L4', 'ajf-timis', 'timis/liga-a-iv-a-16445', 1),
    ('ro-vl-l5', 'Liga a V-a (Vâlcea)', 'VL L5', 'ajf-valcea', 'valcea/liga-a-v-a-16574', 1),
    ('ro-vl-l6-nord', 'Liga a VI-a Seria Nord (Vâlcea)', 'VL L6 Nord', 'ajf-valcea', 'valcea/liga-a-vi-a-seria-nord-16615', 2),
    ('ro-vl-l6-sud', 'Liga a VI-a Seria Sud (Vâlcea)', 'VL L6 Sud', 'ajf-valcea', 'valcea/liga-a-vi-a-seria-sud-16618', 3)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'RO'
on conflict (slug) do nothing;
