-- Slovaška: Stredoslovenský futbalový zväz in vseh enajst okresnih zvez pod njim.
--
-- 27 lig za odrasle moške, od IV. lige do najnižje okresne (III. trieda).
-- Seznam je izpisal `node scripts/slovaske-lige.mjs ssfz`; tekmovanje s
-- skupinami je razdeljeno po skupinah (šifra `<appSpace>/<tekmovanje>/<skupina>`).
--
-- Vse se vpišejo NEAKTIVNE; vklopi se liga po ligi, ko ima uvožen razpored,
-- zapisnike, arhiv in cene (sprožilec `varovalo_vklopa_lige`).
--
-- Vir vsake lige je futbalnet.sk s povezavo na njeno zvezo — v nogi strani
-- (VirPodatkov) ga vidi vsak obiskovalec.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.stran, v.vrstni
  from countries d
  cross join (values
    ('ssfz', 'Stredoslovenský futbalový zväz', 'SsFZ', 'https://sportnet.sme.sk/futbalnet/z/ssfz/', 101),
    ('obfz-banska-bystrica', 'ObFZ Banská Bystrica', 'Banská Bystrica', 'https://sportnet.sme.sk/futbalnet/z/obfz-banska-bystrica/', 102),
    ('turciansky-futbalovy-zvaz', 'Turčiansky futbalový zväz', 'Turiec', 'https://sportnet.sme.sk/futbalnet/z/turciansky-futbalovy-zvaz/', 103),
    ('lfz-liptovsky-mikulas', 'Liptovský futbalový zväz', 'Liptov', 'https://sportnet.sme.sk/futbalnet/z/lfz-liptovsky-mikulas/', 104),
    ('obfz-kysuc', 'ObFZ Kysúc', 'Kysuce', 'https://sportnet.sme.sk/futbalnet/z/obfz-kysuc/', 105),
    ('obfz-lucenec', 'ObFZ Lučenec', 'Lučenec', 'https://sportnet.sme.sk/futbalnet/z/obfz-lucenec/', 106),
    ('obfz-rimavska-sobota', 'ObFZ Rimavská Sobota', 'Rimavská Sobota', 'https://sportnet.sme.sk/futbalnet/z/obfz-rimavska-sobota/', 107),
    ('obfz-velky-krtis', 'ObFZ Veľký Krtíš', 'Veľký Krtíš', 'https://sportnet.sme.sk/futbalnet/z/obfz-velky-krtis/', 108),
    ('obfz-ziar-nad-hronom', 'ObFZ Žiar nad Hronom', 'Žiar nad Hronom', 'https://sportnet.sme.sk/futbalnet/z/obfz-ziar-nad-hronom/', 109),
    ('obfz-zilina', 'ObFZ Žilina', 'Žilina', 'https://sportnet.sme.sk/futbalnet/z/obfz-zilina/', 110),
    ('obfz-zvolen', 'ObFZ Zvolen', 'Zvolen', 'https://sportnet.sme.sk/futbalnet/z/obfz-zvolen/', 111),
    ('oravsky-futbalovy-zvaz', 'Oravský futbalový zväz', 'Orava', 'https://sportnet.sme.sk/futbalnet/z/oravsky-futbalovy-zvaz/', 112)
  ) as v(koda, ime, kratko, stran, vrstni)
 where d.code = 'SK'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'sportnet', v.koda, 1, v.vrstni, 6, false,
       'futbalnet.sk', 'https://sportnet.sme.sk/futbalnet/z/' || v.zveza || '/'
  from countries d
  cross join (values
    ('sk-ssfz-4liga', 'IV. liga — SsFZ', 'SsFZ IV.', 'ssfz', 'SsFZ/6a154cf844ff24612e07e083', 1),
    ('sk-ssfz-5liga-sever', 'V. liga Sever — SsFZ', 'SsFZ V. S', 'ssfz', 'SsFZ/6a193c2644ff24612e37f321/6a193c3fb5f9fd8631502df5', 2),
    ('sk-ssfz-5liga-juh', 'V. liga Juh — SsFZ', 'SsFZ V. J', 'ssfz', 'SsFZ/6a193c2644ff24612e37f321/6a193c5fb5f9fd8631502df6', 3),
    ('sk-ssfz-6liga-b', 'VI. liga B — SsFZ', 'SsFZ VI. B', 'ssfz', 'SsFZ/6a193c9344ff24612e38c297/6a193cbfb5f9fd8631502e01', 4),
    ('sk-ssfz-6liga-a', 'VI. liga A — SsFZ', 'SsFZ VI. A', 'ssfz', 'SsFZ/6a193c9344ff24612e38c297/6a193cacb5f9fd8631502e00', 5),
    ('sk-ssfz-6liga-d', 'VI. liga D — SsFZ', 'SsFZ VI. D', 'ssfz', 'SsFZ/6a193c9344ff24612e38c297/6a193cefb5f9fd8631502e03', 6),
    ('sk-ssfz-6liga-c', 'VI. liga C — SsFZ', 'SsFZ VI. C', 'ssfz', 'SsFZ/6a193c9344ff24612e38c297/6a193cd5b5f9fd8631502e02', 7),
    ('sk-bb-7liga', '7. liga — Banská Bystrica', 'BB 7.', 'obfz-banska-bystrica', 'ObFZ-Banska-Bystrica/6a26854e233cdeb1e7fbc983', 1),
    ('sk-bb-8liga', '8. liga — Banská Bystrica', 'BB 8.', 'obfz-banska-bystrica', 'ObFZ-Banska-Bystrica/6a268587233cdeb1e7fc37a0', 2),
    ('sk-tfz-1trieda', 'I. trieda — Turiec', 'TFZ I.', 'turciansky-futbalovy-zvaz', 'TFZ/6a1813b044ff24612ef5bba9', 1),
    ('sk-tfz-2trieda', 'II. trieda — Turiec', 'TFZ II.', 'turciansky-futbalovy-zvaz', 'TFZ/6a1813f844ff24612ef62593', 2),
    ('sk-lm-7liga', '7. liga — Liptov', 'LM 7.', 'lfz-liptovsky-mikulas', 'lfz-liptovsky-mikulas.futbalnet.sk/6a294e34225470a9be5c153b', 1),
    ('sk-lm-8liga', '8. liga — Liptov', 'LM 8.', 'lfz-liptovsky-mikulas', 'lfz-liptovsky-mikulas.futbalnet.sk/6a29527c225470a9be62bd38', 2),
    ('sk-lm-9liga', '9. liga — Liptov', 'LM 9.', 'lfz-liptovsky-mikulas', 'lfz-liptovsky-mikulas.futbalnet.sk/6a29560e225470a9be688f37', 3),
    ('sk-ky-7liga', '7. liga — Kysuce', 'KY 7.', 'obfz-kysuc', 'obfz-kysuc.futbalnet.sk/6a18252844ff24612e111167', 1),
    ('sk-lc-7liga', '7. liga — Lučenec', 'LC 7.', 'obfz-lucenec', 'obfz-lucenec.futbalnet.sk/6a2f7dfee4bf121524891077', 1),
    ('sk-rs-7liga', '7. liga — Rimavská Sobota', 'RS 7.', 'obfz-rimavska-sobota', 'obfz-rimavska-sobota.futbalnet.sk/6a32e82ae5a4847e6228c344', 1),
    ('sk-vk-7liga', '7. liga — Veľký Krtíš', 'VK 7.', 'obfz-velky-krtis', 'obfz-velky-krtis.futbalnet.sk/6a27bcb9225470a9be01c278', 1),
    ('sk-zh-7liga', '7. liga — Žiar nad Hronom', 'ZH 7.', 'obfz-ziar-nad-hronom', 'obfz-ziar-nad-hronom.futbalnet.sk/6a143c8944ff24612ee0974f', 1),
    ('sk-zh-8liga', '8. liga — Žiar nad Hronom', 'ZH 8.', 'obfz-ziar-nad-hronom', 'obfz-ziar-nad-hronom.futbalnet.sk/6a143cce44ff24612ee11a27', 2),
    ('sk-za-1trieda', 'I. trieda — Žilina', 'ZA I.', 'obfz-zilina', 'obfz-zilina/6a467a7d97d4e73d18fe8f44', 1),
    ('sk-za-2trieda', 'II. trieda — Žilina', 'ZA II.', 'obfz-zilina', 'obfz-zilina/6a47f53297d4e73d18c18515', 2),
    ('sk-za-3trieda', 'III. trieda — Žilina', 'ZA III.', 'obfz-zilina', 'obfz-zilina/6a47fd6797d4e73d18d13ea0', 3),
    ('sk-zv-1trieda-sever', 'I. trieda Sever — Zvolen', 'ZV I. S', 'obfz-zvolen', 'obfz-zvolen.futbalnet.sk/6a255261233cdeb1e7a53d4b/6a293946076b8e72ac234bff', 1),
    ('sk-zv-1trieda-juh', 'I. trieda Juh — Zvolen', 'ZV I. J', 'obfz-zvolen', 'obfz-zvolen.futbalnet.sk/6a255261233cdeb1e7a53d4b/6a46140fc89d6650f060c7d4', 2),
    ('sk-or-7liga', '7. liga — Orava', 'OR 7.', 'oravsky-futbalovy-zvaz', 'oravsky-futbalovy-zvaz.futbalnet.sk/6a154c8844ff24612e06f5f6', 1),
    ('sk-or-8liga', '8. liga — Orava', 'OR 8.', 'oravsky-futbalovy-zvaz', 'oravsky-futbalovy-zvaz.futbalnet.sk/6a15571244ff24612e1c797d', 2)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'SK'
on conflict (slug) do nothing;

-- Poskusna liga iz prejšnje migracije dobi isti zapis vira.
update competitions
   set vir_ime = 'futbalnet.sk',
       vir_url = 'https://sportnet.sme.sk/futbalnet/z/ssfz/'
 where slug = 'sk-ssfz-4liga' and vir_ime is null;
