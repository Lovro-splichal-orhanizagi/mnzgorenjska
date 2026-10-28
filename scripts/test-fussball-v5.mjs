import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import * as checkpoint from './fussball-checkpoint.mjs'
import * as actions from './fussball-completion-actions.mjs'
import {validateFussballSeasonPilot} from './fussball-season-pilot.mjs'
const directory=process.env.FUSSBALL_V5_EVIDENCE_DIR,actual={skip:directory===undefined?'set FUSSBALL_V5_EVIDENCE_DIR to genuine run40633575248 retained bytes':false}
const preset='baden-reviewed-transports-v5',repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/preveri-fussball-dopolni.yml',sha='a'.repeat(40)
const parent=()=>({...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))})
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:`${repository}/${workflow}@refs/heads/main`,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40633575249',GITHUB_JOB:'capture',GITHUB_SHA:sha,EXPECTED_SHA:sha,COMPLETION_PRESET:preset,COMPLETION_CURRENT_REQUESTS:'432',COMPLETION_ARCHIVE_REQUESTS:'3000'})
test('V5 reserves1568+432+3000 without resetting consumed V4',()=>{
 const env=actions.buildFussballCompletionEnvironment(environment(),{headSha:sha}),plan=validateFussballSeasonPilot(env,{headSha:sha})
 assert.equal(plan.priorRequests,1568);assert.equal(plan.current.maxRequests,432);assert.equal(plan.archive.maxRequests,3000);assert.equal(plan.checkpointPreset,preset)
 for(const patch of [{COMPLETION_CURRENT_REQUESTS:'433'},{PRIOR_REQUESTS:'1517'},{TOTAL_REQUEST_CAP:'5001'},{COMPLETION_ARCHIVE_REQUESTS:'3001'},{GITHUB_RUN_ATTEMPT:'2'}])assert.throws(()=>actions.buildFussballCompletionEnvironment({...environment(),...patch},{headSha:sha}))
})
test('V5 authenticates all51 spent attempts, latest725 originals and four consumed workflow runs',actual,()=>{
 assert.equal(typeof checkpoint.readFussballTransportV5,'function')
 const input=parent(),proof=checkpoint.readFussballTransportV5({parent:input}),documents=checkpoint.getFussballCheckpointDocuments(proof),history=checkpoint.exportFussballV5AccountedHistory(proof)
 assert.equal(proof.preset,preset);assert.equal(proof.priorRequests,1568);assert.equal(proof.totalRequestCap,5000);assert.equal(proof.documentsCount,725)
 assert.equal(proof.parents[0].requests,51);assert.equal(proof.parents[0].documentsCount,72)
 assert.equal(documents.length,725);assert.equal(documents.some(d=>d.kind==='round'),false)
 assert.deepEqual([...new Set(Object.values(history).map(p=>p.run.id))],[40566792786,40577717778,40614233934,40633575248])
 assert.ok(checkpoint.exportFussballTransportCheckpoint(proof).parents[0].zipBytes.equals(input.zipBytes))
 assert.throws(()=>checkpoint.exportFussballV5AccountedHistory({...proof}),/reader-issued/)
})
for(const [name,change]of[
 ['ZIP digest',p=>{p.zipBytes[100]^=1}],['artifact identity',p=>p.artifact.id++],['rerun',p=>p.run.run_attempt=2],['source commit',p=>p.run.head_sha=sha],['archive executed',p=>p.jobs.jobs.find(j=>j.name==='archive').conclusion='success'],['skipped source',p=>p.jobs.jobs.find(j=>j.name==='capture').steps.find(s=>s.name==='Capture fresh rounds and missing originals without database credentials').conclusion='skipped'],
])test(`V5 rejects changed ${name}`,actual,()=>{const p=parent();change(p);assert.throws(()=>checkpoint.readFussballTransportV5({parent:p}))})
test('V5 serialized proof cannot grant cache or clear history before any external read',async()=>{
 assert.throws(()=>checkpoint.getFussballCheckpointDocuments({preset,priorRequests:1568}),/reader-issued/)
 let calls=0;await assert.rejects(actions.assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:{preset,priorRequests:1568},github:async()=>{calls++;throw Error('no external read')}}));assert.equal(calls,0)
})

