import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

const api=await import('./fussball-baden-r10-foundation.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
const json=v=>Buffer.from(JSON.stringify(v)+'\n')

test('R10 foundation declares only fixed all-report community current scope and no operational authority',()=>{
 assert.equal(typeof api.fussballBadenR10FoundationDescriptor,'function')
 const d=api.fussballBadenR10FoundationDescriptor()
 assert.equal(d.kind,'baden-r10-current-only-nonoperational-foundation')
 assert.equal(d.current.staffel,'03188V27L800000JVS5489BTVU7GTVLE-G')
 assert.equal(d.current.season,'2026/27')
 assert.equal(d.current.reportLimit,null)
 assert.equal(d.current.cardPolicy,'community-v1')
 assert.deepEqual(d.reservation,{current:780,archive:0,totalRequestCap:5000})
 assert.equal(d.retainedArchive.runId,'40761564810')
 assert.equal(d.retainedArchive.head,'7692cecffa8b9c747b4a76bd8367a1aa06bbc0b0')
 assert.equal(d.retainedArchive.originalsValidated,false)
 assert.equal(d.operational,false)
 assert.equal(d.newCurrentExecution,null)
 d.reservation.current=1
 assert.equal(api.fussballBadenR10FoundationDescriptor().reservation.current,780)
})

test('attempt accounting charges failed and pending intents without deriving zero from missing artifacts',()=>{
 assert.equal(typeof api.inspectBadenR10AttemptJournals,'function')
 const intents=[1,2,3].map(number=>({number,url:'https://example.invalid/'+number,kind:'round',startedAt:null,status:'pending',error:null}))
 const outcomes=intents.slice(0,2).map((a,i)=>({...a,startedAt:'2026-10-29T10:43:'+String(41+i*6)+'.514Z',status:i?'failed':'success',error:i?'connect failure':null,...(i?{}:{httpStatus:200})}))
 const files=new Map([['attempts.jsonl',Buffer.concat(intents.map(json))],['outcomes.jsonl',Buffer.concat(outcomes.map(json))]])
 assert.deepEqual(api.inspectBadenR10AttemptJournals(files),{known:false,chargedAttempts:3,settledAttempts:2,successfulAttempts:1,failedAttempts:1,pendingAttempts:1,requests:null,reason:'UNSETTLED_ATTEMPTS'})
 files.set('outcomes.jsonl',Buffer.concat([...outcomes,{...intents[2],startedAt:'2026-10-29T10:43:53.514Z',status:'failed',error:'connect failure'}].map(json)))
 assert.deepEqual(api.inspectBadenR10AttemptJournals(files),{known:true,chargedAttempts:3,settledAttempts:3,successfulAttempts:1,failedAttempts:2,pendingAttempts:0,requests:3,reason:null})
 for(const missing of [new Map(),new Map([['attempts.jsonl',Buffer.alloc(0)]])]){
  const result=api.inspectBadenR10AttemptJournals(missing)
  assert.equal(result.known,false)
  assert.equal(result.requests,null)
  assert.equal(result.chargedAttempts,null)
 }
 const empty=api.inspectBadenR10AttemptJournals(new Map([['attempts.jsonl',Buffer.alloc(0)],['outcomes.jsonl',Buffer.alloc(0)]]))
 assert.equal(empty.requests,null)
 assert.equal(empty.known,false)
 const partial=api.inspectBadenR10AttemptJournals(new Map([['attempts.jsonl',Buffer.concat(intents.map(json))]]))
 assert.equal(partial.known,false)
 assert.equal(partial.requests,null)
 assert.equal(partial.chargedAttempts,3,'losing the outcome artifact cannot refund persisted intents')
 assert.equal(partial.pendingAttempts,3)
})

test('attempt accounting holds malformed, duplicate, truncated or incompatible journals',()=>{
 assert.equal(typeof api.inspectBadenR10AttemptJournals,'function')
 const intent={number:1,url:'https://example.invalid/',kind:'round',startedAt:null,status:'pending',error:null}
 for(const files of [
  new Map([['attempts.jsonl',Buffer.from('{')],['outcomes.jsonl',Buffer.alloc(0)]]),
  new Map([['attempts.jsonl',Buffer.concat([json(intent),json(intent)])],['outcomes.jsonl',Buffer.alloc(0)]]),
  new Map([['attempts.jsonl',json(intent)],['outcomes.jsonl',json({...intent,url:'https://different.invalid/',startedAt:'2026-10-29T10:43:41.514Z',status:'success',error:null,httpStatus:200})]]),
 ]){
  const result=api.inspectBadenR10AttemptJournals(files)
  assert.equal(result.known,false)
  assert.equal(result.requests,null)
 }
})

test('attempt accounting holds invalid UTF8 rather than normalizing original identity bytes',()=>{
 const intent=Buffer.concat([Buffer.from('{"number":1,"url":"https://example.invalid/'),Buffer.from([255]),Buffer.from('","kind":"round","startedAt":null,"status":"pending","error":null}\n')])
 const outcome=json({number:1,url:'https://example.invalid/\ufffd',kind:'round',startedAt:'2026-10-29T10:43:41.514Z',status:'success',error:null,httpStatus:200})
 const result=api.inspectBadenR10AttemptJournals(new Map([['attempts.jsonl',intent],['outcomes.jsonl',outcome]]))
 assert.equal(result.known,false)
 assert.equal(result.requests,null)
})

test('foundation does not accept copied proof, caller totals, freshness overrides or archive locators',async()=>{
 assert.equal(typeof api.readFussballBadenR10AccountingFoundation,'function')
 assert.throws(()=>api.getFussballBadenR10AccountingFoundation({}),/PRIVATE_CAPABILITY/)
 assert.equal(Object.hasOwn(api,'captureFussballBadenR10Current'),false)
 for(const key of ['priorRequests','cumulativeRequests','sourceRunId','sourceHead','archiveRunId','now','clock','allowExpiredCurrent','proof']){
  let calls=0
  await assert.rejects(api.readFussballBadenR10AccountingFoundation({github:()=>{calls++},[key]:3607}),/INPUT/)
  assert.equal(calls,0)
 }
})

const E=process.env.FUSSBALL_R10_FOUNDATION_EVIDENCE
function retained(){
 const root=join(E,'baden-fresh-pair-40859714195-terminal-20261029-attempt1'),responses=new Map(),calls=[],controls={}
 const load=p=>JSON.parse(readFileSync(join(root,p)))
 const set=(p,v)=>responses.set(repo+p,v)
 for(const name of ['R7','R8']){
  const dir='originals/history/'+name+'/',run=load(dir+'run.json'),artifact=load(dir+'artifact.json')
  set('actions/runs/'+run.id,run);set(`actions/runs/${run.id}/attempts/1/jobs?per_page=100&page=1`,load(dir+'jobs.json'))
  set('actions/artifacts/'+artifact.id,artifact);set('actions/artifacts/'+artifact.id+'/zip',readFileSync(join(root,dir+'artifact.zip')))
 }
 set('actions/runs/40859714195',load('run.json'))
 set('actions/runs/40859714195/attempts/1/jobs?per_page=100&page=1',load('jobs.json'))
 set('actions/runs/40859714195/artifacts?per_page=100&page=1',load('artifacts.json'))
 set('actions/artifacts/12894726197',load('artifact-12894726197.json'))
 set('actions/artifacts/12894726197/zip',readFileSync(join(root,'artifact-12894726197.zip')))
 return {calls,controls,github:async(path,binary=false)=>{calls.push({path,binary});assert.ok(responses.has(path),'closed retained metadata GET '+path);const raw=responses.get(path),v=controls.change?.(path,raw,binary)??raw;return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)}}
}

