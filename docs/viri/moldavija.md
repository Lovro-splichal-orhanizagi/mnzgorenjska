# Moldavija — vir `fmf`

Država `MD` ("Moldova", migracija 20261016094300) — **vmesnika (romunščina za
Moldavijo), kartice in pošte še ni**, `MD` **ni** v matriki nočnega uvoza;
oboje pred vklopom. Šifra lige se začne z `md-`. Lige so **neaktivne**.

Vir `fmf` (`scripts/viri/fmf.mjs`) bere **www.fmf.md** (Federația
Moldovenească de Fotbal). Razpored, izidi in seznami tekem so HTML, zapisnik
vsake tekme pa je **PDF COMET** ("Raportul meciului"). robots.txt ni (404),
pogojev uporabe ni, noga "© FMF". Beremo odkrito (`User-Agent: SLFF fantasy
(https://slff.eu)`, **3 s** med zahtevki, popolnih zapisnikov ne beremo
znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi** (`FmfZavrnitev` že v
`vir.fetch`, izhod 4) — ne obhajaj. Dovoljenja FMF še nimamo.

- **Šifra lige je `<slug>/<competition>`** (`liga-2-1782306996/877`): slug
  strani tekmovanja pod `/home/competitii/masculin/` in številka tekmovanja
  (gumb "Printeaza Toate Etapele" na strani kroga). Vsaka sezona in faza je
  svoje tekmovanje; ob novi se šifra popravi.
- **Razpored** je tiskana stran `/home/printeaza-detalii-competitii?competition=N`:
  vse tekme sezone v eni zahtevi, urejene po datumu, z naslovi krogov
  ("Etapa 11" se ponovi pri prestavljeni tekmi), "Domači - Gostje", izid
  ("3 - 1", prazen = neodigrana) in ura (**kišinjevski čas → ljubljanski
  −1 h**). Ime z " - " ustavi uvoz. Šifer tekem tu ni: zapisniki gredo prek
  menija strani tekmovanja (krog → `edition`), strani kroga
  (`?menu=matches&edition=E`, šifra tekme) in strani tekme
  (`meciuri-info?match=<id>`, povezava `cdn/matches/<id>/<Domači> - <Gostje>.pdf`;
  brez zapisnika povezave ni).
- **PDF → besedilo**: `pdftotext -layout` (poppler-utils). Brez nove odvisnosti
  v `package.json`: `uvoz-lige.yml` (in `uvoz-zapisnikov.yml` za `MD`) ga
  namesti le za `md-` lige, lokalno `brew install poppler`. `ocisti` iz besedila
  odstrani sodnike, delegate, osebje ekip, kartone osebja, podpise
  (CONFIRMAT), opombe delegata, tiskalca in **starost igralcev**; v
  predpomnilnik in vzorce (`scripts/vzorci/md-fmf-*`) gre le očiščeno
  besedilo (repo je javen).
- **Predloge zapisnika.** "Raportul meciului" v dveh oblikah, obe beremo:
  **A** (od 7. kroga 2026/27, konec avgusta 2026) s starostjo, **šifro osebe
  COMET** in državljanstvom; **B** (prej) brez njiju, z ikonami dogodkov ob
  imenu. Ista predloga je lahko **ruska** (ГОЛЫ, ЖЁЛТЫЕ КАРТОЧКИ, menjave pod
  "ЗАПАСНЫЕ ИГРОКИ", vratar В, kapetan К) — `NASLOVI` v viru. Starejša predloga
  **"Analyticom COMET / Raport de meci"** (sezona 2025/26 in prej: dogodki kot
  številke v stolpcih tabele) se ne bere — `vZapisnik` ob njej vrže napako, zato
  **arhiva ni** (glej spodaj).
- **Zapisnik**: postava (LINEUPS) in klop (SUBSTITUTES) v dveh stolpcih (meja
  je ime gostov v vrstici pod LINEUPS), G = vratar (tudi rezervni), C =
  kapetan. GOLURI: minuta, dres, ime, "Penalty", "Auto-gol" (pri strelcu v
  njegovi ekipi, šteje nasprotniku). CARTONAŞE GALBENE / ROŞII: igralec v eni
  vrstici, minuta v sosednji (najbližja po stolpcu); "AM" (po tekmi) = 90.
  SUBSTITUTIONS: "67'  7 Ursu Elyas › 8 Grosu Alexandru" — **minute so točne**.
  Ekipo dogodka določi dres + ime v postavi, ne stolpec. "45+3'" → 45, nad 90
  → 90. Polčasa ni. Zapisnik brez podpisa sodnika ("Meci jucat"/"СЫГРАНО")
  ali z ekipo pod 7 začetniki je **nepopoln** (`z.nepopoln`, prvo opozorilo
  `zapisnik nepopoln`, kot frf: izid in nastopi se zapišejo, `imported_at`
  ostane prazen) in ne gre v predpomnilnik — bere se ob vsakem uvozu znova.
- **Identiteta: šifra osebe COMET → `reg_st`.** Igralcu iz zapisnika oblike B
  vir šifro poišče v zapisnikih oblike A iste lige (klub + ime, le ena šifra);
  zapisniki s šiframi vseh igralcev gredo v uvoz prvi. Kdor je igral le v
  krogih 1–6, ostane brez šifre (ime + klub; v preizkusu 18–41 nastopov na
  ligo). Ko tak igralec pozneje zaigra v zapisniku A, ga uvoz posvoji
  (`vir.sifraPozneje` → `posvojiBrezSifre` v `prestop.mjs`): šifre, ki je v ligi
  še ni, ne vpiše kot nov zapis, ampak jo da edinemu zapisu brez šifre istega
  kluba in imena (ne pri soimenjakih na isti tekmi). Prej je nastal dvojnik z
  ločeno statistiko in ceno. Prestop med klubi ob tem ostane nov zapis. Šifra
  zapisnika v bazi je `md<id>`.
- Imena: "Priimek Ime" kot v COMET; besede z VELIKIMI črkami dobijo veliko
  začetnico, ş/ţ → ș/ț. Ključ kluba je brez diakritike; kratko ime brez oblike
  (FC, CF, CS, CSF, FCM, CMF, CSFCJT, EFA). `ravenLige`: Super Liga 1, Liga 1
  2, Liga 2 3 (cena iz višje lige po šifri COMET).
- **Kontumacija**: 3:0 ali 0:3, starejša od tedna dni, stran tekme brez PDF
  (`vir.kontumacije`). V preizkusu je ni bilo.

**Meja sezone.** Super Liga (Liga 7777) 2026/27 se je začela **27. 6. 2026**,
uvoz razporeda pa sezono izpelje iz datuma prve tekme z mejo 1. julija —
vpisal bi jo v 2025/26, med lanske kroge. Zato Super Liga **ni vpisana**;
`zapisniki` take lige zavrne. Za vpis potrebuje uvoz razporeda sezono od vira.
Super Liga ima poleg tega fazi (Faza 1, 21 krogov, nato Faza 2 kot svoje
tekmovanje). Predloga zapisnika je ista (preverjeno: 27. 6. 2026, oblika B).

**Faze Lige 1.** Liga 1 2026/27 je "Faza 1" v dveh skupinah po moči (A 6
klubov, B 5 klubov, trikrožno, 15 krogov do 27. 11. 2026); Faza 2 (Grupa 1
in 2, točke se ne prenesejo) bo svoje tekmovanje z novim slugom in številko —
takrat popravi šifro (oz. ligo razdeli na novo). Grupa B je s 5 klubi na
spodnji meji (3 iz kluba × 5).

**Arhiva ni.** Zapisniki 2025/26 (Liga 2 Seria Nord `liga-2-seria-nord-1752223589/648`,
Sud `liga-2-seria-sud-1752223665/649`, Liga 1 Faza 1 `645` — sluga strani
spletišče ne pokaže) so v predlogi Analyticom. Cene dajo minute tekoče sezone
(uvoz brez `arhiv`, s `cene`, kot hlf): oktobra ima redni igralec Lige 2 že
13 krogov.

Vpisane lige (migracija 20261016094300, **neaktivne**, zveza `fmf`):

| liga | klubov | tekoča 2026/27 | arhiv |
|---|---|---|---|
| md-liga-1-a | 6 | `liga-1-faza-1-grupa-a-1783092701/878` | — |
| md-liga-1-b | 5 | `liga-1-faza-1-grupa-b-1783092819/879` | — |
| md-liga-2 | 15 | `liga-2-1782306996/877` | — |

Preizkus v živo (15. 10. 2026, brez pisanja v bazo, vsi zapisniki; goli =
izid, postav po 11, vratar G, 990 minut na ekipo):

| liga | tekem / odigranih | zapisnikov (A + B) | goli = izid | postav 11 / vratar | 990 minut | nastopov (s klopi, brez šifre) |
|---|---|---|---|---|---|---|
| md-liga-1-a | 45 / 27 | 27 (9 + 18) | 27/27 (119) | 54/54, 54/54 | 51/54 (3 rdeči) | 804 (210, 41) |
| md-liga-1-b | 30 / 18 | 18 (6 + 12) | 18/18 (42) | 36/36, 36/36 | 30/36 (6 z rdečim) | 536 (140, 18) |
| md-liga-2 | 210 / 90 | 88 (34 + 54) | 88/88 (342) | 176/176, 176/176 | 167/176 (9 z rdečim) | 2516 (580, 181) |

Menjave: vse z minuto (210, 140, 580 = nastopi s klopi). Liga 2: Sheriff-2 :
CF Maiak 11:0 (8. 8.) zapisnika nima, CMF Cahul : Sheriff-2 (14. 10.) ga še
nima; CMF Cahul : EFA Visoca (8. krog) je na igrišču 3:1, razpored ima 0:3
(zelena miza) — uvoz vzame izid zapisnika in to zapiše med opozorila (kot
fssid). Kontumacij (3:0 brez zapisnika) ni bilo. 13 avtogolov, 24 golov z
11 m, 25 rdečih kartonov v treh ligah.

Uvoz (ena za drugo, **brez arhiva**, ko bo vmesnik): `gh workflow run
uvoz-lige.yml -f liga=md-liga-2 -f cene=true`. Liga 2 je ~210 zahtevkov po 3 s
(~11 minut) ob prvem uvozu.
