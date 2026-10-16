# Armenija — vir `ffa`

Vir `ffa` (`scripts/viri/ffa.mjs`) bere **ffa.am** (Football Federation of
Armenia, Laravel + Livewire, spredaj Cloudflare brez izziva), kjer FFA objavi
tekmovanja, ki jih vodi sama: **Prvo ligo** (Առաջին խումբ, raven 2) in
amaterski ligi A in B, in **premierleague.ffa.am** (**Premier Liga**,
Հայաստանի Պրեմիեր լիգա, raven 1; glej *Premier Liga* spodaj). Država `AM`
("Հայաստան", vpiše jo migracija lig); vmesnika v armenščini, kartice in pošte
**še ni** in `AM` **ni** v `JEZIK_DRZAVE` ne v matriki nočnega uvoza — oboje
pred vklopom. Šifra lige se začne z `am-`.

- **Šifra lige je `<pot>/<skupina>`**: pot strani pod `/en/` (`first-league`)
  in id skupine iz gradnika Livewire `cascade-tour-matches`
  (`wire:initial-data`, `dataMeta.groups`; 902 = Prva liga 2026/27). Stran
  vedno pokaže **tekočo** skupino; pretekle sezone (802 = 2025/26, …) in
  druge skupine (amaterske A1/A2) bi zahtevale zahtevek Livewire (POST), ki
  ga ne pošiljamo — **arhiva zato ni**, cene so iz tekoče sezone. Če stran
  pokaže drugo skupino (nova sezona), se uvoz ustavi: popravi
  `source_league_code`. Sezona je leto skupine v gradniku ("2026-2027" →
  "2026/27"; skupine in leta so našteti vzporedno, najnovejše prvo).
- **Razpored** je ena stran: `<tbody tour="N">` (krogi pomešani), vrstica
  domači, izid ("2:1", tehnični izid "3:0(3:0)", neodigrana " : "), gostje,
  termin "04/08 17:00" **brez leta** (julij–december prvo leto sezone,
  januar–junij drugo) ali "Postponed", kraj, stadion in povezava
  `/en/match-info/f<id>`. **Erevanski čas (UTC+4, brez poletnega) →
  ljubljanski** (−2 h poleti, −3 h pozimi). Tehnični izid je kontumacija.
- **Izstop kluba**: klub, ki je izstopil (Hayq 2026/27), ostane na strani z
  vrsticami brez termina, izida in povezave tudi v odigranih krogih.
  `izstopljeniKlubi` ga prepozna (vsaj dve taki vrstici, od prve nobene prave
  tekme) in `razporedIzTekem` njegove neodigrane tekme izpusti (25); tehnični
  izidi pred izstopom ostanejo kot kontumacije.
- **Zapisnik** `/en/match-info/f<id>` (šifra v bazi `am<id>`): glava ("…
  (2026-2027): 1" = sezona in krog, "04.08.2026 17:00", imeni, izid,
  "Technical defeat" pri kontumaciji → zapisnik null), "Players" (začetniki)
  in "Substitutes" (klop), levo domači, desno gostje. Dogodki so ikone z
  minuto: `down.png` izstop, `up.png` vstop, `ball.png` gol, `yc.png`
  rumeni, `rc.png` rdeči — **levo ikona pred minuto, desno minuta pred
  ikono**, zato razčlenjujemo HTML. Rumeni in rdeči ob isti minuti (ali dva
  rumena) je drugi rumeni → 1 rumeni + 1 rdeči. Polčasa stran ne pove.
  Trenerjev ("Coaches"), sodnikov in delegata ne beremo; vzorci `am-ffa-*`
  so brez njih.
- **Goli iz glave**: pod imenom kluba, ki mu gol šteje, so strelci z
  minutami, "(11m)" = 11 m, "(OG)" = **avtogol igralca nasprotne ekipe** (pri
  nas je pri strelcu v njegovi ekipi). Igralca najde ikona žoge iste minute
  (glava ime včasih obrne: "Abayomi David"), sicer ime. Ikone v postavi same
  avtogola ne ločijo — s samimi ikonami bi se 4 od 59 tekem ne ujemale z
  izidom.
- **Napake vira**: menjava, vpisana obrnjeno (rezerva "vstopi" po izstopu:
  "67 noter, 20 ven", f98471, f98509, f98518), se zamenja z opozorilom. Kadar
  vstop rezerve manjka (Olympia, f98492: dva izstopa v 82., brez vstopa), ima
  ekipa manj kot 990 minut.
- **Identiteta: ime + klub** (kot fss, gff), šifer igralcev ni. Ime je
  latinica ("Hayk Hovakimyan" → "Hovakimyan Hayk"), nekaj imen tujcev je
  delno v armenski pisavi, kot jih piše zveza.
