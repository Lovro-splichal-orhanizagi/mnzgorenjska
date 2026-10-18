import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,readFileSync,rmSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {newClaimFixture,newConsumptionFixture} from './fcf-g9-held-parent-test-fixture.mjs'
import {readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {packetFixture} from './fcf-release-test-fixture.mjs'
const opts={skip:!process.env.FCF_HELD_PARENT_WIRE||!process.env.FCF_HISTORICAL_RETAINED_DIR}
import {captureFixture} from './fcf-g9-held-parent-test-fixture.mjs'
const manifest=f=>JSON.parse(readFileSync(join(f.root,'fcf-missing-es-ct-tercera-g9','manifest.json')))
test('new G9 captures every240 once ascending, including both markers, with no G1/seed/continuation',opts,async t=>{
 const f=await captureFixture(t),r=await collectFcfMissingInventoryChild(f),m=manifest(f)
 assert.equal(r.status,'inventory-complete');assert.equal(f.calls.length,240);assert.deepEqual(f.calls.map(c=>c.url.split('/').at(-1)),f.plan.child.fetchIds);assert.ok(f.calls.every(c=>c.init.method==='GET'&&c.init.redirect==='manual'));assert.equal(m.actualSourceGETs,240);assert.equal(m.priorSourceGETs,16);assert.equal(m.seedBinding,null);assert.equal(m.documents.filter(d=>d.kind==='reviewed-original').length,0);assert.equal(m.attempts[0].sequence,17);assert.equal(m.attempts.at(-1).sequence,256);assert.ok(f.pauses.every(ms=>ms>=3000));assert.equal(m.documents.filter(d=>d.validation.earlyStrictCheck==='not-applicable-historical').length,2)
 const retryRoot=realpathSync(mkdtempSync(join(tmpdir(),'fcf-g9-retry-')));t.after(()=>rmSync(retryRoot,{recursive:true,force:true}));await assert.rejects(()=>collectFcfMissingInventoryChild({...f,root:retryRoot}),/cannot restart/)
})
for(const [name,change]of[
 ['G1 request',f=>f.targetSlug='es-ct-segona-g1'],['legacy seed supplied',f=>f.seedEvidence={verified:true}],['G1 continuation supplied',f=>f.batchState={actualSourceGETs:239}],['copied plan',f=>f.plan=structuredClone(f.plan)],['copied consumption',f=>f.consumptionProof=structuredClone(f.consumptionProof)],
])test(`new G9 preflight rejects ${name} before GET/output`,opts,async t=>{const f=await captureFixture(t);change(f);await assert.rejects(()=>collectFcfMissingInventoryChild(f),/FCF_INVENTORY/);assert.equal(f.calls.length,0);assert.deepEqual(readdirSync(f.root),[])})
for(const [name,response]of[['refusal',()=>new Response('refused',{status:403})],['redirect',()=>new Response('moved',{status:302})],['defect',()=>new Response('bad')]])test(`new G9 first ${name} stops without fallback/retry`,opts,async t=>{const f=await captureFixture(t);let calls=0;f.request=async()=>{calls++;return response()};const r=await collectFcfMissingInventoryChild(f);assert.equal(r.status,'failed');assert.equal(calls,1);assert.equal(manifest(f).actualSourceGETs,1)})
test('new G9 requires branded actual source clearance before spending or output',opts,async t=>{
 const f=await captureFixture(t);f.request=async()=>new Response('refused',{status:403});await assert.rejects(()=>collectFcfMissingInventoryChild({...f,sourceSlotProof:{status:'clear',clearedUTC:new Date(f.clock()).toISOString()}}),/FCF_INVENTORY/);assert.deepEqual(readdirSync(f.root),[])
})
test('new45-minute deadline starts at actual clearance before the first GET',opts,async t=>{
 const f=await captureFixture(t);f.advance(2600000);const r=await collectFcfMissingInventoryChild(f);assert.equal(r.status,'failed');assert.equal(r.stopReason,'source-window-expired');assert.equal(f.calls.length,0);assert.equal(manifest(f).actualSourceGETs,0)
})
