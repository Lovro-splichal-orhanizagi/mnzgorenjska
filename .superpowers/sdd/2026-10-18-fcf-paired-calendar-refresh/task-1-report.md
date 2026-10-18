# Task 1 report — guarded paired FCF calendar recovery

Implemented on `codex/fcf-paired-calendar-refresh` in `/private/tmp/slff-fcf-refresh`, task base `4d31b53`. Read the task brief, amended paired-calendar spec, relevant `CLAUDE.md` / Spain source rules, recovered primary diagnosis/manifests, and TDD / verification guidance. No full implementation plan was read. The builder check found no material missing requirement. Root explicitly approved source-local staging after inspection showed that both ordinary importer callbacks write their cache file before returning.

## Outcome and scope

`preberiBlok` now tracks which IDs were actually reused from cache during this call. Only a 240-fixture, 16-club majority block containing exactly one opposed pending pair in the same round is considered. Before any targeted read, it requires all 240 directed pairs to be unique, 30 valid rounds, no self-match, no unrelated disjointness fault, and exactly two otherwise valid seven-fixture rounds missing these same two clubs after excluding the target pair. Multiple implicated pairs or any additional calendar fault fail closed without speculative reads. Partial / 15-club blocks and scored pairs retain their ordinary behavior.

Deliberate scope interpretation for review: the amended spec says, "This is sourceconsistencyvalidation onlywhen recoveryengages, not a general historicalsource-policy rewrite." Accordingly, if no opposed **pending** same-round pair exists, this change returns through the existing block behavior rather than installing a general historical validator for unrelated-only faults. Once that pending-pair signature exists, every unrelated additional fault is checked before any targeted source read. The scored-pair preservation test also exercises this boundary. Root raised this distinction before commit; the exact spec wording and interpretation are recorded here for fresh review.

Only members of this pair actually reused from cache are re-read, through the existing `prenesi` callback and unchanged source URL / paced transport, sequentially, at most once per member. An initially provider-fresh member is never repeated; if both were already fresh the contradictory calendar fails immediately.

Each targeted download uses a fresh UUID-owned staging basename inside the existing FCF cache directory. This is necessary because both ordinary `prenesi` closures write before returning. It has no previous cached body to fall back to. Before canonical overwrite, validation binds the actual embedded RSC root route to the requested acta ID, exact majority competition/group/season, full normalized unordered club names, and the official club/category links attached to the corresponding header sides. No fuzzy alias or short club name is used. Only then does `beri` replace that member's canonical cache body. The owned staging file is removed in `finally` on success, invalid header, unknown/empty body, refusal or timeout; unrelated staging files are preserved. A hypothetical filename collision fails without taking ownership or deleting that existing file.

The same normal block records are rebuilt in place from the downloaded HTML with the existing header parser. Before return the entire 240-fixture block must contain the same 16 clubs, all 30 rounds with exactly eight disjoint fixtures covering all 16 clubs per round, 240 unique directed pairs, no self-match, and the target IDs still in opposite directions in distinct rounds. Merely moving the reciprocal to a distinct but overfull round is rejected. Source-supplied numerical scores pass through the normal parser; the header-only scored test cannot invent lineups.

The public `preberiBlok(koda, prenesi, options)` and source object APIs and returned block / record shapes are unchanged. The private `beri` gains only an optional validator argument. Regular callback filenames and cache behavior remain unchanged; the unique filename is used only for the targeted pair recovery.

Changed task files:

- `scripts/viri/fcf.mjs`
- `scripts/test-fcf-calendar.mjs`
- Three `scripts/vzorci/es-fcf-calendar-*.html` header derivatives listed below
- `package.json` (`test:sources` wiring only)
- `docs/viri/spanija.md` (brief FCF behavior/provenance note)
- This report

No importer, shared transport, source audit, active-refresh override, activation, pricing, position, club alias, database, workflow, or DFB file was modified. Existing canonical FCF fixtures are unchanged. No dependencies were installed. No subagent, provider request, live database operation, GitHub/Actions operation, secret read, push or merge was performed by this implementer. `npm test` was deliberately not run because it writes to the database and was explicitly prohibited.

## Logical and native request bounds

The additional recovery budget is **at most two logical forced reads**, sequentially, using only the members actually taken from cache in this call. Observed test cases:

| Initial state | Initial provider reads | Additional targeted reads | Result |
|---|---:|---:|---|
| Both mixed members cached | 0 | 2 (`4115262`, `4115382`) | Synthetic coherent source response accepted |
| Home already fetched normally | 1 | 1 (away only) | No repeat of home |
| Away already fetched normally | 1 | 1 (home only) | No repeat of away |
| Both already fetched normally | 2 | 0 | Contradiction fails |
| Healthy cached complete calendar | 0 | 0 | Ordinary return |
| Multiple implicated pairs / unrelated integrity fault | 0 | 0 | Fails before speculation |
| First targeted refusal / timeout / empty / unknown / identity mismatch | 0 | 1 | Stops before the next member, no stale fallback |
| Targeted responses remain same-round or break global round coverage | 0 | 2 | Fails before block return |

