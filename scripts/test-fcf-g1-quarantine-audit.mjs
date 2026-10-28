import test from 'node:test'
import assert from 'node:assert/strict'
import {syntheticFcfRaw} from './fcf-release-test-fixture.mjs'
import {classifyFcfG1QuarantineDocument} from './fcf-g1-quarantine-audit.mjs'
const raw=(id='4109411',played=false)=>Buffer.from(syntheticFcfRaw({id,slug:'es-ct-segona-g1',round:3,home:{name:'SYNTHETIC A',href:'/ca/clubs/11/categories/111'},away:{name:'SYNTHETIC B',href:'/ca/clubs/12/categories/112'},played}))
const classify=(bytes,id='4109411')=>classifyFcfG1QuarantineDocument({id,bytes})
test('raw review recognizes pending, exact closed NULL, official not-found and typed incomplete individual data',()=>{
 assert.equal(classify(raw()).classification,'pending')
 const closed=Buffer.from(raw().toString().replace('Pendent','Acta Tancada'))
 assert.equal(classify(closed).classification,'closed-result-unavailable');assert.equal(classify(closed).header.izid,null)
 assert.equal(classify(Buffer.from('<!doctype html><title>Acta no trobada | FCF</title>')).classification,'official-not-found')
 assert.equal(classify(Buffer.from(raw('4109411',true).toString().replaceAll('localNode','removedTESTONLYLocalNode').replaceAll('visitorNode','removedTESTONLYVisitorNode'))).classification,'individual-data-defect')
 for(const b of [raw(),closed]){const d=classify(b);assert.equal(d.admissible,false);assert.equal(d.nativeAdmission,false);assert.equal(d.activationEligible,false)}
})
test('unknown/challenge/identity/UTF8/oversize remains fatal, never a generic data exception',()=>{
 for(const bytes of [Buffer.from('<title>unknown</title>'),Buffer.from('<title>Acta no trobada</title>cf_chl_opt'),Buffer.from('<title>Acta no trobada</title>'+(' '.repeat(21000))+'hcaptcha'),Buffer.from([255]),Buffer.alloc(2097153),raw('4109412')])assert.throws(()=>classify(bytes),/FCF_G1_QUARANTINE/)
 assert.throws(()=>classify(raw(),'4118349'),/FCF_G1_QUARANTINE/)
})
