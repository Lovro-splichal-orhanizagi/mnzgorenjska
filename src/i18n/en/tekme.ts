// English translation of `tekme` (source: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: 'Round {n}',
  moraPrijava: 'You need to <prijava>log in</prijava> to vote.',

  // Points breakdown items and rules (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Played 60 minutes or more',
      nastopDo60: 'Played up to 60 minutes',
      gol: 'Goal',
      goli: 'Goals ({n})',
      asistenca: 'Assist',
      asistence: 'Assists ({n})',
      brezPrejetega: 'Clean sheet',
      zmaga: 'Team win',
      prejetiGoli: 'Goals conceded ({n})',
      obranjena: 'Penalty saved ({n})',
      zgresena: 'Penalty missed ({n})',
      avtogol: 'Own goal ({n})',
      rumeni: 'Yellow card ({n})',
      rdeci: 'Red card',
    },
    pravila: {
      igralniCas: 'Playing time',
      nastopDo60: 'Played up to 60 minutes',
      nastopOd60: 'Played 60 minutes or more',
      goliInAsistence: 'Goals and assists',
      golVratarja: 'Goal by a goalkeeper',
      golBranilca: 'Goal by a defender',
      golVezista: 'Goal by a midfielder',
      golNapadalca: 'Goal by a forward',
      asistenca: 'Assist',
      obramba: 'Defending',
      csVratar: 'Clean sheet — goalkeeper',
      csBranilec: 'Clean sheet — defender',
      csVezist: 'Clean sheet — midfielder',
      zmaga: 'Team win — goalkeeper, defender',
      prejeta2: 'Every 2 goals conceded — goalkeeper, defender',
      // Below the rules table on the home page.
      opomba:
        'A clean sheet counts with at least 60 minutes played; only goals conceded while the player is on the pitch count.',
      obranjena:
        'Penalty saved — goalkeeper (the match report records it as the opponent’s missed penalty)',
      kazni: 'Deductions',
      zgresena: 'Penalty missed',
      avtogol: 'Own goal',
      rumeni: 'Yellow card',
      rdeci: 'Red card',
    },
  },

  rezultati: {
    naslov: 'Results',
    uvod:
      'Matches played, from the {zveza} match reports. Click a match to see both lineups on the pitch — each shirt shows the points the player earned.',
    niZacetka: 'The season hasn’t started yet.',
    prazenKrog: 'No matches have been played in this round.',
  },

  tekma: {
    naslov: 'Match',
    niTekme: 'This match isn’t in the match reports.',
    nazaj: '← Results',
    brezPostav:
      'The match report doesn’t list the lineups, so points per player can’t be shown.',
    naDresu:
      'Each shirt shows how many points the player earned in this match. Click a player to open their page.',
    cakajo: {
      one: '{n} goal in this match is waiting for an assist — until it gets one, the provider misses out on +3 points. Tell us below who set it up.',
      other: '{n} goals in this match are waiting for an assist — until they get one, the providers miss out on +3 points. Tell us below who set them up.',
    },
    goliInAsistence: 'Goals and assists',
    prijaviSe: 'Log in to vote',
  },

  // Assists page (voting on assists).
  glasovanje: {
    naslov: 'Assists',
    kdoJePodal: 'Who provided the assist?',
    uvod:
      'The {zveza} match reports record scorers but not assists. The community decides: once the same player gets <b>{glasov}</b> for a goal, the assist is awarded and brings <b>+3 points</b>.',
    pragGlasov: { one: '{n} vote', other: '{n} votes' },
    niTekem: 'No matches have been played this season yet',
    niTekemOpis:
      'Assist voting opens as soon as the first round has been played. Come back when the match reports are in.',
    arhiv: 'archive',
    preteklaSezona:
      'You’re voting on a past season. It doesn’t affect points in the current league — it only corrects the history.',
    izberiKrog: '1. Choose a round',
    izberiTekmo: '2. Choose a match',
    vsePotrjeno: 'All confirmed',
    zaprto: 'closed',
    poglejTekmo: 'See the lineups and points for this match →',
    niGolov: 'There were no goals in this match.',
    vsePotrjene: 'All assists in this match are confirmed. 🎉',
    zaprtoOpis: 'Voting on this match is closed — it stays open until the next round’s deadline.',
    brezPotrjene: 'No confirmed assist: {goli}.',
  },

  // Goal card with voting (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'unknown scorer',
    avtogol: 'Own goal — {ime}',
    enajstmetrovka: '{ime} — penalty',
    brezAsistenceOpomba: 'no assist',
    potrjena: 'assist confirmed — locked',
    brezAsistence: 'No assist',
    odlocilaSkupnost: 'as decided by the community',
    morasSePrijaviti: 'You need to log in to vote',
    spremeniGlas: 'Change vote',
    kdoJePodal: 'Who provided the assist?',
    vodiBrez: 'Leading: “no assist”',
    vodi: 'Leading: <b>{ime}</b>',
    igralecBrezZapisa: 'player not in the report',
    doOdlocitve: '— {n} more to decide',
    ostali: 'Others:',
    brezGlasovi: 'none ({n})',
    izberiPodajalca: 'Choose the assist provider — {ekipa}',
    nihce: 'Nobody — goal without an assist',
  },

  // Positions page (voting on positions).
  pozicije: {
    naslov: 'Positions',
    kjeKdoIgra: 'Who plays where?',
    uvod:
      'Match reports only mark the goalkeeper and list lineups by shirt number — so positions can’t be read from them. The community decides. Votes needed: <b>{prag}</b> — the number drops (down to {minPrag}) if the statistical prior (shirt number, goals, cards) points strongly that way. Votes from <b>club insiders</b> and users with <b>high accuracy</b> count for more.',
    enkratNaTeden:
      'Voted positions take effect <b>once a week, on Monday morning</b>, all at once. That way the league doesn’t shift under your fingers during the week: what you see on Tuesday still holds on Saturday when the round locks. A player who already has enough votes is marked with an hourglass <ikona>⏳</ikona> until then.',
    klub: 'Club',
    poznavalecOznaka: '  ★ insider',
    samoIzStatistike: 'Stats only ({n})',
    vsiPotrjeni: 'Every player at this club has a confirmed position. 🎉',
    niIgralcev: 'No players.',
    status: {
      naslov: 'My voter status',
      utezOpis:
        'The weight of each vote — the insider bonus is added when you vote on a player from your club.',
      utez: 'weight {utez}×',
      tocnih: '({pravilni}/{vsi} correct)',
      klubPoznam: 'A club I know well (insider) — my vote on this club’s players counts for more:',
      nisemPoznavalec: '— not an insider for any club —',
      opomba:
        'An insider picks only one club. Weights settle over time — if your votes turn out to be wrong, your trust goes down. Trust is recalculated from past votes once the position is known.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · {cs} clean sheets',
      izZapisnika: 'From the match report — goalkeeper is marked with (V)',
      izStatistike: 'From stats (shirt no., goals, cards) — votes can correct it',
      potrdilaSkupnost: 'Confirmed by the community',
      zapisnik: ' · match report',
      uveljavitevOpis:
        'Positions take effect once a week, on Monday morning — so the league doesn’t shift under your fingers during the week.',
      izglasovano: 'voted: {pozicija} · on Monday',
      neIgraOpis: 'No longer plays — not on the market. If he appears in a match report, he returns automatically.',
      neIgra: 'no longer plays',
      vrniOpis: 'Return the player to active',
      vrni: 'restore',
      odhodOpis:
        'The player no longer plays for this club — removes him from the market. An appearance in a match report brings him back automatically.',
      statistikaKaze:
        'Stats point to <b>{pozicija} ({odstotek}%)</b> — a vote that way counts against a lower threshold ({nizji} instead of {prag}).',
      dolocenaIzStatistike: 'The position was set from stats — if it’s wrong, click the right one.',
      dolocilaSkupnost: 'The position was set by the community — votes can correct it.',
      gumbUtez: 'Weight {utez} / threshold {prag}',
      gumbPrior: ' · prior {odstotek}%',
      gumbPoznavalec: ' · your insider vote counts for more',
      vodi: 'Leading: {pozicija} — weight {utez} / {prag}',
    },
  },
}
