# Malta — vir `mfa`

Vir `mfa` (`scripts/viri/mfa.mjs`) bere **javni JSON API Match Centra MFA**
(`api.mfa.com.mt/api`, podatki iz COMET), ki ga bere tudi
matchcentre.mfa.com.mt — brez ključa in prijave, z glavo `x-version: 2` (jo
pošlje stran sama). Država `MT` ("Malta", vpiše jo migracija lig).
Premier in Challenge sta po pregledanih izjemah vklopljena (21. 10. 2026);
NL I in NL II ostajata neaktivni. Malta dobi angleški vmesnik
(`JEZIK_DRZAVE.MT = 'en'`), vstop `slff.eu/mt`, kartico ob deljenju `mt.html` (Caddy jo vrne za `/mt` in `?t=mt-…`, tudi rezerva `:3201`, `vercel.json`), angleško vejo pošte (rok po malteško, kot
Ljubljana), malteška imena lastnikov hišnih ekip in `klub_stik.drzava`
(migracija 20261016213700), `IMENA_MT` v *Hisne ekipe* (malteško in angleško) in `MT`
v matriki nočnega uvoza (en koš). Ugib: IP, brskalnik `mt` ali `en-MT`, pas
`Europe/Malta`.
Šifra lige se začne z `mt-`. Gozo FA (gozofa.com, ločena piramida, postave le
v prostem besedilu) ni vpisana.

- **Šifra lige je `<tip>/<sezona>[/<tekmovanje>[+…]]`**: `<tip>` je stalni id
  vrste tekmovanja (58539 Premier, 2601248 Challenge League, 2601267 National
  League I, 6234492 National League II), `<sezona>` id sezone z
  `/competitions/<tip>/seasons` = **leto konca** (2027 = 2026/27; sezona je
  avgust–maj, ne koledarska). Ob novi sezoni se popravi le leto.
- **Faze**: brez `<tekmovanje>` so liga vsa tekmovanja (competitionId), ki jih
  našteje lestvica sezone (`/standings?season=`): Premier ima Opening Round
  Phase 1 (11 krogov) → P2 Top 6 / Bottom 6 → Closing Round Phase 1 → P2 (2025/26:
  šest tekmovanj, 32 krogov), Challenge League Phase 1 → Top 8 / Play-Out.
  Poznejša faza dobi kroge za zadnjim krogom faz, iz katerih so prišli njeni
  klubi; vzporedni skupini si delita številke (`krogiSezone`, kot oefb).
  Tekme istega tipa, ki jih lestvica ne našteje (dodatne kvalifikacije,
  odločilne tekme), izpustimo. Dve vzporedni skupini, ki sta za fantasy dve
  ligi (Amateur League 2023/24: Group A in B), potrebujeta `/<competitionId>`.
- **Tekme**: `/competitions/<tip>/pastMatches` in `/upcomingMatches`
  (`?season=&pageSize=50&page=`, stran za koncem je `[]`). Vrstica nima ne
  izida ne kroga; `isLineupAvailable` je napačen (false tudi pri polni postavi)
  — ne beremo ga. **Pretekle vrne največ 100 zadnjih tekem tekmovanja** (tudi
  po straneh, s `teamId` ali `date`), zato vir starejše prebere po šifri
  `/matches/<id>` navzdol od najnižje znane do treh zgrešenih zapored, in še
  luknje bloka do 120 šifer (`dopolniZacetek`; NL II 2025/26: 100 + 30 + 3,
  NL I 2025/26: luknja 23 tekem za prestavljeno zgodnjo tekmo). Odigrane,
  tuje in neobstoječe (`{"ni":404}`) gredo v svoj predpomnilnik
  (`po-sifri-<id>.json`) in se ne berejo znova; neodigrana tekma našega
  tekmovanja se bere vsakič (prestavljena dobi datum in pozneje PLAYED). Ime
  mora biti drugačno od `tekma-<id>.json`, ki ga dobi `prenesi`: gostiteljev
  `prenesi` shrani vsak odgovor pod tem imenom in tekma, prvič prebrana kot
  SCHEDULED, bi taka ostala za vselej. Zadeva le tekmovanja z več kot 100 tekmami (NL I, NL II,
  Challenge Phase 1); upcoming ima isto mejo, a pozni krogi pridejo sami.
