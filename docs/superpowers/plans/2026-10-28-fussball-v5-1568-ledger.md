# Baden accounted continuation V5 — 1568 / 5000

`baden-reviewed-transports-v5` accounts the consumed V4 execution before any new source request. It does not restart its claim, reset its budget, refund its failed attempt, approve source exclusions, or grant native/activation authority. V1–V4 readers and the ordinary nightly protocol retain their existing contracts.

| Consumed completion run | New requests | Cumulative requests |
| --- | ---: | ---: |
| Earlier reviewed source history | 1114 | 1114 |
| 40566792786 | 98 | 1212 |
| 40577717778, current + archive | 206 + 5 | 1423 |
| 40614233934 | 94 | 1517 |
| 40633575248 | 51 | **1568** |

The fixed new reservation is **1568 + 432 current + 3000 archive = 5000**. These are ceilings, not a completeness claim. Every source attempt, including retries and terminal failures, remains counted. The preceding prototype compatibility fix is independent commit `26f150eb`.

The V5 policy pins run `40633575248`, source commit `d25c9b0bac906e2b9f7ad13e749a724e7b6fac77`, artifact `12792682270`, 55,733,892 ZIP bytes, digest `sha256:2594c73db26a0813ac95214bca3c50b6f01eda61938cc8b2c54457b69c629fb5`. Its failed capture job is `122635315475`; archive `122637455223` and handoff `122637457829` were skipped. The reader checks complete actual run/job/artifact identity, fixed manifest/intent/progress/outcome hashes, all 51 intents and durable outcomes, 50 successful network attempts and the terminal failed 51st attempt. The terminal event has no HTTP response or transport-retry evidence and supplies no invented body.

All 78 ZIP members are accounted: four journals/manifest, two embedded raw V4 parent members and 72 document bodies. The documents partition into 50 network originals (16 fresh rounds, 34 non-round originals) and 22 reused originals. Every body/path/hash, network receipt and reused flat receipt is independently checked. The embedded V4 parent is recursively reauthenticated through its 1517 ledger, 691 non-round candidates and all older histories; the public embedded proof must equal the rebuilt proof.

The 34 new non-round URLs have **zero overlaps or revisions** against those 691 candidates. The latest-only candidate inventory is therefore **725**, descriptor digest `98fc4a89f86afef24d8417afd000fb74ecab7f7f3fa5a41a01a65db3e01ce5c0`, using the existing canonical descriptor serialization. Earlier revised originals remain governed by the unchanged V4 revision pins; older versions cannot replace the latest receipts.

The unchanged strict report/lineup eligibility helper admits **707** cache documents at this code: 67 reports, 67 lineups, 287 CSS and 286 WOFF. The other 18 documents are nine report/lineup pairs, including the latest three previously revised pairs. They remain in raw history, are not replaced with older revisions, and grant no cache reuse. A fresh full strict traversal must collect and evaluate what it needs; this ledger does not exempt or approve those facts. All rounds are always fresh.

V5 deliberately reuses capture **schema 5 / checkpoint 4** and retry policy `baden-v4-transient-v1`. The exact preset selects raw parent path `checkpoint/parents/40633575248.{json,zip}` and the 1568 ledger. V4 continues to select its original `40614233934` parent and 1517 ledger. Capture, independent replay, archive checkpoint loading, paired-pack loading and first-nightly cache consumption distinguish these presets and reject mixed ledgers or histories. Archive capture receives no current-season cache. Ordinary nightly remains its existing non-retry capture protocol.

Before source starts, all four consumed completion runs must be present and reauthenticated from the reader-issued history. An additional completed first-attempt run can be recognized as nonstarted only through its exact bound actual run/jobs: the source step explicitly skipped and archive/handoff bound, skipped and empty. Started, missing/unknown, wrongly bound, rerun or canceled executions hold the continuation. Serialized caller proof/counts cannot clear history.

Focused local verification uses Node `v22.23.1`, genuine retained parent ZIPs and in-memory metadata/fetch controls. Synthetic transport collectors are labeled in tests and confer no statistical or native admission. The V5 reader tests cover immutable failed51 accounting, raw provenance, malformed/digest/protocol/journal/receipt/embedded-ledger rejection, and one-use history. V4 and V5 paired tests exercise real capture/replay, retried successful numbered receipts, archive checkpoint loading, paired cache admission and the ordinary first nightly, including mixed-protocol negatives. No global suite, source request, external network, database, SSH, push or dispatch is part of this implementation task. Source requests spent by this task: **0**; actual cumulative accounting remains **1568 / 5000**.

Verification results: **60 distinct focused tests passed**, zero failures or skips in their final applicable runs: 16 V5 tests (including the final genuine-byte hosted-staging/local-loader round trip and the strengthened nonstarted-history test), eight existing V4 action tests, two V4/V5 paired/nightly integration tests, 13 existing season-pilot tests and 21 existing retry-boundary tests. The V5 accounting/reader tests first failed against the prior implementation as expected; a raw inventory digest property-order mismatch was caught and corrected to the existing descriptor serialization before the genuine reader passed. `git diff --check` passed. The two genuine fixture directories are `baden-v3-d26dcbae-20261028-attempt1/retained` for V4 and `baden-v4-d25c9b0b-20261028-attempt1/retained` for V5; neither was substituted for the other or modified.
