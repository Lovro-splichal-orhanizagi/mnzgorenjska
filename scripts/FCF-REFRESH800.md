# Refresh800 source-only contract

Review candidate on branch `codex/fcf-refresh800-20261029`, based on G9 draft head `227131121f849baae966c90e40c44e768de6b19f`. No provider, database, credentials, private evidence replay, deployment, or dispatch was used to build it.

The user approved **800 cumulative provider requests**, reference `call_0b0f333067ba460d8db2c0d7c3226925`, wording “Allow 800 total requests”. This changes the budget only. It does not approve reports4109420/4109425, a root execution plan, native admission, or launch.

## Public API

- `FCF_REFRESH800_PROFILE`: additive immutable approval, limits and original301 anchor. Legacy478 modules, source301 lease, six/409 policies and DA cleanup remain unchanged.
- `readFcfRefresh800Ledger({github,probeLocators,refreshLocators,activeExecutionProof?})`: independently authenticate baseline/R1, known real probes and actual refresh artifacts, then inventory every source-family run and ordinary overlap. Unknown, partial unknown, duplicate/missing history or retries HOLD. Optional active capability is accepted only after reauthenticating its exact actual protected-claim job graph; there is no caller own-run ID bypass.
- `getFcfRefresh800Ledger(proof)` / `reauthenticateFcfRefresh800Ledger(proof)`: reader-only five-minute current accounting; historical301 is never substituted for actual current count.
- `buildFcfRefresh800Plan({ledgerProof,targetSlug,sourceCommit,rulesetSnapshotSha256})`: exact240 fresh IDs for G1 or G9, no reuse; C+240 must fit800. Fixed reusable preset `fcf-fixed-target-refresh800-v1` is used for every run.
- `buildFcfRefresh800Approval(...)`: reviewable DATA binding the private plan, full owner-visible protected-tag ruleset snapshot, actual main-CI reference, capture runtime closure and exact history locators. Runtime files include imported modules and literal JSON data dependencies. It issues no execution authority.
- `readFcfRefresh800Execution({github,locator})`: exact root/manual/main/first-attempt run, successful matching CI, independently hash-pinned root draft asset and immutable protected claim. The claim must bind runID, attempt1, sourceSHA, planSHA, approvalSHA, profileSHA and original claim timestamp. Actual all-job graph must have only `refresh800-capture` executing. Every other job is explicitly skipped with zero steps.
- `captureFcfRefresh800({executionProof,ledgerProof})`: only actual clean Actions checkout; durable claim consumption precedes the first durable counted intent. No caller fetch/clock/count/source URL is injectable. No redirects or retries; 3s pacing,90s timeout,2MiB bodies and45min window. Every attempted body/prefix is retained. Recognized unapproved result/statistics defects remain quarantine data and do not invent exclusions; refusal/shape/transport defects stop the target. Approved9410 uses its separate exact original-observation policy.
- `readFcfRefresh800TerminalAccounting({github,locator,prior})`: actual artifact/ZIP digest, typed durable consumed claim, ordered GET journals and original bodies authenticate actual delta, including failures. Missing outcomes are unknown, never zero. Archive runtime verification uses the approved capture epoch at the original SHA, not a later consumer's CI or files.
- `getFcfRefresh800CapturedData({ledgerProof,runId})`: only a complete still-fresh authenticated240 capture; returns copied raw documents with actual receipt/origin, separate immutable301 `anchor`, DA issuer, `currentCapture` and current cumulative counter. Always `sourceOnly:true`, `nativeAdmission:false`, `activationEligible:false`.

`locator` for execution is `{runId,sourceCommit,approval:{assetId,assetDigest}}`; a terminal refresh locator additionally has `{artifactId,artifactDigest,manifestSha256}`. Digests include the `sha256:` prefix except `manifestSha256` and raw SHA fields. Counts and clocks never come from the locator.

## Review and operator boundary

The existing `.github/workflows/uvoz-fcf-zgodovina.yml`, mode `missing-inventory`, gains one additive preset/job. The new job skips old approval/receipt jobs because their478/private-brand contracts remain frozen; it has its **own mandatory** root approval, protected one-shot claim, actual consume and closed execution/history authentication. The raw collector cannot be reached with forged/copied proofs. Missing approved asset/claim/current history => HOLD before provider I/O. No root asset, protected claim or concrete run approval has been created for this candidate.

Root-only preparation command (GitHub metadata/evidence GETs, zero provider GETs):

```
node scripts/fcf-refresh800-actions.mjs prepare /absolute/root-input.json /absolute/new-approval.json
```

Input keys: `sourceCommit`, `targetSlug`, full `rulesetSnapshot`, `mainCiRunId`, `probeLocators`, `refreshLocators`. The source commit and runtime must correspond to the reviewed deployed epoch. Review exact generated plan/approval hashes, then stage the hash-pinned private root draft asset. A reserved first-attempt run requires a protected `refs/tags/fcf-inventory-claim/refresh800-after-<ledgerBinding.historySha256>` commit, parented by the exact sourceSHA, with `.fcf-inventory-claim.json`:

```
{schemaVersion:1,kind:"fcf-refresh800-one-shot-claim",runId:"<actual reserved run>",runAttempt:"1",sourceCommit:"<exact SHA>",planSha256:"<reviewed plan SHA>",approvalSha256:"<raw approved asset SHA>",profileSha256:"<profile SHA>",claimedUTC:"<actual original claim time>"}
```

This is a schema illustration, not valid ready-to-run JSON or permission to create/replace a claim. No code here creates, resets, or deletes protected claims. The claim must exist before the actual capture step; otherwise the run HOLDs. The action writes `consumed-claim.json` before source access and retains `fcf-refresh800-<run>-1` with typed accounting and originals, even on a known failed provider attempt.

## Deliberate HOLDs and remaining work

- G9 collection is explicitly refused until an authoritative calendar adapter is implemented/reviewed. Its target range is catalog data only.
- Existing strict G9 real-probe reader remains unchanged. A real probe from an incompatible older code/CI epoch HOLDs; no archived-family adapter is invented. There are zero actual provider probes at this base, only exact reviewed R1 zero. Perform real discovery only after the final reviewed code epoch is deployed; preserve every real probe count. Do not change the baseline or discovery-attempt clock to hide an incompatible receipt.
- A crashed/failed pre-provider run with no authenticated typed journal remains unknown. A separately reviewed exact zero witness or typed unstarted accounting adapter is required; absent output does not become zero.
- Native source/GK/calendar/provider-TTL validation, native candidate/packet integration, SQL/9410 scoring preparation and release/operator approvals remain separate work. Source-only complete240 is not native-ready.420/425 remain unapproved and block native admission if still unresolved.
- Full authenticated baseline+fresh ZIP integration and actual GHA execution have not been exercised. Tests here use synthetic metadata and bytes only. Passing them grants no live source authority.
- Additive workflow routing changes the current YAML hash. Frozen alias/hash tests now authenticate a gzip-compressed exact original workflow fixture (SHA256 `dd2447bc8a706d14e517bd4854adbda15f66b2f790d138e0f0fbe11e13e69af4`); the old normalizer explicitly refuses new current YAML. The G9 test reconstructs the old workflow by removing only the reviewed additive preset/job and two explicit new-preset guards, then requires exact original bytes. Production historical-zero readers/registry and G9 readers remain unchanged. Existing23 historical execution assertions run against production readers without filesystem overrides; only the original-current alias test uses an isolated temporary tree for its frozen epoch.
