import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {captureFixture} from './fcf-g9-held-parent-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {metadata,zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {validateFcfG9HeldParentPlan} from './fcf-g9-held-parent-plan.mjs'
import {readFcfMissingInventoryStagingArtifact,auditFcfMissingInventoryOffline,buildFcfMissingInventoryFinalReceipt} from './fcf-missing-inventory-evidence.mjs'
const opts={skip:!process.env.FCF_HELD_PARENT_WIRE||!process.env.FCF_HISTORICAL_RETAINED_DIR}
test('synthetic new240 inventory independently audits complete native16/GK with fresh marker receipts',opts,async t=>{
 const f=await captureFixture(t),r=await collectFcfMissingInventoryChild(f);assert.equal(r.status,'inventory-complete')
 const entries=readdirSync(r.outputDirectory).map(name=>({name,body:readFileSync(join(r.outputDirectory,name))})),m=metadata({bytes:zip(entries),name:'fcf-missing-inventory-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:['Capture missing target inventory','Retain complete target inventory'],run:'in_progress'})
 Object.assign(m.expected,{manifestSha256:sha(entries.find(e=>e.name==='manifest.json').body),planSha256:f.plan.planSha256,childPlanSha256:validateFcfG9HeldParentPlan({plan:f.plan,expectedPlanSha256:f.plan.planSha256,now:f.clock()}).childPlanSha256})
 const staged=readFcfMissingInventoryStagingArtifact({...m,plan:f.plan,targetSlug:f.targetSlug,consumptionProof:f.consumptionProof,now:f.clock()}),audit=auditFcfMissingInventoryOffline({stagingProof:staged,policyHashes:f.plan.policyHashes,now:f.clock()})
 assert.equal(audit.status,'passed');assert.equal(audit.targetSlug,'es-ct-tercera-g9')
 for(const change of [m=>m.sourceClearanceUTC=f.plan.createdUTC,m=>m.documents[0].receipt.headersUTC=null]){
  const changed=JSON.parse(entries.find(e=>e.name==='manifest.json').body);change(changed);const body=Buffer.from(JSON.stringify(changed)),zipBytes=zip(entries.map(e=>e.name==='manifest.json'?{...e,body}:e)),digest='sha256:'+sha(zipBytes),bad={...m,zipBytes,artifact:{...m.artifact,size_in_bytes:zipBytes.length,digest},expected:{...m.expected,artifactDigest:digest,manifestSha256:sha(body)}}
  assert.throws(()=>readFcfMissingInventoryStagingArtifact({...bad,plan:f.plan,targetSlug:f.targetSlug,consumptionProof:f.consumptionProof,now:f.clock()}),/FCF_INVENTORY/)
 }

 assert.throws(()=>buildFcfMissingInventoryFinalReceipt({plan:f.plan,claimProof:{},consumptionProof:f.consumptionProof,childRecords:[staged],execution:f.execution,now:f.clock()}),/FCF_INVENTORY/)
})
import {readFcfMissingInventoryCompletedChildArtifact,readFcfMissingInventoryFinalReceipt,readFcfCapturedTargetEvidence,getFcfCapturedTargetData} from './fcf-missing-inventory-evidence.mjs'
import {readFcfInventoryExecutionClaim} from './fcf-missing-inventory-claim.mjs'
import {newClaimFixture,newConsumptionFixture} from './fcf-g9-held-parent-test-fixture.mjs'
import {deserialize} from 'node:v8'
import {auditFixture} from './fcf-missing-inventory-integration-fixture.mjs'
test('new final receipt admits G9 only after authenticated240 audit and cumulative256',opts,async t=>{
 const f=await captureFixture(t),r=await collectFcfMissingInventoryChild(f),entries=readdirSync(r.outputDirectory).map(name=>({name,body:readFileSync(join(r.outputDirectory,name))})),m=metadata({bytes:zip(entries),name:'fcf-missing-inventory-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:['Capture missing target inventory','Retain complete target inventory'],run:'in_progress'})
 Object.assign(m.expected,{manifestSha256:sha(entries.find(e=>e.name==='manifest.json').body),planSha256:f.plan.planSha256,childPlanSha256:validateFcfG9HeldParentPlan({plan:f.plan,expectedPlanSha256:f.plan.planSha256,now:f.clock()}).childPlanSha256})
 const input={...m,plan:f.plan,targetSlug:f.targetSlug,consumptionProof:f.consumptionProof,now:f.clock()},staged=readFcfMissingInventoryStagingArtifact(input),audit=auditFcfMissingInventoryOffline({stagingProof:staged,policyHashes:f.plan.policyHashes,now:f.clock()})
 const completedInput=auditFixture({...input,manifest:JSON.parse(entries.find(e=>e.name==='manifest.json').body)},audit),completed=readFcfMissingInventoryCompletedChildArtifact(completedInput)
 // claim proof is the actual matching branded capability from the same fixture.
 const receipt=buildFcfMissingInventoryFinalReceipt({plan:f.plan,claimProof:f.claimProof,consumptionProof:f.consumptionProof,childRecords:[completed],execution:{...f.execution,jobId:'777'},now:f.clock()})
 assert.equal(receipt.admissible,true);assert.equal(receipt.actualSourceGETs,256);assert.equal(receipt.newSourceGETs,240);assert.equal(receipt.priorSourceGETs,16);assert.equal(receipt.children.length,1)
 const bytes=Buffer.from(JSON.stringify(receipt)),final=metadata({bytes:zip([{name:'manifest.json',body:bytes}]),name:'fcf-missing-inventory-final-123-1',jobName:'missing-inventory-receipt',jobId:'777',artifactId:'999',steps:['Retain final FCF inventory receipt']});final.expected.manifestSha256=sha(bytes)
 const bundle=(record,zipBytes=record.zipBytes)=>Object.fromEntries(['zipBytes','artifact','run','jobs','expected'].map(k=>[k,k==='zipBytes'?zipBytes:record[k]]))
 const claim=Object.fromEntries(['execution','ref','claimCommit','claimBytes','rulesets','expected'].map(k=>[k,f.claimWire[k]])),inventory=bundle(completedInput.inventoryMetadata,completedInput.inventoryZipBytes),audited=bundle(completedInput.auditMetadata,completedInput.auditZipBytes)
 for(const r of [inventory,audited]){r.run.status='completed';r.run.conclusion='success'}
 const wire={protocol:f.plan.preset,accounting:deserialize(readFileSync(process.env.FCF_HELD_PARENT_WIRE)),plan:f.plan,claim,consumption:bundle(f.consumptionWire),child:{targetSlug:f.targetSlug,inventory,audit:audited},finalReceipt:bundle(final),targetSlug:f.targetSlug,now:f.clock()}
 const transported=await readFcfTargetSourceWire({source:sourceReferencesFromWire(wire),github:githubForSourceWire(wire),now:f.clock()});assert.equal(transported.protocol,f.plan.preset)
 const evidence=readFcfCapturedTargetEvidence(wire),data=getFcfCapturedTargetData({targetEvidence:evidence,targetSlug:f.targetSlug,now:f.clock()})
 assert.equal(data.binding.actualSourceGETs,256);assert.equal(data.binding.newSourceGETs,240);assert.equal(data.binding.priorSourceGETs,16);assert.equal(data.clubs.length,16);assert.equal(data.verifiedKeeperClubs.length,16);assert.equal(data.fixtures.length,240);assert.equal(data.binding.kind,'fcf-missing-target-admission');assert.equal(data.binding.protocol,f.plan.preset)
 const cleanup=cleanupFixture(t,{applied:true}),cleanupEvidence=readFcfCleanupEvidence({...cleanup.input,now:f.clock()}),databaseInventory=packetFixture().databaseInventory;databaseInventory.capturedUTC=new Date(f.clock()).toISOString();for(const g of databaseInventory.groups)g.source_policy='es-fcf-reviewed-history-v1'
 const packet=JSON.parse(compileFcfTargetReleasePacket({targetSlug:f.targetSlug,sourceCommit:'d'.repeat(40),targetEvidence:evidence,cleanupEvidence,databaseInventory,now:f.clock()}).manifestText);assert.equal(packet.sourceCommit,'d'.repeat(40));assert.equal(packet.target.sourceEvidence.sourceCommit,'a'.repeat(40));assert.equal(packet.cleanupBinding.originals.length,4);assert.equal(packet.target.fixtures.length,240);assert.equal(packet.target.verifiedKeeperClubs.length,16)
 assert.notEqual(packet.target.fixtures.find(x=>x.id==='es4118352').source.capturedUTC,packet.cleanupBinding.originals.find(x=>x.sourceMatchId==='4118352').receipt.capturedUTC)
 assert.throws(()=>readFcfCapturedTargetEvidence({...wire,targetSlug:'es-ct-segona-g1'}),/FCF_INVENTORY/)
 assert.throws(()=>readFcfCapturedTargetEvidence({...wire,child:{...wire.child,audit:null}}),/FCF_INVENTORY/)
 assert.throws(()=>getFcfCapturedTargetData({targetEvidence:structuredClone(evidence),targetSlug:f.targetSlug,now:f.clock()}),/FCF_INVENTORY/)
})

import {sourceReferencesFromWire,githubForSourceWire} from './fcf-g9-held-parent-test-fixture.mjs'
import {readFcfTargetSourceWire} from './fcf-target-actions.mjs'

import {cleanupFixture} from './fcf-target-test-fixture.mjs'
import {readFcfCleanupEvidence} from './fcf-target-evidence.mjs'
import {compileFcfTargetReleasePacket} from './fcf-target-release.mjs'
import {packetFixture} from './fcf-release-test-fixture.mjs'
