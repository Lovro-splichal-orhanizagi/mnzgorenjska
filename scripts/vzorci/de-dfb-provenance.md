# Official DFB public HTML fixtures

Captured by the parent agent through ordinary public browser navigation on
2026-10-16. No login or protected endpoints. Files are full HTML snapshots.

| File | Official URL | SHA-256 |
| --- | --- | --- |
| de-dfb-2425990.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/1-spieltag/fc-rot-weiss-erfurt-bfc-dynamo-2425990 | 59de33e3ac5bdb652345479996890a10586894b91ca553c07f84ae25d3d2efc0 |
| de-dfb-2401894.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/2/bfc-dynamo-fc-rot-weiss-erfurt-2401894 | 8824fda6ef4dd9ea793b0ae7822dd00267a53fce191ee4783c4b5a97193f6bb9 |
| de-dfb-team-current.html | https://datencenter.dfb.de/competitions/regionalliga-nordost/seasons/2026-2027/teams/bfc-dynamo?datacenter_name=datencenter | 89a7266957a3e25d494ec08281ec586dbf4b4500f9b613868938f8cd378b9068 |
| de-dfb-2401912.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/4-spieltag/bfc-dynamo-zfc-meuselwitz-2401912 | 023a6da69daa9cc850609a55a8c136d4ebb2f0db983b00bb8b0a6caba1b561cd |
| de-dfb-2401938.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/7-spieltag/hertha-bsc-ii-bfc-dynamo-2401938 | 63475928f9be547b37873e90879a1caf195f4cfec9e14d897cc25b43702b2ecd |
| de-dfb-2401995.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/13-spieltag/bfc-dynamo-fc-eilenburg-2401995 | 8ddcb4258e4e692e6f133901c443a6e867c41a4491d806236e5f53af1e394668 |
| de-dfb-2401965.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/10-spieltag/vsg-altglienicke-bfc-dynamo-2401965 | 65f6233af3eeda4fbf98dc1d794feba4c77eb5db0f634396357b9c4ea606d4ce |
| de-dfb-2402004.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/14-spieltag/1-fc-lok-leipzig-bfc-dynamo-2402004 | 109096a0e5d67bba4655b2cbaabf21ff3bef21a95c789f889d2882b2173ec566 |
| de-dfb-2402013.html | https://datencenter.dfb.de/datencenter/regionalliga-nordost/2025-2026/15-spieltag/bfc-dynamo-fc-carl-zeiss-jena-2402013 | 00bb89b45e14c5bd175806d97301c30445ffc682ff2a16abc5a02ac945be7110 |

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

Goalkeeper policy: `(T)` is the explicit official marker (`vratarVir: 'oznaka-T'`).
A substitute without this marker has unknown goalkeeper status (`vratar: null`),
whether the bench table is present or absent. If the official substitution pair
explicitly replaces a player already established as goalkeeper, the incoming
player receives the on-pitch role with `vratarVir: 'menjava-vratarja'`. This is
inference from the official pair, not an independent roster position or a jersey
guess. Contradictory markers producing two active keepers reject the report.
An inferred reserve role cannot establish a club's explicit starting-keeper gate.

Archive 2401912, 2401938 and 2401995 publish bare `Eigentor` before/after
the scorer, with an ordinary goal icon on the beneficiary's side. The scorer
belongs to the opposite official lineup; score progression verifies attribution.
Archive 2401965 groups a player and coach under one shared yellow icon.
Archive 2402004 groups two named players with two ordered card icons.

Dismissal remains permanent across pitch/bench state. Entry after dismissal,
cards after dismissal and duplicate unpaired cautions reject the report.
Unused carded reserves retain zero-minute disciplinary records, with no
invented keeper status or clean sheet.

Archives 2402004 (Pestic) and 2402013 (Shcherbakovski) publish a `yellow-red`
card without separately publishing the earlier caution. The official
[DFBnet Spielbericht handbook, section on yellow cards](https://portal.dfbnet.org/fileadmin/content/downloads/handbuecher/Spielbericht/151021_Spielbericht-Handbuch-Vereine-Schiedsrichter.R5.50.pdf)
states that the system detects the second yellow and displays Gelb-Rot with
dismissal. Thus exactly one prior caution is certain. When absent, it is
represented as `minuta: null, izpeljanIz: 'drugi-rumeni'`, with an explicit
`opozorila` entry. No prior minute is invented. When the first caution is
explicit, it is retained once. The real dismissal minute is always preserved;
source event counts and duplicate-section comparison exclude derived cautions.

`test-dfb.mjs` additionally constructs an explicitly synthetic 18-team double
round-robin using the captured row schema to test bounded discovery and
deduplication. It is not represented as a fetched official season.
