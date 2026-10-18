# Trgovina motivi — del 1 (jedro, majice in puloverji, vitrina) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers pick a Sunday-league design for a T-shirt or hoodie, fill its fields and colour scheme, see it live on a realistic product photo, browse made-up example configurations, and buy; the print shop gets a print-ready file.

**Architecture:** New tables `trgovina.motivi`, `trgovina.motivi_izdelki`, `trgovina.cone` and column `izdelki.postopek`; `trgovina.personaliziraj` learns a new personalisation shape `{motiv, polja, shema}` validated per field type in the DB. One SVG template per design in `shop/src/motivi/` is filled by a pure TS renderer used by the live mockup, the showcase, and the admin print export.

**Tech Stack:** PostgreSQL (Supabase), React + TS + Tailwind (`shop/`), SVG, Codex image generation for blank product photos.

**Spec:** `docs/superpowers/specs/2026-10-18-trgovina-motivi-design.md` (and `docs/trgovina.md`, previous personalisation spec `docs/superpowers/specs/2026-10-18-trgovina-personalizacija-design.md`).

## Global Constraints

- Branch `feat/trgovina-motivi` in `/Users/lukazlatecan/Work/SLFF/mnzgorenjska`. Shared local Supabase: apply migrations with `npx supabase migration up --include-all`; never `db reset`, `testno-okolje`, `--linked`; no production writes.
- **New migration** only (`20261018230000_trgovina_motivi.sql`); earlier shop migrations are on production and must not change.
- Every validation (field type, length, allowed characters, `besedilo_dovoljeno()`, number 0–99, year 1950–current, choice list, team ownership not `hisna`, champion via `trgovina.prvaki_uporabnika`, scheme, design active and valid for the product, unknown fields rejected) and every price/surcharge is in the database; the browser only displays.
- Old personalisation shapes (`ime_ekipe`, `poljubno_ime`, `stevilka`, `prvak`, `znacka`) keep working for existing orders and the badge.
- Explicit grants; anon reads only active designs and zones; admin RPCs check `is_admin()`.
- Strings in `shop/src/besede.ts` (sl + en), never in components. Routes are English (`/personalised`).
- Checks before commit: `npm run typecheck`, `npm run smoke:shop`, `npm run test:varnost`; Tailwind content of `shop/` must include `.tsx`.
- No new dependencies (no ZIP, no canvas library): use SVG, `Blob`, `<canvas>` for PNG.
- Design copy celebrates; no offensive defaults; example names are made up (no real people).

---

