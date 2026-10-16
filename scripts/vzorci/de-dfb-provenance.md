# Official DFB public HTML fixtures

Captured by the parent agent through ordinary public browser navigation on
2026-10-16. No login or protected endpoints. Files are full HTML snapshots.

| File | Official URL | SHA-256 |
| --- | --- | --- |
| de-dfb-2425990.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/1-spieltag/fc-rot-weiss-erfurt-bfc-dynamo-2425990 | 59de33e3ac5bdb652345479996890a10586894b91ca553c07f84ae25d3d2efc0 |
| de-dfb-2401894.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/2/bfc-dynamo-fc-rot-weiss-erfurt-2401894 | 8824fda6ef4dd9ea793b0ae7822dd00267a53fce191ee4783c4b5a97193f6bb9 |
| de-dfb-team-current.html | https://datencenter.dfb.de/competitions/regionalliga-nordost/seasons/2026-2027/teams/bfc-dynamo?datacenter_name=datencenter | 89a7266957a3e25d494ec08281ec586dbf4b4500f9b613868938f8cd378b9068 |

`de-dfb-2426054.html` is the parent's additional ordinary public capture of
https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/8-spieltag/bfc-dynamo-sv-tasmania-berlin-2426054 .
Its penalties have the ordinary `goal--goal` icon and explicit `(Elfmeter)` text.
Bekdemir's 90+4 event has the `card--red` icon. Grigoriadis receives a yellow
card at 28 while still on the bench and enters at the halftime substitution.

Archive report 2401894 publishes starting XIs but no bench table. Played
reserves are explicitly named by incoming substitution segments; their jerseys
are unknown. Current report 2425990 publishes both starting XIs and full benches.
Public profile links vary independently of names and are not registration IDs.
Identity consistently uses public name + official team slug, rejecting
same-team name collisions; this matches the existing importer's no-registration
path. Unknown/anonymous names or unsupported event types reject the report.

`test-dfb.mjs` additionally constructs an explicitly synthetic 18-team double
round-robin using the captured row schema to test bounded discovery and
deduplication. It is not represented as a fetched official season.
