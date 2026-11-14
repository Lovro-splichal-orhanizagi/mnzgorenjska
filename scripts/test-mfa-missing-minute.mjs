import test from 'node:test'
import assert from 'node:assert/strict'
import mfa from './viri/mfa.mjs'
import { readFileSync } from 'node:fs'

// Two fixtures; 2 has an away player sent off with the source publishing time "'" (no minute).
const player = (id, n, events = []) => ({ id, number: n, name: `P${id}`, startingLineup: true, isGoalkeeper: n === 1, events })
const team = (base, events = {}) => ({ players: Array.from({ length: 11 }, (_, i) => player(base + i, i + 1, events[i + 1] ?? [])) })
const fixtures = [1, 2].map(i => ({
  id: 100 + i, status: 'PLAYED', competitionId: '5', competitionTypeId: 6306756, startDate: '2026-10-01T19:00:00Z',
  homeTeam: { id: 10 + i, name: `H${i}` }, awayTeam: { id: 20 + i, name: `A${i}` },
}))
const read = async url => {
  if (url.includes('/standings?')) return JSON.stringify({ phases: [{ groups: [{ id: '5' }] }] })
  if (url.includes('/pastMatches?')) return JSON.stringify(new URL(url).searchParams.get('page') === '1' ? fixtures : [])
  if (url.includes('/upcomingMatches?')) return '[]'
  const m = /matches\/(\d+)\/(result|lineup)/.exec(url)
  const bad = m[1] === '102'
  const red = { id: 9, type: 'RED', team: 'AWAY', time: bad ? "'" : "70'", playerName: 'X', playerId: 2000 }
  if (m[2] === 'result') return JSON.stringify({ status: 'PLAYED', homeScore: '0', awayScore: '0', events: [red] })
  return JSON.stringify({ homeTeam: team(1000), awayTeam: team(2000, { 1: [red] }) })
}
const opts = { mapa: null, zdaj: Date.parse('2026-11-01T00:00Z') }

test('a report with an on-field red card without minute is skipped and listed; the rest imports', async () => {
  const warn = console.warn, lines = []
  console.warn = (m) => lines.push(m)
  try {
    const reports = await mfa.zapisniki('6306756/2027', read, opts)
    assert.deepEqual(reports.map(r => r.id), ['mt101'])
    assert.ok(lines.join('\n').includes('mt102'))
  } finally { console.warn = warn }
})

test('strict mode (reviewed historical releases) keeps the report so the validator rejects it', async () => {
  const reports = await mfa.zapisniki('6306756/2027', read, { ...opts, strogo: true })
  assert.deepEqual(reports.map(r => r.id), ['mt101', 'mt102'])
  const { assertMfaReportTiming } = await import('./viri/mfa-report-validation.mjs')
  assert.throws(() => assertMfaReportTiming(reports[1].z), /on-field dismissal minute missing/)
})

test('historical wrapper requests strict mode from the base source', () => {
  const src = readFileSync(new URL('./viri/mfa-historical.mjs', import.meta.url), 'utf8')
  assert.match(src, /base\.zapisniki\(code,read,\{\.\.\.options,preskoci,strogo:true\}\)/)
})
