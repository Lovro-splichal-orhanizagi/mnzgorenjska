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

## Private draft transport boundary (18 October 2026)

The first actual seed staging run `39158858524` could not resolve the draft
through `releases/tags`; bounded authenticated release-list selection fixed that
lookup. The next actual run `39160447076` still failed under the read-only
Actions token. Root approved a narrow permission boundary: only the source-free
`missing-inventory-seed` and `missing-inventory-approval` jobs receive job-level
`contents:write` with `actions:read`, to make the private draft visible. Their
GitHub client still issues GET only. They receive no database credentials and
make no provider request. The draft remains private and its existing assets
are never published or replaced.

For missing inventory, `approval-stage` checks the actual running main workflow,
reserved attempt1 staging job and active `Stage reviewed FCF inventory approval`
step, downloads the exact root asset ID/SHA, validates the fixed current main
approval/plan, and retains the original JSON bytes as `manifest.json`. Its exact
upload step is `Retain reviewed FCF inventory approval`; immutable artifact name
is `fcf-inventory-approval-<runId>-1`, with `overwrite:false`.

Consume, capture, audit and receipt retain `contents:read/actions:read`. They
read no draft release. They use the approval job's actual same-run artifact
ID/digest and manifest SHA through explicit `needs` outputs. The reader verifies
the authenticated run/main/attempt1, unique completed successful staging job,
exact successful stage/upload steps, artifact identity, ZIP length/digest,
closed single-member ZIP and raw manifest SHA. The raw JSON must also match
the separately supplied root draft asset SHA, before the unchanged approval
validator runs. Consumption can poll the protected claim only after this proof;
G1/G9 still require all original claim, seed, consumption and audit checks.

This transport change neither creates nor resets a claim. Root's protected
create-once tag reservation and explicit source execution decision remain
separate. Fixture tests verify the boundary offline; actual Actions token
visibility still requires a source-free staging run after merge. Passing local
tests does not assert that GitHub has exposed the draft to the job token.

## Independent G9 after the held parent (new protocol)

`g9-only-after-held-parent-v1` is an explicit separate protocol. The old
`g1-then-g9-missing-v1` wire and failed-final-receipt refusal remain unchanged.
The old run `39170648473` can supply **accounting only**, never target readiness
or G1 continuation. G1 stays held on report4109404; there is no fifth exclusion.

`scripts/fcf-held-parent-accounting.mjs` reauthenticates the exact old protected
claim, consumption ZIP, G1 diagnostic ZIP, skipped G9 job and inadmissible final
receipt against fixed reviewed run/job/commit/artifact/manifest identities. It
rebuilds the false receipt independently. Historical replay uses the immutable
old completion clock solely to prove actual spent16 and unstarted0. Retention
expiry or source age never refunds those16: already retained root-digest-pinned
ZIPs can still prove accounting, even when their original artifact metadata says
expired. They cannot enter any original source-admission reader.

A separate invisible eligibility capability requires exactly the reviewed content
defect:16 complete HTTP200 nonredirect bodies, last4109404 rawSHA
`1a42a49bd0b55d0bd3a654a6e15b65f430a2c132e28813899205d394f05244dc`.
No different failed parent, refusal, challenge, redirect, partial body or unknown
attempt count can authorize this route. Copies/serialized capability objects
have no authority.

The new fixed plan binds the complete old accounting, original final receipt
SHA/digest, policy/ruleset snapshot, new reviewed capture commit, prior16,
cumulative477, new240 and planned cumulative256. It includes every ID4118349–
4118588 ascending exactly once, including4118352/4118358, and no reused seed.
New plan creation and every later use retain strict24h plan/current-source age
and future-clock checks independently of timeless spent accounting.

The schema3 execution claim binds that new plan and one actual new main run,
attempt1. Its flat protected create-once ref is **keyed by the old parent**:

```text
refs/tags/fcf-inventory-claim/g9-after-e0e902944cec4a3fc479b52bc11243bfeb7ab4dcbe115ee831299456b4d2a28c
```

