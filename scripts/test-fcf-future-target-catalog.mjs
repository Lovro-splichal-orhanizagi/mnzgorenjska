// Pure DATA validation cannot issue a source/native capability.
import test from 'node:test'
import assert from 'node:assert/strict'
import {requireFcfInventoryExecutionClaim,requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
const api=await import('./fcf-future-target-catalog.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const get=input=>{assert.equal(typeof api.getFcfFutureTarget,'function','closed future DATA catalog required');return api.getFcfFutureTarget(input)}
for(const [targetSlug,competitionId,sourceCode,start,end,policyId]of[
 ['es-ct-segona-g1',783,'4109388-4109627',4109388,4109627,'es-ct-segona-g1-six-reviewed-2026-10-19-v1'],
 ['es-ct-tercera-g9',797,'4118349-4118588',4118349,4118588,'es-ct-tercera-g9-six-reviewed-2026-10-19-v1'],
])test(`${targetSlug} accepts only its actual source block and immutable tuple`,()=>{
 const expected={targetSlug,competitionId,sourceCode,start,end,season:'2026/27',policyId}
 assert.deepEqual(get({targetSlug}),expected)
 for(const id of [String(start),String(end)])assert.deepEqual(get({targetSlug,competitionId,sourceCode,season:'2026/27',id}),expected)
 for(const id of [String(start-1),String(end+1),'0'+start,start])assert.throws(()=>get({targetSlug,id}),/FCF_FUTURE_TARGET/)
 for(const mismatch of [{competitionId:competitionId===783?797:783},{sourceCode:'4109388-4118588'},{season:'2025/26'}])assert.throws(()=>get({targetSlug,...mismatch}),/FCF_FUTURE_TARGET/)
 const r=get({targetSlug});assert.ok(Object.isFrozen(r));assert.throws(()=>r.start++,TypeError)
 for(const require of [requireFcfInventoryExecutionClaim,requireFcfInventoryConsumption])assert.throws(()=>require(r),/FCF_INVENTORY/)
 assert.equal(Object.hasOwn(r,'admissible'),false);assert.equal(Object.hasOwn(r,'protocol'),false)
})
test('closed catalog rejects G2, caller capabilities and unknown fields',()=>{
 for(const i of [null,{},[],{targetSlug:'es-ct-tercera-g2'},{targetSlug:'ES-CT-SEGONA-G1'},{targetSlug:new String('es-ct-segona-g1')},{targetSlug:'es-ct-segona-g1',verified:true},{targetSlug:'es-ct-segona-g1',maximumSourceGETs:517},Object.create({targetSlug:'es-ct-segona-g1'})])assert.throws(()=>get(i),/FCF_FUTURE_TARGET/)
})
