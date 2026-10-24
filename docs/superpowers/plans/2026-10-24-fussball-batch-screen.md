# FUSSBALL batch screen implementation plan

**Goal:** Offline-tested foundation for screening 1–10 observed German league/season tuples under one explicit total budget of 1–80 requests.

**Architecture:** Keep the existing strict single-league screen and full-season import gates. A separate batch orchestrator shares one serialized six-second capture client/cache, stores each league's HOLD or SAMPLE_PASSED result, and stops the host only on technical failure. Source authorization and live runs remain the parent's responsibility.

**Scope:** No database, activation, source GET, catalog guesses, package or global documentation changes. Every batch and child keeps `activationEligible:false` and `sezonskiUvozPodprt:false`; samples never prove full-season completeness. At most three reports per league.

- [x] Add failing retained-fixture/synthetic multi-scope tests for preflight, semantic continuation, technical stop, total budget and shared cache/pacing.
- [x] Implement `collectFussballBatchScreen` in `scripts/fussball-batch-screen.mjs` using the existing strict screen.
- [x] Add failing artifact tests, then implement separate batch manifest/result/journal/original bytes with code fingerprint and independent offline replay, corruption and unused-document rejection, including terminal failures.
- [x] Add failing CLI tests, then `scripts/zajemi-fussball-paket.mjs` with JSON scope input and bounded capture/verify commands.
- [x] Add separate manual main/exact-SHA/no-secrets workflow using `fussball-public-season-source` concurrency and an always-uploaded batch artifact.
- [x] Run focused FUSSBALL tests and hand the frozen commit to the parent for independent review/integration/full smoke.

Review focus: malformed late tuples must produce zero GETs; source failure within a report must remain terminal; successful earlier leagues survive failure; unconsumed retained documents fail replay; scope/result edits cannot turn old failed evidence into successful evidence.

Validation: 14 batch tests passed; full FUSSBALL regression suite: 258 passed, 1 explicit disposable-SQL skip, 0 failed. No source GETs or database operations. Parent owns integration, independent review and full smoke.
