# Hiter vklop že uvoženih lig

Delovni tok **Vklop obstojecih uvozenih lig** (`vklop-obstojecih-lig.yml`)
uporabi obstoječi servisni `vklopi_ligo_sredi_sezone` in skupno podatkovno
varovalko `preveri_vklop_lige`. Predogled in vklop ne uvažata, ne bereta ponudnikov in ne spreminjata cen,
pozicij, urnikov ali zgodovinske politike. Ločeni `refresh=true` uporabi
omejeno EPS/HLF dohitevanje, opisano spodaj. Noben način ne pošilja sporočil. Nemčija, Španija in Hrvaška imajo svoje postopke.

Obseg sestavljajo izrecno pregledani že uvoženi kandidati, našteti v
`scripts/policies/existing-league-candidates-20261018.json`. Register je
inventar kandidatov, ne odobritev pripravljenosti. Vsaka vrstica veže ID,
slug, vir in šifro tekoče lige; sprememba teh podatkov zahteva pregled.
Opombe o pravicah navajajo dejansko obstoječe pogodbe virov, tudi čakajoča
soglasja in omejitve podatkov. Zapisano dovoljenje za NCEL, DBU, Lowland ter
Atene/Evbejo ne dovoljuje obhajanja zaščit. Pri drugih navedenih virih
ostane veljavna obstoječa javna pot brez zabeleženega izrecnega dovoljenja.
Znana prepoved ali umik dovoljenja izključi zadevne sluge iz predloga;
registra ne uporabljaj kot dokaz, da je izziv ali prepoved prenehala.

1. Na main izberi točne sluge. Preberi navedene državne pogodbe in zadnje
   znane blokade. V seznam vključi samo pregledane vire brez znanega STOP.
2. Poženi predogled z `lige=<slug,slug>` in `expected_sha=<celotni main SHA>`.
   Privzeti `activate=false` zagotovi samo branje baze.
3. Preglej artefakt: `scope.json` veže točen seznam, opombe virov in SHA;
   `results.jsonl` vsebuje sveže stanje vsake lige, predvideni prvi krog,
   najcenejši zakoniti kader ter razlog za vsak HOLD. SHA256 je odobritev
   obsega, ne zamrznjenega posnetka baze. Pri vklopu se podatki znova berejo.
4. Poženi isti seznam na istem commitu z `activate=true` in
   `approved_sha256=<SHA256 iz scope.json>`. Drugačen commit ali seznam
   zahteva nov predogled. Produkcijski ključ ostane samo v Actions.
5. Preglej `ACTIVE` in dejanski `readback.active/prvi_fantasy_krog`.
   HOLD ene lige ne prepreči preverb in vklopa ostalih. Zagon z vsaj enim
   HOLD konča z napako, vendar vedno shrani delni rezultat. Uspešen RPC brez
   pričakovanega ponovnega branja ni dokaz uspešnega zaključka.

Sveže preverbe za vsako ligo:

- `stanje_lige` → `oceniPripravljenost`, isti izračun zakonitega kadra 15
  igralcev, proračun 100 in največ trije iz kluba. Veljajo obstoječe pozicije
  vira ter njegovi običajni namigi/glasovanje; nove zahteve po uradnih
  pozicijah niso dodane.
- Tekoča sezona pride iz `sezona_lige`. Prihodnji prvi krog mora imeti
  tekme, nezapadel rok, brez zaklepa, nastopov, uvoženega zapisnika ali
  znanega neničelnega izida. Izbira sledi sedanjemu RPC, tudi izjemi največ
  dveh vnaprej odigranih poznejših krogov.
- Pretekle tekme tekoče sezone brez zapisnika, brez kontumacije in brez
  izrecne izvorne oznake `vir_brez_izida = true` so HOLD,
  z izpisom ID-jev za pregled. Ne trdimo, da je ponudnik zapisnik že objavil:
  `home_goals/away_goals` sta NOT NULL DEFAULT 0 in prihodnji 0:0 je običajna
  vrstica razporeda. Datum tekme (sicer kroga) se primerja s koledarskim
  dnevom Europe/Ljubljana; prihodnji 0:0 ne blokira. To ni pregled svežine
  pri ponudniku in ne dokazuje, da novih objav še ni.
