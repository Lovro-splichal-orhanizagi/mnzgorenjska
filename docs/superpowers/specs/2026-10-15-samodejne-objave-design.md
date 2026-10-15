# Automated social posts (IG + FB) — design

Approved by the owner 15. 10. 2026. Phase 1 (drafts on Discord) is live;
phase 2 (publishing) is built and switches on when the `META_*` keys are on the
server.

## Goal

Two posts per week on the SLFF Instagram and Facebook page, goofy but
factual, generated from our data, with a human veto window.

## Content and schedule

| Slot | Content | Language |
|---|---|---|
| **Monday 10:00** (Ljubljana) | Round recap for **one country** (rotation SI → HR → SK → SI → HR → SK, AT/HU/others occasionally; country picked by users count, skipped if it had no round), e.g. "Round 8 in Slovenia's 1. GNL" | English |
| **Thursday 18:00** | Cross-country goofy stat ("This week in Europe's Sunday leagues …") | English |
| **Milestone** (every 1,000 users) | "4,000 — thank you!" with mascot, plus countries / active leagues / teams | English |

**All posts are in English** (owner, 15. 10. 2026): one audience, one
account, and the caption check only has to know one language.

### Milestone posts (15. 10. 2026)

- Users = `skupaj_uporabnikov()` (no house profile). The worker loop calls the
  service-only `objava_mejnik_dejstva()` (users, countries and active leagues,
  non-house teams) every pass.
- A draft is made when the count is past a multiple of 1,000 by **less than
  300** and no row has that `mejnik` (unique column; slot `mejnik`). Milestones
  passed before deploy are therefore never posted.
