// Genuine retained evidence tests require an explicit local serialized wire.
// Public controls contain no synthetic assertion of actual parent readiness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {deserialize} from 'node:v8'
import {readFcfCapturedTargetEvidence,getFcfCapturedTargetData} from './fcf-missing-inventory-evidence.mjs'
const api=await import('./fcf-held-parent-accounting.mjs').catch(()=>({}))
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](...args)}
const read=input=>call('readFcfHeldParentAccounting',input)
const fixture=()=>deserialize(readFileSync(process.env.FCF_HELD_PARENT_WIRE))
test('accounting reader exists and refuses missing or caller-asserted accounting',()=>{
 assert.equal(typeof api.readFcfHeldParentAccounting,'function')
 for(const input of [null,{}, {actualSourceGETs:16,admissible:false,verified:true}])assert.throws(()=>read(input),/FCF_INVENTORY/)
})
test('cumulative477 cap uses safe exact spent arithmetic',()=>{
 assert.equal(call('fcfCumulativeSourceGETs',{priorSourceGETs:16,newSourceGETs:240}),256)
 assert.equal(call('fcfCumulativeSourceGETs',{priorSourceGETs:16,newSourceGETs:461}),477)
 for(const args of [{priorSourceGETs:16,newSourceGETs:462},{priorSourceGETs:NaN,newSourceGETs:240},{priorSourceGETs:-1,newSourceGETs:240},{priorSourceGETs:16,newSourceGETs:0.5},{priorSourceGETs:16,newSourceGETs:240,cap:999}])assert.throws(()=>call('fcfCumulativeSourceGETs',args),/FCF_INVENTORY/)
})
test('accounting capability cannot be supplied as a target or legacy continuation',()=>{
 assert.throws(()=>call('requireFcfHeldParentAccounting',{kind:'fcf-held-parent-accounting',actualSourceGETs:16}),/FCF_INVENTORY/)
})
test('genuine failed parent remains accounting-only after source plan expires', {skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{
 const f=fixture();f.now=Date.parse('2026-11-18T00:00:00Z')
 const p=read(f);assert.equal(p.kind,'fcf-held-parent-accounting-only');assert.equal(p.actualSourceGETs,16);assert.equal(p.g9ActualSourceGETs,0);assert.equal(p.admissible,false);assert.equal(p.completedUTC,'2026-10-18T22:53:54.450Z');assert.ok(Object.isFrozen(p));assert.equal(call('requireFcfHeldParentAccounting',p),p)
 assert.throws(()=>call('requireFcfHeldParentAccounting',structuredClone(p)),/FCF_INVENTORY/)
 assert.throws(()=>getFcfCapturedTargetData({targetEvidence:p,targetSlug:'es-ct-tercera-g9',now:f.now}),/FCF_INVENTORY/)
 // The original legacy reader remains refused even at its original valid clock.
 assert.throws(()=>readFcfCapturedTargetEvidence({...fixture(),targetSlug:'es-ct-segona-g1',now:Date.parse(p.completedUTC)}),/cannot admit/)
})
for(const [name,mutate] of [
 ['future clock',f=>f.now=Date.parse('2026-10-18T22:53:00Z')],
 ['wrong claim',f=>f.claim.expected.claimCommit='a'.repeat(40)],
 ['wrong run',f=>f.consumption.run.id=123],
 ['wrong artifact',f=>f.finalReceipt.expected.artifactId='123'],
 ['tampered ZIP',f=>f.children[0].inventory.zipBytes[0]^=1],
 ['unknown old spend',f=>f.children[0].inventory=null],
 ['duplicate child',f=>f.children[1]=f.children[0]],
 ['missing skipped job',f=>f.children[1].unstarted.jobs=[]],
 ['attempt2',f=>f.children[0].inventory.run.run_attempt=2],
 ['extra accounting flag',f=>f.verified=true],
])test(`genuine old accounting rejects ${name}`,{skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{const f=fixture();mutate(f);assert.throws(()=>read(f),/FCF_INVENTORY/)})
test('retained genuine bytes still count after GitHub retention expiry', {skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{
 const f=fixture();for(const b of [f.consumption,f.finalReceipt,f.children[0].inventory])b.artifact.expired=true
 assert.equal(read(f).actualSourceGETs,16)
})