test('V5 hosted parent staging and local loader preserve the same genuine raw bytes and accounting',actual,async t=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os')
 const base=mkdtempSync(join(tmpdir(),'fussball-v5-staging-'));t.after(()=>rmSync(base,{recursive:true,force:true}))
 const raw=parent(),paths=[]
 const github=async(path,binary)=>{
  paths.push(path)
  if(path===`actions/runs/${raw.run.id}`)return structuredClone(raw.run)
  if(path===`actions/artifacts/${raw.artifact.id}`)return structuredClone(raw.artifact)
  if(path===`actions/runs/${raw.run.id}/attempts/1/jobs?per_page=100`)return structuredClone(raw.jobs)
  if(path===`actions/artifacts/${raw.artifact.id}/zip`&&binary===true)return Buffer.from(raw.zipBytes)
  throw Error('unexpected in-memory staging read')
 }
 const output=join(base,'input'),staged=await actions.downloadFussballCompletionParents(output,{env:environment(),headSha:sha,github})
 const loaded=actions.loadFussballCompletionParents(output,{preset})
 assert.equal(staged.priorRequests,1568);assert.deepEqual(loaded,staged);assert.equal(paths.length,4)
 assert.ok(readFileSync(join(output,'parents','40633575248.zip')).equals(raw.zipBytes))
})

test('V5 reauthenticates all four consumed runs and holds later started, unknown, rerun or canceled executions',actual,async()=>{
 const proof=checkpoint.readFussballTransportV5({parent:parent()}),records=checkpoint.exportFussballV5AccountedHistory(proof),step='Capture fresh rounds and missing originals without database credentials'
 const own={id:40633575249,run_attempt:1,status:'in_progress',conclusion:null,event:'workflow_dispatch',head_branch:'main',head_sha:sha,path:workflow,repository:{full_name:repository},head_repository:{full_name:repository},created_at:new Date().toISOString()}
 const ownJobs={total_count:1,jobs:[{id:123456789,run_id:own.id,run_attempt:1,head_sha:sha,name:'capture',status:'in_progress',conclusion:null,steps:[{name:step,status:'in_progress',conclusion:null}]}]}
 const consumed=Object.values(records).filter((p,i,a)=>a.findIndex(q=>q.run.id===p.run.id)===i).map(p=>p.run)
 let runs=[own,...consumed],unknown=null,unknownJobs=null
 const github=async path=>{
  if(path===`actions/runs/${own.id}`)return structuredClone(own)
  if(path===`actions/runs/${own.id}/attempts/1/jobs?per_page=100`)return structuredClone(ownJobs)
  if(path.startsWith('actions/workflows/'))return{total_count:runs.length,workflow_runs:structuredClone(runs)}
  if(unknown&&path===`actions/runs/${unknown.id}`)return structuredClone(unknown)
  if(unknown&&path===`actions/runs/${unknown.id}/attempts/1/jobs?per_page=100`)return structuredClone(unknownJobs??{total_count:1,jobs:[{id:123456790,run_id:unknown.id,run_attempt:1,head_sha:unknown.head_sha,name:'capture',status:'completed',conclusion:'failure',steps:[{name:step,status:'completed',conclusion:'failure'}]}]})
  for(const p of Object.values(records)){
   if(path===`actions/runs/${p.run.id}`)return structuredClone(p.run)
   if(path===`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100`)return structuredClone(p.jobs)
   if(path===`actions/artifacts/${p.artifact.id}`)return structuredClone(p.artifact)
  }
  throw Error(`unexpected in-memory metadata read ${path}`)
 }
 const check=()=>actions.assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:proof,github})
 assert.equal((await check()).priorRequests,1568)
 for(const patch of [{},{run_attempt:2},{conclusion:'cancelled'},{status:'queued',conclusion:null}]){
  unknown={...records.latest.run,id:own.id+1,created_at:new Date(Date.parse(own.created_at)+1000).toISOString(),...patch}
  runs=[own,unknown,...consumed];await assert.rejects(check,/source-started|unknown|live|cancelled/)
 }
 // Test-only metadata controls for a genuinely nonstarted extra run: source
 // skipped and both later stages skipped, each bound to the actual execution.
 unknown={...records.latest.run,id:own.id+1};runs=[own,unknown,...consumed]
 const unstarted={total_count:3,jobs:records.latest.jobs.jobs.map((j,i)=>({...structuredClone(j),id:123456790+i,run_id:unknown.id,steps:j.name==='capture'?[{name:step,status:'completed',conclusion:'skipped'}]:[]}))}
 unknownJobs=structuredClone(unstarted);assert.equal((await check()).priorRequests,1568)
 for(const change of [j=>j.jobs.find(x=>x.name==='archive').conclusion='success',j=>j.jobs.find(x=>x.name==='handoff').run_id=0,j=>j.jobs.find(x=>x.name==='capture').steps=[],j=>{j.jobs=[];j.total_count=0}]){
  unknownJobs=structuredClone(unstarted);change(unknownJobs);await assert.rejects(check,/unknown|source-started|identity|state/)
 }
 unknown=null;runs=[own,...consumed.filter(r=>r.id!==40566792786)];await assert.rejects(check,/missing/)
 // A reader-issued V4 proof cannot fund a V5 source execution.
 const previous=checkpoint.readFussballTransportV4({parent:records.partial})
 await assert.rejects(actions.assertFussballCompletionUnspent({env:environment(),headSha:sha,completionProof:previous,github}),/v5 history/)
})