- Scheduled time = draft time + 6 h, moved forward into 09:00–20:00 Ljubljana
  (before 09:00 → 09:00 that day, 20:00 or later → 09:00 next day). The rest
  (Discord with stop link, `discord_at`, publisher's 2 h rule) is unchanged.
- `unique (slot, teden)` is now a partial index for `pon`/`cet` only: two
  milestones can fall in the same week (~250 new users a day).

Fact candidates (SQL, one function, returns jsonb):
- top scorer of the round (points, goals), Ideal XI of the round (existing
  selection logic: 1 GK, 4 DEF, 4 MID, 2 FWD),
- biggest price riser of the week,
- goalkeeper with a goal or assist, hat-tricks,
- league of the week (most new teams in 7 days), milestones (users, teams,
  new country / league live).

**Posts only celebrate** (owner, 15. 10.): no price fallers, no "captain fail", no bad performances; humour is about Sunday-league life in general, never a named person.

**Never in a post:** players from U19 leagues (`je_mladinski_slug`),
anonymised players (`anonimiziran_at`), users' names or teams, anything not
in the fact set. Austrian data only as allowed by ÖFB (facts from match
reports are fine).

## Pipeline

1. **Facts** — `objava_dejstva(drzava, od, do)` (SECURITY DEFINER, service only).
2. **Caption** — Claude (`claude-sonnet-5-5`, Messages API) with a system
   prompt: goofy, short, in English, hashtags, link slff.eu (with
   `?src=ig`), may use ONLY the given facts. Afterwards every number and name
   in the caption is checked against the facts; mismatch → regenerate once,
   then fall back to a plain template caption.
3. **Slides** — internal route (e.g. `/objava/:id?slide=n`, noindex, not in
   sitemap) renders 1080×1350 cards in SLFF style from the stored fact set;
   Playwright screenshots them to PNG. Formats: single image, 3–5 slide
   carousel; phase 3: 9:16 video slideshow (ffmpeg, no music).
4. **Draft** — row in `objave` (slot, country, language, facts jsonb, caption,
   media paths, status `osnutek` → `odobreno`/`ustavljeno` → `objavljeno` /
   `napaka`, scheduled_at, stop token sha256). Images in storage.
5. **Discord** — draft posted ~6 h before scheduled time to a Discord webhook
   (images + caption + facts summary) with a one-time "⛔ Ustavi objavo" link
   (edge function / RPC with token, like `prevzem` tokens). No bot needed.
6. **Publish (phase 2)** — at scheduled time, if not stopped: Instagram Graph
   API (single / carousel container → publish), Facebook Page API (photo /
   multi-photo post). Success → Discord message with permalinks.

## Phase 2: publishing (built 15. 10. 2026)

- **Images**: slides are JPEG (Instagram accepts only JPEG), in
  `/opt/slff-objave/mediji/<week>-<slot>-<random>/n.jpg`, served read-only by
  Caddy at `https://slff.eu/objave-mediji/…` (no listing, `noindex`). Meta
  fetches them by URL.
- **Stop link**: the worker makes a 256-bit token per draft and stores only its
  sha256 (`ustavi_zeton_hash`). Discord gets
  `https://slff.eu/objava#ustavi=<token>` (in `#`, so never in server logs;
  in `<…>`, so Discord shows no preview). The page shows a button; only the
  click calls `ustavi_objavo(token)` (anon RPC; stops only a draft before its
  time). Chosen over an edge function: no function deploy, CI ships the page.
- **Publisher** (`objaviZapadle`, every loop): drafts with `stanje = 'osnutek'`,
  `discord_at` set and the scheduled time passed by at most 2 h. Claim first
  (`osnutek` → `objavljanje`, conditional update), then Instagram (item
  containers, carousel container, poll `status_code` until `FINISHED`,
  `media_publish`, read `permalink`) and Facebook (each photo to
  `/{page}/photos` with `published=false`, then `/{page}/feed` with
  `attached_media`, read `permalink_url`). Graph API v26.0
  (`META_GRAPH_VERSION`). Success → `objavljeno` + permalinks + Discord;
  failure → `napaka` + Discord, never retried automatically.
- **Env** (`/opt/slff-objave/.env`): `META_PAGE_TOKEN`, `META_PAGE_ID`,
  `META_IG_USER_ID`. Missing → drafts as in phase 1, nothing publishes.

### Owner setup (once)

1. Instagram account → Professional (Business or Creator) and linked to the
   SLFF Facebook page (Instagram settings → Linked accounts, or Page settings →
   Linked accounts).
2. developers.facebook.com → Create app → type Business, use case "Manage
   everything on your Page" + Instagram API with Facebook Login. Add yourself
   as admin; the app can stay in development mode as long as only people with
   a role on the app publish (we only post to our own page).
3. Graph API Explorer → the app → User token with permissions
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, `business_management` →
   Generate, pick the SLFF page and Instagram account.
4. Long-lived user token (60 days):
   `GET https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<app id>&client_secret=<app secret>&fb_exchange_token=<short token>`.
5. Page token from it (does not expire while the user token stays valid and
   the user keeps the page role):
   `GET https://graph.facebook.com/v26.0/me/accounts?access_token=<long user token>`
   → `access_token` and `id` of the SLFF page = `META_PAGE_TOKEN`, `META_PAGE_ID`.
   Check in the Access Token Debugger that "Expires" is "Never".
6. IG user id:
   `GET https://graph.facebook.com/v26.0/<page id>?fields=instagram_business_account&access_token=<page token>`
   → `instagram_business_account.id` = `META_IG_USER_ID`.
7. Put the three into `/opt/slff-objave/.env` (`chmod 600`), copy the Caddyfile
   (`/objave-mediji/*`), redeploy the worker. The next draft's Discord message
   says "objava … če je ne ustaviš" instead of "Meta ni nastavljena".

## Where it runs

Server container `slff-objave` on the SLFF VM (like `slff-posta`), image with
Playwright/Chromium, loop every 10 minutes. Secrets in `/opt/slff-objave/.env`
(service key, `ANTHROPIC_API_KEY`, Discord webhook, later Meta page token) —
never in git or GitHub logs. Deployed manually (`scripts/hetzner/objavi-objave.sh`), CI does not deploy it.

## Phases

1. Facts + captions + slides + Discord draft (no publishing). Dry-run mode
   prints everything locally.
2. Meta app (owner creates, assisted), IG Business/Creator linked to the FB
   page, long-lived page token on the server; publish with veto window.
3. Video / Reels.
4. Later, optional: TikTok (needs TikTok app audit for public posts) and/or
   Postiz at `social.slff.eu` if a calendar UI for manual multi-person posting
   is wanted. Not needed now: Meta Business Suite covers manual IG/FB posts.

## Owner to-dos

- Anthropic API key for the server (phase 1, captions).
- Discord channel + webhook for drafts (or reuse an existing one).
- Phase 2: Instagram → Business/Creator, linked to the Facebook page; Meta
  developer app.
