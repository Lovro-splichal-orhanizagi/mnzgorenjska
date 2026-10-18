import test from 'node:test'
import assert from 'node:assert/strict'
import {claimFixture,consumptionFixture,sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
const api=await import('./fcf-missing-inventory-claim.mjs').catch(()=>({}))
const call=(name,args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](args)}
const read=f=>call('readFcfInventoryExecutionClaim',f)
test('protected claim binds one exact plan/run/attempt1 through actual Git commit/tree/blob and no-bypass ruleset',()=>{
 const f=claimFixture(),proof=read(f);assert.equal(proof.runId,'123');assert.equal(proof.runAttempt,'1');assert.equal(proof.claimCommit,f.expected.claimCommit);assert.equal(proof.planSha256,f.plan.planSha256);assert.ok(Object.isFrozen(proof));assert.equal(Object.hasOwn(proof,'remainingBudget'),false)
})
for(const[name,change]of[
 ['same-plan second run',f=>f.execution.runId='124'],['attempt2 restart',f=>f.execution.runAttempt='2'],['foreign expected run',f=>f.expected.runId='124'],['missing protected ref',f=>f.ref=null],['moved ref',f=>f.ref.object.sha='1'.repeat(40)],['tag object indirection',f=>f.ref.object.type='tag'],['wrong root-pinned claim SHA',f=>f.expected.claimCommit='1'.repeat(40)],['wrong claim JSON SHA',f=>f.expected.claimJsonSha256='1'.repeat(64)],['wrong source parent',f=>f.claimCommit.commit.parents[0].sha='1'.repeat(40)],['truncated tree',f=>f.claimCommit.tree.truncated=true],['blob not in actual tree',f=>f.claimCommit.tree.tree[0].sha='1'.repeat(40)],['source commit used as claim commit',f=>f.claimCommit.commit.sha=f.execution.sourceCommit],['claim changed after hash',f=>f.claimBytes=Buffer.from('{}')],['missing protection',f=>f.rulesets=[]],['disabled ruleset',f=>f.rulesets[0].enforcement='evaluate'],['update allowed',f=>f.rulesets[0].rules.shift()],['delete allowed',f=>f.rulesets[0].rules.pop()],['bypass claimant',f=>f.rulesets[0].bypass_actors=[{actor_type:'RepositoryRole',actor_id:5,bypass_mode:'always'}]],['excluded claim namespace',f=>f.rulesets[0].conditions.ref_name.exclude=['refs/tags/fcf-inventory-claim/*']],['wrong protected namespace',f=>f.rulesets[0].conditions.ref_name.include=['refs/tags/other/*']],['wrong ref',f=>f.execution.ref='refs/heads/feature'],['unknown execution field',f=>f.execution.verified=true],['future claim',f=>{f.claim.claimedUTC='2099-01-01T00:00:00.000Z';f.claimBytes=Buffer.from(JSON.stringify(f.claim))}],
])test(`claim refuses ${name} before source permission exists`,()=>{const f=claimFixture();change(f);assert.throws(()=>read(f),/FCF_INVENTORY/)})
test('interrupted reserved execution cannot be rebound or reset with rehashed replacement claim',()=>{
 const first=claimFixture();assert.equal(read(first).runId,'123')
 const second=claimFixture();second.claim.runId='124';second.claimBytes=Buffer.from(JSON.stringify(second.claim));second.execution.runId='124';second.expected.runId='124'
 assert.throws(()=>read(second),/FCF_INVENTORY/)
})
const consume=f=>call('readFcfInventoryConsumptionArtifact',f)
test('successful completed consume job provides immutable consumption proof while parent run is still running',()=>{
 const c=read(claimFixture()),f=consumptionFixture(c),proof=consume(f);assert.equal(proof.kind,'fcf-missing-inventory-consumption-proof');assert.equal(proof.artifactId,'789');assert.equal(proof.claimCommit,c.claimCommit);assert.equal(proof.maximumSourceGETs,477);assert.equal(proof.runAttempt,'1');assert.ok(Object.isFrozen(proof))
})
for(const[name,change]of[
 ['fabricated claim proof',f=>f.claimProof=structuredClone(f.claimProof)],['missing claim proof',f=>delete f.claimProof],['wrong run',f=>f.run.id=124],['attempt2',f=>f.run.run_attempt=2],['wrong job ID',f=>f.expected.jobId='999'],['incomplete consume job',f=>f.jobs[0].status='in_progress'],['failed upload',f=>f.jobs[0].steps[1].conclusion='failure'],['missing required step',f=>f.jobs[0].steps.pop()],['duplicate consume job',f=>f.jobs.push({...f.jobs[0]})],['missing artifact ID',f=>delete f.expected.artifactId],['wrong ZIP digest',f=>f.artifact.digest='sha256:'+'0'.repeat(64)],['expired artifact',f=>f.artifact.expired=true],['missing manifest hash',f=>delete f.expected.manifestSha256],['foreign member',f=>{f.zipBytes=zip([{name:'manifest.json',body:f.manifestBytes},{name:'extra.json'}]);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest=f.expected.artifactDigest='sha256:'+sha(f.zipBytes)}],['refreshed consumption source',f=>{f.manifest.sourceCommit='b'.repeat(40);f.manifestBytes=Buffer.from(JSON.stringify(f.manifest));f.zipBytes=zip([{name:'manifest.json',body:f.manifestBytes}]);f.expected.manifestSha256=sha(f.manifestBytes);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest=f.expected.artifactDigest='sha256:'+sha(f.zipBytes)}],
])test(`consumption refuses ${name}`,()=>{const f=consumptionFixture(read(claimFixture()));change(f);assert.throws(()=>consume(f),/FCF_INVENTORY/)})
test('modules expose no source transport/dispatch/claim mutation CLI',()=>{assert.equal(api.reserveFcfInventoryClaim,undefined);assert.equal(api.fetch,undefined);assert.equal(api.dispatch,undefined)})
test('one-shot consumption capabilities cannot be fabricated or copied',()=>{
 const proof=consume(consumptionFixture(read(claimFixture())))
 assert.equal(call('requireFcfInventoryConsumption',proof),proof)
 assert.throws(()=>call('requireFcfInventoryConsumption',structuredClone(proof)),/FCF_INVENTORY/)
 assert.throws(()=>call('requireFcfInventoryConsumption',{verified:true,...proof}),/FCF_INVENTORY/)
})
test('completed successful consumption stays authentic after a later parent-run failure',()=>{
 const f=consumptionFixture(read(claimFixture()));f.run.status='completed';f.run.conclusion='failure'
 assert.equal(consume(f).runId,'123')
 // Consumption proves reservation only; it is not final target admission.
 assert.equal(consume(f).kind,'fcf-missing-inventory-consumption-proof')
})