- Pri vsaki uvoženi tekmi brez kontumacije mora število golov ustrezati
  njenemu izidu; nasprotni napaki se ne smeta izničiti v skupni vsoti.
  HOLD navede ID-je tekem/zapisnikov in posamične razlike ter ohrani
  skupno razliko iz pregleda RPC. Navadna opozorila o rumenih kartonih ne
  postanejo nova ovira. Posebne `source_policy`, politike rokov ali oznake
  `unavailable_historical` se predajo svojemu postopku.
- Vklop znova preveri skupno varovalko v svoji transakciji in uporablja njene
  zaklepe. Preverbe pred RPC so trenutni pregled, ne nov atomski backend.
  Delovni tok pred pisanjem za vsak izbrani slug izvede obstoječi
  `cakaj-na-uvoze --popravek --tekmovanje <slug>`; ta počaka tudi na starejše
  uvoze neaktivnih lig iste države in nočni uvoz. Novi uvozi in skupna
  vzdrževalna pisca prepoznajo ta paket kot globalnega pisca in počakajo
  nanj. Predogled ne čaka in je samo bralen. Starejši že zagnani/pinani
  delovni tokovi nove družine še ne poznajo: pred prvim produkcijskim
  paketom preveri njihov zaključek. FCF source-only koordinator vidi
  paket, vendar ga izrecno izpusti, ker fiksni obseg izključuje ES in
  paket nikoli ne bere ponudnika.

Ponovni zagon ne poskuša vklopiti že aktivnih lig (`ALREADY_ACTIVE`). Po
omrežni napaki pisanja se RPC ne ponavlja; skripta poskusi ponovno branje in
shrani HOLD z dejanskim stanjem, kjer je dostopno. Ponovni ročni zagon
zahteva pregled tega stanja. Hišne ekipe, grbi in zemljevid se ne sprožijo
samodejno; obstoječi nočni postopki in ločeni delovni tokovi ostanejo.

Preizkus brez baze ali ponudnikov:
`node --test scripts/test-vklop-obstojecih-lig.mjs`.

## Paketno dohitevanje neaktivnih EPS ali HLF lig

`refresh=true` osveži **1–5 izrecno izbranih kandidatov istega vira EPS ali HLF** iz istega
registra. To je pisalni način: zahteva `expected_sha` in
`approved_sha256` iz predogleda na istem commitu, čaka na starejše pisce
ter ob začetku preveri vse izbrane ID-je, sluge, vire in šifre lig.
Vsak korak znova zahteva neaktivno ligo brez posebne politike. Z aktivno
ligo, arhivom, drugim virom ali spremenjeno šifro se ne začne.

Za vsako ligo zaporedoma uporabi običajna ukaza:

```sh
node scripts/uvoz-razporeda.mjs --tekmovanje <slug> --pisi
node scripts/uvoz-zapisnikov.mjs --tekmovanje <slug> --samo-manjkajoce
```

Drugi ukaz je opt-in samo za tekočo sezono neaktivnega EPS ali HLF tekmovanja.
V preskočni seznam sodijo le vrstice z dejanskim `imported_at` in
`zapisnik_id`. Oba vira jih izpustita pred branjem strani zapisnika; nepopolni
zapisniki z `imported_at = null` ostanejo upravičeni do dopolnitve. Običajni
nočni uvoz aktivnih lig ohrani svoj režim svežine. EPS zdaj upošteva tudi
obstoječi izbor posameznega `--zapisnik` pred branjem drugih zapisnikov.

Razpored se bere sveže po obstoječem postopku. Oznaka `vir_brez_izida`
uporablja obstoječe preverbe razporeda; pretekli datum ali rezultat 0:0
sam zase nikoli ne dokazuje, da tekma nima objavljenega zapisnika.
Neobjavljeni/nepopolni podatki, neujemanje golov in druge težave ostanejo
HOLD. Osvežitev ne spreminja pravil, ne dopolnjuje statistike, ne prepisuje
cen in ne vklopi lige.

