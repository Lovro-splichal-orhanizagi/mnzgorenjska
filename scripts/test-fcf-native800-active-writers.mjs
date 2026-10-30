import test from 'node:test'
import assert from 'node:assert/strict'
import {assertNative800NoActiveWriters,NATIVE800_ACTIVE_WRITER_STATUSES} from './fcf-native800-active-writers.mjs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const family=['fcf-javni-dokazi.yml','uvoz-fcf-zgodovina.yml','uvoz-zapisnikov.yml','uvoz-lige.yml','uvoz-dfb-regije.yml','vklop-dfb-regije.yml','vklop-katalonije.yml','vklop-obstojecih-lig.yml','uskladi-pozicije.yml','izstop-kluba.yml','cene-lig.yml','zdruzi-klube.yml','tedensko-cene.yml','razdeli-zlite-igralce.yml','grbi.yml','fcf-native800.yml']
const own={id:900,run_attempt:1,head_sha:'a'.repeat(40),path:'.github/workflows/fcf-native800.yml',status:'in_progress',event:'workflow_dispatch',head_branch:'main',repository:{full_name:repository},head_repository:{full_name:repository},actor:{id:25134229,login:'nejcar20',type:'User'},triggering_actor:{id:25134229,login:'nejcar20',type:'User'}}
function apiFixture(records=[]){const calls=[];return {calls,github:async p=>{calls.push(p);const m=new RegExp(`^repos/${repository.replace('/','\\/')}/actions/runs\\?status=([^&]+)&per_page=(\\d+)&page=(\\d+)$`).exec(p);assert.ok(m,'fixed repo run query only');const[,status,size,page]=m;assert.equal(Number(size),100);const all=records.filter(r=>r.status===status);return {total_count:all.length,workflow_runs:all.slice((Number(page)-1)*100,Number(page)*100)}}}}
const run=(id,status,path,{attempt=1,head='b'.repeat(40),repo=repository,...more}={})=>({id,status,path:`.github/workflows/${path}`,run_attempt:attempt,head_sha:head,repository:{full_name:repo},head_repository:{full_name:repo},...more})

test('native writer census lists every status and exempts only the exact current native run',async()=>{
 assert.deepEqual(NATIVE800_ACTIVE_WRITER_STATUSES,['in_progress','queued','requested','waiting','pending'])
 const ownRun={...own,workflow_id:77},f=apiFixture([ownRun]),result=await assertNative800NoActiveWriters({github:f.github,ownRun})
 assert.equal(result.status,'CLEAR');assert.equal(result.observedRuns,1);assert.equal(f.calls.length,5);for(const status of NATIVE800_ACTIVE_WRITER_STATUSES)assert.ok(f.calls.includes(`repos/${repository}/actions/runs?status=${status}&per_page=100&page=1`))
})
test('all five nonterminal states of every fixed writer workflow hold',async()=>{
 for(const status of NATIVE800_ACTIVE_WRITER_STATUSES)for(const workflow of family){const f=apiFixture([run(91,status,workflow)]);await assert.rejects(assertNative800NoActiveWriters({github:f.github,ownRun:own}),/ACTIVE_WRITER/)}
})
test('repository census paginates completely and rejects truncation or changing totals',async()=>{
 const records=Array.from({length:101},(_,i)=>run(i+1,'queued','fcf-javni-dokazi.yml')),f=apiFixture(records)
 await assert.rejects(assertNative800NoActiveWriters({github:f.github,ownRun:own}),/ACTIVE_WRITER/);assert.ok(f.calls.some(x=>x.endsWith('page=2')))
 const bad=async p=>{const status=new URLSearchParams(p.split('?')[1]).get('status');if(status!=='queued')return {total_count:0,workflow_runs:[]};return p.endsWith('page=1')?{total_count:101,workflow_runs:records.slice(0,100)}:{total_count:102,workflow_runs:[records[100]]}}
 await assert.rejects(assertNative800NoActiveWriters({github:bad,ownRun:own}),/CENSUS/)
 const truncated=async p=>{const status=new URLSearchParams(p.split('?')[1]).get('status');return status==='queued'?{total_count:101,workflow_runs:records.slice(0,99)}:{total_count:0,workflow_runs:[]}}
 await assert.rejects(assertNative800NoActiveWriters({github:truncated,ownRun:own}),/CENSUS/)
 const capped=async()=>({total_count:1001,workflow_runs:[]})
 await assert.rejects(assertNative800NoActiveWriters({github:capped,ownRun:own}),/CENSUS/)
 const atCap=apiFixture([own,...Array.from({length:999},(_,i)=>run(2000+i,'queued','unrelated.yml'))])
 const complete=await assertNative800NoActiveWriters({github:atCap.github,ownRun:own});assert.equal(complete.status,'CLEAR');assert.ok(atCap.calls.includes(`repos/${repository}/actions/runs?status=queued&per_page=100&page=10`))
})
test('malformed, duplicate, foreign and rerun writer identities hold closed',async()=>{
 for(const records of [
  [run(1,'queued','uvoz-fcf-zgodovina.yml',{repo:'other/repo'})],
  [run(1,'queued','uvoz-fcf-zgodovina.yml',{head:'bad'})],
  [run(1,'queued','uvoz-fcf-zgodovina.yml',{attempt:2})],
  [{...run(1,'queued','uvoz-fcf-zgodovina.yml'),path:'../../outside'}],
  [run(1,'queued','uvoz-fcf-zgodovina.yml'),run(1,'queued','uvoz-fcf-zgodovina.yml')],
 ]){const f=apiFixture(records);await assert.rejects(assertNative800NoActiveWriters({github:f.github,ownRun:own}),/CENSUS|ACTIVE_WRITER/)}
 await assert.rejects(assertNative800NoActiveWriters({github:async()=>{throw Error('API unavailable')},ownRun:own}),/CENSUS/)
})
test('current-run exemption refuses changed workflow, head or attempt',async()=>{
 for(const altered of [{...own,path:'.github/workflows/uvoz-fcf-zgodovina.yml'},{...own,head_sha:'c'.repeat(40)},{...own,run_attempt:2},{...own,status:'queued'}]){
  const f=apiFixture([altered]);await assert.rejects(assertNative800NoActiveWriters({github:f.github,ownRun:own}),/CENSUS|ACTIVE_WRITER/)
 }
})