- **Vratar ni označen**: prvi začetnik je vratar le kot namig (kot ffm,
  gff); v 118 postavah ima dres 1, 12, 13 ali 25 v 59, sicer 31, 33, 71, 88 …
  *Uskladi pozicije* z `vir = ffa`.
- Druge ekipe ("Ararat-2", "BKMA-2", "Urartu-2") so svoj klub; ključ ohrani
  števke. Oblika "FC"/"SC" v ključu odpade (`kljucKlubaAm`): Premier Liga piše
  "FC Urartu", "SC Shirak", "Sardarapat FC", ffa.am "Urartu" — ob prestopu
  lige je to isti klub.

**Amaterske lige niso vpisane**: Amateur League A 2026/27 ima skupini A1 in
A2 po **4 klube** (6 krogov), League B je le 2025/26 (skupini in play-off po
4–5 klubov). Pri 15 igralcih in največ treh iz kluba je pet klubov spodnja
meja — kadra ni mogoče sestaviti. Zapisnik je ista predloga (vzorec
`am-ffa-tekma-95922-amaterska.html` se razčleni, 11 + 11, goli = izid).

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt:
`User-agent: *` z `Disallow:` (prazno — nič prepovedano), brez Crawl-delay.
Noga zahteva aktivno povezavo na ffa.am ob uporabi gradiva (`vir_ime` FFA,
`vir_url` → stran lige v nogi). Po besedah lastnika imamo dovoljenje za
branje (15. 10. 2026). Beremo odkrito (`User-Agent: SLFF fantasy (https://slff.eu)`, **4 s**
med zahtevki, zapisnikov, starejših od tedna, ne beremo znova — razen
nepopolnih do 45 dni, `zapisnikSvez`). **Ob 401, 403, 429 ali izzivu se uvoz
ustavi — ne obhajaj** (`FfaZavrnitev` že v `vir.fetch`, izhod 4). Navadne
strani nosijo Cloudflarov skript `/cdn-cgi/challenge-platform/…/jsd/` — to
ni izziv. V predpomnilnik gre le prava stran (`vir.zaPredpomnilnik`: stran
lige z gradnikom, stran tekme z glavo). Če nas FFA prosi, naj nehamo, `am-`
lige izklopimo.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo; stran lige in 79 strani
tekem po 4 s): 30 krogov, 222 vrstic, 15 klubov (14 + Hayq, izstopil), v
razporedu 197 tekem (25 neodigranih Hayqa izpuščenih), 63 odigranih, od tega 4
tehnični izidi (kontumacije) in 59 zapisnikov: goli = izid 59/59 (211),
postav po 11 118/118, 547 menjav z minuto (547 nastopov s klopi), 990 minut
102/118 (15 rdečih kartonov, 1 manjkajoč vstop), 4 opozorila (obrnjene
menjave). Igralcev z vsaj 270 minutami 199 od 368 (54 %).

| liga | klubov | tekoča 2026/27 | arhiv |
|---|---|---|---|
| am-premier-liga | 12 | `premierleague/96103-96300` | `premierleague/38786-38920` (2025/26, 10 klubov) |
| am-1-liga | 14 (+ Hayq, izstopil) | `first-league/902` | — (le prek Livewire) |

Uvoz (ena za drugo): `gh workflow run uvoz-lige.yml -f liga=am-premier-liga
-f arhiv=premierleague/38786-38920 -f cene=true`, nato `gh workflow run
uvoz-lige.yml -f liga=am-1-liga -f cene=true` (brez arhiva). Prvi uvoz
Premier Lige prebere 135 + 198 strani po 4 s (~25 minut), Prva liga 59
zapisnikov (~5 minut).

### Premier Liga (premierleague.ffa.am)

Isti vir `ffa`, druga oblika šifre. Spletišče je ista Laravel + Livewire
predloga kot ffa.am; robots.txt `User-agent: *` z `Disallow:` (nič
prepovedano). Šifre tekem so v istem prostoru kot na ffa.am (f96151 je na
obeh ista tekma), zato `am<id>` ostane enolična.

- **Razpored cele sezone stran ne pokaže**: `/en/games` ima le tekoči krog
  (gradnik `games-index`, podatek `tour`), drugi krogi so le prek zahtevka
  Livewire (POST), ki ga ne pošiljamo; `?tour=N` stran prezre, stran kluba
  kaže le zadnje in naslednje tekme. **Strani tekem pa so strnjen blok šifer,
  urejen po krogih** (kot fssid, fcf), zunaj bloka 404. Šifra lige je zato
  `premierleague/<od>-<do>`: 2026/27 `96103-96300` (12 klubov, 33 krogov po 6),
  2025/26 `38786-38920` (10 klubov, 27 krogov po 5; meje preverjene z 404 na
  obeh straneh). **Nova sezona**: poišči prvo in zadnjo tekmo (stran `/en/games`
  ali stran kluba da šifre tekočega kroga; blok je klubov/2 × krogov) in popravi
  `source_league_code`. Stran kroga s tekmami zunaj bloka: vse zunaj
  nedokončanega bloka ustavi uvoz (nova sezona ali nov blok), nekaj zunaj
  (tekma, dodana za zgornjo mejo) je opozorilo — blok razširi.
