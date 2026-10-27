// TEST ONLY: future source commits/clocks are proposals. Genuine37 accounting
// never proves fresh source or a current protected ruleset snapshot.
import test from 'node:test'
import assert from 'node:assert/strict'
import {postSixAccountingWire} from './fcf-post-six-accounting-test-fixture.mjs'
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {fcfSixPolicyHashes,getFcfSixPolicy} from './fcf-six-historical-policy.mjs'
import {validateFcfInventorySourcePlan,isFcfIndependentSourcePlan} from './fcf-inventory-source-protocol.mjs'
import {requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
import {getFcfCapturedTargetData,requireFcfSixSourceContinuation} from './fcf-missing-inventory-evidence.mjs'
const api=await import('./fcf-future-source-plan.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](...args)}
const build=input=>call('buildFcfFutureSourcePlan',input),validate=input=>call('validateFcfFutureSourcePlan',input)
const now=Date.parse('2026-10-27T12:00:00Z'),sourceCommit='a'.repeat(40),rulesetSnapshotSha256='b'.repeat(64)
const genuine={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR?false:'GENUINE POST-SIX ACCOUNTING EVIDENCE ABSENT: set FCF_POST_SIX_EVIDENCE_DIR; no actual spend authentication claimed'}
let proof
const accounting=()=>proof??=readFcfPostSixAccounting(postSixAccountingWire())
const input=()=>({sourceCommit,accountingProof:accounting(),rulesetSnapshotSha256,now})
const rehash=plan=>{const {planSha256,...body}=plan;plan.planSha256=hash(body);return plan}

test('new future plan requires actual reader-issued37 accounting',()=>{
 assert.equal(typeof api.buildFcfFutureSourcePlan,'function','new bounded proposal API required')
 for(const accountingProof of [null,{},Object.freeze({kind:'fcf-post-six-accounting-only',priorSourceGETs:37,maximumCumulativeSourceGETs:478,remainingSourceGETs:441})])assert.throws(()=>build({sourceCommit,accountingProof,rulesetSnapshotSha256,now}),/FCF_INVENTORY/)
})
test('genuine37 permits only G9 fresh240 with planned277 under unchanged478 cap',genuine,()=>{
 const p=build(input()),child=validate({plan:p,accountingProof:accounting(),expectedPlanSha256:p.planSha256,now})
 assert.equal(p.preset,'future-g9-after-six-v1');assert.equal(p.priorSourceGETs,37);assert.equal(p.maximumCumulativeSourceGETs,478);assert.equal(p.maximumNewSourceGETs,240);assert.equal(p.plannedCumulativeSourceGETs,277);assert.equal(p.stopOnDefect,true)
 assert.equal(p.child.targetSlug,'es-ct-tercera-g9');assert.equal(p.child.competitionId,797);assert.equal(p.child.sourceCode,'4118349-4118588');assert.equal(p.child.season,'2026/27');assert.deepEqual(p.child.reuse,[])
 assert.equal(p.child.fetchIds.length,240);assert.equal(p.child.fetchIds[0],'4118349');assert.equal(p.child.fetchIds.at(-1),'4118588');assert.equal(new Set(p.child.fetchIds).size,240);assert.equal(child.maximumSourceGETs,240)
 assert.equal(p.historySha256,hash(accounting()));assert.deepEqual(p.accountingBinding,accounting());assert.deepEqual(p.policyHashes,fcfSixPolicyHashes())
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.child)&&Object.isFrozen(p.child.fetchIds)&&Object.isFrozen(p.accountingBinding)&&Object.isFrozen(child));assert.throws(()=>p.child.fetchIds.push('4118589'),TypeError)
 assert.equal(Object.hasOwn(p,'firstFantasyPlayedOn'),false);assert.equal(Object.hasOwn(p.child,'firstFantasyRound'),false)
})
test('one history-keyed ref covers alternative proposed source commits, clocks and ruleset pins',genuine,()=>{
 const a=build(input()),b=build({...input(),sourceCommit:'c'.repeat(40),now:now+1,rulesetSnapshotSha256:'d'.repeat(64)})
 assert.notEqual(a.planSha256,b.planSha256)
 assert.equal(call('fcfFutureSourceClaimRef',a),`refs/tags/fcf-inventory-claim/future-g9-after-${hash(accounting())}`)
 assert.equal(call('fcfFutureSourceClaimRef',a),call('fcfFutureSourceClaimRef',b))
 assert.throws(()=>call('fcfFutureSourceClaimRef',structuredClone(a)),/FCF_INVENTORY/)
 const restored=structuredClone(a);validate({plan:restored,accountingProof:accounting(),expectedPlanSha256:a.planSha256,now});assert.equal(call('fcfFutureSourceClaimRef',restored),call('fcfFutureSourceClaimRef',a))
})
test('creation and validation use current plan clocks without refreshing old source or refunding spend',genuine,()=>{
 const p=build(input())
 validate({plan:p,accountingProof:accounting(),expectedPlanSha256:p.planSha256,now:now+86400000})
 assert.throws(()=>validate({plan:p,accountingProof:accounting(),expectedPlanSha256:p.planSha256,now:now+86400001}),/FCF_INVENTORY/)
 assert.throws(()=>validate({plan:p,accountingProof:accounting(),expectedPlanSha256:p.planSha256,now:now-1}),/FCF_INVENTORY/)
 const later=build({...input(),now:Date.parse('2030-01-01T00:00:00Z')});assert.equal(later.priorSourceGETs,37);assert.deepEqual(later.child.reuse,[]);assert.deepEqual(later.accountingBinding,accounting())
})
test('plan/hash/ref grant no legacy source, consumed claim, sibling or target capability',genuine,()=>{
 const p=build(input())
 assert.equal(isFcfIndependentSourcePlan(p),false)
 assert.throws(()=>validateFcfInventorySourcePlan({plan:p,expectedPlanSha256:p.planSha256,now}),/FCF_INVENTORY/)
 for(const require of [requireFcfInventoryConsumption,requireFcfSixSourceContinuation])assert.throws(()=>require(p),/FCF_INVENTORY/)
 assert.throws(()=>getFcfCapturedTargetData({targetEvidence:p,targetSlug:'es-ct-tercera-g9',now}),/FCF_INVENTORY/)
 assert.equal(Object.hasOwn(p,'verified'),false);assert.equal(Object.hasOwn(p,'admissible'),false)
 // Same immutable namespace, including neither pending new exception.
 assert.equal(getFcfSixPolicy('es-ct-segona-g1').entries.some(e=>e.sourceMatchId==='4109409'),false)
 assert.equal(getFcfSixPolicy('es-ct-tercera-g9').entries.some(e=>e.sourceMatchId==='4118365'),false)
})
for(const [name,mutate]of[
 ['copied accounting proof',i=>i.accountingProof=structuredClone(i.accountingProof)],['missing accounting',i=>delete i.accountingProof],
 ['consumed source commit',i=>i.sourceCommit='e010bfc63eeb561116ff33293e6aabafb77d7168'],['malformed new commit',i=>i.sourceCommit='main'],
 ['malformed ruleset hash',i=>i.rulesetSnapshotSha256='x'],['null clock',i=>i.now=null],['nonfinite clock',i=>i.now=NaN],['prehistory clock',i=>i.now=Date.parse('2026-10-18T00:00:00Z')],
 ['G1 override',i=>i.targetSlug='es-ct-segona-g1'],['combined groups',i=>i.children=['es-ct-tercera-g9','es-ct-segona-g1']],['cap517',i=>i.maximumCumulativeSourceGETs=517],['baseline reset22',i=>i.priorSourceGETs=22],['caller readiness',i=>i.verified=true],
])test(`builder refuses ${name}`,genuine,()=>{const i=input();mutate(i);assert.throws(()=>build(i),/FCF_INVENTORY/)})
for(const [name,mutate]of[
 ['prior22 reset',p=>p.priorSourceGETs=22],['cap517',p=>p.maximumCumulativeSourceGETs=517],['combined480 budget',p=>p.maximumNewSourceGETs=480],['changed cumulative count',p=>p.plannedCumulativeSourceGETs=276],
 ['G1 substitution',p=>{p.child.targetSlug='es-ct-segona-g1';p.child.competitionId=783}],['combined child field',p=>p.children=[p.child,p.child]],
 ['omitted fresh ID',p=>p.child.fetchIds.pop()],['duplicate fresh ID',p=>p.child.fetchIds[1]=p.child.fetchIds[0]],['old original reuse',p=>p.child.reuse=[{id:'4118358',capturedUTC:new Date(now).toISOString()}]],
 ['different policy hash',p=>p.policyHashes['es-ct-tercera-g9']='e'.repeat(64)],['new report exception',p=>p.exclusions=['4118365']],['R6 opening cutoff',p=>p.firstFantasyPlayedOn='2026-10-24'],
 ['disabled defect stop',p=>p.stopOnDefect=false],['faster pacing',p=>p.limits.pauseMs=0],['changed historical ledger',p=>p.accountingBinding.priorSourceGETs=22],['different history hash',p=>p.historySha256='e'.repeat(64)],
])test(`validator refuses caller-rehashed ${name}`,genuine,()=>{
 const p=structuredClone(build(input()));mutate(p);rehash(p)
 assert.throws(()=>validate({plan:p,accountingProof:accounting(),expectedPlanSha256:p.planSha256,now}),/FCF_INVENTORY/)
})
test('validator refuses hash substitution, cloned accounting and unknown input fields',genuine,()=>{
 const p=build(input()),i={plan:p,accountingProof:accounting(),expectedPlanSha256:p.planSha256,now}
 for(const changed of [{...i,expectedPlanSha256:'e'.repeat(64)},{...i,accountingProof:structuredClone(accounting())},{...i,verified:true},{...i,now:null}])assert.throws(()=>validate(changed),/FCF_INVENTORY/)
 const changed=structuredClone(p);changed.sourceCommit='c'.repeat(40);assert.throws(()=>validate({...i,plan:changed}),/FCF_INVENTORY/)
})
