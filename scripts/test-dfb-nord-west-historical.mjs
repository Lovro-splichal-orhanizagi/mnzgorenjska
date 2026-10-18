import test from 'node:test'
import assert from 'node:assert/strict'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,classifyHistoricalStatistics} from './lib/historical-statistics-policy.mjs'
import {dfbPolicyBinding} from './dfb-historical-policy.mjs'
import {withDfbHistoricalStatistics} from './viri/dfb-historical.mjs'
// Independently transcribed from verified original capture records, never helper output.
const hashes={nord:{2405268:'546a0578a0623346e3295397b98cb999550d8fa715ee07a5ed221b768ec24c19',2405441:'34a9f0090f190ebe15d54e40ab60225b92bd0cd4e91ad522bb8b69014dd6dbba'},west:{2402287:'d5d18cbcb8b76e2a01151050abc6b57124426cf108883336a3a2bde6e80d60ff',2402299:'dabf8ebd5c2026b1849ffa477b96fa5b25f95ecf90ffd2f810f8502f4d6fa87d',2402306:'b3a3648ce1bc8e7bb7017c13b6a040e42167635b60f567acea3422b640eeb71b',2402312:'930bc43649fb0dd1e92e5e2ed00b4e9138bca3a817455857635aa7069b0ed4df',2402325:'cc878f107741ab43573a0e978375c114d4880db909cddab1e7270ff263e6a79e',2402332:'4ec2d592f0fcfec7bb0a81116c3de1b818930d826e134c606005ec9a29f7ea45',2402346:'282a2b0eae2f1b51353a55106677728b3daafee4947c06236c0db7c007b54b6f',2402352:'123d7023ff8442359d925630eab0b89f6556306e13af08eccbe9886a94659b9b'}}
const competition=region=>({slug:`de-regionalliga-${region}`,source:'dfb',source_policy:`de-dfb-${region}-2025-historical-unavailable-v1`,firstFantasyPlayedOn:'2026-10-30'})
for(const region of ['nord','west'])test(`${region} historical authority binds only exact archived identities/hashes and installed markers`,async()=>{
 const c=competition(region),p=getHistoricalStatisticsPolicy(c.slug)
 assert(p,'reviewed exact policy must exist');assert.deepEqual(Object.fromEntries(p.entries.map(e=>[e.sourceMatchId,e.rawSha256])),hashes[region])
 const binding=dfbPolicyBinding(c);assert.equal(binding.sha256,historicalStatisticsPolicySha256(p))
 const installed={installed:true,policyId:p.id,policySha256:binding.sha256,firstFantasyPlayedOn:c.firstFantasyPlayedOn,markers:p.entries.map((e,i)=>{const {rawSha256,reasonCode,...identity}=e;return{sourceMatchId:e.sourceMatchId,reportId:'de-dfb-'+e.sourceMatchId,policyId:p.id,policySha256:binding.sha256,rawSha256,fixture:{...identity,season:p.season},statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0,matchId:i+1,roundId:i+20,homeTeamId:i+40,awayTeamId:i+60}})}
 for(const marker of installed.markers){assert.equal(classifyHistoricalStatistics({competition:c,fixture:marker.fixture,rawSha256:marker.rawSha256}).kind,'unavailable_historical');assert.throws(()=>classifyHistoricalStatistics({competition:c,fixture:marker.fixture,rawSha256:'0'.repeat(64)}))}
 let calls=0;const base={ime:'dfb',nepopolni:[],async zapisniki(code,read,options){calls++;assert.equal(options.preskoci.size,p.entries.length);return[]}},provider=withDfbHistoricalStatistics(base,c)
 const read=async()=>{throw Error('NO SOURCE GET')}
 assert.deepEqual(await provider.zapisniki(`regionalliga-${region}/2025-2026`,read,{installedHistoricalMarkers:installed}),[]);assert.equal(calls,1)
 assert.deepEqual(await provider.zapisniki(`regionalliga-${region}/2025-2026`,read,{installedHistoricalMarkers:installed,samoZapisnik:installed.markers[0].reportId}),[]);assert.equal(calls,1)
 for(const change of [x=>x.markers.pop(),x=>x.markers[0].individualRowCount=1,x=>x.markers[0].rawSha256='0'.repeat(64),x=>x.policySha256='0'.repeat(64)]){const bad=structuredClone(installed);change(bad);await assert.rejects(()=>provider.zapisniki(`regionalliga-${region}/2025-2026`,read,{installedHistoricalMarkers:bad}))}
 await assert.rejects(()=>provider.zapisniki('regionalliga-suedwest/2025-2026',read,{installedHistoricalMarkers:installed}))
})
for(const region of ['nord','west'])test(`${region} composes reviewed calendar and historical policy in v4 while retaining exact null statistics`,async()=>{
 const {nordWestPolicyFixture}=await import('./dfb-nord-west-historical-test-fixture.mjs'),{preveriOdobritev,sha}=await import('./vklopi-dfb-regijo.mjs'),m=nordWestPolicyFixture(region),check=m=>{const raw=JSON.stringify(m);return preveriOdobritev(raw,sha(raw))}
 assert.equal(check(m).version,4);assert.equal(m.seasons[0].statisticsCoverage.unavailableHistoricalCount,Object.keys(hashes[region]).length);assert.equal(m.seasons[1].statisticsCoverage.strictStatisticsCoverage,true)
 const {verifyReplayRecord}=await import('./preveri-zagona-dfb-regije.mjs')
 for(const s of m.seasons){const r=s.lineage.replay,actual={runId:r.runId,jobId:r.jobId,commit:r.commit,workflow:r.workflow,step:r.step},record={version:2,slug:m.slug,season:s.season,statisticsPolicy:m.statisticsPolicy,capture:s.lineage.capture,replay:r};assert.deepEqual(verifyReplayRecord(record,{slug:m.slug,season:s.season,actual,artifact:{id:r.artifactId,digest:r.artifactDigest},workflowSha256:r.workflowSha256,parserSha256:m.parserSha256,historical:true}),s.lineage)}
 for(const change of [x=>x.version=3,x=>x.provenanceVersion=1,x=>x.statisticsPolicy.sha256='0'.repeat(64),x=>x.seasons[0].fixtures.find(f=>f.statisticsStatus==='unavailable_historical').appearances=[],x=>x.seasons[0].fixtures.find(f=>f.statisticsStatus==='unavailable_historical').time='00:01',x=>x.seasons[1].fixtures.find(f=>f.calendarEvidence).calendarEvidence.receiptSha256='0'.repeat(64),x=>x.seasons[1].lineage.capture.conclusion='failure',x=>x.seasons[1].lineage.replay.step='Ponovi sezono — brez omrežja in baze',x=>x.seasons[1].fixtures.find(f=>f.played).statisticsStatus='unavailable_historical']){const bad=structuredClone(m);change(bad);assert.throws(()=>check(bad))}
})
