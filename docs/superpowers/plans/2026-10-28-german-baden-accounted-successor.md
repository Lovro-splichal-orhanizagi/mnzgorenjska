# German Baden 1423 accounted successor implementation plan

Design only. Root owns integration. This uses brainstorming and writing-plans guidance within the explicitly bounded request; no implementation, source/network/DB/SSH operations, tests or activation occurred. No applicable AGENTS.md appeared in checked ancestor paths; the retained diagnosis records the same result. Existing source authorization is 5000; no new authorization is needed. The 1114/v1 and 1212/v2 presets are consumed and must never be restarted.

## Recommendation

Add one separate fixed `baden-reviewed-transports-v3` preset to the existing completion workflow. Authenticate the actual latest successful current artifact AND failed archive artifact, including the entire embedded v2/v1 provenance chain. Carry 1423 spent requests. Reuse only eligible non-round originals present in the latest successful current manifest; preserve older originals as evidence without merging their unused candidates back into cache. Capture all schedules fresh and archive fresh. This avoids another report-conflict merge and archive cache format for a four-request saving.

The administrative-result fix is already deployed at main `4238e68e` per root's deployment evidence; do not redo it. Its implementation and passing tests do not prove a successor run or native admission. Root must obtain the actual full reviewed/deployed commit at integration time; this design deliberately supplies no guessed future SHA.

## Actual retained evidence and accounting

Evidence root: `league-rollout-evidence/2026-10-26-german-unlock-screen/german-completion-40577717778/`.

Run `40577717778`, attempt 1, main `a4625c2e8a668686b961751108948321f26899fe`, terminal failure. Capture job `122448503907` succeeded, including current capture, independent replay, archive authorization and artifact upload. Archive job `122460201066` failed at capture/replay and uploaded originals; handoff `122460906179` was skipped. Require these actual states, not the previous failed-current/skipped-archive v2 shape.

| Stage | Artifact | Raw ZIP bytes | ZIP digest | Documents | New requests |
|---|---|---:|---|---:|---:|
| Current | 12769641870 | 50810420 | sha256:ee64314381294ee6f3ddc65b3a4a8d906f3502efbd1a5c5f391c9357f12155c2 | 664 | 206 |
| Archive | 12770031223 | 68509 | sha256:5c9c8b2d2e11131c0bcd05776442f99862ee4c7a21962f120bb82ecc4fd750a8 | 5 | 5 |

Root independently authenticated metadata, both ZIP digests, every body and complete paced journals. The local design inspection also read actual manifests/results/ZIP member inventories; one bounded offline invocation of the unchanged `eligibleCheckpointDocuments` function then checked the 634 latest non-round documents, without source access or capture/replay execution. Both stages use capture fingerprint `f89e1f3a219af2c99ca140525862f94b9ebd6855e461692cd9f881aba15065a1`.

Current pins:

- Manifest `52e755486bd2c8e90389a65264890634d6b617ecc5eeefed02013d1542e77e79`.
- Attempts `c45e905e3e22e1634ab95afd2b4186752cfb3877310f794e03be6e64b77207f0`.
- Progress `70c095f6d447ccf83cb869a34a9375e4aecec0f31d9974bf3082572ca486fbcb`.
- Result `c003298bab37251a3c9a8b9421395b0aa03568685fda022ed53d543350474e61`.
- Created `2026-10-27T20:25:40.955Z`, completed `2026-10-27T20:46:13.485Z`.

Archive pins:

- Manifest `233fcc21066b471b1d5c115ec66ae5ffaaa4fbec35f916a82a2ef41d363db586`.
- Attempts `0655f0ba7dde41e659f97d7c690a2e939684b935691056bfc3190e5ff257255c`.
- Progress empty, SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Created `2026-10-27T20:47:37.150Z`, completed `2026-10-27T20:48:01.640Z`.
- Version 3, `success:false`, error `fussball: manjka element score-left`, no result. All five transport attempts succeeded HTTP200; this is parser failure, not failed transport and not a refund.

Budget: `1212 + 206 + 5 = 1423`; remaining `5000 - 1423 = 3577`. Keep archive ceiling 3000 and current ceiling 577, with the existing cumulative check. No reset to 1212/788, 1114/886, or refund for parser failures/cache hits. New failure or partial run must be independently accounted before any successor beyond v3.

## Actual nested structure and cache selection

