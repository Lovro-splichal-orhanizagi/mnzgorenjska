import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  classifyHistoricalStatistics,
  getHistoricalStatisticsPolicy,
  historicalStatisticsPolicySha256,
  validateInstalledHistoricalStatisticsMarkers,
  validateHistoricalStatisticsRegistry,
} from './lib/historical-statistics-policy.mjs'

const registry=JSON.parse(readFileSync(new URL('./policies/historical-statistics-exclusions.json',import.meta.url)))
const ssot=JSON.parse(readFileSync(new URL('./policies/reviewed-existing-cleanup-targets-20261023.json',import.meta.url)))
const reportId=(provider,id)=>provider==='isthmian'?`gb${id}`:provider==='nfsbih'?`ba${id}`:provider==='fmf'?`md${id}`:id

test('registry and SSOT contain exactly nine tuples and thirteen approved report identities',()=>{
 assert.equal(validateHistoricalStatisticsRegistry(registry),true)
 assert.equal(ssot.schemaVersion,1)
 assert.equal(ssot.sourcePolicy,'reviewed-existing-history-20261023-v1')
 assert.equal(ssot.competitions.length,9)
 assert.deepEqual(ssot.competitions.map(x=>x.slug).sort(),['ba-wwin-liga-bih','gb-npl-midlands','gb-sfl-d1-south','hu-cs-u19-toth','hu-pe-u19-c','md-liga-2','ro-ab-l4-s2','ro-ab-l5-s2','ro-liga3-s1'])
 assert.equal(ssot.competitions.reduce((n,c)=>n+c.targets.length,0),13)
 const oldPolicies=registry.policies.filter(p=>['gb-npl-midlands','gb-sfl-d1-south','ro-liga3-s1','ba-wwin-liga-bih'].includes(p.competitionSlug))
 assert.deepEqual(oldPolicies.map(p=>[p.competitionSlug,p.id,p.entries.length]).sort(),[
  ['ba-wwin-liga-bih','ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1',2],
  ['gb-npl-midlands','gb-npl-midlands-historical-unavailable-2026-10-23-v1',2],
  ['gb-sfl-d1-south','gb-sfl-d1-south-historical-unavailable-2026-10-23-v1',1],
  ['ro-liga3-s1','ro-liga3-s1-historical-unavailable-2026-10-23-v1',1],
 ])
 for(const target of ssot.competitions){
  const policy=getHistoricalStatisticsPolicy(target.slug)
  assert.ok(policy,`missing ${target.slug}`)
  assert.equal(policy.provider,target.provider)
  assert.equal(policy.competitionId,target.competitionId)
  assert.equal(policy.sourceLeagueCode,target.sourceLeagueCode)
  assert.equal(policy.sourcePolicy,ssot.sourcePolicy)
  assert.equal(policy.id,target.policyId)
  assert.equal(historicalStatisticsPolicySha256(policy),target.policySha256)
  assert.deepEqual(policy.entries.map(entry=>entry.sourceMatchId).sort(),target.targets.map(entry=>entry.sourceMatchId).sort())
  const bySeason={}
  for(const entry of policy.entries){const season=entry.season??policy.season;bySeason[season]=(bySeason[season]??0)+1}
  assert.deepEqual(bySeason,Object.fromEntries(Object.keys(bySeason).sort().map(k=>[k,bySeason[k]])))
  for(const row of target.targets){
   const entry=policy.entries.find(value=>value.sourceMatchId===row.sourceMatchId)
   assert.ok(entry,`${target.slug}/${row.sourceMatchId}`)
   assert.equal(entry.season??policy.season,row.season)
   assert.equal(entry.playedOn,row.date)
   assert.deepEqual([entry.observedHomeScore,entry.observedAwayScore],row.score)
   assert.equal(entry.sourceRound,row.sourceRound)
   assert.equal(entry.sourcePhase,row.sourcePhase)
  }
 }
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='gb-npl-midlands').expectedReportsBySeason,{'2025/26':462,'2026/27':150})
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='gb-sfl-d1-south').expectedReportsBySeason,{'2026/27':132})
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='ro-liga3-s1').expectedReportsBySeason,{'2026/27':54})
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='ba-wwin-liga-bih').expectedReportsBySeason,{'2026/27':49})
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='ro-ab-l4-s2').expectedReportsBySeason,{'2026/27':23})
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='ro-ab-l4-s2').expectedPublishedFixturesBySeason,{'2026/27':24})
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='md-liga-2').expectedReportsBySeason,{'2026/27':95})
 assert.deepEqual(ssot.competitions.find(x=>x.slug==='md-liga-2').expectedPublishedFixturesBySeason,{'2026/27':97})
})

