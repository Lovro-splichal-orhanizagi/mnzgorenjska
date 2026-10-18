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
test('new plan eligibility is a separate reader-issued capability for the reviewed content defect', {skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{
 const p=read(fixture());assert.equal(call('requireFcfHeldParentContinuationEligibility',p),p);assert.throws(()=>call('requireFcfHeldParentContinuationEligibility',structuredClone(p)),/FCF_INVENTORY/)
})
import {readInventoryZip} from './fcf-missing-inventory-artifact.mjs'
import {zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
for(const [name,mutate]of[
 ['provider403',m=>m.documents.find(d=>d.id==='4109404').receipt.httpStatus=403],['provider429',m=>m.documents.find(d=>d.id==='4109404').receipt.httpStatus=429],['redirect',m=>m.documents.find(d=>d.id==='4109404').receipt.redirected=true],['partial last body',m=>m.documents.find(d=>d.id==='4109404').receipt.bodyState='truncated'],['unknown old count',m=>m.actualSourceGETs=null],['different content defect',m=>m.stopReason='source-refusal'],
])test(`root-pinned content-defect accounting refuses ${name} even after caller rehash`,{skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{
 const f=fixture(),b=f.children[0].inventory
 // The ZIP helper is synthetic mutation only; no replacement artifact exists.
 const files=readInventoryZip({...b,members:{'manifest.json':8*1024*1024,...Object.fromEntries(Array.from({length:17},(_,i)=>[`acta-${4109388+i}.html`,2*1024*1024]))}}),manifest=JSON.parse(files.get('manifest.json'));mutate(manifest)
 b.zipBytes=zip([{name:'manifest.json',body:Buffer.from(JSON.stringify(manifest))}]);b.artifact.size_in_bytes=b.zipBytes.length;b.artifact.digest=b.expected.artifactDigest='sha256:'+sha(b.zipBytes);b.expected.manifestSha256=sha(Buffer.from(JSON.stringify(manifest)))
 assert.throws(()=>read(f),/FCF_INVENTORY/)
})
