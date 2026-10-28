import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('production preparation rejects copied and serialized capabilities before native access',async()=>{
 const api=await import('./prepare-fussball-native-history.mjs');let calls=0
 const transport={find:async()=>{calls++;return null},register:async()=>{calls++;return 1},prepareFussballHistory:async()=>{calls++}}
 for(const proof of [{},{prepared:true,nativePreparation:{prepared:true}},JSON.parse('{"nativeImportEligible":true}')]){
  await assert.rejects(api.prepareFussballNativeHistory({composition:proof,transport}),/reader-issued/)
  assert.throws(()=>api.getFussballNativePreparation(proof),/issuer-issued/)
 }
 assert.equal(calls,0)
})
test('production catalog remains closed and empty SQL catalog has no runtime seed or approval override',async()=>{
 const c=JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url)))
 assert.equal(c.status,'UNFINALIZED');assert.equal(c.nativePreparation,null)
 const {compiledBadenHistoricalPolicy}=await import('./lib/fussball-native-history-policy.mjs')
 assert.equal(compiledBadenHistoricalPolicy(),null)
 const sql=readFileSync(new URL('../supabase/migrations/20261028180000_baden_history_cards_composition.sql',import.meta.url),'utf8')
 assert.match(sql,/create table private_baden_history.catalog/)
 assert.doesNotMatch(sql,/insert into private_baden_history.catalog/i)
 assert.match(sql,/prepare_fussball_historical_statistics/)
})

