// TEST ONLY integration: genuine37 historical accounting and retained old HTML,
// but all NEW captures, Actions/Git metadata, native IDs/dependencies and prices
// are synthetic. Passing proves module compatibility, never a live source read,
// real native inventory, production deadline, privacy clearance or activation.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {futureAdmissionWire} from './fcf-future-admission-test-fixture.mjs'
import {readFcfFutureCapturedTargetEvidence,getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {nativePlanFixture} from './fcf-six-native-test-fixture.mjs'
import {privacyProjection} from './fcf-native-plan-test-fixture.mjs'
import {planFcfNativeTargetRows,planFcfNativeMapping} from './fcf-target-native-plan.mjs'
import {selectFcfFutureLaunch} from './fcf-future-launch.mjs'
import {buildFcfFutureTargetReadiness} from './fcf-future-readiness.mjs'
const opts={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Genuine37 accounting and retained G9 raw fixture bytes required; no production admission claimed'}
const slug='es-ct-tercera-g9',key=c=>`${c.sourceClubId}/${c.sourceCategoryId}`,sha=x=>createHash('sha256').update(x).digest('hex')
// Exact immutable descriptor rows already used by the existing six-native
// fixtures. These hashes authorize the original descriptors; none is rewritten
// to a fresh observation SHA from the new source data.
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
function launchInput(input,mapping){
 const d=input.databaseInventory,bySource=new Map(input.sourceData.fixtures.map(f=>[f.id,f]))
 return {targetSlug:slug,competitionId:797,sourceCode:'4118349-4118588',season:'2026/27',sourceFingerprintSha256:input.sourceData.binding.sourceFingerprintSha256,writerCommit:input.writerCommit,fixtures:input.sourceData.fixtures,mapping:mapping.fixtures,native:{competition:{id:797,slug,source:'fcf',source_league_code:'4118349-4118588',active:false,prvi_fantasy_krog:6},rounds:d.rounds,matches:d.matches,dependencies:{complete:true,competitionUserRows:0,rounds:d.rounds.map(r=>({roundId:r.id,lineupRows:0,rosterRows:0,transferRows:0,chipRows:0,userRows:0})),matches:mapping.fixtures.map(m=>{const f=bySource.get(m.sourceMatchId);return {matchId:m.matchId,appearances:f.appearances?.length??0,goals:f.goals?.length??0,userRows:0}})}},now:input.now}
}
function pricing(rows){
 const perTeam=new Map(),players=rows.players.map((p,i)=>{const n=perTeam.get(p.team_id)??0;perTeam.set(p.team_id,n+1);const position=p.position==='GK'?'GK':['DEF','MID','FWD'][n%3],value=i===rows.players.length-1?8:position==='GK'?4:position==='DEF'?4.5:position==='MID'?5:5.5;return {id:500000+i,competition_id:797,team_id:p.team_id,reg_st:p.reg_st,full_name:p.full_name,active:true,position,position_source:position==='GK'?'zapisnik':'ugibanje',value,value_start:value}})
 const text=JSON.stringify({stateSha256:'c'.repeat(64),players},null,2)+'\n',modelSha256='d'.repeat(64)
 return {pricingSnapshot:{snapshotText:text,snapshotSha256:sha(text)},replay:{schemaVersion:1,kind:'fcf-target-price-replay',targetSlug:slug,competitionId:797,season:'2026/27',modelSha256,computedCount:players.length,players:players.map(({id,value,value_start,position,position_source})=>({id,value,value_start,position,position_source}))},modelSha256}
}
function updatePrices(args,change){
 const snapshot=JSON.parse(args.pricingSnapshot.snapshotText);change(snapshot.players)
 const text=JSON.stringify(snapshot,null,2)+'\n';args.pricingSnapshot={snapshotText:text,snapshotSha256:sha(text)}
 args.replay={...args.replay,players:snapshot.players.map(({id,value,value_start,position,position_source})=>({id,value,value_start,position,position_source}))}
}

test('TEST ONLY raw future admission -> actual source getter -> native rows/mapping -> future launch -> pricing readiness',opts,async t=>{
 const wire=await futureAdmissionWire(t),targetEvidence=readFcfFutureCapturedTargetEvidence(wire),data=getFcfFutureCapturedTargetData({targetEvidence,now:wire.now}),input=nativeInput(data,wire.now)
 const sourceBefore=JSON.stringify(data),rows=planFcfNativeTargetRows(input),mappingResult=planFcfNativeMapping(input),mapping=JSON.parse(mappingResult.proposalText)
 assert.equal(rows.matches.length,240);assert.equal(mapping.fixtures.length,240);assert.equal(mapping.mappings.length,16);assert.equal(data.verifiedKeeperClubs.length,16);assert.ok(rows.players.length>100)
 assert.equal(mapping.sourceFingerprintSha256,data.binding.sourceFingerprintSha256);assert.equal(mapping.captureSourceCommit,data.binding.sourceCommit);assert.equal(mapping.sourceCommit,input.writerCommit)
 assert.deepEqual(mapping.fixtures.find(f=>f.sourceMatchId==='es4118354'),{sourceMatchId:'es4118354',sourceRound:1,matchId:306166,roundId:27616,homeTeamId:7566,awayTeamId:8308})
 for(const m of rows.matches){const source=data.fixtures.find(f=>f.id===m.sourceMatchId),native=mapping.fixtures.find(f=>f.sourceMatchId===m.sourceMatchId);assert.equal(m.matchId,native.matchId);for(const a of m.appearances)assert.equal(a.team_id,source.appearances.find(x=>x.regSt===a.player_reg_st).ekipaIdx===0?native.homeTeamId:native.awayTeamId)}
 const projected=pricing(rows),launch=launchInput(input,mapping),proposal=selectFcfFutureLaunch(launch)
 const args={targetSlug:slug,...projected,sourceData:data,launchInput:launch,launchProposal:proposal,now:wire.now},readiness=buildFcfFutureTargetReadiness(args)
 assert.equal(proposal.roundNumber,7);assert.ok(Date.parse(proposal.deadlineUTC)>wire.now);assert.equal(proposal.fixtureIds.length,8);assert.equal(proposal.sourceFingerprintSha256,data.binding.sourceFingerprintSha256)
 assert.equal(launch.native.competition.prvi_fantasy_krog,6);assert.equal(readiness.launchProposal.projectionSha256,proposal.projectionSha256);assert.equal(readiness.squad.length,15);assert.ok(readiness.cheapestLegal15<=100);assert.equal(readiness.priceVector.length,rows.players.length)
 assert.equal(data.binding.protocol,'future-g9-after-six-v1');assert.equal(data.binding.actualSourceGETs,277);assert.equal(JSON.stringify(data),sourceBefore,'native/pricing projections never rewrite authenticated source data or historical SHAs')
 for(const k of ['ready','admissible','activate'])assert.equal(Object.hasOwn(readiness,k),false)

 await t.test('altered actual native historical side fails identity derivation',()=>{
  const bad={...input,databaseInventory:structuredClone(input.databaseInventory)},m=bad.databaseInventory.matches.find(m=>m.id===306166)
  ;[m.home_team_id,m.away_team_id]=[m.away_team_id,m.home_team_id]
  assert.throws(()=>planFcfNativeMapping(bad),/side|anchor|historical/i)
 })
 await t.test('altered immutable DB category descriptor remains refused without source SHA normalization',()=>{
  const bad={...input,existingExceptionBindings:structuredClone(input.existingExceptionBindings)};bad.existingExceptionBindings.find(b=>b.source_club_id==='1372').source_category_id='99999999'
  assert.throws(()=>planFcfNativeMapping(bad),/exception|descriptor/i)
 })
 await t.test('omitted real source registration privacy key prevents native rows',()=>{
  const bad={...input,databaseInventory:structuredClone(input.databaseInventory)};bad.databaseInventory.identityPrivacy.checkedKeys=[]
  assert.throws(()=>planFcfNativeTargetRows(bad),/privacy/i)
 })
 await t.test('imported proposed opening fixture prevents launch without silently moving rounds',()=>{
  const bad={...launch,native:structuredClone(launch.native)},m=bad.native.matches.find(m=>m.id===proposal.matchIds[0]);m.imported_at=new Date(wire.now).toISOString()
  assert.throws(()=>selectFcfFutureLaunch(bad),/source-pending|imported|statistics/i)
 })
 await t.test('repriced pool cannot substitute guessed GK provenance for the mapped official club keeper',()=>{
  const bad={...args,replay:structuredClone(args.replay)},team=mapping.mappings[0].teamId
  updatePrices(bad,ps=>ps.filter(p=>p.team_id===team&&p.position==='GK').forEach(p=>p.position_source='ugibanje'))
  assert.throws(()=>buildFcfFutureTargetReadiness(bad),/official source goalkeeper/i)
 })
 await t.test('changed persisted replay price cannot reuse the verified source/native launch',()=>{
  const bad={...args,replay:structuredClone(args.replay)};bad.replay.players[0].value+=.5
  assert.throws(()=>buildFcfFutureTargetReadiness(bad),/pricing|persisted/i)
 })
})
