# Glavni koncepti podatkovnega modela

- `players` → realni igralci, vezani na realni klub (`teams`) in tekmovanje
- **Soimenjak pri drugem klubu ni samodejno prestop.** Vir brez šifre igralca
  (stari CMS MNZ, NZS, fsb, fss, fssid, ffm) pozna le ime in klub; uvoz je
  istoimenskega igralca drugega kluba imel za prestop tudi, ko sta igrala
  hkrati (Petrović Lazar, rs-srpska-istok, 10/2026: vratar Morave in igralec
  Malošišta v istih krogih, en zapis, vsota točk). Zdaj ga `prestopSkladen`
  (`scripts/prestop.mjs`) sprejme le, če je skladen s časom: brez **trka**
  (isti dan ali isti krog ≤ 6 dni narazen), nov klub za vsemi nastopi starega,
  vrnitev ne v obdobju drugega kluba; sicer nov zapis (dvojnika `zdruzi-duplikate`
  združi, zapisov s trkom pa ne). Igralca s šifro (`reg_st`) po imenu ne
  posvoji. Šifra je identiteta: pri sportnet/oefb/hns/mlsz dva kluba v istem
  krogu niso zlitje (dvojna registracija, prestavljena tekma, krogi faz).
  Že zlite razdeli delovni tok *Razdeli zlite igralce*
  (`scripts/razdeli-zlite-igralce.mjs` → SQL `zliti_igralci`,
  `razdeli_zlitega_igralca`, migracija 20261011233100): gruča je klub, id
  ostane klubu, ki ga imajo lastniki (pozicija ob nakupu, sicer klub zadnjega
  kroga pred prvim posnetkom postave), sicer trenutnemu klubu; drugi klubi
  dobijo svojega igralca z nastopi, goli in asistencami, točke krogov se
  preračunajo. Najprej brez `pisi`, najprej neaktivne lige; ponoven zagon nič ne spremeni
- `fantasy_teams` → ekipe uporabnikov, `fantasy_roster` → izbrani igralci
  (`is_starter`, `is_captain`, `is_vice`, `bench_order`)
- `fantasy_teams.hisna` → **hišna ekipa**: sistemska ekipa SLFF, da slovaške
  lige z eno ekipo niso prazne (glej *Hišne ekipe* spodaj)
- `fantasy_chips` → vloženi pripomočki (`klop_plus`, `wildcard`), vsak enkrat na
  sezono: ključ je `(fantasy_team_id, chip, season)`, `season` vpiše sprožilec
  iz kroga. Vmesnik naj bere in briše pripomočke **s filtrom na sezono**.
- `fantasy_lineups` → posnetek postave po krogih; nastane s `zakleni_krog(krog)`
  oz. `zakleni_zapadle_kroge()` (za cron). Točkovanje bere posnetek, če obstaja.
- **Ekipe so zasebne** (migracija 20261012137100): sestavo ekipe (kader,
  posnetki, kapetan, klop, pripomočki) vidi le lastnik in admin, tudi po roku
  in tudi pri hišnih ekipah. RLS na `fantasy_roster`, `fantasy_lineups`,
  `fantasy_chips`; `tuja_postava` vrne vrstice le, če `sme_videti_ekipo(ekipa)`
  (lastnik, admin, servis). Javno ostane, kar sestave ne izda: lestvice (ime,
  lastnik, točke, mesto, točke kroga, število prestopov in kazen iz
  `fantasy_transfers`), mini lige in izbranost. Izbranost (`owners` v
  `player_standings`, `player_season_standings`) je NULL, dokler ima zadnji
  zaklenjeni krog lige manj kot **5 človeških ekip** — sicer seštevek izda
  ekipo. Stran `/team/:id` tujcu pokaže le ime, lastnika, točke in mesto;
  ime ekipe na lestvicah je povezava le pri svoji ekipi (`ImeEkipe.tsx`).
  Funkcija ali pogled, ki bere tuje posnetke, mora teči kot lastnik sheme
  (SECURITY DEFINER / pogled brez `security_invoker`) in sama paziti, kaj
  vrne.
- `rounds.lineups_locked_at` → dokončan zajem, tudi za neveljavne/prazne ekipe;
  odsotnost posnetka ni dovoljenje za poznejši zajem. `fantasy_teams.roster_updated_at`
  beleži čas shranjevanja. `shrani_ekipo` pred spremembo zajame zapadle kroge;
  shranjevanje, zaklep in urejanje pripomočkov si delijo transakcijski zaklep lige.
- `rounds` → krogi sezone, `matches` → tekme (z izvorom `zapisnik_id`).
  `matches.kontumacija` = tekma ni bila odigrana, izid je dodeljen in
  zapisnika ne bo; borza in preverba nanjo ne čakata. Označi jo uvoz razporeda:
  Sportnet `contumation`; stari CMS izid brez polčasa `3 : 0()` ali `(u.d.)`
  (Celje); Maribor izid brez polčasa **in** brez kraja (s krajem je zelena
  miza z zapisnikom); Ptuj, Murska Sobota, Lendava prazna kartica 3:0 brez
  sodnika in postav na strani zapisnikov kroga (`vir.kontumacije`). Pri Novi
  Gorici in NZS primera še nismo videli — tam admin z
  `update matches set kontumacija = true where id = …`
- `matches.statistics_status` → `available` za običajne zapise;
  `unavailable_historical` samo za izrecno odobrene identitete iz
  `scripts/policies/historical-statistics-exclusions.json`. Uradni izid
  ostane, `imported_at` je NULL, nastopi in goli so prepovedani.
  `statistics_reason` opiše pregledano vrzel. Zasebna shema
  `private_historical_statistics` veže politiko, SHA izvornega dokumenta,
  domači/gostujoči klub in krog; servisne namestitve zahtevajo READ COMMITTED
  in zaklenejo preverjene identitete. Neposredna aktivacija ne more obiti
  zasebne odobritve. `match_assist_status` za te tekme vrne neznane
  posamezne števce kot NULL in onemogoči glasovanje o asistencah.
  `sezone.statistics_complete_matches` / `statistics_unavailable_matches`
  razkrijeta pokritost; cene in točke ostanejo izračunane iz nastopov.
- `matches.vir_brez_izida` → vir ob zadnjem uvozu razporeda za to minulo,
  neuvoženo tekmo ni kazal izida: zveza jo je prestavila brez novega datuma
  (Bled Bohinj : Sava Kranj, 4. 10. 2026). Piše jo uvoz razporeda iz
  `odigrana`, ki ga dajo razčlenjevalniki starega CMS-a (Kranj, Ljubljana,
  Celje), hns, sportnet, mlsz, facr, fsb in frf (`oznakaBrezIzida` v `razpored.mjs`);
  ostali viri ga nimajo in tekme ostanejo neoznačene. Preverba podatkov takih
  tekem ne javi kot `tekma-ni-uvozena`, šele po 30 dneh kot `tekma-brez-izida`
  (človek odloči: kontumacija ali izbris). Nov vir naj tekmi da `odigrana`
  (ali ima vir izid), kadar ga razpored pozna.
- Omrežje: uvozi berejo prek `prenesiSPonovitvami` (`scripts/prenos.mjs`) —
  ponovi omrežne napake, 5xx in 429 (2 s, 6 s, 15 s), 4xx nikoli. Nov prenos
  v uvozni skripti naj gre skozenj, ne mimo z golim `fetch`. Vir, katerega
  strežnik ob preobremenitvi vrne 200 z obvestilom namesto strani, naj ima
  `zaPredpomnilnik(besedilo, datoteka)` (uvoz zapisnikov in razporeda tako
  stran ne shranita in shranjene ne bereta; mlsz, mfa in razpored oefb)
- Baza: odjemalec Supabase v nočni verigi (uvoz razporeda, delegiranja,
  zapisnikov, registracij, lažni vratarji, ugibanje pozicij) ima
  `global.fetch: fetchZaBazo()` (`scripts/prenos.mjs`): "fetch failed",
  Cloudflare 520 in PostgREST 503 so ligo podrli zaradi ene tekme (AT,
  11.–14. 10. 2026). Ponovi (2, 5, 15, 30 s) branje, PATCH/PUT/DELETE, upsert
  in `zamenjaj_nastope_tekme`; navaden INSERT in druge RPC le, ko zahtevek
  baze zagotovo ni dosegel (ECONNREFUSED, DNS, Cloudflare 521–523). Nov
  idempotenten RPC, ki ga uvoz kliče, dodaj v `PONOVLJIVI_RPC`