for(const target of ssot.competitions){
 test(`${target.slug} classifies only its exact reviewed reports and rejects tuple drift`,()=>{
  const policy=getHistoricalStatisticsPolicy(target.slug)
  const competition={id:target.competitionId,slug:target.slug,source:target.provider,source_policy:ssot.sourcePolicy,source_league_code:target.sourceLeagueCode,firstFantasyPlayedOn:'2026-10-25'}
  for(const row of target.targets){
   const entry=policy.entries.find(value=>value.sourceMatchId===row.sourceMatchId)
   const fixture={...entry,season:row.season}
   const classified=classifyHistoricalStatistics({competition,fixture,rawSha256:entry.rawSha256})
   assert.equal(classified.kind,'unavailable_historical')
   assert.equal(classified.exception.sourceMatchId,row.sourceMatchId)
   assert.equal(classified.policySha256,target.policySha256)
  }
  const entry=policy.entries[0]
  const fixture={...entry,season:entry.season??policy.season}
  for(const patch of [{id:target.competitionId+1},{source_league_code:`${target.sourceLeagueCode}-other`},{source_policy:null},{source:target.provider==='hlf'?'isthmian':'hlf'}])
   assert.throws(()=>classifyHistoricalStatistics({competition:{...competition,...patch},fixture,rawSha256:entry.rawSha256}),/binding|tuple|policy/i)
 })

 test(`${target.slug} installed markers require the complete exact prefixed report set`,()=>{
  const policy=getHistoricalStatisticsPolicy(target.slug),sha=historicalStatisticsPolicySha256(policy)
  const competition={id:target.competitionId,slug:target.slug,source:target.provider,source_policy:ssot.sourcePolicy,source_league_code:target.sourceLeagueCode}
  const markers=policy.entries.map((entry,i)=>{
   const {rawSha256,reasonCode,...identity}=entry
   return {sourceMatchId:entry.sourceMatchId,reportId:reportId(target.provider,entry.sourceMatchId),fixture:{...identity,season:entry.season??policy.season},rawSha256,policyId:policy.id,policySha256:sha,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2}
  })
  const binding={installed:true,policyId:policy.id,policySha256:sha,firstFantasyPlayedOn:'2026-10-25',markers}
  assert.equal(validateInstalledHistoricalStatisticsMarkers({competition,binding}).markers.length,policy.entries.length)
  for(const bad of [{...binding,markers:markers.slice(1)},{...binding,markers:[...markers,{...markers[0],sourceMatchId:'foreign'}]}])
   assert.throws(()=>validateInstalledHistoricalStatisticsMarkers({competition,binding:bad}),/binding|marker|identity/i)
 })
}


test('Alba L5 S2 admits only the reviewed scorer omission with the exact composite proof',()=>{
 const policy=getHistoricalStatisticsPolicy('ro-ab-l5-s2')
 assert.ok(policy,'reviewed Alba L5 S2 policy must exist')
 const entry=policy.entries[0]
 assert.equal(policy.entries.length,1)
 assert.equal(entry.sourceMatchId,'86feb0be-2e6f-4c2e-9fd3-f26aba19fb91')
 assert.deepEqual([entry.observedHomeScore,entry.observedAwayScore],[2,3])
 assert.equal(entry.sourceProof.matchSheetId,'493d2020-b10f-4a31-a58d-a9b75bc1b73b')
 const competition={id:499,slug:policy.competitionSlug,source:'hlf',source_policy:policy.sourcePolicy,source_league_code:policy.sourceLeagueCode,firstFantasyPlayedOn:'2026-10-25'}
 const fixture={...entry,season:policy.season}
 assert.equal(classifyHistoricalStatistics({competition,fixture,rawSha256:entry.rawSha256}).kind,'unavailable_historical')
 for(const patch of [{sourceMatchId:'future-report'},{sourceRound:7},{playedOn:'2026-10-19'},{observedHomeScore:3},{homeSourceClubId:entry.awaySourceClubId},{sourceProof:{...entry.sourceProof,matchSheetId:'other'}}]) {
  const changed={...fixture,...patch}
  if(patch.sourceMatchId) assert.equal(classifyHistoricalStatistics({competition,fixture:changed,rawSha256:entry.rawSha256}).kind,'normal')
  else assert.throws(()=>classifyHistoricalStatistics({competition,fixture:changed,rawSha256:entry.rawSha256}),/identity/)
 }
 const broken=structuredClone(registry)
 broken.policies.find(p=>p.id===policy.id).entries[0].sourceProof.roundResponseSha256='0'.repeat(64)
 assert.throws(()=>validateHistoricalStatisticsRegistry(broken),/composite/)
})
