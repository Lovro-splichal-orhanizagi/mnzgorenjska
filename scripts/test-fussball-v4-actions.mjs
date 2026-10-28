import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import * as checkpoint from './fussball-checkpoint.mjs'
import * as actions from './fussball-completion-actions.mjs'
import {validateFussballSeasonPilot} from './fussball-season-pilot.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/preveri-fussball-dopolni.yml',sha='a'.repeat(40),preset='baden-reviewed-transports-v4',step='Capture fresh rounds and missing originals without database credentials'
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:`${repo}/${workflow}@refs/heads/main`,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40614233935',GITHUB_JOB:'capture',GITHUB_SHA:sha,EXPECTED_SHA:sha,COMPLETION_PRESET:preset,COMPLETION_CURRENT_REQUESTS:'483',COMPLETION_ARCHIVE_REQUESTS:'3000'})
const build=e=>actions.buildFussballCompletionEnvironment(e,{headSha:sha})
test('v4 reserves1517+483+3000 and independently validates paired pilot scope',()=>{const e=build(environment()),p=validateFussballSeasonPilot(e,{headSha:sha});assert.equal(p.priorRequests,1517);assert.equal(p.current.maxRequests,483);assert.equal(p.archive.maxRequests,3000);assert.equal(p.checkpointPreset,preset)})
for(const patch of [{COMPLETION_CURRENT_REQUESTS:'484'},{PRIOR_REQUESTS:'1423'},{COMPLETION_ARCHIVE_REQUESTS:'3001'},{TOTAL_REQUEST_CAP:'5001'},{GITHUB_RUN_ATTEMPT:'2'}])test(`v4 rejects bad reservation ${JSON.stringify(patch)}`,()=>{assert.equal(build(environment()).PRIOR_REQUESTS,'1517');assert.throws(()=>build({...environment(),...patch}))})
test('v4 JSON proof cannot clear history before any GET',async()=>{let calls=0;await assert.rejects(actions.assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:{preset,priorRequests:1517},github:async()=>{calls++;throw Error('no GET')}}));assert.equal(calls,0)})
const directory=process.env.FUSSBALL_V4_EVIDENCE_DIR,actual={skip:directory===undefined?'set FUSSBALL_V4_EVIDENCE_DIR to actual partial raw artifact':false}
function history(){
 const parent={...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))},proof=checkpoint.readFussballTransportV4({parent}),records=checkpoint.exportFussballV4AccountedHistory(proof)
 const own={id:40614233935,run_attempt:1,status:'in_progress',conclusion:null,event:'workflow_dispatch',head_branch:'main',head_sha:sha,path:workflow,repository:{full_name:repo},head_repository:{full_name:repo},created_at:new Date().toISOString()},ownJobs={total_count:1,jobs:[{id:123456789,run_id:own.id,run_attempt:1,head_sha:sha,name:'capture',status:'in_progress',conclusion:null,steps:[{name:step,status:'in_progress',conclusion:null}]}]}
 const f={proof,records,own,runs:[own,...Object.values(records).filter((r,i,a)=>a.findIndex(x=>x.run.id===r.run.id)===i).map(p=>p.run)]}
 f.github=async path=>{
  if(path===`actions/runs/${own.id}`)return structuredClone(own)
  if(path===`actions/runs/${own.id}/attempts/1/jobs?per_page=100`)return structuredClone(ownJobs)
  if(path.startsWith('actions/workflows/'))return{total_count:f.runs.length,workflow_runs:structuredClone(f.runs)}
  for(const p of Object.values(records)){
   if(path===`actions/runs/${p.run.id}`)return structuredClone(p.run)
   if(path===`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100`)return structuredClone(p.jobs)
   if(path===`actions/artifacts/${p.artifact.id}`)return structuredClone(p.artifact)
  }
  throw Error(`unexpected fake GET ${path}`)
 };return f
}
test('v4 accounts exactly all three consumed runs and rejects repeated/unknown source history',actual,async()=>{
 const f=history(),check=()=>actions.assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:f.proof,github:f.github})
 assert.equal((await check()).priorRequests,1517)
 const old=f.runs;f.runs=old.filter(r=>r.id!==40614233934);await assert.rejects(check,/missing/);f.runs=old
 f.runs=[...old,{...f.records.partial.run,id:40614233936,run_attempt:2}];await assert.rejects(check,/live|unknown/)
 for(const [preset,current]of[['baden-reviewed-transports-v1','886'],['baden-reviewed-transports-v2','788'],['baden-reviewed-transports-v3','577']]){
  const proof=preset.endsWith('v2')?checkpoint.readFussballTransportResumption({parent:f.records.prior}):preset.endsWith('v3')?checkpoint.readFussballTransportSuccessor({current:f.records.current,archive:f.records.archive}):undefined
  f.runs=old;await assert.rejects(actions.assertFussballCompletionUnspent({env:{...environment(),COMPLETION_PRESET:preset,COMPLETION_CURRENT_REQUESTS:current},headSha:sha,completionProof:proof,github:f.github}),/source-started/)
 }
})
