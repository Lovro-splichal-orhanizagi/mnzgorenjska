# Kazahstan — vir `kff`

Država `KZ` ("Қазақстан", migracija 20261015171700) ima le lige; vmesnika v
kazaščini/ruščini, kartice, pošte in hišnih ekip **še ni**, `KZ` **ni** v
matriki nočnega uvoza — vse to pred vklopom. Šifra lige se začne s `kz-`.
Sezona je **koledarska** (marec–november, `sezona_koledarska`, oznaka
`"2026"`); 2026 se ob vpisu končuje, vklop bo realno za 2027 (takrat se šifre
popravijo: leto, id sezone, klub konference).

Vir `kff` (`scripts/viri/kff.mjs`) bere **kffleague.kz** (uradna stran lig
KFF; Premier liga, Prva in Druga liga, ženske, pokal). Stran je Next.js, a
strežnik vsaki strani tekme priloži podatke kot JSON v drevesu RSC
(`self.__next_f.push`, ključi `matches:<id>:ru:detail|lineup|events`) —
beremo ta JSON. **robots.txt prepove `/api/` in `/_next/`: tja ne hodimo
nikoli.** Strani lig, tabel in klubov si sezono naložijo prek `/api/`
(strežnik izriše le privzeto Premier ligo), zato **seznama tekem lige ni na
nobeni strani**: kandidati so tekme iz `sitemap.xml` (`/matches/<id>`,
`lastmod` = dan tekme) z letom sezone in tekme gradnika kroga na strani lige
(`/ru/first-league`, `/ru/second-league`); vir vsako prebere in obdrži tiste
z iskanim `season_id`.

- **Šifra lige** `<turnir>/<leto>/<sezona>[/<klub>][@<od>-<do>]`: turnir `1l`
  ali `2l` (stran lige), leto, id sezone KFF, id kluba, ki določi konferenco
  Druge lige (obe sta v istem `season_id` in `stage`; konferenca = povezana
  komponenta tekem rednega dela, "Тур N"), in razpon id-jev tekem za arhiv
  (sitemap našteje le tekočo sezono in lansko Premier ligo). Faze zunaj
  rednega dela (finale Druge lige, pokalni krogi) niso del lige.
- **Tekma**: datum in ura (**Almaty, UTC+5 brez poletnega časa** →
  ljubljanska: poleti −3 h, pozimi −4 h; 2025 brez ure), krog (`tour`),
  status (`finished`, `upcoming`, `cancelled` = klub izstopil, ҚАРШЫҒА 2026 —
  ni v razporedu; `technical_defeat` z `is_technical` = **kontumacija**, izid
  brez postav). Postavi: začetniki in klop s **šifro osebe KFF** (`player_id`
  → `reg_st`, ista v vseh ligah), dresom, **pozicijo** (GK, DEF, MID, FWD — pri
  vseh, tudi na klopi; vratar = GK) in kapetanom. Časovnica: goal, penalty,
  own_goal (pri strelčevi ekipi, šteje nasprotniku), yellow_card,
  second_yellow (prvi rumeni je svoj dogodek → 1 rumeni + 1 rdeči), red_card,
  missed_penalty, substitution (`player` ven, `player2` noter) — **minute so
  točne** (1. polčas do 45, sicer do 90). Pri golu je `player2` asistent
  (2026) ali vratar, ki je gol prejel (2025) — ne beremo. Igralec dogodka je
  kdaj brez šifre in s kazaškim zapisom imena ("Нұрлыбек Қашқанқұл" proti
  "Кашканкул Нурлыбек") — vir ga najde po ekipi in dresu. Karton brez igralca
  in dresa je osebje in ne šteje.
- **Šifra zapisnika v bazi je `kz<id>`** (id tekme KFF je majhno število).
  Ime igralca "Priimek Ime" (`last_name first_name`).
