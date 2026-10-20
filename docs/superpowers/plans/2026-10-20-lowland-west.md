# Lowland East and West candidate registration

## Scope

Append the reviewed production tuples for `gb-lowland-west` and
`gb-lowland-east` to the existing explicit-candidate registry. Both share the
existing `lowland` source route; do not change refresh scope, readiness rules,
deadlines or native guards.

## Evidence

- Exact tuple: ID 898, source `lowland`, code
  `slfl/2026-2027/54193424`.
- Exact tuple: ID 897, source `lowland`, code
  `slfl/2026-2027/54193157`.
- The source documentation records Lovro's written capture permission from
  October 2026. Continue using the public adapter's 3-second pacing and stop
  conditions; do not retry or bypass refusals.
- Two persisted name-collision warnings protect distinct players appearing
  for opposing clubs in the same report. Names are initials as provided by the
  source; preserve the separate player links and warnings without inferring
  full names or merging records.
- Five October 17 fixtures still need ordinary import/publication review.
- East's database snapshot has 238 current fixtures, 77 imported and eight
  October 17 fixtures without reports; the documented pricing route is current
  season only because no archive exists. This is not an activation claim.

## Changes and verification

1. Add the shared source contract and both exact tuples, preserving all 77
   previously registered tuples.
2. Add `lowland` to the candidate selector and test exact selection plus
   unknown-slug rejection.
3. Document collision review and written permission without claiming
   readiness.
4. Run `node --test scripts/test-vklop-obstojecih-lig.mjs`.
