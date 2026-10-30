// Accounting and scope foundations only. No capture, source transport or CLI.
// Historical minimum expenditure is deliberately not a fresh cumulative budget.
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {fussballFreshPairProfile,readFussballFreshBudget,getFussballFreshBudget} from './fussball-fresh-pair.mjs'

const pins=JSON.parse(readFileSync(new URL('./fussball-baden-completed-stages.json',import.meta.url)))
const history=JSON.parse(readFileSync(new URL('./fussball-fresh-pair-history.json',import.meta.url)))
const profile=fussballFreshPairProfile(),prefix=`repos/${pins.repository}/`,states=new WeakMap(),MiB=1024*1024
const sha=b=>createHash('sha256').update(b).digest('hex')
const parse=b=>JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(b))
const need=(ok,code)=>{if(!ok)throw Object.assign(Error('BADEN_R10_'+code),{code:'BADEN_R10_'+code,dataHold:true})}
const closed=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&same(Object.keys(v).sort(),keys.slice().sort())
const flags={operational:false,sourceOnly:true,currentAuthority:false,nativeAdmission:false,activationEligible:false}
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const copyFiles=files=>new Map([...files].map(([name,bytes])=>[name,Buffer.from(bytes)]))

/** Fixed intended scope, not an execution descriptor or a permission to send GETs.
 * The retained archive is a locator until a separate reader replays its originals.
 */
export function fussballBadenR10FoundationDescriptor(){
 return {
  version:10,kind:'baden-r10-current-only-nonoperational-foundation',repository:pins.repository,
  current:structuredClone(profile.current),reservation:{current:780,archive:0,totalRequestCap:5000},
  retainedArchive:{runId:String(pins.archive.run.id),head:pins.archive.run.head_sha,
   artifactId:pins.archive.artifact.id,digest:pins.archive.artifact.digest,
   manifestSha256:pins.archive.manifestSha256,originalsValidated:false},
  newCurrentExecution:null,...flags,
 }
}

function journal(raw){
 need(Buffer.isBuffer(raw)&&raw.length<=16*MiB,'JOURNAL_BOUND')
 need(raw.length===0||raw.at(-1)===10,'JOURNAL_TRUNCATED')
 return raw.length?new TextDecoder('utf8',{fatal:true}).decode(raw).trimEnd().split('\n').map(JSON.parse):[]
}

/** Pure DATA inspection for future reconciliation and partial-capture retention.
 * Every persisted intent is charged, even if its outcome never arrived. This
 * never issues authority: callers still have to authenticate the original bytes.
 * Empty/missing journals cannot prove a source step never executed.
 */
export function inspectBadenR10AttemptJournals(files){
 const result={known:false,chargedAttempts:null,settledAttempts:null,successfulAttempts:null,
  failedAttempts:null,pendingAttempts:null,requests:null,reason:'MISSING_JOURNALS'}
 if(!(files instanceof Map)||!files.has('attempts.jsonl'))return result
 try{
  const intents=journal(files.get('attempts.jsonl'))
  for(const [i,a]of intents.entries())need(closed(a,['number','url','kind','startedAt','status','error'])&&
   a.number===i+1&&typeof a.url==='string'&&a.url.length>0&&typeof a.kind==='string'&&a.kind.length>0&&
   a.startedAt===null&&a.status==='pending'&&a.error===null,'INTENT_IDENTITY')
  if(!files.has('outcomes.jsonl'))return intents.length?{...result,chargedAttempts:intents.length,pendingAttempts:intents.length}:result
  result.chargedAttempts=intents.length
  const outcomes=journal(files.get('outcomes.jsonl'))
  need(outcomes.length<=intents.length,'OUTCOME_WITHOUT_INTENT')
  for(const [i,a]of outcomes.entries()){
   const intent=intents[i]
   need(a.number===intent.number&&a.url===intent.url&&a.kind===intent.kind&&
    typeof a.startedAt==='string'&&Number.isFinite(Date.parse(a.startedAt))&&
    new Date(Date.parse(a.startedAt)).toISOString()===a.startedAt&&
    (a.status==='success'&&a.error===null&&a.httpStatus===200||a.status==='failed'&&typeof a.error==='string'&&a.error.length>0),
   'OUTCOME_IDENTITY')
  }
  Object.assign(result,{settledAttempts:outcomes.length,successfulAttempts:outcomes.filter(a=>a.status==='success').length,
   failedAttempts:outcomes.filter(a=>a.status==='failed').length,pendingAttempts:intents.length-outcomes.length})
  if(intents.length===0){result.reason='EMPTY_JOURNALS';return result}
  if(result.pendingAttempts){result.reason='UNSETTLED_ATTEMPTS';return result}
  return {...result,known:true,requests:intents.length,reason:null}
 }catch{return {...result,reason:'INVALID_JOURNALS'}}
}

