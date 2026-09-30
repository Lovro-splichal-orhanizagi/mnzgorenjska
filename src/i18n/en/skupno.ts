// English translation of `skupno` (source: src/i18n/sl/skupno.ts).
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Goalkeeper',
    DEF: 'Defender',
    MID: 'Midfielder',
    FWD: 'Forward',
  },
  pozicijaKratko: {
    GK: 'GK',
    DEF: 'DEF',
    MID: 'MID',
    FWD: 'FWD',
  },
  // English: one = 1, other = everything else (incl. 0 and decimals).
  besede: {
    tocke: { one: 'point', other: 'points' },
    tockRodilnik: { one: 'point', other: 'points' },
    tockeTozilnik: { one: 'point', other: 'points' },
    igralci: { one: 'player', other: 'players' },
    ekipe: { one: 'team', other: 'teams' },
    tekme: { one: 'match', other: 'matches' },
    goli: { one: 'goal', other: 'goals' },
    glasovi: { one: 'vote', other: 'votes' },
    krogi: { one: 'round', other: 'rounds' },
  },
  cena: '€{v}M',
  nalaganje: 'Loading …',
  shrani: 'Save',
  preklici: 'Cancel',
  zapri: 'Close',
  nazaj: 'Back',
  napaka: 'Error: {sporocilo}',
}
