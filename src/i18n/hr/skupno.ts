// Hrvatski prijevod zajedničkih nizova (izvor: src/i18n/sl/skupno.ts).
// Nazivi kao u hrvatskom nogometu: vratar, branič, vezni, napadač.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Vratar',
    DEF: 'Branič',
    MID: 'Vezni',
    FWD: 'Napadač',
  },
  pozicijaKratko: {
    GK: 'VRA',
    DEF: 'BRA',
    MID: 'VEZ',
    FWD: 'NAP',
  },
  // Hrvatski: one = 1, 21, 31 …; few = 2–4, 22–24 …; other = 0, 5–20 …
  besede: {
    tocke: { one: 'bod', few: 'boda', other: 'bodova' },
    tockRodilnik: { one: 'boda', few: 'boda', other: 'bodova' },
    tockeTozilnik: { one: 'bod', few: 'boda', other: 'bodova' },
    igralci: { one: 'igrač', few: 'igrača', other: 'igrača' },
    ekipe: { one: 'momčad', few: 'momčadi', other: 'momčadi' },
    tekme: { one: 'utakmica', few: 'utakmice', other: 'utakmica' },
    goli: { one: 'gol', few: 'gola', other: 'golova' },
    glasovi: { one: 'glas', few: 'glasa', other: 'glasova' },
    krogi: { one: 'kolo', few: 'kola', other: 'kola' },
  },
  cena: '{v} M€',
  nalaganje: 'Učitavanje …',
  shrani: 'Spremi',
  preklici: 'Odustani',
  zapri: 'Zatvori',
  nazaj: 'Natrag',
  napaka: 'Greška: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Mini lige s tim kodom nema.',
    niTvojaEkipa: 'To nije tvoja momčad.',
    imeMiniLige: 'Ime mini lige treba imati između 2 i 40 znakova.',
    prijavaMiniLiga: 'Za mini ligu se trebaš prijaviti.',
    niDovoljenja: 'Nemaš dopuštenje za uređivanje ove momčadi.',
    kodaNeUstvarjena: 'Kod mini lige nije bilo moguće stvoriti. Pokušaj ponovno.',
    golOdlocen: 'O ovom golu je već odlučeno, glasanje je završeno.',
    zePoznavalec: 'Već si poznavatelj ove lige.',
    prosnjaCaka: 'Tvoj zahtjev za ovu ligu već čeka.',
    prosnjaZavrnjena: 'Zahtjev za ovu ligu nedavno je odbijen. Novi možeš poslati 14 dana nakon odbijanja.',
    klubNeIgra: 'Odabrani klub ne igra u ovoj ligi.',
  },
}