These are **logical** bounds, not a claim of two native requests. Existing `fcfFetch` / shared-transport behavior is byte-unchanged: one logical read can use up to eight native requests with default mixed empty-body/transient retries, so these two additional logical reads have an existing worst-case native bound of sixteen. Pure persistent empty bodies stop after the existing two native attempts. Caller-specific outer retry settings retain their existing bounds. This change adds no provider retry loop, alternate transport, proxy, endpoint, cache-wide invalidation, source-policy override or placement heuristic.

## Authentic evidence and derivative provenance

External diagnosis: `/private/tmp/slff-go-live-evidence/overnight/fcf-two-calendars-primary-diagnosis.md`.

Artifact root: `/private/tmp/slff-go-live-evidence/overnight/fcf-calendar-cache-39093991235/`.

Exact directories:

- OLD: `fcf-g13-dokazi-zapisniki-ES-k1od1-39053159080-1-39093991235-1`
- NEW: `fcf-g13-dokazi-zapisniki-ES-k1od1-39078000693-1-39093991235-1`

Both manifests identify extraction run `39093991235`, attempt `1`, extraction commit `ac93ed00c982af25bbcac267b4a6be0167b97f40`, exact matching requested/restored cache keys, cache hit `true`, restore outcome `success`, and complete/non-ambiguous selection. OLD key is `zapisniki-ES-k1od1-39053159080-1`; NEW key is `zapisniki-ES-k1od1-39078000693-1`.

Both manifests explicitly report `sourceCaptureCommit:null`, `sourceFetchTime:null`, `freshness:"unverified-historical-cache"`. **Cache mtime is not source capture time. Neither snapshot is claimed fresh.** Every original raw length and SHA below was independently checked before extraction.

| Exact original raw path relative to artifact root | Bytes | Original SHA-256 | Cached mtime UTC |
|---|---:|---|---|
| `fcf-g13-dokazi-zapisniki-ES-k1od1-39053159080-1-39093991235-1/acta-4115262.html` | 249811 | `88c12ba01c91d1fe09753382c2b4e7e49dceba9e297263089f8b7e6aa1d3c187` | `2026-10-13T07:41:19.233Z` |
| `fcf-g13-dokazi-zapisniki-ES-k1od1-39078000693-1-39093991235-1/acta-4115262.html` | 200599 | `020c46d0dce0676a2a2d2a1afa91f8c784842e81533a2d66cd397ab1116d8b9f` | `2026-10-17T23:02:55.996Z` |
| `fcf-g13-dokazi-zapisniki-ES-k1od1-39053159080-1-39093991235-1/acta-4115382.html` | 248761 | `948b50efbbcd854dfa7b8ef9481ab9a6e5ef878a5adaffa78ae292573f2df659` | `2026-10-13T07:48:05.944Z` |

Three privacy-trimmed authentic derivatives retain the resolved original `Acta del partit` banner, competition breadcrumbs, season/date/time spans, and verbatim root `c` route array, re-serialized in an extraction wrapper. No fixture round/date/name/result was changed. Each derivative has exactly five selected header roots, zero player / lineup props, and no referee, staff or venue section. Source clubs' public names and official club/category links remain attached to their original sides. Comments explicitly distinguish original raw SHA from the separate derivative SHA here; original raw bodies remain external.

| Derivative | Bytes | Derivative SHA-256 |
|---|---:|---|
| `scripts/vzorci/es-fcf-calendar-old-4115262.html` | 6657 | `efd29bc5adba8ef5ce2172763abf1a0b7128891930b8485b7b28e986d1c618fa` |
| `scripts/vzorci/es-fcf-calendar-new-4115262.html` | 6734 | `5e364b387094ec2af2926114a3651124621d8c8536d88d96973a19faced3a3fa` |
| `scripts/vzorci/es-fcf-calendar-old-4115382.html` | 6658 | `eecddc372196cc687aec5bc6545e33045a94dd1954590c2d0f6037646f303bb1` |

The authentic headers prove:

- OLD `4115262`: Calldetenes home → Sant Quirze away, R5, `2026-10-17`, `16:00`, pending, no numerical score.
- NEW `4115262`: same direction and official clubs, R20, `2027-02-27`, `16:00`, pending, no numerical score.
- OLD `4115382`: Sant Quirze home → Calldetenes away, R20, `2027-02-27`, `16:30`, pending, no numerical score. The NEW raw counterpart has the same original SHA as this OLD body; it is not a fresh observation.
- Calldetenes is official club/category `1630/28509104`; Sant Quirze is `1089/15545551`.

**The actual new round/date/time of `4115382` remains unknown.** The test's R5 response is explicitly SYNTHETIC, generated in memory from the authentic old counterpart with a controlled round change. The complete 16-club/30-round test calendar and generated opponents are explicitly SYNTHETIC controls; they are not a claim about a newly fetched primary schedule. Scored variants are synthetic parser acceptance controls too.

