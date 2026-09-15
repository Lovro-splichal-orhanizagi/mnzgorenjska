# Gostota pred pokritostjo

Stanje: 17 lig, 6.900 igralcev, 198 ekip — od tega **170 v Gorenjski**.
Ostalih 15 lig ima po 1–6 ekip, in 14 od teh sem ustvaril sam.

V Gorenjski igra po 94 od 109 ekip na krog (27 → 81 → 91 → 94). Igra torej
deluje. Ozko grlo ni več podatek, ampak **gostota nasprotnikov**: liga s
tremi ekipami ni tekmovanje.

Vse spodnje je namenjeno temu, da je liga igriva, **preden** je polna.

## 1. Državna lestvica (majhno, takoj uporabno)

Ena sama lestvica čez vse lige. Manager iz Lendave ima s čim primerjati
svoj rezultat tudi, kadar so v njegovi ligi trije.

- pogled `lestvica_drzavna`: vse ekipe, točke, liga, zveza
- stran `Lestvica` dobi zavihek »Slovenija«
- **brez** normalizacije: točkovanje je isto v vseh ligah, zato so surove
  točke poštene; razlika v številu odigranih krogov se pokaže kot stolpec

## 2. Zasebne mini lige (največ dela, največ vredno)

Deluje pri vsaki gostoti: pet prijateljev je tekmovanje, tudi če je liga
prazna. To je mehanika, ki v FPL drži dolgi rep.

- `mini_lige` (id, ime, koda, lastnik, ustvarjena)
- `mini_liga_clani` (mini_liga_id, fantasy_team_id)
- **čez lige**: pridružiš se z eno svojo ekipo, ne glede na tekmovanje —
  sicer mini liga podeduje isto praznino
- koda za pridružitev, 6 znakov, brez dvoumnih (0/O, 1/I/l)
- stran: ustvari / pridruži se / lestvica mini lige

## 3. Prispevek glasovalca (majhno)

948 glasov za pozicije in 406 za asistence — to je *razlikovalna* lastnost
produkta: te statistike za slovenske amaterske lige ne obstajajo, dokler je
skupnost ne ustvari. Naj se vidi, kdo jo je ustvaril.

- profil pokaže: koliko pozicij in asistenc si pomagal potrditi

## 4. Opomniki, ki tečejo sami (pozor: gre navzven)

`posli-opomnik` obstaja in dela (195 poslanih), a ga sproži **gumb v
administraciji** — zato je zadnji opomnik odšel 3. septembra. Uporabniki
brez ekipe so največje puščanje, v novih ligah pa so to skoraj vsi.

- edge funkcija dobi način za klic s service ključem (za urnik)
- delovni tok po ligah, s suhim tekom
- **urnik ostane IZKLOPLJEN, dokler ga ne potrdi lastnik** — samodejno
  pošiljanje pošte 353 resničnim ljudem ni odločitev razvijalca

## Česar ne delamo

**Foruma ne.** Klepet ima 6 sporočil na 158 uporabnikov. Skupnostne
funkcije potrebujejo gostoto; forum zdaj doda površino brez občinstva.
