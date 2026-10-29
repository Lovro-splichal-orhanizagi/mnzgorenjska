import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assertFcfG1RemainderZeroSourceRun} from './fcf-g1-remainder-source.mjs'
const observations=JSON.parse(readFileSync(new URL('./vzorci/fcf-g1-zero-history-observations.json',import.meta.url))).observations
test('actual23 complete historical executions require body-bound zero witnesses, with no provider call',()=>{
 assert.equal(observations.length,23)
 for(const h of observations)assert.doesNotThrow(()=>assertFcfG1RemainderZeroSourceRun(h),h.id+' '+h.display_title)
})
test('historical head/run/branch/rerun/job/step/actor drift and any executed capture remain HOLD',()=>{
 for(const h of observations){for(const change of [v=>{v.head_sha='a'.repeat(40)},v=>{v.id++},v=>{v.head_branch='other'},v=>{v.run_attempt=2},v=>{v.jobs.pop()},v=>{v.jobs[0].steps.push({number:999,name:'unknown source',status:'completed',conclusion:'success'})},v=>{v.actor.id=1}]){const bad=structuredClone(h);change(bad);assert.throws(()=>assertFcfG1RemainderZeroSourceRun(bad),/held/)}
 const capture=h.jobs.find(j=>j.name.includes('missing-inventory-g'));if(capture){const bad=structuredClone(h),j=bad.jobs.find(j=>j.id===capture.id);j.conclusion='success';j.steps=[{number:1,name:'Capture missing target inventory',status:'completed',conclusion:'success'}];assert.throws(()=>assertFcfG1RemainderZeroSourceRun(bad),/held/)}}
})
import {normalizeFcfG1CurrentSkippedJobs} from './fcf-g1-historical-zero-witness.mjs'
test('current exact reviewed skipped-only aliases are DATA, and executed/unknown alias drift stays closed',()=>{
 const aliases=["inputs.preset == 'six-reviewed-continuation-v1' && 'missing-inventory-g9' || 'missing-inventory-g1'","inputs.preset == 'six-reviewed-continuation-v1' && 'missing-inventory-g1' || 'missing-inventory-g9'",'inputs.mode'],jobs=aliases.map(name=>({name,status:'completed',conclusion:'skipped',steps:[]}))
 assert.deepEqual(normalizeFcfG1CurrentSkippedJobs(jobs).map(j=>j.name),['missing-inventory-g1','missing-inventory-g9','missing-inventory'])
 for(const change of [v=>{v[0].conclusion='success'},v=>{v[0].status='in_progress'},v=>{v[0].steps.push({name:'unknown source',status:'completed',conclusion:'success'})}]){const bad=structuredClone(jobs);change(bad);assert.throws(()=>normalizeFcfG1CurrentSkippedJobs(bad),/held/)}
 assert.equal(normalizeFcfG1CurrentSkippedJobs([{...jobs[0],name:aliases[0]+' '}])[0].name,aliases[0]+' ') // no broad expression recognition
})
test('exact actual preclaim exit13 run is zero only with its complete reviewed H1 execution',()=>{
 const h=JSON.parse(readFileSync(new URL('./vzorci/fcf-g1-preclaim-cycle-zero-observation.json',import.meta.url)))
 assert.equal(String(h.id),'40792858711');assert.equal(h.jobs.length,19)
 assert.equal(h.jobs.filter(j=>j.conclusion==='skipped').length,17)
 assert.doesNotThrow(()=>assertFcfG1RemainderZeroSourceRun(h))
 for(const change of [v=>{v.id++},v=>{v.head_sha='b'.repeat(40)},v=>{v.observedAttempt=2},v=>{v.run_attempt=2},v=>{v.status='in_progress'},v=>{v.actor.id=1},v=>{v.jobs.pop()},v=>{v.jobs.find(j=>j.name==='missing-inventory-approval').steps.find(s=>s.name==='Stage reviewed FCF inventory approval').conclusion='success'},v=>{v.jobs.find(j=>j.name==='missing-inventory-consume').conclusion='success'},v=>{v.jobs.find(j=>j.name.includes('missing-inventory-g1')).steps=[{number:1,name:'Capture missing target inventory',status:'completed',conclusion:'success'}]}]){const bad=structuredClone(h);change(bad);assert.throws(()=>assertFcfG1RemainderZeroSourceRun(bad),/held/)}
})
test('exact cancelled-before-claim R2 is zero only with its complete reviewed terminal19 execution',()=>{
 const h=JSON.parse(readFileSync(new URL('./vzorci/fcf-g1-cancel-before-claim-zero-40804241703.json',import.meta.url)))
 assert.equal(String(h.id),'40804241703');assert.equal(h.conclusion,'cancelled');assert.equal(h.jobs.length,19)
 const captures=h.jobs.filter(j=>['missing-inventory-g1','missing-inventory-g9'].includes(j.name)||j.name.startsWith('inputs.preset'));assert.equal(captures.length,2);assert.ok(captures.every(j=>j.conclusion==='cancelled'&&j.steps.length===0))
 assert.doesNotThrow(()=>assertFcfG1RemainderZeroSourceRun(h))
 for(const change of [v=>{v.id++},v=>{v.head_sha='a'.repeat(40)},v=>{v.run_attempt=2},v=>{v.actor.id=1},v=>{v.jobs.pop()},v=>{v.jobs.find(j=>j.name==='missing-inventory-consume').conclusion='success'},v=>{v.jobs.find(j=>j.conclusion==='cancelled'&&j.steps.length===0).steps=[{number:1,name:'Capture missing target inventory',status:'completed',conclusion:'success'}]}]){const bad=structuredClone(h);change(bad);assert.throws(()=>assertFcfG1RemainderZeroSourceRun(bad),/held/)}
})
