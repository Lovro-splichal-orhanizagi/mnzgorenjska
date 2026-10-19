# Shared FUSSBALL.DE offline capability pilot

This command processes up to ten explicitly selected saved league captures with
the same round/report parsers. It makes no provider requests or database writes.
It is not a registered importer and cannot activate leagues.

```sh
node scripts/preveri-fussball-kohorto.mjs scripts/vzorci/de-fussball-cohort-pilot.json /tmp/fussball-pilot-result.json
npm run test:fussball
```

Use a new output filename each time; previous evidence is never overwritten.
Exit 3 means the declared inventory has holds, 1 means configuration/output
failure, and 0 means only that the declared capture inventory passed. Every
result retains `seasonCoverageVerified:false` and `activationEligible:false`.
Even an inventory success does not establish full source-season coverage,
freshness, roster readiness, prices or a future fantasy deadline.

The version-1 index contains `leagues`, each with a unique `key`, `staffel`,
`season`, `rounds` and `reports`. Round entries contain `page` and `fonts`;
report entries contain `id`, `main`, `lineup` and `fonts`. Every asset is
`{file, sha256}`, resolved relative to the index. `fonts` points to the existing
font manifest; its font paths resolve relative to that manifest. Report font
manifests must bind both canonical report and lineup URLs to the selected ID.

The auditor compares selected seasons and advertised round inventories,
deduplicates fixtures, checks report teams/date/time/round/score against the
saved schedule, and reports missing/unsupported evidence separately. Bad files
or malformed per-league metadata hold that league while siblings continue.
Ambiguous duplicate league or report identities reject the cohort configuration.
No unknown event variant or missing statistic becomes a guessed zero.

## What the authentic sample establishes

The checked-in pilot is one Mannheim capture: round 8 of 30 advertised rounds,
ten distinct fixtures including two rescheduled fixtures, nine published results
and one full saved report. The expected outcome is HOLD: 29 missing round pages,
eight missing reports among the captured played fixtures, one supported report,
30 appearances and three unattributed ordinary yellow cards. Missing reports
are a lower bound until all round pages are captured. Synthetic regression tests
are not additional observed leagues or source templates.

The saved capability probe at
`/private/tmp/slff-go-live-evidence/overnight/fussball-probe/findings.md`
records the live collection stop after published source restrictions. This
offline tool neither resumes that collection nor contacts the provider. Testing
several authentic leagues requires an approved data-access route and retained
captures. Independent full fixture coverage, additional authentic event formats
and production identity/import bindings remain required for the larger rollout.
