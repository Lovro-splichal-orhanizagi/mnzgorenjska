// Live unfiltered histories close post-baseline retry coverage. Historical
// requests remain in the accepted 3020 receipt; this module never refunds them.
import {isDeepStrictEqual as same} from 'node:util'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',prefix='repos/'+repository+'/',boundary='2026-10-28T20:15:01Z',cut=Date.parse(boundary)
export const badenR10HistoryFamilies=Object.freeze(['preveri-fussball-vzorec.yml','preveri-fussball-sezono.yml','preveri-fussball-dopolni.yml','preveri-fussball-paket.yml','preveri-baden-fresh-pair.yml','preveri-baden-r10-current.yml','uvoz-fussball-public.yml','uvoz-pl-de-paketa.yml','preveri-nova-vira.yml','diagnostika-javnih-virov.yml','uvoz-lige.yml','uvoz-zapisnikov.yml','ci.yml'])
const need=(v,c,id)=>{if(!v)throw Object.assign(Error('BADEN_HISTORY_'+c),{code:'BADEN_HISTORY_'+c,dataHold:true,runId:id==null?null:String(id)})}
const before=t=>Number.isFinite(Date.parse(t))&&Date.parse(t)<cut
const projection=r=>Object.fromEntries(['id','run_attempt','head_sha','path','created_at','updated_at','status','conclusion'].map(k=>[k,r[k]]))
function identity(r,workflow){need(Number.isSafeInteger(r?.id)&&r.id>0&&Number.isSafeInteger(r.run_attempt)&&r.run_attempt>=1&&r.run_attempt<=16&&/^[a-f0-9]{40}$/.test(r.head_sha??'')&&r.path==='.github/workflows/'+workflow&&r.repository?.full_name===repository&&r.head_repository?.full_name===repository&&Number.isFinite(Date.parse(r.created_at))&&Number.isFinite(Date.parse(r.updated_at)),'RUN_IDENTITY',r?.id)}
export async function readBadenR10FamilyHistory(input){
 need(input&&Object.keys(input).sort().join(',')==='github'&&typeof input.github==='function','INPUT')
 const families=[],olderRuns=[],overlapRuns=[],laterRuns=[],observations=[]
 for(const workflow of badenR10HistoryFamilies){
  const runs=[];let total=null
  for(let page=1;page<=50;page++){
   const path=prefix+`actions/workflows/${workflow}/runs?per_page=100&page=${page}`,v=await input.github(path)
   need(Number.isSafeInteger(v?.total_count)&&v.total_count>=0&&v.total_count<=5000&&(total===null||v.total_count===total)&&Array.isArray(v.workflow_runs)&&v.workflow_runs.length===Math.min(100,v.total_count-runs.length),'COMPLETE_FAMILY')
   total=v.total_count;runs.push(...v.workflow_runs)
   if(runs.length===total)break
  }
  need(runs.length===total&&new Set(runs.map(r=>r.id)).size===total,'UNIQUE_FAMILY')
  const family={workflow,totalCount:total,runs:runs.map(projection)};families.push(family)
  for(const r of runs){identity(r,workflow)
   if(!before(r.created_at)){laterRuns.push(r);continue}
   if(!before(r.updated_at)||r.status!=='completed'){overlapRuns.push(r);continue}
   if(['uvoz-lige.yml','uvoz-zapisnikov.yml','ci.yml'].includes(workflow)){olderRuns.push({runId:String(r.id),family:workflow,latestAttempt:r.run_attempt,closure:'LATEST_ATTEMPT_TERMINAL_BEFORE_BOUNDARY',additionalPostBoundaryAttempts:0});continue}
   const path=prefix+'actions/runs/'+r.id,live=await input.github(path);identity(live,workflow)
   need(same(projection(live),projection(r))&&live.status==='completed'&&before(live.updated_at),'LATEST_ATTEMPT_DRIFT',r.id);observations.push({path,value:live})
   for(let attempt=1;attempt<=live.run_attempt;attempt++){
    const jp=path+`/attempts/${attempt}/jobs?per_page=100&page=1`,js=await input.github(jp)
    need(Number.isSafeInteger(js?.total_count)&&js.total_count>=0&&js.total_count<=100&&Array.isArray(js.jobs)&&js.jobs.length===js.total_count&&new Set(js.jobs.map(j=>j.id)).size===js.total_count,'COMPLETE_ATTEMPT',r.id)
    for(const j of js.jobs){need(j.run_id===r.id&&j.run_attempt===attempt&&j.head_sha===r.head_sha&&j.status==='completed'&&before(j.started_at)&&before(j.completed_at)&&Array.isArray(j.steps)&&new Set(j.steps.map(s=>s.number)).size===j.steps.length&&j.steps.every(s=>s.status==='completed'&&before(s.started_at)&&before(s.completed_at)),'POST_BOUNDARY_OR_UNKNOWN_JOB',r.id)}
    observations.push({path:jp,value:js})
   }
   olderRuns.push({runId:String(r.id),family:workflow,head:r.head_sha,latestAttempt:r.run_attempt,closure:'ALL_ACTUAL_ATTEMPTS_COMPLETED_BEFORE_BOUNDARY',additionalPostBoundaryAttempts:0})
  }
 }
 return {version:1,kind:'live-baden-pre-baseline-retry-closure',boundary,complete:true,families,olderRuns,overlapRuns,laterRuns,observations,sourceOperationAuthorized:false}
}
