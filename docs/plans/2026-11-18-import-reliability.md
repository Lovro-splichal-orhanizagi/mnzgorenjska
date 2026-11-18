# Recurring Croatia and Catalonia imports

Approved scope: restore recurring HR and Catalonia, verify Greece, research Czech/Polish API prices, continue Spanish expansion checks.

## Design

- Keep the frozen November incident collectors and replay restrictions intact.
- Use a separate recurring HNS envelope: fresh 14-day window, reviewed active league inventory, immutable originals, resumable collection and a shared rolling request ledger. Retain unavailable/invalid reports as visible holds; never invent lineups or points.
- Avengers HQ runs a scheduled collector with no database write credential. A restricted SSH upload key can write only its private staging directory on SLFF. GitHub pulls a hash-bound snapshot and performs existing native, idempotent writes and score recomputation.
- GitHub checks collector freshness even when there are no reports. Missing, stopped, expired or incomplete batches must not look green. Terminal partial captures can replay with explicit admission; a separate health job remains failed until the full inventory completes. New batches prioritize previously unfinished leagues. Historical HNS remains excluded from the ordinary internet fetcher to avoid duplicate source traffic.
- Catalonia stays on ordinary GitHub HTTP if fresh diagnostics work; repair cached redirect handling without relaxing source identity checks.
- Greece changes require concrete evidence of the unavailable report shape; arbitrary parser failures cannot be ignored.

## Implementation and evidence

1. Regression-test recurring snapshot admission, date/age constraints, body hashes and native fixture protections; implement isolated recurring mode.
2. Add recurring manifest/collector with offline tests and retained shared budget/refusal state.
3. Add restricted publishing and GitHub replay schedule, install the HQ launch agent, verify captured artifact and real worker readback.
4. Integrate independently tested Catalonia/Greece fixes and verify actual runs.
5. Record provider pricing evidence and remaining expansion limitations in the operator handoff.

Validation uses scoped offline tests and explicitly selected production readbacks. The blanket npm test suite includes database-writing scripts and is not appropriate here.

## Durable processing

GitHub reads the oldest immutable batch without an import-and-scoring receipt. A receipt is written only after all three native import shards and their scoring RPCs succeed. Retries can replay retained originals for seven days, with unchanged creation timestamps and full body/native-binding checks; older failures stay visibly blocked for review. Publishing heartbeat-only changes does not enqueue duplicate work.

HQ checks hourly, resumes partial batches, and begins a fresh source scan only when the previous complete batch is at least twelve hours old. At most950source requests per rolling24hours, with10seconds spacing. OnHTTP5xx, defer onehour; refusals/challenges remain latched until review. The Mac's old ledger is fenced after migration to prevent duplicate collectors.

The live window is14calendar days. Older unresolved holds remain in the durable ledger and GitHub summary for manual repair; this change does not claim to backfill arbitrary history or automatically correct already imported source edits.
