// Scoped P2 regression. Genuine retained OLD37; NEW terminal execution, Git and
// metadata records are TEST ONLY. No source/GitHub/DB request is performed.
import test from 'node:test'
import assert from 'node:assert/strict'
import {serialize,deserialize} from 'node:v8'
import {postG9AccountingWire} from './fcf-post-g9-accounting-test-fixture.mjs'
import {readFcfPostG9Accounting} from './fcf-post-g9-accounting.mjs'
import {postSixAccountingWire} from './fcf-post-six-accounting-test-fixture.mjs'
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {buildFcfG1SourceContinuationPlan,buildFcfFutureSourcePlan,validateFcfFutureSourcePlan,fcfFutureSourceClaimRef} from './fcf-future-source-plan.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const copy=x=>deserialize(serialize(x)),enabled={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Genuine OLD37/source fixture inputs required; NEW records synthetic'}
const input=(proof,now)=>({accountingProof:proof,sourceCommit:'b'.repeat(40),rulesetSnapshotSha256:'c'.repeat(64),now})
test('P2 same authenticated spent history keeps plan bytes and one-use ref across unrelated accepted API metadata',enabled,async t=>{
 const raw=await postG9AccountingWire(t,'unstarted'),changed=copy(raw)
 changed.latest.child.unstarted.run.repository.description='TEST ONLY unrelated repository description'
 changed.latest.child.unstarted.run.display_title='TEST ONLY changed display text'
 changed.latest.child.unstarted.jobs[0].html_url='https://example.invalid/TEST-ONLY-view'
 const a=readFcfPostG9Accounting(raw),b=readFcfPostG9Accounting(changed),pa=buildFcfG1SourceContinuationPlan(input(a,raw.now+1000)),pb=buildFcfG1SourceContinuationPlan(input(b,raw.now+1000))
 assert.notEqual(a.latest.unstartedBinding.witnessSha256,b.latest.unstartedBinding.witnessSha256,'forensic witness must retain metadata difference')
 assert.equal(a.priorSourceGETs,37);assert.equal(b.priorSourceGETs,37);assert.equal(a.latestSourceGETs,0);assert.equal(b.latestSourceGETs,0)
 assert.equal(fcfFutureSourceClaimRef(pa),fcfFutureSourceClaimRef(pb),'one spent history cannot acquire alternate claim names')
 assert.equal(JSON.stringify(pa),JSON.stringify(pb),'unrelated mutable metadata cannot invalidate prepared G1 plan')
 assert.doesNotThrow(()=>validateFcfFutureSourcePlan({plan:copy(pa),accountingProof:b,expectedPlanSha256:pa.planSha256,now:raw.now+1000}))
 assert.equal(pa.accountingBinding.schemaVersion,1);assert.equal(pa.accountingBinding.kind,'fcf-post-g9-source-history')
 assert.deepEqual(pa.accountingBinding.priorAccountingBinding,a.priorAccountingBinding)
 for(const field of ['sourceCommit','planSha256','runId','runAttempt','rulesetId','completedUTC','conclusion','claimBinding','consumptionBinding','child','finalReceiptBinding'])assert.deepEqual(pa.accountingBinding.latest[field],a.latest[field],field+' meaningful binding retained')
 assert.ok(Object.isFrozen(pa.accountingBinding)&&Object.isFrozen(pa.accountingBinding.latest.consumptionBinding))
 assert.equal(Object.hasOwn(pa.accountingBinding.latest.unstartedBinding,'witnessSha256'),false)
 const later=buildFcfG1SourceContinuationPlan({...input(b,raw.now+2000),sourceCommit:'d'.repeat(40),rulesetSnapshotSha256:'e'.repeat(64)})
 assert.notEqual(later.planSha256,pa.planSha256);assert.equal(fcfFutureSourceClaimRef(later),fcfFutureSourceClaimRef(pa))
 for(const accountingProof of [copy(a),copy(pa.accountingBinding)])assert.throws(()=>buildFcfG1SourceContinuationPlan(input(accountingProof,raw.now+1000)),/FCF_INVENTORY/)
 assert.throws(()=>buildFcfG1SourceContinuationPlan({...input(a,raw.now+1000),maximumCumulativeSourceGETs:517}),/FCF_INVENTORY/)
})
test('P2 altered meaningful run, claim and raw digest cannot become the same accepted history',enabled,async t=>{
 const raw=await postG9AccountingWire(t,'unstarted')
 for(const mutate of [r=>r.latest.child.unstarted.run.id=124,r=>r.latest.claim.expected.claimCommit='d'.repeat(40),r=>r.latest.finalReceipt.expected.artifactDigest='sha256:'+'d'.repeat(64),r=>r.latest.consumption.expected.manifestSha256='d'.repeat(64)]){const changed=copy(raw);mutate(changed);assert.throws(()=>readFcfPostG9Accounting(changed),/FCF_INVENTORY/)}
 const partial=await postG9AccountingWire(t,'diagnostic'),a=readFcfPostG9Accounting(raw),b=readFcfPostG9Accounting(partial)
 assert.equal(a.priorSourceGETs,37);assert.equal(b.priorSourceGETs,38)
 assert.notEqual(fcfFutureSourceClaimRef(buildFcfG1SourceContinuationPlan(input(a,Math.max(raw.now,partial.now)+1000))),fcfFutureSourceClaimRef(buildFcfG1SourceContinuationPlan(input(b,Math.max(raw.now,partial.now)+1000))))
})
test('P2 old G9 serialized default and claim namespace remain exact',enabled,()=>{
 const accounting=readFcfPostSixAccounting(postSixAccountingWire()),p=buildFcfFutureSourcePlan({accountingProof:accounting,sourceCommit:'a'.repeat(40),rulesetSnapshotSha256:'b'.repeat(64),now:Date.parse('2026-10-27T12:00:00Z')})
 assert.equal(p.planSha256,'960efe8115e5ff8babc6843a31a65f7fd9bfc779bac7002092d4c163185785f6')
 assert.equal(p.historySha256,hash(accounting));assert.equal(fcfFutureSourceClaimRef(p),`refs/tags/fcf-inventory-claim/future-g9-after-${hash(accounting)}`)
})
