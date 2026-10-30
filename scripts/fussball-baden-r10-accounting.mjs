// Fixed Baden research-ledger reconciliation. Own GitHub reads only; no CLI,
// provider transport, DB, capture, archive authority or source-operation grant.
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import {isDeepStrictEqual as same} from 'node:util'
import {readFussballBadenR10AccountingFoundation,getFussballBadenR10AccountingFoundation} from './fussball-baden-r10-foundation.mjs'
import {readBadenR10RuntimeVector} from './fussball-baden-r10-runtime-vector.mjs'
const policy=JSON.parse(readFileSync(new URL('./fussball-baden-r10-accounting.json',import.meta.url)))
const exclusions=JSON.parse(readFileSync(new URL('./fussball-baden-r10-exclusions.json',import.meta.url)))
const contentGroups=JSON.parse(readFileSync(new URL('./fussball-baden-r10-content-vectors.json',import.meta.url)))
const history=JSON.parse(readFileSync(new URL('./fussball-fresh-pair-history.json',import.meta.url)))
const prefix=`repos/${policy.repository}/`,states=new WeakMap(),MiB=1024*1024
const sha=b=>createHash('sha256').update(b).digest('hex')
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)
const parse=b=>JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(b))
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const copyFiles=files=>new Map([...files].map(([name,bytes])=>[name,Buffer.from(bytes)]))
const need=(ok,code)=>{if(!ok)throw Object.assign(Error('BADEN_R10_BUDGET_'+code),{code:'BADEN_R10_BUDGET_'+code,dataHold:true})}
const closed=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&same(Object.keys(v).sort(),keys.slice().sort())
const runProjection=r=>({...Object.fromEntries(['id','run_attempt','head_sha','head_branch','path','event','status','conclusion','created_at','display_title'].map(k=>[k,r?.[k]])),
 repository:{full_name:r?.repository?.full_name},head_repository:{full_name:r?.head_repository?.full_name},
 ...Object.fromEntries(['actor','triggering_actor'].map(k=>[k,Object.fromEntries(['id','login','type'].map(f=>[f,r?.[k]?.[f]]))]))})
function jobsProjection(v){
 need(Number.isSafeInteger(v?.total_count)&&v.total_count>=0&&v.total_count<=100&&Array.isArray(v.jobs)&&v.jobs.length===v.total_count&&
  new Set(v.jobs.map(j=>j?.id)).size===v.total_count&&v.jobs.every(j=>Number.isSafeInteger(j?.id)&&j.id>0&&Array.isArray(j.steps)&&j.steps.every(s=>s&&typeof s==='object')),'JOBS_INVENTORY')
 return {total_count:v.total_count,jobs:v.jobs.map(j=>({...Object.fromEntries(['id','run_id','run_attempt','head_sha','name','status','conclusion'].map(k=>[k,j[k]])),
  steps:j.steps.map(s=>Object.fromEntries(['number','name','status','conclusion'].map(k=>[k,s[k]])))}))}
}
function inventoryIdentity(r){need(Number.isSafeInteger(r?.id)&&r.id>0&&Number.isSafeInteger(r.run_attempt)&&r.run_attempt>=1&&r.run_attempt<=16&&
 /^[a-f0-9]{40}$/.test(r.head_sha??'')&&r.repository?.full_name===policy.repository&&r.head_repository?.full_name===policy.repository&&
 typeof r.path==='string'&&r.path.startsWith('.github/workflows/')&&Number.isFinite(Date.parse(r.created_at))&&Date.parse(r.created_at)>=Date.parse(policy.since)&&Date.parse(r.created_at)<=Date.now(),'INVENTORY_IDENTITY')}
