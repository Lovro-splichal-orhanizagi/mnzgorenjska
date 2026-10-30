import test from 'node:test'
import assert from 'node:assert/strict'
import {olderGermanReaders,waitForGermanSource,GERMAN_READERS} from './bulk-source-coordination.mjs'
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
 // Own run, every registered reader in five states, and the older nightly jobs.
 assert.equal(calls,2+GERMAN_READERS.length*5)
})

test('reader gate rejects incomplete inventories and reruns before source release',async()=>{
 for(const response of [{total_count:1,workflow_runs:[]},{total_count:-1,workflow_runs:[]},{total_count:2,workflow_runs:[{id:2},{id:2}]}])await assert.rejects(waitForGermanSource({env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},api:async path=>path==='actions/runs/2'?{id:2,run_attempt:1,created_at:'2026-10-25T10:00:00Z'}:response,sleep:async()=>{}}),/Incomplete/)
 await assert.rejects(waitForGermanSource({env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},api:async()=>({id:2,run_attempt:2,created_at:'2026-10-25T10:00:00Z'}),sleep:async()=>{}}),/reruns/)
})

test('fixed fresh paired Baden reader is visible to later source readers',async()=>{
 await assert.rejects(waitForGermanSource({env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},maxAttempts:1,sleep:async()=>{},api:async path=>{
  if(path==='actions/runs/2')return{id:2,run_attempt:1,created_at:'2026-10-29T10:00:00Z'}
  const found=path.includes('preveri-baden-fresh-pair.yml')&&path.includes('status=in_progress')
  return{total_count:found?1:0,workflow_runs:found?[{id:1,created_at:'2026-10-29T09:00:00Z',status:'in_progress',path:'.github/workflows/preveri-baden-fresh-pair.yml'}]:[]}
 }}),/Older German source readers/)
})

test('older direct German/unknown imports and retained writers wait while conclusive foreign direct import does not',async()=>{
 for(const [workflow,title,wait]of [['uvoz-lige.yml','Uvoz lige de-regionalliga-nord',true],['uvoz-lige.yml','Unknown import',true],['uvoz-lige.yml','Uvoz lige zz-unknown',true],['uvoz-lige.yml','Uvoz lige es-ct-primera-g1',false],['uvoz-fussball-public.yml','Uvoz lige de-verbandsliga-baden FUSSBALL public',true],['uvoz-fussball-public.yml','Uvoz lige es-ct-primera-g1 FUSSBALL public',true]]){
  const action=waitForGermanSource({env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},sleep:async()=>{},maxAttempts:1,api:async path=>{if(path==='actions/runs/2')return{id:2,run_attempt:1,created_at:'2026-10-29T10:00:00Z'};const found=path.includes('workflows/'+workflow+'/')&&path.includes('status=in_progress');return{total_count:found?1:0,workflow_runs:found?[{id:1,created_at:'2026-10-29T09:00:00Z',status:'in_progress',path:'.github/workflows/'+workflow,display_title:title}]:[]}}})
  if(wait)await assert.rejects(action,/Older German/);else await action
 }
})
test('active older current-only R10 blocks a later German reader',async()=>{
 await assert.rejects(waitForGermanSource({env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},sleep:async()=>{},maxAttempts:1,api:async p=>p==='actions/runs/2'?{id:2,run_attempt:1,created_at:'2026-10-30T16:00:00Z'}:{total_count:p.includes('workflows/preveri-baden-r10-current.yml/')&&p.includes('status=in_progress')?1:0,workflow_runs:p.includes('workflows/preveri-baden-r10-current.yml/')&&p.includes('status=in_progress')?[{id:1,run_attempt:1,created_at:'2026-10-30T15:59:00Z',status:'in_progress',path:'.github/workflows/preveri-baden-r10-current.yml'}]:[]}}),/Older German/)
})
