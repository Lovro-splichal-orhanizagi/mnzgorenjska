// TEST ONLY: genuine retained failed37 history. All new approvals, Git objects,
// Actions jobs/artifacts and fresh documents are synthetic controls, not a run.
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,realpathSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {serialize,deserialize} from 'node:v8'
import {postSixAccountingWire} from './fcf-post-six-accounting-test-fixture.mjs'
import {futureClaimFixture,futureConsumptionFixture} from './fcf-future-source-test-fixture.mjs'
import {metadata,zip,sha,repository,workflow} from './fcf-missing-inventory-test-fixture.mjs'
export {zip,sha,repository,workflow}
const copy=x=>deserialize(serialize(x)),repo=`repos/${repository}/`
let historical
function historyMap(){
 if(historical)return copy(historical)
 const raw=postSixAccountingWire(),prior=JSON.parse(readFileSync(join(process.env.FCF_POST_SIX_EVIDENCE_DIR,'approval-manifest.json'))).history,map=new Map(),jobs=new Map(),runs=new Map(),put=(p,v)=>map.set(repo+p,v)
 const visit=v=>{
  if(!v||typeof v!=='object'||Buffer.isBuffer(v))return
  if(v.zipBytes&&v.expected){put(`actions/artifacts/${v.expected.artifactId}`,v.artifact);put(`actions/artifacts/${v.expected.artifactId}/zip`,v.zipBytes)}
  if(v.run&&v.jobs){const id=String(v.run.id),key=`${id}/attempts/${v.run.run_attempt}`,rows=jobs.get(key)??new Map();for(const j of v.jobs){const prev=rows.get(j.id);if(!prev||j.status==='completed'||prev.status!=='completed')rows.set(j.id,j)}jobs.set(key,rows);const prev=runs.get(id);if(!prev||v.run.status==='completed'||prev.status!=='completed')runs.set(id,v.run)}
  if(v.claimCommit&&v.ref){put(`git/ref/${v.ref.ref.slice(5)}`,v.ref);for(const [key,path]of [['commit','commits'],['tree','trees'],['blob','blobs']])put(`git/${path}/${v.claimCommit[key].sha}`,v.claimCommit[key]);for(const r of v.rulesets)put(`rulesets/${r.id}`,r)}
  Object.values(v).forEach(visit)
 };visit(raw)
 for(const [id,r]of runs)put(`actions/runs/${id}`,r)
 for(const [key,rows]of jobs)put(`actions/runs/${key}/jobs?per_page=100&page=1`,{total_count:rows.size,jobs:[...rows.values()]})
 const g=raw.latest,history={prior,latest:{plan:g.plan,claim:{execution:g.claim.execution,expected:g.claim.expected},consumption:g.consumption.expected,children:g.children.map(b=>b.expected),finalReceipt:g.finalReceipt.expected}}
 historical={map,history};return copy(historical)
}
export function futureActionsFixture(t,{wire}={}){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-future-actions-')));t.after(()=>rmSync(root,{recursive:true,force:true}))
 const h=historyMap(),claim=wire?{...wire.claim,plan:wire.plan,now:wire.now}:futureClaimFixture(),consumption=wire?.consumption??futureConsumptionFixture(claim),snapshot=JSON.parse(claim.claimBytes).rulesetSnapshot,approval={schemaVersion:4,kind:'fcf-future-source-approval',sourceCommit:claim.plan.sourceCommit,plan:claim.plan,history:h.history,rulesetId:'12',rulesetSnapshot:snapshot},approvalBytes=Buffer.from(JSON.stringify(approval))
 const f={root,claim,consumption,approval,approvalBytes,history:h.history,map:h.map,calls:[],sourceCalls:[],time:claim.now}
 f.run={id:123,path:workflow,repository:{full_name:repository},event:'workflow_dispatch',head_branch:'main',head_sha:claim.plan.sourceCommit,run_attempt:1,status:'in_progress',conclusion:null,run_started_at:new Date(f.time-1000).toISOString()}
 const job=(id,name,steps,status='completed',conclusion='success')=>({id,name,run_id:123,run_attempt:1,head_sha:claim.plan.sourceCommit,status,conclusion,steps:steps.map(name=>({name,status:'completed',conclusion:'success'}))})
 f.approvalJob=job(455,'missing-inventory-approval',['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval'])
 f.consumeJob=job(456,'missing-inventory-consume',['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'])
 f.captureJob=job(555,'missing-inventory-g9',['Capture missing target inventory'],'in_progress',null);f.captureJob.steps[0].status='in_progress';f.captureJob.steps[0].conclusion=null
 f.receiptJob=job(777,'missing-inventory-receipt',['Retain final FCF inventory receipt'],'in_progress',null)
 f.jobs=[f.approvalJob,f.consumeJob,f.captureJob,f.receiptJob]
 f.addArtifact=b=>{f.map.set(repo+`actions/artifacts/${b.expected.artifactId}`,b.artifact);f.map.set(repo+`actions/artifacts/${b.expected.artifactId}/zip`,b.zipBytes)}
 f.artifact=(bytes,{id,name,jobName,jobId,steps=[]})=>{const b=metadata({bytes,name,jobName,jobId,artifactId:id,steps,run:'in_progress'});b.expected.manifestSha256=sha(bytes);f.addArtifact(b);return b}
 const a=f.artifact(zip([{name:'manifest.json',body:approvalBytes}]),{id:'788',name:'fcf-inventory-approval-123-1',jobName:'missing-inventory-approval',jobId:'455'})
 for(const [key,path]of [['commit','commits'],['tree','trees'],['blob','blobs']])f.map.set(repo+`git/${path}/${claim.claimCommit[key].sha}`,claim.claimCommit[key])
 f.map.set(repo+`git/ref/${claim.ref.ref.slice(5)}`,claim.ref);f.map.set(repo+'rulesets/12',claim.rulesets[0]);f.addArtifact(consumption)
 f.env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:claim.plan.sourceCommit,GITHUB_JOB:'missing-inventory-consume',FCF_INVENTORY_PRESET:claim.plan.preset,FCF_APPROVAL_ID:'788',FCF_APPROVAL_DIGEST:a.expected.artifactDigest,FCF_APPROVAL_MANIFEST_SHA:sha(approvalBytes),FCF_INVENTORY_ASSET_ID:'22',FCF_INVENTORY_ASSET_SHA:'sha256:'+sha(approvalBytes),FCF_CONSUMPTION_ID:consumption.expected.artifactId,FCF_CONSUMPTION_DIGEST:consumption.expected.artifactDigest,FCF_CONSUMPTION_MANIFEST_SHA:consumption.expected.manifestSha256}
 f.github=async(path,binary=false)=>{
  f.calls.push([path,binary]);assert.ok(path.startsWith(repo));const q=path.slice(repo.length)
  if(q==='actions/runs/123')return copy(f.run)
  if(q==='actions/runs/123/attempts/1/jobs?per_page=100&page=1')return copy({total_count:f.jobs.length,jobs:f.jobs})
  if(q.startsWith('actions/workflows/'))return{total_count:0,workflow_runs:[]}
  if(q==='releases?per_page=100&page=1')return[{id:11,tag_name:'fcf-inventory-staging-v1',draft:true}]
  if(q==='releases/11/assets?per_page=100&page=1')return[{id:22,state:'uploaded',size:approvalBytes.length}]
  if(q==='releases/assets/22'){assert.equal(binary,true);return copy(approvalBytes)}
  assert.ok(f.map.has(path),`Unplanned TEST ONLY GitHub GET ${path}`);return copy(f.map.get(path))
 }
 f.clock=()=>f.time;f.pause=async ms=>{f.time+=ms};f.sourceFetch=async(url,init)=>{f.sourceCalls.push({url,init});f.time+=5;return new Response('TEST ONLY refusal',{status:403})}
 f.base=()=>({env:f.env,root:f.root,github:f.github,clock:f.clock,pause:f.pause,sourceFetch:f.sourceFetch})
 return f
}
