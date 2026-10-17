# Izrecni vklop Regionallige Nordost

Migraciji `20261016233000_varen_vklop_nemcije.sql` in
`20261017153000_nemcija_zacetek_po_cakajocem.sql` samo namestita servisni RPC;
ne uvaža podatkov in ne vklopi lige. Španija ostaja zunaj tega postopka.

1. Na `main` mora uspeti sveža veriga migracij in običajni CI. Nato zaženi
   `preveri-nova-vira.yml`, `vir=dfb`, `sezona=all`, na pregledanem commitu.
   Zahtevana sta uspešna sezonska posla in oba ohranjena artefakta
   `vir-dfb-2025` ter `vir-dfb-2026`. Arhiv potrebuje vseh 306 zapisnikov;
   tekoča sezona vse objavljene zapisnike uradno že odigranih tekem. Edina
   pregledana izjema je povsem prazna uradna predloga 2426099, Hertha BSC II–RSV,
   16. 10. 2026, 13. krog, 0–1 (0–0). Razčlenjevalnik preveri točno identiteto
   in prazno strukturo; drugačen ali delno objavljen zapisnik ostane napaka.
   Audit izjemo izrecno našteje v `cakajoci`, `pokritost=false`, vendar je
   `pripravljeno=true`, če so vsi drugi podatki in vratarji potrjeni.
   Tekoči zajem je
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

Manifest z izjemo ima različico 2 in pravilo `future-round-with-pending-history`.
Tekma ohrani uradni končni izid v manifestu in `pending=true`; v bazi ostane
neuvožen placeholder brez nastopov in golov, ne ponarejen rezultat ali zapisnik.
Javni rezultati in lestvica vključujejo samo uvožene tekme, zato ta tekma do
objave manjka. Pred vklopom mora biti prvi fantasy krog strogo po 13. krogu;
RPC zavrne vsako zgodovinsko izjemo v krogu, ki bi štel za fantasy. Ko zveza
objavi popoln zapisnik, ga običajni nočni uvoz sam uvozi. Arhivskih izjem ni.

Potek preveri izvorne GitHub zagone (isti repozitorij, točen workflow,
`workflow_dispatch`, pregledani commit, končan zagon in uspešen posel prav te
sezone z istim `run_id` in `head_sha`). Neuspešen ali preklican sorodni posel
druge sezone ne razveljavi že končanega uspešnega sezonskega zajema.
Edini izrecno pregledani starejši arhivski zajem je zagon `38970734064` na
commitu `6defb2484c9c2caaf7a217cf6763b4bca2e65a7a`: arhivski posel je uspel,
tekoči takrat ne. Dovoljen je samo za arhiv 2025/26 in samo z dokazom uspeha
arhivskega posla; poljubni drugi starejši commiti niso dovoljeni. Vsak od
306 surovih arhivskih zapisnikov se vseeno ponovno razčleni s trenutno kodo
in preveri njegov SHA; starost največ sedem dni ostane obvezna.
Koda razčlenjevalnika
mora ostati enaka pregledanemu tekočemu zajemu; guard je lahko dodan pozneje. Vsi prenosi prihajajo
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
