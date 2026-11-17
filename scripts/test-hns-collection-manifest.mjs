import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCollectionManifest } from './hns-collection-manifest.mjs'
const league={id:1,slug:'hr-test',active:true,source:'hns',source_league_code:'123',source_policy:null,countries:{code:'HR'}}
const opts={now:'2026-11-17T23:00:00Z',from:'2026-11-06',to:'2026-11-17',competitions:[league],matches:[]}
test('manifest binds active Croatian current-season inventory and completed reports',()=>{
 const m=buildCollectionManifest({...opts,matches:[{zapisnik_id:'42',imported_at:'2026-11-08',rounds:{competition_id:1,season:'2026/27'}}]})
 assert.equal(m.leagues[0].code,'123');assert.deepEqual(m.leagues[0].completed,['42']);assert.equal(m.season,'2026/27')
})
test('excludes closed women policy and inactive rows; rejects wrong country and duplicate identity',()=>{
 assert.equal(buildCollectionManifest({...opts,competitions:[{...league,active:false},{...league,id:2,slug:'hr-prva-hnlz'}]}).leagues.length,0)
 assert.throws(()=>buildCollectionManifest({...opts,competitions:[{...league,countries:{code:'SI'}}]}))
 assert.throws(()=>buildCollectionManifest({...opts,competitions:[league,league]}))
 assert.throws(()=>buildCollectionManifest({...opts,competitions:[{...league,source_league_code:'../login'}]}))
})
