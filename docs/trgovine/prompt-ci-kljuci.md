# Prompt for Claude in Chrome — keys for automated store releases

Paste everything below the line into Claude in Chrome. Log in first (App
Store Connect with an **Admin** or **Account Holder** role for Indigo Labs
d.o.o., Google Cloud console and Google Play Console as an account owner/admin).
Then give Claude Code the report from the end; it stores the files as GitHub
secrets and deletes them from Downloads.

---

You are helping me set up API access so that GitHub Actions can upload builds
of the app **SLFF – Sunday League Fantasy** (`eu.slff.app`) to TestFlight /
App Store and Google Play and submit them for review. I am logged in to all
consoles in this browser.

## Rules

- **Stop and ask me** before accepting any terms, paying anything, deleting
  or revoking anything, or when a login / 2FA / CAPTCHA appears.
- Downloaded key files stay in `~/Downloads`. **Never** open them, paste their
  contents anywhere, or show them in chat — only tell me their file names.
- If something already exists (a key named `SLFF CI`, a service account
  `play-release`), reuse it and tell me instead of creating a duplicate.
- If the console looks different from these steps, find the equivalent and
  tell me what you did. If unsure, ask.
- At the end give me the **report** below.

## Part 1 — App Store Connect API key (appstoreconnect.apple.com)

Team: **Indigo Labs d.o.o.** (Team ID `H8ZMYS5NUY`). If the account switcher
(top right) shows several teams, make sure this one is selected.

1. **Users and Access → Integrations → App Store Connect API**.
2. If API access is not enabled yet, there is a **Request Access** button for
   the Account Holder — stop and tell me.
3. Tab **Team Keys** → **Generate API Key** (or **+**):
   - Name: `SLFF CI`
   - Access: **App Manager**
   - Generate.
4. In the list, note the **Key ID** of `SLFF CI`, and at the top of the page
   the **Issuer ID** (a UUID).
5. Click **Download** next to the key — it can be downloaded **only once**.
   The file is `AuthKey_<KeyID>.p8` in Downloads. Confirm the file name.

## Part 2 — Google Cloud: service account (console.cloud.google.com)

1. Select project **`slff-cb58e`** (the Firebase project of SLFF; its display
   name may be "SLFF").
2. **APIs & Services → Library** → search **Google Play Android Developer API**
   → **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**:
   - Name: `play-release`, ID `play-release`
   - Description: `GitHub Actions: upload SLFF to Google Play`
   - Skip the optional role and user-access steps (no project roles needed) → Done.
4. Open `play-release` → **Keys → Add key → Create new key → JSON → Create**.
   The JSON downloads to Downloads. Report the file name and the service
   account e-mail (`play-release@slff-cb58e.iam.gserviceaccount.com`).
   - If key creation is blocked by an organization policy
     (`iam.disableServiceAccountKeyCreation`), stop and tell me.

## Part 3 — Google Play Console (play.google.com/console)

1. **Users and permissions** (left menu, account level) → **Invite new users**.
2. E-mail: the service account e-mail from Part 2.
3. **App permissions** → **Add app** → **SLFF – Sunday League Fantasy** → Apply.
   Tick, for this app:
   - **Releases**: *Release to production, exclude devices, and use Play App
     Signing*, *Release apps to testing tracks*, *Manage testing tracks and
     edit tester lists*
   - **App access**: *View app information and download bulk reports (read-only)*
   - Nothing under financial data, orders or user management.
4. Leave **Account permissions** empty → **Invite user** → confirm.
5. The service account appears as active (it cannot accept an invitation
   itself; that is normal).

## Report (give me this at the end)

```
App Store Connect
  Team selected: Indigo Labs d.o.o. yes/no
  Key name / access: SLFF CI / App Manager
  Key ID:
  Issuer ID:
  .p8 file name in Downloads:

Google Cloud (project slff-cb58e)
  Play Android Developer API enabled: yes/no
  Service account e-mail:
  JSON key file name in Downloads:

Google Play Console
  Service account invited with app-level release permissions for SLFF: yes/no
  Permissions granted (list):

Open items / anything you skipped or were unsure about:
```
