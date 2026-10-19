# SLFF Trgovina (shop.slff.eu)

Spletna trgovina z izdelki SLFF: lastna zaloga, pakira ekipa, Pošta Slovenije,
EU-27. Prodajalec SPACE GUARDIAN d.o.o. Spec:
`docs/superpowers/specs/2026-10-18-trgovina-design.md`, načrt:
`docs/superpowers/plans/2026-10-18-trgovina.md`.

## Kako deluje

- **Aplikacija** `shop/` (Vite + React + TS, videz slff.eu): `npm run dev:shop`
  (5175), `build:shop` → `dist-shop/`, `smoke:shop`. Nizi v
  `shop/src/besede.ts` (sl, en; `TELEFON`, `POGOJI_VERZIJA`). Poti: `/`,
  `/p/:slug`, `/cart`, `/thanks`, `/orders`, `/terms`, `/withdrawal`,
  `/login`, `/admin`.
- **Baza**: zaprta shema `trgovina` (migracija `20261018170000_trgovina.sql`):
  `izdelki`, `razlicice` (cena v centih z DDV, `zaloga`), `narocila`,
  `postavke`. Brskalnik bere le `trgovina_katalog()`, `trgovina_izdelek(slug)`
  (zaloga le kot da/malo/ne) in `trgovina_moja_narocila()`. Servisne
  `trgovina_rezerviraj`, `_vezi_sejo`, `_iz_placila`, `_potekla`, `_sprosti`,
  `_narocilo_seje` kliče le `service_role` (funkcije). Admin RPC
  `trgovina_admin_*` preverijo `is_admin()`.
- **Personalizacija, tisk, boni** (migracija `20261018190000_trgovina_personalizacija.sql`,
  spec `docs/superpowers/specs/2026-10-18-trgovina-personalizacija-design.md`):
  `izdelki.po_narocilu` / `digitalni` (brez zaloge), `personalizacije`
  (možnosti in doplačila), `postavke.personalizacija` / `doplacilo` /
  `stanje_tiska`, `serije`, `boni` (koda le sha256 + zadnji 4 znaki).
  `rezerviraj` preveri personalizacijo (ime ekipe do 24 znakov in poljubno
  ime s filtrom `prepovedano_besedilo`, številka 0–99, prvak
  `trgovina.prvaki_uporabnika`: liga nastala vsaj 60 dni in ekipa v njej vsaj
  30 dni pred zadnjim rokom sezone, ime lige skozi `prepovedano_besedilo`
  (sicer `trgovina-besedilo`), vrstica `trgovina.besedilo_prvaka` največ 40
  znakov s "…"; značka vedno 1 kos `trgovina.znacka_uporabnika` po
  stikalu `preverjeni_racuni` za kupca, ne v dveh odprtih naročilih); plačilo
  značke vpiše `narocila_znack`. Napaka vrstice nosi detail `postavka:<n>`
  (trgovina-nakup vrne `postavka`, košarica vrstico označi). Admin digitalnemu
  izdelku ne doda personalizacije.
  Kupec: `trgovina_moji_prvaki()`, `trgovina_moja_znacka()`; servis:
  `trgovina_zabelezi_bon`, `trgovina_bon_porabljen`, `trgovina_bon_poslan`,
  `trgovina_boni_narocila`,
  `trgovina_vracilo`; admin: `_za_tisk`,
  `_nova_serija`, `_serija`, `_serije`, `_serija_stanje`, `_boni`,
  `_shrani_personalizacijo`.
- **Motivi** (migracija `20261019080000_trgovina_motivi.sql`, spec
  `docs/superpowers/specs/2026-10-18-trgovina-motivi-design.md`): `izdelki.postopek`,
  `cone` (fotografija nosilca, koti, mm), `motivi` (polja, sheme, primeri),
  `motivi_izdelki` (doplačilo). Vhod `{motiv, polja, shema}` preveri
  `trgovina.personaliziraj_motiv` (vrsta polja, dolžina, znaki, filter,
  0–99, 1950–letos, izbira, kupčeva nehišna ekipa, prvak kot zgoraj, shema;
  neznana polja zavrne); shrani `{motiv, polja, shema, ime}` (+ `fantasy_team_id`,
  pri prvaku `mini_liga_id`, `sezona`). Nosilec motivov brez motiva ni prodan.
  Javno `trgovina_motivi()`, `trgovina_izdelek().motivi/cone`; admin
  `trgovina_admin_motivi`, `_shrani_motiv` (aktiven, vrstni red, primeri, doplačila).