Opozorilo razporeda o manjkajočih klubih zadrži to ligo. Zavrnitev, nedosegljivost ali drug nepojasnjen padec podukaza
zadrži še preostale izbrane lige iste domene vira; neodvisne domene se
nadaljujejo. Noben padli podukaz se samodejno ne ponovi. Ob prekinitvi ali
nejasnem izidu preveri dejansko bazo in artefakte pred novim zagonom.
Premori, predpomnilnik in ustavitev ob izzivu ostanejo v običajnem viru.
Vsak podukaz ima največ 30 minut, paket največ pet lig.

Artefakt vsebuje `refresh-progress.jsonl` z zapisom pred/po vsakem podukazu,
`refresh.jsonl` s koraki/izhodi vsake lige in svež
`results.jsonl` z nespremenjenimi preverbi pripravljenosti po osvežitvi.
Predpomnilnik izbranega vira se shrani tudi ob delnem neuspehu. Ligo, ki opravi
osvežitev, a še nima podatkov za vklop, izhod jasno označi HOLD.
`refresh=true` in `activate=true` se izključujeta. Po pregledu uporabi
obstoječi ločen `activate=true` za pripravljen izbor na istem commitu;
ob vklopu se stanje in prihodnji rok spet prebereta in preverita v bazi.

HLF obseg je omejen na `ro-liga3-s2` do `ro-liga3-s8`, `ro-liga2`,
`ro-ab-superliga`, `ro-hd-l4`, `ro-cj-l4`, `ro-sb-superliga`,
`ro-ab-l4-s1`, `ro-ab-l4-s2`, `ro-ab-l5-s1`, `ro-ab-l5-s2`,
`ro-cj-l5-dej`, `ro-cj-l5-g1`, `ro-cj-l5-g2`, `ro-cj-l5-gherla`
in `ro-hd-l5`. Vsi uporabljajo
isto domeno `hailafotbal.ro`; nepojasnjen padec ustavi preostali HLF paket,
tudi kadar imajo lige različne poti. Uporabi se izključno obstoječi javni
brskalniški adapter z njegovimi premori in ustavitvijo ob izzivu. Neposredni
klici Datalake API ali poverilnice iz kode strani niso dovoljeni.

HLF nima arhiva; velja že dokumentirana pot cen iz minut tekoče sezone
v `docs/viri/romunija.md`. Ta razširitev ne odobrava novih zgodovinskih
izključitev, ne spreminja cen in ne izpušča preverjanja vratarjev,
zakonitega kadra ali prihodnjega roka.

Po dohitevanju lahko obstoječi `cene-lig.yml` z izrecnim vhodom `lige`
prevrednoti neaktivne kandidate iz že uvoženih zapisnikov. Ne bere ponudnikov,
ne podaja dovoljenja za aktivne cene in preskoči lige, ki že opravijo
preverbo pripravljenosti. Vnos `predpona` za ta paket ostane prazen.
Po zaključku ponovno izvedi predogled izbranega obsega; cenovni korak
sam ne odobri vklopa ali izpuščanja nepopolnih zapisnikov.

Pregledana pot `reviewed-existing-history.yml` ima sedem točnih lig in deset
zapisnikov: `gb-npl-midlands`, `gb-sfl-d1-south`, `ro-liga3-s1`,
`ro-ab-l4-s2`, `ro-ab-l5-s2`, `ba-wwin-liga-bih`, `md-liga-2`.
Dodatek 24. 10. za `ro-ab-l5-s2` velja samo za tekmo 202541 z uradnim izidom
2–3 in manjkajočimi dogodki strelcev; podrobnosti in zgoščene vrednosti so v
`docs/viri/romunija.md`. Priprava, uporaba, cenitev, predogled, vklop in potrdilo
ostanejo ločene stopnje brez branja vira. Koordinator vse tri romunske poti
preslika v RO, moldavsko v MD ter ohrani ločitev bralnih in pisalnih stopenj.
