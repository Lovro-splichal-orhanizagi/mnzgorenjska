import test from 'node:test'
import assert from 'node:assert/strict'
import {admissionFixture,retained} from './fcf-missing-inventory-admission-fixture.mjs'
import {readFcfCapturedTargetEvidence,getFcfCapturedTargetData,readFcfCleanupEvidence} from './fcf-target-evidence.mjs'
import {compileFcfTargetReleasePacket} from './fcf-target-release.mjs'
import {cleanupFixture} from './fcf-target-test-fixture.mjs'
import {nativePlanFixture,writerCommit} from './fcf-native-plan-test-fixture.mjs'
import {getHistoricalStatisticsPolicy} from './lib/historical-statistics-policy.mjs'
const api=await import('./fcf-target-native-adapter.mjs').catch(()=>({})),G1='es-ct-segona-g1',G9='es-ct-tercera-g9'
const anchors={'4109388':[321646,28706,8574,8575],'4118352':[306164,27616,8304,8305],'4118358':[306171,27617,8301,8298]}
function databaseFor(data,now){
 const f=nativePlanFixture(data.targetSlug),policy=getHistoricalStatisticsPolicy(data.targetSlug),ids=new Map()
 for(const e of policy.entries){ids.set(`${e.homeSourceClubId}/${e.homeSourceCategoryId}`,anchors[e.sourceMatchId][2]);ids.set(`${e.awaySourceClubId}/${e.awaySourceCategoryId}`,anchors[e.sourceMatchId][3])}
 const teams=data.clubs.map((c,i)=>({id:ids.get(`${c.sourceClubId}/${c.sourceCategoryId}`)??950000+i,competition_id:data.competition.id,name:c.name})),team=c=>teams.find(t=>t.name===c.name).id
 const rounds=f.databaseInventory.rounds,matches=data.fixtures.map((m,i)=>({id:anchors[m.id.slice(2)]?.[0]??850000+i,round_id:rounds.find(r=>r.number===m.round).id,home_team_id:team(m.clubs[0]),away_team_id:team(m.clubs[1]),zapisnik_id:m.round<=3?m.id:null}))
 return{...f.databaseInventory,capturedUTC:new Date(now).toISOString(),teams,matches,players:[]}
}
test('native adapter entrypoints require real Task5 getter brands, never a raw callback or clone',()=>{
 for(const name of['deriveFcfTargetNativeMapping','planFcfNativeMatchImport','loadFcfTargetOfflineProvider']){
  assert.equal(typeof api[name],'function',`${name} exists`)
  assert.throws(()=>api[name]({targetSlug:G1,inventoryAdmission:{verified:true,evidenceKind:'fcf-missing-target-inventory',documents:[]},sourceData:()=>{throw Error('raw callback used')},now:Date.now()}),/FCF_INVENTORY/)
 }
})
for(const targetSlug of[G1,G9])test(`actual branded ${targetSlug} getter feeds full native mapping/provider with capture A and writer B`,{skip:!retained},async t=>{
 const f=await admissionFixture(t),inventoryAdmission=readFcfCapturedTargetEvidence({...f.wire,targetSlug}),data=getFcfCapturedTargetData({targetEvidence:inventoryAdmission,targetSlug,now:f.now}),databaseInventory=databaseFor(data,f.now),base={targetSlug,inventoryAdmission,databaseInventory,existingExceptionBindings:nativePlanFixture(targetSlug).existingExceptionBindings,sourceCommit:writerCommit,now:f.now}
 const mapping=JSON.parse(api.deriveFcfTargetNativeMapping(base).proposalText)
 assert.equal(mapping.mappings.length,16);assert.equal(mapping.fixtures.length,240);assert.equal(mapping.sourceCommit,writerCommit);assert.equal(mapping.captureSourceCommit,data.binding.sourceCommit)
 const cleanupEvidence=readFcfCleanupEvidence(cleanupFixture(t).input),packet=compileFcfTargetReleasePacket({targetSlug,sourceCommit:writerCommit,targetEvidence:inventoryAdmission,cleanupEvidence,databaseInventory,now:f.now})
 const provider=api.loadFcfTargetOfflineProvider({targetSlug,inventoryAdmission,targetPacketText:packet.manifestText,targetPacketSha256:packet.manifestSha256,now:f.now})
 assert.equal(provider.schedule().length,240);assert.ok(Object.isFrozen(provider.schedule()));assert.equal(provider.sourceEvidence.sourceClaimState,'consumed')
 const played=data.fixtures.find(m=>m.statisticsStatus==='available'),rows=api.planFcfNativeMatchImport({...base,sourceMatchId:played.id})
 assert.equal(rows.appearances.length,played.appearances.length);assert.equal(rows.goals.length,played.goals.length);assert.ok(rows.players.every(p=>p.player_id===null&&p.reg_st>0))
 assert.deepEqual(provider.report(played.id),played)
 assert.throws(()=>provider.report('es4116202'),/FCF_NATIVE_ADAPTER/)
 assert.throws(()=>api.deriveFcfTargetNativeMapping({...base,inventoryAdmission:structuredClone(inventoryAdmission)}),/FCF_INVENTORY/)
 const changed=JSON.parse(packet.manifestText);changed.target.fixtures.find(m=>m.appearances?.length).appearances[0].minute=1
 const text=JSON.stringify(changed);const {createHash}=await import('node:crypto'),hash=createHash('sha256').update(text).digest('hex')
 assert.throws(()=>api.loadFcfTargetOfflineProvider({targetSlug,inventoryAdmission,targetPacketText:text,targetPacketSha256:hash,now:f.now}),/FCF_NATIVE_ADAPTER/)
})
