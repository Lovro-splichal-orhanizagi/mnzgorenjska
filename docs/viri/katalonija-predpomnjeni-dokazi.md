# Katalonija: zgodovinski javni dokazi iz predpomnilnika

Rocni workflow `FCF predpomnjeni javni dokazi` (`fcf-predpomnjeni-dokazi.yml`) na veji `main` obnovi dva obstojeca posnetka, vsakega v locenem opravilu:

- `zapisniki-ES-k1od1-39053159080-1`
- `zapisniki-es-ct-elit-39067015141`

Ni vhodnih parametrov. Obnovitev uporablja samo uradni GitHubov restore transport; ni FCF zahtev, namestitve odvisnosti, dostopa do baze ali shranjevanja/promocije predpomnilnika. Obnovljene poti so obstojece `scripts/.predpomnilnik`; imen posnetkov ne uporabljamo za sklepanje o njihovi vsebini.

Izvoz je omejen na javne zapisnike **4109388, 4109643, 4109649, 4116202, 4116215, 4118352, 4118358**. Za vsak zapisnik je uradni naslov `https://www.fcf.cat/ca/competicio/acta/ID`, izvorna relativna pot pa `scripts/.predpomnilnik/fcf/acta-ID.html`. Noben drug clan predpomnilnika se ne izvaža. Posamezno telo je omejeno na 2 MiB, torej najvec 14 MiB teles in majhen manifest na posnetek. Artefakti imajo ime s kljucem posnetka, ID zagona in poskusom ter 90-dnevno hrambo.

Workflow po obnovitvi, tudi neuspesni, izvede:

```sh
node scripts/izvozi-fcf-predpomnjene-dokaze.mjs
```

CLI ne sprejema argumentov. Zahteva Actions na tem repozitoriju/veji `main`, veljaven `GITHUB_SHA`, `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT` in naslednje metapodatke iz koraka obnove: `FCF_CACHE_KEY`, `FCF_CACHE_MATCHED_KEY`, `FCF_CACHE_HIT`, `FCF_RESTORE_OUTCOME`. Pred branjem izvornih teles morajo biti rezultat obnove `success`, `cache-hit` tocno niz `true` in vrnjeni kljuc tocno enak zahtevanemu dovoljenemu kljucu. Priblizna ujemanja niso dokaz tocnega posnetka.

Izhod je vedno nova mapa `fcf-predpomnjeni-dokazi` v korenu delovnega imenika. Obstojeca mapa/datoteka, prekrivanje z izvorom ali simbolna povezava v izhodni poti pomenijo zavrnitev brez pisanja. Tudi izvorne poti ne smejo vsebovati simbolnih povezav ali neobicajnih datotek. Vseh sedem poti se preveri pred kopiranjem; ce je katerakoli neveljavna, se ne izvaža nobeno telo. Varen nov izhod pri drugih napakah zadrzi omejen `manifest.json` in ukaz vrne nenicelni status. Po uspesnem zapisu lastnega manifesta CLI v Actions izhod zapise samo `evidence_ready=true`. Nalozitev uporablja `always()` in ta signal, zato zadrzi tudi manifeste neuspesnih izvozov, nikoli pa ne nalozi obstojecih neodobrenih izhodov. Ce ni varnega izhoda, ni artefakta.

`manifest.json` za vsak fiksni ID navaja naslov, izvorno pot in stanje:

- `found`: izvirni nespremenjeni bajti so v artefaktu; zapisani so ime datoteke, velikost, SHA-256 in izvorni filesystem `cachedMtime`.
- `missing`: tocni posnetek je bil uspesno obnovljen in pot dejansko manjka. Ce manjkajo vsi zapisniki, je izvoz lahko uspesen, vendar ni dokazov o vsebini zapisnikov.
- `invalid`: pot/telo je bilo zavrnjeno. Nobeno telo tega posnetka ni izvozeno.
- `not-inspected`: telo ni bilo pregledano zaradi neveljavnih metapodatkov, druge neveljavne poti ali nedosegljivega posnetka.

Stanje predpomnilnika locuje `available`, `unavailable` (miss/brez tocnega zadetka), `mismatch`, `error` in `invalid`. Miss ali napaka obnove ne pomenita, da posamezni zapisniki v posnetku manjkajo. Neznani metapodatki se ne prepisujejo v manifest; razlogi so omejene kode.

`extraction.commit` je SHA kode/workflowa za **izvoz**, ne neznani commit prvotnega zajema. `sourceCaptureCommit` in `sourceFetchTime` ostaneta `null`; `freshness` je `unverified-historical-cache`. Cas spremembe datoteke ali ustvarjanja cache posnetka ni overjen cas prenosa pri FCF. Izvoz ne dokazuje trenutne vsebine, ne popravlja rezultatov/opozoril in sam po sebi ne odobri aktivacije lige. Razlike med posnetki se primerjajo z bajti/hashi in loceno provenienco, ne z izbiro navidezno novejsega mtime. Morebitna sveza potrditev je locen normalen pooblascen postopek.

Lokalno preverjanje brez providerjev/baze:

```sh
node --test scripts/test-izvozi-fcf-predpomnjene-dokaze.mjs
node --check scripts/izvozi-fcf-predpomnjene-dokaze.mjs
```
