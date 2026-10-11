-- Hrvaška: državne lige HNS (HNL, Prva NL, Druga NL) z vira HNS Semafor.
--
-- Pregled pokritosti (12. 10. 2026) je pokazal, da imamo vse županijske lige
-- in Treće NL, nimamo pa vrha: `scripts/hrvaske-lige.mjs` je vse s
-- "SuperSport" v imenu izpustil (sponzor nosi tudi HNK in HMNL). Zapisnik je
-- isti kot pri Treći NL. Klubi, ki so lani igrali Trećo NL (NK Koprivnica,
-- Inker, Slavonija Požega, Zagora), so isti klubi (napredovali; letos niso v
-- nobeni Treći NL) — ni trka imen.
--
-- Vse se vpišejo NEAKTIVNE; arhiv je sezona 2025/26 (id v CLAUDE.md).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hns', v.koda, 1, v.vrstni, 6, false,
       'HNS Semafor', 'https://semafor.hns.family/natjecanja/' || v.koda || '/x/'
  from countries d
  cross join (values
    ('hr-hnl', 'SuperSport HNL', 'HNL', '114137140', -3),
    ('hr-1nl', 'SuperSport Prva NL', '1. NL', '114348034', -2),
    ('hr-2nl', 'SuperSport Druga NL', '2. NL', '114348039', -1)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'hns'
 where d.code = 'HR'
on conflict (slug) do nothing;
