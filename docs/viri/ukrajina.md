# Ukrajina — vir `aft` (Ternopilska oblast)

Vir `aft` (`scripts/viri/aft.mjs`) bere **aft.com.ua** (Асоціація футболу
Тернопільщини): oblastno prvenstvo, Вища ліга (raven 5, pod AAFU) in Перша
ліга (raven 6). Država `UA` ("Україна") in zveza `aft` sta v migraciji
20261015230500 (država z `on conflict do nothing`, ker jo vpiše tudi vir
`pfl-ua`). Ukrajinskega vmesnika, kartice in pošte še ni, `UA` ni v matriki
nočnega uvoza — oboje pred vklopom. Šifra lige se začne z `ua-`.

- **Sezona je koledarsko leto** (maj–oktober, `sezona_koledarska`): `"2026"`.
  Vir jo vzame iz naslova turnirja ("Чемпіонат Тернопільської області 2026")
  in preveri, da je to leto tekem.
- **Šifra lige je id turnirja** (`/tournament/champinship/<id>`): 36 = Вища
  ліга 2026, 37 = Перша ліга 2026. Vsaka sezona ima svojega — spomladi 2027
  se šifra popravi, 2026 postane arhiv (`arhiv=36` oz. `37`).
- **Razpored** je stran turnirja: "Тур N", kartice tekem z id-jem
  (`/match/<id>`), datumom in krajem, klubi (kraj v `alt` grba) in izidom ali
  uro neodigrane (kijevski čas → ljubljanski −1 h). **Izid 3:0/0:3 brez kraja
  je kontumacija** (Нараїв od avgusta 2026 ne igra več: 8 tekem). Prestavljena
  tekma stoji v krogu dvakrat (neodigrana s starim datumom, odigrana z novim);
  neodigrana vrstica odpade.
- **Postav na strani tekme ni** (`/match/<id>` ima le izid, uro in sodnike;
  "Склад команди" je prazen). Postave so v **novicah** (ponatis iz časopisa
  Газета 1): Вища ліга en članek na tekmo s prostim naslovom, Перша ліга en
  članek na krog. Članka brez sluga ni mogoče nasloviti (`/news/1800` → 404),
  zato vir bere seznam novic (`/news?page=N`, 12 na stran) in ga hrani v
  `scripts/.predpomnilnik/aft/novice.json`; vsak zagon prebere sveže le prve
  strani do že znanih novic, starejših od dveh tednov (pozneje objavljen
  članek z zgodnejšim datumom stoji globlje). Prvi zagon sezone bere ~40
  strani in ~470 člankov (strežnik je počasen, 3–10 s na stran: ~45 minut).
  **Izbrisan članek** (404, 410 — umaknjena novica, spremenjen slug) lige ne
  ustavi: opozorilo, članek izpade iz `novice.json`, uvoz gre naprej.
  401, 403, 429, izziv in 5xx še vedno ustavijo uvoz.
- **Blok tekme** v članku: glava `«Дом» (kraj) – «Gost» (kraj) – 1:0 (0:0)`,
  datum ("11 жовтня"), postavi `«Klub»: …`, "Гол(и):", "Попереджені:",
  "Вилучений:", stavek "На 34-й хвилині … не реалізував пенальті" in pri Вищі
  "ТАКТИЧНА РОЗСТАНОВКА" (polna imena po mestih, "Воротар – …"). Blok se ujame
  s tekmo razporeda po klubih (ime in kraj, številka se mora ujemati:
  "Борщів-2" ni "Борщів") in datumu ±3 dni; ime v članku je pogosto drugo
  ("ФАТ-Вікнини" = Вікнини, "Арсенал" = Арсенал-Теребовля). Kadar je datum v
  članku napačen ("16 липня" namesto avgusta) ali je bila tekma dokončana
  pozneje ("у дограванні"), se tekma brez poročila ujame še ohlapno po klubih
  in izidu (opozorilo).
- **Postava**: enajst priimkov, "-к" kapetan, soimenjak z začetnico
  ("Семенець Т.", "Д. Марчук" → "Марчук Д."), menjava v oklepaju
  ("Грабчак (Марцінковський, 64)", veriga "(Гринь, 60, Дума, 90+4)"), za
  "Заміна:" neuporabljena klop. **Identiteta je priimek + klub** (kot fsb);
  isti igralec se lahko piše različno ("Пшивий Волод.", "Пшивий Володимир") in
  dobi dve vrstici. Tipkarske napake vira, ki jih vir popravi z opozorilom:
  manjkajoča vejica pri desetih začetnikih ("Чемерейко Слободян" → dva, a ne,
  če je druga beseda ime: "Кладочний Михайло"), odvečna vejica pred menjavo,
  pika ali vprašaj namesto vejice, "Заміна" brez dvopičja.
