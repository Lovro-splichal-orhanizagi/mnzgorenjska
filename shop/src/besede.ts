// Nizi shop.slff.eu. Ločen slovar od src/i18n, kot v Scoutu. Slovenščina (SL) je
// izvor; vsak drug jezik je svoja datoteka shop/src/jeziki/<jezik>.ts tipa
// Record<Kljuc, string> (manjkajoč ključ javi typecheck; smoke primerja {parametre},
// odstavke pogojev in zavrne prazne nize). Jeziki so isti kot na slff.eu (jezik.ts).
// Pogoji prodaje (pogoji.*) so pravno besedilo: odstavki so ločeni s prazno
// vrstico; ob spremembi popravi vse jezike in datum veljavnosti.
import { izberiJezikIz, jezikIzOznake, LOKALE, type Jezik } from './jezik.ts'

const PRODAJALEC = 'SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija'
/** Telefon prodajalca (obvezen podatek na pogojih; smoke zavrne prazen). Kopija v trgovina-posta/sporocila.ts. */
export const TELEFON = '+386 40 773 385'
export const TELEFON_POVEZAVA = `tel:${TELEFON.replace(/\s/g, '')}`
/** Datum različice pogojev; kopija v trgovina-posta/sporocila.ts (smoke primerja). */
export const POGOJI_VERZIJA = '29. 10. 2026'

