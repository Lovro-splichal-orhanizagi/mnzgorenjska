// The observation binding excludes execution provenance only. Original capture
// receipts, clocks, coverage and every fixture/participant statistic stay fixed.
import { createHash } from 'node:crypto'
export const sha256 = raw => createHash('sha256').update(raw).digest('hex')
export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value)
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    .map(k => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}'
  return JSON.stringify(value)
}
export function observations(manifest) {
  const fixed = structuredClone(manifest)
  delete fixed.sourceCommit; delete fixed.parserSha256
  fixed.seasons = fixed.seasons.map(s => {
    delete s.runId; delete s.jobId
    delete s.lineage.replay
    return s
  })
  return fixed
}
export const observationSha256 = manifest => sha256(canonicalJson(observations(manifest)))
const fail = message => { throw Error(`DFB current reconciliation: ${message}`) }
export function buildPlan(manifest, before) {
  if (manifest.version !== 3 || manifest.slug !== 'de-regionalliga-suedwest' || before.competition?.id !== 1114 ||
      before.competition.slug !== manifest.slug || before.competition.active !== false || before.fantasy_teams !== 0 ||
      before.players?.length !== 29 || new Set(before.players.map(p => p.id)).size !== 29)
    fail('exact inactive target, zero users and29 unique native players required')
  const players = [...before.players].sort((a, b) => a.id - b.id)
  if (players.some(p => p.competition_id !== 1114 || p.active !== false || p.odsel_at != null ||
      p.izstopil_at != null || p.anonimiziran_razlog != null || p.anonimiziran_at != null))
    fail('native before-image contains ineligible identity/privacy state')
  const byId = new Map(players.map(p => [p.id, p]))
  const fixtures = new Map(manifest.seasons[1].fixtures.map(f => [f.id, f]))
  const participants = before.current_appearances.map(native => {
    const p = byId.get(native.player_id), f = fixtures.get(native.source_report)
    const side = native.team_id === native.home_team_id ? 0 : native.team_id === native.away_team_id ? 1 : null
    if (!p || native.season !== '2026/27' || p.team_id !== native.team_id || side == null ||
        !f?.played || f.statisticsStatus !== 'available' || f.round !== native.round_number)
      fail('participant is not bound to an available played current source fixture/current native team')
    const matches = f.appearances.filter(a => a.name === p.full_name && a.side === side &&
      Object.entries(a).every(([k, v]) => k === 'name' || k === 'side' || native[k] === v))
    if (matches.length !== 1) fail('source/native participant binding is missing or ambiguous')
    return { playerId: p.id, native, source: matches[0] }
  }).sort((a, b) => a.native.id - b.native.id)
  if (new Set(participants.map(p => p.native.id)).size !== participants.length ||
      players.some(p => !participants.some(a => a.playerId === p.id))) fail('complete unique native participant proof required')
  return { version: 1, id: 'de-suedwest-current-reactivation-20261018', competition: before.competition,
    season: '2026/27', statisticsPolicy: manifest.statisticsPolicy, observationSha256: observationSha256(manifest),
    captures: manifest.seasons.map(s => ({ season: s.season, code: s.code, capturedAt: s.capturedAt,
      documentsSha256: s.documentsSha256, capture: s.lineage.capture })), players, participants }
}
