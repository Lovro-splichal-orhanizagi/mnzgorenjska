# Offline confirmed court-result repair

Base: deployed main `da8516a66084926ebddd3f065fc90d85c2bdf9b9`. Scope: parser, closed schedule validator, focused regression, exact retained fixture descriptor/blobs. No source/network requests, DB, GHA, push, merge, activation, unavailable-policy changes, or edits to prior manifests/runtime pins.

Evidence: retained run `40641606028` archive ZIP SHA-256 `d7ea312ffba97814a472900ff97a22f1cf667d86a87060c18536773fa7900d26`. The new fixture copies original round-21 U and seed round-30 V bytes plus their CSS/WOFF bytes and original receipts. Every fixture length/hash is checked. U raw SHA-256 `1e8c44e617aae198982cddb01e3d0ec475aff430ceb5e104cfa584b1ffc91b22`; V5 V raw `d25d3ec1a201886fc8408e4a6fc31457e859aab2250e3579cdbccece0c2b3e80`. Original reviewed V fixture/test remains unchanged.

`administrativeResult` schema version 1 gains one closed union member: `kind: confirmed-sports-court-decision`, `marker: U`, two ordered `displayedScores`. Exact U legend `(U) Sportgerichtsurteil (bestätigt)` is required once. Seven-child markup, one bound font, four 1–2 digit decoded scores, one special score and one score cell remain closed. U report links accept canonical URLs or exactly `#!/section/course`; arbitrary queries/fragments, conflicting IDs, mixed ordinary scores, displaced special markup and conflicting U legends reject. Existing V kind/marker/pairs stay unchanged; V score href remains fragment-free.

Observed U fixture `02TNBSVIMS000000VS5489BUVSSD35NB` retains `(4,1)` followed by `(1,4)`, court-confirmed status and `rezultat: null`. Pair roles are unproven; official winner UNKNOWN (no winner is emitted). Schedule duplicate-reference comparison preserves kind, marker and pair order. Collector preserves administrative diagnostics outside ordinary played/unscored coverage; no administrative report fetch. Native importer is unchanged and rejects administrative fields, including forged ordinary-score substitutions, in strict/community modes. Intentional downstream HOLD remains.

TDD evidence: before production changes, new exact-U and U schedule positive tests failed with the documented parser/validator errors; original reviewed V passed 6/6. Additional ambiguous U legend, displaced special span and outside-cell ordinary-score mutations each failed rejection assertions before guards were added. Final focused verification with Node `/Users/jernejjankocica/.nvm/versions/node/v22.23.1/bin/node`:

```
node --test scripts/test-fussball-court-40641606028.mjs scripts/test-fussball-administrative-40577717778.mjs
# 14 tests, 14 pass, 0 fail
```

New capture closure fingerprint: `30ef88d89e76c3d3b721261aca4accceb52216585425da36e88c0e9d810b968c` (via `fussballCaptureCodeSha256()`). Old V5 closure remains `dc58eda97e30c20a313f9343574496d997b401f850ac0960c72bb36dc1975528`; no compatibility is claimed or installed. V5 current SUCCESS/archive FAILED and accounting `1838/5000` (`3162` remaining) are unchanged. Any accounted V6 continuation and explicit source-only compatibility require separate root integration work; this commit authorizes no source retry.

## Scoped review follow-up

Review of `ace4a656` identified two inventory gaps: an extra U description with nested markup was omitted by the flat-body pattern, and a single-quoted conflicting row report anchor was invisible to the double-quoted href inventory. Both new focused regressions first failed with `Missing expected exception`. The parser now inventories description containers with the existing class/element readers before enforcing the sole exact confirmed legend, and inventories anchor tags before requiring one supported double-quoted href and validating its report identity. Accepted U/V markup and result schema are unchanged.

The same focused command now passes **16/16** (the prior 14 plus two new regression groups). No source/network, DB, policy or publication action. This follow-up supersedes the earlier repair fingerprint with `030a2ae148b83dda1d954ddf3921804002e13046b695c29da19300b59a8b24f2`. Accounting and V5 compatibility boundaries above remain unchanged.

## Description-attribute inventory follow-up

Scoped re-review found that unsupported `class='description'` and `class = "description"` containers still disappeared from the exact attribute reader. New alternate-attribute and duplicate-class regression groups first reproduced missing rejection failures. The local U-only inventory now recognizes quoted class attributes across quote, spacing and attribute-case variants before requiring the existing canonical class reader; unsupported syntax or multiple class assignments on a description container rejects. Shared `attr`, `classTokens` and `element` behavior and accepted source markup are unchanged. Nested/conflicting variants and duplicate class assignments are covered.

Final focused command above passes **18/18** (prior 16 plus two groups). Capture closure fingerprint is now `eb927800eaccd3de7bba80f824aac6a411d8b45519c3cad6e5c8d6ce150c1730`, superseding the previous repair fingerprints. No source, network, DB, policy, push or other publication actions; accounting remains unchanged.

## Unquoted class-assignment inventory follow-up

The remaining review example used unquoted `class=description`. Existing regression groups now also exercise unquoted values, spaced/multiline assignments, uppercase assignment/value forms, multiline quoted values, and duplicate unquoted/mixed class assignments. Unquoted conflicting and duplicate cases reproduced RED before the fix. The local inventory recognizes double-quoted, single-quoted and unquoted HTML attribute values together; unsupported description forms still reject through the canonical-reader guard. Shared helpers and accepted U/V markup are unchanged.

Focused suite remains **18/18 GREEN** with the expanded cases. Final capture closure fingerprint is `eac09a63170026bbdb51b3d4c6cd86f84f6c9c87df60d78b0b78486c48e33ca5`. No source, network, DB, policy or publication action; accounting remains unchanged.
