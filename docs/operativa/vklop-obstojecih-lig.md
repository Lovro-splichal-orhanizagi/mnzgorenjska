# Hiter vklop že uvoženih lig

Delovni tok **Vklop obstojecih uvozenih lig** (`vklop-obstojecih-lig.yml`)
uporabi obstoječi servisni `vklopi_ligo_sredi_sezone` in skupno podatkovno
varovalko `preveri_vklop_lige`. Ne uvaža, ne bere strani ponudnikov, ne
spreminja cen, pozicij, urnikov ali zgodovinske politike in ne pošilja
sporočil. Nemčija, Španija in Hrvaška imajo svoje postopke.

Obseg je 43 že uvoženih kandidatov iz branja produkcije 18. 10. 2026,
izrecno naštetih v
`scripts/policies/existing-league-candidates-20261018.json`. Register je
inventar kandidatov, ne odobritev pripravljenosti. Vsaka vrstica veže ID,
slug, vir in šifro tekoče lige; sprememba teh podatkov zahteva pregled.
Opombe o pravicah navajajo dejansko obstoječe pogodbe virov, tudi čakajoča
soglasja in omejitve podatkov. Zapisano dovoljenje za NCEL, DBU ter
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
- Pretekle tekme tekoče sezone brez zapisnika in brez kontumacije so HOLD,
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