export const SL = {
  'app.ime': 'SLFF Trgovina',
  'app.znacka': 'Trgovina',
  'app.nalaganje': 'Nalagam …',
  'nav.trgovina': 'Izdelki',
  'nav.narocila': 'Moja naročila',
  'nav.kosarica': 'Košarica ({n})',
  'nav.prijava': 'Prijava',
  'nav.odjava': 'Odjava',
  'noga.pogoji': 'Pogoji prodaje',
  'noga.odstop': 'Odstop od pogodbe',
  'noga.zasebnost': 'Zasebnost',
  'noga.slff': 'Fantasy na slff.eu',
  'noga.prodajalec': `Prodajalec: ${PRODAJALEC} · ID za DDV SI42765153 · info@slff.eu ·`,

  'nav.poMeri': 'Po meri',
  'motiv.korak.motiv': 'Motiv',
  'motiv.korak.polja': 'Vpiši svoje',
  'motiv.korak.shema': 'Barve motiva',
  'motiv.korak.nosilec': 'Barva in velikost',
  'motiv.barva': 'Barva',
  'motiv.velikost': 'Velikost',
  'motiv.izberiVelikost': 'Izberi velikost',
  'motiv.pogled': 'Pogled',
  'motiv.cona.hrbet': 'Hrbet',
  'motiv.cona.prsi': 'Spredaj',
  'motiv.vZivo': 'Predogled v živo',
  'motiv.tisk': 'Tisk {sirina} × {visina} cm',
  'motiv.cena': 'Izdelek {osnova} + motiv {motiv}',
  'motiv.alt': '{motiv} na izdelku {izdelek}',
  'motiv.primeri': 'Za navdih',
  'motiv.primeriOpis': 'Ekipe in imena so izmišljeni. Izberi enega in ga prilagodi po svoje.',
  'motiv.zacni': 'Začni s tem',
  'motiv.namig.besedilo': 'Do {max} znakov.',
  'motiv.namig.leto': 'Leto od 1950 do {letos}.',
  'motiv.napaka.dolgo': 'Največ {max} znakov.',
  'motiv.napaka.znaki': "Dovoljene so črke, številke, presledek in . ' & ! ? -, vsaj ena črka.",
  'motiv.napaka.leto': 'Leto mora biti od 1950 do {letos}.',
  'motiv.ekipaPredogled': 'Predogled kaže izmišljeno ekipo, dokler ne izbereš svoje.',
  'motiv.niEkip': 'Pod tem računom nimaš fantasy ekipe (mladinske lige ne štejejo). Ustvariš jo na slff.eu.',
  'motiv.prvakPredogled': 'Predogled kaže izmišljeno mini ligo, dokler ne izbereš svoje.',
  'motiv.manjka': 'Izpolni označena polja.',
  'motiv.ekipaDolga': 'Ime je predolgo za ta motiv (največ {max} znakov).',
  'motiv.format': 'Format',
  'motiv.brezBarve': 'Brez tretje barve',
  'motiv.namig.ocena': 'Od {min} do 99. Ocene določiš sam.',
  'motiv.namig.datum': 'Dan tekme.',
  'motiv.napaka.ocena': 'Ocena mora biti od {min} do 99.',
  'motiv.napaka.datum': 'Datum mora biti od 1950 do največ leto naprej.',
  'motiv.napaka.razlicni': 'Izberi drugačno barvo kot prvo.',
  'motiv.postava.prijava': 'Plakat nariše tvojo pravo postavo, zato se prijavi z računom SLFF.',
  'motiv.postava.predogled': 'Predogled kaže izmišljeno postavo, dokler ne izbereš svoje ekipe.',
  'motiv.postava.mladinska': 'Mladinskih lig ne tiskamo na plakat.',
  'motiv.postava.znova': 'Poskusi znova',
  'motiv.postava.niKroga': 'Ta ekipa še nima končanega kroga s točkami. Plakat bo na voljo po prvem odigranem krogu.',
  'motiv.postava.krog': 'Natisnemo postavo zadnjega končanega kroga ({krog}. krog, {liga}). Plakat jo zamrzne ob nakupu.',
  'motiv.cona.spredaj': 'Spredaj',
  'motiv.cona.ovoj': 'Gravura',
  'motiv.cona.podstavek': 'Podstavek',
  'motiv.cona.rocaj': 'Gravura',
  'motiv.cona.plakat': 'Plakat',
  'motiv.cona.kartica': 'Kartica',
  'motiv.cona.zastavica': 'Zastavica',
  'motiv.cona.sal': 'Šal',
  'motiv.cona.trak': 'Trak',
  'motiv.postopek.dtf': 'DTF tisk',
  'motiv.postopek.laser': 'laserska gravura',
  'motiv.postopek.uv': 'tisk na mat papir',
  'motiv.postopek.sublimacija': 'sublimacija',
  'motiv.postopek.vezenje': 'vezenje',
  'kosarica.motivNi': 'Tega motiva ni več v prodaji. Odstrani izdelek iz košarice.',
  'napaka.stran': 'Nekaj je šlo narobe pri prikazu te strani.',
  'napaka.osvezi': 'Osveži stran',
  'osebno.naslov': 'Tvoja nedeljska liga, natisnjena',
  'osebno.nadnaslov': 'Izdelki po meri',
  'osebno.uvod': 'Motivi za ekipe, ki igrajo za čast, pivo in tretji polčas (na izbiro: {n}). Majice, dresi, kozarci, plakat tvoje postave, šali in kape: vpiši ime, številko ali izberi svojo fantasy ekipo in ga v živo poglej na izdelku.',
  'osebno.prednost1': 'Predogled v živo',
  'osebno.prednost2': 'Natisnemo v 1–2 tednih',
  'osebno.prednost3': 'Dostava po vsej EU',
  'osebno.cta': 'Naredi svojega',
  'osebno.na': '{izdelek} od {cena}',
  'osebno.primer': 'Primer {n}',
  'osebno.prazno': 'Motivi so še v pripravi. Kmalu bodo tu.',
  'osebno.vsi': 'Vsi motivi',
  'osebno.skupine': 'Skupine motivov',
  'osebno.skupina.majice': 'Majice in puloverji',
  'osebno.skupina.dresi': 'Dresi',
  'osebno.skupina.pub': 'Pub in tekma',
  'osebno.skupina.stena': 'Stena in darila',
  'osebno.skupina.dodatki': 'Šal, kapa, trak',
  'osebno.prizori': 'Motivi v nedeljski ligi',
  'osebno.prizor.igrisce': 'Črna majica z motivom Retro dres (NOVAK 9) na ograji ob vaškem igrišču',
  'osebno.prizor.gostilna': 'Črn pulover z motivom Hangover XI na mizi v gostilni',
  'osebno.prizor.slacilnica': 'Bela majica z motivom Kapetan (MLAKAR 5) v slačilnici',
  'katalog.pasNaslov': 'Naredi svojega',
  'katalog.pasOpis': 'Majica, dres, pivski kozarec, plakat tvoje postave, šal ali kapa z motivom nedeljske lige: tvoje ime, številka, fantasy ekipa ali naslov prvaka. Poglej ga v živo, preden ga naročiš.',
  'katalog.pasGumb': 'Na motive',
  'katalog.naslov': 'Uradni izdelki SLFF',
  'katalog.uvod': 'Majice, puloverji, šali in vse za pravega navijača lokalnega nogometa. Pakiramo sami, pošiljamo s Pošto Slovenije po vsej EU.',
  'katalog.prazno': 'Trgovina se odpre kmalu. Prvi izdelki so v pripravi.',
  'katalog.od': 'od {cena}',
  'katalog.prednost1': 'Dostava po vsej EU',
  'katalog.prednost2': '14 dni za odstop',
  'katalog.prednost3': 'Varno plačilo s Stripe',
  'voljo.da': 'Na zalogi',
  'voljo.malo': 'Le še nekaj kosov',
  'voljo.ne': 'Razprodano',
  'kategorija.oblacila': 'Oblačila',
  'kategorija.dodatki': 'Dodatki',
  'kategorija.dom': 'Za dom',
  'kategorija.nalepke': 'Nalepke',

  'izdelek.ni': 'Tega izdelka ni ali ni več v prodaji.',
  'izdelek.motiviKmalu': 'Motivi prihajajo kmalu',
  'izdelek.motiviKmaluOpis': 'Motive za ta izdelek še pripravljamo. Poglej znova čez nekaj dni.',
  'izdelek.nazaj': 'Vsi izdelki',
  'izdelek.izberi': 'Izberi različico',
  'izdelek.barva': 'Barva',
  'izdelek.velikost': 'Velikost',
  'izdelek.izberiVelikost': 'Izberi velikost',
  'izdelek.kolicina': 'Količina',
  'izdelek.manj': 'Manj',
  'izdelek.vec': 'Več',
  'izdelek.dodaj': 'Dodaj v košarico',
  'izdelek.dodano': 'Dodano v košarico.',
  'izdelek.delno': 'V košarico smo dodali le {n}: največ 20 kosov posameznega izdelka.',
  'izdelek.polno': 'Več ne gre v košarico: največ 20 kosov posameznega izdelka in 20 različnih izdelkov.',
  'izdelek.vKosarico': 'Na košarico',
  'izdelek.zDdv': 'Cena vključuje DDV.',
  'izdelek.dostava': 'Pošiljamo s Pošto Slovenije v vse države EU.',
  'izdelek.odstop': '14 dni za odstop od nakupa brez navedbe razloga.',
  'izdelek.postnina': 'Brezplačna poštnina od {od}, sicer Slovenija {si}, ostale države EU {eu}.',
  'izdelek.slika': 'Slika {n}',
  'izdelek.poNarocilu': 'Izdelamo po naročilu: na pošto ga oddamo v 1–2 tednih.',
  'izdelek.brezOdstopa': 'Personaliziranih izdelkov ni mogoče vrniti (izdelek po meri).',
  'izdelek.digitalni': 'Kodo pošljemo po e-pošti takoj po plačilu. Brez dostave in poštnine.',
  'izdelek.bon': 'Bon velja 1 leto za izdelke v trgovini in se porabi v enem nakupu, brez ostanka. Ni ga mogoče zamenjati za gotovino.',

  'pers.naslov': 'Personalizacija',
  'pers.doplacilo': '+{cena}',
  'pers.neobvezno': 'neobvezno',
  'pers.ime_ekipe': 'Ime fantasy ekipe',
  'pers.izberiEkipo': 'Izberi ekipo',
  'pers.brezEkip': 'Pod tem računom nimaš fantasy ekipe. Ustvariš jo na slff.eu.',
  'pers.poljubno_ime': 'Ime na izdelku',
  'pers.imeNamig': '1–12 znakov: črke, presledek, pika ali vezaj.',
  'pers.napaka.prazno': 'Vpiši ime.',
  'pers.napaka.dolgo': 'Največ 12 znakov.',
  'pers.napaka.znaki': 'Dovoljene so le črke, presledek, pika in vezaj, vsaj ena črka.',
  'pers.stevilka': 'Številka',
  'pers.stevilkaNamig': 'Celo število od 0 do 99.',
  'pers.napaka.stevilka': 'Številka mora biti celo število od 0 do 99.',
  'pers.prvak': 'Mini liga, ki si jo osvojil',
  'pers.prvakOpis': '{liga} {sezona} · {ekipa}',
  'pers.niPrvak': 'Izdelek prvaka lahko kupi le lastnik ekipe, ki je zmagala v končani sezoni mini lige z vsaj 4 ekipami.',
  'pers.znacka': 'Ime na znački',
  'pers.niZnacka': 'Značko lahko naroči le igralec s potrjenim profilom in doživljenjsko preverjenostjo, ki značke še ni naročil.',
  'pers.prijava': 'Za ta izdelek se prijavi z računom SLFF.',
  'pers.predogled': 'Predogled',
  'pers.preverimo': 'Besedilo ob plačilu preverimo še enkrat: žaljivih in zaščitenih imen ne natisnemo.',

  'kosarica.naslov': 'Košarica',
  'kosarica.prazna': 'Košarica je prazna.',
  'kosarica.nakupuj': 'Na izdelke',
  'kosarica.odstrani': 'Odstrani',
  'kosarica.niVec': 'Ni več v prodaji. Odstrani ga iz košarice.',
  'kosarica.razprodano': 'Trenutno razprodano. Odstrani ga iz košarice.',
  'kosarica.vmesna': 'Vmesni seštevek',
  'kosarica.drzava': 'Država dostave',
  'kosarica.postnina': 'Poštnina',
  'kosarica.postninaOd': 'od {cena}',
  'kosarica.brezplacno': 'Brezplačno',
  'kosarica.doBrezplacne': 'Še {cena} do brezplačne poštnine.',
  'kosarica.postninaOpis': 'Nalepke pošljemo v Sloveniji s pismom, vse ostalo kot paket Pošte Slovenije. Končno poštnino vidiš in izbereš ob plačilu.',
  'kosarica.ddv': 'Cene vključujejo DDV. Poštnino in DDV po državi dostave dokončno izračunamo ob plačilu.',
  'kosarica.placaj': 'Na plačilo',
  'kosarica.poteka': 'Pripravljam plačilo …',
  'kosarica.gost': 'Kupiš lahko kot gost. Če se prijaviš z računom SLFF, naročilo vidiš med svojimi naročili.',
  'kosarica.pogoji': 'Pred plačilom potrdiš pogoje prodaje.',

  'kosarica.zmanjsaj': 'Na zalogi je le še nekaj kosov. Zmanjšaj količino.',
  'kosarica.posodobljena': 'Košarico smo posodobili: odstranili smo, česar ni več na voljo.',
  'kosarica.placano': 'To naročilo je že plačano. Potrditev je v tvoji e-pošti; košarico smo izpraznili.',
  'kosarica.potrdiOdstop': 'Razumem, da personaliziranih izdelkov ni mogoče vrniti.',
  'kosarica.bon': 'Darilni bon pošljemo po e-pošti po plačilu. Velja 1 leto, porabi se v enem nakupu brez ostanka. Največ 5 bonov na naročilo.',
  'kosarica.koda': 'Promocijsko kodo ali darilni bon vneseš na strani za plačilo.',
  'kosarica.digitalno': 'Brez dostave: kodo dobiš po e-pošti.',
  'kosarica.napacnaVrstica': 'Tega izdelka ne moremo sprejeti. Odstrani ga ali ga dodaj znova s strani izdelka.',

  'napaka.trgovina-zaloga': 'Za vse izdelke ni dovolj zaloge. Pri označenih izdelkih zmanjšaj količino in poskusi znova.',
  'napaka.trgovina-vnos': 'Košarica ni veljavna: največ 20 različnih izdelkov, 20 kosov posameznega in 50 kosov skupaj, vsi izdelki morajo biti v prodaji, največ 5 darilnih bonov. Preveri jo in poskusi znova.',
  'napaka.prevec': 'Preveč odprtih plačil. Poskusi znova čez približno pol ure.',
  'napaka.splosna': 'Nekaj je šlo narobe. Poskusi znova.',
  'napaka.nalaganje': 'Podatkov ni bilo mogoče naložiti. Osveži stran.',
  'napaka.trgovina-personalizacija': 'Personalizacije ni bilo mogoče potrditi: ekipa morda ni več tvoja, besedilo ni dovoljeno ali je značka že naročena. Preveri personalizirane izdelke.',
  'napaka.trgovina-prijava': 'Za izdelek z imenom ekipe, prvaka ali značko se prijavi.',
  'napaka.trgovina-besedilo': 'Imena te mini lige ne natisnemo. Odstrani označeni izdelek.',
  'napaka.trgovina-odstop': 'Potrdi, da personaliziranih izdelkov ni mogoče vrniti.',

  'hvala.naslov': 'Hvala za nakup!',
  'hvala.oznaka': 'Številka naročila',
  'hvala.opis': 'Potrditev naročila smo poslali na tvoj e-naslov. Ko paket oddamo na pošto, dobiš še sledilno številko.',
  'hvala.narocila': 'Moja naročila',
  'hvala.nazaj': 'Nazaj v trgovino',

  'narocila.naslov': 'Moja naročila',
  'narocila.prazno': 'Pod tem računom še ni naročil. Naročila, oddana kot gost, najdeš v e-pošti s potrditvijo.',
  'narocila.stanje.placano': 'Plačano, v pripravi',
  'narocila.stanje.poslano': 'Poslano',
  'narocila.stanje.preklicano': 'Preklicano',
  'narocila.stanje.vrnjeno': 'Vrnjeno',
  'narocila.stanje.v_izdelavi': 'V izdelavi',
  'narocila.stanje.dostavljeno': 'Dostavljeno',
  'narocila.naroceno': 'Naročeno {datum}',
  'narocila.poslano': 'Poslano {datum}',
  'narocila.sledilna': 'Sledilna številka: {st}',
  'narocila.postnina': 'Poštnina',
  'narocila.skupaj': 'Skupaj z DDV',

  'prijava.naslov': 'Prijava v SLFF Trgovino',
  'prijava.uvod': 'Prijaviš se z istim računom kot na slff.eu. Prijava ni obvezna: kupiš lahko tudi kot gost.',
  'prijava.eposta': 'E-pošta',
  'prijava.geslo': 'Geslo',
  'prijava.gumb': 'Prijava',
  'prijava.google': 'Prijava z Googlom',
  'prijava.napaka': 'Prijava ni uspela. Preveri e-pošto in geslo.',
  'prijava.brezRacuna': 'Še nimaš računa ali si pozabil geslo?',
  'prijava.slff': 'Uredi to na slff.eu',

  'odstop.naslov': 'Odstop od pogodbe',
  'odstop.uvod': 'Od nakupa lahko odstopiš v 14 dneh od prejema blaga, brez navedbe razloga. Izpolni obrazec: gumb odpre tvoj e-poštni program s pripravljenim sporočilom za info@slff.eu. Lahko nam pišeš tudi sam ali pošlješ obrazec po pošti.',
  'odstop.oznaka': 'Številka naročila',
  'odstop.ime': 'Ime in priimek',
  'odstop.naslovKupca': 'Naslov',
  'odstop.eposta': 'E-pošta',
  'odstop.izdelki': 'Izdelki, od katerih odstopaš',
  'odstop.naroceno': 'Datum naročila',
  'odstop.prejeto': 'Datum prejema',
  'odstop.poslji': 'Odpri e-pošto z obrazcem',
  'odstop.opomba': 'Če se e-poštni program ne odpre, pošlji iste podatke na info@slff.eu. Prejem odstopa ti potrdimo po e-pošti.',
  'odstop.vrnitev': 'Blago vrni najpozneje v 14 dneh od sporočila o odstopu na naslov: SPACE GUARDIAN d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija. Stroške vračila kriješ sam.',
  'odstop.zadeva': 'Odstop od pogodbe, naročilo {oznaka}',
  'odstop.telo': `Naslovnik: ${PRODAJALEC}, info@slff.eu\n\nObveščam, da odstopam od pogodbe o prodaji naslednjega blaga:\n{izdelki}\n\nŠtevilka naročila: {oznaka}\nDatum naročila: {naroceno}\nDatum prejema: {prejeto}\nIme potrošnika: {ime}\nNaslov potrošnika: {naslov}\nE-pošta: {eposta}\nDatum: {datum}`,
  'odstop.vzorecNaslov': 'Vzorčni obrazec za odstop od pogodbe',
  'odstop.vzorec': `(izpolnite in vrnite ta obrazec samo, če želite odstopiti od pogodbe)\n\n– Naslovnik: ${PRODAJALEC}, e-pošta info@slff.eu\n– Obveščam/obveščamo (*), da odstopam/odstopamo (*) od pogodbe o prodaji naslednjega blaga (*)/o opravljanju naslednje storitve (*)\n– Datum naročila (*)/datum prejema (*)\n– Ime potrošnika/potrošnikov\n– Naslov potrošnika/potrošnikov\n– Podpis potrošnika/potrošnikov (samo če se obrazec pošilja v papirni obliki)\n– Datum\n\n(*) Neustrezno prečrtajte.`,

  'pogoji.naslov': 'Splošni pogoji prodaje',
  'pogoji.velja': 'Pogoji z dne {verzija} veljajo za nakupe v spletni trgovini shop.slff.eu.',
  'pogoji.s1.naslov': '1. Prodajalec',
  'pogoji.s1.besedilo': `Prodajalec je ${PRODAJALEC}, vpisana v sodni register pri Okrožnem sodišču v Ljubljani, matična številka 9850538000, identifikacijska številka za DDV SI42765153 (v nadaljevanju: prodajalec ali mi).\n\nKontakt: info@slff.eu, telefon ${TELEFON}. Na isti naslov sprejemamo vprašanja, pritožbe in odstope od pogodbe.`,
  'pogoji.s2.naslov': '2. Uporaba pogojev in sklenitev pogodbe',
  'pogoji.s2.besedilo': 'Pogoji veljajo za vse nakupe v spletni trgovini shop.slff.eu. Kupec je lahko potrošnik ali pravna oseba; določbe o odstopu, skladnosti blaga in reševanju sporov, ki se sklicujejo na potrošnike, veljajo za potrošnike.\n\nKupec izbere izdelke v košarici, izbere državo dostave in nadaljuje na plačilo. Pred plačilom vidi vse izdelke, ceno z DDV, poštnino in skupni znesek ter potrdi te pogoje. Pogodba je sklenjena, ko je plačilo uspešno. Potrditev naročila z vsemi podatki pošljemo na e-naslov, ki ga kupec navede ob plačilu.\n\nPogodbo sklepamo v slovenskem ali angleškem jeziku; velja jezik, izbran ob nakupu. Naročilo hranimo v elektronski obliki; prijavljen kupec ga vidi pod "Moja naročila", vsak kupec pa ga ima v potrditvenem e-sporočilu.',
  'pogoji.s3.naslov': '3. Cene',
  'pogoji.s3.besedilo': 'Cene so v evrih in vključujejo DDV. DDV obračunamo po stopnji države dostave; znesek DDV je prikazan pred plačilom. Poštnina ni vključena v ceno izdelka in je prikazana pred plačilom; za naročila izdelkov v vrednosti 50 € ali več (brez darilnih bonov, pred popustom) je brezplačna.\n\nVelja cena, prikazana ob oddaji naročila. Če bi bila cena zaradi očitne napake napačna, kupca obvestimo in mu omogočimo, da naročilo potrdi po pravi ceni ali od njega odstopi s polnim vračilom plačila.\n\nPopuste dajemo s promocijskimi kodami, ki se vnesejo na strani za plačilo. Koda velja za izdelke in pogoje, navedene ob njej, ne velja za poštnino in je ni mogoče zamenjati za gotovino.\n\nDarilni bon je koda, ki jo po plačilu pošljemo po e-pošti; dostave ni. Velja 1 leto od nakupa za izdelke v trgovini (ne za poštnino in druge darilne bone), uporabi se enkrat in v celoti: če je nakup manjši od vrednosti bona, ostanek ne ostane. Bona ni mogoče zamenjati za gotovino. V enem naročilu je mogoče kupiti največ 5 bonov.',
  'pogoji.s4.naslov': '4. Plačilo',
  'pogoji.s4.besedilo': 'Plača se vnaprej s plačilno kartico. Kartico lahko uporabite tudi prek digitalne denarnice (na primer Apple Pay ali Google Pay), če jo plačilna stran ponudi. Plačilo obdeluje Stripe Payments Europe, Ltd.; podatkov plačilne kartice ne prejmemo in ne hranimo.\n\nIzdelke rezerviramo za približno 30 minut od začetka plačila. Če plačilo v tem času ni opravljeno, se naročilo prekliče in zaloga sprosti.',
  'pogoji.s5.naslov': '5. Dostava',
  'pogoji.s5.besedilo': 'Dostavljamo v države Evropske unije s Pošto Slovenije. Nalepke v Sloveniji lahko pošljemo s pismom, druge izdelke pošljemo kot paket. Poštnina je odvisna od države dostave in vrste pošiljke in je prikazana pred plačilom. Naročilo oddamo na pošto v dveh delovnih dneh po plačilu.\n\nOkvirni roki dostave od oddaje na pošto so: pismo v Sloveniji 1–3 delovne dni, paket v Sloveniji 2–4 delovne dni, paket v drugo državo EU 4–10 delovnih dni. Ko pošiljko oddamo, kupcu pošljemo sledilno številko. Naročilo dostavimo najpozneje v 30 dneh od sklenitve pogodbe; če to ni mogoče, kupca obvestimo in lahko od pogodbe odstopi s polnim vračilom plačila.\n\nKupec ob prevzemu preveri pošiljko. Poškodovano ali nepopolno pošiljko naj čim prej sporoči na info@slff.eu, po možnosti s fotografijo.\n\nPersonalizirane izdelke (z imenom ekipe, poljubnim imenom ali številko, izdelke prvaka in značke) izdelamo po naročilu; na pošto jih oddamo v 1–2 tednih po plačilu. Naročilo z izdelki na zalogi in personaliziranimi izdelki pošljemo skupaj, ko je vse izdelano.',
  'pogoji.s6.naslov': '6. Odstop od pogodbe',
  'pogoji.s6.besedilo': 'Potrošnik lahko v 14 dneh od dneva, ko on ali tretja oseba, ki ni prevoznik in jo je določil potrošnik, prevzame blago, odstopi od pogodbe brez navedbe razloga. Pri naročilu več kosov, dostavljenih ločeno, rok teče od prevzema zadnjega kosa.\n\nZa odstop nas obvestite z nedvoumno izjavo, na primer po e-pošti na info@slff.eu ali po pošti na naslov prodajalca. Uporabite lahko obrazec na strani "Odstop od pogodbe" ali vzorčni obrazec spodaj, ni pa obvezno. Rok je upoštevan, če obvestilo pošljete pred njegovim iztekom.\n\nBlago vrnite brez nepotrebnega odlašanja, najpozneje v 14 dneh od dneva, ko ste nam sporočili odstop, na naslov SPACE GUARDIAN d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija. Neposredne stroške vračila blaga krijete sami.\n\nVse prejete plačila, vključno s stroški dostave (razen dodatnih stroškov, če ste izbrali dražjo vrsto dostave od najcenejše, ki jo ponujamo), vrnemo brez nepotrebnega odlašanja, najpozneje v 14 dneh od dneva, ko smo prejeli obvestilo o odstopu. Vračilo opravimo z enakim plačilnim sredstvom, kot ste ga uporabili ob nakupu, razen če se izrecno dogovorimo drugače; dodatnih stroškov zaradi vračila ne zaračunamo. Vračilo lahko zadržimo, dokler blaga ne prejmemo ali dokler ne dokažete, da ste ga poslali, kar nastopi prej.\n\nOdgovarjate le za zmanjšanje vrednosti blaga, ki je posledica ravnanja, ki ni nujno za ugotovitev narave, značilnosti in delovanja blaga (na primer nošenje ali pranje oblačil).\n\nPravice do odstopa ni pri blagu, izdelanem po navodilih potrošnika ali prilagojenem njegovim osebnim potrebam (personalizirani izdelki).',
  'pogoji.s7.naslov': '7. Skladnost blaga (stvarna napaka) in garancija',
  'pogoji.s7.besedilo': 'Za skladnost blaga s pogodbo odgovarjamo po Zakonu o varstvu potrošnikov (ZVPot-1). Odgovarjamo za neskladnost, ki obstaja ob dobavi in se pokaže v dveh letih od dobave. Za neskladnost, ki se pokaže v enem letu od dobave, se domneva, da je obstajala že ob dobavi.\n\nPotrošnik nas o neskladnosti obvesti v dveh mesecih od dneva, ko jo je odkril, na info@slff.eu, z opisom napake in po možnosti s fotografijo. Na zahtevek odgovorimo v osmih dneh od prejema. Potrošnik lahko zahteva, da blago spravimo v skladnost s popravilom ali zamenjavo, brez stroškov zanj; to storimo v razumnem roku, ki ne presega 30 dni. Če to ni mogoče ali ni opravljeno v razumnem roku, lahko zahteva sorazmerno znižanje kupnine ali odstopi od pogodbe in dobi vrnjeno kupnino.\n\nZa izdelke v trgovini ni predpisana obvezna garancija za brezhibno delovanje in komercialne garancije ne dajemo. To ne vpliva na pravice zaradi neskladnosti blaga.',
  'pogoji.s8.naslov': '8. Pritožbe in reševanje sporov',
  'pogoji.s8.besedilo': 'Pritožbe sprejemamo na info@slff.eu ali po pošti na naslov prodajalca. Prejem pritožbe potrdimo v petih delovnih dneh, sporočimo, v kolikšnem času jo bomo obravnavali, in kupca obveščamo o poteku postopka.\n\nSPACE GUARDIAN d.o.o. ne pristaja na sodelovanje v postopkih izvensodnega reševanja potrošniških sporov (IRPS) in nobenega izvajalca IRPS ne priznava kot pristojnega za reševanje sporov s potrošniki. Pritožbe in spore rešujemo neposredno s kupcem na info@slff.eu. Seznam izvajalcev IRPS objavlja pristojno ministrstvo na portalu gov.si.\n\nZa pogodbo velja pravo Republike Slovenije. Za spore je pristojno stvarno in krajevno pristojno sodišče po zakonu; potrošnik lahko toži tudi pred sodiščem svojega prebivališča. To ne omejuje pravic, ki jih ima potrošnik po obveznih predpisih države svojega prebivališča.',
  'pogoji.s9.naslov': '9. Varstvo osebnih podatkov',
  'pogoji.s9.besedilo': 'Ime, e-naslov, naslov za dostavo in podatke o naročilu (tudi besedilo personalizacije in ime fantasy ekipe na izdelku) obdelujemo za izvedbo naročila, dostavo, obveščanje o naročilu in izpolnjevanje zakonskih obveznosti (na primer hrambe računovodskih listin). Podatke prejmeta Stripe za plačilo in Pošta Slovenije za dostavo, besedilo personalizacije pa tiskarna, ki izdelek izdela. Več o obdelavi in pravicah posameznika je na strani o zasebnosti na slff.eu.',
  'pogoji.s10.naslov': '10. Končne določbe',
  'pogoji.s10.besedilo': 'Pogoje lahko spremenimo. Za posamezen nakup veljajo pogoji, objavljeni ob oddaji naročila. Kodeksa ravnanja, ki bi nas zavezoval, ni.',
  'pogoji.odstopObrazec': 'Odpri obrazec za odstop',
  'pogoji.zasebnost': 'Zasebnost na slff.eu',

  'admin.naslov': 'Administracija trgovine',
  'admin.niAdmin': 'To stran lahko odprejo le administratorji SLFF.',
  'admin.zavihek.pakiranje': 'Za pakiranje',
  'admin.zavihek.poslano': 'Poslano',
  'admin.zavihek.izdelki': 'Izdelki',
  'admin.prazno': 'Ni naročil.',
  'admin.manjka': 'Manjka kosov: {n} — preveri zalogo',
  'admin.dostava': 'Dostava: {kljuc}',
  'admin.natisniNalepko': 'Natisni nalepko',
  'admin.natisniDobavnico': 'Natisni dobavnico',
  'admin.sledilna': 'Sledilna številka',
  'admin.poslano': 'Poslano',
  'admin.popraviSledilno': 'Popravi sledilno',
  'admin.mailNi': 'Naročilo je označeno kot poslano, mail kupcu pa ni odšel: {napaka}',
  'admin.tisk.posiljatelj': 'Pošiljatelj',
  'admin.tisk.prejemnik': 'Prejemnik',
  'admin.tisk.naslovPosiljatelja': 'SPACE GUARDIAN d.o.o.\nUlica Hermana Potočnika 5\n1000 Ljubljana\nSlovenija',
  'admin.tisk.dobavnica': 'Dobavnica',
  'admin.tisk.kolicina': 'Količina',
  'admin.tisk.izdelek': 'Izdelek',
  'admin.tisk.sku': 'Šifra',
  'admin.tisk.hvala': 'Hvala za nakup! Vprašanja in odstop: info@slff.eu.',
  'admin.aktiven': 'V prodaji',
  'admin.neaktiven': 'Skrit',
  'admin.zalogaSkupaj': 'zaloga {n}',
  'admin.razlicice': 'Različice',
  'admin.novIzdelek': 'Nov izdelek',
  'admin.novaRazlicica': 'Nova različica',
  'admin.shrani': 'Shrani',
  'admin.dodaj': 'Dodaj',
  'admin.shranjeno': 'Shranjeno.',
  'admin.odstrani': 'Odstrani',
  'admin.napacnaCena': 'Cena mora biti v evrih, npr. 25 ali 25,00.',
  'admin.napacnoStevilo': 'Vpiši celo število.',
  'admin.p.slug': 'Naslov (slug)',
  'admin.p.imeSl': 'Ime (sl)',
  'admin.p.imeEn': 'Ime (en)',
  'admin.p.opisSl': 'Opis (sl)',
  'admin.p.opisEn': 'Opis (en)',
  'admin.p.kategorija': 'Kategorija',
  'admin.p.taxCode': 'Davčna koda Stripe',
  'admin.p.vrstniRed': 'Vrstni red',
  'admin.p.pismo': 'Lahko gre kot pismo',
  'admin.slike': 'Slike',
  'admin.dodajSliko': 'Dodaj sliko (JPG, PNG ali WebP, največ 5 MB)',
  'admin.slikaNapacna': 'Slika mora biti JPG, PNG ali WebP in manjša od 5 MB.',
  'admin.slikaLevo': 'Premakni levo',
  'admin.slikaDesno': 'Premakni desno',
  'admin.r.oznakaSl': 'Oznaka (sl)',
  'admin.r.oznakaEn': 'Oznaka (en)',
  'admin.r.sku': 'SKU',
  'admin.r.cena': 'Cena (€)',
  'admin.r.teza': 'Teža (g)',
  'admin.r.dodaj': 'Dodaj/odvzemi kose',
  'admin.r.zacetna': 'Začetna zaloga',
  'admin.r.aktivna': 'Aktivna',
  'admin.r.stanje': 'Zaloga {zaloga}, na voljo {voljo} (po rezervacijah), cena {cena}',
  'admin.zavihek.tisk': 'Za tisk',
  'admin.zavihek.boni': 'Boni',
  'admin.zaPakiranjeOpomba': 'Naročilo s personaliziranimi izdelki se pokaže tu, ko je natisnjeno vse. Darilni boni in značke se ne pakirajo tu.',
  'admin.tisk.prazno': 'Ni postavk za tisk.',
  'admin.tisk.novaSerija': 'Nova serija iz izbranih ({n})',
  'admin.tisk.serije': 'Serije',
  'admin.tisk.serija': 'Serija {id}',
  'admin.tisk.ustvarjena': 'ustvarjena {datum}',
  'admin.tisk.poslana': 'poslana tiskarni {datum}',
  'admin.tisk.natisnjena': 'natisnjena {datum}',
  'admin.tisk.postavk': 'postavk: {n}',
  'admin.tisk.odpri': 'Odpri',
  'admin.tisk.nazaj': 'Vse serije',
  'admin.tisk.csv': 'Prenesi CSV',
  'admin.tisk.vsiSvg': 'Prenesi vse',
  'admin.tisk.motiv': 'Motiv',
  'admin.tisk.postopek': 'Postopek',
  'admin.tisk.cona': 'Cona',
  'admin.tisk.kos': 'Kos',
  'admin.tisk.vsiKosi': 'list vseh',
  'admin.tisk.mere': 'Mere (mm)',
  'admin.tisk.barveNiti': 'Barve niti',
  'admin.tisk.brezPredloge': 'Motiv {motiv} nima predloge v aplikaciji: datotek za tisk ni, postavke ne pošlji tiskarni.',
  'admin.tisk.poslano': 'Poslano tiskarni',
  'admin.tisk.natisnjeno': 'Natisnjeno',
  'admin.tisk.oznaka': 'Naročilo',
  'admin.tisk.postavka': 'Postavka',
  'admin.tisk.besedilo': 'Besedilo',
  'admin.tisk.stevilka': 'Številka',
  'admin.tisk.neuspeleDatoteke': 'Teh datotek ni bilo mogoče pripraviti (PNG velikega lista v telefonu včasih ne uspe, uporabi računalnik): {datoteke}',
  'admin.zavihek.motivi': 'Motivi',
  'admin.motivi.prazno': 'Ni motivov.',
  'admin.motivi.brezPredloge': 'Ta izdaja trgovine nima predloge za ta motiv: ne bo se pokazal.',
  'admin.motivi.doplacila': 'Doplačilo po nosilcu (€, prazno = motiva ni na izdelku)',
  'admin.motivi.primeri': 'Primeri (JSON, preveri jih baza)',
  'admin.motivi.napacenJson': 'Primeri niso veljaven JSON (pričakovan je seznam).',
  'admin.motivi.napacnoDoplacilo': 'Doplačilo mora biti v evrih, npr. 8 ali 8,50, ali prazno.',
  'admin.boni.izdani': 'Izdani darilni boni',
  'admin.boni.prazno': 'Ni izdanih bonov.',
  'admin.boni.koda': 'koda …{konec}',
  'admin.boni.velja': 'velja do {datum}',
  'admin.boni.porabljen': 'porabljen {datum}',
  'admin.boni.neporabljen': 'ni porabljen',
  'admin.boni.nov': 'Nova koda za Scout ali preverjene',
  'admin.boni.za': 'Velja za',
  'admin.boni.scout': 'SLFF Scout (naročnina kluba)',
  'admin.boni.preverjen': 'Preverjeni igralci in značka',
  'admin.boni.odstotek': 'Odstotek (%)',
  'admin.boni.znesek': 'Znesek (€)',
  'admin.boni.vrednost': 'Vrednost',
  'admin.boni.uporab': 'Največ uporab',
  'admin.boni.do': 'Velja do',
  'admin.boni.ustvari': 'Ustvari kodo',
  'admin.boni.ustvarjena': 'Koda {koda} je ustvarjena. Prepiši jo zdaj: pozneje je ne pokažemo več.',
  'admin.boni.napaka': 'Kode ni bilo mogoče ustvariti: {napaka}',
  'admin.boni.napacno': 'Odstotek od 1 do 100 ali znesek v evrih, uporab od 1 do 1000, rok v prihodnosti (največ 2 leti).',
  'admin.boni.znova': 'Pošlji bon znova',
  'admin.boni.poslan': 'Kode naročila {oznaka} so znova poslane na {email}.',
  'admin.boni.napakaZnova': 'Bona ni bilo mogoče poslati znova: {napaka}',
  'admin.zavihek.vsa': 'Vsa naročila',
  'admin.stanje.caka_placilo': 'Čaka plačilo',
  'admin.stanje.placano': 'Plačano',
  'admin.stanje.v_izdelavi': 'V izdelavi',
  'admin.stanje.poslano': 'Poslano',
  'admin.stanje.dostavljeno': 'Dostavljeno',
  'admin.stanje.preklicano': 'Preklicano',
  'admin.stanje.vrnjeno': 'Vrnjeno',
  'admin.stanje.poteklo': 'Poteklo',
  'admin.vsa.vsa': 'Vsa',
  'admin.vsa.isci': 'Išči po oznaki, e-pošti ali imenu',
  'admin.vsa.stran': '{od}–{do} od {skupaj}',
  'admin.vsa.prejsnja': 'Prejšnja',
  'admin.vsa.naslednja': 'Naslednja',
  'admin.vsa.gost': 'brez imena',
  'admin.vsa.zapri': 'Zapri',
  'admin.vsa.naslov': 'Naslov za dostavo',
  'admin.vsa.ddv': 'od tega DDV',
  'admin.vsa.popust': 'Popust',
  'admin.vsa.stripe': 'Plačilo v Stripe',
  'admin.vsa.stripeNacin': 'Način plačila (testni ali živi) ni znan: povezava vodi v živi Dashboard. Testno plačilo najdeš z vklopljenim Test mode.',
  'admin.vsa.zgodovina': 'Zgodovina',
  'admin.vsa.brezZgodovine': 'Ni zapisov (naročilo je starejše od zgodovine stanj).',
  'admin.vsa.samodejno': 'samodejno',
  'admin.vsa.dejanja': 'Spremeni stanje',
  'admin.vsa.v.v_izdelavi': 'V izdelavo',
  'admin.vsa.v.placano': 'Nazaj na plačano',
  'admin.vsa.v.poslano': 'Poslano (sledilna številka)',
  'admin.vsa.v.dostavljeno': 'Dostavljeno',
  'admin.vsa.v.preklicano': 'Prekliči naročilo',
  'admin.vsa.opomba': 'Opomba (neobvezno, vidi jo le admin)',
  'admin.vsa.potrdi': 'Potrdi: {stanje}',
  'admin.vsa.nazaj': 'Nazaj',
  'admin.vsa.vraciloOpozorilo': 'Naročilo je plačano: preklic denarja ne vrne. Vrni ga v Stripe; vračilo naročilo nato premakne v Vrnjeno. Kode darilnih bonov veljajo do vračila.',
  'admin.vsa.vraciloPotrebno': 'Naročilo je preklicano. Denar vrni v Stripe:',
}

