import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { configuration, sourceFiles, parserSha256 } from './vklopi-dfb-regijo.mjs'
import {githubJson,downloadArtifact,writeArtifact} from './dfb-artifacts.mjs'
import {scope,captureWorkflow,replayWorkflow,policyReplayStep,verifyReplayExecution,verifyLineage} from './dfb-replay-proof.mjs'
import {dfbPolicyBinding} from './dfb-historical-policy.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {obtainCapture,replaySnapshot,workflowHash} from './ponovi-dfb-regijo.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska'
export function preveriZagon(run,id,commit,{slug,season,jobs}){
 configuration(slug,season)
 const matches=jobs?.filter(j=>j.name==='DFB regionalni audit')??[],j=matches[0],name=season==='2025/26'?'Arhiv sezona — brez baze':'Tekoča sezona — brez baze',steps=j?.steps?.filter(s=>s.name===name)??[]
 if(!/^[1-9]\d{0,19}$/.test(id)||!/^[a-f0-9]{40}$/.test(commit)||String(run.id)!==id||run.head_sha!==commit||run.repository?.full_name!==repo||run.path!=='.github/workflows/preveri-dfb-ligo.yml'||run.event!=='workflow_dispatch'||run.status!=='completed'||!['success','failure','cancelled'].includes(run.conclusion)||matches.length!==1||!Number.isSafeInteger(j.id)||String(j.run_id)!==id||j.head_sha!==commit||j.status!=='completed'||j.conclusion!=='success'||steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='success')throw Error('Invalid regional capture provenance/job/season step')
 return {season,runId:id,jobId:String(j.id),captureCommit:commit,seasonJobPassed:true}
}
export function verifyReplayRecord(record,{slug,season,actual,artifact,workflowSha256,parserSha256,historical=false}){
 if(record?.version!==(historical?2:1)||record.slug!==slug||record.season!==season||record.replay?.runId!==actual.runId||record.replay.jobId!==actual.jobId||record.replay.commit!==actual.commit||record.replay.workflowSha256!==workflowSha256||record.replay.parserSha256!==parserSha256)throw Error('Replay artifact scope/execution/code mismatch')
 if(historical&&JSON.stringify(dfbPolicyBinding({slug,source:'dfb',source_policy:record.statisticsPolicy?.id,firstFantasyPlayedOn:record.statisticsPolicy?.firstFantasyPlayedOn}))!==JSON.stringify(record.statisticsPolicy))throw Error('Replay historical policy differs')
 const policyFields=historical?{statisticsPolicyId:record.statisticsPolicy.id,statisticsPolicySha256:record.statisticsPolicy.sha256,firstFantasyPlayedOn:record.statisticsPolicy.firstFantasyPlayedOn}:{}
 if(historical&&Object.entries(policyFields).some(([k,v])=>record.replay[k]!==v)||record.replay.step!=null&&record.replay.step!==actual.step)throw Error('Replay policy execution binding differs')
 const lineage={capture:record.capture,replay:{...actual,...policyFields,workflowSha256,parserSha256,artifactId:artifact.id,artifactDigest:artifact.digest,generatedAt:record.replay.generatedAt}}
 verifyLineage({season,runId:actual.runId,jobId:actual.jobId,capturedAt:record.capture?.capturedAt,documentsSha256:record.capture?.documentsSha256,lineage,...(historical?{evidenceMode:'policy-replay'}:{})},{sourceCommit:actual.commit,parserSha256,...(historical?{version:3,slug,provenanceVersion:2,statisticsPolicy:record.statisticsPolicy}:{})})
 return lineage
}
const writerFiles=['uvoz-zapisnikov','uvoz-razporeda','lazni-vratarji','ugani-pozicije','ovrednoti-igralce'].flatMap(name=>zaprtje(`scripts/${name}.mjs`))
export const replayFiles=[...new Set([...writerFiles,...sourceFiles,'scripts/viri/index.mjs','scripts/uvoz-zapisnikov.mjs','supabase/migrations/20261018180100_dfb_historical_statistics_v3.sql','supabase/migrations/20261018223000_dfb_reviewed_calendar_v4.sql','scripts/vklopi-nemcijo.mjs','scripts/dfb-artifacts.mjs','scripts/dfb-replay-proof.mjs','scripts/ponovi-dfb-regijo.mjs','scripts/preveri-zagona-dfb-regije.mjs','scripts/vklopi-dfb-regijo.mjs','scripts/dfb-offline.mjs','scripts/uvozi-dfb-regijo.mjs','scripts/dfb-current-reactivation.mjs','scripts/reconcile-dfb-current-players.mjs','scripts/policies/dfb-current-reactivation-20261018.json','supabase/migrations/20261018210000_dfb_current_player_reactivation.sql',replayWorkflow,'.github/workflows/uvoz-dfb-regije.yml','.github/workflows/vklop-dfb-regije.yml'])]
export function verifyCode(commit,version){
 if(!/^[a-f0-9]{40}$/.test(commit)||![1,2,3].includes(version))throw Error('Invalid reviewed code identity')
 execFileSync('git',['diff','--exit-code',commit,'--',...(version>=2?replayFiles:sourceFiles)],{stdio:'pipe'})
}
export async function verifySeason({slug,season,id,commit,dir}){
 scope(slug,season)
 if(!/^[1-9]\d{0,19}$/.test(id??'')||!/^[a-f0-9]{40}$/.test(commit??''))throw Error('Invalid run/commit')
 const run=githubJson(`actions/runs/${id}`),listing=githubJson(`actions/runs/${id}/jobs?per_page=100`),jobs=listing.jobs
 if(listing.total_count!==jobs?.length)throw Error('Incomplete actual job listing')
 if(run.path===captureWorkflow){
  const proof=preveriZagon(run,id,commit,{slug,season,jobs})
  const downloaded=downloadArtifact({runId:id,commit,name:scope(slug,season).name,kind:'capture'})
  writeArtifact(downloaded.files,dir);return {version:1,proof}
 }
 const historical=jobs.some(j=>j.steps?.some(s=>s.name===policyReplayStep&&s.conclusion==='success'))
 const actual=verifyReplayExecution(run,jobs,{runId:id,commit,historical}),downloaded=downloadArtifact({runId:id,commit,name:scope(slug,season).replayName,kind:'replay'})
 const record=JSON.parse(downloaded.files.get('replay.json')??'null'),lineage=verifyReplayRecord(record,{slug,season,actual,artifact:downloaded.artifact,workflowSha256:workflowHash(commit,replayWorkflow),parserSha256:parserSha256(),historical})
 // Re-fetch actual parent metadata/artifact independently; never trust artifact claims.
 const capture=obtainCapture({slug,season,runId:lineage.capture.runId,commit:lineage.capture.commit,dir,expected:lineage.capture,historical})
 const regenerated=await replaySnapshot({dir,slug,season,capture,statisticsPolicy:historical?record.statisticsPolicy:undefined})
 for(const [file,value]of[['razpored.json',regenerated.schedule],['zapisniki.json',regenerated.reports]]){
  if(JSON.stringify(JSON.parse(downloaded.files.get(file)??'null'))!==JSON.stringify(value))throw Error(`Replay artifact ${file} differs from full strict replay`)
 }
 const summary=JSON.parse(downloaded.files.get('summary.json')??'null')
 if(summary?.slug!==slug||summary.season!==season||summary.generatedAt!==lineage.replay.generatedAt||(historical?(summary.strictCoverage!=null||summary.policyCoverage!==true||summary.strictStatisticsCoverage!==regenerated.checked.statisticsCoverage.strictStatisticsCoverage||JSON.stringify(summary.statisticsPolicy)!==JSON.stringify(record.statisticsPolicy)||JSON.stringify(summary.statisticsCoverage)!==JSON.stringify(regenerated.checked.statisticsCoverage)):summary.strictCoverage!==true)||summary.fixtures!==regenerated.checked.fixtures.length||summary.reports!==regenerated.reports.length||Object.entries(regenerated.binding).some(([k,v])=>summary[k]!==v))throw Error('Replay coverage summary mismatch')
 return {version:historical?3:2,...(historical?{statisticsPolicy:record.statisticsPolicy}:{}),proof:{season,runId:id,jobId:actual.jobId,captureCommit:commit,seasonJobPassed:true,lineage}}
}
async function main(){
 const [slug,commit,archive,current,out,archiveDir,currentDir]=process.argv.slice(2)
 configuration(slug)
 if(process.env.GITHUB_REPOSITORY!==repo||!/^[a-f0-9]{40}$/.test(commit??'')||!out||!archiveDir||!currentDir)throw Error('Invalid repository/commit/output/directories')
 const results=[]
 for(const [season,id,dir]of[['2025/26',archive,archiveDir],['2026/27',current,currentDir]])results.push(await verifySeason({slug,season,id,commit,dir}))
 if(results[0].version!==results[1].version)throw Error('Mixed direct and replay executions are not supported')
 const version=results[0].version
 if(version===3&&JSON.stringify(results[0].statisticsPolicy)!==JSON.stringify(results[1].statisticsPolicy))throw Error('Mixed historical policies are not supported')
 verifyCode(commit,/^de-regionalliga-(nord|west)$/.test(slug)?2:version)
 writeFileSync(out,JSON.stringify({version,...(version===3?{statisticsPolicy:results[0].statisticsPolicy}:{}),slug,sourceCommit:commit,sourceFilesIdentical:true,proof:results.map(r=>r.proof)})+'\n')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
