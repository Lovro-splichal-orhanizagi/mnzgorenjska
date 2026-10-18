# Trgovina deli 2–3 (personalizacija, značke, boni) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personalised made-to-order products (fantasy team name, custom name/number, mini-league champion, verified-player badge) with a print-batch workflow, plus gift cards and Scout/verified vouchers via Stripe promotion codes.

**Architecture:** Extend schema `trgovina` with personalisation options, per-line personalisation, made-to-order products, print batches and issued vouchers (new migration). `rezerviraj` validates personalisation server-side; `trgovina-nakup` passes it to Stripe as line descriptions and allows promotion codes; the webhook issues gift-card codes and badge orders; admin gets "Za tisk" and "Boni".

**Tech Stack:** PostgreSQL (Supabase), Deno Edge Functions, Stripe REST, React + TS (shop/).

**Spec:** `docs/superpowers/specs/2026-10-18-trgovina-personalizacija-design.md` (and part 1 spec/plan, `docs/trgovina.md`).

## Global Constraints

- Worktree `/Users/lukazlatecan/Work/SLFF/mnzgorenjska-shop2`, branch `trgovina-personalizacija`. Shared local Supabase: `npx supabase migration up --include-all`; never `db reset`, `testno-okolje`, `--linked`; no production.
- **New migration** only (`20261018190000_trgovina_personalizacija.sql`); the part-1 migration is on production and must not change.
- Every validation (ownership, champion, badge eligibility, text filter, number range, surcharges) is in the database; the browser only displays.
- Explicit grants; anon never sees other users' data; admin RPCs check `is_admin()`.
- Stripe `metadata.app = slff-shop` on everything the shop creates; never touch other apps' objects except adding `allow_promotion_codes=true` to `scout-placilo` and `preverjen-placilo`.
- Strings in `shop/src/besede.ts` (sl+en) and terms/privacy text updated; `smoke:shop`, `test:varnost`, `typecheck` green; `deno check` the functions (copy to an isolated dir with `{"nodeModulesDir":"none"}` deno.json and `npx -y deno@2 check`).

---

### Task 1: Database
- New migration: `trgovina.izdelki.po_narocilu boolean default false`, `digitalni boolean default false`; `trgovina.personalizacije(id, izdelek_id, vrsta check in (...), doplacilo int >= 0, obvezna bool)`; `trgovina.postavke.personalizacija jsonb`, `doplacilo int default 0`, `stanje_tiska text check in ('za_tisk','v_seriji','natisnjeno') null`, `serija_id`; `trgovina.serije(id, created_at, poslana_at, natisnjena_at)`; `trgovina.boni(id, narocilo_id, koda_hash text unique, koda_konec text, znesek int, velja_do, stripe_promocija text, porabljeno_at)`.
- Shared text filter: extract the word check from `varuj_prikazno_ime` into `public.besedilo_dovoljeno(p text) returns boolean` (security definer not needed; immutable list) and use it in both (do not change `varuj_prikazno_ime` behaviour; add a test).
- `rezerviraj`: input lines may carry `personalizacija` object; validate per spec (ime_ekipe ownership incl. not hisna, poljubno_ime 1–12 chars regex + filter, stevilka 0–99, prvak via `trgovina.prvaki_uporabnika(p_user)` (champion of finished season, ≥ 4 human teams, owner), znacka via lifetime verification and no existing `narocila_znack`), compute surcharge from `personalizacije`, skip stock for `po_narocilu`/`digitalni`, require `p_user` for ime_ekipe/prvak/znacka; return per line `opis` (text for Stripe description) and `doplacilo`.
- `iz_placila`: set `stanje_tiska='za_tisk'` on personalised lines; for `znacka` lines insert into `narocila_znack` (reuse its columns: name from `preverjen_ime_znacke`, address from the order, postnina from dostava_kljuc); digital lines need no shipping.
- RPCs: `public.trgovina_moji_prvaki()` (authenticated: eligible champion entries), `trgovina_izdelek` returns `personalizacije`, `po_narocilu`, `digitalni`; admin: `trgovina_admin_za_tisk()`, `trgovina_admin_nova_serija(p_postavke bigint[])`, `trgovina_admin_serija(p_id)`, `trgovina_admin_serija_stanje(p_id, p_stanje)`, `trgovina_admin_boni()`; service: `trgovina_zabelezi_bon(...)`, `trgovina_bon_porabljen(p_promocija text)`.
- Seed (inactive): "Majica z imenom ekipe" (po_narocilu, ime_ekipe +500, stevilka +300 optional), "Majica z imenom in številko" (poljubno_ime +500 required, stevilka +300 optional), "Skodelica z imenom" (poljubno_ime +500), "Majica prvaka mini lige" and "Skodelica prvaka" (prvak, 0), "Značka preverjenega igralca" (znacka, price 500, pismo true), "Darilni bon 20/30/50 €" (digitalni, 3 variants).
- Tests in `varnost.sql` per spec "Testi". Commit `feat(shop): personalisation, print batches and vouchers schema`.

