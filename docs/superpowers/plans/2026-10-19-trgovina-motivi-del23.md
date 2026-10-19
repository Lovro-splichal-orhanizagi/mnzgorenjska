# Trgovina motivi — dela 2 in 3 (pub, stena, šal, kapa, trak) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the live design configurator (part 1, on production) with the pub, wall and accessory range: beer glass, beer mug, beer mats ×6, bottle opener, **"my line-up" poster** A3/A2, retro match poster, player card, pennant, satin scarf, cap, captain's armband — each with Sunday-league designs, live mockups, examples and print-ready export.

**Architecture:** Same engine as part 1 (`trgovina.motivi`, `motivi_izdelki`, `cone`, `trgovina.personaliziraj_motiv`, `shop/src/risba.ts`, `shop/src/mockup.tsx`, configurator, admin Motivi, print export). New: carriers with their own `postopek`, a field type `postava` (server snapshots the buyer's last locked fantasy line-up into the order line), design templates per carrier, mockup support for curved/angled zones, laser (one-colour) and embroidery (≤ 4 colours, no gradients) output rules.

**Tech Stack:** PostgreSQL (Supabase), React + TS + Tailwind (`shop/`), SVG, Codex image generation.

**Spec:** `docs/superpowers/specs/2026-10-18-trgovina-motivi-design.md` (sections "Del 2", "Del 3", "Plakat moje postave", "Cene"); part 1 plan `docs/superpowers/plans/2026-10-18-trgovina-motivi-del1.md`; `docs/trgovina.md` "Motivi".

## Global Constraints

- Branch `feat/trgovina-motivi-del23` in `/Users/lukazlatecan/Work/SLFF/mnzgorenjska`. Shared local Supabase; never `db reset`, `testno-okolje`, `--linked`; no production writes.
- **One new migration** `20261019160000_trgovina_motivi_del23.sql` (edit in place until merged). **Before merge the controller re-checks that its timestamp sorts after the newest migration on `origin/main`** (teammates push migrations often; CI refuses earlier or duplicate versions).
- All validation and prices in the DB, as part 1. Old shapes and part-1 designs keep working unchanged.
- Everything seeded **inactive**; the controller activates after deploy.
- Prices (cents, VAT incl.) from the spec: kozarec 1200 + 600, vrč 1800 + 600, podstavki ×6 1500 (design included, surcharge 0), odpirač 900 + 400, plakat A3 1900 / A2 2900 (surcharge 0), kartica igralca 900 (0), zastavica 1500 (0), satenast šal 2500 (0), kapa 2400 + 600, kapetanski trak 1200 (0).
- Methods: glass/mug/opener `laser` (one colour, no fills that cannot be engraved: designs must be line/solid art), beer mats/pennant/scarf `sublimacija`, posters/card `uv` (print), cap `vezenje` (max 4 thread colours, min stroke 1 mm, text ≥ 5 mm high), armband `sublimacija`.
- **Youth rule**: no beer/pub-themed design (glass, mug, mats, opener, Hangover-like slogans) can use a youth-league team; the line-up poster never for youth leagues (`je_mladinska_liga`); anonymised players appear as "Igralec".
- Strings in `shop/src/besede.ts` sl + en. Copy celebrates; slogans fun, never insulting; made-up example names only.
- Checks before every commit: `npm run typecheck`, `npm run smoke:shop` (VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=x), `npm run test:varnost`, `npm run build:shop`.
- Agents commit only their own paths (`git commit -m … -- <paths>`); never `git add -A`, never stash.
- New tables/columns with personal data → add to `agent.zaprte_tabele` / `agent.zaprti_stolpci` in the same migration (docs/agenti-baza.md).

---

### Task 1: Database
- Carriers (po_narocilu, postopek, tax codes as part 1 conventions, weights): `kozarec-po-meri` (0,5 l), `vrc-po-meri` (0,5 l), `podstavki-po-meri` (komplet 6, pismo false), `odpirac-po-meri`, `plakat-po-meri` (variants A3, A2), `kartica-igralca` (A5), `zastavica-po-meri`, `sal-po-meri`, `kapa-po-meri` (črna, bela/črna), `trak-po-meri`. Zones per carrier with placeholder photos/corners (Task 3 replaces) and real print sizes in mm (glass wrap area ~ 70×90, mug 200×90 wrap, mat Ø95 ×6 sheet, opener 50×15, poster A3 297×420 / A2 420×594 (zone per variant via `barva`-like variant key — add `cone.razlicica` nullable if needed), card 148×210, pennant triangle 300×450, scarf 1400×180, cap front 100×50, armband 300×80).
- New field type `postava`: value = one of the buyer's own fantasy team ids (non-hisna, **not youth league**); `personaliziraj_motiv` stores a snapshot in the order line: team name, league name, round number, formation, 11 starters (name — anonymised as "Igralec" — position, club short name, points in that round, captain/vice flags) + bench, team round total; from the **last locked round** in `fantasy_lineups`. Error if the team has no locked round. Expose `public.trgovina_moja_postava(p_team_id bigint)` (authenticated, owner only, same rules) for the live preview.
- Designs (seed, 3 schemes each where colour applies, 3–4 made-up examples each, inactive):
  - Kozarec/vrč (laser): "Tretji polčas" (ime + slogan izbira), "Ekipni kozarec" (ime ekipe + leto ustanovitve).
  - Podstavki ×6: "Kafanski komplet" (ime ekipe + 6 sloganov from izbira lists, one per mat).
  - Odpirač (laser): "Ime in številka".
  - Plakat: "Moja postava" (postava field; scheme), "Retro plakat tekme" (domači, gostje, rezultat, datum, igrišče), "Sezona v številkah" optional only if cheap — skip otherwise.
  - Kartica igralca: "Kartica legende" (ime, pozicija izbira GK/DEF/MID/FWD, ocene 1–99 for 4 stats via stevilka fields, klub besedilo).
  - Zastavica: "Klubska zastavica" (ime ekipe, leto, shema).
  - Šal: "Navijaški šal" (ime ekipe + slogan izbira).
  - Kapa (vezenje): "Vezena ekipa" (ime ekipe ≤ 12, številka optional).
  - Trak: "Kapetanski trak" (ime ≤ 12).
- Tests in `varnost.sql`: postava for foreign team / hisna / youth league / no locked round rejected; snapshot stored and stable when lineup changes later; anonymised player stored as "Igralec"; youth team rejected on pub designs; surcharges from DB; inactive by default; trgovina_moja_postava owner-only.
- Commit `feat(shop): pub, wall and accessory designs schema`.

### Task 2: Templates
- `shop/src/motivi/<slug>.svg` (+ zone variants) for every Task-1 design; renderer extensions:
  - `postava` rendering: formation layout (4-4-2, 3-5-2 … from snapshot), 11 player "shirts/cards" with name, club, points, captain armband, bench row, team name, league, round, total — must look like a premium framed poster, not a table.
  - Laser designs: single colour (render in one colour; preview uses an engraved look in Task 4), no thin hairlines < 0.3 mm.
  - Embroidery: ≤ 4 colours, strokes ≥ 1 mm, text ≥ 5 mm.
  - Beer mats: one template rendered 6× (one slogan each) and a print sheet layout.
  - Scarf: long band with tiling stripes, name centred both ends readable.
- Visual contact sheet with long/short values and all schemes; look at it; iterate until genuinely good. Smoke: manifest ↔ seed, escaping, sizes, colour limits for laser/embroidery.
- Commit `feat(shop): templates for pub, wall and accessory designs`.

### Task 3: Carrier photos and zones
- Codex image generation (pattern in part-1 Task 3 report, same dark navy/green studio look): blank glass, blank mug, set of blank mats, blank opener, blank poster in a black frame on a wall, blank card, blank pennant, blank scarf laid flat, blank cap front, blank armband. Look at each, regenerate bad ones.
- Measure zones (4 corners; curved surfaces: glass and mug use the visible front face; mockup may need a cylinder warp — implement in Task 4 if needed, record parameters here). Update zone seeds in the Task-1 migration in place. Contact sheet of every design on its carrier.
- Commit `feat(shop): carrier photos and zones for pub, wall and accessories`.

### Task 4: Configurator and showcase
- Field UI for `postava` (pick own team, live preview via `trgovina_moja_postava`; logged-out and youth/no-round explanations), per-mat slogan pickers, rating sliders/number inputs, variant (A3/A2) price switch.
- Mockup: engraved look for laser (subtle etched white/translucent on glass, darker engraving on metal), embroidery look (slight thread texture/emboss), cylinder warp for glass/mug if Task 3 says so, poster in frame with glass reflection.
- `/personalised` groups by category (Majice in puloverji · Pub in tekma · Stena in darila · Šal, kapa, trak) with anchors; catalog band copy updated; product cards for new carriers.
- Smoke additions; screenshots at desktop and phone with local activation (revert after).
- Commit `feat(shop): configurator for pub, wall and accessory designs`.

### Task 5: Print export and docs
- Export per method: laser = black-only vector SVG (no fills that cannot be engraved) + PNG; embroidery = SVG with ≤ 4 flat colours and a colour list in CSV; posters = real size with 3 mm bleed + crop marks + 300 dpi PNG; mats = 6 individual files + one sheet; scarf = full band.
- `docs/trgovina.md` "Motivi" updated (new carriers, methods, line-up poster snapshot), hero/catalog images for 3–4 new carriers via `scripts/trgovina-hero.mjs` if cheap (one lifestyle scene: pub table with glass + mats; wall with framed poster).
- Commit `feat(shop): print export for pub, wall and accessory designs`.
