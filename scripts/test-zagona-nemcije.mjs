import test from 'node:test'
import assert from 'node:assert/strict'
import { preveriZagon } from './preveri-zagona-nemcije.mjs'
const commit='a'.repeat(40)
const run={id:12345,path:'.github/workflows/preveri-nova-vira.yml',head_sha:commit,event:'workflow_dispatch',status:'completed',conclusion:'success',repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
test('only a completed successful official source audit on the reviewed commit qualifies',()=>assert.doesNotThrow(()=>preveriZagon(run,'12345',commit)))
test('failed, unfinished, foreign, wrong-workflow or wrong-commit runs cannot establish provenance',()=>{
 for(const patch of [{id:42},{path:'.github/workflows/ci.yml'},{head_sha:'b'.repeat(40)},{event:'pull_request'},{status:'in_progress'},{conclusion:'failure'},{repository:{full_name:'other/repo'}}]){
  assert.throws(()=>preveriZagon({...run,...patch},'12345',commit),/izvor/)
 }
})
test('a completed successful current-season job survives cancellation of its unrelated archive sibling',()=>{
 const partial={...run,conclusion:'cancelled'}
 const proof={sezona:'2026/27',jobs:[{name:'Zivi vir — dfb 2026/27',run_id:12345,head_sha:commit,status:'completed',conclusion:'success'}]}
 assert.doesNotThrow(()=>preveriZagon(partial,'12345',commit,proof))
 for(const jobs of [[],[{...proof.jobs[0],conclusion:'failure'}],[{...proof.jobs[0],status:'in_progress'}],[{...proof.jobs[0],name:'Zivi vir — dfb 2025/26'}],[{...proof.jobs[0],run_id:42}],[{...proof.jobs[0],head_sha:'b'.repeat(40)}]]){
  assert.throws(()=>preveriZagon(partial,'12345',commit,{...proof,jobs}),/izvor/)
 }
 assert.throws(()=>preveriZagon({...partial,status:'in_progress'},'12345',commit,proof),/izvor/)
 for(const invalid of [{sezona:'invalid',jobs:proof.jobs},{sezona:'2026/27',jobs:null},{jobs:proof.jobs}])assert.throws(()=>preveriZagon(run,'12345',commit,invalid),/izvor/)
})
test('only the previously reviewed successful archive capture may use its older source commit',()=>{
 const archive={...run,id:38970734064,conclusion:'failure',head_sha:'6defb2484c9c2caaf7a217cf6763b4bca2e65a7a'}
 const proof={sezona:'2025/26',jobs:[{name:'Zivi vir — dfb 2025/26',run_id:38970734064,head_sha:archive.head_sha,status:'completed',conclusion:'success'}]}
 assert.doesNotThrow(()=>preveriZagon(archive,'38970734064',commit,proof))
 for(const patch of [{head_sha:'b'.repeat(40)},{id:38970734065},{path:'.github/workflows/ci.yml'},{event:'pull_request'}]){
  assert.throws(()=>preveriZagon({...archive,...patch},String(archive.id),commit,proof),/izvor/)
 }
 assert.throws(()=>preveriZagon(archive,'38970734064',commit,{...proof,sezona:'2026/27'}),/izvor/)
})
test('combined DFB job proves only the exact completed successful requested capture step',()=>{
 const step={name:'Tekoča sezona — brez baze',status:'completed',conclusion:'success'}
 const job={name:'Zivi vir — dfb',run_id:12345,head_sha:commit,status:'completed',conclusion:'success',steps:[step]}
 const check=(jobs,sezona='2026/27',capture=run)=>preveriZagon(capture,'12345',commit,{sezona,jobs})
 assert.doesNotThrow(()=>check([job]))
 assert.throws(()=>check([job],'2025/26'),/izvor/)
 const archive={name:'Arhiv sezona — brez baze',status:'completed',conclusion:'success'}
 assert.doesNotThrow(()=>check([{...job,steps:[archive]}],'2025/26'))
 for(const steps of [undefined,null,{},[],[null],[{}],[{...step,status:'in_progress'}],[{...step,status:'completed',conclusion:'skipped'}],[{...step,conclusion:'failure'}],[{...step,name:'Tekoča sezona — dokazi in surovi dokumenti'}],[archive],[step,step]]){
  assert.throws(()=>check([{...job,steps}]),/izvor/)
 }
 for(const patch of [{run_id:42},{head_sha:'b'.repeat(40)},{status:'in_progress'},{conclusion:'failure'}])assert.throws(()=>check([{...job,...patch}]),/izvor/)
 assert.throws(()=>check([job,job]),/izvor/)
 assert.throws(()=>check([null]),/izvor/)
 assert.throws(()=>check([job,{...job,name:'Zivi vir — dfb 2026/27'}]),/izvor/)
 for(const patch of [{id:42},{path:'.github/workflows/ci.yml'},{head_sha:'b'.repeat(40)},{event:'pull_request'},{status:'in_progress'},{repository:{full_name:'other/repo'}}])assert.throws(()=>check([job],'2026/27',{...run,...patch}),/izvor/)
})
