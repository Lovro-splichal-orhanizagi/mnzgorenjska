// Source-free regression: unresolved rounds do not become earned zero points.
import assert from 'node:assert/strict'
import { sestejOdKroga } from '../src/lib/lestvica'

const result = sestejOdKroga([
  { fantasy_team_id: 8, round_id: 40, points: 12 },
  { fantasy_team_id: 8, round_id: 41, points: null, statistics_pending: true },
  { fantasy_team_id: 9, round_id: 41, points: null, statistics_pending: true },
  { fantasy_team_id: 10, round_id: 40, points: 0 },
], new Set([40, 41]))
assert.equal(result[0].points, 12, 'retain confirmed earned points without inventing unresolved-round points')
assert.equal(result[0].statistics_pending, true, 'cumulative result stays explicitly provisional')
assert.equal(result[0].krogov, 1, 'an unresolved round is not a scored round')
assert.equal(result.find(row => row.fantasy_team_id === 9)?.statistics_pending, true)
assert.equal(result.find(row => row.fantasy_team_id === 9)?.krogov, 0)
assert.equal(result.find(row => row.fantasy_team_id === 10)?.points, 0, 'an actual scored zero remains zero')
assert.equal(result.find(row => row.fantasy_team_id === 10)?.statistics_pending, undefined)
console.log('PASS pending fantasy cumulative totals and verified zero')
