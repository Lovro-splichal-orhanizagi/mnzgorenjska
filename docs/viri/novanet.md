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
