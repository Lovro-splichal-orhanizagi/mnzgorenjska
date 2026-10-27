import test from 'node:test'
import assert from 'node:assert/strict'
import {futureAdmissionWire,authenticateFutureWire,rewriteManifest,sourceSteps,bundle} from './fcf-future-admission-test-fixture.mjs'
import {metadata,zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {futureCaptureFixture} from './fcf-future-capture-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {getFcfCapturedTargetData} from './fcf-missing-inventory-evidence.mjs'
const api=await import('./fcf-future-source-admission.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error})

test('future completed/final/target boundary is separate from legacy admission',()=>{
 for(const name of ['readFcfFutureSourceCompletedChildArtifact','readFcfFutureSourceDiagnosticChildArtifact','readFcfFutureSourceUnstartedChild','buildFcfFutureSourceFinalReceipt','readFcfFutureSourceFinalReceipt','readFcfFutureCapturedTargetEvidence','getFcfFutureCapturedTargetData'])assert.equal(typeof api[name],'function',name+' required')
})
const genuine={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Actual37 history and retained G9 raw bytes required; new source/Actions data is TEST ONLY'}
test('TEST ONLY failed offline audit retains full240 spent and an inadmissible277 final',genuine,async t=>{
 assert.equal(typeof api.readFcfFutureSourceFailedAuditChildArtifact,'function')
 const w=await futureAdmissionWire(t),c=authenticateFutureWire(w),inventory=w.child.inventory
 // Synthetic failed Actions audit over retained TEST ONLY full source inventory.
 inventory.run.conclusion='failure';inventory.jobs[0].conclusion='failure';inventory.jobs[0].steps[2].conclusion='failure';inventory.jobs[0].steps[3].conclusion='skipped'
 const input={plan:c.plan,consumptionProof:c.consumptionProof,inventory,now:c.now},child=api.readFcfFutureSourceFailedAuditChildArtifact(input)
 assert.equal(child.status,'failed');assert.equal(child.stopReason,'offline-audit-failed');assert.equal(child.newSourceGETs,240);assert.equal(child.actualSourceGETs,277);assert.equal(child.auditBinding,null);assert.ok(child.inventoryBinding)
 const finalInput={...c,childRecords:[child],execution:{...w.claim.execution,jobId:'777'}},final=api.buildFcfFutureSourceFinalReceipt(finalInput)
 assert.equal(final.admissible,false);assert.equal(final.actualSourceGETs,277)
 assert.throws(()=>api.buildFcfFutureSourceFinalReceipt({...finalInput,childRecords:[structuredClone(child)]}),/FCF_INVENTORY/)
 assert.throws(()=>api.readFcfFutureSourceFailedAuditChildArtifact({...input,consumptionProof:structuredClone(c.consumptionProof)}),/FCF_INVENTORY/)
 assert.throws(()=>api.getFcfFutureCapturedTargetData({targetEvidence:child,now:c.now}),/FCF_INVENTORY/)
 for(const change of [b=>b.jobs[0].steps.splice(2,1),b=>b.jobs[0].steps[2].name='Different audit',b=>b.jobs[0].steps[2].conclusion='success',b=>b.jobs[0].conclusion='success',b=>b.jobs[0].steps[0].conclusion='failure',b=>b.jobs[0].steps[1].conclusion='failure',b=>b.jobs[0].steps.push({...b.jobs[0].steps[2]}),b=>b.jobs[0].id=556,b=>b.zipBytes[0]^=1]){
  const b=structuredClone(inventory);b.zipBytes=Buffer.from(b.zipBytes);change(b)
  assert.throws(()=>api.readFcfFutureSourceFailedAuditChildArtifact({...input,inventory:b}),/FCF_INVENTORY/)
 }
 const bytes=Buffer.from(JSON.stringify(final)),raw=bundle(metadata({bytes:zip([{name:'manifest.json',body:bytes}]),name:'fcf-missing-inventory-final-123-1',jobName:'missing-inventory-receipt',jobId:'777',artifactId:'999',steps:['Retain final FCF inventory receipt']}));raw.expected.manifestSha256=sha(bytes);raw.run.conclusion='failure'
 const receiptInput={...raw,...c,childRecords:[child]},receipt=api.readFcfFutureSourceFinalReceipt(receiptInput)
 assert.equal(receipt.admissible,false);assert.equal(receipt.actualSourceGETs,277)
 rewriteManifest(raw,m=>m.admissible=true)
 assert.throws(()=>api.readFcfFutureSourceFinalReceipt({...receiptInput,...raw}),/FCF_INVENTORY/)
})
test('TEST ONLY serialized raw source handoff authenticates one complete240 G9 child, original audit and final277 receipt',genuine,async t=>{
 assert.equal(typeof api.readFcfFutureCapturedTargetEvidence,'function')
 const w=await futureAdmissionWire(t),proof=api.readFcfFutureCapturedTargetEvidence(w),data=api.getFcfFutureCapturedTargetData({targetEvidence:proof,now:w.now})
 assert.equal(proof.evidenceKind,'fcf-future-captured-target');assert.equal(data.evidenceKind,proof.evidenceKind);assert.equal(data.targetSlug,'es-ct-tercera-g9');assert.equal(data.fixtures.length,240);assert.equal(data.documents.length,240);assert.equal(data.clubs.length,16);assert.equal(data.verifiedKeeperClubs.length,16)
 assert.equal(data.binding.protocol,'future-g9-after-six-v1');assert.equal(data.binding.priorSourceGETs,37);assert.equal(data.binding.newSourceGETs,240);assert.equal(data.binding.actualSourceGETs,277);assert.equal(data.binding.maximumSourceGETs,478);assert.equal(data.binding.sourceClaimState,'consumed')
 assert.equal(Object.hasOwn(data.competition,'firstFantasyPlayedOn'),false);assert.equal(Object.hasOwn(proof,'active'),false);assert.ok(Object.isFrozen(proof)&&Object.isFrozen(data)&&Object.isFrozen(data.fixtures));assert.match(data.binding.sourceFingerprintSha256,/^[a-f0-9]{64}$/)
 assert.deepEqual(api.getFcfFutureCapturedTargetData({targetEvidence:proof,now:w.now+1000}).binding,data.binding)
 assert.throws(()=>api.getFcfFutureCapturedTargetData({targetEvidence:structuredClone(proof),now:w.now}),/FCF_INVENTORY/)
 assert.throws(()=>getFcfCapturedTargetData({targetEvidence:proof,targetSlug:'es-ct-tercera-g9',now:w.now}),/FCF_INVENTORY/)
})
test('final builder requires branded matching claim, consumption and child; never copied proof flags',genuine,async t=>{
 const w=await futureAdmissionWire(t),c=authenticateFutureWire(w),child=api.readFcfFutureSourceCompletedChildArtifact({plan:c.plan,consumptionProof:c.consumptionProof,now:c.now,...w.child}),execution={...w.claim.execution,jobId:'777'}
 const f={...c,childRecords:[child],execution},m=api.buildFcfFutureSourceFinalReceipt(f)
 assert.equal(m.schemaVersion,4);assert.equal(m.kind,'fcf-future-source-final-receipt');assert.equal(m.admissible,true);assert.equal(m.children.length,1);assert.equal(m.newSourceGETs,240);assert.equal(m.actualSourceGETs,277)
 for(const extra of [{claimProof:structuredClone(c.claimProof)},{consumptionProof:structuredClone(c.consumptionProof)},{childRecords:[structuredClone(child)]},{childRecords:[]},{childRecords:[child,child]},{execution:{...execution,runId:'124'}}])assert.throws(()=>api.buildFcfFutureSourceFinalReceipt({...f,...extra}),/FCF_INVENTORY/)
})
for(const [name,change]of[
 ['borrowed inventory run',w=>w.child.inventory.run.id=124],['wrong inventory job',w=>w.child.inventory.jobs[0].id=556],['wrong source SHA',w=>w.child.inventory.run.head_sha='c'.repeat(40)],['missing capture step',w=>w.child.inventory.jobs[0].steps.shift()],['failed audit step',w=>w.child.audit.jobs[0].steps[2].conclusion='failure'],['expired audit artifact',w=>w.child.audit.artifact.expired=true],['borrowed final run',w=>w.finalReceipt.run.id=124],['borrowed consumption run',w=>w.consumption.run.id=124],['borrowed claim commit',w=>w.claim.expected.claimCommit='c'.repeat(40)],['changed raw inventory ZIP',w=>{w.child.inventory.zipBytes[0]^=1}],['nonterminal source run',w=>{w.child.inventory.run.status='in_progress';w.child.inventory.run.conclusion=null}],['failed terminal run',w=>w.child.audit.run.conclusion='failure'],['cancelled terminal run',w=>w.finalReceipt.run.conclusion='cancelled'],['old16 accounting assertion',w=>w.plan.priorSourceGETs=16],['copied source status',w=>w.child.verified=true],['caller target flag',w=>w.verified=true],
])test(`raw target admission refuses ${name}`,genuine,async t=>{const w=await futureAdmissionWire(t);change(w);assert.throws(()=>api.readFcfFutureCapturedTargetEvidence(w),/FCF_INVENTORY/)} )
for(const [name,change]of[
 ['canonical hash',a=>a.canonicalSha256='0'.repeat(64)],['calendar hash',a=>a.calendarSha256='0'.repeat(64)],['wrong source commit',a=>a.sourceCommit='c'.repeat(40)],['old audit schema',a=>a.schemaVersion=1],['future audited clock',a=>a.auditedUTC='2030-01-01T00:00:00.000Z'],['audit count refund',a=>a.actualSourceGETs=240],
])test(`independently pinned audit still refuses changed ${name}`,genuine,async t=>{const w=await futureAdmissionWire(t);rewriteManifest(w.child.audit,change);assert.throws(()=>api.readFcfFutureCapturedTargetEvidence(w),/FCF_INVENTORY/)} )
for(const [name,change]of[
 ['old final schema',m=>m.schemaVersion=3],['old16 refund',m=>m.priorSourceGETs=16],['cap517',m=>m.maximumSourceGETs=517],['wrong claim',m=>m.claimBinding.claimCommit='c'.repeat(40)],['false completion flag',m=>m.admissible=false],['invented source count',m=>m.newSourceGETs=239],
])test(`final receipt refuses caller-rehashed ${name}`,genuine,async t=>{const w=await futureAdmissionWire(t);rewriteManifest(w.finalReceipt,change);assert.throws(()=>api.readFcfFutureCapturedTargetEvidence(w),/FCF_INVENTORY/)} )
test('target getter refuses stale current source and cannot use failed history as fresh documents',genuine,async t=>{
 const w=await futureAdmissionWire(t),p=api.readFcfFutureCapturedTargetEvidence(w)
 assert.throws(()=>api.getFcfFutureCapturedTargetData({targetEvidence:p,now:w.now+86400001}),/FCF_INVENTORY|FCF_FUTURE_SOURCE/)
 assert.throws(()=>api.getFcfFutureCapturedTargetData({targetEvidence:w.history,now:w.now}),/FCF_INVENTORY/)
})
test('target getter cannot rewind before the authenticated final receipt completion',genuine,async t=>{
 const w=await futureAdmissionWire(t),p=api.readFcfFutureCapturedTargetEvidence(w)
 assert.throws(()=>api.getFcfFutureCapturedTargetData({targetEvidence:p,now:w.now-2}),/future|completion|receipt/)
})
test('counted403 diagnostic produces only an inadmissible38 final; collector cannot restart',genuine,async t=>{
 const f=await futureCaptureFixture(t);let calls=0;f.request=async()=>{calls++;return new Response('TEST ONLY refusal',{status:403})}
 const r=await collectFcfMissingInventoryChild(f);assert.equal(r.actualSourceGETs,1);assert.equal(calls,1);await assert.rejects(()=>collectFcfMissingInventoryChild(f),/one-shot|preexisting/)
 const entries=readdirSync(r.outputDirectory).map(name=>({name,body:readFileSync(join(r.outputDirectory,name))})),raw=entries.find(e=>e.name==='manifest.json'),m=JSON.parse(raw.body),diagnostic=bundle(metadata({bytes:zip(entries),name:'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:['Capture missing target inventory','Retain failed target inventory diagnostic'],run:'in_progress'}))
 Object.assign(diagnostic.expected,{manifestSha256:sha(raw.body),planSha256:f.plan.planSha256,childPlanSha256:m.childPlanSha256});diagnostic.jobs[0].conclusion='failure';diagnostic.jobs[0].steps[0].conclusion='failure'
 const child=api.readFcfFutureSourceDiagnosticChildArtifact({plan:f.plan,consumptionProof:f.consumptionProof,diagnostic,now:f.clock()}),final=api.buildFcfFutureSourceFinalReceipt({plan:f.plan,claimProof:f.claimProof,consumptionProof:f.consumptionProof,childRecords:[child],execution:{...f.execution,jobId:'777'},now:f.clock()})
 assert.equal(child.status,'failed');assert.equal(final.admissible,false);assert.equal(final.newSourceGETs,1);assert.equal(final.actualSourceGETs,38)
 const bytes=Buffer.from(JSON.stringify(final)),finalWire=bundle(metadata({bytes:zip([{name:'manifest.json',body:bytes}]),name:'fcf-missing-inventory-final-123-1',jobName:'missing-inventory-receipt',jobId:'777',artifactId:'999',steps:['Retain final FCF inventory receipt']}));finalWire.expected.manifestSha256=sha(bytes);finalWire.run.conclusion='failure'
 const input={...finalWire,plan:f.plan,claimProof:f.claimProof,consumptionProof:f.consumptionProof,childRecords:[child],now:f.clock()},receipt=api.readFcfFutureSourceFinalReceipt(input)
 assert.equal(receipt.actualSourceGETs,38);assert.equal(receipt.admissible,false)
 assert.throws(()=>api.getFcfFutureCapturedTargetData({targetEvidence:receipt,now:f.clock()}),/FCF_INVENTORY/)
 finalWire.run.conclusion='cancelled';assert.throws(()=>api.readFcfFutureSourceFinalReceipt({...input,...finalWire}),/FCF_INVENTORY/)
 finalWire.run.conclusion='failure';rewriteManifest(finalWire,m=>m.admissible=true);assert.throws(()=>api.readFcfFutureSourceFinalReceipt({...input,...finalWire}),/FCF_INVENTORY/)
})
test('only an explicitly skipped actual source capture step may prove zero new GETs',genuine,async t=>{
 const w=await futureAdmissionWire(t),c=authenticateFutureWire(w),run={...w.child.inventory.run,conclusion:'failure'},jobs=[{...w.child.inventory.jobs[0],conclusion:'failure',steps:[{name:sourceSteps[0],status:'completed',conclusion:'skipped'}]}],expected={runId:'123',runAttempt:'1',sourceCommit:w.plan.sourceCommit,planSha256:w.plan.planSha256,jobId:'555'}
 const i={plan:c.plan,consumptionProof:c.consumptionProof,now:c.now,run,jobs,expected},p=api.readFcfFutureSourceUnstartedChild(i),f=api.buildFcfFutureSourceFinalReceipt({...c,childRecords:[p],execution:{...w.claim.execution,jobId:'777'}})
 assert.equal(p.status,'not-started');assert.equal(f.actualSourceGETs,37);assert.equal(f.admissible,false)
 for(const steps of [[],[{name:sourceSteps[0],status:'completed',conclusion:'cancelled'}],[{name:sourceSteps[0],status:'completed',conclusion:'failure'}]])assert.throws(()=>api.readFcfFutureSourceUnstartedChild({...i,jobs:[{...jobs[0],steps}]}),/FCF_INVENTORY/)
})
