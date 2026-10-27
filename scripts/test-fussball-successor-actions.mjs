// Genuine retained bytes with injected GitHub GET responses. No network or capture.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import * as checkpoints from './fussball-checkpoint.mjs'
import * as actions from './fussball-completion-actions.mjs'
import {validateFussballSeasonPilot,captureFussballSeasonCurrent} from './fussball-season-pilot.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/preveri-fussball-dopolni.yml',v3='baden-reviewed-transports-v3',sha='a'.repeat(40),sourceStep='Capture fresh rounds and missing originals without database credentials'
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:`${repo}/${workflow}@refs/heads/main`,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40577717779',GITHUB_JOB:'capture',GITHUB_SHA:sha,EXPECTED_SHA:sha,COMPLETION_PRESET:v3,COMPLETION_CURRENT_REQUESTS:'577',COMPLETION_ARCHIVE_REQUESTS:'3000'})
const build=e=>actions.buildFussballCompletionEnvironment(e,{headSha:sha})
test('v3 reserves actual1423 plus577 plus3000 with unchanged paired parser policy',()=>{
 const e=build(environment()),p=validateFussballSeasonPilot(e,{headSha:sha})
 assert.equal(p.priorRequests,1423);assert.equal(p.totalRequestCap,5000);assert.equal(p.current.maxRequests,577);assert.equal(p.archive.maxRequests,3000);assert.equal(p.current.cardPolicy,'community-v1');assert.equal(p.checkpointPreset,v3)
})
for(const [name,patch] of Object.entries({overCurrent:{COMPLETION_CURRENT_REQUESTS:'578'},overArchive:{COMPLETION_ARCHIVE_REQUESTS:'3001'},missingExplicit:{COMPLETION_CURRENT_REQUESTS:undefined},refund:{PRIOR_REQUESTS:'1212'},capReset:{TOTAL_REQUEST_CAP:'5001'},rerun:{GITHUB_RUN_ATTEMPT:'2'},wrongPreset:{COMPLETION_PRESET:'unknown'}}))test(`v3 refuses ${name} before IO`,()=>assert.throws(()=>build({...environment(),...patch})))
test('pilot separately refuses v3 ledger and current ceiling changes',()=>{
 const e=build(environment())
 for(const patch of [{PRIOR_REQUESTS:'1212'},{MAX_REQUESTS:'578'},{TOTAL_REQUEST_CAP:'5001'},{REPORTS:'1'},{ROLLOUT_CANDIDATE:'de-other'}])assert.throws(()=>validateFussballSeasonPilot({...e,...patch},{headSha:sha}))
})
test('v3 cannot start GETs with an absent or copied proof',async()=>{
 let reads=0
 for(const proof of [undefined,{preset:v3,priorRequests:1423,totalRequestCap:5000,documentsCount:634}])await assert.rejects(()=>actions.assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:proof,github:async()=>{reads++;assert.fail('No GET without proof')}}))
 assert.equal(reads,0)
})
const evidence=process.env.FUSSBALL_SUCCESSOR_EVIDENCE_DIR
const genuine={skip:evidence?false:'Genuine retained fixtures require FUSSBALL_SUCCESSOR_EVIDENCE_DIR; no successor authentication claimed'}
let retained
function actual(){
 if(!retained){
  const run=JSON.parse(readFileSync(join(evidence,'run.json'))),jobs=JSON.parse(readFileSync(join(evidence,'jobs.json'))),artifacts=JSON.parse(readFileSync(join(evidence,'artifacts.json'))).artifacts
  const stage=archive=>({run,jobs,artifact:artifacts.find(a=>a.id===(archive?12770031223:12769641870)),zipBytes:readFileSync(join(evidence,`fussball-season-${archive?'archive-':''}40577717778.zip`))})
  const current=stage(false),archive=stage(true),proof=checkpoints.readFussballTransportSuccessor({current,archive})
  retained={current,archive,proof,...checkpoints.exportFussballSuccessorAccountedHistory(proof)}
 }
 return retained
}
function history(){
 const a=actual(),created=new Date(Math.max(Date.now(),Date.parse(a.current.run.updated_at)+1000)).toISOString(),own={id:40577717779,run_attempt:1,status:'in_progress',conclusion:null,event:'workflow_dispatch',head_branch:'main',head_sha:sha,path:workflow,repository:{full_name:repo},head_repository:{full_name:repo},created_at:created},ownJobs={total_count:1,jobs:[{id:122999999999,run_id:own.id,run_attempt:1,head_sha:sha,name:'capture',status:'in_progress',conclusion:null,steps:[{name:sourceStep,status:'in_progress',conclusion:null}]}]}
 const f={proof:a.proof,records:structuredClone({prior:{...a.prior,zipBytes:undefined},current:{...a.current,zipBytes:undefined},archive:{...a.archive,zipBytes:undefined}}),own,ownJobs,runs:[own,structuredClone(a.current.run),structuredClone(a.prior.run)],calls:[],ownReads:0,otherJobs:new Map()}
 f.github=async(path,binary=false)=>{
  f.calls.push([path,binary])
  if(path===`actions/runs/${own.id}`){f.ownReads++;return structuredClone(f.own)}
  if(path===`actions/runs/${own.id}/attempts/1/jobs?per_page=100`)return structuredClone(f.ownJobs)
  if(path.startsWith('actions/workflows/'))return {total_count:f.runs.length,workflow_runs:structuredClone(f.runs)}
  for(const p of Object.values(f.records)){
   if(path===`actions/runs/${p.run.id}`)return structuredClone(p.run)
   if(path===`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100`)return structuredClone(p.jobs)
   if(path===`actions/artifacts/${p.artifact.id}`)return structuredClone(p.artifact)
  }
  if(f.otherJobs.has(path))return structuredClone(f.otherJobs.get(path))
  assert.fail(`Unexpected GitHub operation ${path}`)
 }
 return f
}
const check=f=>actions.assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:f.proof,github:f.github})
test('both actual accounted runs authenticate before and after active own source step',genuine,async()=>{
 const f=history(),result=await check(f)
 assert.equal(result.priorRequests,1423);assert.equal(result.sourceStarted,false);assert.equal(f.ownReads,2)
 for(const id of [12770031223,12769641870,f.records.prior.artifact.id])assert.ok(f.calls.some(([p])=>p===`actions/artifacts/${id}`))
})
for(const [name,change] of [
 ['copied proof',f=>f.proof=structuredClone(f.proof)],['prior missing',f=>f.runs=f.runs.filter(r=>r.id!==40566792786)],['latest missing',f=>f.runs=f.runs.filter(r=>r.id!==40577717778)],['latest rerun',f=>f.records.current.run.run_attempt=2],['prior cancelled',f=>f.records.prior.run.conclusion='cancelled'],['capture changed',f=>f.records.current.jobs.jobs.find(j=>j.name==='capture').id++],['archive changed',f=>f.records.current.jobs.jobs.find(j=>j.name==='archive').id++],['archive artifact changed',f=>f.records.archive.artifact.digest='sha256:'+'b'.repeat(64)],['own wrong job',f=>f.ownJobs.jobs[0].name='other'],['own ended step',f=>f.ownJobs.jobs[0].steps[0].status='completed'],['duplicate history',f=>f.runs.push(f.runs[1])],
])test(`v3 history refuses ${name}`,genuine,async()=>{const f=history();change(f);await assert.rejects(()=>check(f))})
for(const state of ['started','rerun','live','cancelled','unknown','skipped'])test(`additional ${state} same-workflow execution ${state==='skipped'?'remains unspent':'blocks v3 and repeated use'}`,genuine,async()=>{
 const f=history(),id=40577717777,r={...f.records.current.run,id,created_at:'2026-10-28T01:00:00Z',conclusion:state==='cancelled'?'cancelled':'failure',status:state==='live'?'in_progress':'completed',run_attempt:state==='rerun'?2:1},j={total_count:1,jobs:[{id:122888888888,name:'capture',run_id:id,run_attempt:1,head_sha:r.head_sha,status:'completed',conclusion:'failure',steps:state==='unknown'?[]:[{name:sourceStep,status:'completed',conclusion:state==='skipped'?'skipped':'failure'}]}]}
 f.runs.push(r);f.otherJobs.set(`actions/runs/${id}/attempts/1/jobs?per_page=100`,j)
 if(state==='skipped')assert.equal((await check(f)).priorRequests,1423);else await assert.rejects(()=>check(f))
})
test('own cancellation during latest artifact authentication blocks final clearance',genuine,async()=>{
 const f=history(),get=f.github;f.github=async(...args)=>{const r=await get(...args);if(args[0]==='actions/artifacts/12770031223')Object.assign(f.own,{status:'completed',conclusion:'cancelled'});return r};await assert.rejects(()=>check(f))
})
test('v1 and v2 remain consumed by actual latest source-started execution',genuine,async()=>{
 for(const [preset,current] of [['baden-reviewed-transports-v1','886'],['baden-reviewed-transports-v2','788']]){
  const f=history(),a=actual(),proof=preset.endsWith('v2')?checkpoints.readFussballTransportResumption({parent:a.prior}):undefined
  await assert.rejects(()=>actions.assertFussballCompletionUnspent({env:{...environment(),COMPLETION_PRESET:preset,COMPLETION_CURRENT_REQUESTS:current},headSha:sha,completionProof:proof,github:f.github}),/source-started/)
 }
})
test('GET-only two-stage download survives same-run persistence and pilot passes v3 proof',genuine,async()=>{
 const a=actual(),calls=[],github=async(path,binary=false)=>{
  calls.push([path,binary])
  for(const p of [a.current,a.archive]){
   if(path===`actions/runs/${p.run.id}`)return structuredClone(p.run)
   if(path===`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100`)return structuredClone(p.jobs)
   if(path===`actions/artifacts/${p.artifact.id}`)return structuredClone(p.artifact)
   if(path===`actions/artifacts/${p.artifact.id}/zip`){assert.equal(binary,true);return p.zipBytes}
  }
  assert.fail(path)
 },base=mkdtempSync(join(tmpdir(),'slff-successor-actions-')),directory=join(base,'checkpoint-input')
 try{
  const proof=await actions.downloadFussballCompletionParents(directory,{env:environment(),headSha:sha,github})
  assert.equal(proof.priorRequests,1423);assert.equal(proof.documentsCount,634);assert.equal(calls.length,8)
  for(const stage of ['current','archive'])for(const ext of ['json','zip'])assert.equal(existsSync(join(directory,'parents',`40577717778-${stage}.${ext}`)),true)
  assert.deepEqual(actions.loadFussballCompletionParents(directory,{preset:v3}),proof)
  let received;await captureFussballSeasonCurrent('unused',{...build(environment()),FUSSBALL_COMPLETION_DIRECTORY:directory},{headSha:sha,captureDirectory:async input=>{received=input;return {success:true}}})
  assert.equal(received.completionProof.preset,v3);assert.equal(received.options.maxRequests,577)
 }finally{rmSync(base,{recursive:true,force:true})}
})
test('a newer concurrent source-started dispatch also blocks the same one-use v3 ledger',genuine,async()=>{
 const f=history(),id=40577717780,r={...f.records.current.run,id,created_at:new Date(Date.parse(f.own.created_at)+1000).toISOString()},j={total_count:1,jobs:[{id:122888888888,name:'capture',run_id:id,run_attempt:1,head_sha:r.head_sha,status:'completed',conclusion:'failure',steps:[{name:sourceStep,status:'completed',conclusion:'success'}]}]}
 f.runs.push(r);f.otherJobs.set(`actions/runs/${id}/attempts/1/jobs?per_page=100`,j);await assert.rejects(()=>check(f))
})
