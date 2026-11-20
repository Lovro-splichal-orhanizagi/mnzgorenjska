# Retained FCF unmatched-candidate audit

For SLF-595, weekly focus goal 2. This is a diagnostic for the 163 distinct
`no unique exact pending fixture` candidates from scheduled run 44693766098,
ES job 136145542414. The target list is transcribed from the issue document
`cto-evidence-2026-11-20-fcf-extract`; it is not the set of 203 unresolved fixtures.

After independent QA and green CI, CTO can dispatch
`.github/workflows/slf595-fcf-hold-audit.yml` once using existing access.
It restores only `zapisniki-ES-k1od1-44693766098-1`; a missing/exact-key mismatch
fails, with no fallback cache or source fetch. Do not replace the key if evicted.
The existing SSH tunnel pattern reaches PostgreSQL; the script uses a SELECT
in a repeatable-read, read-only transaction with 25s statement / 3s lock limits,
40s process limit and rollback. It queries the selected leagues' 2026/27 fixtures
plus globally owned target reports (including other leagues/seasons). More than
30,000 rows fails without classification. No appearances, players or users are queried.

The source reader is synchronous and local. Current-page redirect evidence must
bind numeric report ID, URL and SHA256 before parsing with the existing source
parser and the recurring reader's unchanged completeness/identity predicates.
Missing captures, stale redirects, parser/finality holds and invalid identity
remain explicit evidence gaps. Cache bytes are neither refreshed nor rewritten.

Only `rezultat/summary.json` is uploaded: report/fixture IDs, league slugs,
hashes, equality booleans, fixed labels and counts. Team names stay in process
memory. The SQL contains only fixed inputs and is not uploaded. psql and parser
errors are not echoed. A successful run means the diagnostic completed, not
that all imports recovered. Read source_state as well as classification.

Interpretation:
- `already-imported-exact`: a current completed fixture owns this report and
  matches its retained tuple. This can explain warnings from broad discovery.
- `unique-exact-pending-now`: one current pending tuple matches the candidate
  gate. This is not full writer eligibility: source URL, source policy, live
  race checks and other writer guards have not been waived or run.
- Multiple exact pending tuples, conflicting ownership, completed other-report
  tuples and walkovers remain review/hold states. No automatic correction.
- `no-exact-native-fixture`: inspect equality booleans on same-round/date rows;
  do not infer a missing fixture or use fuzzy matching.
- Missing/unproven retained evidence is not an unpublished-report verdict.

The fixed 21-day window is 30 October through 20 November 2026, inclusive,
as in the original Madrid-local run. Database state is read at checked_at,
not reconstructed at 07:16 UTC. Later edits/imports can explain differences.
The cache is bound to the run's saved key, but individual bytes may have been
cached before that run. Neither timestamps nor hashes prove the database state
at the earlier run. Other candidate categories and all 203 unresolved fixtures
still need separate accounting; do not add these denominators together.

Offline check:
`node --test scripts/test-slf595-fcf-hold-audit.mjs scripts/test-fcf-current-fixtures.mjs`
The new test is also in `scripts/test-dodatni.txt`. No blanket npm test.
Return the sanitized summary on SLF-595 to Import Fixer; keep the incident open.
Remove the one-off workflow when the incident closes.
