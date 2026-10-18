import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { classifyFcfHistoricalStatistics, classifyFcfHistoricalFixture, verifyFcfInstalledHistoricalMarker } from './fcf-historical-policy.mjs'
import { getHistoricalStatisticsPolicy, historicalStatisticsPolicySha256 } from './lib/historical-statistics-policy.mjs'

const receipts = JSON.parse(readFileSync(new URL('./vzorci/fcf-reviewed-history/receipts.json', import.meta.url)))
const slugFor = { '4109388': 'es-ct-segona-g1', '4116215': 'es-ct-tercera-g2', '4118352': 'es-ct-tercera-g9', '4118358': 'es-ct-tercera-g9' }
const retainedDir=process.env.FCF_HISTORICAL_RETAINED_DIR
const htmlFor = id => readFileSync(`${retainedDir}/${receipts.find(r=>r.sourceMatchId===id).captureFile}`,'utf8')
const competitionFor = id => ({ slug: slugFor[id], source:'fcf', source_policy:'es-fcf-reviewed-history-v1', firstFantasyPlayedOn:'2026-10-24' })
const fixtureFor = r => Object.fromEntries(['sourceMatchId','sourceCompetitionId','sourcePhase','sourceRound','playedOn','season','homeSourceClubId','awaySourceClubId','homeSourceCategoryId','awaySourceCategoryId','sourceUrl','observedHomeScore','observedAwayScore'].map(key => [key,r[key]]))
const markerFor = r => {
  const policy = getHistoricalStatisticsPolicy(slugFor[r.sourceMatchId])
  return { sourceMatchId:r.sourceMatchId, reportId:`es${r.sourceMatchId}`, fixture:fixtureFor(r), rawSha256:r.rawSha256,
    policyId:policy.id, policySha256:historicalStatisticsPolicySha256(policy), statisticsStatus:'unavailable_historical', importedAt:null, individualRowCount:0,
    matchId:123, roundId:456, homeTeamId:1, awayTeamId:2 }
}
for (const r of receipts) test(`exact source fixture ${r.sourceMatchId} becomes unavailable without invented individual data`, () => {
  const result = classifyFcfHistoricalFixture({ competition:competitionFor(r.sourceMatchId), fixture:fixtureFor(r), rawSha256:r.rawSha256 })
  assert.equal(result.statisticsStatus,'unavailable_historical')
  assert.equal(result.id,`es${r.sourceMatchId}`)
  assert.equal(result.z,null)
  assert.deepEqual(result.fixture,fixtureFor(r))
  assert.equal(result.historicalStatistics.reasonCode,r.reasonCode)
  assert.equal(result.rawSha256,r.rawSha256)
})
for (const patch of [{source:'dfb'}, {slug:'es-ct-tercera-g1'}, {source_policy:null}, {source_policy:'future-v2'}, {firstFantasyPlayedOn:'2026-09-19'}]) test(`known native ID refuses wrong tuple/prelaunch ${JSON.stringify(patch)}`, () => {
  assert.throws(() => classifyFcfHistoricalStatistics({competition:{...competitionFor('4109388'),...patch},id:'4109388',html:'not approved source bytes'}), /policy|binding|prelaunch|fantasy|provider/i)
})
for (const id of ['es4109388',4109388,'04109388','4109388\n']) test(`rejects nonnative ID ${JSON.stringify(id)}`, () => {
  assert.throws(() => classifyFcfHistoricalStatistics({competition:competitionFor('4109388'),id,html:'not approved source bytes'}), /native|identity/i)
})
test('changed source bytes cannot acquire reviewed exemption', () => {
  assert.throws(() => classifyFcfHistoricalStatistics({competition:competitionFor('4109388'),id:'4109388',html:'not approved source bytes'+' '}), /sha|raw/i)
})
test('unknown and future reports stay on normal strict parser path even when malformed', () => {
  assert.deepEqual(classifyFcfHistoricalStatistics({competition:competitionFor('4109388'),id:'4109389',html:'malformed'}),{kind:'normal'})
  assert.deepEqual(classifyFcfHistoricalStatistics({competition:{slug:'es-ct-quarta-g1',source:'fcf'},id:'4139542',html:'malformed'}),{kind:'normal'})
  assert.throws(() => classifyFcfHistoricalStatistics({competition:{slug:'es-ct-quarta-g1',source:'fcf',source_policy:'unreviewed'},id:'4139542',html:'malformed'}), /unknown|policy/i)
})
for (const r of receipts) test(`installed exact ${r.sourceMatchId} is verified without raw HTML`, () => {
  const marker=markerFor(r), result=verifyFcfInstalledHistoricalMarker({competition:competitionFor(r.sourceMatchId),marker})
  assert.equal(result.id,`es${r.sourceMatchId}`)
  assert.equal(result.z,null)
  assert.deepEqual(result.fixture,fixtureFor(r))
})
for (const [field,value] of Object.entries({sourceCompetitionId:'other',sourcePhase:'guessed',sourceRound:9,playedOn:'2026-10-01',season:'2025/26',homeSourceClubId:'1',awaySourceClubId:'2',homeSourceCategoryId:'wrong',awaySourceCategoryId:'wrong',sourceUrl:'https://example.com/',observedHomeScore:9,observedAwayScore:9})) test(`installed descriptor rejects ${field} drift`, () => {
  const r=receipts[0],marker=markerFor(r); marker.fixture[field]=value
  assert.throws(() => verifyFcfInstalledHistoricalMarker({competition:competitionFor(r.sourceMatchId),marker}),/fixture|identity|policy/i)
})
for (const patch of [{rawSha256:'0'.repeat(64)},{policySha256:'0'.repeat(64)},{policyId:'other'},{reportId:'4109388'},{sourceMatchId:'4116215'},{statisticsStatus:'complete'},{importedAt:'2026-10-18T00:00:00Z'},{individualRowCount:1},{individualRowCount:null}]) test(`installed marker refuses inconsistent metadata ${JSON.stringify(patch)}`, () => {
  const r=receipts[0]
  assert.throws(() => verifyFcfInstalledHistoricalMarker({competition:competitionFor(r.sourceMatchId),marker:{...markerFor(r),...patch}}), /marker|policy|sha|identity|fixture/i)
})

