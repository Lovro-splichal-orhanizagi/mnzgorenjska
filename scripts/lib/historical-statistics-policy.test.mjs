import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  classifyHistoricalStatistics, getHistoricalStatisticsPolicy,
  historicalStatisticsPolicySha256, validateHistoricalStatisticsRegistry,
} from './historical-statistics-policy.mjs'

const registry = JSON.parse(readFileSync(new URL('../policies/historical-statistics-exclusions.json', import.meta.url)))
const clone = value => structuredClone(value)
const hr = registry.policies.find(p => p.provider === 'hns')
const de = registry.policies.find(p => p.provider === 'dfb')
const competitionFor = policy => ({ slug: policy.competitionSlug, source: policy.provider, source_policy: policy.sourcePolicy, firstFantasyPlayedOn: '2026-10-25' })
const fixtureFor = (policy, entry) => ({ ...entry, season: policy.season })
const classify = (policy = hr, entry = policy.entries[0], overrides = {}) => classifyHistoricalStatistics({
  competition: competitionFor(policy), fixture: fixtureFor(policy, entry), rawSha256: entry.rawSha256, policy, ...overrides,
})

test('registry contains exactly reviewed HNS3 and DFB2 historical identities', () => {
  assert.equal(validateHistoricalStatisticsRegistry(registry), true)
  assert.deepEqual(hr.entries.map(x => x.sourceMatchId).sort(), ['114471617', '114471627', '114471629'])
  assert.deepEqual(de.entries.map(x => x.sourceMatchId).sort(), ['2402929', '2403004'])
  assert.ok(!hr.entries.some(x => x.sourceMatchId === '100511758'))
})

for (const policy of [hr, de]) for (const entry of policy.entries) {
  test(`classifies exact reviewed report ${entry.sourceMatchId} without supplying individual statistics`, () => {
    const result = classify(policy, entry)
    assert.equal(result.kind, 'unavailable_historical')
    assert.deepEqual(result.exception, entry)
    assert.match(result.policySha256, /^[a-f0-9]{64}$/)
    assert.equal(result.policySha256, historicalStatisticsPolicySha256(policy))
    assert.equal('z' in result, false)
  })
}

test('unregistered normal report receives no exemption', () => {
  assert.deepEqual(classify(hr, { ...hr.entries[0], sourceMatchId: 'new-future-report' }), { kind: 'normal' })
  assert.deepEqual(classifyHistoricalStatistics({ competition: { slug: 'hr-hnl', source: 'hns' }, fixture: { sourceMatchId: 'other' } }), { kind: 'normal' })
})

for (const [field, value] of Object.entries({ sourceCompetitionId: 'other', sourcePhase: 'guessed', sourceRound: 2, playedOn: '2026-08-24', homeSourceClubId: '649', awaySourceClubId: '1274', sourceUrl: 'https://example.com/', season: '2025/26', observedHomeScore: 0, observedAwayScore: 0 })) {
  test(`registered report rejects drift in ${field}`, () => {
    assert.throws(() => classify(hr, hr.entries[0], { fixture: { ...fixtureFor(hr, hr.entries[0]), [field]: value } }), /identity|fixture/i)
  })
}

test('registered report refuses raw bytes different from approved packet', () => {
  assert.throws(() => classify(hr, hr.entries[0], { rawSha256: '0'.repeat(64) }), /hash|sha/i)
})
for (const patch of [{ slug: 'hr-hnl' }, { source: 'dfb' }, { source_policy: null }]) {
  test(`registered policy cannot exempt another competition tuple ${JSON.stringify(patch)}`, () => {
    assert.throws(() => classify(hr, hr.entries[0], { competition: { ...competitionFor(hr), ...patch } }), /competition|policy|provider/i)
  })
}
for (const firstFantasyPlayedOn of [undefined, 'invalid', '2026-08-23', '2026-08-22']) {
  test(`requires a valid strictly later first fantasy date (${firstFantasyPlayedOn})`, () => {
    assert.throws(() => classify(hr, hr.entries[0], { competition: { ...competitionFor(hr), firstFantasyPlayedOn } }), /fantasy|prelaunch|date/i)
  })
}

test('caller cannot invent or alter the reviewed policy', () => {
  const changed = clone(hr); changed.entries[0].rawSha256 = '0'.repeat(64)
  assert.throws(() => classify(changed), /reviewed|policy/i)
  assert.throws(() => classify({ ...hr, id: 'invented' }), /reviewed|policy/i)
})

test('canonical hash ignores object property insertion order and covers approved metadata', () => {
  const reversed = Object.fromEntries(Object.entries(hr).reverse())
  assert.equal(historicalStatisticsPolicySha256(hr), historicalStatisticsPolicySha256(reversed))
  assert.notEqual(historicalStatisticsPolicySha256(hr), historicalStatisticsPolicySha256({ ...hr, approvalReference: 'changed' }))
})

test('canonical policy lookup is immutable and isolated by competition', () => {
  const value = getHistoricalStatisticsPolicy('hr-prva-hnlz')
  assert.deepEqual(value, hr)
  assert.equal(getHistoricalStatisticsPolicy('hr-hnl'), null)
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.entries) && Object.isFrozen(value.entries[0]))
})

test('registry rejects duplicate identities and malformed descriptors', () => {
  for (const mutate of [
    r => r.policies[0].entries.push(clone(r.policies[0].entries[0])),
    r => { r.policies[0].entries[0].rawSha256 = 'missing' },
    r => { r.policies[0].recordedAt = 'not-a-date' },
    r => { r.policies[0].entries[0].playedOn = '2026-02-31' },
    r => { r.policies[0].entries[0].observedHomeScore = -1 },
    r => { r.policies[0].entries[0].sourceRound = 0 },
    r => { r.policies[0].approvalReference = '' },
  ]) {
    const copy = clone(registry); mutate(copy)
    assert.throws(() => validateHistoricalStatisticsRegistry(copy), /registry|policy|entry|descriptor/i)
  }
})
