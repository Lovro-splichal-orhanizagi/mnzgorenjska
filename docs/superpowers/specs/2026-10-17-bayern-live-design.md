# Bayern verified report repairs and activation

The user wants Germany and Spain live and authorizes implementation, review, merge, deployment, and verified activation. This subproject makes Bayern’s two existing captured seasons fully usable and follows the existing guarded release process. Spain is pursued independently. No further user approval is needed for these authorized operations.

Bayern has 434 accepted reports out of 438 played reports: 304/306 archive and 130/132 current. Primary club and federation evidence now resolves the four exceptions. Preserve original source bytes, exact raw clocks, names, and final/half-time scores. Never infer an event or skip a report.

## Required repairs

1. Use the existing exact-match score-correction registry:
   - Match 2401658: Sturm 45′ must label 1:1; Fischer 45+6′ must label 2:1.
   - Match 2401812: AbuElHaija 45′ must label 1:0; Maboulou 45+2′ must label 2:0.
   - Match 2425106: Zimmerer 90′ must label 2:1; Muteba 90+4′ must label 3:1.

   Match metadata, the full source goal sequence, and both event sections must retain existing exact-state guards. Each correction retains the original published value and primary evidence URLs, hash, and UTC.
2. Support the actual 2425105 grouped-goal format: either one shared supported goal icon, or exactly one supported icon per distinct event segment, in published order. Preserve every source goal and clock. Reject mismatched cardinality, unknown types, or differing timeline/dedicated copies. Penalty evidence remains explicit text/icon under existing rules.
3. Resolve only the verified 2425105 scorer alias Noah Shawn Agbaje to the already-listed home player Noah Agbaje/profile 374531. Primary DFB and FSV Zwickau profiles share birth date 2001-06-23 and Wacker/FSV history, with BFV corroboration. Add a bounded data registry, not generic middle-name stripping. Bind exact match metadata and complete semantic source identity, side/team, source and target names/profile, and pinned evidence bytes. Preserve the raw goal name and alias evidence in output; appearance identity must remain the canonical roster name. Do not add a player or appearance. Missing or changed evidence/profile/side/metadata must reject; a complete upstream corrected name can be accepted only through an explicit tested state without accepting partial mutation.

## Validation and release

Use authentic captured HTML fixtures plus primary proof. Add meaningful RED/GREEN tests for all four reports, correction-pattern mutation, alias identity/evidence tampering, and grouped-icon mismatch. All previous accepted report and appearance outputs remain byte-for-byte identical, including all Nordost data. New corrections and alias evidence survive canonical release/replay; no schema/RPC/type change or weaker canonical comparison. Include new registry dependencies in the source fingerprint; historical capture hashes remain immutable.

After focused and covering source/release tests, replay all existing regional and Nordost raw documents offline. Bayern must reach 306/306 archive and 132/132 current with complete schedules and explicit keepers. Review, merge, and deploy checked code, then run actual read-only Actions replays using captured original lineage, prepare/review the exact manifest, perform guarded import, readiness, and guarded activation. Original current capture freshness of 12 hours and archive freshness of 7 days remain; no timestamp laundering, new keys, direct production writes, provider outreach, or refusal bypass. Verify the public active league and legal fantasy roster/prices after activation. Nordost prices/positions remain unchanged.

## Evidence

- Targeted primary source collection: `/private/tmp/slff-go-live-evidence/bayern`.
- Original captures: `/private/tmp/slff-regional-evidence/regionalliga-bayern-2025-39048972242` and `/private/tmp/slff-regional-evidence/regionalliga-bayern-2026-39054476978`.
- Existing reviewed baseline: main `a8af2b08ea0ca1fa6351bb10fcb5b4423408c95d`; source fingerprint `d966810b028ab3773fefe426fd6311518659fdb4941a8e5251d579f79afa6e32`.

Primary profile and correction fixture evidence must be tracked for future clean-checkout verification.