- **Goli in kartoni** so s polnim imenom brez kluba: igralec se najde po
  priimku (in začetnici), soimenjaka v obeh klubih loči taktična razporeditev,
  sicer izid. Avtogol "(3, а/г)" ali "автогол"; gol, ki ga izid zahteva kot
  neoznačen avtogol (vratar gostov pri 1:0), se šteje kot avtogol z
  opozorilom. Drugi rumeni "(90+4, друге попередження)" → 1 rumeni + rdeči.
  Kartoni trenerjev in uradnih oseb ("тренер", "офіційна особа") ne štejejo.
- **Vratar**: "Воротар" iz taktične razporeditve, sicer prvi začetnik (namig,
  kot mlsz). *Uskladi pozicije* z `vir = aft`.
- **Predpomnilnik**: stran turnirja in seznam novic vedno sveža; članek
  zadnjega tedna svež, do 45 dni še enkrat svež, če ima nepopoln blok (postava
  ni 11 ali goli niso izid). `zaPredpomnilnik` ne shrani vzdrževalne strani.

**Pravice.** robots.txt: `User-agent: * / Disallow:` (nič prepovedanega),
pogojev uporabe ni. Lastnik pravi, da imamo dovoljenje za branje. Beremo
odkrito (User-Agent SLFF, 3 s med zahtevki). **Ob 401, 403, 429 ali izzivu se
uvoz ustavi** (`AftZavrnitev`, izhod 4) — ne obhajaj. Sodnikov, opazovalcev
in osebja ne beremo; vzorci `scripts/vzorci/ua-aft-*` so brez njih.

Preizkus v živo (15. 10. 2026, vsa sezona 2026, brez pisanja v bazo):

| liga | tekem | kontumacij | s poročilom | goli = izid | postav po 11 | 990 minut | nastopov (s klopi) |
|---|---|---|---|---|---|---|---|
| Вища ліга (`36`, 9 klubov, 18 krogov) | 72 | 8 | 62/64 | 62/62 (188) | 124/124 | 118/124 (6 z rdečim) | 1870 (506) |
| Перша ліга (`37`, 7 klubov, 21 krog) | 60 + 3 neodigrane | 0 | 60/60 | 60/60 (171) | 118/120 | 113/120 | 1760 (440) |

Brez poročila sta Агрон–Сокіл (12. 9.) in Борщів–Поділля ВБ (3. 10.) —
članek je le pripoved. Перша: dve postavi nista po 11 (Арсенал z 10, napaka
vira z 12), 5 menjav brez minute (rezerva brez nastopa). Igralcev z vsaj 270
minutami: 145 od 214 (Вища), 122 od 187 (Перша).

| liga | klubov | tekoča 2026 | arhiv |
|---|---|---|---|
| ua-te-vyshcha | 9 | `36` | — (2026 postane arhiv sezone 2027) |
| ua-te-persha | 7 | `37` | — |

Izpuščeno: Ліга Тернопільщини 2026/27 (le goli in kartoni, brez postav),
Ліга чемпіонів, kupi, veterani, futsal, ДЮФЛ (mladinske).

Uvoz (ena za drugo; lige so **neaktivne**): `gh workflow run uvoz-lige.yml -f
liga=ua-te-vyshcha -f cene=true` (brez arhiva).
## Ukrajina — vir `hoff-km` (Hmeljnicka oblast)

Vir `hoff-km` (`scripts/viri/hoff-km.mjs`) bere **hoff.km.ua**, spletišče
Хмельницька обласна асоціація футболу (ХОАФ): oblastno prvenstvo (ЧХО),
Vyshcha liga (6 klubov) in Persha liga (5 klubov), raven 5 in 6. Ime vira je
`hoff-km` (ne `hoff.km`), ker delovni tokovi sprejmejo le `[a-z0-9-]`. Država
`UA` (vpiše jo ta migracija ali `pfl-ua`, `on conflict do nothing`), zveza
`hoaf-km` (migracija 20261015230700); **vmesnika v ukrajinščini, kartice in
pošte še ni in `UA` ni v matriki nočnega uvoza** — oboje pred vklopom. Šifra
lige se začne z `ua-`.

- **Sezona je koledarsko leto** (maj–oktober, `sezona_koledarska`): oznaka
  `"2026"`. **Šifra lige je slug strani lige** (`chho-2026-vyshha-liga`,
  arhiv `chho-2025`), leto v slugu je sezona; stran druge sezone uvoz ustavi.
  Ob novi sezoni se vpiše nov slug. Seznam strani: `/wp-json/wp/v2/pages?search=ЧХО`
  (ali meni "АРХІВ ЧХО", ki 2024 in 2025 ne našteje).
