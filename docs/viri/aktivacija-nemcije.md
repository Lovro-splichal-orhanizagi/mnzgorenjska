# Izrecni vklop Regionallige Nordost

Migracija `20261016233000_varen_vklop_nemcije.sql` samo namesti servisni RPC;
ne uvaža podatkov in ne vklopi lige. Španija ostaja zunaj tega postopka.

1. Na `main` mora uspeti sveža veriga migracij in običajni CI. Nato zaženi
   `preveri-nova-vira.yml`, `vir=dfb`, `sezona=all`, na pregledanem commitu.
   Zahtevana sta uspešen celoten zagon in oba ohranjena artefakta
   `vir-dfb-2025` ter `vir-dfb-2026`. Arhiv potrebuje vseh 306 zapisnikov;
   tekoča sezona vse zapisnike uradno že odigranih tekem. Tekoči zajem je
   veljaven 12 ur, arhivski sedem dni, merjeno od najstarejšega dokumenta.
2. Z obstoječim `uvoz-lige.yml` uvozi `liga=de-regionalliga-nordost`,
   `arhiv=regionalliga-nordost/2025-2026`, `tekoca=true`, `cene=true`,
   `prepisi_aktivno=false`. Uvoz lige ne vklopi.
3. Zaženi `vklop-nemcije.yml` z obema ID-jema zagonov in njunim celotnim
   `source_commit`, brez `approved_sha256`, `activate=false`. To ne dostopa
   do baze. Preveri uspeh izvornih zagonov, ponovno razčlenjene surove
   dokumente in artefakt `nemcija-release-*`: `summary.json` navede SHA256
   **točnih bajtov** `manifest.json`, identitete zagonov, čase in števila.
   Pregledani SHA veže posamezne tekme, začetne postave in uradne oznake
   vratarjev ter SHA vseh zajetih dokumentov in kode razčlenjevalnika.
4. Ponovi z istimi vhodi in pregledanim `approved_sha256`, še vedno
   `activate=false`. RPC primerja vse podatke neposredno v bazi, brez
   omejitve PostgREST na 1000 vrstic. Uspešen pregled ničesar ne vklopi.
5. Pred vklopom mora lastnik dejansko namestiti in preveriti DE HTML/Caddy
   ter funkcijo `posli-opomnik` z nemškim besedilom in časovnim pasom Berlin
   po običajnih navodilih za Hetzner. Spletni deploy iz CI teh dveh storitev
   ne posodobi. `server_ready=true` je potrditev opravljenih preverjanj,
   ne nadomestilo zanje. Če lastniški SSH ni dosegljiv, liga ostane neaktivna.
6. Šele nato isti potek z istim SHA in `activate=true`, `server_ready=true`.
   Ponovi vse preverbe in atomarno pokliče obstoječi
   `vklopi_ligo_sredi_sezone`, preveri `vklopljena=true`, `razlika=0` ter
   dejansko aktivno stanje s prihodnjim, odklenjenim prvim fantasy krogom.

Potek preveri izvorne GitHub zagone (isti repozitorij, točen workflow,
`workflow_dispatch`, pregledani commit, končan uspeh). Koda razčlenjevalnika
mora ostati enaka izvorni; guard je lahko dodan pozneje. Vsi prenosi prihajajo
iz uradnega DFB izvora, vsak surovi dokument mora ustrezati shranjenemu SHA.
Priprava uporablja le shranjene dokumente, brez tihih novih omrežnih branj.
Po spremembi kode ali preteku svežine je potreben nov audit in pregledani SHA.
Ročno pripisani ID-ji zagonov lokalnim datotekam niso dokaz izvora.

RPC sprejme samo fiksno ligo/sezoni in servisno vlogo. Zahteva natanko
18 klubov, 34 krogov in 306 enoličnih parov v vsaki sezoni, vse arhivske
zapisnike, točen nabor in datume tekem, uvožene ID-je/URL-je/izide/opozorila,
22 začetnikov po imenih in zgodovinskem klubu ter po enega začetnega vratarja
z izrecno uradno oznako T na vsaki strani. Preveri gole po posamezni tekmi
in strani (z avtogoli), nastope strelcev, dejanske tekoče menjave, cenik in
veljaven kader do 100. Globalno izravnavanje manjkajočih/odvečnih golov ne
zadošča. Imena so stroga: drugačna shranjena identiteta ustavi vklop in zahteva
pregled, ne samodejne združitve igralcev.

Med primerjavo in vklopom drži vrstico tekmovanja ter deljene zaklepe tabel
klubov, igralcev, krogov, tekem, nastopov in golov. Ti kratko zadržijo tudi
pisce drugih držav; zaščite ne izklapljamo. Actions uporablja isto skupino
kot ročni uvoz te lige in počaka na starejše povezane uvoze.

Lokalne regresije: `node --test scripts/test-vklop-nemcije.mjs scripts/test-zagona-nemcije.mjs`.
SQL na zavržni sveži Supabase bazi: `node scripts/test-vklop-nemcije-sql.mjs`;
vse sintetične vrstice in poskusni vklop se razveljavijo. Test namenoma zahteva
prazno neaktivno DE ligo; ne izvajaj ga na produkciji.
