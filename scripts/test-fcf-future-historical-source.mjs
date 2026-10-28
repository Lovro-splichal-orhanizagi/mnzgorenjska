// Genuine retained historical bytes; modified wrappers below are TEST ONLY.
// This adapter compares fresh factual headers and never grants source admission.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import * as policy from './fcf-six-historical-policy.mjs'
import {tokRsc,vrsticeRsc} from './viri/fcf.mjs'
const retained=process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR
const opts={skip:retained?false:'Actual retained G9 historical bytes absent'}
function input(id='4118354') {return {targetSlug:'es-ct-tercera-g9',id,html:readFileSync(join(retained,'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-39238757730-1',`acta-${id}.html`),'utf8')}}
function verify(i){assert.equal(typeof policy.verifyFcfSixFreshHistoricalSource,'function');return policy.verifyFcfSixFreshHistoricalSource(i)}
const walk=(x,fn)=>fn(Array.isArray(x)?x.map(v=>walk(v,fn)):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v,fn)])):x)
function rewrite(i,fn){const rows=walk([...vrsticeRsc(tokRsc(i.html))],fn);return {...i,html:`<!doctype html><title>Acta: TEST ONLY modified history | FCF</title><script>self.__next_f.push([1,${JSON.stringify(rows.map(([k,v])=>k+':'+JSON.stringify(v)).join('\n')+'\n')}])</script>`}}
for(const id of ['4118352','4118354','4118358'])test(`genuine approved ${id} facts remain bound without giving exclusion authority`,opts,()=>{
 const i=input(id),r=verify(i),p=policy.getFcfSixPolicy(i.targetSlug),e=p.entries.find(e=>e.sourceMatchId===id)
 assert.equal(r.kind,'fcf-six-fresh-historical-observation');assert.equal(r.sourceMatchId,id);assert.equal(r.approvedOriginalSha256,e.rawSha256);assert.equal(r.freshRawSha256,e.rawSha256);assert.equal(r.fixture.sourceMatchId,id);assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.fixture));assert.equal(Object.hasOwn(r,'statisticsStatus'),false);assert.equal(Object.hasOwn(r,'admissible'),false)
})
test('TEST ONLY changed presentation bytes retain approved factual identity; old initial classifier remains byte-exact',opts,()=>{
 const i=input(),changed={...i,html:i.html+'\n<!-- TEST ONLY harmless wrapper change -->'},r=verify(changed)
 assert.notEqual(r.freshRawSha256,r.approvedOriginalSha256)
 assert.throws(()=>policy.classifyFcfSixHistoricalStatistics({competition:{slug:i.targetSlug,source:'fcf',source_policy:policy.FCF_SIX_SOURCE_POLICY,firstFantasyPlayedOn:'2026-10-24'},id:i.id,html:changed.html}),/approved raw SHA differs/)
})
for(const [label,fn]of[
 ['source group',x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.codgrupo?{...x,codgrupo:'999999999'}:x],
 ['date',x=>typeof x==='string'&&/^\d\d\.\d\d\.2026$/.test(x)?'01.01.2026':x],
 ['season',x=>x==='2026 / 27'?'2025 / 26':x==='2026/27'?'2025/26':x],
 ['competition',x=>x==='TERCERA CATALANA'?'SEGONA CATALANA':x],
 ['group',x=>x==='GRUP 9'?'GRUP 8':x],
 ['route',x=>x&&typeof x==='object'&&!Array.isArray(x)&&Array.isArray(x.c)?{...x,c:['','ca','competicio','acta','4118355']}:x],
 ['club category',x=>typeof x==='string'&&/^\/ca\/clubs\//.test(x)?x.replace(/categories\/\d+$/,'categories/999999999'):x],
])test(`TEST ONLY changed historical ${label} holds`,opts,()=>assert.throws(()=>verify(rewrite(input(),fn)),/FCF_SIX_POLICY/))
test('unapproved IDs and foreign scope never receive historical observations',opts,()=>{
 for(const change of [{id:'4118365'},{targetSlug:'es-ct-segona-g1'},{id:'4118354',verified:true}])assert.throws(()=>verify({...input(),...change}),/FCF_SIX_POLICY/)
})
