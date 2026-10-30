import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {badenR10HistoryFamilies} from './fussball-baden-r10-history.mjs'
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
const immutableTestCache=new Map()
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
  const job=existsSync(join(D,`jobs-${r.id}-1-page1.json`))?join(D,`jobs-${r.id}-1-page1.json`):join(D,'closure-groups',`jobs-${r.id}-1-page1.json`),inventory=join(D,`artifacts-${r.id}.json`)
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
 const H=join(D,'closure-groups'),C=join(D,'checkout-closure'),P=join(E,'evidence/baden-pre-r7-family-closure-20261030'),pre=load(P,'PROVENANCE.json')
 for(const w of badenR10HistoryFamilies){
  const first=['preveri-baden-r10-current.yml','derive-baden-r10-m2.yml','transition-baden-r10-m2.yml','uvoz-baden-r10-native.yml','refresh-baden-r10-native.yml'].includes(w)?{total_count:0,workflow_runs:[]}:load(H,'history-'+w+'.json');for(let page=1;page<=Math.max(1,Math.ceil(first.total_count/100));page++){
   const v=page===1?first:load(H,'history-'+w+'-page'+page+'.json');set(`actions/workflows/${w}/runs?per_page=100&page=${page}`,v)
   for(const r of v.workflow_runs)if(!responses.has(prefix+'actions/runs/'+r.id))set('actions/runs/'+r.id,r)
  }
 }
 for(const r of pre.olderRuns){set('actions/runs/'+r.runId,load(P,r.finalRunFile));for(const a of r.attempts)set(`actions/runs/${r.runId}/attempts/${a.attempt}/jobs?per_page=100&page=1`,load(P,a.jobsFile))}
 for(const name of existsSync(C)?execFileSync('ls',[C],{encoding:'utf8'}).trim().split('\n'):[]){
  if(/^run-\d+\.json$/.test(name))set('actions/runs/'+name.slice(4,-5),load(C,name))
  if(/^jobs-\d+-\d+-page1\.json$/.test(name)){const[id,attempt]=name.slice(5,-5).split('-');set(`actions/runs/${id}/attempts/${attempt}/jobs?per_page=100&page=1`,load(C,name))}
  if(/^commit-[a-f0-9]{40}\.json$/.test(name))set('git/commits/'+name.slice(7,-5),load(C,name))
  if(/^tree-[a-f0-9]{40}\.json$/.test(name))set('git/trees/'+name.slice(5,-5)+'?recursive=1',load(C,name))
  if(name==='de-nightly-41060320786.log')set('actions/jobs/124078176581/logs',readFileSync(join(C,name)))
  if(/^(?:build|scout)-\d+-\d+\.log$/.test(name))set('actions/jobs/'+name.split('-')[2].slice(0,-4)+'/logs',readFileSync(join(C,name)))
 }
 let scan=0
 return {calls,controls,runs,github:async(path,binary=false)=>{
  calls.push({path,binary});let v
  if(responses.has(path)&&(path.includes('/git/commits/')||path.includes('/git/trees/'))){v=responses.get(path);v=controls.change?.(path,v,binary)??v;return structuredClone(v)}
  if(immutableTestCache.has(path)){v=immutableTestCache.get(path);v=controls.change?.(path,v,binary)??v;return structuredClone(v)}
  if(path.startsWith(prefix+'actions/workflows/')&&controls.reviewedOnly){
   const w=path.slice((prefix+'actions/workflows/').length).split('/')[0],page=Number(new URL('https://api.invalid/'+path).searchParams.get('page')),ids=new Set(JSON.parse(readFileSync(new URL('./fussball-baden-r10-accounting.json',import.meta.url))).records.map(p=>p.run.id)),all=[...responses.entries()].filter(([p])=>p.startsWith(prefix+'actions/workflows/'+w+'/runs?')).flatMap(([,v])=>v.workflow_runs).filter(r=>r.created_at<'2026-10-28T20:15:01Z'||ids.has(r.id));v={total_count:all.length,workflow_runs:all.slice((page-1)*100,page*100)}
  }else if(path.startsWith(prefix+'actions/runs?created=')){
   const page=Number(new URL('https://api.invalid/'+path).searchParams.get('page'));if(page===1)scan++
   const base=controls.reviewedOnly?runs.filter(r=>JSON.parse(readFileSync(new URL('./fussball-baden-r10-accounting.json',import.meta.url))).records.some(p=>p.run.id===r.id)||JSON.parse(readFileSync(new URL('./fussball-baden-r10-exclusions.json',import.meta.url))).groups.some(g=>g.workflow===r.path)):runs;const list=controls.inventory?.(structuredClone(base),scan)??base;v={total_count:list.length,workflow_runs:list.slice((page-1)*100,page*100)}
  }else if(path.startsWith(prefix+'git/commits/')){
   const head=path.slice((prefix+'git/commits/').length),tree=execFileSync('git',['show','-s','--format=%T',head],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();v={sha:head,tree:{sha:tree}}
  }else if(path.startsWith(prefix+'git/trees/')){
   const tree=path.slice((prefix+'git/trees/').length).split('?')[0],lines=execFileSync('git',['-c','core.quotepath=false','ls-tree','-rl','--full-tree',tree],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split('\n');v={sha:tree,truncated:false,tree:lines.map(line=>{const m=line.match(/^(\d+) (\w+) ([a-f0-9]{40})\s+(\d+)\t(.+)$/);assert.ok(m);return {mode:m[1],type:m[2],sha:m[3],size:Number(m[4]),path:m[5]}})}
  }else if(path.startsWith(prefix+'contents/')){
   const[file,head]=path.slice((prefix+'contents/').length).split('?ref='),b=execFileSync('git',['show',head+':'+file],{maxBuffer:8*1024*1024});v={type:'file',path:file,size:b.length,encoding:'base64',content:b.toString('base64')}
  }else{assert.ok(responses.has(path),'retained own GET '+path);v=responses.get(path)}
  if(path.startsWith(prefix+'git/')||path.startsWith(prefix+'contents/'))immutableTestCache.set(path,v)
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
  assert.equal(v.executions.filter(x=>x.kind==='regular-dfb-nightly-active-foreign').length,1)
  assert.equal(v.executions.filter(x=>x.kind==='native-before-individual-import').length,3)
  assert.equal(v.executions.filter(x=>x.kind==='reviewed-own-service-group').length,24)
  assert.equal(v.executions.filter(x=>x.kind==='reviewed-independent-fcf-before-source').length,2)
  assert.equal(v.executions.filter(x=>x.kind==='authenticated-independent-fcf-mode').length,4)
  assert.equal(e.blockers.some(b=>b.reason==='BADEN_R10_BUDGET_GROUP_ATTEMPT'),false)
  assert.equal(v.executions.find(x=>x.runId==='40859714195').alreadyAccountedRequests,587)
  const n=v.executions.find(x=>x.runId==='41011276709');assert.equal(n.physicalProviderAttempts,null);assert.equal(n.redirectVisibility,'NOT_JOURNALED')
  assert.equal(v.ancestorCoverage.complete,true);assert.ok(v.ancestorCoverage.olderRuns.length>=21)
  assert.ok(v.executions.some(x=>x.kind==='reviewed-content-vector-group'))
  if(process.env.FUSSBALL_R10_REVIEW_FIX_RESULT_DIR)writeFileSync(join(process.env.FUSSBALL_R10_REVIEW_FIX_RESULT_DIR,'PARTIAL-COVERAGE-HOLD.json'),JSON.stringify({status:'HOLD',blockers:e.blockers,executions:v.executions,ancestorCoverage:v.ancestorCoverage,authenticatedMinimumSpent:v.authenticatedMinimumSpent,freshAccountingKnown:false,sourceOperationAuthorized:false,networkGETs:0,providerGETs:0},null,2)+'\n')
  return true
 })
})
test('service group can authenticate different-head matching critical bytes without trusting the head or title alone',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00.000Z'))
 const f=retained();f.controls.reviewedOnly=true
 const target=f.runs.find(r=>r.path.endsWith('/zivost.yml')),head='5f7a0f00b96f31fdb7cd385140494dfe4f89eb6f'
 // TEST ONLY metadata variation; both workflow bodies are genuine Git objects.
 f.controls.inventory=rows=>[...rows.map(r=>r.id===target.id?{...r,head_sha:head}:r),{...structuredClone(rows.find(r=>r.id===40859714195)),id:99999900003}]
 f.controls.change=(path,v)=>path===prefix+'actions/runs/'+target.id?{...v,head_sha:head}:
  path===prefix+`actions/runs/${target.id}/attempts/1/jobs?per_page=100&page=1`?{...v,jobs:v.jobs.map(j=>({...j,head_sha:head}))}:v
 await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>{
  assert.ok(e.audit.executions.some(x=>x.runId===String(target.id)&&x.kind==='reviewed-own-service-group'))
  assert.equal(e.blockers.some(b=>b.runId===String(target.id)),false)
  return e.audit.ancestorCoverage.complete===true
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
  assert.equal(e.audit.ancestorCoverage.complete,false);assert.equal(e.audit.ancestorCoverage.runId,'40416972177')
  return e.blockers.some(b=>b.reason==='BADEN_HISTORY_LATEST_ATTEMPT_DRIFT')
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

test('content groups reject changed critical code, DE input and executed CI research job',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00Z'))
 for(const mode of ['code','country','source-job']){
  const f=retained(),target=f.runs.find(r=>r.status==='completed'&&(mode==='country'?r.path.endsWith('/uvoz-lige.yml'):mode==='source-job'?r.path.endsWith('/ci.yml')&&r.event==='push':r.path.endsWith('/preveri-podatke.yml')))
  const baseIds=new Set(JSON.parse(readFileSync(new URL('./fussball-baden-r10-accounting.json',import.meta.url))).records.map(p=>p.run.id))
  f.controls.inventory=rows=>rows.filter(r=>baseIds.has(r.id)||r.id===target.id).map(r=>r.id===target.id&&mode==='country'?{...r,display_title:'Uvoz lige de-verbandsliga-baden'}:r)
  f.controls.change=(path,v)=>{
   if(mode==='code'&&path.includes('/git/trees/'))return {...v,tree:v.tree.map(e=>e.path==='scripts/viri/fussball-public.mjs'?{...e,sha:'0'.repeat(40)}:e)}
   if(mode==='country'&&path===prefix+'actions/runs/'+target.id)return {...v,display_title:'Uvoz lige de-verbandsliga-baden'}
   if(mode==='source-job'&&path===prefix+`actions/runs/${target.id}/attempts/1/jobs?per_page=100&page=1`)return {...v,jobs:v.jobs.map(j=>j.name==='novi-viri'?{...j,conclusion:'success'}:j)}
   return v
  }
  await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>{return e.blockers?.some(b=>b.runId===String(target.id)&&b.reason.includes(mode==='code'?'UNREVIEWED_EXECUTED_VECTOR':mode==='country'?'FOREIGN_INPUT_SCOPE':'RESEARCH_JOBS_NOT_SKIPPED'))})
 }
})

