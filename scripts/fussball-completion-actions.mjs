// Separate reviewed completion entry point. GitHub GETs and local evidence only;
// ordinary source reads remain inside the existing paced capture/pilot client.
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync,readFileSync,lstatSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
import {readFussballTransportCheckpoint,reviewedFussballCheckpointParents,readFussballTransportResumption,reviewedFussballResumptionParent,exportFussballTransportCheckpoint} from './fussball-checkpoint.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/preveri-fussball-dopolni.yml'
const legacyPreset='baden-reviewed-transports-v1',resumptionPreset='baden-reviewed-transports-v2',fail=message=>{throw Error(`fussball completion: ${message}`)}
function completionScope(preset=legacyPreset){
 if(preset===legacyPreset)return {preset,priorRequests:1114,currentMaximum:886}
 if(preset===resumptionPreset)return {preset,priorRequests:1212,currentMaximum:788}
 fail('unknown reviewed completion preset')
}
const parentPins=preset=>preset===resumptionPreset?[reviewedFussballResumptionParent()]:reviewedFussballCheckpointParents()
const readParents=(parents,preset,now)=>preset===resumptionPreset?readFussballTransportResumption({parent:parents[0],now}):readFussballTransportCheckpoint({parents,now})
const sourceStep='Capture fresh rounds and missing originals without database credentials'
const githubGet=(path,binary=false)=>{const bytes=execFileSync('gh',['api',`repos/${repository}/${path}`],{timeout:30000,maxBuffer:100*1024*1024+1});return binary?bytes:JSON.parse(bytes)}
function integer(value,max){if(typeof value!=='string'||!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>max)fail('invalid reviewed request allowance');return Number(value)}
export function buildFussballCompletionEnvironment(env,{headSha}={}){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_WORKFLOW_REF!==`${repository}/${workflow}@refs/heads/main`||env.GITHUB_RUN_ATTEMPT!=='1'||!/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')||!/^[a-f0-9]{40}$/.test(env.EXPECTED_SHA??'')||env.EXPECTED_SHA!==env.GITHUB_SHA||headSha!==env.GITHUB_SHA)fail('exact reviewed main first-attempt manual completion required')
 const plan=completionScope(env.COMPLETION_PRESET)
 if(plan.preset===resumptionPreset&&(env.PRIOR_REQUESTS!==undefined&&env.PRIOR_REQUESTS!=='1212'||env.TOTAL_REQUEST_CAP!==undefined&&env.TOTAL_REQUEST_CAP!=='5000'))fail('reviewed resumption ledger cannot be replaced')
 const current=integer(env.COMPLETION_CURRENT_REQUESTS,plan.currentMaximum),archiveMaximum=integer(env.COMPLETION_ARCHIVE_REQUESTS,3000)
 if(plan.priorRequests+current+archiveMaximum>5000)fail('cumulative source allowance exceeded')
 const c=GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden'),a=c.archives[0]
 return {...env,SEED_URL:c.seedUrl,STAFFEL:c.source_league_code.split(':')[0],SEASON:c.season,MAX_REQUESTS:String(current),REPORTS:'all',ARCHIVE_JSON:JSON.stringify({seedUrl:a.seedUrl,staffel:a.code.split(':')[0],season:a.season,maxRequests:archiveMaximum,observedSeedUrl:a.observedSeedUrl}),PRIOR_REQUESTS:String(plan.priorRequests),TOTAL_REQUEST_CAP:'5000',ROLLOUT_CANDIDATE:c.slug,FUSSBALL_COMPLETION_PRESET:plan.preset,FUSSBALL_COMPLETION_DIRECTORY:'checkpoint-input'}
}
function regular(directory,name,maximum){
 const base=resolve(directory);for(const p of [base,join(base,'parents')]){const s=lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink())fail('regular checkpoint directories required')}
 const p=join(base,'parents',name),s=lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>maximum)fail('bounded regular checkpoint file required')
 const bytes=readFileSync(p);if(bytes.length>maximum)fail('checkpoint file changed beyond bound');return bytes
}
export function loadFussballCompletionParents(directory,{preset=legacyPreset,now=Date.now()}={}){
 completionScope(preset)
 const parents=parentPins(preset).map(p=>{
  const metadata=JSON.parse(regular(directory,`${p.runId}.json`,8*1024*1024).toString('utf8'))
  if(!metadata||Object.keys(metadata).sort().join(',')!=='artifact,jobs,run')fail('closed checkpoint metadata required')
  return {...metadata,zipBytes:regular(directory,`${p.runId}.zip`,100*1024*1024)}
 })
 return readParents(parents,preset,now)
}
export async function downloadFussballCompletionParents(directory,{env=process.env,headSha,github,now=Date.now()}={}){
 const e=buildFussballCompletionEnvironment(env,{headSha}) // Before every external read.
 github??=githubGet
 const parents=await Promise.all(parentPins(e.FUSSBALL_COMPLETION_PRESET).map(async p=>{
  const [run,artifact,jobs,zipBytes]=await Promise.all([github(`actions/runs/${p.runId}`),github(`actions/artifacts/${p.artifactId}`),github(`actions/runs/${p.runId}/attempts/1/jobs?per_page=100`),github(`actions/artifacts/${p.artifactId}/zip`,true)])
  return {run,artifact,jobs,zipBytes}
 }))
 const proof=readParents(parents,e.FUSSBALL_COMPLETION_PRESET,now),bundle=exportFussballTransportCheckpoint(proof),base=resolve(directory)
 mkdirSync(base);mkdirSync(join(base,'parents'))
 for(const p of bundle.parents){const runId=String(p.run.id);writeFileSync(join(base,'parents',`${runId}.json`),JSON.stringify({run:p.run,artifact:p.artifact,jobs:p.jobs})+'\n',{flag:'wx'});writeFileSync(join(base,'parents',`${runId}.zip`),p.zipBytes,{flag:'wx'})}
 return proof
}
// Each fixed reviewed history may fund only one new source execution. Host coordination
// runs first; afterwards any earlier source-started/unknown completion run holds
// this preset until its actual requests are explicitly accounted in new history.
export async function assertFussballCompletionUnspent({env=process.env,headSha,github=githubGet,completionProof}={}){
 const e=buildFussballCompletionEnvironment(env,{headSha}),resumption=e.FUSSBALL_COMPLETION_PRESET===resumptionPreset
 let accounted=null
 if(resumption){
  // The existing export seam checks the private reader brand before any GET.
  const bundle=exportFussballTransportCheckpoint(completionProof),pin=reviewedFussballResumptionParent()
  if(completionProof.preset!==resumptionPreset||completionProof.priorRequests!==1212||completionProof.totalRequestCap!==5000||completionProof.documentsCount!==631||bundle.parents.length!==1||String(bundle.parents[0].run.id)!==pin.runId||!['seedUrl','staffel','season'].every(k=>completionProof.scope?.[k]===({seedUrl:e.SEED_URL,staffel:e.STAFFEL,season:e.SEASON})[k]))fail('authenticated exact resumption checkpoint required before source')
  accounted=bundle.parents[0]
 }
 const jobs=async id=>{
  const j=await github(`actions/runs/${id}/attempts/1/jobs?per_page=100`)
  if(!Number.isSafeInteger(j?.total_count)||j.total_count<1||j.total_count>100||!Array.isArray(j.jobs)||j.total_count!==j.jobs.length||new Set(j.jobs.map(x=>x.id)).size!==j.jobs.length)fail('unknown completion job inventory')
  return j
 }
 const ownExecution=async()=>{
  const own=await github(`actions/runs/${env.GITHUB_RUN_ID}`)
  if(own?.id!==Number(env.GITHUB_RUN_ID)||own.run_attempt!==1||own.status!=='in_progress'||own.event!=='workflow_dispatch'||own.head_branch!=='main'||own.head_sha!==headSha||own.path!==workflow||own.head_repository?.full_name!==repository||!Number.isFinite(Date.parse(own.created_at)))fail('actual running completion identity required before source')
  if(resumption){
   const j=await jobs(own.id),captures=j.jobs.filter(x=>x.name==='capture'),capture=captures[0],steps=capture?.steps?.filter(x=>x.name===sourceStep)
   if(env.GITHUB_JOB!=='capture'||own.repository?.full_name!==repository||own.conclusion!==null||captures.length!==1||!Number.isSafeInteger(capture.id)||capture.id<1||capture.run_id!==own.id||capture.run_attempt!==1||capture.head_sha!==headSha||capture.status!=='in_progress'||capture.conclusion!==null||steps?.length!==1||steps[0].status!=='in_progress'||steps[0].conclusion!==null)fail('actual current resumption source step required')
  }
  return own
 }
 const own=await ownExecution()
 const runs=[],seen=new Set();let total=null
 for(let page=1;page<=10;page++){
  const r=await github(`actions/workflows/preveri-fussball-dopolni.yml/runs?per_page=100&page=${page}`)
  if(!Number.isSafeInteger(r?.total_count)||r.total_count<1||r.total_count>1000||total!==null&&r.total_count!==total||!Array.isArray(r.workflow_runs)||r.workflow_runs.length!==Math.min(100,r.total_count-runs.length))fail('incomplete completion execution history')
  total=r.total_count
  for(const run of r.workflow_runs){if(!Number.isSafeInteger(run.id)||seen.has(run.id)||!Number.isFinite(Date.parse(run.created_at))||run.path!==workflow)fail('unknown completion history identity');seen.add(run.id);runs.push(run)}
  if(runs.length===total)break
 }
 if(runs.length!==total||!seen.has(own.id))fail('incomplete completion execution history')
 const earlier=runs.filter(r=>Date.parse(r.created_at)<Date.parse(own.created_at)||r.created_at===own.created_at&&r.id<own.id)
 let accountedSeen=false
 for(const r of earlier){
  if(r.status!=='completed'||r.run_attempt!==1)fail('older completion execution is still live or unknown')
  if(accounted&&r.id===accounted.run.id){
   const [run,j,artifact]=await Promise.all([github(`actions/runs/${r.id}`),jobs(r.id),github(`actions/artifacts/${accounted.artifact.id}`)])
   if(r.conclusion!=='failure'||r.created_at!==run.created_at||r.head_sha!==run.head_sha||r.event!==run.event||r.head_branch!==run.head_branch)fail('accounted completion history identity differs')
   const current=readFussballTransportResumption({parent:{run,jobs:j,artifact,zipBytes:accounted.zipBytes}})
   if(current.documentsSha256!==completionProof.documentsSha256)fail('actual accounted checkpoint differs')
   accountedSeen=true;continue
  }
  if(resumption&&!['success','failure'].includes(r.conclusion))fail('older completion execution is cancelled or unknown')
  const j=await jobs(r.id)
  const capture=j.jobs.filter(x=>x.name==='capture')
  if(capture.length!==1||capture[0].status!=='completed'||!Array.isArray(capture[0].steps))fail('unknown earlier completion capture state')
  if(resumption&&(!Number.isSafeInteger(capture[0].id)||capture[0].id<1||capture[0].run_id!==r.id||capture[0].run_attempt!==1||capture[0].head_sha!==r.head_sha||!['success','failure','skipped'].includes(capture[0].conclusion)))fail('unknown earlier resumption capture identity')
  const steps=capture[0].steps.filter(s=>s.name===sourceStep)
  if(steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='skipped')fail('reviewed checkpoint already source-started; account its requests before another execution')
 }
 if(resumption){
  if(!accountedSeen)fail('authenticated accounted parent missing from earlier workflow history')
  const current=await ownExecution()
  if(current.created_at!==own.created_at)fail('current resumption execution changed during accounting')
 }
 return {priorRequests:Number(e.PRIOR_REQUESTS),sourceStarted:false,checkedRunId:String(own.id)}
}
async function main(args){
 const [mode,...paths]=args,headSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),e=buildFussballCompletionEnvironment(process.env,{headSha})
 if(mode==='parents'&&paths.length===1){const p=await downloadFussballCompletionParents(paths[0],{env:e,headSha});console.log(JSON.stringify({checkpointPreset:p.preset,priorRequests:p.priorRequests,documents:p.documentsCount,activationEligible:false}));return}
 const counts={validate:0,'capture-current':1,authorize:1,'capture-archive':1,handoff:2}
 if(!Object.hasOwn(counts,mode)||paths.length!==counts[mode])fail('use parents DIRECTORY, validate, capture-current DIRECTORY, authorize DIRECTORY, capture-archive DIRECTORY or handoff CURRENT ARCHIVE')
 if(mode==='capture-current'){
  const completionProof=loadFussballCompletionParents(e.FUSSBALL_COMPLETION_DIRECTORY,{preset:e.FUSSBALL_COMPLETION_PRESET})
  await assertFussballCompletionUnspent({env:e,headSha,completionProof})
 }
 execFileSync(process.execPath,['scripts/fussball-season-pilot.mjs',mode,...paths],{env:e,stdio:'inherit'})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1})