- **Motivi, dela 2 in 3** (migracija `20261019150000_trgovina_motivi_del23.sql`):
  pub, stena in dodatki (kozarec, vrč, podstavki ×6, odpirač, plakat A3/A2,
  kartica, zastavica, šal, kapa, trak) in **dres po meri** (ves dres v
  sublimaciji, cone `spredaj` in `hrbet` 600×750), vse neaktivno. Plakat ima
  cono po različici (`cone.barva` = "A3"/"A2"). Ime ekipe na kozarcu,
  podstavkih, zastavici in šalu je prosto besedilo (pravo ime kluba).
  - Nove vrste polj: `datum` (ISO), `barva` (ključ iz palete v `moznosti`
    `{kljuc, hex, ime_sl, ime_en}`), `postava`; `stevilka` sprejme `min`;
    `izbira` sprejme tudi `moznosti` kot `{kljuc, ime_sl, ime_en}` (shrani se
    ključ, v opis gre oznaka); `razlicna_od` pri polju zahteva drugo vrednost
    kot navedeno polje (dres: barva1 ≠ barva2).
  - Dres: barve dresa (polja `barva`, po vrsti) nadomestijo barve sheme v
    `personalizacija.barve` (shema `dres` je le nevtralna), polje `barva`
    zajame vse cone nosilca v posnetku con, `trgovina.tisk.barve` ima raje
    posnetek postavke kot barve sheme.
  - `postava` (id kupčeve nehišne ekipe, ne mladinske lige): postavka shrani
    posnetek (`trgovina.postava_ekipe`) v `polja.postava` (+ `fantasy_team_id`,
    `round_id`) iz **zadnjega zaklenjenega kroga s točkami in zaprtim
    glasovanjem**. Točke so tiste, ki so štele (`ucinkovita_postava`: menjave s
    klopi, množitelj kapetana), `tocke_skupaj` = `tocke_krogov.points`, `kazen`.
    Anonimiziran igralec in kdorkoli z vrstico v mladinski ligi iste države
    (šifra pri istem viru ali ime, kot Scout) je "Igralec". Isti posnetek za
    predogled vrne `trgovina_moja_postava(p_team_id)` (le lastnik).
- **Fotografije nosilcev** so v repozitoriju, `shop/nosilci/*.webp` (1600×1600,
  prazna majica/pulover spredaj in zadaj). `publicDir` trgovine je `public/logo`,
  zato jih vtičnik `slff-nosilci` v `shop/vite.config.js` streže v razvoju in ob
  buildu prepiše v `dist-shop/nosilci/`; na strani so `https://shop.slff.eu/nosilci/…`
  in pridejo gor z navadno objavo trgovine. `cone.slika` je pot `/nosilci/<ime>.webp`,
  `cone.koti` so koti cone na tej sliki (TL, TR, BR, BL). Nova fotografija = nova
  datoteka in nova migracija za vrstico cone (koti izmerjeni na fotografiji).
- **Rezervacija**: naročilo `caka_placilo` drži zalogo 35 min
  (`rezervirano_do`), Stripe seja poteče v 31 min. Na voljo = zaloga −
  rezervirano. Največ 5 odprtih naročil na prijavljenega uporabnika ali (gost)
  na zgoščen IP (`odjemalec`, sha256 IP + `TRGOVINA_PEPPER`). Ponoven klik
  "Na plačilo" najprej zapre prejšnjo sejo (`prejsnja`). Plačilo odšteje zalogo
  enkrat (idempotentno po seji); česar ni bilo, zapiše v `manjka` (admin vidi).
- **Plačilo**: `trgovina-nakup` (Edge) ustvari Stripe Checkout:
  `metadata.app = slff-shop`, `automatic_tax`, cene z DDV,
  načini plačila iz Stripe Dashboarda
  (API ne sprejme več `payment_method_types`; pustimo le kartico in denarnice,
  ker webhook zapiše le takojšnje plačilo), država dostave izbrana v košarici (`allowed_countries`), tarife po državi
  (`pismo_si` le nalepke v SI, `paket_si`, `paket_eu`). `stripe-webhook` veja
  `slff-shop` (`stripe-webhook/trgovina.ts`): plačano → naročilo + mail +
  Discord; poteklo → sprosti.