The current ZIP has 670 regular members: manifest, attempts, progress, result, 664 document bodies, and exactly `checkpoint/parents/40566792786.{json,zip}`. Its embedded checkpoint is version 2, preset v2, prior1212, count631, descriptor digest `ce374d05ce4bf4a0d887ca41c7c237a178c46fe1a6c044ae3f65235b8af13ffa`. That fourth-parent ZIP contains its own manifest/journals/232 documents and exactly three embedded v1 metadata/ZIP pairs, already authenticated by the unchanged v2 reader. Do not flatten metadata, recursively accept arbitrary ZIPs, or identify the latest artifact as a failed current capture.

Current manifest breakdown:

| Kind | Network | Cache |
|---|---:|---:|
| round | 30 | 0 |
| report | 27 | 49 |
| lineup | 27 | 49 |
| CSS | 61 | 180 |
| font | 61 | 180 |
| Total | 206 | 458 |

Thus latest-only cache candidates are 634 non-round documents: 76 report/lineup pairs plus 241 CSS and 241 fonts. The 458 cached originals are never new requests. The latest manifest is deliberately the sole candidate authority: do not bring older unused assets/pairs back through a merge. All original generations remain retained and reauthenticated.

Comparing the fourth parent's actual manifest to the latest current manifest finds four changed overlapping report/lineup bodies, for `031DS4G7UK000000VS5489BUVUR5FS5A` and `031DS4G74K000000VS5489BUVUR5FS5A`. Both are rejected in the latest result. Using only latest candidates removes any need for a latest-wins rule and prevents falling back to old supposedly valid identities. Do not union the v2 candidate set into this selection. An authenticated latest pair that fails the strict eligibility parser must be excluded together, even if an older pair parsed.

The retained result is 30/30 rounds, 210 fixtures, 76 played/report attempts: 57 complete, 10 community pending, 9 rejected; 134 future unscored fixtures, no past/current/unknown-date unscored fixtures. Nine rejected match IDs:

- `031DS4G7UK000000VS5489BUVUR5FS5A`, `031DS4G3DC000000VS5489BUVUR5FS5A`: missing profile identities.
- `031DS4G74K000000VS5489BUVUR5FS5A`, `031DS4G6GK000000VS5489BUVUR5FS5A`, `031DS4G5R4000000VS5489BUVUR5FS5A`, `031DS4G5K8000000VS5489BUVUR5FS5A`, `031DS4G4N0000000VS5489BUVUR5FS5A`: substitution lacks both players.
- `031DS4G384000000VS5489BUVUR5FS5A`, `031DS4G2N4000000VS5489BUVUR5FS5A`: goal by inactive player.

The unchanged eligibility filter excludes both halves of these nine latest pairs; retain their bodies in raw evidence. Do not introduce a new exclusion policy or diagnostic/parser work. Run the unchanged `eligibleCheckpointDocuments` strict/community filter on every remaining pair with only its observed lineup URL, exact CSS and exact WOFF. Actual eligible inventory is 616: 67 reports, 67 lineups, 241 CSS and 241 fonts. The bounded offline check applied the exact existing private filter function body to all634 genuine non-round originals and returned exactly the nine listed rejected pairs; it did not run tests or source collection. Pin the exact candidate/selected descriptor digests only after implementation computes them from genuine bytes; none is invented here. Anonymous starters remain rejected. No identity, event, font or parser relaxation is part of v3.

## Archive reuse decision

Archive ZIP has nine members: manifest, attempts, empty progress, five source bodies and one current seed body under `archive-parent/`. The five source bodies are one round, two CSS and two fonts. The archive-parent body is the authentic current seed `7a0bb00b1aae60f61ec36985a3718d897f704dc4400255ff60896e2e653c4734`, with its original current receipt and adjacent archive proof; it is not a sixth archive request. Authenticate that binding against latest current bytes/receipt and the exact historical alias; do not transplant it as the next fresh archive authorization.

Preserve all five originals and authenticate their receipts/journals for the 1423 ledger. Do not cache the old round: schedules and the new current-to-archive link must be fresh. Reusing the other four assets is feasible only with a separately branded archive cache proof, a persisted archive provenance format, explicit ledger-preserving receipts, archive capture wiring and offline usage replay. Existing archive v3 has no checkpoint/cache-origin format. Saving four new requests does not justify expanding those interfaces for this bounded successor. Recommended minimal route is accounting-only archive retention, then ordinary fresh archive v3 capture. Never feed this failed archive to the success-only verifier or fabricate a result.

## Fixed interfaces and implementation tasks

### 1. Exact v3 reader and two closed ZIP envelopes

