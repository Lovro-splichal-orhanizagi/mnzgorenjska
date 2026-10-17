import {repository} from './dfb-artifacts.mjs'
export const captureWorkflow='.github/workflows/preveri-dfb-ligo.yml'
export const replayWorkflow='.github/workflows/ponovi-dfb-regijo.yml'
export const replayStep='Ponovi sezono — brez omrežja in baze'
export const captureStep=season=>season==='2025/26'?'Arhiv sezona — brez baze':'Tekoča sezona — brez baze'
export const captureUpload=season=>season==='2025/26'?'Arhiv sezona — dokazi in surovi dokumenti':'Tekoča sezona — dokazi in surovi dokumenti'
export function scope(slug,season){
 if(!/^de-regionalliga-(nord|west|suedwest|bayern)$/.test(slug)||!['2025/26','2026/27'].includes(season))throw Error('Invalid replay scope')
 return {code:`${slug.slice(3)}/${season.slice(0,4)}-20${season.slice(-2)}`,name:`vir-dfb-${slug.slice(3)}-${season.slice(0,4)}`,replayName:`dfb-regional-replay-${slug.slice(3)}-${season.slice(0,4)}`}
}
function actualJob(run,jobs,{runId,commit,workflow,name,running=false}){
 const matches=jobs?.filter(j=>j.name===name)??[],job=matches[0]
 if(!/^[1-9]\d{0,19}$/.test(runId)||!/^[a-f0-9]{40}$/.test(commit)||String(run.id)!==runId||run.repository?.full_name!==repository||run.path!==workflow||run.event!=='workflow_dispatch'||run.head_sha!==commit||run.status!==(running?'in_progress':'completed')||!(running?[null]:['success','failure']).includes(run.conclusion)||matches.length!==1||!Number.isSafeInteger(job.id)||String(job.run_id)!==runId||job.head_sha!==commit||job.status!==(running?'in_progress':'completed')||!(running?[null]:['success','failure']).includes(job.conclusion))throw Error('Invalid actual capture/replay execution')
 return job
}
export function verifyRunningReplay(run,jobs,{runId,commit}){
 const job=actualJob(run,jobs,{runId,commit,workflow:replayWorkflow,name:'DFB regionalni replay',running:true})
 return {runId,jobId:String(job.id),commit}
}
export function verifyCaptureExecution(run,jobs,{runId,commit,slug,season}){
 scope(slug,season)
 const job=actualJob(run,jobs,{runId,commit,workflow:captureWorkflow,name:'DFB regionalni audit'}),steps=job.steps?.filter(s=>s.name===captureStep(season))??[],uploads=job.steps?.filter(s=>s.name===captureUpload(season))??[]
 if(steps.length!==1||steps[0].status!=='completed'||!['success','failure'].includes(steps[0].conclusion)||uploads.length!==1||uploads[0].status!=='completed'||uploads[0].conclusion!=='success'||job.steps.some(s=>s.conclusion==='failure'&&!['2025/26','2026/27'].map(captureStep).includes(s.name)))throw Error('Invalid completed capture parent/season/upload')
 return {runId,jobId:String(job.id),commit,workflow:captureWorkflow,step:captureStep(season),conclusion:steps[0].conclusion}
}
export function verifyReplayExecution(run,jobs,{runId,commit}){
 const job=actualJob(run,jobs,{runId,commit,workflow:replayWorkflow,name:'DFB regionalni replay'}),steps=job.steps?.filter(s=>s.name===replayStep)??[]
 if(run.conclusion!=='success'||job.conclusion!=='success'||steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='success')throw Error('Invalid successful replay job/step')
 return {runId,jobId:String(job.id),commit,workflow:replayWorkflow,step:replayStep}
}
export function verifyLineage(s,m){
 const l=s.lineage,c=l?.capture,r=l?.replay
 const execution=x=>x&&/^[1-9]\d{0,19}$/.test(x.runId)&&/^[1-9]\d{0,19}$/.test(x.jobId)&&/^[a-f0-9]{40}$/.test(x.commit)&&/^[a-f0-9]{64}$/.test(x.workflowSha256)&&/^[a-f0-9]{64}$/.test(x.parserSha256)&&/^[1-9]\d{0,19}$/.test(x.artifactId)&&/^sha256:[a-f0-9]{64}$/.test(x.artifactDigest)
 if(!execution(c)||!execution(r)||c.workflow!==captureWorkflow||r.workflow!==replayWorkflow||c.step!==captureStep(s.season)||r.step!==replayStep||!['success','failure'].includes(c.conclusion)||c.runId===r.runId||r.runId!==s.runId||r.jobId!==s.jobId||r.commit!==m.sourceCommit||r.parserSha256!==m.parserSha256||!/^[a-f0-9]{64}$/.test(c.indexSha256)||c.documentsSha256!==s.documentsSha256||c.capturedAt!==s.capturedAt||!Number.isFinite(Date.parse(r.generatedAt))||Date.parse(r.generatedAt)<Date.parse(c.capturedAt)||Date.parse(r.generatedAt)>Date.now()+300000)throw Error('Invalid regional replay lineage')
 return l
}
