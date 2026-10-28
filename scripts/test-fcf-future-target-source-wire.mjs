import test from 'node:test'
import assert from 'node:assert/strict'
import {futureTransportFixture} from './fcf-future-transport-test-fixture.mjs'
import {readFcfFutureCapturedTargetEvidence,getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
const api=await import('./fcf-future-target-source-wire.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}}),enabled=process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR
const read=x=>api.readFcfFutureTargetSourceWire(x)
test('future source-wire API rejects unsafe/legacy refs before any GET',async()=>{
 assert.equal(typeof api.readFcfFutureTargetSourceWire,'function');let calls=0
 for(const source of [{},{protocol:'six-reviewed-continuation-v1'},{protocol:'future-g9-after-six-v1',claim:{expected:{runId:'../../unsafe'}}}])await assert.rejects(read({source,github:async()=>{calls++;throw Error('unexpected GET')},now:0}),/FCF_/)
 assert.equal(calls,0)
})
test('fixed GET map authenticates complete future raw wire and rejects pin/ref/jobs/ZIP drift',{skip:enabled?false:'Genuine OLD37 history and retained G9 HTML required'},async t=>{
 const f=await futureTransportFixture(t),wire=await read({source:f.source,github:f.github,now:f.wire.now})
 assert.deepEqual(Object.keys(wire).sort(),['child','claim','consumption','finalReceipt','history','now','plan']);const proof=readFcfFutureCapturedTargetEvidence(wire),data=getFcfFutureCapturedTargetData({targetEvidence:proof,now:wire.now});assert.equal(data.fixtures.length,240);assert.equal(data.binding.actualSourceGETs,277)
 assert.ok(f.calls.every(([p,b])=>p.startsWith(f.repo)&&b===p.endsWith('/zip')));assert.ok(f.calls.some(([p])=>p.includes('git/ref/tags/fcf-inventory-claim/future-g9-after-')))
 await t.test('all current pins preflight before IO',async()=>{
  for(const mutate of [s=>s.claim.expected.claimCommit='../../bad',s=>s.child.audit.manifestSha256='missing',s=>s.child.inventory.sourceCommit='b'.repeat(40),s=>s.finalReceipt.artifactId='bad',s=>s.claim.execution.runAttempt='2']){const source=structuredClone(f.source);mutate(source);let calls=0;await assert.rejects(read({source,github:async()=>{calls++;throw Error('GET')},now:wire.now}),/FCF_/);assert.equal(calls,0)}
 })
 await t.test('moved ref, duplicate/changed pagination and nonbinary ZIP hold',async()=>{
  for(const mutation of ['ref','duplicate','unstable','zip']){let pages=0;const github=async(path,binary)=>{
   if(path.includes('git/ref/tags/fcf-inventory-claim/future-g9-after-')&&mutation==='ref')return {...f.wire.claim.ref,object:{type:'commit',sha:'0'.repeat(40)}}
   if(path.includes('actions/runs/123/attempts/1/jobs?')){pages++;if(mutation==='duplicate')return {total_count:2,jobs:[f.jobs[0],f.jobs[0]]};if(mutation==='unstable'){const page=Number(path.split('page=').at(-1));return page===1?{total_count:101,jobs:Array.from({length:100},(_,i)=>({...f.jobs[0],id:70000+i}))}:{total_count:102,jobs:[{...f.jobs[0],id:80000}]}}}
   if(path===f.repo+`actions/artifacts/${f.source.child.inventory.artifactId}/zip`&&mutation==='zip')return 'not raw bytes'
   return f.github(path,binary)
  };await assert.rejects(read({source:f.source,github,now:wire.now}),/FCF_/);if(mutation==='unstable')assert.equal(pages,2)}
 })
})