- **Krog API ne pozna.** COMET izda šifre tekem tekmovanja po krogih, zato je
  krog zaporedje šifer (`krogiPoSifrah`): nov krog, ko bi klub igral drugič ali
  je krog poln (N/2). Izbrisana tekma pusti luknjo (NL I 2026/27: 53185946,
  krog 3 s 5 tekmami); na novo vpisana tekma z visoko šifro gre v luknjo, kjer
  ne igra nobeden od klubov. NL II
  2025/26 ima pregledano prekinitev/nadaljevanje Msida : Dingli
  (`50920555` + `51962893`): ena končna glava se razvrsti po prvotni šifri,
  individualnih dogodkov obeh segmentov pa ne združujemo (glej spodaj).
- **Zapisnik** = `/matches/<id>/result` (`homeScore`, `awayScore`, `status`
  PLAYED) + `/matches/<id>/lineup` (`homeTeam.players`, `awayTeam.players`):
  `id` igralca je **stalna šifra osebe COMET → `reg_st`**, `number`,
  `startingLineup`, `isGoalkeeper` (→ GK), `isCaptain`. Dogodki so pri
  igralcu z minuto ("45+2'" → 45, "90+3'" → 90): `GOAL`, `PENALTY` (gol z
  11 m), `OWN_GOAL` (pri strelčevi ekipi, šteje nasprotniku), `PENALTY_FAILED`,
  `YELLOW`, `SECOND_YELLOW` (prvi rumeni je svoj dogodek → 1 rumeni + 1 rdeči),
  `RED`, `SUBSTITUTION` (`playerId` noter, `playerIdTwo` ven) — **minute so
  točne**. **Menjava je zapisana pri obeh igralcih** (10 dogodkov za 5 menjav):
  dogodke beremo enkrat po `id` dogodka. Dogodek brez igralca (drugi rumeni
  trenerju, v `/result` brez `playerName`) v postavi ni in ne šteje. Nastopi
  gredo po šifri (`nastopi` iz oefb). Polčasa ni.
- **Ime** je pomešano ("Nathan Steve MANGION", "ATTARD Luke"); priimek so
  besede z velikimi črkami → "Mangion Nathan Steve" (`imeIgralca`;
  "MCPARLAND" postane "Mcparland" — identiteta je šifra).
- **Šifra zapisnika v bazi je `mt<id>`** (COMET drugih zvez ima isti
  številski prostor). Čas je UTC → ljubljanski (Malta je v istem pasu).
- **Nepopoln** (ekipa z manj kot 7 začetniki) kot pri frf/fas: izid se
  zapiše, nastopi le znane ekipe; **kontumacija** 3:0 / 0:3 brez obeh postav
  nima zapisnika. Razpored kontumacije ne označi (seznam nima izida) — admin
  ročno, kot pri NZS. Tekma s stanjem SCHEDULED v preteklosti (NL I 2026/27:
  Mellieha : Mtarfa, ena postava) ni odigrana.
- Klubi: ključ brez narekovajev ("St. George's" = "St. George’s"), kratko ime
  brez FC/SC. Victoria Hotspurs (Gozo) igra v Challenge League in je navaden
  klub vira.
- *Uskladi pozicije* z `vir = mfa` (vratar po večini tekem); ostale pozicije
  na glasovanje.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt na
www.mfa.com.mt in matchcentre.mfa.com.mt: `User-agent: * / Disallow:` (vse
dovoljeno, brez pravil za AI-robote); api.mfa.com.mt robots.txt nima (404).
Pogojev uporabe na straneh MFA ni. API je nedokumentiran (glava `x-version`
je glava strani same); vljudnostni mail MFA je predlagan (raziskava
2026-10-15), dovoljenja še nimamo. Beremo odkrito (`User-Agent: SLFF fantasy
(https://slff.eu)`, **3 s** med zahtevki, zapisnikov, starejših od tedna, ne
beremo znova). Sodnikov, trenerjev in fotografij ne beremo; vzorci
`scripts/vzorci/mt-mfa-*` so brez njih. **Ob 401/403/429, prijavi ali izzivu se uvoz
ustavi — ne obhajaj** (`MfaZavrnitev`, izhod 4). Odgovor, ki ni JSON (stran
vzdrževanja, prazen, odrezan), ustavi uvoz lige z navadno napako (izhod 1) in
ne gre v predpomnilnik (`vir.zaPredpomnilnik`), zato ga naslednji uvoz
prebere znova.