## TDD and verification evidence

All commands used existing installed dependencies and Node `/Users/jernejjankocica/.nvm/versions/node/v22.23.1/bin/node` (`v22.23.1`). Calendar tests replace native `fetch` with a throwing network prohibition and inject the ordinary `prenesi` boundary, including its actual write-before-return side effect; source parsing and cache filesystem behavior remain real.

1. **Real RED before product edit:** `node --test scripts/test-fcf-calendar.mjs` exited 1, with 31 cases, 5 passing and 26 failing. Authentic source receipt assertions passed. The core regression failed with actual targeted calls `[]`, expected `[4115262, 4115382]`, showing that the old implementation returned the two opposed pending R20 headers without targeted refresh. Log: `/private/tmp/fcf-calendar-red.log`. The scored test control was corrected before this recorded RED to produce a valid `1 - 1` header instead of replacing the middle dash too.
2. **GREEN:** focused final suite passed **32/32**, zero failures, cancellations or skips. Log: `/private/tmp/fcf-calendar-green.log`. The additional case verifies UUID uniqueness across failed recovery calls and preservation of unrelated pre-existing staging. During the initial GREEN pass, one test used the wrong expected public field (`izid` instead of existing canonical `rezultat`); that assertion was corrected to the existing contract, with no parser/output change.
3. **Final existing FCF transport/cache/evidence regression set:** `node --test scripts/test-fcf-calendar.mjs scripts/test-fcf-goals.mjs scripts/test-fcf-transport.mjs scripts/test-osvezi-fcf-predpomnilnik.mjs scripts/test-izvozi-fcf-predpomnjene-dokaze.mjs scripts/test-fcf-g13-predpomnjene-dokaze.mjs scripts/test-izvozi-fcf-g13-predpomnjene-dokaze.mjs scripts/test-zajemi-fcf-javne-dokaze.mjs` passed **296/296**, zero failures/cancellations/skips. Log: `/private/tmp/fcf-paired-existing-tests-final.log`. One existing Node MockTimers experimental warning. An earlier run before the UUID test addition also passed 295/295.
4. **Canonical and appearance comparison against task base:** loaded `4d31b53:scripts/viri/fcf.mjs` from a temporary sibling module, compared all **six existing FCF fixtures**, exact parsed headers, all **four canonical reports**, and all **102 appearances** using deep equality; all equal. Removed the temporary baseline module in `finally`. Log: `/private/tmp/fcf-calendar-canonical-comparison.log` (`{"base":"4d31b53","fixtures":6,"reports":4,"appearances":102,"canonicalAndApps":"deep-equal"}`). No original fixture changed.
5. **One full smoke run only:** `env PATH=/Users/jernejjankocica/.nvm/versions/node/v22.23.1/bin:$PATH VITE_SUPABASE_URL=https://primer.supabase.co VITE_SUPABASE_ANON_KEY=sb_publishable_ci_ni_pravi_kljuc npm run smoke` exited 0. **598/598 source tests**, then **3290 smoke PASS assertions**, zero FAIL lines, ending `VSE OK`. Log: `/private/tmp/fcf-paired-smoke.log`. This is the CI fake-public environment, not database credentials.
6. `git diff --check` passed. Self-review confirmed the source's `fcfFetch` implementation and shared transport/native retry bounds are unchanged, all seven audit implementations and DFB files are byte-unchanged, no override was added, and only task files are in the diff.

The focused cases cover mixed authentic heads, at-most-two cached member reads, either initial-fresh direction, both-fresh refusal to retry, healthy no-op, multiple pairs, unrelated moved fixture, duplicate directed opponent, invalid round, unresolved target rounds, globally overfull calendar after distinct target rounds, route/group/season/competition/full opponent/official side mismatches, missing acta, refusal, timeout, empty/unknown/challenge responses, canonical cache preservation, staging cleanup/ownership/uniqueness, partial and 15-club behavior, scored-pair nonengagement, unchanged return shape, and normal parser acceptance of a source-supplied scored variant.

Smoke warnings were expected existing Node experimental API notices for MockTimers and `stripTypeScriptTypes`, plus the existing development warning that the explicitly fake CI URL `https://primer.supabase.co` is remote. No failing test or unresolved implementation failure was observed.

## Residual source uncertainty and handoff

This completes the requested code/test/docs work, not primary-source repair or production readiness. No live source counterpart was fetched and no score, round/date/time, player or price was invented. The exact reciprocal primary gap remains unchanged. Per the controller's existing workflow, root must independently review, perform exact CI/merge/deploy, then run the one ordinary serialized active Tercera G4 import with `tekoca=true`, `cene=false`, and no FCF override. Only actual source coherence at that operation can establish repair; otherwise keep the group held. No activation or cache override was added here.
