# FCF v2 rollout design review response

Design-only revision of `12ca6c30767add96421deeb36a0954e756ecd658` for the independent review in `rollout/spain/v2-writer-design-independent-review.md`. This report describes author corrections; it does not claim fresh reviewer approval or runtime readiness.

## Important1: source reservation versus DB execution

Verified the approved missing-inventory spec's pre-GET consumption contract: create-only reservation consumes the one shared source plan/claim even with zero GETs; G1 and G9 authenticate the same consumption artifact; final receipt binds it. The former refusal of an already-consumed claim and question about resetting it for G9 were wrong and have been removed.

The revised spec now requires that authentic already-consumed source reservation and permits repeated authentication of the same immutable final inventory/audit/receipt for DB stages while normal freshness passes. Every process obtains its own selected-child admission; G1 child evidence cannot stand in for G9. No source GET, budget reset, new claim or partial-proof promotion is introduced. A fully diagnosed later G9 failure can preserve a genuinely complete audited G1 only under existing final-receipt rules. Task5's exact branded extraction API remains pending; its source lifecycle is already fixed.

Per-target DB state is keyed by selected target plus parent plan and actual selected inventory/audit artifact identities. Import/price/check/activation depend on matching SQL receipts and fresh gates, not an unconsumed source claim. Exact duplicate import is readback-only no-op when actual committed state matches, otherwise refusal. Proven rollback permits an explicit fresh-validated same-evidence DB retry; uncertain result requires private receipt/state readback first. Already committed activation is read back without a second activation or an inactive/zero-user mutation check. G1 activity does not consume G9 authority.

Plan Tasks1/3/5/6/7 now name acceptance cases for shared consumed parent→own G1/G9 admission, G1 import→price→check→activation without reset, later G9 after G1 users, cross-child impersonation rejection, duplicate/failed/indeterminate DB execution, and continued source-attempt/partial/refused/stale-proof rejection.

## Important2: bootstrap missing native team bindings

Read the actual common binding file: eight FCF tuples, backed by reports4109388(two),4116215(two),4118352(two),4118358(two). They cover two G1/two G2/four G9 teams, leaving14 G1 and12 G9 for target bootstrap. The revised design no longer requires preinstalled full16 private bindings before they can be derived or imported.

New pure mapping derivation consumes actual authenticated current source club/category IDs/names, fresh exact canonical target calendar participants and fixture sides. Only existing entity/whitespace decoding is permitted; no invented absent-source native ID, name-only/fuzzy alias, shirt match or ordinal-round guess. Unique canonical team resolution plus the full240-fixture/30-round/16-team bijection proves each new mapping. Existing exception tuples anchor their sides and remain unchanged. Missing/conflicting actual identity or non-bijection still HOLDs.

An actual authenticated mapping proposal binds source artifact/receipt identities, fresh team/fixture projection, all16 mappings and240 resolved sides. Root pins its exact reviewed SHA/artifact identity. Lifecycle is admission→derive/review uninstalled mapping→non-mutating prepare/prepared replay→existing all4 cleanup→fresh applied replay→atomic mapping installation/import→full16 private binding/readiness gate. Recheck proposal under locks before installation; install and import/canonical verification roll back together. This preserves all eight common tuples and four historical DB match IDs/markers without expanding the exception table.

Plan Tasks1/2/3/7 now include bootstrap success with only existing2 G1/4 G9 anchors, changed side/anchor conflict/category collision/missing anchor/non-bijection failures, absent private tuples not blocking prepare, atomic bootstrap rollback and same-parent sequential launch rehearsal.

## Prepare clarification and verification

Changed “read-only SQL prepare” to **non-mutating prepare** in its own READ COMMITTED transaction with existing SHARE ROW EXCLUSIVE/FOR UPDATE locks. Explicit BEGIN READ ONLY/ROLLBACK remains solely the separate fresh inventory transaction.

Checked the revised spec/plan against both findings and their acceptance cases; `git diff --check` passes. Only Markdown changed. No runtime suite was run for this documentation-only revision; no implementation, source request, DB operation, dispatch, production mutation, main merge or push occurred. Existing ordinary labeled field-position/pricing pipeline, strict source GK90, exact all4 cleanup, future R6, SQL210200, G13/catalog safeguards and closed legacy execution remain unchanged. Fresh root-owned design review is required before code.
