# FCF captured target admission API

This is the concrete offline API for the reviewed v2 writer. No function below
fetches FCF/GitHub, reads/writes a database, dispatches or creates a claim. Exported
from `scripts/fcf-target-evidence.mjs` (implemented in
`scripts/fcf-missing-inventory-evidence.mjs`).

```js
const targetEvidence = readFcfCapturedTargetEvidence({
  plan, claim, consumption, children, finalReceipt, targetSlug, now,
})
const data = getFcfCapturedTargetData({targetEvidence, targetSlug, now})
const packet = compileFcfTargetReleasePacket({
  targetSlug, sourceCommit: packetExecutionCommit, targetEvidence,
  cleanupEvidence, databaseInventory, now,
})
```

`targetSlug` is exactly `es-ct-segona-g1` or `es-ct-tercera-g9`. `now` is the
actual offline execution clock, never relabeled as a capture clock.

## Closed reauthentication input

`plan` is the unchanged approved477 plan. `claim` has exactly:

```js
{execution, ref, claimCommit, claimBytes, rulesets, expected}
```

These are the existing actual Git metadata/raw bytes accepted by
`readFcfInventoryExecutionClaim`: claimCommit contains `{commit,tree,blob}`;
expected pins are `{claimCommit,claimJsonSha256,rulesetId,planSha256,sourceCommit,
runId,runAttempt}`. The protected tag/commit/JSON and original source execution
must match; `runAttempt` is1. No unconsumed assertion/state is accepted.

`consumption` and `finalReceipt` are actual independently pinned artifact bundles:

```js
{zipBytes, artifact, run, jobs, expected}
// expected, exactly:
{runId,runAttempt,sourceCommit,jobId,artifactId,artifactDigest,manifestSha256,name}
```

The actual source-free consumption upload is **required**. SourceClaimState in
admitted data is always `consumed`: one immutable parent plan/run consumes one
claim, shared by its G1 and dependent G9. Reauthentication/reuse of completed
proofs is permitted; it never reserves another source execution or resets477.

`children` contains exactly two records in G1 then G9 order:

```js
{targetSlug, inventory, audit, unstarted}
```

`inventory` is the bundle above, whose expected additionally has exactly
`planSha256,childPlanSha256`. `audit` is the eight-pin bundle above. For a known
failed capture, inventory uses the actual diagnostic artifact and audit isnull.
For a full child whose offline audit failed, inventory is full and audit isnull;
actual failed-audit job/step metadata must prove that outcome. `unstarted` isnull
when inventory exists. Otherwise inventory/audit arenull and unstarted is exactly
`{run,jobs,expected:{planSha256,jobId}}`, proving the actual skipped capture step.
Unknown attempt accounting holds; it cannot be asserted as zero. No raw document
callback, caller-written successful status, canonical substitute or legacy cache
shape is accepted.

The reader independently reauthenticates both child records and their full audits,
the completed parent final receipt and matching selected target inventory/audit.
A successful G1 plus known later G9 refusal permits G1 only. Selected G9 requires
its completed successful audit and authenticated same-parent G1 continuation.
All actual run/job/step/commit/artifact/manifest identities remain their originals.

## Branded target and authenticated native data

The returned targetEvidence has exactly four frozen fields:

```js
{evidenceKind:'fcf-missing-target-inventory',targetSlug,competition,documents}
```

Only its reader-issued object is accepted by the new compiler branch/getter.
Clones, serialized/reconstructed objects, changed target, staging proofs,
continuation proofs, raw cache-shaped objects and caller verification flags do
not carry that identity. Another process must call the reauthentication reader
again with actual bytes/metadata and independently pinned identities.

`getFcfCapturedTargetData` returns a deeply frozen snapshot:

```js
{evidenceKind,targetSlug,competition,documents,headers,fixtures,
 clubs,verifiedKeeperClubs,binding}
```

Documents are the selected target's exact240 descriptors
`{id,expectedSourceRound,html,receipt,lineage}`. Headers are240 actual native
headers, preserving actual round/date/kickoff/result and home/away
`{sourceClubId,sourceCategoryId,name,href}`. Fixtures are the240 independently
strict-parsed current canonicals, including explicit normal individual facts or
honest pending/historical-unavailable state. Clubs are the exact16 official
`{sourceClubId,sourceCategoryId,name}` pairs, with verified keeper coverage for all.
Header/fixture/native pairings must agree. Writer binding derives from these
native ID/category pairs; it must never guess clubs from global marker anchors,
raw unauthenticated input, a name alias callback or the other child's documents.

Binding has the closed schema1 kind `fcf-missing-target-admission`, selected
scope/capture source commit/plan and child plan SHA, `sourceClaimState:'consumed'`,
maximum477 and actual parent attempt count, claim/consumption/seed/inventory/audit/
final-receipt bindings and current policy hashes. `sourceFingerprintSha256` hashes
that binding (before its own digest) and ordered exact document identity, actual
receipt/raw SHA, true lineage and native header. The v2 packet embeds this binding
as `target.sourceEvidence`, and verification rebuilds it. No invented cache mtime
or new capture timestamp appears.

For already reader-issued matching final proof objects, the smaller API is:

```js
composeFcfCapturedTargetEvidence({inventoryProof,auditProof,targetSlug,now})
```

It applies the same strict current-time/target checks and grants the same brand;
staging/continuation proofs cannot enter it. Both getter and compiler reparse at
current time. Source age, future R6 and known-imported-not-pending checks remain
strict; full all4 cleanup and fresh read-only DB scope remain separate compiler
requirements. Applied cleanup permits already-active/user-bearing non-target G1
when later preparing G9 from the same parent inventory.

## Original capture versus later writer execution

The original inventory source plan/run/job/claim/audit/final-receipt SHA **A** is
never relabeled. `data.binding.sourceCommit` is A; ordinary document lineage
commit is A. Historical marker lineage retains its distinct genuine original
capture SHA `f7efba26…`, source timestamps and immutable bytes. Later reviewed
writer/packet execution main **B** is `compileFcfTargetReleasePacket.sourceCommit`.
The v2 packet retains both: top-level B and `target.sourceEvidence.sourceCommit:A`.

Thus reviewed writer code can reauthenticate and independently reparse the same
completed A artifacts under B, with zero new FCF requests. This is reusable
immutable evidence across prepare/import/price/activation checks, with separate
DB idempotency. An import failure grants no new source claim or source retry.
The existing actual capture-age/R6/plan24h limits still apply: stale evidence
holds rather than getting fresh clocks. The writer must separately pin its
reviewed runtime/source-file fingerprint; this evidence fingerprint does not
pretend old jobs ran new code.

## Test/run boundary

The focused CI Node step explicitly runs inventory, admission and target-reader/
compiler suites without source/DB credentials. Public CI skips only tests marked
as requiring genuine private retained marker originals; synthetic rejection and
protocol/CI registration checks still run. The local retained-original run must
report no skips before review. Passing normal fixtures/metadata remain labeled
synthetic; they establish no real source availability or statistics readiness.

The old61/41 refresh route remains blocked by missing caches. The old pure
cache/audit compiler fixture seam stays available for algorithm regression tests,
with no authenticated reader/writer/executable route. It grants none of the new
native-data capabilities. This stage supplies no activation, prices, archive,
previous-season data or legal15 permission. Root owns any later source staging,
claim, dispatch and production decision after review.
