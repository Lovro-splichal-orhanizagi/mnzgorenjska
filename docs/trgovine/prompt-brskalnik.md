# Prompt for Claude in Chrome — set up SLFF in the stores

Paste everything below the line into Claude in Chrome. Log in to the accounts
first (Apple Developer, App Store Connect, Google Play Console, Firebase,
Supabase) in the same Chrome profile — the agent should never type your
passwords or 2FA codes. File paths point to this repository on your Mac.

---

You are helping me publish the mobile app **SLFF – Sunday League Fantasy**
(a free fantasy football game for local amateur leagues) to the Apple App
Store and Google Play. The code is finished; you do the setup in the web
consoles. I am logged in to all consoles in this browser with our **company**
accounts.

## Rules

- **Stop and ask me** before: accepting any agreement or terms, paying
  anything, submitting an app for review, publishing to production, deleting
  anything, or when a login / 2FA / CAPTCHA appears.
- Never paste key contents, passwords or private keys into any field or chat
  unless the step says so. Downloaded keys stay in `~/Downloads`; tell me
  their file names.
- If a value already exists (an App ID, an app, a key), reuse it instead of
  creating a duplicate, and tell me.
- If a name is taken, try the fallback given and tell me.
- If the console looks different from these steps, find the equivalent and
  tell me what you did. If unsure, ask.
- At the end give me the **report** listed at the bottom, with every value.

## Fixed values