Preizkus v živo (15. 10. 2026, brez baze; seznami + zadnji krog, 3 s med
zahtevki, ~60 zahtevkov, 0 zavrnitev):

| liga | krogov / tekem (odigranih) | klubov | zapisnikov | goli = izid | postav po 11 | vratar | menjav (nastopov s klopi) | 990 minut |
|---|---|---|---|---|---|---|---|---|
| mt-premier (krog 7) | 10 / 60 (42) | 12 | 6 | 17/17 | 12/12 | 12/12 | 51 (51) | 11/12 (rdeči) |
| mt-challenge (krog 3) | 11 / 88 (24) | 16 | 8 | 18/18 | 16/16 | 16/16 | 66 (66) | 15/16 (rdeči) |
| mt-nl1 (krog 3) | 10 / 59 (15) | 12 | 5 | 15/15 | 10/10 | 10/10 | 45 (45) | 8/10 (2 rdeča) |
| mt-nl2 (krog 4) | 11 / 77 (28) | 14 | 7 | 29/29 | 14/14 | 14/14 | 65 (65) | 14/14 |

Opozorilo vira: v NL I (Senglea : Kalkara, mt53185944) rumeni karton brez
minute. Arhivi 2025/26 (seznami z dopolnitvijo po šifri, po ena ali dve
tekmi zadnjega kroga): Premier 32 krogov / 192 tekem (6 faz), Challenge 22 /
176 (Phase 1 + Top 8 in Play-Out po 4 tekme), NL I 26 / 182 (181 odigranih;
100 s seznama + 82 po šifri), NL II 22 / 132 (nadaljevanje je ista logična tekma v krogu 4);
vzorčeni zapisniki vsi 11 + 11, vratar, goli = izid.

Vpisane so 4 lige (migracija 20261016091500), zveza `mfa`:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| mt-premier | `58539/2027` | `58539/2026` |
| mt-challenge | `2601248/2027` | `2601248/2026` |
| mt-nl1 | `2601267/2027` | `2601267/2026` |
| mt-nl2 | `6234492/2027` | `6234492/2026` |

**Kandidata za navadni predogled obstoječih lig** (21. 10. 2026):
`973/mt-nl1/mfa/2601267/2027` (arhiv `2601267/2026`) in
`974/mt-nl2/mfa/6234492/2027` (arhiv `6234492/2026`), oba s
`source_policy = NULL`. Premier in Challenge sta že vklopljena prek svojih
pregledanih zgodovinskih poti. Vpis kandidata ne odobri zgodovinskih statistik
ali vklopa: ostanejo preverbe časov dogodkov, izidov, identitet, menjav,
vratarjev, cen, kadra in dejanskega prihodnjega prvega fantasy kroga.

**Pregledane izjeme NL (21. 10. 2026).** Uporabnik je odobril
NL I `mt50921445` (Mellieha : Victoria Hotspurs, 18. 4. 2026, 1:0,
manjkajoča časa dveh izključitev; 1/181 arhivskih poročil) in tri logične
tekme NL II (3/132 oziroma 2,27 %):

- `50920555` + `51962893`, Msida : Dingli, končni 1:1, krog 4,
  13. 1. 2026; manjkajoča povezovalna menjava;
- `50920572`, Dingli : Rabat, 0:0, krog 7, 14. 12. 2025;
- `50920621`, Dingli : Msida, 2:1, krog 15, 14. 2. 2026.

Zadnji dve poročili nimata minute izključitve. Uradni rezultati ostanejo,
individualne statistike teh tekem so nedostopne. Nespremenljivi politiki,
izvorni hashi in dokazila klubov so v registru in pregledanih migracijah;
sam vpis ne namesti oznak, ne uvozi arhiva in ne vklopi lige. Dodatna
odobritev NL II je vezana na `call_4fd7f0aef4cc49e4bae88528b45fd483`;
prvotno nadaljevanje na `call_8704b229964d4d00af0aea857b11fbf8`.

Celotni zadržani audit NL I pokrije 181 arhivskih in 20 tekočih poročil;
NL II 133 surovih arhivskih segmentov, 132 logičnih tekem in 35 tekočih
poročil. Dokaz NL II potrjuje 22 krogov, 12 klubov s po 22 tekmami,
nadaljevanje v krogu 4 in nespremenjeno razvrstitev vseh drugih parov.
Vseh 129 drugih arhivskih in vseh 35 tekočih poročil NL II ohrani
običajne stroge preverbe.

