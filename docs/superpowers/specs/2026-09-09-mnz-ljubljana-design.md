# MNZ Ljubljana: 1. in 2. liga člani

Datum: 2026-09-09

## Cilj

Dodati dve članski ligi MNZ Ljubljana kot polnopravni fantasy tekmovanji.
Za obstoječe uporabnike iz Gorenjske se ne sme spremeniti nič.

## Kaj je preverjeno

Spletišče: **`mnzljubljana-zveza.si`** (naslova ni mogoče uganiti; našel sem ga
prek seznama zvez na `nzs.si/zveza/organizacija/medobcinske-nogometne-zveze`).

Uporablja **isti CMS kot MNZ Gorenjska** — `index.cfm?akc=tekmovanja&liga=NNNN`,
`akc=zapisnik`, `akc=delegiranje`. Isto velja za MNZ Celje; ostalih pet zvez
ima vsaka svoje spletišče.

| šifra | ime pri viru | pri nas |
|---|---|---|
| 2003 | Regionalna Ljubljanska liga | 1. liga člani |
| 2004 | MNZ Liga | 2. liga člani |

**Šifra pripada sezoni, ne ligi.** Izbirnik sezone je POST obrazec
(`sezona=2025/2026` na `index.cfm?akc=tekmovanja`), po katerem se šifre
zamenjajo — enako kot pri Kranju, kjer se ob novi sezoni popravi
`competitions.source_league_code`:

| sezona | 1. liga | 2. liga |
|---|---|---|
| 2026/2027 (tekoča) | 2003 | 2004 |
| 2025/2026 (arhiv za cene) | 1904 | 1905 |

Zapisniki **vsebujejo cele postave** — številka dresa, ime, `(V)` za vratarja,
`(K)` za kapetana. Arhiv sega v sezono 2006/2007.

## Edina resnična ovira: en stolpec

Zapisnik MNZ Ljubljana ima stolpec **`Leto rojstva`**, ki ga Kranj nima:

```
Kranj:      Priimek in ime | 2  | Budau Gašper
Ljubljana:  Priimek in ime | Leto rojstva | 1 | Deronja Marko (V) | 1995
```

`zapisnik.mjs` se zanaša na Kranjevo razporeditev stolpcev, zato pri Ljubljani
prebere `Leto rojstva` kot ime kluba in se ustavi po prvem igralcu. Razčlenitev
sama to javi:

```
domači (Leto rojstva): v postavi je 1 igralcev namesto 11
```

**Popravek:** stolpce naslavljaj po glavi tabele, ne po zaporedju. S tem je
vsak naslednji vir cenejši, ne le ta.

## Cene: vrstni red ni izbiren

Cene so **percentili znotraj tekmovanja** (`ovrednoti-igralce.mjs`), omejene na
4.0–12.0, s stropi po pozicijah. Ljubljana se torej vrednoti sama zase in
primerjava z Gorenjsko ni potrebna — to je že pravilno.

Past je drugje: igralec pod 270 minutami dobi privzeto **4.5**. Liga brez
zgodovine bi tako imela vse igralce po 4.5 — 15 × 4.5 = 67.5 pri proračunu
100, brez razlikovanja in brez igre.

Zato:

```
uvoz arhiva (2025/26) → ovrednoti-igralce → PREVERI razpon → šele nato odpri ligo
```

Razpon mora izgledati kot pri Gorenjski: mediana okoli 5.0 in resničen vrh.
Uporabimo **eno arhivsko sezono**, tako kot Kranj.

## Izbirnik lige

Danes je to vrsta gumbov (`PreklopLige`); pri dveh tekmovanjih deluje, pri
šestih ne. Zamenja ga **iskalni spustni seznam**, grupiran po zvezi:

```
[ išči ligo … ]
Gorenjska  ▸ Člani · Mladinci
Ljubljana  ▸ 1. liga · 2. liga
```

Zgradba naj dopušča, da se pozneje nadenj doda **izbirnik države**, ne da bi
bilo treba karkoli prestavljati.

**Uporabnik iz Gorenjske ne opazi ničesar.** Izbira lige je že lepljiva
(`localStorage: slff-tekmovanje`), privzeta ostaja `clani`. Kdor je doslej
gledal Gorenjsko, jo gleda naprej; dobi le možnost pogledati drugam.

