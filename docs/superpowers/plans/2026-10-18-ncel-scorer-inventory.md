# NCEL scorer-header event inventory

Root-approved scope: parser/tests only; no provider/DB operation. Existing nullable scorer model is compatible: importer writes null scorer when name/shirt unresolved; current readiness/activation only requires appearances for non-null scorers. Score reconciliation still counts every goal.

1. RED: exercise exact retained55756/56246 and public synthetic complete/partial/icon-only headers, unique/duplicate/missing identities, own goals, multiple goals and unchanged cards/substitutions. Complete-side headers must supply exactly official events; ambiguous names retain native minute/type with null name/shirt. Incomplete ambiguity remains incomplete even for old reports.
2. Implement per-side complete-header event precedence and unique-only name lookup. Retain ordinary unambiguous icon fallback when headers are incomplete, native result and other stats. Warn on ambiguity/conflicting ignored icons; no inferred scorer identity.
3. GREEN: focused parser tests, existing NCEL importer clock regression and syntax/diff checks. Genuine raw tests use only retained existing files with exact SHA, never source fetch.
4. Freeze small commit/report for independent review. Root owns any later exact two-archive reimports and new preview/activation. No exclusion, SQL, workflow, position or source-policy change.
