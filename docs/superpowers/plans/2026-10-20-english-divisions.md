# English divisions: reviewed candidate registration

## Scope

Register the 12 existing 2026/27 Isthmian, Northern Premier and Southern
League competitions in the explicit existing-league candidate inventory.
Keep the existing public, uncredentialed `isthmian` adapter and its stop
conditions. This change registers candidates only; it does not activate or
import them, establish league permission, or change source/deadline guards.

## Evidence and constraints

- Three courtesy notices were sent on 20 October 2026 and remotely accepted;
  this is not league permission.
- A capped source audit fetched 60 unique JSON pages for all 12 current-season
  codes. Parsed reports bound to their match IDs and 2026/27 season, scores,
  lineups and substitution minutes checked out. The only parser warning is a
  Grantham Town substitution in NPL Midlands report
  `gb6a590670ce9ef452b61f386d`.
- `Match N` deadlines require separate review: each division has rounds whose
  fixtures span more than three days, with maxima from 66 to 217 days.
- No archive retrieval, activation, production write or workflow dispatch is
  part of this registration patch.

## Implementation

1. Append the exact 12 production tuples and document the shared source
   contract in the candidate registry.
2. Permit `isthmian` in the existing source allowlist; keep explicit slug
   selection and unknown-slug rejection.
3. Pin all tuples and unknown-slug rejection in the existing selection test.
4. Record the audit, courtesy-notice status, parser warning and deadline
   caveat in `docs/viri/anglija.md`.

## Verification

Run `node --test scripts/test-vklop-obstojecih-lig.mjs` and confirm the
registry still contains every previously reviewed candidate plus exactly
these 12 English tuples.
