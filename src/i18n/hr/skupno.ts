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
  cena: '{v} mil. €',
  nalaganje: 'Učitavanje …',
  shrani: 'Spremi',
  preklici: 'Odustani',
  zapri: 'Zatvori',
  nazaj: 'Natrag',
  napaka: 'Greška: {sporocilo}',
}
