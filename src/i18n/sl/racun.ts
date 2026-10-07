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
    push: 'Potisna obvestila (mobilna aplikacija)',
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
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Izbris računa',
    moraPrijava: 'Za izbris računa se moraš <prijava>prijaviti</prijava>.',
    opis: 'Izbrisali bomo račun {email}: profil, vse tvoje ekipe z zgodovino točk, glasove in mini lige, ki si jih ustvaril. Izbrisa ni mogoče preklicati.',
    gumb: 'Izbriši račun',
    potrdi: 'Da, izbriši za vedno',
    preklici: 'Prekliči',
    brisem: 'Brišem …',
    napaka: 'Računa ni bilo mogoče izbrisati: {napaka}',
  },
  // Zasebnost in pogoji. <b> je krepko, ostale oznake so povezave.
  pravno: {
    naslov: 'Zasebnost in pogoji',
    zadnjaSprememba: 'Zadnja sprememba: 2. oktober 2026',
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
      'Ne hranimo naslova, telefonske številke ali podatkov o plačilih. Piškotkov za sledenje in oglaševalskih orodij ne uporabljamo. V brskalniku so shranjeni tvoja prijavna seja, oznaka pogovora v klepetu za pomoč, če ga odpreš, in oznake seje, s katerimi preštejemo obisk strani le enkrat. Koliko ljudi je odprlo katero stran, štejemo le kot dnevni seštevek — brez tvojega imena, računa, naprave ali naslova IP. Splošno statistiko obiska (katere strani, od kod obiskovalci pridejo, vrsta naprave in država, nekaj dejanj, kot je sestava ekipe) beleži <b>Umami</b> na našem strežniku: brez piškotkov, naslova IP ne shrani in obiska ne poveže s tvojim računom. Če ima brskalnik vklopljeno možnost »Ne sledi«, se ne beleži nič.',
    dostopNaslov: 'Komu so podatki dostopni',
    dostop:
      'Podatki so na našem strežniku pri ponudniku <b>Hetzner</b> (Nemčija, EU), promet do njega gre prek <b>Cloudflare</b> (zaščita in dostava strani). Potrditvena in ponastavitvena pošta gre prek našega poštnega strežnika (prav tako Hetzner), obvestila v mobilni aplikaciji prek <b>Google Firebase Cloud Messaging</b> (le žeton naprave in besedilo obvestila). Klepet za pomoč v spodnjem desnem kotu teče prek <b>HelpStack</b>: tja gre to, kar vanj napišeš, in — če si prijavljen — tvoje prikazno ime, da vemo, komu odgovarjamo. Ko ti pomočnik v klepetu pomaga, lahko pogleda tudi, na kateri strani in v kateri ligi si ter ali je tvoja ekipa veljavna. E-pošte mu ne posredujemo. Nikomur drugemu podatkov ne posredujemo in jih ne prodajamo.',
    statistikaNaslov: 'Statistika igralcev',
    statistika:
      'Podatki o nogometaših (nastopi, goli, kartoni) so povzeti po javno objavljenih zapisnikih medobčinskih nogometnih zvez; katere so za izbrano ligo, piše v nogi strani. Pozicije in asistence, ki jih zapisnik ne vsebuje, določi skupnost z glasovanjem — zato so lahko napačne. Če je kaj narobe, klikni igralca in nam sporoči.',
    grbi:
      'Grbi klubov so last posameznih klubov in so prikazani zgolj za prepoznavo ekipe. Klub, ki tega ne želi, naj nam piše in grb bomo odstranili.',
    fotografijeNaslov: 'Fotografije',
    fotografije:
      'Fotografija na naslovnici je delo Abigail Keenan in je objavljena na <unsplash>Unsplashu</unsplash> pod njihovo licenco, ki dovoljuje prosto uporabo. Ne prikazuje igralcev naših lig.',
    praviceNaslov: 'Tvoje pravice',
    pravice:
      'Račun in vse svoje podatke lahko kadarkoli izbrišeš sam: v meniju računa izberi <b>Izbris računa</b> (slff.eu/account). Za popravek prikaznega imena ali če izbris ne uspe, nam piši na <eposta>info@slff.eu</eposta>. Ob izbrisu izgine tudi tvoja ekipa z lestvice.',
    pravilaNaslov: 'Pravila igranja',
    pravila:
      'En človek, en račun. Glasovanje o asistencah in pozicijah je namenjeno resničnim popravkom — namerno napačno glasovanje kvari igro vsem in lahko vodi do odstranitve računa. Točkovanje in cene se lahko med sezono spremenijo, če se izkaže, da je kaj krivično; take spremembe bomo objavili.',
    jamstvoNaslov: 'Brez jamstva',
    jamstvo:
      'Stran teče, kakor teče. Trudimo se, da so podatki pravilni in da je dosegljiva, jamčiti pa tega ne moremo — zapisniki znajo zamujati, statistika pa vsebovati napake.',
  },
}
