# HNS import recovery

Restore Croatian imports after the November 10 Cloudflare refusal. A local
curl_cffi 0.17.0 Chrome-profile GET retrieved and parsed the HNL schedule and
Varaždin–Dinamo report; plain curl and a custom SLFF user-agent were refused.
A GitHub-hosted two-page probe must pass before enabling production imports.

Use an explicit `SLFF_HNS_TRANSPORT=curl_cffi` runtime setting, a pinned Python
helper and the existing Node parser/response guards. Keep native fetch as the
unset default for offline evidence consumers. Chrome-profile requests use the
library's consistent default headers, no browser cookies, proxy or redirect.
Only existing public competition/report URLs are accepted. Abort, timeout,
non-HTML, challenge, refusal and process failure must stop the source.

Keep three Croatian buckets and their cache keys. Increase the source delay
from 500 ms to 5 seconds (15 seconds per request per bucket). Run Croatia at
05:17 UTC daily and 17:17/21:17 UTC Friday–Sunday, with the existing weekday
fallback. Other countries retain their schedules. A manual country filter
allows HR-only recovery. Serialize HR manual readers against nightly readers.
Use the existing incremental, idempotent importer and score recomputation;
never reprice active teams or modify closed historical women packets.

If GitHub refuses the probe, retain the HNS exclusion and report that network
limitation rather than claiming production recovery. Record evidence in docs.