- **Pošta**: `trgovina-posta` (Mailcow) — potrditev (z besedilom odstopa in
  obrazcem, trajni nosilec) in "poslano" s sledilno številko. Kliče jo webhook
  (servisni ključ) ali admin. Potrditev navede personalizacijo in rok izdelave (1–2 tedna);
  vrsta `bon` (le servis) pošlje kode darilnih bonov.
- **Personaliziran nakup**: `trgovina-nakup` pošlje personalizacijo v
  `rezerviraj`; cena v Stripe = cena + doplačilo. Personalizirana košarica
  zahteva `brez_odstopa: true` (sicer 400 `trgovina-odstop`); samo digitalna
  košarica (boni) nima dostave (naslov za račun da Stripe). Vsi trije
  checkouti (trgovina, Scout, preverjeni) imajo `allow_promotion_codes`.
- **Izdelek v Stripe**: vsaka nedigitalna postavka trgovine gre pod en stalni
  izdelek "SLFF Trgovina" (id `slff-shop`, `tax_code` txcd_99999999), ne
  `product_data`; darilni bon (`applies_to` = ta izdelek) zato velja tudi za
  izdelke, dodane po izdaji bona. Darilni bon sam gre s `product_data` (z bonom
  se bona ne kupi). Ime izdelka, različica in personalizacija so pod gumbom
  Checkouta (`custom_text.after_submit`) in v potrditvi. **Meja:** davčna koda
  je ena za vse blago (`izdelki.tax_code` velja le še za bone); boni, izdani
  pred to spremembo, veljajo le za stare izdelke `slff-shop-<slug>-<jezik>`.
- **Darilni boni**: webhook po plačilu (le naročilo `placano`/`poslano`; vrnjeno
  kode ne dobi) za vsako enoto digitalne postavke ustvari kupon s stalnim id
  `slff-shop-bon-<oznaka>-<postavka>-<enota>` (amount_off = cena, enkrat,
  `max_redemptions` 1, rok 1 leto, `applies_to` izdelek "SLFF Trgovina") in kodo
  `SLFF-XXXX-XXXX`. Že zabeležena enota (`trgovina_boni_narocila`) kode ne izda
  znova: prebere jo iz Stripe po `stripe_promocija`. Zapis
  `trgovina_zabelezi_bon` (sha256 + zadnji 4), kode gredo kupcu v mailu `bon`;
  dokler `narocila.bon_mail_at` ni zapisan (`trgovina_bon_poslan`), webhook vrne
  500 in Stripe dogodek ponovi (do 3 dni). Admin v zavihku Boni "Pošlji bon
  znova" (`stripe-webhook` `{"akcija":"bon_znova","narocilo_id"}`, admin JWT)
  kode prebere iz Stripe in jih pošlje znova. Naročilo samih bonov in značk gre
  po mailu (oziroma takoj ob plačilu, če so le značke) v `poslano`. Največ 5 bonov
  na naročilo. Napaka izdaje gre na Discord (brez kode). Klici bonov imajo
  zapisano različico API `2025-03-31.basil`. Plačana seja s popustom (vse tri
  aplikacije) → `trgovina_bon_porabljen`; popust seje se shrani v
  `narocila.znesek_popust` in je v potrditvi ("Popust"). Seja
  `no_payment_required` (bon pokrije vse) šteje za plačano.
- **Vračilo** (`charge.refunded`, celotno): `trgovina_vracilo` (naročilo →
  `vrnjeno`, še neodposlana značka preklicana, nenatisnjene postavke iz tiska)
  in izklop promocijskih kod bonov naročila v Stripe, nato Discord. Delno
  vračilo je le Discord (uredi ročno).
- **Admin** `/admin`: naročila za pakiranje (nalepka 100×150 mm, dobavnica),
  sledilna številka → poslano + mail; izdelki, različice, cene, zaloga kot
  sprememba (`zaloga_dodaj`), slike v Storage (vedro `trgovina`).