test('genuine R9 accounting remains historical after expiry and cannot authorize R10 or fetch archive originals',{skip:!E},async t=>{
 // A local test clock after the genuine current expiry; it is never an API input.
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T11:00:00.000Z'))
 let providerCalls=0;t.mock.method(globalThis,'fetch',()=>{providerCalls++;throw Error('TEST ONLY source transport forbidden')})
 const f=retained(),proof=await api.readFussballBadenR10AccountingFoundation({github:f.github})
 const v=api.getFussballBadenR10AccountingFoundation(proof)
 assert.equal(proof.kind,'authenticated-baden-r10-historical-accounting-foundation')
 assert.equal(v.accounting.authenticatedMinimumSpent,3607)
 assert.equal(v.accounting.freshCumulativeRequests,null)
 assert.equal(v.accounting.freshAccountingKnown,false)
 assert.equal(v.accounting.r9.requests,587)
 assert.equal(v.accounting.r9.successfulAttempts,584)
 assert.equal(v.accounting.r9.failedAttempts,3)
 assert.equal(v.accounting.r9.pendingAttempts,0)
 assert.equal(v.oldCurrent.createdAt,'2026-10-29T10:43:41.514Z')
 assert.equal(v.oldCurrent.freshUntil,'2026-10-30T10:43:41.514Z')
 assert.equal(v.oldCurrent.freshness,'EXPIRED')
 assert.equal(v.oldCurrent.currentAuthority,false)
 assert.equal(v.operational,false)
 assert.equal(v.newCurrentExecution,null)
 assert.equal(v.retainedArchive.originalsValidated,false)
 assert.ok(v.originals.r9.files.has('current/attempts.jsonl'))
 assert.ok(v.originals.historicalBudgetFiles.has('history/R8/artifact.zip'))
 assert.equal(v.originals.r9.zipBytes.length,10738760)
 assert.equal(Object.hasOwn(api,'captureFussballBadenR10Current'),false)
 assert.throws(()=>api.getFussballBadenR10AccountingFoundation({...proof}),/PRIVATE_CAPABILITY/)
 assert.equal(f.calls.some(c=>c.path.includes('/artifacts/12855646437')),false,'no full archive-original GET; retained archive still needs semantic authentication')
 v.accounting.r9.requests=0;v.certificate.r9.run.head_sha='0'.repeat(40)
 const originalFirstByte=v.originals.r9.zipBytes[0]
 v.originals.r9.zipBytes.fill(0);v.originals.r9.files.get('current/attempts.jsonl').fill(0)
 assert.equal(api.getFussballBadenR10AccountingFoundation(proof).accounting.r9.requests,587)
 assert.equal(api.getFussballBadenR10AccountingFoundation(proof).originals.r9.zipBytes[0],originalFirstByte)
 assert.equal(providerCalls,0)
 console.log(JSON.stringify({genuineRetainedR9Accounting:true,started:587,success:584,failed:3,authenticatedMinimumSpent:3607,freshTotal:null,newCurrentExecution:null,providerGETs:0,networkGETs:0}))
})

