import test from 'node:test'
import assert from 'node:assert/strict'
import {olderGermanReaders,waitForGermanSource} from './bulk-source-coordination.mjs'
test('reader order cannot deadlock on newer runs and includes older queued readers',()=>{
 const own={id:2,created_at:'2026-10-25T10:00:00Z'}
 assert.deepEqual(olderGermanReaders([{...own,id:1,status:'queued'},{...own,id:3,status:'in_progress'},{...own,id:4,status:'completed'}],own).map(r=>r.id),[1])
})
test('completed German nightly jobs do not wait for other country shards',async()=>{
 let calls=0
 await waitForGermanSource({sleep:async()=>{},env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},api:async path=>{
  calls++
  if(path==='actions/runs/2')return {id:2,run_attempt:1,created_at:'2026-10-25T10:00:00Z'}
  if(path.startsWith('actions/runs/1/jobs'))return {total_count:2,jobs:[{name:'uvoz DE',status:'completed'},{name:'uvoz PL',status:'in_progress'}]}
  const found=path.includes('uvoz-zapisnikov')&&path.includes('status=in_progress')
  return {total_count:found?1:0,workflow_runs:found?[{id:1,created_at:'2026-10-25T09:00:00Z',status:'in_progress',path:'.github/workflows/uvoz-zapisnikov.yml'}]:[]}
 }})
 assert.equal(calls,27)
})

test('reader gate rejects incomplete inventories and reruns before source release',async()=>{
 for(const response of [{total_count:1,workflow_runs:[]},{total_count:-1,workflow_runs:[]},{total_count:2,workflow_runs:[{id:2},{id:2}]}])await assert.rejects(waitForGermanSource({env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},api:async path=>path==='actions/runs/2'?{id:2,run_attempt:1,created_at:'2026-10-25T10:00:00Z'}:response,sleep:async()=>{}}),/Incomplete/)
 await assert.rejects(waitForGermanSource({env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},api:async()=>({id:2,run_attempt:2,created_at:'2026-10-25T10:00:00Z'}),sleep:async()=>{}}),/reruns/)
})
