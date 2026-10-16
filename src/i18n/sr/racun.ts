// Srpski prevod: `racun` (izvor: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  // Stranica Prijava: prijava, registracija, zaboravljena lozinka.
  prijava: {
    naslovPrijava: 'Prijava',
    naslovRegistracija: 'Registracija',
    naslovPozabljeno: 'Zaboravljena lozinka',
    googleNiNaVoljo: 'Prijava preko Googlea trenutno nije dostupna. Koristi imejl.',
    appleNiNaVoljo: 'Prijava preko Applea trenutno nije dostupna. Koristi imejl.',
    poslanaPonastavitev:
      'Poslali smo ti link za postavljanje nove lozinke. Proveri imejl (i neželjenu poštu).',
    racunUstvarjen:
      'Nalog je napravljen. Na imejl smo poslali link za potvrdu: otvori ga i vrati se.',
    prijavljenKot: 'Prijavljen si kao {email}.',
    zGooglom: 'Nastavi sa Googleom',
    zApplom: 'Nastavi sa Appleom',
    aliZEposto: 'ili imejlom',
    prikaznoIme: 'Ime za prikaz',
    eposta: 'Imejl',
    geslo: 'Lozinka',
    posiljam: 'Šaljem …',
    ustvariRacun: 'Napravi nalog',
    posljiPovezavo: 'Pošalji link',
    gumbPrijava: 'Prijava',
    zeImasRacun: 'Već imaš nalog? Prijavi se',
    nimasRacuna: 'Nemaš nalog? Registruj se',
    pozabljenoGeslo: 'Zaboravljena lozinka?',
    nazajNaPrijavo: '← Nazad na prijavu',
    predlogEposte: 'Da li ste mislili {eposta}?',
  },
  // Greške Supabase Autha, prevedene u lib/prijava.
  napake: {
    napacnaPrijava: 'Pogrešna imejl adresa ili lozinka.',
    niPotrjen: 'Imejl adresa još nije potvrđena. Klikni na link u poruci koju smo ti poslali.',
    zeRegistriran: 'Ova imejl adresa je već registrovana. Prijavi se ili postavi novu lozinku.',
    prevecPoskusov: 'Previše pokušaja. Sačekaj nekoliko minuta i pokušaj ponovo.',
    sibkoGeslo: 'Lozinka je preslaba. Koristi bar 6 znakova, najbolje kombinaciju slova i brojeva.',
    istoGeslo: 'Nova lozinka mora da se razlikuje od stare.',
    neveljavenNaslov: 'Imejl adresa nije ispravna.',
  },
  novoGeslo: {
    naslov: 'Nova lozinka',
    gesliSeNeUjemata: 'Lozinke se ne podudaraju.',
    preverjam: 'Proveravam link …',
    neveljavna:
      'Link nije ispravan ili je istekao. Na stranici za <prijava>prijavu</prijava> ponovo zatraži novu lozinku.',
    novoGeslo: 'Nova lozinka',
    ponovi: 'Ponovi lozinku',
    shranjujem: 'Čuvam …',
    shrani: 'Sačuvaj lozinku',
  },
  opomniki: {
    naslov: 'Obaveštenja',
    napakaNalaganja: 'Podešavanja nije bilo moguće učitati.',
    napakaShranjevanja: 'Čuvanje nije uspelo. Pokušaj ponovo.',
    nalagam: 'Učitavam …',
    moraPrijava: 'Za uređivanje podsetnika moraš da se <prijava>prijaviš</prijava>.',
    opis: 'Pre roka za kolo poslaćemo ti kratku poruku na {email} da ne zaboraviš da urediš tim.',
    posiljaj: 'Podsetnici imejlom',
    shranjujem: 'Čuvam …',
    vklopljeni: 'Podsetnici su uključeni.',
    izklopljeni: 'Više ti nećemo slati podsetnike.',
    odjavaVprasanje: 'Ne želiš više da primaš imejlove od SLFF-a (podsetnike pre roka i obaveštenja o timu)?',
    odjavaGumb: 'Odjavi me',
    odjavaNapaka: 'Link nije ispravan. Prijavi se i isključi podsetnike u podešavanjima.',
    push: 'Push obaveštenja',
    pushOpis: 'Dan pre roka telefon će ti javiti ako tim još nije spreman.',
    pushVklopljena: 'Push obaveštenja su uključena.',
    pushIzklopljena: 'Više ti nećemo slati push obaveštenja.',
    pushZavrnjeno: 'Obaveštenja su isključena na telefonu. Uključi ih u Podešavanja → SLFF → Obaveštenja.',
    pushDovoli: 'Dozvoli obaveštenja',
    povezava: 'Podešavanja obaveštenja',
  },
  // Link iz imejla (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Potvrđujem …',
    preverjam: 'Proveravam link …',
    neveljavna: 'Link više nije ispravan ili je već iskorišćen. <prijava>Prijavi se</prijava> ili zatraži novi.',
  },
  // Podešavanja naloga (slff.eu/account).
  nastavitve: {
    naslov: 'Podešavanja naloga',
    moraPrijava: 'Za uređivanje naloga moraš da se <prijava>prijaviš</prijava>.',
    nalagam: 'Učitavam …',
    napakaNalaganja: 'Podešavanja nije bilo moguće učitati.',
    shranjujem: 'Čuvam …',
    shranjeno: 'Sačuvano.',
    napakaShranjevanja: 'Čuvanje nije uspelo. Pokušaj ponovo.',
    profilNaslov: 'Profil',
    mojProfil: 'Pogledaj svoj javni profil',
    prikaznoIme: 'Ime za prikaz',
    imeOpis: 'Drugi ga vide na tabelama. Od 3 do 24 znaka, možeš da ga promeniš jednom u 7 dana.',
    imeNaslednjic: 'Ime možeš ponovo da promeniš {datum}.',
    shraniIme: 'Sačuvaj ime',
    avatar: 'Avatar',
    avatarOpis: 'Izaberi boju i inicijale ili fudbalsku ikonu.',
    barva: 'Boja',
    barvaN: 'Boja {n}',
    slika: 'Slika',
    zacetnice: 'Inicijali',
    ikone: {
      zoga: 'Lopta',
      gol: 'Gol',
      pokal: 'Pehar',
      copat: 'Kopačka',
      rokavice: 'Golmanske rukavice',
      dres: 'Dres',
      zastavica: 'Korner zastavica',
      navijac: 'Navijač',
    },
    klubNaslov: 'Klub za koji navijaš',
    klubOpis: 'Prikazuje se na tvom profilu, a tvoji bodovi se računaju među navijačima kluba.',
    klubIsci: 'Pronađi klub …',
    klubNiZadetkov: 'Nijedan klub nije pronađen.',
    klubBrez: 'Još nisi izabrao klub.',
    klubOdstrani: 'Ukloni klub',
    jezikNaslov: 'Jezik i država',
    jezikOpis: 'Jezik stranice i država čije lige vidiš. Izbor važi u ovom pregledaču.',
    obvestilaNaslov: 'Obaveštenja',
    zasebnostNaslov: 'Privatnost',
    javniProfil: 'Javni profil',
    javniProfilOpis: 'Drugi na tvom profilu vide tvoje timove, klub i dostignuća. Isključen profil prikazuje samo ime za prikaz.',
    prijavaNaslov: 'Prijava i lozinka',
    prijavljenZ: 'Prijavljen si imejl adresom {email}.',
    geslo: 'Promeni lozinku',
    gesloOpis: 'Na imejl ti šaljemo link kojim postavljaš novu lozinku.',
    gesloPoslano: 'Link smo poslali na {email}. Proveri imejl (i neželjenu poštu).',
    gesloNapaka: 'Link nije bilo moguće poslati. Pokušaj ponovo za nekoliko minuta.',
    eposta: 'Za promenu imejl adrese piši nam na <eposta>info@slff.eu</eposta>.',
    napake: {
      dolzina: 'Ime za prikaz mora imati od 3 do 24 znaka.',
      znaki: 'Ime za prikaz sadrži nedozvoljene znakove.',
      rezervirano: 'Ovo ime je rezervisano za tim SLFF. Izaberi drugo.',
      neprimerno: 'Ovo ime nije prikladno. Izaberi drugo.',
      prepogosto: 'Ime za prikaz možeš da promeniš jednom u 7 dana.',
      zasedeno: 'Ovo ime za prikaz je već zauzeto.',
    },
  },
  // Javni profil (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Ovaj profil ne postoji. Možda je nalog obrisan.',
    nazaj: 'Na tabelu',
    zaseben: 'Ovaj profil je privatan.',
    tvojZaseben: 'Tvoj profil je privatan: drugi vide samo ime za prikaz.',
    uredi: 'Uredi profil',
    clanOd: 'Član od {datum}',
    navija: 'Navija za',
    ekipe: 'Timovi',
    brezEkip: 'U aktivnim ligama još nema timova.',
    mesto: '{mesto}. mesto od {ekip}',
    miniLige: 'Zajedničke mini lige',
    dosezki: 'Dostignuća',
    sezone: 'Sezone',
    krogi: 'Odigrana kola',
    najboljsiKrog: 'Najbolje kolo',
  },
  // Brisanje naloga (slff.eu/account).
  izbris: {
    naslov: 'Brisanje naloga',
    moraPrijava: 'Za brisanje naloga moraš da se <prijava>prijaviš</prijava>.',
    opis: 'Obrisaćemo nalog {email}: profil, sve tvoje timove sa istorijom bodova, glasove i mini lige koje si napravio. Brisanje nije moguće poništiti. Brisanjem prestaje i značka proverenog igrača, a pretplata se zaustavlja bez povraćaja novca.',
    gumb: 'Obriši nalog',
    potrdi: 'Da, obriši zauvek',
    preklici: 'Otkaži',
    brisem: 'Brišem …',
    napaka: 'Nalog nije bilo moguće obrisati: {napaka}',
  },
  // Privatnost i uslovi. <b> je podebljano, ostale oznake su linkovi.
  pravno: {
    naslov: 'Privatnost i uslovi',
    zadnjaSprememba: 'Poslednja izmena: 16. oktobra 2026.',
    kajJeNaslov: 'Šta je SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) je navijačka fantasy liga za amaterske fudbalske lige. Vodimo je amaterski i nije povezana sa Fudbalskim savezom Srbije (FSS), regionalnim i okružnim fudbalskim savezima niti sa klubovima. Igra je besplatna, bez novčanih uloga i nagrada.',
    podatkiNaslov: 'Koji se podaci čuvaju',
    podatkiEposta:
      '<b>Imejl adresa i lozinka.</b> Potrebni su nam za prijavu. Lozinka je sačuvana šifrovano i ne vidimo je.',
    podatkiIme:
      '<b>Ime za prikaz i ime tima.</b> Vidljivi su na tabeli. Ako ne želiš svoje ime, koristi nadimak.',
    podatkiEkipa:
      '<b>Tvoj tim i glasovi.</b> Sastav tima, kapiten, transferi i glasovi o asistencijama ili pozicijama.',
    podatkiNaprava:
      '<b>Token uređaja za obaveštenja.</b> Ako u mobilnoj aplikaciji dozvoliš obaveštenja, čuvamo token preko kog ti šaljemo podsetnik pre roka za kolo. Pri odjavi ga brišemo.',
    neHranimo:
      'Ne čuvamo broj telefona ni podatke platne kartice, a adresu samo ako naručiš štampanu značku (vidi niže). Ne koristimo kolačiće za praćenje ni reklamne alate. U pregledaču su sačuvani tvoja sesija prijave, oznaka razgovora u četu za pomoć ako ga otvoriš i oznake sesije kojima posetu stranici brojimo samo jednom. Koliko je ljudi otvorilo koju stranicu čuvamo samo kao dnevni zbir, bez tvog imena, naloga, uređaja ili IP adrese. Opštu statistiku poseta (koje stranice, odakle posetioci dolaze, vrsta uređaja i država, nekoliko radnji poput sastavljanja tima) beleži <b>Umami</b> na našem serveru: bez kolačića, IP adresu ne čuva i posetu ne povezuje sa tvojim nalogom. Ako pregledač ima uključenu opciju „Ne prati“, ne beleži se ništa.',
    dostopNaslov: 'Kome su podaci dostupni',
    dostop:
      'Podaci su sačuvani na našem serveru kod provajdera <b>Hetzner</b> (Nemačka, EU), a saobraćaj do njega ide preko <b>Cloudflarea</b> (zaštita i isporuka stranice). Imejlovi za potvrdu i postavljanje nove lozinke idu sa našeg mejl servera (takođe Hetzner), obaveštenja u mobilnoj aplikaciji preko <b>Google Firebase Cloud Messaginga</b> (samo token uređaja i tekst obaveštenja). Čet za pomoć u donjem desnom uglu radi preko <b>HelpStacka</b>: tamo ide ono što u njega napišeš i, ako si prijavljen, tvoje ime za prikaz, da znamo kome odgovaramo. Kada ti pomoćnik u četu pomaže, može da vidi i na kojoj si stranici i u kojoj ligi i da li je tvoj tim ispravan. Imejl adresu mu ne prosleđujemo. Nikome drugom podatke ne prosleđujemo i ne prodajemo ih.',
    statistikaNaslov: 'Podaci o fudbalerima',
    statistika:
      'Za fudbalere liga koje pratimo prikazujemo ime, klub, broj dresa, nastupe, minute, golove i kartone. Izvor su javno objavljeni zvanični zapisnici utakmica saveza navedenog u podnožju stranice. Pozicije i asistencije, kojih u zapisniku nema, određuje zajednica glasanjem, zato mogu biti pogrešne. Iz toga računamo bodove i cenu igrača u igri. Ako nešto nije u redu, klikni na igrača i javi nam.',
    statistikaPodlaga:
      'Svrha je besplatna navijačka fantasy igra. Pravni osnov je legitimni interes (član 6. stav 1. tačka (f) GDPR-a): omogućiti navijačima igru sa javno objavljenim rezultatima njihove lige. Podatke prikazujemo dok igrač nastupa u ligi koju pratimo. U austrijskim ligama, kao i ÖFB, ime igrača skrivamo 18 meseci posle njegovog poslednjeg nastupa.',
    statistikaUgovor:
      'Igrač može da uloži prigovor na obradu ili da zatraži brisanje: piši na <eposta>info@slff.eu</eposta> i dodaj link na stranicu igrača. U roku od 14 dana njegovo ime zamenjujemo neutralnom oznakom u svim našim ligama te države u kojima ga nađemo, i pri kasnijim uvozima. Statistika ostaje bez imena. Isto činimo na zahtev saveza.',
    grbi:
      'Grbovi klubova su vlasništvo pojedinih klubova i prikazani su samo radi prepoznavanja timova. Klub koji to ne želi neka nam piše i uklonićemo grb.',
    fotografijeNaslov: 'Fotografije',
    fotografije:
      'Fotografija na naslovnoj strani je delo Abigail Keenan i objavljena je na <unsplash>Unsplashu</unsplash> pod njihovom licencom, koja dozvoljava slobodnu upotrebu. Ne prikazuje igrače naših liga.',
    praviceNaslov: 'Tvoja prava',
    pravice:
      'Nalog i sve svoje podatke možeš u svakom trenutku sam da obrišeš: u meniju naloga izaberi <b>Brisanje naloga</b> (slff.eu/account). Za ispravku imena za prikaz ili ako brisanje ne uspe, piši nam na <eposta>info@slff.eu</eposta>. Brisanjem nestaje i tvoj tim sa tabele. Zapis o kupovini značke proverenog igrača ostaje 10 godina, kako to traže računovodstveni propisi, a adresa za dostavu po pravilu gore.',
    pravilaNaslov: 'Pravila igre',
    pravila:
      'Jedan čovek, jedan nalog. Glasanje o asistencijama i pozicijama služi za stvarne ispravke: namerno pogrešno glasanje kvari igru svima i može dovesti do uklanjanja naloga. Bodovanje i cene mogu se tokom sezone promeniti ako se pokaže da je nešto nepravedno; takve promene ćemo objaviti.',
    jamstvoNaslov: 'Bez garancije',
    jamstvo:
      'Stranica radi kako radi. Trudimo se da podaci budu tačni i da bude dostupna, ali to ne možemo da garantujemo: zapisnici umeju da kasne, a statistika može da sadrži greške. To važi za besplatnu igru. Za usluge koje se plaćaju važe uslovi u odeljku Usluge koje se plaćaju i tvoja zakonska prava potrošača.',
    kajJePlacljivo:
      'Jedino što se plaća je neobavezna značka proverenog igrača (vidi Usluge koje se plaćaju niže).',
    podatkiPlacilo:
      '<b>Kupovina značke proverenog igrača (samo ako kupiš).</b> Zapis o kupovini (šta, kada, iznos i oznaka kupca kod Stripe-a) čuvamo 10 godina, kako to traže računovodstveni propisi. Adresu za dostavu štampane značke čuvamo 90 dana posle slanja ili otkazivanja porudžbine, a najduže 12 meseci od porudžbine, a zatim ostaje samo država.',
    dostopStripe:
      'Plaćanja značke proverenog igrača obrađuje <b>Stripe</b> (Stripe Payments Europe, Irska): dobija tvoje ime, imejl, adresu za račun i, za štampanu značku, adresu za dostavu. Podatke kartice unosiš direktno kod Stripe-a, mi ih ne vidimo.',
    placljivoNaslov:
      'Usluge koje se plaćaju: provereni igrači',
    placljivoUvod:
      'Igra je i ostaje besplatna. Plaća se samo neobavezna značka proverenog igrača, koju može da kupi igrač koji je potvrdio da je profil njegov. Značka nikad ne utiče na bodove, cene, fantasy timove ni pravila igre. Ovi uslovi važe za tu kupovinu.',
    prodajalec:
      '<b>Prodavac:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija, upisano u sudski registar pri Okružnom sudu u Ljubljani. Matični broj 9850538000, PDV ID SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Šta kupuješ.</b> Plavu kvačicu pored imena igrača i dodatke profila (duži opis, linkovi, naslovna slika, boja, istaknuta utakmica ili statistika, poruka navijačima). Godišnja pretplata košta 9,99 € i svake godine se automatski obnavlja. Kupovina zauvek košta 29 € jednokratno i važi dok SLFF nudi ovu uslugu. Uz kupovinu zauvek možeš da dodaš štampanu značku sa imenom za 5 € i poštarinu 2 € (Slovenija) ili 4 € (druga država EU). Šaljemo samo u države EU, dostava obično traje 2 do 3 nedelje. Sve cene uključuju PDV.',
    placilo:
      '<b>Plaćanje.</b> Plaćanje obrađuje Stripe. Podatke kartice ne vidimo i ne čuvamo. Možeš da kupiš samo ako imaš najmanje 18 godina. Ugovor je zaključen kada Stripe potvrdi plaćanje.',
    odpoved:
      '<b>Otkaz pretplate.</b> Pretplatu možeš da otkažeš bilo kada dugmetom Upravljaj pretplatom na stranici naloga (slff.eu/account) ili na profilu igrača. Otkaz važi na kraju plaćene godine; do tada značka ostaje. Za već započetu godinu ne vraćamo novac, osim u slučajevima niže.',
    odstop:
      '<b>Pravo na odustanak.</b> Digitalni sadržaj (kvačica i dodaci) isporučuje se odmah posle plaćanja. Pre plaćanja izričito pristaješ na trenutnu isporuku i potvrđuješ da time gubiš pravo na odustanak u roku od 14 dana (član 16 tačka (m) Direktive 2011/83/EU, slovenački ZVPot-1). Štampana značka izrađuje se po tvojim uputstvima (ime na znački), pa za nju nema prava na odustanak (član 16 tačka (c)). Zakonska garancija ostaje: ako značka stigne oštećena, pogrešna ili uopšte ne stigne, piši nam i besplatno ćemo je zameniti ili ti vratiti novac.',
    konec:
      '<b>Kada značka prestaje.</b> Značka prestaje ako se pokaže da profil nije tvoj i opozovemo potvrdu, ako ime igrača sakrijemo na njegov zahtev ili zahtev saveza ili ako izbrišeš nalog. Pretplata se tada automatski zaustavlja i više se ne naplaćuje. Ako plaćanje osporiš kod banke (chargeback), značka se oduzima.',
    vracila:
      '<b>Povraćaj novca.</b> Kod zloupotrebe ili lažne potvrde profila ne vraćamo novac. Ako značka prestane zbog naše greške, na zahtev saveza ili zato što ukinemo uslugu, kod godišnje pretplate vraćamo srazmerni deo za neiskorišćene mesece. Kod kupovine zauvek vraćamo ceo iznos u prvih 12 meseci od kupovine, a posle toga srazmerni deo preostatka do 5 godina od kupovine. Štampanu značku i poštarinu kod ukidanja ne vraćamo (značka ostaje tvoja), samo kod nedostatka ili kvara.',
    pritozbe:
      '<b>Pitanja i prigovori.</b> Piši na <eposta>info@slff.eu</eposta>, odgovaramo u roku od 8 radnih dana. Ne priznajemo nijedno telo za vansudsko rešavanje potrošačkih sporova. Primenjuje se slovenačko pravo; time ne gubiš zaštitu koju ti daje pravo države u kojoj živiš.',
    scoutNaslov: 'SLFF Scout: traženje igrača za klubove',
    scoutKaj:
      'Iz istih javnih zapisnika izračunavamo pokazatelje igrača seniorskih liga: udeo minuta, golove, uticaj na terenu, primljene golove, kartone i put kroz sezone, prilagođene snazi lige. To su pokazatelji iz podataka utakmica, a ne ocena osobe. Videće ih klubovi sa pretplatom na SLFF Scout koji traže igrače; odluku uvek donosi čovek u klubu. Omladinske lige ne obrađujemo. Ko je ikad igrao u omladinskoj ligi, isključen je dok nema minuta u seniorskoj ligi i na svom profilu ne upiše godinu rođenja prema kojoj ove godine puni najmanje 19 godina.',
    scoutPodlaga:
      'Pravni osnov je legitimni interes (član 6 stav 1 tačka (f) GDPR): pomoći klubovima da pronađu igrače iz javno objavljenih rezultata. Pokazatelje izračunavamo svaki dan iznova i čuvamo samo poslednje proračune. Preglede klubova beležićemo 12 meseci kako bismo sprečili zloupotrebu i kako bismo igraču na zahtev rekli koji su ga klubovi gledali.',
    scoutPrivolitev:
      'Igrač sa preuzetim profilom može da doda da je otvoren za transfer, godinu rođenja, željene regione i dozvolu za kontakt. To je pristanak (član 6 stav 1 tačka (a) GDPR): vide ga samo klubovi u Scoutu, može se povući u bilo kom trenutku na profilu, a posle povlačenja podatke brišemo. Klub igraču piše samo preko Scouta i ne vidi njegovu imejl adresu.',
    scoutUgovor:
      'Prigovor: na preuzetom profilu klikni Sakrij me iz Scouta ili piši na <eposta>info@slff.eu</eposta> sa linkom na stranicu igrača. U roku od 14 dana igrača skrivamo iz Scouta u svim našim ligama te države, i pri kasnijim uvozima. U fantasy igri ostaje.',
  },
  klubskiRacun: {
    naslov: 'Službeni nalog kluba',
    aktiven: 'Ovaj nalog predstavlja klub {klub}.',
    pravice: 'Kao klub možeš da uređuješ pozicije, dodaješ igrače i potvrđuješ profile svojih igrača.',
    vprasanje: 'Predstavljaš klub?',
    pojasnilo: 'Ako se prijaviš službenom adresom kluba koju imamo, automatski dobijaš klupski nalog. Ako je nemamo, zatraži je ispod i proverićemo je.',
    klub: 'Klub',
    isciKlub: 'Traži klub …',
    vloga: 'Tvoja uloga u klubu',
    vloge: {
      predsednik: 'predsednik',
      tajnik: 'sekretar',
      trener: 'trener',
      vodstvo: 'uprava kluba',
      drugo: 'ostalo',
    },
    dokaz: 'Link na kom je adresa objavljena (sajt, Facebook, savez)',
    opomba: 'Napomena (neobavezno)',
    naslovRacuna: 'Adresa koju potvrđujemo: {email}',
    poslji: 'Pošalji zahtev',
    caka: 'Zahtev za {klub} čeka na pregled.',
    cakaBrezKluba: 'Tvoja adresa je među službenim, ali moramo još da je povežemo sa klubom. Rešićemo uskoro.',
    cakaPolno: 'Klub već ima 5 naloga. Pregledaćemo i javiti ti.',
    zavrnjeno: 'Zahtev je odbijen: {razlog}',
    nepotrjen: 'Prvo potvrdi e-poštu svog naloga.',
    napake: {
      zeKlub: 'Već predstavljaš klub.',
      caka: 'Tvoj zahtev već čeka na odluku.',
    },
  },
}
