import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
const api=await import('./fussball-baden-r10-accounting.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
test('budget reader accepts only own GET IO and never serialized totals or clock authority',async()=>{
 assert.equal(typeof api.readFussballBadenR10Budget,'function')
 assert.equal(typeof api.getFussballBadenR10Budget,'function')
 assert.throws(()=>api.getFussballBadenR10Budget({priorRequests:3607}),/PRIVATE_CAPABILITY/)
 for(const key of ['priorRequests','budget','proof','sourceHead','clock','now','allowUnknown','excludeNightly']){
  let calls=0;await assert.rejects(api.readFussballBadenR10Budget({github:()=>{calls++},[key]:true}),/INPUT/);assert.equal(calls,0)
 }
 await assert.rejects(api.readFussballBadenR10Budget({github:async()=>{throw Error('TEST_ONLY_SECRET')}}),e=>
  e.dataHold===true&&e.githubPath?.startsWith(prefix+'actions/runs?created=')&&!e.message.includes('SECRET'))
})
test('budget enumeration refuses incomplete or duplicate pages before historical budget IO',async()=>{
 assert.equal(typeof api.readFussballBadenR10Budget,'function')
 for(const value of [{total_count:1001,workflow_runs:[]},{total_count:1,workflow_runs:[]},{total_count:2,workflow_runs:[{id:1},{id:1}]}]){
  await assert.rejects(api.readFussballBadenR10Budget({github:async path=>{assert.ok(path.includes('/actions/runs?created='));return value}}),/INVENTORY/)
 }
})

const E=process.env.FUSSBALL_R10_FOUNDATION_EVIDENCE
const D=E&&join(E,'evidence/baden-r10-budget-reconciliation-20261030')
function retained(){
 const responses=new Map(),calls=[],controls={},r9=join(E,'baden-fresh-pair-40859714195-terminal-20261029-attempt1')
 const load=(root,p)=>JSON.parse(readFileSync(join(root,p))),set=(p,v)=>responses.set(prefix+p,v)
 for(const name of ['R7','R8']){
  const dir=join(r9,'originals/history/'+name),run=load(dir,'run.json'),a=load(dir,'artifact.json')
  set('actions/runs/'+run.id,run);set(`actions/runs/${run.id}/attempts/1/jobs?per_page=100&page=1`,load(dir,'jobs.json'))
  set('actions/artifacts/'+a.id,a);set('actions/artifacts/'+a.id+'/zip',readFileSync(join(dir,'artifact.zip')))
 }
 const runs=Array.from({length:5},(_,i)=>load(D,`all-runs-page${i+1}.json`).workflow_runs).flat()
 for(const r of runs){
  set('actions/runs/'+r.id,r)
  const job=join(D,`jobs-${r.id}-1-page1.json`),inventory=join(D,`artifacts-${r.id}.json`)
  if(existsSync(job))set(`actions/runs/${r.id}/attempts/1/jobs?per_page=100&page=1`,JSON.parse(readFileSync(job)))
  if(existsSync(inventory))set(`actions/runs/${r.id}/artifacts?per_page=100&page=1`,JSON.parse(readFileSync(inventory)))
 }
 set('actions/runs/40859714195',load(r9,'run.json'));set('actions/runs/40859714195/artifacts?per_page=100&page=1',load(r9,'artifacts.json'))
 set('actions/artifacts/12894726197',load(r9,'artifact-12894726197.json'));set('actions/artifacts/12894726197/zip',readFileSync(join(r9,'artifact-12894726197.zip')))
 for(const id of [12952553352,12955226825,12960568119]){set('actions/artifacts/'+id,load(D,`artifact-${id}.json`));set('actions/artifacts/'+id+'/zip',readFileSync(join(D,`artifact-${id}.zip`)))}
 for(const id of [40865798117,40884594936,41011276709]){
  const jobs=load(D,`jobs-${id}-1-page1.json`),job=jobs.jobs.find(j=>j.name==='uvoz DE')
  set('actions/jobs/'+job.id+'/logs',readFileSync(join(D,`de-nightly-${id}.log`)))
 }
 for(const p of JSON.parse(readFileSync(new URL('./fussball-baden-r10-exclusions.json',import.meta.url))).ancestorCoverage.knownReferencedAncestors)
  set('actions/runs/'+p.runId,load(D,'ancestor-live-'+p.runId+'.json'))
 let scan=0
 return {calls,controls,runs,github:async(path,binary=false)=>{
  calls.push({path,binary});let v
  if(path.startsWith(prefix+'actions/runs?created=')){
   const page=Number(new URL('https://api.invalid/'+path).searchParams.get('page'));if(page===1)scan++
   const base=controls.reviewedOnly?runs.filter(r=>JSON.parse(readFileSync(new URL('./fussball-baden-r10-accounting.json',import.meta.url))).records.some(p=>p.run.id===r.id)||JSON.parse(readFileSync(new URL('./fussball-baden-r10-exclusions.json',import.meta.url))).groups.some(g=>g.workflow===r.path)):runs;const list=controls.inventory?.(structuredClone(base),scan)??base;v={total_count:list.length,workflow_runs:list.slice((page-1)*100,page*100)}
  }else if(path.startsWith(prefix+'git/commits/')){
   const head=path.slice((prefix+'git/commits/').length),tree=execFileSync('git',['show','-s','--format=%T',head],{encoding:'utf8'}).trim();v={sha:head,tree:{sha:tree}}
  }else if(path.startsWith(prefix+'contents/')){
   const[file,head]=path.slice((prefix+'contents/').length).split('?ref='),b=execFileSync('git',['show',head+':'+file],{maxBuffer:8*1024*1024});v={type:'file',path:file,size:b.length,encoding:'base64',content:b.toString('base64')}
  }else{assert.ok(responses.has(path),'retained own GET '+path);v=responses.get(path)}
  v=controls.change?.(path,v,binary)??v;return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)
 }}
}
test('genuine snapshot classifies exact55 and24 body-bound service runs but holds incomplete exclusions and ancestors',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00.000Z'))
 t.mock.method(globalThis,'fetch',()=>{throw Error('TEST ONLY network forbidden')})
 const f=retained()
 await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>{
  const v=e.audit
  assert.equal(v.authenticatedMinimumSpent,3607);assert.equal(v.freshAccountingKnown,false)
  assert.equal(v.executions.filter(x=>x.kind==='regular-dfb-nightly').length,3)
  assert.equal(v.executions.filter(x=>x.kind==='native-before-individual-import').length,3)
  assert.equal(v.executions.filter(x=>x.kind==='reviewed-own-service-group').length,24)
  assert.equal(v.executions.find(x=>x.runId==='40859714195').alreadyAccountedRequests,587)
  const n=v.executions.find(x=>x.runId==='41011276709');assert.equal(n.physicalProviderAttempts,null);assert.equal(n.redirectVisibility,'NOT_JOURNALED')
  assert.equal(v.ancestorCoverage.complete,false);assert.equal(v.ancestorCoverage.ancestors.length,9)
  assert.ok(e.blockers.some(b=>b.reason==='PRE_R7_ANCESTOR_COVERAGE_NOT_CLOSED'))
  assert.ok(e.blockers.some(b=>b.path==='.github/workflows/uvoz-lige.yml'))
  if(process.env.FUSSBALL_R10_REVIEW_FIX_RESULT_DIR)writeFileSync(join(process.env.FUSSBALL_R10_REVIEW_FIX_RESULT_DIR,'PARTIAL-COVERAGE-HOLD.json'),JSON.stringify({status:'HOLD',blockers:e.blockers,executions:v.executions,ancestorCoverage:v.ancestorCoverage,authenticatedMinimumSpent:v.authenticatedMinimumSpent,freshAccountingKnown:false,sourceOperationAuthorized:false,networkGETs:0,providerGETs:0},null,2)+'\n')
  return true
 })
})
test('service group can authenticate different-head matching critical bytes without trusting the head or title alone',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00.000Z'))
 const f=retained();f.controls.reviewedOnly=true
 const target=f.runs.find(r=>r.path.endsWith('/zivost.yml')),head='5f7a0f00b96f31fdb7cd385140494dfe4f89eb6f'
 // TEST ONLY metadata variation; both workflow bodies are genuine Git objects.
 f.controls.inventory=rows=>rows.map(r=>r.id===target.id?{...r,head_sha:head}:r)
 f.controls.change=(path,v)=>path===prefix+'actions/runs/'+target.id?{...v,head_sha:head}:
  path===prefix+`actions/runs/${target.id}/attempts/1/jobs?per_page=100&page=1`?{...v,jobs:v.jobs.map(j=>({...j,head_sha:head}))}:v
 await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>{
  assert.ok(e.audit.executions.some(x=>x.runId===String(target.id)&&x.kind==='reviewed-own-service-group'))
  assert.equal(e.blockers.some(b=>b.runId===String(target.id)),false)
  return e.blockers.some(b=>b.reason==='PRE_R7_ANCESTOR_COVERAGE_NOT_CLOSED')
 })
})
test('ordinary or foreign labels cannot hide an unknown executed HEAD/body or changed job source mode',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00.000Z'))
 for(const mode of ['ordinary-head','foreign-head','ordinary-body','ordinary-source-step']){
  const f=retained(),target=f.runs.find(r=>r.path.endsWith(mode==='foreign-head'?'/uvoz-lige.yml':'/zivost.yml'))
  if(mode.endsWith('-head'))f.controls.inventory=rows=>rows.map(r=>r.id===target.id?{...r,head_sha:'0'.repeat(40)}:r)
  f.controls.change=(path,v)=>{
   if(mode==='ordinary-body'&&path.includes('contents/.github/workflows/zivost.yml'))return {...v,content:Buffer.from('TEST ONLY capture FUSSBALL instead').toString('base64')}
   if(mode==='ordinary-source-step'&&path===prefix+`actions/runs/${target.id}/attempts/1/jobs?per_page=100&page=1`)return {...v,jobs:v.jobs.map(j=>({...j,steps:[...j.steps,{number:99,name:'TEST ONLY Capture FUSSBALL',status:'completed',conclusion:'success'}]}))}
   return v
  }
  await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>e.blockers?.some(b=>b.runId===String(target.id)))
 }
})
test('pre-R7 run rerun is observed outside the created-at census and never assumed refunded or charged',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00.000Z'))
 const f=retained();f.controls.reviewedOnly=true;f.controls.change=(path,v)=>path===prefix+'actions/runs/40416972177'?{...v,run_attempt:2,updated_at:'2026-10-30T13:00:00Z'}:v
 await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>{
  const a=e.audit?.ancestorCoverage?.ancestors?.find(a=>a.runId==='40416972177')
  assert.equal(a?.latestAttempt,2);assert.equal(a.additionalRequests,null)
  return e.blockers.some(b=>b.reason==='PRE_R7_ANCESTOR_COVERAGE_NOT_CLOSED')
 })
})
test('unknown failed research, rerun, live source and late inventory drift remain exact execution HOLDs',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T12:30:00.000Z'))
 for(const mode of ['unknown','live','rerun','late']){
  const f=retained();f.controls.reviewedOnly=true;f.controls.inventory=(rows,scan)=>{
   if(mode==='late'&&scan===1)return rows
   const r=structuredClone(rows.find(r=>r.id===40859714195));r.id=99999900001;r.run_attempt=mode==='rerun'?2:1;r.status=mode==='live'?'in_progress':'completed';r.conclusion=mode==='live'?null:'failure';return [r,...rows]
  }
  await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>e.dataHold===true&&e.blockers?.some(b=>b.runId==='99999900001'))
 }
})
test('runtime drift, native original substitution and altered nightly scope never become zero or outside-profile expenditure',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T12:30:00.000Z'))
 for(const mode of ['runtime','native','nightly']){
  const f=retained();f.controls.reviewedOnly=true;f.controls.change=(path,v)=>{
   if(mode==='runtime'&&path.includes('contents/scripts/replay-fussball-cards.mjs'))return {...v,content:Buffer.from('TEST ONLY changed runtime').toString('base64')}
   if(mode==='native'&&path.endsWith('/12960568119/zip'))return Buffer.from('TEST ONLY changed native original')
   if(mode==='nightly'&&path.includes('/actions/jobs/')&&path.endsWith('/logs'))return Buffer.from(v.toString().replace('de-regionalliga-west','de-verbandsliga-baden'))
   return v
  }
  await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>e.blockers?.some(b=>b.reason?.includes(mode==='runtime'?'RUNTIME_BODY':mode==='native'?'NATIVE_ZIP_DIGEST':'NIGHTLY_ORIGINAL')))
 }
})
test('late changed metadata is retained alongside the initial original when reconciliation holds',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T12:30:00.000Z'))
 const f=retained();f.controls.reviewedOnly=true;let reads=0
 f.controls.change=(path,v)=>path===prefix+'actions/runs/41014610806'&&++reads>1?{...v,updated_at:'TEST ONLY LATE METADATA'}:v
 await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>{
  assert.ok(e.blockers.some(b=>b.runId==='41014610806'&&b.reason==='LATE_METADATA_DRIFT'))
  assert.ok([...e.originals.values()].some(b=>b.includes('TEST ONLY LATE METADATA')),'changed hosted original must remain retained')
  return true
 })
})
test('execution created during late mutable rechecks prevents budget issuance',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T12:30:00.000Z'))
 const f=retained();f.controls.reviewedOnly=true;f.controls.inventory=(rows,scan)=>{
  if(scan<3)return rows
  // TEST ONLY unknown source execution appearing after the second inventory.
  const r=structuredClone(rows.find(r=>r.id===40859714195));r.id=99999900002;return [r,...rows]
 }
 await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>e.blockers?.some(b=>b.runId==='99999900002'))
})
