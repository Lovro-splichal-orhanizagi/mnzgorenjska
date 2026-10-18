import test from 'node:test'
import assert from 'node:assert/strict'
import {viraZa} from './viri/index.mjs'
import base from './viri/hns.mjs'
import {loadHistoricalStatisticsImportContext} from './lib/historical-statistics-import.mjs'
import {HNS_WOMEN_CLUBS} from './viri/hns-zenske-quality.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
const policy=getHistoricalStatisticsPolicy('hr-prva-hnlz'),competition={id:99,country_id:3,active:true,slug:policy.competitionSlug,source:'hns',source_policy:policy.sourcePolicy,date_only_deadline_policy:'midnight-local-v1',source_league_code:'114471579'}
const clubs=Object.entries(HNS_WOMEN_CLUBS).map(([sourceClubId,canonicalName],i)=>({sourceClubId,canonicalName,teamId:300+i,countryId:3}))
const native=()=>({competitionId:99,sourceCompetitionId:'114471579',clubs:structuredClone(clubs)})
const binding=()=>({installed:true,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:'2026-10-25',markers:policy.entries.map((e,i)=>{const{rawSha256,reasonCode,...identity}=e;return{sourceMatchId:e.sourceMatchId,reportId:e.sourceMatchId,fixture:{...identity,season:policy.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:clubs.find(c=>c.sourceClubId===e.homeSourceClubId).teamId,awayTeamId:clubs.find(c=>c.sourceClubId===e.awaySourceClubId).teamId,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})})
function db(context=native()){const calls=[];return{calls,async rpc(name,args){calls.push([name,args]);return{data:name==='get_installed_historical_statistics_markers'?binding():context,error:null}}}}
test('actual service loader and factory bind all8native clubs before HNS single-report traversal',async()=>{
 const database=db(),loaded=await loadHistoricalStatisticsImportContext(database,competition),provider=viraZa(loaded.competition,{installedHistoricalMarkers:loaded.installedHistoricalMarkers})
 assert.deepEqual(database.calls.map(c=>c[0]),['get_installed_historical_statistics_markers','get_hns_women_import_context'])
 assert.deepEqual(provider.reviewedClubBindings,clubs)
 assert.ok(Object.isFrozen(provider.reviewedClubBindings))
 assert.deepEqual(await provider.posamezniZapisnik('114471579',{id:'114471617'})(()=>{throw Error('source forbidden')}),[])
 assert.ok(provider.historicalSourceFiles.includes('scripts/viri/hns-zenske-binding.mjs'))
})
for(const [name,change]of Object.entries({missing:c=>c.clubs.pop(),foreign:c=>c.clubs[0].countryId=1,markerDrift:c=>c.clubs.find(x=>x.sourceClubId==='1274').teamId=999}))test(`native service context fails before factory/read:${name}`,async()=>{const context=native();change(context);await assert.rejects(()=>loadHistoricalStatisticsImportContext(db(context),competition),/HNS|native|binding/i)})
test('inactive generic HNS import cannot traverse without the verified ready offline packet',async()=>{
 await assert.rejects(()=>loadHistoricalStatisticsImportContext(db(),{...competition,active:false}),/closed|packet|offline/i)
})
test('factory refuses HNS markers without complete native identity context and preserves ordinary HNS',()=>{
 assert.throws(()=>viraZa(competition,{installedHistoricalMarkers:binding()}),/binding|native|context/i)
 assert.equal(viraZa({source:'hns',slug:'hr-ordinary'}),base)
})

test('HNS round persistence keeps source provenance and calls only guarded deadline RPC',async()=>{
 const {persistHnsWomenRound}=await import('./hr-zenske-import.mjs'),calls=[],round={stevilka:9,tekme:[],hnsWomenSource:{sourceCompetitionId:'114471579',rawSha256:'a'.repeat(64),capturedAt:'2026-10-18T15:15:17.482565Z',fixtures:[{id:'114471646'}]}}
 const database={async rpc(...args){calls.push(args);return{data:{roundId:888},error:null}},from(){throw Error('generic round write forbidden')}}
 assert.equal(await persistHnsWomenRound(database,competition,round,6),888)
 assert.deepEqual(calls,[['update_hns_women_round',{p_competition_id:99,p_source_competition_id:'114471579',p_round:9,p_fixtures:round.hnsWomenSource.fixtures,p_source_sha256:'a'.repeat(64),p_captured_at:round.hnsWomenSource.capturedAt}]])
 for(const [r,offset]of [[{...round,hnsWomenSource:null},6],[round,10]])await assert.rejects(()=>persistHnsWomenRound(database,competition,r,offset),/HNS|provenance|offset/i)
 assert.equal(calls.length,1)
})

test('actual schedule CLI chooses guarded HNS round path before any generic write',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm'),source=readFileSync(new URL('./uvoz-razporeda.mjs',import.meta.url),'utf8')
 const start=source.indexOf('  const obstoj = obstojeciKrogi.get(k.stevilka)'),body=source.slice(start,source.indexOf('  for (const t of k.tekme)',start))
 const calls=[],database={from(){throw Error('generic round write forbidden')}}
 const result=await runInNewContext(`(async()=>{for(const iteration of [0]){let novihKrogov=0;${body};return krogId}})()`,{tekmovanje:competition,k:{stevilka:9},pomakUr:6,obstojeciKrogi:new Map(),db:database,async persistHnsWomenRound(...args){calls.push(args);return 888}})
 assert.equal(result,888);assert.equal(calls.length,1);assert.equal(calls[0][0],database)
})