// Private original bytes are intentionally excluded from git (staff/contact/venue content).
for (const r of receipts) test(`private retained-byte integration ${r.sourceMatchId}`, {skip:!retainedDir}, () => {
 const html=htmlFor(r.sourceMatchId)
 assert.equal(Buffer.byteLength(html),r.rawBytes)
 assert.equal(createHash('sha256').update(html).digest('hex'),r.rawSha256)
 const result=classifyFcfHistoricalStatistics({competition:competitionFor(r.sourceMatchId),id:r.sourceMatchId,html})
 assert.deepEqual(result.fixture,fixtureFor(r))
 assert.equal(result.z,null)
})

for (const [field,value] of Object.entries({sourceCompetitionId:'other',sourcePhase:'guessed',sourceRound:9,playedOn:'2026-10-01',season:'2025/26',homeSourceClubId:'1',awaySourceClubId:'2',homeSourceCategoryId:'wrong',awaySourceCategoryId:'wrong',sourceUrl:'https://example.com/',observedHomeScore:9,observedAwayScore:9})) test(`initial source fixture rejects ${field} drift before individual derivation`, () => {
 const r=receipts[0]
 assert.throws(() => classifyFcfHistoricalFixture({competition:competitionFor(r.sourceMatchId),fixture:{...fixtureFor(r),[field]:value},rawSha256:r.rawSha256}),/fixture|identity|policy/i)
})
test('another provider with coincident native number receives no FCF exemption', () => {
 assert.deepEqual(classifyFcfHistoricalStatistics({competition:{slug:'de-ordinary',source:'dfb'},id:'4109388',html:'malformed'}),{kind:'normal'})
})