- Nastope tekme (in spremenjene gole) uvoz zamenja s
  `zamenjaj_nastope_tekme(tekma, nastopi, goli)` v eni transakciji (servisna,
  migracija 20261013181100). Prej sta bila izbris in vstavljanje dva zahtevka
  in padec omrežja vmes je živo tekmo pustil brez nastopov (tekma 148981,
  12. 10. 2026)
- borza (`preracunaj_cene`, nočno `uveljavi_zapadle_cene`) premakne ceno po
  točkah kroga (+0.1 na dve točki nad osnovnima dvema, največ +1.0; forma
  treh krogov je spodnja meja), odsotnost pa kaznuje šele drugi zaporedni krog.
  Cena se giblje v razponu 4.0–14.0 (`meje_borze()`) in od izhodiščne
  `value_start` ni omejena — kdor igra dobro vso sezono, lahko pride do vrha.
  Cron vsak dan znova obračuna odigrane kroge zadnjih 14 dni, zato sprememba
  pravil **ne sme seči nazaj**: `rounds.borza_po_starem` zapre kroge, odigrane
  pred zadnjo spremembo (migracija 20260924100000). Ob naslednji spremembi
  pravil jih zapri enako. Kadar se spremenijo le meje cene, krog ne zapri,
  ampak ga označi, da ga borza obračuna po starih mejah — tako je
  `rounds.borza_z_odmikom` (20260925100000) ohranil odmik 3.0 od izhodiščne
  za kroge, odigrane pred ukinitvijo, in igralci, ki čakajo na zapisnik,
  premika ne izgubijo.
- `appearances` → nastop igralca na tekmi (minute, goli, kartoni, prejeti goli)
- `goals` → posamezen gol; nosi tudi potrjeno asistenco
- `assist_votes`, `position_votes` → glasovanje skupnosti (prag v `settings`)
- `player_scores` → točke igralca na krog (iz pogleda `appearance_points`);
  posnetek se osveži sam, ko se spremeni pozicija igralca ali potrdi asistenca
  — pozicija odloča, koliko je vreden gol, zato bi brez tega lestvica kazala
  stanje ob uvozu, ko je pozicijo poznal samo vratar
- `rounds.pravila_tockovanja` → različica pravil, po kateri se krog točkuje
  (`tocke_za_nastop(…, zmaga, pravila)`, migracija 20260928100000). Nočni
  preračun bi sicer spremembo pravil prenesel na že podeljene točke. Različica
  2: vratar čista mreža +5, zmaga +2 za vratarja in branilca, prejeti goli le
  med igranjem (`appearance_points.prejeti_na_igriscu`; `goals_conceded` in
  `clean_sheet` ostaneta izid cele tekme). Ob novi spremembi dodaj različico
  3, zapri začete kroge in jo prenesi v `src/lib/tockovanje.ts`
- `ucinkovita_postava(ekipa, krog)` → postava po samodejnih menjavah z množitelji;
  iz nje računa `fantasy_round_points_izracun`. Izid hrani tabela `tocke_krogov`
  in `fantasy_round_points` (ter z njim obe lestvici) bere **tabelo**, ker je
  sprotni izračun anonimnim obiskovalcem presegel 3 s. Tabelo po krogih osvežijo
  sprožilci na `player_scores`, `fantasy_lineups`, `fantasy_transfers`,
  `fantasy_chips`, `appearances` in `matches`; ponoči jo cron obnovi vso. Nov
  vhod v izračun **potrebuje svoj sprožilec**, sicer lestvica zaostaja do noči
  (`npm run preizkus-tock-krogov` primerja tabelo z izračunom).
- `tedenski_pregled_mini_lige(liga, krog)` → zgodbe končanega kroga mini lige
  (točke kroga, premiki na lestvici mini lige, kapetan, klop) kot jsonb;
  besedila sestavi `src/lib/miniLige.ts` (`zgodbeKroga`). Krog je **številka**
  tekoče sezone, ker mini liga gre čez lige; končane kroge ekip da
  `koncani_krogi_mini_lige`. Tujec mini lige (`sem_v_mini_ligi`) dobi `null`.
  Pregled teče kot lastnik sheme (bere tuje posnetke za točke klopi), a
  kapetana izbere le med ekipami, ki jih klicatelj sme videti (svojo), aduta
  ne vrne več (izdal bi, česa tekmeci nimajo); vrstice nosijo `lastnik_id`
- **Nagrade tedenskega pregleda** (migracija 20261017233300). Pregled vrne še
  `saljive` (`mini_lige.saljive_nagrade`), `mladinska` (v mini ligi je ekipa
  mladinske lige ali je javna v njej, `je_mladinski_slug`) in `zadnji_prej`
  (ekipe z najmanj točkami prejšnjega končanega kroga). Nagrade izbere
  `zgodbeKroga` (`src/lib/miniLige.ts`), sliko 1080×1080 (klepet) in 1080×1920
  (zgodba) za vsako nagrado in za cel krog nariše `SlikaNagrade.tsx`
  (postavitev `src/lib/slikaNagrade.ts`, poze maskote `public/logo/maskota/`,
  risar `node scripts/maskota-poze.mjs`). **Pravila prijaznosti — veljajo za
  vsako novo nagrado, niz ali sliko:**
  - Šala gre le na račun fantasy ekipe v mini ligi (ljudi, ki so se vpisali
    skupaj), nikoli resničnega igralca. Igralec se pojavi samo s pohvalo
    (Kapetan kroga, Skriti adut); nobena nagrada ne smeši njegove igre,
    telesa, let ali napak.
  - Brez besed o pameti, telesu, denarju, družini. Žrtev šale je maskota
    (brkač joka v žlico, padalo se mu ne odpre), ne človek; "Selektor, kje si
    bil?" je meja.
  - Šaljive nagrade (`SALJIVE_ZGODBE`: Lesena žlica, Prosti pad, Zlato na
    klopi) le v mini ligi z vsaj 4 ekipami (`NAJMANJ_EKIP_ZA_SALE`) — v manjši
    bi vedno zadele istega.
  - Lesena žlica nikoli isti ekipi dva kroga zapored: kdor je v `zadnji_prej`,
    dobi namesto nje "Naslednji krog je tvoj" (`spodbuda`).
  - Lastnik mini lige šaljive nagrade izklopi (Mini lige → Šaljive nagrade);
    pišeta le on in `nastavi_saljive_nagrade` (neposredne pravice na stolpec ni,
    preizkus v `supabase/tests/varnost.sql`). Pohvale ostanejo.
  - Deli vedno človek: predogled, nato sistemski list ali prenos, pri šaljivi
    nagradi z opombo "Šala je smešna, ko se smeje tudi …". Samodejne objave
    (`scripts/objave.mjs`) pregleda mini lig ne berejo (smoke to preveri).
  - Mladim nikoli alkohola: v mladinski mini ligi so poze s pivom zamenjane
    z `-mladi` (sok, `POZE_S_PIVOM`); nobena nova poza nima cigarete, zato
    slike nagrad nimajo grba SLFF (na njem maskota kadi in pije), ampak napis.
- **Javne mini lige** (migracija 20261012139100): `mini_lige.javna`, `opis`
  (≤ 120), `competition_id` (liga, v kateri je javna; mini liga sama še vedno
  gre čez lige) in `javna_zaklenjena_at` (admin jo je skril, lastnik je ne more
  spet objaviti). Javnost nastavi le ustvarjalec prek
  `nastavi_javnost_mini_lige` (potrebuje ekipo v tej ligi); neposredno sme
  lastnik spremeniti le `name` (stolpčna pravica). Sprožilec `varuj_mini_ligo`
  ime in opis javne lige preveri s `prepovedano_besedilo` (isto pravilo kot
  prikazno ime: znaki, rezervirane besede, žaljivke; JS `prepovedanoBesedilo`)
  in omeji na 3 javne lige istega lastnika v ligi. Branje gre le prek
  SECURITY DEFINER RPC (tabela nosi kodo, RLS ostane za člane):
  `javne_mini_lige(liga, iskanje)` (anon, največ 100, po številu ekip),
  `mini_liga_glava(id)` in `lestvica_javne_mini_lige(id)` (javna vsem,
  zasebna članom; le lestvica, nikoli postave ali koda). Pridružitev brez kode
  `pridruzi_javni_mini_ligi(liga, ekipa)`: liga javna, ekipa svoja in iz lige
  mini lige. Prijave v `prijave_mini_lig` (`prijavi_mini_ligo`, ena odprta na
  uporabnika in ligo, največ 10 odprtih); Administracija → Prijave mini lig
  (`admin_prijave_mini_lig`, `admin_odloci_mini_ligo`: skrij in zakleni ali
  zavrni). Stran `/mini-leagues/:id` (`JavnaMiniLiga.tsx`, noindex)
