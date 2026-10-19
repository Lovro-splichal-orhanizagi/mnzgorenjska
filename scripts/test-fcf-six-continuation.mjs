import test from 'node:test'
import assert from 'node:assert/strict'
const api=await import('./fcf-six-continuation-plan.mjs').catch(()=>({}))
import {readFcfSixAccounting,requireFcfSixAccounting} from './fcf-six-accounting.mjs'
test('six reader refuses caller-authored accounting and source permission',()=>{
 for(const p of [null,{}, {kind:'fcf-six-accounting-only',priorSourceGETs:22,verified:true}])assert.throws(()=>requireFcfSixAccounting(p),/FCF_INVENTORY/)
 assert.throws(()=>readFcfSixAccounting({actualSourceGETs:22}),/FCF_INVENTORY/)
})
test('six continuation arithmetic is478 exactly with independent233/223 children',()=>{
 assert.equal(typeof api.fcfSixCumulativeSourceGETs,'function')
 assert.equal(api.fcfSixCumulativeSourceGETs({priorSourceGETs:22,newSourceGETs:233}),255)
 assert.equal(api.fcfSixCumulativeSourceGETs({priorSourceGETs:22,newSourceGETs:456}),478)
 for(const p of [{priorSourceGETs:22,newSourceGETs:457},{priorSourceGETs:NaN,newSourceGETs:233},{priorSourceGETs:22,newSourceGETs:-1},{priorSourceGETs:22,newSourceGETs:233,cap:999}])assert.throws(()=>api.fcfSixCumulativeSourceGETs(p),/FCF_INVENTORY/)
})
test('a six plan requires reader-issued immutable history',()=>{
 assert.equal(typeof api.buildFcfSixContinuationPlan,'function')
 assert.throws(()=>api.buildFcfSixContinuationPlan({sourceCommit:'a'.repeat(40),accountingProof:{priorSourceGETs:22},rulesetSnapshotSha256:'b'.repeat(64),now:Date.parse('2026-10-19T08:00:00Z')}),/FCF_INVENTORY/)
})
import {readFileSync} from 'node:fs'
import {deserialize} from 'node:v8'
import {buildFcfSixContinuationPlan} from './fcf-six-continuation-plan.mjs'
const genuine={skip:!process.env.FCF_SIX_ACCOUNTING_WIRE},wire=()=>deserialize(readFileSync(process.env.FCF_SIX_ACCOUNTING_WIRE))
test('genuine false receipts account22 permanently but do not refresh source clocks',genuine,()=>{const f=wire(),p=readFcfSixAccounting(f);assert.equal(p.admissible,false);assert.equal(p.priorSourceGETs,22);assert.equal(p.retained.length,24);assert.throws(()=>requireFcfSixAccounting(structuredClone(p)),/FCF_INVENTORY/);const late=readFcfSixAccounting({...f,now:Date.parse('2026-11-19T08:00:00Z')});assert.equal(late.priorSourceGETs,22);assert.throws(()=>buildFcfSixContinuationPlan({sourceCommit:'a'.repeat(40),accountingProof:late,rulesetSnapshotSha256:'b'.repeat(64),now:Date.parse('2026-11-19T08:00:00Z')}),/stale/);assert.throws(()=>readFcfSixAccounting({...f,now:Date.parse('2026-10-18T23:50:00Z')}),/FCF_INVENTORY/)})
for(const[name,change]of [['claim',f=>f.g9.claim.expected.claimCommit='a'.repeat(40)],['run',f=>f.g9.diagnostic.run.id=123],['tampered bytes',f=>f.g9.diagnostic.zipBytes[0]^=1]])test('genuine history rejects wrong '+name,genuine,()=>{const f=wire();change(f);assert.throws(()=>readFcfSixAccounting(f),/FCF_INVENTORY/)})
