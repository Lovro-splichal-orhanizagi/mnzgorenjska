# G1 post-failure source contract — Phase A

Protocol: `future-g1-after-failed-g1-v1`. This phase supplies source authority only. Root will combine reviewed Phase A and Phase B into one final deployed writer, collect the new240 once, and keep that writer stable through activation. No cross-writer successful-source/native cutover is promised or tested. Existing native entry points continue to reject this new source protocol until Phase B explicitly supports it.

## Accounting and preparation APIs

- `readFcfPostG1HistoryWire({source,github,now})` in `fcf-future-source-approval.mjs` accepts closed references `{prior,latest}`. `prior` is the existing complete post-G9 history reference form; `latest` is the old G1 `{plan,claim:{execution,expected},consumption,child,finalReceipt}`. It GETs fixed-repository raw evidence, not source pages. Current bounded reader requires genuine failed G1 diagnostic22 after authenticated38; unknown/missing receipts never mean zero.
- `readFcfPostG1Accounting({prior,latest,now})` in `fcf-post-g1-accounting.mjs` accepts the corresponding raw transport form and recursively invokes unchanged old-protocol readers. Its branded accounting-only proof has `kind=fcf-post-g1-accounting-only`, `priorSourceGETs=60`, `latestSourceGETs=22`, cap478, remaining418 and `admissible=false`. Plain clones are rejected. Historical completion-clock replay is only for authenticating spent history; no source-use clock is replaced.
- `getFcfPostG1SourceHistory(proof)` returns stable DATA (`schemaVersion:1`, `kind:fcf-post-g1-source-history`) with the full37→G9+1→G1+22 chain. `latest` retains the failed G1 Ec source/run/claim/diagnostic/final identity. `priorAccountingBinding.latest` retains the G9 DA source identity.
- `getFcfPostG1CleanupIssuer(proof)` resolves the G9 ancestor from the branded proof. It does not accept a caller-authored issuer. The actual fixture resolves DA8516a66084926ebddd3f065fc90d85c2bdf9b9.
- `buildFcfG1PostFailureSourcePlan({sourceCommit,accountingProof,rulesetSnapshotSha256,now})` adds the new protocol to the existing plan union. Source writer differs from both immediate failed G1 and G9 cleanup issuer. Plan schema1 gains exactly `supplementalPolicySha256` only for this protocol. Original six `policyHashes` are unchanged. Fixed G1/783/current2026/27 IDs4109388–4109627:240 fetches,reuse[],prior60,new240,planned300,cap478. Limits stay45-minute session,24-hour plan/source ceiling and unchanged provider-specific freshness/pacing/timeouts.
- CLI `prepare-g1-post-failure-approval --history-source ... --source-commit ... --ruleset-id ... --output ...` creates schema6 `fcf-g1-post-failure-source-approval`; outer fields match existing future approvals. It reauthenticates the whole ledger, protected ruleset and plan. Existing `claim-template` handles this approval through the future claim union: claim schema5/consumption schema4 remain unchanged; protocol and accounting hash differ.
- New claim namespace is `refs/tags/fcf-inventory-claim/g1-after-failed-${sha256(stablePostG1History)}`. It is history-keyed across proposal/writer alternatives. Source capture still requires an actual new protected, consumed one-shot claim, attempt1 and source-slot proof; old consumed claims cannot be reused. Existing operator pre-send absent-ref/current-job/runtime checks remain required. This phase does not implement a live operator.

## Exact supplemental source DATA

`fcf-g1-4109409-policy.mjs` exports `getFcfG1SupplementalPolicy()`, `fcfG1SupplementalPolicySha256()` and `verifyFcfG1SupplementalObservation({targetSlug,id,html})`. Its current policy SHA256 is `a9141400858c80322b6cb12b13c54a5dde45e93f080b4fe0b644dce513657ee7`. Its separate one-entry JSON policy records the explicit user approval reference, approved original digest/length and exact official fixture. It supplies no installed-marker/cleanup/native capability. No approval-send timestamp is invented.

Only G1/783/report4109409 is allowed: source round3,2026-10-04,17:00,closed Acta Tancada,missing official result and no goal/player rows. Approved raw digest is b3737490800a28588fbc4b6eb1d06b26913dcb31149b5ee82a7ae96379d69871 (171201bytes). Home source club/category21434932/21442320 is EMPURIABRAVA CASTELLO,C.F.; away5002/37524 is BANYOLES,C.E. Source competition ID is genuinely absent/null. No native IDs are supplied by this policy.

