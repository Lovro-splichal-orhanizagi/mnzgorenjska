// A new actual Actions execution over immutable original captures, without DB/source HTTP.
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import vir from './viri/dfb.mjs'
import {dfbPolicyBinding,DFB_HISTORICAL_POLICY} from './dfb-historical-policy.mjs'
import {configuration,sourceFiles,parserSha256,preveriPosnetek,sestaviSezono} from './vklopi-dfb-regijo.mjs'
import {sha256,githubJson,downloadArtifact,writeArtifact} from './dfb-artifacts.mjs'
import {scope,verifyCaptureExecution,verifyRunningReplay,captureWorkflow,replayWorkflow} from './dfb-replay-proof.mjs'
export function workflowHash(commit,path){
 if(!/^[a-f0-9]{40}$/.test(commit)||![captureWorkflow,replayWorkflow].includes(path))throw Error('Invalid workflow identity')
 const original=execFileSync('git',['show',`${commit}:${path}`])
 if(!original.equals(readFileSync(path)))throw Error('Capture/replay workflow differs from reviewed implementation')
 return sha256(original)
}
// Exact reviewed captures keep their original declared closure and fingerprint.
// Never shrink an unlisted commit's dependency set based on missing git objects.
const historicalParserHashes={
 a48fd89071aae0d2097603110c5442324fc59e3d:'8da6531575cdea2fc740c87eb437a897f796d9c27649dc4dcd56aff5119e1431',
 '671643e4a50e6e50cc22628a157fb027e0b58deb':'5aaa2067a4f152d62bc4df4bb49492d89e0852d04922fc8709fbf7fb1ea9ebd9',
}
const historicalSourceFiles=['scripts/viri/dfb.mjs','scripts/viri/dfb-lige.json','scripts/viri/dfb-korekcije.json','scripts/viri/dfb-rezerve.json','scripts/viri/fussball.mjs','scripts/viri/fussball-pisava.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/viri/fss.mjs','scripts/klubi.mjs','scripts/preveri-vir-sezono.mjs']
// f3 is the last reviewed pre-policy source closure (27 files, including pinned proof bytes).
const prePolicyCapture={commit:"f3a09962fd2ea6a72f2b027efdb7eb16a034a052",sha256:"cc32a4e542fa7e60e73678c6b7b05764de6d5ed6c14d1ebefc9ba7974fff90c7",files:[
 "src/lib/nepripisaniRumeni.mjs",
 "scripts/viri/dfb.mjs",
 "scripts/viri/dfb-lige.json",
 "scripts/viri/dfb-korekcije.json",
 "scripts/viri/dfb-kronologija.json",
 "scripts/viri/dfb-rezerve.json",
 "scripts/viri/dfb-aliasi.json",
 "scripts/viri/fussball.mjs",
 "scripts/viri/fussball-pisava.mjs",
 "scripts/viri/fussball-datumski-glifi.json",
 "scripts/viri/fss.mjs",
 "scripts/klubi.mjs",
 "scripts/preveri-vir-sezono.mjs",
 "scripts/vzorci/de-dfb-bayern-proof-8cd5056e5494a22d509798d9f5b9c55c8b8c125601209414a92e922514183084.html",
 "scripts/vzorci/de-dfb-bayern-proof-9b5a4b9be42d0870674cbbd01e79b565cce9378375b431b262c198e283c6ab7e.html",
 "scripts/vzorci/de-dfb-bayern-proof-9b4e19546d738c344ff57e47ca04f399a59addeab3a1f0103c4bdd9b771d5013.html",
 "scripts/vzorci/de-dfb-suedwest-proof-6b44dea55f3ea8a5b3f8f5fdedf85f8100e8692613b7f6ace17df0785985f226.html",
 "scripts/vzorci/de-dfb-suedwest-proof-eb8a27d587bf9fc354f95da5d52682a92c6f9c189a01199f30b56b0b9f77561e.html",
 "scripts/vzorci/de-dfb-bayern-proof-d64ad2f3ad4e83fdfea32813498adaa60c95a9981a713cef4f4c1583dac09cbb.html",
 "scripts/vzorci/de-dfb-bayern-proof-fbc26f66ed4f79432151fe720a888a8c0b1038a58ca2392a3abf512ffd3e5a2a.html",
 "scripts/vzorci/de-dfb-bayern-proof-313cddbd146aa4b3f90d2531317f4f2937c612ea88ffbf72d1423aadae8849c0.html",
 "scripts/vzorci/de-dfb-suedwest-proof-6ce2a34f4f99193420ee63e4ac7b655ce4aecca8cacaeebdd953a41e12c5106d.html",
 "scripts/vzorci/de-dfb-suedwest-proof-d617e70a340d7e90af5a46440c8cd0e2b1b0e30e830f91f02ed8bfd441ff068c.html",
 "scripts/vzorci/de-dfb-suedwest-proof-5aeacee316b874eb667f5b4d08894445efd568f51b02a4fa5b3ab503548b624f.html",
 "scripts/vzorci/de-dfb-nord-west-proof-634b5356d1d6880dc00bd16a1a1402946e593972c5ec463c9aac24a9fef2f59d.html",
 "scripts/vzorci/de-dfb-nord-west-proof-ee60d390b21003d530bc6142a5c3b59bd974437976e49115a612dc3b7cd665b8.html",
 "scripts/vzorci/de-dfb-nord-west-proof-256a0adb952a4d337694b84d3245d19e7bb1446c30f72cc922c36e1e91192986.html"
]}
export function parserHashAt(commit){
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid parser commit')
 const prePolicy=commit===prePolicyCapture.commit,expected=prePolicy?prePolicyCapture.sha256:historicalParserHashes[commit],files=prePolicy?prePolicyCapture.files:expected?historicalSourceFiles:sourceFiles
 const hash=sha256(JSON.stringify(files.map(path=>[path,sha256(execFileSync('git',['show',`${commit}:${path}`],{maxBuffer:16*1024*1024}))])))
 if(expected&&hash!==expected)throw Error('Historical parser fingerprint mismatch')
 return hash
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
export async function replaySnapshot({dir,slug,season,capture,statisticsPolicy}){
 if(Object.entries(process.env).some(([k,v])=>v&&(/SUPABASE.*(?:KEY|TOKEN)|DATABASE_URL|PGPASSWORD/.test(k))))throw Error('Replay must not receive database credentials')
 return withNoNetwork(async()=>{
  const snapshot=readClosedCapture(dir,slug,season,capture),read=async url=>{if(!snapshot.documents.has(url))throw Error(`Replay missing captured URL ${url}`);return snapshot.documents.get(url)},code=configuration(slug,season).code
  const schedule=await vir.razporedVseStrani(code,read),reports=await vir.zapisniki(code,read,{zberiNapake:true})
  const competition=statisticsPolicy?{slug,source:'dfb',source_policy:statisticsPolicy.id,firstFantasyPlayedOn:statisticsPolicy.firstFantasyPlayedOn}:null
  if(statisticsPolicy&&JSON.stringify(dfbPolicyBinding(competition))!==JSON.stringify(statisticsPolicy))throw Error('Unreviewed historical replay policy')
  const checked=sestaviSezono({slug,sezona:season,razpored:schedule,zapisniki:reports,nepopolni:vir.nepopolni,...snapshot,runId:capture.runId,jobId:capture.jobId,historicalPolicy:competition?{competition,documents:snapshot.documents}:undefined})
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
 if((mode==='capture'&&args.length===4)||(mode==='capture-policy'&&args.length===5)){
  const [runId,commit,dir,file,firstFantasyPlayedOn]=args,replayRun=process.env.GITHUB_RUN_ID,replayCommit=process.env.GITHUB_SHA
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||!/^[1-9]\d{0,19}$/.test(replayRun??'')||!/^[a-f0-9]{40}$/.test(replayCommit??''))throw Error('Actual replay Actions identity required')
  const listing=githubJson(`actions/runs/${replayRun}/jobs?per_page=100`)
  if(listing.total_count!==listing.jobs?.length)throw Error('Incomplete replay job listing')
  const replay=verifyRunningReplay(githubJson(`actions/runs/${replayRun}`),listing.jobs,{runId:replayRun,commit:replayCommit}),capture=obtainCapture({slug,season,runId,commit,dir})
  const statisticsPolicy=mode==='capture-policy'?dfbPolicyBinding({slug,source:'dfb',source_policy:DFB_HISTORICAL_POLICY,firstFantasyPlayedOn}):null
  writeFileSync(file,JSON.stringify({version:statisticsPolicy?2:1,slug,season,capture,replay,...(statisticsPolicy?{statisticsPolicy}:{})})+'\n');return
 }
 if(['replay','replay-policy'].includes(mode)&&args.length===3){
  const [dir,parentFile,out]=args,parent=JSON.parse(readFileSync(parentFile)),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runId=process.env.GITHUB_RUN_ID
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||process.env.GITHUB_SHA!==commit||!/^[1-9]\d{0,19}$/.test(runId??'')||parent.version!==(mode==='replay-policy'?2:1)||parent.slug!==slug||parent.season!==season||parent.replay?.runId!==runId||parent.replay?.commit!==commit||!/^[1-9]\d{0,19}$/.test(parent.replay?.jobId??''))throw Error('Actual replay Actions identity required')
  const statisticsPolicy=mode==='replay-policy'?parent.statisticsPolicy:null
  if(mode==='replay'&&parent.statisticsPolicy!=null)throw Error('Historical policy requires policy replay mode')
  const result=await replaySnapshot({dir,slug,season,capture:parent.capture,statisticsPolicy}),generatedAt=new Date().toISOString()
  const replay={runId,jobId:parent.replay.jobId,commit,workflowSha256:workflowHash(commit,replayWorkflow),parserSha256:parserSha256(),generatedAt,...(statisticsPolicy?{statisticsPolicyId:statisticsPolicy.id,statisticsPolicySha256:statisticsPolicy.sha256,firstFantasyPlayedOn:statisticsPolicy.firstFantasyPlayedOn}:{})}
  mkdirSync(out,{recursive:true})
  writeFileSync(resolve(out,'replay.json'),JSON.stringify({version:statisticsPolicy?2:1,slug,season,capture:parent.capture,replay,...(statisticsPolicy?{statisticsPolicy}:{})})+'\n')
  writeFileSync(resolve(out,'razpored.json'),JSON.stringify(result.schedule)+'\n');writeFileSync(resolve(out,'zapisniki.json'),JSON.stringify(result.reports)+'\n')
  const summary={slug,season,generatedAt,...result.binding,fixtures:result.checked.fixtures.length,reports:result.reports.length,...(statisticsPolicy?{statisticsPolicy,statisticsCoverage:result.checked.statisticsCoverage,strictStatisticsCoverage:result.checked.statisticsCoverage.strictStatisticsCoverage,policyCoverage:true}:{strictCoverage:true})}
  writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary)+'\n');console.log(JSON.stringify(summary));return
 }
 throw Error('capture <slug> <season> <parentRun> <parentCommit> <dir> <parent.json> | replay <slug> <season> <dir> <parent.json> <out>')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