- `player_standings` → lestvica igralcev (točke, forma, na tekmo, izbranost)
- `statistika_igralcev` → statistika igralca po ligi in sezoni (nastopi,
  minute, goli, kartoni, čiste mreže, točke, asistence, zadnji krog, forma).
  `player_season_stats`, `player_overview` in `player_season_standings` jo
  berejo namesto sprotnega seštevanja vseh nastopov (prej 0,7–2,5 s na klic,
  tri četrtine časa baze; migracija 20261002120000). Izračun je
  `player_season_stats_izracun`; tabelo osvežijo sprožilci na `appearances`,
  `player_scores`, `goals`, `matches` (izid) in `players` (pozicija), ponoči
  jo cron obnovi vso. Nov vhod v izračun **potrebuje svoj sprožilec**
  (`npm run preizkus-statistike` primerja tabelo z izračunom)
- `isci_igralce(iskanje, omejitev)` → igralci **vseh aktivnih lig** po imenu
  (javna, anon): id, ime, klub, liga (šifra, kratko ime, država), pozicija,
  cena, `podobno`. Brez šumnikov, vrstni red besed poljuben, od treh znakov;
  najprej natančno (vsaka beseda v imenu), šele brez zadetka podobnost
  (pg_trgm `%` in `<%`, kazalo `players_ime_brez_sumnikov_trgm`). Brez
  anonimiziranih in neaktivnih lig. Bere jo izbirnik lige (razdelek Igralci
  pod ligami, izbira preklopi ligo in odpre `/player/<id>?t=<liga>`) in stran
  Igralci, ko iskanje v ligi ne najde nikogar ("Najdeno v drugih ligah").
  Odjemalec: `src/lib/iskanjeIgralcev.ts`. V produkciji (125k igralcev)
  najslabši primer "ric" ~210 ms, običajno 1–40 ms
- `vrh_drzave(drzava, koliko)` → vrh igralcev tekoče sezone vseh aktivnih lig
  države (točke brez asistenc, goli, čiste mreže vratarjev) za zavihek Igralci na
  strani Slovenija. Bere tabele (`player_scores`, `appearances`, `goals`), ne
  `appearance_points`: prek pogleda je poizvedba trajala 10 s, iz tabel ~150 ms
- `navijaci_klubov(liga)` → klubi lige po povprečju točk navijačev (zavihek
  Navijači klubov na Lestvici, `#fans`; razdelek na strani kluba). Navijač je
  `profiles.navijam_team_id` — en klub na človeka, ne po ligah (klubi so
  skupni); šteje le v ligi, kjer klub igra. Navijanje **ni** poznavalec
  (`insider_team_id`, trikratna utež glasu za pozicije), zato povabilo piše
  samo `navijam_team_id`; ob uvedbi je dobil klub vsak poznavalec. Mesto dobi klub z vsaj `min_navijacev_kluba` navijači
  (privzeto 3). Točke bere iz `fantasy_round_points` (tabela), ne računa sproti
- stran Rezultati (`/results`, `/match/:id`) sestavi postavi tekme iz
  `appearances` + `appearance_points`; nove sheme ne potrebuje
- `lestvica_lige(liga, sezona)` → **prava** lestvica lige (stran `/table`, meni
  "Lestvica lige"; `/standings` je fantasy). Iz `matches`: odigrana = ima
  zapisnik ali je kontumacija (z dodeljenim izidom); 3/1/0, točke → gol razlika
  → dani goli → ime. Medsebojnih tekem in odvzetih točk ne pozna — stran to
  pove kot približek. Privzeta sezona je zadnja z odigrano tekmo. Pod njo
  strelci iz `player_season_standings`
- **Zemljevid strani**: `public/sitemap.xml` ima le stalne poti brez lige (`/`, `/table` … privzete lige so v `sitemap-clani.xml`); po ligah ga
  ponoči sestavi `scripts/sitemap.mjs` (delovni tok `sitemap.yml`, anon ključ:
  strani lige s `?t=` — privzeta liga `clani` brez njega, kot kanonični —,
  klubi, igralci z minutami letos ali lani, odigrane tekme, v
  `sitemap-drzave.xml` še vstopne strani držav z aktivno ligo) in ga z rsync prenese v `/srv/slff/sitemap/` na strežniku — ne v
  repozitorij in ne v `dist/`, ker objava zamenja mapo izdaje. Caddy streže
  `/sitemap-index.xml` in `/sitemap-*.xml` iz te mape. Nova javna stran lige
  sodi tudi v `STRANI_LIGE` v skripti. *Uvoz Avstrije (vrsta)* ga po vklopu
  lige zažene takoj, ne šele ponoči
- `match_assist_status` → odigrane tekme s številom golov brez asistence
  (stran Asistence izbira po korakih: krog → tekma → gol)
- `naslednji_krog` → prvi krog, ki se še ni zaklenil (rok na strani Moja ekipa)
- `stevilo_ekip_lig` → število ekip po ligah (s hišnimi) za okno prvega
  obiska; `security_invoker`, le branje. Prej je odjemalec prenesel vse ekipe
- `stanje_mojih_ekip()` → za prijavljenega vse njegove ekipe v aktivnih ligah:
  veljavnost, razlog, ali bo ob roku brez točk (prvi fantasy krog se zaklene
  tudi nepopoln) in igralci s poročilom o poškodbi/odsotnosti. Bere ga pas
  `OpozoriloEkipe` (rdeče napake, rumena opozorila, ki se dajo skriti);
  besedila sestavi `src/lib/stanjeEkip.ts`
- `lijak_dnevno` → lijak začetka: dnevni seštevki korakov `prazna_ekipa`,
  `predlog` ("Sestavi mi ekipo"), `prva_shramba`, `sestavi_iz_maila` (povezava
  `/my-team?sestavi=1` sestavi ekipo ob odprtju). Le števci, brez uporabnika;
  piše `zabelezi_korak`, bere admin. Ime ekipe se predlaga ("FC Ime") in se ga
  da spremeniti kadarkoli (od 6. 10. 2026; prej je bilo po prvi shrambi fiksno).
  `kartica_deljena`: kartico igralca (`KarticaIgralca.tsx`) je kdo delil,
  prenesel ali delil njeno povezavo (`?src=kartica`). Kartice ni v mladinskih
  ligah (`jeMladinskiSlug`) in pri anonimiziranih igralcih; potrjeni lastnik
  profila vidi "Deli svojo kartico"
- **Sestava brez prijave** (od 15. 10. 2026): neprijavljen na `/my-team`
  sestavlja **osnutek** v `localStorage` (`slff-osnutek-<liga>`,
  `src/lib/osnutek.ts`; ob branju preverjen proti trgu). Shrani ga pelje na
  `/login?…&nacin=registracija`; po prijavi osnutek napolni le prazno ekipo
  (shranjen kader ima prednost, osnutek se pobriše), po shrambi izgine.
  Koraka lijaka `osnutek_brez_prijave` in `osnutek_shranjen`
- `obiski_dnevno` → obiski strani: dnevni seštevki po strani in starosti
  računa (`nov` = registriran v zadnjih 7 dneh, `star`, `neprijavljen`).
  Odgovarja na "kam gre tisti, ki ekipe ne sestavi" — lijak sam tega ne pove.
  Piše `zabelezi_obisk(stran)`, bere admin. Šteje se **ena stran na sejo na
  dan** (doseg, ne ogledi); ime strani določi `imeStrani()` v
  `src/lib/obiski.ts`, dinamični deli poti (id igralca, koda mini lige)
  odpadejo. Starost računa izračuna baza iz `auth.users.created_at`, zato je
  odjemalec ne more lagati in v tabeli kljub temu ni uporabnika ne naprave.
  **Nova stran se ne šteje sama**: dodaj jo v `PO_POTI`/`PO_PREDPONI` in v
  seznam v `zabelezi_obisk()`, sicer se zapis tiho zavrže. Oboje skupaj kaže
  razdelek *Kje ljudje obtičijo* v adminu (`src/components/admin/Lijak.tsx`)
