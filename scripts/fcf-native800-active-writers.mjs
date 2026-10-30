// Bounded native-only census of active workflows that can write FCF inventory data.
import {FCF_INVENTORY_COORDINATION_FAMILY} from './fcf-inventory-source-coordination.mjs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
export const NATIVE800_ACTIVE_WRITER_STATUSES=Object.freeze(['in_progress','queued','requested','waiting','pending'])
export const NATIVE800_CLOSED_WORKFLOW_PATHS=Object.freeze(['.github/workflows/fcf-native800.yml','.github/workflows/fcf-g1-native800.yml'])
const writerWorkflows=new Set([...FCF_INVENTORY_COORDINATION_FAMILY,...NATIVE800_CLOSED_WORKFLOW_PATHS.map(p=>p.slice('.github/workflows/'.length))])
const nativeWorkflows=new Set(NATIVE800_CLOSED_WORKFLOW_PATHS)
const need=(value,code)=>{if(!value)throw Object.assign(Error('FCF_NATIVE800_ACTIVE_WRITERS: '+code),{activeWriterCode:code})}
const validSha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value)
const rootActor=value=>value?.id===25134229&&value.login==='nejcar20'&&value.type==='User'

function validateOwnRun(run){
 need(run&&Number.isSafeInteger(run.id)&&run.id>0&&run.run_attempt===1&&validSha(run.head_sha)&&nativeWorkflows.has(run.path)&&run.status==='in_progress'&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.repository?.full_name===repository&&run.head_repository?.full_name===repository&&rootActor(run.actor)&&rootActor(run.triggering_actor),'INVALID_CURRENT_NATIVE_RUN')
}
function validateListedRun(run,status){
 need(run&&Number.isSafeInteger(run.id)&&run.id>0&&Number.isSafeInteger(run.run_attempt)&&run.run_attempt>0&&validSha(run.head_sha)&&run.status===status&&run.repository?.full_name===repository&&run.head_repository?.full_name===repository,'INVALID_RUN_IDENTITY')
 need(typeof run.path==='string'&&/^\.github\/workflows\/[A-Za-z0-9._-]+\.ya?ml$/.test(run.path),'INVALID_WORKFLOW_PATH')
 return run.path.slice('.github/workflows/'.length)
}

async function statusRuns(github,status,seen){
 let total
 const rows=[]
 for(let page=1;page<=10;page++){
  let response
  try{response=await github(`repos/${repository}/actions/runs?status=${status}&per_page=100&page=${page}`)}catch{need(false,'CENSUS_API_FAILURE')}
  need(response&&Number.isSafeInteger(response.total_count)&&response.total_count>=0&&response.total_count<=1000&&Array.isArray(response.workflow_runs),'INVALID_CENSUS_RESPONSE')
  if(total===undefined)total=response.total_count
  need(response.total_count===total,'CENSUS_TOTAL_CHANGED')
  const expected=Math.max(0,Math.min(100,total-(page-1)*100))
  need(response.workflow_runs.length===expected,'INCOMPLETE_CENSUS_PAGE')
  for(const run of response.workflow_runs){
   const path=validateListedRun(run,status)
   need(!seen.has(run.id),'DUPLICATE_CENSUS_RUN')
   seen.add(run.id)
   rows.push({run,path})
  }
  if(page===Math.max(1,Math.ceil(total/100)))return rows
 }
 need(false,'CENSUS_PAGE_BOUND')
}

export async function assertNative800NoActiveWriters({github,ownRun}){
 need(typeof github==='function','FIXED_REPOSITORY_GETTER_REQUIRED')
 validateOwnRun(ownRun)
 const seen=new Set(),writerRuns=[]
 for(const status of NATIVE800_ACTIVE_WRITER_STATUSES){
  for(const {run,path} of await statusRuns(github,status,seen)){
   if(!writerWorkflows.has(path))continue
   const isOwn=run.path===ownRun.path&&nativeWorkflows.has(ownRun.path)&&run.id===ownRun.id&&run.run_attempt===ownRun.run_attempt&&run.head_sha===ownRun.head_sha&&run.status===ownRun.status&&run.event===ownRun.event&&run.head_branch===ownRun.head_branch&&run.repository?.full_name===ownRun.repository.full_name&&run.head_repository?.full_name===ownRun.head_repository.full_name&&rootActor(run.actor)&&rootActor(run.triggering_actor)
   if(isOwn)continue
   writerRuns.push(run)
  }
 }
 need(seen.has(ownRun.id)&&writerRuns.length===0,'ACTIVE_WRITER_OVERLAP')
 return {status:'CLEAR',observedRuns:seen.size,writerWorkflows:writerWorkflows.size}
}
