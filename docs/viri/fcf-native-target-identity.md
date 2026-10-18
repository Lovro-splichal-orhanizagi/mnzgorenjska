# FCF native target identity projection

The offline native planner accepts a fresh explicit BEGIN READ ONLY/ROLLBACK DB snapshot. This is an input contract, not a source or DB execution capability. The actual getter adapter still requires Task5's reader-issued target evidence; a caller-provided projection cannot authenticate source data or authorize writes.

Club resolution first uses every persisted native report ID with its actual source round and home/away side IDs. These anchors and the immutable exception anchors must agree. A DB display-name change does not erase native identity. Only genuinely unanchored bootstrap uses exact decoded canonical names; fuzzy/alias/shirt/ordinal guesses remain forbidden. All240 fixtures/30 rounds/16 team identities must still form one bijection. Display fields remain in the reviewable proposal, so a rename changes its digest and may need renewed mapping review without making valid derivation impossible.

For any available report's native player row plan, the same snapshot must contain:

```js
identityPrivacy: {
  schemaVersion: 1,
  kind: 'fcf-native-privacy-projection',
  countryCode: 'ES',
  countryId,                    // actual selected competition.country_id
  targetCompetitionId,
  method: 'explicitBEGIN_READ_ONLY_ROLLBACK',
  capturedUTC,                  // exactly the parent snapshot's capture time
  complete: true,
  checkedKeys: [/* all queried country-scoped registration AND name SHA256s */],
  matches: [{
    player_id, competition_id, country_id, kljuc,
    anonimiziran_at, anonimiziran_razlog, // ugovor or neaktiven
  }],
}
```

The selected competition row in `groups` includes actual `country_id`. Hashes use the existing `regHash(countryId,regSt)`/`imeHash(countryId,sourceName)` from `scripts/anonimizacija.mjs`, exactly matching SQL privacy keys. The actual readonly transport must finish the complete lookup for all native registration/name keys before marking this projection complete. It joins `anonimizirani_igralci` through protected player and competition rows across the whole selected country, not merely visible target players. Missing/failed/truncated pages or unchecked keys cannot mean “no match.” For whole-target import, collect the union of every available report's keys. SQL writer work must independently re-read/lock this actual privacy state; a caller `complete:true` is not write authorization.

A matching same-league protected row cannot be emitted as a new named/native player, including actual anonymized rows with cleared registration and `#<id>` names. Same-country objection (`ugovor`) follows the person across leagues through either established hash. Ambiguous protected matches hold. The bounded planner does not restore identity. Same-league ordinary inactivity (`neaktiven`) is reported as requiring the existing separately reviewed permitted restoration route; it is not an objection. An unrelated anonymized legacy row or another league's ordinary inactivity does not hold an otherwise valid native identity. Ordinary inactive non-anonymized players and normal labeled field positions remain allowed. No jersey/name fallback or restoration of objected identity is introduced.

Tests use synthetic country ID34 solely as fixture data; production must use the actual captured country/competition identity.
