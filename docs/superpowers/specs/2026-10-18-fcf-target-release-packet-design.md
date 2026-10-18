# Independently verifiable current-only FCF target packets

Status: design for fresh builder review; no implementation or execution authorized by this document alone. Parent design: `2026-10-18-fcf-reviewed-history-design.md`. Baseline code checkpoint `fe1b2516`; the existing all-three packet is `schemaVersion:1`, `kind:fcf-current-only-release` and remains semantically unchanged.

## Intent and exact scope

The user approved activating whichever of these exact groups passes full validation. A genuine G2 source hold must not prevent a fully verified G1 or G9 release. Introduce a separate, explicitly target-scoped packet and authenticated raw-evidence adapters. Keep the existing atomic exact-four cleanup and future private per-target readiness/activation boundary.

| Target slug | DB ID | Native source block | Target historical markers | Maximum future audit GETs |
|---|---:|---|---|---:|
| `es-ct-segona-g1` | 783 | 4109388–4109627 | 4109388 | 19 |
| `es-ct-tercera-g2` | 790 | 4116188–4116427 | 4116215 | 20 |
| `es-ct-tercera-g9` | 797 | 4118349–4118588 | 4118352,4118358 | 22 |

Every successful target proof contains exactly240 native reports,30 actual source rounds, eight fixtures and all16 native club/category identities in each round,240 distinct directed pairings and continuous exactly-one explicit official GK coverage over0–90 for every complete report on both sides. No previous-season archive is claimed. Keepers, registrations, appearances, goals and calendar fields are derived from existing strict parsers, never caller-supplied canonicals.

Exactly the four existing reviewed historical exceptions remain allowed. G2 Calonge4116202 is not an exception: retained raw SHA `ffe7a5e9dd542b92f2050e7357acf8d16a7f788acef3485ed8d193b2001a87f1` has incoming nominal keeper19641446 paired at89 with outfield20147946 while starter keeper18474386 has no off event. Strict current proof holds this overlap. Ordinary provider75/75 correction remains intact. A G2 target packet must reject that current evidence. G1/G9 target proof must not parse or claim successful current statistics for G2.

## Separate new protocol

Create `scripts/fcf-target-release.mjs` with manifest `schemaVersion:2`, `kind:'fcf-current-target-release'`, and one exact `targetSlug`. It is not a permissive option on the existing all-three compiler. Cross-protocol verification fails even after an attacker rehashes text. Reuse existing pure `proveFcfCurrentReleaseDocument` and `validateFcfCurrentReleaseCalendar`; preserve their strictness. Shared validation helpers may be extracted only with byte-equivalent regression coverage of the existing v1 packet.

`compileFcfTargetReleasePacket({targetSlug,sourceCommit,targetEvidence,cleanupEvidence,databaseInventory,now})` returns `{manifestText,manifestSha256}`. `verifyFcfTargetReleasePacket({...sameInputs,manifestText,manifestSha256,now})` independently rebuilds the same manifest from authenticated raw evidence and compares exact UTF8 text/SHA while retaining the original audit time. Unknown/absent target, more than one target group, foreign source body, missing/duplicate body, stale/future proof, or a known target imported ID becoming pending fails.

Manifest fields are exactly `schemaVersion,kind,targetSlug,sourceCommit,auditedUTC,cleanupBinding,databaseInventory,target`. `target` has the current v1 group canonical shape for only the selected group. `cleanupBinding` is the separate immutable exact-four proof described below. `databaseInventory` records the fresh read-only scope for all three, with target-only current validation. Non-target normal reports/canonicals/readiness fields do not appear in `target` or as successful coverage elsewhere.

Bounds:100MiB authenticated ZIP,192MiB expanded artifact,2MiB each raw source body,8MiB each protocol JSON/SQL-text member,8MiB canonical release manifest. Existing no-BOM/valid-UTF8/challenge checks remain. Native IDs are decimal strings without leading zeros. Report4116314 belongs to its actual header round, not a numeric prefix.

## Immutable all-four cleanup evidence