async function enumerate(api){
 const rows=[],seen=new Set();let total=null
 for(let page=1;page<=10;page++){
  const v=await api(`actions/runs?created=${encodeURIComponent('>='+policy.since)}&per_page=100&page=${page}`)
  need(Number.isSafeInteger(v?.total_count)&&v.total_count>=0&&v.total_count<=1000&&Array.isArray(v.workflow_runs)&&
   (total===null||v.total_count===total)&&v.workflow_runs.length===Math.min(100,v.total_count-rows.length),'INVENTORY_COMPLETE')
  total=v.total_count
  for(const r of v.workflow_runs){inventoryIdentity(r);need(!seen.has(r.id),'INVENTORY_DUPLICATE');seen.add(r.id);rows.push(r)}
  if(rows.length===total)return rows
 }
 need(false,'INVENTORY_BOUND')
}
function nativeLeaves(bytes){
 const d=mkdtempSync(join(tmpdir(),'baden-r10-native-count-')),zip=join(d,'native.zip')
 try{
  writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',timeout:60000,maxBuffer:4096}).trimEnd().split('\n')
  const allowed=['release/pl-de-bulk/native-import-report.json','release/pl-de-bulk/source-report.json','release/pl-de-bulk/staging.json','release/pl-de-bulk/packs/de-verbandsliga-baden/baden-native-locator.json']
  const details=execFileSync('unzip',['-Z','-l',zip],{encoding:'utf8',timeout:60000,maxBuffer:8192}).split('\n')
  need(names.length===4&&new Set(names).size===4&&allowed.every(n=>names.includes(n)),'NATIVE_MEMBERS')
  const files=new Map()
  for(const n of names){const row=details.filter(s=>s.endsWith(' '+n));need(row.length===1&&/^-[rwxstST-]{9}\s/.test(row[0]),'NATIVE_REGULAR');const b=execFileSync('unzip',['-p',zip,n],{timeout:60000,maxBuffer:MiB+1});need(b.length<=MiB,'NATIVE_BOUND');files.set(n,b)}
  return files
 }finally{rmSync(d,{recursive:true,force:true})}
}
function nativeBeforeImport(files,p,run,jobs){
 const raw=files.get('release/pl-de-bulk/native-import-report.json'),report=parse(raw),result=report.results?.[0],step=result?.steps?.[0]
 need(sha(raw)===p.reportSha256&&report.phase==='native'&&report.expected_sha===run.head_sha&&report.results?.length===1&&
  ['STOPPED','COMPLETED_WITH_HOLDS'].includes(report.status)&&['INFRASTRUCTURE_STOP','HOLD'].includes(result.status)&&
  result.slug==='de-verbandsliga-baden'&&result.candidate?.source==='fussball-public'&&result.steps.length===1&&
  step.stage==='history-cards-prepare'&&step.status==='RUNNING','NATIVE_PREFIX')
 if(step.preparation_phases)need(step.preparation_phases.length===1&&step.preparation_phases[0].phase==='source-reauthenticate-before'&&step.preparation_phases[0].status==='FAILED','NATIVE_PHASE')
 const j=jobs.jobs.find(j=>j.name==='rollout')
 need(j?.steps.some(s=>s.name==='Cold register atomic policies bound seed archive current GK positions prices proof and CHECK'&&s.conclusion==='failure')&&
  j.steps.some(s=>s.name==='Same-run strict v2 admission activation and readback only when explicitly requested'&&s.conclusion==='skipped'),'NATIVE_GRAPH')
}
function nightlyScope(bytes,p,jobs){
 need(sha(bytes)===p.logSha256,'NIGHTLY_ORIGINAL')
 const text=new TextDecoder('utf8',{fatal:true}).decode(bytes),expected=['de-regionalliga-west','de-regionalliga-nord','de-regionalliga-suedwest','de-regionalliga-bayern','de-regionalliga-nordost']
 const lists=[...text.matchAll(/Koš 1\/1, lige \(najdlje neosvežene prve\): ([^\r\n]+)/g)]
 need(lists.length===1&&same(lists[0][1].trim().split(/\s+/).sort(),expected.slice().sort()),'NIGHTLY_COMPLETE_LEAGUES')
 const groups=[...text.matchAll(/##\[group\](de-[a-z-]+) \(dfb, faktor premora /g)].map(m=>m[1])
 const skipped=[...text.matchAll(/##\[warning\](de-[a-z-]+) preskočena — vir dfb je ta zagon vrnil 5xx/g)].map(m=>m[1])
 need(groups.length>0&&new Set([...groups,...skipped]).size===5&&same([...groups,...skipped].sort(),expected.slice().sort())&&
  !/fussball-public|prepare-fussball-nightly|preveri-baden-fresh-pair/.test(text),'NIGHTLY_DFB_MODE')
 const sourceModes=[...text.matchAll(/Berem zapisnike vira ([a-z-]+) /g)].map(m=>m[1])
 need(sourceModes.length===groups.length&&sourceModes.every(m=>m==='dfb'),'NIGHTLY_SOURCE_MODES')
 const j=jobs.jobs.find(j=>j.id===p.deJobId)
 need(j?.name==='uvoz DE'&&j.status==='completed'&&j.conclusion==='success'&&j.steps.some(s=>s.name==='Uvoz po ligah'&&s.conclusion==='success'),'NIGHTLY_JOB')
 // This is disjoint operational scope, not a claim of zero physical network
 // traffic. Its historical transport follows redirects without journaling them.
 return {leagueSlugs:expected,attemptedLeagueSlugs:groups,skippedLeagueSlugs:skipped,source:'dfb',originalProfileRelationship:'OUTSIDE_ORIGINAL_RESEARCH_PROFILE',physicalProviderAttempts:null,redirectVisibility:'NOT_JOURNALED'}
}

/** No caller count, serialized receipt, parser, clock or source-run exemption.
 * Unknown executions produce exact HOLD diagnostics, never a partial B proof.
 */
export async function readFussballBadenR10Budget(input){
 need(closed(input,['github'])&&typeof input.github==='function','INPUT')
 need(policy.kind==='fixed-baden-r10-research-execution-accounting'&&policy.totalRequestCap===5000&&policy.currentMaximum===780&&policy.archiveMaximum===0,'FIXED_POLICY')
 const originals=new Map(),reads=[],allowed=new Set(),mutable=new Map();let retained=0
 const get=async(path,binary=false)=>{
  need(typeof path==='string'&&path.startsWith(prefix)&&allowed.has(path.slice(prefix.length)),'GET_SCOPE')
  if(!binary&&/\/git\/(?:commits|trees)\//.test(path)&&originals.has(path))return parse(originals.get(path))
  need(reads.length<1600,'GET_BOUND');const started=performance.now();let v
  try{v=await input.github(path,binary);reads.push({path,binary,status:'OK',elapsedMs:Math.round(performance.now()-started)})}
  catch{reads.push({path,binary,status:'GET_FAILED',elapsedMs:Math.round(performance.now()-started)});throw Object.assign(Error('BADEN_R10_BUDGET_GET_HOLD'),{code:'BADEN_R10_BUDGET_GET_HOLD',dataHold:true,githubPath:path})}
  if(binary)need(Buffer.isBuffer(v)&&v.length<=100*MiB,'BINARY_BOUND')
  const b=binary?Buffer.from(v):Buffer.from(JSON.stringify(v)+'\n');need(b.length<=100*MiB,'RESPONSE_BOUND')
  const key=originals.has(path)&&!originals.get(path).equals(b)?path+'#observation-'+reads.length:path
  if(!originals.has(key)){retained+=b.length;need(retained<=256*MiB,'RETENTION_BOUND');originals.set(key,b)}
  return binary?Buffer.from(v):structuredClone(v)
 },api=(path,binary=false)=>get(prefix+path,binary)
 for(let page=1;page<=10;page++)allowed.add(`actions/runs?created=${encodeURIComponent('>='+policy.since)}&per_page=100&page=${page}`)
 const first=await enumerate(api),blockers=[],executions=[]
 for(const p of history.records)for(const path of [`actions/runs/${p.run.id}`,`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100&page=1`,`actions/artifacts/${p.artifact.id}`,`actions/artifacts/${p.artifact.id}/zip`])allowed.add(path)
 for(const r of first){allowed.add(`actions/runs/${r.id}`);allowed.add(`actions/runs/${r.id}/artifacts?per_page=100&page=1`);for(let a=1;a<=r.run_attempt;a++)allowed.add(`actions/runs/${r.id}/attempts/${a}/jobs?per_page=100&page=1`)}
 for(const path of ['actions/artifacts/12894726197','actions/artifacts/12894726197/zip'])allowed.add(path)
 const foundation=getFussballBadenR10AccountingFoundation(await readFussballBadenR10AccountingFoundation({github:get}))
 need(foundation.accounting.authenticatedMinimumSpent===3607,'FOUNDATION')
 const ancestorCoverage={complete:false,reason:'PRE_R7_ANCESTOR_COVERAGE_NOT_CLOSED',ancestors:[],
  unresolvedCarriedForwardRequests:exclusions.ancestorCoverage.unresolvedCarriedForwardRequests,
  reviewedSingleGuard:structuredClone(exclusions.ancestorCoverage.reviewedSingleGuard),additionalRequests:null}
 for(const p of exclusions.ancestorCoverage.knownReferencedAncestors){
  const path='actions/runs/'+p.runId;allowed.add(path)
  try{const r=await api(path);need(String(r?.id)===p.runId&&r.head_sha===p.head&&r.repository?.full_name===policy.repository&&
   Number.isSafeInteger(r.run_attempt)&&r.run_attempt>=1&&r.run_attempt<=16&&Date.parse(r.created_at)<Date.parse(policy.since),'ANCESTOR_IDENTITY')
   ancestorCoverage.ancestors.push({runId:p.runId,head:p.head,latestAttempt:r.run_attempt,additionalRequests:null,
    retryPreclusionAuthenticated:false,reason:'FROZEN_GUARD_OR_ATTEMPT_ORIGINALS_REQUIRED'});mutable.set(path,r)
  }catch(error){ancestorCoverage.ancestors.push({runId:p.runId,head:p.head,latestAttempt:null,additionalRequests:null,reason:error.code??'ANCESTOR_METADATA_UNAVAILABLE'})}
 }
 const runtimeCache=new Set()
 const vectorCache=new Map()
 const vector=async(head,workflow)=>{
  const key=head+'\0'+workflow;if(vectorCache.has(key))return vectorCache.get(key)
  const v=await readBadenR10RuntimeVector({head,workflow,github:async(path,binary=false)=>{need(path.startsWith(prefix)&&/^git\/(?:commits\/[a-f0-9]{40}|trees\/[a-f0-9]{40}\?recursive=1)$/.test(path.slice(prefix.length)),'VECTOR_SCOPE');allowed.add(path.slice(prefix.length));return get(path,binary)}})
  vectorCache.set(key,v);return v
 }
 const runtime=async head=>{
  if(runtimeCache.has(head))return
  const p=policy.runtimes[head];need(p,'UNREVIEWED_RUNTIME');const commitPath='git/commits/'+head;allowed.add(commitPath)
  const c=await api(commitPath);need(c?.sha===head&&c.tree?.sha===p.tree,'RUNTIME_TREE')
  for(const[file,hash]of Object.entries(p.files)){
   const path=`contents/${file}?ref=${head}`;allowed.add(path);const v=await api(path)
   need(v?.type==='file'&&v.path===file&&v.encoding==='base64'&&typeof v.content==='string'&&v.size<=8*MiB&&
    Buffer.from(v.content,'base64').length===v.size&&sha(Buffer.from(v.content,'base64'))===hash,'RUNTIME_BODY')
  }
  runtimeCache.add(head)
 }
 for(const listed of first){
  const p=policy.records.find(p=>p.run.id===listed.id),runId=String(listed.id)
  if(!p){
   const content=contentGroups.groups.find(g=>g.workflow===listed.path&&(g.mode!=='automatic-build-sql'||['push','pull_request'].includes(listed.event)))
   if(content){
    try{
     need(listed.run_attempt===1&&listed.status==='completed'&&['success','failure','cancelled','skipped','timed_out','action_required','neutral','stale'].includes(listed.conclusion),'GROUP_ATTEMPT')
     const runPath=`actions/runs/${listed.id}`,jobsPath=runPath+'/attempts/1/jobs?per_page=100&page=1',run=await api(runPath),jobs=await api(jobsPath)
     need(same(runProjection(run),runProjection(listed)),'GROUP_RUN');jobsProjection(jobs)
     let checkout=run.head_sha
     if(content.mode==='automatic-build-sql'&&run.event==='pull_request'){
      const refs=run.referenced_workflows,pr=run.pull_requests
      need(Array.isArray(refs)&&refs.length===2&&Array.isArray(pr)&&pr.length===1&&Number.isSafeInteger(pr[0].number)&&
       refs.every(r=>/^[a-f0-9]{40}$/.test(r.sha)&&r.sha===refs[0].sha&&r.ref===`refs/pull/${pr[0].number}/merge`)&&
       refs.every(r=>r.path.startsWith(policy.repository+'/.github/workflows/')),'PR_EXECUTED_MERGE_BINDING')
      checkout=refs[0].sha
     }
     const footprint=await vector(checkout,run.path)
     need(content.vectors.some(v=>v.vectorSha256===footprint.vectorSha256),'UNREVIEWED_EXECUTED_VECTOR')
     const names=jobs.jobs.map(j=>j.name).sort()
     need(jobs.jobs.every(j=>j.run_id===run.id&&j.run_attempt===1&&j.head_sha===run.head_sha&&j.status==='completed'&&content.jobNames.includes(j.name)&&
      new Set(j.steps.map(s=>s.number)).size===j.steps.length&&j.steps.every(s=>s.status==='completed'&&content.allowedSteps[j.name]?.includes(s.name))),'GROUP_COMPLETE_GRAPH')
     if(content.mode==='automatic-build-sql'){
      const emptyCancelled=run.status==='completed'&&run.conclusion==='cancelled'&&jobs.total_count===0
      need(emptyCancelled||same(names,content.jobNames)&&content.sourceJobs.every(name=>jobs.jobs.some(j=>j.name===name&&j.status==='completed'&&j.conclusion==='skipped'&&j.steps.length===0)),'RESEARCH_JOBS_NOT_SKIPPED')
     }else need(jobs.total_count===1&&same(names,content.jobNames),'GROUP_COMPLETE_GRAPH')
     let inputSlug=null
     if(content.mode==='foreign-guarded-import'){
      const match=/^Uvoz lige ([a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(run.display_title??'')
      need(run.event==='workflow_dispatch'&&run.head_branch==='main'&&match&& !match[1].startsWith('de-'),'FOREIGN_INPUT_SCOPE')
      inputSlug=match[1]
      // The authenticated workflow binds this same inputs.liga to LIGA and
      // every quoted --tekmovanje argument. The reviewed adapter blob rejects
      // non-de slugs before any FUSSBALL transport, including @vir overrides.
     }
     mutable.set(runPath,run);mutable.set(jobsPath,jobs)
     executions.push({runId,runAttempt:1,head:run.head_sha,checkoutHead:checkout,path:run.path,kind:'reviewed-content-vector-group',
      sourceMode:content.mode,classification:'OUTSIDE_ORIGINAL_RESEARCH_PROFILE',inputSlug,contentVector:footprint.vectorSha256,
      newResearchRequests:0,physicalProviderAttempts:null})
    }catch(error){blockers.push({runId,path:listed.path,reason:error.code??'GROUP_EVIDENCE_UNAVAILABLE'})}
    continue
   }
   const groups=exclusions.groups.filter(g=>g.workflow===listed.path)
   if(groups.length){
    try{
     need(listed.status==='completed'&&listed.run_attempt===1&&listed.head_branch==='main'&&groups.some(g=>g.events.includes(listed.event)),'EXCLUSION_EXECUTION')
     const runPath=`actions/runs/${listed.id}`,jobsPath=runPath+'/attempts/1/jobs?per_page=100&page=1'
     const run=await api(runPath),jobs=await api(jobsPath);need(same(runProjection(run),runProjection(listed)),'EXCLUSION_RUN')
     jobsProjection(jobs)
     let accepted=null
     for(const group of groups){
      need(['own-service-health-only','own-service-sitemap-only','own-service-notification-only'].includes(group.sourceMode),'EXCLUSION_SOURCE_MODE')
      let matches=true
      for(const[file,hash]of Object.entries(group.files)){
       const path=`contents/${file}?ref=${run.head_sha}`;allowed.add(path);const v=await api(path)
       if(v?.type!=='file'||v.path!==file||v.encoding!=='base64'||typeof v.content!=='string'||v.size>8*MiB||
        Buffer.from(v.content,'base64').length!==v.size||sha(Buffer.from(v.content,'base64'))!==hash){matches=false;break}
      }
      if(!matches)continue
      need(jobs.total_count===1&&jobs.jobs[0].name===group.jobName,'EXCLUSION_JOB_GRAPH')
      const j=jobs.jobs[0];need(j.run_id===run.id&&j.run_attempt===1&&j.head_sha===run.head_sha&&j.status==='completed'&&
       (j.conclusion==='skipped'&&j.steps.length===0||same(j.steps.map(s=>s.name),group.stepNames)&&
        j.steps.every(s=>s.status==='completed'&&['success','failure','skipped','cancelled'].includes(s.conclusion))),'EXCLUSION_JOB_GRAPH')
      accepted=group;break
     }
     need(accepted,'EXCLUSION_RUNTIME_BODY')
     mutable.set(runPath,run);mutable.set(jobsPath,jobs)
     executions.push({runId,runAttempt:1,head:run.head_sha,path:run.path,kind:'reviewed-own-service-group',
      sourceMode:accepted.sourceMode,classification:'OUTSIDE_ORIGINAL_RESEARCH_PROFILE',newResearchRequests:0,physicalProviderAttempts:null})
    }catch(error){blockers.push({runId,path:listed.path,reason:error.code??'EXCLUSION_EVIDENCE_UNAVAILABLE'})}
    continue
   }
   const attempts=[]
   for(let a=1;a<=listed.run_attempt;a++)try{const path=`actions/runs/${listed.id}/attempts/${a}/jobs?per_page=100&page=1`;const jobs=await api(path);jobsProjection(jobs);attempts.push({attempt:a,jobsRetained:true})}catch{attempts.push({attempt:a,jobsRetained:false})}
   blockers.push({runId,path:listed.path,reason:listed.status!=='completed'?'LIVE_EXECUTION':'UNREVIEWED_EXECUTION',attempts});continue
  }
  try{
   need(['already-accounted','regular-dfb-nightly','native-before-individual-import','retained-card-replay','owner-catalog-offline-originals','derived-offline-originals','reviewed-source-free-diagnostic'].includes(p.kind),'UNREVIEWED_CLASSIFICATION')
   need(listed.status==='completed'&&same(runProjection(listed),p.run),'RUN_PIN')
   const runPath=`actions/runs/${listed.id}`,jobsPath=runPath+'/attempts/1/jobs?per_page=100&page=1'
   const run=await api(runPath),jobs=await api(jobsPath);need(same(runProjection(run),p.run)&&sha(canonical(jobsProjection(jobs)))===p.jobsSha256,'RUN_JOBS_PIN')
   mutable.set(runPath,run);mutable.set(jobsPath,jobs)
   const e={runId,runAttempt:1,head:run.head_sha,path:run.path,kind:p.kind,newResearchRequests:0,classification:'NO_NEW_RESEARCH_ATTEMPTS'}
   if(p.kind==='already-accounted'){e.classification='ALREADY_ACCOUNTED';e.alreadyAccountedRequests=p.accountedRequests}
   else{
    await runtime(run.head_sha)
    if(p.kind==='regular-dfb-nightly'){
     const path=`actions/jobs/${p.deJobId}/logs`;allowed.add(path);Object.assign(e,nightlyScope(await api(path,true),p,jobs));e.classification='OUTSIDE_ORIGINAL_RESEARCH_PROFILE'
    }else if(p.kind==='native-before-individual-import'){
     const path=runPath+'/artifacts?per_page=100&page=1',aPath=`actions/artifacts/${p.artifact.id}`;[path,aPath,aPath+'/zip'].forEach(v=>allowed.add(v))
     const inventory=await api(path),a=await api(aPath)
     need(inventory?.total_count===1&&inventory.artifacts?.length===1&&same(inventory.artifacts[0],a)&&
      ['id','name','size_in_bytes','digest'].every(k=>a[k]===p.artifact[k])&&a.expired===false&&Date.parse(a.expires_at)>Date.now()&&a.workflow_run?.id===run.id&&a.workflow_run.head_sha===run.head_sha,'NATIVE_ARTIFACT')
     const bytes=await api(aPath+'/zip',true);need(bytes.length===a.size_in_bytes&&'sha256:'+sha(bytes)===a.digest,'NATIVE_ZIP_DIGEST')
     nativeBeforeImport(nativeLeaves(bytes),p,run,jobs);mutable.set(path,inventory);mutable.set(aPath,a)
    }
   }
   executions.push(e)
  }catch(error){blockers.push({runId,path:listed.path,reason:error.code??'INVALID_EXECUTION_EVIDENCE'})}
 }
 for(const p of policy.records)if(!first.some(r=>r.id===p.run.id))blockers.push({runId:String(p.run.id),path:p.run.path,reason:'MISSING_REVIEWED_EXECUTION'})
 const fail=()=>{const error=Object.assign(Error('BADEN_R10_BUDGET_RECONCILIATION_HOLD'),{code:'BADEN_R10_BUDGET_RECONCILIATION_HOLD',dataHold:true,
  blockers:structuredClone([...blockers,{reason:ancestorCoverage.reason,ancestorRunIds:ancestorCoverage.ancestors.map(a=>a.runId),additionalRequests:null}]),
  audit:{executions:structuredClone(executions),ancestorCoverage:structuredClone(ancestorCoverage),authenticatedMinimumSpent:3607,
   freshAccountingKnown:false,adapterReads:structuredClone(reads),sourceOperationAuthorized:false}})
  Object.defineProperty(error,'originals',{value:copyFiles(originals)});throw error}
 if(blockers.length)fail()
 const last=await enumerate(api),firstRelevant=first,lastRelevant=last
 for(const r of lastRelevant)if(!firstRelevant.some(x=>x.id===r.id&&same(runProjection(x),runProjection(r))))blockers.push({runId:String(r.id),path:r.path,reason:'LATE_EXECUTION_DRIFT'})
 for(const r of firstRelevant)if(!lastRelevant.some(x=>x.id===r.id))blockers.push({runId:String(r.id),path:r.path,reason:'LATE_EXECUTION_MISSING'})
 for(const[path,v]of mutable)if(!same(await api(path),v))blockers.push({runId:path.match(/runs\/(\d+)/)?.[1]??null,path,reason:'LATE_METADATA_DRIFT'})
 // Mutable rechecks may take longer than a minute. Close the creation/rerun
 // window again AFTER them; verification time must not relabel an older scan.
 const sealRelevant=await enumerate(api)
 for(const r of sealRelevant)if(!firstRelevant.some(x=>x.id===r.id&&same(runProjection(x),runProjection(r))))blockers.push({runId:String(r.id),path:r.path,reason:'SEAL_EXECUTION_DRIFT'})
 for(const r of firstRelevant)if(!sealRelevant.some(x=>x.id===r.id))blockers.push({runId:String(r.id),path:r.path,reason:'SEAL_EXECUTION_MISSING'})
 if(blockers.length||!ancestorCoverage.complete)fail()
 const B=foundation.accounting.authenticatedMinimumSpent+executions.reduce((sum,e)=>sum+e.newResearchRequests,0)
 need(Number.isSafeInteger(B)&&B>=3607&&B+policy.currentMaximum<=policy.totalRequestCap,'RESERVATION_CAP')
 const verifiedAt=Date.now(),proof=freeze({version:1,kind:'authenticated-baden-r10-research-budget',
  budget:{priorRequests:B,currentMaximum:780,archiveMaximum:0,cumulativeReserved:B+780,totalRequestCap:5000},
  verifiedAt:new Date(verifiedAt).toISOString(),expiresAt:new Date(verifiedAt+60000).toISOString(),sourceOperationAuthorized:false,nativeAdmission:false,activationEligible:false})
 states.set(proof,{input,executions,originals,reads,foundation:foundation.certificate,scopeRuling:policy.scopeRuling});return proof
}
export function getFussballBadenR10Budget(proof){
 const s=states.get(proof);need(s,'PRIVATE_CAPABILITY');need(Date.now()>=Date.parse(proof.verifiedAt)&&Date.now()<Date.parse(proof.expiresAt),'EXPIRED')
 return {...structuredClone(proof),executions:structuredClone(s.executions),originals:copyFiles(s.originals),
  certificate:{scopeRuling:s.scopeRuling,historicalFoundation:structuredClone(s.foundation),adapterReads:structuredClone(s.reads),adapterCallsAreNotProviderRequests:true}}
}
export async function reauthenticateFussballBadenR10Budget(proof){const s=states.get(proof);need(s,'PRIVATE_CAPABILITY');return readFussballBadenR10Budget(s.input)}
