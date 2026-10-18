# Source-closed FCF current target release

The writer accepts only the reviewed captured-inventory Task5 protocol for G1/783
or G9/797. G2 remains held on its normal source evidence. There is no legacy
cache execution route, new source claim, source GET, fallback or fifth exclusion.
Capture commit A stays in source evidence; the reviewed writer execution commit B
has a separate runtime closure. One consumed source parent can support both targets.

`scripts/uvozi-fcf-cilj.mjs --mode STAGE` runs only in the exact main Actions job,
with its actual running operation step. It authenticates the immutable root
approval artifact and actual GitHub run/job/attempt/ZIP metadata. The approval
pins every input artifact and the full writer runtime/model hashes. All control
plane requests are repository-scoped GitHub GETs. Only the source-free private
draft approval/originals staging jobs have `contents:write`; capture jobs keep
their existing read-only permissions and receive no database secrets.

The root approval is raw UTF8 JSON, independently pinned by its SHA and by the
staging artifact ID/digest/run/attempt. Its exact keys are:

```js
{
  schemaVersion: 1, kind: 'fcf-current-target-rollout-approval',
  sourceCommit: writerCommitB, targetSlug, stage,
  runtimeHashes: fcfTargetWriterHashes(),
  modelSha256: fcfTargetPricingModelSha256(),
  source: {plan, claim: {execution, expected}, consumption, children, finalReceipt},
  originals, cleanup, mapping, previous
}
```

`source.plan` is the unchanged consumed477 plan. `consumption`, `finalReceipt`
and each child `inventory`/`audit` are the exact Task5 expected pins documented in
`fcf-missing-inventory-admission.md`. Both child records remain in G1/G9 order;
known failed/unstarted children retain their honest metadata. The original claim
tag/commit/tree/blob/ruleset and raw claim bytes are fetched independently. Each
artifact uses its own expected run/attempt/commit, never a global shared attempt.

`originals` is the expected all-four staging artifact identity
`{runId,runAttempt,commit,artifactId,artifactDigest}`. It is distinct from the
three-original inventory seed. `cleanup` is null or `{prepare,applied}`, using
the same five expected identity pins for each record. Prepare and apply are
separate dispatches at the same preparation commit; the apply receipt binds the
exact prepare artifact ID/digest and opaque SQL before-image TEXT/SHA. An already
applied receipt is immutable and reusable with later fresh target evidence.

`mapping` is null or `{expected,mappingSha256}`; `previous` is null or
`{stage,expected}`. Writer-record expected pins include the five identity fields
plus the exact previous manifest's `inputs`. Mapping is a separately reviewable
16-club/full240 native bijection. Imported IDs/sides anchor harmless display
renames; genuinely unbound clubs require exact decoded unique canonical identity.
No name/shirt fallback resolves a player. Every normal appearance/goal uses native
registration ID, actual intervals and explicit source goalkeeper roles.

The explicit workflow order is:

1. Pack/stage genuine all4 originals; stage a root-pinned approval for mapping.
2. `target-mapping` derives the reviewable native proposal from authenticated
   source and actual explicit READ ONLY/ROLLBACK inventory, before private binds.
3. `cleanup-prepare` calls the existing non-mutating READ COMMITTED/locked180200
   primitive and retains the complete opaque SQL TEXT/SHA plus all4 originals.
4. `cleanup-apply` replays prepared target proof, invokes the unchanged180200
   atomic126/14 primitive through the232000 service wrapper, and retains actual
   all4 marker readback. The wrapper saves its original SQL result in the same
   transaction, so a failed-retention retry at the preparation commit reads that
   result without applying cleanup again. Zero-user/vote and protected dependency
   guards remain in the unchanged180200 implementation.
5. `target-import` reauthenticates applied cleanup/source/mapping, validates every
   individual row and country privacy key, then atomically installs missing native
   bindings and imports target canonicals through the dedicated232000 primitive.
6. `target-price` runs ordinary inactive position estimates and the existing full
   current-season pricer. The automatic child preloader reauthenticates the raw
   Task5 evidence, requires absent source cache and refuses all unpacketized FCF
   traffic. It exports the unchanged model's full read-only expected price vector,
   verifies a stable actual dependency snapshot and an actual legal15 witness.
7. `target-check` replays the same packet and full SQL gate without activation.
8. `target-activate` repeats the complete locked gate and uses the common private
   same-transaction authorization before active/future-R6 readback and receipt.

The root prepares a new immutable approval for each stage, pinning the completed
previous record. A target's original packet/mapping/import-envelope commit stays
immutable; a later actual price/check/activation record may have its own reviewed
execution commit and runtime closure. Those outer records bind their own actual
run/attempt, while replay retains the original target envelope's provenance.
Workflow modes default to the unchanged cache export. All writer
database reads use the existing localhost5432 SSH tunnel and actual explicit
READ ONLY/ROLLBACK. Mutations call only the bounded HTTPS RPCs. No database key is
present in staging/capture. The writer does not dispatch, upload or create claims.

G1 can activate first and receive users; later G9 uses fresh selected-target DB
inventory with the same source parent and applied all4 receipt. It never repeats
cleanup or requires G1 to stay inactive. G2's normal report is never parsed or
claimed ready by either target. Missing/stale evidence, ambiguous native identity,
protected privacy, source keeper gaps, incomplete caches, raced prices, illegal
or unaffordable squad and a locked/expired/nonfuture R6 all hold the target.
Normal labeled field estimates/admin/community protections stay unchanged.

An ambiguous database response (including proxy5xx) is never retried automatically.
`target-recover` authenticates root approval and reads the private SQL receipt's
original exact envelope/SHA, selected source plan identity and current state only;
the lost first-import artifact is not a prerequisite. It reports
`canonicalVerified:false` and cannot import, clean up, price or activate. A recovered
inactive import can enter a separately approved price stage, which reauthenticates
all fresh source/mapping/cleanup and repeats the complete SQL gate. An unretained
committed result remains held for explicit receipt/state review. Source freshness continues
to follow the original provider rules; reading immutable evidence never refreshes
capture time or grants another GET budget.

The source-free local helper
`--pack-originals /canonical/retained-dir /new/canonical/originals.zip` validates
the pinned genuine four buffers and writes only that ZIP. It cannot reach GitHub,
FCF or the database. Root owns review, staging, dispatch, integration and production.