Every target packet binds the same reviewed cleanup bundle, even though its current proof covers one group. The bundle contains:

- Exact SQL-produced `beforeImageText` and its UTF8 `beforeSha256`, the original preparation main commit and all three immutable policy hashes. Parsing may inspect identity fields; it must never regenerate or normalize the opaque text (including numeric8.10 scale).
- All four genuine original raw documents and original receipts for4109388/4116215/4118352/4118358. Re-run existing exact historical classification for each. Bind URL, raw SHA, bytes, genuine started/captured timestamps, full native fixture/club/category identity and policy hash. No G2 normal source parsing is required for this step.
- The exact database target IDs321646/297199/306164/306171 and original expected126 appearances/14 goals, using the reviewed cleanup contract rather than new deletion authority.
- Authentication identities of the retained prepare artifact and, when already executed, the immutable applied cleanup receipt. The applied receipt binds the same before SHA/main/policies, the successful126/14 removal result, four exact unavailable markers and the returned after SHA. Actual DB marker equality remains a later locked SQL check; an artifact does not replace it.

Prepared cleanup evidence requires a fresh successful prepare artifact and all-three inactive/no-policy inventory; existing SQL `check_and_lock` and exact preimage/zero-user guards still decide whether the one atomic cleanup may run. After cleanup, the successful immutable receipt is reusable; it is not re-prepared or compared to current non-target prices/active status. Original backup text and raw historical receipts remain unchanged and authentic; a later target's fresh inventory/source audit does not relabel their age.

No target can activate before the exact-four cleanup succeeds atomically. No target-specific deletion, subset marker install, replacement competition, source-ID move, fifth exception or bypass of the common upsert is introduced. This checkpoint provides no cleanup or activation RPC/CLI.

## Fresh inventory and sequential targets

Use the existing `method:'explicitBEGIN_READ_ONLY_ROLLBACK'`, genuine `capturedUTC` at most24h old, and all-three exact competition IDs/slugs, source codes, source, calendar flags, policy and native imported-ID arrays. Preserve capture metadata in the packet. Check duplicate/foreign IDs and immutable source identity for all three; do not assert non-target report completeness.

Before cleanup, all three are inactive with null source policy, as required by the current cleanup SQL. Once the authenticated cleanup receipt proves execution, source policy must be the reviewed FCF policy for all three, but only the selected target must be inactive. A non-target may already be active, repriced, have a different first fantasy round or have subsequent user activity. Such later state neither invalidates the immutable cleanup receipt nor satisfies target readiness. The existing cleanup transaction is never rerun after activity begins.

For the target only, every imported normal native ID in its fresh inventory must remain strictly complete, and its exact historical IDs must remain the correct unavailable markers. The first proposed target fantasy round remains R6 with genuine future official kickoffs and a strictly future unlocked deadline. The later SQL gate independently recomputes target canonical equality, keeper evidence, prices, legal15 and deadline under locks; it must not add a non-target inactive/readiness predicate.

## Authenticated raw-evidence adapters

Create `scripts/fcf-target-evidence.mjs`. Its offline readers consume actual ZIP Buffer plus actual GitHub artifact/run/jobs metadata and explicit expected run/commit/artifact ID/digest/cache key or audit plan. They reuse the existing artifact digest verifier and bounded fixed-name ZIP extraction; reject expired, duplicate, wrong-attempt, wrong-workflow/ref/commit/job/step or partial-success artifacts before producing proof. Never accept arbitrary URLs, policy JSON, source bodies in lieu of a ZIP, or caller-written `verified:true` as authentication. No GitHub/network client is added to these pure readers. Future CLI obtains metadata/ZIP through the reviewed authenticated transport and passes explicit expected identities.

### Cache evidence

`readFcfTargetCacheArtifact({targetSlug,zipBytes,artifact,run,jobs,expected,now})` validates the existing exact cache-export workflow/main run and one of the exact reviewed cache keys, with no fallback/save. Authenticate the whole ZIP and fixed720-descriptor manifest; actual members must correspond to found descriptors and hashes, with no foreign member. Missing non-target descriptors are honest missing entries and do not fail a target's source proof; contradictory artifact structure/digests still fail globally.

