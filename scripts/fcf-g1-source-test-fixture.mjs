import {readFcfPostG1Accounting} from './fcf-post-g1-accounting.mjs'
import {execFileSync} from 'node:child_process'
// TEST ONLY new G9/G1 reports, Git objects, Actions and timestamps. Genuine old37
// and retained historical bytes do not establish a new source run or permission.
import {readFileSync,mkdtempSync,realpathSync,rmSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {postG9AccountingWire} from './fcf-post-g9-accounting-test-fixture.mjs'
import {readFcfPostG9Accounting} from './fcf-post-g9-accounting.mjs'
import {buildFcfG1SourceContinuationPlan,buildFcfG1PostFailureSourcePlan,fcfFutureSourceClaimRef} from './fcf-future-source-plan.mjs'
import {claimFixture,metadata,zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {snapshotFcfInventoryRuleset,readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {sixTestSchedule} from './fcf-six-test-fixture.mjs'
import {deriveFcfFutureInventoryHeader} from './fcf-future-source-header.mjs'
import {syntheticFcfRaw} from './fcf-release-test-fixture.mjs'
import {waitForFcfInventorySourceSlot} from './fcf-inventory-source-coordination.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {readFcfFutureSourceStagingArtifact,auditFcfFutureSourceOffline} from './fcf-missing-inventory-evidence.mjs'
import {readFcfFutureSourceCompletedChildArtifact,buildFcfFutureSourceFinalReceipt} from './fcf-future-source-admission.mjs'
export const g1Steps=['Capture missing target inventory','Retain complete target inventory','Audit retained target inventory offline','Retain target inventory offline audit']
const rawBundle=x=>Object.fromEntries(['zipBytes','artifact','run','jobs','expected'].map(k=>[k,x[k]]))
const documentCache=new Map();let postFailureScenario=0
export function g1Documents({supplemental=false}={}){
 if(documentCache.has(supplemental))return new Map(documentCache.get(supplemental))
 const slug='es-ct-segona-g1',kept=new Map(['4109388','4109404'].map(id=>[id,Buffer.concat([readFileSync(join(process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR,`fcf-missing-inventory-diagnostic-${slug}-39238757730-1`,`acta-${id}.html`)),Buffer.from('\n<!-- TEST ONLY fresh presentation -->')])]))
 if(supplemental)kept.set('4109409',execFileSync('unzip',['-p',join(process.env.FCF_G1_POST_FAILURE_EVIDENCE_DIR,'get-0008.zip'),'acta-4109409.html']))
 const s=sixTestSchedule([...kept].map(([id,bytes])=>deriveFcfFutureInventoryHeader({targetSlug:slug,id,bytes,...(supplemental?{protocol:'future-g1-after-failed-g1-v1'}:{})}))),assigned=new Map()
 for(const [r,rows]of s.rounds.entries())for(const f of rows)if(f.id)assigned.set(f.id,{...f,round:r+1})
 const rest=s.rounds.flatMap((rows,r)=>rows.filter(f=>!f.id).map(f=>({...f,round:r+1})))
 const docs=new Map(Array.from({length:240},(_,i)=>{const id=String(4109388+i),f=assigned.get(id)??rest.shift();return [id,kept.get(id)??Buffer.from(syntheticFcfRaw({id,slug,round:f.round,home:s.clubs[f.pair[0]],away:s.clubs[f.pair[1]],played:f.round===4,nativePlayers:true}))]}))
 documentCache.set(supplemental,docs);return new Map(docs)
}
export function g1Bundle({manifest,entries,jobName='missing-inventory-g1',jobId='1555',artifactId='1898',name,steps=g1Steps,terminal=false}){
 const body=entries?entries.find(e=>e.name==='manifest.json').body:Buffer.from(JSON.stringify(manifest)),m=metadata({bytes:zip(entries??[{name:'manifest.json',body}]),name,jobName,jobId,artifactId,steps,run:terminal?'completed':'in_progress'})
 m.expected.manifestSha256=entries?sha(entries.find(e=>e.name==='manifest.json').body):sha(body)
 m.expected.runId='124';m.expected.sourceCommit='b'.repeat(40);m.run.id=124;m.run.head_sha='b'.repeat(40);m.artifact.workflow_run.id=124;m.artifact.workflow_run.head_sha='b'.repeat(40)
 for(const j of m.jobs){j.run_id=124;j.head_sha='b'.repeat(40)}
 return rawBundle(m)
}
export async function g1CaptureFixture(t,{postFailure}={}){
 const history=postFailure??await postG9AccountingWire(t,'diagnostic'),accounting=(postFailure?readFcfPostG1Accounting:readFcfPostG9Accounting)(history),now=history.now+1000+(postFailure?++postFailureScenario*1000:0),ruleset=postFailure?JSON.parse(history.latest.claim.claimBytes).rulesetSnapshot.ruleset:history.latest.claim.rulesets[0],snapshot=snapshotFcfInventoryRuleset({ruleset,checkedUTC:new Date(now).toISOString(),now}),plan=(postFailure?buildFcfG1PostFailureSourcePlan:buildFcfG1SourceContinuationPlan)({sourceCommit:'b'.repeat(40),accountingProof:accounting,rulesetSnapshotSha256:hash(snapshot),now}),claim=claimFixture(plan)
 Object.assign(claim.execution,{sourceCommit:plan.sourceCommit,runId:'124'});Object.assign(claim.expected,{sourceCommit:plan.sourceCommit,runId:'124',claimCommit:'c'.repeat(40),rulesetId:String(ruleset.id)})
 Object.assign(claim.claim,{schemaVersion:5,kind:'fcf-future-source-execution-claim',sourceCommit:plan.sourceCommit,runId:'124',rulesetSnapshot:snapshot,claimedUTC:new Date(now+1000).toISOString(),maximumSourceGETs:478,accountingSha256:hash(plan.accountingBinding),priorSourceGETs:plan.priorSourceGETs,maximumNewSourceGETs:240,plannedCumulativeSourceGETs:plan.plannedCumulativeSourceGETs})
 claim.claimBytes=Buffer.from(JSON.stringify(claim.claim));claim.rulesets=[ruleset];claim.now=now+2000;claim.ref.ref=fcfFutureSourceClaimRef(plan);claim.ref.object.sha='c'.repeat(40)
 const blobSha=createHash('sha1').update(`blob ${claim.claimBytes.length}\0`).update(claim.claimBytes).digest('hex')
 Object.assign(claim.claimCommit.commit,{sha:'c'.repeat(40),parents:[{sha:plan.sourceCommit}],tree:{sha:'d'.repeat(40)}});claim.claimCommit.tree.sha='d'.repeat(40);claim.claimCommit.tree.tree[0].sha=blobSha;Object.assign(claim.claimCommit.blob,{sha:blobSha,size:claim.claimBytes.length,content:claim.claimBytes.toString('base64')});claim.expected.claimJsonSha256=sha(claim.claimBytes)
 const claimProof=readFcfInventoryExecutionClaim(claim),manifest={schemaVersion:4,kind:'fcf-future-source-consumed',planSha256:plan.planSha256,claimRef:claimProof.claimRef,claimCommit:claimProof.claimCommit,claimJsonSha256:claimProof.claimJsonSha256,seedBinding:null,sourceCommit:plan.sourceCommit,repository:claim.execution.repository,workflow:claim.execution.workflow,runId:'124',runAttempt:'1',jobId:'1456',consumedUTC:new Date(claim.now).toISOString()},consumption=g1Bundle({manifest,jobName:'missing-inventory-consume',jobId:'1456',artifactId:'1789',name:'fcf-inventory-consumption-124-1',steps:['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption']}),consumptionProof=readFcfInventoryConsumptionArtifact({...consumption,claimProof,now:claim.now})
 const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-g1-source-')));t.after(()=>rmSync(root,{recursive:true,force:true}));let time=claim.now
 const calls=[],f={history,plan,claimWire:claim,consumptionWire:consumption,claimProof,consumptionProof,targetSlug:'es-ct-segona-g1',root,execution:{...claim.execution,jobId:'1555'},clock:()=>time,pause:async ms=>{time+=ms},calls,advance:ms=>{time+=ms}}
 const documents=g1Documents({supplemental:!!postFailure});f.request=async(url,init)=>{calls.push({url,init});time+=5;return new Response(documents.get(url.split('/').at(-1)))}
 f.sourceSlotProof=await waitForFcfInventorySourceSlot({execution:{...claim.execution,startedUTC:new Date(time).toISOString()},listRuns:async()=>({total_count:0,workflow_runs:[]}),listJobs:async()=>({total_count:0,jobs:[]}),clock:f.clock,pause:f.pause})
 return f
}
export async function g1AdmissionWire(t,options){
 const f=await g1CaptureFixture(t,options),r=await collectFcfMissingInventoryChild(f)
 if(r.status!=='inventory-complete')throw Error('TEST ONLY G1 capture failed: '+r.stopReason)
 const entries=readdirSync(r.outputDirectory).map(name=>({name,body:readFileSync(join(r.outputDirectory,name))})),m=JSON.parse(entries.find(e=>e.name==='manifest.json').body),inventory=g1Bundle({entries,name:'fcf-missing-inventory-es-ct-segona-g1-124-1'})
 Object.assign(inventory.expected,{planSha256:f.plan.planSha256,childPlanSha256:m.childPlanSha256})
 const scope={plan:f.plan,consumptionProof:f.consumptionProof,now:f.clock()},staged=readFcfFutureSourceStagingArtifact({...inventory,...scope,targetSlug:f.targetSlug}),auditManifest=auditFcfFutureSourceOffline({stagingProof:staged,policyHashes:f.plan.policyHashes,now:f.clock()}),audit=g1Bundle({manifest:auditManifest,name:'fcf-missing-inventory-audit-es-ct-segona-g1-124-1',artifactId:'1899'}),child=readFcfFutureSourceCompletedChildArtifact({...scope,inventory,audit}),finalManifest=buildFcfFutureSourceFinalReceipt({...scope,claimProof:f.claimProof,childRecords:[child],execution:{...f.execution,jobId:'1777'},now:f.clock()+1}),finalReceipt=g1Bundle({manifest:finalManifest,name:'fcf-missing-inventory-final-124-1',jobName:'missing-inventory-receipt',jobId:'1777',artifactId:'1999',steps:['Retain final FCF inventory receipt'],terminal:true})
 const wire={history:f.history,plan:f.plan,claim:Object.fromEntries(['execution','ref','claimCommit','claimBytes','rulesets','expected'].map(k=>[k,f.claimWire[k]])),consumption:f.consumptionWire,child:{inventory,audit},finalReceipt,now:f.clock()+2}
 for(const b of [wire.consumption,inventory,audit]){b.run.status='completed';b.run.conclusion='success'}
 return {wire,f,result:r}
}

import {serialize,deserialize} from 'node:v8'
const copy=x=>deserialize(serialize(x)),repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
export function g1HistoryReferences(raw){
 const p=raw.prior,g=raw.latest,claim=c=>({execution:c.execution,expected:c.expected}),b=x=>x.expected
 if(g.plan.preset==='future-g1-after-g9-v1')return {prior:g1HistoryReferences(p),latest:{plan:g.plan,claim:claim(g.claim),consumption:b(g.consumption),child:{diagnostic:b(g.child.diagnostic)},finalReceipt:b(g.finalReceipt)}}
 const prior={prior:JSON.parse(readFileSync(join(process.env.FCF_POST_SIX_EVIDENCE_DIR,'approval-manifest.json'))).history,latest:{plan:p.latest.plan,claim:claim(p.latest.claim),consumption:b(p.latest.consumption),children:p.latest.children.map(b),finalReceipt:b(p.latest.finalReceipt)}}
 const child=g.child.unstarted?{unstarted:g.child.unstarted.expected}:g.child.diagnostic?{diagnostic:b(g.child.diagnostic)}:{inventory:b(g.child.inventory),...(g.child.audit?{audit:b(g.child.audit)}:{})}
 return {prior,latest:{plan:g.plan,claim:claim(g.claim),consumption:b(g.consumption),child,finalReceipt:b(g.finalReceipt)}}
}
export async function g1TransportFixture(t,{capture=true,postFailure}={}){
 const base=capture?await g1AdmissionWire(t,{postFailure}):await (async()=>{const f=await g1CaptureFixture(t,{postFailure});return {f,wire:{history:f.history,plan:f.plan,claim:Object.fromEntries(['execution','ref','claimCommit','claimBytes','rulesets','expected'].map(k=>[k,f.claimWire[k]])),consumption:f.consumptionWire,now:f.clock()}}})()
 const {wire,f}=base,map=new Map(),jobs=new Map(),runs=new Map(),put=(p,v)=>map.set(repo+p,copy(v))
 function visit(v){
  if(!v||typeof v!=='object'||Buffer.isBuffer(v))return
  if(v.zipBytes&&v.expected){put(`actions/artifacts/${v.expected.artifactId}`,v.artifact);put(`actions/artifacts/${v.expected.artifactId}/zip`,v.zipBytes)}
  if(v.run&&v.jobs){const id=String(v.run.id),key=`${id}/attempts/${v.run.run_attempt}`,rows=jobs.get(key)??new Map();for(const j of v.jobs)rows.set(j.id,j);jobs.set(key,rows);runs.set(id,v.run)}
  if(v.claimCommit&&v.ref){put(`git/ref/${v.ref.ref.slice(5)}`,v.ref);for(const [k,path]of [['commit','commits'],['tree','trees'],['blob','blobs']])put(`git/${path}/${v.claimCommit[k].sha}`,v.claimCommit[k]);for(const r of v.rulesets)put(`rulesets/${r.id}`,r)}
  Object.values(v).forEach(visit)
 }
 function addWire(value){visit(value);for(const [id,r]of runs)put(`actions/runs/${id}`,r);for(const [key,rows]of jobs)put(`actions/runs/${key}/jobs?per_page=100&page=1`,{total_count:rows.size,jobs:[...rows.values()]})}
 addWire(wire)
 const history=g1HistoryReferences(wire.history),source=wire.child?{protocol:wire.plan.preset,history,plan:wire.plan,claim:{execution:wire.claim.execution,expected:wire.claim.expected},consumption:wire.consumption.expected,child:{inventory:wire.child.inventory.expected,audit:wire.child.audit.expected},finalReceipt:wire.finalReceipt.expected}:null,approval={schemaVersion:postFailure?6:5,kind:postFailure?'fcf-g1-post-failure-source-approval':'fcf-g1-source-continuation-approval',sourceCommit:wire.plan.sourceCommit,plan:wire.plan,history,rulesetId:f.claimWire.expected.rulesetId,rulesetSnapshot:JSON.parse(wire.claim.claimBytes).rulesetSnapshot},approvalBytes=Buffer.from(JSON.stringify(approval)),calls=[]
 const github=async(path,binary=false)=>{calls.push([path,binary]);if(!path.startsWith(repo)||binary!==path.endsWith('/zip'))throw Error('unsafe TEST ONLY GET');if(!map.has(path))throw Error('Unplanned TEST ONLY GET '+path);return copy(map.get(path))}
 return {wire,f,map,source,approval,approvalBytes,history,calls,github,repo,addWire}
}
export async function g1ActionsFixture(t,options){
 const f=await g1TransportFixture(t,options),root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-g1-actions-')));t.after(()=>rmSync(root,{recursive:true,force:true}))
 f.root=root;f.time=f.wire.now;f.sourceCalls=[]
 const sourceCommit=f.wire.plan.sourceCommit,job=(id,name,steps,status='completed',conclusion='success')=>({id,name,run_id:124,run_attempt:1,head_sha:sourceCommit,status,conclusion,steps:steps.map(name=>({name,status:'completed',conclusion:'success'}))})
 f.approvalJob=job(1455,'missing-inventory-approval',['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval']);f.consumeJob=job(1456,'missing-inventory-consume',['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption']);f.captureJob=job(1555,'missing-inventory-g1',g1Steps);f.receiptJob=job(1777,'missing-inventory-receipt',['Retain final FCF inventory receipt'],'in_progress',null)
 f.jobs=[f.approvalJob,f.consumeJob,f.captureJob,f.receiptJob]
 f.run={...(f.wire.finalReceipt?.run??{id:124,repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:sourceCommit,run_attempt:1}),status:'in_progress',conclusion:null,run_started_at:new Date(f.time-1000).toISOString()}
 f.addArtifact=b=>{f.map.set(f.repo+`actions/artifacts/${b.expected.artifactId}`,b.artifact);f.map.set(f.repo+`actions/artifacts/${b.expected.artifactId}/zip`,b.zipBytes)}
 const approvalArtifact=g1Bundle({manifest:f.approval,name:'fcf-inventory-approval-124-1',jobName:'missing-inventory-approval',jobId:'1455',artifactId:'1788',steps:['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval']});f.addArtifact(approvalArtifact)
 f.env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'124',GITHUB_SHA:sourceCommit,GITHUB_JOB:'missing-inventory-consume',FCF_INVENTORY_PRESET:f.wire.plan.preset,FCF_APPROVAL_ID:'1788',FCF_APPROVAL_DIGEST:approvalArtifact.expected.artifactDigest,FCF_APPROVAL_MANIFEST_SHA:sha(f.approvalBytes),FCF_INVENTORY_ASSET_ID:'22',FCF_INVENTORY_ASSET_SHA:'sha256:'+sha(f.approvalBytes),FCF_CONSUMPTION_ID:f.wire.consumption.expected.artifactId,FCF_CONSUMPTION_DIGEST:f.wire.consumption.expected.artifactDigest,FCF_CONSUMPTION_MANIFEST_SHA:f.wire.consumption.expected.manifestSha256}
 const get=f.github
 f.github=async(path,binary=false)=>{
  const p=path.slice(f.repo.length);let result
  if(p==='actions/runs/124')result=f.run
  else if(p==='actions/runs/124/attempts/1/jobs?per_page=100&page=1')result={total_count:f.jobs.length,jobs:f.jobs}
  else if(p.startsWith('actions/workflows/'))result={total_count:0,workflow_runs:[]}
  else if(p==='releases?per_page=100&page=1')result=[{id:11,tag_name:'fcf-inventory-staging-v1',draft:true}]
  else if(p==='releases/11/assets?per_page=100&page=1')result=[{id:22,state:'uploaded',size:f.approvalBytes.length}]
  else if(p==='releases/assets/22')result=f.approvalBytes
  else return get(path,binary)
  f.calls.push([path,binary]);return copy(result)
 }
 f.clock=()=>f.time;f.pause=async ms=>{f.time+=ms};f.sourceFetch=async(url,init)=>{f.sourceCalls.push({url,init});f.time+=5;return new Response('TEST ONLY G1 refusal',{status:403})}
 f.base=()=>({env:f.env,root:f.root,github:f.github,clock:f.clock,pause:f.pause,sourceFetch:f.sourceFetch})
 return f
}
