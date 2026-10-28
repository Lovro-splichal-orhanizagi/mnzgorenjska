// Genuine retained failed60 ledger/original bytes; all NEW source/native controls
// below are synthetic offline tests and establish no actual rollout readiness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {postG1RetainedFixture} from './fcf-post-g1-test-fixture.mjs'
import {readFcfPostG1HistoryWire} from './fcf-future-source-approval.mjs'
import {g1NativeBase,g1NativeActivationFixture} from './fcf-g1-native-test-fixture.mjs'
import {readFcfFutureNativeSource,requireFcfFutureCleanupIssuer,requireFcfFutureNativeWriter,fcfFutureNativeVersions} from './fcf-future-native-scope.mjs'
import {deriveFcfFutureTargetNativeMapping} from './fcf-future-target-native-adapter.mjs'
import {buildFcfFutureTargetImportRollout,replayFcfFutureTargetImportRollout} from './fcf-future-target-rollout.mjs'
import {buildFcfFutureTargetActivation,verifyFcfFutureTargetActivation} from './fcf-future-target-activation.mjs'
import {buildFcfG1NativeSupplementBinding} from './fcf-g1-supplement-native.mjs'
const enabled={skip:['FCF_G1_POST_FAILURE_EVIDENCE_DIR','FCF_POST_SIX_EVIDENCE_DIR','FCF_FUTURE_SOURCE_EVIDENCE_DIR','FCF_SIX_ACCOUNTING_WIRE','FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE','FCF_HISTORICAL_RETAINED_DIR'].every(k=>process.env[k])?false:'Explicit genuine retained ledger/original fixtures required; new controls synthetic'}
let history
async function options(){if(!history){const f=postG1RetainedFixture();history=await readFcfPostG1HistoryWire({source:f.history,github:f.github,now:f.now})}return {postFailure:history}}
test('new source capability derives original G9 cleanup issuer and enforces one final source/native writer',enabled,async t=>{
 const f=await g1NativeBase(t,await options()),{base,data}=f
 assert.equal(data.binding.priorSourceGETs,60);assert.equal(data.binding.actualSourceGETs,300)
 assert.deepEqual(fcfFutureNativeVersions(data),{packet:5,rollout:4,activation:5})
 assert.equal(base.cleanupEvidence.sourceCommit,'da8516a66084926ebddd3f065fc90d85c2bdf9b9')
 assert.notEqual(base.cleanupEvidence.sourceCommit,data.binding.accountingBinding.latest.sourceCommit)
 assert.doesNotThrow(()=>requireFcfFutureCleanupIssuer({cleanupEvidence:base.cleanupEvidence,data}))
 assert.doesNotThrow(()=>requireFcfFutureNativeWriter({data,sourceCommit:base.sourceCommit}))
 assert.throws(()=>requireFcfFutureNativeWriter({data,sourceCommit:'c'.repeat(40)}),/same|equal/)
 assert.throws(()=>readFcfFutureNativeSource({targetSlug:base.targetSlug,inventoryAdmission:structuredClone(base.inventoryAdmission),now:base.now}),/FCF_/)
 assert.throws(()=>readFcfFutureNativeSource({targetSlug:base.targetSlug,inventoryAdmission:base.inventoryAdmission,now:base.now+86400001}),/FCF_/)
 assert.throws(()=>requireFcfFutureCleanupIssuer({cleanupEvidence:f.old.proofs.applied,data}),/issuer/)
})
test('packet5/rollout4 preserve original six and add separate exact supplement; native drift never guesses IDs',enabled,async t=>{
 const {base,data,execution}=await g1NativeBase(t,await options()),mapping=deriveFcfFutureTargetNativeMapping(base),r=buildFcfFutureTargetImportRollout({...base,execution,mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256}),v=JSON.parse(r.rolloutText),p=JSON.parse(v.targetPacketText)
 assert.equal(v.schemaVersion,4);assert.equal(p.schemaVersion,5);assert.equal(v.cleanupBinding.originals.length,6);assert.equal(v.cleanupBinding.appliedReceipt.markers.length,6)
 assert.equal(v.supplementalBinding.policySha256,'a9141400858c80322b6cb12b13c54a5dde45e93f080b4fe0b644dce513657ee7');assert.deepEqual(v.supplementalBinding,p.supplementalBinding)
 assert.deepEqual(p.target.fixtures.filter(f=>f.statisticsStatus==='unavailable_historical').map(f=>f.id).sort(),['es4109388','es4109404','es4109409'])
 assert.deepEqual(replayFcfFutureTargetImportRollout({...base,execution,...r}),r)
 for(const mutate of [d=>d.matches.find(m=>m.zapisnik_id==='es4109409').zapisnik_id=null,d=>d.rounds.find(r=>r.number===3).number=4,d=>d.supplementalMarker={binding:{},afterImage:{},receipt:{}},d=>d.installedMarkers[0].markers[0].homeTeamId++]){
  const x={...base,databaseInventory:structuredClone(base.databaseInventory)};mutate(x.databaseInventory);assert.throws(()=>deriveFcfFutureTargetNativeMapping(x),/FCF_/)
 }
 assert.throws(()=>deriveFcfFutureTargetNativeMapping({...base,sourceCommit:'c'.repeat(40)}),/equal/)
 const missing=structuredClone(base.databaseInventory);missing.matches.find(m=>m.zapisnik_id==='es4109409').zapisnik_id=null
 assert.throws(()=>buildFcfG1NativeSupplementBinding({data,databaseInventory:missing}),/HOLD/)
})
test('activation5 replays private new source with unchanged16 keepers/prices/legal15 and rejects old-version relabeling',enabled,async t=>{
 const f=await g1NativeActivationFixture(t,await options()),a=buildFcfFutureTargetActivation(f.input),p=JSON.parse(a.activationText)
 assert.equal(p.schemaVersion,5);assert.equal(p.sourceCommit,f.data.binding.sourceCommit);assert.equal(p.readiness.squad.length,15);assert.ok(p.readiness.cheapestLegal15<=100)
 assert.deepEqual(verifyFcfFutureTargetActivation({...f.input,...a}),a)
 assert.throws(()=>buildFcfFutureTargetActivation({...f.input,sourceCommit:'c'.repeat(40),execution:{...f.input.execution,commit:'c'.repeat(40)}}),/equal/)
 const changed=JSON.parse(a.activationText);changed.schemaVersion=4;const text=JSON.stringify(changed)
 const {createHash}=await import('node:crypto');assert.throws(()=>verifyFcfFutureTargetActivation({...f.input,activationText:text,activationSha256:createHash('sha256').update(text).digest('hex')}),/FCF_/)
})

