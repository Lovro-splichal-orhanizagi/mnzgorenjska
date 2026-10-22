import {repository} from './dfb-artifacts.mjs'
import {receiptSha256} from './viri/dfb-calendar.mjs'
import {dfbPolicyBinding,dfbHistoricalScope} from './dfb-historical-policy.mjs'
import {getHistoricalStatisticsPolicy} from './lib/historical-statistics-policy.mjs'
export const captureWorkflow='.github/workflows/preveri-dfb-ligo.yml'
export const replayWorkflow='.github/workflows/ponovi-dfb-regijo.yml'
export const policyReplayStep='Ponovi sezono s pregledano zgodovinsko politiko — brez omrežja in baze'
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
export function assertStrictCurrentCapture(capture,report){
 if(capture?.conclusion!=='success'||report&&(report.pripravljeno!==true||report.pokritost!==true||!Number.isSafeInteger(report.odigranih)||report.odigranih<1||report.zapisnikov!==report.odigranih||report.postavPo11!==2*report.odigranih||['napake','opozorila','cakajoci','klubiBrezVratarja'].some(k=>!Array.isArray(report[k])||report[k].length)))throw Error('Historical policy current capture must succeed with original strict-ready coverage')
}
export function isReviewedWestPrelaunchPolicy({slug,statisticsPolicy}={}){
 if(slug!=='de-regionalliga-west'||statisticsPolicy?.id!=='de-dfb-west-prelaunch-unavailable-v2')return false
 try{
  const expected=dfbPolicyBinding({slug,source:'dfb',source_policy:statisticsPolicy.id,firstFantasyPlayedOn:statisticsPolicy.firstFantasyPlayedOn})
  return JSON.stringify(expected)===JSON.stringify(statisticsPolicy)&&getHistoricalStatisticsPolicy(slug).entries.every(e=>e.playedOn<statisticsPolicy.firstFantasyPlayedOn)
 }catch{return false}
}
// A failed current capture is allowed only for the exact registered West v2
// prelaunch defects. Full offline replay independently checks their raw bytes,
// authentic strict diagnostics and every remaining report before release.
export function assertPolicyCurrentCapture(capture,report,scope){
 if(!isReviewedWestPrelaunchPolicy(scope))return assertStrictCurrentCapture(capture,report)
 const fail=()=>{throw Error('Reviewed West current capture must contain exactly the two prelaunch semantic failures')}
 if(capture?.conclusion!=='failure')fail()
 if(!report)return
 const policy=getHistoricalStatisticsPolicy(scope.slug),facts=dfbHistoricalScope(scope.slug),entries=policy.entries.filter(e=>e.season==='2026/27')
 if(JSON.stringify(entries.map(e=>e.sourceMatchId).sort())!==JSON.stringify(['2425409','2425474']))fail()
 const expected=[...entries.map(e=>`nepopoln de-dfb-${e.sourceMatchId}: ${facts.documents[e.sourceMatchId].strictDiagnostic}`),...entries.map(e=>`manjka zapisnik: ${JSON.stringify([e.sourceRound,facts.clubNames[e.homeSourceClubId],facts.clubNames[e.awaySourceClubId]])}`),`odigranih ${report.odigranih}, zapisnikov ${report.zapisnikov}`]
 if(report.vir!=='dfb'||report.koda!=='regionalliga-west/2026-2027'||report.sezona!=='2026/27'||report.krogov!==34||report.klubov!==18||report.pripravljeno!==false||report.pokritost!==false||!Number.isSafeInteger(report.odigranih)||report.odigranih<2||report.zapisnikov!==report.odigranih-2||report.postavPo11!==2*report.zapisnikov||report.prenesenih!==18+report.odigranih||Object.hasOwn(report,'status')||Object.hasOwn(report,'zavrnitev')||['opozorila','cakajoci','klubiBrezVratarja'].some(k=>!Array.isArray(report[k])||report[k].length)||!Array.isArray(report.napake)||JSON.stringify([...report.napake].sort())!==JSON.stringify(expected.sort()))fail()
}
export function verifyCaptureExecution(run,jobs,{runId,commit,slug,season,historical=false,statisticsPolicy}){
 scope(slug,season)
 const job=actualJob(run,jobs,{runId,commit,workflow:captureWorkflow,name:'DFB regionalni audit'}),steps=job.steps?.filter(s=>s.name===captureStep(season))??[],uploads=job.steps?.filter(s=>s.name===captureUpload(season))??[]
 if(steps.length!==1||steps[0].status!=='completed'||!['success','failure'].includes(steps[0].conclusion)||uploads.length!==1||uploads[0].status!=='completed'||uploads[0].conclusion!=='success'||job.steps.some(s=>s.conclusion==='failure'&&!['2025/26','2026/27'].map(captureStep).includes(s.name)))throw Error('Invalid completed capture parent/season/upload')
 if(historical&&season==='2026/27'){
  const expected=isReviewedWestPrelaunchPolicy({slug,statisticsPolicy})?'failure':'success'
  if(run.conclusion!==expected||job.conclusion!==expected)throw Error('Historical policy current capture job must succeed or match the exact reviewed West prelaunch policy')
  assertPolicyCurrentCapture(steps[0],undefined,{slug,statisticsPolicy})
 }
 return {runId,jobId:String(job.id),commit,workflow:captureWorkflow,step:captureStep(season),conclusion:steps[0].conclusion}
}
export function verifyReplayExecution(run,jobs,{runId,commit,historical=false}){
 const job=actualJob(run,jobs,{runId,commit,workflow:replayWorkflow,name:'DFB regionalni replay'}),steps=job.steps?.filter(s=>s.name===(historical?policyReplayStep:replayStep))??[]
 if(run.conclusion!=='success'||job.conclusion!=='success'||steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='success')throw Error('Invalid successful replay job/step')
 return {runId,jobId:String(job.id),commit,workflow:replayWorkflow,step:historical?policyReplayStep:replayStep}
}
export function verifyLineage(s,m){
 const l=s.lineage,c=l?.capture,r=l?.replay,historical=m.version===3||m.version===4&&m.statisticsPolicy!=null
 const execution=x=>x&&/^[1-9]\d{0,19}$/.test(x.runId)&&/^[1-9]\d{0,19}$/.test(x.jobId)&&/^[a-f0-9]{40}$/.test(x.commit)&&/^[a-f0-9]{64}$/.test(x.workflowSha256)&&/^[a-f0-9]{64}$/.test(x.parserSha256)&&/^[1-9]\d{0,19}$/.test(x.artifactId)&&/^sha256:[a-f0-9]{64}$/.test(x.artifactDigest)
 if(!execution(c)||!execution(r)||c.workflow!==captureWorkflow||r.workflow!==replayWorkflow||c.step!==captureStep(s.season)||r.step!==(historical?policyReplayStep:replayStep)||!['success','failure'].includes(c.conclusion)||c.runId===r.runId||r.runId!==s.runId||r.jobId!==s.jobId||r.commit!==m.sourceCommit||r.parserSha256!==m.parserSha256||!/^[a-f0-9]{64}$/.test(c.indexSha256)||c.documentsSha256!==s.documentsSha256||c.capturedAt!==s.capturedAt||!Number.isFinite(Date.parse(r.generatedAt))||Date.parse(r.generatedAt)<Date.parse(c.capturedAt)||Date.parse(r.generatedAt)>Date.now()+300000)throw Error('Invalid regional replay lineage')
 if(historical&&s.season==='2026/27')assertPolicyCurrentCapture(c,undefined,m)
 if(historical&&((m.version===3?m.slug!=='de-regionalliga-suedwest':!/^de-regionalliga-(nord|west)$/.test(m.slug)||m.calendarReceiptSha256!==receiptSha256)||m.provenanceVersion!==2||s.evidenceMode!=='policy-replay'||r.statisticsPolicyId!==m.statisticsPolicy?.id||r.statisticsPolicySha256!==m.statisticsPolicy?.sha256||r.firstFantasyPlayedOn!==m.statisticsPolicy?.firstFantasyPlayedOn))throw Error('Invalid historical policy replay binding')
 return l
}
