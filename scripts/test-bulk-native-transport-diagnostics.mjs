import test from 'node:test'
import assert from 'node:assert/strict'
import {createBulkTransport,describeNativeTransportFailure} from './bulk-native-transport.mjs'
import {runBulkRollout} from './bulk-league-rollout.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'

test('transport records a safe fetch failure without changing or retrying it',async()=>{
 const failure=Object.assign(Error('SECRET URL AND KEY'),{cause:Object.assign(Error('SECRET BODY'),{code:'ECONNRESET'})});let calls=0
 const db=createBulkTransport({url:'https://db.synthetic.invalid',key:'SECRET KEY',base:{},fetch:async()=>{calls++;throw failure}})
 await assert.rejects(db.readFussballHistory(1132),e=>e===failure)
 assert.equal(calls,1)
 const d=describeNativeTransportFailure(failure)
 assert.deepEqual(Object.keys(d).sort(),['causeCodes','elapsedMs','httpStatus','method','operation','phase'].sort())
 assert.equal(d.operation,'read-history-preparation');assert.equal(d.phase,'fetch');assert.equal(d.method,'POST');assert.equal(d.httpStatus,null);assert.deepEqual(d.causeCodes,['ECONNRESET']);assert.ok(d.elapsedMs>=0)
 assert.ok(!JSON.stringify(d).includes('SECRET'));assert.equal(describeNativeTransportFailure({...failure}),null)
})
test('transport distinguishes response body failure from fetch failure',async()=>{
 const failure=Object.assign(Error('SECRET BODY'),{cause:{code:'UND_ERR_SOCKET'}});let calls=0
 const db=createBulkTransport({url:'https://db.synthetic.invalid',key:'SECRET',base:{},fetch:async()=>{calls++;return{ok:true,status:200,json:async()=>{throw failure}}}})
 await assert.rejects(db.readFussballHistory(1132),e=>e===failure)
 assert.equal(calls,1);const d=describeNativeTransportFailure(failure)
 assert.equal(d.phase,'body-json');assert.equal(d.httpStatus,200);assert.deepEqual(d.causeCodes,['UND_ERR_SOCKET'])
})
test('transport HTTP errors retain only status and a closed operation name',async()=>{
 const db=createBulkTransport({url:'https://db.synthetic.invalid',key:'SECRET',base:{},fetch:async()=>({ok:false,status:503})});let failure
 try{await db.rpc('secret-rpc-query',{secret:'BODY'})}catch(e){failure=e}
 assert.match(failure.message,/HTTP 503/);const d=describeNativeTransportFailure(failure)
 assert.equal(d.operation,'other-native');assert.equal(d.phase,'http-status');assert.equal(d.httpStatus,503);assert.ok(!JSON.stringify(d).includes('secret'))
})

for(const write of [false,true])test(`TEST ONLY bulk checkpoint retains safe diagnostics and ${write?'UNKNOWN write':'read infrastructure stop'}`,async()=>{
 let calls=0;const failure=Object.assign(Error('fetch failed'),{cause:Object.assign(Error('SECRET'),{code:'ECONNRESET'})})
 const db=createBulkTransport({url:'https://db.synthetic.invalid',key:'SECRET',base:{competition:async()=>({active:false})},fetch:async()=>{calls++;throw failure}})
 const candidate=structuredClone(GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden')),head='a'.repeat(40),checkpoints=[]
 const report=await runBulkRollout({sourceReport:{expected_sha:head,results:[{candidate,slug:candidate.slug,status:'STAGED',profile:'germany-retained-fussball-native-v1',directory:'/TEST_ONLY'}]},expectedSha:head,transport:db,guard:async()=>{},onCheckpoint:async r=>checkpoints.push(r),loadComposition:async()=>({TEST_ONLY:true}),prepareComposition:async({transport,onProgress})=>{
  const phase=write?'prepare-history':'read-preparation';await onProgress({phase,status:'RUNNING'})
  try{if(write)await transport.prepareFussballHistory({manifest:'TEST_ONLY',sha256:'b'.repeat(64)});else await transport.readFussballHistory(1132)}catch(e){await onProgress({phase,status:'FAILED'});throw e}
 }})
 assert.equal(calls,1);assert.equal(report.status,'STOPPED');assert.equal(report.results[0].status,write?'UNKNOWN':'INFRASTRUCTURE_STOP')
 assert.equal(report.results[0].transport_failure.operation,write?'prepare-history':'read-history-preparation')
 assert.deepEqual(report.results[0].transport_failure.causeCodes,['ECONNRESET']);assert.equal(report.results[0].steps[0].preparation_phases[0].status,'FAILED')
 assert.ok(checkpoints.some(r=>r.results[0]?.steps[0]?.preparation_phases?.[0]?.status==='RUNNING'));assert.ok(!JSON.stringify(report).includes('SECRET'))
})