### Task 1: Database (designs, zones, validation, seeds)
- Migration `20261018230000_trgovina_motivi.sql`:
  - `alter table trgovina.izdelki add column postopek text check (postopek in ('dtf','sublimacija','laser','uv','vezenje'))`.
  - `trgovina.cone(id, izdelek_id → izdelki, kljuc text check (kljuc ~ '^[a-z]+$'), barva text null /* varianta barve, npr. 'Črna'; null = vse */, slika text, koti jsonb /* [[x,y]×4] TL,TR,BR,BL v px fotografije */, sirina_mm int, visina_mm int, unique(izdelek_id, kljuc, barva))`.
  - `trgovina.motivi(id, slug unique check '^[a-z0-9-]+$', ime_sl, ime_en, opis_sl, opis_en, cona text /* kljuc cone */, polja jsonb, sheme jsonb, primeri jsonb default '[]', aktiven bool default false, vrstni_red int)`.
  - `trgovina.motivi_izdelki(motiv_id, izdelek_id, doplacilo int >= 0, primary key (motiv_id, izdelek_id))`.
  - Field shape in `polja` (array): `{"kljuc":"ime","vrsta":"besedilo|stevilka|leto|ekipa|prvak|izbira","oznaka_sl":"…","oznaka_en":"…","max":12,"obvezno":true,"privzeto":"…","moznosti":["…"]}`; `sheme`: `[{"kljuc":"klasika","ime_sl":"…","ime_en":"…","barve":["#hex","#hex","#hex"]}]`; `primeri`: `[{"polja":{…},"shema":"klasika","izdelek":"majica-po-meri","barva":"Črna"}]`.
  - Extend `trgovina.personaliziraj` (find its current signature in `20261018190000_trgovina_personalizacija.sql:186`, `create or replace` with the same signature): when the input object has key `motiv`, validate per the Global Constraints, return the same result shape it returns today (`opis` text for Stripe line description = design name + filled fields; `doplacilo` from `motivi_izdelki`), and store `{motiv, polja, shema}` (team field also stores `fantasy_team_id`; champion field stores the server-built text). Any other shape keeps the existing code path.
  - Public RPCs (security definer, explicit grants): `trgovina_motivi()` (anon: active designs with fields, schemes, examples, products they apply to with surcharges, zones of those products); extend `trgovina_izdelek(slug)` output with `motivi` (active designs valid for the product) and `cone`. Admin: `trgovina_admin_motivi()`, `trgovina_admin_shrani_motiv(jsonb)` (aktiven, vrstni_red, primeri, doplacila).
  - Seeds: carriers `majica-po-meri` (Črna/Bela × S–XXL, 2700, 180 g, postopek dtf, tax `txcd_30011000`, po_narocilu) and `pulover-po-meri` (Črna × S–XXL, 5500, 550 g, dtf); zones for both (`hrbet`, `prsi`; per colour for the shirt) with placeholder `slika`/`koti` that Task 3 replaces; the 6 designs from the spec table (Retro dres, Legenda nedeljske lige, Hangover XI, Kapetan, Kralj kafane, Prvak mini lige) with fields, 3 colour schemes each and 3–4 made-up examples each (made-up names only, e.g. "NOVAK 9 · Gostilna Pri Mici", "FC Pivo Kranj"), surcharge 800 on both carriers, `aktiven = false`. Old personalised shirt/hoodie products stay as they are (inactive).
- Tests in `supabase/tests/varnost.sql` (follow existing trgovina test style): unknown field, too long text, offensive text, number 100, year 1900, choice not in list, wrong scheme, inactive design, design not valid for product, someone else's team, hisna team, champion for non-champion → rejected; valid design passes and surcharge comes from DB even if the request sends another; anon cannot call admin RPCs; `trgovina_motivi()` hides inactive designs.
- `npm run tipi` if the repo regenerates types for new RPCs used by `shop/` (check how `shop/src/baza.ts` types RPCs; follow it).
- Commit `feat(shop): Sunday-league designs schema and validation`.

### Task 2: Templates and renderer
- `shop/src/motivi/<slug>.svg` for the 6 designs, viewBox in mm of the zone (back 300×400, chest 90×90). Bold Sunday-league typography using fonts the shop already loads (check `shop/index.html` / `index.css`; if a display font is needed add it via Google Fonts link only), arched names, retro stripes, stars, "C" armband, crown for Kralj kafane, trophy for champion. Placeholders: `<text data-polje="ime">`, colour hooks `data-barva="1|2|3"` (fill or stroke). Every design must look good with long (12) and short (3) values: use `textLength`/`lengthAdjust` or font-size steps.
- `shop/src/motivi/index.ts`: manifest `{slug, svg (import ?raw), polja: string[], barve: number}`.
- `shop/src/risba.ts`: `narisiMotiv(slug, polja: Record<string,string|number>, barve: string[]): string` — parses the template, fills text (escaped), sets colours, returns SVG string; `velikostMm(slug)`. Pure, no DOM globals beyond `DOMParser` (smoke runs in Node: use the same approach smoke already uses for SVG or string replace on data attributes — prefer string/regex replace on a well-formed template, so it works in Node).
- Smoke (`shop/smoke.tsx` or its existing structure): every manifest slug has a template with a placeholder for every field of the seeded design and every colour index (parse the seed from the migration file text, as root smoke does for other files), escaping works (`<script>` stays text), long and short values render.
- Commit `feat(shop): SVG design templates and renderer`.

