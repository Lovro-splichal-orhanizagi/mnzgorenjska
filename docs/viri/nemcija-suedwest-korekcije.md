# Dokazani omejeni popravki DFB Südwest

Štirje spodnji zapisniki imajo omejen popravek, podprt s shranjenimi primarnimi dokumenti. Izvorni HTML, imena, profili, strani, ure dogodkov, končni izid in polčas ostanejo nespremenjeni. Novi dokazi niso nov zajem DFB in ne osvežijo njegovega časa preverjanja.

| Zapisnik | Dovoljeni popravek | Primarni dokaz |
|---|---|---|
| 2426312, Ulm–Offenbach | Schmid 45: 0:2 → 0:1; Wolfram 45+4: 0:1 → 0:2 | [Uradna liga](https://www.regionalliga-suedwest.de/aktuelles/zusammenfassung-2-spieltag-das-freitag-spiel/) |
| 2426309, Fulda–Sandhausen | Mamutovic 45: 1:4 → 0:4; Ivankovic 45+3: 1:3 → 1:4 | [SV Sandhausen](https://www.svs1916.de/aktuelles/news/detail/article/spielbericht-sgbsvs.html) |
| 2402963, Walldorf–Offenbach | Hajrizaj 90: 4:3 → 3:3; Zor 90+8: 3:3 → 4:3 | [FC-Astoria Walldorf](https://fcastoria.de/emotionen-pur/) |
| 2402984, Walldorf–Balingen | Samo dokazani tretji par Jonas Brändle / Ole Deininger se obdela pred Brändlejevim rdečim kartonom ob isti izvorni uri 46 | [TSG Balingen](https://www.tsg-fussball.de/2025/11/16/regionalliga-tsg-geht-in-walldorf-mit-06-unter/), [FC-Astoria Walldorf](https://fcastoria.de/mit-kantersieg-zum-vereinsrekord/) |

Pri 2402963 Walldorf navaja Zorov zadetek ob **90+7**, DFB pa ob **90+8**. Klub potrjuje vrstni red strelcev in vmesni izid, ne natančne ure DFB. Parser ohrani DFB 90+8 in izrecno opozorilo v izvorno napačnem in v celoti že popravljenem stanju oznak izida.

Pri 2402984 oba kluba potrjujeta dejanski vstop ob polčasu in izključitev na igrišču takoj po začetku drugega polčasa. Walldorf navaja manj kot minuto, trener približno 30 sekund. Obstoječa normalizacija daje **vstop 45, izključitev 46, eno zabeleženo minuto**; to je zaokrožen podatek iz objavljenih minut, ne dokaz natanko 60 sekund igre. Incoming Brändle ima profil 368170; outgoing Deininger v viru nima povezave profila, zato mu parser ne izmisli ID.

Register [dfb-korekcije.json](../../scripts/viri/dfb-korekcije.json) veže metapodatke in vse gole z imenom, stranjo, izvorno uro, vrsto in oznako izida. Sprejme le celotno izvorno ali celotno popravljeno stanje obeh razdelkov golov; delne spremembe ali neskladje med kopijama zavrne. Ta mehanizem ne trdi, da veže profile strelcev ali celotno postavo.

Ločeni register [dfb-kronologija.json](../../scripts/viri/dfb-kronologija.json) dovoljuje samo navedeni par v točni ligi in zapisniku. Celoten semantični prstni odtis veže metapodatke, vse postave in klopi, vratarje, osebje, uradne osebe ter vse štiri razdelke dogodkov. Preverijo se tudi stran, identiteta in profil, smer para ter povsem enaka izvorna ura. Ostala para istega skupinskega dogodka ostaneta na svojem mestu; vsi trije pari se obdelajo natanko enkrat in izvorni skupinski dogodek se pri usklajevanju šteje enkrat. Izvorni vrstni red, podpisi dogodkov, obe uri, dokazni dokumenti in opozorilo so shranjeni v `popravkiKronologije` in preživijo JSON ponovitev.

Vsi primarni dokumenti so shranjeni nespremenjeni v `scripts/vzorci/de-dfb-suedwest-proof-*`; URL pridobitve, kanonični URL članka, UTC, HTTP status, velikost in SHA-256 so v [provenienci](../../scripts/vzorci/de-dfb-suedwest-provenance.json). Walldorfova dokumenta sta celotna uradna WordPress JSON odgovora, shranjena pod `.html` brez pretvorbe. Vsaka uporaba znova prebere in preveri bajte dokazov. Manjkajoči ali spremenjeni dokaz ne more preživeti predpomnjenega parserja. Regionalni `sourceFiles` / `parserSha256` vključuje novi register in vseh pet dokaznih dokumentov.

Ponovitev vseh ohranjenih regionalnih zajemov in živih zajemov Nordost/Bayern z onemogočenim omrežjem daje **304/306 Südwest arhiv** in **105/105 zajetih tekočih odigranih tekem**. Vsi prej sprejeti zapisniki, kanonični nastopi in goli so primerjani po vseh poljih ter ostanejo enaki. Nordostova neobjavljena tekma 2426099 in že znane napake ostalih regij ostanejo vidne.

2402929 ostaja zavrnjen zaradi dvanajstih začetnikov; 2403004 zaradi dveh pripisanih navadnih rumenih kartonov brez izključitve. Südwest zato ni pripravljen za aktivacijo. Izvorni časi zajema ostanejo iz 17. oktobra 2026; nova korelacija ni svež pregled tekoče sezone. Ta sprememba ne izvaja ponovnega uvoza, cenitve, aktivacije ali produkcijskih operacij. Pred vključitvijo veljajo obstoječi arhivski, svežinski, cenovni, časovni, neodvisni pregledni in CI pogoji.