- `trgovine_dnevno` (trgovina `ios`/`android`, dan, `skupaj`, `novi`) in
  `trgovine_stanje` (zadnje stanje različice iOS) → namestitve aplikacije.
  Piše le delovni tok *Trgovine* (`scripts/trgovine.mjs`, vsak dan 07:30 UTC,
  servisni ključ; RLS brez pravic za anon/authenticated). iOS: dnevna
  prodajna poročila ASC, zadnjih 8 dni znova; Android: vse mesečne datoteke
  `stats/installs/` v vedru Play. Discord javi vsak nov mejnik po 10
  namestitev (nad `trgovine_stanje.mejnik`, najvišjim že javljenim, zato
  padec seštevka ne javi znova) in spremembo stanja iOS. `--suho` ne piše in
  ne javlja
- `admin_rast(od)` → po dnevih (ljubljanski dan): novi in skupni uporabniki
  (kot `skupaj_uporabnikov()`, brez hišnega profila), nove ne-hišne ekipe,
  `obiskovalcev` (najbolj obiskana stran dneva iz `obiski_dnevno`, spodnja
  meja sej) in namestitve; plus `stanje` trgovin. Le admin. Razdelek *Rast*
  v adminu (`src/components/admin/Rast.tsx`)
- **Statistika obiska** je Umami na strežniku (`src/lib/analitika.ts`, `stats.slff.eu`, nastavitev v
  `docs/migracija-hetzner.md` 6c): brez piškotkov, ogledi strani in nekaj dogodkov
  (`dogodek('ime', {…})`). Vsak korak `zabeleziKorak` gre tudi tja. Nov dogodek naj nima
  podatkov o uporabniku; parametri iz naslova se počistijo (ostanejo `t`, `utm_*`, `src`)
- `push_tokens` → žeton FCM naprave mobilne aplikacije ali brskalnika
  (`platforma` `web`: Firebase JS, spletna aplikacija "SLFF web" v projektu
  slff-cb58e, privzeti ključ VAPID, obvestilo prikaže `public/obvestila-sw.js`;
  Safari na iPhonu le v aplikaciji na zaslonu) (ključ je žeton, ob
  prijavi drugega uporabnika na isti napravi se preseli). Vpiše ga le
  `shrani_push_zeton`, bere servis: `posli-opomnik` pošlje isto sporočilo še
  kot obvestilo (`push.ts`, skrivnost `FIREBASE_SERVICE_ACCOUNT`). Kanala sta
  neodvisna: pošta gre, če ni `profiles.brez_opomnikov`, push, če ni
  `profiles.brez_push` (oboje stran `/reminders`, naslov "Obvestila");
  kandidati vrnejo `email_vklop`/`push_vklop`, `email_log.kanal` pove, kaj je
  prišlo. Za dovoljenje vpraša prva shramba ekipe, stikalo na tej strani in pas
  po prijavi v aplikaciji ali brskalniku (`PotisnaObvestila.tsx`), dokler
  dovoljenje ni odločeno in `brez_push` ni vklopljen; "Zapri" ga skrije za teden
- `kandidati_za_dobrodoslico(najvec)` → dan po registraciji mail in push
  "sestavi ekipo" (`/my-team?sestavi=1`) vsem brez (neprazne) ekipe:
  registracija pred 20 urami do 7 dni, potrjen naslov, enkrat na človeka
  (`email_log` vrsta `dobrodoslica`, neuspela največ trikrat). Jezik iz
  registracije, sicer država prve ekipe ali kluba navijanja, sicer angleščina
  (Google jezika ne pove; `useAuth` ga ob prvi seji zapiše iz vmesnika). Teče
  vsako uro v `opozorila.yml` (`VRSTA=dobrodoslica`, največ 60 na zagon)
- `kandidati_za_opomnik_brez_ekipe(najvec)` → po dobrodošlici še do trije
  mail in push "ekipa te še čaka" (`/my-team?sestavi=1&t=<liga>`, vrsta
  `brez-ekipe`), tudi računom, starejšim od tedna: prvi ≥ 3 dni po
  registraciji, nato ≥ 7 dni narazen, največ trije uspešni (šest poskusov),
  ne v 2 dneh po dobrodošlici (v njenem oknu gre ta prva), konec ob neprazni
  ekipi. Liga: prazne ekipe, kluba navijanja ali države jezika (SI: člani),
  z rokom naslednjega kroga; brez nje mail lige ne imenuje. Najprej najnovejše
  registracije. Teče vsako uro v `opozorila.yml` (`VRSTA=brez-ekipe`, 60 na
  zagon); preizkus `npm run preizkus-brez-ekipe`
- `kandidati_za_push_opomnik(liga)` → samo push "še nimaš ekipe": kdor ima
  napravo in v ligi nima ekipe (ali ima prazno; brez ekipe šteje domača liga
  kot pri opomniku), 24 ur pred rokom, enkrat na krog (`email_log` vrsta
  `opomnik-push`). Teče vsako uro v `opozorila.yml` (`VRSTA=opomnik-push`)
- `javni_profil(id)` → javna stran profila `/u/:id` (SECURITY DEFINER, le
  javna polja): ime, avatar, član od, navijam, ekipe v aktivnih ligah z mestom
  na lestvici lige, dosežki (sezone, krogi, najboljši krog) in mini lige, v
  katerih je tudi gledalec (`sem_v_mini_ligi`; mini lige so zasebne).
  `profiles.javni_profil = false` pokaže drugim le ime; izbrisan profil in
  sistemski lastnik hišnih ekip vrneta NULL. Lestvični pogledi
  (`fantasy_team_standings`, `fantasy_round_standings`, `lestvica_drzavna`,
  `mini_liga_lestvica`) imajo na koncu `owner_id` (pri hišnih NULL), da ime
  lastnika vodi na profil (`ImeLastnika.tsx`), ime ekipe pa na ekipo le pri
  svoji (`ImeEkipe.tsx`, ekipe so zasebne). `isci_klube(iskanje)` je
  izbirnik kluba (navijam) čez klube aktivnih lig
- `izbrisi_moj_racun()` → uporabnik izbriše svoj račun (stran `/account`,
  zahteva obeh trgovin); kaskada odnese profil, ekipe, glasove in mini lige
- `players.anonimiziran_at` → igralcu je ime skrito (GDPR, migracija
  20261009180000, obvestilo po čl. 14 na strani `/legal`). `full_name` in
  `last_name` postaneta `#<id>`; `first_name`, `reg_st` (javna šifra osebe
  pri viru, z njo bi se ime dalo poiskati), `nzs_*` in poročila o poškodbah
  gredo proč. Statistika, točke in cena ostanejo. Vse strani berejo ime iz
  `players`, zato anonimizacija velja povsod.
  `anonimiziraj_igralca(id, razlog)` je servisna. Ugovor (igralec ali zveza,
  info@slff.eu, v 14 dneh) admin vnese v Administracija → Igralec (iskanje
  čez vse lige, tudi po id-ju): `admin_ista_oseba(id)` našteje druge vrstice
  iste osebe v isti državi, `admin_anonimiziraj_igralca(ids[])` anonimizira
  izbrane in **vse z isto šifro** v državi; soimenjake brez šifre admin
  odkljuka ročno. `anonimiziran_razlog`: `ugovor` je dokončen; `neaktiven`
  nastavi nočni cron `anonimiziraj_neaktivne()` (04:30, ne 03:30 zaradi
  `uveljavi-cene`) **le v Avstriji** (obljuba ÖFB), neaktivnemu igralcu brez
  nastopa 18 mesecev, ki ni v nobenem kadru.
  **Uvoz imena in šifre nikoli ne povozi.** Anonimiziranega igralca najde po
  zgoščenih ključih `sha256("<country_id>|<ime>")` in
  `sha256("<country_id>|reg|<reg_st>")` v zaprti tabeli
  `anonimizirani_igralci` (RLS brez pravic, ker je `players` javen); nov
  igralec, ki se ujema s ključem igralca z ugovorom, nastane že anonimiziran.
  Letošnji nastop vrne ime (in šifro) le `neaktiven` igralcu, ključe pobriše
  šele po uspešni posodobitvi. `imeHash`/`regHash` v
  `scripts/anonimizacija.mjs` morata ostati enaka SQL
  `anonimizacijski_kljuc` (smoke in `test:varnost`)
