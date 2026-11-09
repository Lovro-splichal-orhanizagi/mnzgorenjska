// Public Verified player profile page (`/verified`, pages/Preverjeni.tsx).
// Prices and renewal come from the purchase (`igralci.preverjen.ponudba.*`), not here.
export const preverjeni = {
  naslov: 'Verified player profile',
  opis: 'A blue tick, banner, bio, links and up to 6 reviewed clips on your SLFF player profile.',
  glava: 'Your football. Your profile. Your reach.',
  uvod: 'A verified profile is your player page in SLFF: a blue tick next to your name, a banner, bio, links and clips of your best moments.',
  noga: 'Verified player profile',
  vec: 'More about the verified profile →',
  nalaga: 'Loading …',
  primer: {
    oznaka: 'Example layout, your profile will be your own',
    ime: 'First and last name',
    klub: 'Position · Club',
    opis: 'Tell people here who you are, where you play and what drives you.',
    posnetek: 'Clip {n}',
    alt: 'SLFF pitch',
  },
  kaj: {
    naslov: 'What you get',
    kljukica: 'A blue tick next to your name everywhere in the game.',
    profil: 'A richer banner, bio and links (YouTube, X, website), plus a message to fans.',
    posnetki: 'Up to 6 clips at the top of your profile. The SLFF team reviews every clip first.',
    ogledi: 'An overall count of scout views on your profile, where SLFF Scout is available.',
    izbranost: 'How many fantasy teams picked you and which teams they are.',
  },
  koraki: {
    naslov: 'How to get it',
    poisci: { naslov: 'Find your profile', opis: 'Look yourself up among the players in your league.' },
    prevzemi: {
      naslov: 'Claim it and wait for confirmation',
      opis: 'Tap “This is me”. Once we confirm you, you can also upload a photo without paying.',
    },
    izberi: { naslov: 'Choose annual or lifetime', opis: 'You buy it online.' },
    uredi: { naslov: 'Edit and show off', opis: 'Add a banner, bio, links and clips.' },
  },
  cena: {
    naslov: 'Price',
    obnova: 'The annual subscription renews automatically. You manage or cancel it through the Stripe portal.',
  },
  cta: {
    poisci: 'Find your profile',
    poisciOpis: 'Claiming a profile is free.',
    caka: 'Your claim request is waiting for confirmation.',
    odpriZahtevek: 'Open profile',
    preveri: 'Verify my player profile',
    preveriOpis: 'An annual subscription or a one-off lifetime purchase.',
    profil: 'Go to your profile',
    preverjen: 'Your profile is verified. Edit it and show off your clips.',
    brezPonudbe: 'Verified profiles are for players aged 18 or over with their name shown.',
  },
}
