# Ukrajina — vir `aft` (Ternopilska oblast)

Vir `aft` (`scripts/viri/aft.mjs`) bere **aft.com.ua** (Асоціація футболу
Тернопільщини): oblastno prvenstvo, Вища ліга (raven 5, pod AAFU) in Перша
ліга (raven 6). Država `UA` ("Україна") in zveza `aft` sta v migraciji
20261015230500 (država z `on conflict do nothing`, ker jo vpiše tudi vir
`pfl-ua`). Šifra lige se začne z `ua-`.

**Vmesnik in pošta.** Ukrajina ima vmesnik v ukrajinščini (`src/i18n/uk/`,
jezik `uk`, `uk-UA`, **cirilica**, `JEZIK_DRZAVE.UA`; jezik `uk` ni Združeno
kraljestvo, vstop je `/ua`), izbirnik jezika "Українська", vstop `slff.eu/ua`, kartico ob deljenju `ua.html` (Caddy jo vrne za `/ua` in `?t=ua-…`, tudi rezerva `:3201`, `vercel.json`),
ukrajinsko vejo pošte (pozdrav "Привіт", množine one/few/many/other: "1 очко,
2 очки, 5 очок, 21 очко", avtentikacijske predloge in zadeve), ukrajinska imena
lastnikov hišnih ekip in `klub_stik.drzava` (migracija 20261016213700), `IMENA_UA` v
*Hisne ekipe* in `UA` v matriki nočnega uvoza (en koš). Ugib: brskalnik `uk`
ali pas `Europe/Kyiv` (tudi stara imena pasov); **ruski brskalnik ne kaže na
Ukrajino**. Rok v pošti je po kijevsko (uro več kot Ljubljana). Krog je "5-й
тур", ime lige stoji samostojno za dvopičjem. Manjka še: ukrajinski kanal v
HelpStacku in **pregled prevoda pri naravnem govorcu**. Lige ostanejo
neaktivne, dokler jih lastnik ne vklopi.

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
`hoaf-km` (migracija 20261015230700); vmesnik, pošta in nočni uvoz so
pripravljeni (glej začetek datoteke). Šifra lige se začne z `ua-`.

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

## Ukrajina — vir `pfl-ua`

Vir `pfl-ua` (`scripts/viri/pfl-ua.mjs`) bere **pfl.ua** (Професіональна
футбольна ліга України): Peršo ligo (raven 2) ter Drugo ligo A in B (raven 3).
Nižjih lig na pfl.ua ni (amaterska liga AAFU in oblastne zveze so drugje;
Lviv `ffl.org.ua` je poznejši vir). Država `UA` ("Україна") in zveza
`pfl-ua` (migracija 20261016091900); vmesnik, pošta in nočni uvoz so
pripravljeni (glej začetek datoteke). Šifra lige se začne z `ua-`.

- **Šifra lige je `<koledar>/<turnir>`** (`2a/1354`): oznaka javnega
  koledarja (`1`, `2a`, `2b`; ob delitvi Perše lige `1a`, `1b`) in id
  tekmovanja ene sezone. Ob novi sezoni se popravi le `<turnir>` (izbirnik
  sezon je na `/calendar/<turnir>`).
- **Razpored**: javni JSON `/calendar-json/<koledar>` (stran `/custom/6`:
  "Авторизація та API-ключ не потрібні") — tours[].matches[] z matchId,
  datumom, uro (kijevski čas → ljubljanski −1 h; `null`, dokler ni objavljena),
  klubi s teamId in izidom (`score.finished`). JSON da le tekočo sezono; če
  kaže drug turnir (arhiv, nova sezona), vir bere HTML koledar
  `/calendar/<turnir>` (zavihki `id="tourN"`, datum "02.08.26", ura ali
  "не визнач.", izid "2 : 3" ali "– : –"). Oba dasta za 2026/27 iste tekme.
- **Zapisnik** `/game/index/<id>`: glava ("1-й тур", izid v `#m<id>`, datum z
  dvomestno letnico "02.08.26", ura po kijevsko), zavihek "Склади" z obema
  postavama: vrstica `bg-white` začetnik, `bg-dark-subtle` klop; dres, priimek
  in ime s povezavo `/player/view/<id>` (**stalna šifra osebe → `reg_st`**),
  "(K)" kapetan. Dogodki pri igralcu z minuto ("90+3'" → 90, **"ПМ'" = po
  tekmi → 90**): `icon-ball` gol, `icon-ball-plus` gol z 11 m, `icon-autogoal`
  avtogol (pri strelcu v njegovi ekipi, šteje nasprotniku), `icon-ball-miss`
  zgrešena 11 m, `icon-yellow`, `icon-cards` drugi rumeni (→ 1 rumeni + rdeči),
  `icon-red`. Menjava je povezava z `icon-up`/`icon-down` in minuto; opis
  "46': <ven>, <noter>" da par. Leteče menjave šteje `minuteIzPreklopov`.
  **Polčasa ni.** Šifra zapisnika v bazi je `ua<id>`. `nastopi` je hlf-ov
  (po šifri osebe) z zgrešenimi 11-metrovkami (`penalties_missed`).
- **Predpomnilnik**: zapisnik, starejši od tedna, se bere iz predpomnilnika;
  stran z izidom, a brez postav (shranjena, preden je klub vnesel postave)
  vir do 45 dni po tekmi prebere še enkrat svežo, sicer bi obtičala. Tekma z
  izidom brez postav, ki ni 3:0, je opozorilo `pfl-ua: <id> ima izid,
  zapisnik brez postav` v dnevniku uvoza.
- **Vratar** ni označen; zavihek "Схема" ima postavitev začetnikov, vsaka
  ekipa na svojem igrišču — vratar je edini začetnik ob golovi črti (domači
  najmanjši `top`, gostje največji). Namig kot pri mlsz; *Uskladi pozicije*
  z `vir = pfl-ua`. Ostale pozicije na glasovanje.
- **Tehnični poraz** (KDK UAF) je opomba `bg-warning-subtle` nad zapisnikom
  ("зараховано технічну поразку 0:3"): izid je za zeleno mizo, postave in goli
  z igrišča (Нива : Рух, 1. krog 2a 2026/27: 3:0, na igrišču 2:1) — opozorilo
  `tehnični poraz`. **Pravilo:** uradni izid (`rezultat`) velja za tekmo,
  lestvico in zmago; prejeti goli in čista mreža igralcev so z igrišča
  (`z.izidIgrisca`, `nastopi`) — vratar Ниве ima 1 prejeti gol, ne čiste
  mreže. Tako `goals_conceded` ustreza golom v `goals` in točke prejetih golov
  med igranjem (`prejeti_na_igriscu`) se računajo. Kontumacija brez postav (3:0 brez zapisnika, starejša od
  tedna) gre prek `vir.kontumacije`; videli je še nismo.
- **Isto ime, drug klub**: "Нива" je Ternopil (Perša, teamId 1170) in Vinnica
  (2a, 1175; 2025/26 kot 1177). `IME_KLUBA` v viru ju preimenuje po teamId v
  "Нива (Тернопіль)" in "Нива (Вінниця)". **teamId ni nujno stalen med
  sezonami** — ob novi sezoni ali arhivu preveri trke imen. Ključ kluba
  ohrani cirilico; latinične črke sredi cirilične besede ("Гірник-Cпорт" z
  latiničnim C) postanejo cirilične. Rezervne ekipe ("Полісся-2", "Колос-2")
  so svoj klub.
- Arhiv: zapisniki 2025/26 so polni (preverjeno po 3 na ligo), sezone okoli
  2022 in starejše le delno (postave brez dogodkov).

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt:
"User-agent: * / Allow: /". Stran API (`/custom/6`) koledar in lestvice JSON
ponuja javno brez ključa; pogojev uporabe nismo našli. Dovoljenja PFL nimamo.
Beremo odkrito (User-Agent `SLFF fantasy (https://slff.eu)`, **3 s** med
zahtevki, zapisnikov, starejših od tedna, ne beremo znova). Sodnikov in
osebja ne beremo; vzorci `scripts/vzorci/ua-pfl-*` so brez njih. **Ob izzivu,
CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj** (`PflZavrnitev`, izhod 4).

Preizkus v živo (15. 10. 2026, 40 zapisnikov tekoče sezone): Perša 17
zapisnikov, goli = izid 17/17 (52), postav po 11 34/34, vratar 34/34, 147
menjav; Druga A 11, goli = izid 10/11 (en tehnični poraz), postav po 11
22/22, 97 menjav; Druga B 12, goli = izid 12/12 (30), postav po 11 24/24, 93
menjav. Ekipa ima 990 minut razen pri rdečem kartonu.

Vpisane so 3 lige (migracija 20261016091900), **neaktivne**, zveza `pfl-ua`,
Vpisane so 3 lige (migracija 20261015163700), **neaktivne**, zveza `pfl-ua`,
`rok_pomak_ur = 2` (tekme dopoldne):

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|---|
| ua-1-liga | 16 | `1/1353` | `1/1347` (VBET Перша ліга, 16 klubov) |
| ua-2-liga-a | 9 | `2a/1354` | `2a/1348` (11 klubov, 165 tekem, 152 z izidom) |
| ua-2-liga-b | 9 | `2b/1355` | `2b/1349` (11 klubov) |

Druga liga ima 9 klubov (vsak krog en prost). Uvoz (ena za drugo): `gh
workflow run uvoz-lige.yml -f liga=ua-1-liga -f arhiv=1/1347 -f cene=true`.

## Ukrajina — vir `upl`

Vir `upl` (`scripts/viri/upl.mjs`) bere **upl.ua** (Українська Прем'єр-Ліга):
najvišjo ligo, 16 klubov, 30 krogov. Perša in Druga liga sta pri `pfl-ua`
(zgoraj). Država `UA` je iz migracije PFL; zveza `upl` in liga `ua-upl`
(migracija 20261016092500), **neaktivna**. Vmesnik, kartica, pošta in nočni
uvoz so pripravljeni (glej začetek datoteke).

- **Šifra lige je id prvenstva sezone** (`432` = 2026/27, `428` = 2025/26,
  `424` = 2024/25; izbirnik sezon je na strani prvenstva). Ob novi sezoni se
  popravi le id. Neznan id vrne 404; vir sezono vzame le, če je v izbirniku
  izbran iskani id, sicer ustavi uvoz.
- **Razpored** `/ua/tournaments/championship/<id>/calendar`: vsi krogi na eni
  strani, datum ("31.07.2026", 4-mestna letnica) nad tekmami, klubi le z
  imenom (brez šifer). Celica izida je povezava `/ua/report/view/<id>`: izid s
  presledki ("2 : 0") pri odigrani, **ura brez presledkov ("13:00", kijevski
  čas → ljubljanski −1 h) pri razpisani**, "-" brez povezave pri nerazpisani.
  Odigrana tekma ure v koledarju nima (ura je v zapisniku). Prestavljena tekma
  ostane v svojem krogu z novim datumom (Динамо : Лівий Берег, 1. krog, 2. 12.).
  **Izid brez datuma ni odigrana tekma** (Оболонь : Кривбас, 8. krog 2026/27:
  1:0, dogodki do 43', brez datuma in postav — najverjetneje prekinjena);
  uvoz jo javi kot `upl: 15940 ima izid, zapisnik brez postav`.
- **Zapisnik** `/ua/report/view/<id>` ("Рапорт арбітра"): glava ("8-й тур",
  datum in ura "03.08.2026. Понеділок, 18:00", klubi s `/clubs/view/<id>`,
  izid), dva bloka `team-players` ("Стартовий склад", "Запасні", "Тренер" — tega
  ne beremo): dres in `/ua/people/view/<id>` (**stalna šifra osebe → `reg_st`**),
  "(К)" kapetan. **Dogodki so časovnica z imenom, ne šifro**: stran domačih je
  `justify-content: flex-end`, gostje imajo prazno levo celico. `score-1` gol,
  `score-3` gol z 11 m, `score-2` avtogol (pri ekipi strelca, šteje
  nasprotniku), `score-4` zgrešena 11 m, `card-0` rumeni, `card-2` drugi
  rumeni (prvi je svoj `card-0` → 1 rumeni + rdeči), `card-1` rdeči, `change`
  menjava "ven<br>noter" — **minute so točne**. Ime iz časovnice se poveže z
  igralcem ekipe (natanko, nato brez ločil); nepovezan gol ali menjava je
  opozorilo, karton trenerju ne šteje. Vrste so razbrane iz 299 zapisnikov
  (goli = izid). **Polčasa ni.** Šifra zapisnika v bazi je `upl<id>`.
  `nastopi` je iz `pfl-ua` (po šifri osebe, zgrešene 11-metrovke).
- **Vratar**: postavitev (`#field` domači, vratar zgoraj; `#field2` gostje,
  vratar spodaj; `chip id="player_<šifra>"` s `top:`) — kot pri `pfl-ua`.
  *Uskladi pozicije* z `vir = upl`; ostale pozicije na glasovanje.
- **Predpomnilnik**: v predpomnilnik gre le prava stran (`zaPredpomnilnik`:
  koledar s `tour-title`, tekma z `match-main-info`, nikoli izziv). Zapisnik,
  starejši od tedna, se bere iz predpomnilnika; nepopolnega (izid brez postav)
  vir do 45 dni po tekmi prebere še enkrat svežega.
- **Kontumacija / tehnični poraz** (tudi tekme kluba, ki je izstopil):
  koledar jo pokaže kot navaden izid ("0 : 3"), zapisnik ima opombo
  `public-description` ("* Згідно з рішенням КДК УАФ … зараховано технічну
  поразку з рахунком 0:3") in **nima postav** (Олександрія : Оболонь, 17. krog
  2025/26). `vir.kontumacije` jo označi takoj, če je opomba, sicer 3:0 brez
  postav po tednu dni. Koledar s "+ : -" / "- : +" ali "3 : 0 (тп)" bi jo
  označil sam (te oblike nismo videli). Tehnični poraz **s** postavami bi
  dobil `izidIgrisca` kot pri `pfl-ua`.
- **Karton po koncu tekme** ima minuto "FT" → 90 (4 v 2025/26).
- **Isto ime, drug klub**: ključ kluba je skupen s `pfl-ua` (`kljucKlubaUa`),
  ker klubi v državi UA delijo `teams`. Pregled 15. 10. 2026 (UPL 2024/25,
  2025/26, 2026/27 proti Perši in Drugi ligi 2025/26 in 2026/27): isti ključ
  imajo le isti klubi, ki so izpadli ali napredovali (Чорноморець, Буковина,
  Лівий Берег, Рух, Полтава, Олександрія, Ворскла, Інгулець); druge ekipe
  ("Полісся-2", "Колос-2", "Олександрія-2" …) imajo svoj ključ, "Металіст 1925"
  (UPL) in "Металіст" (PFL) sta dva kluba z dvema ključema. "Рух" v Drugi ligi A
  2026/27 (PFL teamId 1484) nosi isti grb kot UPL Рух (Lviv) in deli zapis
  kluba: stran ekipe na pfl.ua je "Рух (Львів)", ustanovljen 2003, Arena Lviv,
  fcruhlviv.com — isti klub, ne drug. Kader so mladinci (letniki 2007–2010),
  a prve ekipe Ruha 2026/27 ni ne v UPL ne v Perši ligi, zato to ni druga
  ekipa ob prvi (pregled 15. 10. 2026; če se prva ekipa vrne, dobi PFL
  ekipa ime "Рух-2" v `IME_KLUBA` pfl-ua). `IME_KLUBA` v viru je prazen; ob novi sezoni preveri trke znova.
- **Cena iz višje lige** ne seže med `upl` in `pfl-ua` (šifre oseb so last
  vira); `ravenLige` ima `ua-upl` vseeno na ravni 1.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt:
"User-agent: * / Disallow:" (vse dovoljeno). Pogojev uporabe strani ni (stran
"Документи" so le pravilniki tekmovanj); noga pravi "Всі права захищені ©
2008-2026". Dovoljenja UPL nimamo; vir (zveza `upl`, `site_url` upl.ua) je v
nogi vsake strani.
Beremo odkrito (User-Agent `SLFF fantasy (https://slff.eu)`, **3 s** med
zahtevki, zapisnikov, starejših od tedna, ne beremo znova). Sodnikov,
delegatov, trenerjev, stadiona in gledalcev ne beremo; vzorci
`scripts/vzorci/ua-upl-*` so brez njih. **Ob izzivu, CAPTCHI, prijavi, 401,
403 ali 429 se uvoz ustavi — ne obhajaj** (`UplZavrnitev`, izhod 4; tudi med
branjem kontumacij v uvozu razporeda). Obrazec za novice v nogi strani
(`<div class="captcha">`) ni izziv.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo, vsi zapisniki, 3 s med
zahtevki): **2026/27** — 30 krogov, 240 tekem, 16 klubov, 61 z izidom (60
zapisnikov + prekinjena 15940), 25 razpisanih z uro; goli = izid 60/60 (143,
4 avtogoli, 14 z 11 m, 1 zgrešena), postav po 11 120/120, vratar 120/120, 990
minut 107/120 (vseh 13 ostalih pojasni rdeči karton), 547 menjav vse z
minuto in obema igralcema, 1867 nastopov (547 s klopi), vsi s šifro, 0
opozoril. **2025/26** (arhiv `428`) — 240 tekem, 239 zapisnikov + 1 tehnični
poraz; goli = izid 239/239 (614, 19 avtogolov, 55 z 11 m, 12 zgrešenih),
postav po 11 478/478, vratar 478/478, 990 minut 452/478 (vseh 26 ostalih
pojasni rdeči karton), 2092 menjav, 7350 nastopov, vsi s šifro, 0 opozoril.

| liga | klubov | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|---|
| ua-upl | 16 | `432` | `428` (16 klubov, 240 tekem) |

Uvoz: `gh workflow run uvoz-lige.yml -f liga=ua-upl -f arhiv=428 -f
cene=true`. Arhiv 240 zapisnikov po 3 s je ~15 minut.

Registrirani obstoječi kandidat `ua-upl` (id 1001) ostane vezan na UPL
sezono `432`. Za celotne arhivske nastope in cene je potreben izrecni arhiv
`428`; vratar je dokazljiv samo iz uradne postavitve igrišča (`#field` /
`#field2`), ne iz vrstnega reda ali dresa. To ne obide običajnih preverjanj
poročil, cen, kadra, roka in dovoljenja za vklop. Ohranita se 3-sekundni
premor in ustavitev ob zavrnitvi.

## Ukrajina — vir `ffl` (Lvivska oblast)

Vir `ffl` (`scripts/viri/ffl.mjs`) bere **ffl.org.ua** (Львівська асоціація
футболу, ЛАФ): oblastno prvenstvo odraslih, Прем'єр-ліга, Перша, Друга,
Третя (tri skupine) in Четверта ліга (dve skupini). Država `UA` je v migraciji
z `on conflict do nothing` (vpišeta jo tudi `pfl-ua` in `aft`), zveza `laf`
in lige v migraciji 20261015165300. Vmesnik, pošta in nočni uvoz so
pripravljeni (glej začetek datoteke). Šifra lige se začne z `ua-`.

- **Sezona je jesen–pomlad** ("Сезон-2026/2027" → `"2026/27"`), ne koledarska.
  Pred njo je bila prehodna pomladna sezona "2026" (april–julij 2026, članki
  "Прем'єр-ліга Львівщини-2026: матчі …" v isti obliki); šifer njenih
  tekmovanj nismo poiskali — arhiv je TODO.
- **Šifra lige je id tekmovanja** (`/cup/<id>`): 837 Прем'єр, 838 Перша, 839
  Друга, 840–842 Третя (skupine 1–3), 844–845 Четверта (skupini 1–2). Vsaka
  sezona ima svojega.
- **Razpored** je stran tekmovanja: drsnik "Тур N" s tekmami (datum in ura,
  kijevski čas → ljubljanski −1 h; "00:00" = ura ni znana), klubi s šifro
  (`/team/<id>`) in izid "3 - 1" ali "-". **Stran kaže le kroge, ki so se že
  začeli** — prihodnjih krogov in njihovih rokov vir vnaprej ne objavi.
  **Izid 3:0/0:3 brez ure je kontumacija** (Муроване/Ямпіль : Воля, Перша,
  13. 9. 2026; članek: "Матч … не відбувся"). Prestavljena tekma ostane v svojem
  krogu z novim datumom ali kot "-" brez ure.
- **Strani tekme ni**, tekma nima šifre: šifra zapisnika je
  `ffl<liga>-<krog>-<manjša šifra kluba>-<večja šifra kluba>` — ne po
  domačinu, da zveza, ki po uvozu obrne domačina in gosta, ne da druge uvožene
  tekme z istimi nastopi (nova vrstica pade na `matches_zapisnik_id_key`;
  popravi ročno). Prestavljena tekma ostane v svojem krogu, zato se šifra ne
  spremeni; če bi jo zveza prestavila v drug krog, ostane stara neuvožena
  vrstica (preverba jo javi).
- **Postave so v novicah** (`/news/<id>`, naslov brez sluga). Članek lige na
  dan ali konec tedna ("Прем'єр-ліга Львівщини-2026/2027: матчі 11-го жовтня")
  ima povezavo na tekmovanje (`/cup/<id>` — pri Третій in Четвертій eno na
  skupino v istem članku), "ТУР N", dan ("Неділя, 11-те жовтня.") in blok na
  tekmo: glava `ФК «Олесько» – ФК «Новий Розділ» 1:3`, "Голи:", postavi
  `«Klub»: …`, "Вилучення:", "Нереалізований пенальті:". Vir bere seznam
  novic (`/news?page=N`, 20 na stran, `scripts/.predpomnilnik/ffl/novice.json`,
  sveže le prve strani do znanih, starejših od dveh tednov) in le naslove
  "<Ліга> Львівщини-…" v **imenovalniku** — "Огляди матчів … Прем'єр-ліги"
  (rodilnik) je pripoved brez postav. Blok gre v ligo zadnje povezave
  `/cup/<id>` nad njim, s tekmo se ujame po krogu in klubih; kadar je "ТУР N"
  v članku napačen (Друга, 23. 8.: "ТУР 2" za 3. krog), po dnevu ±3 in klubih,
  a le za tekme brez poročila (opozorilo).
- **Postava**: enajst "Priimek Ime" (ime je polno, včasih z očetovim imenom:
  "Боднар Віталій Михайлович"), menjava v oklepaju ("(Стегніцький Павло, 68)",
  veriga s podpičjem "(Грушевський Іван, 46; Наконечний Ігор, 71)").
  **Klopi (neuporabljenih rezerv) vir ne našteje.** Identiteta je ime + klub
  (kot fsb).
- **Goli** po straneh ("domači – gostje"; brez " – " je dala gole ekipa, ki ni
  pri nuli), strelec s priimkom in začetnicami ("Грабовський М.", "Боднар
  В.М."), minute s podpičjem ("(10; 44)"), "з пен." 11 m, "автогол" pri ekipi,
  ki ji gol šteje (strelec je v nasprotni). Strelec, ki ga ni v ekipi strani,
  je pa v nasprotni, šteje kot avtogol (opozorilo).
- **Kartoni**: rumenih vir ne objavi (nikjer, 66 člankov) — rumeni so le pri
  drugem rumenem ("друге попередження" → 1 rumeni + rdeči). Izključitve po
  straneh, vnosi ločeni s podpičjem; uradna oseba ("адміністратор",
  "керівник СФК …") ne šteje; izključitev "після завершення матчу" nastopa ne
  skrajša. Zgrešene 11 m ("Нереалізований пенальті: Цюра (29, воротар) –
  Піддубний (43, повз ворота)") so po straneh.
- **Vratar ni označen**: prvi začetnik (in rezerva, ki ga zamenja) je vratar
  kot namig (mlsz). *Uskladi pozicije* z `vir = ffl`.
- **Predpomnilnik**: stran tekmovanja in seznam novic vedno sveža; članek
  zadnjega tedna svež, do 45 dni še enkrat svež, če blok ni popoln (postava ni
  11 ali goli niso izid). `zaPredpomnilnik` ne shrani strani brez vsebine.

**Pravice.** robots.txt: `User-agent: * / Crawl-delay: 10` (nič
prepovedanega), pogojev uporabe nismo našli. **Med zahtevki je 10 s**
(`premorMs`), zato je prvi uvoz lige počasen: stran tekmovanja, ~15 strani
seznama novic in 7–20 člankov (~5–6 minut); seznam in članki so v skupnem
predpomnilniku vira, druga liga istega zagona bere le svoje članke. Beremo
odkrito (User-Agent SLFF). **Ob 401, 403, 429 ali izzivu se uvoz ustavi
takoj** (`FflZavrnitev`, izhod 4; `vir.fetch` 429 in izziv s 5xx ne ponavlja)
— ne obhajaj.
Izbrisan članek (404, 410) lige ne ustavi: opozorilo in izpade iz
`novice.json`; 5xx ustavi. Sodnikov, opazovalcev, trenerjev in stadionov ne
beremo; vzorci `scripts/vzorci/ua-ffl-*` so brez njih.

Preizkus v živo (15. 10. 2026, vsa jesen 2026/27, brez pisanja v bazo; 66
člankov, 30 strani seznama, 8 strani tekmovanj):

| liga | klubov | krogov | odigranih | s poročilom | goli = izid | postav po 11 | 990 minut | nastopov (s klopi) | ≥ 270 min |
|---|---|---|---|---|---|---|---|---|---|
| Прем'єр (`837`) | 14 | 11 | 76 | 76/76 | 76/76 (248) | 152/152 | 140/152 (14 rdečih) | 2379 (707) | 208 / 323 |
| Перша (`838`) | 13 | 10 | 59 (1 kontumacija) | 58/58 | 57/58 (202) | 116/116 | 112/116 | 1763 (487) | 186 / 325 |
| Друга (`839`) | 14 | 10 | 70 | 70/70 (6 po dnevu) | 70/70 (219) | 140/140 | 131/140 | 2063 (523) | 192 / 332 |
| Третя 1 (`840`) | 10 | 8 | 40 | 40/40 | 38/40 (139) | 79/80 | 75/80 | 1212 (333) | 129 / 284 |
| Третя 2 (`841`) | 9 | 9 | 33 | 33/33 | 31/33 (147) | 66/66 | 60/66 | 1013 (287) | 106 / 241 |
| Третя 3 (`842`) | 10 | 8 | 40 | 40/40 | 38/40 (133) | 79/80 | 71/80 | 1156 (277) | 129 / 260 |
| Четверта 1 (`844`) | 10 | 7 | 34 | 34/34 | 32/34 (146) | 65/68 | 61/68 | 1012 (267) | 111 / 271 |
| Четверта 2 (`845`) | 10 | 7 | 35 | 35/35 | 35/35 (151) | 69/70 | 64/70 | 1073 (302) | 118 / 281 |

Celoten tok vira (`prenesiSPonovitvami`, `vir.fetch`, 10 s) za Першу na
praznem predpomnilniku: 27 zahtevkov v 284 s, isti izid (58 zapisnikov, 1763
nastopov). Kjer goli niso izid, strelca ni v nobeni postavi (napaka vira: "Черкаський",
"Ліпецький" ×3, "Бобк") ali sta v ekipi dva soimenjaka ("Слобода"). Postave
z 10 so take v članku (vir jih ne dopolni); ena z 12 (Хирів, 4. ліга) je
napaka vira. Pod 990 minut je sicer vedno rdeči karton. Menjav brez minute ni.
Pri Покрові (Прем'єр) je "Сеник Олександр" začetnik in menjava (opozorilo).

| liga | klubov | tekoča 2026/27 | arhiv |
|---|---|---|---|
| ua-lv-premier | 14 | `837` | — (pomlad 2026: TODO) |
| ua-lv-persha | 13 | `838` | — |
| ua-lv-druha | 14 | `839` | — |
| ua-lv-tretia-1 / -2 / -3 | 10 / 9 / 10 | `840` / `841` / `842` | — |
| ua-lv-chetverta-1 / -2 | 10 / 10 | `844` / `845` | — |

Izpuščeno: kupi (Кубок Третьої/Четвертої ліги, Кубок Львівщини), stikovi in
plej-of tekme, Чемпіонат юніорів, ДЮФЛ, ženske, futsal, memoriali.

Uvoz (ena za drugo; lige so **neaktivne**): `gh workflow run uvoz-lige.yml -f
liga=ua-lv-premier -f cene=true` (brez arhiva).

**Vklop zdaj ni mogoč — roka kroga ni vnaprej.** Stran tekmovanja pokaže
krog šele, ko se začne (15. 10. 2026: 12. krog, 17.–18. 10., ga še ni;
"Календар ігор" v meniju vodi na naslovnico, ki ima isti drsnik). Uvoz
razporeda zato krog vpiše po prvi tekmi z rokom, ki je že mimo: krog se
zaklene ob naslednjem zaklepu s kadrom, kakršen je takrat — kdor po začetku
kroga (in pred uvozom razporeda) zamenja igralce, jih dobi v krog; pred
krogom pa ni roka ne "naslednjega kroga". Pred vklopom je potreben vir
datumov vnaprej (koledar ЛАФ, objava razporeda v novicah) ali ocena roka
prihodnjega kroga, kot jo ima `fssid` (`ocenjeniDatumi`), le da tu pari
prihodnjega kroga niso znani — uvoz razporeda bi moral sprejeti krog brez
tekem z ocenjenim rokom.

UPL rollout audit on 23 October 2026: the documented archive/current import has run, but this does not establish launch readiness. The current calendar leaves Chornomorets–Kolos (round 2) without a date, score or report link, and Obolon–Kryvbas (round 8, report `15940`) without a date; neither is explicitly marked postponed. Report `15956` currently shows 1–0 with no goal events, captured 45 minutes after its listed kickoff without an explicit live/final marker. Preserve these holds; do not infer postponements, final scores or finished player minutes. Recheck authoritative report completeness before any activation.