- **Predpomnilnik** (`scripts/.predpomnilnik/kff`): iz strani (0,7 MB) se
  shrani le izvleček JSON (nekaj kB). Tekma tuje sezone se ne bere nikoli več;
  odigrana s postavama in toliko goli kot izid ne (prve 3 dni ob uvozu
  zapisnikov enkrat na 6 ur — druga konferenca istega večera je ne bere
  znova); odigrana brez postave ali golov vsako uro do 45 dni (in še enkrat
  sveže v istem zagonu, `zapisnikSvez`); neodigrana od 3 dni pred datumom do
  14 dni po njem vsako uro, do 14 dni pred in 45 po dnevno, sicer tedensko
  (na začetku sezone nočni uvoz tako ne bere vsak dan vsega razporeda);
  odpovedana in neobstoječa (404) tedensko. Že prebrana tekma, ki naenkrat
  vrne "ne obstaja", obdrži prejšnji izvleček (opozorilo v dnevniku). Stran
  brez podatkov tekme (napaka) **ne gre v predpomnilnik** (`zaPredpomnilnik`)
  in ustavi uvoz. Sitemap 12 ur, stran lige 10 minut. **Nočni zagon v
  ustaljenem stanju** je ~50 zahtevkov za vse tri lige (sitemap, strani lig,
  tekme zadnjih 3 dni, tekme naslednjih ~2 tednov, nepopolni zapisniki), tudi
  ker druga in tretja liga bereta isto mapo. **Prvo branje** pa je ~860 strani
  (vse tekme leta vseh tekmovanj — katera tekma je čigava, pove šele stran)
  in arhiv še ~880 (id 1–883): skupaj ~1750 strani po 6 s je ~3 ure, več kot
  `timeout-minutes: 180` uvoza lige. Predpomnilnik se shrani tudi ob padcu
  ali preklicu, zato ponovni zagon nadaljuje; *Uvoz lige* obnovi
  predpomnilnik lige, nato druge lige iste države (`zapisniki-kz-`), nato
  kateregakoli — druga in tretja kazahstanska liga zato ne bereta vsega znova.
- **Varovala skupine**: liga s klubom v šifri ustavi uvoz (napaka, ne tiho),
  če ima skupina manj kot 4 klube, če jo drži skupaj ena sama povezava (most:
  tekma rednega dela med konferencama, faza, ki je `IZLOCENE_FAZE` ne pozna)
  ali če so klubi srečali manj kot tri četrtine pričakovanih nasprotnikov
  (več tekem med konferencama); šifra brez kluba ustavi uvoz, če ima sezona
  več skupin. Novo fazo (finale, dodatne tekme) dodaj v `IZLOCENE_FAZE`.
  Izstop kluba (odpovedane tekme, `cancelled`) skupine ne razbije — tekme
  ostanejo v grafu, v razporedu jih ni. Klub v šifri naj bo klub, ki igra vso
  sezono.
- **Igralec dogodka po dresu** (časovnica brez šifre): opozorilo, kadar ime
  dogodka ni podobno imenu v postavi (`podobnoIme`: kazaške črke → ruske,
  prve štiri črke katere koli besede) ali kadar ima dogodek šifro, ki je v
  postavi ni — gol ali karton gre tedaj igralcu z istim dresom in to je treba
  preveriti. Na vzorcih (2025 in 2026) se vsi zapisi po dresu ujemajo z imenom.
- Klubi: ključ ohrani kazaške črke, ё = е; **rezervne ekipe "М" so svoj
  klub** ("Туран М" ≠ "Туран", "Кайсар М" ≠ "Кайсар", "Тараз М" ≠ "Тараз").
  Kratko ime: velike črke z veliko začetnico ("ХРОМТАУ" → "Хромтау"). Pregled
  trkov 15. 10. 2026: vsak id kluba ima v sezoni eno ime, isto ime ni pri dveh
  id-jih (ženska "Туран" [665] ni vpisana).
- `ravenLige`: `kz-premier-liga` 1, `kz-1-liga` 2, `kz-2-liga-*` 3.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt dovoli vse
razen `/api/`, `/_next/` in naslovov s sledilnimi parametri. Noga: "При
использовании материалов обязательна ссылка на официальный сайт" — **navedba
vira je obvezna** (`vir_ime` kffleague.kz, `vir_url` na stran lige v nogi).
Dovoljenja KFF nimamo. Beremo odkrito (`User-Agent: SLFF fantasy
(https://slff.eu)`, **6 s** med zahtevki). Sodnikov, trenerjev, fotografij
in videov ne beremo; vzorci `scripts/vzorci/kz-kff-*` so počiščeni. **Ob 401,
403, 429, izzivu ali treh zaporednih omrežnih napakah** (časovna omejitev,
zavrnjena povezava — `NAJVEC_ZAPOREDNIH_NAPAK`, štetje ponastavi vsak
odgovor) **se uvoz ustavi** (`KffZavrnitev`, izhod 4, nočni koš ustavi vse
lige vira; vir ima svoj `fetch`, da 429 in mrtvega strežnika ne ponavlja
stran za stranjo) — ne obhajaj. Če nas prosijo, naj nehamo, `kz-` lige
izklopimo.

