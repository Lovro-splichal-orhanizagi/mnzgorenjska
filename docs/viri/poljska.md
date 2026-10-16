# Poljska

Država `PL` ("Polska", migracija 20261012004500) ima vmesnik v poljščini
(`src/i18n/pl/`, jezik `pl`, `pl-PL`, `JEZIK_DRZAVE.PL`), vstop `slff.eu/pl`,
kartico ob deljenju `pl.html` (Caddy jo vrne za `/pl` in `?t=pl-…`), poljsko
vejo pošte (`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`, pozdrav "Cześć") in poljska imena lastnikov hišnih
ekip ("Jakub Nowak"). **Šifra poljske lige se začne z `pl-`.** Ugib: brskalnik
`pl` ali pas `Europe/Warsaw`. Izrazi kot v poljskih fantasy igrah: drużyna,
kadra (15), wyjściowy skład / jedenastka, ławka, kapitan, wicekapitan,
transfery, bramkarz, obrońca, pomocnik, napastnik, tabela, ranking, asysta,
kartka, czyste konto, punkty, miniliga; `krog` je vedno **kolejka** ("5.
kolejka"), pripomoček `klop_plus` je "Ławka+". Množine one/few/many/other
(`Intl.PluralRules('pl')`): `one` 1, `few` 2–4 (22–24 …), `many` 0 in 5–21
(25 …), `other` le decimalke, ki dobijo rodilnik ednine ("1 punkt, 2 punkty,
5 punktów, 1,5 punktu"); `two` poljščina nima. Poljščina ima 7 sklonov, zato
ime lige **ostane v imenovalniku** in stoji samostojno za dvopičjem ali v
oklepaju ("Liga fantasy jest otwarta: {liga}"); `ligaVTozilniku` ga pusti.
Psevdonim v klepetu ima pridevnik pred samostalnikom ("Niebieski Bramkarz
42", vsi samostalniki so moškega spola). Stran Pozicije je v meniju kot v
Sloveniji. `PL` je v matriki nočnega uvoza. Zveze, tekmovanja in vir vpiše
svoja migracija. Manjka še: poljski kanal v HelpStacku (`Podpora.tsx` za `pl`
uporabi slovenskega) in **pregled prevoda pri naravnem govorcu**.

## Poljska — vir `pzpn`

Država, jezik in vmesnik so opisani zgoraj (*Poljska*); lige vpiše migracija
20261012003000.

Vir `pzpn` (`scripts/viri/pzpn.mjs`) bere **uradne zapisnike PZPN** (Extranet,
"protokół"). PZPN jih hrani v skupnem API-ju (`shared-api-ng.laczynaspilka.pl`,
ključ zahteva Bearer); vojvodska zveza ga ima za svoja tekmovanja in jih na
svoji strani pokaže z gradnikom, ki bere JSON prek **javnega posrednika
zveze** — tega beremo tudi mi. Zaenkrat ga ima le **Świętokrzyski ZPN**
(szpnkielce.pl, `/wp-json/szpn/v1/proxy`, gradnik `szpn-widget` podjetja
3CK). Ključ posrednika velja le za tekmovanja te zveze (druga zveza → 403;
3. liga gr. 4 vrne zapisnik brez postav). **laczynaspilka.pl ima iste
zapisnike za vso Poljsko, a so podatki za nevidno reCAPTCHO — ne beremo jih
in je ne obhajamo.** PZPN smo 11. 10. 2026 prosili za ključ Shared API
(pzpn@pzpn.pl, wsparcie@pzpn.pl), ŚZPN za soglasje (biuro@szpnkielce.pl).

- **Šifra lige** je `<zveza>/<play_id>` (`swietokrzyski/0e86c2b3-…`); zveze
  in posredniki so v `POSREDNIKI`. Play_id je tekmovanje ene sezone; seznam
  vrne `plays.json` (tekoča sezona) oz. `plays.json?season_id=<id>` (sezone
  so v istem odgovoru: "Sezon 2026" = 2026/27, "Sezon 2025" = 2025/26).
- **Tekme**: `matches.json?play_id=…&type=results|schedule` — `round_label`
  ("Kolejka 7"), `kickoff_at` (varšavski = ljubljanski čas), `state`
  (`Rozegrany` / `Nierozegrany`), `score.final` "2:8" in `score.half`. Prosti
  krog je tekma s klubom "pauzuje w tej kolejce" — vir jo izpusti. Walkower
  vir prepozna po `state` (/walk/), primera še nismo videli.
- **Zapisnik** `pzpn/shared/matches/<id>/events.json`: `squad` obeh ekip
  (`type` Starter/Substitute, `number`, `isKeeper`, `isCaptain`, `id` = stalna
  šifra osebe → `reg_st` kot pri hlf), pri igralcu `goals` (`Normal`,
  `PenaltyKick`; avtogol `own` še ne videli — opozorilo), `cards` (`Yellow`,
  `SecondYellow`, `Red`) in `substitutions` (`In`/`Out`) z minuto ("90' +2'"
  → 90). Imena sodnikov in osebja ne beremo. Rdeči karton rezervi, ki ni
  vstopila (z klopi), ne šteje (ni nastopa).
- Vljudno: 3 s med zahtevki, User-Agent SLFF, popolnih zapisnikov ne beremo
  znova. Odgovor, ki ni JSON ali ima `success: false`, ustavi uvoz.

Preizkus (11. 10. 2026): 15 zapisnikov IV lige, okręgowe in klase A — vsi
11 + 11, vratar pri vseh 30 ekipah, goli = izidi, 0 opozoril; Klasa B Kielce I
v živo — 78 tekem z uro, 36 zapisnikov, goli = izidi (197), 1120 nastopov.

Vpisanih je 8 lig (migracija 20261012003000), **neaktivnih**, zveza
`szpn-swietokrzyski`. Skupine A in B so z lanskimi povezane po skupnih klubih:

| liga | tekoča 2026/27 (`swietokrzyski/…`) | arhiv 2025/26 |
|---|---|---|
| pl-sk-4-liga | `0e86c2b3-75d3-483b-80a0-4f086352afc5` | `swietokrzyski/3917069b-155b-41df-ae80-0e9ad0308f7f` |
| pl-sk-okregowa | `1681c4a3-9391-4990-b155-7f2c06535441` | `swietokrzyski/fbb005a3-73d0-493e-bfb4-325ea22d3784` |
| pl-sk-a-kielce-1 | `a6cd6f08-26ed-4cc6-8504-80d0e43c0882` | `swietokrzyski/797b8608-c6a0-4644-b282-9db632b9e441` |
| pl-sk-a-kielce-2 | `3f6b628a-737c-47be-8f56-15445e1bd347` | `swietokrzyski/0ec33104-08fa-4376-abd2-70e6dc036362` |
| pl-sk-a-sandomierz | `64ee2db0-9540-4372-9928-dfe268fc963e` | `swietokrzyski/7adb9e67-efd6-405d-962b-20d8ee4fa8be` |
| pl-sk-b-kielce-1 | `ed980a22-e851-4b47-bf75-5dfbee9f60cc` | `swietokrzyski/e5e68aa9-4602-42f9-80f5-b6d3b73330e1` |
| pl-sk-b-kielce-2 | `9c6fbee7-a9e5-4abd-84da-13bcf42c2d60` | `swietokrzyski/f23013ff-ca5d-4b08-be78-16bfb9442df9` |
| pl-sk-b-sandomierz | `740e1d89-139f-4fdd-a431-23a7da11b23c` | `swietokrzyski/9056e3a0-c498-4f72-b523-288d15a3e21e` |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=pl-sk-4-liga -f
arhiv=swietokrzyski/3917069b-155b-41df-ae80-0e9ad0308f7f -f cene=true`.
