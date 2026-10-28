// One exact historical source audit OUTSIDE the protected missing-only budget.
// Seven real GETs remain acknowledged. Never a zero-execution/reuse/native proof.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {getFcfG1RemainderParent} from './fcf-g1-remainder-parent.mjs'
import {readInventoryZip} from './fcf-missing-inventory-artifact.mjs'
const states=new WeakMap(),sha=b=>createHash('sha256').update(b).digest('hex'),canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x),hash=v=>sha(canonical(v)),same=(a,b)=>canonical(a)===canonical(b)
const need=(ok,m)=>{if(!ok)throw Error('FCF_G1_PREBUDGET_HOLD: '+m)},closed=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join(',')===keys.slice().sort().join(',')
const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',referenceSha='16e79543d62fe6ed7b1abfcb7c9d29ae7884d0d8e04b6386926ecd4096b5a680',pick=(v,keys)=>Object.fromEntries(keys.map(k=>[k,v?.[k]])),instant=v=>Date.parse(v),end=v=>instant(v)+999
function reference(){const raw=readFileSync(new URL('./fcf-g1-prebudget-audit-reference.json',import.meta.url));need(sha(raw)===referenceSha,'fixed reference bytes drift');return JSON.parse(raw)}
const actor=a=>pick(a,['id','login','type'])
function runView(r){return {...pick(r,['id','path','head_sha','head_branch','event','run_attempt','status','conclusion','created_at','updated_at','run_started_at','url','html_url']),repository:r?.repository?.full_name,headRepository:r?.head_repository?.full_name,actor:actor(r?.actor),triggeringActor:actor(r?.triggering_actor)}}
function jobsView(jobs){need(Array.isArray(jobs)&&jobs.length===1,'exact one historical job required');return jobs.map(j=>({...pick(j,['id','name','run_id','run_attempt','head_sha','head_branch','status','conclusion','created_at','started_at','completed_at']),steps:Array.isArray(j.steps)?j.steps.map(s=>pick(s,['name','number','status','conclusion','started_at','completed_at'])):null}))}
const artifactView=a=>pick(a,['id','name','digest','expired','size_in_bytes','created_at','updated_at','workflow_run'])
function parentAnchor(parentProof,p){
 const d=getFcfG1RemainderParent(parentProof),refs=d.sourceReferences,a=refs?.prior?.prior?.prior?.prior?.accounting,plan=a?.plan,{planSha256,...body}=plan??{}
 need(d.kind==='fcf-g1-remainder-parent'&&d.accounting.priorSourceGETs===83&&d.accounting.maximumCumulativeSourceGETs===478&&d.admissible===false&&d.nativeAdmission===false&&d.activationEligible===false,'private fixed83 parent scope required')
 need(hash({source:refs.prior,parentRecords:refs.latest})===p.sourceReferencesSha256&&planSha256===p.anchor.planSha256&&hash(body)===planSha256&&plan.createdUTC===p.anchor.planCreatedUTC&&plan.sourceCommit===p.anchor.sourceCommit&&plan.maximumSourceGETs===477&&same(a.claim,p.anchor.claim)&&same(plan.seedBinding,p.anchor.seedBinding),'exact protected plan/claim/seed anchor differs')
 need(same(plan.children.map(c=>({target:c.targetSlug,fetch:c.fetchIds.length,maximum:c.maximumSourceGETs,reuse:c.reuse.map(r=>r.id)})),[{target:'es-ct-segona-g1',fetch:239,maximum:239,reuse:['4109388']},{target:'es-ct-tercera-g9',fetch:238,maximum:238,reuse:['4118352','4118358']}]),'original477 NEW missing plus3 seed reuse required')
}
/** Exactly five distinct repository GETs. Parent's already authenticated fixed
 * original anchors are checked, not fetched/replayed again. No clock override. */
