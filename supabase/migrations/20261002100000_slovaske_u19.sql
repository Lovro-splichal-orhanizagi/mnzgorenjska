-- Slovaške mladinske lige (U19, starší dorast) v SsFZ in okresih pod njim.
--
-- 15 lig: III., IV. in V. liga U19 SsFZ po skupinah ter okresne U19 lige
-- (Banská Bystrica, Turiec, Kysuce, Lučenec, Veľký Krtíš, Žilina, Orava).
-- Liptov, Žiar nad Hronom, Zvolen in Rimavská Sobota U19 lige to sezono
-- nimajo (ali je na futbalnetu ni). U17, WU19 in žiaci izpuščeni.
-- Seznam: `node scripts/slovaske-lige.mjs ssfz --dorast`.
--
-- Ekipe U19 na Sportnetu nosijo ime kluba (organizacije), zato se igralci
-- vežejo na iste klube kot člani — klub je skupen, igralec pa ima v vsaki
-- ligi svojo vrstico (CLAUDE.md, Dve ligi).
--
-- Kot slovenske mladinske lige: prvi_fantasy_krog = 2 (prehodi med člane na
-- začetku sezone), rok_pomak_ur = 2 (dopoldanske tekme). Vpisane NEAKTIVNE;
-- vklop šele po uvozu arhiva, sezone in cen (`varovalo_vklopa_lige`).
--
-- Arhivi 2025/26 (za uvoz, ne za to migracijo): III. liga U19 je bila lani
-- ena skupina (SsFZ/6845ff8aeba10c40f7c7bb72/6845ff8a95d7b92f7c56b68b) —
-- arhiv obeh današnjih skupin; Žilina enako (obfz-zilina/6885f88f2d2a8412
-- 7229034f/6885f97fbf40937d07642a3e); Lučenec lani tekem ni imel.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'sportnet', v.koda, 2, v.vrstni, 2, false,
       'futbalnet.sk', 'https://sportnet.sme.sk/futbalnet/z/' || v.zveza || '/'
  from countries d
  cross join (values
    ('sk-ssfz-u19-3liga-sever', 'III. liga U19 Sever — SsFZ', 'SsFZ U19 III. S', 'ssfz', 'SsFZ/6a19538944ff24612e68916b/6a195389b5f9fd8631502f3f', 21),
    ('sk-ssfz-u19-3liga-juh', 'III. liga U19 Juh — SsFZ', 'SsFZ U19 III. J', 'ssfz', 'SsFZ/6a19538944ff24612e68916b/6a3d73d05a99fcd8c41eda24', 22),
    ('sk-ssfz-u19-4liga-sever', 'IV. liga U19 Sever — SsFZ', 'SsFZ U19 IV. S', 'ssfz', 'SsFZ/6a19541b44ff24612e6a16b3/6a19544ab5f9fd8631502f41', 23),
    ('sk-ssfz-u19-4liga-stred', 'IV. liga U19 Stred — SsFZ', 'SsFZ U19 IV. St', 'ssfz', 'SsFZ/6a19541b44ff24612e6a16b3/6a195460b5f9fd8631502f42', 24),
    ('sk-ssfz-u19-4liga-juh', 'IV. liga U19 Juh — SsFZ', 'SsFZ U19 IV. J', 'ssfz', 'SsFZ/6a19541b44ff24612e6a16b3/6a195479b5f9fd8631502f43', 25),
    ('sk-ssfz-u19-5liga-a', 'V. liga U19 A — SsFZ', 'SsFZ U19 V. A', 'ssfz', 'SsFZ/6a1954bf44ff24612e6b8e2d/6a1954d7b5f9fd8631502f53', 26),
    ('sk-ssfz-u19-5liga-b', 'V. liga U19 B — SsFZ', 'SsFZ U19 V. B', 'ssfz', 'SsFZ/6a1954bf44ff24612e6b8e2d/6a1954f0b5f9fd8631502f54', 27),
    ('sk-bb-u19', 'Dorast U19 — Banská Bystrica', 'BB U19', 'obfz-banska-bystrica', 'ObFZ-Banska-Bystrica/6a2686e5233cdeb1e7fed689', 21),
    ('sk-tfz-u19', 'Dorast U19 — Turiec', 'TFZ U19', 'turciansky-futbalovy-zvaz', 'TFZ/6a18142f44ff24612ef67628', 21),
    ('sk-ky-u19', 'Dorast U19 — Kysuce', 'KY U19', 'obfz-kysuc', 'obfz-kysuc.futbalnet.sk/6a1824e744ff24612e10ac41', 21),
    ('sk-lc-u19', 'Dorast U19 — Lučenec', 'LC U19', 'obfz-lucenec', 'obfz-lucenec.futbalnet.sk/6a2f7e7ae4bf12152489e9cc', 21),
    ('sk-vk-u19', 'Dorast U19 — Veľký Krtíš', 'VK U19', 'obfz-velky-krtis', 'obfz-velky-krtis.futbalnet.sk/6a27bb66225470a9beffd558', 21),
    ('sk-za-u19-a', 'Dorast U19 A — Žilina', 'ZA U19 A', 'obfz-zilina', 'obfz-zilina/6a4801ee97d4e73d18d8baee/6a4802235d3836e51d7eb418', 21),
    ('sk-za-u19-b', 'Dorast U19 B — Žilina', 'ZA U19 B', 'obfz-zilina', 'obfz-zilina/6a4801ee97d4e73d18d8baee/6a480a975d3836e51d7eb50f', 22),
    ('sk-or-u19', 'Dorast U19 — Orava', 'OR U19', 'oravsky-futbalovy-zvaz', 'oravsky-futbalovy-zvaz.futbalnet.sk/6a155acf44ff24612e22df52', 21)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'SK'
on conflict (slug) do nothing;