Files: `scripts/fussball-checkpoint.mjs`, new `scripts/policies/fussball-transport-successor.json`, `scripts/dfb-artifacts.mjs`, new `scripts/test-fussball-successor.mjs`.

Add synchronous `readFussballTransportSuccessor({current,archive,now?})`, where each input is exact `{run,artifact,jobs,zipBytes}`, and `reviewedFussballSuccessorParents()` returning the two fixed stage pins. Return the existing private WeakMap-branded cache proof using the existing document getter/export seam: presetv3, prior1423, cap5000, same current scope, exact selected-document count/digest, two raw parent records ordered current then archive. Their run IDs are identical, so persist by stage plus run ID, never a run-ID-only map that overwrites one artifact. Leave v1/v2 readers and registries intact.

Add separate bounded ZIP kinds for this exact successful-current envelope and failed-archive envelope. Current allows only four top-level files, content-addressed bodies and the two exact fourth-parent paths. Archive allows only three top-level files, content-addressed source bodies and the one exact archive-parent HTML path. Keep existing regular-file, duplicate, traversal/symlink, member-count, per-member and expanded-byte guards; derive tight bounds from actual entries (670/9) and retained sizes rather than widen old kinds. Nested bytes are raw until the unchanged fixed v2 reader authenticates them.

Authenticate current metadata/job state/step matrix, raw ZIP and four content hashes, closed v4 fields/options/timestamps/fingerprint, success/null error/nonstopped snapshot and result hash. Reauthenticate embedded v2 using `readFussballTransportResumption`, compare entire embedded proof and exact paths. Validate all 664 body descriptors/hashes, all 458 flat cached receipts against branded v2 originals, all 206 network originals against exact HTTP200 finals and write-ahead intents; require order, closure, six-second pacing and bounded timestamps. Authenticate archive metadata with same actual run/jobs, exact failed v3 manifest and all five bodies/journal/finals, unchanged adjacent binding and no result. Require prior1212 plus exact206 plus5 equals1423. Result contents provide fixed exclusion IDs but never replace strict parsing. Select latest non-round docs through the unchanged eligibility filter, with the nine invalid pairs absent, then seal descriptor count/digest in the reviewed registry.

Focused tests: genuine retained artifacts and nested chain, changed nested metadata/ZIP/body/receipt/proof, current/result hash mismatch, missing archive or five-spend omission, cache counted as network, incomplete/extra/reordered journals, sub-six-second pacing, unsuccessful HTTP/challenge/cancelled/unknown cases, wrong jobs/steps, path traversal/duplicates/symlinks/oversize, same-run stage collision. Retain v1 572/1114 and v2 631/1212 assertions. No network in fixtures; no silently skipped retained-evidence tests.

### 2. Persist and replay v3 current proof

Files: `scripts/fussball-capture-evidence.mjs`, `scripts/test-fussball-resumption-evidence.mjs`, or new focused `scripts/test-fussball-successor-evidence.mjs`.

Extend `checkpointVersion`, `checkpointFiles`, `checkpointScope`, `persistCheckpoint`, `readCheckpoint` with one explicit checkpoint payload version3. New capture manifest remains v4. Persist exact two latest stage records under distinct names, e.g. `checkpoint/parents/40577717778-current.{json,zip}` and `40577717778-archive.{json,zip}`; implementer must use those same names throughout. Source proof export includes both unmodified raw artifact records. Embedded current carries all older chain evidence. Require presetv3/prior1423/max current577/full `community-v1`/reports all; preserve v1/v2 branches.

Offline replay must rerun the fixed successor reader, compare the entire public proof and original receipts, apply strict eligibility, then retain complete used-cache/used-network/result equality checks. Capture fingerprint must seal the new registry/reader paths as existing policy inputs are sealed. Historical code fingerprint stays pinned as evidence; never require it to equal newly deployed code or silently rewrite it. No archived result is promoted to current native admission.

Focused tests: round cache impossible and all30 schedules freshly requested, exact67 valid/pending pairs reusable under current parser, nine pairs absent/refetched together including both historical-conflict pairs, missing/private/unbound fonts excluded, no old-pair fallback, persisted proof/receipt/body tampering, both same-run parents survive, fresh output replay usage equality, terminal new transport/parser failure still recorded. Confirm the actual616 eligible count and descriptor digest; if parser behavior differs from the checked616, stop for bounded evidence review instead of changing parser policy.

### 3. Same workflow, ledger and one-use history

