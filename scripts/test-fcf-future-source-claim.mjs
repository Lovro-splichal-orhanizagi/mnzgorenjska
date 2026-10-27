// TEST ONLY: genuine37 ledger + synthetic NEW Git/ruleset/Actions fixtures.
// Successful offline authentication does not report a real reservation or GET.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {futureClaimFixture,futureConsumptionFixture} from './fcf-future-source-test-fixture.mjs'
import * as planAPI from './fcf-future-source-plan.mjs'
import * as protocol from './fcf-inventory-source-protocol.mjs'
import {validateFcfMissingInventoryPlan} from './fcf-missing-inventory-plan.mjs'
import {validateFcfSixContinuationPlan} from './fcf-six-continuation-plan.mjs'
import {requireFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact,requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
import {sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
const genuine={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR?false:'GENUINE37 ACCOUNTING ABSENT: set FCF_POST_SIX_EVIDENCE_DIR; no real reservation or source readiness claimed'}
const getAccounting=plan=>{assert.equal(typeof planAPI.getFcfFutureSourcePlanAccounting,'function');return planAPI.getFcfFutureSourcePlanAccounting(plan)}
function seal(f){f.claimBytes=Buffer.from(JSON.stringify(f.claim));const s=createHash('sha1').update(`blob ${f.claimBytes.length}\0`).update(f.claimBytes).digest('hex');f.claimCommit.tree.tree[0].sha=s;Object.assign(f.claimCommit.blob,{sha:s,size:f.claimBytes.length,content:f.claimBytes.toString('base64')});f.expected.claimJsonSha256=sha(f.claimBytes);return f}
function resealConsumption(c){c.manifestBytes=Buffer.from(JSON.stringify(c.manifest));c.zipBytes=zip([{name:'manifest.json',body:c.manifestBytes}]);c.artifact.size_in_bytes=c.zipBytes.length;c.artifact.digest=c.expected.artifactDigest=`sha256:${sha(c.zipBytes)}`;c.expected.manifestSha256=sha(c.manifestBytes);return c}

test('new source union branch does not grant a caller-authored plan or consumption capability',()=>{
 assert.equal(typeof protocol.isFcfFutureSourcePlan,'function','explicit future union branch required')
 const forged={preset:'future-g9-after-six-v1',priorSourceGETs:37,maximumNewSourceGETs:240,plannedCumulativeSourceGETs:277}
 assert.equal(protocol.isFcfFutureSourcePlan(forged),true)
 assert.throws(()=>protocol.validateFcfInventorySourcePlan({plan:forged,expectedPlanSha256:'a'.repeat(64)}),/FCF_INVENTORY/)
 assert.throws(()=>requireFcfInventoryConsumption({protocol:forged.preset,verified:true}),/FCF_INVENTORY/)
})
test('explicit union returns one fixed fresh child using only reauthenticated in-process history',genuine,()=>{
 const f=futureClaimFixture(),accounting=getAccounting(f.plan)
 assert.equal(requireFcfPostSixAccounting(accounting),accounting)
 assert.equal(protocol.isFcfFutureSourcePlan(f.plan),true);assert.equal(protocol.isFcfIndependentSourcePlan(f.plan),true)
 const children=protocol.validateFcfInventorySourcePlan({plan:f.plan,expectedPlanSha256:f.plan.planSha256,now:f.now})
 assert.equal(children.length,1);assert.equal(children[0].targetSlug,'es-ct-tercera-g9');assert.equal(children[0].competitionId,797);assert.equal(children[0].fetchIds.length,240);assert.deepEqual(children[0].reuse,[]);assert.equal(protocol.fcfInventorySeedBinding(f.plan),null)
 for(const accountingProof of [undefined,null])assert.equal(protocol.validateFcfInventorySourcePlan({plan:f.plan,accountingProof,expectedPlanSha256:f.plan.planSha256,now:f.now}).length,1)
 const clone=structuredClone(f.plan)
 assert.throws(()=>protocol.validateFcfInventorySourcePlan({plan:clone,expectedPlanSha256:clone.planSha256,now:f.now}),/FCF_INVENTORY/)
 assert.throws(()=>getAccounting(clone),/FCF_INVENTORY/)
 assert.throws(()=>planAPI.validateFcfFutureSourcePlan({plan:clone,accountingProof:structuredClone(accounting),expectedPlanSha256:clone.planSha256,now:f.now}),/FCF_INVENTORY/)
 planAPI.validateFcfFutureSourcePlan({plan:clone,accountingProof:accounting,expectedPlanSha256:clone.planSha256,now:f.now})
 assert.equal(getAccounting(clone),accounting)
 assert.throws(()=>validateFcfMissingInventoryPlan({plan:f.plan,expectedPlanSha256:f.plan.planSha256,now:f.now}),/FCF_INVENTORY/)
 assert.throws(()=>validateFcfSixContinuationPlan({plan:f.plan,expectedPlanSha256:f.plan.planSha256,now:f.now}),/FCF_INVENTORY/)
})
test('schema5 future claim authenticates exact Git blob, history ref, protected ruleset and37/240/277',genuine,()=>{
 const f=futureClaimFixture(),p=readFcfInventoryExecutionClaim(f)
 assert.equal(p.protocol,'future-g9-after-six-v1');assert.equal(p.maximumSourceGETs,478);assert.equal(p.priorSourceGETs,37);assert.equal(p.maximumNewSourceGETs,240);assert.equal(p.plannedCumulativeSourceGETs,277);assert.equal(p.claimRef,planAPI.fcfFutureSourceClaimRef(f.plan));assert.equal(p.seedBinding,null);assert.ok(Object.isFrozen(p))
 assert.equal(Object.hasOwn(p,'verified'),false)
})
test('schema4 consumed artifact preserves exact future claim and authentic capability brand',genuine,()=>{
 const f=futureClaimFixture(),c=futureConsumptionFixture(f),p=readFcfInventoryConsumptionArtifact(c)
 assert.equal(p.protocol,'future-g9-after-six-v1');assert.equal(p.maximumSourceGETs,478);assert.equal(p.priorSourceGETs,37);assert.equal(p.maximumNewSourceGETs,240);assert.equal(p.plannedCumulativeSourceGETs,277);assert.equal(p.claimRef,planAPI.fcfFutureSourceClaimRef(f.plan));assert.equal(requireFcfInventoryConsumption(p),p);assert.ok(Object.isFrozen(p))
 assert.throws(()=>requireFcfInventoryConsumption(structuredClone(p)),/FCF_INVENTORY/)
 const cloneClaim={...c,claimProof:structuredClone(c.claimProof)};assert.throws(()=>readFcfInventoryConsumptionArtifact(cloneClaim),/FCF_INVENTORY/)
})
test('alternative plans share a history ref and cannot consume the first reservation under a new selection',genuine,()=>{
 const a=futureClaimFixture(),b=futureClaimFixture()
 assert.notEqual(a.plan.planSha256,b.plan.planSha256);assert.equal(a.ref.ref,b.ref.ref)
 b.ref=a.ref;b.claimCommit=a.claimCommit;b.claimBytes=a.claimBytes;b.expected.claimJsonSha256=a.expected.claimJsonSha256
 assert.throws(()=>readFcfInventoryExecutionClaim(b),/FCF_INVENTORY/)
})
for(const [name,change]of[
 ['schema2 legacy',f=>{f.claim.schemaVersion=2;f.claim.kind='fcf-missing-inventory-execution-claim'}],['schema3 held parent',f=>{f.claim.schemaVersion=3;f.claim.kind='fcf-g9-held-parent-execution-claim'}],['schema4 six',f=>{f.claim.schemaVersion=4;f.claim.kind='fcf-six-execution-claim'}],
 ['prior22 refund',f=>f.claim.priorSourceGETs=22],['prior0 reset',f=>f.claim.priorSourceGETs=0],['cap517',f=>f.claim.maximumSourceGETs=517],['extra new GET',f=>f.claim.maximumNewSourceGETs=241],['wrong total',f=>f.claim.plannedCumulativeSourceGETs=478],['wrong accounting digest',f=>f.claim.accountingSha256='0'.repeat(64)],['caller success flag',f=>f.claim.verified=true],
 ['attempt2',f=>f.execution.runAttempt='2'],['rebound run',f=>f.execution.runId='124'],['wrong source parent',f=>f.claimCommit.commit.parents[0].sha='1'.repeat(40)],['missing ref',f=>f.ref=null],['moved ref',f=>f.ref.object.sha='1'.repeat(40)],['plan keyed fanout ref',f=>f.ref.ref=`refs/tags/fcf-inventory-claim/${f.plan.planSha256}`],['old six namespace',f=>f.ref.ref=`refs/tags/fcf-inventory-claim/six-after-${f.plan.historySha256}`],
 ['unregistered serialized plan',f=>f.plan=structuredClone(f.plan)],['expired plan',f=>f.now+=86400001],['missing protected ruleset',f=>f.rulesets=[]],['allowed bypass',f=>f.rulesets[0].bypass_actors=[{actor_type:'User',actor_id:1,bypass_mode:'always'}]],['removed deletion protection',f=>f.rulesets[0].rules.pop()],['changed approved root snapshot',f=>{f.claim.rulesetSnapshot=structuredClone(f.claim.rulesetSnapshot);f.claim.rulesetSnapshot.checkedUTC='2026-10-27T11:00:00.000Z'}],
])test(`future claim refuses ${name} despite rehashed claim bytes`,genuine,()=>{const f=futureClaimFixture();change(f);seal(f);assert.throws(()=>readFcfInventoryExecutionClaim(f),/FCF_INVENTORY/)})
for(const [name,change]of[
 ['old schema1',c=>{c.manifest.schemaVersion=1;c.manifest.kind='fcf-missing-inventory-consumed'}],['old schema2',c=>{c.manifest.schemaVersion=2;c.manifest.kind='fcf-g9-held-parent-consumed'}],['old schema3',c=>{c.manifest.schemaVersion=3;c.manifest.kind='fcf-six-consumed'}],['changed claim commit',c=>c.manifest.claimCommit='1'.repeat(40)],['changed source commit',c=>c.manifest.sourceCommit='1'.repeat(40)],['future consumption time',c=>c.manifest.consumedUTC=new Date(c.now+1).toISOString()],['unknown success flag',c=>c.manifest.verified=true],['attempt2',c=>c.run.run_attempt=2],['expired artifact',c=>c.artifact.expired=true],['failed upload',c=>c.jobs[0].steps[1].conclusion='failure'],
])test(`future consumption refuses ${name}`,genuine,()=>{const c=futureConsumptionFixture(futureClaimFixture());change(c);resealConsumption(c);assert.throws(()=>readFcfInventoryConsumptionArtifact(c),/FCF_INVENTORY/)})
