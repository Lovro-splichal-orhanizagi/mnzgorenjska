# Azerbajdžan — vir `pfl-az`

Vir `pfl-az` (`scripts/viri/pfl-az.mjs`) bere **Peşəkar Futbol Liqası**
(PFL, pfl.az): I Liqa (raven 2) in II Liqa (raven 3). Nižje (AFFA Region
Liqası) objavljajo le izide. Država `AZ` ("Azərbaycan"), zveza `pfl-az`, lige
`az-liqa1` in `az-liqa2` (migracija 20261016094500), **neaktivne**. Vmesnika v
azerbajdžanščini, kartice, pošte in matrike nočnega uvoza **še ni**; šifra
lige se začne z `az-`. Pozicije razen vratarja na glasovanje.

- **Dostop.** pfl.az je stran React, podatke si naloži iz javnega API-ja
  `https://pfl.az/api/v1` brez ključa (v svežnju liqa2.pfl.az ni ključa ne
  gesla, le privzeta koda axios). Beremo iste klice kot stran sama.
  robots.txt: `User-agent: * / Disallow:` (vse dovoljeno); pogojev uporabe
  nismo našli. Beremo odkrito (`User-Agent: SLFF fantasy (https://slff.eu)`,
  **3 s** med zahtevki, prebranih zapisnikov ne beremo znova). **Ob 401, 403,
  429 ali izzivu se uvoz ustavi (`PflZavrnitev`, izhod 4) — ne obhajaj**;
  `pflFetch` 429 ne ponavlja. Dovoljenja PFL nimamo.
- **Šifra lige je `league_id` ene sezone** (`/seasons?project_id=3` za II Liqa,
  `project_id=2` za I Liqa): ob novi sezoni se popravi šifra.
- **Razpored** je `/tours/get-games?league_id=<id>&withGames=true` — klic
  strani "Təqvim": krogi (`title` = številka; "p/o" je tekma za obstanek med
  ligama, ni krog lige), tekme z `status` (3 odigrana, 0 ne), izidom,
  `start_date` "dd/mm/llll hh:mm" po **bakujskem času (UTC+4, brez poletnega
  časa → ljubljanski −2 h poleti, −3 h pozimi)** in `protocol_src` (PDF).
  Nerazpisana tekma ima 00:00 in `end_date` (okno kroga) — datum brez ure.
  **Splošni seznam tekem (`/games`) filtrov ne upošteva**; ta jih, vsak krog
  nosi `league.id` in vir krog druge lige zavrne (uvoz se ustavi). Stran ima
  40 krogov, vir bere `page`.
- **II Liqa 2026/27 ima dva dela**: 22 krogov (12 klubov), nato "šestici" s
  po 5 krogi (krogi 23–27 so v razporedu, a še brez tekem). Tekme drugega dela
  pridejo pod isto šifro, ko jih PFL razpiše. I Liqa: 10 klubov, 27 krogov.
- **Zapisnik je PDF** (Word, besedilo): glava (sodniki, `Sarı vərəqə(lər)`,
  `Qırmızı vərəqə(lər)`, `Qol(lar)`, `Qolla nəticələnməyən penalti(lər)`,
  `Artırılan vaxt`, `Qeyd`), nato dva stolpca: začetna enajsterica
  ("90. Ime Priimek", "(k)" kapetan), **vstop pod igralcem, ki je šel ven**
  ("(9. Ime Priimek, 65)"; več vstopov pod istim je veriga), "Ehtiyat
  oyunçular:" (klop), trener. Dogodki v glavi so ločeni z "//" (domači //
  gostje), igralec "Ime Priimek, 14, 67 (p.)"; "(p.)" 11 m, "(ö.q.)" avtogol
  (zapisan pri ekipi, ki ji šteje), "oyundan sonra" karton po tekmi (→ 90),
  drugi rumeni je v rumenih in rdečih (→ 1 rumeni + 1 rdeči). JSON tekme
  (`/games/show/<id>`) menjav nima in minute golov so lahko zamaknjene — ne
  beremo ga. Šifer igralcev v zapisniku ni (v JSON le pri strelcih): identiteta
  je **ime + klub** (kot fss, ffm); "Ime Priimek" → "Priimek Ime" (zadnja
  beseda). Vratar ni označen; zveza ga našteje prvega, zato ima prvi začetnik
  `vratar` kot namig (kot ffm). *Uskladi pozicije* z `vir = pfl-az`.
