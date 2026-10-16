# Spain Novanet and Germany fussball support

The owner requested full country support beyond the current decoder prototypes and broad validation. Build on the existing Node source interface and the supplied captured pages. Correctness takes priority over accepting every template: reject unknown obfuscation, ambiguous identities and inconsistent events, rather than write guessed data. Retain source attribution and stop on access challenges, 401/403/429.

Deliver working source adapters only for formats supported by real fixtures. Spain initially targets the inspected Aragón and Galicia Novanet templates. Germany must bind each field to its own page font; name metadata alone does not decode score/date post3 fonts. Determine whether trustworthy unobfuscated match metadata or deterministic glyph matching provides the missing fields. If a required input cannot be validated, expose the exact unsupported format and keep integration disabled.

No production database writes or league activation during development. Any league seeds must be inactive, carry verified current and archive source codes, and preserve global match/player identity requirements. Activation requires archive → schedule → current season → positions → prices with a checked price spread, per CLAUDE.md. Do not invent league codes or results.

Use existing dependencies. Add recorded fixtures with provenance and independent expected values. Verify final source output (schedule, lineup, substitutions, goals, cards, minutes, goalkeeper) and failure behavior. Document the actual supported coverage; no claim of universal or bulletproof compatibility.