test('TEST ONLY closed reduced census issues a private 60-second budget with live historical retry closure',{skip:!E},async t=>{
 let clock=Date.parse('2026-10-30T13:10:00Z');t.mock.method(Date,'now',()=>clock)
 t.mock.method(globalThis,'fetch',()=>{throw Error('TEST ONLY network forbidden')})
 const f=retained();f.controls.reviewedOnly=true
 const proof=await api.readFussballBadenR10Budget({github:f.github}),data=api.getFussballBadenR10Budget(proof)
 assert.equal(data.budget.priorRequests,3607);assert.equal(data.budget.cumulativeReserved,4387);assert.equal(data.sourceOperationAuthorized,false)
 assert.throws(()=>api.getFussballBadenR10Budget(structuredClone(proof)),/PRIVATE_CAPABILITY/)
 clock+=60000;assert.throws(()=>api.getFussballBadenR10Budget(proof),/EXPIRED/)
})

test('existing exact FCF zero witness and skipped club repair cannot accept another head or executed source step',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00Z'))
 for(const mode of ['fcf-head','fcf-step','club-step']){
  const f=retained();f.controls.reviewedOnly=true;const id=mode==='club-step'?41015173935:40792858711,target=structuredClone(f.runs.find(r=>r.id===id)),head='0'.repeat(40)
  f.controls.inventory=rows=>[...rows,{...target,...(mode==='fcf-head'?{head_sha:head}:{})}]
  f.controls.change=(p,v)=>{
   if(mode==='fcf-head'&&p===prefix+'actions/runs/'+id)return {...v,head_sha:head}
   if(p===prefix+`actions/runs/${id}/attempts/1/jobs?per_page=100&page=1`)return {...v,jobs:v.jobs.map(j=>mode==='fcf-head'?{...j,head_sha:head}:mode==='club-step'&&j.name==='fcf-g13'?{...j,conclusion:'success'}:mode==='fcf-step'&&j.steps.length?{...j,steps:[...j.steps,{number:99,name:'TEST ONLY unexpected provider command',status:'completed',conclusion:'success'}]}:j)}
   return v
  }
  await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>e.blockers?.some(b=>b.runId===String(id)&&b.reason.includes(mode==='club-step'?'CLUB_REPAIR_NOT_SKIPPED':'FCF_ZERO_WITNESS_HOLD')))
 }
})