test('genuine accounting refuses changed pinned run/jobs/artifact, missing originals and late metadata drift',{skip:!E},async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-30T11:00:00.000Z'))
 for(const mode of ['run','jobs','jobShape','artifact','expired','zip','late']){
  const f=retained();let reads=0
  f.controls.change=(path,v)=>{
   if(path===repo+'actions/runs/40859714195'&&(mode==='run'||mode==='late'&&++reads>1))return {...v,head_sha:'0'.repeat(40)}
   if(mode==='jobs'&&path===repo+'actions/runs/40859714195/attempts/1/jobs?per_page=100&page=1')return {total_count:0,jobs:[]}
   if(mode==='jobShape'&&path===repo+'actions/runs/40859714195/attempts/1/jobs?per_page=100&page=1')return {total_count:1,jobs:[{}]}
   if(path===repo+'actions/artifacts/12894726197'){
    if(mode==='artifact')return {...v,digest:'sha256:'+'0'.repeat(64)}
    if(mode==='expired')return {...v,expired:true}
   }
   if(mode==='zip'&&path===repo+'actions/artifacts/12894726197/zip')return Buffer.from('TEST ONLY changed raw ZIP')
   return v
  }
  await assert.rejects(api.readFussballBadenR10AccountingFoundation({github:f.github}),/RUN_JOBS|ARTIFACT|ZIP_DIGEST|LATE_DRIFT/)
 }
 const f=retained()
 await assert.rejects(api.readFussballBadenR10AccountingFoundation({github:async(path,binary)=>{if(path.endsWith('/12894726197/zip'))throw Error('TEST_ONLY_SECRET');return f.github(path,binary)}}),e=>e.code==='BADEN_R10_GET_HOLD'&&!e.message.includes('SECRET'))
})
