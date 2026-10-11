-- Slovaška: vse ostale lige odraslih — državna raven (SFZ), Bratislavský,
-- Západoslovenský in Východoslovenský FZ z okresi pod njimi.
--
-- 78 lig za odrasle moške (11 na 11), od Niké lige do najnižje okresne.
-- Stredoslovenský FZ je vpisan že od prej (20260926090000). Seznam je dalo
-- pometanje vseh zvez na Sportnetu (12. 10. 2026); šifra
-- `<appSpace>/<tekmovanje>[/<skupina>]`. Izpuščeni: pokali, ženske, futsal,
-- mladinske, kvalifikacije in lige z manj kot šestimi klubi (Prievidza IX.
-- liga A, 5 klubov). MFZ Košice lig odraslih nima (klubi igrajo pri okolici
-- in VsFZ), zato zveze ni.
--
-- Niké liga ima šifro z delom "Základná časť": nadstavba (o titul, o
-- obstanek) je v istem tekmovanju z novimi deli in krogi spet od 1, zato jo
-- bo treba ob delitvi pripeti posebej (CLAUDE.md, Slovaška).
--
-- Vse NEAKTIVNE; vklop liga po liga po uvozu arhiva, sezone in cen
-- (`varovalo_vklopa_lige`). Arhivi 2025/26 so v CLAUDE.md in v PR.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.stran, v.vrstni
  from countries d
  cross join (values
    ('sfz', 'Slovenský futbalový zväz', 'SFZ', 'https://sportnet.sme.sk/futbalnet/z/sfz/', 100),
    ('bfz', 'Bratislavský futbalový zväz', 'BFZ', 'https://sportnet.sme.sk/futbalnet/z/bfz/', 120),
    ('obfz-bratislava-mesto', 'ObFZ Bratislava-mesto', 'Bratislava-mesto', 'https://sportnet.sme.sk/futbalnet/z/obfz-bratislava-mesto/', 121),
    ('obfz-bratislava-vidiek', 'ObFZ Bratislava-vidiek', 'Bratislava-vidiek', 'https://sportnet.sme.sk/futbalnet/z/obfz-bratislava-vidiek/', 122),
    ('zsfz', 'Západoslovenský futbalový zväz', 'ZsFZ', 'https://sportnet.sme.sk/futbalnet/z/zsfz/', 130),
    ('obfz-dunajska-streda', 'ObFZ Dunajská Streda', 'Dunajská Streda', 'https://sportnet.sme.sk/futbalnet/z/obfz-dunajska-streda/', 131),
    ('obfz-galanta', 'ObFZ Galanta', 'Galanta', 'https://sportnet.sme.sk/futbalnet/z/obfz-galanta/', 132),
    ('obfz-komarno', 'ObFZ Komárno', 'Komárno', 'https://sportnet.sme.sk/futbalnet/z/obfz-komarno/', 133),
    ('obfz-levice', 'ObFZ Levice', 'Levice', 'https://sportnet.sme.sk/futbalnet/z/obfz-levice/', 134),
    ('obfz-nitra', 'ObFZ Nitra', 'Nitra', 'https://sportnet.sme.sk/futbalnet/z/obfz-nitra/', 135),
    ('obfz-nove-zamky', 'ObFZ Nové Zámky', 'Nové Zámky', 'https://sportnet.sme.sk/futbalnet/z/obfz-nove-zamky/', 136),
    ('obfz-povazska-bystrica', 'ObFZ Považská Bystrica', 'Považská Bystrica', 'https://sportnet.sme.sk/futbalnet/z/obfz-povazska-bystrica/', 137),
    ('obfz-prievidza', 'ObFZ Prievidza', 'Prievidza', 'https://sportnet.sme.sk/futbalnet/z/obfz-prievidza/', 138),
    ('obfz-senica', 'ObFZ Senica', 'Senica', 'https://sportnet.sme.sk/futbalnet/z/obfz-senica/', 139),
    ('obfz-topolcany', 'ObFZ Topoľčany', 'Topoľčany', 'https://sportnet.sme.sk/futbalnet/z/obfz-topolcany/', 140),
    ('obfz-trencin', 'ObFZ Trenčín', 'Trenčín', 'https://sportnet.sme.sk/futbalnet/z/obfz-trencin/', 141),
    ('obfz-trnava', 'ObFZ Trnava', 'Trnava', 'https://sportnet.sme.sk/futbalnet/z/obfz-trnava/', 142),
    ('vsfz', 'Východoslovenský futbalový zväz', 'VsFZ', 'https://sportnet.sme.sk/futbalnet/z/vsfz/', 150),
    ('obfz-bardejov', 'ObFZ Bardejov', 'Bardejov', 'https://sportnet.sme.sk/futbalnet/z/obfz-bardejov/', 151),
    ('obfz-humenne', 'ObFZ Humenné', 'Humenné', 'https://sportnet.sme.sk/futbalnet/z/obfz-humenne/', 152),
    ('obfz-kosice-okolie', 'ObFZ Košice-okolie', 'Košice-okolie', 'https://sportnet.sme.sk/futbalnet/z/obfz-kosice-okolie/', 153),
    ('obfz-michalovce', 'ObFZ Michalovce', 'Michalovce', 'https://sportnet.sme.sk/futbalnet/z/obfz-michalovce/', 154),
    ('ondavsky-oblastny-futbalovy-zvaz', 'Ondavský oblastný futbalový zväz Svidník', 'Svidník', 'https://sportnet.sme.sk/futbalnet/z/ondavsky-oblastny-futbalovy-zvaz/', 155),
    ('podtatransky-futbalovy-zvaz', 'Podtatranský futbalový zväz', 'Poprad', 'https://sportnet.sme.sk/futbalnet/z/podtatransky-futbalovy-zvaz/', 156),
    ('obfz-presov', 'ObFZ Prešov', 'Prešov', 'https://sportnet.sme.sk/futbalnet/z/obfz-presov/', 157),
    ('obfz-roznava', 'ObFZ Rožňava', 'Rožňava', 'https://sportnet.sme.sk/futbalnet/z/obfz-roznava/', 158),
    ('sofz-spisska-nova-ves', 'Spišský oblastný futbalový zväz', 'Spišská Nová Ves', 'https://sportnet.sme.sk/futbalnet/z/sofz-spisska-nova-ves/', 159),
    ('obfz-stara-lubovna', 'ObFZ Stará Ľubovňa', 'Stará Ľubovňa', 'https://sportnet.sme.sk/futbalnet/z/obfz-stara-lubovna/', 160),
    ('obfz-trebisov', 'ObFZ Trebišov', 'Trebišov', 'https://sportnet.sme.sk/futbalnet/z/obfz-trebisov/', 161),
    ('obfz-vranov-nad-toplou', 'ObFZ Vranov nad Topľou', 'Vranov nad Topľou', 'https://sportnet.sme.sk/futbalnet/z/obfz-vranov-nad-toplou/', 162)
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
    ('sk-nike-liga', 'Niké liga', 'Niké liga', 'sfz', 'ulk.futbalnet.sk/6a18960d44ff24612efb0865/6a189f95b5f9fd8631502d6a', 1),
    ('sk-sfz-2liga', 'MONACObet liga (2. liga)', '2. liga', 'sfz', 'futbalsfz.sk/6a0d921b5736165c0eab633c', 2),
    ('sk-sfz-3liga-zapad', 'III. liga Západ', 'SFZ III. Z', 'sfz', 'futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c66c9a61a70ee926736', 3),
    ('sk-sfz-3liga-stred', 'III. liga Stred', 'SFZ III. St', 'sfz', 'futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c81c9a61a70ee926737', 4),
    ('sk-sfz-3liga-vychod', 'III. liga Východ', 'SFZ III. V', 'sfz', 'futbalsfz.sk/6a0da2fa5736165c0ec9843e/6a173c9ec9a61a70ee926738', 5),
    ('sk-bfz-4liga', 'IV. liga — BFZ', 'BFZ IV.', 'bfz', 'BFZ/6a1201b044ff24612e96f228', 1),
    ('sk-bfz-5liga', 'V. liga — BFZ', 'BFZ V.', 'bfz', 'BFZ/6a1201f944ff24612e97a052', 2),
    ('sk-ba-6liga', 'VI. liga — Bratislava-mesto', 'BA VI.', 'obfz-bratislava-mesto', 'BA-mesto/6a23e9a0233cdeb1e71cfc2f', 1),
    ('sk-ba-7liga', 'VII. liga — Bratislava-mesto', 'BA VII.', 'obfz-bratislava-mesto', 'BA-mesto/6a23e719233cdeb1e716a3ba', 2),
    ('sk-bav-6liga', 'VI. liga — Bratislava-vidiek', 'BAV VI.', 'obfz-bratislava-vidiek', 'BA-vidiek/6a30ef8ee4bf1215246cc80d', 1),
    ('sk-bav-7liga', 'VII. liga — Bratislava-vidiek', 'BAV VII.', 'obfz-bratislava-vidiek', 'BA-vidiek/6a310515e4bf1215248f7fc3', 2),
    ('sk-zsfz-4liga', 'IV. liga — ZsFZ', 'ZsFZ IV.', 'zsfz', 'ZsFZ/6a0fdf345736165c0e132e9a', 1),
    ('sk-zsfz-5liga-juhovychod', 'V. liga Juhovýchod — ZsFZ', 'ZsFZ V. JV', 'zsfz', 'ZsFZ/6a0ff1ef5736165c0e3f366c', 2),
    ('sk-zsfz-5liga-severozapad', 'V. liga Severozápad — ZsFZ', 'ZsFZ V. SZ', 'zsfz', 'ZsFZ/6a0ff21f5736165c0e3fa12b', 3),
    ('sk-zsfz-6liga-sever', 'VI. liga Sever — ZsFZ', 'ZsFZ VI. S', 'zsfz', 'ZsFZ/6a0ff3395736165c0e424726', 4),
    ('sk-zsfz-6liga-severovychod', 'VI. liga Severovýchod — ZsFZ', 'ZsFZ VI. SV', 'zsfz', 'ZsFZ/6a0ff3155736165c0e41f151/6a0ff3153bff416b52e1d022', 5),
    ('sk-zsfz-6liga-stred', 'VI. liga Stred — ZsFZ', 'ZsFZ VI. St', 'zsfz', 'ZsFZ/6a0ff2525736165c0e4014cd', 6),
    ('sk-zsfz-6liga-vychod', 'VI. liga Východ — ZsFZ', 'ZsFZ VI. V', 'zsfz', 'ZsFZ/6a0ff2845736165c0e4082f9', 7),
    ('sk-zsfz-6liga-zapad', 'VI. liga Západ — ZsFZ', 'ZsFZ VI. Z', 'zsfz', 'ZsFZ/6a0ff2d65736165c0e4155e3', 8),
    ('sk-zsfz-6liga-juh', 'VI. liga Juh — ZsFZ', 'ZsFZ VI. J', 'zsfz', 'ZsFZ/6a0ff2a75736165c0e40d814', 9),
    ('sk-nz-7liga', 'VII. liga — Nové Zámky', 'NZ VII.', 'obfz-nove-zamky', 'ObFZ-Nove-Zamky/6a1de63f44ff24612e84982b', 1),
    ('sk-nz-8liga', 'VIII. liga — Nové Zámky', 'NZ VIII.', 'obfz-nove-zamky', 'ObFZ-Nove-Zamky/6a1de6db44ff24612e858d41', 2),
    ('sk-tt-7liga', 'VII. liga — Trnava', 'TT VII.', 'obfz-trnava', 'ObFZ-Trnava/6a26ec1f233cdeb1e7bba90d', 1),
    ('sk-tt-8liga-maxima', 'VIII. liga MAXIMA FASÁDY — Trnava', 'TT VIII. M', 'obfz-trnava', 'ObFZ-Trnava/6a26eef5233cdeb1e7bfcfcc', 2),
    ('sk-tt-8liga-rubbex', 'VIII. liga RUBBEX — Trnava', 'TT VIII. R', 'obfz-trnava', 'ObFZ-Trnava/6a26edb8233cdeb1e7bde2ad', 3),
    ('sk-tt-9liga', 'IX. liga — Trnava', 'TT IX.', 'obfz-trnava', 'ObFZ-Trnava/6a26efb9233cdeb1e7c0fd58', 4),
    ('sk-tn-7liga', 'VII. liga — Trenčín', 'TN VII.', 'obfz-trencin', 'ObFZTrencin/6a217b1f233cdeb1e76426f4', 1),
    ('sk-tn-8liga-sever', 'VIII. liga Sever — Trenčín', 'TN VIII. S', 'obfz-trencin', 'ObFZTrencin/6a217b8e233cdeb1e7653743', 2),
    ('sk-tn-8liga-juh', 'VIII. liga Juh — Trenčín', 'TN VIII. J', 'obfz-trencin', 'ObFZTrencin/6a217b51233cdeb1e764b240', 3),
    ('sk-tn-9liga', 'IX. liga — Trenčín', 'TN IX.', 'obfz-trencin', 'ObFZTrencin/6a217bc4233cdeb1e765aee8', 4),
    ('sk-ds-7liga', 'VII. liga — Dunajská Streda', 'DS VII.', 'obfz-dunajska-streda', 'obfz-dunajska-streda/6a17fb9d44ff24612ecf19e4', 1),
    ('sk-ds-8liga', 'VIII. liga — Dunajská Streda', 'DS VIII.', 'obfz-dunajska-streda', 'obfz-dunajska-streda/6a3046abe4bf12152410590e', 2),
    ('sk-ga-7liga-a', 'VII. liga A — Galanta', 'GA VII. A', 'obfz-galanta', 'obfz-galanta.futbalnet.sk/6a2c0666e4bf121524a0bdb4/6a350bbe0b755716bcd9b03d', 1),
    ('sk-ga-7liga-b', 'VII. liga B — Galanta', 'GA VII. B', 'obfz-galanta', 'obfz-galanta.futbalnet.sk/6a2c0666e4bf121524a0bdb4/6a4e2e0cbd81013dc7a6938e', 2),
    ('sk-kn-7liga', 'VII. liga — Komárno', 'KN VII.', 'obfz-komarno', 'obfz-komarno.futbalnet.sk/6a2667b4233cdeb1e7bf8ecb', 1),
    ('sk-lv-7liga', 'VII. liga — Levice', 'LV VII.', 'obfz-levice', 'obfz-levice.futbalnet.sk/6a26a26b233cdeb1e73686ef', 1),
    ('sk-lv-8liga', 'VIII. liga — Levice', 'LV VIII.', 'obfz-levice', 'obfz-levice.futbalnet.sk/6a26a2ea233cdeb1e7378075', 2),
    ('sk-nr-7liga', 'VII. liga — Nitra', 'NR VII.', 'obfz-nitra', 'obfz-nitra.futbalnet.sk/6a1f41cc233cdeb1e7206aec', 1),
    ('sk-nr-8liga-a', 'VIII. liga A — Nitra', 'NR VIII. A', 'obfz-nitra', 'obfz-nitra.futbalnet.sk/6a1f420b233cdeb1e720ca7c', 2),
    ('sk-nr-8liga-b', 'VIII. liga B — Nitra', 'NR VIII. B', 'obfz-nitra', 'obfz-nitra.futbalnet.sk/6a1f4269233cdeb1e721462c', 3),
    ('sk-pb-7liga', '7. liga — Považská Bystrica', 'PB 7.', 'obfz-povazska-bystrica', 'obfz-povazska-bystrica.futbalnet.sk/6a0ea6b45736165c0eaa9d93', 1),
    ('sk-pb-8liga', '8. liga — Považská Bystrica', 'PB 8.', 'obfz-povazska-bystrica', 'obfz-povazska-bystrica.futbalnet.sk/6a0ea7c85736165c0eac8ef6', 2),
    ('sk-pd-7liga', 'VII. liga — Prievidza', 'PD VII.', 'obfz-prievidza', 'obfz-prievidza/6a16fb0144ff24612e412a4c', 1),
    ('sk-pd-8liga-a', 'VIII. liga A — Prievidza', 'PD VIII. A', 'obfz-prievidza', 'obfz-prievidza/6a16fcd944ff24612e4478f8', 2),
    ('sk-pd-8liga-b', 'VIII. liga B — Prievidza', 'PD VIII. B', 'obfz-prievidza', 'obfz-prievidza/6a1893a344ff24612ef44956', 3),
    ('sk-pd-9liga-b', 'IX. liga B — Prievidza', 'PD IX. B', 'obfz-prievidza', 'obfz-prievidza/6a18949b44ff24612ef6facb', 4),
    ('sk-se-7liga', 'VII. liga — Senica', 'SE VII.', 'obfz-senica', 'obfz-senica.futbalnet.sk/6a2bfb69e4bf1215248a0202', 1),
    ('sk-se-8liga', 'VIII. liga — Senica', 'SE VIII.', 'obfz-senica', 'obfz-senica.futbalnet.sk/6a2bfaa3e4bf12152488a64b', 2),
    ('sk-se-9liga', 'IX. liga — Senica', 'SE IX.', 'obfz-senica', 'obfz-senica.futbalnet.sk/6a2bf998e4bf12152486cd98', 3),
    ('sk-to-7liga', 'VII. liga — Topoľčany', 'TO VII.', 'obfz-topolcany', 'obfz-topolcany.futbalnet.sk/6a27bb4b225470a9beffaacf', 1),
    ('sk-to-8liga', 'VIII. liga — Topoľčany', 'TO VIII.', 'obfz-topolcany', 'obfz-topolcany.futbalnet.sk/6a27bd6c225470a9be02d35c', 2),
    ('sk-vsfz-4liga', 'IV. liga — VsFZ', 'VsFZ IV.', 'vsfz', 'VsFZ/6a0f09fd5736165c0e627a32', 1),
    ('sk-vsfz-5liga-sever', 'V. liga Sever — VsFZ', 'VsFZ V. S', 'vsfz', 'VsFZ/6a5df775705f8e9a4940e79b', 2),
    ('sk-vsfz-5liga-juh', 'V. liga Juh — VsFZ', 'VsFZ V. J', 'vsfz', 'VsFZ/6a0f0a525736165c0e6330fd', 3),
    ('sk-vsfz-6liga-kg', 'VI. liga Košicko-gemerská — VsFZ', 'VsFZ VI. KG', 'vsfz', 'VsFZ/6a0f0a745736165c0e637097', 4),
    ('sk-vsfz-6liga-pt', 'VI. liga Podtatranská — VsFZ', 'VsFZ VI. PT', 'vsfz', 'VsFZ/6a0f0b285736165c0e64e8f7', 5),
    ('sk-vsfz-6liga-sarisska', 'VI. liga Šarišská — VsFZ', 'VsFZ VI. Š', 'vsfz', 'VsFZ/6a0f0b5a5736165c0e655762', 6),
    ('sk-vsfz-6liga-vd', 'VI. liga Vihorlatsko-dukelská — VsFZ', 'VsFZ VI. VD', 'vsfz', 'VsFZ/6a0f0b0b5736165c0e64adc1', 7),
    ('sk-vsfz-6liga-zemplinska', 'VI. liga Zemplínska — VsFZ', 'VsFZ VI. Z', 'vsfz', 'VsFZ/6a0f0a8c5736165c0e63a24f', 8),
    ('sk-ks-7liga', 'VII. liga — Košice-okolie', 'KS VII.', 'obfz-kosice-okolie', 'ObFZ-KE-okolie/6a267bc4233cdeb1e7e92ff0', 1),
    ('sk-ks-8liga', 'VIII. liga — Košice-okolie', 'KS VIII.', 'obfz-kosice-okolie', 'ObFZ-KE-okolie/6a267c12233cdeb1e7e9dd03', 2),
    ('sk-pp-7liga', '7. liga — Podtatranský FZ', 'PP 7.', 'podtatransky-futbalovy-zvaz', 'ObFZ-Poprad/6a27cd57225470a9be1a7686', 1),
    ('sk-pp-8liga', '8. liga — Podtatranský FZ', 'PP 8.', 'podtatransky-futbalovy-zvaz', 'ObFZ-Poprad/6a27cec3225470a9be1ca9fa', 2),
    ('sk-po-7liga', '7. liga — Prešov', 'PO 7.', 'obfz-presov', 'ObFZ-Presov/6a22a6e7233cdeb1e729518b', 1),
    ('sk-po-8liga', '8. liga — Prešov', 'PO 8.', 'obfz-presov', 'ObFZ-Presov/6a22a723233cdeb1e729a3d3', 2),
    ('sk-po-9liga', '9. liga — Prešov', 'PO 9.', 'obfz-presov', 'ObFZ-Presov/6a22a751233cdeb1e729e761', 3),
    ('sk-bj-7liga', 'VII. liga — Bardejov', 'BJ VII.', 'obfz-bardejov', 'obfz-bardejov.futbalnet.sk/6a1e683444ff24612e3a21db', 1),
    ('sk-bj-8liga', 'VIII. liga — Bardejov', 'BJ VIII.', 'obfz-bardejov', 'obfz-bardejov.futbalnet.sk/6a1e68c344ff24612e3b2ed6', 2),
    ('sk-he-7liga', '7. liga — Humenné', 'HE 7.', 'obfz-humenne', 'obfz-humenne.futbalnet.sk/6a22c028233cdeb1e751845c', 1),
    ('sk-he-8liga', '8. liga — Humenné', 'HE 8.', 'obfz-humenne', 'obfz-humenne.futbalnet.sk/6a22c0b9233cdeb1e7526067', 2),
    ('sk-mi-7liga-a', 'VII. liga A — Michalovce', 'MI VII. A', 'obfz-michalovce', 'obfz-michalovce/6a2fb735e4bf121524fb09e2', 1),
    ('sk-mi-7liga-b', 'VII. liga B — Michalovce', 'MI VII. B', 'obfz-michalovce', 'obfz-michalovce/6a2fb757e4bf121524fb4974', 2),
    ('sk-rv-7liga', '7. liga — Rožňava', 'RV 7.', 'obfz-roznava', 'obfz-roznava.futbalnet.sk/6a2bdb09e4bf1215244cde54', 1),
    ('sk-sl-7liga', '7. liga — Stará Ľubovňa', 'SL 7.', 'obfz-stara-lubovna', 'obfz-stara-lubovna.futbalnet.sk/6a1c356444ff24612eed70b6', 1),
    ('sk-tv-7liga', '7. liga — Trebišov', 'TV 7.', 'obfz-trebisov', 'obfz-trebisov.futbalnet.sk/6a2e535ce4bf121524150c48', 1),
    ('sk-vt-7liga', 'VII. liga — Vranov nad Topľou', 'VT VII.', 'obfz-vranov-nad-toplou', 'obfz-vranov-nad-toplou.futbalnet.sk/6a1e8e2d44ff24612e879ec5', 1),
    ('sk-sk-7liga', '7. liga — Svidník (Ondavský OFZ)', 'SK 7.', 'ondavsky-oblastny-futbalovy-zvaz', 'ondavsky-futbalovy-zvaz.futbalnet.sk/6a1d3ce044ff24612e48b0dd', 1),
    ('sk-sn-7liga', 'VII. liga — Spišská Nová Ves', 'SN VII.', 'sofz-spisska-nova-ves', 'sofz-spisska-nova-ves.futbalnet.sk/6a2ffe06e4bf1215247c8fb4', 1)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'SK'
on conflict (slug) do nothing;
