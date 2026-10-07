# Migration: Vercel + Supabase Cloud → Hetzner VM

Goal: everything runs on our VM (`ssh slff`, 2.31.6.53). Users see no change:
they stay logged in, keep their passwords and teams, and existing links keep working.

## 1. What exists today (measured 2026-10-04)

| Piece | Today | On the VM |
|---|---|---|
| Static site (`dist/`, 33 MB, incl. 29 MB crests, OTA zips) | Vercel | Caddy serves files |
| `vercel.json` rewrites (`/sk`, `/hr`, `?t=sk-…`/`hr-…` → `sk.html`/`hr.html`, SPA fallback), security headers, `no-store` on `/app/latest.json`, CORS on `/grbi/*` | Vercel | Caddyfile (1:1 port) |
| `api/drzava.ts` (country from `x-vercel-ip-country`) | Vercel Edge | Caddy returns `{"drzava":"<Cf-Ipcountry>"}` |
| Deploy (`ci.yml` → `vercel deploy`) | Vercel CLI | Actions builds, rsyncs to `/srv/slff/releases/<sha>`, swaps a symlink |
| Postgres 17.6, **307 MB**, max_connections 60 (Micro) | Supabase | `supabase/postgres` 17 image |
| Auth: 1359 users (723 email, 663 Google), 1882 live sessions | Supabase GoTrue | self-hosted GoTrue |
| PostgREST | Supabase | self-hosted PostgREST |
| Edge function `posli-opomnik` (SMTP, FCM) | Supabase | self-hosted `edge-runtime` |
| Mail (auth + reminders) | Resend | Mailcow (HelpStack's server, 167.233.99.232) as **`mail.slff.eu`**, `noreply@slff.eu`, port 465 |
| pg_cron: `zakleni-zapadle-kroge` */5, `uveljavi-cene`, `uveljavi-pozicije`, `obnovi-tocke-krogov`, `obnovi-statistiko-igralcev` | Supabase | same, in our Postgres |
| pg_net + Vault (1 secret: `discord_webhook`) | Supabase | same; **re-insert the secret by hand** (the Vault key differs, so a dump can't decrypt it) |
| Storage (0 objects), Realtime (unused, Klepet polls) | — | **not deployed** |
| GitHub Actions crons (imports, alerts, weekly prices/report) | GitHub | stay on GitHub, only `SUPABASE_URL`/key secrets change |
| Daily backups | Supabase | ours (section 6) |

## 2. The traps and how we avoid them

1. **The API URL is baked into every client** (web bundle, app via OTA, scripts).
   `https://cobtigdsmlftvpfqtnas.supabase.co` can't be redirected. So clients first
   switch to **`https://api.slff.eu`**, which initially **proxies to Supabase Cloud**.
   At cutover only the proxy's upstream changes, and no client needs an update that day.
2. **Changing the URL would log everyone out.** supabase-js derives the localStorage key
   from the hostname (`sb-<ref>-auth-token`). Pin it in `src/lib/supabase.ts`:
   `auth: { storageKey: 'sb-cobtigdsmlftvpfqtnas-auth-token', … }`.
3. **JWTs are ES256 signed with Supabase's key, and we can't export the private key.**
   - Dump `auth.sessions` and `auth.refresh_tokens` with the data. Refresh then works
     against our GoTrue, so users stay logged in.
   - Access tokens issued before cutover (≤1 h old) must still verify. Give PostgREST
     (`PGRST_JWT_SECRET` as a JWKS) and GoTrue (`GOTRUE_JWT_KEYS`) **our new signing key
     plus Supabase's public key** (from `/auth/v1/.well-known/jwks.json`, kid
     `b65a373b-…`) as verify-only.
   - Rehearsal must confirm this. Worst case without it: requests fail for ≤1 h until each
     client refreshes.
4. **Opaque API keys (`sb_publishable_…`, `sb_secret_…`).** Solved: the self-hosted
   Envoy gateway compares them as plain strings, so the VM uses **the same values as
   Cloud**. Old bundles, the app and GitHub secrets keep working unchanged.
5. **Google OAuth callback** becomes `https://api.slff.eu/auth/v1/callback`. Add it to
   the Google Cloud console beside the old one **before** cutover.
6. **Auth email** (SMTP and templates) lives in the Supabase dashboard, not in git. Pull it
   via the Management API (`GET /v1/projects/{ref}/config/auth`): SMTP host/user, rate
   limits, JWT expiry, `site_url`, redirect allow-list (`eu.slff.app://**`), template
   bodies. Templates go to GoTrue as `GOTRUE_MAILER_TEMPLATES_*` URLs served from slff.eu.
7. **Split brain.** After cutover, Supabase Cloud stays **read-only**
   (`default_transaction_read_only`). Stragglers (an old app build, a forgotten script)
   can read but can't write data we would lose. Pause the project after 2 weeks.
8. **Unique-per-project things in the DB dump:** `cron.job` (re-create, don't copy),
   `vault.secrets` (re-insert), `storage`/`realtime`/`supabase_functions` (skip).

## 3. Target layout on the VM

```
Cloudflare (proxied, Full strict, origin cert)  ── slff.eu, api.slff.eu
        │  443 only, firewall allows Cloudflare IP ranges + SSH
      Caddy ── slff.eu      → /srv/slff/current (static, rewrites, headers, /api/drzava)
            └─ api.slff.eu  → phase 2: Supabase Cloud | phase 4: Kong :8000
docker compose (official supabase/docker, trimmed):
  db (Postgres 17, pg_cron, pg_net, vault), kong, auth, rest, functions (edge-runtime), meta
  — dropped: studio (open via SSH tunnel when needed), storage, imgproxy, realtime,
    analytics/logflare, vector, supavisor
```

Memory budget: Postgres about 1.5 GB (`shared_buffers=1GB`, `effective_cache_size=2.5GB`)
and the rest about 0.5 GB. Add a 2 GB swapfile. The DB is 307 MB, so it fits in RAM
entirely. On Supabase Micro (1 GB) it didn't. That alone fixes much of the "slow queries".

**CPU caution:** a shared 2 vCPU is about what Micro had. Before cutover, check
`pg_stat_statements` top queries on the rehearsal copy under a replayed load. If CPU-bound,
rescale in place to **CCX13** (2 dedicated vCPU, 8 GB) or CPX31. Rescale keeps the disk,
takes about 1 minute and works at any time.

## 3b. Status (2026-10-04)

- **P0 done:** SSH keys only, ufw 22/80/443, 2 GB swap, UTC, unattended-upgrades,
  fail2ban, Docker, Caddy. All container ports are bound to 127.0.0.1, because Docker
  bypasses ufw.
- **P1 mostly done:** `/opt/supabase` comes from the official `setup.sh`
  (self-hosted/v0.8.2) plus our override `scripts/hetzner/docker-compose.slff.yml`
  (copy on the VM).
  - **Pinned to Cloud versions:** `supabase/postgres:17.6.1.166` and
    `supabase/gotrue:v2.197.0`. The release ships older images, and the auth dump fails
    on them (`auth.mfa_recovery_code_sets`).
  - Rehearsal restore of the live dump takes **7 s**. All 62 `public`/`auth` tables
    match Cloud row for row, except writes made during the ~10 minutes after the dump.
    `preizkus-tock-krogov` and `preizkus-statistike` pass.
  - Restore quirks: drop the `supabase_realtime_admin` grant from `roles.sql`, and strip
    the `storage.*` COPY blocks (`-x` doesn't exclude them; Cloud has 0 objects).
  - After restore, run `scripts/hetzner/po-obnovi.sql` (cron jobs) and insert the Vault
    secret.
  - JWT: our ES256 key signs; Cloud's `b65a373b-…` public key is in `JWT_KEYS` (verify
    only) and `JWT_JWKS`. GoTrue starts with it, and `/auth/v1/.well-known/jwks.json`
    lists both.
  - API through the gateway with the Cloud publishable key: reads OK, anon writes refused
    (RLS), wrong key 401, `vrh_drzave` in 53 ms.
  - `posli-opomnik` is deployed at `volumes/functions/`. The function needs
    `SUPABASE_SECRET_KEY` (singular) passed in by the override.
- **Auth config copied** from `supabase config pull` into the override and `.env`:
  `site_url`, redirect list, 8-digit OTP, TOTP MFA, refresh rotation, rate limits,
  Resend SMTP, subjects, and the Google + **Apple** providers.
  - Templates are served by Caddy on `172.17.0.1:8089`, reachable from containers only.
  - **PostgREST `max_rows` is 5000 in production**, not 1000. It is set on the VM and
    verified.
  - The production `sb_secret_` key was copied onto the VM with
    `supabase projects api-keys --reveal`, so scripts and CI keep their secret.
  - Behind Cloudflare, set `RATE_LIMIT_HEADER=CF-Connecting-IP`, or all users share one
    auth rate-limit bucket.
- **Still open in P1:** the secrets in `/opt/slff/secrets.env`, auth config from the
  Management API (SMTP, templates, Google), Caddy plus TLS, a test with a real
  Cloud-issued access token and refresh token, and email/OAuth tests.

## 3c. Status (2026-10-06)

- **Mail moved to HelpStack's Mailcow server** (`ssh helpstackmail`, 167.233.99.232), which
  SLFF addresses as **`mail.slff.eu`** (an extra name in Mailcow's `ADDITIONAL_SAN`). It has
  the domain `slff.eu` and the mailbox `noreply@slff.eu`, DKIM selector `dkim`. The SMTP
  credentials are in `/opt/slff/secrets.env` and the VM's `.env`. GoTrue and `posli-opomnik`
  use port 465, because Supabase Cloud blocks 25/587. `posli-opomnik` sends with
  `npm:nodemailer` instead of the Resend API. `email_log.resend_id` now holds the
  Message-ID. A test from the VM function was delivered and DKIM-signed.
  - **Done 2026-10-06:** the slff.eu DNS is on Cloudflare (NS `earl`/`rafe`). `mail` A/AAAA
    (DNS only), MX → `mail.slff.eu`, SPF `ip4:167.233.99.232 ip6:2a01:4f8:c015:735b::1`,
    `dkim._domainkey`, `_dmarc p=none`. Resend's `send.` records are kept until Cloud is off.
    The Mailcow certificate covers `mail.slff.eu` (renews itself). The VM uses
    `SMTP_HOST=mail.slff.eu`, and Gmail accepted the test.
  - **Never set the PTR to mail.slff.eu.** The IP belongs to HelpStack's mail server, whose
    HELO is `mail.helpstack.eu`, and the PTR matches that.
  - The new function code is **not deployed to Cloud**. If deployed before cutover, first set
    the `SMTP_HOST/USER/PASS` secrets there.
- **api.slff.eu is live (P2 proxy):** Cloudflare proxied, Full (strict), Cloudflare Origin
  certificate (15 years; the key was generated on the VM and is in `/etc/caddy/certs/`).
  Caddy `/etc/caddy/api.caddy` proxies to Supabase Cloud. Reads, auth health and JWKS are
  identical to Cloud, about 40 ms slower. Bot Fight Mode and Browser Integrity Check are off.
  - **Rate limits in P2:** Cloud sees every user as the VM's IP (Supabase's own Cloudflare sets
    the client IP; our `X-Forwarded-For` can't override it). Before moving clients to
    api.slff.eu, raise Cloud's auth rate limits (Auth → Rate Limits: token refresh, sign-in,
    OTP), and keep P2 short. After P4 our GoTrue reads `CF-Connecting-IP`
    (`RATE_LIMIT_HEADER`), so it is per-user again.
- Apple Services ID `eu.slff.app.signin` has the api.slff.eu return URL (old one kept).
  Google is waiting on Lovro (the client is in his GCP project).
- **All VM secrets are filled (2026-10-06)** and tested against Google and Apple:
  - **Google:** our own client `397012484212-mf60…` in `slff-cb58e` (In production, basic
    scopes, no logo yet).
  - **Firebase:** Admin SDK key `83a3e7f9fa`.
  - **Apple:** key `A66B3FC5HV` (Indigo Labs, H8ZMYS5NUY). The `.p8` is in `/opt/slff/keys/`.
    **`APPLE_SECRET` expires 2027-04-04.** Re-run `python3 /opt/slff/apple-secret.py` (the
    repo copy is `scripts/hetzner/apple-secret.py`) and recreate auth before then.
  - **Discord:** webhook copied from Cloud's Vault.
- **info@slff.eu** is a real Mailcow mailbox (the site's contact address and the
  `EMAIL_REPLY_TO`). Webmail is at https://mail.slff.eu/SOGo/, IMAP/SMTP at `mail.slff.eu`.
  The password is in Luka's Keychain ("info@slff.eu") and in secrets.env (`INFO_IMAP_PASS`).
  New mail is posted to Discord every 2 minutes (`/etc/cron.d/slff-info-discord` →
  `scripts/hetzner/info-v-discord.py`, IMAP keyword `SlffDiscord`, log
  `/var/log/slff-info-discord.log`).
- **P3 prepared (website on the VM):** `scripts/hetzner/Caddyfile` (the whole VM Caddy
  config) ports `vercel.json`, with the same headers, `sk`/`hr` cards, `.well-known` and SPA
  fallback. `/api/drzava` is answered by Caddy from `Cf-Ipcountry`. Compared path by path
  against Vercel. Two differences: `/assets/*` gets a one-year immutable cache, and
  `/?t=sk-…` serves the Slovak card (Vercel served index.html there).
  - CI job `objavi-vm` builds in Actions (vars `VITE_SUPABASE_URL`/`_ANON_KEY`), rsyncs to
    `/srv/slff/releases/<sha>` as user `deploy` (secret `DEPLOY_SSH_KEY`, pinned host key in
    var `DEPLOY_KNOWN_HOSTS`), switches `current` atomically and keeps 5 releases. Until the
    DNS switch it deploys to **both** Vercel and the VM.
  - **Switched 2026-10-06 ~20:15 UTC:** apex and `www` are A `2.31.6.53`, **proxied**.
    Checked through Cloudflare: commit, sk/hr cards, `latest.json` no-store, `.well-known`,
    `/api/drzava` from `Cf-Ipcountry`.
    **Rollback:** apex A `64.29.17.1` + `216.198.79.1`, www A `216.198.79.65` + `64.29.17.1`,
    all DNS only, TTL Auto. Vercel gets every deploy until it is removed (**not before
    2026-10-20**): delete the `objavi` job, the `VERCEL_*` secrets, `vercel.json` and
    `api/drzava.ts`, then the Vercel project.
  - Cloudflare's default Browser Cache TTL (4 h) overrides `max-age=0` on static files
    (crests, robots). Set Caching → Browser Cache TTL to "Respect Existing Headers".
  - **Firewall:** 80/443 accept only Cloudflare's ranges (ufw, comment `cloudflare`, 22
    rules, 2026-10-06). SSH stays open. To test the origin, go through `ssh slff` and
    `curl -k --resolve slff.eu:443:127.0.0.1`. If Cloudflare adds ranges
    (cloudflare.com/ips), add them too.
  - Caddy here is 2.6 (apt): no `handle_errors 404`. Also, a `-Header` delete defers its
    whole `header` block. Always `caddy validate` with `set -o pipefail` before replacing.
- **P2 started 2026-10-06 ~20:10 UTC:** GitHub var `VITE_SUPABASE_URL` and secret
  `SUPABASE_URL` = `https://api.slff.eu`, so the web, OTA and scheduled jobs go through the proxy.
  Cloud auth per-IP limits were raised via the Management API (all users now arrive as the
  VM's IP): `rate_limit_token_refresh` 150 → 1800, `rate_limit_verify` 30 → 360,
  `rate_limit_otp` 30 → 360. `email_sent` (100/h, project-wide) is unchanged. CORS checked
  for `https://slff.eu` and `capacitor://localhost`.
  - OTA only updates when the commit changes. Redeploying the same SHA updates the web,
    not the apps.
  - Native builds too old for OTA keep calling supabase.co until they update. Before P4
    check `settings.min_app_verzija` / `slff.otaMinBuild`, because after P4 Cloud is
    read-only.
- **P4 DONE 2026-10-06 20:33 UTC** (`scripts/hetzner/preklop.sh ZARES`, 185 s). All 65
  tables matched; `api.slff.eu` → `localhost:8000` (self-hosted). Real traffic was all
  200/204 on the VM within a minute. Logins carry over: tested with a Cloud-issued access
  token and a Cloud refresh token on the VM before the switch.
  - **Cloud freeze (corrected 2026-10-07):** pg_cron is paused and API roles have no USAGE
    on schema public (see INCIDENT below; the earlier `authenticator` read-only setting did
    not stop writes). A read-only
    *database* blocks the CLI's own login role, so no dump would be possible. Supabase
    reserves `supabase_auth_admin`, so Cloud GoTrue can still write logins. Only stale
    clients still calling supabase.co reach it.
  - **Stale tabs:** browser tabs opened before the P2 deploy still call supabase.co, and
    Cloud GoTrue keeps renewing their sessions (4 users in the first 35 min).
    `scripts/hetzner/dohiti-seje.sh` copies sessions and refresh tokens changed on Cloud
    since the cutover to the VM. Users and identities are only added, never overwritten.
    The VM's `refresh_tokens_id_seq` was moved +10M so ids never collide. **Rerun it before
    deleting Cloud.**
  - **Rollback** (only before real writes pile up on the VM, otherwise copy the delta back):
    Caddyfile `reverse_proxy https://cobtigdsmlftvpfqtnas.supabase.co` with
    `header_up Host {upstream_hostport}`, then on Cloud
    `alter role authenticator reset default_transaction_read_only;` and
    `select cron.alter_job(jobid, active := true) from cron.job;`.
  - CI: `SUPABASE_DB_URL` = `postgresql://supabase_admin:…@127.0.0.1:5432/postgres` over the
    SSH tunnel (deploy key: `permitopen="127.0.0.1:5432"` only).
  - **Backups:** `scripts/hetzner/varnostna.sh` runs hourly at :07 (`pg_dump -Fc`, ~14 MB).
    It keeps 48 h in `/opt/slff/backup`, plus the Hetzner **Storage Box** `slff-backup`
    (`u685650@u685650.your-storagebox.de`, **SSH port 23**, FSN1, BX11 €3.20/month, key
    `/root/.ssh/backup_ed25519`). On the box, `dumps/urne` mirrors the 48 hourly dumps and
    `dumps/dnevne` keeps the 03:07 UTC one for 30 days. The box's shell has no `find`;
    pruning uses the date in the file name. Failures go to Discord. Plus Hetzner's daily VM
    snapshots.
  - **Restore test 2026-10-06:** a box copy restored into a scratch DB with identical counts
    (auth.users 1460, fantasy_teams 1293, player_scores 541329, players 38360). Repeat
    monthly:
    `pg_restore -U supabase_admin -d obnova_test --no-owner` (extension/role errors are noise).
  - Uptime: `.github/workflows/zivost.yml` checks slff.eu, auth and rest every 10 min and
    alerts Discord.
  - Old data dirs on the VM: `/opt/supabase/volumes/db/data.old-*` (rehearsals). Delete after a week.
- **INCIDENT 2026-10-06 21:19 → 2026-10-07 07:10 UTC (split brain, ~10 h).** While adding
  the `/pivo` redirect, the repo's `scripts/hetzner/Caddyfile` was copied to the VM. It still
  had the P2 line (`api.slff.eu` → Supabase Cloud), so all API traffic went to Cloud again.
  The Cloud "freeze" (`default_transaction_read_only` on `authenticator`) did **not** stop
  PostgREST writes. Overnight user changes and Nejc's Croatian imports (~131k appearances)
  therefore landed on Cloud, not the VM.
  - Fixed: Caddyfile in the repo now points at `localhost:8000` (with a warning comment).
    Cloud is really frozen with `revoke usage on schema public from public, anon,
    authenticated, service_role`; API reads and writes are denied, `postgres` can still dump.
    A second cutover (`preklop.sh ZARES`, 389 s, all 65 tables match) brought Cloud's data
    over. VM-only logins (exported to `/opt/slff/vm-delta/`) were re-applied, the night jobs
    rerun, and `preizkus-tock-krogov` / `preizkus-statistike` pass.
  - Lost: VM data from 07:10–07:20 (no game writes; the import `hr-ob-prva-znl-ob` was
    cancelled → rerun). Night-job results are recomputed.
  - The script now freezes with the schema revoke and re-grants on the VM after the restore.
  - **Rule:** before copying any config to the VM, diff it against the live file
    (`ssh slff cat /etc/caddy/Caddyfile | diff - scripts/hetzner/Caddyfile`).
- `src/lib/supabase.ts` pins `storageKey` (P2 trap 2). It is a no-op until the URL changes.
- Still empty in secrets.env: Firebase, Discord webhook, Google and Apple secrets.
  `RESEND_API_KEY` is no longer needed.
- The Cloudflare zone is active. `slff.eu` and `www` still point to Vercel (P3).
- Nejc's SSH key is on the VM (root).
- VM: Hetzner Cloud **CPX22** (2 vCPU, 4 GB, 80 GB), Nuremberg, server `slff.eu` #168664007,
  SpaceGuardian account, project SLFF. **Hetzner Backups are on** (daily, 20 % of the plan).
  The mail server `mail.helpstack.eu` (CPX32) is in the same account, project HelpStack.

## 4. Phases

### P0 — Harden the VM (½ day)
- Non-root deploy user, SSH keys only, `ufw` (22 + 443 from Cloudflare ranges),
  `unattended-upgrades`, fail2ban, 2 GB swap, timezone UTC.
- Docker + compose plugin, Caddy (apt).
- Enable Hetzner Backups (daily VM snapshots).

### P1 — Stack up + rehearsal (1–2 days)
- `supabase/docker` compose trimmed as above, pinned image versions. GoTrue must be ≥ the
  cloud version so `auth.*` columns match.
- `.env`: new ES256 signing key, JWKS incl. old public key, Postgres password, SMTP,
  `API_EXTERNAL_URL=https://api.slff.eu`, `SITE_URL=https://slff.eu`, redirect list,
  Google client, edge-function secrets (`RESEND_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`,
  `EMAIL_FROM`, `EMAIL_REPLY_TO`).
- **Rehearsal restore** of a live dump, using the cutover script for real:
  ```bash
  supabase db dump --db-url "$CLOUD" -f roles.sql --role-only
  supabase db dump --db-url "$CLOUD" -f schema.sql
  supabase db dump --db-url "$CLOUD" -f data.sql --use-copy --data-only \
    -x "storage.*" -x "vault.*" -x "cron.*" -x "supabase_functions.*" -x "realtime.*"
  psql "$LOCAL" -v ON_ERROR_STOP=1 -c "set session_replication_role = replica" \
       -f roles.sql -f schema.sql -f data.sql
  ```
  Then re-create the cron jobs (the `cron.schedule` calls from the 5 migrations) and
  `vault.create_secret('<url>', 'discord_webhook')`. Mark all migrations as applied
  (`supabase_migrations.schema_migrations` is in the data dump; verify).
- Verify on the rehearsal: row counts per table match, `npm run preizkus-tock-krogov`,
  `npm run preizkus-statistike`, `npm run smoke` against it.
- Test logins with a copied **real session** (refresh-token and old-access-token paths),
  email and Google sign-in, password reset email, `posli-opomnik` to yourself, and the
  Discord trigger.
- Write the timings down. The cutover runbook uses them.

### P2 — Clients onto `api.slff.eu` (still Supabase behind it) — ≥1 week before cutover
- Caddy: `api.slff.eu` → `reverse_proxy https://cobtigdsmlftvpfqtnas.supabase.co`
  with `header_up Host {upstream_hostport}`.
- Code: `VITE_SUPABASE_URL=https://api.slff.eu`, pin `storageKey` (trap 2). Ship web and
  OTA. Raise `settings.min_app_verzija` if a native build can't take OTA.
- GitHub secrets: `SUPABASE_URL=https://api.slff.eu`.
- Google console: add the new callback.
- Wait until the Supabase API logs show direct traffic (not from 2.31.6.53) at about zero.

### P3 — Website off Vercel (can run in parallel with P2)
- Caddyfile ports `vercel.json` 1:1. `/.well-known/apple-app-site-association` must
  keep `Content-Type: application/json`, or app links break.
- `ci.yml`: replace `vercel deploy` with build → `rsync` to
  `releases/$GITHUB_SHA` → `ln -sfn` → keep the last 5. Keep the existing
  `preveri-deploy` check (SHA in the served page).
- Cloudflare cache rule: `/grbi/*`, `/assets/*` cached; `/app/latest.json`, `/api/*`
  and everything on `api.slff.eu` bypassed.
- Switch the `slff.eu` DNS record to the VM. Vercel stays deployed for 2 weeks as the
  rollback (flip DNS back).
- PR preview deploys go away. Say if you need them; Cloudflare Pages can do previews.

### P4 — Database cutover (night, target ≤10 min write-freeze)
Window: a weeknight at ~01:00 UTC, **not** within 24 h of a round deadline
(`select * from naslednji_krog`), and clear of the 02:00–03:45 pg_cron and :17 GitHub jobs.

1. T-1 day: final rehearsal from a fresh dump, everything green.
2. Disable GitHub scheduled workflows (`gh workflow disable …`).
3. Cloud: `update cron.job set active = false;` then
   `alter database postgres set default_transaction_read_only = on;` and terminate
   PostgREST/GoTrue backends so they reconnect read-only. **Reads keep working**; writes
   and token refreshes get a brief error and retry.
4. Dump → restore (the P1 script) → cron + vault → row-count check.
5. Caddy: switch the `api.slff.eu` upstream to `localhost:8000`, `caddy reload`
   (graceful, no dropped connections).
6. Smoke: log in, save a team, `npm run smoke` against prod, check the Discord trigger.
7. Re-enable GitHub workflows with the new `SUPABASE_SERVICE_ROLE_KEY`.
   - **Migrations in CI** (`ci.yml` job *Migracije baze*, #72) write to `SUPABASE_DB_URL`.
     Set the repo variable `MIGRACIJE_PREMOR=1` from step 2 until this step. The VM's
     Postgres listens only on 127.0.0.1, so the job can't just get a new URL. Run
     `supabase db push` on the VM over SSH, in the same job that deploys the site (P3 SSH
     key), against `postgresql://postgres:…@127.0.0.1:5432/postgres`.
8. Cloud stays read-only (trap 7).

**Rollback** (until the first real write lands on the VM, or later by copying the delta
back): Caddy upstream back to Cloud, `default_transaction_read_only = off`, re-enable
cron there.

### P5 — Afterwards
- Update CLAUDE.md/README. `supabase db push --linked` becomes
  `supabase db push --db-url` through `ssh -L 5432`, and the Postgres port is never public.
- After 2 weeks with no stray writes: pause Supabase, remove Vercel.

## 5. Backups (we lose Supabase's)
- Hourly `pg_dump -Fc` (≈30 s at this size) → off-box via `restic` to a Hetzner Storage
  Box. Keep 48 hourly and 30 daily.
- Hetzner Backups as the second layer (whole VM, daily).
- **Monthly restore test** into a scratch container. A backup never restored doesn't count.
- If 1 h RPO isn't enough later, add WAL archiving (wal-g).

## 6. Monitoring (minimal)
- External uptime check (UptimeRobot or Better Stack, free) on `slff.eu` and
  `api.slff.eu/rest/v1/` → Discord.
- Daily cron on the VM: disk > 80 %, backup age > 2 h, and `cron.job_run_details`
  failures → the existing Discord webhook.

## 6b. Retiring the cloud services (decided 2026-10-06)

Goal: nothing runs on Supabase Cloud, Vercel or Resend; everything is ours (VM + Mailcow).

| Service | Fate |
|---|---|
| Supabase Cloud (Lovro's org) | P4, then read-only for 2 weeks, final dump kept off-box, **delete project** |
| Vercel | P3, then delete the project and the `VERCEL_*` GitHub secrets, drop `vercel.json` |
| Resend | done on the VM side (Mailcow `mail.slff.eu`); after P4 cancel it, remove the `send.` + `resend._domainkey` DNS records |
| Google OAuth client (Lovro's GCP) | new client in `slff-cb58e`, used by our GoTrue from P4; Lovro's is not needed |
| esm.sh in `posli-opomnik` | switch to an `npm:` import |
| Google Fonts | optional: self-host the font files |
| Firebase FCM, GitHub (+Actions, iOS builds), Cloudflare, Discord | **stay**: push can't be self-hosted, iOS builds need macOS, Cloudflare is our edge |

## 7. Open items
- Read the Supabase auth config (SMTP, templates, JWT expiry) via the Management API (P1).
- A Hetzner Storage Box for backups: do we have one?
- Server size after the P1 load check (CX → CCX13?).
- Cloudflare account and DNS move for slff.eu.
