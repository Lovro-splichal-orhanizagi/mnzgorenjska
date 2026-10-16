# Novanet: Galicia in Aragón

Vir `novanet` loči dekodiranje izida od razčlenitve postav in dogodkov. Pakirane skripte bere kot podatke; ne izvaja njihove kode. Skrite lažne številke niso rezultat. Nepoznan format ali neskladje med krogom in zapisnikom ustavi razčlenitev.

## Preverjene šifre

Iz javnih izbirnikov RFGF 16. 10. 2026:

| tekmovanje | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| Tercera Futgal, Lugo grupo 1 | `galicia:22:26990830:27759837` | `galicia:21:24123231:24820329` |

Prva šifra vsebuje sezono iz CMS-a, ne letnice. Zapisnik za bazo vrne kanonično sezono `2026/27`. Aragón ima preverjene posamezne vzorce, vendar zaznani arhivski izbirnik nasprotuje dejanskim datumom; zato ni vpisana aragonska liga.

## Pred vklopom

Liga je v migraciji neaktivna. Preverba cele tekoče in arhivske sezone mora vrniti popolno pokritost vseh odigranih tekem; nato potrebuje dokazljive vratarje, pregled identitet, uvoz in cenik po `.claude/skills/dodaj-ligo/SKILL.md`. Tudi zelen podatkovni audit ne nadomesti preverbe pripravljenosti cenika v bazi.

```bash
node scripts/preveri-vir-sezono.mjs novanet galicia:22:26990830:27759837 2026/27 /tmp/novanet-2026
node scripts/preveri-vir-sezono.mjs novanet galicia:21:24123231:24820329 2025/26 /tmp/novanet-2025
```

Audit je brez baze in brez ključev. Shrani surove dokumente s SHA-256, razpored, zapisnike in poročilo; ob nepopolnosti konča z 1. `pripravljeno` pomeni le podatkovni pogoj tega audita.

**Vratarji ostajajo nerešen pogoj:** pregledani HTML zapisniki, uradna statistika igralca in PDF tekme 1448233 nimajo oznake vratarja. Dres 1 ni dokaz pozicije. Splošna skripta za ugibanje pozicij tega pogoja ne potrdi. Brez dodatnega zanesljivega vira ali preverjenih pozicij lige ne aktiviraj.

## Obratovanje

Razpored se ponovno preveri po 15 minutah, novi zapisniki in tisti iz prvih treh dni po eni uri, starejši zaprti zapisniki po 30 dneh. Časovna meja se računa ob zadnji veljavni potrditvi; zgodnji zajem se ne spremeni sam v trajen arhiv. V predpomnilnik gre samo razčlenjen in medsebojno preverjen dokument.

Prenos uporablja samo anonimno javno sejo z novimi piškotki, ki jih strežnik izda sam. Seje ostanejo v pomnilniku in znotraj izvorne domene; piškotkov prijavljenega brskalnika ali klicatelja ne uvaža. Preusmeritve ne smejo zamenjati izvora. Prehodne omrežne napake se omejeno ponovijo, izrecne zavrnitve pa ne.

401/403/429 ali izziv ustavi vir brez obhajanja s shranjenim dokumentom. Znan manjkajoč zapisnik zadrži statistiko cele tekme in opozori v `vir.nepopolni`; obstoječe statistike ne izbriše. Če manjka vsak odigrani zapisnik, zagon pade. Ob delni pokritosti audit vedno pade; nočni nadzor mora zaznati tekme brez pravočasnega uvoza.

Karton rezerve brez vstopa ustvari ničminutni disciplinski nastop. Ponovni vstop zavrnemo, ker skupni model baze hrani le en interval nastopa. Klubi imajo pri shranjevanju pripono zveze zaradi imenjakov med španskimi zvezami; pred uvozom preveri tudi isti klub med sezonama.

Za ponovljive preizkuse: `npm run test:novanet`, `npm run test:sources`. Zajeti vzorci in izvor: `scripts/vzorci/es-novanet-provenance.md`.

Pri obeh zgoraj preverjenih ligah Tercera Futgal je redni del90 minut: izvorni absolutni čas95/96 se zato ob izrecnem kontekstu pretvori v90+5/90+6. Izvorni zapis ostane ohranjen, minute za fantasy pa omejene na90. Splošna razčlenitev in druge šifre tega pravila ne dobijo; minute999, podaljški in dvoumni zapisi ostanejo zavrnjeni.

Neznan ali dvoumen charset nikoli ne povzroči ugibanja imen. Audit tak odgovor zadrži in shrani omejene izvorne bajte kot `.bin`, z javnim Content-Type in napako v manifestu; piškotki niso del dokaza.


## Celotni živi pregled 16. 10. 2026

Arhivski pregled je zajel vseh 18 krogov in poskusil vseh 90 odigranih tekem. Deset zapisnikov je veljavnih; zapisnika1306457 (manjkajoče menjave) in1306462 (karton pri999) ostajata nepopolna. Preostalih78 odgovorov je bilo praznih, brez bajtov in brez navedene kodne strani. Vzrok ni ugotovljen; to niso veljavni zapisniki in ni dovoljeno sklepati, da ni bilo dogodkov. Dokaz je artefakt `vir-galicia-2025` teka38941059903.

Prenos zdaj ob prvem praznem odgovoru ustavi celoten zagon. Shrani prazne izvorne bajte, dejanski HTTP status in javni Content-Type; takšnega odgovora ne ponavlja in ga ne zbere kot preskočljivo napako razčlenitve. Tudi napaka pri zapiranju telesa odgovora ne sme prekriti prvotne zavrnitve preusmeritve ali omejitve velikosti. Pregled tekoče sezone je ločen od arhivskega, da ne ponavlja že ugotovljenih praznih odgovorov.


Tekoči pregled teka38962574407 po končnih popravkih potrdi vseh 18 krogov in 10/10 odigranih zapisnikov: 20 postav po11, 45 golov, 83 menjav, 46 rumenih in5 rdečih kartonov. `pokritost=true`, `napake=[]`; `pripravljeno=false` ostane zaradi vseh desetih klubov brez izrecne oznake vratarja. Ta rezultat ne odpravi arhivskih vrzeli ali zahtev pozicij/cenika. Artefakt `vir-galicia-2026` vsebuje vseh28 izvornih dokumentov.


Poznejši posamezni zajem1306467 je vrnil HTTP200, ISO-8859-15 in49.549bajtov; stroga razčlenitev potrdi zapisnik z razporedom. Prejšnji prazni odgovori zato niso dokaz trajno manjkajočih dokumentov; njihov vzrok še ni ugotovljen. Običajni premor med zahtevami je povečan z2na5sekund, s čimer zmanjšamo obremenitev izvora. To ni dokaz odpravljene napake: prvi prazen odgovor ali zavrnitev še vedno takoj ustavi zagon, brez menjave sej/IP-ja ali ponavljanja po zavrnitvi.

Ponovljeni arhivski pregled teka38969114648 s5sekundami med zahtevami je ponovno prejel prazen HTTP200 pri1306467, po18 razporedih in12 nepraznih zapisnikih. Zagon se je pravilno ustavil ob prvem praznem odgovoru (31 zajetih zahtev), ohranil izvorne bajte in dve že ugotovljeni nepopolnosti. Posamezni zapisnik je v ločenem običajnem zajemu veljaven, zato to ostaja nepojasnjena ponovljiva omejitev celotnega pregleda, ne dokaz manjkajoče tekme. Nadaljnjih zahtev ali menjave seje po praznem odgovoru ni. Arhivska pokritost in dokaz vratarjev ostajata pogoj za aktivacijo.