Require all240 target raw members, original cache mtimes and exact route/group/season/header round identity, retaining null source-capture time. Do not run any non-target header/statistics parser. Source-policy marker replacements must be explicitly supplied by the immutable cleanup originals during composition, not an implicit missing-cache fallback. For this checkpoint the cache reader still requires all240 target cached bodies; relaxing that body inventory would require separate review.

### Fresh audit evidence and composition

`readFcfTargetAuditArtifact({targetSlug,zipBytes,artifact,run,jobs,expected,plan,now})` validates a separate explicit target audit protocol (`schemaVersion:2`, `kind:'fcf-final-target-current-audit'`) with exactly one target. Require successful exact-main target-audit job and retention upload, complete status, exact immutable plan/hash/commit, the complete ordered attempted-ID list, captures matching every attempt, exact original receipt timestamps and each raw body hash/length. Failed/partial/refused captures remain diagnostic and never become target source proof. Ignore stored canonical claims only by independently reparsing and comparing them, not trusting them.

`composeFcfTargetEvidence({targetSlug,cacheProof,auditProof,cleanupEvidence,plan,now})` produces the exact240-document target set: fresh captures replace exactly planned IDs, retained cache supplies exactly planned reuse IDs, and the target's genuine historical originals supply its marker IDs. No source requests, timestamp refresh, extra substitution or fallback. Re-run ordinary source age rules, require fresh actual captures for pending prelaunch/R6 reports, and reject normal strict parsing failure. Neither cache reader nor composition can silently remove Calonge from G2.

The reader's one-target plan wire shape is `schemaVersion:2,kind:'fcf-target-current-audit-plan',targetSlug,sourceCommit,createdUTC,maximumSourceGETs,stopOnRefusal:true,policyId,policySha256,fetch,reuse,planSha256`. Fetch entries bind `id,sourceRound,rawSha256,cacheMtimeUTC,lineage`; reuse entries bind `id,kind,rawSha256,cacheMtimeUTC,lineage` for retained cache or the exact immutable historical descriptor. Fetch/reuse partition exactly the target's240 native IDs; no marker is fetched; exactly eight verified actual R6 headers are fetched; each fetch round is1–6 and the per-target limit is19/20/22. Plan SHA uses the existing sorted-key policy hash algorithm excluding its own hash field, and must equal the explicitly expected root-reviewed SHA. Reader/composer validate this closed wire shape and match it to actual cache headers/lineage and fresh target inventory. This checkpoint supplies validation, not a plan builder or permission to execute a supplied plan.

The target audit protocol/job does not exist in the current workflow; adding a pure reader does not enable that workflow mode. Implementing/enabling a collector, source CLI or workflow requires the later reviewed fixed inventory and root authorization.

### Cleanup artifact evidence

`readFcfCleanupEvidence({prepareZipBytes,prepareMetadata,appliedZipBytes,appliedMetadata,expected,originals,now})` verifies exact expected authenticated prepare and optional applied artifact identities, immutable before-image text/SHA/main/policy/target binding and all four originals. Before-image JSON text is read as an opaque member, not parsed and reserialized. Prepare/applied manifest/file protocol names and successful job/step names are constants, not inputs. This pure reader may be tested against synthetic authenticated metadata but cannot claim a real successful cleanup artifact exists before the separately reviewed Actions writer creates it.

Reserved artifact protocols for the later writer (reader implementation does not create or enable them):