// TEST ONLY outer-pin rebinding: retain actual nested histories and original
// bytes, mutate one field/journal, and verify semantic rejection past ZIP hashes.
// Production has no registry override or serialized-capability path.
async function modifiedInner(t,mutate,expected){
 const {execFileSync}=await import('node:child_process'),{mkdtempSync,writeFileSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os')
 const {unpackVerifiedArchive,sha256,repository}=await import('./dfb-artifacts.mjs'),{createFussballCaptureClient,fussballRoundScope}=await import('./lib/fussball-capture.mjs')
 const base=mkdtempSync(join(tmpdir(),'fussball-v5-inner-'));t.after(()=>rmSync(base,{recursive:true,force:true}))
 const p=parent(),m=JSON.parse(readFileSync(join(directory,'current-manifest.json'))),changes={};mutate(m,changes)
 changes['manifest.json']=Buffer.from(JSON.stringify(m)+'\n')
 const manifest=changes['manifest.json'],zipFile=join(base,'modified.zip')
 execFileSync('python3',['-c',`import sys,zipfile,json,base64
original,out=sys.argv[1:]
changes={k:base64.b64decode(v) for k,v in json.load(sys.stdin).items()}
with zipfile.ZipFile(original) as src,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as dst:
 for info in src.infolist(): dst.writestr(info,changes.get(info.filename,src.read(info.filename)))
`,join(directory,'current.zip'),zipFile],{input:JSON.stringify(Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,v.toString('base64')]))),maxBuffer:1024})
 p.zipBytes=readFileSync(zipFile);p.artifact.digest='sha256:'+sha256(p.zipBytes);p.artifact.size_in_bytes=p.zipBytes.length
 const registry=JSON.parse(readFileSync(new URL('./policies/fussball-transport-v5.json',import.meta.url)))
 Object.assign(registry.parent,{artifactDigest:p.artifact.digest,artifactSize:p.zipBytes.length,manifestSha256:sha256(manifest),...(changes['outcomes.jsonl']?{outcomesSha256:sha256(changes['outcomes.jsonl'])}:{}),...(changes['attempts.jsonl']?{attemptsSha256:sha256(changes['attempts.jsonl'])}:{})})
 const path=new URL('./fussball-checkpoint.mjs',import.meta.url),source=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {readFussballTransportV5};'
 const read=(path,...args)=>String(path).endsWith('/policies/fussball-transport-v5.json')?JSON.stringify(registry):readFileSync(path,...args)
 const isolated=new Function('readFileSync','unpackVerifiedArchive','sha256','repository','createFussballCaptureClient','fussballRoundScope',source)(read,unpackVerifiedArchive,sha256,repository,createFussballCaptureClient,fussballRoundScope)
 assert.throws(()=>isolated.readFussballTransportV5({parent:p}),expected)
}
for(const [name,mutate,expected]of[
 ['failed51 refund',m=>{m.snapshot.requests=50},/all51 spent/],
 ['terminal outcome removal',(m,c)=>{c['outcomes.jsonl']=Buffer.from(m.snapshot.attempts.slice(0,-1).map(a=>JSON.stringify(a)+'\n').join(''));m.outcomesSha256=createHash('sha256').update(c['outcomes.jsonl']).digest('hex')},/all51 original intents/],
 ['checkpoint protocol',m=>{m.checkpoint.version=3},/exact embedded v4/],
 ['cached receipt rewrite',m=>{m.documents.find(d=>d.origin==='cache').originalReceipt.capture.codeSha256='0'.repeat(64)},/v5 cached original\/receipt/],
 ['embedded1517 ledger',m=>{m.checkpoint.proof.priorRequests=1568},/v5 embedded proof\/spent/],
])test(`V5 independently rejects ${name} with rebound outer hashes`,actual,t=>modifiedInner(t,mutate,expected))