Changing new plan timestamps, source commits or plan hashes never grants another
reservation. Root creates this ref once using the unchanged active no-update,
no-delete, no-bypass ruleset. The code only prepares a local template and reads
GitHub; it cannot create/reset/retry the claim or dispatch/upload anything.

Source-free root preparation is `prepare-g9-approval --accounting-source <old
source-reference JSON> --source-commit <new reviewed main> --ruleset-id <ID>
--output <new JSON>`, followed by the existing `claim-template` command. The new
approval has exactly `{schemaVersion:2,kind:'fcf-g9-held-parent-approval',sourceCommit,
plan,accounting,rulesetId,rulesetSnapshot}`. `accounting` is the original six-field
source-reference shape (plan/claim/consumption/children/finalReceipt); it carries
both honest old children. Approval staging independently downloads and verifies
that old evidence, and retains the original root-pinned approval JSON bytes.
Only source-free staging keeps `contents:write`; capture has no DB secrets.

The new workflow preset skips G1 and starts G9 only after its own authenticated
approval and consumption. The collector requires the coordinator-issued branded
actual source clearance and anchors45min to its `clearedUTC`, including any
subsequent claim recheck delay. Every complete GET is followed by at least3s,
including the last. Only exact ordered acta GETs use manual redirects; there is
no retry, fallback, HEAD, club/category request or unlisted read. First refusal
or defect stops and retains honest diagnostics. Both freshly fetched historical
markers must still match the original approved raw hashes and exact identities;
dynamic-byte differences hold rather than substituting old source bytes.

The closed writer source-reference union is:

```js
{
  protocol:'g9-only-after-held-parent-v1', accounting:oldSourceReferences,
  plan, claim:{execution,expected}, consumption:expected,
  child:{targetSlug:'es-ct-tercera-g9',inventory:expected,audit:expected},
  finalReceipt:expected,
}
```

`readFcfTargetSourceWire` downloads actual metadata/ZIPs and expands references to
this closed reader transport (plus selected `targetSlug` and current `now`):

```js
{
  protocol:'g9-only-after-held-parent-v1', accounting:oldRawWire,
  plan, claim:actualClaimWire, consumption:actualArtifactBundle,
  child:{targetSlug:'es-ct-tercera-g9',inventory:actualBundle,audit:actualBundle},
  finalReceipt:actualBundle, targetSlug:'es-ct-tercera-g9', now,
}
```

The explicit new branch of `readFcfCapturedTargetEvidence` reauthenticates old
accounting and new claim/consumption/full240 inventory/audit/final receipt. Missing,
failed, partial or unaudited new G9 holds. The full native16-club calendar and
explicit keeper coverage are independently rederived. Only then does it issue
the existing branded target capability. SQL's generic admission kind remains
`fcf-missing-target-admission`; its fingerprint additionally binds this protocol,
`priorSourceGETs:16`, `newSourceGETs:240`, `actualSourceGETs:256` and old accounting.
This never represents256 GETs as having run in the new capture.

All-four genuine cleanup originals remain separate original authorization proof,
with their old exact bytes, receipts and timestamps. Fresh marker bodies must be
byte-identical to those originals, while their new actual source receipts remain
new. The compiler selects this behavior only from authenticated new target data.
CaptureA and writerB remain separate; native mapping/import, full ordinary
pricing, legal15, future R6, locked activation and rollback gates stay unchanged.
The child price preloader reauthenticates the same explicit raw union.

Focused tests label new successful calendars/Actions controls synthetic. Genuine
old accounting and marker validation uses only explicit local
`FCF_HELD_PARENT_WIRE` (V8 serialized raw actual wire) and
`FCF_HISTORICAL_RETAINED_DIR` inputs; public CI skips those private-byte tests.
Passing code tests establishes no actual new G9 availability or production
readiness. Root owns independent review, full CI and any later execution decision.
