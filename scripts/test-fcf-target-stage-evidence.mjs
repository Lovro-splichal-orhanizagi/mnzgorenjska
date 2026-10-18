import test from 'node:test'
import assert from 'node:assert/strict'
import {zipFixture,sha,now,cleanupFixture} from './fcf-target-test-fixture.mjs'
const api=await import('./fcf-target-stage-evidence.mjs').catch(()=>({})),slug='es-ct-segona-g1',commit='b'.repeat(40),retained=process.env.FCF_HISTORICAL_RETAINED_DIR
function stageFixture(t){
 const rolloutText=JSON.stringify({schemaVersion:1,kind:'fcf-current-target-rollout',targetSlug:slug,sourceCommit:commit}),inputs={targetPacketSha256:'c'.repeat(64),sourceFingerprintSha256:'d'.repeat(64),cleanupBeforeSha256:'e'.repeat(64)},execution={repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit,runId:'500',runAttempt:'1'}
 const manifest={schemaVersion:1,kind:'fcf-target-imported',targetSlug:slug,sourceCommit:commit,execution,inputs,result:{stage:'imported',targetSlug:slug,receiptId:'1'},rolloutText,rolloutSha256:sha(rolloutText)},zipBytes=zipFixture(t,[{name:'manifest.json',body:JSON.stringify(manifest)}])
 const expected={runId:'500',runAttempt:'1',commit,artifactId:'501',artifactDigest:'sha256:'+sha(zipBytes),inputs},metadata={artifact:{id:501,name:`fcf-target-import-${slug}-500-1`,expired:false,size_in_bytes:zipBytes.length,digest:expected.artifactDigest,workflow_run:{id:500,head_sha:commit}},run:{id:500,run_attempt:1,repository:{full_name:execution.repository},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:commit,status:'completed',conclusion:'success'},jobs:[{id:502,run_id:500,run_attempt:1,head_sha:commit,name:'target-import',status:'completed',conclusion:'success',steps:['Import exact FCF target offline','Retain exact FCF target import'].map(name=>({name,status:'completed',conclusion:'success'}))}]}
 return{stage:'import',targetSlug:slug,zipBytes,metadata,expected,manifest,now}
}
test('target stage reader authenticates its own fixed run/job/step/attempt and retains exact rollout text',t=>{
 assert.equal(typeof api.readFcfTargetStageArtifact,'function')
 const f=stageFixture(t),r=api.readFcfTargetStageArtifact(f);assert.equal(r.rolloutText,f.manifest.rolloutText);assert.equal(r.result.stage,'imported');assert.ok(Object.isFrozen(r))
})
for(const[name,mutate]of[['wrong attempt',f=>f.metadata.jobs[0].run_attempt=2],['wrong job',f=>f.metadata.jobs[0].name='cleanup-apply'],['failed retention',f=>f.metadata.jobs[0].steps[1].conclusion='failure'],['foreign target',f=>f.targetSlug='es-ct-tercera-g2'],['changed ZIP',f=>f.zipBytes[40]^=1],['different immutable inputs',f=>f.expected.inputs.cleanupBeforeSha256='f'.repeat(64)]])test(`target stage proof rejects ${name}`,t=>{const f=stageFixture(t);mutate(f);assert.throws(()=>api.readFcfTargetStageArtifact(f),/FCF_STAGE/)})
test('genuine all4 staging descriptors preserve original receipts without SQL or source calls',{skip:!retained},t=>{
 assert.equal(typeof api.describeFcfCleanupOriginals,'function')
 const f=cleanupFixture(t),descriptors=api.describeFcfCleanupOriginals({originals:f.input.originals,now})
 assert.equal(descriptors.length,4);assert.deepEqual(descriptors,f.prepare.originals)
 assert.equal(descriptors.find(d=>d.sourceMatchId==='4116215').receipt.capturedUTC,'2026-10-18T12:31:50.338Z')
 const wrong=new Map(f.input.originals);wrong.delete('4116215');assert.throws(()=>api.describeFcfCleanupOriginals({originals:wrong,now}),/FCF_STAGE/)
})
