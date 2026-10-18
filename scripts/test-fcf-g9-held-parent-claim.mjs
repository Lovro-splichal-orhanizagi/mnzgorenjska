// Synthetic new execution controls over genuine old accounting; no source readiness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {deserialize} from 'node:v8'
import {createHash} from 'node:crypto'
import {claimFixture,rulesetSnapshot,consumptionFixture,sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {readFcfHeldParentAccounting} from './fcf-held-parent-accounting.mjs'
import {buildFcfG9HeldParentPlan} from './fcf-g9-held-parent-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {newClaimFixture} from './fcf-g9-held-parent-test-fixture.mjs'
function seal(f){f.claimBytes=Buffer.from(JSON.stringify(f.claim));const s=createHash('sha1').update(`blob ${f.claimBytes.length}\0`).update(f.claimBytes).digest('hex');f.claimCommit.tree.tree[0].sha=s;Object.assign(f.claimCommit.blob,{sha:s,size:f.claimBytes.length,content:f.claimBytes.toString('base64')});f.expected.claimJsonSha256=sha(f.claimBytes);return f}

const opts={skip:!process.env.FCF_HELD_PARENT_WIRE}
test('new schema3 claim authenticates distinct G9 plan and exact cumulative counts',opts,()=>{
 const f=newClaimFixture(),p=readFcfInventoryExecutionClaim(f);assert.equal(p.protocol,'g9-only-after-held-parent-v1');assert.equal(p.maximumSourceGETs,477);assert.equal(p.maximumNewSourceGETs,240);assert.equal(p.priorSourceGETs,16);assert.equal(p.seedBinding,null)
 const c=consumptionFixture(p);Object.assign(c.manifest,{schemaVersion:2,kind:'fcf-g9-held-parent-consumed',consumedUTC:new Date(f.now).toISOString()});c.manifestBytes=Buffer.from(JSON.stringify(c.manifest));c.zipBytes=zip([{name:'manifest.json',body:c.manifestBytes}]);c.artifact.size_in_bytes=c.zipBytes.length;c.artifact.digest=c.expected.artifactDigest='sha256:'+sha(c.zipBytes);c.expected.manifestSha256=sha(c.manifestBytes);c.now=f.now
 assert.equal(readFcfInventoryConsumptionArtifact(c).protocol,p.protocol)
})
for(const[name,change]of[
 ['legacy schema2',f=>{f.claim.schemaVersion=2;f.claim.kind='fcf-missing-inventory-execution-claim'}],['reset count',f=>f.claim.priorSourceGETs=0],['wrong old accounting',f=>f.claim.accountingSha256='0'.repeat(64)],['extra GET',f=>f.claim.maximumNewSourceGETs=241],['wrong cumulative',f=>f.claim.plannedCumulativeSourceGETs=240],['old plan namespace',f=>f.ref.ref='refs/tags/fcf-inventory-claim/'+f.plan.accountingBinding.planSha256],['attempt2',f=>f.execution.runAttempt='2'],
])test(`new claim rejects ${name}`,opts,()=>{const f=newClaimFixture();change(f);seal(f);assert.throws(()=>readFcfInventoryExecutionClaim(f),/FCF_INVENTORY/)})
test('new plans from the same old spent parent share one immutable protected continuation ref',opts,()=>{
 const a=newClaimFixture(),b=newClaimFixture();assert.notEqual(a.plan.planSha256,b.plan.planSha256)
 assert.equal(a.ref.ref,b.ref.ref);assert.equal(a.ref.ref,'refs/tags/fcf-inventory-claim/g9-after-'+a.plan.accountingBinding.planSha256)
 assert.equal(readFcfInventoryExecutionClaim(a).claimRef,readFcfInventoryExecutionClaim(b).claimRef)
 // A second plan cannot consume the actual first reservation.
 b.ref=a.ref;b.claimCommit=a.claimCommit;b.claimBytes=a.claimBytes;b.expected.claimJsonSha256=a.expected.claimJsonSha256
 assert.throws(()=>readFcfInventoryExecutionClaim(b),/FCF_INVENTORY/)
})
