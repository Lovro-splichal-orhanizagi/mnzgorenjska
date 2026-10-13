# Zamrznitev cene ob poškodbi

Potrjeni igralec, ki uradno javi poškodbo ali bolezen, med odsotnostjo ne
izgublja vrednosti. Če med odsotnostjo igra, se zamrznitev razveljavi in dobi
opomin, kot že velja za uradne odsotnosti.

## Zakaj

Cena igralca pade za 0.1 v vsakem krogu, ko je klub drugič zapored igral brez
njega (`preracunaj_cene`, veja »ni igral«). Poškodovan igralec v štirih tednih
izgubi okoli 0.3, pri daljši odsotnosti več. Igralci imajo zdaj potrjene
profile in svojo ceno gledajo; menedžerjem, ki ga imajo, pade vrednost ekipe za
nekaj, česar niso mogli predvideti. Zamrznitev je tudi razlog, da igralec
poškodbo sploh javi, kar koristi vsem.

Tedenski `ovrednoti-igralce --tedensko` igralcev na borzi ne premika, zato
igralca, ki je že igral, znižuje le borza.

## Pravila

**Kdaj velja.** Uradna odsotnost (`uradne_odsotnosti`) vrste `poskodba` ali
`bolezen`, ki ni `ni_drzalo`, s še potrjenim profilom. Dopust, kazen in drugo
cene ne zamrznejo (igralčeva izbira ali krivda).

**Koliko krogov.**
- Brez potrditve kluba: največ **2** kroga.
- S potrditvijo klubskega računa igralčevega kluba (`klub_potrdi_odsotnost`):
  največ **6** krogov. Potrditev lahko pride pozneje in podaljša zamrznitev.
- Šteje se krogi lige igralca v tekoči sezoni z datumom (`rounds.played_on`,
  sicer datum roka) od dneva `od` dalje.

**Do kdaj.** Do pričakovane vrnitve (`vrnitev`) oziroma zaprtja ("Spet sem
nared") in še **en krog** po tem (prva tekma po vrnitvi pogosto še brez
minut). Brez vrnitve in odprta: do omejitve krogov.

**Kaj zamrzne.** Le padec »ni igral« (−0.1). Dvig cene ostane. Velja za vse
vrstice osebe (glavna in povezane, kot pri preverbi uradnih odsotnosti).

**Zadržani padci.** Vsak padec, ki ga zamrznitev prepreči, se zapiše v
`zadrzani_padci` (igralec, krog, odsotnost, znesek).

**Ni držalo.** Ko `preveri_uradne_odsotnosti` označi odsotnost `ni_drzalo`
(igral med odsotnostjo), se vsi zadržani padci te odsotnosti uveljavijo naenkrat
(cena pade za njihovo vsoto, ne pod spodnjo mejo borze) in označijo kot
uveljavljeni. Opomin in pravilo "dva opomina = do konca sezone brez uradnih
odsotnosti" ostaneta, kot sta. Kazen je le izguba tistega, kar ni bilo
zasluženo: cene ne znižamo pod tisto, ki bi jo imel brez zamrznitve, ker bi s
tem kaznovali menedžerje, ki igralca imajo.

**Tedenski zagon** ostane nespremenjen: igralcev na borzi ne premika, igralec
brez borzne zgodovine pa nima kaj izgubiti zaradi odsotnosti.

## Vmesnik

- **Obrazec uradne odsotnosti:** pri poškodbi in bolezni pojasnilo "Cena ti je
  zamrznjena do 2 krogov, s potrditvijo kluba do 6. Če med odsotnostjo
  zaigraš, se zamrznitev razveljavi in dobiš opomin."
- **Stran igralca in forum Odsotnosti:** oznaka "Cena zamrznjena" (in "potrdil
  klub"), dokler zamrznitev velja.
- **Stran kluba, razdelek Urejanje kluba:** seznam odprtih uradnih odsotnosti
  (poškodba, bolezen) igralcev kluba z gumbom "Potrdi". 13 jezikov.

## Varnost

- Potrdi le klubski račun igralčevega kluba (`je_klubski_racun`), le odprto
  odsotnost vrste poškodba/bolezen, ne svoje.
- Zamrznitev in zadržane padce piše le baza (`preracunaj_cene`, preverba);
  vmesnik bere le javno stanje (pogled).

## Preizkusi

`supabase/tests/varnost.sql`: brez potrditve zamrzne 2 kroga, tretji pade; s
potrditvijo do 6; krog po vrnitvi še zamrznjen, naslednji ne; dopust ne
zamrzne; ni_drzalo uveljavi vsoto zadržanih padcev; tuj klub ne potrdi; igralec
ne potrdi sam.
