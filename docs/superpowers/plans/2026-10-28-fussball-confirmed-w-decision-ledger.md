# Confirmed W source decision — bounded decoder task

Isolated branch `codex/fussball-confirmed-w-decision-20261028` in `worktrees/codex-fussball-confirmed-w-decision-20261028`, based on actual failed-source producer `4e1e7caac02aa6e12c789c7cea7aac699d3c2566`. This is a new local parser proposal, pending independent review. Existing source4e checkout, failed V6 artifacts, operator packages/claims and accounting were not edited. No native W/catalog/SQL or new continuation producer is implemented here.

## Witness and exact accounting

Diagnosis `E/evidence/baden-v6-40694431918-admin-failure-diagnosis.{md,json}` records terminal failed run40694431918. Its114 new GETs succeeded before round29 parsing failed. Totals remain1838+114=1952/5000,3048 remaining. No failed-source refund, retry, reset, source success or admission is implied by offline decoding.

Exact witnessed tuple: archive2025/26, round29,2026-05-25 17:00, match`02TNBSVEEG000000VS5489BUVSSD35NB`, `TSG 1862/09 Weinheim`–`GU-Türk. SV Pforzheim zg.`. Original round body SHA256 `28b752208241779ae14554aac3475818a3183f65ad994c7b6504e4b7d646ca07`,201229bytes, contains one lowercase literal `w` score-special and one exact `(W) Wertung Spielinstanz (bestätigt)` legend. Actual bound score font `yplak47e` SHA256 `ff343436f548a43337feb239f4838c2d6fd5a74588bb16370f79665b9553df1b` decodes ordered3:0 w0:3. The original body and both observed CSS/WOFF pairs are copied byte-for-byte into `scripts/vzorci/de-fussball-confirmed-w-40694431918/`. Provenance retains full original receipts, source failure, exact accounting, original manifest digest, font digests and the four independently decoded score glyphs. No HTML/WOFF was changed to create the positive fixture.

## Narrow behavior

Only `scripts/viri/fussball.mjs` and `scripts/fussball-season.mjs` change runtime behavior. `administrativeScore` recognizes the witnessed W/w literal in the same closed canonical report-link/seven-span score-special shape as V. All four score spans require one bound font and exact numeric glyphs. W requires exactly one canonical confirmed W legend and rejects extra/nested/malformed/conflicting W descriptions, unsupported markers, extra/mixed/hidden score cells, duplicate markers/score-specials, foreign/malformed/single-quoted/unquoted row report links, queries/fragments/foreign IDs and unbound/tampered fonts. Only U retains its already-reviewed course suffix; W does not inherit it. Existing V/U schemas, marker/pair order and ordinary strict parsing remain.

W emits the closed new union `{schemaVersion:1, kind:'confirmed-match-authority-decision', marker:'W', rawMarker:'w'|'W', displayedScores:[first,second]}`. Original lowercase is retained as `rawMarker:'w'`; uppercase W is normalized identically while preserving its raw case. Both displayed score pairs retain their source order. `rezultat` remains NULL, with no winner, appearances, goals or ordinary played statistics. The season validator recognizes only this exact W kind/marker/raw-marker combination and rejects extra/missing fields or a concurrent ordinary score. Generic collector behavior retains W in `administrativeFixtures`, excludes it from ordinary unscored/played coverage and performs zero report GETs for it. Existing native batch construction continues to refuse ALL administrative results, including forged ordinary scores. No native W permission is added.

## Red, green and all30 retained round replay

Before implementation, the new genuine retained W test failed with the original `fussball: nepodprt ali dvoumen administrativni izid`. After the narrow decoder/closed-union change, the unmodified real body and retained fonts pass. The existing V fixture negative that formerly used unknown W now uses unknown X; an additional W-with-missing-confirmed-W-legend negative preserves that rejection boundary. No V/U positive expectation changed.

Focused command:

`SLFF_FUSSBALL_W_RETAINED_ARCHIVE=<E>/baden-v6-4e1e7caa-20261028-readonly-observation1/archive node --test --test-reporter=spec scripts/test-fussball-confirmed-w-40694431918.mjs scripts/test-fussball-court-40641606028.mjs scripts/test-fussball-administrative-40577717778.mjs`

Result:26 tests passed, zero failed/skipped. The explicit retained-archive parameter activates the all30-page test; it never falls back to source HTTP. Every138 retained document byte length/SHA256 and original manifest digest were independently checked. All30 genuine pages (seed selected30 plus1–29) parse and assemble into240 fixtures. The only administrative layouts are:

- Round21 U `02TNBSVIMS000000VS5489BUVSSD35NB`: ordered4:1 U1:4, finalNULL.
- Round29 W `02TNBSVEEG000000VS5489BUVSSD35NB`: ordered3:0 w0:3, finalNULL.
- Round30 V `02TNBSVDG0000000VS5489BUVSSD35NB`: ordered0:3 V3:0, finalNULL.