Za pregled **že shranjenih bajtov** je v `razdeli-zlite-igralce.yml` način
`mfa_nl_cache_audit=true`, `mfa_nl_league=mt-nl1|mt-nl2` in numerični
`source_run_id`. Pred obnovo preveri končan prvi poskus zagona `uvoz-lige.yml`
z veje `main` (tudi neuspešen zagon lahko nosi dokaz težave). Obnovi samo
natančni ključ `zapisniki-<liga>-<source_run_id>`, brez rezervnega ključa.
Zagon ne bere MFA ali baze, ne vsebuje servisnega ključa in ne požene
razdeljevanja igralcev. Arhiv in tekočo sezono razčleni z obstoječim adapterjem;
artefakt vsebuje `fixture-inventory.json`, `report-analysis.json`, manifest
imen/SHA256/mtime in vse uporabljene izvirne JSON bajte, tudi dopolnitev po šifri.
Napake zapisnikov so pri točni šifri z `issues=true`; manjkajoč predpomnilnik,
inventura ali telo zapisnika ustavi pregled. To ni dnevnik prvotnih HTTP zahtevkov:
mtime je čas datoteke, ne čas potrjenega odziva vira, status/čas prvotnega zahtevka
pa iz predpomnilnika nista dokazljiva. Opozoril, zavrnitev in izzivov ta pregled
ne odpravlja ali odobrava ponovnega branja.

Prvotni poln omrežni uvoz obeh sezon ene lige je približno 20–25 minut; arhiv 130–190 tekem
je ~15–20 minut (dva zahtevka na zapisnik in dodatni seznami/dopolnitev).
Oba NL skupaj bi potrebovala približno 840–890 zahtevkov in 40–50 minut;
Zaprta pot spodaj uporablja zadržani preverjeni predpomnilnik. Izrecnega dovoljenja MFA
nimamo; ohranimo javno pot, zaporedno branje in 3-sekundni premor ter se
ustavimo ob umiku, prijavi, izzivu ali 401/403/429, brez obhodov.

## NL I: dokončni izstop Mtarfe (21. 10. 2026)