test('fixed FCF mode rejects changed provider URL bytes, frozen verifier bytes and another actual attempt',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T13:10:00Z'))
 for(const mode of ['url','frozen','attempt']){
  const f=retained();f.controls.reviewedOnly=true;const id=40851165521,target=structuredClone(f.runs.find(r=>r.id===id));f.controls.inventory=rows=>[...rows,{...target,...(mode==='attempt'?{run_attempt:2}:{})}]
  f.controls.change=(p,v)=>{
   if(mode==='url'&&p.includes('contents/scripts/fcf-g1-remainder-source.mjs?ref='))return {...v,content:Buffer.from('TEST ONLY provider URL changed to https://www.fussball.de/').toString('base64')}
   if(mode==='frozen'&&p.includes('contents/scripts/fcf-future-source-plan.mjs?ref=3ed1'))return {...v,content:Buffer.from('TEST ONLY changed frozen code').toString('base64')}
   if(mode==='attempt'&&p===prefix+'actions/runs/'+id)return {...v,run_attempt:2}
   return v
  }
  await assert.rejects(api.readFussballBadenR10Budget({github:f.github}),e=>e.blockers?.some(b=>b.runId===String(id)&&b.reason.includes(mode==='attempt'?'FCF_MODE_EVIDENCE_HOLD':'FCF_MODE_RUNTIME_BODY')))
 }
})
import {refreshFixture} from './fussball-baden-r10-refresh-test-fixture.mjs'
test('TEST ONLY restricted census reconciles real native originals into distinct fresh5000 remainder without trusting artifact B',{skip:!E},async t=>{
 const native=await refreshFixture(t,{prior:3607,fail:'connect'}),lease=await native.prepare();native.setCapture();await native.api.captureBadenR10Refresh({lease});native.finish();t.mock.method(Date,'now',()=>native.f.clock);t.mock.method(globalThis,'fetch',()=>{throw Error('TEST ONLY all network blocked')});const base=retained();base.controls.reviewedOnly=true;base.controls.inventory=rows=>[...rows,native.run]
 const github=async(p,binary=false)=>p.startsWith(prefix+'actions/workflows/refresh-baden-r10-native.yml/runs?')?{total_count:1,workflow_runs:[native.run]}:native.responses.has(p)?native.github(p,binary):base.github(p,binary)
 const proof=await api.readFussballBadenNativeRemainingBudget({github}),value=api.getFussballBadenNativeRemainingBudget(proof),execution=value.executions.find(e=>e.runId===native.runId);assert.equal(execution.newResearchRequests,native.fetches);assert.equal(execution.failedAttempts,1);assert.equal(value.budget.priorRequests,3607+native.fetches);assert.equal(value.budget.remainingRequests,5000-value.budget.priorRequests);assert.throws(()=>api.getFussballBadenR10Budget(proof),/PRIVATE_CAPABILITY/);assert.throws(()=>api.getFussballBadenNativeRemainingBudget(structuredClone(proof)),/PRIVATE_NATIVE_REMAINDER/);assert.equal(value.sourceOperationAuthorized,false)
})
test('native remainder reader refuses serialized counters and caller caps before own GitHub IO',async()=>{
 assert.equal(typeof api.readFussballBadenNativeRemainingBudget,'function');for(const key of ['remainingRequests','maxRequests','priorRequests','proof','clock']){let calls=0;await assert.rejects(api.readFussballBadenNativeRemainingBudget({github:async()=>calls++,[key]:1000}),/INPUT/);assert.equal(calls,0)}
})