- **Scout: ugovor in privolitev** (migracije 20261016140100, 20261016160100,
  20261017170100, ki je odstranila javni `players.scout_skrit`).
  Ugovor je v zaprti `scout.ugovori` (zgoščena ključa država + ime in država +
  šifra, kot `anonimizirani_igralci`; v javnem `players` bi bil seznam
  ugovornikov javen): stroj izloči vso osebo, tudi soimenjaka v državi in ob
  poznejših uvozih, fantasy igra ostane. Vpiše ga lastnik potrjenega profila
  (`scout_ugovor(glavni, true)`; preklic z `false` pobriše le ključe njegovih
  vrstic, soimenjak z lastnim ugovorom ostane skrit) ali admin po mailu na
  info@ (`admin_scout_skrij(ids[])`). Privolitev (odprt za prestop, letnica,
  s katero je polnoleten vse leto, tj. `<= letos - 19`, regije =
  `federations` države, stik) je v zaprti `scout.privolitve` (ključ glavna
  vrstica), **ne** v javnem `profil_igralca`; piše `scout_shrani_privolitev`,
  briše `scout_preklici_privolitev`, lastnikov ugovor in
  `prevzem_odstrani_predstavitev` (preklic profila, anonimizacija, izbris
  računa); bere `scout_moj_profil` (le lastnik). Mladinca (ključi katerekoli
  mladinske vrstice v državi, vse sezone) potrjena polnoletna letnica vrne v
  izračun, a le osebo prijaviteljevih vrstic (`scout.odrasle_vrstice()`).
  Shema `scout` je zaprta (brez pravic za `anon`/`authenticated`,
  RLS s politiko le za vlogo `scout_stroj`); piše jo delavec `slff-scout`,
  `scout.drzave` pove, katere države so odprte. Podrobnosti: `docs/scout.md`
- **Scout: klubi** (migracije 20261017140100–140400, `docs/scout.md` *Klubi*):
  `scout.narocnine` (klub, preizkus ali Klub, `velja_do`, Stripe,
  `prejsnja_subscription_id` za ponovljen preklic zamenjane naročnine),
  `scout.sedezi` (do 3 uradni računi kluba), `scout.dnevnik` (vsak klic s
  podatki igralcev, 12 mesecev), `scout.opazovani` (do 30). Brskalnik bere le
  prek `scout_*` RPC, ki preverijo sedež, naročnino, državo in dnevno mejo in
  berejo le zadnji objavljeni model. Plačila: `scout-placilo` in veja
  `app=slff-scout` v `stripe-webhook`; **preklic naročnine mora biti vedno
  mogoč** (`scout_portal_kupec`: plačnik ali kateri koli uradni račun kluba).
- **Prevzem profila igralca** ("To sem jaz", migracija 20261012091100):
  `zahtevki_igralca` (en potrjen na igralca IN na uporabnika, en odprt na
  uporabnika; delna unikatna kazala), piše le prek RPC `prevzemi_igralca`,
  `preklici_moj_zahtevek`, `odloci_zahtevek_klub`, `potrdi_soigralca`,
  `prevzem_odloci_z_zetonom`, `admin_odloci_zahtevek`. Potrdi: **poznavalec
  kluba** (`insider_team_id` + odobrena `poznavalec_prosnje` `klub` za ta klub
  in ligo, ali `insider_competition_id` lige; sam nastavljen klub ne šteje),
  **dva različna potrjena soigralca** istega kluba in lige, **klub po mailu**
  ali **admin**. **Vsak zahtevek najprej vidi admin** (Administracija →
  Prevzemi profilov: vsi čakajoči, spori, prijave; migracija 20261012141100).
  **Vrstni red čakajočih:** zadnji na novo kvalificirani prijatelj prestavi
  zahtevek na vrh; nato odločata čas zahtevka in id. Kvalifikacija zahteva
  registracijo prek povezave in obstoječo nehišno fantasy ekipo.
  `povabila.kvalificiran_at` hrani prvi čas strežnika na prijatelja; dodatna
  ali ponovno ustvarjena ekipa ga ne osveži, servisna menjava lastnika ga
  ne ustvari. Zasebni `vrsta_zahtevkov_igralca()` določa isti vrstni red za
  `moje_mesto_v_vrsti()` (le lastnikove vrstice) in admin. Prikaz števila
  pred prosilcem je `(mesto - 1) * 7`; baza in admin ostaneta neskalirana.
  Adminov pregled ima tri gumbe: *potrdi*, *pošlji klubu* in *zavrni*. *Pošlji klubu*
  pokliče funkcijo `posli-prevzem` z admin žetonom (`{zahtevek, na}`); žeton
  da `admin_prevzem_zeton_za_klub` (enkraten, 14 dni, v bazi le sha256,
  prejšnja povezava zahtevka poteče), naslov je vpisani ali prvi uporaben iz
  `klub_stik` (nov naslov gre v stike, mail v `klub_stik_posta`). Mail in stran
  `/claim` pokažeta ime **in e-naslov prosilca** (to piše v oknu "To sem jaz");
  samodejnega pošiljanja klubom ni. Nov zahtevek in prijava lažnega profila
  gresta takoj na Discord (sprožilec `trg_prevzem_na_discord`, webhook iz Vaulta,
  brez e-naslova). Preizkus brez kluba: servis
  `{"test_zahtevek", "test_na"}`. Zahtevek za že potrjenega ali čakajočega igralca je `spor`
  (odloči le admin). Mladinska liga (`je_mladinski_slug`: `mladinci`, `-u19`,
  `sml1/2`; isto v `src/lib/prevzem.ts`) zahteva potrdilo "vsaj 16 let"
  (`star_vsaj_16`), datuma rojstva ne zbiramo. **Ista oseba v več vrsticah**
  (člani in mladinci, druga liga, prestop) je ena: admin poveže vrstice v
  `povezani_igralci` (predlogi `admin_predlogi_povezav`: isto ime brez šumnikov
  ali šifra v državi), povezane kažejo isto značko in predstavitev.
  `profil_igralca` (ključ je glavna vrstica): vzdevek, opis, uporabniška imena
  omrežij, `fotografija` (pot v vedru `fotografije-igralcev`,
  `<igralec>/<ime>.webp` 256 px in `-64.webp`; izrez in pomanjšava v
  brskalniku). Fotografije na seznamih bere pogled `fotografije_igralcev` v
  enem zahtevku na stran (`useFotografije`, `FotoIgralca`, `Dres igralecId`).
  `skrij_moje_ime()` je le servisna (od 20261012145100 igralec imena ne skrije sam:
  v fantasy igri ga poznajo drugi; ugovor gre prek info@ in admina);
  anonimizacija vedno pobriše predstavitev. **Storage na strežniku** je
  `storage-api` z datotekami na disku (`/opt/supabase/volumes/storage`, brez
  MinIO), vklop, varnostna kopija in povrnitev v `docs/hetzner-shramba.md`.
  Vedro in pravila ustvari `prevzem_pripravi_shrambo()` šele, ko tabele
  `storage` obstajajo (storage-api jih ustvari sam ob zagonu) — po vklopu jo
  pokliči. SQL brisanje (`prevzem_odstrani_fotografije`) odstrani le vrstico,
  datoteka ostane na disku (osirotelo, ni javna; čiščenje v istem dokumentu).