- **Razpored** je ročno vnesena tabela v vsebini strani lige ("Тур | Дата |
  № гри | Господарі | Гості | Рахунок"; 2025 je "№ матчу" pred datumom —
  stolpci po glavi). **Ure ni** (`ura: null`, rok kroga po privzetem); če bi
  bila, je kijevska → ljubljanska (−1 h). Krog brez številke vzame prejšnjega.
  Tekme istega kroga so lahko mesece narazen (1. krog 2026: 9. 5. in 1. 7.).
- **Tehnični izid** je zvezdica z opombo pod tabelo ("* Матч №9 – неявка
  гостей… техічна перемога", "КДК анулював результат") ali "3:0 (+:-)".
  Brez objave s postavami (neigra) in starejši od tedna je **kontumacija**;
  z objavo (KDK je razveljavil odigrano tekmo: 1:0 → 0:3) je tekma z uradnim
  izidom, prejeti goli in čista mreža pa so z igrišča (`izidIgrisca`, kot
  `pfl-ua`). Opomba s "призупинено / догравання / перенесено" (letalski alarm
  pri 0:0) pomeni, da tekma še ni odigrana — brez izida.
- **Zapisnik je objava tekme** ("ЧЕМПІОНАТ ОБЛАСТІ: A – B", 2025 "ЧХО-2025.
  14 ТУР. A – B"). Beremo **javni REST WordPressa** (robots.txt zapre le
  /wp-admin/): seznam vseh objav leta (le id, datum, naslov; ~3 strani po
  100), filter po naslovu, nato vsebina objav tekem po 100 — ~5 zahtevkov na
  ligo. **Oznake in kategorije niso popolne** (`sezon-2026`,
  `chempionat-oblasti` in "ОБЛАСНІ ТУРНІРИ" vsaka zgreši nekaj tekem; Нива :
  Олімп 2026 je le v "Новини"), zato ne filtriramo po njih. Objava gre tekmi
  po paru klubov iz naslova (prva beseda imena brez "ФК"; glava objave je
  rezerva — v 12. krogu 2026 piše "Енергетик – Енергетик"), med več takimi po
  krogu ("Матч 15 туру", "14 ТУР") in nato po najbližjem datumu.
- **Postava**: "“Колос”: Бушняк, …, Бартошук – к, Музичук (Панфілов, 78)."
  Le enajsterica in rezerve, ki so prišle; **neuporabljene klopi ni**. V
  oklepaju rezerva in minuta vstopa; veriga "(Чабак, 20 (Омельчук, 64))" ali
  "(Гацький, 46, Чуб, 57)" — tudi rezerva gre ven (`preklopi`). Ročne napake,
  ki jih razčlenjevalnik prenese z opozorilom: neuravnotežen oklepaj, rezerva
  brez minute ("(Григор’єв)" → brez nastopa), manjkajoč začetnik ("…,  (Муляр,
  90+3)"), oklepaj za vejico ("Закорчменний, (Бондаренко, 79)"), isto ime
  dvakrat (drugi vnos izpuščen), ostanek za koncem stavka ("Омельчук. (Муляр,
  63), Гудзь…" — izpuščen). **Vratar ni označen**; prvi začetnik (in kdor ga
  zamenja) je vratar kot namig (kot mlsz, ffm); *Uskladi pozicije* z
  `vir = hoff-km`.
- **Dogodki**: "Голи: A (18, 32), B (58-пен.) – C (61)", avtogol pri minuti
  ("6 – а/г", "75–а/г") šteje nasprotniku, "На 58 хв. … не реалізував
  пенальті" (zgrešena 11 m), "Попередження:" rumeni, "Вилучення:" rdeči
  ("друге попередження" = 1 rumeni + rdeči, "по завершенню гри" → 90). Strelca
  in karton **pripišemo ekipi po postavi, ne po strani pomišljaja** (Вишнівчик
  2:0 Поділля, 10. 10. 2026: domači strelec za pomišljajem); neznan strelec je
  gol ekipe brez strelca (ne nov igralec — sicer gol brez nastopa). Karton
  trenerja ne šteje.
