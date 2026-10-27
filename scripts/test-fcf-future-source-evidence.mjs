// TEST ONLY fresh execution/artifacts and remaining calendar; retained spent37
// and historical pages are genuine. No live-capture/launch claim is made here.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {futureCaptureFixture} from './fcf-future-capture-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {metadata,sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
import {validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
import * as evidence from './fcf-missing-inventory-evidence.mjs'
const opts={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Genuine37 accounting and retained G9 bytes required'}
function api(name,...args){assert.equal(typeof evidence[name],'function',`${name} required`);return evidence[name](...args)}
function staged(f,r,diagnostic=false){
 const entries=readdirSync(r.outputDirectory).map(name=>({name,body:readFileSync(join(r.outputDirectory,name))})),m=JSON.parse(entries.find(x=>x.name==='manifest.json').body)
 const meta=metadata({bytes:zip(entries),name:`fcf-missing-inventory-${diagnostic?'diagnostic-':''}es-ct-tercera-g9-123-1`,jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:['Capture missing target inventory',diagnostic?'Retain failed target inventory diagnostic':'Retain complete target inventory'],run:'in_progress'})
 Object.assign(meta.expected,{manifestSha256:sha(entries.find(x=>x.name==='manifest.json').body),planSha256:f.plan.planSha256,childPlanSha256:validateFcfFutureSourcePlan({plan:f.plan,expectedPlanSha256:f.plan.planSha256,now:f.clock()}).childPlanSha256})
 if(diagnostic){meta.jobs[0].status='completed';meta.jobs[0].conclusion='failure';meta.jobs[0].steps[0].conclusion='failure'}
 return {...meta,plan:f.plan,targetSlug:f.targetSlug,consumptionProof:f.consumptionProof,now:f.clock(),testManifest:m}
}
test('future raw inventory independently replays full240/16/GK without expired R6 opening authority',opts,async t=>{
 const f=await futureCaptureFixture(t),r=await collectFcfMissingInventoryChild(f),wire=staged(f,r),proof=api('readFcfFutureSourceStagingArtifact',wire)
 assert.equal(proof.kind,'fcf-future-source-staged-proof');assert.equal(proof.priorSourceGETs,37);assert.equal(proof.actualSourceGETs,240)
 const data=api('getFcfFutureSourceStagedData',{stagingProof:proof,now:f.clock()});assert.equal(data.evidenceKind,'fcf-future-source-staging-data');assert.equal(data.fixtures.length,240);assert.equal(data.documents.length,240);assert.equal(data.clubs.length,16);assert.equal(data.verifiedKeeperClubs.length,16);assert.ok(Object.isFrozen(data)&&Object.isFrozen(data.fixtures));assert.equal(Object.hasOwn(data.competition,'firstFantasyPlayedOn'),false)
 assert.throws(()=>api('getFcfFutureSourceStagedData',{stagingProof:structuredClone(proof),now:f.clock()}),/authenticated future staged/)
 const result=api('auditFcfFutureSourceOffline',{stagingProof:proof,policyHashes:f.plan.policyHashes,now:f.clock()})
 assert.equal(result.kind,'fcf-future-source-offline-audit');assert.equal(result.status,'passed');assert.equal(result.priorSourceGETs,37);assert.equal(result.actualSourceGETs,277);assert.equal(result.newSourceGETs,240)
 assert.equal(Object.hasOwn(result,'firstFantasyRound'),false);assert.equal(Object.hasOwn(result,'admissible'),false)
 assert.throws(()=>evidence.auditFcfMissingInventoryOffline({stagingProof:proof,policyHashes:f.plan.policyHashes,now:f.clock()}),/authenticated staged/)
 assert.throws(()=>api('auditFcfFutureSourceOffline',{stagingProof:structuredClone(proof),policyHashes:f.plan.policyHashes,now:f.clock()}),/authenticated future staged/)
 const changed={...f.plan.policyHashes,'es-ct-tercera-g9':'0'.repeat(64)}
 assert.throws(()=>api('auditFcfFutureSourceOffline',{stagingProof:proof,policyHashes:changed,now:f.clock()}),/authenticated future staged/)
 assert.throws(()=>api('auditFcfFutureSourceOffline',{stagingProof:proof,policyHashes:f.plan.policyHashes,now:f.clock()+86400001}),/stale|expired|FCF_INVENTORY/)
 const wrong=structuredClone(wire);wrong.plan=wire.plan;wrong.consumptionProof=wire.consumptionProof;wrong.artifact.digest='sha256:'+'0'.repeat(64)
 assert.throws(()=>api('readFcfFutureSourceStagingArtifact',wrong),/FCF_INVENTORY/)
})
test('future refusal diagnostic carries37+1 without authorizing full audit or retry',opts,async t=>{
 const f=await futureCaptureFixture(t);f.request=async()=>new Response('TEST ONLY refusal',{status:403})
 const r=await collectFcfMissingInventoryChild(f),wire=staged(f,r,true),proof=api('readFcfFutureSourceDiagnosticArtifact',wire)
 assert.equal(proof.kind,'fcf-future-source-diagnostic-proof');assert.equal(proof.priorSourceGETs,37);assert.equal(proof.newSourceGETs,1);assert.equal(proof.actualSourceGETs,38);assert.equal(proof.stopReason,'source-refusal');assert.equal(proof.admissible,false)
 assert.throws(()=>api('readFcfFutureSourceStagingArtifact',wire),/FCF_INVENTORY/)
 assert.throws(()=>api('auditFcfFutureSourceOffline',{stagingProof:proof,policyHashes:f.plan.policyHashes,now:f.clock()}),/authenticated future staged/)
 // Even a coherently repacked future diagnostic cannot refund21 old requests.
 const changed=structuredClone(wire.testManifest);changed.priorSourceGETs=16;changed.attempts[0].sequence=17;changed.documents[0].receipt.sequence=17
 const body=Buffer.from(JSON.stringify(changed)),bytes=zip([{name:'manifest.json',body},{name:'acta-4118349.html',body:readFileSync(join(r.outputDirectory,'acta-4118349.html'))}]),digest='sha256:'+sha(bytes)
 const wrong={...wire,zipBytes:bytes,artifact:{...wire.artifact,size_in_bytes:bytes.length,digest},expected:{...wire.expected,artifactDigest:digest,manifestSha256:sha(body)}}
 assert.throws(()=>api('readFcfFutureSourceDiagnosticArtifact',wrong),/inventory attempts/)
})
