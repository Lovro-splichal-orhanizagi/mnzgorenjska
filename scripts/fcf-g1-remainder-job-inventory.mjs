// Current schema7 phase metadata only; this grants no source/native capability.
// Fixed complete workflow bytes bind both aliases and the dependency graph.
import {readFileSync} from 'node:fs'
import {inventoryFail as fail,exactKeys,rawSha256,nativeId,commitId} from './fcf-missing-inventory-artifact.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml',workflowSHA='dd2447bc8a706d14e517bd4854adbda15f66b2f790d138e0f0fbe11e13e69af4'
const names=['cache-export','missing-inventory-seed','missing-inventory-approval','missing-inventory-consume','missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt','target-approval','cleanup-originals','target-mapping','cleanup-prepare','cleanup-apply','target-import','target-price','target-check','target-activate','target-recover','future-target-approval','missing-inventory']
const needs={
 'missing-inventory-g1':['missing-inventory-approval','missing-inventory-consume'],
 'missing-inventory-g9':['missing-inventory-approval','missing-inventory-consume','missing-inventory-g1'],
 'missing-inventory-receipt':['missing-inventory-approval','missing-inventory-consume','missing-inventory-g1','missing-inventory-g9'],
}
const aliases={"inputs.preset == 'six-reviewed-continuation-v1' && 'missing-inventory-g9' || 'missing-inventory-g1'":'missing-inventory-g1',"inputs.preset == 'six-reviewed-continuation-v1' && 'missing-inventory-g1' || 'missing-inventory-g9'":'missing-inventory-g9','inputs.mode':'missing-inventory'}
const setup=['Set up job','Checkout exact main','Node 22','Checkout immutable failed G1 verifier','Post Checkout immutable failed G1 verifier','Post Node 22','Post Checkout exact main','Complete job'],critical={
 'missing-inventory-approval':['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval'],
 'missing-inventory-consume':['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'],
 'missing-inventory-receipt':['Authenticate bounded parent accounting','Retain final FCF inventory receipt'],
 'missing-inventory-g1':['Offline G1 source protocol checks','Capture missing target inventory','Retain complete target inventory','Retain failed target inventory diagnostic','Audit retained target inventory offline','Retain target inventory offline audit'],
}
const need=(v,m)=>{if(!v)fail('G1 phase inventory held: '+m)},actor=a=>a?.login==='nejcar20'&&a.id===25134229&&a.type==='User',unset=x=>x===null||x===undefined,skipped=j=>j.status==='completed'&&j.conclusion==='skipped'&&j.steps.every(s=>s.status==='completed'&&s.conclusion==='skipped'),pending=j=>['queued','waiting','pending','requested'].includes(j.status)&&j.conclusion===null&&unset(j.started_at)&&j.steps.every(s=>['queued','waiting','pending'].includes(s.status)&&s.conclusion===null&&unset(s.started_at)&&unset(s.completed_at))
function step(job,name){const a=job.steps.filter(s=>s.name===name);need(a.length===1,'exact critical step '+name);return a[0]}
function successful(job,steps){need(job.status==='completed'&&job.conclusion==='success'&&job.steps.every(s=>s.status==='completed'&&['success','skipped'].includes(s.conclusion)),'successful '+job.name+' required');for(const name of steps){const s=step(job,name);need(s.status==='completed'&&s.conclusion==='success','successful '+name+' required')}}
/** Phase is inferred from actual critical steps, never a caller partial flag.
 * Readiness/private claim+consumption callers bind this same execution head to
 * current local/main/served code. This checker binds run/jobs and the exact DAG.
 */
