// Closed historical zero-source witnesses, not a source/accounting capability.
// Immutable reviewed Git heads bind the offline-inspected workflow commands and
// closures. Runtime authenticates fresh complete run/all-attempt job metadata;
// it does not download hundreds of unchanged code blobs for each recheck.
import {readFileSync} from 'node:fs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {inventoryFail as fail,rawSha256,frozenJSON,nativeId} from './fcf-missing-inventory-artifact.mjs'
const bytes=readFileSync(new URL('./fcf-g1-historical-zero-registry.json',import.meta.url))
if(rawSha256(bytes)!=='ad3d11bea137536204a7e0e7cc7ed3d9be925a038566c5875f0261081f0f099d')fail('historical zero registry body changed; held')
const registry=frozenJSON(JSON.parse(bytes)),headerKeys=['id','path','event','head_branch','head_sha','run_attempt','observedAttempt','status','conclusion','actor','triggering_actor','display_title','workflow_id','repository','head_repository','created_at','run_started_at']
function header(h){
 const value=Object.fromEntries(headerKeys.map(k=>[k,h[k]]))
 for(const k of ['actor','triggering_actor'])value[k]=Object.fromEntries(['login','id','type'].map(q=>[q,h[k]?.[q]]))
 for(const k of ['repository','head_repository'])value[k]={full_name:h[k]?.full_name}
 return value
}
function jobs(h){
 if(!Array.isArray(h.jobs)||new Set(h.jobs.map(j=>String(j.id))).size!==h.jobs.length)fail('incomplete historical job inventory held')
 return h.jobs.map(j=>{
  if(!nativeId(String(j.id))||!Array.isArray(j.steps)||new Set(j.steps.map(s=>s.number)).size!==j.steps.length)fail('incomplete historical job/step inventory held')
  return {...Object.fromEntries(['id','run_id','run_attempt','head_sha','name','status','conclusion'].map(k=>[k,j[k]])),steps:j.steps.map(s=>Object.fromEntries(['number','name','status','conclusion'].map(k=>[k,s[k]]))).sort((a,b)=>a.number-b.number)}
 }).sort((a,b)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0)
}
export function assertReviewedFcfG1HistoricalZero(h){
 const row=registry.executions.find(r=>r.runId===String(h?.id)&&r.head===h.head_sha)
 if(!row||!registry.heads[row.head]||h.run_attempt!==1||h.observedAttempt!==1||h.status!=='completed')fail('unreviewed historical run/head/attempt held')
 let headerSHA,jobsSHA
 try{headerSHA=hash(header(h));jobsSHA=hash(jobs(h))}catch{fail('incomplete historical metadata held')}
 if(headerSHA!==row.headerSha256||jobsSHA!==row.jobsSha256)fail('historical complete execution differs; held')
 // Only the compiled immutable reviewed body/command/closure bindings can make
 // this exact completed execution a witness. There is no caller override list.
 for(const executed of row.executed)for(const ref of executed.commandRefs){const command=registry.commands[ref],closure=registry.closures[command?.closureSha256];if(!command||!closure||!registry.heads[row.head].commands.includes(ref)||hash(command)!==ref||hash(closure)!==command.closureSha256)fail('historical reviewed closure binding differs; held')}
}
const aliases=Object.freeze({
 "inputs.preset == 'six-reviewed-continuation-v1' && 'missing-inventory-g9' || 'missing-inventory-g1'":'missing-inventory-g1',
 "inputs.preset == 'six-reviewed-continuation-v1' && 'missing-inventory-g1' || 'missing-inventory-g9'":'missing-inventory-g9',
 'inputs.mode':'missing-inventory',
})
/** Current own-run name DATA only. Known expressions are aliases exclusively
 * when GitHub conclusively skipped the job under this exact reviewed YAML. */
export function normalizeFcfG1CurrentSkippedJobs(input){
 if(rawSha256(readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url)))!==registry.currentWorkflowSha256||!Array.isArray(input))fail('reviewed current workflow/job inventory differs; held')
 return input.map(j=>{
  if(!Object.hasOwn(aliases,j.name))return j
  if(j.status!=='completed'||j.conclusion!=='skipped'||!Array.isArray(j.steps)||j.steps.some(s=>s.status!=='completed'||s.conclusion!=='skipped'))fail('executed or incomplete skipped-name alias held')
  return {...j,name:aliases[j.name]}
 })
}
