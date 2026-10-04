// English translation of `racun` (source: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Log in',
    naslovRegistracija: 'Sign up',
    naslovPozabljeno: 'Forgotten password',
    googleNiNaVoljo: 'Logging in with Google is not available right now. Use email.',
    appleNiNaVoljo: 'Logging in with Apple is not available right now. Use email.',
    poslanaPonastavitev:
      'We have sent you a link to reset your password. Check your email (including spam).',
    racunUstvarjen:
      'Your account has been created. We have sent a confirmation link to your email — open it and come back.',
    prijavljenKot: 'You are logged in as {email}.',
    zGooglom: 'Continue with Google',
    zApplom: 'Continue with Apple',
    aliZEposto: 'or with email',
    prikaznoIme: 'Display name',
    eposta: 'Email',
    geslo: 'Password',
    posiljam: 'Sending …',
    ustvariRacun: 'Create account',
    posljiPovezavo: 'Send link',
    gumbPrijava: 'Log in',
    zeImasRacun: 'Already have an account? Log in',
    nimasRacuna: 'No account yet? Sign up',
    pozabljenoGeslo: 'Forgotten password?',
    nazajNaPrijavo: '← Back to log in',
  },
  napake: {
    napacnaPrijava: 'Wrong email address or password.',
    niPotrjen: 'Your email address is not confirmed yet. Click the link in the message we sent you.',
    zeRegistriran: 'This email address is already registered. Log in or reset your password.',
    prevecPoskusov: 'Too many attempts. Wait a few minutes and try again.',
    sibkoGeslo: 'The password is too weak. Use at least 6 characters, ideally a mix of letters and numbers.',
    istoGeslo: 'The new password must be different from the old one.',
    neveljavenNaslov: 'The email address is not valid.',
  },
  novoGeslo: {
    naslov: 'New password',
    gesliSeNeUjemata: 'The passwords do not match.',
    preverjam: 'Checking the link …',
    neveljavna:
      'The link is invalid or has expired. Request a new password reset on the <prijava>log-in</prijava> page.',
    novoGeslo: 'New password',
    ponovi: 'Repeat password',
    shranjujem: 'Saving …',
    shrani: 'Save password',
  },
  opomniki: {
    naslov: 'Reminders',
    napakaNalaganja: 'The settings could not be loaded.',
    napakaShranjevanja: 'Saving failed. Try again.',
    nalagam: 'Loading …',
    moraPrijava: 'You need to <prijava>log in</prijava> to edit reminders.',
    opis: 'Before each round deadline we send a short message to {email} so you do not forget to update your team.',
    posiljaj: 'Send me reminders by email',
    shranjujem: 'Saving …',
    vklopljeni: 'Reminders are on.',
    izklopljeni: 'We will no longer send you reminders.',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Confirming …',
    preverjam: 'Checking the link …',
    neveljavna: 'This link is no longer valid or has already been used. <prijava>Log in</prijava> or request a new one.',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Delete account',
    moraPrijava: 'You need to <prijava>log in</prijava> to delete your account.',
    opis: 'We will delete the account {email}: your profile, all your squads with their points history, your votes and the mini-leagues you created. This cannot be undone.',
    gumb: 'Delete account',
    potrdi: 'Yes, delete forever',
    preklici: 'Cancel',
    brisem: 'Deleting …',
    napaka: 'The account could not be deleted: {napaka}',
  },
  pravno: {
    naslov: 'Privacy and terms',
    zadnjaSprememba: 'Last updated: 2 October 2026',
    kajJeNaslov: 'What SLFF is',
    kajJe:
      'SLFF (Sunday League Fantasy Football) is a fan-made fantasy league for local amateur football leagues. It is run by volunteers and is not affiliated with the regional football associations, the national football association or the clubs. The game is free, with no stakes or prizes.',
    podatkiNaslov: 'What data we store',
    podatkiEposta:
      '<b>Email address and password.</b> We need them for logging in. The password is stored encrypted and we cannot see it.',
    podatkiIme:
      '<b>Display name and team name.</b> Both are visible in the standings. If you do not want to use your name, use a nickname.',
    podatkiEkipa:
      '<b>Your team and votes.</b> Your squad, captain, transfers and votes on assists or positions.',
    podatkiNaprava:
      '<b>Device token for notifications.</b> If you allow notifications in the mobile app, we store a token we use to send you a reminder before the round deadline. It is deleted when you log out.',
    neHranimo:
      'We do not store your address, phone number or payment details. We do not use tracking cookies or advertising tools. Your browser stores your login session and, if you open it, an identifier for the help chat conversation.',
    dostopNaslov: 'Who can access the data',
    dostop:
      'The data is handled by two providers: <b>Supabase</b> (database and login, servers in the EU) and <b>Vercel</b> (hosting of the site). Confirmation and password-reset emails are sent via <b>Resend</b>, and notifications in the mobile app via <b>Google Firebase Cloud Messaging</b> (only the device token and the notification text). The help chat in the bottom right corner runs on <b>HelpStack</b>: it receives what you write in it and — if you are logged in — your display name, so we know who we are replying to. When the assistant in the chat helps you, it can also see which page and league you are on and whether your team is valid. We do not pass on your email address. We do not share your data with anyone else and we do not sell it.',
    statistikaNaslov: 'Player statistics',
    statistika:
      'Data about footballers (appearances, goals, cards) is taken from the publicly available match reports of the regional football associations; the ones for the selected league are listed in the page footer. Positions and assists, which the match reports do not contain, are decided by the community through voting — so they may be wrong. If something is wrong, click the player and let us know.',
    grbi:
      'Club crests are the property of the individual clubs and are shown only to identify the team. A club that does not want this can write to us and we will remove the crest.',
    fotografijeNaslov: 'Photos',
    fotografije:
      'The photo on the home page is by Abigail Keenan and is published on <unsplash>Unsplash</unsplash> under their licence, which allows free use. It does not show players from our leagues.',
    praviceNaslov: 'Your rights',
    pravice:
      'You can delete your account and all your data yourself at any time: choose <b>Delete account</b> in the account menu (slff.eu/account). To correct your display name, or if the deletion fails, write to us at <eposta>info@slff.eu</eposta>. When your account is deleted, your team also disappears from the standings.',
    pravilaNaslov: 'Rules of play',
    pravila:
      'One person, one account. Voting on assists and positions is meant for genuine corrections — deliberately wrong votes spoil the game for everyone and may lead to the removal of your account. Scoring and prices may change during the season if something turns out to be unfair; we will announce any such changes.',
    jamstvoNaslov: 'No warranty',
    jamstvo:
      'The site runs as it runs. We do our best to keep the data correct and the site available, but we cannot guarantee it — match reports can be late and statistics can contain errors.',
  },
}
