import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
const moduleURL = new URL('./mfa-nl-source-model.mjs', import.meta.url)
const fixture = name => JSON.parse(readFileSync(new URL('./vzorci/' + name, import.meta.url)))
function cache() {
  const match = fixture('mt-mfa-pastMatches-6234492-2027.json').find(t => t.id === 53186745)
  assert.ok(match)
  return new Map(Object.entries({
    'standings-6234492-2027.json': fixture('mt-mfa-standings-6234492-2027.json'),
    'pastMatches-6234492-2027-1.json': [match],
    'upcomingMatches-6234492-2027-1.json': [],
    'tekma-53186745-izid.json': fixture('mt-mfa-tekma-53186745-izid.json'),
    'tekma-53186745-postava.json': fixture('mt-mfa-tekma-53186745-postava.json'),
  }).map(([n, value]) => [n, Buffer.from(JSON.stringify(value))]))
}
test('source model derives retained scorer, substitutions and cards without network or cache writes', async () => {
  assert.ok(existsSync(moduleURL))
  const { deriveNlSourceModel } = await import(moduleURL)
  const c = cache(), before = [...c].map(([n, b]) => [n, b.toString()])
  const m = await deriveNlSourceModel({ league: 'mt-nl2', cache: c, currentOnly: true, firstFantasyPlayedOn: '2026-11-01' })
  assert.equal(m.reports.length, 1)
  assert.equal(m.currentFixtures.length, 1)
  assert.deepEqual(m.reports[0].header, { reportId: 'mt53186745', season: '2026/27', round: 1, playedOn: '2026-10-11', homeName: 'Kirkop United', awayName: 'Ghaxaq', homeGoals: 2, awayGoals: 1, statisticsStatus: 'available' })
  assert.equal(m.reports[0].players.filter(p => p.started).length, 22)
  assert.equal(m.reports[0].players.filter(p => !p.started && p.minutes_played > 0).length, 10)
  assert.equal(m.reports[0].goals.length, 3)
  assert.deepEqual([...c].map(([n, b]) => [n, b.toString()]), before)
})
test('missing cached source or a missing on-field red time cannot become a normal report', async () => {
  const { deriveNlSourceModel } = await import(moduleURL)
  const missing = cache(); missing.delete('tekma-53186745-postava.json')
  await assert.rejects(deriveNlSourceModel({ league: 'mt-nl2', cache: missing, currentOnly: true }), /missing.*cached/)
  const red = cache(), body = JSON.parse(red.get('tekma-53186745-postava.json')), player = body.homeTeam.players[0]
  player.events.push({ id: 99999999, type: 'RED', time: "'", playerId: player.id, playerName: player.name })
  red.set('tekma-53186745-postava.json', Buffer.from(JSON.stringify(body)))
  await assert.rejects(deriveNlSourceModel({ league: 'mt-nl2', cache: red, currentOnly: true }), /dismissal.*minute/)
})

test('native semantic comparison catches scorer identity, minute and fantasy counter drift', async () => {
  const { deriveNlSourceModel, verifyNlNativeFootball } = await import(moduleURL)
  const m = await deriveNlSourceModel({ league: 'mt-nl2', cache: cache(), currentOnly: true })
  const report = m.reports[0], h = report.header
  // A small native-shaped graph for this retained report, not launch coverage.
  const image = { rounds: [{ id: 1, competition_id: 974, season: '2026/27', number: 1 }], teams: [{ id: 10, name: h.homeName }, { id: 11, name: h.awayName }], players: report.players.map((p, i) => ({ id: i + 100, competition_id: 974, reg_st: p.regSt })), matches: [{ id: 20, round_id: 1, home_team_id: 10, away_team_id: 11, played_on: h.playedOn, home_goals: 2, away_goals: 1, zapisnik_id: h.reportId, source_url: 'https://matchcentre.mfa.com.mt/match/53186745', statistics_status: 'available', imported_at: '2026-10-12T00:00Z', kontumacija: false, vir_brez_izida: false }] }
  image.appearances = report.players.map(({ regSt, side, ...a }) => ({ ...a, player_id: image.players.find(p => p.reg_st === regSt).id, team_id: 10 + side, match_id: 20 }))
  image.goals = report.goals.map(({ regSt, side, ...g }) => ({ ...g, scorer_id: image.players.find(p => p.reg_st === regSt).id, team_id: 10 + side, match_id: 20 }))
  assert.equal(verifyNlNativeFootball(m, image).exactParity, true)
  for (const mutate of [x => x.appearances[0].penalties_missed++, x => x.appearances[0].minute_off--, x => x.appearances[0].player_id = x.appearances[1].player_id, x => x.goals[0].scorer_id = x.appearances[0].player_id, x => x.matches[0].home_goals++]) {
    const wrong = structuredClone(image); mutate(wrong)
    assert.throws(() => verifyNlNativeFootball(m, wrong), /native.*differs/)
  }
})