Files: `scripts/fussball-completion-actions.mjs`, `scripts/fussball-season-pilot.mjs`, `.github/workflows/preveri-fussball-dopolni.yml`, `scripts/test-fussball-completion-actions.mjs`, pilot/completion focused tests.

Extend fixed scope/preset routing and GET-only parent download/load for v3. Require1423/5000, current<=577, archive<=3000 and sum<=5000; preserve explicit main/manual/first-attempt identity and source coordination. Choose correct current577 default when v3 is selected or require explicit input; do not accidentally retain v1 default886. Direct manual and old preset admission remain unchanged and closed. Archive stays ordinary v3 with newly replayed current seed and all existing adjacent checks.

History guard continues enumerating the complete SAME workflow history. Consume branded v3 proof before any source start. Permit only the exact already-accounted source-started parents: existing `40566792786` through unchanged v2 authentication plus latest `40577717778` reauthenticated against BOTH raw artifacts and exact actual states. Reuse the embedded v2 parent from authenticated current proof, not a bare run-ID allowlist or caller-controlled exception. Require both earlier accounted runs present. Any other earlier source-started, live, cancelled, rerun or unknown run blocks; provably skipped source steps remain unspent. Own source step must still be exact active first-attempt main/manual capture and rechecked after history. First v3 source-start consumes v3 permanently, including partial/cancelled/failing runs. v1/v2 must continue refusing a new attempt after these consumed runs.

Focused tests: 1423+577+3000=5000 accepted,578/3001/downgrade/mismatched preset rejected; actual accounted current-success/archive-failure latest run accepted only with both artifacts; missing accounteds, forged branded proof, altered capture/archive jobs, any additional started/unknown run and repeated v3 dispatch held. No new workflow/history namespace.

### 4. Bounded integration review and future execution handoff

Root reviews only these deltas and focused test outputs, verifies actual main deployment and exact full commit before the authorized single run. Use retained fixtures and injected clients; no broad importer/native rewrite. Relevant existing archive/paired/native/import regressions establish unchanged holds. No execution is part of this design task.

After any actual run: independently authenticate both resulting stage journals, bodies, digests and terminal state, carry real spend forward even on failure. Continue only through current replay, archive replay and the existing full native/GK/prices/legal15/future-deadline gates. Nine current rejections and administrative archive semantics remain meaningful holds; transport success alone cannot activate Germany. This document claims neither readiness nor activation.

## Root implementation decisions

User has authorized rollout and cheaper bounded delegation. Implement tasks1–3 in this isolated worktree; root integrates/reviews then deploys, and only then may dispatch one accounted source run. No native gate is relaxed. The cache-only checkpoint reader will expose the634 authenticated latest non-round candidates, matching the existing631-candidate v2 architecture. The unchanged capture eligibility filter then removes the nine entire rejected report pairs, yielding616 eligible documents. Pin both counts in the appropriate layer; do not introduce a circular import or duplicate the private eligibility parser in the reader. Preserve original v1/v2 count/digest contracts. Reader parent export order current then archive; persistence paths40577717778-current and40577717778-archive avoid same-run collision. All writes to production stay GitHub Actions.

## Implementation and bounded verification

Tasks1–3 implemented in this isolated checkout. Reader27/27 genuine tests, persistence6/6 genuine tests and completion32/32 genuine tests passed with zero skips. Relevant unchanged payload v1/v2 evidence8/8 and completion/resumption47/47 passed with zero skips. Explicit no-evidence fixture guards were verified separately for the existing hosted test glob: reader8pass/19explainedskips; persistence1pass/5explainedskips; completion10pass/22explainedskips. No production source transport or native writes occurred in these tests. Reader634candidate digest3bce3e28ceaa4f6717c610c6e436e59d78ea6b802a54959a9e56efe4a6052dfa; strict existing filter616eligible digest24c3da5d2062b44f944bb10e4416588da9de61c5e41a303a9506fc70dfd13185. Injected capture retains all30 fresh schedules and18 rejected pair halves,48 new requests; this is test evidence, never actual source spend. Actual budget remains1423/5000.

One independent bounded review approved the complete delta without actionable findings and independently verified both retained rawZIPs and all669 source body hashes. Root syntax, workflow YAML and whitespace checks passed. Review and exact worker reports live in league-rollout-evidence/2026-10-26-german-unlock-screen/evidence/german-1423-*.md outside the checkout. No duplicate review or broad test run was requested. Deployment, one actual accounted source capture, full archive/native/goalkeeper/price/legal15/deadline gates remain required; this implementation claims no new live league.