test('TEST ONLY full ledger never infers native zero from a missing or partial capture graph',{skip:!E},async t=>{
 const native=await refreshFixture(t),base=retained();t.mock.method(Date,'now',()=>native.f.clock);t.mock.method(globalThis,'fetch',()=>{throw Error('TEST ONLY network forbidden')});base.controls.reviewedOnly=true;base.controls.inventory=rows=>[...rows,native.run];const names=[...readFileSync(new URL('./../.github/workflows/refresh-baden-r10-native.yml',import.meta.url),'utf8').matchAll(/^\s+- name: (.+)$/gm)].map(m=>m[1]),jobPath=prefix+`actions/runs/${native.runId}/attempts/1/jobs?per_page=100&page=1`,stamp=new Date(native.f.clock).toISOString()
 let graph,completeTerminal;const github=async(p,binary=false)=>p.startsWith(prefix+'actions/workflows/refresh-baden-r10-native.yml/runs?')?{total_count:1,workflow_runs:[native.run]}:p===jobPath?structuredClone(graph):p===prefix+'actions/runs/'+native.runId?structuredClone(native.run):native.responses.has(p)?native.github(p,binary):base.github(p,binary)
 for(const status of ['in_progress','completed'])for(const mutation of ['missing-capture','missing-prior','reordered','partial']){
  native.run.status=status;native.run.conclusion=status==='completed'?'failure':null;const b=names.indexOf('Prepare private fixed5000 native remainder');graph={total_count:1,jobs:[{id:8801,name:'refresh',run_id:native.run.id,run_attempt:1,head_sha:native.head,status,steps:names.map((name,i)=>({number:i+1,name,status:status==='completed'||i<b?'completed':i===b?'in_progress':'queued',conclusion:status==='completed'?(i<b?'success':i===b?'failure':i===names.length-1?'success':'skipped'):i<b?'success':null,started_at:status==='completed'?(i<=b||i===names.length-1?stamp:null):i<=b?stamp:null,completed_at:status==='completed'?(i<=b||i===names.length-1?stamp:null):i<b?stamp:null}))}]};const steps=graph.jobs[0].steps;if(status==='completed')completeTerminal=structuredClone(graph)
  if(mutation==='missing-capture')steps.splice(steps.findIndex(s=>s.name==='Capture fixed Baden native refresh'),1)
  if(mutation==='missing-prior')steps.shift()
  if(mutation==='reordered')[steps[0],steps[1]]=[steps[1],steps[0]]
  if(mutation==='partial')steps.splice(6)
  await assert.rejects(api.readFussballBadenNativeRemainingBudget({github}),e=>{assert.ok(e.blockers?.some(b=>b.runId===native.runId&&(b.reason.includes('GRAPH')||status==='in_progress'&&b.reason.includes('PRIVATE_PREPARE'))),status+' '+mutation);assert.ok(!e.audit?.executions.some(x=>x.runId===native.runId&&x.newResearchRequests===0));return true})
 }
 graph=completeTerminal;const proof=await api.readFussballBadenNativeRemainingBudget({github}),value=api.getFussballBadenNativeRemainingBudget(proof),execution=value.executions.find(e=>e.runId===native.runId);assert.equal(execution.classification,'ACTUAL_SOURCE_STEP_UNEXECUTED');assert.equal(execution.newResearchRequests,0);assert.equal(value.budget.priorRequests,3607);assert.equal(native.fetches,0)
})
import {isolateR10} from './fussball-baden-r10-m2-test-fixture.mjs'
async function privateTestLedger(refresh){
 // TEST ONLY copy of real reconciliation with the same copied prepare issuer's
 // opaque verifier. Every other function and immutable receipt stays real.
 const body=readFileSync(new URL('./fussball-baden-r10-accounting.mjs',import.meta.url),'utf8'),deps={}
 for(const m of body.matchAll(/^import \{([^}]+)\} from '([^']+)'$/gm)){const ns=await import(m[2].startsWith('.')?new URL(m[2],import.meta.url).href:m[2]);for(const raw of m[1].split(',')){const [name,alias]=raw.trim().split(/\s+as\s+/);deps[alias??name]=ns[name]}}
 return isolateR10('./fussball-baden-r10-accounting.mjs',{...deps,authenticateBadenR10PreparingPrefix:refresh.api.authenticateBadenR10PreparingPrefix,beginBadenR10PreparingReconciliation:refresh.api.beginBadenR10PreparingReconciliation},['readFussballBadenNativeRemainingBudget','getFussballBadenNativeRemainingBudget'])
}
test('TEST ONLY complete real ledger accepts solely its private own preparing prefix; unrelated active, copied and burned control HOLD',{skip:!E},async t=>{
 for(const foreign of [false,true]){
  const f=await refreshFixture(t),base=retained(),ledger=await privateTestLedger(f),other={...structuredClone(f.run),id:99999999993};t.mock.method(Date,'now',()=>f.f.clock);base.controls.reviewedOnly=true;base.controls.inventory=rows=>[...rows,f.run,...(foreign?[other]:[])];f.controls.jobs=value=>{const j=value.jobs[0],i=j.steps.findIndex(s=>s.name==='Prepare private fixed5000 native remainder');j.steps=j.steps.slice(0,i+1).map((s,i)=>({...s,number:i+2}));j.steps.unshift({number:1,name:'Set up job',status:'in_progress',conclusion:null,started_at:j.steps[0].started_at,completed_at:null});j.steps.push({number:22,name:'Post Set up Node',status:'pending',conclusion:null,started_at:null,completed_at:null});return value}
  const github=async(p,binary=false)=>{if(p.startsWith(prefix+'actions/workflows/refresh-baden-r10-native.yml/runs?'))return{total_count:foreign?2:1,workflow_runs:[f.run,...(foreign?[other]:[])]};for(const run of[f.run,...(foreign?[other]:[])]){if(p===prefix+'actions/runs/'+run.id)return structuredClone(run);if(p===prefix+`actions/runs/${run.id}/attempts/1/jobs?per_page=100&page=1`){const j=f.job();j.jobs[0].run_id=run.id;return j}}try{return await f.github(p,binary)}catch(error){if(!error.message.startsWith('TEST ONLY unexpected own GET '))throw error;return base.github(p,binary)}}
  f.controls.github=github;f.controls.getBudget=ledger.getFussballBadenNativeRemainingBudget;f.controls.readBudget=input=>ledger.readFussballBadenNativeRemainingBudget(input)
  if(foreign)await assert.rejects(f.prepare(),e=>e.blockers?.some(b=>b.runId===String(other.id)&&b.reason.includes('ACTUAL_ROOT_RUN')))
  else{const lease=await f.prepare();assert.equal(f.api.getBadenR10RefreshLease(lease).sourceOperationAuthorized,false);assert.equal(JSON.parse(readFileSync(join(f.directory,'prepare-seal.json'))).verifiedAt,new Date(f.f.clock).toISOString());await assert.rejects(ledger.readFussballBadenNativeRemainingBudget({github,refreshPreparation:structuredClone(f.controls.token)}),/PRIVATE_PREPARING_TOKEN/);await assert.rejects(ledger.readFussballBadenNativeRemainingBudget({github,refreshPreparation:f.controls.token}),/PRIVATE_PREPARING_TOKEN/)}assert.equal(f.fetches,0)
 }
})
