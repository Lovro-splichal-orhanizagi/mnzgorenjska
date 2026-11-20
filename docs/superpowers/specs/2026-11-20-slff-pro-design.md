# SLFF Pro: paid tier for fantasy managers

Status: v1 built behind the setting `slff_pro` (0 in production). Owner request 20. 11. 2026:
"Spec and build behind a flag." Nothing user-visible changes until the owner sets the flag.

## Goal

A first recurring revenue line from the people who already play every week, without
touching the game. 13,094 users, ~2,200 weekly active, ~8,000 managers with a team;
revenue in the last 30 days ~€10 (verified badge, price reviews). Pro should be the
obvious thing a committed manager buys, and it should cost almost nothing to run.

## Who pays

Managers (fantasy team owners), adults. Not clubs (SLFF Club) and not real players
(verified badge). The buyer confirms they are 18+ at checkout, like the verified badge.

## Prices (data, not code)

Prices live in Stripe and are found by `lookup_key`; the code only knows the keys.
The `/pro` page reads amounts from Stripe (`pro-placilo` `{"akcija":"cene"}`), so a
price change is a new Stripe price with the same lookup key (transfer the key), no deploy.

| lookup key | test mode (created 20. 11.) | type |
|---|---|---|
| `slff_pro_sezona` | €14.99, `price_1UdtmxAyq9b6ncJ0z6eysvYR` | one-time, valid 365 days |
| `slff_pro_mesec` | €2.99/month, `price_1UdtmyAyq9b6ncJ0PHWcrC6h` | subscription |

Product `prod_VfEFGdd5z3tL5W` "SLFF Pro", tax code `txcd_10000000` (electronically
supplied services), prices `tax_behavior=inclusive` (consumer prices include VAT, like
the verified badge). `pro-placilo` refuses a price that is not tax-inclusive.

"Season" = 365 days from payment, not a calendar date: leagues run autumn-spring and
calendar-year (EE, LV, UA) in parallel, so a fixed end date would sell less than a
season to half of them.

## Feature list (additive only)

1. **Pro badge** next to the team name everywhere `ImeEkipe` renders it (standings,
   round winner, mini-leagues, duels, weekly review, national table). Not in youth
   leagues, never on house teams (`hisna`).
2. **Season report** on `/pro`: every own non-house team, every season: points, rank
   among non-house teams of that league and season, round average, best round,
   transfers, penalty points, points-per-round bars.
3. **Two player price reviews per 365 days** at no charge, through the same path as the
   invite voucher (`boni_ponovne_cene.vir = 'pro'`, admin still confirms). The invite
   voucher stays one-off and is used first. A rejected or impossible request returns
   the voucher. Only where `ponovna_cena` itself is on.

Never: extra budget, chips, transfers, points, earlier deadlines, hidden information
from others, ads removal that degrades free users, or anything else that changes
points or standings. Nothing free today becomes Pro (the advisor `SvetovalecEkipe`
stays free as it is; team pages, per-round points, mini-leagues all stay free).

Candidates for v2 (not built): price-change watchlist with push/mail (data exists in
`price_changes`, needs a mail kind and cron), badge opt-out, Pro mini-league themes,
season report as a shareable image (predogledi server).

## Paywall and flag rules

- Setting `slff_pro`: 0 off (default), 1 admins and `testerji`, 2 live.
- One gate: `pro_aktiven(uid)` = flag allows that user AND an `aktiven` row in
  `pro_narocnine` with `velja_do > now()`. At 0 nobody has Pro, including payers.
- Viewer gate `vidi_pro()` decides whether badges are shown at all and whether
  `/pro` offers the purchase.
- Only the service role writes entitlements (`stripe-webhook`, `app=slff-pro`).
  Browser roles have no table rights; `pro_aktiven` is not executable by them.
- **Cancellation is always possible**: `pro_portal_kupec` and the Account section
  work at any flag value for anyone with a Stripe customer.
- Account deletion or a full refund sets the row to `preklican`; a subscription then
  goes into the existing cancellation queue (`preverjen_cakajoci_preklici`).
- Server-side only: every Pro read is an RPC that checks the gate itself.

## App-store stance

Purchase is web only. In the iOS/Android apps (`jeNativno()`) there is no buy button,
no price, no link or text pointing to an outside purchase, and no Stripe portal link
(Apple 3.1.1 / anti-steering, Google Play payments policy). Pro bought on the web works
in the apps (badge, report, vouchers): reader/multiplatform rule 3.1.3(b). Same
approach as the verified badge and beer.

## Legal

- **Seller**: SPACE GUARDIAN d.o.o. (same as verified badge and shop).
- **Withdrawal right**: digital content/service supplied immediately. Before paying the
  buyer ticks "starts immediately, I lose the 14-day withdrawal right" (Art. 16(m)
  Directive 2011/83/EU, ZVPot-1); the note is repeated above the pay button and on the
  invoice (footer for one-time, subscription description for monthly). Both ticks are
  stored (`star_vsaj_18`, `odpoved_pravici`).
