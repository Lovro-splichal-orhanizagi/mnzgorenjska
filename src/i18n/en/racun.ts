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
    posljiPotrditevZnova: 'Resend confirmation email',
    potrditevPoslanaZnova:
      'We sent a new confirmation email. Check your spam folder too.',
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
    predlogEposte: 'Did you mean {eposta}?',
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
    naslov: 'Notifications',
    napakaNalaganja: 'The settings could not be loaded.',
    napakaShranjevanja: 'Saving failed. Try again.',
    nalagam: 'Loading …',
    moraPrijava: 'You need to <prijava>log in</prijava> to edit reminders.',
    opis: 'Before each round deadline we send a short message to {email} so you do not forget to update your team.',
    posiljaj: 'Email reminders',
    shranjujem: 'Saving …',
    vklopljeni: 'Reminders are on.',
    izklopljeni: 'We will no longer send you reminders.',
    odjavaVprasanje: "Don't want SLFF emails any more (deadline reminders and team notices)?",
    odjavaGumb: 'Unsubscribe me',
    odjavaNapaka: "This link isn't valid. Sign in and turn reminders off in settings.",
    push: 'Push notifications',
    pushOpis: 'The day before the deadline your phone tells you if your squad is not ready.',
    pushVklopljena: 'Push notifications are on.',
    pushIzklopljena: 'We will no longer send you push notifications.',
    pushZavrnjeno: 'Notifications are turned off on your phone. Turn them on in Settings → SLFF → Notifications.',
    pushDovoli: 'Allow notifications',
    povezava: 'Notification settings',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Confirming …',
    preverjam: 'Checking the link …',
    neveljavna: 'This link is no longer valid or has already been used. <prijava>Log in</prijava> or request a new one.',
  },
  // Nastavitve računa (slff.eu/account): profil, klub, jezik, obvestila,
  // zasebnost, geslo. Izbris je spodaj (`izbris`).
  nastavitve: {
    naslov: 'Account settings',
    moraPrijava: 'You need to <prijava>log in</prijava> to edit your account.',
    nalagam: 'Loading …',
    napakaNalaganja: 'The settings could not be loaded.',
    shranjujem: 'Saving …',
    shranjeno: 'Saved.',
    napakaShranjevanja: 'Saving failed. Try again.',
    profilNaslov: 'Profile',
    mojProfil: 'View your public profile',
    prikaznoIme: 'Display name',
    imeOpis: 'Others see it in the standings. From 3 to 24 characters, and you can change it once every 7 days.',
    imeNaslednjic: 'You can change your name again on {datum}.',
    shraniIme: 'Save name',
    avatar: 'Avatar',
    avatarOpis: 'Choose a colour and your initials or a football icon.',
    barva: 'Colour',
    barvaN: 'Colour {n}',
    slika: 'Picture',
    zacetnice: 'Initials',
    ikone: {
      zoga: 'Ball',
      gol: 'Goal',
      pokal: 'Trophy',
      copat: 'Football boot',
      rokavice: 'Goalkeeper gloves',
      dres: 'Shirt',
      zastavica: 'Corner flag',
      navijac: 'Fan',
    },
    klubNaslov: 'The club you support',
    klubOpis: 'It shows on your profile, and your points count for the club in the fans’ table.',
    klubIsci: 'Search for a club …',
    klubNiZadetkov: 'No club found.',
    klubBrez: 'You have not picked a club yet.',
    klubOdstrani: 'Remove club',
    jezikNaslov: 'Language and country',
    jezikOpis: 'The language of the site and the country whose leagues you see. The choice applies in this browser.',
    obvestilaNaslov: 'Notifications',
    zasebnostNaslov: 'Privacy',
    javniProfil: 'Public profile',
    javniProfilOpis: 'Others can see your teams, club and achievements on your profile. If you turn it off, only your display name is shown.',
    prijavaNaslov: 'Login and password',
    prijavljenZ: 'You are logged in with {email}.',
    geslo: 'Change password',
    gesloOpis: 'We will email you a link for setting a new password.',
    gesloPoslano: 'We have sent the link to {email}. Check your email (including spam).',
    gesloNapaka: 'The link could not be sent. Try again in a few minutes.',
    eposta: 'To change your email address, write to us at <eposta>info@slff.eu</eposta>.',
    // Napake prikaznega imena (koda iz baze, `hint`).
    napake: {
      dolzina: 'Your display name must be 3 to 24 characters long.',
      znaki: 'Your display name contains characters that are not allowed.',
      rezervirano: 'This name is reserved for the SLFF team. Choose another one.',
      neprimerno: 'This name is not appropriate. Choose another one.',
      prepogosto: 'You can change your display name once every 7 days.',
      zasedeno: 'This display name is already taken.',
    },
  },
  // Javna stran profila (slff.eu/u/<id>).
  profil: {
    naslov: 'Profile',
    niProfila: 'This profile does not exist. The account may have been deleted.',
    nazaj: 'To the standings',
    zaseben: 'This profile is private.',
    tvojZaseben: 'Your profile is private: others only see your display name.',
    uredi: 'Edit profile',
    clanOd: 'Member since {datum}',
    navija: 'Supports',
    ekipe: 'Teams',
    brezEkip: 'No team in the active leagues yet.',
    mesto: 'Place {mesto} of {ekip}',
    miniLige: 'Shared mini-leagues',
    dosezki: 'Achievements',
    sezone: 'Seasons',
    krogi: 'Rounds played',
    najboljsiKrog: 'Best round',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Delete account',
    moraPrijava: 'You need to <prijava>log in</prijava> to delete your account.',
    opis: 'We will delete the account {email}: your profile, all your squads with their points history, your votes and the mini-leagues you created. This cannot be undone. Deleting the account also ends a verified player badge, and a subscription stops without a refund.',
    gumb: 'Delete account',
    potrdi: 'Yes, delete forever',
    preklici: 'Cancel',
    brisem: 'Deleting …',
    napaka: 'The account could not be deleted: {napaka}',
  },
  pravno: {
    naslov: 'Privacy and terms',
    zadnjaSprememba: 'Last updated: 16 October 2026',
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
      'We do not store your phone number or card details, and we store your address only if you order a printed badge (see below). We do not use tracking cookies or advertising tools. Your browser stores your login session, an identifier for the help chat conversation if you open it, and session marks that keep a page from being counted twice. How many people opened which page is kept only as a daily total — without your name, account, device or IP address. General visit statistics (which pages, where visitors come from, device type and country, a few actions such as building a team) are recorded by <b>Umami</b> on our own server: no cookies, no stored IP address, and visits are not linked to your account. If your browser has "Do Not Track" switched on, nothing is recorded.',
    dostopNaslov: 'Who can access the data',
    dostop:
      'The data is stored on our own server at <b>Hetzner</b> (Germany, EU); traffic to it passes through <b>Cloudflare</b> (protection and delivery of the site). Confirmation and password-reset emails are sent from our own mail server (also at Hetzner), and notifications in the mobile app via <b>Google Firebase Cloud Messaging</b> (only the device token and the notification text). The help chat in the bottom right corner runs on <b>HelpStack</b>: it receives what you write in it and — if you are logged in — your display name, so we know who we are replying to. When the assistant in the chat helps you, it can also see which page and league you are on and whether your team is valid. We do not pass on your email address. We do not share your data with anyone else and we do not sell it.',
    statistikaNaslov: 'Data about footballers',
    statistika:
      'For footballers in the leagues we cover, we show their name, club, shirt number, appearances, minutes, goals and cards. The source is the publicly available official match reports of the football association named in the page footer. Positions and assists, which the match reports do not contain, are decided by the community through voting, so they may be wrong. From this we calculate the player\'s points and price in the game. If something is wrong, click the player and let us know.',
    statistikaPodlaga:
      'The purpose is a free fantasy game for fans. The legal basis is legitimate interest (Art. 6(1)(f) GDPR): letting fans play a game based on the published results of their league. We show the data while the player plays in a league we cover. In Austrian leagues, as the ÖFB does, we hide a player\'s name 18 months after their last appearance.',
    statistikaUgovor:
      'A player can object to the processing or ask for erasure: write to <eposta>info@slff.eu</eposta> with a link to the player\'s page. Within 14 days we replace their name with a neutral label in all our leagues of that country where we find them, also in later imports. The statistics stay, without a name. We do the same at the request of the football association.',
    grbi:
      'Club crests are the property of the individual clubs and are shown only to identify the team. A club that does not want this can write to us and we will remove the crest.',
    fotografijeNaslov: 'Photos',
    fotografije:
      'The photo on the home page is by Abigail Keenan and is published on <unsplash>Unsplash</unsplash> under their licence, which allows free use. It does not show players from our leagues.',
    praviceNaslov: 'Your rights',
    pravice:
      'You can delete your account and all your data yourself at any time: choose <b>Delete account</b> in the account menu (slff.eu/account). To correct your display name, or if the deletion fails, write to us at <eposta>info@slff.eu</eposta>. When your account is deleted, your team also disappears from the standings. The record of a verified player badge purchase stays for 10 years, as accounting law requires, and the delivery address as described above.',
    pravilaNaslov: 'Rules of play',
    pravila:
      'One person, one account. Voting on assists and positions is meant for genuine corrections — deliberately wrong votes spoil the game for everyone and may lead to the removal of your account. Scoring and prices may change during the season if something turns out to be unfair; we will announce any such changes.',
    jamstvoNaslov: 'No warranty',
    jamstvo:
      'The site runs as it runs. We do our best to keep the data correct and the site available, but we cannot guarantee it — match reports can be late and statistics can contain errors. This applies to the free game. Paid services are governed by the Paid services section and your statutory consumer rights.',
    kajJePlacljivo:
      'The only paid thing is the optional verified player badge (see Paid services below).',
    podatkiPlacilo:
      '<b>Verified player badge purchase (only if you buy one).</b> We keep the purchase record (what, when, amount and your Stripe customer ID) for 10 years, as accounting law requires. We keep the delivery address for a printed badge for 90 days after shipping or cancellation of the order, and at most 12 months after ordering; after that only the country remains.',
    dostopStripe:
      'Payments for the verified player badge are processed by <b>Stripe</b> (Stripe Payments Europe, Ireland): it receives your name, email, billing address and, for a printed badge, the delivery address. You enter your card details directly with Stripe; we never see them.',
    placljivoNaslov:
      'Paid services: verified players',
    placljivoUvod:
      'The game is and stays free. The only paid item is the optional verified player badge, which a player who has confirmed that the profile is theirs can buy. The badge never affects points, prices, fantasy teams or the rules of the game. These terms apply to that purchase.',
    prodajalec:
      '<b>Seller:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenia, entered in the court register at the District Court in Ljubljana. Company registration number 9850538000, VAT ID SI42765153. Contact: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>What you buy.</b> A blue check next to the player\'s name and profile extras (longer description, links, banner, colour, a featured match or statistic, a message to fans). The yearly subscription costs €9.99 and renews automatically every year. The forever option costs €29 once and lasts as long as SLFF offers this service. With the forever option you can add a printed badge with your name for €5 plus postage of €2 (Slovenia) or €4 (another EU country). We ship only to EU countries; delivery usually takes 2 to 3 weeks. All prices include VAT.',
    placilo:
      '<b>Payment.</b> Payment is processed by Stripe. We do not see or store your card details. You can buy only if you are at least 18 years old. The contract is concluded when Stripe confirms the payment.',
    odpoved:
      '<b>Cancelling the subscription.</b> You can cancel at any time with the Manage subscription button on your account page (slff.eu/account) or on the player profile. The cancellation takes effect at the end of the paid year; until then the badge stays. We do not refund a year that has already started, except in the cases below.',
    odstop:
      '<b>Right of withdrawal.</b> The digital content (the check and the extras) is provided immediately after payment. Before paying, you expressly agree to immediate provision and acknowledge that you thereby lose the 14-day right of withdrawal (Art. 16(m) of Directive 2011/83/EU, Slovenian ZVPot-1). The printed badge is made to your specification (the name on it), so there is no right of withdrawal for it (Art. 16(c)). Your statutory warranty rights remain: if the badge arrives damaged, wrong or not at all, write to us and we will replace it free of charge or refund you.',
    konec:
      '<b>When the badge ends.</b> The badge ends if it turns out that the profile is not yours and we cancel the confirmation, if the player\'s name is hidden at the player\'s or the football association\'s request, or if you delete your account. A subscription then stops automatically and is no longer charged. If you dispute the payment with your bank (chargeback), the badge is removed.',
    vracila:
      '<b>Refunds.</b> We do not refund in case of misuse or a false profile claim. If the badge ends because of our mistake, at the football association\'s request or because we discontinue the service, we refund the unused months of a yearly subscription pro rata. For a forever purchase we refund the full amount within the first 12 months after buying, and after that a pro rata share of what remains of 5 years from the purchase. The printed badge and postage are not refunded on discontinuation (the badge stays yours), only for defects.',
    pritozbe:
      '<b>Questions and complaints.</b> Write to <eposta>info@slff.eu</eposta>; we reply within 8 working days. We do not recognise any provider of out-of-court consumer dispute resolution. Slovenian law applies; this does not take away the protection given to you by the law of the country where you live.',
    scoutNaslov: 'SLFF Scout: player search for clubs',
    scoutKaj:
      'From the same public match reports we calculate indicators for players in senior leagues: share of minutes, goals, impact on the pitch, goals conceded, cards and progress across seasons, adjusted for league strength. These are indicators from match data, not an assessment of the person. Clubs with an SLFF Scout subscription who are looking for players will see them; a person at the club always makes the decision. We do not process youth leagues. Anyone who has ever played in a youth league is excluded until they have minutes in a senior league and enter, on their own profile, a year of birth showing that they turn 19 or older this year.',
    scoutPodlaga:
      'The legal basis is legitimate interest (Article 6(1)(f) GDPR): helping clubs find players from publicly published results. We recalculate the indicators every day and keep only the latest calculations. Club views will be logged for 12 months to prevent abuse and so that we can tell a player, on request, which clubs viewed them.',
    scoutPrivolitev:
      'A player with a claimed profile can add that they are open to a transfer, their year of birth, preferred regions and permission to be contacted. This is consent (Article 6(1)(a) GDPR): only clubs in Scout see it, it can be withdrawn at any time on the profile, and on withdrawal we delete the data. A club writes to the player only through Scout and does not see their email address.',
    scoutUgovor:
      'Objection: on a claimed profile click Hide me from Scout, or write to <eposta>info@slff.eu</eposta> with a link to the player page. Within 14 days we hide the player from Scout in all our leagues of that country, including future imports. The player stays in the fantasy game.',
    trgovinaNaslov: 'SLFF Shop (shop.slff.eu)',
    trgovinaKaj:
      'When you buy, we process your name, email, delivery address, the products bought and the amounts, and your SLFF account if you are signed in. Payment is handled by Stripe: we do not see or store card details. Your name and address go to Pošta Slovenije for delivery. To limit abuse we temporarily keep a hashed (irreversible) IP address for an unfinished purchase; it is deleted when you pay or the purchase expires. The personalisation text (name, number) and the fantasy team name on the product are part of the order; the text also goes to the print shop that makes the product.',
    trgovinaPodlaga:
      'The legal basis is performance of a contract (Article 6(1)(b) GDPR) and legal obligations (accounting, tax), and for the hashed IP address our legitimate interest in preventing abuse (Article 6(1)(f) GDPR). The controller is SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'We keep order and invoice data as long as VAT law and accounting rules require (10 years after the year the invoice was issued). The email for order notifications is used only for that order. For access, correction or objection, write to <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Official club account',
    aktiven: 'This account represents {klub}.',
    pravice: 'As a club you can edit positions, add players and approve your players’ profiles.',
    vprasanje: 'Do you represent a club?',
    pojasnilo: 'If you sign in with the club’s official address that we have on file, you get a club account automatically. If we don’t have it, request it below and we will check it.',
    klub: 'Club',
    isciKlub: 'Search clubs …',
    vloga: 'Your role at the club',
    vloge: {
      predsednik: 'president',
      tajnik: 'secretary',
      trener: 'coach',
      vodstvo: 'club management',
      drugo: 'other',
    },
    dokaz: 'Link where the address is published (website, Facebook, federation)',
    opomba: 'Note (optional)',
    naslovRacuna: 'Address we are verifying: {email}',
    poslji: 'Send request',
    caka: 'Your request for {klub} is waiting for review.',
    cakaBrezKluba: 'Your address is an official one, but we still need to link it to the club. We’ll sort it out shortly.',
    cakaPolno: 'The club already has 5 accounts. We’ll review it and let you know.',
    zavrnjeno: 'Your request was declined: {razlog}',
    nepotrjen: 'Confirm your account’s email first.',
    napake: {
      zeKlub: 'You already represent a club.',
      caka: 'Your request is already waiting for a decision.',
    },
  },
}
