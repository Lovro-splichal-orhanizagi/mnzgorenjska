// TEST ONLY. Genuine retained OLD history/original authorization; every NEW
// source/native/SQL-shaped projection/receipt/price/GitHub control is SYNTHETIC.
import {futureAdmissionWire} from './fcf-future-admission-test-fixture.mjs'
import {readFcfFutureCapturedTargetEvidence,getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {nativePlanFixture} from './fcf-six-native-test-fixture.mjs'
import {privacyProjection} from './fcf-native-plan-test-fixture.mjs'
import {sixCleanupFixture} from './fcf-six-cleanup-test-fixture.mjs'
import {readFcfFutureSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {deriveFcfFutureTargetNativeMapping,planFcfFutureNativeTargetImport} from './fcf-future-target-native-adapter.mjs'
import {buildFcfFutureTargetImportRollout} from './fcf-future-target-rollout.mjs'
import {fcfTargetPricingModelSha256} from './fcf-target-pricing-model.mjs'
const slug='es-ct-tercera-g9',writer='b'.repeat(40),ids=['4109388','4109404','4116215','4118352','4118354','4118358'],key=c=>`${c.sourceClubId}/${c.sourceCategoryId}`
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
function pricing(rows){
 const perTeam=new Map(),players=rows.players.map((p,i)=>{const n=perTeam.get(p.team_id)??0;perTeam.set(p.team_id,n+1);const position=p.position==='GK'?'GK':['DEF','MID','FWD'][n%3],value=i===rows.players.length-1?8:position==='GK'?4:position==='DEF'?4.5:position==='MID'?5:5.5;return {id:500000+i,competition_id:797,team_id:p.team_id,reg_st:p.reg_st,full_name:p.full_name,active:true,position,position_source:position==='GK'?'zapisnik':'ugibanje',value,value_start:value}})
 const text=JSON.stringify({stateSha256:'c'.repeat(64),players},null,2)+'\n',modelSha256=fcfTargetPricingModelSha256()
 return {pricingSnapshot:{snapshotText:text,snapshotSha256:sha(text)},replay:{schemaVersion:1,kind:'fcf-target-price-replay',targetSlug:slug,competitionId:797,season:'2026/27',modelSha256,computedCount:players.length,players:players.map(({id,value,value_start,position,position_source})=>({id,value,value_start,position,position_source}))},modelSha256}
}
export function refreshProjection(projection){
 const d=JSON.parse(projection.dependencySnapshotText)
 d.native=structuredClone(projection.native);d.pricingSnapshotText=projection.pricingSnapshot.snapshotText
 const {capturedUTC,...privacy}=projection.databaseInventory.identityPrivacy;d.privacy=privacy
 projection.dependencySnapshotText=JSON.stringify(d,null,2)+'\n';projection.dependencySnapshotSha256=sha(projection.dependencySnapshotText)
 return projection
}
export function changePrices(input,change){
 const np=input.nativeProjection,s=JSON.parse(np.pricingSnapshot.snapshotText);change(s.players)
 const text=JSON.stringify(s,null,2)+'\n';np.pricingSnapshot={snapshotText:text,snapshotSha256:sha(text)}
 input.pricingReplay.players=s.players.map(({id,value,value_start,position,position_source})=>({id,value,value_start,position,position_source}))
 np.databaseInventory.players=s.players.map(p=>({...np.databaseInventory.players.find(x=>x.id===p.id),position:p.position,position_source:p.position_source}))
 return refreshProjection(np)
}
export async function activationFixture(t){
 const wire=await futureAdmissionWire(t),inventoryAdmission=readFcfFutureCapturedTargetEvidence(wire),data=getFcfFutureCapturedTargetData({targetEvidence:inventoryAdmission,now:wire.now}),native=nativeInput(data,wire.now),proofs=cleanup(t)
 const base={targetSlug:slug,sourceCommit:writer,inventoryAdmission,databaseInventory:native.databaseInventory,existingExceptionBindings:native.existingExceptionBindings,now:wire.now},mapping=deriveFcfFutureTargetNativeMapping(base),rows=planFcfFutureNativeTargetImport(base),execution={repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit:writer,runId:'456',runAttempt:'1'}
 const original=buildFcfFutureTargetImportRollout({...base,mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256,cleanupEvidence:proofs.applied,execution}),rollout=JSON.parse(original.rolloutText),projected=pricing(rows),db=structuredClone(base.databaseInventory),players=JSON.parse(projected.pricingSnapshot.snapshotText).players
 db.existingExceptionBindings=structuredClone(native.existingExceptionBindings)
 db.players=players.map(p=>({id:p.id,competition_id:p.competition_id,team_id:p.team_id,reg_st:p.reg_st,full_name:p.full_name,position:p.position,position_source:p.position_source,anonimiziran_at:null,anonimiziran_razlog:null}))
 const bySource=new Map(data.fixtures.map(f=>[f.id,f])),npNative={competition:{...data.competition,prvi_fantasy_krog:1},rounds:structuredClone(db.rounds),matches:structuredClone(db.matches),dependencies:{complete:true,competitionUserRows:0,rounds:db.rounds.map(r=>({roundId:r.id,lineupRows:0,rosterRows:0,transferRows:0,chipRows:0,userRows:0})),matches:JSON.parse(mapping.proposalText).fixtures.map(m=>{const f=bySource.get(m.sourceMatchId);return {matchId:m.matchId,appearances:f.appearances?.length??0,goals:f.goals?.length??0,userRows:0}})}}
 const dependency={schemaVersion:1,classification:'fcf-future-projection-current-v1',native:npNative,catalog:[{rel:'public.matches',parent:'rounds',definition:'TEST ONLY synthetic FK',validated:true,deferrable:false,deferred:false}],shapes:{'public.matches':[['id','bigint']]},relations:{'public.matches':{count:240,rowsSha256:'e'.repeat(64),globalUser:false}},goalAssociations:[],privacy:{},pricingSnapshotText:projected.pricingSnapshot.snapshotText}
 const np={schemaVersion:1,kind:'fcf-future-native-projection',method:'explicitBEGIN_READ_ONLY_ROLLBACK',capturedUTC:db.capturedUTC,databaseInventory:db,native:npNative,dependencySnapshotText:JSON.stringify(dependency),dependencySnapshotSha256:'',pricingSnapshot:projected.pricingSnapshot};refreshProjection(np)
 const receipt={id:987,competition_id:797,inventory_key:'e'.repeat(64),packet_sha256:rollout.targetPacketSha256,source_fingerprint:data.binding.sourceFingerprintSha256,cleanup_before_sha256:proofs.applied.beforeSha256,imported_state_sha256:'9'.repeat(64),stage:'imported',activation_result:null,created_at:new Date(wire.now).toISOString(),rolloutText:original.rolloutText,rolloutSha256:original.rolloutSha256,currentActive:false,currentStateSha256:JSON.parse(projected.pricingSnapshot.snapshotText).stateSha256,canonicalVerified:false}
 const activationWriter='c'.repeat(40),input={targetSlug:slug,sourceCommit:activationWriter,inventoryAdmission,cleanupEvidence:proofs.applied,importReceipt:receipt,nativeProjection:np,pricingReplay:projected.replay,execution:{...execution,commit:activationWriter,runId:'457'},now:wire.now}
 return {input,data,wire,proofs,original}
}
