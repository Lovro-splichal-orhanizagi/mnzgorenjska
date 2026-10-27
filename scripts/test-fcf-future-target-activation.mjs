// TEST ONLY integration. OLD authority is genuine; all NEW controls are synthetic.
import test from 'node:test'
import assert from 'node:assert/strict'
import {activationFixture,refreshProjection,changePrices} from './fcf-future-activation-test-fixture.mjs'
import {sha} from './fcf-missing-inventory-test-fixture.mjs'
const api=await import('./fcf-future-target-activation.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const build=i=>api.buildFcfFutureTargetActivation(i),verify=i=>api.verifyFcfFutureTargetActivation(i)
const enabled=['FCF_POST_SIX_EVIDENCE_DIR','FCF_FUTURE_SOURCE_EVIDENCE_DIR','FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE','FCF_SIX_ACCOUNTING_WIRE','FCF_HISTORICAL_RETAINED_DIR'].every(k=>process.env[k]),actual={skip:enabled?false:'Genuine retained37 history and immutable six-original authority required'}
const copy=i=>({...i,importReceipt:structuredClone(i.importReceipt),nativeProjection:structuredClone(i.nativeProjection),pricingReplay:structuredClone(i.pricingReplay),execution:{...i.execution}})
test('future activation APIs exist and refuse forged source/cleanup before IO',()=>{
 for(const name of ['buildFcfFutureTargetActivation','verifyFcfFutureTargetActivation'])assert.equal(typeof api[name],'function',name)
 let calls=0;const previous=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('unexpected IO')}
 try{for(const fn of [build,verify])assert.throws(()=>fn({targetSlug:'es-ct-tercera-g9',sourceCommit:'c'.repeat(40),inventoryAdmission:{verified:true},cleanupEvidence:{phase:'applied'},importReceipt:{},nativeProjection:{},pricingReplay:{},execution:{repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit:'c'.repeat(40),runId:'457',runAttempt:'1'},now:0,...(fn===verify?{activationText:'{}',activationSha256:sha('{}')}: {})}),/FCF_/);assert.equal(calls,0)}finally{globalThis.fetch=previous}
})
test('branded source and original import replay freeze actual post-price native R7 activation DATA',actual,async t=>{
 const f=await activationFixture(t),i=f.input,result=build(i),a=JSON.parse(result.activationText),original=JSON.parse(f.original.rolloutText)
 assert.equal(a.schemaVersion,4);assert.equal(a.kind,'fcf-future-current-target-activation');assert.equal(Object.keys(a).length,13);assert.equal(a.importReceiptId,'987');assert.equal(a.launchProposal.roundNumber,7);assert.ok(Date.parse(a.launchProposal.deadlineUTC)>i.now);assert.equal(i.nativeProjection.native.competition.prvi_fantasy_krog,1)
 assert.equal(a.importRolloutText,f.original.rolloutText);assert.equal(a.importRolloutSha256,f.original.rolloutSha256);assert.notEqual(a.sourceCommit,original.sourceCommit);assert.deepEqual(JSON.parse(a.importRolloutText).execution,original.execution);assert.deepEqual(a.execution,i.execution)
 assert.notEqual(i.importReceipt.imported_state_sha256,i.importReceipt.currentStateSha256,'intentional repricing changes state');assert.equal(a.nativeSnapshotText,i.nativeProjection.dependencySnapshotText);assert.equal(a.nativeSnapshotSha256,sha(a.nativeSnapshotText));assert.equal(a.readiness.pricingSnapshotText,i.nativeProjection.pricingSnapshot.snapshotText);assert.equal(a.readiness.squad.length,15);assert.ok(a.readiness.cheapestLegal15<=100);assert.equal(result.activationSha256,sha(result.activationText));assert.ok(Object.isFrozen(result))
 assert.deepEqual(verify({...i,...result,now:i.now+1000}),result)
 await t.test('copied or plain authority and caller launch/readiness controls refuse',()=>{
  for(const [key,value]of [['inventoryAdmission',structuredClone(i.inventoryAdmission)],['inventoryAdmission',f.data],['cleanupEvidence',structuredClone(i.cleanupEvidence)],['cleanupEvidence',f.proofs.legacy],['cleanupEvidence',f.proofs.prepared],['readiness',{}],['launchProposal',{}],['activate',true]])assert.throws(()=>build({...i,[key]:value}),/FCF_/)
 })
 await t.test('receipt identity/current state/original execution and closed schema are mandatory',()=>{
  for(const mutate of [x=>x.importReceipt.competition_id=783,x=>x.importReceipt.stage='activated',x=>x.importReceipt.currentActive=true,x=>x.importReceipt.currentStateSha256='0'.repeat(64),x=>x.importReceipt.source_fingerprint='0'.repeat(64),x=>x.importReceipt.cleanup_before_sha256='0'.repeat(64),x=>x.importReceipt.packet_sha256='0'.repeat(64),x=>x.importReceipt.extra=true,x=>x.execution.runAttempt='2']){const bad=copy(i);mutate(bad);assert.throws(()=>build(bad),/FCF_/)}
 })
 await t.test('native dependency/pricing opaque exactness and semantic mutations hold',()=>{
  for(const mutate of [x=>x.nativeProjection.dependencySnapshotText+=' ',x=>x.nativeProjection.native.dependencies.competitionUserRows=1,x=>x.nativeProjection.databaseInventory.identityPrivacy.checkedKeys=[],x=>x.nativeProjection.native.competition.active=true,x=>x.pricingReplay.players[0].value+=.5]){const bad=copy(i);mutate(bad);assert.throws(()=>build(bad),/FCF_/)}
  const bad=copy(i);bad.nativeProjection.native.dependencies.rounds.find(r=>r.roundId===a.launchProposal.roundId).userRows=1;refreshProjection(bad.nativeProjection);assert.throws(()=>build(bad),/user|dependenc|launch/i)
  const keeper=copy(i);changePrices(keeper,ps=>ps.filter(p=>p.position==='GK'&&p.team_id===ps[0].team_id).forEach(p=>p.position_source='ugibanje'));assert.throws(()=>build(keeper),/keeper|goalkeeper/i)
 })
 await t.test('intentional persisted repricing requires matching current state and complete replay',()=>{
  const changed=copy(i);changePrices(changed,ps=>{ps[0].value+=.5;ps[0].value_start=ps[0].value})
  const s=JSON.parse(changed.nativeProjection.pricingSnapshot.snapshotText);s.stateSha256='f'.repeat(64)
  const snapshotText=JSON.stringify(s,null,2)+'\n';changed.nativeProjection.pricingSnapshot={snapshotText,snapshotSha256:sha(snapshotText)};changed.importReceipt.currentStateSha256=s.stateSha256;refreshProjection(changed.nativeProjection)
  const fresh=build(changed);assert.notEqual(fresh.activationSha256,result.activationSha256)
  assert.throws(()=>verify({...changed,...result}),/activation packet differs/)
  changed.pricingReplay.players[0].value-=.5;assert.throws(()=>build(changed),/pricing|persisted/i)
 })
 await t.test('frozen proposal cannot follow changed/expired state or altered exact activation wire',()=>{
  const bad=copy(i);bad.nativeProjection.native.rounds.find(r=>r.id===a.launchProposal.roundId).deadline_at='2026-10-31T23:00:00Z';bad.nativeProjection.databaseInventory.rounds=structuredClone(bad.nativeProjection.native.rounds);refreshProjection(bad.nativeProjection);assert.throws(()=>verify({...bad,...result}),/projection|differs/i)
  assert.throws(()=>verify({...i,...result,now:i.now+86400001}),/FCF_/)
  assert.throws(()=>verify({...i,...result,activationSha256:'0'.repeat(64)}),/FCF_/)
  for(const mutate of [p=>p.launchProposal.roundNumber=8,p=>p.launchProposal=null,p=>p.readiness.cheapestLegal15=1,p=>p.execution.runId='999',p=>p.auditedUTC=new Date(i.now+1).toISOString(),p=>p.activate=true,p=>p.nativeSnapshotText+=' ']){const p=JSON.parse(result.activationText);mutate(p);const activationText=JSON.stringify(p);assert.throws(()=>verify({...i,activationText,activationSha256:sha(activationText)}),/FCF_/)}
 })
})
