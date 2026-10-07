// English translation of `mojaEkipa` (source: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'My team',
  /** Fallback when the player's name is unknown. */
  igralec: 'Player',
  vprasanjeZapustitve: 'You have unsaved team changes. Leave the page anyway?',
  /** Armband label on the shirt. */
  oznaka: {
    kapetan: 'C',
    namestnik: 'V',
  },

  // Squad rules (lib/pravila.ts) — reasons in the market and the error list.
  pravila: {
    pozicije: {
      GK: 'Goalkeepers',
      DEF: 'Defenders',
      MID: 'Midfielders',
      FWD: 'Forwards',
    },
    kaderPoln: 'Your squad is full ({n} players).',
    pozicijaPolna: '{pozicija}: you already have {n} in your squad.',
    premaloProracuna: 'Not enough budget — the player costs {cena}, you have {preostalo} left.',
    izKluba: 'You already have {n} players from {klub}.',
    velikostEkipe: 'Your squad must have {n} players (currently {trenutno}).',
    velikostPostave: 'Your starting XI must have {n} players (currently {trenutno}).',
    brezPozicije: {
      one: '{n} selected player has no confirmed position yet — help out in the Positions section.',
      other: '{n} selected players have no confirmed position yet — help out in the Positions section.',
    },
    niVecVLigi: '{ime} is no longer in the league — replace him.',
    pozicijaVKadru: '{pozicija} in squad: {n} — must be {kader}.',
    pozicijaVPostavi: '{pozicija} in starting XI: {n} — allowed {min}–{max}.',
    dolociKapetana: 'Pick a captain — he scores {n}× points in the round.',
    enKapetan: 'You can only have one captain.',
    dolociNamestnika: 'Pick a vice-captain to take the armband if the captain doesn’t play.',
    istiKlub: 'You can pick at most {n} players from the same club.',
    presegelProracun: 'You are over budget by {cena}.',
  },

  napake: {
    zeImas: 'You already have a team in this league — reload the page.',
    dovoljenje: 'You don’t have permission for this. Log in again and try once more.',
    povezava: 'No connection to the server. Check your internet and try again.',
    shranjevanje: 'Saving failed. Please try again.',
    nalaganjePovezava: 'No connection to the server — check your internet.',
    nalaganje: 'Couldn’t load your team data.',
    nalaganjeNiCelo:
      'Your team can’t be saved until it has fully loaded — otherwise saving would remove players that didn’t load.',
    poskusiZnova: 'Try again',
    vpisiIme: 'Enter a team name first.',
    osvezitev:
      'Your team is saved, but refreshing failed — reload the page before editing it again.',
    najprejShrani: 'Save your team first.',
    izberiKrog: 'Choose the round the chip should apply to.',
    prihodnjiKrog: 'Choose an upcoming, unlocked round with a set deadline.',
    zeUporabil: 'You’ve already used this chip this season.',
    niPreklica: 'The chip for this round can no longer be cancelled.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'There are no players on the market in this league yet.',
    pocakaj: 'Wait for saving to finish.',
    niPredloga: 'A valid team can’t be built from this league yet.',
    predlogSestavljen: 'Your team is built — swap anyone you like and press Save.',
    kaderDopolnjen: 'Empty spots are filled — check them and press Save.',
    niDopolnitve:
      'Your squad can’t be completed with the money you have left. Replace one of the expensive players and try again.',
    kapetanNaKlop: '{ime} has moved to the bench — pick a new captain.',
    namestnikNaKlop: '{ime} has moved to the bench — pick a new vice-captain.',
    brezPozicije: 'This player has no confirmed position yet, so he can’t be put on the pitch.',
    niProstora:
      'There’s no room in the starting XI for another player in this position — bench someone first.',
    niVecNamestnik: '{ime} is no longer vice-captain — pick a new one.',
    niVecKapetan: '{ime} is no longer captain — pick a new one.',
    rokPotekel: 'The round {krog} deadline has passed, so changes apply from the next round.',
    shranjenaZaKrog: 'Your team is saved and ready for round {krog}.',
    shranjenaVeljavna: 'Your team is saved and meets the rules.',
    osnutekShranjen:
      'Draft saved — your team doesn’t meet the rules yet, so it wouldn’t score points this round.',
    prodaja: 'Selling earned you +{cena}.',
    nakupi: 'Purchases cost {cena}.',
    wildcardVlozen: 'Wildcard played — transfers this round are free.',
    klopPlusVlozen: 'Bench+ played.',
    wildcardPreklican: 'Wildcard cancelled — you can use it in another round.',
    klopPlusPreklican: 'Bench+ cancelled — you can use it in another round.',
    zapriOpozorilo: 'Close warning',
    zapriObvestilo: 'Close notice',
    odstranjen: '{ime} removed.',
    razveljavi: 'Undo',
  },

  prijavaPotrebna: 'You need to log in to build a team.',
  prijava: 'Log in',
  locenaLiga:
    'Your team in <liga>{liga}</liga> is separate from your teams in other leagues — with its own budget and its own standings. Points count from round {krog} onwards, because transfers and moves between age groups are still happening until then.',

  prestopi: {
    stevec: 'Transfers: {n}/{prosti}',
    wildcard: 'wildcard — no penalty',
    odbitek: '{tock} deducted this round',
    prosti: {
      one: '{n} more free, then −{kazen} each',
      other: '{n} more free, then −{kazen} each',
    },
  },

  // Transfer tips (lib/namigiEkipe.ts) — who won't play next round and whom
  // you can afford instead.
  namigi: {
    naslov: 'Transfer tips',
    zaKrog: 'Who probably won’t play in round {krog} and whom you can afford instead.',
    razlog: {
      neaktiven: 'no longer in the league',
      poskodba: 'injured',
      odsotnost: 'unavailable',
      brezTekme: 'club not playing',
    },
    kandidat: '{cena} · form {forma}',
    zamenjajNamig: 'Replace {ime} with {novi} in your squad',
    niZamenjave: 'No replacement fits your budget and the rules.',
    opomba: 'A click only prepares the swap — you save the team yourself. Each tip stands on its own.',
    skrij: 'Hide until next round',
    zamenjano: '{novi} is in your squad instead of {ime}. Save your team when you’re happy.',
  },

  // Price changes of squad players since the last visit.
  odZadnjegaObiska: {
    naslov: 'Since your last visit',
    naslovTeden: 'In the last week',
    vrednost: 'Team value <znesek>{znak}{cena}</znesek>',
    gor: 'price rise',
    dol: 'price drop',
    zapri: 'Close',
  },

  // Red banner when the team breaks the rules.
  neustreza: {
    naslov: 'Your team does NOT meet the rules',
    zaKrog: 'In this state you <krepko>WON’T score points</krepko> <krepko>for round {krog}</krepko>.',
    zaKrogRok:
      'In this state you <krepko>WON’T score points</krepko> <krepko>for round {krog}</krepko> (deadline: {rok}).',
    konkretne: 'Specific problems:',
    pogosto:
      'This often happens when a position vote moves a player (e.g. from forward to midfielder) and breaks your squad. Fix it now, before the deadline.',
  },

  povzetek: {
    naVoljo: 'Remaining',
    bogastvo:
      'wealth <vrednost>{bogastvo}</vrednost><razlika></razlika> · squad {kader} <placano>paid</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Saving …',
    shraniEkipo: 'Save team',
    neshranjeno: 'Unsaved changes',
    stevec: '{n}/{igralcev} · XI {prvi}/{prvih}',
    imeEkipe: 'Team name',
    fiksnoNamig: 'The team name is fixed after the first save — one label on the standings and in the history.',
    fiksno: '🔒 fixed',
    privzetoIme: 'FC {ime}',
    primerImena: 'e.g. Sunday Heroes',
    imeNamig: 'You can change the name any time.',
  },

  // Starter tip for an empty team.
  zacetek: {
    naslov: 'Where to start?',
    sestaviMi: '🎲 Build me a team',
    opisPredloga:
      'We pick a random valid team within budget — different with every click. Then swap anyone you like and save.',
    sam: 'I’d rather build it myself',
    drugPredlog: '🎲 Another suggestion',
    opisDrugegaPredloga:
      'Don’t like it? Draw a new team — it’s free until you save.',
    dopolni: '🎲 Complete my team',
    opisDopolnitve:
      'Empty squad spots: {n}. Your picks stay; we fill the rest at random within budget.',
    korak1: 'We suggested a team name above — change it any time.',
    korak2:
      'Click <krepko>＋</krepko> on an empty spot on the pitch. On a phone there’s also a <krepko>＋ Add</krepko> button in the bottom bar; on a computer you pick from the <krepko>player market</krepko> on the right.',
    korak3:
      'The squad is {n} players: {gk} GK, {def} DEF, {mid} MID, {fwd} FWD. At most {klub} from the same club.',
    korak4:
      'Once all spots are filled, pick a <krepko>captain</krepko> and a <krepko>vice-captain</krepko>, then press <krepko>Save team</krepko> (on a phone, <krepko>Save</krepko> in the bottom bar).',
  },

  trak: {
    naslov: 'Armband',
    kapetan: 'Captain (×{n})',
    namestnik: 'Vice-captain',
    opis: 'The captain scores triple points. If he doesn’t play, the vice-captain takes the armband.',
    nihce: '— nobody —',
  },

  // "What if": what the current lineup would have scored in the last round.
  kajCe: {
    prinesla: 'Your current lineup would have scored in <krog>round {krog}</krog> ({sezona})',
    opis: 'A "what if" view — not a historical result; it changes with every swap. Actual points for past rounds are in the standings and in the lineup snapshot.',
  },

  status: {
    pripravljena: 'Your team is ready to save.',
    manjka: 'A few things are still needed for a final save:',
    vpisiIme: 'Enter a team name (in the field above).',
    osnutekZdaj: 'You can save a draft now too — and sort out the rules later.',
    shraniOsnutek: 'Save draft',
    imeObvezno: 'A team name is required — clicking takes you back to the field above.',
    kajPomeni:
      '<krepko>What does "Save" do?</krepko> Your changes (squad, lineup, captain) are written to the database. For the current round, the state at the deadline counts. Until the deadline you can change things and press Save as often as you like — the last version counts. <krepko>"Save draft"</krepko> does the same, just noting that the team doesn’t meet all the rules yet (you need fixes to score points — see the list above).',
    kajPomeniRok:
      '<krepko>What does "Save" do?</krepko> Your changes (squad, lineup, captain) are written to the database. For the current round, the state at the deadline counts (<krepko>round {krog} — {rok}</krepko>). Until the deadline you can change things and press Save as often as you like — the last version counts. <krepko>"Save draft"</krepko> does the same, just noting that the team doesn’t meet all the rules yet (you need fixes to score points — see the list above).',
  },

  pripomocki: {
    klopPlusNaslov: 'Bench+ chip',
    klopPlusVlozenZa: 'Played for round {krog} ({sezona}) — bench points count too.',
    klopPlusVlozen: 'Bench+ is already played — bench points count too.',
    klopPlusOpis:
      'Once a season: in the chosen round, the points of all four substitutes are added as well.',
    wildcardNaslov: 'Wildcard chip',
    wildcardVlozenZa: 'Played for round {krog} ({sezona}) — transfers in it are free.',
    wildcardVlozen: 'Wildcard is already played — transfers in it are free.',
    wildcardOpis:
      'Once a season: in this round you can replace as many players as you like, with no points deduction.',
    zaklenjen: '🔒 locked',
    preklici: 'cancel',
    prekliciDo: 'You can cancel until <odstevanje></odstevanje>',
    izberiKrog: 'Choose a round …',
    niKroga: 'No upcoming round with a deadline',
    krogSezona: 'Round {krog} ({sezona})',
    vlozi: 'Play',
    vloziZa: 'Play for round {krog}',
    potrdiWildcard: 'Play your Wildcard for round {krog}? You only get one per season.',
  },

  zgodovina: {
    naslov: 'Lineup history',
    posnetkov: {
      one: '{n} round with a snapshot',
      other: '{n} rounds with snapshots',
    },
    krog: 'Round {krog}',
    podrobnost: 'Round {krog} · season {sezona}',
    podrobnostSkupaj: 'Round {krog} · season {sezona} · total <krepko>{tocke}</krepko>',
    deli: 'Share round {krog}',
  },

  // Bottom bar and market drawer on phones.
  telefon: {
    ostane: 'left',
    predalPovzetek: '<krepko>{cena}</krepko> left · {n}/{velikost}',
    popravi: 'fix ↑',
    neshranjeno: 'unsaved',
    dodaj: '＋ Add',
    osnutekNamig: 'Your team doesn’t meet the rules yet — it will be saved as a draft.',
    neIzpolnjuje: 'team doesn’t meet the rules yet',
    zapriTrg: 'Close market',
    zapri: '✕ Close',
  },

  trg: {
    naslov: 'Player market',
    iskanje: 'Search by name …',
    pocistiIskanje: 'Clear search',
    vsi: 'all',
    vsiKlubi: 'All clubs',
    niZadetkov: 'No results.',
    pocistiFiltre: 'Clear filters',
    statLetos: '{goli} G · {minute} min',
    statLani: 'last season {goli} G',
    brezNastopov: 'no appearances',
    niVecVLigi: 'no longer in the league',
    tockeZadnjiKrog: 'Points in the last round played',
    podatki: 'Details for {ime}',
    podatkiNamig: 'Stats, price history, upcoming fixtures',
    profilVNovemZavihku: 'Open player profile in a new tab',
    odstrani: '✕ remove',
    dodaj: '⊕ add',
    prvih: 'Showing the first {n} — narrow it down with search.',
    noga: 'You can pick at most {n} players from the same club. Goals and minutes are from the current season.',
  },

  rok: {
    krog: 'Round {krog}',
    potekel: 'Deadline passed — <krepko>{rok}</krepko>',
    rok: 'Deadline: <krepko>{rok}</krepko>',
    niDolocen: 'No deadline set yet.',
    naslednji: 'Changes now apply to the next round.',
    obRoku: 'Your lineup is captured at the deadline — change it freely until then.',
  },

  // Pitch in the team builder (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Move to bench',
    vPostavo: 'Move into starting XI',
    niVecVLigiNamig: 'This player is no longer in the league — a squad with him scores no points.',
    niVecVLigi: 'no longer in the league',
    poskodba: 'injury',
    odsoten: 'unavailable',
    kapetan: 'Captain — triple points',
    namestnik: 'Vice-captain',
    tockeKroga: 'Points in the last round: {tocke}',
    tockeKrogaKapetan: 'Points in the last round: {tocke} × 3 (captain)',
    odstraniIzKadra: 'Remove from squad',
    odstrani: 'Remove {ime}',
    prej: 'Earlier in substitution order',
    prejIme: '{ime}: earlier in substitution order',
    pozneje: 'Later in substitution order',
    poznejeIme: '{ime}: later in substitution order',
    izberi: 'Choose: {pozicija}',
    klop: 'Bench',
    klopOpis:
      'If a starter doesn’t play, he’s replaced by the first bench player in the same position — in order from left to right.',
    brezPozicije: 'No confirmed position — they can’t be put on the pitch',
  },

  // Pitch with one team's points in a match (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime} — {deli}',
    minut: '{n} min',
    goli: '{n} × goal',
    asistence: '{n} × assist',
    brezPrejetega: 'clean sheet',
    prejetih: '{n} conceded',
    rumeni: 'yellow card',
    rdeci: 'red card',
    skupaj: '{tocke} pts',
    brezPostave: 'The match report doesn’t list a lineup for this team.',
    klop: 'Bench',
    vstopilo: '— {n} came on',
  },

  // Team of the round and another manager's lineup on the pitch.
  enajsterica: {
    kapetan: 'Captain',
    namestnik: 'Vice-captain with armband',
  },

  // Banner with notices about my teams (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Warnings for your teams',
    naslovNapakEna: 'One of your teams won’t score points',
    naslovNapak: {
      one: '{n} of your teams won’t score points',
      other: '{n} of your teams won’t score points',
    },
    nimasEkipe: 'You don’t have a team yet<liga>({liga})</liga> — without one you won’t score points next round.',
    sestavi: 'Build a team →',
    popravi: 'Fix →',
    poglej: 'View →',
    skrij: 'Hide warning: {besedilo}',
    skrijNamig: 'Hide until there’s a new report',
    pokaziVse: 'Show all ({n})',
    razlog: 'The team doesn’t meet the rules.',
    brezTockKrog: 'It won’t score points in round {krog}.',
    brezTockRok: 'It won’t score points at the next deadline.',
    nepopolna: 'The team is incomplete — this round will still lock, but from the next one it won’t score points.',
    igralec: {
      kapetan: {
        poskodba: 'Captain {ime} is injured.',
        odsotnost: 'Captain {ime} is unavailable.',
        izstop: 'Captain {ime} won’t play again — his club has withdrawn from the league.',
      },
      namestnik: {
        poskodba: 'Vice-captain {ime} is injured.',
        odsotnost: 'Vice-captain {ime} is unavailable.',
        izstop: 'Vice-captain {ime} won’t play again — his club has withdrawn from the league.',
      },
      vPostavi: {
        poskodba: '{ime} is injured and in your starting XI.',
        odsotnost: '{ime} is unavailable and in your starting XI.',
        izstop: '{ime} in your starting XI won’t play again — his club has withdrawn from the league.',
      },
      naKlopi: {
        poskodba: '{ime} on your bench is injured.',
        odsotnost: '{ime} on your bench is unavailable.',
        izstop: '{ime} on your bench won’t play again — his club has withdrawn from the league.',
      },
    },
    posledica: {
      kapetan: 'If he doesn’t play, the vice-captain takes the armband — maybe pick another captain.',
      namestnik: 'If neither the captain nor the vice-captain plays, there are no triple points.',
      vPostavi: 'If he doesn’t play, he’s replaced by the first bench player in the same position.',
      naKlopi: 'Automatic substitution will skip him if he doesn’t play.',
      izstop: 'He won’t score any more points — replace him. Your team stays valid if you keep him.',
    },
  },
}
