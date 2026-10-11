-- Slovaške mladinske lige (U19, starší dorast) zunaj SsFZ: državna I. in II.
-- liga, BFZ, ZsFZ, VsFZ in okresi pod njimi — 34 lig z vsaj šestimi klubi.
--
-- Izpuščeni: Košice-okolie (MINI U19, 4 klubi), Michalovce (4), Rožňava (5),
-- Trebišov (4), Poprad (5. liga "malé mužstvo 8+1" — ni 11 na 11); U17 in
-- mlajši, dorastenke (WU19), futsal. Zveze vpiše 20261012151100.
--
-- Kot ostale U19: prvi_fantasy_krog = 2, rok_pomak_ur = 2. Klub je skupen s
-- člani (ekipa U19 nosi ime kluba). Vpisane NEAKTIVNE.

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'sportnet', v.koda, 2, v.vrstni, 2, false,
       'futbalnet.sk', 'https://sportnet.sme.sk/futbalnet/z/' || v.zveza || '/'
  from countries d
  cross join (values
    ('sk-sfz-u19-1liga', 'I. liga starší dorast U19', 'SFZ U19 I.', 'sfz', 'futbalsfz.sk/6a0da2685736165c0ec8545b', 21),
    ('sk-sfz-u19-2liga-zapad', 'II. liga starší dorast U19 Západ', 'SFZ U19 II. Z', 'sfz', 'futbalsfz.sk/6a0da4525736165c0ecc3551/6a17407fc9a61a70ee926749', 22),
    ('sk-sfz-u19-2liga-vychod', 'II. liga starší dorast U19 Východ', 'SFZ U19 II. V', 'sfz', 'futbalsfz.sk/6a0da4525736165c0ecc3551/6a174094c9a61a70ee92674a', 23),
    ('sk-bfz-u19-3liga', 'III. liga U19 — BFZ', 'BFZ U19 III.', 'bfz', 'BFZ/6a12024444ff24612e986fe3', 21),
    ('sk-bav-u19', 'IV. liga dorast U19 — Bratislava-vidiek', 'BAV U19', 'obfz-bratislava-vidiek', 'BA-vidiek/6a310851e4bf12152494c907', 21),
    ('sk-zsfz-u19-3liga-sz', 'III. liga U19 Severozápad — ZsFZ', 'ZsFZ U19 III. SZ', 'zsfz', 'ZsFZ/6a0ff3605736165c0e429b58/6a0ff3603bff416b52e1d025', 21),
    ('sk-zsfz-u19-3liga-jv', 'III. liga U19 Juhovýchod — ZsFZ', 'ZsFZ U19 III. JV', 'zsfz', 'ZsFZ/6a0ff3605736165c0e429b58/6a0ff3603bff416b52e1d024', 22),
    ('sk-zsfz-u19-4liga-a', 'IV. liga U19 A — ZsFZ', 'ZsFZ U19 IV. A', 'zsfz', 'ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02d', 23),
    ('sk-zsfz-u19-4liga-b', 'IV. liga U19 B — ZsFZ', 'ZsFZ U19 IV. B', 'zsfz', 'ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02b', 24),
    ('sk-zsfz-u19-4liga-c1', 'IV. liga U19 C1 — ZsFZ', 'ZsFZ U19 IV. C1', 'zsfz', 'ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02a', 25),
    ('sk-zsfz-u19-4liga-c2', 'IV. liga U19 C2 — ZsFZ', 'ZsFZ U19 IV. C2', 'zsfz', 'ZsFZ/6a0ff3a55736165c0e43378a/6a46147fc89d6650f060c7e2', 26),
    ('sk-zsfz-u19-4liga-d', 'IV. liga U19 D — ZsFZ', 'ZsFZ U19 IV. D', 'zsfz', 'ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d02c', 27),
    ('sk-zsfz-u19-4liga-e', 'IV. liga U19 E — ZsFZ', 'ZsFZ U19 IV. E', 'zsfz', 'ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d029', 28),
    ('sk-zsfz-u19-4liga-f', 'IV. liga U19 F — ZsFZ', 'ZsFZ U19 IV. F', 'zsfz', 'ZsFZ/6a0ff3a55736165c0e43378a/6a0ff3a53bff416b52e1d028', 29),
    ('sk-nz-u19', 'V. liga dorast U19 — Nové Zámky', 'NZ U19', 'obfz-nove-zamky', 'ObFZ-Nove-Zamky/6a1de75844ff24612e865cdf', 21),
    ('sk-tt-u19', 'V. liga U19 — Trnava', 'TT U19', 'obfz-trnava', 'ObFZ-Trnava/6a26f0b5233cdeb1e7c2a346', 21),
    ('sk-tn-u19', 'V. liga U19 — Trenčín', 'TN U19', 'obfz-trencin', 'ObFZTrencin/6a217bfc233cdeb1e76636a7', 21),
    ('sk-ds-u19', 'V. liga dorast U19 — Dunajská Streda', 'DS U19', 'obfz-dunajska-streda', 'obfz-dunajska-streda/6a17fb8444ff24612ecef142', 21),
    ('sk-ga-u19', 'Starší dorast U19 — Galanta', 'GA U19', 'obfz-galanta', 'obfz-galanta.futbalnet.sk/6a2c0875e4bf121524a4b3ba', 21),
    ('sk-pb-u19', '5. liga dorast U19 — Považská Bystrica', 'PB U19', 'obfz-povazska-bystrica', 'obfz-povazska-bystrica.futbalnet.sk/6a0ea8575736165c0ead9c38', 21),
    ('sk-pd-u19', 'V. liga U19 — Prievidza', 'PD U19', 'obfz-prievidza', 'obfz-prievidza/6a1895fa44ff24612efadd4c', 21),
    ('sk-vsfz-u19-3liga-a', 'III. liga dorast U19 A — VsFZ', 'VsFZ U19 III. A', 'vsfz', 'VsFZ/6a0f0c905736165c0e67cffd/6a1415883bff416b52e1d814', 21),
    ('sk-vsfz-u19-3liga-b', 'III. liga dorast U19 B — VsFZ', 'VsFZ U19 III. B', 'vsfz', 'VsFZ/6a0f0c905736165c0e67cffd/6a3910eb0b755716bcd9c05a', 22),
    ('sk-vsfz-u19-4liga-kg', 'IV. liga dorast U19 KG — VsFZ', 'VsFZ U19 IV. KG', 'vsfz', 'VsFZ/6a0f0cee5736165c0e68aac6', 23),
    ('sk-vsfz-u19-4liga-pt', 'IV. liga dorast U19 PT — VsFZ', 'VsFZ U19 IV. PT', 'vsfz', 'VsFZ/6a0f0d485736165c0e6977ab', 24),
    ('sk-vsfz-u19-4liga-sarisska', 'IV. liga dorast U19 Š — VsFZ', 'VsFZ U19 IV. Š', 'vsfz', 'VsFZ/6a0f0d2b5736165c0e693c5b', 25),
    ('sk-vsfz-u19-4liga-vd', 'IV. liga dorast U19 VD — VsFZ', 'VsFZ U19 IV. VD', 'vsfz', 'VsFZ/6a0f0ccb5736165c0e6859bd', 26),
    ('sk-vsfz-u19-4liga-z', 'IV. liga dorast U19 Z — VsFZ', 'VsFZ U19 IV. Z', 'vsfz', 'VsFZ/6a0f0d145736165c0e68fd63', 27),
    ('sk-po-u19-5liga', '5. liga dorast U19 — Prešov', 'PO U19 5.', 'obfz-presov', 'ObFZ-Presov/6a22a78d233cdeb1e72a3aa4', 21),
    ('sk-po-u19-6liga', '6. liga dorast U19 — Prešov', 'PO U19 6.', 'obfz-presov', 'ObFZ-Presov/6a22a7bc233cdeb1e72a7d80', 22),
    ('sk-bj-u19', 'V. liga dorast U19 — Bardejov', 'BJ U19', 'obfz-bardejov', 'obfz-bardejov.futbalnet.sk/6a1e693444ff24612e3bf23d', 21),
    ('sk-vt-u19', 'V. liga dorast U19 — Vranov nad Topľou', 'VT U19', 'obfz-vranov-nad-toplou', 'obfz-vranov-nad-toplou.futbalnet.sk/6a1e8e4644ff24612e87dee7', 21),
    ('sk-sk-u19', '5. liga dorast U19 — Svidník', 'SK U19', 'ondavsky-oblastny-futbalovy-zvaz', 'ondavsky-futbalovy-zvaz.futbalnet.sk/6a1d3d3a44ff24612e4977db', 21),
    ('sk-sn-u19', 'V. liga dorast U19 — Spišská Nová Ves', 'SN U19', 'sofz-spisska-nova-ves', 'sofz-spisska-nova-ves.futbalnet.sk/6a2ffd43e4bf1215247b525e', 21)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'SK'
on conflict (slug) do nothing;
