// English translation of `lestvice` (source: src/i18n/sl/lestvice.ts).
// Ordinals ("4. krog", "3. mesto") become "Round 4" and "#3" so English
// never needs 1st/2nd/3rd suffixes.
import type { Prevod } from '../jedro.ts'

export const lestvice: NonNullable<Prevod['lestvice']> = {
  /** "Round 4" — round buttons and labels. */
  krog: 'Round {n}',
  mesto: '#{mesto}',
  /** "of 5 teams". */
  odEkip: { one: 'of {n} team', other: 'of {n} teams' },
  pokaziVec: 'Show more ({n})',
  mojeMesto: 'My position ↓',

  lestvica: {
    naslov: 'Fantasy standings',
    prazna: 'The standings are still empty — build the first team!',
    napakaKrogov:
      'Round results could not be loaded ({napaka}). The overall standings below are still correct.',
    tvojRezultatZadnji: 'Your score in the last round',
    mojaEkipa: 'My team',
    zmagovalecKroga: 'Round {krog} winner',
    zmagovalciPoKrogih: 'Round winners',
    odigraniKrogi: {
      one: '{n} round played',
      other: '{n} rounds played',
    },
    pozneje: 'Joined later? Pick your round and compete from there.',
    celotnaSezona: 'Whole season',
    odKroga: 'From round {n}',
    igraOd: '· playing since {datum}',
    zavihekEkipe: 'Teams',
    zavihekNavijaci: 'Club fans',
  },

  navijaciKlubov: {
    naslov: 'Club fans',
    opis: 'Which club has the best managers? It counts the average points of fans who have a team in this league.',
    /** "A club makes the table with at least 3 fans." */
    pogoj: {
      one: 'A club makes the table with at least {n} fan.',
      other: 'A club makes the table with at least {n} fans.',
    },
    povprecjeSezona: 'Ø season',
    povprecjeKroga: 'Ø round {n}',
    navijaci: 'Fans',
    tvojKlub: 'your club',
    stranKluba: 'Club page →',
    premalo: 'Not enough fans',
    brezNavijacev: 'No fans yet: {klubi}',
    prazno: 'Nobody in this league has picked their club yet. Be the first!',
    izbira: {
      naslov: 'Which club do you support?',
      opis: 'Pick a club and your points will count for it in the fans’ table.',
      izberi: '— pick a club —',
      shrani: 'I support this club',
      spremeni: 'You can change your club any time here, in the fans’ table.',
      mojKlub: 'You support <b>{klub}</b>.',
      zamenjaj: 'Change club',
    },
    klub: {
      naslov: 'This club’s fans',
      mesto: '#{mesto}',
      odKlubov: {
        one: 'of {n} club in the fans’ table',
        other: 'of {n} clubs in the fans’ table',
      },
      manjka: {
        one: '{n} more fan needed to make the fans’ table.',
        other: '{n} more fans needed to make the fans’ table.',
      },
      brez: 'This club has no fans with a team in the league yet.',
      navijam: 'I support {klub}',
      vsiKlubi: 'All clubs in the league',
    },
  },

  slovenija: {
    naslovStrani: 'National standings',
    naslov: 'National',
    pripravlja: 'The national standings are being prepared. Try again in a few minutes.',
    povzetek: 'All teams from all leagues together — {ekip} from {lig} and {zvez}.',
    lig: { one: '{n} league', other: '{n} leagues' },
    zvez: { one: '{n} association', other: '{n} associations' },
    skupno: 'Overall',
    naKrog: 'Per round',
    povprecjeRazlaga:
      'Leagues don’t start at the same time, so a team from a league that started earlier collects more points for that reason alone. The average evens this out; teams with at least {krogov} count.',
    /** "with at least 3 rounds played". */
    zOdigranimiKrogi: {
      one: '{n} round played',
      other: '{n} rounds played',
    },
    premaloKrogov: 'For the average a team must play at least {krogov} — no team has played that many yet.',
    /** "play at least 3 rounds". */
    krogovTozilnik: { one: '{n} round', other: '{n} rounds' },
    nobenaEkipa: 'No team has played a round yet.',
    lestvicaLige: 'Your league’s standings',
    zavihekEkipe: 'Teams',
    zavihekIgralci: 'Players',
    zavihekKlubi: 'Clubs',
    klubiUvod: 'Real club sides, not fantasy teams: points players earned for the side · season {sezona}',
    klubiIgralcev: { one: '{n} player', other: '{n} players' },
    klubiPovprecje:
      'Leagues don’t start together, so points per round even this out; sides with at least {krogov} count.',
    klubiVec: 'Show more',
    klubiOpomba:
      'A club’s senior and youth sides are listed separately. Points exclude assists. A player who transfers starts from zero at the new club; points earned before stay with the old one.',
    vrhNaslov: 'Who’s top nationally?',
    vrhPoglejVse: 'See the top 10 →',
    vrhUvod: 'Top 10 from all leagues · season {sezona}',
    vrhTocke: 'Most points',
    vrhGoli: 'Scorers',
    vrhCisteMreze: 'Clean sheets — goalkeepers',
    vrhOpomba:
      'Points exclude assists: assists are confirmed by voting, which hasn’t started in most leagues yet, so leagues would be on an unequal footing. Leagues have played different numbers of rounds.',
    vrhPrazno: 'No matches have been played this season yet.',
  },

  miniLige: {
    naslov: 'Mini-leagues',
    pridruzenDobrodosel: 'Joined. Welcome to the league.',
    pridruzen: 'Joined.',
    zeOdPrej: 'This team is already in this mini-league.',
    prekratkoIme: 'The mini-league name needs at least 2 characters.',
    ustvarjena: 'Mini-league "{ime}" created. Code: {koda}',
    najprejEkipa: 'First build a team in one of the leagues.',
    prijava: 'You need to <prijava>log in</prijava> to use mini-leagues.',
    opis: 'A private competition among friends. Teams can be from different leagues.',
    ustvari: 'Create',
    imeLige: 'Mini-league name',
    ustvariLigo: 'Create a mini-league',
    novaAliKoda: 'New mini-league or join with a code',
    pridruziSe: 'Join',
    koda: 'Code ({n} characters)',
    nisiVNobeni: 'You’re not in any mini-league yet. Who’s the better manager — you or your mates?',
    ustvariLigoIme: 'Create league “{ime}”',
    najprejSestavi: 'Build a team first',
    povabilo: 'Invite: <povezava>{povezava}</povezava><koda>code {koda}</koda>',
    deliPovabilo: 'Share invite',
    prazna: 'There are no teams in this mini-league yet.',
    // Result of sharing an invite (also PovabiSoigralce).
    poslano: 'Invite sent.',
    kopirano: 'Invite copied — paste it into your group chat.',
    neuspelo: 'Sharing failed.',
    neuspeloPovezava: 'Sharing failed — you’ll find the link on the Mini-leagues page.',
    // lib/miniLige
    vpisiKodo: 'Enter the mini-league code.',
    dolzinaKode: 'The code has {dolzina} characters; you entered {vpisal}.',
    slabiZnaki: 'The code doesn’t contain the characters {znaki} — check whether you mixed up 0 and O or 1 and I.',
    besediloVabila: 'Join my mini-league "{ime}" on SLFF and beat me: {povezava}',
    naslovVabila: 'Mini-league {ime} — SLFF',
    privzetoIme: '{ime} and friends',
    privzetoImeBrez: 'My mini-league',
  },

  // Sharing an invite (DeliMiniLigo): after creating and on the league page.
  deli: {
    naslovNova: 'Your league is up. Now it needs rivals!',
    opisNova:
      'A mini-league with a single member is a diary, not a competition. Send the link to your group — whoever clicks it is in the league in seconds, no code to type.',
    naslovSam: 'Alone against yourself? No rival, no victory.',
    opisSam: 'Send the link to teammates, colleagues or that person who always knows who should have played.',
    naslov: 'Invite someone else',
    povezava: 'Join link',
    deli: 'Share',
    whatsapp: 'WhatsApp',
    viber: 'Viber',
    kopiraj: 'Copy link',
    kopirano: 'Link copied — paste it into your group chat.',
    koda: 'Code for manual entry: {koda}',
  },

  // Weekly mini-league recap: stories of the finished round.
  pregled: {
    naslov: 'Weekly recap',
    krog: 'Round',
    nalaganje: 'Digging through the match reports …',
    prazno:
      'Once the first round is played, the week’s stories will be here: who won, who left their captain on the bench and who took home the wooden spoon.',
    samoEna: 'Once someone else joins, there’ll be a winner here too — and a loser.',
    tockeKroga: 'Round points',
    deliPregled: 'Send to the group',
    kopiran: 'Recap copied — paste it into your group chat.',
    sporociloNaslov: '📊 {ime} — Round {krog}',
    manager: 'Manager of the round',
    managerOpis: '{ekipa} · {tocke}. Bragging rights until the next round.',
    kapetan: 'Captain of the round',
    kapetanOpis: '{igralec} brought in {tocke} with the armband ({ekipa}).',
    adut: 'Hidden gem',
    adutOpis: '{igralec} ({tocke}) — nobody but {ekipa} had him in their lineup.',
    skok: 'Going up',
    skokOpis: {
      one: '{ekipa}: up {n} place, now #{mesto}.',
      other: '{ekipa}: up {n} places, now #{mesto}.',
    },
    padec: 'Free fall',
    padecOpis: {
      one: '{ekipa}: down {n} place, now #{mesto}. The parachute didn’t open.',
      other: '{ekipa}: down {n} places, now #{mesto}. The parachute didn’t open.',
    },
    klop: 'Gold on the bench',
    klopOpis: '{ekipa} · {tocke} on the bench. Gaffer, where were you?',
    zlica: 'Wooden spoon',
    zlicaOpis: '{ekipa} · {tocke}. Next round will be better. Maybe.',
  },

  mojeMiniLige: {
    povabilo: 'Standings among friends are more fun than among strangers.',
    ustvari: 'Create a mini-league',
    naslov: 'My mini-leagues',
    vse: 'all →',
    vodi: ' · {ime} leads',
    sam: '· it’s just you — invite someone →',
  },

  povabiSoigralce: {
    naslovLiga: 'Invite someone else to {ime}',
    naslovNova: 'Team built. Now invite your mates.',
    opisLiga: 'Anyone who clicks the link joins the league in one click.',
    opisNova: 'Who’s the better manager? A mini-league is a table just for your crowd.',
    trenutek: 'One moment …',
    deliPovabilo: 'Share invite',
    ustvariInPovabi: 'Create a mini-league and invite',
    miniLige: 'Mini-leagues',
  },

  vstop: {
    naslovLiga: 'Invite: {ime}',
    naslov: 'Mini-league invite',
    niLige: 'This mini-league doesn’t exist',
    niLigeOpis:
      'The link is incomplete or the league has been deleted. Ask for a new one, or <ustvari>create your own</ustvari>.',
    ustvaril: 'Created by {ime}',
    miniLiga: 'Mini-league',
    prijaviSe: 'Log in or create an account. After logging in we’ll bring you back here and add you to the league — no code to type.',
    prijavaAliRegistracija: 'Log in or sign up',
    nalaganjeEkip: 'Loading your teams …',
    potrebujesEkipo:
      'You need a team for a mini-league. Build one — it takes a minute — and you’ll join the league automatically when you save.',
    sestaviEkipo: 'Build a team',
    sKateroEkipo: 'With which team?',
    vstopam: 'Joining …',
    pridruziSe: 'Join with team {ime}',
  },

  ekipa: {
    naslov: 'Team',
    niEkipe: 'This team doesn’t exist.',
    okvara: 'The lineup could not be loaded.',
    nazaj: 'Back to standings',
    skupaj: '{tocke} {beseda} in total',
    brezKrogov:
      'No round has finished in this league yet. Other teams become visible once the deadline passes — until then nobody can see them.',
    nalaganjePostave: 'Loading lineup …',
    brezPostave: 'This team had no lineup in the selected round.',
    vTemKrogu: '{beseda} this round',
    kazen: '(−{kazen} for transfers)',
    namestnik: 'The captain didn’t play, so the vice-captain took over the multiplier.',
    klop: 'Bench',
  },

  klub: {
    naslov: 'Club',
    niKluba: 'This club doesn’t exist.',
    brezLige: 'This club isn’t playing in any league we follow this season.',
    naNaslovnico: 'To the home page',
    liga: 'League',
    podnaslov: '{liga} · {igralci} in play',
    uvod:
      '{klub} players are part of <b>SLFF</b> — the fantasy league for {liga}. Fans build their own team from real players, and points come from the <b>official match reports</b>: goals, minutes, clean sheets, cards.',
    toLigo: 'this league',
    navijaci: {
      one: '<b>{navijacev}</b> currently has your players in their team.',
      other: '<b>{navijacev}</b> currently have your players in their team.',
    },
    sestaviEkipo: 'Build your team',
    lestvica: 'Standings',
    zaObjavo: 'Images to share',
    napoved: 'Announcement — for posting at launch',
    nasiIgralci: 'Our players — with points',
    brezStatistike: 'No stats for this club this season yet.',
    pozicije: {
      GK: 'Goalkeepers',
      DEF: 'Defenders',
      MID: 'Midfielders',
      FWD: 'Forwards',
    },
    goli: '{n} G · ',
    minute: '{n} min',
    opomba: 'Points are calculated from the official match reports. If something’s wrong, let us know — we’ll fix the data.',
  },

  plakat: {
    navijaci: { one: '{n} fan', other: '{n} fans' },
    stavekNavijacev: {
      one: '{navijacev} already has our players in their team.',
      other: '{navijacev} already have our players in their team.',
    },
    // Text on the canvas.
    izNasihIgralcev: 'Build your team from our players.',
    najvecTock: 'Most points this season',
    pridi: 'COME',
    sestavit: 'BUILD YOUR',
    ekipo: 'TEAM.',
    jeOdprta: 'The fantasy league for {liga} is open. Free.',
    zapisnikiMnz: 'points from official MNZ match reports',
    fantasyLigaZa: 'Fantasy league for',
    jeLive: 'IS LIVE.',
    pravihIgralcev: 'Build a team from real players. Points from official match reports.',
    brezplacno: 'free',
    mestoOd: {
      one: '#{mesto} of {n} team',
      other: '#{mesto} of {n} teams',
    },
    mojiNajboljsi: 'My best this round',
    premagajMe: 'Build your team and beat me.',
    // Text when sharing.
    deliKlub: '{klub} is in the SLFF fantasy league — build your team from our players.',
    deliNapoved:
      'Come and build a team! The fantasy league for {liga} is open — free, with real {klub} players.',
    deliLive: 'The fantasy league for {liga} is live. Build a team from real players — free.',
    deliKrog: '{ekipa}: {tocke} {beseda} in round {krog}. Build your team and beat me.',
  },

  // Weekly team recap — portrait image for a story (My team, other team).
  zgodba: {
    naslov: 'Weekly recap — Round {krog}',
    opis: 'An image for your Instagram or WhatsApp story: points, league position, captain and best player of the round.',
    deli: 'Share weekly recap',
    prenesi: 'Download weekly recap',
    // Text on the canvas.
    nadnaslov: 'WEEKLY RECAP · ROUND {krog}',
    vKrogu: 'in round {krog}',
    gor: '▲ {n}',
    dol: '▼ {n}',
    enako: '=',
    kapetan: 'CAPTAIN',
    namestnik: 'VICE-CAPTAIN',
    kapetanInNajboljsi: '{trak} · TEAM’S BEST',
    najboljsi: 'TEAM’S BEST',
    // Text when sharing.
    deliBesedilo: '{ekipa}: {tocke} {beseda} in round {krog}. Build your team and beat me.',
    deliBesediloMesto: '{ekipa}: {tocke} {beseda} in round {krog}, #{mesto} in the league. Build your team and beat me.',
  },

  deliSliko: {
    naslov: '{naslov} — SLFF',
    kopirana: 'Link copied.',
    niPripravljena: 'The image could not be prepared.',
    seEnkrat: 'Tap again to open the share menu.',
    niIzrisa: 'the image could not be drawn',
    shranjena: 'Image saved — post it on Instagram, Facebook or WhatsApp.',
    napaka: 'The image could not be prepared: {napaka}',
    pripravljam: 'Preparing …',
    deliSliko: 'Share image',
    prenesi: 'Download image for posting',
    deliPovezavo: 'Share link',
    shrani: 'Save image',
    namig: 'WhatsApp, Instagram, Facebook … — choose in the menu that opens.',
  },
}
