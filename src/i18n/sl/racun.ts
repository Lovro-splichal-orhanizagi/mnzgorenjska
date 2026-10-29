// Nizi za področje `racun` (glej src/i18n/index.tsx).
export const racun = {
  // Stran Prijava: prijava, registracija, pozabljeno geslo.
  prijava: {
    naslovPrijava: 'Prijava',
    naslovRegistracija: 'Registracija',
    naslovPozabljeno: 'Pozabljeno geslo',
    googleNiNaVoljo: 'Prijava z Googlom trenutno ni na voljo. Uporabi e-pošto.',
    appleNiNaVoljo: 'Prijava z Applom trenutno ni na voljo. Uporabi e-pošto.',
    poslanaPonastavitev:
      'Poslali smo ti povezavo za ponastavitev gesla. Preveri e-pošto (tudi vsiljeno).',
    racunUstvarjen:
      'Račun je ustvarjen. Na e-pošto smo poslali potrditveno povezavo — odpri jo in se vrni.',
    prijavljenKot: 'Prijavljen si kot {email}.',
    posljiPotrditevZnova: 'Pošlji potrditveni e-mail znova',
    potrditevPoslanaZnova:
      'Poslali smo nov potrditveni e-mail. Poglej tudi v vsiljeno pošto.',
    zGooglom: 'Nadaljuj z Googlom',
    zApplom: 'Nadaljuj z Applom',
    aliZEposto: 'ali z e-pošto',
    prikaznoIme: 'Prikazno ime',
    eposta: 'E-pošta',
    geslo: 'Geslo',
    posiljam: 'Pošiljam …',
    ustvariRacun: 'Ustvari račun',
    posljiPovezavo: 'Pošlji povezavo',
    gumbPrijava: 'Prijava',
    zeImasRacun: 'Že imaš račun? Prijavi se',
    nimasRacuna: 'Nimaš računa? Registriraj se',
    pozabljenoGeslo: 'Pozabljeno geslo?',
    nazajNaPrijavo: '← Nazaj na prijavo',
    predlogEposte: 'Ste mislili {eposta}?',
  },
  // Napake Supabase Auth, prevedene v lib/prijava.
  napake: {
    napacnaPrijava: 'Napačen e-naslov ali geslo.',
    niPotrjen: 'E-naslov še ni potrjen. Klikni povezavo v sporočilu, ki smo ti ga poslali.',
    zeRegistriran: 'Ta e-naslov je že registriran. Prijavi se ali ponastavi geslo.',
    prevecPoskusov: 'Preveč poskusov. Počakaj nekaj minut in poskusi znova.',
    sibkoGeslo: 'Geslo je prešibko. Uporabi vsaj 6 znakov, najbolje mešanico črk in številk.',
    istoGeslo: 'Novo geslo mora biti drugačno od starega.',
    neveljavenNaslov: 'E-naslov ni veljaven.',
  },
  novoGeslo: {
    naslov: 'Novo geslo',
    gesliSeNeUjemata: 'Gesli se ne ujemata.',
    preverjam: 'Preverjam povezavo …',
    neveljavna:
      'Povezava ni veljavna ali je potekla. Na strani za <prijava>prijavo</prijava> znova zahtevaj ponastavitev gesla.',
    novoGeslo: 'Novo geslo',
    ponovi: 'Ponovi geslo',
    shranjujem: 'Shranjujem …',
    shrani: 'Shrani geslo',
  },
  opomniki: {
    naslov: 'Obvestila',
    napakaNalaganja: 'Nastavitve ni bilo mogoče naložiti.',
    napakaShranjevanja: 'Shranjevanje ni uspelo. Poskusi znova.',
    nalagam: 'Nalagam …',
    moraPrijava: 'Za urejanje opomnikov se moraš <prijava>prijaviti</prijava>.',
    opis: 'Pred rokom kroga ti pošljemo kratko sporočilo na {email}, da ne pozabiš urediti ekipe.',
    posiljaj: 'E-poštni opomniki',
    shranjujem: 'Shranjujem …',
    vklopljeni: 'Opomniki so vklopljeni.',
    izklopljeni: 'Opomnikov ti ne bomo več pošiljali.',
    odjavaVprasanje: 'Ne želiš več dobivati e-pošte SLFF (opomnikov pred rokom in obvestil o ekipi)?',
    odjavaGumb: 'Odjavi me',
    odjavaNapaka: 'Povezava ni veljavna. Prijavi se in opomnike izklopi v nastavitvah.',
    push: 'Potisna obvestila',
    pushOpis: 'Dan pred rokom ti telefon pove, če ekipa še ni pripravljena.',
    pushVklopljena: 'Potisna obvestila so vklopljena.',
    pushIzklopljena: 'Potisnih obvestil ti ne bomo več pošiljali.',
    pushZavrnjeno: 'Obvestila so v telefonu izklopljena. Vklopi jih v Nastavitve → SLFF → Obvestila.',
    pushDovoli: 'Dovoli obvestila',
    povezava: 'Nastavitve obvestil',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Potrjujem …',
    preverjam: 'Preverjam povezavo …',
    neveljavna: 'Povezava ni več veljavna ali je že bila uporabljena. <prijava>Prijavi se</prijava> ali zahtevaj novo.',
  },
  // Nastavitve računa (slff.eu/account): profil, klub, jezik, obvestila,
  // zasebnost, geslo. Izbris je spodaj (`izbris`).
  nastavitve: {
    naslov: 'Nastavitve računa',
    moraPrijava: 'Za urejanje računa se moraš <prijava>prijaviti</prijava>.',
    nalagam: 'Nalagam …',
    napakaNalaganja: 'Nastavitev ni bilo mogoče naložiti.',
    shranjujem: 'Shranjujem …',
    shranjeno: 'Shranjeno.',
    napakaShranjevanja: 'Shranjevanje ni uspelo. Poskusi znova.',
    profilNaslov: 'Profil',
    mojProfil: 'Poglej svoj javni profil',
    prikaznoIme: 'Prikazno ime',
    imeOpis: 'Vidijo ga drugi na lestvicah. Od 3 do 24 znakov, spremeniš ga lahko enkrat na 7 dni.',
    imeNaslednjic: 'Ime lahko znova spremeniš {datum}.',
    shraniIme: 'Shrani ime',
    avatar: 'Avatar',
    avatarOpis: 'Izberi barvo ter začetnice ali nogometno ikono.',
    barva: 'Barva',
    barvaN: 'Barva {n}',
    slika: 'Slika',
    zacetnice: 'Začetnice',
    ikone: {
      zoga: 'Žoga',
      gol: 'Gol',
      pokal: 'Pokal',
      copat: 'Kopačka',
      rokavice: 'Vratarske rokavice',
      dres: 'Dres',
      zastavica: 'Kotna zastavica',
      navijac: 'Navijač',
    },
    klubNaslov: 'Klub, za katerega navijaš',
    klubOpis: 'Pokaže se na tvojem profilu, tvoje točke pa štejejo med navijače kluba.',
    klubIsci: 'Poišči klub …',
    klubNiZadetkov: 'Nobenega kluba ne najdem.',
    klubBrez: 'Kluba še nisi izbral.',
    klubOdstrani: 'Odstrani klub',
    jezikNaslov: 'Jezik in država',
    jezikOpis: 'Jezik strani in država, katere lige vidiš. Izbira velja v tem brskalniku.',
    obvestilaNaslov: 'Obvestila',
    zasebnostNaslov: 'Zasebnost',
    javniProfil: 'Javni profil',
    javniProfilOpis: 'Drugi na tvojem profilu vidijo tvoje ekipe, klub in dosežke. Izklopljen profil pokaže le prikazno ime.',
    prijavaNaslov: 'Prijava in geslo',
    prijavljenZ: 'Prijavljen si z e-naslovom {email}.',
    geslo: 'Spremeni geslo',
    gesloOpis: 'Na e-naslov ti pošljemo povezavo, s katero nastaviš novo geslo.',
    gesloPoslano: 'Povezavo smo poslali na {email}. Preveri e-pošto (tudi vsiljeno).',
    gesloNapaka: 'Povezave ni bilo mogoče poslati. Poskusi znova čez nekaj minut.',
    eposta: 'Za spremembo e-naslova nam piši na <eposta>info@slff.eu</eposta>.',
    // Napake prikaznega imena (koda iz baze, `hint`).
    napake: {
      dolzina: 'Prikazno ime mora imeti od 3 do 24 znakov.',
      znaki: 'Prikazno ime vsebuje nedovoljene znake.',
      rezervirano: 'To ime je rezervirano za ekipo SLFF. Izberi drugo.',
      neprimerno: 'To ime ni primerno. Izberi drugo.',
      prepogosto: 'Prikazno ime lahko spremeniš enkrat na 7 dni.',
      zasedeno: 'To prikazno ime je že zasedeno.',
    },
  },
  // Javna stran profila (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Tega profila ni. Morda je bil račun izbrisan.',
    nazaj: 'Na lestvico',
    zaseben: 'Ta profil je zaseben.',
    tvojZaseben: 'Tvoj profil je zaseben: drugi vidijo le prikazno ime.',
    uredi: 'Uredi profil',
    clanOd: 'Član od {datum}',
    navija: 'Navija za',
    ekipe: 'Ekipe',
    brezEkip: 'V aktivnih ligah še nima ekipe.',
    mesto: '{mesto}. mesto od {ekip}',
    miniLige: 'Skupne mini lige',
    dosezki: 'Dosežki',
    sezone: 'Sezone',
    krogi: 'Odigrani krogi',
    najboljsiKrog: 'Najboljši krog',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Izbris računa',
    moraPrijava: 'Za izbris računa se moraš <prijava>prijaviti</prijava>.',
    opis: 'Izbrisali bomo račun {email}: profil, vse tvoje ekipe z zgodovino točk, glasove in mini lige, ki si jih ustvaril. Izbrisa ni mogoče preklicati. Z izbrisom preneha tudi značka preverjenega igralca, naročnina pa se ustavi brez vračila.',
    gumb: 'Izbriši račun',
    potrdi: 'Da, izbriši za vedno',
    preklici: 'Prekliči',
    brisem: 'Brišem …',
    napaka: 'Računa ni bilo mogoče izbrisati: {napaka}',
  },
  // Zasebnost in pogoji. <b> je krepko, ostale oznake so povezave.
  pravno: {
    naslov: 'Zasebnost in pogoji',
    zadnjaSprememba: 'Zadnja sprememba: 16. oktober 2026',
    kajJeNaslov: 'Kaj je SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) je navijaška fantasy liga za slovenske medobčinske nogometne lige. Vodimo jo ljubiteljsko in ni povezana z medobčinskimi nogometnimi zvezami, NZS ali s klubi. Igra je brezplačna in brez denarnih vložkov ali nagrad.',
    podatkiNaslov: 'Kateri podatki se hranijo',
    podatkiEposta:
      '<b>E-poštni naslov in geslo.</b> Rabimo ju za prijavo. Geslo je shranjeno šifrirano in ga ne vidimo.',
    podatkiIme:
      '<b>Prikazno ime in ime ekipe.</b> Vidna sta na lestvici. Če nočeš svojega imena, uporabi vzdevek.',
    podatkiEkipa:
      '<b>Tvoja ekipa in glasovi.</b> Sestava kadra, kapetan, prestopi in glasovi o asistencah ali pozicijah.',
    podatkiNaprava:
      '<b>Žeton naprave za obvestila.</b> Če v mobilni aplikaciji dovoliš obvestila, shranimo žeton, prek katerega ti pošljemo opomnik pred rokom kroga. Ob odjavi ga izbrišemo.',
    neHranimo:
      'Telefonske številke in podatkov plačilne kartice ne hranimo, naslova pa le, če naročiš natisnjeno značko (glej spodaj). Piškotkov za sledenje in oglaševalskih orodij ne uporabljamo. V brskalniku so shranjeni tvoja prijavna seja, oznaka pogovora v klepetu za pomoč, če ga odpreš, in oznake seje, s katerimi preštejemo obisk strani le enkrat. Koliko ljudi je odprlo katero stran, štejemo le kot dnevni seštevek — brez tvojega imena, računa, naprave ali naslova IP. Splošno statistiko obiska (katere strani, od kod obiskovalci pridejo, vrsta naprave in država, nekaj dejanj, kot je sestava ekipe) beleži <b>Umami</b> na našem strežniku: brez piškotkov, naslova IP ne shrani in obiska ne poveže s tvojim računom. Če ima brskalnik vklopljeno možnost »Ne sledi«, se ne beleži nič.',
    dostopNaslov: 'Komu so podatki dostopni',
    dostop:
      'Podatki so na našem strežniku pri ponudniku <b>Hetzner</b> (Nemčija, EU), promet do njega gre prek <b>Cloudflare</b> (zaščita in dostava strani). Potrditvena in ponastavitvena pošta gre prek našega poštnega strežnika (prav tako Hetzner), obvestila v mobilni aplikaciji prek <b>Google Firebase Cloud Messaging</b> (le žeton naprave in besedilo obvestila). Klepet za pomoč v spodnjem desnem kotu teče prek <b>HelpStack</b>: tja gre to, kar vanj napišeš, in — če si prijavljen — tvoje prikazno ime, da vemo, komu odgovarjamo. Ko ti pomočnik v klepetu pomaga, lahko pogleda tudi, na kateri strani in v kateri ligi si ter ali je tvoja ekipa veljavna. E-pošte mu ne posredujemo. Nikomur drugemu podatkov ne posredujemo in jih ne prodajamo.',
    statistikaNaslov: 'Podatki o nogometaših',
    statistika:
      'Za nogometaše lig, ki jih pokrivamo, prikazujemo ime, klub, številko dresa, nastope, minute, gole in kartone. Vir so javno objavljeni uradni zapisniki tekem zveze, ki je navedena v nogi strani. Pozicije in asistence, ki jih zapisnik ne vsebuje, določi skupnost z glasovanjem, zato so lahko napačne. Iz tega izračunamo točke in ceno igralca v igri. Če je kaj narobe, klikni igralca in nam sporoči.',
    statistikaPodlaga:
      'Namen je brezplačna navijaška fantasy igra. Pravna podlaga je zakoniti interes (člen 6(1)(f) GDPR): navijačem omogočiti igro z javno objavljenimi rezultati njihove lige. Podatke prikazujemo, dokler igralec nastopa v ligi, ki jo pokrivamo. V avstrijskih ligah, tako kot ÖFB, ime igralca skrijemo 18 mesecev po njegovem zadnjem nastopu.',
    statistikaUgovor:
      'Igralec lahko obdelavi ugovarja ali zahteva izbris: piši na <eposta>info@slff.eu</eposta> in dodaj povezavo na stran igralca. V 14 dneh njegovo ime zamenjamo z nevtralno oznako v vseh naših ligah te države, v katerih ga najdemo, tudi ob poznejših uvozih. Statistika ostane brez imena. Enako storimo na zahtevo zveze.',
    grbi:
      'Grbi klubov so last posameznih klubov in so prikazani zgolj za prepoznavo ekipe. Klub, ki tega ne želi, naj nam piše in grb bomo odstranili.',
    fotografijeNaslov: 'Fotografije',
    fotografije:
      'Fotografija na naslovnici je delo Abigail Keenan in je objavljena na <unsplash>Unsplashu</unsplash> pod njihovo licenco, ki dovoljuje prosto uporabo. Ne prikazuje igralcev naših lig.',
    praviceNaslov: 'Tvoje pravice',
    pravice:
      'Račun in vse svoje podatke lahko kadarkoli izbrišeš sam: v meniju računa izberi <b>Izbris računa</b> (slff.eu/account). Za popravek prikaznega imena ali če izbris ne uspe, nam piši na <eposta>info@slff.eu</eposta>. Ob izbrisu izgine tudi tvoja ekipa z lestvice. Zapis nakupa značke preverjenega igralca ostane 10 let, kot zahteva računovodska zakonodaja, naslov za dostavo pa po pravilu zgoraj.',
    pravilaNaslov: 'Pravila igranja',
    pravila:
      'En človek, en račun. Glasovanje o asistencah in pozicijah je namenjeno resničnim popravkom — namerno napačno glasovanje kvari igro vsem in lahko vodi do odstranitve računa. Točkovanje in cene se lahko med sezono spremenijo, če se izkaže, da je kaj krivično; take spremembe bomo objavili.',
    jamstvoNaslov: 'Brez jamstva',
    jamstvo:
      'Stran teče, kakor teče. Trudimo se, da so podatki pravilni in da je dosegljiva, jamčiti pa tega ne moremo — zapisniki znajo zamujati, statistika pa vsebovati napake. To velja za brezplačno igro. Za plačljive storitve veljajo pogoji v razdelku Plačljive storitve in tvoje zakonske pravice potrošnika.',
    kajJePlacljivo:
      'Edina plačljiva stvar je neobvezna značka preverjenega igralca (glej Plačljive storitve spodaj).',
    podatkiPlacilo:
      '<b>Nakup značke preverjenega igralca (le če kupiš).</b> Zapis nakupa (kaj, kdaj, znesek in oznaka kupca pri Stripe) hranimo 10 let, kot zahteva računovodska zakonodaja. Naslov za dostavo natisnjene značke hranimo 90 dni po pošiljanju ali preklicu naročila in najdlje 12 mesecev po naročilu, nato ostane le država.',
    dostopStripe:
      'Plačila značke preverjenega igralca obdeluje <b>Stripe</b> (Stripe Payments Europe, Irska): dobi tvoje ime, e-pošto, naslov za račun in pri natisnjeni znački naslov za dostavo. Podatke kartice vneseš neposredno pri Stripe, mi jih ne vidimo.',
    placljivoNaslov:
      'Plačljive storitve: preverjeni igralci',
    placljivoUvod:
      'Igra je in ostane brezplačna. Plačljiva je le neobvezna značka preverjenega igralca, ki jo lahko kupi igralec, ki je potrdil, da je profil njegov. Značka nikoli ne vpliva na točke, cene, fantasy ekipe ali pravila igre. Ti pogoji veljajo za ta nakup.',
    prodajalec:
      '<b>Prodajalec:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija, vpisana v sodni register pri Okrožnem sodišču v Ljubljani. Matična številka 9850538000, ID za DDV SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Kaj kupiš.</b> Modro kljukico ob imenu igralca in dodatke profila (daljši opis, povezave, pasica, barva, izpostavljena tekma ali statistika, sporočilo navijačem). Letna naročnina stane 9,99 € in se vsako leto samodejno podaljša. Nakup za vedno stane 29 € enkratno in velja, dokler SLFF to storitev ponuja. K nakupu za vedno lahko dodaš natisnjeno značko z imenom za 5 € in poštnino 2 € (Slovenija) ali 4 € (druga država EU). Pošiljamo le v države EU, dostava običajno traja 2 do 3 tedne. Vse cene vključujejo DDV.',
    placilo:
      '<b>Plačilo.</b> Plačilo obdela Stripe. Podatkov kartice ne vidimo in jih ne hranimo. Kupiš lahko le, če si star vsaj 18 let. Pogodba je sklenjena, ko Stripe plačilo potrdi.',
    odpoved:
      '<b>Odpoved naročnine.</b> Naročnino lahko kadarkoli odpoveš z gumbom Upravljaj naročnino na strani računa (slff.eu/account) ali na profilu igralca. Odpoved velja ob koncu plačanega leta; do takrat značka ostane. Za že začeto leto denarja ne vračamo, razen v primerih spodaj.',
    odstop:
      '<b>Pravica do odstopa.</b> Digitalna vsebina (kljukica in dodatki) se zagotovi takoj po plačilu. Pred plačilom izrecno soglašaš s takojšnjo zagotovitvijo in potrdiš, da s tem izgubiš pravico do odstopa v 14 dneh (člen 16(m) Direktive 2011/83/EU, ZVPot-1). Natisnjena značka je izdelana po tvojih navodilih (ime na znački), zato pravice do odstopa zanjo ni (člen 16(c)). Zakonsko jamstvo ostane: če značka pride poškodovana, napačna ali sploh ne pride, nam piši in jo brezplačno zamenjamo ali ti vrnemo denar.',
    konec:
      '<b>Kdaj značka preneha.</b> Značka preneha, če se izkaže, da profil ni tvoj in potrditev prekličemo, če ime igralca na njegovo zahtevo ali zahtevo zveze skrijemo, ali če izbrišeš račun. Naročnina se takrat samodejno ustavi in ni več zaračunana. Če plačilo izpodbijaš pri banki (chargeback), se značka odvzame.',
    vracila:
      '<b>Vračila.</b> Pri zlorabi ali lažni potrditvi profila denarja ne vračamo. Če značka preneha po naši napaki, na zahtevo zveze ali ker storitev ukinemo, ti pri letni naročnini vrnemo sorazmerni del za neporabljene mesece. Pri nakupu za vedno vrnemo celoten znesek v prvih 12 mesecih po nakupu, pozneje pa sorazmerni del preostanka do 5 let od nakupa. Natisnjene značke in poštnine ob ukinitvi ne vračamo (značka ostane tvoja), le pri napaki ali okvari.',
    pritozbe:
      '<b>Vprašanja in pritožbe.</b> Piši na <eposta>info@slff.eu</eposta>, odgovorimo v 8 delovnih dneh. Ne priznavamo nobenega izvajalca izvensodnega reševanja potrošniških sporov (IRPS). Velja slovensko pravo; to ti ne odvzame varstva, ki ti ga daje pravo države, v kateri živiš.',
    scoutNaslov: 'SLFF Club in modul Scout',
    scoutKaj:
      'Iz istih javnih zapisnikov izračunamo kazalnike igralcev članskih lig: delež minut, gole, vpliv na igrišču, prejete gole, kartone in pot čez sezone, prilagojene moči lige. To so kazalniki iz podatkov tekem, ne ocena osebe. Videli jih bodo klubi z naročnino na SLFF Scout, ki iščejo igralce; odloči vedno človek v klubu. Mladinskih lig za iskanje igralcev ne obdelujemo. Kdor je kdaj igral v mladinski ligi, je izločen, dokler nima minut v članski ligi in na svojem profilu ne vpiše letnice rojstva, po kateri letos dopolni vsaj 19 let.',
    scoutPodlaga:
      'Pravna podlaga je zakoniti interes (člen 6(1)(f) GDPR): klubom pomagati najti igralce iz javno objavljenih rezultatov. Kazalnike izračunamo vsak dan znova in hranimo le zadnje izračune. Oglede klubov bomo beležili 12 mesecev, da preprečimo zlorabo in da igralcu na zahtevo povemo, kateri klubi so ga gledali.',
    scoutPrivolitev:
      'Igralec s prevzetim profilom lahko doda, da je odprt za prestop, letnico rojstva, želene regije in dovoljenje za stik. To je privolitev (člen 6(1)(a) GDPR): vidijo jo le klubi v Scoutu, prekliče jo kadarkoli na profilu in ob preklicu podatke izbrišemo.',
    scoutUgovor:
      'Ugovor: na prevzetem profilu klikni Skrij me iz Scouta ali piši na <eposta>info@slff.eu</eposta> s povezavo na stran igralca. V 14 dneh igralca skrijemo iz Scouta v vseh naših ligah te države, tudi ob poznejših uvozih. V fantasy igri ostane.',
    klubOrodje:
      'SLFF Club: klub z naročnino vidi svoje igralce, tudi mladinske: tekme iz zapisnikov in prisotnost, ki jo vnese sam. Za prisotnost je upravljavec klub, mi jo obdelujemo po njegovih navodilih in jo izbrišemo 24 mesecev po dogodku. Zahtevo glede prisotnosti pošlji klubu ali nam; posredujemo jo. Ugovor proti Scoutu te skrije pred drugimi klubi, ne pred lastnim.',
    trgovinaNaslov: 'SLFF Trgovina (shop.slff.eu)',
    trgovinaKaj:
      'Ob nakupu obdelujemo ime, e-pošto, naslov za dostavo, kupljene izdelke in zneske, ob prijavi tudi tvoj račun SLFF. Plačilo izvede Stripe: podatkov kartice ne vidimo in jih ne hranimo. Ime in naslov dobi Pošta Slovenije za dostavo. Za omejitev zlorab ob nedokončanem nakupu začasno hranimo zgoščen (nepovraten) IP naslov; izbriše se ob plačilu ali poteku nakupa. Besedilo personalizacije (ime, številka) in ime fantasy ekipe na izdelku sta del naročila; besedilo dobi tudi tiskarna, ki izdelek izdela. Obisk trgovine (ogledane strani, dodano v košarico, začeto in končano plačilo) šteje Umami kot na slff.eu: brez piškotkov in brez naslova IP.',
    trgovinaPodlaga:
      'Pravna podlaga je izpolnitev pogodbe (člen 6(1)(b) GDPR) in zakonske obveznosti (računovodstvo, davki), za zgoščen IP naslov pa zakoniti interes preprečevanja zlorab (člen 6(1)(f) GDPR). Upravljavec je SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'Podatke o naročilih in računih hranimo, kolikor zahtevata zakon o davku na dodano vrednost in računovodski predpisi (10 let po letu izdaje računa). E-pošto za obvestila o naročilu uporabimo le za to naročilo. Za dostop, popravek ali ugovor piši na <eposta>info@slff.eu</eposta>.',
  },
  // Komponenta KlubskiRacun na strani Račun.
  klubskiRacun: {
    naslov: 'Uradni račun kluba',
    aktiven: 'Ta račun zastopa klub {klub}.',
    pravice: 'Kot klub boš lahko urejal pozicije, dodajal igralce in potrjeval profile svojih igralcev.',
    vprasanje: 'Zastopaš klub?',
    pojasnilo:
      'Če se prijaviš z uradnim naslovom kluba, ki ga imamo, dobiš klubski račun samodejno. Če naslova nimamo, zaprosi spodaj in ga preverimo.',
    klub: 'Klub',
    isciKlub: 'Išči klub …',
    vloga: 'Tvoja vloga v klubu',
    vloge: { predsednik: 'predsednik', tajnik: 'tajnik', trener: 'trener', vodstvo: 'vodstvo kluba', drugo: 'drugo' },
    dokaz: 'Povezava, kjer je naslov objavljen (spletna stran, Facebook, zveza)',
    opomba: 'Opomba (neobvezno)',
    naslovRacuna: 'Naslov, ki ga potrjujemo: {email}',
    poslji: 'Pošlji prošnjo',
    caka: 'Prošnja za {klub} čaka na pregled.',
    cakaBrezKluba: 'Tvoj naslov je med uradnimi, a ga moramo še povezati s klubom. Uredimo v kratkem.',
    cakaPolno: 'Klub ima že 5 računov. Pregledali bomo in ti sporočili.',
    zavrnjeno: 'Prošnja je bila zavrnjena: {razlog}',
    nepotrjen: 'Najprej potrdi e-pošto svojega računa.',
    napake: {
      zeKlub: 'Že zastopaš klub.',
      caka: 'Tvoja prošnja že čaka na odločitev.',
    },
  },
}
