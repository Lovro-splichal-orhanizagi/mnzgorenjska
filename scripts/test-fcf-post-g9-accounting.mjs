// New G9 formats are fixture-only controls; actual retained history proves only
// the earlier37. No actual new G9 receipt exists or is claimed by this suite.
import test from 'node:test'
import assert from 'node:assert/strict'
import {postG9AccountingWire} from './fcf-post-g9-accounting-test-fixture.mjs'
import {rewriteManifest} from './fcf-future-admission-test-fixture.mjs'
import {getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {requireFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
import {buildFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
const api=await import('./fcf-post-g9-accounting.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const read=f=>{assert.equal(typeof api.readFcfPostG9Accounting,'function','post-G9 accounting reader required');return api.readFcfPostG9Accounting(f)}
const genuine={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Retained old37/source fixtures required; NEW G9 formats are TEST ONLY'}

test('closed boundary rejects asserted counts and forged immutable ledgers',()=>{
 assert.equal(typeof api.readFcfPostG9Accounting,'function','post-G9 accounting reader required')
 for(const input of [null,{}, {priorSourceGETs:277,verified:true}])assert.throws(()=>read(input),/FCF_INVENTORY/)
 for(const value of [null,{},Object.freeze({kind:'fcf-post-g9-accounting-only',priorSourceGETs:277})])assert.throws(()=>api.requireFcfPostG9Accounting(value),/FCF_INVENTORY/)
})
for(const [mode,spent,remaining,status]of [['completed',240,201,'audited'],['failed-audit',240,201,'failed'],['diagnostic',1,440,'failed'],['unstarted',0,441,'not-started']])test(`TEST ONLY ${mode} retains actual spent${spent} as accounting only`,genuine,async t=>{
 const f=await postG9AccountingWire(t,mode),p=read(f)
 assert.equal(p.kind,'fcf-post-g9-accounting-only');assert.equal(p.priorSourceGETs,37+spent);assert.equal(p.latestSourceGETs,spent);assert.equal(p.maximumCumulativeSourceGETs,478);assert.equal(p.remainingSourceGETs,remaining);assert.equal(p.admissible,false)
 assert.equal(p.priorAccountingBinding.kind,'fcf-post-six-accounting-only');assert.equal(p.priorAccountingBinding.priorSourceGETs,37)
 assert.equal(p.latest.runId,'123');assert.equal(p.latest.runAttempt,'1');assert.equal(p.latest.sourceCommit,'a'.repeat(40));assert.equal(p.latest.child.status,status);assert.equal(p.latest.child.newSourceGETs,spent)
 assert.equal(p.latest.planSha256,f.latest.plan.planSha256);assert.equal(p.latest.claimBinding.claimJsonSha256,f.latest.claim.expected.claimJsonSha256);assert.equal(p.latest.finalReceiptBinding.manifestSha256,f.latest.finalReceipt.expected.manifestSha256)
 assert.equal(api.requireFcfPostG9Accounting(p),p);assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.latest)&&Object.isFrozen(p.latest.child)&&Object.isFrozen(p.priorAccountingBinding.latest))
 assert.throws(()=>{p.latest.child.newSourceGETs=0},TypeError)
 for(const copy of [{...p},structuredClone(p)])assert.throws(()=>api.requireFcfPostG9Accounting(copy),/FCF_INVENTORY/)
 for(const require of [requireFcfPostSixAccounting,requireFcfInventoryConsumption])assert.throws(()=>require(p),/FCF_INVENTORY/)
 assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:p,now:f.now}),/FCF_INVENTORY/)
 assert.throws(()=>buildFcfFutureSourcePlan({sourceCommit:'b'.repeat(40),accountingProof:p,rulesetSnapshotSha256:'c'.repeat(64),now:f.now}),/FCF_INVENTORY/)
 for(const field of ['claimProof','consumptionProof','targetEvidence','documents','fixtures','retained'])assert.equal(Object.hasOwn(p,field),false)
})
test('TEST ONLY archived failure never refunds spent GETs or mutates raw expiry metadata',genuine,async t=>{
 const f=await postG9AccountingWire(t,'diagnostic'),originalCompletion=f.now-1;f.now=Date.parse('2030-01-01T00:00:00Z')
 for(const b of [f.latest.consumption,f.latest.child.diagnostic,f.latest.finalReceipt])b.artifact.expired=true
 const p=read(f);assert.equal(p.priorSourceGETs,38);assert.equal(p.remainingSourceGETs,440)
 for(const b of [f.latest.consumption,f.latest.child.diagnostic,f.latest.finalReceipt])assert.equal(b.artifact.expired,true)
 assert.equal(p.latest.completedUTC,new Date(originalCompletion).toISOString())
})
for(const [name,change]of [
 ['unknown outer fields',f=>f.verified=true],['asserted prior history',f=>f.prior={priorSourceGETs:37}],['invented latest total',f=>f.latest.actualSourceGETs=277],['missing child',f=>delete f.latest.child],['borrowed claim',f=>f.latest.claim.expected.claimCommit='b'.repeat(40)],['changed claim bytes',f=>f.latest.claim.claimBytes[0]^=1],['missing protected rule',f=>f.latest.claim.rulesets=[]],['borrowed consumption',f=>f.latest.consumption.run.id=124],['nonterminal child',f=>f.latest.child.unstarted.run.status='in_progress'],['unknown capture outcome',f=>f.latest.child.unstarted.jobs[0].steps[0].conclusion='cancelled'],['failed capture is not zero',f=>f.latest.child.unstarted.jobs[0].steps[0].conclusion='failure'],['missing capture outcome',f=>f.latest.child.unstarted.jobs[0].steps=[]],['nonterminal final',f=>f.latest.finalReceipt.run.status='in_progress'],['cancelled final',f=>f.latest.finalReceipt.run.conclusion='cancelled'],['unknown artifact expiry',f=>delete f.latest.finalReceipt.artifact.expired],['changed final ZIP',f=>f.latest.finalReceipt.zipBytes[0]^=1],['changed final pin',f=>f.latest.finalReceipt.expected.manifestSha256='b'.repeat(64)],['earlier caller clock',f=>f.now=Date.parse(f.latest.plan.createdUTC)],['nonfinite clock',f=>f.now=NaN],['explicit undefined clock',f=>f.now=undefined],['explicit null clock',f=>f.now=null],
])test(`TEST ONLY accounting refuses ${name}`,genuine,async t=>{const f=await postG9AccountingWire(t,'unstarted');change(f);assert.throws(()=>read(f),/FCF_INVENTORY/)})
for(const [name,change]of [['refund',m=>m.actualSourceGETs=37],['invented cap517',m=>m.maximumSourceGETs=517],['admissibility',m=>m.admissible=true],['claim binding',m=>m.claimBinding.claimJsonSha256='b'.repeat(64)],['completion rewind',m=>m.completedUTC='2026-10-27T12:00:00.000Z'],['completion future',m=>m.completedUTC='2030-01-01T00:00:00.000Z']])test(`TEST ONLY rehashed final cannot assert ${name}`,genuine,async t=>{const f=await postG9AccountingWire(t,'diagnostic');rewriteManifest(f.latest.finalReceipt,change);assert.throws(()=>read(f),/FCF_INVENTORY/)})
