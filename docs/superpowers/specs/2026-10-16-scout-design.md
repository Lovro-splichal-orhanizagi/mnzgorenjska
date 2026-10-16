# SLFF Scout — design

Datum: 16. 10. 2026. Status: odobren dizajn, čaka pregled specifikacije.

## Namen

Plačljivo orodje za klube (B2B), ki iz podatkov SLFF priporoča igralce:
iskanje in razvrščanje, poročilo o vrzelih v kadru, podobni igralci in
opazovalni seznam s tedenskim poročilom. Prodaja se kot samostojen izdelek
**SLFF Scout** na `scout.slff.eu`.

Prednost pred Wyscout/InStat/Transfermarkt: pokritost ravni 4–8 v devetih
državah (343.510 igralcev, 3,7 M nastopov, 129.915 zapisnikov, 665 aktivnih
lig; 86 % igralcev s stalno šifro osebe `reg_st`) in podatek, ki ga nihče
nima: **kdo je pripravljen na prestop** (privolitev igralca).

Česar nimamo: starosti (datumov rojstva ne hranimo), podaj, strelov, xG,
sledenja. Imamo minute, začetke, menjave (minuta vstopa in izstopa), gole z
minuto, 11 m, kartone, čiste mreže, prejete gole, izide, lestvice, pozicije
(zapisnik ali glasovanje).

## Odločitve (lastnik, 16. 10. 2026)

| tema | odločitev |
|---|---|
| kupec | polprofesionalni in ambiciozni amaterski klubi (ravni 3–5) plačajo; igralci se brezplačno prijavijo kot "odprt za prestop" |
| vidnost | vsi odrasli igralci odprtih držav z javnimi dejstvi in kazalniki; ugovor = skrit; kontakt in "odprt za prestop" le s privolitvijo |
| v1 vsebuje | iskanje in razvrščanje, poročilo o vrzelih, podobni igralci, opazovalni seznam s tedenskim poročilom |
| starost | sama prijavljena letnica (privolitev) + "faza kariere" iz podatkov; datumov rojstva iz virov ne beremo |
| trg | najprej Slovenija |
| pristop | ločen izdelek `scout.slff.eu` (C), skupna baza in prijava |

## 1. Izdelek in cene

- Blagovna znamka **SLFF Scout**, trezen B2B videz (brez maskote), slovenščina in angleščina.
- **Račun pripada klubu**, potrjen kot obstoječi klubski računi (uradni naslov iz `klub_stik`), do 3 sedeži.
- **Igralci** v Scout ne vstopajo. Na slff.eu na prevzetem profilu vklopijo "Odprt za prestop", vpišejo letnico, želene regije in dovolijo stik.
- Štiri naloge:
  1. **Iskanje in razvrščanje**: pozicija, raven (glede na klub: raven nižje, ista), regija ali največja razdalja, najmanj minut, samo odprti za prestop; seznam z enovrstično utemeljitvijo.
  2. **Poročilo o vrzelih**: iz zapisnikov kluba — tanke pozicije, rednim igralcem padajo minute, disciplina; za vsako vrzel predlogi.
  3. **Podobni igralci**: "še en tak kot X", prilagojeno ravni.
  4. **Opazovalni seznam in tedensko poročilo** (ponedeljek, e-pošta): tekme, goli, kartoni, menjave kluba, novi odprti za prestop.

| paket | cena | vsebina |
|---|---|---|
| Preizkus | 14 dni brezplačno | vse, Slovenija |
| Klub | 39 €/mesec ali 290 €/sezono | štiri naloge, ena država, seznam 30, tedensko poročilo |
| Pro | 99 €/mesec | vse odprte države, neomejen seznam, PDF, primerjava, CSV |

- **Vaba**: vsak potrjen klubski račun dobi mesečno brezplačen mail "3 igralci za tvojo najšibkejšo pozicijo" s povezavo na preizkus.
- Plačila prek Stripe, prodajalec SPACE GUARDIAN d.o.o. (kot preverjeni igralci).

## 2. Pravo in podatki

Podlage po plasteh:

| plast | vsebina | podlaga |
|---|---|---|
| javna dejstva | minute, goli, kartoni, klubi, lige iz uradnih zapisnikov | zakoniti interes; že javno na slff.eu |
| naše ocene | indeksi, priporočila, podobnost, ujemanje z vrzelmi | zakoniti interes z zapisano tehtnico (LIA), pregled pravnika pred zagonom; ni avtomatiziranega odločanja po čl. 22 (odloči človek v klubu) |
| profil s privolitvijo | odprt za prestop, letnica, regije, stik | privolitev igralca, preklic kadarkoli, ob preklicu izbris |

Pravila v izdelku:

