// First-attempt main-only source collection. No native dispatch or DB authority.
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {isDeepStrictEqual} from 'node:util'
import {reviewedFussballArchiveV6,validateFussballV6Allowance,assertFussballV6CurrentFresh,loadFussballV6Parents,readFussballArchiveContinuationV6,getFussballV6History,captureFussballArchiveV6,verifyFussballArchiveV6} from './fussball-archive-v6.mjs'
const p=reviewedFussballArchiveV6(),check=(ok,why)=>{if(!ok)throw Error(`fussball v6 actions: ${why}`)}
export const V6_ARCHIVE_SOURCE_STEP='Capture only fresh archive rounds and missing originals without database credentials'
export const V6_FROZEN_AUTH_STEP='Authenticate actual V5 parents and execute frozen DE77 default verifier'
export function validateFussballV6Hosted(e,{headSha}={}){
 check(e.GITHUB_ACTIONS==='true'&&e.GITHUB_REPOSITORY===p.repository&&e.GITHUB_REF==='refs/heads/main'&&e.GITHUB_EVENT_NAME==='workflow_dispatch'&&e.GITHUB_WORKFLOW_REF===`${p.repository}/${p.workflow}@refs/heads/main`&&e.GITHUB_RUN_ATTEMPT==='1'&&/^[1-9]\d*$/.test(e.GITHUB_RUN_ID??'')&&/^[a-f0-9]{40}$/.test(e.EXPECTED_SHA??'')&&e.EXPECTED_SHA===e.GITHUB_SHA&&headSha===e.EXPECTED_SHA&&e.COMPLETION_PRESET===p.preset,'exact reviewed main first-attempt V6 dispatch required')
 check((e.PRIOR_REQUESTS===undefined||e.PRIOR_REQUESTS==='1838')&&(e.TOTAL_REQUEST_CAP===undefined||e.TOTAL_REQUEST_CAP==='5000'),'fixed1838/5000 cannot be replaced')
 return validateFussballV6Allowance({currentRequests:e.COMPLETION_CURRENT_REQUESTS,archiveRequests:e.COMPLETION_ARCHIVE_REQUESTS})
}
const github=(path,binary=false)=>{const b=execFileSync('gh',['api',`repos/${p.repository}/${path}`],{timeout:30000,maxBuffer:100*1024*1024+1});return binary?b:JSON.parse(b)}
function currentHead(){return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}
function proofFrom(directory,frozenDirectory){return readFussballArchiveContinuationV6({...loadFussballV6Parents(directory),frozenDirectory})}
export async function downloadFussballV6Parents(directory,{env=process.env,headSha=currentHead(),api=github,frozenDirectory}={}){
 validateFussballV6Hosted(env,{headSha})
 const parents={}
 for(const stage of ['current','archive']){
  const pin=p[stage],[run,jobs,artifact,zipBytes]=await Promise.all([api(`actions/runs/${p.sourceRunId}`),api(`actions/runs/${p.sourceRunId}/attempts/1/jobs?per_page=100`),api(`actions/artifacts/${pin.artifactId}`),api(`actions/artifacts/${pin.artifactId}/zip`,true)]);parents[stage]={run,jobs,artifact,zipBytes}
 }
 // Execute the pinned verifier in this process before any permission/result is emitted.
 const proof=readFussballArchiveContinuationV6({...parents,frozenDirectory});mkdirSync(directory);mkdirSync(join(directory,'parents'))
 for(const stage of ['current','archive']){const {zipBytes,...metadata}=parents[stage],prefix=join(directory,'parents',`${p.sourceRunId}-${stage}`);writeFileSync(prefix+'.json',JSON.stringify(metadata)+'\n',{flag:'wx'});writeFileSync(prefix+'.zip',zipBytes,{flag:'wx'})}
 return proof
}
function boundedJobs(envelope,run){
 check(envelope&&Object.keys(envelope).sort().join(',')==='jobs,total_count'&&Number.isSafeInteger(envelope.total_count)&&envelope.total_count>0&&envelope.total_count<=100&&Array.isArray(envelope.jobs)&&envelope.jobs.length===envelope.total_count&&new Set(envelope.jobs.map(j=>j.id)).size===envelope.jobs.length,'complete bounded jobs required')
 check(envelope.jobs.every(j=>Number.isSafeInteger(j.id)&&j.id>0&&j.run_id===run.id&&j.run_attempt===1&&j.head_sha===run.head_sha),'exact actual job identities required');return envelope.jobs
}
function runIdentity(r){check(Number.isSafeInteger(r?.id)&&r.id>0&&r.run_attempt===1&&r.path===p.workflow&&r.event==='workflow_dispatch'&&r.head_branch==='main'&&/^[a-f0-9]{40}$/.test(r.head_sha??'')&&r.repository?.full_name===p.repository&&r.head_repository?.full_name===p.repository&&Number.isFinite(Date.parse(r.created_at)),'actual first-attempt main execution required')}
export async function assertFussballV6Unspent({env=process.env,headSha=currentHead(),proof,api=github}={}){
 validateFussballV6Hosted(env,{headSha});const history=getFussballV6History(proof),known=new Map()
 for(const parent of Object.values(history)){const id=parent.run.id;if(!known.has(id))known.set(id,[]);known.get(id).push(parent)}
 const own=async()=>{
  const r=await api(`actions/runs/${env.GITHUB_RUN_ID}`);runIdentity(r);check(r.id===Number(env.GITHUB_RUN_ID)&&r.status==='in_progress'&&r.conclusion===null&&r.head_sha===headSha&&env.GITHUB_JOB==='archive-continuation','own running archive-only job required')
  const jobs=boundedJobs(await api(`actions/runs/${r.id}/attempts/1/jobs?per_page=100`),r),active=jobs.filter(j=>j.name==='archive-continuation'),j=active[0]
  check(jobs.length===4&&active.length===1&&j.status==='in_progress'&&j.conclusion===null&&Array.isArray(j.steps),'exact active archive-continuation job required')
  for(const name of ['capture','archive','handoff']){const rows=jobs.filter(j=>j.name===name);check(rows.length===1&&rows[0].status==='completed'&&rows[0].conclusion==='skipped'&&rows[0].steps?.length===0,'V6 legacy jobs must be skipped')}
  for(const [name,status,conclusion]of [[V6_FROZEN_AUTH_STEP,'completed','success'],[V6_ARCHIVE_SOURCE_STEP,'in_progress',null]]){const steps=j.steps.filter(s=>s.name===name);check(steps.length===1&&steps[0].status===status&&steps[0].conclusion===conclusion,'actual frozen-auth/source critical step required')}
  return r
 }
 const initial=await own(),runs=[];let count=null;const seen=new Set()
 for(let page=1;page<=10;page++){
  const r=await api(`actions/workflows/preveri-fussball-dopolni.yml/runs?per_page=100&page=${page}`)
  check(Number.isSafeInteger(r.total_count)&&r.total_count>=1&&r.total_count<=1000&&(count===null||count===r.total_count)&&Array.isArray(r.workflow_runs)&&r.workflow_runs.length===Math.min(100,r.total_count-runs.length),'complete stable completion history required');count=r.total_count
  for(const run of r.workflow_runs){check(Number.isSafeInteger(run.id)&&!seen.has(run.id)&&run.path===p.workflow,'unique exact history identity required');seen.add(run.id);runs.push(run)}if(runs.length===count)break
 }
 check(runs.length===count&&seen.has(initial.id),'own complete history required');const accounted=new Set()
 for(const summary of runs){
  if(summary.id===initial.id)continue
  check(summary.status==='completed'&&summary.run_attempt===1&&['success','failure'].includes(summary.conclusion),'live/cancelled/unknown completion blocks V6')
  const run=await api(`actions/runs/${summary.id}`);runIdentity(run)
  check(run.status==='completed'&&run.conclusion===summary.conclusion&&run.head_sha===summary.head_sha&&run.created_at===summary.created_at,'actual history changed')
  const envelope=await api(`actions/runs/${run.id}/attempts/1/jobs?per_page=100`),jobs=boundedJobs(envelope,run),records=known.get(run.id)
  if(records){
   check(records.every(x=>x.run.head_sha===run.head_sha&&x.run.conclusion===run.conclusion&&x.run.created_at===run.created_at&&isDeepStrictEqual(x.jobs,envelope)),'accounted raw execution/jobs differ')
   for(const old of records){const a=await api(`actions/artifacts/${old.artifact.id}`);check(a.id===old.artifact.id&&a.digest===old.artifact.digest&&a.size_in_bytes===old.artifact.size_in_bytes&&a.name===old.artifact.name&&a.workflow_run?.id===run.id&&a.workflow_run?.head_sha===run.head_sha,'accounted actual artifact changed')}
   accounted.add(run.id);continue
  }
  // Any source-started or ambiguous unaccounted run holds, regardless of age.
  const legacy=jobs.filter(j=>j.name==='capture'),v6=jobs.filter(j=>j.name==='archive-continuation')
  check((legacy.length===1&&v6.length===0&&jobs.length===3)||(v6.length===1&&legacy.length===1&&jobs.length===4),'unknown completion graph blocks source')
  if(v6.length)for(const name of ['capture','archive','handoff']){const rows=jobs.filter(j=>j.name===name);check(rows.length===1&&rows[0].status==='completed'&&rows[0].conclusion==='skipped'&&rows[0].steps?.length===0,'unstarted V6 legacy jobs must stay skipped')}
  const job=v6[0]??legacy[0],name=v6.length?V6_ARCHIVE_SOURCE_STEP:'Capture fresh rounds and missing originals without database credentials'
  check(job.status==='completed'&&['success','failure','skipped'].includes(job.conclusion)&&Array.isArray(job.steps),'unknown unstarted job state')
  const steps=job.steps.filter(s=>s.name===name);check(steps.length===1&&steps[0].status==='completed'&&steps[0].conclusion==='skipped','unaccounted source-started run; charge its requests before another execution')
  if(!v6.length)for(const name of ['archive','handoff']){const rows=jobs.filter(j=>j.name===name);check(rows.length===1&&rows[0].status==='completed'&&rows[0].conclusion==='skipped'&&rows[0].steps?.length===0,'unstarted legacy continuation must be skipped')}
 }
 check(accounted.size===known.size&&known.size===5,'all five consumed completion executions required')
 check((await own()).created_at===initial.created_at,'own execution changed during history accounting')
 check((await api('commits/main')).sha===headSha,'reviewed main changed before source');assertFussballV6CurrentFresh()
 return {priorRequests:1838,totalRequestCap:5000,checkedRunId:String(initial.id),sourceStarted:false}
}
async function main(args){
 const [mode,directory='continuation-input',frozen='frozen-de77',output='capture-archive-v6']=args,env=process.env,headSha=currentHead(),allowance=validateFussballV6Hosted(env,{headSha})
 execFileSync('git',['diff','--exit-code','HEAD','--'],{stdio:'pipe'})
 check(args.length>=1&&args.length<=4,'use validate, parents INPUT FROZEN, capture INPUT FROZEN OUTPUT or verify INPUT FROZEN OUTPUT')
 if(mode==='validate'){console.log(JSON.stringify(allowance));return}
 if(mode==='parents'){const proof=await downloadFussballV6Parents(resolve(directory),{env,headSha,frozenDirectory:resolve(frozen)});console.log(JSON.stringify(proof));return}
 if(mode==='capture'){
  const proof=proofFrom(resolve(directory),resolve(frozen));await assertFussballV6Unspent({env,headSha,proof})
  console.log(JSON.stringify(await captureFussballArchiveV6({directory:resolve(output),proof,maxRequests:allowance.archiveRequests,onProgress:x=>console.log(JSON.stringify(x))})));return
 }
 if(mode==='verify'){const receipt=await verifyFussballArchiveV6({directory:resolve(output),parentDirectory:resolve(directory),frozenDirectory:resolve(frozen)});writeFileSync(resolve('archive-v6-source-attestation.json'),JSON.stringify(receipt)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));return}
 throw Error('Unknown V6 source-only mode')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1})