[Končna izjava MFA](https://www.mfa.com.mt/news/competitions/malta-fa-statement-mtarfa-fc-suspended-from-bov-national-league-1/)
potrjuje izključitev Mtarfe po dveh izostankih; rok za pritožbo 19. oktobra
je potekel. Prvi tekmi sta razveljavljeni, preostale odpovedane. API še vedno
vrača šest prihodnjih tekem kluba. To ni manjkajoča postava ali dovoljenje
za izmišljanje kontumacij, minut ali vratarja.

Adapter samo pri točnem `competitionId=53109939`, `competitionTypeId=2601267`
in klubu `40412` izpusti Mtarfine tekme iz igralnega razporeda in pred branjem
zapisnikov. Surova inventura ostane nespremenjena; izpuščanje se zgodi šele
po določitvi krogov, zato se drugi pari ne preštevilčijo. Shranjeni vzorec
56 vrstic tako da 50 tekem v istih desetih krogih, po pet v vsakem.
Arhivi in druge lige ostanejo nespremenjeni.

Po objavi popravek zahteva navaden uvoz razporeda NL I z izrecnim
`--dovoli-manj-klubov` (v `uvoz-lige.yml`: `dovoli_manj_klubov=true`), da
obstoječe neodigrane Mtarfine tekme odstrani po običajni preverjeni poti.
Pred tem se preveri, da nobena nima uvoženih statistik ali uporabniških
fantasy ekip. Prihodnji prvi fantasy krog se pregleda po popravku. Sam
popravek ne vklopi lige in ne odobri nobene zgodovinske izjeme.

## NL I / NL II: zaprto ogrodje namestitve arhivskih oznak

`20261021183000_mfa_nl_archive_bootstrap.sql` doda samo zasebno ogrodje in
servisne RPC-je; ne vpiše nobene odobritve v SQL ali JS register. Natančni
native dvojici sta `973/mt-nl1/2601267/2027` in `974/mt-nl2/6234492/2027`.
Podprta ID-ja politike sta `mt-nl1-reviewed-history-2026-10-21-v1` in
`mt-nl2-reviewed-history-2026-10-21-v1`; brez poznejšega pregledanega vpisa
politike in vezav izvornih klubov prepare zavrne. Odobrene so samo zgoraj navedene točne izjeme; vklop še vedno potrebuje
popolno pogodbo vira in vse nadaljnje preverbe.

Najprej se na navadni poti uvozi **samo tekoča sezona**, še pred registracijo
politike. Izvorno potrjene popravke razporeda je treba namestiti pred prepare.
`prepare_mfa_nl_reviewed_bootstrap(competition_id, main_sha, policy_sha)`
zaklene relevantni obseg, zahteva neaktivno ligo brez arhiva, uporabniških
ekip ali sedanjih/izbrisanih glasov ter vrne celotni `beforeImageText` in
`beforeSha256`. Prihodnji odklenjeni začetni krog izbere iz dejanskih
tekočih vrstic po navadnem pravilu vrzeli/odigranih krogov. Preverba polne
pokritosti vira in njegovih izvirnih hashov ostaja naloga poznejše zaprte
priprave; domnevno prestavljenih tekočih tekem ta SQL ne razglasi za odigrane.

Po zunanjem pregledu apply sprejme še `before_sha` in `before_image_text`,
v isti transakciji ponovno preveri celoten posnetek in ustvari samo
politiki pripadajoče prazne arhivske glave, kroge ter natančne vezave klubov.
Ne briše ali rekonstruira nastopov/golov. Tekoče tekme, igralci, krogi in
izpeljani podatki ostanejo enaki. Migracija `20261021203000` priveže NL II
na celotni hash treh odobrenih tekem. Za nadaljevanje dovoli samo končni
`mt51962893`, krog 4, 13. 1. 2026, 1:1; `mt50920555` je prepovedana glava.
`get_mfa_nl_reviewed_bootstrap_receipt(competition_id)` obnovi potrdilo po
nejasnem odgovoru; apply se ne ponavlja na slepo. Zasebni deli niso odprti
niti servisu; javna ovoja uporabljata dejansko uro tudi ob koncu transakcije.
Dokaz celotnega uvoza, cenitev in vklop zahtevajo še ločeno pogodbo vira spodaj.

Rollback preizkus in dve povezavi tečeta samo na izrecno lastni sveži
bazi `supabase_db_slff_mfa_nl_bootstrap_20261021` z oznako tega projekta.
`MFA_NL_BOOTSTRAP_DISPOSABLE_TEST=1` omogoči SQL pogodbo;
`MFA_NL_BOOTSTRAP_RACE_TEST=1` omogoči tekmovalni preizkus, ki potrebuje
novo prazno testno bazo in za seboj pusti le sintetične testne vrstice.
Rollback SQL je vključen tudi v točno CI opravilo `varnost` na njegovi sveži
bazi; izven tega opravila običajna razvijalčeva baza ni dovoljena.
Ukaz je `npm run test:mfa-nl-bootstrap`; brez zastavic sta native preizkusa
preskočena. Ne uporabljaj razvijalčeve običajne baze.

## NL I / NL II: zaprta pogodba vira in vklop

`20261021200000_mfa_nl_source_release.sql` ne odobri nobenega novega poročila,
števila tekem ali paketa. Nespremenljiva zasebna tabela `source_contract`
potrebuje poznejšo pregledano migracijo. Dokument in njegov kanonični UTF-8
SHA vključujeta celotno provenienco `sourceArtifact` (runId, artifactId, digest,
commit, workflow, branch, name), natančne glave vseh arhivskih/tekočih poročil,
celoten tekoči razpored, število klubov in arhivskih krogov ter
`opening:{round,playedOn,deadlineAt}`. Deadline mora biti neodvisno izračunan
iz vira in enak izvirnemu bootstrap posnetku. Sintetični preizkusi niso odobritev.

Vsi novi RPC-ji so samo servisni in omejeni na 973/974:

- `get_mfa_nl_reviewed_source_contract(competition_id, contract_sha)` omogoča
  preverbo pogodbe in izvornega paketa že pred bootstrap; ne zahteva oznak.
- `get_mfa_nl_reviewed_source_state(competition_id, main_sha, contract_sha)`
  po bootstrap preveri celotno pokritost in vrne `footballImageText` ter
  `footballSha256`. Zunanji preverjevalnik primerja vsako izvorno vrstico in
  zgoščuje **iste bajte besedila**, brez ponovne serializacije. Posnetek vsebuje
  polne vrstice ekip/krogov/tekem/nastopov/golov in identiteto igralcev
  (id, competition_id, team_id, reg_st, first_name, last_name, full_name,
  shirt_number, nzs_birth_year). Cen, pozicij in active igralca ne zamrzne.
- `record_mfa_nl_reviewed_import(competition_id, main_sha, contract_sha,
  football_sha)` zabeleži zunanje potrjeni posnetek; isti commit ga ne more
  zamenjati. `record_mfa_nl_reviewed_prices(competition_id, main_sha,
  contract_sha)` po cenitvi zamrzne polno stanje ob nespremenjenem nogometu.
- `check_mfa_nl_reviewed_release(competition_id, main_sha, contract_sha,
  expected_preview_sha default null, activate default false)` preveri isti
  commit, pogodbo, bootstrap, posnetek, sveže cene, bodoči izvirni začetek,
  gole/XI/minute/identitete, trenutne zanesljive vratarje, klop, raznolikost
  cen in legalnih 15 do 100. Vklop zahteva pregledani digest in pod istimi
  ključavnicami izda zasebno dovoljenje ter vklopi ligo. Javni ovoj ob koncu
  ponovno preveri dejansko uro. `get_mfa_nl_reviewed_release_receipt(id)`
  obnovi potrdila po nejasnem odgovoru.

Čakajoče tekme nimajo shranjenega izvornega ID-ja: `fixtureBindings.indirect`
je zato true in vezava uporablja točen krog/datum/par klubov ter celotno
množico. Odigrana poročila imajo neposredno vezavo na `mtID`.

`npm run test:mfa-nl-release` uporablja samo izrecno lastno bazo
`supabase_db_slff_mfa_nl_release_20261021` ali točno sveže CI opravilo
`varnost`. `MFA_NL_RELEASE_DISPOSABLE_TEST=1` omogoči rollback pogodbo;
`MFA_NL_RELEASE_RACE_TEST=1` na prazni lastni bazi preveri dve povezavi in
za seboj pusti sintetične vrstice. Običajni CI registrira samo rollback test.
Pogodba brez zastavic nima dostopa do baze. Premier/Challenge ostajata ločena.

## Premier: pregledani zgodovinski izjemi (20. 10. 2026)

Uporabnik je odobril **samo `mt52581524` (2025/26, krog 28, 2:2) in
`mt53142122` (2026/27, krog 1, 4:0)**: manjkajo minute izključitev igralcev,
ki so nastopili. Uradni datum, par klubov, povezava in izid ostanejo, individualna
statistika teh dveh tekem pa je `unavailable_historical` v obstoječem skupnem
prikazu. To sta 2 od 240 odigranih zapisnikov (1/192 arhiv, 1/48 tekoča sezona),
ne splošna izjema za opozorila MFA. Politika in izvirni hashi so v
`scripts/policies/historical-statistics-exclusions.json`; `rawSha256` je hash
**dejanskih izvirnih bajtov postave**, hash rezultata je ločeno pripet v zaprti
pripravi. Izvirne datoteke ostanejo v artefaktu `12301385790` uspešnega zagona
`39501309242`; pot jih nikoli ne prenaša znova z MFA.

Zaprta pot `.github/workflows/mfa-reviewed-history.yml` teče samo na `main`,
na izrecnem trenutnem `expected_sha`, po standardnem čakanju na starejše uvoze
iste države (tudi Challenge) in globalne pisce. Ločeni načini:

1. `prepare`: zaklenjen celoten posnetek pred spremembo, njegov SQL SHA256 in
   štiri izvirne datoteke v omejenem artefaktu. Ne spreminja podatkov ali vezav.
2. Po zunanjem pregledu celotnega posnetka `cleanup`: zahteva dejanski ID zagona,
   ID in ZIP digest artefakta priprave ter pregledani `before_sha256` z istega
   commita. Ena transakcija preveri fiksni ligo/tekmi, 64 nastopov/8 golov,
   odsotnost ekip/kadrov/postav/glasov in nove odvisnosti; odstrani samo te
   individualne vrstice, popravi izpeljano statistiko, namesti skupni oznaki in
   nastavi prvi fantasy krog 9. Vsak odmik zavrne celotno transakcijo.
3. `reprice`: obstoječi DB-only vrstni red `lazni-vratarji` → `ugani-pozicije` →
   `ovrednoti-igralce`, nato native potrdilo dejanskega stanja cen. Če se `main`
   po čiščenju premakne, je dovolj nov pregledan `expected_sha` in nova cenitev;
   izvirno potrdilo čiščenja in njegov SHA ostaneta nespremenjena.
4. `preview`: samostojno preveri oznaki, 191 arhivskih + 47 tekočih popolnih
   zapisnikov, gole/nastope/identitete, aktualnega zaupanja vrednega vratarja
   vsakega kluba, raznolik cenik, veljaven kader 15 do 100 in točnih šest še
   neodigranih tekem kroga 9. Vrne `previewSha256` za zunanji pregled.
5. `activate`: zahteva pregledani `preview_sha256`, ponovi vse preverbe in
   uporabi obstoječe transakcijsko dovoljenje sprožilca. Rok **21. 10. 2026 ob
   10:00 UTC mora biti še v prihodnosti**; po njem ta omejena pot zavrne vklop.
   Nov začetek potrebuje ločen pregled in spremembo kode.
6. `receipt`: servisno branje trajnega potrdila za obnovitev po nejasnem
   odgovoru ali napaki shranjevanja artefakta; čiščenja se ne ponavlja na slepo.

Po namestitvi normalni uvozi preverijo celoten skupni native komplet oznak in
obe šifri preskočijo **pred branjem rezultata ali postave**, tudi iz predpomnilnika.
Razpored ohrani nameščeno glavo prek obstoječega `historicalMarker`. Manjkajoča,
delna ali napačno vezana namestitev ustavi uvoz. Nov, neodobren zapisnik z
izključitvijo nastopajočega igralca brez minute se ustavi pred pisanjem nastopov;
navadni rumeni karton brez minute ali izključitev nikoli uporabljene rezerve
sama po sebi ne ustvari izjeme. Splošna SQL upsert/aktivacijska pot ni razširjena.

Offline preverbe: `node --test scripts/test-mfa-reviewed-history*.mjs`.
Rollback SQL v `supabase/tests/mfa-reviewed-history.sql` teče v sveži CI bazi;
izrecna lokalna izbira zahteva `MFA_HISTORY_DISPOSABLE_TEST=1` in lasten
`SUPABASE_DB_CONTAINER`. Testni čas je samo zaseben, preklican DB-owner helper;
javni RPC nikoli ne sprejme ure od klicatelja.

## Challenge: štiri pregledane arhivske izjeme (21. 10. 2026)

Uporabnik je odobril samo `mt50903309`, `mt50903328`, `mt50903358` in
`mt52353213`, vse iz 2025/26, zaradi manjkajoče minute izključitve
nastopajočega igralca. Zaprta pot `mfa-challenge-reviewed-history.yml` uporablja
isti vrstni red `prepare` → zunanji pregled → `cleanup` → `reprice` → `preview`
→ zunanji pregled → `activate` kot Premier, z ločenimi RPC-ji in potrdili.
Premierjeva politika, hashi in RPC-ji ostanejo nespremenjeni.

Izvirni celotni ZIP artefakta `12303812226` uspešnega zagona `39507147003`
(`e4d1654151c9ecaf76b736581c20bfed12f4f56d9ea72f7afa62ee0b45eaac5c`)
se preveri pred izbiro osmih znanih teles: 448 datotek, od tega 446 v
`cache/`, omejitve velikosti, poti, povezav in CRC vseh teles. Vir se ne bere
znova. Čiščenje odstrani točno 118 nastopov in 14 golov; vsi štirje uradni
izidi ostanejo. Ostalih 204 popolnih zapisnikov, glave tekem, krogi, klubi in
igralci se preverijo proti celotnemu posnetku pred spremembo.

Po čiščenju ostane 172 razpoložljivih arhivskih zapisnikov in štiri oznake;
vseh 32 tekočih zapisnikov ostane popolnih. Vklop zahteva 16 klubov z
aktualnimi zaupanja vrednimi vratarji, raznolike sveže cene, veljaven kader 15
do 100, ohranjen nastop s klopi in točnih osem neodigranih tekem kroga 5
(`34903`). Rok `2026-10-23T10:15:00Z` mora biti še v prihodnosti. Normalni
MFA runtime sprejme samo pregledani native dvojici `971/58539/2027` in
`972/2601248/2027`, preveri celoten komplet nameščenih oznak pred branjem
in ohrani strogo preverjanje ur pri vseh drugih zapisnikih.

Preverbe: `node --test scripts/test-mfa-challenge-reviewed-history*.mjs`;
SQL rollback v sveži CI bazi teče zgodaj. Lokalni zagon zahteva lastno
odstranljivo bazo, `SUPABASE_DB_CONTAINER` in
`MFA_CHALLENGE_HISTORY_DISPOSABLE_TEST=1`.

## NL II: ena tekma, prekinitev in nadaljevanje

Za točno `6234492/2026` adapter po celotnem odkritju preveri `50920555`
(Msida : Dingli, 8. 11. 2025) in `51962893` (13. 1. 2026). Vrne eno
logično glavo s končno šifro/datumom ter obema izvirnima šiframa kot
provenienco. Pred določitvijo krogov jo razvrsti po prvotni šifri `50920555`.
Surovih zapisov in individualnih statistik ne združuje. Manjkajoči ali
nasprotujoči segment ustavi obravnavo. Druga sezona ali šifra lige ne
uporablja te preslikave.

Končna glava zahteva zgodovinsko oznako: navaden uvoz se ustavi **pred
branjem izida ali postave**, če je popolna nameščena vezava ne preskoči.
Ta sprememba ne namesti oznake ali vklopi lige. Polna izvirna inventura zadržanega
paketa `39655969899` je potrdila 132 logičnih tekem, 22 krogov in prvotno
mesto nadaljevanja v krogu 4; API nima polja za krog. Tekoča sezona 2026/27
in obstoječi pregledani poti Premier/Challenge ostanejo nespremenjene.

## NL I: pregledani vir za prvo objavo

Celotni zadržani vir je vezan na uspešen audit `39654281589`, artefakt
`12369359893`, digest `sha256:a758e66fa050cfefb5897018e9b71eb9595fb3a7c3947627c90fc58a71a662e2`.
Pogodba `9b25cae2297d920720d152d135799d109468642144e12202d8265cedd8343815`
vključuje vseh 201 odigranih poročil (180 popolnih arhivskih, eno označeno
arhivsko in 20 popolnih tekočih), 50 tekočih tekem in 11 tekočih klubov.
Običajni uvoz `39661344819` je odstranil šest neodigranih tekem Mtarfe;
poznejše branje baze potrjuje natančnih 611 tekočih nastopov in 67 golov
z vsemi neposrednimi fantazijskimi števci. Začetek je dejanski krog 5,
13. 11. 2026, rok `2026-11-13T13:30:00.000Z`, ne domnevni naslednji krog.

Zaprta pot `mfa-nl-reviewed-history.yml` uporablja pripravo, pregled natančnih
bajtov posnetka, bootstrap, zapečateno predvajanje običajnega uvoza iz
avtenticiranega predpomnilnika, cenitev, pregled in vklop. Noben od teh
korakov sam ne preskoči drugih preverjanj. Arhiva se ne prenaša znova z MFA.

## NL II: pregledani vir za prvo objavo

Migraciji `20261021203000` in `20261021203100` vpišeta samo odobreno
politiko ter nespremenljivo pogodbo vira; ne izvedeta uvoza ali vklopa.
Politika `91b657b699865da70ac797730b1aa902ea58e54fe7b0be691e445c58e21c69fe`
in pogodba `60c20346c32895157e39c1f80a20d7ae563d77c3302d5931b0592cd188ac0d02`
vežeta 167 logičnih poročil: 129 popolnih arhivskih, tri označena in
35 popolnih tekočih. Arhiv ima 22 krogov; tekoči razpored 77 tekem in
14 klubov. Natančna primerjava trenutnega vira in baze potrjuje
1080 nastopov ter 132 golov. Prvi fantasy krog je dejanski krog 6,
14. 11. 2026, rok `2026-11-14T12:00:00.000Z`.

Izvirni paket je zagon `39655969899`, artefakt `12374320002`, digest
`sha256:76ff29ffe701b057190fdd5860afd592b018db60dbc1ee56e74f6f9bdeecc793`.
Pogodba vsebuje vseh sedem polj provenience ter natančno identiteto vsakega
poročila in tekoče tekme. Zapečateno predvajanje obnovi preverjene bajte;
vsi nadaljnji koraki priprave, bootstrap, cenitve in vklopa ostanejo obvezni.
