# Baden dual-epoch consumer compatibility

The installed Baden source catalog remains bound to derived run `40990176474`
at source head `e925dcbcd8b087dd3f6ec4c58a7cc07e515ae75d`. Its M781 manifest,
source runtime certificate, and original `currentFreshUntil` lease remain
immutable. This compatibility path applies only to the native consumer; it does
not rerun or rewrite the catalog installer.

The consumer checkout is separately bound to its current `main` SHA. Before
the source reader issues a capability it verifies the root manual first-attempt
consumer run, current `main`, the successful first-attempt push CI run and all
ten CI jobs, the exact current consumer entrypoint/workflow bodies, and the
served `slff-commit` marker. It then verifies the old derived run, artifact,
certificate, pack, source proof, original runtime file set, and live source
lease at the original source head. The only source-runtime byte difference
allowed is the current composition reader itself; the remote e925 reader bytes
must match the fixed SHA and the source certificate's original runtime map is
computed from those remote bytes. All other source runtime files remain exact.
The separate `scripts/policies/baden-native-dual-epoch-compatibility.json`
pins the exact current reader body hash, avoiding a self-referential hash inside
that source file; the file itself is authenticated at current `main` before
the compatibility path is accepted.

The native locator stores `consumerHead` separately from `derivedHead`. The
bulk consumer checks out `consumerHead`, then reauthenticates the exact e925
proof before creating its private runtime context. Neither head extends the
source lease. Any unknown source run/head, changed source dependency, changed
compatibility body, current writer identity mismatch, or expired lease remains
a HOLD. Source parsing and rebuilding still use the e925 producer closure; the
current reader changes only the live-main comparison to compare against the
separately authenticated consumer head.

The compatibility exception is intentionally limited to this one source
run/head. Any further compatibility transition requires a new reviewed route
and cannot be inferred from this exception.