Tu **vmesna raven (zveza) končno dobi nalogo** — grupiranje. Ostaja poceni:
nanjo ne kaže nič razen `competitions`.

## Kaj NI del tega

- **Ekipe čez ligo.** Danes `shrani_ekipo` to zavrne in e2e to preverja; tako
  ostane. Zabavne različice pridejo pozneje kot svoja odločitev.
- **Ostalih 49 šifer MNZ Ljubljana** (Cicibani, Mlajši dečki …) — samo 2003 in
  2004.
- **Ostale zveze.** Celje je poceni (isti CMS), ostalih pet je svoj projekt.
- **Državne lige (1. SNL).** NZS objavlja rezultate in sezonsko statistiko, ne
  pa postav po tekmah — fantasy iz tega ni mogoč.

## Zaporedje

1. **Razčlenjevalnik** — stolpci po glavi tabele; testni primerek zapisnika iz
   obeh zvez, da Kranj ne razpade.
2. **Raven zveze + iskalni izbirnik.**
3. **`viri/mnzlj.mjs`** — tanek, ker je CMS isti.
4. **Arhiv → cene → preveri razpon.**
5. **Odpri ligi** — dve vrstici v `competitions`.

1 in 2 sta neodvisna.

## Kaj je pokazal vir v resnici

Razčlenitev vseh zapisnikov prek `viri/mnzlj.mjs`:

| liga | zapisnikov | čistih (22 nastopov, brez opozoril) |
|---|---|---|
| 2003 tekoča | 12 | 12 |
| 2004 tekoča | 4 | 4 |
| 1904 arhiv | 156 (vzorec 40) | 40 |
| 1905 arhiv | 76 (vzorec 40) | 36 |

Štirje odstopi pri 1905 niso napake razčlenjevalnika:

- **114215, 114216, 114217** — tekme brez rezultata (`Komenda ()`), torej
  neodigrane. `parsirajZapisnik` vrne `null`, kar je pravilno.
- **116456** (`Komenda 0 : 11`) — vir sam ni označil vratarja z `(V)`.
  Opozorilo je zato resnično in koristno; pozicijo dopolni glasovanje.

## Kaj je odkril šele pravi uvoz

Trije hrošči, ki jih ni bilo mogoče predvideti iz enega zapisnika. Vsak se je
končal **brez sporočila o napaki** — uvoz je poročal uspeh in vpisal smeti.

1. **Letnica s štirimi števkami.** `05.09.2026` je star izraz prebral kot
   `05.09.20` in iz tega naredil leto **2020**. Sezono je iskal kot prvo
   vrstico z `\d{4}/\d{2}` kjerkoli na strani — v Ljubljani je to spustni
   seznam sezon v meniju. Cel arhiv 2025/26 je pristal v sezoni `2026/20` z
   datumi iz leta 2020.

2. **Konec razporeda.** Pod razporedom stran nadaljuje z rezultati, najprej te
   lige, nato **druge**. Kranj naslovi blok `REZULTATI`, Ljubljana
   `REZULTATI TEKEM`, primerjava pa je bila z enakostjo — zato je v 1. ligo
   pripeljalo Kamnik, Termit Moravče, ŠD Vir in še pet klubov 2. lige.
   Namesto 12 klubov jih je bilo 20.

3. **Klubi s sponzorjem.** `Ljubljana` in `Ljubljana Arol` sta isti klub;
   enako `Vir` / `ŠD Vir` in `Kresnice` / `NK IAK Kresnice`. Prva dva sta se
   razklala **znotraj ene sezone** (12 + 12 oz. 13 + 7 tekem), kar je hkrati
   dokaz, da gre res za isti klub. Vzdevki so zato last vira.

Zato so zdaj shranjeni vzorci razporeda obeh zvez in razčlenitev je ločena v
`scripts/razpored.mjs`, kjer jo `npm run smoke` preveri brez omrežja.

## Preverjanje

- Zapisnik Kranja se razčleni enako kot prej (primerjava s shranjenim izidom).
- Zapisnik Ljubljane se razčleni brez opozoril: 11 igralcev na stran, vratar
  označen, rezultat se ujema s seštevkom golov.
- `npm test` (41 trditev), `npm run smoke`, typecheck, build.
- Cene: mediana in razpon primerljiva z Gorenjsko, preden liga postane vidna.