- **Preverjeni igralci** (faza 1 brez plačil, migracija 20261012190100):
  potrjen igralec z veljavno pravico dobi modro kljukico ob imenu (stran
  igralca, Igralci, Klub, Ekipa, igrišča, tekma, iskanje lige; vzdevek na
  seznamih) in dodatke profila. **Stikalo** `preverjeni_racuni` v `settings`:
  0 izklopljeno (privzeto), 1 preizkus (admin in `testerji`), 2 v živo.
  Vsako branje gre skozi `vidi_preverjene()`; pri 0 ne vidi nihče ničesar,
  tudi lastnik ne (kot `sponzorji_vidni`). Admin → Igralci → *Preverjeni*:
  stikalo, preizkuševalci (`admin_nastavi_testerja`), dodelitev in odvzem.
  - `preverjeni_racuni` (pravica): `user_id`, `player_id` = glavna vrstica,
    `vir` `rocno`/`letna`/`dozivljenjska`, `status` `aktiven`/`preklican`/`potekel`,
    `velja_do` (null = brez roka), `star_vsaj_18` (CHECK: plačljiv vir zahteva
    true, ročni sme null), `stripe_customer_id`/`stripe_subscription_id` (prazna,
    za fazo 2). En aktiven na igralca. Zaprta tabela, piše le admin:
    `admin_dodeli_preverjen(igralec, 'rocno', velja_do)` (zahteva potrjen
    zahtevek, vzame njegovega uporabnika; plačljivih virov ne vpiše),
    `admin_odvzemi_preverjen(id)`, seznam `admin_preverjeni()`. Potek ne
    potrebuje crona: `je_preverjen` primerja `velja_do` s časom.
  - `je_preverjen(igralec)`: stikalo + potrjen zahtevek (tudi povezane
    vrstice) + aktivna, nepotekla pravica **istega uporabnika** + ime ni
    skrito. Seznami kličejo `preverjeni_igralci_za(ids[])` (id in vzdevek, do
    300 na klic) v enem zahtevku na stran (`usePreverjeni`, `ZnakPreverjen`,
    `src/lib/preverjeni.ts`), kot fotografije.
  - `profil_igralca_plus` (ključ glavna vrstica): opis do 500 (navadni opis
    160 ostane), `youtube`, `x`, `splet` (https, ≤ 200), `pasica`
    (`<glavni>/banner-<ime>.webp` v vedru `fotografije-igralcev`, 1200 × 400,
    ≤ 2 MB, izrez v brskalniku; nalaganje dovoli `prevzem_sme_pisati_foto` le
    preverjenemu), `barva` (ena od osmih), `tekma_id` (svoja tekma) ali
    `statistika` (ključ sezone), `sporocilo` do 140. Bere vsak le, če
    `je_preverjen`; piše lastnik, ki je preverjen. Sprožilec
    `varuj_profil_igralca_plus`: ročici (YouTube, X) gresta skozi strogo
    `prepovedano_besedilo`, opis, sporočilo in spletna stran skozi
    `prepovedane_besede` (po besedah: žaljivka je beseda ali začetek besede,
    rezervirana beseda — admin, slff, moderator … — le cela; ločila,
    številke, `/ @ # " %` so dovoljeni, prepovedani le kontrolni in nevidni
    znaki ter `< >`). Opis obdrži nove vrstice, največ dve zapored. Brisati
    svoje datoteke (tudi pasico po poteku) sme lastnik brez pravice
    (`prevzem_sme_brisati_foto`), nalagati pasico le preverjen.
  - Brisanje: `prevzem_odstrani_predstavitev` (preklic, anonimizacija, izbris
    računa prek sprožilca `prevzem_izbris_zahtevka`) pobriše predstavitev,
    dodatke in datoteke (pasica gre z mapo igralca) in aktivno pravico igralca
    postavi na `preklican`. Mesto (en aktiven na igralca) se tako sprosti za
    naslednjega lastnika; **isti uporabnik ob ponovnem prevzemu kljukice ne
    dobi sam** — potrebna je nova dodelitev (faza 2 plačano obnovi izrecno).
    `admin_dodeli_preverjen` prekliče aktivno pravico drugega uporabnika,
    `admin_preverjeni` pokaže aktivno pravico igralca ne glede na uporabnika
    (`aktivna`, `drug_uporabnik`). `user_id` je `on delete set null`: izbris
    računa pusti zgodovino (pomembno za plačila).
  - Lastnik potrjenega profila, ki ni preverjen, pri vklopljenem stikalu
    vidi nakup (spodaj); v aplikaciji je skrit (`jeNativno`, pravila trgovin).
  - **Faza 2: Stripe Checkout** (testni način, migracija 20261012210100).
    Kartica "Preveri profil": letno (9,99 €) ali za vedno (29 €), pri
    doživljenjski še "+ natisnjena značka" (5 €, poštnina 2 € SI / 4 € EU)
    z izbiro dostave "Slovenija / druga država EU" (seja dobi le to tarifo in
    le te države: SI ali EU-26) in imenom na znački (≤ 30,
    `prepovedane_besede`), obvezni potrditvi 18+ in soglasja o takojšnji
    zagotovitvi (izguba 14-dnevne pravice do odstopa); obe se shranita
    (`star_vsaj_18`, `odpoved_pravici`, CHECK za plačljiv vir). Gumb kliče
    funkcijo **`preverjen-placilo`** (JWT kupca): `checkout` →
    `preverjen_pripravi_nakup` z JWT kupca (stikalo, svoj potrjen profil prek
    `povezani_igralci`, ime ni skrito, ni že preverjen, ime na znački), cene po
    lookup_key (`slff_preverjen_letna`, `slff_preverjen_dozivljenjska`,
    `slff_znacka`), poštnina po metapodatku `kljuc` — id-jev Stripe v kodi ni.
    Checkout: `automatic_tax`, `billing_address_collection=required`, kupec iz
    prejšnje pravice ali `customer_email`, metapodatki `app=slff`, `user_id`,
    `player_id` (glavna), `vir`, `znacka`, `ime_na_znacki`, `dostava` tudi na
    naročnini/plačilu. Neznane napake baze funkcija vrne kot splošno
    "Plačila ni bilo mogoče začeti.". Povratek
    `SITE_URL/player/<id>?t=<liga>&placilo=uspeh|preklic`; ob `uspeh` kartica
    ~20 s sprašuje `je_preverjen` ("plačilo se še obdeluje", nato "plačilo
    prejeto"). **Preklic naročnine mora biti vedno mogoč**: `portal` vzame
    kupca iz `preverjen_moje_narocnine()` (lastne aktivne letne, ne glede na
    stikalo in profil); "Upravljaj naročnino" je na profilu in na `/account`
    (v aplikaciji le opomba "na slff.eu", brez povezave na nakup).
  - **`stripe-webhook`** (brez JWT): podpis `Stripe-Signature` (HMAC-SHA256
    `t.telo`, 5 minut, stalni čas; `podpis.ts`, preverja ga smoke). Dogodek
    se zapiše v `stripe_dogodki`; z `obdelano_at` se ne obdela znova, brez
    njega (napaka → 500) ga ponovitev obdela. Seje in naročnine štejejo le z
    `metadata.app = slff` (račun je skupen več znamkam); vračila in spori se
    iščejo **v bazi**: payment_intent, sicer račun → naročnina (stari API
    `charge.invoice`, basil `invoice_payments`); neznano → 200 in nič.
    Servisne funkcije (`service_role`):
    - `preverjen_iz_placila`: postavke seje najprej preveri webhook
      (lookup_key, en kos, `amount_subtotal` = cena × količina; sicer brez pravice in Discord),
      `znesek_pravice` se shrani. Seja enkrat (`stripe_checkout_id`, po
      zaklepu). Letna `velja_do` = konec obdobja + 3 dni milosti (obnova se
      plača nekaj ur po izteku), doživljenjska brez roka. Ročna ali tuja
      aktivna pravica pade. Profil ni več kupčev, ime skrito, dvojno plačilo
      ali izbrisan račun (`user_id` null) → vrstica `preklican`, izbrisan
      igralec → brez vrstice; vselej Discord "vrni denar" in takojšen preklic
      naročnine. Z značko vrstica v `narocila_znack`.
    - `preverjen_podaljsaj` (`invoice.paid`, `subscription.updated` active):
      rok le naprej; potekla vrstica iste naročnine oživi, če pravica spet
      lahko velja (`preverjen_lahko_velja`). Naša naročnina brez pravice
      (`brez_pravice`) → webhook jo prekliče in javi (varovalo).
    - `preverjen_narocnina_konec` (`deleted`, canceled, incomplete_expired →
      `potekel`). `past_due` in `unpaid` pustita pravico do roka;
      `cancel_at_period_end` do konca obdobja.
    - `preverjen_vracilo` (`charge.refunded`: znesek vrnjeno/plačano): polno
      vračilo, spor (`charge.dispute.created`) ali vračilo vsaj celotne cene
      doživljenjske → `preklican` (in značka); manjše pri odprtem naročilu →
      le značka; sicer le Discord. Postavke seje: `amount_subtotal` =
      cena × količina, `znesek_pravice` = `amount_total`.
    - `preverjen_spor_dobljen` (`charge.dispute.closed`, won): pravica se
      vrne, če profil še velja (zastarele aktivne vrstice najprej `potekel`,
      tudi pri oživitvi v `preverjen_podaljsaj`), sicer Discord.
  - **Ustavitev zaračunavanja.** Vsak prehod letne pravice z naročnino v
    `preklican` (preklic profila, anonimizacija, izbris računa, admin odvzem,
    dodelitev drugemu, sumljivo plačilo, vračilo, spor) sprožilec
    `preverjeni_oznaci_preklic` označi `stripe_preklic = 'caka'`.
    `stripe-webhook` čakajoče prekliče (`DELETE subscriptions/<id>`, nato
    `preverjen_preklic_opravljen`): po vsakem dogodku Stripe, ob
    `{"akcija":"preklici"}` z admin JWT (Administracija → Preverjeni po vsakem
    dejanju) ali servisnim ključem — delovni tok *Preverjeni: preklici
    naročnin* (`preverjeni-preklici.yml`, vsako uro; 404 pred objavo je le
    opozorilo; izpis le kode HTTP). Po dobljenem sporu naročnina ostane
    preklicana, letna velja do `velja_do` (`subscription.deleted` sami
    preklicane naročnine roka ne skrajša).
  - `narocila_znack`: ime, naslov (jsonb), poštnina, `za_tisk` →
    `natisnjeno` → `poslano` (`poslano_at`) ali `preklicano`; zaprta,
    `admin_narocila_znack`, `admin_nastavi_narocilo_znacke` (Administracija →
    Preverjeni → Naročila značk). Izbris računa ali anonimizacija naročila ne
    pobrišeta, `user_id` gre na null; 90 dni po pošiljanju ali preklicu ostane
    v naslovu le država (`preverjen_pocisti_naslove`, pg_cron 04:23), naročilu,
    ki obvisi v `za_tisk`/`natisnjeno`, pa 12 mesecev po naročilu (migracija
    20261012233100).
  - **Vklop testnega načina (lastnik):** na strežniku v `/opt/supabase/.env`
    `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`,
    `SITE_URL=https://slff.eu` (compose jih poda funkcijam; compose ročno),
    nato `scripts/hetzner/objavi-funkcije.sh preverjen-placilo` in
    `… stripe-webhook` (CI funkcij ne objavi). **Po objavi preveri, da je
    stripe-webhook dosegljiv brez JWT**: `curl -s -o /dev/null -w '%{http_code}'
    -X POST https://api.slff.eu/functions/v1/stripe-webhook -H
    'Stripe-Signature: t=1,v1=x' -d '{}'` mora vrniti 400 (podpis), ne 401.
    V Stripe (testni način) Webhooks → endpoint
    `https://api.slff.eu/functions/v1/stripe-webhook` z dogodki
    `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
    `invoice.paid`, `customer.subscription.updated`,
    `customer.subscription.deleted`, `charge.refunded`,
    `charge.dispute.created`, `charge.dispute.closed`; skrivnost podpisa na
    strežnik. Portal (Settings → Billing → Customer portal) vklopi preklic
    naročnine. Stripe Tax mora biti vklopljen (sicer `automatic_tax` seje
    zavrne). Testna kartica `4242 4242 4242 4242`, 3DS
    `4000 0027 6000 3184`, zavrnjena `4000 0000 0000 0002`. Stikalo 1 +
    preizkuševalec za preizkus.
  - **Faza 3: pogoji nakupa.** So razdelek `/legal#placljivo` ("Plačljive
    storitve: preverjeni igralci", ne svoja pot, zato brez sprememb Caddyja in
    zemljevida): prodajalec SPACE GUARDIAN d.o.o. (naslov, matična 9850538000,
    DDV SI42765153, info@slff.eu), ponudba in cene z DDV, Stripe, 18+, odpoved
    naročnine (ob koncu plačanega leta), izguba pravice do odstopa za digitalno
    vsebino (čl. 16(m)) in izjema za značko po meri (čl. 16(c)) ob ohranjenem
    jamstvu, prenehanje (preklic potrditve, skrito ime, izbris računa,
    chargeback), vračila (zloraba nič; naša napaka, zahteva zveze ali ukinitev:
    letna sorazmerno, za vedno vse v prvih 12 mesecih, nato sorazmerno do 5
    let; natisnjene značke in poštnine ob ukinitvi ne vračamo) in pritožbe
    (odgovor v 8 delovnih dneh, ne priznavamo izvajalca IRPS). Prodajalec je
    "vpisan v sodni register pri Okrožnem sodišču v Ljubljani". "Brez jamstva"
    velja le za brezplačno igro. Zasebnost pove, kaj hranimo o nakupu (10 let
    zapis, naslov 90 dni po pošiljanju ali preklicu, največ 12 mesecev), da
    plačila obdeluje Stripe in da izbris računa konča značko in naročnino brez
    vračila. Ključi `racun.pravno.*` v vseh 13 jezikih; sprememba pogojev =
    nov datum v `zadnjaSprememba`. Kartica nakupa ima pod potrditvama
    povezavo "Pogoji nakupa" (nov zavihek) in "Prodajalec: Space Guardian
    d.o.o."; Checkout ima nad gumbom opombo o takojšnji zagotovitvi
    (`custom_text.submit`, sl ali en po `jezik` iz vmesnika). Ista opomba z
    naslovom pogojev je **na računu** (trajni nosilec potrditve): pri enkratnem
    plačilu `invoice_creation` z `invoice_data.footer` (Stripe zaračuna
    Invoicing za račune po plačilu; račun sproži `invoice.paid` brez
    naročnine, ki ga webhook prezre), pri naročnini `subscription_data.description`
    (`invoice_creation` v načinu subscription ni dovoljen) — nogo računov
    naročnine da privzeta noga v Stripe (spodaj). **`STRIPE_TOS=1`**
    (env funkcij, compose) doda `consent_collection[terms_of_service]=required`;
    vklopi ga šele, ko je v Stripe Settings → Public details vpisan Terms of
    service URL `https://slff.eu/legal#placljivo`, sicer Stripe sejo zavrne.
    Strežnik HTML na strani igralca ob imenu izriše "✓ Preverjen igralec"
    (`preverjeni_igralci_za` z anon ključem, ki vrne kaj šele pri stikalu 2;
    napaka kljukico izpusti).
  - **Pred vklopom v živo (lastnik):** aktivacija računa Stripe v živem načinu
    s podatki Space Guardian (znamka SLFF, Public details: ime, podpora
    info@slff.eu, Terms of service URL zgoraj); katalog v živem načinu (CLI:
    cene z lookup_key `slff_preverjen_letna`, `slff_preverjen_dozivljenjska`,
    `slff_znacka`, poštnini z metapodatkom `kljuc` `postnina_si`/`postnina_eu`,
    davčna koda in `tax_behavior=inclusive`); Stripe Tax: registracija SI (in
    OSS za EU); e-poštna potrdila kupcem (Settings → Customer emails); živi
    webhook endpoint z istimi dogodki in portal; na strežniku `sk_live_…`,
    nov `whsec_…`, `STRIPE_TOS=1`, objava obeh funkcij; preizkus z eno pravo
    kartico in vračilom; šele nato stikalo `preverjeni_racuni = 2`. Še:
    - **Trajni nosilec**: Settings → Invoices → privzeta noga (Default footer)
      in potrdila kupcem (Customer emails: successful payments) s stavkom o
      odpovedi pravici in `https://slff.eu/legal#placljivo`; preveri na
      testnem računu enkratnega plačila in naročnine, da je stavek na obeh.
    - **Osnovni kapital** Space Guardian d.o.o. dopiši v `racun.pravno.prodajalec`
      (vseh 13 jezikov) — zdaj ga ni (TODO lastnik).
    - **Davčno potrjevanje računov (ZDavPR)**: spletna plačila s kartico so
      lahko zavezana davčno potrjenim računom (EOR/ZOI) — pred živim načinom
      potrdi z računovodjo, ali račun Stripe zadošča.
    - **Pravnik**: ali je značka digitalna vsebina (odpoved po čl. 16(m)) ali
      digitalna storitev (sorazmerno plačilo ob odstopu) — od tega je odvisno
      besedilo odpovedi.
    - **Portal v živem načinu**: preklic naročnine ob koncu obdobja (v
      testnem je tako nastavljen; ponovi v živem).