The ordinary/default future header/prover still reject4109409. `deriveFcfFutureInventoryHeader` / `validateFcfFutureInventoryHeaders` and `proveFcfFutureSourceDocument` accept an optional `protocol` field only for the new protocol; capture/evidence readers supply it only from the validated plan. All other IDs use the existing strict path. Original4109404/original-six functions, policy registry/hashes and proof semantics stay unchanged. Route/date/season/group/side/result/player drift rejects; presentation-only changes retain the approved original SHA separately from the fresh body SHA. There is no arbitrary closed/null-result fallback.

New supplemental canonical:

- `statisticsStatus: unavailable_historical`; `statisticsReason: closed_official_result_and_individual_statistics_unavailable`.
- `policyId: es-ct-segona-g1-supplement-4109409-v1`; `policySha256` is the separate supplemental hash.
- `homeGoals:null`, `awayGoals:null`, `report:null`, `appearances:null`, `goals:null`. Zero recorded goal events never becomes0:0.
- `sourceFixture` is the exact supplemental policy fixture (including kickoff).
- `source.supplementalObservation` has kind `fcf-g1-supplemental-observation`, targetSlug/sourceMatchId, policyId/policySha256, approvalReference, approvedOriginalSha256, freshRawSha256, fixture and exact derived header. Original six fixtures retain `source.historicalObservation` unchanged.

Pure document/observation functions remain DATA checks; only the private raw source readers establish source authority and current receipt freshness.

## Private getter contract for Phase B

Use unchanged entry points `readFcfFutureTargetSourceWire`, `readFcfFutureCapturedTargetEvidence` and `getFcfFutureCapturedTargetData`. The new branch reauthenticates recursive history, new claim/consumption, same-attempt complete240 inventory, reproducible offline audit and terminal admissible final. Failed/partial counts stay genuine. Getter re-audits at the actual invocation clock; a copied proof, old accounting-only proof or stale source cannot yield data.

The returned source data/competition/documents/240 fixtures/16 clubs/keeper clubs keep existing shapes. `data.binding` remains schema1 `fcf-future-source-admission` and, for this protocol only, adds:

- `supplementalPolicySha256` — bound by the validated plan and included in source fingerprint.
- `cleanupIssuerSourceCommit` — derived by `getFcfFutureSourceCleanupIssuer(plan)` from the privately registered new plan’s authenticated G9 ancestor.

Existing binding fields are unchanged: new source writer/run/artifact provenance, new history-keyed claim/consumption, inventory/audit/final bindings, original six policy hashes and `sourceFingerprintSha256`. Counters are exactly prior60,new240,actual300,maximum478. `accountingBinding.kind` is `fcf-post-g1-source-history`; failed G1 Ec remains `accountingBinding.latest.sourceCommit`; original G9 DA is `accountingBinding.priorAccountingBinding.latest.sourceCommit`. The getter’s derived issuer must equal the latter. Native callers must still consume the actual private source capability, not trust copied binding DATA.

Phase B must require its final writer to equal the actual successful source writer; retain original reader-issued DA APPLIED cleanup/receipt/before-image and six installed markers unchanged; add separate exact supplemental native marker/guard/receipt and explicit new packet version. It must preserve NULL scores/zero individual rows for4109409, current16-keeper/pricing/legal15/privacy/no-user/deadline checks and German/G2/G9 afterimages. None of that native behavior is implemented here.

## Verification boundary

Focused source tests distinguish genuine retained failed60 history/approved body from synthetic future Actions/Git/source responses. Tests exercise full240→300/private getter, schema6 approval/claim CLI/source wire/audit/final, counted403→61, scoped supplement drift/default rejection, immutable six hashes, one G1 workflow child and absence of DB authority. External genuine fixtures are explicit environment inputs; tests skip those portions when unavailable rather than fabricate historical authority.

All31 German producer bodies and both fingerprints remain byte-identical to df6cb4b9: V6 8b1c4befedca7fc3e92a946b792a32e0ec166a33e870a9e47262211318554301; capture 9f779baf8822fe2c6cf64e3213eadc7612a9911ad826d8cc2965f7fbb517b864. `dfb-artifacts.mjs`, German core/policies, original six JSON and existing SQL migrations are untouched. Existing FCF ZIP readers suffice; no ZIP helper was added. No network, source request, GitHub/DB write, push or merge was performed.

Final focused verification: new source boundary suite12/12 passed with explicit retained evidence; selected old-v1 full240/workflow/missing-history regressions3/3 passed. All changed/new modules passed Node22 syntax checks, git diff whitespace check passed, original six hashes matched and all31 German bodies/both fingerprints matched base. No broad suite or native/backend test run was performed in this bounded Phase A.