function inventory(input,terminal){
 exactKeys(input,['run','jobs','execution'],'G1 phase inventory input');const {run,execution:e}=input
 exactKeys(e,['repository','workflow','ref','sourceCommit','runId','runAttempt'],'G1 phase execution')
 need(rawSha256(readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url)))===workflowSHA,'immutable workflow dependency body differs')
 need(e.repository===repository&&e.workflow===workflow&&e.ref==='refs/heads/main'&&commitId(e.sourceCommit)&&nativeId(e.runId)&&e.runAttempt==='1'&&String(run?.id)===e.runId&&run.repository?.full_name===repository&&run.path===workflow&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.head_sha===e.sourceCommit&&run.run_attempt===1&&(terminal?run.status==='completed'&&['success','failure'].includes(run.conclusion):run.status==='in_progress'&&run.conclusion===null)&&actor(run.actor)&&actor(run.triggering_actor),'actual main attempt1 root/head differs')
 need(Array.isArray(input.jobs),'actual paginated jobs required')
 const jobs=structuredClone(input.jobs).map(j=>{need(Array.isArray(j.steps),'actual steps required');if(Object.hasOwn(aliases,j.name)){need(skipped(j),'executed or incomplete alias');j.name=aliases[j.name]}return j})
 need(jobs.length<=19&&new Set(jobs.map(j=>j.name)).size===jobs.length&&new Set(jobs.map(j=>String(j.id))).size===jobs.length&&jobs.every(j=>names.includes(j.name)&&nativeId(String(j.id))&&String(j.run_id)===e.runId&&j.run_attempt===1&&j.head_sha===e.sourceCommit),'unknown/duplicate/foreign current job inventory')
 for(const job of jobs)if(Object.hasOwn(critical,job.name))need(new Set(job.steps.map(s=>s.name)).size===job.steps.length&&new Set(job.steps.map(s=>s.number)).size===job.steps.length&&job.steps.every(s=>Number.isSafeInteger(s.number)&&s.number>0&&[...setup,...critical[job.name]].includes(s.name)),'unknown or duplicate selected step')
 return jobs
}
export function verifyFcfG1CurrentJobInventory(input){
 const {run,execution:e}=input,jobs=inventory(input,false)
 const find=name=>{const a=jobs.filter(j=>j.name===name);need(a.length===1,'mandatory '+name+' missing');return a[0]}
 const approval=find('missing-inventory-approval'),consume=find('missing-inventory-consume'),capture=jobs.find(j=>j.name==='missing-inventory-g1')
 successful(approval,critical['missing-inventory-approval'])
 const active=(job,name)=>job?.status==='in_progress'&&job.conclusion===null&&job.steps.filter(s=>s.name===name&&s.status==='in_progress'&&s.conclusion===null).length===1
 const preclaim=active(consume,'Verify one-shot FCF inventory claim'),capturing=active(capture,'Capture missing target inventory');need(preclaim!==capturing,'exact actual preclaim or capture critical phase required')
 const phase=preclaim?'preclaim':'capture',activeJob=preclaim?'missing-inventory-consume':'missing-inventory-g1',mayBeAbsent=preclaim?['missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt']:['missing-inventory-g9','missing-inventory-receipt']
 const current=find(activeJob),criticalName=preclaim?'Verify one-shot FCF inventory claim':'Capture missing target inventory',position=current.steps.findIndex(s=>s.name===criticalName)
 need(current.steps.filter(s=>s.status==='in_progress').length===1&&current.steps.slice(0,position).every(s=>s.status==='completed'&&['success','skipped'].includes(s.conclusion))&&current.steps.slice(position+1).every(s=>s.status==='completed'&&s.conclusion==='skipped'||['queued','waiting','pending'].includes(s.status)&&s.conclusion===null&&unset(s.started_at)&&unset(s.completed_at)),'critical step order/other executed step differs')
 if(capturing)successful(consume,critical['missing-inventory-consume'])
 for(const name of names)if(!mayBeAbsent.includes(name))find(name)
 const unmaterialized=names.filter(name=>!jobs.some(j=>j.name===name));need(unmaterialized.every(name=>mayBeAbsent.includes(name)&&needs[name]?.includes(activeJob)),'missing node is not blocked by actual active prerequisite')
 for(const j of jobs){
  if(['missing-inventory-approval','missing-inventory-consume',...(capturing?['missing-inventory-g1']:[])].includes(j.name))continue
  if(mayBeAbsent.includes(j.name))need(pending(j)||j.name==='missing-inventory-g9'&&skipped(j),'dependent job started/executed before prerequisite completion')
  else need(skipped(j),'native/sibling/other current job executed')
 }
 return {phase,jobs,unmaterialized}
}

/** Completed raw/final accounting retains the full closed19 inventory. The
 * hosted in-progress audit uses its existing selected-artifact boundary. */
export function verifyFcfG1TerminalJobInventory(input){
 const jobs=inventory(input,true),find=name=>{const a=jobs.filter(j=>j.name===name);need(a.length===1,'terminal mandatory '+name+' missing');return a[0]}
 need(jobs.length===19,'complete terminal19 inventory required');for(const name of names)find(name)
 successful(find('missing-inventory-approval'),critical['missing-inventory-approval']);successful(find('missing-inventory-consume'),critical['missing-inventory-consume'])
 for(const name of ['missing-inventory-g1','missing-inventory-receipt']){const j=find(name);need(j.status==='completed'&&['success','failure'].includes(j.conclusion)&&j.steps.every(s=>s.status==='completed'),'terminal selected job required')}
 for(const j of jobs)if(!['missing-inventory-approval','missing-inventory-consume','missing-inventory-g1','missing-inventory-receipt'].includes(j.name))need(skipped(j),'terminal native/sibling/other job executed')
 return jobs
}
