# Six native/JS shared contract

Source policy `es-fcf-six-reviewed-history-v1`; registry `scripts/policies/fcf-six-reviewed-exclusions.json` is stable. IDs/hashes:

- es-ct-segona-g1-six-reviewed-2026-10-19-v1: fbe3dbba425837b28a5fd7f99fa170a249e169a2f84d6c17921f202f7b25c6d9
- es-ct-tercera-g2-six-reviewed-2026-10-19-v1: 69cf7d1406b1306ab1aa31413cdd37bf11b502e5f17f9cb7eab295502578fc52
- es-ct-tercera-g9-six-reviewed-2026-10-19-v1: 38eca907c6b0f4df03a989778099f00b356d03626895de3961bad5e266bd3912

4109404 has null sourceCompetitionId and observed scores, exact category5057/35522 versus5029/33592. 4118354 actual player group58161880, score3:1. No invented group ID.

Native packet schemaVersion3 kind `fcf-six-current-target-release`, closed outer keys identical oldv2. Rollout schemaVersion2 kind `fcf-six-current-target-rollout`, closed outer keys identical oldv1. Source evidence generic kind `fcf-missing-target-admission`, protocol `six-reviewed-continuation-v1`, maximumSourceGETs478, priorSourceGETs22, newSourceGETs global actual new spend, actualSourceGETs honest cumulative.

SQL interfaces:

- public.fcf_historical_six_prepare(text,jsonb)
- public.fcf_historical_six_apply(text,jsonb,text,text)
- public.fcf_historical_six_restore(text): beforeSha, saved SQL image only
- public.fcf_six_current_target_import(text,text)
- public.fcf_six_current_target_check(text,text,boolean default false): false checks, true activates in same transaction
- public.fcf_six_current_target_pricing(text)
- public.fcf_six_current_target_inventory(text,text[])
- public.fcf_six_current_target_receipt(text)
- public.get_installed_fcf_six_statistics_markers(bigint)

Six cleanup exact locked157 appearances18goals, unavailable6 including conversion of existing empty placeholder321663 to unknown-result4109404. Oldfour functions untouched and rejecting new packets. Native implementer owns migration20261019150000, native tests, generated types. JS implementer owns source/policy/nightly adapter/runtime closure. Root UI worker owns frontend/SSR.

Actual native correction (root read-only proof): report4109404 is unbound, while exact fixture321663 exists in round28708 with teams8575/8576,date2026-10-04,stored0:0,importedNULL,zapisnikNULL,old generic source URL4109388,vir_brez_izidaTRUE. Those zeros are placeholder values, not an official result. Convert this same row to pairedNULL/unavailable; retain240 fixtures. Before-image flags missing4109404 (report absence only) and empty4109404Placeholder:true; restore exact original row on rollback. No insertion or whole-fixture absence assertion. Root proof4109404-existing-placeholder-root-verification.json supersedes earlier absent-fixture assumptions.
