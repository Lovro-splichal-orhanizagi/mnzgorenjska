// TEST ONLY isolated installed DB/source brands. No actual new catalog facts.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import {join} from 'node:path'
import {nativeRuntimeFixture} from './fussball-native-runtime-test-fixture.mjs'
import {BADEN_SLUG,BADEN_CURRENT,BADEN_CARDS} from './lib/fussball-native-history-policy.mjs'
import {fussballNativeOriginalResultBytes} from './fussball-native-role-replay.mjs'
const competition={id:77001,country_id:66,country_code:'DE',slug:BADEN_SLUG,source:'fussball-public',source_league_code:BADEN_CURRENT,source_policy:BADEN_CARDS,date_only_deadline_policy:null,active:false}
function fixture(t){
 const f=nativeRuntimeFixture(t,competition,{freshPair:true})
 // This fixture's source schedules are explicitly synthetic. The real runtime
 // must invoke its fixed pure replay boundary; this TEST ONLY delegate verifies
 // exact original Maps and returns only the fixture's independently bound result.
 f.controls.replay=async({files,stage,codeSha256})=>{const original=f.f.state.originals.stages[stage];assert.equal(codeSha256,f.f.catalog.captureCodeSha256);assert.deepEqual(files,original.files);fussballNativeOriginalResultBytes({...original,files});if(f.controls.replayFailure)throw Error('TEST ONLY raw replay refusal');return {result:structuredClone(original.result)}}
 return f
}
test('fresh private source survives actual prepared pack, seed creation and inactive/active durable rehydration without result.json',async t=>{
 const f=fixture(t),context=await f.context(),pack=await f.api.loadPreparedFussballNativePack({competition,context}),directory=join(f.directory,'seed')
 assert.equal(pack.source.kind,'authenticated-fussball-baden-fresh-pair-source')
 await f.api.seedFussballNativeRuntime({context,competition,directory})
 assert.ok(f.calls.includes('private-source-getter'));assert.equal(f.calls.filter(x=>x==='pure-stage-replay').length,2)
 for(const stage of ['current','archive']){assert.equal(fs.existsSync(join(directory,stage,'result.json')),false);assert.ok(fs.existsSync(join(directory,stage,'result-commitment.json')))}
 await f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,composition:f.token,directory})
 f.observed.active=true;const loaded=await f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory})
 assert.equal(f.api.getFussballNativeRuntimeContext(loaded.context,competition).pack.source.kind,'authenticated-fussball-baden-fresh-pair-source')
 const client=f.client(BADEN_CURRENT);await f.api.collectFussballNativeRuntime({context,competition,code:BADEN_CURRENT,client,asOfDate:'2026-10-28'});assert.equal(client.requests[0].url,f.f.state.originals.stages.current.result.scope.seedUrl)
})
test('fresh durable seed rejects changed commitment/raw bytes and fixed pure replay refusal',async t=>{
 const f=fixture(t),context=await f.context(),directory=join(f.directory,'seed');await f.api.seedFussballNativeRuntime({context,competition,directory})
 for(const relative of ['current/result-commitment.json',...f.f.state.originals.stages.current.manifest.documents.slice(0,1).map(d=>'current/'+d.file)]){const path=join(directory,relative),raw=fs.readFileSync(path);fs.writeFileSync(path,'changed');await assert.rejects(f.api.loadFussballNativeRuntimeSeed({context,competition,directory}),/durable original/);fs.writeFileSync(path,raw)}
 f.controls.replayFailure=true;await assert.rejects(f.api.loadFussballNativeRuntimeSeed({context,competition,directory}),/raw replay refusal/)
 // A serialized seed cannot bypass the REAL fixed replay when its tiny synthetic
 // manifest is not an authentic fresh-stage envelope. No fallback result exists.
 delete f.controls.replay;await assert.rejects(f.api.loadFussballNativeRuntimeSeed({context,competition,directory}),/FUSSBALL_FRESH_PAIR_HOLD/)
})
test('old V7 seed roundtrip still retains original result.json and needs no fresh-stage replay',async t=>{
 const f=nativeRuntimeFixture(t,competition),context=await f.context(),directory=join(f.directory,'seed');await f.api.seedFussballNativeRuntime({context,competition,directory});assert.ok(fs.existsSync(join(directory,'current/result.json')));assert.equal(f.calls.includes('pure-stage-replay'),false)
})
