# SFL Division One calendar start selection

## Scope

Correct the first-fantasy-round choice for the exact inactive SFL Division
One Central and South source tuples. Their official `Match N` fixture slot
is retained when postponed matches are played out of order, so more than two
advanced played round numbers must not move the fantasy start months ahead.

## Guardrails

- Keep the generic two-advanced-round rule for all other source tuples.
- Refuse the exception if fantasy teams or lineups already exist, or if a
  played higher round still has a future deadline.
- Keep readiness, report completeness, score/goal matching, price, squad,
  goalkeeper, empty future round, and native atomic-trigger checks unchanged.
- Do not relabel matches, alter deadlines, or grant retrospective points.

## Verification

JavaScript regression cases cover both exact source tuples, wrong tuple
fallback, fantasy-data holds, and future-deadline holds. The native fixture
passed against a fresh disposable Supabase database, including successful
activation through the service-role RPC and rejected unsafe starts; its
transaction rolled back and the disposable stack was stopped. CI now runs
the same fixture after fresh migrations. Full PR CI remains required before
merge.
