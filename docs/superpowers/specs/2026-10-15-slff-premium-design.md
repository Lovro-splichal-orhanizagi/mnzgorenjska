# SLFF Premium — design (draft)

Status: **draft for owner review**, nothing built. 15. 10. 2026.

## Why

Idea from the team (Discord, 15. 10.): a player who had a great round 3 wants to
look back at it in round 9 — "bodo kupl, sam da vidjo, kok so bli jaki v 3.
krogu". Nostalgia and bragging, not advantage. Target: young amateur players
(~19–25) who play in the leagues themselves.

## Hard rule: no pay-to-win

Premium never changes the game: no extra points, transfers, budget, cheaper
players, earlier information (lineups, injuries) or visibility of other teams'
squads (teams stay private, CLAUDE.md "Ekipe so zasebne"). Same promise as the
beer and the verified badge. It is written on the purchase card and in
`/legal#placljivo`.

## What's in it (proposal)

| Feature | Free | Premium |
|---|---|---|
| My team in a past round (pitch, points, captain, bench) | current + last **3** rounds | **every round, every season** |
| Round poster (share image) | current round | any past round |
| My season in numbers: best round, captain hit rate, points left on the bench, transfer gain/loss, rank chart over the season | — | yes |
| Rival view: me vs a mini-league member, round by round (points only, never their squad) | — | yes |
| Ideal XI of past rounds | yes (free, shipped separately) | — |

Today "my team in round N" is free for all rounds (Moja ekipa → Več →
zgodovina). Introducing a window takes something away, so: **existing users
keep full history until the end of the 2026/27 season**, the window applies
to new seasons (or to accounts created after launch — owner to pick).

Later candidates (not v1): custom team kit/colours, profile frame, season
"wrapped" at season end, club premium (AI transfer suggestions for clubs —
separate product, see Discord).

## Price (open — owner)

Options:
- **€2.99 per season** (one-off, simplest, matches "buy a beer" mental price) — recommended
- €0.99/month subscription (more revenue if retained, more churn and support)
- bundled into the verified-player badge (€9.99/yr) as a perk

## How it plugs into what exists

- **Payments**: reuse the verified-player Stripe setup (account SLFF, Stripe
  Checkout, `stripe-webhook`, lookup keys, Stripe Tax, seller Space Guardian).
  New lookup key e.g. `slff_premium_sezona`; the webhook dispatches by
  `metadata.izdelek` (`preverjen` | `premium`). Separate table
  `premium_pravice` (user, season, source `stripe`/`rocno`, status, stripe ids,
  `star_vsaj_18`/`odpoved_pravici`) — same lifecycle functions pattern
  (`…_iz_placila`, refund, dispute) but not mixed with `preverjeni_racuni`.
- **Feature flag** `premium` in `settings`: 0 off, 1 admins + testers, 2 live
  (same as `preverjeni_racuni`).
- **Gating is server-side**: `fantasy_lineups` RLS today lets the owner read
  all own snapshots. New rule: owner reads snapshots of rounds inside the free
  window, or all if `ima_premium(auth.uid(), season)`. Scoring and admin keep
  reading via SECURITY DEFINER as today. Season stats come from a new
  SECURITY DEFINER RPC that checks premium.
- **Mobile apps**: Apple/Google require in-app purchase for digital unlocks
  bought inside the app. v1: purchase **web only**; the app shows locked
  rounds with neutral text and **no link or price** (anti-steering), premium
  bought on the web works in the app. Store review risk to recheck before launch.
- **Legal**: extend `/legal#placljivo` (product, price, no withdrawal right for
  immediately supplied digital content, refunds), all 14 languages. Same open
  items as the badge (share capital, ZDavPR fiscal invoices, lawyer).
- **Age**: buyer 18+ checkbox like the badge; users 16–17 can't buy.

## Phases

1. Flag + manual grant by admin + free window gating + premium history view (no money).
2. Season-in-numbers + rival view.
3. Stripe test mode purchase (reuse functions), legal text.
4. Live (together with or after the verified badge goes live).

## Open questions for the owner

1. Price model (season one-off / monthly / bundle with badge)?
2. Free window: 3 rounds OK? Grandfather existing users for 2026/27?
3. Name: "SLFF Premium", "SLFF Plus", "Legenda"?
4. Launch together with the verified badge (same legal/Stripe go-live) or separately?
