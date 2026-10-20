# Danish 3rd Division rollout plan

> Execution: continue the user's authorized rollout; parent implements and a focused reviewer checks before merge.

Goal: correct Brønshøj goalkeeper Lucas Chang-Andersen from club evidence, then activate `dk-3-division` only after fresh validation.

Spec: `docs/viri/danska.md`, the user's continuation instruction, and [Brønshøj's March 2026 goalkeeper interview](https://www.bronshojboldklub.dk/nyheder/jubilaeum-100-kampe-for-broenshoej-boldklub/).

- [ ] Catch up the six October 17 fixtures through the existing Actions importer; stop on source refusal.
- [ ] Register exact tuple `(1051, dk-3-division, dbu, 508657)` and document the keeper evidence.
- [ ] Add a guarded data correction for the unique Brønshøj player named `Chang-Andersen Lucas`, only in the inactive target league, preserving protected positions.
- [ ] Review the diff and focused checks; wait for the import to finish before merging the correction and running CI.
- [ ] Run source-free pricing, verify goalkeeper coverage at every current club, report completeness, warnings and native preview; activate only on READY.
- [ ] Verify the actual public catalogue and database; resume scheduled repricing.

Review focus: active league untouched; absent fresh-database player harmless; ambiguous names rejected; protected positions preserved; source evidence does not alter match statistics or invent goalkeeper appearances.