- **Identiteta: ime + klub**, šifer ni. Objave pišejo večinoma le priimek, ime
  le ob soimenjaku ali pri strelcu ("Олійник" / "Олійник Владислав"), ista
  oseba pa je kdaj "Матанчук", "Матанчук Денис" in "Матанчук Д.". **Ime se z
  novimi objavami ne sme spremeniti**: uvoz išče igralca po polnem imenu, nočni
  uvoz znova uvozi le zadnjih 21 dni, zato bi preimenovanje enega igralca
  razdelilo na dva (pregled sezone 2026: 86 od 1186 nastopov Vyshcha in 65 od
  737 Persha, preden je bilo popravljeno). `poenotiImena` gre skozi objave po vrsti
  (datum, id) in osebi kluba da ime, kot ga je postava napisala ob njenem
  **prvem** nastopu; poznejšo obliko (golo ime, ime, začetnica) pripiše
  obstoječi osebi le iz prejšnjih objav in iste objave, ime strelca se le
  nauči. Nova objava tako starih imen ne spremeni (smoke: vsak rez po datumu).
  Dvoumno (dva Бойка, golo "Бойко") ostane, kot je napisano; soimenjaka v
  klubu, ki ju postava piše z imenom, sta dva igralca (Сідорчук Владислав in
  Станіслав). Ime v naslednji sezoni je spet ime iz postave (večinoma golo),
  zato se med sezonama ujema bolje kot polno ime strelca.
  Šifra zapisnika v bazi je `hk<id objave>`.
- **Predpomnilnik**: stran lige vedno sveža; seznam in vsebina objav tekočega
  leta vedno sveža, arhiv iz predpomnilnika — a če kateri tekmi do 45 dni
  manjka objava ali je nepopolna, še enkrat svež. Goli ≠ izid v zadnjem tednu
  je `zapisnik nepopoln` (brez `imported_at`, nočni uvoz bere znova), pozneje
  le opozorilo. V predpomnilnik gre le stran lige z razporedom in pravi JSON
  (`zaPredpomnilnik`), ne stran vzdrževanja ali napaka WordPressa.
- **Isto ime, drug klub**: "Колос" (2025) = "Колос Полонне", "ДЮСШ-2" =
  "ДЮСШ-2 Імпульс" (preimenovan sredi 2025) — `IME_KLUBA` v viru. Natančno ime
  (`poenostavi`) ohrani kraj, zato "Нива Летичів" ni "Нива (Вінниця)" iz
  `pfl-ua`.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt je privzeti
WordPressov (Disallow /wp-admin/), pogojev uporabe ni; po besedah lastnika (15. 10. 2026) za branje
imamo dovoljenje. Beremo odkrito (User-Agent `SLFF fantasy (https://slff.eu)`,
**3 s** med zahtevki, `hoffFetch`). Sodnikov, opazovalcev, fotografij in
videov ne beremo; vzorci `scripts/vzorci/ua-hoff-*` so brez njih. **Ob 401,
403, 429, izzivu ali CAPTCHI se uvoz ustavi — ne obhajaj** (`HoffZavrnitev`,
izhod 4; `hoffFetch` zavrne že pred ponovitvijo 429 in pred shranjenim
razporedom).

Preizkus v živo (15. 10. 2026, vse tekme, brez baze; ~30 zahtevkov z raziskavo vred):

| liga | tekem / z izidom | kontumacij | zapisnikov | goli = izid | postav po 11 | menjav (z minuto in parom) | 990 minut |
|---|---|---|---|---|---|---|---|
| Vyshcha 2026 | 45 / 43 | 1 (+1 mlajša od tedna) | 41 | 41/41 | 81/82 | 284 (283) | 80/82 |
| Persha 2026 | 30 / 30 | 3 | 27 | 25/27 | 52/54 | 140 (140) | 48/54 |
| ЧХО 2025 (arhiv) | 42 / 42 | 4 | 38 | 37/38 | 73/76 | 292 (292) | 70/76 |

Vsa odstopanja so napake vnosa (objava brez vrstice "Голи", 10 ali 13 imen v
enajsterici, gol premalo); opozorila so v `import_warnings`. Noben gol ni brez
nastopa strelca. **Sezona 2026 je ob vpisu končana** (Vyshcha še 13. krog
Вишнівчик : Колос in prekinjena Поділля : Оболонь, 17. 10.) — vklop realno
za 2027 (nov slug). Persha liga ima pet klubov — spodnja meja (3 iz kluba × 5).

Vpisani ligi (migracija 20261015230700), **neaktivni**, zveza `hoaf-km`:

| liga | klubov | tekoča 2026 | arhiv |
|---|---|---|---|
| ua-km-vyshcha | 6 | `chho-2026-vyshha-liga` | `chho-2025` (7 klubov, skupna Колос Полонне in Оболонь-Чемерівці) |
| ua-km-persha | 5 | `chho-2026-persha-liga` | — (lani je ni bilo) |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=ua-km-vyshcha -f
arhiv=chho-2025 -f cene=true`; Persha brez `arhiv`.
