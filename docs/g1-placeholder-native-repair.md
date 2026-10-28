# G1 exact legacy placeholder repair

This changes only the undeployed `future-g1-after-failed-g1-v1` native path. The retained DA cleanup before-image contains the full G1 calendar but the unique approved4109409 fixture has a NULL report ID, generic first-report URL,0:0 placeholders and `vir_brez_izida=true`. Requiring a preseeded report ID blocked that actual state. Historical native IDs in the diagnosis are evidence for a fresh recheck, never implementation constants.

## Closed binding contract

`buildFcfG1NativeSupplementBinding({data,databaseInventory})` retains its old already-keyed binding. An exact uninstalled legacy row adds one optional closed member:

```js
prelaunch: {
  kind: 'exact-legacy-placeholder-v1',
  beforeImageText, // JSON.stringify of the entire current17-field native match row
  beforeSha256    // SHA256 of those exact UTF8 text bytes
}
```

It resolves both native clubs from persisted ordinary report/round/date/source-club+category side anchors in the authenticated full240 source, then requires exactly one existing G1/2026/27 round3/date/home/away row. It does not use display-name fallback or historical native constants. The whole row must have the precise retained legacy shape: NULL report/source_round/source_phase/imported timestamp, generic4109388 URL, scores0:0, true placeholder flag, false forfeit, available status, NULL reason and empty warnings. The target must be inactive. Missing, ambiguous, conflicting or differently populated rows HOLD. Existing outer private capability, same final writer, fresh source/inventory clocks and full-calendar gates remain authoritative.

No packet version changes: packet5/rollout4/activation5 remain unpublished. The optional member is included in packet and rollout hashes and is checked identically by SQL. Once installed, the stored marker's original binding is reused, including its original prelaunch text; later current state cannot rewrite it. `createFcfFutureTargetDatabase().inventory` adds a fixed G1-only read of service-role RPC `get_installed_fcf_g1_supplement()` so later packet replay can carry that original binding. The RPC independently performs readback.

## Atomic SQL transition

Supplement validation preserves exact fresh canonical/source identities and checks bounded closed before-image text/SHA plus full actual-row equality. The existing import RPC acquires target/dependency locks before validation. The installer locks the actual row, rechecks round/teams/date, unique existing tuple, target inactivity, report collision and full before-image equality. Complete dependency projection must show zero individual/card/user dependencies and, for the placeholder branch, zero round score/user/lineup/roster/transfer/chip dependencies.

Within the same transaction it records the full before-image and dependency snapshot, inserts the separate authorized marker, assigns `es4109409`/canonical URL/source_round3, clears the placeholder flag, sets both scoresNULL/imported_atNULL/unavailable reason, and records/readbacks the receipt. There is no standalone public preseed or fixture creation path. Missing-marker direct writes remain forbidden. Original six policies/markers/APPLIED DA cleanup are compared unchanged; the separate receipt retains the exact original row. Existing keyed path and pure paired-NULL CHECK stay intact.

The pure CHECK helper now grants only EXECUTE to `service_role,authenticated`, matching the existing original six CHECK-helper migration. This is necessary even for ordinary non-NULL score writes. Private schema/table access, all mutation helpers and anon remain closed; the service-role-only readback RPC is unchanged. No old six/deployed migration was edited.

## Focused verification

Test-first mapper regression failed at the expected missing persisted report-anchor HOLD; CHECK ACL regression failed at missing writer EXECUTE. Final focused runs pass:2 JS packet/placeholder controls (including installed binding replay),1 full240 synthetic owned-clone import test,1 actual service-role ordinary INSERT/UPDATE/upsert+NULL refusal/ACL test, and1 fixed readonly getter test. The full import starts with the complete retained-shaped NULL-anchor/generic-URL/virtrue row, never a preseeded ID. Twelve mutation probes must successfully apply their drift, then receive a guarded import refusal and roll back to the exact row with no marker; they cover missing row, date, URL, round, flag, score, side, anchor, report collision, warnings and score dependency. A direct missing-marker NULL transition is independently refused. Successful import/readback retains full before-image, NULL/zero individual state and original six/DA afterimages. All SQL is explicit BEGIN/ROLLBACK, no clock/trigger/privilege/constraint bypass, on the exact disconnected owned clone verified before each phase. Initial fixture interpolation/required-points errors were corrected before the final pass; no production behavior was inferred from those fixture failures.

Evidence is in `E/evidence/g1-placeholder-native-repair/`, with the actual snapshot diagnosis in `E/evidence/g1-4109409-retained-native-mapping-diagnosis.{json,md}`. New source/native fixtures are explicitly synthetic and establish no actual rollout authority. All31 German producer bodies and both old4e fingerprints are byte-identical. No source/network/GitHub/prod operation occurred; spend stays60/478, planned fresh240 gives300/478. Independent review and fresh hosted readiness/mapping/dependency checks precede deployment/capture/native use.

## Scoped P2 correction: JSONB getter ordering

The independent review of32b22068 found that returning `installed.binding` copied PostgreSQL JSONB object order into byte-exact packet replay. A focused regression models JSONB key ordering by UTF8 key length/byte order, passes that response through the actual fixed database getter adapter, and retains the genuine private source fixture. Both keyed and placeholder installed replay failed before correction.

The installed branch now reuses the freshly constructed canonical identity/fixture/native fields and explicitly reconstructs the closed prelaunch member in its original field order. It validates prelaunch kind, exact keys, bounded before-image TEXT/SHA, full legacy row shape and native/date identity. Before-image text is never parsed and reserialized for output; its original bytes and SHA are retained unchanged. Extra typed fields, foreign identities and text/hash drift reject. Whole packet serialization and byte/SHA equality remain unchanged. No SQL, ACL, protocol version, source producer or nightly-import overlay was changed in this scoped fix.
