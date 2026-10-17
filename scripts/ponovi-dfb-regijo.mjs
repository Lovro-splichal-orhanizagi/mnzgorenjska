// A new actual Actions execution over immutable original captures, without DB/source HTTP.
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import vir from './viri/dfb.mjs'
import {configuration,sourceFiles,parserSha256,preveriPosnetek,sestaviSezono} from './vklopi-dfb-regijo.mjs'
import {sha256,githubJson,downloadArtifact,writeArtifact} from './dfb-artifacts.mjs'
import {scope,verifyCaptureExecution,verifyRunningReplay,captureWorkflow,replayWorkflow} from './dfb-replay-proof.mjs'
export function workflowHash(commit,path){
 if(!/^[a-f0-9]{40}$/.test(commit)||![captureWorkflow,replayWorkflow].includes(path))throw Error('Invalid workflow identity')
 const original=execFileSync('git',['show',`${commit}:${path}`])
 if(!original.equals(readFileSync(path)))throw Error('Capture/replay workflow differs from reviewed implementation')
 return sha256(original)
}
export function parserHashAt(commit){
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid parser commit')
 return sha256(JSON.stringify(sourceFiles.map(path=>[path,sha256(execFileSync('git',['show',`${commit}:${path}`]))])))
}
export function readClosedCapture(dir,slug,season,expected={}){
 const conf=configuration(slug,season),index=readFileSync(resolve(dir,'prenosi.json')),records=JSON.parse(index),snapshot=preveriPosnetek(dir,records),report=JSON.parse(readFileSync(resolve(dir,'porocilo.json')))
 if(report.vir!=='dfb'||report.koda!==conf.code||report.sezona!==season||report.prenesenih!==records.length||report.krogov!==conf.rounds||report.klubov!==conf.teams||!Number.isSafeInteger(report.odigranih)||report.odigranih<1||typeof report.pripravljeno!=='boolean'||!Array.isArray(report.napake)||Object.hasOwn(report,'status')||Object.hasOwn(report,'zavrnitev')||report.opozorila?.length)throw Error('Refused/transport-incomplete capture parent')
 const files=new Set(records.map(r=>r.file)),actual=readdirSync(dir)
 if(actual.some(p=>!['prenosi.json','porocilo.json','razpored.json','zapisniki.json'].includes(p)&&!files.has(p))||!['razpored.json','zapisniki.json'].every(p=>actual.includes(p)))throw Error('Incomplete/unindexed raw capture map')
 const binding={indexSha256:sha256(index),documentsSha256:snapshot.documentsSha256,capturedAt:snapshot.capturedAt}
 for(const key of Object.keys(binding))if(expected[key]!=null&&expected[key]!==binding[key])throw Error(`Original capture ${key} changed`)
 const age=Date.now()-Date.parse(binding.capturedAt)
 if(age>(season==='2025/26'?168:12)*3600000)throw Error('Stale original capture')
 return {...snapshot,...binding,originalReport:report}
}
export async function withNoNetwork(callback){
 const network=globalThis.fetch
 globalThis.fetch=async()=>{throw Error('Replay network access is disabled')}
 try{return await callback()}finally{globalThis.fetch=network}
}
export async function replaySnapshot({dir,slug,season,capture}){
 if(Object.entries(process.env).some(([k,v])=>v&&(/SUPABASE.*(?:KEY|TOKEN)|DATABASE_URL|PGPASSWORD/.test(k))))throw Error('Replay must not receive database credentials')
 return withNoNetwork(async()=>{
  const snapshot=readClosedCapture(dir,slug,season,capture),read=async url=>{if(!snapshot.documents.has(url))throw Error(`Replay missing captured URL ${url}`);return snapshot.documents.get(url)},code=configuration(slug,season).code
  const schedule=await vir.razporedVseStrani(code,read),reports=await vir.zapisniki(code,read,{zberiNapake:true})
  const checked=sestaviSezono({slug,sezona:season,razpored:schedule,zapisniki:reports,nepopolni:vir.nepopolni,...snapshot,runId:capture.runId,jobId:capture.jobId})
  return {schedule,reports,checked,binding:{indexSha256:snapshot.indexSha256,documentsSha256:snapshot.documentsSha256,capturedAt:snapshot.capturedAt}}
 })
}
export function obtainCapture({slug,season,runId,commit,dir,expected}){
 scope(slug,season)
 if(!/^[1-9]\d{0,19}$/.test(runId??'')||!/^[a-f0-9]{40}$/.test(commit??''))throw Error('Invalid original capture run/commit')
 const run=githubJson(`actions/runs/${runId}`),listing=githubJson(`actions/runs/${runId}/jobs?per_page=100`),jobs=listing.jobs
 if(listing.total_count!==jobs?.length)throw Error('Incomplete original job listing')
 const capture=verifyCaptureExecution(run,jobs,{runId,commit,slug,season})
 capture.workflowSha256=workflowHash(commit,captureWorkflow);capture.parserSha256=parserHashAt(commit)
 const downloaded=downloadArtifact({runId,commit,name:scope(slug,season).name,kind:'capture',expectedId:expected?.artifactId,expectedDigest:expected?.artifactDigest})
 writeArtifact(downloaded.files,dir)
 Object.assign(capture,{artifactId:downloaded.artifact.id,artifactDigest:downloaded.artifact.digest})
 const snapshot=readClosedCapture(dir,slug,season,expected)
 Object.assign(capture,{indexSha256:snapshot.indexSha256,documentsSha256:snapshot.documentsSha256,capturedAt:snapshot.capturedAt})
 if(expected&&JSON.stringify(capture)!==JSON.stringify(expected)){
  // Compare values, not caller JSON property order.
  if(Object.keys(capture).length!==Object.keys(expected).length||Object.entries(capture).some(([k,v])=>expected[k]!==v))throw Error('Actual original capture lineage changed')
 }
 return capture
}
async function main(){
 const [mode,slug,season,...args]=process.argv.slice(2);scope(slug,season)
 if(mode==='capture'&&args.length===4){
  const [runId,commit,dir,file]=args,replayRun=process.env.GITHUB_RUN_ID,replayCommit=process.env.GITHUB_SHA
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||!/^[1-9]\d{0,19}$/.test(replayRun??'')||!/^[a-f0-9]{40}$/.test(replayCommit??''))throw Error('Actual replay Actions identity required')
  const listing=githubJson(`actions/runs/${replayRun}/jobs?per_page=100`)
  if(listing.total_count!==listing.jobs?.length)throw Error('Incomplete replay job listing')
  const replay=verifyRunningReplay(githubJson(`actions/runs/${replayRun}`),listing.jobs,{runId:replayRun,commit:replayCommit}),capture=obtainCapture({slug,season,runId,commit,dir})
  writeFileSync(file,JSON.stringify({version:1,slug,season,capture,replay})+'\n');return
 }
 if(mode==='replay'&&args.length===3){
  const [dir,parentFile,out]=args,parent=JSON.parse(readFileSync(parentFile)),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runId=process.env.GITHUB_RUN_ID
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||process.env.GITHUB_SHA!==commit||!/^[1-9]\d{0,19}$/.test(runId??'')||parent.version!==1||parent.slug!==slug||parent.season!==season||parent.replay?.runId!==runId||parent.replay?.commit!==commit||!/^[1-9]\d{0,19}$/.test(parent.replay?.jobId??''))throw Error('Actual replay Actions identity required')
  const result=await replaySnapshot({dir,slug,season,capture:parent.capture}),generatedAt=new Date().toISOString()
  const replay={runId,jobId:parent.replay.jobId,commit,workflowSha256:workflowHash(commit,replayWorkflow),parserSha256:parserSha256(),generatedAt}
  mkdirSync(out,{recursive:true})
  writeFileSync(resolve(out,'replay.json'),JSON.stringify({version:1,slug,season,capture:parent.capture,replay})+'\n')
  writeFileSync(resolve(out,'razpored.json'),JSON.stringify(result.schedule)+'\n');writeFileSync(resolve(out,'zapisniki.json'),JSON.stringify(result.reports)+'\n')
  const summary={slug,season,generatedAt,...result.binding,fixtures:result.checked.fixtures.length,reports:result.reports.length,strictCoverage:true}
  writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary)+'\n');console.log(JSON.stringify(summary));return
 }
 throw Error('capture <slug> <season> <parentRun> <parentCommit> <dir> <parent.json> | replay <slug> <season> <dir> <parent.json> <out>')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
