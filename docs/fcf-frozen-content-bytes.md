# Frozen own-GitHub content byte transport

The current R1 pre-provider-zero reader and refresh800 archived execution runtime
loop use readFcfFrozenContentBytes({github,path,commit,expectedSha256}). It issues
byte DATA only. It changes no historical pins, code/data/clock facts,301/478/800
accounting, private proof brands, source or native admission policy.

The helper requires a fixed-repository relative path, literal40hex commit and
expected64hex SHA256 before its GET. Normal Contents API base64 must be canonical,
complete and match declared size/digest. Only the observed large-file shape
(encodingnone, exactly emptycontent, size>1MiB, valid metadataSHA1 and exact own
Git blob URL) can request the fixed own-repository git/blobs/<SHA1> endpoint once.
Blob metadataSHA1/size/base64, actual Git objectSHA1 and final expectedSHA256 must
all agree. No raw/download URL is fetched, and no retry/alternate host or missing
content skip exists. Supplied known URLs/links and extra URL metadata are checked
or refused; they never select transport.

Decoded bodies are capped at4MiB, tighter than the old R1 possible decoded range;
the existing6MiB encoded-character bound remains. CAP-SAFETY.json records local
size-only checks over every actual frozen R1 file and the current refresh runtime;
the largest is the1,620,161byte Baden policy that triggered this observed API
cutoff. Both complete closures fit4MiB. Oversized/ambiguous bodies HOLD.

The legacy G9 runtime reader, archived R1 witness JSON/digests and historical
runtime/code/data bytes remain unchanged. The current helper becomes part of the
new capture runtime closure and must be reviewed/deployed with that epoch. It
preserves immutable archived content authentication across later consumer epochs.

Focused source-free tests cover strict small contents, actual-sized large body,
R1 private zero-only accounting and refresh800 runtime integration; mutated bytes,
SHA1/size/SHA256, path/commit, malformed none/base64, bounds and foreign URLs hold.
The runtime fixture now includes actual declared sizes. The helper tests use the
existing test-fcf-g1-remainder wildcard, requiring no CI/package change. No live
ledger retry, football HTTP, source capture, SQL or operation is part of this fix.