| | |
|---|---|
| App name | `SLFF – Sunday League Fantasy` (fallback `SLFF Fantasy Football`) |
| Bundle ID / package | `eu.slff.app` |
| Sign in with Apple Services ID | `eu.slff.app.signin` |
| SKU | `slff` |
| Supabase project | `cobtigdsmlftvpfqtnas` (https://cobtigdsmlftvpfqtnas.supabase.co) |
| Website | https://slff.eu |
| Privacy policy | https://slff.eu/legal |
| Support URL | https://slff.eu/legal |
| Account deletion URL | https://slff.eu/account |
| Contact e-mail | info@slff.eu |
| Category | Sports (secondary: Entertainment) |
| Price | Free, all countries/regions |
| Primary language | English (U.K.) |
| Repository on disk | `/Users/lukazlatecan/Work/SLFF/mnzgorenjska` |

## Part 1 — Apple Developer (developer.apple.com/account)

1. **Membership details**: read the **Team ID** (10 characters) and the legal
   entity name. Put both in the report.
2. **Certificates, IDs & Profiles → Identifiers → +** → App IDs → App:
   description `SLFF`, explicit Bundle ID `eu.slff.app`. Capabilities:
   **Push Notifications**, **Associated Domains**, **Sign In with Apple**
   (enable as a primary App ID). Register.
3. **Keys → +**: name `SLFF APNs and Sign in`, enable **Apple Push
   Notifications service (APNs)** (environment: Sandbox & Production) and
   **Sign in with Apple** (Configure → primary App ID `eu.slff.app`).
   Register → **Download** (possible only once). Report the **Key ID** and
   the downloaded file name (`AuthKey_XXXXXXXXXX.p8`).
4. **Identifiers → + → Services IDs**: description `SLFF Sign in`,
   identifier `eu.slff.app.signin`. Then open it, tick **Sign In with Apple**
   → Configure: Primary App ID `eu.slff.app`, Domains
   `cobtigdsmlftvpfqtnas.supabase.co`, Return URLs
   `https://cobtigdsmlftvpfqtnas.supabase.co/auth/v1/callback`. Save.

## Part 2 — App Store Connect (appstoreconnect.apple.com)

1. **Apps → + → New App**: platform iOS, name `SLFF – Sunday League Fantasy`,
   primary language English (U.K.), bundle ID `eu.slff.app`, SKU `slff`,
   user access Full. Report the **Apple ID** (digits) from App Information.
2. **App Information**: subtitle `Fantasy football, local league`,
   category Sports / Entertainment, content rights → the app shows
   third-party content: answer **Yes** (club crests used for identification
   and public match statistics; stop and ask me if the form asks for proof).
   Add localizations **Slovenian** and **Slovak** with the names/subtitles
   from the texts section.
3. **Age Rating** questionnaire:
   - Alcohol, Tobacco, or Drug Use or References: **Infrequent/Mild** (the
     mascot holds a beer and a cigarette)
   - Contests: **Infrequent/Mild** (fantasy competition, no prizes)
   - Gambling, simulated gambling: **None** (free, no money, no prizes)
   - User-generated content: **Yes** (public chat and votes, moderated by us)
   - Everything else: None / No. Report the resulting rating.
4. **App Privacy** → privacy policy URL `https://slff.eu/legal`, then
   "Get started", **data is collected**:
   - Contact Info → **Email Address**: App Functionality; linked to user; not tracking
   - Contact Info → **Name**: App Functionality; linked; not tracking
   - Identifiers → **User ID**: App Functionality; linked; not tracking
   - Identifiers → **Device ID**: App Functionality (push notifications); linked; not tracking
   - User Content → **Other User Content** (chat messages, votes): App Functionality; linked; not tracking
   - Nothing else (no location, contacts, payments, analytics, diagnostics). Tracking: **No**. Publish the answers.
5. **Pricing and Availability**: Free, all countries and regions.
6. **Version 1.0 (iOS App)** page, English (U.K.):
   - Promotional text, description, keywords, support URL, marketing URL —
     from the texts section.
   - Screenshots, **iPhone 6.9" display**, upload in this order:
     `/Users/lukazlatecan/Work/SLFF/mnzgorenjska/docs/trgovine/posnetki/en/1-domov.png`,
     `…/en/2-ekipa.png`, `…/en/3-lestvica.png`, `…/en/4-igralci.png`, `…/en/5-tekma.png`
   - Copyright: `2026 <legal entity name from Part 1>`
   - Same for the Slovenian localization with screenshots from `…/posnetki/sl/`
     and the Slovenian texts; Slovak uses the English screenshots and Slovak texts.
   - App Review Information: sign-in required **Yes**, demo account
     `review@slff.eu` / ask me for the password; contact info@slff.eu; notes —
     the review notes in the texts section.
   - Do **not** add a build and do **not** submit — I will upload the build
     from Xcode.

## Part 3 — Firebase (console.firebase.google.com) — push notifications

1. **Create project** `SLFF` (Google Analytics: **off**). If asked for a
   billing plan, stay on Spark (free).
2. **Add app → iOS**: bundle ID `eu.slff.app`, nickname `SLFF iOS`.
   Download `GoogleService-Info.plist`; skip the SDK steps.
3. **Add app → Android**: package `eu.slff.app`, nickname `SLFF Android`.
   Download `google-services.json`; skip the SDK steps.
4. Project settings → **Cloud Messaging** → Apple app configuration → APNs
   Authentication Key → **Upload** the `.p8` from Part 1.3 with its Key ID and
   the Team ID.
5. Project settings → **Service accounts** → Firebase Admin SDK → **Generate
   new private key**. Report only the file name — never its contents.

## Part 4 — Google Play Console (play.google.com/console)

1. **Create app**: name `SLFF – Sunday League Fantasy`, default language
   English (United Kingdom) – en-GB, App, **Free**. Declarations: tick the
   developer policies and US export laws boxes only after asking me.
2. **Dashboard → Set up your app** (Policy → App content), answer:
   - Privacy policy: `https://slff.eu/legal`
   - App access: **All or some functionality is restricted** → instructions
     "Log in with the demo account", username `review@slff.eu`, password: ask me.
   - Ads: **Yes, my app contains ads** (sponsor banners).
   - Content rating (IARC): e-mail info@slff.eu, category **All other app
     types** (or Reference/Entertainment if offered). Violence none; sexuality
     none; language none; **controlled substances: references to alcohol and
     tobacco in artwork, yes**; gambling: no real or simulated gambling;
     users can interact/communicate: **yes** (chat); shares location: no;
     digital purchases: no. Report the ratings.
   - Target audience: **13–15, 16–17, 18 and over** (not designed for children).
   - News app: No. COVID: No. Government app: No. Financial features: None.
     Health: None.
   - Data safety:
     - Collects data: Yes. Encrypted in transit: Yes. Users can request deletion: Yes.
     - Personal info → **Email address**, **Name**, **User IDs**: collected, not shared, required, purpose App functionality + Account management.
     - Device or other IDs: collected (push token), not shared, optional, App functionality.
     - Messages → **Other in-app messages** (chat): collected, not shared, optional, App functionality.
     - Nothing else (no location, financial, health, contacts, files, app activity analytics).
   - Account deletion: in-app **and** URL `https://slff.eu/account`.
3. **Grow → Store presence → Main store listing** (en-GB):
   - App name, short description, full description: from the texts section.
   - App icon: `/Users/lukazlatecan/Work/SLFF/mnzgorenjska/docs/trgovine/grafike/play-ikona-512.png`
   - Feature graphic: `…/docs/trgovine/grafike/play-naslovna-1024x500.png`
   - Phone screenshots: `…/docs/trgovine/posnetki/play-en/1-domov.png` … `5-tekma.png`
   - Category Sports; contact e-mail info@slff.eu; website https://slff.eu.
   - Add translations **Slovenian (sl-SI)** and **Slovak (sk)** with their
     texts; Slovenian screenshots from `…/posnetki/play-sl/`.
4. **Test and release → Internal testing**: create a release only up to the
   point where it asks for an App Bundle, then **stop** — I will upload the
   `.aab`. Tell me what remains on the dashboard checklist.
5. After I upload the bundle: **Test and release → Setup → App integrity →
   App signing** → report the **SHA-256 certificate fingerprint** of the
   **app signing key** (not the upload key).

## Part 5 — Supabase (supabase.com/dashboard/project/cobtigdsmlftvpfqtnas)

1. **Authentication → URL Configuration**: Site URL must be
   `https://slff.eu` (if it is something else, ask me before changing).
   Redirect URLs: **add** `eu.slff.app://**` (keep the existing ones).
2. **Authentication → Sign In / Providers → Apple**: enable. Client IDs
   `eu.slff.app.signin,eu.slff.app`. For the secret key: the dashboard asks
   for a generated JWT — stop and tell me; I will generate it from the `.p8`
   (Team ID, Key ID, Services ID).
3. **Authentication → Emails → Templates**: replace the **Confirm signup**
   and **Reset Password** templates with the contents of
   `/Users/lukazlatecan/Work/SLFF/mnzgorenjska/supabase/templates/confirmation.html`
   and `…/supabase/templates/recovery.html` (I will paste them if you can't
   read local files — ask). Keep the subjects as they are.

## Texts

### English (primary)
- Name: `SLFF – Sunday League Fantasy`
- Subtitle (App Store): `Fantasy football, local league`
- Short description (Play): `Fantasy football for your local amateur league. Points from official reports.`
- Keywords (App Store): `fantasy,football,soccer,league,amateur,sunday,lineup,captain,transfers,standings,slovenia,slovakia`
- Promotional text (App Store): `New round, new chance. Build your squad from real players of your local league, pick a captain and climb the standings with your friends.`
- Description:

```
SLFF is fantasy football for local amateur leagues — the players you see every Sunday, not the ones on TV.

Build a squad of 15 real players from your league within a budget of 100, pick your starting eleven and a captain, and score points from the official match reports: minutes played, goals, clean sheets and cards. Assists and positions, which the reports don't record, are decided by the community through voting.

HOW IT WORKS
• Pick a league: Slovenian regional leagues (men and U19) and Slovak regional leagues.
• Build your squad: 2 goalkeepers, 5 defenders, 5 midfielders, 3 forwards, at most 3 from the same club.
• Set your lineup before the round deadline. The captain earns triple points; if he doesn't play, the vice-captain takes over.
• Players who don't play are replaced automatically from the bench.
• Prices move every week with form, like a stock exchange.

PLAY WITH FRIENDS
• Mini-leagues with a code — invite your team-mates, your club or your pub.
• Every round has its own winner, so it's never too late to join.
• Share your weekly recap as an image to Instagram or WhatsApp.

NEVER MISS A DEADLINE
• Reminders before the round locks, and a warning if your squad isn't valid.

SLFF is free, has no paid features and no betting. It is a fan project and is not affiliated with any football association or club. Player statistics come from publicly available official match reports.
```

### Slovenian
- Name: `SLFF – Sunday League Fantasy`
- Subtitle: `Fantasy liga za tvojo ligo`
- Short description: `Fantasy nogomet za medobčinske lige. Točke iz uradnih zapisnikov.`
- Keywords: `fantasy,nogomet,liga,medobčinska,MNZ,ekipa,kapetan,prestopi,lestvica,gorenjska,ljubljana,NZS`
- Promotional text: `Nov krog, nova priložnost. Sestavi ekipo iz pravih igralcev svoje lige, izberi kapetana in se s prijatelji poženi po lestvici.`
- Description:

```
SLFF je fantasy nogomet za slovenske medobčinske lige — za igralce, ki jih gledaš vsako nedeljo, ne tiste s televizije.

Iz pravih igralcev svoje lige sestavi kader 15 igralcev v proračunu 100, postavi enajsterico in kapetana ter zbiraj točke iz uradnih zapisnikov MNZ: minute, goli, ohranjene mreže in kartoni. Asistence in pozicije, ki jih zapisnik ne pove, določi skupnost z glasovanjem.

KAKO IGRAŠ
• Izberi ligo: medobčinske lige (člani in mladinci), lige NZS in slovaške regionalne lige.
• Sestavi kader: 2 vratarja, 5 branilcev, 5 vezistov, 3 napadalci, največ 3 iz istega kluba.
• Pred rokom kroga uredi postavo. Kapetan prinese trojne točke; če ne igra, trak prevzame namestnik.
• Kdor ne igra, ga samodejno zamenja rezerva s klopi.
• Cene se vsak teden premikajo s formo, kot na borzi.

S PRIJATELJI
• Mini lige s kodo — povabi soigralce, klub ali šank.
• Vsak krog ima svojega zmagovalca, zato nikoli ni prepozno.
• Tedenski pregled deli kot sliko na Instagram ali WhatsApp.

NIKOLI NE ZAMUDIŠ ROKA
• Opomnik pred zaklepom kroga in opozorilo, če ekipa ni veljavna.

SLFF je brezplačen, brez plačljivih funkcij in brez stav. Je navijaški projekt in ni povezan z nogometnimi zvezami ali klubi. Statistika je povzeta po javno objavljenih uradnih zapisnikih.
```

### Slovak
- Name: `SLFF – Sunday League Fantasy`
- Subtitle: `Fantasy futbal pre tvoju ligu`
- Short description: `Fantasy futbal pre regionálne súťaže. Body z oficiálnych zápisov.`
- Keywords: `fantasy,futbal,liga,regionálna,okres,tím,kapitán,prestupy,tabuľka,futbalnet,SFZ,amatér`
- Promotional text: `Nové kolo, nová šanca. Zostav si tím zo skutočných hráčov svojej ligy, vyber kapitána a s kamarátmi sa prebojuj na vrchol tabuľky.`
- Description:

```
SLFF je fantasy futbal pre regionálne a okresné súťaže — pre hráčov, ktorých vídaš každú nedeľu, nie tých z televízie.

Zo skutočných hráčov svojej ligy si zostav káder 15 hráčov v rozpočte 100, postav jedenástku a kapitána a zbieraj body z oficiálnych zápisov o stretnutí: odohrané minúty, góly, čisté konto a karty.

AKO SA HRÁ
• Vyber si ligu: regionálne a okresné súťaže Stredoslovenského futbalového zväzu a slovinské ligy.
• Zostav káder: 2 brankári, 5 obrancov, 5 záložníkov, 3 útočníci, najviac 3 z jedného klubu.
• Pred uzávierkou kola uprav zostavu. Kapitán získa trojnásobok bodov; ak nehrá, pásku preberá zástupca.
• Kto nehrá, toho automaticky nahradí náhradník z lavičky.
• Ceny sa každý týždeň hýbu podľa formy, ako na burze.

S KAMARÁTMI
• Miniligy s kódom — pozvi spoluhráčov, klub alebo krčmu.
• Každé kolo má svojho víťaza, takže nikdy nie je neskoro.
• Týždenný prehľad zdieľaj ako obrázok na Instagram alebo WhatsApp.

NEZMEŠKÁŠ UZÁVIERKU
• Pripomienka pred uzávierkou kola a upozornenie, ak tím nie je platný.

SLFF je zadarmo, bez platených funkcií a bez stávok. Je to fanúšikovský projekt a nie je spojený so žiadnym futbalovým zväzom ani klubom. Štatistiky pochádzajú z verejne dostupných oficiálnych zápisov (futbalnet.sk).
```

### Review notes (both stores)

```
SLFF is a free fantasy football game for local amateur leagues. Log in with the demo account below; it already has a squad in the "1. GNL — člani" league. My Team shows the squad and lineup, Standings the league table, Players the statistics. Account deletion: account menu (top right) → "Delete account". Push notifications are reminders before the round deadline.
Demo account: review@slff.eu / <password — ask me>
```

## Report (give me this at the end)

```
Apple Team ID:
Legal entity name:
APNs/Sign in Key ID + file name:
Services ID created: yes/no
App Store Connect Apple ID (digits):
Final app name (App Store / Play):
Apple age rating:
Firebase project ID:
Downloaded files (names): GoogleService-Info.plist, google-services.json, service account JSON
Play content rating:
Play app signing SHA-256 (after I upload the bundle):
Supabase: redirect URL added yes/no, Apple provider status, templates replaced yes/no
Open items / anything you skipped or were unsure about:
```
