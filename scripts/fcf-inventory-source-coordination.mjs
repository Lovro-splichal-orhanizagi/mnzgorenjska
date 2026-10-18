// Conservative GitHub-only ES source coordinator. No Supabase dependency.
import {execFileSync} from 'node:child_process'
import {inventoryFail as fail,nativeId,validUTC,commitId,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
const clearedSlots=new WeakSet()
export function requireFcfInventorySourceSlot(proof){if(!clearedSlots.has(proof))fail('authenticated actual source clearance required');return proof}
export const FCF_INVENTORY_COORDINATION_FAMILY=Object.freeze(['fcf-javni-dokazi.yml','uvoz-fcf-zgodovina.yml','uvoz-zapisnikov.yml','uvoz-lige.yml','uvoz-dfb-regije.yml','vklop-dfb-regije.yml','vklop-katalonije.yml','vklop-obstojecih-lig.yml','uskladi-pozicije.yml','izstop-kluba.yml','cene-lig.yml','zdruzi-klube.yml','tedensko-cene.yml','razdeli-zlite-igralce.yml','grbi.yml'])
async function pages(read,key){const items=[];let count=null;for(let page=1;page<=100;page++){const response=await read(page);if(!response||!Number.isSafeInteger(response.total_count)||response.total_count<0||response.total_count>10000||!Array.isArray(response[key])||response[key].length>100||count!==null&&count!==response.total_count)fail('incomplete GitHub coordination pagination');count=response.total_count;items.push(...response[key]);if(items.length===count)return items;if(items.length>count||response[key].length<100)fail('incomplete GitHub coordination page')}fail('GitHub coordination page bound exceeded')}
function older(run,execution){if(!nativeId(String(run.id))||typeof run.status!=='string')fail('unknown coordination execution');if(String(run.id)===execution.runId||run.status==='completed')return false;const stamp=run.run_started_at??run.created_at;if(!validUTC(stamp))fail('unknown source run ordering');return Date.parse(stamp)<Date.parse(execution.startedUTC)||Date.parse(stamp)===Date.parse(execution.startedUTC)&&BigInt(run.id)<BigInt(execution.runId)}
function completeNightlyES(jobs){
 const es=jobs.filter(j=>/^uvoz ES(?:\s|$)/.test(j.name??''))
 if(!es.length||es.some(j=>!nativeId(String(j.id))||j.status!=='completed')||new Set(es.map(j=>String(j.id))).size!==es.length)return false
 if(es.length===1&&es[0].name==='uvoz ES')return true
 const shards=es.map(j=>/^uvoz ES ([1-9]\d*)\/([1-9]\d*)$/.exec(j.name)),total=Number(shards[0]?.[2])
 return Number.isSafeInteger(total)&&total<=10000&&es.length===total&&shards.every(m=>m&&Number(m[2])===total&&Number(m[1])<=total)&&new Set(shards.map(m=>m[1])).size===total
}
export async function waitForFcfInventorySourceSlot({execution,listRuns,listJobs,pause=ms=>new Promise(r=>setTimeout(r,ms)),clock=Date.now,maximumWaitMinutes=300}){
 if(!execution||execution.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||execution.workflow!=='.github/workflows/uvoz-fcf-zgodovina.yml'||execution.ref!=='refs/heads/main'||execution.runAttempt!=='1'||!nativeId(execution.runId)||!commitId(execution.sourceCommit)||!validUTC(execution.startedUTC)||typeof listRuns!=='function'||typeof listJobs!=='function'||!Number.isInteger(maximumWaitMinutes)||maximumWaitMinutes<1||maximumWaitMinutes>300)fail('exact source-only ES coordination execution required')
 const start=clock();if(!Number.isFinite(start))fail('finite coordination clock required')
 for(;;){let held=false;try{for(const workflow of FCF_INVENTORY_COORDINATION_FAMILY){const runs=await pages(page=>listRuns(workflow,page),'workflow_runs'),seen=new Set();for(const run of runs){if(seen.has(String(run.id)))fail('duplicate GitHub coordination run');seen.add(String(run.id));if(!older(run,execution))continue;const title=run.display_title??''
   // Fixed existing-data registry excludes ES/DE/HR and this workflow never reads a provider.
   if(workflow==='vklop-obstojecih-lig.yml')continue
   if(workflow==='uvoz-fcf-zgodovina.yml'&&/^FCF history (?:cache-export|seed-stage) /.test(title))continue
   if(workflow==='grbi.yml'&&/^Grbi klubov (?!fcf$)[a-z0-9-]+$/.test(title))continue
   if(workflow==='uvoz-zapisnikov.yml'){const jobs=await pages(page=>listJobs(String(run.id),page),'jobs'),esComplete=completeNightlyES(jobs);if(esComplete)continue}
   held=true
  }}}catch{fail('GitHub source coordination unknown; source held')}
  if(!held){const proof=frozenJSON({kind:'fcf-inventory-source-slot',status:'clear',runId:execution.runId,runAttempt:'1',sourceCommit:execution.sourceCommit,clearedUTC:new Date(clock()).toISOString()});clearedSlots.add(proof);return proof}
  const elapsed=clock()-start;if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=maximumWaitMinutes*60000)fail('older ES source/writer remains; source held')
  await pause(Math.min(180000,maximumWaitMinutes*60000-elapsed))
 }
}
const github=path=>{try{return JSON.parse(execFileSync('gh',['api','--method','GET',`repos/Lovro-splichal-orhanizagi/mnzgorenjska/${path}`],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']}))}catch{fail('authenticated GitHub coordination unavailable')}}
export async function runFcfInventorySourceCoordinatorCLI({args,env}){
 if(args.join(' ')!=='--fcf-inventory-source-only --drzava ES --najvec 300'||env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||!nativeId(env.GITHUB_RUN_ID)||!commitId(env.GITHUB_SHA))fail('source-only coordinator accepts exact Actions ES mode')
 const run=github(`actions/runs/${env.GITHUB_RUN_ID}`)
 if(String(run.id)!==env.GITHUB_RUN_ID||run.head_sha!==env.GITHUB_SHA||run.run_attempt!==1||run.path!=='.github/workflows/uvoz-fcf-zgodovina.yml'||run.status!=='in_progress')fail('actual running reserved history run required')
 await waitForFcfInventorySourceSlot({execution:{repository:env.GITHUB_REPOSITORY,workflow:run.path,ref:env.GITHUB_REF,sourceCommit:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:'1',startedUTC:run.run_started_at??run.created_at},listRuns:async(w,p)=>github(`actions/workflows/${w}/runs?per_page=100&page=${p}`),listJobs:async(id,p)=>github(`actions/runs/${id}/jobs?per_page=100&page=${p}`)})
 return 0
}