export type Kljuc = keyof typeof SL

export type Slovar = Record<Kljuc, string>
export type { Jezik } from './jezik.ts'

// Slovenščina je v svežnju (izvor, rezerva in smoke), drugi jeziki so vsak svoj kos,
// ki ga main.tsx naloži pred prvim izrisom (naloziSlovar).
const NALAGALNIKI: Record<Exclude<Jezik, 'sl'>, () => Promise<{ default: Slovar }>> = {
  en: () => import('./jeziki/en.ts'),
  az: () => import('./jeziki/az.ts'),
  cs: () => import('./jeziki/cs.ts'),
  da: () => import('./jeziki/da.ts'),
  de: () => import('./jeziki/de.ts'),
  el: () => import('./jeziki/el.ts'),
  es: () => import('./jeziki/es.ts'),
  et: () => import('./jeziki/et.ts'),
  hr: () => import('./jeziki/hr.ts'),
  hu: () => import('./jeziki/hu.ts'),
  hy: () => import('./jeziki/hy.ts'),
  lv: () => import('./jeziki/lv.ts'),
  mk: () => import('./jeziki/mk.ts'),
  pl: () => import('./jeziki/pl.ts'),
  ro: () => import('./jeziki/ro.ts'),
  sk: () => import('./jeziki/sk.ts'),
  sr: () => import('./jeziki/sr.ts'),
  tr: () => import('./jeziki/tr.ts'),
  uk: () => import('./jeziki/uk.ts'),
}
/** Slovar jezika (smoke, predogledi); slovenščina takoj. */
export const slovar = (j: Jezik): Promise<Slovar> => (j === 'sl' ? Promise.resolve(SL) : NALAGALNIKI[j]().then((m) => m.default))

