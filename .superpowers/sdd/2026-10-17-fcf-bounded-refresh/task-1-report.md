# Task 1 report — bounded FCF cache refresh

Implemented in isolated worktree `/private/tmp/slff-fcf-refresh`, branch `codex/fcf-bounded-refresh`, starting at `f2874cf` (main `5e58606` plus committed design/plan). Task 2 production rollout remains with root.

## Change

- New `scripts/osvezi-fcf-predpomnilnik.mjs`: repository Actions/same-checkout gate; real competition SELECT plus read-only `sezona_lige` RPC; exactly 27 upper ES/FCF inactive groups and reviewed slug/block mapping. Both the expected block season **2026/27** and Ljubljana clock-current season must match. An unchanged old block is refused after July 2027 until reviewed code updates it.
- Accepts 1–8 distinct comma-separated `esID` values, wholly within that group's exact configured block. Rejects archive, single-report, disabled-current and both override modes. Entire semantic and filesystem validation completes before first unlink. Every ancestor is checked even for missing targets. Only exact regular `acta-ID.html` files may be removed; symlinks/nonregular files are refused; missing files are safe no-ops.
- Audit is written before deletion, during deletion and at completion/error. It retains canonical selected IDs on target-validation errors and old selected-body SHA256/mtime on eviction, without credentials. Other cache bodies and mtimes remain unchanged.
- Existing manual workflow gets optional `fcf_osvezi`. Existing wait, cache restore and league existence check precede helper; helper precedes all existing source/data mutators. Normal importer/parser/refusal/rate/positions/prices/readiness are unchanged.
- Explicit refresh restores uppercase ES nightly/country keys before slug/lowercase fallbacks, without global foreign-country fallback. No-input restore and existing always-save manual cache behavior remain unchanged.
- Only explicit successful main refresh with successful helper/current import/readiness saves the same complete cache under `zapisniki-ES-k1od1-RUN_ID-ATTEMPT`. No file timestamp fabrication. Failure/cancellation/branch/ordinary/skipped-step cases do not promote. Audit upload runs on error.
- Added standalone CI test step and existing Spain source documentation, explicitly explaining that eight limits evictions, while the ordinary import may read the whole block.

## RED evidence

1. Before helper/workflow implementation: `node --test scripts/test-osvezi-fcf-predpomnilnik.mjs` produced **34 tests, 0 pass, 34 fail**. First observable failure: `bounded refresh helper must exist`; workflow tests separately failed on missing refresh ordering, wrong legacy restore priority and missing promotion.
2. After implementation, restored only `.github/workflows/uvoz-lige.yml` temporarily from `git show HEAD:.github/workflows/uvoz-lige.yml`, ran actual-path tests with `node --test --test-name-pattern='actual workflow path|explicit restore|promotion is|actual workflow env' scripts/test-osvezi-fcf-predpomnilnik.mjs`, and restored edited workflow in `finally`. **Exit 1, 8 tests, 0 pass, 8 fail**: actual wait/helper ordering, ES cache priority, exact success/main promotion, and each archive/single-report/disabled-current/club-override/active-override gate. This replay exercises previous workflow behavior, not just a missing module.
3. Failure-audit regression added before its fix: `node --test --test-name-pattern='failed target metadata validation' scripts/test-osvezi-fcf-predpomnilnik.mjs` exited 1 because actual audit selected IDs were `[]` rather than `['es4106977']`; fixed by parsing/storing canonical selection before target validation.

Local logs: `/tmp/fcf-refresh-red.log`, `/tmp/fcf-refresh-workflow-red.log`, `/tmp/fcf-refresh-audit-red.log`.

## Verification

- `node --test scripts/test-osvezi-fcf-predpomnilnik.mjs`: **42/42 pass**. Cases include a one-day-old future page retained by the seven-day TTL; selected removal with authentic old SHA/mtime; untouched other/foreign cache bytes and mtimes; eight/missing targets; active/country/source/scope/season/future-season/block/bounds/duplicate/malformed/count/mode/Actions/checkout rejection; symlink/directory/missing-ancestor cases; actual metadata read with season RPC; failure audit; actual workflow shell conditions and job env mapped into the real helper core on temporary filesystem fixtures; no mutation after failed wait/helper; explicit/main/success-only promotion and cancellation/skipped-step rejection.
- `node --test scripts/test-cakaj-na-uvoze.mjs scripts/test-vklop-katalonije.mjs`: **55/55 pass**.
- Combined helper + coordinator + activation: **97/97 pass** (final rerun after audit refinement).
- `VITE_SUPABASE_URL=https://primer.supabase.co VITE_SUPABASE_ANON_KEY=sb_publishable_ci_ni_pravi_kljuc npm run smoke`: **284/284 source tests pass**, render/rules smoke ends **VSE OK**. No provider/DB writes.
- `npm run build`: **exit 0**, includes `tsc --noEmit`; Vite built successfully. Only existing npm config/plugin timing notices.
- `node --check scripts/osvezi-fcf-predpomnilnik.mjs`: **exit 0**.
- Ruby standard YAML parsed `.github/workflows/uvoz-lige.yml` and `.github/workflows/ci.yml`, each with a jobs mapping: **YAML OK**. Python PyYAML was absent; no dependency installed to parse YAML.
- `git diff --check`: **exit 0**.
- Imported actual DFB `sourceFiles` and executed `git diff --exit-code 5e58606 -- ...sourceFiles`: **exit 0**, byte-identical. Actual `parserSha256()` remains `ef06a3ef205d82900b228a33b6ee1d5b60c7ad3eafc7fc5d31daba842c40e754`.

`npm test` was attempted with explicitly loopback URL and all key variables removed. It stopped before DB access: `Manjka javni ali SUPABASE_SERVICE_ROLE_KEY ključ (okolje ali .env).` The DB-backed E2E suite requires local test credentials/data; no keys were acquired and no database was reset. Root owns fresh-database CI. Logs: `/tmp/fcf-refresh-npm-test.log`, `...-final-focused.log`, `...-final-combined.log`, `...-smoke.log`, `...-build.log`.

## Limits and handoff

No production keys, database writes, provider HTTP, Actions dispatch, emails, migrations, parser edits, scoring/price-policy edits, active-league changes or DFB source fingerprint changes were performed. Root must independently review, run same-HEAD CI, merge/deploy, then execute controlled main imports and a separately prepared/reviewed activation manifest. The helper's 2026/27 freeze intentionally requires review for a future season. Existing coordinated Actions writers provide serialization; this change does not create a new atomic DB guard against uncoordinated external writers.