- **Vsa naročila** (admin, prvi zavihek, `AdminVsaNarocila.tsx`; migracija
  `20261019140000_trgovina_admin_narocila.sql`): `trgovina_admin_vsa_narocila(stanje,
  iskanje, od, koliko)` (števci po stanju, iskanje po oznaki, e-pošti, imenu;
  najnovejša najprej), `trgovina_admin_narocilo` še s Stripe plačilom (povezava v
  testni Dashboard, ko je seja `cs_test_`) in zgodovino `trgovina.zgodovina_stanj`
  (sprožilec ob vsaki spremembi stanja: plačilo, poslano, vračilo, admin;
  `opomba` je agentom zaprta). Ročni prehodi `trgovina_admin_nastavi_stanje`:
  placano ↔ `v_izdelavi`, poslano → `dostavljeno`, placano/v_izdelavi →
  preklicano (vrne `vracilo_potrebno`: denar vrni v Stripe, vračilo ga premakne v
  vrnjeno; zaloga se ne vrne, značka in tisk se sprostita kot pri vračilu;
  **kode darilnih bonov ostanejo veljavne do celotnega vračila**). caka_placilo
  se ne prekliče: odprto sejo Stripe bi kupec še plačal, rezervacija poteče sama.
  Poslano le prek sledilne (`trgovina_admin_poslano`, tudi iz `v_izdelavi`).
  Pakiranje in tisk vidita tudi `v_izdelavi`. "Plačano" je povsod isti nabor
  (placano, v_izdelavi, poslano, dostavljeno): SQL `trgovina.je_placano_aktivno`,
  funkcije `supabase/functions/_shared/trgovina-stanja.ts` (smoke ju primerja in
  zavrne nabor, napisan na roko). `objavi-funkcije.sh` ob vsaki funkciji prenese
  še `_shared`.
- **Stran izdelka in košarica**: obrazec po možnostih izdelka (ekipe kupca iz
  `fantasy_teams` brez hišnih, prvaki `trgovina_moji_prvaki`, značka
  `trgovina_moja_znacka`; brez prijave povezava na prijavo), predogled kot SVG
  čez sliko, cena z doplačilom. Brskalnik pravila le zrcali
  (`shop/src/personalizacija.ts`; žaljivke preveri šele baza). Košarica hrani
  personalizacijo po vrstici (ključ različica + vnos), potrditev "ni mogoče
  vrniti" pošlje `brez_odstopa`; samo boni: brez države in poštnine.
- **Za tisk** (admin): postavke `za_tisk` → serija → izvoz `serija-<id>.csv`
  (ločilo `;`, BOM, formule ubežane) in SVG za vsako postavko
  (`<oznaka>-<postavka>.svg`, pisava Inter, besedilo ubežano) → "Poslano
  tiskarni" → "Natisnjeno". ZIP-a ni (brez knjižnice). Za pakiranje je
  naročilo, ko so vse postavke v paketu na zalogi ali natisnjene; darilni boni
  in značke (tok `narocila_znack`) se ne pakirajo tu.
- **Boni** (admin): izdani darilni boni (zadnji 4 znaki) in nova koda za Scout
  ali preverjene prek funkcije `trgovina-boni` (admin po `is_admin`, kupon
  `duration=once` z `applies_to` = izdelki cen `slff_scout_klub_*` oziroma
  `slff_preverjen_*` in `slff_znacka`, odstotek ali znesek, število uporab,
  rok do 2 let; koda se vrne enkrat in se ne beleži).

## Motivi

Motivi nedeljske lige na nosilcih po meri. Del 1 (migracija `20261019080000`):
Retro dres, Legenda, Hangover XI, Kapetan, Kralj kafane, Prvak mini lige na
majici in puloverju. Dela 2–3 (migracija `20261019150000`): pub in tekma, stena
in darila, dodatki in dres po meri (tabela spodaj). Vse preverjanje in vse cene
so v bazi (`trgovina.personaliziraj_motiv`); brskalnik le riše predogled. Vse je
sejano z `aktiven = false`, vklopi admin; cene in doplačila v tabeli so seme, admin
jih spreminja.