test('actual retained-shaped placeholder maps existing native IDs and binds its entire row; drift never creates an anchor',enabled,async t=>{
 const {base,data,execution}=await g1NativeBase(t,{...await options(),legacyPlaceholder:true}),m=base.databaseInventory.matches.find(m=>m.vir_brez_izida===true),b=buildFcfG1NativeSupplementBinding({data,databaseInventory:base.databaseInventory})
 assert.equal(b.native.matchId,m.id);assert.equal(b.prelaunch.kind,'exact-legacy-placeholder-v1');assert.deepEqual(JSON.parse(b.prelaunch.beforeImageText),m)
 const {createHash}=await import('node:crypto');assert.equal(b.prelaunch.beforeSha256,createHash('sha256').update(b.prelaunch.beforeImageText).digest('hex'))
 const mapping=deriveFcfFutureTargetNativeMapping(base),r=buildFcfFutureTargetImportRollout({...base,execution,mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256})
 assert.deepEqual(JSON.parse(r.rolloutText).supplementalBinding,b)
 const after=structuredClone(base.databaseInventory),am=after.matches.find(x=>x.id===m.id)
 Object.assign(am,{zapisnik_id:'es4109409',source_url:'https://www.fcf.cat/ca/competicio/acta/4109409',source_round:3,vir_brez_izida:false,home_goals:null,away_goals:null,statistics_status:'unavailable_historical',statistics_reason:'closed_official_result_and_individual_statistics_unavailable'})
 after.supplementalMarker={binding:b,afterImage:structuredClone(am),receipt:{sourceFingerprintSha256:b.sourceFingerprintSha256}}
 assert.deepEqual(buildFcfG1NativeSupplementBinding({data,databaseInventory:after}),b)
 assert.deepEqual(replayFcfFutureTargetImportRollout({...base,databaseInventory:after,execution,...r}),r)
 for(const mutate of [x=>x.played_on='2026-10-05',x=>x.home_team_id=x.away_team_id,x=>x.round_id++,x=>x.zapisnik_id='es4109410',x=>x.source_url='https://www.fcf.cat/ca/competicio/acta/4109409',x=>x.source_round=3,x=>x.vir_brez_izida=false,x=>x.home_goals=1,x=>x.imported_at='2026-10-28T00:00:00Z',x=>x.statistics_reason='foreign',x=>x.import_warnings=['foreign'],x=>delete x.source_phase]){
  const d=structuredClone(base.databaseInventory);mutate(d.matches.find(x=>x.id===m.id));assert.throws(()=>buildFcfG1NativeSupplementBinding({data,databaseInventory:d}),/HOLD/)
 }
 for(const mutate of [d=>d.matches.push({...m,id:m.id+900000}),d=>d.matches.find(x=>x.id!==m.id).zapisnik_id='es4109409',d=>d.matches=d.matches.filter(x=>x.id!==m.id),d=>d.groups.find(g=>g.slug===base.targetSlug).active=true]){const d=structuredClone(base.databaseInventory);mutate(d);assert.throws(()=>buildFcfG1NativeSupplementBinding({data,databaseInventory:d}),/HOLD/)}
})
