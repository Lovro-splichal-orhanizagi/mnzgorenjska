# German amateur season collection

The owner wants large country coverage and explicitly asks to keep building autonomously. Use the existing Node import architecture, bounded cheaper delegates, and a final independent review. Do not contact anyone, buy access, infer goalkeeper roles from shirts, or weaken current-report checks.

## Outcome

Build a reusable FUSSBALL.DE season collector around the working round, font and report parsers. It must collect every advertised round, bind every match to its real round and public source IDs, retain original bytes, and report precisely which individual reports are usable. A partial capture or unsupported report never establishes league readiness. Production identity persistence and activation follow only after a complete pilot demonstrates the data contract; collecting a season does not itself activate a league.

Existing support proves one complete report and a round page. A new ordinary public capture on 22 October 2026 also proves the same parser works on fresh round 9 of Kreisliga Mannheim, staffel `031EKNM2HG00000LVS5489BUVUR5FS5A-G`, with thirty advertised rounds and eight fixtures. Its two rotating fonts decode without guessing. Retained discovery evidence is under `/tmp/slff-large-countries-20261022/germany`.

## Transport

`createFussballCaptureClient({maxRequests, fetchFn, now, sleep, onAttempt, onDocument})` returns `read(url, kind)` and a snapshot of the request ledger. Explicit request budget is required, 1–4000 requests. Network requests are serialized with at least 6000 ms between starts, including fonts and CSS. Cache hits use only successful bytes from this client; no restored or live fallback after a stop.

Only HTTPS `www.fussball.de`, no credentials, port, query, fragment or arbitrary paths. Allow observed round, report, lineup, font CSS and WOFF routes. Manual redirects; no automatic following or retries. HTTP errors, authentication, denial, challenge, network failure, bad MIME, oversized/truncated bodies and failed persistence callbacks stop the client. Further requests, including cache reads after a terminal stop, fail. Every actual attempt remains counted, including failures. Timeout 30 seconds; HTML and WOFF maximum 8 MiB, CSS 64 KiB. No page scripts execute. Successful documents include original bytes, SHA256, URL, kind, MIME, status and capture timestamp.

## Discovery and season consistency

Consume only live, scoped HTML attributes; comments, scripts, templates, raw-text elements and attribute text cannot inject URLs or font evidence. Use original raw bytes for existing parsers. Require a unique canonical/OG page identity, exact staffel and requested season. Derive round links from the real bounded selector and lineup/font URLs from actual public page references. CSS may resolve only a matching field's WOFF on the same host.

Visit each advertised round once. Its season, staffel, selected round and complete round selector must agree with the seed. A fixture has exactly one primary round assignment. Extra postponed rows can refer only to a fixture established by the full primary inventory and must not silently overwrite contradictory dates, teams or scores. Keep stable source team and profile namespaces; do not manufacture numeric registration IDs.

Collect played reports only after the complete schedule is assembled. Require report identity, clubs, score, date, time and round to agree with the fixture. Reuse strict fantasy parsing, explicit goalkeeper proof, lineup/goal/substitution accounting and anonymous-yellow evidence. Unsupported or incomplete reports retain their source bytes and a typed reason with no fabricated appearances. Preserve ordinary anonymous yellow warnings and do not guess recipients. A source refusal stops traversal globally rather than becoming a per-report omission.

## Evidence and operation

CLI writes an append-only attempt journal, content-addressed original documents, a manifest and machine-readable schedule/coverage/statistics. It supports a bounded report sample and complete collection; sampling is explicitly incomplete. A fresh output directory is required. Offline verification checks file hashes and replays documents without network. Neither mode reads `.env`, accesses database credentials, registers a production provider or activates competitions.

Once a complete real pilot passes, continue with persistent source-identity mapping and the existing guarded import/release architecture. If real data exposes additional formats, add support only with retained authentic examples and independent expected results. No claim of 600 supported leagues follows from a sample or selector.

## Validation

Use authentic round 8/report/font fixtures plus the retained fresh round 9 fixture. Meaningful refusal tests cover denied requests followed by another request, concurrent calls, budget exhaustion, cross-host/redirect routes, wrong field fonts, changed selector/season, duplicate fixture rounds, rescheduling conflicts, missing documents and corrupted replay bytes. Existing FUSSBALL and DFB output regressions must stay green.
