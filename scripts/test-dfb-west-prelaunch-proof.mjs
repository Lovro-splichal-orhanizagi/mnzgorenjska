import test from 'node:test'
import assert from 'node:assert/strict'
import * as proof from './dfb-replay-proof.mjs'
import {dfbPolicyBinding} from './dfb-historical-policy.mjs'
import {sourceFiles} from './vklopi-dfb-regijo.mjs'
import {parserHashAt,readClosedCapture} from './ponovi-dfb-regijo.mjs'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'

const slug='de-regionalliga-west',commit='e4bdca52b315b8f5ce7fc4edfafb787e5737ef4b'
const options=()=>({slug,statisticsPolicy:dfbPolicyBinding({slug,source:'dfb',source_policy:'de-dfb-west-prelaunch-unavailable-v2',firstFantasyPlayedOn:'2026-10-23'})})
const report=()=>({vir:'dfb',koda:'regionalliga-west/2026-2027',sezona:'2026/27',krogov:34,klubov:18,odigranih:116,zapisnikov:114,postavPo11:228,prenesenih:134,pripravljeno:false,pokritost:false,opozorila:[],cakajoci:[],klubiBrezVratarja:[],napake:[
 'nepopoln de-dfb-2425409: dfb: nepopolna začetna postava ali vratar',
 'nepopoln de-dfb-2425474: dfb: nepopolna postava ali klop',
 'manjka zapisnik: [4,"SG Wattenscheid 09","FC Schalke 04 II"]',
 'manjka zapisnik: [11,"FC Schalke 04 II","1. FC Köln II"]',
 'odigranih 116, zapisnikov 114',
]})
test('only the exact reviewed West prelaunch failures replace original current strict success',()=>{
 assert.equal(typeof proof.assertPolicyCurrentCapture,'function')
 assert.doesNotThrow(()=>proof.assertPolicyCurrentCapture({conclusion:'failure'},report(),options()))
 for(const mutate of [r=>r.napake.push('another incomplete report'),r=>r.napake[0]+=' changed',r=>r.napake.pop(),r=>r.zapisnikov++,r=>r.postavPo11--,r=>r.odigranih++,r=>r.prenesenih--,r=>r.opozorila.push('timeout'),r=>r.cakajoci.push({id:'other'}),r=>r.klubiBrezVratarja.push('Club'),r=>r.status=429,r=>r.zavrnitev=false,r=>r.pripravljeno=true]){
  const bad=report();mutate(bad);assert.throws(()=>proof.assertPolicyCurrentCapture({conclusion:'failure'},bad,options()))
 }
 assert.throws(()=>proof.assertPolicyCurrentCapture({conclusion:'success'},report(),options()))
 for(const patch of[{slug:'de-regionalliga-nord'},{statisticsPolicy:{...options().statisticsPolicy,sha256:'0'.repeat(64)}},{statisticsPolicy:{...options().statisticsPolicy,firstFantasyPlayedOn:'2026-10-20'}}])assert.throws(()=>proof.assertPolicyCurrentCapture({conclusion:'failure'},report(),{...options(),...patch}))
 assert.throws(()=>proof.assertStrictCurrentCapture({conclusion:'failure'},report()))
})
test('actual completed failed current job still requires authenticated exact scope and successful upload',()=>{
 const run={id:39829375576,head_sha:commit,path:proof.captureWorkflow,event:'workflow_dispatch',status:'completed',conclusion:'failure',repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
 const job={id:120001142581,run_id:run.id,head_sha:commit,name:'DFB regionalni audit',status:'completed',conclusion:'failure',steps:[{name:proof.captureStep('2026/27'),status:'completed',conclusion:'failure'},{name:proof.captureUpload('2026/27'),status:'completed',conclusion:'success'}]}
 const args={runId:String(run.id),commit,season:'2026/27',historical:true,...options()}
 assert.equal(proof.verifyCaptureExecution(run,[job],args).conclusion,'failure')
 for(const patch of[{conclusion:'cancelled'},{conclusion:'timed_out'},{head_sha:'a'.repeat(40)},{repository:{full_name:'other/repo'}}])assert.throws(()=>proof.verifyCaptureExecution({...run,...patch},[job],args))
 for(const patch of[{conclusion:'cancelled'},{steps:[job.steps[0],{...job.steps[1],conclusion:'failure'}]},{steps:[...job.steps,{name:'setup',conclusion:'failure'}]}])assert.throws(()=>proof.verifyCaptureExecution(run,[{...job,...patch}],args))
 assert.throws(()=>proof.verifyCaptureExecution(run,[job],{...args,statisticsPolicy:undefined}))
})
test('original e4 parser closure stays pinned when later source closure grows',()=>{
 sourceFiles.push('scripts/not-present-in-original-e4-capture.mjs')
 try{assert.equal(parserHashAt(commit),'457934aa7143240498772cbb21ff64af1a3759daf1ad7ac8739fec5e9586a727')}
 finally{sourceFiles.pop()}
})
test('closed current replay accepts reviewed semantics only with complete transport and count binding',()=>{
 const dir=mkdtempSync(join(tmpdir(),'west-prelaunch-closed-'))
 try{
  const body=readFileSync(new URL('./vzorci/de-dfb-2405443.html',import.meta.url)),sha=createHash('sha256').update(body).digest('hex'),file=sha+'.html'
  writeFileSync(join(dir,file),body)
  // Test-only document map: this exercises byte closure/report accounting;
  // the full offline replay separately checks authentic fixture semantics.
  const records=Array.from({length:134},(_,i)=>({url:`https://datencenter.dfb.de/datencenter/regionalliga-west/2026-2027/1-spieltag/TEST-ONLY-${2425000+i}`,sha256:sha,file,at:new Date(Date.now()-60000).toISOString()}))
  writeFileSync(join(dir,'prenosi.json'),JSON.stringify(records))
  const r=report()
  writeFileSync(join(dir,'porocilo.json'),JSON.stringify(r));writeFileSync(join(dir,'razpored.json'),'[]');writeFileSync(join(dir,'zapisniki.json'),'[]')
  assert.doesNotThrow(()=>readClosedCapture(dir,slug,'2026/27',{conclusion:'failure'},{historical:true,statisticsPolicy:options().statisticsPolicy}))
  assert.throws(()=>readClosedCapture(dir,slug,'2026/27',{conclusion:'failure'},{historical:true}))
  for(const mutate of[x=>x.status=null,x=>x.zavrnitev=false,x=>x.napake.push('transport incomplete')]){
   const bad=report();mutate(bad);writeFileSync(join(dir,'porocilo.json'),JSON.stringify(bad))
   assert.throws(()=>readClosedCapture(dir,slug,'2026/27',{conclusion:'failure'},{historical:true,statisticsPolicy:options().statisticsPolicy}))
  }
  // Ledger length and original report count must agree even for a reviewed defect.
  r.prenesenih=1;writeFileSync(join(dir,'porocilo.json'),JSON.stringify(r))
  assert.throws(()=>readClosedCapture(dir,slug,'2026/27',{conclusion:'failure'},{historical:true,statisticsPolicy:options().statisticsPolicy}))
 }finally{rmSync(dir,{recursive:true,force:true})}
})