- **Age**: 18+ confirmation, like the verified badge. Parental consent for 16–17 is an
  open question (Slovenia: minors can make "ordinary" small purchases, but we have no
  consent flow).
- **VAT**: prices include VAT, Stripe Tax computes the rate by buyer country (OSS for
  EU B2C e-services). Owner to confirm Space Guardian's OSS registration covers this.
- **Terms**: `/legal#placljivo` today describes only the verified badge. Draft Slovenian
  addition for the owner/legal review (not yet on the site):

  > **SLFF Pro.** Neobvezen paket za menedžerje fantasy ekip: značka Pro ob imenu
  > ekipe, sezonsko poročilo in dve ponovni vrednotenji cene igralca na 365 dni. Pro
  > nikoli ne vpliva na točke, denar, prestope ali pravila igre. Sezonski paket stane
  > {cena} enkratno in velja 365 dni od plačila; mesečna naročnina stane {cena} na
  > mesec, se samodejno podaljša in jo lahko kadarkoli odpoveš na strani računa
  > (slff.eu/account); odpoved velja ob koncu plačanega meseca. Vsebina se zagotovi
  > takoj, zato s plačilom izgubiš pravico do odstopa v 14 dneh. Kupiš lahko le, če si
  > star vsaj 18 let.

## Build (v1, this PR)

- Migration `20261120120000_slff_pro.sql`: setting, `pro_narocnine` (FK only to
  `profiles`; FCF guards pin the FK catalog of game tables), `vidi_pro`, `pro_aktiven`,
  `moj_pro`, `pro_ekipe`, `pro_porocilo`, `pro_pripravi_nakup`, `pro_portal_kupec`,
  webhook RPCs, voucher source, cancellation queue, `zabelezi_obisk('pro')`.
- Edge function `pro-placilo` (prices, checkout, portal). Webhook: `stripe-webhook/pro.ts`
  (line-item checks) and `app=slff-pro` branches in `stripe-webhook/index.ts`
  (session, renewal, end, refund/dispute of the one-time payment).
- UI: `/pro` (`Pro.tsx`, lazy, noindex, in Caddy `@zasebne` and `@ni_strani`),
  `ProNaRacunu` on `/account`, `ZnackaPro` through `ImeEkipe`, voucher text in
  `PonovnaCena`. Strings in all 20 languages (`src/i18n/*/pro.ts`).
- Tests: `supabase/tests/varnost.sql` (*SLFF Pro*), smoke `pro stripe:` checks.

## Rollout

1. **Now**: merged with flag 0. Migration applied by CI, `pro-placilo` and the new
   `stripe-webhook` deployed; with the flag off they refuse.
2. **Owner, before flag 1 on production** (production uses the live key):
   create the live product and the two live prices with the same lookup keys and
   `tax_behavior=inclusive`; optionally a portal configuration with
   `metadata[app]=slff-pro` (cancel yes, plan switching no). Check that the live
   webhook endpoint sends the events in the `stripe-webhook` header
   (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted`,
   `charge.refunded`, `charge.dispute.created`); Pro needs no new event.
3. **Flag 1 (December)**: admins and `testerji` buy with a real card, check badge,
   report, vouchers, portal cancel, refund in Stripe. Manual grant for a tester without
   paying: `insert into pro_narocnine (user_id, vir, velja_do) values ('<uid>', 'rocno', now() + interval '30 days');`
4. **Flag 2 (January, with the spring half-season)**: price test on one country first
   (Slovenia): the flag is global, so the test is the price shown, not the feature;
   if the first two weeks convert below 1 %, try the other price point before widening.
   Announce by mail/Pivko only after the legal text is live.

## Metrics

- Target: **3 % of weekly active managers** paying by the end of the spring half
  (~65 of ~2,200), i.e. ~€650–€1,000 per half-season.
- Track: `/pro` visits (`obiski_dnevno`, page `pro`), checkout starts (function logs),
  paid (`pro_narocnine` by `vir`), monthly churn (`stripe_preklic`, subscription end),
  refunds, voucher use (`boni_ponovne_cene.vir = 'pro'`).

## Open questions for the owner

1. Prices: €14.99 season / €2.99 month, or one price only to keep the choice simple?
2. 16–17-year-olds: block (now) or add a parental-consent flow?
3. OSS registration of Space Guardian for B2C e-services: confirmed?
4. Badge opt-out for buyers who don't want to show they paid?
5. Approve the legal text above (and English version) for `/legal#placljivo`.
6. Should Pro also include the verified badge discount or be bundled with it later?
