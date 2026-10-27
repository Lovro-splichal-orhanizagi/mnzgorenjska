# German Baden accounted resumption implementation plan

Goal: complete the actual Baden full-season validation and passing native handoff without losing retained originals or resetting spent requests. This is a successor to one terminal failed completion, not authority to replay its consumed preset.

## Tasks

1. Add the exact cache-only v2 outer/nested artifact reader and bounded separate ZIP format; retain v1 contracts.
2. Integrate v2 persisted capture/replay proof and strict bundle filtering.
3. Wire the same completion workflow/CLI with1212 baseline,788 current ceiling,3000 archive ceiling and the actual accounted-parent history exception, preserving once-only source-start guards.
4. Review bounded deltas, verify current-main deployment, run one authorized successor within5000, authenticate resulting spend, and activate only if all existing source/native/GK/price/legal15/future-deadline gates pass.

## Design and binding constraints

# Bounded cache-only resumption design

Recommend one explicit successor preset, `baden-reviewed-transports-v2`, reusing the existing completion workflow, v4 capture/replay and ordinary paced collector. Keep the original three-parent reader/registry/preset contracts intact. This report grants no source execution authority.

## Actual retained delta

Run40566792786 / attempt1 / main78ef666fa2f61671e95892a315eb38cbc9c080d2 / capture job122410108716 / artifact12763736902 failed. Pin its exact raw ZIP13,007,918bytes, digest `sha256:21488f80e0d1253de9cb8d304a89c12a7b8fda2cb640a487d704daf810ddc91d`, manifest `2e2ee2e7d9b867a997d7ceb131911fc143c783855a9b64672033bea45412a34e`, attempts `c49db28f67fd7faaa2230aa38a112a87bdcbdfc05cafc3529388fbc3047e953e`, progress `8b662d37b539b5edc66c602490309a889d9ae7087a024cabdcc563bdc1b1d419`, code906b60b135e3f054fc8eb865717c86e4a3023ac3145afb6a66de886c18deee54, exact options/timestamps and terminal attempt98 from these local originals.

The232documents comprise97network and135cache. The new originals are30rounds plus67non-round documents:31CSS,32WOFF,2reports and2lineups. Comparing the embedded old-parent manifests gives63new URLs and exactly four different-body overlaps: main+observed lineup for matches `031DS4G7UK000000VS5489BUVUR5FS5A` and `031DS4G74K000000VS5489BUVUR5FS5A`. There are no CSS/WOFF overlap conflicts. The135cache documents are prior originals, never135new requests.

Accounting must be1114+98=1212, including the failed CSS request. Original total5000 leaves3788: reserve3000archive and at most788new current requests. No refund for cached/skipped/failed documents.

## Minimal reader and merge

1. Add `readFussballTransportResumption({parent,now?})` in `fussball-checkpoint.mjs`, accepting only `{run,artifact,jobs,zipBytes}` for this exact fourth parent, and a separate pinned JSON successor registry. Leave `readFussballTransportCheckpoint({parents,now?})`, its three fixed v1 parents,1114 ledger and conflict refusal unchanged. Reuse the existing private proof WeakMap, document getter and export functions; new proof carries presetv2, same scope, prior1212/cap5000 and a stable selected-document digest/count. No caller pins, serialized capability or general parent-chain API.
2. Add a separate bounded ZIP kind for this fixed v4 failed-parent envelope. Allow only manifest/journals, content-addressed documents, and the six exact `checkpoint/parents/<oldRun>.{json,zip}` paths. Preserve regular-file-only, duplicate/traversal/symlink, per-member and expanded-size checks. Do not widen the old ZIP kind or implement arbitrary recursive ZIP extraction.
3. Reauthenticate the three embedded raw parent records through the unchanged v1 reader, compare the embedded checkpoint v1 public proof and exact paths, then authenticate the outer failed v4 manifest. Validate all232bodies, all135cached flat receipts against the branded old572document set, all97network documents against successful HTTP200 attempts/flat original receipts, and the complete98-intent journal/pacing. Require exact failed98/no-httpStatus event, stopped/error state, no result, successful upload and skipped replay/archive/handoff. The outer digest does not replace these independent checks. Discard all rounds from cache.
4. Avoid generic latest-wins. For this actual successor, pin the four old/new report/lineup hash conflicts explicitly, then exclude **both versions of both entire pairs** from reusable documents. In particular, never fall back to old7UK/74K bytes if the newer pair is private/incomplete. Preserve every original in its raw parent ZIP for diagnostics. Any unexpected URL/kind/body conflict remains a hard review hold. Merge the remaining unchanged old originals with the63new CSS/WOFF URLs, keeping genuine flat timestamps/receipts. This gives631pre-filter candidates; it is not631eligible documents or proof of source completeness.
5. Run the existing `eligibleCheckpointDocuments` strict/community parser on complete main+lineup pairs using only their actually observed CSS and exact WOFF URLs. Missing-font/private/invalid pairs remain excluded together and are ordinarily refetched; do not borrow a different report/lineup revision or guess/substitute fonts. A CSS/font collision outside the four pinned report conflicts must hold. New assets alone never repair a missing public identity. Fresh schedules and all full parser/privacy/native gates remain mandatory.

