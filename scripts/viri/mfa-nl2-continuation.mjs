// One reviewed abandoned/resumed fixture. No event or player timeline is merged.
const ARCHIVE = '6234492/2026'
const ORIGINAL = '50920555'
const FINAL = '51962893'
const order = Symbol('reviewed NL II original fixture order')
const url = id => `https://matchcentre.mfa.com.mt/match/${id}`

/** Raw JSON cannot supply the internal ordering anchor. Other fixtures keep their ID order. */
export const mfaFixtureOrder = fixture => fixture[order] ?? fixture.id

/** Run only after full raw discovery, before any round assignment or report reads. */
export function normalizeMfaNl2Continuation(code, fixtures) {
  if (code !== ARCHIVE) return fixtures
  const fail = message => { throw Error(`mfa: NL II continuation ${message}`) }
  const segments = [ORIGINAL, FINAL].map(id => {
    const matches = fixtures.filter(t => String(t.id) === id)
    if (matches.length !== 1) fail(`requires exactly one source segment ${id}`)
    const t = matches[0]
    const start = id === ORIGINAL ? '2025-11-08T15:30:00Z' : '2026-01-13T18:00:00Z'
    if (String(t.competitionId) !== '50920420' || String(t.competitionTypeId) !== '6234492'
      || String(t.homeTeam?.id) !== '39633' || String(t.awayTeam?.id) !== '39613'
      || t.status !== 'PLAYED' || Date.parse(t.startDate) !== Date.parse(start)
      || (t.sourceUrl != null && t.sourceUrl !== url(id))) fail(`source metadata differs for ${id}`)
    return t
  })
  if (fixtures.some(t => String(t.competitionId) === '50920420'
    && String(t.homeTeam?.id) === '39633' && String(t.awayTeam?.id) === '39613'
    && ![ORIGINAL, FINAL].includes(String(t.id)))) fail('has an unreviewed additional same-pair source record')
  const canonical = {
    ...segments[1],
    [order]: segments[0].id,
    sourceUrl: url(FINAL),
    sourceMatchIds: Object.freeze([ORIGINAL, FINAL]),
    requiresHistoricalMarker: true,
  }
  // Keep both raw records untouched; only the returned logical fixture list changes.
  return fixtures.filter(t => String(t.id) !== FINAL).map(t => String(t.id) === ORIGINAL ? canonical : t)
}
