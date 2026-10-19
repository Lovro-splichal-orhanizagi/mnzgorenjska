# SLFF Trgovina — motivi: personalizacija v slogu nedeljske lige

Datum: 18. 10. 2026. Status: odobren dizajn (lastnik). Nadomešča
personalizacijo iz `2026-10-18-trgovina-personalizacija-design.md` (ime +
številka na enem mestu); naročila, tisk po serijah, boni in plačilo ostanejo.

## Zakaj

Lastnik (18. 10. 2026): personalizirani izdelki "niso dobri" — slike čudne,
ni prikaza, kako bo izdelek videti, kupec lahko vpiše le ime in številko.
Želi bolj nastavljive izdelke v slogu nedeljske lige in vtisljiv prikaz z
izmišljenimi primeri.

## Odločitve (lastnik, 18. 10. 2026)

| tema | odločitev |
|---|---|
| globina | **izbrani motivi + polja**: kupec izbere motiv, izpolni njegova polja in izbere barvno shemo; brez prostega urejevalnika |
| ponudba | majice in puloverji; pub in tekma (kozarec, vrč, podstavki, odpirač); stena in darila (plakat **tvoje postave**, retro plakat tekme, kartica igralca, zastavica); šal, kapa, kapetanski trak |
| prikaz | živi mockup (motiv na fotografiji izdelka med tipkanjem) + vitrina izmišljenih primerov + AI fotografije v okolju |
| izdelava | standardni postopki lokalne tiskarne po kosu: DTF (tekstil), sublimacija (skodelice, satenast šal, zastavice, podstavki), laser (steklo, odpirač), UV/plakatni tisk, vezenje (kapa); lastnik postopke potrdi s tiskarno |
| obseg | trije deli: (1) jedro + majice/puloverji + vitrina, (2) pub in stena (s plakatom postave), (3) šal, kapa, trak, zastavica |

## Model

- **Izdelek** (obstoječi `trgovina.izdelki`, `po_narocilu = true`): prazen
  nosilec z različicami (velikost, barva), postopkom tiska (`postopek`:
  `dtf | sublimacija | laser | uv | vezenje`) in **tiskovnimi conami**
  (`trgovina.cone`: izdelek, `kljuc` npr. `hrbet`/`prsi`/`ovoj`, fotografija
  nosilca, štirje koti cone na fotografiji v px, mere tiska v mm).
- **Motiv** (nova `trgovina.motivi`): `slug`, ime in opis sl/en, cona, za
  katere izdelke velja (`trgovina.motivi_izdelki`: motiv, izdelek, doplačilo
  v centih z DDV), `polja jsonb` in `sheme jsonb` (barvne sheme: ime + 2–3
  barve), `aktiven`, `vrstni_red`.
- **Polje** (element `polja`): `kljuc`, `vrsta` (`besedilo` | `stevilka` |
  `leto` | `ekipa` | `prvak` | `izbira`), `oznaka_sl/en`, `max` (znaki),
  `obvezno`, `privzeto`, pri `izbira` seznam možnosti (npr. slogani).
- **Predloga**: `shop/src/motivi/<slug>.svg` z imenovanimi mesti
  (`data-polje="ime"`, `data-barva="1"`), velikost = mere tiska v mm.
  Ista predloga riše predogled, vitrino in datoteko za tiskarno.
- **Postavka** naročila: `personalizacija = {motiv, polja{…}, shema}`;
  `doplacilo` iz `motivi_izdelki`. Stare vrste (`ime_ekipe` …) ostanejo
  veljavne za stara naročila.

## Preverjanje (baza, `rezerviraj`)

Vsako polje po vrsti: `besedilo` 1–`max` znakov, dovoljene črke (tudi
šumniki), števke ("Bar 22", "FC 1. maj"; vsaj ena črka), presledek, `.-'&!?` in `besedilo_dovoljeno()`; `stevilka` 0–99;
`leto` 1950–tekoče; `izbira` le iz seznama; `ekipa` = ena od kupčevih
nehišnih ekip (prijava obvezna); `prvak` kot doslej (`trgovina_moji_prvaki`);
`shema` iz `sheme`. Motiv mora biti aktiven in veljati za izdelek. Neznana
polja se zavrnejo. Doplačilo iz baze.

## Motivi ob zagonu (del 1, majica in pulover, DTF)

