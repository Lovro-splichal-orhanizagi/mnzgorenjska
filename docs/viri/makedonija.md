# Severna Makedonija — vir `ffm`

Država `MK` ("Северна Македонија", migracija 20261012053100) ima vmesnik v
makedonščini (`src/i18n/mk/`, jezik `mk`, `mk-MK`, **cirilica**,
`JEZIK_DRZAVE.MK`), izbirnik jezika "Македонски", vstop `slff.eu/mk`, kartico
ob deljenju `mk.html` (Caddy jo vrne za `/mk` in `?t=mk-…`, tudi rezerva
`:3201`), makedonsko vejo pošte (`sporocila.ts`, avtentikacijske predloge in
zadeve v `docker-compose.slff.yml`, pozdrav "Здраво") in makedonska imena
lastnikov hišnih ekip (migracija 20261013183100, tudi `klub_stik.drzava`
sprejme MK). **Šifra makedonske lige se začne z `mk-`.** Ugib: brskalnik `mk`
ali pas `Europe/Skopje`. Izrazi kot v makedonskih športnih medijih: тим,
состав, прв состав, клупа, капитен, вице-капитен, трансфери, голман,
одбранбен, среден ред, напаѓач, табела, асистенција, картон, поени, мини лига;
`krog` je vedno **коло** ("5. коло"), pripomoček `klop_plus` je "Клупа+",
poznavalec je "познавач". Množine one/other (`Intl.PluralRules('mk')`): `one`
1, 21, 31 … razen 11, sicer `other` s števno obliko ("1 поен, 2 поени, 11
поени, 21 поен"; "2 тима", "3 гласа"). Makedonščina nima sklonov, a člen je
pripona (лигата), zato ime lige stoji samostojno za dvopičjem ali predlogom
("лига: {liga}", "за {liga}"); `ligaVTozilniku` ga pusti. Psevdonim v
klepetu ima pridevnik pred samostalnikom ("Син Голман 42"). Stran Pozicije je
v meniju kot v Sloveniji. `MK` je v matriki nočnega uvoza in v *Hisne ekipe*.
Manjka še: makedonski kanal v HelpStacku (`Podpora.tsx` za `mk` uporabi
slovenskega) in **pregled prevoda pri naravnem govorcu**. Lige ostanejo
neaktivne, dokler jih lastnik ne vklopi.

Vir `ffm` (`scripts/viri/ffm.mjs`) bere **www.ffm.mk** (Фудбалска федерација
на Македонија). Ista WordPressova predloga kot fss.rs (vtičnik
`igal-comet-v2`), s predpono `ffm-` namesto `fss-`; podatki so iz COMET.
robots.txt zapre le /wp-admin/, brez izziva in prijave. Beremo odkrito
(`User-Agent: SLFF fantasy (https://slff.eu)`, **2 s** med zahtevki, popolnih
zapisnikov ne beremo znova). **Če se pojavi izziv ali CAPTCHA, ustavi — ne
obhajaj.** Dovoljenja FFM še nimamo.

- **Šifra lige je slug strani** `/natprevaruvanje/<slug>/`; vsaka sezona ima
  svojega in slugi niso pravilni (`prva-mfl27`, `vtora-mfl-25-26-2`), zato se
  vpišejo ročno. Seznam: meni strani (tekoče) in `/arhiva-na-natprevari/`
  (2022/23–2024/25); 2025/26 je le v stranskem meniju strani lige.
  Neznan slug vrne **404**. Ni ga v `sitemap.xml` (tam so le nekatere
  strani 2026/27) ne v REST API-ju — tekmovanja izriše vtičnik.
- **Pisava**: latinice za strani lig ni (`?script=lat` stran prezre, `/en/`
  prevaja le okvir). **Imena klubov so v cirilici, kot jih piše zveza** (s
  strani lige — "ФК Студеничан", "ФК КУЛ-ЗДРАВЈЕ"), **imena igralcev v
  latinici**, kot jih da zapisnik COMET ("Kjehovikj Alan"). Ključ kluba je
  male črke (zveza isti klub piše enkrat z velikimi, drugič z malimi); COMET
  istoimenske klube loči s krajem ("ФК РЕЧИЦА" ≠ "ФК РЕЧИЦА с.Речица",
  "ФК ПОБЕДА Валандово" ≠ "ГФК ПОБЕДА Прилеп"), zato `IME_V_…` ni treba.
  Med sezonami 2023/24–2026/27 je zapis vsakega kluba isti.
- **Stran lige**: harmonika krogov `ffm-rezultati__title` "N. коло"; prva
  (`accordion_current`) ponovi tekoči krog, beremo le `id="accordion"` do
  lestvice `id="ffm-tabela"`. Tekma: datum in ura, kraj, imeni, povezava
  `/izvestaj/<id>` (odigrana) ali `/najava/<id>` (napoved) in štiri številke
  izida (domači, gostje, polčas domači, polčas gostje; "/" = ni). **Ura 00:00
  pomeni, da tekma še ni razpisana** — vir da `ura: null` (rok kroga pride iz
  ure drugih tekem dne ali privzetega). Regijske lige objavijo razpored le
  nekaj krogov naprej (Region 2: 5 krogov), ostali pridejo z naslednjimi
  uvozi razporeda.
- **Kontumacija**: izid brez polčasa. Zveza registriran izid vnese kot
  zapisnik s postavama, a brez dogodkov in polčasa (Likova : Vlaznimi 0:3,
  Region 2, 13. 9. 2026; stran ima PHP opozorilo `Undefined array key
  "half"`). Razpored jo označi z izidom (`jeKontumacija`), zapisnik je null.
- **Zapisnik** `/izvestaj/<id>/`: glava `ffm-match-header` (izid), pod njo
  `ffm-match-meta` ("Полувреме: 1 - 2", "1. коло", datum); štirje bloki
  `ffm-rez__oneteam` (začetniki domačih, gostov, klop domačih, gostov),
  dogodki pred imenom in dresom kot pri fss: goal, penalty, own_goal (v ekipi
  strelca), penalty_failed_miss, yellow, second_yellow in red, substitution
  (vstop), substitution_out (izstop) — **minute so točne**. Šifer igralcev ni:
  identiteta je ime + klub, soimenjak pri drugem klubu po `prestop.mjs`.
- **Šifra zapisnika v bazi je `mk<id>`** (`sifraZapisnika`), ker so šifre
  COMET (~10–12 milijonov) v številskem prostoru rastočih virov (oefb, mlsz);
  naslov predpono odreže, `--zapisnik` vzame `mk…`.
- **Vratar ni označen.** COMET ga v postavi našteje prvega (ostali po dresu),
  zato ima prvi začetnik `vratar` (GK, `is_goalkeeper`) **kot namig** — kot
  fssid in mlsz. Dres prvega začetnika: 1 ali 12 pri večini, sicer tipične
  vratarske številke (99, 30, 25, 95). Rezerva, ki ga zamenja, namiga nima;
  ostali čakajo na glasovanje. *Uskladi pozicije* z `vir = ffm`.
- **Napake vira**: gol, vpisan dvema igralcema v isti minuti (Brera Strumica
  : Shkupi 7:0, dogodkov 11) — opozorilo `goli iz dogodkov …`, izid ostane
  izid zapisnika (kot fssid).

**Pokritost** (pregled 11. 10. 2026): lige odraslih moških na ffm.mk so v
2026/27 le Prva MFL, Vtora MFL in Region 1–6. Treta liga (Sever, Jug,
Jugozapad, Zapad, Istok) je zadnjič objavljena za 2024/25, za 2025/26 je ni
(slugi `treta-liga-*-25-26` vrnejo 404). Občinske lige (Kičevo, Kumanovo,
Ohrid, Skopje) so le 2024/25; `opshtinska-fudbalska-liga-<kraj>-25-26` in
`-26-27` vrnejo 404. Ostalo je mladinsko (kadetska U17, pionerska U15 — ne
vpisujemo), žensko, futsal in pokal.

**Mladinske lige (U19)**: Mladinska Super liga in Vtora mladinska liga.
**Igralci so mladoletni**; ime skrijemo na ugovor igralca ali zveze kot
povsod (`anonimiziraj_igralca`, Administracija → Igralec, obvestilo na
`/legal`). Kot pri slovenskih mladincih `prvi_fantasy_krog = 2` in
`rok_pomak_ur = 2` (tekme ob 10:00). Klubi so isti kot pri članih (vrstica
`teams` je skupna), igralci ločeni po ligi.

Vpisanih je 10 lig (migracija 20261012053100), **neaktivnih**, zveza `ffm`.
Arhiv 2025/26 obstaja le za Prvo in Vtoro MFL ter Mladinsko Super ligo;
regijske lige dobijo Treto ligo 2024/25 (2023/24 Istok) po skupnih klubih
(1. krog obeh sezon), Region 1 in 2 še občinsko ligo 2024/25. Vsak arhiv ima
ena sama liga (`matches.zapisnik_id` je enoličen).

| liga | tekoča 2026/27 | klubov | arhiv (skupnih klubov) |
|---|---|---|---|
| mk-prva-mfl | `prva-mfl27` | 10 | `prva-mfl-25-26` (7) |
| mk-vtora-mfl | `vtora-mfl-26-27` | 14 | `vtora-mfl-25-26-2` (7) |
| mk-region-1 | `region-1-sezona-26-27` | 12 | `treta-liga-sever-24-25` (6), `opshtinska-fudbalska-liga-skop-e-24-25` (2) |
| mk-region-2 | `region-2-sezona-26-27` | 10 | `opshtinska-fudbalska-liga-kumanovo-24-25` (4), `treta-liga-sever-23-24` (2) |
| mk-region-3 | `region-3-sezona-26-27` | 12 | `treta-liga-istok-23-24` (6) |
| mk-region-4 | `region-4-sezona-26-27` | 14 | `treta-liga-ug-24-25` (9) |
| mk-region-5 | `region-5-sezona-26-27` | 13 | `treta-liga-ugozapad-24-25` (5) |
| mk-region-6 | `region-6-sezona-26-27` | 13 | `treta-liga-zapad-24-25` (6) |
| mk-u19-super | `mladinska-super-liga-26-27` | 10 | `mladinska-super-liga-25-26` (10) |
| mk-u19-vtora | `vtora-mladinska-liga-26-27` | 14 | — (lastnega arhiva ni) |

Preštetje (11. 10. 2026, vsi zapisniki; tekem z zapisnikom / razčlenjenih,
goli dogodkov / izidi, postav po 11):

| stran | tekem | goli / izidi | postav 11 | opomba |
|---|---|---|---|---|
| prva-mfl27 (tekoča) | 42/42 | 121/121 | 84/84 | |
| vtora-mfl-26-27 (tekoča) | 47/47 | 112/108 | 94/94 | 1 podvojen gol |
| region-1 … 6 (tekoče) | 26, 20, 23, 32, 24, 25 | 121/121, 59/62, 95/88, 146/146, 114/111, 114/114 | vse | R2: 1 kontumacija; R3, R5: podvojeni goli |
| prva-mfl-25-26 | 197/197 | 609/603 | 394/394 | |
| vtora-mfl-25-26-2 | 240/240 | 829/780 | 479/480 | 22 podvojenih golov, 3× izid 0:0 z goli |
| treta-liga-sever-24-25 | 178/178 | 757/753 | 353/356 | |
| treta-liga-sever-23-24 | 177/178 | 767/767 | 350/354 | |
| treta-liga-istok-23-24 | 71/71 | 265/265 | 142/142 | |
| treta-liga-ug-24-25 | 138/139 | 536/536 | 269/276 | |
| opshtinska-…-skop-e-24-25 | 44/44 | 192/192 | 86/88 | |
| opshtinska-…-kumanovo-24-25 | 75/75 | 355/355 | 147/150 | |
| treta-liga-ugozapad-24-25 | 119/119 | 452/446 | 237/238 | 2 s podvojenimi goli |
| treta-liga-zapad-24-25 | 148/148 | 664/656 | 290/296 | 5 s podvojenimi goli |
| mladinska-super-liga-25-26 | **ni preštet** — preštej pred uvozom |

Prvi začetnik ima dres 1 ali 12 v 70–90 % postav, sicer vratarske številke
(25, 30, 99, 95, 90).

Uvoz (ena za drugo, ~2 s na zapisnik — arhiv 240 zapisnikov je ~10 minut):
`gh workflow run uvoz-lige.yml -f liga=mk-prva-mfl -f arhiv=prva-mfl-25-26 -f
cene=true`.
