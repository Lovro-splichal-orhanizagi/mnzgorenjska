# German operational repairs

The owner approved the proposed operational repair sequence on 26 October. Implement the existing German refresh repair, supported public card formats and observed archive discovery. Ratings-first availability and a general current-season-only launch policy remain separate product decisions; this patch retains the present fantasy launch gates.

## Required behavior

- Current-season nightly DFB imports collect recognized report-parser failures and continue importing valid reports. Source refusal/transport faults remain fatal. Archive imports and activation validation retain their strict completeness rules.
- Failed reports retain exact source identity, URL, fixture binding, reason, original byte digest and observed time in a separate durable quarantine. Original HTML must remain unchanged. No guessed lineups, goals, roles, minutes or cards enter the database.
- Existing verified goal/appearance rows remain intact. A pending report must stay visibly incomplete and prevent settlement based on an apparently complete report. Reuse the existing `imported_at IS NULL` incomplete-report/market guard where its scope is proven; otherwise add a narrow explicit pending guard. Never mark unrelated or ambiguously matched fixtures pending.
- Successful reimport clears the pending state only after the ordinary importer finishes. A pending outcome is reported separately from technical failure; it does not cause an immediate whole-league repeat. Subsequent attempts target pending/new reports with bounded pacing and retry metadata.
- FUSSBALL card support uses observed closed event shapes and published participants/clocks. Anonymous ordinary yellows retain the existing supported policy. Missing red-card recipients remain a typed hold; implementation must not infer them. Native conversion must preserve supported card counts and authoritative red-clock intervals.
- Archive discovery reads the exact current league's live season selector, normalizes `25/26` to `2025/26`, and admits only observed links. Schleswig's two retained independent round pages advertise `02TC3RCRHK000004VS5489BTVVQ0O654-G` for 2025/26. Its contents still require independent source validation. No staffel IDs are constructed from the current one.

## Constraints

Use clean linked worktrees. All production mutation remains in Actions. Do not read `.env` or credentials, overwrite the user checkout, send email, contact another region through a refused proxy, or reset existing source request caps. Implementation and replay tests use retained bytes first. Any live collection needs an explicit recorded scope within the remaining authorized budget.

## Acceptance

An invalid/valid/invalid/valid DFB run imports the valid reports and preserves pending evidence without guessed statistics. Retry scheduling distinguishes pending data from infrastructure failure. Genuine source faults stop collection. Published card cases round-trip from original event shape into native stats; anonymous red cards fail closed. Both retained Schleswig selectors independently produce the same archive tuple. Existing inactive completeness and activation gates continue refusing incomplete input. Required CI and one independent integration review pass before merge/deployment.
