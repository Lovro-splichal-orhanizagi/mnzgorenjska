-- 3. SNL Zahod odslej bere z nzs.si, ne z Nove Gorice.
--
-- Spet sem se zmotil enako kot dvakrat prej. Zapisal sem, da NZS za 3. SNL
-- zapisnikov nima — a sem preveril dve tekmi s PRVE strani seznama, kjer so
-- prihodnje tekme. Te zapisnika seveda nimajo, ker se niso bile odigrane.
-- Odigrane tekme ga imajo: preverjeno na treh iz 5. kroga, postavi po 11,
-- goli se ujemajo z izidom, menjave prebrane.
--
-- Zakaj menjamo vir:
--
--   * Nova Gorica je danes strezla okrnjeno stran (44 kB namesto 187 kB) in
--     uvoz tekoce sezone je zato dvakrat padel. Ena zveza manj v verigi.
--   * Isti razclenjevalnik kot 1. in 2. SNL, ki ze delujeta.
--   * NZS ima izbirnik sezon, torej tudi pot do arhiva, ce ga bo treba.
--
-- Arhiv (ljubljanska 1703 in 1603) ostane, kakor je uvozen: `source` velja za
-- tekoco sezono, arhivske sifre se podajo ob uvozu posebej.
--
-- `vir_ime` in `vir_url` se sprazneta: zdaj zveza IN objavitelj sta NZS, zato
-- noga navedbo spet vzame od zveze in trditev drzi.

update competitions
   set source = 'nzs',
       source_league_code = '3-slovenska-nogometna-liga-zahod',
       vir_ime = null,
       vir_url = null
 where slug = 'snl3-zahod';
