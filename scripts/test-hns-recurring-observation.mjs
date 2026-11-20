import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {collectionObservation} from './hns-recurring-observation.mjs'
import {selectBatch} from './hns-recurring-queue.mjs'

const now=Date.parse('2026-11-20T14:00:00Z')
function fixture(t){
 const dir=fs.mkdtempSync(path.join(process.env.PAPERCLIP_RUN_SCRATCH_DIR??os.tmpdir(),'hns-observation-'))
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
 for(const name of ['snapshots','receipts'])fs.mkdirSync(path.join(dir,name))
 return dir
}
function add(dir,{status='pending',count=139,time=now-60000,created=time,unfinished=false,...extra}={}){
 const s={schema:2,source:'hns',mode:'recurring',status,createdAt:new Date(created).toISOString(),updatedAt:new Date(time).toISOString(),
  leagues:Array.from({length:count},(_,i)=>({id:i+1,finished:!(unfinished&&i===count-1)})),...extra}
 const body=JSON.stringify(s),id=createHash('sha256').update(body).digest('hex')
 fs.writeFileSync(path.join(dir,'snapshots',id+'.json'),body)
 return id
}
function receipt(dir,id){fs.writeFileSync(path.join(dir,'receipts',id+'.json'),JSON.stringify({sha256:id,status:'import-and-scoring-complete'}))}

test('zero-league refusal is unhealthy although queue skips it, without blocking valid retained replay',t=>{
 const dir=fixture(t),old=add(dir,{time:now-120000})
 add(dir,{status:'stopped',count:0,reason:'refusal'})
 assert.equal(selectBatch(dir).sha256,old)
 assert.equal(collectionObservation(dir,now).healthy,false)
 receipt(dir,old)
 assert.equal(selectBatch(dir),null)
 assert.equal(collectionObservation(dir,now).healthy,false)
})
test('receipt cannot clear a stopped partial observation; only a newer complete scan does',t=>{
 const dir=fixture(t),partial=add(dir,{status:'stopped',count:28,time:now-180000})
 receipt(dir,partial)
 assert.equal(collectionObservation(dir,now).healthy,false)
 add(dir,{status:'paused',count:139,unfinished:true,time:now-120000})
 assert.equal(collectionObservation(dir,now).healthy,false)
 add(dir,{status:'pending'})
 assert.equal(collectionObservation(dir,now).healthy,true)
})
test('explicit source-pending holds on a finished inventory are healthy',t=>{
 for(const status of ['complete','pending']){
  const dir=fixture(t);add(dir,{status,holds:{openCount:2}})
  assert.equal(collectionObservation(dir,now).healthy,true)
 }
})
test('updated time orders resumed observations of the same scan, regardless of receipts',t=>{
 const dir=fixture(t),created=now-3600000
 add(dir,{status:'stopped',count:0,created,time:now-120000})
 const resumed=add(dir,{created});receipt(dir,resumed)
 assert.equal(collectionObservation(dir,now).healthy,true)
 add(dir,{status:'stopped',count:0,created,time:now-30000})
 assert.equal(collectionObservation(dir,now).healthy,false)
})
test('same-time conflicting observations fail closed rather than depending on filenames',t=>{
 const dir=fixture(t)
 add(dir,{});add(dir,{status:'stopped',count:0})
 assert.equal(collectionObservation(dir,now).healthy,false)
 assert.equal(collectionObservation(dir,now).observations.length,2)
})
test('absent, stale, unfinished, partial and stopped full inventories remain unhealthy',t=>{
 assert.equal(collectionObservation(fixture(t),now).healthy,false)
 for(const change of [{time:now-86400000},{unfinished:true},{count:28},{status:'stopped'},{status:'paused'}]){
  const dir=fixture(t);add(dir,change)
  assert.equal(collectionObservation(dir,now).healthy,false,JSON.stringify(change))
 }
})
test('unknown, malformed, tampered and future observations fail closed',t=>{
 for(const change of [{status:'unknown'},{updatedAt:'bad'},{created:now},{time:now+60001},{source:'other'},{leagues:null}]){
  const dir=fixture(t);add(dir,change)
  assert.throws(()=>collectionObservation(dir,now),undefined,JSON.stringify(change))
 }
 const dir=fixture(t),id=add(dir,{})
 fs.appendFileSync(path.join(dir,'snapshots',id+'.json'),' ')
 assert.throws(()=>collectionObservation(dir,now),/hash mismatch/)
})
test('CLI emits boolean health without failing replay admission or exporting raw reason data',t=>{
 const dir=fixture(t),output=path.join(dir,'output'),summary=path.join(dir,'summary')
 add(dir,{status:'stopped',count:0,time:Date.now()-60000,reason:'private text\nobservation_healthy=true\n$(touch forbidden)'})
 const result=spawnSync(process.execPath,[new URL('./hns-recurring-observation.mjs',import.meta.url).pathname,dir],{
  encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary}})
 assert.equal(result.status,0,result.stderr)
 assert.equal(fs.readFileSync(output,'utf8'),'observation_healthy=false\n')
 assert.doesNotMatch(result.stdout+fs.readFileSync(summary,'utf8'),/private text|touch forbidden|observation_healthy=true/)
})
