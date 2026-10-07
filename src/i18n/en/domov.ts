// English translation of `domov` (source: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'The data could not be loaded.',
  delNiNalozen: 'Some of the data did not load: {napaka}',
  uvod: {
    // League names stay as they are.
    gorenjskaMladinci: 'Gorenjska nogometna liga — mladinci',
    gorenjskaClani: '1. Gorenjska nogometna liga',
    geslo: 'Build a team. Score points. Win.',
    opis: 'Points come from the official match reports of {zveza} — goals, minutes, clean sheets, cards. Everything except assists, which the community decides.',
    vecLig: 'You can play in several leagues — <krepko>pick a league at the top left</krepko>; each has its own team and standings.',
    zacetekSezone: '<krepko>The season starts on {datum}</krepko> — build your team before the deadline.',
    zamudniki: '<krepko>Missed the start?</krepko> In <lestvica>Standings</lestvica> you compete from the round you join.',
    sestaviEkipo: 'Build your team',
    rezultati: 'Results and line-ups',
  },
  asistence: {
    cakajo: {
      one: '{n} goal is waiting for an assist',
      other: '{n} goals are waiting for an assist',
    },
  },
  rok: {
    seZaklene: 'Round {krog} locks',
  },
  krog: 'Round {krog}',
  brezKroga: 'No round',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Latest results',
    vsi: 'All results →',
    poglejTekmo: 'See the line-ups and points for this match',
  },
  najboljsi: {
    igralecSezone: 'Player of the season',
    celaLestvica: 'Full player rankings →',
    vodilni: {
      strelec: 'Top scorer',
      podajalec: 'Top assister',
      mreze: 'Most clean sheets',
    },
  },
  idealna: {
    naslov: 'Team of the round',
    krogSezona: 'Round {krog} · season {sezona}',
    opis: 'Best 11 of the last round; points under each shirt.',
  },
  povabi: {
    naslov: 'Invite a friend to the league',
  },
  skupnost: {
    brezAsistence: '{goli} without an assist',
    povejKdo: {
      one: 'Tell us who set it up — {n} vote confirms it',
      other: 'Tell us who set it up — {n} votes confirm it',
    },
    ugibanaPozicija: '{igralci} with a guessed position',
    pozicijaOdloca: 'The position decides what a goal is worth',
    odsotnosti: 'Injuries and absences',
    javi: 'Report who will not play — it saves others a round',
  },
  naslednje: {
    naslov: 'Upcoming matches',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'How to play',
    registracija: '1. Sign up',
    registracijaOpis: 'Create an account with Google or with email and password, and come up with a team name.',
    kader: '2. Build your squad',
    kaderOpis: 'Pick 15 players on the pitch: 2 goalkeepers, 5 defenders, 5 midfielders and 3 forwards — at most 3 from the same club, within a budget of 100.',
    enajsterica: '3. Pick your starting XI',
    enajstericaOpis: 'Eleven go on the pitch, four on the bench. The captain scores triple points; if he does not play, the vice-captain takes the armband.',
    poKrogu: '4. After every round',
    poKroguOpis: 'Points are calculated from the match reports. A player without minutes is automatically replaced by a substitute in the same position, and once a season you can use Bench+ to count your whole bench.',
  },
  kakoSeTockuje: 'How scoring works',
  moja: {
    tocke: 'Points',
    mesto: 'Rank',
    mestoOd: '{mesto} of {n}',
    uredi: 'My team →',
  },
  taTeden: 'This week',
  klepet: 'Chat and ideas',
}
