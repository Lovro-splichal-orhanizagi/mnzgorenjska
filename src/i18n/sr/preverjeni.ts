// Javna stranica Proveren profil igrača (`/verified`, pages/Preverjeni.tsx).
// Cene i obnova dolaze iz kupovine (`igralci.preverjen.ponudba.*`), ovde ih nema.
export const preverjeni = {
  naslov: 'Proveren profil igrača',
  opis: 'Plava kvačica, naslovna slika, opis, linkovi i do 6 pregledanih snimaka na tvom profilu igrača u SLFF-u.',
  glava: 'Tvoj fudbal. Tvoj profil. Tvoj domet.',
  uvod: 'Proveren profil je tvoja stranica igrača u SLFF-u: plava kvačica uz ime, naslovna slika, opis, linkovi i snimci tvojih poteza.',
  noga: 'Proveren profil igrača',
  vec: 'Više o proverenom profilu →',
  nalaga: 'Učitavanje …',
  primer: {
    oznaka: 'Primer rasporeda, tvoj profil će biti tvoj',
    ime: 'Ime i prezime',
    klub: 'Pozicija · Klub',
    opis: 'Ovde reci ko si, gde igraš i šta te pokreće.',
    posnetek: 'Snimak {n}',
    alt: 'Igralište SLFF-a',
  },
  kaj: {
    naslov: 'Šta dobijaš',
    kljukica: 'Plava kvačica uz tvoje ime svuda u igri.',
    profil: 'Bogatija naslovna slika, opis i linkovi (YouTube, X, veb sajt) i poruka navijačima.',
    posnetki: 'Do 6 snimaka na vrhu profila. Svaki snimak prvo pregleda tim SLFF-a.',
    ogledi: 'Ukupan pregled prikaza skauta na tvom profilu, gde je dostupan SLFF Scout.',
    izbranost: 'Koliko te fantasy timova izabralo i koji su to timovi.',
  },
  koraki: {
    naslov: 'Kako do njega',
    poisci: { naslov: 'Pronađi svoj profil', opis: 'Pronađi sebe među igračima svoje lige.' },
    prevzemi: {
      naslov: 'Preuzmi ga i sačekaj potvrdu',
      opis: 'Pritisni „Ovo sam ja“. Kad te potvrdimo, možeš i bez plaćanja da otpremiš fotografiju.',
    },
    izberi: { naslov: 'Izaberi godišnje ili doživotno', opis: 'Kupovina je na internetu.' },
    uredi: { naslov: 'Uredi i pokaži', opis: 'Dodaj naslovnu sliku, opis, linkove i snimke.' },
  },
  cena: {
    naslov: 'Cena',
    obnova: 'Godišnja pretplata se obnavlja. Upravljaš njome ili je otkazuješ preko portala Stripe.',
  },
  cta: {
    poisci: 'Pronađi svoj profil',
    poisciOpis: 'Preuzimanje profila je besplatno.',
    caka: 'Tvoj zahtev za preuzimanje čeka potvrdu.',
    odpriZahtevek: 'Otvori profil',
    preveri: 'Proveri moj profil igrača',
    preveriOpis: 'Godišnja pretplata ili jednokratna doživotna kupovina.',
    profil: 'Idi na svoj profil',
    preverjen: 'Tvoj profil je proveren. Uredi ga i pokaži snimke.',
    brezPonudbe: 'Provereni profili su za punoletne igrače sa prikazanim imenom.',
  },
}
