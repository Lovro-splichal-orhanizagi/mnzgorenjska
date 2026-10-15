# Automated social posts (IG + FB) — design

Approved by the owner 15. 10. 2026. Phase 1 is being built; nothing publishes
until phase 2.

## Goal

Two posts per week on the SLFF Instagram and Facebook page, goofy but
factual, generated from our data, with a human veto window.

## Content and schedule

| Slot | Content | Language |
|---|---|---|
| **Monday 10:00** (Ljubljana) | Round recap for **one country** (rotation SI → HR → SK → SI → HR → SK, AT/HU/others occasionally; country picked by users count, skipped if it had no round) | that country's language |
| **Thursday 18:00** | Cross-country goofy stat ("This week in Europe's Sunday leagues …") | English |

Fact candidates (SQL, one function, returns jsonb):
- top scorer of the round (points, goals), Ideal XI of the round (existing
  selection logic: 1 GK, 4 DEF, 4 MID, 2 FWD),
- biggest price riser / faller of the week,
- "captain fail": most-picked captain with ≤ 2 points (aggregate only, never
  a user's team — teams are private),
- goalkeeper with a goal or assist, hat-tricks,
- league of the week (most new teams in 7 days), milestones (users, teams,
  new country / league live).

**Never in a post:** players from U19 leagues (`je_mladinski_slug`),
anonymised players (`anonimiziran_at`), users' names or teams, anything not
in the fact set. Austrian data only as allowed by ÖFB (facts from match
reports are fine).

## Pipeline

1. **Facts** — `objava_dejstva(drzava, od, do)` (SECURITY DEFINER, service only).
2. **Caption** — Claude (`claude-sonnet-5-5`, Messages API) with a system
   prompt: goofy, short, in the target language, hashtags, link slff.eu (with
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
