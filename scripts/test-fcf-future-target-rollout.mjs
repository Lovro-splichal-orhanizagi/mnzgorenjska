// TEST ONLY: genuine retained OLD history/original authorization; all NEW
// source pages, native state and cleanup/GitHub metadata are SYNTHETIC controls.
import test from 'node:test'
import assert from 'node:assert/strict'
import {futureAdmissionWire} from './fcf-future-admission-test-fixture.mjs'
import {readFcfFutureCapturedTargetEvidence,getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {nativePlanFixture} from './fcf-six-native-test-fixture.mjs'
import {privacyProjection} from './fcf-native-plan-test-fixture.mjs'
import {sixCleanupFixture} from './fcf-six-cleanup-test-fixture.mjs'
import {readFcfFutureSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {loadFcfTargetOfflineProvider} from './fcf-target-native-adapter.mjs'
import {replayFcfTargetRollout} from './fcf-target-rollout.mjs'
import {compileFcfFutureTargetImportPacket} from './fcf-future-target-release.mjs'
const adapter=await import('./fcf-future-target-native-adapter.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const rollout=await import('./fcf-future-target-rollout.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const slug='es-ct-tercera-g9',writer='b'.repeat(40),ids=['4109388','4109404','4116215','4118352','4118354','4118358'],key=c=>`${c.sourceClubId}/${c.sourceCategoryId}`
const execution={repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit:writer,runId:'456',runAttempt:'1'}
const enabled=['FCF_POST_SIX_EVIDENCE_DIR','FCF_FUTURE_SOURCE_EVIDENCE_DIR','FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE','FCF_SIX_ACCOUNTING_WIRE','FCF_HISTORICAL_RETAINED_DIR'].every(k=>process.env[k])
const actual={skip:enabled?false:'Genuine37 accounting and immutable six-original authority required; no live source success claimed'}
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
const addedBindings=[
 ['5029','33592','BESCANO, C.D.','4109389','5f102da312280ff3f4ff5f65bf067e8f71e9f0301c5bae5b578d81ed02f93e97'],
 ['1372','19610692','CAN VIDALET, C.F.','4118354','f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556'],
 ['54319880','54709553','ONA SANT ADRIA, F.C.','4118354','f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556'],
].map(([club,category,name,match,raw])=>({provider:'fcf',source_club_id:club,source_category_id:category,country_code:'ES',canonical_names:[name],proofs:[{sourceMatchId:match,sourceUrl:`https://www.fcf.cat/ca/competicio/acta/${match}`,rawSha256:raw,...(match==='4109389'?{side:'away',round:1,playedOn:'2026-09-19'}:{})}],bound_team_id:null}))

function nativeInput(sourceData,now){
 const template=nativePlanFixture(slug),d=template.databaseInventory
 const anchored={'1252/35781':8304,'6136/33049':8305,'1372/19610692':7566,'54319880/54709553':8308,'44143644/44510647':8301,'1400/47272626':8298}
 const team=c=>anchored[key(c)]??900000+sourceData.clubs.findIndex(x=>key(x)===key(c))
 d.teams=sourceData.clubs.map(c=>({id:team(c),competition_id:797,name:c.name}))
 d.rounds=Array.from({length:30},(_,i)=>{const day=sourceData.fixtures.filter(f=>f.round===i+1).map(f=>f.date).sort()[0];return {id:i<2?27616+i:700000+i,competition_id:797,season:'2026/27',number:i+1,played_on:day,deadline_at:`${day}T08:00:00Z`,lineups_locked_at:null}})
 d.matches=sourceData.fixtures.map((f,i)=>({id:{es4118352:306164,es4118354:306166,es4118358:306171}[f.id]??800000+i,round_id:d.rounds.find(r=>r.number===f.round).id,home_team_id:team(f.clubs[0]),away_team_id:team(f.clubs[1]),played_on:f.date,zapisnik_id:f.statisticsStatus==='pending'?null:f.id,imported_at:f.statisticsStatus==='available'?new Date(now).toISOString():null,kontumacija:false,vir_brez_izida:false,statistics_status:f.statisticsStatus==='unavailable_historical'?'unavailable_historical':'available'}))
 d.capturedUTC=new Date(now).toISOString();d.players=[]
 for(const g of d.groups){g.source_policy=sourceData.competition.source_policy;g.country_id=34;g.nativeImportedIDs=g.slug===slug?sourceData.fixtures.filter(f=>f.statisticsStatus==='available').map(f=>f.id.slice(2)):[]}
 d.identityPrivacy=privacyProjection(797,sourceData.fixtures.flatMap(f=>f.appearances??[]),d.capturedUTC)
 return {targetSlug:slug,sourceData,databaseInventory:d,existingExceptionBindings:[...template.existingExceptionBindings.slice(0,8),...structuredClone(addedBindings)],writerCommit:'b'.repeat(40),now}
}
const derive=i=>adapter.deriveFcfFutureTargetNativeMapping(i),rows=i=>adapter.planFcfFutureNativeTargetImport(i),provider=i=>adapter.loadFcfFutureTargetOfflineProvider(i),build=i=>rollout.buildFcfFutureTargetImportRollout(i),replay=i=>rollout.replayFcfFutureTargetImportRollout(i)
test('future APIs exist; plain DATA/callback/copied/legacy assertions fail before any IO',()=>{
 for(const [api,names] of [[adapter,['deriveFcfFutureTargetNativeMapping','planFcfFutureNativeTargetImport','loadFcfFutureTargetOfflineProvider']],[rollout,['buildFcfFutureTargetImportRollout','replayFcfFutureTargetImportRollout']]])for(const name of names)assert.equal(typeof api[name],'function',name)
 let io=0
 const oldFetch=globalThis.fetch;globalThis.fetch=()=>{io++;throw Error('unexpected IO')}
 try{
  const plain={targetSlug:slug,sourceCommit:writer,databaseInventory:{},existingExceptionBindings:[],now:0},inputs=[[derive,plain],[rows,plain],[provider,{targetSlug:slug,sourceCommit:writer,targetPacketText:'{}',targetPacketSha256:sha('{}'),now:0}],[build,{...plain,mappingText:'{}',mappingSha256:sha('{}'),cleanupEvidence:{},execution}],[replay,{...plain,rolloutText:'{}',rolloutSha256:sha('{}'),cleanupEvidence:{},execution}]]
  for(const inventoryAdmission of [{},{verified:true,evidenceKind:'fcf-future-captured-target'},{evidenceKind:'fcf-missing-target-inventory'},()=>{io++;return {}}])for(const [fn,args] of inputs)assert.throws(()=>fn({...args,inventoryAdmission}),/reader-issued future target source evidence/)
  assert.equal(io,0)
 }finally{globalThis.fetch=oldFetch}
})

test('source getter -> native mapping/all rows -> schema4 packet -> schema3 import rollout -> source-only provider',actual,async t=>{
 const wire=await futureAdmissionWire(t),inventoryAdmission=readFcfFutureCapturedTargetEvidence(wire),sourceData=getFcfFutureCapturedTargetData({targetEvidence:inventoryAdmission,now:wire.now}),native=nativeInput(sourceData,wire.now),proofs=cleanup(t)
 const base={targetSlug:slug,sourceCommit:writer,inventoryAdmission,databaseInventory:native.databaseInventory,existingExceptionBindings:native.existingExceptionBindings,now:wire.now},mapping=derive(base),planned=rows(base)
 assert.equal(planned.matches.length,240);assert.equal(JSON.parse(mapping.proposalText).mappings.length,16);assert.ok(planned.players.length>100)
 const input={...base,mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256,cleanupEvidence:proofs.applied,execution},result=build(input),r=JSON.parse(result.rolloutText),p=JSON.parse(r.targetPacketText)
 assert.equal(r.schemaVersion,3);assert.equal(r.kind,'fcf-future-current-target-import-rollout');assert.equal(r.readiness,null);assert.deepEqual(r.execution,execution);assert.deepEqual(r.inventoryBinding,sourceData.binding);assert.deepEqual(r.cleanupBinding,p.cleanupBinding);assert.deepEqual(r.identityPlan,{mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256})
 assert.equal(p.schemaVersion,4);assert.equal(p.kind,'fcf-future-current-target-import');assert.equal(p.target.fixtures.length,240);assert.equal(p.target.competitionId,797);assert.equal(p.target.sourceEvidence.actualSourceGETs,277);assert.equal(p.target.sourceEvidence.maximumSourceGETs,478)
 assert.equal(result.rolloutSha256,sha(result.rolloutText));assert.equal(r.targetPacketSha256,sha(r.targetPacketText));assert.ok(Object.isFrozen(result))
 const replayInput={...base,cleanupEvidence:proofs.applied,execution,...result},providerInput={targetSlug:slug,sourceCommit:writer,inventoryAdmission,targetPacketText:r.targetPacketText,targetPacketSha256:r.targetPacketSha256,now:wire.now}
 assert.deepEqual(replay({...replayInput,execution:{runAttempt:'1',runId:'456',commit:writer,ref:'refs/heads/main',repository:execution.repository},now:wire.now+1000}),result,'stored packet audit time retained at later actual clock')
 const providerClock=t.mock.method(Date,'now',()=>wire.now),view=provider(providerInput);assert.equal(view.schedule().length,240);assert.deepEqual(view.report('es4118354'),sourceData.fixtures.find(f=>f.id==='es4118354'));assert.throws(()=>view.report('es4109388'),/foreign/);providerClock.mock.restore()
 assert.deepEqual(Object.keys(view).sort(),['competition','documents','report','schedule','sourceEvidence','targetSlug'])
 assert.throws(()=>loadFcfTargetOfflineProvider(providerInput),/FCF_/);assert.throws(()=>replayFcfTargetRollout(replayInput),/FCF_/)
 for(const field of ['firstFantasyRound','roundNumber','deadlineUTC','launchProposal','activate']){assert.equal(Object.hasOwn(r,field),false);assert.equal(Object.hasOwn(p.target,field),false)}
 await t.test('closed caller contracts and same actual reviewed main execution',()=>{
  for(const fn of [derive,rows])for(const field of ['sourceData','getSourceData','readiness','activate'])assert.throws(()=>fn({...base,[field]:sourceData}),/FCF_/)
  for(const [fn,args] of [[derive,base],[rows,base],[provider,providerInput],[build,input],[replay,replayInput]])assert.throws(()=>fn({...args,now:null}),/FCF_/)
  for(const [field,value] of [['readiness',{}],['launchProposal',{}],['activate',true]])assert.throws(()=>build({...input,[field]:value}),/FCF_/)
  for(const change of [e=>e.runAttempt='2',e=>e.runId='0',e=>e.ref='main',e=>e.commit='a'.repeat(40),e=>e.repository='other/repo']){const e={...execution};change(e);assert.throws(()=>build({...input,execution:e}),/FCF_/)}
  assert.throws(()=>replay({...replayInput,execution:{...execution,runId:'457'}}),/FCF_/)
 })
 await t.test('copied capabilities, legacy cleanup and plain source DATA are never admissions',()=>{
  for(const bad of [structuredClone(inventoryAdmission),sourceData,proofs.legacy])for(const [fn,args] of [[derive,base],[rows,base],[provider,providerInput],[build,input],[replay,replayInput]])assert.throws(()=>fn({...args,inventoryAdmission:bad}),/FCF_/)
  for(const bad of [structuredClone(proofs.applied),proofs.legacy,proofs.prepared])assert.throws(()=>build({...input,cleanupEvidence:bad}),/FCF_/)
 })
 await t.test('actual category/native side/privacy changes fail independent mapping or row planning',()=>{
  const changed={...input,existingExceptionBindings:structuredClone(input.existingExceptionBindings)};changed.existingExceptionBindings.find(b=>b.source_club_id==='1372').source_category_id='99999999';assert.throws(()=>build(changed),/descriptor|exception/)
  const altered={...input,databaseInventory:structuredClone(input.databaseInventory)},match=altered.databaseInventory.matches.find(m=>m.id===306166);[match.home_team_id,match.away_team_id]=[match.away_team_id,match.home_team_id];assert.throws(()=>build(altered),/anchor|identity|side/)
  const privateState={...replayInput,databaseInventory:structuredClone(input.databaseInventory)};privateState.databaseInventory.identityPrivacy.checkedKeys=[];assert.throws(()=>replay(privateState),/privacy/)
 })
 await t.test('mapping exact SHA and rehashed identity drift both fail',()=>{
  assert.throws(()=>build({...input,mappingSha256:'0'.repeat(64)}),/TEXT\/SHA/)
  const m=JSON.parse(input.mappingText);m.fixtures[0].matchId++;const mappingText=JSON.stringify(m);assert.throws(()=>build({...input,mappingText,mappingSha256:sha(mappingText)}),/proposal differs/)
 })
 await t.test('exact rollout/packet TEXT SHA, injected readiness and rehashed canonical drift fail',()=>{
  assert.throws(()=>replay({...replayInput,rolloutSha256:'0'.repeat(64)}),/TEXT\/SHA/)
  assert.throws(()=>provider({...providerInput,targetPacketSha256:'0'.repeat(64)}),/TEXT\/SHA/)
  for(const mutate of [x=>x.readiness={},x=>x.activate=true,x=>x.inventoryBinding.actualSourceGETs=240,x=>x.execution.runId='457',x=>{const q=JSON.parse(x.targetPacketText);q.target.fixtures[0].round=30;x.targetPacketText=JSON.stringify(q);x.targetPacketSha256=sha(x.targetPacketText)}]){const changed=JSON.parse(result.rolloutText);mutate(changed);const rolloutText=JSON.stringify(changed);assert.throws(()=>replay({...replayInput,rolloutText,rolloutSha256:sha(rolloutText)}),/FCF_/)}
  for(const mutate of [q=>q.schemaVersion=3,q=>q.target.fixtures[0].round=30,q=>q.target.sourceEvidence.maximumSourceGETs=517,q=>q.target.competitionId=783,q=>q.target.deadlineUTC='2026-10-31T10:30:00Z']){const q=JSON.parse(r.targetPacketText);mutate(q);const targetPacketText=JSON.stringify(q);assert.throws(()=>provider({...providerInput,targetPacketText,targetPacketSha256:sha(targetPacketText)}),/FCF_/)}
 })
 await t.test('actual clock freshness applies again to every entry',()=>{
  const now=wire.now+86400001
  for(const [fn,args]of [[derive,base],[rows,base],[build,input],[replay,replayInput],[provider,providerInput]])assert.throws(()=>fn({...args,now}),/FCF_/)
 })
})


test('returned provider methods reauthenticate at current invocation clock',actual,async t=>{
 const wire=await futureAdmissionWire(t),inventoryAdmission=readFcfFutureCapturedTargetEvidence(wire),data=getFcfFutureCapturedTargetData({targetEvidence:inventoryAdmission,now:wire.now}),native=nativeInput(data,wire.now),proofs=cleanup(t)
 const packet=compileFcfFutureTargetImportPacket({targetSlug:slug,sourceCommit:writer,targetEvidence:inventoryAdmission,cleanupEvidence:proofs.applied,databaseInventory:native.databaseInventory,now:wire.now})
 let current=wire.now,fetchCalls=0
 t.mock.method(Date,'now',()=>current)
 t.mock.method(globalThis,'fetch',()=>{fetchCalls++;throw Error('unexpected provider IO')})
 const view=provider({targetSlug:slug,sourceCommit:writer,inventoryAdmission,targetPacketText:packet.manifestText,targetPacketSha256:packet.manifestSha256,now:wire.now})
 assert.equal(view.schedule().length,240)
 assert.deepEqual(view.report('es4118354'),data.fixtures.find(f=>f.id==='es4118354'))
 current+=86400001
 assert.throws(()=>view.schedule(),/FCF_/,'already-returned schedule must expire')
 assert.throws(()=>view.report('es4118354'),/FCF_/,'already-returned report must expire')
 assert.equal(fetchCalls,0)
})