const SHRAMBA = 'slff-shop-jezik'

// ?lang= (povezava s slff.eu) obvelja in se zapomni; iz naslova ga odstranimo,
// da ga deljena povezava ne nosi naprej.
function izberi(): Jezik {
  if (typeof window === 'undefined') return 'sl'
  const iskanje = new URLSearchParams(location.search)
  const param = iskanje.get('lang')
  let shranjen: string | null = null
  try {
    shranjen = localStorage.getItem(SHRAMBA)
  } catch {}
  const j = izberiJezikIz({ param, shranjen, brskalnik: navigator.languages?.length ? navigator.languages : [navigator.language] })
  if (param !== null) {
    try {
      if (jezikIzOznake(param)) localStorage.setItem(SHRAMBA, j)
    } catch {}
    iskanje.delete('lang')
    const q = iskanje.toString()
    history.replaceState(history.state, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`)
  }
  return j
}

/** Jezik se izbere ob nalaganju; zamenjava stran naloži znova. */
export const jezik: Jezik = izberi()
let SLOVAR: Slovar = SL
const LOKAL = LOKALE[jezik]

/** Pred prvim izrisom (main.tsx): slovar izbranega jezika. Ob napaki ostane slovenščina. */
export async function naloziSlovar(): Promise<void> {
  if (jezik === 'sl') return
  try {
    SLOVAR = await slovar(jezik)
  } catch (e) {
    console.error('Slovarja ni bilo mogoče naložiti', e)
  }
}

export function t(k: Kljuc, p?: Record<string, string | number>): string {
  return (SLOVAR[k] ?? SL[k]).replace(/\{(\w+)\}/g, (cel, ime: string) => (p && ime in p ? String(p[ime]) : cel))
}

export function izberiJezik(j: Jezik): void {
  try {
    localStorage.setItem(SHRAMBA, j)
  } catch {}
  location.reload()
}

export const datum = (d: string): string =>
  new Date(d).toLocaleDateString(LOKAL, { day: 'numeric', month: 'long', year: 'numeric' })

const EVRI = new Intl.NumberFormat(LOKAL, { style: 'currency', currency: 'EUR' })
/** Centi → "25,00 €" (sl) ali "€25.00" (en). */
export const cena = (centi: number): string => EVRI.format(centi / 100)

const DRZAVE = new Intl.DisplayNames([LOKAL], { type: 'region' })
export const imeDrzave = (koda: string): string => DRZAVE.of(koda) ?? koda

/** Besedilo iz baze (ime, opis, oznaka) v jeziku strani; brez prevoda angleško. */
export const po = (sl: string, en: string, prevod?: string | null): string =>
  jezik === 'sl' ? sl : jezik === 'en' ? en : prevod || en

/**
 * Prevedeno polje vrstice iz baze: `<polje>_sl`/`<polje>_en` (stolpca) in prevodi
 * drugih jezikov, bodisi v stolpcu `prevodi` ({de: {ime, opis}}) bodisi v vrstici
 * kot `<polje>_<jezik>` (polja, sheme in možnosti motivov v JSON).
 */
export function pr(o: object, polje: string, j: Jezik = jezik): string {
  const x = o as Record<string, unknown>
  const prevodi = x.prevodi as Record<string, Record<string, unknown> | undefined> | null | undefined
  const kandidati = j === 'sl' ? [x[`${polje}_sl`]] : [prevodi?.[j]?.[polje], x[`${polje}_${j}`], x[`${polje}_en`]]
  const v = kandidati.find((k) => typeof k === 'string' && k !== '')
  return typeof v === 'string' ? v : ''
}

/**
 * Slike z natisnjenim motivom (scripts/trgovina-hero.mjs) imajo različico v vsakem
 * jeziku: /nosilci/hero-<scena>[-1000].webp, katalog-<nosilec>.webp → …-<jezik>.webp
 * (le 1000 px). Slovenščina ostane pri izvirni; druge slike so nespremenjene.
 */
export function slikaJezika(src: string, j: Jezik = jezik): string {
  if (j === 'sl') return src
  return src.replace(/(\/nosilci\/(?:hero-[a-z]+|katalog-[a-z]+))(?:-1000)?\.webp$/, `$1-${j}.webp`)
}