No fourth layout or additional parse failure was found. `offline-round-replay.json` records every round URL/body SHA/byte length/status and exact assembled administrative inventory, distinct from failed-source authority. This offline replay does not traverse ordinary reports or establish complete archive/native readiness.

## Exact final runtime hashes

- `scripts/viri/fussball.mjs` SHA256 `c8125108416f2dcf7dc59170d57bb3769570fac06e6aa491513450a5ebac4c3e`.
- `scripts/fussball-season.mjs` SHA256 `cfc24c25a10933dbcc81252291e26c7fc14954f25297023fabb788ecbfdf7177`.
- New capture fingerprint `d207ddd977f879b7ad6e75f0efe0ce15dac398b01dcba0a87a59747bbd9a66af`.
- New archive-V6 code fingerprint as mechanically computed over this prospective parser runtime `fd12cd79b4ee2adfda19d5121e86a90492a034a5194f546247024845f3347fd1`.

These deliberately differ from frozen failed-source4e fingerprints `9f779baf8822fe2c6cf64e3213eadc7612a9911ad826d8cc2965f7fbb517b864` / `8b1c4befedca7fc3e92a946b792a32e0ec166a33e870a9e47262211318554301`. No recorded old fingerprint, source policy, freshness gate, operator package/claim or immutable old source body was rewritten. A separately reviewed new producer/authentication/continuation design must account for all1952 spent requests and authenticate old failed V6 under its frozen runtime. This commit supplies parser support only.

No source/network/GitHub/GHA, DB/credentials/.env, SSH, push, merge, publication or broad suite ran. All collection/catalog/native/cutoff/readiness/launch holds remain unchanged. Source-only independent review is required before publication.

Verification note: original retained HTML/CSS contain source whitespace (including trailing whitespace and a final blank line), so an unfiltered `git diff --check` reports those fixture lines. They remain byte-identical to original receipt hashes and must not be reformatted. Authored code/test/ledger whitespace checks exclude only the exact retained fixture directory and pass; changed JS syntax checks pass. Working tree is clean after the local commit.

## Scoped W P2 correction — split-marker conflicting legend

Independent review `E/evidence/fussball-confirmed-w-decision-review.md`, SHA256 `256b0f72e7cefc32c07c1db29244186bf95ebd92617286bc22a8db71c04603b6`, found one P2 at original `0cb69e6f`: an appended `(<span>W</span>) Wertung Spielinstanz (unbestätigt)` description becomes `( W ) ...` after tag-to-text normalization and escaped the narrow `(W)` inventory. The new exact-fragment regression reproduced `Missing expected exception` before implementation.

Only the rejection-only W description inventory now removes whitespace and counts either a W marker or the matching `Wertung Spielinstanz` label. This catches nested/whitespace/case variants and conflicting decision labels without admitting them as confirmed evidence. Canonical acceptance still requires exactly one unchanged literal `<div class="description">(W) Wertung Spielinstanz (bestätigt)</div>` and the same closed score/href/font checks. U's original inventory regex and V/U/ordinary parsing/schema behavior are unchanged. No season validator, raw fixture/provenance, native/SQL, continuation/operator or other worktree changed.

New negative controls include the exact reviewed nested W fragment, lowercase nested w, `( W )`, entity whitespace around nested W, a split decision label without a marker and a conflicting X marker with the W decision label. The red regression failed before the fix, then passed after it. Affected W controls command `node --test --test-name-pattern='^(?!all30)' --test-reporter=spec scripts/test-fussball-confirmed-w-40694431918.mjs` passed8, failed0; the all30 external-archive test was intentionally not rerun (reported1skip). Existing byte-identical all30/240/exact3 administrative positive replay evidence remains the original evidence from `0cb69e6f`, not relabeled as a fresh execution. The genuine lowercase/uppercase W positive controls both passed with the new rejection inventory. No broad/V7/source/DB/network/GitHub run occurred.

Final corrected hashes supersede the prospective parser fingerprints above: parser `scripts/viri/fussball.mjs` SHA256 `816617fbcbaa808a49955ff3174a729f505fdd9112dcd5aadaa55e1cc305793a`; unchanged season SHA256 `cfc24c25a10933dbcc81252291e26c7fc14954f25297023fabb788ecbfdf7177`; new capture fingerprint `3473ac914e562d49a1a1ee633b8c8c2e559d21a010c44737f0beeb6aebbd7856`; mechanically computed prospective archive-V6 fingerprint `e7a1cf67dcf26a821ec42d9854643d9666565e4fc2418a15969ce2096962812b`. Recorded old source artifacts/fingerprints/failed114 accounting remain unchanged. Same-reviewer scoped rereview remains required before publication.