export async function readFcfG1PrebudgetAudit(input){
 need(closed(input,['parentProof','github']),'closed parentProof/github fields required');need(typeof input.github==='function','actual repository GET adapter required')
 const p=reference();parentAnchor(input.parentProof,p)
 const get=async(path,binary=false)=>{const v=await input.github(repo+path,binary);if(binary){need(Buffer.isBuffer(v)&&v.length===p.artifact.size_in_bytes,'exact bounded ZIP required');return Buffer.from(v)}need(v&&typeof v==='object'&&Buffer.byteLength(JSON.stringify(v))<=262144,'bounded actual metadata required');return structuredClone(v)}
 const run=await get('actions/runs/39082161817');need(same(runView(run),p.run),'exact historical run identity required')
 const jobPage=await get('actions/runs/39082161817/attempts/1/jobs?per_page=100&page=1');need(closed(jobPage,['total_count','jobs'])&&jobPage.total_count===1&&same(jobsView(jobPage.jobs),p.jobs),'exact historical job/step inventory required')
 const inventory=await get('actions/runs/39082161817/artifacts?per_page=100&page=1');need(closed(inventory,['total_count','artifacts'])&&inventory.total_count===1&&Array.isArray(inventory.artifacts)&&inventory.artifacts.length===1&&same(artifactView(inventory.artifacts[0]),p.artifact),'exact historical artifact membership required')
 const artifact=await get('actions/artifacts/12123222378');need(same(artifactView(artifact),p.artifact),'exact historical artifact identity required')
 const zip=await get('actions/artifacts/12123222378/zip',true);need('sha256:'+sha(zip)===p.artifact.digest,'fixed historical ZIP digest differs')
 const files=readInventoryZip({zipBytes:zip,artifact,expected:{artifactDigest:p.artifact.digest,manifestSha256:p.manifestSha256},members:{'manifest.json':8192,...Object.fromEntries(p.documents.map(d=>['acta-'+d.id+'.html',d.bytes]))}}),names=['manifest.json',...p.documents.map(d=>'acta-'+d.id+'.html')];need(files.size===8&&same([...files.keys()].sort(),names.sort()),'closed original eight-member inventory required')
 const raw=files.get('manifest.json');need(sha(raw)===p.manifestSha256,'original seven-report manifest differs');const m=JSON.parse(raw),sourceStep=p.jobs[0].steps.find(s=>s.name==='Zajemi samo sedem javnih zapisnikov'),uploadStep=p.jobs[0].steps.find(s=>s.name==='Shrani samo lastne javne dokaze')
 need(m.schemaVersion===1&&m.audit==='fixed-seven-fcf-public-reports'&&m.sourceCommit===p.run.head_sha&&m.runId==='39082161817'&&m.runAttempt==='1'&&m.budget===7&&m.attemptedCount===7&&m.state==='complete'&&m.reason===null&&Array.isArray(m.files)&&m.files.length===7,'actual complete seven-request audit required')
 need(instant(m.startedUTC)>=instant(sourceStep.started_at)&&instant(m.endedUTC)<=end(sourceStep.completed_at)&&instant(m.endedUTC)<instant(p.anchor.planCreatedUTC)&&instant(m.endedUTC)<instant(p.anchor.claimedUTC)&&instant(p.artifact.created_at)>=instant(uploadStep.started_at)&&instant(p.artifact.updated_at)<=end(uploadStep.completed_at)&&instant(p.run.updated_at)<instant(p.anchor.planCreatedUTC),'exact pre-authorization source/upload chronology required')
 for(const [i,d]of p.documents.entries()){const f=m.files[i],bytes=files.get('acta-'+d.id+'.html'),url='https://www.fcf.cat/ca/competicio/acta/'+d.id;need(f.id===d.id&&f.artifactFile==='acta-'+d.id+'.html'&&f.requestedURL===url&&f.status==='captured'&&f.identity==='fixed-no-redirect-http-receipt'&&f.httpStatus===200&&f.byteCount===d.bytes&&f.sha256===d.sha256&&bytes.length===d.bytes&&sha(bytes)===d.sha256&&f.attemptUTC===d.attemptUTC&&f.captureUTC===d.captureUTC&&instant(m.startedUTC)<=instant(f.attemptUTC)&&instant(f.attemptUTC)<=instant(f.captureUTC)&&instant(f.captureUTC)<=instant(m.endedUTC),'exact historical raw body/receipt required')}
 parentAnchor(input.parentProof,p)
 const binding={kind:'fcf-fixed-prebudget-source-scope',runId:'39082161817',sourceCommit:p.run.head_sha,workflow:p.run.path,runAttempt:'1',artifactId:'12123222378',artifactDigest:p.artifact.digest,manifestSha256:p.manifestSha256,anchorPlanSha256:p.anchor.planSha256,anchorClaimCommit:p.anchor.claim.expected.claimCommit,historicalSourceGETs:7,batchSourceGETs:0,admissible:false,nativeAdmission:false,activationEligible:false}
 const proof=Object.freeze({kind:'fcf-fixed-prebudget-audit-proof'});states.set(proof,{parentProof:input.parentProof,run:structuredClone(p.run),jobs:structuredClone(p.jobs),binding});return proof
}
/** Caller supplies fresh fully fetched historical run and ALL attempt1 jobs.
 * This scope witness is never a zero-execution proof or an updated total. */
export function assertFcfG1PrebudgetHistory(input){
 need(closed(input,['proof','run','jobs']),'closed proof/run/jobs fields required');const s=states.get(input.proof);need(s,'private reader-issued prebudget proof required');parentAnchor(s.parentProof,reference())
 need(same(runView(input.run),s.run)&&same(jobsView(input.jobs),s.jobs),'fresh historical run/job scope differs');return structuredClone(s.binding)
}
