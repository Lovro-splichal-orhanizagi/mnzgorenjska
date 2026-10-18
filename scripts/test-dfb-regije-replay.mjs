import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {runInNewContext} from 'node:vm'
import {vZapisnik} from './viri/dfb.mjs'
import {unattributedYellowEvents} from '../src/lib/nepripisaniRumeni.mjs'
import {createHash} from 'node:crypto'
const proof=await import('./dfb-replay-proof.mjs').catch(()=>({}))
const artifact=await import('./dfb-artifacts.mjs').catch(()=>({}))
const replay=await import('./ponovi-dfb-regijo.mjs').catch(()=>({}))
const hash=x=>createHash('sha256').update(x).digest('hex')
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',commit='a'.repeat(40),fixed='b'.repeat(40),slug='de-regionalliga-nord',season='2025/26'
const step={name:'Arhiv sezona — brez baze',status:'completed',conclusion:'failure'}
const upload={name:'Arhiv sezona — dokazi in surovi dokumenti',status:'completed',conclusion:'success'}
const parentRun={id:12345,head_sha:commit,path:'.github/workflows/preveri-dfb-ligo.yml',event:'workflow_dispatch',status:'completed',conclusion:'failure',repository:{full_name:repo}}
const parentJob={id:6789,run_id:12345,head_sha:commit,name:'DFB regionalni audit',status:'completed',conclusion:'failure',steps:[step,upload]}
const replayRun={...parentRun,id:45678,head_sha:fixed,path:'.github/workflows/ponovi-dfb-regijo.yml',conclusion:'success'}
const replayJob={...parentJob,id:9876,run_id:45678,head_sha:fixed,name:'DFB regionalni replay',conclusion:'success',steps:[{name:'Ponovi sezono — brez omrežja in baze',status:'completed',conclusion:'success'}]}
const meta={id:8888,name:'vir-dfb-regionalliga-nord-2025',size_in_bytes:42,expired:false,digest:'sha256:'+'c'.repeat(64),workflow_run:{id:12345,head_sha:commit}}
test('replay parent admits a completed parser failure with successful immutable capture upload',()=>{
 assert.equal(typeof proof.verifyCaptureExecution,'function')
 const check=(r=parentRun,jobs=[parentJob])=>proof.verifyCaptureExecution(r,jobs,{runId:'12345',commit,slug,season})
 assert.equal(check().jobId,'6789');assert.equal(check().conclusion,'failure')
 for(const patch of [{status:'in_progress'},{conclusion:'cancelled'},{conclusion:'timed_out'},{head_sha:fixed},{path:'.github/workflows/ci.yml'},{event:'push'}])assert.throws(()=>check({...parentRun,...patch}))
 for(const patch of [{conclusion:'cancelled'},{id:null},{name:'other'},{steps:[step]},{steps:[{...step,conclusion:'skipped'},upload]},{steps:[step,{...upload,conclusion:'failure'}]},{steps:[step,upload,{name:'Set up job',conclusion:'failure'}]}])assert.throws(()=>check(parentRun,[{...parentJob,...patch}]))
 assert.throws(()=>check(parentRun,[parentJob,parentJob]))
})
test('new replay proof requires its actual reviewed workflow job and exact successful replay step',()=>{
 assert.equal(typeof proof.verifyReplayExecution,'function')
 const check=(r=replayRun,jobs=[replayJob])=>proof.verifyReplayExecution(r,jobs,{runId:'45678',commit:fixed})
 assert.equal(check().jobId,'9876')
 for(const patch of [{head_sha:commit},{path:parentRun.path},{status:'in_progress'},{conclusion:'failure'},{repository:{full_name:'else/repo'}}])assert.throws(()=>check({...replayRun,...patch}))
 for(const patch of [{run_id:12345},{conclusion:'failure'},{steps:[]},{steps:[{...replayJob.steps[0],conclusion:'skipped'}]}])assert.throws(()=>check(replayRun,[{...replayJob,...patch}]))
})
test('artifact identity must bind exact run, commit, name and an actual SHA256 digest',()=>{
 assert.equal(typeof artifact.verifyArtifact,'function')
 const check=x=>artifact.verifyArtifact(x,{runId:'12345',commit,name:meta.name})
 assert.equal(check(meta).id,'8888')
 for(const patch of [{id:null},{name:'wrong'},{expired:true},{digest:null},{digest:'sha256:no'},{size_in_bytes:500000001},{workflow_run:{id:45678,head_sha:commit}},{workflow_run:{id:12345,head_sha:fixed}}])assert.throws(()=>check({...meta,...patch}))
})
test('artifact extraction verifies the downloaded ZIP digest before reading any raw file',()=>{
 assert.equal(typeof artifact.unpackVerifiedArchive,'function')
 const dir=mkdtempSync(join(tmpdir(),'dfb-replay-zip-'))
 try{
  const file=hash('raw')+'.html';writeFileSync(join(dir,file),'raw');writeFileSync(join(dir,'prenosi.json'),'[]\n')
  execFileSync('zip',['-q',join(dir,'source.zip'),file,'prenosi.json'],{cwd:dir})
  const bytes=readFileSync(join(dir,'source.zip')),digest='sha256:'+hash(bytes),files=artifact.unpackVerifiedArchive(bytes,digest,'capture')
  assert.equal(files.get(file).toString(),'raw');assert.equal(files.get('prenosi.json').toString(),'[]\n')
  assert.throws(()=>artifact.unpackVerifiedArchive(bytes,'sha256:'+'0'.repeat(64),'capture'),/digest/)
  writeFileSync(join(dir,'unexpected.txt'),'untrusted');execFileSync('zip',['-q',join(dir,'bad.zip'),'unexpected.txt'],{cwd:dir})
  const bad=readFileSync(join(dir,'bad.zip'));assert.throws(()=>artifact.unpackVerifiedArchive(bad,'sha256:'+hash(bad),'capture'),/entry/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('replay network boundary denies DFB and database fetches and restores the caller',async()=>{
 assert.equal(typeof replay.withNoNetwork,'function')
 const previous=globalThis.fetch;let calls=0;const sentinel=async()=>{calls++;return new Response('unexpected')};globalThis.fetch=sentinel
 try{
  await replay.withNoNetwork(async()=>{
   for(const url of ['https://datencenter.dfb.de/missing','https://api.slff.eu/rest/v1/players'])await assert.rejects(()=>fetch(url),/network/)
  })
  assert.equal(calls,0);assert.equal(globalThis.fetch,sentinel)
 }finally{globalThis.fetch=previous}
})
const release=await import('./vklopi-dfb-regijo.mjs')
function replayManifest(){
 const at=new Date(Date.now()-60000).toISOString(),generatedAt=new Date().toISOString(),parserSha256=release.parserSha256()
 return {version:2,slug,sourceCommit:fixed,parserSha256,seasons:['2025/26','2026/27'].map((season,i)=>{
  const runId=String(45678+i),jobId=String(9876+i),documentsSha256='d'.repeat(64)
  return {season,code:`regionalliga-nord/${i?'2026-2027':'2025-2026'}`,capturedAt:at,runId,jobId,documentsSha256,fixtures:Array(306).fill({}),lineage:{
   capture:{runId:String(12345+i),jobId:String(6789+i),commit,workflow:parentRun.path,step:i?'Tekoča sezona — brez baze':step.name,conclusion:'failure',workflowSha256:'e'.repeat(64),parserSha256:'f'.repeat(64),artifactId:String(8888+i),artifactDigest:meta.digest,indexSha256:'0'.repeat(64),documentsSha256,capturedAt:at},
   replay:{runId,jobId,commit:fixed,workflow:replayRun.path,step:replayJob.steps[0].name,workflowSha256:'1'.repeat(64),parserSha256,artifactId:String(9999+i),artifactDigest:'sha256:'+'2'.repeat(64),generatedAt}
  }}
 })}
}
test('version2 approval retains original freshness and binds both real execution lineages',()=>{
 const m=replayManifest(),check=x=>{const raw=JSON.stringify(x);return release.preveriOdobritev(raw,hash(raw))}
 assert.equal(check(m).version,2)
 for(const change of [x=>delete x.seasons[0].lineage,x=>x.seasons[0].lineage.capture.artifactDigest=null,x=>x.seasons[0].lineage.capture.conclusion='cancelled',x=>x.seasons[0].lineage.capture.workflow=replayRun.path,x=>x.seasons[0].lineage.capture.indexSha256=null,x=>x.seasons[0].lineage.capture.documentsSha256='3'.repeat(64),x=>x.seasons[0].lineage.capture.capturedAt=new Date().toISOString(),x=>x.seasons[0].lineage.replay.commit=commit,x=>x.seasons[0].lineage.replay.runId='999',x=>x.seasons[0].lineage.replay.parserSha256='4'.repeat(64),x=>x.seasons[0].lineage.replay.generatedAt='invalid',x=>{x.seasons[1].capturedAt='2020-01-01T00:00:00Z';x.seasons[1].lineage.capture.capturedAt=x.seasons[1].capturedAt}]){
  const bad=structuredClone(m);change(bad);assert.throws(()=>check(bad))
 }
})
function tinyCapture(dir){
 const body=readFileSync(new URL('./vzorci/de-dfb-2405443.html',import.meta.url)),file=hash(body)+'.html',records=[{url:'https://datencenter.dfb.de/datencenter/regionalliga-nord/2025-2026/22-spieltag/fsv-schoeningen-sv-meppen-2405443',sha256:hash(body),file,at:new Date(Date.now()-60000).toISOString()}]
 writeFileSync(join(dir,file),body);writeFileSync(join(dir,'prenosi.json'),JSON.stringify(records)+'\n')
 writeFileSync(join(dir,'porocilo.json'),JSON.stringify({vir:'dfb',koda:'regionalliga-nord/2025-2026',sezona:season,prenesenih:1,krogov:34,klubov:18,odigranih:306,pripravljeno:false,napake:['original parser failure'],opozorila:[]}))
 writeFileSync(join(dir,'razpored.json'),'[]');writeFileSync(join(dir,'zapisniki.json'),'[]');return {body,file,records}
}
test('closed replay retains index bytes and rejects transport, changed UTC, raw bytes and URL evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dfb-replay-map-'))
 try{
  const {file,body,records}=tinyCapture(dir),originalIndex=readFileSync(join(dir,'prenosi.json')),binding=replay.readClosedCapture(dir,slug,season)
  assert.equal(binding.capturedAt,records[0].at)
  writeFileSync(join(dir,file),'changed');assert.throws(()=>replay.readClosedCapture(dir,slug,season,binding),/SHA/);writeFileSync(join(dir,file),body)
  for(const change of [r=>r[0].at=new Date().toISOString(),r=>r[0].url+='?changed=1']){
   const changed=structuredClone(records);change(changed);writeFileSync(join(dir,'prenosi.json'),JSON.stringify(changed));assert.throws(()=>replay.readClosedCapture(dir,slug,season,binding),/changed/)
  }
  writeFileSync(join(dir,'prenosi.json'),originalIndex)
  const report=JSON.parse(readFileSync(join(dir,'porocilo.json')));report.status=429;report.zavrnitev=true;writeFileSync(join(dir,'porocilo.json'),JSON.stringify(report));assert.throws(()=>replay.readClosedCapture(dir,slug,season,binding),/transport/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('missing captured schedule/report cannot fall back to source network during strict replay',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dfb-replay-missing-'))
 try{tinyCapture(dir);await assert.rejects(()=>replay.replaySnapshot({dir,slug,season,capture:{runId:'12345',jobId:'6789'}}),/missing captured URL/)}finally{rmSync(dir,{recursive:true,force:true})}

})
const verifier=await import('./preveri-zagona-dfb-regije.mjs')
test('replay artifact record binds actual execution, original parent, scope and reviewed code',()=>{
 assert.equal(typeof verifier.verifyReplayRecord,'function')
 const m=replayManifest(),s=m.seasons[0],l=s.lineage
 const record={version:1,slug,season,capture:l.capture,replay:{runId:s.runId,jobId:s.jobId,commit:fixed,workflowSha256:l.replay.workflowSha256,parserSha256:m.parserSha256,generatedAt:l.replay.generatedAt}}
 const actual={runId:s.runId,jobId:s.jobId,commit:fixed,workflow:replayRun.path,step:replayJob.steps[0].name}
 const artifact={id:l.replay.artifactId,digest:l.replay.artifactDigest}
 const check=(x=record)=>verifier.verifyReplayRecord(x,{slug,season,actual,artifact,workflowSha256:l.replay.workflowSha256,parserSha256:m.parserSha256})
 assert.deepEqual(check(),l)
 for(const change of [x=>x.slug='de-regionalliga-west',x=>x.season='2026/27',x=>x.replay.runId='111',x=>x.replay.jobId='111',x=>x.replay.commit=commit,x=>x.replay.workflowSha256='0'.repeat(64),x=>x.replay.parserSha256='0'.repeat(64),x=>x.capture.artifactId=null,x=>x.capture.conclusion='cancelled']){
  const bad=structuredClone(record);change(bad);assert.throws(()=>check(bad))
 }
})
import {syntheticCapture} from './dfb-replay-test-fixture.mjs'
import {mkdirSync} from 'node:fs'
import {loadApprovedDocuments} from './dfb-offline.mjs'
test('complete offline replay prepares version2 from original bytes and import loader binds the exact index',async()=>{
 const root=mkdtempSync(join(tmpdir(),'dfb-replay-complete-')),dirs=['archive','current'].map(p=>join(root,p)),m=replayManifest();m.slug='de-regionalliga-west'
 let expectedAppearances,warningReportUrl
 try{
  const proof={version:2,slug:m.slug,sourceCommit:fixed,sourceFilesIdentical:true,proof:[]}
  for(const [i,dir]of dirs.entries()){
   mkdirSync(dir);const records=syntheticCapture(dir,2025+i)
   if(i===0){
    // Synthetic implementation proof only: retain the genuine season captures
    // separately. Change two copies of one ordinary-yellow event, never XI.
    const rec=records.find(r=>r.url.includes('/datencenter/')),body=readFileSync(join(dir,rec.file),'utf8')
    expectedAppearances=release.kanonicniNastopi(vZapisnik(body,{liga:'regionalliga-west'}))
    expectedAppearances.find(p=>p.name==='Medin Kojic').yellow_cards=0
    let changed=0
    const updated=body.replace(/<div class="m-MatchDetails-history-event-text-segment">[\s\S]*?<\/div>/g,segment=>{
     if(!segment.includes('Medin Kojic'))return segment
     changed++;return segment.replace(/\/profil\/\d+\?/,'/profil/9999999?').replace('Medin Kojic','Unassigned Yellow Recipient')
    })
    assert.equal(changed,2);rmSync(join(dir,rec.file));rec.sha256=hash(updated);rec.file=rec.sha256+'.html';writeFileSync(join(dir,rec.file),updated)
    writeFileSync(join(dir,'prenosi.json'),JSON.stringify(records)+'\n');warningReportUrl=rec.url
   }
   const s=m.seasons[i],snapshot=replay.readClosedCapture(dir,m.slug,s.season)
   Object.assign(s.lineage.capture,{indexSha256:snapshot.indexSha256,documentsSha256:snapshot.documentsSha256,capturedAt:snapshot.capturedAt})
   proof.proof.push({season:s.season,runId:s.runId,jobId:s.jobId,captureCommit:fixed,seasonJobPassed:true,lineage:s.lineage})
  }
  const first=await replay.replaySnapshot({dir:dirs[0],slug:m.slug,season:'2025/26',capture:proof.proof[0].lineage.capture})
  assert.equal(first.reports.length,306);assert.equal(first.checked.fixtures.length,306)
  const warningFixture=first.checked.fixtures.find(f=>f.url===warningReportUrl)
  assert.equal(unattributedYellowEvents(warningFixture.warnings).length,1)
  assert.deepEqual(warningFixture.appearances,expectedAppearances)
  const prepared=await release.pripravi({slug:m.slug,sourceCommit:fixed,archiveDir:dirs[0],currentDir:dirs[1],proof}),raw=JSON.stringify(prepared)+'\n'
  assert.equal(prepared.version,2);const documents=loadApprovedDocuments(raw,hash(raw),dirs);assert.equal(documents.size,648)
  const loaded=vZapisnik(documents.get(warningReportUrl),{liga:'regionalliga-west'})
  assert.deepEqual(loaded.opozorila,warningFixture.warnings);assert.deepEqual(release.kanonicniNastopi(loaded),expectedAppearances)
  assert.deepEqual(prepared.seasons[0].fixtures.find(f=>f.url===warningReportUrl).warnings,warningFixture.warnings)
  const tampered=structuredClone(prepared);tampered.seasons[0].fixtures.find(f=>f.url===warningReportUrl).warnings=[]
  const tamperedRaw=JSON.stringify(tampered)+'\n'
  assert.throws(()=>loadApprovedDocuments(tamperedRaw,hash(raw),dirs),/SHA/)
  // Run the real Actions wrapper through its pre-write replay comparison. Even
  // supplying a new approval SHA cannot make altered warnings match raw HTML.
  const wrapper=readFileSync(new URL('./uvozi-dfb-regijo.mjs',import.meta.url),'utf8')
  const main=wrapper.slice(wrapper.indexOf('async function main(){'),wrapper.indexOf('\nif(process.argv[1]'))
  await assert.rejects(()=>runInNewContext(`(async()=>{${main};await main()})()`,{
   process:{argv:['node','wrapper','manifest',hash(tamperedRaw),...dirs,'proof'],env:{}},
   readFileSync:file=>file==='manifest'?tamperedRaw:JSON.stringify(proof),preveriOdobritev:release.preveriOdobritev,pripravi:release.pripravi,actionsOnly(){},
  }),/differs from full offline replay/)
  assert.equal(prepared.seasons[0].capturedAt,proof.proof[0].lineage.capture.capturedAt)
  const index=readFileSync(join(dirs[0],'prenosi.json'))
  writeFileSync(join(dirs[0],'prenosi.json'),index.toString()+' ')
  assert.throws(()=>loadApprovedDocuments(raw,hash(raw),dirs),/index bytes/)
  await assert.rejects(()=>release.pripravi({slug:m.slug,sourceCommit:fixed,archiveDir:dirs[0],currentDir:dirs[1],proof}),/changed/)
  writeFileSync(join(dirs[0],'prenosi.json'),index)
  const records=JSON.parse(index),missing=records.find(r=>r.url.includes('/datencenter/'))
  rmSync(join(dirs[0],missing.file));await assert.rejects(()=>replay.replaySnapshot({dir:dirs[0],slug:m.slug,season:'2025/26',capture:proof.proof[0].lineage.capture}))
 }finally{rmSync(root,{recursive:true,force:true})}
})
test('retained actual Nord failed capture stays failed and cannot masquerade as a direct successful audit',()=>{
 const saved=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-capture-execution.json',import.meta.url)))
 const options={runId:String(saved.run.id),commit:saved.run.head_sha,slug,season}
 const capture=proof.verifyCaptureExecution(saved.run,saved.jobs,options)
 assert.equal(capture.conclusion,'failure');assert.equal(capture.jobId,'117383322693')
 assert.throws(()=>verifier.preveriZagon(saved.run,options.runId,options.commit,{slug,season,jobs:saved.jobs}))
})
test('replay rejects database credentials before reading any source',async()=>{
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-test-value'
 try{await assert.rejects(()=>replay.replaySnapshot({dir:'unused',slug,season,capture:{}}),/database credentials/)}finally{
  if(key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=key
 }
})
test('capture stage binds the actual currently executing replay job before network isolation',()=>{
 assert.equal(typeof proof.verifyRunningReplay,'function')
 const run={...replayRun,status:'in_progress',conclusion:null},job={...replayJob,status:'in_progress',conclusion:null}
 assert.equal(proof.verifyRunningReplay(run,[job],{runId:'45678',commit:fixed}).jobId,'9876')
 for(const bad of [{...run,head_sha:commit},{...run,status:'completed'},{...run,path:parentRun.path}])assert.throws(()=>proof.verifyRunningReplay(bad,[job],{runId:'45678',commit:fixed}))
 assert.throws(()=>proof.verifyRunningReplay(run,[{...job,status:'completed'}],{runId:'45678',commit:fixed}))
})
test('reviewed replay code identity includes provenance, import and workflow files, not only parser',()=>{
 assert.equal(typeof verifier.verifyCode,'function')
 const root=mkdtempSync(join(tmpdir(),'dfb-code-proof-')),before=process.cwd()
 try{
  for(const file of verifier.replayFiles){const path=join(root,file);mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,'reviewed bytes\n')}
  execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'add','.'])
  execFileSync('git',['-C',root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'])
  const commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();process.chdir(root)
  verifier.verifyCode(commit,2)
  for(const file of ['scripts/viri/dfb.mjs','scripts/vklopi-nemcijo.mjs','scripts/preveri-zagona-dfb-regije.mjs','scripts/uvozi-dfb-regijo.mjs','.github/workflows/ponovi-dfb-regijo.yml']){
   writeFileSync(file,'changed bytes\n');assert.throws(()=>verifier.verifyCode(commit,2));writeFileSync(file,'reviewed bytes\n')
  }
 }finally{process.chdir(before);rmSync(root,{recursive:true,force:true})}
})
for(const [commit,expected] of [
 ['a48fd89071aae0d2097603110c5442324fc59e3d','8da6531575cdea2fc740c87eb437a897f796d9c27649dc4dcd56aff5119e1431'],
 ['671643e4a50e6e50cc22628a157fb027e0b58deb','5aaa2067a4f152d62bc4df4bb49492d89e0852d04922fc8709fbf7fb1ea9ebd9'],
 ['f3a09962fd2ea6a72f2b027efdb7eb16a034a052','cc32a4e542fa7e60e73678c6b7b05764de6d5ed6c14d1ebefc9ba7974fff90c7'],
]){
 let available=true;try{execFileSync('git',['cat-file','-e',commit],{stdio:'pipe'})}catch{available=false}
 test(`retained historical capture ${commit.slice(0,7)} keeps its original parser fingerprint`,{skip:!available},()=>{
  assert.equal(replay.parserHashAt(commit),expected)
 })
}
test('new parser history binds codec bytes and cannot omit a declared codec dependency',()=>{
 const root=mkdtempSync(join(tmpdir(),'dfb-codec-history-')),before=process.cwd()
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:'pipe'}).trim()
 const commit=()=>{git('add','-A');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture');return git('rev-parse','HEAD')}
 try{
  for(const file of release.sourceFiles){const path=join(root,file);mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,file==='scripts/viri/dfb.mjs'?"import '../../src/lib/nepripisaniRumeni.mjs'\n":'reviewed bytes\n')}
  git('init','-q');const original=commit();process.chdir(root);const initial=replay.parserHashAt(original)
  writeFileSync('src/lib/nepripisaniRumeni.mjs','changed codec bytes\n');assert.notEqual(replay.parserHashAt(commit()),initial)
  const policy='scripts/lib/historical-statistics-policy.mjs';rmSync(policy);assert.throws(()=>replay.parserHashAt(commit()),/historical-statistics-policy/);writeFileSync(policy,'reviewed bytes\n')
  rmSync('src/lib/nepripisaniRumeni.mjs');assert.throws(()=>replay.parserHashAt(commit()),/nepripisaniRumeni/)
 }finally{process.chdir(before);rmSync(root,{recursive:true,force:true})}
})

test('policy current capture requires successful actual execution and original strict-ready coverage',async()=>{
 const season='2026/27',options={runId:'12345',commit,slug:'de-regionalliga-suedwest',season,historical:true},run={...parentRun,conclusion:'success'},job={...parentJob,conclusion:'success',steps:[{...step,name:proof.captureStep(season),conclusion:'success'},{...upload,name:proof.captureUpload(season)}]}
 assert.equal(proof.verifyCaptureExecution(run,[job],options).conclusion,'success')
 assert.throws(()=>proof.verifyCaptureExecution({...run,conclusion:'failure'},[{...job,conclusion:'failure',steps:[{...job.steps[0],conclusion:'failure'},job.steps[1]]}],options),/current.*capture|capture.*current/)
 const dir=mkdtempSync(join(tmpdir(),'dfb-policy-current-ready-'))
 try{
  tinyCapture(dir)
  const report={vir:'dfb',koda:'regionalliga-suedwest/2026-2027',sezona:season,prenesenih:1,krogov:34,klubov:18,odigranih:105,zapisnikov:105,postavPo11:210,pokritost:true,pripravljeno:true,napake:[],opozorila:[],cakajoci:[],klubiBrezVratarja:[]},save=x=>writeFileSync(join(dir,'porocilo.json'),JSON.stringify(x)),capture={conclusion:'success'}
  save(report);assert.equal(replay.readClosedCapture(dir,options.slug,season,capture,{historical:true}).originalReport.pripravljeno,true)
  for(const change of[x=>x.pripravljeno=false,x=>x.pokritost=false,x=>x.zapisnikov--,x=>x.postavPo11--,x=>x.napake=['bad'],x=>x.klubiBrezVratarja=['Missing keeper'],x=>x.cakajoci=[{}]]){
   const bad=structuredClone(report);change(bad);save(bad);assert.throws(()=>replay.readClosedCapture(dir,options.slug,season,capture,{historical:true}))
  }
  save({...report,pripravljeno:false})
  await assert.rejects(()=>replay.replaySnapshot({dir,slug:options.slug,season,capture,statisticsPolicy:{id:'de-dfb-suedwest-2025-historical-unavailable-v1'}}),/current.*capture|capture.*current/)
  save(report);assert.throws(()=>replay.readClosedCapture(dir,options.slug,season,{conclusion:'failure'},{historical:true}),/current.*capture|capture.*current/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