### Task 3: Product photos and zones
- Generate blank carrier photos with Codex (pattern: `printf '%s' "<prompt>" | codex exec --skip-git-repo-check -C <dir> --sandbox workspace-write`; images land in the run dir), square 1:1, straight-on studio shot, even soft light, dark navy backdrop with subtle deep-green glow (same as current shop photos), garment fills ~80 % of frame, perfectly frontal so zones are rectangles: black T-shirt back, black T-shirt front, white T-shirt back, white T-shirt front, black hoodie back, black hoodie front. Review each by eye; regenerate if folds/angle make the print area non-planar.
- Convert to WebP 1600 px, put them in `public/trgovina/nosilci/` (served by the shop build — check `shop/vite.config.js` publicDir; if publicDir is `public/logo`, place them under a path the shop build serves and document it) or upload to the `trgovina` storage bucket under `nosilci/` (choose one, document in `docs/trgovina.md`).
- Measure zone corners on each photo (back: centred upper back; chest: left chest) and update the seeded `cone` rows in a follow-up statement inside the same Task-1 migration file **only if the migration is not yet committed on main**; otherwise add `20261018230100_trgovina_cone.sql`.
- Commit `feat(shop): blank carrier photos and print zones`.

### Task 4: Mockup, configurator, showcase, /personalised
- `shop/src/mockup.tsx`: `<Mockup slika koti motivSvg barvaNosilca />` — absolutely positioned SVG over the photo, perspective from 4 corners (compute `matrix3d` from the quad), blend `multiply` on light garments and `screen` on dark, subtle `feDisplacementMap` driven by the photo (via `<feImage>`), updates on every keystroke; respects `prefers-reduced-motion` (no animation needed).
- Product page (`shop/src/strani/Izdelek.tsx`) for carriers with designs: design picker (thumbnails rendered with `narisiMotiv` + `Mockup`), fields form generated from `polja` (team picker for `ekipa` via existing fantasy_teams query, champion via `trgovina_moji_prvaki`, choices as chips), colour-scheme swatches, front/back toggle, live price (base + surcharge), showcase strip of the design's `primeri` with "Začni s tem" filling the form. Live client-side validation mirrors the DB (length, characters, ranges) only for messages.
- Cart line stores `{motiv, polja, shema}`; line shows design name + fields; no-return checkbox as today.
- New route `/personalised` (`shop/src/strani/Personalizirano.tsx`): grid of all active designs, each showing its examples on the mockup, link to the carrier with the design preselected (`/p/majica-po-meri?motiv=retro-dres`). Catalog (`Katalog.tsx`) gets a "Naredi svojega" band linking there. Caddy/HTML: add `/personalised` to the shop SPA routes if the shop Caddy block lists paths (check `scripts/hetzner/Caddyfile` shop block).
- Strings in `shop/src/besede.ts` sl+en. Smoke: `/personalised` renders, configurator renders with a design, example click fills fields.
- Commit `feat(shop): live mockup configurator and design showcase`.

### Task 5: Print export
- `AdminTisk.tsx`: for `{motiv…}` lines export `narisiMotiv` output at real size (width/height in mm on the root `<svg>`), 3 mm bleed, crop marks, and a PNG at 300 dpi via `<canvas>`; file name `<oznaka>-<cona>-<postopek>-<n>.svg/png`; CSV gets columns `motiv`, `postopek`, `cona`. Old-shape lines keep today's export.
- Smoke: export for a design line has mm size and bleed.
- Commit `feat(shop): print-ready export for designs`.

### Task 6: Hero photos and launch data
- Generate 3 lifestyle photos without any text on garments (Sunday amateur pitch with a black shirt back hanging on a fence; pub table with a folded hoodie; changing room bench with a white shirt), measure the print zone, and composite real designs with made-up examples using the same renderer in `scripts/trgovina-hero.mjs` (Node + `rsvg-convert`/`magick`, both installed) → WebP; use them on `/personalised` and the catalog band.
- Data (production, after merge and only by the controller): set images/zones, activate the two carriers and 6 designs; deactivate old personalised shirt/hoodie products permanently (keep rows).
- Update `docs/trgovina.md` (designs, zones, how to add a design) and CLAUDE.md shop section (one line).
- Commit `feat(shop): hero photos and docs for designs`.
