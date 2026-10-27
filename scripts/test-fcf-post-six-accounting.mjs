// Positive cases use only genuine raw retained bytes from an explicitly selected
// local evidence directory. Synthetic ZIPs below are rejection controls only.
import test from 'node:test'
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {readFcfSixAccounting,requireFcfSixAccounting} from './fcf-six-accounting.mjs'
import {validateFcfSixContinuationPlan} from './fcf-six-continuation-plan.mjs'
import {requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
import {getFcfCapturedTargetData,requireFcfSixSourceContinuation} from './fcf-missing-inventory-evidence.mjs'
import {requireFcfHeldParentContinuationEligibility} from './fcf-held-parent-accounting.mjs'
import {zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {postSixAccountingWire as fixture} from './fcf-post-six-accounting-test-fixture.mjs'

const api=await import('./fcf-post-six-accounting.mjs').catch(error=>{
 if(error.code!=='ERR_MODULE_NOT_FOUND')throw error
 return {}
})
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](...args)}
const read=input=>call('readFcfPostSixAccounting',input)
const evidenceDirectory=process.env.FCF_POST_SIX_EVIDENCE_DIR
const genuine={skip:evidenceDirectory?false:'GENUINE OFFLINE EVIDENCE NOT PROVIDED: set FCF_POST_SIX_EVIDENCE_DIR; no production reauthentication claimed'}


test('closed accounting boundary refuses numeric assertions and forged proofs',()=>{
 assert.equal(typeof api.readFcfPostSixAccounting,'function','accounting reader required')
 for(const input of [null,{}, {priorSourceGETs:37,maximumCumulativeSourceGETs:478,verified:true}])assert.throws(()=>read(input),/FCF_INVENTORY/)
 for(const value of [null,{},Object.freeze({kind:'fcf-post-six-accounting-only',priorSourceGETs:37})])assert.throws(()=>call('requireFcfPostSixAccounting',value),/FCF_INVENTORY/)
})

test('genuine terminal six attempt reauthenticates 22 + 10 + 5 = 37 with cap478',genuine,()=>{
 const p=read(fixture())
 assert.equal(p.kind,'fcf-post-six-accounting-only')
 assert.equal(p.priorSourceGETs,37)
 assert.equal(p.latestSourceGETs,15)
 assert.equal(p.maximumCumulativeSourceGETs,478)
 assert.equal(p.remainingSourceGETs,441)
 assert.equal(p.admissible,false)
 assert.equal(p.latest.runId,'39238757730')
 assert.equal(p.latest.completedUTC,'2026-10-19T10:54:44.964Z')
 assert.deepEqual(p.latest.children.map(c=>[c.targetSlug,c.actualSourceGETs]),[['es-ct-tercera-g9',10],['es-ct-segona-g1',5]])
 assert.equal(call('requireFcfPostSixAccounting',p),p)
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.latest)&&Object.isFrozen(p.latest.children)&&p.latest.children.every(Object.isFrozen))
 assert.throws(()=>{p.latest.children[0].actualSourceGETs=0},TypeError)
 for(const copy of [{...p},structuredClone(p)])assert.throws(()=>call('requireFcfPostSixAccounting',copy),/FCF_INVENTORY/)
})

test('historical accounting never creates readiness, claim eligibility, capture or activation proof',genuine,()=>{
 const f=fixture(),p=read(f)
 for(const require of [requireFcfSixAccounting,requireFcfHeldParentContinuationEligibility,requireFcfInventoryConsumption,requireFcfSixSourceContinuation])assert.throws(()=>require(p),/FCF_INVENTORY/)
 assert.throws(()=>getFcfCapturedTargetData({targetEvidence:p,targetSlug:'es-ct-tercera-g9',now:f.now}),/FCF_INVENTORY/)
 const old=readFcfSixAccounting({...f.prior,now:f.now})
 assert.throws(()=>validateFcfSixContinuationPlan({plan:f.latest.plan,accountingProof:old,expectedPlanSha256:f.latest.plan.planSha256,now:f.now}),/FCF_INVENTORY/)
 assert.equal(Object.hasOwn(p,'retained'),false)
 assert.equal(Object.hasOwn(p,'claimProof'),false)
 assert.equal(Object.hasOwn(p,'consumptionProof'),false)
 assert.equal(Object.hasOwn(p,'continuationProof'),false)
})

