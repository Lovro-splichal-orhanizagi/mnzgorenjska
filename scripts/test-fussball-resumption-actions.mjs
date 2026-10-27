// Actual retained failed-parent bytes; NEW successor/GitHub history is injected
// test-only metadata. No GitHub, federation, database or Actions execution.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import * as checkpoints from './fussball-checkpoint.mjs'
import {buildFussballCompletionEnvironment,downloadFussballCompletionParents,loadFussballCompletionParents,assertFussballCompletionUnspent} from './fussball-completion-actions.mjs'
import {validateFussballSeasonPilot,captureFussballSeasonCurrent} from './fussball-season-pilot.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/preveri-fussball-dopolni.yml',v2='baden-reviewed-transports-v2',sha='a'.repeat(40),sourceStep='Capture fresh rounds and missing originals without database credentials'
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:`${repo}/${workflow}@refs/heads/main`,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40566792787',GITHUB_JOB:'capture',GITHUB_SHA:sha,EXPECTED_SHA:sha,COMPLETION_PRESET:v2,COMPLETION_CURRENT_REQUESTS:'788',COMPLETION_ARCHIVE_REQUESTS:'3000'})
const build=e=>buildFussballCompletionEnvironment(e,{headSha:sha})
test('successor explicitly reserves1212+788+3000=5000 while default v1 retains1114',()=>{
 const e=build(environment()),p=validateFussballSeasonPilot(e,{headSha:sha})
 assert.equal(e.FUSSBALL_COMPLETION_PRESET,v2);assert.equal(e.PRIOR_REQUESTS,'1212');assert.equal(p.priorRequests+p.current.maxRequests+p.archive.maxRequests,5000);assert.equal(p.checkpointPreset,v2);assert.equal(p.current.cardPolicy,'community-v1')
 const old=environment();delete old.COMPLETION_PRESET;old.COMPLETION_CURRENT_REQUESTS='886';assert.equal(build(old).PRIOR_REQUESTS,'1114')
})
for(const [name,patch]of Object.entries({unknown:{COMPLETION_PRESET:'baden-unknown'},priorRefund:{PRIOR_REQUESTS:'1114'},capReset:{TOTAL_REQUEST_CAP:'5170'},currentOver:{COMPLETION_CURRENT_REQUESTS:'789'},archiveOver:{COMPLETION_ARCHIVE_REQUESTS:'3001'},rerun:{GITHUB_RUN_ATTEMPT:'2'},wrongWorkflow:{GITHUB_WORKFLOW_REF:`${repo}/.github/workflows/another.yml@refs/heads/main`}}))test(`successor ${name} refuses before external IO`,()=>assert.throws(()=>build({...environment(),...patch})))
test('pilot independently refuses successor prior/budget/scope changes',()=>{
 const e=build(environment())
 for(const patch of [{PRIOR_REQUESTS:'1114'},{MAX_REQUESTS:'789'},{TOTAL_REQUEST_CAP:'5001'},{FUSSBALL_COMPLETION_PRESET:'unknown'},{ROLLOUT_CANDIDATE:'de-other'},{SEASON:'2025/26'},{REPORTS:'1'}])assert.throws(()=>validateFussballSeasonPilot({...e,...patch},{headSha:sha}))
})
test('source gate cannot account a parent from caller-written or copied flags',async()=>{
 let calls=0
 for(const proof of [undefined,{preset:v2,priorRequests:1212,parents:[{runId:'40566792786'}]}])await assert.rejects(()=>assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:proof,github:async()=>{calls++;assert.fail('no GET before capability')}}))
 assert.equal(calls,0)
})
const evidence=process.env.FUSSBALL_RESUMPTION_EVIDENCE_DIR,genuine={skip:evidence?false:'Explicit genuine fourth-parent evidence directory required; no authentication claimed'}
let retained
function actual(){
 if(!retained){assert.equal(typeof checkpoints.readFussballTransportResumption,'function');const parent={run:JSON.parse(readFileSync(join(evidence,'run.json'))),artifact:JSON.parse(readFileSync(join(evidence,'artifact.json'))),jobs:JSON.parse(readFileSync(join(evidence,'jobs.json'))),zipBytes:readFileSync(join(evidence,'source.zip'))};retained={parent,proof:checkpoints.readFussballTransportResumption({parent})}}
 return retained
}
function history(){
 const {parent,proof}=actual(),created=new Date(Math.max(Date.now(),Date.parse(parent.run.updated_at)+1000)).toISOString(),own={id:40566792787,run_attempt:1,status:'in_progress',conclusion:null,event:'workflow_dispatch',head_branch:'main',head_sha:sha,path:workflow,repository:{full_name:repo},head_repository:{full_name:repo},created_at:created},ownJobs={total_count:1,jobs:[{id:122999999999,run_id:own.id,run_attempt:1,head_sha:sha,name:'capture',status:'in_progress',conclusion:null,steps:[{name:sourceStep,status:'in_progress',conclusion:null}]}]}
 const f={parent:structuredClone({...parent,zipBytes:undefined}),proof,own,ownJobs,runs:[own,structuredClone(parent.run)],calls:[],ownReads:0,otherJobs:new Map()}
 f.github=async(path,binary=false)=>{
  f.calls.push([path,binary])
  if(path===`actions/runs/${own.id}`){f.ownReads++;return structuredClone(f.own)}
  if(path===`actions/runs/${own.id}/attempts/1/jobs?per_page=100`)return structuredClone(f.ownJobs)
  if(path.startsWith('actions/workflows/'))return {total_count:f.runs.length,workflow_runs:structuredClone(f.runs)}
  if(path===`actions/runs/${parent.run.id}`)return structuredClone(f.parent.run)
  if(path===`actions/runs/${parent.run.id}/attempts/1/jobs?per_page=100`)return structuredClone(f.parent.jobs)
  if(path===`actions/artifacts/${parent.artifact.id}`)return structuredClone(f.parent.artifact)
  if(f.otherJobs.has(path))return structuredClone(f.otherJobs.get(path))
  assert.fail(`Unexpected GitHub operation ${path}`)
 }
 return f
}
const check=f=>assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:f.proof,github:f.github})
test('genuine fourth parent is the only source-started history exception and own execution is rechecked',genuine,async()=>{
 const f=history(),p=await check(f)
 assert.equal(p.priorRequests,1212);assert.equal(p.sourceStarted,false);assert.equal(p.checkedRunId,String(f.own.id));assert.ok(f.ownReads>=2);assert.ok(f.calls.some(([p])=>p===`actions/artifacts/${f.parent.artifact.id}`))
})
for(const [name,change]of[
 ['copied capability',f=>f.proof=structuredClone(f.proof)],['actual parent rerun',f=>f.parent.run.run_attempt=2],['actual parent cancelled',f=>f.parent.run.conclusion='cancelled'],['actual parent SHA drift',f=>f.parent.run.head_sha='b'.repeat(40)],['actual parent capture job drift',f=>f.parent.jobs.jobs.find(j=>j.name==='capture').id++],['actual parent artifact drift',f=>f.parent.artifact.digest='sha256:'+'b'.repeat(64)],['missing accounted history',f=>f.runs=[f.own]],['duplicate history',f=>f.runs.push(f.runs[1])],['current job not capture',f=>f.ownJobs.jobs[0].name='other'],['current capture already ended',f=>f.ownJobs.jobs[0].steps[0].status='completed'],
])test(`successor history gate refuses ${name}`,genuine,async()=>{const f=history();change(f);await assert.rejects(()=>check(f))})
for(const state of ['started','rerun','live','cancelled','unknown'])test(`any additional ${state} completion blocks successor allowance`,genuine,async()=>{
 const f=history(),id=40566792785,r={...f.parent.run,id,created_at:'2026-10-27T19:00:00Z',conclusion:state==='cancelled'?'cancelled':'failure',status:state==='live'?'in_progress':'completed',run_attempt:state==='rerun'?2:1},j={total_count:1,jobs:[{id:122888888888,name:'capture',run_id:id,run_attempt:1,head_sha:r.head_sha,status:'completed',conclusion:'failure',steps:state==='unknown'?[]:[{name:sourceStep,status:'completed',conclusion:state==='cancelled'?'skipped':'failure'}]}]}
 f.runs.push(r);f.otherJobs.set(`actions/runs/${id}/attempts/1/jobs?per_page=100`,j);await assert.rejects(()=>check(f))
})
test('a later successor source-start prevents a second dispatch from resetting1212',genuine,async()=>{
 const f=history(),id=40566792784,r={...f.parent.run,id,created_at:'2026-10-27T19:30:00Z'},j={total_count:1,jobs:[{id:122888888888,name:'capture',run_id:id,run_attempt:1,head_sha:r.head_sha,status:'completed',conclusion:'failure',steps:[{name:sourceStep,status:'completed',conclusion:'failure'}]}]};f.runs.push(r);f.otherJobs.set(`actions/runs/${id}/attempts/1/jobs?per_page=100`,j);await assert.rejects(()=>check(f))
})
test('only provably skipped additional captures remain unspent',genuine,async()=>{
 const f=history(),id=40566792785,r={...f.parent.run,id,created_at:'2026-10-27T19:00:00Z'},j={total_count:1,jobs:[{id:122888888888,name:'capture',run_id:id,run_attempt:1,head_sha:r.head_sha,status:'completed',conclusion:'failure',steps:[{name:sourceStep,status:'completed',conclusion:'skipped'}]}]};f.runs.push(r);f.otherJobs.set(`actions/runs/${id}/attempts/1/jobs?per_page=100`,j);assert.equal((await check(f)).priorRequests,1212)
})
test('own cancellation after parent/history reads blocks before returning source clearance',genuine,async()=>{
 const f=history(),get=f.github;f.github=async(...args)=>{const result=await get(...args);if(args[0]===`actions/artifacts/${f.parent.artifact.id}`)Object.assign(f.own,{status:'completed',conclusion:'cancelled'});return result};await assert.rejects(()=>check(f))
})
test('legacy1114 preset still refuses the actually started fourth parent',genuine,async()=>{
 const f=history(),e={...environment(),COMPLETION_PRESET:'baden-reviewed-transports-v1',COMPLETION_CURRENT_REQUESTS:'886'};await assert.rejects(()=>assertFussballCompletionUnspent({env:e,headSha:sha,github:f.github}),/source-started/)
})
test('successor downloads one exact raw record through injected GETs and pilot loads that preset',genuine,async()=>{
 const {parent}=actual(),calls=[],github=async(path,binary=false)=>{calls.push([path,binary]);if(path===`actions/runs/${parent.run.id}`)return structuredClone(parent.run);if(path===`actions/runs/${parent.run.id}/attempts/1/jobs?per_page=100`)return structuredClone(parent.jobs);if(path===`actions/artifacts/${parent.artifact.id}`)return structuredClone(parent.artifact);if(path===`actions/artifacts/${parent.artifact.id}/zip`){assert.equal(binary,true);return parent.zipBytes}assert.fail(path)},base=mkdtempSync(join(tmpdir(),'slff-resumption-actions-')),directory=join(base,'checkpoint-input')
 try{
  const p=await downloadFussballCompletionParents(directory,{env:environment(),headSha:sha,github});assert.equal(p.preset,v2);assert.equal(p.priorRequests,1212);assert.equal(calls.length,4)
  const loaded=loadFussballCompletionParents(directory,{preset:v2});assert.deepEqual(loaded,p);assert.throws(()=>loadFussballCompletionParents(directory));assert.equal(existsSync(join(directory,'parents',`${parent.run.id}.zip`)),true)
  let received
  await captureFussballSeasonCurrent('unused',{...build(environment()),FUSSBALL_COMPLETION_DIRECTORY:directory},{headSha:sha,captureDirectory:async input=>{received=input;return {success:true}}})
  assert.equal(received.completionProof.preset,v2);assert.equal(received.options.maxRequests,788)
 }finally{rmSync(base,{recursive:true,force:true})}
})