- **PDF → besedilo**: `pdftotext -bbox` (poppler-utils) in `bboxVBesedilo`, ki
  stolpca loči po **legi besed**, ne po presledkih — `-layout` ju je zaradi
  tabulatorjev Worda mešal (meja od 28. do 50. znaka). Uvozna tokova
  (`uvoz-lige.yml`, `uvoz-zapisnikov.yml`) poppler namestita le za `az-`/`AZ`.
  V predpomnilnik gre le to besedilo, **brez imen sodnikov, delegata, uradnih
  oseb in trenerjev** (`ocistiProtokol`); vzorci `scripts/vzorci/az-pfl-*`
  prav tako. Stran, ki ni PDF, je napaka in ne gre v predpomnilnik. Ime datoteke
  nosi ime PDF: popravljen protokol PFL naloži kot novo datoteko.
- **Napake vira**, ki jih vir prenese: zaklepaj vstopa manjka ("(31. Ime, 72"),
  minute istega igralca ločene s podpičjem ("16; 75"), gol brez minute
  ("Ime, (p.)" — šteje, minute ni), tipkarska napaka imena v glavi
  ("İsamyılov" za "İsmayılov", razdalja ≤ 2, z opozorilom), ime ekipe brez
  narekovajev ("MOİK"). Protokol z datumom druge tekme (2025/26: tekma 6648 ima
  PDF tekme 6672) vir zavrže — tekma je nepopolna.
- **Kontumacija**: PFL tekmo, ki jo AFFA registrira kot "texniki
  məğlubiyyət", pusti kot neodigrano (status 0, izid 0:0) s protokolom, v
  katerem je opomba ("“Şəmkir” komandasına 0:3 hesablı texniki məğlubiyyət").
  `vir.kontumacije` prebere protokole minulih neodigranih tekem in vpiše izid;
  postav takega protokola ne uvažamo. Edini primer 2025/26 (Şəmkir : Xankəndi,
  tekma 6672) ima pri sebi protokol "Oyun baş tutmayıb" (ni bila odigrana),
  opombo o porazu pa v PDF, pripetem tekmi 6648 — vir ga zaradi datuma zavrže,
  zato ta tekma ostane brez izida (odloči človek). **Odigrana** tekma (status
  3) z naknadnim tehničnim porazom (Kür-Araz : Araz Saatlı 3:0, 2025/26, poraz
  0:3 obema) se uvozi, kot je bila odigrana.
- **Nepopoln zapisnik** (PDF še ni objavljen ali manj kot 7 začetnikov) kot pri
  `frf`: izid se zapiše, `imported_at` ostane prazen, 45 dni se bere znova.

Preizkus (15. 10. 2026, vsi zapisniki, brez pisanja v produkcijo):

| liga, sezona | odigranih (PDF) | postav po 11 | goli / izidi | vstopov z minuto | 990 min (ostale: rdeči) | opozorila |
|---|---|---|---|---|---|---|
| II Liqa 2026/27 (`55`) | 42 (42) | 84/84 | 185/185 | 315 | 72/84 | 0 |
| I Liqa 2026/27 (`53`) | 23 (23) | 46/46 | 65/65 | 188 | 45/46 | 1 (tipkarska) |
| II Liqa 2025/26 (`50`) | 160 (160) | 320/320 | 618/618 | 1008 | 293/320 | 0 |
| I Liqa 2025/26 (`49`) | 135 (135) | 270/270 | 380/380 | 1046 | 251/270 | 0 |

Vsaka ekipa brez 990 minut ima rdeči karton. Tekme "p/o" niso štete.
Prvi začetnik (namig vratarja) ima dres 1 ali 12 v ~60 %, sicer 13, 99, 16,
25, 36, 90 … Prenos 15. 10. 2026: ~720 zahtevkov po 3,5 s, nobene zavrnitve;
štirikrat `ECONNRESET` (posamezen prekinjen zahtevek, ponovitev je uspela).

Lokalni uvoz II Liqa (lokalna baza, PDF iz prenosa): arhiv 2025/26 160/160
tekem, tekoča 22 krogov, 132 tekem, 42 uvoženih, 12 klubov, 1239 nastopov
(315 s klopi), povprečje 66,8 minute, noben gol brez nastopa strelca.
Protokol nosi uradno ali staro ime kluba ("Sheki City", "Quba", "Cəbrayıl"),
razpored kratko — vir vzame ime iz razporeda.

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|---|
| az-liqa1 | 10 | `53` | `49` |
| az-liqa2 | 12 | `55` | `50` |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=az-liqa2 -f
arhiv=50 -f cene=true`. Arhiv ~160 protokolov po 3 s je ~10 minut.
