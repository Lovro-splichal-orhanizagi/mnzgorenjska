import test from 'node:test'
import assert from 'node:assert/strict'
import {assertNative800NoActiveWriters,NATIVE800_ACTIVE_WRITER_STATUSES,NATIVE800_CLOSED_WORKFLOW_PATHS} from './fcf-native800-active-writers.mjs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const family=['fcf-javni-dokazi.yml','uvoz-fcf-zgodovina.yml','uvoz-zapisnikov.yml','uvoz-lige.yml','uvoz-dfb-regije.yml','vklop-dfb-regije.yml','vklop-katalonije.yml','vklop-obstojecih-lig.yml','uskladi-pozicije.yml','izstop-kluba.yml','cene-lig.yml','zdruzi-klube.yml','tedensko-cene.yml','razdeli-zlite-igralce.yml','grbi.yml','fcf-native800.yml','fcf-g1-native800.yml']
const root={id:25134229,login:'nejcar20',type:'User'}
const own={id:900,run_attempt:1,head_sha:'a'.repeat(40),path:'.github/workflows/fcf-native800.yml',status:'in_progress',event:'workflow_dispatch',head_branch:'main',repository:{full_name:repository},head_repository:{full_name:repository},actor:root,triggering_actor:root}
const ownG1={...own,id:901,path:'.github/workflows/fcf-g1-native800.yml'}
function apiFixture(records=[]){const calls=[];return {calls,github:async p=>{calls.push(p);const m=new RegExp(`^repos/${repository.replace('/','\\/')}/actions/runs\\?status=([^&]+)&per_page=(\\d+)&page=(\\d+)$`).exec(p);assert.ok(m,'fixed repo run query only');const[,status,size,page]=m;assert.equal(Number(size),100);const all=records.filter(r=>r.status===status);return {total_count:all.length,workflow_runs:all.slice((Number(page)-1)*100,Number(page)*100)}}}}
const run=(id,status,path,{attempt=1,head='b'.repeat(40),repo=repository,...more}={})=>({id,status,path:`.github/workflows/${path}`,run_attempt:attempt,head_sha:head,repository:{full_name:repo},head_repository:{full_name:repo},...more})
async function rejectsCode(promise,code){await assert.rejects(promise,error=>error?.activeWriterCode===code,`expected exact census code ${code}`)}

test('closed current-run workflows are exactly G9 and G1 native800',async()=>{
 assert.deepEqual(NATIVE800_ACTIVE_WRITER_STATUSES,['in_progress','queued','requested','waiting','pending'])
 assert.deepEqual(NATIVE800_CLOSED_WORKFLOW_PATHS,['.github/workflows/fcf-native800.yml','.github/workflows/fcf-g1-native800.yml'])
 for(const ownRun of [own,ownG1]){const f=apiFixture([ownRun]),result=await assertNative800NoActiveWriters({github:f.github,ownRun});assert.equal(result.status,'CLEAR');assert.equal(result.observedRuns,1);assert.equal(f.calls.length,5);for(const status of NATIVE800_ACTIVE_WRITER_STATUSES)assert.ok(f.calls.includes(`repos/${repository}/actions/runs?status=${status}&per_page=100&page=1`))}
 await rejectsCode(assertNative800NoActiveWriters({github:apiFixture([own]).github,ownRun:{...own,path:'.github/workflows/some-new-native-writer.yml'}}),'INVALID_CURRENT_NATIVE_RUN')
})

test('all five nonterminal states of every exact writer workflow hold despite a valid current run',async()=>{
 for(const status of NATIVE800_ACTIVE_WRITER_STATUSES)for(const workflow of family){const f=apiFixture([own,run(91,status,workflow)]);await rejectsCode(assertNative800NoActiveWriters({github:f.github,ownRun:own}),'ACTIVE_WRITER_OVERLAP')}
})