| nosilec (`slug`) | postopek | motiv | cona (mm) | seme: cena + doplačilo (€) |
|---|---|---|---|---|
| `kozarec-po-meri` (0,5 l) | laser | Tretji polčas, Ekipni kozarec | ovoj 70 × 90 | 12 + 9 |
| `vrc-po-meri` (0,5 l) | laser | isti kot kozarec | ovoj 200 × 90 (motiv 70 mm na sredini) | 18 + 9 |
| `podstavki-po-meri` (×6) | sublimacija | Kafanski komplet (6 sloganov) | podstavek Ø 95, ×6 | 22 + 0 |
| `odpirac-po-meri` | laser | Ime in številka | ročaj 50 × 15 | 9 + 6 |
| `plakat-po-meri` (A3, A2) | uv | Moja postava, Retro plakat tekme | A3 297 × 420, A2 420 × 594 (cona po `barva` = različica) | 29 / 45 + 0 |
| `kartica-igralca` (A5) | uv | Kartica legende (4 ocene) | 148 × 210 | 15 + 0 |
| `zastavica-po-meri` | sublimacija | Klubska zastavica | trikotnik 300 × 450 | 22 + 0 |
| `sal-po-meri` | sublimacija | Navijaški šal | ves trak 1400 × 180 | 35 + 0 |
| `kapa-po-meri` (Črna, Bela-črna) | vezenje | Vezena ekipa | spredaj 100 × 50 | 24 + 10 |
| `trak-po-meri` | sublimacija | Kapetanski trak | 300 × 80 | 18 + 0 |
| `dres-po-meri` (S–3XL) | sublimacija | Dres po meri | spredaj, hrbet 600 × 750 | 49 + 10 |

**Pravila postopka** (preveri jih smoke na vsaki predlogi):

- **laser** (steklo, kovina): ena barva, brez prosojnosti in prelivov, le črte in
  polne ploskve, črte ≥ 0,3 mm. Gravura je ena sama; barva sheme je le za predogled.
- **vezenje** (kapa): največ 4 ploske barve niti, brez prosojnosti, črte ≥ 1 mm,
  črke ≥ 5 mm visoke tudi pri najdaljšem imenu.
- **sublimacija**, **uv**: polne barve; ozadje sega do roba cone.

**Mladinske lige.** Pivski motivi (kozarec, vrč, podstavki, odpirač) imajo ime
ekipe kot prosto besedilo (klub nedeljske lige), brez povezave z ligo. Polji, ki
se vežeta na fantasy ekipo (`ekipa`, `postava`), ekipo mladinske lige zavrneta
(`je_mladinska_liga`), zato plakata postave za mladinsko ligo ni. Na plakatu je
"Igralec" namesto imena anonimiziranega igralca in vsakogar z vrstico v mladinski
ligi iste države.