const runProjection=r=>({...Object.fromEntries(['id','run_attempt','head_sha','head_branch','path','event','status','conclusion','created_at'].map(k=>[k,r?.[k]])),
 repository:{full_name:r?.repository?.full_name},head_repository:{full_name:r?.head_repository?.full_name},
 ...Object.fromEntries(['actor','triggering_actor'].map(k=>[k,Object.fromEntries(['id','login','type'].map(f=>[f,r?.[k]?.[f]]))]))})
function jobsProjection(v){
 need(Number.isSafeInteger(v?.total_count)&&Array.isArray(v.jobs)&&v.jobs.length===v.total_count&&
  v.jobs.every(j=>Number.isSafeInteger(j?.id)&&j.id>0&&Array.isArray(j.steps)&&j.steps.every(s=>s&&typeof s==='object'))&&
  new Set(v.jobs.map(j=>j.id)).size===v.total_count,'RUN_JOBS')
 return {total_count:v.total_count,jobs:v.jobs.map(j=>({...Object.fromEntries(['id','run_id','run_attempt','head_sha','name','status','conclusion'].map(k=>[k,j[k]])),
  steps:j.steps.map(s=>Object.fromEntries(['number','name','status','conclusion'].map(k=>[k,s[k]])))}))}
}
function artifactIdentity(a,run){
 need(['id','name','size_in_bytes','digest'].every(k=>a?.[k]===pins.current.artifact[k])&&
  a.expired===false&&Date.parse(a.expires_at)>Date.now()&&a.workflow_run?.id===run.id&&
  a.workflow_run.head_sha===run.head_sha&&a.workflow_run.head_branch==='main','ARTIFACT')
}
// Extract only the accounting leaves. Pinned complete ZIP bytes remain retained
// by the caller; no historical current semantics or new freshness are inferred.
function accountingLeaves(bytes){
 const directory=mkdtempSync(join(tmpdir(),'baden-r10-accounting-')),zip=join(directory,'r9.zip')
 try{
  writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',timeout:60000,maxBuffer:2*MiB}).trimEnd().split('\n')
  const details=execFileSync('unzip',['-Z','-l',zip],{encoding:'utf8',timeout:60000,maxBuffer:3*MiB}).split('\n')
  need(names.length>0&&names.length<=4096&&new Set(names).size===names.length,'ZIP_INVENTORY')
  for(const name of names){
   const rows=details.filter(s=>s.endsWith(' '+name))
   need(/^(?:pair-manifest\.json|budget\.json|guard-initial\.json|history\/(?:R7|R8)\/(?:run\.json|jobs\.json|artifact\.json|artifact\.zip)|current\/(?:manifest\.json|attempts\.jsonl|outcomes\.jsonl|progress\.jsonl|result-commitment\.json|documents\/[a-f0-9]{64}\.(?:html|css|woff)))$/.test(name)&&rows.length===1&&/^-[rwxstST-]{9}\s/.test(rows[0]),'ZIP_PATH')
  }
  const files=new Map()
  for(const name of ['pair-manifest.json','budget.json','current/manifest.json','current/attempts.jsonl','current/outcomes.jsonl']){
   need(names.includes(name),'ACCOUNTING_LEAF_MISSING')
   const b=execFileSync('unzip',['-p',zip,name],{timeout:60000,maxBuffer:16*MiB+1})
   need(b.length<=16*MiB,'ACCOUNTING_LEAF_BOUND');files.set(name,b)
  }
  return files
 }finally{rmSync(directory,{recursive:true,force:true})}
}

function oldCurrent(){
 const createdAt=pins.currentCreatedAt,freshUntil=pins.currentFreshUntil
 return {runId:String(pins.current.run.id),head:pins.current.run.head_sha,createdAt,freshUntil,
  freshness:Date.now()>=Date.parse(freshUntil)?'EXPIRED':'HISTORICAL_ONLY',currentAuthority:false}
}

/** Authenticates the existing 3020 receipt plus every R9 intent/outcome. This is
 * a historical lower bound, never the fresh B required for a 780 reservation.
 * Only the fixed own-repository GET adapter is supplied; no clock/counter pins.
 */
