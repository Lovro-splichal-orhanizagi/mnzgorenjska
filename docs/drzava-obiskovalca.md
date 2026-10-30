# Država obiskovalca

Domena je ena, **lige druge države so skrite**: `useTekmovanje().tekmovanja`
vrne le lige države, ki jo obiskovalec gleda (izbirnik, okno prvega obiska,
državna lestvica); vse lige so v `vsaTekmovanja` (vstop `/sk`, admin). Nova
stran, ki našteva lige ali ekipe več lig, mora filtrirati po državi.
Država sledi ligi. Vrstni red (`zacetnaLiga` v `src/lib/drzava.ts`):

1. **Kdor ligo ima** (`?t=` ali shranjena `slff-tekmovanje`), ostane pri njej —
   ugib ga ne premakne, tudi če ima slovaški brskalnik ali IP.
2. **Prijavljen brez shranjene lige** (nova naprava) dobi ligo svojih ekip
   (`ligaEkip`: država z največ človeškimi ekipami, ob izenačenju prva ekipa).
3. **Nov obiskovalec** dobi privzeto ligo ugibane države (`ugibajDrzavo`):
   izbira s povezave `/sk` ali izbirnika (`slff-drzava`) → **IP** →
   jezik brskalnika → časovni pas → nič (Slovenija, `PRIVZETO`).

IP pove edge funkcija `api/drzava.ts` (glava `x-vercel-ip-country`, odgovor
`{ drzava }`, `no-store`, nič ne beleži). Kliče jo le, kdor lige in države še
nima, in po 800 ms odneha; `vite dev` funkcije nima (vrne index.html), zato
lokalno ugib teče brez IP. SPA preusmeritev v `vercel.json` izpusti `/api/`.
Država brez aktivne lige ostane pri `PRIVZETO`. Jezik se popravi šele, ko je
začetna liga odločena (`ustaljena`), sicer bi se stran med čakanjem na ugib
naložila dvakrat.

**Tujec** je nov obiskovalec (brez lige, brez `?t=`, `/sk`, `/si`, prijavljen
brez ekip), čigar IP je iz države **brez aktivnih lig** (CZ, AT, DE, HR, GB …;
`jeTujIp`). Ne pristane tiho v Sloveniji: kontekst lige zapiše `slff-tujec`
(koda IP) in da `vprasajDrzavo`, okno prvega obiska pa najprej vpraša po
državi ("🇸🇮 Slovenija · 🇸🇰 Slovensko", iz `vsaTekmovanja`), nato po ligi te
države. Do izbire je za oknom ugibana država (za večino Slovenija). Vmesnik je
v **angleščini**, razen če je prvi jezik brskalnika eden od naših
(`jezikTujca`). **Odločitev o tujcu pade le na goli naslovnici** — pot `/`
brez `?t=` in brez shranjene lige ob nalaganju strani (`naGoliNaslovnici` v
`drzavaUgib.ts`): le tam se zapiše `slff-tujec` in le tam okno vpraša po
državi. Robot (`jeRobot` po `navigator.userAgent`: Googlebot, bingbot,
facebookexternalhit …) ni nikoli tujec (`zaznajTujca`). Kdor pride naravnost na drugo stran (`/player/*`, `/club/*`,
`/match/*`, `/table`, `/players`, `/results`, `/standings` …) brez oznake,
vidi jezik države lige (privzeta liga = slovenščina) — tako ima vsak naslov
en jezik tudi za iskalnik z ameriškega IP-ja (Googlebot strani ne hrani
shrambe). Že zapisana oznaka velja povsod: angleščina ostane tudi po izbiri
lige ali države. Neuspel IP (napaka, 800 ms, `vite dev`) ni tujec —
velja stari ugib brez vprašanja. SI in SK IP gresta naravnost v svojo državo.
Lokalno tujca preizkusiš z `localStorage.setItem('slff-tujec', 'CZ')` v
brskalniku brez shranjene lige.

**Izbira države** (`src/components/IzbiraDrzave.tsx`, "🇸🇮 Slovenija · 🇸🇰
Slovensko") je v nogi in na vrhu izbirnika lige; pokaže le države z aktivnimi
ligami. `preklopiDrzavo` zapiše državo, privzeto ligo in jezik v brskalnik in
naloži naslovnico nove države — ekip in strežnika se ne dotakne. Okno prvega
obiska ima isto povezavo ("Slovenija?"), ki pa ligo pusti neizbrano, da okno
vpraša znova z ligami nove države.

**Vstopne povezave** `slff.eu/si`, `/sk`, `/at` … (`VstopDrzave.tsx`) so
prave strani: ime države in vse aktivne lige po zvezah (domača stran in
lestvica), v jeziku države (`drzavaVstopa` v `izberi()`), kanonični `/at`,
brez okna prvega obiska. Ligo izbere
klik (`/?t=…`, shrani se kot vsaka izbira); kontekst lige na njih `?t=` ne
piše. **Kampanja** (`?src=…` ali
`utm_*`) gre po starem naravnost v privzeto ligo države (`location.replace`).
Država brez aktivne lige preusmeri na `/` (strežnik HTML: 404 z `noindex`).
Isto vsebino za iskalnike izriše strežnik HTML (`drzava` v `streznik.mjs`).
**Kampanjska povezava mora nositi `src` ali `utm_*`**, sicer kaže vstopno
stran, ne lige; države si vstopna stran ne zapomni, le kampanja.

**Ugib po jeziku brskalnika**: cela oznaka ima prednost pred osnovo (`ro-MD`
→ Moldavija, `sr-ME` → Črna gora, `bs-BA` in `hr-BA` → Bosna in
Hercegovina, sicer `ro` → Romunija, `sr` → Srbija, gola `bs` → Hrvaška).
Angleščina ni država (tudi `en-GB` ne): Združeno kraljestvo ugane le IP ali
pas `Europe/London`, Malto še `mt`/`en-MT`, Gibraltar `en-GI` ali pas
`Europe/Gibraltar`. Japonska je `ja` ali `Asia/Tokyo`, Hongkong `zh-HK`
(`zh-Hant-HK`, `yue`, `en-HK`) ali `Asia/Hong_Kong` — gola `zh` ne kaže nanj —,
Tajska `th` ali `Asia/Bangkok`, San Marino `it-SM` ali `Europe/San_Marino`
(gola `it` ne kaže nanj). Ruski brskalnik ne kaže na
Ukrajino. Države z lastnim vmesnikom in pošto: SI, SK, HR, CZ, HU, AT in DE (de),
RS (sr), RO, EE (et), PL, ES, LV, MK, GR (el), TR, UA (uk), AM (hy), AZ, DK
(da); z jezikom sosede: GB in MT (en), ME (sr), BA (hr), MD (ro); z
angleškim vmesnikom brez lastnega slovarja (28. 10. 2026): JP, HK, TH, GI
in SM (30. 10. 2026)
(pošta angleška, rok v pasu države). Vse imajo
vstop `/<koda države>`, kartico `<koda>.html` in vrstico v matriki nočnega
uvoza (`docs/nocni-uvoz.md`); lige novih držav ostanejo neaktivne, dokler jih
lastnik ne vklopi.

**Slovaška je odprta** za vse (ugib po IP in jeziku). **Državo zapreš** tako,
da jo dodaš v `SAMO_S_POVEZAVO` v `src/lib/drzavaUgib.ts` (npr. `['SK']`):
lige ostanejo vklopljene, a IP, jezik in pas je ne odprejo — vanjo pride le,
kdor ima povezavo `/sk` ali `?t=sk-…` (ali jo izbere v izbirniku).
