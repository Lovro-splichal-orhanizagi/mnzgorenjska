# Nočni uvoz: države in koši

**Nočni uvoz teče po državah, velike države po koših** (matrika `include` v
`.github/workflows/uvoz-zapisnikov.yml`, vsak koš svoj posel; zanka koša je
`scripts/nocni-uvoz.sh`, razdelitev `scripts/nocni-kosi.mjs`). Nova država
mora v matriko, sicer se njene vklopljene lige ponoči ne uvažajo — brez
napake. Število košev države je `KOSOV` v `nocni-kosi.mjs` in ista številka v
matriki (smoke ju primerja): GR 6, AT 4, HR 3, HU 3, SK 2, RS 2, SI 2, ostale 1.

Zakaj (meritev 11.–13. 10. 2026): posel AT (162 vklopljenih lig, ~4–6 minut
na ligo) je v 240 minutah obdelal 42 lig in GitHub ga je preklical — **vsak
zagon istih 42**, ostalih 120 se ni osvežilo. HR (110) je trajal 2–2,5 ure in
padal na eni ligi (varovalo razporeda "14 klubov, v bazi 15"), SI in SK prav
tako. Preklican ali padel posel `actions/cache` ni shranil predpomnilnika
(shrani le ob uspehu), zato naslednji zagon ni imel odtisov in je znova bral in
uvažal vse zapisnike zadnjih 21 dni ("Nespremenjenih: 0") — začarani krog.
Odtis kode je poleg tega zajel vse datoteke `scripts/viri/`, zato je vsak
popravek kateregakoli vira razveljavil odtise vseh lig.

Kako zdaj:

- **Koš lige** je zgoščenka šifre (stabilna; koš ima svoj predpomnilnik
  `zapisniki-<drzava>-k<kos>od<kosov>-…`). Vir sme brati iz več košev hkrati le,
  če je v `VZPOREDNI` (oefb 4, eps 4, hns 3, mlsz 3, sportnet 2, fss 2, fssid 2);
  vsi drugi viri (MNZ, nzs, fsb, jalgpall, fcf, fas, facr, hlf, frf, lff, pzpn, ffm, ltfutbolas, fscg, mfa, pfl-az,
  mascot, askf, tff, aft, hoff-km, pfl-ua, upl, ffl, ffa, dbu, ncefl, isthmian, lowland, nsfbih, nfsbih, fmf)
  so v enem košu. Vir, ki ga bere k košev, v vsakem bere s **k-krat daljšim
  premorom** (`SLFF_PREMOR_FAKTOR` → `prenos.mjs`), zato skupni tempo k viru
  ni večji kot pri enem poslu (mlsz: Crawl-delay 1 s). Hitrost pride iz pisanja
  v bazo, ki teče vzporedno, in iz tega, da počasen odgovor enega posla ne
  čaka drugih.
- **Grčija** (63 lig, 16. 10. 2026): `eps` (32 lig, 12–20 minut na ligo, Atene
  odgovarjajo ~5 s) v enem poslu ne gre v 190 minut, zato je v `VZPOREDNI` s 4
  koši (vsak s 4 × 3 s premora, skupni tempo k viru ostane 3 s; zveze so na
  devetih domenah); koš ima 7–9 lig eps. `mascot` (31 lig, ~4 minute) ostane v
  enem košu. `KOSOV.GR = 6`, ker pri 5 koših zamik zgoščenke postavi mascot v
  koš z 9 ligami eps; pri 6 so eps v koših 2–5, mascot v 1, koš 6 je prazen
  (posel se konča takoj). Ob novem viru v Grčiji preveri razdelitev
  (`razdeli` iz `nocni-kosi.mjs` na seznamu lig).
- **Vrstni red v košu**: najprej lige, ki jih nočni uvoz najdlje ni uspešno
  obdelal (`scripts/.predpomnilnik/nocni-stanje-<drzava>-<kos>.json`).
- **Časovni rok**: po 190 minutah (`ROK_MIN`) koš ne začne nove lige; ostale
  so opozorilo "Zmanjkalo časa" (ne napaka) in pridejo naslednjič prve.
- **Drugi poskus**: liga, ki pade (omrežje, `lock timeout` ob hkratnem pisanju
  dveh košev), dobi na koncu koša še en poskus. Izhod 4 (vir je zavrnil) ustavi
  le lige tega vira v košu. Izhod 3 uvoza razporeda (razpored ima klub manj kot
  baza) ni padec: liga se zabeleži kot obdelana, koš na koncu izpiše opozorilo
  *Klub manjka v razporedu* — odloči človek (*Izstop kluba*,
  `--dovoli-manj-klubov`) ali je bila stran vira le okrnjena.
- **Predpomnilnik se shrani vedno** (`actions/cache/restore` + `save` z
  `if: always()`), tudi ob padcu ali preklicu.
- **Odtis kode** (`scripts/odtis-kode.mjs`) zajame skupne datoteke uvoza in le
  vir lige z datotekami, ki jih uvaža. Prvi zagon po tej spremembi (in vsak
  popravek vira) zapisnike tega vira enkrat uvozi znova.
- **Rezervni cron** `47 6 * * 1-4`: GitHub jutranji zagon kdaj tiho izpusti
  (13. 10. 2026); posel `zacni` rezervo preskoči, če je današnji zagon že tekel.
- Ime posla je `uvoz HU` pri enem košu in `uvoz HU 2/3` pri več;
  `cakaj-na-uvoze.mjs` pri skupnem viru gleda vse posle države.