export async function readFussballBadenR10AccountingFoundation(input){
 need(closed(input,['github'])&&typeof input.github==='function','INPUT')
 const runPath=`actions/runs/${pins.current.run.id}`,jobsPath=runPath+'/attempts/1/jobs?per_page=100&page=1'
 const inventoryPath=runPath+'/artifacts?per_page=100&page=1',artifactPath=`actions/artifacts/${pins.current.artifact.id}`
 const allowed=new Set([runPath,jobsPath,inventoryPath,artifactPath,artifactPath+'/zip'])
 for(const p of history.records)for(const path of [`actions/runs/${p.run.id}`,`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100&page=1`,
  `actions/artifacts/${p.artifact.id}`,`actions/artifacts/${p.artifact.id}/zip`])allowed.add(path)
 const get=async(path,binary=false)=>{
  need(typeof path==='string'&&path.startsWith(prefix)&&allowed.has(path.slice(prefix.length)),'GET_SCOPE')
  let value;try{value=await input.github(path,binary)}catch{need(false,'GET_HOLD')}
  if(binary){need(Buffer.isBuffer(value)&&value.length<=100*MiB,'ZIP_BOUND');return Buffer.from(value)}
  return structuredClone(value)
 },api=(path,binary=false)=>get(prefix+path,binary)
 const run=await api(runPath),jobs=await api(jobsPath)
 need(same(runProjection(run),pins.current.run)&&same(jobsProjection(jobs),pins.current.jobs)&&
  Date.parse(run.updated_at)<=Date.now(),'RUN_JOBS')
 const inventory=await api(inventoryPath),artifact=await api(artifactPath)
 need(inventory?.total_count===1&&inventory.artifacts?.length===1&&same(inventory.artifacts[0],artifact),'ARTIFACT_INVENTORY')
 artifactIdentity(artifact,run)
 const bytes=await api(artifactPath+'/zip',true)
 need(bytes.length===artifact.size_in_bytes&&'sha256:'+sha(bytes)===artifact.digest,'ZIP_DIGEST')
 const budget=getFussballFreshBudget(await readFussballFreshBudget({github:get}))
 need(budget.receipt.priorRequests===3020&&budget.receipt.totalRequestCap===5000&&budget.receipt.oldCurrentAuthority===false,'HISTORICAL_BUDGET')
 const files=accountingLeaves(bytes),pair=parse(files.get('pair-manifest.json')),manifest=parse(files.get('current/manifest.json'))
 need(sha(files.get('pair-manifest.json'))===pins.pairManifestSha256&&
  sha(files.get('current/manifest.json'))===pins.current.manifestSha256,'MANIFEST_PINS')
 need(pair.success===false&&pair.error?.phase==='BETWEEN_STAGES'&&pair.stages.archive===null&&
  pair.guards.between===null&&pair.guards.final===null&&same(pair.budget,budget.receipt)&&same(parse(files.get('budget.json')),budget.receipt)&&
  same(pair.execution,{runId:String(run.id),head:run.head_sha,repository:pins.repository,workflow:run.path,runAttempt:1}),
 'R9_OUTER_CHECKPOINT')
 const journals=new Map(['attempts.jsonl','outcomes.jsonl'].map(n=>[n,files.get('current/'+n)]))
 const r9=inspectBadenR10AttemptJournals(journals)
 need(r9.known&&r9.requests===587&&r9.successfulAttempts===584&&r9.failedAttempts===3&&r9.pendingAttempts===0&&
  sha(journals.get('attempts.jsonl'))===manifest.intentsSha256&&sha(journals.get('outcomes.jsonl'))===manifest.outcomesSha256&&
  same(journal(journals.get('outcomes.jsonl')),manifest.snapshot.attempts)&&manifest.snapshot.requests===r9.requests&&
  manifest.codeSha256===pins.currentCodeSha256&&manifest.createdAt===pins.currentCreatedAt&&manifest.success===true,
 'R9_ALL_ATTEMPTS')
 need(same(pair.accounting,{known:true,priorRequests:3020,currentRequests:587,archiveRequests:0,newRequests:587,cumulativeRequests:3607,totalRequestCap:5000}),
 'R9_ACCOUNTING')
 const again=getFussballFreshBudget(await readFussballFreshBudget({github:get}))
 need(same(again.receipt,budget.receipt)&&same(await api(runPath),run)&&same(await api(jobsPath),jobs)&&
  same(await api(inventoryPath),inventory)&&same(await api(artifactPath),artifact),'LATE_DRIFT')
 artifactIdentity(artifact,run)
 const accounting={authenticatedMinimumSpent:3607,freshCumulativeRequests:null,freshAccountingKnown:false,totalRequestCap:5000,
  priorRequests:budget.receipt.priorRequests,r9,missingAuthority:'COMPLETE_LATER_EXECUTION_RECONCILIATION'}
 const proof=freeze({version:10,kind:'authenticated-baden-r10-historical-accounting-foundation',accounting,
  newCurrentExecution:null,...flags})
 states.set(proof,{originals:{r9:{zipBytes:Buffer.from(bytes),files},historicalBudgetFiles:budget.files},
  certificate:{historicalBudget:budget.receipt,r9:{run,jobs,artifact,inventory,
  pairManifestSha256:sha(files.get('pair-manifest.json')),manifestSha256:sha(files.get('current/manifest.json')),
  intentsSha256:sha(journals.get('attempts.jsonl')),outcomesSha256:sha(journals.get('outcomes.jsonl'))}}})
 return proof
}

export function getFussballBadenR10AccountingFoundation(proof){
 const state=states.get(proof);need(state,'PRIVATE_CAPABILITY')
 return {...structuredClone(proof),oldCurrent:oldCurrent(),retainedArchive:fussballBadenR10FoundationDescriptor().retainedArchive,
  originals:{r9:{zipBytes:Buffer.from(state.originals.r9.zipBytes),files:copyFiles(state.originals.r9.files)},
   historicalBudgetFiles:copyFiles(state.originals.historicalBudgetFiles)},
  certificate:structuredClone(state.certificate)}
}
