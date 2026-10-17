# Enkratni javni dokazi FCF

Ročni delovni tok `fcf-javni-dokazi.yml` na `main` je ločen, izrecno odobren
proračun sedmih javnih GET, po vrsti: 4109388, 4109643, 4109649, 4116202,
4116215, 4118352, 4118358. Vsak kliče samo
`https://www.fcf.cat/ca/competicio/acta/ID`, enkrat, brez preusmeritev ali ponovitev.
Pred prvim in vsakim naslednjim zahtevkom je najmanj 3 s premora obstoječega
skupnega prenosa. Časovna omejitev 90 s velja tudi med branjem telesa, največ
2 MiB HTTP-dekodiranih bajtov na telo. Podedovana nastavitev premora pod 1 ali
neveljavna nastavitev (tudi prekoračitev največjega varnega časovnika Node)
zavrne zagon pred zahtevki.

Pričakovana sezona je 2026/27: Segona G1 za 4109388, Segona G2 za
4109643/4109649, Tercera G2 za 4116202/4116215, Tercera G9 za
4118352/4118358. Prvi ne-200, preusmeritev, 403/429, izziv, manjkajoč ali napačen
zapisnik/glava/skupina/sezona, prazno telo, presežena velikost ali omrežna napaka
ustavi celoten zajem. Ujemanja rezultata s strelci/postavami ne zahtevamo;
neskladja so predmet pregleda izvirnika.

Sveža mapa `fcf-javni-dokazi` vsebuje samo sedem fiksnih imen `acta-ID.html`
in omejen `manifest.json`. Datoteke in SHA256 ohranijo izvirne bajte telesa po
HTTP-dekompresiji, brez pretvorbe besedila nazaj v bajte; to niso stisnjeni bajti
na žici. Ločena besedilna kopija služi preverjanju strani. Identiteta pomeni
potrdilo fiksnega HTTP zahtevka brez preusmeritve, ne neodvisno dokazano šifro
tekme iz vsebine. Manifest loči opaženi status HTTP od veljavnosti zajema,
zapiše commit, zagon/poskus, čase, dovoljene varne glave, velikosti in SHA256.
Ne vsebuje piškotkov, Location, poljubnih glav, teles zavrnitev ali surovih napak.
Ob kasnejši napaki ostanejo prej veljavni izvirniki in sanitiziran manifest;
izhod je neuspešen, poznejše vrstice ostanejo `not-attempted`.

Samo lastni manifest novega varnega izhoda dovoli artifact (90 dni). Obstoječa
ali simbolno povezana pot se zavrne pred zahtevki in se ne naloži. Zajem nima
ključev ali odjemalca baze. Samo predhodni koordinator dobi koraku omejene
poverilnice za branje metapodatkov in čaka `--drzava ES --najvec 300` (posel
360 minut). Neuspešno čakanje prepreči zajem. Novi tok je fiksni bralec ES v
obeh smereh običajnega čakanja; `--tece` ga izpusti, ker ne piše v bazo.

Operater pred enkratnim dispatch preveri vse znane starejše ES zagone,
veljavne `startedAt` in vidnost v oknu 50 zagonov. Če je vrstni red negotov,
počaka na izpraznitev stare vrste. Vsi stari zagoni ES morajo končati pred
prvim GET; med čakanjem/zajemom se ne zažene novega bralca s starim commitom.
Poznejši stari DB-only vklop počaka na konec audita. Ta sprememba ne prenavlja
vrstnega reda ali paginacije koordinatorja.

CLI ne sprejme argumentov in zahteva pravi repozitorij, `main`, veljaven SHA/ID
ter `GITHUB_RUN_ATTEMPT=1`. To prepreči rerun, ne ločenega dispatch: operater
sproži natanko enkrat, brez avtomatične ponovitve neuspeha. Novi poskus zahteva
nov ločen proračun. Artifact sam ne dokazuje pravilnosti športnih podatkov,
pripravljenosti uvoza, pozicij/cen ali dovoljenja za vklop; sledi pregled brez
avtomatičnega uvoza, spremembe baze ali aktivacije.