- **Uradne odsotnosti** (migracija 20261012135100): potrjeni igralec (lastnik
  potrjenega `zahtevki_igralca`, tudi za povezane vrstice) sam javi odsotnost
  (`objavi_uradno_odsotnost`: vrsta `poskodba`/`bolezen`/`dopust`/`kazen`/`drugo`,
  od, vrnitev ali neznano, opomba do 140 znakov) in jo zapre
  ("Spet sem nared", `zapri_uradno_odsotnost`, brez posledic). Naenkrat ena
  odprta na osebo. Tabela `uradne_odsotnosti` je zaprta (v njej je uporabnik);
  javno jo kaže pogled `uradne_odsotnosti_view` (brez uporabnika, `moje` za
  prijavljenega; profil, ki ni več potrjen, ne kaže ničesar). Na forumu
  Odsotnosti stoji z značko "Uradno: igralec sam" nad skupnostnimi poročili
  istega igralca (`zdruziZaForum` v `src/lib/uradneOdsotnosti.ts`), na strani
  igralca razdelek `UradnaOdsotnost.tsx` (lastnik vidi opomine in obrazec).
  **Preverba** `preveri_uradne_odsotnosti()` (servis) teče v poslu *skupno*
  delovnega toka *Uvoz zapisnikov* (`scripts/preveri-uradne-odsotnosti.mjs`,
  po združitvi duplikatov) in vsako uro prek pg_cron: če je igralec
  (katerakoli vrstica osebe) igral z minutami > 0 na tekmi z datumom v
  [od, vrnitev), po dnevu objave in pred dnem zaprtja, je odsotnost
  `ni_drzalo` (javno "Ni držalo: igral DD. MM.") in to je opomin osebi.
  Zapisnik pozna le datum, zato dan objave in dan zaprtja štejeta v korist
  igralca. Zaprte odsotnosti pregleduje še 60 dni (zapisnik lahko zamuja).
  Dva opomina v sezoni (`sezona_lige` lige vrstice, `uradne_odsotnosti_najvec()`)
  = do konca sezone brez uradnih odsotnosti; navadna poročila lahko piše še
  naprej. Nova sezona začne z nič. **Ni odbitka točk**: točke prihajajo le iz
  uradnih zapisnikov, zato odsotnost na točke in izbiro ekip ne vpliva.
  **Zamrznitev cene** (migracija 20261013233100, spec
  `docs/superpowers/specs/2026-10-13-zamrznitev-cene-design.md`): poškodba ali
  bolezen (ne dopust, kazen, drugo) zadrži padec borze "ni igral" (−0.1):
  `zamrznjena_odsotnost(player, round)` šteje kroge lige od dneva `od`, največ
  2, s potrditvijo klubskega računa (`klub_potrdi_odsotnost`,
  `klub_odsotnosti` v Urejanju kluba) 6, do vrnitve/zaprtja in še en krog.
  Dviga ne zadrži. `preracunaj_cene` zadržani padec zapiše v `zadrzani_padci`;
  ob "ni držalo" ga `preveri_uradne_odsotnosti` uveljavi (vsoto naenkrat, ne
  pod mejo borze, enkrat) — cena pade le na tisto, kar bi bila brez
  zamrznitve. Pogled ima `cena_zamrznjena` in `klub_potrdil`. Preizkus
  `npm run preizkus-zamrznitve` (tudi v CI). Anonimizacija vrstice jih
  izbriše (kot skupnostna poročila).
