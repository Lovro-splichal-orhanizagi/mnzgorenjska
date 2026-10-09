// Srpski prevod: `skupno` (izvor: src/i18n/sl/skupno.ts).
// Nazivi kao u srpskom fudbalu: golman, odbrambeni, vezni, napadač.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Golman',
    DEF: 'Odbrambeni',
    MID: 'Vezni',
    FWD: 'Napadač',
  },
  pozicijaKratko: {
    GK: 'GOL',
    DEF: 'ODB',
    MID: 'VEZ',
    FWD: 'NAP',
  },
  // Srpski: one = 1, 21, 31 …; few = 2–4, 22–24 …; other = 0, 5–20 …
  besede: {
    tocke: { one: 'bod', few: 'boda', other: 'bodova' },
    tockRodilnik: { one: 'boda', few: 'boda', other: 'bodova' },
    tockeTozilnik: { one: 'bod', few: 'boda', other: 'bodova' },
    igralci: { one: 'igrač', few: 'igrača', other: 'igrača' },
    ekipe: { one: 'tim', few: 'tima', other: 'timova' },
    tekme: { one: 'utakmica', few: 'utakmice', other: 'utakmica' },
    goli: { one: 'gol', few: 'gola', other: 'golova' },
    glasovi: { one: 'glas', few: 'glasa', other: 'glasova' },
    krogi: { one: 'kolo', few: 'kola', other: 'kola' },
  },
  cena: '{v} M€',
  nalaganje: 'Učitavanje …',
  shrani: 'Sačuvaj',
  preklici: 'Otkaži',
  zapri: 'Zatvori',
  nazaj: 'Nazad',
  napaka: 'Greška: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Mini liga sa tim kodom ne postoji.',
    niTvojaEkipa: 'To nije tvoj tim.',
    imeMiniLige: 'Ime mini lige mora imati između 2 i 40 znakova.',
    prijavaMiniLiga: 'Za mini ligu moraš da se prijaviš.',
    niDovoljenja: 'Nemaš dozvolu za uređivanje ovog tima.',
    kodaNeUstvarjena: 'Kod mini lige nije bilo moguće napraviti. Pokušaj ponovo.',
    golOdlocen: 'O ovom golu je već odlučeno, glasanje je završeno.',
    zePoznavalec: 'Već si poznavalac ove lige.',
    prosnjaCaka: 'Tvoj zahtev za ovu ligu već čeka.',
    prosnjaZavrnjena: 'Zahtev za ovu ligu je nedavno odbijen. Novi možeš da pošalješ 14 dana posle odbijanja.',
    klubNeIgra: 'Izabrani klub ne igra u ovoj ligi.',
  },
}
