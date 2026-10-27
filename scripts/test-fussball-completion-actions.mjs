import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {admitFussballAudit,admitFussballPairedAudit} from './fussball-import-actions.mjs'
import {validateFussballSeasonPilot} from './fussball-season-pilot.mjs'
const api=await import('./fussball-completion-actions.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const sha='a'.repeat(40),repo='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/preveri-fussball-dopolni.yml'
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40000000001',GITHUB_SHA:sha,GITHUB_WORKFLOW_REF:`${repo}/${workflow}@refs/heads/main`,EXPECTED_SHA:sha,COMPLETION_CURRENT_REQUESTS:'886',COMPLETION_ARCHIVE_REQUESTS:'3000'})
const build=e=>{assert.equal(typeof api.buildFussballCompletionEnvironment,'function');return api.buildFussballCompletionEnvironment(e,{headSha:sha})}
const running=()=>({id:40000000001,status:'in_progress',event:'workflow_dispatch',run_attempt:1,head_branch:'main',head_sha:sha,head_repository:{full_name:repo},path:workflow,created_at:'2026-10-27T17:00:00Z'})
test('fixed checkpoint allowance is unspent only when earlier completion captures are provably skipped',async()=>{
 assert.equal(typeof api.assertFussballCompletionUnspent,'function')
 const own=running(),old={...own,id:own.id-1,status:'completed',created_at:'2026-10-27T16:00:00Z'}
 const check=async(step,patch={})=>{
  const calls=[]
  const result=await api.assertFussballCompletionUnspent({env:environment(),headSha:sha,github:async path=>{
   calls.push(path)
   if(path===`actions/runs/${own.id}`)return {...own,...patch}
   if(path.startsWith('actions/workflows/'))return {total_count:2,workflow_runs:[own,old]}
   if(path===`actions/runs/${old.id}/attempts/1/jobs?per_page=100`)return {total_count:1,jobs:[{id:11,name:'capture',status:'completed',steps:step?[step]:[]}]}
   assert.fail(`Unexpected source-gate request ${path}`)
  }})
  return {result,calls}
 }
 const name='Capture fresh rounds and missing originals without database credentials'
 const {result,calls}=await check({name,status:'completed',conclusion:'skipped'})
 assert.equal(result.priorRequests,1114);assert.equal(result.sourceStarted,false);assert.equal(calls.length,3)
 for(const step of [{name,status:'completed',conclusion:'success'},{name,status:'completed',conclusion:'failure'},{name,status:'in_progress'},null])await assert.rejects(()=>check(step),/source-started|unknown/)
 await assert.rejects(()=>check({name,status:'completed',conclusion:'skipped'},{head_sha:'b'.repeat(40)}),/actual running/)
})
test('source allowance guard refuses incomplete history before any new source read',async()=>{
 const own=running()
 for(const listing of [{total_count:2,workflow_runs:[own]},{total_count:1,workflow_runs:[]},{total_count:2,workflow_runs:[own,own]}])await assert.rejects(()=>api.assertFussballCompletionUnspent({env:environment(),headSha:sha,github:async path=>path===`actions/runs/${own.id}`?own:listing}),/history/)
})
test('reviewed completion reserves the actual1114 plus current886/archive3000 without reducing the ledger',()=>{
 const e=build(environment()),p=validateFussballSeasonPilot(e,{headSha:sha})
 assert.equal(p.checkpointPreset,'baden-reviewed-transports-v1');assert.equal(p.priorRequests,1114);assert.equal(p.totalRequestCap,5000)
 assert.equal(p.priorRequests+p.current.maxRequests+p.archive.maxRequests,5000)
 assert.equal(p.rolloutCandidate,'de-verbandsliga-baden');assert.equal(p.current.cardPolicy,'community-v1');assert.equal(e.REPORTS,'all')
})
for(const [name,patch]of Object.entries({branch:{GITHUB_REF:'refs/heads/feature'},rerun:{GITHUB_RUN_ATTEMPT:'2'},foreign:{GITHUB_REPOSITORY:'other/repo'},scheduled:{GITHUB_EVENT_NAME:'schedule'},stale:{EXPECTED_SHA:'b'.repeat(40)},wrongWorkflow:{GITHUB_WORKFLOW_REF:`${repo}/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main`},currentOver:{COMPLETION_CURRENT_REQUESTS:'887'},archiveOver:{COMPLETION_ARCHIVE_REQUESTS:'3001'},zero:{COMPLETION_CURRENT_REQUESTS:'0'},fraction:{COMPLETION_CURRENT_REQUESTS:'1.5'}}))test(`completion ${name} is refused before any source or GitHub operation`,()=>{
 assert.throws(()=>build({...environment(),...patch}))
})
test('caller scope and prior-budget environment cannot replace the fixed reviewed checkpoint',()=>{
 const e=build({...environment(),SEED_URL:'https://evil.invalid/',PRIOR_REQUESTS:'0',TOTAL_REQUEST_CAP:'999999',ROLLOUT_CANDIDATE:'de-unknown'})
 assert.equal(e.PRIOR_REQUESTS,'1114');assert.equal(e.TOTAL_REQUEST_CAP,'5000');assert.match(e.SEED_URL,/03188V27L800000JVS5489BTVU7GTVLE-G$/)
 const p=validateFussballSeasonPilot(e,{headSha:sha})
 assert.equal(p.current.season,'2026/27');assert.equal(p.archive.season,'2025/26')
 assert.throws(()=>validateFussballSeasonPilot({...e,PRIOR_REQUESTS:'1113'},{headSha:sha}))
 assert.throws(()=>validateFussballSeasonPilot({...e,ROLLOUT_CANDIDATE:'de-unknown'},{headSha:sha}))
})
test('new source workflow is admitted only through successful first-attempt paired audit, never direct manual import',()=>{
 const run={id:40000000001,status:'completed',conclusion:'success',event:'workflow_dispatch',head_branch:'main',head_sha:sha,head_repository:{full_name:repo},path:workflow,run_attempt:1}
 const artifact=(id,archive)=>({id,name:`fussball-season-${archive?'archive-':''}${run.id}`,expired:false,size_in_bytes:100,workflow_run:{id:run.id,head_sha:sha}})
 const inventory={artifacts:[artifact(101,false),artifact(102,true)]},options={repository:repo,headSha:sha,runId:String(run.id)}
 const result=admitFussballPairedAudit(run,inventory,options);assert.equal(result.current.artifactId,101);assert.equal(result.archive.artifactId,102)
 assert.throws(()=>admitFussballAudit(run,inventory,options))
 for(const patch of [{conclusion:'failure'},{status:'in_progress'},{run_attempt:2},{path:'.github/workflows/unreviewed.yml'}])assert.throws(()=>admitFussballPairedAudit({...run,...patch},inventory,options))
})
const evidence=process.env.FUSSBALL_CHECKPOINT_EVIDENCE_DIR
test('genuine reviewed parents download through GET-only GitHub records and reauthenticate from persisted bytes',{
 skip:evidence?false:'GENUINE CHECKPOINT ORIGINALS NOT PROVIDED: no production checkpoint authentication claimed',
},async()=>{
 assert.equal(typeof api.downloadFussballCompletionParents,'function');assert.equal(typeof api.loadFussballCompletionParents,'function')
 const pins=JSON.parse(readFileSync(join(evidence,'reviewed-parent-pins.json'),'utf8')),calls=[]
 const github=async(path,binary=false)=>{
  calls.push({path,binary});assert.ok(!path.includes('fussball.de'))
  for(const p of pins){const prefix=join(evidence,p.runId)
   if(path===`actions/runs/${p.runId}`)return JSON.parse(readFileSync(join(prefix,'run.json'),'utf8'))
   if(path===`actions/runs/${p.runId}/attempts/1/jobs?per_page=100`)return JSON.parse(readFileSync(join(prefix,'jobs.json'),'utf8'))
   if(path===`actions/artifacts/${p.artifactId}`)return JSON.parse(readFileSync(join(prefix,'artifact.json'),'utf8'))
   if(path===`actions/artifacts/${p.artifactId}/zip`){assert.equal(binary,true);return readFileSync(join(prefix,'source.zip'))}
  }
  assert.fail(`Unexpected GitHub operation ${path}`)
 }
 const parent=mkdtempSync(join(tmpdir(),'slff-checkpoint-actions-')),directory=join(parent,'checkpoint-input')
 try{
  const proof=await api.downloadFussballCompletionParents(directory,{env:environment(),headSha:sha,github,now:Date.parse('2026-10-27T17:00:00Z')})
  assert.equal(proof.priorRequests,1114);assert.equal(proof.documentsCount,572);assert.equal(calls.length,12)
  const loaded=api.loadFussballCompletionParents(directory,{now:Date.parse('2026-10-27T17:00:00Z')});assert.deepEqual(loaded,proof)
  const blocked=join(parent,'must-not-exist');let network=0
  await assert.rejects(()=>api.downloadFussballCompletionParents(blocked,{env:{...environment(),GITHUB_RUN_ATTEMPT:'2'},headSha:sha,github:async()=>{network++;throw Error('No GET allowed')}}))
  assert.equal(network,0);assert.equal(existsSync(blocked),false)
 }finally{rmSync(parent,{recursive:true,force:true})}
})