## Capture, CLI and once-only execution

Keep capture manifestv4. Add checkpoint payload version2 whose single parentFiles entry persists this fourth raw parent JSON/ZIP; its ZIP already contains the exact old three. Preserve the old checkpoint version1 branch unchanged. Extend `persistCheckpoint`/`readCheckpoint`/`checkpointScope` with these two explicit cases, requiring presetv2/prior1212/current<=788 for the new case. Offline replay must rerun the new reader, compare the entire public proof and exact selected receipts, and retain existing complete used-cache/used-network/result checks. Seal the successor registry in the capture fingerprint. Do not pass the failed parent to `verifyFussballDirectory` or manufacture a success/result for it.

Add an explicit workflow preset choice; wire it through `buildFussballCompletionEnvironment`, GET-only download/load and season-pilot validation. Successor validation fixes1212/5000 and current<=788/archive<=3000; a supplied1114,789current or alternate scope/policy must fail. Archive remainsv3 with the actual fresh current seed; successful v4 paired/native admission needs no new format or workflow authorization.

After existing host coordination, the history guard must consume the branded successor proof and enumerate the same workflow's complete actual history. Allow40566792786 as **the exact already-accounted terminal failure**, matching its reader-authenticated execution/artifact binding; do not merely allowlist its run ID. Any other older source-started, rerun, live, cancelled or unknown execution blocks. Older provably skipped source steps may remain unspent. The first successor source-start spends this preset permanently until another explicitly reviewed ledger exists. The old1114 preset remains blocked by40566792786. Recheck actual own first-attempt/manual/main identity before source; no new workflow or separate history namespace that could reset the guard.

## Focused implementation evidence required

Use retained actual four-parent bytes with zero skips: unchanged v1 still returns572/1114; successor returns the exact631candidate digest with both conflict pairs absent,63new assets preserved and no rounds. Test forged proof/pins, changed nested evidence/receipts/body/paths, incomplete98journal, HTTP/challenge/timeout/cancelled variants, unexpected font/body conflicts and forbidden old-pair fallback. Test both versions' persisted proofs independently, required fresh round reads, ordinary refetch of excluded pairs, terminal new failures, full offline usage/replay and unchanged archive/native holds. Test1212+788+3000=5000,1114 downgrade refusal,789overrun, exact accounted-parent history acceptance, any additional started/unknown run blocking, and successor repeat dispatch blocking. Existing v1/direct-manual admission contracts must remain closed. No broad importer/native rewrite is needed.

Investigation used only local source and already-retained JSON/ZIP bytes, including read-only inventory/hash comparisons. No code changes, tests, federation/GitHub/database calls or parser execution were made. In particular, no new report parseability, source completeness, budget authorization or activation is claimed.

## Implementation evidence

Task1 complete locally: actual fourth-parent cache-only reader, separate bounded ZIP kind and exact631 candidate digest. Original v1/1114/572 registry and reader remain unchanged. Retained old+new suite77/77 passed; final new-reader suite38/38 passed, zero skips. Task2 complete locally: explicit v2 one-parent persistence/replay, original receipts and fresh schedules, unchanged strict bundle filter. Final suite8/8 and selected existing archive/paired/native/import regression5/5 passed; final added asset-cache assertion1/1 passed, zero skips. Task3 complete locally: explicit same-workflow v2 routing, fixed1212+788+3000 allowance and reader-bound actual accounted-parent exception; all other started/unknown runs hold. New+old completion/pilot suite60/60 passed, zero skips. All new source operations and execution metadata in tests were injected synthetic controls over genuine retained failed-parent originals; none proves a successful live capture or activation.

Root independently reviewed the complete224-line production delta, all fixed pins against retained actual evidence, the three cross-task interfaces and related test/report scopes. No concrete blocker found. The actual source client hash remains a715760bd9672ea2ae18646e272c72d248d75966ff7cd35ea82a94d66a211885; diagnostics did not alter requests or response-status recording. YAML, syntax and diff checks pass. There were no fixes or deferred review findings. Task4 GitHub checks, deployment, one bounded source execution and all passing native gates remain outstanding.