| motiv | polja | kje |
|---|---|---|
| Retro dres | ime, številka, "sponzor" (gostilna/firma, 20), leto | hrbet + prsi |
| Legenda nedeljske lige | ime, vzdevek, leto začetka | hrbet |
| Hangover XI | ime ekipe, številka | hrbet |
| Kapetan | ime, številka (trak "C" na rokavu v risbi) | hrbet |
| Kralj kafane | ime, število golov (stevilka), sezona | hrbet |
| Prvak mini lige | prvak (strežnik sestavi besedilo) | hrbet |

Del 2 (pub, stena): kozarec in vrč (ime + slogan iz izbire: "Tretji
polčas", "Samo še eno", "Trener je rekel ena"), podstavki ×6 (ime ekipe +
6 sloganov), odpirač (ime + številka), **plakat moje postave** A3/A2,
retro plakat tekme (ekipi, rezultat, datum, igrišče), kartica igralca
(ime, pozicija, ocene), zastavica (ime ekipe, leto, barve).
Del 3: satenast šal (ime ekipe + slogan), kapa (ime ekipe, vezenje, le
kratko besedilo do 12), kapetanski trak (ime).

## Plakat moje postave

`public.trgovina_moja_postava(p_team_id bigint)` (authenticated, security
definer): le lastnik ekipe (`owner_id = auth.uid()`), ne hišne, **ne
mladinske lige** (`je_mladinska_liga`); vrne zadnji zaklenjen krog iz
`fantasy_lineups` (formacija, 11 + klop, kapetan, točke igralcev v krogu,
ime ekipe, liga, krog), anonimizirani igralci kot "Igralec". Postavka
shrani posnetek (round_id + seznam), da tisk ne zavisi od kasnejših
sprememb. Igralci so javni podatki uradnih zapisnikov; plakat je za
kupčevo lastno ekipo.

## Prikaz

- **Fotografije nosilcev**: za vsako cono fotografija praznega izdelka
  (enotna svetloba, temno SLFF ozadje), AI, preverjena na oko; koti cone
  vpisani ročno.
- **Mockup** (`shop/src/mockup.tsx`): predloga se nariše v SVG, postavi v
  cono s perspektivno transformacijo (4 koti → `matrix3d`), mešanje
  `multiply`/`screen` po barvi nosilca in rahel `feDisplacementMap` iz
  svetlosti fotografije, da sledi gubam. Takojšnje osveževanje med tipkanjem.
- **Vitrina**: vsak motiv ima 3–4 izmišljene konfiguracije
  (`primeri jsonb` v `motivi`, npr. "NOVAK 9 · Gostilna Pri Mici"); prikaz z
  istim mockupom; klik "Začni s tem" napolni polja.
- **Stran `/personalised`** (sl `/personalizirano` ni potrebna, poti so
  angleške): mreža motivov z vitrinami; katalog dobi pas "Naredi svojega".
- **AI fotografije v okolju** (nedeljsko igrišče, miza v gostilni, stena):
  ustvarjene brez napisov, motiv vstavi skripta z istim mockupom
  (`scripts/trgovina-hero.mjs`) — nič popačenega besedila.

## Tisk

Izvoz serije (obstoječi admin "Za tisk") za vsako postavko izriše predlogo
s polji v **mm in z obrobo za rez**, SVG + PNG 300 dpi, ime datoteke z
oznako naročila, cono in postopkom; CSV dobi stolpca motiv in postopek.

## Cene (premium, lastnik 19. 10. 2026; spremeni v adminu)

Majica 27 + motiv 15, pulover 55 + 15, kozarec 12 + 9, vrč 18 + 9, podstavki
×6 22 (motiv v ceni), odpirač 9 + 6, plakat A3 29 / A2 45 (motiv v ceni),
kartica igralca 15, zastavica 22, satenast šal 35, kapa 24 + 10, trak 18.

## Testi

`varnost.sql`: neznano polje, predolgo besedilo, žaljivka, napačna shema,
motiv ne velja za izdelek, tuja ekipa, mladinska ali tuja postava → zavrnjeno;
doplačilo iz baze. Smoke: vsaka predloga ima mesta za vsa polja motiva in
vse barve shem (manifest `shop/src/motivi/index.ts` ↔ seme v migraciji),
izris vitrine, mockup brez napak, izvoz serije v mm.

## Zunaj obsega

Prosti urejevalnik, nalaganje lastnih slik in grbov klubov (del 4 z
dovoljenjem klubov), pleteni šali (najmanjša količina), samodejno
naročanje pri tiskarni.
