// Genuine unchanged source authority where explicitly supplied; all NEW native
// before-images, ZIPs and GitHub execution metadata below are SYNTHETIC controls.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from './fcf-six-cleanup-evidence.mjs'
import {sixCleanupFixture} from './fcf-six-cleanup-test-fixture.mjs'
import {zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
const commit='a'.repeat(40),now=Date.parse('2026-10-19T08:00:00Z')
const ids=['4109388','4109404','4116215','4118352','4118354','4118358']
const read=input=>{assert.equal(typeof api.readFcfFutureSixCleanupEvidence,'function');return api.readFcfFutureSixCleanupEvidence(input)}
const verified=p=>{assert.equal(typeof api.isVerifiedFcfFutureSixCleanupEvidence,'function');return api.isVerifiedFcfFutureSixCleanupEvidence(p)}
const futureNames={prepared:['Prepare exact future six FCF cleanup before-image','Retain exact future FCF cleanup before-image'],applied:['Apply exact future six FCF cleanup','Retain exact future FCF cleanup receipt']}
function transport(kind,manifest,entries=[],future=true){
 const runId=kind==='prepared'?'100':'300',runAttempt=kind==='prepared'?'2':'3',artifactId=kind==='prepared'?'200':'400'
 const bytes=zip([{name:'manifest.json',body:Buffer.from(JSON.stringify(manifest))},...entries]),artifactDigest='sha256:'+sha(bytes)
 return {bytes,expected:{runId,runAttempt,commit,artifactId,artifactDigest},metadata:{artifact:{id:Number(artifactId),name:`fcf-history-cleanup-${kind}-${runId}-${runAttempt}`,expired:false,size_in_bytes:bytes.length,digest:artifactDigest,workflow_run:{id:Number(runId),head_sha:commit}},run:{id:Number(runId),run_attempt:Number(runAttempt),repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:commit,status:'completed',conclusion:'success'},jobs:[{id:Number(runId)+1,run_id:Number(runId),run_attempt:Number(runAttempt),name:`${future?'future-':''}cleanup-${kind==='prepared'?'prepare':'apply'}`,head_sha:commit,status:'completed',conclusion:'success',steps:(future?futureNames[kind]:kind==='prepared'?['Prepare exact six FCF cleanup before-image','Retain exact FCF cleanup before-image']:['Apply exact six FCF cleanup','Retain exact FCF cleanup receipt']).map(name=>({name,status:'completed',conclusion:'success'}))}]}}
}
function envelope({schemaVersion=3,kind='fcf-future-exact-six-cleanup-prepared',future=true}={}){
 const m={schemaVersion,kind,sourceCommit:commit,capturedUTC:new Date(now).toISOString(),execution:{repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit,runId:'100',runAttempt:'2'},beforeSha256:sha('{}'),policyHashes:fcfSixPolicyIdHashes(),originals:[]}
 const p=transport('prepared',m,[{name:'before-image.json',body:Buffer.from('{}')},...ids.map(id=>({name:`acta-${id}.html`,body:Buffer.from('SYNTHETIC unapproved source')}))],future)
 return {prepareZipBytes:p.bytes,prepareMetadata:p.metadata,expected:{prepare:p.expected},originalsProof:{},now}
}
test('future cleanup capabilities cannot be asserted, cloned or borrowed from old flags',()=>{
 for(const value of [null,{},Object.freeze({phase:'applied',verified:true}),{schemaVersion:3,kind:'fcf-future-exact-six-cleanup-applied'}]){assert.equal(verified(value),false);assert.equal(api.isVerifiedFcfSixCleanupEvidence(value),false)}
 for(const input of [{},{now:NaN},{verified:true}])assert.throws(()=>read(input),/FCF_TARGET_EVIDENCE/)
})
test('always-run new and legacy cleanup envelopes reject each other before before-image authority',()=>{
 const future=envelope(),legacy=envelope({schemaVersion:2,kind:'fcf-exact-six-cleanup-prepared',future:false})
 assert.throws(()=>api.readFcfSixCleanupEvidence(future),/job execution|step|manifest execution/)
 assert.throws(()=>read(legacy),/job execution|step|manifest execution/)
 assert.throws(()=>read(future),/before-image capture fields/)
 const wrong=envelope({schemaVersion:2});assert.throws(()=>read(wrong),/manifest execution/)
})
const actual={skip:!process.env.FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE||!process.env.FCF_SIX_ACCOUNTING_WIRE||!process.env.FCF_HISTORICAL_RETAINED_DIR?'Explicit unchanged genuine six-source authority inputs unavailable':false}
function fixture(t){
 const old=sixCleanupFixture(t),f={old,input:{originalsProof:old.originalsProof,now,expected:{}},backup:structuredClone(old.backup),prepare:structuredClone(old.prepare),applied:structuredClone(old.applyManifest)}
 f.backup.schemaVersion=3;f.backup.competitions.forEach(c=>c.prvi_fantasy_krog=1)
 Object.assign(f.prepare,{schemaVersion:3,kind:'fcf-future-exact-six-cleanup-prepared'})
 Object.assign(f.applied,{schemaVersion:3,kind:'fcf-future-exact-six-cleanup-applied'});f.applied.result.schemaVersion=3
 f.rebuild=()=>{
  const text=JSON.stringify(f.backup).replaceAll('"points":8.1','"points":8.10');f.prepare.beforeSha256=sha(text)
  const p=transport('prepared',f.prepare,[{name:'before-image.json',body:Buffer.from(text)},...ids.map(id=>({name:`acta-${id}.html`,body:old.originalsProof.originals.get(id)}))])
  Object.assign(f.input,{prepareZipBytes:p.bytes,prepareMetadata:p.metadata});f.input.expected.prepare=p.expected
  Object.assign(f.applied,{beforeSha256:f.prepare.beforeSha256,prepareArtifactDigest:p.expected.artifactDigest});f.applied.result.beforeSha256=f.prepare.beforeSha256
  const a=transport('applied',f.applied);Object.assign(f.input,{appliedZipBytes:a.bytes,appliedMetadata:a.metadata});f.input.expected.applied=a.expected
 };f.rebuild();return f
}
test('future schema3 seed1 cleanup authenticates immutable six originals with a separate noncopyable brand',actual,t=>{
 const f=fixture(t),p=read(f.input)
 assert.equal(verified(p),true);assert.equal(api.isVerifiedFcfSixCleanupEvidence(p),false);assert.equal(verified(f.old.evidence),false);assert.equal(api.isVerifiedFcfSixCleanupEvidence(f.old.evidence),true)
 assert.equal(verified(structuredClone(p)),false);assert.equal(p.phase,'applied');assert.equal(p.originals.length,6);assert.equal(p.appliedReceipt.result.removedAppearances,157);assert.equal(p.appliedReceipt.result.removedGoals,18);assert.equal(p.appliedReceipt.result.unavailableMatches,6)
 assert.ok(JSON.parse(p.beforeImageText).competitions.every(c=>c.prvi_fantasy_krog===1));assert.ok(p.beforeImageText.includes('"points":8.10'));assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.appliedReceipt))
 assert.throws(()=>api.readFcfSixCleanupEvidence(f.input),/job execution|step|manifest execution/)
 const prepared={...f.input,expected:{prepare:f.input.expected.prepare}};delete prepared.appliedZipBytes;delete prepared.appliedMetadata
 const prep=read(prepared);assert.equal(prep.phase,'prepared');assert.equal(verified(prep),true)
 assert.throws(()=>read({...prepared,now:now+24*3600000+1}),/fresh original/)
})
for(const [name,change]of[
 ['legacy before-image schema',f=>f.backup.schemaVersion=2],['one legacy seed6 competition',f=>f.backup.competitions[1].prvi_fantasy_krog=6],['active native competition',f=>f.backup.competitions[0].active=true],['changed original native match',f=>f.backup.matches[0].home_team_id++],['individual count drift',f=>f.backup.appearances.pop()],['occupied unknown placeholder',f=>f.backup.matches.find(m=>m.id===321663).imported_at='2026-10-19T01:00:00Z'],['installed policy',f=>f.backup.installedPolicies.push({id:'SYNTHETIC'})],['legacy result schema',f=>f.applied.result.schemaVersion=2],['wrong removed count',f=>f.applied.result.removedGoals=17],['wrong six marker identity',f=>f.applied.markers[0].matchId++],['new unapproved original descriptor',f=>f.prepare.originals[0].sourceMatchId='4109409'],
])test(`future cleanup preserves refusal for ${name}`,actual,t=>{const f=fixture(t);change(f);f.rebuild();assert.throws(()=>read(f.input),/FCF_TARGET_EVIDENCE|historical|marker/i)})
for(const [name,change]of[
 ['borrowed original authority',f=>f.input.originalsProof=structuredClone(f.old.originalsProof)],['failed prepare run',f=>f.input.prepareMetadata.run.conclusion='failure'],['wrong prepare job',f=>f.input.prepareMetadata.jobs[0].name='cleanup-prepare'],['failed audit step',f=>f.input.appliedMetadata.jobs[0].steps[0].conclusion='failure'],['duplicate apply step',f=>f.input.appliedMetadata.jobs[0].steps.push({...f.input.appliedMetadata.jobs[0].steps[0]})],['changed ZIP bytes',f=>f.input.prepareZipBytes[0]^=1],['wrong prepare link',f=>{f.applied.prepareArtifactId='201';const a=transport('applied',f.applied);f.input.appliedZipBytes=a.bytes;f.input.appliedMetadata=a.metadata;f.input.expected.applied=a.expected}],
])test(`future cleanup authenticates ${name} independently`,actual,t=>{const f=fixture(t);change(f);assert.throws(()=>read(f.input),/FCF_TARGET_EVIDENCE|digest/i)})