### Task 2: Functions
- `trgovina-nakup`: send personalisation; line `price_data.product_data.description` = `opis`; unit_amount = cena + doplacilo; `allow_promotion_codes=true`; personalised cart requires body flag `brez_odstopa: true` (else 400 `trgovina-odstop`); digital-only cart: no shipping options/address, still card-only.
- Webhook: on paid shop session, for gift-card lines create Stripe coupon (`amount_off`, eur, once, `applies_to[products][0]` = the shop Stripe product id from env `TRGOVINA_STRIPE_IZDELEK` or created by `scripts/stripe-trgovina.sh`) + promotion code (`max_redemptions=1`, `expires_at` +1 year, random code `SLFF-XXXX-XXXX`), record via `trgovina_zabelezi_bon` (hash), mail it (`trgovina-posta` vrsta `bon`); idempotent on retries (look up by order line). On any shop/scout/verified session with `total_details.amount_discount > 0`, mark used promotion codes via `trgovina_bon_porabljen`.
- `scout-placilo`, `preverjen-placilo`: add `allow_promotion_codes=true` only.
- `trgovina-posta`: vrsta `bon` (code, amount, validity, one-time use, shop link) sl/en; confirmation mail lists personalisation text and delivery time.
- `scripts/stripe-trgovina.sh`: also ensure a Stripe product "SLFF Trgovina" (metadata app=slff-shop) and print its id.
- Commit `feat(shop): personalised checkout, gift-card issuing, promotion codes`.

### Task 3: Shop pages
- Product page: personalisation form per option (team picker from `fantasy_teams` of the user via existing RLS-safe query or a new RPC `trgovina_moje_ekipe()`; free text with live validation mirror; number), live preview overlay on the product image, price with surcharges; champion and badge buttons enabled only when eligible (`trgovina_moji_prvaki`, badge eligibility RPC), otherwise an explanation; digital products (gift cards) show "delivered by email".
- Cart: personalisation shown per line; "personalised items cannot be returned" checkbox required when present; promo-code note ("enter code at payment").
- Terms update (no withdrawal for personalised, production time, gift cards rules); privacy (#trgovina) add personalisation text in all languages that have the legal page (`src/i18n/*/racun.ts`).
- Smoke updates. Commit `feat(shop): personalisation UI, gift cards, terms`.

### Task 4: Admin
- "Za tisk": list `za_tisk` lines, select → new batch; batch view with export ZIP (client-side: CSV + one SVG per line with text in brand font, plus PNG via canvas) and buttons "Poslano tiskarni", "Natisnjeno" (moves lines; packing list shows order only when all its lines are printed or stock items).
- "Boni": list issued gift cards (last 4, amount, valid until, used), and a form to create Scout/verified vouchers (calls a small admin Edge Function `trgovina-boni` that creates Stripe coupon + promotion code with `applies_to` Scout or verified product ids looked up by lookup_key/metadata; admin JWT check via RPC).
- Commit `feat(shop): print batches and vouchers admin`.
