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
    push: 'Push obaveštenja (mobilna aplikacija)',
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
  // Brisanje naloga (slff.eu/account).
  izbris: {
    naslov: 'Brisanje naloga',
    moraPrijava: 'Za brisanje naloga moraš da se <prijava>prijaviš</prijava>.',
    opis: 'Obrisaćemo nalog {email}: profil, sve tvoje timove sa istorijom bodova, glasove i mini lige koje si napravio. Brisanje nije moguće poništiti.',
    gumb: 'Obriši nalog',
    potrdi: 'Da, obriši zauvek',
    preklici: 'Otkaži',
    brisem: 'Brišem …',
    napaka: 'Nalog nije bilo moguće obrisati: {napaka}',
  },
  // Privatnost i uslovi. <b> je podebljano, ostale oznake su linkovi.
  pravno: {
    naslov: 'Privatnost i uslovi',
    zadnjaSprememba: 'Poslednja izmena: 9. oktobar 2026.',
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
      'Ne čuvamo adresu, broj telefona ni podatke o plaćanjima. Ne koristimo kolačiće za praćenje ni reklamne alate. U pregledaču su sačuvani tvoja sesija prijave, oznaka razgovora u četu za pomoć ako ga otvoriš i oznake sesije kojima posetu stranici brojimo samo jednom. Koliko je ljudi otvorilo koju stranicu čuvamo samo kao dnevni zbir, bez tvog imena, naloga, uređaja ili IP adrese. Opštu statistiku poseta (koje stranice, odakle posetioci dolaze, vrsta uređaja i država, nekoliko radnji poput sastavljanja tima) beleži <b>Umami</b> na našem serveru: bez kolačića, IP adresu ne čuva i posetu ne povezuje sa tvojim nalogom. Ako pregledač ima uključenu opciju „Ne prati“, ne beleži se ništa.',
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
      'Nalog i sve svoje podatke možeš u svakom trenutku sam da obrišeš: u meniju naloga izaberi <b>Brisanje naloga</b> (slff.eu/account). Za ispravku imena za prikaz ili ako brisanje ne uspe, piši nam na <eposta>info@slff.eu</eposta>. Brisanjem nestaje i tvoj tim sa tabele.',
    pravilaNaslov: 'Pravila igre',
    pravila:
      'Jedan čovek, jedan nalog. Glasanje o asistencijama i pozicijama služi za stvarne ispravke: namerno pogrešno glasanje kvari igru svima i može dovesti do uklanjanja naloga. Bodovanje i cene mogu se tokom sezone promeniti ako se pokaže da je nešto nepravedno; takve promene ćemo objaviti.',
    jamstvoNaslov: 'Bez garancije',
    jamstvo:
      'Stranica radi kako radi. Trudimo se da podaci budu tačni i da bude dostupna, ali to ne možemo da garantujemo: zapisnici umeju da kasne, a statistika može da sadrži greške.',
  },
}