- `povzetek_rasti()` → ena vrstica številk (uporabniki, novi v 7 dneh, ekipe,
  aktivne lige, namestitve, kliki na "Časti pivo" skupaj in v 7 dneh), pod njo
  vrstica na državo (uporabniki z ekipo v ligi države in novi v 7 dneh, ekipe
  in nove, aktivne lige; država je država lige) in število uporabnikov brez
  ekipe — pod vsakim poročilom na Discord (mejnik uporabnikov,
  `scripts/trgovine.mjs`). Le servis
- **Želje lig** ("Moje lige ni? Povej nam", migracija 20261015120100):
  `zelje_lig` (država kot koda ali prosto ime, ime lige ≤ 120, po želji
  `competition_id` vpisane **neaktivne** lige, jezik vmesnika, `obvescen_at`).
  Zaprta tabela; piše le `zelim_ligo` (anon in prijavljeni): prijavljen brez
  e-naslova (pošta gre na račun), neprijavljen z e-naslovom; ista oseba in
  liga/besedilo = ena vrstica, 5 na dan na osebo, 300 na dan vseh
  neprijavljenih; besedilo skozi `prepovedane_besede`. Okno `ZelimLigo.tsx`
  (izbirnik lige, okno prvega obiska, vstop države) predlaga neaktivne lige
  države iz `competitions_view`. Admin: Administracija → Želje lig
  (`admin_zelje_lig` po ligi ali besedilu, `admin_povezi_zelje(ids, šifra)`
  poveže besedilo z ligo). Ko je liga aktivna, gre vsaki želji en mail
  (`opozorila.yml`, `VRSTA=liga-zivi` → `posli-opomnik`,
  `kandidati_za_zivo_ligo`, `zelja_lige_poslana`: uspeh pobriše e-naslov,
  neuspeh največ trikrat). Neobveščene z e-naslovom pg_cron po 12 mesecih
  izbriše
- **Pivski zid** (`/beers`, migracija 20261013150100): `piva` hrani nakupe
  Buy Me a Coffee (funkcija `bmc-pivo`, servisni ključ, `zunanji_id` = BMC
  `data.id`, idempotentno; vračilo postavi `vracilo`, `live_mode = false` je
  `test`) in ročne vnose admina (`vir = 'rocno'`). **Zneska, valute in
  e-naslova ne hranimo.** Sporočilo počisti sprožilec (`ocisti_sporocilo_piva`:
  `<br>` → nova vrstica, oznake proč, entitete, 500 znakov; isto pravilo
  `ocistiSporocilo` v `bmc-pivo/sporocilo.ts` za Discord), skrito na BMC se ne
  shrani. Tabela je zaprta; javno le `javna_piva()` (ime ali null za
  anonimne/"Someone", piva, sporočilo ali null, ko ga je admin skril, datum;
  brez vračil in testov). Admin: `admin_piva`, `admin_skrij_pivo`,
  `admin_dodaj_pivo`, `admin_izbrisi_pivo` (le ročni). Stran združi
  podpornike po imenu (`src/lib/piva.ts`). Če zapis v bazo ne uspe, gre
  Discord vseeno ven, BMC pa dobi 500 in ponovi. Stran in povezave so le na
  spletu (kot gumb `Pivo.tsx`)
- **Klubski računi** (migracija 20261013201100, spec
  `docs/superpowers/specs/2026-10-13-klubski-racuni-design.md`): klub dobi
  račun, ko se prijavi s **potrjenim** uradnim naslovom iz `klub_stik`
  (`uveljavi_klubski_racun`, kliče ga `useAuth` ob vsaki prijavi). Do 5
  računov na klub, en klub na uporabnika. Brez admina, razen: naslov brez
  `team_id` (`brez_kluba`), poln klub (`polno`) in prošnja za nov naslov
  (`klub_zaprosi_za_naslov`; predlagani naslov je vedno mail računa). Vse v
  Administraciji → Klubski računi (`admin_odloci_klubski_zahtevek`; potrditev
  vpiše ali popravi `klub_stik` s stanjem `sodeluje`). Preklican račun se ob
  prijavi ne obnovi. Povsod velja `je_klubski_racun(uid, team_id)`.
  **Faza 2** (migracije 20261013211100–215100): pozicija kluba
  (`klub_nastavi_pozicijo`) čaka v `pozicije_klub_cakajo` in jo uveljavi
  `uveljavi_pozicije()` v ponedeljek pred glasovanjem; vir `klub` je zaklenjen
  kot `admin` (`potrdi_pozicijo`, `pozicije_v_cakanju`, `ugani-pozicije.mjs`,
  `smeVVrata`), `admin` pa ga prepiše in klub `admin` ne; dnevnik
  `pozicije_klub_dnevnik`. Klub potrjuje profile svojih igralcev
  (`prevzem_je_poznavalec_kluba`). Stran kluba: `klub_predstavitev` (javno
  branje), `ima_klubski_racun` (oznaka), grb v vedru `grbi-klubov`
  (`klub_nastavi_grb`; `teams.logo_url` je relativna pot `/storage/…`, ki ji
  `naslovSlike` doda `API_URL`); `teams.logo_vir = 'klub'` in sprožilec
  `teams_grb_kluba` skriptam za grbe in `zdruzi-klube` preprečita povoziti
  grb, dokler ga admin ne ponastavi (`admin_ponastavi_grb`). Dodajanje
  igralcev in prijave napak sta fazi 3–4. Klub nikoli ne piše minut, golov, cen ali
  `reg_st`. Hrvaški in srbski stiki so s klubi povezani po imenu in ligi
  (migracija 20261013203100)
- `teams.logo_url` → grb kluba; če je prazen, `src/components/Grb.jsx` nariše
  ščit z začetnicami

### Regionalni vklop DFB

`varen_vklop_dfb_regije(p_manifest text, p_sha256 text, p_aktiviraj boolean
 default false)` je servisni RPC samo za štiri nove nemške Regionallige.
Preverja odobrene bajte manifesta v1 (največ 8 MiB), oba sveža zajema,
celoten multiset nastopov in pripisanih golov, trenutne klube/vratarje,
cenik in uradni prihodnji rok. Pod zaklepi vrne `preverjeno`, `slug`,
`prvi_krog`, `rok`, `najcenejsi_kader` in `vklopljena`; privzeto ne spremeni
produkcijskih tabel. Izrecna aktivacija uporabi obstoječi
`vklopi_ligo_sredi_sezone` in preveri `razlika=0` ter ponovno prebere stanje.
Nordostov `varen_vklop_nemcije` se s tem ne spreminja. Postopek, izvorni
manifest in Actions sta opisana v `docs/viri/nemcija.md`.