| Record | Manifest kind / schema | Exact ZIP members | Exact job / required successful steps | Artifact name |
|---|---|---|---|---|
| Prepare | `fcf-exact-four-cleanup-prepared` /1 | `manifest.json`, `before-image.json`, the four `acta-<id>.html` originals | `cleanup-prepare` / `Prepare exact four FCF cleanup before-image`, `Retain exact FCF cleanup before-image` | `fcf-history-cleanup-prepared-<runId>-<attempt>` |
| Applied | `fcf-exact-four-cleanup-applied` /1 | `manifest.json` | `cleanup-apply` / `Apply exact four FCF cleanup`, `Retain exact FCF cleanup receipt` | `fcf-history-cleanup-applied-<runId>-<attempt>` |
| Target audit | `fcf-final-target-current-audit` /2 | `manifest.json` and exactly the plan's `acta-<id>.html` captures | `target-audit` / `Capture exact target FCF audit`, `Retain authenticated target FCF audit` | `fcf-history-target-audit-<targetSlug>-<runId>-<attempt>` |

Each artifact independently binds its own explicitly expected successful workflow_dispatch/main run, job, steps and run attempt in the dedicated history workflow. Equality of run/attempt applies within that record, never across unrelated records. Prepare and apply may be separate dispatch runs, linked by the exact prepare artifact ID/digest and the same pinned preparation commit. A target audit may use another explicitly expected run/attempt and newer expected main commit while retaining the original cleanup commit unchanged. Expected IDs/digests/commits are explicit transport inputs. Prepare manifest carries `schemaVersion,kind,sourceCommit,capturedUTC,execution,beforeSha256,policyHashes,originals`; originals are the four exact receipt/fixture descriptors. Applied manifest carries `schemaVersion,kind,sourceCommit,execution,prepareArtifactId,prepareArtifactDigest,beforeSha256,policyHashes,result,markers`; result is the exact cleanup RPC result and markers are all four verified common installed-marker records. Audit manifest carries the retention sink fields plus exact `targetSlug`; canonical claims are independently reproduced. No arbitrary successful step or caller-supplied phase substitutes for these constants.

`before-image.json` is the exact SQL text member with all current capture array fields plus schemaVersion/mainCommit/policyHashes; require all fields produced by migration180200, all three competition identities and all four original target rows. The later SQL reprepare remains the final complete preimage equality authority.

Prepared and applied evidence are separate immutable records. The selected evidence phase is derived from verified artifact contents, never a caller boolean. The target compiler includes the shared backup/original descriptors and applied receipt binding, without asserting current non-target readiness.

## Future source budget boundary

Do not weaken the existing three-group final-audit plan or collector. A later explicit target plan protocol must derive selected IDs from actual authenticated target cached bodies/header rounds and actual read-only imported IDs, with strict revalidation of reused complete reports. Missing/stale/unverified cache bodies or a target source defect holds before any request; ID ordinal guessing and budget expansion are forbidden.

Root's possible G1+G9 phase has at most19+22=41 GETs, with fewer when valid new coverage permits. Builder choice for review: use two independently sealed single-target child plans/artifacts under one immutable approved batch envelope listing exactly G1,G9, so an already sealed first child's complete evidence remains retainable if a later child refuses. The entire source batch stops new requests on the first source refusal, including requests to another target; independent child artifacts do not authorize continuing or automatically dispatching the other child after refusal. Cumulative budget stays at most41, and per-target bounds stay19/22. No G2 capture or automatic broader61-GET fallback. This is a future design boundary, not a source authorization or an implementation task in the present plan. Current verified availability is insufficient: exact cache390531 exported720 missing; G2-Calonge391309 exported719 missing and only4116202 present; G4-cache390963 exported720 missing. These are authenticated diagnostic manifests, not successful source packets. No complete G1/G9 target240 cache proof or all-three720 proof exists from these candidates. Therefore the proposed at-most41-GET refresh cannot currently be compiled or executed. Root's search for genuinely retained older bytes may improve availability; otherwise a separate bounded new-source-inventory capture design and approval are required. Never fill missing bodies, infer rounds, refresh timestamps or turn a diagnostic into successful proof.

## Work bounded by this review

Implement only the new target packet and authenticated offline cache/audit/cleanup readers/composition, their fixtures/tests and source-test registration. Keep workflow cache-export only; do not add source/writer modes, migration180400, repricing, activation, public UI changes or other-country changes. Root owns fresh builder review before code and independent code review before any future execution. Do not touch HNS180300 or the dirty user checkout.
