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
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'There is no mini league with this code.',
    niTvojaEkipa: "That isn't your team.",
    imeMiniLige: 'The mini league name must be 2 to 40 characters.',
    prijavaMiniLiga: 'Sign in to use mini leagues.',
    niDovoljenja: "You can't edit this team.",
    kodaNeUstvarjena: "Couldn't create a mini league code. Try again.",
    golOdlocen: 'This goal is already decided; voting is closed.',
    zePoznavalec: "You're already an insider for this league.",
    prosnjaCaka: 'Your request for this league is already pending.',
    prosnjaZavrnjena: 'Your request for this league was recently declined. You can send a new one 14 days later.',
    klubNeIgra: "The selected club doesn't play in this league.",
  },
}
