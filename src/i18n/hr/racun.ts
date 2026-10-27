// Hrvatski prijevod područja `racun` (izvor: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  // Stranica Prijava: prijava, registracija, zaboravljena lozinka.
  prijava: {
    naslovPrijava: 'Prijava',
    naslovRegistracija: 'Registracija',
    naslovPozabljeno: 'Zaboravljena lozinka',
    googleNiNaVoljo: 'Prijava preko Googlea trenutno nije dostupna. Koristi e-poštu.',
    appleNiNaVoljo: 'Prijava preko Applea trenutno nije dostupna. Koristi e-poštu.',
    poslanaPonastavitev:
      'Poslali smo ti poveznicu za ponovno postavljanje lozinke. Provjeri e-poštu (i neželjenu poštu).',
    racunUstvarjen:
      'Račun je napravljen. Na e-poštu smo poslali poveznicu za potvrdu — otvori je i vrati se.',
    prijavljenKot: 'Prijavljen si kao {email}.',
    posljiPotrditevZnova: 'Pošalji potvrdni e-mail ponovno',
    potrditevPoslanaZnova:
      'Poslali smo novi e-mail za potvrdu. Provjeri i neželjenu poštu.',
    zGooglom: 'Nastavi s Googleom',
    zApplom: 'Nastavi s Appleom',
    aliZEposto: 'ili e-poštom',
    prikaznoIme: 'Prikazno ime',
    eposta: 'E-pošta',
    geslo: 'Lozinka',
    posiljam: 'Šaljem …',
    ustvariRacun: 'Napravi račun',
    posljiPovezavo: 'Pošalji poveznicu',
    gumbPrijava: 'Prijava',
    zeImasRacun: 'Već imaš račun? Prijavi se',
    nimasRacuna: 'Nemaš račun? Registriraj se',
    pozabljenoGeslo: 'Zaboravljena lozinka?',
    nazajNaPrijavo: '← Natrag na prijavu',
    predlogEposte: 'Jeste li mislili {eposta}?',
  },
  // Greške Supabase Autha, prevedene u lib/prijava.
  napake: {
    napacnaPrijava: 'Pogrešna e-adresa ili lozinka.',
    niPotrjen: 'E-adresa još nije potvrđena. Klikni poveznicu u poruci koju smo ti poslali.',
    zeRegistriran: 'Ova e-adresa je već registrirana. Prijavi se ili ponovno postavi lozinku.',
    prevecPoskusov: 'Previše pokušaja. Pričekaj nekoliko minuta i pokušaj ponovno.',
    sibkoGeslo: 'Lozinka je preslaba. Koristi barem 6 znakova, najbolje kombinaciju slova i brojeva.',
    istoGeslo: 'Nova lozinka mora biti drukčija od stare.',
    neveljavenNaslov: 'E-adresa nije valjana.',
  },
  novoGeslo: {
    naslov: 'Nova lozinka',
    gesliSeNeUjemata: 'Lozinke se ne podudaraju.',
    preverjam: 'Provjeravam poveznicu …',
    neveljavna:
      'Poveznica nije valjana ili je istekla. Na stranici za <prijava>prijavu</prijava> ponovno zatraži novu lozinku.',
    novoGeslo: 'Nova lozinka',
    ponovi: 'Ponovi lozinku',
    shranjujem: 'Spremam …',
    shrani: 'Spremi lozinku',
  },
  opomniki: {
    naslov: 'Obavijesti',
    napakaNalaganja: 'Postavke nije bilo moguće učitati.',
    napakaShranjevanja: 'Spremanje nije uspjelo. Pokušaj ponovno.',
    nalagam: 'Učitavam …',
    moraPrijava: 'Za uređivanje podsjetnika moraš se <prijava>prijaviti</prijava>.',
    opis: 'Prije roka kola poslat ćemo ti kratku poruku na {email} da ne zaboraviš urediti momčad.',
    posiljaj: 'Podsjetnici e-poštom',
    shranjujem: 'Spremam …',
    vklopljeni: 'Podsjetnici su uključeni.',
    izklopljeni: 'Više ti nećemo slati podsjetnike.',
    odjavaVprasanje: 'Ne želiš više primati e-poštu SLFF-a (podsjetnike prije roka i obavijesti o momčadi)?',
    odjavaGumb: 'Odjavi me',
    odjavaNapaka: 'Poveznica nije valjana. Prijavi se i isključi podsjetnike u postavkama.',
    push: 'Push obavijesti',
    pushOpis: 'Dan prije roka mobitel će ti javiti ako momčad još nije spremna.',
    pushVklopljena: 'Push obavijesti su uključene.',
    pushIzklopljena: 'Više ti nećemo slati push obavijesti.',
    pushZavrnjeno: 'Obavijesti su isključene na mobitelu. Uključi ih u Postavke → SLFF → Obavijesti.',
    pushDovoli: 'Dopusti obavijesti',
    povezava: 'Postavke obavijesti',
  },
  // Poveznica iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Potvrđujem …',
    preverjam: 'Provjeravam poveznicu …',
    neveljavna: 'Poveznica više nije valjana ili je već iskorištena. <prijava>Prijavi se</prijava> ili zatraži novu.',
  },
  nastavitve: {
    naslov: 'Postavke računa',
    moraPrijava: 'Za uređivanje računa moraš se <prijava>prijaviti</prijava>.',
    nalagam: 'Učitavam …',
    napakaNalaganja: 'Postavke nije bilo moguće učitati.',
    shranjujem: 'Spremam …',
    shranjeno: 'Spremljeno.',
    napakaShranjevanja: 'Spremanje nije uspjelo. Pokušaj ponovno.',
    profilNaslov: 'Profil',
    mojProfil: 'Pogledaj svoj javni profil',
    prikaznoIme: 'Prikazno ime',
    imeOpis: 'Drugi ga vide na ljestvicama. Od 3 do 24 znaka, možeš ga promijeniti jednom u 7 dana.',
    imeNaslednjic: 'Ime ćeš moći ponovno promijeniti {datum}.',
    shraniIme: 'Spremi ime',
    avatar: 'Avatar',
    avatarOpis: 'Odaberi boju i inicijale ili nogometnu ikonu.',
    barva: 'Boja',
    barvaN: 'Boja {n}',
    slika: 'Slika',
    zacetnice: 'Inicijali',
    ikone: {
      zoga: 'Lopta',
      gol: 'Gol',
      pokal: 'Pehar',
      copat: 'Kopačka',
      rokavice: 'Vratarske rukavice',
      dres: 'Dres',
      zastavica: 'Kornerska zastavica',
      navijac: 'Navijač',
    },
    klubNaslov: 'Klub za koji navijaš',
    klubOpis: 'Prikazuje se na tvom profilu, a tvoji bodovi broje se među navijačima kluba.',
    klubIsci: 'Potraži klub …',
    klubNiZadetkov: 'Nijedan klub nije pronađen.',
    klubBrez: 'Još nisi odabrao klub.',
    klubOdstrani: 'Ukloni klub',
    jezikNaslov: 'Jezik i država',
    jezikOpis: 'Jezik stranice i država čije lige vidiš. Odabir vrijedi u ovom pregledniku.',
    obvestilaNaslov: 'Obavijesti',
    zasebnostNaslov: 'Privatnost',
    javniProfil: 'Javni profil',
    javniProfilOpis: 'Drugi na tvom profilu vide tvoje momčadi, klub i postignuća. Isključeni profil prikazuje samo prikazno ime.',
    prijavaNaslov: 'Prijava i lozinka',
    prijavljenZ: 'Prijavljen si s e-adresom {email}.',
    geslo: 'Promijeni lozinku',
    gesloOpis: 'Na e-adresu ćemo ti poslati poveznicu za postavljanje nove lozinke.',
    gesloPoslano: 'Poveznicu smo poslali na {email}. Provjeri e-poštu (i neželjenu poštu).',
    gesloNapaka: 'Poveznicu nije bilo moguće poslati. Pokušaj ponovno za nekoliko minuta.',
    eposta: 'Za promjenu e-adrese piši nam na <eposta>info@slff.eu</eposta>.',
    // Greške prikaznog imena (kod iz baze, `hint`).
    napake: {
      dolzina: 'Prikazno ime mora imati od 3 do 24 znaka.',
      znaki: 'Prikazno ime sadrži nedopuštene znakove.',
      rezervirano: 'Ovo ime je rezervirano za tim SLFF-a. Odaberi drugo.',
      neprimerno: 'Ovo ime nije primjereno. Odaberi drugo.',
      prepogosto: 'Prikazno ime možeš promijeniti jednom u 7 dana.',
      zasedeno: 'Ovo prikazno ime je već zauzeto.',
    },
  },
  // Javni profil (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Ovaj profil ne postoji. Možda je račun obrisan.',
    nazaj: 'Na ljestvicu',
    zaseben: 'Ovaj profil je privatan.',
    tvojZaseben: 'Tvoj profil je privatan: drugi vide samo prikazno ime.',
    uredi: 'Uredi profil',
    clanOd: 'Član od {datum}',
    navija: 'Navija za',
    ekipe: 'Momčadi',
    brezEkip: 'U aktivnim ligama još nema momčadi.',
    mesto: '{mesto}. mjesto od {ekip}',
    miniLige: 'Zajedničke mini lige',
    dosezki: 'Postignuća',
    sezone: 'Sezone',
    krogi: 'Odigrana kola',
    najboljsiKrog: 'Najbolje kolo',
  },
  // Brisanje računa (slff.eu/account).
  izbris: {
    naslov: 'Brisanje računa',
    moraPrijava: 'Za brisanje računa moraš se <prijava>prijaviti</prijava>.',
    opis: 'Obrisat ćemo račun {email}: profil, sve tvoje momčadi s poviješću bodova, glasove i mini lige koje si napravio. Brisanje nije moguće poništiti. Brisanjem prestaje i značka provjerenog igrača, a pretplata se zaustavlja bez povrata novca.',
    gumb: 'Obriši račun',
    potrdi: 'Da, obriši zauvijek',
    preklici: 'Odustani',
    brisem: 'Brišem …',
    napaka: 'Račun nije bilo moguće obrisati: {napaka}',
  },
  // Privatnost i uvjeti. <b> je podebljano, ostale oznake su poveznice.
  pravno: {
    naslov: 'Privatnost i uvjeti',
    zadnjaSprememba: 'Zadnja izmjena: 16. listopada 2026.',
    kajJeNaslov: 'Što je SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) je navijačka fantasy liga za amaterske nogometne lige. Vodimo je amaterski i nije povezana s Hrvatskim nogometnim savezom (HNS), županijskim nogometnim savezima ni s klubovima. Igra je besplatna, bez novčanih uloga i nagrada.',
    podatkiNaslov: 'Koji se podaci čuvaju',
    podatkiEposta:
      '<b>E-adresa i lozinka.</b> Trebaju nam za prijavu. Lozinka je spremljena šifrirano i ne vidimo je.',
    podatkiIme:
      '<b>Prikazno ime i ime momčadi.</b> Vidljivi su na ljestvici. Ako ne želiš svoje ime, koristi nadimak.',
    podatkiEkipa:
      '<b>Tvoja momčad i glasovi.</b> Sastav momčadi, kapetan, prijelazi i glasovi o asistencijama ili pozicijama.',
    podatkiNaprava:
      '<b>Token uređaja za obavijesti.</b> Ako u mobilnoj aplikaciji dopustiš obavijesti, spremamo token preko kojeg ti šaljemo podsjetnik prije roka kola. Pri odjavi ga brišemo.',
    neHranimo:
      'Ne čuvamo broj telefona ni podatke platne kartice, a adresu samo ako naručiš tiskanu značku (vidi niže). Ne koristimo kolačiće za praćenje ni oglašivačke alate. U pregledniku su spremljeni tvoja sesija prijave, oznaka razgovora u chatu za pomoć ako ga otvoriš, i oznake sesije kojima posjet stranici brojimo samo jednom. Koliko je ljudi otvorilo koju stranicu čuvamo samo kao dnevni zbroj — bez tvojeg imena, računa, uređaja ili IP adrese. Opću statistiku posjeta (koje stranice, odakle posjetitelji dolaze, vrsta uređaja i država, nekoliko radnji poput slaganja momčadi) bilježi <b>Umami</b> na našem poslužitelju: bez kolačića, IP adresu ne sprema i posjet ne povezuje s tvojim računom. Ako preglednik ima uključenu opciju „Ne prati“, ne bilježi se ništa.',
    dostopNaslov: 'Kome su podaci dostupni',
    dostop:
      'Podaci su pohranjeni na našem poslužitelju kod pružatelja <b>Hetzner</b> (Njemačka, EU), a promet do njega ide preko <b>Cloudflarea</b> (zaštita i isporuka stranice). Pošta za potvrdu i ponovno postavljanje lozinke ide s našeg poslužitelja pošte (također Hetzner), obavijesti u mobilnoj aplikaciji preko <b>Google Firebase Cloud Messaginga</b> (samo token uređaja i tekst obavijesti). Chat za pomoć u donjem desnom kutu radi preko <b>HelpStacka</b>: tamo ide ono što u njega napišeš i — ako si prijavljen — tvoje prikazno ime, da znamo kome odgovaramo. Kad ti pomoćnik u chatu pomaže, može vidjeti i na kojoj si stranici i u kojoj ligi te je li tvoja momčad valjana. E-adresu mu ne prosljeđujemo. Nikome drugome podatke ne prosljeđujemo i ne prodajemo ih.',
    statistikaNaslov: 'Podaci o nogometašima',
    statistika:
      'Za nogometaše liga koje pratimo prikazujemo ime, klub, broj dresa, nastupe, minute, golove i kartone. Izvor su javno objavljeni službeni zapisnici utakmica saveza navedenog u podnožju stranice. Pozicije i asistencije, kojih u zapisniku nema, određuje zajednica glasovanjem, zato mogu biti pogrešne. Iz toga računamo bodove i cijenu igrača u igri. Ako nešto nije u redu, klikni igrača i javi nam.',
    statistikaPodlaga:
      'Svrha je besplatna navijačka fantasy igra. Pravna osnova je legitimni interes (članak 6. stavak 1. točka (f) GDPR-a): omogućiti navijačima igru s javno objavljenim rezultatima njihove lige. Podatke prikazujemo dok igrač nastupa u ligi koju pratimo. U austrijskim ligama, kao i ÖFB, ime igrača skrivamo 18 mjeseci nakon njegova zadnjeg nastupa.',
    statistikaUgovor:
      'Igrač može uložiti prigovor na obradu ili zatražiti brisanje: piši na <eposta>info@slff.eu</eposta> i dodaj poveznicu na stranicu igrača. U roku od 14 dana njegovo ime zamjenjujemo neutralnom oznakom u svim našim ligama te države u kojima ga nađemo, i pri kasnijim uvozima. Statistika ostaje bez imena. Isto činimo na zahtjev saveza.',
    grbi:
      'Grbovi klubova vlasništvo su pojedinih klubova i prikazani su samo radi prepoznavanja momčadi. Klub koji to ne želi neka nam piše i uklonit ćemo grb.',
    fotografijeNaslov: 'Fotografije',
    fotografije:
      'Fotografija na naslovnici djelo je Abigail Keenan i objavljena je na <unsplash>Unsplashu</unsplash> pod njihovom licencom, koja dopušta slobodnu upotrebu. Ne prikazuje igrače naših liga.',
    praviceNaslov: 'Tvoja prava',
    pravice:
      'Račun i sve svoje podatke možeš u svakom trenutku sam obrisati: u izborniku računa odaberi <b>Brisanje računa</b> (slff.eu/account). Za ispravak prikaznog imena ili ako brisanje ne uspije, piši nam na <eposta>info@slff.eu</eposta>. Brisanjem nestaje i tvoja momčad s ljestvice. Zapis o kupnji značke provjerenog igrača ostaje 10 godina, kako to traže računovodstveni propisi, a adresa za dostavu prema pravilu gore.',
    pravilaNaslov: 'Pravila igre',
    pravila:
      'Jedan čovjek, jedan račun. Glasovanje o asistencijama i pozicijama služi za stvarne ispravke — namjerno pogrešno glasovanje kvari igru svima i može dovesti do uklanjanja računa. Bodovanje i cijene mogu se tijekom sezone promijeniti ako se pokaže da je nešto nepravedno; takve promjene ćemo objaviti.',
    jamstvoNaslov: 'Bez jamstva',
    jamstvo:
      'Stranica radi kako radi. Trudimo se da podaci budu točni i da bude dostupna, ali to ne možemo jamčiti — zapisnici znaju kasniti, a statistika sadržavati greške. To vrijedi za besplatnu igru. Za usluge koje se plaćaju vrijede uvjeti u odjeljku Usluge koje se plaćaju i tvoja zakonska prava potrošača.',
    kajJePlacljivo:
      'Jedino što se plaća je neobavezna značka provjerenog igrača (vidi Usluge koje se plaćaju niže).',
    podatkiPlacilo:
      '<b>Kupnja značke provjerenog igrača (samo ako kupiš).</b> Zapis o kupnji (što, kada, iznos i oznaka kupca kod Stripea) čuvamo 10 godina, kako to traže računovodstveni propisi. Adresu za dostavu tiskane značke čuvamo 90 dana nakon slanja ili otkazivanja narudžbe, a najdulje 12 mjeseci od narudžbe, a zatim ostaje samo država.',
    dostopStripe:
      'Plaćanja značke provjerenog igrača obrađuje <b>Stripe</b> (Stripe Payments Europe, Irska): dobiva tvoje ime, e-poštu, adresu za račun i, za tiskanu značku, adresu za dostavu. Podatke kartice upisuješ izravno kod Stripea, mi ih ne vidimo.',
    placljivoNaslov:
      'Usluge koje se plaćaju: provjereni igrači',
    placljivoUvod:
      'Igra je i ostaje besplatna. Plaća se samo neobavezna značka provjerenog igrača, koju može kupiti igrač koji je potvrdio da je profil njegov. Značka nikad ne utječe na bodove, cijene, fantasy momčadi ni pravila igre. Ovi uvjeti vrijede za tu kupnju.',
    prodajalec:
      '<b>Prodavatelj:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija, upisano u sudski registar pri Okružnom sudu u Ljubljani. Matični broj 9850538000, PDV ID SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Što kupuješ.</b> Plavu kvačicu uz ime igrača i dodatke profila (duži opis, poveznice, naslovna slika, boja, istaknuta utakmica ili statistika, poruka navijačima). Godišnja pretplata stoji 9,99 € i svake se godine automatski obnavlja. Kupnja zauvijek stoji 29 € jednokratno i vrijedi dok SLFF nudi ovu uslugu. Uz kupnju zauvijek možeš dodati tiskanu značku s imenom za 5 € i poštarinu 2 € (Slovenija) ili 4 € (druga država EU). Šaljemo samo u države EU, dostava obično traje 2 do 3 tjedna. Sve cijene uključuju PDV.',
    placilo:
      '<b>Plaćanje.</b> Plaćanje obrađuje Stripe. Podatke kartice ne vidimo i ne čuvamo. Kupiti možeš samo ako imaš najmanje 18 godina. Ugovor je sklopljen kad Stripe potvrdi plaćanje.',
    odpoved:
      '<b>Otkaz pretplate.</b> Pretplatu možeš otkazati bilo kada gumbom Upravljaj pretplatom na stranici računa (slff.eu/account) ili na profilu igrača. Otkaz vrijedi na kraju plaćene godine; do tada značka ostaje. Za već započetu godinu ne vraćamo novac, osim u slučajevima niže.',
    odstop:
      '<b>Pravo na odustanak.</b> Digitalni sadržaj (kvačica i dodaci) isporučuje se odmah nakon plaćanja. Prije plaćanja izričito pristaješ na trenutačnu isporuku i potvrđuješ da time gubiš pravo na odustanak u roku od 14 dana (članak 16. točka (m) Direktive 2011/83/EU, slovenski ZVPot-1). Tiskana značka izrađuje se prema tvojim uputama (ime na znački), pa za nju nema prava na odustanak (članak 16. točka (c)). Zakonsko jamstvo ostaje: ako značka stigne oštećena, pogrešna ili uopće ne stigne, piši nam i besplatno ćemo je zamijeniti ili ti vratiti novac.',
    konec:
      '<b>Kad značka prestaje.</b> Značka prestaje ako se pokaže da profil nije tvoj i opozovemo potvrdu, ako ime igrača sakrijemo na njegov zahtjev ili zahtjev saveza ili ako izbrišeš račun. Pretplata se tada automatski zaustavlja i više se ne naplaćuje. Ako plaćanje osporiš kod banke (chargeback), značka se oduzima.',
    vracila:
      '<b>Povrat novca.</b> Kod zlouporabe ili lažne potvrde profila ne vraćamo novac. Ako značka prestane zbog naše pogreške, na zahtjev saveza ili zato što ukinemo uslugu, kod godišnje pretplate vraćamo razmjerni dio za neiskorištene mjesece. Kod kupnje zauvijek vraćamo cijeli iznos u prvih 12 mjeseci od kupnje, a nakon toga razmjerni dio preostatka do 5 godina od kupnje. Tiskanu značku i poštarinu kod ukidanja ne vraćamo (značka ostaje tvoja), samo kod nedostatka ili kvara.',
    pritozbe:
      '<b>Pitanja i prigovori.</b> Piši na <eposta>info@slff.eu</eposta>, odgovaramo u roku od 8 radnih dana. Ne priznajemo nijedno tijelo za izvansudsko rješavanje potrošačkih sporova. Primjenjuje se slovensko pravo; time ne gubiš zaštitu koju ti daje pravo države u kojoj živiš.',
    scoutNaslov: 'SLFF Club i modul Scout',
    scoutKaj:
      'Iz istih javnih zapisnika izračunavamo pokazatelje igrača seniorskih liga: udio minuta, golove, utjecaj na terenu, primljene golove, kartone i put kroz sezone, prilagođene snazi lige. To su pokazatelji iz podataka utakmica, a ne ocjena osobe. Vidjet će ih klubovi s pretplatom na SLFF Scout koji traže igrače; odluku uvijek donosi čovjek u klubu. Juniorske lige za traženje igrača ne obrađujemo. Tko je ikad igrao u juniorskoj ligi, isključen je dok nema minuta u seniorskoj ligi i na svom profilu ne upiše godinu rođenja prema kojoj ove godine navršava najmanje 19 godina.',
    scoutPodlaga:
      'Pravna osnova je legitimni interes (članak 6. stavak 1. točka (f) GDPR-a): pomoći klubovima pronaći igrače iz javno objavljenih rezultata. Pokazatelje izračunavamo svaki dan iznova i čuvamo samo zadnje izračune. Preglede klubova bilježit ćemo 12 mjeseci kako bismo spriječili zlouporabu i kako bismo igraču na zahtjev rekli koji su ga klubovi gledali.',
    scoutPrivolitev:
      'Igrač s preuzetim profilom može dodati da je otvoren za transfer, godinu rođenja, željene regije i dopuštenje za kontakt. To je privola (članak 6. stavak 1. točka (a) GDPR-a): vide je samo klubovi u Scoutu, može se povući u bilo kojem trenutku na profilu, a nakon povlačenja podatke brišemo.',
    scoutUgovor:
      'Prigovor: na preuzetom profilu klikni Sakrij me iz Scouta ili piši na <eposta>info@slff.eu</eposta> s poveznicom na stranicu igrača. U roku od 14 dana igrača skrivamo iz Scouta u svim našim ligama te države, i pri kasnijim uvozima. U fantasy igri ostaje.',
    klubOrodje:
      'SLFF Club: klub s pretplatom vidi svoje igrače, i juniorske: utakmice iz zapisnika i prisutnost koju sam unese. Za prisutnost je voditelj obrade klub, a mi je obrađujemo prema njegovim uputama i brišemo je 24 mjeseca nakon događaja. Zahtjev u vezi s prisutnošću pošalji klubu ili nama; proslijedit ćemo ga. Prigovor na Scout skriva te od drugih klubova, ne od vlastitog.',
    trgovinaNaslov: 'SLFF Trgovina (shop.slff.eu)',
    trgovinaKaj:
      'Pri kupnji obrađujemo ime, e-poštu, adresu za dostavu, kupljene proizvode i iznose, a ako si prijavljen i tvoj SLFF račun. Plaćanje obavlja Stripe: podatke kartice ne vidimo i ne pohranjujemo. Ime i adresu za dostavu dobiva Pošta Slovenije. Radi sprječavanja zlouporabe kod nedovršene kupnje privremeno čuvamo sažetak (nepovratni hash) IP adrese; briše se nakon plaćanja ili isteka kupnje. Tekst personalizacije (ime, broj) i ime fantasy ekipe na proizvodu dio su narudžbe; tekst dobiva i tiskara koja izrađuje proizvod.',
    trgovinaPodlaga:
      'Pravna osnova je izvršenje ugovora (članak 6(1)(b) GDPR) i zakonske obveze (računovodstvo, porezi), a za sažetak IP adrese legitimni interes sprječavanja zlouporabe (članak 6(1)(f) GDPR). Voditelj obrade je SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'Podatke o narudžbama i računima čuvamo koliko zahtijevaju zakon o PDV-u i računovodski propisi (10 godina nakon godine izdavanja računa). E-poštu za obavijesti o narudžbi koristimo samo za tu narudžbu. Za pristup, ispravak ili prigovor piši na <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Službeni račun kluba',
    aktiven: 'Ovaj račun predstavlja klub {klub}.',
    pravice: 'Kao klub možeš uređivati pozicije, dodavati igrače i potvrđivati profile svojih igrača.',
    vprasanje: 'Predstavljaš klub?',
    pojasnilo: 'Ako se prijaviš službenom adresom kluba koju imamo, automatski dobivaš klupski račun. Ako je nemamo, zatraži je ispod i provjerit ćemo je.',
    klub: 'Klub',
    isciKlub: 'Traži klub …',
    vloga: 'Tvoja uloga u klubu',
    vloge: {
      predsednik: 'predsjednik',
      tajnik: 'tajnik',
      trener: 'trener',
      vodstvo: 'uprava kluba',
      drugo: 'ostalo',
    },
    dokaz: 'Poveznica na kojoj je adresa objavljena (web stranica, Facebook, savez)',
    opomba: 'Napomena (neobavezno)',
    naslovRacuna: 'Adresa koju potvrđujemo: {email}',
    poslji: 'Pošalji zahtjev',
    caka: 'Zahtjev za {klub} čeka pregled.',
    cakaBrezKluba: 'Tvoja adresa je među službenima, ali je još moramo povezati s klubom. Riješit ćemo uskoro.',
    cakaPolno: 'Klub već ima 5 računa. Pregledat ćemo i javiti ti.',
    zavrnjeno: 'Zahtjev je odbijen: {razlog}',
    nepotrjen: 'Najprije potvrdi e-poštu svog računa.',
    napake: {
      zeKlub: 'Već predstavljaš klub.',
      caka: 'Tvoj zahtjev već čeka odluku.',
    },
  },
}
