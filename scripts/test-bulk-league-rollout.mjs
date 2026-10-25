import test from 'node:test'
import assert from 'node:assert/strict'
import {collectBulkBatch,runBulkRollout} from './bulk-league-rollout.mjs'
import {runBatch} from './vklopi-obstojece-lige.mjs'
const c=n=>({id:n,slug:'pl-test-'+n,source:'pzpn',source_league_code:'code'+n,host:'szpnkielce.pl',country_code:'PL',season:'2026/27',archives:[{code:'old'+n,season:'2025/26'}]})
const candidates=[c(1),c(2),c(3)],sha='a'.repeat(40)
const fixture=()=>{
 const active=new Set(),calls=[]
 const transport={snapshot:async c=>({competition:{...c,active:active.has(c.id),source_policy:null,date_only_deadline_policy:null},fantasy:{teams:[],lineups:[]}}),competition:async c=>({...c,active:active.has(c.id)})}
 return {active,calls,transport,guard:async()=>{},loadPack:async(_,o)=>({candidate:o.candidate}),verifyNative:async()=>({verified:true}),runCommand:async(file,args)=>{calls.push(args);return {code:0}},activationRunner:async({candidates})=>{const [c]=candidates;active.add(c.id);return [{status:'ACTIVE',first_round:{number:10}}]}}
}
test('bulk valid/failing/valid stages before writes and activates valid siblings',async()=>{
 const trace=[]
 const staged=await collectBulkBatch({candidates,expectedSha:sha,directory:'/tmp/unused',capture:async(c)=>{trace.push('capture'+c.id);if(c.id===2)throw Object.assign(Error('No keeper'),{dataHold:true});return {candidate:c}},saveAdmission:async()=>{},onCheckpoint:async()=>{}})
 const f=fixture();f.runCommand=async(_,args)=>{trace.push('write'+args[1]);return {code:0}}
 const report=await runBulkRollout({...f,sourceReport:staged,expectedSha:sha})
 assert.deepEqual(report.results.map(r=>r.status),['ACTIVE','HOLD','ACTIVE'])
 assert.ok(trace.indexOf('capture3')<trace.findIndex(v=>v.startsWith('write')))
})
test('source stop skips only that host while another host stages',async()=>{
 let calls=0;const selected=[c(1),c(2),{...c(3),host:'wmzpn.pl',source:'wmzpn'}]
 const r=await collectBulkBatch({candidates:selected,expectedSha:sha,directory:'/tmp/unused',capture:async c=>{calls++;if(c.id===1)throw Object.assign(Error('403'),{sourceStop:true});return {}},saveAdmission:async()=>{}})
 assert.deepEqual(r.results.map(r=>r.status),['SOURCE_STOP','SKIPPED_SOURCE_STOP','STAGED']);assert.equal(calls,2)
})
test('active or fantasy-owned league is never imported or repriced',async()=>{
 for(const state of [{active:true,teams:[]},{active:false,teams:[{id:1}]}]){
  const f=fixture();f.transport.snapshot=async c=>({competition:{...c,active:state.active,source_policy:null,date_only_deadline_policy:null},fantasy:{teams:state.teams,lineups:[]}})
  const report=await runBulkRollout({...f,sourceReport:{expected_sha:sha,results:[{candidate:c(1),slug:c(1).slug,status:'STAGED',directory:'/tmp/pack'}]},expectedSha:sha})
  assert.equal(f.calls.length,0);assert.equal(report.results[0].status,state.active?'SKIPPED_ACTIVE':'HOLD')
 }
})
test('ambiguous write stops all subsequent writes with UNKNOWN receipt',async()=>{
 const f=fixture();let attempts=0;f.runCommand=async()=>{attempts++;throw Error('lost child')}
 const report=await runBulkRollout({...f,sourceReport:{expected_sha:sha,results:candidates.map(candidate=>({candidate,slug:candidate.slug,status:'STAGED',directory:'/tmp/pack'}))},expectedSha:sha})
 assert.equal(attempts,1);assert.deepEqual(report.results.map(r=>r.status),['UNKNOWN','SKIPPED_INFRASTRUCTURE_STOP','SKIPPED_INFRASTRUCTURE_STOP'])
})
test('source proof failure holds only the league, no activation',async()=>{
 const f=fixture();f.verifyNative=async({candidate})=>{if(candidate.id===2)throw Object.assign(Error('Wrong scorer'),{dataHold:true});return {verified:true}}
 const report=await runBulkRollout({...f,sourceReport:{expected_sha:sha,results:candidates.map(candidate=>({candidate,slug:candidate.slug,status:'STAGED',directory:'/tmp/pack'}))},expectedSha:sha})
 assert.deepEqual(report.results.map(r=>r.status),['ACTIVE','HOLD','ACTIVE']);assert.deepEqual([...f.active],[1,3])
})
test('main guard failure stops the batch, even if its error is typed as a data hold',async()=>{
 const f=fixture();f.guard=async()=>{throw Object.assign(Error('Main changed'),{dataHold:true})}
 const report=await runBulkRollout({...f,sourceReport:{expected_sha:sha,results:candidates.map(candidate=>({candidate,slug:candidate.slug,status:'STAGED',directory:'/tmp/pack'}))},expectedSha:sha})
 assert.deepEqual(report.results.map(r=>r.status),['INFRASTRUCTURE_STOP','SKIPPED_INFRASTRUCTURE_STOP','SKIPPED_INFRASTRUCTURE_STOP']);assert.equal(f.calls.length,0)
})
test('real native gate database errors cannot become semantic holds and continue writes',async()=>{
 const f=fixture();f.transport.state=async()=>{throw Error('Database readiness HTTP 503')}
 const report=await runBulkRollout({...f,activationRunner:runBatch,sourceReport:{expected_sha:sha,results:candidates.map(candidate=>({candidate,slug:candidate.slug,status:'STAGED',directory:'/tmp/pack'}))},expectedSha:sha})
 assert.deepEqual(report.results.map(r=>r.status),['INFRASTRUCTURE_STOP','SKIPPED_INFRASTRUCTURE_STOP','SKIPPED_INFRASTRUCTURE_STOP']);assert.equal(f.calls.length,6)
})
test('new registration has a durable pending step before its write and interruption is UNKNOWN',async()=>{
 const f=fixture(),candidate={...c(1),id:undefined,slug:'de-test',source:'fussball-public',country_code:'DE'},receipts=[]
 f.transport.find=async()=>null;f.transport.register=async()=>{assert.equal(receipts.at(-1).results[0].steps.at(-1).stage,'register');assert.equal(receipts.at(-1).results[0].steps.at(-1).status,'RUNNING');throw Error('lost registration response')}
 const report=await runBulkRollout({...f,sourceReport:{expected_sha:sha,results:[{candidate,slug:candidate.slug,status:'STAGED',directory:'/tmp/pack'}]},expectedSha:sha,onCheckpoint:r=>receipts.push(r)})
 assert.equal(report.results[0].status,'UNKNOWN');assert.equal(report.results[0].steps[0].status,'UNKNOWN')
})
