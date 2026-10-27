import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {futureCaptureFixture} from './fcf-future-capture-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
const opts={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Genuine37 accounting and retained G9 bytes required'}
const manifest=r=>JSON.parse(readFileSync(join(r.outputDirectory,'manifest.json')))
test('TEST ONLY future collector fetches all240 with real37 carried forward and unchanged pending R6',opts,async t=>{
 const f=await futureCaptureFixture(t),r=await collectFcfMissingInventoryChild(f),m=manifest(r)
 assert.equal(r.status,'inventory-complete');assert.equal(r.actualSourceGETs,240);assert.equal(f.calls.length,240);assert.equal(m.schemaVersion,4);assert.equal(m.kind,'fcf-future-source-inventory');assert.equal(m.priorSourceGETs,37);assert.equal(m.actualSourceGETs+m.priorSourceGETs,277);assert.equal(m.statisticsAudit,'not-run')
 assert.equal(m.documents.length,240);assert.ok(m.documents.every(d=>d.kind==='captured'));assert.equal(m.attempts[0].sequence,38);assert.equal(m.attempts.at(-1).sequence,277)
 assert.deepEqual(m.documents.filter(d=>d.validation.earlyStrictCheck==='not-applicable-historical').map(d=>d.id),['4118352','4118354','4118358'])
 for(let i=1;i<f.calls.length;i++)assert.ok(f.calls[i].time-f.calls[i-1].time>=3000)
 assert.ok(f.calls.every(c=>c.init.method==='GET'&&c.init.redirect==='manual'))
 await assert.rejects(()=>collectFcfMissingInventoryChild(f),/one-shot|preexisting/)
})
test('TEST ONLY changed presentation of a reviewed historical report is checked against original facts',opts,async t=>{
 const f=await futureCaptureFixture(t);f.docs.set('4118354',Buffer.concat([f.docs.get('4118354'),Buffer.from('\n<!-- TEST ONLY presentation difference -->')]))
 const r=await collectFcfMissingInventoryChild(f);assert.equal(r.status,'inventory-complete');assert.equal(manifest(r).documents.find(d=>d.id==='4118354').validation.earlyStrictCheck,'not-applicable-historical')
})
test('actual unapproved4118365 closed-no-score page stops once and remains counted',opts,async t=>{
 const f=await futureCaptureFixture(t);f.docs.set('4118365',readFileSync(join(process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR,'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-39238757730-1','acta-4118365.html')))
 const r=await collectFcfMissingInventoryChild(f),m=manifest(r);assert.equal(r.status,'failed');assert.equal(r.actualSourceGETs,17);assert.equal(f.calls.length,17);assert.equal(m.priorSourceGETs,37);assert.equal(m.attempts.at(-1).sequence,54);assert.notEqual(m.stopReason,null);assert.equal(m.statisticsAudit,'not-run')
})
for(const status of [403,429,302])test(`HTTP${status} spends one then stops without retry`,opts,async t=>{
 const f=await futureCaptureFixture(t);f.request=async()=>{f.calls.push('refusal');return new Response('TEST ONLY refusal',{status})}
 const r=await collectFcfMissingInventoryChild(f);assert.equal(r.status,'failed');assert.equal(r.actualSourceGETs,1);assert.equal(f.calls.length,1);assert.equal(manifest(r).attempts[0].sequence,38)
})
test('transport failure stays counted and cannot refund the real37',opts,async t=>{
 const f=await futureCaptureFixture(t);f.request=async()=>{f.calls.push('failed');throw Error('TEST ONLY transport failure')}
 const r=await collectFcfMissingInventoryChild(f);assert.equal(r.status,'failed');assert.equal(r.actualSourceGETs,1);assert.equal(manifest(r).priorSourceGETs,37);assert.equal(manifest(r).stopReason,'network-error')
})
for(const [label,mutate]of[
 ['missing source clearance',f=>delete f.sourceSlotProof],['forged source clearance',f=>f.sourceSlotProof={}],['foreign target',f=>f.targetSlug='es-ct-segona-g1'],['seed injection',f=>f.seedEvidence={}],['sibling injection',f=>f.batchState={}],['copied consumption',f=>f.consumptionProof=structuredClone(f.consumptionProof)],
])test(`future capture rejects ${label} before source`,opts,async t=>{const f=await futureCaptureFixture(t);mutate(f);await assert.rejects(()=>collectFcfMissingInventoryChild(f),/FCF_INVENTORY/);assert.equal(f.calls.length,0)})