- **Samo odrasli.** Mladinske lige (`je_mladinski_slug`) nikoli. Igralec, ki se pojavi tudi v mladinski ligi, je izključen, dokler nima članskih minut in sam ne prijavi letnice ≥ 18 let. Brez prijavljene starosti velja za odraslega, kdor igra le v članskih ligah.
- **Ugovor = skrit iz Scouta v 14 dneh**: novo stikalo `players.scout_skrit` (velja za vse vrstice osebe v državi, kot anonimizacija); v fantasy igri igralec ostane. Povezava za ugovor na vsaki javni strani igralca.
- **Obvestilo po čl. 14**: nov razdelek "Scout" na `/legal` (kaj klubi vidijo, zakaj, kako dolgo, kako ugovarjati).
- **Država po državi**: tabela `scout.drzave` (`zaprto` / `pilot` / `odprto`). Država se odpre šele z zapisanim dovoljenjem vira (pisno soglasje zveze, kjer je mogoče, sicer pravni pregled). Slovenija: pisna prošnja NZS in MNZG. Katalonija (FCF), Romunija (frf) in Češka ostanejo zaprte.
- **Dnevnik**: vsako iskanje in ogled profila (klub, igralec, čas), hramba 12 mesecev; zloraba in odgovor na zahtevo po dostopu ("kateri klubi so me gledali").
- **Pogoji za klube**: le za iskanje igralcev, brez preprodaje, strganja in objave ocen; stik z odprtimi igralci le prek Scouta. Kršitev = zaprt račun.
- **Besedišče**: "kazalniki iz podatkov tekem", ne ocena osebe; brez negativnih oznak, le razvrstitve in prednosti.

**Pred prvim plačilom**: pregled LIA pri pravniku, DPIA, pisna soglasja za Slovenijo, posodobljena `/legal` in pogoji Scouta.

## 3. Analitični stroj

Nočni posel piše v tabele, vmesnik jih le bere.

1. **Moč lig.** Koeficient vsake lige iz igralcev, ki so igrali v dveh ligah (`reg_st`, v Sloveniji ime + klub): kako se njihov učinek na 90 minut spremeni ob prehodu. Model z mešanimi učinki `učinek = sposobnost igralca + učinek lige + učinek ekipe` čez vse sezone igralcev; pri malo prehodih se opre na uradno raven piramide (`ravenLige`).
2. **Kontekst ekipe.** Elo kluba iz izidov; učinek proti šibkim nasprotnikom šteje manj; delež igralca v golih in minutah ekipe.
3. **Kazalniki igralca** (prilagojeni ravni, skrčeni proti povprečju pri malo minutah):
   - zanesljivost: delež minut ekipe, začetki, odigrane cele tekme, stalnost čez sezone;
   - napad: goli brez 11 m na 90 minut, delež golov ekipe, 11 m;
   - **vpliv na igrišču (on/off)**: gol razlika ekipe, ko je na igrišču, proti, ko ni (iz minut menjav in golov);
   - obramba: prejeti goli in čiste mreže na igrišču; vratarji proti povprečju ekipe;
   - disciplina: kartoni na 90 minut;
   - pot: trend čez sezone, prehodi med ravnmi.
4. **Indeks po poziciji**: utežen kazalnik → percentil + projekcija "pričakovani učinek na tvoji ravni" (koeficienti lig).
5. **Podobnost**: vektor kazalnikov, kosinusna podobnost znotraj skupine pozicij, s prilagoditvijo ravni.
6. **Vrzeli**: v kadru kluba redni igralci (≥ 50 % minut) po poziciji, odvisnost od enega igralca, padajoče minute, disciplina, pozicije z največ prejetimi goli na igrišču.
7. **Zaupanje**: vsako število ima stopnjo zaupanja (minute, kakovost identitete `reg_st` proti imenu); malo podatkov se pokaže odkrito.
8. **Dokaz**: backtest napove naslednjo sezono (raven prilagojeno), posebej za igralce, ki so napredovali; natančnost objavimo klubom.

Tehnika: Python 3.12 (numpy, statsmodels, psycopg) za prileganje modela, kazalniki v SQL.

## 4. Arhitektura

```
slff.eu (fantasy)      scout.slff.eu (nova aplikacija Vite, isti repozitorij: scout/)
      │                         │
      └──── Supabase (api.slff.eu) ── ena baza, ena prijava
                     │
            shema `scout` (ločena)  ←── slff-scout (nočni posel Python, Hetzner)
                     │
            Stripe (naročnine) · Mailcow (poročila) · Playwright (PDF)
```

- **Vmesnik**: Vite + React + TypeScript v `scout/`; deli `src/lib` (grbi, prevodi, oblikovanje), lasten oblikovni sistem. Caddy streže `scout.slff.eu`, CI ga zgradi in objavi ob obstoječi strani. Brez mobilne aplikacije.
- **Shema `scout`**:
  - računi: `drzave`, `narocnine` (Stripe), `sedezi`;
  - stroj: `lige_moc`, `ekipe_elo`, `kazalniki` (igralec × sezona × liga), `indeks`, `vektorji`, `vrzeli` (po klubu), `modeli` (različica, datum, natančnost backtesta);
  - delo kluba: `opazovani`, `dnevnik`, `sporocila` (klub → igralec, posreduje e-pošta, naslov igralca ostane skrit).