test('spent GETs never expire or refund with old artifact retention',genuine,()=>{
 const f=fixture()
 for(const b of [f.latest.consumption,...f.latest.children,f.latest.finalReceipt])b.artifact.expired=true
 f.now=Date.parse('2030-01-01T00:00:00Z')
 const p=read(f)
 assert.equal(p.priorSourceGETs,37)
 assert.equal(p.remainingSourceGETs,441)
})

for(const [name,mutate] of [
 ['unknown outer fields',f=>f.verified=true],
 ['caller asserted prior22',f=>f.prior={priorSourceGETs:22}],
 ['copied accounting in place of raw history',f=>f.prior=structuredClone(readFcfSixAccounting(f.prior))],
 ['missing child',f=>f.latest.children.pop()],
 ['duplicate child',f=>f.latest.children[1]=f.latest.children[0]],
 ['swapped child order',f=>f.latest.children.reverse()],
 ['extra latest proof flag',f=>f.latest.admissible=false],
 ['unknown consumption expiry',f=>delete f.latest.consumption.artifact.expired],
 ['unknown attempt2',f=>f.latest.consumption.run.run_attempt=2],
 ['wrong source commit',f=>f.latest.plan.sourceCommit='a'.repeat(40)],
 ['wrong plan hash',f=>f.latest.plan.planSha256='a'.repeat(64)],
 ['wrong protected claim commit',f=>f.latest.claim.expected.claimCommit='a'.repeat(40)],
 ['changed claim bytes',f=>f.latest.claim.claimBytes[0]^=1],
 ['missing protected tag rule',f=>f.latest.claim.rulesets=[]],
 ['changed diagnostic digest',f=>f.latest.children[0].expected.artifactDigest='sha256:'+'a'.repeat(64)],
 ['changed diagnostic manifest pin',f=>f.latest.children[1].expected.manifestSha256='a'.repeat(64)],
 ['changed diagnostic ZIP body',f=>f.latest.children[0].zipBytes[400]^=1],
 ['wrong final receipt artifact',f=>f.latest.finalReceipt.expected.artifactId='123'],
 ['nonterminal run',f=>f.latest.finalReceipt.run.status='in_progress'],
 ['clock before terminal receipt',f=>f.now=Date.parse('2026-10-19T10:54:44.963Z')],
 ['nonfinite clock',f=>f.now=NaN],
 ['explicit null clock',f=>f.now=null],
 ['explicit undefined clock',f=>f.now=undefined],
 ['unknown expected claim fields',f=>f.latest.claim.expected.verified=undefined],
 ['unknown expected artifact fields',f=>f.latest.consumption.expected.verified=undefined],
])test(`genuine fixed accounting refuses ${name}`,genuine,()=>{
 const f=fixture();mutate(f);assert.throws(()=>read(f),/FCF_INVENTORY/)
})

for(const [name,index,mutate] of [
 ['unknown attempted GET count',0,m=>m.actualSourceGETs=null],
 ['omitted attempted GET',0,m=>m.attempts.pop()],
 ['changed attempted report',1,m=>m.attempts[0].id='4109999'],
 ['changed source receipt',0,m=>m.documents.find(d=>d.kind==='captured').receipt.httpStatus=403],
 ['changed final cumulative count',null,m=>m.actualSourceGETs=22],
 ['changed final admissibility',null,m=>m.admissible=true],
])test(`rehashing caller replacement cannot hide ${name}`,genuine,()=>{
 const f=fixture(),b=index===null?f.latest.finalReceipt:f.latest.children[index]
 // This deliberately constructs an unauthentic replacement; it never stands in
 // for a successful raw production fixture.
 const id=b.expected.artifactId,m=JSON.parse(execFileSync('unzip',['-p',join(evidenceDirectory,`${id}.zip`),'manifest.json']))
 mutate(m)
 const bytes=Buffer.from(JSON.stringify(m));b.zipBytes=zip([{name:'manifest.json',body:bytes}])
 b.artifact.size_in_bytes=b.zipBytes.length;b.artifact.digest=b.expected.artifactDigest=`sha256:${sha(b.zipBytes)}`;b.expected.manifestSha256=sha(bytes)
 assert.throws(()=>read(f),/FCF_INVENTORY/)
})
