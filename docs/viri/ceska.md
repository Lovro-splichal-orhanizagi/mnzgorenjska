# Češka

Vir `facr` (`scripts/viri/facr.mjs`) bere **javni del IS FAČR**
(is.fotbal.cz/public), sistem, v katerem FAČR ter krajske in okrajne zveze
vodijo vsa tekmovanja do IV. třídy. Zapisnik je na vseh ravneh enak: postavi
s številko dresa in **šifro igralca FAČR** (osem števk, → `reg_st`; vodilna
ničla odpade), vratar `B`, menjava, rumeni (dva stolpca) in rdeči z minuto,
strelci v svoji tabeli s tipom (`Branka`, `Pokutový kop`, vlastní). Vrstice
`po1`–`po11` so začetniki, od `po12` klop.

- **Leteče menjave**: nižje lige dovolijo, da gre igralec ven in nazaj. Stolpec
  `Stř.` ima zato dve celici — zaporedni spremembi stanja. `nastopi` v
  `facr.mjs` sešteje minute iz obeh (`minuteIzPreklopov`).
- **Ime kluba iz razporeda**: razpored lahko piše kratko ("Vyškov"), zapisnik
  polno; uvoz vzame ime iz razporeda, sicer bi klub nastal dvakrat.
- Krogi so na strani tekmovanja razvrščeni po datumu, ne po številki
  (prestavljen krog stoji kasneje) — številka pride iz naslova `N. kolo`.

**Dostop.** IS odgovarja le iz EU: GitHubovi tekači (Microsoft, ZDA) ne dobijo
povezave, strežnik SLFF (Hetzner) jo dobi. Zato zahtevki tečejo prek
posrednika na strežniku (`scripts/hetzner/facr-posrednik.sh`, tinyproxy, samo
is.fotbal.cz:443, geslo, omejen CPU in RAM), naslov je skrivnost `FACR_PROXY`.
Uvoz sam teče na GitHubu kot vsi drugi. Vsak zahtevek potrebuje sejo (piškotka
z naslovnice); brez nje IS preusmeri na `/public/?redir=v4` — to ureja
`facrFetch`. **www.fotbal.cz je za Cloudflarovim izzivom: ne beremo ga in ga
ne obhajamo.** Iskanja tekem (CAPTCHA) ne uporabljamo; iskalnik tekmovanj
nam ne vrne ničesar, tudi z izbrano okrajno zvezo.

**Šifra lige je UUID tekmovanja** (`detail-souteze.aspx?req=<UUID>`), isti kot
v naslovu `www.fotbal.cz/souteze/turnaje/hlavni/<UUID>`. Vsaka sezona je svoje
tekmovanje (ročník 2026 = 2026/27), zato se UUID ob novi sezoni vpiše ročno.
Številka tekmovanja `2026211A1A` = ročník, zveza (211 = OFS Benešov), koda.

Vpisanih je 12 lig štirih okrajev (migracija 20261008235100), **neaktivnih**.
Šifre (UUID) so dolge, zato tu le začetek; polne so v migraciji in spodaj za arhiv:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| cz-bn-op / -3a / -3b | `cf517b12…` / `696d3dfb…` / `96b956df…` | `e7520b40-ec17-46dc-a736-f2867ce40991` / `fdf890f1-d213-492f-abf1-6a98b9d76f14` / `797ae0d9-8a48-4626-be4e-fd0a59027e4e` |
| cz-bo-op / -3a / -3b | `640ad2e8…` / `326544ca…` / `65736e4c…` | `7d7f1453-588b-4b39-84e4-5b2c0b65f9f6` / `4cd6a445-1411-4b55-8f77-5013dba9133d` / `5436be6a-adb0-426b-b169-afc31b5641c4` |
| cz-ph-op / -3a / -3b | `e62b1d0c…` / `cda51ba4…` / `e9d912c6…` | `ce6b24c1-1826-48c0-b8c1-404461e5e965` / `de11dd4b-9fd5-49d0-b1f5-785c76601455` / `12d1eb58-8f55-487d-8a25-2eb1758b70c8` |
| cz-pj-op / -3z / -3v | `2065a536…` / `4e322683…` / `3174430a…` | `24c32f84-d385-48a3-a447-7baefbb6873d` / `57b0c3b6-9136-498a-9a8a-3c7f60f8a61e` / `09e86dd4-a53f-4d2f-a3d9-162d93fd5e09` |

Plzeň-jih je imel 2025/26 v III. třídi še nadaljevanje (nadstavba POSTUP
`44ba171d-97fb-431f-b48d-9ad8fd83b932`, UMÍSTĚNÍ `f408f571-7dc4-4cf2-ab96-6c1d1320b5f8`)
z ekipami obeh skupin; za arhiv ga NE uvažamo, ker bi v ligo pripeljal
igralce druge skupine. Seznam tekmovanj okraja je na www.fotbal.cz
(Rozcestník soutěží → kraj → okres, arhiv pod "Archiv").

Beremo odkrito (`User-Agent: SLFF fantasy`, 1 s med zahtevki, zaključenih
zapisnikov ne beremo znova). Dovoljenja FAČR še nimamo.

**USTAVLJENO (8. 10. 2026, 23:03).** Prvi pravi uvoz (cz-bn-op) je padel:
vsak zapisnik zdaj preusmeri na `security-valid.aspx` ("Bezpečnostní ověření
… ověřte že nejste robot", CAPTCHA), tudi tisti, ki se je nekaj ur prej
odprl. To je zaščita pred roboti — **ne obhajaj je** (ne reševanje CAPTCHA,
ne nove seje ali IP-ji, ne brskalnik brez glave). Češke lige ostanejo
neaktivne, nočni uvoz jih zato ne bere. Naprej le z dovoljenjem ali dostopom
FAČR (API, seznam dovoljenih IP-jev); vir, posrednik in lige so pripravljeni.

9. 10. je CAPTCHA izginila (zapisnik spet 200) — verjetno jo je sprožil
tempo (1 s med zahtevki). Vir zdaj čaka **8 s** med stranmi, lige se uvažajo
**ena za drugo**, in ob prvi preusmeritvi na `security-valid.aspx` uvoz
vrže `FacrPreverba` in se ustavi. Če se to zgodi, Češka spet čaka na FAČR.

**Zgodilo se je takoj** (9. 10. ob 00:18): prvi zapisnik prvega uvoza je
spet vrnil CAPTCHO, kljub 8 s premora. Zapora torej ni odvisna od tempa.
**Češka čaka na odgovor FAČR; do takrat k is.fotbal.cz ne pošiljamo NIČESAR**,
tudi posameznih preizkusov ne.

Država `CZ` ("Česko", migracija 20261008233100) ima vmesnik v češčini
(`src/i18n/cs/`, jezik `cs`, `JEZIK_DRZAVE.CZ`), vstop `slff.eu/cz`, kartico
ob deljenju `cz.html` (Caddy jo vrne za `/cz` in `?t=cz-…`), češko vejo pošte
(`sporocila.ts`, avtentikacijske predloge in zadeve v
`docker-compose.slff.yml`) in češka imena lastnikov hišnih ekip. **Šifra
češke lige se začne s `cz-`** (koda države, ne jezika), sicer jezik ob
nalaganju ne ve, da gleda Češko. Ugib: brskalnik `cs`, pas `Europe/Prague`.
Stran Pozicije je v meniju kot v Sloveniji in na Hrvaškem (če češki vir
pozicije prinese, jo skrij v `Navbar.tsx` kot za SK). Češkega kanala v
HelpStacku še ni: `Podpora.tsx` za `cs` uporabi slovenskega.