**Plakat moje postave** (polje `postava`). Vrednost v košarici je id kupčeve
nehišne ekipe; baza ob nakupu shrani **posnetek** (oblika v2) v `polja.postava`:
`{ekipa, liga, sezona, krog, formacija, tocke_skupaj, kazen, zacetni[11], klop[]}`,
igralec `{ime, priimek, pozicija, klub, tocke, kapetan, podkapetan, mnozitelj,
zamenjava, zamenjan, steje}` (podrobno v glavi `trgovina.postava_ekipe`). Krog je
**zadnji končani tekoče sezone lige** (`sezona_lige`): zaklenjen, vsaj en igralec
s točkami in glasovanje o asistencah zaprto; odprt ali neodigran krog in krogi
pretekle sezone se preskočijo. Brez takega kroga baza
javi namig `trgovina-postava-krog` (konfigurator: "na voljo po prvem odigranem
krogu"). Točke so tiste, ki so štele (menjave s klopi, množitelj kapetana);
`tocke_skupaj` = njihova vsota minus kazen (`fantasy_transfers.penalty`), izračunana
v funkciji, ne prebrana iz `tocke_krogov`, ki lahko zaostaja. Opis postavke
(košarica po nakupu, potrdilo, e-pošta) pove krog posnetka ("Kranjski Tigri ·
9. krog"), ker je predogled lahko starejši krog. Živi predogled bere isti posnetek
(`trgovina_moja_postava`). **Tisk riše le posnetek iz postavke**, nikoli živih
podatkov: kasnejša sprememba postave ali imena igralca plakata ne spremeni.

**Dres po meri.** Vzorec (`enobarven`, `crte`, `tanke-crte`, `obroci`, `serpa`,
`polovice`), tri barve iz palete (polja `barva`, druga ≠ prva), ovratnik,
sponzor, ime in številka. Barve dresa nadomestijo barve sheme in se ob nakupu
shranijo v `personalizacija.barve`; `trgovina.tisk.barve` ima raje posnetek kot
shemo. Ves panel riše generator `data-dres` v `risba.ts` (sprednji in zadnji
panel, grb SLFF v vektorju).

**Katalog** pokaže pri nosilcu motivov ceno "od" z najnižjim doplačilom
aktivnega motiva (`trgovina_katalog.cena_z_motivom`, null brez motivov), ne gole
cene nosilca.

**Model** (migracija `20261019080000_trgovina_motivi.sql`):

- **Nosilec** je izdelek z `postopek` (`dtf`, `sublimacija`, `laser`, `uv`,
  `vezenje`), `po_narocilu` in povezavo v `motivi_izdelki` (`doplacilo` v centih):
  `majica-po-meri` (Črna/Bela), `pulover-po-meri` (Črna) in nosilci iz tabele zgoraj.
- **Cona** (`trgovina.cone`): mesto tiska na nosilcu: `kljuc` (`hrbet`, `prsi`),
  `barva` (različica, NULL = vse), `slika` (prazen nosilec, `/nosilci/<ime>.webp`),
  `koti` (TL, TR, BR, BL v px te slike) in prava velikost `sirina_mm` × `visina_mm`.
- **Motiv** (`trgovina.motivi`): `slug`, imena in opisi sl/en, glavna `cona`,
  `polja`, `sheme`, `primeri`, `aktiven`, `vrstni_red`.
  - `polja`: `{kljuc, vrsta, oznaka_sl, oznaka_en, max, obvezno, privzeto, moznosti, cona?}`;
    vrste `besedilo` (znaki in filter žaljivk), `stevilka` (0–99, `min` za ocene
    1–99), `leto` (1950–letos), `datum` (ISO, 1950 do leto naprej), `ekipa`
    (lastna, ne hišna fantasy ekipa), `prvak` (`trgovina.prvaki_uporabnika`,
    besedilo sestavi baza), `postava` (posnetek, glej zgoraj), `izbira`
    (`moznosti`: nizi ali `{kljuc, ime_sl, ime_en}`) in `barva` (`{kljuc, hex,
    ime_sl, ime_en}`, `razlicna_od`). Motiv ima največ eno polje `ekipa`, `prvak`
    ali `postava`.
    Polje z lastno `cona` se natisne drugje (sponzor Retro dresa na prsih).
  - `sheme`: `{kljuc, ime_sl, ime_en, barve: [3 × #hex]}`; barva 1 je srednji ton,
    2 in 3 sta svetla/temna nasprotja, zato vsaka shema bere na črnem in belem.
  - `primeri`: izmišljeni primeri (nikoli resnične osebe) `{polja, shema, izdelek, barva}`
    za vitrino in "Začni s tem".
- Postavka hrani `{motiv, polja, shema, ime}` (+ `fantasy_team_id`, pri prvaku
  `mini_liga_id`, `sezona`); doplačilo vedno pride iz `motivi_izdelki`.

**Risanje.** Predloge so SVG v `shop/src/motivi/` (`<slug>.svg` = glavna cona,
`<slug>.<cona>.svg` = dodatna), viewBox v mm cone. Kavlji: `<text data-polje="…">`,
`data-barva="1|2|3"` (polnilo), `data-crta` (obroba), `data-sirina` (pomanjšaj do
širine), `data-luk` (besedilo v loku), `data-vrstice`, `data-oblika`, `data-ce`
(podrobno v glavi `shop/src/risba.ts`). `narisiMotiv(slug, polja, barve, cona, mm)`
je čist niz → niz (dela v brskalniku, smoke in Node), pisava je Anton
(`shop/src/motivi/anton.ttf`, OFL). Predogled (`shop/src/mockup.tsx`) položi
SVG na fotografijo cone (pravokotnik v %, sicer `matrix3d` iz 4 kotov) in ga
pomnoži s svetlostjo fotografije.

**Nov motiv:**

1. Predloga `shop/src/motivi/<slug>.svg` (300 × 400 mm za hrbet) s kavlji za vsako
   polje in vse tri barve; preizkusi dolge (max) in kratke vrednosti.
2. Vrstica v manifestu `shop/src/motivi/index.ts` (`slug`, `cona`, `polja`, `barve`, `predloge`).
3. **Nova migracija** z `insert into trgovina.motivi` (polja, 3 sheme, 3–4
   izmišljeni primeri, `aktiven = false`) in `motivi_izdelki` (doplačilo).
   Smoke bere seme iz migracije motivov; motiv v novi migraciji dodaj tudi v
   branje semena v `shop/smoke.tsx`.
4. `npm run smoke:shop` (predloga ↔ seme: polja po conah, barve, ubežanje,
   dolge/kratke vrednosti), `npm run test:varnost`, nato admin → **Motivi**
   (`AdminMotivi.tsx`): `aktiven`, vrstni red, doplačilo po nosilcu (prazno = motiva
   ni na izdelku) in primeri kot JSON (preveri jih `trgovina_admin_shrani_motiv`;
   prazen seznam je dovoljen, vitrina tedaj pokaže privzete vrednosti polj).
   Nosilec (izdelek s `postopek`) brez motiva, ki ga izdaja zna narisati, pokaže
   "Motivi prihajajo kmalu" brez gumba za nakup, zato ga lahko vklopiš pred motivi.

**Nov nosilec:**

1. Nova migracija: `trgovina.izdelki` (`postopek`, `po_narocilu = true`, `tax_code`,
   `aktiven = false`), `razlicice` (cena, teža; plakat: različica = format), cone
   (spodaj) in `motivi_izdelki` (doplačilo). Mere cone = mere predloge v mm;
   vrč pokaže, kako širši ovoj uporabi ožjo predlogo na sredini.
2. Predloga ali obstoječi motiv, ki ustreza pravilom postopka; motiv s kompletom
   ima v manifestu `kosov` (podstavki 6, `{n}` v ključih).
3. Posebnosti fotografije (svetlost, polmer valja, videz gravure/vezenja, kosi
   kompleta, približanje vitrine) gredo v `NOSILCI` v `shop/src/mockup.tsx`,
   ključ je ime slike.
4. Smoke: seme in cone se berejo iz migracije (`shop/smoke.tsx`, blok d23).

**Nova fotografija nosilca / cona:**

1. Prazen nosilec (brez napisov), raven, od spredaj, kvadrat; WebP 1600 px v
   `shop/nosilci/` (vtičnik `slff-nosilci` jo streže in prepiše v build).
2. Izmeri kote cone na sliki (TL, TR, BR, BL; hrbet: sredina, ~8 cm pod ovratnikom;
   razmerje stranic = mm cone). Pomaga mreža: `magick slika.webp -draw 'line …'`
   vsakih 50 px, nato pogled od blizu.
3. Nova migracija z vrstico `trgovina.cone` (`slika`, `koti`, `sirina_mm`, `visina_mm`).
4. Preveri predogled na izdelku z vsemi motivi (svetla in temna barva).

**Tisk** (admin → Tisk, `AdminTisk.tsx`; agent bere `trgovina.tisk` v celoti,
`cone.kljuc` je v `agent.odprti_stolpci`): datoteke za vsako neprazno cono,
ime `<oznaka>-<cona>-<postopek>-<postavka>`, vse z vgrajeno pisavo Anton. Mere
so iz posnetka postavke, barve iz posnetka (dres) ali sheme, stalni napisi in
datum v **jeziku naročila** (`trgovina.narocila.jezik`, sl|en s check; pogled
`trgovina.tisk.jezik`). Po postopku:

| postopek | datoteke |
|---|---|
| `dtf` (majice) | list SVG + PNG 300 dpi (3 mm prireza, rezilne oznake) in `-dtf.png` (le motiv) |
| `sublimacija`, `uv` | list SVG + PNG s prirezom in oznakami; ozadje (pravokotnik ali krog do roba) se razširi v prirez |
| `laser` | SVG v pravi velikosti, vse polnilo in črte črno, brez oznak (vžgale bi se) + PNG 300 dpi |
| `vezenje` | SVG v pravi velikosti, ≤ 4 ploske barve, brez oznak; barve niti v CSV (`Barve niti`), brez PNG |

- **Komplet** (podstavki): datoteka na kos `-k1` … `-k6` (vsak svoj slogan) in
  `-list` (vseh 6 na listu 295 × 195 mm). Krog podstavka dobi 3 mm prireza.
- **Šal**: ves trak 1400 × 180 mm v eni datoteki. **Plakat**: A3 ali A2 po
  različici. **Zastavica**: trikotnik (in njegov clipPath) se poveča okoli središča včrtanega kroga, da zraste za 3 mm na vsaki stranici (kavelj `data-prirez="cx cy r"`).
- **DPI**: 300, razen sublimacije s stranico ≥ 600 mm (dres, šal) v **150 dpi**,
  kar je za tekstil dovolj: dres s prirezom 620 × 770 mm = 3661 × 4547 px
  (16,6 M px, pod mejo platna 16,7 M px v iOS Safariju; v 300 dpi bi bil
  7323 × 9094 = 67 M px), šal 8386 × 1181 px. PNG nosi pHYs z izbranim dpi.
- **CSV** ima stolpce `Motiv`, `Postopek`, `Cona`, `PNG`, `PNG DTF`, `Kos`,
  `Mere (mm)`, `DPI`, `Barve niti`.

PNG A2 plakata v 300 dpi (≈ 38 M px) je večji od meje platna v iOS Safariju:
datoteka, ki ne uspe, ne ustavi serije, admin dobi seznam neuspelih. Izvažaj
na računalniku.

**Slike s prizori** (`scripts/trgovina-hero.mjs`): na izvirne fotografije prizorov
(`scripts/trgovina-hero/*.jpg`: igrišče, gostilna, slačilnica; prazni nosilci)
nalepi pravi motiv s perspektivo (4 koti) in senčenjem fotografije ter zapiše
`shop/nosilci/hero-<scena>.webp` (2000 px in `-1000`) za `/personalised` in pas
v katalogu ter `katalog-majica.webp` / `katalog-pulover.webp` (kataloški sliki
nosilcev). Primeri in sheme pridejo iz semena v migraciji. Nosilci delov 2–3
prizorov še nimajo (miza v gostilni s kozarcem in podstavki, stena z uokvirjenim
plakatom): kartica v katalogu pokaže živi mockup prvega primera.

```bash
npx vite-node scripts/trgovina-hero.mjs                  # vse
npx vite-node scripts/trgovina-hero.mjs gostilna --pregled /tmp/p.jpg
```

Potrebuje `rsvg-convert` in `magick`. Skripta sama nastavi fontconfig na
`shop/src/motivi` in `PANGOCAIRO_BACKEND=fc` (brez tega pango na macOS tiho
vzame Impact). Nov prizor = fotografija v `scripts/trgovina-hero/`, vrstica v
`SCENE` (koti v px izvirnika, `ton` = svetloba prizora) in pogled rezultata od blizu.

## Objava

Narejeno 18. 10. 2026: DNS `shop` (A 2.31.6.53, proxied), Caddy blok
(`scripts/hetzner/Caddyfile`, zasebne poti noindex), `/srv/slff-shop` +
`releases` lastnik `deploy`, GoTrue `ADDITIONAL_REDIRECT_URLS` z
`https://shop.slff.eu/**`.

Ostalo (enkrat):

1. Spremenljivka repozitorija `SHOP_OBJAVA=1` (CI posel *Objava Trgovine*).
2. Okolje funkcij (`/opt/supabase`): `TRGOVINA_PEPPER` (naključno, ≥ 32 B,
   brez njega `trgovina-nakup` vrne 503), `SHOP_URL` (neobvezno),
   `TRGOVINA_TARIFE` (neobvezno, JSON id tarif), SMTP kot `posli-opomnik`.
3. Funkcije: `scripts/hetzner/objavi-funkcije.sh trgovina-nakup`, nato
   `trgovina-posta`, `stripe-webhook` in `trgovina-boni` (ena na klic).
4. Stripe: `STRIPE_SECRET_KEY=… scripts/stripe-trgovina.sh` (tarife; po
   spremembi tarif ponovni zagon funkcij), endpoint webhooka dobi dogodka
   `checkout.session.expired` in `checkout.session.async_payment_failed`,
   obvezna potrditev pogojev le ob `STRIPE_TOS=1` (skupno s preverjenimi; zahteva
   Settings → Public details → Terms of service URL), sicer besedilo nad gumbom.
5. `select trgovina_pripravi_shrambo();` (vedro za slike).
6. V adminu: cene, zaloga, slike, nato `aktiven`; motive vklopi zavihek **Motivi**.

## Pred živo prodajo

- Živi `STRIPE_SECRET_KEY` postavi lastnik (velja tudi za preverjene in Scout).
- Računovodja potrdi izdajo računov (ZDavPR, davčno potrjevanje pri plačilu s
  kartico); če je potrebno, ločena naloga (ponudnik e-računov).
- Stripe Tax: registraciji **SI** in **EU OSS** (sicer kupec iz AT plača 0 %
  DDV), naslov izvora.
- En pravi nakup (test kartica v testnem načinu, nato ena prava v živem):
  potrditveni mail, nalepka, poslano, mail s sledilno.
- Preveri `has_function_privilege('anon', 'public.trgovina_rezerviraj(...)')`
  na produkciji = false.
