import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {admissionFixture,retained} from './fcf-missing-inventory-admission-fixture.mjs'
import {readFcfCapturedTargetEvidence,getFcfCapturedTargetData,readFcfCleanupEvidence} from './fcf-target-evidence.mjs'
import {cleanupFixture} from './fcf-target-test-fixture.mjs'
import {nativePlanFixture,privacyProjection,writerCommit} from './fcf-native-plan-test-fixture.mjs'
import {deriveFcfTargetNativeMapping} from './fcf-target-native-adapter.mjs'
import {getHistoricalStatisticsPolicy} from './lib/historical-statistics-policy.mjs'
const api=await import('./fcf-target-rollout.mjs').catch(()=>({}))
const sha=s=>createHash('sha256').update(s).digest('hex')
test('writer admits only actual reviewed reader capabilities before any target work',()=>{
 assert.equal(typeof api.buildFcfTargetRollout,'function')
 for(const targetSlug of['es-ct-segona-g1','es-ct-tercera-g9','es-ct-tercera-g2'])assert.throws(()=>api.buildFcfTargetRollout({targetSlug,inventoryAdmission:{evidenceKind:'fcf-missing-target-inventory',verified:true},sourceCommit:'b'.repeat(40)}),/FCF_(ROLLOUT|INVENTORY)/)
})
for(const targetSlug of['es-ct-segona-g1','es-ct-tercera-g9'])test(`complete branded ${targetSlug} rollout/replay keeps capture A, writer B and shared consumed parent`,{skip:!retained},async t=>{
 const f=await admissionFixture(t,{nativePlayers:true}),inventoryAdmission=readFcfCapturedTargetEvidence({...f.wire,targetSlug}),data=getFcfCapturedTargetData({targetEvidence:inventoryAdmission,targetSlug,now:f.now}),p=nativePlanFixture(targetSlug),policy=getHistoricalStatisticsPolicy(targetSlug),anchors={'4109388':[321646,8574,8575],'4118352':[306164,8304,8305],'4118358':[306171,8301,8298]},ids=new Map()
 for(const e of policy.entries){ids.set(`${e.homeSourceClubId}/${e.homeSourceCategoryId}`,anchors[e.sourceMatchId][1]);ids.set(`${e.awaySourceClubId}/${e.awaySourceCategoryId}`,anchors[e.sourceMatchId][2])}
 const teams=data.clubs.map((c,i)=>({id:ids.get(`${c.sourceClubId}/${c.sourceCategoryId}`)??950000+i,competition_id:data.competition.id,name:c.name})),team=c=>teams.find(t=>t.name===c.name).id,databaseInventory={...p.databaseInventory,capturedUTC:new Date(f.now).toISOString(),teams,players:[],matches:data.fixtures.map((m,i)=>({id:anchors[m.id.slice(2)]?.[0]??850000+i,round_id:p.databaseInventory.rounds.find(r=>r.number===m.round).id,home_team_id:team(m.clubs[0]),away_team_id:team(m.clubs[1]),zapisnik_id:m.round<=3?m.id:null})),identityPrivacy:privacyProjection(data.competition.id,data.fixtures.flatMap(m=>m.appearances??[]),new Date(f.now).toISOString())}
 databaseInventory.groups.forEach(g=>{g.source_policy='es-fcf-reviewed-history-v1';if(g.slug===targetSlug)g.country_id=34;else if(targetSlug.endsWith('-g9')&&g.slug.endsWith('-g1'))g.active=true})
 const cleanupEvidence=readFcfCleanupEvidence(cleanupFixture(t,{applied:true}).input),execution={repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit:writerCommit,runId:'999',runAttempt:'1'},base={targetSlug,inventoryAdmission,cleanupEvidence,databaseInventory,existingExceptionBindings:p.existingExceptionBindings,sourceCommit:writerCommit,execution,now:f.now},mapping=deriveFcfTargetNativeMapping(base),rollout=api.buildFcfTargetRollout({...base,mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256}),r=JSON.parse(rollout.rolloutText)
 assert.equal(r.inventoryBinding.sourceCommit,f.wire.plan.sourceCommit);assert.equal(r.sourceCommit,writerCommit);assert.equal(r.inventoryBinding.sourceClaimState,'consumed');assert.equal(r.cleanupBinding.originals.length,4)
 assert.equal(JSON.parse(r.identityPlan.mappingText).fixtures.length,240);assert.deepEqual(api.replayFcfTargetRollout({...base,...rollout}),rollout)
 const next=api.advanceFcfTargetRollout({...base,...rollout,execution:{...execution,runId:'1001'},readiness:null});assert.equal(JSON.parse(next.rolloutText).targetPacketSha256,r.targetPacketSha256);assert.equal(JSON.parse(next.rolloutText).execution.runId,'1001')
 assert.throws(()=>api.replayFcfTargetRollout({...base,...rollout,inventoryAdmission:structuredClone(inventoryAdmission)}),/FCF_INVENTORY/)
})
test('replay checks bounded exact raw TEXT/SHA before parsing or source access',()=>{
 assert.equal(typeof api.replayFcfTargetRollout,'function')
 for(const [rolloutText,rolloutSha256]of[['{}','0'.repeat(64)],['\ufeff{}',sha('\ufeff{}')],['{',sha('{')]])assert.throws(()=>api.replayFcfTargetRollout({rolloutText,rolloutSha256}),/FCF_ROLLOUT/)
})
test('unknown wrapper fields, legacy packets and substituted target never select a writer',()=>{
 for(const value of[{schemaVersion:1,kind:'fcf-current-release'},{schemaVersion:2,kind:'fcf-current-target-release'},{schemaVersion:1,kind:'fcf-current-target-rollout',targetSlug:'es-ct-tercera-g2'},{schemaVersion:1,kind:'fcf-current-target-rollout',verified:true}]){
  const rolloutText=JSON.stringify(value);assert.throws(()=>api.replayFcfTargetRollout({rolloutText,rolloutSha256:sha(rolloutText)}),/FCF_ROLLOUT/)
 }
})