// TEST ONLY isolated module evaluation. It stubs private authority and native
// transport locally; no production hook or caller catalog override exists.
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import * as history from './lib/fussball-native-history-policy.mjs'
import {partitionFixture,isolatedComposition} from './fussball-native-composition-test-fixture.mjs'
const hash=v=>createHash('sha256').update(history.badenCanonical(v)).digest('hex')
function issuerFixture(){
 const f=partitionFixture(),pack=isolatedComposition(f).buildFussballNativeComposition(f.proof),token=Object.freeze({TEST_ONLY:true}),controls={},calls=[]
 const path=new URL('./prepare-fussball-native-history.mjs',import.meta.url)
 const code=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {prepareFussballNativeHistory,getFussballNativePreparation,reauthenticateFussballNativePreparation,testManifest:manifest};'
 const localRead=(url,...args)=>url.href.endsWith('/policies/fussball-baden-native-composition.json')?Buffer.from(JSON.stringify(f.catalog)):readFileSync(url,...args)
 const get=p=>{if(p!==token)throw Error('TEST ONLY reader-issued capability required');return {pack:structuredClone(pack)}}
 const reauth=async p=>{get(p);calls.push('source');if(controls.sourceFailure)throw Error('TEST ONLY replay failure');return token}
 const keys=['BADEN_CURRENT','BADEN_ARCHIVE','BADEN_SLUG','BADEN_CARDS','badenCanonical','projectBadenHistoricalPolicy','badenClubKey']
 const api=new Function('readFileSync','createHash','isDeepStrictEqual','getFussballNativeComposition','reauthenticateFussballNativeComposition','validateFussballNativeCatalog',...keys,code)(localRead,createHash,isDeepStrictEqual,get,reauth,isolatedComposition(f).validateFussballNativeCatalog,...keys.map(k=>history[k]))
 const manifest=api.testManifest(token),id=77001
 const bindings=manifest.fixtures.map((fixture,n)=>({fixture,sourceMatchId:fixture.sourceMatchId,sourceCompetitionId:fixture.sourceCompetitionId,matchId:88001+n,roundId:99001+n,homeTeamId:66001,awayTeamId:66002}))
 const markers=manifest.policy.entries.map(e=>{const b=bindings.find(b=>b.sourceMatchId===e.sourceMatchId),{rawSha256,reasonCode,...fixture}=e;return {...Object.fromEntries(['matchId','roundId','homeTeamId','awayTeamId'].map(k=>[k,b[k]])),sourceMatchId:e.sourceMatchId,reportId:`de-fussball-${e.sourceMatchId}`,fixture,rawSha256,policyId:manifest.policy.id,policySha256:hash(manifest.policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0,voteCount:0}}).sort((a,b)=>a.sourceMatchId.localeCompare(b.sourceMatchId))
 const observation={prepared:true,competitionId:id,active:false,noUsers:true,coldState:{playerCount:0,importedMatchCount:0,appearanceCount:0,goalCount:0,playerScoreCount:0,roundPointsCount:0},sourcePolicy:history.BADEN_CARDS,manifestSha256:hash(manifest),bindings,bindingSha256:hash(bindings),history:{installed:true,policyId:manifest.policy.id,policySha256:hash(manifest.policy),firstFantasyPlayedOn:manifest.firstFantasyPlayedOn,markers},cards:{installed:true,enabled:true,current_code:history.BADEN_CURRENT,archive_codes:[history.BADEN_ARCHIVE],source_policy:history.BADEN_CARDS},policySha256:hash(manifest.policy),markerInventorySha256:hash(markers),firstFantasyPlayedOn:manifest.firstFantasyPlayedOn,openingRoundId:bindings.find(b=>b.fixture.season==='2026/27'&&b.fixture.round===manifest.openingRound).roundId}
 const transport={find:async c=>{calls.push('find');assert.equal(c.slug,history.BADEN_SLUG);return controls.existing??null},register:async c=>{calls.push('register');assert.equal(c.id,undefined);return id},prepareFussballHistory:async body=>{calls.push('prepare');assert.equal(body.manifest,history.badenCanonical(manifest));assert.equal(body.sha256,hash(manifest));const v=structuredClone(observation);controls.prepareMutation?.(v);return v},readFussballHistory:async cid=>{calls.push('read');assert.equal(cid,id);const v=structuredClone(observation);controls.readMutation?.(v);return v}}
 return {api,token,manifest,observation,transport,calls,controls}
}
test('TEST ONLY private issuer cold-registers before preparation and seals actual full readback',async()=>{
 const f=issuerFixture(),receipt=await f.api.prepareFussballNativeHistory({composition:f.token,transport:f.transport})
 assert.deepEqual(f.calls,['source','find','register','prepare','source','read']);assert.equal(receipt.competitionId,77001)
 assert.equal(receipt.nativeImportEligible,false);assert.equal(receipt.activationEligible,false)
 const s=f.api.getFussballNativePreparation(receipt);assert.deepEqual(s.readback,f.observation);s.readback.bindings.length=0
 assert.equal(f.api.getFussballNativePreparation(receipt).readback.bindings.length,f.manifest.fixtures.length)
 assert.throws(()=>f.api.getFussballNativePreparation({...receipt}),/issuer-issued/)
 assert.throws(()=>f.api.getFussballNativePreparation(JSON.parse(JSON.stringify(receipt))),/issuer-issued/)
 await f.api.reauthenticateFussballNativePreparation(receipt);assert.deepEqual(f.calls.slice(-2),['source','read'])
 f.controls.readMutation=v=>{v.history.markers[0].individualRowCount=1;v.markerInventorySha256=hash(v.history.markers)}
 await assert.rejects(f.api.reauthenticateFussballNativePreparation(receipt),/empty-statistics/)
})
test('TEST ONLY source reauthentication failure prevents native registration',async()=>{
 const f=issuerFixture();f.controls.sourceFailure=true
 await assert.rejects(f.api.prepareFussballNativeHistory({composition:f.token,transport:f.transport}),/replay failure/)
 assert.deepEqual(f.calls,['source'])
})
test('TEST ONLY private issuer rejects native binding/policy/marker/hash drift',async()=>{
 const mutations=[v=>{v.prepared=false},v=>{v.active=true},v=>{v.noUsers=false},v=>{v.policySha256='0'.repeat(64)},v=>{v.cards.archive_codes=[]},v=>{v.bindingSha256='0'.repeat(64)},v=>{v.bindings[0].fixture.homeName='foreign';v.bindingSha256=hash(v.bindings)},v=>{v.history.markers[0].fixture.administrativeResult={displayedScores:[]};v.markerInventorySha256=hash(v.history.markers)},v=>{v.history.markers[0].voteCount=1;v.markerInventorySha256=hash(v.history.markers)},v=>{v.history.markers[0].importedAt=new Date().toISOString();v.markerInventorySha256=hash(v.history.markers)},v=>{v.history.markers[0].matchId++;v.markerInventorySha256=hash(v.history.markers)}]
 for(const mutate of mutations){const f=issuerFixture();f.controls.prepareMutation=mutate;await assert.rejects(f.api.prepareFussballNativeHistory({composition:f.token,transport:f.transport}),/Baden preparation:/)}
 const f=issuerFixture();f.controls.readMutation=v=>{v.openingRoundId++}
 await assert.rejects(f.api.prepareFussballNativeHistory({composition:f.token,transport:f.transport}),/opening round/)
})
test('TEST ONLY existing active registration is rejected before preparation',async()=>{
 const f=issuerFixture();f.controls.existing={id:77001,active:true,slug:history.BADEN_SLUG,source:'fussball-public',source_league_code:history.BADEN_CURRENT}
 await assert.rejects(f.api.prepareFussballNativeHistory({composition:f.token,transport:f.transport}),/inactive/)
 assert.deepEqual(f.calls,['source','find'])
})

test('TEST ONLY cold preparation issuer and reauthentication refuse ordinary individual-state drift',async()=>{
 for(const key of ['playerCount','importedMatchCount','appearanceCount','goalCount','playerScoreCount','roundPointsCount']){
  const initial=issuerFixture(),mutate=v=>{v.coldState[key]=1}
  initial.controls.prepareMutation=mutate;initial.controls.readMutation=mutate
  await assert.rejects(initial.api.prepareFussballNativeHistory({composition:initial.token,transport:initial.transport}),/cold pre-import/)
  const raced=issuerFixture();raced.controls.readMutation=mutate
  await assert.rejects(raced.api.prepareFussballNativeHistory({composition:raced.token,transport:raced.transport}),/cold pre-import/)
  const later=issuerFixture(),receipt=await later.api.prepareFussballNativeHistory({composition:later.token,transport:later.transport})
  later.controls.readMutation=mutate
  await assert.rejects(later.api.reauthenticateFussballNativePreparation(receipt),/cold pre-import/)
 }
})