- **Stran igralca na slff.eu**: novi stolpci v `profil_igralca`: `odprt_za_prestop`, `letnik`, `regije`, `kontakt_dovoljen`; `players.scout_skrit`.
- **Dostop**: brskalnik sheme `scout` ne bere neposredno. Vse prek SECURITY DEFINER funkcij (`scout_isci`, `scout_igralec`, `scout_podobni`, `scout_vrzeli`, `scout_opazuj` …), ki preverijo: sedež kluba z aktivno naročnino, odprto državo, igralec ni skrit in ni mladoleten, dnevna meja kluba (npr. 500 profilov na dan); vsak klic gre v dnevnik.
- **Nočni posel** `slff-scout` (kontejner na strežniku, 05:30, po uvozih): moč lig enkrat tedensko, kazalniki, indeksi in vrzeli vsak dan. Vsak zagon je nova različica modela v eni transakciji — vmesnik nikoli ne vidi napol izračunanih števil.
- **Tedensko poročilo**: ob ponedeljkih Node delavec (ob delavcu objav) sestavi maile opazovalnih seznamov in vrzeli in jih pošlje prek Mailcowa. PDF prek slike Playwright, ki jo že ima delavec objav.
- **Plačila**: nov izdelek Stripe "SLFF Scout" (mesečni in sezonski paket); obstoječi `stripe-webhook` dobi dogodke Scouta z metapodatkom `app=slff-scout`.

## 5. Uvajanje, preizkusi, merila

| faza | tedni | vsebina | pogoj za naprej |
|---|---|---|---|
| 0 Pravo | 1–3 (vzporedno) | LIA, DPIA, pravnik, soglasji NZS in MNZG, pogoji Scouta, `/legal` čl. 14, stikalo ugovora | vse odobreno; noben klub ne plača pred tem |
| 1 Stroj | 1–5 | posel Python, moč lig, Elo, kazalniki, indeks, podobnost, vrzeli, backtest | backtest premaga naivno osnovo (lanski učinek) za ≥ 15 % pri igralcih, ki so zamenjali ligo |
| 2 Stran igralca | 4–6 | odprt za prestop, letnica, regije, stik na profilu slff.eu; razdelek Scout na `/legal` | prijava deluje in je razložena igralcem |
| 3 MVP Scout | 5–9 | scout.slff.eu: prijava, iskanje, profil, vrzeli, podobni, opazovalni seznam, Stripe, dnevnik, meje; sl + en | 5 poskusnih klubov ga uporablja tedensko |
| 4 Pilot | 9–13 | 10 slovenskih klubov: preizkus, nato plačljivo; tedensko poročilo; pogovor s klubom vsaka 2 tedna | ≥ 5 plačujočih klubov, zadrževanje > 70 % po dveh mesecih |
| 5 Širitev | potem | Avstrija (razširitev dovoljenja ÖFB), Hrvaška, Madžarska; PDF, primerjava, Pro | pravni pogoj po državah |

Preizkusi:

- **Stroj**: enotni testi v Pythonu na sintetičnih ligah z znano močjo (model jo mora najti); poročilo backtesta za vsako različico v `modeli`; pregled smiselnosti (prvih 10 vsake lige mora biti verjetnih človeku).
- **Baza**: SQL testi v slogu `test:varnost` za vsako funkcijo Scouta — brez sedeža ni podatkov, isto za potekla naročnina, zaprta država, skrit igralec, mladoletnik; meja deluje; vsak klic v dnevniku.
- **Vmesnik**: typecheck, smoke izris vseh strani, Playwright od začetka do konca (preizkus → plačilo → iskanje → opazovalni seznam) proti Stripe v testnem načinu.
- **Neodvisen pregled** vsakega PR.

Merila uspeha: plačujoči klubi, tedensko aktivni sedeži, iskanja → dodani na seznam, stiki z odprtimi igralci, prestopi, za katere klub potrdi, da jih je našel Scout (zgodba za trženje).

Tveganja: zveza reče ne (država ostane zaprta); šibka identiteta po imenu v Sloveniji (zaupanje jasno označeno); klubi cenijo, a ne plačajo 39 € (preizkusi sezonski paket ali cenejši Klub Lite); množični ugovori igralcev (malo verjetno ob preglednosti in koristi za igralce).

## Zunaj obsega v1

Mladinci in igralci pod 18 let; podatki iz videa ali sledenja; pogajanja in pogodbe; mobilna aplikacija Scout; države brez zapisanega dovoljenja vira; branje datumov rojstva iz virov.
