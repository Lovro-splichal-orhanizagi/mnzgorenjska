// Actual retained16 preclaim metadata and explicitly modeled future17 capture.
// These pure metadata checks issue no plan/claim/source/native capability.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,cpSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const api=await import('./fcf-g1-remainder-job-inventory.mjs').catch(()=>({})),fixture=JSON.parse(readFileSync(new URL('./vzorci/fcf-g1-preclaim-16-40804241703.json',import.meta.url))),execution={repository:fixture.run.repository.full_name,workflow:fixture.run.path,ref:'refs/heads/main',sourceCommit:fixture.run.head_sha,runId:String(fixture.run.id),runAttempt:'1'}
const call=input=>{assert.equal(typeof api.verifyFcfG1CurrentJobInventory,'function');return api.verifyFcfG1CurrentJobInventory(input)},preclaim=()=>({run:structuredClone(fixture.run),jobs:structuredClone(fixture.jobs),execution:structuredClone(execution)})
function capture(){
 const v=preclaim(),consume=v.jobs.find(j=>j.name==='missing-inventory-consume');consume.status='completed';consume.conclusion='success';consume.steps=consume.steps.filter(s=>['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'].includes(s.name)).map(s=>({...s,status:'completed',conclusion:'success'}))
 v.jobs.push({id:90000000001,run_id:fixture.run.id,run_attempt:1,head_sha:fixture.run.head_sha,name:'missing-inventory-g1',status:'in_progress',conclusion:null,steps:[{number:1,name:'Capture missing target inventory',status:'in_progress',conclusion:null}]});return v
}
test('actual16 preclaim and modeled17 capture infer exact phase and only known blocked nodes may be absent',()=>{
 const p=call(preclaim());assert.equal(p.phase,'preclaim');assert.equal(p.jobs.length,16);assert.deepEqual(p.unmaterialized,['missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt'])
 const c=call(capture());assert.equal(c.phase,'capture');assert.equal(c.jobs.length,17);assert.deepEqual(c.unmaterialized,['missing-inventory-g9','missing-inventory-receipt'])
 p.jobs[0].name='mutated';assert.equal(call(preclaim()).jobs[0].name,'missing-inventory-approval')
})
test('missing mandatory, unknown, duplicate, foreign head/actor/attempt and wrong critical states all HOLD',()=>{
 for(const make of [preclaim,capture])for(const change of [v=>{v.jobs.splice(v.jobs.findIndex(j=>j.name==='target-price'),1)},v=>{v.jobs.push({...v.jobs[0],id:90000000998,name:'unknown-source'})},v=>{v.jobs.push(structuredClone(v.jobs[0]))},v=>{v.jobs[0].id=v.jobs[1].id},v=>{v.jobs[0].head_sha='a'.repeat(40)},v=>{v.run.actor.id=1},v=>{v.run.head_sha='a'.repeat(40)},v=>{v.execution.sourceCommit='a'.repeat(40)},v=>{v.run.run_attempt=2},v=>{v.phase='preclaim'},v=>{v.allowPartial=true},v=>{v.run.actor.type='Bot'},v=>{v.jobs.find(j=>j.status==='in_progress').steps.find(s=>s.status==='in_progress').status='pending'},v=>{v.jobs.find(j=>j.status==='in_progress').steps.push({number:999,name:'unreviewed source GET',status:'completed',conclusion:'success'})},v=>{v.jobs.find(j=>j.name==='target-import').conclusion='success'}]){const v=make();change(v);assert.throws(()=>call(v),/held|inventory|phase|actual|root/)}
 const v=capture();v.jobs.find(j=>j.name==='missing-inventory-consume').conclusion='failure';assert.throws(()=>call(v),/held|consumption/)
})
test('present downstream jobs must remain unstarted; skipped G9 only is a closed harmless alternative',()=>{
 for(const make of [preclaim,capture]){
  const v=make(),pending={id:90000000999,run_id:fixture.run.id,run_attempt:1,head_sha:fixture.run.head_sha,name:'missing-inventory-receipt',status:'queued',conclusion:null,steps:[]};v.jobs.push(pending);assert.doesNotThrow(()=>call(v))
  for(const change of [j=>{j.status='in_progress'},j=>{j.started_at='2026-10-29T02:06:55Z'},j=>{j.status='completed';j.conclusion='success'},j=>{j.steps=[{number:1,name:'unknown',status:'completed',conclusion:'success'}]}]){const bad=structuredClone(v);change(bad.jobs.at(-1));assert.throws(()=>call(bad),/held|dependent/)}
 }
 const v=capture();v.jobs.push({id:90000000999,run_id:fixture.run.id,run_attempt:1,head_sha:fixture.run.head_sha,name:"inputs.preset == 'six-reviewed-continuation-v1' && 'missing-inventory-g1' || 'missing-inventory-g9'",status:'completed',conclusion:'skipped',steps:[]});assert.doesNotThrow(()=>call(v));v.jobs.at(-1).conclusion='success';assert.throws(()=>call(v),/held/)
})
test('terminal19 remains separate: no running-phase validator can accept completed/cancelled or receipt execution',()=>{
 for(const change of [v=>{v.run.status='completed';v.run.conclusion='success'},v=>{v.run.status='completed';v.run.conclusion='cancelled'},v=>{v.jobs.find(j=>j.name==='missing-inventory-consume').steps.find(s=>s.name==='Verify one-shot FCF inventory claim').conclusion='success'}]){const v=preclaim();change(v);assert.throws(()=>call(v),/held|phase|actual/)}
})
test('completed raw/final metadata requires all19 actual jobs and never a running-phase exemption',()=>{
 assert.equal(typeof api.verifyFcfG1TerminalJobInventory,'function');const v=capture();v.run.status='completed';v.run.conclusion='success';const g1=v.jobs.find(j=>j.name==='missing-inventory-g1');g1.status='completed';g1.conclusion='success';g1.steps[0].status='completed';g1.steps[0].conclusion='success'
 const base={run_id:fixture.run.id,run_attempt:1,head_sha:fixture.run.head_sha,status:'completed',conclusion:'success'}
 v.jobs.push({...base,id:90000000990,name:'missing-inventory-g9',conclusion:'skipped',steps:[]},{...base,id:90000000991,name:'missing-inventory-receipt',steps:['Authenticate bounded parent accounting','Retain final FCF inventory receipt'].map((name,i)=>({number:i+1,name,status:'completed',conclusion:'success'}))})
 assert.equal(api.verifyFcfG1TerminalJobInventory(v).length,19)
 for(const change of [x=>{x.jobs.pop()},x=>{x.jobs.find(j=>j.name==='missing-inventory-g9').conclusion='success'},x=>{x.jobs.find(j=>j.name==='target-import').conclusion='success'},x=>{x.run.status='in_progress';x.run.conclusion=null},x=>{x.run.conclusion='cancelled'},x=>{x.phase='preclaim'}]){const bad=structuredClone(v);change(bad);assert.throws(()=>api.verifyFcfG1TerminalJobInventory(bad),/held|closed/)}
})
test('immutable workflow dependency-body drift refuses without caller graph/path override',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'fcf-phase-graph-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));mkdirSync(join(dir,'scripts'));mkdirSync(join(dir,'.github/workflows'),{recursive:true})
 // Copy only the checker and its actual small dependency closure; replace the
 // workflow bytes in this isolated test directory, never a real checkout.
 for(const file of ['fcf-g1-remainder-job-inventory.mjs','fcf-missing-inventory-artifact.mjs'])cpSync(new URL('./'+file,import.meta.url),join(dir,'scripts',file))
 writeFileSync(join(dir,'.github/workflows/uvoz-fcf-zgodovina.yml'),'jobs:\n  missing-inventory-g1:\n    needs: []\n')
 const isolated=await import(pathToFileURL(join(dir,'scripts/fcf-g1-remainder-job-inventory.mjs')));assert.throws(()=>isolated.verifyFcfG1CurrentJobInventory(preclaim()),/workflow|dependency|held/)
})