**Strežnik nas je nehal sprejemati (15. 10. 2026).** Pregled je s **3,5 s**
med zahtevki prebral ~1700 strani (sitemap 2026 in arhiv id 1–763); po
približno uri in pol so vse povezave h kffleague.kz končale s TCP časovno
omejitvijo (druge strani dosegljive). Izpad ali zapora po IP, ne vemo. Zato:
vir čaka **6 s** (ne manj), tri zaporedne omrežne napake ustavijo uvoz (ne
ponavljanje), prvo branje (~1750 strani) naj teče **le enkrat** in ena liga
naenkrat, ostalo iz predpomnilnika. Pred naslednjim branjem en sam zahtevek
na roko; če povezave še ni, počakaj ali vprašaj KFF.

```bash
node scripts/kazahstanske-lige.mjs                        # sezone leta iz sitemap.xml: id, tekem, skupine s klubi
node scripts/kazahstanske-lige.mjs --od 1 --do 883        # isto za razpon id-jev (arhiv)
node scripts/kazahstanske-lige.mjs --polno 2l/2026/203/332  # vse tekme lige: goli = izid, 11 + 11, 990 minut
```

Sezone 2026: Premier liga 200 (240 tekem), Superpokal 201, pokal 202, Druga
liga 203 (243 tekem, dve konferenci), Prva liga 204 (182), ženske 205.
Preizkus v živo (15. 10. 2026, vse tekme, brez pisanja v bazo):

| liga | tekem | odigranih / zapisnikov | goli = izid | postav 11 (vratar, kapetan) | 990 minut / z rdečim | nastopov (s klopi) | opozoril |
|---|---|---|---|---|---|---|---|
| kz-1-liga | 182, 26 krogov, 14 klubov | 172 / 172 | 171/172 (566/567) | 344/344 | 306 / 35 (3 drugo) | 5390 (1606) | 6 |
| kz-2-liga-yugo-zapad | 108, 27 krogov, 9 klubov | 100 / 100 | 99/100 (331/332) | 200/200 | 179 / 18 (3 drugo) | 3108 (908) | 8 |
| kz-2-liga-severo-vostok | 135, 27 krogov, 10 klubov | 125 / 125 | 125/125 (504) | 250/250 | 218 / 30 (2 drugo) | 3816 (1066) | 3 |

Vsi nastopi s šifro, vse menjave z minuto (oba igralca znana razen 3–4 na
ligo). Opozorila so napake vira: igralec v menjavi ali pri golu, ki ga ni v
postavi (po dresu) — taka ekipa ima manj kot 990 minut.

| liga | tekoča 2026 | arhiv 2025 |
|---|---|---|
| kz-1-liga | `1l/2026/204` | `1l/2025/85@1-883` |
| kz-2-liga-yugo-zapad | `2l/2026/203/332` (Кайсар М) | `2l/2025/80/332@1-883` (Лига A, 6 skupnih klubov) |
| kz-2-liga-severo-vostok | `2l/2026/203/5065` (VPR Astana) | `2l/2025/80/628@1-883` (Лига B, Шахтёр М; 6 skupnih) |

**Arhiv 2025** ni v sitemap.xml; tekme 2025 imajo id 1–~883 (vse
tekmovanja premešana, `--od 1 --do 883`): Premier liga 61, Prva liga 85,
Druga liga 80 (skupini "Лига A" in "Лига B" + "Финал", izpuščen), ženske 84.
Stare tekme nimajo ure, faza je prazna ali "Лига A/B", časovnica pozna le
goal (brez 11 m in avtogolov), yellow_card, red_card in substitution, in je
manj zanesljiva. Preštetje 15. 10. 2026 (id 1–763; **764–883 ni prebranih**,
glej spodaj): Prva liga 163 tekem (3 kontumacije, 160 zapisnikov, goli =
izid 133/160 — 511/553, postav po 11 320/320, 990 minut 261 + 42 z rdečim),
Druga A 94 (goli = izid 88/94, 990 minut 168 + 18), Druga B 92 (77/92,
163 + 21). Manjkajočih ~20 tekem na ligo je verjetno v id 764–883 —
**pred uvozom arhiva prečeši ostanek** in preštej znova.

Zapora pri pregledu (glej zgoraj, *Strežnik nas je nehal sprejemati*): **ne
obhajaj** (drug IP, drug User-Agent); počakaj in poskusi z enim zahtevkom.
Če ostane zaprto, vprašaj KFF.

Uvoz (ena za drugo, **šele po vklopu države**): `gh workflow run
uvoz-lige.yml -f liga=kz-1-liga -f arhiv=1l/2025/85@1-883 -f cene=true`.
