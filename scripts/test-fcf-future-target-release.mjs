// TEST ONLY: genuine original authority/failed37 history. All NEW source pages,
// native before-images, cleanup/source artifacts and Git metadata are synthetic.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {futureAdmissionWire,bundle,sourceSteps} from './fcf-future-admission-test-fixture.mjs'
import {readFcfFutureCapturedTargetEvidence,getFcfFutureCapturedTargetData,readFcfFutureSourceCompletedChildArtifact,buildFcfFutureSourceFinalReceipt} from './fcf-future-source-admission.mjs'
import {readFcfFutureSourceStagingArtifact,auditFcfFutureSourceOffline} from './fcf-missing-inventory-evidence.mjs'
import {futureCaptureFixture} from './fcf-future-capture-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {sixCleanupFixture} from './fcf-six-cleanup-test-fixture.mjs'
import {readFcfFutureSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
import {metadata,zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {compileFcfTargetReleasePacket,verifyFcfTargetReleasePacket} from './fcf-target-release.mjs'
const api=await import('./fcf-future-target-release.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const call=(name,args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](args)}
const compile=f=>call('compileFcfFutureTargetImportPacket',f),verify=f=>call('verifyFcfFutureTargetImportPacket',f)
const slug='es-ct-tercera-g9',writer='b'.repeat(40),ids=['4109388','4109404','4116215','4118352','4118354','4118358']
const enabled=['FCF_POST_SIX_EVIDENCE_DIR','FCF_FUTURE_SOURCE_EVIDENCE_DIR','FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE','FCF_SIX_ACCOUNTING_WIRE','FCF_HISTORICAL_RETAINED_DIR'].every(k=>process.env[k])
const actual={skip:enabled?false:'Explicit genuine37 and genuine six-original authorization inputs required; no live success claimed'}
function cleanup(t){
 const old=sixCleanupFixture(t),backup=structuredClone(old.backup),prepared=structuredClone(old.prepare),applied=structuredClone(old.applyManifest)
 backup.schemaVersion=3;backup.competitions.forEach(c=>c.prvi_fantasy_krog=1)
 const beforeImageText=JSON.stringify(backup).replaceAll('"points":8.1','"points":8.10')
 Object.assign(prepared,{schemaVersion:3,kind:'fcf-future-exact-six-cleanup-prepared',beforeSha256:sha(beforeImageText)})
 const make=(kind,m,entries=[])=>{
  const bytes=zip([{name:'manifest.json',body:Buffer.from(JSON.stringify(m))},...entries]),digest='sha256:'+sha(bytes),metadata=structuredClone(kind==='prepared'?old.input.prepareMetadata:old.input.appliedMetadata),expected={...old.input.expected[kind==='prepared'?'prepare':'applied'],artifactDigest:digest}
  Object.assign(metadata.artifact,{digest,size_in_bytes:bytes.length});metadata.jobs[0].name='future-'+metadata.jobs[0].name
  const names=kind==='prepared'?['Prepare exact future six FCF cleanup before-image','Retain exact future FCF cleanup before-image']:['Apply exact future six FCF cleanup','Retain exact future FCF cleanup receipt'];metadata.jobs[0].steps=names.map(name=>({name,status:'completed',conclusion:'success'}))
  return {bytes,metadata,expected}
 }
 const p=make('prepared',prepared,[{name:'before-image.json',body:Buffer.from(beforeImageText)},...ids.map(id=>({name:`acta-${id}.html`,body:old.originalsProof.originals.get(id)}))])
 Object.assign(applied,{schemaVersion:3,kind:'fcf-future-exact-six-cleanup-applied',beforeSha256:prepared.beforeSha256,prepareArtifactDigest:p.expected.artifactDigest});Object.assign(applied.result,{schemaVersion:3,beforeSha256:prepared.beforeSha256})
 const a=make('applied',applied),input={prepareZipBytes:p.bytes,prepareMetadata:p.metadata,appliedZipBytes:a.bytes,appliedMetadata:a.metadata,expected:{prepare:p.expected,applied:a.expected},originalsProof:old.originalsProof,now:old.input.now}
 const preparedInput={...input,expected:{prepare:p.expected}};delete preparedInput.appliedZipBytes;delete preparedInput.appliedMetadata
 return {applied:readFcfFutureSixCleanupEvidence(input),prepared:readFcfFutureSixCleanupEvidence(preparedInput),legacy:old.evidence}
}
async function fixture(t){
 const wire=await futureAdmissionWire(t),targetEvidence=readFcfFutureCapturedTargetEvidence(wire),proofs=cleanup(t),data=getFcfFutureCapturedTargetData({targetEvidence,now:wire.now})
 const databaseInventory={capturedUTC:new Date(wire.now).toISOString(),method:'explicitBEGIN_READ_ONLY_ROLLBACK',groups:[['es-ct-segona-g1',783,'4109388-4109627'],['es-ct-tercera-g2',790,'4116188-4116427'],[slug,797,'4118349-4118588']].map(([slug,id,sourceLeagueCode])=>({slug,id,sourceLeagueCode,source:'fcf',source_policy:'es-fcf-six-reviewed-history-v1',sezona_koledarska:false,active:false,nativeImportedIDs:slug==='es-ct-tercera-g9'?data.fixtures.filter(f=>f.statisticsStatus==='available').map(f=>f.id.slice(2)):[]}))}
 return {input:{targetSlug:slug,sourceCommit:writer,targetEvidence,cleanupEvidence:proofs.applied,databaseInventory,now:wire.now},proofs,data,wire}
}


async function changedPresentationEvidence(t,history){
 const f=await futureCaptureFixture(t)
 f.docs.set('4118354',Buffer.concat([f.docs.get('4118354'),Buffer.from('\n<!-- TEST ONLY fresh historical presentation; same immutable facts -->')]))
 const result=await collectFcfMissingInventoryChild(f);assert.equal(result.status,'inventory-complete')
 const entries=readdirSync(result.outputDirectory).map(name=>({name,body:readFileSync(join(result.outputDirectory,name))})),raw=entries.find(e=>e.name==='manifest.json'),m=JSON.parse(raw.body)
 const inventory=bundle(metadata({bytes:zip(entries),name:'fcf-missing-inventory-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:sourceSteps,run:'in_progress'}))
 Object.assign(inventory.expected,{manifestSha256:sha(raw.body),planSha256:f.plan.planSha256,childPlanSha256:m.childPlanSha256})
 const staging=readFcfFutureSourceStagingArtifact({...inventory,plan:f.plan,targetSlug:slug,consumptionProof:f.consumptionProof,now:f.clock()}),auditManifest=auditFcfFutureSourceOffline({stagingProof:staging,policyHashes:f.plan.policyHashes,now:f.clock()}),auditBytes=Buffer.from(JSON.stringify(auditManifest))
 const audit=bundle(metadata({bytes:zip([{name:'manifest.json',body:auditBytes}]),name:'fcf-missing-inventory-audit-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'899',steps:sourceSteps,run:'in_progress'}));audit.expected.manifestSha256=sha(auditBytes)
 const child=readFcfFutureSourceCompletedChildArtifact({plan:f.plan,consumptionProof:f.consumptionProof,inventory,audit,now:f.clock()}),final=buildFcfFutureSourceFinalReceipt({plan:f.plan,claimProof:f.claimProof,consumptionProof:f.consumptionProof,childRecords:[child],execution:{...f.execution,jobId:'777'},now:f.clock()+1}),bytes=Buffer.from(JSON.stringify(final))
 const finalReceipt=bundle(metadata({bytes:zip([{name:'manifest.json',body:bytes}]),name:'fcf-missing-inventory-final-123-1',jobName:'missing-inventory-receipt',jobId:'777',artifactId:'999',steps:['Retain final FCF inventory receipt']}));finalReceipt.expected.manifestSha256=sha(bytes)
 const claim=Object.fromEntries(['execution','ref','claimCommit','claimBytes','rulesets','expected'].map(k=>[k,f.claimWire[k]])),consumption=bundle(f.consumptionWire)
 for(const b of [inventory,audit,consumption,finalReceipt]){b.run.status='completed';b.run.conclusion='success'}
 const now=f.clock()+2,wire={history,plan:f.plan,claim,consumption,child:{inventory,audit},finalReceipt,now}
 return {targetEvidence:readFcfFutureCapturedTargetEvidence(wire),now}
}

test('new import packet compiler/verifier exist and reject forged cleanup/source assertions without private fixtures',()=>{
 for(const name of ['compileFcfFutureTargetImportPacket','verifyFcfFutureTargetImportPacket'])assert.equal(typeof api[name],'function',name)
 for(const cleanupEvidence of [null,{},Object.freeze({phase:'applied',verified:true}),{kind:'fcf-future-exact-six-cleanup-applied',phase:'applied'}])assert.throws(()=>compile({targetSlug:slug,sourceCommit:writer,targetEvidence:{evidenceKind:'fcf-future-captured-target',verified:true},cleanupEvidence,databaseInventory:{},now:Date.parse('2026-10-27T12:00:00Z')}),/FCF_.*(RELEASE|INVENTORY)/)
 for(const manifestText of ['', '{}', '\ufeff{}','x'.repeat(8*1024*1024+1)])assert.throws(()=>verify({targetSlug:slug,sourceCommit:writer,targetEvidence:{},cleanupEvidence:{},databaseInventory:{},now:0,manifestText,manifestSha256:sha(manifestText)}),/FCF_.*(RELEASE|INVENTORY)/)
})

test('branded future source + applied future cleanup compile closed schema4 import data with no launch authority',actual,async t=>{
 const f=await fixture(t),p=compile(f.input),m=JSON.parse(p.manifestText)
 assert.equal(m.schemaVersion,4);assert.equal(m.kind,'fcf-future-current-target-import');assert.deepEqual(Object.keys(m).sort(),['auditedUTC','cleanupBinding','databaseInventory','kind','schemaVersion','sourceCommit','target','targetSlug'])
 assert.equal(m.sourceCommit,writer);assert.equal(m.target.competitionId,797);assert.equal(m.target.competitionSlug,slug);assert.equal(m.target.sourceCode,'4118349-4118588');assert.equal(m.target.season,'2026/27');assert.equal(m.target.historicalCutline,'2026-10-24')
 assert.equal(m.target.fixtures.length,240);assert.equal(m.target.clubs.length,16);assert.equal(m.target.verifiedKeeperClubs.length,16);assert.deepEqual(m.target.sourceEvidence,f.data.binding)
 assert.equal(m.target.sourceEvidence.priorSourceGETs,37);assert.equal(m.target.sourceEvidence.newSourceGETs,240);assert.equal(m.target.sourceEvidence.actualSourceGETs,277);assert.equal(m.target.sourceEvidence.maximumSourceGETs,478)
 assert.equal(m.cleanupBinding.originals.length,6);assert.deepEqual(m.cleanupBinding.policyHashes,fcfSixPolicyIdHashes());assert.equal(m.cleanupBinding.beforeImageText,f.input.cleanupEvidence.beforeImageText);assert.equal(m.cleanupBinding.beforeSha256,sha(m.cleanupBinding.beforeImageText));assert.ok(m.cleanupBinding.beforeImageText.includes('"points":8.10'));assert.ok(m.cleanupBinding.originals.every(o=>!Object.hasOwn(o,'html')&&o.authorization))
 for(const key of ['firstFantasyPlayedOn','firstFantasyRound','roundNumber','deadlineUTC','launchProposal','readiness','activate']){assert.equal(Object.hasOwn(m,key),false);assert.equal(Object.hasOwn(m.target,key),false)}
 for(const row of m.target.fixtures.filter(f=>f.statisticsStatus==='unavailable_historical')){const d=m.cleanupBinding.originals.find(d=>'es'+d.sourceMatchId===row.id);assert.deepEqual(row.sourceFixture,d.fixture);assert.equal(row.source.historicalObservation.approvedOriginalSha256,d.receipt.rawSha256);assert.equal(row.source.historicalObservation.freshRawSha256,row.source.rawSha256)}
 assert.equal(p.manifestSha256,sha(p.manifestText));assert.deepEqual(verify({...f.input,...p,now:f.input.now+1000}),p);assert.ok(Object.isFrozen(p))
 // Reuse this one branded source/cleanup pair for all negative controls.
 for(const [label,change]of[
  ['copied source',i=>i.targetEvidence=structuredClone(i.targetEvidence)],['plain source DATA',i=>i.targetEvidence=f.data],['copied cleanup',i=>i.cleanupEvidence=structuredClone(i.cleanupEvidence)],['legacy cleanup',i=>i.cleanupEvidence=f.proofs.legacy],['prepared cleanup',i=>i.cleanupEvidence=f.proofs.prepared],
  ['G1 scope',i=>i.targetSlug='es-ct-segona-g1'],['bad writer SHA',i=>i.sourceCommit='main'],['caller launch',i=>i.launchProposal={}],['caller clock',i=>i.now=NaN],['null clock',i=>i.now=null],
  ['active selected target',i=>i.databaseInventory.groups[2].active=true],['wrong policy',i=>i.databaseInventory.groups[1].source_policy=null],['wrong non-target source',i=>i.databaseInventory.groups[0].source='dfb'],['missing scope',i=>i.databaseInventory.groups.pop()],['stale inventory',i=>i.databaseInventory.capturedUTC='2026-10-20T00:00:00Z'],
  ['known imported pending',i=>i.databaseInventory.groups[2].nativeImportedIDs.push(f.data.fixtures.find(x=>x.statisticsStatus==='pending').id.slice(2))],['stale source at actual now',i=>{i.now+=86400001;i.databaseInventory.capturedUTC=new Date(i.now).toISOString()}],
 ]){
  const i={...f.input,databaseInventory:structuredClone(f.input.databaseInventory)};change(i);assert.throws(()=>compile(i),/FCF_/,label)
 }
 for(const [label,change]of[
  ['old schema',m=>m.schemaVersion=3],['old kind',m=>m.kind='fcf-six-current-target-release'],['new launch field',m=>m.target.firstFantasyPlayedOn='2026-10-31'],['canonical changed',m=>m.target.fixtures[0].round=30],['refund37',m=>m.target.sourceEvidence.priorSourceGETs=22],['cap517',m=>m.target.sourceEvidence.maximumSourceGETs=517],['changed original',m=>m.cleanupBinding.originals[0].receipt.rawSha256='0'.repeat(64)],['changed fresh observation',m=>m.target.fixtures.find(x=>x.source.historicalObservation).source.historicalObservation.freshRawSha256='0'.repeat(64)],['changed opaque text',m=>m.cleanupBinding.beforeImageText+=' '],['unknown outer flag',m=>m.verified=true],['future audit clock',m=>m.auditedUTC=new Date(f.input.now+1).toISOString()],
 ]){const changed=JSON.parse(p.manifestText);change(changed);const manifestText=JSON.stringify(changed);assert.throws(()=>verify({...f.input,manifestText,manifestSha256:sha(manifestText)}),/FCF_/,label)}
 assert.throws(()=>verify({...f.input,...p,manifestSha256:'0'.repeat(64)}),/FCF_/)
 assert.throws(()=>verify({...f.input,...p,extra:true}),/FCF_/)
 assert.throws(()=>compileFcfTargetReleasePacket(f.input),/FCF_/);assert.throws(()=>verifyFcfTargetReleasePacket({...f.input,...p}),/FCF_/)
 // Already-active non-target readiness/user details remain outside this packet.
 const other={...f.input,databaseInventory:structuredClone(f.input.databaseInventory)};Object.assign(other.databaseInventory.groups[0],{active:true,prvi_fantasy_krog:8,hasUserActivity:true,prices:{anything:true}})
 const allowed=JSON.parse(compile(other).manifestText);assert.equal(allowed.databaseInventory.groups[0].active,true);assert.equal(Object.hasOwn(allowed.databaseInventory.groups[0],'hasUserActivity'),false)
 await t.test('fresh historical presentation SHA stays separate from original cleanup authorization',async t=>{
  const fresh=await changedPresentationEvidence(t,f.wire.history),input={...f.input,...fresh,databaseInventory:structuredClone(f.input.databaseInventory)};input.databaseInventory.capturedUTC=new Date(fresh.now).toISOString()
  const p=compile(input),m=JSON.parse(p.manifestText),row=m.target.fixtures.find(f=>f.id==='es4118354'),d=m.cleanupBinding.originals.find(d=>d.sourceMatchId==='4118354')
  assert.notEqual(row.source.rawSha256,d.receipt.rawSha256)
  assert.equal(row.source.historicalObservation.approvedOriginalSha256,d.receipt.rawSha256);assert.equal(row.source.historicalObservation.freshRawSha256,row.source.rawSha256);assert.deepEqual(row.sourceFixture,d.fixture)
  assert.deepEqual(verify({...input,...p,now:input.now+1000}),p)
  const forged=JSON.parse(p.manifestText);forged.target.fixtures.find(f=>f.id==='es4118354').source.rawSha256=d.receipt.rawSha256;const manifestText=JSON.stringify(forged)
  assert.throws(()=>verify({...input,manifestText,manifestSha256:sha(manifestText)}),/FCF_/)
 })
})
