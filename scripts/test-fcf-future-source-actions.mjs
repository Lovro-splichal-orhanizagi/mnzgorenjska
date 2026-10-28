// TEST ONLY orchestration: real failed37 history; synthetic NEW Actions/Git and
// source responses. No provider, GitHub, claim tag or production DB is contacted.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {readFcfInventoryApproval,runFcfMissingInventoryActions} from './fcf-missing-inventory-actions.mjs'
import {futureActionsFixture,zip,sha,repository} from './fcf-future-actions-test-fixture.mjs'
import {futureAdmissionWire,sourceSteps} from './fcf-future-admission-test-fixture.mjs'
const opts={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR?false:'Explicit genuine37 retained history required'}
const full={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Genuine37 history and retained historical source bytes required'}
const run=(f,mode)=>runFcfMissingInventoryActions({...f.base(),argv:[mode]})
const json=path=>JSON.parse(readFileSync(path)),manifest=(f,path)=>json(join(f.root,path,'manifest.json'))

test('future source-free approval-stage authenticates raw root approval and genuine37 history',opts,async t=>{
 const f=futureActionsFixture(t);f.env.GITHUB_JOB='missing-inventory-approval';Object.assign(f.approvalJob,{status:'in_progress',conclusion:null});Object.assign(f.approvalJob.steps[0],{status:'in_progress',conclusion:null})
 assert.equal((await run(f,'approval-stage')).code,0)
 assert.deepEqual(readFileSync(join(f.root,'fcf-inventory-approval/manifest.json')),f.approvalBytes)
 assert.equal(f.sourceCalls.length,0)
 assert.ok(!f.calls.some(([p])=>p.includes(f.claim.ref.ref.slice(5))))
})
test('future consume emits schema4 without provider, seed or G1 access',opts,async t=>{
 const f=futureActionsFixture(t);Object.assign(f.consumeJob,{status:'in_progress',conclusion:null})
 assert.equal((await run(f,'consume')).code,0)
 const m=manifest(f,'fcf-inventory-consumption');assert.equal(m.schemaVersion,4);assert.equal(m.kind,'fcf-future-source-consumed');assert.equal(m.seedBinding,null);assert.equal(m.claimRef,f.claim.ref.ref)
 assert.equal(f.sourceCalls.length,0);assert.ok(!f.calls.some(([p])=>p.includes('/releases')))
})
for(const [label,change]of[
 ['attempt2',e=>e.GITHUB_RUN_ATTEMPT='2'],['nonmain',e=>e.GITHUB_REF='refs/heads/other'],['DBcredential',e=>e.SUPABASE_SERVICE_ROLE_KEY='TEST ONLY'],
 ['G1 target',e=>e.FCF_INVENTORY_TARGET='es-ct-segona-g1'],['wrong active job',e=>e.GITHUB_JOB='missing-inventory-g1'],['sibling injection',e=>e.FCF_G1_INVENTORY_ID='123'],['seed injection',e=>e.FCF_INVENTORY_SEED_ID='123'],
])test(`future capture refuses ${label} before GitHub/source`,opts,async t=>{
 const f=futureActionsFixture(t);Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g9',FCF_INVENTORY_TARGET:'es-ct-tercera-g9'});change(f.env)
 await assert.rejects(()=>run(f,'capture'),/FCF_INVENTORY/);assert.equal(f.calls.length,0);assert.equal(f.sourceCalls.length,0)
})
test('future capture counts the first403 at sequence38 without retry; receipt retains cumulative38',opts,async t=>{
 const f=futureActionsFixture(t);Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g9',FCF_INVENTORY_TARGET:'es-ct-tercera-g9'})
 assert.equal((await run(f,'capture')).code,1);assert.equal(f.sourceCalls.length,1)
 const m=manifest(f,'fcf-missing-es-ct-tercera-g9');assert.equal(m.priorSourceGETs,37);assert.equal(m.actualSourceGETs,1);assert.equal(m.attempts[0].sequence,38)
 const entries=readdirSync(join(f.root,'fcf-missing-es-ct-tercera-g9')).map(name=>({name,body:readFileSync(join(f.root,'fcf-missing-es-ct-tercera-g9',name))}))
 const b=f.artifact(zip(entries),{id:'898',name:'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555'})
 Object.assign(f.captureJob,{status:'completed',conclusion:'failure'});f.captureJob.steps=[{name:'Capture missing target inventory',status:'completed',conclusion:'failure'},{name:'Retain failed target inventory diagnostic',status:'completed',conclusion:'success'}]
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-receipt',FCF_G9_DIAGNOSTIC_ID:'898',FCF_G9_DIAGNOSTIC_DIGEST:b.expected.artifactDigest,FCF_G9_MANIFEST_SHA:sha(readFileSync(join(f.root,'fcf-missing-es-ct-tercera-g9/manifest.json')))});delete f.env.FCF_INVENTORY_TARGET
 assert.equal((await run(f,'receipt')).code,0)
 const receipt=manifest(f,'fcf-inventory-final');assert.equal(receipt.kind,'fcf-future-source-final-receipt');assert.equal(receipt.priorSourceGETs,37);assert.equal(receipt.newSourceGETs,1);assert.equal(receipt.actualSourceGETs,38);assert.equal(receipt.admissible,false)
})
test('local future root approval and schema5 claim template are GET-only data',opts,async t=>{
 const f=futureActionsFixture(t),history=join(f.root,'history.json'),approval=join(f.root,'root-approval.json'),claim=join(f.root,'claim-template.json');writeFileSync(history,JSON.stringify(f.history))
 const prepared=await runFcfMissingInventoryActions({...f.base(),argv:['prepare-future-approval','--history-source',history,'--source-commit',f.claim.plan.sourceCommit,'--ruleset-id','12','--output',approval]})
 assert.equal(prepared.code,0);const a=json(approval);assert.equal(a.schemaVersion,4);assert.equal(a.plan.priorSourceGETs,37);assert.equal(a.plan.plannedCumulativeSourceGETs,277)
 delete f.map.get(`repos/${repository}/rulesets/12`).bypass_actors
 const result=await runFcfMissingInventoryActions({...f.base(),argv:['claim-template','--approval',approval,'--run-id','123','--output',claim]})
 const c=json(claim);assert.equal(c.schemaVersion,5);assert.equal(c.kind,'fcf-future-source-execution-claim');assert.equal(c.maximumSourceGETs,478);assert.equal(c.priorSourceGETs,37);assert.equal(c.maximumNewSourceGETs,240);assert.equal(c.plannedCumulativeSourceGETs,277);assert.equal(result.result.claimRef,prepared.result.claimRef);assert.deepEqual(c.rulesetSnapshot.ruleset.bypass_actors,[]);assert.equal(f.sourceCalls.length,0)
})
test('unknown or cancelled future child remains indeterminate with known prior37',opts,async t=>{
 const f=futureActionsFixture(t);f.env.GITHUB_JOB='missing-inventory-receipt';Object.assign(f.captureJob,{status:'completed',conclusion:'cancelled'});Object.assign(f.captureJob.steps[0],{status:'completed',conclusion:'cancelled'})
 assert.equal((await run(f,'receipt')).code,0);const m=manifest(f,'fcf-inventory-final');assert.equal(m.status,'indeterminate');assert.equal(m.admissible,false);assert.equal(m.priorSourceGETs,37);assert.equal(m.actualSourceGETs,null);assert.equal(m.newSourceGETs,null)
})
test('explicitly skipped future capture produces authenticated zero new spend with prior37 intact',opts,async t=>{
 const f=futureActionsFixture(t);f.env.GITHUB_JOB='missing-inventory-receipt';Object.assign(f.captureJob,{status:'completed',conclusion:'skipped'});Object.assign(f.captureJob.steps[0],{status:'completed',conclusion:'skipped'})
 assert.equal((await run(f,'receipt')).code,0);const m=manifest(f,'fcf-inventory-final');assert.equal(m.kind,'fcf-future-source-final-receipt');assert.equal(m.priorSourceGETs,37);assert.equal(m.actualSourceGETs,37);assert.equal(m.newSourceGETs,0);assert.equal(m.admissible,false)
})
test('full synthetic240 inventory is audited offline and receipt authenticates cumulative277',full,async t=>{
 const w=await futureAdmissionWire(t),f=futureActionsFixture(t,{wire:w});f.time=w.now;f.addArtifact(w.child.inventory);f.addArtifact(w.child.audit);Object.assign(f.captureJob,{status:'completed',conclusion:'success'});f.captureJob.steps=sourceSteps.map(name=>({name,status:'completed',conclusion:'success'}))
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g9',FCF_INVENTORY_TARGET:'es-ct-tercera-g9',FCF_CURRENT_INVENTORY_ID:w.child.inventory.expected.artifactId,FCF_CURRENT_INVENTORY_DIGEST:w.child.inventory.expected.artifactDigest,FCF_CURRENT_MANIFEST_SHA:w.child.inventory.expected.manifestSha256})
 assert.equal((await run(f,'audit')).code,0);const audit=manifest(f,'fcf-inventory-audit-es-ct-tercera-g9');assert.equal(audit.kind,'fcf-future-source-offline-audit');assert.equal(audit.actualSourceGETs,277)
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-receipt',FCF_G9_INVENTORY_ID:w.child.inventory.expected.artifactId,FCF_G9_INVENTORY_DIGEST:w.child.inventory.expected.artifactDigest,FCF_G9_MANIFEST_SHA:w.child.inventory.expected.manifestSha256,FCF_G9_AUDIT_ID:w.child.audit.expected.artifactId,FCF_G9_AUDIT_DIGEST:w.child.audit.expected.artifactDigest,FCF_G9_AUDIT_MANIFEST_SHA:w.child.audit.expected.manifestSha256});delete f.env.FCF_INVENTORY_TARGET
 assert.equal((await run(f,'receipt')).code,0);const m=manifest(f,'fcf-inventory-final');assert.equal(m.kind,'fcf-future-source-final-receipt');assert.equal(m.actualSourceGETs,277);assert.equal(m.newSourceGETs,240);assert.equal(m.maximumSourceGETs,478);assert.equal(m.admissible,true);assert.equal(f.sourceCalls.length,0)
})

test('capture refuses an actual inactive capture step before any source request',opts,async t=>{
 const f=futureActionsFixture(t);Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g9',FCF_INVENTORY_TARGET:'es-ct-tercera-g9'});Object.assign(f.captureJob.steps[0],{status:'completed',conclusion:'success'})
 await assert.rejects(()=>run(f,'capture'),/FCF_INVENTORY/);assert.equal(f.sourceCalls.length,0)
})
for(const label of ['run cancelled','claim protection changed'])test(`capture rechecks after source coordination when ${label}`,opts,async t=>{
 const f=futureActionsFixture(t);Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g9',FCF_INVENTORY_TARGET:'es-ct-tercera-g9'});const get=f.github
 f.github=async(path,binary)=>{const result=await get(path,binary);if(path.includes('/actions/workflows/')){if(label==='run cancelled')Object.assign(f.run,{status:'completed',conclusion:'cancelled'});else f.map.get(`repos/${repository}/rulesets/12`).bypass_actors=[{actor_id:1}]}return result}
 await assert.rejects(()=>run(f,'capture'),/FCF_INVENTORY/);assert.equal(f.sourceCalls.length,0)
})
import {createHash} from 'node:crypto'
test('capture refuses a correctly hashed protected claim reserved for another run',opts,async t=>{
 const f=futureActionsFixture(t);Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g9',FCF_INVENTORY_TARGET:'es-ct-tercera-g9'})
 const claim=JSON.parse(f.claim.claimBytes);claim.runId='124';const bytes=Buffer.from(JSON.stringify(claim)),blobSha=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),blob={...f.claim.claimCommit.blob,sha:blobSha,size:bytes.length,content:bytes.toString('base64')}
 f.claim.claimCommit.tree.tree[0].sha=blobSha;f.map.set(`repos/${repository}/git/blobs/${blobSha}`,blob)
 await assert.rejects(()=>run(f,'capture'),/FCF_INVENTORY/);assert.equal(f.sourceCalls.length,0)
})
for(const auditFailed of [true,false])test(`full inventory ${auditFailed?'actual failed audit retains240':'audit-upload failure remains indeterminate'}`,full,async t=>{
 const w=await futureAdmissionWire(t),f=futureActionsFixture(t,{wire:w});f.time=w.now;f.addArtifact(w.child.inventory);Object.assign(f.captureJob,{status:'completed',conclusion:'failure'});f.captureJob.steps=sourceSteps.map(name=>({name,status:'completed',conclusion:'success'}));f.captureJob.steps[2].conclusion=auditFailed?'failure':'success';f.captureJob.steps[3].conclusion=auditFailed?'skipped':'failure'
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-receipt',FCF_G9_INVENTORY_ID:w.child.inventory.expected.artifactId,FCF_G9_INVENTORY_DIGEST:w.child.inventory.expected.artifactDigest,FCF_G9_MANIFEST_SHA:w.child.inventory.expected.manifestSha256})
 assert.equal((await run(f,'receipt')).code,0);const m=manifest(f,'fcf-inventory-final');assert.equal(m.priorSourceGETs,37);assert.equal(m.admissible,false)
 if(auditFailed){assert.equal(m.kind,'fcf-future-source-final-receipt');assert.equal(m.newSourceGETs,240);assert.equal(m.actualSourceGETs,277);assert.equal(m.children[0].stopReason,'offline-audit-failed')}
 else {assert.equal(m.status,'indeterminate');assert.equal(m.actualSourceGETs,null);assert.equal(m.newSourceGETs,null)}
 assert.equal(f.sourceCalls.length,0)
})
import {manualPlan,rulesetSnapshot} from './fcf-missing-inventory-test-fixture.mjs'
test('future approval-stage refuses root assets belonging to a legacy protocol',opts,async t=>{
 const f=futureActionsFixture(t),plan=manualPlan(),b=plan.seedBinding,legacy={schemaVersion:1,kind:'fcf-missing-inventory-approval',sourceCommit:plan.sourceCommit,plan,seedExpected:{runId:b.runId,runAttempt:b.runAttempt,sourceCommit:b.retentionCommit,jobId:b.jobId,artifactId:b.artifactId,artifactDigest:b.artifactDigest,manifestSha256:b.manifestSha256,originalManifestSha256:b.originalManifestSha256,policyHashes:plan.policyHashes,name:`fcf-inventory-seed-${b.runId}-${b.runAttempt}`},rulesetId:'12',rulesetSnapshot}
 // Keep this legacy root fresh for its own protocol; the selected Actions
 // preset remains future, so protocol agreement must independently reject it.
 plan.createdUTC=new Date(f.time).toISOString();const {planSha256,...body}=plan;const {historicalStatisticsPolicySha256:hash}=await import('./lib/historical-statistics-policy.mjs');plan.planSha256=hash(body)
 const freshBytes=Buffer.from(JSON.stringify(legacy)),get=f.github;assert.equal(readFcfInventoryApproval({bytes:freshBytes,sourceCommit:plan.sourceCommit,now:f.time}).plan.preset,'g1-then-g9-missing-v1');f.env.FCF_INVENTORY_ASSET_SHA='sha256:'+sha(freshBytes);f.env.GITHUB_JOB='missing-inventory-approval';Object.assign(f.approvalJob,{status:'in_progress',conclusion:null});Object.assign(f.approvalJob.steps[0],{status:'in_progress',conclusion:null})
 f.github=async(path,binary)=>path.endsWith('/releases/11/assets?per_page=100&page=1')?[{id:22,state:'uploaded',size:freshBytes.length}]:path.endsWith('/releases/assets/22')?freshBytes:get(path,binary)
 await assert.rejects(()=>run(f,'approval-stage'),/FCF_INVENTORY/);assert.equal(f.sourceCalls.length,0)
})
