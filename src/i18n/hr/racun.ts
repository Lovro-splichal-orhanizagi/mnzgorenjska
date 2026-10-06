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
    naslov: 'Podsjetnici',
    napakaNalaganja: 'Postavke nije bilo moguće učitati.',
    napakaShranjevanja: 'Spremanje nije uspjelo. Pokušaj ponovno.',
    nalagam: 'Učitavam …',
    moraPrijava: 'Za uređivanje podsjetnika moraš se <prijava>prijaviti</prijava>.',
    opis: 'Prije roka kola poslat ćemo ti kratku poruku na {email} da ne zaboraviš urediti momčad.',
    posiljaj: 'Šalji mi podsjetnike e-poštom',
    shranjujem: 'Spremam …',
    vklopljeni: 'Podsjetnici su uključeni.',
    izklopljeni: 'Više ti nećemo slati podsjetnike.',
  },
  // Poveznica iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Potvrđujem …',
    preverjam: 'Provjeravam poveznicu …',
    neveljavna: 'Poveznica više nije valjana ili je već iskorištena. <prijava>Prijavi se</prijava> ili zatraži novu.',
  },
  // Brisanje računa (slff.eu/account).
  izbris: {
    naslov: 'Brisanje računa',
    moraPrijava: 'Za brisanje računa moraš se <prijava>prijaviti</prijava>.',
    opis: 'Obrisat ćemo račun {email}: profil, sve tvoje momčadi s poviješću bodova, glasove i mini lige koje si napravio. Brisanje nije moguće poništiti.',
    gumb: 'Obriši račun',
    potrdi: 'Da, obriši zauvijek',
    preklici: 'Odustani',
    brisem: 'Brišem …',
    napaka: 'Račun nije bilo moguće obrisati: {napaka}',
  },
  // Privatnost i uvjeti. <b> je podebljano, ostale oznake su poveznice.
  pravno: {
    naslov: 'Privatnost i uvjeti',
    zadnjaSprememba: 'Zadnja izmjena: 2. listopada 2026.',
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
      'Ne čuvamo adresu, broj telefona ni podatke o plaćanjima. Ne koristimo kolačiće za praćenje ni oglašivačke alate. U pregledniku su spremljeni tvoja sesija prijave, oznaka razgovora u chatu za pomoć ako ga otvoriš, i oznake sesije kojima posjet stranici brojimo samo jednom. Koliko je ljudi otvorilo koju stranicu čuvamo samo kao dnevni zbroj — bez tvojeg imena, računa, uređaja ili IP adrese.',
    dostopNaslov: 'Kome su podaci dostupni',
    dostop:
      'Podaci se obrađuju kod dvaju pružatelja usluga: <b>Supabase</b> (baza i prijava, poslužitelji u EU) i <b>Vercel</b> (smještaj stranice). Pošta za potvrdu i ponovno postavljanje lozinke ide preko <b>Resenda</b>, obavijesti u mobilnoj aplikaciji preko <b>Google Firebase Cloud Messaginga</b> (samo token uređaja i tekst obavijesti). Chat za pomoć u donjem desnom kutu radi preko <b>HelpStacka</b>: tamo ide ono što u njega napišeš i — ako si prijavljen — tvoje prikazno ime, da znamo kome odgovaramo. Kad ti pomoćnik u chatu pomaže, može vidjeti i na kojoj si stranici i u kojoj ligi te je li tvoja momčad valjana. E-adresu mu ne prosljeđujemo. Nikome drugome podatke ne prosljeđujemo i ne prodajemo ih.',
    statistikaNaslov: 'Statistika igrača',
    statistika:
      'Podaci o nogometašima (nastupi, golovi, kartoni) preuzeti su iz javno objavljenih zapisnika nogometnih saveza; koji su za odabranu ligu, piše u podnožju stranice. Pozicije i asistencije, kojih u zapisniku nema, određuje zajednica glasovanjem — zato mogu biti pogrešne. Ako nešto nije u redu, klikni igrača i javi nam.',
    grbi:
      'Grbovi klubova vlasništvo su pojedinih klubova i prikazani su samo radi prepoznavanja momčadi. Klub koji to ne želi neka nam piše i uklonit ćemo grb.',
    fotografijeNaslov: 'Fotografije',
    fotografije:
      'Fotografija na naslovnici djelo je Abigail Keenan i objavljena je na <unsplash>Unsplashu</unsplash> pod njihovom licencom, koja dopušta slobodnu upotrebu. Ne prikazuje igrače naših liga.',
    praviceNaslov: 'Tvoja prava',
    pravice:
      'Račun i sve svoje podatke možeš u svakom trenutku sam obrisati: u izborniku računa odaberi <b>Brisanje računa</b> (slff.eu/account). Za ispravak prikaznog imena ili ako brisanje ne uspije, piši nam na <eposta>info@slff.eu</eposta>. Brisanjem nestaje i tvoja momčad s ljestvice.',
    pravilaNaslov: 'Pravila igre',
    pravila:
      'Jedan čovjek, jedan račun. Glasovanje o asistencijama i pozicijama služi za stvarne ispravke — namjerno pogrešno glasovanje kvari igru svima i može dovesti do uklanjanja računa. Bodovanje i cijene mogu se tijekom sezone promijeniti ako se pokaže da je nešto nepravedno; takve promjene ćemo objaviti.',
    jamstvoNaslov: 'Bez jamstva',
    jamstvo:
      'Stranica radi kako radi. Trudimo se da podaci budu točni i da bude dostupna, ali to ne možemo jamčiti — zapisnici znaju kasniti, a statistika sadržavati greške.',
  },
}
