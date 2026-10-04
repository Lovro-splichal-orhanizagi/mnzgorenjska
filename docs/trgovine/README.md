# Publishing SLFF to the App Store and Google Play

Everything in the code is done (see `docs/mobilna-aplikacija.md`). What is
left needs your accounts, keys and clicks. Do the steps **in this order** —
some depend on the previous ones (e-mail templates need the web deploy,
`assetlinks.json` needs the Play signing key …).

Files in this folder:

| | |
|---|---|
| `opisi.md` | store texts in en / sl / sk, all within character limits |
| `grafike/play-ikona-512.png` | Google Play icon |
| `grafike/play-naslovna-1024x500.png` | Google Play feature graphic |
| `posnetki/sl`, `posnetki/en` | App Store screenshots, 1320×2868 (iPhone 6.9") |
| `posnetki/play-sl`, `posnetki/play-en` | Google Play screenshots, 1080×2160 |

Screenshots are not in git (18 MB). To regenerate: `npm run build && npx vite
preview`, open it in a browser with a 440×956 viewport at 3× scale, set
`localStorage.slff-jezik-izbran` to `sl` or `en`, remove the chat widget
(`document.querySelectorAll('[id^=chat-widget]').forEach(e => e.remove())`)
and screenshot `/?t=clani`, `/team/<id>`, `/standings`, `/players`,
`/match/<id>`. Play versions: `magick in.png -resize x2160 -background '#020617'
-gravity center -extent 1080x2160 out.png`.

---

## 0. Account values (filled in)

| Value | Where it is used |
|---|---|
| Apple team **Indigo Labs d.o.o.** `H8ZMYS5NUY` | `DEVELOPMENT_TEAM` (Xcode), `apple-app-site-association` |
| App Store Apple ID `6818746153` | `PosodobiAplikacijo.tsx` (update button) |
| Play app signing SHA-256 `08:A0:67:…:10:83` + upload key `27:EF:03:…:2A:C7` | `assetlinks.json` |
| Firebase project `slff-cb58e` (iOS + Android apps) | `GoogleService-Info.plist`, `google-services.json`, Supabase secret `FIREBASE_SERVICE_ACCOUNT` |

Build numbers: iOS 1.0 (1), Android 1.0 (1) and 1.0.1 (2). Keep the next
iOS build and Android versionCode on the **same number** (`min_app_verzija`
compares that number on both platforms).

## 1. Apple Developer portal (developer.apple.com → Certificates, IDs & Profiles)

1. **Identifiers → App IDs → +** → `eu.slff.app`, description "SLFF". Enable:
   - Push Notifications
   - Associated Domains
   - Sign In with Apple (as primary App ID)
2. **Keys → +** → name "SLFF APNs + Sign in", enable **Apple Push Notifications
   service (APNs)** and **Sign in with Apple** (configure → primary App ID
   `eu.slff.app`). Download the `.p8` — it can be downloaded **once**. Note the
   Key ID.
3. **Identifiers → Services IDs → +** → `eu.slff.app.signin`, enable Sign In
   with Apple → Configure:
   - Primary App ID: `eu.slff.app`
   - Domains: `cobtigdsmlftvpfqtnas.supabase.co`
   - Return URL: `https://cobtigdsmlftvpfqtnas.supabase.co/auth/v1/callback`

## 2. Firebase (console.firebase.google.com) — push notifications

1. Create project "SLFF" (Analytics: off — not needed, and keeps the privacy
   labels simple).
2. **Add app → iOS**, bundle ID `eu.slff.app` → download
   `GoogleService-Info.plist` → put it in `ios/App/App/` and in Xcode drag it
   into the **App** group with "Add to target: App" checked (it has to be in
   the bundle; copying the file alone is not enough).
3. **Add app → Android**, package `eu.slff.app` → download
   `google-services.json` → `android/app/google-services.json`.
4. Project settings → **Cloud Messaging → Apple app configuration → APNs
   Authentication Key** → upload the `.p8` from step 1.2 with Key ID and Team ID.
5. Project settings → **Service accounts → Generate new private key** → JSON
   file. This goes to Supabase in step 3 (never into git).

Both config files are client configuration, not secrets — commit them.

## 3. Supabase (production project)

```bash
npx supabase db push --linked                       # 2 new migrations: izbris_racuna, potisna_obvestila
npx supabase functions deploy posli-opomnik --linked
npx supabase secrets set --linked FIREBASE_SERVICE_ACCOUNT="$(cat ~/Downloads/slff-firebase-adminsdk-*.json)"
```

Dashboard:

- **Authentication → URL Configuration**
  - Site URL: `https://slff.eu` (the e-mail templates use it)
  - Redirect URLs: add `eu.slff.app://**`
- **Authentication → Sign In / Providers → Apple**: enable.
  - Client IDs: `eu.slff.app.signin,eu.slff.app`
  - Secret key: generate from the `.p8` (Team ID, Key ID, Services ID) — the
    dashboard has a generator link. **The secret expires after 6 months**; put
    a calendar reminder.
- **Authentication → Emails → Templates** — do this **after** step 4 (web
  deploy), otherwise links point to a page that doesn't exist yet:
  - Confirm signup ← `supabase/templates/confirmation.html`
  - Reset password ← `supabase/templates/recovery.html`

## 4. Web (Vercel)

Merge the branch → Vercel deploys. It brings `/auth/confirm`, `/account`,
`/.well-known/*` and CORS on `/api/drzava`, which the app needs. Check:

```bash
curl -sI https://slff.eu/.well-known/apple-app-site-association | grep -i content-type   # application/json
curl -s  https://slff.eu/.well-known/assetlinks.json
curl -sI https://slff.eu/api/drzava | grep -i access-control                             # *
```

Re-deploy after filling in the Team ID and SHA-256 (step 0).

## 5. Google Play

### Upload key and build

The upload key exists (`~/slff-upload.jks`, alias `slff`) and is stored as
encrypted repo secrets `ANDROID_UPLOAD_KEYSTORE` (base64) and
`ANDROID_UPLOAD_PASSWORD` — the repo is public, so it is **never** committed.
Google holds the real app signing key (Play App Signing); a lost upload key
can be reset in Play Console → App integrity.

**Build:** GitHub → Actions → *Android izdaja (.aab)* → Run workflow → download
the `slff-android-aab` artifact → upload to Play Console. Bump `versionCode`
and `versionName` in `android/app/build.gradle` first; Play rejects a number
it has already seen.

Locally (needs `android/keystore.properties`, gitignored):

```bash
npm run build && npx cap sync
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./android/gradlew -p android bundleRelease
```

### Play Console (play.google.com/console)

1. **Create app** → name `SLFF – Sunday League Fantasy`, default language
   English (UK), App, Free.
2. **Test and release → Internal testing** → upload the `.aab`. Accept **Play
   App Signing**. Then App integrity → copy the **app signing** SHA-256 into
   `assetlinks.json` (step 0) and redeploy the web.
3. **Policy → App content** — answers:
   - Privacy policy: `https://slff.eu/legal`
   - Ads: **Yes, contains ads** (sponsor banners)
   - App access: some functionality is restricted → give the demo account
     (see "Review account" below)
   - Content rating (IARC questionnaire): category *Reference, News, or
     Educational* → no violence, no sexual content, no gambling (it's free, no
     prizes), **references to alcohol/tobacco: yes, in the mascot artwork**;
     users can interact (chat) → expect **PEGI 12 / Teen**.
   - Target audience: 13+ (not designed for children)
   - Data safety: see table below
   - Account deletion: in-app + URL `https://slff.eu/account`
   - Government app: no. Financial features: none. Health: none.
4. **Main store listing**: texts from `opisi.md`, icon, feature graphic,
   phone screenshots from `posnetki/play-en` (add `play-sl` for the Slovenian
   translation). Category Sports. Contact info@slff.eu.
5. Organization account → no 14-day / 12-tester closed test requirement.
   Promote internal → **Production**, countries: all.

## 6. App Store

1. Open `ios/App/App.xcodeproj` in Xcode → target App → **Signing &
   Capabilities** → Team: the company team, "Automatically manage signing".
   Capabilities Push, Associated Domains and Sign in with Apple are already
   in `App.entitlements`; Xcode registers them with the profile.
2. **App Store Connect → Apps → +** → iOS, name `SLFF – Sunday League Fantasy`
   (if taken: `SLFF Fantasy Football`), primary language English (U.K.),
   bundle ID `eu.slff.app`, SKU `slff`. Copy the **Apple ID** into
   `PosodobiAplikacijo.tsx` (step 0).
3. Build and upload:
   ```bash
   npm run build && npx cap sync ios
   ```
   Xcode → destination "Any iOS Device" → Product → **Archive** → Distribute
   App → App Store Connect → Upload.
4. **TestFlight**: install on your phone, test the checklist below.
5. **App information**: category Sports / Entertainment, content rights: the
   app shows third-party content (club crests, public statistics) — answer
   "yes, and I have the rights or it's permitted" only if you're comfortable;
   crests are used for identification and clubs can ask for removal (see
   `/legal`).
6. **Age rating** questionnaire: *Alcohol, Tobacco, or Drug Use or
   References* → **Infrequent/Mild** (mascot). Gambling → None (it's free, no
   prizes). Contests → **Infrequent/Mild** (it's a fantasy competition).
   User-generated content: chat → yes. Expect **12+/13+**.
7. **App Privacy**: see table below. Tracking: **No**.
8. **Pricing**: Free, all territories.
9. Version page: screenshots `posnetki/en` (6.9" — App Store scales them to
   smaller iPhones), texts from `opisi.md`, review notes and demo account
   (below). Submit.

## Privacy answers (same for both stores)

| Data | Collected | Linked to user | Purpose | Notes |
|---|---|---|---|---|
| E-mail address | yes | yes | App functionality, account management | login, reminders |
| Name (display name) | yes | yes | App functionality | shown on standings |
| User ID | yes | yes | App functionality | |
| Device ID (push token) | yes | yes | App functionality | only if notifications are allowed |
| User content (chat messages, votes) | yes | yes | App functionality | |
| Product interaction / analytics | **no** | | | no analytics SDK |
| Location, contacts, photos, payment | no | | | |

- No tracking, no data sold, no ads SDK (sponsor banners are our own images
  and links, counted as aggregate daily totals without user IDs).
- Data is encrypted in transit: yes. Users can request deletion: yes (in app).
- Google Play "Data shared with third parties": no (Supabase, Vercel, Resend,
  Firebase, HelpStack are processors, not sharing).

## Review account

Apple and Google reviewers need a working login. Create one in production:

- e-mail `review@slff.eu`, a password you put only into the review notes,
- give it a valid squad in one active league (so the reviewer sees My Team,
  points and standings, not an empty screen).

Review notes (paste):

```
SLFF is a free fantasy football game for local amateur leagues. Log in with the demo account below; it already has a squad in the "1. GNL — člani" league. My Team shows the squad and lineup, Standings the league table, Players the statistics. Account deletion: account menu (top right) → "Delete account". Push notifications are reminders before the round deadline.
Demo account: review@slff.eu / <password>
```

## Test checklist (TestFlight / internal testing, real phone)

- [ ] First start: league picker, then home page with data
- [ ] Register with e-mail → confirmation mail → link opens **the app** → logged in
- [ ] Forgot password → mail → link opens the app → new password page
- [ ] Log in with Google and with Apple → returns to the app logged in
- [ ] Allow notifications → row in `push_tokens` → run the reminder workflow for
      a test league → notification arrives, tapping it opens My Team
- [ ] Share weekly recap image and an invite link (WhatsApp)
- [ ] Open `https://slff.eu/l/<code>` from Messages → opens the app on the invite
- [ ] Android back button goes back, closes the app on the home page
- [ ] Delete account → logged out, can't log in again
      (if it fails with "permission denied for table users", the hosted
      project doesn't let `postgres` delete from `auth.users`; tell me and I'll
      move deletion to an edge function with `auth.admin.deleteUser`)
- [ ] `insert into settings values ('min_app_verzija','999')` → app shows
      "Update the app"; then `delete from settings where key='min_app_verzija'`

## Updates without a store release (OTA)

Web-only changes (React, texts, styles, logic) reach the app by themselves:
every deploy of slff.eu publishes `/app/latest.json` + a zip, the app
downloads it in the background and switches on the next launch (rolls back
if the new code doesn't start). Check what is live:
`curl -s https://slff.eu/app/latest.json`.

A store release is needed only for **native** changes: a new Capacitor
plugin, permissions, icon/splash, Firebase files, `capacitor.config.ts`.
With such a release also raise `slff.otaMinBuild` in `package.json` to the
new build number, so older installs don't receive code they can't run.

## Every next release

1. Bump the version:
   - iOS: Xcode → target App → General → Version (`1.1`) and Build (`2`, +1 every upload)
   - Android: `android/app/build.gradle` → `versionName "1.1"`, `versionCode 2`
   - Keep **Build = versionCode** — `min_app_verzija` compares that number on both platforms.
2. `npm run build && npx cap sync`, then archive / bundleRelease as above.
3. When a migration breaks an old app (renamed RPC, changed columns the app
   reads), release the new app first, wait until it's approved and live, then
   `update settings set value = '<new build>' where key = 'min_app_verzija'`
   (or `insert` the first time) and only then push the migration.

## Known gaps (not blocking release)

- Android notification icon is the app icon (shows as a white circle). A
  white-on-transparent `ic_stat_slff` and a `default_notification_icon`
  meta-data entry in `AndroidManifest.xml` fix it.
- Push is sent together with the existing e-mails (deadline reminder, invalid
  squad warning, club withdrawal, position fixes). A "round results are in"
  push doesn't exist yet.
- After confirming a new e-mail address the app always opens My Team (the
  original page from before registration is not remembered across devices).
- iPad: the app is iPhone-only; it runs on iPad in iPhone mode.
