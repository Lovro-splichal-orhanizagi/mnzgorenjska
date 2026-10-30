import test from 'node:test'
import assert from 'node:assert/strict'
import {readBadenR10FamilyHistory,badenR10HistoryFamilies} from './fussball-baden-r10-history.mjs'
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',boundary='2026-10-28T20:15:01Z',old='2026-10-27T20:15:01Z',head='a'.repeat(40)
const run={id:1,run_attempt:1,head_sha:head,path:'.github/workflows/'+badenR10HistoryFamilies[0],created_at:old,updated_at:old,status:'completed',conclusion:'failure',repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'},head_repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
const job={id:2,run_id:1,run_attempt:1,head_sha:head,status:'completed',started_at:old,completed_at:old,steps:[{number:1,name:'source',status:'completed',started_at:old,completed_at:old}]}
function fixture(change=(p,v)=>v){return async p=>{assert.ok(p.startsWith(prefix));const v=p.includes('/workflows/')?{total_count:p.includes(badenR10HistoryFamilies[0]+'/')?1:0,workflow_runs:p.includes(badenR10HistoryFamilies[0]+'/')?[run]:[]}:p.includes('/jobs?')?{total_count:1,jobs:[job]}:run;return structuredClone(change(p,structuredClone(v)))}}
test('unfiltered family closure authenticates actual older attempts and every terminal source-step time',async()=>{
 const v=await readBadenR10FamilyHistory({github:fixture()});assert.equal(v.complete,true);assert.equal(v.olderRuns[0].additionalPostBoundaryAttempts,0);assert.deepEqual(v.overlapRuns,[]);assert.equal(v.boundary,boundary)
})
test('older IDs with a later rerun or actual source step remain visible, never absence-zero',async()=>{
 for(const mode of ['attempt','step','live','foreign','incomplete']){
  const f=fixture((p,v)=>mode==='attempt'&&p.includes('/actions/runs/1')&&!p.includes('/jobs?')?{...v,run_attempt:2,updated_at:'2026-10-30T10:00:00Z'}:mode==='step'&&p.includes('/jobs?')?{...v,jobs:[{...job,steps:[{...job.steps[0],completed_at:boundary}]}]}:mode==='live'&&p.includes('/jobs?')?{...v,jobs:[{...job,status:'in_progress'}]}:mode==='foreign'&&p.includes('/actions/runs/1')?{...v,repository:{full_name:'evil/repo'}}:mode==='incomplete'&&p.includes('/workflows/')?{...v,total_count:1,workflow_runs:[]}:v)
  await assert.rejects(readBadenR10FamilyHistory({github:f}),/BADEN_HISTORY_/)
 }
})
