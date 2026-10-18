# FCF writer GitHub artifact Accept correction

Parent recovery checkpoint: `94fee636`. Root reproduced HTTP415 from the Actions artifact ZIP endpoint when the generic binary helper sent `Accept: application/octet-stream`.

The writer GET helper now uses `application/vnd.github+json` for binary GitHub API requests except the fixed repository's `releases/assets/` endpoint, which retains `application/octet-stream`. The same fixed-repository path validation, GET-only invocation, timeout, buffer limits, binary Buffer result, metadata JSON parsing and error boundary remain. The helper is exported with the existing process executor as its default; the test supplies a local fake executor to inspect the actual `gh` request arguments without any request.

RED: the process-boundary regression observed `Accept: application/octet-stream` for `/actions/artifacts/12150332401/zip` instead of the required JSON Accept header. Evidence: `rollout/spain/writer-artifact-accept-red.log`.

GREEN: `node --test scripts/test-fcf-target-actions.mjs` passed **4 public tests, zero failures, 3 explicit private-input skips** (2.8s). The regression checks the artifact ZIP header, unchanged release-asset header, exact GET arguments, binary bytes, metadata JSON parsing, timeout/buffer/stdio settings and rejection of another repository, traversal, fragment and whitespace before executor access. Evidence: `rollout/spain/writer-artifact-accept-green.log`. Node syntax and diff whitespace checks passed.

The genuine-byte recovery suite had already passed **8/8 with zero skips** at `94fee636`; it was not redundantly repeated for this transport-only header delta. SQL, workflow, permissions and source protocols are unchanged. No provider request, GitHub request/write, Actions dispatch, production operation or SQL execution occurred. Actual transport verification remains root-owned.
