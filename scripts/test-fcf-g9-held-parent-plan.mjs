import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {deserialize} from 'node:v8'
import {readFcfHeldParentAccounting} from './fcf-held-parent-accounting.mjs'
import {validateFcfMissingInventoryPlan} from './fcf-missing-inventory-plan.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const api=await import('./fcf-g9-held-parent-plan.mjs').catch(()=>({}))
const call=(name,args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](args)}
const fixture=()=>{const f=deserialize(readFileSync(process.env.FCF_HELD_PARENT_WIRE));return{sourceCommit:'a'.repeat(40),accountingProof:readFcfHeldParentAccounting(f),rulesetSnapshotSha256:'b'.repeat(64),now:Date.parse('2026-10-19T09:00:00Z')}}
const build=f=>call('buildFcfG9HeldParentPlan',f)
const check=(f,plan,now=f.now)=>call('validateFcfG9HeldParentPlan',{plan,accountingProof:f.accountingProof,expectedPlanSha256:plan.planSha256,now})
test('new plan requires authentic accounting, never caller readiness',()=>{
 assert.equal(typeof api.buildFcfG9HeldParentPlan,'function')
 assert.throws(()=>build({sourceCommit:'a'.repeat(40),accountingProof:{actualSourceGETs:16},rulesetSnapshotSha256:'b'.repeat(64)}),/FCF_INVENTORY/)
})
test('genuine accounting creates distinct fixed240 plan with16+240=256', {skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{
 const f=fixture(),p=build(f),child=check(f,p)
 assert.equal(p.preset,'g9-only-after-held-parent-v1');assert.equal(p.priorSourceGETs,16);assert.equal(p.maximumNewSourceGETs,240);assert.equal(p.maximumCumulativeSourceGETs,477);assert.equal(p.plannedCumulativeSourceGETs,256)
 assert.equal(p.accountingBinding.finalReceiptBinding.artifactDigest,f.accountingProof.finalReceiptBinding.artifactDigest)
 assert.deepEqual(child.fetchIds,Array.from({length:240},(_,i)=>String(4118349+i)));assert.deepEqual(child.reuse,[]);assert.equal(child.targetSlug,'es-ct-tercera-g9');assert.ok(Object.isFrozen(p));assert.ok(child.fetchIds.includes('4118352'));assert.ok(child.fetchIds.includes('4118358'))
 assert.equal(p.limits.pauseMs,3000);assert.equal(p.limits.sourceWindowMs,2700000)
 assert.throws(()=>validateFcfMissingInventoryPlan({plan:p,expectedPlanSha256:p.planSha256,now:f.now}),/FCF_INVENTORY/,'legacy G1-first validator does not reinterpret new plan')
 assert.throws(()=>check({...f,accountingProof:structuredClone(f.accountingProof)},p),/FCF_INVENTORY/)
})
for(const [name,change]of[
 ['G1 target',p=>p.child.targetSlug='es-ct-segona-g1'],['239 reads',p=>p.child.fetchIds.pop()],['duplicate read',p=>p.child.fetchIds[1]=p.child.fetchIds[0]],['reuse marker',p=>p.child.reuse=[{id:'4118352'}]],['fifth exclusion',p=>p.exclusions=['4109404']],['changed old count',p=>p.priorSourceGETs=0],['changed cap',p=>p.maximumCumulativeSourceGETs=478],['changed root rules',p=>p.rulesetSnapshotSha256='invalid'],['changed old receipt',p=>p.accountingBinding.finalReceiptBinding.artifactDigest='sha256:'+'0'.repeat(64)],['unknown source flag',p=>p.sourceReady=true],['changed policies',p=>p.policyHashes['es-ct-tercera-g9']='0'.repeat(64)],
])test(`new rehashed plan rejects ${name}`,{skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{const f=fixture(),p=structuredClone(build(f));change(p);const {planSha256,...body}=p;p.planSha256=hash(body);assert.throws(()=>check(f,p),/FCF_INVENTORY/)})
test('new plan keeps strict age and future clocks independently of old accounting',{skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{
 const f=fixture(),p=build(f);assert.throws(()=>check(f,p,f.now-1),/FCF_INVENTORY/);assert.throws(()=>check(f,p,f.now+86400001),/FCF_INVENTORY/)
})
test('cross-process validated new plans are deeply frozen before they carry a capability',{skip:!process.env.FCF_HELD_PARENT_WIRE},()=>{
 const f=fixture(),p=structuredClone(build(f));check(f,p);assert.ok(Object.isFrozen(p));assert.ok(Object.isFrozen(p.limits));assert.ok(Object.isFrozen(p.child.fetchIds));assert.throws(()=>p.limits.sourceWindowMs=999999999,TypeError)
})