test('complete pagination accepts exactly the 1000-run ceiling and rejects changing/truncated/over-cap counts',async()=>{
 const records=[own,...Array.from({length:101},(_,i)=>run(i+1,'queued','fcf-javni-dokazi.yml'))],f=apiFixture(records)
 await rejectsCode(assertNative800NoActiveWriters({github:f.github,ownRun:own}),'ACTIVE_WRITER_OVERLAP');assert.ok(f.calls.includes(`repos/${repository}/actions/runs?status=queued&per_page=100&page=2`))
 const bad=async p=>{const status=new URLSearchParams(p.split('?')[1]).get('status');if(status!=='queued')return{total_count:status==='in_progress'?1:0,workflow_runs:status==='in_progress'?[own]:[]};return p.endsWith('page=1')?{total_count:101,workflow_runs:records.slice(1,101)}:{total_count:102,workflow_runs:[records[101]]}}
 await rejectsCode(assertNative800NoActiveWriters({github:bad,ownRun:own}),'CENSUS_TOTAL_CHANGED')
 const truncated=async p=>{const status=new URLSearchParams(p.split('?')[1]).get('status');return status==='in_progress'?{total_count:1,workflow_runs:[own]}:status==='queued'?{total_count:101,workflow_runs:records.slice(1,100)}:{total_count:0,workflow_runs:[]}}
 await rejectsCode(assertNative800NoActiveWriters({github:truncated,ownRun:own}),'INCOMPLETE_CENSUS_PAGE')
 const capped=async p=>{const status=new URLSearchParams(p.split('?')[1]).get('status');return{total_count:status==='in_progress'?1:1001,workflow_runs:status==='in_progress'?[own]:[]}}
 await rejectsCode(assertNative800NoActiveWriters({github:capped,ownRun:own}),'INVALID_CENSUS_RESPONSE')
 const atCap=apiFixture([own,...Array.from({length:999},(_,i)=>run(2000+i,'queued','ci.yml'))])
 const complete=await assertNative800NoActiveWriters({github:atCap.github,ownRun:own});assert.equal(complete.status,'CLEAR');assert.ok(atCap.calls.includes(`repos/${repository}/actions/runs?status=queued&per_page=100&page=10`))
})

test('malformed repo/head/path, reruns, same-page duplicate IDs and API failures report exact errors',async()=>{
 const cases=[
  [[own,run(1,'queued','uvoz-fcf-zgodovina.yml',{repo:'other/repo'})],'INVALID_RUN_IDENTITY'],
  [[own,run(11,'queued','uvoz-fcf-zgodovina.yml',{repo:'other/first'})],'INVALID_RUN_IDENTITY'],
  [[own,run(12,'requested','fcf-g1-native800.yml',{repo:'other/second'})],'INVALID_RUN_IDENTITY'],
  [[own,run(1,'queued','uvoz-fcf-zgodovina.yml',{head:'bad'})],'INVALID_RUN_IDENTITY'],
  [[own,run(1,'queued','uvoz-fcf-zgodovina.yml',{attempt:2})],'ACTIVE_WRITER_OVERLAP'],
  [[own,{...run(1,'queued','uvoz-fcf-zgodovina.yml'),path:'../../outside'}],'INVALID_WORKFLOW_PATH'],
  [[own,run(1,'queued','uvoz-fcf-zgodovina.yml'),run(1,'queued','uvoz-fcf-zgodovina.yml')],'DUPLICATE_CENSUS_RUN'],
  [[own,{...own,head_sha:'c'.repeat(40)}],'DUPLICATE_CENSUS_RUN'],
 ]
 for(const [records,code]of cases)await rejectsCode(assertNative800NoActiveWriters({github:apiFixture(records).github,ownRun:own}),code)
 await rejectsCode(assertNative800NoActiveWriters({github:async()=>{throw Error('API unavailable')},ownRun:own}),'CENSUS_API_FAILURE')
})

test('duplicate IDs across status pages are a census race; active nonwriter workflows are harmless',async()=>{
 const crossStatus=async p=>{const status=new URLSearchParams(p.split('?')[1]).get('status');if(status==='in_progress')return{total_count:2,workflow_runs:[own,run(91,'in_progress','uvoz-lige.yml')]};if(status==='queued')return{total_count:1,workflow_runs:[run(91,'queued','uvoz-lige.yml')]};return{total_count:0,workflow_runs:[]}}
 await rejectsCode(assertNative800NoActiveWriters({github:crossStatus,ownRun:own}),'DUPLICATE_CENSUS_RUN')
 const harmless=apiFixture([own,run(92,'queued','ci.yml')]),clear=await assertNative800NoActiveWriters({github:harmless.github,ownRun:own});assert.equal(clear.status,'CLEAR');assert.equal(clear.observedRuns,2)
})

test('G9 cannot exempt an active G1 native run and G1 cannot exempt an active G9 native run',async()=>{
 await rejectsCode(assertNative800NoActiveWriters({github:apiFixture([own,run(902,'queued','fcf-g1-native800.yml')]).github,ownRun:own}),'ACTIVE_WRITER_OVERLAP')
 await rejectsCode(assertNative800NoActiveWriters({github:apiFixture([ownG1,run(903,'queued','fcf-native800.yml')]).github,ownRun:ownG1}),'ACTIVE_WRITER_OVERLAP')
 for(const altered of [{...own,path:'.github/workflows/uvoz-fcf-zgodovina.yml'},{...own,head_sha:'c'.repeat(40)},{...own,run_attempt:2},{...own,status:'queued'}])await rejectsCode(assertNative800NoActiveWriters({github:apiFixture([own,altered]).github,ownRun:own}),'DUPLICATE_CENSUS_RUN')
})