- **Stran tekme** `/en/games/f<id>` (beremo `/en/`; `/hy/` ima imena v
  armenski pisavi): naslov "2025-2026 Fastex Premier League : Matchday 1"
  (tekoča sezona le ": Matchday 9"), termin "11.10.2026 20:00" (erevanski čas
  → ljubljanski), imena "FC Urartu", "SC Shirak", "Sardarapat FC". Neodigrana
  tekma ima krog in termin, **nerazpisana** "To schedule" brez kroga in termina
  — krog se izpelje iz mesta v bloku (`sestaviBlokPl`: klubov/2 tekem na krog,
  odmik iz strani s krogom). Postave in dogodki so ista predloga kot ffa.am,
  razlike: ikone v `/img/icons/` (tudi desno ikona pred minuto), dva
  `players__box` brez `mr-2`/`ml-2`, `<div` in `class=` v dveh vrsticah,
  stadion pod izidom (pred desnim stolpcem strelcev). "(OG)" in "(11m)" sta
  v glavi kot na ffa.am, "Technical defeat" je kontumacija.
- **Branje bloka** (`preberiBlokPl`, predpomnilnik `scripts/.predpomnilnik/ffa/tekma-pl-<id>.html`):
  odigrana s postavama se ne bere znova (zapisnik zadnjega tedna sveže,
  nepopoln do 45 dni — `zapisnikSvez`), izid brez postav dnevno do 45 dni,
  neodigrana na vrsti (od dneva pred terminom do 14 dni po njem) vsako uro,
  sicer tedensko, "To schedule" tedensko (pred tekočim krogom — prestavljena
  brez termina — dnevno). Stran kroga (uvoz razporeda jo
  prenese kot `naslovRazporeda`) pove izid in termin tekočega kroga — tekmo,
  ki jo kaže drugače kot predpomnilnik, preberemo takoj. Prvi uvoz bloka
  prebere vse strani. Krog brez termina (vse "To schedule") v razpored ne
  gre, pride z naslednjim uvozom, ko ga razpišejo. Izid brez postav, starejši
  od tedna, je kontumacija; neodigrane tekme kluba, ki je izstopil
  (`izstopljeniVBloku`), izpustimo.
- Zavrnitev kot pri ffa.am: 401, 403, 429 in izziv vržejo `FfaZavrnitev` na
  vsaki poti (stran kroga, stran tekme), izhod 4; vzdrževalna stran ne gre v
  predpomnilnik in ustavi uvoz ("ni stran tekme").
- **Vratar** ni označen, prvi začetnik je namig: v 54 tekmah 2026/27 ima vsak
  klub 1–3 različne prve začetnike (znani vratarji: Beglaryan, Buchnev,
  Ayvazov …), nobeden ni dal gola, zamenjan dvakrat.
- **Trki imen** s Prvo ligo: jih ni — druge ekipe ("Urartu-2", "Sardarapat
  FC-2") imajo števko, ostali klubi Prve lige so drugi (Olympia, MIKA, Avshar
  Ararat …). Vseh 10 klubov 2025/26 igra tudi 2026/27.

Preizkus v živo (15. 10. 2026, brez pisanja v bazo; 198 + 135 strani tekem po
3,5–4,5 s, nato pot `vir.fetch` + `prenesiSPonovitvami` s predpomnilnikom — 7
zahtevkov):

| | 2026/27 (`96103-96300`) | 2025/26 (`38786-38920`) |
|---|---|---|
| strani / klubov / krogov | 198 / 12 / 33 (12 razpisanih, 21 "To schedule") | 135 / 10 / 27 |
| odigranih | 54 (krogi 1–9) | 135 (1 tehnični poraz, BKMA : Urartu 0:3) |
| goli = izid | 54/54 (161; 7 avtogolov, 13 z 11 m) | 134/134 (347; 12 avtogolov, 54 z 11 m) |
| postav po 11 | 108/108 | 268/268 |
| menjave z minuto | 511 (511 nastopov s klopi) | 1232 |
| 990 minut na ekipo | 101/108 (7 z rdečim kartonom) | 248/268 (19 z rdečim, 1 vstop brez izstopa v viru: f38847, 1006 min) |
| krog strani ≠ mesto v bloku | 0 (od 72 s krogom) | 0 |
