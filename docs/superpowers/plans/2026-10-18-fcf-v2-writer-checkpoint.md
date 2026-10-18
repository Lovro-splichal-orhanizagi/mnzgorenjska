# FCF v2 writer implementation checkpoint

This is the source-closed implementation of the approved755 design, ready for
independent review. It adds no operational capture, dispatch, cleanup or launch.
Root owns integration, generated types, CI and every production action.

The dedicated migration is `20261018232000_fcf_current_target_release.sql`, using
root's232000 reservation after Germany231000. No old migration was edited. It
keeps the common exact-four cleanup/marker/catalog guards and common same-XID
activation authorization. The new cleanup wrapper records the existing180200
operation's original SQL result atomically; a lost-response retry returns that
result rather than deleting again. Target receipts also retain the exact original
import envelope/SHA, so recovery does not depend on a missing first-import artifact.

The pipeline authenticates Task5 source commit A and its already consumed shared
parent separately from writer commit B. All4 genuine originals remain distinct
from the3 seed originals. Native16/full240 mapping bootstraps14 G1/12 G9 bindings
from actual source/canonical identity before the private bind check. All normal
rows use registration IDs, explicit match goalkeeper roles and exact statistics;
country-scoped privacy protection remains enforced in memory and under SQL locks.
The source-closed child preloader requires absent cache and actual reauthenticated
raw proof bytes. Ordinary labeled field estimates and unchanged pricing calculation
remain in use; no positions are invented to make a squad pass.

Workflow modes now expose explicit original/approval staging, mapping, exact
prepare/apply, import, price, check, activate and readback-only recovery. The default
remains cache-export. Only source-free seed/approval/originals staging has the
bounded draft-access permission; source jobs have no DB authority. Writer reads
use the existing localhost5432 SSH-tunnel pattern and explicit READ ONLY/ROLLBACK.
Each retained stage authenticates its own run/job/attempt/commit. Original target
envelope provenance stays unchanged when a later stage has another reviewed main
commit. G1 users never require another cleanup or invalidate G9's selected proof.

Focused evidence (logs in root's `rollout/spain` directory):

- `native-full-target.log`:48/48, zero skips; full native projection and same-date
  cross-club conflict checks, plus the existing native identity/privacy regressions.
- `writer-rollout-private.log`:5/5, zero skips; both complete actual branded
  G1/G9 rollout/replays with genuine retained originals and synthetic normal source
  bodies, capture A/writer B, same consumed parent, G9 after active G1 inventory.
- `writer-child-private.log`:3/3, zero skips; actual child reauthentication, packet
  memory reads, blocked foreign/dotted source routes and lost-environment refusal.
- `writer-actions-private.log`:12/12, zero skips; genuine all4 pack/stage descriptors,
  actual GET-only source metadata assembly/reader admission and stage record checks.
- `target-sql-final.log`:3/3 top-level tests, zero skips; rolled-back complete cleanup,
  native G1/G9 imports/bootstrap/idempotency, varied prices/legal15/official R6,
  canonical/cache/provenance/price/deadline/unknown-reference mutants, common
  transactional activations, G1 users before G9, immutable cleanup/result recovery,
  private ACLs and actual two-session phantom-write exclusion.
- Focused missing-first-import recovery test:read-only actual envelope recovery,
  no source/claim/draft request, no mutation and `canonicalVerified:false`.
- `writer-final-public.log`:22 pass,5 explicit private-input skips, zero failures.
  Genuine private positives are separately covered above. Both workflow YAML files
  parse with Ruby YAML; Node syntax checks and `git diff --check` pass.

The private fixtures use genuine retained4 marker bytes and original timestamps;
all normal pages, HTTP responses, GitHub metadata and football database rows in
tests are synthetic. No FCF GET, claim creation, production DB action, Actions
dispatch, GitHub write, push or PR occurred in this work. Unchanged broad source
suites were not repeated. Main integration/CI and fresh independent review remain
required. Actual source failure, absent raw240 proof or expired source clocks still
holds the corresponding target. G2/Calonge remains held; no fifth exception or
archive data was introduced.
