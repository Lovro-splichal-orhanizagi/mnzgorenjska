import test from 'node:test'
import assert from 'node:assert/strict'
import { getHistoricalStatisticsPolicy, historicalStatisticsPolicySha256 } from '../lib/historical-statistics-policy.mjs'
import { withReviewedExistingHistoryStatistics } from './reviewed-existing-history.mjs'
import { viraZa } from './index.mjs'

const cases = [
  { slug: 'gb-npl-midlands', provider: 'isthmian', id: 979, code: 'npl/67d7c7bb74247876e6dae40c/2026-27' },
  { slug: 'gb-sfl-d1-south', provider: 'isthmian', id: 984, code: 'sfl/69d0bdf9b616bafb97331d41/2026-27' },
  { slug: 'ro-liga3-s1', provider: 'hlf', id: 497, code: 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1' },
  { slug: 'ba-wwin-liga-bih', provider: 'nfsbih', id: 998, code: 'wwin-liga-bih/54152223' },
]

function setup(item, selectedEntry = null) {
  const policy = getHistoricalStatisticsPolicy(item.slug)
  const sha = historicalStatisticsPolicySha256(policy)
  const entry = selectedEntry ?? policy.entries[0]
  const reportIdFor = sourceMatchId => item.provider === 'isthmian' ? `gb${sourceMatchId}` : item.provider === 'nfsbih' ? `ba${sourceMatchId}` : sourceMatchId
  const binding = {
    installed: true,
    policyId: policy.id,
    policySha256: sha,
    firstFantasyPlayedOn: '2026-10-24',
    markers: policy.entries.map((itemEntry,index) => {
      const { rawSha256, reasonCode, ...identity } = itemEntry
      return { sourceMatchId:itemEntry.sourceMatchId, reportId:reportIdFor(itemEntry.sourceMatchId), fixture:{...identity,season:itemEntry.season??policy.season}, rawSha256, policyId:policy.id, policySha256:sha, statisticsStatus:'unavailable_historical', importedAt:null, individualRowCount:0, matchId:11+index, roundId:12+index, homeTeamId:13+index*2, awayTeamId:14+index*2 }
    }),
  }
  const competition = { id: item.id, slug: item.slug, source: item.provider, source_policy: policy.sourcePolicy, source_league_code: item.code }
  const calls = []
  const report = { id: 'normal-report', z: { ordinary: true }, url: 'https://source.example/ordinary' }
  const base = {
    ime: item.provider,
    async zapisniki(code, read, options) {
      calls.push({ code, read, options })
      return [report]
    },
  }
  const provider = withReviewedExistingHistoryStatistics(base, competition, { installedHistoricalMarkers: binding })
  return { policy, entry, binding, competition, calls, report, base, provider }
}

for (const item of cases) {
  test(`${item.slug}: installed single-report exclusion returns before provider traversal`, async () => {
    const { entry, calls, provider, competition, binding } = setup(item)
    const reportId = item.provider === 'isthmian' ? `gb${entry.sourceMatchId}` : item.provider === 'nfsbih' ? `ba${entry.sourceMatchId}` : entry.sourceMatchId
    const result = await provider.zapisniki(item.code, () => { throw Error('source read must not occur') }, { samoZapisnik: reportId })
    assert.deepEqual(result, [])
    assert.equal(calls.length, 0)
    const registered = viraZa(competition, { installedHistoricalMarkers: binding })
    assert.ok(registered.historicalSourceFiles.includes('scripts/viri/reviewed-existing-history.mjs'))
    assert.deepEqual(await registered.zapisniki(item.code, () => { throw Error('registered source read must not occur') }, { samoZapisnik: reportId }), [])
  })

  test(`${item.slug}: complete marker is forwarded as one exact source skip`, async () => {
    const { entry, calls, report, provider } = setup(item)
    const result = await provider.zapisniki(item.code, () => 'read', { preskoci: new Set(['another-report']) })
    assert.deepEqual(result, [report])
    assert.equal(calls.length, 1)
    const expected = item.provider === 'isthmian' ? entry.sourceMatchId : entry.sourceMatchId
    assert.ok(calls[0].options.preskoci.has(expected))
    assert.ok(calls[0].options.preskoci.has('another-report'))
  })

  test(`${item.slug}: policy tuple or installed marker drift fails before source traversal`, async () => {
    const { binding, competition, calls, base } = setup(item)
    const wrong = { ...competition, source_league_code: `${item.code}-foreign` }
    assert.throws(() => withReviewedExistingHistoryStatistics(base, wrong, { installedHistoricalMarkers: binding }), /tuple|binding|policy/i)
    const partial = { ...binding, markers: [] }
    assert.throws(() => withReviewedExistingHistoryStatistics(base, competition, { installedHistoricalMarkers: partial }), /marker|binding|installed/i)
    assert.equal(calls.length, 0)
  })
}

test('NPL archive marker accepts only its exact archive season and skips before source traversal', async () => {
  const item=cases[0], policy=getHistoricalStatisticsPolicy(item.slug), entry=policy.entries.find(e=>e.season==='2025/26')
  assert.ok(entry)
  const {provider,calls,competition,binding,base}=setup(item,entry)
  assert.deepEqual(await provider.zapisniki(item.code.replace('2026-27','2025-26'),()=>{throw Error('excluded report must skip before source read')},{samoZapisnik:`gb${entry.sourceMatchId}`}),[])
  assert.equal(calls.length,0)
  assert.throws(()=>withReviewedExistingHistoryStatistics(base,{...competition,source_league_code:item.code.replace('2026-27','2025-26')},{installedHistoricalMarkers:binding}),/tuple|binding|code/i)
})

test('NPL archive code rejects full-season and any non-excluded single-report traversal',async()=>{
 const item=cases[0], archiveCode=item.code.replace('2026-27','2025-26'), {provider,calls}=setup(item)
 await assert.rejects(()=>provider.zapisniki(archiveCode,()=>{throw Error('must reject before source read')}),/archive.*single|single.*archive/i)
 await assert.rejects(()=>provider.zapisniki(archiveCode,()=>{throw Error('must reject before source read')},{samoZapisnik:'gb6896abc31c6f4c56212c7ac4-extra'}),/archive.*single|single.*archive/i)
 await assert.rejects(()=>provider.zapisniki(archiveCode.replace('2025-26','2024-25'),()=>{throw Error('foreign archive must reject before source read')},{samoZapisnik:'gb6896abc31c6f4c56212c7ac5'}),/foreign source code/i)
 assert.equal(calls.length,0)
})
