import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import baseFcf from './fcf.mjs'
import {withFcfHistoricalStatistics} from './fcf-historical.mjs'
import {verifyFcfInstalledHistoricalMarker} from '../fcf-historical-policy.mjs'
import {historicalStatisticsPolicySha256} from '../lib/historical-statistics-policy.mjs'
const policy=JSON.parse(readFileSync(new URL('../policies/historical-statistics-exclusions.json',import.meta.url))).policies.find(p=>p.provider==='fcf')
const competition={id:99,slug:policy.competitionSlug,source:'fcf',source_policy:policy.sourcePolicy,source_league_code:'4109388-4109627',firstFantasyPlayedOn:'2026-10-25'}
const binding=()=>({installed:true,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:'2026-10-25',markers:policy.entries.map((e,i)=>{const {rawSha256,reasonCode,...identity}=e;return{sourceMatchId:e.sourceMatchId,reportId:`es${e.sourceMatchId}`,fixture:{...identity,season:policy.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})})
const wrapped=(base,markers=binding())=>withFcfHistoricalStatistics(base,competition,{installedHistoricalMarkers:markers,verifyInstalledMarker:verifyFcfInstalledHistoricalMarker})
test('selected installed report skips even provider preparation and source traversal',async()=>{
 const provider=wrapped({...baseFcf,posamezniZapisnik(){throw Error('base preparation forbidden')},zapisniki(){throw Error('base stream forbidden')}})
 assert.deepEqual(await provider.posamezniZapisnik(competition.source_league_code,{id:'es4109388',sezona:'2026/27'})(()=>{throw Error('source forbidden')}),[])
})
test('full stream forwards validated exact report skips without suppressing new reports',async()=>{
 const calls=[],normal={id:'es4109389',z:{tekmovanje:'SEGONA CATALANA',skupina:'GRUP 1',sezona:'2026/27'}}
 const provider=wrapped({...baseFcf,async zapisniki(...args){calls.push(args);return[normal]}})
 assert.deepEqual(await provider.zapisniki(competition.source_league_code,()=>{}, {preskoci:new Set(['old'])}),[normal])
 assert.deepEqual([...calls[0][2].preskoci],['old','es4109388'])
})
test('base FCF stream never reads cache/header/raw bytes for skipped installed report',async t=>{
 const old=process.cwd(),dir=mkdtempSync(join(tmpdir(),'fcf-historical-skip-'));process.chdir(dir);mkdirSync('scripts/.predpomnilnik/fcf',{recursive:true})
 t.after(()=>{process.chdir(old);rmSync(dir,{recursive:true,force:true})})
 assert.deepEqual(await baseFcf.zapisniki('4109388-4109388',()=>{throw Error('raw source forbidden')},{preskoci:new Set(['es4109388'])}),[])
})
test('missing/partial/drifted marker binding fails before provider',async()=>{
 for(const markers of [null,{...binding(),markers:[]},{...binding(),policySha256:'0'.repeat(64)}]) {
  const provider=wrapped({...baseFcf,zapisniki(){throw Error('base reached')}},markers)
  await assert.rejects(()=>provider.zapisniki(competition.source_league_code,()=>{}),/historical|marker|binding/i)
 }
})
test('foreign block cannot reuse this competition historical authority',async()=>{
 const provider=wrapped({...baseFcf,zapisniki(){throw Error('base reached')}})
 await assert.rejects(()=>provider.zapisniki('4139542-4139779',()=>{}),/historical|block|code/i)
})
test('normal selected report delegates original strict preparation unchanged',async()=>{
 const options={id:'es4109389',sezona:'2026/27'},calls=[],reader=async()=>['normal']
 const provider=wrapped({...baseFcf,posamezniZapisnik(...args){calls.push(args);return reader}})
 assert.equal(provider.posamezniZapisnik(competition.source_league_code,options),reader)
 assert.deepEqual(calls,[[competition.source_league_code,options]])
})

test('schedule keeps known official header and DB fixture without reading excluded raw report',async()=>{
 const calls=[]
 const provider=withFcfHistoricalStatistics(baseFcf,competition,{installedHistoricalMarkers:binding(),verifyInstalledMarker:verifyFcfInstalledHistoricalMarker,
  async readBlock(...args){calls.push(args);return{tekme:[],skupina:'SEGONA CATALANA|GRUP 1|2026/27'}}
 })
 const rounds=await provider.razporedVseStrani(competition.source_league_code,()=>{throw Error('excluded raw forbidden')})
 assert.equal(provider.razporedBrezUvodnegaPrenosa,true)
 assert.deepEqual([...calls[0][2].preskoci],['es4109388'])
 assert.equal(rounds.length,1);assert.equal(rounds[0].stevilka,1)
 const fixture=rounds[0].tekme[0]
 assert.equal(fixture.domaci,'SANT JAUME OLOT B, C.F');assert.equal(fixture.gostje,'BEGUR, C.F.')
 assert.deepEqual(fixture.izid,{domaci:0,gostje:3});assert.equal(fixture.ura,null)
 assert.equal(fixture.kontumacija,false);assert.equal(fixture.odigrana,true)
 assert.deepEqual(fixture.historicalMarker,binding().markers[0])
})

test('new ordinary reports retain exact registered competition/group/season checks',async()=>{
 for(const patch of [{tekmovanje:'TERCERA CATALANA'},{skupina:'GRUP 99'},{sezona:'2025/26'}]) {
  const provider=wrapped({...baseFcf,async zapisniki(){return[{id:'es4109389',z:{tekmovanje:'SEGONA CATALANA',skupina:'GRUP 1',sezona:'2026/27',...patch}}]}})
  await assert.rejects(()=>provider.zapisniki(competition.source_league_code,()=>{}),/competition|group|season/i)
 }
})
