# Germany future-round launch

User approved switching on the leagues that can launch, following the proposed future-round policy. Germany may withhold the independently checked empty DFB report 2426099 (Hertha BSC II–RSV, 16 October, round 13, 0–1). It must never invent that game's events or score fantasy rounds before launch. Galicia remains inactive because goalkeeper evidence is missing.

- [ ] Test and recognize only the exact empty historical report template and identity; normal import withholds the whole report. Changed identity, scores, partial tables/events, refusals and other failures remain fatal.
- [ ] Carry the pending match explicitly through source coverage and the reviewed manifest. Keep all 306 archive reports mandatory, every other played current match validated and all keeper/price/squad checks intact.
- [ ] Add a migration requiring the first future unlocked fantasy round to be strictly after every approved pending match. Reject pending data with any imported appearances/goals and reject any other pending identity.
- [ ] Run parser, manifest, fresh SQL, smoke and build checks; independently review the change and merge through CI.
- [ ] Validate server HTML/Caddy/reminder hashes and public routes; import archive/current data, positions and prices through Actions. Audit raw documents, compare the reviewed manifest with production, then activate only if every launch check passes.

No changes to unrelated local work, no production secrets outside Actions, no historical fantasy points, no unverified goalkeeper guesses, and no new-country outreach without clarified authorization.
